from fastapi import FastAPI, Request, Response
from fastapi.testclient import TestClient


def test_rate_limit_returns_custom_error_response():
    from app.rate_limit import configure_rate_limiting, limiter

    app = FastAPI()
    configure_rate_limiting(app)

    @app.get("/limited")
    @limiter.limit("1/minute")
    def limited(request: Request, response: Response):
        return {"ok": True}

    client = TestClient(app)

    assert client.get("/limited").status_code == 200
    response = client.get("/limited")

    assert response.status_code == 429
    assert response.json()["error"].startswith("Rate limit exceeded, retry after ")
    assert response.json()["error"].endswith(" seconds")
