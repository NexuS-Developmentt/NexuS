/**
 * graphSerialization.ts
 *
 * Pure functions for exporting and importing Architecture Studio graphs.
 * - JSON serialization strips transient simulation state (simulationStatus, simulationUtilisation).
 * - JSON import validates graph structure, ID uniqueness, node types, edge references,
 *   and field constraints using existing validation rules.
 */

import type { Node, Edge } from '@xyflow/react';
import type {
  ArchitectureNodeData,
  ArchitectureEdgeData,
  ArchitectureNodeKind,
  ArchitectureEdgeKind,
} from '../types/architecture';
import {
  validateNodeName,
  validateReplicas,
  validateCpuCores,
  validateMemoryMb,
  validateStatus,
  validateDescription,
} from './graphValidation';

export const VALID_NODE_KINDS: readonly ArchitectureNodeKind[] = [
  'gateway',
  'service',
  'database',
  'cache',
  'queue',
];

export const VALID_EDGE_KINDS: readonly ArchitectureEdgeKind[] = [
  'http',
  'database',
  'cache',
  'event',
  'dependency',
];

export interface SerializedGraph {
  version: number;
  exportedAt: string;
  nodes: Node<ArchitectureNodeData>[];
  edges: Edge<ArchitectureEdgeData>[];
}

export type ParseGraphResult =
  | {
      valid: true;
      data: {
        nodes: Node<ArchitectureNodeData>[];
        edges: Edge<ArchitectureEdgeData>[];
      };
    }
  | {
      valid: false;
      error: string;
    };

/**
 * Serializes nodes and edges to a pretty JSON string, stripping out any
 * transient simulation state.
 */
export function serializeArchitectureGraph(
  nodes: Node<ArchitectureNodeData>[],
  edges: Edge<ArchitectureEdgeData>[],
): string {
  const cleanNodes = nodes.map((n) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { simulationStatus, simulationUtilisation, ...cleanData } = n.data ?? {};
    return {
      id: n.id,
      type: n.type ?? 'architectureNode',
      position: {
        x: Math.round(n.position?.x ?? 0),
        y: Math.round(n.position?.y ?? 0),
      },
      data: cleanData as ArchitectureNodeData,
    };
  });

  const cleanEdges = edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label ?? e.data?.label,
    data: {
      label: e.data?.label ?? (typeof e.label === 'string' ? e.label : undefined),
      kind: e.data?.kind ?? 'http',
    },
  }));

  const payload: SerializedGraph = {
    version: 1,
    exportedAt: new Date().toISOString(),
    nodes: cleanNodes as Node<ArchitectureNodeData>[],
    edges: cleanEdges as Edge<ArchitectureEdgeData>[],
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * Validates and parses a JSON string containing an exported architecture diagram.
 * Rejects corrupt, malformed, or invalid payloads with descriptive error messages.
 */
export function validateAndParseArchitectureJson(jsonContent: string): ParseGraphResult {
  if (typeof jsonContent !== 'string' || jsonContent.trim().length === 0) {
    return { valid: false, error: 'File is empty.' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonContent);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Invalid JSON syntax';
    return { valid: false, error: `Invalid JSON syntax: ${msg}` };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { valid: false, error: 'JSON payload must be an object with "nodes" and "edges" arrays.' };
  }

  const root = parsed as Record<string, unknown>;

  if (!Array.isArray(root.nodes)) {
    return { valid: false, error: 'Missing or invalid "nodes" array in JSON.' };
  }

  if (!Array.isArray(root.edges)) {
    return { valid: false, error: 'Missing or invalid "edges" array in JSON.' };
  }

  const nodeIds = new Set<string>();
  const validatedNodes: Node<ArchitectureNodeData>[] = [];

  for (let i = 0; i < root.nodes.length; i++) {
    const rawNode = root.nodes[i];
    if (!rawNode || typeof rawNode !== 'object' || Array.isArray(rawNode)) {
      return { valid: false, error: `Node at index ${i} is not a valid object.` };
    }

    const n = rawNode as Record<string, unknown>;

    // Validate ID
    if (typeof n.id !== 'string' || n.id.trim().length === 0) {
      return { valid: false, error: `Node at index ${i} has missing or invalid "id" string.` };
    }
    if (nodeIds.has(n.id)) {
      return { valid: false, error: `Duplicate node ID "${n.id}" found in nodes array.` };
    }
    nodeIds.add(n.id);

    // Validate position
    if (
      !n.position ||
      typeof n.position !== 'object' ||
      typeof (n.position as Record<string, unknown>).x !== 'number' ||
      typeof (n.position as Record<string, unknown>).y !== 'number' ||
      !Number.isFinite((n.position as Record<string, unknown>).x) ||
      !Number.isFinite((n.position as Record<string, unknown>).y)
    ) {
      return { valid: false, error: `Node "${n.id}" has invalid "position" coordinates.` };
    }

    // Validate data payload
    if (!n.data || typeof n.data !== 'object' || Array.isArray(n.data)) {
      return { valid: false, error: `Node "${n.id}" is missing a "data" object.` };
    }

    const data = n.data as Record<string, unknown>;

    // Name validation
    const nameErr = validateNodeName(data.label);
    if (nameErr) {
      return { valid: false, error: `Node "${n.id}": ${nameErr}.` };
    }

    // Kind validation
    if (
      typeof data.kind !== 'string' ||
      !VALID_NODE_KINDS.includes(data.kind as ArchitectureNodeKind)
    ) {
      return {
        valid: false,
        error: `Node "${n.id}" has unknown kind "${String(data.kind)}". Allowed: ${VALID_NODE_KINDS.join(', ')}.`,
      };
    }

    // Optional fields validations
    if (data.replicas !== undefined) {
      const repErr = validateReplicas(data.replicas);
      if (repErr) return { valid: false, error: `Node "${n.id}": ${repErr}.` };
    }

    if (data.cpuCores !== undefined) {
      const cpuErr = validateCpuCores(data.cpuCores);
      if (cpuErr) return { valid: false, error: `Node "${n.id}": ${cpuErr}.` };
    }

    if (data.memoryMb !== undefined) {
      const memErr = validateMemoryMb(data.memoryMb);
      if (memErr) return { valid: false, error: `Node "${n.id}": ${memErr}.` };
    }

    if (data.status !== undefined) {
      const statusErr = validateStatus(data.status);
      if (statusErr) return { valid: false, error: `Node "${n.id}": ${statusErr}.` };
    }

    if (data.description !== undefined) {
      const descErr = validateDescription(data.description);
      if (descErr) return { valid: false, error: `Node "${n.id}": ${descErr}.` };
    }

    validatedNodes.push({
      id: n.id,
      type: 'architectureNode',
      position: {
        x: (n.position as { x: number }).x,
        y: (n.position as { y: number }).y,
      },
      data: {
        label: String(data.label),
        kind: data.kind as ArchitectureNodeKind,
        replicas: data.replicas !== undefined ? Number(data.replicas) : undefined,
        cpuCores: data.cpuCores !== undefined ? Number(data.cpuCores) : undefined,
        memoryMb: data.memoryMb !== undefined ? Number(data.memoryMb) : undefined,
        status: (data.status as 'normal' | 'warning' | 'critical') ?? 'normal',
        description: data.description !== undefined ? String(data.description) : undefined,
      },
    });
  }

  const edgeIds = new Set<string>();
  const validatedEdges: Edge<ArchitectureEdgeData>[] = [];

  for (let i = 0; i < root.edges.length; i++) {
    const rawEdge = root.edges[i];
    if (!rawEdge || typeof rawEdge !== 'object' || Array.isArray(rawEdge)) {
      return { valid: false, error: `Edge at index ${i} is not a valid object.` };
    }

    const e = rawEdge as Record<string, unknown>;

    // Validate edge ID
    if (typeof e.id !== 'string' || e.id.trim().length === 0) {
      return { valid: false, error: `Edge at index ${i} has missing or invalid "id" string.` };
    }
    if (edgeIds.has(e.id)) {
      return { valid: false, error: `Duplicate edge ID "${e.id}" found in edges array.` };
    }
    edgeIds.add(e.id);

    // Validate source and target
    if (typeof e.source !== 'string' || !nodeIds.has(e.source)) {
      return { valid: false, error: `Edge "${e.id}" references non-existent source node "${String(e.source)}".` };
    }
    if (typeof e.target !== 'string' || !nodeIds.has(e.target)) {
      return { valid: false, error: `Edge "${e.id}" references non-existent target node "${String(e.target)}".` };
    }
    if (e.source === e.target) {
      return { valid: false, error: `Edge "${e.id}" is a self-link connecting "${e.source}" to itself.` };
    }

    // Optional data.kind
    const edgeData = (e.data && typeof e.data === 'object' ? e.data : {}) as Record<string, unknown>;
    let kind: ArchitectureEdgeKind = 'http';
    if (edgeData.kind !== undefined) {
      if (
        typeof edgeData.kind !== 'string' ||
        !VALID_EDGE_KINDS.includes(edgeData.kind as ArchitectureEdgeKind)
      ) {
        return {
          valid: false,
          error: `Edge "${e.id}" has unknown kind "${String(edgeData.kind)}". Allowed: ${VALID_EDGE_KINDS.join(', ')}.`,
        };
      }
      kind = edgeData.kind as ArchitectureEdgeKind;
    }

    const label =
      typeof e.label === 'string'
        ? e.label
        : typeof edgeData.label === 'string'
          ? edgeData.label
          : undefined;

    validatedEdges.push({
      id: e.id,
      source: e.source,
      target: e.target,
      label,
      data: {
        label,
        kind,
      },
    });
  }

  return {
    valid: true,
    data: {
      nodes: validatedNodes,
      edges: validatedEdges,
    },
  };
}
