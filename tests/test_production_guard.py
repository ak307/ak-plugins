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
    "grep -E '^(APP_ENV|DB_HOST)=' .env",
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


def test_grep_tool_on_env_file_is_blocked(tmp_path):
    folder = project(tmp_path, LOCAL_ENVS["laravel_local"])
    for tool_input in ({"pattern": ".", "path": str(folder / ".env")}, {"pattern": "KEY", "glob": ".env.production"}):
        decision = run_guard({"tool_name": "Grep", "tool_input": tool_input, "cwd": str(folder)})
        assert decision and decision["permissionDecision"] == "deny"
    assert run_guard({"tool_name": "Grep", "tool_input": {"pattern": "DB_HOST", "path": "src"}, "cwd": str(folder)}) is None


@pytest.mark.parametrize("command", [
    'rm -rf "$HOME"',
    "rm -r -f /",
    "rm -rf /*",
    "git push origin +main",
    'bash -c "git reset --hard HEAD~1"',
    'git commit -m "notes" && git reset --hard',
    'grep "$(rm -rf ~)" notes.txt',
])
def test_disguised_destructive_commands_are_blocked(tmp_path, command):
    folder = project(tmp_path, LOCAL_ENVS["laravel_local"])
    decision = run_guard(bash_event(command, folder))
    assert decision and decision["permissionDecision"] == "deny"


@pytest.mark.parametrize("command", [
    'grep -rn "git push --force" .',
    "rg 'migrate:fresh' docs/",
    'git commit -m "Guard: block rm -rf . and git reset --hard"',
    "rm -rf ./build node_modules",
    "git push origin ui-intelligence",
])
def test_searching_or_committing_text_about_dangerous_commands_is_allowed(tmp_path, command):
    folder = project(tmp_path, LOCAL_ENVS["laravel_local"])
    assert run_guard(bash_event(command, folder)) is None


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


# Commands seen in real sessions that only WRITE files or edit code. They must
# not be blocked just because the text mentions pytest, artisan or a server.
FILE_WRITES_IN_PRODUCTION_PROJECTS = [
    "cat >> tests/test_expenses.py <<'EOF'\nimport pytest\n\ndef test_cancel(client):\n    assert client.post('/expenses/1/cancel').status_code == 200\nEOF",
    "cat > ARCHITECTURE.md <<'EOF'\n# Architecture\nRun locally: uv run fastapi dev. Tests: uv run pytest.\nMigrations: php artisan migrate (AK only).\nEOF",
    "cat >> tests/test_guard.py <<'EOF'\nBLOCKED = ['php artisan migrate:fresh', 'git push --force']\nEOF",
    "python3 - <<'EOF'\np='app/main.py'\ns=open(p).read()\ns=s.replace('a','b')  # see uv run pytest\nopen(p,'w').write(s)\nEOF",
    "tee README.md > /dev/null <<'EOF'\nStart: php artisan serve\nWorker: php artisan queue:work\nEOF",
    "echo 'run: uv run pytest -q' >> NOTES.md",
    "git commit -m 'tests: run with uv run pytest against the test DB'",
    'uv run --with pymysql --with "psycopg[binary]" python /x/readonly_query.py "SELECT id FROM jobs"',
    "grep -rn 'php artisan migrate' docs/",
]


@pytest.mark.parametrize("command", FILE_WRITES_IN_PRODUCTION_PROJECTS)
def test_writing_files_that_mention_commands_is_not_blocked(tmp_path, command):
    folder = project(tmp_path, PRODUCTION_ENVS["app_env"])
    assert run_guard(bash_event(command, folder)) is None


STILL_CAUGHT_IN_PRODUCTION_PROJECTS = [
    ("cat <<'EOF' | sqlite3 live.db\nDELETE FROM expense_requests;\nEOF", "deny"),
    ("cat > /tmp/wipe.sql <<'EOF'\nselect 1;\nEOF\nmysql hrms < /tmp/wipe.sql", "ask"),
    ("uv run -q pytest", "ask"),
    ("uv run --with httpx pytest tests/test_x.py", "ask"),
    ("DATABASE_PATH=/tmp/x.db uv run pytest", "ask"),
    ("docker compose exec -T app php artisan test", "ask"),
    ("./vendor/bin/sail artisan migrate", "ask"),
    ("bash -c 'php artisan tinker'", "ask"),
    ("python3 manage.py shell -c 'print(1)'", "ask"),
    ("(cd backend && uv run alembic upgrade head)", "ask"),
    ("cat > notes.md <<'EOF'\nhello\nEOF\nphp artisan migrate:fresh", "deny"),
]


DEPLOY_COMMANDS = [
    "ssh deploy@10.20.1.15 'cd /var/www/hrms && php artisan migrate --pretend'",
    "scp dist.zip deploy@hr.cbm.com.sg:/var/www/",
    "rsync -az ./public/ deploy@10.20.1.15:/var/www/hrms/public/",
    "kubectl apply -f k8s/",
    "kubectl rollout restart deployment/api",
    "helm upgrade api ./chart",
    "terraform apply -auto-approve",
    "docker push registry.cbm.local/hrms:1.4.0",
    "firebase deploy --only firestore:rules",
    "vercel --prod",
    "gcloud run deploy api --source .",
    "az webapp deploy --resource-group rg --name hrms --src-path app.zip",
    "gh workflow run deploy.yml",
    "gh release create v1.4.0",
    "git push origin v1.4.0",
    "git push --tags",
]


@pytest.mark.parametrize("command", DEPLOY_COMMANDS)
def test_deploy_commands_always_ask_even_in_local_projects(tmp_path, command):
    folder = project(tmp_path, LOCAL_ENVS["laravel_local"])
    decision = run_guard(bash_event(command, folder))
    assert decision and decision["permissionDecision"] == "ask", decision


@pytest.mark.parametrize("command", ["terraform destroy", "firebase firestore:delete --all-collections",
                                     "firebase database:remove /users"])
def test_destroying_cloud_resources_is_blocked(tmp_path, command):
    folder = project(tmp_path, LOCAL_ENVS["laravel_local"])
    decision = run_guard(bash_event(command, folder))
    assert decision and decision["permissionDecision"] == "deny"


@pytest.mark.parametrize("command", ["git push", "git push -u origin feature/leave-cancel", "ssh-keygen -t ed25519",
                                     "rsync -a src/ build/", "docker build -t hrms .", "terraform plan",
                                     "kubectl get pods", "gh pr create --fill", "firebase emulators:start"])
def test_everyday_dev_commands_are_not_deploys(tmp_path, command):
    folder = project(tmp_path, LOCAL_ENVS["laravel_local"])
    assert run_guard(bash_event(command, folder)) is None


@pytest.mark.parametrize("command,expected", STILL_CAUGHT_IN_PRODUCTION_PROJECTS)
def test_real_database_commands_are_still_caught(tmp_path, command, expected):
    folder = project(tmp_path, PRODUCTION_ENVS["app_env"])
    (folder / "backend").mkdir()
    decision = run_guard(bash_event(command, folder))
    assert decision and decision["permissionDecision"] == expected, decision
