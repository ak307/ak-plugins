# New project — the security baseline, in any stack

What a new project has on its first day, so a VAPT finds nothing that a
setting would have prevented. These are outcomes: get each one from the
stack's own mechanism (`vapt-checklist.md` section 1), in the layout that
`arkar-project-structure` gives. Adding them later to a running app is a list
of 🟠 proposals; on day one they cost nothing.

1. **One place for response headers** — an app-wide middleware or the server
   configuration: `nosniff`, no framing by other sites, a `Referrer-Policy`,
   a `Permissions-Policy`, HSTS in production, and a Content-Security-Policy
   in report-only mode. Pages are written without inline scripts and inline
   event handlers from the start, so the CSP can be enforced without rework.
2. **Sessions** — the session cookie is `Secure` (in production), `HttpOnly`
   and `SameSite=Lax`; an idle timeout and a maximum lifetime are set in
   configuration; a new session ID is issued at sign-in; sign-out ends the
   session on the server.
3. **CSRF protection** on every state-changing request of a cookie-session
   app.
4. **Sign-in from the framework or a maintained library** — never
   hand-written: an established password-hashing function, a stated password
   rule, limits on sign-in and reset attempts, the same message whether or
   not the account exists.
5. **Deny by default** — every route states who may use it; where the
   framework can list its routes, a test fails when a route has no rule.
6. **Input limits** — validation at the boundary for every input, a request
   body size limit, a cap on page size.
7. **Plain error pages** for every error status; debug on only in local
   development, switched by the environment.
8. **Debug, admin and documentation tools** only in local development or
   behind sign-in — switched by the environment, not by remembering.
9. **Known host names** — the app answers only its own; links in emails come
   from the configured address.
10. **Secrets in the environment only** — an example file with placeholders,
    the real one git-ignored, no default keys.
11. **Only the public folder is served**; uploads are stored outside it.
12. **Cross-origin access off** unless the project needs it, then for named
    origins.
13. **Security events are logged** — failed sign-ins, refused permissions,
    admin actions — without secrets or full personal data.
14. **The checks run on every push** — the dependency audit and the secret
    scan in CI (`arkar-delivery`), with the lock file committed.
15. **The first security tests exist** — owner, another user, not signed in —
    so every later endpoint has a pattern to copy.

Then run the page check on the first page
(`node <this skill>/scripts/security-check.cjs <local url>`): apart from HSTS
on a plain-HTTP local address it should have nothing to report. Record what
was set, and where, in the project's notes so the next person finds the one
place.
