// Walks a local page the way a user would and reports how every interactive
// element responds: hover, keyboard focus and press feedback, transitions,
// and what happens when it's clicked (loading, dialogs, toasts, layout jumps).
// Saves frames for each click so the premium pass can be judged by eye.
//
// Usage (from the project folder):
//   node <path-to>/interaction-probe.cjs <url> [output-folder] [--size=1440x900] [--max-clicks=12]
//
// Safety: local URLs only; never clicks anything whose text looks destructive
// or sends data (delete, remove, deactivate, reject, submit, send, pay, log out),
// and stays on the page (links to other pages are inspected, not followed).

const fs = require("node:fs");
const path = require("node:path");

function loadPlaywright() {
  const candidates = [path.join(process.cwd(), "node_modules", "playwright"), "playwright",
    path.join(require("node:os").homedir(), ".arkar", "playwright", "node_modules", "playwright")];
  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch {
      // try the next location
    }
  }
  console.error("Playwright not found. Install once: npm install --prefix ~/.arkar/playwright playwright && npx --prefix ~/.arkar/playwright playwright install chromium");
  process.exit(1);
}

function isLocalUrl(url) {
  const host = new URL(url).hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host.endsWith(".test") || host.endsWith(".localhost");
}

const RISKY = /delete|remove|deactivate|disable|reject|revoke|submit|send|pay|purchase|log ?out|sign ?out|archive|reset|clear all/i;

// Runs in the page: list the interactive elements with a stable id and their resting look.
function listInteractive() {
  const selector = "button, a[href], [role=button], [role=tab], [role=menuitem], [role=switch], select, summary, input[type=checkbox], input[type=radio], [tabindex='0']";
  const visible = (element) => {
    const box = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return box.width > 0 && box.height > 0 && style.visibility !== "hidden" && style.display !== "none" && Number(style.opacity) > 0.05;
  };
  const items = [];
  document.querySelectorAll(selector).forEach((element, index) => {
    if (!visible(element)) return;
    element.setAttribute("data-probe-id", String(index));
    const label = (element.getAttribute("aria-label") || element.innerText || element.value || element.title || element.tagName).trim().replace(/\s+/g, " ").slice(0, 40);
    const href = element.getAttribute("href") || "";
    items.push({
      id: String(index), tag: element.tagName.toLowerCase(), role: element.getAttribute("role") || "", label, href,
      sameDocument: !href || href.startsWith("#") || href.startsWith("javascript"),
      size: Math.round(element.getBoundingClientRect().width) + "x" + Math.round(element.getBoundingClientRect().height),
    });
  });
  return items;
}

function lookOf(id) {
  const element = document.querySelector(`[data-probe-id="${id}"]`);
  if (!element) return null;
  const style = getComputedStyle(element);
  return {
    background: style.backgroundColor, color: style.color, border: style.borderColor, shadow: style.boxShadow,
    outline: `${style.outlineStyle} ${style.outlineWidth} ${style.outlineColor}`, transform: style.transform,
    opacity: style.opacity, textDecoration: style.textDecorationLine, transition: style.transitionDuration,
    cursor: style.cursor,
  };
}

function changed(before, after) {
  if (!before || !after) return [];
  return Object.keys(before).filter((key) => key !== "transition" && key !== "cursor" && before[key] !== after[key]);
}

async function main() {
  const [url, outputFolder = "qa-screenshots/probe", ...flags] = process.argv.slice(2);
  if (!url) {
    console.error("Usage: node interaction-probe.cjs <url> [output-folder] [--size=1440x900] [--max-clicks=12]");
    process.exit(1);
  }
  if (!isLocalUrl(url)) {
    console.error("Refusing: the probe runs against a local app only (localhost / 127.0.0.1 / *.test).");
    process.exit(1);
  }
  const sizeFlag = flags.find((flag) => flag.startsWith("--size="));
  const [width, height] = (sizeFlag ? sizeFlag.split("=")[1] : "1440x900").split("x").map(Number);
  const maxClicksFlag = flags.find((flag) => flag.startsWith("--max-clicks="));
  const maxClicks = maxClicksFlag ? Number(maxClicksFlag.split("=")[1]) : 12;
  fs.mkdirSync(outputFolder, { recursive: true });
  const ignoreFile = path.join(path.dirname(outputFolder), ".gitignore");
  if (!fs.existsSync(ignoreFile)) fs.writeFileSync(ignoreFile, "*\n");

  const { chromium } = loadPlaywright();
  const browser = await chromium.launch();
  const lines = [];
  try {
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = [];
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(url, { waitUntil: "load", timeout: 30000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(outputFolder, "00-settled.png") });

    const items = await page.evaluate(listInteractive);
    let noHover = [];
    let noFocus = [];
    let noTransition = [];
    let noPointer = [];
    let small = [];
    for (const item of items.slice(0, 60)) {
      const locator = page.locator(`[data-probe-id="${item.id}"]`);
      const rest = await page.evaluate(lookOf, item.id);
      await locator.hover({ timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(350);
      const hovered = await page.evaluate(lookOf, item.id);
      await page.mouse.move(0, 0);
      await page.evaluate((id) => document.querySelector(`[data-probe-id="${id}"]`)?.focus({ focusVisible: true }), item.id);
      await page.keyboard.press("Shift");
      await page.waitForTimeout(150);
      const focused = await page.evaluate(lookOf, item.id);
      await page.evaluate(() => document.activeElement && document.activeElement.blur());
      const isControl = !["input", "select"].includes(item.tag);
      if (isControl && changed(rest, hovered).length === 0) noHover.push(item.label);
      if (changed(rest, focused).length === 0) noFocus.push(item.label);
      if (rest && rest.transition.split(",").every((value) => parseFloat(value) === 0) && isControl) noTransition.push(item.label);
      if (rest && isControl && rest.cursor !== "pointer" && item.tag !== "summary") noPointer.push(item.label);
      const [w, h] = item.size.split("x").map(Number);
      if (w < 24 || h < 24) small.push(`${item.label} (${item.size})`);
    }
    const summarise = (name, list) => lines.push(`${name}: ${list.length}/${Math.min(items.length, 60)}` + (list.length ? ` — ${list.slice(0, 8).join(" · ")}` : ""));
    lines.push(`interactive elements: ${items.length}`);
    summarise("no hover feedback", noHover);
    summarise("no visible keyboard focus", noFocus);
    summarise("no transition on state change", noTransition);
    summarise("no pointer cursor", noPointer);
    summarise("smaller than 24x24", small);

    // Click through safe, same-page controls and capture what happens.
    let clicks = 0;
    for (const item of items) {
      if (clicks >= maxClicks) break;
      if (!item.sameDocument || RISKY.test(item.label) || item.tag === "select" || item.tag === "input") continue;
      const locator = page.locator(`[data-probe-id="${item.id}"]`);
      if (!(await locator.isVisible().catch(() => false))) continue;
      clicks += 1;
      const before = await page.evaluate(() => ({ scroll: window.scrollY, height: document.body.scrollHeight }));
      await locator.click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(60);
      const slug = `${String(clicks).padStart(2, "0")}-${item.label.replace(/[^a-z0-9]+/gi, "-").slice(0, 30)}`;
      await page.screenshot({ path: path.join(outputFolder, `${slug}-a-mid.png`) });
      const during = await page.evaluate(() => ({
        animations: document.getAnimations().length,
        busy: document.querySelectorAll("[aria-busy=true], .skeleton, [class*=skeleton], [class*=spinner], progress, [role=progressbar]").length,
      }));
      await page.waitForTimeout(700);
      await page.screenshot({ path: path.join(outputFolder, `${slug}-b-after.png`) });
      const after = await page.evaluate(() => ({
        dialogs: [...document.querySelectorAll("dialog[open], [role=dialog], [role=alertdialog]")].filter((d) => d.getBoundingClientRect().height > 0).length,
        toasts: [...document.querySelectorAll("[role=status], [role=alert], [aria-live]")].filter((t) => t.innerText.trim()).length,
        scroll: window.scrollY, height: document.body.scrollHeight, url: location.href,
      }));
      lines.push(`click "${item.label}": ${during.animations} animation(s) right after, loading UI ${during.busy ? "shown" : "none"}, ` +
        `${after.dialogs} dialog(s), ${after.toasts} live message(s)` + (after.scroll !== before.scroll ? ", page scrolled" : "") +
        ` → ${slug}-*.png`);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(250);
      if (after.url !== url) {
        await page.goto(url, { waitUntil: "load" });
        await page.waitForTimeout(800);
        await page.evaluate(listInteractive);
      }
    }
    if (errors.length) lines.push(`console errors: ${errors.slice(0, 5).join(" | ")}`);
  } finally {
    await browser.close();
  }
  for (const line of lines) console.log(line);
  console.log(`frames saved in ${outputFolder} — look at them: does every click feel premium?`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
