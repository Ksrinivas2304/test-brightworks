import importlib
import os
import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from main import Base, Todo, get_db, app


# AC-4: The backend exposes create, list, update, and delete todo operations with valid request and response schemas
# AC-5: Invalid backend requests return non-2xx responses with structured error information
# AC-6: Todo data persists across backend requests using a managed database rather than in-memory sample data


@pytest.fixture()
def sqlite_url():
    db_dir = tempfile.TemporaryDirectory()
    db_path = Path(db_dir.name) / "todos.db"
    yield f"sqlite:///{db_path}"
    db_dir.cleanup()


@pytest.fixture()
def client(sqlite_url, monkeypatch):
    test_engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client, test_engine
    app.dependency_overrides.clear()


def test_get_empty_todos_returns_bare_json_array(client):
    test_client, _ = client

    resp = test_client.get("/api/todos")

    assert resp.status_code == 200
    assert resp.json() == []


def test_post_todo_creates_todo_with_exact_contract(client):
    test_client, _ = client

    resp = test_client.post("/api/todos", json={"title": "Write tests"})

    assert resp.status_code == 201
    assert resp.json() == {"id": 1, "title": "Write tests", "completed": False}


def test_patch_todo_updates_title_and_completed(client):
    test_client, _ = client
    created = test_client.post("/api/todos", json={"title": "Old title"}).json()

    resp = test_client.patch(f"/api/todos/{created['id']}", json={"title": "New title", "completed": True})

    assert resp.status_code == 200
    assert resp.json() == {"id": created["id"], "title": "New title", "completed": True}


def test_delete_todo_returns_204_no_body(client):
    test_client, _ = client
    created = test_client.post("/api/todos", json={"title": "Delete me"}).json()

    resp = test_client.delete(f"/api/todos/{created['id']}")

    assert resp.status_code == 204
    assert resp.content == b""


def test_get_todos_persists_created_items_across_requests(client):
    test_client, _ = client
    create_resp = test_client.post("/api/todos", json={"title": "Persist me"})
    todo_id = create_resp.json()["id"]

    list_resp = test_client.get("/api/todos")

    assert list_resp.status_code == 200
    assert list_resp.json() == [{"id": todo_id, "title": "Persist me", "completed": False}]


@pytest.mark.parametrize(
    "method,url,payload,expected_status",
    [
        ("post", "/api/todos", {}, 422),
        ("post", "/api/todos", {"title": ""}, 422),
        ("patch", "/api/todos/999", {"title": "x"}, 404),
        ("patch", "/api/todos/999", {"completed": True}, 404),
        ("delete", "/api/todos/999", None, 404),
    ],
)
def test_invalid_requests_return_structured_json_errors(client, method, url, payload, expected_status):
    test_client, _ = client
    resp = getattr(test_client, method)(url, json=payload) if payload is not None else getattr(test_client, method)(url)

    assert resp.status_code == expected_status
    assert resp.headers["content-type"].startswith("application/json")
    assert "detail" in resp.json()
