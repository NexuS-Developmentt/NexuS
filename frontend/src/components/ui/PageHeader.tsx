/**
 * PageHeader — page-level title row with optional actions slot.
 * Usage: <PageHeader title="Dashboard"><Button>New</Button></PageHeader>
 */
import type { ReactNode } from 'react';
import styles from './PageHeader.module.css';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}

export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.text}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      {children && <div className={styles.actions}>{children}</div>}
    </header>
  );
}
