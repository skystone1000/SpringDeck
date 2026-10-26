# Triage — `design-patterns` · Design Patterns, SOLID & OOD

**12 questions · 6 must-know / 6 should-know / 0 good-to-know**
Read 2026-10-20, against the four judgements.

| # | id | tier | T | A | R | L |
|---|---|---|---|---|---|---|
| 1 | `solid-principles` | must | ✓ | ✓ | ✓ | ✓ |
| 2 | `liskov-violations-in-real-code` | should | ✓ | ✓ | ✓ | ✓ |
| 3 | `dependency-inversion-versus-injection` | must | ✓ | ✓ | ✓ | ✓ |
| 4 | `open-closed-in-practice` | should | ✓ | ✓ | ✓ | ✓ |
| 5 | `strategy-pattern` | must | ✓ | ✓ | ✓ | ✓ |
| 6 | `factory-versus-builder` | must | ✓ | ✓ | ✓ | ✓ |
| 7 | `singleton-and-spring` | should | ✓ | ✓ | ✓ | ✓ |
| 8 | `decorator-proxy-adapter` | should | ✓ | ✓ | ✓ | ✓ |
| 9 | `template-method-versus-strategy` | should | ✓ | ✓ | ✓ | ✓ |
| 10 | `patterns-spring-uses` | must | ✓ | ✓ | ✓ | ✓ |
| 11 | `when-a-pattern-is-overkill` | must | ✓ | ✓ | ✓ | ✓ |
| 12 | `anti-patterns` | should | ✓ | ✓ | ✓ | ✓ |

---

## Findings

**True — no failures.** #3 draws a distinction most people collapse:
dependency **inversion** is about which way the source dependency points;
dependency **injection** is a mechanism for supplying a collaborator. You can
have either without the other, and the answer says so.

**#7 `singleton-and-spring` answers the question that is actually being
asked** — a Spring singleton is one instance *per container*, the Gang of Four
singleton enforces one instance *per classloader* through a private
constructor and static accessor, and that is why one is an anti-pattern and the
other is the default.

**#4 and #11 both decline to advocate.** "You mostly do not" apply open-closed
in advance, and a pattern is the wrong decision "whenever it costs more to read
than the flexibility is worth". A patterns topic that says when not to use
patterns is doing the job.

**Asked — no failures.** Eighteen `keyTopics` — the most of any topic — all
covered by twelve questions, because several questions carry three or four
(e.g. #8 covers decorator, proxy and adapter together, which is how the
distinction is asked).

**Tier — no changes.** No `good-to-know` layer.

**Reference — 12 of 12 have one.**

**Cross-links — 0 uncited, 34 citations** from `solid-and-ood`,
`patterns-that-get-asked`, `patterns-in-spring` and `lld-method`. Fully
connected.
