/**
 * GraphToolbar
 *
 * Toolbar for the Architecture Studio canvas.
 * Receives a ReactFlowInstance ref (via useReactFlow inside ArchitectureCanvas)
 * — callbacks are passed in as props so this component stays unaware of
 * React Flow internals.
 */

import { useRef } from 'react';
import styles from './GraphToolbar.module.css';
import { Maximize2, RotateCcw, Download, Upload } from 'lucide-react';

interface GraphToolbarProps {
  onFitView: () => void;
  onReset: () => void;
  onExport: () => void;
  onImportFile: (file: File) => void;
}

export function GraphToolbar({ onFitView, onReset, onExport, onImportFile }: GraphToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportFile(file);
    }
  };

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
        id="graph-toolbar-export-json"
        className={styles.btn}
        onClick={onExport}
        title="Export architecture diagram as nexus-architecture.json"
        type="button"
      >
        <Download size={14} strokeWidth={2} />
        Export JSON
      </button>

      <button
        id="graph-toolbar-import-json"
        className={styles.btn}
        onClick={handleImportClick}
        title="Import architecture diagram from a JSON file"
        type="button"
      >
        <Upload size={14} strokeWidth={2} />
        Import JSON
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
        aria-hidden="true"
        tabIndex={-1}
      />

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
