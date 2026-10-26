/**
 * Badge / StatusBadge — small label for status, type, or category.
 * Variants: demo | draft | ready | completed | warning | error | default
 */
import type { HTMLAttributes } from 'react';
import styles from './Badge.module.css';

export type BadgeVariant =
  | 'demo'
  | 'draft'
  | 'ready'
  | 'completed'
  | 'warning'
  | 'error'
  | 'default';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

export function Badge({ variant = 'default', children, className, ...rest }: BadgeProps) {
  return (
    <span
      {...rest}
      className={[styles.badge, styles[variant], className ?? ''].filter(Boolean).join(' ')}
    >
      {children}
    </span>
  );
}

/** Convenience alias — shows "(Demo)" label. */
export function DemoBadge() {
  return <Badge variant="demo">Demo data</Badge>;
}
