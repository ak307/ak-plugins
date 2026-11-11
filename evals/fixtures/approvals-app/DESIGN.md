# Approvals — design record

## Product

Purchase-request approvals for a company of about 2,000 staff. Requests are
routed by amount: every request needs the requester's **manager**; from
**$5,000** Finance signs next; from **$50,000** a **Director** signs last.
Approvers work a queue every day (Finance clears 20–40 a day); requesters
look in occasionally to see where a request is and why it is held.

Users and setting: office staff on laptops (1280–1920 wide) for approving;
managers and requesters also on phones between meetings.
Target screens: 1440×900, 1280×800, 768×1024, 390×844, 320×640.

## Direction

**Enterprise professional, with Liquid Glass for the floating layer**
(AK's default for business systems). Shortlist: *enterprise professional*
(fits daily, dense, trustworthy work) · *data-centric* (strong for the queue
but cold for requesters) · *modern editorial* (warm, but too slow for a
triage tool). Chosen: enterprise professional, with a data-centric hero band.

- **Canvas:** a deep ink field (teal-navy with a copper glow) the glass sits
  on. Working surfaces people read — the queue, line items, history — are
  warm paper, solid.
- **Palette:** ink `#0B1A22`, paper `#FBFAF7`, copper accent `#F08A4B` for the
  brand moment and key numbers on the canvas; status is a system (below).
- **Type:** Bricolage Grotesque (headlines, titles — characterful, a little
  editorial), Geist (UI text), Geist Mono (amounts, IDs, dates — tabular).
  All bundled in `fonts/`, no CDN.
- **Shape:** 10 px controls, 16 px panels, 22 px glass sheets, pills for chips.
- **Voice:** plain and specific. "PR-24817 approved — sent to Finance", never
  "Success!".

### Status language (one meaning, one encoding — chips, rows, marks, routes)

| Meaning | Colour role | Icon | Used for |
|---|---|---|---|
| On track / approved | `--ok` green | check | waiting < 2 days; approved steps |
| Due soon / sent back | `--warn` amber | clock / return | waiting 2–3 days; changes requested |
| Overdue / rejected | `--bad` red | alert / cross | waiting ≥ 3 days (the policy limit); rejected |
| In review / current | `--info` blue | dot | the step a request is at |

### Signature

Three candidates from the product's world: (1) the **interoffice routing
slip** — the paper slip with a signature line per approver; (2) the
**rubber stamp** landing on the request; (3) a **waiting line** of requests by
age. A generic "band of KPIs" was rejected outright.
Chosen: the **routing slip** is how every route is drawn (row track, detail
slip, requester journey) and a **stamp** lands when a decision is made —
APPROVED (green), SENT BACK (amber), REJECTED (red). The waiting line
becomes the queue's hero visual: it is the queue's own data, not decoration.

One small surprise: an empty queue shows a stamped, squared-off stack —
"You're all caught up".

## Motion

Character: quick, physical, calm. Tokens: `--motion-fast 140ms`,
`--motion-base 240ms`, `--motion-slow 420ms`; ease-out for arrivals,
in-out for moves, a damped spring for the stamp and opening panels.

- L1: press (scale .97), focus rings, checkbox tick.
- L2: chips, menus, toasts (rise 200 ms), composer opening.
- L3: detail sheet opening from its row (narrow screens), the reason dialog
  and file preview opening from their trigger and closing back into it,
  tab content cross-fade, lists reflowing with FLIP.
- Signature (L3): the decision sequence below.
- Reduced motion: no travel — stamp and panels fade, lists change in place,
  numbers are set at once.

## Build sheet — approvals workspace

### Screen 1 · Approver queue ("Needs you")

- **Job:** an approver's first question is *what needs me, and what is
  late?* The overdue ones are noticed first, then the size of the pile.
- **Composition:** obvious layout (a row of KPI tiles over a full-width
  table) **rejected** — it hides age, which is what matters.
  Idea A *"what needs me now"*: a sentence headline + a **waiting line** of
  every request in the queue placed by days waiting and sized by amount,
  the 3-day policy line drawn across it. Idea B *"the object itself"*: a
  stack of request cards like a physical in-tray — beautiful, but slow at
  30+ items. Idea C *"time"*: a calendar of arrivals — answers the wrong
  question. **Chosen A**: headline + waiting line on the deep canvas (the hero),
  then the queue list and a detail column beside it. B's idea lives on in
  the detail panel (the request is shown as a document with its slip) and
  in the empty state.
- **Components:** glass top bar, persona menu, glass segmented tabs with
  counts and a sliding indicator, toolbar (search, sort, "Overdue only"),
  queue rows, bulk bar, detail sheet, toast, stamp.
- **Queue row:** checkbox · avatar + requester + department · title + vendor
  · route track (one dot per step, the current one ringed) · amount (mono)
  with a relative bar · waiting time chip coloured by SLA · paperclip count.
  Whole row opens the request; the checkbox selects.
- **Data & latency:** all requests load once per view (200–1200 ms, `?latency=slow`
  3–8 s, `?fail=1` first try fails). No loader under 250 ms; content-shaped
  skeleton rows and strip otherwise; slow notice after 2.5 s
  ("Still loading the queue…"). Decisions save in 200–1200 ms with a busy
  button; the request's detail (history, files) loads separately.
- **States:** loading (skeleton) · slow · loaded · empty queue ("You're all
  caught up" stack + what's next) · no search results ("No requests match
  'chairs'" + Clear search) · load failed ("We couldn't load your queue.
  Nothing has changed — try again." + Retry, frame kept) · selection (bulk
  bar) · deciding (busy) · decision failed (inline in the panel, reason kept)
  · partial bulk failure ("Approved 4 of 5. PR-24901 couldn't be saved." +
  Retry the failed one).
- **Interactions:** row click / Enter opens; Space or X toggles selection;
  J/K or arrows move (roving, one Tab stop); `/` focuses search; A approve,
  S send back, R reject when a request is open; Esc closes composer, then the
  panel. Select-all selects the visible rows. Undo in every decision toast.
- **Copy:** headline "14 requests need you — $182,400 in all." Sub
  "3 are past the 3-day limit. The oldest, PR-24817, has waited 6 days."
- **Responsive:** ≥1200: list + detail column (the detail column never
  empty: shows the oldest overdue and the shortcuts). 760–1199: list full
  width, detail is a sheet from the right over it. <760: rows become cards
  (title, amount, wait chip, route), detail is a full-screen sheet with a
  sticky action bar, bulk bar sits above the safe area.
- **Accessibility:** list is a `listbox`-like set of buttons with roving
  focus; every mark on the waiting line is a focusable button with a full
  name ("PR-24817, $12,400, waited 6 days, overdue"); status never colour
  alone (icon + words); toasts announced; focus returns to the row after
  closing the panel.

### Screen 2 · Request detail (sheet / column)

- **Job:** decide with confidence: what is it, how much, who has signed,
  what's attached, what happened before.
- **Composition:** the request as a document: header (ID, status, title,
  requester), amount large, then the **routing slip** (one signature line
  per step, signed / waiting / to come) with *why this route* ("$12,400 is
  over $5,000, so Finance signs after the manager"), line items with totals,
  attachments (open a rendered preview), history timeline. Sticky action
  bar: **Approve** (primary), Send back, Reject.
- **Decision sequence (signature):** press → button busy → save → the stamp
  lands on the document (spring, 420 ms) and the slip line signs → the row
  collapses out of the list, the tab count and headline numbers roll → toast
  above the action bar "PR-24817 approved — sent to Finance" with Undo → after
  900 ms the next request slides in (or the caught-up moment).
- **Send back / reject:** an inline composer opens above the action bar:
  reason required (quick chips for common reasons), draft saved per request
  as you type, error "Tell Kenji what to change — a few words at least."
  on empty submit with focus on the field.
- **States:** loading history/files (skeleton) · read-only (not your step, or
  decided) with the reason why · decided by someone else · save failed
  (inline, keeps the reason).

### Screen 3 · Sent back (approver)

- **Job:** *what did I ask for, and is anyone acting on it?*
- **Composition:** cards, each the reason I wrote as a quote, the requester,
  and how long it has been with them on a time chip; hero line
  "4 requests are back with their requesters — the longest for 5 days."
  plus the same waiting line measuring time with the requester.

### Screen 4 · Decided (approver)

- **Job:** *what did I sign off this week?*
- **Composition:** hero: "You decided 23 requests this week — $412,800
  approved." with a week chart (a column per day, approved / sent back /
  rejected stacked). Below, a timeline by day with the stamp colour per
  decision and the running amount approved.

### Screen 5 · My requests (requester)

- **Job:** *where is my request, and why is it held?*
- **Composition:** hero sentence ("One request needs changes from you.") over
  an **amount ladder** that shows the routing thresholds with the requester's
  requests placed on it — it explains *why* a request has more signatures.
  Below, journey cards: the routing slip drawn large, the step it is at, who
  holds it, for how long against the 3-day limit, and the reason in words
  (sent back: the approver's note + "Make the changes"; at Finance for 4 days:
  "This is past the usual 3 days." — no claim of reminders the mock doesn't
  send). Finished requests sit
  in a compact list at the end.
- **Resubmit:** in the detail panel: "What did you change?" (required) and
  an optional file (name and size are kept, the file itself is not
  uploaded in this mock) → back to the approver who sent it back.

### Acceptance checks

1. Each persona's view loads at 1440, 1280, 768, 390, 320: no horizontal
   scroll, nothing overlapping.
2. `?latency=slow`: skeleton rows + strip shapes, slow notice; `?fail=1`:
   load error with Retry that works; first decision fails inline and Retry
   succeeds with the reason kept.
3. Approve one: stamp, row collapse, counts roll, toast with Undo, next
   request opens; Undo restores it.
4. Send back with empty reason → inline error and focus; with reason →
   appears under Sent back and in the requester's view with that reason.
5. Bulk: select 3 → bar shows count and total; approve 3 with Undo; bulk
   reject asks one reason in a dialog that opens from the button.
6. Refresh after any decision keeps it; refresh with a request open
   reopens it; Back closes it.
7. Keyboard only: tab to list, arrows, Enter, A, Esc returns focus to row.
8. Requester resubmits a sent-back request → it returns to that approver's
   queue.
9. Audit: no serious/critical axe issues, no console errors, targets ≥ 24 px.
10. Reduced motion filmed: no travel, nothing left hidden.

### Changes after the independent review

- **Waiting time** is calendar time, precise in the first week ("5 d 22 h"),
  so the chip, the waiting line and the history agree.
- **Single decisions** confirm in place: the stamp lands in the footer
  (the signature area) with "… approved — sent to Finance · Undo"; the next
  request then slides in under a receipt strip with Undo (no toast over the
  content). A decision that finishes after the approver has opened another
  request only updates the list and shows a toast; it never stamps the
  request now on screen.
- **Bulk approve** asks first (list, total, "Approve 36"), like bulk reject.
- **Opening a request on wide screens** scrolls the work area to the top so
  the whole document fits; the list moves with the page and the row stays
  in view.
- **The idle column** shows a breakdown the list doesn't: the queue by
  department (Needs you), who you're waiting on (Sent back), the week by
  decision (Decided).
- **Sent back** is one column of wide tickets: request on the left, your
  note on the right.
- **Resubmit** lets the requester edit quantities, unit prices and the cost
  centre; the new total and route update as they type. If the total crosses
  a threshold, steps are added or dropped; earlier approvals stand and the
  history notes the change of total.
- **Amounts** use Geist with tabular figures (Geist Mono stays for IDs and
  dates).
