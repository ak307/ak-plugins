# Interaction patterns

## Contents
1. States
2. Feedback
3. Forms
4. Confirmation and undo
5. Tables and lists
6. Dashboards and charts
7. AI conversations and agents
8. UX writing

## 1. States

Every data-bearing screen and component handles:

| State | Design it to |
|---|---|
| Loading | show the shape of what's coming (a skeleton for content areas — see `arkar-ui-motion-design`); a small indicator for actions; never a blank screen |
| Empty | say what's missing and the next step ("No leave requests yet — Request leave") |
| Partial / long | stay readable with one item and with hundreds; long text wraps or truncates with access to the full text |
| Error | a human message (no exception text), what to do, and a retry; keep the user's input |
| Offline | cached data marked as possibly out of date, or a message that it's the connection |
| Success | a clear confirmation and the obvious next step |
| Disabled / no permission | why, and what would enable it |

Model states explicitly in code (a status enum or union), not by guessing
from `data && !error`.

## 2. Feedback

- Every action responds within ~100 ms (pressed state, inline change,
  indicator).
- Operations over ~1 s show loading; when real progress is known, show
  determinate progress; never fake percentages.
- Show what changed: the updated row highlights briefly, a count updates, the
  moved item moves (motion skill).
- Toasts for confirmations that don't need action; inline messages for
  anything users must read or act on.
- Optimistic updates only where failure is rare and easy to reverse — and
  roll back visibly if the server says no.

## 3. Forms

- Labels always visible (never placeholder-only); required vs optional
  clear.
- One column; group related fields; sensible defaults; correct input types
  (`email`, `tel`, `number`, `date`) and `autocomplete` attributes.
- Validate on blur or submit, not on every keystroke while the user is still
  typing; messages next to the field, in plain language, saying how to fix.
- On submit: loading on the button, prevent double submission; on server
  error keep everything the user typed; on success confirm and show the next
  step.
- Don't ask again for information already given in the same process.
- Long forms: save progress or warn before leaving with unsaved changes.

## 4. Confirmation and undo

- Destructive or irreversible actions (delete, reject, cancel, remove access,
  send): confirm with the specific thing named ("Reject Tan's leave request
  for 3–5 Nov?") and a specific button label ("Reject request"), or perform
  it with an undo window when it's reversible.
- Don't confirm routine, reversible actions — that trains users to click
  through.
- Bulk actions state the count and scope before running.

## 5. Tables and lists

- Numbers right-aligned with tabular figures; units shown; totals distinct.
- Sortable columns indicate the current sort; sticky header for long tables.
- Row actions consistent; bulk actions appear when rows are selected.
- Pagination or "load more" with the total; keep filters, sort and position
  when returning from a detail view.
- On small screens: priority columns, cards, or horizontal scroll inside the
  table's own container (see `arkar-ui-responsive-design`).
- Live updates: highlight changed rows briefly; never re-order rows under the
  user's cursor without warning.

## 6. Dashboards and charts

- Lead with the 3–5 numbers that matter most to the users, each with context
  (change, target, period).
- Pick the chart by the question:

| Question | Chart | Not when |
|---|---|---|
| How did it change over time? | line (area for one series) | fewer than ~4 points → a stat with change |
| How do categories compare? | horizontal bar, sorted | more than ~12 → top 10 + others |
| What share of the whole? | stacked bar or one progress bar | more than 4 parts → bars; avoid many-slice pies |
| How far toward a target? | progress bar or ring with the number | no target |
| Where are the hotspots? | heatmap (e.g. day × hour) | sparse data |
| Status of many things? | grid of status tiles | fewer than ~6 → a list |

- Label values or axes directly, use semantic colours consistently, give a
  text alternative (the key number in words).
- Avoid repetitive identical KPI cards; design the dashboard around the
  decisions users make with it.

## 7. AI conversations and agents

- Show what the AI is actually doing, in user terms: waiting, searching
  documents, running a tool (named), writing the answer. Never simulate
  activity, never expose private chain-of-thought.
- Stream answers progressively; keep the input usable; offer stop/cancel and
  show what was cancelled.
- Show sources, tool results and actions taken; confirm before the agent
  takes consequential actions (sending, approving, deleting).
- Failures say what failed and offer retry; partial results are kept.
- Motion for these states comes from `arkar-ui-motion-design`
  (`ai-interaction-motion.md`).

## 8. UX writing

- Plain words users use; sentence case; specific verbs on buttons ("Submit
  claim", not "OK").
- Errors: what happened, why if useful, what to do — no blame, no codes
  alone.
- Empty states: what goes here, why it's empty, the next action.
- The same term for the same thing everywhere; translation-ready strings
  through the project's message catalogue.
