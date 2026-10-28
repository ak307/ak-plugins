# FastAPI standard template

Use this for every new FastAPI project. Names and locations are fixed so any
FastAPI project looks familiar the moment you open it.

## Contents
1. Folder tree
2. What goes in each file (with skeletons)
3. Naming rules
4. Adding a new resource — checklist
5. Defaults and when to change them

## 1. Folder tree

```
project-name/                  # kebab-case folder name
├── app/
│   ├── __init__.py
│   ├── main.py                # creates the FastAPI app, registers routers
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py          # Settings class, reads .env
│   │   └── database.py        # engine, SessionLocal, Base, get_db()
│   ├── routers/               # HTTP endpoints, one file per resource
│   │   ├── __init__.py
│   │   └── health.py
│   ├── schemas/               # Pydantic request/response models, one file per resource
│   │   └── __init__.py
│   ├── models/                # SQLAlchemy tables, one file per resource
│   │   └── __init__.py        # imports every model so Alembic sees them
│   ├── services/              # business logic + database queries, one file per resource
│   │   └── __init__.py
│   └── dependencies.py        # shared Depends() helpers (auth, current user, pagination)
├── alembic/                   # created by `alembic init alembic` (only if the project has a DB)
├── alembic.ini
├── tests/
│   ├── __init__.py
│   └── test_health.py
├── .env.example               # every setting, with safe placeholder values
├── .gitignore                 # includes .env, .venv/, __pycache__/
├── requirements.txt
└── README.md                  # install, configure, run, test
```

Run locally:

```
uvicorn app.main:app --reload
```

The entry point is always `app/main.py` and the app object is always named
`app`. Don't use `server.py`, `run.py`, `api.py` or a root-level `main.py`.

## 2. What goes in each file

### app/main.py — wiring only

Create the app, add middleware, include routers. No endpoint logic here.

```python
from fastapi import FastAPI

from app.core.config import settings
from app.routers import health, users

app = FastAPI(title=settings.app_name, version=settings.app_version)

app.include_router(health.router)
app.include_router(users.router)
```

If CORS is needed, add `CORSMiddleware` here with origins read from
`settings.cors_origins` — never `allow_origins=["*"]` outside local development.

### app/core/config.py — all settings in one place

```python
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    app_name: str = "Project Name API"
    app_version: str = "0.1.0"
    database_url: str
    cors_origins: list[str] = []


settings = Settings()
```

Code reads configuration through `settings`, never `os.environ` directly.
Every field also appears in `.env.example`.

### app/core/database.py — database connection

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False)


class Base(DeclarativeBase):
    pass


def get_db():
    """Give each request its own session and always close it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
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
```

Add the import to `app/models/__init__.py` (`from app.models.user import User`)
so Alembic autogenerate finds it.

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

### app/services/user_service.py — logic and queries

Plain functions that take the session as the first argument. Use a class only
when the service holds state (e.g. a client for an external API).

```python
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.user import UserCreate


def get_user(db: Session, user_id: int) -> User | None:
    return db.get(User, user_id)


def list_users(db: Session) -> list[User]:
    return list(db.scalars(select(User).order_by(User.id)))


def create_user(db: Session, data: UserCreate) -> User:
    user = User(email=data.email, full_name=data.full_name)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
```

Services don't know about HTTP: they never raise `HTTPException` or return
`Response` objects. They return data or `None`, or raise a domain exception
(define those in `app/core/exceptions.py` when you need them).

### app/routers/users.py — thin HTTP layer

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.user import UserCreate, UserResponse
from app.services import user_service

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = user_service.get_user(db, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(data: UserCreate, db: Session = Depends(get_db)):
    return user_service.create_user(db, data)
```

A router function reads the request, calls one service function, and turns the
result into a response or an HTTP error. If it grows beyond that, move the
logic into the service.

### app/routers/health.py — always present

```python
from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check():
    return {"status": "ok"}
```

## 3. Naming rules

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
| URL paths | plural kebab-case nouns | `/leave-requests/{leave_request_id}` |
| Settings fields | snake_case; env vars UPPER_CASE | `database_url` ↔ `DATABASE_URL` |

Endpoint paths are nouns; the HTTP method is the verb (`POST /leave-requests`,
not `/createLeaveRequest`). Use an action sub-path only for real actions that
aren't create/update/delete: `POST /leave-requests/{id}/approve`.

## 4. Adding a new resource — checklist

For a new resource `thing`:

1. `app/models/thing.py` — table class; import it in `app/models/__init__.py`.
2. `alembic revision --autogenerate -m "add things table"` then review the file.
3. `app/schemas/thing.py` — `ThingCreate`, `ThingUpdate`, `ThingResponse`.
4. `app/services/thing_service.py` — the logic and queries.
5. `app/routers/things.py` — endpoints calling the service.
6. Register in `app/main.py`: `app.include_router(things.router)`.
7. `tests/test_things.py` — at least the happy path and one error case.
8. New settings → `config.py` **and** `.env.example`.

## 5. Defaults and when to change them

| Decision | Default | Change only when |
|---|---|---|
| Database library | SQLAlchemy 2.0, sync sessions | The project already uses something else |
| Async | Sync `def` endpoints | Most endpoints wait on slow external I/O (LLM calls, HTTP APIs); then use `async def` with async clients consistently across the project |
| Migrations | Alembic | No database |
| Config | `pydantic-settings` + `.env` | Never |
| Tests | `pytest` + FastAPI `TestClient` | Never |
| Extra folders | none | Real need: `workers/` (background jobs), `clients/` (external API wrappers), `prompts/` (LLM prompt files). Add next to the standard folders and mention it. |

A project without a database simply leaves out `core/database.py`, `models/`
and `alembic/`; everything else stays the same.
