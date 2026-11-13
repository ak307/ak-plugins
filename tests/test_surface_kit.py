"""surface-kit.js: the dropdown, date picker, menu, row selection and form feedback behave as documented,
and the real <select> and <input> underneath keep their values and events."""
import json
import os
import shutil
import subprocess
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "plugins/arkar-dev-standards/skills/arkar-ui-design-system/assets"
PAGE = Path(__file__).parent / "fixtures" / "surface-kit" / "index.html"
AXE = Path.home() / ".arkar" / "axe" / "node_modules" / "axe-core" / "axe.min.js"

DRIVER = PAGE.parent / "driver.cjs"


def playwright_available() -> bool:
    if shutil.which("node") is None:
        return False
    return subprocess.run(["node", "-e", "require('playwright')"], capture_output=True).returncode == 0


pytestmark = pytest.mark.skipif(not playwright_available(), reason="node with playwright not available")


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


@pytest.fixture(scope="module")
def seen(tmp_path_factory):
    """Everything the driver observed on the kit's page, gathered in one browser run."""
    site = tmp_path_factory.mktemp("surface-kit")
    shutil.copy(PAGE, site / "index.html")
    for name in ("surface-kit.js", "surface-kit.css", "liquid-glass.css"):
        shutil.copy(ASSETS / name, site / name)
    server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=str(site)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        result = subprocess.run(["node", str(DRIVER), f"http://127.0.0.1:{server.server_port}/index.html", str(AXE)],
                                capture_output=True, text=True, timeout=300, env={**os.environ, "TZ": "Asia/Singapore"})
    finally:
        server.shutdown()
    assert result.returncode == 0, result.stderr[-2000:]
    return json.loads(result.stdout.strip().splitlines()[-1])


def test_the_page_runs_without_errors(seen):
    assert seen["pageErrors"] == []


def test_dropdown_by_keyboard_changes_the_real_select(seen):
    assert seen["activeWhileOpen"] == "Kestrel House" and seen["expandedWhileOpen"] == "true"
    assert seen["keyboard"] == {"value": "Kestrel House", "events": ["where=Kestrel House"], "shown": "Kestrel House", "expanded": "false"}
    assert "ws-select" in seen["focusAfterChoose"]  # focus returns to the button, not the page


def test_typing_jumps_to_an_option_and_escape_changes_nothing(seen):
    assert seen["typeAhead"] == "Riverside Hall"
    assert seen["afterEscape"] == {"value": "Kestrel House", "open": False}
    assert "ws-select" in seen["focusAfterEscape"]


def test_space_chooses_without_reopening_and_the_label_reaches_the_button(seen):
    assert seen["afterSpace"] == {"value": "Riverside Hall", "open": False}
    assert "ws-select" in seen["focusAfterLabel"]


def test_long_lists_are_searchable_and_disabled_options_stay_out(seen):
    assert seen["filtered"] == ["Lifts", "Lighting"]
    assert seen["searchChoice"] == "Lifts" and seen["disabledIgnored"] == "Lifts"


def test_date_picker_by_keyboard_respects_min_and_max(seen):
    assert "10" in seen["dateShown"] and "2026" in seen["dateShown"]
    assert seen["dateFocus"] == "2026-12-10"  # opens on the chosen day
    assert seen["dateMoved"]["focus"] == "2027-01-18" and "January 2027" in seen["dateMoved"]["title"]
    assert seen["dateChosen"]["value"] == "2027-01-18" and seen["dateChosen"]["events"][-1] == "due=2027-01-18"
    assert "ws-date" in seen["focusAfterDate"]
    assert seen["beforeMinDisabled"] is True and seen["clampedToMin"] == "2026-11-13"


def test_one_menu_serves_every_row(seen):
    assert seen["closedMenuHeight"] == 0  # a closed menu takes no room and shows nothing
    assert seen["menuTakeover"] == {"open": True, "expanded": ["false", "false", "true"]}
    assert seen["menuFocus"] == "Open"  # the first item takes focus
    assert seen["menuAction"]["actions"] == [f"assign:{seen['menuAction']['row']}"] and seen["menuAction"]["open"] is False


def test_row_selection_with_shift_and_select_all(seen):
    assert seen["range"] == {"bulk": "4 selected", "hidden": False, "partial": True, "rows": 4}
    assert seen["all"] == 10 and seen["cleared"] == {"rows": 0, "hidden": True}


def test_form_feedback_waits_until_a_field_is_left(seen):
    assert seen["whileTyping"]["title"] == ""
    assert seen["afterLeaving"]["title"] == "Add a little more detail: at least 6 letters."
    assert seen["afterSubmit"] == {"title": "Add a little more detail: at least 6 letters.", "where": "Choose the building.",
                                   "due": "Choose a due date.", "notes": ""}
    assert seen["focusAfterSubmit"] == "title" and seen["rowsAfterBadSubmit"] == 10 and seen["invalidButton"] == "true"
    assert seen["clearedWhenFixed"] == ""  # the message goes as soon as the field is right
    assert seen["buttonMovedBy"] == 0  # messages keep their own line: nothing moves under the pointer
    assert seen["invalidFieldShowsFocus"] is True  # a field with a problem still shows where the keyboard is


def test_a_good_submit_goes_through_and_the_controls_follow_the_reset(seen):
    assert seen["busy"] == "true"
    assert seen["afterGoodSubmit"] == {"rows": 11, "saved": "Work order created.", "where": "Choose…", "due": "Choose a date"}
    assert set(seen["messagesAfterReset"].values()) == {""}


def test_lists_open_above_a_modal_dialog_and_escape_closes_only_the_list(seen):
    assert seen["inDialog"] == {"reachable": True} and seen["dialogStaysOpen"] is True


def test_on_a_phone_the_list_docks_to_the_bottom(seen):
    assert seen["phone"]["width"] >= 370 and seen["phone"]["gapBelow"] <= 12 and seen["phone"]["row"] >= 44


def test_no_serious_accessibility_violations(seen):
    if "axe" not in seen:
        pytest.skip("axe-core not installed")
    for state, violations in seen["axe"].items():
        assert [line for line in violations if line.startswith(("serious", "critical"))] == [], state
