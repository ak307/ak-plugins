# Ready for VAPT — the pass before an app goes to the vendor

Use this when AK says an app is going for a VAPT, a penetration test or a
security audit, asks whether it is ready, or asks for a full security review.
It is one pass over the whole app that ends in a readiness report — not a
series of fixes. Everything found in existing code is a proposal
(🟢 / 🟠); AK decides what gets fixed before the test.

## Contents
1. Ground rules
2. The pass
3. The server checklist (for AK)
4. The readiness report

## 1. Ground rules

- **Local only.** Run and check a local copy with test data. Never scan,
  probe or load-test the production or the vendor's test host — not with the
  page check, not with any other tool.
- **Check where the app points before running it** (always-on section 0). If
  it can't be run safely, do the parts that only read code and say what was
  not checked.
- **See what the vendor will see.** A development run has debug pages and
  tools switched on. Where the stack allows it, start the local copy in its
  production mode with debug off — through environment variables for that one
  process, never by editing the environment file. If it can't, say that
  debug-related findings reflect the development settings.
- **No new tools on AK's machines.** The page check, the ecosystem's own
  audit and the secret scan are enough; no vulnerability scanner is installed
  or run.

## 2. The pass

1. **Scope.** The stack and its versions; the URLs and roles the vendor will
   test (ask AK when it isn't written down); the data the app holds.
2. **Map the surface.** Every route, page and endpoint with who may use it —
   from the framework's own route listing where it has one, otherwise by
   reading. Note the inputs: forms, uploads, imports, exports, APIs, webhooks,
   anything an outside system posts.
3. **Check the running app.** From the project folder, on local URLs:
   - signed out — the public pages and the sign-in page:
     `node <this skill>/scripts/security-check.cjs <urls> --readiness --paths=<paths>`
   - signed in, once per role that matters — the first URL is the sign-in
     page, `--steps` fills it in, and `--keep-session` carries the session to
     the pages that follow:
     `node … <sign-in url> <page> <page> --keep-session --steps type=label:Email=<test user> type=label:Password=<test password> click=<submit>`
   `--paths` is the list of this project's own debug, admin, monitoring and
   documentation paths — work them out from its dependencies and routes; the
   script only knows the ones any stack can have. Use test accounts only.
4. **Dependencies.** The ecosystem's audit (`scanners.md`). Each library the
   page check lists with a version: look it up in the live advisory source.
   The framework, runtime and server versions: look up whether each still
   receives security fixes.
5. **Secrets.** The secret scan over the repository (`scanners.md`).
6. **Review the code by area** — `vapt-checklist.md` sections 4 to 11 against
   the map from step 2, with `--code=<folder>` for the lines worth opening
   first. Access control is the part no tool does: read the rule of every
   route.
7. **Security tests.** Do tests exist for the main roles on the important
   routes (owner, another user, not signed in)? Run the existing suite —
   local or test database only (`arkar-testing`). Missing tests are proposals.
8. **The server checklist** (section 3) — what applies, for AK.
9. **Report** (section 4) and record the open items in `SECURITY.md`.

## 3. The server checklist (for AK)

What the repository can't show and a vendor always tests. These are AK's to
check and to change — on the web server, proxy or platform the app runs on.
When he names it, write the exact setting for that product (from its current
documentation) as a proposal; never report it as done. The commands are
read-only and use tools already on his machine; he runs them against his own
host.

| What must be true | How AK can see it |
|---|---|
| HTTP redirects to HTTPS | `curl -sI http://<host>/` answers 301 or 308 with an `https://` location |
| TLS 1.2 or newer only | The server's protocol setting. From outside: `openssl s_client -connect <host>:443 -tls1_1 </dev/null` fails while `-tls1_2` connects — only meaningful on a machine whose OpenSSL still offers TLS 1.1 itself |
| The certificate is valid and not about to expire | `openssl s_client -connect <host>:443 -servername <host> </dev/null \| openssl x509 -noout -dates` |
| HSTS and the security headers reach the browser (a proxy can strip or double them) | `curl -sI https://<host>/` shows each header once |
| No product versions | the same output has no version in `Server` and no `X-Powered-By` |
| TRACE is off | `curl -s -o /dev/null -w "%{http_code}" -X TRACE https://<host>/` answers 405 or 501 |
| Dotfiles, version-control folders and backups are refused | `curl -s -o /dev/null -w "%{http_code}" https://<host>/.env` (and `/.git/HEAD`) answers 403 or 404 |
| Folders don't list their files | opening an asset folder in the browser shows an error page |
| Only the web ports are reachable; database, cache and admin panels are not on the internet | the infrastructure team's firewall rules |
| Request size and time limits are set | the server or proxy configuration |
| The operating system, web server and runtime are supported versions with current patches | the server's package list |
| The production environment has debug off and its own secrets | the production environment file (AK reads it; Claude doesn't) |
| Backups, logs and uploads are outside the web-served folder | the server's folder layout |

## 4. The readiness report

```
VAPT readiness — <app> · <date>
Scope: <pages, roles and inputs covered> · Target: <local copy, production mode or not, test data>
Summary: <n> to fix before the test (🟢 <n> · 🟠 <n>) · <n> for the server · <n> not checked

Findings (in checklist order)
 #  Area · finding · where · label · proposed fix · status (open / approved / fixed / accepted)

Checked, and how
 - Page check: <pages signed out; pages signed in as which role> → <result>
 - Dependency audit · library versions · supported versions → <result>
 - Secret scan → <result>
 - Code review: <areas read> · Security tests: <what exists, what ran>

Not checked
 - <what, and why>

For the server
 - <the rows of the server checklist that apply, with the setting proposed where AK named the server>
```

A finding is listed once, at its root — if one query is built from input,
say how many others are, not just the one. Never write that the app "will
pass": say what was checked, what was found and what could not be seen.
