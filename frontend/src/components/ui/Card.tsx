/**
 * Card — surface container for grouped content.
 * Usage: <Card padding="lg"><…/></Card>
 */
import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Card.module.css';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: ReactNode;
}

export function Card({ padding = 'md', children, className, ...rest }: CardProps) {
  return (
    <div
      {...rest}
      className={[styles.card, styles[`pad-${padding}`], className ?? ''].filter(Boolean).join(' ')}
    >
      {children}
    </div>
  );
}
