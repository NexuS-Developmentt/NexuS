/**
 * MetricCard — compact stat tile for dashboard.
 * Always labelled as sample data when `isSample` is true (default).
 * Usage: <MetricCard label="Projects" value="3" isSample />
 */
import styles from './MetricCard.module.css';

export interface MetricCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  /** If true, appends a "(sample)" indicator to make mock status clear. */
  isSample?: boolean;
}

export function MetricCard({ label, value, sublabel, isSample = true }: MetricCardProps) {
  return (
    <div className={styles.card}>
      <span className={styles.label}>
        {label}
        {isSample && <span className={styles.sampleTag}> · sample</span>}
      </span>
      <span className={styles.value}>{value}</span>
      {sublabel && <span className={styles.sublabel}>{sublabel}</span>}
    </div>
  );
}
