# Existing UI analysis

Look at the real rendered UI when it can run safely (local or test data —
see `arkar-ui-visual-qa`); otherwise read the templates and styles and say
the analysis is from code only.

## 1. Identity inventory

- Logo and brand marks; where they appear.
- Colours actually used (collect them from CSS/tokens — note one-off hex
  values) and which carry meaning (primary action, status, brand).
- Typefaces, sizes and weights in use; is there a scale?
- Spacing, radius, shadow and border patterns; consistent or ad hoc?
- Icon family and style; imagery and illustration style.
- Voice: how labels, buttons, empty states and errors are worded.
- Motion: what moves today, and whether it helps.

Decide for each: **keep** (a real asset), **refine** (right idea, poor
execution), or **replace** (harmful or generic) — replacements beyond the
request are proposals.

## 2. Heuristic review

Check the screens in scope against these, noting the specific element and
the user impact:

| Area | Questions |
|---|---|
| Hierarchy | Is the primary job obvious in a few seconds? Does anything compete with it? |
| Navigation and IA | Can users tell where they are and get where they need to go? Are labels in their language? |
| Consistency | Do the same things look and behave the same everywhere? |
| Feedback and states | Does every action respond? Are loading, empty, error and success states designed? |
| Forms | Visible labels, clear validation, sensible defaults, no lost input? |
| Data display | Tables and charts readable, aligned, scannable; units shown? |
| Responsiveness | What breaks at 375, 768, 1440 (or the real target screens)? |
| Accessibility | Contrast, keyboard, visible focus, labels, headings, reduced motion |
| Motion | Purposeful, consistent, fast enough — or missing, gratuitous or janky? |
| Performance feel | Layout shifts, slow first paint, heavy images, blocking spinners |

## 3. Rank

Order problems by user impact (blocks a task > slows a frequent task >
causes errors > looks inconsistent > cosmetic). The top three or five drive
the work; the rest are listed briefly or dropped.
