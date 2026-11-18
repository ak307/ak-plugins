# VAPT checklist — what a vendor's scan and manual test report

A VAPT is a vendor's automated scan plus a manual penetration test. We don't
know the vendor's tools, and each tool words the same weakness differently, so
this list goes by **what must be true** — whatever the tool, the language or
the framework. Use the rows that relate to the change; before a test, walk all
of them (`vapt-readiness.md`); with the vendor's report in hand, see
`vapt-report.md`.

## Contents
1. How to apply a row in any stack
2. Transport and web server
3. Response headers
4. Cookies and sessions
5. Sign-in and accounts
6. Access control
7. Injection and input
8. Exposure
9. Components
10. APIs
11. Logging
12. Labels and where each row is checked

## 1. How to apply a row in any stack

The rows say what must be true. How it is done is the stack's business, and
you work that out each time:

1. **Know the stack first** — read the manifests and configuration; the
   language, framework and version decide the mechanism.
2. **Use the stack's own mechanism** — the framework's middleware, setting or
   built-in function; where the framework has none, a maintained library.
   When unsure which it is or how it behaves in this version, read the
   framework's current security documentation (search for it) rather than
   going from memory. Never hand-write password hashing, session handling,
   CSRF tokens, encryption or HTML sanitising when either exists — and if
   neither does, say so in the plan.
3. **Set a control once, at the outermost layer the project owns** — the web
   server or platform, else one app-wide middleware or setting; never route by
   route, and never twice.
4. **Existing behaviour is AK's** — a row that changes how an existing app
   behaves is a proposal with its label (section 12), not a change.
5. **Outside the repo is AK's too** — server, proxy and platform settings are
   written as exact steps for him (`vapt-readiness.md` has the server
   checklist), never reported as done.

Columns: what reports call it · what must be true · default label · checked by.

## 2. Transport and web server

| Reported as | What must be true | Label | Checked by |
|---|---|---|---|
| Site reachable over HTTP; no redirect to HTTPS | Every HTTP request is redirected to HTTPS; nothing else is served over HTTP | 🟢 | server |
| Weak TLS (SSL 3, TLS 1.0/1.1), weak ciphers, certificate problems | TLS 1.2 or newer only, modern ciphers, a valid certificate chain | 🟢; 🟠 if old devices or clients still connect | server |
| HSTS missing | `Strict-Transport-Security` with a long `max-age` on the HTTPS site (add `includeSubDomains` only when every subdomain is HTTPS) | 🟢 if HTTPS-only | page check, server |
| Server or framework version disclosed (`Server`, `X-Powered-By`, generator tags) | No product versions in headers or pages | 🟢 | page check |
| TRACE or other unneeded HTTP methods enabled | Only the methods the app uses are answered; TRACE is off | 🟢 | readiness |
| Directory listing | A folder never lists its files | 🟢 | server |
| Default or sample content (server default page, info pages, examples) | Removed | 🟢 | readiness, server |
| Host header injection; password-reset poisoning | The app answers only its own host names; links in emails and redirects are built from configuration, not from the request's `Host` | 🟢; 🟠 if several host names are in use | review |

## 3. Response headers

| Reported as | What must be true | Label | Checked by |
|---|---|---|---|
| `X-Content-Type-Options` missing | `nosniff` on every response | 🟢 | page check |
| Clickjacking; `X-Frame-Options` missing | Other sites can't frame the app: CSP `frame-ancestors` (or `X-Frame-Options`) | 🟢; 🟠 if the app is embedded elsewhere | page check |
| Content-Security-Policy missing | A CSP exists — report-only first, enforced once clean | report-only 🟢; enforced 🟠 | page check |
| CSP weak (`unsafe-inline`, `unsafe-eval`, wildcards) | Scripts only from named sources; inline code through a nonce or hash | 🟠 | page check |
| `Referrer-Policy` missing | `strict-origin-when-cross-origin` or stricter | 🟢 | page check |
| `Permissions-Policy` missing | Browser features the app doesn't use are switched off | 🟢 | page check |
| Sensitive page cacheable; data shown after sign-out with the Back button | Pages with a signed-in user's data send `Cache-Control: no-store` | 🟢 | page check |
| CORS misconfiguration | Cross-origin access only for named origins — never the caller's origin echoed back, never `*` with credentials | 🟠 | readiness |
| Cross-origin isolation headers missing (COOP, CORP) | `Cross-Origin-Opener-Policy: same-origin` unless the app uses cross-origin pop-ups (single sign-on) | 🟢; 🟠 with pop-up sign-in | review |
| `X-XSS-Protection` missing | Nothing to add: the header is deprecated and the old filter caused its own problems — the CSP is the answer | dispute (`vapt-report.md`) | — |

## 4. Cookies and sessions

| Reported as | What must be true | Label | Checked by |
|---|---|---|---|
| Cookie without `Secure`, `HttpOnly` or `SameSite` | The session cookie has all three (`SameSite=Lax` or stricter); nothing sensitive in a cookie scripts can read | 🟢; 🟠 if the app relies on cross-site posts | page check |
| Session fixation; session token not changed after login | A new session ID is issued at sign-in and whenever the user's rights change | 🟢 | tests, review |
| Session does not expire; timeout too long | An idle timeout and a maximum lifetime are set in configuration, to values AK agreed (propose 30 minutes idle for apps with personal data when he has given none) | new 🟢; existing 🟠 | review |
| Session valid after logout | Sign-out ends the session on the server; a password change or reset ends the user's other sessions | 🟢 | tests |
| Session ID in the URL | Sessions travel in cookies only | 🟢 | page check |
| Cookie scoped to the parent domain | Host-only cookies unless subdomains really share the sign-in | 🟠 | review |
| Concurrent sessions allowed | AK's decision — usually an accepted risk for business apps | accept or 🟠 | — |

## 5. Sign-in and accounts

| Reported as | What must be true | Label | Checked by |
|---|---|---|---|
| User enumeration (sign-in, reset, registration) | The same message, status and timing whether or not the account exists | 🟢 | tests, review |
| No brute-force protection, lockout or rate limit | Attempts are limited per account and per client, behaving the same for unknown accounts | new 🟢; existing 🟠 (it can lock real users out) | tests |
| Weak password policy | The organisation's rule when AK gives one; otherwise length first (at least 12 characters), and the framework's check against common or breached passwords where it has one — no forced periodic change | new 🟢; existing users 🟠 | review |
| Weak password reset | Token is random, single-use, short-lived and tied to the account; the link's host comes from configuration; other sessions end | 🟢 | tests, review |
| Sensitive action without re-authentication | Changing the password, email or second factor asks for the current password or a fresh sign-in | new 🟢; existing 🟠 | review |
| No second factor for administrators | Admin and back-office accounts have one | 🟠 | review |
| Default or test accounts; default credentials | No account with a known password reaches production; seeded users are for local and test only | 🟢 | review |
| OTP brute force; email or SMS flooding | Codes are single-use, short-lived and attempt-limited; sending is limited per account and per client | new 🟢; existing 🟠 | tests |
| Credentials sent in the URL | Credentials travel only in request bodies, over HTTPS | 🟢 | page check |

## 6. Access control

The findings a scanner can't make and a tester always looks for.

| Reported as | What must be true | Label | Checked by |
|---|---|---|---|
| IDOR; broken object-level authorisation | Every read and write checks that **this** user may act on **this** record | 🟢 when it only refuses other people's records | tests: owner, another user, not signed in |
| Privilege escalation; forced browsing; missing function-level access control | Every route has an explicit rule on the server; a typed-in admin URL refuses an ordinary user | 🟢 the same way | tests, the framework's route listing |
| Mass assignment; parameter tampering | Only named fields are accepted; role, owner, price and status never come from the client | 🟢 | tests, review |
| Business-logic flaws (workflow bypass, double submit, negative amounts) | A status change checks the current state and the user's right in one transaction; amounts are validated on the server | case by case | tests |
| Excessive data exposure | A response carries only the fields its screen or caller needs | 🟠 if another system reads the extra fields | review |

## 7. Injection and input

| Reported as | What must be true | Label | Checked by |
|---|---|---|---|
| SQL injection | Parameterised queries only — also for sort and column names (allow-list) | 🟢 | review, code scan |
| Cross-site scripting (reflected, stored, DOM); HTML injection | The template engine escapes all output; rich text is sanitised to an allow-list | 🟢 | review, code scan |
| OS command injection | No shell: commands run with an argument list, values from an allow-list | 🟢 | review, code scan |
| Server-side template injection | User input is never template source | 🟢 | review |
| Header or CRLF injection; email header injection | User input reaches headers only through the framework's redirect, cookie and mail functions | 🟢 | review |
| XML external entities (XXE) | XML parsers have external entities switched off | 🟢 | review |
| Insecure deserialisation | Untrusted data is never read with the language's native object format — JSON with validation instead | 🟢; 🟠 if a stored format changes | review, code scan |
| Path traversal; local file inclusion | File paths are never built from input: an ID maps to a stored path | 🟢 | review |
| Open redirect | Redirects go only to internal paths or allow-listed hosts | 🟢 | review |
| Server-side request forgery (SSRF) | Outbound requests to user-supplied addresses use an allow-list and refuse internal addresses | 🟢; 🟠 if hosts must be agreed | review |
| CSV or formula injection | Exported cells that start with `=`, `+`, `-`, `@`, tab or return are neutralised | 🟢 | review |
| Unrestricted file upload | Type checked by content and an extension allow-list, size limited, stored outside the web-served folder under a generated name; HTML and SVG uploads are never shown from the app's own origin | new 🟢; existing 🟠 if a file type gets refused | tests, review |
| Missing input validation; oversized input | Type, length and format limits at the boundary; a request body size limit | 🟢 | review |

## 8. Exposure

| Reported as | What must be true | Label | Checked by |
|---|---|---|---|
| Verbose errors; stack traces; debug mode on | Every error status shows a plain page; debug is off outside local development | 🟢 | readiness |
| Debug, admin or monitoring tools reachable; API documentation public | Off, or behind sign-in, in production — switched by the environment | 🟢 | readiness with `--paths` |
| Sensitive files served (environment files, version-control folders, backups, logs, manifests) | Only the public folder is served; dotfiles are refused | 🟢 | page check, readiness |
| Source maps, comments, internal addresses in responses | Not in production responses | 🟢 | page check |
| Secrets in client code or the repository | None — a real one that leaked is rotated by AK | 🟢 | secret scan |
| Personal data in the URL or browser storage | Never (`frontend.md` §2–3) | 🟢 | page check |
| Password field with autocomplete enabled | Keep password managers working (`autocomplete="current-password"` / `"new-password"`); `off` only for one-time codes and shared-terminal fields | dispute (`vapt-report.md`) | — |

## 9. Components

| Reported as | What must be true | Label | Checked by |
|---|---|---|---|
| Vulnerable or outdated dependency | No version with a known vulnerability — checked with the ecosystem's own audit against the live database, never from memory | patch or minor 🟢; major 🟠 | audit (`scanners.md`) |
| Vulnerable JavaScript library | The same for libraries copied into the project by hand, which no package audit sees | patch or minor 🟢; major 🟠 | readiness lists them with versions |
| Unsupported (end-of-life) framework, runtime or server | Versions still receiving security fixes — look the support dates up; if an upgrade can't happen now, a dated plan AK accepts | 🟠 | review |

## 10. APIs

| Reported as | What must be true | Label | Checked by |
|---|---|---|---|
| Unauthenticated or weakly authenticated endpoint | Every endpoint has an explicit rule; tokens are verified (signature, expiry, audience) on every request | 🟢 when it only refuses unauthenticated calls | tests |
| No rate limiting; unlimited results or payloads | Page size and body size are capped; expensive endpoints are limited | new 🟢; existing 🟠 | tests |
| JWT weaknesses | A fixed algorithm (never `none`), a strong key from configuration, a short lifetime, and a way to revoke | 🟠 | review |
| Verbose API errors; API documentation public | As section 8 | 🟢 | readiness |

## 11. Logging

| Reported as | What must be true | Label | Checked by |
|---|---|---|---|
| Insufficient logging and monitoring | Failed sign-ins, refused permissions and admin actions are logged — without passwords, tokens or full personal data | 🟢 | review |
| Log injection | User input can't forge log lines (structured logging, or line breaks removed) | 🟢 | review |

## 12. Labels and where each row is checked

- **A label is a default.** 🟢 means no behaviour change for legitimate
  users; if in this app the control could stop a page, an embed, an
  integration, an old device or a real user from working, it is 🟠. When
  unsure, propose the staged option (a report-only CSP, a limit set high).
- **dispute** and **accept** are answers to the vendor, decided by AK
  (`vapt-report.md`).
- **page check** — `scripts/security-check.cjs` on a local page, after any
  change users can see.
- **readiness** — the same script with `--readiness`, once before a test.
- **code scan** — its `--code=<folder>` list of lines to review.
- **review** — reading the code against `backend.md` and `frontend.md`.
- **tests** — the security tests of `arkar-testing`.
- **audit** — the dependency audit and secret scan in `scanners.md`.
- **server** — AK's server checklist in `vapt-readiness.md`.

Related standards, for mapping a vendor's categories: sections 6 and 10 are
OWASP Top 10:2025 A01 (broken access control); 2, 3 and 8 are A02 (security
misconfiguration); 9 is A03 (software supply chain); 2 and 4 touch A04
(cryptographic failures); 7 is A05 (injection); 5 is A07 (authentication
failures); 11 is A09 (logging and alerting); error handling in 8 is A10.
