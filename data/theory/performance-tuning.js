/* ==========================================================================
   data/theory/performance-tuning.js — module 82 in the reading path

   The plan's tagline is the whole design of this module: the method, not the
   tricks. Nine chapters, of which one is a list of common causes and the
   other eight are about how to find out which one you have.

   That ordering is deliberate. A candidate who answers "the endpoint is
   slow, what do you do" with a list of optimisations is guessing; one who
   answers with a sequence of measurements that narrows the search is
   describing something they have done. The module closes on a worked
   investigation for exactly that reason.
   ========================================================================== */

const performanceTuningModule = {
    id: 'performance-tuning',
    trackId: 'production',
    order: 82,
    title: 'Finding a Slow Endpoint',
    tagline: 'The method, not the tricks.',
    estimatedMinutes: 45,
    prerequisites: ['containers-and-k8s', 'fetching-and-n-plus-one'],
    docHub: { title: 'Spring Boot — Metrics', url: 'https://docs.spring.io/spring-boot/reference/actuator/metrics.html' },

    chapters: [
        {
            id: 'measure-before-you-guess',
            title: 'Measure First',
            importance: 'must-know',
            summary: 'Intuition about where time goes is unreliable, including from experienced engineers. Every optimisation applied without a measurement is a change with unknown value and known risk.',
            interviewAngle: 'Leading with the method rather than with a fix is the strongest possible opening to a performance question.',
            buildsOn: [],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>The reason to insist on this is not discipline for its own sake. An optimisation applied to code that was not the bottleneck makes the system <em>more complex</em> and <strong>no faster</strong> — you have paid a permanent readability cost for nothing, and the actual bottleneck is still there.</p><p>Amdahl\'s law puts a bound on it: if a component accounts for 5% of the time, making it infinitely fast improves the total by 5%. Optimising the 60% by a third is worth four times more than perfecting the 5%, and knowing which is which requires a measurement rather than a guess.</p>'
                },
                {
                    type: 'types',
                    title: 'The measurements, in the order they narrow the search',
                    items: [
                        { name: '1. Which endpoint, and at which percentile', html: '<p><code>http.server.requests</code>, by URI. "The application is slow" is not actionable; "the order search is slow at p99 and fine at p50" is.</p>' },
                        { name: '2. Where the time goes inside it', html: '<p>A distributed trace. Which hop, which query, which downstream — this step usually ends the investigation.</p>' },
                        { name: '3. Whether it is waiting or working', html: '<p>Pool saturation metrics against CPU. Waiting and working are different problems with disjoint fixes.</p>' },
                        { name: '4. If it is working: which code', html: '<p>A profiler — async-profiler, or JFR. Never a stopwatch added by hand.</p>' },
                        { name: '5. If it is the database: which query', html: '<p><code>pg_stat_statements</code> and an execution plan. The next chapters.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Adding timing code by hand changes what you are measuring and usually misses the cause.</strong> It measures the spans you thought to instrument, which are the ones you already suspected — so it confirms your hypothesis and stays silent about everything else. A sampling profiler observes all of it, including the JDK, the framework and the driver, without touching the source.</p>'
                }
            ],
            docs: [
                { title: 'async-profiler', url: 'https://github.com/async-profiler/async-profiler', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'observability-ops', questionId: 'latency-investigation-order' }
            ]
        },

        {
            id: 'latency-percentiles',
            title: 'Percentiles, Not Averages',
            importance: 'must-know',
            summary: 'An average hides the tail, and the tail is what users experience. p99 is not an edge case when a page makes fifty calls — it is most page loads.',
            interviewAngle: 'The tail-amplification arithmetic is the fact that changes people\'s intuition, and it is one line.',
            buildsOn: ['measure-before-you-guess'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>An average of 50 ms is consistent with everybody getting 50 ms, and equally consistent with 99% getting 10 ms and 1% getting 4 seconds. The second is a serious problem and the average cannot distinguish it from the first.</p><p>The arithmetic that matters: <strong>if one page load makes 50 backend calls, the chance that none of them hits the 99th percentile is 0.99 raised to the 50th — about 60%.</strong> So roughly 40% of page loads contain at least one p99 request. The tail is not an edge case; at any realistic fan-out it is the common experience.</p>'
                },
                {
                    type: 'table',
                    title: 'What each percentile is for',
                    headers: ['Measure', 'Tells you', 'Use it for'],
                    rows: [
                        ['Average', 'Almost nothing on its own', 'Capacity arithmetic, and not much else'],
                        ['p50 (median)', 'The typical experience', 'Is the common case healthy?'],
                        ['p95', 'A bad-but-not-rare experience', 'A reasonable SLO target'],
                        ['<strong>p99</strong>', 'The tail users actually meet', '<strong>The number to tune against</strong>'],
                        ['p99.9', 'The very worst', 'GC pauses, lock contention, a cold cache'],
                        ['Max', 'One request, once', 'Almost always noise; useful only for a hard timeout']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Percentiles cannot be averaged, and every dashboard that shows a p99 across instances is at risk of doing it.</strong> The mean of ten instances\' p99 is not the fleet\'s p99, and it is systematically optimistic. This is why the metrics module recommended <code>publishPercentileHistogram()</code>: shipping buckets lets the backend compute a true percentile across the fleet, while <code>publishPercentiles</code> computes one per instance that can then only be wrongly combined.</p>'
                }
            ],
            docs: [
                { title: 'Micrometer — Histograms and percentiles', url: 'https://docs.micrometer.io/micrometer/reference/concepts/histogram-quantiles.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'observability-ops', questionId: 'percentiles-not-averages' }
            ]
        },

        {
            id: 'the-usual-suspects',
            title: 'The Usual Suspects',
            importance: 'must-know',
            summary: 'A short list that accounts for most slow endpoints in Spring services, ordered by how often it is the answer. Use it to form a hypothesis, never to skip the measurement.',
            interviewAngle: 'Having a prior distribution is useful and saying it is a prior rather than a diagnosis is what keeps it honest.',
            buildsOn: ['latency-percentiles'],
            blocks: [
                {
                    type: 'table',
                    title: 'Ordered by how often it turns out to be the cause',
                    headers: ['Cause', 'Signature', 'Where to look'],
                    rows: [
                        ['<strong>N+1 queries</strong>', 'Latency scales with result size', 'Query count per request; Hibernate statistics'],
                        ['<strong>A missing index</strong>', 'One query dominates the trace', '<code>pg_stat_statements</code>, then <code>EXPLAIN</code>'],
                        ['Connection pool exhaustion', 'Latency rises with concurrency; the database is idle', '<code>hikaricp.connections.pending</code>'],
                        ['A slow downstream call', 'One span dominates', 'The trace'],
                        ['No timeout on a downstream', 'Occasional very long requests', 'Client configuration'],
                        ['Serialisation of a large payload', 'CPU-bound, scales with response size', 'A profiler; Jackson frames'],
                        ['GC pressure', 'Periodic latency spikes, p99.9 much worse than p99', '<code>jvm.gc.pause</code>'],
                        ['Lock contention', 'Latency rises with concurrency, CPU does not', 'A thread dump; a lock profiler'],
                        ['A cold cache or a cold JIT', 'Slow after every deploy, then fine', 'Correlate with deployment times']
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>The top two account for a large share of everything, and both are database problems in code rather than database problems — which is why the next chapter says to look there first. A prior distribution is useful for deciding <em>which measurement to take next</em>, and it is not a substitute for taking one: the case where the answer is the ninth row and you assumed the first is exactly the case a list like this makes worse.</p>'
                }
            ],
            docs: [
                { title: 'PostgreSQL 16 — pg_stat_statements', url: 'https://www.postgresql.org/docs/16/pgstatstatements.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'observability-ops', questionId: 'latency-investigation-order' },
                { topicId: 'jpa-hibernate', questionId: 'n-plus-one' }
            ]
        },

        {
            id: 'database-first',
            title: 'Look at the Database First',
            importance: 'must-know',
            summary: 'In a typical CRUD-shaped service, most of the response time is database time. Counting queries per request is the cheapest measurement available and it finds the commonest defect.',
            interviewAngle: 'Query count per request is the specific, cheap instrument, and it detects N+1 without a profiler or a trace.',
            buildsOn: ['the-usual-suspects'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'yaml',
                    title: 'Making query count visible in development',
                    code: '# Hibernate statistics: query count, cache hits, time per query.\nspring:\n  jpa:\n    properties:\n      hibernate:\n        generate_statistics: true\nlogging:\n  level:\n    org.hibernate.stat: DEBUG\n\n# For a specific investigation, log the SQL with its parameters:\n#   org.hibernate.SQL: DEBUG\n#   org.hibernate.orm.jdbc.bind: TRACE\n\n# Better than either in a test: assert the count, so an N+1 is a\n# BUILD FAILURE rather than a production incident.\n#   datasource-proxy or QuickPerf, wrapping the DataSource:\n#   assertSelectCount(1);',
                    output: {
                        kind: 'trace',
                        lines: [
                            'A page of 20 orders that issues 21 queries is an N+1: one for the page, one per order for its customer.',
                            'The same page issuing 1 or 2 queries is correct: a join fetch, or a second query for the associations.',
                            'The signature is that the count varies with the RESULT SIZE. A fixed count is fine at any size; a proportional one is not.',
                            'Asserting the count in a test is the only defence that survives a refactor, because an N+1 is reintroduced by adding one innocuous getter call.'
                        ],
                        explain: '<p>The last line is why a test assertion beats a code review here: an N+1 is not introduced by a bad decision, it is introduced by touching an association inside a loop that somebody added for a good reason, and it looks entirely reasonable in a diff.</p>'
                    }
                },
                {
                    type: 'types',
                    title: 'Then, if the count is right and it is still slow',
                    items: [
                        { name: 'pg_stat_statements', html: '<p>Total time by normalised query. The top row is usually the answer, and it is total time rather than mean — a fast query run a million times is a bigger problem than a slow one run twice.</p>' },
                        { name: 'EXPLAIN (ANALYZE, BUFFERS)', html: '<p>The real plan with real timings. A sequential scan on a large table, or an estimate wildly different from the actual row count, is the finding.</p>' },
                        { name: 'Index usage', html: '<p><code>pg_stat_user_indexes</code>. An index nobody uses costs write time and space; a missing one costs read time.</p>' },
                        { name: 'Lock waits', html: '<p><code>pg_locks</code> joined to <code>pg_stat_activity</code>. Latency with no CPU and no I/O is usually blocking.</p>' }
                    ]
                }
            ],
            docs: [
                { title: 'PostgreSQL 16 — Using EXPLAIN', url: 'https://www.postgresql.org/docs/16/using-explain.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'sql-databases', questionId: 'reading-an-explain-plan' },
                { topicId: 'jpa-hibernate', questionId: 'n-plus-one' }
            ]
        },

        {
            id: 'thread-pool-and-connection-pool-saturation',
            title: 'Waiting, Not Working',
            importance: 'must-know',
            summary: 'Latency that rises with concurrency while CPU stays flat is queueing. The queue is a thread pool or a connection pool, and adding instances often makes it worse.',
            interviewAngle: 'The distinction between waiting and working is the diagnostic fork, and pool sizing is the fix that is counter-intuitive — smaller is often faster.',
            buildsOn: ['database-first'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>Two very different problems present as "the endpoint is slow". If the service is <strong>working</strong>, CPU is high and a profiler shows where. If it is <strong>waiting</strong>, CPU is low, latency scales with concurrency, and the time is spent queueing for a bounded resource.</p><p>The second is far more common in a typical service, and the resource is usually the connection pool — which the metrics module already identified: <code>hikaricp.connections.pending</code> above zero means threads are blocked waiting for a connection, and every symptom above the pool looks like a slow database that is in fact idle.</p>'
                },
                {
                    type: 'table',
                    title: 'Telling them apart',
                    headers: ['Observation', 'Waiting', 'Working'],
                    rows: [
                        ['CPU utilisation', 'Low', 'High'],
                        ['Latency against concurrency', '<strong>Rises</strong>', 'Roughly flat until saturation'],
                        ['Thread dump', 'Threads <code>WAITING</code> or <code>TIMED_WAITING</code>', 'Threads <code>RUNNABLE</code>'],
                        ['Adding instances', '<strong>Often makes it worse</strong> — more contenders for the same pool', 'Helps'],
                        ['The fix', 'Size the pool, or remove the contention', 'Optimise the code']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A bigger connection pool is usually slower, not faster.</strong> The database can execute a limited number of queries concurrently — roughly bounded by cores and disk — and beyond that, more connections mean more context switching, more lock contention and more memory per connection, with no more work done. HikariCP\'s own guidance is a small pool: something near <code>cores × 2</code> for the database, often ten or fewer per instance. Teams routinely set 100 and are slower for it.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Little\'s law makes the sizing arithmetic rather than a guess: <strong>concurrency = throughput × latency</strong>. To sustain 200 requests per second where each holds a connection for 20 ms, you need <code>200 × 0.02 = 4</code> connections. If the pool is 50 and only 4 are ever busy, the pool is not the bottleneck and the problem is elsewhere — which is itself a useful measurement.</p>'
                }
            ],
            docs: [
                { title: 'HikariCP — Pool Sizing', url: 'https://github.com/brettwooldridge/HikariCP/wiki/About-Pool-Sizing', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'sql-databases', questionId: 'connection-pool-sizing' },
                { topicId: 'concurrency', questionId: 'thread-pool-sizing' }
            ]
        },

        {
            id: 'serialization-cost',
            title: 'Serialisation and Payload Size',
            importance: 'should-know',
            summary: 'Turning objects into JSON is real CPU, and it scales with the size of what you return. The fix is almost always to return less rather than to serialise faster.',
            interviewAngle: 'The point that generalises is that the cheapest byte is the one you do not send — pagination and field selection beat every serialiser optimisation.',
            buildsOn: ['thread-pool-and-connection-pool-saturation'],
            blocks: [
                {
                    type: 'types',
                    title: 'Where the cost comes from, and what to do',
                    items: [
                        { name: 'Returning too much', html: '<p>An endpoint returning ten thousand rows because nobody paginated it. <strong>Cap the page size server-side</strong>; this is the whole problem in most cases.</p>' },
                        { name: 'Returning fields nobody uses', html: '<p>A DTO with forty fields for a list view that shows four. Projections, or a sparse-fieldset parameter.</p>' },
                        { name: 'Serialising an entity graph', html: '<p>Jackson touches a lazy association and triggers loading, so the serialisation cost includes queries. The DTO rule from the architecture module.</p>' },
                        { name: 'No compression', html: '<p>JSON compresses extremely well — often 80–90%. <code>server.compression.enabled=true</code> is one line and it is off by default.</p>' },
                        { name: 'The serialiser itself', html: '<p>Jackson is fast and is rarely the bottleneck. Reach for a binary format when the profiler says so, not before.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>Streaming is the answer for a genuinely large response: return a <code>StreamingResponseBody</code>, or write with a Jackson <code>SequenceWriter</code>, so memory stays constant and the client receives the first bytes immediately. Building a hundred-megabyte string in the heap to send it is the same mistake as the large-file chapter in the I/O module, on the way out instead of the way in.</p>'
                }
            ],
            docs: [
                { title: 'Spring — HTTP Streaming', url: 'https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-ann-async.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'rest-api', questionId: 'large-payloads-and-streaming' },
                { topicId: 'rest-api', questionId: 'pagination' }
            ]
        },

        {
            id: 'load-testing',
            title: 'Load Testing',
            importance: 'should-know',
            summary: 'Find the point at which the system stops behaving, before your users do. The results are only meaningful if the data volume and the access pattern resemble production.',
            interviewAngle: 'The realism caveat is the substance: a load test against ten thousand rows tells you nothing about a table with fifty million, because the plan is different.',
            buildsOn: ['serialization-cost'],
            blocks: [
                {
                    type: 'table',
                    title: 'Four kinds of test, answering four questions',
                    headers: ['Kind', 'Question', 'Shape'],
                    rows: [
                        ['Load', 'Does it meet the SLO at expected traffic?', 'Steady, at the target rate'],
                        ['Stress', '<strong>Where does it break, and how?</strong>', 'Ramp until it fails'],
                        ['Spike', 'Does it survive a sudden surge?', 'Instant jump, then hold'],
                        ['Soak', 'Does it degrade over hours?', 'Moderate load for 8–24 hours — <strong>this is what finds leaks</strong>']
                    ]
                },
                {
                    type: 'types',
                    title: 'What makes the numbers meaningful — or not',
                    items: [
                        { name: 'Production-like data volume', html: '<p><strong>The most important one.</strong> A query is fast on ten thousand rows and does a sequential scan on fifty million. Testing against a small dataset measures the wrong plan.</p>' },
                        { name: 'A realistic access distribution', html: '<p>Real traffic is skewed — a few hot keys, a long tail. Uniform random access has a cache hit rate nothing like production\'s.</p>' },
                        { name: 'Warm-up excluded', html: '<p>The first minute is JIT compilation and cold caches. Discard it or you are measuring startup.</p>' },
                        { name: 'Realistic think time', html: '<p>A closed-loop test with no pause between requests is a different workload from real users, and it self-limits: when the system slows, the test sends less.</p>' },
                        { name: 'Downstreams behaving realistically', html: '<p>Mocked dependencies that answer in a microsecond remove the timeouts, the pools and the queueing you were testing.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Coordinated omission makes most load-test latency numbers optimistic.</strong> A closed-loop generator that waits for a response before sending the next request stops issuing load exactly when the system is slow — so the slow period is under-sampled and the reported p99 is much better than reality. Open-model tools such as k6 and Gatling send at a fixed rate regardless, which is why their numbers are harsher and more honest.</p>'
                }
            ],
            docs: [
                { title: 'k6 — Test types', url: 'https://grafana.com/docs/k6/latest/using-k6/scenarios/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'observability-ops', questionId: 'latency-investigation-order' }
            ]
        },

        {
            id: 'capacity-estimation',
            title: 'Capacity Estimation',
            importance: 'should-know',
            summary: 'Back-of-the-envelope arithmetic from a traffic figure to instances, connections and storage. It is a design-round staple and it is four multiplications.',
            interviewAngle: 'Doing the arithmetic out loud, with stated assumptions, is what the question is testing — not the accuracy of the result.',
            buildsOn: ['load-testing'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'bash',
                    title: 'A worked estimate, with the assumptions stated',
                    code: '# GIVEN: 10 million orders a day.\n\n# 1. Average rate\n10_000_000 / 86_400  ~= 116 orders/second\n\n# 2. Peak. Traffic is never flat; 3-5x average is a normal assumption\n#    for consumer traffic with a daily peak.\n116 * 4              ~= 460 orders/second at peak\n\n# 3. Read/write ratio. Each order is read perhaps 20 times -- the\n#    customer checks it, support looks, fulfilment reads it.\nwrites 460/s, reads ~9,200/s\n\n# 4. Instances. Say 50ms per write request, and Little is law:\n#    concurrency = throughput x latency\n460 * 0.05           = 23 concurrent requests\n#    At 50 usable threads per instance, 1 instance handles it -- so the\n#    instance count is driven by REDUNDANCY, not by throughput.\n#    Three, across zones.\n\n# 5. Connections. 23 concurrent requests each holding a connection for\n#    ~20ms of database time:\n460 * 0.02           ~= 10 connections at peak, across the fleet.\n\n# 6. Storage. 2 KB per order, 3 years, plus indexes at ~30%.\n10_000_000 * 2_000 * 365 * 3 * 1.3   ~= 28 TB\n#    -> partition by month; archive beyond 12 months.',
                    notes: '<p>The instructive line is step 4: the throughput arithmetic says one instance, so the answer is three for redundancy rather than for load. Saying that out loud — "capacity is not the constraint here, availability is" — is worth more in a design round than a bigger number.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>State every assumption as you use it and round aggressively. The interviewer is checking whether you can decompose a number and notice which term dominates — not whether the answer is right. "I am assuming a 4× peak and 20 reads per write; if the peak is 10× this changes by a factor of two and a half" is a better answer than a precise figure with unstated assumptions.</p>'
                }
            ],
            docs: [
                { title: 'Latency Numbers Every Programmer Should Know', url: 'https://colin-scott.github.io/personal_website/research/interactive_latency.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'caching-scale', questionId: 'scaling-reads-and-writes' }
            ]
        },

        {
            id: 'a-worked-investigation',
            title: 'A Worked Investigation',
            importance: 'must-know',
            summary: 'One alert, followed to a cause, with the measurement at each step and the hypotheses that were eliminated. The method from the first chapter, executed.',
            interviewAngle: 'This is the shape of the answer to "tell me about a performance problem you solved", and the eliminations matter as much as the finding.',
            buildsOn: ['capacity-estimation'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p><strong>The alert.</strong> p99 on <code>GET /api/orders</code> went from 180 ms to 3.2 s over about two hours. p50 moved from 40 ms to 55 ms. Error rate unchanged.</p><p>The p50/p99 divergence is the first useful fact: the typical request is nearly fine and a minority are very slow, which points at contention or a data-dependent path rather than at code that got slower for everybody.</p>'
                },
                {
                    type: 'types',
                    title: 'The steps, and what each one eliminated',
                    items: [
                        { name: '1. Correlate with deployments', html: '<p>No deploy in six hours. <strong>Eliminates</strong> a code change, which is otherwise the first suspect.</p>' },
                        { name: '2. Check CPU and GC', html: '<p>CPU 30%. <code>jvm.gc.pause</code> unchanged. <strong>Eliminates</strong> working-too-hard and GC pressure — this is waiting, not working.</p>' },
                        { name: '3. Check the pools', html: '<p><code>hikaricp.connections.pending</code> averaging 12, previously 0. <strong>Found the queue.</strong> Threads are waiting for a database connection.</p>' },
                        { name: '4. Check the database', html: '<p>Database CPU 25%, no lock waits. So the pool is exhausted <em>not</em> because the database is overloaded — connections are being held for too long by someone.</p>' },
                        { name: '5. Read a trace of a slow request', html: '<p>One span, <code>select … from orders where customer_id = ?</code>, 2.9 s. Same query at p50 takes 8 ms.</p>' },
                        { name: '6. EXPLAIN it, for a slow customer', html: '<p>Index scan on <code>customer_id</code>, then a filter and a sort discarding 340,000 rows. The index is used and returns far too much.</p>' },
                        { name: '7. Find what changed', html: '<p>A single customer — a marketplace seller — crossed 300,000 orders overnight. <strong>The data changed, not the code.</strong></p>' }
                    ]
                },
                {
                    type: 'prose',
                    html: '<p><strong>The cause.</strong> The query filtered by <code>customer_id</code> and sorted by <code>placed_at</code> with a limit. The index covered <code>customer_id</code> only, so for a customer with 300,000 orders the database read all of them and sorted to find twenty. Every other customer had a few hundred and the same plan was instant.</p><p><strong>The fix.</strong> A composite index on <code>(customer_id, placed_at desc)</code>, which lets the index supply the order and stop after twenty rows. p99 returned to 190 ms. <strong>The follow-up</strong> was a statement timeout, so a single pathological query can no longer hold a connection for three seconds, and an alert on <code>connections.pending</code> so the queue is visible before the latency is.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The two things that make this a good story in an interview are that <strong>the data changed rather than the code</strong> — which is the case people forget to consider and the reason step 1 is worth doing early — and that the fix came with a <strong>guard</strong>. A statement timeout and an alert mean the next query with this shape degrades one request instead of the whole service, which is the difference between fixing an incident and fixing a class of incident.</p>'
                }
            ],
            docs: [
                { title: 'PostgreSQL 16 — Indexes and ORDER BY', url: 'https://www.postgresql.org/docs/16/indexes-ordering.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'observability-ops', questionId: 'latency-investigation-order' },
                { topicId: 'sql-databases', questionId: 'composite-index-column-order' },
                { topicId: 'behavioural-project', questionId: 'hardest-bug' }
            ]
        }
    ]
};
