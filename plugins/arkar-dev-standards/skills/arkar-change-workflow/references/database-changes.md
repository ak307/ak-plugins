# Database changes on a project connected to production

Four situations come up again and again in AK's projects. Each has a few
steps that are easy to skip and costly to miss. Rule 0 (always-on rules)
still decides what may run: reads only through the read-only query tool,
everything that writes is AK's to run, from steps you give him. In any
stack: the frameworks named here are examples.

## Contents
1. A slow page, report or job
2. A schema change on a live table
3. A bulk data change asked for in chat
4. A record with the wrong value

## 1. A slow page, report or job

- **Measure before you change anything.** Run `EXPLAIN` (and a row count
  of the tables involved) through the read-only query tool and say it was a
  read-only query on the live database; if the tool can't connect, give AK
  the statements to run and say the diagnosis is from the code until then.
  Measure again after the change, on a local copy or by AK.
- **Look for what stops an index being used:** a function around the
  column (`DATE(col)`, `whereDate`, `LOWER(col)`, a cast), a leading
  wildcard, a type mismatch, an `OR` across columns — and for a missing
  index in the order the query filters and sorts.
- **A rewrite returns exactly the same rows.** Turning a date function into
  a range (`>= start of day AND < start of next day`) moves the boundaries:
  compute them in the time zone the dates were stored and are compared in
  (business dates in Singapore, columns often UTC), and test the edges.
- **Fix the cause, not the symptom:** the query and the index before any
  cache. An index on a big live table is a schema change (section 2).

## 2. A schema change on a live table

`arkar-project-structure` (its data and API standard, section 4) holds the
rules (expand then contract, NOT NULL in steps, batched re-runnable
backfills, big-table locks). On top of them:

- **Show the SQL** each migration will run — `migrate --pretend`,
  `sqlmigrate`, `alembic upgrade --sql`, or written out when the tool can't
  run here.
- **Label each migration** that drops, renames, narrows a type, adds NOT
  NULL or touches a big table 🟠, with the lock risk and how to avoid it
  (the engine's online DDL options, or a quiet window).
- **New code writes the new column from the first step,** so rows created
  between the steps don't arrive empty.
- **AK's steps are complete:** back up; a `SELECT` that shows what will
  change (rows affected, rows that would fail the new rule); the exact
  command; how to verify; how to recover.

## 3. A bulk data change asked for in chat

Deleting or updating many rows is a data change, so AK runs it. Before
writing the script:

- **Question the reason when it's a means to an end** ("delete old rows,
  they slow everything down"): check whether indexes or the queries are the
  real cause.
- **Ask whether the rows are still needed** — audit, contracts, reporting
  history — and offer archiving or soft delete as options.
- **Find every table that points at these rows** (foreign keys, and child
  tables by name and code) and decide each one explicitly — delete first,
  keep, or archive — rather than letting a cascade or a constraint error
  decide.

The script, written out in full, for AK: a `SELECT` that counts exactly
what will change (the real definition — the status and the date it got that
status, not `created_at`); the change in batches (by id range or a `LIMIT`
loop) each in a transaction; the child rows in order; how to check the
result; and backup first.

## 4. A record with the wrong value

- Read the record through the read-only query tool (one `SELECT`, masked),
  and say so.
- **Find how it got that value** — every code path that sets it — and fix
  that, not only the row.
- **Check whether it's only this record:** one read-only query for other
  rows in the same state (same pattern, same time window, same user or job),
  and report the count and how they were found. Repairing them is AK's
  decision.
- If data must be repaired, AK gets a reviewed script: a `SELECT` showing
  the rows first, the change limited by id inside a transaction, and how to
  check it.
