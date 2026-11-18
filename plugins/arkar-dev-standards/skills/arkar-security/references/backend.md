# Backend security checklist — server-side code

Basic, solid practice (OWASP Top 10 basics), organised by what the code does.
The server is where security is enforced: anything the browser or app checks
is convenience and is checked again here. Use it while writing new code and
when reviewing a change and the code paths it touches; the browser side is
`frontend.md`, mobile apps `mobile.md`. Each item says what must be true; the
frameworks named are examples of how it is done there. In any other language
or framework the item holds just the same — find that stack's own mechanism
(`vapt-checklist.md` section 1).

## Contents
1. Input and validation
2. Database access and other interpreters (injection)
3. Output (XSS) and templates
4. Authentication and sessions
5. Authorisation (who may do what)
6. Files: uploads, downloads, paths
7. External calls, redirects, SSRF
8. Secrets and configuration
9. Errors and logging
10. Personal data (PDPA / NRIC)
11. Dependencies
12. LLM and agent features

## 1. Input and validation

- Validate every input at the boundary: type, length, format, allowed values.
  Laravel: FormRequest `rules()`. Django: forms / Ninja schemas. FastAPI:
  Pydantic models with constraints (`Field(max_length=…)`, `Literal[...]`).
- Allow-lists over block-lists, especially for sort columns, file types,
  redirect targets, status values.
- Mass assignment: Laravel — only `$request->validated()` into
  `create()/update()`, never `$request->all()`; Django — explicit form fields;
  FastAPI — separate Create/Update schemas without `id`, `role`, `is_admin`.
- Limits: a maximum length on every text field, a request body size limit,
  a cap on page size and on the rows of an import.

## 2. Database access and other interpreters (injection)

- ORM or parameterised queries only. Never build SQL with string formatting,
  f-strings, `+` or `%` from any input — including sort/order and column names.
  - Laravel: Eloquent / query builder bindings; `whereRaw('x = ?', [$v])`; no
    `DB::raw("... $var")`.
  - Django: ORM; `raw()`/`cursor.execute()` only with params `[...]`.
  - SQLAlchemy: `select()` / `text("... :name")` with params.
- `ORDER BY` from user input → map to an allow-listed column.
- **Operating-system commands:** no shell. Run the program through the
  process API with an argument list, and take the program and its options
  from an allow-list — never a command string built from input.
- **Templates:** input is data handed to a template, never the template's
  source or its name.
- **Native object formats** (PHP `unserialize`, Python `pickle`, Java
  serialisation, a YAML loader that builds objects): never on data a user or
  another system could have changed — JSON with validation instead.
- **Headers:** input reaches response headers, redirects, cookies and email
  headers only through the framework's own functions, which refuse line
  breaks.

## 3. Output (XSS) and templates

- Rely on auto-escaping: Blade `{{ }}`, Django templates, React JSX. Treat
  every bypass as a finding unless the content is trusted HTML:
  Blade `{!! !!}`, Django `|safe` / `mark_safe`, React `dangerouslySetInnerHTML`,
  `innerHTML` in plain JS (use `textContent`).
- URLs from users in `href`/`src`: only `http(s)` schemes (no `javascript:`).
- JSON embedded in pages: `@json()` in Blade, `json_script` in Django.

## 4. Authentication and sessions

- Use the framework's auth (Laravel starter kit/Fortify/Sanctum, Django auth);
  no home-made password hashing or tokens.
- Login and password-reset endpoints are rate-limited (Laravel `throttle`,
  Django e.g. `django-axes` if already used).
- Session/cookie flags: `Secure` (HTTPS), `HttpOnly`, `SameSite=Lax` or stricter.
- CSRF protection on for every state-changing form/request in session-based
  apps (Laravel `VerifyCsrfToken`/`@csrf`, Django `CsrfViewMiddleware`).
- A new session ID at sign-in and whenever the user's rights change — the
  framework's sign-in function does it; a session value set by hand doesn't.
- An idle timeout and a maximum lifetime for sessions, set in configuration.
- Logout invalidates the session; password change invalidates other sessions
  where the framework supports it.
- A stated password rule (`vapt-checklist.md` section 5); changing the
  password, email or second factor asks for the current password.
- Reset emails, verification codes and one-time passwords: sending is limited
  per account and per client; codes are single-use, short-lived and
  attempt-limited.
- No account with a known password outside local and test: seeders and
  fixtures that create users run only there.
- API tokens: signature (a fixed algorithm), expiry and audience are verified
  on every request; lifetimes are short, the key comes from configuration,
  and there is a way to revoke.
- Admin accounts and the Django admin / Filament / back-office: two-factor
  authentication (Fortify 2FA, `django-otp`), and staff-only access.

## 5. Authorisation (who may do what)

(Laravel/Inertia: everything passed as page props is visible in the page
source — pass Resources with only the needed fields, never models.)

The most common real-world hole. For every new action/endpoint:

- Is the user logged in? (route middleware / dependency)
- May **this** user do **this** to **this** record? Object-level checks, not
  just role checks — e.g. staff can view *their own* leave request, not
  `/leave-requests/{any id}` (IDOR).
  - Laravel: Policies + `Gate::authorize()` / `can:` middleware; scope queries
    to the user.
  - Django: `@login_required` + permission/ownership checks in the service;
    filter querysets by user.
  - FastAPI: `CurrentUser` dependency + ownership check in the service.
- Admin/bulk/export endpoints get the strictest checks.
- Don't trust IDs, roles or prices sent by the client.
- **Status changes** (approve, reject, cancel, pay): lock the record, check
  its current status and the user's right, and write — in one transaction
  (`lockForUpdate()` / `select_for_update()`), so double clicks and two
  approvers can't both succeed. Nobody approves their own request.
- **Firebase-only apps:** Firestore/Storage security rules are the
  authorisation — rules check `request.auth.uid` against the owner, are tested
  with the emulator, and App Check is on.

## 6. Files: uploads, downloads, paths

- Uploads: validate type by content/MIME and extension allow-list, limit size,
  store outside the public web root (or private disk) with a generated name,
  never execute or include uploaded files.
- Downloads: authorise each file; never build paths from user input — map an
  ID to a stored path. Block `../` traversal.
- Images/PDF generation from user HTML (dompdf etc.): disable remote resource
  loading unless needed.
- Excel/CSV **imports**: parse with a library that blocks XML external
  entities (openpyxl with `defusedxml` installed; PhpSpreadsheet's default
  XML security), limit file size and row count (zip bombs), and validate every
  row like form input.
- Excel/CSV **exports**: cells that start with `=`, `+`, `-`, `@`, tab or
  carriage return are prefixed with `'` so spreadsheet formulas from user
  data don't run (CSV/formula injection).
- Rich text from users (comments, descriptions with formatting): sanitise to
  an allow-list of tags (`nh3` in Python, HTMLPurifier in PHP, DOMPurify in
  the browser) before storing or showing it.
- Uploaded HTML and SVG can carry scripts: never show them from the app's own
  origin — send them as a download, or refuse the type.

## 7. External calls, redirects, SSRF

- Server-side requests to user-supplied URLs: allow-list hosts; block
  internal addresses (169.254.169.254, 10.x, 127.x) — SSRF.
- Redirects after login/actions: only to internal paths or allow-listed hosts.
- Timeouts on every external call; verify TLS (never `verify=False`).

## 8. Secrets and configuration

- Secrets only in environment/`.env` (gitignored); `.env.example` has
  placeholders.
- Production: `APP_DEBUG=false` / `DEBUG=False`; no default keys
  (`APP_KEY`, `SECRET_KEY` set and secret).
- CORS: explicit origins, not `*` with credentials, and never the caller's
  origin echoed back.
- Debug, admin, monitoring and API-documentation tools are available only in
  local development or behind sign-in — switched by the environment.
- The app answers only its configured host names, and builds the links in
  emails from the configured address, not from the request.

## 9. Errors and logging

- Users see generic error messages; stack traces, SQL and paths never reach
  the response in production — a plain page for every error status (not
  found, forbidden, expired, server error).
- User input can't forge a log line: structured logging, or line breaks
  removed.
- Log security events (failed logins, permission denials) without secrets,
  passwords, tokens or full personal data.

## 10. Personal data (PDPA / NRIC)

- Collect personal data only when the feature needs it; NRIC/FIN only where
  legally required — otherwise use another identifier or the last 4 characters.
- Mask on screen where the full value isn't needed (`S****567A`).
- Never log NRIC, phone numbers, salaries or medical details.
- Exports and reports containing personal data need authorisation and
  should be limited to the fields required.

## 11. Dependencies

- No new dependency without a reason; prefer well-maintained packages.
- New/updated packages: run the dependency audit (see `scanners.md`).
- Known-vulnerable versions found in existing dependencies → proposal with
  the fixed version (patch/minor 🟢, major 🟠).

## 12. LLM and agent features

The full checklist is `ai.md`. In short: identity comes from the run
context, never from arguments the model chose; the permission check runs in
code before any retrieval or tool call; documents, emails and tool output
are data, not instructions; model output is untrusted input (validated,
escaped, never executed); writes that matter wait for a person; nothing
leaves the organisation unapproved.
