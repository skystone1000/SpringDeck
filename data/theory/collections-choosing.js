/* ==========================================================================
   data/theory/collections-choosing.js — module 12 in the reading path

   The decision table, defended. Every claim in it is a claim about a cost,
   and the chapters exist to say where the cost comes from — a table with no
   reasoning under it is a thing to memorise and forget.
   ========================================================================== */

const collectionsChoosingModule = {
    id: 'collections-choosing',
    trackId: 'java-platform',
    order: 12,
    title: 'Collections: Choosing Correctly',
    tagline: 'The decision table, defended.',
    estimatedMinutes: 35,
    prerequisites: ['generics-and-erasure'],
    docHub: { title: 'java.util — the Collections Framework', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/package-summary.html' },

    chapters: [
        {
            id: 'the-interfaces',
            title: 'The Interfaces, and the One Added in Java 21',
            importance: 'should-know',
            summary: 'Four interfaces carry the framework, Map is deliberately not one of them, and Java 21 added the layer that had been missing since 1998.',
            interviewAngle: 'A structural warm-up. The two things worth landing are that Map is not a Collection and why, and that SequencedCollection exists — the second dates your knowledge to the right decade at no cost.',
            buildsOn: [],
            blocks: [
                {
                    type: 'types',
                    title: 'The shape of it',
                    items: [
                        { name: 'Iterable', html: '<p>The root. One method, <code>iterator()</code>, and it is what the enhanced <code>for</code> loop desugars to. Anything implementing it can be looped over.</p>' },
                        { name: 'Collection', html: '<p>Add, remove, contains, size. Everything below it is a Collection <em>except</em> Map.</p>' },
                        { name: 'List', html: '<p>Ordered by position, duplicates allowed, indexable.</p>' },
                        { name: 'Set', html: '<p>No duplicates, as decided by <code>equals</code> — which is why the object-contract module comes before this one.</p>' },
                        { name: 'Queue / Deque', html: '<p>Ordered for removal rather than by position. A <code>Deque</code> is a queue open at both ends, and therefore also a stack.</p>' },
                        { name: 'Map', html: '<p><strong>Not a Collection.</strong> A Collection holds elements and a Map holds <em>pairs</em>, so <code>add(E)</code> has no meaning on it. It offers three collection <em>views</em> instead — <code>keySet</code>, <code>values</code>, <code>entrySet</code> — and those are views, not copies: removing from <code>keySet</code> removes from the map.</p>' }
                    ]
                },
                {
                    type: 'version',
                    title: 'SequencedCollection',
                    items: [
                        { version: 'Java 1.2 → 20', state: 'was', html: '<p>No common type for "has a defined encounter order". Getting the first element was <code>list.get(0)</code>, <code>deque.peekFirst()</code>, or <code>linkedHashSet.iterator().next()</code>. Getting the <em>last</em> element of a <code>LinkedHashSet</code> required iterating the whole thing.</p>' },
                        { version: 'Java 21', state: 'is', html: '<p>JEP 431 added <code>SequencedCollection</code>, <code>SequencedSet</code> and <code>SequencedMap</code>, retrofitted onto <code>List</code>, <code>Deque</code>, <code>LinkedHashSet</code>, <code>LinkedHashMap</code> and <code>SortedSet</code>. Uniform <code>addFirst</code>, <code>addLast</code>, <code>getFirst</code>, <code>getLast</code>, <code>removeFirst</code>, <code>removeLast</code> and <code>reversed()</code> — the last being a <em>view</em>, not a copy.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>The retrofit broke source compatibility in one place, and it is worth knowing why.</strong> <code>List</code> gained <code>getFirst()</code>, and any class implementing <code>List</code> that already had an unrelated <code>getFirst()</code> with a different return type no longer compiles. This is the cost default methods were designed to avoid and could not avoid here, and it is a good concrete answer to "have you seen a Java upgrade break something".</p>'
                }
            ],
            docs: [
                { title: 'JEP 431: Sequenced Collections', url: 'https://openjdk.org/jeps/431', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'collections', questionId: 'sequenced-collections' },
                { topicId: 'collections', questionId: 'map-entry-views' }
            ]
        },

        {
            id: 'arraylist-vs-linkedlist',
            title: 'ArrayList and LinkedList',
            importance: 'must-know',
            summary: 'The big-O table says LinkedList wins at insertion. It does not, on real hardware, in almost every real case — and knowing why is a better answer than the table.',
            interviewAngle: 'Asked constantly, and the memorised answer is wrong. A candidate who says "LinkedList for frequent insertions" is reciting a 1990s data-structures course; one who says "ArrayList unless I am queueing at both ends, and then ArrayDeque" has measured something.',
            buildsOn: ['the-interfaces'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'What the two actually cost',
                    left: 'ArrayList',
                    right: 'LinkedList',
                    rows: [
                        { aspect: 'Backed by', left: 'One <code>Object[]</code>, resized by 1.5× when full', right: 'A doubly linked node per element' },
                        { aspect: 'Memory per element', left: 'One reference, plus slack up to 50%', right: 'One reference <strong>plus a node object</strong> — roughly three times the overhead' },
                        { aspect: '<code>get(i)</code>', left: 'O(1)', right: 'O(n) — it walks, from whichever end is nearer' },
                        { aspect: 'Insert in the middle', left: 'O(n), one <code>System.arraycopy</code>', right: 'O(1) — <em>once you are there</em>, which was O(n)' },
                        { aspect: 'Insert at the end', left: 'Amortised O(1)', right: 'O(1)' },
                        { aspect: 'Iterating', left: 'Sequential memory, prefetcher-friendly', left_note: '', right: 'A pointer chase per element; a cache miss per element' },
                        { aspect: 'In practice', left: '<strong>The default</strong>', right: 'Almost never the right answer' }
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>The table that makes <code>LinkedList</code> look good counts <em>operations</em>. Hardware charges for <strong>cache misses</strong>, and the gap is roughly two orders of magnitude: an L1 hit is a few cycles, a main-memory read is a few hundred. An <code>ArrayList</code> walk reads consecutive addresses, so the prefetcher has the next cache line before it is asked. A <code>LinkedList</code> walk follows references to objects the allocator may have placed anywhere, and pays a potential miss per element.</p><p>So the O(1) insertion is real and almost unreachable: to insert in the middle you must first <em>get</em> to the middle, which is the O(n) pointer chase. Meanwhile <code>ArrayList</code>\'s "slow" O(n) insert is a single <code>System.arraycopy</code>, an intrinsic that compiles to a block move.</p>'
                },
                {
                    type: 'types',
                    title: 'The narrow cases where LinkedList is not wrong',
                    items: [
                        { name: 'Adding and removing at both ends', html: '<p>Genuinely O(1), and genuinely what it is for. But <code>ArrayDeque</code> does the same job on a circular array, faster and with far less memory, so this is not a win either.</p>' },
                        { name: 'Removing during iteration', html: '<p><code>Iterator.remove()</code> on a <code>LinkedList</code> is O(1) because the iterator is already at the node. On an <code>ArrayList</code> it is O(n) per removal. For a big list with many removals this is the one shape that measures better — and <code>removeIf</code> on an <code>ArrayList</code>, which does one compacting pass, usually beats both.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Sizing an <code>ArrayList</code> up front is free and frequently skipped.</strong> The default capacity is 10 and growth is 1.5×, so filling a million-element list reallocates and copies about thirty times. <code>new ArrayList&lt;&gt;(expectedSize)</code> costs one allocation. The same applies to <code>HashMap</code>, where the arithmetic is different and worse — see the sizing chapter in the HashMap module.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Answer with the mechanism, not the table: <em>"ArrayList, essentially always. The big-O table favours LinkedList for insertion, but it counts operations and hardware charges for cache misses — an array walk is sequential and prefetched, a linked walk is a cache miss per node. And the O(1) insert needs you to already be at the position, which cost O(n) to reach. If I am adding and removing at both ends I use ArrayDeque, not LinkedList."</em></p>'
                }
            ],
            docs: [
                { title: 'ArrayList', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/ArrayList.html', kind: 'api' },
                { title: 'LinkedList', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/LinkedList.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'collections', questionId: 'arraylist-vs-linkedlist' },
                { topicId: 'collections', questionId: 'initial-capacity-sizing' }
            ]
        },

        {
            id: 'set-implementations',
            title: 'The Three Sets',
            importance: 'must-know',
            summary: 'Hash, insertion-ordered, and sorted. The choice is a choice about ordering, and each ordering has a price.',
            interviewAngle: 'Straightforward, and the follow-up is where it gets interesting: what happens when the elements are mutable, and what TreeSet uses instead of equals.',
            buildsOn: ['arraylist-vs-linkedlist'],
            blocks: [
                {
                    type: 'table',
                    title: 'Choosing a Set',
                    headers: ['Implementation', 'Iteration order', 'add / contains', 'Nulls', 'Backed by'],
                    rows: [
                        ['<code>HashSet</code>', '<strong>None guaranteed</strong>', 'O(1)', 'One allowed', 'A <code>HashMap</code> with a dummy value'],
                        ['<code>LinkedHashSet</code>', 'Insertion order', 'O(1)', 'One allowed', 'A <code>HashMap</code> plus a linked list'],
                        ['<code>TreeSet</code>', 'Sorted', 'O(log n)', '<strong>None</strong>', 'A red-black tree (<code>TreeMap</code>)'],
                        ['<code>EnumSet</code>', 'Declaration order', 'O(1), bitwise', '<strong>None</strong>', 'A bit vector — usually one <code>long</code>'],
                        ['<code>Set.of(...)</code>', '<strong>Unspecified and randomised</strong>', 'O(1)', '<strong>None</strong>', 'A compact immutable array']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong><code>Set.of()</code> and <code>Map.of()</code> deliberately change their iteration order between JVM runs.</strong> The immutable collections apply a per-JVM random salt to probe order, so a test that passes locally can fail in CI purely because the elements came out in a different sequence. This is intentional — it stops code from depending on an order that was never promised — and it is a genuinely good thing to know, because the resulting flaky test looks inexplicable. If you need a stable order, say so with a <code>LinkedHashSet</code>.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong><code>TreeSet</code> decides equality with <code>compareTo</code>, not <code>equals</code>.</strong> Two elements with <code>compareTo</code> returning 0 are duplicates to a <code>TreeSet</code> even if <code>equals</code> says otherwise — so a <code>Comparator</code> that only compares surnames turns every namesake into one entry, silently. This is what the Javadoc means by "consistent with equals", and it is a comparator bug that presents as missing data.</p>'
                },
                {
                    type: 'tip',
                    html: '<p><code>EnumSet</code> is worth naming unprompted whenever the elements are enum constants. It is a bit vector, so membership is a single bitwise operation and a set of a dozen constants fits in one <code>long</code>. <code>EnumSet.of(READ, WRITE)</code> in place of <code>Set.of(READ, WRITE)</code> is free, faster, and iterates in declaration order — and mentioning it signals that you read the JDK rather than only using it.</p>'
                }
            ],
            docs: [
                { title: 'EnumSet', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/EnumSet.html', kind: 'api' },
                { title: 'TreeSet', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/TreeSet.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'collections', questionId: 'set-implementations' },
                { topicId: 'collections', questionId: 'enummap-and-enumset' },
                { topicId: 'java-language', questionId: 'compareto-consistent-with-equals' }
            ]
        },

        {
            id: 'map-implementations',
            title: 'The Maps',
            importance: 'must-know',
            summary: 'Six that matter, three of which exist for a single specific job — and one that is legacy and should never appear in new code.',
            interviewAngle: 'The HashMap-versus-Hashtable-versus-ConcurrentHashMap question is asked in almost every screening round. The right answer dismisses Hashtable in one clause and spends its time on the difference that matters, which is how ConcurrentHashMap achieves concurrency without locking the whole map.',
            buildsOn: ['set-implementations'],
            blocks: [
                {
                    type: 'table',
                    title: 'Choosing a Map',
                    headers: ['Implementation', 'Order', 'Thread-safe', 'Null key / value', 'Reach for it when'],
                    rows: [
                        ['<code>HashMap</code>', 'None', 'No', 'One / yes', 'The default'],
                        ['<code>LinkedHashMap</code>', 'Insertion, or access', 'No', 'One / yes', 'Order matters, or you want an LRU cache'],
                        ['<code>TreeMap</code>', 'Sorted by key', 'No', '<strong>No</strong> / yes', 'You need range queries — <code>headMap</code>, <code>floorKey</code>, <code>subMap</code>'],
                        ['<code>EnumMap</code>', 'Declaration order', 'No', '<strong>No</strong> / yes', 'The key is an enum. Array-backed, indexed by ordinal'],
                        ['<code>ConcurrentHashMap</code>', 'None', '<strong>Yes</strong>', '<strong>Neither</strong>', 'Shared across threads'],
                        ['<code>Hashtable</code>', 'None', 'Yes, badly', '<strong>Neither</strong>', '<strong>Never.</strong> Legacy since 1998']
                    ]
                },
                {
                    type: 'prose',
                    html: '<p><code>Hashtable</code> synchronises every method on the whole object, so two threads reading different keys still queue behind each other. <code>Collections.synchronizedMap</code> is the same bargain with a wrapper. <code>ConcurrentHashMap</code> instead locks <strong>per bin</strong>: writers to different buckets never contend, and readers do not lock at all because the table and the nodes\' value fields are <code>volatile</code>. That is the whole answer to the stock question, and it is worth stating in that order — dismiss the legacy one, then explain the mechanism.</p>'
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'LinkedHashMap as an LRU cache, in six lines',
                    code: '// Access-ordered: every get() moves the entry to the end.\n// removeEldestEntry is called after each put, and returning true\n// evicts the head — which is the least recently used entry.\nclass LruCache<K, V> extends LinkedHashMap<K, V> {\n    private final int capacity;\n\n    LruCache(int capacity) {\n        super(16, 0.75f, true);          // the third argument is accessOrder\n        this.capacity = capacity;\n    }\n\n    @Override protected boolean removeEldestEntry(Map.Entry<K, V> eldest) {\n        return size() > capacity;\n    }\n}',
                    notes: '<p>This is the answer to "implement an LRU cache" when the interviewer has not forbidden the JDK — say it, then offer the hand-rolled <code>HashMap</code>-plus-doubly-linked-list version, which is what they usually want. Note that it is <strong>not</strong> thread-safe: <code>get()</code> mutates the order, so concurrent reads need external synchronisation. For a real cache, Caffeine.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong><code>ConcurrentHashMap</code> forbids null keys and null values, and this is deliberate rather than an oversight.</strong> In a single-threaded <code>HashMap</code> you can disambiguate "absent" from "mapped to null" with <code>containsKey</code>. In a concurrent map you cannot: between the <code>get</code> returning null and the <code>containsKey</code>, another thread may have changed the answer. Doug Lea removed the ambiguity by removing the case, and the same reasoning is why <code>computeIfAbsent</code> treats a null value as absent.</p>'
                }
            ],
            docs: [
                { title: 'ConcurrentHashMap', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/ConcurrentHashMap.html', kind: 'api' },
                { title: 'LinkedHashMap.removeEldestEntry', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/LinkedHashMap.html#removeEldestEntry(java.util.Map.Entry)', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'collections', questionId: 'hashmap-vs-hashtable-vs-concurrenthashmap' },
                { topicId: 'collections', questionId: 'linkedhashmap-lru' },
                { topicId: 'collections', questionId: 'treemap-and-navigable' }
            ]
        },

        {
            id: 'queues-and-deques',
            title: 'Queues, Deques, and Never Using Stack',
            importance: 'should-know',
            summary: 'ArrayDeque is the right answer for both a stack and a queue. Stack and Vector are legacy, and Stack iterates in the wrong direction.',
            interviewAngle: 'Comes up inside machine-coding rounds rather than as a question — you need a stack for a parser or a queue for a BFS, and reaching for java.util.Stack is a small visible tell.',
            buildsOn: ['arraylist-vs-linkedlist'],
            blocks: [
                {
                    type: 'types',
                    title: 'What to use',
                    items: [
                        { name: 'ArrayDeque', html: '<p>A growable circular array. The fastest stack and the fastest non-blocking queue in the JDK. <code>push</code>/<code>pop</code>/<code>peek</code> for stack use, <code>offer</code>/<code>poll</code> for queue use. No nulls — which is the price of using <code>null</code> as the empty signal.</p>' },
                        { name: 'PriorityQueue', html: '<p>A binary heap. <code>poll()</code> always returns the smallest element by the comparator. <strong>Iteration is not sorted</strong> — only removal is — and that catches people every time.</p>' },
                        { name: 'ArrayBlockingQueue / LinkedBlockingQueue', html: '<p>The thread-safe ones, with blocking <code>put</code> and <code>take</code>. This is the hand-off between producer and consumer threads, and the queue a thread pool is built around. See the executors module.</p>' },
                        { name: '<s>Stack</s>', html: '<p>Extends <code>Vector</code>, so every method is synchronised for no benefit — and its iterator runs <strong>bottom to top</strong>, the opposite of pop order. Iterating a <code>Stack</code> gives you the elements in the order you will not want them.</p>' },
                        { name: '<s>Vector</s>', html: '<p>Synchronised <code>ArrayList</code> from Java 1.0. Compound operations still need external locking, so the synchronisation buys almost nothing and costs on every call.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Printing a <code>PriorityQueue</code> does not print it in order.</strong> <code>toString</code> and <code>forEach</code> walk the underlying array, which is heap-ordered, not sorted — only the head is guaranteed to be the minimum. A test asserting on <code>queue.toString()</code> is asserting on an implementation detail, and the correct way to drain in order is to <code>poll()</code> until empty.</p>'
                }
            ],
            docs: [
                { title: 'ArrayDeque', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/ArrayDeque.html', kind: 'api' },
                { title: 'PriorityQueue', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/PriorityQueue.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'collections', questionId: 'arraydeque-vs-stack' },
                { topicId: 'collections', questionId: 'blocking-queues' }
            ]
        },

        {
            id: 'immutable-collections',
            title: 'Immutable, Unmodifiable and Fixed-Size',
            importance: 'should-know',
            summary: 'Three different guarantees that people call by one name, and the differences show up as bugs rather than as compile errors.',
            interviewAngle: 'Reached from the defensive-copying discussion. Being able to say that unmodifiableList is a view and List.copyOf is a copy is the whole question, and it is a distinction that has caused real production bugs.',
            buildsOn: ['the-interfaces'],
            blocks: [
                {
                    type: 'table',
                    title: 'What each one actually promises',
                    headers: ['Expression', 'Structurally immutable', 'Independent of the source', 'Accepts null'],
                    rows: [
                        ['<code>List.of(a, b)</code>', 'Yes', 'n/a', '<strong>No — throws</strong>'],
                        ['<code>List.copyOf(src)</code>', 'Yes', '<strong>Yes</strong>', '<strong>No — throws</strong>'],
                        ['<code>src.stream().toList()</code>', 'Yes', 'Yes', 'Yes'],
                        ['<code>Collections.unmodifiableList(src)</code>', 'Through this reference only', '<strong>No — it is a view</strong>', 'Yes'],
                        ['<code>Arrays.asList(arr)</code>', '<strong>No</strong> — fixed size, but <code>set</code> works', '<strong>No — writes through to the array</strong>', 'Yes'],
                        ['<code>new ArrayList&lt;&gt;(src)</code>', 'No', 'Yes', 'Yes']
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The view that is not a copy',
                    code: 'List<String> source = new ArrayList<>(List.of("a"));\nList<String> readOnly = Collections.unmodifiableList(source);\n\nreadOnly.add("b");        // UnsupportedOperationException, as expected\nsource.add("b");          // fine — and readOnly now has two elements\nreadOnly.size();          // 2\n\n// A real copy is unaffected by later writes to the source.\nList<String> copy = List.copyOf(source);\nsource.add("c");\ncopy.size();              // still 2',
                    output: {
                        kind: 'trace',
                        lines: [
                            'unmodifiableList wraps the source; it forbids writes THROUGH the wrapper and forwards every read.',
                            'Adding to the source changes what the wrapper reports, because there is only one list.',
                            'That is fine for a getter — the caller cannot write — and useless in a constructor, where the caller still holds the original.',
                            'List.copyOf allocates and copies, so later writes to the source cannot reach it.'
                        ]
                    }
                },
                {
                    type: 'pitfall',
                    html: '<p><strong><code>Arrays.asList</code> is the sharpest of the three.</strong> It returns a fixed-size list <em>backed by the array you passed</em>: <code>set</code> writes through to the array, <code>add</code> and <code>remove</code> throw, and mutating the array changes the list. It also has an overload trap — <code>Arrays.asList(intArray)</code> where <code>intArray</code> is an <code>int[]</code> gives you a <code>List&lt;int[]&gt;</code> of size one, because <code>int[]</code> is a single object rather than a varargs spread. Use <code>List.of</code> unless you specifically want the array view.</p>'
                }
            ],
            docs: [
                { title: 'Creating Immutable Lists, Sets, and Maps', url: 'https://docs.oracle.com/en/java/javase/21/core/creating-immutable-lists-sets-and-maps.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'collections', questionId: 'immutable-collections' },
                { topicId: 'collections', questionId: 'sublist-is-a-view' },
                { topicId: 'java-language', questionId: 'defensive-copying' }
            ]
        },

        {
            id: 'choosing-a-collection',
            title: 'The Decision, in Four Questions',
            importance: 'must-know',
            summary: 'Ordering, uniqueness, access pattern, concurrency. Answer them in that order and the implementation is determined.',
            interviewAngle: 'This is how to answer any "which collection would you use" question in a design or machine-coding round — out loud, as a sequence of decisions, rather than by naming a class and hoping.',
            buildsOn: ['map-implementations', 'queues-and-deques', 'immutable-collections'],
            blocks: [
                {
                    type: 'diagram',
                    diagramType: 'flowchart',
                    caption: 'Four questions, asked in this order, because each one narrows the next.',
                    diagramConfig: {
                        title: 'Choosing a collection',
                        nodes: [
                            { id: 'start', label: 'What am I storing?', kind: 'start' },
                            { id: 'pairs', label: 'Key to value pairs?', kind: 'decision' },
                            { id: 'unique', label: 'Duplicates allowed?', kind: 'decision' },
                            { id: 'order', label: 'Does order matter?', kind: 'decision' },
                            { id: 'shared', label: 'Shared across threads?', kind: 'decision' },
                            { id: 'map', label: 'HashMap, or TreeMap for ranges', kind: 'step' },
                            { id: 'set', label: 'HashSet, or LinkedHashSet for order', kind: 'step' },
                            { id: 'list', label: 'ArrayList, or ArrayDeque at the ends', kind: 'step' },
                            { id: 'conc', label: 'ConcurrentHashMap or a BlockingQueue', kind: 'fix' }
                        ],
                        edges: [
                            { from: 'start', to: 'pairs' },
                            { from: 'pairs', to: 'map', label: 'yes' },
                            { from: 'pairs', to: 'unique', label: 'no' },
                            { from: 'unique', to: 'set', label: 'no dupes' },
                            { from: 'unique', to: 'order', label: 'dupes ok' },
                            { from: 'order', to: 'list' },
                            { from: 'map', to: 'shared' },
                            { from: 'set', to: 'shared' },
                            { from: 'list', to: 'shared' },
                            { from: 'shared', to: 'conc', label: 'yes' }
                        ]
                    }
                },
                {
                    type: 'types',
                    title: 'The four questions, and what each one settles',
                    items: [
                        { name: '1 — Pairs or elements?', html: '<p>A key mapping to a value is a <code>Map</code>. Everything else is a <code>Collection</code>. This is the only structural question and it comes first.</p>' },
                        { name: '2 — Are duplicates meaningful?', html: '<p>No means <code>Set</code>, and commits you to <code>equals</code> and <code>hashCode</code> being right on the element type. Yes means <code>List</code> or <code>Queue</code>.</p>' },
                        { name: '3 — What is the access pattern?', html: '<p>By index, by key, in sorted order, first-in-first-out, or by range. This is what picks the implementation: <code>TreeMap</code> over <code>HashMap</code> exists for range queries and nothing else.</p>' },
                        { name: '4 — Is it shared, and does it escape?', html: '<p>Asked last because it changes the implementation and not the interface. Shared and mutated means <code>ConcurrentHashMap</code> or a blocking queue; shared and never mutated means an immutable collection and no synchronisation at all.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>In a machine-coding round, narrate the decision rather than announcing the answer: <em>"Bookings by seat id, unique, looked up by key, and this is shared between request threads — so ConcurrentHashMap, and the reservation has to be a single computeIfAbsent rather than a get-then-put."</em> That last clause is the one being marked, and it does not appear if you skip straight to naming a class.</p>'
                }
            ],
            docs: [
                { title: 'Outline of the Collections Framework', url: 'https://docs.oracle.com/javase/tutorial/collections/intro/index.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'collections', questionId: 'atomic-compound-operations' },
                { topicId: 'collections', questionId: 'concurrent-map-vs-cache' }
            ]
        }
    ]
};
