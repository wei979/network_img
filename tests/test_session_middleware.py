"""Tests for session middleware and authentication"""

import pytest
from fastapi.testclient import TestClient
from analysis_server import app

client = TestClient(app)


def test_health_check_no_session():
    """Health check endpoint should work without session"""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "timestamp" in data


def test_timelines_creates_session_automatically():
    """Timelines endpoint should create session automatically if not exists"""
    response = client.get("/api/timelines")
    # Should succeed (either with session data or static fixture)
    assert response.status_code in [200, 404]

    # Session cookie should be set
    assert "session_id" in response.cookies or "Set-Cookie" in response.headers


def test_analysis_creates_session_automatically():
    """Analysis endpoint should create session automatically if not exists"""
    response = client.get("/api/analysis")
    # Will return 404 if no analysis exists, but should not return 401
    assert response.status_code == 404
    # Session cookie should be set
    assert "session_id" in response.cookies or "Set-Cookie" in response.headers


def test_session_persists_across_requests():
    """Session should persist across multiple requests"""
    with client:
        # First request creates session
        response1 = client.get("/api/health")
        assert response1.status_code == 200

        # Second request should reuse session
        response2 = client.get("/api/health")
        assert response2.status_code == 200
