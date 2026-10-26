/**
 * Dialog — accessible modal with focus trap and Esc-to-close.
 * Usage:
 *   <Dialog open={isOpen} onClose={() => setOpen(false)} title="My dialog">
 *     <p>Content</p>
 *   </Dialog>
 */
import { useEffect, useRef, type ReactNode } from 'react';
import styles from './Dialog.module.css';
import { Button } from './Button';
import { X } from 'lucide-react';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Footer slot for action buttons. */
  footer?: ReactNode;
}

export function Dialog({ open, onClose, title, children, footer }: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Trap focus inside dialog when open
  useEffect(() => {
    if (!open) return;
    const el = dialogRef.current;
    if (!el) return;

    const focusable = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    first?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab') return;
      if (focusable.length === 0) { e.preventDefault(); return; }
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className={styles.dialog}
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.header}>
          <h2 id="dialog-title" className={styles.title}>
            {title}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close dialog"
            id="dialog-close-btn"
          >
            <X size={16} />
          </Button>
        </header>

        <div className={styles.body}>{children}</div>

        {footer && <footer className={styles.footer}>{footer}</footer>}
      </div>
    </div>
  );
}
