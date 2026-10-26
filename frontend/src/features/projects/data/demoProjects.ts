// ─────────────────────────────────────────────────────────────────────────────
// NEXUS – Demo / sample projects and simulations
//
// ⚠️  DEMO DATA — all entries are fabricated for demonstration purposes.
//     No real repositories or production systems are represented.
// ─────────────────────────────────────────────────────────────────────────────

import type { ProjectSummary, SimulationSummary } from '../../../types/project';

/** Stable ID of the primary demo project (used as the fallback projectId). */
export const DEMO_PROJECT_ID = 'demo-ecommerce';

/** Curated list of sample projects shown in the dashboard. */
export const demoProjects: ProjectSummary[] = [
  {
    id: DEMO_PROJECT_ID,
    name: 'E-Commerce Platform',
    description:
      'Microservices-based online retail system with API gateway, order management, inventory, and payment services.',
    architectureType: 'microservices',
    serviceCount: 8,
    status: 'demo',
    updatedAtLabel: 'Just now',
  },
  {
    id: 'demo-analytics',
    name: 'Analytics Pipeline',
    description:
      'Event-driven data ingestion and processing pipeline using message queues and stream consumers.',
    architectureType: 'event-driven',
    serviceCount: 5,
    status: 'draft',
    updatedAtLabel: '2 days ago',
  },
  {
    id: 'demo-legacy',
    name: 'Legacy CRM',
    description:
      'Monolithic CRM system targeted for phased service decomposition.',
    architectureType: 'monolith',
    serviceCount: 1,
    status: 'draft',
    updatedAtLabel: '1 week ago',
  },
];

/** Recent simulation activity shown on the dashboard. */
export const demoSimulations: SimulationSummary[] = [
  {
    id: 'sim-001',
    projectId: DEMO_PROJECT_ID,
    projectName: 'E-Commerce Platform',
    scenarioLabel: 'Normal traffic — 5,000 RPM',
    status: 'completed',
    createdAtLabel: '10 minutes ago',
    isMock: true,
  },
  {
    id: 'sim-002',
    projectId: DEMO_PROJECT_ID,
    projectName: 'E-Commerce Platform',
    scenarioLabel: 'Cache eviction stress test',
    status: 'completed',
    createdAtLabel: '1 hour ago',
    isMock: true,
  },
  {
    id: 'sim-003',
    projectId: DEMO_PROJECT_ID,
    projectName: 'E-Commerce Platform',
    scenarioLabel: 'Payment service failure',
    status: 'completed',
    createdAtLabel: '3 hours ago',
    isMock: true,
  },
  {
    id: 'sim-004',
    projectId: 'demo-analytics',
    projectName: 'Analytics Pipeline',
    scenarioLabel: 'Scale queue consumer × 2',
    status: 'draft',
    createdAtLabel: '2 days ago',
    isMock: true,
  },
];
