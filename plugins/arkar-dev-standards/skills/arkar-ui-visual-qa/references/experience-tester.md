# Independent experience tester

The design critic judges what the product looks like. The experience
tester judges what it is like to **use** — every press, wait, success,
error, transition and recovery — against
`arkar-ui-intelligence/references/experience-standard.md`. Both are
required for a new product, page set or redesign; screenshots alone can
never prove the experience.

## How to run it

Start a fresh subagent with the Agent tool (so it has no attachment to the
build). Give it: the local URL (the app must already be running on local or
test data), one line on the product and its users, the main flows, the path
to these scripts, and the brief below. No Agent tool → do it yourself as a
cold pass and say so.

## Brief for the tester

> You are an exacting user-experience tester. Use this app the way its
> users would — don't just look at it. You can see it only through images,
> so capture what you need:
> - `node <scripts>/film.cjs <url> <folder> [--size=WxH] [--span=ms] <steps>`
>   films what happens after each click/press/hover as a slowed filmstrip
>   with real times (steps: `click=<selector>`, `press=<key>`,
>   `hover=<selector>`, `type=<selector>=<text>`, `wait=<ms>`);
> - `node <scripts>/screenshot.cjs <url> <folder> --sizes=WxH` for a still.
> Read every image you make.
>
> Walk each main flow along these paths: the happy path; invalid and empty
> input; slow data and a failure and retry (open the URL with
> `?latency=slow` and with `?fail=1`, then filter, search and save too — if
> the switches don't exist or only affect the first load, that itself is a
> finding); cancel, back and undo; refresh
> mid-task (does state survive?); keyboard only (Tab, Enter, Escape,
> shortcuts — is focus visible and sensible?); phone size (390×844).
>
> For every moment judge, concretely: does the control respond at once?
> what fills the wait, and does it hand off smoothly to the result? how do
> success messages, toasts and confirmations appear — position, timing,
> wording, undo? do dialogs open from their trigger and return focus? are
> errors specific, kind, inline and recoverable without losing work? do
> transitions keep spatial continuity, and does only what changed move?
> is information revealed at the right moment, consistent everywhere
> (counts, names, wording updating together)? is the same action handled
> the same way everywhere?
>
> Score with the experience rubric (each 1–10; 10 = Apple-level, 7 = solid
> professional, 5 = generic): feedback, waiting, success & confirmation,
> errors & recovery, transitions, information & timing, state & navigation,
> touch & keyboard, consistency. Then list the ten most important moments
> that fall short — each with the step, what happened (frame time), and what
> it should do instead. Be specific and demanding; "fine" is not premium.

## After the tester reports

Fix the moments it names (all critical ones, then the rest by impact),
re-test with a fresh tester, and repeat until every experience dimension is
≥ 7 and the overall ≥ 8.5 — the same bar as the visual critique, up to four
rounds. Record each round's scores, findings and fixes under
`## Experience test` in `qa-screenshots/premium-pass.md`.
