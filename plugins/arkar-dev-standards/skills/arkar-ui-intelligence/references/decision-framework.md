# Decision framework

## 1. Classify the scope

Pick the narrowest scope that honestly covers AK's request.

| Scope | Typical request | Effort |
|---|---|---|
| Small component change | "make this button clearer", "add a column", "fix the dropdown" | no audit; fit the existing look; QA the component |
| Page improvement | "improve the claims page", "this page is confusing" | look at the page and its neighbours; improve that page only |
| Visual redesign | "redesign the dashboard", "make it look modern" | identity work for the screens named; behaviour unchanged |
| Full application modernization | "modernize the whole portal" | audit, strategy, design system, phased improvement |
| New product | "build a landing page / app / portal for …" | full discovery → design → build → verify |
| Technical frontend improvement | "it's slow", "refactor these components", "fix the build" | implementation and performance; no visual change unless asked |
| Motion / interaction enhancement | "add smooth animations", "make it feel premium" | motion language for the scope named |
| Responsive correction | "it breaks on phones", "fix the tablet layout" | responsive behaviour of the screens named |

A new page or screen set inside an existing product is **Mode A**: built
within the product's identity, with full craft. Choose by what AK asked for,
not by everything you could improve.

## 2. Choose the mode from evidence

| Evidence | Points to |
|---|---|
| Existing app with a `DESIGN.md`, a component library, consistent tokens or screens | **A · Preserve & improve** |
| Existing app whose look AK calls dated/ugly/plain, or asks to modernize/overhaul | **B · Modernize & transform** |
| Existing app with no real identity (default fonts, unstyled pages) **and** AK asked to improve it | **B** |
| Existing app with no real identity and AK asked for something else (a field, a fix) | **A** for the requested change; propose B as 🟠 |
| No code yet: a new product, app or site | **C · Create & innovate** |
| AK provides a Figma design | follow the Figma (A inside its language, or C built from it) |

When unclear, prefer the more conservative mode and say so.

## 3. What "within the request" means

- "Improve this page" → that page: hierarchy, spacing, type, states,
  responsiveness, motion, accessibility of **that page**.
- "Redesign the dashboard" → the dashboard's visual layer; content,
  behaviour, URLs and data stay the same.
- "Add X" → X, built to fit; neighbouring screens untouched.
- Everything else you notice (other pages, a global redesign, swapping the
  component library, behaviour changes, bugs) → the approval list, labelled
  🟢 SAFE or 🟠 CHANGES BEHAVIOUR, with what, why and the effect.

## 4. When to ask

Ask (one short question, with your recommendation) only when:

- two directions are equally defensible for a **new** product's identity and
  the choice is a real taste call AK would want to make;
- the request contradicts itself or the project (e.g. "keep the brand" but
  the brand fails contrast badly);
- the work would remove or change a workflow users rely on.

Otherwise decide, record the decision in `DESIGN.md` when it lasts, and
mention it in the final message.

## 5. Escalation signals during the work

Stop and reconsider the scope when:

- you're about to change a **shared token, global stylesheet, layout or
  shared component** that is used outside the named screens — that restyles
  other screens: propose it, or make a local variant;
- the change starts touching many files outside the screens named;
- you're about to replace a component library, framework or design system;
- you need a new dependency for something the platform already does;
- the UI must run against data that isn't clearly local or test.
