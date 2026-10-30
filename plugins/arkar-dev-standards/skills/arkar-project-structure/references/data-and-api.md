# Data and API standard (all stacks)

How every project designs its database, migrations and APIs, so data stays
correct as it grows and every client (web, Flutter, other teams, agents)
talks to every backend the same way. Read this when adding a model, table,
migration or endpoint. Stack templates show the framework syntax; this file
sets the rules.

## Contents
1. Tables and columns
2. Constraints and indexes
3. Deleting, history and audit
4. Migrations that are safe in production
5. Queries and performance
6. API contract
7. Checklist

## 1. Tables and columns

- **Money:** `DECIMAL(12,2)` (or more digits where needed) — never float.
  Python `Decimal`, PHP strings/`brick/money`, Dart `int` cents or `Decimal`.
  Store the currency when there can be more than one.
- **Time:** store `DATETIME`/`TIMESTAMP` in UTC (Django `USE_TZ = True`,
  Laravel `'timezone' => 'UTC'` in config with display in `Asia/Singapore`,
  SQLAlchemy `DateTime(timezone=True)`). Convert to Singapore time only for
  display and for business rules that are about local days (leave dates,
  shift days). Pure dates (`start_date`) are `DATE`, not datetimes.
- **Status:** a short string column backed by an enum in code
  (`LeaveStatus`), not free text and not magic integers.
- **Identifiers:** auto-increment integer primary keys inside the system;
  where IDs appear in URLs given to outsiders (public links, QR codes), add a
  separate random `uuid`/ULID column and look records up by that.
- **Personal data** (NRIC, phone, salary, medical): only the columns the
  feature needs; NRIC stored masked or encrypted when the full value isn't
  required (Laravel `encrypted` cast, Django field encryption); never in
  logs (see the security checklist).
- **Every table** has `created_at` and `updated_at`.

## 2. Constraints and indexes

The database protects data integrity even when code has a bug.

- **Foreign keys** on every relation (`constrained()` in Laravel,
  `ForeignKey(..., on_delete=PROTECT)` in Django, `ForeignKey` in
  SQLAlchemy). Prefer `RESTRICT`/`PROTECT` on business records; `CASCADE`
  only for true children (lines of an invoice).
- **Unique constraints** for anything that must not repeat (one approval
  per step, one active record per staff per day, idempotency keys).
- **Check constraints** for simple rules (`end_date >= start_date`,
  `amount >= 0`).
- **NOT NULL** unless empty is a real, meaningful value.
- **Indexes:** every foreign key; every column used to filter, join or
  sort in a list screen or report; composite indexes in the order queries
  use them (`(status, created_at)` for "pending, newest first"). Don't index
  everything — each index slows writes.

## 3. Deleting, history and audit

- **Soft delete** (`deleted_at`) for business records people may need to
  see again or that other records point to (staff, sites, requests, claims).
  Hard delete only for true scratch data. Lists exclude soft-deleted rows by
  default (Laravel `SoftDeletes`, a Django manager).
- **Audit trail** for every system that approves, pays, rates or changes
  people's records (HR, leave, claims, work orders, access): who did what,
  when, and the before/after values. Use a package where the stack has a
  good one — Laravel `owen-it/laravel-auditing` or `spatie/laravel-activitylog`,
  Django `django-simple-history` (or `django-auditlog`), SQLAlchemy: an
  `audit_log` table written by the service. Status changes (approve, reject,
  cancel) write their audit row **inside the same transaction** as the change.
- **Retention:** personal data is kept only as long as needed (PDPA); agree
  the period with AK and purge with a scheduled task, not by hand.

## 4. Migrations that are safe in production

Claude writes migrations; AK applies them to shared and production databases
(Rule 0). Write them so applying is boring:

- **One concern per migration,** reviewed before it's applied: show the SQL
  (`sqlmigrate`, `alembic upgrade --sql`, `artisan migrate --pretend`).
- **Never edit a migration that has run anywhere shared** — add a new one.
- **Expand, then contract** for anything destructive. Renaming or removing
  a column takes two releases: (1) add the new column, write to both, backfill
  in batches; (2) after the release is stable, stop using the old column and
  drop it. Never rename/drop in the same release that changes the code.
- **NOT NULL on an existing table:** add nullable → backfill in batches →
  add the constraint in a later migration.
- **Big tables** (hundreds of thousands of rows and up, MySQL): adding
  indexes or columns can lock writes. Use `ALGORITHM=INPLACE, LOCK=NONE` where
  MySQL supports it, or plan the change for a quiet window with AK.
- **Data backfills** are separate, batched, re-runnable scripts or
  commands, not part of a schema migration.
- **Down/rollback:** provide one where the framework expects it, but plan
  production recovery as a backup restore or a forward fix — a `down` that
  drops a column loses data.
- Label drops, renames, type narrowing, NOT NULL changes and big-table
  changes 🟠 in the proposal list.

## 5. Queries and performance

- **No N+1 queries:** Laravel `with()` / `load()` plus
  `Model::preventLazyLoading(! app()->isProduction())` (or
  `Model::shouldBeStrict()`); Django `select_related` (FK) and
  `prefetch_related` (many); SQLAlchemy `selectinload` / `joinedload`. A list
  page makes a fixed number of queries whatever the row count; test it
  (`assertQueryCount`-style / `django_assert_num_queries`).
- **Paginate every list** an API or screen returns (default 20–50, max
  100). Never `all()` into a response.
- **Select what you need** for lists and exports; stream or chunk big
  exports (`chunkById`, `iterator()`, `yield_per`) instead of loading
  everything into memory.
- **Counts and sums in the database** (`COUNT`, `SUM`, `GROUP BY`), not by
  loading rows into code.
- **Cache** only what is read far more than it changes (settings, lookup
  lists, dashboard totals): Laravel `Cache::remember`, Django cache framework,
  Redis where available; every cached value has an expiry and is cleared when
  its data changes.
- **Slow queries:** look at `EXPLAIN` for any query on a big table that a
  screen or job runs often; add the missing index rather than caching around
  it.

## 6. API contract

The same rules for FastAPI, Django Ninja and Laravel APIs, so the Flutter
app and other clients handle every backend the same way.

- **URLs:** plural kebab-case nouns, the HTTP method is the verb, actions as
  sub-paths (`POST /leave-requests/{id}/approve`).
- **Versioning:** internal APIs used only by the project's own pages are
  unversioned. APIs used by mobile apps, other teams or external systems are
  under `/api/v1` from the start; breaking changes go to `/api/v2` while v1
  keeps working until its clients have moved.
- **Success shape:** a single object for one record; lists as
  `{"data": [...], "meta": {"page": 1, "per_page": 20, "total": 134}}`
  (Laravel API resources already produce `data` + `meta`; FastAPI and Ninja
  use a matching `Page` schema).
- **Error shape** (every status ≥ 400), based on RFC 9457 problem details:

  ```json
  {"type": "validation_error", "title": "The leave dates are not valid.",
   "status": 422, "errors": {"end_date": ["must be on or after start_date"]}}
  ```

  `type` is a stable machine-readable code, `title` a message safe to show
  users, `errors` field-level messages for validation. Never stack traces,
  SQL or internal paths. Each stack maps its exceptions to this shape in one
  place (FastAPI exception handlers, Ninja `api.exception_handler`, Laravel
  `withExceptions()` rendering for `api/*`).
- **Status codes:** 200 read/update, 201 create, 204 delete, 400 bad
  request, 401 not logged in, 403 not allowed, 404 not found (also for
  records the user may not see), 409 conflict (wrong status, duplicate), 422
  validation, 429 rate limited, 500 server error.
- **Idempotency:** create endpoints called by mobile apps, agents or other
  systems accept an `Idempotency-Key` header; the server stores the key with
  the result (unique constraint) and returns the same result for a repeat,
  so a retry after a timeout doesn't create a second leave request or
  payment.
- **Dates** in ISO 8601 (`2026-10-31`, `2026-10-31T09:30:00+08:00`), money
  as strings or integer cents in JSON, never floats.
- **Documentation:** FastAPI and Ninja publish OpenAPI in non-production
  environments; Laravel APIs used by others get an OpenAPI file (e.g.
  `dedoc/scramble`). The Flutter app's models follow that contract.

## 7. Checklist for a new model or endpoint

1. Column types: money `DECIMAL`, times UTC, status enum, only needed
   personal data.
2. FKs, unique and check constraints, NOT NULL, indexes for its list
   filters and sorts.
3. Soft delete? Audit trail (who/when/before/after) for approvals and
   people's records?
4. Migration safe to apply on a live table (expand/contract, no locks on big
   tables); SQL shown; 🟠 if destructive.
5. List endpoint paginated, no N+1, query count tested.
6. Responses and errors in the standard shapes; status codes; idempotency
   key if mobile/agents/other systems create records.
