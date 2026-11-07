# Experience rubric — scoring a build by using it

The visual rubric (`scoring-rubric.md`) judges what a build looks like.
This one judges what it is like to **use**, against
`plugins/arkar-dev-standards/skills/arkar-ui-intelligence/references/experience-standard.md`
(AK's "End-to-End Product Craftsmanship & Experience Excellence"). A build
is accepted only when **both** scores pass.

## How the tester works

The tester gets a local URL for each build (served by `evals/serve_projects.py`)
and drives it with the visual-QA scripts, reading every image it makes:

- `node <scripts>/film.cjs <url> <folder> [--size=WxH] [--span=ms] <steps>`
  — a slowed filmstrip with real times of what happens after each step
  (`click=<selector>`, `press=<key>`, `hover=<selector>`,
  `type=<selector>=<text>`, `wait=<ms>`);
- `node <scripts>/screenshot.cjs <url> <folder> --sizes=WxH` — a still.

Paths walked, for each main flow: happy path; invalid and empty input; a
failure and retry and a slow response (try `?fail=1`, `?latency=slow`, or
any switch the app offers — if none exists, that is itself a finding);
cancel, back and undo; refresh mid-task; keyboard only; phone (390×844).

## Dimensions (1–10; 10 = Apple-level, 7 = solid professional, 5 = generic)

| Dimension | What it covers |
|---|---|
| Feedback | every press, hover, focus, selection responds at once and proportionately; same action → same response everywhere |
| Waiting | loading designed for fast / noticeable / long / failed data; skeletons hand off to results in place; refresh keeps content |
| Success & confirmation | proportionate confirmation; toasts placed, timed and worded well, with undo; dialogs ask the real question |
| Errors & recovery | prevented where possible; specific, inline, kind; work never lost; retry in place; unexpected states designed |
| Transitions & choreography | spatial continuity; one action moves as one coordinated sequence; only what changed moves; no snaps or flicker |
| Information & timing | first view answers the first question; progressive disclosure; numbers and wording consistent and updating together |
| State & navigation | back/forward, refresh and links keep the view; selections and filters persist where helpful; nothing lost |
| Touch & keyboard | targets, thumb reach, no hidden fields on phone; full keyboard path, visible focus, sensible focus return |
| Consistency | one interaction language across the product; still delightful on the fiftieth use |

**overall** = mean of the dimensions (dimensions that truly can't be
exercised are null and listed in `not_testable`, which counts against
the build).

**critical_failures:** a dead control, a lost user input, an action with
no feedback, an error with no way forward, a broken state after back or
refresh, a keyboard trap.

Acceptance: overall ≥ 8.5, no dimension < 7, no critical failure.

## Output

```json
[{"build": "build-xxxxx", "scores": {"feedback": 7, "waiting": 6, "success": 7, "errors": 5,
  "transitions": 6, "information": 7, "state": 6, "touch_keyboard": 7, "consistency": 7},
  "overall": 6.4, "not_testable": ["errors: no failure switch"], "critical_failures": [],
  "top_moments": ["step → what happened (frame time) → what it should do", "..."]}]
```
