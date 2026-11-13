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
    // A press that lands while the tick is showing (a double click after a fast answer) sends nothing.
    const duringTick = await kit.commit(button, () => { requests += 1; return after(10)(); });
    await pause(1600);
    result.commit = { requests, ignored: second.ignored === true, ignoredDuringTick: duringTick.ignored === true, early, working, ok: done.ok, data: done.data, confirmed,
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
    // Text contrast in the worst case: the darkest page behind a light dialog, the lightest behind a dark one.
    const numbers = (colour) => (colour.match(/[\d.]+/g) || []).map(Number);
    const over = (top, alpha, under) => top.map((value, index) => value * alpha + under[index] * (1 - alpha));
    const light = (colour) => colour.map((value) => (value / 255 <= 0.03928 ? value / 255 / 12.92 : ((value / 255 + 0.055) / 1.055) ** 2.4))
      .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
    const worstContrast = (behind) => {
      const [red, green, blue, alpha = 1] = numbers(getComputedStyle(critical).backgroundColor);
      const dim = numbers(getComputedStyle(critical, "::backdrop").backgroundColor);
      const ground = over([red, green, blue], alpha, over(dim.slice(0, 3), dim[3] ?? 1, behind));
      const text = numbers(getComputedStyle(critical.querySelector(".ws-dialog-text")).color).slice(0, 3);
      const [high, low] = [light(ground), light(text)].sort((first, second) => second - first);
      return Math.round(((high + 0.05) / (low + 0.05)) * 10) / 10;
    };
    const facts = { role: critical.getAttribute("role"), open: critical.open, glass: getComputedStyle(critical).backdropFilter !== "none",
      tint: numbers(getComputedStyle(critical).backgroundColor)[3], mark: Boolean(critical.querySelector(".ws-dialog-mark")), contrastLight: worstContrast([0, 0, 0]) };
    document.documentElement.dataset.theme = "dark";
    facts.contrastDark = worstContrast([255, 255, 255]);
    document.documentElement.dataset.theme = "light";
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
  // ---- Configuration: wording, language, icons, tokens, direction (blank.html: an empty stage).
  async function blank({ lang = "en", dir = "ltr" } = {}) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const stage = await context.newPage();
    stage.on("pageerror", (error) => errors.push(String(error)));
    await stage.goto(url.replace(/index\.html.*$/, `blank.html?lang=${lang}&dir=${dir}`), { waitUntil: "load" });
    await stage.waitForFunction(() => window.kit);
    return stage;
  }

  // Every label replaced, a Burmese locale, and Burmese content: no English may be left anywhere
  // the user can read or hear it — text, names for screen readers, placeholders.
  page = await blank({ lang: "my" });
  out.localised = await page.evaluate(async () => {
    const kit = window.kit;
    const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const marked = (labels, path = "") => Object.fromEntries(Object.entries(labels).map(([name, value]) => [name,
      typeof value === "object" ? marked(value, `${path}${name}.`) : `⟦${path}${name}⟧${value.includes("{title}") ? "{title}" : ""}`]));
    // Chrome has no Burmese date data, so the product gives the calendar its names, order and digits.
    kit.configure({ locale: "my-MM", digits: "mymr", labels: marked(kit.defaults.labels), calendar: {
      months: ["ဇန်နဝါရီ", "ဖေဖော်ဝါရီ", "မတ်", "ဧပြီ", "မေ", "ဇွန်", "ဇူလိုင်", "ဩဂုတ်", "စက်တင်ဘာ", "အောက်တိုဘာ", "နိုဝင်ဘာ", "ဒီဇင်ဘာ"],
      weekdays: ["နွေ", "လာ", "ဂါ", "ဟူး", "တေး", "ကြာ", "နေ"], value: "{year} {month} {day}", title: "{month} {year}", spoken: "{weekday} {year} {month} {day}" } });
    const stage = document.getElementById("stage");
    stage.innerHTML = `<form data-ws-validate novalidate>
      <div class="ws-field"><label class="ws-label" for="name">အမည်</label><input class="ws-input" id="name" required></div>
      <div class="ws-field"><label class="ws-label" for="mail">အီးမေးလ်</label><input class="ws-input" id="mail" type="email"></div>
      <div class="ws-field"><label class="ws-label" for="count">အရေအတွက်</label><input class="ws-input" id="count" type="number" min="5"></div>
      <select class="ws-select" id="place" aria-label="နေရာ" data-search><option>တစ်</option><option>နှစ်</option></select>
      <select class="ws-select" id="bare"><option>သုံး</option></select>
      <input type="date" class="ws-date" id="day" aria-label="နေ့စွဲ">
      <input type="date" class="ws-date" id="chosen" aria-label="ရက်" value="2026-11-18">
      <button class="ws-button" type="button" id="go">သိမ်းမည်</button></form>`;
    kit.enhance(stage);
    const heard = [];
    const snap = () => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) if (!walker.currentNode.parentElement.closest("script, style")) heard.push(walker.currentNode.nodeValue);
      for (const element of document.querySelectorAll("*")) {
        for (const name of ["aria-label", "placeholder", "title", "alt", "data-empty", "aria-valuetext"]) if (element.hasAttribute(name)) heard.push(element.getAttribute(name));
      }
    };
    const escape = (target) => target.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    const fail = () => Promise.reject(Object.assign(new Error("x"), { status: 500 }));
    const region = () => stage.appendChild(document.createElement("div"));

    document.getElementById("mail").value = "x";
    document.getElementById("count").value = "1";
    for (const id of ["name", "mail", "count"]) kit.checkField(document.getElementById(id));
    snap();
    document.querySelector("#place ~ button").click();
    await pause(60);
    const search = document.querySelector(".ws-popover-search");
    search.value = "zzz";
    search.dispatchEvent(new Event("input"));
    snap();
    escape(search);
    document.querySelector("#day ~ button").click();
    await pause(60);
    snap();
    escape(document.querySelector(".ws-calendar"));

    kit.load(region(), fail);
    kit.load(region(), () => Promise.resolve([]));
    let calls = 0;
    const list = kit.load(region(), () => ((calls += 1) === 1 ? Promise.resolve([1]) : fail()), { render() {} });
    await pause(700);
    list.reload();
    await pause(700);
    snap();

    const button = document.getElementById("go");
    const saving = kit.commit(button, () => pause(600));
    await pause(400);
    snap();
    await saving;
    snap();
    await pause(1600);
    await kit.commit(button, fail);
    snap();
    const checking = kit.commit(button, () => new Promise(() => {}), { timeout: 100, verify: () => pause(250).then(() => false) });
    await pause(230);
    snap();
    await checking;
    snap();

    kit.toast("အောင်မြင်", { tone: "ok" });
    const job = kit.progress("အစီရင်ခံစာ", { onCancel() {} });
    snap();
    job.element.querySelector(".ws-toast-action").click();
    kit.progress("အစီရင်ခံစာ").done();
    kit.progress("အစီရင်ခံစာ").fail(undefined, { retry() {} });
    snap();
    const asked = kit.dialog({ title: "ခေါင်းစဉ်", message: "စာသား" });
    snap();
    document.querySelector("dialog[open] .ws-button").click();
    await asked;

    const all = heard.join(" ");
    return { seen: [...new Set(all.match(/⟦[^⟧]*⟧/g))].map((mark) => mark.slice(1, -1)).sort(),
      latin: [...new Set(all.replace(/⟦[^⟧]*⟧/g, "").match(/[A-Za-z]{2,}/g) || [])],
      all: Object.entries(kit.defaults.labels).flatMap(([name, value]) => (typeof value === "object" ? Object.keys(value).map((key) => `${name}.${key}`) : [name])),
      dateShown: document.querySelector("#chosen ~ button .ws-date-value").textContent,
      leading: getComputedStyle(document.getElementById("name")).lineHeight, fontSize: getComputedStyle(document.getElementById("name")).fontSize };
  });
  await page.close();

  // Right to left: the kit mirrors itself, and dates follow the locale (digits, first day of the week).
  page = await blank({ lang: "ar", dir: "rtl" });
  out.rtl = await page.evaluate(async () => {
    const kit = window.kit;
    const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    kit.configure({ locale: "ar-EG" });
    const stage = document.getElementById("stage");
    stage.innerHTML = `<div class="ws-toolbar"><select class="ws-select" id="place" aria-label="الموقع"><option>برج</option><option>مبنى المكتبة المدنية الرئيسي</option></select></div>
      <p><input type="checkbox" class="ws-switch" id="on" aria-label="تشغيل"></p>
      <p><input type="date" class="ws-date" id="day" aria-label="التاريخ" value="2026-11-18"></p>`;
    kit.enhance(stage);
    const facts = {};
    const trigger = document.querySelector("#place ~ button");
    trigger.click();
    await pause(500);
    const list = document.querySelector(".ws-listbox").getBoundingClientRect();
    const box = trigger.getBoundingClientRect();
    facts.list = { alignedRight: Math.abs(list.right - box.right) <= 1, widerThanButton: list.width > box.width + 20 };
    trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    const toggle = document.getElementById("on");
    facts.thumbRests = getComputedStyle(toggle, "::after").right;
    toggle.checked = true;
    await pause(500); // its travel is a transition
    facts.thumbMoves = getComputedStyle(toggle, "::after").translate;
    document.querySelector("#day ~ button").click();
    await pause(500);
    const saturday = new Date(2026, 10, 14);
    facts.calendar = { firstColumn: document.querySelector(".ws-weekday").getAttribute("aria-label"), saturday: new Intl.DateTimeFormat("ar-EG", { weekday: "long" }).format(saturday),
      heading: document.querySelector(".ws-weekday").textContent.length,
      digits: document.querySelector('.ws-day[data-date="2026-11-18"]').textContent, arrowMirrored: getComputedStyle(document.querySelector(".ws-calendar-step .ws-icon")).scale };
    document.querySelector(".ws-calendar-grid").dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    facts.calendar.afterArrowLeft = document.activeElement.dataset.date;
    document.querySelector(".ws-calendar").dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    const note = kit.toast("تم الحفظ", { tone: "ok" });
    await pause(450);
    const where = note.element.getBoundingClientRect();
    facts.noticeOnTheLeft = where.right < innerWidth / 2;
    facts.sideways = document.documentElement.scrollWidth > innerWidth;
    return facts;
  });
  await page.close();

  // Tokens: floors hold, sizes and motion follow the tokens, and a broken token never breaks the page.
  page = await blank();
  out.tokens = await page.evaluate(async () => {
    const kit = window.kit;
    const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const root = document.documentElement.style;
    const set = { "--ws-solid": "0.3", "--ws-clear": "0.05", "--ws-frost": "0.1", "--ws-critical": "0.2", "--ws-atmosphere": "3", "--ws-height": "12px",
      "--ws-emerge": "900ms", "--ws-settle": "banana", "--ws-dialog-small": "300px" };
    for (const [name, value] of Object.entries(set)) root.setProperty(name, value);
    const stage = document.getElementById("stage");
    stage.innerHTML = `<div class="ws-toolbar" id="bar">Bar</div><div class="ws-group" id="group">Group</div>
      <select class="ws-select" id="site" aria-label="Site"><option>One</option><option>Two</option></select>`;
    kit.enhance(stage);
    const alpha = (element) => {
      const parts = getComputedStyle(element).backgroundColor.match(/[\d.]+/g).map(Number);
      return parts.length > 3 ? parts[3] : 1;
    };
    document.querySelector("#site ~ button").click();
    const panel = document.querySelector(".ws-listbox");
    const opening = panel.wsMotion.effect.getTiming();
    const facts = { solid: alpha(document.getElementById("group")), clear: alpha(document.getElementById("bar")), frost: alpha(panel), control: document.querySelector("#site ~ button").offsetHeight,
      emerge: opening.duration, easing: opening.easing };
    document.querySelector("#site ~ button").dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    const shown = kit.errorDialog({ title: "Deleted", message: "Someone removed it." });
    await pause(50);
    const sheet = document.querySelector("dialog[data-critical]");
    facts.critical = alpha(sheet);
    facts.dialogWidth = sheet.offsetWidth; // its laid-out width: it is still growing into place
    sheet.querySelector(".ws-button").click();
    await shown;
    return facts;
  });
  await page.close();

  // configure(): only the kit's own labels, only as text; helpers follow the locale.
  page = await blank();
  out.configured = await page.evaluate(() => {
    const kit = window.kit;
    const warnings = [];
    const warn = console.warn;
    console.warn = (text) => warnings.push(String(text));
    kit.configure({ labels: JSON.parse('{"nonsense":"x","__proto__":{"polluted":"yes"},"today":42,"load":{"__proto__":{"polluted":"yes"},"empty":"Nothing to show","other":"x"}}'),
      icons: JSON.parse('{"__proto__":{"polluted":"yes"},"star":"M2 2h12"}') });
    console.warn = warn;
    const facts = { warnings: warnings.length, polluted: "polluted" in {}, frozen: Object.isFrozen(kit.defaults.labels) && Object.isFrozen(kit.defaults.labels.load) };
    // A language this browser has no date data for: the developer is told, instead of users getting English dates.
    console.warn = (text) => warnings.push(String(text));
    kit.configure({ locale: "my-MM" });
    console.warn = warn;
    facts.warnsAboutDates = warnings.length === facts.warnings + 1 && warnings.at(-1).includes("my-MM");
    kit.configure({ locale: "en" });
    facts.plural = [kit.plural(1, { one: "{count} row", other: "{count} rows" }), kit.plural(1200, { one: "{count} row", other: "{count} rows" })];
    facts.percent = kit.number(0.42, { style: "percent" });
    kit.configure({ locale: "ar" });
    facts.dual = kit.plural(2, { two: "صفّان", other: "{count} صفوف" });
    const firstColumn = () => {
      const stage = document.getElementById("stage");
      stage.innerHTML = '<input type="date" class="ws-date" aria-label="Day" value="2026-11-18">';
      kit.enhance(stage);
      stage.querySelector("button.ws-date").click();
      const name = document.querySelector(".ws-calendar .ws-weekday").textContent;
      stage.replaceChildren();
      document.querySelectorAll(".ws-calendar").forEach((panel) => panel.remove());
      return name;
    };
    kit.configure({ locale: "en-US" });
    facts.weekStartsUS = firstColumn();
    kit.configure({ weekStart: 1 });
    facts.weekStartsSet = firstColumn();
    return facts;
  });
  await page.close();

  // dialog(): the product decides the words, the buttons, the icon and whether it is critical.
  page = await blank();
  out.asked = await page.evaluate(async () => {
    const kit = window.kit;
    const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const asked = kit.dialog({ title: "Delete 3 work orders?", message: "This can't be undone.",
      actions: [{ label: "Delete", value: "delete", danger: true, primary: true }, { label: "Keep them", value: "keep" }, { label: "Archive instead", value: "archive" }] });
    await pause(100);
    let sheet = document.querySelector("dialog[open]");
    const buttons = [...sheet.querySelectorAll(".ws-button")];
    const facts = { role: sheet.getAttribute("role"), critical: sheet.hasAttribute("data-critical"), mark: Boolean(sheet.querySelector(".ws-dialog-mark")),
      buttons: buttons.map((button) => button.textContent), focus: document.activeElement.textContent, size: sheet.dataset.size, firstVariant: buttons[0].dataset.variant };
    buttons[2].click();
    facts.chosen = await asked;
    const plain = kit.dialog({ title: "Saved on another device" });
    await pause(50);
    sheet = document.querySelector("dialog[open]");
    facts.defaultAction = sheet.querySelector(".ws-button").textContent;
    sheet.close();
    facts.dismissed = await plain;
    kit.configure({ icons: { locked: "M4 7h8v6H4zM6 7V5a2 2 0 0 1 4 0v2" } });
    const serious = kit.errorDialog({ title: "Signed out", message: "Sign in again.", icon: "locked", size: "large" });
    await pause(50);
    sheet = document.querySelector("dialog[open]");
    facts.serious = { critical: sheet.hasAttribute("data-critical"), icon: sheet.querySelector(".ws-dialog-mark path").getAttribute("d"), size: sheet.dataset.size };
    sheet.querySelector(".ws-button").click();
    await serious;
    return facts;
  });
  await page.close();

  out.pageErrors = errors;
  await browser.close();
  console.log(JSON.stringify(out));
})().catch((error) => { console.error(error); process.exit(1); });
