/* ==========================================================================
   data/theory/nosql-stores.js — module 55 in the reading path

   The one section 5.9 insertion into persistence, and it lands at the END
   of the track on purpose. Every chapter here is an argument about when NOT
   to use the relational database the previous thirteen modules taught, and
   that argument is only worth having once the reader knows what a relational
   database actually does — including the parts people reach for a document
   store to escape and would not have needed to.

   Eleven chapters. Four store families, then the three stores a Java backend
   engineer is genuinely asked about — MongoDB, Redis, Elasticsearch — then
   the two chapters that carry the module's position: keeping a search index
   in sync, which is the cost nobody quotes, and what polyglot persistence
   costs when the answer to "which store" is "both".

   Every claim about engine behaviour names its engine. Section 9's rule
   about dialect-dependent answers applies here more than anywhere else in
   the deck, because "NoSQL" is not a thing that behaves any particular way.
   ========================================================================== */

const nosqlStoresModule = {
    id: 'nosql-stores',
    trackId: 'persistence',
    order: 55,
    title: 'NoSQL and Polyglot Persistence',
    tagline: 'When not relational — and the cost of the answer "both".',
    estimatedMinutes: 45,
    prerequisites: ['schema-and-scale'],
    docHub: { title: 'Spring Data', url: 'https://spring.io/projects/spring-data' },

    chapters: [
        {
            id: 'the-store-families',
            title: 'The Four Families',
            importance: 'must-know',
            summary: 'Document, key-value, wide-column and graph. Each gives up something a relational database provides in order to buy something specific, and knowing what was given up is the whole of the choice.',
            interviewAngle: 'Listing the families is table stakes. Naming what each one surrendered — joins, ad-hoc queries, or both — is what makes the answer useful.',
            buildsOn: [],
            blocks: [
                {
                    type: 'table',
                    title: 'What each family trades away, and for what',
                    headers: ['Family', 'Model', 'Gives up', 'Buys'],
                    rows: [
                        ['Document', 'Self-contained JSON-ish documents', 'Joins across documents; cross-document transactions are expensive', 'Flexible shape; one read fetches a whole aggregate'],
                        ['Key-value', 'Opaque value under a key', 'Querying by anything but the key', 'Extremely fast point access; trivial partitioning'],
                        ['Wide-column', 'Rows partitioned by key, columns clustered within', 'Ad-hoc queries — you must know the access pattern first', 'Linear write scaling across many nodes'],
                        ['Graph', 'Nodes and edges as first-class things', 'Scaling out; a smaller ecosystem', 'Traversals that are exponential joins in SQL'],
                        ['<strong>Relational</strong>', 'Normalised tables', 'Horizontal write scaling without effort', 'Joins, ad-hoc queries, transactions, constraints']
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>The framing that makes this a decision rather than a taxonomy: <strong>a relational database is the one that does not require you to know your queries in advance.</strong> Normalise the data and any question can be asked later, at some cost. Every other family asks you to decide the access pattern first and rewards you for having decided correctly.</p><p>That is why "we chose MongoDB because we did not know the schema yet" is exactly backwards. Not knowing the shape of your data is an argument <em>for</em> the store that can answer questions you have not thought of.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>PostgreSQL 16 has a <code>jsonb</code> column type with GIN indexing, and it removes the schema-flexibility argument for a great many projects.</strong> You can store a document, index a path inside it, query it, and still have joins, transactions and constraints for the parts of the model that are relational. The honest comparison is not "Postgres versus Mongo" but "Postgres with a jsonb column versus Mongo", and that is a much closer contest than the usual framing suggests.</p>'
                }
            ],
            docs: [
                { title: 'PostgreSQL 16 — JSON Types', url: 'https://www.postgresql.org/docs/16/datatype-json.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'nosql', questionId: 'when-not-to-use-a-relational-database' },
                { topicId: 'nosql', questionId: 'choosing-a-store' }
            ]
        },

        {
            id: 'document-modelling',
            title: 'Modelling a Document',
            importance: 'must-know',
            summary: 'Model the read. A document should be the thing one screen or one API response needs, because fetching it is one operation and joining is not available.',
            interviewAngle: 'The relational instinct — normalise first — produces bad document models. Saying so, and describing the query-first approach instead, is the substance of the answer.',
            buildsOn: ['the-store-families'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>Relational modelling starts from the data and derives the queries. Document modelling runs the other way: start from the queries, and design documents so that each common read is one lookup by key or by an indexed field.</p><p>The consequence is that <strong>duplication is normal</strong>. An order document holding the customer\'s name at the time of the order is not a normalisation failure; it is a correct model of a fact that must not change when the customer later marries. Distinguishing "duplicated because I was lazy" from "duplicated because it is a snapshot" is the skill.</p>'
                },
                {
                    type: 'syntax',
                    language: 'json',
                    title: 'One read, one document',
                    code: '{\n  "_id": "ord_8812",\n  "reference": "AC-2026-8812",\n  "placedAt": "2026-03-14T09:12:07Z",\n  "status": "SHIPPED",\n\n  "customer": {\n    "id": "cus_419",\n    "name": "R. Iyer",\n    "email": "r.iyer@example.com"\n  },\n\n  "lines": [\n    { "sku": "KB-71", "name": "Keyboard", "qty": 1, "unitMinor": 429900 },\n    { "sku": "MS-12", "name": "Mouse",    "qty": 2, "unitMinor":  89900 }\n  ],\n\n  "totalMinor": 609700,\n  "currency": "INR"\n}',
                    notes: '<p>The customer name and the line item names are duplicated from their own collections, deliberately: an invoice must show what was bought and who bought it <em>at the time</em>, so a later rename must not alter history. The same reasoning applies in a relational schema to an <code>order_line</code> that stores the price — and it is exactly the kind of denormalisation people accept there and call a mistake here.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Write the three or four queries the application will actually run before designing anything. If the answer to each is "one document, fetched by <code>_id</code> or by one indexed field", the model is right. If any of them needs data from three collections, either the model is wrong or the workload is relational — and the second possibility deserves a serious hearing.</p>'
                }
            ],
            docs: [
                { title: 'MongoDB — Data Modeling', url: 'https://www.mongodb.com/docs/manual/data-modeling/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'nosql', questionId: 'embed-or-reference' }
            ]
        },

        {
            id: 'embed-vs-reference',
            title: 'Embed or Reference',
            importance: 'must-know',
            summary: 'Embed when the child is owned, bounded and read with the parent. Reference when it is shared, unbounded, or updated on its own schedule.',
            interviewAngle: 'The central document-modelling question, and it has a checkable answer. The unbounded-growth case is the one that decides it, because MongoDB has a hard 16 MB document limit.',
            buildsOn: ['document-modelling'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'The decision',
                    left: 'Embed',
                    right: 'Reference',
                    rows: [
                        { aspect: 'Lifecycle', left: 'The child dies with the parent — order lines', right: 'Independent — a customer outlives an order' },
                        { aspect: 'Cardinality', left: 'Bounded and small — addresses, line items', right: '<strong>Unbounded — comments, events, audit rows</strong>' },
                        { aspect: 'Read pattern', left: 'Always read with the parent', right: 'Often read on its own' },
                        { aspect: 'Write pattern', left: 'Written with the parent', right: 'Updated independently, and by other parents too' },
                        { aspect: 'Atomicity', left: 'Free — one document update is atomic', right: 'Needs a multi-document transaction, or a design that avoids one' },
                        { aspect: 'Cost of getting it wrong', left: 'A document that grows without limit and hits 16 MB', right: 'An extra round trip per read, forever' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Unbounded embedding is the defining MongoDB mistake.</strong> Comments on a post, events on a device, messages in a conversation: each one is natural to embed and each one grows without limit. MongoDB caps a document at 16 MB, and long before that, every update rewrites the whole document and every read transfers it. The rule that avoids it: <strong>if the array can grow from user activity, it is a separate collection.</strong></p>'
                },
                {
                    type: 'tip',
                    html: '<p>The hybrid is often the right answer and it is worth naming: embed the last <em>n</em> — the five most recent comments, the current shipping address — for the common read, and keep the full history in its own collection for the rare one. It is a cache inside the document, with the same invalidation obligations as any other cache, and it is a deliberate design rather than an accident.</p>'
                }
            ],
            docs: [
                { title: 'MongoDB — Embedded Data Models', url: 'https://www.mongodb.com/docs/manual/core/data-model-design/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'nosql', questionId: 'embed-or-reference' }
            ]
        },

        {
            id: 'mongodb-indexes-and-queries',
            title: 'MongoDB Indexes',
            importance: 'should-know',
            summary: 'B-trees, the same as a relational index, with the same column-order rule — and one extra rule for arrays that has no relational equivalent.',
            interviewAngle: 'The ESR rule (equality, sort, range) is the memorable, checkable piece of knowledge here, and it is the direct analogue of composite-index column order.',
            buildsOn: ['embed-vs-reference'],
            blocks: [
                {
                    type: 'types',
                    title: 'The index types worth knowing',
                    items: [
                        { name: 'Single field and compound', html: '<p>B-tree, exactly as in PostgreSQL. A compound index can serve a query on a <em>prefix</em> of its fields and not on a suffix — the same rule as a relational composite index.</p>' },
                        { name: 'Multikey', html: '<p>An index on an array field indexes <strong>every element</strong>. Powerful, and it makes an index on a large array expensive to maintain. Only one array field per compound index is permitted.</p>' },
                        { name: 'Text', html: '<p>Basic full-text search. One text index per collection, and it is much weaker than a dedicated search engine — see the Elasticsearch chapters.</p>' },
                        { name: 'TTL', html: '<p>An index on a date field with <code>expireAfterSeconds</code>. A background task deletes expired documents roughly once a minute — the right tool for sessions and short-lived events, and not precise enough for anything requiring exact expiry.</p>' },
                        { name: 'Partial and sparse', html: '<p>Index only the documents matching a filter. The analogue of a partial index in PostgreSQL, and just as useful for a mostly-null field.</p>' }
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>The <strong>ESR rule</strong> is the order to put fields in a compound index: <strong>Equality first, then Sort, then Range.</strong> Equality fields narrow to a contiguous span of the index; the sort field then delivers rows already ordered so no in-memory sort is needed; the range field is scanned last because a range cannot be followed by a useful equality.</p><p>Getting it wrong produces the same symptom as a badly ordered composite index in PostgreSQL: the index is used, and an in-memory sort appears in the plan anyway. <code>explain("executionStats")</code> shows it, and <code>SORT</code> appearing as a stage is the tell.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>MongoDB will happily run a collection scan and return the right answer.</strong> There is no error and no warning; the query is just slow, and it stays fast in development where the collection has two hundred documents. Enable the profiler or check <code>explain</code> for <code>COLLSCAN</code> as a matter of routine — it is the same discipline as reading a query plan, and it is skipped far more often here because nothing forces it.</p>'
                }
            ],
            docs: [
                { title: 'MongoDB — Indexes', url: 'https://www.mongodb.com/docs/manual/indexes/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'nosql', questionId: 'mongodb-indexes' },
                { topicId: 'sql-databases', questionId: 'composite-index-column-order' }
            ]
        },

        {
            id: 'spring-data-mongodb',
            title: 'Spring Data MongoDB',
            importance: 'should-know',
            summary: 'The same repository abstraction as JPA over a store with no persistence context, no dirty checking and no lazy loading — which removes several problems and one useful feature.',
            interviewAngle: 'The comparison is the answer. Knowing that save() is a full replacement rather than a dirty-check makes the lost-update risk obvious.',
            buildsOn: ['mongodb-indexes-and-queries'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'The same abstraction over a different engine',
                    left: 'Spring Data JPA',
                    right: 'Spring Data MongoDB',
                    rows: [
                        { aspect: 'Identity map / persistence context', left: 'Yes', right: '<strong>No.</strong> Two loads give two objects.' },
                        { aspect: 'Dirty checking', left: 'Yes — a modified managed entity is flushed', right: 'No. You call <code>save</code> explicitly.' },
                        { aspect: 'What <code>save</code> does', left: 'Merges the changed fields', right: '<strong>Replaces the whole document</strong>' },
                        { aspect: 'Lazy loading', left: 'Yes, with all its hazards', right: 'No. <code>@DBRef</code> exists and is best avoided.' },
                        { aspect: 'Derived query methods', left: 'Yes', right: 'Yes — the same naming rules' },
                        { aspect: 'Transactions', left: 'Everywhere', right: 'Multi-document transactions since MongoDB 4.0, on a replica set, and they are not cheap' }
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The lost update that save() invites, and the fix',
                    code: 'interface OrderRepository extends MongoRepository<Order, String> {\n    List<Order> findByStatusAndPlacedAtAfter(Status status, Instant after);\n}\n\n// LOST UPDATE. Read, modify, write-the-whole-document. Anything another\n// process changed between the read and the save is silently reverted.\nOrder order = repository.findById(id).orElseThrow();\norder.setStatus(SHIPPED);\nrepository.save(order);              // replaces every field\n\n// Fix 1: a targeted update. Touches one field, races with nothing.\nmongoTemplate.updateFirst(\n        query(where("_id").is(id).and("status").is(CONFIRMED)),\n        new Update().set("status", SHIPPED).currentDate("shippedAt"),\n        Order.class);\n\n// Fix 2: optimistic locking. @Version works here exactly as in JPA --\n// save() adds the version to the query and throws if it has moved.\n@Document("orders")\nclass Order {\n    @Id String id;\n    @Version Long version;\n}',
                    notes: '<p>The <code>and("status").is(CONFIRMED)</code> in the first fix is doing two jobs: it targets the update and it makes it a conditional write, so a transition from an unexpected state matches nothing and updates nothing. That is a compare-and-set at the database, and it is the cheapest correct answer for a state machine.</p>'
                }
            ],
            docs: [
                { title: 'Spring Data MongoDB', url: 'https://docs.spring.io/spring-data/mongodb/reference/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'nosql', questionId: 'spring-data-mongodb' },
                { topicId: 'nosql', questionId: 'mongodb-transactions-and-consistency' }
            ]
        },

        {
            id: 'redis-as-a-data-store',
            title: 'Redis Is Not Just a Cache',
            importance: 'should-know',
            summary: 'Strings, hashes, lists, sets, sorted sets, streams and HyperLogLog. Each data structure makes a specific problem trivial, and the sorted set makes three of them trivial.',
            interviewAngle: 'Naming the structures and matching them to problems — a leaderboard, a rate limiter, a delayed queue — is much stronger than describing Redis as fast key-value storage.',
            buildsOn: ['spring-data-mongodb'],
            blocks: [
                {
                    type: 'table',
                    title: 'The structures, and what each one solves outright',
                    headers: ['Structure', 'Operations', 'The problem it solves'],
                    rows: [
                        ['String', '<code>GET</code>, <code>SET</code>, <code>INCR</code>, <code>SETNX</code>', 'Cache entries; counters; a lock via <code>SET key val NX PX</code>'],
                        ['Hash', '<code>HGET</code>, <code>HSET</code>, <code>HINCRBY</code>', 'An object with independently updatable fields — a session'],
                        ['List', '<code>LPUSH</code>, <code>BRPOP</code>', 'A simple work queue with a blocking pop'],
                        ['Set', '<code>SADD</code>, <code>SINTER</code>, <code>SISMEMBER</code>', 'Membership; tag intersection; deduplication'],
                        ['<strong>Sorted set</strong>', '<code>ZADD</code>, <code>ZRANGE</code>, <code>ZRANGEBYSCORE</code>', '<strong>Leaderboards, sliding-window rate limits, delayed queues — score as a timestamp</strong>'],
                        ['Stream', '<code>XADD</code>, <code>XREADGROUP</code>', 'An append-only log with consumer groups — a small Kafka'],
                        ['HyperLogLog', '<code>PFADD</code>, <code>PFCOUNT</code>', 'Approximate distinct counts in 12 KB regardless of cardinality']
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>Redis executes commands on a single thread, which is why every individual command is atomic and why there is never a race between two clients doing <code>INCR</code>. It also means a slow command blocks everything — <code>KEYS *</code> on a large database is a production incident, and <code>SCAN</code> exists because of it.</p><p>For anything needing several commands to be atomic together, a Lua script is the mechanism: Redis runs the whole script on that single thread with no interleaving, which is how a correct sliding-window rate limiter or a check-and-set across two keys is written.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A Redis lock is not a correct distributed lock, and using one as though it were is a known way to lose data.</strong> A client can hold the lock, stall — a garbage-collection pause is enough — have its key expire, and continue working while a second client holds the same lock. Redlock reduces the window and does not close it. Use it for optimisation — "probably only one worker does this" — and never as the only thing standing between two writers and a corrupted record. The distributed track returns to this.</p>'
                }
            ],
            docs: [
                { title: 'Redis — Data types', url: 'https://redis.io/docs/latest/develop/data-types/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'caching-scale', questionId: 'redis-beyond-a-cache' },
                { topicId: 'caching-scale', questionId: 'distributed-locks' }
            ]
        },

        {
            id: 'redis-persistence-and-eviction',
            title: 'Redis Persistence and Eviction',
            importance: 'should-know',
            summary: 'RDB snapshots, AOF append-only logging, or both. And a maxmemory policy that decides whether a full Redis evicts data or starts refusing writes.',
            interviewAngle: 'The eviction-policy question is the practical one: the default refuses writes when memory is full, which surprises teams using Redis as a cache.',
            buildsOn: ['redis-as-a-data-store'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'The two persistence mechanisms',
                    left: 'RDB (snapshot)',
                    right: 'AOF (append-only file)',
                    rows: [
                        { aspect: 'What it writes', left: 'A point-in-time dump of the dataset', right: 'Every write command, appended' },
                        { aspect: 'Data loss on crash', left: 'Everything since the last snapshot — minutes', right: 'Up to one second with the default <code>everysec</code> fsync' },
                        { aspect: 'Restart time', left: 'Fast — load one compact file', right: 'Slower — replay the log' },
                        { aspect: 'Cost while running', left: 'A fork, which briefly doubles memory in the worst case', right: 'A continuous write, plus periodic rewriting' },
                        { aspect: 'Typical choice', left: 'Cache, or a replica used for backup', right: 'Anything where losing minutes of writes is unacceptable' },
                        { aspect: 'Both together', left: 'Supported and common', right: 'AOF is used for recovery, RDB for backups' }
                    ]
                },
                {
                    type: 'table',
                    title: 'maxmemory-policy, and the default that surprises people',
                    headers: ['Policy', 'Behaviour when memory is full'],
                    rows: [
                        ['<code>noeviction</code>', '<strong>The default.</strong> Writes fail with an error; reads keep working'],
                        ['<code>allkeys-lru</code>', 'Evict the least recently used key from the whole keyspace — the usual cache setting'],
                        ['<code>allkeys-lfu</code>', 'Evict the least <em>frequently</em> used. Better when access is skewed and a scan should not flush the hot set'],
                        ['<code>volatile-lru</code>', 'Evict only among keys that have a TTL set'],
                        ['<code>volatile-ttl</code>', 'Evict the key closest to expiring'],
                        ['<code>allkeys-random</code>', 'Cheap, and worse than LRU at almost everything']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A Redis used as both a cache and a data store cannot have a correct eviction policy.</strong> <code>allkeys-lru</code> will eventually evict the session, the lock or the queue; <code>noeviction</code> will make cache writes fail once the store fills. There is no setting that serves both, and the answer is two Redis instances — or two logical databases with separate memory limits — rather than a cleverer policy.</p>'
                }
            ],
            docs: [
                { title: 'Redis — Persistence', url: 'https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/', kind: 'guide' },
                { title: 'Redis — Key eviction', url: 'https://redis.io/docs/latest/develop/reference/eviction/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'nosql', questionId: 'redis-persistence-and-failure' },
                { topicId: 'caching-scale', questionId: 'eviction-policies' }
            ]
        },

        {
            id: 'inverted-index-and-elasticsearch',
            title: 'The Inverted Index',
            importance: 'should-know',
            summary: 'A map from term to the documents containing it, built by analysing text into tokens. It is why a search engine can rank, and why LIKE %term% never can.',
            interviewAngle: 'The analysis pipeline is the mechanism worth describing: the same analyzer must run at index time and at query time, and mismatched analyzers are the commonest cause of "why does my search find nothing".',
            buildsOn: ['redis-persistence-and-eviction'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>A relational index maps a whole column value to rows, so it can answer "equals" and "starts with" and nothing else — <code>LIKE \'%wireless%\'</code> cannot use it and scans the table. An <strong>inverted index</strong> maps each <em>term</em> to the documents containing it, so "wireless" finds every document with that token regardless of position.</p><p>Getting there requires <strong>analysis</strong>: the text is split into tokens, lower-cased, stripped of stop words, and reduced to stems, so that "Running Shoes" and "run shoe" produce the same terms. The index also stores term frequencies, which is what lets it <em>rank</em> — the property a database index has no way to provide.</p>'
                },
                {
                    type: 'types',
                    title: 'What a search engine gives you that a database index does not',
                    items: [
                        { name: 'Relevance ranking', html: '<p>BM25 scoring by term frequency and rarity. A database returns matching rows in some order; a search engine returns them best-first.</p>' },
                        { name: 'Fuzzy and phonetic matching', html: '<p>Edit distance for typos, phonetic analysers for names. "Recieve" finds "receive".</p>' },
                        { name: 'Faceting and aggregation', html: '<p>Counts per category, computed alongside the results — the sidebar on every e-commerce search page.</p>' },
                        { name: 'Highlighting', html: '<p>The matched fragment, with the term marked, returned with the hit.</p>' },
                        { name: 'Analyser control', html: '<p>Per-field language, synonyms, and n-grams for autocomplete.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>PostgreSQL 16 has full-text search with <code>tsvector</code>, GIN indexes and <code>ts_rank</code>, and it is enough for a great many applications.</strong> It handles stemming, stop words and ranking; what it does not do well is faceting at scale, per-field analysers, fuzzy matching and multi-language documents. Introducing a second datastore is a large operational commitment, and the previous chapter\'s question applies: try the database you already run first, and adopt a search engine when you can name the feature it is for.</p>'
                }
            ],
            docs: [
                { title: 'Elasticsearch — Text analysis', url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/analysis.html', kind: 'guide' },
                { title: 'PostgreSQL 16 — Full Text Search', url: 'https://www.postgresql.org/docs/16/textsearch.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'nosql', questionId: 'inverted-index-and-search' }
            ]
        },

        {
            id: 'keeping-a-search-index-in-sync',
            title: 'Keeping the Index in Sync',
            importance: 'must-know',
            summary: 'The cost nobody quotes when adopting a search engine. The database is the source of truth and the index is a derived copy, and every mechanism for keeping them together has a failure mode.',
            interviewAngle: 'This is the systems-design half of the search question, and it is where the dual-write problem appears for the first time in the deck — which is exactly what the distributed track builds on.',
            buildsOn: ['inverted-index-and-elasticsearch'],
            blocks: [
                {
                    type: 'table',
                    title: 'Four ways to do it, and how each one fails',
                    headers: ['Approach', 'How', 'Fails when'],
                    rows: [
                        ['Dual write', 'Write the database and the index in the same method', '<strong>Either write fails after the other succeeded.</strong> Not a transaction; cannot be made into one.'],
                        ['Write, then publish an event', 'Commit, then publish; a consumer indexes', 'The publish fails after the commit — unless the outbox pattern is used'],
                        ['Transactional outbox', 'Write the row and an outbox row in one transaction; a relay publishes', 'Nothing silently. Adds a relay to operate. <strong>The correct answer.</strong>'],
                        ['Change data capture', 'Read the database\'s replication log with Debezium', 'Nothing silently. Adds a connector and a schema-change discipline.'],
                        ['Periodic full reindex', 'Rebuild from scratch on a schedule', 'Stale between runs; expensive; and it is the necessary backstop for all of the above']
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>Dual write is what everybody writes first and it is unfixable by ordering. Index first and a failed commit leaves a document for an order that does not exist; commit first and a failed index leaves an order nobody can find. Wrapping both in <code>@Transactional</code> does not help — the search engine is not in the transaction, so the rollback does not reach it.</p><p><strong>This is the dual-write problem</strong>, and it is the same shape as writing to a database and publishing to Kafka. The distributed track gives it a module; the reason it appears here is that "add search" is the most common way a team meets it, usually without recognising it.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Whatever the mechanism, <strong>have a reindex path and run it</strong>. Indices get corrupted, mappings change, consumers have bugs, and a full rebuild from the source of truth is the only recovery that does not require knowing what went wrong. Build it on day one, when the data is small enough that it takes a minute.</p>'
                }
            ],
            docs: [
                { title: 'Debezium — Connectors', url: 'https://debezium.io/documentation/reference/stable/connectors/index.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'nosql', questionId: 'inverted-index-and-search' },
                { topicId: 'microservices', questionId: 'transactional-outbox' }
            ]
        },

        {
            id: 'polyglot-persistence-and-its-cost',
            title: 'What "Both" Costs',
            importance: 'must-know',
            summary: 'Each additional datastore adds a backup story, a monitoring story, an upgrade story, an on-call story, a consistency story, and a body of expertise the team must maintain.',
            interviewAngle: 'Arguing against adding a datastore, with the costs enumerated, is a stronger senior signal than knowing five of them.',
            buildsOn: ['keeping-a-search-index-in-sync'],
            blocks: [
                {
                    type: 'types',
                    title: 'What arrives with the second store',
                    items: [
                        { name: 'Operations', html: '<p>Backups, and a <em>tested restore</em>. Version upgrades. Capacity planning. Failover. Multiply by the number of environments.</p>' },
                        { name: 'Observability', html: '<p>Its own metrics, its own dashboards, its own alert thresholds, and somebody who knows what normal looks like.</p>' },
                        { name: 'Consistency', html: '<p>The previous chapter, once per pair of stores. Data now exists in two places and can disagree.</p>' },
                        { name: 'Expertise', html: '<p>Somebody must know its failure modes at 3am. One person knowing it is a single point of failure; the whole team knowing it is a training cost.</p>' },
                        { name: 'Local development and CI', html: '<p>Another container in every developer\'s compose file and every test run. Slower feedback for everyone, forever.</p>' },
                        { name: 'Transactions', html: '<p>Gone across the boundary. Every cross-store operation needs a saga, an outbox or an accepted inconsistency.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>The most common polyglot architecture is one nobody chose.</strong> Redis arrived for caching, then held sessions; MongoDB arrived for one feature\'s flexible schema; Elasticsearch arrived for search. Each decision was locally reasonable and the result is four datastores, four backup stories and no single place that knows the truth about an order. The question to ask each time is not "is this store good for this" but <em>"is it better than what we already run, by enough to pay for a fifth thing to operate at 3am"</em>.</p>'
                }
            ],
            docs: [
                { title: 'PolyglotPersistence', url: 'https://martinfowler.com/bliki/PolyglotPersistence.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'nosql', questionId: 'polyglot-persistence-cost' }
            ]
        },

        {
            id: 'choosing-a-store',
            title: 'Choosing',
            importance: 'must-know',
            summary: 'Start relational. Add a store when you can name the property the relational database cannot provide, and check first whether PostgreSQL already provides it.',
            interviewAngle: 'The closing answer for the whole persistence track. A default, a set of exceptions, and the honesty that most of the exceptions have shrunk as PostgreSQL has grown.',
            buildsOn: ['polyglot-persistence-and-its-cost'],
            blocks: [
                {
                    type: 'table',
                    title: 'The reasons that genuinely justify a second store',
                    headers: ['The property you need', 'Store', 'Check first'],
                    rows: [
                        ['Sub-millisecond point reads at high volume', 'Redis', 'Is the database slow, or is there no index?'],
                        ['Millions of writes per second across many nodes', 'Cassandra / DynamoDB', 'Is a partitioned PostgreSQL enough? Usually, until it is very much not.'],
                        ['Ranked full-text search with faceting', 'Elasticsearch / OpenSearch', 'PostgreSQL 16 <code>tsvector</code> plus GIN handles a lot of this'],
                        ['Deep graph traversal', 'Neo4j', 'A recursive CTE handles three or four levels comfortably'],
                        ['Genuinely variable document shape', 'MongoDB', '<code>jsonb</code> with a GIN index, and keep transactions'],
                        ['Time-series at scale', 'TimescaleDB / ClickHouse', 'TimescaleDB <em>is</em> PostgreSQL, which makes it the cheapest step'],
                        ['A durable, replayable event log', 'Kafka', 'An outbox table plus a relay, if the volume is moderate']
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>The answer that holds up under follow-ups: <em>"PostgreSQL by default, because it gives me transactions, constraints, joins and ad-hoc queries, and because I only have to operate one thing well. I add a store when I can name the property Postgres cannot give me — ranked search with facets, sub-millisecond reads at very high volume, linear write scaling — and when that property is worth a second backup story, a second on-call runbook and a consistency problem between the two. Most of the time it is not."</em></p>'
                }
            ],
            docs: [
                { title: 'PostgreSQL 16 — Documentation', url: 'https://www.postgresql.org/docs/16/index.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'nosql', questionId: 'choosing-a-store' },
                { topicId: 'nosql', questionId: 'when-not-to-use-a-relational-database' }
            ]
        }
    ]
};
