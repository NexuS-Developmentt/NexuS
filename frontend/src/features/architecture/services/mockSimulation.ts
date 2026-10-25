/**
 * mockSimulation.ts
 *
 * Deterministic, pure simulation engine for the Architecture Studio.
 *
 * Models:
 *  - Traffic load propagation across incoming paths from entry nodes
 *  - Node capacity = effectiveReplicas * cpuCores * per-kind base capacity factor
 *  - Node utilisation = load / capacity
 *  - Non-linear latency curve based on M/M/1 queuing approximation
 *  - End-to-end latency along the critical (slowest) path
 *  - Throughput capped by the bottleneck component on the flow path
 *  - Cycle-safe DFS path traversal and topology analysis
 *  - Scenarios: "normal", "remove-cache", "service-failure", "scale-service"
 *
 * Rules:
 *  - Strictly deterministic: no Math.random, no Date, no async.
 *  - Fully safe on empty graphs, cycles, disconnected nodes, and missing node properties.
 *  - Throws typed `SimulationValidationError` on invalid inputs.
 */

import type { Node, Edge } from '@xyflow/react';
import type {
  ArchitectureNodeData,
  ArchitectureEdgeData,
  ArchitectureNodeKind,
  SimulationInputs,
  SimulationResult,
} from '../types/architecture';

// ── Validation Error ──────────────────────────────────────────────────────────

export class SimulationValidationError extends Error {
  public readonly field?: string;

  constructor(message: string, field?: string) {
    super(message);
    this.name = 'SimulationValidationError';
    this.field = field;
    Object.setPrototypeOf(this, SimulationValidationError.prototype);
  }
}

// ── Model Constants ───────────────────────────────────────────────────────────

/** Maximum supported incoming requests per minute (10 Million RPM). */
export const MAX_RPM = 10_000_000;

/**
 * Base capacity factors in requests per minute (RPM) per CPU core.
 *
 * Rationale:
 * - Gateway: High throughput reverse-proxy / routing (15,000 RPM/core)
 * - Cache: In-memory O(1) lookups with minimal overhead (25,000 RPM/core)
 * - Service: Application logic, serialization, and business rules (4,000 RPM/core)
 * - Queue: Sequential disk-backed message buffering (12,000 RPM/core)
 * - Database: Disk I/O, concurrency control, and relational queries (2,500 RPM/core)
 */
export const BASE_CAPACITIES: Record<ArchitectureNodeKind, number> = {
  gateway: 15_000,
  cache: 25_000,
  service: 4_000,
  queue: 12_000,
  database: 2_500,
};

/**
 * Base latency in milliseconds per node kind under zero-load conditions.
 */
export const BASE_LATENCIES: Record<ArchitectureNodeKind, number> = {
  gateway: 3,
  cache: 1,
  service: 15,
  queue: 5,
  database: 20,
};

/**
 * Default fallback configuration when node attributes are missing or undefined.
 */
export const DEFAULT_NODE_VALUES: Record<
  ArchitectureNodeKind,
  { replicas: number; cpuCores: number }
> = {
  gateway: { replicas: 2, cpuCores: 1 },
  service: { replicas: 2, cpuCores: 1 },
  database: { replicas: 1, cpuCores: 4 },
  cache: { replicas: 1, cpuCores: 1 },
  queue: { replicas: 2, cpuCores: 1 },
};

/**
 * Cache hit ratio under normal conditions (85% of traffic absorbed by cache).
 * When cache is removed, 100% of this traffic cascades directly to downstream databases.
 */
export const CACHE_HIT_RATIO = 0.85;

/**
 * Utilisation threshold (75%) above which a node is flagged as a bottleneck.
 */
export const BOTTLENECK_UTILISATION_THRESHOLD = 0.75;

// ── Internal Node State ───────────────────────────────────────────────────────

interface NodeSimulationState {
  id: string;
  label: string;
  kind: ArchitectureNodeKind;
  replicas: number;
  cpuCores: number;
  capacity: number;
  load: number;
  utilisation: number;
  latencyMs: number;
  isDown: boolean;
}

// ── Main Simulation Function ──────────────────────────────────────────────────

/**
 * Executes a deterministic heuristic simulation of an architecture graph.
 *
 * @param nodes Array of React Flow nodes
 * @param edges Array of React Flow edges
 * @param inputs Simulation configuration inputs
 * @returns SimulationResult containing latency, CPU, throughput, bottlenecks, and recommendations
 * @throws SimulationValidationError on invalid inputs
 */
export function runMockSimulation(
  nodes: Node<ArchitectureNodeData>[],
  edges: Edge<ArchitectureEdgeData>[],
  inputs: SimulationInputs,
): SimulationResult {
  // 1. Input Validation
  validateInputs(inputs, nodes);

  const { requestsPerMinute, scenario, targetNodeId } = inputs;

  // 2. Handle Empty Graph
  if (nodes.length === 0) {
    return {
      estimatedLatencyMs: 0,
      estimatedCpuPercent: 0,
      estimatedThroughputRpm: 0,
      bottleneckNodeIds: [],
      explanation:
        'The architecture graph is empty. Add components to run performance simulations. (Illustrative mock estimate, not measured data).',
      recommendations: [
        'Add an API Gateway or Service from the palette to begin architectural modeling.',
      ],
      isMock: true,
    };
  }

  // 3. Initialize Node States with defaults and scenario modifications
  const nodeMap = new Map<string, NodeSimulationState>();

  for (const node of nodes) {
    const kind = node.data?.kind ?? 'service';
    const defaults = DEFAULT_NODE_VALUES[kind] ?? { replicas: 1, cpuCores: 1 };
    let replicas = node.data?.replicas ?? defaults.replicas;
    const cpuCores = node.data?.cpuCores ?? defaults.cpuCores;

    // Apply scenario-specific node alterations
    let isDown = false;
    if (scenario === 'service-failure' && node.id === targetNodeId) {
      isDown = true;
    } else if (scenario === 'remove-cache' && kind === 'cache') {
      isDown = true;
    } else if (scenario === 'scale-service' && node.id === targetNodeId) {
      // Double replicas for scaled service
      replicas = Math.min(50, replicas * 2);
    }

    const baseCap = BASE_CAPACITIES[kind] ?? BASE_CAPACITIES.service;
    const capacity = isDown ? 0 : replicas * cpuCores * baseCap;

    nodeMap.set(node.id, {
      id: node.id,
      label: node.data?.label || node.id,
      kind,
      replicas,
      cpuCores,
      capacity,
      load: 0,
      utilisation: 0,
      latencyMs: BASE_LATENCIES[kind] ?? 10,
      isDown,
    });
  }

  // 4. Build Directed Adjacency Lists & In-Degree Map
  const validNodeIds = new Set(nodes.map((n) => n.id));
  const adj = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const id of validNodeIds) {
    adj.set(id, []);
    inDegree.set(id, 0);
  }

  for (const edge of edges) {
    if (validNodeIds.has(edge.source) && validNodeIds.has(edge.target)) {
      adj.get(edge.source)!.push(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
    }
  }

  // 5. Determine Entry Nodes (Nodes with 0 incoming edges)
  let entryNodeIds = Array.from(validNodeIds).filter((id) => (inDegree.get(id) ?? 0) === 0);

  // If entire graph is cyclic with no zero-in-degree nodes, pick gateway or first node
  if (entryNodeIds.length === 0) {
    const gatewayNode = nodes.find((n) => n.data?.kind === 'gateway');
    entryNodeIds = [gatewayNode ? gatewayNode.id : nodes[0].id];
  }

  // 6. Propagate Load From Entry Nodes (Cycle-Safe BFS)
  const initialRpmPerEntry = requestsPerMinute / entryNodeIds.length;
  for (const entryId of entryNodeIds) {
    const entryState = nodeMap.get(entryId);
    if (entryState) {
      entryState.load += initialRpmPerEntry;
    }
  }

  // BFS with depth cap and visited count per node to safely handle cycles
  const queue: Array<{ id: string; incomingLoad: number; depth: number }> = entryNodeIds.map(
    (id) => ({ id, incomingLoad: initialRpmPerEntry, depth: 0 }),
  );

  const visitCounts = new Map<string, number>();
  const MAX_TRAVERSAL_DEPTH = 30;

  while (queue.length > 0) {
    const { id, incomingLoad, depth } = queue.shift()!;
    const visits = visitCounts.get(id) ?? 0;
    if (visits > 2 || depth > MAX_TRAVERSAL_DEPTH) {
      continue; // cycle or max depth cutoff
    }
    visitCounts.set(id, visits + 1);

    const currNode = nodeMap.get(id);
    if (!currNode) continue;

    const children = adj.get(id) ?? [];
    if (children.length === 0) continue;

    // Load passing through this node
    let outgoingLoad = incomingLoad;

    // In remove-cache scenario, if downstream is cache, bypass cache load directly to databases
    if (currNode.isDown && scenario === 'service-failure') {
      // Failed node drops outgoing requests or creates retry traffic
      outgoingLoad = incomingLoad * 0.1; // only residual error/timeout traffic
    }

    const loadPerChild = outgoingLoad / children.length;

    for (const childId of children) {
      const childNode = nodeMap.get(childId);
      if (!childNode) continue;

      if (scenario === 'remove-cache' && childNode.kind === 'cache') {
        // Cache is bypassed: route its share directly to cache's downstream nodes
        const cacheDownstream = adj.get(childId) ?? [];
        if (cacheDownstream.length > 0) {
          const loadPerDb = (loadPerChild * (1 / (1 - CACHE_HIT_RATIO * 0.5))) / cacheDownstream.length;
          for (const dbId of cacheDownstream) {
            const dbNode = nodeMap.get(dbId);
            if (dbNode) {
              dbNode.load += loadPerDb;
              queue.push({ id: dbId, incomingLoad: loadPerDb, depth: depth + 1 });
            }
          }
        }
        continue;
      }

      childNode.load += loadPerChild;
      queue.push({ id: childId, incomingLoad: loadPerChild, depth: depth + 1 });
    }
  }

  // 7. Calculate Per-Node Utilisation and Non-linear Latency
  for (const [, state] of nodeMap) {
    if (state.isDown) {
      state.utilisation = 1.0;
      state.latencyMs = 500; // 500ms timeout penalty
      continue;
    }

    state.utilisation = state.capacity > 0 ? state.load / state.capacity : 1.0;

    // Non-linear latency penalty using M/M/1 queueing delay curve
    // Latency = baseLatency * (1 + rho / (1 - min(rho, 0.95)))
    const baseLat = BASE_LATENCIES[state.kind] ?? 10;
    const rho = Math.min(state.utilisation, 0.95);
    const queueMultiplier = 1 + rho / (1 - rho);
    // Cap latency at 10x base latency to prevent extreme spikes
    state.latencyMs = Math.round(baseLat * Math.min(10, queueMultiplier));
  }

  // 8. Calculate Critical Path (Slowest End-to-End Latency)
  // DFS with cycle-detection set along recursion stack
  let maxPathLatency = 0;

  function findMaxPath(nodeId: string, currentPathLatency: number, stack: Set<string>) {
    if (stack.has(nodeId)) {
      maxPathLatency = Math.max(maxPathLatency, currentPathLatency);
      return;
    }
    stack.add(nodeId);

    const currState = nodeMap.get(nodeId);
    const stepLatency = currState ? currState.latencyMs : 0;
    const accumulated = currentPathLatency + stepLatency;

    const children = adj.get(nodeId) ?? [];
    if (children.length === 0) {
      maxPathLatency = Math.max(maxPathLatency, accumulated);
    } else {
      for (const childId of children) {
        findMaxPath(childId, accumulated, stack);
      }
    }

    stack.delete(nodeId);
  }

  for (const entryId of entryNodeIds) {
    findMaxPath(entryId, 0, new Set<string>());
  }

  // 9. Throughput Calculation
  // Throughput is constrained by the minimum capacity-to-load ratio across active nodes
  let minCapacityRatio = 1.0;
  for (const [, state] of nodeMap) {
    if (state.isDown) {
      // If an entry node or critical single point of failure fails, throughput collapses
      if (entryNodeIds.includes(state.id)) {
        minCapacityRatio = 0.05;
      }
      continue;
    }
    if (state.load > 0 && state.capacity > 0) {
      const ratio = state.capacity / state.load;
      if (ratio < minCapacityRatio) {
        minCapacityRatio = ratio;
      }
    }
  }

  const estimatedThroughputRpm = Math.max(
    0,
    Math.min(requestsPerMinute, Math.round(requestsPerMinute * Math.min(1, minCapacityRatio))),
  );

  // 10. CPU Percent: Average CPU utilisation across all active nodes (0-100)
  const activeNodes = Array.from(nodeMap.values()).filter((n) => !n.isDown);
  const totalUtil = activeNodes.reduce((sum, n) => sum + Math.min(1, n.utilisation), 0);
  const avgUtil = activeNodes.length > 0 ? totalUtil / activeNodes.length : 1.0;
  const estimatedCpuPercent = Math.min(100, Math.max(0, Math.round(avgUtil * 100)));

  // 11. Identify Bottlenecks
  // Nodes with utilisation >= BOTTLENECK_UTILISATION_THRESHOLD (0.75), sorted descending
  const bottlenecks = Array.from(nodeMap.values())
    .filter((n) => !n.isDown && n.utilisation >= BOTTLENECK_UTILISATION_THRESHOLD)
    .sort((a, b) => b.utilisation - a.utilisation);

  const bottleneckNodeIds = bottlenecks.map((n) => n.id);

  // 12. Build Explanation and Recommendations
  const explanation = buildExplanation(
    scenario,
    requestsPerMinute,
    targetNodeId,
    nodeMap,
    bottlenecks,
    estimatedThroughputRpm,
    maxPathLatency,
    adj,
  );

  const recommendations = buildRecommendations(
    scenario,
    nodeMap,
    bottlenecks,
    targetNodeId,
    maxPathLatency,
    adj,
  );

  return {
    estimatedLatencyMs: maxPathLatency,
    estimatedCpuPercent,
    estimatedThroughputRpm,
    bottleneckNodeIds,
    explanation,
    recommendations,
    isMock: true,
  };
}

// ── Validation Helper ─────────────────────────────────────────────────────────

function validateInputs(
  inputs: SimulationInputs,
  nodes: Node<ArchitectureNodeData>[],
): void {
  if (!inputs || typeof inputs !== 'object') {
    throw new SimulationValidationError('Simulation inputs must be a valid object.');
  }

  const { requestsPerMinute, scenario, targetNodeId } = inputs;

  if (
    typeof requestsPerMinute !== 'number' ||
    isNaN(requestsPerMinute) ||
    requestsPerMinute <= 0
  ) {
    throw new SimulationValidationError(
      'requestsPerMinute must be a positive number greater than 0.',
      'requestsPerMinute',
    );
  }

  if (requestsPerMinute > MAX_RPM) {
    throw new SimulationValidationError(
      `requestsPerMinute exceeds the maximum supported threshold of ${MAX_RPM.toLocaleString()} RPM.`,
      'requestsPerMinute',
    );
  }

  const validScenarios = ['normal', 'remove-cache', 'service-failure', 'scale-service'];
  if (!validScenarios.includes(scenario)) {
    throw new SimulationValidationError(
      `Invalid scenario "${scenario}". Must be one of: ${validScenarios.join(', ')}.`,
      'scenario',
    );
  }

  if (scenario === 'service-failure' || scenario === 'scale-service') {
    if (!targetNodeId || typeof targetNodeId !== 'string') {
      throw new SimulationValidationError(
        `Scenario "${scenario}" requires a targetNodeId parameter.`,
        'targetNodeId',
      );
    }

    const nodeExists = nodes.some((n) => n.id === targetNodeId);
    if (!nodeExists) {
      throw new SimulationValidationError(
        `targetNodeId "${targetNodeId}" was not found in the current architecture graph.`,
        'targetNodeId',
      );
    }
  }
}

// ── Explanation Builder ───────────────────────────────────────────────────────

function buildExplanation(
  scenario: SimulationInputs['scenario'],
  rpm: number,
  targetNodeId: string | undefined,
  nodeMap: Map<string, NodeSimulationState>,
  bottlenecks: NodeSimulationState[],
  throughputRpm: number,
  latencyMs: number,
  adj: Map<string, string[]>,
): string {
  const disclaimer =
    '(Note: This is an illustrative heuristic estimate based on static architecture modeling, not measured production data).';

  switch (scenario) {
    case 'normal': {
      if (bottlenecks.length === 0) {
        return `Baseline simulation running at ${rpm.toLocaleString()} RPM. All components are operating comfortably within capacity limits with an estimated critical path latency of ${latencyMs} ms and sustained throughput of ${throughputRpm.toLocaleString()} RPM. ${disclaimer}`;
      }
      const topNames = bottlenecks.map((b) => b.label).join(', ');
      return `Baseline simulation running at ${rpm.toLocaleString()} RPM. Elevated utilisation detected on ${topNames}, constraining maximum sustainable throughput to ${throughputRpm.toLocaleString()} RPM. ${disclaimer}`;
    }

    case 'remove-cache': {
      const dbNodes = Array.from(nodeMap.values()).filter((n) => n.kind === 'database');
      const dbNames = dbNodes.map((n) => `${n.label} (${Math.round(n.utilisation * 100)}% CPU)`).join(', ');
      return `Cache removal simulation running at ${rpm.toLocaleString()} RPM. In-memory cache layer was bypassed, deflecting full read query volume directly to backing databases: ${dbNames}. End-to-end latency increased to ${latencyMs} ms due to missing cache hits. ${disclaimer}`;
    }

    case 'service-failure': {
      const failedNode = targetNodeId ? nodeMap.get(targetNodeId) : null;
      const failedLabel = failedNode ? failedNode.label : targetNodeId;
      const dependents = targetNodeId ? findDownstreamNodes(targetNodeId, adj, nodeMap) : [];
      const dependentNames = dependents.length > 0
        ? dependents.map((d) => d.label).join(', ')
        : 'none';

      return `Service failure simulation at ${rpm.toLocaleString()} RPM. ${failedLabel} is down. Affected downstream dependencies: ${dependentNames}. Requests encountered timeouts and fallback degradations, capping throughput at ${throughputRpm.toLocaleString()} RPM with critical path latency of ${latencyMs} ms. ${disclaimer}`;
    }

    case 'scale-service': {
      const scaledNode = targetNodeId ? nodeMap.get(targetNodeId) : null;
      const scaledLabel = scaledNode ? scaledNode.label : targetNodeId;
      const utilPercent = scaledNode ? Math.round(scaledNode.utilisation * 100) : 0;
      return `Scale service simulation at ${rpm.toLocaleString()} RPM. Replicas for ${scaledLabel} were doubled to ${scaledNode?.replicas ?? 2} instances, reducing its CPU load to ${utilPercent}% and stabilizing end-to-end latency at ${latencyMs} ms. ${disclaimer}`;
    }
  }
}

// ── Recommendations Builder ───────────────────────────────────────────────────

function buildRecommendations(
  scenario: SimulationInputs['scenario'],
  nodeMap: Map<string, NodeSimulationState>,
  bottlenecks: NodeSimulationState[],
  targetNodeId: string | undefined,
  latencyMs: number,
  adj: Map<string, string[]>,
): string[] {
  const recs: string[] = [];

  // Scenario specific recommendations
  if (scenario === 'remove-cache') {
    const db = Array.from(nodeMap.values()).find((n) => n.kind === 'database');
    if (db) {
      recs.push(
        `Provision a distributed cache cluster (e.g., Redis) in front of ${db.label} to restore 85% query absorption and relieve database thread contention.`,
      );
    }
  } else if (scenario === 'service-failure' && targetNodeId) {
    const target = nodeMap.get(targetNodeId);
    const dependents = findDownstreamNodes(targetNodeId, adj, nodeMap);
    if (target) {
      recs.push(
        `Implement resilient circuit breaker patterns and fallback responses across dependents (${dependents.map((d) => d.label).join(', ') || 'callers'}) of ${target.label}.`,
      );
    }
  }

  // Bottleneck recommendations (naming actual nodes)
  for (const b of bottlenecks.slice(0, 2)) {
    const nextReplicas = Math.min(50, b.replicas + 1);
    recs.push(
      `Scale out ${b.label}: utilisation is currently at ${Math.round(b.utilisation * 100)}%. Scale replicas from ${b.replicas} to ${nextReplicas} to maintain headroom.`,
    );
  }

  // Database optimisation recommendation
  const heavyDb = Array.from(nodeMap.values()).find(
    (n) => n.kind === 'database' && n.utilisation > 0.65,
  );
  if (heavyDb && !recs.some((r) => r.includes(heavyDb.label))) {
    recs.push(
      `Introduce read replicas or index optimization for ${heavyDb.label} to distribute read queries across multiple storage instances.`,
    );
  }

  // Latency recommendation
  if (latencyMs > 80 && recs.length < 4) {
    recs.push(
      `End-to-end critical path latency is elevated (${latencyMs} ms). Consider decoupling synchronous RPC steps using asynchronous message queues.`,
    );
  }

  // General healthy recommendation if list is short
  if (recs.length < 2) {
    const gateway = Array.from(nodeMap.values()).find((n) => n.kind === 'gateway');
    if (gateway) {
      recs.push(
        `Configure HTTP response caching and rate limiting policies at ${gateway.label} to safeguard downstream services against traffic spikes.`,
      );
    } else {
      recs.push(
        'Establish automated autoscaling policies based on CPU and request latency metrics to adapt to dynamic workload surges.',
      );
    }
  }

  // Ensure 2 to 4 recommendations
  return recs.slice(0, 4);
}

// ── Downstream Traversal Helper ───────────────────────────────────────────────

function findDownstreamNodes(
  startId: string,
  adj: Map<string, string[]>,
  nodeMap: Map<string, NodeSimulationState>,
): NodeSimulationState[] {
  const visited = new Set<string>();
  const queue = [...(adj.get(startId) ?? [])];
  const results: NodeSimulationState[] = [];

  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (visited.has(curr)) continue;
    visited.add(curr);

    const node = nodeMap.get(curr);
    if (node) {
      results.push(node);
    }

    for (const next of adj.get(curr) ?? []) {
      if (!visited.has(next)) {
        queue.push(next);
      }
    }
  }

  return results;
}
