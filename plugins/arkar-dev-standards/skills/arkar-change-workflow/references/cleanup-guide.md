# Cleanup guide — safe refactoring of the code a change touches

What to look for in the code a feature touches, how to fix it without
changing behaviour, and what "following OOP" means in AK's projects.

## Contents
1. What "OOP" means here
2. Smells worth proposing
3. Safe refactorings (behaviour-preserving moves)
4. Per-stack homes for logic
5. How to keep it safe
6. What NOT to propose

## 1. What "OOP" means here

Two sources, used together:

- **Where code lives and what it's called** — the `arkar-project-structure`
  templates (FastAPI services/routers/schemas, Django apps with models/
  services/views, Laravel Actions/Policies/FormRequests, Flutter
  repositories/notifiers).
- **How classes are designed** — the always-on coding standards, section 3:
  - A class for each real concept or anything that holds state (a calculator
    with its rules, a repository with its client, a domain object with
    behaviour). Behaviour lives with the data it uses.
  - One way to do one job; one class/function calls another instead of
    duplicating it.
  - Replace growing `if type == ...` / `match` chains that pick behaviour
    with small classes sharing an interface (strategy/polymorphism) — once
    there are three or more branches, or a new feature would add another.
  - Don't wrap plain functions in a "stateless" class of `@classmethod`s just
    to look object-oriented; a module of functions is fine where the template
    uses functions. (Laravel Actions are not this: one class per operation,
    injected where it's used, is the PHP template's unit. Python services are
    modules of functions.)
  - Dependencies passed in (constructor/parameters), not created deep inside.

## 2. Smells worth proposing

Propose cleanup when the feature touches code with one of these — and say how
it helps the feature:

| Smell | Typical sign | Usual fix |
|---|---|---|
| Duplicated logic | Same calculation/query/validation in 2+ places; the feature would add another copy | Extract one function/class; all callers use it |
| Long function / method | > ~40 lines, numbered-step comments, several jobs | Extract well-named helpers |
| Fat controller / view / router | Business rules, queries and formatting in the HTTP layer | Move logic to the service/Action/model per template |
| God class / file | One class doing many unrelated jobs; 500–1,000+ lines | Extract the part the feature touches into its own class |
| Type switches | `if kind == "A" … elif kind == "B" …` repeated in places | Small classes with a shared method (strategy) |
| Feature envy | A method mostly using another object's data | Move it to that object |
| Primitive obsession | The same group of values passed around (start, end, staff_id) | A small value object / dataclass / DTO |
| Flag arguments | `def export(data, as_csv=True, with_salary=False)` | Separate functions or a strategy |
| Magic values | Repeated literals for statuses, limits, roles | Constants / enums |
| Wrong layer | DB queries in templates, HTTP code in services | Move to the right layer per template |
| Misleading names | `data`, `tmp`, `rt`, a name that no longer matches what it does | Rename |

## 3. Safe refactorings (behaviour-preserving moves)

Prefer these mechanical moves, one at a time, tests after each:

- Rename (variable, function, class, file) — update all references.
- Extract function/method; extract class; inline a needless wrapper.
- Move function/method to the class or module it belongs to.
- Replace duplicated code with a call to the extracted version.
- Introduce constant/enum for magic values.
- Introduce parameter object / value object.
- Replace conditional with polymorphism (strategy) — only with tests covering
  every branch.
- Split a large file by moving cohesive parts out, keeping the old public
  entry points working (re-export or delegate) so callers don't change.

Public interfaces stay stable: URLs, request/response shapes, function
signatures used by other modules, database schema, events, file formats. If a
cleanup would need to change one, it's 🟠, not cleanup.

## 4. Per-stack homes for logic

| Stack | Business logic | HTTP layer | Data access |
|---|---|---|---|
| FastAPI | `services/` | thin `routers/` | SQLAlchemy in services; `models/` |
| Django | `apps/<app>/services/` | thin `views/` / `api.py` | ORM in services; model methods for model-only rules |
| Laravel | `app/Actions/<Area>/` (one per operation); `Services/` for external systems | thin controllers + FormRequests + Policies | Eloquent models, scopes |
| Flutter | notifiers next to screens; domain rules in models | screens/widgets | `repositories/` |
| Django agentic | `apps/*/services` (business), `agents/` (graphs, no Django imports) | views/tasks | services via tools |

## 5. How to keep it safe

- Characterisation tests before touching anything without coverage.
- One refactoring at a time; run tests after each.
- Never change an existing test's expected values to make a refactor pass.
- Keep refactor and feature as separate steps (and separate commits if AK
  commits) so each diff is reviewable.
- If a refactor grows beyond what was proposed, stop and report.

## 6. What NOT to propose

- Cleanup in code the feature doesn't touch (mention serious debt in
  `ARCHITECTURE.md` instead).
- Reformatting whole files, reordering imports, style-only churn.
- Rewrites, framework or library swaps, "modernising" patterns.
- Changing the project's established conventions to a different style —
  consistency within a project wins (coding standards, section 1).
- Abstractions for things that have only one case today ("we might need it").
