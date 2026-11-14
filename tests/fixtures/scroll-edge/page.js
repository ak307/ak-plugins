// A long page under a pinned bar: headings to jump to and links to Tab through.
// ?theme=dark switches the theme; ?inner=1 makes an element, not the window, the scroller.
import { scrollEdge } from "./experience-kit.js";

const query = new URLSearchParams(location.search);
if (query.get("theme")) document.documentElement.dataset.theme = query.get("theme");
const inner = query.has("inner");
if (inner) document.documentElement.classList.add("inner");

const content = document.getElementById("content");
for (let section = 1; section <= 14; section += 1) {
  const heading = content.appendChild(document.createElement("h2"));
  heading.id = `section-${section}`;
  heading.textContent = `Section ${section}: isolation and fire watch`;
  const text = content.appendChild(document.createElement("p"));
  text.textContent = "The fire watch stays for sixty minutes after the last spark, and the permit is not closed before that. ".repeat(3);
  const link = content.appendChild(document.createElement("a"));
  link.href = `#section-${Math.min(14, section + 1)}`;
  link.textContent = `Go to section ${Math.min(14, section + 1)}`;
}

window.scroller = inner ? document.getElementById("scroller") : document.scrollingElement;
window.stopEdge = scrollEdge(document.getElementById("bar"), { title: "#title", scroller: inner ? window.scroller : undefined });
