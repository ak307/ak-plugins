# Frontend security checklist — the browser side

What the user's browser receives, stores, shows and sends. Everything here
is defence in depth: the server checks every request again (`backend.md`) —
hiding a button or validating a field in the browser never protects anything
on its own.

## Contents
1. Output and the DOM (XSS)
2. What the URL may carry
3. What the browser may store
4. Sign-in, reset and lockout screens
5. Sessions, tokens and CSRF
6. Forms and sensitive fields
7. Pages ready for a Content Security Policy
8. What ships in the build
9. Mock data and test switches
10. Third-party code
11. Quick checks per stack

## 1. Output and the DOM (XSS)

- Let the framework escape: Blade `{{ }}`, Django templates, JSX, Vue
  `{{ }}`. Every bypass is a finding unless the content is trusted HTML:
  Blade `{!! !!}`, Django `|safe`, React `dangerouslySetInnerHTML`, Vue
  `v-html`, Alpine `x-html`, plain JS `innerHTML` / `insertAdjacentHTML` /
  `outerHTML` / `document.write`.
- Plain JS: set text with `textContent`; build markup with a tagged template
  that escapes every value by default (raw HTML only through an explicit,
  named helper used on trusted strings).
- User-entered rich text: sanitise with DOMPurify before showing it (and
  server-side before storing — `backend.md` §6).
- Links from data: only `http(s):` or relative URLs in `href`/`src` — never
  `javascript:`; `rel="noopener noreferrer"` on `target="_blank"`.
- Never `eval`, `new Function`, or `setTimeout("string")`.

## 2. What the URL may carry

URLs end up in browser history, server and proxy logs, analytics, and the
`Referer` header sent to other sites.

- Allowed: record IDs, filters, sort, tab, page, search terms that aren't
  personal ("status=overdue").
- Never: names, emails, phone numbers, NRIC/FIN, amounts tied to a person,
  tokens, reset links' secrets after use, session IDs.
- A search box that may hold a person's name: keep its text out of the URL
  (or keep only "a search is active").

## 3. What the browser may store

`localStorage`, `sessionStorage`, IndexedDB and cookies readable by JS are
readable by any script on the page and stay on shared computers (reception
desks, site offices).

- Never store: passwords, tokens or session IDs (cookies `HttpOnly` instead),
  NRIC/FIN, bank or card details, salaries, medical details.
- Drafts of forms with personal data: `sessionStorage` (gone when the tab
  closes) — or don't keep them; ordinary drafts may use `localStorage`.
- Clear app storage on sign-out.
- Per-viewer conveniences (a collapsed panel, last tab) are fine.

## 4. Sign-in, reset and lockout screens

These screens are the one place where helpful, specific error messages are
wrong, because they tell an attacker which accounts exist.

- Sign-in failure: "That email and password don't match." — never "no
  account with that email" or "wrong password".
- Password reset request: always "If an account exists for that email, we've
  sent a link." — the same message and the same timing either way.
- Lockout: say what the user can do and when ("Try again in 15 minutes, or
  reset your password") without confirming the account exists.
- Two-factor: "That code didn't work" with attempts left is fine (the user
  is already identified by the password step).
- Show/hide password toggle and paste allowed; never block password managers.

## 5. Sessions, tokens and CSRF

- Session-based apps (Laravel, Django): cookie sessions, `HttpOnly`,
  `Secure`, `SameSite=Lax`; CSRF token on every state-changing form and
  `fetch` (`@csrf`, the `X-CSRF-TOKEN` / `X-CSRFToken` header).
- SPA or mobile tokens: never in `localStorage`; prefer the session cookie
  (Sanctum SPA mode); short-lived access tokens kept in memory.
- Sign-out ends the session on the server, not only in the browser.
- Idle timeout warns before it happens and keeps the user's draft.

## 6. Forms and sensitive fields

- Browser validation is for the user's convenience; the server validates
  every field again.
- `autocomplete`: `current-password` / `new-password` /
  `one-time-code` / `username`; sensitive fields that shouldn't be
  remembered (NRIC on a shared PC) `autocomplete="off"`.
- Mask on screen where the full value isn't needed (`S****567A`), with
  "show" for the owner when needed.
- Never put sensitive values in `console.log`, error reports or analytics.
- File inputs: `accept` narrows the picker only — the server checks type
  and size.

## 7. Pages ready for a Content Security Policy

So a CSP can be switched on (report-only first — `vapt-checklist.md`)
without breaking the page:

- No inline event handlers (`onclick=`, `onload=`) and no inline `<script>`
  blocks with logic — attach handlers in JS files.
- No `eval`-style code (section 1); no `javascript:` URLs.
- Styles in stylesheets; computed styles set from JS (`element.style.x`) are
  fine.
- Fonts, scripts and images served from the app itself where possible.

## 8. What ships in the build

- No secrets, API keys or internal URLs in front-end code or env variables
  exposed to the browser (`VITE_*`, `NEXT_PUBLIC_*`, `MIX_*` are public).
- Production builds: source maps off or not served publicly, debug logging
  stripped, debug toolbars and dev routes off.
- Error pages and toasts show a friendly message and a reference — never a
  stack trace or SQL.

## 9. Mock data and test switches

- The mock layer and its switches (`?fail=1`, `?latency=slow`, a "reset demo"
  menu) run only in local or development builds — gated on
  `import.meta.env.DEV`, the app environment, or a local hostname — and are
  removed when the real API is wired in.
- Mock data is invented: never real names, NRIC or contact details.

## 10. Third-party code

- Prefer bundling packages over loading scripts from a CDN; when a CDN is
  used, pin the exact version and add `integrity` (SRI) and
  `crossorigin="anonymous"`.
- Every package added is a dependency to audit (`scanners.md`).
- Embeds (maps, video, chat widgets) only where needed; they can see the
  page.

## 11. Quick checks per stack

| Stack | Look for |
|---|---|
| Blade / Livewire | `{!! !!}` with data; forms without `@csrf`; public properties holding data the user mustn't see (Livewire properties are sent to the browser) — use `#[Locked]` for IDs the client mustn't change, and authorise in every action |
| Inertia / React | `dangerouslySetInnerHTML`; props carrying whole models (`backend.md` §5); tokens in `localStorage` |
| Vue / Alpine | `v-html`, `x-html` with data |
| Plain JS | `innerHTML` with data; inline handlers; mock switches not gated |
| Django templates / htmx | `|safe`, `mark_safe`; `hx-` requests without the CSRF header |

`scripts/security-check.cjs` checks the running local page for most of
sections 2, 3, 7, 8 and 10, plus the VAPT header and cookie findings.
