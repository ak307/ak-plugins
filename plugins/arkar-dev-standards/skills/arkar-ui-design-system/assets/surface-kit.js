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
// Feedback — one state model for everything the user waits for, shown the same way everywhere:
//   load(region, fetcher, { render })     data arriving: skeleton, refresh, empty, error and retry
//   commit(button, work, { busyLabel })   save / send / confirm / delete: one press, one request,
//                                         "Saving…", and "Saved" only once the server has answered
//   toast(message, { tone, action })      a small confirmation, or an error that stays until dealt with
//   progress(title, { onCancel })         long work in the background, with real progress or none
//   dialog({ title, message, actions })   a question that needs an answer; errorDialog() for the
//                                         critical ones (thick glass, with a mark)
// and it makes the material answer the user — motion that always follows an action, never loops
// (an indicator moves only while work is really going on):
//   a press        the control gives way and lights up where it was touched
//   an opening     lists, calendars and menus pour out of their button and recede into it
//   a choice       the lens flows to the chosen chip; the row highlight glides to the row
//   the pointer    a soft reflection follows it across glass; the background shifts a few pixels
//   scrolling      a sticky bar frosts once content is under it
// All of it is skipped or reduced to a fade when the user asks for reduced motion.
// The real <select> and <input> stay in the page and keep their value, name, label and events
// (input and change still fire on them), so forms, validation and data binding are unchanged.
//
// The kit decides how a control looks and behaves; the product decides what it says, what it
// does and when it appears:
//   wording, language, icons   configure({ locale, labels, icons }) — once, before enhance()
//   colour, material, radius,  the --ws-* tokens in surface-kit.css (this script reads its
//   size, motion               durations and easings from them too)
//   content and actions        the page's own markup, and the options of each call
//   fixed, on purpose          what keeps people safe: success only after the server confirms, one
//                              press one request, errors that stay, keyboard and screen-reader
//                              behaviour, reduced motion, and the floors under the readability tokens
// Frameworks: keep the CSS, and use the framework's own accessible primitives (or call
// enhance() on mount; in Livewire wrap the control in wire:ignore). Multiple selects stay native.

const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const narrow = () => matchMedia("(max-width: 480px)").matches;
const rightToLeft = (element) => getComputedStyle(element).direction === "rtl";

let counter = 0;
const nextId = (prefix) => `${prefix}-${++counter}`;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// ---------------------------------------------------------------------------------------------
// Configuration. Nothing a user reads or hears is fixed in this file: every word comes from
// `labels` below, from the page's own markup, or from the options of a call.
//
//   configure({
//     locale: "th-TH",                                       // dates, numbers, plurals, first day of the week
//     labels: { tryAgain: "ลองอีกครั้ง", commit: { offline: "…" } },     // any of defaults.labels
//     icons: { critical: "M8 3.75v5M8 11.9v.2" },            // 16 × 16 outlines; add the product's own names too
//   });
//
// Translate defaults.labels in full for each language the product ships. Text in {braces} is filled
// in by the kit. Call configure() again when the user changes language; controls built after that use it.
//
// Dates are formatted by the browser in the locale — when the browser knows the language. Chrome
// has no date data for some (Burmese and Khmer among them) and falls back to English without
// saying so; configure() warns in the console when that is the case. For such a language the
// product gives the names and the order itself, and the digits to count in:
//   configure({ locale: "my-MM", digits: "mymr", calendar: {
//     months: [12 names, January first], weekdays: [7 short names, Sunday first],
//     value: "{year} {month} {day}", title: "{month} {year}", spoken: "{weekday} {day} {month} {year}" } });

const DEFAULT_LABELS = {
  options: "Options", // names a list that has no label of its own
  search: "Search",
  searchOptions: "Search options",
  noMatches: "No matches",
  chooseDate: "Choose a date",
  previousMonth: "Previous month",
  nextMonth: "Next month",
  today: "Today",
  clear: "Clear",
  tryAgain: "Try again",
  dismiss: "Dismiss",
  cancel: "Cancel",
  ok: "OK",
  saving: "Saving…",
  saved: "Saved",
  stillWorking: "Still working…",
  checking: "Checking…",
  jobDone: "{title}: done",
  jobFailed: "{title}: failed",
  jobCancelled: "{title}: cancelled",
  // A field's problem, when the field has no data-error of its own. Empty: the browser's own
  // message, which is in the browser's language, not the product's — so translated products set these.
  field: { required: "", format: "", range: "" },
  // Wording never claims more than is known: a timeout does not say the work failed, because nobody knows yet.
  load: {
    failed: "This couldn't be loaded.",
    offline: "You're offline. This will load when the connection is back.",
    timeout: "This is taking too long to load.",
    "signed-out": "You've been signed out. Sign in again to see this.",
    denied: "You don't have permission to see this.",
    invalid: "This couldn't be loaded.",
    empty: "Nothing here yet.",
  },
  commit: {
    failed: "That didn't go through. Your details are still here.",
    offline: "You're offline, so nothing was sent. Your details are still here.",
    timeout: "We couldn't confirm that went through. Check before trying again.",
    "signed-out": "You've been signed out. Sign in again — your details are still here.",
    denied: "You don't have permission to do this.",
    invalid: "Some details need fixing before this can go through.",
  },
};

// Outlines on a 16 × 16 grid, drawn with the text colour.
const DEFAULT_ICONS = {
  chevron: "M4 6l4 4 4-4",
  check: "M3.5 8.5l3 3 6-7",
  left: "M10 3.5L5.5 8l4.5 4.5",
  right: "M6 3.5L10.5 8 6 12.5",
  calendar: "M2.5 6.5h11M5 1.75v2.5M11 1.75v2.5M3.5 3h9a1 1 0 0 1 1 1v8.5a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z",
  close: "M4 4l8 8M12 4l-8 8",
  critical: "M8 3.75v5M8 11.9v.2",
};

const copyLabels = (labels) => ({ ...labels, field: { ...labels.field }, load: { ...labels.load }, commit: { ...labels.commit } });

// What a product starts from — the full list of labels to translate. Read-only: change the kit through configure().
const readOnly = (labels) => Object.freeze(Object.fromEntries(Object.entries(labels).map(([name, value]) => [name, typeof value === "object" ? Object.freeze({ ...value }) : value])));
export const defaults = Object.freeze({ labels: readOnly(DEFAULT_LABELS), icons: Object.freeze({ ...DEFAULT_ICONS }) });
const settings = { locale: "", weekStart: null, digits: "", calendar: null, labels: copyLabels(DEFAULT_LABELS), icons: { ...DEFAULT_ICONS } };

// Translations often arrive as a file from a server, so only the kit's own label names are
// taken, and only as text: nothing else in the object can reach the page or the kit's internals.
function takeLabels(known, target, given, path = "") {
  for (const [name, value] of Object.entries(given || {})) {
    if (!Object.hasOwn(known, name)) console.warn(`surface-kit: "${path}${name}" is not one of the kit's labels (see defaults.labels)`);
    else if (typeof known[name] === "object") takeLabels(known[name], target[name], value, `${name}.`);
    else if (typeof value === "string") target[name] = value;
  }
}

const names = (list, length) => Array.isArray(list) && list.length === length && list.every((name) => typeof name === "string");

export function configure({ locale, weekStart, digits, calendar, labels, icons } = {}) {
  if (locale !== undefined) settings.locale = typeof locale === "string" ? locale : "";
  if (weekStart !== undefined) settings.weekStart = weekStart === null ? null : ((Number(weekStart) % 7) + 7) % 7; // 0 Sunday … 6 Saturday; null: the locale's own
  if (digits !== undefined) settings.digits = typeof digits === "string" ? digits : ""; // a numbering system: "mymr", "arab", "latn", …
  if (calendar === null) settings.calendar = null;
  else if (calendar !== undefined) {
    if (names(calendar.months, 12) && names(calendar.weekdays, 7)) {
      const order = (text, usual) => (typeof text === "string" ? text : usual);
      settings.calendar = { months: [...calendar.months], weekdays: [...calendar.weekdays], value: order(calendar.value, "{day} {month} {year}"),
        title: order(calendar.title, "{month} {year}"), spoken: order(calendar.spoken, "{weekday} {day} {month} {year}") };
    } else console.warn("surface-kit: calendar needs months (12 names, January first) and weekdays (7 names, Sunday first)");
  }
  takeLabels(DEFAULT_LABELS, settings.labels, labels);
  for (const [name, path] of Object.entries(icons || {})) {
    if (typeof path === "string" && name !== "__proto__") settings.icons[name] = path;
  }
  if (settings.locale && !settings.calendar && Intl.DateTimeFormat.supportedLocalesOf([settings.locale]).length === 0) {
    console.warn(`surface-kit: this browser cannot format dates in "${settings.locale}" and would show them in English — give configure() a calendar (month and weekday names)`);
  }
}

const wording = (name) => settings.labels[name];
const fill = (template, values) => template.replace(/\{(\w+)\}/g, (whole, name) => (name in values ? values[name] : whole));

// The language everything is formatted in: the one configured, else the page's own (<html lang>).
const localeNow = () => settings.locale || document.documentElement.lang || undefined;

// Monday unless told otherwise; once a locale is configured, the week starts where that locale's does.
function firstDayOfWeek() {
  if (settings.weekStart !== null) return Number(settings.weekStart);
  if (!settings.locale) return 1;
  try {
    const place = new Intl.Locale(settings.locale);
    const week = typeof place.getWeekInfo === "function" ? place.getWeekInfo() : place.weekInfo;
    return week ? week.firstDay % 7 : 1;
  } catch (error) {
    return 1;
  }
}

// For the page's own wording, in the same language as the kit's:
//   plural(3, { one: "{count} row selected", other: "{count} rows selected" })   → "3 rows selected"
//   number(0.42, { style: "percent" })                                           → "42%"
// Languages have up to six plural forms (zero, one, two, few, many, other); give the ones the
// language uses, and always `other`.
export function plural(count, forms) {
  const form = new Intl.PluralRules(localeNow()).select(count);
  return fill(forms[form] ?? forms.other ?? "", { count: number(count) });
}

export function number(value, options) {
  return new Intl.NumberFormat(localeNow(), { ...numerals(), ...options }).format(value);
}

const numerals = () => (settings.digits ? { numberingSystem: settings.digits } : {});

// How the calendar writes dates: the browser's formatting in the locale, or the product's own
// names and order where the browser has none for the language (see configure).
function dateWords() {
  const language = localeNow();
  const count = new Intl.NumberFormat(language, { ...numerals(), useGrouping: false });
  const own = settings.calendar;
  if (own) {
    const parts = (date) => ({ day: count.format(date.getDate()), month: own.months[date.getMonth()], year: count.format(date.getFullYear()), weekday: own.weekdays[date.getDay()] });
    return { value: (date) => fill(own.value, parts(date)), title: (date) => fill(own.title, parts(date)), spoken: (date) => fill(own.spoken, parts(date)),
      weekday: (date) => own.weekdays[date.getDay()], weekdayName: (date) => own.weekdays[date.getDay()], day: (date) => count.format(date.getDate()) };
  }
  const format = (options) => {
    const formatter = new Intl.DateTimeFormat(language, { ...numerals(), ...options });
    return (date) => formatter.format(date);
  };
  // A column heading is the short name where the language has a short one ("Mon", "月", "lun"),
  // and the single letter where its short name is a whole word (Arabic, Persian).
  const short = format({ weekday: "short" });
  const narrow = format({ weekday: "narrow" });
  return { value: format({ day: "numeric", month: "short", year: "numeric" }), title: format({ month: "long", year: "numeric" }),
    spoken: format({ weekday: "long", day: "numeric", month: "long", year: "numeric" }),
    weekday: (date) => ([...short(date)].length <= 4 ? short(date) : narrow(date)), weekdayName: format({ weekday: "long" }), day: (date) => count.format(date.getDate()) };
}

// Motion. Durations and easings are the stylesheet's motion tokens, read where the animation
// happens — so a product retunes motion in one place, for the whole page or for one part of it.
const MOTION = {
  "--ws-fast": 140, // presses, things leaving
  "--ws-base": 220, // changes of state
  "--ws-emerge": 300, // things arriving
  "--ws-flow": 460, // long travel: the lens, a glow
  "--ws-ease": "cubic-bezier(.2,.8,.2,1)",
  "--ws-settle": "cubic-bezier(.25,1.2,.45,1)", // openings: a soft overshoot
};
const FADE = 100; // with reduced motion: a short fade, whatever the tokens say

function motion(element, timeToken, easeToken = "--ws-ease") {
  const style = getComputedStyle(element);
  const written = style.getPropertyValue(timeToken).trim();
  const amount = parseFloat(written);
  const milliseconds = written.endsWith("ms") ? amount : amount * 1000;
  return {
    duration: Number.isFinite(milliseconds) && milliseconds >= 0 ? milliseconds : MOTION[timeToken],
    easing: style.getPropertyValue(easeToken).trim() || MOTION[easeToken],
  };
}

function play(element, frames, timeToken, easeToken = "--ws-ease") {
  if (reduced()) return element.animate(frames, { duration: FADE });
  const timing = motion(element, timeToken, easeToken);
  try {
    return element.animate(frames, timing);
  } catch (error) {
    return element.animate(frames, { duration: timing.duration, easing: MOTION[easeToken] }); // a token that isn't an easing
  }
}

// Icons are built as elements, never as HTML strings: nothing in this file writes markup into the
// page, so it works under a strict Content-Security-Policy and with Trusted Types.
const SVG = "http://www.w3.org/2000/svg";

function icon(name, { size = 16, className = "ws-icon" } = {}) {
  const svg = document.createElementNS(SVG, "svg");
  const shape = document.createElementNS(SVG, "path");
  const set = (node, attributes) => Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
  set(svg, { class: className, viewBox: "0 0 16 16", width: size, height: size, "aria-hidden": "true" });
  set(shape, { d: Object.hasOwn(settings.icons, name) ? settings.icons[name] : "", fill: "none", stroke: "currentColor", "stroke-width": "1.75", "stroke-linecap": "round", "stroke-linejoin": "round" });
  svg.append(shape);
  return svg;
}

// The tick that confirms something really happened; the stylesheet draws it in.
function tick() {
  const mark = icon("check", { size: 18, className: "ws-mark" });
  mark.firstChild.setAttribute("pathLength", "1");
  return mark;
}

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
    // It lines up with the edge of its button that text starts from: the left, or the right in right-to-left languages.
    const start = rightToLeft(trigger) ? box.right - size.width : box.left;
    const left = Math.min(Math.max(edge, start), Math.max(edge, innerWidth - size.width - edge));
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
    if (reduced()) return panel.animate([{ opacity: opening ? 0 : 1 }, { opacity: opening ? 1 : 0 }], { duration: FADE });
    const radius = getComputedStyle(panel).borderTopLeftRadius;
    const covered = panel.dataset.opensUp === "true" ? `inset(62% 0 0 0 round ${radius})` : `inset(0 0 62% 0 round ${radius})`;
    const hidden = narrow() ? { opacity: 0, transform: "translateY(28px)" } : { opacity: 0, transform: "scale(.9)", clipPath: covered };
    const shown = narrow() ? { opacity: 1, transform: "none" } : { opacity: 1, transform: "none", clipPath: `inset(0 0 0 0 round ${radius})` };
    return opening ? play(panel, [hidden, shown], "--ws-emerge", "--ws-settle") : play(panel, [shown, hidden], "--ws-fast");
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
  trigger.append(icon("chevron"));
  wrapNative(native, trigger, "ws-select-wrap");

  const panel = el("div", "ws-listbox");
  const list = el("div", "ws-options");
  list.setAttribute("role", "listbox");
  list.id = nextId("ws-list");
  const labelId = nameFromLabel(native, trigger, value.id);
  if (labelId) list.setAttribute("aria-labelledby", labelId); else list.setAttribute("aria-label", trigger.getAttribute("aria-label") || wording("options"));
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
    row.append(icon("check"));
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
      search.placeholder = native.dataset.search || wording("search");
      search.setAttribute("aria-label", wording("searchOptions"));
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
    // The stylesheet shows this attribute's text in the empty list.
    if (usable().length === 0) list.setAttribute("data-empty", wording("noMatches")); else list.removeAttribute("data-empty");
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
  const words = dateWords();
  const weekStart = native.dataset.weekStart ? Number(native.dataset.weekStart) : firstDayOfWeek();
  const placeholder = native.dataset.placeholder || wording("chooseDate");

  const trigger = el("button", "ws-date");
  trigger.type = "button";
  trigger.setAttribute("aria-haspopup", "dialog");
  const value = el("span", "ws-date-value");
  value.id = nextId("ws-value");
  trigger.append(icon("calendar"));
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
  previous.append(icon("left"));
  next.append(icon("right"));
  previous.setAttribute("aria-label", wording("previousMonth"));
  next.setAttribute("aria-label", wording("nextMonth"));
  const header = el("div", "ws-calendar-header");
  header.append(title, previous, next);
  const grid = el("div", "ws-calendar-grid");
  grid.setAttribute("role", "grid");
  const todayButton = el("button", "ws-calendar-action", wording("today"));
  const clearButton = el("button", "ws-calendar-action", wording("clear"));
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
    value.textContent = chosen ? words.value(chosen) : placeholder;
    trigger.toggleAttribute("data-empty", !chosen);
    trigger.disabled = native.disabled;
    clearButton.hidden = native.required || !chosen;
  }

  function dayButton(date) {
    const button = el("button", "ws-day", words.day(date));
    button.type = "button";
    button.setAttribute("role", "gridcell");
    button.dataset.date = toIso(date);
    button.setAttribute("aria-label", words.spoken(date));
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
      const day = addDays(sunday, weekStart + index);
      const name = el("span", "ws-weekday", words.weekday(day));
      name.setAttribute("role", "columnheader");
      name.setAttribute("aria-label", words.weekdayName(day));
      row.append(name);
    }
    return row;
  }

  function render(direction = 0) {
    title.textContent = words.title(view);
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
      // The new month comes in from the side it lies on: later months from the end of the line.
      const from = direction * (rightToLeft(grid) ? -14 : 14);
      play(grid, [{ opacity: 0, transform: `translateX(${from}px)` }, { opacity: 1, transform: "none" }], "--ws-base");
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
    const forward = rightToLeft(grid) ? -1 : 1; // the arrow keys follow the days as they are laid out
    const steps = { ArrowLeft: -forward, ArrowRight: forward, ArrowUp: -7, ArrowDown: 7, Home: -fromWeekStart, End: 6 - fromWeekStart };
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
// -format / -range for each kind of problem; then the product's labels.field; otherwise the
// browser's own message (which is in the browser's language, not the page's).

function problemWith(field) {
  const state = field.validity;
  if (state.valid) return "";
  const data = field.dataset;
  const words = wording("field");
  const kind = state.valueMissing ? "required"
    : state.typeMismatch || state.patternMismatch || state.badInput ? "format"
      : state.rangeUnderflow || state.rangeOverflow || state.tooShort || state.tooLong || state.stepMismatch ? "range" : "";
  const own = { required: data.errorRequired, format: data.errorFormat, range: data.errorRange }[kind];
  return own || data.error || words[kind] || field.validationMessage;
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
// Feedback. The user never wonders whether a press was received, whether the app is working, or
// whether it went wrong — and is never told something worked before the server has said so.
//
// One state model, as data-state on a region or a button:
//   idle        ready
//   loading     the first fetch: nothing to show yet
//   refreshing  fetching again, with what was loaded still on screen
//   processing  carrying out what the user asked for
//   success     confirmed by the server
//   error       it failed; the message says what to do
//   empty       it worked and there is nothing to show
//   retrying    trying again after a failure
//   cancelled   stopped by the user
// A "ws:state" event bubbles from the element on every change.

export const STATES = ["idle", "loading", "refreshing", "processing", "success", "error", "empty", "retrying", "cancelled"];
const SHOW_AFTER = 300; // under this an indicator would only flicker, so none is shown
const SHOW_FOR = 450; // once shown, it stays long enough to be seen
const EXPLAIN_AFTER = 3000; // past this the user is owed a word about what is happening

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function setState(element, state, detail = {}) {
  element.dataset.state = state;
  const working = ["loading", "refreshing", "processing", "retrying"].includes(state);
  if (working) element.setAttribute("aria-busy", "true"); else element.removeAttribute("aria-busy");
  element.dispatchEvent(new CustomEvent("ws:state", { bubbles: true, detail: { state, ...detail } }));
}

let liveRegion = null;

// Says a change of state to screen readers without moving focus.
export function announce(message) {
  if (!liveRegion) {
    liveRegion = el("div", "ws-live");
    liveRegion.setAttribute("role", "status");
    document.body.append(liveRegion);
  }
  liveRegion.textContent = "";
  requestAnimationFrame(() => { liveRegion.textContent = message; });
}

function withTimeout(promise, ms) {
  if (!ms) return promise;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Object.assign(new Error("No answer in time"), { name: "TimeoutError" })), ms);
    promise.then((value) => { clearTimeout(timer); resolve(value); }, (error) => { clearTimeout(timer); reject(error); });
  });
}

// What went wrong, in the terms that decide what the user can do next. Reject a request with an
// Error carrying .status (the HTTP status) and, for a message meant for the user, .userMessage.
export function problem(error) {
  const status = error ? error.status : 0;
  if (error && error.name === "AbortError") return { kind: "cancelled" };
  if (navigator.onLine === false) return { kind: "offline" };
  if (error && error.name === "TimeoutError") return { kind: "timeout" };
  if (status === 401) return { kind: "signed-out" };
  if (status === 403) return { kind: "denied" };
  if (status === 400 || status === 409 || status === 422) return { kind: "invalid", detail: error.userMessage };
  return { kind: "failed", detail: error ? error.userMessage : undefined };
}

// --- data arriving

// The blocks a region shows for the states its markup didn't provide.
function defaultBlocks(region, messages) {
  const has = (state) => region.querySelector(`:scope > [data-ws-when~="${state}"]`);
  if (!has("loading")) {
    const block = el("div", "ws-skeletons");
    block.setAttribute("data-ws-when", "loading");
    block.setAttribute("aria-hidden", "true");
    for (const width of ["62%", "88%", "74%"]) block.append(Object.assign(el("span", "ws-skeleton"), { style: `width:${width}` }));
    region.append(block);
  }
  if (!has("empty")) {
    const block = el("div", "ws-empty");
    block.setAttribute("data-ws-when", "empty");
    block.append(el("strong", "", messages.empty || wording("load").empty));
    region.append(block);
  }
  if (!has("error")) {
    const block = el("div", "ws-problem");
    block.setAttribute("data-ws-when", "error retrying");
    block.setAttribute("role", "alert");
    const text = el("strong");
    text.setAttribute("data-ws-message", "");
    const retry = el("button", "ws-button", wording("tryAgain"));
    retry.type = "button";
    retry.setAttribute("data-ws-retry", "");
    block.append(text, retry);
    region.append(block);
  }
}

// Loads data into a region and shows every state on the way. The region shows the child written
// for its state — <div data-ws-when="loading"> (a skeleton shaped like the real content),
// "success refreshing" (the content), "empty", "error retrying" — and gets plain ones for any it lacks.
//   • no indicator for the first 300 ms, but its space is kept, so nothing flickers and nothing jumps
//   • a refresh keeps what was loaded on screen; if it fails, the old data stays and a notice says so
//   • offline: it retries by itself when the connection returns
//   • only the latest request counts; an older answer arriving late is dropped
// `fetcher({ signal })` returns a promise of the data; `render(data)` puts it on the page.
// Wording: labels.load, or `messages` for this one region ({ empty, failed, offline, timeout, … }).
export function load(region, fetcher, { render, isEmpty = (data) => Array.isArray(data) && data.length === 0, timeout = 15000, messages = {} } = {}) {
  region.classList.add("ws-region");
  defaultBlocks(region, messages);
  let latest = 0;
  let controller = null;
  let hasData = false;

  function showProblem(found) {
    const text = messages[found.kind] || found.detail || wording("load")[found.kind];
    if (found.kind === "offline") addEventListener("online", () => attempt({ retrying: true }), { once: true });
    if (hasData) {
      // A failed refresh never takes away what the user is looking at.
      setState(region, "success", { stale: true });
      toast(text, { tone: "bad", action: { label: wording("tryAgain"), run: () => attempt({ retrying: true }) } });
      return;
    }
    const slot = region.querySelector(':scope > [data-ws-when~="error"] [data-ws-message]');
    if (slot) slot.textContent = text;
    setState(region, "error", found);
  }

  async function attempt({ retrying = false } = {}) {
    latest += 1;
    const mine = latest;
    if (controller) controller.abort();
    controller = new AbortController();
    region.toggleAttribute("data-ws-quiet", !retrying);
    setState(region, retrying ? "retrying" : hasData ? "refreshing" : "loading");
    let shownAt = retrying ? Date.now() : 0;
    const reveal = setTimeout(() => {
      shownAt = Date.now();
      region.removeAttribute("data-ws-quiet");
    }, SHOW_AFTER);
    let outcome;
    try {
      outcome = { data: await withTimeout(fetcher({ signal: controller.signal }), timeout) };
    } catch (error) {
      outcome = { error };
    }
    clearTimeout(reveal);
    if (shownAt) await sleep(Math.max(0, SHOW_FOR - (Date.now() - shownAt)));
    if (mine !== latest) return undefined; // a newer request has taken over
    region.removeAttribute("data-ws-quiet");
    if (outcome.error) return showProblem(problem(outcome.error));
    hasData = !isEmpty(outcome.data);
    if (render) render(outcome.data);
    return setState(region, hasData ? "success" : "empty");
  }

  function cancel() {
    latest += 1;
    if (controller) controller.abort();
    region.removeAttribute("data-ws-quiet");
    setState(region, hasData ? "success" : "cancelled");
  }

  region.addEventListener("click", (event) => {
    if (event.target.closest("[data-ws-retry]")) attempt({ retrying: true });
  });
  attempt();
  return { reload: () => attempt(), cancel, state: () => region.dataset.state };
}

// --- something the user asked for

function labelOf(button) {
  let label = button.querySelector(":scope > .ws-button-label");
  if (!label) {
    label = el("span", "ws-button-label");
    label.append(...button.childNodes);
    button.append(label);
  }
  return label;
}

function showWorking(label, text) {
  label.replaceChildren(el("span", "ws-spinner"), document.createTextNode(text));
  announce(text);
}

// A button that saves, sends, confirms or deletes. Call it from the button's own handler:
//   const result = await commit(button, ({ signal }) => api.save(data, { signal }), { busyLabel: "Saving…", doneLabel: "Saved" });
//   if (result.ok) …
// One press, one request: a second press while it works, or while it shows the tick, is ignored. It acknowledges at once, says
// what it is doing ("Saving…", then "Still working…" after three seconds), waits for the real
// answer, and only then shows the tick. On failure the button is ready again, nothing the user
// typed is touched, and the message says what happened (onError to show it yourself — for field
// errors, say). It keeps focus, and its width, throughout.
// A timeout is not a failure — nobody knows whether it went through. Give `verify` (a function
// that asks the server) and it checks before saying anything; without it the message says so and
// offers no automatic retry, because repeating an unknown could do the thing twice.
export async function commit(button, work, {
  busyLabel = wording("saving"), doneLabel = wording("saved"), slowLabel = wording("stillWorking"), timeout = 20000, verify, onError, messages = {},
} = {}) {
  // One press, one request — also while the tick is still showing: a second click that lands just
  // after a fast answer is the classic double submission.
  if (button.dataset.state === "processing" || button.dataset.state === "success") return { ok: false, ignored: true };
  const label = labelOf(button);
  const original = [...label.childNodes];
  button.style.minWidth = `${Math.ceil(button.getBoundingClientRect().width)}px`;
  button.setAttribute("aria-disabled", "true"); // not disabled: that would drop the keyboard's place
  setState(button, "processing");
  let shownAt = 0;
  const reveal = setTimeout(() => {
    shownAt = Date.now();
    showWorking(label, busyLabel);
  }, 250);
  const explain = setTimeout(() => showWorking(label, slowLabel), EXPLAIN_AFTER);
  const controller = new AbortController();
  let outcome;
  try {
    outcome = { data: await withTimeout(work({ signal: controller.signal }), timeout) };
  } catch (error) {
    outcome = { error };
  }
  clearTimeout(reveal);
  clearTimeout(explain);
  if (outcome.error && problem(outcome.error).kind === "timeout" && verify) {
    showWorking(label, wording("checking"));
    try {
      if (await verify()) outcome = { data: undefined };
    } catch (error) { /* still unknown: the timeout message stands */ }
  }
  if (shownAt) await sleep(Math.max(0, SHOW_FOR - (Date.now() - shownAt)));

  const ready = () => {
    label.replaceChildren(...original);
    button.style.minWidth = "";
    button.removeAttribute("aria-disabled");
    setState(button, "idle");
  };
  if (!outcome.error) {
    setState(button, "success");
    label.replaceChildren(tick(), doneLabel);
    announce(doneLabel);
    setTimeout(ready, 1400);
    return { ok: true, data: outcome.data };
  }
  const found = problem(outcome.error);
  ready();
  setState(button, "error", found);
  setTimeout(() => { if (button.dataset.state === "error") setState(button, "idle"); }, 600);
  const text = messages[found.kind] || found.detail || wording("commit")[found.kind];
  const canRetry = found.kind === "failed" || found.kind === "offline";
  if (onError) onError({ ...found, message: text, error: outcome.error });
  else if (found.kind !== "cancelled") toast(text, { tone: "bad", action: canRetry ? { label: wording("tryAgain"), run: () => button.click() } : undefined });
  return { ok: false, error: outcome.error, problem: found };
}

// --- notices: toasts and background work, in one stack

let stack = null;

// The stack sits above everything, including an open dialog (it lives inside the dialog while one
// is open, so it can still be pressed), and comes to the front each time something is added.
function noticeStack() {
  let host = document.body;
  try { host = document.querySelector("dialog:modal") || document.body; } catch (error) { /* :modal not known to this browser */ }
  if (!stack) {
    stack = el("div", "ws-stack");
    if (typeof stack.showPopover === "function") stack.setAttribute("popover", "manual");
  }
  if (stack.parentElement !== host) host.append(stack);
  if (stack.hasAttribute("popover")) {
    try {
      if (stack.matches(":popover-open")) stack.hidePopover();
      stack.showPopover();
    } catch (error) { /* shown as an ordinary fixed element */ }
  }
  return stack;
}

// A notice must not cover the control the user has just used, nor a screen's main action: if it
// would in its usual corner, the stack takes the other side (when that side is clear).
function keepClear() {
  const used = document.activeElement;
  const inTheWay = [...document.querySelectorAll('.ws-button[data-variant="primary"]')];
  if (used && used !== document.body && !stack.contains(used)) inTheWay.push(used);
  const covers = () => {
    const mine = stack.getBoundingClientRect();
    return inTheWay.some((control) => {
      const theirs = control.getBoundingClientRect();
      return theirs.width > 0 && mine.left < theirs.right && mine.right > theirs.left && mine.top < theirs.bottom && mine.bottom > theirs.top;
    });
  };
  stack.removeAttribute("data-side");
  if (!covers()) return;
  stack.setAttribute("data-side", "other");
  if (covers()) stack.removeAttribute("data-side");
}

function arriveNotice(notice) {
  keepClear();
  const from = reduced() ? { opacity: 0 } : { opacity: 0, transform: "translateY(14px) scale(.96)" };
  play(notice, [from, { opacity: 1, transform: "none" }], "--ws-emerge");
}

async function leaveNotice(notice) {
  if (!notice.isConnected) return;
  const to = reduced() ? { opacity: 0 } : { opacity: 0, transform: "translateY(8px) scale(.97)" };
  await play(notice, [{ opacity: 1, transform: "none" }, to], "--ws-fast").finished.catch(() => {});
  notice.remove();
  if (stack && !stack.children.length && stack.hasAttribute("popover")) {
    try { stack.hidePopover(); } catch (error) { /* already hidden */ }
  }
}

function closeButton(onClose) {
  const close = el("button", "ws-notice-close");
  close.type = "button";
  close.setAttribute("aria-label", wording("dismiss"));
  close.append(icon("close"));
  close.addEventListener("click", onClose);
  return close;
}

// A small notice. tone "ok" (with the tick) and "info" leave by themselves — but not while the
// pointer or the keyboard is on them, and more slowly when they carry an action such as Undo.
// tone "bad" stays until the user dismisses it or acts: an error that disappears is an error lost.
// Use it when the result isn't already visible where the user acted; never to repeat what a
// button's own tick has just said. action: { label, run }.
export function toast(message, { tone = "info", action, duration } = {}) {
  const notice = el("div", "ws-toast");
  notice.dataset.tone = tone;
  if (tone === "bad") notice.setAttribute("role", "alert");
  if (tone === "ok") notice.append(tick());
  notice.append(el("span", "ws-toast-text", message));
  let timer = 0;
  const dismiss = () => {
    clearTimeout(timer);
    return leaveNotice(notice);
  };
  if (action) {
    const button = el("button", "ws-toast-action", action.label);
    button.type = "button";
    button.addEventListener("click", () => {
      action.run();
      dismiss();
    });
    notice.append(button);
  }
  notice.append(closeButton(dismiss));
  const host = noticeStack();
  const shown = host.querySelectorAll(".ws-toast");
  if (shown.length >= 3) shown[0].remove(); // at most three at once: the oldest gives way
  host.append(notice);
  arriveNotice(notice);
  if (tone !== "bad") announce(message);
  const life = duration ?? (tone === "bad" ? 0 : action ? 8000 : 4500);
  const start = () => { if (life) timer = setTimeout(dismiss, life); };
  const stop = () => clearTimeout(timer);
  notice.addEventListener("pointerenter", stop);
  notice.addEventListener("pointerleave", start);
  notice.addEventListener("focusin", stop);
  notice.addEventListener("focusout", start);
  start();
  return { dismiss, element: notice };
}

// Long work in the background — an upload, a report, a sync — while the user carries on.
//   const job = progress("Exporting work orders", { onCancel: () => controller.abort() });
//   job.update({ value: 0.4, status: "400 of 1,000 rows" });   job.done("Export ready");   job.fail("Export failed", { retry });
// It shows a percentage only when update() is given a real `value` (0 to 1) from the work
// itself; without one the bar simply shows that work is going on. Never invent a figure.
export function progress(title, { onCancel } = {}) {
  const card = el("div", "ws-progress");
  card.setAttribute("role", "group");
  card.setAttribute("aria-label", title);
  card.setAttribute("data-indeterminate", "");
  const heading = el("div", "ws-progress-title", title);
  const status = el("div", "ws-progress-status");
  const bar = el("div", "ws-progress-bar");
  bar.setAttribute("role", "progressbar");
  bar.setAttribute("aria-label", title);
  card.append(heading, status, bar);
  let timer = 0;
  const close = () => {
    clearTimeout(timer);
    return leaveNotice(card);
  };
  if (onCancel) {
    const cancel = el("button", "ws-toast-action", wording("cancel"));
    cancel.type = "button";
    cancel.addEventListener("click", () => {
      onCancel();
      finish("cancelled", fill(wording("jobCancelled"), { title }));
    });
    card.append(cancel);
  }
  noticeStack().append(card);
  arriveNotice(card);
  announce(title);

  function update({ value, status: text } = {}) {
    if (typeof value === "number") {
      const share = Math.min(1, Math.max(0, value));
      card.removeAttribute("data-indeterminate");
      bar.style.setProperty("--value", String(share));
      bar.setAttribute("aria-valuemin", "0");
      bar.setAttribute("aria-valuemax", "100");
      bar.setAttribute("aria-valuenow", String(Math.round(share * 100)));
    }
    if (text !== undefined) status.textContent = text;
  }

  function finish(state, message, retry) {
    card.dataset.state = state;
    heading.textContent = "";
    if (state === "success") heading.append(tick());
    heading.append(message);
    status.textContent = "";
    bar.remove();
    for (const button of card.querySelectorAll(".ws-toast-action")) button.remove();
    if (retry) {
      const again = el("button", "ws-toast-action", wording("tryAgain"));
      again.type = "button";
      again.addEventListener("click", () => {
        close();
        retry();
      });
      card.append(again);
    }
    card.append(closeButton(close));
    if (state === "error") card.setAttribute("role", "alert"); else announce(message);
    if (state !== "error") timer = setTimeout(close, 5000); // a failure stays until it is dealt with
  }

  return {
    update,
    done: (message = fill(wording("jobDone"), { title })) => finish("success", message),
    fail: (message = fill(wording("jobFailed"), { title }), { retry } = {}) => finish("error", message, retry),
    close,
    element: card,
  };
}

// A message that needs an answer before anything else goes on. The kit gives the material, the
// motion, the focus handling and the keyboard; the product gives everything it says and does:
//   const answer = await dialog({
//     title: "Delete 3 work orders?", message: "This can't be undone.",
//     actions: [{ label: "Cancel", value: "cancel" }, { label: "Delete", value: "delete", danger: true }],
//   });
// actions: any number of { label, value, primary, danger, focus }. Resolves with the chosen
// action's value, or "dismissed" (Escape). Focus starts on the action marked `focus`, else the
// primary one — never on a destructive one, so a stray Enter can't delete anything.
// critical: true — thick glass with a mark, for an error that must be dealt with before the user
// can carry on (see errorDialog); whether something is critical is the product's decision.
// icon: a name from the icon set (configure({ icons })) for the mark; size: "small" | "medium" | "large".
// A dialog with fields in it is the page's own <dialog class="ws-dialog">, not this.
export function dialog({ title, message, actions, critical = false, icon: mark = critical ? "critical" : "", size = critical ? "small" : "medium" } = {}) {
  const choices = actions && actions.length ? actions : [{ label: wording("ok"), value: "ok", primary: true }];
  return new Promise((resolve) => {
    const sheet = el("dialog", "ws-dialog");
    sheet.dataset.size = size;
    if (critical) sheet.setAttribute("data-critical", "");
    sheet.setAttribute("role", "alertdialog");
    const heading = el("h2", "ws-dialog-title", title);
    heading.id = nextId("ws-title");
    sheet.setAttribute("aria-labelledby", heading.id);
    const body = el("div", "ws-dialog-body");
    if (mark) {
      const badge = el("span", "ws-dialog-mark");
      badge.setAttribute("aria-hidden", "true");
      badge.append(icon(mark, { size: 22 }));
      body.append(badge);
    }
    body.append(heading);
    if (message) {
      const text = el("p", "ws-dialog-text", message);
      text.id = nextId("ws-text");
      sheet.setAttribute("aria-describedby", text.id);
      body.append(text);
    }
    const row = el("div", "ws-dialog-actions");
    const buttons = choices.map((action) => {
      const button = el("button", "ws-button", action.label);
      button.type = "button";
      if (action.danger) button.dataset.variant = "danger"; else if (action.primary) button.dataset.variant = "primary";
      button.addEventListener("click", () => sheet.close(action.value));
      row.append(button);
      return button;
    });
    const safe = (action) => !action.danger;
    const first = choices.findIndex((action) => action.focus && safe(action));
    const primary = choices.findIndex((action) => action.primary && safe(action));
    const start = [first, primary, choices.findIndex(safe), 0].find((index) => index >= 0);
    buttons[start].autofocus = true;
    sheet.append(body, row);
    sheet.addEventListener("close", () => {
      resolve(sheet.returnValue || "dismissed");
      setTimeout(() => sheet.remove(), 2 * motion(sheet, "--ws-emerge").duration); // after it has receded
    });
    document.body.append(sheet);
    sheet.showModal();
  });
}

// A critical error — the dialog above in thick glass, with the mark. Everything that isn't
// critical is a message beside the field, in the region, or a toast.
export const errorDialog = (options) => dialog({ ...options, critical: true });

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
      play(thumb, [
        { left: `${last.left}px`, width: `${last.width}px`, backgroundPosition: `${glint[0]}, 0 0` },
        { left: `${start}px`, width: `${end - start}px`, offset: 0.42 },
        { left: `${next.left}px`, width: `${next.width}px`, backgroundPosition: `${glint[1]}, 0 0` },
      ], "--ws-flow");
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

const GLASS = ".ws-toolbar, .ws-bulk, .ws-popover, .ws-toast, .ws-progress, dialog.ws-dialog";
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
