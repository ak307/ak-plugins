// Take screenshots of one page at mobile, tablet and desktop sizes and report
// console errors, failed requests and horizontal overflow. Used when no
// browser tool (Claude in Chrome, Playwright MCP) is available.
//
// Usage (run from the project folder so its own Playwright is found first):
//   node <path-to>/screenshot.cjs <url> [output-folder] [--full-page] [--sizes=1280x800,1920x1080]
//
// Only local URLs (localhost, 127.0.0.1) are allowed: QA never runs against a
// production or staging site. --allow-remote overrides this when AK asks.
//
// Without --sizes it uses mobile 375x812, tablet 768x1024 and desktop 1440x900.
//
// Needs Playwright with Chromium. If missing:
//   npm install --no-save playwright && npx playwright install chromium

const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_VIEWPORTS = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];

function loadPlaywright() {
  // Prefer the project's own copy (current folder), then any global one.
  for (const searchFrom of [process.cwd(), __dirname]) {
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
      "Playwright is not installed. Run: npm install --no-save playwright && npx playwright install chromium",
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
  const [url, outputFolder = "screenshots", ...flags] = process.argv.slice(2);
  if (!url) {
    console.error("Usage: node screenshot.cjs <url> [output-folder] [--full-page] [--sizes=WxH,WxH]");
    process.exit(1);
  }
  if (!isLocalUrl(url) && !flags.includes("--allow-remote")) {
    console.error(`Refusing ${withoutQuery(url)}: QA screenshots are taken of a local app only (localhost / 127.0.0.1).`);
    process.exit(1);
  }
  const fullPage = flags.includes("--full-page");
  const viewports = viewportsFrom(flags);
  fs.mkdirSync(outputFolder, { recursive: true });

  const { chromium } = loadPlaywright();
  const browser = await chromium.launch();
  let problemCount = 0;

  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    const problems = collectProblems(page);

    await page.goto(url, { waitUntil: "networkidle" });

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

  await browser.close();
  console.log(problemCount === 0 ? "No console, network or overflow problems found." : `${problemCount} problem(s) found.`);
}

main();
