// Drives the kit's page (index.html) through each control and prints what it observed as JSON.
// Run by tests/test_surface_kit.py: node driver.cjs <url> <path to axe.min.js>
const { chromium } = require("playwright");
const fs = require("fs");
(async () => {
  const [url, axePath] = process.argv.slice(2);
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
