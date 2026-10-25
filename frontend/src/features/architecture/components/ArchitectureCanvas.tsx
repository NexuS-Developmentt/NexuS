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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { ArchitectureNode } from './ArchitectureNode';
import type { UseArchitectureGraphReturn } from '../hooks/useArchitectureGraph';
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
  labelStyle: {
    fill: '#8a94a6',
    fontSize: 10,
    fontFamily: 'inherit',
  },
  labelBgStyle: {
    fill: '#1a1d24',
    fillOpacity: 0.85,
  },
  labelBgPadding: [4, 6] as [number, number],
  labelBgBorderRadius: 4,
} as const;

const fitViewOptions: FitViewOptions = { padding: 0.15, duration: 400 };

// ── Component ─────────────────────────────────────────────────────────────────

interface ArchitectureCanvasProps
  extends Omit<UseArchitectureGraphReturn, 'resetDemo'> {}

/**
 * Inner canvas — must be rendered inside a ReactFlowProvider so that
 * useReactFlow() has access to the store. ArchitectureStudioPage wraps this
 * in ReactFlowProvider.
 *
 * fitView is owned by the parent (InnerPage) via its own useReactFlow() call
 * and passed down as onFitView — the canvas itself does not need to call it.
 */
export function ArchitectureCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
}: ArchitectureCanvasProps) {
  return (
    <div className={styles.canvasWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        fitViewOptions={fitViewOptions}
        minZoom={0.2}
        maxZoom={2}
        colorMode="dark"
        className={styles.flow}
        /* Accessibility */
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
