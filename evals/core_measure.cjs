// Measures one finished build for the core test: screenshots and facts about what was rendered.
//
//   node evals/core_measure.cjs <served folder> <out folder> <label> [entry path]
//
// Writes <out>/<label>-desktop.png (first screen, 1440×900), <label>-desktop-full.png,
// <label>-phone.png (390×844) and <label>-phone-full.png, and prints one JSON line of facts:
// page background (dark or light), fonts, the strongest accent hue, how much glass (backdrop
// blur) is on screen, native controls left in the page, and horizontal overflow.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css",
  ".svg": "image/svg+xml", ".json": "application/json", ".woff2": "font/woff2", ".png": "image/png", ".jpg": "image/jpeg" };

function serve(root) {
  return new Promise((resolve) => {
    const server = http.createServer((request, response) => {
      let file = path.join(root, decodeURIComponent(request.url.split("?")[0]));
      if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
      if (!fs.existsSync(file)) file = path.join(root, "index.html"); // single-page apps route in the browser
      if (!fs.existsSync(file)) { response.writeHead(404); response.end(); return; }
      response.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" });
      fs.createReadStream(file).pipe(response);
    }).listen(0, "127.0.0.1", () => resolve({ server, base: `http://127.0.0.1:${server.address().port}` }));
  });
}

async function facts(page) {
  return page.evaluate(() => {
    const parse = (value) => (value.match(/[\d.]+/g) || []).map(Number);
    const visible = [...document.querySelectorAll("body *")].filter((element) => {
      const box = element.getBoundingClientRect();
      return box.width > 0 && box.height > 0 && box.top < innerHeight * 3;
    });
    // The page's real background: the first opaque background walking up from the middle of the screen.
    let probe = document.elementFromPoint(innerWidth / 2, innerHeight / 2) || document.body;
    let background = [255, 255, 255];
    for (let node = probe; node; node = node.parentElement) {
      const [r, g, b, a = 1] = parse(getComputedStyle(node).backgroundColor);
      if (a > 0.9) { background = [r, g, b]; break; }
    }
    const bodyColour = parse(getComputedStyle(document.body).backgroundColor);
    const luminance = (rgb) => (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
    const hues = {};
    let glassArea = 0;
    for (const element of visible) {
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      const blur = style.backdropFilter || style.webkitBackdropFilter || "none";
      if (blur !== "none") glassArea += box.width * Math.min(box.height, innerHeight);
      for (const value of [style.backgroundColor, style.color]) {
        const [r, g, b, a = 1] = parse(value);
        if (a < 0.5 || r === undefined) continue;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        if (max - min < 60) continue; // greys and near-greys are not accents
        let hue = max === r ? ((g - b) / (max - min)) % 6 : max === g ? (b - r) / (max - min) + 2 : (r - g) / (max - min) + 4;
        hue = Math.round(((hue * 60) + 360) % 360 / 30) * 30 % 360; // 12 hue families
        hues[hue] = (hues[hue] || 0) + Math.sqrt(box.width * box.height);
      }
    }
    const ranked = Object.entries(hues).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([hue]) => Number(hue));
    const heading = document.querySelector("h1");
    return {
      pageBackground: background, bodyBackground: bodyColour.slice(0, 3),
      scheme: luminance(background) < 0.45 ? "dark" : "light",
      bodyFont: getComputedStyle(document.body).fontFamily.split(",")[0].replace(/["']/g, "").trim(),
      headingFont: heading ? getComputedStyle(heading).fontFamily.split(",")[0].replace(/["']/g, "").trim() : null,
      headingText: heading ? heading.innerText.slice(0, 90) : null,
      accentHues: ranked,
      glassShareOfScreen: Math.round(100 * glassArea / (innerWidth * innerHeight)),
      glassElements: visible.filter((element) => (getComputedStyle(element).backdropFilter || "none") !== "none").length,
      nativeSelects: document.querySelectorAll("select").length,
      nativeDateInputs: document.querySelectorAll('input[type="date"], input[type="time"], input[type="datetime-local"]').length,
      tableRows: document.querySelectorAll("tbody tr, [role=row]").length,
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
    };
  });
}

(async () => {
  const [root, out, label, entry = "index.html"] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  const { server, base } = await serve(root);
  const browser = await chromium.launch();
  const result = { label };
  for (const [name, viewport, scale] of [["desktop", { width: 1440, height: 900 }, 2], ["phone", { width: 390, height: 844 }, 2]]) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: scale });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(String(error).slice(0, 160)));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text().slice(0, 160)); });
    await page.goto(`${base}/${entry}`, { waitUntil: "load", timeout: 30000 });
    await page.waitForTimeout(3500); // let mock data and the first-load motion settle
    await page.screenshot({ path: path.join(out, `${label}-${name}.png`) });
    await page.screenshot({ path: path.join(out, `${label}-${name}-full.png`), fullPage: true });
    result[name] = { ...(await facts(page)), errors };
    await context.close();
  }
  await browser.close();
  server.close();
  console.log(JSON.stringify(result));
})().catch((error) => { console.error(String(error)); process.exit(1); });
