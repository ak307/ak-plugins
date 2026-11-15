# The build sheet — decide everything once, before code

Production UI is not found by building variations and critiquing them until
one scores well. It is decided up front, written down, built once to that
decision and verified against it. The build sheet is that decision: the
design, behaviour and checks for one feature, written before the first line
of UI code. The premium bar does not move — the craft goes into the sheet
instead of into rebuild loops.

## Where it lives

- New screens, a page set, a new product or a redesign: a
  `## Build sheet — <feature>` section in the project's `DESIGN.md` (create
  DESIGN.md if the project has none). It stays as the record of how the
  feature is meant to look and behave, for whoever changes it next.
- Small component change: a short sheet (five to eight lines covering the
  rows that apply) in your reply before you edit — no DESIGN.md section.

## It starts with the component plan

Think in components and systems, not isolated pages: every screen should
share one design language and interaction pattern, and stay flexible where
a screen genuinely needs something of its own. Before any screen, from the
requirements and the existing design system:

| Part | What to write |
|---|---|
| **Reuse** | Existing components and tokens the feature uses, by name (and the library they come from) |
| **Extend** | Existing components that need a new variant, property or state — and why the existing ones don't cover it |
| **New** | Each new component: purpose · variants · properties · states (default, hover, focus, active, disabled, loading, error, empty, selected — the ones that apply) · interactions and keyboard · responsive behaviour · accessibility (role, name, announcements) · tokens used |
| **Foundation** (new product or redesign) | Tokens, then the shared primitives the screens need — buttons, fields and selects, surfaces and panels, list or table rows, badges, tabs or segmented controls, dialogs and sheets, toasts, empty / error / skeleton states — and the product's signature components |
| **Material** (new product or redesign) | Liquid Glass is the default: which surfaces are glass (the floating layer — navigation, what stays at the top once content is under it, floating panels, sheets and dialogs, menus, toasts — each visibly glass: a tint of about 0.85 or less), which stay solid (what people read and work in), and what lies beneath the glass for it to refract — strong enough that a still shows which surfaces are glass (white frost on a pale page doesn't). Going without it: the reason, in one line |
| **Navigation** | The destinations, counted → the pattern that count calls for (one: none · 2–5: tabs · 6+ or grouped: a side rail · phones: a bottom bar) → what stays on screen while scrolling, and why each item earns it → the header's two states (at rest; once content is under it) → the phone arrangement. Existing product: its navigation, named, and what this feature pins, if anything (`arkar-ui-ux-engineering/references/navigation-and-header.md`) |

Rules:
- **Reuse before you build.** Search the codebase and the component library
  first; a second component doing the job of an existing one is a defect.
- **Extend before you fork.** A new variant or property on an existing
  component beats a near-copy.
- **Plan what the screens need, no more.** Extract a pattern when it really
  repeats during implementation (the second or third time), and add it to
  the plan; don't build a speculative library.
- **Components carry the quality.** Modular, configurable through
  properties, consistent, responsive, accessible, every state designed,
  tokens only — so every screen built from them inherits it.
- **Navigation is decided here, from this product's structure** — not
  taken from the last product or from a kit. "A top bar with the logo and
  the account" is the obvious answer and is usually wrong: neither is
  needed while scrolling.

## What it contains — per surface

A surface is every place the work happens, not only the page: the detail
panel or sheet a list opens, a form, a dialog, the moment of decision, the
success, empty and error states. Each one gets these rows; a detail view
that reads like a printed form or invoice is the template look, rejected
here on paper.

Each specialist fills the rows it owns; load a specialist because the sheet
needs its row, not "just in case".

| Row | What to decide | Owner |
|---|---|---|
| **Job** | Who uses it, the question they bring, what must be noticed first | ux-engineering |
| **Direction** | Existing product: the design system and patterns it follows (named). New product / redesign: the one chosen direction and why | discovery / art-direction |
| **Composition** | The layout, built from the content; the hero moment; the visual that isn't just text and icons. Name the obvious layout and say why it was kept or rejected — on paper, never as built variations | art-direction |
| **Components** | Which planned components the screen is composed of; anything screen-specific (and why it isn't a shared component) — no one-off styles | design-system |
| **Figma** | The Figma frames it implements, if AK provided a design (the design wins) | Figma skills |
| **Data & latency** | What loads, from where; fast / noticeable / long / timeout handling; refresh and stale responses | ux-engineering |
| **States** | Every state, each with its exact look and wording: loading, slow, empty, partial, error, failure + retry, success, disabled (with why), permission, offline, conflict — the ones that can happen | ux-engineering |
| **Interactions** | Every control: press feedback, busy state, double-action guard, confirmation or undo, keyboard path, focus moves | ux-engineering / accessibility |
| **Motion** | Motion level per moment, the choreography of each main action, kit functions used, reduced-motion behaviour | motion-design |
| **Copy** | Headings, labels, errors, toasts, confirmations — final words, not placeholders | ux-engineering |
| **Responsive** | What changes at phone / tablet / desktop (not "it stacks") | responsive-design |
| **Accessibility** | Names, roles, focus order, contrast risks, touch targets, announcements | accessibility |
| **Security** | The data shown or collected and how sensitive it is; what the URL may carry and the browser may store; sign-in / reset / lockout wording that doesn't reveal accounts; which permissions and fields the server re-checks | arkar-security |
| **Acceptance checks** | The list Verify will tick: each state seen, each flow walked, each check run | visual-qa |

## Rules

- **One decision per question.** Alternatives are thought through while
  writing the Composition row — in a sentence each — and one is chosen. For
  an existing product the existing system answers most rows; don't invent
  alternatives to it.
- **Ask early, not after building.** If a new product's direction is
  genuinely open and AK is present, propose at most two directions in text
  and let him pick before the sheet is finished. Never build two versions to
  compare.
- **Complete before code.** Every row is answered — when a row doesn't
  change anything, say so and why ("Composition: follows the claim form's
  single-column layout"; "Motion: none in this product — press feedback and
  busy state only"). "TBD" means the decision isn't made yet — make it.
- **States of the real feature, not only of the mock.** List what the real
  system will do — slow and failed requests, limits and lockouts, expiry,
  permission, conflicts, partial success — even when the mock can't produce
  them yet; give each its look and wording, and build the ones the mock can
  show.
- **Keeping a product's look never drops the experience.** "Keep the
  existing look" preserves its visual system; press feedback, busy states
  that stop double submits, specific errors with recovery, focus handling and
  comfortable touch targets are behaviour, and are built to the experience
  standard within that look. If the look itself can't reach the standard,
  say so and propose the redesign — don't lower the experience to match it.
- **Changes update the sheet.** If implementing shows a decision was wrong,
  change the sheet first, then the code, so the record stays true.
- **Acceptance checks are concrete:** "wrong code → field shakes, message
  'That code didn't match — 4 tries left', digits cleared, focus on first
  box" — not "error state works".

## Small example (an existing admin system)

```
## Build sheet — leave request form
Component plan:
  Reuse: AdminLTE card, form group, date input, select, primary button, alert, modal.
  Extend: primary button — add `busy` state (spinner, width held, blocks re-press).
  New: BalanceMeter — props: total, used, requested; variants: enough / low / over;
    states: loading (skeleton), unavailable (retry); role="meter" with label; tokens:
    success / warning / danger, radius-sm. Used here and later on the dashboard.
  Navigation: unchanged — the product's sidebar. Nothing new is pinned: the form fits
    a screen, and on phones Submit sticks above the keyboard (48 px, 6% of the height).
Job: staff applying for leave; first question "how many days do I have left?" —
  the balance is noticed first, then the dates.
Direction: existing AdminLTE theme, its card, form and alert components; no new identity.
Composition: obvious layout kept (form in a card) — the balance sits beside the dates
  and updates as they change; that is the moment the craft goes into.
Components: existing card, date inputs, select, button, alert; new balance meter as a
  library component (variants: enough / low / over).
Data & latency: balance load 200 ms–2 s (skeleton in the meter only); submit 300 ms–3 s.
States: loading balance · balance unavailable + retry · over balance (why, how many) ·
  overlapping request · public holiday inside range · submitting · submitted (reference,
  approver named) · server error with the form kept · session expired (draft kept).
Interactions: busy Submit (no double submit), dates validate on blur, Enter submits,
  disabled Submit says why; focus to the first problem; Escape on the confirm dialog.
Motion: meter fills to the new value (L2); success replaces the form in place;
  reduced motion → instant value and colour change.
Copy: "You have 9 days left" · "This takes 3 days — 6 left after approval" · errors as above.
Responsive: phone — dates stacked, native date pickers, Submit sticky above the keyboard.
Accessibility: balance announced politely when it changes, labels on every field,
  contrast AA on the low/over colours, targets ≥ 44 px.
Security: own leave balance only (server checks the user); URL carries the request id
  only; reason draft in sessionStorage; dates and balance re-validated on the server.
Acceptance: each state seen at 390 and 1440; flows recorded; keyboard-only walk;
  audit clean; ?fail=1 → retry keeps the dates and reason.
```
