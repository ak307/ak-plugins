---
name: arkar-frontend-design
description: Creates a unique, creative, impressive visual identity for each web project — tailored to its purpose, users and tone — and keeps it consistent across the project's screens via a DESIGN.md. Use this whenever designing, building, restyling or redesigning anything users see in a browser (pages, dashboards, forms, kiosks, admin screens, landing pages, React/Vue/Inertia/Blade/Django templates, CSS/Tailwind), especially new apps and screens, or when a UI is described as plain, boring, ugly or outdated — even if the user doesn't ask for design.
---

# Frontend design — a unique identity for every project

Design is not a fixed standard. Code standards make every project the same on
purpose; design should make every project **its own**: creative, innovative,
professional and impressive, shaped by that project's purpose, users and
tone. What stays fixed — accessibility, responsiveness, states, checking in a
real browser — lives in the `arkar-frontend-qa` skill, which applies to every
UI task alongside this one.

A tidy page with a system font, white background, grey inputs, a bare table
and one coloured button is not an acceptable result, even when it works.

## 1. Find or create the project's identity

Look for `DESIGN.md` at the project root.

- **It exists:** read it first. New screens follow its concept, tokens, type,
  shape language, signature elements and voice — and extend it creatively
  (a new screen still gets its own memorable element in the same language).
  Change the identity only deliberately, and update `DESIGN.md` when you do.
- **No `DESIGN.md`, but the app has a consistent look or design system** (a
  component library, theme tokens, coherent screens): derive its identity
  from the code, write it into `DESIGN.md`, and design within it ambitiously.
- **No `DESIGN.md` and no real identity** (default fonts, ad-hoc CSS, a new
  project, or a UI described as plain, boring, ugly or outdated): create an
  identity with the process below. For an existing app, this redesigns the
  visual layer of the screens you touch while keeping content, behaviour, URLs
  and data the same — say so in the final message.

  Don't let "fix it" wording shrink the design. When a page has no identity
  and the user says it looks bad, that complaint **is** a design brief: the
  redesign meets the same bar as a new project — explored directions, chosen
  typefaces, a signature element drawn from the project's world, and an
  impressive result. Tidying the old layout, or a coloured border as the
  "signature", is not enough.

## 2. Creating an identity

Read `references/creative-process.md`, then:

1. **Understand the project:** purpose, users and setting, primary job, tone,
   vocabulary of its world, constraints.
2. **Explore two or three genuinely different directions** — each with a
   name and one-line concept, palette, type, layout idea and signature
   element — differing on several axes, not three shades of one idea.
3. **Choose one** for the users and primary job. If AK is present and it's a
   real taste call for a new product, offer the directions and let him choose.
4. **Check it against the generic defaults** in the reference and revise
   anything that would look the same in another project — including the look
   you'd reach for by habit.
5. **Write `DESIGN.md`** using `references/design-md-template.md`, including
   the directions you didn't choose and why.

## 3. Build it with craft

- Tokens as CSS variables / theme config; no raw values in components.
- Fonts bundled with the app, not linked from Google — internal networks often
  block them. With a build tool: `@fontsource/<family>`. Plain HTML/CSS: install
  the `@fontsource` package in a temporary folder, copy the needed `.woff2`
  files into the project's `fonts/` folder and write the `@font-face` rules.
  System fonts are not a design choice.
- One signature element per main screen, drawn from the project's world —
  often an SVG visual made in code with the palette.
- Every state (loading, empty, error, success, disabled) designed in the
  project's visual language and voice.
- Each target screen size composed on purpose, not squeezed — and the
  target screens recorded in `DESIGN.md`, so QA checks the sizes that matter.
- Creativity works inside the small hard floor in `arkar-frontend-qa`
  (readable text, keyboard and visible focus, labels, reduced motion). Its
  other checks are advisory: break one on purpose when the identity needs it,
  and record it under "Deliberate deviations" in `DESIGN.md`.
- Motion with the project's character: one orchestrated moment, and feedback
  that answers the user's actions.

**Colour:** choose the palette for the concept. Use the CBM red `#AE1A28` as
primary only when AK asks for CBM branding or the project already uses it.

## 4. Critique for uniqueness, then refine

Using the browser screenshots from `arkar-frontend-qa` (375 / 768 / 1440):

- Could this screen belong to a different project? Does it express the
  `DESIGN.md` concept? Is the signature element obvious at every size? Would
  AK find it impressive, or merely tidy? If merely tidy, name three concrete
  upgrades, apply them, re-shoot.
- Then one refinement pass: no new elements — make what's there cohesive and
  crisp, as if a top product designer laboured over it.

## 5. Final message

Name the concept in one line, the signature element(s), the alternatives you
considered, and that `DESIGN.md` was created or updated. The QA skill covers
what to report about testing.
