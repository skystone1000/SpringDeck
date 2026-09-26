/* ==========================================================================
   data/theory/idempotency.js — module 66 in the reading path

   The plan's tagline is exactly right: the property that makes every retry
   in the previous two modules safe. Seven chapters, and the module exists
   because the timeout chapter established that a caller cannot know whether
   a request was processed — which makes "retry it" either the obvious answer
   or a duplicate charge, depending entirely on whether the operation is
   idempotent.

   Its prerequisites are resilience-patterns and transactions-and-isolation,
   and the second is load-bearing: the correct implementation of an
   idempotency key is a unique constraint plus a transaction, and the
   interesting failure modes are all concurrency ones.

   The chapter on exactly-once is a deliberate corrective. It is a phrase
   used constantly and it describes something that cannot exist across a
   network; what people mean by it is at-least-once delivery plus an
   idempotent consumer, which is this module.
   ========================================================================== */

const idempotencyModule = {
    id: 'idempotency',
    trackId: 'distributed',
    order: 66,
    title: 'Idempotency',
    tagline: 'The property that makes every retry above safe.',
    estimatedMinutes: 35,
    prerequisites: ['resilience-patterns', 'transactions-and-isolation'],
    docHub: { title: 'Making retries safe with idempotent APIs', url: 'https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/' },

    chapters: [
        {
            id: 'what-idempotent-means',
            title: 'What It Means',
            importance: 'must-know',
            summary: 'Performing the operation twice has the same effect as performing it once. It is about the resulting state, not about the response being identical.',
            interviewAngle: 'The precise definition matters because HTTP method semantics are usually recited without it. Idempotent is not the same as safe, and neither is the same as returning the same body.',
            buildsOn: [],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>An operation is idempotent if applying it more than once leaves the system in the same state as applying it once. The <em>response</em> may differ — a second <code>DELETE</code> may return 404 where the first returned 204 — and the operation is still idempotent, because the state after both is the same.</p><p>The HTTP module defines the term for methods and this module is the general case: the property is about <strong>the operation</strong>, not about the verb it is invoked with. A <code>POST</code> can be made idempotent, and a <code>PATCH</code> can fail to be.</p>'
                },
                {
                    type: 'table',
                    title: 'The HTTP methods, and the two properties that are confused',
                    headers: ['Method', 'Safe?', 'Idempotent?', 'Note'],
                    rows: [
                        ['<code>GET</code>', 'Yes', 'Yes', 'Changes nothing, so both hold trivially'],
                        ['<code>HEAD</code>, <code>OPTIONS</code>', 'Yes', 'Yes', 'Same'],
                        ['<code>PUT</code>', 'No', '<strong>Yes</strong>', 'Sets the resource to a given state. Sending it twice sets it twice to the same thing.'],
                        ['<code>DELETE</code>', 'No', '<strong>Yes</strong>', 'After one or five, the resource is gone'],
                        ['<code>POST</code>', 'No', '<strong>No</strong>', 'Creates something new each time — which is why it needs a key'],
                        ['<code>PATCH</code>', 'No', '<strong>It depends</strong>', '"Set status to SHIPPED" is idempotent; "add 10 to the balance" is not']
                    ]
                },
                {
                    type: 'prose',
                    html: '<p><strong>Safe</strong> means the operation does not change state at all. <strong>Idempotent</strong> means repeating it does not change the state further. Every safe method is idempotent; the reverse is not true, and <code>PUT</code> is the example that makes the distinction concrete.</p><p>The <code>PATCH</code> row is the interesting one because it is the only method whose idempotency depends on what you put in the body. A patch expressed as a <em>target state</em> is idempotent; the same patch expressed as a <em>delta</em> is not, and the choice is entirely yours.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Design for it wherever you can. "Set the status to SHIPPED" is idempotent and "advance the status" is not; "set quantity to 5" is idempotent and "add 2" is not. The idempotent formulation costs nothing at design time and removes the need for every mechanism in the rest of this module — which is a much better trade than building the mechanism.</p>'
                }
            ],
            docs: [
                { title: 'RFC 9110 §9.2.2 — Idempotent Methods', url: 'https://www.rfc-editor.org/rfc/rfc9110.html', kind: 'spec' }
            ],
            relatedQuestions: [
                { topicId: 'rest-api', questionId: 'http-methods-and-idempotency' }
            ]
        },

        {
            id: 'idempotency-keys',
            title: 'Idempotency Keys',
            importance: 'must-know',
            summary: 'The client generates a unique key per logical operation and sends it with every attempt. The server records the key with the result, and a repeat returns the stored result rather than acting again.',
            interviewAngle: 'The standard mechanism, and the details that matter are who generates the key and what happens on a concurrent duplicate.',
            buildsOn: ['what-idempotent-means'],
            blocks: [
                {
                    type: 'definition',
                    term: 'Idempotency key',
                    html: '<p>A client-generated identifier for one <strong>logical</strong> operation, sent unchanged with every retry of it. The server records the key alongside the result, so a repeat returns the stored result instead of acting again. It is what makes a non-idempotent operation — creating a payment, placing an order — safe to retry.</p>'
                },
                {
                    type: 'syntax',
                    language: 'http',
                    title: 'The protocol, from the client\'s side',
                    code: 'POST /payments HTTP/1.1\nIdempotency-Key: 9c1f8a4e-2d7b-4c31-9a0f-8b2e6d5a1c74\nContent-Type: application/json\n\n{ "orderId": "ord_8812", "amountMinor": 429900, "currency": "INR" }\n\n# --- attempt 1 times out. The client does NOT know whether it worked.\n# --- attempt 2 re-sends the IDENTICAL request, SAME key.\n\nHTTP/1.1 200 OK\nIdempotent-Replay: true\n\n{ "paymentId": "pay_5512", "status": "AUTHORISED" }\n\n# The key is generated by the CLIENT, per logical operation, and reused\n# across every retry of that operation. A new key means a new payment.',
                    notes: '<p>The client generating the key is the part that is easy to get backwards. Only the client knows that attempt two is a retry of attempt one rather than a second, deliberate payment — the server sees two identical-looking requests and has no way to distinguish them. Generate the key when the user presses the button, not when the HTTP call is made.</p>'
                },
                {
                    type: 'types',
                    title: 'The four rules that make it correct',
                    items: [
                        { name: 'Scope the key to the caller', html: '<p>Store it with the client or account id. Otherwise one tenant\'s key collides with another\'s, and one of them silently receives the other\'s response.</p>' },
                        { name: 'Store the request fingerprint', html: '<p>A hash of the body. If the same key arrives with a <em>different</em> body, that is a client bug — return <code>422</code> rather than replaying a result for a different request.</p>' },
                        { name: 'Store the response, not just the fact', html: '<p>A replay must return what the first attempt returned, including the resource id. Returning 200 with an empty body leaves the client unable to proceed.</p>' },
                        { name: 'Handle the concurrent duplicate', html: '<p>Two attempts can arrive at once — the client timed out and retried while the first was still running. The next chapter is about that.</p>' }
                    ]
                }
            ],
            docs: [
                { title: 'The Idempotency-Key HTTP Header Field', url: 'https://datatracker.ietf.org/doc/html/draft-ietf-httpapi-idempotency-key-header', kind: 'spec' }
            ],
            relatedQuestions: [
                { topicId: 'microservices', questionId: 'idempotency-keys' }
            ]
        },

        {
            id: 'storing-and-expiring-keys',
            title: 'Storing the Keys',
            importance: 'must-know',
            summary: 'A unique constraint is the mechanism, not a check-then-act. Insert first, let the database reject the duplicate, and handle the in-flight case explicitly.',
            interviewAngle: 'The check-then-act race is the discriminator. "Look it up, and if absent process it" is wrong under concurrency, and the correct version is an insert that may fail.',
            buildsOn: ['idempotency-keys'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'sql',
                    title: 'The table, in PostgreSQL 16',
                    code: 'create table idempotency_key (\n    client_id        text        not null,\n    key              text        not null,\n    request_hash     text        not null,\n    state            text        not null,   -- IN_PROGRESS | COMPLETED\n    response_status  int,\n    response_body    jsonb,\n    created_at       timestamptz not null default now(),\n    completed_at     timestamptz,\n\n    -- THE MECHANISM. Not an index for lookups -- the thing that makes\n    -- a concurrent duplicate insert fail instead of succeeding twice.\n    primary key (client_id, key)\n);\n\n-- Expiry. Keys are not kept forever; 24 hours is the usual window,\n-- comfortably longer than any client will retry.\ncreate index on idempotency_key (created_at);\ndelete from idempotency_key where created_at < now() - interval \'24 hours\';',
                    notes: '<p>Storing the response as <code>jsonb</code> rather than the id alone is what lets a replay be byte-identical to the original. It costs a column and it removes an entire class of client-side confusion, where a retry succeeds but returns less than the first attempt did.</p>'
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Insert first, and deal with the two duplicate cases',
                    code: '@Transactional\nPaymentResponse pay(String clientId, String key, PaymentRequest request) {\n\n    String hash = sha256(request);\n\n    try {\n        // ATTEMPT THE INSERT FIRST. Do not look it up and then decide --\n        // that is check-then-act, and two concurrent callers both find\n        // nothing and both proceed.\n        keys.insertInProgress(clientId, key, hash);\n\n    } catch (DuplicateKeyException e) {\n        IdempotencyKey existing = keys.get(clientId, key);\n\n        if (!existing.requestHash().equals(hash)) {\n            throw new KeyReusedWithDifferentBody(key);      // 422\n        }\n        if (existing.state() == COMPLETED) {\n            return existing.storedResponse();               // replay\n        }\n        // IN_PROGRESS: the first attempt is still running. Do NOT wait\n        // and do NOT process. 409 tells the client to retry shortly.\n        throw new RequestInProgress(key);                   // 409\n    }\n\n    PaymentResponse response = gateway.authorise(request);\n    keys.complete(clientId, key, response);\n    return response;\n}',
                    output: {
                        kind: 'trace',
                        lines: [
                            'Insert succeeds       -> this attempt owns the operation and proceeds.',
                            'Duplicate, COMPLETED  -> return the stored response. The caller cannot tell it was a replay.',
                            'Duplicate, IN_PROGRESS-> 409. Another attempt is running; waiting would hold a thread for an unknown time.',
                            'Duplicate, hash differs -> 422. The client reused a key for a different request, which is a bug on their side.',
                            'The unique constraint is what makes the concurrent case correct. A SELECT-then-INSERT lets two callers both find nothing.'
                        ],
                        explain: '<p>The <code>IN_PROGRESS</code> state exists precisely because of the timeout problem this whole track is about: the first attempt may be slow rather than lost, and a second attempt that waits for it holds a thread for an unbounded time — reintroducing the failure the retry was meant to survive. A fast 409 with a <code>Retry-After</code> is the honest answer.</p>'
                    }
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>The record and the work must commit together, or the whole thing is decorative.</strong> If the payment is authorised and the transaction then fails to mark the key <code>COMPLETED</code>, the next retry finds <code>IN_PROGRESS</code> forever — or worse, if the key row was written in a separate transaction that rolled back, the retry processes the payment again. One transaction covering both is the requirement, which is why this module has <code>transactions-and-isolation</code> as a prerequisite.</p>'
                }
            ],
            docs: [
                { title: 'PostgreSQL 16 — Unique Constraints', url: 'https://www.postgresql.org/docs/16/ddl-constraints.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'microservices', questionId: 'idempotency-keys' },
                { topicId: 'transactions', questionId: 'lost-update' }
            ]
        },

        {
            id: 'natural-idempotency-and-upserts',
            title: 'Natural Idempotency',
            importance: 'should-know',
            summary: 'Often the operation can be made idempotent by construction — a client-supplied id, an upsert, or a conditional update — and then no key infrastructure is needed at all.',
            interviewAngle: 'The best answer to "how would you make this idempotent" is frequently "change the operation", and reaching for that before reaching for a key table is the senior move.',
            buildsOn: ['storing-and-expiring-keys'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'sql',
                    title: 'Three constructions that need no key table — PostgreSQL 16',
                    code: '-- 1. CLIENT-SUPPLIED ID. The client generates a UUID; the primary key\n--    makes the second insert fail. The id IS the idempotency key.\ninsert into payment (id, order_id, amount_minor)\nvalues (:clientGeneratedId, :orderId, :amount)\non conflict (id) do nothing\nreturning *;\n\n-- 2. UPSERT. Setting a target state, so applying it twice is the same\n--    as applying it once.\ninsert into inventory (sku, warehouse, quantity)\nvalues (:sku, :warehouse, :quantity)\non conflict (sku, warehouse)\ndo update set quantity = excluded.quantity, updated_at = now();\n\n-- 3. CONDITIONAL UPDATE. A compare-and-set at the database: the second\n--    execution matches no rows, so it changes nothing and reports so.\nupdate orders\n   set status = \'SHIPPED\', shipped_at = now()\n where id = :id\n   and status = \'CONFIRMED\';        -- <-- the guard\n-- rowsAffected = 1 -> this call did it\n-- rowsAffected = 0 -> already shipped, or not shippable. Check which.',
                    notes: '<p>The third form is the one to reach for on a state machine, and it is worth being precise about the zero-rows case: it means either "already in the target state" (fine, return success) or "in a state from which this transition is illegal" (an error). Distinguishing them needs one extra read, and conflating them hides real bugs.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Client-generated identifiers are underused and they solve this problem at the design stage. If the client creates the UUID for the payment before sending it, the primary key does all the work — no key table, no expiry job, no <code>IN_PROGRESS</code> state, and the retry is naturally safe. The objection is usually "the server should own ids", and a UUID has no ownership semantics to violate.</p>'
                }
            ],
            docs: [
                { title: 'PostgreSQL 16 — INSERT ... ON CONFLICT', url: 'https://www.postgresql.org/docs/16/sql-insert.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'sql-databases', questionId: 'constraints-in-the-database' },
                { topicId: 'transactions', questionId: 'optimistic-locking-details' }
            ]
        },

        {
            id: 'idempotent-consumers',
            title: 'Idempotent Consumers',
            importance: 'must-know',
            summary: 'Every broker worth using delivers at least once, so every consumer will eventually see a duplicate. Handling it is the consumer\'s job and cannot be delegated to the broker.',
            interviewAngle: 'The messaging half of the same idea, and the setup for the delivery-semantics module. The mechanism is a processed-message table keyed by message id.',
            buildsOn: ['natural-idempotency-and-upserts'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>A consumer receives a message, processes it, and acknowledges. If it crashes after processing and before acknowledging, the broker redelivers — correctly, because from the broker\'s point of view the message was never handled. There is no ordering of those two steps that removes the window: acknowledge first and a crash loses the message, acknowledge last and a crash duplicates it.</p><p>So duplicates are not a broker defect to be configured away. They are a property of the model, and <strong>the consumer must be idempotent</strong>.</p>'
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Deduplicating, in the same transaction as the work',
                    code: '@KafkaListener(topics = "orders.placed")\n@Transactional\nvoid on(ConsumerRecord<String, OrderPlaced> record) {\n\n    String messageId = record.key() + ":" + record.partition() + ":" + record.offset();\n\n    try {\n        processed.insert(messageId);        // unique constraint\n    } catch (DuplicateKeyException e) {\n        log.debug("duplicate {}, skipping", messageId);\n        return;                             // already handled. Ack it.\n    }\n\n    reservations.reserve(record.value());   // the actual work\n    // Both the marker and the work commit together. A crash before\n    // commit rolls back BOTH, so redelivery reprocesses correctly.\n}\n\n// Prefer a BUSINESS id when one exists -- an order id, a payment\n// reference -- over a broker coordinate. A producer that republishes\n// after its own retry emits a new offset for the same logical event,\n// so an offset-keyed dedupe misses it.',
                    notes: '<p>The comment at the bottom is the detail that separates a working implementation from one that only handles broker redelivery. There are two independent sources of duplicates — the broker redelivering, and the producer publishing twice — and only a business identifier covers both.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Often no dedupe table is needed at all, because the work is naturally idempotent: an upsert into a read model, a state transition guarded by its current state, a set membership. Check for that first. A dedupe table is a table to size, index, expire and monitor, and it is worth avoiding when the operation can simply absorb repetition.</p>'
                }
            ],
            docs: [
                { title: 'Idempotent Consumer', url: 'https://microservices.io/patterns/communication-style/idempotent-consumer.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'kafka-messaging', questionId: 'idempotent-consumer-implementation' }
            ]
        },

        {
            id: 'exactly-once-is-a-story',
            title: 'Exactly-Once Is a Story',
            importance: 'must-know',
            summary: 'Exactly-once delivery across a network is impossible. What exists is at-least-once delivery plus idempotent processing, which produces exactly-once effects — and that is a different claim.',
            interviewAngle: 'A correction that demonstrates depth. The impossibility argument is short and it is the reason every messaging system\'s "exactly once" is scoped to something narrower than it sounds.',
            buildsOn: ['idempotent-consumers'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>The argument is two sentences. A sender cannot distinguish "the message was lost" from "the acknowledgement was lost", so it must either resend — risking a duplicate — or not resend, risking a loss. There is no third option, and no amount of protocol removes the ambiguity, because the ambiguity is caused by the network rather than by the protocol.</p><p>What can be achieved is <strong>exactly-once <em>effects</em></strong>: deliver at least once and make processing idempotent, so that duplicates change nothing. That is what every production system means when it says exactly-once, and saying it precisely is the whole of this chapter.</p>'
                },
                {
                    type: 'table',
                    title: 'The three semantics, and what each costs',
                    headers: ['Semantic', 'Mechanism', 'Failure mode'],
                    rows: [
                        ['At most once', 'Fire and forget; acknowledge before processing', '<strong>Messages are lost.</strong> Acceptable for metrics, not for orders'],
                        ['At least once', 'Retry until acknowledged; acknowledge after processing', '<strong>Duplicates.</strong> The default, and what everything real uses'],
                        ['"Exactly once"', 'At least once + idempotent consumer', 'None, if the idempotency is correct — and the burden is on the consumer'],
                        ['Kafka transactions', 'Atomic read-process-write <em>within Kafka</em>', 'Real, and scoped: it does not cover a write to your database']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Kafka\'s exactly-once semantics are real and narrower than the name suggests.</strong> They give an atomic read-process-write when the input and the output are both Kafka topics and the consumer offset is committed in the same transaction. The moment the processing step writes to a database, a cache or another service, that write is outside the transaction and the guarantee does not cover it — which is the dual-write problem, and it is the subject of the outbox module three positions later.</p>'
                }
            ],
            docs: [
                { title: 'Kafka — Exactly Once Semantics', url: 'https://kafka.apache.org/documentation/#semantics', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'microservices', questionId: 'exactly-once-delivery' },
                { topicId: 'kafka-messaging', questionId: 'idempotent-consumer-implementation' }
            ]
        },

        {
            id: 'designing-an-idempotent-payment',
            title: 'Worked: An Idempotent Payment',
            importance: 'must-know',
            summary: 'The whole module applied to the operation where getting it wrong charges somebody twice. Client-generated id, insert-first, a state machine, and idempotency propagated to the gateway.',
            interviewAngle: 'A frequent design prompt with a checkable answer. The detail that shows experience is passing an idempotency key to the payment provider as well as accepting one.',
            buildsOn: ['exactly-once-is-a-story'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'End to end, with the key propagated outward',
                    code: '@PostMapping("/payments")\nPaymentResponse pay(@RequestHeader("Idempotency-Key") String key,\n                    @AuthenticationPrincipal Jwt caller,\n                    @RequestBody @Valid PaymentRequest request) {\n    return payments.pay(caller.getSubject(), key, request);\n}\n\n@Transactional\nPaymentResponse pay(String clientId, String key, PaymentRequest request) {\n\n    // 1. Claim the key. Insert-first, per the earlier chapter.\n    claimOrReplay(clientId, key, request);          // may return a replay\n\n    // 2. Record the intent BEFORE calling the gateway, so a crash\n    //    mid-call leaves evidence that a call may have been made.\n    Payment payment = payments.save(Payment.pending(request));\n\n    // 3. Call the gateway, passing OUR key onward. Stripe, Adyen and\n    //    the rest all accept one -- so our retry does not become their\n    //    second charge. This is the step people leave out.\n    Authorisation auth = gateway.authorise(\n            request, IdempotencyKey.of(payment.id().toString()));\n\n    // 4. Guarded transition. If a concurrent path already completed it,\n    //    this matches no rows and we re-read rather than overwrite.\n    int updated = payments.markAuthorised(payment.id(), auth.reference());\n    if (updated == 0) return payments.byId(payment.id()).toResponse();\n\n    PaymentResponse response = PaymentResponse.of(payment, auth);\n    keys.complete(clientId, key, response);\n    return response;\n}',
                    notes: '<p>Step 3 is the one that distinguishes an answer from a design. Making <em>your</em> API idempotent protects your client; passing a key to the <em>gateway</em> protects your customer, because your own retry against the provider is exactly the duplicate charge the whole exercise exists to prevent. Every serious payment provider supports it, and it is routinely omitted.</p>'
                },
                {
                    type: 'types',
                    title: 'The failure cases, and what each one leaves behind',
                    items: [
                        { name: 'Crash after claiming the key, before the gateway call', html: '<p>Key is <code>IN_PROGRESS</code>, payment is <code>PENDING</code>, no charge. A retry gets 409, and a reconciliation job resolves the pending row against the provider.</p>' },
                        { name: 'Crash during the gateway call', html: '<p><strong>The dangerous one.</strong> The charge may exist. The pending row plus the propagated key means a retry reaches the same provider-side operation rather than creating a second one.</p>' },
                        { name: 'Crash after the gateway, before the commit', html: '<p>The charge exists; our records do not. Reconciliation against the provider is the only recovery, which is why the pending row in step 2 is written first.</p>' },
                        { name: 'Two concurrent attempts', html: '<p>The unique constraint lets exactly one through; the other gets 409.</p>' },
                        { name: 'The same key with a different amount', html: '<p>422. A client bug, and a very good thing to detect loudly.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>The sentence that closes this well in an interview: <em>"Every one of these designs still needs reconciliation, because there is always a window where our records and the provider\'s can disagree. Idempotency makes that window small and makes retries safe; a job that compares our pending payments against the provider\'s ledger is what makes it eventually correct. Any design that claims no reconciliation is needed has not thought about the crash between the call and the commit."</em></p>'
                }
            ],
            docs: [
                { title: 'Making retries safe with idempotent APIs', url: 'https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'microservices', questionId: 'idempotency-keys' },
                { topicId: 'transactions', questionId: 'distributed-transactions' }
            ]
        }
    ]
};
