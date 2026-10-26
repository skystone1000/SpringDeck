# Triage — `sql-databases` · SQL & Database Design

**21 questions · 11 must-know / 7 should-know / 3 good-to-know**
Read 2026-10-20, against the four judgements.

| # | id | tier | T | A | R | L |
|---|---|---|---|---|---|---|
| 1 | `join-types` | must | ✓ | ✓ | ✓ | ✓ |
| 2 | `null-semantics` | must | ✓ | ✓ | ✓ | ✓ |
| 3 | `group-by-and-having` | must | ✓ | ✓ | ✓ | ✓ |
| 4 | `window-functions` | must | ✓ | ✓ | ✓ | ✓ |
| 5 | `exists-vs-in-vs-join` | should | ✓ | ✓ | ✓ | **✗** |
| 6 | `ctes-and-recursion` | good | ✓ | ✓ | ✓ | ✓ |
| 7 | `normalisation` | must | ✓ | ✓ | ✓ | ✓ |
| 8 | `primary-key-choice` | should | ✓ | ✓ | ✓ | ✗ |
| 9 | `constraints-in-the-database` | should | ✓ | ✓ | ✓ | ✗ |
| 10 | `soft-delete` | good | ✓ | ✓ | ✓ | ✗ |
| 11 | `how-btree-indexes-work` | must | ✓ | ✓ | ✓ | ✓ |
| 12 | `composite-index-column-order` | must | ✓ | ✓ | ✓ | ✓ |
| 13 | `reading-an-explain-plan` | must | ✓ | ✓ | ✓ | ✓ |
| 14 | `why-is-my-index-not-used` | should | ✓ | ✓ | ✓ | **✗** |
| 15 | `index-types-beyond-btree` | good | ✓ | ✓ | ✓ | ✓ |
| 16 | `connection-pool-sizing` | must | ✓ | ✓ | ✓ | ✓ |
| 17 | `migrations-and-zero-downtime` | must | ✓ | ✓ | ✓ | ✓ |
| 18 | `flyway-vs-liquibase` | should | ✓ | ✓ | ✓ | ✓ |
| 19 | `read-replicas` | should | ✓ | ✓ | ✓ | ✗ |
| 20 | `partitioning-and-sharding` | should | ✓ | ✓ | ✓ | ✓ |
| 21 | `sql-injection` | must | ✓ | ✓ | ✓ | ✓ |

---

## Findings

**True — no failures.** #13 insists on `EXPLAIN ANALYZE` over plain `EXPLAIN`
and says why (estimates versus real timings and real row counts), which is the
distinction that makes the answer operational. #16 leads with the
counter-intuitive fact — a smaller pool is usually faster — and cites
HikariCP's own guidance for it. #17 correctly identifies the constraint that
dictates every zero-downtime migration: old and new versions run against the
same schema during a rolling deploy.

**Asked — no failures.** Sixteen `keyTopics`, all covered.

**Tier — no changes.**

**Reference — 6 of 21 have none.** Two matter:

- **#5 `exists-vs-in-vs-join`** makes a *correctness* claim — `NOT IN` is
  unsafe against a subquery that can produce NULL — and cites nothing. The
  deck drills exactly this in `predict-sql`, where the same behaviour is
  demonstrated with a verified result, so **the corpus proves the claim in one
  mode and does not cite it in another.**
- **#14 `why-is-my-index-not-used`** is a `should-know` list of six causes
  ordered by frequency, uncited. PostgreSQL's planner documentation covers
  most of them and is already cited eight times in this topic.

**Cross-links — 0 uncited, 49 citations** from `relational-foundations`,
`sql-you-are-asked`, `indexes-and-plans` and `schema-and-scale`. Fully
connected.
