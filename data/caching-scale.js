/* ==========================================================================
   data/caching-scale.js — Caching, Performance & Scale

   Flat, and deliberately so: the questions form one argument that runs from
   "what should be cached" to "what breaks when it is", and headings would cut
   it in the middle.

   This is round-4 material more than round-3 material. Almost every question
   here can be answered badly by naming a technology and well by naming a
   failure mode, so they are written to reward the second.

   ONE GLOBAL PER FILE.
   ========================================================================== */

const cachingScaleData = {
    id: 'caching-scale',
    title: 'Caching, Performance & Scale',
    subsections: null,
    keyTopics: [
        'cache-aside', 'write-through', 'TTL and eviction', 'cache stampede',
        'Redis data structures', 'distributed locks', 'rate limiting algorithms',
        'consistent hashing', 'CAP', 'eventual consistency', 'back-pressure'
    ],
    questions: [

{
    id: 'caching-strategies',
    importance: 'must-know',
    subsection: null,
    question: 'What are the caching strategies, and which is the default?',
    answer:
        '<p>Five, distinguished by <strong>who writes to the cache and when</strong>.</p>' +
        '<ul>' +
        '<li><strong>Cache-aside (lazy loading).</strong> The application checks the cache, and ' +
        'on a miss loads from the source and populates it. <strong>The default, and the right ' +
        'starting point.</strong> Only requested data is cached, and a cache outage degrades ' +
        'performance rather than correctness. The costs: every miss is a round trip plus a load, ' +
        'and the first request after a deploy is always slow.</li>' +
        '<li><strong>Read-through.</strong> The same behaviour, but the cache library does the ' +
        'loading rather than the application. Tidier; the application no longer sees the ' +
        'miss.</li>' +
        '<li><strong>Write-through.</strong> Writes go to the cache and the store synchronously. ' +
        'The cache is never stale, and every write pays the cache\'s latency — including for data ' +
        'nobody will read.</li>' +
        '<li><strong>Write-behind (write-back).</strong> Write to the cache, flush to the store ' +
        'asynchronously. Very fast writes, and <strong>a window in which acknowledged data exists ' +
        'only in a cache</strong>. Losing a node loses committed writes, which rules it out for ' +
        'anything that matters.</li>' +
        '<li><strong>Refresh-ahead.</strong> Refresh popular entries before they expire, so reads ' +
        'never see a miss. Good for a small hot set, wasteful otherwise.</li>' +
        '</ul>' +
        '<p>The question behind the question is usually <em>what</em> to cache, and the honest ' +
        'answer is: <strong>data that is read far more than it is written, expensive to produce, ' +
        'and tolerant of being slightly stale.</strong> All three. Caching something that is ' +
        'written as often as it is read adds invalidation work and buys nothing, and caching ' +
        'something that must be exactly current is how a stale price reaches a customer.</p>' +
        '<p>And measure the hit rate. A cache below about 80% is often costing more than it ' +
        'saves once you count the extra round trip on every miss.</p>',
    referenceLinks: [
        { title: 'Spring Framework — Cache Abstraction', url: 'https://docs.spring.io/spring-framework/reference/integration/cache.html' }
    ],
    tags: ['caching', 'patterns', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'cache-invalidation',
    importance: 'must-know',
    subsection: null,
    question: 'How do you keep a cache from serving stale data?',
    answer:
        '<p>Three mechanisms, and the right answer usually combines them rather than choosing ' +
        'one.</p>' +
        '<ul>' +
        '<li><strong>TTL.</strong> Everything expires eventually, so staleness is bounded by a ' +
        'number you chose. Simple, robust, and it works even when your invalidation logic has a ' +
        'bug — which is why <strong>everything should have a TTL even when you also invalidate ' +
        'explicitly</strong>. It is the safety net.</li>' +
        '<li><strong>Explicit invalidation on write.</strong> The code that changes the data ' +
        'evicts the key. Precise, and it depends on every write path remembering — including the ' +
        'batch job, the admin tool and the migration script.</li>' +
        '<li><strong>Event-driven invalidation.</strong> The write emits an event and caches ' +
        'subscribe. This is what makes it work across services, where the writer does not know ' +
        'who is caching.</li>' +
        '</ul>' +
        '<p><strong>Evict rather than update.</strong> Writing the new value into the cache seems ' +
        'more efficient and introduces a race: two concurrent writers can leave the older value ' +
        'behind. Deleting the key is idempotent and the next reader repopulates it correctly.</p>' +
        '<p>Two ordering traps worth naming:</p>' +
        '<ul>' +
        '<li><strong>Evict after the database commit, not before.</strong> Evicting first leaves ' +
        'a window in which a reader repopulates the cache from the pre-commit state and the stale ' +
        'value then survives for a full TTL. Spring\'s <code>@CacheEvict(beforeInvocation = ' +
        'false)</code> is the default for this reason.</li>' +
        '<li><strong>The eviction and the commit are two systems again.</strong> A crash between ' +
        'them leaves a stale entry, which is exactly why the TTL has to exist.</li>' +
        '</ul>' +
        '<p>The framing worth offering: <strong>a cache is a second copy of the truth, so a ' +
        'system with a cache is a distributed system.</strong> Every consistency question that ' +
        'applies to replicas applies to it.</p>',
    referenceLinks: [
        { title: 'Spring Framework — Cache Annotations', url: 'https://docs.spring.io/spring-framework/reference/integration/cache/annotations.html' }
    ],
    tags: ['caching', 'consistency', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'cache-stampede',
    importance: 'must-know',
    subsection: null,
    question: 'A popular cache key expires and the database falls over. What happened, and how do you prevent it?',
    answer:
        '<p>A <strong>cache stampede</strong>, also called a dogpile or thundering herd. One key ' +
        'serving ten thousand requests a second expires; ten thousand requests miss ' +
        'simultaneously; ten thousand identical queries hit the database, which was sized for the ' +
        'cached load. It falls over, so nothing repopulates the cache, so the next ten thousand ' +
        'requests also miss.</p>' +
        '<p>Four defences, and they compose:</p>' +
        '<ul>' +
        '<li><strong>Single-flight.</strong> Only one request per key is allowed to recompute; ' +
        'the rest wait for it. Caffeine does this within a JVM, and Spring exposes it as ' +
        '<code>@Cacheable(sync = true)</code>. Across a fleet it needs a short-lived distributed ' +
        'lock — which is the one place the lock question below is genuinely the right tool.</li>' +
        '<li><strong>Stale-while-revalidate.</strong> Serve the expired value and refresh in the ' +
        'background. The best answer where slightly-old data is acceptable, because no request ' +
        'ever waits.</li>' +
        '<li><strong>Jittered TTLs.</strong> Randomise expiry by ±10% so a batch of keys ' +
        'populated together does not expire together. This is what prevents the <em>synchronised</em> ' +
        'version of the problem, which is common after a deploy or a mass cache warm.</li>' +
        '<li><strong>Probabilistic early expiration.</strong> Each reader refreshes with a small ' +
        'probability that rises as expiry approaches, so one of them refreshes early and alone. ' +
        'Elegant and needs no coordination.</li>' +
        '</ul>' +
        '<p>The related failure to be able to distinguish is <strong>cache penetration</strong>: ' +
        'requests for keys that <em>do not exist</em> always miss, so a caller iterating over ' +
        'random ids reaches the database every time. The fix is to <strong>cache the negative ' +
        'result</strong> with a short TTL, or a Bloom filter in front for a large key space.</p>' +
        '<p>And the one that takes the site down properly: <strong>cache avalanche</strong>, when ' +
        'the cache itself restarts and everything misses at once. That is a capacity question — ' +
        'can the database survive with no cache at all, even briefly — and the answers are ' +
        'warming, a request limiter in front of the origin, and not sizing the database purely ' +
        'for the cached case.</p>',
    referenceLinks: [
        { title: 'Spring Framework — Cache Annotations', url: 'https://docs.spring.io/spring-framework/reference/integration/cache/annotations.html' }
    ],
    tags: ['caching', 'incidents', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'eviction-policies',
    importance: 'should-know',
    subsection: null,
    question: 'What happens when a cache is full, and which eviction policy would you pick?',
    answer:
        '<p>Something has to go, and the policy decides what. The classics:</p>' +
        '<ul>' +
        '<li><strong>LRU</strong> — evict the least recently used. The sensible default for most ' +
        'workloads, and it has one well-known weakness: a large scan touches every key once and ' +
        'flushes the genuinely hot set out of the cache.</li>' +
        '<li><strong>LFU</strong> — least frequently used. Resistant to that scan, and slow to ' +
        'adapt when what is popular changes, unless the counts decay.</li>' +
        '<li><strong>FIFO</strong> — oldest first. Ignores usage entirely; rarely the right ' +
        'answer.</li>' +
        '<li><strong>TTL-only</strong> — nothing is evicted early, and the cache must be sized ' +
        'for the whole working set.</li>' +
        '</ul>' +
        '<p>What to know about the two implementations you will actually meet:</p>' +
        '<p><strong>Caffeine</strong>, the standard in-JVM cache, uses <strong>W-TinyLFU</strong> ' +
        '— a small admission filter that decides whether a new entry deserves to displace an ' +
        'existing one, in front of an LRU-ish structure. It gets LFU\'s scan resistance and LRU\'s ' +
        'adaptability, and it is why Caffeine consistently beats a hand-rolled ' +
        '<code>LinkedHashMap</code> LRU.</p>' +
        '<p><strong>Redis</strong> chooses by <code>maxmemory-policy</code>, and the default ' +
        'matters: <code>noeviction</code> means writes start <em>failing</em> when memory is ' +
        'full rather than anything being evicted. For a pure cache that is the wrong setting and ' +
        '<code>allkeys-lru</code> is usually right; for a Redis also holding sessions or queues ' +
        'it is the right setting, and mixing the two roles in one instance is the actual ' +
        'mistake.</p>' +
        '<p>Also worth saying: <strong>Redis approximates.</strong> It samples a handful of keys ' +
        'and evicts the best candidate among them rather than maintaining a true LRU order, ' +
        'because exact tracking would cost more than it saves.</p>',
    referenceLinks: [
        { title: 'Redis — Key Eviction', url: 'https://redis.io/docs/latest/develop/reference/eviction/' }
    ],
    tags: ['caching', 'redis', 'eviction'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'redis-beyond-a-cache',
    importance: 'should-know',
    subsection: null,
    question: 'What is Redis actually good for besides caching?',
    answer:
        '<p>The useful reframing: <strong>Redis is a server for data structures</strong>, and the ' +
        'operations on them are atomic. Most of its non-cache uses are one data structure applied ' +
        'well.</p>' +
        '<ul>' +
        '<li><strong>Sorted sets</strong> — leaderboards, and any "top N by score" query. Also ' +
        'the standard implementation of a sliding-window rate limiter and of a delayed job queue ' +
        'scored by execution time.</li>' +
        '<li><strong>Hashes</strong> — an object per key with field-level access, which is how ' +
        'session storage works. Spring Session uses exactly this.</li>' +
        '<li><strong>Sets</strong> — membership, deduplication, and set intersection for "who ' +
        'follows both of these".</li>' +
        '<li><strong>Lists</strong> — a simple queue with a blocking pop, which is enough for a ' +
        'lot of background work.</li>' +
        '<li><strong>Streams</strong> — an append-only log with consumer groups. Kafka\'s model ' +
        'at a smaller scale, without another system to run.</li>' +
        '<li><strong>Bitmaps and HyperLogLog</strong> — daily active users in kilobytes, and ' +
        'approximate cardinality of an enormous set in 12KB with about 1% error.</li>' +
        '<li><strong>Pub/sub</strong> — fan-out with no persistence, which is what makes ' +
        'WebSocket messages reach the right instance.</li>' +
        '<li><strong><code>INCR</code> and Lua scripts</strong> — atomic counters, and ' +
        'multi-step operations executed as one, which is how a correct rate limiter or lock is ' +
        'built.</li>' +
        '</ul>' +
        '<p>The two things to know about durability, because the follow-up is always whether ' +
        'Redis can be a database: <strong>RDB</strong> takes periodic snapshots and can lose ' +
        'minutes of writes; <strong>AOF</strong> appends every command and, with ' +
        '<code>everysec</code>, loses at most a second. Neither makes it a system of record, and ' +
        'the honest position is that Redis is excellent for data you can rebuild and a bad choice ' +
        'for data you cannot.</p>',
    referenceLinks: [
        { title: 'Redis — Data Types', url: 'https://redis.io/docs/latest/develop/data-types/' }
    ],
    tags: ['redis', 'data-structures'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'distributed-locks',
    importance: 'must-know',
    subsection: null,
    question: 'How would you implement a distributed lock, and what can go wrong?',
    answer:
        '<p>The minimum correct single-instance version is three things, and each one prevents a ' +
        'specific failure:</p>' +
        '<ul>' +
        '<li><strong><code>SET key token NX PX 30000</code></strong> — set only if absent, ' +
        'atomically, <strong>with an expiry</strong>. Without the expiry, a holder that crashes ' +
        'locks the resource forever.</li>' +
        '<li><strong>A random token as the value</strong>, unique to this acquisition.</li>' +
        '<li><strong>Release with a Lua script</strong> that compares the token before deleting. ' +
        'A plain <code>DEL</code> lets you delete <em>someone else\'s</em> lock — yours expired, ' +
        'another process took it, and then you released.</li>' +
        '</ul>' +
        '<p>And now the part that matters, because the question is really about ' +
        'limits: <strong>this is not a correctness guarantee.</strong> The holder can be paused ' +
        'by a GC pause or a scheduler for longer than the TTL, and it has no way to know. It ' +
        'resumes believing it holds the lock while another process also holds it. No amount of ' +
        'Redis configuration fixes this — it is a property of a lease over an asynchronous ' +
        'network.</p>' +
        '<p><strong>Redlock</strong>, the multi-instance algorithm, is genuinely contested — ' +
        'Martin Kleppmann\'s critique is the well-known one — and the objection is exactly the ' +
        'above: it improves availability and does not make the lease safe.</p>' +
        '<p>So the answers that actually hold:</p>' +
        '<ul>' +
        '<li><strong>Fencing tokens.</strong> The lock service issues a monotonically increasing ' +
        'number; the resource rejects any write with a token lower than the highest it has seen. ' +
        'The delayed process is refused. This is the only construction that is correct under ' +
        'arbitrary pauses.</li>' +
        '<li><strong>Do not need the lock.</strong> Make the operation idempotent, or use a ' +
        'conditional write — an optimistic version check, or a unique constraint — so that ' +
        'concurrent execution is safe rather than prevented.</li>' +
        '</ul>' +
        '<p>The distinction to state plainly: <strong>a Redis lock is fine for efficiency</strong> ' +
        '— stopping ten pods from doing the same expensive job — <strong>and not for ' +
        'correctness</strong>, where a double execution would be a bug.</p>',
    referenceLinks: [
        { title: 'Redis — Distributed Locks', url: 'https://redis.io/docs/latest/develop/use/patterns/distributed-locks/' }
    ],
    tags: ['redis', 'distributed', 'locking', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'rate-limiting-algorithms',
    importance: 'must-know',
    subsection: null,
    question: 'How would you implement rate limiting? Which algorithm?',
    answer:
        '<p>Four, and they differ in how they treat a burst.</p>' +
        '<ul>' +
        '<li><strong>Fixed window.</strong> A counter per key per minute. Trivial, and it permits ' +
        '<strong>double the limit across a boundary</strong> — 100 requests at 10:00:59 and 100 ' +
        'more at 10:01:00 is 200 in two seconds. Usually disqualifying.</li>' +
        '<li><strong>Sliding window log.</strong> Store a timestamp per request and count those ' +
        'inside the window. Exact, and memory grows with the request rate.</li>' +
        '<li><strong>Sliding window counter.</strong> Weight the previous window by how far into ' +
        'the current one you are. Approximate, cheap, and the usual production compromise.</li>' +
        '<li><strong>Token bucket.</strong> Tokens refill at a steady rate up to a capacity; each ' +
        'request takes one. <strong>Allows a controlled burst</strong> up to the bucket size, ' +
        'which matches how real clients behave, and it is two numbers of state. This is the ' +
        'default answer.</li>' +
        '<li><strong>Leaky bucket</strong> — the same shape used to <em>smooth</em> rather than ' +
        'permit bursts, by draining at a fixed rate. Right when you are protecting something that ' +
        'cannot absorb a spike at all.</li>' +
        '</ul>' +
        '<p><strong>Distributed is the real question.</strong> A limiter in each of ten pods, each ' +
        'allowing 100 a minute, is a limit of 1000. Shared state is required, and it must be ' +
        'updated atomically — <code>INCR</code> with an expiry, or a Lua script for token bucket, ' +
        'so that check-then-set is one operation. Bucket4j and Resilience4j both do this over ' +
        'Redis or Hazelcast.</p>' +
        '<p>Three details that separate a considered answer:</p>' +
        '<ul>' +
        '<li><strong>Return 429 with <code>Retry-After</code></strong> and the ' +
        '<code>RateLimit-*</code> headers, so a well-behaved client backs off instead of ' +
        'guessing.</li>' +
        '<li><strong>Choose the key deliberately</strong> — per user, per API key, per IP, or ' +
        'per endpoint. IP is the weakest: it punishes everyone behind a NAT and is trivially ' +
        'evaded.</li>' +
        '<li><strong>Fail open or closed, on purpose.</strong> If Redis is unavailable, does ' +
        'traffic flow or stop? Both are defensible and the decision must be made before the ' +
        'incident.</li>' +
        '</ul>',
    referenceLinks: [
        { title: 'RFC 6585 — 429 Too Many Requests', url: 'https://www.rfc-editor.org/rfc/rfc6585.html' }
    ],
    tags: ['rate-limiting', 'distributed', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'consistent-hashing',
    importance: 'should-know',
    subsection: null,
    question: 'What problem does consistent hashing solve?',
    answer:
        '<p><strong>Remapping when the number of nodes changes.</strong> With plain ' +
        '<code>hash(key) % n</code>, changing <code>n</code> from 4 to 5 moves roughly ' +
        '<strong>80% of all keys</strong> to a different node. For a cache that is a total cold ' +
        'start; for a shard it is a migration.</p>' +
        '<p>Consistent hashing places both nodes and keys on a ring by hashing them. A key is ' +
        'owned by the first node clockwise from it. Add or remove a node and only the keys in ' +
        '<em>that node\'s arc</em> move — roughly <code>1/n</code> of them. Everything else stays ' +
        'exactly where it was.</p>' +
        '<p><strong>Virtual nodes</strong> are the necessary refinement. With one point per node ' +
        'the arcs are wildly uneven, so each physical node is placed at a hundred or more points ' +
        'on the ring. That evens out the distribution and also spreads a departing node\'s keys ' +
        'across all the survivors instead of dumping them on a single neighbour — which would ' +
        'overload it and cascade.</p>' +
        '<p>Where it turns up: Memcached client libraries, Cassandra and DynamoDB partitioning, ' +
        'Riak, and shard routing in general.</p>' +
        '<p>Two things worth adding. <strong>Redis Cluster does not use it</strong> — it uses ' +
        '16,384 fixed hash slots assigned to nodes, which achieves the same goal more simply ' +
        'because slots can be moved explicitly and the mapping is small enough to gossip. And ' +
        '<strong>rendezvous hashing</strong> is the simpler alternative that gives the same ' +
        'minimal-disruption property with no ring and no virtual nodes: hash the key with each ' +
        'node and pick the highest score.</p>',
    referenceLinks: [
        { title: 'Redis — Cluster Specification', url: 'https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/' }
    ],
    tags: ['distributed', 'sharding', 'hashing'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'cap-and-what-it-actually-says',
    importance: 'must-know',
    subsection: null,
    question: 'What does CAP actually say, and how is it usually misquoted?',
    answer:
        '<p>The misquote is "pick two of consistency, availability and partition tolerance", ' +
        'which implies you could choose CA. <strong>You cannot.</strong> Partitions are a fact ' +
        'about networks, not a design option — cables fail, switches reboot, packets are dropped. ' +
        'So P is mandatory and the real statement is narrower and more useful:</p>' +
        '<p><strong>When a partition occurs, you must choose between consistency and ' +
        'availability.</strong> Either the side that cannot reach its peers refuses to serve ' +
        '(CP), or it serves possibly-stale data and reconciles later (AP).</p>' +
        '<ul>' +
        '<li><strong>CP</strong> — a minority partition returns errors rather than wrong ' +
        'answers. ZooKeeper, etcd, and any consensus system. Correct when a wrong answer is worse ' +
        'than no answer: a lock service, a leader election, a bank balance.</li>' +
        '<li><strong>AP</strong> — every node answers and conflicts are resolved afterwards. ' +
        'Cassandra and DynamoDB by default. Correct when unavailability costs more than ' +
        'staleness: a product catalogue, a session store, a feed.</li>' +
        '</ul>' +
        '<p><strong>PACELC is the extension worth naming</strong>, because it covers the 99.9% of ' +
        'the time when there is no partition: <em>if there is a Partition, choose Availability or ' +
        'Consistency; Else, choose Latency or Consistency.</em> That is the trade you actually ' +
        'make every day — a synchronous replica costs latency on every write, whether or not ' +
        'anything has failed.</p>' +
        '<p>Two things that sharpen the answer further. <strong>Consistency in CAP means ' +
        'linearizability</strong>, not the C in ACID — they are unrelated words. And ' +
        '<strong>the choice is per operation, not per database.</strong> Cassandra can be asked ' +
        'for a quorum read, and Postgres can be told not to wait for a replica. Describing a ' +
        'system as "an AP database" is a simplification of a decision made per query.</p>',
    referenceLinks: [
        { title: 'Cassandra — Consistency Levels', url: 'https://cassandra.apache.org/doc/latest/cassandra/architecture/dynamo.html' }
    ],
    tags: ['distributed', 'cap', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'eventual-consistency-in-practice',
    importance: 'should-know',
    subsection: null,
    question: 'Eventual consistency sounds fine in theory. What does it look like to a user?',
    answer:
        '<p>Like a bug, unless someone designed for it. That is the whole content of this ' +
        'question, and the concrete examples are what make an answer credible.</p>' +
        '<p><strong>Read-your-writes.</strong> A user updates their profile, the write goes to ' +
        'the primary, the next read goes to a replica that has not caught up, and the form shows ' +
        'the old value. They assume it did not save and do it again. The fixes: route a user\'s ' +
        'reads to the primary for a few seconds after they write, or return the new value from ' +
        'the write and render that.</p>' +
        '<p><strong>Monotonic reads.</strong> Two consecutive reads hit different replicas and ' +
        'the second is <em>older</em> than the first, so data appears to disappear. Sticky ' +
        'routing per session fixes it.</p>' +
        '<p><strong>Causal ordering.</strong> A comment appears before the post it replies to, ' +
        'because two writes propagated at different speeds.</p>' +
        '<p>The general lesson: <strong>the guarantees have names and they can be chosen ' +
        'individually.</strong> Read-your-writes, monotonic reads, monotonic writes and ' +
        'consistent prefix are separate properties, and most applications need the first two and ' +
        'nothing stronger — which is far cheaper than full linearizability.</p>' +
        '<p>The product-side half of the answer, which is often the one that impresses: ' +
        '<strong>make the eventual state visible rather than hiding it.</strong> "Processing", ' +
        '"pending", "will appear shortly" are honest, and users accept them. What they do not ' +
        'accept is an action that appears to have failed. And when conflicts are possible, decide ' +
        'deliberately how they resolve — last-write-wins silently discards someone\'s work, and ' +
        'is frequently the wrong default even though it is the easy one.</p>',
    referenceLinks: [
        { title: 'Cassandra — Dynamo Architecture', url: 'https://cassandra.apache.org/doc/latest/cassandra/architecture/dynamo.html' }
    ],
    tags: ['distributed', 'consistency', 'product'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'spring-cache-abstraction-pitfalls',
    importance: 'should-know',
    subsection: null,
    question: 'What are the traps in Spring\'s @Cacheable?',
    answer:
        '<p>Four, and three of them are silent — the cache simply does nothing and the ' +
        'application is merely slower.</p>' +
        '<p><strong>1. Self-invocation.</strong> <code>@Cacheable</code> is proxy-based, exactly ' +
        'like <code>@Transactional</code>. A call from one method of a bean to another ' +
        '<code>@Cacheable</code> method of the same bean goes straight to the target and skips ' +
        'the cache entirely. Same rule, same fix: put the cached method on another bean, or ' +
        'inject self.</p>' +
        '<p><strong>2. The default key is the arguments.</strong> That is fine until a method ' +
        'takes a <code>Pageable</code> or an object with no sensible <code>hashCode</code>, at ' +
        'which point two logically identical calls produce different keys and the hit rate is ' +
        'zero. Specify <code>key</code> with SpEL and keep it simple and stable.</p>' +
        '<p><strong>3. Caching is not aware of transactions.</strong> ' +
        '<code>@Cacheable</code> populates the cache during the method, before the surrounding ' +
        'transaction commits — so a rollback leaves a cached value that never existed in the ' +
        'database. <code>@CacheEvict(beforeInvocation = false)</code>, the default, evicts after ' +
        'the method returns but still before the outer commit. For anything sensitive, evict on ' +
        'an after-commit event.</p>' +
        '<p><strong>4. <code>null</code> is cached by default</strong>, which is usually right — ' +
        'it prevents cache penetration — and occasionally surprising. ' +
        '<code>unless = "#result == null"</code> turns it off.</p>' +
        '<p>Two things worth adding. <strong><code>sync = true</code></strong> serialises ' +
        'concurrent misses on one key within the JVM, which is the built-in stampede defence and ' +
        'is not enabled by default. And <strong>the cache abstraction hides which cache you are ' +
        'using</strong> — Caffeine and Redis have completely different failure modes, and code ' +
        'written against the annotation alone will behave very differently when someone swaps ' +
        'the manager.</p>',
    referenceLinks: [
        { title: 'Spring Framework — Cache Annotations', url: 'https://docs.spring.io/spring-framework/reference/integration/cache/annotations.html' }
    ],
    tags: ['spring', 'caching', 'pitfalls'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'scaling-reads-and-writes',
    importance: 'should-know',
    subsection: null,
    question: 'Traffic has grown ten times. What do you do first?',
    answer:
        '<p><strong>Measure, and resist the urge to shard.</strong> The order below is roughly ' +
        'increasing cost and irreversibility, and going out of order is the most common expensive ' +
        'mistake.</p>' +
        '<ul>' +
        '<li><strong>Find out what is actually slow.</strong> A p99 latency breakdown by ' +
        'endpoint, then by dependency. Most "we need to scale" turns out to be one missing index ' +
        'or one N+1.</li>' +
        '<li><strong>Fix the queries.</strong> Indexes, pagination, and removing the N+1. Cheapest ' +
        'available capacity by a wide margin.</li>' +
        '<li><strong>Scale up.</strong> A bigger database instance is a config change and buys ' +
        'a year. Engineers skip this because it feels unsophisticated; it is almost always ' +
        'correct.</li>' +
        '<li><strong>Cache.</strong> With the invalidation story decided first, not after.</li>' +
        '<li><strong>Scale out the stateless tier.</strong> More application instances, which is ' +
        'easy precisely because they hold no state — and worth checking that they really do ' +
        'not.</li>' +
        '<li><strong>Read replicas.</strong> Reads are usually the bulk of the load and this ' +
        'moves them off the primary. The bill is <strong>replication lag</strong> and every ' +
        'read-your-writes problem above.</li>' +
        '<li><strong>Split by function.</strong> Move a heavy, self-contained workload to its own ' +
        'database.</li>' +
        '<li><strong>Shard.</strong> Last. It breaks cross-shard joins, transactions, unique ' +
        'constraints and every report you have, and choosing the wrong shard key is very ' +
        'expensive to undo.</li>' +
        '</ul>' +
        '<p>Two ideas worth having ready. <strong>Write load is the harder half</strong> — reads ' +
        'scale with replicas and cache, writes go to one primary, so batching, asynchronous ' +
        'processing and queueing at the edge do more than another replica. And ' +
        '<strong>back-pressure beats collapse</strong>: a system that sheds load with a 429 or a ' +
        'bounded queue degrades predictably, while one that accepts everything degrades all at ' +
        'once and for everybody.</p>',
    referenceLinks: [
        { title: 'PostgreSQL 16 — High Availability and Replication', url: 'https://www.postgresql.org/docs/16/high-availability.html' }
    ],
    tags: ['scaling', 'performance', 'judgement'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
}

    ]
};
