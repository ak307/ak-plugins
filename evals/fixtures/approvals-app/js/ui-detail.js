// The request detail: the request drawn as a document with its routing
// slip, line items, files and history, plus the decision composer and the
// file preview. Markup only — app.js wires the actions.
window.Approvals = window.Approvals || {};

Approvals.detail = (() => {
  const policy = Approvals.policy;
  const data = Approvals.data;
  const { html, icon, avatar, statusChip, money, plural } = Approvals.ui;
  const { routingSlip, whereIsIt } = Approvals.views;

  const HISTORY_WORDS = { submitted: "Submitted", approved: "Approved", sent_back: "Sent back", rejected: "Rejected", resubmitted: "Resubmitted with changes" };
  const HISTORY_TONE = { submitted: "info", approved: "ok", sent_back: "warn", rejected: "bad", resubmitted: "info" };

  // A breakdown of the current view (by department or by decision), so the
  // idle column adds something the list doesn't already show.
  function breakdown(viewer, title, rows, note) {
    const most = Math.max(...rows.map((row) => row.amount), 1);
    const persona = viewer;
    return html`
      <div class="detail-idle" tabindex="0" role="region" aria-label="At a glance">
        <p class="eyebrow">At a glance</p>
        <h2 class="detail-idle-title">${title}</h2>
        ${rows.length ? html`
          <ul class="breakdown">
            ${rows.map((row) => html`
              <li class="breakdown-row tone-${row.tone || "info"}">
                <span class="breakdown-label"><b>${row.label}</b><small>${row.detail}</small></span>
                <span class="breakdown-amount money">${policy.formatMoney(row.amount)}</span>
                <span class="breakdown-bar" style="--w:${Math.max(3, (row.amount / most) * 100)}%" aria-hidden="true"></span>
              </li>`)}
          </ul>` : html`<p class="muted">Nothing to break down yet.</p>`}
        ${note ? html`<p class="muted">${note}</p>` : ""}
        ${shortcuts(persona)}
      </div>`;
  }
  function shortcuts(viewer) {
    if (!viewer || viewer.role === "requester") return "";
    return html`
      <div class="shortcuts">
        <h3>${icon("keyboard", 16)} Faster with the keyboard</h3>
        <dl>
          <div><dt><kbd>J</kbd><kbd>K</kbd></dt><dd>Next / previous</dd></div>
          <div><dt><kbd>Enter</kbd></dt><dd>Open</dd></div>
          <div><dt><kbd>X</kbd></dt><dd>Select for bulk</dd></div>
          <div><dt><kbd>A</kbd></dt><dd>Approve</dd></div>
          <div><dt><kbd>S</kbd></dt><dd>Send back</dd></div>
          <div><dt><kbd>R</kbd></dt><dd>Reject</dd></div>
          <div><dt><kbd>Esc</kbd></dt><dd>Close</dd></div>
        </dl>
      </div>`;
  }

  // Shown when nothing is open on wide screens, so the column is never blank.
  function idle(persona, attention, title) {
    return html`
      <div class="detail-idle" tabindex="0" role="region" aria-label="Start here">
        <p class="eyebrow">Start here</p>
        ${attention.length ? html`
          <h2 class="detail-idle-title">${title}</h2>
          <ul class="attention">
            ${attention.map((request) => html`
              <li><button type="button" class="attention-item" data-action="open" data-id="${request.id}">
                ${avatar(request.requesterId, "sm")}
                <span><b>${request.title}</b><small><span class="mono">${request.id}</span> · ${policy.formatMoney(policy.totals(request).total)}</small></span>
                ${Approvals.ui.waitChip(policy.hoursWaiting(request))}
              </button></li>`)}
          </ul>` : html`<h2 class="detail-idle-title">Nothing urgent</h2><p class="muted">Pick any request to see its line items, files and history.</p>`}
        ${shortcuts(persona)}
        ${persona.role === "requester" ? html`
          <div class="shortcuts">
            <h3>${icon("arrow", 16)} What happens after you submit</h3>
            <ol class="next-steps">
              <li><b>Your manager</b> signs every request.</li>
              <li><b>Finance</b> signs from ${policy.formatMoney(policy.FINANCE_FROM)}.</li>
              <li><b>A Director</b> signs from ${policy.formatMoney(policy.DIRECTOR_FROM)}.</li>
              <li>Each step usually takes up to 3 days. If one sends it back, you'll see their note here.</li>
            </ol>
          </div>` : ""}
      </div>`;
  }

  function header(request) {
    const requester = data.person(request.requesterId);
    const { total } = policy.totals(request);
    return html`
      <header class="doc-head">
        <div class="doc-head-top">
          <span class="mono doc-id">${request.id}</span>${statusChip(request)}
          <button type="button" class="icon-button close-button" data-action="close-detail" aria-label="Close ${request.id}">${icon("close", 16)}</button>
        </div>
        <h2 class="doc-title" id="docTitle" tabindex="-1">${request.title}</h2>
        <div class="doc-meta">
          ${avatar(request.requesterId)}
          <span><b>${requester.name}</b><small>${requester.title} · ${data.department(request.departmentId).name}</small></span>
          <span class="doc-total"><small>Total incl. tax</small>${money(total)}</span>
        </div>
      </header>`;
  }

  function lineItems(request) {
    const { subtotal, tax, total } = policy.totals(request);
    return html`
      <section class="doc-section" aria-labelledby="itemsTitle">
        <h3 class="doc-section-title" id="itemsTitle">Line items <span class="muted">· ${request.vendor}</span></h3>
        <table class="items">
          <thead><tr><th scope="col">Item</th><th scope="col" class="num">Qty</th><th scope="col" class="num">Unit</th><th scope="col" class="num">Amount</th></tr></thead>
          <tbody>
            ${request.lineItems.map((item) => html`<tr><td>${item.description}</td><td class="num">${item.quantity.toLocaleString()}</td><td class="num">${policy.formatMoney(item.unitPrice, { exact: true })}</td><td class="num">${policy.formatMoney(item.quantity * item.unitPrice, { exact: true })}</td></tr>`)}
          </tbody>
          <tfoot>
            <tr><th scope="row" colspan="3">Subtotal</th><td class="num">${policy.formatMoney(subtotal, { exact: true })}</td></tr>
            <tr><th scope="row" colspan="3">Tax ${Math.round(request.taxRate * 100)}%</th><td class="num">${policy.formatMoney(tax, { exact: true })}</td></tr>
            <tr class="items-total"><th scope="row" colspan="3">Total</th><td class="num">${policy.formatMoney(total, { exact: true })}</td></tr>
          </tfoot>
        </table>
        <dl class="facts">
          <div><dt>Cost centre</dt><dd class="mono">${request.costCentre}</dd></div>
          <div><dt>Needed by</dt><dd>${policy.formatDate(request.neededBy)}</dd></div>
          <div class="facts-wide"><dt>Why</dt><dd>${request.justification}</dd></div>
        </dl>
      </section>`;
  }

  function attachments(request) {
    return html`
      <section class="doc-section" aria-labelledby="filesTitle">
        <h3 class="doc-section-title" id="filesTitle">Attachments <span class="muted">· ${request.attachments.length}</span></h3>
        ${request.attachments.length ? html`
          <ul class="files">
            ${request.attachments.map((file, index) => html`
              <li><button type="button" class="file" data-action="preview" data-id="${request.id}" data-index="${index}">
                <span class="file-icon file-${file.name.endsWith(".xlsx") ? "sheet" : "pdf"}">${icon(file.name.endsWith(".xlsx") ? "sheet" : "file", 18)}</span>
                <span><b>${file.name}</b><small>${file.sizeKb >= 1000 ? `${(file.sizeKb / 1000).toFixed(1)} MB` : `${file.sizeKb} KB`}${file.addedLater ? " · added on resubmit" : ""}</small></span>
              </button></li>`)}
          </ul>` : html`<p class="muted">No files attached.</p>`}
      </section>`;
  }

  function history(request) {
    const events = [...request.history].reverse();
    return html`
      <section class="doc-section" aria-labelledby="historyTitle">
        <h3 class="doc-section-title" id="historyTitle">History</h3>
        <ol class="history">
          ${events.map((event) => {
            const actor = data.person(event.actorId);
            return html`
              <li class="history-item tone-${HISTORY_TONE[event.type]}">
                <span class="history-dot" aria-hidden="true"></span>
                <div>
                  <p><b>${HISTORY_WORDS[event.type]}</b> by ${actor.name}${event.role ? ` (${policy.ROLE_LABELS[event.role]})` : ""}</p>
                  <small>${policy.formatDayTime(event.at)} · ${policy.formatAgo(event.at)}</small>
                  ${event.note ? html`<blockquote>${event.note}</blockquote>` : ""}
                </div>
              </li>`;
          })}
        </ol>
      </section>`;
  }

  function extrasSkeleton() {
    return html`
      <div class="doc-section" aria-hidden="true">
        <span class="skeleton-line" style="width:120px"></span>
        ${[1, 2, 3].map(() => html`<span class="skeleton-line skeleton-row"></span>`)}
      </div>
      <div class="doc-section" aria-hidden="true">
        <span class="skeleton-line" style="width:100px"></span>
        <span class="skeleton-line skeleton-file"></span>
      </div>`;
  }

  function extrasError(message) {
    return html`
      <div class="load-error load-error-compact" role="alert">
        ${icon("alert", 18)}<div><b>Files and history didn't load.</b><p>${message}</p></div>
        <button type="button" class="button button-secondary" data-action="retry-detail">Try again</button>
      </div>`;
  }

  // Why the viewer can't act, in words — never a silently missing button.
  function readOnlyNote(request, persona) {
    const step = policy.currentStep(request);
    if (persona.role === "requester") return "";
    if (request.status === "in_review" && step.approverId !== persona.personId) {
      return `It's with ${data.person(step.approverId).name} (${policy.ROLE_LABELS[step.role]}) now — nothing for you to do.`;
    }
    if (request.status === "changes_requested") return `Waiting for ${data.person(request.requesterId).name} to make changes.`;
    return "This request is closed.";
  }

  const COMPOSER_COPY = {
    sent_back: { title: "What needs to change?", button: "Send back", hint: (name) => `${name} will see this word for word.` },
    rejected: { title: "Why are you rejecting it?", button: "Reject request", hint: (name) => `${name} will see this. Rejected requests can't be reopened.` },
    resubmit: { title: "What did you change?", button: "Resubmit", hint: (name) => `${name} will see this note next to your changes.` },
  };

  // Resubmit lets the requester fix what was asked: quantities, prices and
  // the cost centre. The new total and route update as they type.
  function editItems(request) {
    return html`
      <fieldset class="edit-items">
        <legend>Line items <span class="muted">— change what was asked for</span></legend>
        ${request.lineItems.map((item, index) => html`
          <div class="edit-row">
            <span class="edit-name">${item.description}</span>
            <label><span>Qty</span><input type="number" inputmode="numeric" min="1" step="1" name="quantity-${index}" value="${item.quantity}"></label>
            <label><span>Unit price</span><input type="number" inputmode="decimal" min="0" step="0.01" name="price-${index}" value="${item.unitPrice}"></label>
          </div>`)}
        <label class="edit-centre"><span>Cost centre</span><input type="text" name="costCentre" value="${request.costCentre}" autocomplete="off"></label>
        <p class="edit-total" id="editTotal" aria-live="polite">${editSummary(request, request)}</p>
      </fieldset>`;
  }

  function editSummary(original, edited) {
    const before = policy.totals(original).total;
    const after = policy.totals(edited).total;
    const roles = policy.routeFor(after).map((role) => policy.ROLE_LABELS[role]).join(" → ");
    const changed = Math.abs(after - before) >= 0.01 ? html` <span class="muted">(was ${policy.formatMoney(before)})</span>` : "";
    return html`New total <b class="money">${policy.formatMoney(after)}</b>${changed} · signed by ${roles}`;
  }

  function composer(kind, request, persona) {
    const copy = COMPOSER_COPY[kind];
    let recipient = data.person(request.requesterId).name.split(" ")[0];
    if (kind === "resubmit") recipient = data.person(policy.currentStep(request).approverId).name.split(" ")[0];
    const chips = kind === "sent_back" ? data.SEND_BACK_REASONS.slice(0, 4) : kind === "rejected" ? data.REJECT_REASONS : [];
    return html`
      <form class="composer composer-${kind}" data-kind="${kind}" novalidate>
        <label class="composer-label" for="reason">${copy.title}</label>
        ${chips.length ? html`<div class="quick-reasons" role="group" aria-label="Common reasons">${chips.map((reason) => html`<button type="button" class="quick-reason" data-action="quick-reason" data-text="${reason}">${reason.split(/[—.]/)[0].trim()}</button>`)}</div>` : ""}
        <textarea id="reason" name="reason" rows="3" aria-describedby="reasonHint reasonError" placeholder="${kind === "resubmit" ? "e.g. Added a second quote from Brightline — 6% cheaper." : `Tell ${recipient} exactly what to fix…`}"></textarea>
        <p class="composer-hint" id="reasonHint">${copy.hint(recipient)} Your text is kept if you close this.</p>
        <p class="field-error" id="reasonError" hidden></p>
        ${kind === "resubmit" ? editItems(request) : ""}
        ${kind === "resubmit" ? html`
          <label class="file-pick">${icon("upload", 16)}<span id="filePickLabel">Add a file (optional)</span><input type="file" id="resubmitFile" class="sr-only"></label>` : ""}
        <div class="composer-actions">
          <button type="button" class="button button-quiet" data-action="cancel-composer">Cancel</button>
          <button type="submit" class="button ${kind === "rejected" ? "button-danger" : kind === "sent_back" ? "button-warn" : "button-primary"}" data-action="submit-composer"><span class="button-label">${copy.button}</span></button>
        </div>
      </form>`;
  }

  function actions(request, persona) {
    const step = policy.currentStep(request);
    if (persona.role === "requester") {
      if (request.status !== "changes_requested") return "";
      return html`<div class="doc-actions"><button type="button" class="button button-primary button-wide" data-action="compose" data-kind="resubmit">Make the changes and resubmit</button></div>`;
    }
    if (request.status !== "in_review" || step.approverId !== persona.personId) {
      return html`<div class="doc-actions doc-actions-note"><p>${readOnlyNote(request, persona)}</p></div>`;
    }
    const next = request.route[request.route.indexOf(step) + 1];
    const approveLabel = next ? `Approve → ${policy.ROLE_LABELS[next.role]}` : "Approve";
    return html`
      <div class="doc-actions" id="docActions">
        <p class="decide-error" id="decideError" role="alert" hidden></p>
        <div class="doc-actions-row">
          <button type="button" class="button button-warn-quiet" data-action="compose" data-kind="sent_back" aria-keyshortcuts="S">${icon("back", 16)}<span>Send back</span></button>
          <button type="button" class="button button-danger-quiet" data-action="compose" data-kind="rejected" aria-keyshortcuts="R">${icon("cross", 16)}<span>Reject</span></button>
          <button type="button" class="button button-primary button-approve" data-action="approve" aria-keyshortcuts="A">${icon("check", 16)}<span class="button-label">${approveLabel}</span></button>
        </div>
      </div>`;
  }

  function requestDocument(request, persona, { extras = "loading", extrasMessage = "" } = {}) {
    const answer = persona.role === "requester" ? whereIsIt(request) : null;
    const step = policy.currentStep(request);
    const returnedNote = step && step.sentBackNote;
    return html`
      <article class="doc" data-request="${request.id}" aria-labelledby="docTitle">
        <div class="doc-scroll">
          ${header(request)}
          <section class="doc-section doc-route" aria-labelledby="routeTitle">
            <h3 class="doc-section-title" id="routeTitle">Routing slip</h3>
            ${routingSlip(request)}
            <p class="route-why">${policy.routeReason(policy.totals(request).total)}</p>
            ${answer ? html`<p class="route-answer tone-${answer.tone}"><b>${answer.headline}.</b> ${answer.detail ? (request.status === "changes_requested" ? `“${answer.detail}”` : answer.detail) : ""}</p>` : ""}
            ${returnedNote ? html`<p class="route-answer tone-info"><b>Resubmitted after changes.</b> You had asked: “${returnedNote}”</p>` : ""}
          </section>
          ${lineItems(request)}
          <div class="doc-extras" id="docExtras">
            ${extras === "loading" ? extrasSkeleton() : extras === "error" ? extrasError(extrasMessage) : html`${attachments(request)}${history(request)}`}
          </div>
        </div>
        <div class="doc-footer" id="docFooter">${actions(request, persona)}</div>
      </article>`;
  }

  function stamp(decision, role) {
    const words = { approved: "Approved", sent_back: "Sent back", rejected: "Rejected" };
    const date = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" }).toUpperCase();
    return html`<div class="stamp stamp-${decision}"><b>${words[decision]}</b><small>${policy.ROLE_LABELS[role]} · ${date}</small></div>`;
  }

  // ---- File preview: a quote or comparison drawn from the request -------------

  function preview(request, file) {
    const { subtotal, tax, total } = policy.totals(request);
    if (file.kind === "comparison") {
      const rows = [
        { vendor: request.vendor, amount: total, chosen: true },
        { vendor: "Second supplier", amount: total * 1.07 },
        { vendor: "Third supplier", amount: total * 1.13 },
      ];
      return html`
        <div class="paper-doc">
          <p class="paper-kicker">Vendor comparison · ${request.id}</p>
          <h3>${request.title}</h3>
          <table class="items"><thead><tr><th scope="col">Vendor</th><th scope="col" class="num">Quoted total</th><th scope="col" class="num">vs chosen</th></tr></thead>
            <tbody>${rows.map((row) => html`<tr${row.chosen ? html` class="is-chosen"` : ""}><td>${row.vendor}${row.chosen ? " (chosen)" : ""}</td><td class="num">${policy.formatMoney(row.amount)}</td><td class="num">${row.chosen ? "—" : `+${Math.round((row.amount / total - 1) * 100)}%`}</td></tr>`)}</tbody></table>
          <p class="muted">Preview of the attached spreadsheet. Download is not available in this demo.</p>
        </div>`;
    }
    if (file.kind === "spec" || file.kind === "upload") {
      return html`
        <div class="paper-doc">
          <p class="paper-kicker">${file.name}</p>
          <h3>${file.kind === "upload" ? "Added by the requester" : "Specification"}</h3>
          <p>${file.kind === "upload" ? "This file was attached when the request was resubmitted. Only its name and size are kept in this demo." : `Technical requirements for ${request.title.toLowerCase()}, prepared by ${data.department(request.departmentId).name}.`}</p>
          <div class="paper-lines" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
        </div>`;
    }
    return html`
      <div class="paper-doc">
        <div class="paper-letterhead"><b>${request.vendor}</b><span>Quotation Q-${request.id.slice(3)}</span></div>
        <p class="paper-kicker">Prepared for ${data.department(request.departmentId).name} · valid 30 days</p>
        <table class="items"><thead><tr><th scope="col">Item</th><th scope="col" class="num">Qty</th><th scope="col" class="num">Amount</th></tr></thead>
          <tbody>${request.lineItems.map((item) => html`<tr><td>${item.description}</td><td class="num">${item.quantity}</td><td class="num">${policy.formatMoney(item.quantity * item.unitPrice, { exact: true })}</td></tr>`)}</tbody>
          <tfoot><tr><th scope="row" colspan="2">Subtotal</th><td class="num">${policy.formatMoney(subtotal, { exact: true })}</td></tr>
          <tr><th scope="row" colspan="2">Tax</th><td class="num">${policy.formatMoney(tax, { exact: true })}</td></tr>
          <tr class="items-total"><th scope="row" colspan="2">Total</th><td class="num">${policy.formatMoney(total, { exact: true })}</td></tr></tfoot></table>
      </div>`;
  }

  return { idle, breakdown, editSummary, requestDocument, composer, stamp, preview, actions, history, attachments, extrasError };
})();
