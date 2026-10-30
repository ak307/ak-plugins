# Django standard template

Use this for every new Django project (server-rendered web apps, admin-heavy
internal tools, and Django + JSON API). The app layout comes from Group
Cashflow Automation; settings, auth and tooling follow current Django
guidance. For a Django project whose main job is running LLM agents, use
`django-agentic.md` instead — it builds on this one.

Version policy: latest Django 6.x on Python 3.13. Use Django 5.2 LTS only for
an app that will be left running for years with little maintenance.

## Contents
1. Folder tree
2. Creating the project
3. What goes where (with skeletons)
4. Naming rules
5. Adding a new feature — checklist
6. Defaults and when to change them

## 1. Folder tree

```
project-name/                      # kebab-case folder name
├── manage.py
├── config/                        # project package — always named config
│   ├── __init__.py
│   ├── settings.py                # reads .env; no secrets in this file
│   ├── urls.py                    # includes each app's urls.py + /health/live, /health/ready
│   ├── asgi.py
│   └── wsgi.py
├── apps/                          # every project app lives here
│   ├── __init__.py
│   ├── accounts/                  # always present: custom User model
│   │   ├── models/user.py
│   │   └── ...
│   └── leave_requests/            # one app per business area, plural snake_case
│       ├── __init__.py
│       ├── apps.py
│       ├── admin.py
│       ├── urls.py                # app_name = "leave_requests"
│       ├── constants.py           # TextChoices / IntegerChoices, fixed values
│       ├── exceptions.py          # this app's domain errors
│       ├── models/
│       │   ├── __init__.py        # imports every model
│       │   └── leave_request.py   # one model per file
│       ├── services/              # business logic, one file per job
│       │   ├── __init__.py
│       │   └── leave_request_service.py
│       ├── views/                 # one file per page or closely related group
│       │   ├── __init__.py
│       │   └── leave_request_views.py
│       ├── forms.py               # (or forms/ when there are many)
│       ├── api.py                 # only if the app exposes JSON endpoints
│       ├── schemas.py             # API request/response schemas, with api.py
│       ├── tasks.py               # background jobs, only when needed
│       ├── templates/
│       │   └── leave_requests/    # namespaced: templates/<app_name>/...
│       │       ├── leave_request_list.html
│       │       └── leave_request_detail.html
│       ├── management/commands/   # only when needed
│       ├── migrations/
│       └── tests/
│           ├── __init__.py
│           ├── factories.py       # factory_boy factories for this app's models
│           ├── test_leave_request_service.py
│           └── test_leave_request_views.py
├── templates/                     # project-wide: base.html, partials, errors
│   └── base.html
├── static/
├── media/                         # uploads (gitignored, never served by Django in prod)
├── .env.example
├── .gitignore
├── .python-version                # 3.13
├── pyproject.toml                 # dependencies + ruff + pytest config
├── uv.lock
└── README.md
```

Run locally: `uv run python manage.py runserver`.

The project package is always `config/`, not the project name, so settings
are always at `config/settings.py` and commands are identical across
projects. Apps always live under `apps/` and are installed as
`"apps.leave_requests"`.

## 2. Creating the project

```
uv init --app project-name && cd project-name
uv add django django-environ mysqlclient whitenoise
uv add --dev pytest pytest-django factory-boy ruff
uv run django-admin startproject config .
mkdir -p apps/accounts && touch apps/__init__.py
uv run python manage.py startapp accounts apps/accounts
```

Then, **before the first `migrate`**, create the custom user model (below).
Keep everything `startproject` generated in `settings.py` (middleware,
password validators, `ROOT_URLCONF` …) and apply the changes shown in the next
section — don't hand-write settings from scratch.

`mysqlclient` needs MySQL client headers to build (on Windows, a prebuilt
wheel is normally available; on Linux, `default-libmysqlclient-dev` and
`pkg-config`).

## 3. What goes where

### Custom user model — every project, before the first migration

Django's docs strongly recommend this even when the built-in `User` is enough
today; switching later is very painful.

```python
# apps/accounts/models/user.py
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    pass
```

```python
# settings.py
AUTH_USER_MODEL = "accounts.User"
```

Refer to it as `settings.AUTH_USER_MODEL` in model fields and
`get_user_model()` in code — never import `User` from `django.contrib.auth`.

### config/settings.py — changes to the generated file

```python
from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parent.parent
env = environ.Env()
environ.Env.read_env(BASE_DIR / ".env")

SECRET_KEY = env("DJANGO_SECRET_KEY")
DEBUG = env.bool("DJANGO_DEBUG", default=False)
ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS", default=["localhost"])
CSRF_TRUSTED_ORIGINS = env.list("DJANGO_CSRF_TRUSTED_ORIGINS", default=[])

INSTALLED_APPS = [
    # Django
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third party
    # Project apps
    "apps.accounts",
    "apps.leave_requests",
]

# MIDDLEWARE: keep the generated list; add WhiteNoise right after SecurityMiddleware:
#   "whitenoise.middleware.WhiteNoiseMiddleware",

AUTH_USER_MODEL = "accounts.User"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.mysql",
        "NAME": env("DB_NAME"),
        "USER": env("DB_USER"),
        "PASSWORD": env("DB_PASSWORD"),
        "HOST": env("DB_HOST", default="localhost"),
        "PORT": env("DB_PORT", default="3306"),
        "CONN_MAX_AGE": 60,
        "CONN_HEALTH_CHECKS": True,
        "OPTIONS": {
            "charset": "utf8mb4",
            "init_command": "SET sql_mode='STRICT_TRANS_TABLES'",
        },
    }
}

# TEMPLATES: keep the generated dict; set "DIRS": [BASE_DIR / "templates"]

LANGUAGE_CODE = "en-sg"
TIME_ZONE = "Asia/Singapore"
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}

# Production security (all driven by env so local dev stays simple)
# Trust X-Forwarded-Proto only behind a proxy that always sets it (nginx/IIS
# terminating TLS); otherwise clients could claim HTTPS.
if env.bool("DJANGO_BEHIND_TLS_PROXY", default=False):
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
SECURE_HSTS_SECONDS = env.int("DJANGO_HSTS_SECONDS", default=0)

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": env("LOG_LEVEL", default="INFO")},
}
```

Before deploying, run `uv run python manage.py check --deploy` and fix what
it reports.

### apps/<app>/apps.py

```python
from django.apps import AppConfig


class LeaveRequestsConfig(AppConfig):
    name = "apps.leave_requests"
    verbose_name = "Leave requests"
```

### models/ — one model per file

```python
# apps/leave_requests/models/leave_request.py
from django.conf import settings
from django.db import models

from apps.leave_requests.constants import LeaveStatus, LeaveType


class LeaveRequest(models.Model):
    staff = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="leave_requests")
    leave_type = models.CharField(max_length=20, choices=LeaveType.choices)
    start_date = models.DateField()
    end_date = models.DateField()
    reason = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=LeaveStatus.choices, default=LeaveStatus.PENDING)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name="+"
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-start_date"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(end_date__gte=models.F("start_date")),
                name="leave_request_end_after_start",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.staff} {self.start_date}–{self.end_date}"
```

```python
# apps/leave_requests/models/__init__.py
from apps.leave_requests.models.leave_request import LeaveRequest

__all__ = ["LeaveRequest"]
```

Models hold fields, `Meta` (with constraints that protect data integrity),
`__str__` and small properties about their own data. Rules that touch other
models or the outside world go in services.

### constants.py

```python
from django.db import models


class LeaveStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"
```

### services/ — business logic

Plain functions; a class only when it holds state. Services don't know about
`request` or HTTP — they take model instances and plain values, and raise this
app's exceptions.

```python
# apps/leave_requests/services/leave_request_service.py
from django.db import transaction
from django.utils import timezone

from apps.leave_requests.constants import LeaveStatus
from apps.leave_requests.exceptions import LeaveRequestError, LeaveRequestPermissionError
from apps.leave_requests.models import LeaveRequest


def can_approve(reviewer, leave_request: LeaveRequest) -> bool:
    """Approvers need the permission, and nobody approves their own request."""
    return reviewer.has_perm("leave_requests.approve_leaverequest") and leave_request.staff_id != reviewer.id


@transaction.atomic
def approve_leave_request(leave_request_id: int, reviewer) -> LeaveRequest:
    # Lock the row, then check: two approvers clicking at once can't both pass.
    leave_request = LeaveRequest.objects.select_for_update().get(pk=leave_request_id)
    if not can_approve(reviewer, leave_request):
        raise LeaveRequestPermissionError("You can't approve this request.")
    if leave_request.status != LeaveStatus.PENDING:
        raise LeaveRequestError("Only pending requests can be approved.")
    leave_request.status = LeaveStatus.APPROVED
    leave_request.reviewed_by = reviewer
    leave_request.reviewed_at = timezone.now()
    leave_request.save(update_fields=["status", "reviewed_by", "reviewed_at", "updated_at"])
    return leave_request
```

**Status changes = lock, check, write — in one transaction.** Reading the
record outside the transaction, or without `select_for_update()`, lets a
double click or two approvers approve twice. Permission checks (may *this*
user act on *this* record?) live in the service, so views, the API and
agent tools all get them.

### views/ — thin

A view reads the request, calls a service, and renders or redirects. List
views filter the queryset to what the user may see
(`LeaveRequest.objects.filter(staff=request.user)` or the managers' view),
never `.all()`, and paginate. Use
function views with decorators (`@login_required`, `@require_POST`) by default;
use Django's generic class-based views (`ListView`, `DetailView`) when they fit
exactly. Put the shared "catch domain error → message → redirect" handling in
one helper rather than repeating it in every view.

For interactivity on server-rendered pages, use **HTMX** with Django's
built-in template partials (`{% partialdef %}` / `{% partial %}`, Django 6.0+)
before reaching for a JavaScript framework.

### urls.py

```python
from django.urls import path

from apps.leave_requests.views import leave_request_views

app_name = "leave_requests"

urlpatterns = [
    path("", leave_request_views.leave_request_list, name="list"),
    path("<int:pk>/", leave_request_views.leave_request_detail, name="detail"),
    path("<int:pk>/approve/", leave_request_views.approve_leave_request, name="approve"),
]
```

`config/urls.py` mounts each app — `path("leave-requests/", include("apps.leave_requests.urls"))`
— plus `health/live/` (always 200) and `health/ready/` (runs `SELECT 1`,
503 if the database is unreachable); see `reliability-and-observability.md`.

### api.py — JSON endpoints (only when needed)

Use **Django Ninja**: typed request/response schemas like FastAPI. One
`Router` per app in `api.py`, schemas in `schemas.py`, all mounted on one
`NinjaAPI` in `config/urls.py` at `api/`. API functions call the same
services as the views. When the API is used by the project's own pages with
session login, keep CSRF protection on (`NinjaAPI(csrf=True)`).

### tasks.py — background jobs

Django-Q2 tasks: plain functions that call services, queued with
`async_task("apps.leave_requests.tasks.send_reminder", leave_request_id)`.
Pass IDs, not model instances. The worker runs as its own process
(`uv run python manage.py qcluster`).

### Tests never touch the app's database

Django's test runner creates `test_<NAME>` on the server in `DATABASES`,
which comes from `.env` — possibly production. Tests use their own settings
pointing at a local database, and `conftest.py` refuses anything else:

```python
# config/settings_test.py
from config.settings import *  # noqa: F403

DATABASES["default"].update(  # noqa: F405
    HOST=env("TEST_DB_HOST", default="127.0.0.1"),  # noqa: F405
    NAME=env("TEST_DB_NAME", default="project_test"),  # noqa: F405
    USER=env("TEST_DB_USER", default="root"),  # noqa: F405
    PASSWORD=env("TEST_DB_PASSWORD", default=""),  # noqa: F405
)
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
```

```toml
# pyproject.toml
[tool.pytest.ini_options]
DJANGO_SETTINGS_MODULE = "config.settings_test"
```

```python
# conftest.py
from django.conf import settings

LOCAL_HOSTS = {"127.0.0.1", "localhost", "mysql", "db"}


def pytest_configure(config):
    database = settings.DATABASES["default"]
    if database["HOST"] not in LOCAL_HOSTS or "test" not in database["NAME"]:
        raise RuntimeError("Tests must use a local test database (config/settings_test.py).")
```

## 4. Naming rules

| Thing | Rule | Example |
|---|---|---|
| Project folder | kebab-case | `leave-portal` |
| Project package | always `config` | `config/settings.py` |
| App folder | plural snake_case business area, under `apps/` | `apps/leave_requests` |
| Model class | singular PascalCase | `LeaveRequest` |
| Model file | singular snake_case | `models/leave_request.py` |
| Service file | `<thing>_service.py` | `leave_request_service.py` |
| View file | `<thing>_views.py` | `leave_request_views.py` |
| View functions | `<thing>_list`, `<thing>_detail`, verb + noun for actions | `approve_leave_request` |
| URL names | short, namespaced by app | `leave_requests:detail` |
| URL paths | plural kebab-case | `/leave-requests/12/approve/` |
| Templates | `templates/<app>/<thing>_<page>.html` | `leave_requests/leave_request_list.html` |
| Choices | `TextChoices` in `constants.py`, UPPER_CASE members | `LeaveStatus.APPROVED` |
| Constraints | `<model>_<rule>` snake_case | `leave_request_end_after_start` |
| Tests | `tests/test_<file under test>.py` | `test_leave_request_service.py` |

## 5. Adding a new feature — checklist

1. Decide the app: existing business area → that app; new area →
   `mkdir apps/<name> && uv run python manage.py startapp <name> apps/<name>`,
   set `name = "apps.<name>"` in `apps.py`, add to `INSTALLED_APPS`.
2. Model in `models/<thing>.py`, export it in `models/__init__.py`, `makemigrations`.
3. Register in `admin.py`.
4. Logic in `services/<thing>_service.py`.
5. Views in `views/<thing>_views.py`, routes in the app's `urls.py`.
6. Templates in `templates/<app>/`, extending `base.html`.
7. Factory in `tests/factories.py`; tests for the service (and the view if it has branching).
8. New settings → `settings.py` **and** `.env.example`.

## 6. Defaults and when to change them

| Decision | Default | Change only when |
|---|---|---|
| Python / packages | Python 3.13, `uv` with `pyproject.toml` + `uv.lock` | Server can't run uv → export `requirements.txt` from uv |
| Lint / format | `ruff` (lint + format), configured in `pyproject.toml` | Never |
| Database | MySQL (`mysqlclient`), strict mode | Project already uses another DB |
| Config | `django-environ` reading `.env` | Never |
| Settings split | single `settings.py` driven by env | Genuinely different prod/dev config that env can't express → `config/settings/{base,dev,prod}.py` |
| User model | custom `apps.accounts.User(AbstractUser)` from day one | Never |
| Interactivity | HTMX + template partials | A page needs a rich client app → React via Vite for that page |
| JSON API | Django Ninja in `api.py` | Project already uses DRF |
| Background jobs | Django-Q2 in `tasks.py` | Project already uses Celery; Django's built-in `django.tasks` once it has a mature production worker |
| Static files | WhiteNoise | Behind nginx that serves `/static/` itself |
| Admin theme | `django-unfold` for internal tools | Plain admin is enough |
| Tests | `pytest` + `pytest-django` + `factory_boy`, against a **local** test database (see "Tests never touch the app's database"); the production DB user has data access to its own schema only — never CREATE/DROP | Never |
| Folders beyond the template | none | `adapters/` for file formats or external systems an app talks to (`xlsx_reader.py`, `outlook_client.py`). Add inside the app and mention it. |
