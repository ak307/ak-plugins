# Levels of testing, and the tools per stack

What to test at which level, so the expensive bugs — someone seeing or
approving what they shouldn't, a workflow reaching a wrong state, money or
leave miscounted — are caught by tests, not users. Where tests may run is
`safety.md`; what makes them trustworthy is `test-quality.md`.

## Contents
1. The levels
2. Front-end and mobile tests
3. End-to-end journeys
4. Performance checks
5. Coverage
6. Slow suites
7. Today's tools per stack (replaceable)

## 1. The levels

| Level | Tests | Speed | Share |
|---|---|---|---|
| Unit | Business rules with no HTTP and no framework: calculations, status transitions, permission functions, validators | milliseconds | most tests |
| Integration / feature | One endpoint, page, job or command through the framework's test client, with a real test database: validation, permissions, response shape, side effects on fakes | fast | every endpoint |
| End-to-end | A few critical user journeys in a real browser or on a device | slow | 3–5 per app |

Put each check at the lowest level that can prove it: a calculation's
edge cases are unit tests, not twenty browser runs. The higher levels prove
the parts are wired together; the lower levels carry the detail.

## 2. Front-end and mobile tests

Visual QA (`arkar-ui-visual-qa`) proves a screen looks and feels right
today. Automated tests keep its behaviour from breaking tomorrow. Logic in
the interface gets tests like any other logic:

- **Component tests** for components with behaviour: each state (loading,
  empty, error, success, disabled and why), each interaction (the click,
  the keyboard path), what the user sees afterwards. Drive them as a user
  would and find elements by role, label or text.
- **Hooks, stores, formatters and validators:** unit tests.
- **Server-driven components** (a component class with public state and
  actions): test through the framework's component test helper — set
  state, call the action, assert what's rendered and what was saved —
  plus the permission cases for each action.
- **Mobile:** unit tests for state holders and repositories with fakes,
  widget tests for each screen's states, a few integration tests for the
  main journeys; golden (image) tests only for settled key screens.
- **Accessibility in tests:** elements are found by role and name (so the
  test fails when a label goes missing); an automated accessibility check
  on key pages where the tooling exists.
- Purely presentational markup with no logic needs no unit test — visual
  QA covers it.

## 3. End-to-end journeys

Pick the 3–5 journeys that would hurt most if broken (sign in → submit →
approve → the balance updates; create → assign → complete). Write them
against a local app seeded with invented data; keep them few, stable and
independent of each other. Run them in CI on the main branch or before
each release. A change to a critical journey updates or adds its
end-to-end test.

## 4. Performance checks

- **Always:** a query-count assertion on list endpoints and pages you add
  (the count must not grow with the number of rows), and pagination on
  anything that can grow.
- **When a requirement gives numbers, or a hot path changes:** a timing
  check with a generous bound in the suite, and a measured before-and-after
  run reported in the reply.
- **Load tests** are deliberate exercises against a local or dedicated test
  environment (`safety.md` §6), with the numbers recorded in the project.

## 5. Coverage

Coverage is a smoke alarm, not a goal — high coverage with weak assertions
is worth little. Aim for:

- services, actions, domain models and permission policies: 80%+ line
  coverage, and every branch of status and permission logic;
- controllers, views and routers: covered through feature tests;
- generated code, migrations, settings: not measured.

Enforce a minimum in CI once a project reaches the target, so it can't
silently drop. Never write a test only to raise the number.

## 6. Slow suites

Run the affected tests while working and the full suite before finishing;
run in parallel in CI with a database per worker. Slow tests are usually at
the wrong level — move the detail down.

## 7. Today's tools per stack (replaceable)

These record the usual choices so projects stay consistent. They are
defaults, not the standard: follow what an existing project already uses.

| Stack | Unit and feature | Test data | Front end / device | End-to-end |
|---|---|---|---|---|
| Laravel | Pest (unit + feature), framework fakes (`Mail::fake`, `Queue::fake`, `Storage::fake`, `Http::fake`) | Model factories with named states | Livewire: `Livewire::test()`; Inertia + React: Vitest with Testing Library | Playwright |
| Django | pytest-django with the test client | factory_boy | Templates through the test client | Playwright |
| FastAPI | pytest + `TestClient`, dependency overrides | Factories or builders | — | Playwright where there is a UI |
| React (standalone) | Vitest | Builders | Testing Library, user-event; network faked at the boundary | Playwright |
| Flutter | `flutter_test`, fakes in `test/fakes/` | Fakes and builders | Widget tests, golden tests for settled screens (see `arkar-ui-visual-qa/references/responsive-testing.md`) | `integration_test` |

Time: `travel_to` / `freezegun` / `time-machine` / a clock passed in.
Parallel: `pest --parallel`, `pytest -n auto`. Coverage: `pest --coverage
--min=…`, `pytest --cov=… --cov-fail-under=…`, `flutter test --coverage`.
