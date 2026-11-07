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
//   • roving focus for grids/charts/tile sets, and focus kept through re-renders.
// It is mechanics only — the product's own design styles the toast etc.
// In React/Vue/Svelte, keep the same behaviour with the framework's router,
// stores and components; the switches and persistence rules are identical.

const params = () => new URLSearchParams(location.search);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---- Mock server ---------------------------------------------------------

// latency: fast by default with natural variation; ?latency=slow → 3–8 s;
// ?latency=fast → ~0 (for demos). Failures: ?fail=1 → each operation fails on
// its first try and succeeds on retry (so recovery can be seen); ?fail=always
// → every request fails (so the error state can be studied).
const attempts = new Map();

export async function request(operation, run) {
  const latency = params().get("latency");
  const ms = latency === "slow" ? 3000 + Math.random() * 5000
    : latency === "fast" ? 0
      : 200 + Math.random() * 1000 * (Math.random() < 0.1 ? 2.5 : 1);
  await wait(ms);
  const fail = params().get("fail");
  const tries = (attempts.get(operation) || 0) + 1;
  attempts.set(operation, tries);
  if (fail === "always" || (fail === "1" && tries % 2 === 1)) {
    const error = new Error(`Couldn't ${operation.replace(/[-_]/g, " ")}. Check the connection and try again.`);
    error.retryable = true;
    throw error;
  }
  return run();
}

// A persistent mock table: seed data plus the user's changes, kept in
// localStorage so refresh shows what the user did. reset() for a demo menu.
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

// read() → current view; write(changes, {push}) → update the URL (push for a
// change of place such as opening an item or a step, replace for filters and
// typing); onChange(render) → re-render on Back/Forward.
export const view = {
  read() { return Object.fromEntries(params()); },
  write(changes, { push = false } = {}) {
    const next = params();
    for (const [name, value] of Object.entries(changes)) {
      if (value === null || value === undefined || value === "") next.delete(name); else next.set(name, value);
    }
    const url = `${location.pathname}${next.toString() ? `?${next}` : ""}${location.hash}`;
    history[push ? "pushState" : "replaceState"]({ ...history.state, scroll: scrollY }, "", url);
  },
  onChange(render) {
    addEventListener("popstate", (event) => {
      render(view.read());
      if (event.state && typeof event.state.scroll === "number") requestAnimationFrame(() => scrollTo(0, event.state.scroll));
    });
  },
};

// ---- Drafts ---------------------------------------------------------------

// keepDraft(field, key) → restores and autosaves a field's text; returns
// clear() to call after a successful submit. hasDraft(field) helps decide
// whether closing should ask "Discard your note?".
export function keepDraft(field, key) {
  const storageKey = `draft:${key}`;
  try { const saved = localStorage.getItem(storageKey); if (saved && !field.value) field.value = saved; } catch { /* ignore */ }
  const store = () => { try { field.value ? localStorage.setItem(storageKey, field.value) : localStorage.removeItem(storageKey); } catch { /* ignore */ } };
  field.addEventListener("input", store);
  return () => { try { localStorage.removeItem(storageKey); } catch { /* ignore */ } };
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
