// ─────────────────────────────────────────────────────────────────────────────
// NEXUS – Centralised route map
// Keep all path strings here; never hard-code them in components.
// ─────────────────────────────────────────────────────────────────────────────

import { DEMO_PROJECT_ID } from './features/projects/data/demoProjects';

/** Every application route. */
export const ROUTES = {
  landing:      '/',
  dashboard:    '/dashboard',
  newProject:   '/projects/new',
  architecture: (projectId: string) => `/projects/${projectId}/architecture`,
  simulation:   (projectId: string) => `/projects/${projectId}/simulation`,
  insights:     (projectId: string) => `/projects/${projectId}/insights`,
  reports:      (projectId: string) => `/projects/${projectId}/reports`,
} as const;

/** Convenience: demo project's architecture route. */
export const DEMO_ARCHITECTURE_ROUTE = ROUTES.architecture(DEMO_PROJECT_ID);

/** Navigation item descriptor used by Sidebar. */
export interface NavItem {
  label: string;
  /** Lucide icon name resolved in Sidebar.tsx */
  iconName: 'LayoutDashboard' | 'Network' | 'Activity' | 'Sparkles' | 'FileText';
  /** Static string or factory requiring a projectId. */
  path: string | ((projectId: string) => string);
  requiresProject: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    iconName: 'LayoutDashboard',
    path: ROUTES.dashboard,
    requiresProject: false,
  },
  {
    label: 'Architecture',
    iconName: 'Network',
    path: ROUTES.architecture,
    requiresProject: true,
  },
  {
    label: 'Simulation',
    iconName: 'Activity',
    path: ROUTES.simulation,
    requiresProject: true,
  },
  {
    label: 'AI Insights',
    iconName: 'Sparkles',
    path: ROUTES.insights,
    requiresProject: true,
  },
  {
    label: 'Reports',
    iconName: 'FileText',
    path: ROUTES.reports,
    requiresProject: true,
  },
];
