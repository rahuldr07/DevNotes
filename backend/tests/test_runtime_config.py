"""Startup posture: fail fast on unsafe production config, report health honestly."""
import pytest


def _settings(**overrides):
    from app.config import Settings

    base = {
        "DB_HOST": "localhost",
        "DB_NAME": "devnotes",
        "DB_USER": "devnotes",
        "DB_PASSWORD": "devnotes",
        "SECRET_KEY": "x" * 40,
        "DB_SSL_MODE": "require",
    }
    base.update(overrides)
    return Settings(**base)


def test_development_config_is_permissive():
    _settings(ENVIRONMENT="development", SECRET_KEY="short", DB_SSL_MODE="disable").validate_for_runtime()


def test_production_rejects_the_example_placeholder_secret():
    settings = _settings(
        ENVIRONMENT="production", SECRET_KEY="change-this-local-dev-secret"
    )
    with pytest.raises(RuntimeError, match="placeholder"):
        settings.validate_for_runtime()


def test_production_rejects_a_short_secret():
    with pytest.raises(RuntimeError, match="32 characters"):
        _settings(ENVIRONMENT="production", SECRET_KEY="tooshort").validate_for_runtime()


def test_production_rejects_plaintext_database_connections():
    with pytest.raises(RuntimeError, match="DB_SSL_MODE"):
        _settings(ENVIRONMENT="production", DB_SSL_MODE="disable").validate_for_runtime()


def test_production_accepts_a_sound_config():
    _settings(ENVIRONMENT="production").validate_for_runtime()


def test_unknown_environment_is_rejected():
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        _settings(ENVIRONMENT="staging")


def test_cors_origins_parse_into_a_list():
    settings = _settings(CORS_ORIGINS="https://a.example, https://b.example ,")
    assert settings.cors_origins == ["https://a.example", "https://b.example"]

    assert _settings(CORS_ORIGINS="").cors_origins == []


def test_health_db_reports_503_when_the_database_is_unreachable(monkeypatch):
    """A 200 with an "unhealthy" body leaves a broken instance in rotation."""
    from fastapi import FastAPI
    from fastapi.testclient import TestClient

    from app import main

    def explode():
        raise RuntimeError("connection refused")

    monkeypatch.setattr(main.engine, "connect", explode)

    app = FastAPI()
    app.add_api_route("/health/db", main.health_db, methods=["GET"])

    response = TestClient(app).get("/health/db")

    assert response.status_code == 503
    assert response.json()["database"] == "unhealthy"
