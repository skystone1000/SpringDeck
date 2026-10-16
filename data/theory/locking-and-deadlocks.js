/* ==========================================================================
   data/theory/locking-and-deadlocks.js — module 46 in the reading path

   Eight chapters, and the last one is the lost update because everything
   before it exists to prevent that one failure. It is placed last rather
   than first so the reader arrives at it already knowing both mechanisms
   and can be asked to choose between them.
   ========================================================================== */

const lockingAndDeadlocksModule = {
    id: 'locking-and-deadlocks',
    trackId: 'persistence',
    order: 46,
    title: 'Locking and Deadlocks',
    tagline: 'Optimistic, pessimistic, and how to stop a deadlock recurring.',
    estimatedMinutes: 40,
    prerequisites: ['transactions-and-isolation'],
    docHub: { title: 'PostgreSQL — Explicit Locking', url: 'https://www.postgresql.org/docs/current/explicit-locking.html' },

    chapters: [
        {
            id: 'shared-and-exclusive-locks',
            title: 'Shared and Exclusive',
            importance: 'should-know',
            summary: 'Many readers or one writer. Every lock scheme in a database is an elaboration of that one rule.',
            interviewAngle: 'The foundation. Worth stating in one sentence and then immediately noting that MVCC means ordinary reads take no lock at all, which is why this matters less in PostgreSQL than the terminology suggests.',
            buildsOn: [],
            blocks: [
                {
                    type: 'comparison',
                    title: 'The two modes',
                    left: 'Shared (S)',
                    right: 'Exclusive (X)',
                    rows: [
                        { aspect: 'Taken for', left: 'Reading, when reads lock at all', right: 'Writing' },
                        { aspect: 'Compatible with S', left: '<strong>Yes</strong> — many readers', right: 'No' },
                        { aspect: 'Compatible with X', left: 'No', right: 'No' },
                        { aspect: 'Under MVCC', left: '<strong>Ordinary reads take none</strong>', right: 'Still taken, per row' },
                        { aspect: 'Requested explicitly by', left: '<code>FOR SHARE</code>', right: '<code>FOR UPDATE</code>' }
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>The row that changes the picture is the fourth. Under MVCC a plain <code>SELECT</code> takes no lock — it reads a snapshot — so readers and writers do not contend at all. Shared locks therefore only appear when you ask for them, which you do when you have read a row and intend to act on it and need it not to change underneath you.</p><p>Locks are also held until <strong>the end of the transaction</strong>, never released early. That single fact is why long transactions are a contention problem as well as a vacuum problem, and it is the reason the advice to keep transactions short keeps recurring.</p>'
                }
            ],
            docs: [
                { title: 'PostgreSQL — Explicit Locking', url: 'https://www.postgresql.org/docs/current/explicit-locking.html', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'row-vs-table-locks',
            title: 'Granularity',
            importance: 'should-know',
            summary: 'Row locks let unrelated work proceed. Table locks are cheap to track and stop everything, and DDL takes them whether you asked or not.',
            interviewAngle: 'Comes up in migration discussions more than in pure locking ones. The valuable fact is that an innocent-looking ALTER TABLE takes an exclusive table lock and will queue behind — and then in front of — every other query.',
            buildsOn: ['shared-and-exclusive-locks'],
            blocks: [
                {
                    type: 'types',
                    title: 'Where locks are taken',
                    items: [
                        { name: 'Row locks', html: '<p>Per row, taken by <code>UPDATE</code>, <code>DELETE</code> and <code>SELECT ... FOR UPDATE</code>. Fine-grained, so two transactions touching different rows never meet.</p>' },
                        { name: 'Table locks', html: '<p>Taken by DDL, by <code>LOCK TABLE</code>, and implicitly at a weak level by every statement so that DDL can detect a conflict.</p>' },
                        { name: 'Advisory locks', html: '<p>Application-defined, on an arbitrary number. Useful as a distributed lock — the scheduled-job problem from the async module has a solution here that needs no extra infrastructure.</p>' },
                        { name: 'Predicate locks', html: '<p>Not real locks in PostgreSQL: serializable isolation tracks read dependencies and aborts a transaction rather than blocking it.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A migration\'s <code>ALTER TABLE</code> takes <code>ACCESS EXCLUSIVE</code>, and it queues.</strong> If a long-running query holds a weak lock on the table, the ALTER waits — and every statement arriving after it queues behind the ALTER, because lock requests are ordered. So a one-millisecond schema change behind a five-minute report stalls the entire table for five minutes. Set <code>lock_timeout</code> before any migration so it fails fast instead of forming that queue, and retry it.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>PostgreSQL makes several previously-blocking operations cheap, and knowing which is worth having: adding a nullable column, adding a column with a non-volatile default (11+), and adding a <code>NOT VALID</code> constraint are all metadata-only. Adding an index is not, unless it is <code>CONCURRENTLY</code>. The schema-and-scale module goes through this properly.</p>'
                }
            ],
            docs: [
                { title: 'PostgreSQL — Explicit Locking', url: 'https://www.postgresql.org/docs/current/explicit-locking.html', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'optimistic-locking-with-version',
            title: 'Optimistic Locking',
            importance: 'must-know',
            summary: 'A version column, checked in the WHERE clause of every update. No lock is taken; the conflict is detected at write time and one writer is told to retry.',
            interviewAngle: 'The default answer to concurrent-update questions, and the mechanism is simple enough to write on a whiteboard. The half that distinguishes an answer is what the application does with the failure — a retry, or a message to a human.',
            buildsOn: ['row-vs-table-locks'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'What @Version generates',
                    code: '@Entity\nclass Account {\n    @Id Long id;\n    BigDecimal balance;\n\n    @Version\n    long version;         // Hibernate manages it. Never set it yourself.\n}\n\n// On flush, Hibernate issues:\n//   UPDATE account SET balance = ?, version = 8\n//   WHERE id = ? AND version = 7\n//\n// If that updates 0 rows, somebody else committed first, and\n// Hibernate throws OptimisticLockException -- surfaced by Spring as\n// ObjectOptimisticLockingFailureException.',
                    output: {
                        kind: 'trace',
                        lines: [
                            'No lock is taken at any point. The row is free for other transactions between the read and the write.',
                            'The version predicate in the WHERE clause is the entire mechanism: the update matches only if nothing has changed since the read.',
                            'Hibernate checks the affected-row count, and zero means a conflict rather than a missing row.',
                            'So the cost of a conflict is paid at commit, by whichever transaction is second -- and the cost of no conflict is one extra column and nothing else.'
                        ],
                        explain: '<p>This is the same idea as HTTP\'s <code>If-Match</code> and <code>412 Precondition Failed</code> from the caching chapter, one layer down. Read a version, send it back with the write, and let the server refuse a write based on a stale read. Recognising them as one pattern is worth saying out loud.</p>'
                    }
                },
                {
                    type: 'types',
                    title: 'What to do when it fails',
                    items: [
                        { name: 'Retry the whole unit of work', html: '<p>Re-read, re-apply, re-write. Correct when the operation is a function of current state — decrementing stock, incrementing a counter. Bound the attempts.</p>' },
                        { name: 'Tell the user', html: '<p>Correct when the operation embodies a human decision: "this record was changed while you were editing it". Silently retrying would discard the other person\'s edit, which is the update you were preventing.</p>' },
                        { name: 'Merge', html: '<p>Field-level reconciliation. Genuinely right for collaborative editing and considerably more work than it looks.</p>' },
                        { name: 'Not swallow it', html: '<p>Catching the exception and returning success is the same lost update, now with extra steps.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>The version is only checked on rows Hibernate actually updates.</strong> A bulk <code>UPDATE</code> written in JPQL or SQL bypasses it entirely — no version predicate, no increment — so an entity read before that bulk update carries a version that no longer reflects reality, and its next flush either fails confusingly or overwrites the bulk change. Bulk statements and optimistic locking do not compose, and the fix is to increment the version explicitly in the bulk statement.</p>'
                }
            ],
            docs: [
                { title: 'Hibernate — Optimistic Locking', url: 'https://docs.hibernate.org/orm/current/userguide/html_single/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'transactions', questionId: 'optimistic-locking-details' }
            ]
        },

        {
            id: 'pessimistic-read-and-write',
            title: 'Pessimistic Locking',
            importance: 'should-know',
            summary: 'Take the lock at read time and hold it to commit. Correct where conflicts are frequent enough that retrying is worse than waiting.',
            interviewAngle: 'The comparison with optimistic is the question. The deciding criterion is conflict frequency, and the cost to name is that a pessimistic lock holds a database row — and therefore often a connection — for the duration of the work.',
            buildsOn: ['optimistic-locking-with-version'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'Choosing between them',
                    left: 'Optimistic',
                    right: 'Pessimistic',
                    rows: [
                        { aspect: 'Lock taken', left: '<strong>None</strong>', right: 'At read, held to commit' },
                        { aspect: 'Conflict detected', left: 'At write', right: 'Prevented — the second reader waits' },
                        { aspect: 'Cost when there is no conflict', left: '<strong>Nothing</strong>', right: 'A lock, and contention' },
                        { aspect: 'Cost when there is one', left: 'Redo the work', right: 'Wait' },
                        { aspect: 'Deadlock possible', left: 'No', right: '<strong>Yes</strong>' },
                        { aspect: 'Right when', left: 'Conflicts are rare — <strong>almost always</strong>', right: 'Conflicts are frequent, or the work is expensive to redo' }
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The JPA lock modes worth knowing',
                    code: '// Exclusive: SELECT ... FOR UPDATE. Nobody else may read-for-update\n// or write this row until commit.\n@Lock(LockModeType.PESSIMISTIC_WRITE)\n@Query("select s from Seat s where s.id = :id")\nSeat lockSeat(@Param("id") Long id);\n\n// Shared: SELECT ... FOR SHARE. Others may read it; nobody may write.\n@Lock(LockModeType.PESSIMISTIC_READ)\nOptional<Account> findForReading(Long id);\n\n// Always bound the wait. Without a timeout, a request thread blocks\n// for as long as the other transaction takes -- which may be forever.\n@QueryHints(@QueryHint(name = "jakarta.persistence.lock.timeout", value = "3000"))\n@Lock(LockModeType.PESSIMISTIC_WRITE)\nSeat lockSeatOrGiveUp(Long id);',
                    notes: '<p><code>PESSIMISTIC_FORCE_INCREMENT</code> is the third mode: an exclusive lock that also bumps the version, for when locking a parent must invalidate readers of an aggregate. Rare, and the one people cannot name.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A pessimistic lock holds a row and a connection for the whole transaction, so any slow work inside that transaction is now serialised.</strong> Lock a row, then call a payment provider that takes two seconds, and the throughput of that row is one transaction every two seconds — while a connection sits idle in transaction, which is the MVCC problem from the last module as well. Never hold a database lock across a network call.</p>'
                }
            ],
            docs: [
                { title: 'Jakarta Persistence — LockModeType', url: 'https://jakarta.ee/specifications/persistence/3.1/apidocs/jakarta.persistence/jakarta/persistence/lockmodetype', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'transactions', questionId: 'pessimistic-lock-modes' }
            ]
        },

        {
            id: 'select-for-update',
            title: 'SELECT ... FOR UPDATE',
            importance: 'should-know',
            summary: 'The SQL underneath pessimistic locking, and its two modifiers — NOWAIT and SKIP LOCKED — each solve a real problem.',
            interviewAngle: 'SKIP LOCKED is the good answer to "how would you build a job queue on a database", and it is a genuinely useful thing very few candidates know.',
            buildsOn: ['pessimistic-read-and-write'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'sql',
                    title: 'The three forms',
                    code: '-- Wait for the lock. The default, and it can wait indefinitely.\nSELECT * FROM seat WHERE id = 42 FOR UPDATE;\n\n-- Fail immediately rather than wait. For "somebody else is editing this".\nSELECT * FROM seat WHERE id = 42 FOR UPDATE NOWAIT;\n\n-- Skip rows somebody else has locked. A work queue, in one statement.\nSELECT * FROM job\nWHERE  status = \'PENDING\'\nORDER  BY created_at\nLIMIT  10\nFOR UPDATE SKIP LOCKED;',
                    output: {
                        kind: 'trace',
                        lines: [
                            'Checked against PostgreSQL 16.',
                            'SKIP LOCKED means ten concurrent workers each get ten DIFFERENT jobs, with no coordination, no queue broker and no distributed lock.',
                            'Each worker updates its rows to RUNNING and commits, releasing the locks; a crashed worker rolls back and its jobs return to PENDING automatically.',
                            'Without SKIP LOCKED the same query serialises every worker behind the first one, which is the naive database-queue implementation and the reason people believe databases make bad queues.'
                        ],
                        explain: '<p>This is worth having ready as a design answer. A database-backed queue with <code>SKIP LOCKED</code> is transactional with the rest of your work — the job and the data it produces commit together, which a separate broker cannot offer without an outbox — and it needs no new infrastructure. It stops being the right answer at high throughput or when consumers are in other services.</p>'
                    }
                },
                {
                    type: 'tip',
                    html: '<p><code>NOWAIT</code> maps to <code>PESSIMISTIC_WRITE</code> with a zero timeout in JPA, and <code>SKIP LOCKED</code> has no JPA equivalent at all — it needs a native query. That is a reasonable answer to "when would you drop out of JPA to native SQL", and a more specific one than most candidates give.</p>'
                }
            ],
            docs: [
                { title: 'PostgreSQL — The Locking Clause', url: 'https://www.postgresql.org/docs/current/sql-select.html', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'deadlock-anatomy',
            title: 'Deadlock',
            importance: 'must-know',
            summary: 'Two transactions each holding what the other wants. The database detects it and kills one, so the application must be able to survive being the victim.',
            interviewAngle: 'The four conditions are the textbook answer and the practical half is better: the database resolves it for you, so the questions are which transaction dies, whether you retry, and how to stop it recurring.',
            buildsOn: ['select-for-update'],
            blocks: [
                {
                    type: 'diagram',
                    diagramType: 'sequence',
                    caption: 'Neither can proceed, and neither will give up on its own.',
                    diagramConfig: {
                        title: 'A two-row deadlock',
                        actors: [
                            { id: 't1', label: 'T1' },
                            { id: 'db', label: 'Database' },
                            { id: 't2', label: 'T2' }
                        ],
                        messages: [
                            { from: 't1', to: 'db', label: 'UPDATE account 1 — locks row 1' },
                            { from: 't2', to: 'db', label: 'UPDATE account 2 — locks row 2' },
                            { from: 't1', to: 'db', label: 'UPDATE account 2 — waits for T2' },
                            { from: 't2', to: 'db', label: 'UPDATE account 1 — waits for T1' },
                            { from: 'db', to: 't2', label: 'deadlock detected: T2 aborted', kind: 'return' },
                            { from: 'db', to: 't1', label: 'proceeds and commits', kind: 'return' }
                        ]
                    }
                },
                {
                    type: 'types',
                    title: 'The four conditions, and which one you can actually remove',
                    items: [
                        { name: 'Mutual exclusion', html: '<p>A lock is held by one holder. Not removable — it is what a lock is.</p>' },
                        { name: 'Hold and wait', html: '<p>A transaction holds one lock while requesting another. Removable in principle by taking every lock up front; rarely practical.</p>' },
                        { name: 'No pre-emption', html: '<p>A lock is not taken away. The database breaks this one for you, by aborting a victim.</p>' },
                        { name: 'Circular wait', html: '<p><strong>The one you remove.</strong> Impose a consistent order on lock acquisition and no cycle can form. The next chapter.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>The most common source in a JPA application is not two explicit locks — it is unordered batch flush.</strong> Hibernate flushes dirty entities in an order derived from its internal collections, so two transactions updating overlapping sets of rows can touch them in different orders without a line of code saying so. The stack trace points at <code>flush()</code>, which is not where the decision was made. Sorting the entities before touching them, or sorting the ids in a bulk statement, is what fixes it.</p>'
                }
            ],
            docs: [
                { title: 'PostgreSQL — Deadlocks', url: 'https://www.postgresql.org/docs/current/explicit-locking.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'transactions', questionId: 'deadlocks-in-the-database' }
            ]
        },

        {
            id: 'consistent-lock-ordering',
            title: 'Making It Not Recur',
            importance: 'must-know',
            summary: 'Order the rows before locking them. It is a two-line change and it removes the circular wait entirely rather than reducing its probability.',
            interviewAngle: 'The follow-up, and the answer that shows this has been done for real: a retry makes the symptom rare and ordering makes the deadlock impossible. Both belong, and only one is a fix.',
            buildsOn: ['deadlock-anatomy'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The fix, and the safety net',
                    code: '// The bug: lock order depends on the arguments.\nvoid transfer(long from, long to, BigDecimal amount) {\n    Account a = repo.lockForUpdate(from);      // transfer(1,2) locks 1 then 2\n    Account b = repo.lockForUpdate(to);        // transfer(2,1) locks 2 then 1\n    ...\n}\n\n// The fix: a total order everyone agrees on, derived from the data.\nvoid transfer(long from, long to, BigDecimal amount) {\n    long first  = Math.min(from, to);\n    long second = Math.max(from, to);\n\n    repo.lockForUpdate(first);\n    repo.lockForUpdate(second);       // no cycle can form. Ever.\n    ...\n}\n\n// The safety net, for the deadlocks nobody predicted. It is NOT\n// the fix -- see the AOP module for why the ordering matters.\n@Retryable(retryFor = CannotAcquireLockException.class,\n           maxAttempts = 3, backoff = @Backoff(delay = 50, multiplier = 2))\n@Transactional\nvoid transferWithRetry(long from, long to, BigDecimal amount) { ... }',
                    notes: '<p>The retry aspect must sit <strong>outside</strong> the transaction, so each attempt runs in a fresh one. Inside it, the transaction is already marked rollback-only and the retry accomplishes nothing but delay — the exact ordering trap from the AOP module, arriving where it costs money.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Two more that reduce the exposure: keep transactions short, since a lock is held until commit and a shorter hold is a smaller window; and take the locks in one statement where you can — <code>SELECT ... WHERE id IN (?, ?) ORDER BY id FOR UPDATE</code> acquires them in a defined order inside the database, with no application-side sorting to get wrong.</p>'
                }
            ],
            docs: [
                { title: 'PostgreSQL — Deadlocks', url: 'https://www.postgresql.org/docs/current/explicit-locking.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'transactions', questionId: 'deadlocks-in-the-database' }
            ]
        },

        {
            id: 'lost-update-problem',
            title: 'The Lost Update, and the Three Answers',
            importance: 'must-know',
            summary: 'Two transactions read the same value, both compute from it, both write. One update is gone and nothing failed. Three mechanisms prevent it and they have different costs.',
            interviewAngle: 'The problem this whole module exists for, and the best possible closing answer names all three and picks one with a reason. Most candidates name one.',
            buildsOn: ['consistent-lock-ordering'],
            blocks: [
                {
                    type: 'table',
                    title: 'Three ways to stop it',
                    headers: ['Mechanism', 'How', 'Cost', 'Right when'],
                    rows: [
                        ['<strong>Atomic statement</strong>', '<code>SET amount = amount - 100</code>', 'None', '<strong>The arithmetic can be done in SQL</strong>'],
                        ['<strong>Optimistic</strong>', 'A version column in the WHERE clause', 'A retry on the rare conflict', 'Conflicts are rare, or a human must decide'],
                        ['<strong>Pessimistic</strong>', '<code>SELECT ... FOR UPDATE</code> at read time', 'Contention; deadlock is possible', 'Conflicts are frequent, or redoing is expensive'],
                        ['<code>SERIALIZABLE</code>', 'The database detects and aborts', 'Retries everywhere, for one case', 'A constraint the database cannot otherwise express']
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>The first row is the one most often overlooked, and it is free. <code>UPDATE account SET amount = amount - 100 WHERE id = 1 AND amount >= 100</code> does the arithmetic inside the statement, under the row lock the statement already takes, and the <code>amount >= 100</code> guard makes the business rule atomic with the write. No version column, no explicit lock, no retry — and it returns zero affected rows when the balance was insufficient, which is the check and the update in one.</p><p>It stops being available as soon as the new value depends on something the database does not have: a rate from an external service, a rule expressed in Java, a decision a user made. That is when the other two rows apply.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The closing answer, in order: <em>"First I would ask whether the update can be expressed as a single statement — <code>SET amount = amount - 100</code> is atomic and free. If the new value has to be computed in the application, I would use a version column and retry, because conflicts are usually rare. I would only take a pessimistic lock if conflicts were common enough that retrying cost more than waiting."</em></p>'
                }
            ],
            docs: [
                { title: 'PostgreSQL — Concurrency Control', url: 'https://www.postgresql.org/docs/current/mvcc.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'transactions', questionId: 'lost-update' },
                { topicId: 'transactions', questionId: 'optimistic-locking-details' }
            ]
        }
    ]
};
