# Architecture Studio (`features/architecture`)

The **Architecture Studio** is an interactive, visual system modeling and heuristic capacity simulation workspace for the NexuS platform. It enables engineers to inspect, author, modify, export, import, and stress-test microservice topologies using directed graph diagrams.

---

## 1. Purpose

- **Interactive Topology Visualization**: Render distributed architecture components (gateways, services, databases, caches, queues) and network connections with clear protocol indicators, distinct line styles (dash patterns), and health statuses.
- **Visual Graph Editing**: Create, reposition, configure, and connect nodes with handle-to-handle drag connections. Enforces constraints (e.g. self-link and duplicate-connection prevention).
- **Import / Export**: Export architecture diagrams to `nexus-architecture.json` and import diagrams with comprehensive schema and constraint validation.
- **Heuristic Capacity Simulation**: Deterministically estimate end-to-end request latency, CPU utilisation, sustained throughput, per-node utilisation, and potential bottlenecks under normal, cache-eviction, service-outage, and scaled-capacity scenarios.

---

## 2. Folder Structure

```
frontend/src/features/architecture/
├── components/
│   ├── ArchitectureCanvas.tsx          # React Flow diagram viewport with grid, minimap, controls, empty state & kind-specific edge styling
│   ├── ArchitectureCanvas.module.css
│   ├── ArchitectureNode.tsx            # Custom React Flow node component with kind badge, status badge, replica pill & simulated utilisation %
│   ├── ArchitectureNode.module.css
│   ├── EmptySelectionPanel.tsx         # Placeholder displayed in properties sidebar when nothing is selected
│   ├── EmptySelectionPanel.module.css
│   ├── GraphToolbar.tsx                # Action toolbar with Fit view, Export JSON, Import JSON, and Reset demo buttons
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
│   ├── graphSerialization.ts           # Pure functions for exporting, importing, and validating architecture JSON
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
  - `simulationUtilisation` (transient visual CPU utilisation ratio for node text pill)
- **`ArchitectureEdgeKind`**: `'http' | 'database' | 'cache' | 'event' | 'dependency'`
- **`ArchitectureEdgeData`**:
  - `label` (optional string displayed along connection)
  - `kind` (ArchitectureEdgeKind)
- **`SimulationInputs`**:
  - `requestsPerMinute` (number, 1 to 10,000,000)
  - `scenario` (`'normal' | 'remove-cache' | 'service-failure' | 'scale-service'`)
  - `targetNodeId` (string, required for `'service-failure'` and `'scale-service'`)
- **`SimulationResult`**:
  - `estimatedLatencyMs` (number, end-to-end critical path latency)
  - `estimatedCpuPercent` (number, 0–100 average CPU utilisation across active nodes)
  - `estimatedThroughputRpm` (number, sustained requests per minute)
  - `bottleneckNodeIds` (string[], nodes with utilisation ≥ 75%)
  - `explanation` (prose summary accurately attributing throughput limits)
  - `recommendations` (2 to 4 actionable suggestions naming real nodes and computed numbers)
  - `isMock: true`
  - `nodeUtilisation` (optional map of per-node utilisation ratio, e.g. `{ [nodeId]: 0.75 }`)

---

## 4. Simulation Model Assumptions & Mock Disclaimer

> **IMPORTANT DISCLAIMER**: The simulation engine in `services/mockSimulation.ts` is an **illustrative heuristic mock** designed for architectural modeling and demonstration. It is **not** measured production APM data.

### Capacity Assumptions
Capacity per node represents sustainable requests per minute (RPM) per assigned CPU core:
- **Gateway**: 15,000 RPM/core (lightweight reverse-proxying & header routing)
- **Cache**: 25,000 RPM/core (in-memory $O(1)$ key-value lookups)
- **Service**: 4,000 RPM/core (domain business logic, JSON serialization, ORM overhead)
- **Queue**: 12,000 RPM/core (append-only disk/memory streaming)
- **Database**: 2,000 RPM/core (disk I/O, ACID transactions, relational joins; rebalanced from 2,500)

### Fallback Defaults
If a node is missing replicas or CPU cores:
- Gateway: 2 replicas, 1 core
- Service: 2 replicas, 1 core
- Database: 1 replica, 2 cores
- Cache: 1 replica, 1 core
- Queue: 2 replicas, 1 core

### Latency Modeling
- Base zero-load latencies: Gateway (3 ms), Cache (1 ms), Service (15 ms), Queue (5 ms), Database (20 ms).
- Non-linear queuing delay curve modeled on M/M/1 queuing:
  $$\text{Latency} = \text{baseLatency} \times \left(1 + \frac{\rho}{1 - \min(\rho, 0.95)}\right)$$
  Capped at $10\times$ baseline to prevent infinite queuing divergence.
- End-to-end latency is the sum along the slowest critical path (evaluated via cycle-safe recursive path discovery).

### Scenario Behaviors at 12,000 RPM on Demo Graph
The demo graph is balanced such that:
- **`normal`**:
  - `node-order-service` operates at **75% utilisation** (6,000 RPM load / 8,000 RPM capacity with 2 replicas, 1 core), forming **one mild bottleneck** in the 60–80% target range.
  - `node-auth-service` operates at **38% utilisation** (6,000 RPM load / 16,000 RPM capacity with 2 replicas, 2 cores).
  - `node-postgres-db` operates at **60% utilisation** (2,400 RPM load / 4,000 RPM capacity with 1 replica, 2 cores).
  - Sustained throughput is **12,000 RPM**; critical path latency is **131 ms**.
- **`remove-cache`**:
  - In-memory cache is marked absent. Cache read absorption ($85\%$ hit ratio) is bypassed, deflecting full read query volume to backing databases (`node-postgres-db` load increases by 1,800 RPM to 4,200 RPM).
  - Database utilisation jumps to **105%**, pushing `node-postgres-db` into the bottleneck list alongside `node-order-service`.
  - Latency increases from 131 ms to **286 ms**, derived directly from the recomputed database queuing delay plus a documented 5 ms flat cache-miss penalty.
- **`service-failure`**:
  - Targeted node is marked down. Requests whose path traverses the failed node are lost or degraded.
  - The share of traffic lost is computed from dynamic load propagation ($50\%$ for Order Service).
  - Degraded paths incur a documented **500 ms client timeout penalty**.
  - Throughput drops from 12,000 RPM to **6,000 RPM**; critical path latency is **541 ms**.
- **`scale-service`**:
  - Scaling `node-order-service` (the normal bottleneck) doubles replicas from 2 to 4 (capacity becomes 16,000 RPM).
  - Utilisation visibly drops from 75% to **38%**.
  - Total critical path latency visibly drops from 131 ms to **95 ms**, and the bottleneck list becomes empty.

---

## 5. Canvas Edge Visual Distinction

Connections on the canvas are visually distinguishable by line dash style (not colour alone):
- **`http`**: Solid line (`strokeWidth: 1.5`, `#5b8dee`)
- **`database`**: Medium-dashed line (`strokeDasharray: '6 4'`, `strokeWidth: 2`, `#a87ffb`)
- **`cache`**: Fine-dotted line (`strokeDasharray: '2 3'`, `strokeWidth: 2`, `#f5c842`)
- **`event`**: Long-dashed line (`strokeDasharray: '10 5'`, `strokeWidth: 1.5`, `#ff8a50`)
- **`dependency`**: Dash-dot pattern (`strokeDasharray: '8 3 2 3'`, `strokeWidth: 1.5`, `#6ecf8e`)

Connection labels are rendered with high-contrast pills (`#141720` background with `#e2e8f0` text) to remain sharp across all zoom levels.

---

## 6. Export and Import JSON

- **Export JSON**: Downloads the current diagram as `nexus-architecture.json`. Transient simulation state (`simulationStatus`, `simulationUtilisation`) is stripped.
- **Import JSON**: Validates diagram structure via pure functions in `utils/graphSerialization.ts`:
  - Validates `nodes` and `edges` arrays.
  - Validates unique string IDs for nodes and edges.
  - Validates node coordinates (finite numbers `x`, `y`) and kind.
  - Enforces field constraints using domain validators (name required, replicas 1–50, cpuCores 0.1–64, memoryMb 128–65,536).
  - Validates that edges reference existing node IDs and prevents self-links.
  - Rejects corrupt or invalid files with an inline non-blocking toast, leaving the current graph unchanged.
  - On success, replaces the graph and clears selection and simulation highlights.

---

## 7. Known Limitations

1. **Static Flow Model**: Request load is split equally among downstream branches. Real-world conditional routing (e.g. 90/10 canary splits) is not modeled in the current heuristic engine.
2. **Synchronous Single-Threaded Worker**: Simulations run entirely synchronously in the browser. While instantaneous for diagrams with $< 100$ nodes, large topologies with $> 1,000$ components would benefit from offloading calculation to a Web Worker or backend service.
3. **Directed Acyclic Bias**: While cycles are completely safe and will not cause infinite loops, circular dependencies have artificial depth cutoff caps ($30$ hops).
