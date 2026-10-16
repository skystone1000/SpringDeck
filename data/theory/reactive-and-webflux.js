/* ==========================================================================
   data/theory/reactive-and-webflux.js — module 41 in the reading path

   Seven chapters, and it deliberately does not teach Reactor. It teaches
   enough to hold a design conversation and to answer the question that is
   actually asked in 2025 and later, which is whether to use it at all now
   that virtual threads exist. The virtual-threads module argues the same
   comparison from the other side; this one owns the reactive half.
   ========================================================================== */

const reactiveAndWebfluxModule = {
    id: 'reactive-and-webflux',
    trackId: 'web-api',
    order: 41,
    title: 'Reactive, and When Not To',
    tagline: 'WebFlux next to virtual threads: the honest comparison.',
    estimatedMinutes: 40,
    prerequisites: ['virtual-threads', 'dispatcher-lifecycle'],
    docHub: { title: 'Spring WebFlux', url: 'https://docs.spring.io/spring-framework/reference/web/webflux.html' },

    chapters: [
        {
            id: 'why-reactive-existed',
            title: 'The Problem It Was Built For',
            importance: 'must-know',
            summary: 'A thread per request, one megabyte of stack each, and ten thousand concurrent connections. Reactive was the answer available in 2013 and its cost was the programming model.',
            interviewAngle: 'Framing the answer historically is what makes the rest of the module credible. Reactive was not a fashion — it solved a real constraint — and saying so before criticising it is what separates judgement from dismissal.',
            buildsOn: [],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>A servlet container assigns a thread to a request for its whole duration. If the request spends 200ms waiting on a database, that thread is parked and holding a megabyte of stack for 200ms. Serving ten thousand concurrent requests therefore needs ten thousand platform threads, which the operating system will not give you cheaply. The thread was the scarce resource.</p><p>The reactive answer is to stop assigning threads to requests. A small event loop — one thread per core — processes callbacks as data arrives, so a waiting request occupies no thread at all. It works, it scales to very large connection counts on small machines, and the price is that the request no longer has a call stack of its own.</p>'
                },
                {
                    type: 'types',
                    title: 'What "no call stack" costs, concretely',
                    items: [
                        { name: 'Stack traces', html: '<p>The trace belongs to the event loop, not to the request. Reactor rebuilds a partial one when debug mode is on, at a cost, and it is still not the stack you wanted.</p>' },
                        { name: 'The debugger', html: '<p>Stepping through an operator chain steps through the framework, not through the logic.</p>' },
                        { name: 'try/finally and try-with-resources', html: '<p>Both are stack-scoped and neither survives the hop. Their replacements are operators — <code>doFinally</code>, <code>using</code>.</p>' },
                        { name: 'ThreadLocal', html: '<p>The work moves between threads, so anything thread-scoped — MDC, the security context, transaction synchronisation — has to be carried explicitly through the <code>Context</code>.</p>' },
                        { name: 'The whole stack must comply', html: '<p><strong>The largest cost.</strong> One blocking driver anywhere in the chain reintroduces the problem, so the JDBC driver, the HTTP client and every library have to be non-blocking too.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>Open with the history, because it earns the criticism that follows: <em>"Reactive solved a real problem — thread-per-request did not scale to tens of thousands of connections, and the thread was the expensive thing. It paid for that with the debugger, the stack trace and a requirement that every library in the stack be non-blocking. Virtual threads solve the same problem without the price, which changes when I would reach for it — not whether it was worth building."</em></p>'
                }
            ],
            docs: [
                { title: 'Spring WebFlux — Overview', url: 'https://docs.spring.io/spring-framework/reference/web/webflux/new-framework.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'concurrency', questionId: 'virtual-threads-vs-reactive' }
            ]
        },

        {
            id: 'mono-and-flux',
            title: 'Mono and Flux',
            importance: 'should-know',
            summary: 'A publisher of at most one, and a publisher of many. Nothing happens until something subscribes, which is the fact that explains most beginner bugs.',
            interviewAngle: 'The vocabulary question. The one thing worth stating precisely is laziness: a chain that is built and never subscribed to does nothing at all, silently, and that is the failure people meet first.',
            buildsOn: ['why-reactive-existed'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The shape, and the mistake',
                    code: 'Mono<Invoice>  one  = repository.findById(id);      // 0 or 1\nFlux<Invoice>  many = repository.findByCustomer(c);  // 0..n\n\n// map is a plain function; flatMap is one returning a publisher --\n// exactly the Optional and Stream distinction, and thenCompose\'s.\nMono<Profile> profile = users.findById(id)\n        .flatMap(user -> orders.countFor(user))     // async\n        .map(count -> new Profile(id, count))       // plain\n        .switchIfEmpty(Mono.error(new UserNotFound(id)));\n\n// NOTHING RUNS HERE. This statement builds a chain and discards it.\nauditRepository.save(entry);\n\n// The controller returning the publisher IS the subscribe. Spring does it.\n@PostMapping("/audit")\nMono<Void> audit(@RequestBody Entry entry) {\n    return auditRepository.save(entry).then();\n}',
                    output: {
                        kind: 'trace',
                        lines: [
                            'A Mono or Flux is a description of work, not the work. Assembling operators registers intent and executes nothing.',
                            'Subscription is what starts it, and in a WebFlux controller the framework subscribes to whatever the handler returns.',
                            'So a publisher that is created and not returned -- not subscribed, not composed into the returned chain -- is a no-op, with no warning anywhere.',
                            'That is the single most common first bug in reactive code: a save that never happens, in a method that compiles and passes review.'
                        ],
                        explain: '<p>The rule that prevents it is mechanical: <strong>every publisher must be returned or composed into something that is returned.</strong> A bare statement whose value is a <code>Mono</code> is always a bug. Some static analysis catches it; the habit catches it more reliably.</p>'
                    }
                },
                {
                    type: 'tip',
                    html: '<p>If the interviewer asks about operators, anchor them to things already known rather than listing: <code>map</code> is <code>Stream.map</code>, <code>flatMap</code> is <code>Stream.flatMap</code> and <code>CompletableFuture.thenCompose</code>, <code>zip</code> is <code>thenCombine</code>. The novelty in Reactor is not the operators — it is laziness and backpressure.</p>'
                }
            ],
            docs: [
                { title: 'Reactor Core — Flux and Mono', url: 'https://projectreactor.io/docs/core/release/reference/coreFeatures.html', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'backpressure',
            title: 'Backpressure',
            importance: 'must-know',
            summary: 'The subscriber asks for n items and the publisher sends at most n. It is the one capability reactive has that virtual threads do not.',
            interviewAngle: 'The most valuable chapter in this module, because it is the honest answer to "are virtual threads not just better". Backpressure composes across a pipeline and across a network boundary, and nothing in the blocking model does that.',
            buildsOn: ['mono-and-flux'],
            blocks: [
                {
                    type: 'definition',
                    term: 'Backpressure',
                    important: true,
                    html: '<p>A protocol in which the <em>consumer</em> controls the rate: it signals demand — "send me at most 32 more" — and the producer may not exceed it. The alternative is that the producer sets the rate and the consumer buffers, which works until the buffer is the heap.</p>'
                },
                {
                    type: 'prose',
                    html: '<p>The Reactive Streams specification is four interfaces, and <code>Subscription.request(n)</code> is the one that matters. Demand flows backward along the whole chain: a slow database writer at the end of a pipeline requests less, the operator before it requests less from its source, and eventually the HTTP client stops reading from the socket — at which point TCP\'s own flow control slows the <em>remote</em> server. The pressure reaches across the network without anything being written to make it.</p><p>That is the capability with no equivalent in the blocking model. A semaphore bounds concurrency at one point; it does not propagate a rate through five stages and out to a producer on another machine.</p>'
                },
                {
                    type: 'types',
                    title: 'What to do when the producer will not slow down',
                    items: [
                        { name: 'onBackpressureBuffer', html: '<p>Queue the excess. <strong>Bound it</strong> — an unbounded buffer is the <code>LinkedBlockingQueue</code> problem from the executors module, in a new place.</p>' },
                        { name: 'onBackpressureDrop', html: '<p>Discard what does not fit. Correct for a live metric or a price tick, where the newest value supersedes the old.</p>' },
                        { name: 'onBackpressureLatest', html: '<p>Keep only the most recent. A gauge rather than a stream.</p>' },
                        { name: 'onBackpressureError', html: '<p>Fail fast. Honest, and it makes the overload visible instead of absorbing it.</p>' },
                        { name: 'limitRate(n)', html: '<p>Cap demand from an operator that would otherwise request unbounded — which several do by default.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>This is the chapter to have ready for the virtual-threads comparison: <em>"Virtual threads make blocking cheap, so the thread is no longer the bottleneck. They do not give me backpressure — if a producer is faster than a consumer, something still has to buffer, and the bound has to be built by hand. Reactive propagates demand through the pipeline and out over the socket. When the problem is streaming with a rate mismatch, that is a real difference and not a stylistic one."</em></p>'
                }
            ],
            docs: [
                { title: 'Reactive Streams Specification', url: 'https://www.reactive-streams.org/', kind: 'spec' }
            ],
            relatedQuestions: [
                { topicId: 'concurrency', questionId: 'virtual-threads-vs-reactive' }
            ]
        },

        {
            id: 'blocking-in-a-reactive-chain',
            title: 'One Blocking Call Ruins It',
            importance: 'must-know',
            summary: 'A blocking call on an event-loop thread stalls every other request that loop is serving, and there are only as many loops as cores.',
            interviewAngle: 'The failure mode that decides whether a team should adopt reactive at all. Being able to explain why it is catastrophic rather than merely slow — one thread, hundreds of requests — is the answer.',
            buildsOn: ['mono-and-flux'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The bug, and the escape hatch',
                    code: '@GetMapping("/invoices/{id}")\nMono<Invoice> get(@PathVariable String id) {\n    // JDBC is blocking. This runs ON THE EVENT LOOP.\n    Invoice invoice = jdbcRepository.findById(id);      // WRONG\n    return Mono.just(invoice);\n}\n\n// If a blocking call is unavoidable, move it off the loop.\n@GetMapping("/invoices/{id}")\nMono<Invoice> get(@PathVariable String id) {\n    return Mono.fromCallable(() -> jdbcRepository.findById(id))\n               .subscribeOn(Schedulers.boundedElastic());\n}',
                    output: {
                        kind: 'trace',
                        lines: [
                            'Netty runs one event loop per core -- four threads on a four-core container.',
                            'Each loop is multiplexing hundreds or thousands of connections, so blocking one for 200ms stalls every request it is responsible for, not just this one.',
                            'The symptom is a latency graph where p99 is enormous while CPU sits near idle, which reads as a network problem.',
                            'boundedElastic is a real workaround and not a fix: the work now occupies a pooled platform thread, which is the thread-per-request model reappearing behind a reactive facade.'
                        ],
                        explain: '<p>BlockHound is the tool for this: an agent that instruments the JVM and throws when a blocking call happens on a non-blocking thread. It is worth running in tests on any reactive service, because the defect is invisible until it is under load and then looks like something else.</p>'
                    }
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A reactive web layer over a blocking data layer is the worst of both.</strong> It is the most common way WebFlux is adopted — controllers return <code>Mono</code>, the repository is JPA — and it keeps every cost of reactive while delivering none of the benefit, because the scarce resource is still a pooled thread waiting on JDBC. If the persistence layer cannot be R2DBC or another non-blocking client, that is a strong argument against the whole choice.</p>'
                }
            ],
            docs: [
                { title: 'Reactor — Schedulers', url: 'https://projectreactor.io/docs/core/release/reference/coreFeatures/schedulers.html', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'webclient-and-restclient',
            title: 'WebClient Without WebFlux',
            importance: 'should-know',
            summary: 'WebClient works in a blocking application and was for years the best HTTP client available. RestClient now covers that case with the same fluent API.',
            interviewAngle: 'A practical question about a real transitional situation: plenty of MVC codebases use WebClient with .block(). Knowing why that was reasonable, and what replaced it, is a current-practice signal.',
            buildsOn: ['blocking-in-a-reactive-chain'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>Adding <code>spring-boot-starter-webflux</code> to a servlet application does not make it reactive — Boot chooses the application type from what is on the class path, and <code>spring-boot-starter-web</code> wins. So a great many MVC codebases pulled WebFlux in purely for <code>WebClient</code>, called <code>.block()</code>, and were entirely correct to: it was the modern client, and <code>RestTemplate</code> had been in maintenance mode since Spring 5.</p>'
                },
                {
                    type: 'comparison',
                    title: 'Which client, now',
                    left: 'WebClient',
                    right: 'RestClient',
                    rows: [
                        { aspect: 'Since', left: 'Spring 5.0', right: 'Spring 6.1' },
                        { aspect: 'Model', left: 'Reactive; <code>.block()</code> to use synchronously', right: 'Blocking, with the same fluent API' },
                        { aspect: 'Brings in', left: 'The whole WebFlux dependency', right: 'Nothing extra' },
                        { aspect: 'Streams a response', left: '<strong>Yes</strong>, with backpressure', right: 'No' },
                        { aspect: 'Right for', left: 'A reactive application, or a streamed response', right: '<strong>New blocking code</strong>' },
                        { aspect: 'With virtual threads', left: 'Works, and the reactive machinery buys nothing', right: 'The natural pairing' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Calling <code>.block()</code> on a WebClient chain from inside a reactive handler deadlocks or throws.</strong> Reactor detects blocking on a non-blocking thread and raises an error rather than hanging, which is a kindness. The rule is simple and absolute: <code>.block()</code> is for the boundary of a blocking application, never inside a reactive chain.</p>'
                }
            ],
            docs: [
                { title: 'WebClient', url: 'https://docs.spring.io/spring-framework/reference/web/webflux-webclient.html', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'reactive-vs-virtual-threads',
            title: 'The Comparison, Made Once',
            importance: 'must-know',
            summary: 'Both release the thread during IO. Virtual threads keep the stack trace and the debugger; reactive keeps backpressure and streaming. That is the entire trade.',
            interviewAngle: 'Asked in senior rounds since Java 21, and the wrong answer in both directions is a strong opinion with no qualification. The one-sentence version: virtual threads for request-response, reactive for streaming with a rate mismatch.',
            buildsOn: ['backpressure'],
            blocks: [
                {
                    type: 'table',
                    title: 'Where each one is genuinely better',
                    headers: ['The problem', 'Better answer', 'Why'],
                    rows: [
                        ['Many concurrent blocking calls', '<strong>Virtual threads</strong>', 'Same result, ordinary code, keeps the debugger'],
                        ['A fan-out to several services', '<strong>Virtual threads</strong>', 'Structured concurrency, or plain parallel calls'],
                        ['Streaming with a slow consumer', '<strong>Reactive</strong>', 'Backpressure propagates; nothing else does'],
                        ['An event pipeline with several stages', '<strong>Reactive</strong>', 'Composable operators and per-stage demand'],
                        ['Tens of thousands of idle connections', 'Either', 'Both hold them cheaply now'],
                        ['An existing non-blocking stack', '<strong>Reactive</strong>', 'There is no reason to rewrite what works'],
                        ['A CPU-bound service', 'Neither', 'The work needs cores, and both are about waiting']
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>The most useful framing is that virtual threads removed the <em>motivation</em> most teams had for adopting reactive, without removing everything reactive does. If the reason was "we cannot afford a thread per request", that reason is gone. If the reason was backpressure across a streaming pipeline, it is intact — and it was always the smaller of the two populations.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Commit and qualify, in that order: <em>"For a typical request-response service on Java 21, virtual threads — same throughput, a fraction of the complexity, and the stack trace tells me which request failed. I would still choose reactive for a streaming pipeline that needs backpressure, and I would not rewrite a working WebFlux service to prove a point."</em></p>'
                }
            ],
            docs: [
                { title: 'JEP 444: Virtual Threads', url: 'https://openjdk.org/jeps/444', kind: 'spec' }
            ],
            relatedQuestions: [
                { topicId: 'concurrency', questionId: 'virtual-threads-vs-reactive' }
            ]
        },

        {
            id: 'when-webflux-is-the-wrong-answer',
            title: 'When It Is the Wrong Answer',
            importance: 'should-know',
            summary: 'Four conditions that each make reactive a poor choice, and one of them is about the team rather than the technology.',
            interviewAngle: 'A judgement question, and the team condition is the one that shows seniority. A stack the team cannot debug at 3am is a production risk regardless of its throughput.',
            buildsOn: ['reactive-vs-virtual-threads'],
            blocks: [
                {
                    type: 'types',
                    title: 'The four',
                    items: [
                        { name: 'The data layer blocks', html: '<p>JPA and JDBC are blocking. Without R2DBC or a non-blocking driver, the scarce resource is still a pooled thread and the reactive layer above it is decoration with a debugging cost.</p>' },
                        { name: 'The workload is CPU-bound', html: '<p>Reactive is about not waiting. Work that computes still needs a core, and moving it onto an event loop makes it worse by stalling other requests.</p>' },
                        { name: 'The concurrency is modest', html: '<p>At a few hundred concurrent requests, thread-per-request on platform threads is entirely adequate. The complexity buys nothing at that scale, and virtual threads cover the next order of magnitude.</p>' },
                        { name: 'The team cannot debug it', html: '<p><strong>The one that decides most real cases.</strong> A stack that only two people can diagnose under pressure is an operational risk. Throughput that nobody can restore at 3am is not throughput.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>The most common wrong adoption is a reactive controller over a JPA repository.</strong> It appears in codebases because <code>Mono</code> looks modern, and it inherits every cost of the model — no stack traces, no debugger, <code>ThreadLocal</code> broken, MDC empty — while the throughput is bounded by the connection pool exactly as it was before. If the persistence layer is not going to change, the web layer should not either.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Ending on the team is the strongest version of this answer: <em>"I would want a reason that survives the debugging cost. Backpressure over a streaming pipeline is such a reason. Wanting to be modern is not, and neither is a benchmark of an endpoint the service does not have."</em></p>'
                }
            ],
            docs: [
                { title: 'Spring WebFlux — Applicability', url: 'https://docs.spring.io/spring-framework/reference/web/webflux/new-framework.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'concurrency', questionId: 'virtual-threads-vs-reactive' }
            ]
        }
    ]
};
