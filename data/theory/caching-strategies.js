/* ==========================================================================
   data/theory/caching-strategies.js — module 72 in the reading path

   The plan's tagline is the register: cache-aside, invalidation, stampede —
   and the two hard problems joke, defended. Nine chapters, and the defence
   is the module. Naming a cache is easy; deciding when it is stale, what
   happens when a thousand requests miss it at once, and how the invalidation
   reaches every instance is the work.

   The Redis chapter here is deliberately narrower than the one in
   nosql-stores. That one asked what Redis can be; this one asks what a
   CACHE should store in it, and the operational hazards that only appear
   under cache-shaped traffic.
   ========================================================================== */

const cachingStrategiesModule = {
    id: 'caching-strategies',
    trackId: 'distributed',
    order: 72,
    title: 'Caching',
    tagline: 'Cache-aside, invalidation, stampede — and the two hard problems joke, defended.',
    estimatedMinutes: 40,
    prerequisites: ['second-level-cache'],
    docHub: { title: 'Spring Framework — Cache Abstraction', url: 'https://docs.spring.io/spring-framework/reference/integration/cache.html' },

    chapters: [
        {
            id: 'why-cache',
            title: 'What a Cache Is Actually For',
            importance: 'must-know',
            summary: 'Latency, load, or cost — and which one you are buying decides the design. A cache added without naming the goal usually cannot be shown to have helped.',
            interviewAngle: 'The strongest opening is to ask what problem the cache solves before describing one, because the answer changes the TTL, the invalidation and the eviction policy.',
            buildsOn: [],
            blocks: [
                {
                    type: 'types',
                    title: 'Three different goals, three different designs',
                    items: [
                        { name: 'Latency', html: '<p>The data is fine, it is just slow to produce. A short TTL is acceptable because freshness matters more than hit rate. Measure at p99, not the average.</p>' },
                        { name: 'Load', html: '<p>The origin cannot take the traffic. Hit rate is everything, so a longer TTL and stale-while-revalidate are worth real staleness.</p>' },
                        { name: 'Cost', html: '<p>Each call costs money — a paid API, an expensive query. A long TTL and an explicit invalidation, because every avoided call is measurable.</p>' }
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>The reason to name the goal first is that the settings conflict. A latency cache wants freshness and can tolerate a modest hit rate; a load cache wants a high hit rate and can tolerate staleness. Choosing a TTL without knowing which one you are building is guessing, and the guess is usually "five minutes" for no stated reason.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A cache in front of a query that is slow because it is missing an index is a bug with a mitigation on top.</strong> The query is still slow on every miss, on every cache restart, and for every key that is not hot. Fixing the index makes the cache optional; adding the cache makes the index invisible. Look at the plan before reaching for Redis — this is the single most common misapplication in the module.</p>'
                }
            ],
            docs: [
                { title: 'Caching Best Practices', url: 'https://aws.amazon.com/builders-library/caching-challenges-and-strategies/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'caching-scale', questionId: 'caching-strategies' }
            ]
        },

        {
            id: 'cache-aside',
            title: 'Cache-Aside',
            importance: 'must-know',
            summary: 'The application checks the cache, and on a miss loads from the source and populates it. The default pattern, and the one whose failure modes everything else is compared against.',
            interviewAngle: 'The write path is where the answers differ. Deleting the entry on write is correct; updating it is a race, and being able to say why is the discriminator.',
            buildsOn: ['why-cache'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The pattern, and the write path that is easy to get wrong',
                    code: '// READ: look aside, load on miss, populate.\nProduct byId(String id) {\n    Product cached = cache.get(id, Product.class);\n    if (cached != null) return cached;\n\n    Product loaded = repository.findById(id).orElseThrow();\n    cache.put(id, loaded, Duration.ofMinutes(10));\n    return loaded;\n}\n\n// WRITE, WRONG: update the database, then WRITE the new value.\n@Transactional\nvoid rename(String id, String name) {\n    repository.rename(id, name);\n    cache.put(id, repository.findById(id).orElseThrow());   // RACE\n}\n// Two concurrent writers can interleave so the cache ends up holding\n// the value from the OLDER write, permanently, until the TTL expires.\n\n// WRITE, RIGHT: update the database, then DELETE the entry.\n@Transactional\nvoid rename(String id, String name) {\n    repository.rename(id, name);\n    cache.evict(id);          // the next reader repopulates from truth\n}',
                    output: {
                        kind: 'trace',
                        lines: [
                            'Writer A: update name to "X"',
                            'Writer B: update name to "Y"',
                            'Writer B: cache.put("Y")',
                            'Writer A: cache.put("X")     <-- A is put lands last; the cache now says X and the database says Y',
                            'With evict instead of put, the last write wins in the database and the next read repopulates from it.',
                            'Evicting is not race-free either -- a reader can repopulate with a stale value read before the write committed -- but the window is one read rather than a full TTL.'
                        ],
                        explain: '<p>The remaining race in the evict version is worth knowing rather than hiding: a reader that loaded the old value just before the write commits can populate the cache after the eviction. It is a narrow window and the entry expires; the <code>put</code> version leaves a wrong value for the full TTL and is wrong every time the interleaving occurs.</p>'
                    }
                },
                {
                    type: 'tip',
                    html: '<p>Evict <strong>after</strong> the transaction commits, not inside it. Evicting inside the transaction means a concurrent reader can repopulate from a database that has not yet committed the change, restoring the stale value with a fresh TTL. <code>@TransactionalEventListener(AFTER_COMMIT)</code>, or Spring\'s transaction-aware cache manager, is what puts the eviction on the right side of the commit.</p>'
                }
            ],
            docs: [
                { title: 'Caching challenges and strategies', url: 'https://aws.amazon.com/builders-library/caching-challenges-and-strategies/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'caching-scale', questionId: 'caching-strategies' },
                { topicId: 'caching-scale', questionId: 'cache-invalidation' }
            ]
        },

        {
            id: 'write-through-and-write-behind',
            title: 'Write-Through and Write-Behind',
            importance: 'should-know',
            summary: 'Write to the cache and let it write to the store — synchronously, or asynchronously after a delay. The second is fast and can lose data.',
            interviewAngle: 'Less common than cache-aside and worth knowing for the trade: write-behind is the only one of the three that can acknowledge a write that is later lost.',
            buildsOn: ['cache-aside'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'Three write strategies',
                    left: 'Write-through',
                    right: 'Write-behind (write-back)',
                    rows: [
                        { aspect: 'Order', left: 'Cache and store written together, synchronously', right: 'Cache written; store written later, in batches' },
                        { aspect: 'Write latency', left: 'The slower of the two', right: '<strong>Cache speed</strong>' },
                        { aspect: 'Consistency', left: 'Cache and store always agree', right: 'A window where only the cache has it' },
                        { aspect: 'Data loss', left: 'None', right: '<strong>Yes — a cache node dying loses unflushed writes</strong>' },
                        { aspect: 'Store load', left: 'One write per write', right: 'Batched and coalesced — much lower' },
                        { aspect: 'Use for', left: 'A read-heavy cache that must never be stale', right: 'Counters, metrics, session activity — high volume, tolerant of loss' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>Write-behind is the right answer for exactly one shape and it is worth naming it: a very high-frequency update whose individual values do not matter, only the eventual total — a page-view counter, a "last seen" timestamp, a rate-limit tally. Coalescing a thousand increments into one database write is a large saving, and losing the last few seconds of it costs nothing. Using it for anything a user would notice missing is how it goes wrong.</p>'
                }
            ],
            docs: [
                { title: 'Caching challenges and strategies', url: 'https://aws.amazon.com/builders-library/caching-challenges-and-strategies/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'caching-scale', questionId: 'caching-strategies' }
            ]
        },

        {
            id: 'ttl-and-eviction-policies',
            title: 'TTL and Eviction',
            importance: 'must-know',
            summary: 'A TTL bounds staleness. Eviction decides what goes when memory runs out. They are different mechanisms and confusing them produces a cache that neither expires nor evicts correctly.',
            interviewAngle: 'The distinction is the question. A TTL is about correctness — how stale may this be — and eviction is about capacity.',
            buildsOn: ['write-through-and-write-behind'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>A <strong>TTL</strong> is a statement about acceptable staleness: "this may be up to five minutes out of date". It is a correctness decision, made per kind of data, and it is the backstop when invalidation fails — which it eventually will.</p><p><strong>Eviction</strong> is what happens when the cache is full and something must go. It is a capacity decision, made per cache, and it is unrelated to whether the entry was still valid. An entry with an hour left on its TTL is evicted anyway if it is the least recently used and memory is exhausted.</p>'
                },
                {
                    type: 'table',
                    title: 'Choosing a TTL from what the data is',
                    headers: ['Data', 'TTL', 'Why'],
                    rows: [
                        ['Reference data — countries, currencies', 'Hours or days', 'Changes almost never'],
                        ['Product catalogue', 'Minutes', 'Changes occasionally; staleness is visible but harmless'],
                        ['Price', '<strong>Seconds, or explicit invalidation only</strong>', 'A stale price is a financial error'],
                        ['Stock level', 'Seconds', 'Stale means overselling'],
                        ['User permissions', 'Short, plus explicit eviction', 'Stale means a security problem'],
                        ['A rendered page for anonymous users', 'Minutes', 'High value, low risk'],
                        ['Anything personal', 'Careful', 'A cache key that omits the user id serves one user\'s data to another']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>An entry with no TTL and no eviction policy is a memory leak with a nicer name.</strong> The two failure directions are equally common: a Redis on <code>noeviction</code> — the default — starts refusing writes when it fills, so the cache stops accepting new entries while happily serving old ones; and an in-process <code>ConcurrentHashMap</code> used as a cache with no bound grows until the heap does not. Every cache needs a size bound <em>and</em> an expiry, and neither substitutes for the other.</p>'
                }
            ],
            docs: [
                { title: 'Redis — Key eviction', url: 'https://redis.io/docs/latest/develop/reference/eviction/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'caching-scale', questionId: 'eviction-policies' }
            ]
        },

        {
            id: 'cache-stampede-and-mitigations',
            title: 'The Stampede',
            importance: 'must-know',
            summary: 'A hot key expires and every concurrent request misses at once, so a thousand identical queries hit the origin simultaneously. The cache made the failure worse, not better.',
            interviewAngle: 'A specific, named failure with several named fixes. Being able to give three and say which you would reach for first is a complete answer.',
            buildsOn: ['ttl-and-eviction-policies'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>A key serving a thousand requests per second expires. In the moment before any of them repopulates it, every one of those thousand requests misses and every one issues the same expensive query. The origin receives a thousand times its usual load for that key, may fail under it, and the failure then prevents repopulation — so the stampede continues.</p><p>The system was <em>less</em> resilient with the cache than without it, because without it the origin would have been sized for a thousand requests per second all along.</p>'
                },
                {
                    type: 'types',
                    title: 'The mitigations, in the order to reach for them',
                    items: [
                        { name: 'Jittered TTL', html: '<p>Randomise the expiry — 300 seconds plus or minus 30 — so a population of entries written together does not expire together. <strong>Cheapest, and it removes the synchronised-expiry version of the problem entirely.</strong> The same jitter argument as the retry module.</p>' },
                        { name: 'Single-flight', html: '<p>Only one request per key recomputes; the others wait for its result. In-process this is <code>ConcurrentHashMap.computeIfAbsent</code> or a Caffeine loading cache; across instances it needs a short-lived lock.</p>' },
                        { name: 'Stale-while-revalidate', html: '<p>Serve the expired value and refresh in the background. Nobody waits, the origin sees one request, and the cost is bounded extra staleness. Excellent for a load cache.</p>' },
                        { name: 'Probabilistic early expiry', html: '<p>Each reader refreshes with a probability that rises as expiry approaches, so one refreshes early while the entry is still valid. No lock and no coordination.</p>' },
                        { name: 'Never expire, always invalidate', html: '<p>For a small set of very hot keys, refresh on write and let the entry live indefinitely. There is no expiry to stampede on.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Cold start is the same failure at a worse moment.</strong> A Redis restart, a failover or a deployment that clears an in-process cache means <em>every</em> key misses at once — a stampede across the whole key space rather than one key, arriving exactly when the system is already recovering from something. Warming the cache before taking traffic, or bringing instances up gradually, is what stops a routine restart becoming an outage.</p>'
                }
            ],
            docs: [
                { title: 'Caching challenges and strategies', url: 'https://aws.amazon.com/builders-library/caching-challenges-and-strategies/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'caching-scale', questionId: 'cache-stampede' }
            ]
        },

        {
            id: 'redis-data-structures',
            title: 'What a Cache Should Store',
            importance: 'should-know',
            summary: 'A string is the default and a hash is better when fields change independently. The operational hazards — big keys, blocking commands, unbounded collections — are the part that bites.',
            interviewAngle: 'The nosql module asked what Redis can be. This asks what a cache should put in it, and the big-key hazard is the practical answer.',
            buildsOn: ['cache-stampede-and-mitigations'],
            blocks: [
                {
                    type: 'table',
                    title: 'Choosing the structure for a cache entry',
                    headers: ['Shape of the entry', 'Structure', 'Why'],
                    rows: [
                        ['A whole serialised object', 'String', 'The default. One read, one write, one TTL.'],
                        ['An object whose fields change separately', 'Hash', '<code>HSET</code> one field without rewriting the rest'],
                        ['A rendered fragment or response', 'String', 'Nothing to address inside it'],
                        ['A set of ids for a query result', 'Set or String', 'A set allows membership tests without deserialising'],
                        ['A ranked list — top N', 'Sorted set', '<code>ZREVRANGE</code> is the query'],
                        ['A counter', 'String with <code>INCR</code>', 'Atomic, and a natural fit for write-behind']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A big key is a latency incident waiting to happen.</strong> Redis executes commands on one thread, so a single <code>GET</code> of a 50 MB value, or an <code>HGETALL</code> over a hash with a million fields, blocks <em>every other client</em> for the duration. The symptom is unexplained latency spikes across an entire service with no slow query anywhere. Keep values small, keep collections bounded, and never let a cache entry be a structure that grows with user activity.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Three operational habits worth carrying: never <code>KEYS *</code> in production — it scans the whole keyspace on that one thread, and <code>SCAN</code> exists for this reason; pipeline batches rather than issuing a hundred round trips; and set the TTL <em>in the same command</em> as the write (<code>SET key value EX 300</code>) rather than as a second <code>EXPIRE</code>, because a crash between the two leaves a key that never expires.</p>'
                }
            ],
            docs: [
                { title: 'Redis — Data types', url: 'https://redis.io/docs/latest/develop/data-types/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'caching-scale', questionId: 'redis-beyond-a-cache' }
            ]
        },

        {
            id: 'distributed-locks-and-their-caveats',
            title: 'Distributed Locks',
            importance: 'must-know',
            summary: 'SET key value NX PX is a lock that mostly works. It cannot be made correct, because a client can stall past its own expiry and continue believing it holds the lock.',
            interviewAngle: 'The honest answer is that a Redis lock is an optimisation, not a correctness mechanism. Saying so, and giving the correct alternative, is what distinguishes it.',
            buildsOn: ['redis-data-structures'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The lock, and the failure it cannot avoid',
                    code: '// ACQUIRE: atomic set-if-absent with an expiry, and a unique token so\n// only the owner can release it.\nString token = UUID.randomUUID().toString();\nboolean acquired = redis.set(key, token,\n        SetParams.setParams().nx().px(30_000));\n\n// RELEASE: must be a Lua script. Checking the token and then deleting\n// as two commands is check-then-act -- the lock can expire between them\n// and the delete removes SOMEBODY ELSE is lock.\nString release = """\n        if redis.call(\'get\', KEYS[1]) == ARGV[1]\n        then return redis.call(\'del\', KEYS[1])\n        else return 0 end\n        """;\n\n// THE FAILURE NO IMPLEMENTATION AVOIDS:\n//   1. Client A acquires the lock, expiry 30s.\n//   2. Client A stalls -- a GC pause, a slow disk, a descheduled pod.\n//   3. 30s pass. The key expires.\n//   4. Client B acquires the lock and starts working.\n//   5. Client A resumes, still believing it holds the lock, and writes.\n// Two writers, no error, corrupted state. Redlock narrows the window\n// and does not close it, because step 2 has no upper bound.',
                    notes: '<p>The Lua script is required and is frequently omitted, and its absence is a second, more common bug than the stall: a <code>GET</code> then <code>DEL</code> pair can delete a lock acquired by another client in between, which is the same two-writers outcome arriving much more often.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The correct construction is a <strong>fencing token</strong>: the lock service issues a monotonically increasing number with each grant, the client passes it to the resource being protected, and the resource rejects any write carrying a token lower than the highest it has seen. Client A resuming with token 33 is refused because the store has already accepted token 34. That requires the protected resource to participate — which a database can, via a version column, and a plain file store cannot.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Use a Redis lock where a duplicate is wasteful, never where it is incorrect.</strong> "Probably only one instance runs this nightly job" is a fine use. "Only one instance may decrement this balance" is not — that belongs in the database, as a conditional update or a row lock, where the check and the write are the same operation and no stall can separate them.</p>'
                }
            ],
            docs: [
                { title: 'Redis — Distributed Locks', url: 'https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'caching-scale', questionId: 'distributed-locks' }
            ]
        },

        {
            id: 'cache-invalidation-strategies',
            title: 'Invalidation',
            importance: 'must-know',
            summary: 'The joke is that it is one of the two hard problems. The defence is that the difficulty is real and specific: knowing what to invalidate, and reaching every copy.',
            interviewAngle: 'Explaining WHY it is hard — derived entries, and several independent caches — is a much better answer than agreeing that it is.',
            buildsOn: ['distributed-locks-and-their-caveats'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>Invalidating one key is trivial. The difficulty is two specific things.</p><p><strong>Knowing what is affected.</strong> A product changes. That invalidates the product entry — and the category listing it appears in, the search results it matches, the rendered homepage panel, the recommendation set that included it, and the price-comparison entry. Nothing in the write knows about those, and every derived entry is a dependency somebody has to remember.</p><p><strong>Reaching every copy.</strong> The same value may be in an in-process cache on twelve instances, in Redis, in a CDN and in a browser. An eviction that reaches one of those leaves the others serving the old value for their full TTL.</p>'
                },
                {
                    type: 'types',
                    title: 'The strategies, and what each concedes',
                    items: [
                        { name: 'TTL only', html: '<p>Never invalidate; accept bounded staleness. <strong>Simplest, and correct far more often than it is used.</strong> If five minutes of staleness is acceptable, this is the whole design.</p>' },
                        { name: 'Explicit eviction on write', html: '<p>Precise, and it requires knowing every derived entry. Correct until somebody adds a thirteenth derived cache and forgets.</p>' },
                        { name: 'Key versioning', html: '<p>Include a version in the key — <code>product:42:v7</code>. Bumping the version invalidates every derived entry at once with no eviction call, and the old entries age out. Elegant, and it needs the version in scope everywhere the key is built.</p>' },
                        { name: 'Event-driven invalidation', html: '<p>Publish a change event; every instance and every cache layer subscribes. Reaches distributed copies, and inherits every delivery concern from the messaging modules.</p>' },
                        { name: 'Tag-based', html: '<p>Tag entries with the entities they depend on; invalidate a tag. Supported by some caches, and it is the general form of the problem.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>The most under-used answer is the first one. Before designing an invalidation mechanism, ask what actually breaks if the value is up to <em>N</em> seconds old. For a product description, a category listing or a dashboard figure, the honest answer is usually "nothing", and a TTL is the entire design — no events, no eviction calls, no dependency tracking, and no bug when somebody adds a new derived cache.</p>'
                }
            ],
            docs: [
                { title: 'Caching challenges and strategies', url: 'https://aws.amazon.com/builders-library/caching-challenges-and-strategies/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'caching-scale', questionId: 'cache-invalidation' }
            ]
        },

        {
            id: 'caching-in-spring',
            title: 'Spring\'s Cache Abstraction',
            importance: 'should-know',
            summary: '@Cacheable, @CacheEvict and @CachePut over a pluggable provider. The proxy caveat applies, and the key generator is the setting most likely to produce a wrong answer.',
            interviewAngle: 'The default key generator ignoring some parameters is a real, silent correctness bug, and knowing to specify the key explicitly is the practical detail.',
            buildsOn: ['cache-invalidation-strategies'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The annotations, with the keys made explicit',
                    code: '@Service\nclass ProductService {\n\n    // ALWAYS specify the key. The default generator combines all\n    // parameters -- which silently includes a Pageable or a Locale you\n    // did not intend, or omits nothing when you wanted a narrower key.\n    @Cacheable(cacheNames = "product", key = "#id")\n    Product byId(String id) { ... }\n\n    // Multi-tenant: the tenant MUST be in the key, or one tenant is\n    // served another is data. This is a security bug, not a cache bug.\n    @Cacheable(cacheNames = "product", key = "#tenant + \':\' + #id")\n    Product byId(String tenant, String id) { ... }\n\n    // Evict on write. beforeInvocation defaults to FALSE, so the\n    // eviction is skipped if the method throws -- usually what you want.\n    @CacheEvict(cacheNames = "product", key = "#product.id")\n    void save(Product product) { ... }\n\n    // @CachePut always executes the method AND updates the entry.\n    // Subject to the same write race as cache-aside put -- prefer evict.\n    @CachePut(cacheNames = "product", key = "#product.id")\n    Product update(Product product) { ... }\n\n    @CacheEvict(cacheNames = "product", allEntries = true)\n    void reloadCatalogue() { ... }\n}',
                    notes: '<p>The multi-tenant line is worth pausing on: a cache key that omits the tenant serves one customer\'s data to another, and it is a data-leak bug that no test with a single tenant will find — the same blind spot the security track described for a missing tenant predicate, in a different mechanism.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Everything here is a proxy, so a self-invoked <code>@Cacheable</code> method never caches.</strong> No error, no warning, and a hit rate of zero that looks like a cache that is simply not effective. It is the same failure as <code>@Transactional</code>, <code>@Async</code> and <code>@Retryable</code>, and the same fix: the call must cross a bean boundary.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The abstraction is provider-agnostic, and the choice matters more than the annotations. <strong>Caffeine</strong> is in-process: nanosecond reads, and every instance has its own copy with its own staleness. <strong>Redis</strong> is shared: one copy, one invalidation, and a network hop per read. A two-level arrangement — Caffeine in front of Redis — gets both, at the cost of an invalidation that must reach every instance\'s local layer, which is where the event-driven strategy from the previous chapter earns its keep.</p>'
                }
            ],
            docs: [
                { title: 'Cache Abstraction', url: 'https://docs.spring.io/spring-framework/reference/integration/cache.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'caching-scale', questionId: 'spring-cache-abstraction-pitfalls' },
                { topicId: 'aop-proxies', questionId: 'cacheable-behaviour' }
            ]
        }
    ]
};
