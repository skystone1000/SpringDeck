/* ==========================================================================
   data/theory/api-styles.js — module 37 in the reading path

   The one section 5.9 insertion into web-api, placed straight after
   rest-api-design because the question it answers only exists once REST is
   understood: not "what is gRPC" but "why would you use anything else".

   Eleven chapters. Four styles, and the plan's tagline is the whole
   framing — the question is always "for what". So the module opens on the
   choice and closes on versioning, and the nine chapters in between exist
   to make the opening chapter's table defensible rather than asserted.

   A note on the snippets. Protobuf IDL and GraphQL SDL are not languages
   the highlighter knows, and section 2.4 forbids adding a language to make
   a snippet possible. Both are therefore described in prose and tables,
   with the JAVA side shown as code. That is the same rule the deck applies
   to cross-language comparison, and it costs nothing here: the Java is the
   part a Java interview asks about.
   ========================================================================== */

const apiStylesModule = {
    id: 'api-styles',
    trackId: 'web-api',
    order: 37,
    title: 'REST, gRPC, GraphQL and Push',
    tagline: 'Four API styles, and the question is always "for what".',
    estimatedMinutes: 45,
    prerequisites: ['rest-api-design'],
    docHub: { title: 'Spring for GraphQL', url: 'https://docs.spring.io/spring-graphql/reference/' },

    chapters: [
        {
            id: 'choosing-an-api-style',
            title: 'Choosing',
            importance: 'must-know',
            summary: 'REST between systems you do not control, gRPC between services you do, GraphQL when many different clients need different shapes of the same data, push when the server has news.',
            interviewAngle: 'The whole module in one answer. Candidates who describe all four score less than candidates who give a rule and defend an exception to it.',
            buildsOn: [],
            blocks: [
                {
                    type: 'table',
                    title: 'What each is good at, and what it costs',
                    headers: ['', 'Strong at', 'Costs you'],
                    rows: [
                        ['REST/JSON', 'Universal reach, cacheable by intermediaries, readable, debuggable with curl', 'Verbose on the wire; over- and under-fetching; no schema unless you add one'],
                        ['gRPC', 'Compact binary, generated clients, HTTP/2 multiplexing, streaming in both directions', 'Not browser-native without a proxy; opaque without tooling; a build-time codegen step'],
                        ['GraphQL', 'The client asks for exactly the fields it needs; one round trip for a graph', 'Caching is hard; every query is a potential N+1; authorisation is per field'],
                        ['WebSocket / SSE', 'The server can speak first; low latency for updates', 'Stateful connections that must be scaled, load-balanced and reconnected']
                    ]
                },
                {
                    type: 'types',
                    title: 'The decision, as a short procedure',
                    items: [
                        { name: 'A public API, or one for partners', html: '<p><strong>REST.</strong> Reach beats efficiency, and every client on earth can call it without a toolchain.</p>' },
                        { name: 'Internal service to service, high volume', html: '<p><strong>gRPC.</strong> The schema, the generated clients and the binary encoding all pay off when both ends are yours and deploy together.</p>' },
                        { name: 'One backend, many clients wanting different fields', html: '<p><strong>GraphQL</strong> — a mobile app that needs three fields and a web app that needs thirty, from the same aggregate.</p>' },
                        { name: 'The server originates the update', html: '<p><strong>SSE</strong> if it is one-directional, <strong>WebSocket</strong> if the client also needs to send. Polling if the update rate is low.</p>' },
                        { name: 'You are not sure', html: '<p><strong>REST.</strong> It is the reversible choice: the others can be added in front of it later, and a service that starts with gRPC and needs browser access has a proxy to build.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>A mixed answer is usually the honest one, and saying so is a strength: <em>"REST at the edge because the clients are browsers and partners, gRPC between the internal services because they are ours and the volume is high, and SSE for the one screen that needs live updates. Three styles, each where it is cheapest."</em></p>'
                }
            ],
            docs: [
                { title: 'gRPC — Introduction', url: 'https://grpc.io/docs/what-is-grpc/introduction/', kind: 'guide' },
                { title: 'GraphQL — Introduction', url: 'https://graphql.org/learn/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'beyond-rest', questionId: 'rest-grpc-graphql-choice' }
            ]
        },

        {
            id: 'grpc-and-protobuf',
            title: 'gRPC and Protocol Buffers',
            importance: 'should-know',
            summary: 'A schema language and a binary encoding, plus RPC over HTTP/2. The field numbers in the schema are the contract, not the field names.',
            interviewAngle: 'The evolution rules are the interesting part. Knowing that a field number is permanent, and that renaming a field is free while renumbering one is catastrophic, is what shows you have run it.',
            buildsOn: ['choosing-an-api-style'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>A Protobuf message is a list of fields, each with a <strong>number</strong>, a type and a name. On the wire only the number and the value are sent — the name never travels. That single design decision produces both the compactness and every evolution rule that follows from it.</p><p>An RPC service is a list of methods, each naming a request message and a response message. The compiler generates a client stub and a server base class in every supported language, and gRPC carries the calls over HTTP/2 so that many of them multiplex over one connection.</p>'
                },
                {
                    type: 'table',
                    title: 'Schema evolution, and why each rule is what it is',
                    headers: ['Change', 'Safe?', 'Because'],
                    rows: [
                        ['Add a field with a new number', '<strong>Yes</strong>', 'Old readers skip unknown numbers; new readers see the default'],
                        ['Rename a field, keep the number', '<strong>Yes</strong>', 'The name is not on the wire at all'],
                        ['Change a field\'s number', '<strong>No</strong>', 'It becomes a different field; the old value is silently unread'],
                        ['Change a field\'s type', 'Only within compatible groups', 'int32/int64/bool share an encoding; string and bytes do not convert to numbers'],
                        ['Delete a field', 'Yes, if you <code>reserved</code> the number', 'Otherwise somebody reuses the number for a new meaning'],
                        ['Add a value to an enum', 'Yes, with care', 'Old clients get the unknown value; always define a zero value meaning "unspecified"']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Proto3 scalar fields have no null.</strong> An absent <code>int32</code> and an <code>int32</code> explicitly set to 0 are indistinguishable on the wire, because the default is not transmitted. That matters for a partial update: "set the discount to 0" and "do not touch the discount" are the same message. The fixes are <code>optional</code> on the field (restored in protobuf 3.15) or a wrapper type, and choosing neither means a PATCH endpoint that cannot express clearing a value.</p>'
                }
            ],
            docs: [
                { title: 'Protocol Buffers — Language Guide (proto3)', url: 'https://protobuf.dev/programming-guides/proto3/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'beyond-rest', questionId: 'protobuf-contract-evolution' }
            ]
        },

        {
            id: 'grpc-streaming-modes',
            title: 'The Four Call Types',
            importance: 'should-know',
            summary: 'Unary, server streaming, client streaming and bidirectional. The streaming modes are the capability REST does not have, and they are the reason to choose gRPC as often as the encoding is.',
            interviewAngle: 'Naming all four and giving a concrete use for each is a complete answer. The one people forget is client streaming, and upload-then-summarise is its natural shape.',
            buildsOn: ['grpc-and-protobuf'],
            blocks: [
                {
                    type: 'table',
                    title: 'Four modes, with a use for each',
                    headers: ['Mode', 'Shape', 'Natural use'],
                    rows: [
                        ['Unary', 'One request, one response', 'Ordinary RPC. Most calls.'],
                        ['Server streaming', 'One request, many responses', 'A large result set delivered incrementally; a subscription to changes'],
                        ['Client streaming', 'Many requests, one response', 'Uploading a large file in chunks; batching metrics and getting one ack'],
                        ['Bidirectional', 'Both, independently', 'A chat; a long-lived session where either side may speak']
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>All four run over one HTTP/2 connection, and HTTP/2 is what makes it possible: a stream is a first-class concept in the protocol, so many concurrent calls multiplex without head-of-line blocking at the HTTP layer, and a long-lived stream costs no extra connection.</p><p>The practical consequence for a Java service is that gRPC needs far fewer connections than the equivalent REST traffic, which shows up as reduced pressure on connection pools and load balancers rather than as request latency. It is also why a layer-4 load balancer distributes gRPC badly — it balances connections, and gRPC uses very few of them.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>gRPC does not work from a browser without a proxy.</strong> Browser JavaScript cannot control HTTP/2 frames directly, so a browser client needs gRPC-Web and a translating proxy such as Envoy. That is a real operational component, and it is the single most common reason a team that chose gRPC for everything ends up exposing REST at the edge anyway.</p>'
                }
            ],
            docs: [
                { title: 'gRPC Core Concepts', url: 'https://grpc.io/docs/what-is-grpc/core-concepts/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'beyond-rest', questionId: 'grpc-streaming-modes' }
            ]
        },

        {
            id: 'grpc-in-spring',
            title: 'gRPC in a Spring Application',
            importance: 'good-to-know',
            summary: 'The schema is compiled by a build plugin, the service extends a generated base class, and the interceptor chain is where cross-cutting concerns go — the same shape as a servlet filter.',
            interviewAngle: 'The practical mapping question: where do authentication, tracing and error handling go when there is no DispatcherServlet.',
            buildsOn: ['grpc-streaming-modes'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'A generated base class, implemented',
                    code: '// The build plugin compiles the schema into Java before javac runs, so\n// PricingServiceGrpc and the message types are ordinary generated code.\n\n@GrpcService\nclass PricingService extends PricingServiceGrpc.PricingServiceImplBase {\n\n    @Override\n    public void quote(QuoteRequest request,\n                      StreamObserver<QuoteResponse> observer) {\n        try {\n            Money price = pricing.quote(request.getSku(), request.getQuantity());\n            observer.onNext(QuoteResponse.newBuilder()\n                    .setAmountMinor(price.minorUnits())\n                    .setCurrency(price.currency().getCurrencyCode())\n                    .build());\n            observer.onCompleted();          // MUST be called, or the client hangs\n        } catch (UnknownSku e) {\n            // Status, not an exception body. NOT_FOUND is the analogue of 404.\n            observer.onError(Status.NOT_FOUND\n                    .withDescription("unknown sku")\n                    .asRuntimeException());\n        }\n    }\n}',
                    notes: '<p><code>onCompleted()</code> is the obligation that has no REST equivalent: forgetting it leaves the client waiting on a stream the server considers finished, which presents as a timeout with a healthy-looking server. It is the same class of mistake as a filter that forgets to call <code>doFilter</code>.</p>'
                },
                {
                    type: 'table',
                    title: 'Where the familiar concerns go',
                    headers: ['In Spring MVC', 'In gRPC'],
                    rows: [
                        ['Servlet filter', '<code>ServerInterceptor</code>'],
                        ['<code>@ControllerAdvice</code>', 'An interceptor that maps exceptions to a <code>Status</code>'],
                        ['HTTP status codes', 'The <code>Status</code> enum — <code>NOT_FOUND</code>, <code>PERMISSION_DENIED</code>, <code>DEADLINE_EXCEEDED</code>'],
                        ['Headers', 'Metadata, with the same idea of a correlation id'],
                        ['<code>@PreAuthorize</code>', 'An interceptor reading Metadata, or Spring Security\'s gRPC support'],
                        ['Request timeout', 'A <strong>deadline</strong>, which propagates to downstream calls automatically']
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>Deadline propagation is the feature worth naming. A gRPC deadline travels with the call, so a downstream service knows how long the original caller is still prepared to wait and can abandon work nobody is waiting for. Achieving the same thing over REST means passing a budget header and honouring it by hand, which almost nobody does.</p>'
                }
            ],
            docs: [
                { title: 'gRPC Java — Basics', url: 'https://grpc.io/docs/languages/java/basics/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'beyond-rest', questionId: 'rest-grpc-graphql-choice' }
            ]
        },

        {
            id: 'graphql-basics',
            title: 'GraphQL: One Endpoint, a Typed Graph',
            importance: 'should-know',
            summary: 'A schema of types and fields, one POST endpoint, and a query that names exactly the fields it wants. Resolvers supply each field, which is where all the interesting problems live.',
            interviewAngle: 'The mechanism to be precise about is that the query shape drives execution — the server walks the query and calls a resolver per field, which is why performance is a per-field question.',
            buildsOn: ['grpc-in-spring'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>A GraphQL server publishes a <strong>schema</strong>: types, the fields on each type, and a small number of entry points grouped under <code>Query</code>, <code>Mutation</code> and <code>Subscription</code>. A client sends a query naming the fields it wants, nested as deeply as the graph allows, and the server returns a JSON object with exactly that shape.</p><p>Execution is a walk: for each field in the query the server calls a <strong>resolver</strong>, which is a function returning that field\'s value. A field the client did not ask for is never resolved, and a field asked for a hundred times in a list is resolved a hundred times unless something batches it. Both halves of that sentence matter, and the second one is the next-but-one chapter.</p>'
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Resolvers in Spring for GraphQL',
                    code: '@Controller\nclass OrderGraphQlController {\n\n    // Maps to the `order(id: ID!)` entry point under Query.\n    @QueryMapping\n    Order order(@Argument String id) {\n        return orders.byId(id).orElseThrow(() -> new NotFound(id));\n    }\n\n    // A field resolver: called for the `customer` field of an Order,\n    // ONLY when a query asks for it. This is the lazy half.\n    @SchemaMapping(typeName = "Order", field = "customer")\n    Customer customer(Order order) {\n        return customers.byId(order.customerId());   // <-- one query PER ORDER\n    }\n\n    // The batched form. Given every Order in the result, return a map.\n    // Spring calls this ONCE instead of calling the resolver above n times.\n    @BatchMapping(typeName = "Order", field = "customer")\n    Map<Order, Customer> customers(List<Order> orders) {\n        Set<String> ids = orders.stream().map(Order::customerId).collect(toSet());\n        Map<String, Customer> byId = customers.byIds(ids);   // ONE query\n        return orders.stream().collect(toMap(identity(),\n                o -> byId.get(o.customerId())));\n    }\n}',
                    notes: '<p>The two resolvers do the same job and differ by an order of magnitude in database traffic on a list query. Writing the first and forgetting the second is the default outcome, which is why the N+1 chapter is marked must-know while this one is not.</p>'
                }
            ],
            docs: [
                { title: 'Spring for GraphQL — Controllers', url: 'https://docs.spring.io/spring-graphql/reference/controllers.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'beyond-rest', questionId: 'graphql-over-and-under-fetching' }
            ]
        },

        {
            id: 'graphql-over-and-under-fetching',
            title: 'Over-Fetching and Under-Fetching',
            importance: 'should-know',
            summary: 'The problem GraphQL was built for: a REST endpoint returns more than the mobile app needs, or the app must call four endpoints to draw one screen.',
            interviewAngle: 'This is the "why GraphQL" answer. It is also worth knowing the REST answers to the same problem, because they are often sufficient and much cheaper.',
            buildsOn: ['graphql-basics'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'The same screen, two ways',
                    left: 'REST',
                    right: 'GraphQL',
                    rows: [
                        { aspect: 'Round trips for an order screen', left: '4 — order, customer, lines, shipment', right: '1' },
                        { aspect: 'Bytes the mobile app discards', left: 'Most of each response', right: 'None — it asked for the fields' },
                        { aspect: 'Adding a field for one client', left: 'Every client now receives it', right: 'Only clients that ask' },
                        { aspect: 'HTTP caching', left: 'Works — <code>GET</code>, <code>ETag</code>, CDN', right: '<strong>Does not.</strong> One POST endpoint, a body-dependent response.' },
                        { aspect: 'Cost of a bad client query', left: 'Bounded by the endpoint', right: 'Unbounded unless you add depth and complexity limits' }
                    ]
                },
                {
                    type: 'types',
                    title: 'The REST answers, which are often enough',
                    items: [
                        { name: 'Sparse fieldsets', html: '<p><code>?fields=id,status,total</code>. Solves over-fetching with one query parameter and a projection.</p>' },
                        { name: 'Expansion', html: '<p><code>?expand=customer,lines</code>. Solves under-fetching for the cases you anticipated.</p>' },
                        { name: 'A composed endpoint', html: '<p>A backend-for-frontend that returns the whole screen in one response. Unfashionable and extremely effective for a small number of clients.</p>' },
                        { name: 'HTTP/2', html: '<p>Four round trips over one multiplexed connection is not four connections. Some of the original argument was really about HTTP/1.1.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>The honest position: <em>"GraphQL is worth it when there are several clients with genuinely different field needs and that set keeps changing. For one web client and one mobile client with stable requirements, expansion parameters or a backend-for-frontend gets most of the benefit and keeps HTTP caching, which GraphQL gives up."</em></p>'
                }
            ],
            docs: [
                { title: 'GraphQL — Queries and Mutations', url: 'https://graphql.org/learn/queries/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'beyond-rest', questionId: 'graphql-over-and-under-fetching' }
            ]
        },

        {
            id: 'graphql-n-plus-one-and-dataloader',
            title: 'The N+1 Is Structural',
            importance: 'must-know',
            summary: 'A field resolver is called once per parent object. A list of fifty orders each resolving a customer is fifty-one queries unless something batches, and batching is not automatic.',
            interviewAngle: 'The most important thing in the GraphQL half. It is the same N+1 as JPA, arriving from a different direction, and the fix is batching per request rather than a join.',
            buildsOn: ['graphql-over-and-under-fetching'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>The execution model guarantees this rather than merely permitting it. The server resolves <code>orders</code> and gets fifty objects; then, for the <code>customer</code> field, it calls the customer resolver once per order. Fifty-one queries, from a query that looks like one request.</p><p>It is worse than the JPA version in one respect and better in another. Worse, because the <em>client</em> chooses the shape, so a query nobody anticipated can produce a fan-out nobody tested. Better, because the fix — a per-request batch loader — is a standard, well-supported component rather than a query rewrite.</p>'
                },
                {
                    type: 'types',
                    title: 'The defences, and all four are needed',
                    items: [
                        { name: 'DataLoader / @BatchMapping', html: '<p>Collect the keys requested during one execution tier, issue <strong>one</strong> query, distribute the results. This is the primary fix and it also deduplicates repeated keys for free.</p>' },
                        { name: 'Query depth limit', html: '<p>A cyclic schema — order to customer to orders to customer — lets a client write an arbitrarily deep query. Cap the depth.</p>' },
                        { name: 'Query complexity limit', html: '<p>Assign a cost per field and reject queries over a budget. Depth alone does not stop a wide query asking for a thousand items at each of three levels.</p>' },
                        { name: 'Persisted queries', html: '<p>Clients send a hash of a query the server already knows. Removes arbitrary queries entirely, and restores some caching. The right answer for a first-party mobile client.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Authorisation is per field, and it is easy to leave a hole.</strong> A client can reach <code>order.customer.email</code> through a path nobody thought about, so a check on the <code>order</code> entry point does not protect the fields below it. Every resolver that returns something sensitive needs its own check — which is a real, permanent tax that REST does not charge, because a REST endpoint has one entry point to guard.</p>'
                }
            ],
            docs: [
                { title: 'Spring for GraphQL — Batch Loading', url: 'https://docs.spring.io/spring-graphql/reference/request-execution.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'beyond-rest', questionId: 'graphql-n-plus-one-and-dataloader' },
                { topicId: 'jpa-hibernate', questionId: 'n-plus-one' }
            ]
        },

        {
            id: 'websockets',
            title: 'WebSockets',
            importance: 'should-know',
            summary: 'An HTTP request that upgrades into a persistent, bidirectional, message-oriented connection. Full duplex, and stateful — which is the part that has operational consequences.',
            interviewAngle: 'The interesting question is not the protocol, it is scaling: a connection is pinned to one instance, so a message for a user must reach the instance holding that user.',
            buildsOn: ['graphql-n-plus-one-and-dataloader'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'http',
                    title: 'The upgrade handshake',
                    code: 'GET /ws/prices HTTP/1.1\nHost: api.acme.com\nUpgrade: websocket\nConnection: Upgrade\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\nSec-WebSocket-Version: 13\n\nHTTP/1.1 101 Switching Protocols\nUpgrade: websocket\nConnection: Upgrade\nSec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=\n\n# After the 101 there is no more HTTP. The connection carries WebSocket\n# frames in both directions until either side closes it.',
                    notes: '<p>Because the handshake is an ordinary HTTP request, cookies and the <code>Origin</code> header are available and authentication can happen there. After the upgrade there are no headers, so any per-message authorisation has to be carried in the message payload — which means a token checked once at connect time is valid for the life of the connection unless you re-check it.</p>'
                },
                {
                    type: 'types',
                    title: 'The three scaling problems, all of them stateful',
                    items: [
                        { name: 'The connection is pinned', html: '<p>User A is connected to instance 3. A message produced on instance 7 must get to instance 3 — via Redis pub/sub, a broker, or a real message relay. This is the central problem.</p>' },
                        { name: 'Load balancers must cooperate', html: '<p>Sticky sessions, and an idle timeout longer than your heartbeat interval. A proxy that closes idle connections after sixty seconds will close yours.</p>' },
                        { name: 'Deployments disconnect everybody', html: '<p>A rolling restart drops every connection on each instance. Clients need reconnect with jittered backoff, or the reconnect storm takes the new instances down.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>Spring\'s STOMP support over WebSocket gives you destinations, subscriptions and a broker abstraction, and its simple in-memory broker is single-instance only. Scaling out means relaying to a real broker — RabbitMQ or ActiveMQ — which is the moment the "just add WebSockets" estimate doubles. Worth saying out loud when the requirement appears.</p>'
                }
            ],
            docs: [
                { title: 'WebSockets', url: 'https://docs.spring.io/spring-framework/reference/web/websocket.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'beyond-rest', questionId: 'scaling-websocket-connections' }
            ]
        },

        {
            id: 'server-sent-events',
            title: 'Server-Sent Events',
            importance: 'should-know',
            summary: 'One-directional streaming over ordinary HTTP. Text frames, automatic reconnection with resume, and no protocol upgrade — which makes it dramatically simpler to operate than WebSockets.',
            interviewAngle: 'Under-used and often the right answer. Most "we need WebSockets" requirements are one-directional, and SSE gives them without a stateful protocol.',
            buildsOn: ['websockets'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'A stream from a Spring controller',
                    code: '@GetMapping(value = "/prices", produces = TEXT_EVENT_STREAM_VALUE)\nSseEmitter prices(@RequestParam String symbol) {\n    SseEmitter emitter = new SseEmitter(Duration.ofMinutes(30).toMillis());\n\n    subscription.onTick(symbol, tick -> {\n        try {\n            emitter.send(SseEmitter.event()\n                    .id(tick.sequence())      // the client echoes this back\n                    .name("price")            // the event type\n                    .data(tick));\n        } catch (IOException e) {\n            emitter.completeWithError(e);\n        }\n    });\n\n    emitter.onCompletion(() -> subscription.cancel(symbol));\n    emitter.onTimeout(()    -> subscription.cancel(symbol));\n    return emitter;\n}\n\n// On WebFlux the same thing is a return type rather than a callback:\n//   Flux<Tick> prices(String symbol)   with the same produces attribute',
                    notes: '<p>The <code>id</code> is the feature that distinguishes SSE from a plain chunked response. The browser stores the last id it received and sends it back as <code>Last-Event-ID</code> when it reconnects, so a server that honours that header can resume from the gap instead of restarting the stream. Reconnection is automatic and the resume is nearly free — you just have to implement the header.</p>'
                },
                {
                    type: 'comparison',
                    title: 'SSE against WebSocket',
                    left: 'SSE',
                    right: 'WebSocket',
                    rows: [
                        { aspect: 'Direction', left: 'Server to client only', right: 'Both' },
                        { aspect: 'Protocol', left: 'Plain HTTP — proxies, CDNs and firewalls treat it normally', right: 'An upgrade, which some intermediaries mishandle' },
                        { aspect: 'Reconnection', left: '<strong>Automatic, with resume from <code>Last-Event-ID</code></strong>', right: 'You implement it' },
                        { aspect: 'Payload', left: 'Text (UTF-8)', right: 'Text or binary' },
                        { aspect: 'Connection cost', left: 'One HTTP connection per stream, held open', right: 'One connection, held open' },
                        { aspect: 'Choose it when', left: 'Notifications, progress, live figures, log tailing', right: 'Chat, collaborative editing, anything the client also writes to' }
                    ]
                }
            ],
            docs: [
                { title: 'HTTP Streaming', url: 'https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-ann-async.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'beyond-rest', questionId: 'websockets-sse-or-polling' },
                { topicId: 'beyond-rest', questionId: 'streaming-from-spring' }
            ]
        },

        {
            id: 'polling-vs-push',
            title: 'Polling Is Often the Right Answer',
            importance: 'should-know',
            summary: 'A stateless GET every thirty seconds costs almost nothing, survives every deployment, and needs no reconnection logic. Push is for when the latency requirement genuinely rules it out.',
            interviewAngle: 'Arguing for the simple option, with numbers, is a senior signal. The threshold question is what latency the requirement actually needs, and it is usually larger than people assume.',
            buildsOn: ['server-sent-events'],
            blocks: [
                {
                    type: 'table',
                    title: 'Three options against the properties that decide',
                    headers: ['', 'Short polling', 'Long polling', 'SSE / WebSocket'],
                    rows: [
                        ['Latency', 'Up to the interval', 'Near real time', 'Real time'],
                        ['Server state', 'None', 'A held request per client', 'A connection per client'],
                        ['Survives a deploy', 'Yes, invisibly', 'One dropped request', 'Every client reconnects'],
                        ['Caching', '<code>ETag</code> makes an unchanged poll nearly free', 'None', 'None'],
                        ['Client complexity', 'A timer', 'Reconnect logic', 'Reconnect and backoff logic'],
                        ['Cost at 10k clients', '10k requests per interval, mostly 304s', '10k held requests', '10k open connections']
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>The argument for polling is stronger than its reputation. A conditional <code>GET</code> that returns <code>304 Not Modified</code> costs a few hundred bytes and no application work; ten thousand clients polling every thirty seconds is around three hundred and thirty requests a second, which is unremarkable. In exchange you get no connection state, no reconnection logic, no sticky sessions, and a deployment that clients do not notice.</p><p>Push earns its complexity when the latency requirement is genuinely sub-second, when updates are frequent enough that polling would mostly return changes anyway, or when the number of clients is small and the update volume per client is high.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Ask what happens if the update arrives thirty seconds late. For a dashboard, an inbox badge, an order status or a "processing" spinner, the answer is nothing at all — and that answer decides the design. Requirements are stated as "real time" far more often than they mean it.</p>'
                }
            ],
            docs: [
                { title: 'HTTP Conditional Requests', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Conditional_requests', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'beyond-rest', questionId: 'websockets-sse-or-polling' }
            ]
        },

        {
            id: 'versioning-across-styles',
            title: 'Versioning, in Each Style',
            importance: 'should-know',
            summary: 'The same problem four times: how does a change reach clients that deploy on their own schedule. Only one of the four styles has an answer built into the format.',
            interviewAngle: 'Comparing the four is a good way to show the earlier REST versioning material is understood as a general problem rather than a URL convention.',
            buildsOn: ['polling-vs-push'],
            blocks: [
                {
                    type: 'table',
                    title: 'How a breaking change is handled',
                    headers: ['Style', 'Mechanism', 'The catch'],
                    rows: [
                        ['REST', 'URL path <code>/v2</code>, or a media type, or a header', 'Nothing enforces compatibility. Discipline only.'],
                        ['gRPC', '<strong>Field numbers and reserved.</strong> Compatibility rules are in the format.', 'A new <em>method</em> still needs both sides deployed; the schema must be shared'],
                        ['GraphQL', '<code>@deprecated</code> on a field, and field usage analytics', 'Nothing is ever removed until the analytics say nobody asks for it. Schemas accumulate.'],
                        ['WebSocket / SSE', 'A version in the message envelope, or in the subscription path', 'Long-lived connections mean old and new clients coexist for hours']
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>The general rule is the same in all four and it is worth stating independently of any of them: <strong>additive changes are free, removals are expensive, and renames are removals.</strong> Add a field, do not remove one; add a method, do not change one; deprecate loudly and delete only when the telemetry says nobody is using it.</p><p>The one real advantage gRPC has here is that its rules are checked by the format rather than by a reviewer — reuse a field number and the wire data is misread, so the discipline is enforced by consequences rather than by convention.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Whatever the style, <strong>measure usage before removing anything.</strong> A per-field or per-endpoint counter, tagged by client id, turns "can we drop this" from an argument into a query — and it is the mechanism GraphQL practice has made standard, which is worth borrowing for REST.</p>'
                }
            ],
            docs: [
                { title: 'GraphQL — Schema evolution', url: 'https://graphql.org/learn/best-practices/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'rest-api', questionId: 'api-versioning' },
                { topicId: 'beyond-rest', questionId: 'graphql-schema-evolution' }
            ]
        }
    ]
};
