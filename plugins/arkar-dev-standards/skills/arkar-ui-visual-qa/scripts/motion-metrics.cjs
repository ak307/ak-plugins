// Measures motion and interaction quality from real interactions on a local
// page — numbers to go with watching the video, never instead of it:
//   - input response: time from the press or key to the first visible change;
//   - timing and easing of every animation the step started (CSS transitions,
//     CSS animations, Web Animations, and script-driven style animation such
//     as springs);
//   - frame pacing: janky frames and the longest frame while it moved;
//   - continuity: layout shift, things that popped in or vanished without a
//     transition, elements that jumped instead of travelling;
//   - interruption: a step written as `<step>@<ms>` starts that many ms after
//     the previous one, mid-animation; it must reverse or continue smoothly
//     and settle, never snap;
//   - reduced motion (--reduced): movement left in place counts as a defect.
//
// Usage (from the project folder):
//   node <path-to>/motion-metrics.cjs <url> [--size=1440x900] [--reduced] [--json] <step> [<step> ...]
// Steps are the same as record.cjs: click=<selector> hover=<selector> press=<key>
//   type=<selector>=<text> scroll=<pixels> wait=<ms>; add @<ms> to interrupt.
// Example: node motion-metrics.cjs http://localhost:5173 click=.row >> nth=0 press=Escape@120
//
// Headless frame timing is indicative, not a device measurement: treat one
// janky frame as noise, a pattern as a defect. Safety: local URLs only.

const { loadPlaywright, isLocalUrl } = require("./film-lib.cjs");

const SETTLE_QUIET_MS = 300;
const SETTLE_MAX_MS = 4000;

// Runs inside the page from the first script: records every frame, animation,
// style-driven motion, mutation, input and layout shift with its time.
function installRecorder() {
  const state = { frames: [], animations: [], inputs: [], mutations: [], shifts: [], styleMotion: new Map(),
    inserted: [], removed: [], swapped: [], sizes: new WeakMap() };
  const seen = new WeakMap();
  const lastMoved = new WeakMap();
  let nextId = 0;
  const describe = (element) => {
    if (!element || !element.tagName) return "?";
    let text = element.tagName.toLowerCase();
    if (element.id) text += "#" + element.id;
    const classes = typeof element.className === "string" ? element.className.trim().split(/\s+/).slice(0, 2) : [];
    if (classes.length && classes[0]) text += "." + classes.join(".");
    return text;
  };
  const MOVING = /transform|translate|scale|rotate|left|top|right|bottom|width|height|inset|offset|clip|path/i;
  const markMoved = (element, time) => { if (element) lastMoved.set(element, time); };
  const movedRecently = (element, time, window) => {
    for (let node = element, depth = 0; node && depth < 6; node = node.parentElement, depth += 1) {
      const moved = lastMoved.get(node);
      if (moved !== undefined && time - moved < window) return true;
    }
    return false;
  };
  const frame = (time) => {
    state.frames.push(time);
    for (const animation of document.getAnimations()) {
      const target = animation.effect && animation.effect.target;
      if (!target) continue;
      let record = seen.get(animation);
      if (!record) {
        const timing = animation.effect.getTiming();
        const keyframes = animation.effect.getKeyframes ? animation.effect.getKeyframes() : [];
        const properties = new Set();
        keyframes.forEach((keyframe) => Object.keys(keyframe).forEach((key) => {
          if (!["offset", "computedOffset", "easing", "composite"].includes(key)) properties.add(key);
        }));
        if (animation.transitionProperty) properties.add(animation.transitionProperty);
        record = { id: nextId++, target: describe(target), element: target, start: time, last: time,
          duration: typeof timing.duration === "number" ? timing.duration : 0, delay: timing.delay || 0,
          easing: timing.easing !== "linear" ? timing.easing : (keyframes[0] && keyframes[0].easing) || "linear",
          infinite: timing.iterations === Infinity, properties: [...properties], positions: [] };
        record.moves = record.properties.some((property) => MOVING.test(property));
        seen.set(animation, record);
        state.animations.push(record);
      }
      record.last = time;
      markMoved(target, time);
      if (record.positions.length < 240) {
        const box = target.getBoundingClientRect();
        record.positions.push([time, box.x, box.y]);
      }
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  const observer = new MutationObserver((records) => {
    const time = performance.now();
    for (const record of records) {
      state.mutations.push(time);
      if (record.type === "attributes" && record.attributeName === "style" && record.target.tagName) {
        let motion = state.styleMotion.get(record.target);
        if (!motion) {
          motion = { target: describe(record.target), element: record.target, times: [], positions: [] };
          state.styleMotion.set(record.target, motion);
        }
        if (motion.times.length < 400) {
          motion.times.push(time);
          const box = record.target.getBoundingClientRect();
          motion.positions.push([time, box.x, box.y]);
        }
        markMoved(record.target, time);
      }
      if (record.type === "childList") {
        record.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) return;
          const entry = { target: describe(node), time, element: node };
          state.inserted.push(entry);
          // Judge two frames later, once any entrance animation has started.
          requestAnimationFrame(() => requestAnimationFrame(() => {
            const box = node.getBoundingClientRect();
            entry.size = box.width * box.height;
            if (node.isConnected) state.sizes.set(node, entry.size);
            entry.animated = node.getAnimations({ subtree: true }).length > 0 || movedRecently(node, performance.now(), 250);
          }));
        });
        record.removedNodes.forEach((node) => {
          if (node.nodeType !== 1) return;
          state.swapped.push({ target: describe(node), time });
          const size = state.sizes.get(node) || 0;
          const role = node.getAttribute && node.getAttribute("role");
          if (size < 2000 && !/dialog|alert|status|menu|listbox|tooltip/.test(role || "")) return;
          state.removed.push({ target: describe(node), time, animated: movedRecently(record.target, time, 450)
            || lastMoved.get(node) !== undefined && time - lastMoved.get(node) < 450 });
        });
      }
    }
  });
  const start = () => observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true,
    attributeFilter: ["style", "class", "hidden", "open", "aria-expanded", "aria-hidden", "data-state"] });
  if (document.documentElement) start(); else document.addEventListener("DOMContentLoaded", start, { once: true });

  for (const type of ["pointerdown", "keydown", "wheel"]) {
    addEventListener(type, (event) => state.inputs.push({ type, time: performance.now(), key: event.key || "" }), true);
  }
  try {
    new PerformanceObserver((list) => list.getEntries().forEach((entry) => state.shifts.push(
      { time: entry.startTime, value: entry.value, recent: entry.hadRecentInput }))).observe({ type: "layout-shift", buffered: true });
  } catch { /* not supported */ }

  // A summary of one window of time, computed here so elements never leave the page.
  window.__arkarMotion = {
    now: () => performance.now(),
    busy: (since) => {
      const time = performance.now();
      const running = document.getAnimations().filter((animation) => animation.playState === "running"
        && animation.effect && animation.effect.getTiming().iterations !== Infinity).length;
      const recent = state.mutations.length ? time - state.mutations[state.mutations.length - 1] : Infinity;
      return { running, quietFor: Math.min(recent, time - since) };
    },
    report: (from, to) => {
      const inside = (time) => time >= from && time <= to;
      const frames = state.frames.filter(inside);
      const deltas = frames.slice(1).map((time, index) => time - frames[index]);
      const sorted = [...deltas].sort((a, b) => a - b);
      const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 16.7;
      // A jump is one frame far larger than the frames on either side of it — a snap,
      // not the fast start of an ease-out (whose next frames are almost as large).
      const jumpOf = (positions) => {
        const steps = positions.slice(1).map(([, x, y], index) => Math.hypot(x - positions[index][1], y - positions[index][2]));
        let largest = 0;
        steps.forEach((step, index) => {
          const neighbours = [steps[index - 1], steps[index + 1]].filter((value) => value !== undefined);
          if (step > 40 && neighbours.length && neighbours.every((value) => step > 2.5 * value + 4)) largest = Math.max(largest, step);
        });
        return Math.round(largest);
      };
      const animations = state.animations.filter((record) => inside(record.start)).map((record) => ({
        target: record.target, duration: Math.round(record.duration), delay: Math.round(record.delay),
        easing: record.easing, infinite: record.infinite, properties: record.properties, moves: record.moves,
        seenFor: Math.round(record.last - record.start), jump: jumpOf(record.positions.filter(([time]) => inside(time))),
      }));
      const scripted = [...state.styleMotion.values()].map((motion) => {
        const times = motion.times.filter(inside);
        if (times.length < 4) return null;
        return { target: motion.target, duration: Math.round(times[times.length - 1] - times[0]), updates: times.length,
          jump: jumpOf(motion.positions.filter(([time]) => inside(time))) };
      }).filter(Boolean);
      // A re-render replaces an element with an identical one in the same moment: not a pop-in or an exit.
      const swappedNear = (entry, list) => list.some((other) => other.target === entry.target && Math.abs(other.time - entry.time) < 80);
      const input = state.inputs.filter((entry) => inside(entry.time))[0];
      let response = null;
      if (input) {
        const changes = state.mutations.filter((time) => time >= input.time);
        const firstAnimation = state.animations.filter((record) => record.start >= input.time).map((record) => record.start);
        const firstChange = Math.min(changes[0] ?? Infinity, firstAnimation[0] ?? Infinity);
        const shown = frames.find((time) => time >= firstChange);
        if (shown !== undefined) response = Math.round(shown - input.time);
      }
      return {
        frames: frames.length, medianFrame: Math.round(median * 10) / 10,
        janky: deltas.filter((delta) => delta > Math.max(2 * median, 34)).length,
        longestFrame: Math.round(sorted[sorted.length - 1] || 0),
        response, inputType: input ? input.type : null,
        animations, scripted,
        layoutShift: Math.round(state.shifts.filter((entry) => inside(entry.time)).reduce((sum, entry) => sum + entry.value, 0) * 1000) / 1000,
        poppedIn: state.inserted.filter((entry) => inside(entry.time) && entry.size > 2000 && entry.animated === false
          && !swappedNear(entry, state.swapped)).map((entry) => entry.target),
        vanished: state.removed.filter((entry) => inside(entry.time) && !entry.animated && !swappedNear(entry, state.inserted)).map((entry) => entry.target),
      };
    },
  };
}

function parseStep(raw) {
  const match = raw.match(/^(.*?)@(\d+)$/);
  const text = match ? match[1] : raw;
  const [action, ...rest] = text.split("=");
  return { raw, action, value: rest.join("="), after: match ? Number(match[2]) : null };
}

async function perform(page, step) {
  if (step.action === "click") await page.locator(step.value).first().click({ timeout: 5000 });
  else if (step.action === "hover") await page.locator(step.value).first().hover({ timeout: 5000 });
  else if (step.action === "press") await page.keyboard.press(step.value);
  else if (step.action === "type") {
    const [selector, ...text] = step.value.split("=");
    await page.locator(selector).first().click({ timeout: 5000 });
    await page.keyboard.type(text.join("="), { delay: 60 });
  } else if (step.action === "scroll") await page.mouse.wheel(0, Number(step.value));
  else if (step.action === "wait") await page.waitForTimeout(Number(step.value));
  else throw new Error(`unknown step: ${step.raw}`);
}

async function settle(page, since) {
  const deadline = Date.now() + SETTLE_MAX_MS;
  while (Date.now() < deadline) {
    const { running, quietFor } = await page.evaluate((from) => window.__arkarMotion.busy(from), since);
    if (running === 0 && quietFor >= SETTLE_QUIET_MS) return true;
    await page.waitForTimeout(50);
  }
  return false;
}

// Turns one step's numbers into findings a person can act on.
function findings(report, step, reduced) {
  const notes = [];
  if (report.response !== null && report.response > 100) {
    notes.push(`slow response: ${report.response} ms from ${report.inputType} to the first visible change (aim ≤ 100 ms)`);
  }
  const moving = report.animations.some((item) => !item.infinite) || report.scripted.length;
  if (moving && report.medianFrame > 25) {
    notes.push(`low frame rate while animating: median frame ${report.medianFrame} ms (~${Math.round(1000 / report.medianFrame)} fps) — ` +
      "headless rendering is slower than a GPU, so confirm on a device; heavy blur, shadows or loops are the usual cause");
  }
  if (report.janky > 2) notes.push(`frame pacing: ${report.janky} janky frames, longest ${report.longestFrame} ms`);
  for (const animation of report.animations.filter((item) => !item.infinite)) {
    const name = `${animation.target} (${animation.properties.join(", ") || "?"})`;
    if (animation.moves && /^linear$/.test(animation.easing)) notes.push(`linear easing on movement: ${name}`);
    if (animation.duration > 700) notes.push(`slow: ${name} runs ${animation.duration} ms`);
    if (animation.jump) notes.push(`jump: ${name} moved ${animation.jump} px in one frame`);
    if (reduced && animation.moves && animation.duration > 100) notes.push(`reduced motion ignored: ${name} still moves for ${animation.duration} ms`);
  }
  for (const motion of report.scripted) {
    if (motion.jump) notes.push(`jump: ${motion.target} (script-driven) moved ${motion.jump} px in one frame`);
    if (reduced && motion.duration > 150) notes.push(`reduced motion ignored: ${motion.target} animates by script for ${motion.duration} ms`);
  }
  if (report.layoutShift > 0.05) notes.push(`layout shift ${report.layoutShift} (content jolted)`);
  // With reduced motion an instant change is the right answer, so only movement is reported there.
  if (!reduced) {
    report.poppedIn.slice(0, 4).forEach((target) => notes.push(`popped in without a transition: ${target}`));
    report.vanished.slice(0, 4).forEach((target) => notes.push(`vanished without a transition: ${target}`));
  }
  if (!report.settled) notes.push(step.after !== null ? "interrupted motion never settled" : "never settled (still animating after 4 s)");
  return notes;
}

function printStep(index, step, report) {
  const finite = report.animations.filter((item) => !item.infinite);
  console.log(`\n${index < 0 ? "Load" : `${index + 1}.`} ${step.raw}${step.after !== null ? `  (interrupts ${step.after} ms after the previous step)` : ""}`);
  console.log(`   response ${report.response ?? "—"} ms · frames ${report.frames} (median ${report.medianFrame} ms, janky ${report.janky}, longest ${report.longestFrame} ms)` +
    ` · layout shift ${report.layoutShift}`);
  for (const animation of finite.slice(0, 8)) {
    console.log(`   - ${animation.target}: ${animation.properties.join(", ") || "?"} · ${animation.duration} ms` +
      `${animation.delay ? ` (+${animation.delay} delay)` : ""} · ${animation.easing}${animation.jump ? ` · JUMP ${animation.jump}px` : ""}`);
  }
  if (finite.length > 8) console.log(`   … ${finite.length - 8} more animations`);
  for (const motion of report.scripted.slice(0, 4)) {
    console.log(`   - ${motion.target}: script-driven · ${motion.duration} ms over ${motion.updates} updates`);
  }
  const loops = report.animations.length - finite.length;
  if (loops) console.log(`   (${loops} looping animation${loops > 1 ? "s" : ""} running)`);
  if (!finite.length && !report.scripted.length) console.log("   - no animation: the change was instant");
  report.findings.forEach((note) => console.log(`   ⚠ ${note}`));
}

async function main() {
  const args = process.argv.slice(2);
  const url = args[0];
  if (!url || url.startsWith("--")) {
    console.error("Usage: node motion-metrics.cjs <url> [--size=WxH] [--reduced] [--json] <step> [<step> ...]");
    process.exit(1);
  }
  if (!isLocalUrl(url)) {
    console.error("Refusing: motion checks run against a local app only (localhost / 127.0.0.1 / *.test).");
    process.exit(1);
  }
  const flags = args.slice(1).filter((arg) => arg.startsWith("--"));
  const steps = args.slice(1).filter((arg) => !arg.startsWith("--")).map(parseStep);
  const size = (flags.find((flag) => flag.startsWith("--size=")) || "--size=1440x900").slice(7).split("x").map(Number);
  const reduced = flags.includes("--reduced");
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: size[0], height: size[1] }, reducedMotion: reduced ? "reduce" : "no-preference" });
  await page.addInitScript(installRecorder);
  await page.goto(url, { waitUntil: "load" });
  const loadStart = 0;
  const loadSettled = await settle(page, loadStart);
  const results = [];
  const load = await page.evaluate(([from]) => window.__arkarMotion.report(from, window.__arkarMotion.now()), [loadStart]);
  load.settled = loadSettled;
  load.findings = findings(load, { raw: "first load", after: null }, reduced);
  results.push({ step: "first load", ...load });
  if (!flags.includes("--json")) printStep(-1, { raw: "first load", after: null }, load);

  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index];
    const next = steps[index + 1];
    const from = await page.evaluate(() => window.__arkarMotion.now());
    try {
      await perform(page, step);
    } catch (error) {
      results.push({ step: step.raw, error: String(error.message || error).split("\n")[0] });
      if (!flags.includes("--json")) console.log(`\n${index + 1}. ${step.raw}\n   ✗ ${results[results.length - 1].error}`);
      continue;
    }
    let settled = true;
    if (next && next.after !== null) await page.waitForTimeout(next.after);
    else settled = await settle(page, from);
    const to = await page.evaluate(() => window.__arkarMotion.now());
    const report = await page.evaluate(([start, end]) => window.__arkarMotion.report(start, end), [from, to]);
    report.settled = settled || (next && next.after !== null);
    report.findings = next && next.after !== null ? [] : findings(report, step, reduced);
    results.push({ step: step.raw, ...report });
    if (!flags.includes("--json")) printStep(index, step, report);
  }
  await browser.close();
  const total = results.reduce((sum, result) => sum + (result.findings ? result.findings.length : 1), 0);
  if (flags.includes("--json")) console.log(JSON.stringify({ url, reduced, size, steps: results }));
  else console.log(`\n${total ? `${total} finding(s) — check each against the video before fixing.` : "No findings. Still watch the video: numbers can't judge feel."}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
