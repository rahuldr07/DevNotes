from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.testclient import TestClient
from pydantic import BaseModel


def test_validation_error_returns_friendly_envelope():
    from app.main import validation_exception_handler

    class Payload(BaseModel):
        title: str

    app = FastAPI()
    app.add_exception_handler(RequestValidationError, validation_exception_handler)

    @app.post("/payload")
    def payload(body: Payload):
        return body

    client = TestClient(app)
    response = client.post("/payload", json={})

    assert response.status_code == 422
    body = response.json()
    assert body["detail"] == "Validation failed"
    assert body["hint"] == "Check the marked fields and try again."
    assert body["errors"][0]["loc"][-1] == "title"
