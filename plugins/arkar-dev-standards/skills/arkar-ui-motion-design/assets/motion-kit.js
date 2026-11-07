// motion-kit.js — small, dependency-free motion mechanics for plain web builds.
// Copy it into the project (e.g. js/motion-kit.js) and use it, so the
// choreography the motion standard asks for is cheap to do everywhere.
// It provides mechanics only; the product's own motion tokens decide the feel:
// define --motion-fast / --motion-base / --motion-slow (ms) and
// --ease-out / --ease-in-out / --ease-spring in CSS, or pass options.
// Everything respects prefers-reduced-motion (movement becomes a quick fade or
// an instant change) and returns a Promise that resolves when the motion ends.
// In React/Vue/Svelte prefer the framework's layout animations (Motion
// `layout`/`layoutId`, Vue <TransitionGroup>, Svelte flip) — same ideas.

const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

function token(name, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!value) return fallback;
  return name.startsWith("--motion") ? parseFloat(value) : value;
}

const timing = () => ({
  fast: token("--motion-fast", 160),
  base: token("--motion-base", 260),
  slow: token("--motion-slow", 420),
  out: token("--ease-out", "cubic-bezier(.2,.8,.2,1)"),
  inOut: token("--ease-in-out", "cubic-bezier(.65,0,.35,1)"),
  spring: token("--ease-spring", "cubic-bezier(.34,1.36,.64,1)"),
});

const finished = (animation) => animation.finished.catch(() => {});

// FLIP: change the DOM inside `mutate`, and every child of `container` glides
// from its old place to its new one — reorder, filter, insert, remove — so
// lists close gaps smoothly instead of jumping. New items fade/rise in.
export async function flip(container, mutate, { selector = ":scope > *", duration } = {}) {
  const t = timing();
  const before = new Map([...container.querySelectorAll(selector)].map((el) => [el, el.getBoundingClientRect()]));
  await mutate();
  const moves = [];
  for (const el of container.querySelectorAll(selector)) {
    const old = before.get(el);
    if (!old) {
      moves.push(el.animate([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }],
        { duration: reduced() ? t.fast : duration || t.base, easing: t.out, delay: reduced() ? 0 : t.fast / 2 }));
      continue;
    }
    const now = el.getBoundingClientRect();
    const dx = old.left - now.left;
    const dy = old.top - now.top;
    if (!dx && !dy) continue;
    if (reduced()) continue;
    moves.push(el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }],
      { duration: duration || t.base, easing: t.inOut }));
  }
  await Promise.all(moves.map(finished));
}

// Remove an element by letting it fade and collapse, then neighbours close the
// gap (use inside or before a flip for the rest of the list).
export async function collapseOut(el) {
  const t = timing();
  const height = el.getBoundingClientRect().height;
  el.style.overflow = "hidden";
  await finished(el.animate(
    reduced() ? [{ opacity: 1 }, { opacity: 0 }]
      : [{ opacity: 1, height: `${height}px` }, { opacity: 0, height: "0px", marginTop: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }],
    { duration: t.base, easing: t.inOut, fill: "forwards" }));
  el.remove();
}

// Skeleton → content hand-off in place: the content is laid out where the
// skeleton was (same size), the skeleton fades out as the content fades in.
// Under ~300 ms waits, skip the skeleton entirely (see `withLoading`).
export async function handOff(skeleton, content) {
  const t = timing();
  content.hidden = false;
  const out = skeleton.animate([{ opacity: 1 }, { opacity: 0 }], { duration: t.fast, easing: t.out, fill: "forwards" });
  const into = content.animate([{ opacity: 0, transform: reduced() ? "none" : "translateY(4px)" }, { opacity: 1, transform: "none" }],
    { duration: t.base, easing: t.out });
  await Promise.all([finished(out), finished(into)]);
  skeleton.remove();
}

// Runs `load()`; shows `showSkeleton()` only if it takes longer than `delay`
// ms (no spinner flash on fast data), and `slowNotice()` after `notice` ms.
export async function withLoading(load, { showSkeleton, hideSkeleton, slowNotice, delay = 250, notice = 2500 } = {}) {
  let shown = false;
  const skeletonTimer = setTimeout(() => { shown = true; showSkeleton && showSkeleton(); }, delay);
  const noticeTimer = setTimeout(() => slowNotice && slowNotice(), notice);
  try {
    return await load();
  } finally {
    clearTimeout(skeletonTimer);
    clearTimeout(noticeTimer);
    if (shown && hideSkeleton) await hideSkeleton();
  }
}

// Numbers roll from their current value to the new one (counts, totals) so a
// change is seen, not just swapped. Interrupting continues from where it is.
export function rollNumber(el, to, { format = (n) => Math.round(n).toLocaleString(), duration } = {}) {
  const t = timing();
  const from = Number(el.dataset.value ?? (parseFloat(el.textContent.replace(/[^\d.-]/g, "")) || 0));
  el.dataset.value = to;
  cancelAnimationFrame(el._roll);
  if (reduced() || from === to) { el.textContent = format(to); return Promise.resolve(); }
  const length = duration || t.slow;
  const start = performance.now();
  return new Promise((resolve) => {
    const step = (now) => {
      const p = Math.min(1, (now - start) / length);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = format(from + (to - from) * eased);
      if (p < 1) el._roll = requestAnimationFrame(step); else resolve();
    };
    el._roll = requestAnimationFrame(step);
  });
}

// Shared-element flight: a copy of `from` travels to where `to` is (an
// officer from the suggestion list into the empty shift, a card into its
// detail), then `to` is revealed. The eye follows cause to effect.
export async function fly(from, to, { duration } = {}) {
  const t = timing();
  if (reduced()) return;
  const a = from.getBoundingClientRect();
  const b = to.getBoundingClientRect();
  const ghost = from.cloneNode(true);
  Object.assign(ghost.style, { position: "fixed", left: `${a.left}px`, top: `${a.top}px`, width: `${a.width}px`,
    height: `${a.height}px`, margin: 0, zIndex: 9999, pointerEvents: "none", transformOrigin: "top left" });
  document.body.appendChild(ghost);
  to.style.visibility = "hidden";
  await finished(ghost.animate([{ transform: "none", opacity: 1 },
    { transform: `translate(${b.left - a.left}px, ${b.top - a.top}px) scale(${b.width / a.width}, ${b.height / a.height})`, opacity: 1 }],
  { duration: duration || t.slow, easing: t.inOut }));
  to.style.visibility = "";
  ghost.remove();
  await finished(to.animate([{ transform: "scale(.96)" }, { transform: "none" }], { duration: t.fast, easing: t.spring }));
}

// Open a panel, popover or dialog from the control that opened it (and close
// back into it). The panel must be opaque; the backdrop dims in step.
export async function openFrom(trigger, panel, { backdrop } = {}) {
  const t = timing();
  const a = trigger.getBoundingClientRect();
  panel.hidden = false;
  const b = panel.getBoundingClientRect();
  const origin = `${a.left + a.width / 2 - b.left}px ${a.top + a.height / 2 - b.top}px`;
  const moves = [panel.animate(reduced() ? [{ opacity: 0 }, { opacity: 1 }]
    : [{ opacity: 0, transform: "scale(.92)", transformOrigin: origin }, { opacity: 1, transform: "none", transformOrigin: origin }],
  { duration: t.base, easing: t.spring })];
  if (backdrop) { backdrop.hidden = false; moves.push(backdrop.animate([{ opacity: 0 }, { opacity: 1 }], { duration: t.base, easing: t.out })); }
  await Promise.all(moves.map(finished));
}

export async function closeInto(trigger, panel, { backdrop } = {}) {
  const t = timing();
  const a = trigger.getBoundingClientRect();
  const b = panel.getBoundingClientRect();
  const origin = `${a.left + a.width / 2 - b.left}px ${a.top + a.height / 2 - b.top}px`;
  const moves = [panel.animate(reduced() ? [{ opacity: 1 }, { opacity: 0 }]
    : [{ opacity: 1, transform: "none", transformOrigin: origin }, { opacity: 0, transform: "scale(.94)", transformOrigin: origin }],
  { duration: t.fast, easing: t.out, fill: "forwards" })];
  if (backdrop) moves.push(backdrop.animate([{ opacity: 1 }, { opacity: 0 }], { duration: t.fast, easing: t.out, fill: "forwards" }));
  await Promise.all(moves.map(finished));
  panel.hidden = true;
  if (backdrop) backdrop.hidden = true;
  trigger.focus({ preventScroll: true });
}

// Steps of a flow slide with direction (forward → left, back → right).
export async function slideStep(outgoing, incoming, direction = 1) {
  const t = timing();
  const distance = reduced() ? 0 : 24 * direction;
  incoming.hidden = false;
  await Promise.all([
    finished(outgoing.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: `translateX(${-distance}px)` }],
      { duration: t.fast, easing: t.out, fill: "forwards" })),
    finished(incoming.animate([{ opacity: 0, transform: `translateX(${distance}px)` }, { opacity: 1, transform: "none" }],
      { duration: t.base, easing: t.out, delay: t.fast / 2, fill: "backwards" })),
  ]);
  outgoing.hidden = true;
}

// A brief highlight that settles — "this row is the one that changed".
export function settle(el, { color = "var(--color-highlight, rgba(255, 214, 0, .28))" } = {}) {
  const t = timing();
  return finished(el.animate([{ backgroundColor: color }, { backgroundColor: "transparent" }],
    { duration: t.slow * 2, easing: t.out }));
}

// Pressed feedback for any control (also add :active styles in CSS).
export function pressable(root = document) {
  root.addEventListener("pointerdown", (event) => {
    const control = event.target.closest("button, [role=button], a.button");
    if (!control || control.disabled || reduced()) return;
    control.animate([{ transform: "scale(1)" }, { transform: "scale(.97)" }, { transform: "scale(1)" }],
      { duration: timing().fast * 1.6, easing: timing().out });
  });
}
