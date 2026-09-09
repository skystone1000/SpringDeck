/* ==========================================================================
   data/beyond-rest.js — Beyond REST: gRPC, GraphQL, WebSockets & Reactive

   Three subsections: what other request/response shapes exist, how a server
   pushes, and the reactive programming model.

   The reason this topic exists as its own thing rather than as an appendix to
   rest-api is that the questions are almost entirely about CHOICE. Nobody is
   asked to implement gRPC on a whiteboard. They are asked why they would, and
   what it costs — and since Java 21 the honest answer to half of the reactive
   questions has changed, which makes this the topic where a stale answer is
   most obvious.

   ONE GLOBAL PER FILE.
   ========================================================================== */

const beyondRestData = {
    id: 'beyond-rest',
    title: 'Beyond REST: gRPC, GraphQL, WebSockets & Reactive',
    subsections: [
        { id: 'styles',    title: 'API Styles' },
        { id: 'streaming', title: 'Streaming & Push' },
        { id: 'reactive',  title: 'Reactive' }
    ],
    keyTopics: [
        'REST vs gRPC vs GraphQL', 'protobuf and contracts', 'gRPC streaming modes',
        'GraphQL N+1 and dataloader', 'over- and under-fetching',
        'WebSockets vs SSE vs polling', 'Mono and Flux', 'backpressure',
        'blocking in a reactive chain', 'WebClient vs RestClient',
        'reactive vs virtual threads'
    ],
    questions: [

/* ==== API Styles ====================================================== */

{
    id: 'rest-grpc-graphql-choice',
    importance: 'must-know',
    subsection: 'styles',
    question: 'REST, gRPC or GraphQL — how would you choose between them?',
    answer:
        '<p>By <strong>who the client is</strong>, which decides nearly everything else.</p>' +
        '<ul>' +
        '<li><strong>REST</strong> — a public API, or any client you do not control. Every tool ' +
        'on earth speaks it, it is cacheable by intermediaries because the URL and the method ' +
        'carry the semantics, and it is debuggable with curl. Its cost is that the response shape ' +
        'is fixed by the server, so clients either get too much or need several round trips.</li>' +
        '<li><strong>gRPC</strong> — service to service, inside your own network, at volume. A ' +
        'compiled contract, a compact binary encoding, HTTP/2 multiplexing and first-class ' +
        'streaming. Its cost is that it is opaque: no curl, no browser without a proxy, and every ' +
        'client needs generated code.</li>' +
        '<li><strong>GraphQL</strong> — a client-driven API with many consumers wanting different ' +
        'shapes of the same data. Typically the aggregation layer in front of several services, ' +
        'and typically driven by a mobile team tired of round trips. Its cost is that you have ' +
        'moved the query planning problem into your server and given up URL-level caching.</li>' +
        '</ul>' +
        '<p>The answer that lands is the one that names the cost rather than the benefit. Each ' +
        'of these is popular because it solves a real problem, and each moves the difficulty ' +
        'somewhere else: gRPC moves it to tooling, GraphQL moves it to the server, REST leaves ' +
        'it with the client.</p>' +
        '<p>And the honest common case: <strong>most systems should use REST between services ' +
        'too</strong>, and only reach for gRPC when the volume or the latency budget justifies ' +
        'the operational cost. "We use gRPC internally because it is faster" without a number ' +
        'behind it is the answer that invites a follow-up.</p>',
    referenceLinks: [
        { title: 'gRPC — Introduction', url: 'https://grpc.io/docs/what-is-grpc/introduction/' },
        { title: 'GraphQL — Learn', url: 'https://graphql.org/learn/' }
    ],
    tags: ['api-styles', 'architecture', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'protobuf-contract-evolution',
    importance: 'must-know',
    subsection: 'styles',
    question: 'What makes a protobuf change backward compatible?',
    answer:
        '<p>The <strong>field number</strong> is the contract, not the field name. Protobuf ' +
        'encodes each field as a tag built from its number and wire type; the name exists only in ' +
        'the <code>.proto</code> file and never travels. So:</p>' +
        '<ul>' +
        '<li><strong>Renaming a field is compatible</strong> on the wire, and will surprise ' +
        'people who expect otherwise.</li>' +
        '<li><strong>Changing a field number is a breaking change</strong>, always.</li>' +
        '<li><strong>Adding a field is compatible.</strong> Old readers skip unknown tags — and ' +
        'in proto3 they <em>preserve</em> them through a read-modify-write cycle, which matters ' +
        'for proxies.</li>' +
        '<li><strong>Deleting a field is compatible only if you <code>reserved</code> its ' +
        'number</strong> so nobody reuses it later. Reusing a number is the classic disaster: ' +
        'old data decodes into the new field and produces plausible garbage rather than an ' +
        'error.</li>' +
        '<li><strong>Changing a type is compatible only within a wire-type family</strong> — ' +
        '<code>int32</code> to <code>int64</code> is safe, <code>int32</code> to ' +
        '<code>string</code> is not.</li>' +
        '</ul>' +
        '<p>The deeper point for an interview: this is a <strong>schema that evolves ' +
        'independently of the code</strong>, which is exactly what Java serialization got wrong. ' +
        'The rules above can be enforced by a linter in CI — Buf does this — so compatibility ' +
        'becomes a build failure rather than an incident.</p>' +
        '<p>One proto3 subtlety worth knowing: scalar fields have no presence by default, so ' +
        'zero and unset are indistinguishable. If the difference matters, use ' +
        '<code>optional</code>, which was re-added in protobuf 3.15 for exactly this reason.</p>',
    referenceLinks: [
        { title: 'Protocol Buffers — Updating a Message Type', url: 'https://protobuf.dev/programming-guides/proto3/' }
    ],
    tags: ['grpc', 'protobuf', 'compatibility'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'grpc-streaming-modes',
    importance: 'should-know',
    subsection: 'styles',
    question: 'What are the four gRPC call types?',
    answer:
        '<p>Every combination of "one or many" on each side, which is the whole taxonomy:</p>' +
        '<ul>' +
        '<li><strong>Unary</strong> — one request, one response. The ordinary RPC, and the vast ' +
        'majority of real usage.</li>' +
        '<li><strong>Server streaming</strong> — one request, a stream of responses. A ' +
        'subscription, a large result set delivered incrementally, a progress feed.</li>' +
        '<li><strong>Client streaming</strong> — a stream of requests, one response. Bulk upload, ' +
        'telemetry ingestion, anything where the client produces continuously and the server ' +
        'summarises at the end.</li>' +
        '<li><strong>Bidirectional streaming</strong> — both, independently. Not request/response ' +
        'at all: the two sides send whenever they like over the same connection.</li>' +
        '</ul>' +
        '<p>All four run over a single HTTP/2 connection, multiplexed, so a thousand concurrent ' +
        'calls do not mean a thousand sockets. That is the property that makes gRPC attractive ' +
        'for a service mesh, and it is also the property that makes naive load balancing fail: ' +
        '<strong>an L4 balancer sees one long-lived connection and pins it to one backend ' +
        'forever</strong>, so traffic does not spread. The fixes are client-side load balancing, ' +
        'an L7 proxy that understands HTTP/2, or a service mesh — and being able to say this is ' +
        'usually what the question is really probing.</p>' +
        '<p>Deadlines are the other thing to mention: gRPC propagates a deadline through the ' +
        'call chain, so a downstream service knows how long the caller is still willing to wait. ' +
        'Getting that for free is genuinely better than the ad-hoc timeout configuration a REST ' +
        'stack usually ends up with.</p>',
    referenceLinks: [
        { title: 'gRPC Core Concepts', url: 'https://grpc.io/docs/what-is-grpc/core-concepts/' }
    ],
    tags: ['grpc', 'streaming'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'graphql-over-and-under-fetching',
    importance: 'must-know',
    subsection: 'styles',
    question: 'What problem does GraphQL solve, and what does it cost?',
    answer:
        '<p>It solves <strong>over-fetching and under-fetching</strong>. A REST endpoint returns ' +
        'a shape the server chose: a mobile list view downloads forty fields to show three ' +
        '(over-fetching), and then makes four more calls to fill in related data ' +
        '(under-fetching). GraphQL lets the client ask for exactly the graph it needs, once.</p>' +
        '<p>What it costs, and a candidate who only lists the benefits has not run one:</p>' +
        '<ul>' +
        '<li><strong>HTTP caching is gone.</strong> One URL, usually POST, so no CDN, no ' +
        'browser cache, no <code>ETag</code> per resource. You rebuild caching inside the server ' +
        'per field, which is strictly more work than the thing you gave up.</li>' +
        '<li><strong>The N+1 problem becomes structural</strong> rather than occasional — see ' +
        'the next question.</li>' +
        '<li><strong>Every query is a potential denial of service.</strong> Nested selections can ' +
        'be arbitrarily deep and expensive, so you need depth limiting, complexity scoring, and ' +
        'ideally persisted queries — an allow-list of the queries clients are actually ' +
        'permitted to send.</li>' +
        '<li><strong>Authorisation is per field, not per endpoint.</strong> That is more correct ' +
        'and much more work, and it is easy to leave a hole.</li>' +
        '<li><strong>Error handling is not HTTP status codes.</strong> A partial failure returns ' +
        '200 with an <code>errors</code> array, which every piece of generic monitoring you own ' +
        'will read as success.</li>' +
        '</ul>' +
        '<p>Worth using when there are several client teams with genuinely different data needs ' +
        'over a shared domain. Hard to justify for one first-party client, where you can simply ' +
        'shape the REST endpoint.</p>',
    referenceLinks: [
        { title: 'GraphQL Best Practices', url: 'https://graphql.org/learn/best-practices/' }
    ],
    tags: ['graphql', 'api-design', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'graphql-n-plus-one-and-dataloader',
    importance: 'must-know',
    subsection: 'styles',
    question: 'Why does GraphQL have an N+1 problem, and what is a DataLoader?',
    answer:
        '<p>Because resolution is <strong>per field, per object</strong>. A query for 50 posts ' +
        'and each post\'s author calls the post resolver once and the author resolver fifty ' +
        'times, and each of those does its own lookup. The execution engine has no idea the fifty ' +
        'calls could be one.</p>' +
        '<p>It is worse than JPA\'s version of the same problem, because in JPA the query shape ' +
        'is written by a developer who can add a join fetch. Here <strong>the client chooses the ' +
        'shape at runtime</strong>, so there is no query to optimise ahead of time.</p>' +
        '<p><strong>DataLoader</strong> is the answer, and the mechanism is worth being able to ' +
        'describe: instead of resolving immediately, each field resolver registers the key it ' +
        'wants and returns a promise. At the end of the execution tick, the loader takes all the ' +
        'keys collected at that level, issues <strong>one batch query</strong> for them, and ' +
        'completes every promise. Fifty calls to <code>findById</code> become one ' +
        '<code>findAllById</code>.</p>' +
        '<p>Two properties that come with it: <strong>request-scoped caching</strong>, so asking ' +
        'for the same author twice in one query hits the database once; and correct behaviour ' +
        'without any coordination between resolvers, which is what makes it composable.</p>' +
        '<p>In Spring for GraphQL this is <code>BatchLoaderRegistry</code>, or the ' +
        '<code>@BatchMapping</code> annotation, which is the declarative form. Anyone running ' +
        'GraphQL in production without one of these has an N+1 problem and has probably not ' +
        'looked.</p>',
    referenceLinks: [
        { title: 'Spring for GraphQL — Batch Loading', url: 'https://docs.spring.io/spring-graphql/reference/request-execution.html' }
    ],
    tags: ['graphql', 'performance', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'graphql-schema-evolution',
    importance: 'should-know',
    subsection: 'styles',
    question: 'How do you version a GraphQL API?',
    answer:
        '<p>You do not, and that is the stated position of the specification rather than an ' +
        'evasion. GraphQL evolves <strong>additively</strong>: new fields and new types are ' +
        'invisible to clients that do not ask for them, so adding is always safe.</p>' +
        '<p>Removal is the interesting half:</p>' +
        '<ul>' +
        '<li>Mark the field <code>@deprecated(reason: "use x")</code>. Introspection carries ' +
        'that, so tooling shows it and clients see it.</li>' +
        '<li><strong>Measure who is still using it.</strong> This is the part GraphQL makes ' +
        'genuinely better than REST — the server sees exactly which fields each query selects, so ' +
        '"is anyone still requesting this" is a metric rather than a guess. With REST you know ' +
        'the endpoint was called and nothing about which parts of the response mattered.</li>' +
        '<li>Remove when the number reaches zero.</li>' +
        '</ul>' +
        '<p>The changes that are breaking regardless: making an optional argument required, ' +
        'narrowing a type, removing an enum value — because a client may be sending it — and ' +
        'changing a field from nullable to non-nullable, which is safe, while the reverse is not: ' +
        'a client that assumed non-null will break.</p>' +
        '<p>The nullability point is worth expanding, because it is where GraphQL schemas most ' +
        'often go wrong. A non-null field that fails to resolve <strong>propagates the null ' +
        'upwards</strong>, nulling its parent, and so on until it reaches a nullable field — so ' +
        'one over-eager <code>!</code> deep in the schema can blank an entire response. Be ' +
        'sparing with non-null on anything that could fail.</p>',
    referenceLinks: [
        { title: 'GraphQL Best Practices — Versioning', url: 'https://graphql.org/learn/best-practices/' }
    ],
    tags: ['graphql', 'api-design', 'compatibility'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

/* ==== Streaming & Push ================================================ */

{
    id: 'websockets-sse-or-polling',
    importance: 'must-know',
    subsection: 'streaming',
    question: 'WebSockets, server-sent events or polling — how do you decide?',
    answer:
        '<p>By <strong>which direction the data flows</strong>, and it is usually one ' +
        'direction.</p>' +
        '<ul>' +
        '<li><strong>Polling</strong> — the client asks on a timer. Trivially simple, works ' +
        'through every proxy, and wastes requests. Correct when updates are infrequent and a ' +
        'delay of seconds is fine: an order status, a background job.</li>' +
        '<li><strong>Server-sent events</strong> — a single long-lived HTTP response the server ' +
        'writes to as things happen. <strong>One direction only</strong>, server to client, text ' +
        'only. It is ordinary HTTP, so it keeps auth headers, proxies, compression and status ' +
        'codes, and the browser reconnects automatically and replays from ' +
        '<code>Last-Event-ID</code>. This is the right answer far more often than it is chosen: ' +
        'notifications, live dashboards, progress, streaming an LLM response.</li>' +
        '<li><strong>WebSockets</strong> — a bidirectional socket after an HTTP upgrade. Correct ' +
        'when the client genuinely sends continuously too: chat, collaborative editing, a trading ' +
        'client, multiplayer.</li>' +
        '</ul>' +
        '<p>The reasoning that impresses: <strong>WebSockets stop being HTTP after the ' +
        'handshake.</strong> You lose per-message status codes, HTTP caching, standard ' +
        'observability, and the ability of any intermediary to understand the traffic — and you ' +
        'take on connection state, heartbeats, reconnection and message-level authorisation ' +
        'yourself. That is a real bill, and paying it for a feed that only goes one way is the ' +
        'most common over-engineering in this area.</p>' +
        '<p>One historical caveat: over HTTP/1.1 a browser allows about six connections per ' +
        'origin, so several SSE streams could exhaust them. Over HTTP/2 they are multiplexed on ' +
        'one connection and the limitation is gone.</p>',
    referenceLinks: [
        { title: 'Server-Sent Events — MDN', url: 'https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events' }
    ],
    tags: ['streaming', 'websockets', 'sse', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'streaming-from-spring',
    importance: 'should-know',
    subsection: 'streaming',
    question: 'How do you stream a response from a Spring controller?',
    answer:
        '<p>Four types, and picking the right one is the whole question.</p>' +
        '<ul>' +
        '<li><strong><code>SseEmitter</code></strong> — server-sent events from a servlet stack. ' +
        'Return it from the handler; the request thread is released and you write events from ' +
        'wherever, then call <code>complete()</code>. Set a generous timeout, and register ' +
        '<code>onTimeout</code> and <code>onCompletion</code> callbacks to clean up, because ' +
        'forgetting is how emitters leak.</li>' +
        '<li><strong><code>StreamingResponseBody</code></strong> — raw bytes, written directly to ' +
        'the output stream. This is the answer for a large file download or a CSV export ' +
        'generated on the fly, and the reason is memory: nothing is buffered, so exporting a ' +
        'million rows uses constant heap.</li>' +
        '<li><strong><code>Flux&lt;T&gt;</code> or <code>Flux&lt;ServerSentEvent&lt;T&gt;&gt;</code></strong> ' +
        '— the WebFlux equivalent, and also supported on the servlet stack. With a content type ' +
        'of <code>text/event-stream</code> you get SSE; with ' +
        '<code>application/x-ndjson</code> you get newline-delimited JSON, which is the better ' +
        'choice for a machine consumer.</li>' +
        '<li><strong><code>ResponseBodyEmitter</code></strong> — the general form ' +
        '<code>SseEmitter</code> specialises, for a custom framing.</li>' +
        '</ul>' +
        '<p>Two things that catch people. <strong>The database cursor must stream too</strong> — ' +
        'streaming the HTTP response while the repository materialises every row into a list ' +
        'moves nothing. And <strong>an error after the first byte cannot become a 500</strong>, ' +
        'because the status line is long gone; the connection just ends, so the protocol needs ' +
        'a way to say "this stream was truncated" and the client needs to check for it.</p>',
    referenceLinks: [
        { title: 'Spring MVC — Asynchronous Requests', url: 'https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-ann-async.html' }
    ],
    tags: ['streaming', 'spring', 'sse'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'scaling-websocket-connections',
    importance: 'should-know',
    subsection: 'streaming',
    question: 'What breaks when you scale a WebSocket application to several instances?',
    answer:
        '<p><strong>The connection is state, and it lives on exactly one instance.</strong> ' +
        'Everything else follows from that.</p>' +
        '<p>User A is connected to pod 1. User B is on pod 3. A sends a message for B, and pod 1 ' +
        'has no socket to B. A stateless REST service has no equivalent problem because there is ' +
        'nothing to find.</p>' +
        '<p>The answers, in increasing order of seriousness:</p>' +
        '<ul>' +
        '<li><strong>A message broker behind the application.</strong> Every instance subscribes; ' +
        'a message published on pod 1 reaches pod 3, which delivers it down its own socket. In ' +
        'Spring this is the "full-featured broker" configuration — STOMP over WebSocket with ' +
        'RabbitMQ or ActiveMQ behind it, instead of the simple in-memory broker, which is ' +
        'single-instance only and is the thing that quietly works in development.</li>' +
        '<li><strong>Redis pub/sub</strong> for the same job when a full broker is more than you ' +
        'need.</li>' +
        '<li><strong>A dedicated connection tier</strong> that owns the sockets and speaks to ' +
        'stateless services behind it, once the connection count justifies separating the two ' +
        'scaling problems.</li>' +
        '</ul>' +
        '<p>Four operational details that come up as follow-ups: <strong>sticky sessions</strong> ' +
        'are needed for the SockJS fallback but not for a real WebSocket, which stays on one ' +
        'connection anyway; <strong>idle timeouts</strong> in load balancers kill quiet ' +
        'connections, so you need heartbeats; <strong>a deploy disconnects everybody</strong>, so ' +
        'clients need reconnection with backoff and jitter or a rolling restart becomes a ' +
        'thundering herd; and <strong>connections are memory</strong>, so the capacity question ' +
        'is sockets per instance rather than requests per second.</p>',
    referenceLinks: [
        { title: 'Spring — WebSocket STOMP Broker', url: 'https://docs.spring.io/spring-framework/reference/web/websocket/stomp.html' }
    ],
    tags: ['websockets', 'scaling', 'distributed'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'http2-and-what-it-changed',
    importance: 'should-know',
    subsection: 'streaming',
    question: 'What does HTTP/2 change for an API, and what does it not fix?',
    answer:
        '<p>Four changes, all on one connection:</p>' +
        '<ul>' +
        '<li><strong>Multiplexing.</strong> Many concurrent streams over one TCP connection, so ' +
        'head-of-line blocking at the HTTP layer is gone and the six-connections-per-origin limit ' +
        'stops mattering.</li>' +
        '<li><strong>Binary framing</strong> instead of text parsing.</li>' +
        '<li><strong>Header compression</strong> (HPACK), which matters more than it sounds when ' +
        'every request carries a large bearer token.</li>' +
        '<li><strong>Server push</strong>, which was removed from browsers in practice and is ' +
        'not worth claiming as a benefit.</li>' +
        '</ul>' +
        '<p>What it does not fix: <strong>head-of-line blocking at the TCP layer.</strong> One ' +
        'lost packet stalls every multiplexed stream on that connection, because TCP delivers in ' +
        'order. On a lossy mobile network HTTP/2 can therefore be <em>worse</em> than several ' +
        'HTTP/1.1 connections. That is precisely the problem HTTP/3 solves by moving to QUIC over ' +
        'UDP, where streams are independent.</p>' +
        '<p>The practical consequences for a backend engineer: <strong>connection pooling ' +
        'assumptions change</strong> — one connection can carry hundreds of concurrent calls, so ' +
        'a pool sized for HTTP/1.1 is meaninglessly large; and <strong>L4 load balancing stops ' +
        'distributing</strong>, for the reason described under gRPC. Both are the sort of ' +
        'operational detail that separates having read about HTTP/2 from having deployed it.</p>',
    referenceLinks: [
        { title: 'RFC 9113 — HTTP/2', url: 'https://www.rfc-editor.org/rfc/rfc9113.html' }
    ],
    tags: ['http', 'protocols', 'performance'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

/* ==== Reactive ======================================================== */

{
    id: 'mono-and-flux-basics',
    importance: 'must-know',
    subsection: 'reactive',
    question: 'What are Mono and Flux, and what does "nothing happens until you subscribe" mean?',
    answer:
        '<p><code>Mono&lt;T&gt;</code> is a publisher of <strong>zero or one</strong> element. ' +
        '<code>Flux&lt;T&gt;</code> is a publisher of <strong>zero to many</strong>. Both are ' +
        'implementations of the Reactive Streams <code>Publisher</code> interface, and both are ' +
        '<strong>descriptions of a computation rather than the computation</strong> — the same ' +
        'idea as a stream pipeline, taken further.</p>' +
        '<p>Building a chain of operators does nothing at all. It allocates objects that ' +
        'describe what to do. Work begins when something <strong>subscribes</strong>, and in a ' +
        'Spring WebFlux application the framework subscribes to whatever your handler returns — ' +
        'which is why a <code>Mono</code> you create and forget to return is a database call that ' +
        'never happens, silently, with no error.</p>' +
        '<p>That is the single most common reactive bug and the reason the rule is worth stating ' +
        'as a rule: <strong>never ignore the return value of a reactive method.</strong> Return ' +
        'it, or compose it into the chain you do return, with <code>then</code>, ' +
        '<code>flatMap</code> or <code>zip</code>.</p>' +
        '<p>The related distinction is <strong>cold versus hot</strong>. Most publishers are ' +
        'cold: each subscriber triggers its own execution, so two subscribers means two HTTP ' +
        'calls. A hot publisher — a <code>Sink</code>, or a cold one through <code>share()</code> ' +
        'or <code>cache()</code> — emits regardless and subscribers see what arrives after they ' +
        'join. Assuming the wrong one is how a request gets made twice, or how a subscriber ' +
        'silently misses the first events.</p>',
    referenceLinks: [
        { title: 'Reactor Core — Mono and Flux', url: 'https://projectreactor.io/docs/core/release/reference/' }
    ],
    tags: ['reactive', 'reactor', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'backpressure',
    importance: 'must-know',
    subsection: 'reactive',
    question: 'What is backpressure, and how does Reactive Streams handle it?',
    answer:
        '<p>Backpressure is what happens when a <strong>producer is faster than its ' +
        'consumer</strong>. Without a mechanism, the difference accumulates: an unbounded queue ' +
        'grows until the process runs out of memory, or a bounded one drops data silently.</p>' +
        '<p>Reactive Streams solves it by <strong>inverting the flow of control</strong>. The ' +
        'subscriber calls <code>request(n)</code> to say how many elements it is ready for, and ' +
        'the publisher may not send more than that. Demand flows upstream while data flows ' +
        'downstream — so the pipeline is pull-based underneath a push-shaped API, and the slowest ' +
        'stage sets the rate for everything above it.</p>' +
        '<p>That is the property a plain <code>CompletableFuture</code> chain does not have, and ' +
        'it is the honest reason to reach for reactive rather than "it is faster".</p>' +
        '<p>When the source genuinely cannot be slowed — clock ticks, a market data feed, sensor ' +
        'readings — you choose a policy explicitly:</p>' +
        '<ul>' +
        '<li><code>onBackpressureBuffer(n)</code> — queue up to a bound, then error.</li>' +
        '<li><code>onBackpressureDrop()</code> — discard what does not fit.</li>' +
        '<li><code>onBackpressureLatest()</code> — keep only the newest, which is right for a ' +
        'gauge and wrong for a transaction log.</li>' +
        '<li><code>sample</code>, <code>buffer</code>, <code>window</code> — reduce the rate by ' +
        'aggregating rather than discarding.</li>' +
        '</ul>' +
        '<p>The point worth making: there is no policy that avoids the choice. Either the ' +
        'producer slows down, or something is dropped, or memory grows. Backpressure does not ' +
        'make the problem go away — it makes the decision explicit and puts it where someone can ' +
        'see it.</p>',
    referenceLinks: [
        { title: 'Reactive Streams Specification', url: 'https://www.reactive-streams.org/' }
    ],
    tags: ['reactive', 'backpressure', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'blocking-in-a-reactive-chain',
    importance: 'must-know',
    subsection: 'reactive',
    question: 'What happens if you make a blocking call inside a reactive chain?',
    answer:
        '<p>You block an <strong>event-loop thread</strong>, and there are only a handful — ' +
        'typically one per core. Block enough of them and the entire application stops serving ' +
        'requests, including ones that had nothing to do with the slow call.</p>' +
        '<p>This is qualitatively worse than blocking in a servlet application. There, a blocked ' +
        'request thread costs you that request and the pool has two hundred more. In WebFlux ' +
        'blocking four threads on a four-core machine is total outage, and the symptom is a ' +
        'service that appears completely dead while using no CPU.</p>' +
        '<p>What counts as blocking is broader than people expect: <strong>JDBC, ' +
        '<code>RestTemplate</code>, file I/O, <code>Thread.sleep</code>, a synchronised block ' +
        'under contention, and any library that does any of those internally.</strong> One ' +
        'blocking driver deep in a dependency is enough.</p>' +
        '<p>The remedies:</p>' +
        '<ul>' +
        '<li><strong>Do not block</strong> — use a reactive client all the way down: ' +
        '<code>WebClient</code>, R2DBC, a reactive Redis or Mongo driver.</li>' +
        '<li><strong>If you must, offload it</strong>: ' +
        '<code>Mono.fromCallable(...).subscribeOn(Schedulers.boundedElastic())</code>. That moves ' +
        'the blocking work to a pool built for it and keeps the event loop free. It is a bridge, ' +
        'not a design — a fully offloaded application is a thread-per-request application with ' +
        'extra syntax.</li>' +
        '<li><strong>Detect it in tests</strong> with BlockHound, which instruments the JVM to ' +
        'throw when a blocking call happens on a non-blocking thread. This is the only reliable ' +
        'way to find the one buried in a dependency.</li>' +
        '</ul>',
    referenceLinks: [
        { title: 'Reactor — Schedulers', url: 'https://projectreactor.io/docs/core/release/reference/' }
    ],
    tags: ['reactive', 'pitfalls', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'reactive-versus-virtual-threads',
    importance: 'must-know',
    subsection: 'reactive',
    question: 'Do virtual threads make reactive programming unnecessary?',
    answer:
        '<p>For most of what people used it for, yes. For what it was designed for, no.</p>' +
        '<p>The overwhelmingly common reason teams adopted WebFlux was <strong>"we cannot afford ' +
        'a platform thread per request"</strong>. Virtual threads remove that constraint ' +
        'entirely: a blocking call parks the virtual thread and releases its carrier, so a ' +
        'million concurrent requests is a scheduling problem rather than a memory one. And they ' +
        'give it back with ordinary code — readable stack traces, working debuggers, ' +
        '<code>try/catch</code>, <code>ThreadLocal</code>, profilers that attribute time ' +
        'correctly. In Spring Boot that is one property, ' +
        '<code>spring.threads.virtual.enabled=true</code>.</p>' +
        '<p>What reactive still has that virtual threads do not:</p>' +
        '<ul>' +
        '<li><strong>Backpressure.</strong> A blocking call has no way to say "send me ten more ' +
        'and no faster". For streaming pipelines where the consumer is slower than the producer, ' +
        'this is the whole problem and virtual threads do not address it.</li>' +
        '<li><strong>Composition operators over time</strong> — <code>window</code>, ' +
        '<code>buffer</code>, <code>sample</code>, <code>retryWhen</code>, ' +
        '<code>zip</code> across sources. Hand-rolling those over threads is unpleasant.</li>' +
        '<li><strong>An existing reactive stack.</strong> Half-migrating is worse than either ' +
        'end state.</li>' +
        '</ul>' +
        '<p>So the recommendation for a new service, said plainly: <strong>thread-per-request ' +
        'with virtual threads, unless you have a genuine streaming or backpressure ' +
        'requirement.</strong> Being able to say that — rather than defending whichever one you ' +
        'have used — is what the question is testing.</p>',
    referenceLinks: [
        { title: 'JEP 444: Virtual Threads', url: 'https://openjdk.org/jeps/444' }
    ],
    tags: ['reactive', 'virtual-threads', 'judgement', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'webclient-restclient-resttemplate',
    importance: 'must-know',
    subsection: 'reactive',
    question: 'RestTemplate, WebClient or RestClient — which should new code use?',
    answer:
        '<p>Four options now, and the answer changed in Spring Framework 6.1.</p>' +
        '<ul>' +
        '<li><strong><code>RestTemplate</code></strong> — synchronous, and in <strong>maintenance ' +
        'mode</strong> since Spring 5. Not deprecated, still supported, still in an enormous ' +
        'amount of working code. There is no urgency to migrate and no reason to start with ' +
        'it.</li>' +
        '<li><strong><code>WebClient</code></strong> — reactive and non-blocking, returning ' +
        '<code>Mono</code> and <code>Flux</code>. For years this was the recommended replacement ' +
        'even in servlet applications, which meant writing <code>.block()</code> at the end and ' +
        'pulling in the whole reactive stack for a synchronous call.</li>' +
        '<li><strong><code>RestClient</code></strong> — added in <strong>Spring Framework ' +
        '6.1</strong>. <code>WebClient</code>\'s fluent API with synchronous semantics and no ' +
        'reactive dependency. <strong>This is the answer for new blocking code</strong>, and it ' +
        'is what removes the awkwardness above.</li>' +
        '<li><strong>HTTP interfaces</strong> — a <code>@HttpExchange</code>-annotated interface ' +
        'with a generated implementation, backed by any of the above. Declarative in the way ' +
        'Feign was, without the extra dependency.</li>' +
        '</ul>' +
        '<p>Whichever you pick, the things that actually matter are the same and are usually the ' +
        'real question: <strong>set a connect and a read timeout</strong> — the defaults are ' +
        'often infinite, and an HTTP client with no timeout is how one slow dependency takes down ' +
        'a service; size the connection pool; and put the retry and circuit-breaker policy ' +
        'somewhere explicit rather than assuming the client has one.</p>',
    referenceLinks: [
        { title: 'Spring Framework — REST Clients', url: 'https://docs.spring.io/spring-framework/reference/integration/rest-clients.html' }
    ],
    tags: ['spring', 'http-clients', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'reactive-context-and-threadlocal',
    importance: 'should-know',
    subsection: 'reactive',
    question: 'Why does ThreadLocal not work in a reactive application?',
    answer:
        '<p>Because a single request is executed by <strong>many threads over its lifetime</strong>. ' +
        'An operator may run on the event loop, the next on a different one after an async ' +
        'boundary, the next on a scheduler pool. Anything stored in a <code>ThreadLocal</code> at ' +
        'the start is simply not there later, and worse, may be <em>another request\'s</em> value ' +
        'left behind on a reused thread.</p>' +
        '<p>Which breaks three things that quietly depend on it: the MDC that puts a correlation ' +
        'id in every log line, <code>SecurityContextHolder</code>, and transaction ' +
        'synchronisation.</p>' +
        '<p>Reactor\'s answer is the <strong>Context</strong> — an immutable key-value map that ' +
        'travels with the <em>subscription</em> rather than with the thread. It is written with ' +
        '<code>contextWrite</code> and read with <code>deferContextual</code>, and the direction ' +
        'is the thing to remember: <strong>the context propagates upstream</strong>, from the ' +
        'subscriber toward the source, because it is assembled at subscribe time. So ' +
        '<code>contextWrite</code> affects the operators <em>above</em> it in the chain, not ' +
        'below, which is the opposite of what everyone assumes on first reading.</p>' +
        '<p>Spring builds on this: <code>ReactiveSecurityContextHolder</code> instead of the ' +
        'thread-local one, and the <code>context-propagation</code> library to bridge existing ' +
        '<code>ThreadLocal</code>-based tooling across async boundaries.</p>' +
        '<p>Worth adding that virtual threads make this problem disappear — a virtual thread is ' +
        'still a thread, so <code>ThreadLocal</code> works normally. <em>Scoped values</em> are ' +
        'the better tool there, because a million virtual threads each with a thread-local map is ' +
        'a lot of memory.</p>',
    referenceLinks: [
        { title: 'Reactor — Adding a Context to a Reactive Sequence', url: 'https://projectreactor.io/docs/core/release/reference/' }
    ],
    tags: ['reactive', 'context', 'observability'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'reactive-whole-stack-problem',
    importance: 'should-know',
    subsection: 'reactive',
    question: 'What is R2DBC, and why does one blocking layer ruin a reactive application?',
    answer:
        '<p>R2DBC is a <strong>reactive relational database driver specification</strong> — the ' +
        'non-blocking counterpart to JDBC, with Spring Data R2DBC on top of it. It exists because ' +
        'JDBC\'s API is blocking by design: <code>ResultSet.next()</code> waits, and no wrapper ' +
        'can change that.</p>' +
        '<p>Which is the point of the second half of the question. <strong>A reactive application ' +
        'is only as non-blocking as its most blocking layer.</strong> WebFlux in front of JDBC ' +
        'gives you the complexity of the reactive model and the thread behaviour of the blocking ' +
        'one — every database call either blocks an event-loop thread, which is an outage, or is ' +
        'offloaded to <code>boundedElastic</code>, which is a thread pool per request with extra ' +
        'steps.</p>' +
        '<p>So committing to reactive means committing all the way down, and that has real ' +
        'costs:</p>' +
        '<ul>' +
        '<li><strong>R2DBC is not JPA.</strong> No persistence context, no lazy loading, no dirty ' +
        'checking, no cascade — relationships are your problem. That is a large amount of ' +
        'machinery to give up.</li>' +
        '<li><strong>Transactions are context-bound</strong> rather than thread-bound, so ' +
        '<code>@Transactional</code> works differently and every custom bit of transaction ' +
        'handling needs revisiting.</li>' +
        '<li><strong>Ecosystem gaps.</strong> Driver maturity varies, and some tools simply have ' +
        'no reactive equivalent.</li>' +
        '</ul>' +
        '<p>The conclusion this leads to is the same as the virtual-threads answer: unless the ' +
        'application has a genuine streaming or backpressure requirement, the whole-stack cost of ' +
        'reactive now buys something virtual threads give you for a property in ' +
        '<code>application.yml</code>.</p>',
    referenceLinks: [
        { title: 'Spring Data R2DBC — Reference', url: 'https://docs.spring.io/spring-data/relational/reference/r2dbc.html' }
    ],
    tags: ['reactive', 'persistence', 'architecture'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'debugging-a-reactive-stack-trace',
    importance: 'should-know',
    subsection: 'reactive',
    question: 'Why are reactive stack traces useless, and what do you do about it?',
    answer:
        '<p>Because the stack at the moment of failure is the <strong>assembly of operators on ' +
        'whatever thread happened to be running</strong>, not the path through your code that ' +
        'built the chain. You get forty frames of Reactor internals and none of your own, and ' +
        'nothing indicating which request it belonged to.</p>' +
        '<p>Three tools, in increasing order of cost:</p>' +
        '<ul>' +
        '<li><strong><code>checkpoint("description")</code></strong> — insert at a suspicious ' +
        'point in the chain and the description appears in the traceback of any error passing ' +
        'through it. Zero overhead, and the right first move.</li>' +
        '<li><strong><code>Hooks.onOperatorDebug()</code></strong> — captures an assembly stack ' +
        'trace at every operator, so errors carry the line that built the chain. Expensive enough ' +
        'that it is a development-only switch.</li>' +
        '<li><strong>The ReactorDebugAgent</strong> — the same information via bytecode ' +
        'instrumentation at class-load time, cheap enough to run in production. This is the one ' +
        'to name.</li>' +
        '</ul>' +
        '<p>Also worth having: <code>log()</code> on a chain prints every signal — subscribe, ' +
        'request, onNext, onComplete, onError — which makes "nothing happened" debuggable by ' +
        'showing whether a subscription occurred at all. And correlation ids must be carried in ' +
        'the Reactor <code>Context</code>, because the MDC is thread-based and will attribute log ' +
        'lines to the wrong request.</p>' +
        '<p>The honest framing to offer: <strong>this difficulty is a permanent tax on the ' +
        'reactive model</strong>, not a tooling gap that will close. It is a legitimate input to ' +
        'the decision about whether to adopt it, and mentioning it is a stronger signal than ' +
        'listing the operators.</p>',
    referenceLinks: [
        { title: 'Reactor — Debugging Reactive Applications', url: 'https://projectreactor.io/docs/core/release/reference/' }
    ],
    tags: ['reactive', 'debugging', 'operations'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
}

    ]
};
