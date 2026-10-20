# Triage — `streams-functional` · Streams, Lambdas & Optional

**28 questions · 11 must-know / 13 should-know / 4 good-to-know**
Read 2026-10-20, against **is it true**, **is it asked**, **is it at the right
tier**, **does it have a reference**.

| # | id | tier | T | A | R | L |
|---|---|---|---|---|---|---|
| 1 | `what-a-stream-is-not` | must | ✓ | ✓ | ✓ | ✓ |
| 2 | `intermediate-vs-terminal-operations` | must | ✓ | ✓ | ✓ | ✓ |
| 3 | `laziness-and-element-order` | must | ✓ | ✓ | ✓ | ✓ |
| 4 | `stream-is-single-use` | should | ✓ | ✓ | ✓ | ✓ |
| 5 | `map-vs-flatmap` | must | ✓ | ✓ | ✓ | ✓ |
| 6 | `collectors-groupingby` | must | ✓ | ✓ | ✓ | ✓ |
| 7 | `collectors-tomap-traps` | must | ✓ | ✓ | ✓ | ✓ |
| 8 | `reduce-vs-collect` | should | ✓ | ✓ | ✓ | ✓ |
| 9 | `when-parallel-streams-help` | must | ✓ | ✓ | ✓ | ✓ |
| 10 | `parallel-stream-common-pool` | should | ✓ | ✓ | ✓ | ✓ |
| 11 | `side-effects-in-lambdas` | should | ✓ | ✓ | ✓ | ✓ |
| 12 | `peek-and-when-not-to-use-it` | should | ✓ | ✓ | ✓ | ✓ |
| 13 | `stream-tolist-vs-collectors-tolist` | should | ✓ | ✓ | ✓ | ✓ |
| 14 | `primitive-streams-and-boxing` | should | ✓ | ✓ | ✓ | ✓ |
| 15 | `what-optional-is-for` | must | ✓ | ✓ | ✓ | ✓ |
| 16 | `orelse-vs-orelseget` | must | ✓ | ✓ | ✓ | ✓ |
| 17 | `optional-chaining-methods` | should | ✓ | ✓ | ✓ | ✓ |
| 18 | `lambda-vs-anonymous-class` | must | ✓ | ✓ | ✓ | ✓ |
| 19 | `effectively-final-capture` | must | ✓ | ✓ | ✓ | ✓ |
| 20 | `functional-interfaces-and-sam` | should | ✓ | ✓ | ~ | ✓ |
| 21 | `method-reference-kinds` | should | ✓ | ✓ | ~ | ✓ |
| 22 | `checked-exceptions-in-lambdas` | should | ✓ | ✓ | ✓ | ✓ |
| 23 | `comparator-chaining-and-reversed` | should | ✓ | ✓ | ✓ | ✓ |
| 24 | `partitioningby-vs-groupingby` | good | ✓ | ✓ | ✓ | ✓ |
| 25 | `infinite-streams-and-limit` | good | ✓ | ✓ | ✓ | ✓ |
| 26 | `findfirst-vs-findany` | good | ✓ | ✓ | ✓ | ✓ |
| 27 | `stream-gatherers` | good | ✓ | ✓ | ✓ | ✓ |
| 28 | `when-a-loop-beats-a-stream` | should | ✓ | ✓ | ✓ | ✓ |

---

## Is it true — no failures, and the version claims are unusually careful

All 28 correct. This topic carries nine version-shaped claims, which is the
kind of thing that rots, and every one of them is precise rather than vague:
`Stream.toList()` is Java 16, private interface methods are Java 9, the common
pool is `availableProcessors() - 1` plus the donated calling thread, and #27
`stream-gatherers` says gatherers "became a permanent feature in Java 24,
having previewed in 22 and 23" — which is exactly right, and is the form the
plan's rule 2 asks for.

## Is it asked — no failures

## Is it at the right tier — two keyTopics land second-tier

Seven of the nine `keyTopics` map to a `must-know` question. Two do not:
**functional interfaces** (#20, should-know) and **method references** (#21,
should-know). Same pattern as `collections`, and left alone for the same
reason — both are recognition-level for a backend interview, where the
lambda-vs-anonymous-class question (#18, must-know) is what actually gets
asked and both of these are its supporting detail.

## Does it have a reference — 28 of 28 do

**The only topic in the deck with complete reference coverage**, and worth
recording as the counter-example to `java-language`, which has 18 gaps in 44.
Nothing about the two topics' subject matter explains the difference. The
standard rose between them and the earlier work was never backfilled.

## Cross-links — the worst in the deck, and it is a real gap

**24 of 28 questions are cited by no theory chapter**, and the topic as a
whole receives only **4** `relatedQuestions` references. For comparison
`java-language` receives 76 and `concurrency` 60, on comparable question
counts.

The cause is specific and fixable: **`streams-and-lambdas` (9 chapters) and
`modern-java` (7 chapters) — the two modules that teach exactly this material
— never link to this topic.** `streams-and-lambdas` links to `java-language`,
`collections`, `concurrency` and `jpa-hibernate`; `modern-java` links to
`java-language`, `rest-api`, `spring-boot` and `collections`. Between them
they point at six topics and miss the one named after them.

`validate-theory` cannot catch this. It checks that every `relatedQuestions`
reference **resolves**, which is a different assertion from a module linking
to the topic it is about. **A module that links nowhere and a module that
links to the wrong place both pass.**

## Structural — this topic has no subsections

`subsections` is empty, so all 28 questions render as one undifferentiated
list. `app.js:341` emits an `<h2 class="subsection-heading">` whenever a
question's subsection changes, and sixteen topics get that grouping; this one
does not, and at 28 questions it is the largest topic affected.

Its own `keyTopics` all but names the groups it should have — the stream
model, collectors, parallelism, `Optional`, and lambdas and method
references. **Ten topics share this gap**; see the summary.

## Not judged here

Completeness. Also not judged: whether the four `good-to-know` entries earn
their place against a shorter topic — that is a manifest question.
