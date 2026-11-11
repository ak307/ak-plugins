// Render functions for the hero visuals and each view's main content.
// They only turn data into markup; app.js owns state and events.
window.Approvals = window.Approvals || {};

Approvals.views = (() => {
  const policy = Approvals.policy;
  const data = Approvals.data;
  const { html, icon, avatar, waitChip, statusChip, routeTrack, money, plural, stepState } = Approvals.ui;

  const WEEK_HOURS = 168;

  // ---- Hero visual: the waiting line -------------------------------------------
  // Every waiting request as a mark: across = how long it has waited, size =
  // amount. A beeswarm keeps marks from overlapping without hiding any.

  function placeMarks(items, width) {
    const pad = 20;
    const maxAmount = Math.max(...items.map((item) => item.amount), 1);
    const placed = [];
    const sorted = [...items].sort((a, b) => b.amount - a.amount);
    for (const item of sorted) {
      // Smaller marks on narrow screens, so a big queue still fits in a short band.
      const scale = width < 560 ? 14 : 22;
      const size = Math.round(10 + scale * Math.sqrt(item.amount / maxAmount));
      const x = pad + (Math.min(item.hours, WEEK_HOURS) / WEEK_HOURS) * (width - pad * 2);
      let y = 0;
      for (let attempt = 0; attempt < 60; attempt++) {
        const offset = Math.ceil(attempt / 2) * 7 * (attempt % 2 ? -1 : 1);
        const collides = placed.some((other) => Math.hypot(other.x - x, other.y - offset) < (other.size + size) / 2 + 2);
        if (!collides) { y = offset; break; }
      }
      placed.push({ ...item, x, y, size });
    }
    return placed;
  }

  function waitingLine(items, { width, selectedId, limitLabel = "3-day limit", unit = "waiting" }) {
    if (!items.length) return html``;
    const marks = placeMarks(items, width);
    const reach = Math.max(...marks.map((mark) => Math.abs(mark.y) + mark.size / 2), 20);
    const height = Math.round(reach * 2 + 12);
    const pad = 20;
    const xFor = (hours) => pad + (hours / WEEK_HOURS) * (width - pad * 2);
    const narrow = width < 560;
    const ticks = narrow ? [0, 72, 168] : [0, 24, 48, 72, 96, 120, 144, 168];
    const tickLabel = (hours) => {
      if (hours === 0) return "Now";
      if (hours === 168) return "7+ days";
      if (hours === 72) return limitLabel;
      return `${hours / 24} days`.replace("1 days", "1 day");
    };
    return html`
      <div class="waiting-line" style="height:${height + 30}px">
        <div class="waiting-late-zone" style="left:${xFor(72)}px; height:${height}px" aria-hidden="true"></div>
        <div class="waiting-axis" style="top:${height / 2}px" aria-hidden="true"></div>
        <div class="waiting-limit" style="left:${xFor(72)}px; height:${height}px" aria-hidden="true"></div>
        <div class="waiting-marks" role="group" data-list="marks" aria-label="Requests by time ${unit}">
          ${marks.map((mark) => {
            const level = policy.urgency(mark.hours);
            const name = `${mark.id}, ${policy.formatMoney(mark.amount)}, ${unit} ${policy.formatWait(mark.hours)}, ${policy.URGENCY_LABELS[level].toLowerCase()}`;
            let tipSide = "";
            if (mark.x < 110) tipSide = " tip-start";
            else if (mark.x > width - 110) tipSide = " tip-end";
            return html`<button type="button" class="mark mark-${level}${tipSide}${mark.id === selectedId ? " is-selected" : ""}" data-action="open" data-id="${mark.id}" data-key="mark-${mark.id}" data-row="mark-${mark.id}"
              style="left:${mark.x}px; top:${height / 2 + mark.y}px; --size:${mark.size}px" aria-label="${name}" data-tip="${mark.id} · ${policy.formatMoney(mark.amount)} · ${policy.formatWait(mark.hours)}"></button>`;
          })}
        </div>
        <div class="waiting-ticks" style="top:${height + 8}px" aria-hidden="true">
          ${ticks.map((hours) => html`<span class="tick${hours === 72 ? " tick-limit" : ""}" style="left:${xFor(hours)}px">${tickLabel(hours)}</span>`)}
        </div>
      </div>`;
  }

  // ---- Hero visual: the week of decisions ----------------------------------------

  function weekChart(days) {
    const most = Math.max(...days.map((day) => day.approved + day.sentBack + day.rejected), 1);
    return html`
      <div class="week" role="img" aria-label="${days.map((day) => `${day.label}: ${day.approved} approved, ${day.sentBack} sent back, ${day.rejected} rejected`).join("; ")}">
        ${days.map((day) => {
          const count = day.approved + day.sentBack + day.rejected;
          return html`
            <div class="week-day${day.isToday ? " is-today" : ""}">
              <div class="week-bar" style="--h:${(count / most) * 100}%">
                <span class="week-seg week-ok" style="flex:${day.approved}"></span>
                <span class="week-seg week-warn" style="flex:${day.sentBack}"></span>
                <span class="week-seg week-bad" style="flex:${day.rejected}"></span>
              </div>
              <span class="week-count">${count || "–"}</span>
              <span class="week-label">${day.label}</span>
            </div>`;
        })}
        <div class="week-legend" aria-hidden="true">
          <span><i class="legend-dot week-ok"></i>Approved</span><span><i class="legend-dot week-warn"></i>Sent back</span><span><i class="legend-dot week-bad"></i>Rejected</span>
        </div>
      </div>`;
  }

  // ---- Hero visual: the amount ladder (why a request needs more signatures) ---

  function amountLadder(requests, { width }) {
    const low = Math.log10(500);
    const high = Math.log10(200000);
    const at = (amount) => Math.min(100, Math.max(0, ((Math.log10(Math.max(amount, 500)) - low) / (high - low)) * 100));
    const finance = at(policy.FINANCE_FROM);
    const director = at(policy.DIRECTOR_FROM);
    // Stack labels into lanes so no two overlap at this width.
    const labelWidth = (124 / width) * 100;
    const laneEnds = [];
    const placed = [...requests].sort((a, b) => policy.totals(a).total - policy.totals(b).total).map((request) => {
      const left = Math.min(100 - labelWidth / 2, Math.max(labelWidth / 2, at(policy.totals(request).total)));
      let lane = laneEnds.findIndex((end) => end < left - labelWidth);
      if (lane < 0) { lane = laneEnds.length; laneEnds.push(left); } else laneEnds[lane] = left;
      return { request, left, lane };
    });
    return html`
      <div class="ladder" style="--lanes:${Math.max(1, laneEnds.length)}">
        <div class="ladder-bands" aria-hidden="true">
          <span class="ladder-band" style="left:0; width:${finance}%"><b>Manager</b></span>
          <span class="ladder-band" style="left:${finance}%; width:${director - finance}%"><b>Manager → Finance</b></span>
          <span class="ladder-band" style="left:${director}%; width:${100 - director}%"><b>+ Director</b></span>
          <span class="ladder-threshold" style="left:${finance}%">${policy.formatMoney(policy.FINANCE_FROM)}</span>
          <span class="ladder-threshold" style="left:${director}%">${policy.formatMoney(policy.DIRECTOR_FROM)}</span>
        </div>
        <ul class="ladder-marks" aria-label="Your requests by amount">
          ${placed.map(({ request, left, lane }) => {
            const total = policy.totals(request).total;
            return html`<li><button type="button" class="ladder-mark ladder-${request.status}" data-action="open" data-id="${request.id}" style="left:${left}%; --lane:${lane}"
              aria-label="${request.id}, ${policy.formatMoney(total)}, needs ${request.route.length} ${request.route.length === 1 ? "approval" : "approvals"}"><span>${request.id}</span></button></li>`;
          })}
        </ul>
        <p class="ladder-legend" aria-hidden="true"><span><i class="legend-dot ladder-dot-changes"></i>Needs your changes</span><span><i class="legend-dot ladder-dot-review"></i>In review</span><span><i class="legend-dot ladder-dot-approved"></i>Approved</span><span><i class="legend-dot ladder-dot-rejected"></i>Rejected</span></p>
      </div>`;
  }

  // ---- Queue ("Needs you") --------------------------------------------------------

  function queueRow(request, { selected, open, maxAmount }) {
    const total = policy.totals(request).total;
    const hours = policy.hoursWaiting(request);
    const requester = data.person(request.requesterId);
    return html`
      <li class="row${selected ? " is-checked" : ""}${open ? " is-open" : ""}" data-row="${request.id}">
        <span class="row-check">
          <input type="checkbox" tabindex="-1" data-action="select" value="${request.id}" ${selected ? "checked" : ""} aria-label="Select ${request.id}">
        </span>
        <button type="button" class="row-main" data-action="open" data-id="${request.id}" data-key="${request.id}" ${open ? html`aria-current="true"` : ""}>
          <span class="row-who">${avatar(request.requesterId)}<span><b>${requester.name}</b><small>${data.department(request.departmentId).name}</small></span></span>
          <span class="row-what"><span class="row-title">${request.title}</span><small><span class="row-requester">${requester.name} · </span><span class="mono">${request.id}</span> · ${request.vendor}${request.attachments.length ? html` · ${icon("clip", 12)} ${request.attachments.length}` : ""}</small></span>
          <span class="row-route">${routeTrack(request)}</span>
          <span class="row-amount">${money(total)}<span class="amount-bar" style="--w:${Math.max(4, (total / maxAmount) * 100)}%"></span></span>
          <span class="row-wait">${waitChip(hours)}</span>
        </button>
      </li>`;
  }

  function queueList(requests, { selectedIds, openId }) {
    const maxAmount = Math.max(...requests.map((request) => policy.totals(request).total), 1);
    const allSelected = requests.length > 0 && requests.every((request) => selectedIds.has(request.id));
    return html`
      <div class="list-head">
        <label class="select-all"><input type="checkbox" data-action="select-all" ${allSelected ? "checked" : ""}> <span>Select all ${requests.length}</span></label>
        <span class="list-head-cols" aria-hidden="true"><span>Request</span><span>Route</span><span>Amount</span><span>Waiting</span></span>
      </div>
      <ul class="rows" id="rows" data-list="queue" aria-label="Requests waiting for you">
        ${requests.map((request) => queueRow(request, { selected: selectedIds.has(request.id), open: request.id === openId, maxAmount }))}
      </ul>`;
  }

  function skeletonRows(count = 7) {
    return html`
      <div class="list-head"><span class="skeleton-line" style="width:120px"></span></div>
      <ul class="rows" aria-hidden="true">
        ${Array.from({ length: count }, (_, index) => html`
          <li class="row row-skeleton">
            <span class="row-check"><span class="skeleton-box"></span></span>
            <span class="row-main">
              <span class="row-who"><span class="avatar avatar-md skeleton-avatar"></span><span><span class="skeleton-line" style="width:${90 + (index % 3) * 18}px"></span><span class="skeleton-line skeleton-small" style="width:64px"></span></span></span>
              <span class="row-what"><span class="skeleton-line" style="width:${60 + (index * 7) % 30}%"></span><span class="skeleton-line skeleton-small" style="width:40%"></span></span>
              <span class="row-route"><span class="skeleton-line" style="width:70px"></span></span>
              <span class="row-amount"><span class="skeleton-line" style="width:72px"></span></span>
              <span class="row-wait"><span class="skeleton-line" style="width:58px"></span></span>
            </span>
          </li>`)}
      </ul>`;
  }

  function caughtUp(persona, nextHint) {
    return html`
      <div class="caught-up">
        <div class="stack-art" aria-hidden="true">
          <span class="stack-sheet"></span><span class="stack-sheet"></span><span class="stack-sheet"></span>
          <span class="stack-stamp">ALL<br>CLEAR</span>
        </div>
        <h2>You're all caught up</h2>
        <p>Nothing is waiting for your signature as ${persona.label.toLowerCase()}. ${nextHint}</p>
      </div>`;
  }

  function noResults(query) {
    return html`
      <div class="empty-inline">
        ${icon("inbox", 22)}
        <p><b>No requests match “${query}”.</b> Search looks at IDs, titles, vendors and requesters.</p>
        <button type="button" class="button button-quiet" data-action="clear-search">Clear search</button>
      </div>`;
  }

  function loadError(message) {
    return html`
      <div class="load-error" role="alert">
        ${icon("alert", 22)}
        <div><b>We couldn't load these requests.</b><p>${message}</p></div>
        <button type="button" class="button button-secondary" data-action="retry-load">Try again</button>
      </div>`;
  }

  // ---- Sent back ------------------------------------------------------------------

  function sentBackCards(requests, personaId) {
    return html`
      <ul class="cards" data-list="sent" aria-label="Requests you sent back">
        ${requests.map((request) => {
          const step = request.route.find((item) => item.status === "sent_back" && item.approverId === personaId);
          const requester = data.person(request.requesterId);
          return html`
            <li class="card" data-row="${request.id}">
              <button type="button" class="card-main" data-action="open" data-id="${request.id}" data-key="${request.id}">
                <span class="card-top"><span class="mono">${request.id}</span>${waitChip(policy.hoursWaiting(request), { prefix: "With them " })}</span>
                <span class="card-title">${request.title}</span>
                <span class="card-quote">${icon("back", 14)}<q>${step ? step.note : ""}</q></span>
                <span class="card-foot">${avatar(request.requesterId, "sm")}<span>${requester.name}</span><span class="card-amount">${money(policy.totals(request).total)}</span></span>
              </button>
            </li>`;
        })}
      </ul>`;
  }

  // ---- Decided ----------------------------------------------------------------------

  const DECISION_WORDS = { approved: "Approved", sent_back: "Sent back", rejected: "Rejected" };
  const DECISION_TONE = { approved: "ok", sent_back: "warn", rejected: "bad" };

  function decidedTimeline(groups) {
    return html`
      <ol class="timeline" aria-label="Your decisions this week">
        ${groups.map((group) => html`
          <li class="timeline-day">
            <h3 class="timeline-head"><span>${group.label}</span><span class="timeline-sum">${money(group.approvedAmount)} approved</span></h3>
            <ol class="timeline-items" data-list="day-${group.key}">
              ${group.items.map(({ request, event }) => html`
                <li class="timeline-item tone-${DECISION_TONE[event.type]}" data-row="${request.id}">
                  <button type="button" class="timeline-main" data-action="open" data-id="${request.id}" data-key="${request.id}">
                    <span class="timeline-time mono">${new Date(event.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
                    <span class="timeline-stamp">${DECISION_WORDS[event.type]}</span>
                    <span class="timeline-what"><b>${request.title}</b><small><span class="mono">${request.id}</span> · ${data.person(request.requesterId).name}${event.note ? html` · “${event.note}”` : ""}</small></span>
                    <span class="timeline-amount">${money(policy.totals(request).total)}</span>
                  </button>
                </li>`)}
            </ol>
          </li>`)}
      </ol>`;
  }

  // ---- My requests (requester) --------------------------------------------------------

  // The plain-words answer to "where is it and why?".
  function whereIsIt(request) {
    const step = policy.currentStep(request);
    const hours = policy.hoursWaiting(request);
    if (request.status === "changes_requested") {
      const approver = data.person(step.approverId);
      return { tone: "warn", headline: `${approver.name} sent it back ${policy.formatAgo(request.arrivedAt)}`, detail: step.note, action: "Make the changes" };
    }
    if (request.status === "in_review") {
      const approver = data.person(step.approverId);
      const role = policy.ROLE_LABELS[step.role];
      const level = policy.urgency(hours);
      let detail = `${role} usually decides within 3 days.`;
      if (level === "late") detail = "This is past the usual 3 days.";
      if (step.role === "finance") detail = `Finance signs because it's over ${policy.formatMoney(policy.FINANCE_FROM)}. ${detail}`;
      if (step.role === "director") detail = `A Director signs because it's over ${policy.formatMoney(policy.DIRECTOR_FROM)}. ${detail}`;
      return { tone: level, headline: `Waiting for ${approver.name} (${role}) — ${policy.formatWait(hours)}`, detail };
    }
    if (request.status === "approved") {
      return { tone: "ok", headline: `Fully approved ${policy.formatAgo(request.closedAt || request.arrivedAt)}`, detail: "Procurement will raise the purchase order." };
    }
    const refused = request.route.find((item) => item.status === "rejected");
    return { tone: "bad", headline: `Rejected by ${data.person(refused.approverId).name}`, detail: refused.note };
  }

  function routingSlip(request, { large = false } = {}) {
    return html`
      <ol class="slip${large ? " slip-large" : ""}" aria-label="Approval route">
        ${request.route.map((step) => {
          const state = stepState(step);
          const approver = data.person(step.approverId);
          let when = "To come";
          if (state === "current") when = `Waiting ${policy.formatWait(policy.hoursWaiting(request))}`;
          else if (step.decidedAt) when = policy.formatDayTime(step.decidedAt);
          return html`
            <li class="slip-step slip-${state}${state === "current" ? ` urgency-${policy.urgency(policy.hoursWaiting(request))}` : ""}">
              <span class="slip-role">${policy.ROLE_LABELS[step.role]}</span>
              <span class="slip-sign">${state === "signed" ? icon("check", 14) : state === "returned" ? icon("back", 14) : state === "refused" ? icon("cross", 14) : ""}<span>${approver.name}</span></span>
              <span class="slip-when">${when}<span class="sr-only"> — ${Approvals.ui.STEP_WORDS[state]}</span></span>
            </li>`;
        })}
      </ol>`;
  }

  function journeyCard(request) {
    const answer = whereIsIt(request);
    return html`
      <li class="journey tone-${answer.tone}" data-row="${request.id}">
        <div class="journey-head">
          <span class="mono">${request.id}</span>${statusChip(request)}
          <span class="journey-amount">${money(policy.totals(request).total)}</span>
        </div>
        <h3 class="journey-title">${request.title}</h3>
        ${routingSlip(request, { large: true })}
        <div class="journey-answer">
          <p><b>${answer.headline}</b>${answer.detail ? html`<span>${request.status === "changes_requested" ? html`“${answer.detail}”` : answer.detail}</span>` : ""}</p>
          <button type="button" class="button ${answer.action ? "button-primary" : "button-quiet"}" data-action="open" data-id="${request.id}" data-key="${request.id}">${answer.action || "View request"}${icon("arrow", 14)}</button>
        </div>
      </li>`;
  }

  function myRequests(requests) {
    const order = { changes_requested: 0, in_review: 1, approved: 2, rejected: 3 };
    const active = requests.filter((request) => request.status === "changes_requested" || request.status === "in_review")
      .sort((a, b) => order[a.status] - order[b.status] || policy.hoursWaiting(b) - policy.hoursWaiting(a));
    const finished = requests.filter((request) => request.status === "approved" || request.status === "rejected");
    return html`
      <ul class="journeys" data-list="journeys" aria-label="Requests in progress">${active.map(journeyCard)}</ul>
      ${finished.length ? html`
        <h2 class="section-title">Finished</h2>
        <ul class="finished" data-list="finished">
          ${finished.map((request) => html`
            <li data-row="${request.id}"><button type="button" class="finished-row" data-action="open" data-id="${request.id}" data-key="${request.id}">
              <span class="mono">${request.id}</span><span class="finished-title">${request.title}</span>${statusChip(request)}<span class="finished-amount">${money(policy.totals(request).total)}</span>
            </button></li>`)}
        </ul>` : ""}`;
  }

  return { waitingLine, weekChart, amountLadder, queueList, skeletonRows, caughtUp, noResults, loadError, sentBackCards, decidedTimeline, myRequests, routingSlip, whereIsIt };
})();
