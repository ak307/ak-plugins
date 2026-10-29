---
name: arkar-secure-change
description: AK's security workflow for every code change — write new code securely, review the change and the code it touches for vulnerabilities, run tests and security scanners, and propose (never silently apply) fixes to existing code with clear SAFE / CHANGES-BEHAVIOUR labels, so security improves without breaking existing behaviour. Use this whenever implementing, updating, fixing or refactoring a feature, endpoint, form, query, upload, login/permission logic, integration, dependency or configuration — even if the user doesn't mention security.
---

# Secure change workflow

Every feature or update AK asks for should leave the system at least as
secure as it was — **without changing existing behaviour he didn't ask to
change.** Business rules, API contracts, database behaviour, user workflows
and integrations stay the same unless AK explicitly approves a change. A
security fix that quietly breaks a workflow is a production incident, not an
improvement.

The baseline is basic, solid practice — the OWASP Top 10 basics and what a
VAPT scan (OWASP ZAP) flags — not full hardening.

## The approval rule (most important)

| What | Approval? |
|---|---|
| **New code you write for the requested feature** | None needed — write it securely from the start (it's part of doing the feature properly). |
| **Any security change to code that already exists** — even a "safe" one, in the touched code or nearby | **Propose and wait for AK's OK.** Never apply it silently. |
| **Proposals AK skips, ignores or declines** — or when no one is there to answer | **Don't touch the code.** Record it in `SECURITY.md` (see step 5). |

Label every proposal so the risk is obvious at a glance:

- **🟢 SAFE — no behaviour change for legitimate users.** Say what changes and
  why it's safe (e.g. "same results for all valid input; only injection
  strings are now treated as text").
- **🟠 CHANGES BEHAVIOUR — needs a decision.** Say exactly who or what is
  affected (e.g. "staff without the approver role will get 403 on
  `POST /leave-requests/{id}/approve`, which they can call today") and give
  the options.

When the requested feature itself rewrites existing code, write the new
version securely — but if the secure version would behave differently for
existing callers (e.g. stricter validation that rejects inputs accepted
today), flag it 🟠 and ask before shipping that part.

## Workflow

Scale the effort to risk. A copy or CSS-only change gets a quick look.
Anything touching **authentication, permissions, user input, database
queries, file uploads/downloads, external calls, payments, personal data,
secrets, configuration or dependencies** gets every step.

### 1. Understand before changing

Read the code you're changing and its callers, the data it reads and writes,
the routes or jobs that expose it, and the project's `SECURITY.md` if present
(decisions already made — don't re-propose skipped items unless something
material changed).

**Baseline:** run the existing tests that cover the affected area *before*
changing anything, and note any that already fail so they aren't blamed on
your change. If the code you will touch has no tests, write
**characterisation tests** first that pin down today's behaviour (valid
inputs → same results, same response shape, same side effects).

### 2. Implement the feature securely

Follow `references/review-checklist.md` while writing: validate input at the
boundary, parameterised queries / ORM, output escaping, authorisation on
every action (matching the feature's intended rules), no secrets in code or
logs, safe file handling, safe external calls, minimal personal data.

### 3. Review the change

Review the diff **and** the code paths it touches against
`references/review-checklist.md`, plus the VAPT items in
`references/vapt-checklist.md` that apply (headers, cookies, errors, CSRF…).
Separate findings into:

- problems in **your new code** → fix them now (no approval needed);
- weaknesses in **existing code** → proposals (🟢 / 🟠), not edits.

### 4. Run the checks

For any change beyond a trivial copy/CSS edit, run **all four** — commands
per stack in `references/scanners.md`:

1. **Tests** — the baseline from step 1, again after the change.
2. **Code scan** — e.g. `bandit` / ruff `S` rules (Python), Larastan (PHP).
3. **Dependency audit** — `pip-audit`, `composer audit`, `npm audit`.
4. **Secret scan** — `detect-secrets` on the changed files, plus reading the
   config/settings files for hard-coded keys.

Run scanners on the changed files/project, not the whole machine. If a tool
isn't installed or can't run (no network, no `uv`/Node), say so — don't
pretend it ran. Treat scanner output as leads: confirm each finding in the
code before reporting it; drop false positives with a one-line reason.

Fix problems in your new code, then **re-run** the tests and the scanners
that flagged them. The baseline/characterisation tests must still pass —
that is the proof existing behaviour is unchanged.

### 5. Report — and record decisions

End with a short report:

1. **What changed** (the feature).
2. **Checks run** — each tool or test suite and its result; anything that
   couldn't run and why.
3. **Fixed in the new code** — one line each.
4. **Proposals for existing code** — a numbered list AK can answer quickly
   ("approve 1 and 3"):

   ```
   1. 🟢 SAFE — no behaviour change for legitimate users
      app/Http/Controllers/ReportController.php:88 — raw SQL built from $request->sort
      Fix: allow-list the sort column (name, date, status); same results for every valid sort.
   2. 🟠 CHANGES BEHAVIOUR — needs a decision
      routes/api.php — GET /api/staff has no auth; anyone on the network can list staff
      Fix: require Sanctum auth. Affects: the attendance kiosk calls it without a token today.
      Options: (a) require auth and give the kiosk a token, (b) restrict to the kiosk IP, (c) leave as is.
   ```

5. **Remaining risks** — anything not fixed or not checked.

When AK approves proposals, apply only those, run the baseline tests and the
relevant scanners again, and report.

Keep `SECURITY.md` at the project root (template:
`references/security-md-template.md`). **Whenever you make proposals, add them
to its "Open — awaiting decision" section in the same turn** (create the file
if needed), so they survive if the session ends; move them to "Skipped",
"Fixed" or "Accepted risks" when AK decides. Don't log routine passes there.

## Specific situations

- **Dependencies:** never upgrade silently. A patch/minor upgrade that fixes a
  known CVE is usually 🟢 (say why); a major upgrade is 🟠.
- **Secrets found in code or git history:** propose moving them to `.env`
  (🟢) and say the secret should be rotated — rotation is AK's call.
- **Personal data (NRIC, phone, salary, medical):** check it's collected only
  when needed, masked on screen where full values aren't needed, never
  written to logs, and protected by authorisation.
- **LLM / agent features:** tools take the user identity from the run
  context (not from the model); tool and document text is untrusted input;
  write actions need permission checks and, where it matters, human approval.
