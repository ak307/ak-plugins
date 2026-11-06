# Blind quality scoring rubric

Used by an independent scorer that sees only screenshots and filmstrips of a
build — never the code, the skills, the run number or which version of the
skills produced it. Objective measurements (accessibility, errors, overflow,
design-system spread) come from `audit.cjs` and are scored separately; this
rubric covers what needs an eye.

Score each dimension 1–10 (10 = best-in-category, Apple/Linear/Stripe level;
7 = solid professional work; 5 = generic template; 3 = basic/unfinished).
Be demanding: polished-but-boring is 6 at most for visual design and layout.

| Dimension | What to judge |
|---|---|
| Visual design | typography (scale, character, rhythm), colour with conviction and contrast range, depth, craft of components, a hero moment, the three-second "wow" |
| Layout | composition from the content (not a template), hierarchy, alignment, proportion, density, balance; every section designed, not only the first |
| Functionality (as visible) | controls look and read as what they do; flows look complete; clear primary actions; nothing that looks broken or dead |
| Completeness | loading, empty, error, success and processing states designed (where screenshots show them) |
| Responsiveness | phone and tablet compositions designed for the size, not squeezed desktop |
| Motion | from filmstrips: purposeful, natural easing, spatial continuity, quick, nothing decorative or annoying, one memorable moment |
| Consistency | one design language across screens and states: shared components, spacing, radii, colours |
| Originality | belongs to this product, not a generic template; not the obvious layout for this kind of screen |

Overall = mean of the eight. Acceptance: overall ≥ 8.5, no dimension < 7, no
critical failure (something visibly broken, unreadable, or missing a core
state).

Return JSON only:

```json
{"build": "<label>", "scores": {"visual": 0, "layout": 0, "functionality": 0, "completeness": 0,
 "responsiveness": 0, "motion": 0, "consistency": 0, "originality": 0},
 "overall": 0.0, "critical_failures": ["..."], "top_issues": ["...", "...", "..."]}
```

When a dimension can't be judged from the material (e.g. no filmstrips),
score it `null` and say so in `top_issues`.
