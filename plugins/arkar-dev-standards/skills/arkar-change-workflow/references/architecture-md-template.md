# ARCHITECTURE.md template

`ARCHITECTURE.md` at the project root is the bigger picture that each
feature request leaves out. Read it before every change; update it when the
structure changes, a new concept is added, or cleanup is skipped. Keep it
short (one or two screens) — it's a map, not documentation of every file.

If it's missing, create it from what the code shows (don't invent intentions)
the first time you work in the project.

```markdown
# Architecture — <project name>

## What the system does
<two or three sentences: purpose, main users, main integrations>

## Stack and layout
<framework + version; follows arkar-project-structure <template> / or: legacy layout described below>

## Main concepts (domain)
| Concept | Where it lives | Notes |
|---|---|---|
| Leave request | app/models/leave_request.py, services/leave_request_service.py | statuses: pending → approved / rejected |
| Approval rules | services/approval_policy.py (ApprovalPolicy) | managers approve their own team only |

## Where things go
- Business rules: <e.g. services/, one file per concept>
- HTTP: <thin routers/controllers>
- External systems: <e.g. clients/, Services/Outlook>
- Background jobs: <…>
- Shared helpers: <…>

## Patterns used in this project
- <e.g. "pricing variations use a strategy: PricingRule subclasses in services/pricing/">
- <e.g. "all exports go through ExportBuilder">

## Known debt
| Area | Problem | Suggested direction | Since |
|---|---|---|---|
| ViewDailyReportWebController (1,258 lines) | queries, PDF and formatting mixed | extract per action into app/Actions/DailyReports/ as features touch it | 2026-10-30 |

## Open proposals (cleanup awaiting AK's decision)
| # | Date | Where | Proposal |
|---|---|---|---|

## Decisions
| Date | Decision | Why |
|---|---|---|
```

Move proposals to "Known debt" when skipped and remove them when applied.
Record structural decisions (a new layer, a new pattern) under "Decisions" so
a later session follows them instead of inventing another approach.
