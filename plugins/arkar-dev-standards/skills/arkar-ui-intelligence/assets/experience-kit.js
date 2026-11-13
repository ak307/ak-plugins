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
//   • roving focus for grids/charts/tile sets, and focus kept through re-renders.
// It is mechanics only. What the user sees while waiting — skeletons, the working button, toasts,
// progress, error dialogs — is arkar-ui-design-system/assets/surface-kit.js: wrap request() in its
// load() and commit().
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
