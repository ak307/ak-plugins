// Approvals workspace — state, data loading, actions and events.
// Rendering lives in ui-views.js / ui-detail.js; rules live in policy.js.
(() => {
  const policy = Approvals.policy;
  const data = Approvals.data;
  const views = Approvals.views;
  const detailUi = Approvals.detail;
  const { html, setHtml, avatar, plural, icon } = Approvals.ui;
  const { flip, collapseOut, withLoading, rollNumber, openFrom, closeInto, settle, pressable } = MotionKit;
  const { createStore, latestOnly, view, keepDraft, hasDraft, toast, roving, keepFocus } = ExperienceKit;

  const store = createStore("requests", data.buildSeed());
  const latestLoad = latestOnly();
  const wideQuery = matchMedia("(min-width: 1200px)");
  const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Motion tokens from tokens.css, so hand-made animations match the kit's.
  function readMotion() {
    const style = getComputedStyle(document.documentElement);
    const read = (name) => style.getPropertyValue(name).trim();
    return {
      fast: parseFloat(read("--motion-fast")), base: parseFloat(read("--motion-base")), slow: parseFloat(read("--motion-slow")),
      out: read("--ease-out"), inOut: read("--ease-in-out"), spring: read("--ease-spring"),
    };
  }
  const MOTION = readMotion();

  const elements = {
    personaButton: document.getElementById("personaButton"),
    personaMenu: document.getElementById("personaMenu"),
    personaName: document.getElementById("personaName"),
    personaAvatar: document.getElementById("personaAvatar"),
    search: document.getElementById("search"),
    resetButton: document.getElementById("resetButton"),
    heroEyebrow: document.getElementById("heroEyebrow"),
    heroTitle: document.getElementById("heroTitle"),
    heroSub: document.getElementById("heroSub"),
    heroVisual: document.getElementById("heroVisual"),
    tabs: document.getElementById("tabs"),
    toolbar: document.getElementById("toolbar"),
    board: document.getElementById("board"),
    detail: document.getElementById("detail"),
    backdrop: document.getElementById("sheetBackdrop"),
    bulkbar: document.getElementById("bulkbar"),
    dialog: document.getElementById("dialog"),
    policyNote: document.getElementById("policyNote"),
  };

  // Bulk results are announced from where the bulk bar sits, even after it has gone.
  const toastDock = document.createElement("div");
  toastDock.className = "toast-dock";
  toastDock.setAttribute("aria-hidden", "true");
  document.body.append(toastDock);

  const state = {
    requests: [],
    loaded: false,
    loadError: "",
    selected: new Set(),
    openId: null,
    // Where the open request came from, so closing returns focus there.
    openTrigger: null,
    extras: "loading",
    extrasMessage: "",
    composer: null,
    busy: false,
    dialogTrigger: null,
    // The last single decision, offered for undo at the top of the next request.
    receipt: null,
  };

  // ---- View state (lives in the URL) ---------------------------------------------

  function currentView() {
    const params = view.read();
    const persona = data.PERSONAS.find((item) => item.key === params.as) || data.PERSONAS[1];
    const tabs = tabsFor(persona);
    const tab = tabs.some((item) => item.key === params.tab) ? params.tab : tabs[0].key;
    return { persona, tab, query: params.q || "", sort: params.sort === "largest" ? "largest" : "oldest", overdueOnly: params.overdue === "1", openId: params.open || null };
  }

  function tabsFor(persona) {
    if (persona.role === "requester") return [{ key: "mine", label: "My requests" }];
    return [{ key: "queue", label: "Needs you" }, { key: "sent", label: "Sent back" }, { key: "decided", label: "Decided" }];
  }

  const personPersona = () => data.person(currentView().persona.personId);

  // ---- Derived data: one source for every number on screen ---------------------------

  const byId = (id) => state.requests.find((request) => request.id === id);

  function matchesQuery(request, query) {
    if (!query) return true;
    const haystack = [request.id, request.title, request.vendor, data.person(request.requesterId).name, data.department(request.departmentId).name].join(" ").toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  }

  function queueFor(persona) {
    return state.requests.filter((request) => request.status === "in_review" && policy.currentStep(request).approverId === persona.personId);
  }

  function sentBackBy(persona) {
    return state.requests.filter((request) => request.status === "changes_requested"
      && request.route.some((step) => step.status === "sent_back" && step.approverId === persona.personId));
  }

  function decisionsThisWeek(persona) {
    const since = Date.now() - 7 * 24 * policy.HOUR;
    const decisions = [];
    for (const request of state.requests) {
      for (const event of request.history) {
        const isDecision = event.type === "approved" || event.type === "sent_back" || event.type === "rejected";
        if (isDecision && event.actorId === persona.personId && new Date(event.at).getTime() >= since) decisions.push({ request, event });
      }
    }
    return decisions.sort((a, b) => new Date(b.event.at) - new Date(a.event.at));
  }

  function myRequests(persona) {
    return state.requests.filter((request) => request.requesterId === persona.personId);
  }

  function sumTotals(requests) {
    return requests.reduce((sum, request) => sum + policy.totals(request).total, 0);
  }

  function sortQueue(requests, sort) {
    const sorted = [...requests];
    if (sort === "largest") sorted.sort((a, b) => policy.totals(b).total - policy.totals(a).total);
    else sorted.sort((a, b) => policy.hoursWaiting(b) - policy.hoursWaiting(a));
    return sorted;
  }

  // The queue exactly as it is listed (filters and sort applied).
  function visibleQueue() {
    const { persona, query, sort, overdueOnly } = currentView();
    let requests = queueFor(persona).filter((request) => matchesQuery(request, query));
    if (overdueOnly) requests = requests.filter((request) => policy.urgency(policy.hoursWaiting(request)) === "late");
    return sortQueue(requests, sort);
  }

  function dayKey(iso) {
    const date = new Date(iso);
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  }

  function dayLabel(iso) {
    const today = dayKey(new Date().toISOString());
    const yesterday = dayKey(new Date(Date.now() - 24 * policy.HOUR).toISOString());
    if (dayKey(iso) === today) return "Today";
    if (dayKey(iso) === yesterday) return "Yesterday";
    return policy.formatWeekday(iso);
  }

  // ---- Rendering: numbers that roll ----------------------------------------------------

  // Elements marked data-roll="key" data-to="123" data-format="money|count"
  // roll from the value last shown under the same key.
  const lastShown = new Map();

  function rollNumbers(container) {
    for (const element of container.querySelectorAll("[data-roll]")) {
      const key = element.dataset.roll;
      const to = Number(element.dataset.to);
      const format = element.dataset.format === "money" ? (value) => policy.formatMoney(value) : (value) => Math.round(value).toLocaleString();
      const from = lastShown.get(key);
      lastShown.set(key, to);
      if (from === undefined || from === to) continue;
      element.textContent = format(from);
      element.dataset.value = from;
      rollNumber(element, to, { format });
    }
  }

  const count = (key, value) => html`<b data-roll="${key}" data-to="${value}" data-format="count">${value.toLocaleString()}</b>`;
  const amount = (key, value) => html`<b data-roll="${key}" data-to="${Math.round(value)}" data-format="money">${policy.formatMoney(value)}</b>`;

  // ---- Rendering: keyed patching so lists move instead of blinking ------------------------

  function syncElement(old, fresh) {
    for (const { name } of [...old.attributes]) if (!fresh.hasAttribute(name)) old.removeAttribute(name);
    for (const { name, value } of [...fresh.attributes]) if (old.getAttribute(name) !== value) old.setAttribute(name, value);
    if (old.innerHTML !== fresh.innerHTML) old.innerHTML = fresh.innerHTML;
  }

  // Replaces `container`'s content with `markup`, keeping each existing
  // [data-row] element inside a matching [data-list] so FLIP can move it.
  function patch(container, markup) {
    const template = document.createElement("template");
    template.innerHTML = Approvals.ui.html`${markup}`.value;
    const oldLists = new Map([...container.querySelectorAll("[data-list]")].map((list) => [list.dataset.list, list]));
    for (const freshList of template.content.querySelectorAll("[data-list]")) {
      const oldList = oldLists.get(freshList.dataset.list);
      if (!oldList) continue;
      const oldRows = new Map([...oldList.children].map((row) => [row.dataset.row, row]));
      const rows = [...freshList.children].map((fresh) => {
        const old = oldRows.get(fresh.dataset.row);
        if (!old) return fresh;
        syncElement(old, fresh);
        return old;
      });
      for (const { name, value } of [...freshList.attributes]) oldList.setAttribute(name, value);
      oldList.replaceChildren(...rows);
      freshList.replaceWith(oldList);
    }
    container.replaceChildren(template.content);
  }

  async function patchWithMotion(container, markup, { sameView }) {
    if (!sameView) {
      container.replaceChildren();
      setHtml(container, markup);
      if (!reducedMotion()) container.animate([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], { duration: MOTION.base, easing: MOTION.out });
      return;
    }
    await keepFocus(() => flip(container, () => patch(container, markup), { selector: "[data-row]" }));
  }

  // ---- Rendering: persona, tabs, toolbar ------------------------------------------------------

  function renderPersona() {
    const { persona } = currentView();
    const person = data.person(persona.personId);
    elements.personaName.textContent = `${person.name} · ${persona.label}`;
    elements.personaAvatar.textContent = Approvals.ui.initials(person.name);
    elements.personaAvatar.style.setProperty("--hue", Approvals.ui.hueFor(person.id));
  }

  function tabCount(persona, key) {
    if (key === "queue") return queueFor(persona).length;
    if (key === "sent") return sentBackBy(persona).length;
    if (key === "decided") return decisionsThisWeek(persona).length;
    return myRequests(persona).length;
  }

  function renderTabs() {
    const { persona, tab } = currentView();
    const tabs = tabsFor(persona);
    elements.tabs.hidden = tabs.length < 2 || (!state.loaded && !state.loadError);
    const index = Math.max(0, tabs.findIndex((item) => item.key === tab));
    elements.tabs.style.setProperty("--lg-count", tabs.length);
    elements.tabs.style.setProperty("--lg-index", index);
    setHtml(elements.tabs, tabs.map((item) => html`
      <button type="button" class="lg-segment" role="tab" id="tab-${item.key}" data-action="tab" data-tab="${item.key}" aria-selected="${item.key === tab}" aria-controls="board" tabindex="${item.key === tab ? 0 : -1}">
        <span>${item.label}</span><span class="tab-count">${state.loaded ? count(`tab-${persona.key}-${item.key}`, tabCount(persona, item.key)) : "–"}</span>
      </button>`));
    rollNumbers(elements.tabs);
  }

  function renderToolbar() {
    const { persona, tab, sort, overdueOnly } = currentView();
    if (tab !== "queue" || !state.loaded) { elements.toolbar.replaceChildren(); return; }
    const lateCount = queueFor(persona).filter((request) => policy.urgency(policy.hoursWaiting(request)) === "late").length;
    setHtml(elements.toolbar, html`
      <div class="sort lg-segmented" role="radiogroup" aria-label="Sort" style="--lg-count:2; --lg-index:${sort === "largest" ? 1 : 0}">
        <button type="button" class="lg-segment" role="radio" aria-checked="${sort === "oldest"}" data-action="sort" data-sort="oldest">Oldest first</button>
        <button type="button" class="lg-segment" role="radio" aria-checked="${sort === "largest"}" data-action="sort" data-sort="largest">Largest first</button>
      </div>
      <button type="button" class="toggle lg-control" aria-pressed="${overdueOnly}" data-action="overdue">${icon("alert", 14)}<span>Overdue only</span><span class="toggle-count">${lateCount}</span></button>`);
  }

  // ---- Rendering: hero ---------------------------------------------------------------------------

  function heroWidth() {
    return Math.max(280, elements.heroVisual.getBoundingClientRect().width || 900);
  }

  function heroQueue(persona, person) {
    const queue = queueFor(persona);
    const total = sumTotals(queue);
    const late = queue.filter((request) => policy.urgency(policy.hoursWaiting(request)) === "late");
    const oldest = sortQueue(queue, "oldest")[0];
    let title;
    if (!queue.length) title = html`Nothing needs you right now.`;
    else title = html`${count("hero-queue", queue.length)} ${queue.length === 1 ? "request needs" : "requests need"} you — ${amount("hero-queue-total", total)} in all.`;
    let sub = "New requests appear here as soon as they reach you.";
    if (oldest && late.length) {
      sub = `${late.length === 1 ? "1 is" : `${late.length} are`} past the 3-day limit. The oldest, ${oldest.id} from ${data.person(oldest.requesterId).name}, has waited ${policy.formatWait(policy.hoursWaiting(oldest))}.`;
    } else if (oldest) {
      sub = `None are past the 3-day limit — the oldest has waited ${policy.formatWait(policy.hoursWaiting(oldest))}.`;
    }
    const items = queue.map((request) => ({ id: request.id, hours: policy.hoursWaiting(request), amount: policy.totals(request).total }));
    return { eyebrow: `${persona.label} queue · ${person.name}`, title, sub, visual: views.waitingLine(items, { width: heroWidth(), selectedId: state.openId }) };
  }

  function heroSent(persona) {
    const sent = sentBackBy(persona);
    const longest = [...sent].sort((a, b) => policy.hoursWaiting(b) - policy.hoursWaiting(a))[0];
    const title = sent.length
      ? html`${count("hero-sent", sent.length)} ${sent.length === 1 ? "request is" : "requests are"} back with ${sent.length === 1 ? "its requester" : "their requesters"}.`
      : html`Nothing you sent back is outstanding.`;
    const sub = longest
      ? `The longest has been with them ${policy.formatWait(policy.hoursWaiting(longest))}. Each one comes back to your queue when it's resubmitted.`
      : "When you send a request back, it waits here until the requester resubmits it.";
    const items = sent.map((request) => ({ id: request.id, hours: policy.hoursWaiting(request), amount: policy.totals(request).total }));
    return { eyebrow: "Sent back for changes", title, sub, visual: views.waitingLine(items, { width: heroWidth(), limitLabel: "3 days", unit: "with requester" }) };
  }

  function heroDecided(persona) {
    const decisions = decisionsThisWeek(persona);
    const approved = decisions.filter((item) => item.event.type === "approved");
    const approvedTotal = sumTotals(approved.map((item) => item.request));
    const days = [];
    for (let offset = 6; offset >= 0; offset--) {
      const iso = new Date(Date.now() - offset * 24 * policy.HOUR).toISOString();
      const onDay = decisions.filter((item) => dayKey(item.event.at) === dayKey(iso));
      days.push({
        label: offset === 0 ? "Today" : new Date(iso).toLocaleDateString("en-GB", { weekday: "short" }),
        isToday: offset === 0,
        approved: onDay.filter((item) => item.event.type === "approved").length,
        sentBack: onDay.filter((item) => item.event.type === "sent_back").length,
        rejected: onDay.filter((item) => item.event.type === "rejected").length,
      });
    }
    const title = decisions.length
      ? html`You decided ${count("hero-decided", decisions.length)} ${decisions.length === 1 ? "request" : "requests"} this week — ${amount("hero-decided-total", approvedTotal)} approved.`
      : html`No decisions yet this week.`;
    const sentBack = decisions.filter((item) => item.event.type === "sent_back").length;
    const rejected = decisions.filter((item) => item.event.type === "rejected").length;
    return { eyebrow: "Your last 7 days", title, sub: `${plural(approved.length, "approval")}, ${sentBack} sent back for changes, ${rejected} rejected.`, visual: views.weekChart(days) };
  }

  function heroMine(persona) {
    const mine = myRequests(persona);
    const needChanges = mine.filter((request) => request.status === "changes_requested");
    const moving = mine.filter((request) => request.status === "in_review");
    const late = moving.filter((request) => policy.urgency(policy.hoursWaiting(request)) === "late");
    let title = html`All ${count("hero-mine", moving.length)} of your open requests are moving.`;
    if (needChanges.length === 1) title = html`One request needs changes from you.`;
    else if (needChanges.length > 1) title = html`${count("hero-mine-changes", needChanges.length)} requests need changes from you.`;
    else if (late.length) title = html`${late.length === 1 ? "One" : late.length} of your requests ${late.length === 1 ? "is" : "are"} past the usual 3 days.`;
    else if (!moving.length) title = html`Nothing of yours is waiting.`;
    const sub = `${plural(moving.length, "request")} in review${late.length ? `, ${late.length} past the usual 3 days` : ""}. The more a request costs, the more people sign it — see where yours sit below.`;
    return { eyebrow: `My requests · ${data.person(persona.personId).name}`, title, sub, visual: views.amountLadder(mine, { width: heroWidth() }) };
  }

  let lastHeroView = "";

  function renderHero() {
    const { persona, tab } = currentView();
    const person = data.person(persona.personId);
    if (state.loadError && !state.loaded) {
      elements.heroEyebrow.textContent = `${persona.label} · ${person.name}`;
      elements.heroTitle.textContent = "Your requests didn't load.";
      elements.heroSub.textContent = "Your data is safe — try again below.";
      elements.heroVisual.replaceChildren();
      return;
    }
    if (!state.loaded) return;
    const builders = { queue: heroQueue, sent: heroSent, decided: heroDecided, mine: heroMine };
    const hero = builders[tab](persona, person);
    const viewKey = `${persona.key}:${tab}`;
    elements.heroEyebrow.textContent = hero.eyebrow;
    setHtml(elements.heroTitle, hero.title);
    elements.heroSub.textContent = hero.sub;
    elements.heroVisual.dataset.view = tab;
    patchWithMotion(elements.heroVisual, hero.visual, { sameView: lastHeroView === viewKey });
    lastHeroView = viewKey;
    rollNumbers(elements.heroTitle);
    heroRoving.refresh();
  }

  // ---- Rendering: board ---------------------------------------------------------------------------

  let lastBoardView = "";

  function boardMarkup() {
    const { persona, tab, query } = currentView();
    if (tab === "queue") {
      const all = queueFor(persona);
      if (!all.length) return views.caughtUp(persona, "Requests you sent back are under Sent back.");
      const requests = visibleQueue();
      if (!requests.length && query) return views.noResults(query);
      if (!requests.length) {
        return html`<div class="empty-inline">${icon("check", 22)}<p><b>Nothing is overdue.</b> Every request in your queue is inside the 3-day limit.</p><button type="button" class="button button-quiet" data-action="overdue">Show all ${all.length}</button></div>`;
      }
      return views.queueList(requests, { selectedIds: state.selected, openId: state.openId });
    }
    if (tab === "sent") {
      const requests = sentBackBy(persona).filter((request) => matchesQuery(request, query)).sort((a, b) => policy.hoursWaiting(b) - policy.hoursWaiting(a));
      if (!requests.length) return query ? views.noResults(query) : html`<div class="empty-inline">${icon("back", 22)}<p><b>Nothing is waiting on a requester.</b> Requests you send back appear here with your note.</p></div>`;
      return views.sentBackCards(requests, persona.personId);
    }
    if (tab === "decided") {
      const decisions = decisionsThisWeek(persona).filter((item) => matchesQuery(item.request, query));
      if (!decisions.length) return query ? views.noResults(query) : html`<div class="empty-inline">${icon("inbox", 22)}<p><b>No decisions in the last 7 days.</b></p></div>`;
      const groups = [];
      for (const item of decisions) {
        const key = dayKey(item.event.at);
        let group = groups.find((entry) => entry.key === key);
        if (!group) { group = { key, label: dayLabel(item.event.at), items: [], approvedAmount: 0 }; groups.push(group); }
        group.items.push(item);
        if (item.event.type === "approved") group.approvedAmount += policy.totals(item.request).total;
      }
      return views.decidedTimeline(groups);
    }
    const mine = myRequests(persona).filter((request) => matchesQuery(request, query));
    if (!mine.length) return query ? views.noResults(query) : html`<div class="empty-inline">${icon("inbox", 22)}<p><b>You haven't raised any requests yet.</b></p></div>`;
    return views.myRequests(mine);
  }

  async function renderBoard() {
    const { persona, tab } = currentView();
    const viewKey = `${persona.key}:${tab}`;
    elements.board.classList.remove("is-refreshing");
    if (state.loadError && !state.loaded) {
      setHtml(elements.board, views.loadError(state.loadError));
      lastBoardView = "";
      return;
    }
    if (!state.loaded) return;
    elements.board.dataset.view = tab;
    await patchWithMotion(elements.board, boardMarkup(), { sameView: lastBoardView === viewKey });
    lastBoardView = viewKey;
    boardRoving.refresh();
  }

  function renderLoading() {
    const { persona } = currentView();
    if (state.loaded) {
      elements.board.classList.add("is-refreshing");
      return;
    }
    if (persona.role === "requester") setHtml(elements.board, html`<ul class="journeys" aria-hidden="true">${[1, 2, 3].map(() => html`<li class="journey journey-skeleton"><span class="skeleton-line" style="width:40%"></span><span class="skeleton-line skeleton-title"></span><span class="skeleton-line skeleton-slip"></span></li>`)}</ul>`);
    else setHtml(elements.board, views.skeletonRows());
    document.body.classList.add("is-loading");
    elements.heroEyebrow.textContent = `${persona.label} · ${data.person(persona.personId).name}`;
    if (!isOverlay()) {
      elements.detail.hidden = false;
      setHtml(elements.detail, html`<div class="detail-idle" aria-hidden="true"><span class="skeleton-line" style="width:90px"></span><span class="skeleton-line skeleton-title"></span>${[1, 2, 3].map(() => html`<span class="skeleton-line skeleton-row"></span>`)}</div>`);
    }
    setHtml(elements.heroVisual, html`<div class="skeleton-strip" aria-hidden="true"></div>`);
    elements.board.setAttribute("aria-busy", "true");
  }

  function showSlowNotice() {
    if (state.loaded) return;
    elements.heroSub.setAttribute("role", "status");
    elements.heroSub.textContent = "Still loading — the server is slower than usual right now.";
  }

  function hideSlowNotice() {
    document.body.classList.remove("is-loading");
    elements.heroSub.removeAttribute("role");
    elements.board.removeAttribute("aria-busy");
  }

  function renderPolicyNote() {
    setHtml(elements.policyNote, html`<b>How requests are routed.</b> Under ${policy.formatMoney(policy.FINANCE_FROM)}: the requester's manager.
      ${policy.formatMoney(policy.FINANCE_FROM)} to ${policy.formatMoney(policy.DIRECTOR_FROM - 1)}: manager, then Finance.
      ${policy.formatMoney(policy.DIRECTOR_FROM)} and over: manager, Finance, then a Director. Each step has 3 days.`);
  }

  // ---- Rendering: bulk bar ----------------------------------------------------------------------

  function renderBulk() {
    const { tab } = currentView();
    const selected = [...state.selected].map(byId).filter(Boolean);
    const shouldShow = tab === "queue" && selected.length > 0;
    const wasHidden = elements.bulkbar.hidden;
    if (!shouldShow) {
      if (!wasHidden) {
        const bar = elements.bulkbar;
        const done = () => { bar.hidden = true; };
        if (reducedMotion()) done();
        else bar.animate([{ translate: "0 0", opacity: 1 }, { translate: "0 16px", opacity: 0 }], { duration: MOTION.fast, easing: MOTION.out }).finished.then(done);
      }
      return;
    }
    setHtml(elements.bulkbar, html`
      <p class="bulk-summary"><b>${count("bulk-count", selected.length)} selected</b><span>${amount("bulk-total", sumTotals(selected))}</span></p>
      <button type="button" class="button button-quiet button-on-glass" data-action="clear-selection">Clear</button>
      <button type="button" class="button button-warn-quiet" data-action="bulk-compose" data-kind="sent_back">${icon("back", 16)}<span>Send back</span></button>
      <button type="button" class="button button-danger-quiet" data-action="bulk-compose" data-kind="rejected">${icon("cross", 16)}<span>Reject</span></button>
      <button type="button" class="button button-primary" data-action="bulk-approve">${icon("check", 16)}<span class="button-label">Approve ${selected.length}</span></button>`);
    rollNumbers(elements.bulkbar);
    if (wasHidden) {
      elements.bulkbar.hidden = false;
      if (!reducedMotion()) elements.bulkbar.animate([{ translate: "0 24px", opacity: 0 }, { translate: "0 0", opacity: 1 }], { duration: MOTION.base, easing: MOTION.spring });
    }
  }

  // ---- Rendering: detail -------------------------------------------------------------------------

  let detailTicket = 0;

  function byDepartment(requests) {
    const groups = new Map();
    for (const request of requests) {
      const name = data.department(request.departmentId).name;
      const group = groups.get(name) || { label: name, count: 0, amount: 0 };
      group.count += 1;
      group.amount += policy.totals(request).total;
      groups.set(name, group);
    }
    return [...groups.values()].sort((a, b) => b.amount - a.amount).map((group) => ({ ...group, detail: plural(group.count, "request") }));
  }

  function idleMarkup() {
    const { persona, tab } = currentView();
    if (persona.role === "requester") {
      const needing = myRequests(persona).filter((request) => request.status === "changes_requested");
      return detailUi.idle(persona, needing, "Needs your changes");
    }
    if (tab === "sent") {
      return detailUi.breakdown(persona, "Waiting on these teams", byDepartment(sentBackBy(persona)), "A request comes back to Needs you as soon as its requester resubmits it.");
    }
    if (tab === "decided") {
      const decisions = decisionsThisWeek(persona);
      const rows = [["approved", "Approved", "ok"], ["sent_back", "Sent back", "warn"], ["rejected", "Rejected", "bad"]].map(([type, label, tone]) => {
        const items = decisions.filter((item) => item.event.type === type);
        return { label, tone, detail: plural(items.length, "request"), amount: sumTotals(items.map((item) => item.request)) };
      });
      return detailUi.breakdown(persona, "Your week by decision", rows, "Amounts are request totals including tax.");
    }
    const queue = queueFor(persona);
    if (!queue.length) return detailUi.breakdown(persona, "Nothing waiting", [], "New requests appear in Needs you the moment they reach you.");
    return detailUi.breakdown(persona, "Where your queue comes from", byDepartment(queue), `Open any request to see its line items, files and history.`);
  }

  function isOverlay() {
    return !wideQuery.matches;
  }

  // Draws the open request (or the idle column) and loads its files and history.
  function renderDetail({ transition = "fade" } = {}) {
    const { persona } = currentView();
    const request = state.openId ? byId(state.openId) : null;
    document.body.classList.toggle("has-open-detail", Boolean(request));
    if (!request) {
      if (isOverlay()) {
        elements.detail.hidden = true;
        elements.backdrop.hidden = true;
        return;
      }
      elements.detail.hidden = false;
      elements.backdrop.hidden = true;
      if (state.loaded) setHtml(elements.detail, html`${receiptMarkup()}${idleMarkup()}`);
      else if (state.loadError) setHtml(elements.detail, html`<div class="detail-idle"><p class="muted">Request details appear here once the list has loaded.</p></div>`);
      fitDetail();
      return;
    }
    state.composer = null;
    setHtml(elements.detail, html`${receiptMarkup()}${detailUi.requestDocument(request, persona, { extras: state.extras, extrasMessage: state.extrasMessage })}`);
    fitDetail();
    elements.detail.hidden = false;
    const doc = elements.detail.querySelector(".doc");
    if (!reducedMotion() && transition === "slide") doc.animate([{ opacity: 0, transform: "translateX(28px)" }, { opacity: 1, transform: "none" }], { duration: MOTION.base + 60, easing: MOTION.out });
    else if (!reducedMotion() && transition === "fade") doc.animate([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], { duration: MOTION.base, easing: MOTION.out });
    if (state.extras === "loading") loadExtras(request.id);
  }

  async function loadExtras(id) {
    const ticket = ++detailTicket;
    try {
      const fresh = await store.get(id);
      if (ticket !== detailTicket || state.openId !== id) return;
      state.extras = "ready";
      const index = state.requests.findIndex((request) => request.id === id);
      if (fresh && index >= 0) state.requests[index] = fresh;
      const container = document.getElementById("docExtras");
      if (!container) return;
      const request = byId(id);
      const markup = html`${detailUi.attachments(request)}${detailUi.history(request)}`;
      const placeholder = container.firstElementChild;
      if (!placeholder || reducedMotion()) { setHtml(container, markup); return; }
      const height = container.getBoundingClientRect().height;
      setHtml(container, markup);
      container.animate([{ opacity: 0.2, minHeight: `${height}px` }, { opacity: 1, minHeight: `${height}px` }], { duration: MOTION.base, easing: MOTION.out });
    } catch (error) {
      if (ticket !== detailTicket || state.openId !== id) return;
      state.extras = "error";
      state.extrasMessage = error.message;
      const container = document.getElementById("docExtras");
      if (container) setHtml(container, detailUi.extrasError(error.message));
    }
  }

  function receiptMarkup() {
    if (!state.receipt) return "";
    return html`<div class="receipt lg-pill tone-${state.receipt.tone}" id="receipt" role="status">${icon(state.receipt.icon, 16)}<span>${state.receipt.message}</span>${state.receipt.previous ? html`<button type="button" data-action="undo-receipt">Undo</button>` : ""}</div>`;
  }

  let receiptTimer;
  function showReceipt(receipt) {
    clearTimeout(receiptTimer);
    state.receipt = receipt;
    receiptTimer = setTimeout(clearReceipt, 9000);
  }

  async function clearReceipt() {
    clearTimeout(receiptTimer);
    state.receipt = null;
    const element = document.getElementById("receipt");
    if (element) await collapseOut(element);
  }

  // On wide screens the detail column is sticky; keep its footer (the
  // actions) on screen however far the page is scrolled.
  function fitDetail() {
    if (isOverlay()) { elements.detail.style.removeProperty("--detail-height"); return; }
    const top = Math.max(88, elements.detail.getBoundingClientRect().top);
    elements.detail.style.setProperty("--detail-height", `${Math.max(360, Math.round(innerHeight - top - 16))}px`);
  }

  let fitFrame;
  const scheduleFit = () => { cancelAnimationFrame(fitFrame); fitFrame = requestAnimationFrame(fitDetail); };
  addEventListener("scroll", scheduleFit, { passive: true });
  addEventListener("resize", scheduleFit);

  // The hero is a briefing; once a request is open on a wide screen, give the
  // document the screen. The list scrolls with the page, so the row stays in view.
  function bringWorkAreaUp(behavior = reducedMotion() ? "auto" : "smooth") {
    if (isOverlay()) return;
    const workspaceTop = document.getElementById("workspace").getBoundingClientRect().top;
    if (workspaceTop > 100) scrollTo({ top: workspaceTop + scrollY - 84, behavior });
  }

  // ---- Opening and closing a request ---------------------------------------------------------------

  async function openRequest(id, { trigger = null, push = true, transition } = {}) {
    if (!byId(id)) return;
    const wasOpen = Boolean(state.openId);
    state.openId = id;
    state.openTrigger = trigger || state.openTrigger;
    state.extras = "loading";
    if (push) view.write({ open: id });
    markOpenRow();
    renderDetail({ transition: transition || (wasOpen ? "slide" : "fade") });
    if (isOverlay() && !wasOpen) {
      document.body.classList.add("sheet-open");
      const anchor = trigger || document.querySelector(`[data-key="${CSS.escape(id)}"]`) || elements.board;
      await openFrom(anchor, elements.detail, { backdrop: elements.backdrop });
    }
    if (isOverlay()) document.getElementById("docTitle")?.focus({ preventScroll: true });
    else bringWorkAreaUp();
  }

  async function closeRequest({ push = true } = {}) {
    if (!state.openId) return;
    const id = state.openId;
    const row = document.querySelector(`#board [data-key="${CSS.escape(id)}"]`) || state.openTrigger;
    if (await confirmDiscardComposer() === false) return;
    state.openId = null;
    state.composer = null;
    if (push) view.write({ open: null });
    markOpenRow();
    if (isOverlay() && !elements.detail.hidden) {
      await closeInto(row && row.isConnected ? row : elements.board, elements.detail, { backdrop: elements.backdrop });
      document.body.classList.remove("sheet-open");
    }
    renderDetail();
    if (row && row.isConnected) row.focus({ preventScroll: true });
    renderHeroSelection();
  }

  // Drafts are saved as people type, so closing never loses text; this only
  // reassures them where it went.
  async function confirmDiscardComposer() {
    const field = document.getElementById("reason");
    if (field && hasDraft(field)) toast("Your note is saved — it'll be here when you reopen this request.", { anchor: elements.detail, duration: 3500, className: "toast lg-pill" });
    return true;
  }

  function markOpenRow() {
    for (const row of elements.board.querySelectorAll(".row")) {
      const isOpen = row.dataset.row === state.openId;
      row.classList.toggle("is-open", isOpen);
      const button = row.querySelector(".row-main");
      if (isOpen) button.setAttribute("aria-current", "true"); else button.removeAttribute("aria-current");
    }
    renderHeroSelection();
  }

  function renderHeroSelection() {
    for (const mark of elements.heroVisual.querySelectorAll(".mark")) mark.classList.toggle("is-selected", mark.dataset.id === state.openId);
  }

  // ---- Composer (send back, reject, resubmit) --------------------------------------------------------

  let clearDraft = () => {};

  function openComposer(kind) {
    const request = byId(state.openId);
    if (!request) return;
    const { persona } = currentView();
    const footer = document.getElementById("docFooter");
    state.composer = kind;
    bringWorkAreaUp();
    setHtml(footer, detailUi.composer(kind, request, persona));
    const field = document.getElementById("reason");
    clearDraft = keepDraft(field, `${kind}:${request.id}`);
    const form = footer.querySelector(".composer");
    if (!reducedMotion()) form.animate([{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }], { duration: MOTION.base, easing: MOTION.out });
    field.focus();
    const fileInput = document.getElementById("resubmitFile");
    if (fileInput) {
      fileInput.addEventListener("change", () => {
        const file = fileInput.files[0];
        document.getElementById("filePickLabel").textContent = file ? `${file.name} · ${Math.max(1, Math.round(file.size / 1000))} KB` : "Add a file (optional)";
      });
    }
  }

  function closeComposer() {
    const request = byId(state.openId);
    const footer = document.getElementById("docFooter");
    if (!request || !footer) return;
    state.composer = null;
    setHtml(footer, detailUi.actions(request, currentView().persona));
    const headerTotal = elements.detail.querySelector(".doc-total .money");
    if (headerTotal) headerTotal.textContent = policy.formatMoney(policy.totals(request).total);
    footer.querySelector(`[data-kind]`)?.focus();
  }

  function showFieldError(message) {
    const error = document.getElementById("reasonError");
    const field = document.getElementById("reason");
    error.textContent = message;
    error.hidden = false;
    field.setAttribute("aria-invalid", "true");
    field.focus();
    if (!reducedMotion()) field.animate([{ transform: "translateX(0)" }, { transform: "translateX(-5px)" }, { transform: "translateX(4px)" }, { transform: "translateX(0)" }], { duration: MOTION.base, easing: MOTION.out });
  }

  function setBusy(button, busyLabel) {
    if (!button) return () => {};
    const label = button.querySelector(".button-label");
    const original = label ? label.textContent : "";
    button.style.minWidth = `${button.getBoundingClientRect().width}px`;
    button.classList.add("is-busy");
    button.setAttribute("aria-disabled", "true");
    if (label) label.textContent = busyLabel;
    return () => {
      button.classList.remove("is-busy");
      button.removeAttribute("aria-disabled");
      button.style.minWidth = "";
      if (label) label.textContent = original;
    };
  }

  async function submitComposer(form) {
    const kind = form.dataset.kind;
    const field = document.getElementById("reason");
    const note = field.value.trim();
    const request = byId(state.openId);
    const recipient = data.person(request.requesterId).name.split(" ")[0];
    if (note.length < 8) {
      const messages = {
        sent_back: `Tell ${recipient} what to change — a few words at least.`,
        rejected: `Give ${recipient} a reason — a few words at least.`,
        resubmit: "Say what you changed so the approver can check it quickly.",
      };
      showFieldError(messages[kind]);
      return;
    }
    if (kind === "resubmit") await resubmitOpen(note, form);
    else await decideOpen(kind, note, form.querySelector("[type=submit]"));
  }

  // ---- Decisions ----------------------------------------------------------------------------------

  const DECISION_TOAST = {
    approved: (request, next) => next ? `${request.id} approved — sent to ${policy.ROLE_LABELS[next.role]}` : `${request.id} approved — fully signed`,
    sent_back: (request) => `${request.id} sent back to ${data.person(request.requesterId).name}`,
    rejected: (request) => `${request.id} rejected`,
  };
  const BUSY_WORDS = { approved: "Approving…", sent_back: "Sending back…", rejected: "Rejecting…" };

  function replaceRequest(updated) {
    const index = state.requests.findIndex((request) => request.id === updated.id);
    if (index >= 0) state.requests[index] = updated;
  }

  function playStamp(decision, role) {
    const layer = document.querySelector("#docFooter .stamp-layer");
    if (!layer) return;
    setHtml(layer, detailUi.stamp(decision, role));
    const stamp = layer.firstElementChild;
    if (reducedMotion()) return;
    stamp.animate([
      { opacity: 0, transform: "rotate(-8deg) scale(1.9)" },
      { opacity: 1, transform: "rotate(-8deg) scale(.94)", offset: 0.7 },
      { opacity: 1, transform: "rotate(-8deg) scale(1)" },
    ], { duration: MOTION.slow, easing: MOTION.spring });
    elements.detail.querySelector(".doc")?.animate([{ transform: "none" }, { transform: "translateY(2px)" }, { transform: "none" }], { duration: MOTION.fast, delay: MOTION.slow * 0.7, easing: MOTION.out });
  }

  // Updates the open document in place after a decision (slip, chip, footer).
  function refreshOpenDocument(request, message) {
    const doc = elements.detail.querySelector(".doc");
    if (!doc) return;
    const slip = doc.querySelector(".doc-route .slip");
    if (slip) slip.outerHTML = views.routingSlip(request).value;
    const chip = doc.querySelector(".doc-head-top .chip");
    if (chip) chip.outerHTML = Approvals.ui.statusChip(request).value;
    setHtml(document.getElementById("docFooter"), html`
      <div class="doc-actions doc-actions-done" role="status">
        <p>${message}</p>
        <button type="button" class="button button-quiet" data-action="undo-receipt">Undo</button>
        <div class="stamp-layer" aria-hidden="true"></div>
      </div>`);
  }

  async function removeFromViews(ids) {
    const rows = ids.map((id) => elements.board.querySelector(`[data-row="${CSS.escape(id)}"]`)).filter(Boolean);
    const marks = ids.map((id) => elements.heroVisual.querySelector(`[data-row="mark-${CSS.escape(id)}"]`)).filter(Boolean);
    for (const mark of marks) if (!reducedMotion()) mark.animate([{ transform: "translate(-50%, -50%) scale(1)", opacity: 1 }, { transform: "translate(-50%, -50%) scale(0)", opacity: 0 }], { duration: MOTION.base, easing: MOTION.inOut, fill: "forwards" });
    await Promise.all(rows.map((row) => collapseOut(row)));
    for (const id of ids) state.selected.delete(id);
    renderHero();
    renderTabs();
    renderToolbar();
    await renderBoard();
    renderBulk();
    if (!state.openId) renderDetail();
  }

  async function decideOpen(decision, note, button) {
    if (state.busy) return;
    const request = byId(state.openId);
    const { persona } = currentView();
    const step = policy.currentStep(request);
    if (!request || request.status !== "in_review" || step.approverId !== persona.personId) return;
    const errorBox = document.getElementById("decideError");
    if (errorBox) errorBox.hidden = true;
    const formError = document.getElementById("reasonError");
    if (formError) formError.hidden = true;
    state.busy = true;
    const restore = setBusy(button, BUSY_WORDS[decision]);
    const nextId = nextInQueue(request.id);
    try {
      const updated = policy.decide(request, decision, personPersona(), note);
      const saved = await store.update(request.id, updated, "save decision");
      restore();
      replaceRequest(saved);
      if (decision !== "approved") clearDraft();
      const nextStep = saved.route.find((item) => item.status === "pending");
      const message = DECISION_TOAST[decision](saved, nextStep);
      showReceipt({ message, previous: [request], tone: { approved: "ok", sent_back: "warn", rejected: "bad" }[decision], icon: { approved: "check", sent_back: "back", rejected: "cross" }[decision] });
      // The approver may have opened another request while this one saved:
      // only stamp the document if it is still the one that was decided.
      if (state.openId === request.id) {
        refreshOpenDocument(saved, `${message}.`);
        playStamp(decision, step.role);
        scheduleAdvance(request.id, nextId);
      } else {
        toast(message, { anchor: elements.detail, className: "toast lg-pill", undo: () => undoDecisions([request]) });
      }
      removeFromViews([request.id]);
    } catch (error) {
      restore();
      const where = document.getElementById("reasonError") || document.getElementById("decideError");
      if (where) {
        where.textContent = `${error.message} Your ${decision === "approved" ? "approval wasn't saved" : "note is kept"}.`;
        where.hidden = false;
      }
    } finally {
      state.busy = false;
    }
  }

  function nextInQueue(id) {
    const queue = visibleQueue();
    const index = queue.findIndex((request) => request.id === id);
    if (index < 0) return null;
    const next = queue[index + 1] || queue[index - 1];
    return next ? next.id : null;
  }

  let advanceTimer;
  function scheduleAdvance(decidedId, nextId) {
    clearTimeout(advanceTimer);
    advanceTimer = setTimeout(() => {
      if (state.openId !== decidedId) return;
      if (nextId && byId(nextId) && byId(nextId).status === "in_review") {
        openRequest(nextId, { transition: "slide" });
        const row = document.querySelector(`#board [data-key="${CSS.escape(nextId)}"]`);
        if (row && !isOverlay()) row.focus({ preventScroll: false });
      } else {
        closeRequest();
      }
    }, 800);
  }

  async function undoDecisions(previous) {
    if (state.receipt && state.receipt.previous === previous) clearReceipt();
    try {
      const restored = await Promise.all(previous.map((request) => store.update(request.id, request, "undo decision")));
      restored.forEach(replaceRequest);
      renderHero();
      renderTabs();
      renderToolbar();
      await renderBoard();
      for (const request of restored) {
        const row = elements.board.querySelector(`[data-row="${CSS.escape(request.id)}"]`);
        if (row) settle(row, { color: "var(--highlight)" });
      }
      if (state.openId && previous.some((request) => request.id === state.openId)) renderDetail();
      if (!state.openId) renderDetail();
      const label = previous.length === 1 ? `${previous[0].id} is back in your queue` : `${previous.length} requests are back in your queue`;
      toast(label, { anchor: toastDock, className: "toast lg-pill", duration: 3500 });
    } catch (error) {
      toast(error.message, { anchor: toastDock, tone: "error", className: "toast lg-pill", undo: () => undoDecisions(previous) });
    }
  }

  // Bulk: the same decide() for each request, saved in parallel. Failures stay
  // selected so a second press retries exactly those.
  async function decideMany(decision, note, button) {
    if (state.busy) return { ok: false };
    const { persona } = currentView();
    const requests = [...state.selected].map(byId).filter((request) => request && request.status === "in_review" && policy.currentStep(request).approverId === persona.personId);
    if (!requests.length) return { ok: false };
    state.busy = true;
    const restore = setBusy(button, BUSY_WORDS[decision]);
    const results = await Promise.allSettled(requests.map((request) => store.update(request.id, policy.decide(request, decision, personPersona(), note), "save decisions")));
    restore();
    state.busy = false;
    const succeeded = [];
    const failed = [];
    results.forEach((result, index) => {
      if (result.status === "fulfilled") { replaceRequest(result.value); succeeded.push(requests[index]); } else failed.push(requests[index]);
    });
    const verb = { approved: "Approved", sent_back: "Sent back", rejected: "Rejected" }[decision];
    if (succeeded.length && state.openId && succeeded.some((request) => request.id === state.openId)) {
      state.openId = null;
      view.write({ open: null }, { push: false });
      renderDetail();
    }
    if (succeeded.length) await removeFromViews(succeeded.map((request) => request.id));
    const anchor = toastDock;
    if (failed.length) {
      const names = failed.map((request) => request.id).join(", ");
      const message = succeeded.length
        ? `${verb} ${succeeded.length} of ${requests.length}. ${names} couldn't be saved — still selected, try again.`
        : `Couldn't save ${failed.length === 1 ? names : `${failed.length} requests`}. Nothing changed — try again.`;
      toast(message, { anchor, tone: "error", className: "toast lg-pill", duration: 8000, undo: succeeded.length ? () => undoDecisions(succeeded) : undefined });
      return { ok: false, partial: succeeded.length > 0 };
    }
    const total = policy.formatMoney(sumTotals(succeeded));
    toast(`${verb} ${plural(succeeded.length, "request")} — ${total}`, { anchor, className: "toast lg-pill", duration: 6000, undo: () => undoDecisions(succeeded) });
    return { ok: true };
  }

  // Reads the edited line items and cost centre from the resubmit form.
  function readEdits(form, request) {
    const lineItems = request.lineItems.map((item, index) => ({
      ...item,
      quantity: Number(form.elements[`quantity-${index}`].value),
      unitPrice: Number(form.elements[`price-${index}`].value),
    }));
    return { lineItems, costCentre: form.elements.costCentre.value.trim() };
  }

  function editProblem(edits) {
    if (edits.lineItems.some((item) => !Number.isInteger(item.quantity) || item.quantity < 1)) return "Quantities must be whole numbers of 1 or more.";
    if (edits.lineItems.some((item) => !(item.unitPrice >= 0))) return "Unit prices can't be negative or empty.";
    if (!edits.costCentre) return "Add the cost centre.";
    return "";
  }

  async function resubmitOpen(note, form) {
    if (state.busy) return;
    const request = byId(state.openId);
    const edits = readEdits(form, request);
    const problem = editProblem(edits);
    if (problem) { showFieldError(problem); return; }
    const button = form.querySelector("[type=submit]");
    const fileInput = document.getElementById("resubmitFile");
    const file = fileInput && fileInput.files[0];
    const attachment = file ? { name: file.name, kind: "upload", sizeKb: Math.max(1, Math.round(file.size / 1000)), addedLater: true } : null;
    state.busy = true;
    const restore = setBusy(button, "Resubmitting…");
    try {
      const saved = await store.update(request.id, policy.resubmit(request, personPersona(), note, { attachment, changes: edits, approverFor: data.approverFor }), "resubmit request");
      restore();
      replaceRequest(saved);
      clearDraft();
      const approver = data.person(policy.currentStep(saved).approverId);
      state.extras = "ready";
      renderDetail();
      renderHero();
      await renderBoard();
      const card = elements.board.querySelector(`[data-row="${CSS.escape(saved.id)}"]`);
      if (card) settle(card, { color: "var(--highlight)" });
      showReceipt({ message: `${saved.id} resubmitted — back with ${approver.name}`, previous: null, tone: "ok", icon: "check" });
      const strip = receiptMarkup();
      elements.detail.insertAdjacentHTML("afterbegin", strip.value || "");
    } catch (error) {
      restore();
      const where = document.getElementById("reasonError");
      where.textContent = `${error.message} Your note is kept.`;
      where.hidden = false;
    } finally {
      state.busy = false;
    }
  }

  // ---- Dialogs (bulk reasons, file preview, reset) ---------------------------------------------------

  async function openDialog(trigger, markup) {
    state.dialogTrigger = trigger;
    setHtml(elements.dialog, markup);
    elements.dialog.hidden = false;
    elements.dialog.showModal();
    await openFrom(trigger, elements.dialog);
  }

  async function closeDialog() {
    if (!elements.dialog.open) return;
    const trigger = state.dialogTrigger && state.dialogTrigger.isConnected ? state.dialogTrigger : elements.board;
    await closeInto(trigger, elements.dialog);
    elements.dialog.close();
    elements.dialog.hidden = false;
  }

  function bulkDialogMarkup(kind) {
    const selected = [...state.selected].map(byId).filter(Boolean);
    const isReject = kind === "rejected";
    const reasons = isReject ? data.REJECT_REASONS : data.SEND_BACK_REASONS.slice(0, 4);
    return html`
      <form class="dialog-body composer" data-kind="${kind}" data-bulk="true" novalidate>
        <h2 id="dialogTitle">${isReject ? `Reject ${plural(selected.length, "request")}?` : `Send ${plural(selected.length, "request")} back?`}</h2>
        <p class="muted">${isReject ? "Each requester sees your reason. Rejected requests can't be reopened." : "Each requester sees your note and can resubmit; it comes back to your queue."}</p>
        <ul class="dialog-list">${selected.map((request) => html`<li><span class="mono">${request.id}</span><span>${request.title}</span><span class="money">${policy.formatMoney(policy.totals(request).total)}</span></li>`)}</ul>
        <label class="composer-label" for="reason">${isReject ? "Reason for all of them" : "What needs to change? (the same note goes to everyone)"}</label>
        <div class="quick-reasons" role="group" aria-label="Common reasons">${reasons.map((reason) => html`<button type="button" class="quick-reason" data-action="quick-reason" data-text="${reason}">${reason.split(/[—.]/)[0].trim()}</button>`)}</div>
        <textarea id="reason" rows="3" aria-describedby="reasonError" placeholder="Write one note for every requester…"></textarea>
        <p class="field-error" id="reasonError" hidden></p>
        <div class="composer-actions">
          <button type="button" class="button button-quiet" data-action="close-dialog">Cancel</button>
          <button type="submit" class="button ${isReject ? "button-danger" : "button-warn"}"><span class="button-label">${isReject ? `Reject ${selected.length}` : `Send back ${selected.length}`}</span></button>
        </div>
      </form>`;
  }

  async function openBulkApproveDialog(trigger) {
    const selected = [...state.selected].map(byId).filter(Boolean);
    await openDialog(trigger, html`
      <div class="dialog-body">
        <h2 id="dialogTitle">Approve ${plural(selected.length, "request")} — ${policy.formatMoney(sumTotals(selected))}?</h2>
        <p class="muted">Each one moves to its next signer, or is fully approved if you're the last. You can undo for a few seconds afterwards.</p>
        <ul class="dialog-list">${selected.map((request) => html`<li><span class="mono">${request.id}</span><span>${request.title}</span><span class="money">${policy.formatMoney(policy.totals(request).total)}</span></li>`)}</ul>
        <div class="composer-actions">
          <button type="button" class="button button-quiet" data-action="close-dialog">Cancel</button>
          <button type="button" class="button button-primary" data-action="confirm-bulk-approve"><span class="button-label">Approve ${selected.length}</span></button>
        </div>
      </div>`);
    elements.dialog.querySelector("[data-action=confirm-bulk-approve]").focus();
  }

  async function confirmBulkApprove(button) {
    const result = await decideMany("approved", "", button);
    if (result.ok || result.partial) {
      state.dialogTrigger = elements.board.querySelector(".row-main") || elements.search;
      await closeDialog();
    }
  }

  async function openBulkDialog(trigger, kind) {
    await openDialog(trigger, bulkDialogMarkup(kind));
    const field = document.getElementById("reason");
    clearDraft = keepDraft(field, `bulk-${kind}`);
    field.focus();
  }

  async function submitBulkDialog(form) {
    const field = document.getElementById("reason");
    const note = field.value.trim();
    if (note.length < 8) { showFieldError("Write a short reason — every requester will see it."); return; }
    const result = await decideMany(form.dataset.kind, note, form.querySelector("[type=submit]"));
    if (result.ok || result.partial) {
      if (result.ok) clearDraft();
      state.dialogTrigger = elements.board.querySelector(".row-main") || elements.search;
      await closeDialog();
    }
  }

  async function openPreview(trigger, id, index) {
    const request = byId(id);
    const file = request.attachments[Number(index)];
    await openDialog(trigger, html`
      <div class="dialog-body dialog-preview">
        <div class="dialog-preview-head">
          <h2 id="dialogTitle">${file.name}</h2>
          <button type="button" class="icon-button" data-action="close-dialog" aria-label="Close preview">${icon("close", 16)}</button>
        </div>
        ${detailUi.preview(request, file)}
      </div>`);
    elements.dialog.querySelector("[data-action=close-dialog]").focus();
  }

  async function openResetDialog(trigger) {
    await openDialog(trigger, html`
      <div class="dialog-body">
        <h2 id="dialogTitle">Reset the demo data?</h2>
        <p class="muted">Every decision and resubmission made in this browser is cleared, and the sample company is restored.</p>
        <div class="composer-actions">
          <button type="button" class="button button-quiet" data-action="close-dialog">Keep my changes</button>
          <button type="button" class="button button-danger" data-action="confirm-reset">Reset demo data</button>
        </div>
      </div>`);
    elements.dialog.querySelector("[data-action=close-dialog]").focus();
  }

  // ---- Persona menu ----------------------------------------------------------------------------------

  function personaCount(persona) {
    if (!state.loaded) return "";
    if (persona.role === "requester") {
      const changes = myRequests(persona).filter((request) => request.status === "changes_requested").length;
      return changes ? `${changes} needs changes` : "";
    }
    const waiting = queueFor(persona).length;
    return `${waiting} waiting`;
  }

  async function openPersonaMenu() {
    const current = currentView().persona;
    setHtml(elements.personaMenu, data.PERSONAS.map((persona) => {
      const person = data.person(persona.personId);
      return html`
        <button type="button" role="menuitemradio" class="menu-item" aria-checked="${persona.key === current.key}" data-action="persona" data-persona="${persona.key}" data-key="persona-${persona.key}">
          ${avatar(person.id)}
          <span class="menu-text"><b>${person.name}</b><small>${persona.label} · ${persona.description}</small></span>
          <span class="menu-count">${personaCount(persona)}</span>
        </button>`;
    }));
    elements.personaButton.setAttribute("aria-expanded", "true");
    await openFrom(elements.personaButton, elements.personaMenu);
    (elements.personaMenu.querySelector("[aria-checked=true]") || elements.personaMenu.querySelector(".menu-item")).focus();
  }

  async function closePersonaMenu({ focusButton = true } = {}) {
    if (elements.personaMenu.hidden) return;
    elements.personaButton.setAttribute("aria-expanded", "false");
    await closeInto(elements.personaButton, elements.personaMenu);
    if (!focusButton) elements.personaButton.blur();
  }

  // ---- Loading -----------------------------------------------------------------------------------------

  async function load() {
    state.loadError = "";
    const retry = elements.board.querySelector("[data-action=retry-load]");
    const restore = setBusy(retry, "Trying again…");
    try {
      const rows = await latestLoad(withLoading(() => store.list(), { showSkeleton: renderLoading, slowNotice: showSlowNotice, delay: 250, notice: 2500 }));
      state.requests = rows;
      state.loaded = true;
    } catch (error) {
      if (error.stale) return;
      restore();
      state.loadError = error.message;
    }
    hideSlowNotice();
    renderAll();
  }

  function renderAll() {
    const viewState = currentView();
    elements.search.value = viewState.query;
    state.openId = viewState.openId && state.loaded && byId(viewState.openId) ? viewState.openId : null;
    state.extras = "loading";
    renderPersona();
    renderHero();
    renderTabs();
    renderToolbar();
    renderBoard();
    renderBulk();
    renderDetail({ transition: "none" });
    if (state.openId && !isOverlay()) requestAnimationFrame(() => bringWorkAreaUp("auto"));
    if (state.openId && isOverlay()) {
      document.body.classList.add("sheet-open");
      elements.backdrop.hidden = false;
    } else {
      document.body.classList.remove("sheet-open");
    }
    renderPolicyNote();
  }

  // ---- Events --------------------------------------------------------------------------------------------

  async function switchPersona(key) {
    await closePersonaMenu();
    if (key === currentView().persona.key) return;
    state.selected.clear();
    state.openId = null;
    view.write({ as: key, tab: null, open: null, q: null, overdue: null, sort: null });
    await load();
  }

  function switchTab(key) {
    if (key === currentView().tab) return;
    state.selected.clear();
    view.write({ tab: key, open: null });
    state.openId = null;
    renderHero();
    renderTabs();
    renderToolbar();
    renderBoard();
    renderBulk();
    renderDetail();
    elements.tabs.querySelector(`[data-tab="${key}"]`)?.focus();
  }

  function toggleSelection(id) {
    if (state.selected.has(id)) state.selected.delete(id); else state.selected.add(id);
    const row = elements.board.querySelector(`[data-row="${CSS.escape(id)}"]`);
    if (row) {
      row.classList.toggle("is-checked", state.selected.has(id));
      row.querySelector("input[type=checkbox]").checked = state.selected.has(id);
    }
    const all = elements.board.querySelector("[data-action=select-all]");
    if (all) all.checked = visibleQueue().every((request) => state.selected.has(request.id));
    renderBulk();
  }

  function selectAll(checked) {
    for (const request of visibleQueue()) {
      if (checked) state.selected.add(request.id); else state.selected.delete(request.id);
    }
    for (const row of elements.board.querySelectorAll(".row")) {
      row.classList.toggle("is-checked", state.selected.has(row.dataset.row));
      row.querySelector("input[type=checkbox]").checked = state.selected.has(row.dataset.row);
    }
    renderBulk();
  }

  document.addEventListener("click", async (event) => {
    const target = event.target.closest("[data-action]");
    if (!target) {
      if (!elements.personaMenu.hidden && !event.target.closest(".persona")) closePersonaMenu({ focusButton: false });
      return;
    }
    const action = target.dataset.action;
    if (action === "open") { event.preventDefault(); openRequest(target.dataset.id, { trigger: target }); }
    else if (action === "close-detail") closeRequest();
    else if (action === "select") toggleSelection(target.value);
    else if (action === "select-all") selectAll(target.checked);
    else if (action === "clear-selection") { state.selected.clear(); selectAll(false); }
    else if (action === "tab") switchTab(target.dataset.tab);
    else if (action === "sort") { view.write({ sort: target.dataset.sort === "largest" ? "largest" : null }); renderToolbar(); renderBoard(); elements.toolbar.querySelector(`[data-sort="${target.dataset.sort}"]`)?.focus(); }
    else if (action === "overdue") { view.write({ overdue: currentView().overdueOnly ? null : "1" }); renderToolbar(); renderBoard(); elements.toolbar.querySelector("[data-action=overdue]")?.focus(); }
    else if (action === "clear-search") { elements.search.value = ""; view.write({ q: null }); renderBoard(); elements.search.focus(); }
    else if (action === "retry-load") load();
    else if (action === "retry-detail") { state.extras = "loading"; const container = document.getElementById("docExtras"); if (container) setHtml(container, html`<div class="doc-section"><span class="skeleton-line skeleton-row"></span><span class="skeleton-line skeleton-row"></span></div>`); loadExtras(state.openId); }
    else if (action === "approve") decideOpen("approved", "", target);
    else if (action === "undo-receipt" && state.receipt && state.receipt.previous) { clearTimeout(advanceTimer); undoDecisions(state.receipt.previous); }
    else if (action === "compose") openComposer(target.dataset.kind);
    else if (action === "cancel-composer") closeComposer();
    else if (action === "quick-reason") {
      const field = document.getElementById("reason");
      field.value = target.dataset.text;
      field.dispatchEvent(new Event("input"));
      field.focus();
    }
    else if (action === "bulk-approve") openBulkApproveDialog(target);
    else if (action === "confirm-bulk-approve") confirmBulkApprove(target);
    else if (action === "bulk-compose") openBulkDialog(target, target.dataset.kind);
    else if (action === "close-dialog") closeDialog();
    else if (action === "preview") openPreview(target, target.dataset.id, target.dataset.index);
    else if (action === "persona") switchPersona(target.dataset.persona);
    else if (action === "confirm-reset") {
      store.reset();
      try { for (const key of Object.keys(localStorage)) if (key.startsWith("draft:")) localStorage.removeItem(key); } catch { /* storage blocked */ }
      lastShown.clear();
      await closeDialog();
      state.loaded = false;
      state.selected.clear();
      view.write({ open: null });
      load();
      toast("Demo data reset.", { anchor: elements.resetButton, className: "toast lg-pill", duration: MOTION.base + 600 });
    }
  });

  document.addEventListener("submit", (event) => {
    const form = event.target.closest(".composer");
    if (!form) return;
    event.preventDefault();
    if (form.dataset.bulk) submitBulkDialog(form); else submitComposer(form);
  });

  document.addEventListener("input", (event) => {
    const editForm = event.target.closest(".composer-resubmit");
    if (editForm && event.target.closest(".edit-items")) {
      const request = byId(state.openId);
      const edits = readEdits(editForm, request);
      if (!editProblem(edits)) {
        setHtml(document.getElementById("editTotal"), detailUi.editSummary(request, { ...request, ...edits }));
        const headerTotal = elements.detail.querySelector(".doc-total .money");
        if (headerTotal) headerTotal.textContent = policy.formatMoney(policy.totals({ ...request, ...edits }).total);
      }
    }
    if (event.target.id === "reason") {
      const error = document.getElementById("reasonError");
      if (error && !error.hidden && event.target.value.trim().length >= 8) { error.hidden = true; event.target.removeAttribute("aria-invalid"); }
    }
  });

  let searchTimer;
  elements.search.addEventListener("input", () => {
    view.write({ q: elements.search.value || null }, { push: false });
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => renderBoard(), 120);
  });

  elements.personaButton.addEventListener("click", () => {
    if (elements.personaMenu.hidden) openPersonaMenu(); else closePersonaMenu();
  });
  elements.resetButton.addEventListener("click", () => openResetDialog(elements.resetButton));
  elements.backdrop.addEventListener("click", () => closeRequest());

  elements.dialog.addEventListener("cancel", (event) => { event.preventDefault(); closeDialog(); });
  elements.dialog.addEventListener("click", (event) => { if (event.target === elements.dialog) closeDialog(); });

  const isTyping = (element) => element && (element.matches("input, textarea, select") || element.isContentEditable);

  function moveInBoard(step) {
    const items = [...elements.board.querySelectorAll("[data-action=open][data-key]")];
    if (!items.length) return;
    const current = items.indexOf(document.activeElement);
    let index = current + step;
    if (current < 0) {
      const openIndex = items.findIndex((item) => item.dataset.id === state.openId);
      index = openIndex >= 0 ? openIndex + step : 0;
    }
    const item = items[Math.min(items.length - 1, Math.max(0, index))];
    item.focus();
    if (state.openId && !isOverlay()) openRequest(item.dataset.id, { trigger: item, push: false, transition: "fade" }).then(() => view.write({ open: item.dataset.id }, { push: false }));
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (!elements.personaMenu.hidden) { closePersonaMenu(); return; }
      if (elements.dialog.open) return;
      if (state.composer) { closeComposer(); return; }
      if (state.openId) { closeRequest(); return; }
      if (state.selected.size) { state.selected.clear(); selectAll(false); }
      return;
    }
    if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target) || elements.dialog.open) return;
    const key = event.key.toLowerCase();
    if (key === "/") { event.preventDefault(); elements.search.focus(); elements.search.select(); }
    else if (key === "j") { event.preventDefault(); moveInBoard(1); }
    else if (key === "k") { event.preventDefault(); moveInBoard(-1); }
    else if (key === "x") {
      const row = document.activeElement.closest(".row");
      if (row) { event.preventDefault(); toggleSelection(row.dataset.row); }
    } else if (state.openId && !state.composer && (key === "a" || key === "s" || key === "r")) {
      const selector = { a: "[data-action=approve]", s: "[data-kind=sent_back][data-action=compose]", r: "[data-kind=rejected][data-action=compose]" }[key];
      const button = elements.detail.querySelector(selector);
      if (button) { event.preventDefault(); button.click(); }
    }
  });

  elements.personaMenu.addEventListener("keydown", (event) => {
    const items = [...elements.personaMenu.querySelectorAll(".menu-item")];
    const index = items.indexOf(document.activeElement);
    if (event.key === "ArrowDown") { event.preventDefault(); items[(index + 1) % items.length].focus(); }
    if (event.key === "ArrowUp") { event.preventDefault(); items[(index - 1 + items.length) % items.length].focus(); }
    if (event.key === "Tab") closePersonaMenu({ focusButton: false });
  });

  elements.tabs.addEventListener("keydown", (event) => {
    const tabs = [...elements.tabs.querySelectorAll("[role=tab]")];
    const index = tabs.indexOf(document.activeElement);
    const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    if (index < 0 || !step) return;
    event.preventDefault();
    switchTab(tabs[(index + step + tabs.length) % tabs.length].dataset.tab);
  });

  const boardRoving = roving(elements.board, "[data-action=open][data-key]");
  const heroRoving = roving(elements.heroVisual, ".mark");

  // Layout changes (rotating a tablet, resizing) re-place the waiting line
  // and switch the detail between column and sheet.
  let resizeTimer;
  new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (state.loaded) renderHero(); }, 150);
  }).observe(elements.heroVisual);
  wideQuery.addEventListener("change", () => {
    elements.detail.getAnimations().forEach((animation) => animation.cancel());
    renderAll();
  });

  view.onChange(() => {
    if (!state.loaded) { load(); return; }
    const persona = currentView().persona;
    if (persona.key !== lastBoardView.split(":")[0]) { load(); return; }
    renderAll();
  });

  pressable(document);
  renderPersona();
  renderDetail();
  load();
})();
