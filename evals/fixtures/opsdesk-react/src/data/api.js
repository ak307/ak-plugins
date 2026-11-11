// Mock server: realistic latency and the standard ?latency=slow / ?fail=1 switches on every request.
const params = () => new URLSearchParams(window.location.search);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const attempts = new Map();

export async function request(operation, run) {
  const latency = params().get("latency");
  const ms = latency === "slow" ? 3000 + Math.random() * 5000 : latency === "fast" ? 0 : 200 + Math.random() * 1000;
  await wait(ms);
  const tries = (attempts.get(operation) || 0) + 1;
  attempts.set(operation, tries);
  const fail = params().get("fail");
  if (fail === "always" || (fail === "1" && tries === 1)) {
    throw new Error(`Couldn't ${operation}. Check the connection and try again.`);
  }
  return run();
}

export function createStore(name, seed) {
  const key = `mock:${name}`;
  let rows;
  try { rows = JSON.parse(localStorage.getItem(key)) ?? structuredClone(seed); } catch { rows = structuredClone(seed); }
  const save = () => { try { localStorage.setItem(key, JSON.stringify(rows)); } catch { /* private mode */ } };
  return {
    list: () => request(`load ${name}`, () => structuredClone(rows)),
    insert: (row) => request(`save ${name}`, () => { rows = [row, ...rows]; save(); return row; }),
    update: (id, changes) => request(`save ${name}`, () => {
      rows = rows.map((row) => (row.id === id ? { ...row, ...changes } : row));
      save();
      return rows.find((row) => row.id === id);
    }),
  };
}
