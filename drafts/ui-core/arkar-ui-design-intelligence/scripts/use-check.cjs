// Uses a local page the way a careful tester would and reports what it found, in one run:
// what a screenshot can't show. It does not judge taste — only behaviour that can be measured.
//
// Usage (from the project folder):
//   node <path-to>/use-check.cjs <url> [<step> ...] [--commit=<step> --count=<selector>] [--json]
//
// Without steps it checks the page as it loads:
//   load        console errors, failed requests, anything fetched from another server, layout shift
//   widths      sideways overflow from 320 to 1920 px, and controls covered by a fixed or sticky panel
//   phone       touch targets under 44 px (under 24 px is a defect), text under 12 px
//   keyboard    every Tab stop shows focus; focus is never dropped to the page
//   controls    browser-default selects, date, time and file inputs left in the page
//   slow, fail  what the user sees with ?latency=slow and ?fail=always, if the app has those switches
//   reduced     motion still running when the user asked for reduced motion
//
// With steps that open a view (click=<selector>, type=<selector>=<text>, press=<key>,
// hover=<selector>, scroll=<pixels>, wait=<ms>) it also checks, from that view:
//   refresh     the same view comes back
//   back        Back stays in the app and returns to where the user was; Forward re-opens the view
//   shift       nothing jumps while the steps run
// With --commit (the step that saves, sends or confirms) and --count (a selector whose matches
// grow by one each time it really happens) it presses twice quickly and counts the results.
//
// Each line is PASS, FIX (a defect) or LOOK (decide by looking). Safety: local URLs only; it
// runs only the steps you give it; --commit really commits, so use test data.

const { chromium } = require("playwright");

const WIDTHS = [320, 375, 390, 768, 1024, 1200, 1280, 1366, 1440, 1920];
const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\]|.*\.localhost|.*\.test)$/;

function parseArgs(argv) {
  const options = { steps: [], json: false };
  for (const arg of argv) {
    if (arg === "--json") options.json = true;
    else if (arg.startsWith("--commit=")) options.commit = arg.slice(9);
    else if (arg.startsWith("--count=")) options.count = arg.slice(8);
    else if (!options.url) options.url = arg;
    else options.steps.push(arg);
  }
  return options;
}

async function perform(page, raw) {
  const [action, ...rest] = raw.split("=");
  const value = rest.join("=");
  if (action === "click") await page.locator(value).first().click({ timeout: 5000 });
  else if (action === "hover") await page.locator(value).first().hover({ timeout: 5000 });
  else if (action === "press") await page.keyboard.press(value);
  else if (action === "type") {
    const split = value.lastIndexOf("=");
    await page.locator(value.slice(0, split)).first().fill(value.slice(split + 1));
  } else if (action === "scroll") await page.mouse.wheel(0, Number(value));
  else if (action === "wait") await page.waitForTimeout(Number(value));
  else throw new Error(`unknown step: ${raw}`);
  if (action !== "wait") await page.waitForTimeout(450);
}

// Runs in the page before its scripts: adds up layout shift that the user did not cause.
function watchShift() {
  window.__shift = 0;
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__shift += entry.value;
    }).observe({ type: "layout-shift", buffered: true });
  } catch (error) { /* not supported: the shift stays 0 */ }
}

// What the user can read on screen, as its distinct lines: two views are the same when their lines match.
const viewLines = () => [...new Set(document.body.innerText.split("\n").map((line) => line.trim())
  .filter((line) => line.length > 2 && !/\b(ago|just now|\d{1,2}:\d{2})\b/i.test(line)))];

function sameView(first, second) {
  if (!first.length && !second.length) return 1;
  const other = new Set(second);
  const shared = first.filter((line) => other.has(line)).length;
  return shared / Math.max(first.length, second.length);
}

async function readView(page) {
  return page.evaluate(`(${viewLines.toString()})()`).catch(() => []);
}

async function open(browser, url, contextOptions = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, ...contextOptions });
  await context.addInitScript(watchShift);
  const page = await context.newPage();
  const seen = { errors: [], lost: [], foreign: new Set() };
  const origin = new URL(url).origin;
  const own = (target) => target.startsWith(origin) && !target.endsWith("/favicon.ico");
  page.on("pageerror", (error) => seen.errors.push(String(error).slice(0, 140)));
  page.on("console", (message) => {
    // A file that failed to load is reported by the request checks below, not as a script error.
    if (message.type() === "error" && !/Failed to load resource/.test(message.text())) seen.errors.push(message.text().slice(0, 140));
  });
  page.on("requestfailed", (request) => {
    const aborted = /ERR_ABORTED/.test((request.failure() || {}).errorText || ""); // cancelled on purpose, e.g. a search superseded
    if (own(request.url()) && !aborted) seen.lost.push(request.url().slice(0, 100));
  });
  page.on("response", (response) => {
    if (response.status() >= 400 && own(response.url())) seen.lost.push(`${response.status()} ${response.url().slice(0, 100)}`);
  });
  page.on("request", (request) => {
    // Another local port is the app's own API in development; a public host is a dependency.
    const target = request.url();
    if (/^https?:/.test(target) && !LOCAL.test(new URL(target).hostname)) seen.foreign.add(new URL(target).host);
  });
  await page.goto(url, { waitUntil: "load", timeout: 30000 });
  await page.waitForTimeout(2200);
  return { context, page, seen };
}

// Controls that run underneath a fixed or sticky side panel. Content scrolling under a full-width bar is
// by design; a row or button that reaches under a panel beside it is a layout collision.
const coveredControls = () => {
  const panels = [...document.querySelectorAll("body *")].filter((element) => {
    const style = getComputedStyle(element);
    const box = element.getBoundingClientRect();
    return (style.position === "fixed" || style.position === "sticky") && box.width < innerWidth * 0.7
      && box.width * box.height > innerWidth * innerHeight * 0.04 && style.visibility !== "hidden" && style.pointerEvents !== "none";
  });
  const covered = [];
  if (!panels.length) return covered;
  for (const control of document.querySelectorAll("button, a[href], input, select, textarea, [role=button], [role=row], [role=option], [tabindex]")) {
    const box = control.getBoundingClientRect();
    if (box.width < 4 || box.height < 4 || box.bottom < 0 || box.top > innerHeight) continue;
    // A collision: the control and a side panel overlap, and the control reaches past the panel's edge.
    // (Whichever is drawn on top, one of them is hiding part of the other.)
    const collides = panels.some((panel) => {
      if (panel.contains(control) || control.contains(panel)) return false;
      const side = panel.getBoundingClientRect();
      const across = Math.min(box.right, side.right) - Math.max(box.left, side.left);
      const down = Math.min(box.bottom, side.bottom) - Math.max(box.top, side.top);
      return across > 8 && down > 8 && (box.left < side.left - 8 || box.right > side.right + 8);
    });
    if (collides) covered.push((control.getAttribute("aria-label") || control.innerText || control.tagName).trim().replace(/\s+/g, " ").slice(0, 30));
  }
  return covered;
};

const phoneFacts = () => {
  const visible = (element) => {
    const box = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return box.width > 0 && box.height > 0 && style.visibility !== "hidden" && style.opacity !== "0";
  };
  const name = (element) => (element.getAttribute("aria-label") || element.innerText || element.value || element.tagName).trim().replace(/\s+/g, " ").slice(0, 28);
  const tiny = [], small = [];
  for (const control of document.querySelectorAll("button, a[href], [role=button], [role=tab], input:not([type=hidden]), select, summary")) {
    if (!visible(control)) continue;
    // A small checkbox or radio inside a label is pressed through its label.
    const target = control.closest("label") || (control.id && document.querySelector(`label[for="${CSS.escape(control.id)}"]`)) || control;
    const box = target.getBoundingClientRect();
    const size = Math.min(box.width, box.height);
    // Not a touch target: hidden from sight until focused (a skip link, a screen-reader-only input).
    if (size <= 2 || box.right <= 0 || box.bottom <= 0 || box.left >= innerWidth) continue;
    if (size < 24) tiny.push(name(control)); else if (size < 44) small.push(name(control));
  }
  let smallText = 0;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const counted = new Set();
  while (walker.nextNode()) {
    const parent = walker.currentNode.parentElement;
    if (!parent || counted.has(parent) || !walker.currentNode.textContent.trim() || !visible(parent)) continue;
    counted.add(parent);
    if (parseFloat(getComputedStyle(parent).fontSize) < 12) smallText += 1;
  }
  const native = [...document.querySelectorAll("select, input[type=date], input[type=time], input[type=datetime-local], input[type=file]")].filter(visible).length;
  return { tiny, small, smallText, native };
};

// Tabs through the page; a stop passes when focusing it visibly changes it — in its own styles or,
// failing that, in the pixels around it (the ring may be drawn by a child or a pseudo-element).
async function keyboardWalk(page) {
  const unseen = [];
  let dropped = 0, count = 0;
  for (let index = 0; index < 60; index += 1) {
    await page.keyboard.press("Tab");
    const stop = await page.evaluate((number) => {
      const element = document.activeElement;
      if (!element || element === document.body || element === document.documentElement) return null;
      if (element.dataset.useCheckSeen) return { again: true };
      element.dataset.useCheckSeen = String(number);
      const read = () => {
        const style = getComputedStyle(element);
        return [style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0 ? `${style.outlineWidth} ${style.outlineColor}` : "none",
          style.boxShadow, style.borderColor, style.backgroundColor, style.textDecorationLine].join("|");
      };
      const focused = read();
      element.blur();
      const resting = read();
      element.focus({ preventScroll: true });
      const box = element.getBoundingClientRect();
      const label = (element.getAttribute("aria-label") || element.innerText || element.getAttribute("placeholder") || element.tagName).trim().replace(/\s+/g, " ").slice(0, 28);
      return { label, shows: focused !== resting, box: { x: box.x, y: box.y, width: box.width, height: box.height } };
    }, index);
    if (!stop) { dropped += 1; continue; }
    if (stop.again) break; // back at the start
    count += 1;
    if (stop.shows) continue;
    const clip = { x: Math.max(0, stop.box.x - 6), y: Math.max(0, stop.box.y - 6), width: stop.box.width + 12, height: stop.box.height + 12 };
    if (clip.width < 2 || clip.height < 2 || clip.y > 800) { unseen.push(stop.label); continue; }
    try {
      const focused = await page.screenshot({ clip, animations: "disabled", caret: "hide" });
      await page.evaluate(() => document.activeElement.blur());
      const resting = await page.screenshot({ clip, animations: "disabled", caret: "hide" });
      if (Buffer.compare(focused, resting) === 0) unseen.push(stop.label);
    } catch (error) {
      unseen.push(stop.label);
    }
    // Put focus back on this stop so the next Tab continues from here.
    await page.evaluate((number) => {
      const element = document.querySelector(`[data-use-check-seen="${number}"]`);
      if (element) element.focus({ preventScroll: true });
    }, index);
  }
  return { count, unseen, dropped };
}

function report(options, lines) {
  const fixes = lines.filter((line) => line.level === "FIX").length;
  const looks = lines.filter((line) => line.level === "LOOK").length;
  if (options.json) {
    console.log(JSON.stringify({ url: options.url, steps: options.steps, fix: fixes, look: looks, lines }));
    return;
  }
  console.log(`Use check — ${options.url}${options.steps.length ? `  (journey: ${options.steps.join(" → ")})` : ""}`);
  for (const line of lines) console.log(`  ${line.level.padEnd(4)} ${line.area.padEnd(9)} ${line.text}`);
  console.log(`${fixes} to fix, ${looks} to look at. A tool can't judge how it looks or whether the wording helps: use it yourself as well.`);
  if (!options.steps.length) console.log("Add the steps that open a view to check refresh and Back, and --commit/--count to check a double press.");
}

const firstLine = (error) => String(error).split("\n")[0].slice(0, 90);

// Runs the journey's steps. Returns the step that could not run, or null when all of them did.
async function runSteps(page, steps) {
  for (const step of steps) {
    try { await perform(page, step); } catch (error) { return `${step}: ${firstLine(error)}`; }
  }
  return null;
}

function checkLoad(seen, shift, say) {
  say(seen.errors.length ? "FIX" : "PASS", "load", seen.errors.length
    ? `${seen.errors.length} console error(s): ${seen.errors[0]}` : "no console errors");
  if (seen.foreign.size) {
    say("FIX", "load", `depends on another server (${[...seen.foreign].slice(0, 3).join(", ")}): ship fonts and assets with the product`);
  }
  if (seen.lost.length) say("FIX", "load", `${seen.lost.length} of its own files failed to load: ${seen.lost[0]}`);
  say(shift > 0.1 ? "FIX" : "PASS", "load", `layout shift while loading ${shift.toFixed(2)}${shift > 0.1 ? " (content jumps: reserve its space)" : ""}`);
}

async function checkWidths(page, say) {
  const overflow = [], covered = [];
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 800 });
    await page.waitForTimeout(250);
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) overflow.push(width);
    // Look down the page a screen at a time: a collision is often below the first screen.
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    const under = new Set();
    for (let top = 0; top < Math.min(height, 6400); top += 700) {
      await page.evaluate((y) => window.scrollTo(0, y), top);
      for (const name of await page.evaluate(`(${coveredControls.toString()})()`)) under.add(name);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    if (under.size) covered.push(`${width}px: ${under.size} (${[...under].slice(0, 2).join(", ")})`);
  }
  say(overflow.length ? "FIX" : "PASS", "widths", overflow.length ? `the page scrolls sideways at ${overflow.join(", ")} px`
    : `no sideways overflow from ${WIDTHS[0]} to ${WIDTHS[WIDTHS.length - 1]} px`);
  if (covered.length) say("FIX", "widths", `controls and a fixed or sticky side panel overlap at ${covered.slice(0, 4).join("; ")}`);
  await page.setViewportSize({ width: 1280, height: 800 });
}

async function checkKeyboard(page, say) {
  const walk = await keyboardWalk(page);
  if (!walk.count) return say("LOOK", "keyboard", "Tab reached nothing: the page has no keyboard stops");
  say(walk.unseen.length ? "FIX" : "PASS", "keyboard", walk.unseen.length
    ? `${walk.unseen.length} of ${walk.count} Tab stops show no focus: ${walk.unseen.slice(0, 4).join(", ")}` : `all ${walk.count} Tab stops show focus`);
  if (walk.dropped > 1) say("LOOK", "keyboard", `focus fell to the page ${walk.dropped} times while tabbing`);
}

async function checkPhone(browser, options, say) {
  const phone = await open(browser, options.url, { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const facts = await phone.page.evaluate(`(${phoneFacts.toString()})()`);
  say(facts.tiny.length ? "FIX" : "PASS", "phone", facts.tiny.length
    ? `${facts.tiny.length} touch targets under 24 px: ${facts.tiny.slice(0, 4).join(", ")}` : "no touch target under 24 px");
  if (facts.small.length) say("LOOK", "phone", `${facts.small.length} touch targets under 44 px: ${facts.small.slice(0, 4).join(", ")}`);
  if (facts.smallText) say("LOOK", "phone", `${facts.smallText} pieces of text under 12 px`);
  if (facts.native) say("LOOK", "controls", `${facts.native} browser-default control(s) (select, date, time or file): their pop-ups are not the product's`);
  await phone.context.close();
}

// Opens the page with one of the usual development switches and reads what the user is shown.
async function withSwitch(browser, options, name, wait, read) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  await page.goto(options.url + (options.url.includes("?") ? "&" : "?") + name, { waitUntil: "load", timeout: 30000 });
  await page.waitForTimeout(wait);
  const result = await page.evaluate(read);
  await context.close();
  return result;
}

async function checkSlowAndFail(browser, options, say) {
  const waiting = await withSwitch(browser, options, "latency=slow", 500, () => Boolean(document.querySelector(
    "[aria-busy=true], [role=progressbar], [class*=skeleton i], [class*=loading i], [class*=shimmer i]"))
    || /loading|checking|fetching/i.test(document.body.innerText));
  say(waiting ? "PASS" : "LOOK", "slow", waiting ? "a loading state shows while requests are slow (?latency=slow)"
    : "no loading state seen with ?latency=slow: either the app has no slow switch, or the wait is not designed");
  const failure = await withSwitch(browser, options, "fail=always", 3500, () => ({
    message: /couldn.t|could not|failed|didn.t load|went wrong|unable to|try again/i.test(document.body.innerText),
    retry: [...document.querySelectorAll("button, a")].some((control) => /try again|retry|reload/i.test(control.innerText)),
  }));
  say(failure.message && failure.retry ? "PASS" : "LOOK", "fail", failure.message && failure.retry
    ? "a failed load shows a message and a way to retry (?fail=always)"
    : `with ?fail=always: ${failure.message ? "a message but no retry" : "no failure message"} — either the app has no fail switch, or failure is not designed`);
}

async function checkReducedMotion(browser, options, say) {
  const calm = await open(browser, options.url, { reducedMotion: "reduce" });
  await runSteps(calm.page, options.steps);
  const moving = await calm.page.evaluate(() => document.getAnimations().filter((animation) => {
    const timing = animation.effect && animation.effect.getComputedTiming();
    return animation.playState === "running" && timing && (timing.iterations === Infinity || timing.duration > 250);
  }).length);
  say(moving ? "LOOK" : "PASS", "reduced", moving ? `${moving} animation(s) still running with reduced motion` : "reduced motion is honoured");
  await calm.context.close();
}

// Back and Forward from a view the address records.
async function checkHistory(page, options, start, opened, say) {
  await page.goBack({ waitUntil: "load" }).catch(() => {});
  await page.waitForTimeout(1200);
  if (!page.url().startsWith(new URL(options.url).origin)) return say("FIX", "back", "Back leaves the app");
  const back = sameView(start, await readView(page));
  say(back >= 0.85 ? "PASS" : "LOOK", "back", back >= 0.85 ? "Back returns to where the user was"
    : `Back stays in the app but shows a different view (${Math.round(back * 100)}% match)`);
  await page.goForward({ waitUntil: "load" }).catch(() => {});
  await page.waitForTimeout(1200);
  const forward = sameView(opened, await readView(page));
  say(forward >= 0.85 ? "PASS" : "LOOK", "back", forward >= 0.85 ? "Forward re-opens the view" : "Forward does not re-open the view");
}

// The journey: what the steps open must survive a refresh and answer to Back, and nothing may jump on the way.
async function checkJourney(browser, options, say) {
  const trip = await open(browser, options.url);
  const start = await readView(trip.page);
  const startUrl = trip.page.url();
  await trip.page.evaluate(() => { window.__shift = 0; });
  const broken = await runSteps(trip.page, options.steps);
  if (broken) {
    say("FIX", "journey", `a step could not run, so the journey was not checked — ${broken}`);
    return trip.context.close();
  }
  const moved = await trip.page.evaluate(() => window.__shift || 0);
  say(moved > 0.1 ? "FIX" : "PASS", "shift", `layout shift during the steps ${moved.toFixed(2)}${moved > 0.1 ? " (something jumped under the user)" : ""}`);
  const opened = await readView(trip.page);
  const recorded = trip.page.url() !== startUrl;
  const known = new Set(start);
  const fresh = opened.filter((line) => !known.has(line)).length;
  if (!recorded && fresh < 2 && sameView(start, opened) >= 0.97) {
    say("LOOK", "journey", "the steps did not change what is on screen, so refresh and Back were not checked: check the selectors");
    return trip.context.close();
  }
  say(recorded ? "PASS" : "LOOK", "refresh", recorded ? "the address records the view" : "the address did not change: the view can't be linked to or restored from it");
  await trip.page.reload({ waitUntil: "load" });
  await trip.page.waitForTimeout(2200);
  const reloaded = sameView(opened, await readView(trip.page));
  say(reloaded >= 0.85 ? "PASS" : "FIX", "refresh", reloaded >= 0.85 ? "a refresh returns to the same view" : `a refresh loses the view (${Math.round(reloaded * 100)}% of it came back)`);
  if (recorded) await checkHistory(trip.page, options, start, opened, say);
  else {
    await trip.page.goBack({ waitUntil: "load" }).catch(() => {});
    await trip.page.waitForTimeout(800);
    const stayed = trip.page.url().startsWith(new URL(options.url).origin);
    say(stayed ? "LOOK" : "FIX", "back", stayed ? "Back did nothing visible to the address" : "Back leaves the app instead of closing what was opened");
  }
  return trip.context.close();
}

// Presses the commit control twice in quick succession and counts how many times it really happened.
async function checkDoublePress(browser, options, say) {
  const twice = await open(browser, options.url);
  const broken = await runSteps(twice.page, options.steps);
  if (broken) {
    say("LOOK", "commit", `the double press was not checked: a step could not run — ${broken}`);
    return twice.context.close();
  }
  const before = await twice.page.locator(options.count).count();
  try {
    const button = twice.page.locator(options.commit.replace(/^click=/, "")).first();
    await button.click({ timeout: 5000 });
    await button.click({ timeout: 400, force: true }).catch(() => {}); // the second press, straight after
    await twice.page.waitForTimeout(3000);
    const added = (await twice.page.locator(options.count).count()) - before;
    say(added === 1 ? "PASS" : added > 1 ? "FIX" : "LOOK", "commit", added === 1 ? "pressing twice commits once"
      : added > 1 ? `pressing twice committed ${added} times` : "pressing twice added nothing to --count: check the selector, or the result is shown elsewhere");
  } catch (error) {
    say("LOOK", "commit", `the commit step could not run: ${firstLine(error)}`);
  }
  return twice.context.close();
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.url) {
    console.error("Usage: node use-check.cjs <url> [<step> ...] [--commit=<step> --count=<selector>] [--json]");
    process.exit(1);
  }
  if (!LOCAL.test(new URL(options.url).hostname)) {
    console.error("use-check only runs against local addresses (localhost, 127.0.0.1, *.test).");
    process.exit(1);
  }
  const lines = [];
  const say = (level, area, text) => { lines.push({ level, area, text }); };
  const browser = await chromium.launch();
  const first = await open(browser, options.url);
  checkLoad(first.seen, await first.page.evaluate(() => window.__shift || 0), say);
  await checkWidths(first.page, say);
  await checkKeyboard(first.page, say);
  await first.context.close();
  await checkPhone(browser, options, say);
  await checkSlowAndFail(browser, options, say);
  await checkReducedMotion(browser, options, say);
  if (options.steps.length) await checkJourney(browser, options, say);
  if (options.commit && options.count) await checkDoublePress(browser, options, say);
  await browser.close();
  report(options, lines);
}

main().catch((error) => { console.error(String(error)); process.exit(1); });
