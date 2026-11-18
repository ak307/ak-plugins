"""security-check.cjs: the newer page checks and the --readiness pass, against three small local sites.

- "flawed" has what a VAPT reports: a weak CSP, forms without tokens, a debug error page, open CORS, TRACE,
  API docs and a debug tool open to anyone, a served `.env.production`, an old library.
- "hardened" has none of it.
- "single-page" answers every path with its own page, as a single-page app does — nothing may be reported
  as reachable there.
"""
import json
import shutil
import subprocess
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "plugins/arkar-dev-standards/skills/arkar-security/scripts/security-check.cjs"

FLAWED_PAGE = """<!doctype html><html><head><title>Visitors</title><script src="/lib.js"></script></head><body>
<form method="post" action="/save"><input name="name"><button>Save</button></form>
<form action="/sign-in"><input name="email"><input name="password" type="password"><button>Sign in</button></form>
</body></html>"""
HARDENED_PAGE = """<!doctype html><html><head><title>Visitors</title></head><body>
<form method="post" action="/save"><input type="hidden" name="_token" value="t"><input name="name"><button>Save</button></form>
<form method="post" action="/sign-in"><input type="hidden" name="_token" value="t"><input name="email">
<input name="password" type="password"><button>Sign in</button></form>
</body></html>"""
DEBUG_ERROR = 'Traceback (most recent call last):\n  File "/var/www/app/views.py", line 12, in show\nKeyError: \'id\'\n'
HARDENED_HEADERS = {
    "X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY", "Content-Security-Policy": "default-src 'self'",
    "Referrer-Policy": "strict-origin-when-cross-origin", "Permissions-Policy": "camera=()", "Cache-Control": "no-store",
    "Set-Cookie": "app_session=abc; Path=/; HttpOnly; SameSite=Lax",
}
NEW_PAGE_ALERTS = {
    "Referrer-Policy Header Not Set", "Content Security Policy allows unsafe sources",
    "State-changing form without an anti-CSRF token", "Password sent in the URL (form uses GET)",
    "Page with a session may be cached (Cache-Control)",
}


def playwright_available() -> bool:
    if shutil.which("node") is None:
        return False
    return subprocess.run(["node", "-e", "require('playwright')"], capture_output=True).returncode == 0


pytestmark = pytest.mark.skipif(not playwright_available(), reason="node with playwright not available")


class Site(BaseHTTPRequestHandler):
    """One of the three sites; `answer` is set by each subclass."""

    def log_message(self, *args):
        pass

    def version_string(self):
        return "web"  # no version in the Server header

    def reply(self, status: int, body: str, headers: dict[str, str] | None = None, content_type: str = "text/html") -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        for name, value in (headers or {}).items():
            self.send_header(name, value)
        self.end_headers()
        self.wfile.write(body.encode())


class FlawedSite(Site):
    def do_GET(self):
        headers = {"Content-Security-Policy": "script-src 'self' 'unsafe-inline' https:", "Set-Cookie": "app_session=abc; Path=/"}
        if self.headers.get("Origin"):  # any site may call it, with the user's cookies
            headers["Access-Control-Allow-Origin"] = self.headers["Origin"]
            headers["Access-Control-Allow-Credentials"] = "true"
        pages = {
            "/": FLAWED_PAGE,
            "/docs": "<title>Swagger UI</title>",
            "/telescope": "<title>Debug tool</title><p>Every request, query and job</p>",
        }
        if self.path in pages:
            self.reply(200, pages[self.path], headers)
        elif self.path == "/lib.js":
            self.reply(200, 'window.jQuery = { fn: { jquery: "1.12.4" } };', content_type="text/javascript")
        elif self.path == "/.env.production":
            self.reply(200, "APP_ENV=production\nAPP_NAME=fixture\n", content_type="text/plain")
        else:
            self.reply(404, DEBUG_ERROR, content_type="text/plain")

    def do_TRACE(self):
        self.reply(200, f"TRACE {self.path} HTTP/1.1\n", content_type="message/http")


class HardenedSite(Site):
    def do_GET(self):
        if self.path == "/":
            self.reply(200, HARDENED_PAGE, HARDENED_HEADERS)
        elif self.path == "/with-nonce":
            headers = {**HARDENED_HEADERS, "Content-Security-Policy": "script-src 'nonce-r4nd0m' 'unsafe-inline'"}
            self.reply(200, HARDENED_PAGE, headers)
        elif self.path in ("/docs", "/telescope"):
            self.reply(302, "", {**HARDENED_HEADERS, "Location": "/sign-in"})
        else:
            self.reply(404, "Not found", HARDENED_HEADERS, content_type="text/plain")

    def do_TRACE(self):
        self.reply(405, "Method not allowed", HARDENED_HEADERS, content_type="text/plain")


class SinglePageSite(Site):
    def do_GET(self):
        # The same page for every path; the comment changes on every answer, as a nonce or a build stamp does.
        self.reply(200, f"<!doctype html><html><body><div id='app'></div><!-- {time.time_ns()} --></body></html>", HARDENED_HEADERS)

    def do_TRACE(self):
        self.reply(405, "Method not allowed", HARDENED_HEADERS, content_type="text/plain")


class SignInSite(Site):
    """A sign-in form, and an account page that only a signed-in visitor gets."""

    def do_GET(self):
        if self.path == "/sign-in":
            form = ('<!doctype html><html><body><form method="post" action="/sign-in"><input type="hidden" name="_token" value="t">'
                    '<label>Email <input name="email"></label><button>Sign in</button></form></body></html>')
            self.reply(200, form, HARDENED_HEADERS)
        elif self.path == "/account" and "app_session=signed-in" in self.headers.get("Cookie", ""):
            self.reply(200, "<!doctype html><html><body><h1>Account</h1></body></html>")  # no Cache-Control: a finding
        else:
            self.reply(303, "", {"Location": "/sign-in"})

    def do_POST(self):
        self.rfile.read(int(self.headers.get("Content-Length", 0)))
        self.reply(303, "", {"Location": "/account", "Set-Cookie": "app_session=signed-in; Path=/; HttpOnly; SameSite=Lax"})


def serve(handler):
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server, f"http://127.0.0.1:{server.server_port}"


@pytest.fixture(scope="module")
def flawed():
    server, base = serve(FlawedSite)
    yield base
    server.shutdown()


@pytest.fixture(scope="module")
def hardened():
    server, base = serve(HardenedSite)
    yield base
    server.shutdown()


@pytest.fixture(scope="module")
def single_page():
    server, base = serve(SinglePageSite)
    yield base
    server.shutdown()


@pytest.fixture(scope="module")
def sign_in_site():
    server, base = serve(SignInSite)
    yield base
    server.shutdown()


def check(*args: str) -> dict:
    result = subprocess.run(["node", str(SCRIPT), *args, "--json"], capture_output=True, text=True, timeout=120)
    assert result.returncode == 0, result.stderr
    return json.loads(result.stdout.strip().splitlines()[-1])


def page_alerts(result: dict) -> set[str]:
    return {note["alert"] for note in result["pages"][0]["notes"]}


def site_notes(result: dict, alert: str) -> list[str]:
    return [note["detail"] for note in result["sites"][0]["notes"] if note["alert"] == alert]


def test_a_page_is_checked_for_its_csp_referrer_policy_forms_and_caching(flawed):
    assert NEW_PAGE_ALERTS <= page_alerts(check(f"{flawed}/"))


def test_a_run_without_readiness_asks_the_site_nothing_more(flawed):
    # The check that follows an ordinary change stays as light as it was.
    assert check(f"{flawed}/")["sites"] == []


def test_readiness_reports_debug_details_open_cors_and_trace(flawed):
    result = check(f"{flawed}/", "--readiness")
    assert "a stack trace" in site_notes(result, "Error page shows debug details")[0]
    assert site_notes(result, "Cross-origin requests allowed from any site (CORS)")
    assert site_notes(result, "TRACE method enabled")


def test_readiness_reports_docs_and_the_projects_own_debug_path_when_anyone_can_open_them(flawed):
    reachable = " ".join(site_notes(check(f"{flawed}/", "--readiness", "--paths=/telescope"), "Reachable without signing in"))
    assert "`/docs`" in reachable and "`/telescope`" in reachable


def test_a_path_is_only_tried_when_the_project_names_it(flawed):
    reachable = " ".join(site_notes(check(f"{flawed}/", "--readiness"), "Reachable without signing in"))
    assert "`/docs`" in reachable and "telescope" not in reachable


def test_readiness_reports_more_files_a_site_should_not_serve(flawed):
    assert "`/.env.production`" in " ".join(site_notes(check(f"{flawed}/", "--readiness"), "Hidden File Found"))


def test_readiness_lists_the_libraries_on_the_page_with_their_versions(flawed):
    notes = [note for note in check(f"{flawed}/", "--readiness")["pages"][0]["notes"] if note["area"] == "components"]
    assert "jQuery 1.12.4" in notes[0]["detail"]


def test_a_hardened_site_has_none_of_the_findings(hardened):
    result = check(f"{hardened}/", "--readiness", "--paths=/telescope")
    assert not NEW_PAGE_ALERTS & page_alerts(result)
    assert result["sites"][0]["notes"] == []


def test_inline_scripts_allowed_next_to_a_nonce_are_not_a_weak_csp(hardened):
    # Browsers ignore 'unsafe-inline' when the policy carries a nonce.
    assert "Content Security Policy allows unsafe sources" not in page_alerts(check(f"{hardened}/with-nonce"))


def test_an_app_that_answers_every_path_with_its_own_page_is_not_reported(single_page):
    result = check(f"{single_page}/", "--readiness", "--paths=/telescope,/admin-tool")
    assert result["sites"][0]["notes"] == []


SIGN_IN_STEPS = ("--steps", "type=label:Email=someone@example.test", "click=button")


def test_keep_session_checks_a_page_behind_sign_in_as_a_signed_in_user(sign_in_site):
    result = check(f"{sign_in_site}/sign-in", f"{sign_in_site}/account", "--keep-session", *SIGN_IN_STEPS)
    account = result["pages"][1]
    assert account["finalUrl"].endswith("/account")
    assert "Page with a session may be cached (Cache-Control)" in {note["alert"] for note in account["notes"]}


@pytest.mark.parametrize("click", ["click=text:Sign in", "click=Sign in"])
def test_a_button_can_be_named_by_its_text(sign_in_site, click):
    # People name a button by what it says; a step that fails leaves the next pages signed out.
    result = check(f"{sign_in_site}/sign-in", f"{sign_in_site}/account", "--keep-session",
                   "--steps", "type=label:Email=someone@example.test", click)
    assert result["pages"][0]["stepErrors"] == []
    assert result["pages"][1]["finalUrl"].endswith("/account")


def test_without_keep_session_every_page_starts_signed_out(sign_in_site):
    result = check(f"{sign_in_site}/sign-in", f"{sign_in_site}/account", *SIGN_IN_STEPS)
    assert result["pages"][1]["finalUrl"].endswith("/sign-in")


def test_the_code_scan_lists_injection_and_debug_lines_in_any_language(tmp_path):
    (tmp_path / "visitors.php").write_text("<?php\n$sql = \"SELECT id FROM visitors WHERE name LIKE '%\" . $search . \"%'\";\n")
    (tmp_path / "jobs.py").write_text("import pickle, subprocess\nsubprocess.run(command, shell=True)\njob = pickle.loads(blob)\n")
    (tmp_path / "Report.java").write_text('String sql = "SELECT * FROM reports WHERE site = \'" + site + "\'";\n')
    (tmp_path / "settings.php").write_text("<?php\nreturn ['debug' => true];\n")
    labels = {item[0] for item in check(f"--code={tmp_path}")["code"]}
    assert {"SQL built from variables", "command run through a shell", "unsafe deserialisation", "debug switched on in code"} <= labels


def test_the_code_scan_leaves_a_parameterised_query_alone(tmp_path):
    (tmp_path / "visitors.py").write_text('rows = cursor.execute("SELECT id FROM visitors WHERE name LIKE %s", [pattern])\n')
    (tmp_path / "Visitors.java").write_text('PreparedStatement find = connection.prepareStatement("SELECT id FROM visitors WHERE name = ?");\n')
    assert check(f"--code={tmp_path}")["code"] == []
