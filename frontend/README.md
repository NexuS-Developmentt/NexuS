# NexuS — Frontend

AI-Powered Software Architecture Simulation and Decision Intelligence Platform.

> **Semester 1 prototype** — sample/demo data only. No backend connection, no auth, no real AI calls.

---

## Quick Start

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

| Script | Command |
|---|---|
| Dev server | `npm run dev` |
| Type-check | `npx tsc --noEmit` |
| Lint | `npm run lint` |
| Production build | `npm run build` |
| Preview build | `npm run preview` |

---

## Route Map

| Path | Page | Shell |
|---|---|---|
| `/` | Landing page | None |
| `/dashboard` | Dashboard | AppShell |
| `/projects/new` | New Project / Import | AppShell |
| `/projects/:projectId/architecture` | Architecture Studio *(Member 2)* | AppShell (full-bleed) |
| `/projects/:projectId/simulation` | Simulation *(placeholder)* | AppShell |
| `/projects/:projectId/insights` | AI Insights *(placeholder)* | AppShell |
| `/projects/:projectId/reports` | Reports *(placeholder)* | AppShell |

**Demo project ID:** `demo-ecommerce`
**Demo architecture route:** `/projects/demo-ecommerce/architecture`

---

## Design Tokens

All tokens are CSS custom properties in [`src/styles/tokens.css`](src/styles/tokens.css).
Import them via `index.css` — never import directly in component modules.

### Key tokens

| Token | Value | Usage |
|---|---|---|
| `--color-bg` | `#0d0f16` | Page background |
| `--color-surface` | `#12151f` | Card / sidebar surface |
| `--color-border` | `#1e2130` | Borders, dividers |
| `--color-fg` | `#d4d8e2` | Body text |
| `--color-fg-heading` | `#e8eaf0` | Headings |
| `--color-fg-muted` | `#8b919f` | Secondary text |
| `--color-primary` | `#6366f1` | Indigo accent, buttons |
| `--color-primary-hover` | `#7c7ffa` | Button hover |
| `--color-accent` | `#818cf8` | Active nav, highlights |
| `--color-warning` | `#c9962a` | Demo badge, warnings |
| `--color-success` | `#22c55e` | Ready status |
| `--color-error` | `#ef4444` | Error states |
| `--sidebar-width` | `220px` | Expanded sidebar |
| `--sidebar-width-collapsed` | `56px` | Icon-only sidebar |
| `--topbar-height` | `52px` | Top bar height |

---

## Shared UI Components

All components live in `src/components/ui/` and are exported from one barrel:

```ts
import { Button, Card, Badge, Input, Select, Dialog,
         PageHeader, EmptyState, LoadingState, MetricCard, Tooltip } from '../components/ui';
```

### Usage examples

```tsx
// Button
<Button variant="primary" size="md" loading={false} onClick={...}>
  Save
</Button>

// Card
<Card padding="lg">
  <p>Content here</p>
</Card>

// Badge
<Badge variant="demo">Demo data</Badge>
<Badge variant="ready">Ready</Badge>
<DemoBadge /> {/* shorthand for variant="demo" */}

// Input with validation
<Input
  id="url"
  label="Repository URL"
  type="url"
  error="Invalid URL format"
  hint="https://github.com/owner/repo"
/>

// MetricCard (always labelled sample)
<MetricCard label="Projects" value={3} sublabel="in workspace" isSample />

// PageHeader
<PageHeader title="Dashboard" subtitle="Overview">
  <Button>New Project</Button>
</PageHeader>

// EmptyState
<EmptyState title="No projects" description="Create one to get started">
  <Button>New Project</Button>
</EmptyState>

// Dialog (focus-trapped, Esc-to-close)
<Dialog open={isOpen} onClose={() => setOpen(false)} title="Confirm">
  <p>Are you sure?</p>
</Dialog>
```

### Button variants
`primary` | `secondary` | `ghost` | `destructive`

### Badge variants
`demo` | `draft` | `ready` | `completed` | `warning` | `error` | `default`

---

## App Shell

`AppShell` is a React Router v7 layout route — it renders `<Outlet />`:

```tsx
// Normal shell (with TopBar)
<Route element={<AppShell pageTitle="Dashboard" />}>
  <Route path="/dashboard" element={<DashboardPage />} />
</Route>

// Full-bleed shell (no TopBar, sidebar collapses to icons)
// Used for Architecture Studio — canvas needs 100dvh
<Route element={<AppShell fullBleed />}>
  <Route path="/projects/:projectId/architecture" element={<ArchitectureStudioPage />} />
</Route>
```

The sidebar collapses to 56 px icon-only via the toggle button or automatically in `fullBleed` mode.

---

## Demo Data

Edit mock data in:

- **Projects:** [`src/features/projects/data/demoProjects.ts`](src/features/projects/data/demoProjects.ts)
- **Simulations:** same file, `demoSimulations` array
- **Demo project ID:** change `DEMO_PROJECT_ID` constant

To test the `EmptyState` on the Dashboard, toggle:
```ts
// src/pages/DashboardPage.tsx  line ~22
const SHOW_PROJECTS = false; // set to false to show EmptyState
```

---

## Architecture Studio (Member 2)

- **Location:** `src/features/architecture/` — **do not modify**
- **Public export:** `import { ArchitectureStudioPage } from './features/architecture'`
- Mounted at `/projects/:projectId/architecture` inside `<AppShell fullBleed />`
- `ReactFlowProvider` is already embedded — do not double-wrap
- The `fullBleed` shell gives the canvas `100dvh` with a collapsed icon sidebar

---

## Project Structure

```
frontend/src/
├── styles/
│   └── tokens.css              ← All CSS custom properties
├── types/
│   └── project.ts              ← ProjectSummary, SimulationSummary
├── routes.ts                   ← ROUTES map + NAV_ITEMS
├── App.tsx                     ← BrowserRouter + all routes
├── components/
│   ├── ui/                     ← Shared UI components + index.ts
│   └── layout/
│       ├── AppShell.tsx        ← Layout route (Outlet)
│       ├── Sidebar.tsx         ← Collapsible nav
│       └── TopBar.tsx          ← Breadcrumb + Demo badge
├── pages/
│   ├── LandingPage.tsx
│   ├── DashboardPage.tsx
│   ├── NewProjectPage.tsx
│   └── PlaceholderPage.tsx
└── features/
    ├── architecture/           ← Member 2 (DO NOT MODIFY)
    └── projects/
        └── data/
            └── demoProjects.ts ← Edit demo data here
```

---

## Branch

Working branch: **`feat/app-shell-dashboard`**
Do not merge to `main` without team review.
