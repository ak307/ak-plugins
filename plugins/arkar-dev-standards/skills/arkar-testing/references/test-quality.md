# What makes a test trustworthy

A test suite is only worth the trust people can put in it: green must mean
"it works" and red must mean "something is wrong". Tests that can't fail,
or fail at random, destroy both.

## Contents
1. Behaviour, not implementation
2. Proving a test can fail
3. Test doubles — what to fake
4. Determinism and flaky tests
5. Readability
6. Never forcing green
7. Smells

## 1. Behaviour, not implementation

- Assert what a caller or user can observe: the return value, the response,
  the row that changed, the message sent, what is on the screen.
- Don't assert private details: which internal method was called, in what
  order, how many times — unless the call *is* the behaviour (an email
  sent once).
- A good test survives a refactor that keeps behaviour, and fails when
  behaviour changes. If a tidy-up breaks tests, they were testing the
  implementation.
- Don't re-implement the code in the test (computing the expected value
  with the same formula). State the expected value: `assert total == 1280.50`.
- Front end: find elements the way a user does — by role, label or text —
  and act through clicks and typing; avoid selectors tied to markup and
  whole-tree snapshots, which fail on every harmless change and get
  approved without reading.

## 2. Proving a test can fail

- **Bug fix:** the test is written first and fails for the reason reported;
  then the fix makes it pass.
- **New feature:** write the test before or with the code and see it fail,
  or break the code briefly (flip a condition, return early) and watch the
  test catch it. Say in the report how it was proven.
- **Characterisation test:** it passes against today's code by design;
  prove it by changing an input or an expected value once.
- A test with no assertion, or one that asserts something always true,
  can't fail — it is noise that looks like safety.

## 3. Test doubles — what to fake

| Replace | Keep real |
|---|---|
| External systems: mail, SMS, payments, other APIs, the model server | The code under test |
| Time and randomness | Its own collaborators: services, models, validators |
| Slow or unavailable infrastructure in **unit** tests | The database, in feature tests |

- Prefer the framework's fakes and in-memory fakes (a fake mailer you can
  inspect) to mocks with scripted expectations.
- Never mock the thing being tested, and don't mock what you don't own in
  ways that only restate your assumptions about it — wrap it in one client
  module and fake that.
- A test whose only assertion is "the mock was called" proves the test
  set-up, not the feature. Assert the result as well.
- Too many doubles in one test is a sign the code needs a seam, or the
  test belongs one level up.

## 4. Determinism and flaky tests

A test that sometimes fails is a bug with a cause. The usual ones, and the
fix for each:

| Cause | Fix |
|---|---|
| The real clock (`now()`, today's date, "7 days from now") | Pass the time in, or freeze it in the test |
| Sleeps and fixed waits | Wait for the condition, or remove the need by controlling time |
| Test order and shared data (module-level lists, rows left behind, a shared file) | Each test builds its own data; isolation by rollback |
| The real network | Fake the client at the boundary |
| Random values and unordered results | Seed or fix the value; sort or compare as sets |
| Parallel workers sharing a database or port | One database per worker; free ports |
| Timing assertions close to the limit | Generous bounds, or count work (queries) instead of time |

Confirm the fix by running the test repeatedly and in a different order.
Never fix flakiness with a retry, a longer sleep or a skip. If the flaky
test was exposing a real boundary bug (exactly on the limit), say so —
that's a finding, not noise.

## 5. Readability

Tests are read more often than they're run — by the next person working
out what the code is meant to do.

- The name states the behaviour and the case:
  `test_cancelling_an_approved_request_is_refused`.
- Arrange, act, assert — visibly, in that order, a blank line between.
- No loops, branches or helpers that hide the point; a little repetition is
  fine in tests. Shared set-up goes in factories and fixtures with clear
  names.
- Only the values that matter to the case appear in the test; the factory
  supplies the rest.
- One behaviour per test, so a failure names the problem.

## 6. Never forcing green

Each of these makes the suite lie, so each needs AK's approval with the
reason, and is reported:

- skipping, deleting or commenting out a failing test;
- marking it expected-to-fail;
- retrying until it passes (in the test or in CI);
- loosening an assertion, widening a tolerance, or changing an expected
  value to match what the code now does;
- editing an existing test so a refactor passes.

When a test fails, there are three possibilities — the code is wrong, the
test is wrong, the environment is wrong — and the work is finding out
which. If an existing test encodes behaviour AK asked to change, that's a
behaviour change: say so and update the test as part of the approved
change.

## 7. Smells

`scripts/test_smells.py <folder>` lists candidates; read each before
judging.

- No assertion in a test, or an assertion that is always true.
- Skipped, expected-to-fail or focused (`only`) tests left in.
- Sleeps and fixed waits.
- The real clock or the real network in a test.
- Module-level mutable data shared between tests.
- Exceptions swallowed in a test.
- Snapshot-only tests.
- Tests that mirror the implementation line by line, or assert only on
  mocks.
- One enormous test for a whole feature; names like `test_1` or
  `test_it_works`.
