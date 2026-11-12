# Tools and agents

## Contents
1. Tools
2. Agent limits
3. Conversation, context and memory
4. Checking and escalation
5. Unattended runs
6. Testing
7. Framework notes

## 1. Tools

A tool is the only way a model touches the system, so tools are where
correctness and permissions are enforced.

- **Narrow and typed.** `get_leave_balance(staff_id)`, not `run_query(sql)`
  or `run_command(text)`. A model given free-form query or shell access will
  eventually be talked into misusing it.
- **Identity from the run, never from arguments.** The tool reads the user
  from the session or run context; a user ID the model supplies is content,
  not identity.
- **The permission check is inside the service the tool calls** — *this*
  user, *this* record — so it holds however the tool is reached.
- **Reads and writes are separate tools.** Write tools are idempotent where
  possible, show a preview of what will change, and wait for a person's
  approval when the action matters (money, records about people, messages
  sent in someone's name, anything hard to undo).
- **Code does the computing.** A tool returns the count, the total, the
  date difference — not rows for the model to add up.
- **Structured results:** a status, the data, and what was counted
  ("3 requests: PR-12, PR-15, PR-19"), so the answer can show its source.
  An empty result is `ok` with zero rows — the model is told "nothing
  found", not given an error to explain away.
- **Errors the model can act on** ("no staff with that ID — ask for the
  staff number") and a friendly message for the user; the real error goes
  to the log, never to the model's reply.
- **Bounded output.** Page or cap results so one call can't flood the
  context.
- **The description is written for the model:** when to use the tool, what
  each argument means, what comes back. It is part of the prompt — keep it
  true to the code, and treat a change to it like a prompt change.
- **Tool output is data.** Text returned by a tool (a document, an email, a
  web page) can't give instructions or grant permissions.

## 2. Agent limits

Every agent run has, in code: a maximum number of steps and tool calls, a
total time limit, an output-token limit, and a clean ending when a limit is
hit ("That needs more steps than I can take — here's what I found so far",
plus the escalation path). Loops with no limit are bugs waiting for a bad
day.

## 3. Conversation, context and memory

- History is trimmed or summarised before it outgrows the context budget
  (`serving-and-models.md`); the system prompt and the current question
  always fit.
- Sessions end after a period of inactivity; a new session doesn't inherit
  another user's history.
- Long-term memory is namespaced per user, holds only what the feature
  needs, has a retention period, and can be deleted with the user's data.
- Each domain's agent sees only its own tools and data; a shared agent is
  built for shared data, not given everyone's.

## 4. Checking and escalation

- **Show the working.** Answers state what was looked up and counted, so
  the user can spot a wrong premise.
- **Verify what matters.** Decision-critical output gets a check before it
  is shown: by code first (totals, IDs, dates, citations present), by a
  second model call as reviewer only for what code can't check.
- **No dead ends.** Low confidence, out of scope, unresolved or sensitive
  requests route to a named person or queue, carrying the conversation so
  the person doesn't start from zero. An agent without an escalation path
  isn't ready, whatever its accuracy.

## 5. Unattended runs

Scheduled or event-triggered runs have no one to ask: they read and report;
they don't write, send or approve unless AK designed that step with its own
checks. Their output says it was generated automatically and when.

## 6. Testing

- **Unit tests use a fake model** fed the messages and tool calls the test
  needs — fast, free, deterministic. No real model calls in unit tests.
- **Tools are tested as ordinary code** through the services they call,
  plus permission tests: the owner, another user, an unknown user; identity
  taken from the context, not the arguments.
- **Behaviour with the real model is tested by the eval set** (`evals.md`),
  including tool choice: the right tool, the right arguments, no tool when
  none is needed.

## 7. Framework notes

The standards above hold in any framework; only where things live changes.
Follow the project's framework and its template in
`arkar-project-structure` when there is one.

- **Graph or loop frameworks:** keep agent code free of web-framework
  imports; tools are the bridge to business services; use the framework's
  own step limits, checkpoints and human-approval pause.
- **Frameworks that pair a description file with hidden code:** the
  description is what the model sees — it must stay accurate when the code
  changes, and it never contains secrets or another domain's details.
- **Plain API calls from a web app:** one client module; long calls in a
  background job or a streamed response, never a blocked request thread.
