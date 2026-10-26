/**
 * App.tsx — root router configuration for NEXUS.
 *
 * Route map:
 *   /                                  LandingPage          (no shell)
 *   /dashboard                         DashboardPage        (AppShell)
 *   /projects/new                      NewProjectPage       (AppShell)
 *   /projects/:projectId/architecture  ArchitectureStudio   (AppShell full-bleed)
 *   /projects/:projectId/simulation    PlaceholderPage      (AppShell)
 *   /projects/:projectId/insights      PlaceholderPage      (AppShell)
 *   /projects/:projectId/reports       PlaceholderPage      (AppShell)
 *
 * ─── Member 2's Architecture Studio integration (Prompt 8) ───────────────────
 * ArchitectureStudioPage is imported from features/architecture and mounted at
 * /projects/:projectId/architecture inside the full-bleed AppShell.
 * The shell collapses the sidebar to icon-only and hides the TopBar so the
 * React Flow canvas fills the entire remaining viewport height (100dvh).
 * DO NOT modify features/architecture/** — that module is Member 2's.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { NewProjectPage } from './pages/NewProjectPage';
import { PlaceholderPage } from './pages/PlaceholderPage';

// TODO (Prompt 8 — swap when Member 2 export is confirmed):
// Currently importing the real ArchitectureStudioPage from features/architecture.
// If their export is not ready, replace this import with:
//   import { PlaceholderPage as ArchitectureStudioPage } from './pages/PlaceholderPage';
import { ArchitectureStudioPage } from './features/architecture';

import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Outside shell ── */}
        <Route path="/" element={<LandingPage />} />

        {/* ── Standard shell (with TopBar) ── */}
        <Route element={<AppShell pageTitle="Dashboard" />}>
          <Route path="/dashboard" element={<DashboardPage />} />
        </Route>

        <Route element={<AppShell pageTitle="New Project" />}>
          <Route path="/projects/new" element={<NewProjectPage />} />
        </Route>

        <Route element={<AppShell pageTitle="Simulation" />}>
          <Route
            path="/projects/:projectId/simulation"
            element={<PlaceholderPage moduleName="Simulation" />}
          />
        </Route>

        <Route element={<AppShell pageTitle="AI Insights" />}>
          <Route
            path="/projects/:projectId/insights"
            element={<PlaceholderPage moduleName="AI Insights" />}
          />
        </Route>

        <Route element={<AppShell pageTitle="Reports" />}>
          <Route
            path="/projects/:projectId/reports"
            element={<PlaceholderPage moduleName="Reports" />}
          />
        </Route>

        {/* ── Full-bleed shell — Architecture Studio (Member 2) ── */}
        {/* The sidebar collapses to icon-only; TopBar is hidden so the
            React Flow canvas gets the full 100dvh it expects.          */}
        <Route element={<AppShell fullBleed />}>
          <Route
            path="/projects/:projectId/architecture"
            element={<ArchitectureStudioPage />}
          />
        </Route>

        {/* ── Fallback redirect ── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
