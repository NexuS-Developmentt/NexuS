/**
 * ArchitectureCanvas
 *
 * React Flow canvas wired to the useArchitectureGraph hook.
 *
 * Important: nodeTypes is defined at module scope (outside the component) so
 * React Flow never recreates the map between renders — avoids the "nodeTypes
 * changed" warning and prevents unnecessary node re-mounts.
 */

import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  type FitViewOptions,
  type OnSelectionChangeParams,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { AlertCircle, X, RotateCcw, LayoutGrid } from 'lucide-react';

import type { ArchitectureNodeData, ArchitectureEdgeData } from '../types/architecture';
import { ArchitectureNode } from './ArchitectureNode';
import styles from './ArchitectureCanvas.module.css';

// ── nodeTypes registered once at module scope ─────────────────────────────────
const nodeTypes = {
  architectureNode: ArchitectureNode,
} as const;

// ── Default edge options ──────────────────────────────────────────────────────
const defaultEdgeOptions = {
  type: 'smoothstep',
  markerEnd: { type: 'arrow' as const },
  style: { strokeWidth: 1.5, stroke: '#3a4050' },
  // `label` is supplied per-edge. These style props control appearance.
  labelStyle: {
    fill: '#a8b4c8',
    fontSize: 10,
    fontFamily: 'inherit',
    fontWeight: 500,
  },
  labelBgStyle: {
    fill: '#181b24',
    fillOpacity: 1,
  },
  labelBgPadding: [3, 7] as [number, number],
  labelBgBorderRadius: 5,
} as const;

const fitViewOptions: FitViewOptions = { padding: 0.15, duration: 400 };

// ── Component ─────────────────────────────────────────────────────────────────

export interface ArchitectureCanvasProps {
  nodes: Node<ArchitectureNodeData>[];
  edges: Edge<ArchitectureEdgeData>[];
  onNodesChange: OnNodesChange<Node<ArchitectureNodeData>>;
  onEdgesChange: OnEdgesChange<Edge<ArchitectureEdgeData>>;
  onConnect: OnConnect;
  onSelectionChange?: (params: OnSelectionChangeParams) => void;
  onPaneClick?: () => void;
  notification?: string | null;
  clearNotification?: () => void;
  resetDemo?: () => void;
  onResetDemo?: () => void;
}

export function ArchitectureCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onSelectionChange,
  onPaneClick,
  notification,
  clearNotification,
  resetDemo,
  onResetDemo,
}: ArchitectureCanvasProps) {
  const handleReset = onResetDemo ?? resetDemo;

  return (
    <div className={styles.canvasWrapper}>
      {/* ── Toast notification banner (non-blocking) ── */}
      {notification && (
        <div className={styles.toast} role="status" aria-live="assertive">
          <AlertCircle size={15} />
          <span>{notification}</span>
          <button
            type="button"
            className={styles.toastCloseBtn}
            onClick={clearNotification}
            aria-label="Dismiss notification"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Empty graph state overlay ── */}
      {nodes.length === 0 && (
        <div className={styles.emptyStateOverlay} role="region" aria-label="Empty diagram">
          <div className={styles.emptyStateCard}>
            <div className={styles.emptyIconWrapper}>
              <LayoutGrid size={24} />
            </div>
            <h2 className={styles.emptyTitle}>Architecture graph is empty</h2>
            <p className={styles.emptyDesc}>
              All components have been deleted. You can add components from the palette on the
              left, or restore the demo architecture.
            </p>
            <button
              id="empty-state-reset-btn"
              type="button"
              className={styles.emptyResetBtn}
              onClick={handleReset}
            >
              <RotateCcw size={14} />
              Reset demo
            </button>
          </div>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={(p: OnSelectionChangeParams) => onSelectionChange?.(p)}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        fitViewOptions={fitViewOptions}
        minZoom={0.2}
        maxZoom={2}
        colorMode="dark"
        className={styles.flow}
        aria-label="Architecture diagram canvas"
      >
        {/* Subtle dot-grid — low contrast against dark background */}
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="#2a2e3a"
        />

        {/* Controls: zoom in/out/reset + fit-view button */}
        <Controls showInteractive={false} className={styles.controls} />

        {/* MiniMap: shows node positions at a glance */}
        <MiniMap
          className={styles.minimap}
          nodeColor={minimapNodeColor}
          maskColor="rgba(13, 15, 20, 0.65)"
          style={{ background: '#13161e' }}
        />
      </ReactFlow>
    </div>
  );
}

// ── MiniMap colour helper ─────────────────────────────────────────────────────

function minimapNodeColor(node: { data?: { kind?: string } }): string {
  switch (node.data?.kind) {
    case 'gateway':  return '#3d7dd4';
    case 'service':  return '#2e9e66';
    case 'database': return '#7c53c8';
    case 'cache':    return '#c9962a';
    case 'queue':    return '#c96230';
    default:         return '#3a3f4b';
  }
}
