// Shared by interaction-probe.cjs and film.cjs.
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

// Motion is judged by eye from filmstrips: the page's animations are slowed
// down (Chrome's animation playback rate) so frames can be taken at known
// points of real time, then the frames are laid out on one image with their
// times. Covers CSS transitions, CSS animations and Web Animations (Motion).
const FILM_RATE = 0.2;
const FILM_TIMES = [0, 60, 120, 200, 300, 450, 650, 900];

// Page timers (simulated backends, streaming, toasts) are slowed by the same
// factor as animations, so a filmstrip shows the real sequence and timing.
function slowTimers() {
  const scale = () => window.__arkarFilmScale || 1;
  const originalTimeout = window.setTimeout;
  const originalInterval = window.setInterval;
  window.setTimeout = (callback, delay = 0, ...rest) => originalTimeout(callback, delay * scale(), ...rest);
  window.setInterval = (callback, delay = 0, ...rest) => originalInterval(callback, delay * scale(), ...rest);
}

async function prepareFilming(page) {
  await page.addInitScript(slowTimers);
}

async function setAnimationRate(session, rate, page) {
  if (page) await page.evaluate((scale) => { window.__arkarFilmScale = scale; }, 1 / rate).catch(() => {});
  await session.send("Animation.enable").catch(() => {});
  await session.send("Animation.setPlaybackRate", { playbackRate: rate }).catch(() => {});
}

// Runs in the page: the area covered by what is animating right now (padded),
// so a filmstrip zooms in on the motion instead of shrinking the whole page.
function movingArea() {
  const rects = document.getAnimations()
    .map((animation) => animation.effect && animation.effect.target)
    .filter((target) => target && target.getBoundingClientRect)
    .map((target) => target.getBoundingClientRect())
    .filter((rect) => rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight);
  if (!rects.length) return null;
  const pad = 48;
  const left = Math.max(0, Math.min(...rects.map((r) => r.left)) - pad);
  const top = Math.max(0, Math.min(...rects.map((r) => r.top)) - pad);
  const right = Math.min(innerWidth, Math.max(...rects.map((r) => r.right)) + pad);
  const bottom = Math.min(innerHeight, Math.max(...rects.map((r) => r.bottom)) + pad);
  if ((right - left) * (bottom - top) > innerWidth * innerHeight * 0.6) return null;
  return { x: left, y: top, width: right - left, height: bottom - top };
}

// Frame times for a longer span (e.g. an AI answer arriving): front-loaded,
// because the first moments after an action matter most.
function filmTimes(span) {
  if (!span || span <= 900) return FILM_TIMES;
  return [0, 100, 250, 500, 0.35, 0.55, 0.78, 1].map((t) => (t <= 1 ? Math.round(t * span) : t));
}

async function captureFilm(page, session, act, zoom = true, times = FILM_TIMES) {
  await setAnimationRate(session, FILM_RATE, page);
  // A navigation starts a fresh page; slowTimers reads this flag from the start.
  await page.addInitScript((scale) => { window.__arkarFilmScale = scale; }, 1 / FILM_RATE).catch(() => {});
  const frames = [];
  const start = Date.now();
  await act();
  const clip = zoom ? await page.evaluate(movingArea).catch(() => null) : null;
  for (const time of times) {
    const wait = time / FILM_RATE - (Date.now() - start);
    if (wait > 0) await page.waitForTimeout(wait);
    const realTime = Math.round((Date.now() - start) * FILM_RATE);
    const image = await page.screenshot({ type: "jpeg", quality: 75, ...(clip ? { clip } : {}) });
    frames.push({ time: realTime, data: image.toString("base64") });
  }
  await setAnimationRate(session, 1, page);
  // Init scripts run in order, so this one undoes the slow-down for later navigations.
  await page.addInitScript(() => { window.__arkarFilmScale = 1; }).catch(() => {});
  return { frames, clip };
}

async function saveFilm(browser, film, title, outputPath, width, height) {
  const { frames, clip } = film;
  if (clip) { width = clip.width; height = clip.height; }
  const columns = 4;
  const frameWidth = clip && clip.width < 420 ? Math.round(clip.width) : 420;
  const frameHeight = Math.round(frameWidth * height / width);
  const cells = frames.map((frame) => `<figure><img src="data:image/jpeg;base64,${frame.data}">` +
    `<figcaption>${frame.time} ms</figcaption></figure>`).join("");
  const html = `<style>body{margin:0;padding:16px;background:#111;color:#eee;font:13px system-ui}
    h1{font-size:14px;margin:0 0 10px} .grid{display:grid;grid-template-columns:repeat(${columns},${frameWidth}px);gap:10px}
    figure{margin:0} img{width:${frameWidth}px;height:${frameHeight}px;display:block;border:1px solid #333}
    figcaption{padding:3px 0}</style><h1>${title}</h1><div class="grid">${cells}</div>`;
  const sheet = await browser.newPage({ viewport: { width: columns * (frameWidth + 10) + 32, height: 400 } });
  await sheet.setContent(html);
  await sheet.screenshot({ path: outputPath, fullPage: true });
  await sheet.close();
}


module.exports = { prepareFilming, captureFilm, filmTimes, saveFilm, setAnimationRate, loadPlaywright, isLocalUrl, FILM_RATE };
