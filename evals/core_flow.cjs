// Walks one build through a scripted user flow for the core test: named screenshots of its
// states and one real-speed video of the whole flow (how it feels, not only how it looks).
//
//   node evals/core_flow.cjs <served folder> <out folder> <label> <steps.json> [--phone]
//
// steps.json: {"entry": "index.html", "steps": [["click", "<selector>"], ["fill", "<selector>", "text"],
//   ["type", "<selector>", "text"], ["press", "Enter"], ["hover", "<selector>"], ["scroll", 600],
//   ["wait", 800], ["shot", "name"], ["dblclick", "<selector>"], ["select", "<selector>", "value"]]}
// A step that fails is reported and the flow continues, so one missing element doesn't lose the rest.
// Writes <out>/<label>-<name>.png for each shot and <out>/<label>-flow.mp4, and prints what failed.
const { chromium } = require("playwright");
const { execFileSync } = require("child_process");
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
      if (!fs.existsSync(file)) file = path.join(root, "index.html");
      if (!fs.existsSync(file)) { response.writeHead(404); response.end(); return; }
      response.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" });
      fs.createReadStream(file).pipe(response);
    }).listen(0, "127.0.0.1", () => resolve({ server, base: `http://127.0.0.1:${server.address().port}` }));
  });
}

// A visible pointer in the video, so the viewer sees what was pressed and when.
function drawCursor() {
  const add = () => {
    const dot = document.createElement("div");
    dot.style.cssText = "position:fixed;z-index:2147483647;width:20px;height:20px;margin:-10px 0 0 -10px;border-radius:50%;" +
      "background:rgba(30,30,30,.35);border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.45);pointer-events:none;" +
      "transition:transform .1s ease;left:-50px;top:-50px";
    document.documentElement.appendChild(dot);
    addEventListener("mousemove", (event) => { dot.style.left = event.clientX + "px"; dot.style.top = event.clientY + "px"; }, true);
    addEventListener("mousedown", () => { dot.style.transform = "scale(.65)"; }, true);
    addEventListener("mouseup", () => { dot.style.transform = "scale(1)"; }, true);
  };
  if (document.documentElement) add(); else document.addEventListener("DOMContentLoaded", add, { once: true });
}

async function moveTo(page, selector) {
  const target = page.locator(selector).first();
  await target.scrollIntoViewIfNeeded({ timeout: 5000 });
  const box = await target.boundingBox();
  if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 14 });
  return target;
}

(async () => {
  const [root, out, label, stepsFile, ...flags] = process.argv.slice(2);
  const phone = flags.includes("--phone");
  const plan = JSON.parse(fs.readFileSync(stepsFile, "utf8"));
  fs.mkdirSync(out, { recursive: true });
  const videoFolder = fs.mkdtempSync(path.join(require("os").tmpdir(), "core-flow-"));
  const viewport = phone ? { width: 390, height: 844 } : { width: 1280, height: 800 };
  const { server, base } = await serve(root);
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport, deviceScaleFactor: 2, recordVideo: { dir: videoFolder, size: viewport } });
  await context.addInitScript(drawCursor);
  const page = await context.newPage();
  const failed = [];
  await page.goto(`${base}/${plan.entry || "index.html"}`, { waitUntil: "load", timeout: 30000 });
  await page.waitForTimeout(2500);
  for (const [action, first, second] of plan.steps) {
    try {
      if (action === "click") { const target = await moveTo(page, first); await page.waitForTimeout(250); await target.click({ timeout: 5000 }); }
      else if (action === "dblclick") { const target = await moveTo(page, first); await target.dblclick({ timeout: 5000 }); }
      else if (action === "hover") await moveTo(page, first);
      else if (action === "fill") { const target = await moveTo(page, first); await target.fill(second, { timeout: 5000 }); }
      else if (action === "type") { const target = await moveTo(page, first); await target.click({ timeout: 5000 }); await page.keyboard.type(second, { delay: 55 }); }
      else if (action === "select") { const target = await moveTo(page, first); await target.selectOption(second, { timeout: 5000 }); }
      else if (action === "press") await page.keyboard.press(first);
      else if (action === "scroll") await page.mouse.wheel(0, Number(first));
      else if (action === "wait") await page.waitForTimeout(Number(first));
      else if (action === "shot") await page.screenshot({ path: path.join(out, `${label}-${first}.png`) });
      else throw new Error(`unknown action ${action}`);
    } catch (error) {
      failed.push(`${action} ${first || ""}: ${String(error).split("\n")[0].slice(0, 120)}`);
    }
    if (!["wait", "shot"].includes(action)) await page.waitForTimeout(650);
  }
  await page.waitForTimeout(800);
  const video = page.video();
  await context.close();
  await browser.close();
  server.close();
  const webm = await video.path();
  const mp4 = path.join(out, `${label}-flow${phone ? "-phone" : ""}.mp4`);
  try {
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", webm, "-movflags", "+faststart", "-pix_fmt", "yuv420p", "-crf", "26", mp4]);
  } catch (error) {
    fs.copyFileSync(webm, mp4.replace(/\.mp4$/, ".webm"));
  }
  console.log(JSON.stringify({ label, video: mp4, failed }));
})().catch((error) => { console.error(String(error)); process.exit(1); });
