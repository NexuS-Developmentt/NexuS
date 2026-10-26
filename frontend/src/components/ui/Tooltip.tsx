/**
 * Tooltip — simple CSS-driven tooltip on hover/focus.
 * Usage: <Tooltip content="Explains the thing"><button>?</button></Tooltip>
 */
import type { ReactNode } from 'react';
import styles from './Tooltip.module.css';

export interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function Tooltip({ content, children, position = 'top' }: TooltipProps) {
  return (
    <span className={styles.wrapper}>
      {children}
      <span
        role="tooltip"
        className={[styles.tooltip, styles[position]].join(' ')}
        aria-label={content}
      >
        {content}
      </span>
    </span>
  );
}
