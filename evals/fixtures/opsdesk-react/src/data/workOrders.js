import { createStore } from "./api.js";

const BUILDINGS = ["Marina Point", "Tanjong Plaza", "Novena Court", "Jurong Hub", "Bishan Grove", "Changi Logis"];
const TRADES = ["Electrical", "Plumbing", "HVAC", "Lift", "Fire safety", "Cleaning"];
const TITLES = ["Lift stuck between floors", "Leaking pipe in pantry", "Aircon not cooling", "Lights flickering in lobby",
  "Fire alarm panel fault", "Blocked drain at loading bay", "Door access reader offline", "Water heater tripping",
  "Ceiling stain after rain", "Generator test overdue", "Car park barrier jammed", "Toilet flush broken"];
const STATUSES = ["open", "open", "in_progress", "in_progress", "on_hold", "done"];
const PRIORITIES = ["urgent", "high", "normal", "normal", "low"];

const seed = Array.from({ length: 28 }, (_, index) => ({
  id: `WO-${4810 + index}`,
  title: TITLES[index % TITLES.length],
  building: BUILDINGS[index % BUILDINGS.length],
  trade: TRADES[(index * 5) % TRADES.length],
  status: STATUSES[(index * 7) % STATUSES.length],
  priority: PRIORITIES[(index * 3) % PRIORITIES.length],
  reported: new Date(Date.UTC(2026, 10, 10 - (index % 9), 8 + (index % 9))).toISOString(),
  notes: "",
}));

export const workOrders = createStore("work-orders", seed);
export const STATUS_LABELS = { open: "Open", in_progress: "In progress", on_hold: "On hold", done: "Done" };
export const STATUS_TONES = { open: "info", in_progress: "accent", on_hold: "warning", done: "success" };
export const PRIORITY_TONES = { urgent: "danger", high: "warning", normal: "neutral", low: "neutral" };
export { BUILDINGS, TRADES };
