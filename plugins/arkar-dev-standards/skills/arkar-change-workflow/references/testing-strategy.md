# Testing strategy

What to test, at which level, so the expensive bugs in AK's systems —
someone seeing or approving what they shouldn't, a workflow reaching a wrong
state, money or leave miscounted — are caught by tests, not users.

## Contents
1. Where tests run (Rule 0)
2. The levels
3. Tests every change needs
4. Test data
5. Coverage
6. End-to-end journeys
7. When tests are slow or flaky

## 1. Where tests run (Rule 0)

Tests only ever run against a local or throwaway database, with mail, SMS,
queues and external APIs faked. Each stack template has a guard that stops
the test run if the database isn't local (`tests/TestCase.php`,
`conftest.py`). If a project has no such guard, propose adding it (🟢 test
setup only) before relying on its tests.

## 2. The levels

| Level | Tests | Speed | Share |
|---|---|---|---|
| Unit | Business rules in services/Actions/models with no HTTP: calculations, status transitions, permission functions | milliseconds | most tests |
| Feature / integration | One endpoint or page through the framework's test client, with the real (test) database: validation, permissions, response shape, side effects on fakes | fast | every endpoint |
| End-to-end | A few critical user journeys in a real browser (Playwright) | slow | 3–5 per app |

Laravel: Pest unit + feature tests. Django: pytest-django with the test
client and factory_boy. FastAPI: pytest + TestClient. Flutter: unit tests
for notifiers/repositories, widget tests for screens, a few integration
tests (see `arkar-frontend-qa/references/mobile-qa.md`). Front-end logic in
React: Vitest for non-trivial hooks and utilities.

## 3. Tests every change needs

- **The behaviour you added or fixed:** the happy path and the main error
  case. A bug fix starts with a test that fails before the fix.
- **Permissions, for every endpoint or action you add or touch:**
  - the owner / the right role → allowed;
  - another ordinary user → 403 (or 404 if the record must stay hidden);
  - not logged in → 401 / redirect to login.
  Lists return only what the user may see.
- **Status transitions** (approve, reject, cancel, pay): each allowed
  transition works; each disallowed one (approving a draft, rejecting an
  approved request, acting twice) is refused with 409 and changes nothing;
  the audit row is written.
- **Validation:** boundaries (0, negative, exactly on a limit, empty, too
  long, wrong date order).
- **Side effects on fakes:** the email/notification/job is sent once, to
  the right person, only on success (`Mail::assertSent`, `Queue::assertPushed`,
  Django `mail.outbox`).
- **Query count** for list endpoints you add (no N+1).

## 4. Test data

- Factories (Laravel factories, factory_boy, Flutter fakes) with readable
  defaults and named states (`LeaveRequest::factory()->approved()`).
- Each test creates what it needs; no shared fixtures that tests change.
- **Never real data:** no real names, NRIC, phone numbers or salaries
  copied from production into tests or fixtures, even when a bug was found
  with the read-only tool — shape the test data like what you saw, with
  invented values.
- Dates fixed in the test (`travel_to`, `freezegun`/`time-machine`) when the
  rule depends on today, weekends or public holidays.

## 5. Coverage

Coverage is a smoke alarm, not a goal. Aim for:

- **services / Actions / domain models / permission policies: 80%+ line
  coverage,** every branch of status and permission logic;
- controllers, views and routers: covered through feature tests;
- generated code, migrations, settings: not measured.

Run it in CI (`pest --coverage --min=…`, `pytest --cov=app --cov-fail-under=…`)
once a project reaches the target, so it can't silently drop.

## 6. End-to-end journeys

Pick the 3–5 journeys that would hurt most if broken (log in → submit leave
→ manager approves → balance updates; create a work order → assign →
complete). Write them in Playwright against a local app seeded with test
data; run them in CI or before each release. Keep them few and stable: the
lower levels carry the detail.

## 7. When tests are slow or flaky

- A flaky test is a bug: find the cause (time, order, shared data, real
  network) instead of retrying it.
- Slow suites: run the affected tests while working, the full suite before
  finishing; parallelise in CI (`pest --parallel`, `pytest -n auto`).
