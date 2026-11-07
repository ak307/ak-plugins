# The experience standard — every moment, not just every screen

AK can judge how a product *looks* from screenshots. What makes it feel
Apple-level is what happens between them, and that is equally important —
if not more. Every interaction, from a single button press to the longest
workflow, is designed, built and checked as carefully as the layout.
Nothing generic, abrupt, unfinished or added as an afterthought.

These are expectations to design each product's own answers from — not
fixed values. Timings are starting points; the product's motion language
decides the exact feel.

## 1. A press — from touch to result

- **Instant acknowledgement (< 100 ms):** the control visibly responds the
  moment it's pressed (a pressed state — slight darken or scale ~0.97, never
  a jump in layout), so the user knows the press landed.
- **Then the outcome where they're looking:** the button itself changes
  (label → spinner or progress inside it, width held so nothing shifts), or
  the thing it acts on changes in place. Never a click that "does nothing"
  for half a second, and never a full-page reload for a small action.
- **Guard against double action:** while working, the control is busy (not
  just disabled-looking) and can't fire twice.
- **Destructive actions** are visibly different, ask for confirmation in
  words that name the consequence, and offer undo where possible.

## 2. Waiting — loading that settles into the result

- Under ~300 ms: show nothing extra (a spinner flash is worse than none).
- Longer: content-shaped skeletons in the exact layout of what will
  arrive, or a determinate progress with what's happening ("Checking 1,950
  rows…") for long work, with cancel.
- **The hand-off is a moment, not a swap:** skeletons cross-fade into
  content in place (same size, no layout jump); data arriving in pieces
  fills in without reflowing what's already there.
- Refreshing keeps the old content visible until the new one replaces it.
- Optimistic updates for safe, frequent actions (the change shows at once,
  confirmed quietly, rolled back clearly if it fails).

## 3. Success — confirmation people trust

- **Proportionate:** a small action confirms in place (a check that draws
  in the button, the row updating with a brief highlight); a big outcome (a
  booking, a payment run, publishing a roster) earns a designed moment —
  a confirmation that shows *what* happened, with the reference and the
  next step.
- **Toasts / notifications:** appear near where the action happened or in
  one consistent corner, never covering the thing they describe or the
  next control; enter with a short rise/fade (~200 ms), stay long enough to
  read (~4–6 s, longer with an action), pause on hover/focus, leave quicker
  than they came, stack without overlapping, and are announced to screen
  readers. Wording names the thing: "PR-1048 approved — sent to Finance",
  not "Success!".
- **Undo** is offered in the toast for reversible actions, and works.

## 4. Confirmation dialogs and overlays

- Open from where they were triggered (scale/fade from the control, or a
  sheet from its edge), with the backdrop dimming in step; opaque from the
  first frame; focus moves into the dialog, Escape and the backdrop close
  it (unless data would be lost), and focus returns to the trigger.
- Title asks the real question ("Deactivate 3 cards?"), the body says what
  will happen, buttons say the action ("Deactivate 3 cards", "Keep them"),
  the safe option is easy, the destructive one is clearly marked.
- No dialog for things that can just happen with undo.

## 5. Errors and the unexpected

- **Prevent first:** constraints, sensible defaults, inline hints, disabled
  states that explain why.
- **Inline, specific, kind:** errors sit next to the field or the thing that
  failed, say what's wrong and how to fix it in human words, appear when
  useful (on blur or submit, not on the first keystroke), and clear as soon
  as it's fixed. Focus moves to the first problem.
- **Failures keep the user's work:** nothing typed is lost; the action can be
  retried in place; partial success says exactly what succeeded and what
  didn't (and offers to retry only the failures).
- **Unexpected states are designed:** offline, timeouts, permission denied,
  empty results, stale data, a conflict ("Someone else changed this — review
  and save"), a session expiring mid-form.
- Never a raw error code, a blank screen, or a dead end without a next step.

## 6. Moving between screens and states

- Every change of place has spatial continuity: a detail grows from the
  item, closes back into it; steps slide with direction; tabs and filters
  move content rather than blinking it; the back button and browser
  history behave as people expect, and scroll position is kept on return.
- State survives: refresh, back/forward and a shared link land on the same
  view, filters and selections persist where it helps.
- Only what changed animates; nothing else flickers or re-reveals.

## 7. Information at the right moment

- The first view answers the first question; detail is one step away, not
  dumped at once (progressive disclosure).
- Help appears where and when it's needed (inline hints, empty-state
  guidance, a tooltip on a term), not as a manual up front.
- Numbers, names and wording are consistent everywhere they appear; an
  action's result updates every place that shows it (the count in the
  header, the row, the chart) at the same moment.

## 8. Feedback everywhere

- Every hover, focus, press, drag, drop, selection and keyboard shortcut
  gives a visible, immediate and proportionate response — and the same
  kind of action responds the same way across the product.
- Focus rings are designed, visible, and never cut off.
- Long-running work shows progress; finished work shows completion;
  background work that finishes later says so without interrupting.

## 9. Phones and touch

- Targets ≥ 44 pt, primary actions in thumb reach, gestures with visible
  alternatives, sheets instead of tiny popovers, keyboards that fit the
  field (numeric, email), and nothing hidden under the on-screen keyboard
  or a sticky bar.

## 10. Consistency of the whole experience

One interaction language: the same timings, easings, pressed states,
toasts, dialogs, empty and error patterns everywhere. The product should
impress on the fiftieth use as much as on the first — calm, fast,
predictable, and still delightful in its one or two signature moments.

## How it's checked

During the premium pass, walk each main flow as a user — happy path,
invalid input, failure and retry, cancel/back/undo, refresh mid-task,
keyboard only, phone size — recording it with
`arkar-ui-visual-qa/scripts/record.cjs` (real speed) and filming key moments
with `film.cjs`. Judge every moment above; record a table in
`qa-screenshots/premium-pass.md` (moment → what happens → verdict → fix).
