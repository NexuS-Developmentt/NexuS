/**
 * ArchitectureStudioPage
 *
 * Top-level page for the Architecture Studio feature.
 *
 * Layout:
 *   ┌──────────────────────────────────────────────────────┐
 *   │  Header: title + demo badge                          │
 *   │  Toolbar: Fit view | Reset demo                      │
 *   ├──────────────────────────────────────────────── ─────┤
 *   │  Canvas (flex: 1)          │  Properties panel 300px │
 *   └──────────────────────────────────────────────────────┘
 *
 * ReactFlowProvider wraps the body so useReactFlow() works inside
 * ArchitectureCanvas. InnerPage lives inside the provider so it can call
 * useReactFlow() directly for fitView.
 */

import { useCallback } from 'react';
import { ReactFlowProvider, useReactFlow, type FitViewOptions } from '@xyflow/react';

import { useArchitectureGraph }  from '../hooks/useArchitectureGraph';
import { ArchitectureCanvas }    from '../components/ArchitectureCanvas';
import { GraphToolbar }          from '../components/GraphToolbar';
import { PropertiesPanel }       from '../components/PropertiesPanel';

import styles from './ArchitectureStudioPage.module.css';

// ─────────────────────────────────────────────────────────────────────────────
const FIT_VIEW_OPTS: FitViewOptions = { padding: 0.15, duration: 400 };

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
        <span
          className={styles.demoBadge}
          title="This graph is hand-authored demo data, not discovered from the repository"
        >
          Demo data · local only
        </span>
      </header>

      {/* ── Toolbar ── */}
      <div className={styles.toolbarRow}>
        <GraphToolbar onFitView={handleFitView} onReset={handleReset} />
      </div>

      {/* ── Body: canvas + properties panel ── */}
      <div className={styles.body}>
        {/* Canvas fills all remaining horizontal space */}
        <div className={styles.canvasArea}>
          <ArchitectureCanvas
            nodes={graph.nodes}
            edges={graph.edges}
            onNodesChange={graph.onNodesChange}
            onEdgesChange={graph.onEdgesChange}
            onConnect={graph.onConnect}
            onSelectionChange={graph.onSelectionChange}
            onPaneClick={graph.onPaneClick}
          />
        </div>

        {/* Properties panel — fixed width, scrolls independently */}
        <PropertiesPanel
          nodes={graph.nodes}
          edges={graph.edges}
          selectedNodeId={graph.selectedNodeId}
          selectedEdgeId={graph.selectedEdgeId}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export function ArchitectureStudioPage() {
  return (
    <ReactFlowProvider>
      <InnerPage />
    </ReactFlowProvider>
  );
}

export default ArchitectureStudioPage;
