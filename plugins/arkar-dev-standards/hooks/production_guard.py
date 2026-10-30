"""arkar production guard — a PreToolUse hook that runs before Claude's tool calls.

It exists because AK's projects are often connected to production databases, and
written rules alone can be skipped or forgotten. The guard:

- blocks commands that destroy data or history (wipe/rollback migrations, DROP,
  TRUNCATE, DELETE/UPDATE without WHERE, force push, reset --hard, ...);
- asks AK first before commands that run app code against the database (tests,
  migrations, seeders, shells, servers, queue workers, database clients) when the
  project's .env looks like production;
- blocks printing a whole .env file, so passwords and keys stay out of the chat.

Input: the hook event as JSON on stdin. Output: a JSON decision on stdout, or
nothing when the tool call may go ahead. Standard library only, Python 3.8+.
"""
from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

GUARD_NAME = "arkar production guard"

# ---------------------------------------------------------------------------
# Commands that are always blocked, whatever the environment.
# AK runs these himself, outside Claude, after a backup.
# ---------------------------------------------------------------------------
ALWAYS_BLOCK = [
    (r"\bartisan\s+(migrate:(fresh|refresh|reset|rollback)|db:wipe)\b",
     "it wipes or rolls back the database"),
    (r"\bartisan\s+(migrate|db:seed|db:wipe)\S*[^\n;&|]*\s--force\b",
     "--force skips Laravel's production confirmation"),
    (r"\bterraform\s+destroy\b", "it destroys infrastructure"),
    (r"\bfirebase\s+(firestore:delete|database:remove|auth:import)\b", "it deletes or overwrites live Firebase data"),
    (r"\bmanage\.py\s+(flush|sqlflush|reset_db)\b",
     "it deletes all data"),
    (r"\bmanage\.py\s+migrate\s+\S+\s+zero\b",
     "it rolls back every migration of an app"),
    (r"\balembic\s+downgrade\b",
     "it rolls back the database schema"),
    (r"\bgit\s+push\b[^\n;&|]*\s(--force|--force-with-lease|-f)\b",
     "a force push rewrites shared history"),
    (r"\bgit\s+reset\b[^\n;&|]*--hard\b",
     "it discards work irreversibly"),
    (r"\bgit\s+clean\s+-[a-z]*f",
     "it deletes untracked files irreversibly"),
    (r"\brm\s+-[a-z]*r[a-z]*\s+(/|~|\$home|\.\.|\.|\*)(\s|$|/\s|/$)",
     "a recursive delete of the whole project, home folder or system"),
]

# SQL that destroys data. Checked only when the command talks to a database
# client, so searching code for the words "DROP TABLE" is still allowed.
DATABASE_CLIENTS = r"\b(mysql|mariadb|psql|sqlite3|sqlcmd|mongosh|dbshell|tinker|artisan\s+db)\b"
DESTRUCTIVE_SQL = [
    (r"\bdrop\s+(database|schema|table|view)\b", "DROP removes database objects"),
    (r"\btruncate\b", "TRUNCATE empties a table"),
    (r"\bdelete\s+from\s+[\w.`\"\[\]]+\s*(;|\"|'|$|\))", "DELETE without a WHERE clause"),
    (r"\bupdate\s+[\w.`\"\[\]]+\s+set\b(?![^;]*\bwhere\b)", "UPDATE without a WHERE clause"),
    (r"\bdb\.\w+\.(drop|deletemany|remove)\(", "it deletes MongoDB data"),
]

# Run app code against the configured database: ask when it looks like production.
# Matched only where a command starts (see command_segments), so text that merely
# mentions "pytest" — a test file being written, a README — doesn't count.
DATABASE_COMMANDS = [
    r"^artisan\s+(migrate|db:seed|db\b|tinker|test|queue:(work|listen)|schedule:(run|work)|horizon|serve)",
    r"^composer\s+(run(-script)?\s+)?(dev|test)\b",
    r"^(pest|phpunit)\b",
    r"^(\S*/)?manage\.py\s+(?!(check|makemigrations|sqlmigrate|help|collectstatic|startapp|showmigrations)\b)\w+",
    r"^pytest\b",
    r"^alembic\s+(upgrade|stamp)\b",
    r"^(fastapi\s+(dev|run)|uvicorn|gunicorn|hypercorn|daphne)\b",
    r"^(celery|rq|dramatiq)\b.*\bworker\b",
    r"^(mysql|mariadb|psql|sqlite3|sqlcmd|mongosh|redis-cli)\b",
]

# Deploying or changing servers and cloud resources: always ask, whatever the .env
# says. Claude prepares deployments; AK runs them (arkar-delivery).
DEPLOY_COMMANDS = [
    r"^ssh\s+(?!-V\b)",
    r"^scp\s+.*\S+:",
    r"^rsync\s+.*\S+:",
    r"^kubectl\s+(apply|create|delete|edit|patch|replace|rollout|scale|set|exec|drain|cordon)\b",
    r"^helm\s+(install|upgrade|uninstall|rollback|delete)\b",
    r"^terraform\s+(apply|import|state\s+(rm|mv|push))\b",
    r"^docker\s+(push|-h|--host|context\s+use)\b",
    r"^firebase\s+(deploy|hosting:channel:deploy|functions:delete|firestore:indexes)\b",
    r"^(vercel|netlify)\b.*(--prod|deploy)",
    r"^(fly|flyctl)\s+deploy\b",
    r"^gcloud\s+.*\b(deploy|sql\s+(import|export|instances\s+(patch|delete|restart)))\b",
    r"^az\s+.*\b(deploy|webapp\s+(restart|stop|config)|sql\s+db\s+(delete|import))\b",
    r"^aws\s+.*\b(deploy|update-service|update-function-code|rds\s+(delete|modify|restore))\b",
    r"^eb\s+deploy\b",
    r"^gh\s+(workflow\s+run|release\s+create)\b",
    r"^git\s+push\b.*(--tags|\bv\d+\.\d+)",
]

# Wrappers in front of the real command: `uv run`, `php`, `npx`, `docker compose exec app`, ...
UV_VALUE_OPTIONS = r"--(with|with-requirements|project|directory|python|env-file|extra|group|package|from)|-p"
COMMAND_WRAPPERS = re.compile(
    r"^(sudo|time|exec|nohup|env|command)\s+"
    r"|^\w+=(\"[^\"]*\"|'[^']*'|\S*)\s+"
    rf"|^(uv\s+run|uvx|poetry\s+run|pipenv\s+run|pdm\s+run|hatch\s+run)((\s+({UV_VALUE_OPTIONS})(=\S+|\s+\S+))|(\s+--?[\w-]+))*\s+"
    r"|^python3?(\.\d+)?\s+(-m\s+)?"
    r"|^php\s+"
    r"|^(npx|pnpm|yarn|bunx)\s+"
    r"|^(\./|vendor/bin/)"
    r"|^docker(-compose|\s+compose)\s+(exec|run)(\s+-\S+)*\s+\S+\s+"
    r"|^sail\s+"
    r"|^(bash|sh|zsh)\s+-c\s+[\"']?"
    r"|^[({]\s*"
)
SEGMENT_SEPARATORS = re.compile(r"\n|;|&&|\|\||\|")

# Heredocs: `cat > file <<'EOF' ... EOF` only writes text to a file; it never runs.
HEREDOC_START = re.compile(r"<<-?\s*(['\"]?)(\w+)\1")
FILE_WRITER = re.compile(r"(^|&&|;|\|\|)\s*(cat|tee)\b[^<]*$")
PIPE_TO_RUNNER = re.compile(r"\|\s*(sudo\s+)?(bash|sh|zsh|python3?|php|node|mysql|mariadb|psql|sqlite3|sqlcmd|mongosh)\b")

# Any command that names production config explicitly.
EXPLICIT_PRODUCTION = r"(\.env\.(production|prod|live)\b|\benv/(prod|production|live)\.json\b|--env[= ](production|prod)\b)"

# Printing a whole .env file (secrets) — use a filtered grep instead.
PRINT_ENV_FILE = r"\b(cat|type|less|more|head|tail|bat|nl|strings|xxd|od)\b[^\n;&|]*(^|[\s/\"'])\.env(\.[\w.-]+)?(?<!\.example)(\s|$|\"|')"
SAFE_ENV_KEYS = "APP_ENV|DJANGO_ENV|ENVIRONMENT|DB_CONNECTION|DB_HOST|DB_DATABASE|DB_NAME|QUEUE_CONNECTION|MAIL_MAILER|CACHE_STORE"
SAFE_ENV_HINT = f"grep -E '^({SAFE_ENV_KEYS})=' .env"

PRODUCTION_WORDS = re.compile(r"(^|[^a-z])(prod|production|live)([^a-z]|$)", re.I)
ENVIRONMENT_KEYS = ("APP_ENV", "DJANGO_ENV", "ENVIRONMENT", "ENV", "FLASK_ENV", "NODE_ENV", "RAILS_ENV", "APP_ENVIRONMENT")
HOST_KEYS = ("DB_HOST", "DATABASE_HOST", "MYSQL_HOST", "POSTGRES_HOST", "PGHOST", "DB_SERVER")
URL_KEYS_SUFFIX = ("DATABASE_URL", "DB_URL", "_DB_URL", "_DATABASE_URL", "SQLALCHEMY_DATABASE_URI", "MONGO_URI", "MONGODB_URI")
NAME_KEYS = ("DB_DATABASE", "DB_NAME", "DATABASE_NAME", "MYSQL_DATABASE", "POSTGRES_DB", "DATABASE_PATH", "DB_PATH")
LOCAL_HOSTS = {
    "", "localhost", "127.0.0.1", "::1", "0.0.0.0", "host.docker.internal",
    "db", "database", "mysql", "mariadb", "postgres", "postgresql", "pgsql", "mongo", "redis",
}


def find_env_file(start: Path) -> Path | None:
    """Look for .env in the folder and up to four parents (stopping at the repo root)."""
    folder = start
    for _ in range(5):
        candidate = folder / ".env"
        if candidate.is_file():
            return candidate
        if (folder / ".git").exists() or folder.parent == folder:
            return None
        folder = folder.parent
    return None


def read_env(env_file: Path) -> dict:
    values = {}
    for line in env_file.read_text(errors="ignore").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.replace("export ", "").strip()
        values[key] = value.split(" #")[0].strip().strip("'\"")
    return values


def is_local_host(host: str) -> bool:
    host = host.lower().strip("[]")
    if host in LOCAL_HOSTS or host.startswith("127."):
        return True
    return host.endswith((".local", ".localhost", ".test", ".internal")) and not PRODUCTION_WORDS.search(host)


def production_signals(project: Path) -> list:
    env_file = find_env_file(project)
    if env_file is None:
        return []
    env = read_env(env_file)
    signals = []
    for key in ENVIRONMENT_KEYS:
        if PRODUCTION_WORDS.search(env.get(key, "")):
            signals.append(f"{key}={env[key]}")
    for key in HOST_KEYS:
        host = env.get(key, "")
        if host and not is_local_host(host):
            signals.append(f"{key} is a non-local server ({host})")
    for key, value in env.items():
        if value and key.upper().endswith(URL_KEYS_SUFFIX) and "://" in value:
            host = urlparse(value).hostname or ""
            if host and not is_local_host(host):
                signals.append(f"{key} points at a non-local server ({host})")
            if PRODUCTION_WORDS.search(urlparse(value).path or ""):
                signals.append(f"{key} names a live database")
    for key in NAME_KEYS:
        if PRODUCTION_WORDS.search(env.get(key, "")):
            signals.append(f"{key} looks like a live database")
    return signals


def command_folder(command: str, cwd: Path) -> Path:
    """Use the folder of a leading `cd <dir> &&` when there is one."""
    match = re.match(r"\s*cd\s+(\"[^\"]+\"|'[^']+'|[^\s;&|]+)\s*(&&|;)", command)
    if not match:
        return cwd
    target = Path(os.path.expanduser(match.group(1).strip("\"'")))
    return target if target.is_absolute() else (cwd / target)


def without_file_contents(command: str) -> str:
    """Drop heredoc bodies that are only written to a file, because they never run."""
    lines = command.split("\n")
    kept = []
    index = 0
    while index < len(lines):
        line = lines[index]
        kept.append(line)
        match = HEREDOC_START.search(line)
        if match:
            terminator = match.group(2)
            end = index + 1
            while end < len(lines) and lines[end].strip() != terminator:
                end += 1
            only_written_to_file = FILE_WRITER.search(line[:match.start()]) and not PIPE_TO_RUNNER.search(line)
            if not only_written_to_file:
                kept.extend(lines[index + 1:end])
            index = end
        index += 1
    return "\n".join(kept)


def command_segments(text: str):
    """Yield each command in the text with wrappers like `uv run` or `php` removed."""
    for segment in SEGMENT_SEPARATORS.split(text):
        segment = segment.strip()
        previous = None
        while segment != previous:
            previous = segment
            segment = COMMAND_WRAPPERS.sub("", segment, count=1).strip()
        if segment:
            yield segment


def check_bash(command: str, cwd: Path):
    lowered = without_file_contents(command).lower()
    for pattern, why in ALWAYS_BLOCK:
        if re.search(pattern, lowered):
            return "deny", f"{GUARD_NAME}: blocked because {why}. If it is really needed, AK runs it himself after a backup."
    if re.search(DATABASE_CLIENTS, lowered):
        for pattern, why in DESTRUCTIVE_SQL:
            if re.search(pattern, lowered):
                return "deny", f"{GUARD_NAME}: blocked because {why}. Hand AK the reviewed SQL to run himself after a backup."
    if re.search(PRINT_ENV_FILE, lowered):
        return "deny", (f"{GUARD_NAME}: don't print a whole .env file (it holds passwords and keys). "
                        f"To see where the project points, run: {SAFE_ENV_HINT}")
    if re.search(EXPLICIT_PRODUCTION, lowered):
        return "ask", f"{GUARD_NAME}: this command uses PRODUCTION configuration. Approve only if you are sure."
    segments = list(command_segments(lowered))
    if any(re.search(pattern, segment) for segment in segments for pattern in DEPLOY_COMMANDS):
        return "ask", (f"{GUARD_NAME}: this deploys or changes a server or cloud resource. Claude prepares "
                       "deployments and AK runs them: deny, and ask Claude for the numbered release steps "
                       "(backup first) to run yourself.")
    if any(re.search(pattern, segment) for segment in segments for pattern in DATABASE_COMMANDS):
        signals = production_signals(command_folder(command, cwd))
        if signals:
            return "ask", (f"{GUARD_NAME}: this project's .env looks like PRODUCTION ({'; '.join(signals[:3])}). "
                           "This command can read or change live data, so Claude should not run it: "
                           "deny, and ask Claude for step-by-step instructions to run it yourself "
                           "(backup first), or point the project at a local/test database. "
                           "Live data can be read with the read-only query tool.")
    return None


def check_read(file_path: str):
    name = Path(file_path).name.lower()
    if name == ".env" or (name.startswith(".env.") and name != ".env.example"):
        return "deny", (f"{GUARD_NAME}: don't read a whole .env file (it holds passwords and keys). "
                        f"To see where the project points, run: {SAFE_ENV_HINT}")
    return None


def check_mcp_tool(tool_name: str, cwd: Path):
    lowered = tool_name.lower()
    if re.search(r"tinker|database|query|sql|db_", lowered):
        signals = production_signals(cwd)
        if signals:
            return "ask", (f"{GUARD_NAME}: {tool_name} runs against this project's database, and its .env looks like "
                           f"PRODUCTION ({'; '.join(signals[:3])}). Approve only if it is read-only and safe.")
    return None


def decide(event: dict):
    tool_name = event.get("tool_name", "")
    tool_input = event.get("tool_input") or {}
    cwd = Path(event.get("cwd") or os.getcwd())
    if tool_name == "Bash":
        return check_bash(tool_input.get("command", ""), cwd)
    if tool_name == "Read":
        return check_read(tool_input.get("file_path", ""))
    if tool_name.startswith("mcp__"):
        return check_mcp_tool(tool_name, cwd)
    return None


def main() -> None:
    try:
        event = json.load(sys.stdin)
        result = decide(event)
    except Exception as error:  # never break Claude's tools because of a guard bug
        print(f"{GUARD_NAME} error: {error}", file=sys.stderr)
        return
    if result is None:
        return
    decision, reason = result
    print(json.dumps({"hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": decision,
        "permissionDecisionReason": reason,
    }}))


if __name__ == "__main__":
    main()
