"""NEXUS deterministic architecture simulation API.

All numeric outputs are illustrative model estimates, never production measurements.
"""
from __future__ import annotations

from collections import deque
from typing import Literal

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field, model_validator

MODEL_VERSION = "0.1.0"
CAPACITY_PER_CORE_RPM = {
    "gateway": 15000.0,
    "service": 4000.0,
    "database": 2000.0,
    "cache": 25000.0,
    "queue": 12000.0,
    "external": 1000.0,
}
BASE_LATENCY_MS = {
    "gateway": 3.0,
    "service": 15.0,
    "database": 20.0,
    "cache": 1.0,
    "queue": 5.0,
    "external": 30.0,
}
CACHE_HIT_RATIO = 0.85
BOTTLENECK_THRESHOLD = 0.75
MAX_TRAFFIC_RPM = 10_000_000


class Component(BaseModel):
    id: str = Field(min_length=1, max_length=120)
    name: str = Field(min_length=1, max_length=160)
    type: Literal["gateway", "service", "database", "cache", "queue", "external"]
    replicas: int = Field(default=1, ge=1, le=50)
    cpu_cores: float = Field(default=1, gt=0, le=64)
    memory_mb: int | None = Field(default=None, ge=128, le=65536)
    processing_latency_ms: float | None = Field(default=None, ge=0, le=60000)
    cost_per_replica: float | None = Field(default=None, ge=0)


class Dependency(BaseModel):
    id: str | None = None
    source: str
    target: str
    type: Literal["CALLS", "READS_FROM", "WRITES_TO", "PUBLISHES_TO", "CONSUMES_FROM", "DEPENDS_ON", "CACHE_BACKING_STORE"] = "CALLS"
    network_latency_ms: float = Field(default=1, ge=0, le=60000)


class Architecture(BaseModel):
    nodes: list[Component] = Field(max_length=500)
    edges: list[Dependency] = Field(max_length=2000)

    @model_validator(mode="after")
    def validate_graph(self):
        ids = [node.id for node in self.nodes]
        if len(ids) != len(set(ids)):
            raise ValueError("Component IDs must be unique.")
        known = set(ids)
        seen = set()
        for edge in self.edges:
            if edge.source not in known or edge.target not in known:
                raise ValueError(f"Dependency endpoint not found: {edge.source} -> {edge.target}")
            if edge.source == edge.target:
                raise ValueError("Self-dependencies are not supported by this MVP model.")
            pair = (edge.source, edge.target, edge.type)
            if pair in seen:
                raise ValueError(f"Duplicate dependency: {edge.source} -> {edge.target}")
            seen.add(pair)
        return self


class Scenario(BaseModel):
    type: Literal["traffic", "scale", "cache_removal", "service_failure"]
    traffic_multiplier: float = Field(default=1.0, ge=0.1, le=100)
    target_component_id: str | None = None
    target_replicas: int | None = Field(default=None, ge=1, le=50)

    @model_validator(mode="after")
    def validate_scenario(self):
        if self.type in {"scale", "service_failure"} and not self.target_component_id:
            raise ValueError("target_component_id is required for this scenario.")
        if self.type == "scale" and self.target_replicas is None:
            raise ValueError("target_replicas is required for scale scenario.")
        return self


class SimulationRequest(BaseModel):
    architecture: Architecture
    scenario: Scenario
    baseline_traffic_rpm: float = Field(default=12000, gt=0, le=MAX_TRAFFIC_RPM)


app = FastAPI(title="NEXUS Simulation Service", version=MODEL_VERSION)


def _reachable(start_ids: list[str], adjacency: dict[str, list[str]]) -> set[str]:
    seen: set[str] = set()
    queue = deque(start_ids)
    while queue:
        current = queue.popleft()
        if current in seen:
            continue
        seen.add(current)
        queue.extend(adjacency.get(current, []))
    return seen


def _evaluate(architecture: Architecture, traffic_rpm: float, scenario: Scenario | None = None) -> dict:
    nodes = {node.id: node.model_copy(deep=True) for node in architecture.nodes}
    edges = list(architecture.edges)
    warnings: list[str] = []
    changed_id = scenario.target_component_id if scenario else None
    failed_id = changed_id if scenario and scenario.type == "service_failure" else None
    disabled_cache_ids: set[str] = set()

    if scenario and scenario.type == "scale":
        if changed_id not in nodes:
            raise ValueError(f"Component '{changed_id}' does not exist.")
        if nodes[changed_id].type not in {"service", "gateway"}:
            raise ValueError("Replica scaling is supported only for services and gateways.")
        nodes[changed_id].replicas = scenario.target_replicas or nodes[changed_id].replicas
    if scenario and scenario.type == "service_failure" and changed_id not in nodes:
        raise ValueError(f"Component '{changed_id}' does not exist.")
    if scenario and scenario.type == "cache_removal":
        disabled_cache_ids = {n.id for n in nodes.values() if n.type == "cache"}
        if not disabled_cache_ids:
            warnings.append("No cache components exist; cache-removal scenario has no cache to disable.")

    active_ids = set(nodes) - disabled_cache_ids
    if failed_id:
        active_ids.discard(failed_id)

    adjacency: dict[str, list[str]] = {node_id: [] for node_id in nodes}
    indegree = {node_id: 0 for node_id in nodes}
    for edge in edges:
        if edge.source in active_ids and edge.target in active_ids:
            adjacency[edge.source].append(edge.target)
            indegree[edge.target] += 1

    roots = [node_id for node_id in active_ids if indegree[node_id] == 0]
    if not roots and active_ids:
        roots = [next(iter(active_ids))]
        warnings.append("Graph contains a cycle; traversal uses a deterministic single entry component.")
    loads = {node_id: 0.0 for node_id in nodes}
    if roots:
        for root in roots:
            loads[root] = traffic_rpm / len(roots)
    # Each reachable component receives the sum of its reachable predecessors' flow.
    # A visited set bounds cycles; this is a simplified flow model, not a queueing network solver.
    queue = deque(roots)
    visited: set[str] = set()
    while queue:
        source = queue.popleft()
        if source in visited:
            continue
        visited.add(source)
        targets = adjacency.get(source, [])
        if targets:
            share = loads[source] / len(targets)
            for target in targets:
                if target not in roots:
                    loads[target] += share
                queue.append(target)

    if scenario and scenario.type == "cache_removal":
        backing_edges = [e for e in edges if e.type == "CACHE_BACKING_STORE" and e.source in disabled_cache_ids]
        if backing_edges:
            for edge in backing_edges:
                # Cache misses are redirected to the explicitly configured backing store.
                loads[edge.target] += traffic_rpm * CACHE_HIT_RATIO
        else:
            warnings.append("No CACHE_BACKING_STORE dependency is configured; backing-store demand was not increased.")

    component_results = []
    bottlenecks = []
    latencies: dict[str, float] = {}
    total_cost = 0.0
    active_loads = []
    for node_id, node in nodes.items():
        is_down = node_id == failed_id or node_id in disabled_cache_ids
        capacity = 0.0 if is_down else CAPACITY_PER_CORE_RPM[node.type] * node.replicas * node.cpu_cores
        utilization = 0.0 if capacity <= 0 else loads[node_id] / capacity
        base_latency = node.processing_latency_ms if node.processing_latency_ms is not None else BASE_LATENCY_MS[node.type]
        if is_down:
            latency = 0.0
        else:
            rho = min(utilization, 0.95)
            latency = min(base_latency * (1 + rho / max(1 - rho, 0.05)), base_latency * 10)
            latencies[node_id] = latency
            active_loads.append(loads[node_id])
            if utilization >= BOTTLENECK_THRESHOLD:
                bottlenecks.append(node_id)
            if node.cost_per_replica is not None:
                total_cost += node.cost_per_replica * node.replicas
        component_results.append({
            "id": node_id, "name": node.name, "type": node.type, "available": not is_down,
            "demand_rpm": round(loads[node_id], 2), "capacity_rpm": round(capacity, 2),
            "utilization_percent": round(utilization * 100, 1), "estimated_latency_ms": round(latency, 2),
            "replicas": node.replicas,
        })

    # Approximate end-to-end latency as the sum of component and edge latency on reachable paths.
    edge_latency = sum(e.network_latency_ms for e in edges if e.source in active_ids and e.target in active_ids)
    estimated_latency = sum(latencies.values()) + edge_latency
    max_capacity = min((CAPACITY_PER_CORE_RPM[n.type] * n.replicas * n.cpu_cores for n in nodes.values() if n.id in active_ids), default=0)
    estimated_throughput = min(traffic_rpm, max_capacity) if max_capacity else 0
    impacted = []
    if failed_id:
        downstream = _reachable(adjacency.get(failed_id, []), adjacency) if failed_id in adjacency else set()
        upstream = {e.source for e in edges if e.target == failed_id}
        impacted = sorted((downstream | upstream) - {failed_id})
    return {
        "estimated_latency_ms": round(estimated_latency, 2),
        "estimated_throughput_rpm": round(estimated_throughput, 2),
        "estimated_cpu_percent": round(sum(min(100, x["utilization_percent"]) for x in component_results if x["available"]) / max(1, len(active_ids)), 1),
        "estimated_cost_units": round(total_cost, 2) if any(n.cost_per_replica is not None for n in nodes.values()) else None,
        "bottlenecks": bottlenecks,
        "impacted_component_ids": impacted,
        "components": component_results,
        "warnings": warnings,
    }


@app.get("/health")
def health():
    return {"status": "ok", "service": "nexus-simulation", "model_version": MODEL_VERSION}


@app.post("/simulate")
def simulate(request: SimulationRequest):
    try:
        before = _evaluate(request.architecture, request.baseline_traffic_rpm)
        traffic = request.baseline_traffic_rpm
        scenario = request.scenario
        if scenario.type == "traffic":
            traffic *= scenario.traffic_multiplier
        after = _evaluate(request.architecture, traffic, scenario)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail={"message": str(exc)}) from exc

    recommendations = []
    if after["bottlenecks"]:
        recommendations.append({
            "title": "Investigate high-utilization components",
            "reason": "One or more modeled components reached the 75% utilization threshold.",
            "component_ids": after["bottlenecks"],
            "trade_off": "Scaling may increase resource cost; validate capacity with real workload tests.",
        })
    if scenario.type == "service_failure":
        recommendations.append({
            "title": "Review redundancy for the failed component",
            "reason": "A modeled component was marked unavailable.",
            "component_ids": [scenario.target_component_id],
            "trade_off": "Redundancy adds operational complexity and resource overhead.",
        })
    if not recommendations:
        recommendations.append({
            "title": "Review the assumptions before acting",
            "reason": "No component crossed the configured bottleneck threshold in this run.",
            "component_ids": [],
            "trade_off": "A simplified model cannot establish production safety.",
        })
    return {
        "model_version": MODEL_VERSION,
        "is_estimate": True,
        "scenario": scenario.model_dump(),
        "assumptions": [
            "Capacity factors and processing latencies are illustrative defaults, not empirically validated benchmarks.",
            "Traffic follows the directed graph with equal splitting at branching nodes.",
            "Latency is a capped utilization-based approximation; this is not a validated queueing simulation.",
            "Cost units are included only when cost_per_replica inputs are provided.",
        ],
        "before": before,
        "after": after,
        "recommendations": recommendations,
    }
