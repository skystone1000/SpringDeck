/* ==========================================================================
   data/microservices.js — Microservices & Distributed Patterns

   The first topic on the `distributed` track.

   Four subsections. Boundaries is the round-4 conversation: where does a
   service end and why. Resilience is the one candidates most often answer
   with a library name rather than a behaviour. Consistency is where the
   genuinely hard questions live, and where "we use a saga" without knowing
   what a compensating transaction has to handle is easy to spot. Platform is
   the operational furniture.

   THE THEME RUNNING THROUGH ALL FOUR: every one of these patterns exists to
   buy something back that a monolith gave away for free — a transaction, a
   join, a stack trace, a single deploy. The questions are written so that the
   cost is the answer, because a candidate who can only list benefits has read
   about microservices rather than run them.

   ONE GLOBAL PER FILE.
   ========================================================================== */

const microservicesData = {
    id: 'microservices',
    title: 'Microservices & Distributed Patterns',
    subsections: [
        { id: 'boundaries',  title: 'Boundaries & Communication' },
        { id: 'resilience',  title: 'Resilience' },
        { id: 'consistency', title: 'Consistency & Sagas' },
        { id: 'platform',    title: 'Gateway, Discovery & Config' }
    ],
    keyTopics: [
        'service decomposition', 'database per service', 'sync vs async',
        'timeouts and retries', 'circuit breaker', 'bulkhead', 'idempotency keys',
        'saga orchestration vs choreography', 'compensating transactions',
        'transactional outbox', 'why not 2PC', 'service discovery', 'API gateway',
        'config server', 'distributed tracing'
    ],
    questions: [

/* ==== Boundaries & Communication ====================================== */

{
    id: 'when-to-split-a-monolith',
    importance: 'must-know',
    subsection: 'boundaries',
    question: 'When should a monolith be split into services, and how do you choose the boundaries?',
    answer:
        '<p>The strongest answer starts by pushing back on the premise, because the honest ' +
        'default is <strong>do not split yet</strong>. Microservices solve organisational and ' +
        'operational problems, not technical ones, and adopting them before you have those ' +
        'problems buys the costs without the benefits.</p>' +
        '<p><strong>Reasons that justify a split:</strong></p>' +
        '<ul>' +
        '<li><strong>Independent deployment.</strong> Several teams blocked on one release train ' +
        'is the reason microservices exist. If one team owns the codebase, this reason does not ' +
        'apply.</li>' +
        '<li><strong>Genuinely different scaling profiles.</strong> An image processor and a ' +
        'CRUD API want different machines.</li>' +
        '<li><strong>Different availability or compliance requirements</strong> — a payments ' +
        'component that must be isolated.</li>' +
        '<li><strong>Team ownership.</strong> Conway\'s law is descriptive, so aligning services ' +
        'to teams is working with it rather than against it.</li>' +
        '</ul>' +
        '<p><strong>Reasons that are not reasons:</strong> the codebase is large, the technology ' +
        'is old, we want to try a new language, and it is what everyone does.</p>' +
        '<p><strong>Where the boundaries go:</strong> along <strong>business capabilities</strong> ' +
        'and, if you have done the work, bounded contexts — orders, payments, inventory. Not ' +
        'along technical layers, which produces a service per tier and a network hop per method ' +
        'call.</p>' +
        '<p>The test that settles most arguments: <strong>can this service be deployed without ' +
        'coordinating with another one?</strong> If not, the boundary is wrong, and what you ' +
        'have is a distributed monolith — all the operational cost of services with none of the ' +
        'independence.</p>' +
        '<p>The route people underuse: a <strong>modular monolith</strong> first. Enforce the ' +
        'boundaries in one deployable — Spring Modulith makes them verifiable in a test — and ' +
        'extract a module when it earns it. Boundaries drawn on paper are usually wrong, and it ' +
        'is far cheaper to move a package than a service.</p>',
    referenceLinks: [
        { title: 'Spring Modulith — Reference', url: 'https://docs.spring.io/spring-modulith/reference/' }
    ],
    tags: ['microservices', 'architecture', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'database-per-service',
    importance: 'must-know',
    subsection: 'boundaries',
    question: 'Why database per service, and what does it cost you?',
    answer:
        '<p>Because a shared database is a <strong>shared, invisible contract</strong>. If two ' +
        'services read the same table, neither can change its schema, and the coupling is not ' +
        'expressed anywhere a compiler or a code review would see it. That single fact removes ' +
        'independent deployment, which was the reason for splitting in the first place.</p>' +
        '<p>It also protects the invariants: a service that owns its data can enforce rules about ' +
        'it. When anything can write the table, nothing can guarantee anything.</p> ' +
        '<p><strong>What it costs — and every item is something the monolith gave you free:</strong></p>' +
        '<ul>' +
        '<li><strong>No joins across services.</strong> A screen showing an order with customer ' +
        'details and stock levels needs several calls and composition in code. Which brings the ' +
        'N+1 problem back at the network layer, where each iteration is milliseconds rather than ' +
        'microseconds.</li>' +
        '<li><strong>No foreign keys, so no referential integrity.</strong> An order can ' +
        'reference a customer that no longer exists, and nothing stops it.</li>' +
        '<li><strong>No transactions across services.</strong> This is the big one, and it is why ' +
        'sagas exist.</li>' +
        '<li><strong>Reporting becomes a project.</strong> A query spanning five services is not ' +
        'a query. You end up with a warehouse, a read model or an event stream, and someone has ' +
        'to own it.</li>' +
        '<li><strong>Duplicated data, and staleness.</strong> The orders service caches a ' +
        'customer name so it does not call out on every read, and now there are two copies and ' +
        'one of them is old.</li>' +
        '</ul>' +
        '<p>The pragmatic middle ground worth naming: <strong>separate schemas in one database ' +
        'instance</strong>, with each service granted access only to its own. Enforces the ' +
        'boundary, keeps operational cost down, and leaves the door open — but be honest that it ' +
        'is a shared failure domain.</p>',
    referenceLinks: [
        { title: 'microservices.io — Database per Service', url: 'https://microservices.io/patterns/data/database-per-service.html' }
    ],
    tags: ['microservices', 'data', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'sync-versus-async-communication',
    importance: 'must-know',
    subsection: 'boundaries',
    question: 'Synchronous calls or events — how do you decide how two services talk?',
    answer:
        '<p>By whether the caller <strong>needs the answer to continue</strong>, and by how much ' +
        'availability coupling you are willing to accept.</p>' +
        '<p><strong>Synchronous — HTTP or gRPC.</strong> Simple, debuggable, and the answer is ' +
        'immediate. The cost is <strong>availability multiplication</strong>: a request touching ' +
        'four services each at 99.9% is 99.6% end to end, and every one of them is a way for your ' +
        'request to fail. It also couples runtime lifetimes — if the downstream is down, you are ' +
        'down.</p>' +
        '<p><strong>Asynchronous — events on a broker.</strong> The producer does not know or ' +
        'care who consumes, so the consumer can be down, slow, or added later without the ' +
        'producer changing. That is genuine decoupling rather than the indirection kind.</p>' +
        '<p>What async costs, and this is the part that gets skipped:</p>' +
        '<ul>' +
        '<li><strong>Eventual consistency becomes a product decision.</strong> "The order is ' +
        'placed but the confirmation email has not been sent yet" is a user-visible state ' +
        'somebody has to design for.</li>' +
        '<li><strong>Debugging is harder.</strong> There is no stack trace across a broker; you ' +
        'need correlation ids and tracing or you are reading logs by timestamp.</li>' +
        '<li><strong>Ordering and duplicates are your problem.</strong></li>' +
        '<li><strong>The broker is now a critical dependency</strong> — you have not removed the ' +
        'shared failure domain, you have moved it.</li>' +
        '</ul>' +
        '<p>The decision rule that holds up: <strong>synchronous for queries, asynchronous for ' +
        'facts.</strong> "What is this customer\'s address" wants an answer now. "An order was ' +
        'placed" is a statement about the past that several services care about, and making the ' +
        'order service call each of them synchronously is how a new consumer becomes a change to ' +
        'the producer.</p>',
    referenceLinks: [
        { title: 'microservices.io — Communication Patterns', url: 'https://microservices.io/patterns/communication-style/messaging.html' }
    ],
    tags: ['microservices', 'messaging', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'distributed-monolith',
    importance: 'should-know',
    subsection: 'boundaries',
    question: 'What is a distributed monolith, and how would you recognise one?',
    answer:
        '<p>A system split into services that <strong>still has to be deployed as a unit</strong>. ' +
        'It has every cost of distribution and none of the independence, which makes it strictly ' +
        'worse than the monolith it came from.</p>' +
        '<p>The symptoms, most diagnostic first:</p>' +
        '<ul>' +
        '<li><strong>Releases are coordinated.</strong> Services go out together, in an order, ' +
        'with a rollback plan that covers all of them. This is the definitive sign.</li>' +
        '<li><strong>A shared library holds the domain model</strong>, so a field added to an ' +
        'entity means bumping a version in every service and redeploying them.</li>' +
        '<li><strong>A shared database</strong>, or one service reading another\'s tables.</li>' +
        '<li><strong>Long synchronous call chains</strong> — a request passing through five ' +
        'services before anything happens.</li>' +
        '<li><strong>One team owns several services</strong> and changes them together every ' +
        'time.</li>' +
        '<li><strong>You cannot run one service locally</strong> without running six.</li>' +
        '</ul>' +
        '<p>The shared-library point deserves care, because "do not share code" is over-stated. ' +
        'Sharing <em>technical</em> libraries — a logging configuration, a tracing starter, an ' +
        'HTTP client wrapper — is fine and sensible. Sharing the <em>domain model</em> is what ' +
        'couples deployments, because the domain is exactly what changes. A useful test: if ' +
        'bumping the shared library version requires every consumer to redeploy before anything ' +
        'works, it is domain coupling wearing a library\'s clothes.</p>' +
        '<p>The way out is not more services. It is fixing one boundary at a time — usually by ' +
        'replacing a synchronous call with an event, or by moving data ownership so a service ' +
        'stops needing another one to answer a read.</p>',
    referenceLinks: [
        { title: 'microservices.io — Anti-patterns', url: 'https://microservices.io/patterns/microservices.html' }
    ],
    tags: ['microservices', 'anti-patterns', 'architecture'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

/* ==== Resilience ====================================================== */

{
    id: 'timeouts-and-retries',
    importance: 'must-know',
    subsection: 'resilience',
    question: 'What are the rules for retrying a failed call?',
    answer:
        '<p>Four, and breaking any one of them turns a retry from a resilience measure into an ' +
        'outage amplifier.</p>' +
        '<p><strong>1. Set a timeout first.</strong> A retry policy on a call with no timeout is ' +
        'meaningless — you cannot retry something that has not finished. Every HTTP client, ' +
        'database call and message consumer needs an explicit connect and read timeout, and the ' +
        'defaults in most libraries are infinite. This is the most common single cause of one ' +
        'slow dependency taking down a service.</p>' +
        '<p><strong>2. Only retry what is safe to repeat.</strong> A read, or a write with an ' +
        'idempotency key. Retrying a payment because the response timed out is how a customer is ' +
        'charged twice — and a timeout tells you nothing about whether the work happened.</p>' +
        '<p><strong>3. Back off exponentially, with jitter.</strong> Fixed-interval retries from ' +
        'a thousand clients arrive together and keep arriving together, so the struggling service ' +
        'never gets a gap to recover in. Jitter — randomising the delay — is what breaks the ' +
        'synchronisation, and it is the half people leave out.</p>' +
        '<p><strong>4. Cap the total, and do not retry at every layer.</strong> Three attempts at ' +
        'each of four layers is 81 requests for one call. Retry at <em>one</em> layer, as close ' +
        'to the failure as possible, and give the whole operation a budget.</p>' +
        '<p>The failure mode to be able to name is the <strong>retry storm</strong>: a service ' +
        'degrades, clients retry, the extra load makes it worse, more requests time out, more ' +
        'retries. The system cannot recover even after the original cause is gone, because the ' +
        'retries are now the load. That is what circuit breakers exist to stop.</p>',
    referenceLinks: [
        { title: 'Resilience4j — Retry', url: 'https://resilience4j.readme.io/docs/retry' }
    ],
    tags: ['resilience', 'retries', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'circuit-breaker-states',
    importance: 'must-know',
    subsection: 'resilience',
    question: 'How does a circuit breaker work, and what problem does it solve?',
    answer:
        '<p>It stops you making calls that are <strong>going to fail anyway</strong>, which ' +
        'protects both sides: your threads are not parked waiting for a timeout, and the ' +
        'struggling dependency gets a chance to recover instead of being hammered.</p>' +
        '<p>Three states:</p>' +
        '<ul>' +
        '<li><strong>Closed</strong> — calls pass through, outcomes are recorded. Normal.</li>' +
        '<li><strong>Open</strong> — the failure rate crossed a threshold over a sliding window, ' +
        'so calls fail <em>immediately</em> without touching the network. This is the point: ' +
        'failing in a microsecond instead of a five-second timeout is what stops threads piling ' +
        'up.</li>' +
        '<li><strong>Half-open</strong> — after a wait, a limited number of trial calls are let ' +
        'through. If they succeed the breaker closes; if not it opens again. This is what makes ' +
        'recovery automatic rather than requiring a deploy.</li>' +
        '</ul>' +
        '<p>Configuration that matters more than the library choice: the window should be ' +
        '<strong>failure rate over a minimum number of calls</strong>, not a raw count — ' +
        'otherwise a low-traffic endpoint trips on two failures. And <strong>slow calls should ' +
        'count as failures</strong>; a dependency answering in nine seconds is doing more damage ' +
        'than one returning errors.</p>' +
        '<p>Two things to say that show you have used one:</p>' +
        '<ul>' +
        '<li><strong>What happens when it is open is a product decision.</strong> A cached value, ' +
        'a degraded response, a queued request, or a clean error — but decided deliberately. A ' +
        'breaker with no fallback just converts one failure into another.</li>' +
        '<li><strong>Do not put one on everything.</strong> A breaker on a call your request ' +
        'cannot proceed without adds a failure mode and no protection. They belong on optional ' +
        'dependencies and on calls with a meaningful fallback.</li>' +
        '</ul>' +
        '<p>Hystrix has been in maintenance since 2018; <strong>Resilience4j</strong> is the ' +
        'current answer in the Spring ecosystem, and it composes retry, breaker, bulkhead, rate ' +
        'limiter and time limiter as separate decorators.</p>',
    referenceLinks: [
        { title: 'Resilience4j — Circuit Breaker', url: 'https://resilience4j.readme.io/docs/circuitbreaker' }
    ],
    tags: ['resilience', 'circuit-breaker', 'must-know'],
    images: [],
    hasDiagram: true,
    diagramType: 'flowchart',
    diagramConfig: {
        title: 'Circuit breaker state transitions',
        nodes: [
            { id: 'closed', label: 'CLOSED — calls pass, outcomes recorded', kind: 'start' },
            { id: 'open',   label: 'OPEN — fail fast, no network call',      kind: 'trap' },
            { id: 'half',   label: 'HALF-OPEN — a few trial calls',          kind: 'step' }
        ],
        edges: [
            { from: 'closed', to: 'open',   label: 'failure rate over threshold' },
            { from: 'open',   to: 'half',   label: 'wait duration elapsed' },
            { from: 'half',   to: 'closed', label: 'trials succeed' },
            { from: 'half',   to: 'open',   label: 'trials fail' }
        ]
    },
    codeSnippets: []
},

{
    id: 'bulkhead-isolation',
    importance: 'should-know',
    subsection: 'resilience',
    question: 'What is the bulkhead pattern?',
    answer:
        '<p>Partitioning a resource so that one dependency cannot consume all of it. The name is ' +
        'from ships: compartments so one breach does not sink the vessel.</p>' +
        '<p>The failure it prevents is specific and common. A service has a two-hundred-thread ' +
        'request pool and calls five dependencies. One of them slows to ten seconds. Requests ' +
        'touching it pile up, occupy every thread in the shared pool, and now the four healthy ' +
        'dependencies are unreachable too — <strong>a total outage caused by one degraded ' +
        'optional dependency</strong>.</p>' +
        '<p>A bulkhead gives that dependency its own bounded allocation: twenty threads, or twenty ' +
        'permits. When they are exhausted, calls to <em>that</em> dependency are rejected ' +
        'immediately and everything else keeps working. The failure is contained to the part that ' +
        'is actually failing.</p>' +
        '<p>Two implementations, and the difference matters:</p>' +
        '<ul>' +
        '<li><strong>Semaphore</strong> — a permit count on the calling thread. Cheap, no context ' +
        'switch, and it cannot enforce a timeout on a call that is already blocking.</li>' +
        '<li><strong>Thread pool</strong> — a separate executor per dependency. More expensive, ' +
        'and it can time out and abandon a call, which is what you want against something that ' +
        'may never return.</li>' +
        '</ul>' +
        '<p>The idea generalises well beyond threads, and saying so is what separates the pattern ' +
        'from the library: <strong>connection pools per downstream, separate queues per tenant, ' +
        'separate instances for a noisy customer.</strong> Anywhere a shared bounded resource ' +
        'exists, one consumer can exhaust it.</p>' +
        '<p>Worth noting that virtual threads change the arithmetic — the thread pool is no ' +
        'longer the scarce resource — but not the principle. The scarce resource becomes ' +
        'connections or memory, and it still needs partitioning.</p>',
    referenceLinks: [
        { title: 'Resilience4j — Bulkhead', url: 'https://resilience4j.readme.io/docs/bulkhead' }
    ],
    tags: ['resilience', 'isolation'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'idempotency-keys',
    importance: 'must-know',
    subsection: 'resilience',
    question: 'How do you make a POST safe to retry?',
    answer:
        '<p>With an <strong>idempotency key</strong> supplied by the client — a UUID it generates ' +
        'once per logical operation and repeats on every retry of that operation.</p>' +
        '<p>The problem it solves is that <strong>a timeout is not a failure</strong>. The client ' +
        'has no idea whether the request never arrived, arrived and is still running, or ' +
        'completed and the response was lost. Retrying is the only sensible action and it is ' +
        'unsafe by default.</p>' +
        '<p>The server side, in order:</p>' +
        '<ul>' +
        '<li>Read the key from a header — <code>Idempotency-Key</code> is the convention Stripe ' +
        'established and the IETF has since drafted.</li>' +
        '<li><strong>Insert a row for that key with a unique constraint, in the same transaction ' +
        'as the work.</strong> The unique index is what makes this correct under concurrency; a ' +
        'check-then-act against a cache has a race that shows up exactly when two retries arrive ' +
        'together, which is the common case.</li>' +
        '<li>On a duplicate key, <strong>return the stored original response</strong> rather than ' +
        'an error. The client cannot tell it was a retry, which is the whole point.</li>' +
        '<li>Expire keys after a sensible window — 24 hours is typical.</li>' +
        '</ul>' +
        '<p>Two refinements worth mentioning. <strong>Store the request fingerprint alongside the ' +
        'key</strong>, and reject a reused key with different content — that is a client bug and ' +
        'silently returning the old response hides it. And <strong>handle the in-flight case</strong>: ' +
        'a retry arriving while the original is still running should get a 409, not a second ' +
        'execution.</p>' +
        '<p>The alternative, where it applies, is a <strong>natural</strong> idempotency key — an ' +
        'order id the client already owns, or a business constraint such as one payment per ' +
        'invoice. Better when available, because there is no extra table.</p>',
    referenceLinks: [
        { title: 'IETF draft — The Idempotency-Key HTTP Header Field', url: 'https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/' }
    ],
    tags: ['idempotency', 'api-design', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

/* ==== Consistency & Sagas ============================================= */

{
    id: 'why-not-two-phase-commit',
    importance: 'must-know',
    subsection: 'consistency',
    question: 'Why not use two-phase commit across services?',
    answer:
        '<p>Because it trades availability for consistency in exactly the way a distributed ' +
        'system cannot afford, and it does so at the worst possible moment.</p>' +
        '<p>2PC has a coordinator that asks every participant to prepare, then tells them all to ' +
        'commit. The problems:</p>' +
        '<ul>' +
        '<li><strong>It is a blocking protocol.</strong> A participant that has voted to commit ' +
        'must hold its locks and wait. If the coordinator dies between the two phases, ' +
        'participants are stuck — they may not commit and may not abort — and they stay stuck ' +
        'until it comes back. This is the fundamental objection, not a tuning problem.</li>' +
        '<li><strong>Locks are held across a network round trip</strong>, so throughput collapses ' +
        'and lock contention rises sharply.</li>' +
        '<li><strong>Availability is the product of all participants.</strong> Any one of them ' +
        'being down means no transaction completes.</li>' +
        '<li><strong>Most modern datastores do not support it usefully.</strong> Kafka, most ' +
        'NoSQL stores, and third-party HTTP APIs have no XA. So even where you wanted it, you ' +
        'cannot have it end to end — which is often the practical answer.</li>' +
        '</ul>' +
        '<p>The alternative is to accept <strong>eventual consistency</strong> and design for it: ' +
        'a saga of local transactions, each committing independently, with compensations for the ' +
        'steps that need undoing. That gives up isolation — intermediate states are visible, so ' +
        'an order can be briefly "created but not paid" — and it is a real trade rather than a ' +
        'free upgrade.</p>' +
        '<p>The nuance that shows judgement: <strong>2PC is not always wrong.</strong> Within one ' +
        'trusted datacentre, across two databases, with a reliable coordinator, it is a ' +
        'legitimate tool and simpler than a saga. What makes it a poor fit for microservices is ' +
        'the number of participants, their independence, and the fact that they fail ' +
        'separately.</p>',
    referenceLinks: [
        { title: 'microservices.io — Saga Pattern', url: 'https://microservices.io/patterns/data/saga.html' }
    ],
    tags: ['consistency', 'transactions', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'saga-orchestration-or-choreography',
    importance: 'must-know',
    subsection: 'consistency',
    question: 'What is a saga, and when would you orchestrate rather than choreograph?',
    answer:
        '<p>A saga is a business transaction spread over several services as a sequence of ' +
        '<strong>local</strong> transactions, each of which commits on its own. If a later step ' +
        'fails, earlier ones are undone by <strong>compensating</strong> transactions — because ' +
        'there is nothing to roll back; those commits are permanent.</p>' +
        '<p><strong>Choreography</strong> — each service listens for events and emits its own. ' +
        'Order service emits <code>OrderCreated</code>; payment service reacts and emits ' +
        '<code>PaymentTaken</code>; inventory reacts to that. No central component.</p>' +
        '<ul>' +
        '<li><em>Good:</em> no single point of failure, services stay decoupled, adding a ' +
        'participant does not change existing ones.</li>' +
        '<li><em>Bad:</em> <strong>the process exists nowhere.</strong> To find out what happens ' +
        'when an order is placed you read five codebases, and cyclic dependencies between event ' +
        'handlers are easy to create and hard to see.</li>' +
        '</ul>' +
        '<p><strong>Orchestration</strong> — a coordinator holds the state machine and tells each ' +
        'service what to do next.</p>' +
        '<ul>' +
        '<li><em>Good:</em> the process is <strong>in one place, readable, testable and ' +
        'observable</strong>. Where a stuck saga is stuck is a query rather than an ' +
        'investigation.</li>' +
        '<li><em>Bad:</em> the orchestrator is a component to build and run, and it can drift ' +
        'into holding business logic that belongs in the services.</li>' +
        '</ul>' +
        '<p>The rule of thumb: <strong>choreography for two or three steps, orchestration beyond ' +
        'that</strong>, and orchestration whenever the process has a name the business uses — ' +
        '"order fulfilment", "onboarding" — because then it is a domain concept and deserves to ' +
        'exist as one.</p>' +
        '<p>What separates a strong answer is knowing that <strong>compensation is not ' +
        'rollback</strong>. Refunding a payment is a new transaction with its own failure modes, ' +
        'and some steps cannot be compensated at all — an email is sent. Those belong at the end ' +
        'of the saga, after everything that can fail has succeeded.</p>',
    referenceLinks: [
        { title: 'microservices.io — Saga Pattern', url: 'https://microservices.io/patterns/data/saga.html' }
    ],
    tags: ['saga', 'consistency', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'transactional-outbox',
    importance: 'must-know',
    subsection: 'consistency',
    question: 'You update the database and publish an event. How do you keep them consistent?',
    answer:
        '<p>This is the <strong>dual-write problem</strong>, and it has no solution that involves ' +
        'doing both writes. Two datastores, no shared transaction: whichever order you choose, a ' +
        'crash between them leaves the system inconsistent. Save the order and fail to publish, ' +
        'and nothing downstream ever hears about it. Publish and fail to save, and everyone acts ' +
        'on an order that does not exist.</p>' +
        '<p>Wrapping the publish in <code>@Transactional</code> does nothing — the broker is not ' +
        'in the transaction, and a rollback does not unsend a message.</p>' +
        '<p><strong>The transactional outbox</strong> removes the second write. The event is ' +
        'inserted into an <code>outbox</code> table <em>in the same local transaction</em> as the ' +
        'state change, so the two commit or fail together. A separate relay then reads that table ' +
        'and publishes to the broker.</p>' +
        '<p>Two ways to run the relay:</p>' +
        '<ul>' +
        '<li><strong>Polling</strong> — a scheduled job selects unpublished rows, publishes, and ' +
        'marks them sent. Simple, easy to reason about, and it adds latency and database ' +
        'load.</li>' +
        '<li><strong>Change data capture</strong> — Debezium tails the write-ahead log and ' +
        'publishes. No polling, low latency, and a piece of infrastructure to operate.</li>' +
        '</ul>' +
        '<p>What you get is <strong>at-least-once</strong> delivery: the relay may publish and ' +
        'crash before marking the row, so the message goes twice. That is the correct guarantee ' +
        'to aim for, and it makes the consumer\'s idempotency a requirement rather than a nicety ' +
        '— which is the same conclusion the exactly-once question reaches from the other ' +
        'direction.</p>' +
        '<p>A useful refinement: <strong>store the event id in the outbox row</strong> and use it ' +
        'as the message key, so consumers have a stable identifier to deduplicate on.</p>',
    referenceLinks: [
        { title: 'microservices.io — Transactional Outbox', url: 'https://microservices.io/patterns/data/transactional-outbox.html' }
    ],
    tags: ['outbox', 'consistency', 'messaging', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'exactly-once-delivery',
    importance: 'should-know',
    subsection: 'consistency',
    question: 'Can you get exactly-once message delivery?',
    answer:
        '<p>Not as delivery. It is provably impossible over an unreliable network, and the ' +
        'reasoning is short enough to give: the sender cannot distinguish "the message was lost" ' +
        'from "the acknowledgement was lost", so it must either resend — risking a duplicate — or ' +
        'not resend, risking a loss. There is no third option.</p>' +
        '<p>The three guarantees:</p>' +
        '<ul>' +
        '<li><strong>At most once</strong> — fire and forget. Fast, and messages disappear. ' +
        'Acceptable for metrics; not for orders.</li>' +
        '<li><strong>At least once</strong> — retry until acknowledged. Nothing is lost and ' +
        'duplicates happen. <strong>This is what you should design for.</strong></li>' +
        '<li><strong>Exactly once</strong> — not available as a delivery property.</li>' +
        '</ul>' +
        '<p>What is achievable is <strong>effectively-once processing</strong>: at-least-once ' +
        'delivery plus an <strong>idempotent consumer</strong>. The consumer records processed ' +
        'message ids and skips repeats — and the recording must be in the same transaction as ' +
        'the effect, or you have recreated the dual-write problem inside the consumer.</p>' +
        '<p>The nuance about Kafka is worth getting right, because the phrase appears in its ' +
        'documentation. Kafka\'s exactly-once semantics are real and <strong>bounded to ' +
        'Kafka</strong>: an idempotent producer removes duplicates from producer retries, and ' +
        'transactions make a consume-process-produce cycle atomic <em>within the cluster</em>. ' +
        'The moment your consumer writes to a database or calls an API, that guarantee stops at ' +
        'the boundary and you are back to needing idempotency.</p>' +
        '<p>The sentence worth having ready: <strong>make the operation idempotent and the ' +
        'delivery guarantee stops mattering.</strong></p>',
    referenceLinks: [
        { title: 'Kafka — Exactly Once Semantics', url: 'https://kafka.apache.org/documentation/#semantics' }
    ],
    tags: ['messaging', 'consistency', 'idempotency'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

/* ==== Gateway, Discovery & Config ===================================== */

{
    id: 'api-gateway-responsibilities',
    importance: 'should-know',
    subsection: 'platform',
    question: 'What belongs in an API gateway, and what does not?',
    answer:
        '<p>A gateway is the single entry point in front of a set of services. What belongs there ' +
        'is anything that is <strong>true of every request regardless of which service handles ' +
        'it</strong>:</p>' +
        '<ul>' +
        '<li>Routing and load balancing.</li>' +
        '<li>TLS termination.</li>' +
        '<li>Authentication — validating the token once, so each service does not re-implement ' +
        'it. Note <em>authentication</em>, not authorization: whether this user may see this ' +
        'order depends on the order.</li>' +
        '<li>Rate limiting and request size limits.</li>' +
        '<li>Correlation id generation, access logging, metrics.</li>' +
        '<li>CORS.</li>' +
        '</ul>' +
        '<p><strong>What does not belong:</strong> business logic, request or response ' +
        'transformation specific to one service, and data aggregation across services. All three ' +
        'turn the gateway into a component every team must change, which recreates the ' +
        'coordinated-release problem at the front door — the "smart pipes" anti-pattern, and the ' +
        'reason enterprise service buses acquired the reputation they did.</p>' +
        '<p>When aggregation is genuinely needed, the answer is a <strong>backend for ' +
        'frontend</strong> — a service per client type, owned by that client\'s team, sitting ' +
        'behind the gateway. It can hold client-specific logic because it belongs to a single ' +
        'consumer.</p>' +
        '<p>Two more things worth saying. <strong>The gateway must not become a single point of ' +
        'failure</strong>; it needs to be stateless, replicated and boring. And in Kubernetes a ' +
        'lot of this is already provided by the ingress controller and the service mesh, so ' +
        'adding Spring Cloud Gateway on top should be a decision about what it does that they do ' +
        'not, rather than a default.</p>',
    referenceLinks: [
        { title: 'Spring Cloud Gateway — Reference', url: 'https://docs.spring.io/spring-cloud-gateway/reference/' }
    ],
    tags: ['gateway', 'microservices', 'architecture'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'service-discovery',
    importance: 'should-know',
    subsection: 'platform',
    question: 'How does one service find another?',
    answer:
        '<p>Three answers, and which one is right has changed with the platform.</p>' +
        '<ul>' +
        '<li><strong>Client-side discovery.</strong> Instances register with a registry — Eureka, ' +
        'Consul — and the client asks for the list and chooses one itself. The client does the ' +
        'load balancing, so it can be smart about it: least-connections, zone affinity, ' +
        'outlier ejection. The cost is a library in every service, in every language.</li>' +
        '<li><strong>Server-side discovery.</strong> The client calls a stable name and something ' +
        'in the middle routes. A load balancer, or a Kubernetes <code>Service</code>.</li>' +
        '<li><strong>Platform DNS.</strong> In Kubernetes, ' +
        '<code>http://order-service/api/orders</code> resolves through cluster DNS and is load ' +
        'balanced by kube-proxy. No registry, no client library, nothing to run.</li>' +
        '</ul>' +
        '<p>Which is why the modern answer is usually the third: <strong>if you are on ' +
        'Kubernetes, you already have service discovery and adding Eureka is duplicating ' +
        'it.</strong> Spring Cloud Netflix Eureka remains in wide use in older estates and is ' +
        'worth knowing; starting a new system with it needs a reason.</p>' +
        '<p>Two things the naive versions get wrong. <strong>Health checking must be real</strong> ' +
        '— an instance that has registered and is not ready receives traffic, which is why ' +
        'Kubernetes separates liveness from readiness and why a readiness probe that only checks ' +
        'the process is alive is not a readiness probe. And <strong>DNS caching in the JVM</strong> ' +
        'has caught many teams: <code>networkaddress.cache.ttl</code> historically defaulted to ' +
        'caching forever under a security manager, so instances that moved were never found ' +
        'again.</p>' +
        '<p>The step beyond is a <strong>service mesh</strong>, which moves discovery, retries, ' +
        'mTLS and traffic shifting into a sidecar so no application code is involved at all — at ' +
        'the cost of a substantial piece of infrastructure to operate.</p>',
    referenceLinks: [
        { title: 'microservices.io — Service Discovery', url: 'https://microservices.io/patterns/service-registry.html' }
    ],
    tags: ['discovery', 'kubernetes', 'microservices'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'distributed-tracing',
    importance: 'must-know',
    subsection: 'platform',
    question: 'A request is slow and touches six services. How do you find out where the time went?',
    answer:
        '<p><strong>Distributed tracing</strong>, and the answer should describe the mechanism ' +
        'rather than name a product, because the mechanism is what makes it work across ' +
        'languages and frameworks.</p>' +
        '<p>Each incoming request gets a <strong>trace id</strong>. Every unit of work is a ' +
        '<strong>span</strong> with a start, a duration, a parent span id, and attributes. The ' +
        'ids are propagated to every downstream call in a header — the standard is W3C Trace ' +
        'Context, <code>traceparent</code> — so the receiving service continues the same trace ' +
        'instead of starting a new one. A collector assembles the spans into a tree, and the tree ' +
        'shows exactly which call took the time.</p> ' +
        '<p>The implementation in the Spring world, with the version that matters: ' +
        '<strong>Spring Cloud Sleuth was replaced by Micrometer Tracing in Spring Boot 3</strong>, ' +
        'exporting via OpenTelemetry or Zipkin. Instrumentation of the HTTP clients, the servlet ' +
        'filter and the messaging listeners is automatic; what needs care is anything that hops ' +
        'threads, because the context is thread-bound.</p>' +
        '<p>Four things that make tracing actually useful, all frequently missed:</p>' +
        '<ul>' +
        '<li><strong>Propagate through the broker.</strong> A trace that stops at a Kafka producer ' +
        'and restarts at the consumer is two traces. The headers must travel on the message.</li>' +
        '<li><strong>Put the trace id in every log line</strong>, via the MDC, so a trace and the ' +
        'logs can be joined. This is most of the value for a fraction of the effort.</li>' +
        '<li><strong>Sample, but sample intelligently.</strong> Tracing every request at volume is ' +
        'expensive; tail-based sampling keeps the slow and failed traces, which are the ones you ' +
        'want.</li>' +
        '<li><strong>Return the trace id to the client</strong> in an error response, so a support ' +
        'ticket carries the exact trace.</li>' +
        '</ul>',
    referenceLinks: [
        { title: 'W3C Trace Context', url: 'https://www.w3.org/TR/trace-context/' },
        { title: 'Micrometer Tracing', url: 'https://docs.micrometer.io/tracing/reference/' }
    ],
    tags: ['tracing', 'observability', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'configuration-across-services',
    importance: 'should-know',
    subsection: 'platform',
    question: 'How do you manage configuration and secrets across many services?',
    answer:
        '<p>Two separate problems, and conflating them is the usual mistake.</p>' +
        '<p><strong>Configuration.</strong> The twelve-factor answer — environment variables ' +
        'injected by the platform — is right for most of it, and in Kubernetes that is a ' +
        'ConfigMap. Spring Boot reads environment variables with relaxed binding, so ' +
        '<code>SPRING_DATASOURCE_URL</code> binds to <code>spring.datasource.url</code> with no ' +
        'code at all.</p>' +
        '<p>Spring Cloud Config Server adds a git-backed store with per-service and per-profile ' +
        'files, and refresh at runtime through <code>@RefreshScope</code>. What it buys is ' +
        'version history and change review on configuration, which is genuinely valuable; what it ' +
        'costs is a service that everything depends on at startup, so it needs to be as available ' +
        'as the platform.</p>' +
        '<p><strong>Secrets are not configuration.</strong> They need encryption at rest, access ' +
        'control, an audit trail and rotation, and none of those are properties a ConfigMap or a ' +
        'git repository has. Kubernetes Secrets are base64, which is an encoding rather than ' +
        'encryption — saying that plainly is a good signal. The real answers are Vault, AWS ' +
        'Secrets Manager, or a cloud KMS, ideally with short-lived dynamic credentials so a ' +
        'leaked one expires by itself.</p>' +
        '<p>Three rules worth stating:</p>' +
        '<ul>' +
        '<li><strong>The same artefact runs in every environment.</strong> A build per ' +
        'environment means the thing you tested is not the thing you shipped.</li>' +
        '<li><strong>Fail fast on missing configuration.</strong> A service that starts with a ' +
        'null database URL and fails on the first request is worse than one that refuses to ' +
        'start.</li>' +
        '<li><strong>Never log the resolved configuration</strong>, and check what ' +
        '<code>/actuator/env</code> exposes — it will happily print a password.</li>' +
        '</ul>',
    referenceLinks: [
        { title: 'Spring Cloud Config — Reference', url: 'https://docs.spring.io/spring-cloud-config/reference/' }
    ],
    tags: ['configuration', 'secrets', 'operations'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
}

    ]
};
