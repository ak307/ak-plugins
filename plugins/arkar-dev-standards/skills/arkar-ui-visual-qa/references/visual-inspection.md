# Visual inspection

## Contents
1. Tools
2. Starting the app per stack
3. What to look for in screenshots
4. When nothing works

## 1. Tools — use the first that works

**Claude in Chrome** (`mcp__claude-in-chrome__*`): AK's own Chrome. Open a
new tab; only local addresses (`localhost`, `127.0.0.1`, `*.test`); read the console with a filter
pattern; resize the window if offered (otherwise use the script for exact
sizes); never trigger `alert`/`confirm` dialogs.

**Playwright MCP** (`mcp__playwright__*`), if configured
(`claude mcp add --scope user playwright -- npx @playwright/mcp@latest`;
pin a version if the team prefers):
navigate, click, type, resize, screenshot, console.

**The bundled script** — `scripts/screenshot.cjs` in this skill:

```
node "<skill folder>/scripts/screenshot.cjs" http://localhost:8000/claims qa-screenshots
```

- Screenshots at 375×812, 768×1024, 1440×900 by default; `--sizes=1280x800,1920x1080`
  for the project's target screens; `--full-page` for long pages.
- Reports console errors, failed requests, HTTP errors and horizontal
  overflow.
- `--motion`: at the largest size, reports the animations that run on load
  and while scrolling (and what they animate), saves a frame taken
  mid-entrance (`*-motion-early.png`), repeats with reduced motion on, and
  lists text left invisible.
- Run it from the project folder (uses the project's Playwright, or a global
  one). If Playwright is missing, install it once outside any project:
  `npm install --prefix ~/.arkar/playwright playwright` then
  `npx --prefix ~/.arkar/playwright playwright install chromium`.
- Saves to `qa-screenshots/` and writes a `.gitignore` there so screenshots
  are never committed; **look at each PNG** — the script only finds
  machine-detectable problems.
- Pages behind login: a short Playwright script that logs in with local test
  credentials, then visits each size.

**The interaction probe** — `scripts/interaction-probe.cjs` in this skill,
for the premium pass:

```
node "<skill folder>/scripts/interaction-probe.cjs" http://localhost:8000/claims qa-screenshots/probe --size=1440x900
```

- Lists every interactive element and reports those with **no hover
  feedback**, **no visible keyboard focus**, **no transition**, **no pointer
  cursor**, or **smaller than 24×24**.
- Clicks safe, same-page controls (never anything that looks destructive or
  sends data, never other pages) and saves a frame ~60 ms after the click
  and one after it settles, noting animations, loading UI, dialogs and live
  messages — so you can judge whether each click feels responsive and
  polished.
- Run it again at a phone size (`--size=375x812`). Look at the frames; the
  numbers only point at where to look.

## 2. Starting the app per stack

Only after confirming it points at local/test data. Start servers in the
background and stop them when done.

| Stack | Start | Usual URL |
|---|---|---|
| Laravel + Inertia/Vite | `php artisan serve` + `npm run dev` (not `composer run dev` — it starts a queue worker) | http://127.0.0.1:8000 |
| Django | `uv run python manage.py runserver` | http://127.0.0.1:8000 |
| FastAPI with a frontend | `uv run fastapi dev` | http://127.0.0.1:8000 |
| Vite / React / Vue / Svelte | `npm run dev` | http://localhost:5173 |
| Next.js / Nuxt | `npm run dev` | http://localhost:3000 |
| Angular | `npm start` / `ng serve` | http://localhost:4200 |
| Astro | `npm run dev` | http://localhost:4321 |
| Flutter web | `flutter run -d web-server --web-port 8080` | http://localhost:8080 |
| Static HTML | `python3 -m http.server 8080` | http://localhost:8080 |

## 3. What to look for in screenshots

- Horizontal scroll or content cut off at the right edge on mobile.
- Text overlapping, truncated without access to the full text, or wrapping
  one word per line.
- Weak hierarchy: nothing stands out, or everything does.
- Spacing off the scale; misaligned edges; buttons of different heights side
  by side; icons misaligned with text.
- Huge empty areas on desktop or cramped edges on mobile.
- Default browser styles leaking (unstyled `select`, blue links in a styled
  UI); the library's stock look instead of the product's tokens.
- Generic design: identical cards everywhere, decorative gradients/glows,
  the "basic form" look — against the anti-generic rules.
- Images stretched, pixelated or missing; layout jumping as content loads.
- Modals taller than the viewport without scrolling; sticky headers covering
  content or focused elements.
- Focus ring missing; contrast too low; emoji used as icons; mixed icon
  styles; random shadows.
- Text clipped at 200% zoom; tall scripts (Burmese) clipped.
- Does it express the direction in `DESIGN.md`? Does the signature idea read
  clearly where it's used, at every size?

## 4. When nothing works

Do every check you still can (build, tests, reading markup and styles for
the responsive rules) and state clearly that the UI was **not** visually
inspected and why; suggest how AK can enable a browser (`claude --chrome`,
or the Playwright MCP command).
