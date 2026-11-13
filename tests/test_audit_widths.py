"""audit.cjs walks ten widths: sideways overflow, and controls that end up under a fixed or sticky side panel."""
import json
import shutil
import subprocess
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
AUDIT = ROOT / "plugins/arkar-dev-standards/skills/arkar-ui-visual-qa/scripts/audit.cjs"
PAGES = Path(__file__).parent / "fixtures" / "audit"


def playwright_available() -> bool:
    if shutil.which("node") is None:
        return False
    return subprocess.run(["node", "-e", "require('playwright')"], capture_output=True).returncode == 0


pytestmark = pytest.mark.skipif(not playwright_available(), reason="node with playwright not available")


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


@pytest.fixture(scope="module")
def audit():
    server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=str(PAGES)))
    threading.Thread(target=server.serve_forever, daemon=True).start()

    def run(page: str, *flags: str) -> subprocess.CompletedProcess:
        return subprocess.run(["node", str(AUDIT), f"http://127.0.0.1:{server.server_port}/{page}", *flags],
                              capture_output=True, text=True, timeout=240)

    yield run
    server.shutdown()


def test_a_panel_lying_on_the_content_between_the_usual_test_sizes_is_reported(audit):
    result = audit("overlap.html", "--json")
    assert result.returncode == 0, result.stderr[-1500:]
    widths = json.loads(result.stdout.strip().splitlines()[-1])["widths"]
    # Fine at 1440 (own column) and on phones (below the content); wrong in between — where laptops are.
    assert [at["width"] for at in widths["covered"]] == [768, 1024, 1200, 1280]
    assert widths["covered"][-1]["count"] == 3 and "Over target" in widths["covered"][-1]["examples"]
    assert widths["overflow"] == []


def test_a_panel_that_keeps_its_own_column_passes_at_every_width(audit):
    result = audit("column.html", "--json")
    assert result.returncode == 0, result.stderr[-1500:]
    assert json.loads(result.stdout.strip().splitlines()[-1])["widths"] == {"overflow": [], "covered": []}


def test_the_plain_report_says_where_and_what_to_do(audit):
    text = audit("overlap.html").stdout
    assert "controls under a fixed or sticky panel YES — 768 px: 3" in text
    assert "must hold its own column" in text
