"""Tests for the arkar production guard hook.

Run from the repo root:  python3 -m pytest tests -q
They feed hook events to the real script (through the bash launcher) and check
the decision, so a later edit can't silently weaken a safeguard.
"""
import json
import shutil
import subprocess
from pathlib import Path

import pytest

HOOKS = Path(__file__).resolve().parents[1] / "plugins" / "arkar-dev-standards" / "hooks"
LAUNCHER = HOOKS / "production_guard.sh"
BASH = shutil.which("bash")

PRODUCTION_ENVS = {
    "app_env": "APP_ENV=production\nDB_HOST=127.0.0.1\n",
    "remote_host": "APP_ENV=local\nDB_CONNECTION=mysql\nDB_HOST=10.20.1.15\nDB_DATABASE=hrms\n",
    "database_url": "DATABASE_URL=mysql+pymysql://app:secret@db.cbm.com.sg:3306/claims\n",
    "live_name": "DB_HOST=localhost\nDB_DATABASE=claims_live\n",
    "django_env": "DJANGO_ENV=prod\n",
}
LOCAL_ENVS = {
    "laravel_local": "APP_ENV=local\nDB_CONNECTION=mysql\nDB_HOST=127.0.0.1\nDB_DATABASE=hrms\n",
    "docker": "APP_ENV=local\nDB_HOST=mysql\nDB_DATABASE=hrms\n",
    "sqlite_url": "DATABASE_URL=sqlite:///./dev.db\n",
    "postgres_compose": "DATABASE_URL=postgresql://app:app@postgres:5432/agents\n",
}


def run_guard(event: dict, path: str | None = None) -> dict | None:
    env = None if path is None else {"PATH": path}
    result = subprocess.run([BASH, str(LAUNCHER)], input=json.dumps(event), capture_output=True, text=True, env=env)
    assert result.returncode == 0, result.stderr
    output = result.stdout.strip()
    return json.loads(output)["hookSpecificOutput"] if output else None


def bash_event(command: str, cwd: Path) -> dict:
    return {"tool_name": "Bash", "tool_input": {"command": command}, "cwd": str(cwd)}


def project(tmp_path: Path, env_text: str | None) -> Path:
    folder = tmp_path / "project"
    folder.mkdir()
    (folder / ".git").mkdir()
    if env_text is not None:
        (folder / ".env").write_text(env_text)
    return folder


ALWAYS_BLOCKED = [
    "php artisan migrate:fresh --seed",
    "php artisan migrate:rollback",
    "php artisan db:wipe",
    "php artisan migrate --force",
    "php artisan db:seed --class=UserSeeder --force",
    "uv run python manage.py flush --noinput",
    "python manage.py migrate claims zero",
    "uv run alembic downgrade -1",
    "mysql -u root hrms -e 'DROP TABLE leave_requests'",
    "psql $DATABASE_URL -c 'TRUNCATE jobs'",
    "sqlite3 app.db 'DELETE FROM expense_requests;'",
    "mysql hrms -e \"UPDATE users SET role='admin'\"",
    "git push --force origin main",
    "git push -f",
    "git reset --hard HEAD~3",
    "git clean -fd",
    "rm -rf /",
    "rm -rf ~",
    "rm -rf ..",
    "cat .env",
    "head -20 .env.production",
]


@pytest.mark.parametrize("command", ALWAYS_BLOCKED)
def test_destructive_commands_are_blocked_even_in_local_projects(tmp_path, command):
    folder = project(tmp_path, LOCAL_ENVS["laravel_local"])
    decision = run_guard(bash_event(command, folder))
    assert decision and decision["permissionDecision"] == "deny"


DATABASE_COMMANDS = [
    "php artisan test",
    "./vendor/bin/pest",
    "php artisan migrate",
    "php artisan db:seed",
    "php artisan tinker",
    "composer run dev",
    "php artisan queue:work",
    "uv run pytest -q",
    "python -m pytest tests/test_orders.py",
    "uv run python manage.py migrate",
    "uv run python manage.py test",
    "uv run python manage.py shell",
    "uv run python manage.py runserver",
    "uv run alembic upgrade head",
    "uv run fastapi dev",
    "mysql -u app hrms",
    "cd backend && php artisan test",
]


@pytest.mark.parametrize("env_name", PRODUCTION_ENVS)
@pytest.mark.parametrize("command", DATABASE_COMMANDS)
def test_database_commands_ask_when_env_looks_like_production(tmp_path, env_name, command):
    folder = project(tmp_path, PRODUCTION_ENVS[env_name])
    (folder / "backend").mkdir()
    decision = run_guard(bash_event(command, folder))
    assert decision and decision["permissionDecision"] == "ask", decision


@pytest.mark.parametrize("env_name", list(LOCAL_ENVS) + ["no_env"])
@pytest.mark.parametrize("command", DATABASE_COMMANDS)
def test_database_commands_run_freely_in_local_projects(tmp_path, env_name, command):
    folder = project(tmp_path, LOCAL_ENVS.get(env_name))
    (folder / "backend").mkdir()
    assert run_guard(bash_event(command, folder)) is None


EVERYDAY_COMMANDS = [
    "git status",
    "git diff HEAD",
    "git log --oneline -5",
    "ls -la",
    "rm -rf node_modules",
    "rm -rf ./build",
    "grep -rn 'DROP TABLE' database/",
    "uv run ruff check app",
    "npm run build",
    "uv run python manage.py makemigrations",
    "uv run python manage.py check",
    "cat .env.example",
    f"grep -E '^(APP_ENV|DB_HOST)=' .env",
    "php artisan route:list",
    "php artisan make:model LeaveRequest -mfs",
    "php artisan vendor:publish --tag=config --force",
]


@pytest.mark.parametrize("command", EVERYDAY_COMMANDS)
def test_everyday_commands_are_not_touched_even_in_production_projects(tmp_path, command):
    folder = project(tmp_path, PRODUCTION_ENVS["app_env"])
    assert run_guard(bash_event(command, folder)) is None


def test_env_in_a_parent_folder_is_found(tmp_path):
    folder = project(tmp_path, PRODUCTION_ENVS["remote_host"])
    nested = folder / "app" / "tests"
    nested.mkdir(parents=True)
    decision = run_guard(bash_event("uv run pytest", nested))
    assert decision and decision["permissionDecision"] == "ask"


def test_explicit_production_config_asks(tmp_path):
    folder = project(tmp_path, LOCAL_ENVS["laravel_local"])
    decision = run_guard(bash_event("flutter run --dart-define-from-file=env/prod.json", folder))
    assert decision and decision["permissionDecision"] == "ask"


def test_reading_env_file_is_blocked_but_example_is_allowed(tmp_path):
    folder = project(tmp_path, LOCAL_ENVS["laravel_local"])
    blocked = run_guard({"tool_name": "Read", "tool_input": {"file_path": str(folder / ".env")}, "cwd": str(folder)})
    assert blocked and blocked["permissionDecision"] == "deny"
    allowed = run_guard({"tool_name": "Read", "tool_input": {"file_path": str(folder / ".env.example")}, "cwd": str(folder)})
    assert allowed is None


def test_boost_tinker_asks_in_production(tmp_path):
    folder = project(tmp_path, PRODUCTION_ENVS["app_env"])
    decision = run_guard({"tool_name": "mcp__laravel-boost__tinker", "tool_input": {}, "cwd": str(folder)})
    assert decision and decision["permissionDecision"] == "ask"


def test_without_python_the_launcher_asks_instead_of_failing_open(tmp_path):
    folder = project(tmp_path, LOCAL_ENVS["laravel_local"])
    tools = tmp_path / "tools"  # a PATH with the shell tools but no Python
    tools.mkdir()
    for tool in ("cat", "grep", "dirname"):
        (tools / tool).symlink_to(shutil.which(tool))
    decision = run_guard(bash_event("php artisan migrate:fresh", folder), path=str(tools))
    assert decision and decision["permissionDecision"] == "ask"
    assert "Python" in decision["permissionDecisionReason"]
    assert run_guard(bash_event("ls -la", folder), path=str(tools)) is None


def test_guard_errors_never_block_tools(tmp_path):
    result = subprocess.run([BASH, str(LAUNCHER)], input="not json", capture_output=True, text=True)
    assert result.returncode == 0 and result.stdout.strip() == ""
