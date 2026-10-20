# Triage — `collections` · Collections Framework

**26 questions · 7 must-know / 9 should-know / 10 good-to-know**
Read 2026-10-20, against **is it true**, **is it asked**, **is it at the right
tier**, **does it have a reference**.

| # | id | tier | T | A | R | L |
|---|---|---|---|---|---|---|
| 1 | `arraylist-vs-linkedlist` | must | ✓ | ✓ | ✓ | ✓ |
| 2 | `fail-fast-iterators` | must | ✓ | ✓ | ✓ | ✓ |
| 3 | `immutable-collections` | must | ✓ | ✓ | ✓ | ✓ |
| 4 | `set-implementations` | should | ✓ | ✓ | ✓ | ✗ |
| 5 | `arraydeque-vs-stack` | should | ✓ | ✓ | ✓ | ✓ |
| 6 | `list-remove-int-vs-object` | should | ✓ | ✓ | ✓ | ✗ |
| 7 | `sequenced-collections` | good | ✓ | ✓ | ✓ | ✓ |
| 8 | `sublist-is-a-view` | good | ✓ | ✓ | ✓ | ✗ |
| 9 | `iterating-and-modifying-safely` | good | ✓ | ✓ | ✓ | ✗ |
| 10 | `hashmap-internals` | must | ✓ | ✓ | ✓ | ✓ |
| 11 | `hashmap-vs-hashtable-vs-concurrenthashmap` | must | ✓ | ✓ | ✓ | ✓ |
| 12 | `treemap-and-navigable` | should | ✓ | ✓ | ~ | ✓ |
| 13 | `linkedhashmap-lru` | should | ✓ | ✓ | ✓ | ✓ |
| 14 | `compute-and-merge` | should | ✓ | ✓ | ✓ | ✓ |
| 15 | `map-entry-views` | good | ✓ | ✓ | ✓ | ✗ |
| 16 | `hash-collision-dos` | good | ✓ | ✓ | ✓ | **✗** |
| 17 | `identityhashmap-and-weakhashmap` | good | ✓ | ✓ | ✓ | ✗ |
| 18 | `enummap-and-enumset` | good | ✓ | ✓ | ✓ | ✓ |
| 19 | `initial-capacity-sizing` | good | ✓ | ✓ | ✓ | ✓ |
| 20 | `concurrenthashmap-internals` | must | ✓ | ✓ | ✓ | ✓ |
| 21 | `atomic-compound-operations` | must | ✓ | ✓ | ✓ | ✓ |
| 22 | `copyonwritearraylist` | should | ✓ | ✓ | ~ | ✓ |
| 23 | `blocking-queues` | should | ✓ | ✓ | ✓ | ✓ |
| 24 | `weakly-consistent-iterators` | should | ✓ | ✓ | ✓ | ✗ |
| 25 | `concurrent-map-vs-cache` | good | ✓ | ✓ | ✓ | ✗ |
| 26 | `collections-and-parallel-streams` | good | ✓ | ✓ | ✓ | ✗ |

---

## Is it true — no failures, and one answer that survived a closer look

All 26 are correct as read, including the details that usually rot: the index
is `hash & (capacity - 1)`, the treeify threshold is eight, `HashSet` really is
a `HashMap` with one shared dummy value, `EnumMap` is an array indexed by
`ordinal()`, and the 2011 hash-collision attack is described accurately down
to the `Comparable` requirement for treeification and the fallback to class
names and identity hashes when the keys are not comparable.

**#19 `initial-capacity-sizing` was flagged during the read and cleared on a
full reading.** A question that answers "what capacity for 1000 entries" with
`expected / loadFactor + 1` is exactly the shape that goes stale, because
`HashMap.newHashMap(int)` has existed since Java 19 and does the arithmetic
for you. The answer already says so, and says to prefer it. **Recorded because
the near-miss is the point: the first 240 characters of that answer look like
a stale one, and the judgement has to be made on the whole of it.**

## Is it asked — no failures

All 26 are questions this subject is genuinely asked. #25
`concurrent-map-vs-cache` is phrased as a design point but is asked verbatim
("why not just use a `ConcurrentHashMap` as your cache?"), and its answer —
that a cache is mostly eviction policy and a map has none — is the reason it
earns a place.

## Is it at the right tier — two mismatches with the topic's own keyTopics

The topic names eight `keyTopics`. **Six map to a `must-know` question. Two do
not:**

| keyTopic | lands on | tier |
|---|---|---|
| TreeMap ordering | #12 `treemap-and-navigable` | should-know |
| CopyOnWriteArrayList | #22 `copyonwritearraylist` | should-know |

`java-language` matched all ten of its keyTopics to `must-know` questions;
this topic matches six of eight. **Neither is being promoted.** `keyTopics` is
a manifest of coverage rather than a tier declaration — it says the topic must
*address* the thing, not that the thing is top-tier — and both questions are
correctly second-tier for a backend interview, where `TreeMap` and
`CopyOnWriteArrayList` are recognition rather than daily work.

The finding worth keeping is that **nothing anywhere states which of those two
readings of `keyTopics` is intended**, and a future reader will re-derive it.
It is a manifest, not a tier list.

## Does it have a reference — 10 of 26 do not

No `must-know` is affected. One of the ten stands out:

**#16 `hash-collision-dos` carries no reference and makes the strongest
factual claims in the topic** — a named class of vulnerability, a date, a
specific mitigation shipped in a specific Java release, and an assertion that
Spring Boot and the servlet containers already set the relevant limits. Every
one of those is checkable and none is cited. **This is the single worst
reference gap found so far**, and it is worse than any of the eighteen in
`java-language`, because those are language semantics a reader can verify in
five minutes and this is security history they cannot.

Three more have an obvious canonical reference:

| Question | Available reference |
|---|---|
| #24 `weakly-consistent-iterators` | `java.util.concurrent` package summary — it defines the term |
| #4 `set-implementations` | `java.util.Set` javadoc |
| #8 `sublist-is-a-view` | `List.subList` javadoc, which documents the invalidation |

## Cross-links

Theory cites this topic **47 times**, from `collections-choosing`,
`hashmap-internals`, `streams-and-lambdas` and others. Three questions are
cited by no chapter — #6 `list-remove-int-vs-object`,
#9 `iterating-and-modifying-safely` and #24 `weakly-consistent-iterators`.
The first is a famous overload-resolution trap that `collections-choosing`
could reasonably point at; the other two are peripheral.

## Not judged here

Completeness, as everywhere in this pass. Also **not** judged: whether the
eight `keyTopics` are the right eight. That is a question about the manifest
in `SPRINGDECK-PLAN.md`, not about the questions.
