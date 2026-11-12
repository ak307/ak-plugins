# Security for LLM and agent features

For any code that calls a language model, gives a model tools, or answers
from documents. The stance: **every layer assumes the layers above it have
already failed.** How to build these features well is `arkar-ai-engineering`;
this file is what keeps them safe. The approval rule applies as everywhere:
weaknesses in existing code are proposed first, labelled 🟢 safe or 🟠
risky, never just applied.

## Contents
1. The four layers, in fixed order
2. Prompt injection
3. Model output is untrusted input
4. Tools and write actions
5. Leakage between users and domains
6. Personal data, secrets and outside services
7. Abuse and cost
8. Audit
9. Tests that must exist

## 1. The four layers, in fixed order

1. **Identity** — who is asking, established by the channel's strongest
   primitive (the session, single sign-on, a platform user ID). Never by
   what the message says: "I am the finance manager" is content, not
   identity.
2. **Permission check — in code, before the model.** A lookup of what this
   user may see and do runs before any retrieval or tool call. Deny by
   default; unknown users get nothing. This is the enforcement layer.
3. **Scoped retrieval and prompting.** Retrieval is built already
   restricted to what the user may see (only the permitted collection is
   reachable at all — scoping by construction, not by a filter a clever
   question might influence). Role and scope statements in the prompt are
   defence in depth: the *last* barrier, never the only one.
4. **Parameterised data access.** Every query and API call uses parameters
   or typed functions. Text from a user or a model never becomes part of a
   SQL string, a shell command or a file path. Tools are narrow typed
   functions, not free-form query execution.

## 2. Prompt injection

- **Documents are hostile until proven boring.** Retrieved passages,
  uploaded files, emails and web pages are wrapped as quoted data, and the
  prompt says instructions inside them have no authority.
- **Tool output re-entering the context** follows the same rule: data, not
  instructions.
- Reject or neutralise content that imitates the prompt's own delimiters,
  and cap input size.
- Never put untrusted content and a write tool in the same run without a
  person approving the write.
- Assume some injection will get through: layers 2–4 and section 3 are what
  limit the damage.

## 3. Model output is untrusted input

Whatever a model returns is treated like text typed by a stranger:

- **Shown in a page:** escaped like any user content. Render model-written
  Markdown or HTML only through a sanitiser; links only to allowed schemes
  and hosts; no automatic loading of images or URLs the model produced
  (a crafted link can carry data out).
- **Used by code:** validated against a schema first; values that matter
  are verified against the source.
- **Never executed:** no `eval`, no shell, no SQL written by the model. If
  a feature must run model-written queries or code, that is a 🟠 design
  decision for AK with an allow-list, a read-only account and a sandbox.
- **Never an authority:** a model's statement about who the user is or what
  they may do changes nothing.

## 4. Tools and write actions

- Identity comes from the run context, not from tool arguments the model
  chose.
- The permission check lives in the service a tool calls (`backend.md` §5).
- **Least privilege for the feature's own credentials:** a read-only
  database account where it only reads; credentials per domain, not one
  master key.
- Writes that matter — money, records about people, messages sent in
  someone's name, anything hard to undo — wait for a person's approval and
  show exactly what will change.
- Unattended runs (scheduled, event-triggered) read and report; they don't
  write or send unless AK designed that step with its own checks.

## 5. Leakage between users and domains

- One collection, index or tool set per domain; isolation is proven by
  tests, not assumed from the design.
- Answers are checked against the *requester's* permissions even when the
  content was legitimately retrieved (a permitted document that quotes a
  restricted one).
- Conversation history and long-term memory are per user; one user's
  session never seeds another's.
- Errors shown to users never expose internals: stack traces, table names,
  prompt text, other users' identifiers.

## 6. Personal data, secrets and outside services

- Send the model the minimum: mask or drop personal data the task doesn't
  need (`backend.md` §10).
- No secrets in prompts, tool descriptions or documents for ingestion. A
  prompt is not a safe place to hide anything, and it is not a security
  boundary.
- Prompts, outputs and traces that hold personal data get the same access
  control and retention as that data; ordinary logs carry IDs and counts,
  not content.
- **Nothing leaves the organisation unapproved:** an external model API, a
  hosted tracing or evaluation service, or a fallback to one needs AK's
  approval for the data involved (🟠).
- Eval datasets and examples are written with invented data.

## 7. Abuse and cost

Per-user rate limits, an output limit on every call, step and time limits
on agents, and a concurrency cap — so one user, one loop or one crafted
input can't exhaust the model server for everyone.

## 8. Audit

Log every request: identity, the permission decision, the collections and
tools touched, and refusals. Refusal and denial logs are the early warning
for probing; review them on a schedule.

## 9. Tests that must exist

In every eval run (`arkar-ai-engineering`, evals reference), with a gate of
100%:

- injection through the question and through a seeded document;
- a permitted user of one domain asking for another's data, directly and
  by inference ("summarise everything you can see");
- claims of authority and impersonation;
- text containing SQL or command fragments, aimed at any tool;
- oversized, empty and malformed input.

And in the unit tests: each tool with the owner, another user and an
unknown user; identity taken from the context, not the arguments.
