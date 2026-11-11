"""security-check.cjs finds known front-end and configuration flaws on a page built to have them, not on a clean one."""
import json
import shutil
import subprocess
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "plugins/arkar-dev-standards/skills/arkar-security/scripts/security-check.cjs"
FIXTURE = Path(__file__).parent / "fixtures" / "security-page"


def playwright_available() -> bool:
    if shutil.which("node") is None:
        return False
    return subprocess.run(["node", "-e", "require('playwright')"], capture_output=True).returncode == 0


pytestmark = pytest.mark.skipif(not playwright_available(), reason="node with playwright not available")


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


@pytest.fixture(scope="module")
def site(tmp_path_factory):
    folder = tmp_path_factory.mktemp("site")
    shutil.copytree(FIXTURE, folder, dirs_exist_ok=True)
    (folder / ".env").write_text("APP_KEY=base64:fake-for-test\nDB_PASSWORD=fake\n")  # created here, never committed
    server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=str(folder)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    yield folder, f"http://127.0.0.1:{server.server_port}"
    server.shutdown()


def check(*args: str) -> dict:
    result = subprocess.run(["node", str(SCRIPT), *args, "--json"], capture_output=True, text=True, timeout=120)
    assert result.returncode == 0, result.stderr
    return json.loads(result.stdout.strip().splitlines()[-1])


def alerts(page: dict) -> set[str]:
    return {note["alert"] for note in page["notes"]}


def test_flawed_page_findings(site):
    _, base = site
    found = alerts(check(f"{base}/flawed.html")["pages"][0])
    for expected in ("X-Content-Type-Options Header Missing", "Missing Anti-clickjacking Header",
                     "Content Security Policy (CSP) Header Not Set", "Server Leaks Version Information",
                     "Hidden File Found", "Inline event handlers (block a CSP)", "CDN file without integrity (SRI)",
                     "Personal data or secrets in localStorage", "Personal data or secrets in the URL", "Source map served"):
        assert expected in found, expected


def test_clean_page_has_no_storage_url_or_csp_findings(site):
    _, base = site
    found = alerts(check(f"{base}/clean.html")["pages"][0])
    assert not found & {"Personal data or secrets in localStorage", "Personal data or secrets in the URL",
                        "Inline event handlers (block a CSP)", "Inline scripts (block a CSP)", "Source map served"}


def test_code_scan_lists_lines_to_review(site):
    folder, _ = site
    labels = {item[0] for item in check(f"--code={folder / 'src'}")["code"]}
    assert {"raw HTML output", "token or secret in browser storage"} <= labels


def test_refuses_non_local_urls():
    result = subprocess.run(["node", str(SCRIPT), "https://example.com"], capture_output=True, text=True)
    assert result.returncode == 1 and "local" in result.stderr
