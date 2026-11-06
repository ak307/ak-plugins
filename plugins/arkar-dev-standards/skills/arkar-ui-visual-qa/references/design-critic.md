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
   (plus key states: a dialog open, loading, an AI answer, an empty state).
2. Start a fresh subagent with the Agent tool. Give it **only**: the
   screenshot paths, one line on what the product is and who uses it, and
   the brief below. Never give it the code, `DESIGN.md`, or your reasoning —
   that would anchor it to your intentions.
3. Fix the critic's top findings (at least the five most severe), re-shoot,
   and record the critique and fixes in `qa-screenshots/premium-pass.md`.
   Don't dismiss a finding by pointing at your own `DESIGN.md` ("that idea
   was rejected there") — the critic is judging the result, and your
   earlier reasoning is what it's checking. If the critic says a screen
   looks like a generic template, redo that screen's composition — the
   interaction probe finding no template flags doesn't answer it (the probe
   only catches a few mechanical patterns; the critic sees the whole).
4. If no subagent tool is available, do a "cold read" yourself: look at each
   screenshot as a stranger seeing the product for the first time, before
   re-reading any code.

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
> Return the 10 most visible shortfalls across all screens, most severe
> first, each as: screen · what's wrong · a concrete direction to fix it (not
> a specific copy of any existing product).
