# Triage — `nosql` · NoSQL: MongoDB, Redis & Search

**10 questions · 4 must-know / 6 should-know / 0 good-to-know**
Read 2026-10-20, against the four judgements.

| # | id | tier | T | A | R | L |
|---|---|---|---|---|---|---|
| 1 | `when-not-to-use-a-relational-database` | must | ✓ | ✓ | ✓ | ✓ |
| 2 | `embed-or-reference` | must | ✓ | ✓ | ✓ | ✓ |
| 3 | `mongodb-indexes` | should | ✓ | ✓ | ✓ | ✓ |
| 4 | `mongodb-transactions-and-consistency` | should | ✓ | ✓ | ✓ | ✓ |
| 5 | `spring-data-mongodb` | should | ✓ | ✓ | ✓ | ✓ |
| 6 | `inverted-index-and-search` | must | ✓ | ✓ | ✓ | ✓ |
| 7 | `wide-column-and-query-first-modelling` | should | ✓ | ✓ | ✓ | ✓ |
| 8 | `polyglot-persistence-cost` | must | ✓ | ✓ | ✓ | ✓ |
| 9 | `redis-persistence-and-failure` | should | ✓ | ✓ | ✓ | ✓ |
| 10 | `choosing-a-store` | should | ✓ | ✓ | ✓ | ✓ |

---

## Findings

**True — no failures, and one answer explicitly retires a stale one.**
**#4 `mongodb-transactions-and-consistency`** dates multi-document ACID
transactions to **4.0 on a replica set and 4.2 across shards**, and then says
outright that "MongoDB has no transactions" is a dated answer. Naming the
obsolete answer as obsolete is more useful than quietly giving the current
one, and this is the only place in the deck that does it.

**#1 and #8 are the topic's spine and they argue against their own subject** —
the default should be relational, and polyglot persistence "sounds obviously
correct and is frequently a mistake". A NoSQL topic that opens by telling you
when not to reach for NoSQL is the right shape for an interview deck.

**Asked — no failures.** Eleven `keyTopics`, all covered by ten questions.

**Tier — no changes.** No `good-to-know` questions, which is right for a topic
this small: there is no room for a trivia layer.

**Reference — 10 of 10 have one**, and they are to the primary sources
(`mongodb.com`, `redis.io`, `elastic.co`, `cassandra.apache.org`) rather than
to summaries.

**Structural — this topic is deliberately flat, and that was checked.** It
declares `subsections: null` and its file header gives the reason. The first
triage pass recorded the flatness as a gap; **re-reading the ten flat topics'
headers showed every one of them carries an argued reason**, so the finding
was withdrawn. See [`SUMMARY.md`](SUMMARY.md).

**Cross-links.** Theory cites this topic **13 times** from `nosql-stores`.
One uncited.
