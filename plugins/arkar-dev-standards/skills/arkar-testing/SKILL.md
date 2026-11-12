---
name: arkar-testing
description: AK's testing standard — every new or changed feature is verified, existing behaviour is protected from regressions, and testing never puts live systems or data at risk. Covers checking where tests point before running anything, choosing the right kinds of test for the risk (unit, integration, end-to-end, regression, security, performance, UI and accessibility), what every change must test (permissions, state changes, boundaries, side effects), what makes a test trustworthy, what to fake, reliable (non-flaky) tests, never forcing a green result, and reporting evidence. Use this whenever writing, running, fixing or reviewing tests, adding or changing a feature or fixing a bug in any stack, setting up a test suite or CI test job for a new project, dealing with a failing or flaky test, or when asked about coverage, test data, mocks, or whether something is tested — even if the user doesn't mention tests.
---

# Testing — verified, protected, and safe to run

Three aims, in this order when they pull apart:

1. **Testing never harms live systems or data.**
2. **Existing behaviour stays intact** — a change doesn't break what worked.
3. **New behaviour is proven** — by tests that would fail if it were wrong.

## Safety first — before any test runs

Never assume a development or test database is safe to modify: projects are
often connected to live data.

- **Check where the tests point, as the test run will see it** — the test
  configuration first, then the app's (always-on section 0). Run only when
  the target is clearly local or a disposable test instance.
- **If it points at production or a shared system, or you can't tell:
  don't run, and don't ask to run.** Report it, and propose a safe test
  setup (a local test database plus a guard in the test base that refuses
  anything else) as a 🟢 test-setup item for AK.
- **Never** edit `.env`, production configuration or live data to make
  testing possible; never run destructive tests, migrations or cleanup
  against a production or shared database.
- **What the tests use, in order of preference:** a disposable database of
  the *same engine* as production (local or a CI service container), fresh
  or rolled back per test → an in-memory database only when the code is
  engine-neutral → no database at all for pure unit tests of logic. A
  mocked database proves little about queries, constraints and
  transactions, so it is for unit tests only.
- **Isolation, not cleanup.** Each test starts from a known state through a
  transaction rollback or a fresh database. Don't write cleanup code that
  deletes rows by a condition — pointed at the wrong database it is a
  data-loss bug.
- **External systems are always faked:** mail, SMS, push, payments, other
  companies' APIs, the model server. No test really sends, charges or calls
  out.
- End-to-end, load and performance tests run against a local app with test
  data. Never load-test production or a shared system.
- Test data is invented — never real names, ID numbers, contact details or
  amounts copied from live data.

Detail and per-stack checks: `references/safety.md`.

## What makes a test worth having

1. **It tests behaviour, not implementation** — what goes in and what comes
   out or changes, as a user or caller would see it. It survives a
   refactor.
2. **It can fail.** A new test is seen failing once — before the fix or the
   feature exists, or by briefly breaking the code. A test never seen
   failing proves nothing.
3. **Real inside, fake at the edge.** The code under test and its own
   collaborators run for real; only external systems, time and randomness
   are replaced. Never mock the thing being tested, and never assert only
   that a mock was called when a result can be checked.
4. **It is deterministic.** No dependence on the real clock, sleeps, the
   network, random values, test order or data left by another test.
5. **A junior can read it.** The name says the behaviour
   (`test_manager_cannot_approve_own_request`); arrange, act, assert; no
   loops or branches; one reason to fail.
6. **Green is never forced.** A failing test is investigated: is the code
   wrong, the test wrong, or the environment? Never skip, delete, mark as
   expected-to-fail, retry until it passes, loosen an assertion or change an
   expected value to get green — any of those needs AK's approval with the
   reason.

More, with the common smells: `references/test-quality.md`.

## Choose by risk — not every change needs every kind

| Kind | What it proves | Use it when | Where the detail is |
|---|---|---|---|
| **Unit** | A rule or calculation on its own | Any business logic: calculations, status rules, permission functions | `references/levels-and-stacks.md` |
| **Integration / feature** | Parts working together through the framework, with a real test database | Every endpoint, page, job or command you add or change | same |
| **End-to-end** | A whole user journey in a real browser or app | The few journeys that would hurt most if broken; a change to one of them | same |
| **Regression** | What worked still works | Always: the existing tests for the affected area before and after, the full suite before finishing, a new test for every bug fixed, characterisation tests before changing untested code | this file, "Every change" |
| **Security** | Who may do what; bad input is refused | Sign-in, permissions, input, personal data, uploads, APIs | `arkar-security` (step 4) |
| **Performance** | No slowdown or runaway queries | Always a query-count check on list endpoints; timing or load tests only when a requirement gives numbers or a hot path changes | `references/levels-and-stacks.md` |
| **UI and accessibility** | Layout, interaction, states, contrast, keyboard | Anything users see | `arkar-ui-visual-qa`, plus automated component tests (`references/levels-and-stacks.md`) |
| **AI evaluation** | A model-backed feature behaves | Any prompt, model, tool or retrieval change | `arkar-ai-engineering` |

Scale it: a copy or styling change runs the existing tests it touches; a
logic change gets unit and feature tests; anything touching money,
permissions, personal data or a status workflow gets the full list below.

## Every change

1. **Baseline.** Run the existing tests that cover the affected area before
   changing anything. If there are none, write characterisation tests that
   pin down what the code does today — including behaviour that looks odd
   (report the oddities to AK; don't "fix" them unasked).
2. **Tests with the change** — for a bug, the failing test comes first.
   What applies of:
   - the behaviour added or fixed: the normal case and the main error case;
   - **permissions** for each endpoint or action: the owner or right role,
     another ordinary user, not signed in; lists return only what the user
     may see;
   - **state changes** (approve, reject, cancel, pay): each allowed step
     works; each refused step — wrong state, acting twice, acting on
     someone else's record — is refused and changes nothing;
   - **boundaries:** zero, negative, exactly on a limit, empty, too long,
     dates in the wrong order or touching at the edge;
   - **side effects on fakes:** the email, notification or job happens
     once, to the right person, only on success;
   - **query count** for list endpoints;
   - **UI logic** you add: the component's states (loading or saving,
     empty, error, success) and its interactions, tested as a user drives
     them — elements found by role, label or text, the data layer faked at
     the edge, no whole-tree snapshots.
   Say which level each check sits at, and whether an end-to-end journey is
   affected (add or update it) or why the lower levels are enough. Test
   data comes from factories or builders with invented values and fixed
   dates; each test states only the values that matter to it.
3. **Run.** The affected tests while working; the full suite before
   finishing. Existing tests pass **unchanged**.
4. **Failures are investigated, never bypassed** (principle 6). An
   intermittent failure is a bug with a cause — find it. When a test shows
   the intended behaviour is unclear (a boundary, a rule nobody wrote
   down), ask AK — don't quietly pin it or change it.
5. **Report the evidence** (below). Never say tests pass without having run
   them; say what couldn't run and why.

## Existing tests and existing code

Adding tests is always in scope. **Changing, skipping or removing an
existing test is not** — it means behaviour changed, so it goes to AK with
the reason. Weak tests found on the way (no assertions, sleeps, shared
data, real network) are 🟢 proposals in the change workflow's list; fix them
only when approved. `scripts/test_smells.py <tests folder>` lists
candidates to read — not verdicts.

## Evidence in the final message

```
Tests
- Target: <local test database / in-memory / none needed> — <how it was confirmed>
- Ran: <command> → <passed / failed / skipped>
- New tests: <the behaviours covered, by level: unit / feature / end-to-end> · seen failing first: <yes / how it was proven>
- End-to-end: <journey added or updated / not needed because …>
- Existing tests: <unchanged and passing / what changed and why>
- Not run: <what and why — or "nothing">
```

## References

- `references/safety.md` — confirming the test target per stack, isolation, fakes for external systems, end-to-end and performance environments.
- `references/test-quality.md` — behaviour over implementation, test doubles, determinism and flaky tests, readability, smells.
- `references/levels-and-stacks.md` — the levels, coverage, end-to-end journeys, front-end and mobile tests, performance checks, and today's tools per stack.
- `scripts/test_smells.py` — lists tests that can't fail, are skipped, sleep, use the real clock or network, or share data.
