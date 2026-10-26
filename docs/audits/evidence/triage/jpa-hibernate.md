# Triage — `jpa-hibernate` · JPA & Hibernate

**21 questions · 11 must-know / 7 should-know / 3 good-to-know**
Read 2026-10-20, against **is it true**, **is it asked**, **is it at the right
tier**, **does it have a reference**.

| # | id | tier | T | A | R | L |
|---|---|---|---|---|---|---|
| 1 | `jpa-vs-hibernate` | must | ✓ | ✓ | ✓ | ✓ |
| 2 | `entity-lifecycle-states` | must | ✓ | ✓ | ✓ | ✓ |
| 3 | `entity-equals-hashcode` | must | ✓ | ✓ | ✓ | ✓ |
| 4 | `cascade-types` | must | ✓ | ✓ | ✓ | ✓ |
| 5 | `bidirectional-relationships` | should | ✓ | ✓ | ✓ | **✗** |
| 6 | `id-generation-strategies` | should | ✓ | ✓ | ✓ | ✓ |
| 7 | `inheritance-strategies` | good | ✓ | ✓ | ✓ | ✗ |
| 8 | `persistence-context-and-dirty-checking` | must | ✓ | ✓ | ✓ | ✓ |
| 9 | `flush-modes-and-when-flush-happens` | must | ✓ | ✓ | ✓ | ✓ |
| 10 | `lazy-initialization-exception` | must | ✓ | ✓ | ✓ | ✓ |
| 11 | `save-vs-persist-vs-merge` | should | ✓ | ✓ | ✓ | ✗ |
| 12 | `getreferencebyid-vs-findbyid` | good | ✓ | ✓ | ✓ | ✗ |
| 13 | `n-plus-one` | must | ✓ | ✓ | ✓ | ✓ |
| 14 | `lazy-vs-eager-defaults` | must | ✓ | ✓ | ✓ | ✓ |
| 15 | `join-fetch-and-pagination` | should | ✓ | ✓ | ✓ | ✗ |
| 16 | `projections-and-dto-queries` | should | ✓ | ✓ | ✓ | ✓ |
| 17 | `derived-queries-and-their-limits` | should | ✓ | ✓ | ✓ | ✓ |
| 18 | `first-and-second-level-cache` | must | ✓ | ✓ | ✓ | ✓ |
| 19 | `batch-inserts` | should | ✓ | ✓ | ✓ | ✓ |
| 20 | `bulk-update-and-delete` | good | ✓ | ✓ | ✓ | ✗ |
| 21 | `schema-generation-and-migrations` | must | ✓ | ✓ | ✓ | ✓ |

---

## Findings

**True — no failures.** The four JPA fetch defaults are stated correctly and
in the right combination (`@ManyToOne` and `@OneToOne` EAGER, `@OneToMany` and
`@ManyToMany` LAZY), which is the detail most often half-remembered. #11
`save-vs-persist-vs-merge` answers by quoting the four lines of
`SimpleJpaRepository.save()`, which is the only way that question stops being
folklore.

**Asked — no failures.** Sixteen `keyTopics`, the most of any topic, all
covered.

**Tier — no changes.**

**Reference — 6 of 21 have none.** **#5 `bidirectional-relationships` is the
one to fix**: `mappedBy` and the owning side are core JPA semantics, they are
`should-know`, and the Hibernate user guide — which this topic already cites
six times — documents them directly. #15 `join-fetch-and-pagination` is the
second: the in-memory paging warning it explains is emitted by Hibernate and
documented by it.

The rest (#7, #11, #12, #20) are lower-tier or procedure.

**Cross-links — 0 uncited, 49 citations** from `jpa-mapping`,
`persistence-context`, `fetching-and-n-plus-one`, `spring-data-jpa` and
`second-level-cache`. Fully connected.
