/* ==========================================================================
   data/transactions.js — Transactions & Concurrency Control

   Sixteen questions, no subsections. Transactions cut across JPA, JDBC, the
   database and Spring's proxies, and splitting them into headings would imply
   those are separable. They are not: the reason @Transactional silently does
   nothing is a proxy fact, the reason REQUIRES_NEW deadlocks is a connection
   pool fact, and the reason a retry works is a database fact.

   ONE GLOBAL PER FILE.
   ========================================================================== */

const transactionsData = {
    id: 'transactions',
    title: 'Transactions & Concurrency Control',
    subsections: null,
    keyTopics: [
        'ACID', 'isolation levels', 'dirty read', 'non-repeatable read',
        'phantom read', 'propagation', 'REQUIRES_NEW', 'NESTED and savepoints',
        'rollback rules', 'self-invocation', 'readOnly',
        'optimistic locking with @Version', 'pessimistic locking', 'deadlock'
    ],
    questions: [

{
    id: 'acid',
    importance: 'must-know',
    subsection: null,
    question: 'What does ACID mean, and which letter does your application actually have to think about?',
    answer:
        '<ul>' +
        '<li><strong>Atomicity</strong> — all of the statements or none of them.</li>' +
        '<li><strong>Consistency</strong> — the transaction moves the database from one valid ' +
        'state to another, where "valid" means the declared constraints hold. Note this is the ' +
        'database\'s constraints, not your business rules.</li>' +
        '<li><strong>Isolation</strong> — concurrent transactions do not observe each other\'s ' +
        'intermediate state, to a degree you choose.</li>' +
        '<li><strong>Durability</strong> — once committed, it survives a crash.</li>' +
        '</ul>' +
        '<p><strong>Isolation is the only one you have to make decisions about.</strong> ' +
        'Atomicity and durability are given; consistency is enforced by the constraints you ' +
        'declared. Isolation is a dial with a real cost at each setting, and the default is not ' +
        'the strongest.</p>' +
        '<p>Two things worth adding, because they show the limits of the acronym.</p>' +
        '<p><strong>ACID is per database.</strong> The moment a business operation spans two ' +
        'services or two databases, none of these properties applies across the whole of it. ' +
        'That is the entire reason sagas, outboxes and idempotency keys exist — and why "just ' +
        'use a transaction" stops being an answer in a distributed system.</p>' +
        '<p><strong>The C is the weakest letter.</strong> It is often said to be included for ' +
        'the acronym: the database guarantees only that <em>its</em> constraints hold, so ' +
        '"an order total must equal the sum of its lines" is your problem unless you wrote it ' +
        'as a constraint or a trigger.</p>',
    referenceLinks: [
        { title: 'PostgreSQL Documentation — Transactions', url: 'https://www.postgresql.org/docs/current/tutorial-transactions.html' }
    ],
    tags: ['transactions', 'acid', 'databases'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'isolation-levels-and-anomalies',
    importance: 'must-know',
    subsection: null,
    question: 'What are the isolation levels, and which anomaly does each one prevent?',
    answer:
        '<p>Four levels, defined by the three anomalies they forbid.</p>' +
        '<ul>' +
        '<li><strong>READ UNCOMMITTED</strong> — permits a <strong>dirty read</strong>: seeing ' +
        'another transaction\'s uncommitted change, which may then be rolled back. Almost never ' +
        'useful. PostgreSQL does not implement it at all and silently treats it as READ ' +
        'COMMITTED.</li>' +
        '<li><strong>READ COMMITTED</strong> — no dirty reads. Permits a ' +
        '<strong>non-repeatable read</strong>: reading a row twice in one transaction and ' +
        'getting different values because someone committed in between. <strong>The default in ' +
        'PostgreSQL, Oracle and SQL Server.</strong></li>' +
        '<li><strong>REPEATABLE READ</strong> — a row read twice reads the same. Classically ' +
        'permits a <strong>phantom read</strong>: a range query returning a new row on the ' +
        'second execution. <strong>The default in MySQL InnoDB</strong>, which also prevents ' +
        'phantoms through next-key locking — so the same level name behaves differently between ' +
        'engines.</li>' +
        '<li><strong>SERIALIZABLE</strong> — the result is equivalent to some serial ordering. ' +
        'No anomalies, and the highest cost: in PostgreSQL it is optimistic and transactions ' +
        'get aborted with a serialisation failure that the application must retry.</li>' +
        '</ul>' +
        '<p><strong>Two things that matter more than the table.</strong> First, ' +
        '<strong>the level names are a floor, not a specification of behaviour</strong> — an ' +
        'engine may prevent more than the standard requires, and MySQL and PostgreSQL differ ' +
        'materially at REPEATABLE READ. Always name the engine when discussing this.</p>' +
        '<p>Second, <strong>the anomaly that bites most often is not on the list</strong>: the ' +
        '<em>lost update</em>. Two transactions read a balance of 100, each adds 50, and the ' +
        'final value is 150 rather than 200. READ COMMITTED permits it entirely. Preventing it ' +
        'needs optimistic locking with a version column, a pessimistic <code>SELECT FOR ' +
        'UPDATE</code>, or an atomic <code>UPDATE ... SET balance = balance + 50</code> — not a ' +
        'higher isolation level.</p>',
    referenceLinks: [
        { title: 'Transaction Isolation — PostgreSQL Documentation', url: 'https://www.postgresql.org/docs/current/transaction-iso.html' }
    ],
    tags: ['transactions', 'isolation', 'anomalies', 'databases'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'lost-update',
    importance: 'must-know',
    subsection: null,
    question: 'Two users edit the same record at the same time. How do you stop one overwriting the other?',
    answer:
        '<p>Three answers, and the right one depends on how often the collision actually ' +
        'happens.</p>' +
        '<p><strong>Optimistic locking.</strong> A <code>@Version</code> column that Hibernate ' +
        'increments on every update, with the old value in the <code>WHERE</code> clause. If ' +
        'someone else has already updated the row, zero rows match and Hibernate throws ' +
        '<code>OptimisticLockException</code>. No locks are held, so it costs nothing when there ' +
        'is no conflict — which is the normal case. <strong>This is the default choice for a ' +
        'web application</strong>, because a user thinking about a form for two minutes must not ' +
        'hold a database lock.</p>' +
        '<p><strong>Pessimistic locking.</strong> <code>SELECT ... FOR UPDATE</code>, via ' +
        '<code>@Lock(PESSIMISTIC_WRITE)</code>. Nobody else can read-for-update or write the row ' +
        'until the transaction ends. Correct when collisions are frequent and retrying is ' +
        'expensive — decrementing stock on a popular item, for instance. The costs are real: ' +
        'lock waits, a longer transaction, and deadlock potential if two transactions lock rows ' +
        'in different orders.</p>' +
        '<p><strong>Make the update atomic.</strong> <code>UPDATE account SET balance = balance ' +
        '+ 50 WHERE id = ?</code> has no read-then-write at all, so there is nothing to lose. ' +
        'Where the operation is expressible this way it is the simplest and fastest option by ' +
        'some distance, and it is the one people forget because ORMs encourage load-modify-save.</p>' +
        '<p>The user-facing half matters too: an <code>OptimisticLockException</code> should ' +
        'become a <strong>409 Conflict</strong> with enough information for the user to decide, ' +
        'not a 500. And in an API, an <code>ETag</code> with <code>If-Match</code> is the same ' +
        'mechanism at the HTTP layer.</p>',
    referenceLinks: [
        { title: 'Locking — Hibernate User Guide', url: 'https://docs.hibernate.org/orm/current/userguide/html_single/#locking' }
    ],
    tags: ['transactions', 'optimistic-locking', 'pessimistic-locking', 'concurrency'],
    images: [],
    hasDiagram: true,
    diagramType: 'sequence',
    diagramConfig: {
        title: 'A lost update, and where @Version stops it',
        actors: [
            { id: 'a',  label: 'User A' },
            { id: 'db', label: 'orders row, version 3' },
            { id: 'b',  label: 'User B' }
        ],
        messages: [
            { from: 'a',  to: 'db', label: 'read: total 100, version 3' },
            { from: 'b',  to: 'db', label: 'read: total 100, version 3' },
            { from: 'a',  to: 'db', label: 'UPDATE ... WHERE version = 3' },
            { from: 'db', to: 'a',  label: '1 row, version now 4', kind: 'return' },
            { from: 'b',  to: 'db', label: 'UPDATE ... WHERE version = 3' },
            { from: 'db', to: 'b',  label: '0 rows: OptimisticLockException', kind: 'return' }
        ]
    },
    codeSnippets: []
},

{
    id: 'transactional-propagation',
    importance: 'must-know',
    subsection: null,
    question: 'What are the propagation modes, and when would you use REQUIRES_NEW?',
    answer:
        '<p>Propagation says what happens when a transactional method is called from inside an ' +
        'existing transaction.</p>' +
        '<ul>' +
        '<li><strong><code>REQUIRED</code></strong> (default) — join the existing one, or start ' +
        'one. The right answer nearly always.</li>' +
        '<li><strong><code>REQUIRES_NEW</code></strong> — suspend the caller\'s transaction and ' +
        'run in a genuinely independent one, which commits or rolls back on its own.</li>' +
        '<li><strong><code>NESTED</code></strong> — a savepoint inside the caller\'s ' +
        'transaction. It can roll back to the savepoint without killing the outer one, and it ' +
        'commits only when the outer commits. JDBC only; it does not work with JPA.</li>' +
        '<li><strong><code>SUPPORTS</code></strong> — join if there is one, run without ' +
        'otherwise.</li>' +
        '<li><strong><code>NOT_SUPPORTED</code></strong> — suspend and run without.</li>' +
        '<li><strong><code>MANDATORY</code></strong> — throw if there is not one. Useful on a ' +
        'method that must never be the transaction boundary.</li>' +
        '<li><strong><code>NEVER</code></strong> — throw if there is one.</li>' +
        '</ul>' +
        '<p><strong><code>REQUIRES_NEW</code> is for work that must survive the caller\'s ' +
        'rollback</strong> — writing an audit record of a failed attempt, recording a failure ' +
        'reason, incrementing a retry counter. If the outer transaction rolls back, the inner ' +
        'one has already committed and the record stands.</p>' +
        '<p><strong>The trap is the connection pool.</strong> A suspended transaction keeps its ' +
        'connection, and the new one takes a second. So a request that nests ' +
        '<code>REQUIRES_NEW</code> holds two connections at once, and doing it in a loop over a ' +
        'collection can exhaust a ten-connection pool with five concurrent requests. The symptom ' +
        'is a timeout waiting for a connection, and the cause is several stack frames away.</p>' +
        '<p>Both <code>REQUIRES_NEW</code> and <code>NESTED</code> also lose their meaning ' +
        'entirely under self-invocation — the call never crosses the proxy, so the propagation ' +
        'setting is never consulted.</p>',
    referenceLinks: [
        { title: 'Transaction Propagation — Spring Framework Reference', url: 'https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/tx-propagation.html' }
    ],
    tags: ['transactions', 'propagation', 'spring', 'connection-pool'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'rollback-rules',
    importance: 'must-know',
    subsection: null,
    question: 'Which exceptions cause a rollback by default, and why does that catch people out?',
    answer:
        '<p><strong>By default Spring rolls back on <code>RuntimeException</code> and ' +
        '<code>Error</code>, and commits on a checked exception.</strong></p>' +
        '<p>That is the behaviour that surprises people, and it surprises them in the worst ' +
        'direction: a method that throws a checked exception to signal failure has its ' +
        'transaction <em>committed</em>. Half the work is written, an exception propagates, and ' +
        'the data is inconsistent with no error anywhere saying so.</p>' +
        '<p>The rationale is the EJB convention Spring inherited: a checked exception is a ' +
        'recoverable business outcome the caller is expected to handle, and an unchecked one is ' +
        'a failure. That rationale does not survive contact with most codebases, where checked ' +
        'exceptions are used for failures all the time.</p>' +
        '<p><strong>The fixes:</strong> ' +
        '<code>@Transactional(rollbackFor = Exception.class)</code> on the method, or — better ' +
        '— throw unchecked exceptions for failures, which is the prevailing convention in Spring ' +
        'code anyway. <code>noRollbackFor</code> is the inverse for the rare unchecked exception ' +
        'that should not roll back.</p>' +
        '<p><strong>The second trap is catching the exception.</strong> Once a rollback is ' +
        'triggered the transaction is marked rollback-only, and catching the exception does not ' +
        'undo that. The method returns normally, the proxy tries to commit, and Spring throws ' +
        '<code>UnexpectedRollbackException: Transaction silently rolled back because it has been ' +
        'marked as rollback-only</code>. The usual cause is an inner ' +
        '<code>@Transactional</code> method failing and the caller swallowing it — the inner ' +
        'method joined the same transaction and marked it doomed. <code>REQUIRES_NEW</code> on ' +
        'the inner method is the fix when the inner failure genuinely should be recoverable.</p>',
    referenceLinks: [
        { title: 'Rolling Back a Declarative Transaction — Spring Framework Reference', url: 'https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/rolling-back.html' }
    ],
    tags: ['transactions', 'rollback', 'spring', 'exceptions'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'transactional-not-working',
    importance: 'must-know',
    subsection: null,
    question: '@Transactional appears to do nothing. What are the possible causes?',
    answer:
        '<p>Six, and they share a property: <strong>none of them produces an error.</strong> ' +
        'Work through them in order.</p>' +
        '<ul>' +
        '<li><strong>Self-invocation.</strong> The call came from another method of the same ' +
        'class, so it never crossed the proxy. By far the most common cause.</li>' +
        '<li><strong>The method is not <code>public</code>.</strong> A CGLIB proxy can only ' +
        'override what a subclass can see, so <code>private</code>, package-private and ' +
        '<code>protected</code> methods are not advised in proxy mode.</li>' +
        '<li><strong>The method or the class is <code>final</code>.</strong> Nothing to ' +
        'override.</li>' +
        '<li><strong>The object was not created by Spring.</strong> A <code>new</code>ed ' +
        'instance has no proxy around it.</li>' +
        '<li><strong>A checked exception was thrown.</strong> The transaction committed, ' +
        'exactly as configured.</li>' +
        '<li><strong>The exception was caught inside the method.</strong> No exception escapes, ' +
        'so nothing triggers a rollback.</li>' +
        '</ul>' +
        '<p>Two more that are less common and worth having: the engine does not support ' +
        'transactions for that table — MyISAM in MySQL accepts the statements and ignores the ' +
        'transaction entirely — and the operation was a DDL statement, which auto-commits in ' +
        'most engines.</p>' +
        '<p><strong>How to find out rather than guess:</strong> set ' +
        '<code>logging.level.org.springframework.transaction.interceptor=TRACE</code>. Spring ' +
        'then logs every transaction it creates, joins, commits and rolls back, with the method ' +
        'name. If your method does not appear, no transaction was ever opened for it — which ' +
        'turns a guessing game into a two-minute check.</p>',
    referenceLinks: [
        { title: 'Declarative Transaction Management — Spring Framework Reference', url: 'https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/annotations.html' }
    ],
    tags: ['transactions', 'spring', 'proxies', 'debugging'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'readonly-transactions',
    importance: 'should-know',
    subsection: null,
    question: 'What does @Transactional(readOnly = true) actually do?',
    answer:
        '<p>More than it looks like, and it is worth using on every read path.</p>' +
        '<ul>' +
        '<li><strong>Hibernate skips dirty checking.</strong> The flush mode becomes MANUAL, so ' +
        'no snapshots are taken at load and no comparison happens at flush. On a query returning ' +
        'thousands of entities that is a real saving in both memory and time.</li>' +
        '<li><strong>It prevents accidental writes.</strong> A modification to a managed entity ' +
        'is simply not written, which turns a silent data change into a no-op.</li>' +
        '<li><strong>It is a hint to the driver and the database.</strong> PostgreSQL sets the ' +
        'transaction read-only, which lets it reject writes outright and enables some ' +
        'optimisations.</li>' +
        '<li><strong>It can route to a replica.</strong> With a routing datasource, ' +
        '<code>readOnly</code> is the natural signal for sending the query to a read replica ' +
        'rather than the primary — which is how read scaling is usually plumbed.</li>' +
        '</ul>' +
        '<p><strong>What it does not do:</strong> it does not make the method faster by ' +
        'skipping the transaction, and it does not remove the need for one. A read still needs a ' +
        'connection, and a read that touches lazy associations still needs an open persistence ' +
        'context.</p>' +
        '<p>Two cautions. It is <strong>not enforced by Spring itself</strong> for plain JDBC — ' +
        'whether a write is rejected depends on the database honouring the flag. And ' +
        '<strong>replica routing introduces replication lag</strong>: a read immediately after a ' +
        'write may not see it, so the read-your-own-writes cases have to be routed to the ' +
        'primary deliberately.</p>' +
        '<p>The habit worth building: <code>readOnly = true</code> on every query method by ' +
        'default, and a plain <code>@Transactional</code> only where something is written.</p>',
    referenceLinks: [
        { title: 'Using @Transactional', url: 'https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/annotations.html' }
    ],
    tags: ['transactions', 'readonly', 'performance', 'replicas'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'transaction-boundaries',
    importance: 'must-know',
    subsection: null,
    question: 'Where should the transaction boundary be, and what must never be inside it?',
    answer:
        '<p><strong>At the service layer</strong>, around one business operation. Not on the ' +
        'controller, which would keep the transaction open while the response is serialised; ' +
        'not on the repository, which would make every statement its own transaction and make ' +
        'atomicity across two writes impossible.</p>' +
        '<p><strong>What must never be inside a transaction:</strong></p>' +
        '<ul>' +
        '<li><strong>A remote call.</strong> An HTTP request to another service, inside a ' +
        'transaction, holds a database connection for the duration of that call — including ' +
        'when the other service is slow. A dependency degrading from 50ms to 5s then exhausts ' +
        'the connection pool, and the database becomes the visible symptom of someone else\'s ' +
        'problem. This is one of the most common causes of a cascading outage.</li>' +
        '<li><strong>Waiting for anything.</strong> A lock, a queue, a file upload, a user.</li>' +
        '<li><strong>Sending a message or an email.</strong> Not because it is slow, but because ' +
        'it cannot be rolled back. If the transaction fails afterwards, the message has gone and ' +
        'describes something that never happened. Use ' +
        '<code>@TransactionalEventListener(phase = AFTER_COMMIT)</code>, or the transactional ' +
        'outbox pattern when the message must not be lost either.</li>' +
        '<li><strong>Long computation.</strong> Do it before or after; the connection is the ' +
        'scarce resource.</li>' +
        '</ul>' +
        '<p>The general rule: <strong>a transaction should be short and should touch only the ' +
        'database.</strong> Every millisecond it is open is a millisecond a pooled connection is ' +
        'unavailable and a row lock is held, and the pool is almost always smaller than the ' +
        'thread count.</p>',
    referenceLinks: [
        { title: 'Transaction Management — Spring Framework Reference', url: 'https://docs.spring.io/spring-framework/reference/data-access/transaction.html' }
    ],
    tags: ['transactions', 'design', 'connection-pool', 'resilience'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'deadlocks-in-the-database',
    importance: 'should-know',
    subsection: null,
    question: 'What causes a database deadlock, and how do you fix it?',
    answer:
        '<p>Two transactions hold locks the other needs. Transaction A locks row 1 and wants row ' +
        '2; transaction B locks row 2 and wants row 1. Neither can proceed.</p>' +
        '<p>Databases detect this rather than hanging: one transaction is chosen as the victim, ' +
        'aborted with a deadlock error, and the other continues. So a deadlock is not a hang — ' +
        'it is an error that one caller receives.</p>' +
        '<p><strong>The fixes, in order:</strong></p>' +
        '<ul>' +
        '<li><strong>Consistent lock ordering.</strong> If every transaction touches rows in the ' +
        'same order — sorted by primary key — a cycle cannot form. This is the structural fix ' +
        'and it applies equally to the two-account transfer in Java.</li>' +
        '<li><strong>Shorter transactions</strong>, holding fewer locks for less time.</li>' +
        '<li><strong>Retry.</strong> A deadlock victim can usually just try again, and the ' +
        'second attempt normally succeeds because the timing has changed. This is legitimate and ' +
        'expected — but only for an idempotent operation, and with back-off.</li>' +
        '<li><strong>Lower the lock footprint.</strong> An index that lets a statement lock ten ' +
        'rows instead of scanning and locking ten thousand removes the contention entirely. This ' +
        'is why deadlocks are often really a missing-index problem.</li>' +
        '</ul>' +
        '<p>Two engine-specific facts worth having. <strong>MySQL InnoDB takes gap locks at ' +
        'REPEATABLE READ</strong>, so a range query can lock rows that do not exist yet and ' +
        'produce deadlocks between statements that appear to touch different rows. And ' +
        '<strong>PostgreSQL at SERIALIZABLE aborts transactions with serialisation failures</strong> ' +
        'rather than deadlocks — a different error code and the same required response, which is ' +
        'to retry.</p>' +
        '<p>To diagnose: <code>SHOW ENGINE INNODB STATUS</code> on MySQL prints the last ' +
        'deadlock in full, and PostgreSQL logs both statements involved.</p>',
    referenceLinks: [
        { title: 'PostgreSQL — Explicit Locking', url: 'https://www.postgresql.org/docs/current/explicit-locking.html' }
    ],
    tags: ['transactions', 'deadlock', 'locking', 'databases'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'optimistic-locking-details',
    importance: 'should-know',
    subsection: null,
    question: 'How does @Version work, and what does it not protect?',
    answer:
        '<p>A numeric or timestamp column that Hibernate reads with the entity and includes in ' +
        'the <code>WHERE</code> clause of every update, incrementing it in the ' +
        '<code>SET</code>. If the row has changed since it was read, zero rows match, and ' +
        'Hibernate throws <code>OptimisticLockException</code> — wrapped by Spring as ' +
        '<code>ObjectOptimisticLockingFailureException</code>.</p>' +
        '<p>It is nearly free: no locks, no extra queries, one small column.</p>' +
        '<p><strong>What it does not protect:</strong></p>' +
        '<ul>' +
        '<li><strong>Bulk updates.</strong> A JPQL or native <code>UPDATE</code> does not ' +
        'increment the version unless it says so explicitly, so those changes are invisible to ' +
        'optimistic locking.</li>' +
        '<li><strong>Changes to child collections.</strong> Adding an item to an order does not ' +
        'by itself change the order\'s version, so two users editing different items of the same ' +
        'order will not conflict. <code>@OptimisticLock</code> and ' +
        '<code>LockModeType.OPTIMISTIC_FORCE_INCREMENT</code> exist to bump the parent ' +
        'deliberately when the aggregate is meant to be versioned as a whole.</li>' +
        '<li><strong>Anything not going through Hibernate</strong> — another service, a script, ' +
        'a migration.</li>' +
        '<li><strong>Reads.</strong> Optimistic locking detects conflicting <em>writes</em>. Two ' +
        'transactions reading and making a decision without writing are unaffected.</li>' +
        '</ul>' +
        '<p>Two practical notes: <strong>never modify the version field by hand</strong>, ' +
        'including in a DTO round trip where a client sends it back — that is precisely how the ' +
        'check gets bypassed, so validate it rather than trusting it. And the version has to ' +
        'travel to the client and back for the check to be meaningful across a stateless HTTP ' +
        'request, which is exactly what an <code>ETag</code> plus <code>If-Match</code> ' +
        'formalises.</p>',
    referenceLinks: [
        { title: 'Hibernate ORM User Guide — Optimistic Locking', url: 'https://docs.hibernate.org/orm/current/userguide/html_single/#locking-optimistic' }
    ],
    tags: ['transactions', 'optimistic-locking', 'jpa', 'concurrency'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'pessimistic-lock-modes',
    importance: 'should-know',
    subsection: null,
    question: 'What are the pessimistic lock modes, and what are their risks?',
    answer:
        '<ul>' +
        '<li><strong><code>PESSIMISTIC_READ</code></strong> — a shared lock. Others may read, ' +
        'nobody may write. <code>SELECT ... FOR SHARE</code>.</li>' +
        '<li><strong><code>PESSIMISTIC_WRITE</code></strong> — an exclusive lock. ' +
        '<code>SELECT ... FOR UPDATE</code>. The one you usually mean.</li>' +
        '<li><strong><code>PESSIMISTIC_FORCE_INCREMENT</code></strong> — an exclusive lock that ' +
        'also bumps the version, so optimistic checks elsewhere see the change.</li>' +
        '</ul>' +
        '<p>Use it when a collision is <em>likely</em> rather than exceptional, and retrying ' +
        'would be expensive or user-visible: decrementing stock on a popular item, allocating ' +
        'from a limited pool, a counter under real contention.</p>' +
        '<p><strong>The risks:</strong></p>' +
        '<ul>' +
        '<li><strong>Lock waits.</strong> Other transactions block, and the wait counts against ' +
        'their timeouts. A slow transaction holding a hot row makes everything queue behind ' +
        'it.</li>' +
        '<li><strong>Deadlocks</strong>, if two transactions take locks in different orders.</li>' +
        '<li><strong>Connection pool pressure</strong>, because blocked transactions hold their ' +
        'connections while they wait.</li>' +
        '<li><strong>Lock escalation and gap locks</strong>, engine-dependent, which can lock ' +
        'far more than the row you asked for — especially when the predicate is not covered by ' +
        'an index.</li>' +
        '</ul>' +
        '<p><strong>Always set a timeout.</strong> ' +
        '<code>@QueryHints(@QueryHint(name = "jakarta.persistence.lock.timeout", value = "3000"))</code>, ' +
        'or <code>NOWAIT</code> / <code>SKIP LOCKED</code> at the SQL level. Without one, a ' +
        'blocked request waits as long as the database will let it, which is usually far longer ' +
        'than the caller is prepared to.</p>' +
        '<p><code>SKIP LOCKED</code> deserves a mention of its own: it is how you build a work ' +
        'queue in a relational database, letting several workers each grab different unlocked ' +
        'rows without contending.</p>',
    referenceLinks: [
        { title: 'Hibernate ORM User Guide — Pessimistic Locking', url: 'https://docs.hibernate.org/orm/current/userguide/html_single/#locking-pessimistic' }
    ],
    tags: ['transactions', 'pessimistic-locking', 'jpa', 'concurrency'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'transaction-and-async',
    importance: 'should-know',
    subsection: null,
    question: 'What happens to a transaction when you call an @Async method?',
    answer:
        '<p>It does not travel. Spring binds the transaction to the <strong>current ' +
        'thread</strong>, in a <code>ThreadLocal</code> held by ' +
        '<code>TransactionSynchronizationManager</code>. An <code>@Async</code> method runs on a ' +
        'different thread, so it starts with no transaction at all — and if it is itself ' +
        '<code>@Transactional</code>, it opens a completely independent one.</p>' +
        '<p>The consequences to be ready for:</p>' +
        '<ul>' +
        '<li><strong>The async work may read stale data.</strong> If the caller has not ' +
        'committed yet, the async thread queries the database and does not see the caller\'s ' +
        'uncommitted rows. The classic symptom is an async job that cannot find the entity that ' +
        'was "just created".</li>' +
        '<li><strong>An entity passed to the async method is detached</strong> as soon as the ' +
        'caller\'s context closes, so touching a lazy association there throws. Pass the id and ' +
        're-read.</li>' +
        '<li><strong>The caller\'s rollback does not roll back the async work</strong>, and vice ' +
        'versa. They are unrelated transactions.</li>' +
        '</ul>' +
        '<p><strong>The fix for the stale-read case is ' +
        '<code>@TransactionalEventListener(phase = AFTER_COMMIT)</code></strong>, which defers ' +
        'the work until the transaction has actually committed. Combine it with ' +
        '<code>@Async</code> to get both — commit first, then run off the request thread.</p>' +
        '<p>The same applies to every <code>ThreadLocal</code>-based context: the security ' +
        'context, MDC correlation ids and request-scoped beans all fail to cross to the async ' +
        'thread unless propagated deliberately. Spring provides delegating executors for the ' +
        'security context and Micrometer provides context propagation for the rest.</p>',
    referenceLinks: [
        { title: 'Task Execution and Scheduling', url: 'https://docs.spring.io/spring-framework/reference/integration/scheduling.html' }
    ],
    tags: ['transactions', 'async', 'spring', 'threading'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'connection-pool-and-transactions',
    importance: 'must-know',
    subsection: null,
    question: 'How do transactions interact with the connection pool, and how does the pool get exhausted?',
    answer:
        '<p>A transaction holds one connection from the moment it starts until it commits or ' +
        'rolls back. The pool — HikariCP by default in Spring Boot — hands them out and blocks ' +
        'when it has none left, until <code>connectionTimeout</code> expires and it throws.</p>' +
        '<p>So <strong>the pool size is the real concurrency limit for anything that touches the ' +
        'database</strong>, regardless of how many threads exist. Two hundred request threads in ' +
        'front of a ten-connection pool means a hundred and ninety threads queueing.</p>' +
        '<p><strong>The ways a pool gets exhausted:</strong></p>' +
        '<ul>' +
        '<li><strong>A remote call inside a transaction.</strong> The connection is held for the ' +
        'duration of somebody else\'s latency.</li>' +
        '<li><strong><code>REQUIRES_NEW</code> nesting</strong>, which holds two connections at ' +
        'once — and in a loop, more.</li>' +
        '<li><strong>Open Session in View</strong>, which holds a connection until the response ' +
        'has finished being written to the client.</li>' +
        '<li><strong>A leak.</strong> A connection obtained outside Spring\'s management and not ' +
        'closed. HikariCP\'s <code>leakDetectionThreshold</code> exists precisely to log a stack ' +
        'trace for this.</li>' +
        '<li><strong>Long-running queries</strong> that hold their connection while the database ' +
        'works.</li>' +
        '</ul>' +
        '<p><strong>Bigger is not the fix.</strong> A pool larger than the database can usefully ' +
        'serve makes things worse: more concurrent queries contend for the same CPUs and disks, ' +
        'and every query slows down. HikariCP\'s own guidance is that a small pool — often around ' +
        'ten — outperforms a large one, and the right response to exhaustion is almost always to ' +
        'shorten the transactions rather than to raise the number.</p>' +
        '<p>Instrument it: Hikari exposes active, idle and pending counts through Micrometer, and ' +
        'a rising pending count is the earliest warning of this whole class of problem.</p>',
    referenceLinks: [
        { title: 'HikariCP — About Pool Sizing', url: 'https://github.com/brettwooldridge/HikariCP/wiki/About-Pool-Sizing' }
    ],
    tags: ['transactions', 'connection-pool', 'hikaricp', 'performance'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'programmatic-transactions',
    importance: 'good-to-know',
    subsection: null,
    question: 'When would you use TransactionTemplate instead of @Transactional?',
    answer:
        '<p><code>TransactionTemplate</code> runs a lambda inside a transaction, with the ' +
        'boundary written explicitly in the code rather than declared on a method.</p>' +
        '<p>Reasons to reach for it:</p>' +
        '<ul>' +
        '<li><strong>A boundary narrower than a method.</strong> Do the expensive computation ' +
        'first, then open a short transaction for the writes. The annotation can only wrap the ' +
        'whole method.</li>' +
        '<li><strong>Several transactions in one method</strong> — a loop over a batch where ' +
        'each chunk commits separately, so a failure at chunk fifty does not discard the first ' +
        'forty-nine.</li>' +
        '<li><strong>To sidestep the proxy entirely.</strong> No self-invocation problem, no ' +
        '<code>final</code>-method problem, no "is this bean proxied" question. When ' +
        '<code>@Transactional</code> is not applying and the fix would be a ' +
        '<code>self</code> field, this is the cleaner answer.</li>' +
        '<li><strong>When the transaction settings are dynamic</strong> — isolation or timeout ' +
        'chosen at run time, which an annotation cannot express.</li>' +
        '</ul>' +
        '<p>The costs: it is more code, the transactional intent is less visible at a glance, ' +
        'and it couples the class to Spring\'s transaction API where the annotation is only ' +
        'metadata.</p>' +
        '<p><strong>Default to <code>@Transactional</code>.</strong> It is declarative, it reads ' +
        'well, and it is what a reviewer expects. Reach for the template when the boundary ' +
        'genuinely does not line up with a method, which is the case that the annotation cannot ' +
        'express at all rather than merely expresses awkwardly.</p>',
    referenceLinks: [
        { title: 'Programmatic Transaction Management', url: 'https://docs.spring.io/spring-framework/reference/data-access/transaction/programmatic.html' }
    ],
    tags: ['transactions', 'spring', 'programmatic', 'transactiontemplate'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'distributed-transactions',
    importance: 'should-know',
    subsection: null,
    question: 'How do you make a transaction span two services or two databases?',
    answer:
        '<p>Broadly, you do not — and being able to say why is the point of the question.</p>' +
        '<p><strong>Two-phase commit</strong> is the textbook answer: a coordinator asks every ' +
        'participant to prepare, and commits only if all agree. JTA and XA implement it. The ' +
        'reasons it is rarely used across services:</p>' +
        '<ul>' +
        '<li><strong>It is a blocking protocol.</strong> Participants hold locks through the ' +
        'prepare phase, so the slowest one determines how long everyone waits.</li>' +
        '<li><strong>The coordinator is a single point of failure.</strong> If it dies after ' +
        'prepare, participants sit in doubt holding locks until it recovers.</li>' +
        '<li><strong>It requires every participant to support XA</strong>, which most modern ' +
        'infrastructure — HTTP APIs, Kafka, most managed services — does not.</li>' +
        '<li><strong>It couples availability.</strong> The operation succeeds only if every ' +
        'participant is up, which is the opposite of why the services were separated.</li>' +
        '</ul>' +
        '<p><strong>The alternative is to give up atomicity and design for eventual ' +
        'consistency:</strong></p>' +
        '<ul>' +
        '<li><strong>Sagas.</strong> A sequence of local transactions, each with a compensating ' +
        'action if a later step fails. Orchestrated by a coordinator, or choreographed through ' +
        'events. The hard part is that compensation is not rollback — a refund is not the ' +
        'undoing of a charge, it is a second business fact.</li>' +
        '<li><strong>The transactional outbox.</strong> Write the business change and the ' +
        'message to be sent into the <em>same local transaction</em>, in an outbox table; a ' +
        'separate process publishes from that table. This is the standard solution to "the ' +
        'database committed but the message was lost", and it needs no distributed ' +
        'transaction.</li>' +
        '<li><strong>Idempotency everywhere</strong>, because at-least-once delivery means every ' +
        'consumer will eventually see a duplicate.</li>' +
        '</ul>' +
        '<p>The honest framing: if two things genuinely must be atomic, that is strong evidence ' +
        'they belong in the same service and the same database. A distributed transaction is ' +
        'usually a service boundary drawn in the wrong place.</p>',
    referenceLinks: [
        { title: 'Saga pattern', url: 'https://microservices.io/patterns/data/saga.html' }
    ],
    tags: ['transactions', 'distributed', 'saga', 'outbox', 'microservices'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'testing-transactions',
    importance: 'good-to-know',
    subsection: null,
    question: 'Which transaction behaviours stop being exercised when a test rolls back?',
    answer:
        '<p>Because Spring\'s test support <strong>rolls back at the end of each test by ' +
        'default</strong>, which is excellent for isolation and changes the behaviour of the ' +
        'code under test in three ways.</p>' +
        '<ul>' +
        '<li><strong>Nothing is ever committed</strong>, so anything that only fails at commit — ' +
        'a deferred constraint, a database trigger, an <code>AFTER_COMMIT</code> event listener ' +
        '— never runs. A test can pass on code that always fails in production.</li>' +
        '<li><strong>The whole test shares one persistence context.</strong> Entities stay ' +
        'managed across what would be separate transactions, so lazy loading works in the test ' +
        'and throws in production, and a missing <code>save()</code> passes because dirty ' +
        'checking wrote it anyway.</li>' +
        '<li><strong>Propagation is not exercised.</strong> The code under test joins the ' +
        'test\'s transaction instead of creating its own, so <code>REQUIRES_NEW</code> and ' +
        'rollback rules behave differently from production.</li>' +
        '</ul>' +
        '<p><strong>What to do:</strong> keep transactional rollback for the many tests where ' +
        'isolation is what you want, and write the ones that <em>test transactional ' +
        'behaviour</em> without it — <code>@Commit</code> or no <code>@Transactional</code> at ' +
        'all, with explicit cleanup or a fresh database per test. Testcontainers makes the ' +
        'second option cheap enough to be the default for that category.</p>' +
        '<p><code>TestEntityManager.flush()</code> and <code>clear()</code> are the middle ' +
        'ground: they force the SQL to be issued and detach everything, so the next read comes ' +
        'from the database. Any test asserting on lazy loading, on generated SQL or on ' +
        'constraint behaviour should be doing this.</p>',
    referenceLinks: [
        { title: 'Transaction Management in Tests — Spring Framework Reference', url: 'https://docs.spring.io/spring-framework/reference/testing/testcontext-framework/tx.html' }
    ],
    tags: ['transactions', 'testing', 'spring', 'testcontainers'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
}

    ]
};
