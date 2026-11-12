---
name: arkar-ai-engineering
description: AK's standard for building features that call a language model — single LLM calls (extraction, classification, summaries, drafting), multi-step workflows, tool-using agents, and RAG or document Q&A. Covers choosing the simplest pattern that works, prompts and schema-validated output, tool and agent design, grounded retrieval with citations, an evaluation gate before anything ships or any prompt or model changes, serving limits and logging. Use this whenever writing, changing, debugging or reviewing code that calls an LLM or embedding model, builds a prompt, defines a tool for a model, sets up an agent, chatbot, assistant or knowledge base, vector search, chunking or reranking, evaluates AI answers, or swaps a model — in any framework or stack, even if the user never says "AI engineering" or "RAG".
---

# AI engineering — features that call a language model

A language model is a component that is sometimes wrong and always sounds
sure. The people who rely on its output usually can't check it. So the
design goal of every AI feature is the same: **wrong output is caught — by
code, by evaluation or by a person — before it does harm.** A confidently
wrong answer is worse than no answer.

This skill holds standards that are true on any project. A project's own
facts — model names, endpoints, capacity numbers, the framework in use —
live in that project's files, never here.

## The principles

1. **The simplest pattern that works.** No model where rules or a query do
   the job; one call before a workflow; a workflow before an agent; one
   agent before several (`references/patterns.md`).
2. **Code computes; the model reads, writes and chooses.** Sums, counts,
   comparisons, date arithmetic, today's date, IDs and anything looked up
   come from code. The model formats and explains verified results.
3. **Model output is untrusted input.** It is validated against a schema
   before use, escaped before it is shown, never executed, and never decides
   who the user is or what they may do.
4. **Grounded or silent.** An answer drawn from data or documents shows its
   source beside every claim and number; when the source doesn't support an
   answer, the feature says so and hands over to a person. Refusal is a
   success state. An empty result is a valid answer, not an error.
5. **Evaluated before it ships and before every change.** A test set built
   with the feature; a gate per category, not one blended score; re-run on
   any change to a prompt, model, tool, retrieval setting or corpus
   (`references/evals.md`).
6. **Permission in code, before the model.** Identity comes from the
   session; the permission check runs before any retrieval or tool call;
   writes that matter wait for a person (`arkar-security`).
7. **Data stays in-house by default.** A model, tracing or evaluation
   service outside the organisation is used only with AK's approval for the
   data involved.
8. **Every run is bounded and visible.** Timeouts, output limits, step
   limits and concurrency caps; each run logged with who, which model and
   prompt version, tokens, time, tools called and outcome
   (`references/serving-and-models.md`).

## Existing code

Decide freely within what AK asked. Weaknesses found in existing AI code
beyond the request — a model doing arithmetic, unvalidated output, no test
set, a missing limit — are **proposals**, labelled 🟢 safe or 🟠 changes
behaviour, in the change workflow's approval list (`arkar-change-workflow`).
Security weaknesses follow `arkar-security`'s rule: proposed first, never
just applied. A prompt or model change to an existing feature is a
behaviour change: say so, and show the eval results before and after.

## Proportional

| Work | What applies |
|---|---|
| A throwaway script or a prototype AK asked for | Principles 2, 3 and 7; say plainly which steps were skipped — never silently. |
| A single-call feature (extract, classify, summarise, draft) | Schema and validation, limits, logging, and a small eval set (10–20 real-shaped cases, including ones it must decline). |
| An agent, a RAG assistant, or anything staff act on without checking | Everything, with the full evaluation gate and an escalation path. |

## Every stage

1. **Understand.** The job and who relies on the output; what a wrong
   output costs and who would notice; the data it touches and how sensitive
   it is; what "confidently wrong" means for this contract (a made-up
   answer, a false all-clear, a wrong amount).
2. **Choose the pattern** — and say why the simpler one isn't enough
   (`references/patterns.md`).
3. **Design the contract before the prompt:** inputs, the output schema,
   the refusal and escalation path, and the limits. Then prompts and output
   (`references/prompts-and-output.md`), tools and agents
   (`references/tools-and-agents.md`), retrieval (`references/rag.md`),
   serving (`references/serving-and-models.md`), and security
   (`arkar-security/references/ai.md`).
4. **Build the eval set while building the feature,** not after: real
   questions and inputs rewritten with invented data, gold answers a domain
   expert can confirm, cases it must decline, and attacks
   (`references/evals.md`).
5. **Build.** One module that creates the model client; model names and
   endpoints from configuration; prompts in versioned files; every output
   validated; unit tests with a fake model (no real model calls in unit
   tests); the project's layout per `arkar-project-structure`.
6. **Evaluate.** Run the set against the real model
   (`scripts/run_evals.py`, or the project's own runner) and read the
   failures. Below the gate → fix and re-run; it doesn't ship on a promise.
7. **Record and report.** The project's facts (models, endpoints, limits,
   stack choices and why) go in the project's own files. In the final
   message: the pattern chosen and why, the eval results per category, what
   wasn't evaluated and why, the limits set, and any proposals for existing
   code.

## Before launch

- [ ] Simplest pattern that passes the gate; the choice is recorded
- [ ] No model arithmetic anywhere; tabular data is queried, not paraphrased
- [ ] Every output validated; invalid output fails safely
- [ ] Refusal verified on inputs it can't handle; escalation path defined, tested, carrying the context
- [ ] Answers from documents or data cite their source; uncitable claims are blocked
- [ ] Permission check precedes retrieval and tools; domains isolated
- [ ] Evaluation gate passed per category; regression re-run wired to prompt, model, tool and corpus changes
- [ ] Timeouts, output and step limits, concurrency cap, and behaviour when the model server is unavailable
- [ ] Runs logged without secrets or unnecessary personal data; nothing leaves the organisation unapproved

Knowingly skipping an item (a prototype, a pilot) is stated explicitly,
never silent.

## References

- `references/patterns.md` — no model, one call, workflow, agent: choosing and the signs of over- and under-building.
- `references/prompts-and-output.md` — prompts as versioned code, structure, examples, schema-validated output, safe failure.
- `references/tools-and-agents.md` — tool design, agent limits, memory, verification, escalation, testing.
- `references/rag.md` — grounding and citation, retrieval by document shape, hybrid search and reranking, ingest hygiene.
- `references/evals.md` — building the test set, graders, gates, regression, changing a model.
- `references/serving-and-models.md` — the client, limits, concurrency, context budgets, choosing models, logging.
- `scripts/run_evals.py` — runs a JSONL test set against any OpenAI-compatible endpoint or the feature's own function, with per-category gates.
- `arkar-security/references/ai.md` — the security layers, injection, untrusted output, personal data.
