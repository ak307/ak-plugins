import pytest
from fastapi.testclient import TestClient

from app import database
from app.main import app


@pytest.fixture
def client():
    # Start every test from an empty table so results don't depend on old rows.
    connection = database.get_connection()
    database.create_tables(connection)
    connection.execute("DELETE FROM expense_requests")
    connection.commit()
    connection.close()
    yield TestClient(app)
