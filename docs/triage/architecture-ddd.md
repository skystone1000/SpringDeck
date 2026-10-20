# Triage — `architecture-ddd` · Application Architecture & DDD

**12 questions · 8 must-know / 4 should-know / 0 good-to-know**
Read 2026-10-20, against the four judgements.

| # | id | tier | T | A | R | L |
|---|---|---|---|---|---|---|
| 1 | `package-by-layer-or-feature` | must | ✓ | ✓ | ✓ | ✓ |
| 2 | `hexagonal-architecture` | must | ✓ | ✓ | ✓ | ✓ |
| 3 | `dto-versus-entity` | must | ✓ | ✓ | ✓ | ✓ |
| 4 | `when-clean-architecture-is-overkill` | must | ✓ | ✓ | ✓ | ✓ |
| 5 | `bounded-context` | must | ✓ | ✓ | ✓ | ✓ |
| 6 | `aggregate-and-aggregate-root` | must | ✓ | ✓ | ✓ | ✓ |
| 7 | `entity-versus-value-object` | should | ✓ | ✓ | ✓ | ✓ |
| 8 | `anaemic-domain-model` | must | ✓ | ✓ | ✓ | ✓ |
| 9 | `ubiquitous-language` | should | ✓ | ✓ | ✓ | ✓ |
| 10 | `cqrs` | must | ✓ | ✓ | ✓ | ✓ |
| 11 | `event-sourcing` | should | ✓ | ✓ | ✓ | ✓ |
| 12 | `read-models-and-projections` | should | ✓ | ✓ | ✓ | ✓ |

---

## Findings

**True — no failures.** #10 `cqrs` answers the second half correctly and
plainly: **no**, CQRS does not require separate databases, and the belief that
it does is what makes people think it is heavier than it is. #1 settles
package-by-feature with a concrete Java-specific argument — package-private
visibility only means anything if the things that belong together are in one
package — rather than with taste.

**#4 `when-clean-architecture-is-overkill` is the question that keeps this
topic honest**: when there is no domain to protect, which is most services.

**Asked — no failures.** Fourteen `keyTopics`, all covered.

**Tier — no changes.** Eight of twelve `must-know`, no `good-to-know` layer.

**Reference — 12 of 12 have one.** #3 cites OWASP rather than Spring, which is
right: two of its four reasons for not returning an entity are security issues
(mass assignment on the way in, over-exposure on the way out) rather than
design preferences, and the answer says so.

**Note — #3 `dto-versus-entity` overlaps `rest-api` #13 `dto-vs-entity`.**
Near-identical ids, the same question, different topics. Unlike the
`try-with-resources` pair in `java-io-time` the framings are genuinely
different — `rest-api` argues from API contract stability, this one from
domain-boundary and security — but this is the second instance found of the
same content maintained twice, and **`validate-questions` check 2 catches
neither, because it only refuses a duplicate *id* across topics.** See the
summary.

**Cross-links — 0 uncited, 35 citations** from `application-architecture`,
`ddd-tactical`, `service-boundaries` and `cqrs-and-event-sourcing`. Fully
connected.
