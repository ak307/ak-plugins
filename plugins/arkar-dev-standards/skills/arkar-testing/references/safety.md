# Testing safely — environments and data

Testing must never be the thing that damages live data. Everything here
serves that, and always-on section 0 (production safety) overrides anything
that seems to conflict.

## Contents
1. Confirm the target before running
2. When the target isn't safe or isn't clear
3. The test database
4. Isolation between tests
5. External systems
6. End-to-end, performance and load tests
7. Test data
8. Continuous integration

## 1. Confirm the target before running

Find where the test run will really connect, as the command will see it —
the test configuration overrides first, then the application's:

| Stack | Look at |
|---|---|
| Laravel | `phpunit.xml` `<env>` entries and `.env.testing`, then `.env` |
| Django / pytest-django | the settings module's `DATABASES` and its `TEST` block |
| FastAPI / pytest | `conftest.py` overrides, then settings / `.env` |
| Flutter / Firebase | the `--dart-define` file and `firebase_options.dart`; the emulator, never a live project |

Read only the keys that say where things point (host, database name,
environment, mail and queue drivers) — never print the whole file or any
secret. Safe means clearly local or disposable: localhost, a container, an
in-memory database, a name that says test. Mail, SMS, push and queues on
log, array, fake or sync drivers.

A test suite with a guard is safer than a careful reader: the test base
(`tests/TestCase.php`, `conftest.py`) refuses to start unless the database
is local. Each stack template has one.

## 2. When the target isn't safe or isn't clear

Don't run the tests, and don't ask to run them. In the reply:

- say what the tests would have connected to and why that isn't safe —
  especially tests that reset or wipe tables (`RefreshDatabase`, `flush`,
  `drop_all`, truncation in set-up);
- propose the safe setup as a 🟢 test-setup item: a local or disposable
  test database configured in the test configuration only, and the guard;
- list what you could still check without running (reading the tests,
  static checks) and what remains unverified.

Never: edit `.env` or production settings, point the tests somewhere else
by changing shared configuration, or "just run the read-only ones".

## 3. The test database

In order of preference:

1. **The same engine as production, disposable** — a local database or a
   CI service container created for tests. Queries, constraints, types,
   JSON columns and locking behave as they will in production.
2. **In-memory (SQLite and the like)** — only when the code doesn't rely on
   engine-specific behaviour, and never as the only place migrations run.
3. **No database** — pure unit tests of calculations and rules.

A mocked database or repository belongs only in unit tests of logic that
sits above it. Feature tests that mock the database prove the mocks.

Migrations are applied to the test database by the test run itself; never
run a migration against anything else to "get the tests working".

## 4. Isolation between tests

- Each test starts from a known state: wrapped in a transaction that rolls
  back, or a database rebuilt for the run (and per worker when running in
  parallel).
- Each test creates the records it needs. No test depends on data another
  test left behind or on the order tests run in.
- **No cleanup-by-delete.** Tear-down code that runs `DELETE … WHERE`,
  truncates or drops is the most dangerous code in a test suite if it ever
  meets the wrong database. Rollback and disposable databases need no
  cleanup.
- Files written by tests go to a temporary folder or a fake disk.

## 5. External systems

Faked in every automated test: mail, SMS, push, payment gateways, other
organisations' APIs, single sign-on, the model server, object storage.
Assert on the fake (sent once, to the right person, with the right
content). A test that needs a real external system is a manual check AK
runs, written as steps — not part of the suite.

## 6. End-to-end, performance and load tests

- End-to-end tests drive a local app seeded with invented data, never a
  staging or production site with real accounts.
- Performance checks in the suite are cheap and deterministic: query
  counts, a response-size cap, an upper bound that's generous enough not to
  flake.
- Timing and load tests are run on purpose, against a local or dedicated
  test environment, when a requirement gives numbers or a hot path
  changed. **Never against production or a shared system** — that is an
  outage waiting to happen; if AK wants one against staging, he runs it.

## 7. Test data

- Factories with readable defaults and named states; each test states the
  values that matter to it.
- Invented values only. A bug found by reading live data is reproduced
  with data *shaped* like what was seen — never the real names, ID
  numbers, contact details or amounts.
- Time is fixed in the test when the rule depends on today, weekends or
  holidays.
- Seeders for local development are separate from test data and never run
  by tests against a shared database.

## 8. Continuous integration

CI creates its own throwaway database as a service, uses test-only
credentials, and has no route to production. A red pipeline is fixed, not
re-run until green, and never bypassed to merge or release.
