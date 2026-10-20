# Triage — `kafka-messaging` · Kafka & Messaging

**12 questions · 7 must-know / 5 should-know / 0 good-to-know**
Read 2026-10-20, against the four judgements.

| # | id | tier | T | A | R | L |
|---|---|---|---|---|---|---|
| 1 | `partitions-and-ordering` | must | ✓ | ✓ | ✓ | ~ |
| 2 | `consumer-groups-and-parallelism` | must | ✓ | ✓ | ✓ | ✓ |
| 3 | `offset-commit-strategies` | must | ✓ | ✓ | ✓ | ✓ |
| 4 | `rebalancing-and-slow-processing` | must | ✓ | ✓ | ✓ | ~ |
| 5 | `producer-acks-and-durability` | should | ✓ | ✓ | ✓ | ~ |
| 6 | `retry-and-dead-letter-topics` | must | ✓ | ✓ | ✓ | ✓ |
| 7 | `consumer-lag` | must | ✓ | ✓ | ✓ | ~ |
| 8 | `kafka-versus-rabbitmq` | must | ✓ | ✓ | ✓ | ~ |
| 9 | `retention-and-log-compaction` | should | ✓ | ✓ | ✓ | ~ |
| 10 | `schema-registry-and-message-contracts` | should | ✓ | ✓ | ✓ | ✓ |
| 11 | `idempotent-consumer-implementation` | should | ✓ | ✓ | ✓ | ✓ |
| 12 | `when-not-to-use-a-broker` | should | ✓ | ✓ | ✓ | ✓ |

---

## Findings

**True — no failures.** #1 states the ordering guarantee in the only form that
is actually true — within a partition, and nowhere else. #5
`producer-acks-and-durability` is built around the right observation, that
`acks=all` guarantees less than the name suggests *on its own*, which is
exactly what the question is testing. #8 reduces the Kafka/RabbitMQ comparison
to "Kafka is a log; RabbitMQ is a queue" and then derives the practical
differences from it, which is the answer that survives follow-ups.

**Asked — no failures.** Twelve `keyTopics`, all covered by twelve questions —
the tightest ratio in the deck.

**Tier — no changes.** No `good-to-know` layer, correctly.

**Reference — 12 of 12 have one, but six are marked `~` and Phase 9 is why.**

Six of these questions cite `kafka.apache.org/documentation/#<anchor>`. Those
URLs are alive, but Kafka has split its documentation into per-section pages
and now serves that path as a shim titled **"Documentation Redirect"** which
forwards in JavaScript. Phase 9 verified them, could not clear the fragment
check, and **decided to keep them**: the replacement paths carry a version
number (`/43/design/design/`) and would go stale, whereas the anchors are the
publisher's own version-independent aliases.

That decision is recorded in [`docs/verification-log.md`](../verification-log.md)
and this is the topic that pays for it. **A reader with JavaScript disabled
gets a stub page from half the references in this topic.** Nothing is being
changed here; it is recorded so the trade is visible from the topic as well as
from the link report.

**Structural — this topic has no subsections.** See the summary.

**Cross-links — 0 uncited, 28 citations** from `messaging-foundations`,
`kafka-mechanics` and `delivery-and-outbox`. Fully connected.
