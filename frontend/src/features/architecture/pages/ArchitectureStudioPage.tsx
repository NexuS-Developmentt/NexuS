/**
 * ArchitectureStudioPage
 *
 * Top-level page for the Architecture Studio feature.
 *
 * Layout:
 *   ┌─────────────────────────────────────┐
 *   │  Header: title + demo badge         │
 *   │  Toolbar: Fit view | Reset demo     │
 *   │  Canvas (fills remaining height)    │
 *   └─────────────────────────────────────┘
 *
 * ReactFlowProvider wraps the canvas so that useReactFlow() calls inside
 * ArchitectureCanvas resolve correctly.
 *
 * The fitView bridge: ArchitectureCanvas exposes nothing via refs. Instead,
 * the page renders an InnerPage child that lives *inside* the ReactFlowProvider
 * and can call useReactFlow() to obtain fitView, which it passes to the toolbar.
 */

import { useCallback } from 'react';
import { ReactFlowProvider, useReactFlow, type FitViewOptions } from '@xyflow/react';

import { useArchitectureGraph } from '../hooks/useArchitectureGraph';
import { ArchitectureCanvas }   from '../components/ArchitectureCanvas';
import { GraphToolbar }         from '../components/GraphToolbar';

import styles from './ArchitectureStudioPage.module.css';

// ─────────────────────────────────────────────────────────────────────────────
// Shared fit-view options (consistent with canvas defaults)
// ─────────────────────────────────────────────────────────────────────────────
const FIT_VIEW_OPTS: FitViewOptions = { padding: 0.15, duration: 400 };

// ─────────────────────────────────────────────────────────────────────────────
// Inner page — rendered inside ReactFlowProvider so useReactFlow() works
// ─────────────────────────────────────────────────────────────────────────────
function InnerPage() {
  const { fitView } = useReactFlow();
  const graph = useArchitectureGraph();

  const handleFitView = useCallback(
    () => fitView(FIT_VIEW_OPTS),
    [fitView],
  );

  const handleReset = useCallback(() => {
    graph.resetDemo();
    // Give React one tick to apply the new node positions, then fit view
    setTimeout(() => fitView(FIT_VIEW_OPTS), 50);
  }, [graph, fitView]);

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>Architecture Studio</h1>
          <span className={styles.projectName}>NexuS</span>
        </div>
        <span className={styles.demoBadge} title="This graph is hand-authored demo data, not discovered from the repository">
          Demo data · local only
        </span>
      </header>

      {/* ── Toolbar ── */}
      <div className={styles.toolbarRow}>
        <GraphToolbar onFitView={handleFitView} onReset={handleReset} />
      </div>

      {/* ── Canvas ── */}
      <ArchitectureCanvas
        nodes={graph.nodes}
        edges={graph.edges}
        onNodesChange={graph.onNodesChange}
        onEdgesChange={graph.onEdgesChange}
        onConnect={graph.onConnect}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Public export — wraps InnerPage in ReactFlowProvider
// ─────────────────────────────────────────────────────────────────────────────
export function ArchitectureStudioPage() {
  return (
    <ReactFlowProvider>
      <InnerPage />
    </ReactFlowProvider>
  );
}

export default ArchitectureStudioPage;
