import os

import pytest

# The app reads DATABASE_URL when it is imported, so point it at the test database first.
# An environment variable wins over .env, so the development database is never touched.
TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL")
if TEST_DATABASE_URL is None:
    pytest.exit("Set TEST_DATABASE_URL to a throwaway MySQL database before running tests.")
os.environ["DATABASE_URL"] = TEST_DATABASE_URL

from fastapi.testclient import TestClient  # noqa: E402

from app.core.database import Base, engine  # noqa: E402
from app.main import app  # noqa: E402
import app.models  # noqa: E402,F401  (registers every table on Base.metadata)


@pytest.fixture
def client():
    """A test client on an empty database. Tables are recreated for every test."""
    Base.metadata.create_all(engine)
    with TestClient(app) as test_client:
        yield test_client
    Base.metadata.drop_all(engine)
    app.dependency_overrides.clear()
