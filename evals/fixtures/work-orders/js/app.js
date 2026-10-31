// Work orders dashboard. Reads BUILDINGS, TECHNICIANS and WORK_ORDERS from data.js.

const DUE_SOON_DAYS = 2;
const WINDOWS_PER_FLOOR = 4;
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const PRIORITIES = ["Critical", "High", "Medium", "Low"];

const filters = {
  buildingId: null,
  trade: "",
  priority: "",
  overdueOnly: false,
  technicianId: null,
};

const today = startOfToday();
const orders = WORK_ORDERS.map(addDueInfo);

// ---------- Dates and order helpers ----------

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function addDueInfo(order) {
  const dueDate = new Date(today);
  dueDate.setDate(today.getDate() + order.dueInDays);
  return { ...order, dueDate, isOverdue: order.dueInDays < 0 };
}

function isDueSoon(order) {
  return order.dueInDays >= 0 && order.dueInDays <= DUE_SOON_DAYS;
}

function findBuilding(buildingId) {
  return BUILDINGS.find((building) => building.id === buildingId);
}

function findTechnician(technicianId) {
  return TECHNICIANS.find((technician) => technician.id === technicianId);
}

function ordersForTechnician(technicianId) {
  return orders.filter((order) => order.technicianId === technicianId);
}

function escapeHtml(text) {
  const element = document.createElement("div");
  element.textContent = text;
  return element.innerHTML;
}

function pluralise(count, singular) {
  if (count === 1) {
    return `${count} ${singular}`;
  }
  return `${count} ${singular}s`;
}

function formatDate(date) {
  return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

// ---------- Filtering ----------

function matchesFilters(order) {
  if (filters.buildingId && order.building !== filters.buildingId) return false;
  if (filters.trade && order.trade !== filters.trade) return false;
  if (filters.priority && order.priority !== filters.priority) return false;
  if (filters.overdueOnly && !order.isOverdue) return false;
  if (filters.technicianId && order.technicianId !== filters.technicianId) return false;
  return true;
}

function hasActiveFilters() {
  return Boolean(
    filters.buildingId || filters.trade || filters.priority || filters.overdueOnly || filters.technicianId
  );
}

function isTechnicianOverloaded(technician) {
  return ordersForTechnician(technician.id).length > technician.capacity;
}

// ---------- Masthead stats ----------

function renderStats(visibleOrders) {
  const overdueCount = visibleOrders.filter((order) => order.isOverdue).length;
  const dueSoonCount = visibleOrders.filter(isDueSoon).length;
  const overloadedCount = TECHNICIANS.filter(isTechnicianOverloaded).length;

  const tiles = [
    { label: "Open orders", value: visibleOrders.length, className: "" },
    { label: "Overdue", value: overdueCount, className: "stat--overdue" },
    { label: `Due within ${DUE_SOON_DAYS} days`, value: dueSoonCount, className: "" },
    { label: "Technicians overloaded", value: overloadedCount, className: "stat--overdue" },
  ];
  document.getElementById("stats").innerHTML = tiles
    .map((tile) => `<div class="stat ${tile.className}"><dt>${tile.label}</dt><dd>${tile.value}</dd></div>`)
    .join("");
}

// ---------- Building elevations (also the building filter) ----------

function createSvgElement(tagName, attributes) {
  const element = document.createElementNS(SVG_NAMESPACE, tagName);
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, value);
  }
  return element;
}

// Same building always gets the same scattered window order, so the picture is stable between loads.
function scatteredWindowOrder(slotCount, buildingIndex) {
  const slots = Array.from({ length: slotCount }, (_, slot) => slot);
  const scatterKey = (slot) => (slot * 7919 + (buildingIndex + 1) * 104729) % 1009;
  return slots.sort((a, b) => scatterKey(a) - scatterKey(b));
}

function windowStateForSlots(buildingOrders, slotCount, buildingIndex) {
  const states = new Array(slotCount).fill("off");
  const scattered = scatteredWindowOrder(slotCount, buildingIndex);
  const overdueFirst = [...buildingOrders].sort((a, b) => b.isOverdue - a.isOverdue);
  overdueFirst.forEach((order, position) => {
    states[scattered[position]] = order.isOverdue ? "overdue" : "lit";
  });
  return states;
}

function buildBuildingSvg(building, buildingIndex, maxFloors) {
  const viewWidth = 100;
  const floorHeight = 18;
  const viewHeight = maxFloors * floorHeight + 14;
  const bodyHeight = building.floors * floorHeight + 8;
  const bodyTop = viewHeight - bodyHeight;
  const windowWidth = 14;
  const windowHeight = 10;
  const sidePadding = 14;
  const windowGap = (viewWidth - sidePadding * 2 - windowWidth * WINDOWS_PER_FLOOR) / (WINDOWS_PER_FLOOR - 1);

  const svg = createSvgElement("svg", { viewBox: `0 0 ${viewWidth} ${viewHeight}`, "aria-hidden": "true", focusable: "false" });
  svg.append(createSvgElement("rect", { class: "facade-body", x: 8, y: bodyTop, width: 84, height: bodyHeight }));
  svg.append(createSvgElement("rect", { class: "facade-roof", x: 5, y: bodyTop - 3, width: 90, height: 4 }));

  const slotCount = building.floors * WINDOWS_PER_FLOOR;
  const buildingOrders = orders.filter((order) => order.building === building.id);
  const states = windowStateForSlots(buildingOrders, slotCount, buildingIndex);

  states.forEach((state, slot) => {
    const floorFromTop = Math.floor(slot / WINDOWS_PER_FLOOR);
    const column = slot % WINDOWS_PER_FLOOR;
    const windowRect = createSvgElement("rect", {
      class: windowClassFor(state),
      x: sidePadding + column * (windowWidth + windowGap),
      y: bodyTop + 7 + floorFromTop * floorHeight,
      width: windowWidth,
      height: windowHeight,
      rx: 2,
    });
    if (state !== "off") {
      windowRect.style.animationDelay = `${(slot % 9) * 60 + buildingIndex * 90}ms`;
    }
    svg.append(windowRect);
  });

  svg.append(createSvgElement("rect", { class: "facade-door", x: 44, y: viewHeight - 8, width: 12, height: 8 }));
  return svg;
}

function windowClassFor(state) {
  if (state === "overdue") return "window-overdue window-on";
  if (state === "lit") return "window-lit window-on";
  return "window-off";
}

function createBuildingButton(building, buildingIndex, maxFloors) {
  const buildingOrders = orders.filter((order) => order.building === building.id);
  const overdueCount = buildingOrders.filter((order) => order.isOverdue).length;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "building";
  button.dataset.buildingId = building.id;
  button.setAttribute("aria-pressed", "false");
  button.setAttribute(
    "aria-label",
    `${building.name}: ${buildingOrders.length} open, ${overdueCount} overdue`
  );
  button.append(buildBuildingSvg(building, buildingIndex, maxFloors));

  const details = document.createElement("span");
  details.setAttribute("aria-hidden", "true");
  details.innerHTML = `
    <span class="building__name">${escapeHtml(building.name)}</span>
    <span class="building__counts">${buildingOrders.length} open ·
      <span class="building__overdue">${overdueCount} overdue</span></span>`;
  button.append(details);

  button.addEventListener("click", () => toggleBuilding(building.id));
  return button;
}

function renderBuildingStrip() {
  const strip = document.getElementById("building-strip");
  const maxFloors = Math.max(...BUILDINGS.map((building) => building.floors));
  BUILDINGS.forEach((building, buildingIndex) => {
    strip.append(createBuildingButton(building, buildingIndex, maxFloors));
  });
}

function syncBuildingStrip() {
  document.querySelector(".elevation").classList.toggle("elevation--filtered", Boolean(filters.buildingId));
  document.getElementById("all-buildings").setAttribute("aria-pressed", String(!filters.buildingId));
  document.querySelectorAll(".building").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.buildingId === filters.buildingId));
  });
}

function toggleBuilding(buildingId) {
  if (filters.buildingId === buildingId) {
    filters.buildingId = null;
  } else {
    filters.buildingId = buildingId;
  }
  render();
}

// ---------- Technician workload ----------

function slotClassesFor(order, index, technician) {
  const classes = ["slot", order.isOverdue ? "slot--overdue" : "slot--ontrack"];
  if (index >= technician.capacity) classes.push("slot--over");
  if (filters.buildingId && order.building !== filters.buildingId) classes.push("slot--dim");
  return classes.join(" ");
}

function renderWorkloadBar(technician, technicianOrders) {
  const slots = technicianOrders.map(
    (order, index) => `<span class="${slotClassesFor(order, index, technician)}"></span>`
  );
  for (let index = technicianOrders.length; index < technician.capacity; index++) {
    slots.push('<span class="slot slot--free"></span>');
  }
  return slots.join("");
}

function renderTechnician(technician) {
  // Overdue orders first so the red segments sit at the left of the bar.
  const technicianOrders = ordersForTechnician(technician.id).sort((a, b) => b.isOverdue - a.isOverdue);
  const overBy = technicianOrders.length - technician.capacity;
  const overdueCount = technicianOrders.filter((order) => order.isOverdue).length;
  const isSelected = filters.technicianId === technician.id;

  let flag = "";
  if (overBy > 0) {
    flag = `<span class="tech__flag">Overloaded: ${pluralise(overBy, "order")} over capacity</span>`;
  }
  const loadClass = overBy > 0 ? "tech__load tech__load--over" : "tech__load";

  return `
    <li>
      <button type="button" class="tech" data-technician-id="${technician.id}" aria-pressed="${isSelected}"
        aria-label="${escapeHtml(technician.name)}, ${technicianOrders.length} of ${technician.capacity} orders, ${overdueCount} overdue">
        <span class="tech__name">${escapeHtml(technician.name)} <span class="tech__trade">· ${technician.trade}</span></span>
        <span class="${loadClass}">${technicianOrders.length}/${technician.capacity}</span>
        <span class="tech__bar">${renderWorkloadBar(technician, technicianOrders)}</span>
        ${flag}
      </button>
    </li>`;
}

function loadRatio(technician) {
  return ordersForTechnician(technician.id).length / technician.capacity;
}

function renderWorkload() {
  const busiestFirst = [...TECHNICIANS].sort((a, b) => loadRatio(b) - loadRatio(a));
  document.getElementById("tech-list").innerHTML = busiestFirst.map(renderTechnician).join("");
}

function toggleTechnician(technicianId) {
  if (filters.technicianId === technicianId) {
    filters.technicianId = null;
  } else {
    filters.technicianId = technicianId;
  }
  render();
  // The workload list is redrawn, so put keyboard focus back on the same person.
  const button = document.querySelector(`[data-technician-id="${technicianId}"]`);
  if (button && document.activeElement === document.body) button.focus();
}

// ---------- Orders table ----------

function dueRelativeText(order) {
  if (order.dueInDays < 0) return `${pluralise(-order.dueInDays, "day")} overdue`;
  if (order.dueInDays === 0) return "Due today";
  return `Due in ${pluralise(order.dueInDays, "day")}`;
}

function dueClassFor(order) {
  if (order.isOverdue) return "due__relative--overdue";
  if (isDueSoon(order)) return "due__relative--soon";
  return "due__relative--ok";
}

function renderOrderRow(order) {
  const technician = findTechnician(order.technicianId);
  const building = findBuilding(order.building);
  const rowClass = order.isOverdue ? "is-overdue" : "";

  return `
    <tr class="${rowClass}">
      <td><span class="order__id">${order.id}</span><span class="order__title">${escapeHtml(order.title)}</span></td>
      <td data-label="Building">${escapeHtml(building.name)}</td>
      <td data-label="Trade">${order.trade}</td>
      <td data-label="Priority"><span class="priority priority--${order.priority.toLowerCase()}">${order.priority}</span></td>
      <td data-label="Status">${order.status}</td>
      <td data-label="Technician">${escapeHtml(technician.name)}</td>
      <td data-label="Due" class="due">
        <span class="due__relative ${dueClassFor(order)}">${dueRelativeText(order)}</span>
        <span class="due__date">${formatDate(order.dueDate)}</span>
      </td>
    </tr>`;
}

function renderOrders(visibleOrders) {
  document.getElementById("order-rows").innerHTML = visibleOrders.map(renderOrderRow).join("");
  document.getElementById("empty-state").hidden = visibleOrders.length > 0;
  document.querySelector(".order-table").hidden = visibleOrders.length === 0;
  document.getElementById("result-count").textContent =
    `Showing ${visibleOrders.length} of ${orders.length}, most overdue first`;
}

// ---------- Toolbar ----------

function fillSelect(selectId, allLabel, values) {
  const options = [`<option value="">${allLabel}</option>`];
  for (const value of values) {
    options.push(`<option value="${value}">${value}</option>`);
  }
  document.getElementById(selectId).innerHTML = options.join("");
}

function setUpToolbar() {
  const trades = [...new Set(TECHNICIANS.map((technician) => technician.trade))];
  fillSelect("filter-trade", "All trades", trades);
  fillSelect("filter-priority", "All priorities", PRIORITIES);

  document.getElementById("filter-trade").addEventListener("change", (event) => {
    filters.trade = event.target.value;
    render();
  });
  document.getElementById("filter-priority").addEventListener("change", (event) => {
    filters.priority = event.target.value;
    render();
  });
  document.getElementById("filter-overdue").addEventListener("change", (event) => {
    filters.overdueOnly = event.target.checked;
    render();
  });
  document.getElementById("clear-technician").addEventListener("click", () => toggleTechnician(filters.technicianId));
  document.getElementById("clear-filters").addEventListener("click", clearFilters);
  document.getElementById("all-buildings").addEventListener("click", () => {
    filters.buildingId = null;
    render();
  });
  document.getElementById("tech-list").addEventListener("click", (event) => {
    const button = event.target.closest("[data-technician-id]");
    if (button) toggleTechnician(button.dataset.technicianId);
  });
}

function clearFilters() {
  filters.buildingId = null;
  filters.trade = "";
  filters.priority = "";
  filters.overdueOnly = false;
  filters.technicianId = null;
  document.getElementById("filter-trade").value = "";
  document.getElementById("filter-priority").value = "";
  document.getElementById("filter-overdue").checked = false;
  render();
}

function syncToolbar() {
  const technicianChip = document.getElementById("clear-technician");
  if (filters.technicianId) {
    technicianChip.hidden = false;
    technicianChip.textContent = `${findTechnician(filters.technicianId).name} ✕`;
    technicianChip.setAttribute("aria-label", "Remove technician filter");
  } else {
    technicianChip.hidden = true;
  }
  document.getElementById("clear-filters").hidden = !hasActiveFilters();
}

// ---------- Page ----------

function render() {
  // Most overdue first, then soonest due.
  const visibleOrders = orders.filter(matchesFilters).sort((a, b) => a.dueInDays - b.dueInDays);
  renderStats(visibleOrders);
  syncBuildingStrip();
  renderWorkload();
  renderOrders(visibleOrders);
  syncToolbar();
}

function start() {
  document.getElementById("today-label").textContent =
    `${today.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · ${BUILDINGS.length} buildings`;
  renderBuildingStrip();
  setUpToolbar();
  render();
}

start();
