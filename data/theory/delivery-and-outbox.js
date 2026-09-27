/* ==========================================================================
   data/theory/delivery-and-outbox.js — module 69 in the reading path

   The plan's tagline states the problem precisely: why writing to the
   database and publishing an event is a distributed transaction. Eight
   chapters, and the first two exist to make that sentence land before any
   solution is offered.

   The dual-write problem has now been named three times in this deck — in
   nosql-stores when a search index gets out of step, in idempotency when
   Kafka's exactly-once was scoped, and here where it is finally solved. That
   repetition is deliberate: it is the same shape every time, and recognising
   the shape is worth more than any one remedy.
   ========================================================================== */

const deliveryAndOutboxModule = {
    id: 'delivery-and-outbox',
    trackId: 'distributed',
    order: 69,
    title: 'Delivery Semantics and the Outbox',
    tagline: 'Why writing to the database and publishing an event is a distributed transaction.',
    estimatedMinutes: 40,
    prerequisites: ['kafka-mechanics', 'idempotency'],
    docHub: { title: 'Transactional Outbox', url: 'https://microservices.io/patterns/data/transactional-outbox.html' },

    chapters: [
        {
            id: 'at-most-once-at-least-once-exactly-once',
            title: 'The Three Semantics, Applied',
            importance: 'must-know',
            summary: 'Where you acknowledge decides which one you get. Acknowledge before processing and you lose; acknowledge after and you duplicate. There is no third position.',
            interviewAngle: 'The idempotency module argued this abstractly. Here it is a configuration decision with a specific line of code on either side of it.',
            buildsOn: [],
            blocks: [
                {
                    type: 'table',
                    title: 'The choice, on both sides of the broker',
                    headers: ['', 'At most once', 'At least once'],
                    rows: [
                        ['Producer', 'Send and do not check the result', '<code>acks=all</code>, retry until acknowledged'],
                        ['Producer failure', 'The event is lost silently', 'The event may be written twice'],
                        ['Consumer', 'Commit the offset, then process', 'Process, then commit the offset'],
                        ['Consumer failure', 'The record is never processed', 'The record is processed again'],
                        ['Which to choose', 'Metrics, telemetry, anything sampled', '<strong>Everything else</strong>'],
                        ['What makes it safe', '—', 'An idempotent consumer, from the previous module']
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>The asymmetry is the reason at-least-once wins nearly everywhere: <strong>a duplicate can be absorbed and a loss cannot be recovered.</strong> A consumer that sees an event twice can detect it — a processed-message table, an upsert, a guarded state transition — and produce the correct outcome. A consumer that never sees an event has nothing to work with, and usually nobody notices until the numbers disagree at the end of the month.</p><p>So the design is always the same: deliver at least once, and put the correctness in the consumer.</p>'
                }
            ],
            docs: [
                { title: 'Kafka — Message Delivery Semantics', url: 'https://kafka.apache.org/documentation/#semantics', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'microservices', questionId: 'exactly-once-delivery' }
            ]
        },

        {
            id: 'the-dual-write-problem',
            title: 'The Dual-Write Problem',
            importance: 'must-know',
            summary: 'Writing to the database and publishing to a broker are two systems and one of them can fail. No ordering of the two makes it atomic, and @Transactional does not reach the broker.',
            interviewAngle: 'The problem this module exists to solve, and being able to show that neither ordering works — rather than proposing one — is the answer.',
            buildsOn: ['at-most-once-at-least-once-exactly-once'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Both orderings, and why each is wrong',
                    code: '// ORDER A: commit, then publish.\n@Transactional\nvoid place(Cart cart) {\n    Order order = repository.save(Order.from(cart));\n}   // <-- commits here\nvoid after(Order order) {\n    kafka.send("orders.placed", new OrderPlaced(order.id()));\n}\n// The process dies between them, or the broker is unreachable:\n// the ORDER EXISTS and NOBODY IS TOLD. Silent, and permanent.\n\n// ORDER B: publish, then commit.\n@Transactional\nvoid place(Cart cart) {\n    Order order = repository.save(Order.from(cart));\n    kafka.send("orders.placed", new OrderPlaced(order.id()));\n}   // <-- if THIS rollback happens, the event is already published\n// Consumers act on an order that does not exist. Worse: it is not\n// silent, it is actively wrong, and downstream state is now corrupt.\n\n// And the thing that does not help:\n//   @Transactional does not cover the broker. Kafka is not a resource\n//   in the transaction, so a rollback does not unsend anything.',
                    output: {
                        kind: 'trace',
                        lines: [
                            'Commit then publish  -> risk of a lost event. The database is right and the world does not know.',
                            'Publish then commit  -> risk of a phantom event. The world acts on something that never happened.',
                            'Neither is atomic, and no reordering makes it so: two systems, one of which can fail independently.',
                            'XA / two-phase commit would make it atomic and is rejected for reasons the saga module covers.',
                            'The answer is to write BOTH facts to ONE system in ONE transaction, and move the second one afterwards.'
                        ],
                        explain: '<p>That last line is the whole of the outbox pattern in one sentence, and it is worth arriving at by elimination rather than being given: once both orderings are shown to fail, "write both to the database" is the only remaining move.</p>'
                    }
                },
                {
                    type: 'tip',
                    html: '<p>This shape is everywhere once you look for it: database plus search index, database plus cache invalidation, database plus a third-party API call, database plus an email. The outbox solves all of them, because the pattern is not about Kafka — it is about turning two writes into one write plus a reliable follow-up.</p>'
                }
            ],
            docs: [
                { title: 'Transactional Outbox', url: 'https://microservices.io/patterns/data/transactional-outbox.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'microservices', questionId: 'transactional-outbox' }
            ]
        },

        {
            id: 'transactional-outbox',
            title: 'The Transactional Outbox',
            importance: 'must-know',
            summary: 'Write the event into a table in the same transaction as the business change. A separate relay reads the table and publishes. One transaction, one system, then a retryable follow-up.',
            interviewAngle: 'The canonical answer. The detail that shows it has been implemented is what the relay does about ordering and about a failed publish.',
            buildsOn: ['the-dual-write-problem'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'sql',
                    title: 'The table — PostgreSQL 16',
                    code: 'create table outbox (\n    id             bigserial   primary key,   -- ordering within a partition\n    aggregate_type text        not null,       -- "order"\n    aggregate_id   text        not null,       -- the Kafka message KEY\n    event_type     text        not null,       -- "OrderPlaced"\n    payload        jsonb       not null,\n    created_at     timestamptz not null default now(),\n    published_at   timestamptz                 -- null until the relay sends it\n);\n\n-- A PARTIAL index: only the unpublished rows are indexed, so the index\n-- stays small however large the table grows.\ncreate index outbox_unpublished\n    on outbox (id) where published_at is null;',
                    notes: '<p>The partial index is the detail that makes this scale. Without it, the relay\'s "find unpublished rows" query scans an index over the whole history; with it, the index contains only the backlog — usually a handful of rows — and stays that size no matter how many millions of events have been published.</p>'
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'One transaction for both facts, then a relay',
                    code: '@Transactional\nvoid place(Cart cart) {\n    Order order = repository.save(Order.from(cart));\n\n    // SAME transaction, SAME database. Both facts commit or neither\n    // does, which is the property the dual write could not have.\n    outbox.insert(new OutboxRecord("order", order.id().toString(),\n            "OrderPlaced", toJson(new OrderPlaced(order.id()))));\n}\n\n@Scheduled(fixedDelay = 500)\n@Transactional\nvoid relay() {\n    // FOR UPDATE SKIP LOCKED: several relay instances can run without\n    // publishing the same row twice and without blocking each other.\n    List<OutboxRecord> batch = outbox.lockUnpublished(100);\n\n    for (OutboxRecord record : batch) {\n        kafka.send(topicFor(record), record.aggregateId(), record.payload());\n        outbox.markPublished(record.id());\n    }\n}\n// The relay is AT-LEAST-ONCE by construction: a crash after the send\n// and before markPublished republishes. That is fine, and it is why\n// the consumer must be idempotent -- which the previous module built.',
                    notes: '<p><code>aggregate_id</code> becoming the Kafka message key is what preserves per-entity ordering through the relay: two events for the same order are published to the same partition in <code>id</code> order, so a consumer sees them in the order they were committed.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>The relay must not publish in parallel across rows for the same aggregate.</strong> Two threads picking up <code>OrderPlaced</code> and <code>OrderCancelled</code> for one order can send them out of order, and a consumer that applies them in the wrong sequence reaches the wrong state. <code>SKIP LOCKED</code> plus batching by <code>aggregate_id</code>, or a single-threaded relay per partition of the key space, is what keeps the ordering the transaction established.</p>'
                }
            ],
            docs: [
                { title: 'Transactional Outbox', url: 'https://microservices.io/patterns/data/transactional-outbox.html', kind: 'guide' },
                { title: 'PostgreSQL 16 — SELECT FOR UPDATE SKIP LOCKED', url: 'https://www.postgresql.org/docs/16/sql-select.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'microservices', questionId: 'transactional-outbox' }
            ]
        },

        {
            id: 'cdc-and-debezium',
            title: 'Change Data Capture',
            importance: 'should-know',
            summary: 'Instead of polling the outbox table, read the database\'s own replication log. No polling, no relay to operate, and the events come from the same source of truth the transaction wrote.',
            interviewAngle: 'The alternative implementation of the same pattern, and the trade is operational: a connector to run against a poller you own.',
            buildsOn: ['transactional-outbox'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'Two relays for one outbox',
                    left: 'Polling relay',
                    right: 'CDC (Debezium)',
                    rows: [
                        { aspect: 'Mechanism', left: 'A scheduled query against the table', right: 'Reads the write-ahead log — PostgreSQL logical decoding' },
                        { aspect: 'Latency', left: 'The poll interval', right: 'Milliseconds' },
                        { aspect: 'Load on the database', left: 'A query per interval, per instance', right: 'A replication slot; no query load' },
                        { aspect: 'Ordering', left: 'Yours to preserve', right: 'Transaction-log order, for free' },
                        { aspect: 'Operational surface', left: 'Code you own', right: '<strong>Kafka Connect, a connector, a replication slot to monitor</strong>' },
                        { aspect: 'The failure to watch', left: 'The relay stops and the backlog grows', right: '<strong>A stalled slot stops WAL from being reclaimed and fills the disk</strong>' }
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>Debezium\'s outbox event router is the combination worth knowing: it captures inserts into the <code>outbox</code> table, unwraps each row into a message keyed by <code>aggregate_id</code> and routed by <code>aggregate_type</code>, and discards the envelope. You get the outbox pattern with no relay code at all.</p><p>Capturing the <em>business tables</em> directly instead is possible and is usually a worse idea: it publishes your schema as your event contract, so a column rename becomes a breaking change for every consumer. The outbox table exists precisely so that the event shape is authored rather than derived.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A PostgreSQL replication slot that stops being consumed will fill the disk.</strong> The database retains every WAL segment the slot has not confirmed, so a Debezium connector that has been down for a weekend can take the primary down with it. <code>max_slot_wal_keep_size</code> bounds it — at the cost of invalidating the slot, which then needs a re-snapshot. Monitoring slot lag is not optional, and it is the operational cost that belongs in the comparison above.</p>'
                }
            ],
            docs: [
                { title: 'Debezium — Outbox Event Router', url: 'https://debezium.io/documentation/reference/stable/transformations/outbox-event-router.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'microservices', questionId: 'transactional-outbox' }
            ]
        },

        {
            id: 'idempotent-and-transactional-producers',
            title: 'Idempotent and Transactional Producers',
            importance: 'should-know',
            summary: 'Idempotence stops a producer retry writing the record twice. Transactions make several sends plus an offset commit atomic — within Kafka, and only within Kafka.',
            interviewAngle: 'The scope limitation is the whole point. Kafka transactions are real and they do not extend to your database, which is why the outbox exists alongside them.',
            buildsOn: ['cdc-and-debezium'],
            blocks: [
                {
                    type: 'types',
                    title: 'Two different guarantees, often conflated',
                    items: [
                        { name: 'Idempotent producer', html: '<p><code>enable.idempotence=true</code>, the default since Kafka 3.0. Each producer gets an id and each batch a sequence number, so the broker discards a duplicate caused by a retry. <strong>Scope: one producer session, one partition.</strong></p>' },
                        { name: 'Transactional producer', html: '<p><code>transactional.id</code> set. Several sends across several partitions, plus the consumer offset commit, either all become visible or none do. Consumers must set <code>isolation.level=read_committed</code> to benefit.</p>' },
                        { name: 'What a transaction covers', html: '<p>Reads from Kafka, writes to Kafka, and the offset commit. This is the read-process-write pattern, and it is exactly what Kafka Streams uses.</p>' },
                        { name: 'What it does <strong>not</strong> cover', html: '<p><strong>Any write outside Kafka.</strong> A database insert inside a Kafka transaction is not rolled back when the transaction aborts. That is the dual-write problem, unchanged.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>The rule that follows: <strong>if the processing writes only to Kafka, use a Kafka transaction; if it writes to a database, use an outbox.</strong> Trying to combine them — a database write and a Kafka transaction in one method — gives you two independent atomicity domains and the illusion of one, which is worse than either alone because it looks safe.</p>'
                }
            ],
            docs: [
                { title: 'Kafka — Transactions', url: 'https://kafka.apache.org/documentation/#semantics', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'kafka-messaging', questionId: 'idempotent-consumer-implementation' }
            ]
        },

        {
            id: 'retry-and-dead-letter-topics',
            title: 'Retry and Dead-Letter Topics',
            importance: 'must-know',
            summary: 'A failing record cannot be skipped without a decision. Retry in place blocks the partition; retry topics move the record aside so the rest keeps flowing.',
            interviewAngle: 'The blocked-partition consequence is the key fact, and the non-blocking retry-topic pattern is the answer that shows production experience.',
            buildsOn: ['idempotent-and-transactional-producers'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>A consumer that fails on a record has three options and no fourth. <strong>Retry in place</strong>, which preserves order and blocks every record behind it on that partition. <strong>Skip</strong>, which loses the record silently. <strong>Move it aside</strong> — to a retry topic or a dead-letter topic — which keeps the partition flowing and gives up ordering for that record.</p><p>Most systems want the third, and it is worth being explicit that it is a trade rather than a free improvement: a record sent to a retry topic and processed thirty seconds later has been reordered relative to everything that followed it.</p>'
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Non-blocking retry with tiered delays',
                    code: '@RetryableTopic(\n        attempts = "4",\n        backoff = @Backoff(delay = 1000, multiplier = 4.0),\n        // Separate topics per delay: orders.placed-retry-0, -retry-1, ...\n        // The MAIN partition is never blocked -- the record is moved.\n        topicSuffixingStrategy = SUFFIX_WITH_INDEX_VALUE,\n        dltStrategy = DltStrategy.FAIL_ON_ERROR,\n        exclude = { DeserializationException.class,\n                    IllegalArgumentException.class })   // never retryable\n@KafkaListener(topics = "orders.placed", groupId = "fulfilment")\nvoid on(OrderPlaced event) {\n    reservations.reserve(event);\n}\n\n@DltHandler\nvoid dead(OrderPlaced event,\n          @Header(KafkaHeaders.EXCEPTION_MESSAGE) String reason) {\n    alerts.raise("order event dead-lettered", event.orderId(), reason);\n}',
                    notes: '<p>Excluding the exceptions that can never succeed is the part that keeps this useful. A deserialisation failure or a validation error will fail identically on all four attempts, so retrying it wastes twenty-one seconds and fills the retry topics with records that were doomed at the first attempt.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A dead-letter topic nobody watches is a delete with extra steps.</strong> The records are safely stored, nothing alerts, and the discovery is a customer asking why their order never shipped. A DLT needs an alert on non-zero depth, a documented runbook for inspecting it, and a supported way to replay a corrected record — and the third one is the piece almost always missing.</p>'
                }
            ],
            docs: [
                { title: 'Spring Kafka — Non-Blocking Retries', url: 'https://docs.spring.io/spring-kafka/reference/retrytopic.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'kafka-messaging', questionId: 'retry-and-dead-letter-topics' }
            ]
        },

        {
            id: 'poison-messages',
            title: 'Poison Messages',
            importance: 'should-know',
            summary: 'A record that fails every time, forever. Distinguishing it from a transient failure is the whole problem, because the two look identical on the first attempt.',
            interviewAngle: 'The classification question. Some exceptions are known-permanent and can be dead-lettered immediately, which is the practical improvement.',
            buildsOn: ['retry-and-dead-letter-topics'],
            blocks: [
                {
                    type: 'table',
                    title: 'Classify the failure, and act differently',
                    headers: ['Failure', 'Kind', 'Action'],
                    rows: [
                        ['Deserialisation error', '<strong>Permanent</strong>', 'Straight to the DLT. It will never parse.'],
                        ['Validation failure', 'Permanent', 'Straight to the DLT. The data is wrong.'],
                        ['Unknown enum value', 'Permanent', 'DLT — <em>unless</em> a producer deployed a new value first, which is a schema problem'],
                        ['Referenced entity not found', '<strong>Ambiguous</strong>', 'May be a propagation delay. Retry a few times, then DLT.'],
                        ['Database timeout', 'Transient', 'Retry with backoff'],
                        ['Downstream 503', 'Transient', 'Retry with backoff'],
                        ['Constraint violation on insert', 'Usually a duplicate', 'Treat as already processed and acknowledge']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A poison message caused by a deployment is the case that turns a bad record into an incident.</strong> If a new consumer version cannot parse a field, <em>every</em> record is a poison message — and a non-blocking retry configuration dutifully moves the entire topic into the retry and dead-letter topics within minutes. The defence is an alert on DLT <em>rate</em> rather than only depth: one dead letter an hour is a bad record, and a thousand a minute is a rollback.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>A schema registry with compatibility checking prevents most genuine poison messages by refusing the producer change that would create them, at publish time rather than at consume time. It is the same argument as a compile-time mapper against a reflective one: fail where somebody is watching, not in a consumer at three in the morning.</p>'
                }
            ],
            docs: [
                { title: 'Confluent — Schema Registry', url: 'https://docs.confluent.io/platform/current/schema-registry/index.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'kafka-messaging', questionId: 'schema-registry-and-message-contracts' }
            ]
        },

        {
            id: 'ordering-under-retry',
            title: 'Ordering Under Retry',
            importance: 'must-know',
            summary: 'Every mechanism that keeps a partition flowing reorders something. You can have strict ordering or non-blocking retries; choosing which matters per stream is the design.',
            interviewAngle: 'The synthesis chapter. Recognising that the two properties are in direct conflict, and deciding per stream, is what a senior answer looks like.',
            buildsOn: ['poison-messages'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>The conflict is exact. Preserving order means a failed record must be retried before anything behind it is processed, which blocks the partition. Keeping the partition flowing means the failed record is set aside and processed later — out of order — or not at all.</p><p>There is no configuration that gives both, so the question is which one the <em>stream</em> needs, and the answer differs per stream in the same system.</p>'
                },
                {
                    type: 'table',
                    title: 'Deciding per stream',
                    headers: ['Stream', 'Ordering matters?', 'Strategy'],
                    rows: [
                        ['Order state transitions', '<strong>Yes</strong> — SHIPPED must not precede CONFIRMED', 'Block the partition. Alert on lag; fix it as an incident.'],
                        ['Notification events', 'No', 'Non-blocking retry topics'],
                        ['Analytics events', 'No', 'DLT immediately; a lost event is acceptable'],
                        ['Inventory adjustments', 'Depends', 'If deltas, ordering matters; if absolute levels, it does not'],
                        ['Read-model projections', 'Per key', 'Version each event and let the projection reject an older one']
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>The strongest technique is to make ordering <em>irrelevant</em> rather than to preserve it. Carry a version or a timestamp on the event and have the consumer ignore anything older than what it has already applied — a conditional update guarded by the version. Then a reordered event is discarded rather than corrupting the state, and the retry mechanism is free to reorder as much as it needs to. It is the same conditional-update idea from the idempotency module, doing a second job.</p>'
                }
            ],
            docs: [
                { title: 'Spring Kafka — Non-Blocking Retries', url: 'https://docs.spring.io/spring-kafka/reference/retrytopic.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'kafka-messaging', questionId: 'partitions-and-ordering' },
                { topicId: 'kafka-messaging', questionId: 'retry-and-dead-letter-topics' }
            ]
        }
    ]
};
