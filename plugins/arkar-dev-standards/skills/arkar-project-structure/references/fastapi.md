# FastAPI standard template

Use this for every new FastAPI project. Names and locations are fixed so any
FastAPI project looks familiar the moment you open it.

## Contents
1. Folder tree
2. What goes where (with skeletons)
3. Sync vs async — the one rule juniors get wrong
4. Naming rules
5. Adding a new resource — checklist
6. Defaults and when to change them

## 1. Folder tree

```
project-name/                  # kebab-case folder name
├── app/
│   ├── __init__.py
│   ├── main.py                # creates the app, lifespan, routers, error handlers
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py          # Settings class, reads .env
│   │   ├── database.py        # engine, SessionLocal, Base, DbSession dependency
│   │   ├── exceptions.py      # domain errors (NotFoundError, ConflictError, ForbiddenError, ...)
│   │   ├── security.py        # token checks (decode_access_token)
│   │   └── logging.py         # logging setup called from main.py
│   ├── routers/               # HTTP endpoints, one file per resource
│   │   ├── __init__.py
│   │   └── health.py          # /health/live and /health/ready
│   ├── schemas/               # Pydantic request/response models, one file per resource
│   │   └── __init__.py
│   ├── models/                # SQLAlchemy tables, one file per resource
│   │   └── __init__.py        # imports every model so Alembic sees them
│   ├── services/              # business logic + database queries, one file per resource
│   │   └── __init__.py
│   ├── clients/               # wrappers for external systems (LLM, other APIs) — only if used
│   │   └── __init__.py
│   └── dependencies.py        # shared Annotated dependencies (CurrentUser, ...)
├── alembic/                   # `alembic init alembic` (only if the project has a DB)
├── alembic.ini
├── tests/
│   ├── __init__.py
│   ├── conftest.py            # TestClient fixture + dependency overrides
│   └── test_health.py
├── .env.example               # every setting, with safe placeholder values
├── .gitignore                 # includes .env, .venv/, __pycache__/
├── .python-version            # 3.13
├── pyproject.toml             # dependencies + ruff + pytest + [tool.fastapi]
├── uv.lock
└── README.md                  # install, configure, run, test
```

Install and run locally:

```
uv sync
uv run fastapi dev            # development, auto-reload
uv run fastapi run            # production
```

`pyproject.toml` sets the entry point once, so the commands are the same in
every project:

```toml
[tool.fastapi]
entrypoint = "app.main:app"
```

The entry point is always `app/main.py` and the app object is always named
`app`. Don't use `server.py`, `run.py`, `api.py` or a root-level `main.py`.

## 2. What goes where

### app/main.py — wiring only

Create the app, the lifespan (shared clients opened once, closed on shutdown),
middleware, routers and error handlers. No endpoint logic here.

```python
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import engine
from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError
from app.core.logging import setup_logging
from app.routers import health, users


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    yield
    engine.dispose()


# API docs are for development; production doesn't publish its API map.
show_docs = settings.app_env != "production"
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    lifespan=lifespan,
    docs_url="/docs" if show_docs else None,
    redoc_url=None,
    openapi_url="/openapi.json" if show_docs else None,
)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.allowed_hosts)

app.include_router(health.router)
app.include_router(users.router)


@app.exception_handler(NotFoundError)
async def handle_not_found(request: Request, error: NotFoundError):
    return JSONResponse(status_code=status.HTTP_404_NOT_FOUND, content={"detail": str(error)})


@app.exception_handler(ConflictError)
async def handle_conflict(request: Request, error: ConflictError):
    return JSONResponse(status_code=status.HTTP_409_CONFLICT, content={"detail": str(error)})


@app.exception_handler(ForbiddenError)
async def handle_forbidden(request: Request, error: ForbiddenError):
    return JSONResponse(status_code=status.HTTP_403_FORBIDDEN, content={"detail": str(error)})
```

If CORS is needed, add `CORSMiddleware` here with origins from
`settings.cors_origins` — never `allow_origins=["*"]` outside local development.

### app/core/config.py — all settings in one place

```python
from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Project Name API"
    app_version: str = "0.1.0"
    app_env: str = "local"         # local | staging | production
    database_url: SecretStr
    jwt_secret: SecretStr
    allowed_hosts: list[str] = ["localhost", "127.0.0.1", "testserver"]  # testserver = TestClient
    cors_origins: list[str] = []   # in .env as JSON: CORS_ORIGINS=["https://a.cbm.com.sg"]


settings = Settings()
```

Code reads configuration through `settings`, never `os.environ` directly.
Secrets (passwords, keys, URLs containing passwords) are `SecretStr` and read
with `.get_secret_value()`. Every field also appears in `.env.example`; list
fields are written as JSON there.

### app/core/database.py — database connection

```python
from collections.abc import Iterator
from typing import Annotated

from fastapi import Depends
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings

# MySQL URL form: mysql+pymysql://user:password@host:3306/dbname?charset=utf8mb4
engine = create_engine(
    settings.database_url.get_secret_value(),
    pool_pre_ping=True,
    pool_recycle=3600,  # MySQL drops idle connections after wait_timeout
)
SessionLocal = sessionmaker(bind=engine, autoflush=False)


class Base(DeclarativeBase):
    pass


def get_db() -> Iterator[Session]:
    """One session and one transaction per request: commit if the endpoint succeeds, roll back if it raises."""
    with SessionLocal() as db:
        try:
            yield db
            db.commit()
        except Exception:
            db.rollback()
            raise


DbSession = Annotated[Session, Depends(get_db)]
```

### app/models/user.py — one table per file

```python
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True)
    full_name: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(default=True)
    is_admin: Mapped[bool] = mapped_column(default=False)
```

Add the import to `app/models/__init__.py` (`from app.models.user import User`)
so Alembic autogenerate finds it. In `alembic/env.py`, `import app.models`,
set `target_metadata = Base.metadata`, and take the URL from `settings` —
not from `alembic.ini`.

### app/schemas/user.py — request and response shapes

```python
from pydantic import BaseModel, ConfigDict, EmailStr


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str


class UserUpdate(BaseModel):
    full_name: str | None = None


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    full_name: str
```

(`EmailStr` needs the `email-validator` package.)

### app/services/user_service.py — logic and queries

Plain functions that take the session as the first argument. Use a class only
when the service holds state (e.g. a client for an external API).

```python
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import ForbiddenError, NotFoundError
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate


def ensure_can_manage(current_user: User, user_id: int) -> None:
    """Users manage their own profile; admins manage everyone's."""
    if current_user.id != user_id and not current_user.is_admin:
        raise ForbiddenError("You can't access this user")


def get_user(db: Session, user_id: int, current_user: User) -> User:
    ensure_can_manage(current_user, user_id)
    user = db.get(User, user_id)
    if user is None:
        raise NotFoundError("User not found")
    return user


def list_users(db: Session, current_user: User, page: int = 1, page_size: int = 50) -> list[User]:
    if not current_user.is_admin:
        raise ForbiddenError("Only admins can list users")
    query = select(User).order_by(User.id).limit(page_size).offset((page - 1) * page_size)
    return list(db.scalars(query))


def create_user(db: Session, data: UserCreate, current_user: User) -> User:
    if not current_user.is_admin:
        raise ForbiddenError("Only admins can create users")
    user = User(email=data.email, full_name=data.full_name)
    db.add(user)
    db.flush()  # gets the id; the request commits (core/database.py)
    return user


def update_user(db: Session, user_id: int, data: UserUpdate, current_user: User) -> User:
    user = get_user(db, user_id, current_user)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    db.flush()
    return user
```

Every service function that reads or changes a record takes the current user
and checks they may do it — not just that they are logged in (a user may
open *their own* record, not `/users/{any id}`). Lists are paginated, never
"all rows".

Services don't know about HTTP: they never raise `HTTPException` or return
`Response` objects. They return data or raise a domain exception from
`app/core/exceptions.py`, which `main.py` maps to a status code.

Services never call `commit()`: the request owns the transaction
(`get_db`), so several service calls in one request succeed or fail
together. Use `db.flush()` when you need generated IDs. Status changes lock
the row (`select(...).with_for_update()`) before checking the status — see
`reliability-and-observability.md`.

### app/routers/users.py — thin HTTP layer

```python
from fastapi import APIRouter, status

from app.core.database import DbSession
from app.dependencies import CurrentUser
from app.schemas.user import UserCreate, UserResponse, UserUpdate
from app.services import user_service

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserResponse])
def list_users(db: DbSession, current_user: CurrentUser, page: int = 1):
    return user_service.list_users(db, current_user, page=page)


@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: DbSession, current_user: CurrentUser):
    return user_service.get_user(db, user_id, current_user)


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(data: UserCreate, db: DbSession, current_user: CurrentUser):
    return user_service.create_user(db, data, current_user)


@router.patch("/{user_id}", response_model=UserResponse)
def update_user(user_id: int, data: UserUpdate, db: DbSession, current_user: CurrentUser):
    return user_service.update_user(db, user_id, data, current_user)
```

A router function reads the request, calls one service function, and returns
the result. Dependencies are written as `Annotated` aliases (`DbSession`,
`CurrentUser` in `dependencies.py`), never `= Depends(...)` defaults.

### app/dependencies.py and app/core/security.py — who is calling

Every router except `health` takes `CurrentUser`. The example checks a JWT
signed with `settings.jwt_secret` (PyJWT); with company SSO (Microsoft
Entra, Keycloak), `decode_access_token` validates that provider's token
instead — the rest stays the same.

```python
# app/core/security.py
import jwt

from app.core.config import settings


def decode_access_token(token: str) -> int:
    """Return the user id in a valid token; raise jwt.PyJWTError otherwise."""
    payload = jwt.decode(token, settings.jwt_secret.get_secret_value(), algorithms=["HS256"])
    return int(payload["sub"])
```

```python
# app/dependencies.py
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.core.database import DbSession
from app.core.security import decode_access_token
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")


def get_current_user(token: Annotated[str, Depends(oauth2_scheme)], db: DbSession) -> User:
    not_authenticated = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        user_id = decode_access_token(token)
    except jwt.PyJWTError:
        raise not_authenticated
    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise not_authenticated
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
```

Tests override `get_current_user` (`app.dependency_overrides[get_current_user] = lambda: some_user`)
and cover, for each endpoint: the owner, another user (403) and no token (401).

### app/clients/ — external systems

One module per external system, e.g. `app/clients/llm_client.py` for the vLLM
server. Create the underlying client (`AsyncOpenAI`, `httpx.AsyncClient`) once
in the lifespan, set explicit timeouts, and read base URL and model name from
`settings`.

### app/routers/health.py — always present

```python
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.core.database import DbSession

router = APIRouter(prefix="/health", tags=["health"])


@router.get("/live")
def live():
    return {"status": "ok"}


@router.get("/ready")
def ready(db: DbSession):
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        return JSONResponse(status_code=503, content={"status": "unavailable", "failed": "database"})
    return {"status": "ok"}
```

### tests/conftest.py

Tests never touch the database in `.env` — it may be production. They use a
local test database from `TEST_DATABASE_URL`, refuse to start otherwise, and
roll back every test's changes.

```python
import os
from urllib.parse import urlparse

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.core.database import Base, get_db
from app.main import app

LOCAL_HOSTS = {"127.0.0.1", "localhost", "mysql", "db"}
TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL", "mysql+pymysql://root@127.0.0.1:3306/project_test")

if urlparse(TEST_DATABASE_URL).hostname not in LOCAL_HOSTS or "test" not in TEST_DATABASE_URL:
    raise RuntimeError("Tests must use a local test database (TEST_DATABASE_URL).")

test_engine = create_engine(TEST_DATABASE_URL)
Base.metadata.create_all(test_engine)


@pytest.fixture
def db():
    # Each test runs inside a transaction that is rolled back afterwards.
    with test_engine.connect() as connection:
        transaction = connection.begin()
        session = Session(bind=connection, join_transaction_mode="create_savepoint")
        yield session
        session.close()
        transaction.rollback()


@pytest.fixture
def client(db):
    app.dependency_overrides[get_db] = lambda: db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
```

Use a local MySQL test database, not SQLite — it behaves differently. Code
that uses `SessionLocal` directly instead of the `DbSession` dependency would
bypass this override, so services always take the session as an argument.

## 3. Sync vs async — the one rule juniors get wrong

- **Inside `async def`, every slow call must be awaited** (`await client.post(...)`).
  A sync DB query, `requests.get()` or `time.sleep()` inside `async def`
  freezes the whole server for every user.
- **CRUD services with a database:** sync `def` endpoints and sync SQLAlchemy
  (FastAPI runs them in a thread pool). This is the default.
- **LLM / streaming services:** `async def` endpoints with async clients end
  to end. LLM calls take 10–60 seconds; in sync endpoints they exhaust the
  thread pool.
- **Both in one project:** DB endpoints stay sync, LLM endpoints are async —
  or the whole project moves to `AsyncSession`. Don't mix inside one endpoint.

## 4. Naming rules

| Thing | Rule | Example |
|---|---|---|
| Project folder | kebab-case | `leave-request-api` |
| Python files and folders | snake_case | `leave_request.py` |
| Resource files | singular noun, same name in models/schemas | `models/leave_request.py`, `schemas/leave_request.py` |
| Router files | plural noun | `routers/leave_requests.py` |
| Service files | `<resource>_service.py` | `services/leave_request_service.py` |
| Model classes | singular PascalCase | `LeaveRequest` |
| Table names | plural snake_case | `leave_requests` |
| Schema classes | `<Model>Create`, `<Model>Update`, `<Model>Response` | `LeaveRequestCreate` |
| Service functions | verb + noun | `get_leave_request`, `list_leave_requests`, `approve_leave_request` |
| Dependency aliases | PascalCase noun | `DbSession`, `CurrentUser` |
| URL paths | plural kebab-case nouns | `/leave-requests/{leave_request_id}` |
| Settings fields | snake_case; env vars UPPER_CASE | `database_url` ↔ `DATABASE_URL` |

Endpoint paths are nouns; the HTTP method is the verb (`POST /leave-requests`,
not `/createLeaveRequest`). Use an action sub-path only for real actions that
aren't create/update/delete: `POST /leave-requests/{id}/approve`.

## 5. Adding a new resource — checklist

1. `app/models/thing.py` — table class; import it in `app/models/__init__.py`.
2. `uv run alembic revision --autogenerate -m "add things table"`, then review the file (drops, renames and type changes are 🟠). Apply it only to a local database; production is AK's job, after a backup.
3. `app/schemas/thing.py` — `ThingCreate`, `ThingUpdate`, `ThingResponse`.
4. `app/services/thing_service.py` — the logic and queries.
5. `app/routers/things.py` — endpoints calling the service.
6. Register in `app/main.py`: `app.include_router(things.router)`.
7. `tests/test_things.py` — the happy path, one error case, and the permission cases: owner, another user (403), no token (401).
8. New settings → `config.py` **and** `.env.example`.

## 6. Defaults and when to change them

| Decision | Default | Change only when |
|---|---|---|
| Python / packages | Python 3.13, `uv` with `pyproject.toml` + `uv.lock` | Deployment server can't run uv → export `requirements.txt` from uv |
| Lint / format | `ruff` (configured in `pyproject.toml`) | Never |
| Database library | SQLAlchemy 2.0, sync sessions, `pymysql` | The project already uses something else |
| Async | See section 3 | — |
| Migrations | Alembic | No database |
| Config | `pydantic-settings` + `.env` | Never |
| Tests | `pytest` + FastAPI `TestClient` | Never |
| API prefix | none | Several API consumers or public API → `/api/v1` on all routers |
| Folder layout | by type (`routers/`, `schemas/`, ...) | More than ~8 resources → group by domain: `app/<domain>/{router,schemas,models,service}.py` |
| Extra folders | `clients/` when there's an external system | Real need: `workers/` (background jobs), `prompts/` (LLM prompt files). Add next to the standard folders and mention it. |

A project without a database simply leaves out `core/database.py`, `models/`
and `alembic/`; everything else stays the same.
