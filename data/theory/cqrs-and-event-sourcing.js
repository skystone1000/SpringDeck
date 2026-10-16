/* ==========================================================================
   data/theory/cqrs-and-event-sourcing.js — module 71 in the reading path

   The last craft module, and section 5.8 places it after sagas because it
   only makes sense once eventual consistency has been felt rather than
   described.

   The plan's tagline is the module's job: two ideas usually confused for
   one, and neither is a default. So the first four chapters are CQRS with no
   event sourcing anywhere in them, the next four are event sourcing, and the
   ninth is the argument against. The tenth is how to answer the question,
   because "we use CQRS" is said far more often than it is meant.
   ========================================================================== */

const cqrsAndEventSourcingModule = {
    id: 'cqrs-and-event-sourcing',
    trackId: 'craft',
    order: 71,
    title: 'CQRS and Event Sourcing',
    tagline: 'Two ideas usually confused for one, and neither is a default.',
    estimatedMinutes: 45,
    prerequisites: ['ddd-tactical', 'saga-and-consistency'],
    docHub: { title: 'CQRS', url: 'https://martinfowler.com/bliki/CQRS.html' },

    chapters: [
        {
            id: 'cqrs-defined',
            title: 'What CQRS Actually Says',
            importance: 'must-know',
            summary: 'Use a different model for reading than for writing. That is the whole claim — not two databases, not events, not a message bus.',
            interviewAngle: 'The definition is smaller than its reputation, and stating it precisely is the fastest way to demonstrate that the term is understood rather than repeated.',
            buildsOn: [],
            blocks: [
                {
                    type: 'definition',
                    term: 'CQRS',
                    html: '<p>Command Query Responsibility Segregation: using a <strong>separate model</strong> for operations that change state and for operations that read it. It says nothing about separate databases, separate services, events or messaging — those are implementations people commonly pair with it, not part of the idea.</p>'
                },
                {
                    type: 'prose',
                    html: '<p>The motivation is that the two sides genuinely want different shapes. A write model needs invariants, an aggregate boundary and a normalised structure that makes correctness enforceable. A read model wants exactly the fields a screen displays, pre-joined, with no invariants to protect because it never changes anything.</p><p>Forcing both through one model means either a write model contorted for queries — lazy associations, projections, DTO gymnastics — or a read path that loads an aggregate to display three fields. CQRS says: stop, and have two.</p>'
                },
                {
                    type: 'table',
                    title: 'The levels of separation, from cheapest to most expensive',
                    headers: ['Level', 'What is separate', 'Cost'],
                    rows: [
                        ['1. Separate methods', 'Commands return void; queries return data and change nothing', 'Nothing. This is just CQS, and it is good practice.'],
                        ['2. <strong>Separate models</strong>', 'A domain model for writes, DTO-shaped queries for reads', '<strong>Low. This is CQRS, and it is where most systems should stop.</strong>'],
                        ['3. Separate tables', 'Denormalised read tables in the same database', 'A projection to maintain; still one transaction available'],
                        ['4. Separate databases', 'A read store updated asynchronously', 'Eventual consistency, and a whole synchronisation story'],
                        ['5. Separate services', 'A read service and a write service', 'Everything above, plus a deployment boundary']
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>Level 2 is where the benefit is, and it is nearly free: read queries project straight into a DTO — a JPA constructor expression, a JDBC row mapper, a view — while writes go through the aggregate. No second database, no eventual consistency, no messaging. Most teams who say "we do CQRS" mean level 2, and most teams who say "CQRS is over-engineering" have seen level 4 applied where level 2 was needed.</p>'
                }
            ],
            docs: [
                { title: 'CQRS', url: 'https://martinfowler.com/bliki/CQRS.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'architecture-ddd', questionId: 'cqrs' }
            ]
        },

        {
            id: 'cqrs-without-event-sourcing',
            title: 'CQRS Without Event Sourcing',
            importance: 'must-know',
            summary: 'The two are independent. CQRS is far more common and far cheaper on its own, and every Spring codebase that projects into a DTO is already doing it.',
            interviewAngle: 'The clearest way to show the two ideas are separate is to demonstrate CQRS with an ordinary relational database and no events at all.',
            buildsOn: ['cqrs-defined'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'CQRS in one repository, one database, no events',
                    code: '// WRITE SIDE: the aggregate, with its invariants. Loaded whole,\n// changed through methods, saved whole.\n@Transactional\nvoid confirm(OrderId id) {\n    Order order = orders.byId(id).orElseThrow();\n    order.confirm();                    // invariants enforced here\n    orders.save(order);\n}\n\n// READ SIDE: a different model entirely. No entity, no aggregate, no\n// lazy loading -- a projection built by the database and mapped\n// straight into the shape the screen wants.\ninterface OrderQueries {\n\n    @Query("""\n            select new com.acme.orders.OrderSummary(\n                       o.reference, o.status, c.name, sum(l.quantity), o.total)\n              from OrderEntity o\n              join o.customer c\n              join o.lines l\n             where o.customerId = :customerId\n             group by o.reference, o.status, c.name, o.total\n            """)\n    List<OrderSummary> summariesFor(String customerId);\n}\n\nrecord OrderSummary(String reference, Status status,\n                    String customerName, long itemCount, Money total) { }\n\n// One database, one transaction available, no consistency lag, and the\n// read path never loads an aggregate to display five fields.',
                    notes: '<p>This is CQRS in its useful form and it needs no new infrastructure. The read side does not touch the domain model, so the domain is free to be shaped by invariants rather than by queries — which is the benefit the pattern is actually for.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Reaching for a second database is the point at which CQRS stops being cheap.</strong> Separate stores buy independent scaling of reads and a read shape unconstrained by the write schema, and they cost eventual consistency, a projection pipeline, a rebuild path and a whole class of "the read model is stale" bug reports. Do it when read volume genuinely demands it — not because the pattern diagrams show two boxes.</p>'
                }
            ],
            docs: [
                { title: 'Spring Data JPA — Projections', url: 'https://docs.spring.io/spring-data/jpa/reference/repositories/projections.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'architecture-ddd', questionId: 'cqrs' },
                { topicId: 'jpa-hibernate', questionId: 'projections-and-dto-queries' }
            ]
        },

        {
            id: 'read-models-and-projections',
            title: 'Read Models and Projections',
            importance: 'should-know',
            summary: 'A read model is a purpose-built structure for one query or one screen. A projection is the process that keeps it up to date from the write side.',
            interviewAngle: 'The practical detail is that a read model is disposable — it can always be rebuilt from the source of truth, and building that path early is what makes the pattern safe.',
            buildsOn: ['cqrs-without-event-sourcing'],
            blocks: [
                {
                    type: 'types',
                    title: 'Where a read model can live',
                    items: [
                        { name: 'A database view', html: '<p>Cheapest. Always current, and the query cost is paid at read time.</p>' },
                        { name: 'A materialised view', html: '<p>PostgreSQL 16 <code>MATERIALIZED VIEW</code> with <code>REFRESH ... CONCURRENTLY</code>. Stale by the refresh interval, and the database does the work.</p>' },
                        { name: 'A denormalised table', html: '<p>Updated by the application in the same transaction as the write, or afterwards. Full control of the shape.</p>' },
                        { name: 'A search index', html: '<p>Elasticsearch for ranked search and faceting. The sync problem from the NoSQL module.</p>' },
                        { name: 'A cache', html: '<p>Redis, holding a rendered response. The most extreme read model, and the invalidation is the projection.</p>' }
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>The property that makes read models safe to adopt is that <strong>they are derived, never authoritative</strong>. Anything in a read model can be recomputed from the write side, so a corrupted projection is a rebuild rather than a data loss, and a bug in a projector is fixable retroactively.</p><p>That property only holds if the rebuild path exists. Build it on the first day, when the data is small enough that it takes a minute — the same advice the search-index chapter gave, for the same reason.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A read model that accumulates state the write side does not have has stopped being derived.</strong> A "last viewed at" timestamp written only into the projection, a counter incremented by the projector — each one makes the read model authoritative for something, and a rebuild now loses data. If the read model must hold such a fact, it belongs on the write side, or in its own small store that is not rebuilt.</p>'
                }
            ],
            docs: [
                { title: 'PostgreSQL 16 — Materialized Views', url: 'https://www.postgresql.org/docs/16/rules-materializedviews.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'architecture-ddd', questionId: 'read-models-and-projections' }
            ]
        },

        {
            id: 'eventual-consistency-in-the-read-side',
            title: 'The Lag Between Them',
            importance: 'must-know',
            summary: 'An asynchronously updated read model is stale by the projection delay. The user who just made the change is the one who notices, and read-your-writes is the specific problem.',
            interviewAngle: 'The same failure as the saga UI chapter, arriving from a different direction — which is worth noticing, because the mitigations are the same.',
            buildsOn: ['read-models-and-projections'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>Write, then immediately read: the projection has not run, and the change is not there. To the user this is indistinguishable from the write having failed, and the usual response is to do it again.</p><p>The lag is typically small — tens or hundreds of milliseconds — which makes it worse rather than better, because it is short enough to be invisible in testing and long enough to be hit by a real user on a real network.</p>'
                },
                {
                    type: 'table',
                    title: 'The mitigations, and what each gives up',
                    headers: ['Technique', 'How', 'Gives up'],
                    rows: [
                        ['Synchronous projection', 'Update the read model in the same transaction', 'Independent scaling — but it removes the problem entirely'],
                        ['Return the result from the command', 'The write returns the new state; the client uses it', 'Nothing. <strong>Often the whole answer.</strong>'],
                        ['Read your own writes', 'Route this user\'s reads to the write side briefly', 'A session-affinity mechanism'],
                        ['Optimistic client update', 'The client renders the change locally', 'Correctness if the write is later rejected'],
                        ['Version and wait', 'The client polls until the read model reaches the version it wrote', 'Latency, and a version in every response'],
                        ['Show it as pending', 'Acknowledge the state explicitly in the product', 'Nothing — and it is the most honest option']
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>Returning the new state from the command is the cheapest fix and it is under-used, partly because a strict reading of CQS says a command returns nothing. That rule is about not <em>querying</em> through a command, not about refusing to tell the caller what happened. Returning the created id and the resulting state is pragmatic, removes a round trip, and dissolves the read-your-writes problem for the most common case.</p>'
                }
            ],
            docs: [
                { title: 'CQRS', url: 'https://martinfowler.com/bliki/CQRS.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'caching-scale', questionId: 'eventual-consistency-in-practice' }
            ]
        },

        {
            id: 'event-sourcing-defined',
            title: 'What Event Sourcing Says',
            importance: 'must-know',
            summary: 'Store the sequence of events as the source of truth, and derive current state by replaying them. The row is no longer the fact; the history is.',
            interviewAngle: 'The distinction from "we also publish events" is the one that matters. Publishing events alongside a normal table is not event sourcing.',
            buildsOn: ['eventual-consistency-in-the-read-side'],
            blocks: [
                {
                    type: 'definition',
                    term: 'Event sourcing',
                    html: '<p>Persisting the full sequence of state-changing <strong>events</strong> as the system of record, and deriving current state by replaying them. The events are the truth; any table holding current state is a derived read model that can be discarded and rebuilt.</p>'
                },
                {
                    type: 'comparison',
                    title: 'What is stored',
                    left: 'State-oriented (normal)',
                    right: 'Event-sourced',
                    rows: [
                        { aspect: 'The database holds', left: 'Current state — one row per order', right: 'Every event that ever happened to the order' },
                        { aspect: 'An update', left: 'Overwrites the row', right: '<strong>Appends an event.</strong> Nothing is ever overwritten.' },
                        { aspect: 'Reading current state', left: 'A <code>SELECT</code>', right: 'Replay the events, or read a projection' },
                        { aspect: 'History', left: 'Gone, unless an audit table was built', right: '<strong>Inherent — it is the storage model</strong>' },
                        { aspect: '"Why is it in this state?"', left: 'Unanswerable', right: 'Read the events' },
                        { aspect: 'A new read model', left: 'A migration and a backfill from partial data', right: 'Replay from the beginning' },
                        { aspect: 'Deleting a customer\'s data', left: '<code>DELETE</code>', right: '<strong>Hard.</strong> The log is append-only.' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>The clarification worth volunteering: <em>"Publishing events after writing a row is not event sourcing — that is an outbox, and it is a much better default. Event sourcing means the events <strong>are</strong> the storage: there is no row to write."</em> Most systems described as event-sourced are the first thing, and the distinction is exactly what an interviewer is checking.</p>'
                }
            ],
            docs: [
                { title: 'Event Sourcing', url: 'https://martinfowler.com/eaaDev/EventSourcing.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'architecture-ddd', questionId: 'event-sourcing' }
            ]
        },

        {
            id: 'event-store-and-replay',
            title: 'The Event Store',
            importance: 'should-know',
            summary: 'An append-only table keyed by stream and version, with a unique constraint that provides optimistic concurrency. Loading an aggregate means replaying its stream.',
            interviewAngle: 'The concurrency mechanism is the interesting part: the unique constraint on (stream, version) is what stops two concurrent commands both appending version 5.',
            buildsOn: ['event-sourcing-defined'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'sql',
                    title: 'An event store in PostgreSQL 16',
                    code: 'create table event_store (\n    stream_id      text        not null,      -- "order-8812"\n    version        bigint      not null,      -- 1, 2, 3 within the stream\n    event_type     text        not null,\n    payload        jsonb       not null,\n    metadata       jsonb       not null,      -- who, when, correlation id\n    global_seq     bigserial   not null,      -- total order, for projections\n    occurred_at    timestamptz not null default now(),\n\n    -- OPTIMISTIC CONCURRENCY, for free. Two commands that both loaded\n    -- version 4 both try to append version 5; one insert fails.\n    primary key (stream_id, version)\n);\n\ncreate index on event_store (global_seq);\n\n-- Loading an aggregate:\nselect event_type, payload\n  from event_store\n where stream_id = \'order-8812\'\n order by version;',
                    notes: '<p>The primary key doing double duty is the elegant part of this design: it enforces the ordering of a stream <em>and</em> provides optimistic locking with no version column on any aggregate and no explicit lock anywhere. A concurrent command loses the insert and retries by replaying the now-longer stream.</p>'
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Replaying, and the fold that produces current state',
                    code: 'class Order {\n\n    private OrderId id;\n    private Status status;\n    private final List<Line> lines = new ArrayList<>();\n    private long version;\n\n    static Order replay(List<DomainEvent> history) {\n        Order order = new Order();\n        history.forEach(order::apply);          // a fold over the stream\n        return order;\n    }\n\n    // apply() only MUTATES. It never validates, because these events\n    // already happened -- rejecting one during replay would mean the\n    // aggregate could not load its own history.\n    private void apply(DomainEvent e) {\n        switch (e) {\n            case OrderPlaced p    -> { this.id = p.orderId(); this.status = PENDING; }\n            case LineAdded l      -> this.lines.add(l.line());\n            case OrderConfirmed c -> this.status = CONFIRMED;\n            case OrderCancelled c -> this.status = CANCELLED;\n            default -> { }                       // unknown: ignore, do not fail\n        }\n        this.version++;\n    }\n\n    // The COMMAND validates, then emits. This is where invariants live.\n    List<DomainEvent> confirm() {\n        if (status != PENDING) throw new CannotConfirm(id, status);\n        return List.of(new OrderConfirmed(id, Instant.now()));\n    }\n}',
                    notes: '<p>The separation between <code>apply</code> and the command methods is the discipline that makes event sourcing work. Validation belongs in the command, which decides whether an event <em>should</em> happen; <code>apply</code> handles events that <em>did</em> happen and must accept all of them, including ones written by a version of the code that had different rules.</p>'
                }
            ],
            docs: [
                { title: 'Event Sourcing', url: 'https://martinfowler.com/eaaDev/EventSourcing.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'transactions', questionId: 'optimistic-locking-details' }
            ]
        },

        {
            id: 'snapshots',
            title: 'Snapshots',
            importance: 'good-to-know',
            summary: 'Replaying fifty thousand events to load one aggregate is slow. A snapshot stores the state at version N so replay starts there — and it is an optimisation, never the truth.',
            interviewAngle: 'The point to make is that a snapshot is disposable. If it is wrong, delete it and replay; if deleting it loses data, it was not a snapshot.',
            buildsOn: ['event-store-and-replay'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>Most streams are short — an order has perhaps twenty events in its life — and replaying twenty rows is trivial. The problem arrives with long-lived aggregates: a bank account after ten years, a device with a telemetry event every minute, a shopping cart nobody abandoned.</p><p>A <strong>snapshot</strong> stores the serialised aggregate state at a known version. Loading reads the latest snapshot and replays only the events after it. Taking one every hundred events bounds replay to a hundred rows regardless of stream length.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The rule that keeps snapshots safe: <strong>a snapshot is a cache and may always be deleted.</strong> If the aggregate\'s shape changes, delete every snapshot and let them be rebuilt; if one is suspected of being wrong, delete it. That only works if snapshots are never the source of anything — the moment a field exists in a snapshot and not in the events, the events have stopped being the truth and the whole model has quietly broken.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A long stream is usually a modelling problem rather than a performance problem.</strong> An aggregate with fifty thousand events is one whose boundary is too large — an "account" that should be an account plus a series of statements, or a cart that should have been closed. Reaching for snapshots is right when the stream is legitimately long; reaching for them to rescue an aggregate that grows without limit treats the symptom.</p>'
                }
            ],
            docs: [
                { title: 'Event Sourcing', url: 'https://martinfowler.com/eaaDev/EventSourcing.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'architecture-ddd', questionId: 'event-sourcing' }
            ]
        },

        {
            id: 'schema-evolution-of-events',
            title: 'Evolving the Events',
            importance: 'must-know',
            summary: 'Events are immutable and permanent, so every version of every event must remain readable forever. This is the cost people underestimate most.',
            interviewAngle: 'The strongest argument against event sourcing, made honestly. A five-year-old event written by deleted code must still deserialise.',
            buildsOn: ['snapshots'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>In a state-oriented system, a schema change is a migration: rewrite the rows, and afterwards only the new shape exists. In an event-sourced system <strong>the old events are the truth and cannot be rewritten</strong>, so code written in 2030 must still be able to read an event written in 2026 by a class that no longer exists.</p><p>That obligation is permanent and it accumulates. It is the single largest ongoing cost of the pattern, and it is the one least often mentioned in favour of it.</p>'
                },
                {
                    type: 'table',
                    title: 'The techniques, and what each handles',
                    headers: ['Technique', 'How', 'Handles'],
                    rows: [
                        ['Additive only', 'New fields are optional with a default', '<strong>Most changes. The discipline to aim for.</strong>'],
                        ['Upcasting', 'Transform an old event into the new shape when reading', 'Renames, restructures, splits'],
                        ['Versioned event types', '<code>OrderPlacedV2</code> as a separate type', 'Changes too large to upcast'],
                        ['Weak schema', 'Read from <code>jsonb</code> tolerantly; ignore unknown fields', 'Reduces how often the others are needed'],
                        ['Copy and transform the stream', 'Write a new stream from the old one', 'A last resort. It rewrites history, which is the thing you promised not to do.']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Deleting a customer\'s data is genuinely hard in an append-only store, and this is a legal problem rather than an engineering preference.</strong> The usual answer is <em>crypto-shredding</em>: encrypt personal fields with a per-subject key, store the keys separately, and delete the key on request — the events remain and become permanently unreadable. It works, and it has to be designed in from the start, because retrofitting encryption onto an existing event store means rewriting the history you promised was immutable.</p>'
                }
            ],
            docs: [
                { title: 'Versioning in an Event Sourced System', url: 'https://leanpub.com/read/esversioning', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'kafka-messaging', questionId: 'schema-registry-and-message-contracts' }
            ]
        },

        {
            id: 'when-not-to-event-source',
            title: 'When Not To',
            importance: 'must-know',
            summary: 'Almost always. It is a specialist pattern for domains where the history is the requirement, and applied elsewhere it multiplies the cost of every ordinary change.',
            interviewAngle: 'Arguing against it competently is a stronger signal than describing it, because enthusiasm for it is common and the ability to scope it is not.',
            buildsOn: ['schema-evolution-of-events'],
            blocks: [
                {
                    type: 'table',
                    title: 'Where it pays, and where it does not',
                    headers: ['Domain', 'Verdict', 'Why'],
                    rows: [
                        ['Financial ledger, accounting', '<strong>Good fit</strong>', 'The history <em>is</em> the domain. Append-only is how ledgers already work.'],
                        ['Regulated audit trail', 'Good fit', 'The requirement is exactly what the pattern provides'],
                        ['Order or workflow lifecycle', 'Sometimes', 'If "why is it in this state" is asked often and answered badly today'],
                        ['Trading, insurance claims', 'Good fit', 'Temporal queries and reconstruction are core requirements'],
                        ['CRUD over a few tables', '<strong>No</strong>', 'Enormous cost, no benefit'],
                        ['A product catalogue', 'No', 'Nobody needs the history of a description'],
                        ['A reporting service', 'No', 'It owns no state to source'],
                        ['"We might want an audit log later"', '<strong>No</strong>', 'An audit table is two orders of magnitude cheaper']
                    ]
                },
                {
                    type: 'types',
                    title: 'The costs, stated plainly',
                    items: [
                        { name: 'Every developer must learn it', html: '<p>Debugging, querying and reasoning are all different. Onboarding is measured in weeks.</p>' },
                        { name: 'Ad-hoc queries are gone', html: '<p>There is no table to <code>SELECT</code> from. Every question needs a projection, including the one somebody asks once.</p>' },
                        { name: 'Schema evolution is permanent', html: '<p>The previous chapter, forever.</p>' },
                        { name: 'Deletion is a design problem', html: '<p>Crypto-shredding, planned from the start.</p>' },
                        { name: 'Tooling is thinner', html: '<p>No ORM, weaker admin tools, and a much smaller pool of people who have done it.</p>' },
                        { name: 'Eventual consistency everywhere', html: '<p>Every read is a projection, so the lag chapter applies to all of them.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>The middle path that gets most of the benefit for a fraction of the cost: <strong>a state-oriented model, plus an append-only event or audit table written in the same transaction.</strong> You get history, you get "why is it in this state", and you keep ordinary queries, ordinary tooling and ordinary deletion. It is not event sourcing, and it satisfies the requirement that usually motivates it.</p>'
                }
            ],
            docs: [
                { title: 'Event Sourcing', url: 'https://martinfowler.com/eaaDev/EventSourcing.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'architecture-ddd', questionId: 'event-sourcing' },
                { topicId: 'design-patterns', questionId: 'when-a-pattern-is-overkill' }
            ]
        },

        {
            id: 'answering-cqrs-in-an-interview',
            title: 'Answering the Question',
            importance: 'must-know',
            summary: 'Separate the two ideas, give the cheap version of CQRS, and be able to scope event sourcing to the domains it suits.',
            interviewAngle: 'The chapter that converts the previous nine into a ninety-second answer, and the separation is the move that does most of the work.',
            buildsOn: ['when-not-to-event-source'],
            blocks: [
                {
                    type: 'types',
                    title: 'A four-beat answer',
                    items: [
                        { name: '1. Separate them immediately', html: '<p><em>"They are two different things that get mentioned together. CQRS is using a different model for reads than for writes. Event sourcing is storing events as the source of truth. You can do either without the other, and CQRS on its own is much more common."</em></p>' },
                        { name: '2. Give the cheap version', html: '<p><em>"In most systems CQRS means the write side goes through the aggregate and the read side projects straight into a DTO — one database, one transaction, no eventual consistency. That is nearly free and it stops the domain model being contorted to serve queries."</em></p>' },
                        { name: '3. Say when you would go further', html: '<p><em>"A separate read store is worth it when read volume genuinely demands independent scaling, and it costs a projection pipeline, a rebuild path and read-your-writes handling."</em></p>' },
                        { name: '4. Scope event sourcing honestly', html: '<p><em>"I would event-source a ledger or something with a regulatory audit requirement, where the history is the domain. For most services I would keep a state model and write an append-only audit table in the same transaction — that answers the question that usually motivates it, for a fraction of the cost."</em></p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>The answer that goes badly is enthusiasm without scope.</strong> Describing event sourcing as the modern way to build systems invites the follow-up "how would you delete a customer\'s personal data" or "how would you answer an ad-hoc question from finance", and there is no good improvised answer to either. Leading with the constraints makes both of those into points you already made.</p>'
                }
            ],
            docs: [
                { title: 'CQRS', url: 'https://martinfowler.com/bliki/CQRS.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'architecture-ddd', questionId: 'cqrs' },
                { topicId: 'architecture-ddd', questionId: 'event-sourcing' }
            ]
        }
    ]
};
