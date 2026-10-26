/* ==========================================================================
   data/theory/sets/drills-debug-and-review.js — Synthesis, tier 4

   Eleven twenty-to-forty-minute exercises: read something broken, say what is
   wrong with it, fix it. The plan calls this the most under-practised
   category and that is not a throwaway line — every candidate has written a
   parking lot, and almost none have sat down with a thread dump and a clock.

   These are the round-5 material, where the interviewer stops asking what you
   know and starts asking what you would DO. The watchFor lists are therefore
   about method rather than about answers: an engineer who reaches for the
   right evidence and reasons from it out loud passes even when the diagnosis
   turns out to be the second thing they tried.
   ========================================================================== */

const drillsDebugAndReviewModule = {
    id: 'drills-debug-and-review',
    trackId: 'synthesis',
    order: 904,
    title: 'Debug, Review, Extend',
    tagline: 'Round 5. Something is already broken and the clock is already running.',
    estimatedMinutes: 40,
    prerequisites: [],
    docHub: {
        title: 'Spring Boot Actuator — Production-ready features',
        url: 'https://docs.spring.io/spring-boot/reference/actuator/index.html'
    },

    chapters: [
        {
            id: 'debug-connection-pool-exhaustion',
            title: 'The Pool Is Empty',
            importance: 'must-know',
            summary: 'Requests time out waiting for a connection. Everything downstream is healthy.',
            interviewAngle: 'The most common production incident in a Spring service, and the one where the wrong instinct — raise the pool size — is also the fastest way to make it worse.',
            buildsOn: [],
            blocks: [
                {
                    type: 'drill',
                    id: 'drill-debug-connection-pool-exhaustion',
                    tier: 4,
                    title: 'Diagnose HikariPool-1 - Connection is not available',
                    minutes: 30,
                    prompt: 'A service starts returning 500s under moderate load. The log is full of "Connection is not available, request timed out after 30000ms". The database reports low CPU, few active queries and no locks. The pool is 10 and the machine has 4 cores. Say what you would look at, in order, and what the three likely causes are. Then say what raising the pool to 100 would do.',
                    watchFor: [
                        'Reaching for the pool size before reading the leak-detection output',
                        'Not distinguishing "connections busy" from "connections leaked" — a busy pool and a leaked pool look identical from the outside and have opposite fixes',
                        'Missing that an HTTP call inside a transaction holds a connection for the duration of a network round trip',
                        'No mention of leakDetectionThreshold, which turns a mystery into a stack trace',
                        'Answering without naming what evidence would confirm or refute the guess'
                    ],
                    sketch: {
                        language: 'properties',
                        title: 'The setting that turns this from guesswork into a stack trace',
                        code: '# Logs the stack trace of any connection held longer than this.\n# It is the single most useful line in a Hikari configuration and it\n# is off by default.\nspring.datasource.hikari.leak-detection-threshold=20000\n\n# Deliberately SMALL. A pool larger than the database can serve turns\n# a queue you can see into a queue you cannot: the waiting moves from\n# your pool into the database\'s scheduler.\nspring.datasource.hikari.maximum-pool-size=10\nspring.datasource.hikari.connection-timeout=3000\n\nlogging.level.com.zaxxer.hikari.pool.HikariPool=DEBUG',
                        output: {
                            kind: 'trace',
                            lines: [
                                'Three causes, in the order they actually occur: a transaction that spans an HTTP call; a transaction left open because the method returns a Stream or a lazy cursor; a batch job on the same pool as the request path.',
                                'Raising the pool to 100 moves the contention into the database and makes every query slower, so the timeout still fires and now the database is unhealthy too.',
                                'The evidence that separates busy from leaked: leak detection stack traces, and whether pool.ActiveConnections stays pinned at max while database activity is near zero.',
                                'The fix for the third cause is a second pool, not a bigger one -- a request path and a batch job should not be able to starve each other.'
                            ]
                        }
                    }
                }
            ],
            docs: [{ title: 'HikariCP — Pool sizing', url: 'https://github.com/brettwooldridge/HikariCP/wiki/About-Pool-Sizing', kind: 'guide' }],
            relatedQuestions: [{ topicId: 'transactions', questionId: 'connection-pool-and-transactions' }]
        },

        {
            id: 'find-the-n-plus-one',
            title: 'Find the N+1',
            importance: 'must-know',
            summary: 'One endpoint, 300 queries, and a log you have to make show you them.',
            interviewAngle: 'Everyone can define N+1. Far fewer can say how they would prove one is happening on a service they have just been handed.',
            buildsOn: [],
            blocks: [
                {
                    type: 'drill',
                    id: 'drill-find-the-n-plus-one',
                    tier: 4,
                    title: 'Prove it, then fix it three ways and choose',
                    minutes: 30,
                    prompt: 'An endpoint returning fifty orders takes 1.8 seconds. Turn on whatever you need to see the queries. Establish how many run and why. Then give three fixes — a join fetch, an entity graph, and a batch size — and say which you would ship and what each costs.',
                    watchFor: [
                        'Guessing from the code instead of counting the queries',
                        'show-sql alone, with no statistics, so the count is eyeballed from a scrolling log',
                        'A join fetch applied to a paginated query, which makes Hibernate paginate in memory and log HHH90003004',
                        'Batch size described as a fix for N+1 rather than as a way to make N smaller',
                        'No mention that a DTO projection removes the problem instead of managing it'
                    ],
                    sketch: {
                        language: 'properties',
                        title: 'Make the count a number rather than an impression',
                        code: 'spring.jpa.properties.hibernate.generate_statistics=true\nlogging.level.org.hibernate.stat=DEBUG\n\n# The one that makes N smaller without changing a query:\nspring.jpa.properties.hibernate.default_batch_fetch_size=25\n\n# And in a test, the honest measurement -- assert the query COUNT,\n# so the fix cannot silently regress:\n#   assertThat(statistics.getPrepareStatementCount()).isEqualTo(2);',
                        output: {
                            kind: 'trace',
                            lines: [
                                'Statistics prints one line per session: queries executed, entities loaded, collections fetched. That is the number to quote, not an impression of the log.',
                                'Join fetch: one query, but it cannot be combined with setMaxResults without in-memory pagination.',
                                'Entity graph: the same SQL as a join fetch, declared on the query rather than in it, so the repository method stays readable.',
                                'Batch fetch size 25: fifty orders become two extra queries rather than fifty. It fixes every N+1 in the application at once and fixes none of them completely.'
                            ]
                        }
                    }
                }
            ],
            docs: [{ title: 'Hibernate — Fetching strategies', url: 'https://docs.hibernate.org/orm/6.4/userguide/html_single/#fetching', kind: 'guide' }],
            relatedQuestions: [{ topicId: 'jpa-hibernate', questionId: 'n-plus-one' }]
        },

        {
            id: 'review-a-controller',
            title: 'Review This Controller',
            importance: 'must-know',
            summary: 'Eight planted defects in forty lines. Finding six is a pass; the order you find them in is the signal.',
            interviewAngle: 'A code review is the cheapest possible window into what someone considers important, which is exactly why it is set.',
            buildsOn: [],
            blocks: [
                {
                    type: 'drill',
                    id: 'drill-review-a-controller',
                    tier: 4,
                    title: 'Eight defects, ranked by what you would say first',
                    minutes: 25,
                    prompt: 'Read the controller below and list what is wrong with it, most serious first. Then say which two you would block the pull request over and which you would leave as comments.',
                    watchFor: [
                        'Listing style issues above the security defect',
                        'Missing that the entity is returned directly, so every field including the internal ones is serialised',
                        'Missing the unvalidated sort parameter, which lets a caller choose the column the database sorts on',
                        'Treating the missing @Valid as cosmetic — it is the difference between a 400 and a constraint violation at flush',
                        'No comment on the swallowed exception, which is the line that will cost somebody a night'
                    ],
                    sketch: {
                        language: 'java',
                        title: 'The controller under review',
                        code: '@RestController\n@RequestMapping("/orders")\nclass OrderController {\n\n    @Autowired private OrderRepository repository;          // 1\n\n    @GetMapping\n    public List<Order> list(@RequestParam String sort,       // 2, 3\n                            @RequestParam int page) {\n        return repository.findAll(PageRequest.of(page, 100,\n                Sort.by(sort))).getContent();               // 4\n    }\n\n    @PostMapping\n    public ResponseEntity<Order> create(@RequestBody OrderRequest body) {  // 5\n        Order order = new Order();\n        order.setTotal(body.items().stream()\n                .map(i -> i.price().multiply(new BigDecimal(i.qty())))\n                .reduce(BigDecimal.ZERO, BigDecimal::add));  // 6\n        try {\n            return ResponseEntity.ok(repository.save(order));\n        } catch (Exception e) {                             // 7\n            return ResponseEntity.status(500).build();\n        }\n    }\n\n    @DeleteMapping("/{id}")\n    public void delete(@PathVariable Long id) {              // 8\n        repository.deleteById(id);\n    }\n}',
                        output: {
                            kind: 'trace',
                            lines: [
                                '4 and 2 are the blockers. Sort.by takes any property name the caller sends, so a stranger picks the column the database sorts on -- and the entity is returned directly, so every field it has is in the response.',
                                '3: page is unbounded and unvalidated, and a negative page throws inside Spring Data rather than returning 400.',
                                '5: no @Valid, so the request body is not validated and a missing field surfaces as a constraint violation at flush instead of a 400.',
                                '6: pricing is business logic in the controller, and it is also the one line here worth a unit test.',
                                '7: catch (Exception) around a save, returning a bare 500 with the cause discarded -- @ControllerAdvice exists for exactly this.',
                                '8: DELETE returns void, so a missing id is a 200. It should be 204 on success and 404 when nothing matched.',
                                '1: field injection makes the dependency invisible to a constructor and untestable without a container. Real, and the least important thing on this list.'
                            ]
                        }
                    }
                }
            ],
            docs: [{ title: 'Spring Data — Web support and Pageable', url: 'https://docs.spring.io/spring-data/jpa/reference/repositories/core-extensions.html', kind: 'guide' }],
            relatedQuestions: [{ topicId: 'rest-api', questionId: 'controlleradvice-and-problemdetail' }]
        },

        {
            id: 'diagnose-from-heap-histogram',
            title: 'Read a Heap Histogram',
            importance: 'should-know',
            summary: 'Old gen grows, full GCs get longer, and the histogram names the culprit if you know what to ignore.',
            interviewAngle: 'A leak question with real output in front of you. The skill is discarding the four boring rows at the top.',
            buildsOn: [],
            blocks: [
                {
                    type: 'drill',
                    id: 'drill-diagnose-from-heap-histogram',
                    tier: 4,
                    title: 'jmap -histo, and what the top of it never tells you',
                    minutes: 25,
                    prompt: 'A service restarts every eleven hours with an OutOfMemoryError. Full GCs run more often and reclaim less each time. Given a jmap histogram taken at hour ten, say how you would find the leak, and what you would ask for if the histogram were not enough.',
                    watchFor: [
                        'Reading char[], byte[], String and Object[] as the answer — they are the top four rows of every histogram ever taken',
                        'Comparing one histogram against nothing; the signal is the DIFFERENCE between two taken an hour apart',
                        'Not asking for a heap dump, which is the only artefact that shows what is holding the references',
                        'Confusing a leak with a heap simply sized too small for the working set',
                        'No mention of the usual suspects: a static collection, a ThreadLocal in a pooled thread, an unbounded cache'
                    ],
                    sketch: {
                        language: 'bash',
                        title: 'Two histograms and a diff, then a dump',
                        code: '# The number that matters is the delta, not the total.\njcmd <pid> GC.class_histogram > t0.txt\nsleep 3600\njcmd <pid> GC.class_histogram > t1.txt\ndiff <(head -40 t0.txt) <(head -40 t1.txt)\n\n# The histogram says WHAT is on the heap. Only a dump says WHO is\n# holding it, which is the question you actually have.\njcmd <pid> GC.heap_dump /tmp/heap.hprof\n\n# And confirm it is a leak rather than a small heap: if old-gen\n# occupancy after each full GC trends upward, it is a leak.\njcmd <pid> GC.heap_info',
                        output: {
                            kind: 'trace',
                            lines: [
                                'A leak shows as a class whose instance count grows monotonically between the two histograms while throughput stays flat.',
                                'A heap that is merely too small shows as high but STABLE post-collection occupancy, with full GCs that still reclaim.',
                                'The three that account for most real leaks: a static Map nobody evicts, a ThreadLocal set on a pooled request thread and never removed, and a cache with no maximum size.',
                                'GC.class_histogram triggers a full GC as a side effect, which perturbs what you are measuring -- take that into account rather than being surprised by it.'
                            ]
                        }
                    }
                }
            ],
            docs: [{ title: 'jcmd — JDK tool reference', url: 'https://docs.oracle.com/en/java/javase/21/docs/specs/man/jcmd.html', kind: 'spec' }],
            relatedQuestions: [{ topicId: 'concurrency', questionId: 'threadlocal-leaks' }]
        },

        {
            id: 'fix-broken-transactional',
            title: 'Why Did It Not Roll Back',
            importance: 'must-know',
            summary: 'Four reasons @Transactional does nothing, and three of them are in this one class.',
            interviewAngle: 'The single most-asked debugging question in Spring interviews, and the fastest way to tell whether somebody understands proxies.',
            buildsOn: [],
            blocks: [
                {
                    type: 'drill',
                    id: 'drill-fix-broken-transactional',
                    tier: 4,
                    title: 'Three annotations, none of them working',
                    minutes: 25,
                    prompt: 'The class below has three @Transactional methods and none of them behaves as written. Find all three failures, explain the mechanism in each case, and fix them without introducing a self-injected proxy if you can avoid it.',
                    watchFor: [
                        'Saying "self-invocation" without saying WHY — the call does not go through the proxy, so no advice runs',
                        'Missing that a checked exception does not roll back by default',
                        'Missing that private and final methods cannot be advised at all, and that Spring logs nothing about it',
                        'Fixing self-invocation by injecting the bean into itself, which works and is the last resort rather than the first',
                        'Not checking whether a transaction manager is even configured for the second data source'
                    ],
                    sketch: {
                        language: 'java',
                        title: 'Three failures in one class',
                        code: '@Service\nclass BillingService {\n\n    // 1. Called only from process() below, so the proxy is bypassed\n    //    and this annotation does nothing at all.\n    @Transactional\n    public void charge(Invoice invoice) { ... }\n\n    public void process(List<Invoice> batch) {\n        batch.forEach(this::charge);          // self-invocation\n    }\n\n    // 2. Rolls back on RuntimeException only. A checked exception\n    //    commits the transaction on its way out, which is almost\n    //    never what the author meant.\n    @Transactional\n    public void settle(Long id) throws SettlementException { ... }\n\n    // 3. Private. CGLIB cannot override it, so there is no proxy\n    //    method to advise -- and nothing warns you.\n    @Transactional\n    private void audit(Long id) { ... }\n}',
                        output: {
                            kind: 'trace',
                            lines: [
                                '1: move the annotated method to another bean, or annotate process() instead -- one transaction for the batch is a different decision, so say which you mean.',
                                '2: @Transactional(rollbackFor = SettlementException.class), or unchecked exceptions. The default is rollback on RuntimeException and Error only.',
                                '3: make it package-private or public. Spring AOP advises overridable methods; private and final are invisible to it.',
                                'The general rule that covers all three: the annotation is a request to a proxy, and any call that does not pass through the proxy is an ordinary method call.'
                            ]
                        }
                    }
                }
            ],
            docs: [{ title: 'Spring Framework — Declarative transaction management', url: 'https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative.html', kind: 'guide' }],
            relatedQuestions: [{ topicId: 'transactions', questionId: 'transactional-not-working' }]
        },

        {
            id: 'read-an-explain-plan',
            title: 'Read This Plan',
            importance: 'must-know',
            summary: 'A seq scan where an index exists, and the estimate that is wrong by three orders of magnitude.',
            interviewAngle: 'Reading a plan out loud is a skill an interviewer can watch you either have or not have inside two minutes.',
            buildsOn: [],
            blocks: [
                {
                    type: 'drill',
                    id: 'drill-read-an-explain-plan',
                    tier: 4,
                    title: 'EXPLAIN ANALYZE on PostgreSQL 16, top-down then bottom-up',
                    minutes: 25,
                    prompt: 'Given the plan below, say what the query is doing, where the time goes, and why the index on orders(status) is not used. Then say what you would change and what you would measure afterwards.',
                    watchFor: [
                        'Reading cost as milliseconds — it is an arbitrary unit and only the ratios mean anything',
                        'Missing the gap between rows estimated and rows actual, which is the single most informative number in a plan',
                        'Not noticing loops, so the per-loop time is multiplied by a count nobody read',
                        'Recommending an index without saying what fraction of the table the predicate selects',
                        'No mention of ANALYZE when the estimate is stale'
                    ],
                    sketch: {
                        language: 'sql',
                        title: 'The plan, and the two numbers to read first',
                        code: 'EXPLAIN (ANALYZE, BUFFERS)\nSELECT o.id, o.total FROM orders o WHERE o.status = \'PENDING\';\n\n--  Seq Scan on orders o\n--    (cost=0.00..48250.00 rows=1000 width=24)\n--    (actual time=0.021..812.4 rows=486213 loops=1)\n--    Filter: (status = \'PENDING\'::text)\n--    Rows Removed by Filter: 513787\n--    Buffers: shared hit=1204 read=22046\n--  Planning Time: 0.184 ms\n--  Execution Time: 934.7 ms',
                        output: {
                            kind: 'trace',
                            lines: [
                                'rows=1000 estimated against rows=486213 actual. The planner believed PENDING was rare; it is half the table. That gap is the whole answer.',
                                'With half the table matching, a sequential scan is CORRECT -- an index scan would touch every heap page anyway plus the index. The index is not being ignored, it is being rejected.',
                                'So the fix is not an index hint. Either the statistics are stale (ANALYZE orders) or PENDING really is half the table and the query needs a narrower predicate.',
                                'Buffers read=22046 says most of it came from disk rather than cache, which is where the 812ms went.',
                                'A partial index -- CREATE INDEX ... WHERE status = \'PENDING\' -- helps only once PENDING is a small minority again.'
                            ]
                        }
                    }
                }
            ],
            docs: [{ title: 'PostgreSQL 16 — Using EXPLAIN', url: 'https://www.postgresql.org/docs/16/using-explain.html', kind: 'spec' }],
            relatedQuestions: [{ topicId: 'sql-databases', questionId: 'reading-an-explain-plan' }]
        },

        {
            id: 'kafka-rebalance-storm',
            title: 'The Consumer Group Will Not Settle',
            importance: 'should-know',
            summary: 'Rebalance, process nothing, rebalance again. The cause is a timeout nobody set.',
            interviewAngle: 'Distributed-systems debugging with a concrete, well-documented mechanism underneath it. Knowing which of the three timeouts applies is the discriminator.',
            buildsOn: [],
            blocks: [
                {
                    type: 'drill',
                    id: 'drill-kafka-rebalance-storm',
                    tier: 4,
                    title: 'max.poll.interval.ms and the other two timeouts',
                    minutes: 30,
                    prompt: 'A consumer group with six members rebalances every ninety seconds and lag grows without bound. Processing one record takes about four seconds. Say which timeout is firing, why the other two are not, and give two independent fixes.',
                    watchFor: [
                        'Confusing session.timeout.ms with max.poll.interval.ms — the first is about the heartbeat thread, the second about the processing thread',
                        'Not calculating max.poll.records times per-record time against the interval, which is the arithmetic the whole problem reduces to',
                        'Raising max.poll.interval.ms without lowering max.poll.records, so a genuinely stuck consumer is now undetectable for much longer',
                        'Missing that every rebalance reprocesses uncommitted records, so the storm creates the duplicates it is later blamed for',
                        'No mention of cooperative sticky assignment, which makes a rebalance stop being stop-the-world'
                    ],
                    sketch: {
                        language: 'properties',
                        title: 'The arithmetic, then the two fixes',
                        code: '# Default max.poll.records is 500. At 4s each that is 2000 seconds\n# of processing between polls, against a default max.poll.interval\n# of 300s. The consumer is evicted every time, forever.\n\n# Fix A: poll less at a time. Preferred -- it keeps the liveness\n# check meaningful.\nspring.kafka.consumer.max-poll-records=50\n\n# Fix B: allow longer. Use with A, not instead of it.\nspring.kafka.consumer.properties.max.poll.interval.ms=600000\n\n# And stop the rebalance being stop-the-world:\nspring.kafka.consumer.properties.partition.assignment.strategy=\\\n  org.apache.kafka.clients.consumer.CooperativeStickyAssignor',
                        output: {
                            kind: 'trace',
                            lines: [
                                'session.timeout.ms is not firing: the heartbeat runs on its own thread and keeps reporting alive while processing blocks.',
                                'max.poll.interval.ms is firing: the coordinator has not seen a poll() within the interval and assumes the member is stuck.',
                                'Each eviction abandons the uncommitted batch, so the next owner reprocesses it -- which is why a rebalance storm and a duplicate-processing incident are usually the same incident.',
                                'Fifty records at four seconds is 200 seconds, inside the 300s default with room to spare. That is the sizing statement to give.'
                            ]
                        }
                    }
                }
            ],
            docs: [{ title: 'Kafka — Consumer configuration', url: 'https://kafka.apache.org/documentation/#consumerconfigs', kind: 'spec' }],
            relatedQuestions: []
        },

        {
            id: 'explain-your-own-architecture',
            title: 'Explain What You Built',
            importance: 'must-know',
            summary: 'The résumé defence, structured, so it is not a tour of a package tree.',
            interviewAngle: 'Round 5 is often nothing but this, and it is the round most people prepare for least because they assume they already know the material.',
            buildsOn: [],
            blocks: [
                {
                    type: 'drill',
                    id: 'drill-explain-your-own-architecture',
                    tier: 4,
                    title: 'Ten minutes on a system you actually worked on',
                    minutes: 20,
                    prompt: 'Pick one system from your own CV. In ten minutes: the problem and who had it, the shape of the solution in four boxes, the one hard trade-off and what you chose, the thing that broke in production and what you changed, and what you would do differently now. Record yourself. Watch it back.',
                    watchFor: [
                        'Starting with the technology stack instead of the problem — nobody asked what you used, they asked what it was for',
                        'No numbers: requests per second, data volume, team size, latency budget. A system with no numbers is a diagram',
                        'Claiming a decision that was made before you arrived, which collapses on the first follow-up',
                        'No failure. A system that never broke is a system nobody used or a story nobody checked',
                        'Running out of time before reaching the trade-off, which is the only part they were waiting for'
                    ],
                    sketch: {
                        language: 'bash',
                        title: 'The five-beat structure, timed',
                        code: '# 0:00  The problem, and whose it was.        90 seconds\n# 1:30  Four boxes and the arrows between.    2 minutes\n# 3:30  The trade-off, and the road not taken. 2 minutes\n# 5:30  What broke, and the fix.               2 minutes\n# 7:30  What you would change now.            90 seconds\n# 9:00  Stop. The remaining minute is theirs.\n\n# Rehearse it three times. The third one is the one that stops\n# sounding like a tour of a package tree.',
                        notes: '<p>The fourth beat is the one candidates skip and the one interviewers remember. A specific incident with a specific fix does more for your credibility than any amount of architecture description, because it is the part that cannot be invented convincingly.</p>'
                    }
                }
            ],
            docs: [{ title: 'The C4 model — context, container, component', url: 'https://c4model.com/', kind: 'guide' }],
            relatedQuestions: []
        },

        {
            id: 'resolve-a-dependency-conflict',
            title: 'Which Version Won',
            importance: 'should-know',
            summary: 'NoSuchMethodError at runtime, a clean compile, and nearest-wins mediation.',
            interviewAngle: 'Everyday work that almost nobody rehearses. Being able to read a dependency tree out loud is unusual enough to be noticed.',
            buildsOn: [],
            blocks: [
                {
                    type: 'drill',
                    id: 'drill-resolve-a-dependency-conflict',
                    tier: 4,
                    title: 'mvn dependency:tree, and the four ways to force a version',
                    minutes: 25,
                    prompt: 'The application compiles and then throws NoSuchMethodError on a Jackson class at runtime. Find which version is on the class path and why. Then give four ways to fix it and say which is right for a library and which for an application.',
                    watchFor: [
                        'Not knowing that Maven resolves by NEAREST wins, not highest version — the shallowest declaration in the tree takes it',
                        'Confusing the fix for a library with the fix for an application: dependencyManagement pins, exclusion removes, and only one of them is polite to your consumers',
                        'Missing that a BOM exists for exactly this and that Spring Boot ships one',
                        'Not verifying afterwards with dependency:tree -Dverbose, which is the only view that shows what was omitted and why',
                        'A NoSuchMethodError read as a code bug rather than as a class-path fact'
                    ],
                    sketch: {
                        language: 'bash',
                        title: 'See it, then choose the right lever',
                        code: '# -Dverbose is the important half: it prints the versions that were\n# OMITTED and the reason, which is the line that names your winner.\nmvn dependency:tree -Dverbose -Dincludes=com.fasterxml.jackson.core\n\n# [INFO] +- com.example:svc:2.1\n# [INFO] |  \\- com.fasterxml.jackson.core:jackson-databind:2.13.0\n# [INFO] \\- org.springframework.boot:spring-boot-starter-web:3.2.0\n# [INFO]    \\- (com.fasterxml.jackson.core:jackson-databind:2.15.3\n# [INFO]       - omitted for conflict with 2.13.0)\n#\n# Nearest wins, and 2.13.0 is one level nearer. The starter\'s 2.15.3\n# lost -- so Boot 3.2 is running against a databind it predates.',
                        output: {
                            kind: 'trace',
                            lines: [
                                'Application: pin it in dependencyManagement, or rely on the spring-boot-dependencies BOM and remove your own version entirely. This is the usual right answer.',
                                'Library: do not pin. Widen your declared range or exclude nothing, because a pin inside a library forces itself on every consumer.',
                                'Exclusion: removes the transitive edge. Correct when the dependency genuinely should not be there, wrong as a way to pick a version.',
                                'Verify with -Dverbose after the change. A tree that no longer prints "omitted for conflict" is the confirmation; a passing build is not.'
                            ]
                        }
                    }
                }
            ],
            docs: [{ title: 'Maven — Dependency mediation', url: 'https://maven.apache.org/guides/introduction/introduction-to-dependency-mechanism.html', kind: 'guide' }],
            relatedQuestions: []
        },

        {
            id: 'refactor-a-god-service',
            title: 'Six Hundred Lines',
            importance: 'should-know',
            summary: 'One class, eleven dependencies, and a first cut that has to be safe rather than beautiful.',
            interviewAngle: 'Tests judgement under a constraint: you cannot rewrite it, so what do you do first and how do you know you have not broken anything.',
            buildsOn: [],
            blocks: [
                {
                    type: 'drill',
                    id: 'drill-refactor-a-god-service',
                    tier: 4,
                    title: 'A first cut that ships on Friday',
                    minutes: 40,
                    prompt: 'OrderService is 600 lines with eleven injected dependencies and no tests. Propose a decomposition, name the first three commits in order, and say how you would know at each step that behaviour has not changed. You may not rewrite it and you may not stop feature work.',
                    watchFor: [
                        'A beautiful target architecture with no first step — the question was what you do on Monday',
                        'Refactoring before there is a characterisation test, so "no behaviour change" is a hope',
                        'Splitting by technical layer (service, helper, util) rather than by reason to change',
                        'Not noticing that eleven dependencies is itself the measurement — each one is a responsibility somebody put here',
                        'No mention of keeping the public method signatures stable so callers do not move in the same commit'
                    ],
                    sketch: {
                        language: 'java',
                        title: 'Characterise, then extract, then move',
                        code: '// Commit 1 -- NO PRODUCTION CHANGE. A characterisation test per\n// public method, asserting what it does today including the parts\n// that look wrong. This is the safety net and it is the whole\n// reason the next two commits are allowed to exist.\n\n// Commit 2 -- extract by REASON TO CHANGE, not by layer. Pricing\n// changes when finance changes their mind; fulfilment changes when\n// the warehouse does. Those are different reasons, so:\nclass PricingCalculator { ... }     // 4 of the 11 dependencies\nclass FulfilmentPlanner  { ... }     // 3 of them\n// OrderService keeps its signatures and delegates.\n\n// Commit 3 -- move the tests that now belong to the new classes,\n// and only now let a caller notice anything changed.',
                        notes: '<p>The eleven dependencies are the map. Group them by which of them move together and you have the seams — that is a mechanical step, not a matter of taste, and saying so is what makes the answer sound like something you have done rather than something you have read.</p>'
                    }
                }
            ],
            docs: [{ title: 'Legacy Seam', url: 'https://martinfowler.com/bliki/LegacySeam.html', kind: 'guide' }],
            relatedQuestions: []
        },

        {
            id: 'fix-a-serialization-break',
            title: 'It Deserialises On Half the Fleet',
            importance: 'should-know',
            summary: 'A field added, a rolling deploy, and messages that fail on the old instances only.',
            interviewAngle: 'Compatibility across a deploy, which is the expand-and-contract lesson wearing a different hat — and the version-skew reasoning is what is being examined.',
            buildsOn: [],
            blocks: [
                {
                    type: 'drill',
                    id: 'drill-fix-a-serialization-break',
                    tier: 4,
                    title: 'Java serialization and JSON, and what breaks in each',
                    minutes: 25,
                    prompt: 'During a rolling deploy, messages written by new instances fail on old ones. The change was one added field. Explain what happened for a Java-serialized payload and for a JSON payload, and give the rule that would have prevented both.',
                    watchFor: [
                        'Not knowing that serialVersionUID is computed from the class shape when it is not declared, so ANY change to the shape changes it',
                        'Assuming JSON is safe unconditionally — it is safe only while the consumer tolerates unknown fields. Jackson defaults FAIL_ON_UNKNOWN_PROPERTIES to true and Spring Boot\'s auto-configured mapper turns it off, so which behaviour you have depends on how the mapper was built',
                        'Treating this as a serialization problem rather than as a version-skew problem, which is what it is',
                        'No mention that the consumer must be deployed before the producer for an additive change',
                        'Missing that a required new field is not an additive change at all'
                    ],
                    sketch: {
                        language: 'java',
                        title: 'The two mechanisms, and the one rule',
                        code: '// Java serialization: without this line the UID is DERIVED from the\n// class shape, so adding one field changes it and every old reader\n// throws InvalidClassException. Declaring it is not optional for\n// anything that crosses a version boundary.\nprivate static final long serialVersionUID = 1L;\n\n// JSON: the default is to reject fields the reader does not know.\n// One line on the consumer, deployed FIRST, and the same additive\n// change is a non-event.\n@JsonIgnoreProperties(ignoreUnknown = true)\nrecord OrderEvent(String id, BigDecimal total, String channel) { }',
                        output: {
                            kind: 'trace',
                            lines: [
                                'The rule that covers both: a consumer that tolerates unknown fields is deployed before a producer that emits them. It is expand-and-contract, applied to a message instead of a column.',
                                'An added OPTIONAL field is additive. An added REQUIRED field is not, and needs the same three-step dance a NOT NULL column needs.',
                                'Java serialization across services is best avoided outright -- the coupling is to the class shape, which is not an interface anybody agreed to.',
                                'A schema registry with a compatibility mode makes the check mechanical instead of a rule people remember.'
                            ]
                        }
                    }
                }
            ],
            docs: [{ title: 'Java Object Serialization Specification', url: 'https://docs.oracle.com/en/java/javase/21/docs/specs/serialization/index.html', kind: 'spec' }],
            relatedQuestions: [{ topicId: 'sql-databases', questionId: 'migrations-and-zero-downtime' }]
        }
    ]
};
