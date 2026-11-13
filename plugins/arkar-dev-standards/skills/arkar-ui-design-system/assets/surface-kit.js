// surface-kit.js — the working surface's controls for plain web builds: the dropdown, the date
// picker, the action menu, row selection and form feedback that the browser's defaults make
// look and behave like every other site. Copy it with surface-kit.css and call enhance() once.
//
// It upgrades ordinary markup, so a page still works before the script runs:
//   <select class="ws-select">            → a dropdown whose list opens on glass
//   <input type="date" class="ws-date">   → a calendar that opens on glass
//   <button data-ws-menu="panel-id">      → an action menu (panel holds role="menuitem" buttons)
//   <form data-ws-validate>               → messages when a field is left, not on every key
//   <div class="ws-table-wrap">           → a highlight that glides from row to row; a header shadow
//                                           once the rows scroll under it
//   <div class="ws-segmented">            → a glass lens that slides, stretching, to the chosen chip
// and it makes the material answer the user — motion that always follows an action, never loops:
//   a press        the control gives way and lights up where it was touched
//   an opening     lists, calendars and menus pour out of their button and recede into it
//   a choice       the lens flows to the chosen chip; the row highlight glides to the row
//   the pointer    a soft reflection follows it across glass; the background shifts a few pixels
//   scrolling      a sticky bar frosts once content is under it
// All of it is skipped or reduced to a fade when the user asks for reduced motion.
// The real <select> and <input> stay in the page and keep their value, name, label and events
// (input and change still fire on them), so forms, validation and data binding are unchanged.
//
// Mechanics only: colour, radius and type come from the --ws-* tokens in surface-kit.css.
// Frameworks: keep the CSS, and use the framework's own accessible primitives (or call
// enhance() on mount; in Livewire wrap the control in wire:ignore). Multiple selects stay native.

const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const narrow = () => matchMedia("(max-width: 480px)").matches;
const EASE = "cubic-bezier(.2,.8,.2,1)";

let counter = 0;
const nextId = (prefix) => `${prefix}-${++counter}`;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const stroke = 'fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"';
const icon = (path, size = 16) => `<svg class="ws-icon" viewBox="0 0 16 16" width="${size}" height="${size}" aria-hidden="true"><path d="${path}" ${stroke}/></svg>`;
const ICONS = {
  chevron: icon("M4 6l4 4 4-4"),
  check: icon("M3.5 8.5l3 3 6-7"),
  left: icon("M10 3.5L5.5 8l4.5 4.5"),
  right: icon("M6 3.5L10.5 8 6 12.5"),
  calendar: icon("M2.5 6.5h11M5 1.75v2.5M11 1.75v2.5M3.5 3h9a1 1 0 0 1 1 1v8.5a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"),
};

function announceChange(field) {
  field.dispatchEvent(new Event("input", { bubbles: true }));
  field.dispatchEvent(new Event("change", { bubbles: true }));
}

// ---------------------------------------------------------------------------------------------
// The pop-up layer. Every list, calendar and menu opens through this one function, so they all
// appear from their control, stay inside the window, close on Escape or an outside press, and
// sit above dialogs (the browser's top layer) instead of being clipped by a scrolling parent.

export function popover(trigger, panel, { matchWidth = true, onOpen, onClose } = {}) {
  const topLayer = typeof panel.showPopover === "function";
  const self = {};
  let open = false;
  panel.classList.add("ws-popover");
  if (topLayer) panel.setAttribute("popover", "manual"); else panel.hidden = true;

  function place() {
    panel.dataset.sheet = String(narrow());
    panel.style.cssText = "";
    if (narrow()) return; // on a phone the stylesheet docks it to the bottom edge
    const box = trigger.getBoundingClientRect();
    if (box.bottom < 0 || box.top > innerHeight) return close();
    if (matchWidth) panel.style.minWidth = `${Math.round(box.width)}px`;
    const size = panel.getBoundingClientRect();
    const gap = 6, edge = 8;
    const below = innerHeight - box.bottom - gap - edge;
    const above = box.top - gap - edge;
    const opensUp = size.height > below && above > below;
    const room = Math.max(160, opensUp ? above : below);
    const left = Math.min(Math.max(edge, box.left), Math.max(edge, innerWidth - size.width - edge));
    panel.style.maxHeight = `${Math.round(room)}px`;
    panel.style.left = `${Math.round(left)}px`;
    panel.dataset.opensUp = String(opensUp);
    // Opening upwards, it hangs from its bottom edge, so a list that shortens stays against its button.
    if (opensUp) panel.style.bottom = `${Math.round(innerHeight - box.top + gap)}px`;
    else panel.style.top = `${Math.round(box.bottom + gap)}px`;
    panel.style.transformOrigin = `${Math.round(box.left + box.width / 2 - left)}px ${opensUp ? "100%" : "0"}`;
    return undefined;
  }

  // It pours out of its button: uncovered from the edge nearest the button while it grows to size.
  function animate(opening) {
    if (reduced()) return panel.animate([{ opacity: opening ? 0 : 1 }, { opacity: opening ? 1 : 0 }], { duration: 100 });
    const radius = getComputedStyle(panel).borderTopLeftRadius;
    const covered = panel.dataset.opensUp === "true" ? `inset(62% 0 0 0 round ${radius})` : `inset(0 0 62% 0 round ${radius})`;
    const hidden = narrow() ? { opacity: 0, transform: "translateY(28px)" } : { opacity: 0, transform: "scale(.9)", clipPath: covered };
    const shown = narrow() ? { opacity: 1, transform: "none" } : { opacity: 1, transform: "none", clipPath: `inset(0 0 0 0 round ${radius})` };
    return panel.animate(opening ? [hidden, shown] : [shown, hidden], { duration: opening ? 280 : 140, easing: opening ? "cubic-bezier(.25,1.2,.45,1)" : EASE });
  }

  const pressedOutside = (event) => {
    if (!panel.contains(event.target) && !trigger.contains(event.target)) close();
  };
  const moved = (event) => {
    if (!(event.target instanceof Node) || !panel.contains(event.target)) place();
  };
  const escape = (event) => {
    if (event.key !== "Escape") return;
    event.preventDefault(); // inside a dialog, Escape closes this pop-up, not the dialog
    event.stopPropagation();
    close({ focus: true });
  };

  function listen(add) {
    const change = add ? "addEventListener" : "removeEventListener";
    document[change]("pointerdown", pressedOutside, true);
    window[change]("resize", moved);
    window[change]("scroll", moved, true);
    trigger[change]("keydown", escape);
    panel[change]("keydown", escape);
  }

  function show() {
    if (open) return;
    open = true;
    // One panel may serve several buttons (the same menu on every row): the latest one owns it.
    if (panel.wsMotion) panel.wsMotion.cancel();
    panel.wsOwner = self;
    panel.wsTrigger = trigger;
    if (topLayer) {
      if (!panel.matches(":popover-open")) panel.showPopover();
    } else {
      (trigger.closest("dialog[open]") || document.body).append(panel);
      panel.hidden = false;
    }
    trigger.setAttribute("aria-expanded", "true");
    place();
    panel.wsMotion = animate(true);
    listen(true);
    if (onOpen) onOpen();
  }

  async function close({ focus = false } = {}) {
    if (!open) return;
    open = false;
    trigger.setAttribute("aria-expanded", "false");
    listen(false);
    if (focus) trigger.focus();
    if (onClose) onClose();
    const leaving = animate(false);
    panel.wsMotion = leaving;
    await leaving.finished.catch(() => {});
    if (open || panel.wsOwner !== self) return; // reopened, or taken over by another button, while closing
    if (topLayer) { try { panel.hidePopover(); } catch (error) { /* already hidden */ } } else panel.hidden = true;
  }

  trigger.setAttribute("aria-expanded", "false");
  return Object.assign(self, { open: show, close, place, toggle: () => (open ? close() : show()), isOpen: () => open });
}

// Puts the control's button and its hidden original in one wrapper, so the layout sees one item
// and the browser's own validation bubble still points at the right place.
function wrapNative(native, trigger, wrapClass) {
  const wrap = el("span", wrapClass);
  native.before(wrap);
  wrap.append(native, trigger);
  native.classList.add("ws-native");
  native.tabIndex = -1;
  native.setAttribute("aria-hidden", "true");
  native.wsTrigger = trigger;
  trigger.wsNative = native;
  trigger.disabled = native.disabled;
  // A press on the field's <label>, or the browser pointing at an invalid field, lands on the original.
  native.addEventListener("focus", () => trigger.focus());
  return wrap;
}

// A form reset changes the original's value without an event: show the new value once it has.
function afterReset(native, update) {
  if (native.form) native.form.addEventListener("reset", () => setTimeout(update));
}

// The control is named by its label; without one, by the original's own aria-label.
function nameFromLabel(native, trigger, extraId) {
  const label = native.labels && native.labels[0];
  if (label) {
    if (!label.id) label.id = nextId("ws-label");
    trigger.setAttribute("aria-labelledby", extraId ? `${label.id} ${extraId}` : label.id);
  } else if (native.getAttribute("aria-label")) {
    trigger.setAttribute("aria-label", native.getAttribute("aria-label"));
  }
  return label ? label.id : null;
}

// ---------------------------------------------------------------------------------------------
// Dropdown: <select class="ws-select">. Arrow keys, Home/End, typing a name, Enter, Escape, Tab.
// With more than `searchAfter` options (or data-search) the list gets a search field.

export function select(native, { searchAfter = 12 } = {}) {
  if (native.wsTrigger || native.multiple) return null;
  const trigger = el("button", "ws-select");
  trigger.type = "button";
  trigger.setAttribute("role", "combobox");
  trigger.setAttribute("aria-haspopup", "listbox");
  const value = el("span", "ws-select-value");
  value.id = nextId("ws-value");
  trigger.append(value);
  trigger.insertAdjacentHTML("beforeend", ICONS.chevron);
  wrapNative(native, trigger, "ws-select-wrap");

  const panel = el("div", "ws-listbox");
  const list = el("div", "ws-options");
  list.setAttribute("role", "listbox");
  list.id = nextId("ws-list");
  const labelId = nameFromLabel(native, trigger, value.id);
  if (labelId) list.setAttribute("aria-labelledby", labelId); else list.setAttribute("aria-label", trigger.getAttribute("aria-label") || "Options");
  trigger.setAttribute("aria-controls", list.id);
  panel.append(list);
  trigger.after(panel);

  let search = null;
  let active = null;
  let typed = "";
  let typedAt = 0;
  const layer = popover(trigger, panel, { onClose: () => setActive(null) });
  const usable = () => [...list.querySelectorAll('[role="option"]:not([hidden]):not([aria-disabled="true"])')];
  const keyOwner = () => search || trigger;

  function optionRow(option) {
    const row = el("div", "ws-option");
    row.setAttribute("role", "option");
    row.id = nextId("ws-option");
    row.dataset.value = option.value;
    row.append(el("span", "ws-option-label", option.textContent.trim()));
    row.insertAdjacentHTML("beforeend", ICONS.check);
    if (option.disabled) row.setAttribute("aria-disabled", "true");
    return row;
  }

  function buildOptions() {
    list.replaceChildren();
    for (const child of native.children) {
      if (child.tagName === "OPTGROUP") {
        const group = el("div", "ws-option-group");
        group.setAttribute("role", "group");
        group.setAttribute("aria-label", child.label);
        const heading = el("div", "ws-option-heading", child.label);
        heading.setAttribute("aria-hidden", "true");
        group.append(heading, ...[...child.children].map(optionRow));
        list.append(group);
      } else if (child.tagName === "OPTION") list.append(optionRow(child));
    }
    const wantsSearch = native.hasAttribute("data-search") || native.options.length > searchAfter;
    if (wantsSearch && !search) {
      search = el("input", "ws-popover-search");
      search.type = "search";
      search.placeholder = native.dataset.search || "Search";
      search.setAttribute("aria-label", "Search options");
      search.setAttribute("aria-controls", list.id);
      search.addEventListener("input", () => filter(search.value));
      search.addEventListener("keydown", onKey);
      panel.prepend(search);
    }
    showValue();
  }

  function showValue() {
    const chosen = native.selectedOptions[0];
    value.textContent = chosen ? chosen.textContent.trim() : "";
    trigger.toggleAttribute("data-empty", !chosen || chosen.value === "");
    trigger.disabled = native.disabled;
    for (const row of list.querySelectorAll('[role="option"]')) {
      row.setAttribute("aria-selected", String(Boolean(chosen) && row.dataset.value === chosen.value));
    }
  }

  function setActive(row) {
    if (active) active.removeAttribute("data-active");
    active = row || null;
    if (!active) return keyOwner().removeAttribute("aria-activedescendant");
    active.setAttribute("data-active", "true");
    keyOwner().setAttribute("aria-activedescendant", active.id);
    return active.scrollIntoView({ block: "nearest" });
  }

  function filter(text) {
    const wanted = text.trim().toLowerCase();
    for (const row of list.querySelectorAll('[role="option"]')) row.hidden = !row.textContent.toLowerCase().includes(wanted);
    for (const group of list.querySelectorAll(".ws-option-group")) group.hidden = !group.querySelector('[role="option"]:not([hidden])');
    list.toggleAttribute("data-empty", usable().length === 0);
    setActive(usable()[0]);
  }

  function openList() {
    if (trigger.disabled) return;
    layer.open();
    if (search) {
      search.value = "";
      filter("");
      search.focus();
    }
    setActive(list.querySelector('[role="option"][aria-selected="true"]:not([aria-disabled="true"])') || usable()[0]);
  }

  function choose(row, { focus = true } = {}) {
    if (native.value !== row.dataset.value) {
      native.value = row.dataset.value;
      announceChange(native);
    }
    showValue();
    layer.close({ focus });
  }

  function typeAhead(letter) {
    const now = Date.now();
    typed = now - typedAt > 600 ? letter : typed + letter;
    typedAt = now;
    if (!layer.isOpen()) openList();
    const match = usable().find((row) => row.textContent.trim().toLowerCase().startsWith(typed.toLowerCase()));
    if (match) setActive(match);
  }

  function onKey(event) {
    const rows = usable();
    const index = rows.indexOf(active);
    const fromTrigger = event.currentTarget === trigger;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!layer.isOpen()) return openList();
      return setActive(rows[event.key === "ArrowDown" ? Math.min(rows.length - 1, index + 1) : Math.max(0, index - 1)]);
    }
    if (!layer.isOpen()) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        return openList();
      }
      if (fromTrigger && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) typeAhead(event.key);
      return undefined;
    }
    if (event.key === "Home" || event.key === "End") {
      if (!fromTrigger) return undefined; // in the search field these keys move the caret
      event.preventDefault();
      return setActive(rows[event.key === "Home" ? 0 : rows.length - 1]);
    }
    if (event.key === "Enter" || (event.key === " " && fromTrigger)) {
      event.preventDefault();
      return active ? choose(active) : layer.close({ focus: true });
    }
    if (event.key === "Tab") return active ? choose(active, { focus: false }) : layer.close();
    if (fromTrigger && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) typeAhead(event.key);
    return undefined;
  }

  trigger.addEventListener("keydown", onKey);
  // Space would also press the button on key-up; the key-down above has already opened or chosen.
  trigger.addEventListener("keyup", (event) => { if (event.key === " ") event.preventDefault(); });
  trigger.addEventListener("click", () => (layer.isOpen() ? layer.close() : openList()));
  list.addEventListener("click", (event) => {
    const row = event.target.closest('[role="option"]');
    if (row && row.getAttribute("aria-disabled") !== "true") choose(row);
  });
  list.addEventListener("pointermove", (event) => {
    const row = event.target.closest('[role="option"]');
    if (row && row !== active && row.getAttribute("aria-disabled") !== "true") setActive(row);
  });
  native.addEventListener("change", showValue);
  afterReset(native, showValue);
  // Options added, removed or disabled by the page's own code show up without another call.
  new MutationObserver(buildOptions).observe(native, { childList: true, subtree: true, attributes: true, attributeFilter: ["disabled", "label"] });

  buildOptions();
  return { refresh: buildOptions, open: openList, close: layer.close };
}

// ---------------------------------------------------------------------------------------------
// Date picker: <input type="date" class="ws-date">, honouring its min, max and required.
// Arrow keys move by day and week, PageUp/PageDown by month (with Shift, by year), Home/End to
// the ends of the week, Enter chooses, Escape closes. data-week-start="0" starts weeks on Sunday.

const toIso = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

function fromIso(text) {
  const [year, month, day] = String(text || "").split("-").map(Number);
  return year && month && day ? new Date(year, month - 1, day) : null;
}

const addDays = (date, days) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

function addMonths(date, months) {
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return new Date(target.getFullYear(), target.getMonth(), Math.min(date.getDate(), lastDay));
}

export function datePicker(native) {
  if (native.wsTrigger) return null;
  const language = document.documentElement.lang || undefined;
  const shown = new Intl.DateTimeFormat(language, { day: "numeric", month: "short", year: "numeric" });
  const monthName = new Intl.DateTimeFormat(language, { month: "long", year: "numeric" });
  const dayName = new Intl.DateTimeFormat(language, { weekday: "short" });
  const fullDay = new Intl.DateTimeFormat(language, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const weekStart = Number(native.dataset.weekStart || 1);
  const placeholder = native.dataset.placeholder || "Choose a date";

  const trigger = el("button", "ws-date");
  trigger.type = "button";
  trigger.setAttribute("aria-haspopup", "dialog");
  const value = el("span", "ws-date-value");
  value.id = nextId("ws-value");
  trigger.insertAdjacentHTML("beforeend", ICONS.calendar);
  trigger.append(value);
  wrapNative(native, trigger, "ws-date-wrap");
  nameFromLabel(native, trigger, value.id);

  const panel = el("div", "ws-calendar");
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", placeholder);
  const title = el("div", "ws-calendar-title");
  title.setAttribute("aria-live", "polite");
  const previous = el("button", "ws-calendar-step");
  const next = el("button", "ws-calendar-step");
  previous.type = next.type = "button";
  previous.innerHTML = ICONS.left;
  next.innerHTML = ICONS.right;
  previous.setAttribute("aria-label", "Previous month");
  next.setAttribute("aria-label", "Next month");
  const header = el("div", "ws-calendar-header");
  header.append(title, previous, next);
  const grid = el("div", "ws-calendar-grid");
  grid.setAttribute("role", "grid");
  const todayButton = el("button", "ws-calendar-action", "Today");
  const clearButton = el("button", "ws-calendar-action", "Clear");
  todayButton.type = clearButton.type = "button";
  const footer = el("div", "ws-calendar-footer");
  footer.append(clearButton, todayButton);
  panel.append(header, grid, footer);
  trigger.after(panel);

  let view = new Date(); // the month on show
  let focused = new Date(); // the day the arrow keys are on
  const layer = popover(trigger, panel, { matchWidth: false });
  const allowed = (date) => (!native.min || toIso(date) >= native.min) && (!native.max || toIso(date) <= native.max);

  function clamp(date) {
    if (native.min && toIso(date) < native.min) return fromIso(native.min);
    if (native.max && toIso(date) > native.max) return fromIso(native.max);
    return date;
  }

  function showValue() {
    const chosen = fromIso(native.value);
    value.textContent = chosen ? shown.format(chosen) : placeholder;
    trigger.toggleAttribute("data-empty", !chosen);
    trigger.disabled = native.disabled;
    clearButton.hidden = native.required || !chosen;
  }

  function dayButton(date) {
    const button = el("button", "ws-day", String(date.getDate()));
    button.type = "button";
    button.setAttribute("role", "gridcell");
    button.dataset.date = toIso(date);
    button.setAttribute("aria-label", fullDay.format(date));
    button.tabIndex = -1;
    if (toIso(date) === toIso(new Date())) button.setAttribute("aria-current", "date");
    button.setAttribute("aria-selected", String(toIso(date) === native.value));
    button.disabled = !allowed(date);
    return button;
  }

  function blankCell() {
    const blank = el("span", "ws-day-blank");
    blank.setAttribute("role", "gridcell");
    return blank;
  }

  function weekdayRow() {
    const row = el("div", "ws-calendar-row");
    row.setAttribute("role", "row");
    const sunday = new Date(2023, 0, 1); // a known Sunday, to read the day names from
    for (let index = 0; index < 7; index += 1) {
      const name = el("span", "ws-weekday", dayName.format(addDays(sunday, weekStart + index)).slice(0, 2));
      name.setAttribute("role", "columnheader");
      row.append(name);
    }
    return row;
  }

  function render(direction = 0) {
    title.textContent = monthName.format(view);
    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    const blanks = (first.getDay() - weekStart + 7) % 7;
    const days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    const rows = [weekdayRow()];
    let row = null;
    for (let cell = 0; cell < blanks + days; cell += 1) {
      if (cell % 7 === 0) {
        row = el("div", "ws-calendar-row");
        row.setAttribute("role", "row");
        rows.push(row);
      }
      row.append(cell < blanks ? blankCell() : dayButton(new Date(view.getFullYear(), view.getMonth(), cell - blanks + 1)));
    }
    grid.replaceChildren(...rows);
    if (direction && !reduced()) {
      grid.animate([{ opacity: 0, transform: `translateX(${direction * 14}px)` }, { opacity: 1, transform: "none" }], { duration: 180, easing: EASE });
    }
  }

  function focusDay(date, { move = true } = {}) {
    const target = clamp(date);
    const months = (target.getFullYear() - view.getFullYear()) * 12 + target.getMonth() - view.getMonth();
    focused = target;
    if (months) {
      view = new Date(target.getFullYear(), target.getMonth(), 1);
      render(Math.sign(months));
    }
    for (const button of grid.querySelectorAll(".ws-day")) button.tabIndex = button.dataset.date === toIso(target) ? 0 : -1;
    const button = grid.querySelector(`.ws-day[data-date="${toIso(target)}"]`);
    if (button && move) button.focus();
  }

  function choose(date) {
    if (!allowed(date)) return;
    if (native.value !== toIso(date)) {
      native.value = toIso(date);
      announceChange(native);
    }
    showValue();
    layer.close({ focus: true });
  }

  function openCalendar() {
    if (trigger.disabled) return;
    focused = clamp(fromIso(native.value) || new Date());
    view = new Date(focused.getFullYear(), focused.getMonth(), 1);
    todayButton.disabled = !allowed(new Date());
    render();
    layer.open();
    focusDay(focused);
  }

  function stepMonth(months) {
    view = new Date(view.getFullYear(), view.getMonth() + months, 1);
    render(Math.sign(months));
    focusDay(clamp(addMonths(focused, months)), { move: false });
  }

  grid.addEventListener("keydown", (event) => {
    const fromWeekStart = (focused.getDay() - weekStart + 7) % 7;
    const steps = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -fromWeekStart, End: 6 - fromWeekStart };
    let target = null;
    if (event.key in steps) target = addDays(focused, steps[event.key]);
    else if (event.key === "PageUp" || event.key === "PageDown") target = addMonths(focused, (event.key === "PageUp" ? -1 : 1) * (event.shiftKey ? 12 : 1));
    if (!target) return;
    event.preventDefault();
    focusDay(target);
  });
  grid.addEventListener("click", (event) => {
    const button = event.target.closest(".ws-day");
    if (button && !button.disabled) choose(fromIso(button.dataset.date));
  });
  previous.addEventListener("click", () => stepMonth(-1));
  next.addEventListener("click", () => stepMonth(1));
  todayButton.addEventListener("click", () => choose(new Date()));
  clearButton.addEventListener("click", () => {
    native.value = "";
    announceChange(native);
    showValue();
    layer.close({ focus: true });
  });
  trigger.addEventListener("click", () => (layer.isOpen() ? layer.close() : openCalendar()));
  // Tabbing out of the calendar closes it, like any other pop-up.
  panel.addEventListener("focusout", (event) => {
    if (layer.isOpen() && event.relatedTarget && !panel.contains(event.relatedTarget) && event.relatedTarget !== trigger) layer.close();
  });
  native.addEventListener("change", showValue);
  afterReset(native, showValue);

  showValue();
  return { refresh: showValue, open: openCalendar, close: layer.close };
}

// ---------------------------------------------------------------------------------------------
// Action menu: a button with data-ws-menu="<panel id>"; the panel holds role="menuitem" buttons.
// Several buttons may share one panel; while it is open, panel.wsTrigger is the button that opened it.

// The panel's own keys and presses, set up once however many buttons share it.
function prepareMenuPanel(panel) {
  if (panel.wsItems) return;
  panel.classList.add("ws-menu");
  panel.setAttribute("role", "menu");
  if (!panel.id) panel.id = nextId("ws-menu");
  panel.wsItems = () => [...panel.querySelectorAll('[role="menuitem"]:not([disabled])')];
  for (const item of panel.querySelectorAll('[role="menuitem"]')) item.tabIndex = -1;

  panel.addEventListener("keydown", (event) => {
    const list = panel.wsItems();
    const index = list.indexOf(document.activeElement);
    const targets = { ArrowDown: list[(index + 1) % list.length], ArrowUp: list[(index - 1 + list.length) % list.length], Home: list[0], End: list[list.length - 1] };
    if (event.key in targets) {
      event.preventDefault();
      targets[event.key].focus();
    } else if (event.key === "Tab") panel.wsOwner.close();
    else if (event.key.length === 1) {
      const match = list.find((item) => item.textContent.trim().toLowerCase().startsWith(event.key.toLowerCase()));
      if (match) match.focus();
    }
  });
  panel.addEventListener("click", (event) => {
    // The item's own action may already have moved focus (into a dialog it opened): leave it there.
    if (event.target.closest('[role="menuitem"]')) panel.wsOwner.close({ focus: panel.contains(document.activeElement) });
  });
}

export function menu(trigger, panel) {
  if (trigger.wsMenu) return trigger.wsMenu;
  prepareMenuPanel(panel);
  trigger.setAttribute("aria-haspopup", "menu");
  trigger.setAttribute("aria-controls", panel.id);
  const focusFirst = () => {
    const first = panel.wsItems()[0];
    if (first) first.focus();
  };
  const layer = popover(trigger, panel, { matchWidth: false, onOpen: focusFirst });
  trigger.addEventListener("click", () => layer.toggle());
  trigger.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" && !layer.isOpen()) {
      event.preventDefault();
      layer.open();
    }
  });
  trigger.wsMenu = layer;
  return layer;
}

// ---------------------------------------------------------------------------------------------
// Row selection: a checkbox in each body row and one in the header (data-ws-all). Shift-click
// selects the range between two presses. onChange receives the selected rows' data-id values.

export function selection(table, { onChange } = {}) {
  const all = table.querySelector("thead input[type=checkbox][data-ws-all]");
  const boxes = () => [...table.querySelectorAll("tbody tr:not([hidden]) input[type=checkbox][data-ws-row]")];
  const selected = () => boxes().filter((box) => box.checked).map((box) => box.closest("tr").dataset.id);
  let lastPressed = null;

  function sync() {
    const list = boxes();
    const count = list.filter((box) => box.checked).length;
    for (const box of list) box.closest("tr").setAttribute("aria-selected", String(box.checked));
    if (all) {
      all.checked = count > 0 && count === list.length;
      all.indeterminate = count > 0 && count < list.length;
    }
    if (onChange) onChange(selected());
  }

  table.addEventListener("click", (event) => {
    const box = event.target.closest("input[type=checkbox][data-ws-row]");
    if (!box) return;
    const list = boxes();
    if (event.shiftKey && lastPressed && list.includes(lastPressed)) {
      const [from, to] = [list.indexOf(lastPressed), list.indexOf(box)].sort((a, b) => a - b);
      for (const between of list.slice(from, to + 1)) between.checked = box.checked;
    }
    lastPressed = box;
    sync();
  });
  if (all) {
    all.addEventListener("change", () => {
      for (const box of boxes()) box.checked = all.checked;
      sync();
    });
  }

  function clear() {
    for (const box of boxes()) box.checked = false;
    sync();
  }

  sync();
  return { selected, clear, refresh: sync };
}

// ---------------------------------------------------------------------------------------------
// Form feedback: a field is checked when the user leaves it — never while they are still typing
// — the message sits under the field and says how to fix it, and a submit with problems moves
// focus to the first one. Wording: data-error on the field, or data-error-required /
// -format / -range for each kind of problem; otherwise the browser's own message.

function problemWith(field) {
  const state = field.validity;
  if (state.valid) return "";
  const data = field.dataset;
  if (state.valueMissing && data.errorRequired) return data.errorRequired;
  if ((state.typeMismatch || state.patternMismatch || state.badInput) && data.errorFormat) return data.errorFormat;
  if ((state.rangeUnderflow || state.rangeOverflow || state.tooShort || state.tooLong || state.stepMismatch) && data.errorRange) return data.errorRange;
  return data.error || field.validationMessage;
}

// The place a field's message goes. The stylesheet keeps a line free for it under every field
// that has rules: a message that pushed the form down as a field was left would move the button
// out from under a press.
function errorSlot(field, { create = true } = {}) {
  const box = field.closest(".ws-field");
  const anchor = field.closest("label") || (field.wsTrigger ? field.parentElement : field);
  let slot = box ? box.querySelector(":scope > .ws-error") : anchor.nextElementSibling;
  if (!slot || !slot.classList.contains("ws-error")) {
    if (!create) return null;
    slot = el("p", "ws-error");
    if (box) box.append(slot); else anchor.after(slot);
  }
  if (!slot.id) slot.id = nextId("ws-error");
  return slot;
}

// What the user fills in: not buttons (a submit button also "validates"), and not the kit's own search boxes.
const isField = (target) => /^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName) && target.willValidate
  && !/^(submit|button|reset|image|hidden)$/.test(target.type) && !target.classList.contains("ws-popover-search");

export function checkField(field) {
  const message = problemWith(field);
  const slot = errorSlot(field, { create: Boolean(message) });
  if (!slot) return true; // nothing wrong, and no message line to clear
  const shownOn = field.wsTrigger || field; // an upgraded select or date shows its state on its button
  slot.textContent = message;
  for (const target of new Set([field, shownOn])) {
    if (message) target.setAttribute("aria-invalid", "true"); else target.removeAttribute("aria-invalid");
  }
  const described = new Set((shownOn.getAttribute("aria-describedby") || "").split(" ").filter(Boolean));
  if (message) described.add(slot.id); else described.delete(slot.id);
  if (described.size) shownOn.setAttribute("aria-describedby", [...described].join(" ")); else shownOn.removeAttribute("aria-describedby");
  return !message;
}

export function formFeedback(form) {
  if (form.wsFeedback) return;
  form.wsFeedback = true;
  form.noValidate = true; // the kit shows the messages, in the product's own words and style
  const fields = () => [...form.elements].filter(isField);
  const fieldOf = (target) => target.wsNative || target;

  form.addEventListener("focusout", (event) => {
    const field = fieldOf(event.target);
    // Leaving a button for its own pop-up (a list, a calendar) is not leaving the field.
    if (event.relatedTarget && event.relatedTarget.closest && event.relatedTarget.closest(".ws-popover")) return;
    if (isField(field)) checkField(field);
  });
  const recheck = (event) => {
    const field = fieldOf(event.target);
    if (isField(field) && field.getAttribute("aria-invalid") === "true") checkField(field);
  };
  form.addEventListener("input", recheck);
  form.addEventListener("change", recheck);
  form.addEventListener("reset", () => setTimeout(() => {
    for (const field of fields()) if (field.getAttribute("aria-invalid") === "true") checkField(field);
  }));
  form.addEventListener("submit", (event) => {
    const invalid = fields().filter((field) => !checkField(field));
    if (!invalid.length) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    (invalid[0].wsTrigger || invalid[0]).focus();
    form.dispatchEvent(new CustomEvent("ws:invalid", { detail: { fields: invalid } }));
  }, true);
}

// ---------------------------------------------------------------------------------------------
// Liquid Glass behaviour: none of it changes what a control does, only how the glass answers.

// Chips that choose one of several (.ws-segmented): a glass lens sits under the chosen chip and,
// when the choice changes, stretches across both before settling on the new one — like liquid.
export function segmented(container) {
  if (container.hasAttribute("data-ws-thumb")) return;
  const thumb = el("span", "ws-thumb");
  thumb.setAttribute("aria-hidden", "true");
  container.prepend(thumb);
  container.setAttribute("data-ws-thumb", "");
  let last = null;

  function settle({ animate = true } = {}) {
    const chosen = container.querySelector('.ws-chip[aria-pressed="true"], .ws-chip[aria-selected="true"]');
    thumb.hidden = !chosen;
    if (!chosen) return;
    const next = { left: chosen.offsetLeft, top: chosen.offsetTop, width: chosen.offsetWidth, height: chosen.offsetHeight };
    Object.assign(thumb.style, { left: `${next.left}px`, top: `${next.top}px`, width: `${next.width}px`, height: `${next.height}px` });
    const moved = last && (last.left !== next.left || last.width !== next.width);
    if (animate && moved && last.top === next.top && !reduced()) {
      const start = Math.min(last.left, next.left);
      const end = Math.max(last.left + last.width, next.left + next.width);
      // Its reflection crosses it in the direction it travels, so the light moves because the glass does.
      const glint = next.left > last.left ? ["160% 0", "-60% 0"] : ["-60% 0", "160% 0"];
      thumb.animate([
        { left: `${last.left}px`, width: `${last.width}px`, backgroundPosition: `${glint[0]}, 0 0` },
        { left: `${start}px`, width: `${end - start}px`, offset: 0.42 },
        { left: `${next.left}px`, width: `${next.width}px`, backgroundPosition: `${glint[1]}, 0 0` },
      ], { duration: 460, easing: "cubic-bezier(.3,.7,.2,1)" });
    }
    last = next;
  }

  // The page's own code decides which chip is chosen; the lens follows whatever it sets.
  new MutationObserver(() => settle()).observe(container, { subtree: true, attributes: true, attributeFilter: ["aria-pressed", "aria-selected"] });
  new ResizeObserver(() => settle({ animate: false })).observe(container);
  settle({ animate: false });
}

// One highlight for the whole table: it glides to the row under the pointer instead of each row
// switching on and off.
export function glide(wrap) {
  if (wrap.hasAttribute("data-ws-glide")) return;
  wrap.setAttribute("data-ws-glide", "off");
  wrap.addEventListener("pointermove", (event) => {
    const row = event.target.closest && event.target.closest("tbody tr");
    if (!row || event.pointerType === "touch") return;
    wrap.style.setProperty("--ws-glide-top", `${row.offsetTop}px`);
    wrap.style.setProperty("--ws-glide-height", `${row.offsetHeight}px`);
    wrap.setAttribute("data-ws-glide", "on");
  }, { passive: true });
  wrap.addEventListener("pointerleave", () => wrap.setAttribute("data-ws-glide", "off"));
}

// Glass answers to what is behind it: a sticky bar is clear over the calm page and frosts once
// content has scrolled under it (data-ws-over; the stylesheet does the rest).
export function adaptive(bar) {
  if (bar.wsAdaptive) return;
  bar.wsAdaptive = true;
  const update = () => {
    const restingTop = parseFloat(getComputedStyle(bar).top) || 0;
    bar.toggleAttribute("data-ws-over", scrollY > 4 && bar.getBoundingClientRect().top <= restingTop + 1);
  };
  addEventListener("scroll", update, { passive: true });
  update();
}

const GLASS = ".ws-toolbar, .ws-bulk, .ws-popover, dialog.ws-dialog";
let lightIsOn = false;

// A soft reflection follows the pointer across glass (never across content), the atmosphere
// behind shifts a few pixels the other way so the glass seems to float, and a press lights a
// button or chip where it was touched. Mouse only, and not with reduced motion.
function glassLight() {
  if (lightIsOn || reduced() || !matchMedia("(hover: hover)").matches) return;
  lightIsOn = true;
  let lit = null;
  let latest = null;
  let frame = 0;
  const clear = () => {
    if (!lit) return;
    lit.style.removeProperty("--ws-light-x");
    lit.style.removeProperty("--ws-light-y");
    lit = null;
  };
  document.addEventListener("pointermove", (event) => {
    latest = event;
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      for (const canvas of document.querySelectorAll(".ws-canvas")) {
        canvas.style.setProperty("--ws-parallax-x", `${((0.5 - latest.clientX / innerWidth) * 16).toFixed(1)}px`);
        canvas.style.setProperty("--ws-parallax-y", `${((0.5 - latest.clientY / innerHeight) * 12).toFixed(1)}px`);
      }
      const pane = latest.target.closest ? latest.target.closest(GLASS) : null;
      if (pane !== lit) clear();
      if (!pane) return;
      const box = pane.getBoundingClientRect();
      lit = pane;
      pane.style.setProperty("--ws-light-x", `${Math.round(latest.clientX - box.left)}px`);
      pane.style.setProperty("--ws-light-y", `${Math.round(latest.clientY - box.top)}px`);
    });
  }, { passive: true });
  document.addEventListener("pointerleave", clear);
  document.addEventListener("pointerdown", (event) => {
    const control = event.target.closest ? event.target.closest(".ws-button, .ws-chip") : null;
    if (!control) return;
    const box = control.getBoundingClientRect();
    control.style.setProperty("--ws-press-x", `${Math.round(event.clientX - box.left)}px`);
    control.style.setProperty("--ws-press-y", `${Math.round(event.clientY - box.top)}px`);
    control.removeAttribute("data-ws-pressed");
    requestAnimationFrame(() => control.setAttribute("data-ws-pressed", ""));
    setTimeout(() => control.removeAttribute("data-ws-pressed"), 520);
  }, { passive: true });
}

let hasArrived = false;

// As the page opens, the surfaces in view rise into place one after another — once, as the answer
// to arriving. Nothing is hidden before the script runs, so a slow script never hides the page.
function arrive(root) {
  if (hasArrived || reduced()) return;
  hasArrived = true;
  const inView = (pane) => pane.getBoundingClientRect().top < innerHeight && pane.getBoundingClientRect().bottom > 0;
  const panes = [...root.querySelectorAll(".ws-toolbar, .ws-group, .ws-table-wrap")].filter(inView).slice(0, 8);
  panes.forEach((pane, order) => {
    pane.style.setProperty("--ws-order", String(order));
    pane.classList.add("ws-arrive");
  });
  setTimeout(() => {
    for (const pane of panes) {
      pane.classList.remove("ws-arrive");
      pane.style.removeProperty("--ws-order");
    }
  }, 600 + panes.length * 60);
}

// ---------------------------------------------------------------------------------------------

// The header of a scrolling table gains its shadow only once rows have moved under it.
export function scrollShadow(wrap) {
  const update = () => wrap.toggleAttribute("data-scrolled", wrap.scrollTop > 2);
  wrap.addEventListener("scroll", update, { passive: true });
  update();
}

// One call upgrades everything the kit knows inside `root`. Safe to call again after new markup arrives.
export function enhance(root = document) {
  for (const native of root.querySelectorAll("select.ws-select:not(.ws-native)")) select(native);
  for (const native of root.querySelectorAll('input[type="date"].ws-date:not(.ws-native)')) datePicker(native);
  for (const trigger of root.querySelectorAll("[data-ws-menu]")) {
    const panel = document.getElementById(trigger.dataset.wsMenu);
    if (panel) menu(trigger, panel);
  }
  for (const form of root.querySelectorAll("form[data-ws-validate]")) formFeedback(form);
  for (const wrap of root.querySelectorAll(".ws-table-wrap")) {
    scrollShadow(wrap);
    glide(wrap);
  }
  for (const container of root.querySelectorAll(".ws-segmented")) segmented(container);
  for (const bar of root.querySelectorAll(".ws-toolbar")) adaptive(bar);
  glassLight();
  arrive(root);
}
