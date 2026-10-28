# NEXUS Simulation Service

Initial FastAPI service for deterministic, explainable architecture what-if simulations.

## Run locally

```bash
cd simulation-service
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

- Health: http://localhost:8000/health
- OpenAPI UI: http://localhost:8000/docs
- Run tests: `pytest -q`

## Contract

`POST /simulate` accepts an architecture graph, baseline request volume (requests/minute), and one scenario:

- `traffic`: set `traffic_multiplier`
- `scale`: set `target_component_id` and `target_replicas`
- `cache_removal`: disable modeled cache nodes; backing-store demand increases only when a `CACHE_BACKING_STORE` edge is configured
- `service_failure`: set `target_component_id`

The response includes model version, before/after component metrics, bottlenecks, impact IDs, warnings, assumptions, and rule-based recommendations.

## Important limitations

- All values are illustrative estimates, not measured production data.
- The current flow calculation is intentionally simplified: branching traffic is split equally, cycles are bounded, and latency is a capped utilization-based approximation.
- Cost units are returned only when explicit `cost_per_replica` values are supplied.
- This service is not yet orchestrated by Spring Boot and does not yet persist runs. Those are later integration milestones.
