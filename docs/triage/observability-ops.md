# Triage — `observability-ops` · Observability, Docker & Kubernetes

**13 questions · 7 must-know / 5 should-know / 1 good-to-know**
Read 2026-10-20, against the four judgements.

| # | id | tier | T | A | R | L |
|---|---|---|---|---|---|---|
| 1 | `actuator-endpoints` | must | ✓ | ✓ | ✓ | ✓ |
| 2 | `liveness-versus-readiness` | must | ✓ | ✓ | ✓ | ✓ |
| 3 | `micrometer-and-cardinality` | must | ✓ | ✓ | ✓ | ✓ |
| 4 | `correlation-ids-and-structured-logs` | must | ✓ | ✓ | ✓ | ✓ |
| 5 | `percentiles-not-averages` | should | ✓ | ✓ | ✓ | ✓ |
| 6 | `what-to-alert-on` | should | ✓ | ✓ | ✓ | ✓ |
| 7 | `containerising-a-spring-boot-app` | must | ✓ | ✓ | ✓ | ✓ |
| 8 | `graceful-shutdown-in-kubernetes` | must | ✓ | ✓ | ✓ | ✓ |
| 9 | `deployment-strategies` | should | ✓ | ✓ | ✓ | ✓ |
| 10 | `graalvm-native-image` | good | ✓ | ✓ | ✓ | ✓ |
| 11 | `debugging-production` | must | ✓ | ✓ | ✓ | ✓ |
| 12 | `latency-investigation-order` | should | ✓ | ✓ | ✓ | ✓ |
| 13 | `what-to-log` | should | ✓ | ✓ | ✓ | ✓ |

---

## Findings

**True — no failures.** #2 `liveness-versus-readiness` correctly identifies
conflating them as one of the most damaging failure modes in Kubernetes — a
liveness probe that fails under load restarts healthy pods and turns a slowdown
into an outage. #5 `percentiles-not-averages` gives the concrete case that
makes the argument (10ms median, 4s p99, mean around 50ms, describing nobody).
#6 cites Google's SRE book for "alert on symptoms, not causes", which is the
right source for that claim.

**#11 `debugging-production` leads with the instruction that matters most** —
capture evidence before doing anything that destroys it, because a restart
fixes the symptom and removes every trace of the cause.

**Asked — no failures.** Thirteen `keyTopics`, all covered.

**Tier — no changes.**

**Reference — 13 of 13 have one.** #4 cites the W3C Trace Context
specification alongside Spring's documentation, matching what `microservices`
#15 does for the same mechanism — two topics, one primary source.

**Cross-links.** Theory cites this topic **36 times** — high for thirteen
questions — from `actuator-and-health`, `metrics-and-tracing`, `logging-well`,
`containers-and-k8s` and `release-and-incidents`. One uncited.

**Note.** `graceful-shutdown` here and `graceful-shutdown` in `spring-core`
are the pair that tripped `validate-questions` check 2 in Phase 6, the first
and only time that cross-topic duplicate-id check has fired on real content.
They were renamed rather than exempted because they are genuinely different
questions — the framework-level one and the platform-level one — and reading
both confirms that judgement. This one is about pod termination, `preStop` and
the sequence Kubernetes runs; the other is about `server.shutdown=graceful`.
