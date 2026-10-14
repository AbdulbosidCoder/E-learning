import os
import sys
import tempfile

import pytest

_tmp = tempfile.mkdtemp()
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp}/test.db"
os.environ["UPLOAD_DIR"] = f"{_tmp}/uploads"
os.environ["ADMIN_EMAIL"] = "admin@company.uz"
os.environ["ADMIN_PASSWORD"] = "admin12345"
os.environ["COMPANY_EMAIL_DOMAIN"] = "company.uz"
os.environ["ANTHROPIC_API_KEY"] = ""
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


def login(client, email, password):
    r = client.post("/api/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture(scope="session")
def admin(client):
    return login(client, "admin@company.uz", "admin12345")


@pytest.fixture(scope="session")
def employee(client, admin):
    r = client.post(
        "/api/users",
        json={"email": "ali@company.uz", "password": "secret123", "full_name": "Ali", "role": "employee"},
        headers=admin,
    )
    assert r.status_code == 201, r.text
    return login(client, "ali@company.uz", "secret123")
