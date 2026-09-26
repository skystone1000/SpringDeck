/* ==========================================================================
   data/theory/sync-communication.js — module 64 in the reading path

   Seven chapters on calling another service and surviving it. The plan's
   tagline names the trap: timeouts, retries, backoff — and the retry storm
   they cause. Two of the seven chapters are about the failure mode created
   by the defences in the two before them, which is the shape of this whole
   subject.

   The timeout chapter is marked must-know and is the one to read twice. A
   missing timeout is not a missing feature; it is a thread held indefinitely
   against a pool that is finite, which is how one slow dependency becomes an
   outage in a service that is otherwise healthy.
   ========================================================================== */

const syncCommunicationModule = {
    id: 'sync-communication',
    trackId: 'distributed',
    order: 64,
    title: 'Synchronous Communication',
    tagline: 'Timeouts, retries, backoff — and the retry storm they cause.',
    estimatedMinutes: 40,
    prerequisites: ['service-boundaries'],
    docHub: { title: 'Spring — REST Clients', url: 'https://docs.spring.io/spring-framework/reference/integration/rest-clients.html' },

    chapters: [
        {
            id: 'restclient-webclient-feign',
            title: 'Choosing a Client',
            importance: 'should-know',
            summary: 'RestTemplate is in maintenance, RestClient is its modern synchronous replacement, WebClient is the reactive one, and Feign is a declarative wrapper over whichever you configure.',
            interviewAngle: 'A currency question. Knowing that RestClient arrived in Spring 6.1 and that RestTemplate is not deprecated but is in maintenance is the precise version of the answer.',
            buildsOn: [],
            blocks: [
                {
                    type: 'table',
                    title: 'The four, and what each is for',
                    headers: ['Client', 'Style', 'Status', 'Use when'],
                    rows: [
                        ['<code>RestTemplate</code>', 'Synchronous, imperative', 'Maintenance mode since Spring 5 — <strong>not deprecated</strong>', 'Existing code. No reason to migrate urgently.'],
                        ['<code>RestClient</code>', 'Synchronous, fluent', 'Spring Framework 6.1', '<strong>New synchronous code.</strong> WebClient\'s API without the reactive stack.'],
                        ['<code>WebClient</code>', 'Reactive, non-blocking', 'Current', 'A reactive application, or genuine concurrent fan-out'],
                        ['<code>@HttpExchange</code> interfaces', 'Declarative, over either', 'Spring 6', 'A typed client with no implementation to write'],
                        ['OpenFeign', 'Declarative', 'Community-maintained', 'Existing Spring Cloud code; <code>@HttpExchange</code> is the framework answer now']
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'A declarative client, with the settings that matter set once',
                    code: '// The interface IS the client. Spring generates the implementation.\ninterface PricingClient {\n    @GetExchange("/prices/{sku}")\n    Price price(@PathVariable String sku);\n}\n\n@Bean\nPricingClient pricingClient(RestClient.Builder builder) {\n    RestClient client = builder\n            .baseUrl("https://pricing.internal")\n            .requestFactory(clientRequestFactory())    // <-- the timeouts\n            .build();\n    return HttpServiceProxyFactory\n            .builderFor(RestClientAdapter.create(client))\n            .build()\n            .createClient(PricingClient.class);\n}\n\nClientHttpRequestFactory clientRequestFactory() {\n    ClientHttpRequestFactorySettings settings =\n            ClientHttpRequestFactorySettings.DEFAULTS\n                    .withConnectTimeout(Duration.ofSeconds(2))\n                    .withReadTimeout(Duration.ofSeconds(5));\n    return ClientHttpRequestFactories.get(settings);\n}',
                    notes: '<p>Configuring the request factory is the only part of this that is not optional. Every client in this table defaults to <strong>no timeout at all</strong> on at least one axis, and a declarative interface makes that easy to forget because there is no code in which to notice its absence.</p>'
                }
            ],
            docs: [
                { title: 'RestClient', url: 'https://docs.spring.io/spring-framework/reference/integration/rest-clients.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'beyond-rest', questionId: 'webclient-restclient-resttemplate' }
            ]
        },

        {
            id: 'timeouts-are-mandatory',
            title: 'Every Call Has a Timeout',
            importance: 'must-know',
            summary: 'A call with no timeout holds a thread until the operating system gives up, which can be minutes. With a finite pool, one slow dependency takes the whole service down.',
            interviewAngle: 'The single most valuable operational fact in this track. The arithmetic — pool size divided by call duration — turns it from advice into a prediction.',
            buildsOn: ['restclient-webclient-feign'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>A blocked thread is not free. It holds its stack, it holds whatever it had open — very often a database connection — and it cannot serve another request. A Tomcat with two hundred threads calling a dependency that has stopped responding will have all two hundred blocked within seconds, and at that point the service returns nothing at all, including for endpoints that never touch that dependency.</p><p>The arithmetic is worth doing out loud because it makes the failure predictable rather than surprising. <strong>Two hundred threads, a five-second call, and the service can serve forty requests per second.</strong> If the dependency slows to thirty seconds, that becomes six and a half per second, and everything else queues.</p>'
                },
                {
                    type: 'types',
                    title: 'The timeouts, and the one people set',
                    items: [
                        { name: 'Connect timeout', html: '<p>How long to wait for a TCP connection. Should be short — one or two seconds. A healthy service on the same network connects in milliseconds.</p>' },
                        { name: 'Read timeout', html: '<p>How long to wait for a response once connected. <strong>This is the one that matters</strong>, and the one that most often defaults to infinite.</p>' },
                        { name: 'Connection request timeout', html: '<p>How long to wait for a connection <em>from the pool</em>. Frequently forgotten, and it is the one that bites when the pool is exhausted: without it, threads queue for a pooled connection with no bound at all.</p>' },
                        { name: 'The whole-call budget', html: '<p>Connect plus read plus retries. This is what the caller actually experiences, and it is what has to fit inside <em>their</em> timeout.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Timeouts must decrease as you go down the call chain, and usually they do not.</strong> If the gateway waits 10 seconds, the service it calls waits 30, and the one below that waits 60, then the two lower timeouts are decoration — the caller has already given up, and the work continues, holding threads and connections for a response nobody will read. Each hop should get a budget strictly smaller than its caller\'s remaining time, which is exactly what a gRPC deadline propagates automatically and what an HTTP chain has to do by hand.</p>'
                }
            ],
            docs: [
                { title: 'Spring Boot — HTTP client configuration', url: 'https://docs.spring.io/spring-boot/reference/io/rest-client.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'microservices', questionId: 'timeouts-and-retries' }
            ]
        },

        {
            id: 'retry-and-backoff',
            title: 'Retrying, and What Not to Retry',
            importance: 'must-know',
            summary: 'Retry transient failures with exponential backoff and a small cap. Do not retry a 400, do not retry a non-idempotent write, and never retry immediately.',
            interviewAngle: 'The retry-safety question is the discriminator: a timeout on a POST may have succeeded, so retrying it may charge a card twice.',
            buildsOn: ['timeouts-are-mandatory'],
            blocks: [
                {
                    type: 'table',
                    title: 'What to retry',
                    headers: ['Failure', 'Retry?', 'Why'],
                    rows: [
                        ['Connection refused', '<strong>Yes</strong>', 'Nothing was processed. Certainly safe.'],
                        ['Connection reset, DNS failure', 'Yes', 'Transient infrastructure'],
                        ['<code>503</code>, <code>502</code>, <code>504</code>', 'Yes, with backoff', 'The service is saying it is temporarily unable'],
                        ['<code>429</code>', 'Yes — after <code>Retry-After</code>', 'The server has told you when. Honour it.'],
                        ['<strong>Read timeout</strong>', '<strong>Only if idempotent</strong>', 'The request may have been processed. This is the dangerous one.'],
                        ['<code>400</code>, <code>422</code>', 'No', 'The request is wrong. It will be wrong next time.'],
                        ['<code>401</code>, <code>403</code>', 'No', 'Retrying with the same credential changes nothing'],
                        ['<code>404</code>', 'No', 'Unless you know it is a propagation delay, and then you are guessing'],
                        ['<code>500</code>', 'Cautiously', 'Ambiguous — it may have half-completed']
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Backoff, and the retry budget the caller must live inside',
                    code: '// Exponential backoff: 200ms, 400ms, 800ms. Three attempts total.\nRetryConfig config = RetryConfig.custom()\n        .maxAttempts(3)                       // small. 3 is usually right.\n        .intervalFunction(IntervalFunction\n                .ofExponentialRandomBackoff(Duration.ofMillis(200), 2.0, 0.5))\n        .retryOnException(SyncCommunication::isTransient)\n        .build();\n\nstatic boolean isTransient(Throwable t) {\n    if (t instanceof ConnectException) return true;\n    if (t instanceof HttpServerErrorException e) {\n        return e.getStatusCode().value() != 501;\n    }\n    return false;                             // NOT 4xx, NOT read timeouts\n}\n\n// THE BUDGET. Three attempts with a 5s read timeout and this backoff\n// is a worst case of about 16.4 seconds:\n//   5s + 0.2s + 5s + 0.4s + 5s + 0.8s\n// If the CALLER times out at 10 seconds, attempt three is work nobody\n// is waiting for -- so the retry policy has to fit inside the budget,\n// not merely look reasonable on its own.',
                    notes: '<p>Three attempts is a good default and the reason is not arbitrary: the first retry catches the overwhelming majority of genuinely transient failures, the second catches most of the rest, and beyond that you are almost always retrying something that is actually broken while consuming capacity it needs to recover.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Retries multiply at every layer, and nobody adds them up.</strong> Three at the gateway, three in the service, three in the HTTP client library and three in the SDK gives eighty-one requests for one user action. Each layer looks prudent; the total is an attack on your own dependency. <strong>Retry at exactly one layer</strong> — usually the outermost one that knows whether the operation is safe to repeat — and turn it off everywhere else.</p>'
                }
            ],
            docs: [
                { title: 'Resilience4j — Retry', url: 'https://resilience4j.readme.io/docs/retry', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'microservices', questionId: 'timeouts-and-retries' }
            ]
        },

        {
            id: 'jitter-and-the-thundering-herd',
            title: 'Jitter',
            importance: 'should-know',
            summary: 'Exponential backoff without randomness makes every client retry at the same instant. The recovering service is then hit by a synchronised wave and fails again.',
            interviewAngle: 'A small detail with a big effect, and naming it unprompted signals having read the operational literature rather than a tutorial.',
            buildsOn: ['retry-and-backoff'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>Suppose a thousand clients fail at the same moment — the dependency restarted, or a network partition healed. With backoff of 200ms, 400ms, 800ms and no randomness, all thousand retry at 200ms, all thousand retry at 600ms, and all thousand retry at 1400ms. The recovering service is hit by three synchronised spikes of a thousand requests, fails under each, and the clients synchronise further.</p><p><strong>Jitter</strong> spreads them. With full jitter — a random wait uniformly between zero and the computed backoff — the same thousand clients spread across the interval, and the service sees a load it can absorb.</p>'
                },
                {
                    type: 'table',
                    title: 'The variants',
                    headers: ['Strategy', 'Wait for attempt n', 'Note'],
                    rows: [
                        ['No jitter', '<code>base × 2^n</code>', 'Synchronised. Do not use under any load.'],
                        ['Full jitter', '<code>random(0, base × 2^n)</code>', 'Best spread; some retries are very fast'],
                        ['Equal jitter', '<code>half + random(0, half)</code>', 'Spread, with a guaranteed minimum wait'],
                        ['Decorrelated jitter', '<code>random(base, previous × 3)</code>', 'AWS\'s recommendation; good spread and bounded growth']
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>The same reasoning applies well beyond retries, and noticing that is the senior version of this answer. Cache entries that all expire at the same second cause a stampede; scheduled jobs that all fire on the minute cause a load spike; clients that all reconnect after a deployment cause a connection storm; TTLs that are all exactly 3600 seconds cause a synchronised refresh. <strong>Anything periodic and shared should be jittered.</strong></p>'
                }
            ],
            docs: [
                { title: 'Exponential Backoff and Jitter', url: 'https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'caching-scale', questionId: 'cache-stampede' }
            ]
        },

        {
            id: 'connection-pooling-for-http-clients',
            title: 'Pooling the Connections',
            importance: 'should-know',
            summary: 'A TCP handshake plus a TLS handshake is one to two round trips before any bytes of your request. Pooling amortises that, and an exhausted pool blocks exactly like a missing timeout.',
            interviewAngle: 'The connection-request timeout is the detail that shows experience: without it, pool exhaustion produces an unbounded queue rather than a fast failure.',
            buildsOn: ['jitter-and-the-thundering-herd'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'A pooled client, and the three limits that matter',
                    code: 'PoolingHttpClientConnectionManager pool =\n        PoolingHttpClientConnectionManagerBuilder.create()\n                .setMaxConnTotal(200)          // across all hosts\n                .setMaxConnPerRoute(50)        // per host -- the usual default\n                .build();                      // of 5 is far too low\n\nRequestConfig requests = RequestConfig.custom()\n        .setConnectionRequestTimeout(Timeout.ofSeconds(1))  // <-- from the POOL\n        .setResponseTimeout(Timeout.ofSeconds(5))\n        .build();\n\nCloseableHttpClient httpClient = HttpClients.custom()\n        .setConnectionManager(pool)\n        .setDefaultRequestConfig(requests)\n        .build();\n\n// Without the connectionRequestTimeout, a thread waiting for a pooled\n// connection waits FOREVER -- which reproduces the no-timeout failure\n// one level up, and is much harder to see because the read timeout is\n// configured and looks correct.',
                    notes: '<p>The default max-per-route in Apache HttpClient has historically been very small, and it is the classic cause of "the service is slow but the dependency is fine": five concurrent connections to one host, everything else queuing for a connection, and every dashboard on both sides showing healthy latency because the waiting happens before the request is sent.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Size the pool from the arithmetic in the timeout chapter rather than by feel. To sustain 100 requests per second against a dependency with a 50ms p99, you need about <strong>five</strong> concurrent connections — <code>throughput × latency</code>. Sizing it at two hundred "to be safe" mostly means you can queue two hundred requests against a dependency that is already struggling, which is the opposite of safe.</p>'
                }
            ],
            docs: [
                { title: 'Spring Boot — HTTP Clients', url: 'https://docs.spring.io/spring-boot/reference/io/rest-client.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'sql-databases', questionId: 'connection-pool-sizing' }
            ]
        },

        {
            id: 'cascading-failure',
            title: 'Cascading Failure',
            importance: 'must-know',
            summary: 'One slow service fills its callers\' thread pools; those callers become slow, filling theirs. The failure travels backwards up the call graph, and every intermediate service looks healthy.',
            interviewAngle: 'The systems-level consequence of the previous four chapters, and the motivation for everything in the next module.',
            buildsOn: ['connection-pooling-for-http-clients'],
            blocks: [
                {
                    type: 'diagram',
                    diagramType: 'flowchart',
                    title: 'How one slow dependency becomes a total outage',
                    diagramConfig: {
                        nodes: [
                            { id: 'slow',  label: 'Pricing slows\n50ms → 30s',        kind: 'start' },
                            { id: 'hold',  label: 'Orders threads\nblock on the call', kind: 'process' },
                            { id: 'full',  label: 'Orders pool full\nqueue grows',     kind: 'process' },
                            { id: 'orders',label: 'Orders now slow\nfor EVERY endpoint', kind: 'decision' },
                            { id: 'gw',    label: 'Gateway threads\nblock on Orders',  kind: 'process' },
                            { id: 'out',   label: 'Whole platform\nunavailable',       kind: 'end' }
                        ],
                        edges: [
                            { from: 'slow',   to: 'hold' },
                            { from: 'hold',   to: 'full' },
                            { from: 'full',   to: 'orders' },
                            { from: 'orders', to: 'gw',   label: 'backwards up the graph' },
                            { from: 'gw',     to: 'out' },
                            { from: 'orders', to: 'out',  label: 'endpoints that never call pricing also fail' }
                        ]
                    }
                },
                {
                    type: 'prose',
                    html: '<p>Two things about this are worth internalising. The failure travels <strong>backwards</strong> — from the dependency towards the user — which is the opposite of the direction people look when a page stops loading. And it spreads to <strong>unrelated functionality</strong>: an endpoint that never calls pricing fails anyway, because it needs a thread and there are none.</p><p>That second property is why the incident is so confusing. Every service reports healthy dependencies, every dashboard shows low error rates for a while, and the symptom is latency everywhere with no obvious cause.</p>'
                },
                {
                    type: 'types',
                    title: 'The four defences, in the order to reach for them',
                    items: [
                        { name: 'Timeouts', html: '<p>Bound how long a thread can be held. Necessary, and not sufficient — a 5-second timeout still lets a slow dependency consume the pool.</p>' },
                        { name: 'Circuit breakers', html: '<p>Stop calling a dependency that is failing, so the threads are never held at all. The next module.</p>' },
                        { name: 'Bulkheads', html: '<p>A separate, bounded pool per dependency, so pricing can only ever consume its own share. This is what stops the spread to unrelated endpoints.</p>' },
                        { name: 'Load shedding', html: '<p>Reject work you cannot complete rather than queueing it. Fast failure preserves the capacity to serve what you can.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>Virtual threads change the arithmetic and not the problem. A million blocked virtual threads cost almost nothing in memory, so the thread pool stops being the binding constraint — but the database connections, the HTTP connections and the downstream service\'s capacity are all still finite. The queue moves rather than disappearing, and a request queued for thirty seconds is still a failed request. Bulkheads and breakers remain necessary.</p>'
                }
            ],
            docs: [
                { title: 'Avoiding fallback in distributed systems', url: 'https://aws.amazon.com/builders-library/avoiding-fallback-in-distributed-systems/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'microservices', questionId: 'circuit-breaker-states' },
                { topicId: 'microservices', questionId: 'bulkhead-isolation' }
            ]
        },

        {
            id: 'graceful-degradation',
            title: 'Degrading on Purpose',
            importance: 'should-know',
            summary: 'Decide in advance which dependencies are optional and what the product does without them. A checkout that cannot show recommendations should still take the order.',
            interviewAngle: 'A product-flavoured engineering answer. Classifying dependencies as critical or optional before the incident is what makes degradation possible at all.',
            buildsOn: ['cascading-failure'],
            blocks: [
                {
                    type: 'table',
                    title: 'Classify every dependency, in advance',
                    headers: ['Dependency of a checkout', 'Critical?', 'Behaviour when it is down'],
                    rows: [
                        ['Payment gateway', '<strong>Critical</strong>', 'Fail the checkout. There is no useful degraded version.'],
                        ['Inventory', 'Critical', 'Fail, or accept and reconcile — a deliberate product decision'],
                        ['Pricing', 'Critical', 'Fail. Guessing a price is worse than an error.'],
                        ['Tax calculation', 'Depends', 'A cached rate may be acceptable; in some jurisdictions it is not'],
                        ['Recommendations', 'Optional', 'Render an empty panel. Nobody notices.'],
                        ['Loyalty points', 'Optional', 'Accept the order, award points asynchronously'],
                        ['Fraud scoring', 'Optional, with care', 'Accept and review later, up to a value threshold'],
                        ['Analytics events', 'Optional', 'Drop them, or buffer']
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>The exercise is more valuable than any code it produces. Once every dependency is classified, three things follow immediately: the optional ones get a fallback and a short timeout, the critical ones get a circuit breaker and a clear error, and anything sitting in the middle is a <em>product</em> conversation that is much better had on a quiet afternoon than during an incident.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A fallback that returns plausible wrong data is worse than an error.</strong> Returning a cached price from last week, a default tax rate, or an empty list where "no results" and "we could not check" are indistinguishable — each of those turns a visible failure into a silent incorrect answer, and the second one is found by a customer rather than by a dashboard. Degrade to <em>less</em>, never to <em>wrong</em>: an empty recommendations panel is degradation; a stale price is a defect.</p>'
                }
            ],
            docs: [
                { title: 'Avoiding fallback in distributed systems', url: 'https://aws.amazon.com/builders-library/avoiding-fallback-in-distributed-systems/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'microservices', questionId: 'circuit-breaker-states' }
            ]
        }
    ]
};
