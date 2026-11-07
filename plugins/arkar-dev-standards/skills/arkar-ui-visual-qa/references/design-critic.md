# The independent design critic

The builder is too kind to its own work: it knows what it meant, so it sees
the intention instead of the screen. A critic that sees **only the
screenshots** judges what users will actually see.

## When

In the premium pass of every new product, page set or redesign — after
round 1, and again after round 2 if round 1's critique found major issues.
For smaller changes it's optional.

## How

1. Take full-page screenshots of each main screen at desktop and phone size
   **and of every key state** — the core flow done once (e.g. a question
   asked and answered, a booking confirmed, a form submitted with errors and
   then successfully), a dialog open, loading, empty, error — plus the
   filmstrips of the first load and the main flows
   (`scripts/interaction-probe.cjs`, `scripts/film.cjs`). A critic who only
   sees the empty start screen can't judge the product.
2. Start a fresh subagent with the Agent tool. Give it **only**: the
   screenshot and filmstrip paths, one line on what the product is and who
   uses it, and the brief below. Never give it the code, `DESIGN.md`, or your
   reasoning — that would anchor it to your intentions.
3. **The bar is the critic's score, not the number of fixes.** Fix every
   critical failure, every section scored below 7 and the most severe
   findings, re-shoot, and send the new screenshots to a **fresh** critic.
   Repeat until the critic scores the build **overall ≥ 8.5 with no
   dimension and no section below 7 and no critical failure** — or after
   four critique rounds, stop and report honestly what is still below the
   bar and why. Record each round's scores and fixes in
   `qa-screenshots/premium-pass.md`.
4. Don't dismiss a finding by pointing at your own `DESIGN.md` ("that idea
   was rejected there") — the critic is judging the result, and your
   earlier reasoning is what it's checking. If the critic says a screen or
   section looks like a generic template, redo that composition — the
   interaction probe finding no template flags doesn't answer it.
5. If no subagent tool is available, do a "cold read" yourself: look at each
   screenshot as a stranger seeing the product for the first time, before
   re-reading any code, and score it with the same rubric.

## The critic's brief (paste it)

> You are a world-class product design critic (Apple / Linear / Stripe
> calibre) reviewing screenshots of a product before launch. Be specific and
> demanding; do not praise. The bar: a top-tier, Apple-level premium
> experience — people should open it and think "wow, this is beautiful".
> Polished-but-boring fails.
>
> Read each screenshot (Read tool) and for each screen answer:
> 1. Three-second test: what catches the eye first? "Wow" or merely "fine"?
> 2. Boring signals present: muted/monochrome palette with no vivid moment;
>    low contrast range; no hero moment; flat (no depth/layering); text and
>    icons only (no visual); identical rows/cards top to bottom; template
>    page structure (hero → three equal cards → CTA band; KPI tiles over a
>    long table); large empty areas.
> 3. Craft: typography (scale, character, rhythm), colour (conviction,
>    tinted neutrals), spacing and alignment, component polish, state
>    design, detail.
> 4. Does it look like a generic template or like *this* product? Squint
>    until the text is unreadable: if the remaining shapes match every
>    other product of this type (e.g. header, a band of numbers, filters, a
>    full-width list), say so — that is a top finding, ahead of any detail,
>    and its fix is a different composition, not nicer details.
>
> 5. Motion (the filmstrips — slowed down, times are real): does each
>    change explain itself (where things came from and went), feel natural
>    and premium (eased, no pop-in, no abrupt jump, no layout jolt), and
>    stay quick (nothing to wait for; frequent actions ~100–200 ms)? Is
>    anything decorative, slow, confusing or missing motion where a change
>    would be hard to follow? Is there one moment of motion worth remembering?
>
> 6. Score with this rubric (1–10; 10 = best-in-category Apple/Linear/
>    Stripe level, 7 = solid professional, 5 = generic template, 3 =
>    basic/unfinished; polished-but-boring is at most 6 for visual and
>    layout): **visual** · **layout** · **functionality** (controls read as
>    what they do, flows complete, nothing broken) · **completeness**
>    (loading/empty/error/success/processing states) · **responsiveness**
>    (phone designed for the size; desktop not a stranded column) ·
>    **motion** (from filmstrips; null if none) · **consistency** ·
>    **originality**. Also score **each section** of each long page
>    (hero, each band below it, footer) 1–10.
>
> Return: the scores (overall = mean of the dimensions), the section scores,
> critical failures (anything visibly broken, covered, blank, unreadable, or
> a missing core state), and the 10 most visible shortfalls, most severe
> first, each as: screen/section · what's wrong · a concrete direction to fix
> it (not a copy of any existing product).
