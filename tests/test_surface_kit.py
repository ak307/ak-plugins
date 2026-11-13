"""surface-kit.js: the dropdown, date picker, menu, row selection and form feedback behave as documented,
and the real <select> and <input> underneath keep their values and events."""
import json
import os
import re
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
    shutil.copy(PAGE.parent / "blank.html", site / "blank.html")
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


def test_a_menu_action_can_open_a_dialog_and_keep_focus_there(seen):
    assert seen["dialog"] == {"open": True, "focusInside": True}
    assert seen["dialogClosed"] is True


def test_the_material_answers_the_user(seen):
    assert seen["lensAtRest"]["thumb"] == seen["lensAtRest"]["chip"] and seen["lensAtRest"]["width"]
    assert seen["lensAfterChoice"]["thumb"] == seen["lensAfterChoice"]["chip"]  # the lens flowed to the chosen chip
    assert seen["lensAfterChoice"]["thumb"] != seen["lensAtRest"]["thumb"]
    assert seen["glide"]["state"] == "on" and seen["glide"]["top"] == seen["glide"]["row"]
    assert seen["barAtRest"] is False and seen["barOverContent"] is True  # glass frosts once content is under it


def test_reduced_motion_keeps_the_function_and_drops_the_movement(seen):
    assert seen["reduced"] == {"arriving": 0, "lens": True}


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
    assert seen["afterGoodSubmit"] == {"rows": 11, "saved": "Created", "where": "Choose…", "due": "Choose a date"}  # the button's own tick
    assert set(seen["messagesAfterReset"].values()) == {""}


def test_a_fast_answer_shows_no_indicator_and_a_slow_one_shows_it_long_enough(seen):
    feedback = seen["feedback"]
    assert feedback["fast"] == {"states": ["loading:quiet", "success"], "text": "1,2", "keptSpace": True}
    assert feedback["slow"]["states"] == ["loading:quiet", "success"] and feedback["slow"]["visible"] == "visible"
    assert feedback["slow"]["shownFor"] >= 430  # shown at 300 ms, kept for at least 450


def test_loading_ends_in_the_right_state(seen):
    feedback = seen["feedback"]
    assert feedback["empty"] == "empty"
    assert feedback["failed"] == {"state": "error", "message": "The list couldn't be loaded.", "alert": "alert"}
    assert feedback["retried"] == {"whileRetrying": "retrying", "state": "success", "text": "9"}
    assert feedback["latestOnly"] == "new"  # an older answer arriving late is dropped


def test_a_failed_refresh_keeps_what_was_loaded(seen):
    refresh = seen["feedback"]["refresh"]
    assert refresh["whileRefreshing"] == {"state": "refreshing", "content": "block"}
    assert refresh["state"] == "success" and refresh["text"] == "5,6"
    assert len(refresh["notice"]) == 1 and "Try again" in refresh["notice"][0]


def test_a_committing_button_sends_once_and_confirms_only_after_the_answer(seen):
    commit = seen["feedback"]["commit"]
    assert commit["requests"] == 1 and commit["ignored"] is True and commit["ignoredDuringTick"] is True
    assert commit["early"] == "Save changes"  # no flicker in the first moments
    assert commit["working"] == {"label": "Saving…", "spinner": True, "disabled": "true", "busy": "true", "focused": True,
                                 "sameWidth": True, "state": "processing"}
    assert commit["ok"] is True and commit["data"] == "saved"
    assert commit["confirmed"] == {"label": "Saved", "tick": True, "state": "success"}
    assert commit["after"] == {"label": "Save changes", "state": "idle", "disabled": False}
    assert seen["feedback"]["commitFast"] == {"early": "Save changes", "then": "Saved"}  # a quick answer goes straight to the tick


def test_a_failed_commit_leaves_the_button_ready_and_says_what_happened(seen):
    failed = seen["feedback"]["commitFailed"]
    assert failed == {"ok": False, "kind": "failed", "label": "Save changes", "disabled": False,
                      "notice": "That didn't go through. Your details are still here.", "retry": True, "role": "alert"}


def test_a_timeout_is_not_called_a_failure_and_is_never_retried_blindly(seen):
    timeout = seen["feedback"]["timeout"]
    assert timeout["ok"] is False and timeout["kind"] == "timeout"
    assert "couldn't confirm" in timeout["notice"] and timeout["retry"] is False
    assert seen["feedback"]["timeoutVerified"] is True  # with a way to check, it checks before saying anything


def test_notices_leave_or_stay_by_their_tone(seen):
    assert seen["feedback"]["toasts"] == {"okGone": True, "badStays": True, "tick": True, "atMost": 3}


def test_progress_never_shows_a_figure_it_was_not_given(seen):
    progress = seen["feedback"]["progress"]
    assert progress["unknownProgress"] == {"now": None, "indeterminate": True}
    assert progress["known"] == {"now": "40", "indeterminate": False, "status": "4 of 10 pages"}
    assert progress["done"] == {"state": "success", "tick": True, "text": "Report ready"}


def test_a_critical_error_is_thick_glass_that_stays_readable_over_anything(seen):
    critical = seen["feedback"]["critical"]
    assert critical["role"] == "alertdialog" and critical["open"] is True and critical["chosen"] == "recreate"
    assert critical["glass"] is True and critical["tint"] == 0.9 and critical["mark"] is True
    # Worst case: a black page behind the light dialog, a white page behind the dark one.
    assert critical["contrastLight"] >= 7 and critical["contrastDark"] >= 7, critical


def test_the_page_recovers_from_a_failed_load_and_commits_once_from_a_dialog(seen):
    assert seen["pageFailed"] == {"message": "The work orders couldn't be loaded.", "rows": 0}
    assert seen["pageRetried"]["state"] == "success" and seen["pageRetried"]["rows"] == 10
    assert seen["pageRetried"]["calls"] == ["load orders", "load orders"]
    assert seen["noticeInDialog"] == {"insideDialog": True, "reachable": True}
    assert seen["assigned"]["calls"] == 1 and seen["assigned"]["dialogOpen"] is False
    assert seen["assigned"]["notice"].startswith("Assigned to") and seen["assigned"]["action"] == "Undo"


def test_lists_open_above_a_modal_dialog_and_escape_closes_only_the_list(seen):
    assert seen["inDialog"] == {"reachable": True} and seen["dialogStaysOpen"] is True


def test_on_a_phone_the_list_docks_to_the_bottom(seen):
    assert seen["phone"]["width"] >= 370 and seen["phone"]["gapBelow"] <= 12 and seen["phone"]["row"] >= 44


def test_no_serious_accessibility_violations(seen):
    if "axe" not in seen:
        pytest.skip("axe-core not installed")
    for state, violations in seen["axe"].items():
        assert [line for line in violations if line.startswith(("serious", "critical"))] == [], state


# ---- configuration: the kit decides how things look and behave; the product decides what they say


def test_nothing_the_user_reads_or_hears_is_left_in_english_once_every_label_is_replaced(seen):
    localised = seen["localised"]
    assert localised["latin"] == [], localised["latin"]
    # The paths this test walks; the rest (offline, signed out, …) use the same lookup.
    not_walked = {"stillWorking", "load.offline", "load.timeout", "load.signed-out", "load.denied", "load.invalid",
                  "commit.offline", "commit.signed-out", "commit.denied", "commit.invalid"}
    assert set(localised["all"]) - set(localised["seen"]) == not_walked
    assert localised["dateShown"] == "၂၀၂၆ နိုဝင်ဘာ ၁၈"  # the product's own names, order and digits
    # Burmese letters stack: controls get more room between lines.
    assert round(float(localised["leading"].rstrip("px")) / float(localised["fontSize"].rstrip("px")), 2) == 1.6


def test_the_script_and_the_stylesheet_hold_no_wording_of_their_own():
    script = (ASSETS / "surface-kit.js").read_text()
    code = re.sub(r"(^|\s)//.*$", "", script, flags=re.MULTILINE)
    start = code.index("const DEFAULT_LABELS = {")
    code = code[:start] + code[code.index("\n};", start):]
    literals = re.findall(r'"([^"\n]*)"|\'([^\'\n]*)\'|`([^`]*)`', code)
    for_developers = {"No answer in time", "error retrying", "tbody tr", "success refreshing"}
    keys = {"Escape", "Enter", "Tab", "Home", "End"}
    wording = []
    for parts in literals:
        text = "".join(parts)  # one of the three quote styles matched
        if text in for_developers or text in keys or text.startswith("surface-kit:") or re.search(r"[\[\]()>=]|\.ws-", text):
            continue  # messages for developers, key names, selectors and CSS values
        if re.search(r"[A-Za-z]{2,} [A-Za-z]{2,}", text) or re.fullmatch(r"[A-Z][a-z]+[…!?.]?", text):
            wording.append(text)
    assert wording == []
    styles = (ASSETS / "surface-kit.css").read_text()
    assert re.findall(r'content:\s*"[^"]*[A-Za-z]{2,}[^"]*"', styles) == []


def test_right_to_left_the_kit_mirrors_itself_and_dates_follow_the_locale(seen):
    rtl = seen["rtl"]
    assert rtl["list"] == {"alignedRight": True, "widerThanButton": True}
    assert rtl["thumbRests"] == "2px" and rtl["thumbMoves"].startswith("-20px")
    calendar = rtl["calendar"]
    assert calendar["firstColumn"] == calendar["saturday"]  # the Egyptian week starts on Saturday
    assert calendar["heading"] == 1  # one letter: an Arabic "short" day name is the whole word
    assert re.fullmatch(r"[\u0660-\u0669]+", calendar["digits"])  # ١٨, not 18
    assert calendar["arrowMirrored"] == "-1 1" and calendar["afterArrowLeft"] == "2026-11-19"
    assert rtl["noticeOnTheLeft"] is True and rtl["sideways"] is False


def test_tokens_have_floors_and_a_broken_token_never_breaks_the_page(seen):
    tokens = seen["tokens"]
    # Set far too low (0.3, 0.05, 0.1, 0.2): each is raised to its floor, so text stays readable.
    assert tokens["solid"] == pytest.approx(0.88) and tokens["clear"] == pytest.approx(0.35)
    assert tokens["frost"] == pytest.approx(0.6) and tokens["critical"] == pytest.approx(0.85)
    assert tokens["control"] == 32  # a 12px control height is raised to something that can be pressed
    assert tokens["emerge"] == 900  # the script's animations use the stylesheet's motion tokens
    assert tokens["easing"].replace(" ", "") == "cubic-bezier(0.25,1.2,0.45,1)"  # "banana" is not an easing: the default is used
    assert tokens["dialogWidth"] == 300


def test_configure_takes_only_the_kits_own_labels_and_only_as_text(seen):
    configured = seen["configured"]
    assert configured["warnings"] == 4  # "nonsense", "load.other" and the two "__proto__" entries are not labels
    assert configured["polluted"] is False and configured["frozen"] is True and configured["warnsAboutDates"] is True
    assert configured["plural"] == ["1 row", "1,200 rows"] and configured["percent"] == "42%"
    assert configured["dual"] == "صفّان"  # Arabic has a form for exactly two
    assert configured["weekStartsUS"] == "Sun" and configured["weekStartsSet"] == "Mon"


def test_a_dialog_says_and_does_what_the_product_decides_and_never_starts_on_a_destructive_action(seen):
    dialog = seen["asked"]
    assert dialog["role"] == "alertdialog" and dialog["critical"] is False and dialog["mark"] is False and dialog["size"] == "medium"
    assert dialog["buttons"] == ["Delete", "Keep them", "Archive instead"] and dialog["firstVariant"] == "danger"
    assert dialog["focus"] == "Keep them"  # not the destructive one, even though it is marked primary
    assert dialog["chosen"] == "archive" and dialog["defaultAction"] == "OK" and dialog["dismissed"] == "dismissed"
    assert dialog["serious"] == {"critical": True, "icon": "M4 7h8v6H4zM6 7V5a2 2 0 0 1 4 0v2", "size": "large"}
