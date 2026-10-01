/* ==========================================================================
   data/theory/metrics-and-tracing.js — module 78 in the reading path

   The plan's tagline is the organising idea: the three signals, and the one
   question each answers. Eight chapters, and the framing matters because
   teams routinely try to answer a metrics question with logs, which is
   expensive, or a logs question with metrics, which is impossible.

   The cardinality chapter is the one with a cost attached. A label taking
   user ids does not merely produce a large metric — it produces one time
   series per user, and it is the standard way a monitoring bill and a
   Prometheus server both fall over.

   Context propagation was covered in platform-concerns and is not repeated
   here; this module's tracing chapters are about the standard and the
   sampling decision rather than the ThreadLocal problem.
   ========================================================================== */

const metricsAndTracingModule = {
    id: 'metrics-and-tracing',
    trackId: 'production',
    order: 78,
    title: 'Metrics, Traces and Correlation',
    tagline: 'The three signals, and the one question each answers.',
    estimatedMinutes: 40,
    prerequisites: ['actuator-and-health'],
    docHub: { title: 'Micrometer', url: 'https://docs.micrometer.io/micrometer/reference/' },

    chapters: [
        {
            id: 'metrics-logs-traces',
            title: 'Three Signals, Three Questions',
            importance: 'must-know',
            summary: 'Metrics answer "is something wrong". Traces answer "where". Logs answer "why". Using one to do another\'s job is either impossible or expensive.',
            interviewAngle: 'The framing is the answer. It also explains the investigation order, which is the next module\'s subject.',
            buildsOn: [],
            blocks: [
                {
                    type: 'table',
                    title: 'What each is for',
                    headers: ['Signal', 'Answers', 'Shape', 'Cost'],
                    rows: [
                        ['<strong>Metrics</strong>', 'Is something wrong? Since when?', 'Numbers over time, aggregated', 'Cheap, and bounded by cardinality'],
                        ['<strong>Traces</strong>', 'Where in the system is the time going?', 'A tree of spans per request', 'Moderate; usually sampled'],
                        ['<strong>Logs</strong>', 'Why did this particular thing happen?', 'Events with context', '<strong>Expensive at volume</strong>'],
                        ['Profiles', 'Which code is consuming the CPU?', 'Stack samples', 'Cheap with modern always-on profilers']
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>The order they are used in follows from the table and is worth stating as a procedure: <strong>an alert fires on a metric, a trace shows which hop is slow or failing, and the logs for that trace id say why.</strong> Each step narrows the search by an order of magnitude.</p><p>The two substitutions that go wrong are both common. Counting log lines to produce a metric is enormously more expensive than a counter and much slower to query. And trying to explain a specific failure from metrics alone is impossible, because aggregation has already discarded the individual event.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The three are only useful together if they share identifiers. A trace id in every log line and on every span, and a version and instance tag on metrics, is what lets you move between them — without that you have three separate tools and three separate investigations, which is the state most systems are actually in.</p>'
                }
            ],
            docs: [
                { title: 'Spring Boot — Observability', url: 'https://docs.spring.io/spring-boot/reference/actuator/observability.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'observability-ops', questionId: 'debugging-production' }
            ]
        },

        {
            id: 'micrometer-and-meter-types',
            title: 'Micrometer and the Meter Types',
            importance: 'must-know',
            summary: 'A vendor-neutral facade over a monitoring system — SLF4J for metrics. Five meter types, and choosing the wrong one loses the information you wanted.',
            interviewAngle: 'Counter versus gauge is the standard question, and the discriminator is that a gauge is sampled so anything between samples is invisible.',
            buildsOn: ['metrics-logs-traces'],
            blocks: [
                {
                    type: 'table',
                    title: 'The meter types',
                    headers: ['Type', 'Represents', 'Use for', 'Trap'],
                    rows: [
                        ['<code>Counter</code>', 'A monotonically increasing count', 'Requests, errors, messages consumed', 'Never decrement. Query the <em>rate</em>, not the value.'],
                        ['<code>Gauge</code>', 'A value sampled at scrape time', 'Queue depth, pool size, cache entries', '<strong>Sampled — a spike between scrapes is invisible</strong>'],
                        ['<code>Timer</code>', 'Count plus total time plus distribution', 'Latency of anything', 'Publishing full percentiles per instance is expensive'],
                        ['<code>DistributionSummary</code>', 'A distribution of non-time values', 'Payload sizes, batch sizes', 'Same cost consideration as a timer'],
                        ['<code>LongTaskTimer</code>', 'Duration of things <em>still running</em>', 'A long import, a batch job', 'A normal timer records nothing until the task ends']
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Registering meters, and the gauge reference trap',
                    code: 'private final Counter placed;\nprivate final Timer  pricing;\n\nOrderMetrics(MeterRegistry registry, Queue<Job> queue) {\n    this.placed = Counter.builder("orders.placed")\n            .description("Orders accepted")\n            .tag("channel", "web")\n            .register(registry);\n\n    this.pricing = Timer.builder("pricing.duration")\n            .publishPercentileHistogram()      // let the backend aggregate\n            .register(registry);\n\n    // A GAUGE HOLDS A WEAK REFERENCE. If nothing else keeps `queue`\n    // alive it is collected and the gauge reports NaN forever -- a\n    // metric that silently stops reporting with no error anywhere.\n    Gauge.builder("jobs.queued", queue, Collection::size).register(registry);\n}\n\nvoid place(Order order) {\n    placed.increment();\n    Money price = pricing.record(() -> pricingService.quote(order));\n}',
                    notes: '<p>The weak reference is deliberate — a registry that strongly held every gauged object would be a memory leak — and it is a genuine trap: the gauge is registered against a field on a bean, the bean is fine, but a gauge registered against a local or a temporary object stops reporting as soon as it is collected.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Prefer <code>publishPercentileHistogram()</code> over <code>publishPercentiles(0.95, 0.99)</code>. The first ships histogram buckets and lets the backend compute percentiles <em>across instances</em>; the second computes them per instance, and <strong>percentiles cannot be averaged</strong> — the mean of ten instances\' p99 is not the p99 of the fleet, and it is systematically optimistic.</p>'
                }
            ],
            docs: [
                { title: 'Micrometer Concepts', url: 'https://docs.micrometer.io/micrometer/reference/concepts.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'observability-ops', questionId: 'micrometer-and-cardinality' }
            ]
        },

        {
            id: 'useful-service-metrics',
            title: 'What to Actually Measure',
            importance: 'must-know',
            summary: 'Request rate, error rate, latency distribution, and saturation of every bounded resource. Most of it Spring Boot already publishes and nobody looks at.',
            interviewAngle: 'Naming the pool-saturation metrics is the practical signal, because thread pool and connection pool exhaustion is the most common cause of a slow service.',
            buildsOn: ['micrometer-and-meter-types'],
            blocks: [
                {
                    type: 'table',
                    title: 'The metrics that answer an incident, most of them already present',
                    headers: ['Metric', 'Published by', 'What it tells you'],
                    rows: [
                        ['<code>http.server.requests</code>', 'Boot, automatically', 'Rate, errors and latency by URI, method and status'],
                        ['<code>hikaricp.connections.pending</code>', 'Boot, with HikariCP', '<strong>Threads waiting for a connection — pool exhaustion</strong>'],
                        ['<code>hikaricp.connections.active</code>', 'Boot', 'How much of the pool is in use'],
                        ['<code>executor.queued</code>, <code>executor.active</code>', 'Boot, for managed executors', 'Thread pool saturation'],
                        ['<code>jvm.memory.used</code>, <code>jvm.gc.pause</code>', 'Boot', 'Heap pressure and GC cost'],
                        ['<code>kafka.consumer.fetch.manager.records.lag.max</code>', 'The Kafka client', 'Consumer lag'],
                        ['<code>resilience4j.circuitbreaker.state</code>', 'Resilience4j', 'Which breakers are open'],
                        ['Business counters', '<strong>You</strong>', 'Orders placed, payments declined — the ones an outage is measured in']
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>The last row is the one teams add last and miss most. Technical metrics tell you the system is behaving oddly; a business counter tells you whether it <strong>matters</strong>. "Orders placed per minute has been zero for eight minutes" is an alert anybody can act on, and it catches failures that every technical metric misses — a validation change that rejects every request returns 400s, which is not an error rate spike in most alerting rules.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong><code>hikaricp.connections.pending</code> above zero for any sustained period is the single most diagnostic metric in a typical Spring service.</strong> It means threads are blocked waiting for a database connection, which presents as slow endpoints with a database that reports itself perfectly healthy. It is published by default, it is almost never on a dashboard, and it identifies a whole class of incident immediately.</p>'
                }
            ],
            docs: [
                { title: 'Supported Metrics and Meters', url: 'https://docs.spring.io/spring-boot/reference/actuator/metrics.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'observability-ops', questionId: 'what-to-alert-on' },
                { topicId: 'sql-databases', questionId: 'connection-pool-sizing' }
            ]
        },

        {
            id: 'red-and-use-methods',
            title: 'RED and USE',
            importance: 'should-know',
            summary: 'Two checklists. RED — rate, errors, duration — for a service. USE — utilisation, saturation, errors — for a resource. Between them they cover most of what a dashboard needs.',
            interviewAngle: 'Having a named framework for what to put on a dashboard is a structure signal, and it prevents the dashboard of forty graphs nobody reads.',
            buildsOn: ['useful-service-metrics'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'Two checklists for two kinds of thing',
                    left: 'RED — for a service',
                    right: 'USE — for a resource',
                    rows: [
                        { aspect: 'First', left: '<strong>R</strong>ate — requests per second', right: '<strong>U</strong>tilisation — how busy, as a percentage' },
                        { aspect: 'Second', left: '<strong>E</strong>rrors — failed requests per second', right: '<strong>S</strong>aturation — <strong>how much work is queued</strong>' },
                        { aspect: 'Third', left: '<strong>D</strong>uration — the latency distribution', right: '<strong>E</strong>rrors — of the resource itself' },
                        { aspect: 'Applies to', left: 'An endpoint, a service, a consumer', right: 'A CPU, a pool, a disk, a queue' },
                        { aspect: 'Answers', left: 'Are users being served?', right: 'Is this component the constraint?' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>Saturation is the one that predicts rather than reports, and it is the reason USE is worth knowing. Utilisation at 100% tells you a resource is busy now; a growing <em>queue</em> for it tells you demand exceeds capacity and the situation is getting worse. <code>connections.pending</code>, <code>executor.queued</code> and consumer lag are all saturation measures, and they go up before the latency does.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A dashboard with forty graphs is one nobody reads during an incident.</strong> RED for the service at the top — three panels — then USE for each bounded resource below it. If a graph has never been looked at during an incident, it is decoration, and its presence makes the useful panels harder to find at the moment that matters most.</p>'
                }
            ],
            docs: [
                { title: 'The RED Method', url: 'https://grafana.com/blog/2018/08/02/the-red-method-how-to-instrument-your-services/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'observability-ops', questionId: 'what-to-alert-on' }
            ]
        },

        {
            id: 'prometheus-and-cardinality',
            title: 'Cardinality',
            importance: 'must-know',
            summary: 'Every distinct combination of label values is a separate time series. A label taking user ids creates one series per user, and that is how a monitoring system falls over.',
            interviewAngle: 'A cost and stability problem with a precise mechanism, and the multiplication arithmetic makes it concrete in one line.',
            buildsOn: ['red-and-use-methods'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>Prometheus stores one time series per unique combination of metric name and label values. <code>http_server_requests{uri="/orders", method="GET", status="200"}</code> is one series; change any label and it is another.</p><p>The cost multiplies. Ten URIs times four methods times six statuses is 240 series, which is fine. Add a <code>userId</code> label with a hundred thousand users and it is 24 million — each with its own memory, its own index entry and its own retention, and the scrape itself becomes enormous.</p>'
                },
                {
                    type: 'table',
                    title: 'Safe and unsafe label values',
                    headers: ['Label', 'Cardinality', 'Verdict'],
                    rows: [
                        ['HTTP method', '~7', 'Safe'],
                        ['Status code', '~30', 'Safe'],
                        ['Templated URI — <code>/orders/{id}</code>', 'The number of routes', 'Safe — <strong>and this is why the template matters</strong>'],
                        ['<strong>Raw URI — <code>/orders/8812</code></strong>', '<strong>Unbounded</strong>', '<strong>Never</strong>'],
                        ['User id, order id, session id, trace id', 'Unbounded', '<strong>Never</strong>'],
                        ['Tenant id', 'The number of tenants', 'Careful — fine at 50, not at 500,000'],
                        ['An exception message', 'Unbounded — it contains values', '<strong>Never.</strong> The exception <em>class</em> is fine.']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Spring Boot templates the URI tag for you, and only when the request matched a mapping.</strong> A request to a path with no handler is tagged <code>uri="NOT_FOUND"</code> rather than the raw path, which is deliberate protection — a bot scanning ten thousand URLs would otherwise create ten thousand series. Writing a custom tag from <code>request.getRequestURI()</code> removes that protection, and it is a common and expensive well-intentioned change.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>High-cardinality context belongs in <strong>traces and logs</strong>, which are per-event and can hold a user id, an order id and a full message. Metrics are aggregates and must stay low-cardinality. That division is the practical form of the three-signals table at the start of the module — and remembering it prevents the most expensive mistake in observability.</p>'
                }
            ],
            docs: [
                { title: 'Prometheus — Naming and labels', url: 'https://prometheus.io/docs/practices/naming/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'observability-ops', questionId: 'micrometer-and-cardinality' }
            ]
        },

        {
            id: 'opentelemetry-and-context-propagation',
            title: 'OpenTelemetry and the Observation API',
            importance: 'should-know',
            summary: 'One standard for all three signals, with a collector between the application and the backend. Micrometer\'s Observation API produces a metric and a span from one instrumentation.',
            interviewAngle: 'The current-practice answer. Instrumenting once and getting both signals is the design that replaced separate Micrometer and Sleuth instrumentation.',
            buildsOn: ['prometheus-and-cardinality'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>OpenTelemetry is a vendor-neutral specification covering metrics, traces and logs, with SDKs per language and a <strong>collector</strong> that sits between applications and backends. The collector is the part with the most operational value: applications export to it, and it batches, enriches, samples and routes — so changing monitoring vendor is a collector configuration change rather than a redeploy of every service.</p><p>On the Spring side, Micrometer\'s <strong>Observation API</strong> is the unification: one <code>Observation</code> around a piece of work produces a timer <em>and</em> a span, so instrumenting something once yields both signals with consistent names and tags.</p>'
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'One observation, two signals',
                    code: '@Service\nclass PricingService {\n\n    private final ObservationRegistry registry;\n\n    Money quote(Sku sku, int quantity) {\n        return Observation.createNotStarted("pricing.quote", registry)\n                // LOW cardinality -> becomes a metric tag AND a span tag\n                .lowCardinalityKeyValue("channel", "web")\n                // HIGH cardinality -> span tag ONLY, never a metric label\n                .highCardinalityKeyValue("sku", sku.value())\n                .observe(() -> calculate(sku, quantity));\n    }\n}\n\n// The API makes the cardinality rule from the previous chapter part of\n// the type system rather than a convention: you must choose which kind\n// of key you are adding, and the high-cardinality ones cannot reach\n// the metrics backend.',
                    notes: '<p>The two key methods are the reason to prefer this API over calling the timer and the tracer separately. The cardinality decision is made once, at the call site, in a way that is visible in review — rather than being a rule somebody has to remember about a metric tag they are adding months later.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Context propagation across threads and services was covered in the platform module and is the same mechanism here: a <code>ThreadLocal</code> that does not survive <code>@Async</code>, a reactive chain or a Kafka listener without help. The Observation API integrates with the context-propagation library, which is what makes an observation started in a controller still be the parent of one started in an async task.</p>'
                }
            ],
            docs: [
                { title: 'Micrometer Observation', url: 'https://docs.micrometer.io/micrometer/reference/observation.html', kind: 'guide' },
                { title: 'OpenTelemetry', url: 'https://opentelemetry.io/docs/what-is-opentelemetry/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'microservices', questionId: 'distributed-tracing' }
            ]
        },

        {
            id: 'correlation-ids',
            title: 'Correlation Ids',
            importance: 'must-know',
            summary: 'One identifier on every log line for a request, across every service. It is the cheapest observability improvement available and it is missing from most systems.',
            interviewAngle: 'Concrete and immediately useful. The refinement is that a trace id serves as the correlation id, so the two are one mechanism rather than two.',
            buildsOn: ['opentelemetry-and-context-propagation'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'yaml',
                    title: 'The whole implementation, in configuration',
                    code: '# With Micrometer Tracing on the classpath, Spring Boot puts traceId\n# and spanId into the MDC automatically. This one line then puts them\n# into every log record.\nlogging:\n  pattern:\n    level: "%5p [${spring.application.name:},%X{traceId:-},%X{spanId:-}]"\n\n# Output:\n# INFO  [orders,4bf92f3577b34da6a3ce929d0e0e4736,00f067aa0ba902b7]\n#       Reserving stock for ord_8812\n\n# The SAME traceId appears in the pricing service, the inventory\n# service and the trace backend -- so one search finds every log line\n# for one user action across the whole system.',
                    notes: '<p>Using the trace id as the correlation id rather than generating a separate one is the right choice: it is already propagated by the tracing instrumentation, it is already on every span, and it means a log search and a trace search return the same request. A separately generated correlation id is a second thing to propagate that does nothing the first does not.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Return the trace id to the client — in a response header, and in the <code>ProblemDetail</code> body from the error-handling module. A support ticket that says "error, reference 4bf92f35" turns a two-day investigation into one query, and it costs one line in the exception handler.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>The MDC is a <code>ThreadLocal</code> and must be cleared, or a pooled thread carries the previous request\'s ids into the next one\'s log lines.</strong> Spring\'s instrumentation handles the request path; code that puts values into the MDC by hand — in a filter, a scheduled job, a Kafka listener — must remove them in a <code>finally</code>. The symptom is log lines attributed to the wrong request, which is worse than no correlation at all because it is confidently wrong.</p>'
                }
            ],
            docs: [
                { title: 'Spring Boot — Logging with tracing', url: 'https://docs.spring.io/spring-boot/reference/features/logging.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'observability-ops', questionId: 'correlation-ids-and-structured-logs' }
            ]
        },

        {
            id: 'sampling',
            title: 'Sampling',
            importance: 'should-know',
            summary: 'Tracing every request is expensive to store and query. Head-based sampling decides at the first service; tail-based decides after the trace completes and can keep the interesting ones.',
            interviewAngle: 'The head-versus-tail distinction is the depth, and the consequence — a 10% head sample misses 90% of your slow requests — is what makes it matter.',
            buildsOn: ['correlation-ids'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'Deciding before, or after',
                    left: 'Head-based',
                    right: 'Tail-based',
                    rows: [
                        { aspect: 'Decided', left: 'At the first service, before anything happens', right: 'In the collector, after the trace is complete' },
                        { aspect: 'Propagated', left: 'Yes — every service honours the decision', right: 'N/A — everything is sent, then filtered' },
                        { aspect: 'Can keep slow or failed traces', left: '<strong>No — it does not know yet</strong>', right: '<strong>Yes. That is the point.</strong>' },
                        { aspect: 'Network and collector cost', left: 'Low — unsampled traces are never sent', right: 'High — every span is sent, then discarded' },
                        { aspect: 'Trace completeness', left: 'Complete or absent', right: 'Complete' },
                        { aspect: 'Complexity', left: 'A probability setting', right: 'A collector holding traces in memory until they finish' }
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>The consequence of head-based sampling is the one that surprises people: at 10%, <strong>90% of your slow requests have no trace</strong>. The decision was made before anybody knew the request would be slow, so the traces you keep are a uniform random sample of ordinary traffic — exactly the traffic you did not need to investigate.</p><p>Tail-based sampling inverts it: send everything to the collector, hold each trace until it completes, then keep the ones that errored or exceeded a latency threshold plus a small random sample of the rest. You get the interesting traces and pay in collector memory and network.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>A pragmatic middle position that needs no tail-based infrastructure: <strong>always sample errors</strong>. Micrometer and OpenTelemetry both allow a custom sampler, and forcing a sampling decision of "keep" when a request fails gives you a trace for every error while keeping the overall rate low. It covers the most valuable half of what tail-based sampling would have given you.</p>'
                }
            ],
            docs: [
                { title: 'OpenTelemetry — Sampling', url: 'https://opentelemetry.io/docs/concepts/sampling/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'observability-ops', questionId: 'debugging-production' }
            ]
        }
    ]
};
