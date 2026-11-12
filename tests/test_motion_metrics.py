"""motion-metrics.cjs finds known motion defects on a page built to have them, and passes the good ones."""
import json
import shutil
import subprocess
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "plugins/arkar-dev-standards/skills/arkar-ui-visual-qa/scripts/motion-metrics.cjs"
FIXTURES = Path(__file__).parent / "fixtures"


def playwright_available() -> bool:
    if shutil.which("node") is None:
        return False
    return subprocess.run(["node", "-e", "require('playwright')"], capture_output=True).returncode == 0


pytestmark = pytest.mark.skipif(not playwright_available(), reason="node with playwright not available")


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


@pytest.fixture(scope="module")
def page_url():
    server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=str(FIXTURES)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    yield f"http://127.0.0.1:{server.server_port}/motion-page.html"
    server.shutdown()


def measure(url: str, *steps: str) -> list[dict]:
    result = subprocess.run(["node", str(SCRIPT), url, "--json", *steps], capture_output=True, text=True, timeout=120)
    assert result.returncode == 0, result.stderr
    return json.loads(result.stdout.strip().splitlines()[-1])["steps"]


def test_good_and_bad_motion_are_told_apart(page_url):
    load, panel, toast, slow, close = measure(page_url, "click=#open", "click=#toast", "click=#move", "click=#close")
    assert panel["findings"] == []                       # eased 260 ms slide: fine, not a "jump"
    assert panel["animations"][0]["duration"] == 260
    assert panel["response"] is not None and panel["response"] < 100
    assert any("popped in" in note for note in toast["findings"])
    assert any("linear easing" in note for note in slow["findings"])
    assert any("slow:" in note for note in slow["findings"])
    assert any("vanished" in note for note in close["findings"])


def test_an_interrupted_animation_that_snaps_is_a_jump(page_url):
    steps = measure(page_url, "click=#js-go", "click=#js-go@200")
    assert any("jump" in note for note in steps[-1]["findings"])


def test_reduced_motion_left_moving_is_reported(page_url):
    result = subprocess.run(["node", str(SCRIPT), page_url, "--json", "--reduced", "click=#open"],
                            capture_output=True, text=True, timeout=120)
    steps = json.loads(result.stdout.strip().splitlines()[-1])["steps"]
    assert any("reduced motion ignored" in note for note in steps[-1]["findings"])


def test_refuses_non_local_urls():
    result = subprocess.run(["node", str(SCRIPT), "https://example.com", "click=a"], capture_output=True, text=True)
    assert result.returncode == 1 and "local" in result.stderr


def test_real_browser_falls_back_to_headless_and_says_so(page_url):
    result = subprocess.run(["node", str(SCRIPT), page_url, "--json", "--real-browser", "click=#open"],
                            capture_output=True, text=True, timeout=120)
    assert result.returncode == 0, result.stderr
    report = json.loads(result.stdout.strip().splitlines()[-1])
    if report["realGpu"]:  # a laptop with Chrome and a display
        assert report["renderer"] == "Google Chrome with the GPU"
    else:                  # this workspace: no installed Chrome, still measured, clearly labelled
        assert report["renderer"].startswith("headless Chromium (no GPU) — real browser unavailable")
    assert report["steps"][-1]["animations"][0]["duration"] == 260
