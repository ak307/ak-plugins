# SECURITY.md template

`SECURITY.md` at the project root records security **decisions** that should
outlast a session, so the same skipped finding isn't proposed every time and
there's one list of open items before a VAPT round. Don't log routine passes.

It is committed with the code, so it says **where** and **what kind** of
weakness, never how to exploit it: no attack steps, payloads, working URLs
with parameters, credentials or personal data. (If AK wants a project's
`SECURITY.md` kept off git, add it to `.gitignore` — his call per project.)

Read it at the start of any change. Re-propose a skipped item only if the
code around it changed materially or its severity is now critical — and say
why.

```markdown
# Security decisions — <project name>

## Open — awaiting decision
| # | Date | Where | Finding | Label | Proposed fix |
|---|---|---|---|---|---|
| 1 | 2026-10-29 | routes/api.php `GET /api/staff` | No authentication | 🟠 changes behaviour | Require Sanctum token; kiosk needs a token |

## Skipped / deferred by AK
| # | Date | Where | Finding | Decision and reason |
|---|---|---|---|---|
| 2 | 2026-10-29 | ReportController@export | CSV formula injection | Skipped — internal users only, revisit before external release |

## Accepted risks
| Date | Risk | Why accepted | Revisit |
|---|---|---|---|

## Fixed (approved proposals)
| Date | Where | Finding | Fix |
|---|---|---|---|
```

Move an item from "Open" to "Skipped" or "Fixed" when AK decides. Items stay
"Open" when AK didn't answer.
