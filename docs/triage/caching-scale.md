# Triage — `caching-scale` · Caching, Performance & Scale

**12 questions · 6 must-know / 6 should-know / 0 good-to-know**
Read 2026-10-20, against the four judgements.

| # | id | tier | T | A | R | L |
|---|---|---|---|---|---|---|
| 1 | `caching-strategies` | must | ✓ | ✓ | ✓ | ✓ |
| 2 | `cache-invalidation` | must | ✓ | ✓ | ✓ | ✓ |
| 3 | `cache-stampede` | must | ✓ | ✓ | ✓ | ✓ |
| 4 | `eviction-policies` | should | ✓ | ✓ | ✓ | ✓ |
| 5 | `redis-beyond-a-cache` | should | ✓ | ✓ | ✓ | ✓ |
| 6 | `distributed-locks` | must | ✓ | ✓ | ✓ | ✓ |
| 7 | `rate-limiting-algorithms` | must | ✓ | ✓ | ✓ | ✓ |
| 8 | `consistent-hashing` | should | ✓ | ✓ | ✓ | ✓ |
| 9 | `cap-and-what-it-actually-says` | must | ✓ | ✓ | ✓ | ✓ |
| 10 | `eventual-consistency-in-practice` | should | ✓ | ✓ | ✓ | ✓ |
| 11 | `spring-cache-abstraction-pitfalls` | should | ✓ | ✓ | ✓ | ✓ |
| 12 | `scaling-reads-and-writes` | should | ✓ | ✓ | ✓ | ✓ |

---

## Findings

**True — no failures.** #9 `cap-and-what-it-actually-says` leads with the
misquote and dismantles it: "pick two" implies you could choose CA, and you
cannot, because partitions are not a choice. That is the correct correction and
it is the reason the question exists.

**#6 `distributed-locks`** gives the minimum correct single-instance recipe as
three specific things — `SET key token NX PX`, a unique token, and a
compare-and-delete release — each justified by the failure it prevents, rather
than the usual hand-wave at Redlock.

**Asked — no failures.** Eleven `keyTopics`, all covered.

**Tier — no changes.** No `good-to-know` layer.

**Reference — 12 of 12 have one.** #7 cites RFC 6585 for 429, which is the
right primary source for the status code half of a rate-limiting answer.

**Structural — this topic has no subsections.** See the summary.

**Cross-links — 0 uncited, 28 citations** from `caching-strategies`,
`scaling-data` and `resilience-patterns`. Fully connected.
