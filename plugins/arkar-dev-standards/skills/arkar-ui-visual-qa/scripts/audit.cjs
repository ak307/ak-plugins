// Objective quality audit of a local page: the measurable half of the premium
// pass, so quality isn't judged by eye alone.
//
// Usage (from the project folder):
//   node <path-to>/audit.cjs <url> [--sizes=1440x900,768x1024,375x812,320x640] [--scheme=dark|light] [--json]
// --scheme runs every check with that colour scheme preferred: run it once per theme the product ships.
// It also walks ten widths from 320 to 1920 px for sideways overflow and for controls that end
// up under a fixed or sticky side panel — layouts break between the sizes people test at.
// And it judges the header on the scrolled page, at desktop and phone size: how much stays pinned
// and in how many bands, content showing above a floating bar or readable through it, a bar whose
// tone fights the page under it, focus landing under a pinned bar, and safe areas (in code only).
// It lists the selectors whose styles use glass (a backdrop blur), or says there are none, because
// Liquid Glass is the default material.
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

// How every page is opened: its size, any colour scheme asked for, and the page's own CSP set aside so the checks can run.
let scheme = null;
const open = (viewport) => ({ viewport, bypassCSP: true, ...(scheme ? { colorScheme: scheme } : {}) });

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

// Layouts break between the sizes people test at: a panel that sits beside the content at 1440 px
// can lie on top of it at 1280. So the audit also walks these widths.
const WIDTHS = [320, 375, 390, 768, 1024, 1200, 1280, 1366, 1440, 1920];

// Controls that run underneath a fixed or sticky side panel. Content scrolling under a full-width
// bar is by design; a row or button that reaches under a panel beside it is a layout collision.
const coveredControls = () => {
  const panels = [...document.querySelectorAll("body *")].filter((element) => {
    const style = getComputedStyle(element);
    const box = element.getBoundingClientRect();
    return (style.position === "fixed" || style.position === "sticky") && box.width < innerWidth * 0.7
      && box.width * box.height > innerWidth * innerHeight * 0.04 && style.visibility !== "hidden" && style.pointerEvents !== "none";
  });
  const covered = [];
  if (!panels.length) return covered;
  const controls = document.querySelectorAll("button, a[href], input, select, textarea, [role=button], [role=row], [role=option], [tabindex]");
  for (const [index, control] of controls.entries()) {
    const box = control.getBoundingClientRect();
    if (box.width < 4 || box.height < 4 || box.bottom < 0 || box.top > innerHeight) continue;
    // A collision: the control and a side panel overlap, and either the control reaches past the
    // panel's edge (whichever is drawn on top, one hides part of the other) or the panel is what
    // a press on the control's middle would hit.
    const collides = panels.some((panel) => {
      if (panel.contains(control) || control.contains(panel)) return false;
      const side = panel.getBoundingClientRect();
      const across = Math.min(box.right, side.right) - Math.max(box.left, side.left);
      const down = Math.min(box.bottom, side.bottom) - Math.max(box.top, side.top);
      if (across <= 8 || down <= 8) return false;
      if (box.left < side.left - 8 || box.right > side.right + 8) return true;
      const onTop = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      return Boolean(onTop) && panel.contains(onTop);
    });
    if (collides) covered.push([index, (control.getAttribute("aria-label") || control.innerText || control.tagName).trim().replace(/\s+/g, " ").slice(0, 30)]);
  }
  return covered;
};

// Sideways overflow and covered controls at every width, looking down the page a screen at a time
// (a collision is often below the first screen).
async function sweepWidths(browser, url) {
  const page = await browser.newPage(open({ width: WIDTHS[0], height: 800 }));
  const found = { overflow: [], covered: [] };
  try {
    await page.goto(url, { waitUntil: "load", timeout: 30000 });
    await page.waitForTimeout(2500);
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 800 });
      await page.waitForTimeout(250);
      if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)) found.overflow.push(width);
      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      const under = new Map(); // each control once, however many scroll positions it is covered at
      for (let top = 0; top < Math.min(height, 6400); top += 700) {
        await page.evaluate((y) => window.scrollTo(0, y), top);
        for (const [index, name] of await page.evaluate(`(${coveredControls.toString()})()`)) under.set(index, name);
      }
      await page.evaluate(() => window.scrollTo(0, 0));
      if (under.size) found.covered.push({ width, count: under.size, examples: [...new Set(under.values())].slice(0, 2) });
    }
  } finally {
    await page.close();
  }
  return found;
}

// ---- The header and anything else that stays on screen while the page scrolls.
// Judged on the scrolled page, because that is where a bar goes wrong: content showing in the gap
// above a floating bar, text readable through its glass, a dark bar left over a light page, bands
// that pile up, and focus that lands underneath.
const TOP_BUDGET = 64; // px of pinned chrome at the top on a desktop
const PHONE_BUDGET = 0.15; // share of a phone's height for everything pinned, top and bottom
const AROUND_MOVES = 0.01; // share of the pixels around the bar that change as the page scrolls
const THROUGH_MOVES = 0.01; // and of the pixels of the bar itself
const FROSTED = 0.7; // the tint a glass bar needs once content is under it, so that nothing behind it can be read
const GLASS_CEILING = 0.85; // past this a tint hides what is behind it: glass in the code, solid to the eye
const FLAT_BEHIND = 9; // the spread of tone (0–255) behind a glass surface below which there is nothing for the glass to show
const FILLED_BUTTONS = 2; // more filled buttons than this in one view and none of them is the primary action
const FILLED_REPEATS = 3; // the same filled button this many times on a page is a row action dressed as the primary

// Everything pinned to the top or bottom edge right now: fixed, or sticky and stuck.
const pinnedBands = () => {
  const bands = [];
  const name = (element) => element.tagName.toLowerCase() + (element.id ? `#${element.id}` : element.classList.length ? `.${element.classList[0]}` : "");
  for (const element of document.querySelectorAll("body *")) {
    const style = getComputedStyle(element);
    if (style.position !== "fixed" && style.position !== "sticky") continue;
    if (style.visibility === "hidden" || style.pointerEvents === "none" || Number(style.opacity) < 0.05) continue; // a fade or cap is not a band
    const box = element.getBoundingClientRect();
    if (box.width < innerWidth * 0.6 || box.height < 16 || box.height > innerHeight * 0.5 || box.bottom <= 0 || box.top >= innerHeight) continue;
    const top = parseFloat(style.top), bottom = parseFloat(style.bottom);
    const stuck = style.position === "fixed" || (Number.isFinite(top) && Math.abs(box.top - top) <= 1.5)
      || (Number.isFinite(bottom) && Math.abs(innerHeight - box.bottom - bottom) <= 1.5);
    if (!stuck || bands.some((band) => band.element.contains(element))) continue;
    // What an element paints behind its content — on itself or on a ::before / ::after layer, where bars
    // often keep their material: its tint (1 = solid, null = an image or gradient) and its blur.
    const material = (node) => {
      for (const layer of [null, "::before", "::after"]) {
        const look = getComputedStyle(node, layer);
        if (layer && (look.content === "none" || look.content === "normal" || look.display === "none" || Number(look.opacity) < 0.05)) continue;
        const colour = (look.backgroundColor.match(/[\d.]+/g) || []).map(Number);
        const alpha = colour.length === 4 ? colour[3] : colour.length === 3 ? 1 : 0;
        const blur = /blur\(([\d.]+)px\)/.exec(look.backdropFilter || "");
        if (alpha > 0.05) return { tint: alpha, blur: blur ? Number(blur[1]) : 0 };
        if (look.backgroundImage !== "none") return { tint: null, blur: blur ? Number(blur[1]) : 0 };
        if (blur) return { tint: alpha, blur: Number(blur[1]) };
      }
      return null;
    };
    // The band may be a see-through wrapper around a bar that is set in from its edges: find what is painted.
    const painted = (node) => material(node) && node.getBoundingClientRect().width >= box.width * 0.5;
    const bar = painted(element) ? element : [...element.querySelectorAll("*")].find(painted) || element;
    const inner = bar.getBoundingClientRect();
    bands.push({ element, name: name(element), top: Math.round(box.top), bottom: Math.round(box.bottom), edge: box.top < innerHeight / 2 ? "top" : "bottom",
      bar: { left: Math.round(inner.left), top: Math.round(inner.top), right: Math.round(inner.right), bottom: Math.round(inner.bottom),
        ...(material(bar) || { tint: 0, blur: 0 }) } });
  }
  return bands.map(({ element, ...band }) => band);
};

// The surfaces that are glass on the screen right now: an element, or its ::before / ::after layer, that
// paints a backdrop blur — each with the tint over that blur (1 = nothing shows through; null = an image
// or gradient). A control sitting on a glass surface is part of that surface, not another one.
const glassOnScreen = () => {
  const name = (element) => element.tagName.toLowerCase() + (element.id ? `#${element.id}` : element.classList.length ? `.${element.classList[0]}` : "");
  const surfaces = [];
  const found = new Map();
  const within = (box) => {
    const left = Math.max(0, Math.round(box.left)), top = Math.max(0, Math.round(box.top));
    return { x: left, y: top, width: Math.min(innerWidth, Math.round(box.right)) - left, height: Math.min(innerHeight, Math.round(box.bottom)) - top };
  };
  for (const element of document.querySelectorAll("body *")) {
    const box = element.getBoundingClientRect();
    if (box.width < 24 || box.height < 16 || box.bottom <= 0 || box.top >= innerHeight || box.right <= 0 || box.left >= innerWidth) continue;
    const own = getComputedStyle(element);
    if (own.visibility === "hidden" || Number(own.opacity) < 0.05 || surfaces.some((surface) => surface.contains(element))) continue;
    for (const layer of [null, "::before", "::after"]) {
      const look = layer ? getComputedStyle(element, layer) : own;
      if (layer && (look.content === "none" || look.content === "normal" || look.display === "none" || Number(look.opacity) < 0.05)) continue;
      if (!/blur\(/.test(look.backdropFilter || "")) continue;
      const colour = (look.backgroundColor.match(/[\d.]+/g) || []).map(Number);
      const alpha = colour.length === 4 ? colour[3] : colour.length === 3 ? 1 : 0;
      surfaces.push(element);
      if (!found.has(name(element))) {
        element.setAttribute("data-audit-glass", String(found.size));
        found.set(name(element), { tint: alpha < 0.05 && look.backgroundImage !== "none" ? null : Math.round(alpha * 100) / 100,
          mark: String(found.size), box: within(box) });
      }
      break;
    }
  }
  return [...found].map(([surface, facts]) => ({ name: surface, ...facts }));
};

// Restraint: status labels (badges, chips, counts on controls) that repeat in the first view, and the filled
// buttons — how many are in view at once, and whether one of them repeats down the page (an action on every
// row or card).
// "5 needed" and "19 needed" are the same word said twice; a label that is mostly figures is data, not a label.
const repetitionInView = () => {
  const inView = (element) => {
    const box = element.getBoundingClientRect();
    const look = getComputedStyle(element);
    return box.width > 4 && box.height > 4 && box.bottom > 0 && box.top < innerHeight && box.right > 0 && box.left < innerWidth
      && look.visibility !== "hidden" && Number(look.opacity) > 0.05;
  };
  const rgba = (colour) => { const parts = (colour.match(/[\d.]+/g) || []).map(Number); return parts.length >= 3 ? [parts[0], parts[1], parts[2], parts.length > 3 ? parts[3] : 1] : [0, 0, 0, 0]; };
  const control = "button, a[href], [role=button], [role=tab], [role=link], summary";
  const badge = (element) => {
    const look = getComputedStyle(element);
    const box = element.getBoundingClientRect();
    return box.height < 40 && box.width < 260 && (rgba(look.backgroundColor)[3] > 0.1 || parseFloat(look.borderTopWidth) > 0);
  };
  const labels = new Map();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.nodeValue.trim().replace(/\s+/g, " ");
    const parent = node.parentElement;
    if (text.length < 3 || text.length > 28 || text.split(" ").length > 4 || !parent || parent.closest("svg, script, style, [aria-hidden='true']")) continue;
    if ((text.match(/\d/g) || []).length / text.length >= 0.3) continue;
    const key = text.toLowerCase().replace(/[\d.,:%+−–—-]+/g, " ").replace(/\s+/g, " ").trim();
    if (key.length < 3 || !inView(parent)) continue;
    // A status, not an action: a badge, chip or stamp — or a count inside a control ("5 needed" on a step, "19 needed" on a pill).
    const status = [parent, parent.parentElement].some((element) => element && !element.matches(control) && badge(element))
      || (parent.closest(control) && /\d/.test(text));
    if (!status) continue;
    labels.set(key, (labels.get(key) || 0) + 1);
  }
  // A filled button: an opaque (or gradient) fill that stands well apart from the surface it sits on.
  const behind = (element) => {
    for (let node = element.parentElement; node; node = node.parentElement) {
      const colour = rgba(getComputedStyle(node).backgroundColor);
      if (colour[3] >= 0.5) return colour;
    }
    return [255, 255, 255, 1];
  };
  const filled = new Map();
  let filledInView = 0;
  const shown = (element) => {
    const box = element.getBoundingClientRect();
    const look = getComputedStyle(element);
    return box.width > 4 && box.height > 4 && look.visibility !== "hidden" && Number(look.opacity) > 0.05;
  };
  for (const element of document.querySelectorAll("button, a[href], [role=button]")) {
    if (!shown(element) || element.closest("[role=tablist], [aria-hidden='true']") || element.getAttribute("role") === "tab") continue;
    const look = getComputedStyle(element);
    const fill = rgba(look.backgroundColor);
    const ground = behind(element);
    const apart = Math.hypot(fill[0] - ground[0], fill[1] - ground[1], fill[2] - ground[2]);
    if (!((fill[3] >= 0.9 && apart >= 90) || /gradient/.test(look.backgroundImage))) continue;
    const label = (element.innerText || element.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 28) || "(no label)";
    filled.set(label, (filled.get(label) || 0) + 1);
    if (inView(element)) filledInView += 1;
  }
  const top = (map, least) => [...map].filter(([, count]) => count >= least).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([text, count]) => ({ text, count }));
  return { labels: top(labels, 4), filled: top(filled, 1), filledInView };
};

// Whether the focused control is underneath a pinned band (WCAG 2.2: focus not obscured).
const focusUnderBand = () => {
  const active = document.activeElement;
  if (!active || active === document.body) return null;
  const box = active.getBoundingClientRect();
  if (box.width < 2 || box.height < 2) return null;
  const onTop = document.elementFromPoint(Math.min(innerWidth - 1, Math.max(0, box.left + box.width / 2)), Math.min(innerHeight - 1, Math.max(0, box.top + box.height / 2)));
  if (!onTop || active.contains(onTop) || onTop.contains(active)) return null;
  for (let node = onTop; node && node !== document.body; node = node.parentElement) {
    const position = getComputedStyle(node).position;
    if ((position === "fixed" || position === "sticky") && !node.contains(active)) {
      return (active.getAttribute("aria-label") || active.innerText || active.value || active.tagName).trim().replace(/\s+/g, " ").slice(0, 30);
    }
  }
  return null;
};

// Pixel arithmetic on two screenshots of the pinned region taken at two scroll positions, done in
// a blank page (no image library needed). Nothing in that region should move with the page: what
// changes outside the bar is content showing around it, and what changes inside is the page seen
// through it. Returns, for each, the share of pixels that changed clearly, and the bar's brightness.
async function compare(helper, first, second, bar) {
  return helper.evaluate(async ([a, b, box]) => {
    const load = (data) => new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = `data:image/png;base64,${data}`;
    });
    const read = async (data) => {
      const image = await load(data);
      const canvas = Object.assign(document.createElement("canvas"), { width: image.width, height: image.height });
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0);
      return { width: image.width, data: context.getImageData(0, 0, image.width, image.height).data };
    };
    const [one, two] = [await read(a), await read(b)];
    const tally = { around: { pixels: 0, moved: 0 }, through: { pixels: 0, moved: 0, light: 0 } };
    for (let index = 0; index < one.data.length; index += 4) {
      const x = (index / 4) % one.width, y = Math.floor(index / 4 / one.width);
      const part = x >= box.left && x < box.right && y >= box.top && y < box.bottom ? tally.through : tally.around;
      const difference = Math.max(Math.abs(one.data[index] - two.data[index]), Math.abs(one.data[index + 1] - two.data[index + 1]),
        Math.abs(one.data[index + 2] - two.data[index + 2]));
      part.pixels += 1;
      if (difference >= 28) part.moved += 1;
      if (part === tally.through) part.light += (0.2126 * one.data[index] + 0.7152 * one.data[index + 1] + 0.0722 * one.data[index + 2]) / 255;
    }
    const share = (part) => (part.pixels ? part.moved / part.pixels : 0);
    return { around: share(tally.around), through: share(tally.through), light: tally.through.pixels ? tally.through.light / tally.through.pixels : 0 };
  }, [first.toString("base64"), second.toString("base64"), bar]);
}

// How much there is to see in a screenshot: the spread (standard deviation, 0–255) of its strongest colour channel.
async function spread(helper, shot) {
  return helper.evaluate(async (data) => {
    const image = new Image();
    image.src = `data:image/png;base64,${data}`;
    await image.decode();
    const canvas = Object.assign(document.createElement("canvas"), { width: image.width, height: image.height });
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, image.width, image.height).data;
    const sums = [0, 0, 0], squares = [0, 0, 0];
    for (let index = 0; index < pixels.length; index += 4) {
      for (let channel = 0; channel < 3; channel += 1) { sums[channel] += pixels[index + channel]; squares[channel] += pixels[index + channel] ** 2; }
    }
    const count = pixels.length / 4;
    return Math.round(Math.max(...sums.map((sum, channel) => Math.sqrt(Math.max(0, squares[channel] / count - (sum / count) ** 2)))) * 10) / 10;
  }, shot.toString("base64"));
}

// What lies behind each glass surface: the surface is hidden for a moment and the page under it measured.
// Glass over a flat background has nothing to show, and reads as a plain panel.
async function measureBeneath(page, helper, surfaces) {
  await page.addStyleTag({ content: "[data-audit-hide] { visibility: hidden !important; transition: none !important; }" });
  for (const surface of surfaces) {
    const { mark, box } = surface;
    delete surface.mark;
    delete surface.box;
    surface.behind = null;
    if (Number(mark) >= 8 || box.width < 24 || box.height < 16) continue;
    const selector = `[data-audit-glass="${mark}"]`;
    await page.evaluate((target) => document.querySelector(target).setAttribute("data-audit-hide", ""), selector);
    await page.waitForTimeout(60);
    const shot = await page.screenshot({ clip: box });
    await page.evaluate((target) => document.querySelector(target).removeAttribute("data-audit-hide"), selector);
    surface.behind = await spread(helper, shot);
  }
  await page.waitForTimeout(60);
  return surfaces;
}

// At desktop size, at rest: what repeats in the first view, and the filled buttons in view and down the page.
async function checkRestraint(browser, url) {
  const page = await browser.newPage(open({ width: 1280, height: 800 }));
  try {
    await page.goto(url, { waitUntil: "load", timeout: 30000 });
    await page.waitForTimeout(2500);
    return await page.evaluate(repetitionInView);
  } finally {
    await page.close();
  }
}

async function checkHeader(browser, helper, url, [width, height]) {
  const page = await browser.newPage(open({ width, height }));
  const found = { size: `${width}x${height}`, scrolls: false };
  try {
    await page.goto(url, { waitUntil: "load", timeout: 30000 });
    await page.waitForTimeout(2500);
    const room = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    if (room < 120) {
      found.glass = await measureBeneath(page, helper, await page.evaluate(glassOnScreen));
      return found;
    }
    found.scrolls = true;
    const far = Math.min(600, room - 40);
    const settle = async (y) => {
      await page.evaluate((to) => window.scrollTo(0, to), y);
      await page.waitForTimeout(450); // a bar may change material once content is under it
    };
    await settle(far);
    // On the scrolled page: a header's glass only shows once content is under it.
    found.glass = await measureBeneath(page, helper, await page.evaluate(glassOnScreen));
    const bands = await page.evaluate(pinnedBands);
    const top = bands.filter((band) => band.edge === "top").sort((a, b) => a.top - b.top);
    const bottom = bands.filter((band) => band.edge === "bottom");
    found.top = { height: top.length ? Math.max(...top.map((band) => band.bottom)) : 0, bands: top.map((band) => band.name) };
    found.bottom = { height: bottom.length ? height - Math.min(...bottom.map((band) => band.top)) : 0, bands: bottom.map((band) => band.name) };
    found.share = (found.top.height + found.bottom.height) / height;
    if (top.length) {
      const region = { x: 0, y: 0, width, height: Math.max(1, top[0].bottom) }; // from the window's top edge to the first band's lower edge
      const here = await page.screenshot({ clip: region });
      const below = await page.screenshot({ clip: { x: 0, y: Math.min(height - 2, found.top.height + 8), width, height: Math.max(1, Math.min(160, height - found.top.height - 8)) } });
      await settle(far + 37);
      const there = await page.screenshot({ clip: region });
      const seen = await compare(helper, here, there, top[0].bar);
      found.around = seen.around;
      found.through = seen.through;
      found.tint = top[0].bar.tint;
      found.blur = top[0].bar.blur;
      found.barLight = seen.light;
      found.pageLight = (await compare(helper, below, below, { left: 0, top: 0, right: width, bottom: 160 })).light;
    }
  } finally {
    await page.close();
  }
  return found;
}

// Tab forwards down the page and back up it: a control that takes focus under a pinned bar can't be seen.
async function checkFocus(browser, url) {
  const page = await browser.newPage(open({ width: 1280, height: 800 }));
  const hidden = new Set();
  let stops = 0;
  try {
    await page.goto(url, { waitUntil: "load", timeout: 30000 });
    await page.waitForTimeout(2500);
    for (const key of [...Array(30).fill("Tab"), ...Array(30).fill("Shift+Tab")]) {
      await page.keyboard.press(key);
      await page.waitForTimeout(60);
      stops += 1;
      if (!(await page.evaluate(focusUnderBand))) continue;
      await page.waitForTimeout(350); // a skip link or a smooth scroll may still be moving: look again once it has settled
      const under = await page.evaluate(focusUnderBand);
      if (under) hidden.add(under);
    }
  } finally {
    await page.close();
  }
  return { stops, hidden: [...hidden] };
}

// Two things only the code can show. Notches and home indicators: this browser has none, so the
// styles are read for safe-area handling. And the material the styles define (a backdrop blur):
// sheets, menus and toasts are glass that no screenshot of this screen shows. A copied glass kit
// defines it whether or not anything uses it, so checkHeader also reports what is glass on screen.
async function checkStyles(browser, url) {
  const page = await browser.newPage(open({ width: 390, height: 844 }));
  try {
    await page.goto(url, { waitUntil: "load", timeout: 30000 });
    return await page.evaluate(() => {
      const viewport = document.querySelector('meta[name="viewport"]');
      let text = "";
      const glass = new Set();
      const walk = (rules) => {
        for (const rule of rules) {
          if (rule.cssRules && rule.cssRules.length) walk(rule.cssRules); // @media, @supports, @layer
          if (!rule.style) continue;
          text += rule.cssText;
          const blur = rule.style.getPropertyValue("backdrop-filter") || rule.style.getPropertyValue("-webkit-backdrop-filter");
          if (blur && blur !== "none") for (const selector of rule.selectorText.split(",")) glass.add(selector.trim());
        }
      };
      for (const sheet of document.styleSheets) {
        try { walk(sheet.cssRules); } catch (error) { /* another origin's sheet */ }
      }
      return { safeAreas: { cover: Boolean(viewport && /viewport-fit\s*=\s*cover/.test(viewport.content)), insets: /env\(\s*safe-area-inset/.test(text) },
        material: { glass: glass.size > 0, on: [...glass] } };
    });
  } finally {
    await page.close();
  }
}

function describeHeader(found, phone) {
  if (!found.scrolls) return `header when scrolled (${found.size}): the page does not scroll`;
  const parts = [];
  const over = phone ? found.share > PHONE_BUDGET : found.top.height > TOP_BUDGET + 8;
  const pinned = phone
    ? `pinned top ${found.top.height} px + bottom ${found.bottom.height} px = ${Math.round(found.share * 100)}% of the height`
    : `pinned at the top ${found.top.height} px in ${found.top.bands.length} band${found.top.bands.length === 1 ? "" : "s"}${found.top.bands.length ? ` (${found.top.bands.join(", ")})` : ""}`;
  parts.push(pinned + (over ? ` — OVER the budget of ${phone ? `${PHONE_BUDGET * 100}%` : `${TOP_BUDGET} px`}` : ""));
  if (found.top.bands.length > 1) parts.push(`${found.top.bands.length} bands stacked`);
  if (found.around !== undefined) {
    parts.push(`content showing above or beside the bar ${found.around > AROUND_MOVES ? "YES" : "no"}`);
    const thin = found.tint !== null && found.tint < FROSTED;
    parts.push(`the page readable through the bar ${found.through > THROUGH_MOVES ? "YES" : thin
      ? `LIKELY — its glass is thin with content under it (tint ${found.tint.toFixed(2)}, blur ${found.blur} px): large text shows through; frost it to ${FROSTED} or more once the page has scrolled` : "no"}`);
    const dark = found.barLight < 0.35 && found.pageLight > 0.65, light = found.barLight > 0.65 && found.pageLight < 0.35;
    if (dark || light) {
      parts.push(`a ${dark ? "dark" : "light"} bar over a ${dark ? "light" : "dark"} page — in a new product or redesign the pinned bar takes the tone `
        + "of the content under it; only an existing product's real brand keeps this");
    }
  }
  return `header when scrolled (${found.size}): ${parts.join(" · ")}`;
}

// What is glass on this screen (scrolled, at desktop and phone size), then what the styles define
// besides. The two differ: a copied kit defines glass that nothing may use, and sheets, menus and
// toasts are glass that this screen doesn't show.
function describeMaterial({ on, onScreen }) {
  const list = (names) => `${names.slice(0, 8).join(", ")}${names.length > 8 ? ` and ${names.length - 8} more` : ""}`;
  const flat = (surface) => surface.behind !== null && surface.behind !== undefined && surface.behind < FLAT_BEHIND;
  const seen = (surfaces) => (surfaces.length ? list(surfaces.map((surface) => surface.name
    + (surface.tint === null ? "" : ` (tint ${surface.tint}${flat(surface) ? ", flat behind" : ""})`))) : "none");
  const plain = [...new Set([...onScreen.desktop, ...onScreen.phone].filter(flat).map((surface) => surface.name))];
  const solid = [...new Set([...onScreen.desktop, ...onScreen.phone].filter((surface) => surface.tint !== null && surface.tint > GLASS_CEILING).map((surface) => surface.name))];
  if (!on.length) {
    return "material: no glass anywhere in the styles (no backdrop blur) — Liquid Glass is the default for a new product or redesign: "
      + "use it for the floating layer, or give the reason in DESIGN.md. An existing product keeps its own material.";
  }
  const defined = `the styles define glass for ${list(on)}`;
  if (!onScreen.desktop.length && !onScreen.phone.length) {
    return `material: nothing on this screen is glass — ${defined}, but no surface here uses it. Right if nothing floats on this screen; `
      + "if a bar, panel or rail does, it should be glass (or DESIGN.md says why not).";
  }
  const lines = [`material: glass on this screen — desktop: ${seen(onScreen.desktop)} · phone: ${seen(onScreen.phone)}`];
  if (solid.length) {
    lines.push(`  ${list(solid)}: tinted past ${GLASS_CEILING}, solid to the eye — keep it glass (more blur, a dim layer under a sheet, stronger text) or name it solid in DESIGN.md`);
  }
  if (plain.length) {
    lines.push(`  ${list(plain)}: nothing behind it to show (a flat background), so it reads as a plain panel — give the glass a canvas `
      + "(imagery, a visible field, a dark or coloured band) or tint it");
  }
  lines.push(`  these should be the surfaces the build sheet's Material line names (${defined}: sheets, menus and other states are not on screen now)`);
  return lines.join("\n");
}

// What repeats. The audit counts; whether each one earns its place is judged by eye.
function describeRestraint({ labels, filled, filledInView }) {
  const named = (items) => items.map((item) => `"${item.text}" ×${item.count}`).join(", ");
  const repeated = filled.filter((item) => item.count >= FILLED_REPEATS);
  const parts = [labels.length
    ? `status labels repeated in the first view — ${named(labels)} — a status or count is said once, where it is acted on, plus at most one summary`
    : "no status label repeated four times or more in the first view"];
  parts.push(`filled buttons in the first view ${filledInView}` + (filledInView > FILLED_BUTTONS ? " — more than one primary action" : ""));
  if (repeated.length) parts.push(`the same filled button down the page — ${named(repeated)} — an action repeated on every row or card stays quiet`);
  return `restraint (1280x800): ${parts.join(" · ")}`;
}

async function main() {
  const args = process.argv.slice(2);
  const url = args.find((arg) => !arg.startsWith("--"));
  if (!url) {
    console.error("Usage: node audit.cjs <url> [--sizes=WxH,...] [--scheme=dark|light] [--json]");
    process.exit(1);
  }
  if (!isLocalUrl(url)) {
    console.error("Refusing: the audit runs against a local app only (localhost / 127.0.0.1 / *.test).");
    process.exit(1);
  }
  const schemeFlag = args.find((arg) => arg.startsWith("--scheme="));
  if (schemeFlag) {
    scheme = schemeFlag.split("=")[1];
    if (!["dark", "light"].includes(scheme)) {
      console.error("--scheme takes dark or light");
      process.exit(1);
    }
  }
  const sizesFlag = args.find((arg) => arg.startsWith("--sizes="));
  const sizes = (sizesFlag ? sizesFlag.split("=")[1] : "1440x900,768x1024,375x812,320x640")
    .split(",").map((size) => size.split("x").map(Number));
  const axePath = findAxe();
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch();
  const report = { url, scheme: scheme || "the page's own", sizes: [], axeAvailable: Boolean(axePath) };
  try {
    for (const [width, height] of sizes) {
      // The audit adds axe to the page; a page with a Content-Security-Policy would refuse it.
      const page = await browser.newPage(open({ width, height }));
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
    // The remaining checks each use a page of their own, so they run side by side.
    const helper = await browser.newPage();
    const [widths, desktop, phone, focus, styles, restraint] = await Promise.all([sweepWidths(browser, url), checkHeader(browser, helper, url, [1280, 800]),
      checkHeader(browser, helper, url, [390, 844]), checkFocus(browser, url), checkStyles(browser, url), checkRestraint(browser, url)]);
    report.widths = widths;
    report.restraint = restraint;
    const { glass: desktopGlass = [], ...desktopHeader } = desktop;
    const { glass: phoneGlass = [], ...phoneHeader } = phone;
    report.header = { desktop: desktopHeader, phone: phoneHeader, focus, safeAreas: styles.safeAreas };
    report.material = { ...styles.material, onScreen: { desktop: desktopGlass, phone: phoneGlass } };
    await helper.close();
  } finally {
    await browser.close();
  }
  if (args.includes("--json")) {
    console.log(JSON.stringify(report));
    return;
  }
  if (scheme) console.log(`colour scheme: ${scheme}`);
  for (const size of report.sizes) {
    const serious = (size.axe || []).filter((violation) => ["serious", "critical"].includes(violation.impact));
    console.log(`${size.size}: overflow ${size.overflow ? "YES" : "no"} · console errors ${size.consoleErrors.length} · failed requests ${size.failedRequests.length} · broken images ${size.brokenImages.length} · targets <24px ${size.smallTargets.length}` +
      (size.axe ? ` · axe violations ${size.axe.length} (serious/critical ${serious.length}${serious.length ? ": " + serious.map((v) => v.id).join(", ") : ""})` : " · axe not installed"));
  }
  const { overflow, covered } = report.widths;
  console.log(`widths ${WIDTHS[0]}–${WIDTHS[WIDTHS.length - 1]} px: sideways overflow ${overflow.length ? `YES at ${overflow.join(", ")} px` : "no"}`
    + ` · controls under a fixed or sticky panel ${covered.length ? "YES — " + covered.map((at) => `${at.width} px: ${at.count} (${at.examples.join(", ")})`).join("; ") : "no"}`);
  if (covered.length) console.log("  a panel beside the content must hold its own column (or move below it) at every width — fix the layout, don't hide the overlap");
  const { header } = report;
  console.log(describeHeader(header.desktop, false));
  console.log(describeHeader(header.phone, true));
  console.log(`keyboard: ${header.focus.hidden.length ? `${header.focus.hidden.length} control(s) take focus under a pinned bar (${header.focus.hidden.slice(0, 3).join(", ")}) — set scroll-padding so focus and jump targets stay clear of it` : "no control takes focus under a pinned bar"}`);
  const pinnedOnPhone = header.phone.scrolls && (header.phone.top.bands.length || header.phone.bottom.bands.length);
  if (pinnedOnPhone && !(header.safeAreas.cover && header.safeAreas.insets)) {
    console.log("safe areas: bars are pinned on a phone but the code has no viewport-fit=cover with env(safe-area-inset-*) — a notch or home indicator would cover them (checked in code only)");
  }
  console.log(describeMaterial(report.material));
  console.log(describeRestraint(report.restraint));
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
