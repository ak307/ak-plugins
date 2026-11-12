"""audit.cjs measures a surface in its open state and saves what it measured for the UI quality gate."""
import json
import shutil
import subprocess
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "plugins/arkar-dev-standards/skills/arkar-ui-visual-qa/scripts/audit.cjs"
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
    yield f"http://127.0.0.1:{server.server_port}/audit-page.html"
    server.shutdown()


def audit(project: Path, url: str, *arguments: str) -> dict:
    """Runs the audit from a project folder and returns what it saved there."""
    result = subprocess.run(["node", str(SCRIPT), url, "--sizes=1280x800,375x812", *arguments], cwd=project,
                            capture_output=True, text=True, timeout=180)
    assert result.returncode == 0, result.stderr
    assert "audit-results.json" in result.stdout
    return json.loads((project / "qa-screenshots" / "audit-results.json").read_text())


def test_each_run_is_saved_for_the_gate(tmp_path, page_url):
    saved = audit(tmp_path, page_url)
    run = next(iter(saved.values()))
    assert run["widths"] == [1280, 375] and run["steps"] == [] and run["surfaces"] == []
    assert set(run["system"]) == {"radii", "shadows", "fontSizes"}
    assert (tmp_path / "qa-screenshots" / ".gitignore").read_text() == "*\n"  # evidence is never committed


def test_steps_bring_a_dialog_on_screen_so_its_defects_are_measured(tmp_path, page_url):
    closed = next(iter(audit(tmp_path, page_url).values()))
    if not closed["axeAvailable"]:
        pytest.skip("axe-core not installed")
    assert "label" not in closed["seriousCritical"]  # the unnamed field is inside the closed dialog
    saved = audit(tmp_path, page_url, "--surface=S2", "click=#open", "wait=300")
    opened = next(run for run in saved.values() if run["surfaces"] == ["S2"])
    assert "label" in opened["seriousCritical"] and opened["steps"] == ["click=#open", "wait=300"]
    assert len(saved) == 2  # the page and the dialog are separate results


def test_running_the_same_command_again_replaces_its_result(tmp_path, page_url):
    audit(tmp_path, page_url, "--surface=S1")
    saved = audit(tmp_path, page_url, "--surface=S1")
    assert len(saved) == 1


def test_a_step_that_cannot_run_fails_instead_of_measuring_the_wrong_thing(tmp_path, page_url):
    result = subprocess.run(["node", str(SCRIPT), page_url, "--sizes=1280x800", "click=#missing"], cwd=tmp_path,
                            capture_output=True, text=True, timeout=180)
    assert result.returncode != 0 and not (tmp_path / "qa-screenshots" / "audit-results.json").exists()
