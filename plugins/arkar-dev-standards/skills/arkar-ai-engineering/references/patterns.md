# Choosing the pattern

Each step up this ladder costs more to build, is slower and more expensive
to run, is harder to test, and fails in more ways. Take the lowest rung that
passes the evaluation gate, and write one line on why the rung below wasn't
enough.

## The ladder

| Rung | What it is | Use it when |
|---|---|---|
| 0. No model | Rules, a query, a regular expression, a lookup | The logic can be written down. A model adds cost and error for nothing. |
| 1. One call | One prompt in, one schema-validated result out | Extract fields, classify, summarise, rewrite, draft, translate — one judgement over one input. |
| 2. Workflow | Several calls and code steps in an order **the code decides** — a chain, a router, parallel calls then a merge, a draft-then-check pair | The task splits into known steps, or needs different handling per type, or needs a second check. |
| 3. Agent | The model chooses which tools to call, in a loop, until done | The steps genuinely can't be known in advance and depend on what each tool returns. |
| 4. Several agents | Agents with separate jobs, tools and permissions, with a router | Distinct domains that must stay isolated (separate data, separate permissions), or jobs too different for one prompt. |

Most business features are rung 1 or 2. Chat over data usually needs a
router (code or a small classifier) in front of a handful of typed tools —
that is a workflow or a small agent, not a general-purpose one.

## Signs of over-building

- An agent whose tool calls always happen in the same order → it's a workflow.
- A workflow whose steps could be one prompt with a schema → it's one call.
- A model asked to pick between options code could pick by a rule → rung 0 for that step.
- A "planner" or "orchestrator" agent for a task with three fixed steps.
- Several agents sharing one set of data and permissions → one agent.

## Signs it needs the next rung

- One prompt carrying several unrelated jobs, with accuracy dropping as it grows → split into a workflow.
- Hard-coded steps that keep needing exceptions for cases the code couldn't foresee → an agent, with limits.
- One agent's prompt holding rules for domains that must not see each other's data → separate agents behind a permission-checked router.

## Where code does the work in every pattern

- **Routing:** by rule or keyword where it's reliable; a small classification call where it isn't; the model's free choice last.
- **Calculation and lookup:** always code (principle 2).
- **Checking:** validate with code first (schema, totals that must add up, values that must appear in the source); a second model call as checker only for what code can't check, and only where a wrong output is costly.
- **Deciding to act:** a person, for writes that matter (`tools-and-agents.md`).

## Shape of the run

- **Seconds, user waiting:** stream the reply; show what's happening.
- **Minutes, batch or scheduled:** a background job; the screen polls or is notified.
- **Needs a person mid-way:** pause with the state saved, resume on the decision — never hold a request open.
