// Checks a running local page for the front-end and configuration findings a
// VAPT scan reports, plus what a scanner can't see from outside: personal
// data or tokens in the URL and browser storage. Findings are candidates —
// confirm each in the code before reporting; existing-code fixes are
// proposals (🟢 / 🟠), never applied without AK's OK.
//
// Usage (from the project folder; local URLs only):
//   node <path-to>/security-check.cjs <url> [<url> ...] [--steps <step> ...] [--code=<folder>] [--json]
// Steps run on the first URL before storage and the URL are inspected (same
// syntax as record.cjs: click=<selector> type=<selector>=<text> press=<key> wait=<ms>; a field can
// also be named by its label: type=label:Full name=Mei Ling),
// so a form can be filled to see what the page keeps.
// --code=<folder> also lists source lines to review (raw HTML output, eval,
// inline handlers, tokens in storage, public env variables with secret-like names).

const fs = require("node:fs");
const path = require("node:path");

function loadPlaywright() {
  const candidates = [path.join(process.cwd(), "node_modules", "playwright"), "playwright",
    path.join(require("node:os").homedir(), ".arkar", "playwright", "node_modules", "playwright")];
  for (const candidate of candidates) {
    try { return require(candidate); } catch { /* next */ }
  }
  console.error("Playwright not found. Install once: npm install --prefix ~/.arkar/playwright playwright && npx --prefix ~/.arkar/playwright playwright install chromium");
  process.exit(1);
}

function isLocalUrl(url) {
  const host = new URL(url).hostname;
  return ["localhost", "127.0.0.1", "[::1]"].includes(host) || host.endsWith(".test") || host.endsWith(".localhost");
}

// Personal data and secrets as they appear in Singapore business apps.
const SENSITIVE = [
  ["NRIC/FIN", /\b[STFGM]\d{7}[A-Z]\b/],
  ["email address", /[\w.+-]+@[\w-]+\.[\w.-]+/],
  ["phone number", /(?:\+65[\s-]?)?\b[689]\d{3}[\s-]?\d{4}\b/],
  ["token (JWT)", /\beyJ[\w-]{10,}\.[\w-]{10,}\.[\w-]{5,}/],
  ["card number", /\b(?:\d[ -]?){13,19}\b/],
];
const SENSITIVE_NAMES = /token|secret|password|passwd|session|auth|bearer|api[_-]?key|nric|fin\b|ic_?no|bank|card|salary/i;
const PERSONAL_PARAMS = /^(email|e-mail|phone|mobile|name|full_?name|nric|fin|ic|token|access_token|password|session|sid|ssn)$/i;

function luhn(digits) {
  let sum = 0;
  for (let index = 0; index < digits.length; index += 1) {
    let digit = Number(digits[digits.length - 1 - index]);
    if (index % 2 === 1) { digit *= 2; if (digit > 9) digit -= 9; }
    sum += digit;
  }
  return sum % 10 === 0;
}

function sensitiveIn(text) {
  const found = [];
  for (const [label, pattern] of SENSITIVE) {
    const match = String(text).match(pattern);
    if (!match) continue;
    if (label === "card number" && !luhn(match[0].replace(/\D/g, ""))) continue;
    found.push(label);
  }
  return found;
}

function headerFindings(url, headers) {
  const notes = [];
  const has = (name) => headers[name] !== undefined;
  const csp = headers["content-security-policy"] || "";
  if (!has("x-content-type-options")) notes.push(["X-Content-Type-Options Header Missing", "🟢", "add `X-Content-Type-Options: nosniff`"]);
  if (!has("x-frame-options") && !/frame-ancestors/.test(csp)) notes.push(["Missing Anti-clickjacking Header", "🟢/🟠", "`X-Frame-Options: DENY` or CSP `frame-ancestors 'self'` (🟠 if the app is embedded elsewhere)"]);
  if (!csp && !has("content-security-policy-report-only")) notes.push(["Content Security Policy (CSP) Header Not Set", "🟢 report-only first", "start with `Content-Security-Policy-Report-Only`"]);
  if (!has("permissions-policy")) notes.push(["Permissions Policy Header Not Set", "🟢", "`Permissions-Policy: camera=(), microphone=(), geolocation=()` (allow what the app uses)"]);
  if (url.startsWith("https:") && !has("strict-transport-security")) notes.push(["Strict-Transport-Security Header Not Set", "🟢 if HTTPS-only", "`Strict-Transport-Security: max-age=31536000`"]);
  if (/\d/.test(headers.server || "")) notes.push(["Server Leaks Version Information", "🟢", `\`Server: ${headers.server}\` — hide the version`]);
  if (has("x-powered-by")) notes.push(["Server Leaks Information via \"X-Powered-By\"", "🟢", `\`X-Powered-By: ${headers["x-powered-by"]}\` — remove it`]);
  return notes;
}

function cookieFindings(url, cookies) {
  const notes = [];
  for (const cookie of cookies) {
    const looksLikeSession = SENSITIVE_NAMES.test(cookie.name) || /sess|xsrf|csrf|laravel|django|sid/i.test(cookie.name);
    if (looksLikeSession && !cookie.httpOnly && !/xsrf|csrf/i.test(cookie.name)) notes.push(["Cookie No HttpOnly Flag", "🟢", `\`${cookie.name}\``]);
    if (url.startsWith("https:") && !cookie.secure) notes.push(["Cookie Without Secure Flag", "🟢", `\`${cookie.name}\``]);
    if (!cookie.sameSite || cookie.sameSite === "None") notes.push(["Cookie without SameSite Attribute", "🟢", `\`${cookie.name}\` (SameSite=${cookie.sameSite || "unset"})`]);
  }
  return notes;
}

async function exposedFiles(request, origin) {
  const notes = [];
  const probes = [[".env", /APP_KEY|DB_|SECRET|PASSWORD|=/], [".git/HEAD", /ref:/], [".git/config", /\[core\]/],
    ["composer.lock", /"packages"/], ["package-lock.json", /"lockfileVersion"/], ["phpinfo.php", /PHP Version/], ["backup.sql", /INSERT INTO|CREATE TABLE/i]];
  for (const [file, signature] of probes) {
    try {
      const response = await request.get(`${origin}/${file}`, { timeout: 5000, maxRedirects: 0 });
      if (response.status() === 200 && signature.test((await response.text()).slice(0, 4000))) {
        notes.push(["Hidden File Found", "🟢", `\`/${file}\` is served — serve only the public folder, block dotfiles`]);
      }
    } catch { /* unreachable is fine */ }
  }
  return notes;
}

function codeFindings(folder) {
  const rules = [
    ["raw HTML output", /innerHTML\s*[+]?=|insertAdjacentHTML|outerHTML\s*=|document\.write\(|dangerouslySetInnerHTML|v-html=|x-html=|\{!!|\|safe\b|mark_safe\(/],
    ["eval-style code", /\beval\(|new Function\(|setTimeout\(\s*["'`]/],
    ["inline event handler", /\son(click|load|submit|change|input|error|mouseover)\s*=\s*["']/i],
    ["token or secret in browser storage", /(localStorage|sessionStorage)\.setItem\([^)]*(token|password|secret|session|auth)/i],
    ["secret-like public env variable", /(VITE|NEXT_PUBLIC|MIX|REACT_APP)_[A-Z_]*(SECRET|PASSWORD|PRIVATE|TOKEN)/],
    ["certificate check disabled", /verify\s*=\s*False|rejectUnauthorized:\s*false|badCertificateCallback/],
  ];
  const skip = /node_modules|vendor|dist|build|\.git|qa-screenshots|\.dart_tool|storage\/framework/;
  const results = [];
  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (skip.test(full)) continue;
      if (entry.isDirectory()) walk(full);
      else if (/\.(js|jsx|ts|tsx|vue|svelte|html|php|py|dart)$/.test(entry.name) && fs.statSync(full).size < 500000) {
        fs.readFileSync(full, "utf8").split("\n").forEach((line, index) => {
          for (const [label, pattern] of rules) {
            if (pattern.test(line)) results.push([label, `${path.relative(folder, full)}:${index + 1}`, line.trim().slice(0, 120)]);
          }
        });
      }
    }
  };
  walk(folder);
  return results;
}

async function perform(page, raw) {
  const [action, ...rest] = raw.split("=");
  const value = rest.join("=");
  if (action === "click") await page.locator(value).first().click({ timeout: 5000 });
  else if (action === "press") await page.keyboard.press(value);
  else if (action === "wait") await page.waitForTimeout(Number(value));
  else if (action === "type") {
    // type=<selector>=<text>: the text follows the last "=", so selectors may contain "=";
    // label:<visible label> finds a field by its label.
    const split = value.lastIndexOf("=");
    const selector = value.slice(0, split);
    const field = selector.startsWith("label:") ? page.getByLabel(selector.slice(6)) : page.locator(selector);
    await field.first().fill(value.slice(split + 1), { timeout: 5000 });
  }
}

async function checkPage(context, url, steps) {
  const page = await context.newPage();
  const visited = new Set();
  const console_ = [];
  page.on("framenavigated", (frame) => { if (frame === page.mainFrame()) visited.add(frame.url()); });
  page.on("console", (message) => console_.push(message.text()));
  const scripts = [];
  page.on("response", (response) => { if (response.request().resourceType() === "script") scripts.push(response.url()); });
  const response = await page.goto(url, { waitUntil: "load" });
  await page.waitForTimeout(800);
  const errors = [];
  for (const step of steps) {
    try { await perform(page, step); await page.waitForTimeout(400); } catch (error) { errors.push(`${step}: ${String(error.message).split("\n")[0]}`); }
  }
  visited.add(page.url());
  const headers = response ? response.headers() : {};
  const notes = headerFindings(url, headers).map(([alert, label, fix]) => ({ area: "headers", alert, label, detail: fix }));
  cookieFindings(url, await context.cookies()).forEach(([alert, label, detail]) => notes.push({ area: "cookies", alert, label, detail }));
  const origin = new URL(url).origin;
  (await exposedFiles(context.request, origin)).forEach(([alert, label, detail]) => notes.push({ area: "exposure", alert, label, detail }));

  const dom = await page.evaluate(() => {
    const handlers = [...document.querySelectorAll("*")].flatMap((element) => [...element.attributes]
      .filter((attribute) => /^on[a-z]+$/.test(attribute.name)).map((attribute) => `<${element.tagName.toLowerCase()} ${attribute.name}>`));
    const inlineScripts = [...document.querySelectorAll("script:not([src])")]
      .filter((script) => !/json|template|importmap/.test(script.type || "") && script.textContent.trim().length > 0).length;
    const external = [...document.querySelectorAll("script[src], link[rel=stylesheet][href]")]
      .map((element) => ({ url: element.src || element.href, integrity: Boolean(element.integrity) }))
      .filter((item) => new URL(item.url, location.href).origin !== location.origin && !item.integrity).map((item) => item.url);
    const dump = (store) => { const out = {}; for (let index = 0; index < store.length; index += 1) { const key = store.key(index); out[key] = store.getItem(key); } return out; };
    let local = {}; let session = {};
    try { local = dump(localStorage); session = dump(sessionStorage); } catch { /* blocked */ }
    return { handlers: [...new Set(handlers)].slice(0, 8), inlineScripts, external, local, session };
  });
  if (dom.handlers.length) notes.push({ area: "csp-ready", alert: "Inline event handlers (block a CSP)", label: "fix in new code / 🟢", detail: dom.handlers.join(", ") });
  if (dom.inlineScripts) notes.push({ area: "csp-ready", alert: "Inline scripts (block a CSP)", label: "fix in new code / 🟢", detail: `${dom.inlineScripts} inline <script> block(s)` });
  dom.external.slice(0, 6).forEach((item) => notes.push({ area: "third-party", alert: "CDN file without integrity (SRI)", label: "🟢", detail: item }));
  for (const [storeName, store] of [["localStorage", dom.local], ["sessionStorage", dom.session]]) {
    for (const [key, value] of Object.entries(store)) {
      const kinds = sensitiveIn(value);
      if (SENSITIVE_NAMES.test(key)) kinds.unshift("sensitive key name");
      if (!kinds.length) continue;
      const tooSensitive = storeName === "localStorage" || kinds.some((kind) => /token|NRIC|card|key name/.test(kind));
      if (tooSensitive) notes.push({ area: "storage", alert: `Personal data or secrets in ${storeName}`, label: "fix in new code / 🟢", detail: `key \`${key}\`: ${[...new Set(kinds)].join(", ")}` });
    }
  }
  for (const visitedUrl of visited) {
    let parsed;
    try { parsed = new URL(visitedUrl); } catch { continue; }
    for (const [name, value] of parsed.searchParams) {
      const kinds = sensitiveIn(value);
      if (PERSONAL_PARAMS.test(name)) kinds.unshift(`parameter named "${name}"`);
      if (kinds.length) notes.push({ area: "url", alert: "Personal data or secrets in the URL", label: "fix in new code / 🟢", detail: `?${name}=… (${[...new Set(kinds)].join(", ")})` });
    }
  }
  for (const scriptUrl of [...new Set(scripts)].filter((item) => item.startsWith(origin)).slice(0, 20)) {
    try {
      const map = await context.request.get(`${scriptUrl.split("?")[0]}.map`, { timeout: 5000 });
      if (map.status() === 200 && /"mappings"/.test((await map.text()).slice(0, 2000))) {
        notes.push({ area: "build", alert: "Source map served", label: "🟢", detail: `${new URL(scriptUrl).pathname}.map — turn off or don't serve in production` });
      }
    } catch { /* fine */ }
  }
  const leaky = console_.filter((text) => sensitiveIn(text).some((kind) => /token|NRIC|card/.test(kind)));
  if (leaky.length) notes.push({ area: "build", alert: "Sensitive values in console output", label: "fix in new code / 🟢", detail: `${leaky.length} message(s)` });
  await page.close();
  return { url, status: response ? response.status() : null, notes, stepErrors: errors };
}

async function main() {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const codeFlag = args.find((arg) => arg.startsWith("--code="));
  const stepsAt = args.indexOf("--steps");
  const steps = stepsAt >= 0 ? args.slice(stepsAt + 1).filter((arg) => !arg.startsWith("--")) : [];
  const urls = (stepsAt >= 0 ? args.slice(0, stepsAt) : args).filter((arg) => !arg.startsWith("--"));
  if (!urls.length && !codeFlag) {
    console.error("Usage: node security-check.cjs <url> [<url> ...] [--steps <step> ...] [--code=<folder>] [--json]");
    process.exit(1);
  }
  const refused = urls.filter((url) => !isLocalUrl(url));
  if (refused.length) {
    console.error(`Refusing: security checks run against a local app only (localhost / 127.0.0.1 / *.test): ${refused.join(", ")}`);
    process.exit(1);
  }
  const pages = [];
  if (urls.length) {
    const { chromium } = loadPlaywright();
    const browser = await chromium.launch();
    for (const [index, url] of urls.entries()) {
      const context = await browser.newContext();  // fresh storage and cookies per page
      pages.push(await checkPage(context, url, index === 0 ? steps : []));
      await context.close();
    }
    await browser.close();
  }
  const code = codeFlag ? codeFindings(path.resolve(codeFlag.slice(7))) : [];
  if (json) {
    console.log(JSON.stringify({ pages, code }));
    return;
  }
  for (const result of pages) {
    console.log(`\n${result.url} (HTTP ${result.status})`);
    if (!result.notes.length) console.log("  no findings");
    for (const note of result.notes) console.log(`  - [${note.area}] ${note.alert} — ${note.detail} (${note.label})`);
    result.stepErrors.forEach((error) => console.log(`  ! step failed: ${error}`));
  }
  if (codeFlag) {
    console.log(`\nSource lines to review (${code.length}) — candidates, not verdicts:`);
    code.slice(0, 60).forEach(([label, where, line]) => console.log(`  - ${label}: ${where}  ${line}`));
    if (code.length > 60) console.log(`  … ${code.length - 60} more`);
  }
  console.log("\nConfirm each finding in the code. New code: fix it. Existing code: propose it (🟢 / 🟠) and wait for AK.");
}

main().catch((error) => { console.error(error); process.exit(1); });
