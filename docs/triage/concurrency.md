# Triage — `concurrency` · Concurrency & Multithreading

**29 questions · 12 must-know / 11 should-know / 6 good-to-know**
Read 2026-10-20, against **is it true**, **is it asked**, **is it at the right
tier**, **does it have a reference**.

| # | id | tier | T | A | R | L |
|---|---|---|---|---|---|---|
| 1 | `race-condition-vs-visibility` | must | ✓ | ✓ | ✓ | ✓ |
| 2 | `happens-before` | must | ✓ | ✓ | ✓ | ✓ |
| 3 | `volatile-what-it-does` | must | ✓ | ✓ | ✓ | ✓ |
| 4 | `synchronized-vs-lock` | must | ✓ | ✓ | ✓ | ✓ |
| 5 | `deadlock-four-conditions` | must | ✓ | ✓ | ✓ | ✓ |
| 6 | `atomic-classes-and-cas` | should | ✓ | ✓ | ✓ | ✓ |
| 7 | `wait-notify-and-spurious-wakeups` | should | ✓ | ✓ | ✓ | ✓ |
| 8 | `threadlocal-leaks` | should | ✓ | ✓ | ~ | ✓ |
| 9 | `safe-publication` | should | ✓ | ✓ | ✓ | **✗** |
| 10 | `thread-interruption` | good | ✓ | ✓ | ✓ | ✗ |
| 11 | `why-not-new-thread` | must | ✓ | ✓ | ✓ | ✓ |
| 12 | `thread-pool-sizing` | must | ✓ | ✓ | ✓ | ✓ |
| 13 | `threadpoolexecutor-queue-behaviour` | must | ✓ | ✓ | ✓ | ✓ |
| 14 | `shutdown-vs-shutdownnow` | should | ✓ | ✓ | ✓ | ✓ |
| 15 | `future-vs-completablefuture` | must | ✓ | ✓ | ✓ | ✓ |
| 16 | `completablefuture-exceptions` | should | ✓ | ✓ | ✓ | ✗ |
| 17 | `forkjoin-common-pool` | should | ✓ | ✓ | ✓ | ✓ |
| 18 | `countdownlatch-vs-cyclicbarrier` | good | ✓ | ✓ | ✓ | ✗ |
| 19 | `scheduled-executor-drift` | good | ✓ | ✓ | ✓ | ✓ |
| 20 | `submit-swallows-exceptions` | good | ✓ | ✓ | ~ | **✗** |
| 21 | `what-virtual-threads-change` | must | ✓ | ✓ | ✓ | ✓ |
| 22 | `virtual-thread-pinning` | must | ✓ | ✓ | ✓ | ✓ |
| 23 | `virtual-threads-vs-reactive` | must | ✓ | ✓ | ✓ | ✓ |
| 24 | `structured-concurrency` | should | ✓ | ✓ | ~ | ✓ |
| 25 | `scoped-values` | should | ✓ | ✓ | ~ | ✓ |
| 26 | `bounding-virtual-threads` | should | ✓ | ✓ | ✓ | ✗ |
| 27 | `virtual-threads-in-spring-boot` | should | ✓ | ✓ | ✓ | ✓ |
| 28 | `virtual-thread-observability` | good | ✓ | ✓ | ✓ | ✗ |
| 29 | `thread-per-task-executor-lifecycle` | good | ✓ | ✓ | ✓ | ✗ |

---

## Is it true — no failures, and the version handling is the best in the deck

This topic carries the deck's single most version-sensitive fact, and it is
handled better than the triage expected to find it.

**#22 `virtual-thread-pinning`** does not state the Java 21 advice as
timeless. It names both causes, says which one moved, names **JEP 491 in Java
24**, gives the old advice and the new one with the versions attached, and
adds that "a candidate who states the old advice as timeless is dating
themselves". That is precisely the shape the plan's rule 2 asks for.

**And the theory corpus agrees with it**, which is the check worth running
where two corpora cover the same moving fact. `virtual-threads/
pinning-and-what-causes-it` carries a `version` block with `Java 21 → was` and
`Java 24 → changed`; `virtual-threads/platform-vs-virtual` calls JEP 491 "the
single most out-of-date fact in circulation"; `modern-java/
what-changed-per-lts`, `threads-and-memory-model/synchronized-and-monitors`
and `predict-concurrency/locks-latches-and-threadlocals` all say the same
thing. **Six places, one story.** Nothing in the toolchain checks that, and it
held anyway.

Other version claims spot-checked and correct: the common pool is
`availableProcessors() - 1` (#17), `ExecutorService` became `AutoCloseable` in
Java 19 (#29), and `spring.threads.virtual.enabled` is Boot 3.2 on JDK 21+
(#27).

## Is it asked — no failures

## Is it at the right tier — four reservations, no changes

Nine of the twelve `keyTopics` map to a `must-know` question. Three land at
`should-know`: **StructuredTaskScope** (#24), **scoped values** (#25) and
**ThreadLocal leaks** (#8). The first two are still preview-adjacent API and
`should-know` is the honest tier for them; #8 is a classic and is arguable,
but the leak it describes is a corollary of #11 `why-not-new-thread`, which is
`must-know`.

**#20 `submit-swallows-exceptions` at `good-to-know` is the one that nags.**
An exception that vanishes because nobody called `get()` is a production
incident, not a curiosity, and it is asked. Left where it is because the
neighbouring `good-to-know` entries are the same shape — sharp, specific
traps — and moving one without the others would just make the tier mean less.

## Does it have a reference — 8 of 29 do not

Two matter more than the rest:

- **#9 `safe-publication`** is a `should-know` question about the core
  guarantee of the Java Memory Model and cites nothing. JLS 17.5 and the
  `java.util.concurrent` package summary both document it, and **the deck
  already cites both, from other questions in this same topic.**
- **#20 `submit-swallows-exceptions`** makes a precise behavioural claim about
  `submit()` versus `execute()` with no citation. The `ExecutorService`
  javadoc states it outright.

The other six (#10, #16, #18, #26, #28, #29) are `good-to-know` or
`should-know` and each has an obvious javadoc target.

## Cross-links

Theory cites this topic **60 times** — second only to `java-language` — from
`threads-and-memory-model`, `locks-and-synchronizers`, `executors-and-futures`
and `virtual-threads`. Only two questions are cited by no chapter, both
`good-to-know`: #28 `virtual-thread-observability` and #29
`thread-per-task-executor-lifecycle`.

**This is what a well-connected topic looks like**, and it is the contrast
that makes `streams-functional` (4 citations for 28 questions) legible as a
defect rather than a style.

## Not judged here

Completeness. Also not judged: whether six `virtual` questions out of 29 is
the right weight for a topic where most interviews are still on Java 17.
