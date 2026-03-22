"""Integration: HTTP stack + health routes."""

import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import app


@pytest.fixture(autouse=True)
def _clear_settings():
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def test_health_and_ready():
    client = TestClient(app)
    h = client.get("/health")
    assert h.status_code == 200
    assert h.json()["status"] == "ok"
    r = client.get("/ready")
    assert r.status_code == 200
    assert r.json()["status"] == "ready"
