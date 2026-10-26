---
title: Triage — the theory corpus, read chapter by chapter
status: completed
last_updated: 2026-10-26
scope: >
  All 98 theory modules read in full: 687 chapters, 46 drills, 81 predicts.
  Fifteen defects found and fixed, four proved by compiling or executing the
  claim.
---

# Triage — the theory corpus, read chapter by chapter

`OTHER-MODES.md` recorded, on 2026-10-24, that **687 chapters, 46 drills, 81 predicts and 61
glossary terms had not been read for correctness**, and called a chapter-by-chapter read "the
outstanding work on this deck". This file is that read.

Read 2026-10-26 against the corpus at that date: **98 modules — 83 subject modules carrying 687
chapters, plus 15 set modules carrying 46 drills and 81 predicts.** Every one was read in full.

**Fifteen defects were found and every one is fixed.** Four were proved wrong by compiling or
running the claim rather than by reasoning about it.

---

## What this is, and what it is not

**It is a per-module record, not a per-chapter one, and that is a deliberate difference from the
question-bank triage.** The 26 files beside this one carry a row per question, 486 of them, and
the row counts adding to 486 is the mechanical proof that the read covered everything. A row per
chapter here would add to 687 and prove the same thing — and it would be 687 rows saying "read,
no defect found", which is a shape that looks like evidence and is not.

What is offered instead is the **claims checked** column: per module, the specific facts that were
looked up, compiled, executed or cross-referenced. Those are falsifiable — anybody can re-run them
— and they are what a reader should judge the pass on. The module and chapter counts below are
generated from the corpus rather than typed, so the totals cannot drift from what was read.

**What this pass could not check.** Whether a cited page still *says* what it is cited for: 793
distinct URLs is a reading, not a link check, and `check-doc-links` verifies that a page answers
and carries the fragment, not that it supports the sentence. Anything requiring PostgreSQL, Kafka
or a Spring context to observe: those were checked against specifications and javadocs and are
marked as reasoned rather than executed. And judgement, as opposed to fact — the craft and
distributed tracks are mostly argument, and an argument can be sound and still not be the one a
particular reader would make.

---

## The fifteen findings

Ordered by how much the reader was misled, not by where they were found.

### Proved wrong by running the claim

**1 — The inner-class leak example retained nothing.**
`enums-and-nested-types` / `the-outer-reference-and-its-leak` claimed "every Comparator instance
carries `this$0` -> the generator, and therefore the 200 MB", and the whole chapter is built on it.
Compiled it: `ReportGenerator$ByTotal` had **no `this$0` field**, because `compare()` never touched
the enclosing instance and `javac` elides the field when the inner class does not use its outer.
The example demonstrated nothing.

Fixed by giving the comparator a `descending` field on the generator that it actually reads;
recompiled, and `final ReportGenerator this$0;` is now present. **The fix then found a second
trap**: written as `private final boolean descending = true;` the field is a *compile-time
constant*, `javac` folds it at the use site, the inner class stops reading the outer, and the
field is elided again — the demonstration silently stops demonstrating. It has to be assigned in
the constructor. Both facts are now in the chapter.

This is the **fourth** appearance of this fact in the deck. Phase 9 corrected it in a predict
block, Phase 10 corrected it in `java-language` — and it survived here, in the one chapter whose
entire subject it is.

**2 — `Collectors.toMap` names the key, and has since Java 9.**
`streams-and-lambdas` / `collectors`: "The message names the VALUE, not the key, which makes it
unexpectedly hard to debug." Executed on OpenJDK 25:
`Duplicate key a (attempted merging values aa and ab)` — the key **and** both values. True of
Java 8; fixed in Java 9. A stale fact in the present tense.

**3 — `LocalDate.plus(Duration)` compiles.**
`dates-and-times` / `duration-vs-period` carried the comment "does not compile on a `LocalDate`".
Executed: it compiles — `Duration` is a `TemporalAmount` — and throws
`UnsupportedTemporalTypeException: Unsupported unit: Seconds` at run time. The lesson was right
and the mechanism was not, which is the Phase 9 pattern exactly.

**4 — `LAG` and `LEAD` were labelled backwards.**
`sql-you-are-asked` / `window-functions`, a must-know chapter, over a window of
`ORDER BY salary DESC`:

```sql
LAG(salary)  OVER w AS next_lower,     -- wrong
LEAD(salary) OVER w AS next_higher     -- wrong
```

`LAG` looks *backwards* along the window order, which under `DESC` is the **higher** salary.
Executed in SQLite (window functions since 3.25) over salaries 300/200/100: for the middle row,
`LAG` returned **300** and `LEAD` returned **100**. The aliases are the part a reader copies.

### Proved wrong against a javadoc

**5 — A version block was wrong on three counts.**
`relational-foundations` / `uuid-vs-bigint-keys`:
"[changed Hibernate 6.5] `@UuidGenerator(style = TIME)` generates UUIDv7-style values." Checked the
Hibernate javadocs: at **6.6** the `Style` enum has exactly three constants — `AUTO`, `RANDOM`,
`TIME` — and `TIME` is documented as "a time-based generation strategy consistent with RFC 4122
**version 1**, but with IP address instead of MAC address". `VERSION_6` and `VERSION_7` appear in
**Hibernate 7.0**, both `@Incubating`. Wrong release, wrong constant, wrong UUID version — in the
one module whose headline is UUIDv7.

**This one matters beyond its fix.** `OTHER-MODES.md` records that all 44 version blocks were read
in full and "No errors found". They were checked against JDK and Spring releases, which are widely
known; a third-party API detail was not, and it survived. The version-block read was narrower than
its own summary claimed, and that line is now corrected.

**6 — A retry that could not catch the failure it was written for.** Twice.
`transactions-and-isolation` / `choosing-an-isolation-level` had
`@Retryable(retryFor = CannotAcquireLockException.class)` under the comment "SERIALIZABLE can abort
with a serialization failure at COMMIT. Without the retry, the correctness guarantee just becomes a
500." Checked the Spring javadocs: `CannotAcquireLockException`,
`CannotSerializeTransactionException` and `DeadlockLoserDataAccessException` are **siblings** under
`PessimisticLockingFailureException`. PostgreSQL's `40001` translates to the second; a deadlock
(`40P01`) to the third; `CannotAcquireLockException` is the translation of `55P03`, a lock timeout,
and of nothing else. The retry could not fire.

`locking-and-deadlocks` / `consistent-lock-ordering` had the same annotation as "the safety net,
for the deadlocks nobody predicted" — wrong for a second, different reason. One wrong idiom, copied
across two modules, wrong in both. Both now retry on `ConcurrencyFailureException`, which is the
supertype every translator produces, and both say why.

**7 — `jcmd Thread.print` does find `ReentrantLock` deadlocks.**
`threads-and-memory-model` claimed it "does not detect deadlocks on ReentrantLock as reliably,
which is one argument for keeping to `synchronized` where either would do." Built a two-lock
deadlock and ran `jcmd Thread.print` on OpenJDK 25: *"Found one Java-level deadlock"*, naming both
threads and both ownable synchronizers, with full stacks. HotSpot has detected these since JDK 6.

The advice drawn from it was also backwards now that JEP 491 has removed the pinning argument in
the other direction — and **`jvm-diagnostics` states the opposite in the same corpus**, which is
how it was caught. Two chapters disagreeing about one fact is a defect whichever of them is right.

### Corpus contradicting itself

**8 — One warning, two codes.**
The Hibernate pagination warning is `HHH90003004` in three files and `HHH000104` in a fourth.
`HHH000104` is the **Hibernate 5** code; Hibernate 6 logs `HHH90003004`, and `predict-jpa` cites
the Hibernate 6 user guide for exactly that. This deck's baseline is Boot 3 / Hibernate 6
throughout — so the instruction "search the logs for `HHH000104` on any JPA codebase you inherit"
missed the warning on the version the deck targets. Now names both, and says which is which.

**9 — `FAIL_ON_UNKNOWN_PROPERTIES`, whose default?**
`drills-debug-and-review` said JSON is safe "until `FAIL_ON_UNKNOWN_PROPERTIES` is left at its
default true on the consumer". Four other places in the corpus say Spring Boot **disables** it.
Both are true of their subject — Jackson's default is `true`, Boot's mapper turns it off — and in a
Spring Boot deck the drill named the wrong half. Now says which default belongs to whom.

**10 — A rule contradicting its own worked example, one clause later.**
`configuration-and-profiles` / `relaxed-binding` offered the environment-variable rule as something
to do in your head: "uppercase everything, replace every dot and every dash with an underscore" —
and then gave `spring.datasource.max-pool-size` → `SPRING_DATASOURCE_MAXPOOLSIZE`, which does not
follow from it and matches the table above it. Boot's documented rule **removes** the dashes.

### Wrong in a way that would mislead

**11 — A `preview` API recommended without the word.**
`locks-and-synchronizers` and `executors-and-futures` both point at `StructuredTaskScope` "on Java
21" as the modern answer to fan-out. `virtual-threads` states plainly that it is still preview in
Java 25 and "not for production", and insists you say so if you bring it up. The two forward
references did not. Now they do.

**12 — `-parameters` does not explain `@Value`.**
`reflection-and-annotations` said the Boot plugins set `-parameters`, "which is why
`@Value("${x}")` on a constructor parameter works without `@Qualifier`". `@Value` names the
property itself and needs no parameter name. Parameter names are what by-name bean resolution and
`@ConfigurationProperties` constructor binding rely on. Right premise, wrong "which is why".

### Small

**13** — `generics-and-erasure`: "C# made the other choice two years later." Java 5 shipped
September 2004 and C# 2.0 November 2005. About a year.

**14** — `serialization`: `new BigDecimal(0.1)` was printed to 34 of its 55 digits with no
ellipsis, as though it were the complete value.

**15** — `dates-and-times`: the `YYYY` week-based-year example claimed 2026-12-28 formats as 2027.
Executed: 2027 under `en_US`, and **2026 under `en_GB` and `de_DE`** — `Y` uses locale week rules,
so the example only worked on some machines. Rewritten to pin the locale and show both, which
makes the pitfall sharper rather than weaker.

---

## What was executed, and what was only read

| Check | How |
|---|---|
| `this$0` elision, before and after the fix | `javac` + `javap`, OpenJDK 25 |
| The compile-time-constant trap in the fix | `javac` + `javap`, OpenJDK 25 |
| `toMap` duplicate-key message | executed, OpenJDK 25 |
| `LocalDate.plus(Duration)` | executed, OpenJDK 25 |
| `LAG` / `LEAD` under a `DESC` window | executed, SQLite window functions |
| `jcmd Thread.print` on a `ReentrantLock` cycle | executed, OpenJDK 25 |
| `"start".hashCode()`, `split(".")`, `"👍".length()`, Turkish `toUpperCase` | executed, OpenJDK 25 |
| `YYYY` across `en_US`, `en_GB`, `de_DE` | executed, OpenJDK 25 |
| DST arithmetic, `getValidOffsets`, `Period` clamping | executed, OpenJDK 25 |
| `BigDecimal` identity, `0.1 + 0.2`, `equals` vs `compareTo` | executed, OpenJDK 25 |
| Hibernate `UuidGenerator.Style` at 6.6 and 7.0 | javadocs, fetched |
| `PessimisticLockingFailureException` subclasses | javadocs, fetched |
| Every JEP number and release in the corpus | read against what is known of each release |
| Every other claim | reasoned against specifications, javadocs and reference documentation |

---

## The modules, and what was checked in each

Counts generated from the corpus. Every module was read in full.

### java-platform — 20 modules, 163 chapters

| # | Module | Chapters | Verdict |
|--:|---|--:|---|
| 1 | `how-java-runs` | 4 | OK — class-file majors 52/55/61/65/69, 0xCAFEBABE, JEP 483/514/515 |
| 3 | `objects-and-contracts` | 7 | OK — Integer cache bounds, NaN reflexivity, the Hibernate-proxy row, `Stream.toList()` permits nulls where `List.copyOf` throws |
| 4 | `strings-and-text` | 9 | OK — **executed** four hash / split / length / locale claims; JEP 254 and 280 |
| 5 | `inheritance-and-interfaces` | 7 | OK — CountingSet 6-not-3, the diamond rules, the non-virtual list, LSP |
| 6 | `enums-and-nested-types` | 9 | **FIXED ×2** — findings 1 and the `this$0` table row |
| 10 | `exceptions-and-failure` | 6 | OK — the interrupt flag, try-with-resources ordering, `finally` return semantics |
| 11 | `generics-and-erasure` | 7 | **FIXED** — finding 13. Otherwise: `Comparable<ChronoLocalDate>`, bridge methods, reifiability |
| 12 | `collections-choosing` | 7 | OK — 1.5× growth, the JEP 431 source break, the `Set.of` salt, `Arrays.asList(int[])` |
| 13 | `hashmap-internals` | 8 | OK — `h^(h>>>16)`, 8/6/64, `(hash & oldCapacity)`, `newHashMap` since 19 |
| 14 | `streams-and-lambdas` | 9 | **FIXED** — finding 2. Otherwise: `toList()` 16, `teeing` 12, `orElseThrow()` 10 |
| 15 | `modern-java` | 7 | OK — every JEP and every LTS date checked individually |
| 16 | `dates-and-times` | 9 | **FIXED ×2** — findings 3 and 15; DST dates and `Period` clamping **executed** |
| 17 | `io-and-serialization` | 11 | OK — JEP 400 / 290 / 415, the record canonical-constructor path |
| 18 | `reflection-and-annotations` | 9 | **FIXED** — finding 12. Otherwise: `@Retention` defaults to CLASS, JEP 396 |
| 19 | `threads-and-memory-model` | 8 | **FIXED** — finding 7, **executed**. Otherwise: biased locking 8 → 15 → 18 |
| 20 | `locks-and-synchronizers` | 12 | **FIXED** — finding 11. Otherwise: the AQS state table, the RRWL 16/16 split |
| 21 | `executors-and-futures` | 8 | **FIXED** — finding 11. Otherwise: Goetz §8.2, container-aware since 10 |
| 22 | `virtual-threads` | 8 | OK — the best-calibrated module in the deck; every JEP checked, preview stated plainly |
| 23 | `heap-and-gc` | 9 | OK — ZGC JEP 377 / 439 / 474 / 490, IHOP 45%, the server-class thresholds |
| 24 | `jvm-diagnostics` | 9 | OK — and it is the chapter that caught finding 7, by disagreeing with it |

### production — 10 modules, 86 chapters

| # | Module | Chapters | Verdict |
|--:|---|--:|---|
| 2 | `build-and-dependencies` | 12 | OK — Maven nearest-wins against Gradle highest-wins, `outputTimestamp` |
| 75 | `testing-pyramid` | 7 | OK — the H2 argument, the flaky-test causes |
| 76 | `testing-spring` | 9 | OK — `@MockitoBean` in 6.2 / 3.4, `@ServiceConnection` in 3.1 |
| 77 | `actuator-and-health` | 7 | OK — probe semantics, `/env` masking by pattern |
| 78 | `metrics-and-tracing` | 8 | OK — the cardinality arithmetic, the gauge weak reference, head against tail sampling |
| 79 | `logging-well` | 6 | OK — Boot 3.4 structured logging, the SLF4J 2 fluent API |
| 80 | `containers-and-k8s` | 9 | OK — `jarmode=tools` since 3.3, `MaxRAMPercentage` 25%, probes count 3xx as success |
| 81 | `cloud-for-java-services` | 11 | OK — the SQS FIFO five-minute window, Lambda’s fifteen minutes, the SnapStart caveats |
| 82 | `performance-tuning` | 9 | OK — **arithmetic checked**: 0.99^50, Little’s law, the 28 TB estimate |
| 83 | `release-and-incidents` | 8 | OK — expand and contract across three releases, when rollback is unavailable |

### craft — 7 modules, 68 chapters

| # | Module | Chapters | Verdict |
|--:|---|--:|---|
| 7 | `solid-and-ood` | 9 | OK — `Arrays.asList` set-yes / add-no, the LSP violations inside the JDK |
| 8 | `patterns-that-get-asked` | 12 | OK — DCL needs volatile; CGLIB default since Boot 2.0 and its field subtlety |
| 9 | `lld-method` | 8 | OK — method rather than fact; nothing to verify |
| 30 | `patterns-in-spring` | 9 | OK — `&beanName`, `@Async` return types, `proxyBeanMethods`, the event order |
| 31 | `application-architecture` | 11 | OK — `lombok-mapstruct-binding` ordering, the ArchUnit and Modulith APIs |
| 63 | `ddd-tactical` | 9 | OK — the Modulith event publication table |
| 71 | `cqrs-and-event-sourcing` | 10 | OK — crypto-shredding, and the outbox-is-not-event-sourcing correction |

### spring-core — 7 modules, 51 chapters

| # | Module | Chapters | Verdict |
|--:|---|--:|---|
| 25 | `ioc-and-the-container` | 7 | OK — `@PostConstruct` via `CommonAnnotationBeanPostProcessor`, the proxy at step six |
| 26 | `wiring-beans` | 8 | OK — `@Autowired` optional since 4.3, Boot 2.6 circular refs, lite mode |
| 27 | `configuration-and-profiles` | 7 | **FIXED** — finding 10. Otherwise: source precedence, `configtree:` |
| 28 | `aop-and-proxies` | 8 | OK — `@Order` lower means further out; the transaction interceptor’s precedence |
| 29 | `autoconfiguration` | 7 | OK — `.imports` in 2.7, `spring.factories` dropped in 3.0, ASM evaluation |
| 32 | `application-lifecycle` | 7 | OK — `EnvironmentPostProcessor` registration, Started against Ready |
| 33 | `spring-generations` | 7 | OK, and current — Framework 7 / Boot 4 in Nov 2025, JSpecify, Jackson 3 |

### web-api — 8 modules, 64 chapters

| # | Module | Chapters | Verdict |
|--:|---|--:|---|
| 34 | `http-foundations` | 8 | OK — the RFC 6455 handshake pair is the RFC’s own example |
| 35 | `dispatcher-lifecycle` | 7 | OK — trailing-slash matching removed in 6, PathPattern since 5.3 |
| 36 | `rest-api-design` | 9 | OK — `max-page-size` defaults to 2000, Framework 7 API versioning |
| 37 | `api-styles` | 11 | OK — protobuf `optional` restored in 3.15, the gRPC-Web proxy requirement |
| 38 | `validation-and-errors` | 7 | OK — RFC 9457 obsoletes 7807, the `server.error.*` defaults |
| 39 | `serialization` | 8 | **FIXED** — finding 14. Otherwise: Jackson 2.12 records, `open-in-view` default |
| 40 | `async-and-scheduling` | 7 | OK — Spring cron is six fields, `SimpleAsyncTaskExecutor` is the default |
| 41 | `reactive-and-webflux` | 7 | OK — the honest reactive-against-virtual-threads comparison |

### persistence — 14 modules, 121 chapters

| # | Module | Chapters | Verdict |
|--:|---|--:|---|
| 42 | `relational-foundations` | 7 | **FIXED** — finding 5. Otherwise: RFC 9562, PostgreSQL 18 `uuidv7()` |
| 43 | `sql-you-are-asked` | 9 | **FIXED** — finding 4, **executed**. Otherwise: `NOT IN` with NULL, CTE inlining since PG 12 |
| 44 | `indexes-and-plans` | 10 | OK — `INCLUDE` since PG 11, hash WAL-logged since 10, the BRIN correlation condition |
| 45 | `transactions-and-isolation` | 8 | **FIXED** — finding 6. Otherwise: the PG READ UNCOMMITTED alias, Oracle has no REPEATABLE READ |
| 46 | `locking-and-deadlocks` | 8 | **FIXED** — finding 6. Otherwise: `SKIP LOCKED`, `@Version` bypassed by bulk JPQL |
| 47 | `jdbc-and-pooling` | 8 | OK — the Hikari defaults; `statement_timeout` is the only one that stops the work |
| 48 | `jpa-mapping` | 9 | OK — IDENTITY kills batching, to-one defaults to EAGER, `allocationSize` must agree |
| 49 | `persistence-context` | 8 | OK — flush order inserts / updates / deletes, `merge` returns another instance |
| 50 | `fetching-and-n-plus-one` | 9 | **FIXED** — finding 8. Otherwise: Hibernate 6 automatic de-duplication |
| 51 | `spring-transactional` | 10 | OK — checked exceptions commit; `NESTED` unsupported by `JpaTransactionManager` |
| 52 | `spring-data-jpa` | 9 | OK — the `PagingAndSortingRepository` split in Spring Data 3, open projections |
| 53 | `second-level-cache` | 7 | OK — the timestamps region, the `SimpleKey.EMPTY` collision |
| 54 | `schema-and-scale` | 8 | OK — `NOT VALID` then `VALIDATE`, the PG 12 CHECK promotion, keyset backfill |
| 55 | `nosql-stores` | 11 | OK — the 16 MB cap, transactions since 4.0, ESR, `noeviction` default |

### security — 6 modules, 48 chapters

| # | Module | Chapters | Verdict |
|--:|---|--:|---|
| 56 | `auth-foundations` | 6 | OK — bcrypt’s 72-byte truncation and its stored format, the `ROLE_` prefix |
| 57 | `security-filter-chain` | 8 | OK — `SecurityContextHolderFilter` outermost and why, `hideUserNotFoundExceptions` |
| 58 | `jwt-in-practice` | 9 | OK — nginx’s 8 KB header cap, the audience check that is not a default |
| 59 | `oauth2-and-oidc` | 8 | OK — RFC 9700, RFC 8628, RFC 7662, the RFC 7636 PKCE example values |
| 60 | `method-security` | 7 | OK — only the denial test tests the rule |
| 61 | `api-hardening` | 10 | OK — the OWASP API Top 10 2023 in order, 169.254.169.254 |

### distributed — 11 modules, 86 chapters

| # | Module | Chapters | Verdict |
|--:|---|--:|---|
| 62 | `service-boundaries` | 7 | OK — 0.999^5 and its 3.65 h per month **checked** |
| 64 | `sync-communication` | 7 | OK — HttpClient’s default of 5 per route, AWS decorrelated jitter |
| 65 | `resilience-patterns` | 8 | OK — the Resilience4j decorator order, outermost first |
| 66 | `idempotency` | 7 | OK — insert-first against check-then-act, the three duplicate cases |
| 67 | `messaging-foundations` | 7 | OK — queue against log, derivative alerting on lag |
| 68 | `kafka-mechanics` | 9 | OK — every default checked: 500 / 300000 / 45 s / 24 h / idempotence since 3.0 |
| 69 | `delivery-and-outbox` | 8 | OK — the dual write in both orderings; Kafka transactions scoped honestly |
| 70 | `saga-and-consistency` | 8 | OK — the pivot step, and compensations that cannot exist |
| 72 | `caching-strategies` | 9 | OK — evict-not-put, `beforeInvocation` defaults false, the fencing token |
| 73 | `scaling-data` | 9 | OK — the `synchronous_commit` levels, R+W>N, the PACELC classifications |
| 74 | `platform-concerns` | 7 | OK — W3C traceparent, the gRPC layer-4 balancing failure |

### sets

| # | Module | Blocks | Verdict |
|--:|---|--:|---|
| 901 | `drills-machine-coding` | 8 | OK — 8 drills; prompts and watch lists sound |
| 902 | `drills-system-design` | 12 | OK — 12 drills; the shortener storage arithmetic **checked** |
| 903 | `drills-focused-implementation` | 15 | OK — 15 drills |
| 904 | `drills-debug-and-review` | 11 | **FIXED** — finding 9. 11 drills; the Kafka rebalance arithmetic **checked** |
| 951 | `predict-java-core` | 3 | OK — 10 predicts, all `stdout`, all executed by `run-snippets` |
| 952 | `predict-collections` | 2 | OK — 7 predicts, all `stdout`, all executed |
| 953 | `predict-streams` | 3 | OK — 6 predicts; 5 executed, 1 `behaviour` that refuses to assert a race |
| 954 | `predict-concurrency` | 3 | OK — 10 `behaviour` predicts; every `verification` names a real JLS or javadoc section |
| 955 | `predict-io-and-time` | 3 | OK — 8 predicts; the inner-class one is the Phase 9 correction and is right |
| 956 | `predict-spring` | 3 | OK — 9 `behaviour` predicts, each citing the Spring reference |
| 957 | `predict-jpa` | 2 | OK — 8 predicts; this is the module that caught finding 8 |
| 958 | `predict-sql` | 2 | OK — 7 predicts, each citing a PostgreSQL 16 section, with dialect notes |
| 959 | `predict-http-security` | 2 | OK — 6 predicts citing RFC 9110, RFC 6750 and the Fetch standard |
| 960 | `predict-kafka` | 2 | OK — 4 predicts; KIP-62 and the rebalance arithmetic **checked** |
| 961 | `predict-build-and-config` | 2 | OK — 6 predicts; Maven mediation, and Spring against Maven profiles |


---

## What the read cost, and what it bought

**98 modules, 687 chapters, 46 drills, 81 predicts.** Fifteen defects, of which:

- **four were proved wrong by running the claim** rather than by reasoning about it, and two of
  those — the `this$0` elision and the `LAG`/`LEAD` direction — would have survived any amount of
  careful reading, because the prose was internally consistent and wrong;
- **three were the corpus contradicting itself**, and in each case one of the two statements was
  right. `jvm-diagnostics` disagreed with `threads-and-memory-model` about deadlock detection;
  `predict-jpa` disagreed with `fetching-and-n-plus-one` about a warning code; four files
  disagreed with a drill about a Jackson default. A corpus large enough to contradict itself is
  large enough to be checked against itself, and that is a cheap check nothing in `tools/` performs;
- **one was in a version block**, which is the material `OTHER-MODES.md` recorded as having been
  read in full with no errors found. That claim is now qualified rather than withdrawn: the version
  blocks were checked against JDK and Spring releases, and a Hibernate API detail was not.

The question-bank read found **one wrong answer in 486**. This read found **fifteen in 814
units**, which is a higher rate, and the reason is worth recording: the question bank had already
been through Phase 9's `run-snippets` and Phase 10's link pass, and the theory corpus is where the
version numbers, the JEP references and the library APIs live. Dated claims rot; prose about
judgement does not.

## What is still not checked

- **Whether a cited page still says what it is cited for.** 793 distinct URLs resolve and carry
  their fragments. Nothing has read them.
- **The 51 non-`stdout` predict artefacts.** No PostgreSQL and no Docker on this machine; they are
  reasoned against specifications, and every one names the section it was read from.
- **The 86 `trace` panes.** Prose about behaviour, unverifiable by design.
- **`file://` opened by hand.** The harness rewrites it to a `data:` URL. Unchanged, and now the
  only item that has survived every gate this project has held.
