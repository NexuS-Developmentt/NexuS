/**
 * LandingPage — "/" — outside the AppShell.
 * Professional hero with inline SVG motif + two CTAs.
 */
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui';
import { DEMO_ARCHITECTURE_ROUTE, ROUTES } from '../routes';
import styles from './LandingPage.module.css';

export function LandingPage() {
  const nav = useNavigate();

  return (
    <div className={styles.page}>
      {/* ── Nav strip ── */}
      <header className={styles.nav}>
        <span className={styles.logo}>
          Nexu<span className={styles.logoAccent}>S</span>
        </span>
        <span className={styles.protoLabel}>Semester 1 Prototype</span>
      </header>

      {/* ── Hero ── */}
      <main className={styles.hero}>
        <div className={styles.heroText}>
          <h1 className={styles.headline}>
            Visualize your architecture.{' '}
            <span className={styles.headlineAccent}>Explore changes before you make them.</span>
          </h1>
          <p className={styles.sub}>
            NEXUS lets engineering teams model distributed systems, simulate failure and scaling
            scenarios with heuristic estimates, and share architectural context — all in the browser,
            before a single line changes in production.
          </p>

          <div className={styles.ctas}>
            <Button
              id="landing-launch-btn"
              variant="primary"
              size="lg"
              onClick={() => nav(ROUTES.dashboard)}
            >
              Launch Workspace
            </Button>
            <Button
              id="landing-demo-btn"
              variant="secondary"
              size="lg"
              onClick={() => nav(DEMO_ARCHITECTURE_ROUTE)}
            >
              Explore Demo
            </Button>
          </div>

          {/* ── Feature pills ── */}
          <div className={styles.features}>
            {FEATURES.map((f) => (
              <div key={f.title} className={styles.featureItem}>
                <span className={styles.featureIcon}>{f.icon}</span>
                <div>
                  <p className={styles.featureTitle}>{f.title}</p>
                  <p className={styles.featureDesc}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── SVG architecture motif ── */}
        <div className={styles.svgWrap} aria-hidden="true">
          <ArchMotif />
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className={styles.footer}>
        Semester 1 prototype — sample data only, no backend connection
      </footer>
    </div>
  );
}

const FEATURES = [
  {
    icon: '⬡',
    title: 'Architecture Visualization',
    desc: 'Interactive graph canvas for microservice topologies.',
  },
  {
    icon: '⚡',
    title: 'What-if Simulation',
    desc: 'Heuristic estimates for latency, CPU and throughput under different scenarios.',
  },
  {
    icon: '✦',
    title: 'AI-Assisted Explanations',
    desc: 'Readable summaries and actionable recommendations (planned feature).',
  },
];

/** Inline SVG architecture diagram motif — no external assets. */
function ArchMotif() {
  return (
    <svg
      viewBox="0 0 420 340"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={styles.svg}
      role="img"
      aria-label="Abstract architecture diagram"
    >
      {/* Edges */}
      <line x1="210" y1="60"  x2="100" y2="140" stroke="#2a2f45" strokeWidth="1.5" />
      <line x1="210" y1="60"  x2="320" y2="140" stroke="#2a2f45" strokeWidth="1.5" />
      <line x1="100" y1="140" x2="60"  y2="230" stroke="#2a2f45" strokeWidth="1.5" />
      <line x1="100" y1="140" x2="160" y2="230" stroke="#2a2f45" strokeWidth="1.5" />
      <line x1="320" y1="140" x2="260" y2="230" stroke="#2a2f45" strokeWidth="1.5" />
      <line x1="320" y1="140" x2="360" y2="230" stroke="#2a2f45" strokeWidth="1.5" />
      <line x1="160" y1="230" x2="260" y2="230" stroke="#2a2f45" strokeWidth="1" strokeDasharray="4 3" />

      {/* Accent edges */}
      <line x1="210" y1="60"  x2="100" y2="140" stroke="#6366f1" strokeWidth="1.5" opacity="0.45" />
      <line x1="100" y1="140" x2="160" y2="230" stroke="#6366f1" strokeWidth="1.5" opacity="0.35" />

      {/* Nodes — gateway */}
      <rect x="180" y="38" width="60" height="44" rx="6" fill="#1c2030" stroke="#6366f1" strokeWidth="1.5" />
      <text x="210" y="58" textAnchor="middle" fill="#818cf8" fontSize="9" fontWeight="600">API</text>
      <text x="210" y="71" textAnchor="middle" fill="#818cf8" fontSize="9" fontWeight="600">Gateway</text>

      {/* Nodes — services */}
      <rect x="70"  y="118" width="60" height="44" rx="6" fill="#1c2030" stroke="#1e2130" strokeWidth="1.5" />
      <text x="100" y="138" textAnchor="middle" fill="#8b919f" fontSize="9" fontWeight="600">Order</text>
      <text x="100" y="151" textAnchor="middle" fill="#8b919f" fontSize="9" fontWeight="600">Service</text>

      <rect x="290" y="118" width="60" height="44" rx="6" fill="#1c2030" stroke="#1e2130" strokeWidth="1.5" />
      <text x="320" y="138" textAnchor="middle" fill="#8b919f" fontSize="9" fontWeight="600">Inventory</text>
      <text x="320" y="151" textAnchor="middle" fill="#8b919f" fontSize="9" fontWeight="600">Service</text>

      {/* Nodes — databases / cache */}
      <rect x="30"  y="210" width="60" height="40" rx="6" fill="#12151f" stroke="#1e2130" strokeWidth="1.5" />
      <text x="60"  y="230" textAnchor="middle" fill="#5a6070" fontSize="8" fontWeight="600">Orders DB</text>
      <text x="60"  y="242" textAnchor="middle" fill="#5a6070" fontSize="8">postgres</text>

      <rect x="130" y="210" width="60" height="40" rx="6" fill="#12151f" stroke="#c9962a" strokeWidth="1" strokeOpacity="0.5" />
      <text x="160" y="230" textAnchor="middle" fill="#c9962a" fontSize="8" fontWeight="600">Redis</text>
      <text x="160" y="242" textAnchor="middle" fill="#c9962a" fontSize="8">cache</text>

      <rect x="230" y="210" width="60" height="40" rx="6" fill="#12151f" stroke="#1e2130" strokeWidth="1.5" />
      <text x="260" y="230" textAnchor="middle" fill="#5a6070" fontSize="8" fontWeight="600">Product DB</text>
      <text x="260" y="242" textAnchor="middle" fill="#5a6070" fontSize="8">postgres</text>

      <rect x="330" y="210" width="60" height="40" rx="6" fill="#12151f" stroke="#1e2130" strokeWidth="1.5" />
      <text x="360" y="230" textAnchor="middle" fill="#5a6070" fontSize="8" fontWeight="600">Event</text>
      <text x="360" y="242" textAnchor="middle" fill="#5a6070" fontSize="8">Queue</text>

      {/* Pulse dot on gateway */}
      <circle cx="210" cy="60" r="4" fill="#6366f1" opacity="0.8">
        <animate attributeName="r" values="4;7;4" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.8;0.2;0.8" dur="2s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}
