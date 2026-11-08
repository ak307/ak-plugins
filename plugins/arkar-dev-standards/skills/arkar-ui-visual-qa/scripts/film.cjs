// Films a user flow on a local page so its motion can be judged by eye: each
// step that should move something (click, press, hover) is captured as a
// slowed-down filmstrip with real-time labels (see film-lib.cjs).
//
// Usage (from the project folder):
//   node <path-to>/film.cjs <url> <output-folder> [--size=1440x900] [--reduced] [--span=ms] <step> [<step> ...]
//
// --span=3000 spreads the 8 frames over 3 s instead of 0.9 s (an AI answer, a
// multi-step sequence).
//
// Steps (Playwright selectors, e.g. "#ask", "text=Deactivate", "tr >> nth=2"):
//   click=<selector>          film what happens after the click
//   hover=<selector>          film the hover response
//   press=<key>               film after a key press (e.g. press=Enter, press=Escape)
//   type=<selector>=<text>    type text (not filmed)
//   wait=<ms>                 wait (not filmed)
//
// Example — an AI answer streaming in, then opening its source:
//   node film.cjs http://127.0.0.1:8000/ shots/flows "type=#ask=Which claims broke policy?" press=Enter "click=text=Source 1"
//
// --reduced films the same flow with reduced motion switched on.
// Safety: local URLs only; it runs only the steps you give it.

const fs = require("node:fs");
const path = require("node:path");
const { prepareFilming, captureFilm, filmTimes, saveFilm, loadPlaywright, isLocalUrl } = require("./film-lib.cjs");

async function main() {
  const args = process.argv.slice(2);
  const [url, outputFolder] = args;
  if (!url || !outputFolder) {
    console.error("Usage: node film.cjs <url> <output-folder> [--size=WxH] [--reduced] <step> ...");
    process.exit(1);
  }
  if (!isLocalUrl(url)) {
    console.error("Refusing: filming runs against a local app only (localhost / 127.0.0.1 / *.test).");
    process.exit(1);
  }
  const flags = args.slice(2).filter((arg) => arg.startsWith("--"));
  const steps = args.slice(2).filter((arg) => !arg.startsWith("--"));
  const sizeFlag = flags.find((flag) => flag.startsWith("--size="));
  const [width, height] = (sizeFlag ? sizeFlag.split("=")[1] : "1440x900").split("x").map(Number);
  const reduced = flags.includes("--reduced");
  const spanFlag = flags.find((flag) => flag.startsWith("--span="));
  const times = filmTimes(spanFlag ? Number(spanFlag.split("=")[1]) : 0);
  fs.mkdirSync(outputFolder, { recursive: true });
  const ignoreFile = path.join(path.dirname(outputFolder), ".gitignore");
  if (!fs.existsSync(ignoreFile)) fs.writeFileSync(ignoreFile, "*\n");

  const { chromium } = loadPlaywright();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: reduced ? "reduce" : "no-preference" });
    await prepareFilming(page);
    const session = await page.context().newCDPSession(page);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(url, { waitUntil: "load", timeout: 30000 });
    await page.waitForTimeout(1500);
    let number = 0;
    for (const step of steps) {
      const [kind, ...rest] = step.split("=");
      const value = rest.join("=");
      if (kind === "wait") {
        await page.waitForTimeout(Number(value));
        continue;
      }
      if (kind === "type") {
        const split = value.lastIndexOf("=");
        await page.locator(value.slice(0, split)).first().fill(value.slice(split + 1));
        continue;
      }
      const actions = {
        click: () => page.locator(value).first().click({ timeout: 3000 }),
        hover: () => page.locator(value).first().hover({ timeout: 3000 }),
        press: () => page.keyboard.press(value),
      };
      if (!actions[kind]) {
        console.error(`Unknown step "${step}"`);
        continue;
      }
      number += 1;
      const film = await captureFilm(page, session, () => actions[kind]().catch((error) => errors.push(error.message)), true, times);
      const file = path.join(outputFolder, `${String(number).padStart(2, "0")}-${kind}-${value.replace(/[^a-z0-9]+/gi, "-").slice(0, 30)}${reduced ? "-reduced" : ""}.png`);
      await saveFilm(browser, film, `${step}${reduced ? " (reduced motion)" : ""} — slowed; times are real`, file, width, height);
      console.log(`${step} → ${file}`);
      await page.waitForTimeout(400);
    }
    if (errors.length) console.log(`problems: ${errors.slice(0, 5).join(" | ")}`);
  } finally {
    await browser.close();
  }
  console.log("Look at each strip: does the motion explain what happened, feel natural and premium, and never make you wait?");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
