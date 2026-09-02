/* ==========================================================================
   data/theory/sets/drills-machine-coding.js — Synthesis, tier 1

   Eight ninety-to-hundred-and-twenty-minute builds, the round-2 material.
   These are sets rather than chapters: a set has no place in a reading order,
   which is why this module declares no prerequisites and sits on the
   `synthesis` track rather than a subject one.

   THE SKETCH IS COLLAPSED ON PURPOSE and every drill's real content is its
   watchFor list. Reading the answer before attempting is the one way to get
   nothing at all out of an exercise whose entire value is what you discover
   while failing at it under a clock.

   The five tier-1 watchFor lines are verbatim across all eight, and
   validate-theory.js enforces that. Verbatim matters: a reader who meets
   "Business rules inside the controller" in one drill and "Logic in the
   controller layer" in the next reads two lessons where there is one.
   ========================================================================== */

const TIER1_WATCH = [
    'No interface for the thing that will vary',
    'Business rules inside the controller',
    'Concurrency ignored on the one operation that has contention',
    'No test or driver — the interviewer cannot see it work',
    'Ran out of time because the schema was designed for ten minutes'
];

const drillsMachineCodingModule = {
    id: 'drills-machine-coding',
    trackId: 'synthesis',
    order: 901,
    title: 'Machine Coding Builds',
    tagline: 'Round 2. Ninety minutes, a keyboard, and something that has to run.',
    estimatedMinutes: 120,
    prerequisites: [],
    docHub: {
        title: 'Effective Java, 3rd edition — the item list',
        url: 'https://www.oreilly.com/library/view/effective-java/9780134686097/'
    },

    chapters: [
        {
            id: 'splitwise-expense-api',
            title: 'Split an Expense',
            importance: 'must-know',
            summary: 'Groups, expenses, unequal splits, and a settle-up that has to net down to the fewest transfers.',
            interviewAngle: 'The most-set LLD problem in Indian backend hiring. The split strategy is the interface they are looking for, and the settle-up is where people run out of time.',
            buildsOn: [],
            blocks: [
                {
                    type: 'drill',
                    id: 'drill-splitwise-expense-api',
                    tier: 1,
                    title: 'Splitwise: expenses, balances, settle-up',
                    minutes: 120,
                    prompt: 'Build a service where a user creates a group, adds members, records an expense paid by one member and split among several, and asks for the net balance between any two members. Support equal, exact-amount and percentage splits. Add a settle-up that returns the smallest set of transfers that clears the group. In-memory storage is fine; a REST layer is optional and should be last.',
                    watchFor: TIER1_WATCH.concat([
                        'Money held as a double — use BigDecimal or long paise, and say which',
                        'Balances recomputed from every expense on each read instead of maintained',
                        'A split that does not sum to the total because of rounding, with no rule for who absorbs the remainder'
                    ]),
                    sketch: {
                        language: 'java',
                        title: 'The one interface the whole problem turns on',
                        code: 'interface SplitStrategy {\n    // Returns each participant\'s share. MUST sum exactly to total:\n    // the remainder from an uneven division is assigned, not dropped.\n    Map<UserId, Money> shares(Money total, List<Participant> among);\n}\n\nfinal class EqualSplit implements SplitStrategy { ... }\nfinal class ExactSplit implements SplitStrategy { ... }\nfinal class PercentageSplit implements SplitStrategy { ... }\n\n// Settle-up is a greedy match over two heaps: biggest creditor against\n// biggest debtor, repeat. It is not optimal in general -- the optimal\n// problem is NP-hard -- and SAYING SO is worth more than the code.\nList<Transfer> settle(Map<UserId, Money> netBalances) { ... }',
                        notes: '<p>The rounding rule is the detail that separates a working submission from a nearly-working one. Three people splitting ₹100 equally is 33.33 three times and one paisa unaccounted for. Pick a rule — the payer absorbs it, or the first participant does — and write it down in a comment.</p>'
                    }
                }
            ],
            docs: [{ title: 'BigDecimal — javadoc', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/math/BigDecimal.html', kind: 'api' }],
            relatedQuestions: []
        },

        {
            id: 'parking-lot-service',
            title: 'Parking Lot',
            importance: 'must-know',
            summary: 'The canonical warm-up, and the one where an over-designed class hierarchy eats the clock.',
            interviewAngle: 'Everybody has seen it, which raises the bar: they are watching whether you spend twenty minutes on an inheritance tree for vehicle types.',
            buildsOn: [],
            blocks: [
                {
                    type: 'drill',
                    id: 'drill-parking-lot-service',
                    tier: 1,
                    title: 'Parking lot: allocation, pricing, exit',
                    minutes: 90,
                    prompt: 'Multi-floor lot with spot sizes (motorcycle, car, van). Park a vehicle and get a ticket; unpark and get a fee. Pricing varies by vehicle type and by duration, with the first fifteen minutes free. Support a query for free spots per floor. Make the allocation strategy pluggable — nearest-to-entrance today, floor-fill tomorrow.',
                    watchFor: TIER1_WATCH.concat([
                        'A deep Vehicle inheritance tree that pays for nothing — an enum plus a size is usually enough',
                        'Fee computed inside the ticket rather than by a strategy that can be swapped',
                        'No thought given to two cars racing for the last spot'
                    ]),
                    sketch: {
                        language: 'java',
                        title: 'Two strategies and the one place contention lives',
                        code: 'interface SpotAllocator { Optional<Spot> allocate(VehicleSize size); }\ninterface PricingPolicy  { Money fee(VehicleSize size, Duration stayed); }\n\n// The contended operation, and the only one. Everything else in this\n// problem is a read. A ConcurrentHashMap of free spots per floor plus\n// a compute-if-present is enough; a lock around the whole lot is not.\nOptional<Ticket> park(Vehicle v) { ... }',
                        notes: '<p>Say out loud that <code>park</code> is the only contended operation. An interviewer who has watched forty candidates put <code>synchronized</code> on every method notices the one who names the single place it is needed.</p>'
                    }
                }
            ],
            docs: [{ title: 'ConcurrentHashMap — javadoc', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/ConcurrentHashMap.html', kind: 'api' }],
            relatedQuestions: [{ topicId: 'collections', questionId: 'concurrenthashmap-internals' }]
        },

        {
            id: 'movie-ticket-booking',
            title: 'Book a Seat',
            importance: 'must-know',
            summary: 'Seat holds that expire, and a double-booking that must be impossible rather than unlikely.',
            interviewAngle: 'This is the concurrency drill wearing a domain. If your booking is a read-then-write with no atomic step, you have failed it whatever else works.',
            buildsOn: [],
            blocks: [
                {
                    type: 'drill',
                    id: 'drill-movie-ticket-booking',
                    tier: 1,
                    title: 'Cinema booking with expiring seat holds',
                    minutes: 120,
                    prompt: 'Shows, screens, seats. A user selects seats and gets a hold valid for five minutes; confirming within the window books them, and letting it lapse releases them. Two users must never book the same seat. Provide seat availability for a show, and make the hold expiry work without a thread per hold.',
                    watchFor: TIER1_WATCH.concat([
                        'A check-then-book with a gap between them — the classic lost update',
                        'One timer thread per hold instead of a lazy sweep or a scheduled scan',
                        'Expiry treated as a background job only, so an availability read can still return a seat whose hold lapsed a second ago'
                    ]),
                    sketch: {
                        language: 'java',
                        title: 'Atomic hold, and expiry read lazily',
                        code: '// One compareAndSet per seat. No lock spanning the selection, and\n// no window between "is it free" and "it is mine".\nboolean hold(SeatId seat, UserId user, Instant now) {\n    return state.compute(seat, (id, current) ->\n        (current == null || current.expiredAt(now))\n            ? Hold.by(user, now.plus(HOLD_WINDOW))\n            : current\n    ).heldBy(user);\n}\n\n// Expiry is evaluated ON READ as well as swept in the background.\n// A sweep alone means availability lags the clock by one interval.',
                        notes: '<p>The interviewer is looking for one sentence: <em>the hold is a single atomic operation on the seat, so two concurrent holds cannot both succeed.</em> Everything else in the problem is bookkeeping around that.</p>'
                    }
                }
            ],
            docs: [{ title: 'ScheduledExecutorService — javadoc', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/ScheduledExecutorService.html', kind: 'api' }],
            relatedQuestions: [{ topicId: 'transactions', questionId: 'lost-update' }]
        },

        {
            id: 'inventory-reservation',
            title: 'Reserve Stock',
            importance: 'must-know',
            summary: 'Optimistic locking under real contention, and what the retry policy has to be.',
            interviewAngle: 'The one tier-1 drill that is usually set with a database in it, because the answer is a version column and a bounded retry rather than a mutex.',
            buildsOn: [],
            blocks: [
                {
                    type: 'drill',
                    id: 'drill-inventory-reservation',
                    tier: 1,
                    title: 'Reserve, confirm and release inventory',
                    minutes: 90,
                    prompt: 'A warehouse holds N units of each SKU. An order reserves units, later confirms or cancels, and an unconfirmed reservation expires. Never allow the reserved total to exceed stock, under concurrent load. Then show what changes when the stock row is the hottest row in the database.',
                    watchFor: TIER1_WATCH.concat([
                        'A synchronized block that would not survive a second instance of the service',
                        'Optimistic locking with an unbounded retry loop, which turns contention into a livelock',
                        'Reserved and available modelled as one number, so a cancellation cannot be told from a sale'
                    ]),
                    sketch: {
                        language: 'sql',
                        title: 'Conditional update: the whole answer in one statement',
                        code: '-- The predicate IS the check. If it does not hold, zero rows update\n-- and the caller knows it lost -- with no read-then-write window at\n-- all, and no lock held across a round trip.\nUPDATE stock\n   SET reserved = reserved + :qty\n WHERE sku = :sku\n   AND reserved + :qty <= on_hand;\n\n-- Under heavy contention on ONE sku this serialises on the row, and\n-- that is the point at which you talk about sharding the counter into\n-- N sub-rows and summing them, or moving the hot count to Redis with\n-- a reconciliation job.',
                        output: {
                            kind: 'trace',
                            lines: [
                                'Rows updated = 1 means the reservation succeeded.',
                                'Rows updated = 0 means somebody else took the last unit; there is no third outcome and no exception to catch.',
                                'A version column plus a retry is the JPA-shaped version of the same idea, and it costs one extra round trip per conflict.',
                                'PostgreSQL 16 serialises concurrent updates of the same row, so throughput on one hot SKU is bounded by the row, not by the pool.'
                            ]
                        }
                    }
                }
            ],
            docs: [{ title: 'PostgreSQL 16 — Transaction isolation', url: 'https://www.postgresql.org/docs/16/transaction-iso.html', kind: 'spec' }],
            relatedQuestions: [{ topicId: 'transactions', questionId: 'optimistic-locking-details' }]
        },

        {
            id: 'url-shortener-service',
            title: 'Shorten a URL',
            importance: 'should-know',
            summary: 'Encoding, collisions, custom aliases, and the difference between a counter and a hash.',
            interviewAngle: 'Deceptively small. The follow-up is always "now two instances", and a random-until-unique loop answers it badly.',
            buildsOn: [],
            blocks: [
                {
                    type: 'drill',
                    id: 'drill-url-shortener-service',
                    tier: 1,
                    title: 'URL shortener with custom aliases',
                    minutes: 90,
                    prompt: 'Shorten a long URL to a seven-character key, resolve it back, support a caller-supplied custom alias, and support expiry. Then answer: what happens when a second instance starts, and what happens when a custom alias collides with a generated one?',
                    watchFor: TIER1_WATCH.concat([
                        'Random key, check the database, retry — fine at low volume and quietly quadratic as the space fills',
                        'Base62 of an auto-increment, with no acknowledgement that the keys are then guessable and enumerable',
                        'Custom aliases and generated keys in one namespace with nothing reserving the overlap'
                    ]),
                    sketch: {
                        language: 'java',
                        title: 'Two designs, and the sentence that chooses between them',
                        code: '// A. Counter + base62. Collision-free by construction, one row per\n//    key, and the keys are sequential -- so they are enumerable.\n//    Fix by encoding counter XOR a fixed secret permutation.\nString encode(long id) { ... }   // base62 of an allocated block\n\n// B. Hash the URL, take 7 chars, handle collision by re-hashing with\n//    a salt. Same long URL gives the same key for free; needs a\n//    uniqueness constraint and a retry, and the retry is BOUNDED.\n\n// Two instances: A needs a block allocator (each instance takes\n// 10,000 ids at a time), B needs nothing. That is the trade to say\n// out loud.',
                        notes: '<p>Custom aliases go in the same table with a flag, and the reserved range is handled by allocating generated keys only from a length or prefix that custom aliases are refused. Two namespaces in one column with nothing separating them is the defect.</p>'
                    }
                }
            ],
            docs: [{ title: 'PostgreSQL 16 — UNIQUE constraints', url: 'https://www.postgresql.org/docs/16/ddl-constraints.html', kind: 'spec' }],
            relatedQuestions: [{ topicId: 'sql-databases', questionId: 'primary-key-choice' }]
        },

        {
            id: 'in-memory-kv-with-ttl',
            title: 'A Key-Value Store With Expiry',
            importance: 'should-know',
            summary: 'Expiry, eviction and thread safety, with no library allowed to do any of it.',
            interviewAngle: 'Tests whether you can build what ConcurrentHashMap gives you for free, and know which parts it does not.',
            buildsOn: [],
            blocks: [
                {
                    type: 'drill',
                    id: 'drill-in-memory-kv-with-ttl',
                    tier: 1,
                    title: 'get / put / putIfAbsent, with TTL and a size bound',
                    minutes: 90,
                    prompt: 'Build a thread-safe key-value store with per-entry TTL and a maximum size. Expired entries must never be returned. When the store is full, evict by least-recently-used. Provide get, put, putIfAbsent, remove and size. No Guava, no Caffeine.',
                    watchFor: TIER1_WATCH.concat([
                        'One global lock, when the whole point is per-bucket or per-key granularity',
                        'size() counting entries that have expired but not yet been swept',
                        'A cleaner thread with no bound, so eviction competes with the workload it exists to help'
                    ]),
                    sketch: {
                        language: 'java',
                        title: 'Lazy expiry, and why size() is the hard method',
                        code: 'V get(K key) {\n    Entry<V> e = map.get(key);\n    if (e == null) return null;\n    if (e.expired(clock.instant())) {\n        map.remove(key, e);          // two-arg: do not remove a\n        return null;                 // replacement written meanwhile\n    }\n    touch(key);                      // LRU bookkeeping\n    return e.value;\n}\n\n// size() must not count expired-but-unswept entries, or the store\n// reports a number no get() will confirm. Either sweep before\n// answering, or maintain a live counter decremented on lazy expiry.',
                        notes: '<p>The two-argument <code>remove(key, expected)</code> is the detail worth pointing at: the one-argument version would discard a value another thread wrote between the read and the removal.</p>'
                    }
                }
            ],
            docs: [{ title: 'ConcurrentMap — javadoc', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/ConcurrentMap.html', kind: 'api' }],
            relatedQuestions: [{ topicId: 'collections', questionId: 'concurrenthashmap-internals' }]
        },

        {
            id: 'lru-cache-custom-eviction',
            title: 'LRU in O(1)',
            importance: 'must-know',
            summary: 'The named classic. A hash map into a doubly-linked list, and both operations constant time.',
            interviewAngle: 'Asked verbatim often enough that a slow answer is a red flag. The extension — make the eviction policy pluggable — is what the ninety minutes are actually for.',
            buildsOn: [],
            blocks: [
                {
                    type: 'drill',
                    id: 'drill-lru-cache-custom-eviction',
                    tier: 1,
                    title: 'LRU cache, then swap the policy for LFU',
                    minutes: 90,
                    prompt: 'Implement an LRU cache with O(1) get and put. Then, without changing the cache class, swap the eviction policy to least-frequently-used with a recency tie-break. Then make it thread-safe and say what that costs.',
                    watchFor: TIER1_WATCH.concat([
                        'LinkedHashMap with accessOrder used as the answer rather than as the fallback — say you know it exists, then build the list',
                        'O(n) eviction because the policy scans for a victim',
                        'Thread safety added by wrapping every method in synchronized, with no mention of what that does to the O(1) claim under contention'
                    ]),
                    sketch: {
                        language: 'java',
                        title: 'The interface that makes the second half possible',
                        code: 'interface EvictionPolicy<K> {\n    void recordAccess(K key);\n    void recordInsert(K key);\n    K    victim();          // O(1), or the cache is not O(1)\n    void forget(K key);\n}\n\n// LRU: a doubly-linked list; victim() is the tail.\n// LFU: buckets by frequency plus a pointer to the lowest non-empty\n//      bucket; victim() is the LRU end of that bucket.\n//\n// The cache holds a HashMap<K, Node> and delegates every ordering\n// decision. Writing the cache against this interface FIRST is what\n// makes the LFU extension ten minutes instead of a rewrite.',
                        notes: '<p>This is the drill where the tier-1 watch line about "no interface for the thing that will vary" is not a generic caution — the second half of the prompt is designed to punish its absence, and an interviewer will ask for it whether or not it is written down.</p>'
                    }
                }
            ],
            docs: [{ title: 'LinkedHashMap — javadoc', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/LinkedHashMap.html', kind: 'api' }],
            relatedQuestions: [{ topicId: 'collections', questionId: 'linkedhashmap-lru' }]
        },

        {
            id: 'ride-matching-service',
            title: 'Match a Rider to a Driver',
            importance: 'should-know',
            summary: 'A state machine with cancellation in it, and a matching step that must not offer one driver two rides.',
            interviewAngle: 'The state machine is the deliverable. Candidates who model states as booleans lose the ability to reject an illegal transition, and it shows within twenty minutes.',
            buildsOn: [],
            blocks: [
                {
                    type: 'drill',
                    id: 'drill-ride-matching-service',
                    tier: 1,
                    title: 'Request, match, accept, cancel',
                    minutes: 120,
                    prompt: 'Riders request a ride from a location. Nearby available drivers are offered it in order; the first to accept gets it and the offer to the others is withdrawn. Either side may cancel, with different consequences depending on the state. Model the ride lifecycle explicitly and make an illegal transition impossible rather than merely unlikely.',
                    watchFor: TIER1_WATCH.concat([
                        'States modelled as booleans — accepted, cancelled, completed — so ACCEPTED and CANCELLED can both be true',
                        'A driver offered two rides at once because availability is checked but not claimed',
                        'Cancellation handled only in the happy state, with nothing said about cancelling during matching'
                    ]),
                    sketch: {
                        language: 'java',
                        title: 'One enum, one transition table, one place to reject',
                        code: 'enum RideState { REQUESTED, MATCHING, ACCEPTED, IN_PROGRESS, COMPLETED, CANCELLED }\n\nprivate static final Map<RideState, Set<RideState>> ALLOWED = Map.of(\n    RideState.REQUESTED,   EnumSet.of(RideState.MATCHING,    RideState.CANCELLED),\n    RideState.MATCHING,    EnumSet.of(RideState.ACCEPTED,    RideState.CANCELLED),\n    RideState.ACCEPTED,    EnumSet.of(RideState.IN_PROGRESS, RideState.CANCELLED),\n    RideState.IN_PROGRESS, EnumSet.of(RideState.COMPLETED),\n    RideState.COMPLETED,   EnumSet.noneOf(RideState.class),\n    RideState.CANCELLED,   EnumSet.noneOf(RideState.class)\n);\n\nvoid transition(Ride ride, RideState to) {\n    if (!ALLOWED.get(ride.state()).contains(to)) {\n        throw new IllegalStateTransition(ride.state(), to);\n    }\n    ride.setState(to);\n}',
                        notes: '<p>The table makes "can a completed ride be cancelled?" a question with an answer you can point at, rather than a scattering of <code>if</code> statements that have to be read together. Matching itself is a claim on the driver — the same atomic-hold shape as the cinema drill.</p>'
                    }
                }
            ],
            docs: [{ title: 'EnumSet — javadoc', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/EnumSet.html', kind: 'api' }],
            relatedQuestions: []
        }
    ]
};
