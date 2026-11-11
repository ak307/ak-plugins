# Orchestration guide

## How specialists are used

- Every specialist is an independent skill in this plugin and works on its
  own. The orchestrator decides which ones a task needs; it doesn't run them
  all.
- Load a specialist with the Skill tool (`arkar-dev-standards:<name>`), then
  follow it. Read its references only when the task touches that topic.
- If a specialist can't be loaded, find and read its `SKILL.md` (search
  `~/.claude/plugins` for `skills/<name>/SKILL.md`), or apply its procedure
  from what you know — and say in the final
  message that it was done without the skill.
- One owner per decision (below). A specialist that needs something another
  owns uses that decision instead of re-deriving it, so analysis and
  implementation aren't duplicated.

## Ownership

| Decision or artefact | Owner |
|---|---|
| Product brief, journeys, existing identity, constraints, mode evidence | discovery |
| Direction, brand use, signature elements, `DESIGN.md` concept | art-direction |
| Information architecture, layout strategy, flows, states, forms, data display | ux-engineering |
| Tokens, type and colour systems, components and variants, themes | design-system |
| Motion language, motion tokens, transitions, skeletons, micro-interactions, AI activity states | motion-design |
| Breakpoints, adaptive layouts, platform conventions, touch | responsive-design |
| WCAG target, keyboard and screen reader behaviour, inclusive design | accessibility |
| Code structure, techniques, dependencies, performance | implementation |
| Running the app, inspection, quality gates, the verification report | visual-qa |

## Matrix: task → specialists (in order)

| Task | discovery | art | ux | design-system | motion | responsive | a11y | implementation | visual-qa |
|---|---|---|---|---|---|---|---|---|---|
| Small component change | | | ● | | ○ | | ○ | ● | ● |
| Page improvement (A) | ○ | ○ | ● | | ○ | ○ | ○ | ● | ● |
| Existing site improvement (A) | ● | ● | ● | ○ | ○ | ○ | ○ | ● | ● |
| Visual redesign | ● | ● | ● | ● | ● | ● | ● | ● | ● |
| Modernization (B) | ● | ● | ● | ● | ● | ● | ● | ● | ● |
| New product (C) | ● | ● | ● | ● | ● | ● | ● | ● | ● |
| Technical frontend / performance | ○ | | | | | | | ● | ● |
| Motion / interaction enhancement | | | ○ | ○ | ● | | ○ | ● | ● |
| Responsive correction | | | ○ | | | ● | ○ | ● | ● |
| Accessibility audit or fix | | | ○ | | | | ● | ● | ● |
| Design tokens / theming / dark mode | ○ | ○ | | ● | | | ○ | ● | ● |
| New screens / feature in an existing product | ○ | | ● | ○ | ● | ● | ● | ● | ● |
| Native mobile app (Flutter, React Native) | ● | ● | ● | ● | ● | ● | ● | ● | ● |

● load · ○ load only if the task actually touches it.

## Hand-offs

Each specialist's output lands in the build sheet
(`build-sheet.md`) before code — that is the hand-off between them.

1. **discovery** → a short brief (in your working notes and, for lasting
   facts, `DESIGN.md`): product, users, journeys, mode evidence, identity,
   tokens, components, stack, constraints, problems found.
2. **art-direction** → the direction and identity in `DESIGN.md`.
3. **ux-engineering** → structure, flows and states for the screens in scope.
4. **design-system** → tokens and component rules (in code and `DESIGN.md`).
5. **motion-design** → the motion language and tokens (in `DESIGN.md`) and
   what moves where.
6. **responsive-design** → behaviour per size/platform.
7. **accessibility** → requirements for the controls and flows in scope.
8. **implementation** → the code, following all of the above.
9. **visual-qa** → verifies the build against the sheet, fixes defects,
   runs the independent review, writes the verification report.

For small tasks, most steps collapse into a line of thought; don't produce
documents nobody needs.
