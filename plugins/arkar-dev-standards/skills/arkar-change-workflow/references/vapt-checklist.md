# VAPT checklist — what OWASP ZAP scans usually flag

Basic hardening so CBM apps pass VAPT scans. Check the items that relate to
the change (a new route, page, cookie, upload, dependency…). Findings on
existing configuration are proposals with the label shown — some "simple"
headers can break pages.

## Contents
1. Findings and fixes
2. Where to set headers per stack
3. Notes on labels

## 1. Findings and fixes

| ZAP finding (alert name) | Fix | Default label |
|---|---|---|
| X-Content-Type-Options Header Missing | `X-Content-Type-Options: nosniff` | 🟢 |
| Missing Anti-clickjacking Header | `X-Frame-Options: DENY` (or `SAMEORIGIN`) / CSP `frame-ancestors 'self'` | 🟢 unless the app is embedded in an iframe elsewhere → 🟠 |
| Strict-Transport-Security Header Not Set | `Strict-Transport-Security: max-age=31536000` (start without `includeSubDomains`) | 🟢 if the site is HTTPS-only; 🟠 otherwise |
| Content Security Policy (CSP) Header Not Set | Start with `Content-Security-Policy-Report-Only`, then enforce once clean | Report-Only 🟢; enforced CSP 🟠 (can break inline scripts/styles, CDNs) |
| Permissions Policy Header Not Set | `Permissions-Policy: camera=(), microphone=(), geolocation=()` (allow what the app uses) | 🟢 if the app doesn't use those features |
| Server Leaks Version Information ("Server" header) | Hide version in the web server (nginx `server_tokens off`, IIS remove header, Apache `ServerTokens Prod`) | 🟢 |
| Server Leaks Information via "X-Powered-By" | PHP `expose_php = Off`; IIS remove `X-Powered-By`; Express `app.disable('x-powered-by')` | 🟢 |
| Cookie No HttpOnly Flag | Session/auth cookies `HttpOnly` | 🟢 for session cookies; 🟠 for cookies front-end JS reads |
| Cookie Without Secure Flag | `Secure` on all cookies over HTTPS | 🟢 if HTTPS-only |
| Cookie without SameSite Attribute | `SameSite=Lax` | 🟢 (🟠 if the app relies on cross-site POSTs, e.g. SSO callbacks) |
| Absence of Anti-CSRF Tokens | Framework CSRF on every state-changing form (`@csrf`, `{% csrf_token %}`) | 🟢 for forms that should have it; 🟠 if it changes how an external system posts |
| Application Error Disclosure / Information Disclosure – Debug Error Messages | `APP_DEBUG=false`, Django `DEBUG=False`, generic error pages | 🟢 |
| Vulnerable JS Library | Update the library (patch/minor) or remove it | patch/minor 🟢, major 🟠 |
| Cross-Domain Misconfiguration (CORS `*`) | Explicit allowed origins | 🟠 (other sites calling the API may break) |
| Directory Browsing | Disable autoindex/directory listing | 🟢 |
| Hidden File Found (`.env`, `.git`, backups) | Serve only the `public/` (or static) folder; block dotfiles; remove backups from web root | 🟢 |
| Re-examine Cache-control Directives (authenticated pages) | `Cache-Control: no-store` on pages with personal data | 🟢 |
| Private IP Disclosure / Suspicious Comments / Timestamp Disclosure | Remove internal IPs and sensitive comments from responses; timestamps are usually false positives | 🟢 / note |
| Cross Site Scripting (Reflected/Persistent), SQL Injection (active scan) | See `review-checklist.md` sections 2–3 | 🟢 when the fix only escapes/parameterises |
| Session ID in URL Rewrite | Cookie-only sessions | 🟢 |

## 2. Where to set headers per stack

Prefer setting headers in one place. If the web server already sets them,
don't duplicate in the app.

- **Laravel:** a `SecurityHeaders` middleware appended in `bootstrap/app.php`
  (`$middleware->append(...)`); session cookie flags in `config/session.php`
  (`secure`, `http_only`, `same_site`) via `.env` (`SESSION_SECURE_COOKIE=true`).
- **Django:** `SecurityMiddleware` settings — `SECURE_CONTENT_TYPE_NOSNIFF`,
  `X_FRAME_OPTIONS`, `SECURE_HSTS_SECONDS`, `SESSION_COOKIE_SECURE`,
  `CSRF_COOKIE_SECURE`, `SECURE_PROXY_SSL_HEADER`; Django 6 `SECURE_CSP`.
  Verify with `manage.py check --deploy`.
- **FastAPI:** a small middleware adding the headers; `TrustedHostMiddleware`;
  explicit `CORSMiddleware` origins.
- **IIS (Windows servers):** `web.config` → `<httpProtocol><customHeaders>`
  add headers, remove `X-Powered-By`; `<security><requestFiltering removeServerHeader="true">`.
- **nginx:** `add_header ... always;` in the server block, `server_tokens off;`.

## 3. Notes on labels

- A label is a default. Check the actual app: if a header could stop a page,
  an embed, an integration or a mobile app from working, it's 🟠.
- When unsure, propose the safer staged option (e.g. CSP report-only first).
- Configuration that lives on the server (IIS/nginx) rather than in the repo:
  propose the exact snippet for AK to apply — don't claim it was applied.
