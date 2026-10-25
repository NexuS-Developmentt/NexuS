/**
 * NodePalette
 *
 * Compact left-hand palette for adding nodes to the architecture diagram.
 * Provides quick actions to add gateway, service, database, cache, and queue nodes.
 * Takes minimal horizontal space so 1366x768 screens have plenty of canvas area.
 */

import { Globe, Server, Database, Cpu, Inbox } from 'lucide-react';
import type { ArchitectureNodeKind } from '../types/architecture';
import styles from './NodePalette.module.css';

interface NodePaletteProps {
  onAddNode: (kind: ArchitectureNodeKind) => void;
}

interface PaletteItem {
  kind: ArchitectureNodeKind;
  label: string;
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  className: string;
}

const PALETTE_ITEMS: PaletteItem[] = [
  { kind: 'gateway', label: 'Gateway', Icon: Globe, className: styles['btn-gateway'] },
  { kind: 'service', label: 'Service', Icon: Server, className: styles['btn-service'] },
  { kind: 'database', label: 'Database', Icon: Database, className: styles['btn-database'] },
  { kind: 'cache', label: 'Cache', Icon: Cpu, className: styles['btn-cache'] },
  { kind: 'queue', label: 'Queue', Icon: Inbox, className: styles['btn-queue'] },
];

export function NodePalette({ onAddNode }: NodePaletteProps) {
  return (
    <aside className={styles.palette} aria-label="Component palette">
      <div className={styles.header}>
        <span className={styles.title}>Palette</span>
      </div>

      <div className={styles.buttonList} role="toolbar" aria-label="Add architecture components">
        {PALETTE_ITEMS.map(({ kind, label, Icon, className }) => (
          <button
            key={kind}
            id={`node-palette-add-${kind}`}
            type="button"
            className={[styles.btn, className].join(' ')}
            onClick={() => onAddNode(kind)}
            title={`Add ${label} node to canvas`}
            aria-label={`Add ${label} node`}
          >
            <span className={styles.btnIcon}>
              <Icon size={18} strokeWidth={1.8} />
            </span>
            <span className={styles.btnLabel}>{label}</span>
            <span className={styles.addHint}>+ Add</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
