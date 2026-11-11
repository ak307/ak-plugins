// Approval rules and formatting shared by every screen.
// Business rules live here only, so the queue, the detail panel and the
// requester view can never disagree about a route or a deadline.
window.Approvals = window.Approvals || {};

Approvals.policy = (() => {
  const CURRENCY = "USD";
  const FINANCE_FROM = 5000;
  const DIRECTOR_FROM = 50000;
  // A step should be decided within this many hours (3 calendar days).
  const DECISION_LIMIT_HOURS = 72;
  const DUE_SOON_HOURS = 48;
  const HOUR = 3600 * 1000;

  const ROLE_LABELS = { manager: "Manager", finance: "Finance", director: "Director" };

  function routeFor(total) {
    const roles = ["manager"];
    if (total >= FINANCE_FROM) roles.push("finance");
    if (total >= DIRECTOR_FROM) roles.push("director");
    return roles;
  }

  function routeReason(total) {
    const amount = formatMoney(total);
    if (total >= DIRECTOR_FROM) {
      return `${amount} is over ${formatMoney(DIRECTOR_FROM)}, so Finance and a Director sign after the manager.`;
    }
    if (total >= FINANCE_FROM) {
      return `${amount} is over ${formatMoney(FINANCE_FROM)}, so Finance signs after the manager.`;
    }
    return `${amount} is under ${formatMoney(FINANCE_FROM)}, so the manager's approval is enough.`;
  }

  function totals(request) {
    let subtotal = 0;
    for (const item of request.lineItems) subtotal += item.quantity * item.unitPrice;
    const tax = Math.round(subtotal * request.taxRate * 100) / 100;
    return { subtotal, tax, total: subtotal + tax };
  }

  function currentStep(request) {
    return request.route.find((step) => step.status === "pending" || step.status === "sent_back") || null;
  }

  function hoursWaiting(request, now = Date.now()) {
    return Math.max(0, (now - new Date(request.arrivedAt).getTime()) / HOUR);
  }

  // "ok" | "soon" | "late" — the same thresholds for chips, marks and routes.
  function urgency(hours) {
    if (hours >= DECISION_LIMIT_HOURS) return "late";
    if (hours >= DUE_SOON_HOURS) return "soon";
    return "ok";
  }

  const URGENCY_LABELS = { ok: "On track", soon: "Due soon", late: "Overdue" };

  // ---- Decisions: one pure function for single and bulk actions ----------

  // decision: "approved" | "sent_back" | "rejected". Returns a new request.
  function decide(request, decision, actor, note, now = new Date()) {
    const at = now.toISOString();
    const route = request.route.map((step) => ({ ...step }));
    const index = route.findIndex((step) => step.status === "pending");
    const step = route[index];
    step.status = decision;
    step.decidedAt = at;
    step.note = note || "";

    const history = [...request.history, { at, actorId: actor.id, type: decision, role: step.role, note: note || "" }];
    const next = { ...request, route, history };

    if (decision === "approved" && index < route.length - 1) {
      route[index + 1].status = "pending";
      next.status = "in_review";
      next.arrivedAt = at;
    } else if (decision === "approved") {
      next.status = "approved";
      next.closedAt = at;
    } else if (decision === "sent_back") {
      next.status = "changes_requested";
      next.arrivedAt = at;
    } else {
      next.status = "rejected";
      next.closedAt = at;
    }
    return next;
  }

  // The requester answers a send-back, optionally with edited line items and
  // cost centre. It returns to the approver who sent it back. If the new total
  // crosses a threshold, steps are added or dropped; earlier approvals stand.
  function resubmit(request, actor, note, { attachment = null, changes = {}, approverFor }, now = new Date()) {
    const at = now.toISOString();
    const edited = { ...request, ...changes };
    const oldTotal = totals(request).total;
    const newTotal = totals(edited).total;
    const roles = routeFor(newTotal);
    const route = roles.map((role) => {
      const step = request.route.find((item) => item.role === role);
      if (!step) return { role, approverId: approverFor(role, request.departmentId), status: "waiting", decidedAt: null, note: "" };
      if (step.status !== "sent_back") return { ...step };
      return { ...step, status: "pending", decidedAt: null, note: "", sentBackNote: step.note };
    });
    let fullNote = note;
    if (Math.abs(newTotal - oldTotal) >= 0.01) fullNote = `${note} (Total changed from ${formatMoney(oldTotal)} to ${formatMoney(newTotal)}.)`;
    const attachments = attachment ? [...request.attachments, attachment] : request.attachments;
    const history = [...request.history, { at, actorId: actor.id, type: "resubmitted", note: fullNote }];
    return { ...edited, route, attachments, history, status: "in_review", arrivedAt: at };
  }

  // ---- Formatting ---------------------------------------------------------

  const wholeMoney = new Intl.NumberFormat("en-US", { style: "currency", currency: CURRENCY, maximumFractionDigits: 0 });
  const exactMoney = new Intl.NumberFormat("en-US", { style: "currency", currency: CURRENCY, minimumFractionDigits: 2 });
  const shortDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
  const dayAndTime = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const weekday = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" });

  function formatMoney(amount, { exact = false } = {}) {
    if (exact) return exactMoney.format(amount);
    return wholeMoney.format(Math.round(amount));
  }

  // Short waiting time: "40 min", "5 h", "2 d 7 h", "9 days". Calendar time,
  // precise within the first week so it matches the waiting line exactly.
  function formatWait(hours) {
    if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
    if (hours < 24) return `${Math.round(hours)} h`;
    const days = Math.floor(hours / 24);
    const rest = Math.round(hours - days * 24);
    if (days >= 7) return `${days} days`;
    if (rest === 0 || rest === 24) return days === 1 ? "1 day" : `${days} days`;
    return `${days} d ${rest} h`;
  }

  function formatAgo(iso, now = Date.now()) {
    const hours = (now - new Date(iso).getTime()) / HOUR;
    if (hours < 0.05) return "just now";
    return `${formatWait(hours)} ago`;
  }

  return {
    CURRENCY, FINANCE_FROM, DIRECTOR_FROM, DECISION_LIMIT_HOURS, DUE_SOON_HOURS, HOUR,
    ROLE_LABELS, URGENCY_LABELS,
    routeFor, routeReason, totals, currentStep, hoursWaiting, urgency, decide, resubmit,
    formatMoney, formatWait, formatAgo,
    formatDate: (iso) => shortDate.format(new Date(iso)),
    formatDayTime: (iso) => dayAndTime.format(new Date(iso)),
    formatWeekday: (iso) => weekday.format(new Date(iso)),
  };
})();
