/* ==========================================================================
   data/theory/relational-foundations.js — module 42 in the reading path

   Seven chapters, no prerequisites, and the first module of the persistence
   track. It is about the schema rather than about JPA on purpose: an ORM
   mapped onto a badly modelled schema produces problems that look like ORM
   problems and are not.
   ========================================================================== */

const relationalFoundationsModule = {
    id: 'relational-foundations',
    trackId: 'persistence',
    order: 42,
    title: 'Relational Modelling',
    tagline: 'Keys, normalisation, and when to stop normalising.',
    estimatedMinutes: 35,
    prerequisites: [],
    docHub: { title: 'PostgreSQL — Data Definition', url: 'https://www.postgresql.org/docs/current/ddl.html' },

    chapters: [
        {
            id: 'tables-keys-constraints',
            title: 'Constraints Are the Cheapest Correctness You Will Ever Buy',
            importance: 'must-know',
            summary: 'A constraint is enforced against every writer, forever, including the migration script somebody runs by hand at midnight. Application validation is enforced against the writers that go through the application.',
            interviewAngle: 'Comes up as "should validation live in the database or the application". The answer is both, and the reason is that they defend against different things — one against bad input, the other against every other way a row can arrive.',
            buildsOn: [],
            blocks: [
                {
                    type: 'types',
                    title: 'The constraints, and what each one is actually for',
                    items: [
                        { name: 'PRIMARY KEY', html: '<p>Unique and not null, and the row\'s identity. In most engines it also determines physical organisation — in MySQL InnoDB the table <em>is</em> the primary key index, which is why the key\'s width matters more there.</p>' },
                        { name: 'FOREIGN KEY', html: '<p>A referenced row must exist. This is the one most often dropped "for performance" and the one whose absence produces orphan rows nobody can explain a year later.</p>' },
                        { name: 'UNIQUE', html: '<p>The only way to actually prevent duplicates. An application check is a read followed by a write, and two concurrent requests both pass it — see the validation module.</p>' },
                        { name: 'NOT NULL', html: '<p>Free, and it removes a whole class of three-valued-logic bugs downstream.</p>' },
                        { name: 'CHECK', html: '<p>A row-level invariant: a non-negative amount, a status from a fixed set, an end date after a start date. Cheap and underused.</p>' },
                        { name: 'DEFAULT', html: '<p>A value for writers that do not supply one, including the ones you did not write.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>An application-level uniqueness check is a race, not a constraint.</strong> "Select where email = ?, and if nothing comes back, insert" is check-then-act: two requests can both find nothing and both insert. The unique index is what actually prevents it, and the application\'s job is to catch the violation and turn it into a 409. Any codebase where the index was dropped because "we check it in code" has duplicates in that table already.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The framing worth using: <em>"Application validation is for good error messages. Database constraints are for correctness. The application is one writer among several — there is also the migration script, the support engineer with a psql session, and the batch job — and only the database sees all of them."</em></p>'
                }
            ],
            docs: [
                { title: 'PostgreSQL — Constraints', url: 'https://www.postgresql.org/docs/current/ddl-constraints.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'sql-databases', questionId: 'constraints-in-the-database' }
            ]
        },

        {
            id: 'normal-forms-in-practice',
            title: 'The Normal Forms You Actually Use',
            importance: 'must-know',
            summary: 'Third normal form, stated once in plain language, is the whole of what an interview asks. Everything above it is rarely reached by accident.',
            interviewAngle: 'Asked as "explain normalisation" and answered badly by most candidates, who recite definitions. The version that lands is the one-sentence summary plus an example of the anomaly each form prevents.',
            buildsOn: ['tables-keys-constraints'],
            blocks: [
                {
                    type: 'types',
                    title: 'The first three, and the anomaly each one removes',
                    items: [
                        { name: '1NF — atomic values', html: '<p>No repeating groups, no comma-separated lists in a column. The anomaly: you cannot query, index or constrain the third item in <code>"a,b,c"</code>.</p>' },
                        { name: '2NF — no partial dependency', html: '<p>Every non-key column depends on the <em>whole</em> key, not part of a composite one. The anomaly: a product name stored on an order-line row keyed by (order, product) has to be updated in every line.</p>' },
                        { name: '3NF — no transitive dependency', html: '<p>Non-key columns depend on the key and <strong>nothing else</strong>. The anomaly: storing <code>customer_city</code> on an order means one customer\'s city can differ between two of their orders — and there is no fact in the schema saying which is right.</p>' },
                        { name: 'BCNF and above', html: '<p>Edge cases with overlapping candidate keys. Worth knowing they exist; a schema that is properly in 3NF is usually in BCNF already.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>The classic one-line summary is worth memorising because it is genuinely a good answer: <em>"every non-key column depends on the key, the whole key, and nothing but the key."</em> Follow it with an anomaly — the two orders disagreeing about a customer\'s city — because the definition alone does not show you have seen the failure.</p>'
                }
            ],
            docs: [
                { title: 'PostgreSQL — Data Definition', url: 'https://www.postgresql.org/docs/current/ddl.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'sql-databases', questionId: 'normalisation' }
            ]
        },

        {
            id: 'when-to-denormalise',
            title: 'When to Stop',
            importance: 'should-know',
            summary: 'Denormalisation trades write complexity and a risk of divergence for read speed. Do it after measuring, deliberately, with something that keeps the copy honest.',
            interviewAngle: 'The judgement half of the previous chapter, and the more senior of the two. What is assessed is whether you treat denormalisation as a decision with a cost rather than as a tuning knob.',
            buildsOn: ['normal-forms-in-practice'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'What you are actually trading',
                    left: 'Normalised',
                    right: 'Denormalised',
                    rows: [
                        { aspect: 'Each fact stored', left: 'Once', right: 'More than once' },
                        { aspect: 'Update', left: 'One row', right: 'Every copy, in one transaction, or it diverges' },
                        { aspect: 'Read', left: 'A join', right: 'One row' },
                        { aspect: 'Can go wrong', left: 'A slow join', right: '<strong>Two copies disagreeing</strong>, silently' },
                        { aspect: 'Recoverable', left: 'n/a', right: 'Only if the source of truth still exists' },
                        { aspect: 'Right when', left: 'Nearly always, to begin with', right: 'A measured read problem a join cannot fix' }
                    ]
                },
                {
                    type: 'types',
                    title: 'The forms that are usually defensible',
                    items: [
                        { name: 'A counter or aggregate', html: '<p><code>comment_count</code> on a post. Cheap to read, and it must be updated in the same transaction as the insert or it drifts.</p>' },
                        { name: 'A materialised view', html: '<p>The database maintains it, so the copy cannot diverge — it can only be stale, which is a much better failure. Refresh on a schedule or concurrently.</p>' },
                        { name: 'A deliberate snapshot', html: '<p><strong>Not denormalisation at all, and often mistaken for it.</strong> An invoice line stores the price at the time of sale because that is a different fact from the product\'s current price. Copying it is correct.</p>' },
                        { name: 'A read model', html: '<p>A separate table or store shaped for one query, fed asynchronously. Honest about being eventually consistent, which the other forms usually are not.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>The failure mode of a denormalised copy is silence.</strong> A join that is slow shows up in a latency graph. A cached count that is wrong shows up as a customer saying the number looks odd, months later, with no way to tell when it diverged or how many rows are affected. If you denormalise, write the reconciliation query at the same time — the one that finds rows where the copy and the source disagree — and run it on a schedule.</p>'
                }
            ],
            docs: [
                { title: 'PostgreSQL — Materialized Views', url: 'https://www.postgresql.org/docs/current/rules-materializedviews.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'sql-databases', questionId: 'normalisation' }
            ]
        },

        {
            id: 'surrogate-vs-natural-keys',
            title: 'Surrogate or Natural',
            importance: 'must-know',
            summary: 'A natural key carries meaning and meaning changes. A surrogate key means nothing, which is precisely why it is stable.',
            interviewAngle: 'A reliable question with a clear answer and a good story attached: every natural key anyone has ever trusted — an email, a national id, an ISBN — has turned out to change or to be reused.',
            buildsOn: ['tables-keys-constraints'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>A primary key\'s job is to identify a row for the life of that row, and to be referenced by other rows. Both jobs punish change: updating a key means updating every foreign key that points at it, which is a cascading write across the schema and a lock on all of it.</p><p>Natural keys change. An email address is updated. A national identifier is reissued after a data-entry error. A country code is retired. An ISBN is reused by a publisher who should not have. Every one of those has happened, and each time the cost was not the update itself but the fan-out.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The answer that shows the nuance: <em>"A surrogate primary key, and a unique constraint on the natural key. The surrogate is what other tables reference and it never changes; the unique constraint is what actually enforces that emails are distinct. You get stability and the business rule, and they are separate things."</em></p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A composite natural key propagates into every child table.</strong> Keying <code>order_line</code> on (country, branch, order_no, line_no) means the grandchild table carries five columns, and every join in the application repeats them. It works, it is defensible in a data warehouse, and in an OLTP schema it makes every query longer and every index wider than it needed to be.</p>'
                }
            ],
            docs: [
                { title: 'PostgreSQL — Constraints', url: 'https://www.postgresql.org/docs/current/ddl-constraints.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'sql-databases', questionId: 'primary-key-choice' }
            ]
        },

        {
            id: 'uuid-vs-bigint-keys',
            title: 'UUID or bigint',
            importance: 'must-know',
            summary: 'A bigint is small, ordered and fast to index. A random UUID is none of those, and UUIDv7 recovers the ordering while keeping the client-side generation.',
            interviewAngle: 'A current question because UUIDv7 changed the answer. Being able to explain index fragmentation from random inserts — and that a time-ordered UUID removes it — is the discriminating detail.',
            buildsOn: ['surrogate-vs-natural-keys'],
            blocks: [
                {
                    type: 'table',
                    title: 'The three options',
                    headers: ['', 'bigint identity', 'UUIDv4', 'UUIDv7'],
                    rows: [
                        ['Size', '8 bytes', '16 bytes', '16 bytes'],
                        ['Generated by', 'The database', 'Anyone', 'Anyone'],
                        ['Ordered by time', 'Yes', '<strong>No</strong>', '<strong>Yes</strong>'],
                        ['Insert locality', 'Appends to the index', '<strong>Random — page splits everywhere</strong>', 'Appends'],
                        ['Guessable / enumerable', '<strong>Yes</strong> — /invoices/1, /invoices/2', 'No', 'Partly — the timestamp is visible'],
                        ['Merges across shards', 'Needs coordination', 'Trivially', 'Trivially'],
                        ['Known before the insert', 'No', '<strong>Yes</strong>', '<strong>Yes</strong>']
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>The cost of a random UUID is not its size, though sixteen bytes in every index and every foreign key adds up. It is <strong>insert locality</strong>. A B-tree keyed on a sequential value writes to the same rightmost page over and over, which stays in cache. A random key writes to a random page each time, so the working set becomes the whole index, and pages split and fragment. On a large table that is the difference between an insert-heavy workload that fits in memory and one that does not.</p><p>UUIDv7 puts a millisecond timestamp in the high bits, so values are time-ordered while remaining client-generated and non-sequential enough for most purposes. It is the reason this question has a different answer than it did five years ago.</p>'
                },
                {
                    type: 'version',
                    title: 'Where UUIDv7 support stands',
                    items: [
                        { version: 'RFC 9562', state: 'is', html: '<p>Published 2024, obsoleting RFC 4122. Defines versions 6, 7 and 8; <strong>v7 is the time-ordered one</strong> and the one to name.</p>' },
                        { version: 'Hibernate 6.x', state: 'was', html: '<p><code>@UuidGenerator</code> offered <code>AUTO</code>, <code>RANDOM</code> and <code>TIME</code> only, and <code>TIME</code> is <em>not</em> v7 — its javadoc describes a time-based strategy consistent with RFC 4122 <strong>version 1</strong>, with an IP address in place of the MAC address.</p>' },
                        { version: 'Hibernate 7.0', state: 'changed', html: '<p><code>Style.VERSION_6</code> and <code>Style.VERSION_7</code> arrive, both marked <code>@Incubating</code>. <code>@UuidGenerator(style = VERSION_7)</code> is how Hibernate produces a time-ordered UUID without a library.</p>' },
                        { version: 'PostgreSQL 18', state: 'changed', html: '<p><code>uuidv7()</code> as a built-in function. Before it, an extension or application-side generation was needed.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>The enumerable-id point is worth raising unprompted, because it is a design consequence rather than a performance one: sequential ids expose your volume — a competitor can register twice and count the difference — and make scraping trivial. That is an argument for a UUID in a public URL even where a bigint is the internal key.</p>'
                }
            ],
            docs: [
                { title: 'RFC 9562 — UUID', url: 'https://www.rfc-editor.org/rfc/rfc9562.html', kind: 'spec' }
            ],
            relatedQuestions: [
                { topicId: 'sql-databases', questionId: 'primary-key-choice' },
                { topicId: 'jpa-hibernate', questionId: 'id-generation-strategies' }
            ]
        },

        {
            id: 'soft-delete-and-its-costs',
            title: 'Soft Delete',
            importance: 'should-know',
            summary: 'A deleted_at column looks like a small change and is a predicate that must appear in every query, every join and every unique constraint, forever.',
            interviewAngle: 'A design question where the expected answer is "it depends" and the good answer lists the specific costs. The unique-constraint interaction is the one most people have not thought about.',
            buildsOn: ['tables-keys-constraints'],
            blocks: [
                {
                    type: 'types',
                    title: 'What it costs, in the order you meet them',
                    items: [
                        { name: 'Every query needs the predicate', html: '<p><code>WHERE deleted_at IS NULL</code>, in every query, every view and every join. One omission returns deleted rows, and it is a data-correctness bug that no test without deleted rows will catch.</p>' },
                        { name: 'Unique constraints stop working', html: '<p><code>UNIQUE(email)</code> now blocks re-registering an email that belongs to a deleted user. A partial index — <code>UNIQUE(email) WHERE deleted_at IS NULL</code> — is the fix, and it is engine-specific.</p>' },
                        { name: 'Foreign keys mean nothing', html: '<p>A live row can reference a soft-deleted parent, and the database is perfectly happy. Referential integrity is now the application\'s job again.</p>' },
                        { name: 'The table only grows', html: '<p>Indexes cover rows nobody will ever read. On a high-churn table the deleted rows eventually outnumber the live ones.</p>' },
                        { name: 'Erasure requests', html: '<p>Under GDPR and similar regimes, "delete my data" means delete. A soft delete is not one, and discovering that during an audit is expensive.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Hibernate\'s <code>@SQLRestriction</code> — <code>@Where</code> before Hibernate 6.3 — applies the predicate automatically and hides the cost rather than removing it.</strong> It does not apply to native queries, it interacts confusingly with <code>@ManyToOne</code> associations, and it makes the filter invisible at every call site, so nobody remembers it is there until a query returns nothing and the reason is three annotations away.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Ask what the requirement actually is, because it is usually not soft delete. If it is an audit trail, an append-only history table is better and does not touch the live schema. If it is undo, a status column with an explicit lifecycle is clearer than a nullable timestamp. Soft delete is right when the row must remain referenceable — and that is a narrower case than its popularity suggests.</p>'
                }
            ],
            docs: [
                { title: 'PostgreSQL — Partial Indexes', url: 'https://www.postgresql.org/docs/current/indexes-partial.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'sql-databases', questionId: 'soft-delete' }
            ]
        },

        {
            id: 'modelling-money-and-time',
            title: 'Money and Time in a Schema',
            importance: 'must-know',
            summary: 'NUMERIC with a currency column, and timestamptz for anything that happened. Both are the same mistake in two places: a type that discards information.',
            interviewAngle: 'The database half of the serialisation module\'s chapters. The fact worth carrying is that a PostgreSQL timestamp without a time zone stores no zone at all and is therefore uninterpretable on its own.',
            buildsOn: ['tables-keys-constraints'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'sql',
                    title: 'The column types, with the reasons in the comments',
                    code: 'CREATE TABLE invoice (\n    id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,\n\n    -- NUMERIC is exact decimal. Never float or double for money:\n    -- they are binary, and 0.1 has no exact binary representation.\n    amount        numeric(19, 4) NOT NULL CHECK (amount >= 0),\n    currency      char(3)        NOT NULL,   -- an amount alone is not money\n\n    -- timestamptz stores a point in time. Despite the name, PostgreSQL\n    -- does NOT store a zone -- it stores UTC and converts on read.\n    created_at    timestamptz    NOT NULL DEFAULT now(),\n\n    -- A calendar day with no time and no zone. Correct here: the due\n    -- date is the same day everywhere.\n    due_on        date           NOT NULL\n);',
                    output: {
                        kind: 'trace',
                        lines: [
                            'Checked against PostgreSQL 16.',
                            'timestamp WITHOUT time zone -- the default when you write plain "timestamp" -- stores the literal wall-clock value and no zone, so it cannot identify a moment without out-of-band knowledge of which clock wrote it.',
                            'timestamptz stores a UTC instant and renders it in the session TimeZone, which is why two clients can see different strings for the same row and both be right.',
                            'numeric(19,4) is arbitrary-precision decimal and is slower than a bigint of minor units. Storing minor units as bigint is the other defensible choice; float is not one.'
                        ],
                        explain: '<p>The naming is genuinely misleading and worth stating plainly: <code>timestamptz</code> does not store a time zone. It stores an instant. <code>timestamp</code> stores neither an instant nor a zone — just digits — which is why it is the wrong type for anything that happened.</p>'
                    }
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Mapping a <code>timestamptz</code> column to a <code>LocalDateTime</code> field throws the zone away at the JDBC boundary.</strong> The database has an instant, the driver converts it to the JVM\'s default zone, and the field records digits with no zone attached — so the value now depends on where the process is running. Map <code>timestamptz</code> to <code>Instant</code> or <code>OffsetDateTime</code>, and reserve <code>LocalDateTime</code> for a <code>timestamp</code> column that genuinely means a wall-clock time.</p>'
                }
            ],
            docs: [
                { title: 'PostgreSQL — Date/Time Types', url: 'https://www.postgresql.org/docs/current/datatype-datetime.html', kind: 'guide' },
                { title: 'PostgreSQL — Numeric Types', url: 'https://www.postgresql.org/docs/current/datatype-numeric.html', kind: 'guide' }
            ],
            relatedQuestions: []
        }
    ]
};
