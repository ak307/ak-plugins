# The independent design critic

The builder is too kind to its own work: it knows what it meant, so it sees
the intention instead of the screen. A critic that sees **only the
screenshots** judges what users will actually see.

## When and how

This is the **look** half of the independent review
(`independent-review.md`, which says when it runs and how its findings are
handled). Run it once, after Verify, for new screens, page sets, products
and redesigns.

1. Take full-page screenshots of each main screen at desktop and phone size
   **and of every key state** — the core flow done once (e.g. a question
   asked and answered, a booking confirmed, a form submitted with errors and
   then successfully), **every view behind each tab, segment and nav
   item** (not only the first), a dialog open, loading, empty, error; one
   window-sized screenshot of each main screen **scrolled part-way down**,
   at desktop and phone size and in each theme the product ships (a
   full-page screenshot can't show what stays pinned, or what shows above
   and through it; at the normal pixel density, `deviceScaleFactor: 1`,
   because at 2 headless Chromium can leave glass partly unblurred) — plus the
   filmstrips of the first load and the main flows
   (`scripts/interaction-probe.cjs`, `scripts/film.cjs`). A critic who only
   sees the empty start screen can't judge the product.
2. Give the reviewer **only**: the screenshot and filmstrip paths, one line
   on what the product is and who uses it, the **mode** (existing product
   following its design system, or new product / redesign) with the design
   system's name, and the brief below. Never the code, `DESIGN.md` or your
   reasoning — that would anchor it to your intentions.
3. Don't dismiss a finding by pointing at your own `DESIGN.md` ("that idea
   was rejected there") — the critic judges the result. A screen it calls a
   generic template in a new product or redesign is a critical defect: fix
   it by recomposing that screen within the brief.
4. If no subagent tool is available, do a "cold read" yourself: look at each
   screenshot as a stranger seeing the product for the first time, before
   re-reading any code, and use the same brief.

## The critic's brief (paste it)

> You are a world-class product design critic (Apple / Linear / Stripe
> calibre) reviewing screenshots of a product before launch. Be specific and
> demanding; do not praise. The bar: a top-tier, Apple-level premium
> experience. Judge it for its **mode**: a new product or redesign must
> also be distinctive — polished-but-boring fails; new screens in an
> existing product must fit that product's design system and be crafted to
> its best standard in every state — don't mark them down for keeping the
> system's look, mark them down for anything plain, inconsistent or
> unfinished within it.
>
> Read each screenshot (Read tool) and for each **surface** answer — every
> detail panel, sheet, dialog, form and state is judged on its own, at phone
> and desktop, as strictly as the first screen (users spend their time
> there):
> 1. Three-second test: what catches the eye first? "Wow" or merely "fine"?
> 2. Boring signals present: muted/monochrome palette with no vivid moment;
>    low contrast range; no hero moment; flat (no depth/layering); text and
>    icons only (no visual); identical rows/cards top to bottom; template
>    page structure (hero → three equal cards → CTA band; KPI tiles over a
>    long table); a detail or form that reads like a printed document
>    (label–value stacks, a plain table, the product's identity dropped);
>    large empty areas.
> 3. Craft: typography (scale, character, rhythm), colour (conviction,
>    tinted neutrals), spacing and alignment, component polish, state
>    design, detail.
> 4. Does it look like a generic template or like *this* product? Squint
>    until the text is unreadable: if the remaining shapes match every
>    other product of this type (e.g. header, a band of numbers, filters, a
>    full-width list), say so — that is a top finding, ahead of any detail,
>    and its fix is a different composition, not nicer details. Look at
>    the scrolled screenshots for what stays pinned: does it belong to this
>    product and earn its place (the context, the step, the screen's
>    action), or is it a generic bar with a logo and an account? Anything
>    showing above, beside or through it, a second band under it, or a bar
>    whose tone fights the page, is a defect. And the material: for a new
>    product or redesign, the layer that floats (what stays at the top once
>    scrolled, bars and panels over the content, sheets, dialogs, toasts)
>    should visibly be glass, with the working content solid — solid
>    throughout, or one glass bar on an otherwise solid product, is a
>    finding; so is frosted glass everywhere.
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
> Return, most severe first, a list of **defects** — each as: severity
> (**critical**: visibly broken, covered, blank, unreadable, a missing core
> state, or — for a new product or redesign — a screen that looks like a
> generic template, including a detail panel, sheet or form that reads
> like a printed document; **major**: clearly below premium for its mode;
> **minor**: polish) · screen/section · what's wrong · a concrete fix within
> the brief (not a copy of any existing product). Then the scores (overall
> = mean of the dimensions) and section scores, as a diagnostic.
