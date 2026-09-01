/* ==========================================================================
   data/theory/second-level-cache.js — module 53 in the reading path

   Seven chapters on a feature that is asked about far more often than it is
   used, and the honest answer to most of the questions is "measure first,
   and then probably cache somewhere else". The module says so, but it says
   it after explaining the machinery, because an interviewer asking about
   READ_WRITE wants the mechanism and not an opinion.
   ========================================================================== */

const secondLevelCacheModule = {
    id: 'second-level-cache',
    trackId: 'persistence',
    order: 53,
    title: 'Caching in the Persistence Layer',
    tagline: 'Second-level and query cache, and why they are usually the wrong tool.',
    estimatedMinutes: 30,
    prerequisites: ['spring-data-jpa'],
    docHub: {
        title: 'Hibernate User Guide — Caching',
        url: 'https://docs.jboss.org/hibernate/orm/6.4/userguide/html_single/Hibernate_User_Guide.html#caching'
    },

    chapters: [
        {
            id: 'cache-levels-compared',
            title: 'First Level, Second Level',
            importance: 'must-know',
            summary: 'The persistence context is a cache you already have and cannot switch off. The second-level cache is a different thing with the same word in its name.',
            interviewAngle: 'Almost always asked as "what is the difference between the first- and second-level cache", and the discriminating detail is scope: one dies with the transaction, the other outlives the application\'s requests and is shared across them.',
            buildsOn: [],
            blocks: [
                {
                    type: 'definition',
                    term: 'Second-level cache',
                    important: true,
                    html: '<p>A cache owned by the <code>SessionFactory</code> rather than by a session, holding entity state — <em>not</em> entity instances — keyed by identifier, and shared by every session in the JVM. A hit means Hibernate builds a fresh entity from cached column values instead of issuing a <code>SELECT</code>.</p>'
                },
                {
                    type: 'comparison',
                    title: 'Two caches, one word',
                    left: 'First level (persistence context)',
                    right: 'Second level (SessionFactory)',
                    rows: [
                        { aspect: 'Scope', left: 'One <code>EntityManager</code>, so usually one transaction', right: 'The whole <code>SessionFactory</code>, so every transaction in the JVM' },
                        { aspect: 'Optional', left: '<strong>No.</strong> It is the persistence context; JPA cannot work without it', right: '<strong>Yes,</strong> and off by default' },
                        { aspect: 'Stores', left: 'Managed entity instances', right: 'Dehydrated state — an array of column values' },
                        { aspect: 'Guarantees', left: 'Identity: two lookups of the same id in one context return <code>==</code> the same object', right: 'None of that. Each session hydrates its own instance' },
                        { aspect: 'Survives commit', left: 'No', right: 'Yes, until evicted or invalidated' },
                        { aspect: 'Shared across nodes', left: 'Never', right: 'Only if the provider replicates it' },
                        { aspect: 'What you tune', left: 'Nothing. You manage its size by scoping transactions', right: 'Regions, strategies, sizes, TTLs, a provider' }
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>The reason the second level stores <em>state</em> and not objects is worth saying out loud, because it explains most of its behaviour. An entity instance belongs to a persistence context — it has an identity within it, it can be dirty, it can hold lazy proxies pointing back at its own session. None of that is shareable. So Hibernate stores the flat column values and rebuilds an instance per session on the way out, which is why a second-level hit is cheaper than a query but is <strong>not</strong> free.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>The first-level cache is not a performance feature you enabled.</strong> Candidates often describe it as one. It exists so that dirty checking, identity and write ordering are possible at all — the fact that a repeated <code>findById</code> in one transaction does not hit the database is a side effect of the design, not its purpose. Saying this correctly separates people who have read about JPA from people who have used it.</p>'
                }
            ],
            docs: [
                { title: 'Hibernate User Guide — Caching', url: 'https://docs.jboss.org/hibernate/orm/6.4/userguide/html_single/Hibernate_User_Guide.html#caching', kind: 'guide' },
                { title: 'Jakarta Persistence 3.1 — Shared cache mode', url: 'https://jakarta.ee/specifications/persistence/3.1/jakarta-persistence-spec-3.1.html#a11648', kind: 'spec' }
            ],
            relatedQuestions: [
                { topicId: 'jpa-hibernate', questionId: 'first-and-second-level-cache' },
                { topicId: 'jpa-hibernate', questionId: 'persistence-context-and-dirty-checking' }
            ]
        },

        {
            id: 'second-level-cache-setup',
            title: 'Turning It On',
            importance: 'should-know',
            summary: 'Three things have to line up: a provider on the class path, the feature enabled, and each entity opted in individually.',
            interviewAngle: 'The trap is that enabling the property alone caches nothing, and a candidate who has only read about the feature usually stops after the property.',
            buildsOn: ['cache-levels-compared'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'properties',
                    title: 'The configuration half',
                    code: '# 1. The feature. Without this, @Cache annotations are ignored silently.\nspring.jpa.properties.hibernate.cache.use_second_level_cache=true\n\n# 2. The provider. JCache (JSR-107) plus an implementation is the\n#    current route; Ehcache 3 and Infinispan both provide one.\nspring.jpa.properties.hibernate.cache.region.factory_class=jcache\nspring.jpa.properties.hibernate.javax.cache.provider=\\\n  org.ehcache.jsr107.EhcacheCachingProvider\n\n# 3. The query cache, which is a separate switch and separately unwise.\nspring.jpa.properties.hibernate.cache.use_query_cache=false\n\n# 4. Statistics. Turn these on in a load test and off in production;\n#    without them you are guessing about the hit ratio.\nspring.jpa.properties.hibernate.generate_statistics=true',
                    notes: '<p><code>hibernate.cache.use_second_level_cache=true</code> with no <code>@Cache</code> anywhere is the common non-event: everything is configured, nothing is cached, and the hit ratio is zero because there is nothing in it.</p>'
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The entity half',
                    code: '@Entity\n@Cacheable                                      // the JPA annotation\n@Cache(usage = CacheConcurrencyStrategy.READ_WRITE,\n       region = "country")                       // the Hibernate one\nclass Country {\n    @Id private String iso;\n    private String name;\n    private String currency;\n}\n\n@Entity\nclass Order {\n    @Id @GeneratedValue private Long id;\n\n    // A collection is cached SEPARATELY, and only by identifier.\n    // Without this line the association is re-read even when both\n    // the parent and every child are already in the cache.\n    @OneToMany(mappedBy = "order")\n    @Cache(usage = CacheConcurrencyStrategy.READ_WRITE)\n    private List<OrderLine> lines = new ArrayList<>();\n}',
                    output: {
                        kind: 'trace',
                        lines: [
                            'shared-cache-mode defaults to ENABLE_SELECTIVE: an entity is cached only if it is annotated.',
                            'ALL caches every entity, which is almost never what anybody wants -- it puts the highest-churn tables in the cache alongside the reference data.',
                            'A collection cache stores the child identifiers, not the children. Hitting it still needs each child, from the second-level cache or from the database.',
                            'So a cached collection with uncached children turns one join into one cache hit plus N selects. That is worse than the query it replaced.'
                        ],
                        explain: '<p>The <code>region</code> attribute matters more than it looks: regions are what you size and expire independently. A single default region means the 190-row country table competes for eviction with the order table.</p>'
                    }
                },
                {
                    type: 'tip',
                    html: '<p>The entities that belong here have a recognisable shape — <strong>small, read constantly, and written almost never</strong>. Countries, currencies, tax rates, feature flags, plan definitions. If you cannot name the row count and the write frequency, the entity is not a candidate yet.</p>'
                }
            ],
            docs: [
                { title: 'Hibernate — Configuring second-level caching', url: 'https://docs.jboss.org/hibernate/orm/6.4/userguide/html_single/Hibernate_User_Guide.html#caching-config', kind: 'guide' },
                { title: 'Spring Boot — Caching', url: 'https://docs.spring.io/spring-boot/reference/io/caching.html', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'cache-concurrency-strategies',
            title: 'The Four Concurrency Strategies',
            importance: 'must-know',
            summary: 'Each strategy is a different answer to "what may a reader see while a writer is committing", and one of the four can serve stale data by design.',
            interviewAngle: 'A precise recall question that rewards knowing why READ_WRITE needs soft locks. The follow-up is always which one you would choose and for what.',
            buildsOn: ['second-level-cache-setup'],
            blocks: [
                {
                    type: 'types',
                    title: 'CacheConcurrencyStrategy',
                    items: [
                        { name: 'READ_ONLY', html: '<p>For data that is never updated after insert. The cheapest by far — no locking, no versioning, no invalidation path. An update to a <code>READ_ONLY</code> entity throws <code>UnsupportedOperationException</code>, which is a feature: it turns an assumption into a check.</p>' },
                        { name: 'NONSTRICT_READ_WRITE', html: '<p>Invalidates the entry <em>after</em> the transaction commits. Between the database write and the eviction there is a window in which a reader gets the old row. Acceptable only when stale reads are genuinely harmless and rare.</p>' },
                        { name: 'READ_WRITE', html: '<p><strong>The default choice for mutable data.</strong> Uses a <em>soft lock</em>: on write the entry is replaced by a lock marker, readers who see the marker go to the database instead, and the marker is replaced or removed at commit. Gives read-committed semantics for the cache.</p>' },
                        { name: 'TRANSACTIONAL', html: '<p>The cache participates in the JTA transaction as an XA resource, so cache and database commit together. Requires a JTA transaction manager and a provider that supports it — Infinispan does, Ehcache 3 does not. Rare outside application servers.</p>' }
                    ]
                },
                {
                    type: 'diagram',
                    diagramType: 'sequence',
                    caption: 'The soft lock is the whole mechanism of READ_WRITE, and it is why a reader is never handed a value that a writer is midway through changing.',
                    diagramConfig: {
                        title: 'READ_WRITE during a concurrent write',
                        actors: [
                            { id: 'w', label: 'Writer' },
                            { id: 'c', label: 'Cache region' },
                            { id: 'r', label: 'Reader' },
                            { id: 'db', label: 'Database' }
                        ],
                        messages: [
                            { from: 'w', to: 'c', label: 'lockItem(id) — entry replaced by a soft lock', kind: 'call' },
                            { from: 'w', to: 'db', label: 'UPDATE ... (still uncommitted)', kind: 'call' },
                            { from: 'r', to: 'c', label: 'get(id)', kind: 'call' },
                            { from: 'c', to: 'r', label: 'miss — the entry is soft-locked', kind: 'return' },
                            { from: 'r', to: 'db', label: 'SELECT — reads the committed row', kind: 'call' },
                            { from: 'w', to: 'db', label: 'COMMIT', kind: 'call' },
                            { from: 'w', to: 'c', label: 'afterUpdate — new state, or eviction', kind: 'call' }
                        ]
                    }
                },
                {
                    type: 'pitfall',
                    html: '<p><strong><code>NONSTRICT_READ_WRITE</code> on data anybody makes a decision from is a bug you will not be able to reproduce.</strong> The stale window is milliseconds wide, it only opens under a concurrent read of a row being written, and the symptom is one user seeing a price or a balance that was correct a moment ago. Choose <code>READ_WRITE</code> unless you can state exactly why a stale read is harmless for that table.</p>'
                },
                {
                    type: 'prose',
                    html: '<p>None of the four gives you repeatable reads across the cache and the database. The cache is not part of the database\'s MVCC snapshot, so a transaction reading a cached entity and a non-cached one has read them at two different instants. For most reference data that does not matter. For anything you compare against a live row, it does — and that is the argument for keeping the cached set to data nobody joins decisions to.</p>'
                }
            ],
            docs: [
                { title: 'Hibernate — Cache concurrency strategies', url: 'https://docs.jboss.org/hibernate/orm/6.4/userguide/html_single/Hibernate_User_Guide.html#caching-mappings', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'query-cache-and-its-traps',
            title: 'The Query Cache',
            importance: 'must-know',
            summary: 'It stores identifiers, not rows, and any write to any table the query touches invalidates every cached result over that table.',
            interviewAngle: 'A strong differentiator. Most candidates know the query cache exists; few can say what it stores, and fewer still can explain the timestamps region that makes it correct and useless on a busy table.',
            buildsOn: ['cache-concurrency-strategies'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>The query cache keys on the query string plus its bound parameter values, and stores <strong>a list of identifiers</strong>. It has to: storing rows would duplicate the second-level cache and would have no way to notice an entity changing underneath it. So a query-cache hit hands back <code>[41, 87, 92]</code>, and each of those three is then resolved through the second-level cache — or, if the entity is not cached there, through three separate <code>SELECT</code>s.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>The query cache without the entities cached is an N+1 generator.</strong> The single query that returned twenty rows becomes a cache hit plus twenty primary-key selects. It is measurably slower than the query it replaced, and the hit-ratio metric looks excellent while it happens.</p>'
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Enabling it, per query',
                    code: '@Query("select o from Order o where o.status = :s")\n@QueryHints(@QueryHint(name = HINT_CACHEABLE, value = "true"))\nList<Order> byStatus(@Param("s") String status);\n\n// The same thing on the EntityManager, where the constant lives:\nem.createQuery("select c from Country c", Country.class)\n  .setHint(org.hibernate.jpa.HibernateHints.HINT_CACHEABLE, true)\n  .setHint(org.hibernate.jpa.HibernateHints.HINT_CACHE_REGION, "country-queries")\n  .getResultList();',
                    output: {
                        kind: 'trace',
                        lines: [
                            'Hibernate keeps a separate region -- default-update-timestamps-region -- holding the last write time per table.',
                            'On a query-cache hit it compares the cached result timestamp against the timestamp of every table the query touched.',
                            'If any table was written after the result was cached, the entry is discarded and the query runs.',
                            'So one INSERT into orders invalidates EVERY cached query over orders, regardless of whether the new row would have matched.'
                        ],
                        explain: '<p>That last line is why the query cache almost never pays on a transactional table. It is correct — it will not serve a result that could be stale — and correctness here is bought by throwing the results away constantly. On a table written once an hour it is excellent. On <code>orders</code> it is a cache with a hit ratio near zero and the bookkeeping cost still paid on every write.</p>'
                    }
                },
                {
                    type: 'table',
                    title: 'When the query cache actually helps',
                    headers: ['Table shape', 'Verdict', 'Why'],
                    rows: [
                        ['Reference data, written on deploy', 'Good fit', 'The timestamps region never moves, so entries survive'],
                        ['Configuration read on every request', 'Good fit', 'High read rate, near-zero write rate'],
                        ['Catalogue updated nightly', 'Usable', 'One nightly invalidation storm, then a warm day'],
                        ['Orders, events, sessions, anything append-only', 'Bad fit', 'Every insert invalidates every cached query over the table'],
                        ['A query with a timestamp or a page number in it', 'Bad fit', 'Each distinct parameter set is a separate key; the cache fills with entries used once']
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>If you are asked whether to enable the query cache, the answer that lands is: <em>only for queries over tables that are effectively read-only, and only after the entities themselves are cached — otherwise it converts one query into N.</em></p>'
                }
            ],
            docs: [
                { title: 'Hibernate — The query cache', url: 'https://docs.jboss.org/hibernate/orm/6.4/userguide/html_single/Hibernate_User_Guide.html#caching-query', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'jpa-hibernate', questionId: 'n-plus-one' }
            ]
        },

        {
            id: 'invalidation-in-a-cluster',
            title: 'More Than One JVM',
            importance: 'should-know',
            summary: 'A local second-level cache on four nodes is four caches, and Hibernate invalidates only the one that did the write.',
            interviewAngle: 'The question that separates a single-instance mental model from a production one. Anything that writes to the database without going through Hibernate is invisible to all of them.',
            buildsOn: ['query-cache-and-its-traps'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>Hibernate invalidates its own cache when <em>it</em> performs the write. It has no other signal. So on a four-node deployment with a local cache per node, a write on node 1 evicts the entry on node 1 and leaves nodes 2, 3 and 4 serving the old row until their entries expire. Nothing logs this. The only symptom is a user who sees a change, refreshes, and sees it undone — because the load balancer sent the second request elsewhere.</p>'
                },
                {
                    type: 'types',
                    title: 'The four ways out, in increasing order of honesty',
                    items: [
                        { name: 'Cache only immutable data', html: '<p><code>READ_ONLY</code> on rows that are never updated. Nothing to invalidate, so the cluster problem does not exist. <strong>This is the option that actually works,</strong> and it is why the cached set should be small.</p>' },
                        { name: 'A short TTL', html: '<p>Accept staleness bounded by the TTL. Honest and simple, provided somebody writes the bound down: "up to 60 seconds stale" is a specification, "we cache it" is not.</p>' },
                        { name: 'A replicated or invalidating cache', html: '<p>Infinispan or Hazelcast in invalidation mode: a write broadcasts an eviction to every node. Correct, and it adds a distributed system to your persistence layer — with its own split-brain, its own ports, its own failure modes.</p>' },
                        { name: 'A shared remote cache', html: '<p>One Redis or Memcached everybody talks to. One copy, so one invalidation. Now every hit is a network round trip, which is a different trade and often still worth it. See the last chapter.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Anything that writes to the database outside Hibernate is invisible to every cache.</strong> A Flyway migration, a bulk <code>@Modifying</code> statement, a report job using <code>JdbcClient</code>, a DBA fixing a row by hand. The cache has no trigger, no change feed and no way to know. If a table is cached, the rule "all writes go through the entity" stops being a style preference and becomes a correctness requirement.</p>'
                }
            ],
            docs: [
                { title: 'Infinispan — Hibernate second-level cache', url: 'https://infinispan.org/docs/stable/titles/hibernate/hibernate.html', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'spring-cache-abstraction',
            title: '@Cacheable and the Spring Abstraction',
            importance: 'must-know',
            summary: 'A different layer entirely: it caches method results, it knows nothing about entities, and it is proxy-based with every consequence that implies.',
            interviewAngle: 'Frequently confused with the second-level cache in interviews. The clean distinction is the layer — Spring caches a method return value, Hibernate caches a row.',
            buildsOn: ['invalidation-in-a-cluster'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'Two caches at two layers',
                    left: 'Hibernate second level',
                    right: 'Spring @Cacheable',
                    rows: [
                        { aspect: 'Caches', left: 'Entity state by identifier', right: 'A method return value, by a computed key' },
                        { aspect: 'Knows about entities', left: 'Yes — it is part of the ORM', right: 'No. The value is an opaque object' },
                        { aspect: 'Invalidated by', left: 'A write through Hibernate', right: '<strong>Only by an <code>@CacheEvict</code> somebody wrote</strong>' },
                        { aspect: 'Granularity', left: 'One row', right: 'Whatever the method returned — a list, a DTO, a page' },
                        { aspect: 'Mechanism', left: 'Inside the session', right: 'A proxy, so self-invocation bypasses it' },
                        { aspect: 'Best at', left: 'Reference tables read by id', right: 'Expensive computations and aggregates' }
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The shape that works, and the two that do not',
                    code: '@Service\nclass RateService {\n\n    @Cacheable(value = "rates", key = "#pair", unless = "#result == null")\n    public Rate lookup(String pair) { ... }\n\n    @CacheEvict(value = "rates", key = "#rate.pair")\n    public void update(Rate rate) { ... }\n\n    @CacheEvict(value = "rates", allEntries = true)\n    public void reloadAll() { ... }\n\n    // BROKEN 1: self-invocation. This call does not go through the\n    // proxy, so nothing is cached and nothing warns you.\n    public List<Rate> all(List<String> pairs) {\n        return pairs.stream().map(this::lookup).toList();\n    }\n\n    // BROKEN 2: a managed entity in a cache that outlives the session.\n    // Returned to a later request it is detached, and touching a lazy\n    // association throws LazyInitializationException. Cache a DTO.\n    @Cacheable("orders")\n    public Order find(Long id) { return repository.findById(id).orElseThrow(); }\n}',
                    output: {
                        kind: 'trace',
                        lines: [
                            'The default key is derived from the parameters by SimpleKeyGenerator -- fine until a method has no parameters, where the key is the constant SimpleKey.EMPTY.',
                            'So two no-argument methods sharing a cache name overwrite each other. Name the cache per method, or give an explicit key.',
                            'unless is evaluated AFTER the call, against the result; condition is evaluated before, against the arguments. Caching a null is the usual reason to reach for unless.',
                            'A @Cacheable method that throws is not cached, so a failing downstream call is retried every time -- which is correct, and is also how a cache stops shielding anything during an incident.'
                        ],
                        explain: '<p><strong>Broken 2 is the one that reaches production.</strong> It works in every test that uses the entity inside a transaction, and fails on the first request that reads a lazy association off a cached instance. Cache a record or a DTO, never a managed entity.</p>'
                    }
                },
                {
                    type: 'pitfall',
                    html: '<p><code>@Cacheable</code> and <code>@Transactional</code> are both proxy advice, and their order is not obvious. By default caching runs <em>outside</em> the transaction advice, so a cache put happens whether or not the transaction commits — a method that caches its result and then rolls back leaves the cached value behind. If that matters, evict on failure explicitly, or move the caching to a caller that is not transactional.</p>'
                }
            ],
            docs: [
                { title: 'Spring Framework — Cache Abstraction', url: 'https://docs.spring.io/spring-framework/reference/integration/cache.html', kind: 'guide' },
                { title: 'Spring Boot — Caching providers', url: 'https://docs.spring.io/spring-boot/reference/io/caching.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'aop-proxies', questionId: 'self-invocation' }
            ]
        },

        {
            id: 'when-to-cache-in-redis-instead',
            title: 'When Not To Use Any Of This',
            importance: 'should-know',
            summary: 'Most caching questions are answered better by an index, a projection, or a cache one layer up. The second-level cache is a narrow tool.',
            interviewAngle: 'The judgement question. An answer that reaches for the second-level cache first reads as somebody who has learned the feature list; an answer that asks what the query costs and why reads as somebody who has fixed one.',
            buildsOn: ['spring-cache-abstraction'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>Every cache is a bet that reading stale data is cheaper than reading correct data. That bet is sometimes right, and it is almost never the <em>first</em> thing to try. A query taking 400ms because it has no index does not become fast when cached — it becomes fast for the requests that hit and stays 400ms for the ones that miss, on a table that now has two sources of truth.</p>'
                },
                {
                    type: 'table',
                    title: 'What to reach for first',
                    headers: ['Symptom', 'Reach for', 'Not'],
                    rows: [
                        ['One query is slow', 'The plan, then an index', 'A cache over the slow query'],
                        ['A query returns far more columns than are used', 'A projection', 'A bigger cache'],
                        ['The same reference row is read on every request', '<strong>Second-level cache, <code>READ_ONLY</code></strong>', 'Redis — the round trip costs more than the local hit saves'],
                        ['An expensive aggregate recomputed per request', '<code>@Cacheable</code>, or a materialised view', 'The Hibernate query cache'],
                        ['The same rendered response for many users', 'An HTTP cache header or a CDN', 'Anything inside the JVM'],
                        ['Reads scaling past one primary', 'A read replica', 'A cache with a long TTL standing in for capacity']
                    ]
                },
                {
                    type: 'comparison',
                    title: 'Local second level against a shared remote cache',
                    left: 'Second-level cache (in the JVM)',
                    right: 'Redis, through @Cacheable',
                    rows: [
                        { aspect: 'Hit cost', left: 'Sub-microsecond. No serialisation, no network', right: 'A round trip plus serialisation, typically 0.2–1ms' },
                        { aspect: 'Copies', left: 'One per node — the invalidation problem', right: 'One, shared' },
                        { aspect: 'Survives a restart', left: 'No. Cold every deploy', right: 'Yes' },
                        { aspect: 'Caches', left: 'Rows by id, transparently', right: 'Anything you can serialise, explicitly' },
                        { aspect: 'Failure mode', left: 'Stale rows', right: 'A dependency that can be down, so it needs a fallback path' },
                        { aspect: 'Right for', left: 'Small immutable reference data read constantly', right: 'Expensive results, shared state, anything that must survive a deploy' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>The sentence to have ready: <em>the second-level cache is worth it for small, immutable, constantly-read reference data on a single deployable, and for almost nothing else — everywhere else the answer is an index, a projection, or a cache one layer up where invalidation is explicit.</em> It is a narrow tool, and saying so is a better answer than configuring it.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A cache added without a hit-ratio metric is a change nobody can evaluate.</strong> Turn on <code>hibernate.generate_statistics</code> or expose the provider\'s metrics through Actuator before the cache goes in, and record the ratio a week later. A hit ratio under about 80% usually means the working set does not fit or the invalidation rate is too high, and either way the cache is costing more than it returns.</p>'
                }
            ],
            docs: [
                { title: 'Spring Boot Actuator — Metrics', url: 'https://docs.spring.io/spring-boot/reference/actuator/metrics.html', kind: 'guide' },
                { title: 'Hibernate — Statistics', url: 'https://docs.jboss.org/hibernate/orm/6.4/userguide/html_single/Hibernate_User_Guide.html#statistics', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'jpa-hibernate', questionId: 'first-and-second-level-cache' }
            ]
        }
    ]
};
