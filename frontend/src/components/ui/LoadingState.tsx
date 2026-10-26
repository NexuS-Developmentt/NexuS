/**
 * LoadingState — spinner with optional label shown during data loading.
 */
import styles from './LoadingState.module.css';

export interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = 'Loading…' }: LoadingStateProps) {
  return (
    <div className={styles.wrapper} role="status" aria-label={label}>
      <span className={styles.spinner} aria-hidden="true" />
      <span className={styles.label}>{label}</span>
    </div>
  );
}
