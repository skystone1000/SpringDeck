/* ==========================================================================
   data/nosql.js — NoSQL: MongoDB, Redis & Search

   Flat, on the `persistence` track. It sits after sql-databases in the
   sidebar deliberately: almost every question here is answered by comparison
   with the relational model, and a reader who has not met that comparison
   yet gets less from it.

   THE POSITION THIS TOPIC TAKES, stated once here so the individual answers
   do not each have to argue it: start relational. Postgres does JSON,
   full-text search, and more scale than most systems will ever need. A second
   store should be a decision with a reason, and "NoSQL is faster" is not one.
   The questions are written so that a candidate who agrees can say why, and
   one who disagrees has something concrete to disagree with.

   ONE GLOBAL PER FILE.
   ========================================================================== */

const nosqlData = {
    id: 'nosql',
    title: 'NoSQL: MongoDB, Redis & Search',
    subsections: null,
    keyTopics: [
        'when not relational', 'document modelling', 'embed vs reference',
        'MongoDB indexes', 'Spring Data MongoDB', 'Redis beyond caching',
        'Redis persistence and eviction', 'Elasticsearch basics', 'inverted index',
        'polyglot persistence and its cost', 'choosing a store'
    ],
    questions: [

{
    id: 'when-not-to-use-a-relational-database',
    importance: 'must-know',
    subsection: null,
    question: 'When would you choose something other than a relational database?',
    answer:
        '<p>The honest starting position is that <strong>the default should be relational</strong>, ' +
        'and the burden of proof is on the alternative. Postgres has JSONB with indexes, full-text ' +
        'search, arrays, and vertical headroom well past what most systems reach. A second store ' +
        'is a second thing to operate, back up, monitor and staff.</p>' +
        '<p>The reasons that do justify one:</p>' +
        '<ul>' +
        '<li><strong>The access pattern is a single aggregate, always read whole.</strong> A ' +
        'document store fits a product catalogue entry or a user profile better than six joined ' +
        'tables, and the win is modelling clarity rather than speed.</li>' +
        '<li><strong>The schema genuinely varies per record</strong> — user-defined fields, ' +
        'heterogeneous events, third-party payloads whose shape you do not control.</li>' +
        '<li><strong>Write volume beyond one primary.</strong> Relational databases scale reads ' +
        'with replicas and writes with one node. When writes exceed that, a store designed for ' +
        'horizontal write scaling — Cassandra, DynamoDB — is a genuine architectural difference ' +
        'rather than a tuning one.</li>' +
        '<li><strong>Search.</strong> Relevance ranking, fuzzy matching, faceting and typo ' +
        'tolerance are what a search engine does and what SQL <code>LIKE</code> does not.</li>' +
        '<li><strong>A data shape with no good relational answer</strong> — deep graph traversal, ' +
        'time series at high cardinality.</li>' +
        '</ul>' +
        '<p>The reasons that are not reasons: "it is schemaless, so we can move faster" — the ' +
        'schema moves into the application and stops being validated anywhere; "it scales" — so ' +
        'does Postgres, past the point most teams reach; and "we might need it later", which is ' +
        'how a system acquires four datastores and one person who understands each.</p>',
    referenceLinks: [
        { title: 'PostgreSQL 16 — JSON Types and Functions', url: 'https://www.postgresql.org/docs/16/datatype-json.html' }
    ],
    tags: ['nosql', 'architecture', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'embed-or-reference',
    importance: 'must-know',
    subsection: null,
    question: 'In a document database, when do you embed and when do you reference?',
    answer:
        '<p>This is the central modelling decision, and the relational instinct — normalise ' +
        'everything — produces bad document models.</p>' +
        '<p><strong>Embed when all three hold:</strong></p>' +
        '<ul>' +
        '<li><strong>Read together.</strong> If you never want the parent without the child, ' +
        'embedding turns two queries into one.</li>' +
        '<li><strong>Bounded.</strong> A handful, or a few dozen. Not "comments on a post", which ' +
        'grows without limit.</li>' +
        '<li><strong>Owned.</strong> The child has no independent life and is not shared.</li>' +
        '</ul>' +
        '<p><strong>Reference when</strong> the relationship is many-to-many, the child is large ' +
        'or unbounded, the child is updated far more often than the parent, or the child is ' +
        'queried on its own.</p>' +
        '<p>Two hard limits that decide arguments. A MongoDB document is capped at ' +
        '<strong>16MB</strong>, so an unbounded embedded array is a time bomb that fires when one ' +
        'popular record exceeds it. And a document that <strong>grows</strong> after insertion ' +
        'costs rewrites and index churn, so an append-heavy array is a poor embed even well ' +
        'inside the limit.</p>' +
        '<p>The middle ground worth naming is <strong>the extended reference</strong>: store the ' +
        'id <em>plus the two or three fields you always display</em> — an author id and their ' +
        'name. It removes the lookup for the common read and duplicates data you must then keep ' +
        'in step. That is a deliberate denormalisation, and the follow-up question is always ' +
        '"what happens when the author renames themselves", which needs an answer.</p>' +
        '<p>The rule underneath all of it: <strong>model for the queries, not for the ' +
        'entities.</strong> Relational modelling describes the data and lets the query planner ' +
        'work it out; document modelling starts from the reads.</p>',
    referenceLinks: [
        { title: 'MongoDB — Data Model Design', url: 'https://www.mongodb.com/docs/manual/core/data-model-design/' }
    ],
    tags: ['mongodb', 'modelling', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'mongodb-indexes',
    importance: 'should-know',
    subsection: null,
    question: 'How do MongoDB indexes differ from relational ones?',
    answer:
        '<p>Less than people expect. They are B-trees, the compound-index prefix rule is the ' +
        'same, and a query that cannot use one does a collection scan. What is worth knowing is ' +
        'the handful of index types with no direct SQL equivalent, and one ordering rule.</p>' +
        '<ul>' +
        '<li><strong>Multikey</strong> — an index on an array field indexes every element, which ' +
        'is what makes <code>{ tags: "java" }</code> fast. One consequence: an index can have at ' +
        'most one multikey field, because the cross product would explode.</li>' +
        '<li><strong>Partial</strong> — indexes only documents matching a filter. The right tool ' +
        'for a field present on 2% of documents, and much better than a sparse index, which it ' +
        'supersedes.</li>' +
        '<li><strong>TTL</strong> — a background job deletes documents once a date field is old ' +
        'enough. Self-expiring sessions and events with no cron job to write.</li>' +
        '<li><strong>Text</strong> and <strong>wildcard</strong> — basic search, and indexing ' +
        'fields whose names you do not know in advance.</li>' +
        '</ul>' +
        '<p><strong>The ESR rule</strong> is the compound-index ordering guidance and it is worth ' +
        'quoting: <strong>Equality, then Sort, then Range</strong>. Fields matched exactly go ' +
        'first, then fields used for sorting, then range predicates. Getting it wrong produces an ' +
        'index that filters but cannot serve the sort, so Mongo sorts in memory and fails past ' +
        '32MB unless it can spill to disk.</p>' +
        '<p>The diagnostic tool is <code>explain("executionStats")</code>, and the numbers to ' +
        'read are the same two as in any database: <strong>documents examined versus documents ' +
        'returned</strong>. A ratio near 1 is a good index; a large ratio is a scan wearing an ' +
        'index\'s clothes. <code>COLLSCAN</code> in the winning plan is the equivalent of a ' +
        'sequential scan.</p>',
    referenceLinks: [
        { title: 'MongoDB — Indexes', url: 'https://www.mongodb.com/docs/manual/indexes/' }
    ],
    tags: ['mongodb', 'indexes', 'performance'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'mongodb-transactions-and-consistency',
    importance: 'should-know',
    subsection: null,
    question: 'Does MongoDB support transactions? Should you use them?',
    answer:
        '<p>Yes — multi-document ACID transactions since <strong>4.0</strong> on a replica set ' +
        'and <strong>4.2</strong> across shards. So "MongoDB has no transactions" is a dated ' +
        'answer.</p>' +
        '<p>But the more useful answer is that <strong>needing them often means the model is ' +
        'wrong</strong>. A well-designed document keeps everything that must change together in ' +
        'one document, and a single-document write has always been atomic. Reaching for a ' +
        'multi-document transaction is a signal that an aggregate has been split across ' +
        'collections the way it would be across tables.</p>' +
        '<p>They also cost more than the relational equivalent: a transaction holds a snapshot, ' +
        'has a default 60-second limit, and long ones pressure the WiredTiger cache.</p>' +
        '<p>The two settings that actually determine consistency, and which get asked more:</p>' +
        '<ul>' +
        '<li><strong>Write concern.</strong> <code>w: 1</code> acknowledges when the primary has ' +
        'it — a failover can lose it. <code>w: "majority"</code> waits for a majority of the ' +
        'replica set and is what durability means here. <code>j: true</code> additionally waits ' +
        'for the journal.</li>' +
        '<li><strong>Read concern.</strong> <code>local</code> may return data that is later ' +
        'rolled back; <code>majority</code> returns only what cannot be lost; ' +
        '<code>linearizable</code> is strongest and slowest.</li>' +
        '</ul>' +
        '<p>These are the same tunable-consistency knobs the CAP question describes, made ' +
        'concrete — and the point worth making is that <strong>the defaults are not the safest ' +
        'option</strong>, so a system that has never thought about write concern has chosen one ' +
        'by accident.</p>',
    referenceLinks: [
        { title: 'MongoDB — Transactions', url: 'https://www.mongodb.com/docs/manual/core/transactions/' }
    ],
    tags: ['mongodb', 'transactions', 'consistency'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'spring-data-mongodb',
    importance: 'should-know',
    subsection: null,
    question: 'How do you work with MongoDB from Spring, and what does the abstraction hide?',
    answer:
        '<p>Three levels, same shape as the JPA story:</p>' +
        '<ul>' +
        '<li><strong>Repositories</strong> — extend <code>MongoRepository</code> and get derived ' +
        'query methods, <code>findByLastNameAndActiveTrue</code>, plus <code>@Query</code> with a ' +
        'raw JSON filter for anything the derivation cannot express.</li>' +
        '<li><strong><code>MongoTemplate</code></strong> — the imperative API. Where you go for ' +
        'the aggregation pipeline, bulk operations, and anything with a projection or an update ' +
        'operator.</li>' +
        '<li><strong>The driver</strong> — rarely needed directly.</li>' +
        '</ul>' +
        '<p>What the abstraction hides, and the reason this is worth asking:</p>' +
        '<ul>' +
        '<li><strong>There is no persistence context.</strong> No dirty checking, no identity ' +
        'map, no lazy loading, no cascade. <code>save()</code> replaces the whole document by ' +
        'default, so a read-modify-save round trip <strong>overwrites concurrent changes to ' +
        'fields you did not touch</strong>. A targeted <code>update</code> with <code>$set</code> ' +
        'does not. This is the single biggest behavioural difference from JPA and it bites people ' +
        'who transfer the habit.</li>' +
        '<li><strong><code>@DBRef</code> is a lookup per reference</strong>, resolved by the ' +
        'driver — an N+1 with no <code>JOIN FETCH</code> to fix it. Prefer storing the id and ' +
        'doing an explicit <code>$lookup</code> or a batch fetch.</li>' +
        '<li><strong>Optimistic locking exists</strong> — <code>@Version</code> works — and it is ' +
        'opt-in, unlike the transaction semantics people assume.</li>' +
        '<li><strong>Index creation is not automatic in production.</strong> ' +
        '<code>spring.data.mongodb.auto-index-creation</code> defaults to false since Spring Data ' +
        'MongoDB 3.0, so <code>@Indexed</code> annotations do nothing unless enabled — and ' +
        'enabling it in production means index builds at startup, which is why the default ' +
        'changed. Create indexes in a migration.</li>' +
        '</ul>',
    referenceLinks: [
        { title: 'Spring Data MongoDB — Reference', url: 'https://docs.spring.io/spring-data/mongodb/reference/' }
    ],
    tags: ['mongodb', 'spring', 'pitfalls'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'inverted-index-and-search',
    importance: 'must-know',
    subsection: null,
    question: 'How does a search engine find documents, and why can a database not do it?',
    answer:
        '<p>With an <strong>inverted index</strong>. A B-tree maps a row to its values; an ' +
        'inverted index maps each <em>term</em> to the list of documents containing it. Searching ' +
        'for two words is then an intersection of two posting lists, which is fast regardless of ' +
        'corpus size — and it is the opposite direction from every index a relational database ' +
        'uses for ordinary columns.</p>' +
        '<p>Getting from text to terms is the <strong>analyzer</strong>, and it is most of what ' +
        'makes search good: tokenise, lowercase, remove stop words, stem (so "running" matches ' +
        '"run"), fold accents, apply synonyms. <strong>The same analyzer must run at index time ' +
        'and at query time</strong>, and a mismatch between the two is the classic cause of ' +
        '"why does this document not come back".</p>' +
        '<p>What a database genuinely cannot do — and note Postgres full-text search does much of ' +
        'the first two, so the honest line is "not as well", not "not at all":</p>' +
        '<ul>' +
        '<li><strong>Relevance ranking.</strong> BM25 scores by term rarity and frequency, so the ' +
        'best match is first. SQL returns a set, unordered by quality.</li>' +
        '<li><strong>Fuzzy matching</strong> by edit distance, for typos.</li>' +
        '<li><strong>Faceting and aggregations over the result set</strong>, which is what powers ' +
        'the counts beside every filter in a product search.</li>' +
        '</ul>' +
        '<p>The operational fact to state plainly: <strong>Elasticsearch is not a system of ' +
        'record.</strong> It is near-real-time — a document is not searchable until the next ' +
        'refresh, by default one second — it has no joins and no transactions, and reindexing ' +
        'from the source is a normal operation. The standard architecture is Postgres as the ' +
        'truth and the search index as a projection kept up to date by events, which brings back ' +
        'every dual-write consideration from the outbox question.</p>',
    referenceLinks: [
        { title: 'Elasticsearch — Analysis', url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/analysis.html' },
        { title: 'PostgreSQL 16 — Full Text Search', url: 'https://www.postgresql.org/docs/16/textsearch.html' }
    ],
    tags: ['search', 'elasticsearch', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'wide-column-and-query-first-modelling',
    importance: 'should-know',
    subsection: null,
    question: 'How is modelling in Cassandra or DynamoDB different?',
    answer:
        '<p><strong>You model per query, and you duplicate data freely.</strong> That is the ' +
        'whole shift, and it is uncomfortable for anyone trained relationally.</p>' +
        '<p>The key is composite: a <strong>partition key</strong> decides which node holds the ' +
        'data, and <strong>clustering columns</strong> decide the sort order within that ' +
        'partition. A query that does not name the partition key either scans every node or is ' +
        'refused outright — and being refused is the better outcome, because a scan at this scale ' +
        'is an incident.</p>' +
        '<p>The consequences, stated as rules:</p>' +
        '<ul>' +
        '<li><strong>No joins.</strong> Not "slow joins" — none.</li>' +
        '<li><strong>Write a table per access pattern.</strong> Orders by customer and orders by ' +
        'date are two tables holding the same data, written together. Storage is cheap and ' +
        'seeking is not.</li>' +
        '<li><strong>Ad-hoc queries do not exist.</strong> A question nobody anticipated needs a ' +
        'new table and a backfill, or an export to somewhere else.</li>' +
        '<li><strong>Partitions must be bounded.</strong> A partition key with too few distinct ' +
        'values makes one enormous partition and one hot node — the same hot-key problem as ' +
        'Kafka, with the same fix of adding something to the key and the same cost.</li>' +
        '</ul>' +
        '<p>Two things worth knowing beyond the modelling. <strong>Consistency is tunable per ' +
        'query</strong> — <code>ONE</code>, <code>QUORUM</code>, <code>ALL</code> — and ' +
        '<code>QUORUM</code> on read and write together is what gives strong consistency, which ' +
        'is the practical form of the CAP trade. And <strong>deletes create tombstones</strong> ' +
        'rather than removing data, so a workload that deletes heavily degrades reads until ' +
        'compaction catches up. A queue on Cassandra is the classic anti-pattern for exactly ' +
        'this reason.</p>',
    referenceLinks: [
        { title: 'Cassandra — Data Modelling', url: 'https://cassandra.apache.org/doc/latest/cassandra/developing/data-modeling/index.html' }
    ],
    tags: ['cassandra', 'dynamodb', 'modelling'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'polyglot-persistence-cost',
    importance: 'must-know',
    subsection: null,
    question: 'What does it cost to run several different datastores?',
    answer:
        '<p>Polyglot persistence — the right store for each job — sounds obviously correct and ' +
        'is frequently a mistake. The costs are real and they are mostly not technical.</p>' +
        '<ul>' +
        '<li><strong>No transactions across them.</strong> Every write that touches two stores is ' +
        'the dual-write problem, so you need an outbox, or idempotent consumers, or you accept ' +
        'that they drift. This is the largest cost and it is the one most often discovered ' +
        'after.</li>' +
        '<li><strong>No joins across them.</strong> Composition moves into application code, and ' +
        'reporting becomes a separate project.</li>' +
        '<li><strong>Operational surface.</strong> Each store needs backups, tested restores, ' +
        'monitoring, alerting, upgrades, capacity planning and someone on call who understands ' +
        'its failure modes. That is per store, not once.</li>' +
        '<li><strong>Expertise.</strong> Debugging a slow query needs someone who knows that ' +
        'engine\'s planner. Four stores means four such people, or one very stretched one.</li>' +
        '<li><strong>Duplicated data goes stale</strong>, and the reconciliation job nobody wants ' +
        'to own is how you find out.</li>' +
        '</ul>' +
        '<p>So the question to ask before adding one: <strong>can Postgres do this well ' +
        'enough?</strong> It has JSONB with GIN indexes, full-text search, arrays, ranges, ' +
        'listen/notify, and <code>SKIP LOCKED</code> for queueing. Any of those is worse than the ' +
        'specialist tool at the specialist job, and considerably better than the specialist tool ' +
        'at everything else you also need.</p>' +
        '<p>The shape that usually is justified: <strong>one system of record, plus derived ' +
        'stores</strong>. Postgres holds the truth; Elasticsearch and Redis hold projections that ' +
        'can be rebuilt from it. That keeps a single place where data is authoritative and makes ' +
        'every consistency problem recoverable by replaying, which is a very different position ' +
        'from four independent sources of truth.</p>',
    referenceLinks: [
        { title: 'PostgreSQL 16 — JSON Functions and Operators', url: 'https://www.postgresql.org/docs/16/functions-json.html' }
    ],
    tags: ['nosql', 'architecture', 'judgement', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'redis-persistence-and-failure',
    importance: 'should-know',
    subsection: null,
    question: 'Can Redis lose data? What are RDB and AOF?',
    answer:
        '<p>Yes, and how much depends on a configuration most teams never look at.</p>' +
        '<ul>' +
        '<li><strong>RDB</strong> — point-in-time snapshots on a schedule. Compact, fast to ' +
        'restore, and <strong>everything since the last snapshot is lost</strong> on a crash. ' +
        'With the default save points that can be minutes.</li>' +
        '<li><strong>AOF</strong> — an append-only log of every write command. With ' +
        '<code>appendfsync everysec</code>, at most one second is lost; with ' +
        '<code>always</code>, effectively none, at a large throughput cost. The file is rewritten ' +
        'periodically to keep it from growing forever.</li>' +
        '<li><strong>Both together</strong> is the recommended production setting — AOF for ' +
        'recovery point, RDB for fast restore and backups.</li>' +
        '</ul>' +
        '<p>The failure modes worth naming beyond persistence:</p>' +
        '<ul>' +
        '<li><strong>Replication is asynchronous</strong>, so a failover can lose acknowledged ' +
        'writes. Sentinel and Cluster both promote a replica that may be behind.</li>' +
        '<li><strong>Redis is single-threaded for command execution</strong>, which is why it is ' +
        'fast and why one slow command blocks everything. <code>KEYS *</code> on a large ' +
        'keyspace, or a big <code>LRANGE</code>, stalls the whole instance — use ' +
        '<code>SCAN</code>.</li>' +
        '<li><strong>Eviction is not deletion of your choosing.</strong> Under memory pressure ' +
        'with <code>allkeys-lru</code>, Redis will evict a session or a lock as readily as a ' +
        'cached value, which is the argument for separating roles into different instances.</li>' +
        '</ul>' +
        '<p>The conclusion to state: <strong>Redis is excellent for data you can rebuild and a ' +
        'poor choice for data you cannot.</strong> Using it as a system of record means accepting ' +
        'a recovery point measured in seconds and a failover that may lose writes — occasionally ' +
        'acceptable, and it should be a decision rather than an assumption.</p>',
    referenceLinks: [
        { title: 'Redis — Persistence', url: 'https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/' }
    ],
    tags: ['redis', 'durability', 'operations'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'choosing-a-store',
    importance: 'should-know',
    subsection: null,
    question: 'How would you choose a datastore for a new feature?',
    answer:
        '<p>By working through the access patterns before the technology, which is the reverse of ' +
        'how the decision usually gets made.</p>' +
        '<p>The questions, in order:</p>' +
        '<ul>' +
        '<li><strong>What are the reads?</strong> By primary key, by range, by arbitrary ' +
        'predicate, by relevance, by traversal? This eliminates more options than anything ' +
        'else.</li>' +
        '<li><strong>What are the writes, and at what rate?</strong> Anything one primary can ' +
        'absorb leaves relational on the table.</li>' +
        '<li><strong>What must be consistent with what?</strong> If two things must change ' +
        'together, they want to be in one store.</li>' +
        '<li><strong>Can this data be rebuilt?</strong> If yes, durability requirements relax ' +
        'enormously and a cache or an index becomes viable.</li>' +
        '<li><strong>How much will there be in three years?</strong> Not in three months.</li>' +
        '<li><strong>Who operates it?</strong> The most decisive question and the one asked ' +
        'last.</li>' +
        '</ul>' +
        '<p>The answer that a good interviewer is listening for is not a technology. It is ' +
        '<strong>"start with Postgres, and here is the specific signal that would make me add ' +
        'something"</strong> — write throughput past a single primary, a search requirement with ' +
        'relevance ranking, a document that genuinely has no fixed shape.</p>' +
        '<p>And one thing worth saying explicitly because it is usually the real constraint: ' +
        '<strong>the decision is very hard to reverse.</strong> Choosing a store is choosing a ' +
        'data model, a query language, an operational skill set and a migration cost. That ' +
        'asymmetry is the argument for the boring option early and the specialist option once the ' +
        'requirement is demonstrated rather than anticipated.</p>',
    referenceLinks: [
        { title: 'PostgreSQL 16 — Documentation', url: 'https://www.postgresql.org/docs/16/index.html' }
    ],
    tags: ['nosql', 'architecture', 'judgement'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
}

    ]
};
