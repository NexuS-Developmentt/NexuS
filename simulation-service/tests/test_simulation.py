from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def architecture():
    return {
        "nodes": [
            {"id": "gateway", "name": "Gateway", "type": "gateway", "replicas": 2, "cpu_cores": 1},
            {"id": "orders", "name": "Order Service", "type": "service", "replicas": 2, "cpu_cores": 1},
            {"id": "db", "name": "Database", "type": "database", "replicas": 1, "cpu_cores": 2, "cost_per_replica": 3},
        ],
        "edges": [
            {"source": "gateway", "target": "orders", "type": "CALLS", "network_latency_ms": 2},
            {"source": "orders", "target": "db", "type": "WRITES_TO", "network_latency_ms": 3},
        ],
    }


def test_health_endpoint_reports_model_version():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["model_version"] == "0.1.0"


def test_traffic_increase_is_deterministic_and_increases_demand():
    payload = {
        "architecture": architecture(),
        "baseline_traffic_rpm": 1000,
        "scenario": {"type": "traffic", "traffic_multiplier": 5},
    }
    first = client.post("/simulate", json=payload)
    second = client.post("/simulate", json=payload)
    assert first.status_code == 200
    assert first.json() == second.json()
    before = {item["id"]: item for item in first.json()["before"]["components"]}
    after = {item["id"]: item for item in first.json()["after"]["components"]}
    assert after["gateway"]["demand_rpm"] == before["gateway"]["demand_rpm"] * 5


def test_replica_scaling_changes_target_capacity():
    payload = {
        "architecture": architecture(),
        "scenario": {"type": "scale", "target_component_id": "orders", "target_replicas": 4},
    }
    response = client.post("/simulate", json=payload)
    assert response.status_code == 200
    before = {item["id"]: item for item in response.json()["before"]["components"]}
    after = {item["id"]: item for item in response.json()["after"]["components"]}
    assert before["orders"]["capacity_rpm"] == 8000
    assert after["orders"]["capacity_rpm"] == 16000


def test_invalid_dependency_endpoint_is_rejected():
    payload = {
        "architecture": {
            "nodes": [{"id": "a", "name": "A", "type": "service"}],
            "edges": [{"source": "a", "target": "missing"}],
        },
        "scenario": {"type": "traffic"},
    }
    assert client.post("/simulate", json=payload).status_code == 422


def test_failure_requires_target_component():
    response = client.post("/simulate", json={
        "architecture": architecture(),
        "scenario": {"type": "service_failure"},
    })
    assert response.status_code == 422


def test_failure_impact_includes_upstream_and_downstream_components():
    payload = {
        "architecture": architecture(),
        "scenario": {"type": "service_failure", "target_component_id": "orders"},
    }
    response = client.post("/simulate", json=payload)
    assert response.status_code == 200
    assert response.json()["after"]["impacted_component_ids"] == ["db", "gateway"]
