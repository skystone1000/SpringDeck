/* ==========================================================================
   data/theory/jdbc-and-pooling.js — module 47 in the reading path

   Eight chapters, and the plan's tagline names the stake: the failure that
   causes the most outages. Pool exhaustion presents as a slow application
   with an idle database, which sends investigations in the wrong direction
   for an hour before anybody looks at the pool.
   ========================================================================== */

const jdbcAndPoolingModule = {
    id: 'jdbc-and-pooling',
    trackId: 'persistence',
    order: 47,
    title: 'JDBC and the Connection Pool',
    tagline: 'HikariCP sizing, and the failure that causes the most outages.',
    estimatedMinutes: 40,
    prerequisites: ['transactions-and-isolation'],
    docHub: { title: 'HikariCP', url: 'https://github.com/brettwooldridge/HikariCP' },

    chapters: [
        {
            id: 'jdbc-in-one-chapter',
            title: 'JDBC, in One Chapter',
            importance: 'should-know',
            summary: 'Five interfaces and one rule: every one of them must be closed, and PreparedStatement is not an optimisation.',
            interviewAngle: 'The SQL-injection question is the one that gets asked, and the answer worth giving explains the mechanism — the statement is parsed before the parameter is supplied, so the parameter cannot become syntax.',
            buildsOn: [],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The shape, and why the parameter cannot become SQL',
                    code: '// NEVER. The value becomes part of the statement text.\nString sql = "SELECT * FROM users WHERE email = \'" + email + "\'";\n//   email = "x\' OR \'1\'=\'1"  ->  the WHERE clause is now always true\n\n// Correct. try-with-resources closes all three, in reverse order.\nString sql = "SELECT id, name FROM users WHERE email = ?";\ntry (Connection c = dataSource.getConnection();\n     PreparedStatement ps = c.prepareStatement(sql)) {\n\n    ps.setString(1, email);\n\n    try (ResultSet rs = ps.executeQuery()) {\n        while (rs.next()) {\n            ...\n        }\n    }\n}',
                    output: {
                        kind: 'trace',
                        lines: [
                            'The statement text is sent to the database and parsed BEFORE any parameter is supplied. The plan is fixed at that point.',
                            'A parameter is then bound as a typed value into an already-parsed statement, so nothing in it can be interpreted as syntax -- quotes, semicolons and comment markers are just characters in a string.',
                            'This is why parameterisation is a correctness property and not an escaping trick. There is no input that defeats it, and no need to sanitise anything.',
                            'The performance benefit -- the database can reuse the plan -- is real and entirely secondary.'
                        ],
                        explain: '<p>The one thing parameters cannot do is stand in for an identifier: a table name, a column name, or a sort direction cannot be a bind parameter, because those are syntax rather than values. Dynamic sorting therefore has to be validated against an allow-list — which is exactly the point the filtering-and-sorting chapter made from the API side.</p>'
                    }
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Closing a pooled <code>Connection</code> does not close it — it returns it to the pool, and that is the point.</strong> The pool hands out a proxy whose <code>close()</code> means "I am finished with this". Which makes <em>not</em> closing it the serious bug: the connection is never returned, the pool shrinks by one, and after enough of those the application stops. try-with-resources is not a style preference here.</p>'
                }
            ],
            docs: [
                { title: 'JDBC Basics', url: 'https://docs.oracle.com/javase/tutorial/jdbc/basics/index.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'sql-databases', questionId: 'sql-injection' }
            ]
        },

        {
            id: 'jdbctemplate-and-jdbcclient',
            title: 'JdbcTemplate and JdbcClient',
            importance: 'should-know',
            summary: 'Spring\'s answer to JDBC boilerplate: resource handling and exception translation, with the SQL still yours. JdbcClient is the fluent successor.',
            interviewAngle: 'Comes up as "when would you not use JPA". Naming JdbcClient rather than only JdbcTemplate is a small currency signal, and knowing that exception translation is what @Repository provides ties back to the container module.',
            buildsOn: ['jdbc-in-one-chapter'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The same query, both ways',
                    code: '// JdbcTemplate. Positional arguments, and the mapper last.\nList<User> users = jdbcTemplate.query(\n        "SELECT id, name FROM users WHERE tenant_id = ? AND active = ?",\n        (rs, rowNum) -> new User(rs.getLong("id"), rs.getString("name")),\n        tenantId, true);\n\n// JdbcClient, Spring 6.1. Named parameters, and it reads in order.\nList<User> users = jdbcClient\n        .sql("SELECT id, name FROM users WHERE tenant_id = :t AND active = :a")\n        .param("t", tenantId)\n        .param("a", true)\n        .query(User.class)          // maps by column name to a record\n        .list();',
                    notes: '<p><code>JdbcClient</code> wraps both <code>JdbcTemplate</code> and <code>NamedParameterJdbcTemplate</code>, so it is one API instead of two and the mapper is optional for simple row types. <code>JdbcTemplate</code> is not deprecated and existing code needs no rewrite.</p>'
                },
                {
                    type: 'types',
                    title: 'What Spring adds over raw JDBC',
                    items: [
                        { name: 'Resource management', html: '<p>Connections, statements and result sets are opened and closed correctly. The leak from the previous chapter cannot happen.</p>' },
                        { name: 'Exception translation', html: '<p>A vendor <code>SQLException</code> with a numeric error code becomes a typed <code>DataAccessException</code> — <code>DuplicateKeyException</code>, <code>CannotAcquireLockException</code> — so application code can branch on the failure without knowing the engine.</p>' },
                        { name: 'Row mapping', html: '<p><code>RowMapper</code>, or automatic mapping to a record or bean by column name.</p>' },
                        { name: 'Transaction participation', html: '<p>It joins the transaction Spring already started, so it composes with <code>@Transactional</code> and with JPA in the same unit of work.</p>' },
                        { name: 'Batching', html: '<p><code>batchUpdate</code>, which is one round trip for many statements — and considerably faster than a loop for a bulk insert.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>The answer to when to use it: <em>"JPA for the aggregate — loading an entity, changing it, letting dirty checking write it. <code>JdbcClient</code> for reports, bulk statements, and anything where I want to see the SQL. They share a transaction and a connection, so mixing them in one service method is fine and does not need explaining away."</em></p>'
                }
            ],
            docs: [
                { title: 'Spring — JdbcClient', url: 'https://docs.spring.io/spring-framework/reference/data-access/jdbc/core.html', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'what-a-pool-is-for',
            title: 'What the Pool Is For',
            importance: 'must-know',
            summary: 'Opening a connection costs a TCP handshake, a TLS handshake and an authentication round trip. The pool reuses them — and, more importantly, bounds how many exist.',
            interviewAngle: 'The same shape as the thread-pool question, and the same better answer: reuse is the small reason, and the bound is the real one. A database has a hard connection limit and each connection costs it memory.',
            buildsOn: ['jdbc-in-one-chapter'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>Establishing a PostgreSQL connection means a TCP handshake, a TLS handshake, authentication, and — because PostgreSQL forks a backend process per connection — process creation on the server. Tens of milliseconds, against a query that may take one.</p><p>The bound matters more. <code>max_connections</code> is a hard server limit, and each backend reserves memory for sort and hash work, so a server sized for 200 connections does not degrade gracefully at 400 — it refuses them, or it swaps. Six application instances with a pool of fifty each is 300 connections, and nobody wrote that number down anywhere.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Multiply before deploying: <strong>pool size times instance count, plus the migration tool, plus whatever a human has open</strong>, against <code>max_connections</code>. This arithmetic is skipped almost every time an autoscaler is introduced, and the failure appears as connection refusals in the newest instances while the older ones are fine.</p>'
                }
            ],
            docs: [
                { title: 'PostgreSQL — Connection Settings', url: 'https://www.postgresql.org/docs/current/runtime-config-connection.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'sql-databases', questionId: 'connection-pool-sizing' }
            ]
        },

        {
            id: 'hikaricp-settings-that-matter',
            title: 'The HikariCP Settings',
            importance: 'must-know',
            summary: 'Six that decide behaviour under load, and the defaults are good — which is why the ones people change are usually the ones they should not.',
            interviewAngle: 'A practical recall question. Knowing that maximumPoolSize and connectionTimeout together determine what happens at overload, rather than just what they mean individually, is the level worth reaching.',
            buildsOn: ['what-a-pool-is-for'],
            blocks: [
                {
                    type: 'table',
                    title: 'The settings worth understanding',
                    headers: ['Property', 'Default', 'What it decides'],
                    rows: [
                        ['<code>maximumPoolSize</code>', '10', '<strong>Your real concurrency limit</strong> against the database'],
                        ['<code>minimumIdle</code>', '= max', 'Leave it. A fixed-size pool has no ramp-up latency'],
                        ['<code>connectionTimeout</code>', '30s', 'How long a caller waits for a connection before failing'],
                        ['<code>idleTimeout</code>', '10m', 'Only applies when <code>minimumIdle</code> is below max'],
                        ['<code>maxLifetime</code>', '30m', '<strong>Must be shorter</strong> than any database or firewall idle timeout'],
                        ['<code>leakDetectionThreshold</code>', 'off', 'Logs a stack trace for a connection held too long'],
                        ['<code>validationTimeout</code>', '5s', 'How long the aliveness check may take']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong><code>maxLifetime</code> must be shorter than every idle timeout between the application and the database.</strong> A cloud load balancer that silently drops idle TCP connections after five minutes leaves the pool holding connections that look fine and fail on first use — an intermittent, unreproducible "connection reset by peer" that appears under low traffic and disappears under load. Set <code>maxLifetime</code> below the shortest such timeout and the pool retires connections before anything else can kill them.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Raising <code>minimumIdle</code> above the default is one of the few genuinely counterproductive changes: HikariCP\'s recommendation is a <strong>fixed-size pool</strong>, with <code>minimumIdle</code> equal to <code>maximumPoolSize</code>, because a pool that shrinks then has to create connections during the traffic spike that made it grow. The default already does this.</p>'
                }
            ],
            docs: [
                { title: 'HikariCP — Configuration', url: 'https://github.com/brettwooldridge/HikariCP', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'sql-databases', questionId: 'connection-pool-sizing' }
            ]
        },

        {
            id: 'sizing-a-pool',
            title: 'How Big',
            importance: 'must-know',
            summary: 'Smaller than you think. A pool of ten frequently outperforms a pool of a hundred, because the database has a fixed number of cores and disks.',
            interviewAngle: 'Reliably asked, and the counter-intuitive direction is the answer. Being able to explain why a larger pool is slower — queueing inside the database instead of in front of it — is what makes it credible.',
            buildsOn: ['hikaricp-settings-that-matter'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>A database executing 100 concurrent queries on 8 cores is not doing 100 things at once. It is context-switching between 100 things, contending for locks and buffer pool latches, and each query is now competing for the shared memory it needs to sort and hash. The work still finishes at the rate the hardware allows; the only difference is that latency is now high for everyone rather than low for a bounded set.</p><p>A smaller pool queues the excess <em>in front of</em> the database, where it is visible, measurable, and does not slow down the queries that got through. That is the whole argument, and it is why HikariCP\'s own documentation argues for a pool an order of magnitude smaller than most teams configure.</p>'
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The formula, and the far more common bound',
                    code: '// The often-quoted starting point:\n//\n//     connections = ((core_count * 2) + effective_spindle_count)\n//\n// 8 cores, SSD-backed:  (8 * 2) + 1  =  17\n//\n// So a pool of 10 to 20 per instance, not 100.\n\n// THE BOUND THAT USUALLY DECIDES IT:\n//\n//     pool_size * instance_count  <  max_connections\n//\n// 6 instances * 50 = 300 against max_connections = 200. This is the\n// arithmetic nobody does before turning on the autoscaler.',
                    output: {
                        kind: 'trace',
                        lines: [
                            'The formula is a starting point for one instance and it is not the constraint that binds in a horizontally scaled deployment.',
                            'Under virtual threads the interaction changes again: the thread count is no longer the limit, so the pool becomes the only expression of concurrency the system has.',
                            'A pool that is too small shows up as connectionTimeout errors -- loud, attributable, and fixable.',
                            'A pool that is too large shows up as high latency on every query, an unhappy database, and no error anywhere. The failure that is easier to diagnose is the safer default.'
                        ],
                        explain: '<p>Where the connection count genuinely cannot be reduced — many instances, or serverless functions with one connection each — the answer is a proxy in front of the database: PgBouncer in transaction mode, or RDS Proxy. That multiplexes many client connections onto few server ones, and it comes with its own constraint, since session-level state such as prepared statements and advisory locks does not survive transaction pooling.</p>'
                    }
                }
            ],
            docs: [
                { title: 'HikariCP — About Pool Sizing', url: 'https://github.com/brettwooldridge/HikariCP/wiki/About-Pool-Sizing', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'sql-databases', questionId: 'connection-pool-sizing' }
            ]
        },

        {
            id: 'pool-exhaustion-symptoms',
            title: 'What Exhaustion Looks Like',
            importance: 'must-know',
            summary: 'A slow application and an idle database. That combination is the signature, and it is the one that sends people to look at the wrong thing.',
            interviewAngle: 'The best kind of question — a symptom, and the diagnosis. Naming the thread-dump signature, threads parked in getConnection, is what turns "I would check the pool" into a procedure.',
            buildsOn: ['sizing-a-pool'],
            blocks: [
                {
                    type: 'types',
                    title: 'The signature, in the order you see it',
                    items: [
                        { name: 'Latency rises across every endpoint', html: '<p>Including ones that touch no database, because they are queueing behind request threads that do.</p>' },
                        { name: '<strong>The database is idle</strong>', html: '<p>Low CPU, few active queries, no slow-query log entries. This is the clue that inverts the investigation: the bottleneck is in front of the database, not inside it.</p>' },
                        { name: 'Thread dumps show <code>getConnection</code>', html: '<p>Dozens of threads parked in <code>HikariPool.getConnection</code>. <strong>The definitive signature</strong> — one dump settles it.</p>' },
                        { name: 'Then timeouts, all at once', html: '<p><code>SQLTransientConnectionException: Connection is not available, request timed out after 30000ms</code>, on every request simultaneously.</p>' },
                        { name: 'Recovery is abrupt', html: '<p>Once the holder releases, everything drains at once. Which makes the incident look transient and the cause look like a network blip.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>The cause is usually one slow thing holding connections, not too much traffic.</strong> The classic is an HTTP call inside a transaction: a downstream service degrades from 50ms to 5 seconds, each request now holds its connection a hundred times longer, and a pool that comfortably served the load is exhausted at unchanged traffic. The second classic is <code>spring.jpa.open-in-view</code>, which holds the connection until the response is rendered. Neither shows up as a database problem, and both are fixed by shortening the hold rather than by enlarging the pool.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>HikariCP exposes Micrometer metrics and they are the ones to put on a dashboard before the incident: <code>hikaricp.connections.active</code>, <code>.pending</code>, and <code>.usage</code>. <strong><code>pending</code> above zero for any sustained period is the early warning</strong> — it means somebody waited — and it is visible long before the first timeout.</p>'
                }
            ],
            docs: [
                { title: 'Spring Boot — Metrics', url: 'https://docs.spring.io/spring-boot/reference/actuator/metrics.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'transactions', questionId: 'connection-pool-and-transactions' }
            ]
        },

        {
            id: 'leak-detection-threshold',
            title: 'Finding the Leak',
            importance: 'should-know',
            summary: 'One setting logs a stack trace for any connection held longer than a threshold, naming the code that took it.',
            interviewAngle: 'The follow-up to the previous chapter, and a concrete answer where most candidates offer a general one. It also has a cost worth knowing, which shows the setting has actually been used.',
            buildsOn: ['pool-exhaustion-symptoms'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'properties',
                    title: 'The setting, and the timeouts that go with it',
                    code: '# Log a stack trace for any connection held longer than this.\n# Minimum 2000ms. Set it above your slowest legitimate transaction.\nspring.datasource.hikari.leak-detection-threshold=20000\n\n# Fail fast when the pool is empty rather than tying up a request\n# thread for thirty seconds.\nspring.datasource.hikari.connection-timeout=3000\n\n# A backstop the database enforces, regardless of the application.\nspring.datasource.hikari.data-source-properties.socketTimeout=30\nspring.jpa.properties.jakarta.persistence.query.timeout=10000',
                    notes: '<p>Leak detection captures a stack trace when the connection is <em>acquired</em>, which is what makes the log useful — it names the method that took it, not the one that noticed. That capture has a cost, so leave the threshold generous rather than tight, and treat it as a diagnostic to enable during an investigation rather than a permanent setting on a hot path.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Lowering <code>connection-timeout</code> is worth doing on its own merits. Thirty seconds means a request thread is occupied for thirty seconds doing nothing, so an exhausted pool exhausts the thread pool too and the failure spreads to endpoints that never touch the database. Three seconds turns it into a fast 503 that a caller can retry, and contains the blast radius.</p>'
                }
            ],
            docs: [
                { title: 'HikariCP — Configuration', url: 'https://github.com/brettwooldridge/HikariCP', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'statement-timeouts',
            title: 'Bounding a Query',
            importance: 'should-know',
            summary: 'Four timeouts at four layers, and only the one the database enforces actually stops the work.',
            interviewAngle: 'A depth question with a satisfying answer: a JDBC-side timeout abandons the wait, and the query keeps running on the server holding its locks. Only a server-side statement timeout cancels it.',
            buildsOn: ['leak-detection-threshold'],
            blocks: [
                {
                    type: 'table',
                    title: 'The four, and what each actually does',
                    headers: ['Layer', 'Set with', 'Stops the query?'],
                    rows: [
                        ['Client wait', '<code>Statement.setQueryTimeout</code>', 'It asks the driver to cancel. Best effort'],
                        ['Socket', '<code>socketTimeout</code>', '<strong>No</strong> — the connection dies, the query continues'],
                        ['JPA query hint', '<code>jakarta.persistence.query.timeout</code>', 'Delegates to the driver. Same caveat'],
                        ['<strong>Server</strong>', '<code>statement_timeout</code>', '<strong>Yes.</strong> The database cancels and releases the locks']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A client-side timeout that gives up leaves the query running.</strong> The application returns an error, the connection is discarded, and the database is still executing — still holding locks, still consuming a worker, still blocking whatever was waiting behind it. Under a retry loop this compounds: each attempt adds another running query, and the database gets busier as the application gives up faster. <code>statement_timeout</code> on the server is the only one that ends the work.</p>'
                },
                {
                    type: 'syntax',
                    language: 'properties',
                    title: 'Setting the one that works, per connection',
                    code: '# Applied to every connection as it enters the pool.\nspring.datasource.hikari.connection-init-sql=SET statement_timeout = \'10s\'\n\n# And the transaction-level equivalent, which is separate and just as\n# important: it kills the idle-in-transaction sessions that block vacuum.\n# Set this one on the server, or per role.\n#   ALTER ROLE app SET idle_in_transaction_session_timeout = \'60s\';',
                    notes: '<p>A long-running report needs a higher limit than the default, and the right way to give it one is <code>SET LOCAL statement_timeout</code> inside that transaction — raising the global value to accommodate the slowest query removes the protection from every other one.</p>'
                }
            ],
            docs: [
                { title: 'PostgreSQL — Client Connection Defaults', url: 'https://www.postgresql.org/docs/current/runtime-config-client.html', kind: 'guide' }
            ],
            relatedQuestions: []
        }
    ]
};
