# The early look review — two screens, before the rest is built

The review at the end finds defects. By then a weak design is expensive to
change, so it gets recorded as "still short" and shipped. This review comes
while a change still costs one screen: it judges **the look only**, of two
screens, and its answer decides how the rest is built.

## When

New products, page sets and redesigns — once the first screen and one inner
screen exist with real content. The inner screen is the one people will work
in most: the table, the form step, the detail. Not for small component
changes, and not for a feature that must match an existing product's look.

## How

1. Take the screenshots: the two screens at desktop and at phone size, with
   real content (no skeletons, no lorem ipsum) — each **at rest and
   scrolled** part-way down, because a header is judged where it goes
   wrong, which is never the top of the page. If the product ships a second
   theme, add the first screen in it, at rest and scrolled. Use the normal
   pixel density (`deviceScaleFactor: 1`): at 2, headless Chromium can leave
   glass partly unblurred, and the reviewer would see text through it.
2. Start **one** fresh subagent with the Agent tool, in the foreground. Give
   it the screenshot paths, one line on the product and who uses it,
   and the brief below. Never the code, `DESIGN.md` or your reasoning.
   No Agent tool → do it yourself as a cold read (close the code, look only
   at the screenshots, answer the same questions) and say so in the record.

## The brief to give the reviewer

> You are looking at two screens of a product that is still being built:
> its first screen, and the screen people will work in most. You have not
> seen the code or the design notes; judge only what you see.
>
> For each screen:
> 1. **Verdict** — one of: **top tier** (it would stand beside the best
>    product of its kind), **good** (competent; nobody would remember it),
>    **ordinary** (a template, a default, or unfinished).
> 2. **Three seconds** — what the eye lands on first, and whether that is
>    the most important thing on the screen.
> 3. **What looks wrong** — overlap, cramped or cut-off text, misalignment,
>    weak contrast, anything inconsistent between the two screens.
> 4. **What stays on screen** — compare each screen at rest and scrolled.
>    Does what stays pinned belong to this product and earn its place (the
>    context, the step, the screen's action), or is it a generic bar holding
>    a logo and an account? Is anything showing above, beside or through
>    it? Is it one band? Is it in the page's own tone?
> 5. **Material** — is the layer that floats (what stays at the top once
>    the page has scrolled, bars and panels over the content, sheets)
>    visibly glass — translucent, lit at its edge, with something behind it
>    worth seeing through — while what people read and work in stays solid?
>    Or is the product solid throughout, or frosted everywhere?
> 6. **The three changes that would lift it most**, most valuable first.
>    Each must be concrete enough to build (what, and where), and use what
>    the product already has — its content, colours and type. No new
>    features.
>
> For the inner screen, also answer: does it carry the first screen's idea
> — its colour and contrast, its scale, its own way of showing this
> product's content — or is it a standard table, form or card grid under a
> designed first screen? If it is a standard pattern, name it.
>
> End with one line: **Build the rest**, or **Recompose <which screen>
> first**.

## After it

- A screen called **ordinary**, or an inner screen called a standard
  pattern: recompose it now — change the build sheet first, then the
  screen — and send the new screenshots to one more fresh reviewer.
- A screen called **good**: make its first change at least, and every
  "looks wrong" item.
- **Solid throughout**, when the build sheet's Material line has no reason
  for going without glass: the default material is missing. Bring Liquid
  Glass to the floating layer now, before the rest is built on solid
  surfaces. **Frosted everywhere:** the working content goes back to solid.
- Then build the remaining screens to the level these two now set: the
  same ideas, contrast and care on every inner surface.
- Record `## Early review` in `qa-screenshots/premium-pass.md`: the verdict
  per screen, the changes asked for, what you changed.
