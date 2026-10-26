/**
 * ArchitectureStudioPage
 *
 * Full-page workspace for the Architecture Studio.
 *
 * Layout:
 *  - Header (title, demo badge)
 *  - Toolbar (fit view, reset demo)
 *  - Body:
 *      - NodePalette on the left (compact, responsive)
 *      - ArchitectureCanvas in the centre (flex-grow)
 *      - PropertiesPanel on the right (fixed width 320px)
 *
 * Key bindings:
 *  - Delete: deletes the selected node (prompting if edges exist) or edge
 *    (suppressed while typing inside input/textarea/select).
 */

import { useCallback, useEffect } from 'react';
import { ReactFlowProvider, useReactFlow } from '@xyflow/react';

import { ArchitectureCanvas } from '../components/ArchitectureCanvas';
import { GraphToolbar } from '../components/GraphToolbar';
import { NodePalette } from '../components/NodePalette';
import { PropertiesPanel } from '../components/PropertiesPanel';
import { SimulationPanel } from '../components/SimulationPanel';
import { useArchitectureGraph } from '../hooks/useArchitectureGraph';
import styles from './ArchitectureStudioPage.module.css';

// ── Inner page (must be inside ReactFlowProvider) ─────────────────────────────

function InnerPage() {
  const graph = useArchitectureGraph();
  const { fitView } = useReactFlow();

  const handleFitView = useCallback(() => {
    fitView({ padding: 0.15, duration: 400 });
  }, [fitView]);

  const handleReset = useCallback(() => {
    graph.resetDemo();
    setTimeout(() => {
      fitView({ padding: 0.15, duration: 400 });
    }, 50);
  }, [graph, fitView]);

  // ── Node and Edge deletion handlers ─────────────────────────────────────────

  const { deleteNode, deleteEdge } = graph;

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      const node = graph.nodes.find((n) => n.id === nodeId);
      const connectedEdges = graph.edges.filter(
        (e) => e.source === nodeId || e.target === nodeId,
      );

      if (connectedEdges.length > 0) {
        const confirmed = window.confirm(
          `Node "${node?.data.label ?? nodeId}" has ${connectedEdges.length} connected connection(s). Deleting it will also remove all connected edges. Are you sure?`,
        );
        if (!confirmed) return;
      }

      deleteNode(nodeId);
    },
    [graph.nodes, graph.edges, deleteNode],
  );

  const handleDeleteEdge = useCallback(
    (edgeId: string) => {
      deleteEdge(edgeId);
    },
    [deleteEdge],
  );

  // ── Global Delete Key Handler ───────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Delete') return;

      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if (isInput) return;

      if (graph.selectedNodeId) {
        e.preventDefault();
        handleDeleteNode(graph.selectedNodeId);
      } else if (graph.selectedEdgeId) {
        e.preventDefault();
        handleDeleteEdge(graph.selectedEdgeId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [graph.selectedNodeId, graph.selectedEdgeId, handleDeleteNode, handleDeleteEdge]);

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
          title="Interactive architecture diagram workspace"
        >
          Interactive Studio
        </span>
      </header>

      {/* ── Toolbar ── */}
      <div className={styles.toolbarRow}>
        <GraphToolbar onFitView={handleFitView} onReset={handleReset} />
      </div>

      {/* ── Body: palette + canvas + properties panel ── */}
      <div className={styles.body}>
        {/* Compact left palette for adding nodes */}
        <NodePalette onAddNode={graph.addNode} />

        {/* Canvas and Simulation Panel fill remaining horizontal space */}
        <div className={styles.canvasArea}>
          <ArchitectureCanvas
            nodes={graph.nodes}
            edges={graph.edges}
            onNodesChange={graph.onNodesChange}
            onEdgesChange={graph.onEdgesChange}
            onConnect={graph.onConnect}
            onSelectionChange={graph.onSelectionChange}
            onPaneClick={graph.onPaneClick}
            notification={graph.notification}
            clearNotification={graph.clearNotification}
            resetDemo={handleReset}
          />
          <SimulationPanel
            nodes={graph.rawNodes}
            edges={graph.edges}
            onSetSimulationHighlights={graph.setSimulationHighlights}
            onClearSimulationHighlights={graph.clearSimulationHighlights}
          />
        </div>

        {/* Properties panel — fixed width, scrolls independently */}
        <PropertiesPanel
          nodes={graph.rawNodes}
          edges={graph.edges}
          selectedNodeId={graph.selectedNodeId}
          selectedEdgeId={graph.selectedEdgeId}
          onUpdateNode={graph.updateNodeData}
          onDeleteNode={handleDeleteNode}
          onUpdateEdge={graph.updateEdgeData}
          onDeleteEdge={handleDeleteEdge}
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
