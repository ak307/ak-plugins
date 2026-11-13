"""use-check.cjs passes a page that behaves and finds each defect on a page built to have them."""
import json
import shutil
import subprocess
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "plugins/arkar-dev-standards/skills/arkar-ui-visual-qa/scripts/use-check.cjs"
FIXTURES = Path(__file__).parent / "fixtures" / "use-check"
JOURNEY = ("click=#open", "--commit=click=#add", "--count=.note")


def playwright_available() -> bool:
    if shutil.which("node") is None:
        return False
    return subprocess.run(["node", "-e", "require('playwright')"], capture_output=True).returncode == 0


pytestmark = pytest.mark.skipif(not playwright_available(), reason="node with playwright not available")


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


@pytest.fixture(scope="module")
def site():
    server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=str(FIXTURES)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    yield f"http://127.0.0.1:{server.server_port}"
    server.shutdown()


def use_check(url: str, *arguments: str, cwd: Path | None = None) -> dict:
    result = subprocess.run(["node", str(SCRIPT), url, *arguments, "--json"], capture_output=True, text=True, timeout=300, cwd=cwd)
    assert result.returncode == 0, result.stderr
    return json.loads(result.stdout.strip().splitlines()[-1])


def found(report: dict, level: str, area: str, words: str = "") -> bool:
    return any(line["level"] == level and line["area"] == area and words in line["text"] for line in report["lines"])


@pytest.fixture(scope="module")
def project(tmp_path_factory):
    """The folder the tool is run from: its screenshots land in qa-screenshots/ there."""
    return tmp_path_factory.mktemp("project")


@pytest.fixture(scope="module")
def good(site, project):
    return use_check(f"{site}/good.html", *JOURNEY, "--shots=orders", cwd=project)


@pytest.fixture(scope="module")
def bad(site, project):
    return use_check(f"{site}/bad.html", *JOURNEY, cwd=project)


def test_a_page_that_behaves_has_nothing_to_fix(good):
    assert good["fix"] == 0, [line for line in good["lines"] if line["level"] == "FIX"]
    assert found(good, "PASS", "load", "no console errors")
    assert found(good, "PASS", "widths", "no sideways overflow")
    assert found(good, "PASS", "keyboard", "Tab stops show focus")
    assert found(good, "PASS", "phone", "no touch target under 24 px")
    assert not found(good, "LOOK", "phone")  # the off-screen skip link is not counted as a small target
    assert found(good, "PASS", "reduced")


def test_designed_waiting_and_failure_are_recognised(good):
    assert found(good, "PASS", "slow", "loading state")
    assert found(good, "PASS", "fail", "a way to retry")


def test_a_page_that_ignores_the_dark_setting_passes(good):
    assert found(good, "PASS", "dark", "does not change the page")


def test_the_view_is_saved_to_look_at_once(good, project):
    assert good["shots"] == ["qa-screenshots/orders-phone.png", "qa-screenshots/orders-desktop.png"]
    assert all((project / shot).stat().st_size > 2000 for shot in good["shots"])
    assert (project / "qa-screenshots" / ".gitignore").read_text() == "*\n"  # evidence is never committed


def test_a_view_kept_in_the_address_survives_refresh_back_and_forward(good):
    assert found(good, "PASS", "refresh", "the address records the view")
    assert found(good, "PASS", "refresh", "a refresh returns to the same view")
    assert found(good, "PASS", "back", "Back returns to where the user was")
    assert found(good, "PASS", "back", "Forward re-opens the view")


def test_a_guarded_save_commits_once_when_pressed_twice(good):
    assert found(good, "PASS", "commit", "pressing twice commits once")


def test_loading_defects_are_found(bad):
    assert found(bad, "FIX", "load", "console error")
    assert found(bad, "FIX", "load", "fonts.example.invalid")
    assert found(bad, "FIX", "load", "layout shift while loading")


def test_layout_defects_are_found_at_the_widths_where_they_happen(bad):
    overflow = next(line["text"] for line in bad["lines"] if line["area"] == "widths" and "sideways" in line["text"])
    assert "320" in overflow and "1440" not in overflow  # the 700 px block only breaks narrow screens
    assert found(bad, "FIX", "widths", "side panel overlap")


def test_keyboard_and_touch_defects_are_named(bad):
    assert found(bad, "FIX", "keyboard", "Mute alerts")
    assert found(bad, "FIX", "phone", "Dismiss")
    assert found(bad, "LOOK", "phone", "text under 12 px")
    assert found(bad, "LOOK", "controls", "browser-default")


def test_missing_states_are_for_looking_at_not_defects(bad):
    # The tool can't tell "no switch" from "not designed", so it asks instead of failing the page —
    # and words such as "loading bay" or "failed its inspection" in the content don't count as a state.
    assert found(bad, "LOOK", "slow")
    assert found(bad, "LOOK", "fail", "no failure message")
    assert found(bad, "LOOK", "reduced", "still running")


def test_a_half_dark_page_is_a_defect(bad):
    assert found(bad, "FIX", "dark", "turn dark on a page that stays light")


def test_accessibility_rules_are_checked_on_the_opened_view(good, bad):
    if found(good, "LOOK", "a11y", "not installed"):
        pytest.skip("axe-core not installed")
    assert found(good, "PASS", "a11y")
    assert found(bad, "FIX", "a11y", "label")


def test_a_view_that_is_not_in_the_address_is_lost(bad):
    assert found(bad, "LOOK", "refresh", "the address did not change")
    assert found(bad, "FIX", "refresh", "a refresh loses what was opened")
    assert found(bad, "FIX", "back", "Back leaves the app")


def test_an_unguarded_save_commits_twice(bad):
    assert found(bad, "FIX", "commit", "committed 2 times")


def test_a_step_that_cannot_run_is_reported_not_passed(site):
    report = use_check(f"{site}/good.html", "click=#no-such-button")
    assert found(report, "FIX", "journey", "a step could not run")
    assert not any(line["area"] in ("refresh", "back") for line in report["lines"])


def test_only_local_addresses_are_used():
    result = subprocess.run(["node", str(SCRIPT), "https://example.com"], capture_output=True, text=True, timeout=60)
    assert result.returncode == 1 and "local addresses" in result.stderr
