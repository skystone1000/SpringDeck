# Triage — `transactions` · Transactions & Concurrency Control

**16 questions · 8 must-know / 6 should-know / 2 good-to-know**
Read 2026-10-20, against **is it true**, **is it asked**, **is it at the right
tier**, **does it have a reference**.

| # | id | tier | T | A | R | L |
|---|---|---|---|---|---|---|
| 1 | `acid` | must | ✓ | ✓ | ✓ | ✓ |
| 2 | `isolation-levels-and-anomalies` | must | ✓ | ✓ | ✓ | ✓ |
| 3 | `lost-update` | must | ✓ | ✓ | ✓ | ✓ |
| 4 | `transactional-propagation` | must | ✓ | ✓ | ✓ | ✓ |
| 5 | `rollback-rules` | must | ✓ | ✓ | ✓ | ✓ |
| 6 | `transactional-not-working` | must | ✓ | ✓ | ✓ | ✓ |
| 7 | `readonly-transactions` | should | ✓ | ✓ | ✓ | ✗ |
| 8 | `transaction-boundaries` | must | ✓ | ✓ | ✓ | ✓ |
| 9 | `deadlocks-in-the-database` | should | ✓ | ✓ | ✓ | ✗ |
| 10 | `optimistic-locking-details` | should | ✓ | ✓ | ✓ | **✗** |
| 11 | `pessimistic-lock-modes` | should | ✓ | ✓ | ✓ | **✗** |
| 12 | `transaction-and-async` | should | ✓ | ✓ | ✓ | ✗ |
| 13 | `connection-pool-and-transactions` | must | ✓ | ✓ | ✓ | ✓ |
| 14 | `programmatic-transactions` | good | ✓ | ✓ | ✓ | ✗ |
| 15 | `distributed-transactions` | should | ✓ | ✓ | ✓ | **✗** |
| 16 | `testing-transactions` | good | ✓ | ✓ | ✓ | ✓ |

---

## Findings

**True — no failures.** #1 `acid` does the useful thing of saying which letter
the application actually has to think about rather than reciting four words.
#5 `rollback-rules` states the default correctly — rollback on
`RuntimeException` and `Error`, **commit** on a checked exception — which is
the behaviour that surprises people and the one most often stated backwards.

**Asked — no failures.** Fourteen `keyTopics`, all covered.

**Tier — no changes.**

**Reference — 7 of 16 have none, 44%, the second-worst ratio in the deck**
after `aop-proxies`. Three of the seven matter:

- **#10 `optimistic-locking-details` and #11 `pessimistic-lock-modes`** are
  the two questions in the topic about the JPA locking API, and neither cites
  it. `LockModeType`, `PESSIMISTIC_READ`, `PESSIMISTIC_WRITE` and the
  `@Version` semantics are all specified in Jakarta Persistence and documented
  in the Hibernate guide — both of which the deck cites elsewhere.
- **#15 `distributed-transactions`** makes substantive claims about two-phase
  commit and why it is avoided, uncited. The answer is right; the reader has
  nowhere to go to check it.

**Structural — this topic has no subsections.** Sixteen questions, one flat
list. See the summary.

**Cross-links.** Theory cites this topic **43 times** for 16 questions, from
`transactions-and-isolation`, `spring-transactional` and
`locking-and-deadlocks`. One uncited: #12 `transaction-and-async`, which is
also uncited by a reference — the only question in this topic isolated on both
axes.
