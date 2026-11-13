import { enhance, selection, menu, load, commit, toast, progress, setState } from "./surface-kit.js";

// A pretend server for this page: it answers after a moment and honours the usual development
// switches — ?latency=slow, ?fail=always, ?fail=1 (each request fails once, then works).
const switches = new URLSearchParams(location.search);
const failedOnce = new Set();
window.serverCalls = [];
function server(name, answer) {
  window.serverCalls.push(name);
  const wait = switches.get("latency") === "slow" ? 2400 : 180;
  return new Promise((resolve, reject) => setTimeout(() => {
    const fails = switches.get("fail") === "always" || (switches.get("fail") === "1" && !failedOnce.has(name));
    failedOnce.add(name);
    if (fails) reject(Object.assign(new Error("The server could not answer"), { status: 500 }));
    else resolve(typeof answer === "function" ? answer() : answer);
  }, wait));
}

const tones = { Open: "info", "In progress": "warn", Done: "ok", Overdue: "bad" };
const orders = [
  { id: "WO-4810", title: "Lift stuck between floors", trade: "Lifts", where: "Harbour Tower", spot: "Lift lobby B", status: "Overdue", progress: 0.2, due: "2026-11-11" },
  { id: "WO-4811", title: "Leaking pipe in pantry", trade: "Plumbing", where: "Kestrel House", spot: "Level 3 pantry", status: "In progress", progress: 0.6, due: "2026-11-13" },
  { id: "WO-4816", title: "Door access reader offline", trade: "Power", where: "Civic Library", spot: "Staff entrance", status: "Open", progress: 0, due: "2026-11-14" },
  { id: "WO-4817", title: "Water heater tripping", trade: "Power", where: "Riverside Hall", spot: "Kitchen", status: "In progress", progress: 0.4, due: "2026-11-14" },
  { id: "WO-4822", title: "Chiller 2 running overnight", trade: "Chillers", where: "Harbour Tower", spot: "Roof plant deck", status: "Open", progress: 0, due: "2026-11-16" },
  { id: "WO-4823", title: "Car park barrier slow to lift", trade: "Power", where: "Mill Street Depot", spot: "Gate 1", status: "In progress", progress: 0.8, due: "2026-11-17" },
  { id: "WO-4828", title: "Roof gutter blocked", trade: "Roofing", where: "North Annex", spot: "East roof", status: "Open", progress: 0, due: "2026-11-18" },
  { id: "WO-4829", title: "Emergency light failed test", trade: "Lighting", where: "Civic Library", spot: "Stair 2", status: "In progress", progress: 0.3, due: "2026-11-19" },
  { id: "WO-4834", title: "Replace lobby air filter", trade: "Ventilation", where: "Kestrel House", spot: "Main lobby", status: "Done", progress: 1, due: "2026-11-10" },
  { id: "WO-4835", title: "Repaint loading bay lines", trade: "Carpentry", where: "Mill Street Depot", spot: "Bay 2", status: "Done", progress: 1, due: "2026-11-09" },
];
const view = { search: "", building: "", status: "", sort: "due", ascending: true };
const shortDate = new Intl.DateTimeFormat("en-SG", { day: "numeric", month: "short" });
const body = document.querySelector("#orders tbody");
const escapeHtml = (text) => text.replace(/[&<>"]/g, (letter) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[letter]));

function rowHtml(order) {
  const [year, month, day] = order.due.split("-").map(Number);
  return `<tr data-id="${order.id}">
    <td><input class="ws-check" type="checkbox" data-ws-row aria-label="Select ${order.id}"></td>
    <td><div class="ws-lead"><span class="ws-tile" aria-hidden="true">${escapeHtml(order.trade.slice(0, 2))}</span>
      <div><strong>${escapeHtml(order.title)}</strong><span class="ws-sub">${order.id} · ${escapeHtml(order.trade)}</span></div></div></td>
    <td class="hide-narrow place">${escapeHtml(order.where)}<span class="ws-sub">${escapeHtml(order.spot)}</span></td>
    <td><span class="ws-status" data-tone="${tones[order.status]}">${order.status}</span></td>
    <td class="hide-narrow"><span class="ws-meter" data-tone="${tones[order.status]}" style="--value: ${order.progress}" role="img" aria-label="${Math.round(order.progress * 100)}% done"></span></td>
    <td class="ws-num">${shortDate.format(new Date(year, month - 1, day))}</td>
    <td class="row-actions"><button class="icon-button" type="button" data-ws-menu="row-menu" aria-label="Actions for ${order.id}">
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M3 8h.01M8 8h.01M13 8h.01" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg></button></td>
  </tr>`;
}

let rows = null;
function render() {
  const wanted = orders
    .filter((order) => !view.building || order.where === view.building)
    .filter((order) => !view.status || order.status === view.status || (view.status === "Open" && order.status === "Overdue"))
    .filter((order) => `${order.title} ${order.id} ${order.trade}`.toLowerCase().includes(view.search.toLowerCase()))
    .sort((first, second) => (first[view.sort] < second[view.sort] ? -1 : 1) * (view.ascending ? 1 : -1));
  body.innerHTML = wanted.map(rowHtml).join("") || `<tr><td colspan="7"><div class="ws-empty"><strong>No orders match</strong>Try another building or clear the search.</div></td></tr>`;
  for (const trigger of body.querySelectorAll("[data-ws-menu]")) menu(trigger, document.getElementById("row-menu"));
  if (rows) rows.refresh();
}

enhance();
// The table's data arrives through the kit: skeleton, refresh, error and retry come with it.
window.ordersRegion = load(document.getElementById("orders-region"), () => server("load orders", () => orders.slice()), {
  render,
  messages: { failed: "The work orders couldn't be loaded." },
});
rows = selection(document.getElementById("orders"), {
  onChange(ids) {
    document.getElementById("bulk").hidden = ids.length === 0;
    document.getElementById("bulk-count").textContent = `${ids.length} selected`;
  },
});

// What the page's own code hears from the real <select> and <input>: the tests read this.
window.kitEvents = [];
for (const field of document.querySelectorAll("select, input[type=date]")) {
  field.addEventListener("change", () => window.kitEvents.push(`${field.id}=${field.value}`));
}
window.menuActions = [];
document.getElementById("row-menu").addEventListener("click", (event) => {
  const item = event.target.closest("[data-action]");
  if (!item) return;
  const order = event.currentTarget.wsTrigger.closest("tr").dataset.id;
  window.menuActions.push(`${item.dataset.action}:${order}`);
  if (item.dataset.action === "assign") {
    document.getElementById("assign-order").textContent = `${order} — choose who takes it. They are told at once.`;
    assignDialog.showModal();
  }
});
const assignDialog = document.getElementById("assign-dialog");
document.getElementById("assign-cancel").addEventListener("click", () => assignDialog.close());
document.getElementById("assign-confirm").addEventListener("click", async (event) => {
  const result = await commit(event.currentTarget, () => server("assign order"), { busyLabel: "Assigning…", doneLabel: "Assigned" });
  if (!result.ok) return; // the dialog stays open with the choice still made
  const who = assignDialog.querySelector("input:checked").value;
  setTimeout(() => {
    assignDialog.close();
    toast(`Assigned to ${who}`, { tone: "ok", action: { label: "Undo", run: () => toast("Assignment undone") } });
  }, 600);
});

// Long work in the background: real progress, because the page knows how many orders there are.
const exportButton = document.getElementById("export");
exportButton.addEventListener("click", () => {
  if (exportButton.dataset.state === "processing") return; // one export at a time: a second press does nothing
  let stopped = false;
  let written = 0;
  const finished = () => {
    exportButton.removeAttribute("aria-disabled");
    setState(exportButton, "idle");
  };
  exportButton.setAttribute("aria-disabled", "true");
  setState(exportButton, "processing");
  const job = progress("Exporting work orders", { onCancel: () => { stopped = true; finished(); } });
  const step = () => {
    if (stopped) return;
    written += 1;
    job.update({ value: written / orders.length, status: `${written} of ${orders.length} orders` });
    if (written < orders.length) return setTimeout(step, 260);
    job.done("Export ready");
    return finished();
  };
  setTimeout(step, 400);
});

document.getElementById("search").addEventListener("input", (event) => { view.search = event.target.value; render(); });
document.getElementById("building").addEventListener("change", (event) => { view.building = event.target.value; render(); });
for (const chip of document.querySelectorAll(".ws-chip")) {
  chip.addEventListener("click", () => {
    for (const other of document.querySelectorAll(".ws-chip")) other.setAttribute("aria-pressed", String(other === chip));
    view.status = chip.dataset.status;
    render();
  });
}
for (const button of document.querySelectorAll(".ws-sort")) {
  button.addEventListener("click", () => {
    view.ascending = view.sort === button.dataset.sort ? !view.ascending : true;
    view.sort = button.dataset.sort;
    for (const other of document.querySelectorAll(".ws-sort")) {
      other.closest("th").setAttribute("aria-sort", other === button ? (view.ascending ? "ascending" : "descending") : "none");
    }
    render();
  });
}
document.getElementById("bulk-clear").addEventListener("click", () => rows.clear());
document.getElementById("new-order").addEventListener("click", () => document.getElementById("title").focus());

const form = document.getElementById("order-form");
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const result = await commit(document.getElementById("create"), () => server("create order"), { busyLabel: "Creating…", doneLabel: "Created" });
  if (!result.ok) return; // nothing is cleared: the user retries with what they typed
  orders.push({ id: `WO-${4836 + orders.length - 10}`, title: data.get("title"), trade: data.get("trade"), where: data.get("where"), spot: "To confirm", status: "Open", progress: 0, due: data.get("due") });
  form.reset();
  render();
});
