// Two screens that change through the kit. The form shows its skeleton at once and its fields
// after a moment, the way a real screen loads its data.
import { changeScreen } from "./motion-kit.js";

const main = document.getElementById("main");
const add = (parent, tag, className, text) => {
  const node = parent.appendChild(document.createElement(tag));
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
};

function list(stage) {
  add(stage, "div", "band", "").appendChild(document.createElement("h1")).textContent = "Work orders";
  const rows = add(stage, "div", "rows tall");
  for (const name of ["Lift stuck between floors", "Leaking pipe in pantry", "Door reader offline"]) add(rows, "p", "", name);
}

function form(stage, { delay = 300 } = {}) {
  add(stage, "div", "band", "").appendChild(document.createElement("h1")).textContent = "New work order";
  const body = add(stage, "div", "rows");
  for (let index = 0; index < 3; index += 1) add(body, "div", "skeleton");
  setTimeout(() => {
    body.replaceChildren();
    for (const name of ["What needs doing", "Building", "Due"]) add(body, "p", "", name);
  }, delay);
}

list(main.appendChild(document.createElement("div")));
document.getElementById("open").addEventListener("click", () => changeScreen(main, (stage) => form(stage)));
document.getElementById("back").addEventListener("click", () => changeScreen(main, list));
window.kit = { changeScreen, main, list, form };
