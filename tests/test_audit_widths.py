"""audit.cjs: ten widths (sideways overflow, controls under a side panel) and the header judged on the scrolled page."""
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

    done: dict[tuple[str, ...], subprocess.CompletedProcess] = {}

    def run(page: str, *flags: str) -> subprocess.CompletedProcess:
        if (page, *flags) not in done:  # each audit takes a while: run it once per page and flags
            done[(page, *flags)] = subprocess.run(["node", str(AUDIT), f"http://127.0.0.1:{server.server_port}/{page}", *flags],
                                                  capture_output=True, text=True, timeout=240)
        return done[(page, *flags)]

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


# ---- the header, judged on the scrolled page


def header(audit, page: str) -> dict:
    result = audit(page, "--json")
    assert result.returncode == 0, result.stderr[-1500:]
    return json.loads(result.stdout.strip().splitlines()[-1])["header"]


def test_a_floating_dark_bar_is_reported_for_what_shows_around_and_through_it(audit):
    found = header(audit, "header-floating.html")
    desktop = found["desktop"]
    assert desktop["scrolls"] is True
    assert desktop["around"] > 0.01  # the page scrolls in the gap above and beside the bar
    assert desktop["through"] > 0.01 or desktop["tint"] < 0.7  # and can be read through its thin glass
    assert desktop["top"] == {"height": 145, "bands": ["header.bar", "div.context"]}  # two bands, 145 px pinned
    phone = found["phone"]
    assert phone["bottom"]["height"] == 85 and phone["share"] > 0.25  # top and bottom bars take over a quarter of a phone
    assert found["focus"]["hidden"]  # tabbing back up the page puts focus under the bars
    assert found["safeAreas"] == {"cover": False, "insets": False}


def test_one_compact_attached_bar_passes(audit):
    found = header(audit, "header-attached.html")
    desktop = found["desktop"]
    assert desktop["around"] == 0 and desktop["through"] < 0.01 and desktop["tint"] >= 0.7
    assert desktop["top"] == {"height": 57, "bands": ["header.bar"]}
    assert found["phone"]["share"] < 0.15
    assert found["focus"]["hidden"] == []  # scroll-padding keeps focus clear of the bar
    assert found["safeAreas"] == {"cover": True, "insets": True}


def test_the_plain_report_names_each_header_fault(audit):
    text = audit("header-floating.html").stdout
    assert "pinned at the top 145 px in 2 bands (header.bar, div.context) — OVER the budget of 64 px" in text
    assert "content showing above or beside the bar YES" in text and "the page readable through the bar YES" in text
    assert "take focus under a pinned bar" in text and "safe areas:" in text
    good = audit("header-attached.html").stdout
    assert "content showing above or beside the bar no" in good and "the page readable through the bar no" in good
    assert "OVER" not in good and "no control takes focus under a pinned bar" in good and "safe areas:" not in good


def test_a_solid_dark_bar_over_a_light_page_is_named(audit):
    # The same floating bar made solid: nothing reads through it now, but its tone fights the page under it.
    text = audit("header-floating.html?tint=0.96").stdout
    assert "the page readable through the bar no" in text and "a dark bar over a light page" in text


# ---- the material


def test_the_report_names_the_surfaces_that_are_glass_or_says_there_are_none(audit):
    plain = audit("overlap.html")
    assert "material: no glass anywhere in the styles" in plain.stdout and "DESIGN.md" in plain.stdout
    assert json.loads(audit("overlap.html", "--json").stdout.strip().splitlines()[-1])["material"] == {"glass": False, "on": []}
    # A page whose bar is frosted glass: the bar is named, to be set against the build sheet's Material line.
    assert "material: glass (a backdrop blur) on .bar" in audit("header-attached.html").stdout
    assert json.loads(audit("header-attached.html", "--json").stdout.strip().splitlines()[-1])["material"] == {"glass": True, "on": [".bar"]}
