/* ==========================================================================
   data/theory/transactions-and-isolation.js — module 45 in the reading path

   Eight chapters. Three of them are one anomaly each, deliberately short:
   the isolation levels are defined BY which anomalies they permit, so each
   anomaly needs a concrete two-transaction scenario a reader can replay in
   their head. A table of levels without those scenarios is memorisable and
   not understandable.
   ========================================================================== */

const transactionsAndIsolationModule = {
    id: 'transactions-and-isolation',
    trackId: 'persistence',
    order: 45,
    title: 'Transactions and Isolation',
    tagline: 'ACID, the four anomalies, and what your database actually defaults to.',
    estimatedMinutes: 45,
    prerequisites: ['relational-foundations'],
    docHub: { title: 'PostgreSQL — Transaction Isolation', url: 'https://www.postgresql.org/docs/current/transaction-iso.html' },

    chapters: [
        {
            id: 'acid',
            title: 'ACID',
            importance: 'must-know',
            summary: 'Four guarantees, and the interesting one is Isolation — the other three are close to absolute and it is a dial.',
            interviewAngle: 'Everyone can expand the acronym. The answer that goes further points out that A, C and D are essentially binary while I is configurable, which is why the whole rest of this module exists.',
            buildsOn: [],
            blocks: [
                {
                    type: 'types',
                    title: 'The four',
                    items: [
                        { name: 'Atomicity', html: '<p>All of the transaction happens, or none of it. Implemented by the undo log or by MVCC row versions — a rollback discards versions nobody committed.</p>' },
                        { name: 'Consistency', html: '<p>The database moves from one valid state to another, where valid means every declared constraint holds. <strong>Note what this does not mean:</strong> it is not a promise about your business rules, only about the constraints you declared. This is the letter people most often overstate.</p>' },
                        { name: 'Isolation', html: '<p>How much of another in-flight transaction this one can see. <strong>The dial.</strong> Four standard levels, and the default is not the strongest.</p>' },
                        { name: 'Durability', html: '<p>A committed transaction survives a crash. Implemented by writing the log to stable storage before acknowledging — which is why <code>fsync</code> behaviour and disk write caches are a durability question and not a performance one.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>The addition that makes the answer sound like experience: <em>"Three of them you get; isolation you choose. And the choice is usually made for you by a default — <code>READ COMMITTED</code> in PostgreSQL and Oracle, <code>REPEATABLE READ</code> in MySQL InnoDB — so the first question about any transactional bug is which level it actually ran at."</em></p>'
                }
            ],
            docs: [
                { title: 'PostgreSQL — Transactions', url: 'https://www.postgresql.org/docs/current/tutorial-transactions.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'transactions', questionId: 'acid' }
            ]
        },

        {
            id: 'the-four-isolation-levels',
            title: 'The Four Levels',
            importance: 'must-know',
            summary: 'Defined by which anomalies they permit, not by how they are implemented. The standard is a floor: an engine may prevent more than the level requires.',
            interviewAngle: 'The table is asked directly. The two facts that lift the answer are that the defaults differ between engines, and that PostgreSQL\'s READ UNCOMMITTED is a synonym for READ COMMITTED — it simply cannot produce a dirty read.',
            buildsOn: ['acid'],
            blocks: [
                {
                    type: 'table',
                    title: 'The levels and the anomalies they allow',
                    headers: ['Level', 'Dirty read', 'Non-repeatable read', 'Phantom read'],
                    rows: [
                        ['<code>READ UNCOMMITTED</code>', '<strong>Allowed</strong>', 'Allowed', 'Allowed'],
                        ['<code>READ COMMITTED</code>', 'Prevented', '<strong>Allowed</strong>', 'Allowed'],
                        ['<code>REPEATABLE READ</code>', 'Prevented', 'Prevented', '<strong>Allowed by the standard</strong>'],
                        ['<code>SERIALIZABLE</code>', 'Prevented', 'Prevented', 'Prevented']
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>The standard defines a <em>minimum</em>, and engines commonly exceed it. In PostgreSQL, <code>READ UNCOMMITTED</code> behaves exactly as <code>READ COMMITTED</code> — MVCC has no mechanism for reading an uncommitted row version, so the level is accepted and does nothing. And PostgreSQL\'s <code>REPEATABLE READ</code> is a snapshot, which prevents phantoms as well, exceeding what the level requires.</p>'
                },
                {
                    type: 'version',
                    title: 'The defaults differ, and it matters',
                    items: [
                        { version: 'PostgreSQL', state: 'is', html: '<p><code>READ COMMITTED</code>. Each statement sees a fresh snapshot, so two identical queries in one transaction can differ.</p>' },
                        { version: 'Oracle', state: 'is', html: '<p><code>READ COMMITTED</code>, and it has no <code>REPEATABLE READ</code> at all — the levels available are read committed and serializable.</p>' },
                        { version: 'MySQL InnoDB', state: 'is', html: '<p><strong><code>REPEATABLE READ</code></strong>, which is a different default from every other mainstream engine, and it prevents most phantoms through next-key locking.</p>' },
                        { version: 'SQL Server', state: 'is', html: '<p><code>READ COMMITTED</code>, using locks rather than MVCC unless <code>READ_COMMITTED_SNAPSHOT</code> is on — so readers can block writers, which surprises people arriving from PostgreSQL.</p>' }
                    ]
                }
            ],
            docs: [
                { title: 'PostgreSQL — Transaction Isolation', url: 'https://www.postgresql.org/docs/current/transaction-iso.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'transactions', questionId: 'isolation-levels-and-anomalies' }
            ]
        },

        {
            id: 'dirty-read',
            title: 'Dirty Read',
            importance: 'should-know',
            summary: 'Reading a row another transaction has written and not committed. The value may never have existed as far as the database is concerned.',
            interviewAngle: 'The easiest of the three to describe and the least likely to be met in practice, since no mainstream default permits it. Say that last part — knowing which anomalies are theoretical is part of knowing them.',
            buildsOn: ['the-four-isolation-levels'],
            blocks: [
                {
                    type: 'diagram',
                    diagramType: 'sequence',
                    caption: 'T2 reads a value that is about to stop having existed.',
                    diagramConfig: {
                        title: 'A dirty read',
                        actors: [
                            { id: 't1', label: 'T1' },
                            { id: 'db', label: 'Database' },
                            { id: 't2', label: 'T2' }
                        ],
                        messages: [
                            { from: 't1', to: 'db', label: 'UPDATE balance SET amount = 900' },
                            { from: 't2', to: 'db', label: 'SELECT amount' },
                            { from: 'db', to: 't2', label: '900 — uncommitted', kind: 'return' },
                            { from: 't1', to: 'db', label: 'ROLLBACK' },
                            { from: 'db', to: 't1', label: 'amount is 1000 again', kind: 'return' }
                        ]
                    }
                },
                {
                    type: 'prose',
                    html: '<p>T2 acted on 900, and 900 is a value the database will never acknowledge having held. Any decision made on it — an approval, an email, a downstream call — is based on something that did not happen.</p><p>No mainstream engine permits this by default, and PostgreSQL cannot produce it at any level. It is worth knowing chiefly as the thing <code>READ COMMITTED</code> is named for: the level says exactly what it prevents.</p>'
                }
            ],
            docs: [
                { title: 'PostgreSQL — Read Committed', url: 'https://www.postgresql.org/docs/current/transaction-iso.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'transactions', questionId: 'isolation-levels-and-anomalies' }
            ]
        },

        {
            id: 'non-repeatable-read',
            title: 'Non-Repeatable Read',
            importance: 'must-know',
            summary: 'The same row, read twice in one transaction, comes back different — because somebody else committed in between. This one you will actually meet.',
            interviewAngle: 'The anomaly that is permitted by the default level in most engines, so it is the one worth understanding properly. Its practical form is the lost update, which is the next module.',
            buildsOn: ['the-four-isolation-levels'],
            blocks: [
                {
                    type: 'diagram',
                    diagramType: 'sequence',
                    caption: 'Both reads are of committed data, and they disagree.',
                    diagramConfig: {
                        title: 'A non-repeatable read',
                        actors: [
                            { id: 't1', label: 'T1' },
                            { id: 'db', label: 'Database' },
                            { id: 't2', label: 'T2' }
                        ],
                        messages: [
                            { from: 't1', to: 'db', label: 'SELECT amount FROM balance' },
                            { from: 'db', to: 't1', label: '1000', kind: 'return' },
                            { from: 't2', to: 'db', label: 'UPDATE amount = 900; COMMIT' },
                            { from: 't1', to: 'db', label: 'SELECT amount — the same row' },
                            { from: 'db', to: 't1', label: '900. Same transaction, different answer', kind: 'return' }
                        ]
                    }
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Under <code>READ COMMITTED</code>, every statement gets a new snapshot, so a report that runs several queries can be internally inconsistent.</strong> Query the order count, then the order total, and the two can be computed against different states of the table — the totals will not reconcile against the counts, and re-running it produces yet another pair. If a unit of work must be internally consistent, it needs <code>REPEATABLE READ</code>, which takes one snapshot for the whole transaction.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The practical form of this anomaly is the <strong>lost update</strong>: read a balance, compute a new one in the application, write it back — while somebody else did the same. Both reads saw 1000, both write 900, and one of the two withdrawals has vanished. The next module is about the two ways to prevent it.</p>'
                }
            ],
            docs: [
                { title: 'PostgreSQL — Read Committed', url: 'https://www.postgresql.org/docs/current/transaction-iso.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'transactions', questionId: 'lost-update' }
            ]
        },

        {
            id: 'phantom-read',
            title: 'Phantom Read',
            importance: 'should-know',
            summary: 'The same query, run twice, returns a different set of rows — because somebody inserted one that matches. It is about a range rather than a row.',
            interviewAngle: 'The distinction from a non-repeatable read is the whole question: one is a changed row, the other is a new row appearing in a result set. Getting that right is a small, reliable discriminator.',
            buildsOn: ['non-repeatable-read'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'The two that get confused',
                    left: 'Non-repeatable read',
                    right: 'Phantom read',
                    rows: [
                        { aspect: 'What changed', left: 'An existing row\'s <strong>value</strong>', right: 'The <strong>set</strong> of matching rows' },
                        { aspect: 'Caused by', left: 'An <code>UPDATE</code> or <code>DELETE</code>', right: 'An <code>INSERT</code> — or an update into the range' },
                        { aspect: 'Scope', left: 'One row', right: 'A predicate' },
                        { aspect: 'Prevented by', left: '<code>REPEATABLE READ</code>', right: '<code>SERIALIZABLE</code>, per the standard' },
                        { aspect: 'A row lock helps', left: '<strong>Yes</strong>', right: '<strong>No</strong> — the row does not exist yet to be locked' }
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>The last row is the reason phantoms need a stronger level. You can lock rows you have read; you cannot lock a row nobody has inserted. Preventing a phantom means locking the <em>predicate</em> — a range, a gap in an index — which is what MySQL\'s next-key locks do and what PostgreSQL\'s serializable snapshot isolation achieves differently, by detecting the conflict and aborting one transaction.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Note the engine difference if it comes up: PostgreSQL\'s <code>REPEATABLE READ</code> is snapshot-based and therefore does not show phantoms either, even though the standard permits them at that level. MySQL InnoDB blocks them at <code>REPEATABLE READ</code> too, by locking gaps. Two engines, two mechanisms, and both exceed what the level requires — which is why the standard is a floor rather than a description.</p>'
                }
            ],
            docs: [
                { title: 'PostgreSQL — Repeatable Read', url: 'https://www.postgresql.org/docs/current/transaction-iso.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'transactions', questionId: 'isolation-levels-and-anomalies' }
            ]
        },

        {
            id: 'mvcc-in-outline',
            title: 'MVCC',
            importance: 'must-know',
            summary: 'Every write creates a new row version rather than overwriting. Readers see the version that was current when their snapshot was taken, so readers never block writers.',
            interviewAngle: 'The implementation question, and the sentence worth being able to say is "readers do not block writers and writers do not block readers" — which is the property MVCC exists to provide and the reason it replaced read locks.',
            buildsOn: ['phantom-read'],
            blocks: [
                {
                    type: 'definition',
                    term: 'MVCC',
                    important: true,
                    html: '<p>Multi-Version Concurrency Control. An update writes a <strong>new version</strong> of the row and marks the old one as ending at this transaction; a delete only marks. Each transaction reads through a <em>snapshot</em> that selects the version visible to it, so a reader never waits for a writer and a writer never waits for a reader.</p>'
                },
                {
                    type: 'types',
                    title: 'What follows from it',
                    items: [
                        { name: 'Reads never block', html: '<p>The main benefit, and it removes the largest source of contention in a lock-based engine.</p>' },
                        { name: 'Two writers to one row still conflict', html: '<p>MVCC does not remove write conflicts. The second writer waits for the first to commit or roll back.</p>' },
                        { name: 'Dead versions accumulate', html: '<p>Old versions are not reclaimed at commit. <strong><code>VACUUM</code> is what reclaims them</strong>, and a table where autovacuum cannot keep up bloats — the tables grow, the indexes grow, and everything gets slower.</p>' },
                        { name: 'A long transaction holds versions alive', html: '<p>Nothing can be vacuumed that an open snapshot might still need. <strong>One forgotten idle-in-transaction session can bloat the whole database</strong>, which is the operational failure people meet.</p>' },
                        { name: 'Transaction ids can wrap', html: '<p>PostgreSQL\'s ids are 32-bit and vacuum freezes old rows to prevent wraparound. An unvacuumed cluster eventually refuses writes to protect itself.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A connection left <code>idle in transaction</code> is the most damaging thing a JDBC application can do to PostgreSQL.</strong> It holds a snapshot, so vacuum cannot reclaim any version newer than it anywhere in the database — and the usual cause is a code path that begins a transaction and returns without committing or rolling back, or an application-side pause inside a transaction while it calls an HTTP service. <code>idle_in_transaction_session_timeout</code> is the safety net; keeping transactions short and free of network calls is the fix.</p>'
                }
            ],
            docs: [
                { title: 'PostgreSQL — Concurrency Control', url: 'https://www.postgresql.org/docs/current/mvcc.html', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'what-read-committed-actually-gives-you',
            title: 'What READ COMMITTED Actually Gives You',
            importance: 'must-know',
            summary: 'A guarantee per statement, not per transaction. Every statement sees a fresh snapshot, so nothing in a multi-statement transaction is stable.',
            interviewAngle: 'The most practically important chapter here, because this is the level almost everything runs at. Knowing that the snapshot is per statement explains lost updates, inconsistent reports and read-modify-write races in one sentence.',
            buildsOn: ['mvcc-in-outline'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'sql',
                    title: 'What is and is not guaranteed',
                    code: 'BEGIN;   -- READ COMMITTED, the default\n\nSELECT SUM(amount) FROM orders WHERE status = \'PAID\';   -- snapshot 1\n\n-- Another transaction commits a new paid order here.\n\nSELECT COUNT(*)   FROM orders WHERE status = \'PAID\';    -- snapshot 2\n\nCOMMIT;\n-- The sum and the count are computed over DIFFERENT states of the\n-- table. They will not reconcile, and re-running gives a third answer.\n\n\n-- The read-modify-write race, in the same level:\nSELECT amount FROM balance WHERE id = 1;    -- 1000, in both sessions\n-- ... application computes 1000 - 100 ...\nUPDATE balance SET amount = 900 WHERE id = 1;\n-- Two sessions do this concurrently. Both write 900.\n-- One withdrawal is gone, and nothing failed.',
                    output: {
                        kind: 'trace',
                        lines: [
                            'Checked against PostgreSQL 16.',
                            'Under READ COMMITTED each statement takes its own snapshot, so consecutive statements in one transaction can see different committed states.',
                            'The UPDATE is different again: it takes a row lock, and if the row changed since the statement began, PostgreSQL RE-READS the new version and re-evaluates the WHERE clause against it.',
                            'That re-read is why UPDATE balance SET amount = amount - 100 is safe under READ COMMITTED and the read-then-write pair above is not -- the arithmetic happens inside the statement, on the version the lock protects.'
                        ],
                        explain: '<p>The distinction in the last two lines is the practical takeaway. Anything computed <em>in the database</em>, in one statement, is protected by the row lock that statement takes. Anything computed <em>in the application</em> between a read and a write is not, and needs either optimistic locking with a version column or <code>SELECT ... FOR UPDATE</code> — both in the next module.</p>'
                    }
                }
            ],
            docs: [
                { title: 'PostgreSQL — Read Committed Isolation Level', url: 'https://www.postgresql.org/docs/current/transaction-iso.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'transactions', questionId: 'lost-update' }
            ]
        },

        {
            id: 'choosing-an-isolation-level',
            title: 'Choosing One',
            importance: 'should-know',
            summary: 'Stay on the default and fix the specific unit of work that needs more. Raising the level globally moves a rare correctness problem into a frequent retry problem.',
            interviewAngle: 'A judgement question. The strongest answer is that SERIALIZABLE is genuinely correct and requires the application to handle serialization failures by retrying — which most applications do not, so turning it on globally converts silent corruption into visible errors nobody catches.',
            buildsOn: ['what-read-committed-actually-gives-you'],
            blocks: [
                {
                    type: 'table',
                    title: 'What to do about a given need',
                    headers: ['The need', 'The answer', 'Note'],
                    rows: [
                        ['An ordinary CRUD write', '<code>READ COMMITTED</code>', 'The default. Do not change it'],
                        ['Read-modify-write on one row', 'A version column, or <code>FOR UPDATE</code>', '<strong>Not a level change</strong> — the next module'],
                        ['A report that must reconcile', '<code>REPEATABLE READ</code>', 'One snapshot for the whole transaction'],
                        ['A constraint across rows the database cannot express', '<code>SERIALIZABLE</code>', '<strong>Must retry</strong> on serialization failure'],
                        ['Everything, to be safe', '<strong>No</strong>', 'Contention and retries, everywhere, for a rare case']
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Raising the level for one unit of work',
                    code: '@Transactional(isolation = Isolation.REPEATABLE_READ)\nMonthlyReport build(YearMonth month) {\n    // Every query in here sees one consistent snapshot.\n}\n\n@Transactional(isolation = Isolation.SERIALIZABLE)\n@Retryable(retryFor = CannotAcquireLockException.class, maxAttempts = 3)\nvoid bookLastSeat(long showingId, long userId) {\n    // SERIALIZABLE can abort with a serialization failure at COMMIT.\n    // Without the retry, the correctness guarantee just becomes a 500.\n}',
                    notes: '<p>The retry is not optional. PostgreSQL\'s serializable isolation detects a dangerous pattern and aborts one transaction with SQLSTATE <code>40001</code>; the contract is that the application retries. Note the ordering requirement from the AOP module: the retry aspect must sit <em>outside</em> the transaction, so each attempt gets a fresh one.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The complete answer: <em>"Leave the default and raise it for the specific unit of work that needs it. Most of what people reach for <code>SERIALIZABLE</code> to fix — a lost update on one row — is better solved with a version column, which costs one retry on the rare conflict rather than making every transaction abortable."</em></p>'
                }
            ],
            docs: [
                { title: 'PostgreSQL — Serializable Isolation Level', url: 'https://www.postgresql.org/docs/current/transaction-iso.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'transactions', questionId: 'isolation-levels-and-anomalies' }
            ]
        }
    ]
};
