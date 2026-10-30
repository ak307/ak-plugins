# Reliability and observability (all stacks)

How every project behaves when things go wrong — retries, timeouts, two
people clicking at once, a server restart — and how AK finds out what
happened. Read this when adding background jobs, integrations, scheduled
tasks, status changes, or when setting up a new project.

## Contents
1. Transactions and status changes
2. Background jobs
3. Calls to other systems
4. Logging
5. Error tracking
6. Health checks
7. Checklist for a new project

## 1. Transactions and status changes

- One business operation = one transaction (Laravel `DB::transaction`,
  Django `transaction.atomic`, SQLAlchemy one commit per request).
- **Status changes lock, check, write** in that transaction
  (`lockForUpdate()`, `select_for_update()`, SQLAlchemy `with_for_update()`),
  or use a conditional update (`UPDATE … SET status='approved' WHERE id=? AND
  status='pending'`) and check one row changed. Either way, a double click or
  two approvers can't both succeed.
- **FastAPI:** services don't commit one by one; the request owns the unit
  of work so several service calls succeed or fail together:

  ```python
  # app/core/database.py
  def get_db() -> Iterator[Session]:
      """One transaction per request: commit if the endpoint succeeds, roll back if it raises."""
      with SessionLocal() as db:
          try:
              yield db
              db.commit()
          except Exception:
              db.rollback()
              raise
  ```

  Services call `db.flush()` when they need generated IDs, never `commit()`.
  (A service that must commit early — e.g. before calling a slow external
  system — says so in its docstring.)

## 2. Background jobs

Laravel queues, Django-Q2 (or Celery where the project already uses it),
FastAPI workers.

- **Dispatch after commit:** a job queued inside a transaction can run
  before the data exists. Laravel `->afterCommit()` (or
  `'after_commit' => true` in `config/queue.php`), Django
  `transaction.on_commit(lambda: async_task(...))`.
- **Pass IDs, not objects;** the job loads fresh data and re-checks the
  status (the record may have changed or been cancelled).
- **Safe to run twice:** retries and duplicate dispatches happen. Check
  "already done" first (status, a unique constraint, a `sent_at` column)
  before sending an email, charging, or calling another system. Laravel
  `ShouldBeUnique` / `WithoutOverlapping` for jobs that must not run in
  parallel.
- **Retries with backoff and a limit** (Laravel `$tries`, `backoff()`;
  Django-Q2 `retry`/`max_attempts`), and a **timeout** shorter than the
  queue's retry window.
- **Failures are visible:** failed jobs land in `failed_jobs` (Laravel) /
  the Django-Q2 failed list, reported to error tracking; someone reviews them.
- **Scheduled tasks** (Laravel scheduler, Django-Q2 schedules) run on one
  server only (`onOneServer()` / a single cluster) and are safe to run late
  or twice.

## 3. Calls to other systems

Outlook/Graph, SMS gateways, payment, the LLM server, other CBM systems.

- **Timeouts on every call** (connect ~5 s, read ~30 s; LLM calls longer
  and async) — never the library default of "forever".
- **Retries only for safe cases:** network errors and 502/503/504/429 on
  reads or idempotent writes, with backoff and a small limit (Laravel
  `Http::retry(3, 200)`, `httpx` transport retries, `tenacity`). Never blindly
  retry a payment or a "send".
- **Wrap each external system in one client class** (`Services/` in
  Laravel, `clients/` in FastAPI, `adapters/` in Django) so timeouts, retries,
  auth and logging live in one place and tests can fake it.
- **Degrade gracefully:** if the external system is down, the user sees a
  clear message and nothing is half-done; work that can wait goes to a job.

## 4. Logging

- **Structured (JSON) logs in production,** one event per line, with a
  **request ID** on every line so one request can be followed across logs:
  - Laravel: a middleware that sets `Context::add('request_id', ...)` (from
    `X-Request-ID` or a new UUID) and returns it in the response header; the
    `daily` or `stderr` channel with a JSON formatter in production.
  - Django: a middleware that stores the request ID in a `contextvars`
    variable and a logging filter that adds it; `python-json-logger` (or
    `structlog`) formatter.
  - FastAPI: the same with a middleware + `contextvars`; `structlog` or
    `python-json-logger`.
- **What to log:** errors with context (record IDs, never personal data or
  secrets), security events (failed logins, permission denials), calls to
  external systems (target, status, duration), job start/finish/failure,
  slow requests. Not every request body.
- **Never log** passwords, tokens, NRIC, phone numbers, salaries, medical
  details, full request bodies of forms with personal data.
- **Levels:** `INFO` in production, `DEBUG` only locally; `LOG_LEVEL` from
  the environment.
- **Agents:** log tokens, latency and tool calls per run, even with
  tracing off (see `django-agentic.md`).

## 5. Error tracking

Every deployed project reports unhandled exceptions to an error tracker, so
AK hears about errors before users do. Prefer a **self-hosted GlitchTip**
(Sentry-compatible, keeps data in CBM) or Sentry if the company uses it —
the code is the same Sentry SDK:

- Laravel `sentry/sentry-laravel`, Django/FastAPI `sentry-sdk`, Flutter
  `sentry_flutter`.
- DSN from the environment; `send_default_pii=False`; scrub request bodies,
  cookies and headers with personal data; sample performance traces lightly
  (`traces_sample_rate` 0.05–0.1).
- Set `environment` (local/staging/production) and `release` (the git SHA
  or version) so errors point at a deploy.

## 6. Health checks

Two endpoints in every web service, the same paths on every stack:

| Path | Answers | Checks |
|---|---|---|
| `/health/live` | "the process is up" | nothing external — always 200 if the app runs |
| `/health/ready` | "it can serve traffic" | database (`SELECT 1`), and cache/queue if the app can't work without them; 503 with which check failed |

No authentication, no personal data or version details in the response,
and excluded from request logs. (Laravel's built-in `/up` can stay; add
`/health/ready`.) Monitoring and load balancers use `/health/ready`.

## 7. Checklist for a new project

1. Request-owned transactions; status changes locked; jobs dispatched after
   commit, safe to repeat, retried with backoff, with timeouts.
2. One client class per external system, with timeouts and safe retries.
3. JSON logs with a request ID in production; nothing personal or secret
   in logs.
4. Error tracking (GlitchTip/Sentry SDK) wired, PII off, `environment` and
   `release` set.
5. `/health/live` and `/health/ready`.
6. CI and deployment set up with `arkar-delivery`.
