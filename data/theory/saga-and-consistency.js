/* ==========================================================================
   data/theory/saga-and-consistency.js — module 70 in the reading path

   Eight chapters, and the plan's tagline is the whole idea: compensation
   instead of rollback. The module opens by disposing of two-phase commit,
   because a candidate who has not been given a reason to reject it will
   propose it, and it is the wrong answer for a reason worth knowing.

   The two chapters people skip are the two that make a saga design real.
   Semantic locks, because compensation exposes intermediate states that a
   transaction would have hidden; and eventual consistency in a UI, because
   the design is not finished until somebody has decided what the user sees
   during the window.
   ========================================================================== */

const sagaAndConsistencyModule = {
    id: 'saga-and-consistency',
    trackId: 'distributed',
    order: 70,
    title: 'Sagas and Eventual Consistency',
    tagline: 'Compensation instead of rollback.',
    estimatedMinutes: 45,
    prerequisites: ['delivery-and-outbox'],
    docHub: { title: 'Saga pattern', url: 'https://microservices.io/patterns/data/saga.html' },

    chapters: [
        {
            id: 'why-not-two-phase-commit',
            title: 'Why Not Two-Phase Commit',
            importance: 'must-know',
            summary: 'It works, it is correct, and it holds locks across a network while a coordinator decides. One slow participant blocks every resource in the transaction, and a coordinator crash blocks them indefinitely.',
            interviewAngle: 'Rejecting 2PC with a reason is the setup for the whole module. The blocking property is the reason, not "it is old" or "it does not scale".',
            buildsOn: [],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>Two-phase commit does exactly what it claims. A coordinator asks every participant to <em>prepare</em>; each one does the work, takes its locks, and promises it can commit. When all have promised, the coordinator tells them to commit. The result is genuine atomicity across several resources.</p><p>The cost is that between prepare and commit, every participant is holding locks and cannot proceed independently. The transaction is only as fast as the slowest participant, and — the property that rules it out — <strong>if the coordinator fails after the prepare phase, participants are stuck</strong>. They have promised to commit, they may not unilaterally abort, and they hold their locks until the coordinator returns. That is the blocking problem, and it is inherent rather than an implementation defect.</p>'
                },
                {
                    type: 'table',
                    title: 'Two-phase commit against a saga',
                    headers: ['', '2PC / XA', 'Saga'],
                    rows: [
                        ['Atomicity', '<strong>Yes</strong>, genuinely', 'No — each step commits on its own'],
                        ['Isolation', 'Yes', '<strong>No.</strong> Intermediate states are visible.'],
                        ['Locks held', 'Across the network, for the whole transaction', 'Only within each local step'],
                        ['A slow participant', 'Blocks everyone', 'Delays one step'],
                        ['Coordinator failure', '<strong>Participants block indefinitely</strong>', 'The saga resumes or compensates'],
                        ['Availability', 'The product of every participant\'s', 'Each step is independent'],
                        ['Works across', 'XA-capable resources only', 'Anything, including an HTTP API'],
                        ['Complexity', 'In the infrastructure', '<strong>In your application code</strong>']
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>The last row is the honest summary and it is worth saying out loud: a saga does not remove the difficulty, it moves it from the transaction manager into your design. You now write the compensations, handle the partial states and decide what the user sees. That is a real cost, accepted because the alternative is holding locks across services — and it is why a modular monolith with one database keeps ordinary transactions for as long as it can.</p>'
                }
            ],
            docs: [
                { title: 'Saga pattern', url: 'https://microservices.io/patterns/data/saga.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'microservices', questionId: 'why-not-two-phase-commit' },
                { topicId: 'transactions', questionId: 'distributed-transactions' }
            ]
        },

        {
            id: 'saga-definition',
            title: 'What a Saga Is',
            importance: 'must-know',
            summary: 'A sequence of local transactions, each committing independently, with a compensating action for each step that can undo its effect. Failure runs the compensations backwards.',
            interviewAngle: 'The definition plus the crucial caveat: a compensation is not a rollback. It is a new transaction that makes amends, and the original effect was visible in between.',
            buildsOn: ['why-not-two-phase-commit'],
            blocks: [
                {
                    type: 'definition',
                    term: 'Saga',
                    html: '<p>A sequence of local transactions across several services, where each step commits independently and each has a <strong>compensating transaction</strong> that semantically undoes it. If a step fails, the compensations for the completed steps run in reverse order. There is no atomicity and no isolation; there is eventual consistency.</p>'
                },
                {
                    type: 'diagram',
                    diagramType: 'flowchart',
                    title: 'The happy path, and the compensation path',
                    diagramConfig: {
                        nodes: [
                            { id: 'start', label: 'Place order',        kind: 'start' },
                            { id: 't1',    label: 'T1: reserve stock',  kind: 'process' },
                            { id: 't2',    label: 'T2: take payment',   kind: 'process' },
                            { id: 't3',    label: 'T3: book courier',   kind: 'process' },
                            { id: 'done',  label: 'Order confirmed',    kind: 'end' },
                            { id: 'c2',    label: 'C2: refund payment', kind: 'decision' },
                            { id: 'c1',    label: 'C1: release stock',  kind: 'decision' },
                            { id: 'fail',  label: 'Order cancelled',    kind: 'end' }
                        ],
                        edges: [
                            { from: 'start', to: 't1' },
                            { from: 't1',    to: 't2' },
                            { from: 't2',    to: 't3' },
                            { from: 't3',    to: 'done' },
                            { from: 't3',    to: 'c2',  label: 'no courier available' },
                            { from: 'c2',    to: 'c1',  label: 'backwards' },
                            { from: 'c1',    to: 'fail' },
                            { from: 't2',    to: 'c1',  label: 'payment declined' }
                        ]
                    }
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A compensation is not a rollback, and the difference is visible to customers.</strong> A rollback leaves no trace. A refund leaves a charge and a refund on the statement, two emails, and possibly a currency-conversion loss. Stock released after a reservation was visible to another customer as unavailable for the duration. The intermediate state <em>happened</em>, and the design has to be acceptable with that, not merely eventually correct.</p>'
                }
            ],
            docs: [
                { title: 'Saga pattern', url: 'https://microservices.io/patterns/data/saga.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'microservices', questionId: 'saga-orchestration-or-choreography' }
            ]
        },

        {
            id: 'choreography',
            title: 'Choreography',
            importance: 'must-know',
            summary: 'No coordinator. Each service reacts to events and emits its own, and the saga is an emergent property of who listens to what.',
            interviewAngle: 'Half of the standard comparison. The weakness to name is that the flow exists nowhere — you cannot read it, only reconstruct it.',
            buildsOn: ['saga-definition'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The saga as a chain of listeners',
                    code: '// Order service\n@Transactional\nvoid place(Cart cart) {\n    Order order = orders.save(Order.pending(cart));\n    outbox.publish(new OrderPlaced(order.id(), cart.lines()));\n}\n\n// Inventory service -- reacts, emits\n@KafkaListener(topics = "orders.placed")\n@Transactional\nvoid on(OrderPlaced e) {\n    try {\n        inventory.reserve(e.orderId(), e.lines());\n        outbox.publish(new StockReserved(e.orderId()));\n    } catch (InsufficientStock ex) {\n        outbox.publish(new StockReservationFailed(e.orderId(), ex.sku()));\n    }\n}\n\n// Payment service -- reacts, emits\n@KafkaListener(topics = "inventory.reserved")\nvoid on(StockReserved e) { ... }\n\n// Order service AGAIN -- listens for the outcomes it caused\n@KafkaListener(topics = { "inventory.reservation-failed",\n                          "payments.declined" })\nvoid onFailure(SagaFailure e) { orders.cancel(e.orderId(), e.reason()); }\n\n// Nowhere in this file, or any file, is the SEQUENCE written down.\n// It exists only as the set of subscriptions across four services.',
                    notes: '<p>That closing comment is the substance of the criticism. Answering "what happens when an order is placed" requires reading four services and knowing every subscription, and there is no artefact that states the flow — which makes onboarding, debugging and change all harder in the same way.</p>'
                },
                {
                    type: 'types',
                    title: 'What it is good and bad at',
                    items: [
                        { name: 'Good: no single point of failure', html: '<p>No coordinator to be unavailable. Each service is independent.</p>' },
                        { name: 'Good: adding a participant is local', html: '<p>A new service subscribes to an existing event. Nothing else changes.</p>' },
                        { name: 'Good: loose coupling', html: '<p>Services know events, not each other.</p>' },
                        { name: 'Bad: the flow is invisible', html: '<p>It exists in no file. Understanding it means reading every subscriber.</p>' },
                        { name: 'Bad: cyclic dependencies creep in', html: '<p>A listens to B, B to C, C back to A. Easy to build accidentally, hard to see.</p>' },
                        { name: 'Bad: compensation logic is scattered', html: '<p>Every participant must know which failures it should compensate for, and that knowledge is duplicated.</p>' }
                    ]
                }
            ],
            docs: [
                { title: 'Sagas — choreography', url: 'https://microservices.io/patterns/data/saga.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'microservices', questionId: 'saga-orchestration-or-choreography' }
            ]
        },

        {
            id: 'orchestration',
            title: 'Orchestration',
            importance: 'must-know',
            summary: 'A coordinator holds the saga\'s state and tells each participant what to do next. The flow is one readable state machine, at the cost of a component that knows about everybody.',
            interviewAngle: 'The other half, and the recommendation for anything beyond three steps. The readability argument is the one that decides it in practice.',
            buildsOn: ['choreography'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The saga as an explicit, persisted state machine',
                    code: '@Service\nclass PlaceOrderSaga {\n\n    // The whole flow, in one place, readable top to bottom.\n    void onOrderPlaced(OrderPlaced e) {\n        state.start(e.orderId(), RESERVING_STOCK);\n        commands.send(new ReserveStock(e.orderId(), e.lines()));\n    }\n\n    void onStockReserved(StockReserved e) {\n        state.advance(e.orderId(), TAKING_PAYMENT);\n        commands.send(new TakePayment(e.orderId(), e.total()));\n    }\n\n    void onPaymentTaken(PaymentTaken e) {\n        state.advance(e.orderId(), BOOKING_COURIER);\n        commands.send(new BookCourier(e.orderId()));\n    }\n\n    void onCourierBooked(CourierBooked e) {\n        state.complete(e.orderId());\n        commands.send(new ConfirmOrder(e.orderId()));\n    }\n\n    // Compensation, also in one place, and it knows how far it got.\n    void onFailure(SagaStep failed, String orderId, String reason) {\n        SagaState current = state.get(orderId);\n        state.compensating(orderId);\n        switch (current.step()) {\n            case BOOKING_COURIER -> { commands.send(new RefundPayment(orderId));\n                                      commands.send(new ReleaseStock(orderId)); }\n            case TAKING_PAYMENT  -> commands.send(new ReleaseStock(orderId));\n            case RESERVING_STOCK -> { /* nothing has happened yet */ }\n        }\n        commands.send(new CancelOrder(orderId, reason));\n    }\n}',
                    notes: '<p>The saga state must be <strong>persisted</strong>, and that is the part that is easy to underestimate: the orchestrator can crash halfway through and must resume knowing which steps completed. A saga state table with a step, a status and a timestamp — plus a timeout job for steps that never answered — is as much of the implementation as the switch above.</p>'
                },
                {
                    type: 'comparison',
                    title: 'Choosing between them',
                    left: 'Choreography',
                    right: 'Orchestration',
                    rows: [
                        { aspect: 'Where the flow lives', left: 'Nowhere — emergent', right: '<strong>One class you can read</strong>' },
                        { aspect: 'Coupling', left: 'Looser', right: 'The orchestrator knows every participant' },
                        { aspect: 'Debugging', left: 'Follow events across services', right: 'Read the saga state row' },
                        { aspect: 'Adding a step', left: 'A new subscriber; nothing else changes', right: 'Edit the orchestrator' },
                        { aspect: 'Compensation logic', left: 'Scattered across participants', right: 'Centralised' },
                        { aspect: 'Best for', left: '<strong>Two or three steps</strong>', right: '<strong>Four or more, or anything with real compensation</strong>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>The distinction to keep straight: an orchestrator sends <strong>commands</strong> and participants publish <strong>events</strong>. A command is addressed and imperative — "reserve stock" — and a specific service is expected to act on it. An event is a broadcast fact — "stock reserved" — and the publisher does not care who listens. Mixing them up produces an orchestrator publishing events nobody is obliged to handle, which fails silently.</p>'
                }
            ],
            docs: [
                { title: 'Sagas — orchestration', url: 'https://microservices.io/patterns/data/saga.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'microservices', questionId: 'saga-orchestration-or-choreography' }
            ]
        },

        {
            id: 'compensating-transactions',
            title: 'Writing the Compensations',
            importance: 'must-know',
            summary: 'A compensation must be idempotent, must be retryable forever, and must be able to run even when the thing it compensates is in an unexpected state. Some actions cannot be compensated at all.',
            interviewAngle: 'The chapter with the uncomfortable content. An email that has been sent cannot be unsent, and a design has to say what happens then.',
            buildsOn: ['orchestration'],
            blocks: [
                {
                    type: 'types',
                    title: 'What every compensation must satisfy',
                    items: [
                        { name: 'Idempotent', html: '<p>It will be retried. Refunding twice is worse than the original failure, so the refund is keyed by the payment id and the second call returns the first result.</p>' },
                        { name: 'Retryable indefinitely', html: '<p>There is no compensation for a failed compensation. It must eventually succeed, which means it retries until it does — and alerts if it has not after a bounded time.</p>' },
                        { name: 'Tolerant of unexpected state', html: '<p>"Release stock" may run when the stock was already released by a timeout job. It must succeed anyway rather than throwing.</p>' },
                        { name: 'Commutative where possible', html: '<p>Compensations may arrive out of order. Independent ones should not care.</p>' },
                        { name: 'Semantically honest', html: '<p>A refund is not the inverse of a charge; it is a second, visible transaction. Model it as such rather than pretending the charge did not happen.</p>' }
                    ]
                },
                {
                    type: 'table',
                    title: 'Actions that cannot be compensated, and what to do instead',
                    headers: ['Action', 'Compensation', 'Design response'],
                    rows: [
                        ['Charge a card', 'Refund', 'Works, and both appear on the statement'],
                        ['Reserve stock', 'Release', 'Works cleanly'],
                        ['<strong>Send an email</strong>', '<strong>None</strong>', 'Send it <em>last</em>, after the saga completes'],
                        ['<strong>Dispatch a parcel</strong>', 'A returns process', 'Make it the final step; recall is a business process, not a compensation'],
                        ['<strong>Publish to a partner API</strong>', 'Depends on the partner', 'Make it the pivot, or the last step'],
                        ['Allocate a unique code', 'Release it', 'Works, if nothing external saw it']
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>Order the saga so the irreversible steps come <strong>last</strong>. Reserve, charge, then dispatch — never dispatch, then charge. That single ordering rule removes most of the impossible compensations from a design, and it is the cheapest improvement available at the whiteboard stage.</p>'
                }
            ],
            docs: [
                { title: 'Compensating Transaction pattern', url: 'https://learn.microsoft.com/en-us/azure/architecture/patterns/compensating-transaction', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'microservices', questionId: 'saga-orchestration-or-choreography' }
            ]
        },

        {
            id: 'semantic-locks-and-pivot-steps',
            title: 'Semantic Locks and the Pivot',
            importance: 'should-know',
            summary: 'A saga has no isolation, so other transactions see the half-finished state. A semantic lock marks a record as in-progress; the pivot is the step after which the saga can no longer fail.',
            interviewAngle: 'A depth answer that shows the isolation problem was noticed. Most saga descriptions stop at compensation and never mention what other readers see.',
            buildsOn: ['compensating-transactions'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>A database transaction gives isolation as well as atomicity: nobody sees the intermediate state. A saga gives neither. Between "stock reserved" and "payment taken", another request can read an order that is neither confirmed nor cancelled, and act on it.</p><p>The countermeasure is a <strong>semantic lock</strong>: an explicit status on the record — <code>PENDING</code>, <code>RESERVING</code>, <code>AWAITING_PAYMENT</code> — that tells every other reader the record is mid-saga and what they may do with it. It is an application-level lock, enforced by every reader honouring it, which is weaker than a database lock and is the only thing available.</p>'
                },
                {
                    type: 'types',
                    title: 'The three countermeasures, from the saga literature',
                    items: [
                        { name: 'Semantic lock', html: '<p>A status field marking the record in-progress. Readers must handle it — display "processing", refuse a conflicting update, or wait.</p>' },
                        { name: 'Commutative updates', html: '<p>Design the updates so that order does not matter. <code>credit</code> and <code>debit</code> commute; "set balance to X" does not.</p>' },
                        { name: 'Re-read the value', html: '<p>Before compensating, re-read rather than assuming. The world moved while the saga was running.</p>' }
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>The <strong>pivot step</strong> is the other structural idea. It is the step after which the saga will not be compensated — everything before it is reversible, everything after it is retried until it succeeds. Taking payment is the usual pivot: before it, cancelling is clean; after it, the order will be fulfilled even if the courier booking has to be retried for an hour.</p><p>Identifying the pivot deliberately turns a vague "what if it fails halfway" into two well-defined regions with different failure policies, and it is the single most clarifying question to ask about a saga design.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Every saga needs a <strong>timeout</strong> per step, and it is the most commonly missing piece. A participant that never answers leaves the saga in <code>AWAITING_PAYMENT</code> forever, holding a semantic lock nobody will release. A scheduled job that finds sagas stuck past their expected duration and either compensates or alerts is what stops a stalled saga becoming a support ticket a week later.</p>'
                }
            ],
            docs: [
                { title: 'Saga pattern — countermeasures', url: 'https://microservices.io/patterns/data/saga.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'caching-scale', questionId: 'eventual-consistency-in-practice' }
            ]
        },

        {
            id: 'eventual-consistency-in-a-ui',
            title: 'What the User Sees',
            importance: 'must-know',
            summary: 'The saga takes seconds and the user is present for them. "It will be consistent eventually" is not an answer to "why does my order not appear".',
            interviewAngle: 'The product-facing half, and it is what turns a correct design into a usable one. Naming the read-your-writes problem specifically is the signal.',
            buildsOn: ['semantic-locks-and-pivot-steps'],
            blocks: [
                {
                    type: 'table',
                    title: 'The techniques, and what each costs',
                    headers: ['Technique', 'What the user sees', 'Cost'],
                    rows: [
                        ['Accept and report progress', '"Order received — confirming payment"', 'A status the UI must poll or subscribe to'],
                        ['Optimistic UI', 'The order appears immediately', 'It may have to be withdrawn, which is worse than a delay'],
                        ['Block until the pivot', 'A spinner for a second or two', 'Latency, and a request held open'],
                        ['Read your own writes', 'Their own order is visible even if others\' are not', 'Route the user\'s reads to the primary, or read from a local cache'],
                        ['Notify on completion', 'An email or a push when it is done', 'The user has left the page, which is often fine']
                    ]
                },
                {
                    type: 'prose',
                    html: '<p><strong>Read-your-writes</strong> is the specific expectation that eventual consistency violates most visibly. A user who places an order and is immediately shown a list without it concludes the order failed — and places it again. Everything else can lag; a user\'s own action appearing to them cannot.</p><p>The usual fix is not to make the system consistent but to make <em>that user\'s</em> read consistent: pin their session to the primary for a few seconds, or have the client hold the pending order locally and merge it into the list until the server confirms it.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The most useful design move is to make the pending state <strong>a first-class thing the product acknowledges</strong> rather than a gap to be hidden. "Payment confirming" as a visible order status is honest, sets an expectation, gives support something to look at, and needs no consistency tricks at all. Hiding the window means every technique above is compensating for a product decision nobody made deliberately.</p>'
                }
            ],
            docs: [
                { title: 'Eventual Consistency', url: 'https://martinfowler.com/articles/microservice-trade-offs.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'caching-scale', questionId: 'eventual-consistency-in-practice' }
            ]
        },

        {
            id: 'designing-an-order-saga',
            title: 'Worked: An Order Saga',
            importance: 'must-know',
            summary: 'The whole module on one flow: steps, compensations, the pivot, the semantic lock, the timeouts and what the customer sees at each stage.',
            interviewAngle: 'A very common design prompt. Working through it with the pivot identified and the timeouts named is a complete answer.',
            buildsOn: ['eventual-consistency-in-a-ui'],
            blocks: [
                {
                    type: 'table',
                    title: 'The design, step by step',
                    headers: ['Step', 'Local transaction', 'Compensation', 'Timeout', 'Order status'],
                    rows: [
                        ['1', 'Create order', 'Mark cancelled', '—', '<code>PENDING</code>'],
                        ['2', 'Reserve stock', 'Release stock', '30s', '<code>RESERVING</code>'],
                        ['3', '<strong>Take payment — the PIVOT</strong>', 'Refund', '60s', '<code>AWAITING_PAYMENT</code>'],
                        ['4', 'Book courier', '<em>None — retry until it succeeds</em>', '5m, then alert', '<code>CONFIRMED</code>'],
                        ['5', 'Send confirmation email', 'None; irreversible, so it is last', '—', '<code>CONFIRMED</code>']
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>Three decisions in that table carry the design. <strong>Payment is the pivot</strong>: before it, failure cancels cleanly and the customer is told the order could not be placed; after it, the order <em>will</em> be fulfilled and courier booking is retried rather than compensated, because refunding a customer for a temporary courier outage is a worse outcome than a delayed dispatch.</p><p>The <strong>email is last</strong> because it cannot be compensated. And every step has a <strong>timeout</strong> with a defined action, because a participant that never answers is the failure mode that leaves a saga stuck forever.</p>'
                },
                {
                    type: 'types',
                    title: 'The failure cases, and what the customer sees',
                    items: [
                        { name: 'Stock unavailable', html: '<p>Cancel. Customer sees "out of stock" within a second or two. Nothing to compensate.</p>' },
                        { name: 'Payment declined', html: '<p>Release stock, cancel. Customer sees "payment declined". Clean.</p>' },
                        { name: 'Courier unavailable', html: '<p><strong>Past the pivot.</strong> Retry with backoff; alert operations after five minutes. The customer sees "confirmed" and a dispatch estimate. Do not refund.</p>' },
                        { name: 'Payment service never answers', html: '<p>Timeout at 60s. Reconcile against the provider before compensating — the charge may have succeeded, which is the idempotency module\'s window.</p>' },
                        { name: 'The orchestrator crashes mid-saga', html: '<p>The saga state row survives. On restart, resume from the recorded step; the timeout job catches anything that stalled.</p>' },
                        { name: 'A compensation fails', html: '<p>Retry indefinitely and alert. There is no compensation for a compensation, so this is an operational escalation by design.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>The sentence that closes this well: <em>"Payment is the pivot. Everything before it is reversible, so a failure cancels cleanly. Everything after it is retried until it succeeds, because the customer has been charged and the right outcome is to fulfil the order rather than to refund them for our courier problem. Every step has a timeout and a defined action, and the saga state is persisted so the orchestrator can crash without losing the flow."</em></p>'
                }
            ],
            docs: [
                { title: 'Saga pattern', url: 'https://microservices.io/patterns/data/saga.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'microservices', questionId: 'saga-orchestration-or-choreography' },
                { topicId: 'behavioural-project', questionId: 'explaining-your-architecture' }
            ]
        }
    ]
};
