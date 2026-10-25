/**
 * @fileoverview Demo architecture graph for the Architecture Studio.
 *
 * IMPORTANT: This is hand-authored demo data, NOT auto-discovered from a real
 * repository. It represents a plausible microservices architecture for
 * illustrative and simulation purposes only.
 */

import type { Node, Edge } from '@xyflow/react';
import type { ArchitectureNodeData, ArchitectureEdgeData } from '../types/architecture';

// ─────────────────────────────────────────────────────────────────────────────
// Stable node / edge ID constants
// These are the canonical IDs referenced by edges and simulation results.
// They must never change between resets; only `data.label` is the display name.
// ─────────────────────────────────────────────────────────────────────────────
export const NODE_IDS = {
  API_GATEWAY:          'node-api-gateway',
  AUTH_SERVICE:         'node-auth-service',
  ORDER_SERVICE:        'node-order-service',
  PAYMENT_SERVICE:      'node-payment-service',
  INVENTORY_SERVICE:    'node-inventory-service',
  REDIS_CACHE:          'node-redis-cache',
  POSTGRES_DB:          'node-postgres-db',
  NOTIFICATION_SERVICE: 'node-notification-service',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Canonical node definitions
// ─────────────────────────────────────────────────────────────────────────────
const _demoNodes: Node<ArchitectureNodeData>[] = [
  {
    id: NODE_IDS.API_GATEWAY,
    type: 'default',
    position: { x: 400, y: 40 },
    data: {
      label:       'API Gateway',
      kind:        'gateway',
      replicas:    2,
      cpuCores:    1,
      memoryMb:    512,
      description: 'TLS-terminating edge proxy; routes traffic to downstream services, enforces rate-limits, and handles CORS.',
      status:      'normal',
    },
  },
  {
    id: NODE_IDS.AUTH_SERVICE,
    type: 'default',
    position: { x: 100, y: 200 },
    data: {
      label:       'Authentication Service',
      kind:        'service',
      replicas:    2,
      cpuCores:    1,
      memoryMb:    256,
      description: 'Issues and validates JWTs; manages OAuth 2.0 flows and refresh-token rotation.',
      status:      'normal',
    },
  },
  {
    id: NODE_IDS.ORDER_SERVICE,
    type: 'default',
    position: { x: 400, y: 200 },
    data: {
      label:       'Order Service',
      kind:        'service',
      replicas:    3,
      cpuCores:    2,
      memoryMb:    512,
      description: 'Core business service: creates, updates, and queries customer orders; orchestrates downstream calls.',
      status:      'normal',
    },
  },
  {
    id: NODE_IDS.PAYMENT_SERVICE,
    type: 'default',
    position: { x: 100, y: 400 },
    data: {
      label:       'Payment Service',
      kind:        'service',
      replicas:    2,
      cpuCores:    2,
      memoryMb:    512,
      description: 'Processes card charges and refunds; integrates with Stripe and maintains an internal ledger.',
      status:      'normal',
    },
  },
  {
    id: NODE_IDS.INVENTORY_SERVICE,
    type: 'default',
    position: { x: 700, y: 400 },
    data: {
      label:       'Inventory Service',
      kind:        'service',
      replicas:    2,
      cpuCores:    1,
      memoryMb:    256,
      description: 'Tracks stock levels; reserves and releases SKU quantities in response to order events.',
      status:      'normal',
    },
  },
  {
    id: NODE_IDS.REDIS_CACHE,
    type: 'default',
    position: { x: 400, y: 400 },
    data: {
      label:       'Redis Cache',
      kind:        'cache',
      replicas:    1,
      cpuCores:    1,
      memoryMb:    1024,
      description: 'In-memory key-value store; caches session tokens and frequently-read order summaries.',
      status:      'normal',
    },
  },
  {
    id: NODE_IDS.POSTGRES_DB,
    type: 'default',
    position: { x: 250, y: 580 },
    data: {
      label:       'PostgreSQL Database',
      kind:        'database',
      replicas:    1,
      cpuCores:    4,
      memoryMb:    4096,
      description: 'Primary relational store for orders, payments, and user data; streaming replication to a read replica.',
      status:      'normal',
    },
  },
  {
    id: NODE_IDS.NOTIFICATION_SERVICE,
    type: 'default',
    position: { x: 700, y: 200 },
    data: {
      label:       'Notification Service',
      kind:        'service',
      replicas:    1,
      cpuCores:    1,
      memoryMb:    256,
      description: 'Sends email/SMS/push notifications; consumes order events and renders templates via a job queue.',
      status:      'normal',
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Canonical edge definitions
// Edge IDs are stable strings; `data.label` is the display label.
// ─────────────────────────────────────────────────────────────────────────────
const _demoEdges: Edge<ArchitectureEdgeData>[] = [
  {
    id:     'edge-gateway-auth',
    source: NODE_IDS.API_GATEWAY,
    target: NODE_IDS.AUTH_SERVICE,
    data: { label: 'Authenticate request', kind: 'http' },
  },
  {
    id:     'edge-gateway-order',
    source: NODE_IDS.API_GATEWAY,
    target: NODE_IDS.ORDER_SERVICE,
    data: { label: 'Route order requests', kind: 'http' },
  },
  {
    id:     'edge-order-payment',
    source: NODE_IDS.ORDER_SERVICE,
    target: NODE_IDS.PAYMENT_SERVICE,
    data: { label: 'Charge / refund', kind: 'http' },
  },
  {
    id:     'edge-order-inventory',
    source: NODE_IDS.ORDER_SERVICE,
    target: NODE_IDS.INVENTORY_SERVICE,
    data: { label: 'Reserve stock', kind: 'http' },
  },
  {
    id:     'edge-order-redis',
    source: NODE_IDS.ORDER_SERVICE,
    target: NODE_IDS.REDIS_CACHE,
    data: { label: 'Read / write cache', kind: 'cache' },
  },
  {
    id:     'edge-order-postgres',
    source: NODE_IDS.ORDER_SERVICE,
    target: NODE_IDS.POSTGRES_DB,
    data: { label: 'Persist orders', kind: 'database' },
  },
  {
    id:     'edge-payment-postgres',
    source: NODE_IDS.PAYMENT_SERVICE,
    target: NODE_IDS.POSTGRES_DB,
    data: { label: 'Persist transactions', kind: 'database' },
  },
  {
    id:     'edge-order-notification',
    source: NODE_IDS.ORDER_SERVICE,
    target: NODE_IDS.NOTIFICATION_SERVICE,
    data: { label: 'Emit order event', kind: 'event' },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a true deep copy of the canonical demo graph via `structuredClone`.
 *
 * Every nested object — `position`, `data`, and any future sub-objects — is a
 * brand-new allocation fully independent of the private `_demoNodes` /
 * `_demoEdges` arrays. Callers can freely mutate the result (drag nodes,
 * highlight bottlenecks, apply simulation state) without ever corrupting the
 * source-of-truth, so a "Reset" action can always call this function and
 * restore the originals.
 */
export function getDemoArchitecture(): {
  nodes: Node<ArchitectureNodeData>[];
  edges: Edge<ArchitectureEdgeData>[];
} {
  return {
    nodes: structuredClone(_demoNodes),
    edges: structuredClone(_demoEdges),
  };
}

/** Convenience named exports for consumers that only need one of the two. */
export const demoNodes: Node<ArchitectureNodeData>[] = getDemoArchitecture().nodes;
export const demoEdges: Edge<ArchitectureEdgeData>[] = getDemoArchitecture().edges;
