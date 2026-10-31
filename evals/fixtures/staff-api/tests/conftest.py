import pytest
from fastapi.testclient import TestClient

from app import database
from app.main import app, get_db


@pytest.fixture
def db(tmp_path, monkeypatch):
    monkeypatch.setattr(database, "DATABASE_PATH", str(tmp_path / "test.db"))
    connection = database.get_connection()
    database.create_tables(connection)
    connection.executemany(
        "INSERT INTO staff (id, name, department, phone, salary, api_token) VALUES (?, ?, ?, ?, ?, ?)",
        [
            (1, "Aung Ko", "IT", "81234567", 5200, "token-aung"),
            (2, "Mei Lin", "Finance", "92345678", 6100, "token-mei"),
            (3, "Ravi Kumar", "Security", "83456789", 3900, "token-ravi"),
        ],
    )
    connection.commit()
    yield connection
    connection.close()


@pytest.fixture
def client(db):
    def use_test_db():
        yield db

    app.dependency_overrides[get_db] = use_test_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
