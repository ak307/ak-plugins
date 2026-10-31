"""Checks that the code in the skills' templates is real code.

- Every Python, PHP, YAML, JSON and TOML block in the skill references parses.
- The FastAPI template is assembled into a project and its tests run against a
  real PostgreSQL database (skipped unless ARKAR_TEST_POSTGRES_URL is set, e.g.
  postgresql+psycopg://postgres@127.0.0.1:54329/postgres).
"""
import ast
import json
import os
import re
import shutil
import subprocess
import textwrap
import tomllib
import uuid
from pathlib import Path

import pytest
import yaml

ROOT = Path(__file__).resolve().parents[1]
SKILLS = ROOT / "plugins" / "arkar-dev-standards" / "skills"
DOCS = sorted(SKILLS.rglob("*.md"))
FENCE = re.compile(r"```(\w+)\n(.*?)\n\s*```", re.S)


def blocks(language: str):
    for doc in DOCS:
        for number, (fence_language, body) in enumerate(FENCE.findall(doc.read_text())):
            if fence_language == language:
                # Blocks inside list items are indented in the Markdown.
                yield pytest.param(textwrap.dedent(body), id=f"{doc.relative_to(SKILLS)}#{number}")


@pytest.mark.parametrize("code", list(blocks("python")))
def test_python_blocks_parse(code):
    ast.parse(code)


@pytest.mark.parametrize("code", list(blocks("yaml")))
def test_yaml_blocks_parse(code):
    yaml.safe_load(code)


@pytest.mark.parametrize("code", list(blocks("json")))
def test_json_blocks_parse(code):
    json.loads(code)


@pytest.mark.parametrize("code", list(blocks("toml")))
def test_toml_blocks_parse(code):
    tomllib.loads(code)


@pytest.mark.skipif(shutil.which("php") is None, reason="php not installed")
@pytest.mark.parametrize("code", list(blocks("php")))
def test_php_blocks_parse(code, tmp_path):
    source = code if code.lstrip().startswith("<?php") else "<?php\n" + code
    if re.match(r"\s*(//[^\n]*\n\s*)*(protected|public|private) function", code):
        source = "<?php\nabstract class ExampleBase {}\nclass Example extends ExampleBase {\n" + code + "\n}\n"
    file = tmp_path / "block.php"
    file.write_text(source)
    result = subprocess.run(["php", "-l", str(file)], capture_output=True, text=True)
    assert result.returncode == 0, result.stdout + result.stderr


# ---------------------------------------------------------------------------
# The FastAPI template, assembled and run
# ---------------------------------------------------------------------------

FASTAPI_DOC = SKILLS / "arkar-project-structure" / "references" / "fastapi.md"
POSTGRES_URL = os.environ.get("ARKAR_TEST_POSTGRES_URL")

PERMISSION_TESTS = '''
import jwt
import pytest

from app.core.config import settings
from app.models.user import User


def auth(user):
    token = jwt.encode({"sub": str(user.id)}, settings.jwt_secret.get_secret_value(), algorithm="HS256")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def users(db):
    alice = User(email="alice@example.com", full_name="Alice")
    bob = User(email="bob@example.com", full_name="Bob")
    admin = User(email="admin@example.com", full_name="Admin", is_admin=True)
    db.add_all([alice, bob, admin])
    db.flush()
    return alice, bob, admin


def test_owner_reads_own_profile(client, users):
    alice, _, _ = users
    assert client.get(f"/users/{alice.id}", headers=auth(alice)).status_code == 200


def test_other_user_is_forbidden(client, users):
    alice, bob, _ = users
    assert client.get(f"/users/{alice.id}", headers=auth(bob)).status_code == 403


def test_no_token_is_unauthorised(client, users):
    alice, _, _ = users
    assert client.get(f"/users/{alice.id}").status_code == 401


def test_only_admins_list_and_create(client, users):
    alice, _, admin = users
    assert client.get("/users", headers=auth(alice)).status_code == 403
    assert client.get("/users", headers=auth(admin)).status_code == 200
    created = client.post("/users", json={"email": "new@example.com", "full_name": "New"}, headers=auth(admin))
    assert created.status_code == 201


def test_health_and_docs(client):
    assert client.get("/health/live").json() == {"status": "ok"}
    assert client.get("/health/ready").status_code == 200
    assert client.get("/docs").status_code == 404  # APP_ENV=production in this test
'''


def assemble_fastapi_project(target: Path) -> None:
    """Write each file the template shows into a project folder."""
    by_content = {
        "async def lifespan": "app/main.py",
        "class Settings(BaseSettings)": "app/core/config.py",
        "DbSession = Annotated": "app/core/database.py",
        "class User(Base)": "app/models/user.py",
        "class UserCreate": "app/schemas/user.py",
        "def ensure_can_manage": "app/services/user_service.py",
        'APIRouter(prefix="/users"': "app/routers/users.py",
        'APIRouter(prefix="/health"': "app/routers/health.py",
        "TEST_DATABASE_URL": "tests/conftest.py",
    }
    for code in FENCE.findall(FASTAPI_DOC.read_text()):
        language, body = code
        if language != "python":
            continue
        header = re.match(r"#\s*(app/\S+\.py|tests/\S+\.py)", body.splitlines()[0])
        path = header.group(1) if header else next((p for marker, p in by_content.items() if marker in body), None)
        if path:
            (target / path).parent.mkdir(parents=True, exist_ok=True)
            (target / path).write_text(body)
    for package in ("app", "app/core", "app/models", "app/routers", "app/schemas", "app/services", "tests"):
        (target / package / "__init__.py").touch()
    (target / "app" / "models" / "__init__.py").write_text("from app.models.user import User\n")
    (target / "app" / "core" / "exceptions.py").write_text(
        "class NotFoundError(Exception):\n    pass\n\n\nclass ConflictError(Exception):\n    pass\n\n\n"
        "class ForbiddenError(Exception):\n    pass\n")
    (target / "app" / "core" / "logging.py").write_text(
        "import logging\n\n\ndef setup_logging() -> None:\n    logging.basicConfig(level=logging.INFO)\n")
    (target / "tests" / "test_users.py").write_text(PERMISSION_TESTS)
    (target / "pyproject.toml").write_text(
        '[project]\nname = "template-check"\nversion = "0.1.0"\nrequires-python = ">=3.12"\n'
        'dependencies = ["fastapi[standard]>=0.115", "sqlalchemy>=2.0", "pydantic-settings", "pyjwt", '
        '"psycopg[binary]", "email-validator", "pytest>=8", "httpx"]\n'
        '[tool.pytest.ini_options]\npythonpath = ["."]\n')


@pytest.mark.skipif(not POSTGRES_URL, reason="set ARKAR_TEST_POSTGRES_URL to run the FastAPI template")
def test_fastapi_template_runs(tmp_path):
    import psycopg

    database = f"template_test_{uuid.uuid4().hex[:8]}"
    admin_url = POSTGRES_URL.replace("postgresql+psycopg://", "postgresql://")
    with psycopg.connect(admin_url, autocommit=True) as connection:
        connection.execute(f"CREATE DATABASE {database}")
    test_url = POSTGRES_URL.rsplit("/", 1)[0] + f"/{database}"

    project = tmp_path / "template"
    assemble_fastapi_project(project)
    environment = {**os.environ, "APP_ENV": "production", "DATABASE_URL": test_url, "TEST_DATABASE_URL": test_url,
                   "JWT_SECRET": "template-check-not-a-real-secret-0123456789"}
    result = subprocess.run(["uv", "run", "-q", "pytest", "-q"], cwd=project, env=environment,
                            capture_output=True, text=True, timeout=600)
    assert result.returncode == 0, result.stdout[-3000:] + result.stderr[-2000:]

    guard = subprocess.run(["uv", "run", "-q", "pytest", "-q"], cwd=project,
                           env={**environment, "TEST_DATABASE_URL": "postgresql+psycopg://x@db.prod.example:5432/live_test"},
                           capture_output=True, text=True, timeout=600)
    assert guard.returncode != 0 and "local test database" in (guard.stdout + guard.stderr)
