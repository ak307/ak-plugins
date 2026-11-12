# Serving and models

How the application talks to a model server, and how models are chosen.
The numbers for a particular server (how many parallel requests it takes,
its context size, its speed) are that project's facts: measure them, record
them in the project's files, and configure limits from there.

## Contents
1. One client
2. Limits on every call
3. Concurrency and queueing
4. When the model server is unavailable
5. Context budget
6. Choosing a model
7. Logging and tracing

## 1. One client

- One module creates the model client; nothing else constructs one.
- Model name, base URL, key, timeouts and limits come from configuration
  (`.env`, with placeholders in `.env.example`) — never literals in code.
- Prefer the common OpenAI-compatible interface, so a model or server can
  be swapped by configuration and the eval runner can reach it.
- Embedding, reranking, speech and vision models get the same treatment:
  one place each, configured.

## 2. Limits on every call

- **Timeouts:** connect and read, plus a cap on the whole run (an agent's
  total time, a stream's maximum length). Model calls are slow — seconds to
  a minute — so the limits are generous but never absent.
- **Output limit** (`max_tokens`) on every call, sized to the task.
- **Retries** only for failures that are safe to repeat (connection errors,
  overload), with backoff and a small cap; never for invalid requests, and
  never for a call that already triggered a write.
- **Streaming** when a person is waiting more than a couple of seconds, with
  a visible "working" state and a way to stop
  (`arkar-ui-motion-design` covers AI activity states).

## 3. Concurrency and queueing

A model server handles a limited number of requests at once; beyond that,
everyone gets slower or requests fail.

- Know the server's parallel capacity and cap the application below it
  (a semaphore, a worker-pool size, a queue).
- When the cap is reached, queue with a position or an honest "busy — try
  again shortly"; never pile on unbounded requests.
- Long or batch work goes to background jobs with their own, lower limit,
  so interactive users aren't starved.
- Per-user rate limits protect against one user or a loop exhausting the
  capacity.

## 4. When the model server is unavailable

Restarts, overload and outages are normal events, designed for:

- a health check that includes the model endpoint (ready vs live);
- a clear message to the user, with their input kept so they can retry;
- queued work that waits and resumes, not fails silently;
- **never a made-up answer or a silent fallback** to a different model or
  an outside service — a fallback model is a decision AK makes, with its own
  eval results.

## 5. Context budget

- Count tokens; split the budget between input and the reserved output.
- Order of what's kept when it's tight: the system prompt and rules, the
  current request, the retrieved or tool content needed to answer, then
  recent history; older history is summarised or dropped.
- Cap tool and retrieval results before they enter the context.
- Keep the conversation append-only with a stable prefix, so the server can
  reuse earlier work between turns.

## 6. Choosing a model

- **The smallest model that passes the eval gate** for the task — speed and
  capacity are features users feel.
- Different jobs can use different models (a small one to classify or
  route, a larger one for hard reasoning); each choice is proven by that
  job's eval set.
- Record the choice and its evidence in the project. Changing it follows
  the procedure in `evals.md` §5.
- **In-house by default.** Sending prompts, documents or traces to a
  service outside the organisation needs AK's approval for the data
  involved; so does adding a fallback to one.

## 7. Logging and tracing

- Log every run: who (an ID, not a name), feature, model, prompt version,
  input and output token counts, time to first token and total time, tools
  called, outcome (answered, declined, escalated, failed and why).
- Keep prompts and outputs out of ordinary logs when they hold personal
  data; where they must be kept for review, store them with the same
  access control and retention as the data they contain, masked where full
  values aren't needed.
- Tracing tools see everything the model sees. Off by default; on only
  against a self-hosted or approved service.
- Watch the numbers that show trouble early: refusal and escalation rates,
  invalid-output rate, limit hits, p95 time, tokens per run.
