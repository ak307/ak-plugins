# How ak-plugins is organised

AK's skills for Claude are a set of plugins in one marketplace (this repo),
built to grow: new skills and whole new domains are added without reworking
what is already there. `tests/test_plugin_contract.py` enforces the rules
below on every plugin under `plugins/`.

## Layout

```
plugins/
  arkar-dev-standards/   the core — every project needs it
    hooks/               always-on rules (coding-rules.md), production guard, security gate
    skills/              change workflow, security, testing, project structure, delivery, AI engineering
  arkar-ui/              a domain — UI work
    hooks/               its always-on rule (ui-rules.md) and the UI quality gate
    skills/              the ten arkar-ui-* skills, their kits and audit scripts
shared/hooks/            code that more than one plugin's gates use (one source)
scripts/                 build_generated.py — writes the generated files into each plugin
tests/  evals/           checks without AI calls / real Claude sessions
```

## The rules

1. **The core needs no other plugin. A domain needs the core, and never
   another domain.** The core holds what must be on in every session:
   production safety, security, testing, the change workflow.
2. **Across plugins, a skill is referred to by name, never by file path.**
   An installed plugin can only read its own folder. Write "load
   `arkar-security` and run its `scripts/security-check.cjs`", not
   `arkar-security/scripts/…`. Paths are fine between skills of one plugin.
3. **Every plugin carries its own always-on rules**, in one `hooks/*rules.md`
   (also given to subagents). A domain's rules are a routing paragraph — when
   to load its entry skill — of at most 2,000 characters. The core's rules name
   a domain only in section 2a, which sends such work to its plugin and reports
   a plugin that is missing.
4. **One entry skill per domain does the triggering; a gate enforces the
   rest.** Every skill's description is always in context and the listing has
   a budget, so more skills is not more capability. New knowledge is a
   reference file of an existing skill unless it is a new moment at which
   Claude must decide to load something. A step that must always happen is a
   hook, not a sentence.
5. **A skill is AK's standard, a gate or a tested kit** — principles,
   standards and reusable workflows. Not a tutorial for a technology Claude
   already knows, and not instructions for one project.

## Adding a skill

Put it in the plugin of its domain; if that domain has no plugin yet, put it
in the core. Name it `arkar-<…>` (names are unique across all plugins). The
structure tests pick it up by themselves.

## Adding a domain plugin

A domain becomes its own plugin when it has **three or more skills** that
refer to each other more than to the rest, **its own gate, kit or scripts**,
**its own evals**, and **some projects don't need it**. Until then its skills
live in the core. Moving a skill later is a file move: rules and gates name
skills without the plugin's name, so nothing else changes.

1. `plugins/arkar-<domain>/` with `.claude-plugin/plugin.json` (name, version,
   description) and an entry in `.claude-plugin/marketplace.json`.
2. `hooks/<domain>-rules.md` — first line `… — arkar-<domain> v<version>`, then
   the routing paragraph; say that `arkar-dev-standards` is needed.
   `hooks/hooks.json` gives it to sessions (SessionStart) and subagents
   (SubagentStart), and wires the domain's gate if it has one.
3. Add the plugin and its entry skill to section 2a of the core's
   `coding-rules.md`, so a session without it says so instead of working
   without it.
4. `python3 scripts/build_generated.py`, then the tests.
5. **On claude.ai, switch the new plugin on** (Customize → Plugins) after
   "Check for updates" — a new plugin does not arrive on the laptops until it
   is enabled there.

## Shared code

Code that two plugins need (today: `shared/hooks/gate_common.py`, what a
session loaded and wrote) has one source under `shared/`.
`scripts/build_generated.py` copies it into each plugin that has a gate;
a test fails when a copy differs. Edit only the source.

## Releasing

Each plugin has its own version (`plugin.json` and the first line of its
rules file). Bump the plugins that changed, run `scripts/build_generated.py`,
lint, validate, the secret scan and the tests, add a row to
`evals/SKILL-CHANGES.md`, and merge to `main` only with AK's approval.

## Not decided yet

- **Declared dependencies** (`dependencies` in `plugin.json`) are left out:
  they install a missing plugin automatically with `claude plugin install`,
  but how they behave for plugins that arrive through claude.ai sync is
  unproven, and a dependency that can't be resolved stops the plugin from
  loading. Until that is proven, rule 1 is held by the rules files and tests.
- **Description budget.** The sixteen descriptions total about 13,300
  characters. Before many more skills are added, the specialists of a domain
  with an entry skill and a gate can carry short descriptions.
