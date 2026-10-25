# Architecture Studio (`features/architecture`)

The **Architecture Studio** is an interactive, visual system modeling and heuristic capacity simulation workspace for the NexuS platform. It enables engineers to inspect, author, modify, and stress-test microservice topologies using directed graph diagrams.

---

## 1. Purpose

- **Interactive Topology Visualization**: Render distributed architecture components (gateways, services, databases, caches, queues) and network connections with clear protocol indicators and health statuses.
- **Visual Graph Editing**: Create, reposition, configure, and connect nodes with handle-to-handle drag connections. Enforces constraints (e.g. self-link and duplicate-connection prevention).
- **Heuristic Capacity Simulation**: Deterministically estimate end-to-end request latency, CPU utilisation, sustained throughput, and potential bottlenecks under normal, cache-eviction, service-outage, and scaled-capacity scenarios.

---

## 2. Folder Structure

```
frontend/src/features/architecture/
├── components/
│   ├── ArchitectureCanvas.tsx          # React Flow diagram viewport with grid, minimap, controls & empty state
│   ├── ArchitectureCanvas.module.css
│   ├── ArchitectureNode.tsx            # Custom React Flow node component (handles gateway, service, database, cache, queue)
│   ├── ArchitectureNode.module.css
│   ├── EmptySelectionPanel.tsx         # Placeholder displayed in properties sidebar when nothing is selected
│   ├── EmptySelectionPanel.module.css
│   ├── GraphToolbar.tsx                # Action toolbar with "Fit view" and "Reset demo" buttons
│   ├── GraphToolbar.module.css
│   ├── NodePalette.tsx                 # Compact left palette for adding components to the canvas
│   ├── NodePalette.module.css
│   ├── PropertiesPanel.tsx             # Right sidebar for editing node & edge properties, inline validation, and deletion
│   ├── PropertiesPanel.module.css
│   ├── SimulationPanel.tsx             # Collapsible bottom drawer for configuring and running capacity simulations
│   └── SimulationPanel.module.css
├── data/
│   └── demoArchitecture.ts             # Hand-authored 8-node canonical demo architecture with deep-cloning
├── hooks/
│   └── useArchitectureGraph.ts         # Central state hook for nodes, edges, selections, mutations, and simulation overlays
├── pages/
│   ├── ArchitectureStudioPage.tsx      # Top-level page container wrapping ReactFlowProvider
│   └── ArchitectureStudioPage.module.css
├── services/
│   └── mockSimulation.ts               # Pure, deterministic heuristic capacity and latency simulation engine
├── types/
│   └── architecture.ts                 # Domain TypeScript interfaces (nodes, edges, simulations)
├── utils/
│   └── graphValidation.ts              # Pure validators for node fields, connections, and non-stacking placement
└── README.md                           # Feature module documentation (this file)
```

---

## 3. Data Types

All core domain types are exported from `types/architecture.ts`:

- **`ArchitectureNodeKind`**: `'service' | 'gateway' | 'database' | 'cache' | 'queue'`
- **`ArchitectureNodeData`**: Custom node payload stored on React Flow nodes:
  - `label` (string, required, trimmed display name)
  - `kind` (ArchitectureNodeKind, immutable after creation)
  - `replicas` (number, 1–50)
  - `cpuCores` (number, > 0 and ≤ 64)
  - `memoryMb` (number, 128–65,536)
  - `description` (optional string)
  - `status` (`'normal' | 'warning' | 'critical'`)
  - `simulationStatus` (transient visual status overlay during simulation)
- **`ArchitectureEdgeKind`**: `'http' | 'database' | 'cache' | 'event' | 'dependency'`
- **`ArchitectureEdgeData`**:
  - `label` (optional string displayed along connection)
  - `kind` (ArchitectureEdgeKind)
- **`SimulationInputs`**:
  - `requestsPerMinute` (number, 1 to 10,000,000)
  - `scenario` (`'normal' | 'remove-cache' | 'service-failure' | 'scale-service'`)
  - `targetNodeId` (string, required for `'service-failure'` and `'scale-service'`)
- **`SimulationResult`**:
  - `estimatedLatencyMs` (number)
  - `estimatedCpuPercent` (number, 0–100)
  - `estimatedThroughputRpm` (number)
  - `bottleneckNodeIds` (string[])
  - `explanation` (prose summary)
  - `recommendations` (2 to 4 actionable suggestions)
  - `isMock: true`

---

## 4. Simulation Model Assumptions & Mock Disclaimer

> **IMPORTANT DISCLAIMER**: The simulation engine in `services/mockSimulation.ts` is an **illustrative heuristic mock** designed for architectural modeling and demonstration. It is **not** measured production APM data.

### Capacity Assumptions
Capacity per node represents sustainable requests per minute (RPM) per assigned CPU core:
- **Gateway**: 15,000 RPM/core (lightweight reverse-proxying & header routing)
- **Cache**: 25,000 RPM/core (in-memory $O(1)$ key-value lookups)
- **Service**: 4,000 RPM/core (domain business logic, JSON serialization, ORM overhead)
- **Queue**: 12,000 RPM/core (append-only disk/memory streaming)
- **Database**: 2,500 RPM/core (disk I/O, ACID transactions, relational joins)

### Fallback Defaults
If a node is missing replicas or CPU cores:
- Gateway: 2 replicas, 1 core
- Service: 2 replicas, 1 core
- Database: 1 replica, 4 cores
- Cache: 1 replica, 1 core
- Queue: 2 replicas, 1 core

### Latency Modeling
- Base zero-load latencies: Gateway (3 ms), Cache (1 ms), Service (15 ms), Queue (5 ms), Database (20 ms).
- Non-linear queuing delay curve modeled on M/M/1 queuing:
  $$\text{Latency} = \text{baseLatency} \times \left(1 + \frac{\rho}{1 - \min(\rho, 0.95)}\right)$$
  Capped at $10\times$ baseline to prevent infinite queuing divergence.
- End-to-end latency is the sum along the slowest critical path (evaluated via cycle-safe recursive path discovery).

### Scenario Behaviors
- **`normal`**: Standard traffic propagation from entry nodes (nodes with 0 incoming edges).
- **`remove-cache`**: In-memory cache is marked absent. Cache absorption ($85\%$ hit ratio) is bypassed, routing $100\%$ of read traffic directly to downstream databases.
- **`service-failure`**: The specified `targetNodeId` is marked down (capacity = 0). Downstream dependent services degrade, critical path encounters a 500 ms timeout per hop, and throughput drops.
- **`scale-service`**: Doubles replicas for `targetNodeId` (capped at 50), reducing component utilization and stabilizing latency.

---

## 5. Replacing `mockSimulation` with a Real Backend API

To transition from client-side mock estimation to a live simulation service or server-side profiler:

1. Maintain the exact function signature in `services/mockSimulation.ts` or create an adapter:
   ```typescript
   export async function runSimulation(
     nodes: Node<ArchitectureNodeData>[],
     edges: Edge<ArchitectureEdgeData>[],
     inputs: SimulationInputs
   ): Promise<SimulationResult>
   ```
2. Send the serialized node topology, edge list, and simulation parameters as a JSON payload to your backend simulation endpoint (e.g. `POST /api/v1/architecture/simulate`).
3. Return the response adhering to the `SimulationResult` interface. Note that `isMock` can be flipped to `false` when real APM telemetry is integrated.
4. In `components/SimulationPanel.tsx`, simply `await` the simulation call inside `handleRunSimulation`.

---

## 6. Integration Guide for Member 1 (App Shell & Routing)

### Route Registration
In the router configuration (e.g. `App.tsx` or `routes.tsx`), import and mount `ArchitectureStudioPage`:

```tsx
import { ArchitectureStudioPage } from './features/architecture/pages/ArchitectureStudioPage';

// Inside your Route definition:
<Route path="/architecture" element={<ArchitectureStudioPage />} />
```

### Parent Layout & Height Assumptions
- `ArchitectureStudioPage` uses `height: 100dvh` (full viewport height) and `display: flex; flex-direction: column`.
- If the global layout provides a shared top navigation bar (e.g. `<AppHeader />`), wrap `ArchitectureStudioPage` in a container with `height: calc(100vh - HEADER_HEIGHT)` or set `height: 100%` on `.page` so it fills the available content area without double scrollbars.
- `ReactFlowProvider` is already embedded inside `ArchitectureStudioPage`. Member 1 does not need to wrap it with an external React Flow provider.

---

## 7. Known Limitations

1. **Static Flow Model**: Request load is split equally among downstream branches. Real-world conditional routing (e.g. 90/10 canary splits) is not modeled in the current heuristic engine.
2. **Synchronous Single-Threaded Worker**: Simulations run entirely synchronously in the browser. While instantaneous for diagrams with $< 100$ nodes, large topologies with $> 1,000$ components would benefit from offloading calculation to a Web Worker or backend service.
3. **Directed Acyclic Bias**: While cycles are completely safe and will not cause infinite loops, circular dependencies have artificial depth cutoff caps ($30$ hops).
