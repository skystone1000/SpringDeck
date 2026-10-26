---
title: SpringDeck — build and preparation plan
status: completed
last_updated: 2026-10-21
scope: >
  The topic prompt the blueprint asks for: what Java and Spring Boot
  interviews ask, the content manifest, and the eleven build phases. All
  eleven phases are complete.
---

# SpringDeck — Build & Preparation Plan

**Subject:** Backend Engineering with Java and Spring Boot
**Companion document:** [`DECK-BLUEPRINT.md`](DECK-BLUEPRINT.md) — the generic vessel
**This document:** the *topic prompt* the blueprint asks for, plus the build phases and the study plan
**Written:** 2026-08-22
**Target reader profile:** Java backend engineer, 2–7 years, interviewing at Indian product companies, startups and global product teams; useful to service-company candidates with the machine-coding sections skipped.

---

## 0. How to read this, and what it is for

The blueprint (`docs/DECK-BLUEPRINT.md`) builds the *vessel* and deliberately
holds no content. This document is the other half. It contains:

- **Part 1** — what a Java/Spring Boot backend interview actually asks in 2026,
  researched rather than remembered, with the sources listed at the end.
- **Part 2** — the design decisions that are specific to *this* subject: how the
  material is split into tracks, why, and what does **not** belong in the deck.
- **Part 3** — the **blueprint deltas**: the small, justified changes to the
  vessel that backend content needs and Android content did not.
- **Part 4** — the filled **Topic Manifest** (blueprint §13).
- **Part 5** — the content specification, track by track, module by module.
- **Part 6/7** — the drill and predict catalogues, which live in the validator.
- **Part 8** — build phases with gates.
- **Part 9** — sourcing, licences and verification.
- **Part 10** — the study plan: how a reader actually uses the finished deck,
  in a 12-week and a 3-week shape.

Nothing here overrides the blueprint's invariants. Where this document changes
the vessel, it says so explicitly in Part 3 and gives the reason.

---

# PART 1 — What the interview actually asks

## 1.1 The loop, round by round

Java backend loops in 2026 are remarkably consistent. What varies is *which
rounds a given company runs*, not what each round contains.

| # | Round | Length | Who runs it | What it decides |
|---|---|---|---|---|
| 1 | Online assessment / DSA screen | 45–90 min | Almost everyone | Filter. 1–2 medium problems. |
| 2 | **Machine coding / LLD build** | 90–120 min | Flipkart, Swiggy, Uber, Cred, Razorpay, PhonePe, most funded startups | Can you turn a spec into working, readable, testable code under a clock. |
| 3 | **Java + Spring deep dive** | 45–60 min | Everyone | Do you understand the framework you have been using, or only its happy path. |
| 4 | **HLD / system design** | 45–60 min | SDE-2 and above | Judgement and trade-offs. |
| 5 | Hiring manager / project deep dive | 45 min | Everyone | Your résumé, defended. Incidents, trade-offs, what you would do differently. |
| 6 | HR / culture | 30 min | Everyone | Fit, comp, notice period. |

Two branches worth naming, because they change what you should study:

- **Product companies and startups** weight rounds 2 and 4 heavily. Machine
  coding is close to a gate: correctness, class boundaries, edge cases and a
  working `main`/test harness inside two hours.
- **Service companies** (TCS, Infosys, Wipro, Accenture, Capgemini, LTI) weight
  round 3 heavily and often skip round 2 entirely. Their round 3 is broader and
  shallower — rapid-fire recall across Core Java, Spring, JPA and SQL.

The deck serves rounds **3, 4 and 5** directly, and round **2** through the
Synthesis mode's tier-1 drills. It does **not** serve round 1 — see §2.4.

## 1.2 What round 3 actually contains

Every source surveyed converges on the same eight clusters. Ordered by how often
they appear, not by difficulty:

1. **Spring internals** — auto-configuration and how to debug it, bean scopes
   and lifecycle, `@Component` vs `@Bean`, circular dependencies,
   `BeanFactory` vs `ApplicationContext`, what `@SpringBootApplication`
   decomposes into, what happens inside `SpringApplication.run()`.
2. **`@Transactional` and JPA** — propagation and isolation, the
   **self-invocation trap** (a `this.method()` call bypasses the proxy, so the
   advice never fires — and the same is true of `@Async` and `@Cacheable`),
   rollback rules for checked exceptions, EAGER vs LAZY,
   `LazyInitializationException`, the first-level cache, optimistic vs
   pessimistic locking, and above all **the N+1 problem** and its three fixes
   (JPQL `join fetch`, `@EntityGraph`, `hibernate.default_batch_fetch_size`).
3. **Core Java** — `equals`/`hashCode` contract, `HashMap` internals including
   the Java 8 treeify threshold (8 entries in a bucket, 64 in the table),
   immutability, generics and erasure, the Collections decision table.
4. **Concurrency** — `synchronized` vs `volatile`, the memory model,
   `ExecutorService` and pool sizing, `CompletableFuture`, and — new and now
   asked constantly — **virtual threads**: platform vs virtual, when they help
   (I/O-bound, not CPU-bound), `spring.threads.virtual.enabled`, pinning, and
   structured concurrency with `StructuredTaskScope` and scoped values.
5. **REST and the web layer** — the DispatcherServlet lifecycle, global
   exception handling with `@ControllerAdvice`, validation, filters vs
   interceptors, API versioning, Jackson traps.
6. **Microservices** — saga (choreography vs orchestration) and compensating
   transactions, why **not** two-phase commit, circuit breaker / retry /
   timeout / bulkhead, **idempotency** as the thing that makes retries safe,
   the transactional outbox, Kafka partitions and consumer groups, and what
   "exactly once" really means (idempotent producer + transactional writes, or
   at-least-once delivery plus an idempotent consumer).
7. **Security** — the filter chain, authentication vs authorization, JWT
   end-to-end, OAuth2/OIDC, method security, CSRF on a stateless API, CORS.
8. **Production behaviour** — Actuator endpoints worth exposing, Kubernetes
   liveness vs readiness, HikariCP tuning and **pool exhaustion** (the single
   most common production failure: `active == max` with `pending > 0`, requests
   waiting the full 30 s connection timeout), memory leaks from unbounded
   caches and singleton beans, GC choice (G1 as the balanced default, ZGC for
   strict low-latency on large heaps), reading a heap dump.

## 1.3 What round 2 (machine coding) actually contains

The recurring problems in 2025–26 sets: a Splitwise-style expense splitter, a
ride-matching service, an LRU cache with custom eviction, a movie-ticket booking
system, a parking lot, a rate limiter, an in-memory key-value store with TTL.
The grading is not cleverness — it is: does it compile and run, are the class
boundaries sane, are edge cases handled, is there a test or a driver, and did
you finish.

## 1.4 What round 4 (HLD) actually contains

CAP as a forced choice rather than a slogan; sharding and consistent hashing
once one machine cannot hold the data; rate limiting with all five algorithm
trade-offs (token bucket, leaky bucket, fixed window, sliding window log,
sliding window counter) and their Redis representation; caching strategy and
invalidation; idempotency so a retried purchase does not double-charge; queues
and back-pressure; API gateway responsibilities.

## 1.5 The version question, and why it needs first-class treatment

Backend interviews probe version drift directly — "what changed in Spring Boot
3?" is a standard question. As of mid-2026 the landscape is:

- **Java 25** is the current LTS (the first since 21); Java 17 and 21 remain
  everywhere in production.
- **Spring Framework 7.0** is GA, targeting Java 25 while keeping a Java 17
  baseline.
- **Spring Boot 4.1** is the current stable line, built on Framework 7, Java 17
  minimum.
- The **`javax` → `jakarta`** namespace migration (Boot 2 → 3) is still the most
  commonly asked "what changed", and is still tripping up real migrations.

A corpus that cannot express "this was true until version X" will be wrong
within a year. Part 3 adds one block type to fix that.

## 1.6 The gap audit

A second research pass, run specifically to find topics the first design had no
home for, turned up nine clusters that are asked and were missing or
under-weighted. Six of them became the `craft` track (§2.5). The other three:

- **Java features with disproportionate interview surface** — serialization and
  `serialVersionUID`, enum internals, inner and anonymous classes, the string
  pool, `java.time` and zone reasoning, reflection and what Lombok actually
  generates (including `@Data` on a JPA entity, which breaks `hashCode` for a
  lazily-loaded association), and the whole of `java.util.concurrent.locks` —
  `ReentrantLock` vs `synchronized`, `ReadWriteLock`, `StampedLock`,
  `CountDownLatch` vs `CyclicBarrier`, `Semaphore`, AQS, `ForkJoinPool`.
- **The ecosystem around the code** — Maven's lifecycle and, more to the point,
  transitive dependency mediation and reading a `dependency:tree`; and the
  managed-cloud services a Java service touches, where the specifically-Java
  question is cold starts and their mitigations.
- **API styles other than REST** — gRPC and protobuf for internal calls,
  GraphQL and its own N+1, WebSockets and SSE for push. Asked as a "when would
  you use" question, which is a judgement question wearing a technology's name.

All three are folded into existing tracks in §5.9 rather than made new ones.

**Not added, after checking:** Java EE legacy (servlet lifecycle, JSP, JMS,
SOAP) beyond the one `servlet-container-and-dispatcher` chapter that already
exists. It is asked, but almost exclusively in service-company loops, and a
candidate targeting those is better served by the existing chapter plus the
vendor documentation than by a track that ages out of every other loop.

---

# PART 2 — Subject-specific design decisions

## 2.1 Eight subject tracks

The blueprint allows 6–9 subject tracks and forbids a **tenth hue** (§9.3).

An earlier draft of this plan set the count at seven, on the reasoning that
three hues are already spent on mode accents in `data/modes.js` — fuchsia
(Synthesis), teal (Predict), slate (Glossary) — leaving exactly seven. **That
constraint was tighter than the blueprint's actual rule.** §9.3 forbids
inventing a tenth hue; it does not forbid a subject track and a mode accent
sharing one. They appear on different surfaces — a mode accent lives on the
rail, a track hue on sidebar rows and page headers inside Theory — and nothing
renders them adjacent.

The count is **eight**, because the content demanded a track that did not fit
anywhere else (§2.5), and the eighth takes **teal**. Per §9.3's rule that every
exception is declared in the file rather than hidden in a rule, `themes.css`
carries:

```css
/* The `craft` subject track and the Predict mode accent both resolve to the
   teal ramp. Deliberate: the ramp has nine members, three are spent on mode
   accents, and there are eight subject tracks. They never render adjacent —
   the mode accent appears only on the rail, the track hue only inside Theory.
   Do NOT resolve this by adding a tenth hue. */
```

The other consequence of the count is that **Java-the-language and the JVM share
one track** (`java-platform`) rather than splitting into "Core Java" and "JVM &
Concurrency". They are one subject — the platform you are running on — and the
reading path inside the track keeps them in order anyway. That track is large
(20 modules) and correctly so.

## 2.2 Where system design lives

**Not in a track.** The `distributed` track carries the *building blocks* —
CAP, replication, sharding, consistent hashing, caching, queues, idempotency —
as theory chapters you read. The *timed design exercise* is a **Synthesis
drill**, because that is precisely what the Synthesis mode is for: prompts that
pull several subjects at once, under a clock, with a list of things that lose
marks.

Same logic for LLD and machine coding: they are tier-1 Synthesis drills, not a
track and certainly not a sixth mode.

## 2.3 What "Predict the Output" means for this subject

Backend has *three* determinate artefacts, not one:

1. **JVM stdout** — a Java program's console output. Genuinely runnable, and
   `tools/run-snippets.js` re-executes it. This is the honest `stdout` kind.
2. **A SQL result set or execution plan** — determinate, but dialect-dependent
   and not runnable without a pinned database.
3. **A framework behaviour** — "does this transaction roll back?", "how many
   queries does this fire?", "what HTTP status comes back?". Determinate, and
   the *most valuable* category for interview prep, but not machine-verifiable
   from a snippet alone.

The blueprint already refuses a `predict` block that declines verification
without saying why. Part 3 adds the field that lets it say why *in a structured
way* rather than in prose.

## 2.4 What is deliberately out of scope

- **DSA / round 1.** Algorithm practice is a different activity with better
  tools (a judge that runs your code against hidden tests). A deck of static
  cards is the wrong shape for it. The deck says so on its overview page and
  points elsewhere. **Do not add a sixth mode for it.**
- **Company-tagged questions** (`askedAt: ['Flipkart']`). Tempting and
  unverifiable. The blueprint's second sentence worth carrying is that a number
  that has not been checked is not a fact; a company tag sourced from a forum
  post is exactly that. Rejected.
- **A separate experience-level axis** (`level: 'senior'`). This would be a
  second filter orthogonal to `importance`, doubling the filter UI to express
  something `importance` already carries. Instead the manifest **declares the
  deck's target level once** (2–7 years, product-company loop) and every
  `importance` tier is assigned *relative to that reader*. One axis, honestly
  labelled.
- **Any backend language but Java.** Kotlin, Go, Node and Python are outside the
  deck by decision, not omission. `languages[]` in the manifest is the enforcement
  point: `code-highlight.js` knows nine languages and `validate-questions.js`
  rejects a tenth, so a Kotlin snippet cannot enter the corpus by accident.
  Where a comparison genuinely earns its place — "why would you pick Go for
  this service?" — it is *prose in a `comparison` block*, never a code snippet.

## 2.5 The eighth track, and why the first seven were not enough

A gap audit against the research (Part 1) found six clusters the seven-track
split had nowhere to put, and every one of them is asked:

| Cluster | Where it was going to land | Why that was wrong |
|---|---|---|
| SOLID, GoF patterns, **which patterns Spring itself uses** | nowhere | A stock question in every loop, and the vocabulary the LLD round is graded in. |
| Project structure — layering, package-by-layer vs package-by-feature, hexagonal/clean architecture, DTO vs entity | nowhere | "How do you structure a Spring Boot project?" is asked constantly and answered badly. |
| DDD — bounded context, aggregate, entity vs value object | inside `service-boundaries` as one chapter | It is the vocabulary microservice decomposition is *conducted in*; one chapter cannot carry it. |
| **CQRS and event sourcing** | nowhere at all | A senior-round staple, and the most conspicuous omission in the first draft. |
| The LLD/machine-coding *method* — how to go from a spec to classes in 20 minutes | nowhere | Tier-1 drills existed with nothing teaching the approach they grade. |
| Object-oriented design as a skill, distinct from Java syntax | folded into `inheritance-and-interfaces` | A syntax chapter is not a design chapter. |

They are one subject: **how code is organised, and the craft around it**. That
is the `craft` track (§5.8). It is deliberately spread across the global reading
order rather than read as a block — SOLID and patterns land early, DDD and CQRS
land after sagas, because that is when they make sense.

# PART 3 — Blueprint deltas

Four changes to the vessel. Each is small, each is justified by something
backend content needs and Android content did not, and none touches the rail,
the five modes, the routing model or the progress model.

### D1 — A twelfth block type: `version`

**Why.** §1.5. "What changed in Spring Boot 3" is a *standard interview
question*, and a corpus with nowhere to put version-scoped truth either states
things that quietly become false, or scatters them through `prose` where no
validator can find them and no reader can filter them.

**Shape.**

```js
{
    type: 'version',
    title: 'javax → jakarta',
    items: [
        { version: 'Spring Boot 2.x', state: 'was',     html: '<p><code>javax.persistence.Entity</code>.</p>' },
        { version: 'Spring Boot 3.0', state: 'changed', html: '<p><code>jakarta.persistence.Entity</code>. Every import moves; there is no compatibility shim.</p>' },
        { version: 'Spring Boot 4.0', state: 'is',      html: '<p>Unchanged since 3.0. Built on Spring Framework 7, Java 17 baseline.</p>' }
    ]
}
```

`state` is one of `was | changed | is | removed | preview`. It drives a small
rank chip, so a reader scanning a chapter can see at a glance what is current.

**Cost.** One `case` in `renderBlock()`, one CSS rule in `theory.css`, one
shape check in `validate-theory.js`. Nothing else in the app learns about it —
exactly the extension the blueprint describes.

**Rule.** Every module whose subject changed across Boot 2/3/4 or Java
17/21/25 **must** carry at least one `version` block. `validate-theory.js`
holds that list of module ids and warns on a miss.

### D2 — `predict` blocks gain an `artefact` field

**Why.** §2.3. Backend has three determinate artefacts with three different
verification stories, and collapsing them means either claiming `stdout` for
things that were never run — which the blueprint calls out as teaching
something false — or losing the ability to run the ones that *can* be run.

**Shape.** One new required field on the existing `predict` block:

```js
artefact: 'stdout'        // re-executed by run-snippets.js. Java only.
        | 'sql-result'    // a result set or an EXPLAIN plan
        | 'http-response' // status line + body of an endpoint call
        | 'query-count'   // "how many queries does this fire?" — the N+1 detector
        | 'behaviour'     // "does this roll back?" — prose answer, determinate
```

The reveal pane's heading is derived from `artefact` ("Actual output", "Result
set", "Response", "Queries fired", "What actually happens"), so the reader is
never shown a console frame around something that never touched a console.

**Validator rule** (replaces, does not weaken, the existing one):
`artefact: 'stdout'` requires `language: 'java'` and `output.kind: 'stdout'`.
Every other artefact requires `output.kind: 'trace'` **and** a non-empty
`verification` string saying how the answer was established — for example
`"Verified against PostgreSQL 16.4, 2026-08-14"` or `"Derived from the Spring
Framework 7 reference, §Transaction Rollback Rules"`.

### D3 — `syntax` blocks may carry `output` and `notes`

**Clarification rather than a change.** The blueprint already says `syntax`
delegates to `renderCodeBlock()`, and `renderCodeBlock()` paints an output pane.
Backend needs this constantly — a `bash` block showing `jcmd GC.heap_info`, a
`sql` block showing `EXPLAIN ANALYZE`. Make it explicit in the schema so
`validate-theory.js` checks `output.kind` on `syntax` blocks with the same rule
it applies to question snippets, instead of silently ignoring the field.

### D4 — `css/print.css`: the night-before sheet

**Why.** The one reading mode the deck cannot currently serve is the printed or
PDF'd revision sheet, and it is the mode a candidate wants most at 11 p.m. the
night before. It is **not a sixth mode** — it adds no rail item, no route, no
storage key. It is a stylesheet.

**Behaviour.** `@media print`: hide the rail, the sidebar, the search field, the
background canvas and the back-to-top button; expand every collapsed card and
every code block; force the light palette; print `?cram` and `?tier=` as a
header line so the sheet says what it is a filter of; break `.question-card`
with `break-inside: avoid`.

**Cost.** One file, one `<link media="print">` in `index.html`. It consumes the
existing token layer and adds no colour literal.

### D5 — Glossary: an `ANNOTATION` chip beside the existing `ASKED` chip

**Why.** Spring's vocabulary is roughly half annotations, and a reader hunting
`@Transactional` in a 400-term A–Z is hunting under **T**. A chip that marks a
term as an annotation makes the list scannable by kind.

**Cost.** Zero new data. It is derived at harvest time from
`term.startsWith('@')`, exactly as the glossary derives everything else.

### D6 — Drill tier → importance token mapping, stated

The blueprint says drill tiers reuse `--importance-*` tokens, and there are four
drill tiers against three tokens. Fix the mapping in `theory.css` and say so:

| Drill tier | Token | Meaning |
|---|---|---|
| 1 — machine coding builds | `--tier-must-*` | The round that decides the loop |
| 2 — HLD design exercises | `--tier-must-*` | Also decides the loop, at SDE-2+ |
| 3 — focused implementation | `--tier-should-*` | Skill drills |
| 4 — debug / review / extend | `--tier-good-*` | Sharpening, not gating |

---

# PART 4 — The Topic Manifest

This is the blueprint §13 artefact, filled. Everything below is the *only* thing
the build prompt needs to know about the subject.

```yaml
subject:            "Backend Engineering — Java & Spring Boot"
slug:               "springdeck"
target_reader:      "Java backend engineer, 2-7 years, product-company loop"
brand:
  wordmark:         "SpringDeck"
  title:            "SpringDeck — Java & Spring Boot Interview Questions & Answers"
  favicon:          "<inline SVG: a single leaf glyph in --accent-500 on transparent, 16px-legible>"
  domain:           null

languages:          ["java", "sql", "yaml", "properties", "xml", "bash", "json", "http", "dockerfile"]
runnable:           ["java"]           # single-file source launch: `java Foo.java` (JDK 21+)
diagram_types:      ["flowchart", "animation", "sequence"]

predict_artefacts:                     # see delta D2
  - stdout                             # runnable, re-executed
  - sql-result
  - http-response
  - query-count
  - behaviour

doc_sources:                           # licences marked (verify) are checked in Phase 7
  - base: "https://docs.spring.io/spring-boot/reference"
    name: "Spring Boot Reference"
    licence: "Apache-2.0 (verify)"
    vendorable: "verify"
  - base: "https://docs.spring.io/spring-framework/reference"
    name: "Spring Framework Reference"
    licence: "Apache-2.0 (verify)"
    vendorable: "verify"
  - base: "https://docs.spring.io/spring-security/reference"
    name: "Spring Security Reference"
    licence: "Apache-2.0 (verify)"
    vendorable: "verify"
  - base: "https://docs.oracle.com/en/java/javase/25/docs"
    name: "Java SE 25 Documentation"
    licence: "Oracle documentation terms — redistribution restricted"
    vendorable: false
  - base: "https://openjdk.org/jeps"
    name: "JDK Enhancement Proposals"
    licence: "GPLv2+CE / OpenJDK terms (verify)"
    vendorable: "verify"
  - base: "https://docs.jboss.org/hibernate/orm/current/userguide/html_single"
    name: "Hibernate ORM User Guide"
    licence: "CC BY-SA / LGPL (verify)"
    vendorable: "verify"
  - base: "https://kafka.apache.org/documentation"
    name: "Apache Kafka Documentation"
    licence: "Apache-2.0"
    vendorable: true
  - base: "https://www.postgresql.org/docs/current"
    name: "PostgreSQL Documentation"
    licence: "PostgreSQL Licence"
    vendorable: true
  - base: "https://resilience4j.readme.io/docs"
    name: "Resilience4j"
    licence: "Apache-2.0 (verify)"
    vendorable: "verify"

theory_tracks:
  - { id: "java-platform", title: "Java & the JVM",                     order: 1, hue: "violet", scope: "subject" }
  - { id: "spring-core",   title: "The Spring Container & Boot",        order: 2, hue: "sky",    scope: "subject" }
  - { id: "web-api",       title: "HTTP, REST & the Web Layer",         order: 3, hue: "lime",   scope: "subject" }
  - { id: "persistence",   title: "Data, SQL & Transactions",           order: 4, hue: "amber",  scope: "subject" }
  - { id: "security",      title: "Security & API Hardening",           order: 5, hue: "rose",   scope: "subject" }
  - { id: "distributed",   title: "Microservices, Messaging & Scale",   order: 6, hue: "pink",   scope: "subject" }
  - { id: "production",    title: "Testing, Observability & Operations",order: 7, hue: "indigo", scope: "subject" }
  - { id: "craft",         title: "Design, Patterns & Architecture",    order: 8, hue: "teal",   scope: "subject" }
  - { id: "synthesis",     title: "Interview Synthesis",                order: 9,  scope: "mode" }
  - { id: "output",        title: "Predict the Output",                 order: 10, scope: "mode" }
```

## 4.1 Question topics

Twenty-six topics. **These are not the theory modules** — they are shaped for
lookup ("where would I file this question?"), and several deliberately cut
across the reading order. `estimated_questions` is a target, not a promise; the
hard totals in `validate-nav.js` are whatever is actually authored, and where a
topic has been authored the real count is recorded beside the estimate.

**Subsections are revised as topics are written, not before.** They are a
filing decision, and a filing decision is only testable once the questions
exist. `java-language` gained a fifth subsection — `errors` — during Phase 2,
because the exception hierarchy is in that topic's key topics and belongs
under neither "OOP & Design" nor "equals, hashCode & Immutability". Keeping
the count at four would have meant filing it under a heading that did not
describe it.

```yaml
question_topics:
  - id: "java-language"
    title: "Java Language & OOP"
    track: "java-platform"
    subsections: [{ id: "oop", title: "OOP & Design" }, { id: "object-contract", title: "equals, hashCode & Immutability" }, { id: "generics", title: "Generics & Erasure" }, { id: "modern", title: "Records, Sealed Types & Pattern Matching" }, { id: "errors", title: "Exceptions & Errors" }]
    keyTopics: ["inheritance vs composition", "abstract class vs interface", "equals/hashCode contract", "immutability", "generics erasure", "variance", "records", "sealed interfaces", "pattern matching for switch", "exception hierarchy"]
    estimated_questions: 45   # authored in Phase 2: 44

  - id: "collections"
    title: "Collections Framework"
    track: "java-platform"
    subsections: [{ id: "lists-sets", title: "Lists & Sets" }, { id: "maps", title: "Maps & Hashing" }, { id: "concurrent", title: "Concurrent Collections" }]
    keyTopics: ["HashMap internals", "treeify threshold", "ArrayList vs LinkedList", "TreeMap ordering", "fail-fast iterators", "ConcurrentHashMap", "CopyOnWriteArrayList", "immutable collections"]
    estimated_questions: 32   # authored in Phase 2: 26

  - id: "streams-functional"
    title: "Streams, Lambdas & Optional"
    track: "java-platform"
    subsections: null
    keyTopics: ["lazy evaluation", "intermediate vs terminal", "Collectors", "groupingBy", "flatMap", "parallel streams", "Optional misuse", "functional interfaces", "method references"]
    estimated_questions: 28

  - id: "concurrency"
    title: "Concurrency & Multithreading"
    track: "java-platform"
    subsections: [{ id: "basics", title: "Threads & the Memory Model" }, { id: "executors", title: "Executors & Futures" }, { id: "virtual", title: "Virtual Threads & Structured Concurrency" }]
    keyTopics: ["happens-before", "volatile", "synchronized", "ExecutorService", "pool sizing", "CompletableFuture", "deadlock", "virtual threads", "pinning", "StructuredTaskScope", "scoped values", "ThreadLocal leaks"]
    estimated_questions: 42   # authored in Phase 2: 29

  - id: "jvm-memory"
    title: "JVM, Memory & Garbage Collection"
    track: "java-platform"
    subsections: [{ id: "structure", title: "Heap, Stack & Metaspace" }, { id: "gc", title: "Garbage Collectors" }, { id: "diagnostics", title: "Diagnostics & Leaks" }]
    keyTopics: ["heap generations", "Eden and survivor spaces", "Metaspace", "G1", "ZGC", "GC tuning flags", "OutOfMemoryError causes", "class loading", "classloader leaks", "heap dumps", "JIT"]
    estimated_questions: 34

  - id: "spring-core"
    title: "Spring Core & Dependency Injection"
    track: "spring-core"
    subsections: [{ id: "container", title: "Container & Context" }, { id: "beans", title: "Beans, Scopes & Lifecycle" }, { id: "wiring", title: "Wiring & Circular Dependencies" }]
    keyTopics: ["IoC", "constructor vs field injection", "bean scopes", "bean lifecycle callbacks", "BeanFactory vs ApplicationContext", "@Component vs @Bean", "@Primary and @Qualifier", "circular dependency", "BeanPostProcessor"]
    estimated_questions: 38   # authored in Phase 2: 27

  - id: "spring-boot"
    title: "Spring Boot & Auto-Configuration"
    track: "spring-core"
    subsections: [{ id: "autoconfig", title: "Auto-Configuration" }, { id: "config", title: "External Configuration & Profiles" }, { id: "versions", title: "Boot 2 → 3 → 4" }]
    keyTopics: ["@SpringBootApplication", "@EnableAutoConfiguration", "AutoConfiguration.imports", "@Conditional", "starters", "custom starter", "property precedence", "@ConfigurationProperties", "profiles", "javax to jakarta", "SpringApplication.run lifecycle"]
    estimated_questions: 36   # authored in Phase 2: 24

  - id: "aop-proxies"
    title: "AOP, Proxies & Annotations"
    track: "spring-core"
    subsections: null
    keyTopics: ["JDK dynamic proxy vs CGLIB", "self-invocation", "advice types", "pointcut expressions", "proxy-target-class", "@Async", "@Cacheable", "@Retryable", "custom annotations"]
    estimated_questions: 22   # authored in Phase 2: 14

  - id: "rest-api"
    title: "REST APIs & Spring MVC"
    track: "web-api"
    subsections: [{ id: "mvc", title: "MVC & the Request Lifecycle" }, { id: "design", title: "API Design" }, { id: "errors", title: "Validation & Error Handling" }, { id: "json", title: "Jackson & Serialization" }]
    keyTopics: ["DispatcherServlet", "HandlerMapping", "@RestController", "filters vs interceptors", "content negotiation", "HTTP status codes", "idempotent methods", "pagination", "API versioning", "@ControllerAdvice", "Bean Validation", "ProblemDetail", "Jackson annotations"]
    estimated_questions: 44   # authored in Phase 2: 22

  - id: "beyond-rest"
    title: "Beyond REST: gRPC, GraphQL, WebSockets & Reactive"
    track: "web-api"
    subsections: [{ id: "styles", title: "API Styles" }, { id: "streaming", title: "Streaming & Push" }, { id: "reactive", title: "Reactive" }]
    keyTopics: ["REST vs gRPC vs GraphQL", "protobuf and contracts", "gRPC streaming modes", "GraphQL N+1 and dataloader", "over- and under-fetching", "WebSockets vs SSE vs polling", "Mono and Flux", "backpressure", "blocking in a reactive chain", "WebClient vs RestClient", "reactive vs virtual threads"]
    estimated_questions: 30

  - id: "spring-security"
    title: "Spring Security, JWT & OAuth2"
    track: "security"
    subsections: [{ id: "chain", title: "The Filter Chain" }, { id: "tokens", title: "JWT & Sessions" }, { id: "oauth", title: "OAuth2 & OIDC" }, { id: "hardening", title: "CORS, CSRF & Hardening" }]
    keyTopics: ["SecurityFilterChain", "AuthenticationManager", "UserDetailsService", "password encoding", "JWT signing and validation", "token revocation", "refresh tokens", "authorization code flow with PKCE", "@PreAuthorize", "CORS preflight", "CSRF on stateless APIs", "OWASP API Top 10"]
    estimated_questions: 38

  - id: "jpa-hibernate"
    title: "JPA & Hibernate"
    track: "persistence"
    subsections: [{ id: "mapping", title: "Mapping & Relationships" }, { id: "context", title: "Persistence Context" }, { id: "fetching", title: "Fetching & N+1" }, { id: "caching", title: "Caching" }]
    keyTopics: ["entity lifecycle states", "cascade types", "orphanRemoval", "LAZY vs EAGER", "LazyInitializationException", "N+1", "join fetch", "@EntityGraph", "batch fetch size", "dirty checking", "flush modes", "first-level cache", "second-level cache", "entity equals and hashCode", "Spring Data derived queries", "projections"]
    estimated_questions: 46   # authored in Phase 2: 21

  - id: "transactions"
    title: "Transactions & Concurrency Control"
    track: "persistence"
    subsections: null   # confirmed while authoring: the topic reads as one sequence
    keyTopics: ["ACID", "isolation levels", "dirty read", "non-repeatable read", "phantom read", "propagation", "REQUIRES_NEW", "NESTED and savepoints", "rollback rules", "self-invocation", "readOnly", "optimistic locking with @Version", "pessimistic locking", "deadlock"]
    estimated_questions: 30   # authored in Phase 2: 16

  - id: "sql-databases"
    title: "SQL & Database Design"
    track: "persistence"
    subsections: [{ id: "querying", title: "Querying" }, { id: "modelling", title: "Modelling & Normalisation" }, { id: "performance", title: "Indexes & Plans" }, { id: "ops", title: "Pooling, Migration & Scale" }]
    keyTopics: ["joins", "GROUP BY and HAVING", "window functions", "NULL semantics", "B-tree indexes", "composite index column order", "covering index", "EXPLAIN ANALYZE", "sequential vs index scan", "join algorithms", "normalisation", "HikariCP sizing", "pool exhaustion", "Flyway", "read replicas", "sharding"]
    estimated_questions: 44   # authored in Phase 2: 21

  - id: "microservices"
    title: "Microservices & Distributed Patterns"
    track: "distributed"
    subsections: [{ id: "boundaries", title: "Boundaries & Communication" }, { id: "resilience", title: "Resilience" }, { id: "consistency", title: "Consistency & Sagas" }, { id: "platform", title: "Gateway, Discovery & Config" }]
    keyTopics: ["service decomposition", "database per service", "sync vs async", "timeouts and retries", "circuit breaker", "bulkhead", "idempotency keys", "saga orchestration vs choreography", "compensating transactions", "transactional outbox", "why not 2PC", "service discovery", "API gateway", "config server", "distributed tracing"]
    estimated_questions: 42

  - id: "kafka-messaging"
    title: "Kafka & Messaging"
    track: "distributed"
    subsections: null
    keyTopics: ["topics and partitions", "consumer groups", "offset management", "rebalancing", "ordering guarantees", "at-least-once vs exactly-once", "idempotent producer", "transactional producer", "retry and DLQ", "Kafka vs RabbitMQ", "consumer lag", "poison messages"]
    estimated_questions: 30

  - id: "caching-scale"
    title: "Caching, Performance & Scale"
    track: "distributed"
    subsections: null
    keyTopics: ["cache-aside", "write-through", "TTL and eviction", "cache stampede", "Redis data structures", "distributed locks", "rate limiting algorithms", "consistent hashing", "CAP", "eventual consistency", "back-pressure"]
    estimated_questions: 30

  - id: "testing"
    title: "Testing"
    track: "production"
    subsections: null
    keyTopics: ["test pyramid", "JUnit 5", "Mockito", "@MockitoBean vs @Mock", "test slices", "@WebMvcTest", "@DataJpaTest", "Testcontainers", "@Transactional in tests", "contract testing", "flaky tests"]
    estimated_questions: 26

  - id: "observability-ops"
    title: "Observability, Docker & Kubernetes"
    track: "production"
    subsections: [{ id: "observability", title: "Metrics, Logs & Traces" }, { id: "deploy", title: "Containers & Kubernetes" }, { id: "incidents", title: "Debugging Production" }]
    keyTopics: ["Actuator endpoints", "liveness vs readiness", "Micrometer", "Prometheus", "OpenTelemetry", "correlation IDs", "structured logging", "layered jars", "graceful shutdown", "resource limits and the JVM", "blue-green", "rollback", "GraalVM native image"]
    estimated_questions: 32

  - id: "java-io-time"
    title: "I/O, Serialization & Date/Time"
    track: "java-platform"
    subsections: [{ id: "io", title: "I/O, NIO & Files" }, { id: "serialization", title: "Serialization" }, { id: "time", title: "Date & Time" }]
    keyTopics: ["byte vs character streams", "try-with-resources", "Files and Path", "NIO channels and buffers", "streaming a large file", "Serializable", "serialVersionUID", "transient", "Externalizable", "why Java serialization is a hazard", "LocalDate vs Instant vs ZonedDateTime", "time zones and DST", "Duration vs Period", "storing time in a database"]
    estimated_questions: 28

  - id: "design-patterns"
    title: "Design Patterns, SOLID & OOD"
    track: "craft"
    subsections: [{ id: "solid", title: "SOLID & OO Design" }, { id: "gof", title: "Patterns That Get Asked" }, { id: "in-spring", title: "Patterns Spring Uses" }]
    keyTopics: ["single responsibility", "open-closed", "liskov substitution", "interface segregation", "dependency inversion", "singleton", "factory and abstract factory", "builder", "strategy", "template method", "observer", "decorator", "adapter", "proxy", "chain of responsibility", "patterns in Spring", "when a pattern is overkill", "anti-patterns"]
    estimated_questions: 32

  - id: "architecture-ddd"
    title: "Application Architecture & DDD"
    track: "craft"
    subsections: [{ id: "structure", title: "Structure & Layering" }, { id: "ddd", title: "Domain-Driven Design" }, { id: "cqrs", title: "CQRS & Event Sourcing" }]
    keyTopics: ["package by layer vs package by feature", "hexagonal architecture", "clean architecture", "ports and adapters", "DTO vs entity", "anemic domain model", "bounded context", "aggregate and aggregate root", "entity vs value object", "ubiquitous language", "CQRS", "event sourcing", "read models and projections", "when clean architecture is overkill"]
    estimated_questions: 28

  - id: "build-tools"
    title: "Build, Dependencies & Ways of Working"
    track: "production"
    subsections: null
    keyTopics: ["Maven lifecycle phases and goals", "dependency scopes", "transitive dependencies", "nearest-wins mediation", "dependency:tree", "BOM and dependencyManagement", "multi-module projects", "Maven vs Gradle", "reproducible builds", "vulnerability scanning", "branching strategy", "rebase vs merge", "code review"]
    estimated_questions: 22

  - id: "nosql"
    title: "NoSQL: MongoDB, Redis & Search"
    track: "persistence"
    subsections: null
    keyTopics: ["when not relational", "document modelling", "embed vs reference", "MongoDB indexes", "Spring Data MongoDB", "Redis beyond caching", "Redis persistence and eviction", "Elasticsearch basics", "inverted index", "polyglot persistence and its cost", "choosing a store"]
    estimated_questions: 26

  - id: "cloud"
    title: "Cloud & Managed Services"
    track: "production"
    subsections: null
    keyTopics: ["object storage and presigned URLs", "managed queues", "managed relational databases", "containers vs serverless", "Java cold starts and mitigations", "GraalVM native image", "secrets and parameter stores", "IAM and least privilege", "cost awareness", "cloud-agnostic vs managed trade-off"]
    estimated_questions: 24

  - id: "behavioural-project"
    title: "Behavioural, Projects & Résumé Defence"
    track: null
    subsections: null
    keyTopics: ["STAR structure", "describing an incident", "trade-offs you made", "a decision you got wrong", "estimating and missing", "code review disagreement", "explaining your architecture", "questions to ask the interviewer"]
    estimated_questions: 24
```

**Twenty-six topics, ~853 questions.** That is a very large corpus. §8.1 defines
the subset that makes a genuinely useful deck at about a third of it; treat the
rest as an authoring backlog, not a launch requirement.

## 4.2 Totals

The blueprint requires these as **hard numbers in `validate-nav.js`**, updated by
hand in the same commit that changes the corpus. The values below are *targets*
for planning; the committed numbers are always whatever is actually authored.

**Phase 2 actual, for the ten core topics:** 244 questions — 93 must-know, 101
should-know, 50 good-to-know — with 49 code snippets (41 Java, 4 SQL, 2
properties, 1 YAML, 1 Dockerfile) and 14 diagrams. 28 snippets claim a console
output and 21 record a trace instead. Every SQL snippet is a trace, because the
runner executes Java only.

**Phase 6 actual, for all 26 topics:** 486 questions — 216 must-know, 192
should-know, 78 good-to-know — with 63 code snippets (51 Java, 4 SQL, 3 bash,
2 properties, 2 Dockerfile, 1 YAML) and 19 diagrams. 424 reference links on
405 of the questions. Against the ~853 estimate that is 57%, and the shortfall
is concentrated in the ten core topics authored in Phase 2, which were
estimated generously; the sixteen written in Phase 6 came in close to their
individual estimates where the subject warranted it and below where the
estimate assumed breadth the topic does not have.

**Phase 3 actual, for tracks 1–4:** 41 modules, 318 chapters, 1,030 blocks
against a target of ~320 chapters. By track: Java & the JVM 14/104, the Spring
container 7/51, HTTP and the web layer 7/53, persistence 13/110. By importance:
176 must-know, 110 should-know, 32 good-to-know. 166 syntax blocks (123 Java,
19 SQL, 12 properties, 6 bash, 4 HTTP, 1 YAML, 1 XML), 24 diagrams (17
flowchart, 6 sequence, 1 animation), 47 definition blocks, 361 documentation
links and 317 `relatedQuestions` references, all of which resolve.

**Phase 7 actual, for all eight tracks:** 83 modules, 687 chapters, 2,045
blocks. By track: Java & the JVM 20/163, the Spring container 7/51, HTTP and
the web layer 8/64, persistence 14/121, security 6/48, microservices and scale
11/86, testing and operations 10/86, design and architecture 7/68. By
importance: 390 must-know, 245 should-know, 52 good-to-know. 346 syntax blocks
(258 Java, 23 SQL, 20 YAML, 16 bash, 12 properties, 8 HTTP, 6 XML, 2 JSON, 1
Dockerfile), 35 diagrams (27 flowchart, 7 sequence, 1 animation), 61 definition
blocks, 761 documentation links and 825 `relatedQuestions` references, all of
which resolve.

**687 is the figure §5.11 arrived at before a chapter of any of these tracks
existed.** It was computed from the module manifests by adding up their chapter
counts; the corpus reached it by being written module by module over eighteen
commits. Two counts derived from opposite ends agreeing exactly is the
strongest check available on a manifest that no validator can read, and it is
worth more than either number on its own.

**Phase 8 actual, the two catalogues completed:** 46 drills across four tiers
(8 tier-1, 12 tier-2, 15 tier-3, 11 tier-4) and 81 predict puzzles across
eleven sets. Both figures are the ones Parts 6 and 7 wrote down before any of
it existed, because both catalogues are held as hard lists in
`validate-theory.js` — a drill that is not in the list is an error and a drill
in the list that is not written is a warning, so the corpus could not drift
from the plan in either direction.

**Of the 47 puzzles written in Phase 8, seven claim `stdout` and forty declare
`behaviour`, `query-count`, `sql-result` or `http-response`.** Part 7 marks
`predict-io-and-time` as a `stdout` set and seven of its eight are; the eighth
is a `serialVersionUID` mismatch, which needs bytes written by one compilation
and read by another and therefore cannot be a single-file program. Part 9's
rule decided it: a snippet the toolchain cannot run does not claim `stdout`.
The other six sets are inherently unrunnable — a Spring answer needs a
refreshed context, a JPA answer needs a persistence context, a SQL answer
needs an engine — and every one of the forty carries a `verification` string
naming the specification section or documentation chapter it was read from.

**Every one of the 95 outputs in the theory corpus is a `trace`. Not one claims
`stdout`,** which is the honest position while no JDK exists on the build
machine: the validator only checks that the *language* is runnable, and that is
a weaker assertion than the output being correct. See the blind spot recorded in
`CLAUDE.md`.

```yaml
totals:                       # targets, not commitments
  questions: 853              # across all 26 topics; 244 authored in Phase 2
  theory:    687              # chapters in the SUBJECT tracks only. MET EXACTLY
                              # at the end of Phase 7: 318 in Phase 3, 369 in Phase 7
  synthesis:  46              # drill blocks. MET EXACTLY at the end of Phase 8:
                              # 19 in Phase 4, 27 in Phase 8
  predict:    81              # predict blocks. MET EXACTLY at the end of Phase 8:
                              # 34 in Phase 4, 47 in Phase 8
  glossary:   61              # definition blocks — COUNTED, never estimated.
                              # 47 at the end of Phase 3, re-counted at the end
                              # of Phase 7 as the section below instructed.
```

`glossary` is the one total that could not be planned honestly: it is harvested
from `definition` blocks, so it is a consequence of how the chapters were
written, not a decision. **The 600 written here before any chapter existed was
wrong by an order of magnitude.** 318 chapters produced 47 terms, and the reason
is a rule the authoring settled into rather than a shortfall: a `definition`
block is for a term the reader will meet again in another module, so most
chapters define nothing and the ones that do define one. Extrapolated over all
687 subject chapters that is roughly a hundred, not six hundred.

**The re-count at the end of Phase 7 gives 61**, which is below even that
hundred. The extrapolation assumed the second half of the reading path would
define terms at the rate the first half did, and it does not: the later tracks
lean on vocabulary the earlier ones already introduced, so security, messaging
and operations between them added fourteen terms across 288 chapters. The rule
held; the corpus simply ran out of new words to name. 61 is the number in
`validate-nav.js`, and the 600 written here before any chapter existed remains
the largest single miss in this document.

---

# PART 5 — The theory corpus

Eighty-three modules in **one global reading order**. `order` is global, not
per-track, because the cross-track prerequisites are the whole reason the order
exists — you cannot teach `@Transactional` propagation before transactions, and
you cannot teach transactions before the container that manages them.

Read the `prerequisites` column as the load-bearing part. Every entry resolves
to a **lower** order; `validate-theory.js` enforces it.

The `order:` numbers in §5.1–5.7 predate the modules added in §5.8–5.9 and are
**superseded**. §5.10 gives the rule that replaces them: the sequence is the
source of truth, and `order` is assigned from it in one pass before Phase 3.

## 5.1 Track 1 — `java-platform` (violet) — 14 modules, +6 in §5.9

The platform you are running on, in the order the ideas depend on each other.
Java-the-language and the JVM are one subject here, not two.

```yaml
- { id: "how-java-runs",          order: 1,  title: "How Java Runs",                          tagline: "JDK, JVM, bytecode, JIT, and why any of it matters in an interview.", estimatedMinutes: 25, prerequisites: [], docHub: { title: "JVM Specification", path: "/specs/jvms" },
    chapters: ["jdk-jre-jvm", "compile-and-classfile", "jit-and-tiered-compilation", "jvm-vs-jre-question"] }
- { id: "objects-and-contracts",  order: 2,  title: "Objects, Types and the Object Contract",  tagline: "equals, hashCode, toString — the contract every collection assumes.", estimatedMinutes: 40, prerequisites: ["how-java-runs"],
    chapters: ["object-identity-vs-equality", "equals-contract", "hashcode-contract", "why-both-together", "immutability", "defensive-copies", "tostring-and-debugging"] }
- { id: "inheritance-and-interfaces", order: 3, title: "Inheritance, Interfaces and Polymorphism", tagline: "Abstract class or interface, and the questions built on that choice.", estimatedMinutes: 35, prerequisites: ["objects-and-contracts"],
    chapters: ["abstract-vs-interface", "default-and-static-methods", "diamond-resolution", "overriding-vs-overloading", "static-method-hiding", "composition-over-inheritance", "liskov-in-practice"] }
- { id: "exceptions-and-failure", order: 4,  title: "Exceptions and Failure Design",           tagline: "Checked, unchecked, and what a good exception boundary looks like.", estimatedMinutes: 30, prerequisites: ["inheritance-and-interfaces"],
    chapters: ["exception-hierarchy", "checked-vs-unchecked-debate", "try-with-resources", "finally-and-return", "exception-translation", "custom-exception-design"] }
- { id: "generics-and-erasure",   order: 5,  title: "Generics, Erasure and Variance",          tagline: "Why List<String> and List<Integer> are the same class at runtime.", estimatedMinutes: 40, prerequisites: ["inheritance-and-interfaces"],
    chapters: ["why-generics", "type-erasure", "bounded-types", "wildcards-and-pecs", "generic-methods", "erasure-consequences", "reifiable-types-and-arrays"] }
- { id: "collections-choosing",   order: 6,  title: "Collections: Choosing Correctly",         tagline: "The decision table, defended.", estimatedMinutes: 35, prerequisites: ["generics-and-erasure"], docHub: { title: "Collections Framework", path: "/api/java.base/java/util/package-summary.html" },
    chapters: ["the-interfaces", "arraylist-vs-linkedlist", "set-implementations", "map-implementations", "queues-and-deques", "immutable-collections", "choosing-a-collection"] }
- { id: "hashmap-internals",      order: 7,  title: "Inside HashMap",                          tagline: "Buckets, collisions, resize, treeify — the most-asked internals question.", estimatedMinutes: 40, prerequisites: ["collections-choosing", "objects-and-contracts"],
    chapters: ["bucket-array-and-hash-spreading", "collision-and-chaining", "treeify-threshold", "resize-and-rehash", "mutable-keys", "null-keys", "linkedhashmap-and-lru", "treemap-and-comparators"] }
- { id: "streams-and-lambdas",    order: 8,  title: "Lambdas, Streams and Optional",           tagline: "Lazy pipelines, and the three ways people misuse them.", estimatedMinutes: 45, prerequisites: ["collections-choosing"],
    chapters: ["functional-interfaces", "lambda-vs-anonymous-class", "stream-laziness", "intermediate-and-terminal", "collectors", "groupingby-and-partitioningby", "flatmap", "parallel-streams-and-when-not", "optional-done-right"] }
- { id: "modern-java",            order: 9,  title: "Modern Java: 17 → 25",                    tagline: "Records, sealed types, pattern matching — and which LTS you are being asked about.", estimatedMinutes: 40, prerequisites: ["streams-and-lambdas"],
    chapters: ["records", "sealed-types", "pattern-matching-for-switch", "text-blocks", "var-and-inference", "what-changed-per-lts", "sequenced-collections"] }
- { id: "threads-and-memory-model", order: 10, title: "Threads and the Java Memory Model",     tagline: "happens-before, and why your field was stale.", estimatedMinutes: 50, prerequisites: ["objects-and-contracts"],
    chapters: ["thread-lifecycle", "visibility-and-reordering", "happens-before", "volatile", "synchronized-and-monitors", "atomics-and-cas", "deadlock-livelock-starvation", "immutability-as-a-concurrency-strategy"] }
- { id: "executors-and-futures",  order: 11, title: "Executors, Futures and CompletableFuture", tagline: "Pool sizing, and where exceptions go to die.", estimatedMinutes: 45, prerequisites: ["threads-and-memory-model"],
    chapters: ["executorservice", "pool-types-and-queues", "sizing-a-pool", "shutdown-vs-shutdownnow", "callable-and-future", "completablefuture-composition", "completablefuture-error-handling", "concurrent-collections"] }
- { id: "virtual-threads",        order: 12, title: "Virtual Threads and Structured Concurrency", tagline: "The change that made round-3 concurrency questions different in 2025.", estimatedMinutes: 45, prerequisites: ["executors-and-futures"], docHub: { title: "JEP 444: Virtual Threads", path: "/444" },
    chapters: ["platform-vs-virtual", "when-virtual-threads-help", "pinning-and-what-causes-it", "threadlocal-in-a-virtual-world", "structured-task-scope", "scoped-values", "virtual-threads-in-spring-boot", "virtual-threads-vs-reactive"] }
- { id: "heap-and-gc",            order: 13, title: "The Heap and the Collector",              tagline: "Generations, G1, ZGC, and answering 'how would you tune this'.", estimatedMinutes: 50, prerequisites: ["how-java-runs"],
    chapters: ["memory-areas", "young-and-old-generations", "allocation-and-tlab", "gc-roots-and-reachability", "g1-in-outline", "zgc-and-low-latency", "choosing-a-collector", "gc-flags-worth-knowing", "gc-logs-and-what-to-look-for"] }
- { id: "jvm-diagnostics",        order: 14, title: "Reading a Production JVM",                tagline: "Class loading, Metaspace, leaks, and the commands you run at 2 a.m.", estimatedMinutes: 45, prerequisites: ["heap-and-gc"],
    chapters: ["classloader-hierarchy", "metaspace-and-its-oom", "classloader-leaks", "outofmemoryerror-varieties", "heap-dumps-and-histograms", "thread-dumps", "jcmd-jstat-jmap", "profiling-in-production", "jvm-in-a-container"] }
```

## 5.2 Track 2 — `spring-core` (sky) — 7 modules

```yaml
- { id: "ioc-and-the-container",  order: 15, title: "The Container: IoC, Beans, Scopes",       tagline: "What Spring is, before anything is auto-configured.", estimatedMinutes: 40, prerequisites: ["inheritance-and-interfaces"], docHub: { title: "Spring Framework Core", path: "/core.html" },
    chapters: ["inversion-of-control", "beanfactory-vs-applicationcontext", "bean-definition-and-instantiation", "bean-scopes", "bean-lifecycle", "aware-interfaces-and-postprocessors", "prototype-in-a-singleton"] }
- { id: "wiring-beans",           order: 16, title: "Wiring: Injection and Ambiguity",         tagline: "@Component or @Bean, constructor or field, and what a circular dependency really means.", estimatedMinutes: 35, prerequisites: ["ioc-and-the-container"],
    chapters: ["component-scanning", "component-vs-bean", "injection-styles", "why-constructor-injection-wins", "primary-and-qualifier", "conditional-beans", "circular-dependencies", "lazy-and-objectprovider"] }
- { id: "configuration-and-profiles", order: 17, title: "External Configuration",              tagline: "Where a property comes from, and which one wins.", estimatedMinutes: 35, prerequisites: ["wiring-beans"], docHub: { title: "Externalized Configuration", path: "/features/external-config.html" },
    chapters: ["property-sources-and-precedence", "value-vs-configurationproperties", "relaxed-binding", "profiles", "config-validation", "secrets-and-what-not-to-commit", "config-in-kubernetes"] }
- { id: "aop-and-proxies",        order: 18, title: "AOP, Proxies and the Self-Invocation Trap", tagline: "The single most valuable mechanism to understand in Spring.", estimatedMinutes: 45, prerequisites: ["wiring-beans"],
    chapters: ["what-a-proxy-is", "jdk-proxy-vs-cglib", "advice-and-pointcuts", "self-invocation", "how-to-work-around-self-invocation", "async-and-cacheable-share-the-trap", "final-and-private-methods", "proxy-order-and-precedence"] }
- { id: "autoconfiguration",      order: 19, title: "Auto-Configuration and How to Debug It",  tagline: "Not magic: a list of classes, a set of conditions, and a report you can print.", estimatedMinutes: 40, prerequisites: ["configuration-and-profiles", "aop-and-proxies"], docHub: { title: "Auto-configuration", path: "/using/auto-configuration.html" },
    chapters: ["springbootapplication-decomposed", "autoconfiguration-imports", "conditional-annotations", "ordering-and-backing-off", "the-condition-evaluation-report", "excluding-autoconfiguration", "writing-a-custom-starter"] }
- { id: "application-lifecycle",  order: 20, title: "SpringApplication, Start to Stop",        tagline: "What run() does, and what shutdown does not.", estimatedMinutes: 30, prerequisites: ["autoconfiguration"],
    chapters: ["run-step-by-step", "environment-preparation", "application-events", "listeners-and-runners", "embedded-server-startup", "graceful-shutdown", "startup-time-and-lazy-init"] }
- { id: "spring-generations",     order: 21, title: "Boot 2 → 3 → 4: What Changed",            tagline: "The version question, answered once and kept current.", estimatedMinutes: 30, prerequisites: ["application-lifecycle"],
    chapters: ["javax-to-jakarta", "boot-3-baseline-and-native", "observability-replaces-sleuth", "restclient-and-http-interfaces", "framework-7-and-boot-4", "java-baselines-per-line", "planning-a-migration"] }
```

> Every chapter in `spring-generations` carries a `version` block (delta D1).
> So do `modern-java`, `virtual-threads`, `restclient-and-http-interfaces` and
> `observability-replaces-sleuth`.

## 5.3 Track 3 — `web-api` (lime) — 7 modules, +1 in §5.9

```yaml
- { id: "http-foundations",       order: 22, title: "HTTP, Properly",                          tagline: "Status codes, idempotency, caching headers — the layer under the framework.", estimatedMinutes: 35, prerequisites: [],
    chapters: ["request-response-anatomy", "methods-and-safety", "idempotency-of-methods", "status-codes-that-matter", "caching-headers-and-etags", "content-negotiation", "keep-alive-and-connection-reuse", "http2-and-http3-in-outline"] }
- { id: "dispatcher-lifecycle",   order: 23, title: "The Request Lifecycle",                   tagline: "DispatcherServlet, front to back.", estimatedMinutes: 40, prerequisites: ["http-foundations", "ioc-and-the-container"], docHub: { title: "Spring MVC", path: "/web/webmvc.html" },
    chapters: ["servlet-container-and-dispatcher", "handler-mapping-and-adapter", "argument-resolvers", "message-converters", "view-resolution-and-restcontroller", "filters-vs-interceptors", "servlet-async-and-deferredresult"] }
- { id: "rest-api-design",        order: 24, title: "Designing a REST API",                    tagline: "Resources, pagination, versioning, idempotency keys.", estimatedMinutes: 45, prerequisites: ["dispatcher-lifecycle"],
    chapters: ["resource-modelling", "richardson-maturity", "pagination-strategies", "filtering-and-sorting", "api-versioning-strategies", "idempotency-keys", "bulk-and-batch-endpoints", "long-running-operations", "documenting-with-openapi"] }
- { id: "validation-and-errors",  order: 25, title: "Validation and Error Handling",           tagline: "One error shape, everywhere.", estimatedMinutes: 35, prerequisites: ["dispatcher-lifecycle"],
    chapters: ["bean-validation-basics", "validation-groups", "custom-constraints", "controlleradvice", "problemdetail-rfc9457", "error-shape-design", "what-not-to-leak-in-an-error"] }
- { id: "serialization",          order: 26, title: "Jackson and Its Traps",                   tagline: "Where a working API quietly starts returning the wrong thing.", estimatedMinutes: 35, prerequisites: ["validation-and-errors"],
    chapters: ["objectmapper-and-configuration", "annotations-worth-knowing", "polymorphic-deserialization", "dates-and-time-zones", "bigdecimal-and-money", "null-vs-absent", "records-and-jackson", "circular-references-in-jpa-entities"] }
- { id: "async-and-scheduling",   order: 27, title: "Async, Scheduling and Background Work",   tagline: "@Async, @Scheduled, and the jobs that outlive a request.", estimatedMinutes: 35, prerequisites: ["aop-and-proxies", "executors-and-futures"],
    chapters: ["async-and-its-executor", "async-exception-handling", "scheduled-and-cron", "scheduling-in-a-multi-instance-deployment", "shedlock-and-leader-election", "spring-batch-when", "graceful-shutdown-of-background-work"] }
- { id: "reactive-and-webflux",   order: 28, title: "Reactive, and When Not To",               tagline: "WebFlux next to virtual threads: the honest comparison.", estimatedMinutes: 40, prerequisites: ["virtual-threads", "dispatcher-lifecycle"],
    chapters: ["why-reactive-existed", "mono-and-flux", "backpressure", "blocking-in-a-reactive-chain", "webclient-and-restclient", "reactive-vs-virtual-threads", "when-webflux-is-the-wrong-answer"] }
```

## 5.4 Track 4 — `persistence` (amber) — 13 modules, +1 in §5.9

The largest track, and correctly so: JPA, transactions and SQL are the densest
part of round 3 and the source of most production incidents.

```yaml
- { id: "relational-foundations", order: 29, title: "Relational Modelling",                    tagline: "Keys, normalisation, and when to stop normalising.", estimatedMinutes: 35, prerequisites: [], docHub: { title: "PostgreSQL Documentation", path: "/ddl.html" },
    chapters: ["tables-keys-constraints", "normal-forms-in-practice", "when-to-denormalise", "surrogate-vs-natural-keys", "uuid-vs-bigint-keys", "soft-delete-and-its-costs", "modelling-money-and-time"] }
- { id: "sql-you-are-asked",      order: 30, title: "The SQL You Are Asked to Write",          tagline: "Joins, aggregation, window functions — on a whiteboard.", estimatedMinutes: 50, prerequisites: ["relational-foundations"],
    chapters: ["join-types", "null-semantics", "group-by-and-having", "subqueries-vs-joins", "cte-and-recursion", "window-functions", "second-highest-salary-and-friends", "set-operations", "upsert"] }
- { id: "indexes-and-plans",      order: 31, title: "Indexes and Execution Plans",             tagline: "Why the index you added is not being used.", estimatedMinutes: 45, prerequisites: ["sql-you-are-asked"],
    chapters: ["b-tree-index", "composite-index-column-order", "covering-index", "index-selectivity", "when-an-index-hurts", "function-on-column-kills-the-index", "reading-explain-analyze", "seq-scan-vs-index-scan", "join-algorithms", "other-index-types"] }
- { id: "transactions-and-isolation", order: 32, title: "Transactions and Isolation",          tagline: "ACID, the four anomalies, and what your database actually defaults to.", estimatedMinutes: 45, prerequisites: ["relational-foundations"],
    chapters: ["acid", "the-four-isolation-levels", "dirty-read", "non-repeatable-read", "phantom-read", "mvcc-in-outline", "what-read-committed-actually-gives-you", "choosing-an-isolation-level"] }
- { id: "locking-and-deadlocks",  order: 33, title: "Locking and Deadlocks",                   tagline: "Optimistic, pessimistic, and how to stop a deadlock recurring.", estimatedMinutes: 40, prerequisites: ["transactions-and-isolation"],
    chapters: ["shared-and-exclusive-locks", "row-vs-table-locks", "optimistic-locking-with-version", "pessimistic-read-and-write", "select-for-update", "deadlock-anatomy", "consistent-lock-ordering", "lost-update-problem"] }
- { id: "jdbc-and-pooling",       order: 34, title: "JDBC and the Connection Pool",            tagline: "HikariCP sizing, and the failure that causes the most outages.", estimatedMinutes: 40, prerequisites: ["transactions-and-isolation"],
    chapters: ["jdbc-in-one-chapter", "jdbctemplate-and-jdbcclient", "what-a-pool-is-for", "hikaricp-settings-that-matter", "sizing-a-pool", "pool-exhaustion-symptoms", "leak-detection-threshold", "statement-timeouts"] }
- { id: "jpa-mapping",            order: 35, title: "JPA Mapping",                             tagline: "Entities, relationships, cascades — and equals for an entity.", estimatedMinutes: 50, prerequisites: ["jdbc-and-pooling", "objects-and-contracts"], docHub: { title: "Hibernate ORM User Guide", path: "#entity" },
    chapters: ["entity-basics-and-id-generation", "onetomany-and-manytoone", "manytomany-and-why-to-avoid-it", "owning-side", "cascade-types", "orphan-removal", "embeddables-and-value-types", "inheritance-strategies", "entity-equals-and-hashcode"] }
- { id: "persistence-context",    order: 36, title: "The Persistence Context",                 tagline: "Dirty checking, flush order, and the first-level cache you did not know you had.", estimatedMinutes: 45, prerequisites: ["jpa-mapping"],
    chapters: ["entity-states", "first-level-cache", "dirty-checking", "flush-modes-and-flush-order", "merge-vs-persist", "detached-entities", "lazyinitializationexception", "open-session-in-view"] }
- { id: "fetching-and-n-plus-one", order: 37, title: "Fetching and the N+1 Problem",           tagline: "The most common JPA performance bug, and its three fixes.", estimatedMinutes: 45, prerequisites: ["persistence-context"],
    chapters: ["lazy-vs-eager", "why-eager-is-almost-always-wrong", "detecting-n-plus-one", "join-fetch", "entitygraph", "batch-fetch-size", "pagination-with-join-fetch", "dto-projections", "hibernate-statistics"] }
- { id: "spring-transactional",   order: 38, title: "@Transactional in Depth",                 tagline: "Propagation, rollback rules, and the proxy that is not there.", estimatedMinutes: 50, prerequisites: ["fetching-and-n-plus-one", "aop-and-proxies"], docHub: { title: "Transaction Management", path: "/data-access.html#transaction" },
    chapters: ["how-transactional-is-implemented", "propagation-required", "requires-new-and-suspension", "nested-and-savepoints", "the-other-propagations", "rollback-rules-and-checked-exceptions", "readonly-and-what-it-does", "self-invocation-again", "transaction-boundaries-in-a-service-layer", "transactions-across-http-calls"] }
- { id: "spring-data-jpa",        order: 39, title: "Spring Data JPA",                         tagline: "Derived queries, projections, specifications, and their limits.", estimatedMinutes: 40, prerequisites: ["spring-transactional"],
    chapters: ["repository-hierarchy", "derived-query-methods", "jpql-and-native-queries", "modifying-queries", "projections", "specifications-and-criteria", "pagination-and-sorting", "auditing", "when-to-drop-to-jdbc"] }
- { id: "second-level-cache",     order: 40, title: "Caching in the Persistence Layer",        tagline: "Second-level and query cache, and why they are usually the wrong tool.", estimatedMinutes: 30, prerequisites: ["spring-data-jpa"],
    chapters: ["cache-levels-compared", "second-level-cache-setup", "cache-concurrency-strategies", "query-cache-and-its-traps", "invalidation-in-a-cluster", "spring-cache-abstraction", "when-to-cache-in-redis-instead"] }
- { id: "schema-and-scale",       order: 41, title: "Migrations and Scaling the Database",     tagline: "Zero-downtime schema change, replicas, sharding.", estimatedMinutes: 40, prerequisites: ["indexes-and-plans", "spring-data-jpa"],
    chapters: ["flyway-and-liquibase", "expand-and-contract", "adding-a-non-null-column-safely", "backfilling-large-tables", "read-replicas-and-lag", "partitioning", "sharding-and-a-shard-key", "when-not-relational"] }
```

## 5.5 Track 5 — `security` (rose) — 6 modules

```yaml
- { id: "auth-foundations",       order: 42, title: "Authentication and Authorization",        tagline: "Two words people use interchangeably in interviews and should not.", estimatedMinutes: 35, prerequisites: ["http-foundations"],
    chapters: ["authn-vs-authz", "sessions-vs-tokens", "password-storage-and-bcrypt", "mfa-in-outline", "principal-authority-role", "stateless-and-what-it-costs"] }
- { id: "security-filter-chain",  order: 43, title: "The Spring Security Filter Chain",        tagline: "A list of filters. That is the whole architecture.", estimatedMinutes: 45, prerequisites: ["auth-foundations", "dispatcher-lifecycle"], docHub: { title: "Spring Security Architecture", path: "/servlet/architecture.html" },
    chapters: ["filter-chain-proxy", "the-filters-in-order", "authenticationmanager-and-providers", "userdetailsservice", "securitycontextholder", "multiple-filter-chains", "custom-filter-placement", "exception-translation-filter"] }
- { id: "jwt-in-practice",        order: 44, title: "JWT, End to End",                         tagline: "Signing, validating, expiring — and the revocation problem nobody mentions.", estimatedMinutes: 45, prerequisites: ["security-filter-chain"],
    chapters: ["jwt-structure", "signing-algorithms", "validating-a-token", "claims-worth-carrying", "expiry-and-clock-skew", "refresh-tokens", "revocation-and-why-it-is-hard", "storing-tokens-on-the-client", "jwt-mistakes-that-fail-an-interview"] }
- { id: "oauth2-and-oidc",        order: 45, title: "OAuth2 and OpenID Connect",               tagline: "Four roles, one flow worth memorising.", estimatedMinutes: 45, prerequisites: ["jwt-in-practice"],
    chapters: ["the-four-roles", "authorization-code-flow", "pkce", "client-credentials", "the-flows-that-are-deprecated", "oidc-on-top-of-oauth2", "resource-server-in-spring", "token-introspection-vs-jwt"] }
- { id: "method-security",        order: 46, title: "Method Security and Access Rules",        tagline: "Where authorization decisions actually belong.", estimatedMinutes: 30, prerequisites: ["security-filter-chain"],
    chapters: ["url-vs-method-security", "preauthorize-and-postauthorize", "spel-in-security-expressions", "roles-vs-authorities", "domain-object-security", "multi-tenancy-and-row-level-scoping", "testing-secured-methods"] }
- { id: "api-hardening",          order: 47, title: "Hardening an API",                        tagline: "CORS, CSRF, rate limits, secrets, and the OWASP list interviewers quote.", estimatedMinutes: 40, prerequisites: ["method-security"],
    chapters: ["cors-and-preflight", "csrf-and-stateless-apis", "rate-limiting-at-the-edge", "input-validation-as-defence", "sql-injection-and-parameterisation", "mass-assignment", "secrets-management", "security-headers", "owasp-api-top-10", "dependency-vulnerabilities"] }
```

## 5.6 Track 6 — `distributed` (pink) — 11 modules

```yaml
- { id: "service-boundaries",     order: 48, title: "Monolith, Modular Monolith, Microservice", tagline: "The answer is usually 'not yet', and you should be able to say why.", estimatedMinutes: 35, prerequisites: ["rest-api-design"],
    chapters: ["what-microservices-cost", "modular-monolith", "decomposition-by-capability", "database-per-service", "the-distributed-monolith", "spring-modulith", "when-to-split"] }
- { id: "sync-communication",     order: 49, title: "Synchronous Communication",               tagline: "Timeouts, retries, backoff — and the retry storm they cause.", estimatedMinutes: 40, prerequisites: ["service-boundaries"],
    chapters: ["restclient-webclient-feign", "timeouts-are-mandatory", "retry-and-backoff", "jitter-and-the-thundering-herd", "connection-pooling-for-http-clients", "cascading-failure", "graceful-degradation"] }
- { id: "resilience-patterns",    order: 50, title: "Resilience Patterns",                     tagline: "Circuit breaker, bulkhead, rate limiter — what each one actually prevents.", estimatedMinutes: 40, prerequisites: ["sync-communication"], docHub: { title: "Resilience4j", path: "/circuitbreaker" },
    chapters: ["circuit-breaker-states", "sizing-a-circuit-breaker", "bulkhead", "rate-limiter", "fallbacks-that-lie", "resilience4j-in-spring-boot", "combining-the-patterns", "load-shedding"] }
- { id: "idempotency",            order: 51, title: "Idempotency",                             tagline: "The property that makes every retry above safe.", estimatedMinutes: 35, prerequisites: ["resilience-patterns", "transactions-and-isolation"],
    chapters: ["what-idempotent-means", "idempotency-keys", "storing-and-expiring-keys", "natural-idempotency-and-upserts", "idempotent-consumers", "exactly-once-is-a-story", "designing-an-idempotent-payment"] }
- { id: "messaging-foundations",  order: 52, title: "Queues and Logs",                         tagline: "RabbitMQ and Kafka are not the same shape, and the difference is the answer.", estimatedMinutes: 35, prerequisites: ["service-boundaries"],
    chapters: ["queue-vs-log", "point-to-point-vs-pubsub", "rabbitmq-model", "kafka-model", "choosing-between-them", "when-not-to-use-a-broker", "back-pressure"] }
- { id: "kafka-mechanics",        order: 53, title: "Kafka Mechanics",                         tagline: "Partitions, groups, offsets, rebalancing.", estimatedMinutes: 50, prerequisites: ["messaging-foundations"], docHub: { title: "Kafka Documentation", path: "/#design" },
    chapters: ["topics-partitions-replicas", "producer-acks-and-durability", "keys-and-ordering", "consumer-groups-and-assignment", "offset-management", "rebalancing-and-how-to-avoid-storms", "consumer-lag", "retention-and-compaction", "spring-kafka-listeners"] }
- { id: "delivery-and-outbox",    order: 54, title: "Delivery Semantics and the Outbox",       tagline: "Why writing to the database and publishing an event is a distributed transaction.", estimatedMinutes: 40, prerequisites: ["kafka-mechanics", "idempotency"],
    chapters: ["at-most-once-at-least-once-exactly-once", "the-dual-write-problem", "transactional-outbox", "cdc-and-debezium", "idempotent-and-transactional-producers", "retry-and-dead-letter-topics", "poison-messages", "ordering-under-retry"] }
- { id: "saga-and-consistency",   order: 55, title: "Sagas and Eventual Consistency",          tagline: "Compensation instead of rollback.", estimatedMinutes: 45, prerequisites: ["delivery-and-outbox"],
    chapters: ["why-not-two-phase-commit", "saga-definition", "choreography", "orchestration", "compensating-transactions", "semantic-locks-and-pivot-steps", "eventual-consistency-in-a-ui", "designing-an-order-saga"] }
- { id: "caching-strategies",     order: 56, title: "Caching",                                 tagline: "Cache-aside, invalidation, stampede — and the two hard problems joke, defended.", estimatedMinutes: 40, prerequisites: ["second-level-cache"],
    chapters: ["why-cache", "cache-aside", "write-through-and-write-behind", "ttl-and-eviction-policies", "cache-stampede-and-mitigations", "redis-data-structures", "distributed-locks-and-their-caveats", "cache-invalidation-strategies", "caching-in-spring"] }
- { id: "scaling-data",           order: 57, title: "Scaling Data",                            tagline: "Replication, sharding, consistent hashing, CAP as a forced choice.", estimatedMinutes: 45, prerequisites: ["schema-and-scale", "caching-strategies"],
    chapters: ["vertical-vs-horizontal", "replication-and-lag", "read-your-writes", "sharding-strategies", "consistent-hashing", "hot-partitions", "cap-theorem-properly", "pacelc", "quorum-reads-and-writes"] }
- { id: "platform-concerns",      order: 58, title: "The Platform Around the Services",        tagline: "Gateway, discovery, config, tracing — the parts nobody owns until they break.", estimatedMinutes: 35, prerequisites: ["scaling-data"],
    chapters: ["api-gateway-responsibilities", "service-discovery", "client-vs-server-side-load-balancing", "centralised-configuration", "distributed-tracing-context", "service-mesh-in-outline", "multi-region-in-outline"] }
```

## 5.7 Track 7 — `production` (indigo) — 8 modules, +2 in §5.9

```yaml
- { id: "testing-pyramid",        order: 59, title: "What to Test, and Where",                 tagline: "The pyramid, and the honest version of it.", estimatedMinutes: 35, prerequisites: ["rest-api-design"],
    chapters: ["unit-integration-e2e", "junit5-essentials", "mockito-and-what-to-mock", "what-not-to-mock", "test-naming-and-arrangement", "parameterised-tests", "flaky-tests-and-their-causes"] }
- { id: "testing-spring",         order: 60, title: "Testing a Spring Boot Application",       tagline: "Slices, Testcontainers, and the transaction that hides your bug.", estimatedMinutes: 45, prerequisites: ["testing-pyramid", "spring-transactional"], docHub: { title: "Testing", path: "/testing.html" },
    chapters: ["springboottest-vs-slices", "webmvctest", "datajpatest", "mockitobean-vs-mock", "test-context-caching", "testcontainers", "transactional-tests-and-rollback", "testing-security", "testing-kafka-consumers"] }
- { id: "actuator-and-health",    order: 61, title: "Actuator and Health",                     tagline: "What to expose, and what liveness must never check.", estimatedMinutes: 30, prerequisites: ["application-lifecycle"], docHub: { title: "Actuator", path: "/actuator.html" },
    chapters: ["actuator-endpoints", "securing-actuator", "health-indicators", "liveness-vs-readiness", "custom-health-indicator", "info-and-build-metadata", "startup-probe-and-slow-boot"] }
- { id: "metrics-and-tracing",    order: 62, title: "Metrics, Traces and Correlation",         tagline: "The three signals, and the one question each answers.", estimatedMinutes: 40, prerequisites: ["actuator-and-health"],
    chapters: ["metrics-logs-traces", "micrometer-and-meter-types", "useful-service-metrics", "red-and-use-methods", "prometheus-and-cardinality", "opentelemetry-and-context-propagation", "correlation-ids", "sampling"] }
- { id: "logging-well",           order: 63, title: "Logging Well",                            tagline: "Structured, levelled, and free of the things that get you fined.", estimatedMinutes: 25, prerequisites: ["metrics-and-tracing"],
    chapters: ["levels-and-when-to-use-them", "structured-logging", "mdc-and-request-context", "what-never-to-log", "log-volume-and-cost", "logging-exceptions-once"] }
- { id: "containers-and-k8s",     order: 64, title: "Containers and Kubernetes",               tagline: "Enough to answer the deployment questions honestly.", estimatedMinutes: 45, prerequisites: ["actuator-and-health", "jvm-diagnostics"],
    chapters: ["dockerfile-for-a-spring-boot-app", "layered-jars-and-build-cache", "jvm-flags-in-a-container", "requests-limits-and-oomkilled", "deployments-and-rolling-updates", "probes-wired-to-actuator", "configmaps-and-secrets", "graceful-shutdown-and-sigterm", "horizontal-pod-autoscaling"] }
- { id: "performance-tuning",     order: 65, title: "Finding a Slow Endpoint",                 tagline: "The method, not the tricks.", estimatedMinutes: 45, prerequisites: ["containers-and-k8s", "fetching-and-n-plus-one"],
    chapters: ["measure-before-you-guess", "latency-percentiles", "the-usual-suspects", "database-first", "thread-pool-and-connection-pool-saturation", "serialization-cost", "load-testing", "capacity-estimation", "a-worked-investigation"] }
- { id: "release-and-incidents",  order: 66, title: "Releasing and Recovering",                tagline: "CI/CD, rollback, and how to talk about an outage.", estimatedMinutes: 35, prerequisites: ["performance-tuning"],
    chapters: ["pipeline-stages", "artifact-and-image-promotion", "blue-green-and-canary", "feature-flags", "backward-compatible-releases", "rollback-vs-roll-forward", "on-call-and-runbooks", "postmortems-and-the-interview-answer"] }
```

## 5.8 Track 8 — `craft` (teal)

Seven modules, **deliberately not contiguous in the reading order**. Patterns and
architecture land early, because everything after them is easier to read once you
have the vocabulary. DDD, CQRS and event sourcing land late, after sagas, because
they only make sense once you have felt the problem they solve.

```yaml
- { id: "solid-and-ood",          track: "craft", after: "enums-and-nested-types", title: "SOLID and Object-Oriented Design", tagline: "The vocabulary your LLD round is graded in.", estimatedMinutes: 40, prerequisites: ["inheritance-and-interfaces"],
    chapters: ["what-ood-is-for", "single-responsibility", "open-closed", "liskov-substitution", "interface-segregation", "dependency-inversion", "solid-applied-to-a-real-class", "when-solid-becomes-cargo-cult", "cohesion-and-coupling"] }

- { id: "patterns-that-get-asked", track: "craft", after: "solid-and-ood", title: "The Patterns That Get Asked", tagline: "Nine of the twenty-three, and honestly about the rest.", estimatedMinutes: 50, prerequisites: ["solid-and-ood"],
    chapters: ["singleton-and-its-problems", "factory-and-abstract-factory", "builder", "strategy", "template-method", "observer", "decorator", "adapter-and-facade", "proxy", "chain-of-responsibility", "choosing-a-pattern", "pattern-as-an-anti-pattern"] }

- { id: "lld-method",             track: "craft", after: "patterns-that-get-asked", title: "The LLD Method", tagline: "Spec to classes in twenty minutes, repeatably.", estimatedMinutes: 40, prerequisites: ["patterns-that-get-asked"],
    chapters: ["clarify-before-you-design", "finding-the-entities", "responsibilities-and-interfaces", "modelling-state-machines", "where-the-concurrency-is", "designing-for-the-clock", "what-to-cut-when-time-runs-out", "a-worked-example-parking-lot"] }

- { id: "patterns-in-spring",     track: "craft", after: "autoconfiguration", title: "The Patterns Spring Uses", tagline: "A stock question with a better answer than 'singleton and factory'.", estimatedMinutes: 35, prerequisites: ["patterns-that-get-asked", "aop-and-proxies"],
    chapters: ["dependency-injection-as-a-pattern", "factory-in-beanfactory", "singleton-scope-is-not-the-singleton-pattern", "template-method-in-the-templates", "proxy-in-aop", "observer-in-application-events", "adapter-in-handleradapter", "front-controller-in-dispatcherservlet", "answering-this-question-well"] }

- { id: "application-architecture", track: "craft", after: "patterns-in-spring", title: "Structuring a Spring Boot Application", tagline: "'How do you structure a project?' — asked constantly, answered badly.", estimatedMinutes: 45, prerequisites: ["patterns-in-spring"],
    chapters: ["package-by-layer", "package-by-feature", "why-package-by-feature-usually-wins", "hexagonal-architecture", "clean-architecture-layers", "ports-and-adapters-in-spring", "dto-vs-entity", "mapping-and-mapstruct", "the-anemic-domain-model-debate", "when-clean-architecture-is-overkill", "enforcing-structure-with-archunit"] }

- { id: "ddd-tactical",           track: "craft", after: "service-boundaries", title: "Domain-Driven Design, Tactically", tagline: "Bounded contexts and aggregates, as decomposition tools rather than jargon.", estimatedMinutes: 45, prerequisites: ["application-architecture", "service-boundaries"],
    chapters: ["ubiquitous-language", "bounded-context", "context-mapping", "entity-vs-value-object", "aggregate-and-aggregate-root", "aggregate-boundaries-and-transactions", "repositories-and-factories", "domain-events", "ddd-without-the-ceremony"] }

- { id: "cqrs-and-event-sourcing", track: "craft", after: "saga-and-consistency", title: "CQRS and Event Sourcing", tagline: "Two ideas usually confused for one, and neither is a default.", estimatedMinutes: 45, prerequisites: ["ddd-tactical", "saga-and-consistency"],
    chapters: ["cqrs-defined", "cqrs-without-event-sourcing", "read-models-and-projections", "eventual-consistency-in-the-read-side", "event-sourcing-defined", "event-store-and-replay", "snapshots", "schema-evolution-of-events", "when-not-to-event-source", "answering-cqrs-in-an-interview"] }
```

## 5.9 Insertions into tracks 1–7

Ten more modules that the gap audit (§2.5) found, placed by `after:` rather than
by number.

**`java-platform` (six):**

```yaml
- { id: "strings-and-text",       track: "java-platform", after: "objects-and-contracts", title: "Strings", tagline: "The pool, the builder, and the loop that allocates a thousand objects.", estimatedMinutes: 30, prerequisites: ["objects-and-contracts"],
    chapters: ["string-immutability", "the-string-pool", "intern-and-when-not-to", "stringbuilder-vs-stringbuffer", "concatenation-and-what-the-compiler-does", "compact-strings", "switch-on-string", "formatting-and-locale", "string-comparison-traps"] }

- { id: "enums-and-nested-types", track: "java-platform", after: "inheritance-and-interfaces", title: "Enums and Nested Types", tagline: "Two small features with disproportionate interview surface.", estimatedMinutes: 35, prerequisites: ["inheritance-and-interfaces"],
    chapters: ["enum-internals", "enums-with-behaviour", "enummap-and-enumset", "ordinal-is-a-trap", "enum-as-a-singleton", "static-nested-vs-inner", "the-outer-reference-and-its-leak", "anonymous-classes-vs-lambdas", "effectively-final-capture"] }

- { id: "locks-and-synchronizers", track: "java-platform", after: "threads-and-memory-model", title: "Locks and Synchronizers", tagline: "Everything in java.util.concurrent.locks, and when each one is the answer.", estimatedMinutes: 45, prerequisites: ["threads-and-memory-model"],
    chapters: ["reentrantlock-vs-synchronized", "fairness", "trylock-and-timeouts", "readwritelock", "stampedlock", "countdownlatch", "cyclicbarrier", "semaphore", "phaser-in-outline", "abstractqueuedsynchronizer", "forkjoinpool-and-work-stealing", "choosing-a-synchronizer"] }

- { id: "dates-and-times",        track: "java-platform", after: "modern-java", title: "Dates, Times and Zones", tagline: "The API is fine. The reasoning about zones is what fails.", estimatedMinutes: 35, prerequisites: ["modern-java"],
    chapters: ["why-date-and-calendar-were-replaced", "localdate-localdatetime-instant", "zoneddatetime-and-offsetdatetime", "choosing-the-right-type", "duration-vs-period", "formatting-and-parsing", "dst-and-the-hour-that-happens-twice", "storing-time-in-a-database", "time-in-tests"] }

- { id: "io-and-serialization",   track: "java-platform", after: "dates-and-times", title: "I/O, NIO and Serialization", tagline: "Including the feature the JDK team wishes it could remove.", estimatedMinutes: 45, prerequisites: ["exceptions-and-failure"],
    chapters: ["byte-vs-character-streams", "buffering-and-why-it-matters", "files-and-path", "nio-channels-and-buffers", "memory-mapped-files", "streaming-a-large-file-without-oom", "serializable-and-serialversionuid", "transient-and-what-is-not-written", "externalizable-and-custom-readobject", "why-java-serialization-is-a-security-hazard", "what-to-use-instead"] }

- { id: "reflection-and-annotations", track: "java-platform", after: "io-and-serialization", title: "Reflection, Annotations and Code Generation", tagline: "How Spring does what it does, and what Lombok is really doing.", estimatedMinutes: 40, prerequisites: ["generics-and-erasure"],
    chapters: ["reflection-basics", "what-reflection-costs", "how-spring-uses-reflection", "writing-a-custom-annotation", "retention-and-target", "annotation-processors", "lombok-what-it-generates", "lombok-data-on-a-jpa-entity", "mapstruct-vs-runtime-mappers"] }
```

**`web-api` (one):**

```yaml
- { id: "api-styles",             track: "web-api", after: "rest-api-design", title: "REST, gRPC, GraphQL and Push", tagline: "Four API styles, and the question is always 'for what'.", estimatedMinutes: 45, prerequisites: ["rest-api-design"],
    chapters: ["choosing-an-api-style", "grpc-and-protobuf", "grpc-streaming-modes", "grpc-in-spring", "graphql-basics", "graphql-over-and-under-fetching", "graphql-n-plus-one-and-dataloader", "websockets", "server-sent-events", "polling-vs-push", "versioning-across-styles"] }
```

**`persistence` (one):**

```yaml
- { id: "nosql-stores",           track: "persistence", after: "schema-and-scale", title: "NoSQL and Polyglot Persistence", tagline: "When not relational — and the cost of the answer 'both'.", estimatedMinutes: 45, prerequisites: ["schema-and-scale"],
    chapters: ["the-store-families", "document-modelling", "embed-vs-reference", "mongodb-indexes-and-queries", "spring-data-mongodb", "redis-as-a-data-store", "redis-persistence-and-eviction", "inverted-index-and-elasticsearch", "keeping-a-search-index-in-sync", "polyglot-persistence-and-its-cost", "choosing-a-store"] }
```

**`production` (two):**

```yaml
- { id: "build-and-dependencies", track: "production", after: "how-java-runs", title: "Building and Depending", tagline: "Maven's lifecycle, and the transitive dependency that broke production.", estimatedMinutes: 40, prerequisites: ["how-java-runs"],
    chapters: ["what-a-build-tool-does", "maven-lifecycle-phases-goals", "dependency-scopes", "transitive-dependencies", "nearest-wins-mediation", "reading-dependency-tree", "bom-and-dependencymanagement", "spring-boot-parent-vs-bom", "multi-module-projects", "maven-vs-gradle", "reproducible-builds", "vulnerability-scanning"] }

- { id: "cloud-for-java-services", track: "production", after: "containers-and-k8s", title: "Running on a Cloud", tagline: "The managed services a Java service actually touches.", estimatedMinutes: 40, prerequisites: ["containers-and-k8s"],
    chapters: ["managed-vs-self-hosted", "object-storage-and-presigned-urls", "managed-queues-and-topics", "managed-relational-databases", "containers-vs-serverless-for-java", "java-cold-starts-and-mitigations", "graalvm-native-image", "secrets-and-parameter-stores", "iam-and-least-privilege", "cost-as-a-design-input", "portability-vs-managed-convenience"] }
```

> `cloud-for-java-services` is written **cloud-agnostic first, with AWS named
> as the worked example**, because AWS is what most Java job descriptions name
> and a candidate is asked "how would you do this on AWS", not "describe IaaS".
> Every chapter states the concept, then the AWS service that implements it,
> then the Azure/GCP equivalent in one line. No chapter is an AWS tutorial.

## 5.10 The ordering rule

Parts 5.1–5.7 carry explicit `order:` numbers; Parts 5.8–5.9 carry `after:`
instead. **Neither is the source of truth — the sequence is.**

Before Phase 3 begins, walk the combined sequence once and assign `order` as its
1-based index. Do it in a single pass, commit the result, and treat the numbers
as generated from then on. The reason this is safe rather than sloppy:
`validate-theory.js` already refuses a prerequisite that resolves to a higher
`order`, so a mis-numbered pass fails the build instead of silently teaching
things in the wrong sequence.

**Eighty-three modules, 687 chapters.** Two things follow: the corpus is
authored over phases (Part 8), and `validate-nav.js` totals are updated in the
same commit as the content, by hand, every time.

**And a third thing follows, which is the honest one:** that is more than one
person authors well in a single push. §8.1 defines a minimum viable deck that is
genuinely useful at about a third of it.

## 5.11 The resolved sequence

The single pass §5.10 calls for, **run once and now generated rather than
authored**. Each module keeps the number below for the life of the project;
Phase 7 fills the gaps that tracks 5–8 and the §5.9 insertions left in the
Phase 3 numbering rather than renumbering anything.

Two facts fell out of the pass and both are checks on it: the sequence is
**83 modules and 687 chapters**, which is what §5.10 states independently, and
every prerequisite in §5.1–5.9 resolves to a strictly lower number, which is
what `validate-theory.js` will refuse to let drift.

The gaps in the Phase 3 numbering are not a mistake to tidy up later. A module
authored in Phase 3 sits at its FINAL position in the reading path, so a reader
working through track 1 in Phase 3 is reading it in the same order they will
read it once the other forty-two modules exist. Renumbering later would silently
invalidate every prerequisite already checked.

```
ord  track          module id
  1 java-platform  how-java-runs
  2 production     build-and-dependencies
  3 java-platform  objects-and-contracts
  4 java-platform  strings-and-text
  5 java-platform  inheritance-and-interfaces
  6 java-platform  enums-and-nested-types
  7 craft          solid-and-ood
  8 craft          patterns-that-get-asked
  9 craft          lld-method
 10 java-platform  exceptions-and-failure
 11 java-platform  generics-and-erasure
 12 java-platform  collections-choosing
 13 java-platform  hashmap-internals
 14 java-platform  streams-and-lambdas
 15 java-platform  modern-java
 16 java-platform  dates-and-times
 17 java-platform  io-and-serialization
 18 java-platform  reflection-and-annotations
 19 java-platform  threads-and-memory-model
 20 java-platform  locks-and-synchronizers
 21 java-platform  executors-and-futures
 22 java-platform  virtual-threads
 23 java-platform  heap-and-gc
 24 java-platform  jvm-diagnostics
 25 spring-core    ioc-and-the-container
 26 spring-core    wiring-beans
 27 spring-core    configuration-and-profiles
 28 spring-core    aop-and-proxies
 29 spring-core    autoconfiguration
 30 craft          patterns-in-spring
 31 craft          application-architecture
 32 spring-core    application-lifecycle
 33 spring-core    spring-generations
 34 web-api        http-foundations
 35 web-api        dispatcher-lifecycle
 36 web-api        rest-api-design
 37 web-api        api-styles
 38 web-api        validation-and-errors
 39 web-api        serialization
 40 web-api        async-and-scheduling
 41 web-api        reactive-and-webflux
 42 persistence    relational-foundations
 43 persistence    sql-you-are-asked
 44 persistence    indexes-and-plans
 45 persistence    transactions-and-isolation
 46 persistence    locking-and-deadlocks
 47 persistence    jdbc-and-pooling
 48 persistence    jpa-mapping
 49 persistence    persistence-context
 50 persistence    fetching-and-n-plus-one
 51 persistence    spring-transactional
 52 persistence    spring-data-jpa
 53 persistence    second-level-cache
 54 persistence    schema-and-scale
 55 persistence    nosql-stores
 56 security       auth-foundations
 57 security       security-filter-chain
 58 security       jwt-in-practice
 59 security       oauth2-and-oidc
 60 security       method-security
 61 security       api-hardening
 62 distributed    service-boundaries
 63 craft          ddd-tactical
 64 distributed    sync-communication
 65 distributed    resilience-patterns
 66 distributed    idempotency
 67 distributed    messaging-foundations
 68 distributed    kafka-mechanics
 69 distributed    delivery-and-outbox
 70 distributed    saga-and-consistency
 71 craft          cqrs-and-event-sourcing
 72 distributed    caching-strategies
 73 distributed    scaling-data
 74 distributed    platform-concerns
 75 production     testing-pyramid
 76 production     testing-spring
 77 production     actuator-and-health
 78 production     metrics-and-tracing
 79 production     logging-well
 80 production     containers-and-k8s
 81 production     cloud-for-java-services
 82 production     performance-tuning
 83 production     release-and-incidents
```

**Phase 3 authors 41 of these — the ones in tracks 1–4 that are not §5.9
insertions — for 318 chapters.** The insertions (`strings-and-text`,
`enums-and-nested-types`, `locks-and-synchronizers`, `dates-and-times`,
`io-and-serialization`, `reflection-and-annotations`, `api-styles`,
`nosql-stores`) belong to tracks 1–4 by `track` but to Phase 7 by §8, and
they are the reason track 1 runs 1 → 24 with only fourteen modules in it.

---

# PART 6 — The drill catalogue (Synthesis mode)

Forty-six drills. **This list lives in `tools/validate-theory.js`, not in the
corpus** — an id outside the list is an error, a duplicate is an error, an
unwritten id is a warning. Adding a drill means adding its id here first.

Drills live as `drill` blocks inside modules of the `synthesis` track. Their
`sketch` is collapsed on creation: reading the answer before attempting is the
one way to get nothing out of it.

## 6.1 Tier 1 — machine coding builds (90–120 min)

Round 2. Graded on: does it run, are the class boundaries sane, are edge cases
handled, is there a driver or a test, did you finish.

```yaml
tier1:
  - drill-splitwise-expense-api        # 120m — balances, settle-up, groups
  - drill-parking-lot-service          # 90m  — pricing strategies, allocation
  - drill-movie-ticket-booking         # 120m — seat hold, expiry, double-booking
  - drill-inventory-reservation        # 90m  — optimistic locking under contention
  - drill-url-shortener-service        # 90m  — encoding, collision, custom alias
  - drill-in-memory-kv-with-ttl        # 90m  — expiry, eviction, thread safety
  - drill-lru-cache-custom-eviction    # 90m  — the named classic; O(1) get and put
  - drill-ride-matching-service        # 120m — matching, state machine, cancellation
```

Every tier-1 drill's `watchFor` must include, verbatim across all eight:
*"No interface for the thing that will vary"*, *"Business rules inside the
controller"*, *"Concurrency ignored on the one operation that has contention"*,
*"No test or driver — the interviewer cannot see it work"*, *"Ran out of time
because the schema was designed for ten minutes"*.

## 6.2 Tier 2 — HLD design exercises (45 min)

Round 4. Graded on: did you clarify scope, did you estimate, did you name the
bottleneck, did you choose and defend a trade-off.

```yaml
tier2:
  - drill-design-url-shortener-at-scale
  - drill-design-rate-limiter-distributed
  - drill-design-notification-service
  - drill-design-payment-ledger
  - drill-design-job-scheduler
  - drill-design-order-fulfilment-saga
  - drill-design-audit-log
  - drill-design-multi-tenant-saas-api
  - drill-design-file-upload-and-processing
  - drill-design-search-and-autocomplete
  - drill-design-cqrs-read-model
  - drill-design-a-service-decomposition   # DDD boundaries from a monolith
```

## 6.3 Tier 3 — focused implementation (20–45 min)

```yaml
tier3:
  - drill-controlleradvice-error-shape
  - drill-custom-bean-validator
  - drill-http-client-with-timeout-retry
  - drill-idempotency-key-filter
  - drill-testcontainers-integration-test
  - drill-flyway-non-null-column-live
  - drill-custom-health-indicator
  - drill-correlation-id-interceptor
  - drill-kafka-consumer-with-dlq
  - drill-cache-aside-with-stampede-guard
  - drill-jwt-resource-server-config
  - drill-pagination-with-join-fetch
  - drill-grpc-service-from-a-proto
  - drill-mongo-document-model
  - drill-hexagonal-slice-of-a-feature
```

## 6.4 Tier 4 — debug, review, extend (20–40 min)

The round-5 material, and the most under-practised category.

```yaml
tier4:
  - drill-debug-connection-pool-exhaustion
  - drill-find-the-n-plus-one
  - drill-review-a-controller            # eight planted defects
  - drill-diagnose-from-heap-histogram
  - drill-fix-broken-transactional
  - drill-read-an-explain-plan
  - drill-kafka-rebalance-storm
  - drill-explain-your-own-architecture  # résumé defence, structured
  - drill-resolve-a-dependency-conflict  # mvn dependency:tree, nearest-wins
  - drill-refactor-a-god-service         # SOLID applied to 600 lines
  - drill-fix-a-serialization-break      # serialVersionUID across a deploy
```

Tier→token mapping is delta D6: tiers 1 and 2 render at `--tier-must-*`, tier 3
at `--tier-should-*`, tier 4 at `--tier-good-*`.

Counts: tier 1 = 8, tier 2 = 12, tier 3 = 15, tier 4 = 11. **Forty-six.**

---

# PART 7 — The predict catalogue (Predict the Output)

Eighty-one snippets across eleven sets. **Also held in the validator.** Each set
is a module of the `output` track, so the mode's sidebar (`sets`) lists them and
"next" crosses a set boundary as an ordered sequence.

Every entry declares an `artefact` (delta D2). Only `predict-java-core`,
`predict-collections`, `predict-streams`, `predict-concurrency` and
`predict-io-and-time` are `artefact: 'stdout'` — those are real Java programs re-executed by
`tools/run-snippets.js`. Everything else declares `trace` plus a `verification`
string.

```yaml
predict_catalogue:

  predict-java-core:            # artefact: stdout
    - string-literal-vs-new-identity
    - integer-cache-boundary
    - autoboxing-npe-in-ternary
    - finally-overrides-return
    - static-and-instance-init-order
    - static-method-hiding
    - integer-overflow-in-a-loop
    - char-plus-int-arithmetic
    - string-concat-in-a-loop-identity
    - varargs-vs-array-overload

  predict-collections:          # artefact: stdout
    - mutable-key-lost-in-hashset
    - arrays-aslist-add-throws
    - list-of-null-throws
    - sublist-is-a-view
    - treemap-with-inconsistent-comparator
    - concurrentmodificationexception
    - hashset-of-records-vs-classes

  predict-streams:              # artefact: stdout
    - peek-without-terminal-operation
    - stream-reused-throws
    - collectors-tomap-duplicate-key
    - optional-orelse-evaluates-eagerly
    - parallel-stream-shared-mutable-state
    - flatmap-ordering
    - findfirst-vs-findany-parallel

  predict-concurrency:          # artefact: stdout
    - visibility-without-volatile
    - non-atomic-increment
    - executor-not-shut-down-hangs-jvm
    - completablefuture-swallows-exception
    - virtual-thread-pinned-by-synchronized
    - threadlocal-leak-in-a-pool
    - double-checked-locking-without-volatile
    - countdownlatch-await-never-returns
    - reentrantlock-not-released-in-finally
    - forkjoin-blocking-task-starves-the-pool

  predict-io-and-time:          # artefact: stdout
    - serialversionuid-mismatch-throws
    - transient-field-after-round-trip
    - enum-ordinal-after-a-reorder
    - inner-class-holds-the-outer-instance
    - string-intern-identity
    - localdate-vs-instant-across-a-zone
    - duration-vs-period-across-dst
    - try-with-resources-close-order

  predict-spring:               # artefact: behaviour
    - transactional-self-invocation-no-rollback
    - checked-exception-does-not-roll-back
    - async-self-invocation-runs-inline
    - prototype-injected-into-singleton
    - property-precedence-which-wins
    - relaxed-binding-which-key-matches
    - constructor-injection-circular-fails
    - postconstruct-vs-afterpropertiesset-order
    - conditionalonmissingbean-ordering

  predict-jpa:                  # artefact: query-count / behaviour
    - how-many-queries-does-this-fire      # query-count
    - lazyinitializationexception-boundary # behaviour
    - entity-equals-breaks-in-a-hashset    # behaviour
    - dirty-checking-writes-without-save   # query-count
    - readonly-transaction-still-flushes   # behaviour
    - cascade-remove-orphan-difference     # query-count
    - first-level-cache-returns-same-instance # behaviour
    - join-fetch-with-pagination-warning   # behaviour

  predict-sql:                  # artefact: sql-result
    - left-join-killed-by-where
    - not-in-with-null
    - count-star-vs-count-column
    - group-by-without-aggregate
    - index-unused-because-of-a-function
    - order-by-with-limit-and-ties
    - update-without-where-in-a-transaction

  predict-http-security:        # artefact: http-response
    - cors-preflight-rejected
    - filter-order-changes-the-status
    - csrf-blocks-a-stateless-post
    - 401-vs-403-which-one
    - validation-failure-response-shape
    - content-type-mismatch-415

  predict-kafka:                # artefact: behaviour
    - ordering-across-partitions
    - rebalance-during-processing
    - manual-commit-before-processing
    - duplicate-after-retry

  predict-build-and-config:     # artefact: behaviour
    - which-transitive-version-wins        # nearest-wins mediation
    - test-scope-leaks-into-runtime
    - bom-vs-explicit-version
    - profile-not-active-why
    - lombok-data-on-an-entity-breaks-a-hashset
```

**Authoring rule for options.** The blueprint recommends four options so a
verdict is earned rather than self-reported. The work is the three *plausible*
wrong answers. For this subject the plausible wrong answer is almost always
**"what would happen if the proxy were not there"**, **"what a developer who has
only read the happy path expects"**, or **"the right answer for the previous
major version"**. Author one set at a time; a set with obviously-wrong
distractors is worse than no set.

---

# PART 8 — Build phases

The blueprint's §14 phases, with the content-authoring work made explicit and
sized. Each phase ends with a green validator run and a commit. **Do not start a
phase until the previous gate passes.**

§8.1 defines the **minimum viable deck** — the subset worth building before
anything else. Phases 0–5 build it; phases 6–10 fill the rest, each ending
green. Ship after Phase 5.

## 8.1 The minimum viable deck

~853 questions, 687 chapters, 46 drills and 81 snippets is close to a year of
authoring if it is done well — and a corpus done badly is worth less than a
smaller one done properly. The subset below is chosen by a single test: **if a
candidate knew only this, would they survive round 3 and round 2 at a product
company?** It is roughly a third of the full corpus.

**Question topics (10 of 26):** `java-language`, `collections`, `concurrency`,
`spring-core`, `spring-boot`, `aop-proxies`, `rest-api`, `jpa-hibernate`,
`transactions`, `sql-databases`. ~355 questions.

**Theory modules (28 of 83), in sequence:** `objects-and-contracts`,
`inheritance-and-interfaces`, `generics-and-erasure`, `collections-choosing`,
`hashmap-internals`, `streams-and-lambdas`, `threads-and-memory-model`,
`executors-and-futures`, `virtual-threads`, `heap-and-gc`, `solid-and-ood`,
`ioc-and-the-container`, `wiring-beans`, `configuration-and-profiles`,
`aop-and-proxies`, `autoconfiguration`, `spring-generations`,
`dispatcher-lifecycle`, `rest-api-design`, `validation-and-errors`,
`sql-you-are-asked`, `indexes-and-plans`, `transactions-and-isolation`,
`jdbc-and-pooling`, `jpa-mapping`, `persistence-context`,
`fetching-and-n-plus-one`, `spring-transactional`. ~230 chapters.

**Drills (14):** all 8 of tier 1, plus tier 4's
`drill-debug-connection-pool-exhaustion`, `drill-find-the-n-plus-one`,
`drill-review-a-controller`, `drill-fix-broken-transactional`,
`drill-read-an-explain-plan`, `drill-explain-your-own-architecture`.

**Predict sets (5):** the four original `stdout` sets plus `predict-spring` —
the runnable ones, because they are the ones the toolchain can prove, and the
one that catches the trap most candidates fail.

`solid-and-ood` is the only `craft` module in the minimum set. It is there
because the tier-1 drills are graded in its vocabulary, and a drill whose
grading criteria the deck never taught is a drill you cannot learn from.

Everything outside that list is real and gets authored eventually. Nothing
outside it blocks a shippable deck.

### Phase 0 — Skeleton
`index.html`, six stylesheets with the full token layer plus `print.css` (D4),
`theme.js`, `three-bg.js`, `dev-server.js`, `.claude/launch.json`, `CLAUDE.md`.
One placeholder topic with three questions.
**Gate:** renders in both themes; `grep -nE '#[0-9a-fA-F]{3,8}\b|rgba?\(' css/*.css | grep -v themes.css` returns nothing; the print stylesheet produces a readable page from `Ctrl-P`.

### Phase 1 — The tool chain, before the corpus
`tools/load-corpus.js`, `schema.js`, `validate-questions.js`. Write the
validator against three questions.
**Gate:** `node tools/validate-questions.js` exits 0, and exits non-zero when
you break a question on purpose — check all seven rules individually.

### Phase 2 — The question bank, core half
Topics `java-language`, `collections`, `concurrency`, `spring-core`,
`spring-boot`, `rest-api`, `jpa-hibernate`, `transactions`, `sql-databases`.
Plus `data/index.js`, `topicTracks`, `app.js`, `navigation.js`,
`components.css`, `code-highlight.js` (java, sql, yaml, properties, xml, bash,
json, http, dockerfile), `diagrams.js`, `progress.js`.
**Target: ~355 questions.**
**Gate:** every topic renders; tier filter and progress work; validator green.

### Phase 3 — Theory, tracks 1–4
Modules 1–41 (`java-platform`, `spring-core`, `web-api`, `persistence`),
`data/theory/index.js`, `theory.js` with all **twelve** block renderers
including `version` (D1), `theory.css`, `validate-theory.js` including
`relatedQuestions` resolution.
**Target: ~320 chapters.**
**Gate:** both validators green; every `relatedQuestions` reference resolves;
every module listed in the version-block list carries one.

### Phase 4 — The rail and the five modes
`data/modes.js`, `rail.js`, `sidebar.js`, `synthesis.js`, `predict.js`,
`glossary.js` (with the `ANNOTATION` chip, D5), `rail.css`, `validate-nav.js`
with the hard totals. Author **tier-1 and tier-4 drills** and the four
**`stdout` predict sets** first — they are the ones the runner can verify.
**Gate:** all three validators green; every legacy bare-segment link normalises;
digits 1–5 switch modes; each mode counts its own noun; no function sums them.

### Phase 5 — Search, then ship
`search.js` across both corpora, grouped by mode.
**Gate:** a term from a `sql` code block finds its chapter; a question result
lands on an *expanded* card. **This is the first shippable state.**

### Phase 6 — The question bank, remaining topics
`streams-functional`, `jvm-memory`, `java-io-time`, `beyond-rest`,
`design-patterns`, `architecture-ddd`, `spring-security`, `microservices`,
`kafka-messaging`, `caching-scale`, `nosql`, `testing`, `observability-ops`,
`build-tools`, `cloud`, `behavioural-project`.
**Target: +~500 questions.** Update `EXPECTED_TOTALS.questions` by hand, in the
same commit as the content — every time, not once at the end of the phase.

### Phase 7 — Theory, tracks 5–8 and the §5.9 insertions
`security`, `distributed`, `production`, `craft`, plus the ten modules inserted
into tracks 1–7. Author `craft` **before** the §5.9 insertions:
`patterns-in-spring` and `application-architecture` are referenced by tier-1
drills that already exist by this point.
**Target: +~460 chapters.**

### Phase 8 — The drill and predict catalogues, completed
Tier-2 and tier-3 drills and the rest of tier 4; the six non-`stdout` predict
sets, each entry carrying its `verification` string. `predict-io-and-time` is
`stdout`, so author it earlier — in Phase 4, with the other runnable sets.

### Phase 9 — Verification
`check-doc-links.js`, `run-snippets.js --selftest` (with a deliberate negative),
vendored figures and `assets/img/README.md`, and **one manual link-reading pass
per documentation source** — the meta-refresh blind spot is real and only a
human finds it.
**Gate:** zero redirects; every `stdout` pane matches real output; every figure
carries `sourceTitle`/`sourceUrl`; findings written to
`docs/verification-log.md` including what was *not* checked.

**Phase 9 actual — PASSED, 2026-10-16.** Every criterion met, and the phase
was never blocked: the JDK it waited eight gates for was inside Android
Studio the whole time. 58/58 `stdout` claims execute and match against
OpenJDK 25, twice each. 762 distinct doc URLs, zero errors — 57 were broken
when the tool first ran, **four of them meta-refresh stubs**, which is the
blind spot this section names being caught mechanically rather than by a
human. The manual pass was done in two parts: every one of the 762 pages had
its `<title>` compared against the title the deck gives the link, which found
five links describing the wrong page, and the handful a machine cannot settle
were opened by hand. **Zero figures, and the empty directory is the decision
rather than the omission** — the contract for vendoring one is in
`assets/img/README.md`, and check 4 was exercised against a real PNG through
all six branches, which found the existence check was case-insensitive.
Findings, and the four things still unverified, in `docs/verification-log.md`.

### Phase 10 — Documentation and triage
`ARCHITECTURE.md`, `CODEBASE.md`, `FEATURES.md`, `README.md`, and one
`docs/triage/<topic-id>.md` per topic recording a single read of every question
against four judgements: *is it true*, *is it asked*, *is it at the right tier*,
*does it have a reference*.

**Phase 10 actual — PASSED, 2026-10-20.** All four documents written and 26
triage files carrying **486 table rows**, one per question. The row counts add
up to 486 and the 81 rows marked as having no reference agree exactly with
what the corpus reports, which is the only mechanical proof available that the
read happened and was recorded honestly.

**One answer was wrong** — `static-nested-vs-inner` stated unconditionally
that an inner class holds its enclosing instance — and the way it survived is
the finding rather than the fix: Phase 9 had found and corrected the identical
fact in a predict block two files away, because that one lived in a field a
tool reads and **nothing in this repository reads an answer**.

Four structural findings no validator could have produced: ten topics have no
subsections and render 148 questions as a flat list; `heap-and-gc` has nine
chapters and zero `relatedQuestions`, which with `streams-and-lambdas` missing
`streams-functional` accounts for 45 of the 80 uncited questions; the 81
missing references are concentrated rather than spread, with `aop-proxies` at
50% and sixteen topics at zero; and "has a reference" turns out not to mean
"is supported by a reference". Every topic's `keyTopics` is fully covered, 26
for 26. Summary in `docs/triage/SUMMARY.md`.

---

# PART 9 — Sourcing, licences and honesty

**Vendorable figures.** Only Kafka and PostgreSQL are unambiguously vendorable
today. Oracle's Java SE documentation is **not** — no figure from it enters the
repo, and its links are reference-only. Everything else in the manifest is
marked `verify` and must be resolved in Phase 9 with the finding written into
`assets/img/README.md`. Where a licence is unclear, treat it as forbidden.

**A figure has to earn its place.** For this subject the shapes that justify one
are: the JVM memory layout, the G1 heap region diagram, the Spring Security
filter chain, the DispatcherServlet sequence, Kafka's partition/consumer-group
topology, and a saga's compensation flow. Everything else — annotation tables,
propagation matrices, isolation-level grids — is a `table` or `comparison`
block, drawn by the app, in the app's theme, and searchable.

**Two claims this corpus must never make without checking.**

1. **An "Output" pane over Java that was not run.** `run-snippets.js` executes
   every `artefact: 'stdout'` snippet with single-file source launch. If a
   snippet cannot be run, its artefact is not `stdout`.
2. **A version statement without a version block.** "Spring Boot uses X" is a
   claim with a shelf life. Put it in a `version` block with the release it
   became true in, or do not write it.

**The known blind spots, to be recorded in `docs/verification-log.md` from
Phase 1 rather than discovered in Phase 9:**

- `check-doc-links.js` follows HTTP redirects but **cannot see an HTML
  meta-refresh**. Spring's documentation site restructured its URL scheme
  between the 2.x and 3.x reference layouts; stub pages are exactly the failure
  mode this misses. One manual pass per source, per phase that adds links.
- SQL predict answers are dialect-dependent. Every `artefact: 'sql-result'`
  entry names the engine and version it was checked against. Do not write
  "SQL"; write "PostgreSQL 16".
- Behavioural answers (`artefact: 'behaviour'`) cite the reference section they
  came from. A behaviour recalled from experience and not from the reference is
  marked as such in its `verification` string.

---

# PART 10 — The preparation plan

The deck is a tool; this is how it gets used. Two shapes, because the two
situations people are actually in are "I have a quarter" and "I have a
fortnight".

## 10.1 Where your time should go

Weighted by how much of a loop's outcome each area decides, for a 2–7 year
backend candidate at a product company. This is the same weighting the question
bank's tier assignments follow, so `?cram` produces a list in roughly these
proportions.

| Area | Share of prep time | Why |
|---|---|---|
| Machine coding / LLD practice | 18% | Round 2 is close to a gate, and it is the round least improved by reading. |
| Spring internals + `@Transactional` + JPA | 18% | Round 3's densest and most-failed section. |
| Core Java, collections, concurrency | 14% | Round 3's opener, and where "shallow" is detected. |
| SQL and the database | 11% | Asked in every loop, prepared for in almost none. |
| System design (HLD) | 11% | Round 4 at SDE-2+; zero at SDE-1. Reweight by your level. |
| Microservices, messaging, resilience | 9% | Round 3 and 4 both draw on it. |
| **Design, patterns and architecture** | 7% | SOLID and "how do you structure a project" are asked in nearly every loop and are cheap to fix. |
| DSA | 6% | **Practised outside the deck**, on a judge. Enough to clear round 1. |
| Production, observability, testing | 3% | Small but disproportionately impressive. |
| Build tools, cloud, NoSQL | 2% | Asked when the JD names them. Check the JD, then weight this. |
| Behavioural and résumé defence | 1% | Cheap to prepare, expensive to fail. |

Two notes on that table. **DSA is 6% and outside this deck** — it needs a judge
that runs your code against hidden tests, which a static site cannot be; use
the deck's overview page to say so and point elsewhere. And if you are
interviewing for SDE-1, move the 12% from HLD into machine coding and Core Java.

## 10.2 The fourteen-week plan (~10 h/week)

Each week: **four study days** (~75 min) and **one drill day** (~2 h). The
study day is one shape throughout — 40 min of Theory in reading order, 20 min of
Questions on the topic you just read, 15 min of one Predict set. The drill day
is one Synthesis drill, attempted before the sketch is opened.

| Week | Theory (modules) | Questions | Predict set | Drill |
|---|---|---|---|---|
| 1 | how Java runs, objects, strings, inheritance, enums & nested types, exceptions, generics | `java-language` | `predict-java-core` | T4 `drill-review-a-controller` |
| 2 | SOLID & OOD, the patterns that get asked, the LLD method | `design-patterns` | `predict-collections` | T1 `drill-parking-lot-service` |
| 3 | collections, HashMap internals, streams, modern Java, dates & times | `collections`, `streams-functional` | `predict-streams` | T3 `drill-controlleradvice-error-shape` |
| 4 | memory model, locks & synchronizers, executors, virtual threads | `concurrency` | `predict-concurrency` | T4 `drill-refactor-a-god-service` |
| 5 | heap & GC, JVM diagnostics, I/O & serialization, reflection & Lombok | `jvm-memory`, `java-io-time` | `predict-io-and-time` | T4 `drill-diagnose-from-heap-histogram` |
| 6 | container, wiring, config, AOP, auto-config, lifecycle, Boot 2→3→4 | `spring-core`, `spring-boot`, `aop-proxies` | `predict-spring` | T1 `drill-lru-cache-custom-eviction` |
| 7 | patterns in Spring, application architecture, build & dependencies | `architecture-ddd`, `build-tools` | `predict-build-and-config` | T3 `drill-hexagonal-slice-of-a-feature` |
| 8 | HTTP, dispatcher, REST design, validation, Jackson, API styles | `rest-api`, `beyond-rest` | `predict-http-security` | T3 `drill-idempotency-key-filter` |
| 9 | modelling, SQL, indexes, isolation, locking, pooling | `sql-databases` | `predict-sql` | T4 `drill-read-an-explain-plan` |
| 10 | JPA mapping, persistence context, N+1, `@Transactional`, Spring Data | `jpa-hibernate`, `transactions` | `predict-jpa` | T4 `drill-find-the-n-plus-one` |
| 11 | security, filter chain, JWT, OAuth2, hardening | `spring-security` | `predict-http-security` (2nd half) | T1 `drill-splitwise-expense-api` |
| 12 | boundaries, DDD, resilience, idempotency, Kafka, saga, CQRS | `microservices`, `kafka-messaging` | `predict-kafka` | T2 `drill-design-order-fulfilment-saga` |
| 13 | caching, scale, NoSQL, platform, cloud | `caching-scale`, `nosql`, `cloud` | re-run every wrong verdict | T2 `drill-design-rate-limiter-distributed` |
| 14 | testing, actuator, metrics, logging, containers, tuning, release | `testing`, `observability-ops`, `behavioural-project` | re-run every wrong verdict | T2 ×2 + T4 `drill-explain-your-own-architecture` |

Modules not given a slot — `async-and-scheduling`, `reactive-and-webflux`,
`second-level-cache`, `schema-and-scale`, `logging-well` — are `should-know` and
read in the gaps. If you are short of time, cut week 13 before anything else:
NoSQL and cloud are only worth their slot if the job description names them.

**Running through all fourteen weeks, outside the deck:** three DSA problems a
week on a judge. Arrays/strings, hashing, two pointers, sliding window, stacks,
binary search, trees, heaps, graphs BFS/DFS, and basic DP. That is the round-1
surface area, and it is ~36 problems, not 500.

## 10.3 The three-week crash plan

For a loop already scheduled. Uses `?cram` throughout — must-know only.

**Week 1 — the framework you claim to know.**
Theory: the `spring-core` track and `jdbc-and-pooling` → `spring-transactional`
in `?cram`. Questions: `spring-core`,
`spring-boot`, `aop-proxies`, `jpa-hibernate`, `transactions`. Predict sets
`predict-spring` and `predict-jpa` in full. Drill: `drill-fix-broken-transactional`
and `drill-find-the-n-plus-one`. If you learn one thing this week, make it the
self-invocation trap and the three N+1 fixes — between them they are asked in
most Java loops.

**Week 2 — the language and the data.**
Theory: `objects-and-contracts`, `collections-choosing`, `hashmap-internals`,
`threads-and-memory-model` → `heap-and-gc`, `solid-and-ood`, and
`sql-you-are-asked` → `locking-and-deadlocks`, all in `?cram`. Questions: `java-language`,
`collections`, `concurrency`, `sql-databases`. Predict sets `predict-java-core`,
`predict-concurrency`, `predict-sql`. Drill: two tier-1 builds, timed, with a
real clock and no reading of the sketch.

**Week 3 — the rounds you cannot read your way through.**
Four tier-1 machine coding drills and four tier-2 HLD drills, one per day,
strictly timed. Then `drill-explain-your-own-architecture` and the
`behavioural-project` topic. Final two evenings: `?cram` + print (D4) — the
whole must-know set as a paper sheet, read once end to end.

## 10.4 The daily loop, once the deck exists

1. Open `#theory` with `?cram` off. Read the next module in order. Tick chapters.
2. Move to `#questions/<topic>`. Answer *aloud* before expanding. Tick KNOWN or
   mark **Review later** — the review-later store keeps a date, so a card you
   deferred three weeks ago is visibly older than one from yesterday.
3. Open `#predict`. Commit to an option before revealing. A wrong verdict is
   the most useful thing in the deck; it is stored as `wrong`, not as
   "unanswered", precisely so you can come back to it.
4. Once a week, one drill from Part 6, timed, sketch closed.
5. Once a week, `#glossary` A–Z scroll. Any term you cannot define in one
   sentence is a chapter you have ticked but not read.

## 10.5 Answering well, which is a separate skill

Every must-know chapter carries an `interviewAngle` field: why this gets asked
and what a good answer contains. It exists because the failure mode at 3–7 years
is not ignorance, it is *shape*: a correct answer delivered as a list of facts
scores below a shorter one that names the trade-off. The house structure the
corpus should teach, and use consistently in `tip` blocks:

1. **The one-sentence answer**, first. Not the history.
2. **The mechanism**, in two or three sentences — what actually happens.
3. **The trade-off or the failure mode** — "this breaks when…".
4. **What you did about it** — a concrete instance from your own work if you
   have one; the deck's `interviewAngle` prompts for it.

---

# PART 11 — Risks, and what will rot

| Risk | Mitigation |
|---|---|
| **The corpus is too large to finish.** ~853 questions and 687 chapters is close to a year of authoring. | §8.1's minimum viable deck is a third of it and answers the two rounds that decide a loop. Ship there. Phases 6–10 are additive and each ends green. |
| **Version drift.** Boot 4.1 today; 4.2 in six months, a new LTS in eighteen. | Delta D1's `version` block localises every version claim, and `validate-theory.js` holds the list of modules required to carry one. A refresh becomes a search for `type: 'version'`, not a re-read. |
| **Fabricated output panes.** The single most damaging failure — teaching something false. | `artefact: 'stdout'` requires `language: 'java'` and is re-executed. Everything else must carry a `verification` string. The validator refuses the alternative. |
| **Documentation links rotting silently.** Spring's doc URLs have already restructured once. | `check-doc-links.js` treats a redirect as a failure, plus one manual read per source per phase. Logged in `docs/verification-log.md`, including what was not checked. |
| **Question ids colliding across topics.** Progress keys on `topicId:questionId`, so a collision is silent. | `validate-questions.js` asserts uniqueness within a topic and asserts the known cross-topic collision list *as complete*. |
| **The two corpora converging.** If the 19 question topics and the 66 modules end up isomorphic, the split has not been thought about. | They are already deliberately different: `jvm-memory` is one topic but two modules; `spring-core` is one topic but seven modules; `http-foundations` and `idempotency` exist only in theory. Keep it that way. |
| **Scope creep into a sixth mode.** DSA, a flashcard mode, a mock-interview timer. | The rail is fixed at five. D4 (print) is the shape a new "mode" should take: a stylesheet or a filter, never a rail item. |
| **A second backend language creeping in.** A Kotlin snippet "for comparison", a Go example in a microservices chapter. | `languages[]` holds nine entries and `validate-questions.js` rejects a tenth, so a snippet cannot enter the corpus by accident. Cross-language comparison is prose in a `comparison` block. |
| **Cloud and NoSQL chapters becoming vendor tutorials.** The failure mode of any chapter about a managed service. | Every chapter states the concept first, the AWS service second, the other clouds in one line. A chapter that cannot be read without a console open has failed and is rewritten. |
| **The `craft` track drifting into opinion.** SOLID and clean architecture attract strong views and weak evidence. | Every `craft` chapter that makes a recommendation carries a `comparison` block with the case against it, and `when-clean-architecture-is-overkill` and `when-solid-becomes-cargo-cult` exist as chapters precisely so the track cannot become advocacy. |

---

# Sources

Research conducted 2026-08-22, in two passes: the first on what the loop asks,
the second (§1.6) specifically hunting for topics the first design had no home
for.

- [45+ Spring Boot Interview Questions and Answers for Experienced Developers 2026 — GoLinuxCloud](https://www.golinuxcloud.com/spring-boot-interview-questions-experienced/)
- [Complete Spring Boot Interview Guide — From Basics to Production (2026) — VamsiLabs](https://vamsilabs.netlify.app/springboot/spring-boot-interview-guide/)
- [50+ Java Backend Interview Questions 2026: Spring Boot, Microservices & System Design — EasyInterview](https://easyinterview.me/blogs/the-interview-questions-that-matter/complete-java-backend-developer-interview-guide)
- [31 Java Backend Interview Questions for 6–10 Years Experience — Stackademic](https://blog.stackademic.com/31-java-backend-interview-questions-for-6-10-years-experience-advanced-guide-de93c15295c0)
- [Spring Boot @Transactional: AOP, Propagation & Pitfalls — Medium](https://medium.com/@nelushgayashan/a-deep-dive-into-spring-boots-transactional-494377e70a66)
- [Transaction Propagation Mechanics in Spring Boot Explained — Medium](https://medium.com/@AlexanderObregon/transaction-propagation-mechanics-in-spring-boot-explained-e93ef2675faf)
- [Virtual Threads and the concurrency model in Spring — EDICOM Tech Blog](https://careers.edicomgroup.com/techblog/backend-virtual-threads-and-the-concurrency-model-in-spring/)
- [Top Spring Boot 3.2 Interview Questions and Answers — Java Code Geeks](https://www.javacodegeeks.com/2025/06/top-spring-boot-3-2-interview-questions-and-answers-2025-edition.html)
- [Machine Coding Round: The Complete Interview Preparation Guide — Low Level Design Mastery](https://www.lowleveldesignmastery.com/blog/machine-coding-round/)
- [Flipkart Interview Process 2026: Rounds, Machine Coding — ClavePrep](https://claveprep.com/blog/flipkart-interview-process-2026-guide)
- [How to Crack Coding Interviews in India: A Complete 2026 Roadmap — ClavePrep](https://claveprep.com/blog/how-to-crack-coding-interviews-in-india-roadmap)
- [Java Microservices Interview Questions And Answers (2026) — JavaTechOnline](https://javatechonline.com/java-microservices-interview-questions-answers/)
- [Top Microservices Tricky Interview Questions — JavaGuides](https://www.javaguides.net/2025/02/top-microservices-tricky-interview-questions-and-answers.html)
- [Microservices Saga Pattern Interview Questions — CodeBegun](https://www.codebegun.com/interview/microservices/saga-pattern)
- [Java Memory Management: Key Interview Questions and Expert Answers — Java Code Geeks](https://www.javacodegeeks.com/2024/09/java-memory-management-key-interview-questions-and-expert-answers.html)
- [Java Garbage Collection Interview Questions — yCrash](https://blog.ycrash.io/java-garbage-collection-interview-questions/)
- [10 Equals and HashCode Interview Questions in Java — Javarevisited](https://javarevisited.blogspot.com/2013/08/10-equals-and-hashcode-interview.html)
- [SQL Interview Questions for Experienced Professionals: A 2026 Guide — Interview Kickstart](https://interviewkickstart.com/blogs/interview-questions/sql-interview-questions-for-experienced-professionals)
- [PostgreSQL Interview Questions for Smart Database Hiring — Digiqt](https://digiqt.com/blog/postgresql-interview-questions/)
- [System Design Interview: The Complete 2026 Playbook — PracHub](https://medium.com/prachub/system-design-interview-the-complete-2026-playbook-d72005042a22)
- [System Design Interview Prep for Backend Engineers — F1Jobs](https://www.f1jobs.io/resources/blog/system-design-interview-backend-roles)
- [I Analyzed 335 Spring Boot Production Failures — Javarevisited](https://medium.com/javarevisited/i-analyzed-335-spring-boot-production-failures-89-made-the-same-7-mistakes-34440983359b)
- [HikariCP Connection Pool Tuning for Production — Trinity Logic](https://www.trinitylogic.co.uk/blog/spring-boot-hikaricp-connection-pool-tuning/)
- [Spring Framework 7.0 General Availability — spring.io](https://spring.io/blog/2025/11/13/spring-framework-7-0-general-availability/)
- [Spring Boot Versions, EOL Dates, and Latest Releases (July 2026) — HeroDevs](https://www.herodevs.com/blog-posts/spring-boot-versions-eol-dates-and-latest-releases-april-2026)

**Gap-audit pass:**

- [Design Patterns in the Spring Framework — Baeldung](https://www.baeldung.com/spring-framework-design-patterns)
- [Design Patterns Used in Spring Framework — GeeksforGeeks](https://www.geeksforgeeks.org/system-design/design-patterns-used-in-spring-framework/)
- [Clean Architecture with Spring Boot — Baeldung](https://www.baeldung.com/spring-boot-clean-architecture)
- [Package by Layer vs Package by Feature — Sahibinden Technology](https://medium.com/sahibinden-technology/package-by-layer-vs-package-by-feature-7e89cde2ae3a)
- [Package by Layer for Spring Projects Is Obsolete — DZone](https://dzone.com/articles/package-by-layer-for-spring-projects-is-obsolete)
- [Microservices Interview Questions and Answers — Devinterview.io](https://github.com/Devinterview-io/microservices-interview-questions)
- [Microservices Interview Questions for Senior Engineers (2026) — Algoroq](https://www.algoroq.io/interview-questions/microservices/)
- [Top 10 Java Serialization Interview Questions and Answers — Javarevisited](https://javarevisited.blogspot.com/2011/04/top-10-java-serialization-interview.html)
- [Java Serialization Interview Questions and Answers — Java2Blog](https://java2blog.com/java-serialization-interview-questions-and-answers/)
- [Java Concurrency Demystified: Semaphore, CountDownLatch, CyclicBarrier & Mutex Internals — CodeX](https://medium.com/codex/java-concurrency-demystified-semaphore-countdownlatch-cyclicbarrier-mutex-internals-explained-61628f592d9c)
- [Difference between CountDownLatch vs CyclicBarrier — Java67](https://www.java67.com/2012/08/difference-between-countdownlatch-and-cyclicbarrier-java.html)
- [50 Maven Interview Questions and Answers — GoLinuxCloud](https://www.golinuxcloud.com/top-maven-interview-questions-answers-experienced/)
- [Choosing REST, gRPC, or GraphQL in a system design interview — techinterview](https://www.techinterview.org/post/3233476810/choosing-rest-grpc-graphql-system-design-interview/)
- [Working with NoSQL Technologies — Spring Boot Reference](https://docs.spring.io/spring-boot/reference/data/nosql.html)
- [Java AWS interview questions for senior developers — AK Coding](https://akcoding.medium.com/java-aws-interview-questions-for-senior-aws-developers-7ee9188f56da)
- [Servlet Interview Questions — GeeksforGeeks](https://www.geeksforgeeks.org/advance-java/servlet-interview-questions/)
