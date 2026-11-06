// Take screenshots of one page at mobile, tablet and desktop sizes and report
// console errors, failed requests and horizontal overflow. Used when no
// browser tool (Claude in Chrome, Playwright MCP) is available.
//
// Usage (run from the project folder so its own Playwright is found first):
//   node <path-to>/screenshot.cjs <url> [output-folder] [--full-page] [--sizes=1280x800,1920x1080] [--motion]
//
// --motion also checks animation at the largest size: which animations run on
// load and while scrolling (with a frame taken mid-entrance), the same page
// with reduced motion switched on, and text left invisible (e.g. a scroll
// reveal that never fired).
//
// Only local URLs (localhost, 127.0.0.1) are allowed: QA never runs against a
// production or staging site. --allow-remote overrides this when AK asks.
//
// Without --sizes it uses mobile 375x812, tablet 768x1024 and desktop 1440x900.
//
// Needs Playwright with Chromium. If missing, install it outside the project
// (so no project files or install scripts change):
//   npm install --prefix ~/.arkar/playwright playwright && npx --prefix ~/.arkar/playwright playwright install chromium

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const DEFAULT_VIEWPORTS = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];

function loadPlaywright() {
  // Prefer the project's own copy, then the shared one in ~/.arkar/playwright, then a global one.
  const sharedCopy = path.join(os.homedir(), ".arkar", "playwright");
  for (const searchFrom of [process.cwd(), sharedCopy, __dirname]) {
    try {
      return require(require.resolve("playwright", { paths: [searchFrom] }));
    } catch {
      // try the next location
    }
  }
  try {
    return require("playwright");
  } catch {
    console.error(
      "Playwright is not installed. Run: npm install --prefix ~/.arkar/playwright playwright && npx --prefix ~/.arkar/playwright playwright install chromium",
    );
    process.exit(2);
  }
}

function viewportsFrom(flags) {
  const sizesFlag = flags.find((flag) => flag.startsWith("--sizes="));
  if (!sizesFlag) return DEFAULT_VIEWPORTS;
  return sizesFlag
    .slice("--sizes=".length)
    .split(",")
    .map((size) => {
      const [width, height] = size.toLowerCase().split("x").map(Number);
      return { name: `w${width}`, width, height };
    })
    .filter((viewport) => viewport.width > 0 && viewport.height > 0);
}

function isLocalUrl(url) {
  const host = new URL(url).hostname;
  return host === "localhost" || host === "::1" || host === "[::1]" || host.startsWith("127.") || host.endsWith(".localhost") || host.endsWith(".test");
}

// Query strings can carry tokens; keep them out of the log.
function withoutQuery(url) {
  return url.split("?")[0];
}

function pageSlug(url) {
  const urlPath = new URL(url).pathname.replace(/\/+$/, "");
  return urlPath === "" ? "home" : urlPath.slice(1).replace(/[^a-zA-Z0-9]+/g, "-");
}

// Runs inside the page from the first moment: records every CSS transition,
// CSS animation and Web Animations API animation (used by `motion`) it sees.
function recordAnimations() {
  const seen = new Map();
  window.__arkarAnimations = seen;
  function describe(element) {
    if (!element || !element.tagName) return "";
    const classes = element.classList.length > 0 ? "." + [...element.classList].slice(0, 2).join(".") : "";
    return element.tagName.toLowerCase() + classes;
  }
  function collect() {
    for (const animation of document.getAnimations()) {
      if (seen.has(animation)) continue;
      const effect = animation.effect;
      const timing = effect && effect.getComputedTiming ? effect.getComputedTiming() : {};
      seen.set(animation, {
        kind: animation.constructor.name,
        duration: Number(timing.duration) || 0,
        infinite: timing.iterations === Infinity,
        target: describe(effect && effect.target),
      });
    }
  }
  setInterval(collect, 30);
}

function summariseAnimations() {
  const animations = [...window.__arkarAnimations.values()];
  const kinds = {};
  for (const animation of animations) kinds[animation.kind] = (kinds[animation.kind] || 0) + 1;
  // Skeleton shimmer and spinners loop by design while data loads, so they
  // don't count towards the longest or looping animation.
  const loading = (animation) => /skeleton|shimmer|spinner|loading|progress/i.test(animation.target || "");
  const content = animations.filter((animation) => !loading(animation));
  const longest = content.reduce((max, animation) => Math.max(max, animation.duration), 0);
  const targets = [...new Set(animations.map((animation) => animation.target).filter(Boolean))].slice(0, 8);
  return { count: animations.length, kinds, longest, infinite: content.filter((a) => a.infinite).length, targets };
}

// Text that is still see-through after the page settled and was scrolled
// through, while not properly hidden (display: none or visibility: hidden also
// hide it from keyboards and screen readers, so those are left alone). Usually
// a reveal that never ran; closed menus faded with opacity alone show up too.
function findInvisibleText() {
  const found = [];
  for (const element of document.body.querySelectorAll("*")) {
    const hasOwnText = [...element.childNodes].some((node) => node.nodeType === 3 && node.textContent.trim() !== "");
    if (!hasOwnText) continue;
    // Inert or aria-hidden content is out of reach for keyboards and screen readers too.
    if (element.closest("[inert], [aria-hidden='true']")) continue;
    let opacity = 1;
    let hidden = false;
    for (let node = element; node && node !== document.documentElement; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.display === "none") { hidden = true; break; }
      opacity *= Number(style.opacity);
    }
    if (!hidden && getComputedStyle(element).visibility !== "hidden" && opacity < 0.1) {
      found.push(`${element.tagName.toLowerCase()} "${element.textContent.trim().slice(0, 40)}"`);
    }
  }
  return found.slice(0, 6);
}

async function scrollThrough(page) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const step = Math.round(page.viewportSize().height * 0.8);
  for (let position = 0; position < height; position += step) {
    await page.evaluate((top) => window.scrollTo(0, top), position);
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(800);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
}

async function checkMotion(browser, url, viewport, outputFolder) {
  const size = { width: viewport.width, height: viewport.height };
  const lines = [];
  let problemCount = 0;

  const page = await browser.newPage({ viewport: size });
  await page.addInitScript(recordAnimations);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(150);
  const earlyFrame = path.join(outputFolder, `${pageSlug(url)}-motion-early.png`);
  await page.screenshot({ path: earlyFrame });
  await page.waitForTimeout(1200);
  const onLoad = await page.evaluate(summariseAnimations);
  await scrollThrough(page);
  const overall = await page.evaluate(summariseAnimations);
  const stuck = await page.evaluate(findInvisibleText);
  await page.close();

  lines.push(`motion: ${onLoad.count} animation(s) on load, ${overall.count - onLoad.count} more while scrolling ` +
    `(${JSON.stringify(overall.kinds)}); longest ${Math.round(overall.longest)} ms; ${overall.infinite} looping`);
  lines.push(`  animated: ${overall.targets.join(", ") || "nothing"}`);
  lines.push(`  frame mid-entrance: ${earlyFrame}`);
  if (overall.count === 0) {
    lines.push("  - no animation found on load or scroll (interactions are not covered by this check)");
  }
  for (const text of stuck) lines.push(`  - text still invisible after scrolling: ${text}`);
  problemCount += stuck.length;

  const reduced = await browser.newPage({ viewport: size, reducedMotion: "reduce" });
  await reduced.addInitScript(recordAnimations);
  await reduced.goto(url, { waitUntil: "load", timeout: 30000 });
  await reduced.waitForTimeout(1200);
  await scrollThrough(reduced);
  const calm = await reduced.evaluate(summariseAnimations);
  const calmStuck = await reduced.evaluate(findInvisibleText);
  await reduced.close();

  lines.push(`reduced motion: ${calm.count} animation(s); longest ${Math.round(calm.longest)} ms; ${calm.infinite} looping`);
  if (calm.longest > 300 || calm.infinite > 0) {
    lines.push("  - with reduced motion on, long or looping animations still run");
    problemCount += 1;
  }
  for (const text of calmStuck) lines.push(`  - text invisible with reduced motion: ${text}`);
  problemCount += calmStuck.length;
  return { lines, problemCount };
}

function collectProblems(page) {
  const problems = [];
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(`console error: ${message.text()}`);
  });
  page.on("pageerror", (error) => problems.push(`page error: ${error.message}`));
  page.on("requestfailed", (request) => problems.push(`request failed: ${withoutQuery(request.url())}`));
  page.on("response", (response) => {
    if (response.status() >= 400) problems.push(`HTTP ${response.status()}: ${withoutQuery(response.url())}`);
  });
  return problems;
}

async function main() {
  const [url, outputFolder = "qa-screenshots", ...flags] = process.argv.slice(2);
  if (!url) {
    console.error("Usage: node screenshot.cjs <url> [output-folder] [--full-page] [--sizes=WxH,WxH] [--motion]");
    process.exit(1);
  }
  if (!isLocalUrl(url) && !flags.includes("--allow-remote")) {
    console.error(`Refusing ${withoutQuery(url)}: QA screenshots are taken of a local app only (localhost / 127.0.0.1 / *.test).`);
    process.exit(1);
  }
  const fullPage = flags.includes("--full-page");
  const viewports = viewportsFrom(flags);
  fs.mkdirSync(outputFolder, { recursive: true });
  // Screenshots must never be committed: ignore everything in this folder.
  const ignoreFile = path.join(outputFolder, ".gitignore");
  if (!fs.existsSync(ignoreFile)) fs.writeFileSync(ignoreFile, "*\n");

  const { chromium } = loadPlaywright();
  const browser = await chromium.launch();
  let problemCount = 0;

  try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    const problems = collectProblems(page);

    // "load" plus a short settle, not "networkidle": pages with live updates
    // (polling, server-sent events) never go idle.
    await page.goto(url, { waitUntil: "load", timeout: 30000 });
    await page.waitForTimeout(800);

    // A page wider than the viewport means content overflows sideways.
    const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    if (pageWidth > viewport.width) {
      problems.push(`horizontal overflow: page is ${pageWidth}px wide in a ${viewport.width}px viewport`);
    }

    const file = path.join(outputFolder, `${pageSlug(url)}-${viewport.name}-${viewport.width}.png`);
    await page.screenshot({ path: file, fullPage });
    console.log(`${viewport.name} ${viewport.width}x${viewport.height}: ${file}`);
    for (const problem of problems) console.log(`  - ${problem}`);
    problemCount += problems.length;
    await page.close();
  }
  if (flags.includes("--motion")) {
    const largest = viewports.reduce((widest, viewport) => (viewport.width > widest.width ? viewport : widest));
    const motion = await checkMotion(browser, url, largest, outputFolder);
    for (const line of motion.lines) console.log(line);
    problemCount += motion.problemCount;
  }
  } finally {
    await browser.close();
  }
  console.log(problemCount === 0 ? "No console, network or overflow problems found." : `${problemCount} problem(s) found.`);
}

main().catch((error) => {
  console.error(`Screenshot failed: ${error.message}`);
  process.exit(1);
});
