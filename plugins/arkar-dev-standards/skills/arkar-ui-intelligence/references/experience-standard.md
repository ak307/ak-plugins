# End-to-End Product Craftsmanship & Experience Excellence

AK's name for his standard: not just a beautiful UI, but an exceptionally
refined product where every detail, interaction, animation, system response
and workflow feels deliberately designed and flawlessly executed — and keeps
impressing throughout use, not only at first sight.

## Every moment, not just every screen

AK can judge how a product *looks* from screenshots. What makes it feel
Apple-level is what happens between them, and that is equally important —
if not more. Every interaction, from a single button press to the longest
workflow, is designed, built and checked as carefully as the layout.
Nothing generic, abrupt, unfinished or added as an afterthought.

These are expectations to design each product's own answers from — not
fixed values. Timings are starting points; the product's motion language
decides the exact feel.

## The state model — loading, processing and feedback

AK's core principle: **never leave users wondering what the application is
doing.** They never wonder whether a press was received, whether the app is
working, or whether something went wrong — in every state, not only when
everything loads. One state model, shown the same way everywhere, instead
of loading logic written again in each component:

| State | Meaning | What the user sees |
|---|---|---|
| Idle | ready | — |
| Loading | the first fetch: nothing to show yet | a skeleton shaped like the content, in its place |
| Refreshing | fetching again | what was loaded stays; a quiet sign that work is going on |
| Processing | doing what the user asked | the control itself: its label says what ("Saving…") |
| Success | **confirmed by the server** | a tick where the user acted, or a short notice |
| Error | it failed | what went wrong in plain words, what was kept, the way out |
| Empty | it worked; nothing to show | an empty state that says what goes here and how to start |
| Retrying | trying again after a failure | the same place, busy |
| Cancelled | the user stopped it | the truth about what did and didn't happen |

Rules that don't bend:

- **Success is shown only after the server confirms it** — never because a
  request was sent. A build that showed "submitted" for a permit that
  wasn't is the bug this rule exists for.
- **One press, one request.** A second press while it works does nothing —
  and the server refuses a repeat as well (an idempotency key or a unique
  constraint), because the button is not a guarantee.
- **Optimistic only for small, reversible changes** (a toggle, a reorder,
  marking as read): the change shows at once, is never announced as a
  success, and rolls back with a message if it fails. Anything that
  submits, sends, assigns, approves, pays or deletes waits for the server.
- **A timeout is not a failure.** Nobody knows whether it went through:
  check with the server before saying anything, and never offer a blind
  retry that could do the thing twice.
- **Timing:** under ~300 ms no indicator (its space is kept, so nothing
  jumps); once shown it stays at least ~450 ms (no flicker); past ~3 s the
  user is told what is happening; long work moves to the background with
  progress.
- **Never invent progress.** A percentage only when the work reports one;
  otherwise an indicator that claims nothing more than "working".
- **Indicators move only while work is really going on** (a spinner, a
  skeleton's shimmer) and stop the moment it ends.
- **Confirmations leave; errors stay.** A confirmation dismisses itself
  (not while the pointer or keyboard is on it; longer with Undo); an error
  stays until it is dealt with. One confirmation per action, nearest the
  action — a button's tick is not repeated by a toast.
- **Nothing the user typed is lost** by a failure, a timeout or a session
  that expired. A failed refresh never removes what was on screen.
- **Dialogs only for critical errors**; everything else is beside the
  field, in the region that failed, or a notice. Ordinary loading never
  covers the application with a full-screen overlay.

Materials (the material map in
`arkar-ui-design-system/references/materials-glass.md`): skeletons are
solid and muted; a working button keeps its own material; background
progress is translucent glass; a success notice is glass with a clear
tick; a failure notice is a restrained tinted surface; a critical error
dialog is thick glass — the same material as other pop-ups, near-opaque so
its text stays above 7:1 over anything, with a mark that says it is serious
(never a plain card, never as light as a routine dialog).

Web builds get all of this from `arkar-ui-design-system/assets/surface-kit.js`
— `load(region, fetcher)` (skeleton, refresh, empty, error and retry,
offline, latest request only), `commit(button, work)` (the working
button), `toast`, `progress`, `dialog` (the product gives the words, the
actions and whether it is critical; `errorDialog` is the critical one),
`setState` — rather than writing it per screen. The kit holds no wording of
its own: `configure({ locale, labels, icons })` sets it once, in the
product's language. Frameworks keep the same model and rules with their
own stores and components (one `useOperation`-style hook or composable, one
set of feedback components).

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
- Optimistic updates only for small, reversible actions (the change shows
  at once, is never announced as a success, and rolls back clearly if it
  fails) — see the state model above.

### Real data takes time

The UI talks to a database or API: sometimes it answers in 50 ms, sometimes
in 3 s, sometimes it times out. Design every data moment for the whole
range, and make the mock data layer behave like the real one so it can be
seen and tested:

- **Realistic, variable latency by default** (e.g. 200–1200 ms per request,
  occasionally slower), plus exactly these URL switches — `?latency=slow`
  (3–8 s) and `?fail=1` (requests fail; retry can succeed) — applied to
  every request (load, filter, search, save), not only the first page
  load, so testers can exercise every data moment the same way.
- **Placeholders match what arrives:** the skeleton has the real content's
  shape and height (same headline lines, same chart frame), so nothing
  jumps when data lands; a failed region keeps its frame and retries in
  place (busy state in the Retry button, no page reload).
- **Fast (< ~300 ms):** no loader — the content just arrives with the
  normal entrance; no spinner flash.
- **Noticeable (~0.3–2 s):** content-shaped skeleton or in-place progress
  in the exact area that will change; the rest of the screen stays usable.
- **Long (> ~2 s):** say what's happening, keep the user able to work or
  cancel; for multi-step jobs show steps or determinate progress.
- **Very long / timeout:** a calm message with retry, keeping what's
  already loaded and what the user typed.
- **Refresh and filter:** keep the current content visible (dimmed slightly
  at most) until the new data replaces it in place; ignore out-of-date
  responses that arrive after a newer request.
- **Actions:** optimistic only where small and reversible (show the
  change at once, roll back clearly on failure); anything that commits
  shows its busy state in the control that was pressed and its success
  only after the server answers.

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
- **One exception — sign-in, password reset and lockout:** wording that
  never reveals whether an account exists ("That email and password don't
  match"; "If an account exists, we've sent a link"), still kind and with the
  next step (`arkar-security`, frontend checklist §4).
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
- **State survives — the user's work above all.** What the user did
  (acknowledged, approved, assigned, generated, edited) persists like real
  data: the mock layer saves it (e.g. localStorage standing in for the
  server), so a refresh never silently undoes work — and never claims
  "your work is still here" unless it truly is. The view (filters, search,
  selected item, current step) lives in the URL, so refresh, back/forward
  and a shared link land on the same place; multi-step flows push each
  step into history, so Back returns to the previous step, not out of the
  app.
- **What the user typed is never lost:** form and composer drafts survive
  closing (Escape asks "Discard your reason?" or keeps the draft per item)
  and survive a refresh (saved as they type); only an explicit cancel
  discards.
- **Moving between pages is continuous too:** a multi-page product uses
  cross-document view transitions (`@view-transition { navigation: auto; }`
  with matching `view-transition-name`s, so the clicked row or building
  carries into its page) rather than a hard page swap.
- **Opening detail doesn't move what's being read:** a side panel overlays
  or reserves its space; the list keeps its columns, row heights and
  scroll position, and the selected row stays where the eye left it.
- **No dead ends or false affordances:** anything that looks clickable
  (rows, cards, counts like "40 more") does something meaningful — opens,
  expands or navigates — and anything that doesn't is not styled as a
  control.
- Only what changed animates; nothing else flickers or re-reveals.
- **One action, one choreographed sequence:** every place it changes moves
  together — the item travels from source to destination, lists close
  gaps smoothly, numbers roll, the confirmation lands last — never one
  element animating while its neighbours snap.

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
- Focus rings are designed, visible, and never cut off — on every custom
  control too (map pins, chart points, tiles).
- **Keyboard flow is designed, not left over:** a grid, chart or tile set
  is one Tab stop with arrow keys inside (roving tabindex); focus stays on
  the control that was used even when the view re-renders; Escape steps
  back (closes, clears the selection); opening a panel moves focus into it
  and closing returns it.
- **One confirmation per action, where the action happened:** an in-place
  confirmation (the button's check, the row's highlight) or a toast near it
  — not both, and never a toast far across the screen or on top of the
  content it describes. A blocked action explains itself next to the
  control (and points to the first problem), not in a distant toast.
- **One state, one message:** every place that describes the same state
  agrees at the same moment (headline, captions, counts, chips).
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

During the premium pass, `arkar-ui-visual-qa/scripts/use-check.cjs` uses
each surface the way a tester would (load, widths, keyboard, phone, slow and
failed requests, refresh, Back, a double press), every action that commits
gets the transaction list (pressed twice, left at once, failed and retried,
refreshed mid-way), and the key moments are filmed with `film.cjs`. The
independent reviewer then walks each main flow as a first-time user. Judge
every moment above; record a table in `qa-screenshots/premium-pass.md`
(moment → what happens → verdict → fix).
