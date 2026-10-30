"""Tests for the read-only live-data query tool.

Run from the repo root:  uvx --with "psycopg[binary]" --with pymysql pytest tests -q
PostgreSQL tests use a server on 127.0.0.1:54329 (any local PostgreSQL with
trust auth) and are skipped when none is running.
"""
import importlib.util
import json
import os
import shutil
import sqlite3
import subprocess
import sys
import types
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
TOOL = ROOT / "plugins" / "arkar-dev-standards" / "skills" / "arkar-change-workflow" / "scripts" / "readonly_query.py"
GUARD = ROOT / "plugins" / "arkar-dev-standards" / "hooks" / "production_guard.sh"

spec = importlib.util.spec_from_file_location("readonly_query", TOOL)
readonly_query = importlib.util.module_from_spec(spec)
spec.loader.exec_module(readonly_query)


ALLOWED = [
    "SELECT id, status FROM expense_requests WHERE id = 3",
    "select * from leave_requests where reason = 'delete me; drop table x' limit 5",
    "WITH recent AS (SELECT * FROM jobs WHERE created_at > now() - interval '1 day') SELECT count(*) FROM recent",
    "SELECT REPLACE(name, 'a', 'b'), updated_at, deleted_at, created_at FROM users",
    "SHOW TABLES",
    "DESCRIBE leave_requests",
    "EXPLAIN SELECT * FROM leave_requests WHERE staff_id = 7",
    "SELECT status, count(*) FROM leave_requests GROUP BY status ORDER BY 2 DESC LIMIT 10 OFFSET 0;",
    "-- which claims are stuck?\nSELECT id FROM expense_requests WHERE status = 'finance_approved'",
]

REFUSED = [
    "DELETE FROM expense_requests",
    "UPDATE users SET role = 'admin' WHERE id = 1",
    "SELECT 1; DELETE FROM users",
    "SELECT * FROM users FOR UPDATE",
    "SELECT * FROM users LOCK IN SHARE MODE",
    "SELECT * INTO OUTFILE '/tmp/users.csv' FROM users",
    "SELECT * INTO backup_users FROM users",
    "WITH gone AS (DELETE FROM jobs RETURNING *) SELECT * FROM gone",
    "EXPLAIN ANALYZE DELETE FROM jobs",
    "SELECT pg_terminate_backend(123)",
    "SELECT sleep(100)",
    "SELECT pg_sleep(100)",
    "SELECT load_file('/etc/passwd')",
    "SELECT set_config('default_transaction_read_only', 'off', false)",
    "SET SESSION TRANSACTION READ WRITE",
    "TRUNCATE jobs",
    "DROP TABLE users",
    "CALL purge_old_records()",
    "COPY users TO '/tmp/u.csv'",
    "/* sneaky */ INSERT INTO users VALUES (1)",
    "",
]


@pytest.mark.parametrize("sql", ALLOWED)
def test_read_queries_are_allowed(sql):
    assert readonly_query.check_statement(sql)


@pytest.mark.parametrize("sql", REFUSED)
def test_writes_locks_and_tricks_are_refused(sql):
    with pytest.raises(readonly_query.RefusedQuery):
        readonly_query.check_statement(sql)


def test_masking():
    mask = readonly_query.mask_value
    assert mask("password", "hunter2") == "[hidden]"
    assert mask("remember_token", "abc") == "[hidden]"
    assert mask("medical_reason", "fever") == "[hidden]"
    assert mask("nric", "S1234567A") == "****567A"
    assert mask("basic_salary", 4800) == "[hidden]"
    assert mask("email", "tan.weiming@cbm.com.sg") == "t***@cbm.com.sg"
    assert mask("mobile_no", "91234567") == "****4567"
    assert mask("remarks", "staff S1234567A asked") == "staff S****567A asked"
    assert mask("status", "approved") == "approved"
    assert mask("anything", None) is None


def test_connection_settings_never_need_printing():
    settings, source = readonly_query.find_connection(
        {"DB_CONNECTION": "mysql", "DB_HOST": "10.1.2.3", "DB_DATABASE": "hrms", "DB_USERNAME": "app", "DB_PASSWORD": "pw"}, None)
    assert settings["engine"] == "mysql" and source.startswith("DB_CONNECTION")
    settings, source = readonly_query.find_connection(
        {"DATABASE_URL": "postgresql+psycopg://a:b@db.internal:5432/agents", "READONLY_DATABASE_URL": "mysql://ro:x@h/hrms"}, None)
    assert source.startswith("READONLY") and settings["user"] == "ro"
    assert "pw" not in readonly_query.without_credentials("Access denied for user app (password pw)",
                                                           {"password": "pw", "user": "app"})


# ---------------------------------------------------------------------------
# SQLite: real file, opened read-only
# ---------------------------------------------------------------------------

def make_sqlite_project(tmp_path):
    database = tmp_path / "live" / "claims.db"
    database.parent.mkdir()
    connection = sqlite3.connect(database)
    connection.execute("CREATE TABLE expense_requests (id INTEGER PRIMARY KEY, staff_name TEXT, nric TEXT, amount REAL, status TEXT)")
    for number in range(1, 61):
        connection.execute("INSERT INTO expense_requests (staff_name, nric, amount, status) VALUES (?, ?, ?, ?)",
                           (f"Staff {number}", f"S{1000000 + number}A", number * 10.0, "submitted"))
    connection.commit()
    connection.close()
    project = tmp_path / "project"
    project.mkdir()
    (project / ".env").write_text(f"APP_ENV=production\nDATABASE_PATH={database}\n")
    return project, database


def run_tool(project, sql, *extra):
    return subprocess.run([sys.executable, str(TOOL), sql, "--project", str(project), *extra],
                          capture_output=True, text=True, env={**os.environ, "HOME": str(project)})


def test_sqlite_select_limits_and_masks(tmp_path):
    project, _ = make_sqlite_project(tmp_path)
    result = run_tool(project, "SELECT id, staff_name, nric, status FROM expense_requests ORDER BY id")
    assert result.returncode == 0, result.stderr
    assert "(50 row(s); more rows exist" in result.stdout
    assert "S1000001A" not in result.stdout and "****001A" in result.stdout
    assert "masked columns: nric" in result.stdout
    assert "read-only database user" in result.stdout


def test_sqlite_refuses_writes_and_data_is_unchanged(tmp_path):
    project, database = make_sqlite_project(tmp_path)
    result = run_tool(project, "DELETE FROM expense_requests")
    assert result.returncode == 2 and "Refused" in result.stderr
    assert sqlite3.connect(database).execute("SELECT count(*) FROM expense_requests").fetchone()[0] == 60


def test_sqlite_is_read_only_even_if_the_checker_were_bypassed(tmp_path):
    project, database = make_sqlite_project(tmp_path)
    with pytest.raises(sqlite3.OperationalError):
        readonly_query.run_sqlite({"path": str(database)}, "DELETE FROM expense_requests", 10, project)
    assert sqlite3.connect(database).execute("SELECT count(*) FROM expense_requests").fetchone()[0] == 60


def test_queries_are_logged_without_results(tmp_path):
    project, _ = make_sqlite_project(tmp_path)
    run_tool(project, "SELECT nric FROM expense_requests WHERE id = 1")
    log = (project / ".arkar" / "readonly-queries.log").read_text()
    assert "SELECT nric FROM expense_requests WHERE id = 1" in log and "S1000001A" not in log


def test_production_guard_lets_the_read_only_tool_through(tmp_path):
    project, _ = make_sqlite_project(tmp_path)
    command = f'uv run --with pymysql --with "psycopg[binary]" python {TOOL} "SELECT * FROM expense_requests WHERE id = 3"'
    event = {"tool_name": "Bash", "tool_input": {"command": command}, "cwd": str(project)}
    result = subprocess.run([shutil.which("bash"), str(GUARD)], input=json.dumps(event), capture_output=True, text=True)
    assert result.stdout.strip() == ""


# ---------------------------------------------------------------------------
# MySQL: the session is put in read-only mode before the statement runs
# ---------------------------------------------------------------------------

def test_mysql_session_is_read_only_and_rolled_back(monkeypatch):
    executed, events = [], []

    class FakeCursor:
        description = [("id",), ("status",)]

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def execute(self, sql):
            executed.append(sql)

        def fetchmany(self, size):
            return [(1, "submitted")]

    class FakeConnection:
        def cursor(self):
            return FakeCursor()

        def rollback(self):
            events.append("rollback")

        def close(self):
            events.append("close")

    fake_pymysql = types.SimpleNamespace(connect=lambda **kwargs: FakeConnection())
    monkeypatch.setitem(sys.modules, "pymysql", fake_pymysql)
    settings = {"host": "10.1.2.3", "port": None, "user": "app", "password": "pw", "database": "hrms"}
    columns, rows = readonly_query.run_mysql(settings, "SELECT id, status FROM leave_requests", 50)
    assert executed[:3] == ["SET SESSION TRANSACTION READ ONLY", "SET SESSION MAX_EXECUTION_TIME = 10000",
                            "START TRANSACTION READ ONLY"]
    assert executed[3] == "SELECT id, status FROM leave_requests"
    assert events == ["rollback", "close"] and columns == ["id", "status"]


# ---------------------------------------------------------------------------
# PostgreSQL: a real server, when one is running
# ---------------------------------------------------------------------------

PG_HOST = os.environ.get("ARKAR_TEST_PG_HOST", "127.0.0.1")


def postgres_available():
    try:
        import psycopg
        psycopg.connect(host=PG_HOST, port=54329, user="postgres", dbname="postgres", connect_timeout=2).close()
        return True
    except Exception:
        return False


needs_postgres = pytest.mark.skipif(not postgres_available(), reason="no PostgreSQL test server on port 54329")


@pytest.fixture
def postgres_project(tmp_path):
    import psycopg
    admin = psycopg.connect(host=PG_HOST, port=54329, user="postgres", dbname="postgres", autocommit=True)
    admin.execute("DROP DATABASE IF EXISTS claims_live")
    admin.execute("CREATE DATABASE claims_live")
    admin.close()
    connection = psycopg.connect(host=PG_HOST, port=54329, user="postgres", dbname="claims_live", autocommit=True)
    connection.execute("CREATE TABLE jobs (id serial PRIMARY KEY, name text, api_token text)")
    connection.execute("INSERT INTO jobs (name, api_token) SELECT 'job ' || n, 'tok' || n FROM generate_series(1, 5) n")
    connection.execute("CREATE FUNCTION wipe_jobs() RETURNS int LANGUAGE sql AS 'DELETE FROM jobs RETURNING 1'")
    connection.close()
    project = tmp_path / "project"
    project.mkdir()
    (project / ".env").write_text(f"APP_ENV=production\nDATABASE_URL=postgresql://postgres@{PG_HOST}:54329/claims_live\n")
    return project


def postgres_count():
    import psycopg
    with psycopg.connect(host=PG_HOST, port=54329, user="postgres", dbname="claims_live") as connection:
        return connection.execute("SELECT count(*) FROM jobs").fetchone()[0]


@needs_postgres
def test_postgres_select_works_and_masks(postgres_project):
    result = run_tool(postgres_project, "SELECT id, name, api_token FROM jobs ORDER BY id")
    assert result.returncode == 0, result.stderr
    assert "job 1" in result.stdout and "tok1" not in result.stdout and "[hidden]" in result.stdout


@needs_postgres
def test_postgres_transaction_blocks_writes_hidden_in_functions(postgres_project):
    # The checker allows a plain SELECT; the function inside it tries to delete.
    # The READ ONLY transaction must stop it.
    result = run_tool(postgres_project, "SELECT wipe_jobs()")
    assert result.returncode == 1 and "read-only" in result.stderr.lower()
    assert postgres_count() == 5


@needs_postgres
def test_postgres_is_read_only_even_if_the_checker_were_bypassed(postgres_project):
    settings, _ = readonly_query.find_connection(readonly_query.read_env(postgres_project), None)
    with pytest.raises(Exception, match="read-only"):
        readonly_query.run_postgres(settings, "DELETE FROM jobs", 10)
    assert postgres_count() == 5
