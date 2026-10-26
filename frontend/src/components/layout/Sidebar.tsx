/**
 * Sidebar — fixed left navigation panel.
 * - Expands (220 px) or collapses to icon-only (56 px)
 * - Resolves project-scoped links using :projectId param or demo fallback
 * - Marks the active link with aria-current="page"
 */
import { NavLink, useParams } from 'react-router-dom';
import {
  Activity,
  FileText,
  LayoutDashboard,
  Network,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { NAV_ITEMS, type NavItem } from '../../routes';
import { DEMO_PROJECT_ID } from '../../features/projects/data/demoProjects';
import { Tooltip } from '../ui';
import styles from './Sidebar.module.css';

const ICONS = {
  LayoutDashboard,
  Network,
  Activity,
  Sparkles,
  FileText,
} as const;

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

function resolveHref(item: NavItem, projectId: string): string {
  return typeof item.path === 'string' ? item.path : item.path(projectId);
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { projectId } = useParams<{ projectId: string }>();
  const activeProjectId = projectId ?? DEMO_PROJECT_ID;

  return (
    <aside
      className={[styles.sidebar, collapsed ? styles.collapsed : ''].filter(Boolean).join(' ')}
      aria-label="Main navigation"
    >
      {/* ── Brand ── */}
      <div className={styles.brand}>
        {!collapsed && (
          <span className={styles.brandName}>
            Nexu<span className={styles.brandAccent}>S</span>
          </span>
        )}
        {collapsed && <span className={styles.brandIcon}>N</span>}
      </div>

      {/* ── Navigation ── */}
      <nav className={styles.nav}>
        {NAV_ITEMS.map((item) => {
          const Icon = ICONS[item.iconName];
          const href = resolveHref(item, activeProjectId);

          const link = (
            <NavLink
              key={item.label}
              to={href}
              aria-label={item.label}
              className={({ isActive }) =>
                [styles.link, isActive ? styles.active : ''].filter(Boolean).join(' ')
              }
              aria-current={undefined /* set by NavLink via className isActive */}
              end={item.path === '/dashboard'}
            >
              <Icon size={16} strokeWidth={1.8} className={styles.linkIcon} />
              {!collapsed && <span className={styles.linkLabel}>{item.label}</span>}
            </NavLink>
          );

          return collapsed ? (
            <Tooltip key={item.label} content={item.label} position="right">
              {link}
            </Tooltip>
          ) : (
            link
          );
        })}
      </nav>

      {/* ── Collapse toggle ── */}
      <button
        className={styles.toggleBtn}
        onClick={onToggle}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        id="sidebar-toggle"
      >
        {collapsed ? (
          <ChevronRight size={14} strokeWidth={2} />
        ) : (
          <ChevronLeft size={14} strokeWidth={2} />
        )}
      </button>
    </aside>
  );
}
