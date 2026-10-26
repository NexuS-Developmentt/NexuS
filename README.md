# NexuS

NexuS is an engineering platform featuring microservice architecture visualization and performance simulation.

## Architecture Studio

The Architecture Studio is available in the frontend under `src/features/architecture`. It provides an interactive diagram canvas for editing topologies, inspecting components, and simulating capacity constraints.

## Getting Started

### Prerequisites

- **Node.js** (v20+ recommended)
- **npm** (v10+ recommended)

### Quick Start (Frontend)

1. Navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the local development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173/architecture](http://localhost:5173/architecture) in your browser.

### Available Scripts (in `frontend/`)

- `npm run dev`: Starts the local Vite development server.
- `npm run build`: Type-checks with TypeScript and builds the production bundle into `dist/`.
- `npm run lint`: Runs `oxlint` across all source files.
- `npm run preview`: Previews the production build locally.

For detailed documentation on the architecture studio module, see [`frontend/src/features/architecture/README.md`](frontend/src/features/architecture/README.md).
