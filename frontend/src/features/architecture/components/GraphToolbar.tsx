/**
 * GraphToolbar
 *
 * Toolbar for the Architecture Studio canvas.
 * Receives a ReactFlowInstance ref (via useReactFlow inside ArchitectureCanvas)
 * — callbacks are passed in as props so this component stays unaware of
 * React Flow internals.
 */

import styles from './GraphToolbar.module.css';
import { Maximize2, RotateCcw } from 'lucide-react';

interface GraphToolbarProps {
  onFitView: () => void;
  onReset: () => void;
}

export function GraphToolbar({ onFitView, onReset }: GraphToolbarProps) {
  return (
    <div className={styles.toolbar} role="toolbar" aria-label="Canvas controls">
      <button
        id="graph-toolbar-fit-view"
        className={styles.btn}
        onClick={onFitView}
        title="Fit all nodes into view"
        type="button"
      >
        <Maximize2 size={14} strokeWidth={2} />
        Fit view
      </button>

      <span className={styles.divider} aria-hidden="true" />

      <button
        id="graph-toolbar-reset-demo"
        className={[styles.btn, styles.btnReset].join(' ')}
        onClick={onReset}
        title="Restore the original demo graph"
        type="button"
      >
        <RotateCcw size={14} strokeWidth={2} />
        Reset demo
      </button>
    </div>
  );
}
