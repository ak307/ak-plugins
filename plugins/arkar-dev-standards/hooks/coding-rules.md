# AK's coding standards (always on)

These apply to every coding task in every project. They exist because the code
is maintained by a small team: the senior developer (4+ years) and junior
developers who are still learning. Code that works but has to be decoded slows
everyone down, and projects that are laid out differently each time force the
team to relearn where things live.

Quality is not negotiable: correctness, security, performance and error handling
stay at a professional standard. These rules change how the solution is
expressed, not how good it is.

## 1. Existing projects: follow what is already there

Before adding or moving files in an existing project, look at how it is already
organised (folder layout, file naming, class vs function style, entry point) and
extend that. Do not reorganise, rename or "modernise" structure unless asked.
If the existing structure is causing a real problem, propose the change
(see 2c) instead of making it silently. Consistency inside one project matters
more than any general best practice.

## 2. New projects and new modules: use the standard template

When creating a new project, or adding a new module/layer to one, load the
`arkar-project-structure` skill and use its template for that stack (FastAPI,
Django, Django agentic, Laravel, Flutter). Do not invent a new layout. If the
template genuinely does not fit, explain why in one or two sentences before
deviating.

## 2b. Browser-based UI work: unique design, checked in a real browser

Whenever you build or change anything users see in a browser, load both:

- `arkar-frontend-design` — every project gets its own creative, impressive
  identity (recorded in the project's `DESIGN.md`); never a basic or
  template-looking UI.
- `arkar-frontend-qa` — the quality floor: run the app, inspect it at the
  project's target screen sizes, test interactions, fix and re-check.

Never claim to have visually checked something you didn't.

## 2c. Every feature or update: clean, secure, behaviour preserved

Whenever you implement or change code, load `arkar-change-workflow` and
follow its steps in order: read `ARCHITECTURE.md`, run baseline tests,
propose cleanup of the code the change touches and any security fixes in
**one approval list**, apply only what AK approves, then build the feature
cleanly and securely, run tests and security checks, and record decisions.

**Never change existing code beyond what the feature needs without AK's
approval** — not for cleanup, not for security. Label proposals 🟢 SAFE
CLEANUP, 🟢 SAFE SECURITY FIX or 🟠 CHANGES BEHAVIOUR; leave skipped items
untouched. Existing business rules, APIs, database behaviour and workflows
must not change unless he approves. The job isn't done until your new code
is clean and the checks pass.

## 3. Readability baseline: intermediate level

Write code an intermediate developer reads comfortably and a junior developer
can follow and learn from.

- **One way to do one job.** Don't create two code paths that do the same thing
  (e.g. a single-item version and a batch version with separate matching
  logic). Make one call the other, so they cannot drift apart.
- **Plain control flow over packed expressions.** Prefer a few clear lines with
  `if` blocks over a one-liner that chains `or`, conditional expressions,
  slicing and method calls. Never put a conditional expression inside string
  concatenation. Prefer the framework's idiomatic form (e.g. Django
  `F("count") + n`) over hand-rolled read-then-write.
- **Full, descriptive names.** `rule_type`, `amount`, `bank_account` — not
  `rt`, `amt`, `ba`. Names say what the thing is or does. Follow the language's
  naming convention (Python: snake_case functions/variables, PascalCase classes,
  UPPER_CASE constants).
- **Classes when there is state or a real concept; functions otherwise.** Use OOP
  where an object holds data or represents something in the domain. Don't wrap
  plain functions in a "stateless" class of `@classmethod`s just to look
  object-oriented — a module of functions is clearer.
- **Small, focused functions.** A function does one thing its name describes. If
  you need numbered step comments to follow it, split it into well-named helpers.
- **Don't repeat boilerplate.** When the same try/except, formatting or setup
  block appears three times, extract it into one helper.
- **Avoid workarounds that hide structure problems.** If you need an import inside
  a function to avoid a circular import, fix the dependency direction instead.
- **Shallow call chains.** Following one feature should not require jumping
  through many layers of builders/adapters/orchestrators. Add a layer only when
  it removes real duplication or isolates something that changes independently.

## 4. Comments and docstrings

- Explain **why**, not what the code already says. Short docstrings: one line,
  plus a few lines only when behaviour is non-obvious.
- Write for a newcomer: no private shorthand, ticket/phase codes, sample-file
  nicknames or references to "memory"/notes they can't see. Spell it out or
  leave it out.
- Never hard-code staff names into code, messages or comments.
- Keep comments in sync with code. If the docstring lists steps, the code must
  match them — or remove the list.
- Type hints on function signatures; keep them simple. Avoid heavy generic /
  Protocol / TypeVar machinery unless it clearly prevents bugs.

## 5. Before saying you are done

Re-read what you wrote against sections 1–4 and fix anything that breaks them.
