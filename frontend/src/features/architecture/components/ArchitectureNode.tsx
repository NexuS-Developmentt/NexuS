/**
 * ArchitectureNode
 *
 * Custom React Flow node component handling all five ArchitectureNodeKind values.
 * - Kind is communicated by both an icon and a text label (never colour alone).
 * - Status (normal / warning / critical) is shown by a text badge + icon.
 * - Selected state is expressed with a crisp outline ring.
 * - One component handles all kinds; the `nodeTypes` map registered in
 *   ArchitectureCanvas maps the string key "architectureNode" to this component.
 */

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { Node } from '@xyflow/react';
import {
  Globe,
  Server,
  Database,
  Cpu,
  Inbox,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
} from 'lucide-react';

import type {
  ArchitectureNodeData,
  ArchitectureNodeKind,
} from '../types/architecture';

import styles from './ArchitectureNode.module.css';

// ── Kind metadata ─────────────────────────────────────────────────────────────

interface KindMeta {
  label: string;
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  className: string;
}

const KIND_META: Record<ArchitectureNodeKind, KindMeta> = {
  gateway:  { label: 'Gateway',  Icon: Globe,     className: styles.kindGateway  },
  service:  { label: 'Service',  Icon: Server,    className: styles.kindService  },
  database: { label: 'Database', Icon: Database,  className: styles.kindDatabase },
  cache:    { label: 'Cache',    Icon: Cpu,       className: styles.kindCache    },
  queue:    { label: 'Queue',    Icon: Inbox,     className: styles.kindQueue    },
};

// ── Status metadata ───────────────────────────────────────────────────────────

interface StatusMeta {
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  label: string;
  className: string;
}

const STATUS_META: Record<'normal' | 'warning' | 'critical', StatusMeta> = {
  normal:   { Icon: CheckCircle,   label: 'Normal',   className: styles.statusNormal   },
  warning:  { Icon: AlertTriangle, label: 'Warning',  className: styles.statusWarning  },
  critical: { Icon: AlertCircle,   label: 'Critical', className: styles.statusCritical },
};

// ── Component ─────────────────────────────────────────────────────────────────

type ArchitectureNodeProps = NodeProps<Node<ArchitectureNodeData>>;

function ArchitectureNodeInner({ data, selected }: ArchitectureNodeProps) {
  const { label, kind, replicas } = data;
  const effectiveStatus = data.simulationStatus ?? data.status ?? 'normal';

  const kindMeta   = KIND_META[kind]   ?? KIND_META.service;
  const statusMeta = STATUS_META[effectiveStatus] ?? STATUS_META.normal;

  const { Icon: KindIcon, label: kindLabel, className: kindClass } = kindMeta;
  const { Icon: StatusIcon, label: statusLabel, className: statusClass } = statusMeta;

  return (
    <div
      className={[
        styles.node,
        kindClass,
        selected ? styles.selected : '',
      ].join(' ')}
    >
      {/* Target handle — top centre */}
      <Handle
        type="target"
        position={Position.Top}
        className={styles.handle}
      />

      {/* ── Header row: kind icon + kind label ── */}
      <div className={styles.header}>
        <KindIcon size={14} strokeWidth={2} />
        <span className={styles.kindLabel}>{kindLabel}</span>

        {/* Status badge — always present, icon + text so never colour-only */}
        <span className={[styles.statusBadge, statusClass].join(' ')}>
          <StatusIcon size={11} strokeWidth={2.5} />
          {statusLabel}
        </span>
      </div>

      {/* ── Display label ── */}
      <div className={styles.label}>{label}</div>

      {/* ── Footer: replicas pill ── */}
      {replicas !== undefined && (
        <div className={styles.footer}>
          <span className={styles.replicaPill}>
            {replicas}×
          </span>
          <span className={styles.replicaText}>replica{replicas !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Source handle — bottom centre */}
      <Handle
        type="source"
        position={Position.Bottom}
        className={styles.handle}
      />
    </div>
  );
}

export const ArchitectureNode = memo(ArchitectureNodeInner);
