# Adaptive design modes

The mode decides how much of the existing product you keep and how far you
move it. Choose it with `decision-framework.md`, apply it only within the
scope AK asked for.

## Mode A — Preserve & improve

For existing products with a usable identity.

**Inspect first:** architecture and stack; the pages and components in scope;
brand (logo, colours, type, voice); existing tokens and `DESIGN.md`; reusable
components; the important user workflows. Note genuine usability problems,
visual inconsistencies and technical limits.

**Preserve:** good visual decisions, existing branding, navigation users
know, working workflows, effective component architecture, useful tokens,
all functionality.

**A plain look is lifted, not copied.** When the product's look is plain —
browser-default controls, flat white cards, no material — and no redesign
was asked for, keep its colours, type, navigation and page layout, and build
the screens you add or change to the working-surface standard
(`arkar-ui-design-system/assets/surface-kit.css` and `.js`, themed to the
product's own colours and type; or the product's component library restyled
through its theme). The new work belongs to the product and is still
premium. AK looked at two careful builds that copied a plain look and
liked neither. Untouched screens stay as they are; lifting them is a 🟠
proposal.

**Improve (within scope):** weak hierarchy, inconsistent spacing, outdated
type, poor responsiveness, unclear interactions, weak accessibility,
inconsistent components, poor loading experiences, inappropriate or missing
motion, visual defects.

**Don't:** rewrite whole pages, replace the design system or component
library, or restyle screens outside the scope without justification — and
justification goes to AK as a proposal.

**Output:** targeted improvements that look like the same product at its
best. Update `DESIGN.md` when it exists; create it from the existing look
only for page-level scope and above (for smaller changes, offer it as a 🟢
proposal).

## Mode B — Modernize & transform

For outdated products AK wants substantially improved.

1. **Audit** the product and its design (discovery): the largest UX and
   visual weaknesses, ranked by user impact.
2. **Strategy:** a short modernization plan — what changes, what stays, in
   what order (state it in the reply; large programmes are phased and each
   phase is approved).
3. Improve information architecture and navigation where they cause real
   problems.
4. Establish a direction (art direction) and consistent tokens (design
   system), keeping recognisable brand assets unless AK says otherwise.
5. Upgrade hierarchy, interactions, responsive layouts, motion, loading and
   feedback states.
6. **Preserve** essential functionality, data, URLs and integrations;
   maintain technical compatibility (same framework unless approved).

**Output:** a visibly modern product that still does everything it did, a
new or rewritten `DESIGN.md`, and the plan for any phases not yet done.

## Mode C — Create & innovate

For new products.

1. Understand the product vision, audience and primary workflows.
2. Establish the visual direction and identity.
3. Create the information architecture.
4. Establish the design system (tokens, components, themes).
5. Define interactions, responsive behaviour and the motion language.
6. Implement the complete experience in the chosen stack.
7. Verify the result in the real rendered UI.

**Output:** a finished, distinctive product with its `DESIGN.md`, built to
the same standard as a mature product — every state, size and interaction
designed.

## Mode and scope together

| | Small change | Page | Redesign | Whole app | New product |
|---|---|---|---|---|---|
| A | fit the look | refine the page, or a new page within the identity | refine within identity | consistent upgrade | — |
| B | — (a small change in a dated app is Mode A + a 🟠 proposal) | modernize the page | new direction for named screens | phased modernization | — |
| C | — | — | — | — | full process |
