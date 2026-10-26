// ─────────────────────────────────────────────────────────────────────────────
// NEXUS – Project & Simulation domain types
// ─────────────────────────────────────────────────────────────────────────────

/** High-level classification of an architecture topology. */
export type ArchitectureType =
  | 'microservices'
  | 'monolith'
  | 'event-driven'
  | 'unknown';

/** Lifecycle status of a project. */
export type ProjectStatus = 'demo' | 'draft' | 'ready';

/** Lifecycle status of a simulation run. */
export type SimulationStatus = 'completed' | 'draft';

/**
 * Compact summary of a project shown in lists and cards.
 * All counts are approximate / demo values.
 */
export interface ProjectSummary {
  id: string;
  name: string;
  description: string;
  architectureType: ArchitectureType;
  /** Number of services / nodes in the topology. */
  serviceCount: number;
  status: ProjectStatus;
  /** Human-readable relative label, e.g. "2 days ago". */
  updatedAtLabel: string;
}

/**
 * Summary of a simulation run shown in recent-activity lists.
 * `isMock: true` is always set — this is sample data, not a real run.
 */
export interface SimulationSummary {
  id: string;
  projectId: string;
  projectName: string;
  scenarioLabel: string;
  status: SimulationStatus;
  /** Human-readable relative label, e.g. "3 hours ago". */
  createdAtLabel: string;
  /** Always true — results come from a heuristic model, not live APM. */
  isMock: true;
}
