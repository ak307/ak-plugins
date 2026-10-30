"""Read live data safely while investigating a bug.

AK connects projects to production so bugs can be investigated against real
data. This tool is the only way Claude queries that data. It is read-only by
construction:

- one statement per run, and it must be a SELECT / WITH / SHOW / EXPLAIN /
  DESCRIBE; anything that writes, locks rows or touches files is refused;
- it runs inside a READ ONLY transaction (PostgreSQL also gets
  default_transaction_read_only), with a statement timeout, and is always
  rolled back; SQLite files are opened read-only;
- at most --limit rows are fetched (default 50, max 500);
- sensitive columns are masked: passwords, tokens, salary and medical details
  are hidden; NRIC/FIN, bank and card numbers show only their last 4
  characters; e-mail and phone are partly hidden; NRIC-shaped values are
  masked in every column;
- credentials are never printed; each query is logged (statement only, no
  results) to ~/.arkar/readonly-queries.log.

Connection, first match wins, read from the project's .env:
  READONLY_DATABASE_URL  (recommended: a database user with SELECT only)
  DATABASE_URL / DB_URL / *_DATABASE_URL
  DB_CONNECTION + DB_HOST/DB_PORT/DB_DATABASE/DB_USERNAME/DB_PASSWORD  (Laravel)
  DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD                          (Django template)
  DATABASE_PATH / DB_PATH                                              (SQLite file)

Usage (from the project folder):
  uv run --with pymysql --with "psycopg[binary]" python <this file> "SELECT id, status FROM leave_requests WHERE id = 42"
  options: --limit N   --project <folder>   --engine mysql|postgres|sqlite
"""
from __future__ import annotations

import argparse
import datetime
import re
import sys
from pathlib import Path
from urllib.parse import unquote, urlparse

DEFAULT_LIMIT = 50
MAX_LIMIT = 500
TIMEOUT_MS = 10_000
MAX_CELL = 120

ALLOWED_FIRST_WORDS = {"select", "with", "show", "explain", "describe", "desc"}
FORBIDDEN_WORDS = [
    "insert", "update", "delete", "drop", "alter", "create", "truncate", "grant", "revoke",
    "merge", "rename", "call", "do", "set", "lock", "unlock", "handler", "load",
    "copy", "vacuum", "analyze", "cluster", "reindex", "refresh", "listen", "notify", "prepare",
    "execute", "deallocate", "into", "outfile", "dumpfile", "commit", "rollback", "begin", "savepoint",
]
FORBIDDEN_PHRASES = [
    r"\bfor\s+(update|share|no\s+key\s+update|key\s+share)\b",
    r"\block\s+in\s+share\s+mode\b",
    r"\b(pg_terminate_backend|pg_cancel_backend|pg_reload_conf|pg_rotate_logfile|set_config|pg_read_file|"
    r"pg_read_binary_file|pg_ls_dir|pg_sleep|lo_import|lo_export|lo_unlink|dblink\w*|load_file|sleep|benchmark|"
    r"get_lock|release_lock|release_all_locks|sys_exec|sys_eval|nextval|setval)\s*\(",
]

FULLY_HIDDEN = re.compile(r"pass(word)?|passwd|secret|token|api_?key|private_?key|otp|\bpin\b|hash|salt|"
                          r"medical|diagnos|illness|mc_reason|health|salary|wage|\bpay\b|income|allowance|bonus", re.I)
LAST_FOUR = re.compile(r"nric|\bfin\b|fin_no|ic_?no|ic_?number|identity|passport|bank|account_?no|card", re.I)
EMAIL = re.compile(r"e_?mail", re.I)
PHONE = re.compile(r"phone|mobile|contact_?no|hp_?no|\btel\b", re.I)
NRIC_VALUE = re.compile(r"\b[STFGM]\d{7}[A-Z]\b", re.I)

LOG_FILE = Path.home() / ".arkar" / "readonly-queries.log"


class RefusedQuery(Exception):
    pass


# ---------------------------------------------------------------------------
# Checking the statement
# ---------------------------------------------------------------------------

def without_strings_and_comments(sql: str) -> str:
    """Blank out string literals, quoted identifiers and comments, so keyword checks only see SQL."""
    sql = re.sub(r"/\*.*?\*/", " ", sql, flags=re.S)
    sql = re.sub(r"(--|#)[^\n]*", " ", sql)
    sql = re.sub(r"'(?:[^'\\]|\\.|'')*'", "''", sql)
    sql = re.sub(r'"(?:[^"\\]|\\.)*"', '""', sql)
    sql = re.sub(r"`[^`]*`", "``", sql)
    return sql


def check_statement(sql: str) -> str:
    """Return the statement to run, or raise RefusedQuery explaining why it is not allowed."""
    statement = sql.strip().rstrip(";").strip()
    if not statement:
        raise RefusedQuery("empty statement")
    bare = without_strings_and_comments(statement).lower()
    if ";" in bare:
        raise RefusedQuery("only one statement per run")
    first_word = bare.split(None, 1)[0] if bare.split() else ""
    if first_word not in ALLOWED_FIRST_WORDS:
        raise RefusedQuery(f"only SELECT, WITH, SHOW, EXPLAIN and DESCRIBE are allowed (got {first_word.upper()})")
    if first_word == "explain" and re.search(r"\banalyze\b", bare):
        raise RefusedQuery("EXPLAIN ANALYZE executes the statement; use plain EXPLAIN")
    for word in FORBIDDEN_WORDS:
        if re.search(rf"\b{word}\b", bare):
            raise RefusedQuery(f"'{word.upper()}' is not allowed in a read-only query")
    for phrase in FORBIDDEN_PHRASES:
        match = re.search(phrase, bare)
        if match:
            raise RefusedQuery(f"'{match.group(0).strip()}' is not allowed in a read-only query")
    return statement


# ---------------------------------------------------------------------------
# Finding the connection
# ---------------------------------------------------------------------------

def read_env(project: Path) -> dict:
    env_file = project / ".env"
    values = {}
    if not env_file.is_file():
        return values
    for line in env_file.read_text(errors="ignore").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.replace("export ", "").strip()] = value.split(" #")[0].strip().strip("'\"")
    return values


def engine_from_scheme(scheme: str) -> str | None:
    scheme = scheme.lower().split("+")[0]
    if scheme in ("mysql", "mariadb"):
        return "mysql"
    if scheme in ("postgres", "postgresql", "pgsql"):
        return "postgres"
    if scheme == "sqlite":
        return "sqlite"
    return None


def connection_from_url(url: str) -> dict:
    parsed = urlparse(url)
    engine = engine_from_scheme(parsed.scheme)
    if engine is None:
        raise RefusedQuery(f"unsupported database type '{parsed.scheme}'")
    if engine == "sqlite":
        path = url.split(":///", 1)[1] if ":///" in url else parsed.path
        return {"engine": "sqlite", "path": path}
    return {
        "engine": engine,
        "host": parsed.hostname or "localhost",
        "port": parsed.port,
        "database": unquote(parsed.path.lstrip("/")),
        "user": unquote(parsed.username or ""),
        "password": unquote(parsed.password or ""),
    }


def find_connection(env: dict, engine_hint: str | None) -> tuple[dict, str]:
    """Return (connection settings, which .env keys were used)."""
    if env.get("READONLY_DATABASE_URL"):
        return connection_from_url(env["READONLY_DATABASE_URL"]), "READONLY_DATABASE_URL (read-only user)"
    for key in sorted(env):
        if key in ("DATABASE_URL", "DB_URL") or key.endswith("_DATABASE_URL"):
            if env[key] and "://" in env[key]:
                return connection_from_url(env[key]), key
    if env.get("DB_CONNECTION") and env.get("DB_DATABASE"):
        engine = {"pgsql": "postgres", "sqlite": "sqlite", "mariadb": "mysql"}.get(env["DB_CONNECTION"], env["DB_CONNECTION"])
        if engine == "sqlite":
            return {"engine": "sqlite", "path": env["DB_DATABASE"]}, "DB_CONNECTION/DB_DATABASE"
        return {
            "engine": engine,
            "host": env.get("DB_HOST", "127.0.0.1"),
            "port": int(env["DB_PORT"]) if env.get("DB_PORT") else None,
            "database": env["DB_DATABASE"],
            "user": env.get("DB_USERNAME", ""),
            "password": env.get("DB_PASSWORD", ""),
        }, "DB_CONNECTION/DB_HOST/DB_DATABASE"
    if env.get("DB_NAME"):
        port = int(env["DB_PORT"]) if env.get("DB_PORT") else None
        engine = engine_hint or ("postgres" if port == 5432 else "mysql")
        return {
            "engine": engine,
            "host": env.get("DB_HOST", "localhost"),
            "port": port,
            "database": env["DB_NAME"],
            "user": env.get("DB_USER", ""),
            "password": env.get("DB_PASSWORD", ""),
        }, "DB_HOST/DB_NAME"
    for key in ("DATABASE_PATH", "DB_PATH"):
        if env.get(key):
            return {"engine": "sqlite", "path": env[key]}, key
    raise RefusedQuery("no database settings found in .env (add READONLY_DATABASE_URL)")


# ---------------------------------------------------------------------------
# Running it read-only
# ---------------------------------------------------------------------------

def run_mysql(settings: dict, statement: str, limit: int):
    import pymysql

    connection = pymysql.connect(
        host=settings["host"], port=settings["port"] or 3306, user=settings["user"],
        password=settings["password"], database=settings["database"], charset="utf8mb4",
        connect_timeout=5, read_timeout=TIMEOUT_MS // 1000 + 5, autocommit=False,
    )
    try:
        with connection.cursor() as cursor:
            cursor.execute("SET SESSION TRANSACTION READ ONLY")
            cursor.execute(f"SET SESSION MAX_EXECUTION_TIME = {TIMEOUT_MS}")
            cursor.execute("START TRANSACTION READ ONLY")
            cursor.execute(statement)
            columns = [column[0] for column in cursor.description or []]
            rows = cursor.fetchmany(limit + 1)
        return columns, rows
    finally:
        connection.rollback()
        connection.close()


def run_postgres(settings: dict, statement: str, limit: int):
    import psycopg

    connection = psycopg.connect(
        host=settings["host"], port=settings["port"] or 5432, user=settings["user"] or None,
        password=settings["password"] or None, dbname=settings["database"], connect_timeout=5,
        options=f"-c default_transaction_read_only=on -c statement_timeout={TIMEOUT_MS} -c lock_timeout=2000",
    )
    connection.read_only = True
    try:
        with connection.cursor() as cursor:
            cursor.execute(statement)
            columns = [column.name for column in cursor.description or []]
            rows = cursor.fetchmany(limit + 1)
        return columns, rows
    finally:
        connection.rollback()
        connection.close()


def run_sqlite(settings: dict, statement: str, limit: int, project: Path):
    import sqlite3

    path = Path(settings["path"])
    if not path.is_absolute():
        path = project / path
    if not path.is_file():
        raise RefusedQuery(f"SQLite file not found: {path.name}")
    connection = sqlite3.connect(f"file:{path}?mode=ro", uri=True, timeout=TIMEOUT_MS / 1000)
    try:
        connection.execute("PRAGMA query_only = ON")
        cursor = connection.execute(statement)
        columns = [column[0] for column in cursor.description or []]
        rows = cursor.fetchmany(limit + 1)
        return columns, rows
    finally:
        connection.close()


# ---------------------------------------------------------------------------
# Masking and output
# ---------------------------------------------------------------------------

def mask_value(column: str, value):
    if value is None:
        return None
    text = str(value)
    if FULLY_HIDDEN.search(column):
        return "[hidden]"
    if LAST_FOUR.search(column):
        return "****" + text[-4:] if len(text) > 4 else "****"
    if EMAIL.search(column) and "@" in text:
        name, domain = text.split("@", 1)
        return f"{name[:1]}***@{domain}"
    if PHONE.search(column):
        return "****" + text[-4:] if len(text) > 4 else "****"
    return NRIC_VALUE.sub(lambda match: match.group(0)[0] + "****" + match.group(0)[-4:], text)


def masked_columns(columns: list) -> list:
    return [c for c in columns if FULLY_HIDDEN.search(c) or LAST_FOUR.search(c) or EMAIL.search(c) or PHONE.search(c)]


def format_table(columns: list, rows: list) -> str:
    cells = [[("NULL" if value is None else str(value))[:MAX_CELL] for value in row] for row in rows]
    widths = [max([len(c)] + [len(r[i]) for r in cells]) for i, c in enumerate(columns)]
    lines = [" | ".join(c.ljust(w) for c, w in zip(columns, widths)),
             "-+-".join("-" * w for w in widths)]
    lines += [" | ".join(v.ljust(w) for v, w in zip(row, widths)) for row in cells]
    return "\n".join(lines)


def describe_target(settings: dict) -> str:
    if settings.get("path"):
        return Path(settings["path"]).name
    return f"{settings.get('host')}/{settings.get('database')}"


def without_credentials(message: str, settings: dict) -> str:
    for secret in (settings.get("password"), settings.get("user")):
        if secret:
            message = message.replace(secret, "***")
    return message


def log_query(project: Path, settings: dict, statement: str) -> None:
    try:
        LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
        where = describe_target(settings)
        stamp = datetime.datetime.now().isoformat(timespec="seconds")
        with LOG_FILE.open("a", encoding="utf-8") as log:
            log.write(f"{stamp}\t{project}\t{where}\t{' '.join(statement.split())}\n")
    except OSError:
        pass  # logging must never stop an investigation


def main() -> int:
    parser = argparse.ArgumentParser(description="Run one read-only query against the project's database.")
    parser.add_argument("sql")
    parser.add_argument("--limit", type=int, default=DEFAULT_LIMIT)
    parser.add_argument("--project", default=".")
    parser.add_argument("--engine", choices=["mysql", "postgres", "sqlite"])
    args = parser.parse_args()
    project = Path(args.project).resolve()
    limit = max(1, min(args.limit, MAX_LIMIT))

    settings = {}
    try:
        statement = check_statement(args.sql)
        settings, source = find_connection(read_env(project), args.engine)
        if args.engine:
            settings["engine"] = args.engine
        log_query(project, settings, statement)
        if settings["engine"] == "mysql":
            columns, rows = run_mysql(settings, statement, limit)
        elif settings["engine"] == "postgres":
            columns, rows = run_postgres(settings, statement, limit)
        else:
            columns, rows = run_sqlite(settings, statement, limit, project)
    except RefusedQuery as error:
        print(f"Refused: {error}", file=sys.stderr)
        return 2
    except ImportError as error:
        print(f"Missing driver ({error.name}). Run with: uv run --with pymysql --with \"psycopg[binary]\" python ...",
              file=sys.stderr)
        return 3
    except Exception as error:  # report database errors without credentials
        print(f"Query failed: {type(error).__name__}: {without_credentials(str(error), settings)[:300]}",
              file=sys.stderr)
        return 1

    more = len(rows) > limit
    rows = [[mask_value(column, value) for column, value in zip(columns, row)] for row in rows[:limit]]
    print(f"read-only query on {settings['engine']} {describe_target(settings)} via {source}")
    print(format_table(columns, rows))
    print(f"({len(rows)} row(s){'; more rows exist — narrow the query' if more else ''})")
    hidden = masked_columns(columns)
    if hidden:
        print(f"masked columns: {', '.join(hidden)}")
    if "READONLY" not in source:
        print("note: no read-only database user configured; ran in a READ ONLY transaction on the app's connection. "
              "Ask AK to add READONLY_DATABASE_URL (a user with SELECT only).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
