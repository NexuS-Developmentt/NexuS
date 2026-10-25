/**
 * EmptySelectionPanel
 *
 * Shown in the right properties panel when nothing is selected on the canvas.
 * Provides a short, helpful prompt to guide the user.
 */

import { MousePointer2 } from 'lucide-react';
import styles from './EmptySelectionPanel.module.css';

export function EmptySelectionPanel() {
  return (
    <div className={styles.root} role="status" aria-live="polite">
      <MousePointer2 size={28} strokeWidth={1.5} className={styles.icon} />
      <p className={styles.heading}>Nothing selected</p>
      <p className={styles.hint}>
        Click a node or an edge on the canvas to inspect its properties here.
      </p>
    </div>
  );
}
