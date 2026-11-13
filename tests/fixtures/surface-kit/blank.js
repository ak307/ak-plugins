// The driver chooses the page's language and direction, then builds what each test needs.
import * as kit from "./surface-kit.js";
const query = new URLSearchParams(location.search);
document.documentElement.lang = query.get("lang") || "en";
document.documentElement.dir = query.get("dir") || "ltr";
window.kit = kit;
