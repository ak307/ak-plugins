# Leave API

FastAPI backend for staff leave requests. Staff submit leave, managers approve or
reject it, and leave can be listed per staff member. Data is stored in MySQL.

## Install

Requires Python 3.12 and [uv](https://docs.astral.sh/uv/).

```
uv sync
```

## Configure

```
cp .env.example .env
```

Edit `.env` and set `DATABASE_URL` for your MySQL database (create the empty database first,
using the `utf8mb4` character set).

## Create the tables

```
uv run alembic upgrade head
```

After changing a model, create a new migration and review it before applying:

```
uv run alembic revision --autogenerate -m "describe the change"
```

## Run

```
uv run fastapi dev      # development, auto-reload
uv run fastapi run      # production
```

Interactive API docs are at `http://localhost:8000/docs`.

## Test

The tests create and drop tables, so they need their own empty MySQL database:

```
TEST_DATABASE_URL="mysql+pymysql://user:password@localhost:3306/leave_db_test?charset=utf8mb4" uv run pytest
```

## Endpoints

| Method | Path | What it does |
|---|---|---|
| POST | `/staff` | Create a staff member (`is_manager` marks managers) |
| GET | `/staff/{staff_id}` | Get one staff member |
| POST | `/leave-requests` | Submit leave: `staff_id`, `leave_type`, `start_date`, `end_date`, `reason` |
| GET | `/leave-requests` | List leave. Filters: `staff_id`, `status`; paging: `limit`, `offset` |
| GET | `/leave-requests/{leave_request_id}` | Get one leave request |
| POST | `/leave-requests/{leave_request_id}/approve` | Manager approves: `manager_id`, optional `comment` |
| POST | `/leave-requests/{leave_request_id}/reject` | Manager rejects: `manager_id`, optional `comment` |
| GET | `/health` | Health check |

Leave types: `annual`, `sick`, `unpaid`, `other`. Statuses: `pending`, `approved`, `rejected`.

Rules enforced:

- `end_date` cannot be before `start_date`.
- A staff member cannot have overlapping pending or approved leave.
- Only a staff member with `is_manager` set can approve or reject, and not their own leave.
- A leave request can be reviewed only once.

## Known gap: no authentication

The API does not log anyone in. Callers say who they are with `staff_id` and `manager_id`
in the request body, so anyone who can reach the API can act as any manager. Add real
authentication (for example a `CurrentUser` dependency in `app/dependencies.py`) before
exposing it outside a trusted network, then take the ids from the logged-in user instead
of the request body.
