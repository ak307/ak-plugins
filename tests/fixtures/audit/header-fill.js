// Fills both header fixtures with the same long page: headings, text and links to Tab through.
const content = document.getElementById("content");
for (let section = 1; section <= 14; section += 1) {
  const heading = content.appendChild(document.createElement("h2"));
  heading.textContent = `Section ${section}: who is driving the overrun`;
  const text = content.appendChild(document.createElement("p"));
  text.textContent = "Harbour Tower accounts for most of it, mostly cooling and chillers running through the night. ".repeat(3);
  const link = content.appendChild(document.createElement("a"));
  link.href = `#section-${section}`;
  link.textContent = `Open section ${section}`;
}

// ?tint=0.96 makes the floating bar solid, to test a dark bar over a light page on its own.
const tint = new URLSearchParams(location.search).get("tint");
if (tint) document.documentElement.style.setProperty("--tint", tint);

// ?drops makes the bar drop its own button a little further down the page — as a bar does when the
// page's own action comes into view — to test that the bar changing itself is not read as the page showing through.
if (new URLSearchParams(location.search).has("drops")) {
  const button = document.querySelector("header button");
  addEventListener("scroll", () => { button.hidden = scrollY > 615; }, { passive: true });
}
