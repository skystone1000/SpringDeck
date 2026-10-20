# Triage — `rest-api` · REST APIs & Spring MVC

**22 questions · 10 must-know / 8 should-know / 4 good-to-know**
Read 2026-10-20, against **is it true**, **is it asked**, **is it at the right
tier**, **does it have a reference**.

| # | id | tier | T | A | R | L |
|---|---|---|---|---|---|---|
| 1 | `dispatcherservlet-lifecycle` | must | ✓ | ✓ | ✓ | ✓ |
| 2 | `filters-vs-interceptors` | must | ✓ | ✓ | ✓ | ✓ |
| 3 | `controller-vs-restcontroller` | should | ✓ | ✓ | ✓ | ✗ |
| 4 | `content-negotiation` | should | ✓ | ✓ | ✓ | ✓ |
| 5 | `request-parameter-binding` | should | ✓ | ✓ | ✓ | ✓ |
| 6 | `async-controller-methods` | good | ✓ | ✓ | ✓ | ✓ |
| 7 | `http-methods-and-idempotency` | must | ✓ | ✓ | ✓ | ✓ |
| 8 | `status-codes-that-matter` | must | ✓ | ✓ | ✓ | ✓ |
| 9 | `api-versioning` | must | ✓ | ✓ | ✓ | ✓ |
| 10 | `pagination` | must | ✓ | ✓ | ✓ | ✓ |
| 11 | `resource-naming` | should | ✓ | ✓ | ✓ | ✗ |
| 12 | `hateoas-and-richardson` | good | ✓ | ✓ | ✓ | ✗ |
| 13 | `dto-vs-entity` | must | ✓ | ✓ | ✓ | ✓ |
| 14 | `bean-validation` | must | ✓ | ✓ | ✓ | ✓ |
| 15 | `controlleradvice-and-problemdetail` | must | ✓ | ✓ | ✓ | ✓ |
| 16 | `validation-error-messages` | should | ✓ | ✓ | ✓ | ✗ |
| 17 | `exception-to-status-mapping` | should | ✓ | ✓ | ✓ | ✗ |
| 18 | `jackson-basics` | must | ✓ | ✓ | ✓ | ✓ |
| 19 | `jackson-dates-and-time` | should | ✓ | ✓ | ✓ | ✗ |
| 20 | `jackson-polymorphism` | good | ✓ | ✓ | ~ | **✗** |
| 21 | `partial-update-patch` | should | ✓ | ✓ | ✓ | ✓ |
| 22 | `large-payloads-and-streaming` | good | ✓ | ✓ | ✓ | ✗ |

---

## Findings

**True — no failures.** #7 gets the safe/idempotent split exactly right, which
is the one people reliably fumble (PUT and DELETE are idempotent, POST and
PATCH are not, and safe is a strict subset). #21 `partial-update-patch`
correctly identifies the absent-versus-null problem as the thing PATCH always
runs into, and cites the RFC.

**Asked — no failures.** #12 `hateoas-and-richardson` earns its place by
answering "does anyone actually use it" honestly, which is how it is asked.

**Tier — one reservation.** **#20 `jackson-polymorphism` is `good-to-know`
and covers a deserialization hazard**, which is a different kind of thing from
its `good-to-know` neighbours. It is left there because the *hazard* is
covered at `must-know` in `java-io-time`
#7 `why-java-serialization-is-a-hazard`, and this question is the Jackson-
specific mechanics rather than the lesson.

**Reference — 8 of 22 have none.** **#20 is the one worth fixing**: it
describes a named class of remote-code-execution vector and how to avoid it,
and cites nothing. A reader cannot check it, and this is the one subject where
being 90% right is not good enough.

A hypothesis was tested here and **refused**: that security-flavoured
questions are systematically under-cited across the deck. They are not — 56
questions make a security-shaped claim and 14% of them are uncited, against a
17% corpus baseline. Two individually bad cases (#20 here and
`collections/hash-collision-dos`) are not a pattern, and recording the refusal
saves the next reader from forming the same impression from the same two
examples.

**Cross-links — 0 uncited, 52 citations.** Every one of the 22 questions is
reachable from a theory chapter. Along with `spring-security` and four others
this is one of the fully-connected topics, and it is the standard the
`jvm-memory` and `streams-functional` gaps should be measured against.
