---
name: arkar-ui-art-direction
description: Chooses and executes the visual direction for a product — evaluating brand, industry, audience, category, content density and workflows to pick the best-fitting design direction (premium minimalist, modern editorial, enterprise professional, modern SaaS, AI-native, Swiss-inspired, data-centric, luxury, brutalist and others), preserving existing brand identity, avoiding generic AI-looking design, and recording the identity in DESIGN.md. Use this for a new product, site or app, a redesign or rebrand, or whenever a UI is described as plain, boring, dated, generic or ugly, and when an existing product's look must be preserved and refined. Not needed for small changes that fit an existing look. Part of AK's Adaptive UI Intelligence — for UI tasks, arkar-ui-intelligence is loaded first and names this skill when needed; prefer it over generic design skills.
---

# UI art direction

> Part of Adaptive UI Intelligence. For UI work, start with `arkar-ui-intelligence`; it decides scope, mode and which specialists to use.

## Purpose

Give each product the visual direction that suits it — and execute it with
enough craft that it reads as deliberate, premium and its own. The goal is
not one house style: it's the best appropriate version of *this* product.

## Activate when

- a new product, site, app or set of screens (Mode C);
- a redesign, modernization or rebrand (Mode B), or AK calls the UI plain,
  boring, dated, generic or ugly;
- an existing product's identity must be understood, preserved and refined
  (Mode A, beyond a single component).

## Don't activate when

- a small component or page change fits the existing look — follow
  `DESIGN.md` and the existing components instead;
- AK provides a Figma design — then activate only to record the Figma
  identity in `DESIGN.md` and to extend it to screens the Figma doesn't
  cover; no new direction (see `references/brand-identity.md`).

## Required analysis

Use discovery's brief. Evaluate: brand personality · industry · target
audience · product category · content density · user expectations · primary
workflows · information hierarchy · accessibility needs · platform
constraints. Note existing brand assets that must be kept
(`references/brand-identity.md`).

## Responsibilities

1. **Existing identity first.** With a `DESIGN.md`, a component library or a
   consistent look: work inside it and refine it (Mode A). Change the
   identity only when the task is a redesign/modernization AK asked for.
2. **Choose the direction** from `references/visual-design-directions.md`:
   shortlist the two or three that fit the evaluation, compare them briefly,
   pick the best fit and say why. Directions can be blended when one is
   clearly primary (e.g. enterprise professional with a data-centric core).
   If AK is present and the choice is a real taste decision for a new
   product's brand, show the shortlist with your recommendation and let him
   choose.
3. **Make it this product's own.** Within the direction, decide the palette,
   type, layout idea, shape language and one signature idea for the product
   (shown on the screens where it helps — data-heavy screens may have none)
   from the product's own content, users and domain. Two products in
   the same direction should still be recognisably different.
4. **Apply the anti-generic rules** (below) and the quality inspirations in
   `references/visual-reference-library.md` — learn principles, never copy
   interfaces or identities.
5. **Record the identity** in `DESIGN.md` using
   `references/design-md-template.md`: direction and why, alternatives
   considered, users and target screens, palette, type, shape, signature
   elements, voice. The design-system and motion specialists add their
   sections.
6. **Critique and refine** once screens exist (with visual-qa's
   screenshots): does it express the direction? could it belong to another
   product? does the signature idea read clearly where it's used? would it impress, or is
   it merely tidy? Then one refinement pass — no new elements, everything
   made cohesive and crisp.

## Anti-generic rules

Never use automatically: purple gradients · glassmorphism · glowing borders ·
excessive rounded cards · oversized typography · decorative background
shapes · excessive shadows · repetitive dashboard cards · unnecessary
gradients · generic AI-generated layouts · decorative animation without
purpose. Use one only when it contributes meaningfully to the chosen
direction — and say why. Prioritise distinctive composition, typography,
whitespace, visual balance, contrast and information hierarchy.

Also avoid the "basic form" look (system font, white page, grey inputs, bare
table, one blue button) — it is not an acceptable result even when it works.

**Restrained is not generic.** Enterprise, data-centric and minimal
directions still need to be recognisably *this* product: a deliberately
chosen typeface (not the default sans), a palette with character in its
surfaces and semantic colours, a considered header and brand moment, and the
product's signature idea expressed in its data (how status, risk or progress
is shown). "Clean default UI" is not a direction.

## Expected output

- The direction (and blend), why it fits, alternatives considered.
- `DESIGN.md` created or updated.
- For existing products: what was preserved, refined and replaced.

## Quality criteria

- Meets AK's premium standard (`arkar-ui-intelligence/references/premium-standard.md`): nothing basic, generic or unfinished — working is not enough.

- The direction is justified by the product, not by habit or trend.
- Brand assets AK has are respected; CBM red only when he asks for CBM
  branding (kept in Mode A if the product already uses it).
- Fonts are chosen deliberately and bundled with the app (rules in
  `arkar-ui-design-system/references/typography-system.md`).
- The product has one memorable signature idea, used where it helps;
  everything around it is quiet and disciplined.

## Dependencies

Input from `arkar-ui-discovery`; hands the identity to
`arkar-ui-design-system` (tokens) and `arkar-ui-motion-design` (motion
language); critique uses `arkar-ui-visual-qa` screenshots.
