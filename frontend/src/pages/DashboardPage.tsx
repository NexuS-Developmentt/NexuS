/**
 * DashboardPage — "/dashboard"
 *
 * Sections:
 * 1. PageHeader with New Project + Open Demo actions
 * 2. MetricCards row (3 sample metrics)
 * 3. Project cards grid
 * 4. Recent simulations / activity list
 *
 * All data is clearly labelled as demo / sample.
 */
import { useNavigate } from 'react-router-dom';
import { Network, Activity, FileText, Sparkles } from 'lucide-react';
import { PageHeader, Button, Badge, MetricCard, EmptyState } from '../components/ui';
import {
  demoProjects,
  demoSimulations,
  DEMO_PROJECT_ID,
} from '../features/projects/data/demoProjects';
import type { ProjectSummary, SimulationSummary } from '../types/project';
import { ROUTES } from '../routes';
import styles from './DashboardPage.module.css';

// ── Toggle this to test EmptyState ───────────────────────────────────────────
const SHOW_PROJECTS = true;

export function DashboardPage() {
  const nav = useNavigate();
  const projects = SHOW_PROJECTS ? demoProjects : [];

  return (
    <div className={styles.page}>
      <PageHeader
        title="Dashboard"
        subtitle="Overview of your architecture projects — sample data"
      >
        <Button
          id="dashboard-open-demo-btn"
          variant="secondary"
          size="md"
          onClick={() => nav(ROUTES.architecture(DEMO_PROJECT_ID))}
        >
          Open Demo
        </Button>
        <Button
          id="dashboard-new-project-btn"
          variant="primary"
          size="md"
          onClick={() => nav(ROUTES.newProject)}
        >
          New Project
        </Button>
      </PageHeader>

      {/* ── Metrics ── */}
      <div className={styles.metrics}>
        <MetricCard label="Projects" value={demoProjects.length} sublabel="in workspace" />
        <MetricCard label="Demo simulations" value={demoSimulations.length} sublabel="all heuristic" />
        <MetricCard
          label="Services in demo"
          value={demoProjects.find((p) => p.id === DEMO_PROJECT_ID)?.serviceCount ?? 0}
          sublabel="E-Commerce Platform"
        />
      </div>

      {/* ── Projects ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Projects</h2>
        {projects.length === 0 ? (
          <EmptyState
            title="No projects yet"
            description="Create your first project or load the demo architecture to get started."
          >
            <Button
              id="empty-new-project-btn"
              variant="primary"
              onClick={() => nav(ROUTES.newProject)}
            >
              New Project
            </Button>
          </EmptyState>
        ) : (
          <div className={styles.projectGrid}>
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </section>

      {/* ── Recent activity ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Recent Simulations</h2>
        <div className={styles.activityList}>
          {demoSimulations.map((sim) => (
            <ActivityRow key={sim.id} sim={sim} />
          ))}
        </div>
      </section>
    </div>
  );
}

// ── Project card ─────────────────────────────────────────────────────────────

function ProjectCard({ project }: { project: ProjectSummary }) {
  const nav = useNavigate();
  const archRoute   = ROUTES.architecture(project.id);
  const simRoute    = ROUTES.simulation(project.id);
  const insightRoute = ROUTES.insights(project.id);
  const reportRoute = ROUTES.reports(project.id);

  return (
    <article
      className={styles.projectCard}
      onClick={() => nav(archRoute)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && nav(archRoute)}
      aria-label={`Open ${project.name}`}
    >
      <div className={styles.cardTop}>
        <div className={styles.cardMeta}>
          <span className={styles.cardName}>{project.name}</span>
          <Badge variant={project.status}>{project.status}</Badge>
        </div>
        <p className={styles.cardDesc}>{project.description}</p>
      </div>

      <div className={styles.cardStats}>
        <span className={styles.stat}>
          <Network size={13} strokeWidth={2} />
          {project.architectureType}
        </span>
        <span className={styles.stat}>{project.serviceCount} services</span>
        <span className={styles.statMuted}>Updated {project.updatedAtLabel}</span>
      </div>

      {/* Quick-link row */}
      <div
        className={styles.quickLinks}
        onClick={(e) => e.stopPropagation()}
        role="presentation"
      >
        <button
          className={styles.quickLink}
          onClick={() => nav(archRoute)}
          id={`ql-arch-${project.id}`}
          aria-label="Architecture Studio"
        >
          <Network size={12} />
          Architecture
        </button>
        <button
          className={styles.quickLink}
          onClick={() => nav(simRoute)}
          id={`ql-sim-${project.id}`}
          aria-label="Simulation"
        >
          <Activity size={12} />
          Simulation
        </button>
        <button
          className={styles.quickLink}
          onClick={() => nav(insightRoute)}
          id={`ql-insights-${project.id}`}
          aria-label="AI Insights"
        >
          <Sparkles size={12} />
          Insights
        </button>
        <button
          className={styles.quickLink}
          onClick={() => nav(reportRoute)}
          id={`ql-reports-${project.id}`}
          aria-label="Reports"
        >
          <FileText size={12} />
          Reports
        </button>
      </div>
    </article>
  );
}

// ── Recent activity row ───────────────────────────────────────────────────────

function ActivityRow({ sim }: { sim: SimulationSummary }) {
  const nav = useNavigate();

  return (
    <div
      className={styles.activityRow}
      onClick={() => nav(ROUTES.simulation(sim.projectId))}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && nav(ROUTES.simulation(sim.projectId))}
    >
      <div className={styles.activityLeft}>
        <Activity size={14} strokeWidth={1.8} className={styles.activityIcon} />
        <div>
          <span className={styles.activityLabel}>{sim.scenarioLabel}</span>
          <span className={styles.activityProject}>{sim.projectName}</span>
        </div>
      </div>
      <div className={styles.activityRight}>
        <Badge variant={sim.status}>{sim.status}</Badge>
        <Badge variant="demo">Demo</Badge>
        <span className={styles.activityTime}>{sim.createdAtLabel}</span>
      </div>
    </div>
  );
}
