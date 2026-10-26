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
  database: 2_000,
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
  database: { replicas: 1, cpuCores: 2 },
  cache: { replicas: 1, cpuCores: 1 },
  queue: { replicas: 2, cpuCores: 1 },
};

/**
 * Cache hit ratio under normal conditions (85% of read traffic absorbed by cache).
 * When cache is removed, full read volume cascades directly to backing databases.
 */
export const CACHE_HIT_RATIO = 0.85;

/**
 * Small flat serialization / cache-miss latency cost in milliseconds (5ms)
 * added when queries must bypass cache and query database directly.
 */
export const FLAT_CACHE_MISS_PENALTY_MS = 5;

/**
 * Fallback client timeout penalty in milliseconds (500ms) incurred by requests
 * attempting to traverse a failed service.
 */
export const FAILED_SERVICE_TIMEOUT_MS = 500;

/**
 * Utilisation threshold (75%) at or above which a node is flagged as a bottleneck.
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
 * @returns SimulationResult containing latency, CPU, throughput, bottlenecks, recommendations, and nodeUtilisation
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
        'The architecture graph is empty. Add components from the palette to begin architectural modeling. (Illustrative mock estimate, not measured data).',
      recommendations: [
        'Add an API Gateway or Service from the palette to begin architectural modeling.',
      ],
      isMock: true,
      nodeUtilisation: {},
    };
  }

  // 3. Initialize Node States with defaults and scenario modifications
  const nodeMap = new Map<string, NodeSimulationState>();

  for (const node of nodes) {
    const kind = node.data?.kind ?? 'service';
    const defaults = DEFAULT_NODE_VALUES[kind] ?? { replicas: 1, cpuCores: 1 };
    let replicas = Math.max(1, node.data?.replicas ?? defaults.replicas);
    const cpuCores = Math.max(0.1, node.data?.cpuCores ?? defaults.cpuCores);

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
    const capacity = isDown ? 0 : Math.max(1, Math.round(replicas * cpuCores * baseCap));

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

  // Track total load routed into the failed node for dynamic throughput reduction
  let failedNodeIncomingLoad = 0;

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

    if (scenario === 'service-failure' && currNode.isDown) {
      // Failed node drops outgoing requests; only minimal 5% degraded/retry traffic continues
      outgoingLoad = incomingLoad * 0.05;
    }

    const loadPerChild = children.length > 0 ? outgoingLoad / children.length : 0;

    for (const childId of children) {
      const childNode = nodeMap.get(childId);
      if (!childNode) continue;

      // Track traffic routed into failed node
      if (scenario === 'service-failure' && childId === targetNodeId) {
        failedNodeIncomingLoad += loadPerChild;
      }

      // Handle remove-cache: cache is bypassed, deflect queries to backing database
      if (scenario === 'remove-cache' && childNode.kind === 'cache') {
        // Find target database: downstream of cache, or sibling DBs of caller, or any DB
        let targetDbIds = (adj.get(childId) ?? []).filter(
          (cid) => nodeMap.get(cid)?.kind === 'database',
        );
        if (targetDbIds.length === 0) {
          targetDbIds = children.filter((cid) => nodeMap.get(cid)?.kind === 'database');
        }
        if (targetDbIds.length === 0) {
          targetDbIds = Array.from(nodeMap.values())
            .filter((n) => n.kind === 'database')
            .map((n) => n.id);
        }

        if (targetDbIds.length > 0) {
          // Re-route cache load to database.
          // Cache absorbed CACHE_HIT_RATIO (85%) of queries. Without cache, database receives
          // full read volume (1.5x cache incoming load factor to reflect un-absorbed query volume).
          const deflectedDbLoad = (loadPerChild * 1.5) / targetDbIds.length;
          for (const dbId of targetDbIds) {
            const dbNode = nodeMap.get(dbId);
            if (dbNode) {
              dbNode.load += deflectedDbLoad;
              queue.push({ id: dbId, incomingLoad: deflectedDbLoad, depth: depth + 1 });
            }
          }
        }
        continue;
      }

      childNode.load += loadPerChild;
      queue.push({ id: childId, incomingLoad: loadPerChild, depth: depth + 1 });
    }
  }

  // If entry node itself failed in service-failure, record full entry load
  if (scenario === 'service-failure' && targetNodeId && entryNodeIds.includes(targetNodeId)) {
    failedNodeIncomingLoad = nodeMap.get(targetNodeId)?.load ?? requestsPerMinute;
  }

  // 7. Calculate Per-Node Utilisation and Non-linear Latency
  for (const [, state] of nodeMap) {
    if (state.isDown) {
      if (scenario === 'remove-cache') {
        // Cache is cleanly bypassed: no load, 0 latency on critical path
        state.utilisation = 0;
        state.latencyMs = 0;
      } else {
        // Service failure: degraded/timeout penalty
        state.utilisation = 1.0;
        state.latencyMs = FAILED_SERVICE_TIMEOUT_MS; // documented 500ms client timeout penalty
      }
      continue;
    }

    state.utilisation = state.capacity > 0 ? state.load / state.capacity : 1.0;

    // Non-linear latency penalty using M/M/1 queueing delay curve
    // Latency = baseLatency * (1 + rho / (1 - min(rho, 0.95)))
    const baseLat = BASE_LATENCIES[state.kind] ?? 10;
    const rho = Math.max(0, Math.min(state.utilisation, 0.95));
    const queueMultiplier = 1 + rho / (1 - rho);

    // Flat cache miss penalty added to database in remove-cache scenario
    const flatMissCost =
      scenario === 'remove-cache' && state.kind === 'database'
        ? FLAT_CACHE_MISS_PENALTY_MS
        : 0;

    // Cap latency multiplier at 10x base latency to prevent unbounded spikes
    state.latencyMs = Math.round(baseLat * Math.min(10, queueMultiplier)) + flatMissCost;
  }

  // 8. Calculate Critical Path (Slowest End-to-End Latency)
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

  // Fallback: if all entry paths had 0 latency, use max node latency
  if (maxPathLatency === 0 && nodeMap.size > 0) {
    maxPathLatency = Math.max(...Array.from(nodeMap.values()).map((n) => n.latencyMs));
  }

  // 9. Throughput Calculation
  // In service-failure: compute share of entry traffic routed through failed node from load propagation
  let failedTrafficShare = 0;
  if (scenario === 'service-failure' && targetNodeId) {
    failedTrafficShare = Math.min(1.0, Math.max(0, failedNodeIncomingLoad / requestsPerMinute));
  }

  // Throughput constrained by lowest capacity-to-load ratio across active healthy nodes
  let minCapacityRatio = 1.0;
  let limiterNode: NodeSimulationState | null = null;

  for (const [, state] of nodeMap) {
    if (state.isDown) continue;
    if (state.load > 0 && state.capacity > 0) {
      const ratio = state.capacity / state.load;
      if (ratio < minCapacityRatio) {
        minCapacityRatio = ratio;
        limiterNode = state;
      }
    }
  }

  // Calculate sustained throughput
  // In service-failure, throughput is strictly reduced by (1 - failedTrafficShare)
  let rawThroughput: number;
  if (scenario === 'service-failure') {
    const healthyThroughput = requestsPerMinute * (1 - failedTrafficShare);
    rawThroughput = healthyThroughput * Math.min(1.0, minCapacityRatio);
  } else {
    rawThroughput = requestsPerMinute * Math.min(1.0, minCapacityRatio);
  }

  const estimatedThroughputRpm = Math.max(
    0,
    Math.min(requestsPerMinute, Math.round(Number.isFinite(rawThroughput) ? rawThroughput : 0)),
  );

  // 10. CPU Percent: Average CPU utilisation across all active nodes (0-100)
  const activeNodes = Array.from(nodeMap.values()).filter((n) => !n.isDown);
  const totalUtil = activeNodes.reduce((sum, n) => sum + Math.min(1.0, n.utilisation), 0);
  const avgUtil = activeNodes.length > 0 ? totalUtil / activeNodes.length : 0;
  const estimatedCpuPercent = Math.max(
    0,
    Math.min(100, Math.round(Number.isFinite(avgUtil) ? avgUtil * 100 : 0)),
  );

  // 11. Identify Bottlenecks
  // Nodes with utilisation >= BOTTLENECK_UTILISATION_THRESHOLD (0.75), sorted descending
  const bottlenecks = Array.from(nodeMap.values())
    .filter((n) => !n.isDown && n.utilisation >= BOTTLENECK_UTILISATION_THRESHOLD)
    .sort((a, b) => b.utilisation - a.utilisation);

  const bottleneckNodeIds = bottlenecks.map((n) => n.id);

  // 12. Build nodeUtilisation record (0 to 1+)
  const nodeUtilisation: Record<string, number> = {};
  for (const [id, state] of nodeMap) {
    nodeUtilisation[id] = Number.isFinite(state.utilisation)
      ? Number(state.utilisation.toFixed(2))
      : 0;
  }

  // 13. Build Explanation and Recommendations
  const explanation = buildExplanation(
    scenario,
    requestsPerMinute,
    targetNodeId,
    nodeMap,
    bottlenecks,
    estimatedThroughputRpm,
    maxPathLatency,
    adj,
    limiterNode,
    failedTrafficShare,
  );

  const recommendations = buildRecommendations(
    scenario,
    nodeMap,
    bottlenecks,
    targetNodeId,
    maxPathLatency,
    adj,
    failedTrafficShare,
  );

  return {
    estimatedLatencyMs: Math.max(0, Math.round(Number.isFinite(maxPathLatency) ? maxPathLatency : 0)),
    estimatedCpuPercent,
    estimatedThroughputRpm,
    bottleneckNodeIds,
    explanation,
    recommendations,
    isMock: true,
    nodeUtilisation,
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
  limiterNode: NodeSimulationState | null,
  failedTrafficShare: number,
): string {
  const disclaimer =
    '(Note: This is an illustrative heuristic estimate based on static architecture modeling, not measured production data).';

  switch (scenario) {
    case 'normal': {
      if (bottlenecks.length === 0) {
        return `Baseline simulation running at ${rpm.toLocaleString()} RPM. All components are operating comfortably within capacity limits with an estimated critical path latency of ${latencyMs} ms and sustained throughput of ${throughputRpm.toLocaleString()} RPM. ${disclaimer}`;
      }
      const topNames = bottlenecks
        .map((b) => `${b.label} (${Math.round(b.utilisation * 100)}% CPU)`)
        .join(', ');

      if (throughputRpm >= rpm) {
        return `Baseline simulation running at ${rpm.toLocaleString()} RPM. System sustains full throughput (${throughputRpm.toLocaleString()} RPM) with critical path latency of ${latencyMs} ms. Elevated utilisation detected on ${topNames}, leaving narrow headroom for traffic spikes. ${disclaimer}`;
      }

      const limiterDesc = limiterNode
        ? `capacity saturation on ${limiterNode.label} (${Math.round(limiterNode.utilisation * 100)}% CPU)`
        : 'component capacity constraints';
      return `Baseline simulation running at ${rpm.toLocaleString()} RPM. Elevated utilisation detected on ${topNames}. Maximum sustainable throughput is limited to ${throughputRpm.toLocaleString()} RPM due to ${limiterDesc}. ${disclaimer}`;
    }

    case 'remove-cache': {
      const dbNodes = Array.from(nodeMap.values()).filter((n) => n.kind === 'database');
      const dbNames = dbNodes
        .map((n) => `${n.label} (${Math.round(n.utilisation * 100)}% CPU)`)
        .join(', ');
      return `Cache removal simulation running at ${rpm.toLocaleString()} RPM. In-memory cache layer was bypassed, deflecting full read query volume directly to backing databases: ${dbNames}. End-to-end critical path latency increased to ${latencyMs} ms driven by elevated database thread utilisation and a small 5 ms flat cache-miss penalty. ${disclaimer}`;
    }

    case 'service-failure': {
      const failedNode = targetNodeId ? nodeMap.get(targetNodeId) : null;
      const failedLabel = failedNode ? failedNode.label : targetNodeId;
      const dependents = targetNodeId ? findDownstreamNodes(targetNodeId, adj, nodeMap) : [];
      const dependentNames =
        dependents.length > 0 ? dependents.map((d) => d.label).join(', ') : 'none';
      const lostPercent = Math.round(failedTrafficShare * 100);

      return `Service failure simulation at ${rpm.toLocaleString()} RPM. ${failedLabel} is down, resulting in ${lostPercent}% of incoming traffic being lost or degraded. Affected downstream dependencies: ${dependentNames}. Degraded paths encounter a 500 ms timeout penalty, reducing sustained throughput to ${throughputRpm.toLocaleString()} RPM with critical path latency of ${latencyMs} ms. ${disclaimer}`;
    }

    case 'scale-service': {
      const scaledNode = targetNodeId ? nodeMap.get(targetNodeId) : null;
      const scaledLabel = scaledNode ? scaledNode.label : targetNodeId;
      const utilPercent = scaledNode ? Math.round(scaledNode.utilisation * 100) : 0;
      return `Scale service simulation at ${rpm.toLocaleString()} RPM. Replicas for ${scaledLabel} were doubled to ${scaledNode?.replicas ?? 2} instances, reducing its CPU load to ${utilPercent}% and stabilizing end-to-end critical path latency at ${latencyMs} ms. ${disclaimer}`;
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
  failedTrafficShare: number,
): string[] {
  const recs: string[] = [];

  // Scenario specific recommendations
  if (scenario === 'remove-cache') {
    const db = Array.from(nodeMap.values()).find((n) => n.kind === 'database');
    if (db) {
      recs.push(
        `Provision a distributed cache cluster (e.g., Redis) in front of ${db.label}: database utilisation is at ${Math.round(db.utilisation * 100)}% without caching. Caching restores 85% read query absorption.`,
      );
    }
  } else if (scenario === 'service-failure' && targetNodeId) {
    const target = nodeMap.get(targetNodeId);
    const dependents = findDownstreamNodes(targetNodeId, adj, nodeMap);
    if (target) {
      const lostRpm = Math.round(failedTrafficShare * 100);
      const depNames =
        dependents.length > 0
          ? ` and dependents (${dependents.map((d) => d.label).join(', ')})`
          : '';
      recs.push(
        `Implement resilient circuit breaker patterns and fallback responses across callers${depNames} of ${target.label} to prevent cascading failures (${lostRpm}% traffic impact).`,
      );
    }
  }

  // Bottleneck recommendations naming real nodes with computed numbers
  for (const b of bottlenecks.slice(0, 2)) {
    const currentPercent = Math.round(b.utilisation * 100);
    const targetReplicas = Math.min(50, Math.ceil(b.replicas * (b.utilisation / 0.65)));
    const nextReplicas = Math.max(b.replicas + 1, targetReplicas);
    recs.push(
      `Scale out ${b.label}: utilisation is currently at ${currentPercent}%. Increasing replicas from ${b.replicas} to ${nextReplicas} will bring utilisation down below 65%.`,
    );
  }

  // Database optimisation recommendation
  const heavyDb = Array.from(nodeMap.values()).find(
    (n) => n.kind === 'database' && n.utilisation > 0.65,
  );
  if (heavyDb && !recs.some((r) => r.includes(heavyDb.label))) {
    recs.push(
      `Introduce read replicas or query index optimization for ${heavyDb.label} (currently at ${Math.round(heavyDb.utilisation * 100)}% utilisation) to distribute read queries.`,
    );
  }

  // Latency recommendation
  if (latencyMs > 80 && recs.length < 4) {
    recs.push(
      `Critical path latency is elevated (${latencyMs} ms). Consider decoupling synchronous RPC steps using asynchronous message queues.`,
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
