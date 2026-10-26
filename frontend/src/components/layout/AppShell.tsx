/**
 * AppShell — shared layout wrapping Sidebar + TopBar + page content.
 *
 * Props:
 *   pageTitle  - shown in the TopBar breadcrumb
 *   fullBleed  - when true: sidebar collapses to icon-only, TopBar hidden,
 *                content fills remaining viewport (for Architecture Studio)
 *
 * The shell renders <Outlet /> — React Router v7 layout route pattern.
 */
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import styles from './AppShell.module.css';

interface AppShellProps {
  pageTitle?: string;
  /** Full-bleed mode for the Architecture Studio canvas. */
  fullBleed?: boolean;
}

export function AppShell({ pageTitle = 'NEXUS', fullBleed = false }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(fullBleed);

  return (
    <div className={[styles.shell, fullBleed ? styles.fullBleed : ''].filter(Boolean).join(' ')}>
      <Sidebar collapsed={collapsed || fullBleed} onToggle={() => setCollapsed((c) => !c)} />

      <div className={styles.main}>
        {!fullBleed && <TopBar pageTitle={pageTitle} />}

        <main
          className={[styles.content, fullBleed ? styles.contentFullBleed : '']
            .filter(Boolean)
            .join(' ')}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
