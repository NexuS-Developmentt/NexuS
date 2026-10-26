// ─────────────────────────────────────────────────────────────────────────────
// Architecture domain types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The visual/functional category of an architecture node.
 * Used to drive icon selection, colour-coding, and simulation behaviour.
 */
export type ArchitectureNodeKind =
  | 'service'
  | 'gateway'
  | 'database'
  | 'cache'
  | 'queue';

/**
 * Custom data payload stored on every React Flow node.
 *
 * `id` is kept on the React Flow `Node` wrapper itself (a stable opaque string)
 * and is intentionally separate from `label`, which is the human-readable
 * display name shown in the canvas.
 */
export interface ArchitectureNodeData extends Record<string, unknown> {
  /** Human-readable display name shown on the canvas. */
  label: string;
  /** Visual / functional category of the node. */
  kind: ArchitectureNodeKind;
  /** Number of running replicas/instances (optional). */
  replicas?: number;
  /** Allocated CPU cores per replica (optional). */
  cpuCores?: number;
  /** Allocated memory in megabytes per replica (optional). */
  memoryMb?: number;
  /** Short prose description of what this node does. */
  description?: string;
  /** Current health status used for visual indicators. */
  status?: 'normal' | 'warning' | 'critical';
  /** Transient simulation overlay status (does not overwrite user-stored status). */
  simulationStatus?: 'normal' | 'warning' | 'critical';
}

/**
 * The transport/protocol category of an architecture edge.
 */
export type ArchitectureEdgeKind =
  | 'http'
  | 'database'
  | 'cache'
  | 'event'
  | 'dependency';

/**
 * Custom data payload stored on every React Flow edge.
 *
 * Edge IDs are stable opaque strings on the React Flow `Edge` wrapper and are
 * intentionally separate from the optional `label` shown on the canvas.
 */
export interface ArchitectureEdgeData extends Record<string, unknown> {
  /** Human-readable label shown along the edge on the canvas. */
  label?: string;
  /** Transport / protocol category of the connection. */
  kind?: ArchitectureEdgeKind;
}

// ─────────────────────────────────────────────────────────────────────────────
// Simulation types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Inputs for an architecture simulation run.
 */
export interface SimulationInputs {
  /** Number of incoming requests per minute at the entry point. */
  requestsPerMinute: number;
  /**
   * Named scenario to simulate:
   * - `normal`          – baseline behaviour
   * - `remove-cache`    – Redis is evicted / unavailable
   * - `service-failure` – a specific service crashes (requires `targetNodeId`)
   * - `scale-service`   – a specific service is scaled up (requires `targetNodeId`)
   */
  scenario: 'normal' | 'remove-cache' | 'service-failure' | 'scale-service';
  /**
   * Stable node ID (matches the React Flow `Node.id`) of the node targeted by
   * `service-failure` or `scale-service` scenarios.
   */
  targetNodeId?: string;
}

/**
 * Results produced by a simulation run.
 * All numeric estimates are approximations based on a static heuristic model.
 */
export interface SimulationResult {
  /** Estimated end-to-end request latency in milliseconds. */
  estimatedLatencyMs: number;
  /** Estimated average CPU utilisation across all services (0–100). */
  estimatedCpuPercent: number;
  /** Estimated sustained throughput in requests per minute. */
  estimatedThroughputRpm: number;
  /**
   * Stable node IDs (matching `Node.id`) of nodes identified as bottlenecks
   * in this simulation.
   */
  bottleneckNodeIds: string[];
  /** Human-readable explanation of the simulation outcome. */
  explanation: string;
  /** Actionable recommendations to improve the architecture. */
  recommendations: string[];
  /**
   * Always `true` – signals to consumers that results come from a heuristic
   * model, not a live profiler, so the UI can show an appropriate disclaimer.
   */
  isMock: true;
}
