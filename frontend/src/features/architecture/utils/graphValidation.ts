/**
 * graphValidation.ts
 *
 * Pure validation functions for Architecture Studio graph editing.
 * Covers node fields, edge fields, and connection constraints.
 */

import type { ArchitectureNodeKind } from '../types/architecture';

// ── Node field validators ─────────────────────────────────────────────────────

/**
 * Validates a node display name.
 * Name is required and must contain non-whitespace characters.
 */
export function validateNodeName(name: unknown): string | null {
  if (typeof name !== 'string' || name.trim().length === 0) {
    return 'Name is required';
  }
  return null;
}

/**
 * Validates replicas count.
 * Must be an integer between 1 and 50.
 */
export function validateReplicas(val: unknown): string | null {
  if (val === '' || val === null || val === undefined) {
    return 'Replicas is required';
  }
  const num = typeof val === 'number' ? val : Number(val);
  if (!Number.isInteger(num) || num < 1 || num > 50) {
    return 'Replicas must be an integer between 1 and 50';
  }
  return null;
}

/**
 * Validates CPU cores.
 * Must be a number greater than 0 and at most 64.
 */
export function validateCpuCores(val: unknown): string | null {
  if (val === '' || val === null || val === undefined) {
    return 'CPU cores is required';
  }
  const num = typeof val === 'number' ? val : Number(val);
  if (isNaN(num) || num <= 0 || num > 64) {
    return 'CPU cores must be greater than 0 and at most 64';
  }
  return null;
}

/**
 * Validates allocated memory in megabytes.
 * Must be an integer between 128 and 65,536.
 */
export function validateMemoryMb(val: unknown): string | null {
  if (val === '' || val === null || val === undefined) {
    return 'Memory is required';
  }
  const num = typeof val === 'number' ? val : Number(val);
  if (!Number.isInteger(num) || num < 128 || num > 65536) {
    return 'Memory must be an integer between 128 and 65,536 MB';
  }
  return null;
}

/**
 * Validates node status.
 * Must be one of 'normal', 'warning', or 'critical'.
 */
export function validateStatus(val: unknown): string | null {
  const allowed = ['normal', 'warning', 'critical'];
  if (typeof val !== 'string' || !allowed.includes(val)) {
    return 'Status must be normal, warning, or critical';
  }
  return null;
}

/**
 * Validates node description. Optional prose string.
 */
export function validateDescription(val: unknown): string | null {
  if (val !== undefined && val !== null && typeof val !== 'string') {
    return 'Description must be a string';
  }
  return null;
}

// ── Composite node validation ─────────────────────────────────────────────────

export interface NodeValidationErrors {
  name?: string;
  replicas?: string;
  cpuCores?: string;
  memoryMb?: string;
  status?: string;
  description?: string;
}

export function validateAllNodeFields(data: {
  label?: unknown;
  replicas?: unknown;
  cpuCores?: unknown;
  memoryMb?: unknown;
  status?: unknown;
  description?: unknown;
}): NodeValidationErrors {
  const errors: NodeValidationErrors = {};

  const nameErr = validateNodeName(data.label);
  if (nameErr) errors.name = nameErr;

  if (data.replicas !== undefined) {
    const repErr = validateReplicas(data.replicas);
    if (repErr) errors.replicas = repErr;
  }

  if (data.cpuCores !== undefined) {
    const cpuErr = validateCpuCores(data.cpuCores);
    if (cpuErr) errors.cpuCores = cpuErr;
  }

  if (data.memoryMb !== undefined) {
    const memErr = validateMemoryMb(data.memoryMb);
    if (memErr) errors.memoryMb = memErr;
  }

  if (data.status !== undefined) {
    const statusErr = validateStatus(data.status);
    if (statusErr) errors.status = statusErr;
  }

  if (data.description !== undefined) {
    const descErr = validateDescription(data.description);
    if (descErr) errors.description = descErr;
  }

  return errors;
}

// ── Connection validation ─────────────────────────────────────────────────────

export interface ConnectionCandidate {
  source: string | null | undefined;
  target: string | null | undefined;
}

export interface ExistingEdgeRef {
  source: string;
  target: string;
}

export interface ConnectionValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Validates a newly proposed edge connection.
 * - Blocks self-links (source === target).
 * - Blocks duplicate source-target pairs.
 */
export function validateConnection(
  connection: ConnectionCandidate,
  existingEdges: ExistingEdgeRef[],
): ConnectionValidationResult {
  const { source, target } = connection;

  if (!source || !target) {
    return {
      valid: false,
      reason: 'Both source and target nodes are required.',
    };
  }

  if (source === target) {
    return {
      valid: false,
      reason: 'Self-links are not allowed: a node cannot connect to itself.',
    };
  }

  const isDuplicate = existingEdges.some(
    (edge) => edge.source === source && edge.target === target,
  );

  if (isDuplicate) {
    return {
      valid: false,
      reason: 'A connection already exists between these nodes.',
    };
  }

  return { valid: true };
}

// ── Default node generator helper ─────────────────────────────────────────────

export interface DefaultNodeConfig {
  label: string;
  kind: ArchitectureNodeKind;
  replicas: number;
  cpuCores: number;
  memoryMb: number;
  description: string;
  status: 'normal' | 'warning' | 'critical';
}

export function getDefaultNodeConfig(kind: ArchitectureNodeKind): DefaultNodeConfig {
  switch (kind) {
    case 'gateway':
      return {
        label: 'API Gateway',
        kind: 'gateway',
        replicas: 2,
        cpuCores: 1,
        memoryMb: 512,
        description: 'Entry point routing external client traffic to services',
        status: 'normal',
      };
    case 'service':
      return {
        label: 'App Service',
        kind: 'service',
        replicas: 2,
        cpuCores: 2,
        memoryMb: 1024,
        description: 'Core microservice handling business domain logic',
        status: 'normal',
      };
    case 'database':
      return {
        label: 'Database',
        kind: 'database',
        replicas: 1,
        cpuCores: 4,
        memoryMb: 4096,
        description: 'Primary relational data store for persistent entities',
        status: 'normal',
      };
    case 'cache':
      return {
        label: 'In-Memory Cache',
        kind: 'cache',
        replicas: 1,
        cpuCores: 1,
        memoryMb: 1024,
        description: 'High-speed in-memory key-value cache layer',
        status: 'normal',
      };
    case 'queue':
      return {
        label: 'Message Queue',
        kind: 'queue',
        replicas: 2,
        cpuCores: 1,
        memoryMb: 512,
        description: 'Asynchronous event stream and message broker',
        status: 'normal',
      };
  }
}

/**
 * Calculates a position for a new node that does not stack or overlap on existing nodes.
 * Scans a 2D grid of potential spots and chooses the first non-colliding spot.
 */
export function calculateNewNodePosition(
  existingNodes: Array<{ position: { x: number; y: number } }>,
): { x: number; y: number } {
  const NODE_WIDTH = 200;
  const NODE_HEIGHT = 90;
  const PADDING_X = 60;
  const PADDING_Y = 60;

  const stepX = NODE_WIDTH + PADDING_X;
  const stepY = NODE_HEIGHT + PADDING_Y;

  const startX = 60;
  const startY = 80;

  // Search in a staggered grid (4 columns wide, multiple rows)
  for (let row = 0; row < 15; row++) {
    for (let col = 0; col < 4; col++) {
      const candidateX = startX + col * stepX;
      const candidateY = startY + row * stepY;

      const collides = existingNodes.some((node) => {
        const dx = Math.abs(node.position.x - candidateX);
        const dy = Math.abs(node.position.y - candidateY);
        return dx < NODE_WIDTH && dy < NODE_HEIGHT;
      });

      if (!collides) {
        return { x: candidateX, y: candidateY };
      }
    }
  }

  // Fallback: place below lowest node
  const lowestY = existingNodes.reduce(
    (max, n) => Math.max(max, n.position.y),
    startY,
  );
  return { x: startX, y: lowestY + stepY };
}
