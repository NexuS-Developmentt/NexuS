/**
 * EmptyState — shown when a list or collection has no items.
 * Usage: <EmptyState title="No projects" description="…"><Button>New</Button></EmptyState>
 */
import type { ReactNode } from 'react';
import { FolderOpen } from 'lucide-react';
import styles from './EmptyState.module.css';

export interface EmptyStateProps {
  title: string;
  description?: string;
  children?: ReactNode;
}

export function EmptyState({ title, description, children }: EmptyStateProps) {
  return (
    <div className={styles.wrapper} role="status">
      <FolderOpen size={36} strokeWidth={1.5} className={styles.icon} />
      <p className={styles.title}>{title}</p>
      {description && <p className={styles.description}>{description}</p>}
      {children && <div className={styles.actions}>{children}</div>}
    </div>
  );
}
