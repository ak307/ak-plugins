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
    const { query, ...contextOptions } = options;
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...contextOptions });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(String(error)));
    await page.goto(url + (options.query || ""), { waitUntil: "load" });
    if (!options.query) await page.waitForSelector("#orders tbody tr"); // the table's data arrives through the kit
    return page;
  }
  const focused = (page) => page.evaluate(() => {
    const element = document.activeElement;
    return element.id || element.className || element.tagName;
  });
  const whereButton = (page) => page.locator("#where").locator("xpath=following-sibling::button");
  const settle = (page) => page.waitForTimeout(400); // the machine may be busy: leave closing animations room to finish

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
  await page.waitForFunction(() => !document.getElementById("row-menu").matches(":popover-open"), null, { timeout: 3000 }).catch(() => {});
  out.menuAction = await page.evaluate(() => ({ actions: window.menuActions, row: document.querySelectorAll("#orders tbody tr")[2].dataset.id,
    open: document.getElementById("row-menu").matches(":popover-open") }));
  // The action opened a dialog: focus stays inside it (the closing menu must not pull it back), and Escape closes it.
  out.dialog = await page.evaluate(() => ({ open: document.getElementById("assign-dialog").open,
    focusInside: document.getElementById("assign-dialog").contains(document.activeElement) }));
  await page.keyboard.press("Escape");
  await settle(page);
  out.dialogClosed = await page.evaluate(() => !document.getElementById("assign-dialog").open);
  await page.close();

  // The material answers: the lens sits under the chosen chip, the row highlight goes to the row under
  // the pointer, and the sticky bar frosts once content is under it.
  page = await fresh({ viewport: { width: 1280, height: 560 } });
  const lens = () => page.evaluate(() => {
    const thumb = document.querySelector(".ws-segmented .ws-thumb");
    const chosen = document.querySelector('.ws-segmented .ws-chip[aria-pressed="true"]');
    return { thumb: Math.round(thumb.offsetLeft), chip: Math.round(chosen.offsetLeft), width: Math.round(thumb.offsetWidth) === Math.round(chosen.offsetWidth) };
  });
  out.lensAtRest = await lens();
  out.barAtRest = await page.evaluate(() => document.querySelector(".ws-toolbar").hasAttribute("data-ws-over"));
  await page.click('.ws-chip[data-status="Done"]');
  await page.waitForTimeout(650);
  out.lensAfterChoice = await lens();
  await page.click('.ws-chip[data-status=""]');
  await page.hover("#orders tbody tr:nth-child(3) td:nth-child(2)");
  await settle(page);
  out.glide = await page.evaluate(() => {
    const wrap = document.querySelector(".ws-table-wrap");
    return { state: wrap.getAttribute("data-ws-glide"), top: wrap.style.getPropertyValue("--ws-glide-top"),
      row: `${document.querySelector("#orders tbody tr:nth-child(3)").offsetTop}px` };
  });
  await page.mouse.move(640, 300);
  await page.mouse.wheel(0, 900);
  await settle(page);
  out.barOverContent = await page.evaluate(() => document.querySelector(".ws-toolbar").hasAttribute("data-ws-over"));
  await page.close();

  // With reduced motion nothing rises on arrival, and the lens is still in place.
  page = await fresh({ reducedMotion: "reduce" });
  out.reduced = await page.evaluate(() => ({ arriving: document.querySelectorAll(".ws-arrive").length,
    lens: Math.round(document.querySelector(".ws-thumb").offsetLeft) === Math.round(document.querySelector('.ws-chip[aria-pressed="true"]').offsetLeft) }));
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
  out.afterGoodSubmit = await page.evaluate(() => ({ rows: document.querySelectorAll("#orders tbody tr").length, saved: document.getElementById("create").innerText.trim(),
    where: document.querySelector("#where ~ button .ws-select-value").textContent, due: document.querySelector("#due ~ button").innerText.trim() }));
  out.messagesAfterReset = await messages();
  await page.close();

  // ---- Feedback: the state model and its components, driven directly with requests the test controls.
  page = await fresh();
  out.feedback = await page.evaluate(async () => {
    const kit = await import("./surface-kit.js");
    const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const after = (ms, value, fails) => () => new Promise((resolve, reject) => setTimeout(() => (fails ? reject(Object.assign(new Error("down"), { status: 500 })) : resolve(value)), ms));
    const result = {};
    const makeRegion = () => {
      const region = document.createElement("div");
      region.innerHTML = '<div data-ws-when="success refreshing" class="content"></div>';
      document.body.append(region);
      const states = [];
      region.addEventListener("ws:state", (event) => states.push(event.detail.state + (region.hasAttribute("data-ws-quiet") ? ":quiet" : "")));
      const render = (data) => { region.querySelector(".content").textContent = data.join(","); };
      return { region, states, render, skeleton: () => getComputedStyle(region.querySelector('[data-ws-when~="loading"]')) };
    };

    // A fast answer never shows an indicator; a slow one shows the skeleton, and long enough to be seen.
    let made = makeRegion();
    kit.load(made.region, after(60, [1, 2]), { render: made.render });
    await pause(30);
    const keptSpace = made.skeleton().display !== "none" && made.skeleton().visibility === "hidden";
    await pause(200);
    result.fast = { states: made.states, text: made.region.querySelector(".content").textContent, keptSpace };
    made = makeRegion();
    const started = Date.now();
    kit.load(made.region, after(420, [3]), { render: made.render });
    await pause(380);
    const visible = made.skeleton().visibility;
    await new Promise((resolve) => made.region.addEventListener("ws:state", (event) => event.detail.state === "success" && resolve()));
    result.slow = { states: made.states, visible, busy: made.region.getAttribute("aria-busy"), shownFor: Date.now() - started - 300 };

    // Nothing to show is "empty"; a failure shows its message and a retry that works.
    made = makeRegion();
    kit.load(made.region, after(20, []), { render: made.render });
    await pause(120);
    result.empty = made.region.dataset.state;
    made = makeRegion();
    let calls = 0;
    kit.load(made.region, () => (calls += 1) && after(20, [9], calls === 1)(), { render: made.render, messages: { failed: "The list couldn't be loaded." } });
    await pause(150);
    result.failed = { state: made.region.dataset.state, message: made.region.querySelector("[data-ws-message]").textContent,
      alert: made.region.querySelector('[data-ws-when~="error"]').getAttribute("role") };
    made.region.querySelector("[data-ws-retry]").click();
    await pause(40);
    const whileRetrying = made.region.dataset.state;
    await pause(600);
    result.retried = { whileRetrying, state: made.region.dataset.state, text: made.region.querySelector(".content").textContent };

    // A refresh keeps what was loaded; if it fails the content stays and a notice offers to try again.
    made = makeRegion();
    let refreshFails = false;
    const handle = kit.load(made.region, () => after(20, [5, 6], refreshFails)(), { render: made.render });
    await pause(120);
    refreshFails = true;
    handle.reload();
    const whileRefreshing = { state: made.region.dataset.state, content: getComputedStyle(made.region.querySelector(".content")).display };
    await pause(500);
    result.refresh = { whileRefreshing, state: made.region.dataset.state, text: made.region.querySelector(".content").textContent,
      notice: [...document.querySelectorAll('.ws-toast[data-tone="bad"]')].map((toast) => toast.innerText.replace(/\s+/g, " ").trim()) };
    for (const toast of document.querySelectorAll(".ws-toast")) toast.remove();

    // Only the latest request counts: an older answer arriving late is dropped.
    made = makeRegion();
    const answers = [after(300, ["old"]), after(40, ["new"])];
    const racing = kit.load(made.region, () => answers.shift()(), { render: made.render });
    racing.reload();
    await pause(900);
    result.latestOnly = made.region.querySelector(".content").textContent;

    // A button that commits: one press, one request; "Saving…" only when it takes long enough to matter;
    // the tick only once the request has answered; focus and width kept.
    const button = document.createElement("button");
    button.className = "ws-button";
    button.textContent = "Save changes";
    document.querySelector("main").prepend(button);
    button.focus();
    let requests = 0;
    const width = () => Math.round(button.getBoundingClientRect().width);
    const before = width();
    const first = kit.commit(button, () => { requests += 1; return after(700, "saved")(); });
    const second = await kit.commit(button, () => { requests += 1; return after(10)(); });
    await pause(120);
    const early = button.innerText.trim();
    await pause(300);
    const working = { label: button.innerText.trim(), spinner: Boolean(button.querySelector(".ws-spinner")), disabled: button.getAttribute("aria-disabled"),
      busy: button.getAttribute("aria-busy"), focused: document.activeElement === button, sameWidth: width() === before, state: button.dataset.state };
    const done = await first;
    const confirmed = { label: button.innerText.trim(), tick: Boolean(button.querySelector(".ws-mark")), state: button.dataset.state };
    await pause(1600);
    result.commit = { requests, ignored: second.ignored === true, early, working, ok: done.ok, data: done.data, confirmed,
      after: { label: button.innerText.trim(), state: button.dataset.state, disabled: button.hasAttribute("aria-disabled") } };
    const quick = kit.commit(button, after(40, "x"));
    await pause(20);
    const quickEarly = button.innerText.trim();
    await quick;
    result.commitFast = { early: quickEarly, then: button.innerText.trim() };
    await pause(1600);

    // A failure: the button is ready again, a notice says what happened and offers to try again.
    const failed = await kit.commit(button, after(30, null, true));
    result.commitFailed = { ok: failed.ok, kind: failed.problem.kind, label: button.innerText.trim(), disabled: button.hasAttribute("aria-disabled"),
      notice: document.querySelector('.ws-toast[data-tone="bad"] .ws-toast-text').textContent, retry: Boolean(document.querySelector(".ws-toast .ws-toast-action")),
      role: document.querySelector('.ws-toast[data-tone="bad"]').getAttribute("role") };
    for (const toast of document.querySelectorAll(".ws-toast")) toast.remove();
    await pause(700);
    // A timeout is not a failure: without a way to check, it says so and offers no retry; with one, it checks.
    const unknown = await kit.commit(button, () => new Promise(() => {}), { timeout: 150 });
    result.timeout = { ok: unknown.ok, kind: unknown.problem.kind, notice: document.querySelector(".ws-toast .ws-toast-text").textContent,
      retry: Boolean(document.querySelector(".ws-toast .ws-toast-action")) };
    for (const toast of document.querySelectorAll(".ws-toast")) toast.remove();
    await pause(700);
    const checked = await kit.commit(button, () => new Promise(() => {}), { timeout: 150, verify: async () => true });
    result.timeoutVerified = checked.ok;
    await pause(1600);

    // Notices: a confirmation leaves by itself, an error stays; never more than three.
    const ok = kit.toast("Filter saved", { tone: "ok", duration: 250 });
    const bad = kit.toast("The export failed", { tone: "bad" });
    await pause(900);
    result.toasts = { okGone: !ok.element.isConnected, badStays: bad.element.isConnected, tick: true };
    for (let count = 0; count < 4; count += 1) kit.toast(`Note ${count}`);
    result.toasts.atMost = document.querySelectorAll(".ws-toast").length;
    for (const toast of document.querySelectorAll(".ws-toast")) toast.remove();

    // Background work: no percentage until the work gives a real one.
    const job = kit.progress("Building the report");
    const bar = job.element.querySelector(".ws-progress-bar");
    const unknownProgress = { now: bar.getAttribute("aria-valuenow"), indeterminate: job.element.hasAttribute("data-indeterminate") };
    job.update({ value: 0.4, status: "4 of 10 pages" });
    const known = { now: bar.getAttribute("aria-valuenow"), indeterminate: job.element.hasAttribute("data-indeterminate"), status: job.element.querySelector(".ws-progress-status").textContent };
    job.done("Report ready");
    result.progress = { unknownProgress, known, done: { state: job.element.dataset.state, tick: Boolean(job.element.querySelector(".ws-mark")), text: job.element.querySelector(".ws-progress-title").textContent } };
    job.close();

    // A critical error: a solid dialog, announced as an alert, that returns the chosen action.
    const choice = kit.errorDialog({ title: "This work order was deleted", message: "Someone removed it while you were editing. Your notes are copied below.",
      actions: [{ label: "Close", value: "close" }, { label: "Create it again", value: "recreate", primary: true }] });
    await pause(450);
    const critical = document.querySelector("dialog[data-critical]");
    const facts = { role: critical.getAttribute("role"), open: critical.open, blur: getComputedStyle(critical).backdropFilter, solid: getComputedStyle(critical).backgroundColor };
    critical.querySelector('[data-variant="primary"]').click();
    result.critical = { ...facts, chosen: await choice };
    return result;
  });
  await page.close();

  // On the page itself: a failed load shows its message and a retry that works; a notice raised while a
  // dialog is open can still be pressed.
  page = await fresh({ query: "?fail=1" });
  await page.waitForSelector("#orders-region[data-state='error']");
  out.pageFailed = await page.evaluate(() => ({ message: document.querySelector("#orders-region [data-ws-message]").textContent, rows: document.querySelectorAll("#orders tbody tr").length }));
  await page.click("#orders-region [data-ws-retry]");
  await page.waitForSelector("#orders tbody tr");
  out.pageRetried = await page.evaluate(() => ({ state: document.getElementById("orders-region").dataset.state, rows: document.querySelectorAll("#orders tbody tr").length, calls: window.serverCalls }));
  await page.close();
  page = await fresh();
  await page.locator("[data-ws-menu]").nth(1).click();
  await page.locator('#row-menu [data-action="assign"]').click();
  await page.waitForTimeout(450);
  out.noticeInDialog = await page.evaluate(async () => {
    const kit = await import("./surface-kit.js");
    const notice = kit.toast("Connection lost", { tone: "bad" });
    await new Promise((resolve) => setTimeout(resolve, 400));
    const close = notice.element.querySelector(".ws-notice-close").getBoundingClientRect();
    const top = document.elementFromPoint(close.left + close.width / 2, close.top + close.height / 2);
    const facts = { insideDialog: document.getElementById("assign-dialog").contains(notice.element), reachable: notice.element.contains(top) };
    notice.element.remove();
    return facts;
  });
  await page.keyboard.press("Escape");
  // The dialog's own button: it commits, shows its tick, then the dialog recedes and a notice offers Undo.
  await page.locator("[data-ws-menu]").nth(1).click();
  await page.locator('#row-menu [data-action="assign"]').click();
  await page.click("#assign-confirm");
  await page.click("#assign-confirm", { force: true }).catch(() => {});
  await page.waitForSelector(".ws-toast .ws-toast-action");
  out.assigned = await page.evaluate(() => ({ calls: window.serverCalls.filter((name) => name === "assign order").length, dialogOpen: document.getElementById("assign-dialog").open,
    notice: document.querySelector(".ws-toast .ws-toast-text").textContent, action: document.querySelector(".ws-toast .ws-toast-action").textContent }));
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
    await new Promise((resolve) => setTimeout(resolve, 600));
    const option = dialog.querySelectorAll('[role="option"]')[2];
    const box = option.getBoundingClientRect();
    const top = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
    return { reachable: option.contains(top) };
  });
  await page.keyboard.press("Escape");
  await settle(page);
  out.dialogStaysOpen = await page.evaluate(() => document.querySelector("dialog:not(.ws-dialog)").open);
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
