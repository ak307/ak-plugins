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

1. Take four screenshots: the two screens at desktop and at phone size, with
   real content (no skeletons, no lorem ipsum).
2. Start **one** fresh subagent with the Agent tool, in the foreground. Give
   it the four screenshot paths, one line on the product and who uses it,
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
> 4. **The three changes that would lift it most**, most valuable first.
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
- Then build the remaining screens to the level these two now set: the
  same ideas, contrast and care on every inner surface.
- Record `## Early review` in `qa-screenshots/premium-pass.md`: the verdict
  per screen, the changes asked for, what you changed.
