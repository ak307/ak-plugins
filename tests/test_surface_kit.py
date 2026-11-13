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

DRIVER = r"""
const { chromium } = require("playwright");
const fs = require("fs");
(async () => {
  const [url, axePath] = process.argv.slice(1);
  const browser = await chromium.launch();
  const out = {};
  const errors = [];
  async function fresh(options = {}) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...options });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(String(error)));
    await page.goto(url, { waitUntil: "load" });
    return page;
  }
  const focused = (page) => page.evaluate(() => {
    const element = document.activeElement;
    return element.id || element.className || element.tagName;
  });
  const whereButton = (page) => page.locator("#where").locator("xpath=following-sibling::button");
  const settle = (page) => page.waitForTimeout(260);

  // Dropdown by keyboard: open, move, choose; the real <select> changes and says so.
  let page = await fresh();
  await whereButton(page).focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  out.activeWhileOpen = await page.evaluate(() => document.querySelector('[data-active]').textContent.trim());
  out.expandedWhileOpen = await whereButton(page).getAttribute("aria-expanded");
  await page.keyboard.press("Enter");
  await settle(page);
  out.keyboard = await page.evaluate(() => ({ value: document.getElementById("where").value, events: window.kitEvents.slice(),
    shown: document.querySelector("#where ~ button .ws-select-value").textContent, expanded: document.querySelector("#where ~ button").getAttribute("aria-expanded") }));
  out.focusAfterChoose = await focused(page);
  // Typing a name jumps to it; Escape closes without choosing and keeps focus on the button.
  await page.keyboard.type("ri");
  out.typeAhead = await page.evaluate(() => document.querySelector('[data-active]').textContent.trim());
  await page.keyboard.press("Escape");
  await settle(page);
  out.afterEscape = await page.evaluate(() => ({ value: document.getElementById("where").value, open: document.querySelector("#where ~ .ws-popover").matches(":popover-open") }));
  out.focusAfterEscape = await focused(page);
  // Space opens and, once an option is chosen with it, does not reopen the list.
  await page.keyboard.press("Space");
  await settle(page);
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Space");
  await settle(page);
  out.afterSpace = await page.evaluate(() => ({ value: document.getElementById("where").value, open: document.querySelector("#where ~ .ws-popover").matches(":popover-open") }));
  // A press on the label goes to the button.
  await page.click('label[for="where"]');
  out.focusAfterLabel = await focused(page);
  await page.close();

  // A long list gets a search box; disabled options can't be chosen.
  page = await fresh();
  await page.locator("#trade").locator("xpath=following-sibling::button").click();
  await page.keyboard.type("li");
  out.filtered = await page.evaluate(() => [...document.querySelectorAll('#trade ~ .ws-popover [role="option"]')].filter((row) => !row.hidden).map((row) => row.textContent.trim()));
  await page.keyboard.press("Enter");
  await settle(page);
  out.searchChoice = await page.evaluate(() => document.getElementById("trade").value);
  await page.locator("#trade").locator("xpath=following-sibling::button").click();
  await page.locator('#trade ~ .ws-popover [role="option"][aria-disabled="true"]').click({ force: true });
  out.disabledIgnored = await page.evaluate(() => document.getElementById("trade").value);
  await page.close();

  // Date picker: arrows, PageDown, Enter; days outside min and max can't be chosen.
  page = await fresh();
  await page.evaluate(() => { const due = document.getElementById("due"); due.value = "2026-12-10"; due.dispatchEvent(new Event("change")); });
  const dueButton = page.locator("#due").locator("xpath=following-sibling::button");
  out.dateShown = await dueButton.innerText();
  await dueButton.click();
  await settle(page);
  out.dateFocus = await page.evaluate(() => document.activeElement.dataset.date);
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("PageDown");
  out.dateMoved = await page.evaluate(() => ({ focus: document.activeElement.dataset.date, title: document.querySelector(".ws-calendar-title").textContent }));
  await page.keyboard.press("Enter");
  await settle(page);
  out.dateChosen = await page.evaluate(() => ({ value: document.getElementById("due").value, events: window.kitEvents.filter((entry) => entry.startsWith("due=")) }));
  out.focusAfterDate = await focused(page);
  await page.evaluate(() => { const due = document.getElementById("due"); due.value = "2026-11-20"; due.dispatchEvent(new Event("change")); });
  await dueButton.click();
  await settle(page);
  out.beforeMinDisabled = await page.evaluate(() => document.querySelector('.ws-day[data-date="2026-11-12"]').disabled);
  for (let press = 0; press < 12; press += 1) await page.keyboard.press("ArrowUp");
  out.clampedToMin = await page.evaluate(() => document.activeElement.dataset.date);
  await page.close();

  // One menu serves every row; the action knows which row it was opened from.
  page = await fresh();
  out.closedMenuHeight = await page.evaluate(() => document.getElementById("row-menu").getBoundingClientRect().height);
  const triggers = page.locator("[data-ws-menu]");
  await triggers.nth(0).click();
  await settle(page);
  await triggers.nth(2).click();
  await settle(page);
  out.menuTakeover = await page.evaluate(() => ({ open: document.getElementById("row-menu").matches(":popover-open"),
    expanded: [...document.querySelectorAll("[data-ws-menu]")].slice(0, 3).map((button) => button.getAttribute("aria-expanded")) }));
  out.menuFocus = await page.evaluate(() => document.activeElement.textContent.trim());
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await settle(page);
  out.menuAction = await page.evaluate(() => ({ actions: window.menuActions, row: document.querySelectorAll("#orders tbody tr")[2].dataset.id,
    open: document.getElementById("row-menu").matches(":popover-open") }));
  await page.close();

  // Row selection: shift-click selects the range; the header box shows part, all or none.
  page = await fresh();
  const boxes = page.locator("[data-ws-row]");
  await boxes.nth(0).click();
  await boxes.nth(3).click({ modifiers: ["Shift"] });
  out.range = await page.evaluate(() => ({ bulk: document.getElementById("bulk-count").textContent, hidden: document.getElementById("bulk").hidden,
    partial: document.querySelector("[data-ws-all]").indeterminate, rows: document.querySelectorAll('#orders tbody tr[aria-selected="true"]').length }));
  await page.locator("[data-ws-all]").click();
  out.all = await page.evaluate(() => document.querySelectorAll('#orders tbody tr[aria-selected="true"]').length);
  await page.click("#bulk-clear");
  out.cleared = await page.evaluate(() => ({ rows: document.querySelectorAll('#orders tbody tr[aria-selected="true"]').length, hidden: document.getElementById("bulk").hidden }));
  await page.close();

  // Form feedback: nothing while typing; a message when a field is left; submit goes to the first problem.
  page = await fresh();
  const ring = () => page.evaluate(() => getComputedStyle(document.getElementById("title")).boxShadow);
  const messages = () => page.evaluate(() => Object.fromEntries(["title", "where", "due", "notes"].map((id) => {
    const slot = document.getElementById(id).closest(".ws-field").querySelector(":scope > .ws-error");
    return [id, slot ? slot.textContent : ""];
  })));
  // Where the submit button sits inside its form (the page may scroll, the form must not grow).
  const buttonOffset = () => page.evaluate(() => Math.round(document.getElementById("create").getBoundingClientRect().top - document.getElementById("order-form").getBoundingClientRect().top));
  const createTop = await buttonOffset();
  await page.fill("#title", "Fix");
  out.whileTyping = await messages();
  await page.keyboard.press("Tab");
  out.afterLeaving = await messages();
  await page.click("#create");
  await settle(page);
  out.afterSubmit = await messages();
  out.focusAfterSubmit = await focused(page);
  out.rowsAfterBadSubmit = await page.locator("#orders tbody tr").count();
  out.buttonMovedBy = (await buttonOffset()) - createTop;
  out.invalidButton = await whereButton(page).getAttribute("aria-invalid");
  await page.waitForTimeout(250);
  const focusedRing = await ring();
  await page.evaluate(() => document.getElementById("title").blur());
  await page.waitForTimeout(250);
  out.invalidFieldShowsFocus = focusedRing !== (await ring());
  await page.focus("#title");
  await page.fill("#title", "Fix the lobby door");
  out.clearedWhenFixed = (await messages()).title;
  await whereButton(page).click();
  await page.locator('#where ~ .ws-popover [role="option"]').nth(2).click();
  await page.evaluate(() => { const due = document.getElementById("due"); due.value = "2026-12-01"; due.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.click("#create");
  out.busy = await page.getAttribute("#create", "aria-busy");
  await page.waitForTimeout(900);
  out.afterGoodSubmit = await page.evaluate(() => ({ rows: document.querySelectorAll("#orders tbody tr").length, saved: document.getElementById("saved").textContent,
    where: document.querySelector("#where ~ button .ws-select-value").textContent, due: document.querySelector("#due ~ button").innerText.trim() }));
  out.messagesAfterReset = await messages();
  await page.close();

  // Inside a modal dialog the list still opens above everything.
  page = await fresh();
  out.inDialog = await page.evaluate(async () => {
    const kit = await import("./surface-kit.js");
    const dialog = document.createElement("dialog");
    dialog.innerHTML = '<label for="floor">Floor</label><select class="ws-select" id="floor"><option>Ground</option><option>Level 1</option><option>Level 2</option></select>';
    document.body.append(dialog);
    kit.enhance(dialog);
    dialog.showModal();
    dialog.querySelector("button.ws-select").click();
    await new Promise((resolve) => setTimeout(resolve, 300));
    const option = dialog.querySelectorAll('[role="option"]')[2];
    const box = option.getBoundingClientRect();
    const top = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
    return { reachable: option.contains(top) };
  });
  await page.keyboard.press("Escape");
  await settle(page);
  out.dialogStaysOpen = await page.evaluate(() => document.querySelector("dialog").open);
  await page.close();

  // On a phone the list docks to the bottom edge at full width with large rows.
  page = await fresh({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await page.locator(".ws-toolbar button.ws-select").tap();
  await settle(page);
  out.phone = await page.evaluate(() => {
    const panel = document.querySelector(".ws-toolbar .ws-popover").getBoundingClientRect();
    return { width: Math.round(panel.width), gapBelow: Math.round(innerHeight - panel.bottom), row: Math.round(document.querySelector('.ws-toolbar [role="option"]').getBoundingClientRect().height) };
  });
  await page.close();

  // Accessibility of the page at rest, with a list open and with errors showing.
  if (axePath && fs.existsSync(axePath)) {
    page = await fresh();
    const audit = async () => {
      await page.addScriptTag({ path: axePath }).catch(() => {});
      const result = await page.evaluate(() => window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] } }));
      return result.violations.map((violation) => `${violation.impact}: ${violation.id} (${violation.nodes.length}) ${violation.nodes[0].html.slice(0, 90)}`);
    };
    out.axe = { rest: await audit() };
    await whereButton(page).click();
    await settle(page);
    out.axe.listOpen = await audit();
    await page.keyboard.press("Escape");
    await page.click("#create");
    await settle(page);
    out.axe.errors = await audit();
    await page.locator("#due").locator("xpath=following-sibling::button").click();
    await settle(page);
    out.axe.calendar = await audit();
    await page.close();
  }
  out.pageErrors = errors;
  await browser.close();
  console.log(JSON.stringify(out));
})().catch((error) => { console.error(error); process.exit(1); });
"""


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
        result = subprocess.run(["node", "-e", DRIVER, f"http://127.0.0.1:{server.server_port}/index.html", str(AXE)],
                                capture_output=True, text=True, timeout=300, cwd=site, env={**os.environ, "TZ": "Asia/Singapore"})
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
