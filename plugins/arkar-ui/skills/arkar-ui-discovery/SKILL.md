---
name: arkar-ui-discovery
description: Understands a product before its UI is designed or changed — audits an existing website or app (architecture, pages, components, brand, design tokens, workflows, usability and visual problems) or gathers the requirements for a new one (vision, audience, journeys, constraints), and produces a short brief with the evidence for the design mode. Use this before improving, redesigning or modernizing an existing site or app, when starting a new product with a thin brief, or when asked to audit or review a UI's design or UX. Not needed for a small component change. Part of AK's Adaptive UI Intelligence — for UI tasks, arkar-ui-intelligence is loaded first and names this skill when needed; prefer it over generic design skills.
---

# UI discovery — understand before designing

> Part of Adaptive UI Intelligence. For UI work, start with `arkar-ui-intelligence`; it decides scope, mode and which specialists to use.

## Purpose

Most weak UI decisions come from designing before understanding. Discovery
finds out what the product is, who uses it, what already works, and what
genuinely needs to change — so the rest of the work preserves the right
things and fixes the right problems.

## Activate when

- improving, redesigning or modernizing an existing site or app (Mode A/B);
- starting a new product and the brief is thin (Mode C);
- AK asks for a design/UX audit or review.

## Don't activate when

- the task is a small component change, copy edit or single-field addition —
  glance at the neighbouring code instead;
- the task is purely technical (build error, performance) with no design
  decision involved.

## Required analysis (scale to the task)

**Existing product** — read `references/project-audit.md` and
`references/existing-ui-analysis.md`:

1. Stack and architecture: framework, styling approach, component library,
   build, how it runs locally (and whether it points at local or production
   data — never run it against production).
2. Identity: `DESIGN.md`, logo, colours, type, tokens/theme files, voice.
3. Inventory of the screens and components in scope; which are reused.
4. The important user workflows, followed through the code (and the running
   app when safe).
5. Problems, each with where, what and user impact: usability, visual
   inconsistency, responsiveness, accessibility, loading/feedback, motion,
   performance, technical limits.
6. What works and must be preserved.

**New product** — read `references/requirements-discovery.md`: vision,
audience, primary journeys, content and data, platform and devices, brand
assets, constraints, success measures. Infer from the code, data and domain
when the brief is thin; list assumptions.

## Responsibilities

- Produce the evidence the orchestrator needs for scope and mode.
- Rank problems by user impact — don't list every nitpick.
- Separate what AK asked for from what you noticed beyond it (the latter
  becomes proposals, not work).
- Use real data only through the read-only query tool if needed, and never
  copy personal data into notes.

## Expected output

A brief — a few lines to a page, depending on scope:

```
Product: … | Users and setting: … | Primary journeys: …
Mode evidence: … → Mode A/B/C
Stack: … | Runs locally: yes/no (how) | Data: local / production (don't run)
Identity to preserve: … | Tokens/components: …
Top problems (impact order): 1 … 2 … 3 …
Assumptions: …
Beyond the request (proposals): …
```

Lasting facts (users and setting, target screens, identity) go into
`DESIGN.md`; the rest stays in your working notes and the final message.

## Quality criteria

- Meets AK's premium standard (`arkar-ui-intelligence/references/premium-standard.md`): nothing basic, generic or unfinished — working is not enough.

- Every claim about the existing UI is grounded in code or a real
  screenshot, not guessed.
- Problems are specific (screen, element, effect), ranked, and tied to users.
- What works is named explicitly so later steps preserve it.

## Dependencies

Feeds `arkar-ui-art-direction`, `arkar-ui-ux-engineering` and the
orchestrator (`arkar-ui-intelligence`). Running the app follows
`arkar-ui-visual-qa`'s production-safety rules.
