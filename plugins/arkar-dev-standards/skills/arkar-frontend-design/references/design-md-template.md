# DESIGN.md template

Each project keeps its visual identity in `DESIGN.md` at the project root.
It is created when the identity is first designed and read before every later
UI change, so new screens stay consistent with the project while each project
remains unique. Keep it short (one or two screens of text) and update it when
the identity deliberately evolves.

Copy this structure:

```markdown
# Design identity — <project name>

## Concept
<Direction name>: <one sentence on what the product should feel like and why,
tied to its users and purpose>

Users and setting: <who, where, which devices>
Primary job: <the one thing the main screen makes effortless>
Tone: <three adjectives>

## Colour
| Token | Value | Use |
|---|---|---|
| --color-bg | #… | page background |
| --color-surface | #… | panels, cards |
| --color-ink | #… | main text |
| --color-ink-muted | #… | secondary text |
| --color-primary | #… | primary actions, focus |
| --color-accent | #… | signature element, highlights |
| --color-success / warning / danger | #… / #… / #… | states |

## Type
- Display: <family, weights> — <why>
- Text: <family, weights>
- Scale: <e.g. 13 / 15 / 18 / 24 / 32 / 48>
- Fonts are bundled in <path> (not linked from Google)

## Shape, space and depth
- Radius: <scale and where each is used>
- Spacing scale: <e.g. 4 / 8 / 12 / 16 / 24 / 32 / 48>
- Elevation: <levels and when>
- Grid / alignment: <rule>

## Signature elements
- <element>: <what it is, which screen, why it fits the concept>

## Motion
<character, durations, the one orchestrated moment; reduced-motion behaviour>

## Voice
<how labels, empty states and errors sound, with one example each>

## Directions considered
- <alternative 1>: <one line, why not chosen>
- <alternative 2>: <one line, why not chosen>
```

The "Directions considered" section stops a later session from "discovering"
the same rejected ideas again and records why the project looks the way it
does.
