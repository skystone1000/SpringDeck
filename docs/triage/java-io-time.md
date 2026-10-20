# Triage — `java-io-time` · I/O, Serialization & Date/Time

**22 questions · 9 must-know / 7 should-know / 6 good-to-know**
Read 2026-10-20, against **is it true**, **is it asked**, **is it at the right
tier**, **does it have a reference**.

| # | id | tier | T | A | R | L |
|---|---|---|---|---|---|---|
| 1 | `byte-versus-character-streams` | must | ✓ | ✓ | ✓ | ✓ |
| 2 | `try-with-resources-details` | must | ✓ | ~ | ✓ | ✓ |
| 3 | `streaming-a-large-file` | must | ✓ | ✓ | ✓ | ✓ |
| 4 | `files-and-path-over-file` | should | ✓ | ✓ | ✓ | ✓ |
| 5 | `nio-channels-and-buffers` | good | ✓ | ✓ | ✓ | ✓ |
| 6 | `writing-a-file-safely` | good | ✓ | ✓ | ✓ | ✓ |
| 7 | `why-java-serialization-is-a-hazard` | must | ✓ | ✓ | ✓ | ✓ |
| 8 | `serialversionuid` | must | ✓ | ✓ | ✓ | ✓ |
| 9 | `transient-and-what-is-skipped` | should | ✓ | ✓ | ✓ | ✓ |
| 10 | `records-and-serialization` | good | ✓ | ✓ | ✓ | ✓ |
| 11 | `serialization-alternatives` | must | ✓ | ✓ | ✓ | ✓ |
| 12 | `localdate-instant-zoneddatetime` | must | ✓ | ✓ | ✓ | ✓ |
| 13 | `storing-time-in-a-database` | must | ✓ | ✓ | ✓ | ✓ |
| 14 | `duration-versus-period` | should | ✓ | ✓ | ✓ | ✓ |
| 15 | `dst-and-ambiguous-times` | must | ✓ | ✓ | ✓ | ✓ |
| 16 | `why-java-time-replaced-date` | should | ✓ | ✓ | ✓ | ✓ |
| 17 | `clock-for-testable-time` | should | ✓ | ✓ | ✓ | ✓ |
| 18 | `monotonic-versus-wall-clock` | good | ✓ | ✓ | ✓ | ✓ |
| 19 | `buffering-and-why-it-matters` | should | ✓ | ✓ | ✓ | ✓ |
| 20 | `externalizable-versus-serializable` | good | ✓ | ✓ | ✓ | ✓ |
| 21 | `time-on-the-wire` | should | ✓ | ✓ | ✓ | ✓ |
| 22 | `date-arithmetic-and-adjusters` | good | ✓ | ✓ | ✓ | ✓ |

---

## Is it true — no failures, and one answer follows the plan's SQL rule exactly

**#13 `storing-time-in-a-database`** writes "In PostgreSQL 16,
`timestamp with time zone` does not store a zone — it converts to UTC on the
way in". That is correct, it is the single most misunderstood thing about
that type, and **it names the engine and version**, which is what
`SPRINGDECK-PLAN.md` Part 9 requires of every dialect-dependent claim. The
rule was written for `sql-result` predict artefacts; this question observes it
without being obliged to.

**#15 `dst-and-ambiguous-times`** is right about the thing everyone gets wrong:
`java.time` resolves a gap and an overlap by documented rules rather than
throwing. "It throws" is the common wrong answer and the question says so.

## Is it asked — one reservation

**#2 `try-with-resources-details` duplicates `java-language`
#42 `try-with-resources-and-suppressed`.** Both are `must-know`/`should-know`
respectively, both open "Three things, and the third is the one…", and both
cover reverse-order closing and suppressed exceptions.

`validate-questions` check 2 does not object because the ids differ and it
only refuses a **duplicate id** across topics — which is exactly the check
that fired on `graceful-shutdown` in Phase 6. **Two questions can say the same
thing under different names and nothing notices.**

Whether it is a defect is a judgement. Recorded as `~` rather than `✗`
because the framing genuinely differs — `java-language` reaches it through
exception semantics and this one through resource handling — and a reader
arriving from either topic wants it there. But it is one answer's worth of
content maintained in two places, and if one is ever corrected the other will
not be.

## Is it at the right tier — no changes

Fourteen `keyTopics`, the most of any topic, and all fourteen are covered.
Nine `must-know` for 22 questions is the highest ratio outside `spring-
security`, and it is justified: `serialVersionUID`, `Instant` versus
`LocalDateTime`, and DST handling are all asked directly and all produce
production defects when got wrong.

## Does it have a reference — 22 of 22 do

**Complete coverage.** Third topic to achieve it.

## Cross-links

Theory cites this topic **25 times**, from `io-and-serialization` and
`dates-and-times`. One question is cited by no chapter. **This is what the
`jvm-memory` and `streams-functional` gaps should look like** — the modules
that teach the material link to the questions that drill it.

## Not judged here

Completeness. Also not judged: whether I/O, serialization and date/time belong
in one topic at all. They share no subject matter; they share the property of
being standard-library areas that interviews touch lightly. That is a manifest
question.
