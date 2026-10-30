# Browser tools for visual QA

Use the first option that works in the current session. Check what's
available by looking at your tool list (tool names below).

## Contents
1. Claude in Chrome
2. Playwright MCP
3. Playwright screenshot script (always works if Node is installed)
4. Starting the app per stack
5. When nothing works

## 1. Claude in Chrome — `mcp__claude-in-chrome__*`

Available when Claude Code was started with `claude --chrome` or Chrome was
set to "Enabled by default" in `/chrome`, and the Chrome extension is
connected.

- Open a new tab for the app; don't reuse the user's tabs.
- Screenshots and clicks work on the real page with the user's sign-ins — so
  only open `localhost` / `127.0.0.1` URLs, never a production or staging site.
- Read the console with the console tool (filter with a pattern to keep it short).
- **Viewport sizes:** use the window-resize tool if it is offered. If exact
  sizes can't be set, use it for interaction testing and use the screenshot
  script (section 3) for the three viewport screenshots.
- Never click something that opens a JavaScript `alert`/`confirm` dialog — it
  blocks the browser tools until the user closes it.

## 2. Playwright MCP — `mcp__playwright__*`

Available if AK added it once with:

```
claude mcp add --scope user playwright -- npx @playwright/mcp@0.0.83
```

Use its navigate, click, type, screenshot, resize and console tools. Resize
to each of the three viewports before taking screenshots.

## 3. Playwright screenshot script

`scripts/screenshot.cjs` in this skill takes the three viewport screenshots of
one URL and reports console errors, failed requests, HTTP errors and
horizontal overflow.

```
node "<skill folder>/scripts/screenshot.cjs" http://localhost:8000/leave-requests qa-screenshots
```

- Custom target screens: add `--sizes=1280x800,1920x1080` (name each by its
  width). Default is 375×812, 768×1024 and 1440×900.
- Run it from the project folder. It uses the project's Playwright if present,
  otherwise a global one.
- If Playwright is missing, install it once per computer, outside any
  project (so no project files or install scripts change):
  `npm install --prefix ~/.arkar/playwright playwright` then
  `npx --prefix ~/.arkar/playwright playwright install chromium`. The script
  finds it there. Don't add it to `package.json` unless the project already
  uses Playwright.
- Then **look at each PNG** with the Read tool — the script only finds
  machine-detectable problems; layout and design problems need your eyes.
- Save screenshots in a `qa-screenshots/` folder and make sure it's in
  `.gitignore` (add it if not).
- For a page behind login, write a short Playwright script for that flow
  (log in, then visit the page at each viewport), or use the app's test login.

## 4. Starting the app per stack

Start servers in the background so you can keep working, and stop them when
done.

| Stack | Start | Usual URL |
|---|---|---|
| Laravel + Inertia | `php artisan serve` + `npm run dev` (not `composer run dev`: it also starts a queue worker) | http://127.0.0.1:8000 |
| Django | `uv run python manage.py runserver` | http://127.0.0.1:8000 |
| Django agentic (ASGI) | `uv run uvicorn config.asgi:application --reload` | http://127.0.0.1:8000 |
| FastAPI with a frontend | `uv run fastapi dev` | http://127.0.0.1:8000 |
| Vite / React / Vue | `npm run dev` | http://localhost:5173 |
| Flutter web | `flutter run -d web-server --web-port 8080` | http://localhost:8080 |
| Static HTML | `python -m http.server 8080` | http://localhost:8080 |

Only after Rule 0 confirms the app points at local or test data. Never start
queue workers (`queue:work`, `queue:listen`, `qcluster`, Celery), schedulers
or `composer run dev` for QA — on a shared queue they take live jobs.

If the app needs a database or service that isn't running, try the project's
own way of starting it locally (Docker Compose, SQLite for local). Run seeders
only against a database you've confirmed is local. If it still can't run,
say so in the final message.

## 5. When nothing works

If no browser tool works and Playwright can't be installed (e.g. no network),
do every check you still can (build, tests, reading the markup and CSS for the
responsive rules), and state clearly in the final message that the UI was
**not** visually inspected and why. Suggest how AK can enable a browser:
`claude --chrome`, or the Playwright MCP command above.
