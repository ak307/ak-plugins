# Bug-hunt guide — after fixing a reported bug

How to choose the scope, trace the workflow, find hidden or related bugs,
test safely and report what you found. Used in the bug-fix path of
`arkar-change-workflow`.

## Contents
1. Choosing the scope
2. Tracing the workflow
3. Where hidden bugs usually are
4. Same root cause elsewhere
5. Safe testing
6. Confirmed vs suspected
7. Report format

## 1. Choosing the scope

You decide the scope for each bug. Make it as wide as the bug can plausibly
reach, but no wider. Too narrow misses the bugs AK can't see. Too wide burns
time and tokens on code the bug has nothing to do with.

**The default scope is the workflow the bug belongs to.** That means the full
life of the record or process the bug is about. Trace it from where it starts
(the record is created, a form is submitted) to where it ends (final status,
archived, paid, closed). Include every step, status, role and screen in
between. "Step 3 is wrong" means review steps 1 to N, not only step 3.

Widen the scope when:
- The root cause is in shared code: a helper, base class, status map,
  permission check, date utility or query scope. Every caller is in scope.
- Other workflows write or read the same data, such as a report, an export, a
  dashboard count, a scheduled job, a notification or the API used by the
  mobile app. Include them, but only as far as their use of that data.
- The bug is about money, approvals, permissions or personal data. Be more
  thorough here, because a hidden bug costs more.

Keep it narrow when:
- The bug is local: a typo in a label, one CSS issue, one wrong field in one
  form. Check the same pattern nearby, then stop.
- The workflow is huge (a 1,000-line controller, dozens of steps). Trace the
  main path and the branches next to the bug in depth. List the rest as "not
  reviewed" in the report rather than skimming it.

Rough budget: the review should take about the same effort as the fix, up to
two or three times for money, approvals or permissions. If it would take far
more, review the highest-risk part and say what you left out.

**Always state the scope in the report**, both what you covered and what you
didn't, so AK can ask for more.

## 2. Tracing the workflow

Before reading code line by line, build a quick map. It can stay in your head,
or go in the report when it's small:

| Step | Who acts | Entry point (route/action/job) | Status before → after | Data written | Side effects |
|---|---|---|---|---|---|

Then walk it:
1. **The happy path,** from start to finish.
2. **Every alternative path:** reject, cancel, resubmit, edit after submit,
   expire or time out, delete, reassign, retry.
3. **Every role:** owner, approver, admin, someone unrelated, someone not
   logged in.
4. **Every place the status is shown or counted:** the status page, lists,
   badges, dashboards, reports, emails, the API.

## 3. Where hidden bugs usually are

| Area | What to check |
|---|---|
| Status transitions | Each action checks the current status before moving on: no skipping steps, no approving twice, no acting on a rejected, cancelled or finished record. Every status has a way forward or is a final status. |
| Status names and labels | Every status the code can set exists in every map, enum, label, colour, filter and report. No typos or "unknown" fallbacks. |
| Consistency between steps | Thresholds, rounding and date rules are the same everywhere (e.g. `> 5000` in one place, `>= 5000` in another). The screen and the API agree. |
| Permissions | Each step checks that *this* user may do *this* action on *this* record (own team, own record, right role), not only that the user is logged in. |
| Data integrity | Steps that write several rows use a transaction. Two people acting at the same time can't double-approve. Counters and totals stay in sync. |
| Edge values | Zero, empty, exactly on a limit, a negative amount, a missing optional field, a weekend or public holiday, time zones, the end of a month or year. |
| Errors | Failures roll back cleanly and show a real message. No exception is silently swallowed and left with a half-finished status. |
| Side effects | Notifications, emails and audit log entries fire once, at the right step, to the right person, and not for failed actions. |
| Frontend vs backend | Buttons hidden in the UI are also blocked on the server. The UI shows what the server actually stored. |

## 4. Same root cause elsewhere

Once you know the root cause, search for the same pattern:
- In the workflow, always.
- Across the codebase, with a quick search for the same function, status
  string, comparison or query. Report matches outside the workflow briefly
  (location and one line on the risk). Don't investigate each one in depth
  unless it's in money, approval or permission code.

## 5. Safe testing

- **Never touch production.** Before running anything that connects to a
  database, queue, mail or payment service, check the configuration (`.env`,
  settings) to see where it points. If it points at production or a shared
  live system, or you can't tell, stop and ask AK.
- Prefer automated tests with the project's test database or fixtures. For a
  UI workflow, also walk it in a browser against the local app (see
  `arkar-frontend-qa`).
- No destructive actions: no dropping or truncating tables, no mass updates
  or deletes, no real emails, SMS or push notifications, no payments. Use the
  framework's fakes (`Mail::fake()`, Django `locmem` email, mocks).
- Tests that prove a *related* bug (step 6) go in the report as failing
  evidence. Don't add them to the suite as failing tests, and don't mark them
  skipped. They join the suite when AK approves the fix.

## 6. Confirmed vs suspected

- **Confirmed:** you reproduced it with a test, a script against the test
  database, or a browser walk-through. Say how.
- **Suspected:** you saw it in the code but couldn't prove it cheaply. Say
  what you saw and what would confirm it.

List confirmed findings first. Never present a suspicion as a fact.

## 7. Report format

```
Fixed: <reported bug>, caused by <root cause> (<file:line>).
Regression test: <test name>. All <n> tests pass.

Workflow reviewed: <start> → … → <end> (<n> steps, roles: …)
Also checked: <shared code / reports / other callers>
Not reviewed: <what you left out and why>

Other findings (not changed, waiting for your decision):

1. 🐞 RELATED BUG (confirmed) — fix changes behaviour (intended)
   Where: app/routers/requests.py:88 (reject)
   Problem: an already approved request can still be rejected; the status flips back.
   Impact: finance pays a request that later shows as rejected.
   Evidence: test_reject_after_final_approval fails (returns 200, status "rejected").
   Fix: allow reject only while the status is pending; otherwise return 409.
2. 🐞 RELATED BUG (suspected) — …
3. 🟢 SAFE CLEANUP — …

Reply e.g. "approve 1 and 3" or "skip all". Skipped items stay untouched.
```

Order the findings by impact. Put cleanup and security items in the same
numbered list, labelled as usual.
