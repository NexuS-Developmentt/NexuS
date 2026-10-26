/**
 * TopBar — horizontal app bar with page title, active project, and Demo badge.
 */
import { useParams } from 'react-router-dom';
import { DemoBadge } from '../ui';
import { demoProjects } from '../../features/projects/data/demoProjects';
import styles from './TopBar.module.css';

interface TopBarProps {
  pageTitle: string;
}

export function TopBar({ pageTitle }: TopBarProps) {
  const { projectId } = useParams<{ projectId: string }>();

  const activeProject = projectId
    ? demoProjects.find((p) => p.id === projectId) ?? null
    : null;

  return (
    <header className={styles.topbar} role="banner">
      <div className={styles.left}>
        <span className={styles.title}>{pageTitle}</span>
        {activeProject && (
          <>
            <span className={styles.sep} aria-hidden="true">/</span>
            <span className={styles.projectName}>{activeProject.name}</span>
          </>
        )}
      </div>
      <div className={styles.right}>
        <DemoBadge />
      </div>
    </header>
  );
}
