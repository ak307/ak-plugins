// Records a user journey on a local page as a real-speed video, so the whole
// experience — presses, loading settling into results, success messages,
// errors and recovery, transitions — can be watched the way a user meets it.
// Filmstrips (film.cjs) show one moment frame by frame; this shows the flow.
//
// Usage (from the project folder):
//   node <path-to>/record.cjs <url> <output.mp4> [--size=1440x900] [--reduced] [--cursor] <step> [<step> ...]
//
// Steps (Playwright selectors, as in film.cjs):
//   click=<selector>          move to it and click (the pointer is drawn when --cursor is set)
//   hover=<selector>          move over it
//   press=<key>               press a key (Enter, Escape, Tab, Control+K…)
//   type=<selector>=<text>    type text at a human pace
//   scroll=<pixels>           scroll the page smoothly
//   wait=<ms>                 hold so the result can be seen
//
// Each step is followed by a short hold so its result is visible. The video
// is .webm from the browser, converted to .mp4 when ffmpeg is available.
// Safety: local URLs only; it runs only the steps you give it.

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { loadPlaywright, isLocalUrl } = require("./film-lib.cjs");

// A visible pointer, so viewers can see what was clicked and when.
function drawCursor() {
  if (!document.documentElement) {
    document.addEventListener("DOMContentLoaded", drawCursor, { once: true });
    return;
  }
  const dot = document.createElement("div");
  dot.id = "__arkar_cursor";
  dot.style.cssText = "position:fixed;z-index:2147483647;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;" +
    "background:rgba(20,20,20,.35);border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);pointer-events:none;" +
    "transition:transform .12s ease;left:-40px;top:-40px";
  document.documentElement.appendChild(dot);
  addEventListener("mousemove", (event) => { dot.style.left = event.clientX + "px"; dot.style.top = event.clientY + "px"; }, true);
  addEventListener("mousedown", () => { dot.style.transform = "scale(.7)"; }, true);
  addEventListener("mouseup", () => { dot.style.transform = "scale(1)"; }, true);
}

async function moveTo(page, locator) {
  const box = await locator.boundingBox();
  if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 18 });
}

async function main() {
  const args = process.argv.slice(2);
  const [url, output] = args;
  if (!url || !output) {
    console.error("Usage: node record.cjs <url> <output.mp4> [--size=WxH] [--reduced] [--cursor] <step> ...");
    process.exit(1);
  }
  if (!isLocalUrl(url)) {
    console.error("Refusing: recording runs against a local app only (localhost / 127.0.0.1 / *.test).");
    process.exit(1);
  }
  const flags = args.slice(2).filter((arg) => arg.startsWith("--"));
  const steps = args.slice(2).filter((arg) => !arg.startsWith("--"));
  const sizeFlag = flags.find((flag) => flag.startsWith("--size="));
  const [width, height] = (sizeFlag ? sizeFlag.split("=")[1] : "1440x900").split("x").map(Number);
  const videoFolder = fs.mkdtempSync(path.join(os.tmpdir(), "arkar-record-"));
  fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });

  const { chromium } = loadPlaywright();
  const browser = await chromium.launch();
  const errors = [];
  try {
    const context = await browser.newContext({
      viewport: { width, height },
      reducedMotion: flags.includes("--reduced") ? "reduce" : "no-preference",
      recordVideo: { dir: videoFolder, size: { width, height } },
    });
    if (flags.includes("--cursor")) await context.addInitScript(drawCursor);
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(url, { waitUntil: "load", timeout: 30000 });
    await page.waitForTimeout(1500);
    for (const step of steps) {
      const [kind, ...rest] = step.split("=");
      const value = rest.join("=");
      try {
        if (kind === "click" || kind === "hover") {
          // The first *visible* match: text can also exist in hidden labels or SVG titles.
          const target = page.locator(`${value} >> visible=true`).first();
          await target.scrollIntoViewIfNeeded({ timeout: 3000 });
          await moveTo(page, target);
          if (kind === "click") await target.click({ timeout: 3000 });
        } else if (kind === "press") {
          await page.keyboard.press(value);
        } else if (kind === "type") {
          const split = value.lastIndexOf("=");
          const field = page.locator(value.slice(0, split)).first();
          await moveTo(page, field);
          await field.click({ timeout: 3000 });
          await page.keyboard.type(value.slice(split + 1), { delay: 45 });
        } else if (kind === "scroll") {
          await page.mouse.wheel(0, Number(value));
        } else if (kind === "wait") {
          await page.waitForTimeout(Number(value));
          continue;
        } else {
          console.error(`Unknown step "${step}"`);
          continue;
        }
      } catch (error) {
        errors.push(`${step}: ${error.message.split("\n")[0]}`);
      }
      await page.waitForTimeout(1200);
    }
    await page.waitForTimeout(800);
    await context.close();
    const recorded = fs.readdirSync(videoFolder).find((name) => name.endsWith(".webm"));
    const source = path.join(videoFolder, recorded);
    let saved = output;
    try {
      execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", source, "-c:v", "libx264", "-preset", "veryfast",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart", output]);
    } catch {
      saved = output.replace(/\.mp4$/, "") + ".webm";
      fs.copyFileSync(source, saved);
    }
    console.log(`recorded → ${saved}`);
    if (errors.length) console.log(`problems: ${errors.slice(0, 6).join(" | ")}`);
  } finally {
    await browser.close();
    fs.rmSync(videoFolder, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
