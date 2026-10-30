# Django agentic project template (LangChain / LangGraph / LangSmith)

Use this for Django projects whose main job is running LLM agents. It is the
Django template (`django.md`) plus an `agents/` package. Read `django.md`
first — `config/`, `apps/`, the custom user model, settings, naming, uv and
tests all work the same way. Differences from `django.md` are called out here.

Versions this was written against (Oct 2026): `langchain` 1.4, `langgraph`
1.2, `langchain-openai` 1.7, `langsmith` 0.14, Python 3.12. Pin with `~=` (e.g.
`langgraph~=1.2`) — patch releases ship almost daily. If the installed major
version differs, check the migration notes before copying patterns from here.

## Contents
1. The one big rule
2. Folder tree
3. What goes where (with skeletons)
4. Running agents: request vs background
5. Safety limits every agent needs
6. Persistence and memory
7. LangSmith: tracing and evals
8. Testing
9. Naming rules
10. Adding a new agent — checklist
11. Defaults and when to change them

## 1. The one big rule

**Agent code doesn't import Django; Django code calls agents.**

- `agents/` holds graphs, state, nodes, prompts and the model factory. It can be
  loaded and tested without Django and opened in LangGraph Studio.
- `apps/` holds the Django side: who the user is, conversations, permissions,
  HTTP, admin, and the business data.
- The only bridge is **tools** (`agents/<agent>/tools.py`), which may call
  `apps.<app>.services` functions to read or change business data.

Keeping this boundary is what lets a junior test a node with a fake model in
milliseconds, and lets you move agent runs from views to a worker later.

## 2. Folder tree

```
project-name/
├── manage.py
├── config/                         # as django.md; ASGI is the main entry
│   ├── settings.py
│   ├── urls.py
│   └── asgi.py                     # uv run uvicorn config.asgi:application
├── apps/
│   ├── accounts/                   # custom User, as django.md
│   ├── conversations/              # chat threads + messages shown to users
│   │   ├── models/
│   │   │   ├── conversation.py     # owner, agent_name, thread_id (UUID)
│   │   │   └── message.py
│   │   ├── services/
│   │   │   └── conversation_service.py   # starts/continues agent runs
│   │   ├── views/
│   │   │   └── chat_views.py       # async view, streams SSE
│   │   ├── tasks.py                # background agent runs
│   │   └── urls.py
│   └── leave_requests/             # business apps, exactly as django.md
├── agents/                         # NO Django imports, except inside tools.py
│   ├── __init__.py
│   ├── llm.py                      # get_chat_model(): the only place a model is created
│   ├── checkpointing.py            # one shared pool, checkpointer and store per process
│   ├── shared_tools/               # tools reused by several agents (e.g. document search)
│   │   └── __init__.py
│   └── leave_assistant/            # one package per agent, snake_case
│       ├── __init__.py
│       ├── graph.py                # build_graph(...) and make_graph() for Studio
│       ├── state.py                # State and Context
│       ├── nodes.py                # node functions (custom graphs only)
│       ├── tools.py                # @tool functions (may call apps.*.services)
│       └── prompts.py              # system prompts as constants
├── evals/                          # LangSmith datasets and evaluators
│   ├── datasets/
│   │   └── leave_assistant.jsonl
│   ├── evaluators.py
│   └── test_leave_assistant_eval.py
├── tests/
│   └── agents/
│       └── leave_assistant/
│           ├── test_nodes.py
│           └── test_graph.py
├── langgraph.json                  # lets `langgraph dev` / Studio open the graphs
├── .env.example
├── pyproject.toml + uv.lock
└── README.md
```

Simple single-step "call the model and return text" features don't need a
graph: a function in `agents/<area>.py` using `get_chat_model()` is enough.

## 3. What goes where

### agents/llm.py — one place to create models

```python
import os

from langchain_openai import ChatOpenAI


def get_chat_model(temperature: float = 0.2) -> ChatOpenAI:
    """Model served by our vLLM (OpenAI-compatible) endpoint."""
    return ChatOpenAI(
        model=os.environ["LLM_MODEL"],
        base_url=os.environ["LLM_BASE_URL"],
        api_key=os.environ["LLM_API_KEY"],  # vLLM runs with --api-key
        temperature=temperature,
        timeout=60,
        max_retries=2,
        max_tokens=2048,
        use_responses_api=False,  # vLLM serves Chat Completions
    )
```

Settings come from environment variables (loaded by `config/settings.py` from
`.env`), so `agents/` never imports `django.conf`. Start vLLM with
`--api-key` and keep it on the internal network, so the model server isn't
open to anyone who can reach it. Pass vLLM-specific options
(e.g. `chat_template_kwargs`) through `extra_body=`, not `model_kwargs`. Tool
calling requires vLLM to run with `--enable-auto-tool-choice` and a
`--tool-call-parser` for the model. For structured output use
`model.with_structured_output(Schema, method="json_schema")`, which vLLM
enforces with guided decoding.

### state.py

```python
from dataclasses import dataclass
from typing import Annotated, TypedDict

from langchain_core.messages import AnyMessage
from langgraph.graph.message import add_messages


class State(TypedDict):
    messages: Annotated[list[AnyMessage], add_messages]


@dataclass
class Context:
    """Who is asking. Set by Django for each run; the model never sees or sets it."""
    user_id: int
```

Who the user is lives in `Context`, never in `State` — state is visible to
the model, context isn't.

### Two ways to build an agent

**Default — `create_agent`** for a tool-calling assistant with no custom flow.
Add limits and approvals through middleware rather than code:

```python
# graph.py
from langchain.agents import create_agent
from langchain.agents.middleware import (
    HumanInTheLoopMiddleware,
    ModelCallLimitMiddleware,
    ToolCallLimitMiddleware,
)
from langchain_core.runnables import RunnableConfig

from agents.leave_assistant.prompts import SYSTEM_PROMPT
from agents.leave_assistant.state import Context
from agents.leave_assistant.tools import TOOLS
from agents.llm import get_chat_model


def build_graph(checkpointer=None, store=None, model=None):
    """Build the leave assistant. Tests pass a fake model and an in-memory checkpointer."""
    return create_agent(
        model=model or get_chat_model(),
        tools=TOOLS,
        system_prompt=SYSTEM_PROMPT,
        context_schema=Context,
        checkpointer=checkpointer,
        store=store,
        middleware=[
            ModelCallLimitMiddleware(run_limit=10),
            ToolCallLimitMiddleware(run_limit=15),
            # Pause for the user's confirmation before any tool that changes data:
            HumanInTheLoopMiddleware(interrupt_on={"submit_leave_request": True}),
        ],
    )


def make_graph(config: RunnableConfig):
    """Factory for langgraph.json / Studio, so importing this module never needs env vars."""
    return build_graph()
```

**Custom flow — `StateGraph`** when you need your own steps, branches or
approval points. Nodes receive the run context through `Runtime`:

```python
# nodes.py
from langgraph.runtime import Runtime

from agents.leave_assistant.prompts import SYSTEM_PROMPT
from agents.leave_assistant.state import Context, State


def build_call_model(model):
    async def call_model(state: State, runtime: Runtime[Context]) -> dict:
        response = await model.ainvoke([("system", SYSTEM_PROMPT), *state["messages"]])
        return {"messages": [response]}
    return call_model
```

```python
# graph.py (custom-flow version)
from langgraph.graph import START, StateGraph
from langgraph.prebuilt import ToolNode, tools_condition

def build_graph(checkpointer=None, store=None, model=None):
    model = (model or get_chat_model()).bind_tools(TOOLS)
    builder = StateGraph(State, context_schema=Context)
    builder.add_node("call_model", build_call_model(model))
    builder.add_node("tools", ToolNode(TOOLS))
    builder.add_edge(START, "call_model")
    builder.add_conditional_edges("call_model", tools_condition)
    builder.add_edge("tools", "call_model")
    return builder.compile(checkpointer=checkpointer, store=store)
```

Either way: `build_graph()` takes its dependencies as arguments, and
`make_graph()` is the factory registered in `langgraph.json`. Never create
the graph at module level.

### tools.py — the only bridge to Django

```python
from asgiref.sync import sync_to_async
from langchain.tools import ToolRuntime, tool

from agents.leave_assistant.state import Context
from apps.leave_requests.services import leave_request_service


@tool
async def get_leave_balance(runtime: ToolRuntime[Context]) -> dict:
    """Return the current user's remaining annual and medical leave days."""
    user_id = runtime.context.user_id
    return await sync_to_async(leave_request_service.get_leave_balance_for_user)(user_id)


@tool
async def submit_leave_request(start_date: str, end_date: str, leave_type: str, runtime: ToolRuntime[Context]) -> dict:
    """Submit a leave request for the current user. Dates are YYYY-MM-DD."""
    return await sync_to_async(leave_request_service.submit_leave_request)(
        runtime.context.user_id, start_date, end_date, leave_type
    )


TOOLS = [get_leave_balance, submit_leave_request]
```

- **Identity comes from `runtime.context`**, which the model can't see or
  change. Never accept a user/staff ID as a tool argument for "the current
  user", and check permissions inside the service.
- Tools are `async`. Call services with `sync_to_async` (needed when the
  service uses a transaction), or use Django's async ORM (`aget`, `afilter`).
  Sync ORM calls directly inside a graph running in an async view fail.
- The docstring is what the model reads: what the tool does and what each
  argument means.
- **Write tools** (create, submit, approve) must be safe to run twice —
  retries and resumes can repeat them — and record who did what. Put them
  behind `HumanInTheLoopMiddleware` (or an `interrupt()`) when the action
  matters.

### prompts.py

System prompts as module constants with UPPER_CASE names. Long prompts can be
`.md` files in `agents/<agent>/prompts/` loaded by `prompts.py`. Prompts are
code: review prompt changes like code changes and run the evals.

### agents/checkpointing.py — one pool per process

```python
import os

from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from langgraph.store.postgres.aio import AsyncPostgresStore
from psycopg.rows import dict_row
from psycopg_pool import AsyncConnectionPool

_pool: AsyncConnectionPool | None = None


async def get_pool() -> AsyncConnectionPool:
    """Open the pool lazily inside the running event loop (Django has no ASGI lifespan hook)."""
    global _pool
    if _pool is None:
        _pool = AsyncConnectionPool(
            os.environ["AGENT_DB_URL"],
            open=False,
            max_size=10,
            kwargs={"autocommit": True, "row_factory": dict_row, "prepare_threshold": 0},
        )
        await _pool.open()
    return _pool


async def get_checkpointer() -> AsyncPostgresSaver:
    return AsyncPostgresSaver(await get_pool())


async def get_store() -> AsyncPostgresStore:
    return AsyncPostgresStore(await get_pool())
```

Create the tables once from a management command
(`setup_agent_storage`) that calls `setup()` on both. Claude runs it only
against a local database; on shared or production databases AK runs it.

### apps/conversations — the Django side

- `Conversation` stores the owner, the agent name and a `thread_id` (UUID) —
  the key LangGraph uses to find the checkpoint. Messages shown in the UI are
  saved as `Message` rows, so the UI doesn't depend on reading checkpoints.
- `conversation_service.py` builds the graph with the shared checkpointer and
  runs it with
  `config={"configurable": {"thread_id": str(conversation.thread_id)}, "recursion_limit": 25}`
  and `context=Context(user_id=user.id)`.
- `chat_views.py` is an async view that streams Server-Sent Events:

```python
async def stream_reply(request, conversation_id):
    user = await request.auser()
    if not user.is_authenticated:
        return HttpResponse(status=401)
    # Only the owner's conversation; anyone else gets 404, not someone else's chat.
    conversation = await Conversation.objects.filter(pk=conversation_id, owner=user).afirst()
    if conversation is None:
        raise Http404
    ...
    async def events():
        reply = []
        try:
            async for part in graph.astream(
                graph_input, config=config, context=context,
                stream_mode="messages", version="v2",
            ):
                if part["type"] != "messages":
                    continue
                chunk, metadata = part["data"]
                if metadata["langgraph_node"] == "model" and chunk.content:
                    reply.append(chunk.content)
                    yield f"data: {json.dumps({'delta': chunk.content})}\n\n"
        except asyncio.CancelledError:
            pass  # client closed the page
        finally:
            await conversation_service.save_assistant_reply(conversation, "".join(reply))

    response = StreamingHttpResponse(events(), content_type="text/event-stream")
    response["Cache-Control"] = "no-cache"
    response["X-Accel-Buffering"] = "no"
    return response
```

(For a custom `StateGraph`, the node name is your own, e.g. `call_model`.)
Use `await request.auser()` in async views, not `request.user`. Keep GZip and
other buffering middleware off streaming routes.

### Database settings — differs from django.md

Async views must not use persistent connections: set `CONN_MAX_AGE = 0` and
use the driver's pool instead (`"OPTIONS": {"pool": {"min_size": 2, "max_size": 10}}`
with PostgreSQL / psycopg 3).

## 4. Running agents: request vs background

| Situation | How |
|---|---|
| Chat reply expected in seconds | Async view streams SSE (above) |
| Long job (minutes), batch, or scheduled | Background task in `apps/<app>/tasks.py` runs the graph with the same `thread_id`; the UI polls the conversation |
| Needs a human decision mid-run | `HumanInTheLoopMiddleware` or `interrupt()`; resume with `Command(resume=...)` on the same `thread_id` |

Run Django under ASGI (`uv run uvicorn config.asgi:application`) so streaming
views don't hold a worker thread per request.

## 5. Safety limits every agent needs

- **Loop limits:** `recursion_limit` 15–25 per run (the default is very high),
  plus model/tool call limits via middleware. Catch `GraphRecursionError` and
  tell the user the request was too complex.
- **Timeouts:** model `timeout`, and a cap on the total duration of a
  streaming view or task.
- **Untrusted content:** tool results, documents from search and emails are
  data, not instructions. Never give an agent a write tool and untrusted
  content in the same run without human approval on the write.
- **Context growth:** long conversations get trimmed or summarised
  (`SummarizationMiddleware`) so cost and latency don't grow without limit.
- **Logging:** log tokens, latency and tool calls per run even when tracing is
  off.

## 6. Persistence and memory

- **Checkpointer (conversation state):** PostgreSQL with
  `langgraph-checkpoint-postgres`, set up as in `checkpointing.py`. There is
  no official MySQL checkpointer, so agentic projects use PostgreSQL for the
  Django database too — one database to run.
- **Long-term memory:** `AsyncPostgresStore`, passed as `store=`, namespaced by
  user: `("memories", user_id)`.
- **Documents / RAG:** the existing vector database (Qdrant) behind a search
  tool in `agents/shared_tools/`.
- **Tests:** `InMemorySaver` from `langgraph.checkpoint.memory`.
- **Retention:** checkpoints and the store hold whole conversations. Deleting
  a `Conversation` deletes its checkpoint thread
  (`await checkpointer.adelete_thread(thread_id)`) and the user's memories when
  they leave; agree a retention period with AK (PDPA) and purge older threads
  with a scheduled task.
- Set `LANGGRAPH_STRICT_MSGPACK=true` in production.

## 7. LangSmith: tracing and evals

Tracing sends prompts, tool inputs and outputs — business data — to the
LangSmith server. **Default is tracing off.** Turn it on only against a
self-hosted LangSmith, or with explicit approval for the data involved. The
same applies to LangSmith Studio's web UI: `langgraph dev` runs locally, but
the Studio page is served from smith.langchain.com.

```
LANGSMITH_TRACING=false
LANGSMITH_API_KEY=
LANGSMITH_PROJECT=project-name
LANGSMITH_ENDPOINT=            # self-hosted URL when used
```

Evals live in `evals/`, separate from unit tests: a JSONL dataset per agent,
evaluators in `evaluators.py` (`(inputs, outputs, reference_outputs) -> score`,
LLM-as-judge via `openevals` when needed), and a pytest file that runs them.
They call the real model, so they run on demand or nightly, not on every
commit. When a real conversation goes wrong, add a case **rewritten with
synthetic data** — no real names, staff IDs, NRIC, phone numbers, salaries or
medical details — because datasets are committed to git and may be uploaded to
LangSmith (only with approval).

## 8. Testing

- Graphs: `build_graph(checkpointer=InMemorySaver(), model=fake_model)` where
  `fake_model` is a `GenericFakeChatModel` subclass whose `bind_tools` returns
  itself, fed the `AIMessage`s (including tool calls) the test needs. Fresh
  model and graph per test; pass `context=Context(user_id=...)` on invoke.
- Single node (custom graphs): `compiled.nodes["call_model"].invoke(state)`.
- Tools: test the underlying service in the Django app's tests; test the tool
  only for permission checks (that it uses `runtime.context`, not arguments).
- No real model calls in `tests/` — those belong in `evals/`.

## 9. Naming rules

Everything in `django.md`, plus:

| Thing | Rule | Example |
|---|---|---|
| Agent package | snake_case, named for its job | `agents/leave_assistant/` |
| Graph in `langgraph.json` | package name → `make_graph` factory | `"leave_assistant": "./agents/leave_assistant/graph.py:make_graph"` |
| Node names | verb_noun snake_case | `call_model`, `check_policy`, `ask_manager` |
| Tools | verb_noun snake_case, docstring written for the model | `get_leave_balance` |
| Prompts | UPPER_CASE constants | `SYSTEM_PROMPT`, `SUMMARY_PROMPT` |
| State keys | snake_case nouns | `messages`, `draft_reply` |
| Eval dataset | `evals/datasets/<agent>.jsonl` | `leave_assistant.jsonl` |

## 10. Adding a new agent — checklist

1. `agents/<agent>/` with `state.py` (`State`, `Context`), `prompts.py`, `tools.py`, `graph.py` (`build_graph()` + `make_graph()`); `nodes.py` only for custom graphs.
2. Register `make_graph` in `langgraph.json`.
3. Business reads/writes → service functions in the owning Django app, wrapped by async tools that take the user from `runtime.context`.
4. Limits: recursion limit, call-limit middleware, human approval on important writes.
5. Conversation entry point in `apps/conversations` (service + view or task).
6. Unit tests with a fake model in `tests/agents/<agent>/`.
7. At least 10 eval cases in `evals/datasets/<agent>.jsonl`.
8. New env vars → `.env.example`.

## 11. Defaults and when to change them

| Decision | Default | Change only when |
|---|---|---|
| Model access | `ChatOpenAI` → local vLLM via `get_chat_model()` | Never create a model client elsewhere |
| Agent building | `create_agent` + middleware | Custom flow, branches or approval steps → `StateGraph` |
| Server | ASGI with uvicorn | Never WSGI for streaming |
| Database + checkpoints | PostgreSQL (psycopg 3 pool, `CONN_MAX_AGE = 0`) | Must share an existing MySQL DB → business data stays in MySQL, add a small PostgreSQL just for checkpoints |
| Vector search | Qdrant | — |
| Background runs | Same background-job tool as `django.md` | — |
| Tracing / Studio | LangSmith off; self-hosted when on | Approved for the data involved |
| Separate LangGraph Server | No — graphs run inside Django | Many agents, heavy concurrent long runs, or need its built-in run/thread APIs |
