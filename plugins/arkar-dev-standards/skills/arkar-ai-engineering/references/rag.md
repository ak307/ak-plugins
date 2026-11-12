# RAG — answering from documents and data

For any feature that answers from a private corpus: document Q&A, policy or
tender assistants, knowledge bases, enquiry bots. The people asking usually
can't verify the answer, so the design goal is that their trust is never
betrayed.

## Contents
1. Grounded or silent
2. Grounding and citation
3. The calculation rule
4. Retrieval by document shape
5. Chunking
6. Hybrid retrieval and reranking
7. Isolation and permissions
8. Ingest hygiene
9. Escalation
10. Reviewing an existing assistant
11. Current defaults (replaceable)

## 1. Grounded or silent

Every factual claim in an answer is supported by retrieved content. When
retrieval doesn't support an answer, the assistant says so and escalates —
it never fills the gap with what the model happens to know or with a
plausible invention. **Refusal is a success state**; design, prompts,
evaluation and reviews all treat it that way.

## 2. Grounding and citation

- **Citations are load-bearing.** Every answer cites the source document
  and its section, page or version. A claim that can't be cited doesn't
  ship in the answer.
- **Confidence gating.** Retrieval and answer confidence are scored from
  things code can measure (retrieval scores, whether the cited passage
  contains the claim); below the threshold the assistant declines and
  escalates. Thresholds are tuned per corpus with the eval set and never
  switched off "to be more helpful".
- **Retrieved text is data, not instructions**
  (`arkar-security/references/ai.md`).
- **Staleness is visible.** Where versions matter (policies, tariffs, price
  lists), the answer states the version or date it drew from.

## 3. The calculation rule

The model never computes. Sums, aggregations, date arithmetic, threshold
checks and comparisons across more than a handful of values are executed by
code; the model formats the verified result. Corollary: **tabular data
(spreadsheets, database tables) is queried directly** with real query
logic — not embedded into a vector index and paraphrased from chunks.

## 4. Retrieval by document shape

Route by shape; one pipeline for everything fails the minority shape
silently.

| Corpus shape | Approach | Why |
|---|---|---|
| Large, structured documents (manuals, standards, contracts with a hierarchy) | A hierarchical index over sections: navigate the structure, then read | Chunk-and-vector loses the structure exactly where the structure carries the meaning |
| Short or unstructured text (FAQs, memos, policies, tickets) | Chunked vector retrieval plus lexical search | Structure adds nothing; similarity does the work |
| Tabular or numeric (spreadsheets, database tables, price and tariff tables) | Direct query through code | Embedding tables yields paraphrased numbers |
| Mixed | Classify each document by shape at ingest, tag it, dispatch it | — |

## 5. Chunking (vector route)

- Chunk on meaning boundaries (headings, paragraphs), not fixed character
  counts through sentences. A usual starting point is 200–500 tokens with
  10–15% overlap; tune with the eval set, not by feel.
- Every chunk carries metadata: source document ID, version, section path,
  ingest date, domain tag. Citations are built from it.
- Tables inside documents are extracted to structured form at ingest; a
  table never straddles a chunk boundary.

## 6. Hybrid retrieval and reranking

- **Hybrid is the default:** lexical (BM25) and vector search in parallel,
  merged (reciprocal rank fusion is a sound default), then a cross-encoder
  reranker; the top few after reranking go into the context. Pure vector
  search is the exception and needs a reason.
- Lexical search matters most for exact identifiers — clause numbers, form
  names, product codes — the queries vector search fumbles.
- Retrieve wide, rerank hard (for example 25–50 candidates in, 3–8 chunks
  out). Context stuffed with marginal chunks weakens grounding.

## 7. Isolation and permissions

One collection or index per domain (division, department, tenant). The
order is fixed: **identity → permission check in code → retrieval scoped by
construction → parameterised data access.** Retrieval is built
already-restricted to what the user may see; it is never "search everything,
then filter". Cross-domain leakage tests are in every eval run.

## 8. Ingest hygiene

- Deduplicate on ingest by content hash and by (name, version); a revised
  document supersedes the old one, it doesn't sit beside it.
- Keep earlier versions retrievable for history but out of default search;
  an answer about "the current policy" never mixes versions.
- A scheduled staleness report (documents past their review date) beats
  discovering stale answers from users.
- Garbage in the index is a permanent accuracy tax.

## 9. Escalation

Defined before launch: low-confidence, out-of-scope, unresolved and
sensitive questions go to a named person or queue with the conversation
attached (`tools-and-agents.md` §4).

## 10. Reviewing an existing assistant

Walk sections 1–9 as an audit. The commonest real failures, in order: no
testing of unanswerable questions; the model doing arithmetic; retrieval
before the permission check; citations that are decorative rather than
load-bearing; no escalation path. Findings in existing code are proposals
for AK (the skill's "Existing code" rule).

## 11. Current defaults (replaceable)

These record today's usual choices so new projects start consistently. They
are not part of the standard: a project may choose differently, records its
choice in its own files, and proves it with the eval set.

- Vector store with built-in hybrid search, one collection per domain
  (currently Qdrant).
- Multilingual dense + sparse embeddings and a multilingual cross-encoder
  reranker (currently bge-m3 and bge-reranker-v2-m3). Multilingual
  capability is a requirement to preserve in any replacement.
- Tabular data through the application's own parameterised queries.
