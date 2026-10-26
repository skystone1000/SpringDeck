# Triage — `jvm-memory` · JVM, Memory & Garbage Collection

**28 questions · 12 must-know / 11 should-know / 5 good-to-know**
Read 2026-10-20, against **is it true**, **is it asked**, **is it at the right
tier**, **does it have a reference**.

| # | id | tier | T | A | R | L |
|---|---|---|---|---|---|---|
| 1 | `stack-versus-heap` | must | ✓ | ✓ | ✓ | ✓ |
| 2 | `heap-generations-and-survivors` | must | ✓ | ✓ | ✓ | ✓ |
| 3 | `metaspace-and-permgen` | must | ✓ | ✓ | ✓ | ✓ |
| 4 | `stackoverflow-versus-outofmemory` | must | ✓ | ✓ | ✓ | ✓ |
| 5 | `memory-outside-the-heap` | should | ✓ | ✓ | ✓ | ✓ |
| 6 | `escape-analysis-and-scalar-replacement` | good | ✓ | ✓ | ✓ | ✓ |
| 7 | `tlab-allocation` | good | ✓ | ✓ | ✓ | ✓ |
| 8 | `compressed-oops-and-the-32gb-cliff` | good | ✓ | ✓ | ✓ | ✓ |
| 9 | `direct-byte-buffers` | should | ✓ | ✓ | ✓ | ✓ |
| 10 | `what-makes-an-object-collectable` | must | ✓ | ✓ | ✓ | ✓ |
| 11 | `minor-major-and-full-gc` | must | ✓ | ✓ | ✓ | ✓ |
| 12 | `how-g1-works` | must | ✓ | ✓ | ✓ | ✓ |
| 13 | `choosing-a-collector` | must | ✓ | ✓ | ✓ | ✓ |
| 14 | `is-gc-stop-the-world` | should | ✓ | ✓ | ✓ | ✓ |
| 15 | `reference-strengths` | should | ✓ | ✓ | ✓ | ✓ |
| 16 | `finalize-and-cleaner` | good | ✓ | ✓ | ✓ | ✓ |
| 17 | `humongous-allocations` | good | ✓ | ✓ | ✓ | ✓ |
| 18 | `does-the-jvm-return-memory` | should | ✓ | ✓ | ✓ | ✓ |
| 19 | `outofmemoryerror-flavours` | must | ✓ | ✓ | ✓ | ✓ |
| 20 | `diagnosing-a-memory-leak` | must | ✓ | ✓ | ✓ | ✓ |
| 21 | `jvm-diagnostic-tools` | must | ✓ | ✓ | ✓ | ✓ |
| 22 | `classloader-leak` | should | ✓ | ✓ | ✓ | ✓ |
| 23 | `jvm-in-a-container` | must | ✓ | ✓ | ✓ | ✓ |
| 24 | `reading-a-gc-log` | should | ✓ | ✓ | ✓ | ✓ |
| 25 | `leak-or-undersized-heap` | should | ✓ | ✓ | ✓ | ✓ |
| 26 | `jit-compilation-and-warmup` | should | ✓ | ✓ | ✓ | ✓ |
| 27 | `static-collection-leak` | should | ✓ | ✓ | ✓ | ✓ |
| 28 | `high-cpu-with-low-throughput` | should | ✓ | ✓ | ✓ | ✓ |

---

## Is it true — no failures

This is the topic with the most version- and number-shaped claims in the deck,
and they are all checkable and all correct: Metaspace replaced PermGen in
**Java 8**; `finalize` was deprecated for removal by **JEP 421 in Java 18**;
container awareness arrived in **8u191**; `-Xlog:gc*` replaced the
`PrintGCDetails` family in **Java 9**; a humongous object is one larger than
**half a G1 region**; compressed oops stop at roughly **32GB** because objects
are 8-byte aligned.

Two answers are worth singling out for saying something true that the popular
answer gets wrong. **#14 `is-gc-stop-the-world`** states outright that no
production collector is fully concurrent and that "a candidate claiming ZGC is
pauseless is repeating marketing". **#6 `escape-analysis-and-scalar-
replacement`** distinguishes what the specification says from what the runtime
does, rather than repeating "all objects are on the heap".

## Is it asked — no failures

Four of these (#20, #25, #28, and #23) are scenario questions rather than
definitional ones — "walk through finding the cause" — which is how this
material is actually asked at senior level.

## Is it at the right tier — no changes

Eleven `keyTopics`, all covered, and the tier assignment tracks them
sensibly. `class loading` and `classloader leaks` both land on #22, which is
`should-know` and correct: it is a real production failure but a rare
interview question outside application-server work.

## Does it have a reference — 28 of 28 do

**Complete coverage**, the second topic in the deck to achieve it after
`streams-functional`. Several carry two references (#12, #13, #20, #21), and
#20 `diagnosing-a-memory-leak` cites Eclipse MAT alongside Oracle's
troubleshooting guide, which is the right pair for a question whose answer is
a procedure rather than a fact.

## Cross-links — 21 of 28 uncited, and the cause is one module

The topic receives only **9** `relatedQuestions` references, from
`strings-and-text`, `enums-and-nested-types`, `io-and-serialization`,
`containers-and-k8s` and `cloud-for-java-services` — none of which is about
the JVM.

**`heap-and-gc` has nine chapters and zero `relatedQuestions`. It is the only
subject module in the entire deck with none.** `jvm-diagnostics` has nine
chapters and one, which points at `concurrency`.

So the two modules that teach heap structure, collectors, GC logs, heap dumps
and diagnostic tooling do not link to the 28 questions on heap structure,
collectors, GC logs, heap dumps and diagnostic tooling. A reader finishing
`heap-and-gc` is offered nothing to practise on.

`validate-theory` cannot see this: it checks that references **resolve**, not
that a module has any. **A module with zero links is indistinguishable from a
module whose links are all correct.**

## Not judged here

Completeness. Also not judged: whether the split across three subsections
(`structure`, `gc`, `diagnostics`) puts each question in the right one.
