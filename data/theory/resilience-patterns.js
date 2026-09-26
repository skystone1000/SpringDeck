/* ==========================================================================
   data/theory/resilience-patterns.js — module 65 in the reading path

   Eight chapters, and the plan's tagline is the framing: circuit breaker,
   bulkhead, rate limiter — what each one actually prevents. They are
   routinely discussed as interchangeable "resilience" and they are not; each
   one addresses a specific failure the previous module described, and using
   the wrong one leaves the failure in place.

   Two chapters are about getting it wrong rather than getting it right.
   Sizing a circuit breaker, because default thresholds either never open or
   open on ordinary noise; and fallbacks that lie, which is the most damaging
   mistake available here because it converts a visible outage into a silent
   wrong answer.
   ========================================================================== */

const resiliencePatternsModule = {
    id: 'resilience-patterns',
    trackId: 'distributed',
    order: 65,
    title: 'Resilience Patterns',
    tagline: 'Circuit breaker, bulkhead, rate limiter — what each one actually prevents.',
    estimatedMinutes: 40,
    prerequisites: ['sync-communication'],
    docHub: { title: 'Resilience4j', url: 'https://resilience4j.readme.io/docs/getting-started' },

    chapters: [
        {
            id: 'circuit-breaker-states',
            title: 'The Three States',
            importance: 'must-know',
            summary: 'Closed, open, half-open. It stops calling a dependency that is failing, which protects the caller\'s threads and gives the dependency room to recover.',
            interviewAngle: 'Everybody can name the states. The distinguishing points are that the breaker protects the CALLER first, and what half-open is actually for.',
            buildsOn: [],
            blocks: [
                {
                    type: 'diagram',
                    diagramType: 'flowchart',
                    title: 'The state machine',
                    diagramConfig: {
                        nodes: [
                            { id: 'closed', label: 'CLOSED\ncalls pass through',        kind: 'start' },
                            { id: 'open',   label: 'OPEN\nfail immediately',            kind: 'decision' },
                            { id: 'half',   label: 'HALF-OPEN\na few probe calls',      kind: 'process' }
                        ],
                        edges: [
                            { from: 'closed', to: 'open',   label: 'failure rate over threshold' },
                            { from: 'open',   to: 'half',   label: 'after waitDuration' },
                            { from: 'half',   to: 'closed', label: 'probes succeed' },
                            { from: 'half',   to: 'open',   label: 'a probe fails' }
                        ]
                    }
                },
                {
                    type: 'types',
                    title: 'What each state is doing',
                    items: [
                        { name: 'Closed', html: '<p>Normal. Calls pass through and outcomes are recorded in a sliding window.</p>' },
                        { name: 'Open', html: '<p>Calls <strong>fail immediately</strong> without touching the network. No thread is held, no connection is used, and the failing dependency receives no traffic at all.</p>' },
                        { name: 'Half-open', html: '<p>After a wait, a small number of probe calls are allowed. Success closes the breaker; a failure opens it again. This is what stops a recovering service being hit by full traffic the instant it comes back.</p>' }
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>The framing that separates a good answer: <strong>a circuit breaker protects the caller before it protects the callee.</strong> An open breaker means the caller\'s threads are not blocked on a dependency that is not going to answer — which is precisely the cascading failure from the previous module, prevented at the source. The relief the failing service gets is a genuine second benefit, and it is not the primary one.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A breaker on a call you cannot do without turns a slow failure into a fast one, and nothing more.</strong> That is often the right trade — a fast, clear error beats a thirty-second hang for both the user and the thread pool — but it is worth being explicit that the breaker did not make the feature work. Only a fallback or a degraded path does that, and the chapter on fallbacks is about how easily that goes wrong.</p>'
                }
            ],
            docs: [
                { title: 'Resilience4j — CircuitBreaker', url: 'https://resilience4j.readme.io/docs/circuitbreaker', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'microservices', questionId: 'circuit-breaker-states' }
            ]
        },

        {
            id: 'sizing-a-circuit-breaker',
            title: 'Sizing One',
            importance: 'should-know',
            summary: 'Failure-rate threshold, window size, minimum calls and wait duration. Defaults either never open under real traffic or open on ordinary noise, and both failures are quiet.',
            interviewAngle: 'Having actually tuned one is visible in this answer. The minimum-calls setting is the one that decides whether the breaker is meaningful at low traffic.',
            buildsOn: ['circuit-breaker-states'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The settings, with the reasoning for each number',
                    code: 'CircuitBreakerConfig config = CircuitBreakerConfig.custom()\n\n        // 50% is the usual starting point. Below ~30% you open on\n        // ordinary noise; above ~70% you tolerate a mostly-broken\n        // dependency for a long time.\n        .failureRateThreshold(50)\n\n        // COUNT_BASED is predictable; TIME_BASED handles bursty traffic\n        // better because the window is a duration rather than a count.\n        .slidingWindowType(COUNT_BASED)\n        .slidingWindowSize(100)\n\n        // THE SETTING THAT DECIDES WHETHER THIS WORKS AT LOW TRAFFIC.\n        // With minimumNumberOfCalls=10, two failures out of three do\n        // NOT open the breaker -- three calls is not evidence.\n        .minimumNumberOfCalls(20)\n\n        // How long to stay open. Long enough for a restart or a\n        // failover; short enough that recovery is noticed quickly.\n        .waitDurationInOpenState(Duration.ofSeconds(30))\n        .permittedNumberOfCallsInHalfOpenState(5)\n\n        // A SLOW call is a failure. Without this, a dependency that\n        // answers everything in 29 seconds never trips the breaker\n        // and consumes every thread you have.\n        .slowCallRateThreshold(50)\n        .slowCallDurationThreshold(Duration.ofSeconds(3))\n\n        // 4xx is the CALLER is fault. Counting it opens the breaker\n        // because somebody sent a malformed request.\n        .ignoreExceptions(HttpClientErrorException.class)\n        .build();',
                    notes: '<p>The slow-call threshold is the setting most often left out and it closes the largest remaining hole. A breaker configured only on exceptions is blind to the failure mode that actually causes cascading outages, which is a dependency that is responding — successfully — just before every timeout.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>A breaker per <strong>dependency</strong>, not per method and not per service. Two endpoints on the same downstream share a fate; two different downstreams do not, and one breaker over both means a failure in either stops calls to the healthy one. Resilience4j names instances, and the name should be the thing that fails together.</p>'
                }
            ],
            docs: [
                { title: 'Resilience4j — CircuitBreaker configuration', url: 'https://resilience4j.readme.io/docs/circuitbreaker', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'microservices', questionId: 'circuit-breaker-states' }
            ]
        },

        {
            id: 'bulkhead',
            title: 'Bulkhead',
            importance: 'must-know',
            summary: 'Named after a ship\'s compartments: a bounded, separate pool per dependency, so one flooded compartment does not sink the vessel.',
            interviewAngle: 'The pattern that directly addresses the "unrelated endpoints also fail" property of a cascade, and the one most often missing in practice.',
            buildsOn: ['sizing-a-circuit-breaker'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>A circuit breaker stops calling a dependency <em>after</em> it has been shown to be failing. A bulkhead limits how much of your capacity that dependency can consume <em>while</em> it is failing — including during the window before the breaker opens, and including for a dependency that is merely slow rather than erroring.</p><p>Concretely: pricing gets at most twenty concurrent calls. When pricing hangs, twenty threads are held and the remaining hundred and eighty continue serving every other endpoint. The failure is contained to the feature that depends on it, which is exactly the property the cascade chapter said was missing.</p>'
                },
                {
                    type: 'comparison',
                    title: 'Two implementations, and they are not equivalent',
                    left: 'Semaphore bulkhead',
                    right: 'Thread-pool bulkhead',
                    rows: [
                        { aspect: 'Mechanism', left: 'A permit count on the calling thread', right: 'A separate pool the work is submitted to' },
                        { aspect: 'Runs on', left: 'The caller\'s thread', right: 'A bulkhead thread' },
                        { aspect: 'Cost', left: 'Almost none', right: 'Threads, plus a context switch' },
                        { aspect: 'Timeouts', left: 'Relies on the client\'s own timeout', right: 'Can enforce one independently' },
                        { aspect: 'ThreadLocal context', left: 'Preserved — <code>SecurityContext</code>, MDC, the transaction', right: '<strong>Lost unless propagated</strong>' },
                        { aspect: 'Default choice', left: '<strong>Yes</strong>', right: 'When you need to bound the wait independently' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>Bulkheads apply below the HTTP layer too, and that is where they are most often absent. <strong>A separate connection pool per workload against the same database</strong> — one for request-serving, one for the nightly report — means a runaway report cannot exhaust the connections the API needs. Same pattern, same argument, and it is usually a configuration change rather than code.</p>'
                }
            ],
            docs: [
                { title: 'Resilience4j — Bulkhead', url: 'https://resilience4j.readme.io/docs/bulkhead', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'microservices', questionId: 'bulkhead-isolation' }
            ]
        },

        {
            id: 'rate-limiter',
            title: 'Rate Limiter',
            importance: 'should-know',
            summary: 'Bounds calls per unit of time. It is the outbound twin of the edge rate limiting from the security track, and it is what respects a partner\'s quota.',
            interviewAngle: 'The distinction from a bulkhead is the one to be precise about: concurrency against throughput. They constrain different things and neither substitutes for the other.',
            buildsOn: ['bulkhead'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'The three limits, and what each one bounds',
                    left: 'Bulkhead',
                    right: 'Rate limiter',
                    rows: [
                        { aspect: 'Bounds', left: '<strong>Concurrency</strong> — how many at once', right: '<strong>Throughput</strong> — how many per second' },
                        { aspect: 'Protects', left: 'Your own capacity', right: 'The downstream\'s quota, or its capacity' },
                        { aspect: 'A slow dependency', left: 'Contained — the permits are held', right: 'Not contained — slow calls consume no rate' },
                        { aspect: 'A fast dependency under load', left: 'Not contained — calls return quickly', right: 'Contained' },
                        { aspect: 'Typical driver', left: 'Your thread pool', right: 'A contractual limit, or a 429' }
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>They are complementary because they fail to cover each other\'s case. A dependency answering in 30 seconds consumes almost no <em>rate</em> and all of your <em>concurrency</em>; a dependency answering in 2 milliseconds consumes almost no concurrency and can blow through a quota in a second. A partner API with "100 requests per minute" in the contract needs a rate limiter; your own thread pool needs a bulkhead; and a system with only one of them has an uncovered failure mode.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Resilience4j\'s rate limiter is <strong>per instance</strong>, which is a real limitation worth stating: ten pods each limited to 100 per minute is 1,000 per minute against the partner. For a contractual quota the limiter has to be distributed — a Redis token bucket keyed by the partner — or the per-instance limit has to be the quota divided by the replica count, which then breaks when the deployment scales.</p>'
                }
            ],
            docs: [
                { title: 'Resilience4j — RateLimiter', url: 'https://resilience4j.readme.io/docs/ratelimiter', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'caching-scale', questionId: 'rate-limiting-algorithms' }
            ]
        },

        {
            id: 'fallbacks-that-lie',
            title: 'Fallbacks That Lie',
            importance: 'must-know',
            summary: 'A fallback returning plausible wrong data converts a visible outage into a silent incorrect answer. The second is worse, and it is found by a customer rather than a dashboard.',
            interviewAngle: 'The judgement chapter of the module. Being able to say "I would not add a fallback here" is a stronger answer than knowing the annotation.',
            buildsOn: ['rate-limiter'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Three fallbacks: dangerous, acceptable, and honest',
                    code: '// DANGEROUS. A stale price is a financial error the customer accepts\n// and finance discovers. The outage was better.\n@CircuitBreaker(name = "pricing", fallbackMethod = "lastKnownPrice")\nPrice price(Sku sku) { return client.price(sku); }\n\nPrice lastKnownPrice(Sku sku, Throwable t) {\n    return cache.get(sku);        // from when? nobody knows\n}\n\n// DANGEROUS in the other direction. An empty list is indistinguishable\n// from "no results", so a caller cannot tell a failure from a fact.\nList<Flag> flags(UserId id) { ... }\nList<Flag> noFlags(UserId id, Throwable t) { return List.of(); }\n\n// ACCEPTABLE. The feature is optional, the absence is visible in the\n// UI, and nothing downstream can mistake it for data.\n@CircuitBreaker(name = "recs", fallbackMethod = "noRecommendations")\nRecommendations recommend(UserId id) { return client.recommend(id); }\n\nRecommendations noRecommendations(UserId id, Throwable t) {\n    log.warn("recommendations unavailable", t);\n    return Recommendations.unavailable();      // a DISTINCT state\n}\n\n// HONEST. No fallback. Fail fast with a clear error, and let the\n// caller decide -- which for a payment is the only correct answer.\n@CircuitBreaker(name = "payments")\nAuthorisation authorise(Payment p) { return gateway.authorise(p); }',
                    notes: '<p><code>Recommendations.unavailable()</code> rather than an empty list is the whole technique. A distinct "we could not check" state can be rendered differently, logged differently, and cannot be silently treated as "there is nothing". The empty collection is the same value the successful case can return, and that ambiguity is where the damage happens.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A fallback that calls another service has moved the problem, not solved it.</strong> The fallback path is usually untested, usually less well provisioned, and — critically — is exercised for the first time at exactly the moment the system is already under stress. The dependency it calls is often the same one that is struggling. If a fallback path matters, it needs the same timeouts, the same breaker and the same load testing as the primary path, and most fallback paths have none of those.</p>'
                }
            ],
            docs: [
                { title: 'Avoiding fallback in distributed systems', url: 'https://aws.amazon.com/builders-library/avoiding-fallback-in-distributed-systems/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'microservices', questionId: 'circuit-breaker-states' }
            ]
        },

        {
            id: 'resilience4j-in-spring-boot',
            title: 'Resilience4j in Spring Boot',
            importance: 'should-know',
            summary: 'Annotations backed by an aspect, configured in application.yml, with metrics for every instance. And the same proxy caveat as every other Spring annotation.',
            interviewAngle: 'The practical half. The self-invocation trap applies here exactly as it does to @Transactional, and it is the first thing that goes wrong.',
            buildsOn: ['fallbacks-that-lie'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'yaml',
                    title: 'Configuration, with a shared default and a per-instance override',
                    code: 'resilience4j:\n  circuitbreaker:\n    configs:\n      default:\n        slidingWindowType: TIME_BASED\n        slidingWindowSize: 60\n        minimumNumberOfCalls: 20\n        failureRateThreshold: 50\n        slowCallDurationThreshold: 3s\n        slowCallRateThreshold: 50\n        waitDurationInOpenState: 30s\n        registerHealthIndicator: true      # shows up in /actuator/health\n    instances:\n      pricing:\n        baseConfig: default\n      payments:\n        baseConfig: default\n        failureRateThreshold: 30           # less tolerant: money\n        waitDurationInOpenState: 10s\n\n  bulkhead:\n    instances:\n      pricing:\n        maxConcurrentCalls: 20\n        maxWaitDuration: 100ms\n\n  retry:\n    instances:\n      pricing:\n        maxAttempts: 3\n        waitDuration: 200ms\n        enableExponentialBackoff: true\n        exponentialBackoffMultiplier: 2\n        retryExceptions:\n          - java.net.ConnectException\n        ignoreExceptions:\n          - org.springframework.web.client.HttpClientErrorException',
                    notes: '<p><code>registerHealthIndicator</code> is worth turning on: an open breaker then appears in <code>/actuator/health</code>, which means the state is visible to whatever already scrapes it rather than only in a metric somebody has to think to look at. Every instance also publishes Micrometer metrics — state, failure rate, buffered calls — and those are the ones to alert on.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Every one of these annotations is a proxy, so self-invocation does nothing.</strong> A public method calling an annotated method on the same bean bypasses the breaker, the bulkhead and the retry, silently — and the symptom is a resilience configuration that appears correct, publishes metrics that stay at zero, and never opens. It is the identical failure to <code>@Transactional</code>, and the identical fix: the annotated call has to cross a bean boundary.</p>'
                }
            ],
            docs: [
                { title: 'Resilience4j Spring Boot 3 Starter', url: 'https://resilience4j.readme.io/docs/getting-started-3', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'aop-proxies', questionId: 'retryable-and-resilience' },
                { topicId: 'aop-proxies', questionId: 'self-invocation' }
            ]
        },

        {
            id: 'combining-the-patterns',
            title: 'The Order They Compose In',
            importance: 'must-know',
            summary: 'Retry outside the breaker, or inside it? The order changes the behaviour materially, and the default in Resilience4j is not the one most people assume.',
            interviewAngle: 'A precise, checkable depth question. Retry inside the breaker means each retry counts as a failure, which trips the breaker several times faster.',
            buildsOn: ['resilience4j-in-spring-boot'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>Resilience4j applies its decorators in a defined order, outermost first: <strong>Retry → CircuitBreaker → RateLimiter → TimeLimiter → Bulkhead</strong>. Retry is outermost, so each attempt passes through the breaker and is recorded separately.</p><p>That is the right way round, and the reason is worth stating. With retry outside, an open breaker short-circuits every attempt instantly — three retries cost microseconds and no network traffic. With retry <em>inside</em> the breaker, one logical call contributes three failures to the window, so a breaker configured for a 50% failure rate over 100 calls actually trips at around a third of the intended real failure rate, and the wait duration is spent retrying a dependency that has been given no room to recover.</p>'
                },
                {
                    type: 'table',
                    title: 'What each layer contributes, from the outside in',
                    headers: ['Layer', 'Position', 'Contribution'],
                    rows: [
                        ['Retry', 'Outermost', 'Repeats the whole decorated call, including the breaker check'],
                        ['CircuitBreaker', 'Next', 'Short-circuits when open, so retries become free'],
                        ['RateLimiter', 'Next', 'Bounds throughput to the downstream'],
                        ['TimeLimiter', 'Next', 'Bounds the duration of a single attempt'],
                        ['Bulkhead', 'Innermost', 'Bounds concurrency at the point of the actual call']
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>You rarely need all five. The combination that covers most cases is <strong>timeout, plus bulkhead, plus circuit breaker</strong> — bound the call, bound the concurrency, stop calling when it is broken. Add retry only where the operation is genuinely safe to repeat, and add a rate limiter only where there is a quota to respect. Each additional layer is another thing to size, another metric to watch and another way for the behaviour to surprise you at three in the morning.</p>'
                }
            ],
            docs: [
                { title: 'Resilience4j — Decorators', url: 'https://resilience4j.readme.io/docs/getting-started-3', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'microservices', questionId: 'timeouts-and-retries' }
            ]
        },

        {
            id: 'load-shedding',
            title: 'Load Shedding',
            importance: 'should-know',
            summary: 'When you cannot serve everything, reject some requests quickly rather than serving all of them slowly. A queue that grows without bound serves nobody.',
            interviewAngle: 'The counter-intuitive one, and it is a strong senior answer: at saturation, rejecting work is how you keep serving the work you accept.',
            buildsOn: ['combining-the-patterns'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>At saturation, an unbounded queue is worse than a rejection. Requests wait, the clients that sent them time out and retry, the retries join the queue, and the service spends its capacity producing responses that nobody is still waiting for. Throughput collapses to zero while the CPU stays busy — the classic congestion-collapse shape.</p><p><strong>Shedding</strong> reverses it: reject at the door with a fast <code>503</code> and <code>Retry-After</code>, and the remaining capacity goes to requests that will actually be answered in time.</p>'
                },
                {
                    type: 'types',
                    title: 'Where to shed, and what each mechanism knows',
                    items: [
                        { name: 'A bounded accept queue', html: '<p>Tomcat\'s <code>accept-count</code> plus <code>max-connections</code>. Crude and effective: excess connections are refused at the socket, before any Java runs.</p>' },
                        { name: 'A deadline on arrival', html: '<p>If the request already spent 9 seconds in a queue and the client\'s budget was 10, drop it. Serving it is pure waste, and this is what a propagated deadline enables.</p>' },
                        { name: 'Priority shedding', html: '<p>Shed analytics before checkout, background before interactive, unauthenticated before authenticated. Requires a request class, and it is the most valuable form.</p>' },
                        { name: 'Adaptive concurrency', html: '<p>Measure latency and adjust the concurrency limit automatically — a TCP-Vegas-style controller. What service meshes implement, and it removes the need to guess a number.</p>' },
                        { name: 'The bulkhead\'s wait bound', html: '<p><code>maxWaitDuration</code> on a bulkhead is load shedding for one dependency: fail immediately rather than queue for a permit.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>Shed <em>early</em> and shed <em>cheaply</em>. A request rejected after authentication, three database lookups and a downstream call has already consumed most of what serving it would have cost. The order to check is: connection limit, then rate limit, then deadline, then authentication, then work — which is the same reasoning as the security track\'s "reject cheap, before doing any work", arriving from the availability side.</p>'
                }
            ],
            docs: [
                { title: 'Using load shedding to avoid overload', url: 'https://aws.amazon.com/builders-library/using-load-shedding-to-avoid-overload/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'observability-ops', questionId: 'latency-investigation-order' }
            ]
        }
    ]
};
