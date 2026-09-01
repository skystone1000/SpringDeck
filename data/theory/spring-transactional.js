/* ==========================================================================
   data/theory/spring-transactional.js — module 51 in the reading path

   Ten chapters, the largest in the persistence track, and it depends on
   aop-and-proxies for a reason: @Transactional is an @Around advice, and
   every one of its surprising behaviours is a property of the proxy rather
   than of the database.
   ========================================================================== */

const springTransactionalModule = {
    id: 'spring-transactional',
    trackId: 'persistence',
    order: 51,
    title: '@Transactional in Depth',
    tagline: 'Propagation, rollback rules, and the proxy that is not there.',
    estimatedMinutes: 50,
    prerequisites: ['fetching-and-n-plus-one', 'aop-and-proxies'],
    docHub: { title: 'Spring — Transaction Management', url: 'https://docs.spring.io/spring-framework/reference/data-access/transaction.html' },

    chapters: [
        {
            id: 'how-transactional-is-implemented',
            title: 'What the Annotation Actually Does',
            importance: 'must-know',
            summary: 'A proxy, an around advice, and a resource bound to the thread. Every surprise in this module comes from one of those three.',
            interviewAngle: 'The mechanism question, and it pays off across the whole module. A candidate who can describe the interceptor derives self-invocation, propagation and the readOnly behaviour rather than memorising three separate facts.',
            buildsOn: [],
            blocks: [
                {
                    type: 'types',
                    title: 'The pieces',
                    items: [
                        { name: 'The proxy', html: '<p>Created by an infrastructure post-processor for any bean with the annotation. What the container hands out is the proxy — see the AOP module.</p>' },
                        { name: 'TransactionInterceptor', html: '<p>An <code>@Around</code> advice. Before the call it obtains a transaction; after, it commits or rolls back depending on what came out.</p>' },
                        { name: 'PlatformTransactionManager', html: '<p>The abstraction over what a transaction <em>is</em> — <code>JpaTransactionManager</code>, <code>DataSourceTransactionManager</code>. It owns begin, commit and rollback.</p>' },
                        { name: 'TransactionSynchronizationManager', html: '<p>A <code>ThreadLocal</code> holding the connection and the <code>EntityManager</code> for the current transaction. <strong>This is why a transaction does not follow a call onto another thread.</strong></p>' }
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The interceptor, in outline',
                    code: '// Roughly what TransactionInterceptor does around your method:\nTransactionStatus tx = txManager.getTransaction(definition);\ntry {\n    Object result = invocation.proceed();      // your method\n    txManager.commit(tx);\n    return result;\n} catch (Throwable ex) {\n    if (rollbackRules.rollbackOn(ex)) {\n        txManager.rollback(tx);                // default: RuntimeException\n    } else {\n        txManager.commit(tx);                  // yes -- COMMIT, on a\n    }                                          // checked exception\n    throw ex;\n}',
                    notes: '<p>The <code>else</code> branch is not a simplification. A checked exception, by default, <strong>commits</strong> — the rollback-rules chapter is about why, and it is the single most surprising line in Spring\'s data access.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The thread-bound resource is worth remembering separately, because it explains three things at once: why <code>@Async</code> work does not join the caller\'s transaction, why a new thread inside a transactional method gets its own connection, and why reactive code needs an entirely different transaction manager. The transaction lives on the thread, not in the call graph.</p>'
                }
            ],
            docs: [
                { title: 'Spring — Declarative Transaction Management', url: 'https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'transactions', questionId: 'transaction-boundaries' }
            ]
        },

        {
            id: 'propagation-required',
            title: 'REQUIRED, the Default',
            importance: 'must-know',
            summary: 'Join the caller\'s transaction if there is one, start one otherwise. The inner method has no transaction of its own, which is what makes rollback-only surprising.',
            interviewAngle: 'The propagation question always starts here. The detail that matters is that joining means there is only ever one physical transaction — so an inner method cannot commit independently, however it looks in the code.',
            buildsOn: ['how-transactional-is-implemented'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'One transaction, two annotated methods',
                    code: '@Service\nclass OrderService {\n    @Transactional                       // REQUIRED: starts one\n    public void placeOrder(Order order) {\n        orders.save(order);\n        audit.record(order);             // joins it. No second transaction.\n    }\n}\n\n@Service\nclass AuditService {\n    @Transactional                       // REQUIRED: joins the caller\'s\n    public void record(Order order) {\n        auditRepository.save(new Entry(order));\n    }\n}\n// One BEGIN, one COMMIT. If placeOrder fails afterwards, the audit\n// entry is rolled back too -- which is usually right, and is\n// occasionally exactly what you did not want.',
                    output: {
                        kind: 'trace',
                        lines: [
                            'The outer call finds no active transaction and begins one.',
                            'The inner call finds an active transaction and joins it -- no BEGIN is issued, and its @Transactional contributes nothing but the possibility of rollback rules.',
                            'The inner method returning normally does NOT commit. Only the outermost boundary commits.',
                            'And if the inner method throws a RuntimeException that the outer method catches, the transaction is already marked rollback-only -- so the outer method commits into a rollback and gets UnexpectedRollbackException.'
                        ],
                        explain: '<p>That last line is the behaviour worth carrying. Catching an exception from an inner transactional method does <strong>not</strong> undo the rollback mark; the flag is on the shared transaction and only the outermost boundary reads it. The method that swallowed the exception looks like it recovered, and the commit fails.</p>'
                    }
                },
                {
                    type: 'pitfall',
                    html: '<p><strong><code>UnexpectedRollbackException: Transaction rolled back because it has been marked as rollback-only</code></strong> is the signature of exactly that. Somebody caught an exception from an inner <code>@Transactional</code> method and carried on. The fix is either to not catch it, or to give the inner method <code>REQUIRES_NEW</code> so its failure is genuinely its own — and those two have very different semantics, which is the next chapter.</p>'
                }
            ],
            docs: [
                { title: 'Spring — Transaction Propagation', url: 'https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/tx-propagation.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'transactions', questionId: 'transactional-propagation' }
            ]
        },

        {
            id: 'requires-new-and-suspension',
            title: 'REQUIRES_NEW',
            importance: 'must-know',
            summary: 'Suspend the caller\'s transaction and run in a genuinely separate one, on a second connection. The independence is real and so is the cost.',
            interviewAngle: 'The follow-up, and the two things to get right are that it uses a second connection from the pool, and that the two transactions can deadlock against each other.',
            buildsOn: ['propagation-required'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Audit that survives the rollback',
                    code: '@Service\nclass AuditService {\n\n    @Transactional(propagation = Propagation.REQUIRES_NEW)\n    public void record(String what) {\n        auditRepository.save(new Entry(what));\n    }\n    // Commits on its own. If the caller then rolls back, this stays.\n}\n\n@Service\nclass OrderService {\n    @Transactional\n    public void placeOrder(Order order) {\n        audit.record("attempt");     // committed independently\n        orders.save(order);\n        throw new PaymentDeclined(); // order rolled back; audit remains\n    }\n}',
                    output: {
                        kind: 'trace',
                        lines: [
                            'The outer transaction is suspended -- its connection is held open and unused for the duration of the inner one.',
                            'The inner transaction takes a SECOND connection from the pool, does its work, and commits.',
                            'So a request in this shape occupies two pool connections at once. A pool of ten supports five such requests, not ten.',
                            'The two transactions are independent at the database level, which means the inner one can BLOCK on a row the outer one has locked -- and that is a self-deadlock no deadlock detector can resolve, because one side is waiting on itself.'
                        ],
                        explain: '<p>The self-deadlock is the failure worth knowing. Lock a row in the outer transaction, then call a <code>REQUIRES_NEW</code> method that updates the same row: the inner transaction waits for a lock the outer one holds, and the outer one is waiting for the inner to return. It resolves only by timeout, and the stack trace shows a lock wait with no other session involved.</p>'
                    }
                },
                {
                    type: 'tip',
                    html: '<p>Legitimate uses are narrow and worth naming: audit and event logging that must survive a rollback, and a failure counter or a retry marker that must be recorded even when the work failed. If the reason is "so the inner failure does not roll back the outer one", the actual requirement is usually error handling rather than a second transaction.</p>'
                }
            ],
            docs: [
                { title: 'Spring — Transaction Propagation', url: 'https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/tx-propagation.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'transactions', questionId: 'transactional-propagation' }
            ]
        },

        {
            id: 'nested-and-savepoints',
            title: 'NESTED and Savepoints',
            importance: 'should-know',
            summary: 'A savepoint inside the existing transaction. The inner part can roll back alone, and it still commits or rolls back with the outer one.',
            interviewAngle: 'The distinction from REQUIRES_NEW is the question: NESTED is one transaction with a rollback point, REQUIRES_NEW is two transactions on two connections.',
            buildsOn: ['requires-new-and-suspension'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'NESTED against REQUIRES_NEW',
                    left: 'NESTED',
                    right: 'REQUIRES_NEW',
                    rows: [
                        { aspect: 'Physical transactions', left: '<strong>One</strong>, with a savepoint', right: '<strong>Two</strong>' },
                        { aspect: 'Connections used', left: 'One', right: 'Two, concurrently' },
                        { aspect: 'Inner fails', left: 'Roll back to the savepoint; outer continues', right: 'Inner rolls back; outer continues' },
                        { aspect: 'Outer fails after inner succeeded', left: '<strong>Inner work is rolled back too</strong>', right: '<strong>Inner work survives</strong>' },
                        { aspect: 'Can deadlock against the outer', left: 'No — same transaction, same locks', right: '<strong>Yes</strong>' },
                        { aspect: 'Support', left: 'JDBC savepoints; <strong>not supported by JPA</strong>', right: 'Everywhere' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong><code>JpaTransactionManager</code> does not support <code>NESTED</code>.</strong> Requesting it throws <code>NestedTransactionNotSupportedException</code> at runtime — not at startup — so it fails on the first call rather than at deployment. It works with <code>DataSourceTransactionManager</code>, which means it is available in a JDBC-only codebase and not in a JPA one, and that asymmetry catches people migrating between the two.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The row that decides between them in practice is the fourth: if the outer transaction fails, do you want the inner work kept? Audit entries yes — <code>REQUIRES_NEW</code>. A partial step in one logical unit, no — and <code>NESTED</code>, where available, is the honest expression of that.</p>'
                }
            ],
            docs: [
                { title: 'Spring — Transaction Propagation', url: 'https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/tx-propagation.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'transactions', questionId: 'transactional-propagation' }
            ]
        },

        {
            id: 'the-other-propagations',
            title: 'The Other Four',
            importance: 'good-to-know',
            summary: 'SUPPORTS, NOT_SUPPORTED, MANDATORY and NEVER. Two are assertions about the caller, and those are the useful ones.',
            interviewAngle: 'Completeness. MANDATORY is worth singling out because it makes a design rule enforceable — this method may only be called from within a transaction, checked at runtime.',
            buildsOn: ['nested-and-savepoints'],
            blocks: [
                {
                    type: 'table',
                    title: 'All seven, in one place',
                    headers: ['Propagation', 'With a transaction', 'Without one'],
                    rows: [
                        ['<code>REQUIRED</code>', 'Join it', 'Start one — <strong>the default</strong>'],
                        ['<code>REQUIRES_NEW</code>', 'Suspend it, start a new one', 'Start one'],
                        ['<code>NESTED</code>', 'Savepoint', 'Start one'],
                        ['<code>SUPPORTS</code>', 'Join it', 'Run without one'],
                        ['<code>NOT_SUPPORTED</code>', 'Suspend it, run without', 'Run without one'],
                        ['<code>MANDATORY</code>', 'Join it', '<strong>Throw</strong>'],
                        ['<code>NEVER</code>', '<strong>Throw</strong>', 'Run without one']
                    ]
                },
                {
                    type: 'tip',
                    html: '<p><code>MANDATORY</code> is the one worth using deliberately. On a repository-level method that must never define its own boundary, it turns "this should be called inside a transaction" from a comment into a runtime assertion — and it fails on the first call in a test rather than in production, where the absent transaction would merely mean each statement autocommitted.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong><code>NOT_SUPPORTED</code> suspends the transaction and holds its connection.</strong> The suspended transaction keeps its connection for the duration, and the code running without a transaction takes another for each statement. Using it to run a long report inside a transactional method therefore ties up two connections and leaves the outer transaction open across the whole report — which is the MVCC vacuum problem and the pool-exhaustion problem at once.</p>'
                }
            ],
            docs: [
                { title: 'Spring — Transaction Propagation', url: 'https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/tx-propagation.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'transactions', questionId: 'transactional-propagation' }
            ]
        },

        {
            id: 'rollback-rules-and-checked-exceptions',
            title: 'A Checked Exception Commits',
            importance: 'must-know',
            summary: 'Spring rolls back on RuntimeException and Error, and commits on a checked exception. This surprises everyone once, and it has committed partial work in production.',
            interviewAngle: 'One of the highest-value single facts in Spring. Knowing the default, why it exists, and how to change it is a complete answer that many candidates get wrong.',
            buildsOn: ['propagation-required'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The default, and both ways to change it',
                    code: '@Transactional\nvoid transfer(...) throws InsufficientFunds {   // CHECKED\n    accounts.debit(from, amount);\n    if (balanceTooLow) throw new InsufficientFunds();\n    accounts.credit(to, amount);\n}\n// The debit is COMMITTED. The credit never happened. Money vanished.\n\n// Fix 1: declare it.\n@Transactional(rollbackFor = InsufficientFunds.class)\n\n// Fix 2: make it unchecked. Usually the better answer -- a business\n// rule violation is not a recoverable condition the caller handles.\nclass InsufficientFunds extends RuntimeException { }\n\n// And the reverse, occasionally useful:\n@Transactional(noRollbackFor = OptimisticLockException.class)',
                    output: {
                        kind: 'trace',
                        lines: [
                            'Spring rolls back on RuntimeException and Error, and commits on anything checked. That is the documented default and it applies to every @Transactional method.',
                            'The reasoning comes from EJB, where a checked exception was defined as a recoverable business condition that the caller handles -- so the transaction should stand.',
                            'The reasoning does not survive contact with modern code, where checked exceptions are used for ordinary failures and nobody expects them to commit.',
                            'The failure is silent and partial: half a unit of work is durable and the method threw. Nothing in the log says a commit happened.'
                        ],
                        explain: '<p>Note that <code>rollbackFor</code> only affects exceptions propagating <em>out</em> of the annotated method. An exception caught inside it never reaches the interceptor at all, so a <code>try/catch</code> that logs and continues has already decided to commit — whatever the annotation says.</p>'
                    }
                },
                {
                    type: 'tip',
                    html: '<p>The position worth stating: <em>"I would make domain exceptions unchecked, so the default does the right thing, rather than annotating <code>rollbackFor</code> on every method. An annotation that must be remembered on every method is one somebody will forget, and the failure mode is committed partial work."</em></p>'
                }
            ],
            docs: [
                { title: 'Spring — Rolling Back a Declarative Transaction', url: 'https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/rolling-back.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'transactions', questionId: 'rollback-rules' }
            ]
        },

        {
            id: 'readonly-and-what-it-does',
            title: 'readOnly = true',
            importance: 'must-know',
            summary: 'Three effects at three layers, and the Hibernate one is the largest — no dirty-check snapshots and no flush.',
            interviewAngle: 'Often answered as "it stops writes", which is not quite what it does. Naming the three layers, and knowing the database does not enforce it in every engine, is the fuller answer.',
            buildsOn: ['how-transactional-is-implemented'],
            blocks: [
                {
                    type: 'types',
                    title: 'What it actually does, largest effect first',
                    items: [
                        { name: 'Hibernate: flush mode MANUAL', html: '<p><strong>No snapshots, no dirty checking, no flush.</strong> Measurably less memory and less CPU on a large read, and an accidental mutation is simply never written.</p>' },
                        { name: 'JDBC: a hint to the driver', html: '<p><code>Connection.setReadOnly(true)</code>. On PostgreSQL this becomes a read-only transaction that <em>does</em> reject writes; on some drivers it is advisory and enforces nothing.</p>' },
                        { name: 'Routing', html: '<p>A replica-aware <code>DataSource</code> can route read-only transactions to a read replica. This is the feature that makes the annotation worth putting on every read path.</p>' },
                        { name: 'Documentation', html: '<p>The signature says the method does not write, which is worth something to a reviewer on its own.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>It is not a guarantee, and the boundary is what decides.</strong> <code>readOnly</code> is read when the transaction <em>starts</em>, so a <code>readOnly = true</code> method that calls a writing method with <code>REQUIRED</code> gives that method the read-only transaction — and the write silently does not flush under JPA, or fails at the driver. Conversely a read-only method called from inside a writing transaction joins the writable one and its <code>readOnly</code> is ignored entirely.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Put <code>@Transactional(readOnly = true)</code> at the class level on read-oriented services and override it per method where a write happens. That way the safe setting is the default and the writing methods are the ones that stand out, which is the right way round for a reviewer.</p>'
                }
            ],
            docs: [
                { title: 'Spring — Using @Transactional', url: 'https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/annotations.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'transactions', questionId: 'readonly-transactions' }
            ]
        },

        {
            id: 'self-invocation-again',
            title: 'The Proxy That Is Not There',
            importance: 'must-know',
            summary: 'The same trap as the AOP module, stated here in the terms it is usually met in: @Transactional on a method called from within the same class does nothing.',
            interviewAngle: 'Asked as "@Transactional is not working, why". Five causes, and self-invocation is the first — but the others are worth having ready because the interviewer may have a different one in mind.',
            buildsOn: ['readonly-and-what-it-does'],
            blocks: [
                {
                    type: 'types',
                    title: 'Why @Transactional does nothing — the five causes, in order of likelihood',
                    items: [
                        { name: 'Self-invocation', html: '<p>Called on <code>this</code>, so the proxy is never consulted. <strong>The most common by far</strong>, and it is silent — see the AOP module for the mechanism and the four fixes.</p>' },
                        { name: 'The method is not public', html: '<p>Spring AOP advises overridable instance methods. A <code>private</code> or <code>protected</code> method is invisible to a CGLIB subclass, and the annotation is ignored without a warning.</p>' },
                        { name: 'The class is not a bean', html: '<p><code>new OrderService()</code> is not proxied by anything. Common in tests, and in code that constructs a helper by hand.</p>' },
                        { name: 'A checked exception', html: '<p>The transaction existed and committed, which looks identical to it not having existed. Two chapters ago.</p>' },
                        { name: 'The wrong transaction manager', html: '<p>Two <code>DataSource</code>s, two managers, and the annotation used the primary one. The work happens on the other connection, outside the transaction that was started.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>The diagnostic that settles it in one line: <code>TransactionSynchronizationManager.isActualTransactionActive()</code> inside the method. True means a transaction exists and the problem is elsewhere — rollback rules, or the wrong manager. False means the interceptor never ran, and it is one of the first three causes.</p>'
                }
            ],
            docs: [
                { title: 'Spring — Understanding the Proxy', url: 'https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/annotations.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'transactions', questionId: 'transactional-not-working' },
                { topicId: 'aop-proxies', questionId: 'self-invocation' }
            ]
        },

        {
            id: 'transaction-boundaries-in-a-service-layer',
            title: 'Where the Boundary Goes',
            importance: 'must-know',
            summary: 'The service method is the unit of work. Not the controller, not the repository — and a transaction that spans a slow call is a transaction that spans a slow call.',
            interviewAngle: 'A design question. The rule is easy to state and the reasoning is what is assessed: the boundary belongs where the business operation is, because that is what has to be all-or-nothing.',
            buildsOn: ['self-invocation-again'],
            blocks: [
                {
                    type: 'types',
                    title: 'Where it does and does not belong',
                    items: [
                        { name: 'The service method — yes', html: '<p>One business operation, one transaction. It is the layer where "place an order" exists as a single thing.</p>' },
                        { name: 'The repository — no', html: '<p>A transaction per statement means two writes in one operation are two units of work, and the second failing leaves the first committed. Spring Data\'s methods are transactional individually, which is a floor rather than the design.</p>' },
                        { name: 'The controller — no', html: '<p>It would hold the transaction across request parsing and response rendering. That is <code>open-in-view</code> with extra steps.</p>' },
                        { name: 'Around an HTTP call — <strong>never</strong>', html: '<p>The connection is held for the duration of somebody else\'s latency, and the transaction cannot be rolled back on their side anyway.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A transaction is a lock plus a connection, held for as long as the method runs.</strong> So anything slow inside one — an HTTP call, a file upload, a large in-memory transformation, a <code>Thread.sleep</code> in a retry — multiplies the resources that operation costs. This is the cause behind the pool-exhaustion signature, the MVCC bloat, and most lock contention, all from one habit: doing non-database work inside a database transaction.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The pattern for an operation that must both write and call out: <strong>write, commit, then act</strong>. Persist the intent in the transaction, and do the external call afterwards — driven by an outbox row or an <code>@TransactionalEventListener(phase = AFTER_COMMIT)</code>. That keeps the transaction short and it also fixes the correctness half, since an email sent inside a transaction that then rolls back has still been sent.</p>'
                }
            ],
            docs: [
                { title: 'Spring — Transaction Management', url: 'https://docs.spring.io/spring-framework/reference/data-access/transaction.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'transactions', questionId: 'transaction-boundaries' }
            ]
        },

        {
            id: 'transactions-across-http-calls',
            title: 'When the Work Spans Two Services',
            importance: 'should-know',
            summary: 'There is no transaction across an HTTP call. The answers are an outbox, a saga, or accepting that the two can disagree for a while.',
            interviewAngle: 'A system-design question that arrives in most senior interviews. Knowing why two-phase commit is not the answer, and what an outbox actually solves, is the substance.',
            buildsOn: ['transaction-boundaries-in-a-service-layer'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>The dual-write problem is precise: write to the database and publish a message, and there is no way to make both happen or neither. The database commit can succeed and the publish fail; the publish can succeed and the commit roll back. Whichever order you choose, a crash between them leaves the two systems disagreeing.</p>'
                },
                {
                    type: 'types',
                    title: 'The three answers',
                    items: [
                        { name: 'The transactional outbox', html: '<p>Write the message as a <strong>row in the same transaction</strong> as the business data, and a separate process publishes rows and marks them sent. Atomic, because it is one database. <strong>The default answer</strong>, and it gives at-least-once delivery, so consumers must be idempotent.</p>' },
                        { name: 'A saga', html: '<p>A sequence of local transactions, each with a compensating action for failure. No distributed lock, and the compensations are real business logic — refund, cancel, notify — which is why it is a design exercise rather than a library.</p>' },
                        { name: 'Two-phase commit (XA)', html: '<p>Real, standardised, and rarely the answer: it needs a coordinator, every participant must support XA, it holds locks across the network for the duration, and a coordinator failure leaves participants in doubt with their locks still held.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>Have change data capture ready as the modern refinement: Debezium reads the database\'s own write-ahead log and publishes the committed changes, so the outbox row does not need a polling process at all. It is the same guarantee — the row and the business data commit together — with the publisher moved out of the application.</p>'
                }
            ],
            docs: [
                { title: 'Spring — Transaction Management', url: 'https://docs.spring.io/spring-framework/reference/data-access/transaction.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'transactions', questionId: 'distributed-transactions' }
            ]
        }
    ]
};
