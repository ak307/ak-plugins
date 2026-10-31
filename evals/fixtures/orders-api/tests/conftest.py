import pytest
from fastapi.testclient import TestClient

from app import database
from app.main import app, get_db


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(database, "DATABASE_PATH", str(tmp_path / "test.db"))
    connection = database.get_connection()
    database.create_tables(connection)

    def use_test_db():
        yield connection

    app.dependency_overrides[get_db] = use_test_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    connection.close()
