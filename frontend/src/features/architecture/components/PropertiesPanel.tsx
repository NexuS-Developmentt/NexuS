/**
 * PropertiesPanel
 *
 * Right-hand properties panel for the Architecture Studio.
 * Allows editing selected node or edge attributes, or deleting them.
 *
 * Rules:
 *  - Node fields: name (required, trimmed), replicas (1-50), cpuCores (0-64),
 *    memoryMb (128-65536), description (optional), status (normal/warning/critical).
 *  - Kind is read-only after node creation.
 *  - Inline validation messages: invalid values are not committed to graph state.
 *  - Valid edits update the node/edge on the canvas immediately.
 *  - Delete node: warns if connected edges exist, removes edges, and clears selection.
 *  - Delete edge: removes edge and clears selection.
 */

import { useState } from 'react';
import type { Node, Edge } from '@xyflow/react';
import { Trash2 } from 'lucide-react';

import type {
  ArchitectureNodeData,
  ArchitectureEdgeData,
  ArchitectureEdgeKind,
} from '../types/architecture';
import { EmptySelectionPanel } from './EmptySelectionPanel';
import {
  validateNodeName,
  validateReplicas,
  validateCpuCores,
  validateMemoryMb,
  validateStatus,
} from '../utils/graphValidation';
import styles from './PropertiesPanel.module.css';

// ─────────────────────────────────────────────────────────────────────────────
// Node Properties Form
// ─────────────────────────────────────────────────────────────────────────────

interface NodePropertiesProps {
  node: Node<ArchitectureNodeData>;
  onUpdateNode: (nodeId: string, partial: Partial<ArchitectureNodeData>) => void;
  onDeleteNode: (nodeId: string) => void;
}

function NodeProperties({ node, onUpdateNode, onDeleteNode }: NodePropertiesProps) {
  const { data } = node;
  const prefix = `prop-node-${node.id}`;

  // Local form state
  const [name, setName] = useState(data.label);
  const [replicas, setReplicas] = useState(String(data.replicas ?? ''));
  const [cpuCores, setCpuCores] = useState(String(data.cpuCores ?? ''));
  const [memoryMb, setMemoryMb] = useState(String(data.memoryMb ?? ''));
  const [description, setDescription] = useState(data.description ?? '');
  const [status, setStatus] = useState<ArchitectureNodeData['status']>(data.status ?? 'normal');

  // Inline errors state
  const [errors, setErrors] = useState<{
    name?: string;
    replicas?: string;
    cpuCores?: string;
    memoryMb?: string;
    status?: string;
  }>({});


  // ── Field Change Handlers ───────────────────────────────────────────────────

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    const err = validateNodeName(val);
    setErrors((prev) => ({ ...prev, name: err ?? undefined }));
    if (!err) {
      onUpdateNode(node.id, { label: val.trim() });
    }
  };

  const handleReplicasChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setReplicas(val);
    const err = validateReplicas(val);
    setErrors((prev) => ({ ...prev, replicas: err ?? undefined }));
    if (!err) {
      onUpdateNode(node.id, { replicas: parseInt(val, 10) });
    }
  };

  const handleCpuChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCpuCores(val);
    const err = validateCpuCores(val);
    setErrors((prev) => ({ ...prev, cpuCores: err ?? undefined }));
    if (!err) {
      onUpdateNode(node.id, { cpuCores: parseFloat(val) });
    }
  };

  const handleMemoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setMemoryMb(val);
    const err = validateMemoryMb(val);
    setErrors((prev) => ({ ...prev, memoryMb: err ?? undefined }));
    if (!err) {
      onUpdateNode(node.id, { memoryMb: parseInt(val, 10) });
    }
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setDescription(val);
    onUpdateNode(node.id, { description: val });
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as 'normal' | 'warning' | 'critical';
    setStatus(val);
    const err = validateStatus(val);
    setErrors((prev) => ({ ...prev, status: err ?? undefined }));
    if (!err) {
      onUpdateNode(node.id, { status: val });
    }
  };

  const handleDelete = () => {
    onDeleteNode(node.id);
  };

  return (
    <section className={styles.section} aria-label="Node properties">
      <header className={styles.sectionHeader}>
        <span className={[styles.kindChip, styles[`kind-${data.kind}`]].join(' ')}>
          {data.kind}
        </span>
        <span className={styles.sectionTitle}>{data.label}</span>
      </header>

      <form className={styles.fields} onSubmit={(e) => e.preventDefault()}>
        {/* Name (required, trimmed) */}
        <div className={styles.fieldGroup}>
          <label htmlFor={`${prefix}-name`} className={styles.fieldLabel}>
            Name *
          </label>
          <input
            id={`${prefix}-name`}
            type="text"
            className={[styles.input, errors.name ? styles.inputError : ''].join(' ')}
            value={name}
            onChange={handleNameChange}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? `${prefix}-name-error` : undefined}
          />
          {errors.name && (
            <span id={`${prefix}-name-error`} className={styles.errorMessage} role="alert">
              {errors.name}
            </span>
          )}
        </div>

        {/* Kind (read-only) */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>
            Kind
            <span className={styles.readOnlyBadge}>Read-only</span>
          </label>
          <div className={styles.readOnlyDisplay}>{data.kind}</div>
        </div>

        {/* Status */}
        <div className={styles.fieldGroup}>
          <label htmlFor={`${prefix}-status`} className={styles.fieldLabel}>
            Status
          </label>
          <select
            id={`${prefix}-status`}
            className={[styles.select, errors.status ? styles.inputError : ''].join(' ')}
            value={status}
            onChange={handleStatusChange}
          >
            <option value="normal">Normal</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
          </select>
          {errors.status && (
            <span className={styles.errorMessage} role="alert">
              {errors.status}
            </span>
          )}
        </div>

        {/* Replicas (integer 1 to 50) */}
        <div className={styles.fieldGroup}>
          <label htmlFor={`${prefix}-replicas`} className={styles.fieldLabel}>
            Replicas (1–50)
          </label>
          <input
            id={`${prefix}-replicas`}
            type="number"
            min={1}
            max={50}
            step={1}
            className={[styles.input, errors.replicas ? styles.inputError : ''].join(' ')}
            value={replicas}
            onChange={handleReplicasChange}
            aria-invalid={Boolean(errors.replicas)}
            aria-describedby={errors.replicas ? `${prefix}-replicas-error` : undefined}
          />
          {errors.replicas && (
            <span id={`${prefix}-replicas-error`} className={styles.errorMessage} role="alert">
              {errors.replicas}
            </span>
          )}
        </div>

        {/* CPU cores (number above 0, max 64) */}
        <div className={styles.fieldGroup}>
          <label htmlFor={`${prefix}-cpu`} className={styles.fieldLabel}>
            CPU cores (&gt; 0, max 64)
          </label>
          <input
            id={`${prefix}-cpu`}
            type="number"
            min={0.1}
            max={64}
            step={0.5}
            className={[styles.input, errors.cpuCores ? styles.inputError : ''].join(' ')}
            value={cpuCores}
            onChange={handleCpuChange}
            aria-invalid={Boolean(errors.cpuCores)}
            aria-describedby={errors.cpuCores ? `${prefix}-cpu-error` : undefined}
          />
          {errors.cpuCores && (
            <span id={`${prefix}-cpu-error`} className={styles.errorMessage} role="alert">
              {errors.cpuCores}
            </span>
          )}
        </div>

        {/* Memory MB (integer 128 to 65536) */}
        <div className={styles.fieldGroup}>
          <label htmlFor={`${prefix}-memory`} className={styles.fieldLabel}>
            Memory MB (128–65,536)
          </label>
          <input
            id={`${prefix}-memory`}
            type="number"
            min={128}
            max={65536}
            step={128}
            className={[styles.input, errors.memoryMb ? styles.inputError : ''].join(' ')}
            value={memoryMb}
            onChange={handleMemoryChange}
            aria-invalid={Boolean(errors.memoryMb)}
            aria-describedby={errors.memoryMb ? `${prefix}-memory-error` : undefined}
          />
          {errors.memoryMb && (
            <span id={`${prefix}-memory-error`} className={styles.errorMessage} role="alert">
              {errors.memoryMb}
            </span>
          )}
        </div>

        {/* Description */}
        <div className={styles.fieldGroup}>
          <label htmlFor={`${prefix}-description`} className={styles.fieldLabel}>
            Description
          </label>
          <textarea
            id={`${prefix}-description`}
            rows={3}
            className={styles.textarea}
            value={description}
            onChange={handleDescriptionChange}
            placeholder="Describe the role and responsibilities of this component..."
          />
        </div>

        {/* Delete node button */}
        <div className={styles.actions}>
          <button
            id="properties-panel-delete-node"
            type="button"
            className={styles.deleteButton}
            onClick={handleDelete}
          >
            <Trash2 size={14} />
            Delete node
          </button>
          <span className={styles.deleteHint}>or press Delete key</span>
        </div>
      </form>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Edge Properties Form
// ─────────────────────────────────────────────────────────────────────────────

interface EdgePropertiesProps {
  edge: Edge<ArchitectureEdgeData>;
  nodes: Node<ArchitectureNodeData>[];
  onUpdateEdge: (edgeId: string, partial: Partial<ArchitectureEdgeData>, newLabel?: string) => void;
  onDeleteEdge: (edgeId: string) => void;
}

function EdgeProperties({ edge, nodes, onUpdateEdge, onDeleteEdge }: EdgePropertiesProps) {
  const prefix = `prop-edge-${edge.id}`;
  const sourceNode = nodes.find((n) => n.id === edge.source);
  const targetNode = nodes.find((n) => n.id === edge.target);

  const initialLabel = typeof edge.label === 'string' ? edge.label : (edge.data?.label ?? '');
  const [label, setLabel] = useState(initialLabel);
  const [kind, setKind] = useState<ArchitectureEdgeKind>(edge.data?.kind ?? 'http');


  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLabel(val);
    onUpdateEdge(edge.id, { label: val }, val);
  };

  const handleKindChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as ArchitectureEdgeKind;
    setKind(val);
    onUpdateEdge(edge.id, { kind: val });
  };

  return (
    <section className={styles.section} aria-label="Edge properties">
      <header className={styles.sectionHeader}>
        <span className={[styles.kindChip, styles[`edge-kind-${kind}`]].join(' ')}>
          {kind}
        </span>
        <span className={styles.sectionTitle}>{label || 'Connection'}</span>
      </header>

      <form className={styles.fields} onSubmit={(e) => e.preventDefault()}>
        {/* Label */}
        <div className={styles.fieldGroup}>
          <label htmlFor={`${prefix}-label`} className={styles.fieldLabel}>
            Label
          </label>
          <input
            id={`${prefix}-label`}
            type="text"
            className={styles.input}
            value={label}
            onChange={handleLabelChange}
            placeholder="e.g. Route orders, Persist data"
          />
        </div>

        {/* Kind */}
        <div className={styles.fieldGroup}>
          <label htmlFor={`${prefix}-kind`} className={styles.fieldLabel}>
            Kind / Protocol
          </label>
          <select
            id={`${prefix}-kind`}
            className={styles.select}
            value={kind}
            onChange={handleKindChange}
          >
            <option value="http">HTTP</option>
            <option value="database">Database</option>
            <option value="cache">Cache</option>
            <option value="event">Event</option>
            <option value="dependency">Dependency</option>
          </select>
        </div>

        {/* Source Node */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>
            Source node
            <span className={styles.readOnlyBadge}>Read-only</span>
          </label>
          <div className={styles.readOnlyDisplay}>
            {sourceNode?.data.label ?? edge.source}
          </div>
        </div>

        {/* Target Node */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>
            Target node
            <span className={styles.readOnlyBadge}>Read-only</span>
          </label>
          <div className={styles.readOnlyDisplay}>
            {targetNode?.data.label ?? edge.target}
          </div>
        </div>

        {/* Delete Edge button */}
        <div className={styles.actions}>
          <button
            id="properties-panel-delete-edge"
            type="button"
            className={styles.deleteButton}
            onClick={() => onDeleteEdge(edge.id)}
          >
            <Trash2 size={14} />
            Delete connection
          </button>
          <span className={styles.deleteHint}>or press Delete key</span>
        </div>
      </form>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Public Component
// ─────────────────────────────────────────────────────────────────────────────

export interface PropertiesPanelProps {
  nodes: Node<ArchitectureNodeData>[];
  edges: Edge<ArchitectureEdgeData>[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  onUpdateNode: (nodeId: string, partial: Partial<ArchitectureNodeData>) => void;
  onDeleteNode: (nodeId: string) => void;
  onUpdateEdge: (edgeId: string, partial: Partial<ArchitectureEdgeData>, newLabel?: string) => void;
  onDeleteEdge: (edgeId: string) => void;
}

export function PropertiesPanel({
  nodes,
  edges,
  selectedNodeId,
  selectedEdgeId,
  onUpdateNode,
  onDeleteNode,
  onUpdateEdge,
  onDeleteEdge,
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
          <NodeProperties
            key={selectedNode.id}
            node={selectedNode}
            onUpdateNode={onUpdateNode}
            onDeleteNode={onDeleteNode}
          />
        ) : selectedEdge ? (
          <EdgeProperties
            key={selectedEdge.id}
            edge={selectedEdge}
            nodes={nodes}
            onUpdateEdge={onUpdateEdge}
            onDeleteEdge={onDeleteEdge}
          />
        ) : (
          <EmptySelectionPanel />
        )}
      </div>
    </aside>
  );
}
