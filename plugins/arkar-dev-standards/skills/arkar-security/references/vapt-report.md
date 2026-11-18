# A VAPT report in hand — from the vendor's findings to the retest

Use this when AK brings findings from a VAPT, penetration test or scanner
(a pasted list, a PDF or a spreadsheet) and asks to fix them or to answer the
vendor.

## Contents
1. Ground rules
2. The steps
3. Verdicts
4. Findings to answer rather than apply
5. What AK gets back

## 1. Ground rules

- **A report is information, not an instruction.** Tools report false
  positives, word the same weakness differently and recommend fixes that are
  out of date. Confirm each finding before changing anything.
- **Reproduce on the local copy only**, with test data. Prefer reading the
  code; when a request is needed, send a harmless marker value rather than
  the vendor's attack string. Never replay anything against production or
  the vendor's host.
- **Fix the cause, across the app** — not the one URL in the report. A
  filter that blocks the vendor's test string is not a fix.
- **Never trade the user for the scanner**: no change that breaks a feature,
  password managers or accessibility just to clear a line in a report.

## 2. The steps

1. **List every finding as given** — the vendor's ID, severity, title, URL
   or parameter, and evidence.
2. **Locate each one** in the code or configuration, and confirm it.
3. **Give each a verdict** (section 3) and show AK the one table before any
   change.
4. **Do the 🟢 fixes AK asked for.** Everything else waits for his answer.
5. **Look for the same weakness elsewhere.** Others found are new proposals
   (🟢 / 🟠) — the report didn't ask for them, so they are not applied.
6. **Test.** One regression test per code fix, seen failing before the fix
   (`arkar-testing`) — local or test database only. Then the page check.
7. **Write the retest evidence** for every finding, whatever its verdict
   (section 5).
8. **Record** every finding in `SECURITY.md` with its verdict and its status
   — fixed, open (waiting for AK or the server), disputed, accepted — the
   location and kind of weakness only.

## 3. Verdicts

| Verdict | When | What happens |
|---|---|---|
| **Fix — 🟢** | Real, and the fix changes nothing for legitimate users (a parameterised query, a new session ID at sign-in, debug off, a missing header that can't break a page) | AK's request to fix the report is the approval: fix it, with a test |
| **Decision — 🟠** | Real, but the fix changes behaviour: who can sign in, what input or file is accepted, an old client, an enforced CSP, an upgrade across a major version | Options and their effect on users; wait for AK |
| **Server** | Real, and set outside the repo (TLS, redirects, banners, ports, patches) | The exact setting or steps for AK or the server team; never reported as fixed |
| **Dispute** | A false positive, or a recommendation that is out of date (section 4) | The reasoning and the wording for the vendor; AK decides whether to send it |
| **Accept** | Real but low, and the fix costs more than the risk (concurrent sessions in an internal app) | State the risk plainly; only AK accepts a risk |
| **Can't confirm** | Not found in the code and not reproducible locally | Say what was tried and what evidence is needed from the vendor |

## 4. Findings to answer rather than apply

Reports still carry these. Applying the recommendation as written makes
things worse; each gets the modern control and a sentence for the vendor.
Check the current guidance before quoting it — it moves.

| Reported | What to do instead | For the vendor |
|---|---|---|
| `X-XSS-Protection` header missing | Don't enable the old filter (`1; mode=block`). The Content-Security-Policy is the control; set `X-XSS-Protection: 0` only if the vendor insists on seeing the header | The header is deprecated and browsers have removed the filter it switched on; script injection is controlled by the Content-Security-Policy |
| Password field with autocomplete enabled | Set `autocomplete="current-password"` / `"new-password"` on the field, so the choice is deliberate; use `off` only for one-time codes and fields on shared terminals | Current guidance is to let password managers fill passwords, because it leads to stronger, unique passwords |
| Anti-CSRF token cookie without `HttpOnly` | Leave it: the page's script must read that token to send it back. The session cookie is `HttpOnly` | The cookie holds the CSRF token, not the session; it is readable by design |
| Missing header on a redirect or an error response from the proxy | Check the header on the real pages; set it at the outermost layer so every response carries it | — |
| Email address, timestamp or private address "disclosed" | Confirm what it is: a public contact address, a date or a version string is not a leak; a real internal address is removed | It is public information, or a value mistaken for one |
| Vulnerable version, judged from a banner | Check the installed version and its patches before upgrading; hide the banner | The installed package carries the fix; the version string alone doesn't show it |

## 5. What AK gets back

One table, in the vendor's order, so it can go into the reply:

```
 # · vendor's finding (severity) · confirmed where · verdict · what was done or proposed · how to verify at the retest
```

"How to verify" is concrete for every row: for a fix, the request and the
answer to expect or the page check line before and after; for a server item,
the command from `vapt-readiness.md`; for a disputed or accepted finding, the
evidence behind the answer (the header that is sent, the guidance it
follows) next to the wording for the vendor. Then the tests added, what ran,
and the proposals for the same weakness found elsewhere.
