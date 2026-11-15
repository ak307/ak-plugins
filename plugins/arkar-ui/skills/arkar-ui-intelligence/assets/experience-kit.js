// experience-kit.js — dependency-free building blocks for the experience
// standard in plain web builds (mock data, prototypes, static apps).
// Copy it into the project (e.g. js/experience-kit.js) and build on it, so
// the behaviour testers check is there by default:
//   • a mock data layer that behaves like a real server — variable latency,
//     the standard ?latency=slow and ?fail=1 switches on EVERY request, and
//     the user's changes persisted (localStorage) so a refresh never undoes work;
//   • view state in the URL (filters, search, selected item, step) with
//     history, so refresh, Back/Forward and shared links land on the same view;
//   • drafts that survive closing and refresh;
//   • toasts placed next to the action, one at a time, with undo, announced;
//   • roving focus for grids/charts/tile sets, and focus kept through re-renders;
//   • a scroll edge for whatever stays at the top: its material changes once content
//     is under it, focus and jump targets never land beneath it, and one compact bar
//     takes over the page's context when the title scrolls out.
// It is mechanics only — the product's own design styles the toast etc.
// In React/Vue/Svelte, keep the same behaviour with the framework's router,
// stores and components; the switches and persistence rules are identical.
// Security (arkar-security frontend.md): the test switches work only on a
// local or .test host; the URL carries IDs and filters, never personal data;
// drafts of forms with personal data use { sensitive: true } (sessionStorage);
// clearAppStorage() on sign-out. Mock data is invented — never real people.

const params = () => new URLSearchParams(location.search);
// ?latency and ?fail are development tools: ignored anywhere but a local host, so they
// can't become a way to break or slow a deployed app.
const localHost = () => location.protocol === "file:" || /^(localhost|127\.0\.0\.1|\[::1\])$|\.(test|localhost)$/.test(location.hostname);
const switches = () => (localHost() ? params() : new URLSearchParams());
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---- Mock server ---------------------------------------------------------

// latency: fast by default with natural variation; ?latency=slow → 3–8 s;
// ?latency=fast → ~0 (for demos). Failures: ?fail=1 → each operation (by its
// name) fails on its first try and succeeds on every retry, so recovery can
// be seen — name operations by what the user does ("load cards", "save
// card"), not per internal call; ?fail=always → every request fails.
const attempts = new Map();

export async function request(operation, run) {
  const latency = switches().get("latency");
  const ms = latency === "slow" ? 3000 + Math.random() * 5000
    : latency === "fast" ? 0
      : 200 + Math.random() * 1000 * (Math.random() < 0.1 ? 2.5 : 1);
  await wait(ms);
  const fail = switches().get("fail");
  const tries = (attempts.get(operation) || 0) + 1;
  attempts.set(operation, tries);
  if (fail === "always" || (fail === "1" && tries === 1)) {
    const error = new Error(`Couldn't ${operation.replace(/[-_]/g, " ")}. Check the connection and try again.`);
    error.retryable = true;
    throw error;
  }
  return run();
}

// A persistent mock table: seed data plus the user's changes, kept in
// localStorage so refresh shows what the user did. reset() for a demo menu.
// Mock data only — real records come from the server and aren't cached here.
export function createStore(name, seed) {
  const key = `mock:${name}`;
  const load = () => {
    try { return JSON.parse(localStorage.getItem(key)) ?? structuredClone(seed); } catch { return structuredClone(seed); }
  };
  let rows = load();
  const save = () => { try { localStorage.setItem(key, JSON.stringify(rows)); } catch { /* private mode */ } };
  return {
    list: (filter = () => true) => request(`load ${name}`, () => rows.filter(filter)),
    get: (id) => request(`load ${name}`, () => rows.find((row) => row.id === id)),
    update: (id, changes, label = `save ${name}`) => request(label, () => {
      rows = rows.map((row) => (row.id === id ? { ...row, ...changes } : row));
      save();
      return rows.find((row) => row.id === id);
    }),
    updateMany: (ids, changes, label = `save ${name}`) => request(label, () => {
      const set = new Set(ids);
      rows = rows.map((row) => (set.has(row.id) ? { ...row, ...changes } : row));
      save();
      return rows.filter((row) => set.has(row.id));
    }),
    insert: (row, label = `create ${name}`) => request(label, () => { rows = [row, ...rows]; save(); return row; }),
    remove: (id, label = `delete ${name}`) => request(label, () => { rows = rows.filter((row) => row.id !== id); save(); }),
    snapshot: () => structuredClone(rows),
    reset: () => { rows = structuredClone(seed); save(); },
  };
}

// Run the newest request only: a slow older response never overwrites a
// newer one (typing in search, switching filters fast).
export function latestOnly() {
  let ticket = 0;
  return async (promise) => {
    const mine = ++ticket;
    const result = await promise;
    if (mine !== ticket) throw Object.assign(new Error("stale"), { stale: true });
    return result;
  };
}

// ---- View state in the URL -------------------------------------------------

// read() → current view; write(changes, {push}) → update the URL. Push (the
// default) for every deliberate change of view — opening an item, a step, a
// filter or tab — so Back returns to the previous view and never leaves the
// app; pass {push: false} only while the user is typing (search as you type),
// then push once when they stop. onChange(render) → re-render on Back/Forward.
export const view = {
  read() { return Object.fromEntries(params()); },
  write(changes, { push = true } = {}) {
    const next = params();
    for (const [name, value] of Object.entries(changes)) {
      if (value === null || value === undefined || value === "") next.delete(name); else next.set(name, value);
    }
    const url = `${location.pathname}${next.toString() ? `?${next}` : ""}${location.hash}`;
    if (push) {
      // Remember where the user was on the view they are leaving, so Back returns there.
      history.replaceState({ ...history.state, scroll: scrollY }, "");
      history.pushState({ scroll: 0 }, "", url);
    } else {
      history.replaceState({ ...history.state, scroll: scrollY }, "", url);
    }
  },
  onChange(render) {
    // The kit restores scroll itself (after render, when the content is back), so
    // the browser's own restore doesn't jump first; each view's scroll is kept as
    // the user scrolls, so Back and Forward both land where they left it.
    history.scrollRestoration = "manual";
    let saving;
    addEventListener("scroll", () => {
      clearTimeout(saving);
      saving = setTimeout(() => history.replaceState({ ...history.state, scroll: scrollY }, ""), 150);
    }, { passive: true });
    addEventListener("popstate", (event) => {
      clearTimeout(saving);
      render(view.read());
      if (event.state && typeof event.state.scroll === "number") requestAnimationFrame(() => scrollTo(0, event.state.scroll));
    });
  },
};

// ---- Drafts ---------------------------------------------------------------

// keepDraft(field, key, { sensitive }) → restores and autosaves a field's
// text; returns clear() to call after a successful submit. hasDraft(field)
// helps decide whether closing should ask "Discard your note?".
// sensitive: true for fields with personal data (names, NRIC, contact details,
// amounts tied to a person) — kept only until the tab closes (sessionStorage),
// so nothing personal stays on a shared computer. Never use it for passwords.
export function keepDraft(field, key, { sensitive = false } = {}) {
  const storageKey = `draft:${key}`;
  const storage = () => (sensitive ? sessionStorage : localStorage);
  try { const saved = storage().getItem(storageKey); if (saved && !field.value) field.value = saved; } catch { /* ignore */ }
  const store = () => { try { field.value ? storage().setItem(storageKey, field.value) : storage().removeItem(storageKey); } catch { /* ignore */ } };
  field.addEventListener("input", store);
  return () => { try { storage().removeItem(storageKey); } catch { /* ignore */ } };
}

// clearAppStorage() → call on sign-out: removes drafts and mock data from both stores.
export function clearAppStorage() {
  for (const store of [localStorage, sessionStorage]) {
    try {
      Object.keys(store).filter((key) => key.startsWith("draft:") || key.startsWith("mock:")).forEach((key) => store.removeItem(key));
    } catch { /* blocked */ }
  }
}
export const hasDraft = (field) => Boolean(field.value && field.value.trim());

// ---- Toasts ----------------------------------------------------------------

// toast(message, {anchor, undo, tone, duration}) → one toast at a time
// (a new one replaces the previous, so superseded messages never stack),
// placed just above `anchor` (the control or area acted on) when given, kept
// on screen and clear of it; otherwise in the product's consistent corner.
// Pauses while hovered or focused; announced politely; Undo calls undo().
let live;
let current;

export function toast(message, { anchor, undo, tone = "neutral", duration = 5000, className = "toast" } = {}) {
  if (!live) {
    live = document.createElement("div");
    live.setAttribute("aria-live", "polite");
    live.className = "sr-only";
    live.style.cssText = "position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)";
    document.body.append(live);
  }
  current?.dismiss(true);
  const element = document.createElement("div");
  element.className = className;
  element.dataset.tone = tone;
  element.setAttribute("role", tone === "error" ? "alert" : "status");
  const text = document.createElement("span");
  text.textContent = message;
  element.append(text);
  if (undo) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Undo";
    button.addEventListener("click", () => { undo(); dismiss(); });
    element.append(button);
  }
  element.style.position = "fixed";
  element.style.zIndex = "1000";
  document.body.append(element);
  if (anchor) {
    const a = anchor.getBoundingClientRect();
    const b = element.getBoundingClientRect();
    const left = Math.min(Math.max(12, a.left + a.width / 2 - b.width / 2), innerWidth - b.width - 12);
    const above = a.top - b.height - 10;
    element.style.left = `${left}px`;
    element.style.top = `${above > 12 ? above : Math.min(a.bottom + 10, innerHeight - b.height - 12)}px`;
  }
  live.textContent = message;
  element.animate([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], { duration: 200, easing: "cubic-bezier(.2,.8,.2,1)" });
  let timer;
  const start = () => { timer = setTimeout(dismiss, duration); };
  const stop = () => clearTimeout(timer);
  element.addEventListener("pointerenter", stop);
  element.addEventListener("pointerleave", start);
  element.addEventListener("focusin", stop);
  element.addEventListener("focusout", start);
  start();
  function dismiss(instant = false) {
    stop();
    if (current === handle) current = null;
    if (instant) { element.remove(); return; }
    element.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, easing: "ease-out" }).finished.then(() => element.remove());
  }
  const handle = { dismiss };
  current = handle;
  return handle;
}

// ---- Keyboard --------------------------------------------------------------

// roving(container, items) → the set is one Tab stop; arrow keys move inside
// (grid-aware when `columns` is given); Home/End jump; the active item keeps
// tabindex=0 across re-renders when items carry data-key.
export function roving(container, itemSelector, { columns = 0, onActivate } = {}) {
  const items = () => [...container.querySelectorAll(itemSelector)];
  const setActive = (item, focus = true) => {
    for (const other of items()) other.tabIndex = -1;
    if (!item) return;
    item.tabIndex = 0;
    container.dataset.activeKey = item.dataset.key ?? "";
    if (focus) item.focus();
  };
  const refresh = () => {
    const list = items();
    const keep = list.find((item) => item.dataset.key && item.dataset.key === container.dataset.activeKey);
    setActive(keep || list[0], false);
  };
  container.addEventListener("keydown", (event) => {
    const list = items();
    const index = list.indexOf(document.activeElement);
    if (index < 0) return;
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: columns || 1, ArrowUp: -(columns || 1) }[event.key];
    if (step) { event.preventDefault(); setActive(list[Math.min(list.length - 1, Math.max(0, index + step))]); }
    else if (event.key === "Home") { event.preventDefault(); setActive(list[0]); }
    else if (event.key === "End") { event.preventDefault(); setActive(list[list.length - 1]); }
    else if ((event.key === "Enter" || event.key === " ") && onActivate) { event.preventDefault(); onActivate(list[index]); }
  });
  container.addEventListener("focusin", (event) => { if (items().includes(event.target)) setActive(event.target, false); });
  refresh();
  return { refresh };
}

// keepFocus(render) → re-render without losing the user's place: focus goes
// back to the element with the same data-key (or id) after `render` runs.
export async function keepFocus(render) {
  const active = document.activeElement;
  const key = active?.dataset?.key;
  const id = active?.id;
  await render();
  const target = (key && document.querySelector(`[data-key="${CSS.escape(key)}"]`)) || (id && document.getElementById(id));
  if (target && target !== document.activeElement) target.focus({ preventScroll: true });
}

// ---- The scroll edge -------------------------------------------------------

// scrollEdge(bar, { title, scroller, gap }) → keeps whatever stays at the top honest while the
// page scrolls. `bar` is the pinned element (position: sticky or fixed).
//   • bar[data-over] while content is under it, so its material changes in one step: plain page
//     at rest, frosted over content. The look of each state is the product's CSS (the glass
//     kit's .lg-scroll-edge and .lg-cap already have both).
//   • Focus and jump targets land below the bar: the scroller's scroll-padding-top follows the
//     bar's height, which is also published as --pinned-top for anything that sticks under it.
//   • With `title` (the page's heading, or a selector for it, looked up again after every change
//     of screen): bar[data-context] once the heading has scrolled out under the bar, and its text
//     copied into the bar's [data-context-title] element — one compact bar carries the context,
//     in place of a second band. Show that element only under [data-context].
// `scroller` is the element that scrolls when it isn't the window. Returns a function that stops it.
export function scrollEdge(bar, { title, scroller, gap = 12 } = {}) {
  const box = scroller || document.documentElement;
  const slot = bar.querySelector("[data-context-title]");
  if (slot) slot.setAttribute("aria-hidden", "true"); // the heading itself stays in the page for screen readers
  let frame = 0;

  const measure = () => {
    frame = 0;
    const pinnedAt = parseFloat(getComputedStyle(bar).top) || 0;
    const rect = bar.getBoundingClientRect();
    const edge = Math.round(pinnedAt + rect.height); // the bar's lower edge once it is pinned
    box.style.scrollPaddingTop = `${edge + gap}px`;
    box.style.setProperty("--pinned-top", `${edge}px`);
    const scrolled = scroller ? scroller.scrollTop : window.scrollY;
    const from = scroller ? scroller.getBoundingClientRect().top : 0;
    bar.toggleAttribute("data-over", scrolled > 4 && rect.top - from <= pinnedAt + 1);

    const heading = typeof title === "string" ? document.querySelector(title) : title;
    let gone = false;
    if (heading && heading.isConnected) {
      // A little slack on the way back, so a bar that changes height with its context can't flicker.
      const slack = bar.hasAttribute("data-context") ? 8 : 0;
      gone = heading.getBoundingClientRect().bottom < rect.bottom + slack;
      if (gone && slot && slot.textContent !== heading.textContent) slot.textContent = heading.textContent;
    }
    bar.toggleAttribute("data-context", gone);
  };
  const queue = () => { if (!frame) frame = requestAnimationFrame(measure); };

  const target = scroller || window;
  target.addEventListener("scroll", queue, { passive: true });
  window.addEventListener("resize", queue);
  const resized = new ResizeObserver(queue);
  resized.observe(bar);
  measure();
  return () => {
    target.removeEventListener("scroll", queue);
    window.removeEventListener("resize", queue);
    resized.disconnect();
    cancelAnimationFrame(frame);
  };
}
