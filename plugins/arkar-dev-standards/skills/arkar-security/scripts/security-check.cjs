// Checks a running local page for the front-end and configuration findings a
// VAPT scan reports, plus what a scanner can't see from outside: personal
// data or tokens in the URL and browser storage. Findings are candidates —
// confirm each in the code before reporting; existing-code fixes are
// proposals (🟢 / 🟠), never applied without AK's OK.
//
// Usage (from the project folder; local URLs only):
//   node <path-to>/security-check.cjs <url> [<url> ...] [--steps <step> ...] [--code=<folder>] [--json]
//   node <path-to>/security-check.cjs <url> [<url> ...] --readiness [--paths=/admin,/debug-tool] [--json]
// --readiness is the pass before a VAPT (references/vapt-readiness.md): besides the page checks it asks the
// site, once, what an outsider's scanner asks — are cross-origin requests allowed, is TRACE on, does a missing
// page show debug details, which docs, admin and debug paths answer without signing in, which more files are
// served — and lists the JavaScript libraries on each page with their versions. --paths adds the paths this
// project's own stack has (work them out from its dependencies and routes); the built-in list is only what
// any stack can have.
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

// What makes a Content-Security-Policy weak enough to be reported although the header is set.
function weakCsp(csp) {
  if (!csp) return [];
  const directives = {};
  for (const part of csp.split(";")) {
    const words = part.trim().split(/\s+/);
    if (words[0]) directives[words[0].toLowerCase()] = words.slice(1);
  }
  const scripts = directives["script-src"] || directives["default-src"];
  if (!scripts) return ["no script-src or default-src"];
  // With a nonce, a hash or strict-dynamic, browsers ignore 'unsafe-inline'.
  const guarded = scripts.some((source) => /^'(nonce-|sha(256|384|512)-|strict-dynamic)/.test(source));
  const weak = [];
  if (scripts.includes("'unsafe-inline'") && !guarded) weak.push("scripts allow 'unsafe-inline'");
  if (scripts.includes("'unsafe-eval'")) weak.push("scripts allow 'unsafe-eval'");
  const wide = scripts.filter((source) => ["*", "http:", "https:", "data:"].includes(source));
  if (wide.length) weak.push(`scripts allowed from ${wide.join(" ")}`);
  return weak;
}

function headerFindings(url, headers) {
  const notes = [];
  const has = (name) => headers[name] !== undefined;
  const csp = headers["content-security-policy"] || "";
  const weak = weakCsp(csp);
  if (weak.length) notes.push(["Content Security Policy allows unsafe sources", "🟠", `${weak.join("; ")} — tighten in steps (nonces or hashes for inline code)`]);
  if (!has("referrer-policy")) notes.push(["Referrer-Policy Header Not Set", "🟢", "`Referrer-Policy: strict-origin-when-cross-origin`"]);
  if (!has("x-content-type-options")) notes.push(["X-Content-Type-Options Header Missing", "🟢", "add `X-Content-Type-Options: nosniff`"]);
  if (!has("x-frame-options") && !/frame-ancestors/.test(csp)) notes.push(["Missing Anti-clickjacking Header", "🟢/🟠", "`X-Frame-Options: DENY` or CSP `frame-ancestors 'self'` (🟠 if the app is embedded elsewhere)"]);
  if (!csp && !has("content-security-policy-report-only")) notes.push(["Content Security Policy (CSP) Header Not Set", "🟢 report-only first", "start with `Content-Security-Policy-Report-Only`"]);
  if (!has("permissions-policy")) notes.push(["Permissions Policy Header Not Set", "🟢", "`Permissions-Policy: camera=(), microphone=(), geolocation=()` (allow what the app uses)"]);
  if (url.startsWith("https:") && !has("strict-transport-security")) notes.push(["Strict-Transport-Security Header Not Set", "🟢 if HTTPS-only", "`Strict-Transport-Security: max-age=31536000`"]);
  if (/\d/.test(headers.server || "")) notes.push(["Server Leaks Version Information", "🟢", `\`Server: ${headers.server}\` — hide the version`]);
  if (has("x-powered-by")) notes.push(["Server Leaks Information via \"X-Powered-By\"", "🟢", `\`X-Powered-By: ${headers["x-powered-by"]}\` — remove it`]);
  return notes;
}

function isCsrfCookie(cookie) {
  return /xsrf|csrf/i.test(cookie.name);
}

function looksLikeSessionCookie(cookie) {
  return SENSITIVE_NAMES.test(cookie.name) || /sess|xsrf|csrf|laravel|django|sid/i.test(cookie.name);
}

function cookieFindings(url, cookies) {
  const notes = [];
  for (const cookie of cookies) {
    if (looksLikeSessionCookie(cookie) && !cookie.httpOnly && !isCsrfCookie(cookie)) notes.push(["Cookie No HttpOnly Flag", "🟢", `\`${cookie.name}\``]);
    if (url.startsWith("https:") && !cookie.secure) notes.push(["Cookie Without Secure Flag", "🟢", `\`${cookie.name}\``]);
    if (!cookie.sameSite || cookie.sameSite === "None") notes.push(["Cookie without SameSite Attribute", "🟢", `\`${cookie.name}\` (SameSite=${cookie.sameSite || "unset"})`]);
  }
  return notes;
}

// Each file is reported only when the answer looks like that file, so an app that answers every path with
// its own page is not reported.
const EXPOSED_FILES = [[".env", /APP_KEY|DB_|SECRET|PASSWORD|=/], [".git/HEAD", /ref:/], [".git/config", /\[core\]/],
  ["composer.lock", /"packages"/], ["package-lock.json", /"lockfileVersion"/], ["phpinfo.php", /PHP Version/], ["backup.sql", /INSERT INTO|CREATE TABLE/i]];
const MORE_EXPOSED_FILES = [
  [".env.local", /^[A-Z][A-Z0-9_]*=/m], [".env.production", /^[A-Z][A-Z0-9_]*=/m], [".env.backup", /^[A-Z][A-Z0-9_]*=/m],
  [".svn/entries", /^\d+\s|svn/], [".DS_Store", /Bud1/], [".htaccess", /RewriteEngine|Require |Deny from|Options /], ["web.config", /<configuration/],
  ["composer.json", /"require"/], ["package.json", /"(dependencies|scripts)"/], ["Dockerfile", /^FROM\s/m], ["docker-compose.yml", /^services:/m],
  ["appsettings.json", /ConnectionStrings|"Logging"/], ["config.json", /"(password|secret|key|token)"/i], ["info.php", /PHP Version/],
  ["dump.sql", /INSERT INTO|CREATE TABLE/i], ["database.sql", /INSERT INTO|CREATE TABLE/i], ["db.sqlite3", /^SQLite format 3/], ["database.sqlite", /^SQLite format 3/],
  ["debug.log", /\b(error|warning|exception|traceback)\b/i], ["error_log", /\b(error|warning|notice)\b/i], ["storage/logs/laravel.log", /\[\d{4}-\d{2}-\d{2}/],
];

async function exposedFiles(request, origin, probes) {
  const notes = [];
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

// Paths that any stack can leave reachable. A project's own debug and admin tools come in through --paths.
const COMMON_PATHS = [["docs", /swagger|redoc|openapi/i], ["redoc", /redoc/i], ["openapi.json", /"(openapi|swagger)"/], ["swagger", /swagger/i],
  ["swagger-ui.html", /swagger/i], ["swagger/index.html", /swagger/i], ["api-docs", /swagger|"openapi"/i],
  ["server-status", /Apache Server Status/i], ["server-info", /Apache Server Information/i], ["phpmyadmin/", /phpMyAdmin/i], ["adminer.php", /Adminer/i]];
// What a framework's debug page, a stack trace or a database error looks like in a response.
const DEBUG_DETAILS = [
  ["a stack trace", /Traceback \(most recent call last\)|Stack trace:|\bat [\w.$<>]+\([\w.]+\.(java|kt|cs|scala):\d+\)|^\s+at .+ \(.+:\d+:\d+\)$|#\d+ .+\.php\(\d+\)/m],
  ["a framework debug page", /Whoops, looks like something went wrong|Ignition|DEBUG = True|Werkzeug Debugger|Server Error in '\/' Application|Whitelabel Error Page|Symfony\\Component|laravel\\framework|django\.core/i],
  ["a database error", /SQLSTATE\[|ORA-\d{5}|You have an error in your SQL syntax|psycopg\.|sqlite3\.OperationalError|System\.Data\.SqlClient/],
  ["a file path on the server", /(\/var\/www\/|\/home\/\w+\/|[A-Z]:\\(inetpub|Users|xampp)\\)[\w./\\-]+\.(php|py|js|rb|cs|java)/],
];

async function fetchBody(request, url, options = {}) {
  try {
    const response = await request.fetch(url, { timeout: 5000, maxRedirects: 0, ...options });
    return { status: response.status(), headers: response.headers(), body: (await response.text()).slice(0, 20000) };
  } catch {
    return null;
  }
}

// Two answers are the same page when they differ only in numbers and ids (timestamps, nonces).
function samePage(one, other) {
  const plain = (text) => text.replace(/[0-9a-f]{8,}|\d+/gi, "");
  return plain(one) === plain(other);
}

async function siteFindings(request, origin, firstUrl, extraPaths) {
  const notes = [];
  const add = (area, alert, label, detail) => notes.push({ area, alert, label, detail });
  const missing = await fetchBody(request, `${origin}/arkar-check-${Date.now()}-not-here`);

  const shown = missing ? DEBUG_DETAILS.filter(([, pattern]) => pattern.test(missing.body)).map(([what]) => what) : [];
  if (shown.length) add("errors", "Error page shows debug details", "🟢", `a missing page answers with ${shown.join(", ")} — production must show a plain error page (debug off)`);

  const foreign = "https://cross-origin-check.invalid";
  const crossOrigin = await fetchBody(request, firstUrl, { headers: { Origin: foreign } });
  if (crossOrigin) {
    const allowed = crossOrigin.headers["access-control-allow-origin"];
    const withCredentials = crossOrigin.headers["access-control-allow-credentials"] === "true";
    if (allowed === foreign || allowed === "null" || (allowed === "*" && withCredentials)) {
      add("cors", "Cross-origin requests allowed from any site (CORS)", "🟠", `the site answered an unknown origin with Access-Control-Allow-Origin: ${allowed}${withCredentials ? " and credentials allowed" : ""} — name the allowed origins`);
    } else if (allowed === "*") {
      add("cors", "Any site may read this response (CORS *)", "🟠 if it carries data", "fine for public files; an API or a signed-in page must name its origins");
    }
  }

  const trace = await fetchBody(request, `${origin}/`, { method: "TRACE" });
  if (trace && trace.status === 200) add("server", "TRACE method enabled", "🟢", "switch TRACE off in the web server");

  const isCatchAll = (answer) => Boolean(missing) && missing.status === 200 && samePage(answer.body, missing.body);
  const common = new Map(COMMON_PATHS);
  const paths = [...new Set([...common.keys(), ...extraPaths.map((item) => item.replace(/^\/+/, ""))])];
  for (const item of paths) {
    const answer = await fetchBody(request, `${origin}/${item}`);
    if (!answer || answer.status !== 200 || isCatchAll(answer)) continue;
    if (common.has(item) && !extraPaths.includes(`/${item}`) && !common.get(item).test(answer.body)) continue;
    add("exposure", "Reachable without signing in", "🟢 if it should not be public", `\`/${item}\` answers HTTP 200 to a visitor who is not signed in — docs, admin and debug tools are off or behind sign-in in production`);
  }

  (await exposedFiles(request, origin, MORE_EXPOSED_FILES)).forEach(([alert, label, detail]) => add("exposure", alert, label, detail));
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
    ["SQL built from variables", /\b(SELECT|INSERT INTO|UPDATE|DELETE FROM)\b[^;\n]*(["']\s*[.+]\s*\$?\w|\{\$?\w+[^}]*\}|\$\{)/],
    ["command run through a shell", /shell\s*=\s*True|\bos\.system\(|\b(shell_exec|passthru|proc_open|popen)\s*\(|\b(exec|system)\s*\([^)]*\$|child_process|Runtime\.getRuntime\(\)\.exec|Process\.Start\(/],
    ["unsafe deserialisation", /\bunserialize\s*\(|pickle\.loads?\(|yaml\.load\((?![^)]*Safe)|ObjectInputStream|BinaryFormatter|Marshal\.load\(/],
    ["debug switched on in code", /\bDEBUG\s*=\s*True\b|display_errors['"]\s*,\s*['"]?(1|on)|['"]debug['"]\s*=>\s*true|debug\s*=\s*True\)/i],
  ];
  const skip = /node_modules|vendor|dist|build|\.git|qa-screenshots|\.dart_tool|storage\/framework/;
  const results = [];
  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (skip.test(full)) continue;
      if (entry.isDirectory()) walk(full);
      else if (/\.(js|jsx|ts|tsx|vue|svelte|html|php|py|dart|rb|go|java|kt|cs|cshtml|jsp|erb|ejs|twig|rs|swift|scala)$/.test(entry.name) && fs.statSync(full).size < 500000) {
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

async function checkPage(context, url, steps, readiness) {
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
  const cookies = await context.cookies();
  cookieFindings(url, cookies).forEach(([alert, label, detail]) => notes.push({ area: "cookies", alert, label, detail }));
  if (cookies.some((cookie) => looksLikeSessionCookie(cookie) && !isCsrfCookie(cookie)) && !/no-store/.test(headers["cache-control"] || "")) {
    notes.push({ area: "caching", alert: "Page with a session may be cached (Cache-Control)", label: "🟢 for signed-in pages", detail: "if this page shows a signed-in user's data, send `Cache-Control: no-store`" });
  }
  const origin = new URL(url).origin;
  (await exposedFiles(context.request, origin, EXPOSED_FILES)).forEach(([alert, label, detail]) => notes.push({ area: "exposure", alert, label, detail }));

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
    const method = (form) => (form.getAttribute("method") || "get").toLowerCase();
    const hasToken = (form) => [...form.querySelectorAll("input[type=hidden]")].some((input) => /csrf|_token|xsrf|authenticity|requestverification/i.test(input.name));
    const forms = [...document.querySelectorAll("form")];
    const postWithoutToken = forms.filter((form) => method(form) === "post" && !hasToken(form)).length;
    const tokenInPage = Boolean(document.querySelector("meta[name*=csrf i], meta[name*=xsrf i]"));
    const passwordByGet = forms.filter((form) => method(form) !== "post" && form.querySelector("input[type=password]")).length;
    // Libraries that say their own version, and script files with a version in the name.
    const libraries = [];
    const told = (name, read) => { try { const version = read(); if (version) libraries.push(`${name} ${version}`); } catch { /* not on this page */ } };
    told("jQuery", () => window.jQuery.fn.jquery);
    told("jQuery UI", () => window.jQuery.ui.version);
    told("Bootstrap", () => (window.bootstrap && window.bootstrap.Tooltip.VERSION) || window.jQuery.fn.tooltip.Constructor.VERSION);
    told("AngularJS", () => window.angular.version.full);
    told("Lodash", () => window._.VERSION);
    told("Moment.js", () => window.moment.version);
    told("Vue", () => window.Vue.version);
    told("React", () => window.React.version);
    told("Handlebars", () => window.Handlebars.VERSION);
    told("DOMPurify", () => window.DOMPurify.version);
    told("Axios", () => window.axios.VERSION);
    told("Backbone", () => window.Backbone.VERSION);
    told("Knockout", () => window.ko.version);
    const versioned = [...document.querySelectorAll("script[src]")].map((script) => script.src.split("?")[0].split("/").pop())
      .filter((file) => /[-.@]\d+\.\d+(\.\d+)?/.test(file));
    return { handlers: [...new Set(handlers)].slice(0, 8), inlineScripts, external, local, session, postWithoutToken, tokenInPage, passwordByGet,
      libraries: [...new Set([...libraries, ...versioned])].slice(0, 20) };
  });
  if (dom.postWithoutToken && !dom.tokenInPage && !cookies.some(isCsrfCookie)) {
    notes.push({ area: "forms", alert: "State-changing form without an anti-CSRF token", label: "confirm in code — 🟢 for forms that should have it", detail: `${dom.postWithoutToken} POST form(s) with no token field, and no token in the page or a cookie` });
  }
  if (dom.passwordByGet) notes.push({ area: "forms", alert: "Password sent in the URL (form uses GET)", label: "fix in new code / 🟢", detail: `${dom.passwordByGet} form(s) with a password field and no method="post"` });
  if (readiness && dom.libraries.length) {
    notes.push({ area: "components", alert: "JavaScript libraries on the page — check each version", label: "patch or minor update 🟢, major 🟠", detail: `${dom.libraries.join(", ")} — look each up in the live advisory source; an old copy in the public folder is not seen by the package audit` });
  }
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
  const readiness = args.includes("--readiness");
  const pathsFlag = args.find((arg) => arg.startsWith("--paths="));
  const extraPaths = pathsFlag ? pathsFlag.slice(8).split(",").map((item) => `/${item.trim().replace(/^\/+/, "")}`).filter((item) => item.length > 1) : [];
  if (!urls.length && !codeFlag) {
    console.error("Usage: node security-check.cjs <url> [<url> ...] [--steps <step> ...] [--readiness] [--paths=/a,/b] [--code=<folder>] [--json]");
    process.exit(1);
  }
  const refused = urls.filter((url) => !isLocalUrl(url));
  if (refused.length) {
    console.error(`Refusing: security checks run against a local app only (localhost / 127.0.0.1 / *.test): ${refused.join(", ")}`);
    process.exit(1);
  }
  const pages = [];
  const sites = [];
  if (urls.length) {
    const { chromium } = loadPlaywright();
    const browser = await chromium.launch();
    for (const [index, url] of urls.entries()) {
      const context = await browser.newContext();  // fresh storage and cookies per page
      pages.push(await checkPage(context, url, index === 0 ? steps : [], readiness));
      await context.close();
    }
    if (readiness) {
      // Once per site, as a visitor who is not signed in.
      for (const origin of new Set(urls.map((url) => new URL(url).origin))) {
        const context = await browser.newContext();
        const firstUrl = urls.find((url) => new URL(url).origin === origin);
        sites.push({ origin, notes: await siteFindings(context.request, origin, firstUrl, extraPaths) });
        await context.close();
      }
    }
    await browser.close();
  }
  const code = codeFlag ? codeFindings(path.resolve(codeFlag.slice(7))) : [];
  if (json) {
    console.log(JSON.stringify({ pages, sites, code }));
    return;
  }
  for (const result of pages) {
    console.log(`\n${result.url} (HTTP ${result.status})`);
    if (!result.notes.length) console.log("  no findings");
    for (const note of result.notes) console.log(`  - [${note.area}] ${note.alert} — ${note.detail} (${note.label})`);
    result.stepErrors.forEach((error) => console.log(`  ! step failed: ${error}`));
  }
  for (const site of sites) {
    console.log(`\n${site.origin} — the whole site, as a visitor who is not signed in`);
    if (!site.notes.length) console.log("  no findings");
    for (const note of site.notes) console.log(`  - [${note.area}] ${note.alert} — ${note.detail} (${note.label})`);
  }
  if (readiness) {
    console.log("\nNot visible from a local run: HTTPS and its redirect, TLS versions, HSTS on the real host and the web server's own settings — references/vapt-readiness.md has the server checklist for AK.");
  }
  if (codeFlag) {
    console.log(`\nSource lines to review (${code.length}) — candidates, not verdicts:`);
    code.slice(0, 60).forEach(([label, where, line]) => console.log(`  - ${label}: ${where}  ${line}`));
    if (code.length > 60) console.log(`  … ${code.length - 60} more`);
  }
  console.log("\nConfirm each finding in the code. New code: fix it. Existing code: propose it (🟢 / 🟠) and wait for AK.");
}

main().catch((error) => { console.error(error); process.exit(1); });
