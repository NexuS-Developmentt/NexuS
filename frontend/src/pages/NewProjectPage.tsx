/**
 * NewProjectPage — "/projects/new"
 *
 * Options:
 * 1. Load Demo  → demo project's architecture route (instant)
 * 2. GitHub URL → validate format; on valid submit show mock-analysis step,
 *                 then redirect to demo project (no real API call ever made)
 * 3. Upload file → disabled, labelled "Planned"
 *
 * No passwords, tokens, or real GitHub connections. Ever.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GitBranch, Upload, FolderOpen, ArrowLeft, Info } from 'lucide-react';
import { PageHeader, Button, Input, Card } from '../components/ui';
import { ROUTES, DEMO_ARCHITECTURE_ROUTE } from '../routes';
import styles from './NewProjectPage.module.css';

const GITHUB_URL_RE = /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/;

type Step = 'choose' | 'github' | 'analyzing' | 'done';

export function NewProjectPage() {
  const nav = useNavigate();
  const [step, setStep] = useState<Step>('choose');
  const [repoUrl, setRepoUrl] = useState('');
  const [urlError, setUrlError] = useState('');

  // ── GitHub URL submit ────────────────────────────────────────────────────────
  function handleGithubSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = repoUrl.trim();
    if (!GITHUB_URL_RE.test(trimmed)) {
      setUrlError(
        'Please enter a valid public GitHub URL, e.g. https://github.com/owner/repo',
      );
      return;
    }
    setUrlError('');
    setStep('analyzing');

    // Simulate a brief "analysis" delay, then navigate to demo project
    setTimeout(() => {
      setStep('done');
      setTimeout(() => nav(DEMO_ARCHITECTURE_ROUTE), 1200);
    }, 2200);
  }

  // ── Mock-analysis step UI ────────────────────────────────────────────────────
  if (step === 'analyzing' || step === 'done') {
    return (
      <div className={styles.page}>
        <div className={styles.analysisCard}>
          <div className={styles.analysisIcon}>
            {step === 'done' ? '✓' : <span className={styles.spinner} aria-hidden />}
          </div>
          <div className={styles.analysisText}>
            <p className={styles.analysisTitle}>
              {step === 'done' ? 'Opening sample project…' : 'Analysing repository…'}
            </p>
            <p className={styles.analysisNote}>
              <Info size={12} />
              <span>
                <strong>Prototype:</strong> Repository analysis is planned for a later
                phase. Opening a sample project to demonstrate the architecture view.
              </span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── GitHub URL form ──────────────────────────────────────────────────────────
  if (step === 'github') {
    return (
      <div className={styles.page}>
        <PageHeader title="Import from GitHub">
          <Button
            id="github-back-btn"
            variant="ghost"
            size="sm"
            onClick={() => { setStep('choose'); setRepoUrl(''); setUrlError(''); }}
          >
            <ArrowLeft size={14} /> Back
          </Button>
        </PageHeader>

        <Card padding="lg" className={styles.formCard}>
          <p className={styles.formNote}>
            Enter a public GitHub repository URL. No authentication required.
            We will not connect to GitHub in this prototype — a sample project
            will be opened instead.
          </p>
          <form onSubmit={handleGithubSubmit} className={styles.form} noValidate>
            <Input
              id="repo-url"
              label="Repository URL"
              type="url"
              placeholder="https://github.com/owner/repository"
              value={repoUrl}
              onChange={(e) => { setRepoUrl(e.target.value); setUrlError(''); }}
              error={urlError}
              hint="Must be a public repository in the format https://github.com/owner/repo"
              autoFocus
            />
            <div className={styles.formActions}>
              <Button id="github-submit-btn" type="submit" variant="primary">
                <GitBranch size={15} />
                Analyse Repository
              </Button>
            </div>
          </form>
        </Card>
      </div>
    );
  }

  // ── Default: choose option ───────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      <PageHeader
        title="New Project"
        subtitle="Choose how to start — all options load sample data in this prototype"
      >
        <Button
          id="new-project-back-btn"
          variant="ghost"
          size="sm"
          onClick={() => nav(ROUTES.dashboard)}
        >
          <ArrowLeft size={14} /> Back
        </Button>
      </PageHeader>

      <div className={styles.options}>
        {/* Option 1 — Demo */}
        <button
          id="load-demo-btn"
          className={styles.optionCard}
          onClick={() => nav(DEMO_ARCHITECTURE_ROUTE)}
        >
          <FolderOpen size={28} strokeWidth={1.5} className={styles.optionIcon} />
          <span className={styles.optionTitle}>Load demo architecture</span>
          <span className={styles.optionDesc}>
            Open the pre-built 8-node e-commerce microservices diagram — the fastest
            way to explore NEXUS features.
          </span>
          <span className={styles.optionCta}>Open Demo →</span>
        </button>

        {/* Option 2 — GitHub URL */}
        <button
          id="import-github-btn"
          className={styles.optionCard}
          onClick={() => setStep('github')}
        >
          <GitBranch size={28} strokeWidth={1.5} className={styles.optionIcon} />
          <span className={styles.optionTitle}>Import from GitHub</span>
          <span className={styles.optionDesc}>
            Enter a repository URL. Validation and analysis steps are shown; a
            sample project is opened in this Semester 1 prototype.
          </span>
          <span className={styles.optionCta}>Enter URL →</span>
        </button>

        {/* Option 3 — Upload (disabled/planned) */}
        <div
          className={[styles.optionCard, styles.optionDisabled].join(' ')}
          aria-disabled="true"
          title="Planned feature — not available in Semester 1"
        >
          <Upload size={28} strokeWidth={1.5} className={styles.optionIcon} />
          <span className={styles.optionTitle}>Upload file</span>
          <span className={styles.optionDesc}>
            Upload a Docker Compose, Helm chart, or custom JSON descriptor.
          </span>
          <span className={styles.plannedTag}>Planned — Prototype</span>
        </div>
      </div>
    </div>
  );
}
