// Screenshot one surface: open the page, run the steps that bring it on screen, shoot the viewport.
// node evals/surface-shot.cjs <url> <out.png> <width>x<height> <step> [<step> ...]
const { chromium } = require("playwright");

(async () => {
  const [url, out, size, ...steps] = process.argv.slice(2);
  const [width, height] = size.split("x").map(Number);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
  await page.goto(url, { waitUntil: "load" });
  await page.waitForTimeout(1200);
  for (const step of steps) {
    const [action, ...rest] = step.split("=");
    const value = rest.join("=");
    if (action === "click") await page.locator(value).first().click({ timeout: 5000 });
    else if (action === "press") await page.keyboard.press(value);
    else if (action === "wait") await page.waitForTimeout(Number(value));
  }
  await page.waitForTimeout(600);
  await page.screenshot({ path: out });
  await browser.close();
})().catch((error) => { console.error(error.message); process.exit(1); });
