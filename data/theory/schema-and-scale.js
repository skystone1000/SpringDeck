/* ==========================================================================
   data/theory/schema-and-scale.js — module 54, the last of the persistence
   track and the last of Phase 3.

   Everything before this module assumed the schema was already there. This
   one is about changing it while people are using it, and then about the
   three things you do when one database stops being enough. The order is
   deliberate: migrations first, because every team does them; sharding last,
   because most teams should not.

   Every claim about engine behaviour here names the engine and the version.
   "SQL does X" is not a fact about anything.
   ========================================================================== */

const schemaAndScaleModule = {
    id: 'schema-and-scale',
    trackId: 'persistence',
    order: 54,
    title: 'Migrations and Scaling the Database',
    tagline: 'Zero-downtime schema change, replicas, partitioning, sharding.',
    estimatedMinutes: 40,
    prerequisites: ['indexes-and-plans', 'spring-data-jpa'],
    docHub: {
        title: 'Spring Boot — Database Initialization',
        url: 'https://docs.spring.io/spring-boot/how-to/data-initialization.html'
    },

    chapters: [
        {
            id: 'flyway-and-liquibase',
            title: 'Versioned Migrations',
            importance: 'must-know',
            summary: 'The schema is code, it lives in the repository, and it moves forward one numbered file at a time.',
            interviewAngle: 'Asked as "how do you manage schema changes". The answer that lands includes why <code>ddl-auto</code> is not an answer, and what a checksum failure means.',
            buildsOn: [],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>A migration tool keeps a table in your database — <code>flyway_schema_history</code>, or <code>DATABASECHANGELOG</code> — recording which change scripts have run, in what order, and with what checksum. On startup it compares that table against the scripts on the class path and applies whatever is missing, inside a lock so that ten instances starting at once do not all try. That is the whole idea, and its value is that the schema of any environment is derivable from the repository rather than from whoever last touched it.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong><code>spring.jpa.hibernate.ddl-auto=update</code> is not a migration strategy.</strong> It only adds; it never drops a column, never renames one, never changes a type, never writes data. It cannot be reviewed, because there is no artefact to review. It cannot be rolled back. And it derives the schema from the entities, which means the entity mapping becomes the source of truth for a database that other systems also read. Use <code>validate</code> in every environment and let Flyway or Liquibase own the DDL.</p>'
                },
                {
                    type: 'syntax',
                    language: 'properties',
                    title: 'The configuration that goes with that decision',
                    code: '# Hibernate checks the schema matches the entities and refuses to start\n# if it does not. This is the single most useful setting in this file:\n# a migration somebody forgot to write fails the deploy, not a request.\nspring.jpa.hibernate.ddl-auto=validate\n\nspring.flyway.enabled=true\nspring.flyway.locations=classpath:db/migration\n\n# An existing database with no history table: record the current state as\n# the baseline rather than trying to replay it from nothing.\nspring.flyway.baseline-on-migrate=true\nspring.flyway.baseline-version=1\n\n# Refuse to run out-of-order versions. Two developers who both wrote V7\n# should find out at the pull request, not in production.\nspring.flyway.out-of-order=false',
                    notes: '<p>The naming convention carries meaning: <code>V7__add_orders_status_index.sql</code> is versioned and runs once, <code>R__order_summary_view.sql</code> is repeatable and re-runs whenever its checksum changes, and <code>U7__…</code> is an undo script — a paid Flyway feature, and one you should not plan around.</p>'
                },
                {
                    type: 'comparison',
                    title: 'The two tools',
                    left: 'Flyway',
                    right: 'Liquibase',
                    rows: [
                        { aspect: 'Change format', left: 'Plain SQL files, one per version', right: 'XML, YAML, JSON or SQL changesets' },
                        { aspect: 'Database portability', left: 'You write the dialect', right: 'Abstract changesets generate the dialect' },
                        { aspect: 'Rollback', left: 'Paid feature; most teams write a forward fix', right: 'Built in, and often still wrong for data' },
                        { aspect: 'Preconditions and contexts', left: 'Minimal', right: '<strong>Rich</strong> — conditional changesets, contexts, labels' },
                        { aspect: 'Reading a diff', left: 'It is SQL. Anybody can review it', right: 'One more layer to learn' },
                        { aspect: 'Fits best', left: 'One team, one engine, SQL people', right: 'Many engines, or a product shipped to customer databases' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Editing a migration that has already run is the mistake everybody makes once.</strong> The checksum no longer matches the history row and every environment that already applied it fails to start — including production, at the worst moment. The rule is absolute: an applied migration is immutable, and a mistake in it is fixed by a new migration. <code>flyway repair</code> exists for the case where you truly must rewrite history, and reaching for it should feel uncomfortable.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Migrations run at startup, before the application serves traffic, which means <strong>a slow migration is downtime</strong> on a rolling deploy — the new instances are waiting on a lock and the old ones are being taken away. Anything that rewrites a table belongs outside the startup path: a separate job, run deliberately, watched by somebody.</p>'
                }
            ],
            docs: [
                { title: 'Flyway — Migrations', url: 'https://documentation.red-gate.com/flyway/flyway-concepts/migrations', kind: 'guide' },
                { title: 'Spring Boot — Migrating with Flyway', url: 'https://docs.spring.io/spring-boot/how-to/data-initialization.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'sql-databases', questionId: 'flyway-vs-liquibase' },
                { topicId: 'jpa-hibernate', questionId: 'schema-generation-and-migrations' }
            ]
        },

        {
            id: 'expand-and-contract',
            title: 'Expand and Contract',
            importance: 'must-know',
            summary: 'The old code and the new code run at the same time during every deploy, so every schema change has to be compatible with both.',
            interviewAngle: 'The zero-downtime question in its general form. Naming the pattern is worth little; walking a column rename through three deploys is worth a lot.',
            buildsOn: ['flyway-and-liquibase'],
            blocks: [
                {
                    type: 'definition',
                    term: 'Expand and contract',
                    important: true,
                    html: '<p>Splitting a schema change into an <em>expand</em> phase that only adds compatible structure, a <em>migrate</em> phase where both old and new code work against it, and a <em>contract</em> phase that removes the old structure once nothing reads it. Also called <em>parallel change</em>. The constraint it answers: during any rolling deploy, two versions of the application are live against one database.</p>'
                },
                {
                    type: 'prose',
                    html: '<p>This is why "rename <code>customer_name</code> to <code>full_name</code>" is not one change. The moment the migration runs, every instance still running the old code queries a column that no longer exists, and every one of those requests fails until the rollout finishes. A rollback makes it worse, not better — now the new column is gone and the new code is back.</p>'
                },
                {
                    type: 'diagram',
                    diagramType: 'flowchart',
                    caption: 'Three deploys for one rename. Each one is independently safe to roll back, which is the property the pattern is buying.',
                    diagramConfig: {
                        title: 'Renaming a column without downtime',
                        nodes: [
                            { id: 'start', label: 'Live: code v1 reads and writes customer_name', kind: 'start' },
                            { id: 'expand', label: 'EXPAND — add full_name, nullable. No code change', kind: 'step' },
                            { id: 'dual', label: 'Deploy v2 — writes BOTH columns, reads customer_name', kind: 'step' },
                            { id: 'backfill', label: 'Backfill full_name in batches, then verify zero mismatches', kind: 'decision' },
                            { id: 'read', label: 'Deploy v3 — reads full_name, still writes both', kind: 'step' },
                            { id: 'stop', label: 'Deploy v4 — writes only full_name', kind: 'step' },
                            { id: 'contract', label: 'CONTRACT — drop customer_name', kind: 'fix' }
                        ],
                        edges: [
                            { from: 'start', to: 'expand' },
                            { from: 'expand', to: 'dual' },
                            { from: 'dual', to: 'backfill' },
                            { from: 'backfill', to: 'read', label: 'counts agree' },
                            { from: 'backfill', to: 'dual', label: 'mismatch — fix the dual write first' },
                            { from: 'read', to: 'stop' },
                            { from: 'stop', to: 'contract' }
                        ]
                    }
                },
                {
                    type: 'table',
                    title: 'Which changes are safe on their own',
                    headers: ['Change', 'Safe in one step?', 'Note'],
                    rows: [
                        ['Add a nullable column', 'Yes', 'Old code ignores it'],
                        ['Add a column with a constant default', 'PostgreSQL 11+ and MySQL 8.0.12+ yes; earlier no', 'See the next chapter — it hinges on whether the table is rewritten'],
                        ['Add a <code>NOT NULL</code> column', '<strong>No</strong>', 'Old code inserts rows without it'],
                        ['Add an index', 'Only with <code>CONCURRENTLY</code> (PostgreSQL 16) or the online path (MySQL 8)', 'A plain <code>CREATE INDEX</code> blocks writes for the build'],
                        ['Drop a column', '<strong>No</strong>', 'Contract phase only, after nothing selects it — including <code>select *</code>'],
                        ['Rename anything', '<strong>No</strong>', 'Add, dual-write, backfill, switch reads, drop'],
                        ['Widen a type (<code>varchar(50)</code> → <code>varchar(200)</code>)', 'PostgreSQL 16 yes, no rewrite', 'Narrowing is never safe'],
                        ['Add a foreign key', 'With <code>NOT VALID</code> then <code>VALIDATE CONSTRAINT</code>', 'One statement takes a lock for a full scan']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong><code>select *</code> defeats the contract phase.</strong> A dropped column is safe only if nothing selects it, and a JPA entity with a stale field, a view, a report, or another service\'s query all count. This is also the argument for <code>ddl-auto=validate</code>: it turns "some instance still expects that column" into a startup failure rather than a runtime one.</p>'
                }
            ],
            docs: [
                { title: 'PostgreSQL 16 — ALTER TABLE', url: 'https://www.postgresql.org/docs/16/sql-altertable.html', kind: 'spec' },
                { title: 'MySQL 8.0 — Online DDL operations', url: 'https://dev.mysql.com/doc/refman/8.0/en/innodb-online-ddl-operations.html', kind: 'spec' }
            ],
            relatedQuestions: [
                { topicId: 'sql-databases', questionId: 'migrations-and-zero-downtime' }
            ]
        },

        {
            id: 'adding-a-non-null-column-safely',
            title: 'The NOT NULL Column, Step by Step',
            importance: 'must-know',
            summary: 'The canonical worked example, and the one where a lock held for a table rewrite takes an application down.',
            interviewAngle: 'A favourite because it has a definite answer and several wrong ones. The detail that impresses is the lock queue: a blocked DDL statement blocks every reader behind it.',
            buildsOn: ['expand-and-contract'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'sql',
                    title: 'Five migrations, PostgreSQL 16',
                    code: '-- V21: expand. Nullable, so no rewrite and no default to apply.\nALTER TABLE orders ADD COLUMN channel varchar(20);\n\n-- V22 is not SQL: deploy code that writes channel on every insert\n-- and update. Nothing reads it yet.\n\n-- V23: backfill, in batches, from a job -- NOT from a migration.\n-- See the next chapter for why the batching matters.\n\n-- V24: constrain. NOT VALID skips the full scan, so it takes the\n-- lock for microseconds instead of minutes.\nALTER TABLE orders\n  ADD CONSTRAINT orders_channel_present CHECK (channel IS NOT NULL) NOT VALID;\n\n-- V25: validate. Takes only SHARE UPDATE EXCLUSIVE -- concurrent\n-- reads and writes continue while it scans.\nALTER TABLE orders VALIDATE CONSTRAINT orders_channel_present;\n\n-- Optional V26: PostgreSQL 12+ can promote a validated CHECK into a\n-- real NOT NULL without rescanning the table.\nALTER TABLE orders ALTER COLUMN channel SET NOT NULL;',
                    output: {
                        kind: 'trace',
                        lines: [
                            'ALTER TABLE orders ALTER COLUMN channel SET NOT NULL on its own scans the whole table under ACCESS EXCLUSIVE.',
                            'On a 200-million-row table that is minutes, and during them no session may read the table at all.',
                            'Worse: the DDL statement waits behind any open transaction touching orders, and every query arriving after it queues behind the DDL.',
                            'So one long-running report plus one ALTER equals a full outage on that table, even though the ALTER itself had not started.'
                        ],
                        explain: '<p>The <code>NOT VALID</code> / <code>VALIDATE</code> split exists precisely to avoid this. The first statement takes the strong lock but does no work; the second does the work under a weak lock. Always set <code>lock_timeout</code> before DDL — <code>SET lock_timeout = \'3s\';</code> — so a statement that cannot get its lock immediately gives up instead of forming a queue behind itself.</p>'
                    }
                },
                {
                    type: 'table',
                    title: 'ADD COLUMN with a default, by engine',
                    headers: ['Engine', 'Behaviour', 'Consequence'],
                    rows: [
                        ['PostgreSQL 11+', 'A <strong>constant</strong> default is stored as table metadata; no rewrite', 'Milliseconds on any size of table'],
                        ['PostgreSQL 11+, volatile default', '<code>DEFAULT gen_random_uuid()</code> or <code>now()</code> forces a full rewrite', 'The fast path is lost silently — nothing warns you'],
                        ['PostgreSQL 10 and earlier', 'Every <code>ADD COLUMN … DEFAULT</code> rewrites the table', 'Add nullable, backfill, then set the default'],
                        ['MySQL 8.0.12+ InnoDB', '<code>ALGORITHM=INSTANT</code> for adding a column last in the row', 'Fast, but the column must be added at the end'],
                        ['MySQL 5.7', '<code>ALGORITHM=INPLACE</code> at best; often a copy', 'Use <code>pt-online-schema-change</code> or <code>gh-ost</code>']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A migration that acquires a lock is not made safe by being fast.</strong> PostgreSQL 16 queues lock requests in order, so a DDL statement waiting on a lock blocks every subsequent reader of that table even though the DDL would take a millisecond once it started. The one long transaction it is waiting behind can be a <code>SELECT</code> somebody left open in a console. <code>lock_timeout</code> plus a retry loop is the standard defence, and it is two lines.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The version numbers in this chapter are load-bearing. "Adding a column with a default rewrites the table" was true and is now false, and repeating it from an old blog post is a common way to sound out of date. Say "PostgreSQL 11 onwards, for a constant default" and the caveat comes with it.</p>'
                }
            ],
            docs: [
                { title: 'PostgreSQL 16 — ALTER TABLE notes', url: 'https://www.postgresql.org/docs/16/sql-altertable.html#SQL-ALTERTABLE-NOTES', kind: 'spec' },
                { title: 'PostgreSQL 16 — Explicit locking', url: 'https://www.postgresql.org/docs/16/explicit-locking.html', kind: 'spec' }
            ],
            relatedQuestions: [
                { topicId: 'sql-databases', questionId: 'migrations-and-zero-downtime' }
            ]
        },

        {
            id: 'backfilling-large-tables',
            title: 'Backfilling Without an Outage',
            importance: 'should-know',
            summary: 'One UPDATE over a hundred million rows is one transaction, one lock set, and one enormous amount of WAL. Batch it, key it, throttle it, and make it resumable.',
            interviewAngle: 'The practical follow-up to the migration questions. Mentioning that the batch must be resumable and idempotent is what separates somebody who has run one.',
            buildsOn: ['adding-a-non-null-column-safely'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>A single <code>UPDATE orders SET channel = \'web\' WHERE channel IS NULL</code> over a large table holds row locks on everything it touches until commit, generates write-ahead log proportional to the whole table, bloats it with dead tuples under PostgreSQL 16\'s MVCC, and cannot be stopped without losing all of it. It also blocks any concurrent update of those rows, which is the part users notice.</p>'
                },
                {
                    type: 'syntax',
                    language: 'sql',
                    title: 'A batch that is resumable and does not scan from the start each time',
                    code: '-- Each batch is its own transaction. Keyset, not OFFSET: OFFSET 900000\n-- makes the database walk 900,000 rows to skip them, so the job gets\n-- slower with every batch until it is slower than doing nothing.\nUPDATE orders o\n   SET channel = \'web\'\n  FROM (\n        SELECT id\n          FROM orders\n         WHERE channel IS NULL\n           AND id > :last_id\n         ORDER BY id\n         LIMIT 5000\n       ) AS batch\n WHERE o.id = batch.id\nRETURNING o.id;\n\n-- Take the largest returned id as :last_id, sleep 100ms, repeat.\n-- Zero rows returned means done.\n\n-- The index that makes the WHERE cheap for the whole run, built\n-- without blocking writes, and dropped when the job finishes.\nCREATE INDEX CONCURRENTLY orders_channel_null_idx\n    ON orders (id) WHERE channel IS NULL;',
                    output: {
                        kind: 'trace',
                        lines: [
                            'Batch size is a trade: larger batches are fewer round trips, smaller batches hold locks for less time. 1,000 to 10,000 rows is the usual band.',
                            'The sleep between batches is not politeness -- it lets replication catch up and lets autovacuum reclaim the dead tuples the previous batch made.',
                            'Every batch is idempotent because the predicate is channel IS NULL: a rerun after a crash re-processes only what is still unset.',
                            'Watch replication lag while it runs. A backfill is the single most common cause of a replica falling minutes behind, and read traffic is on that replica.'
                        ],
                        explain: '<p>The partial index is the trick that makes the run finish in predictable time: without it, every batch scans for the remaining <code>NULL</code>s across a table that is mostly filled in by then. With it, the index shrinks as the job proceeds. Drop it at the end — it has no purpose once the column is fully populated.</p>'
                    }
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Do not put a backfill in a Flyway migration.</strong> Migrations run at startup, inside the migration lock, before the instance serves traffic — so a forty-minute backfill is forty minutes of a deploy that appears hung, with the rest of the rollout stalled behind it, and a failure halfway leaves a partially-applied version. Backfills belong in a job you start deliberately and can stop.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Verify before contracting. <code>SELECT count(*) FROM orders WHERE channel IS NULL</code> returning zero is the gate for the constraint, and re-running it after the dual-write deploy is what catches a write path somebody missed — a message consumer, an admin tool, a batch importer.</p>'
                }
            ],
            docs: [
                { title: 'PostgreSQL 16 — Routine vacuuming', url: 'https://www.postgresql.org/docs/16/routine-vacuuming.html', kind: 'spec' },
                { title: 'PostgreSQL 16 — CREATE INDEX CONCURRENTLY', url: 'https://www.postgresql.org/docs/16/sql-createindex.html#SQL-CREATEINDEX-CONCURRENTLY', kind: 'spec' }
            ],
            relatedQuestions: []
        },

        {
            id: 'read-replicas-and-lag',
            title: 'Read Replicas and the Lag You Inherit',
            importance: 'must-know',
            summary: 'Replicas scale reads and hand you a consistency problem, and the one that surfaces first is a user not seeing their own write.',
            interviewAngle: 'Both halves get asked: how routing works in Spring, and what read-your-writes means. Knowing that <code>readOnly = true</code> does not route by itself is the practical detail.',
            buildsOn: ['backfilling-large-tables'],
            blocks: [
                {
                    type: 'definition',
                    term: 'Replication lag',
                    important: true,
                    html: '<p>The delay between a transaction committing on the primary and its effects being visible on a replica. Under PostgreSQL 16\'s default asynchronous streaming replication it is normally milliseconds and is unbounded in principle — a large write, a network stall or a slow replica can push it to minutes, and the primary does not wait.</p>'
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Routing by transaction, using the flag Spring already sets',
                    code: 'class RoutingDataSource extends AbstractRoutingDataSource {\n    @Override protected Object determineCurrentLookupKey() {\n        return TransactionSynchronizationManager.isCurrentTransactionReadOnly()\n                ? "replica" : "primary";\n    }\n}\n\n@Bean\nDataSource dataSource(@Qualifier("primary") DataSource primary,\n                      @Qualifier("replica") DataSource replica) {\n    var routing = new RoutingDataSource();\n    routing.setTargetDataSources(Map.of("primary", primary, "replica", replica));\n    routing.setDefaultTargetDataSource(primary);\n\n    // Lazy: the connection is taken AFTER the transaction is marked\n    // read-only. Without this the key is read before the flag is set\n    // and everything goes to the primary.\n    return new LazyConnectionDataSourceProxy(routing);\n}\n\n@Transactional(readOnly = true)\npublic List<OrderSummary> recent(Long customerId) { ... }',
                    output: {
                        kind: 'trace',
                        lines: [
                            'readOnly = true on its own does two things and neither is routing: it sets the Hibernate flush mode to MANUAL, so dirty checking is skipped, and it hints the JDBC driver.',
                            'Sending it to a replica is this routing code. Many people believe Spring does it; it does not.',
                            'LazyConnectionDataSourceProxy matters more than it looks. A transaction acquires its connection eagerly at begin, which is before the read-only flag has been set on the synchronisation manager.',
                            'A method with no @Transactional at all gets the default key -- the primary -- because there is no read-only flag to read.'
                        ],
                        explain: '<p>The consequence to state in an interview: routing is per transaction, so a service method that reads and then writes must not be marked read-only, and splitting it into a read method and a write method is a routing decision as much as a design one.</p>'
                    }
                },
                {
                    type: 'types',
                    title: 'Living with lag',
                    items: [
                        { name: 'Read your writes', html: '<p>After a user writes, route <em>that user\'s</em> reads to the primary for a short window — a flag in the session, or a timestamp compared against the replica\'s position. The common symptom without it: save a profile, get redirected, see the old values.</p>' },
                        { name: 'Route by endpoint, not by table', html: '<p>Reporting, search, exports and dashboards tolerate seconds of staleness. Checkout, balances and anything read back immediately do not. The decision belongs at the use case.</p>' },
                        { name: 'Monitor the lag, alert on it', html: '<p><code>pg_last_xact_replay_timestamp()</code> on PostgreSQL 16, <code>Seconds_Behind_Master</code> on MySQL 8. Alert before it is user-visible, and take a replica out of rotation when it exceeds the threshold.</p>' },
                        { name: 'Synchronous replication', html: '<p><code>synchronous_commit = on</code> with a named standby removes the lag and adds the standby\'s round trip to <strong>every commit on the primary</strong>. It converts a consistency problem into a latency-and-availability problem, which is sometimes the right trade and never a free one.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A replica is not a backup, and it is not capacity for writes.</strong> A <code>DELETE</code> replicates in milliseconds; a dropped table is dropped everywhere. And every write still lands on one primary, so replicas move the read ceiling and leave the write ceiling exactly where it was — which is the point at which the next two chapters start to apply.</p>'
                }
            ],
            docs: [
                { title: 'PostgreSQL 16 — Hot standby and replication', url: 'https://www.postgresql.org/docs/16/hot-standby.html', kind: 'spec' },
                { title: 'Spring Framework — AbstractRoutingDataSource', url: 'https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/jdbc/datasource/lookup/AbstractRoutingDataSource.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'sql-databases', questionId: 'read-replicas' },
                { topicId: 'transactions', questionId: 'readonly-transactions' }
            ]
        },

        {
            id: 'partitioning',
            title: 'Partitioning One Table',
            importance: 'should-know',
            summary: 'One logical table stored as many physical ones, on one server. It buys cheap bulk deletes and pruning, and it costs you constraints.',
            interviewAngle: 'Usually asked next to sharding, and the useful distinction is that partitioning is one database and sharding is many. The constraint rule is the detail people miss.',
            buildsOn: ['read-replicas-and-lag'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'sql',
                    title: 'Declarative range partitioning, PostgreSQL 16',
                    code: 'CREATE TABLE events (\n    id          bigint       GENERATED ALWAYS AS IDENTITY,\n    occurred_at timestamptz  NOT NULL,\n    payload     jsonb        NOT NULL,\n    -- The partition key MUST be part of every unique constraint,\n    -- including the primary key. This is the rule that reshapes\n    -- the model, and it is not negotiable.\n    PRIMARY KEY (id, occurred_at)\n) PARTITION BY RANGE (occurred_at);\n\nCREATE TABLE events_2026_08 PARTITION OF events\n    FOR VALUES FROM (\'2026-08-01\') TO (\'2026-09-01\');\nCREATE TABLE events_2026_09 PARTITION OF events\n    FOR VALUES FROM (\'2026-09-01\') TO (\'2026-10-01\');\n\n-- Retention becomes metadata rather than work.\nALTER TABLE events DETACH PARTITION events_2026_08;\nDROP TABLE events_2026_08;',
                    output: {
                        kind: 'trace',
                        lines: [
                            'Pruning only happens when the partition key appears in the WHERE clause. A query filtering on payload alone reads every partition.',
                            'So a table partitioned by occurred_at makes time-range queries much cheaper and makes lookups by id slightly worse -- they now touch every partition.',
                            'Indexes are local: an index on the parent is created on each partition. There is no global index in PostgreSQL 16.',
                            'Which is why a unique constraint that does not include the partition key is impossible: uniqueness would have to be enforced across partitions, and no structure spans them.'
                        ],
                        explain: '<p>The bulk delete is usually the reason. <code>DELETE FROM events WHERE occurred_at &lt; …</code> over a month of rows is hours of work and a vacuum problem; <code>DROP TABLE events_2026_08</code> is instant and leaves nothing to reclaim. If a table has a retention policy, that alone can justify partitioning it.</p>'
                    }
                },
                {
                    type: 'table',
                    title: 'What partitioning does and does not buy',
                    headers: ['Claim', 'True?', 'Detail'],
                    rows: [
                        ['Dropping old data becomes instant', '<strong>Yes</strong>', 'The clearest win; a <code>DROP</code> instead of a mass delete'],
                        ['Time-range queries get faster', 'Yes, if the key is in the predicate', 'Pruning happens at plan time, and at run time for parameters'],
                        ['Every query gets faster', '<strong>No</strong>', 'Queries that do not filter on the key get slower — more relations to open'],
                        ['It scales writes past one server', '<strong>No</strong>', 'One server, one write path. That is sharding'],
                        ['Indexes get smaller', 'Yes', 'One B-tree per partition rather than one enormous one'],
                        ['You can keep any unique constraint you like', '<strong>No</strong>', 'Every unique constraint must contain the partition key'],
                        ['JPA still works normally', 'Yes', 'The parent table is what the entity maps to; partitioning is invisible to Hibernate']
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>Create the next partition <em>before</em> it is needed. Under PostgreSQL 16 an insert with no matching partition fails outright, so a monthly partition scheme with no job to create next month\'s becomes an outage at midnight on the first. A <code>DEFAULT</code> partition catches the strays and turns the outage into a slow query and a cleanup task, which is the better failure.</p>'
                }
            ],
            docs: [
                { title: 'PostgreSQL 16 — Table partitioning', url: 'https://www.postgresql.org/docs/16/ddl-partitioning.html', kind: 'spec' }
            ],
            relatedQuestions: [
                { topicId: 'sql-databases', questionId: 'partitioning-and-sharding' }
            ]
        },

        {
            id: 'sharding-and-a-shard-key',
            title: 'Sharding, and Choosing the Key',
            importance: 'should-know',
            summary: 'Many databases, no cross-database joins, no cross-database transactions. Everything after that follows from the key you chose.',
            interviewAngle: 'A design question. The strong answer names what you lose and why the key choice is nearly irreversible; the weak one describes hashing.',
            buildsOn: ['partitioning'],
            blocks: [
                {
                    type: 'definition',
                    term: 'Shard key',
                    important: true,
                    html: '<p>The column whose value decides which database a row lives in. Every query that does not carry it has to be sent to every shard and merged in the application, so the shard key is not a storage detail — it decides which of your access patterns stay cheap and which become fan-out.</p>'
                },
                {
                    type: 'prose',
                    html: '<p>Sharding is the point where the database stops being one thing. A join across shards does not exist; you fetch from each and join in application code. A transaction across shards does not exist either, so an operation spanning two shards needs a saga or an outbox and an apology to whoever wanted atomicity. Unique constraints hold only within a shard, so global uniqueness needs a separate service or a UUID. <code>AUTO_INCREMENT</code> collides across shards, so identifiers become UUIDv7 or Snowflake-style.</p>'
                },
                {
                    type: 'types',
                    title: 'How rows are assigned',
                    items: [
                        { name: 'Hash of the key', html: '<p><code>shard = hash(customer_id) % N</code>. Even distribution, no hot shard. <strong>Changing N rehashes almost everything</strong>, which is why the naive modulo is a decision you make once and regret.</p>' },
                        { name: 'Consistent hashing', html: '<p>A ring of virtual nodes, so adding a shard moves roughly 1/N of the keys instead of all of them. The standard answer to the resharding problem, and the reason to reach for it before you need it.</p>' },
                        { name: 'Range', html: '<p>Customers A–M here, N–Z there. Range queries stay local and the distribution is uneven — and if the key is a timestamp, every write goes to the newest shard, which is a hot spot by construction.</p>' },
                        { name: 'Directory (lookup table)', html: '<p>An explicit mapping from key to shard. Maximum flexibility, per-tenant placement, easy rebalancing — and one more lookup on every request, plus a component that must not go down.</p>' }
                    ]
                },
                {
                    type: 'table',
                    title: 'Choosing the key, for an order system',
                    headers: ['Candidate key', 'Good', 'Bad'],
                    rows: [
                        ['<code>customer_id</code>', 'A customer\'s orders are all on one shard, so their history is a single-shard query', 'One enormous customer is a hot shard nothing can fix'],
                        ['<code>order_id</code>', 'Perfectly even distribution', '"All orders for customer X" fans out to every shard — usually fatal'],
                        ['<code>tenant_id</code>', 'Natural isolation; a tenant can be moved or restored alone', 'Tenant sizes vary by orders of magnitude'],
                        ['<code>region</code>', 'Data residency and locality come free', 'Very uneven, and a region cannot be split later'],
                        ['<code>created_at</code>', 'Old shards go read-only and archive cleanly', 'Every write lands on the newest shard']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>The shard key is the hardest thing in the system to change.</strong> Changing it means rewriting every row into a different database while the application keeps serving, and every query that assumed the old locality. Before sharding, exhaust the cheaper moves in order: an index, a projection, a cache, read replicas, partitioning, a bigger machine, and moving the largest table to its own database. Vertical scaling is unfashionable and buys years — a single PostgreSQL 16 instance on current hardware handles workloads that most teams describe as needing sharding.</p>'
                }
            ],
            docs: [
                { title: 'Vitess — Sharding', url: 'https://vitess.io/docs/reference/features/sharding/', kind: 'guide' },
                { title: 'Citus — Distributed tables', url: 'https://docs.citusdata.com/en/stable/sharding/data_modeling.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'sql-databases', questionId: 'partitioning-and-sharding' }
            ]
        },

        {
            id: 'when-not-relational',
            title: 'When a Relational Database Is the Wrong Answer',
            importance: 'good-to-know',
            summary: 'Rarely, and for specific shapes — but the shapes are real, and knowing them is more useful than a preference.',
            interviewAngle: 'A judgement question with a trap: enthusiasm for a document store as a default is a red flag, and so is refusing to name any case where one wins.',
            buildsOn: ['sharding-and-a-shard-key'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>The honest position for a backend interview is that a relational database is the right default and stays right much longer than people expect, because transactions, constraints, joins and a mature planner are extremely hard to reimplement in application code — and the alternative to a foreign key is a bug that nobody notices for a year. What follows is the set of shapes where something else genuinely fits better, alongside the relational answer that usually removes the need.</p>'
                },
                {
                    type: 'table',
                    title: 'Shapes and their fits',
                    headers: ['Shape', 'Fits', 'But first consider'],
                    rows: [
                        ['Millions of writes/second, no joins, key lookups only', 'Cassandra, DynamoDB', 'Whether the read path really has no joins in it'],
                        ['Documents whose fields differ per record', 'MongoDB, or <code>jsonb</code>', 'PostgreSQL 16 <code>jsonb</code> with a GIN index, inside the same transaction'],
                        ['Full-text and relevance ranking', 'Elasticsearch, OpenSearch', '<code>tsvector</code> for modest corpora — one fewer system to keep in sync'],
                        ['Relationships traversed many hops deep', 'Neo4j', 'A recursive CTE, which handles a surprising amount'],
                        ['Time series at high ingest with retention', 'TimescaleDB, InfluxDB', 'Partitioning by time, from the previous chapter'],
                        ['Ephemeral state: sessions, rate limits, queues', '<strong>Redis</strong>', 'Nothing — this one is genuinely the wrong job for a relational database'],
                        ['Analytics over billions of rows', 'ClickHouse, BigQuery, a warehouse', 'A read replica, until the scans start hurting the primary']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Every additional store is a consistency problem you now own.</strong> Two systems holding overlapping data cannot be written atomically, so you need an outbox, a change feed, or an acceptance that they will disagree — plus a second operational surface: backups, upgrades, monitoring, failover, and somebody who knows it at 3am. That cost is paid continuously and is almost never in the proposal.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The answer that reads as experienced: <em>start relational, keep it relational until a specific access pattern is demonstrably wrong for it, and then move that one pattern — not the system.</em> Search moving to Elasticsearch while orders stay in PostgreSQL 16 is a good architecture. Everything moving to a document store because writes felt slow is how teams end up reimplementing joins.</p>'
                }
            ],
            docs: [
                { title: 'PostgreSQL 16 — JSON types', url: 'https://www.postgresql.org/docs/16/datatype-json.html', kind: 'spec' },
                { title: 'PostgreSQL 16 — Full text search', url: 'https://www.postgresql.org/docs/16/textsearch.html', kind: 'spec' }
            ],
            relatedQuestions: []
        }
    ]
};
