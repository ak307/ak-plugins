// Small rendering helpers shared by every screen: safe HTML templates,
// icons, avatars, status chips and the routing-slip track.
window.Approvals = window.Approvals || {};

Approvals.ui = (() => {
  const policy = Approvals.policy;
  const data = Approvals.data;

  // ---- Safe HTML templates ----------------------------------------------------
  // html`<p>${value}</p>` escapes every value; nest html`` results or raw()
  // for markup that is already safe. Read `.value` to get the string.

  class SafeHtml {
    constructor(value) { this.value = value; }
  }
  const raw = (value) => new SafeHtml(value);

  function escapeHtml(value) {
    const replacements = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return String(value).replace(/[&<>"']/g, (character) => replacements[character]);
  }

  function toMarkup(value) {
    // Booleans print as "true"/"false" so aria-selected="${isOpen}" works.
    if (value === null || value === undefined) return "";
    if (value instanceof SafeHtml) return value.value;
    if (Array.isArray(value)) return value.map(toMarkup).join("");
    return escapeHtml(value);
  }

  function html(strings, ...values) {
    let markup = strings[0];
    values.forEach((value, index) => { markup += toMarkup(value) + strings[index + 1]; });
    return raw(markup);
  }

  function setHtml(element, template) {
    element.innerHTML = toMarkup(template);
  }

  // ---- Icons ----------------------------------------------------------------------

  const ICON_PATHS = {
    check: '<path d="M3.5 8.5l3 3 6-7" />',
    cross: '<path d="M4 4l8 8M12 4l-8 8" />',
    back: '<path d="M6 4L2.5 7.5 6 11" /><path d="M3 7.5h6.5a4 4 0 0 1 0 8H8" />',
    clock: '<circle cx="8" cy="8" r="6" /><path d="M8 4.5V8l2.4 1.6" />',
    alert: '<path d="M8 2.2l6.2 11H1.8z" /><path d="M8 6.5v3M8 11.4v.1" />',
    dot: '<circle cx="8" cy="8" r="3" />',
    clip: '<path d="M10.5 4.5l-5 5a1.8 1.8 0 0 0 2.5 2.5l5.2-5.2a3 3 0 0 0-4.3-4.3L3.7 7.7a4.2 4.2 0 0 0 6 6l4-4" />',
    file: '<path d="M4 1.8h5l3 3v9.4H4z" /><path d="M9 1.8v3h3" />',
    sheet: '<rect x="2.5" y="2.5" width="11" height="11" rx="1.5" /><path d="M2.5 6.2h11M2.5 9.8h11M6.4 2.5v11" />',
    arrow: '<path d="M3 8h10M9 4l4 4-4 4" />',
    close: '<path d="M4 4l8 8M12 4l-8 8" />',
    keyboard: '<rect x="1.5" y="4" width="13" height="8" rx="1.5" /><path d="M4 7h.1M6.5 7h.1M9 7h.1M11.5 7h.1M5 9.5h6" />',
    upload: '<path d="M8 11V3M4.5 6.5L8 3l3.5 3.5M3 13h10" />',
    inbox: '<path d="M2 9l2-6h8l2 6v4H2z" /><path d="M2 9h3.5l1 1.6h3L10.5 9H14" />',
  };

  function icon(name, size = 16) {
    return raw(`<svg class="icon icon-${name}" viewBox="0 0 16 16" width="${size}" height="${size}" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS[name]}</svg>`);
  }

  // ---- People -----------------------------------------------------------------------

  function initials(name) {
    return name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase();
  }

  // A stable hue per person so the same face is the same colour everywhere.
  function hueFor(id) {
    let hash = 0;
    for (const character of id) hash = (hash * 31 + character.charCodeAt(0)) % 360;
    return hash;
  }

  function avatar(personId, size = "md") {
    const person = data.person(personId);
    return html`<span class="avatar avatar-${size}" style="--hue:${hueFor(personId)}" aria-hidden="true">${initials(person.name)}</span>`;
  }

  // ---- Status ------------------------------------------------------------------------

  const URGENCY_ICON = { ok: "clock", soon: "clock", late: "alert" };

  function waitChip(hours, { prefix = "" } = {}) {
    const level = policy.urgency(hours);
    const label = `${prefix}${policy.formatWait(hours)}`;
    return html`<span class="chip chip-${level}" title="${policy.URGENCY_LABELS[level]}">${icon(URGENCY_ICON[level], 14)}<span>${label}</span><span class="sr-only">, ${policy.URGENCY_LABELS[level].toLowerCase()}</span></span>`;
  }

  const STATUS_CHIPS = {
    in_review: { tone: "info", icon: "dot", label: "In review" },
    changes_requested: { tone: "warn", icon: "back", label: "Changes requested" },
    approved: { tone: "ok", icon: "check", label: "Approved" },
    rejected: { tone: "bad", icon: "cross", label: "Rejected" },
  };

  function statusChip(request) {
    const chip = STATUS_CHIPS[request.status];
    let label = chip.label;
    if (request.status === "in_review") label = `With ${policy.ROLE_LABELS[policy.currentStep(request).role]}`;
    return html`<span class="chip chip-${chip.tone}">${icon(chip.icon, 14)}<span>${label}</span></span>`;
  }

  // Step state → the visual name used by the slip and the track.
  function stepState(step) {
    if (step.status === "approved") return "signed";
    if (step.status === "pending") return "current";
    if (step.status === "sent_back") return "returned";
    if (step.status === "rejected") return "refused";
    return "upcoming";
  }

  const STEP_WORDS = { signed: "approved", current: "waiting", returned: "sent back", refused: "rejected", upcoming: "to come" };

  // The compact routing slip used in rows: one mark per step.
  function routeTrack(request) {
    const description = request.route.map((step) => `${policy.ROLE_LABELS[step.role]} ${STEP_WORDS[stepState(step)]}`).join(", ");
    return html`<span class="track" role="img" aria-label="Route: ${description}">${request.route.map((step, index) => html`${index > 0 ? html`<span class="track-line track-line-${stepState(request.route[index - 1])}"></span>` : ""}<span class="track-step track-${stepState(step)}" title="${policy.ROLE_LABELS[step.role]} — ${STEP_WORDS[stepState(step)]}">${policy.ROLE_LABELS[step.role][0]}</span>`)}</span>`;
  }

  function money(amount, options) {
    return html`<span class="money">${policy.formatMoney(amount, options)}</span>`;
  }

  function plural(count, one, many = `${one}s`) {
    return `${count.toLocaleString()} ${count === 1 ? one : many}`;
  }

  return { html, raw, setHtml, escapeHtml, icon, avatar, initials, hueFor, waitChip, statusChip, stepState, STEP_WORDS, routeTrack, money, plural };
})();
