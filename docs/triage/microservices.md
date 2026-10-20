# Triage — `microservices` · Microservices & Distributed Patterns

**16 questions · 10 must-know / 6 should-know / 0 good-to-know**
Read 2026-10-20, against the four judgements.

| # | id | tier | T | A | R | L |
|---|---|---|---|---|---|---|
| 1 | `when-to-split-a-monolith` | must | ✓ | ✓ | ✓ | ✓ |
| 2 | `database-per-service` | must | ✓ | ✓ | ✓ | ✓ |
| 3 | `sync-versus-async-communication` | must | ✓ | ✓ | ✓ | ✓ |
| 4 | `distributed-monolith` | should | ✓ | ✓ | ✓ | ✓ |
| 5 | `timeouts-and-retries` | must | ✓ | ✓ | ✓ | ✓ |
| 6 | `circuit-breaker-states` | must | ✓ | ✓ | ✓ | ✓ |
| 7 | `bulkhead-isolation` | should | ✓ | ✓ | ✓ | ✓ |
| 8 | `idempotency-keys` | must | ✓ | ✓ | ✓ | ✓ |
| 9 | `why-not-two-phase-commit` | must | ✓ | ✓ | ✓ | ✓ |
| 10 | `saga-orchestration-or-choreography` | must | ✓ | ✓ | ✓ | ✓ |
| 11 | `transactional-outbox` | must | ✓ | ✓ | ✓ | ✓ |
| 12 | `exactly-once-delivery` | should | ✓ | ✓ | ✓ | ~ |
| 13 | `api-gateway-responsibilities` | should | ✓ | ✓ | ✓ | ✓ |
| 14 | `service-discovery` | should | ✓ | ✓ | ✓ | ✓ |
| 15 | `distributed-tracing` | must | ✓ | ✓ | ✓ | ✓ |
| 16 | `configuration-across-services` | should | ✓ | ✓ | ✓ | ✓ |

---

## Findings

**True — no failures.** #12 `exactly-once-delivery` gives the correct and
uncomfortable answer — not as *delivery*, it is provably impossible over an
unreliable network — and then gives the reasoning in one sentence rather than
appealing to authority. #9 and #11 together do the same job for the dual-write
problem: there is no solution that involves doing both writes.

**#1 opens by pushing back on its own premise** ("the honest default is do not
split yet"), which is how this question is actually assessed at senior level.

**Asked — no failures.** Fifteen `keyTopics`, all covered.

**Tier — no changes.** Ten of sixteen `must-know` and no `good-to-know` layer.
Right for a topic where every entry is either a design decision a candidate
must defend or a failure mode that causes an outage.

**Reference — 16 of 16 have one.** #15 `distributed-tracing` cites the W3C
Trace Context specification alongside Micrometer, which is the correct pair for
an answer that deliberately describes the mechanism rather than naming a
product.

**#12 is marked `~`** for the reason recorded under `kafka-messaging`: it
cites `kafka.apache.org/documentation/#semantics`, one of the nine anchors
Phase 9 kept deliberately and which now lands on a JavaScript redirect shim.

**Cross-links — 0 uncited, 44 citations** from `service-boundaries`,
`resilience-patterns`, `saga-and-consistency`, `delivery-and-outbox`,
`sync-communication` and `idempotency`. Fully connected.
