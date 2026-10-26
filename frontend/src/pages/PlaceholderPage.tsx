/**
 * PlaceholderPage — used for routes that are reserved but not yet built.
 * Clearly communicates "Prototype — module in progress" with module name
 * and a back-to-dashboard action.
 */
import { useNavigate } from 'react-router-dom';
import { Construction, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui';
import { ROUTES } from '../routes';
import styles from './PlaceholderPage.module.css';

export interface PlaceholderPageProps {
  moduleName: string;
}

export function PlaceholderPage({ moduleName }: PlaceholderPageProps) {
  const nav = useNavigate();

  return (
    <div className={styles.page} role="main">
      <div className={styles.card}>
        <Construction size={36} strokeWidth={1.5} className={styles.icon} />
        <div className={styles.text}>
          <p className={styles.eyebrow}>Prototype — module in progress</p>
          <h1 className={styles.title}>{moduleName}</h1>
          <p className={styles.desc}>
            This module is part of NEXUS but is not yet implemented in Semester 1.
            It will be developed in a later phase.
          </p>
        </div>
        <Button
          id="placeholder-back-btn"
          variant="secondary"
          onClick={() => nav(ROUTES.dashboard)}
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </Button>
      </div>
    </div>
  );
}
