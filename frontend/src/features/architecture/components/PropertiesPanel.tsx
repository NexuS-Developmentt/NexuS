/**
 * PropertiesPanel
 *
 * Right-hand properties panel for the Architecture Studio.
 *
 * Branches on what is selected:
 *  - Nothing selected    → EmptySelectionPanel
 *  - Node selected       → NodeProperties (read-only fields)
 *  - Edge selected       → EdgeProperties (read-only fields)
 *
 * All fields have accessible <label> elements associated via htmlFor/id.
 * The panel scrolls independently of the canvas.
 */

import type { Node, Edge } from '@xyflow/react';
import type { ArchitectureNodeData, ArchitectureEdgeData } from '../types/architecture';
import { EmptySelectionPanel } from './EmptySelectionPanel';
import styles from './PropertiesPanel.module.css';

// ─────────────────────────────────────────────────────────────────────────────
// Helper: read-only field row
// ─────────────────────────────────────────────────────────────────────────────

interface FieldProps {
  id: string;
  label: string;
  value: string | number | undefined | null;
  mono?: boolean;
}

function Field({ id, label, value, mono }: FieldProps) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.fieldLabel}>
        {label}
      </label>
      <span
        id={id}
        className={[styles.fieldValue, mono ? styles.mono : ''].join(' ')}
      >
        {String(value)}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Node properties view
// ─────────────────────────────────────────────────────────────────────────────

interface NodePropertiesProps {
  node: Node<ArchitectureNodeData>;
}

function NodeProperties({ node }: NodePropertiesProps) {
  const { data } = node;
  const prefix = `prop-node-${node.id}`;

  return (
    <section className={styles.section} aria-label="Node properties">
      <header className={styles.sectionHeader}>
        <span className={[styles.kindChip, styles[`kind-${data.kind}`]].join(' ')}>
          {data.kind}
        </span>
        <span className={styles.sectionTitle}>{data.label}</span>
      </header>

      <div className={styles.fields}>
        <Field id={`${prefix}-name`}        label="Name"        value={data.label} />
        <Field id={`${prefix}-kind`}        label="Kind"        value={data.kind} />
        <Field id={`${prefix}-status`}      label="Status"      value={data.status ?? 'normal'} />
        <Field id={`${prefix}-replicas`}    label="Replicas"    value={data.replicas} />
        <Field id={`${prefix}-cpu`}         label="CPU cores"   value={data.cpuCores !== undefined ? `${data.cpuCores} core${data.cpuCores !== 1 ? 's' : ''}` : undefined} />
        <Field id={`${prefix}-memory`}      label="Memory"      value={data.memoryMb !== undefined ? `${data.memoryMb} MB` : undefined} />
        <Field id={`${prefix}-description`} label="Description" value={data.description} />
      </div>

      <p className={styles.readOnlyNote}>Read-only — editing coming soon</p>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Edge properties view
// ─────────────────────────────────────────────────────────────────────────────

interface EdgePropertiesProps {
  edge: Edge<ArchitectureEdgeData>;
  nodes: Node<ArchitectureNodeData>[];
}

function EdgeProperties({ edge, nodes }: EdgePropertiesProps) {
  const prefix = `prop-edge-${edge.id}`;
  const sourceNode = nodes.find((n) => n.id === edge.source);
  const targetNode = nodes.find((n) => n.id === edge.target);
  const edgeLabel  = typeof edge.label === 'string' ? edge.label : (edge.data?.label ?? '');

  return (
    <section className={styles.section} aria-label="Edge properties">
      <header className={styles.sectionHeader}>
        {edge.data?.kind && (
          <span className={[styles.kindChip, styles[`edge-kind-${edge.data.kind}`]].join(' ')}>
            {edge.data.kind}
          </span>
        )}
        <span className={styles.sectionTitle}>{edgeLabel || 'Edge'}</span>
      </header>

      <div className={styles.fields}>
        <Field id={`${prefix}-label`}  label="Label"       value={edgeLabel} />
        <Field id={`${prefix}-kind`}   label="Kind"        value={edge.data?.kind} />
        <Field id={`${prefix}-source`} label="Source node" value={sourceNode?.data.label ?? edge.source} />
        <Field id={`${prefix}-target`} label="Target node" value={targetNode?.data.label ?? edge.target} />
      </div>

      <p className={styles.readOnlyNote}>Read-only — editing coming soon</p>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Public component
// ─────────────────────────────────────────────────────────────────────────────

interface PropertiesPanelProps {
  nodes: Node<ArchitectureNodeData>[];
  edges: Edge<ArchitectureEdgeData>[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
}

export function PropertiesPanel({
  nodes,
  edges,
  selectedNodeId,
  selectedEdgeId,
}: PropertiesPanelProps) {
  const selectedNode = selectedNodeId
    ? nodes.find((n) => n.id === selectedNodeId) ?? null
    : null;

  const selectedEdge = selectedEdgeId
    ? edges.find((e) => e.id === selectedEdgeId) ?? null
    : null;

  return (
    <aside className={styles.panel} aria-label="Properties panel">
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>Properties</span>
      </div>

      <div className={styles.panelBody}>
        {selectedNode ? (
          <NodeProperties node={selectedNode} />
        ) : selectedEdge ? (
          <EdgeProperties edge={selectedEdge} nodes={nodes} />
        ) : (
          <EmptySelectionPanel />
        )}
      </div>
    </aside>
  );
}
