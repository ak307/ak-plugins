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

## What it contains — per screen

Each specialist fills the rows it owns; load a specialist because the sheet
needs its row, not "just in case".

| Row | What to decide | Owner |
|---|---|---|
| **Job** | Who uses it, the question they bring, what must be noticed first | ux-engineering |
| **Direction** | Existing product: the design system and patterns it follows (named). New product / redesign: the one chosen direction and why | discovery / art-direction |
| **Composition** | The layout, built from the content; the hero moment; the visual that isn't just text and icons. Name the obvious layout and say why it was kept or rejected — on paper, never as built variations | art-direction |
| **Components** | Existing components reused (by name); new ones and their variants and states; tokens used — no one-off styles | design-system |
| **Figma** | The Figma frames it implements, if AK provided a design (the design wins) | Figma skills |
| **Data & latency** | What loads, from where; fast / noticeable / long / timeout handling; refresh and stale responses | ux-engineering |
| **States** | Every state, each with its exact look and wording: loading, slow, empty, partial, error, failure + retry, success, disabled (with why), permission, offline, conflict — the ones that can happen | ux-engineering |
| **Interactions** | Every control: press feedback, busy state, double-action guard, confirmation or undo, keyboard path, focus moves | ux-engineering / accessibility |
| **Motion** | Motion level per moment, the choreography of each main action, kit functions used, reduced-motion behaviour | motion-design |
| **Copy** | Headings, labels, errors, toasts, confirmations — final words, not placeholders | ux-engineering |
| **Responsive** | What changes at phone / tablet / desktop (not "it stacks") | responsive-design |
| **Accessibility** | Names, roles, focus order, contrast risks, touch targets, announcements | accessibility |
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
- **Complete before code.** Every row that applies is filled. "TBD" means the
  decision isn't made yet — make it.
- **Changes update the sheet.** If implementing shows a decision was wrong,
  change the sheet first, then the code, so the record stays true.
- **Acceptance checks are concrete:** "wrong code → field shakes, message
  'That code didn't match — 4 tries left', digits cleared, focus on first
  box" — not "error state works".

## Small example (an existing admin system)

```
## Build sheet — two-factor sign-in
Job: staff signing in; first question "what do I type?"; the code field first.
Direction: existing AdminLTE theme and its tokens; no new identity.
Composition: one centred card, six-digit field as the hero; obvious layout kept
  (it is the expected pattern) — the craft goes into the field and its states.
Components: existing card, button, alert; new OTP field (6 boxes, paste-aware).
Data & latency: verify request 200 ms–3 s; "Verifying…" in the field at once.
States: idle · typing · verifying · wrong code (tries left) · expired · locked
  (until 10:42, contact IT) · success → dashboard · server error + retry.
Interactions: auto-advance, paste fills all, Backspace steps back, Enter submits,
  disabled submit explains why; focus on first box on load and after an error.
Motion: field shake on wrong code (L2), check draws on success then hand-off;
  reduced motion → colour and message only.
Copy: "Enter the 6-digit code from your authenticator app" · errors as above.
Responsive: phone — numeric keyboard, boxes ≥ 44 px, card full width.
Accessibility: one labelled group, errors announced, contrast AA on the alert.
Acceptance: each state seen at 390 and 1440; flows filmed; keyboard-only walk;
  audit clean; fail switch → retry keeps nothing typed lost.
```
