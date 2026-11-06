---
name: arkar-change-workflow
description: AK's workflow for every code change and bug fix — understand the bigger picture (ARCHITECTURE.md), protect existing behaviour with tests, propose safe cleanup plus any security fixes in one approval list, build cleanly and securely, run tests and security checks, and record decisions. For bug reports, look at the affected live records through a read-only, masked query tool, fix the reported bug, then review the whole connected workflow for hidden or related bugs, test safely, and report findings for approval. Use this whenever implementing, adding, updating, fixing, debugging, investigating or refactoring a feature, bug, endpoint, page, form, query, model, upload, permission logic, integration, dependency or configuration in an existing codebase — or when asked why a record or page shows the wrong data — even if the user doesn't mention cleanup, structure, security or other bugs.
---

# Change workflow — clean, secure, behaviour preserved

Every feature request describes only the immediate change. Added one at a time
as patches, features turn a clean codebase into a "big ball of mud" even
while all tests pass. AK cares about the code: **the job isn't done until the
code the change touches is clean** — and existing behaviour must never change
without his approval.

This one workflow covers structure, cleanliness and security, in one order,
with one approval list. Follow the steps in order.

## The rules (most important)

| What | Approval? |
|---|---|
| **New code you write for the requested feature** — including the edits to existing code that the feature itself needs | None — write it clean and secure from the start. |
| **The fix for the bug AK reported** — the smallest change that fixes the root cause | None — that's what he asked for. |
| **Any other change to existing code** — cleanup/refactoring, or a security fix — even when it's safe | **Propose and wait for AK's OK.** Never apply it silently. |
| **The project's notes files** — creating or updating `ARCHITECTURE.md` (open proposals, known bugs, known debt) and `SECURITY.md` (open items) | None — they are notes, not code. Write them in the same turn as the proposals, creating them from the templates if the project has none. |
| **Proposals AK skips, ignores or declines** — or when no one is there to answer | **Don't touch that code.** Record it (step 7). |

Label every proposal:

- **🟢 SAFE CLEANUP — no behaviour change.** A refactor of existing code; same
  inputs give the same outputs, same API, same data. Say what moves where and
  why it helps this feature.
- **🟢 SAFE SECURITY FIX — no behaviour change for legitimate users.** Say why
  it's safe (e.g. "same results for all valid input").
- **🟠 CHANGES BEHAVIOUR — needs a decision.** Say exactly who or what is
  affected and give the options.
- **🐞 RELATED BUG (confirmed / suspected) — fix changes behaviour
  (intended).** A bug AK didn't report. Say where it is, what's wrong, the
  impact, the evidence, and the proposed fix.

Cleanup proposals are always **safe cleaning**: behaviour-preserving
refactors with tests proving it. Anything that changes behaviour is 🟠, never
"cleanup".

## Bug reports: fix it, then look for what AK can't see

When AK reports a bug, the reported bug is often not the only one. Other
steps of the same workflow may have hidden or related bugs he doesn't know
about. Follow the steps below with these additions, and read
`references/bug-hunt-guide.md`:

- **Look at the real data first** when the bug is about specific records
  ("claim 412 shows the wrong status"). Query them with the read-only tool —
  `uv run --with pymysql --with "psycopg[binary]" python <this skill>/scripts/readonly_query.py "SELECT …"`
  from the project folder (MySQL, PostgreSQL and SQLite; it reads the
  connection from `.env`) — selecting only the columns and rows you need
  (guide section 5). It refuses anything but one read query, runs it in a
  read-only transaction and masks personal data. It needs no permission, but
  say in your reply that you read live data, read-only. Never query live data
  any other way.
- **Step 2 — reproduce first.** Write a test that fails because of the
  reported bug before changing anything, so you know you found the real cause.
  Build its data with factories shaped like what you saw — never copy real
  names, IDs or personal details into tests or fixtures.
- **Fix the reported bug first.** Find the root cause, not the symptom. Make
  the smallest fix, with no unrelated changes. The new test must pass and the
  existing tests must pass unchanged. This needs no approval. If the same
  mistake sits in the exact lines you're fixing (e.g. the same lookup table)
  and also breaks another step, you may fix it there too. Say so separately
  and give it its own test. The same mistake anywhere else is a finding, not
  part of the fix.
- **Then review the surrounding workflow.** Choose the scope yourself, based on
  the project and the bug (guide section 1): usually the record's whole life
  from the first step to the final step, every alternative path and role,
  every place its status is shown, and the same root cause anywhere else. Be
  deliberate: wide enough to catch what AK can't see, but not so wide it
  wastes time. Always say what you covered and what you didn't.
- **Test safely.** Follow Rule 0 (always-on section 0): use the test
  database, fixtures and a local app only, check where the configuration
  points before running anything, and never touch production data, send real
  messages or make payments.
- **Report in the format in guide section 7.** Always include the lines
  "Workflow reviewed: …" and "Not reviewed: …", and write each label in full
  (e.g. "🐞 RELATED BUG (confirmed)"), never just the emoji.
- **Report the other findings; don't fix them.** Put them in the step 3
  approval list as 🐞 RELATED BUG, confirmed first, then suspected, ordered by
  impact. Add them to `ARCHITECTURE.md` "Known bugs" in the same turn —
  if the project has no `ARCHITECTURE.md` yet, create it from
  `references/architecture-md-template.md` (a notes file, not a code change:
  no approval needed). Fix them only when AK approves, each with its own
  regression test.

Do this for every real bug report. For a trivial local bug (a label typo,
one CSS glitch), the review is a quick check of the same pattern nearby.

## Steps

Scale the effort to the change. A copy or CSS-only edit: a quick look, no
proposal round. Anything that adds or changes logic: every step.
Configuration is never "just a value" when it affects the environment,
database, auth, CORS, cookies, mail or external endpoints: show the diff and
say what it affects. Never edit `.env` itself — propose the change.

**Production safety (Rule 0 in the always-on rules) comes before every step.**
Before step 2 runs anything, check where tests and the app will point. If
it's production, shared or unclear, don't run them: write the code, say what
you couldn't run, and propose a local test database.

### 1. Understand the bigger picture

- Read the project's `ARCHITECTURE.md` (create it in step 7 if missing),
  `SECURITY.md` and `CLAUDE.md` if present.
- Read the code the feature will touch, its callers, the models and data
  flow it reads and writes, and the routes/jobs that expose it. When real
  data would answer a question (which statuses exist, how a column is
  actually filled), use the read-only query tool (`scripts/readonly_query.py`)
  with counts and a few masked rows — never other ways of querying live data.
- Ask: which existing concept does this feature belong to? Is there already a
  place where this kind of logic lives? Would this be a second or third copy
  of something? Does the layout follow `arkar-project-structure` for this
  stack? Note where the feature *should* go if the code were clean.

### 2. Protect existing behaviour (baseline)

First confirm the tests run against a local or test database (Rule 0):
Laravel `phpunit.xml` / `.env.testing` overrides, Django `DATABASES`/`TEST`,
FastAPI `conftest.py` overrides. Tests that reset or truncate tables
(`RefreshDatabase`, `DatabaseTruncation`, fixtures that `DELETE`) wipe
whatever database they reach. If they would reach production, don't run them:
propose isolating them (🟢 — test setup only) and continue without a
baseline, saying so.

Then run the existing tests that cover the affected area **before changing
anything**; note any that already fail. If the code you'll touch — or propose
to clean — has no tests, write **characterisation tests** that pin down
today's behaviour (valid inputs → same results, same response shape, same
errors). Every outside effect is faked and asserted on the fake —
`Mail::fake()`, `Queue::fake()`, `Notification::fake()`, `Http::fake()`,
`Storage::fake()`, Django `locmem` email, mocked HTTP clients — so no test
really sends, charges, uploads or calls out. These tests are the safety net
for everything after.

### 3. Propose — one approval list, then wait

Collect everything you'd change in existing code, beyond what the feature
(or the reported bug fix) itself needs:

- **Cleanup** of the code the feature touches (and its immediate
  neighbours) that would let the feature go in cleanly. Go through **every
  smell in section 2 of `references/cleanup-guide.md`** and include each one
  the feature would otherwise make worse. Propose the clean end state, not a
  half step: e.g. if the feature adds another branch to an `if type == ...`
  chain that appears in more than one place, propose one small class per type
  behind a shared interface (strategy), not just moving the chain into a
  function. "OOP" is defined in that guide.
- **Security weaknesses** you found in that code — see
  `references/review-checklist.md`.
- **Related bugs** found while reviewing the workflow (bug reports only) — see
  `references/bug-hunt-guide.md`.

If the list is empty, go straight to step 5. Otherwise:

1. Write the items to the project files **now**, creating them from the
   templates if they don't exist yet — cleanup → `ARCHITECTURE.md` "Open
   proposals", related bugs → `ARCHITECTURE.md` "Known bugs", security →
   `SECURITY.md` "Open". (Creating these two files is
   not a code change and needs no approval.) In `SECURITY.md`, record the
   location and the kind of weakness only — never exploit steps, payloads,
   credentials or personal data, because the file is committed with the code.
2. Present the list numbered, so AK can answer quickly ("approve 1 and 3",
   "skip all").
3. **Stop and wait for his answer** before implementing:

```
Before I add <feature>, I suggest these changes to existing code (I haven't touched anything yet):

1. 🟢 SAFE CLEANUP — no behaviour change
   app/routers/orders.py — the discount calculation is copy-pasted in create_order and update_order (2 × 30 lines).
   Fix: move it into DiscountCalculator in services/pricing.py; both endpoints call it. The new bulk-order
   endpoint can then reuse it instead of a third copy. Covered by 6 characterisation tests.
2. 🟢 SAFE SECURITY FIX — no behaviour change for legitimate users
   app/services/order_service.py:88 — ORDER BY built from the request's sort value.
   Fix: allow-list the sort columns; same results for every valid sort.
3. 🟠 CHANGES BEHAVIOUR — needs a decision
   GET /orders/export has no login. Fix: require login. Affects: the nightly report script calls it without a token.

Reply e.g. "approve 1 and 2" or "skip all". Skipped items stay untouched; I'll still build the feature cleanly in new code.
```

If no one can answer (an unattended run), don't apply any proposals: build
the feature in new code (step 5) and leave the proposals open. Anything that
would need AK's answer about the environment is a **no**: don't run tests,
migrations, servers or scripts unless Rule 0 confirms a local target; list
what you didn't run.

### 4. Apply only the approved items

Apply each approved item as a small step, running the baseline tests after
each — they must pass **unchanged** (never edit an existing test to make a
refactor pass; that means behaviour changed). Add a regression test for each
security fix. If a cleanup turns out larger or riskier than proposed, stop
and tell AK instead of pushing on.

### 5. Implement the feature — clean and secure

If the change alters anything users see — a page, screen, form, field,
column or message, in a browser (including HTML built in Python/PHP code or
templates) or in a Flutter/Android app — load `arkar-ui-intelligence` now and
follow it as well (it picks the UI specialists and ends with
`arkar-ui-visual-qa`).

- Put it where it belongs per `ARCHITECTURE.md` and `arkar-project-structure`,
  reusing what exists rather than adding parallel code.
- Follow the always-on coding standards and `references/cleanup-guide.md`:
  one way to do one job, small focused functions, classes for real concepts.
- Write it securely (`references/review-checklist.md`): validated input,
  parameterised queries, escaped output, authorisation on every action
  (*this* user, *this* record), status changes locked in one transaction, no
  secrets in code or logs. For new routes, pages, cookies, headers, uploads
  or dependencies, also check `references/vapt-checklist.md` — what the
  company's VAPT (OWASP ZAP) scans flag.
- Add tests for the new behaviour — including the permission cases (owner,
  another user, not logged in) and every status transition it touches; see
  `references/testing-strategy.md`.

### 6. Check, then finish clean

Run, per stack (`references/scanners.md`):

1. **Tests** — the baseline again plus the new tests; all must pass.
2. **Code scan** — e.g. bandit / ruff `S` (Python), Larastan (PHP).
3. **Dependency audit** — pip-audit, composer audit, npm audit.
4. **Secret scan** — detect-secrets on the changed files, plus checking that
   config is read from the environment. Never print secret values; report
   only where a secret is and mask it (`sk-…a1b2`).

If a tool can't run, say so. Confirm scanner findings in the code before
reporting them.

Then a **final cleanliness review of your own diff**: no duplication you
introduced, no long functions, clear names, comments that explain why, the
code in the right place. Fix anything in your new code. The job is done only
when your new code is clean and the checks pass.

### 7. Report and record

Short report:

1. **What changed** — the feature or the reported bug fix (with its root
   cause), and (separately) the approved cleanup and fixes applied. For a
   bug fix, also the workflow scope reviewed and what wasn't reviewed.
2. **Behaviour check** — baseline tests before/after; new tests.
3. **Checks run** — each tool and its result; anything that couldn't run.
4. **Open items** — proposals still awaiting a decision or skipped.

Record decisions that should outlast the session:

- **`ARCHITECTURE.md`** (template `references/architecture-md-template.md`):
  update when the structure changed or a new concept was added; keep "Open
  proposals" and "Known debt" current (skipped cleanup goes to known debt).
- **`SECURITY.md`** (template `references/security-md-template.md`): open,
  skipped, fixed and accepted security items.

Don't re-propose items AK already skipped unless the code around them changed
materially — then say why you're raising it again.

## Specific situations

- **Huge legacy files** (e.g. 1,000-line controllers): never propose a
  rewrite as part of a feature. Propose extracting only the part the feature
  touches into a proper class (an Action, a service), so each feature leaves
  the file smaller. Record the rest as known debt.
- **No way to test the code** (no test setup, heavy external dependencies):
  limit cleanup proposals to mechanical, low-risk refactors (rename, extract
  method) and say that coverage is missing.
- **Migrations:** every schema change is a migration file (or, in a project
  without a migration tool, a reviewed SQL script for AK) — never code that
  alters tables when the app starts or a request runs, which would change
  production on the next deploy without review or backup. Apply it only to a
  database Rule 0 confirms is local. Show its SQL (`sqlmigrate`, `alembic upgrade
  --sql`, `artisan migrate --pretend`) and label drops, renames, type changes,
  NOT NULL without a default, and changes to big tables 🟠. Review autogenerated
  migrations for operations you didn't intend (e.g. dropping tables the models
  don't cover). Applying to shared or production databases is AK's job: give
  him numbered steps — back up, check with `SELECT`, the exact command, how to
  verify, how to roll back.
- **Bad data:** fix the code, not the data. If live data needs repairing, give
  AK a reviewed script — a `SELECT` that shows the affected rows, then the
  change inside a transaction — for him to run after a backup.
- **Dependencies:** never upgrade silently. Patch/minor with a CVE fix is
  usually 🟢; major is 🟠.
- **Secrets in code:** propose moving them to `.env` (🟢) and say they should
  be rotated — rotation is AK's call.
- **Personal data (NRIC, phone, salary, medical):** only when needed, masked
  where full values aren't needed, never in logs, behind authorisation.
- **LLM / agent features:** tools take user identity from the run context,
  tool and document text is untrusted, write actions need permission checks.
- **UI work:** also follow `arkar-ui-intelligence` and the specialists it
  names. A redesign of existing screens he didn't ask about goes in the
  approval list as 🟠.
  **New projects:** `arkar-project-structure` first.
