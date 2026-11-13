// Objective quality audit of a local page: the measurable half of the premium
// pass, so quality isn't judged by eye alone.
//
// Usage (from the project folder):
//   node <path-to>/audit.cjs <url> [--sizes=1440x900,768x1024,375x812,320x640] [--json]
//
// Reports, at each size:
// - accessibility violations (axe-core: WCAG 2.0/2.1/2.2 A and AA rules), by impact;
// - console errors, page errors, failed requests and broken images;
// - horizontal overflow; interactive targets smaller than 24×24 px;
// and once, at the largest size, the design-system spread actually rendered:
// distinct corner radii, shadows, font sizes, font families, text colours,
// surface colours and spacing values — and fonts that failed to load. A wide spread means no real system
// (tokens not used, values made up per element).
//
// Needs Playwright (see screenshot.cjs) and axe-core. If axe-core is missing:
//   npm install --prefix ~/.arkar/axe axe-core
// Safety: local URLs only.

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { loadPlaywright, isLocalUrl } = require("./film-lib.cjs");

function findAxe() {
  const candidates = [path.join(process.cwd(), "node_modules", "axe-core", "axe.min.js"),
    path.join(os.homedir(), ".arkar", "axe", "node_modules", "axe-core", "axe.min.js")];
  try {
    candidates.unshift(require.resolve("axe-core/axe.min.js"));
  } catch {
    // not installed globally
  }
  return candidates.find((candidate) => fs.existsSync(candidate));
}

// Runs in the page: the design values actually rendered on visible elements.
function measureSystem() {
  const sets = { radius: new Set(), shadow: new Set(), fontSize: new Set(), fontFamily: new Set(),
    textColour: new Set(), surface: new Set(), spacing: new Set() };
  const area = new Map();
  for (const element of document.body.querySelectorAll("*")) {
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    const style = getComputedStyle(element);
    if (style.visibility === "hidden" || Number(style.opacity) === 0) continue;
    // Circles and pills (radius ≥ half the short side) are shapes, not steps of a radius scale.
    const radius = style.borderTopLeftRadius;
    const isShape = radius.endsWith("%") || parseFloat(radius) >= Math.min(rect.width, rect.height) / 2 - 1;
    if (radius !== "0px" && !isShape) sets.radius.add(radius);
    if (style.boxShadow !== "none") sets.shadow.add(style.boxShadow);
    const hasText = [...element.childNodes].some((node) => node.nodeType === 3 && node.textContent.trim());
    if (hasText) {
      sets.fontSize.add(style.fontSize);
      sets.fontFamily.add(style.fontFamily.split(",")[0].replace(/["']/g, "").trim());
      sets.textColour.add(style.color);
    }
    if (style.backgroundColor !== "rgba(0, 0, 0, 0)" && style.backgroundColor !== "transparent") {
      sets.surface.add(style.backgroundColor);
      area.set(style.backgroundColor, (area.get(style.backgroundColor) || 0) + rect.width * rect.height);
    }
    for (const property of ["paddingTop", "paddingLeft", "marginTop", "marginBottom", "rowGap", "columnGap"]) {
      const value = parseFloat(style[property]);
      if (value > 0) sets.spacing.add(Math.round(value));
    }
  }
  const palette = [...area.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([colour]) => colour);
  // A font that didn't load renders exactly like the generic fallbacks; compare text widths.
  const generic = /^(serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-\w+|-apple-system|inherit|initial)$/i;
  const canvas = document.createElement("canvas").getContext("2d");
  const width = (font) => { canvas.font = `32px ${font}`; return canvas.measureText("Hamburgefonstiv 0123 WMQ").width; };
  const fellBack = [...sets.fontFamily].filter((family) => family && !generic.test(family))
    .filter((family) => ["monospace", "serif", "sans-serif"].every((base) => width(`"${family}", ${base}`) === width(base)));
  const counts = Object.fromEntries(Object.entries(sets).map(([name, set]) => [name, set.size]));
  return { counts, fonts: [...sets.fontFamily].slice(0, 6), palette, fellBack };
}

// Runs in the page: interactive elements smaller than 24×24 (WCAG 2.5.8 minimum).
function smallTargets() {
  const small = [];
  for (const element of document.querySelectorAll("a[href], button, input, select, textarea, [role=button], [tabindex='0']")) {
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    if (element.matches("input[type=checkbox], input[type=radio]") && element.closest("label")) continue;
    if (element.closest("p, li") && element.tagName === "A" && !element.closest("nav")) continue; // inline links are exempt
    if (rect.width < 24 || rect.height < 24) small.push(`${element.tagName.toLowerCase()} "${(element.innerText || element.getAttribute("aria-label") || "").trim().slice(0, 24)}" ${Math.round(rect.width)}x${Math.round(rect.height)}`);
  }
  return small;
}

async function main() {
  const args = process.argv.slice(2);
  const url = args.find((arg) => !arg.startsWith("--"));
  if (!url) {
    console.error("Usage: node audit.cjs <url> [--sizes=WxH,...] [--json]");
    process.exit(1);
  }
  if (!isLocalUrl(url)) {
    console.error("Refusing: the audit runs against a local app only (localhost / 127.0.0.1 / *.test).");
    process.exit(1);
  }
  const sizesFlag = args.find((arg) => arg.startsWith("--sizes="));
  const sizes = (sizesFlag ? sizesFlag.split("=")[1] : "1440x900,768x1024,375x812,320x640")
    .split(",").map((size) => size.split("x").map(Number));
  const axePath = findAxe();
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch();
  const report = { url, sizes: [], axeAvailable: Boolean(axePath) };
  try {
    for (const [width, height] of sizes) {
      // bypassCSP: a page with a strict Content-Security-Policy would otherwise refuse the axe script.
      const page = await browser.newPage({ viewport: { width, height }, bypassCSP: true });
      const problems = { consoleErrors: [], failedRequests: [] };
      page.on("console", (message) => { if (message.type() === "error") problems.consoleErrors.push(message.text().slice(0, 160)); });
      page.on("pageerror", (error) => problems.consoleErrors.push(error.message.slice(0, 160)));
      page.on("requestfailed", (request) => problems.failedRequests.push(request.url()));
      page.on("response", (response) => { if (response.status() >= 400) problems.failedRequests.push(`${response.status()} ${response.url()}`); });
      await page.goto(url, { waitUntil: "load", timeout: 30000 });
      await page.waitForTimeout(2500);
      const result = { size: `${width}x${height}`, ...problems };
      result.overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      result.brokenImages = await page.evaluate(() => [...document.images].filter((image) => image.complete && image.naturalWidth === 0).map((image) => image.src));
      result.smallTargets = await page.evaluate(smallTargets);
      if (axePath) {
        await page.addScriptTag({ path: axePath });
        const axe = await page.evaluate(async () => {
          const output = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] } });
          return output.violations.map((violation) => ({ id: violation.id, impact: violation.impact, count: violation.nodes.length }));
        });
        result.axe = axe;
      }
      if (width === Math.max(...sizes.map(([w]) => w))) report.system = await page.evaluate(measureSystem);
      report.sizes.push(result);
      await page.close();
    }
  } finally {
    await browser.close();
  }
  if (args.includes("--json")) {
    console.log(JSON.stringify(report));
    return;
  }
  for (const size of report.sizes) {
    const serious = (size.axe || []).filter((violation) => ["serious", "critical"].includes(violation.impact));
    console.log(`${size.size}: overflow ${size.overflow ? "YES" : "no"} · console errors ${size.consoleErrors.length} · failed requests ${size.failedRequests.length} · broken images ${size.brokenImages.length} · targets <24px ${size.smallTargets.length}` +
      (size.axe ? ` · axe violations ${size.axe.length} (serious/critical ${serious.length}${serious.length ? ": " + serious.map((v) => v.id).join(", ") : ""})` : " · axe not installed"));
  }
  if (report.system) {
    const c = report.system.counts;
    console.log(`design system rendered: radii ${c.radius} · shadows ${c.shadow} · font sizes ${c.fontSize} · font families ${c.fontFamily} (${report.system.fonts.join(", ")}) · text colours ${c.textColour} · surfaces ${c.surface} · spacing values ${c.spacing}`);
    console.log(`main surfaces: ${report.system.palette.join(" · ")}`);
    if (report.system.fellBack.length) console.log(`FONTS NOT LOADED (rendering in a fallback): ${report.system.fellBack.join(", ")}`);
  }
  if (!axePath) console.log("axe-core not found — install once: npm install --prefix ~/.arkar/axe axe-core");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
