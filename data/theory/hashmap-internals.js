/* ==========================================================================
   data/theory/hashmap-internals.js — module 13 in the reading path

   The most-asked internals question in Java interviewing, and one of the few
   where the interviewer usually knows the source. Eight chapters, each
   answering a "why is it done that way" rather than describing a field.
   ========================================================================== */

const hashmapInternalsModule = {
    id: 'hashmap-internals',
    trackId: 'java-platform',
    order: 13,
    title: 'Inside HashMap',
    tagline: 'Buckets, collisions, resize, treeify — the most-asked internals question.',
    estimatedMinutes: 40,
    prerequisites: ['collections-choosing', 'objects-and-contracts'],
    docHub: { title: 'HashMap', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/HashMap.html' },

    chapters: [
        {
            id: 'bucket-array-and-hash-spreading',
            title: 'The Table, and Why the Hash Is Not Used Raw',
            importance: 'must-know',
            summary: 'An array of buckets whose length is always a power of two — which makes the index a bitmask, which throws away the high bits, which is why the hash is spread first.',
            interviewAngle: 'Everyone describes the bucket array. Almost nobody explains the two lines of arithmetic on top of it, and those two lines are a complete miniature of engineering trade-off: a fast index, a weakness it creates, and a one-instruction fix.',
            buildsOn: [],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>A <code>HashMap</code> is a <code>Node&lt;K,V&gt;[] table</code>. Each node holds the key, the value, the cached hash and a <code>next</code> reference. The table length is <strong>always a power of two</strong>, and everything interesting follows from that choice.</p>'
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The two lines that matter',
                    code: '// 1. Spread the hash: fold the high 16 bits into the low 16.\nstatic final int hash(Object key) {\n    int h;\n    return (key == null) ? 0 : (h = key.hashCode()) ^ (h >>> 16);\n}\n\n// 2. Pick the bucket: a mask, not a modulo.\nint index = (table.length - 1) & hash;',
                    notes: '<p>Both lines exist because of the power-of-two table. A power of two makes <code>(n - 1) &amp; hash</code> equivalent to <code>hash % n</code> and vastly cheaper — a single AND instead of a division. The cost is that the mask <strong>only ever looks at the low bits</strong>: with a table of 16, only the low four. Any key whose hash codes differ solely in their high bits would collide in every bucket. The XOR fixes that for one instruction.</p>'
                },
                {
                    type: 'prose',
                    html: '<p>The classic demonstration is <code>Float.hashCode</code>, or any key whose values are large and regularly spaced — hash codes like <code>0x0001_0000</code>, <code>0x0002_0000</code>, <code>0x0003_0000</code> all have zero in the low sixteen bits and would land in bucket 0 forever. After the spread they differ in the low bits and distribute. This is the answer to "why not just use <code>hashCode()</code> directly", and it is a question that separates people who have read <code>HashMap</code> from people who have described it.</p>'
                },
                {
                    type: 'definition',
                    term: 'Load factor',
                    important: true,
                    html: '<p>The fraction of the table that may be occupied before it is resized. Default 0.75, chosen as the point where the expected collision cost and the memory waste are jointly minimised. The resize <em>threshold</em> is <code>capacity × loadFactor</code> — 12 for the default capacity of 16 — and crossing it doubles the table.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Lead with the trade-off rather than the field list: <em>"An array of buckets, power-of-two sized so the index is a mask rather than a modulo. That is fast but only reads the low bits, so the hash is spread first by XORing the top sixteen bits down — otherwise keys differing only in their high bits would all collide."</em> Three sentences, and it demonstrably comes from the source.</p>'
                }
            ],
            docs: [
                { title: 'HashMap — class documentation', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/HashMap.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'collections', questionId: 'hashmap-internals' }
            ]
        },

        {
            id: 'collision-and-chaining',
            title: 'Collisions',
            importance: 'must-know',
            summary: 'Two keys, one bucket. The bucket becomes a list, and every lookup in it walks the list comparing hashes first and then equals.',
            interviewAngle: 'The natural follow-up to the table question, and the place to make the point that collisions are normal rather than exceptional — a candidate who talks about "avoiding collisions" has misunderstood what a hash table is.',
            buildsOn: ['bucket-array-and-hash-spreading'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>Collisions are not a failure mode. With 16 buckets and 12 entries they are expected — the birthday problem guarantees it — and the load factor is chosen on the assumption that they happen. What the design controls is not whether a bucket has several entries but how expensive that bucket is to search.</p>'
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'What get() actually does in a bucket',
                    code: '// Simplified from HashMap.getNode\nfor (Node<K,V> e = first; e != null; e = e.next) {\n    if (e.hash == hash                              // 1. cached int compare\n        && ((k = e.key) == key                      // 2. reference identity\n            || (key != null && key.equals(k)))) {   // 3. and only then equals\n        return e;\n    }\n}',
                    notes: '<p>Three guards in increasing order of cost, and each one exists to avoid the next. The hash is <strong>stored on the node</strong>, so a mismatch is one integer comparison and <code>equals</code> is never called. Then reference identity, which is one instruction and true surprisingly often for interned strings and enum constants. Only a key that passes both reaches <code>equals</code>. This is why an expensive <code>equals</code> costs less than you would fear, and why a <code>hashCode</code> that returns a constant costs far more than you would hope — it defeats guard one for every entry in the bucket.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A hash collision is not the same as an equal key, and code that assumes it is will lose data.</strong> This sounds obvious and is exactly what a <code>hashCode</code>-only cache key does — for instance keying a map on <code>Objects.hash(a, b)</code> as an <code>Integer</code> rather than on a record of <code>(a, b)</code>. Two different pairs sharing a hash then silently overwrite each other, and the failure is a wrong answer rather than an exception.</p>'
                }
            ],
            docs: [
                { title: 'HashMap', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/HashMap.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'collections', questionId: 'hashmap-internals' },
                { topicId: 'collections', questionId: 'hash-collision-dos' }
            ]
        },

        {
            id: 'treeify-threshold',
            title: 'Treeify: What Java 8 Changed and Why',
            importance: 'must-know',
            summary: 'A bucket that grows past eight entries becomes a red-black tree — and the second condition, on table size, is the one people forget.',
            interviewAngle: 'The single best "do you actually know this" question in the collections area. The numbers 8, 6 and 64 are memorable; what earns the mark is knowing that treeify is a security fix and that below a table of 64 it resizes instead.',
            buildsOn: ['collision-and-chaining'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>Before Java 8, a bucket was always a linked list, so a map where every key collided degraded to O(n) per lookup. That is not merely slow — it is <strong>remotely exploitable</strong>. An attacker who can control map keys (HTTP parameter names, JSON field names, form fields) and who knows the hash function can send a few thousand keys that all collide, and turn a linear parse into quadratic work. This was a real, widely exploited denial-of-service class in 2011 across most languages, and treeification is Java\'s structural answer.</p>'
                },
                {
                    type: 'types',
                    title: 'The three constants',
                    items: [
                        { name: 'TREEIFY_THRESHOLD = 8', html: '<p>A bin holding eight or more nodes is a candidate for conversion to a red-black tree. Eight is chosen from the Poisson distribution: with a load factor of 0.75 and a decent hash, the probability of a bin reaching eight is about one in ten million. Reaching it means the hash is bad or the input is hostile.</p>' },
                        { name: 'MIN_TREEIFY_CAPACITY = 64', html: '<p><strong>The forgotten condition.</strong> If the table is smaller than 64, a long bin triggers a <em>resize</em> instead of a treeify. In a small table, long bins usually mean too few buckets rather than a pathological hash, and doubling the table is cheaper and fixes the actual cause.</p>' },
                        { name: 'UNTREEIFY_THRESHOLD = 6', html: '<p>A tree bin that shrinks to six nodes reverts to a list. The gap between 8 and 6 is hysteresis: converting at the same number in both directions would make a bin oscillating around the threshold convert on every operation.</p>' }
                    ]
                },
                {
                    type: 'diagram',
                    diagramType: 'flowchart',
                    caption: 'Both conditions, in the order HashMap checks them.',
                    diagramConfig: {
                        title: 'What happens when a bin gets long',
                        nodes: [
                            { id: 'put', label: 'put() lands in a bin', kind: 'start' },
                            { id: 'eight', label: 'Bin now has 8 or more?', kind: 'decision' },
                            { id: 'list', label: 'Stays a linked list', kind: 'step' },
                            { id: 'cap', label: 'Table length 64 or more?', kind: 'decision' },
                            { id: 'resize', label: 'Resize instead — too few buckets', kind: 'fix' },
                            { id: 'tree', label: 'Treeify: O(log n) in the bin', kind: 'fix' }
                        ],
                        edges: [
                            { from: 'put', to: 'eight' },
                            { from: 'eight', to: 'list', label: 'no' },
                            { from: 'eight', to: 'cap', label: 'yes' },
                            { from: 'cap', to: 'resize', label: 'no' },
                            { from: 'cap', to: 'tree', label: 'yes' }
                        ]
                    }
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Treeification needs an ordering, and falls back when it cannot find one.</strong> A red-black tree has to compare keys. If the key type implements <code>Comparable</code>, that is used; otherwise <code>HashMap</code> falls back to comparing class names and then identity hash codes, which is a tie-break rather than an order. So a treeified bin of non-<code>Comparable</code> keys is still O(log n) but with a comparison that carries no meaning — a reason, among others, to give value types used as keys a natural order.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The complete answer, in the order that shows understanding: <em>"From Java 8, a bin with eight or more nodes converts to a red-black tree, so a degenerate bucket is O(log n) rather than O(n). The reason is security as much as speed — collision flooding on attacker-controlled keys was a real DoS. And there is a second condition people forget: below a table size of 64 it resizes instead, because in a small table a long bin means too few buckets rather than a bad hash."</em></p>'
                }
            ],
            docs: [
                { title: 'JDK 8 HashMap — implementation notes', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/HashMap.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'collections', questionId: 'hashmap-internals' },
                { topicId: 'collections', questionId: 'hash-collision-dos' }
            ]
        },

        {
            id: 'resize-and-rehash',
            title: 'Resize, and the Trick That Avoids Rehashing',
            importance: 'should-know',
            summary: 'Doubling the table means every entry moves to one of exactly two places, and which one is a single bit of the hash it already has.',
            interviewAngle: 'A deep-dive question with a genuinely elegant answer. It also carries the Java 7 concurrency story, which is the best available reason not to share a plain HashMap across threads.',
            buildsOn: ['bucket-array-and-hash-spreading'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>When size exceeds <code>capacity × loadFactor</code>, the table doubles. Naively that means recomputing every index, but the power-of-two size makes it much cheaper than that: doubling the table adds <strong>exactly one bit</strong> to the mask. An entry at index <code>i</code> in a table of 16 can only be at <code>i</code> or <code>i + 16</code> in a table of 32, and which one is decided by testing that single new bit — <code>(hash &amp; oldCapacity) == 0</code>.</p><p>So the split is done by walking each bin once and threading it into a "low" list and a "high" list, with no hash recomputation and no per-entry index arithmetic. Both lists keep their relative order, which matters for the next paragraph.</p>'
                },
                {
                    type: 'version',
                    title: 'The Java 7 resize bug',
                    items: [
                        { version: 'Java 7 and earlier', state: 'was', html: '<p>Transfer reinserted each entry at the <em>head</em> of its new bin, reversing the list. Two threads resizing the same map concurrently could interleave so that two nodes ended up pointing at each other, and <strong>a later <code>get</code> on that bin looped forever</strong> — a pegged CPU core, in production, with no exception and a stack trace that only ever showed <code>HashMap.get</code>.</p>' },
                        { version: 'Java 8', state: 'changed', html: '<p>The split preserves order rather than reversing it, so the specific cycle cannot form. This is a mitigation, not a fix: a <code>HashMap</code> shared across threads without synchronisation is still unsafe, can still lose entries and can still produce a corrupt table.</p>' },
                        { version: 'Java 8 onward', state: 'is', html: '<p>Use <code>ConcurrentHashMap</code>. The point of the story is not that Java 8 made sharing safe — it did not — but that the failure mode used to be an infinite loop rather than anything that would look like a bug in your code.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Sizing a <code>HashMap</code> is not the same arithmetic as sizing an <code>ArrayList</code>.</strong> The constructor argument is a <em>capacity</em>, and the map resizes at 75% of it — so <code>new HashMap&lt;&gt;(1000)</code> rounds capacity to 1024 and resizes once it holds 768 entries, which is exactly what you were trying to avoid. The correct figure is <code>expected / 0.75 + 1</code>. Since Java 19 there is a factory that does it for you: <code>HashMap.newHashMap(1000)</code>, and equivalents on <code>LinkedHashMap</code> and <code>HashSet</code>.</p>'
                }
            ],
            docs: [
                { title: 'HashMap.newHashMap', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/HashMap.html#newHashMap(int)', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'collections', questionId: 'initial-capacity-sizing' },
                { topicId: 'collections', questionId: 'hashmap-vs-hashtable-vs-concurrenthashmap' }
            ]
        },

        {
            id: 'mutable-keys',
            title: 'The Mutable Key, Seen From Inside',
            importance: 'must-know',
            summary: 'The same failure as the object-contract module, now with the mechanism visible: the entry is in the bucket its old hash chose, and nothing will ever look there again.',
            interviewAngle: 'Asked as a scenario. Having already seen the bucket arithmetic, the answer becomes mechanical rather than remembered — which is exactly the impression to leave.',
            buildsOn: ['bucket-array-and-hash-spreading', 'collision-and-chaining'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>The bucket index is computed <strong>at insertion time</strong> and never revisited. Mutating a field that <code>hashCode</code> reads does not move the entry; it changes where every future lookup will search. The entry stays exactly where it was, in a bucket nothing will consult again.</p><p>The cached <code>hash</code> on the node makes this worse in a way worth noticing: even if a lookup did stumble into the right bucket, the node\'s stored hash is the old one and the first guard — <code>e.hash == hash</code> — fails before <code>equals</code> is ever consulted. The entry is unreachable by two independent mechanisms.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>The entry is not merely unfindable, it is unremovable.</strong> <code>remove(key)</code> uses the same index arithmetic, so it searches the new bucket and finds nothing. The only ways out are iterating the entry set and removing through the iterator, or clearing the map. In a long-lived cache this is a slow leak whose entries are individually visible and collectively unreachable.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Answer it as arithmetic: <em>"The index is <code>(n-1) &amp; hash</code>, computed when you put it. Change the hash afterwards and the entry does not move — you have just changed where every future lookup will look. And the node caches its hash, so even landing in the right bucket the first equality guard fails."</em></p>'
                }
            ],
            docs: [
                { title: 'Map — the note on mutable keys', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Map.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'java-language', questionId: 'mutable-key-in-a-hashmap' },
                { topicId: 'jpa-hibernate', questionId: 'entity-equals-hashcode' }
            ]
        },

        {
            id: 'null-keys',
            title: 'Null Keys, and Where They Go',
            importance: 'good-to-know',
            summary: 'One null key, always in bucket zero, and a get returning null that means two different things.',
            interviewAngle: 'Small, and it sets up a much better question: how do you tell "absent" from "present and null", and why does ConcurrentHashMap refuse to have the problem.',
            buildsOn: ['bucket-array-and-hash-spreading'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The ambiguity, and the two ways out',
                    code: 'Map<String, String> map = new HashMap<>();\nmap.put("a", null);\n\nmap.get("a");            // null — present, mapped to null\nmap.get("b");            // null — absent\n\nmap.containsKey("a");    // true\nmap.containsKey("b");    // false\n\n// getOrDefault does NOT disambiguate: a present null is returned\n// as null, not as the default.\nmap.getOrDefault("a", "x");   // null\nmap.getOrDefault("b", "x");   // "x"',
                    output: {
                        kind: 'trace',
                        lines: [
                            'HashMap.hash() special-cases null to 0, so the null key always lands in bucket 0. Exactly one is allowed, because a key is unique.',
                            'get() returns null for both the present-null and the absent case, and cannot distinguish them.',
                            'containsKey() is the disambiguator, and it costs a second lookup.',
                            'getOrDefault only substitutes when the key is ABSENT, which surprises people who read it as "or default if null".'
                        ],
                        explain: '<p>The cleanest fix is usually not to store nulls at all — absence <em>is</em> the information. <code>ConcurrentHashMap</code> takes that position by force, and its reason is stronger: in a concurrent map the <code>containsKey</code> follow-up is not even reliable, because another thread may change the answer between the two calls.</p>'
                    }
                },
                {
                    type: 'pitfall',
                    html: '<p><strong><code>computeIfAbsent</code> treats a mapped null as absent, and this is load-bearing.</strong> It also does not store a null the mapping function returns — so <code>computeIfAbsent(k, x -&gt; null)</code> leaves the map unchanged and returns null, and calling it again re-runs the function. Code using it as a memoiser for a computation that can legitimately produce null will recompute every time, forever, with no error.</p>'
                }
            ],
            docs: [
                { title: 'Map.computeIfAbsent', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Map.html#computeIfAbsent(K,java.util.function.Function)', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'collections', questionId: 'compute-and-merge' },
                { topicId: 'collections', questionId: 'hashmap-vs-hashtable-vs-concurrenthashmap' }
            ]
        },

        {
            id: 'linkedhashmap-and-lru',
            title: 'LinkedHashMap, and the LRU Question',
            importance: 'should-know',
            summary: 'A HashMap with a doubly linked list threaded through its entries — which gives insertion order for free, and access order for one constructor argument.',
            interviewAngle: 'The LRU cache is one of the most-asked machine-coding warm-ups. There are two correct answers and the strong candidate gives both: the six-line JDK one, and the HashMap-plus-linked-list one the interviewer actually wants.',
            buildsOn: ['resize-and-rehash'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p><code>LinkedHashMap</code> extends <code>HashMap</code> and adds <code>before</code> and <code>after</code> references to each entry, threading a doubly linked list through them. Bucket lookup is unchanged and still O(1); the list only determines iteration order. That is why it costs a little more memory per entry and nothing at all per lookup.</p><p>The <code>accessOrder</code> constructor flag is the whole trick: with it set, every successful <code>get</code> unlinks the entry and appends it to the tail. The head is then always the least recently used entry, and <code>removeEldestEntry</code> — a protected hook called after every insertion — decides whether to evict it.</p>'
                },
                {
                    type: 'types',
                    title: 'What the interviewer is looking for in an LRU answer',
                    items: [
                        { name: 'O(1) for both operations', html: '<p><code>get</code> and <code>put</code> must both be O(1). A design that scans to find the least recently used entry is the wrong answer, however correct.</p>' },
                        { name: 'The two structures, and why each', html: '<p>A hash map for O(1) lookup, and a doubly linked list for O(1) removal from the middle. Singly linked does not work — you cannot unlink a node without its predecessor.</p>' },
                        { name: 'The map stores nodes, not values', html: '<p>The map value is the list node, so a <code>get</code> can find the node and move it in constant time. This is the step people miss.</p>' },
                        { name: 'Head and tail sentinels', html: '<p>Dummy nodes at both ends remove every null check from the unlink and append paths, and roughly halve the code you have to write correctly under time pressure.</p>' },
                        { name: 'Thread safety, named', html: '<p>Say that it is not thread-safe and what you would do about it. <code>get</code> mutates the order, so even reads need the lock — which is exactly why a real cache such as Caffeine does not use strict LRU.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>Open by naming both: <em>"With the JDK it is a LinkedHashMap in access order, overriding removeEldestEntry — six lines. If you want it from scratch, it is a HashMap from key to list node plus a doubly linked list with sentinels, and the reason the list is doubly linked is O(1) unlinking on get."</em> Then write the second one, which is what they asked for.</p>'
                }
            ],
            docs: [
                { title: 'LinkedHashMap', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/LinkedHashMap.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'collections', questionId: 'linkedhashmap-lru' },
                { topicId: 'collections', questionId: 'concurrent-map-vs-cache' }
            ]
        },

        {
            id: 'treemap-and-comparators',
            title: 'TreeMap: When You Need Order, Not Just Lookup',
            importance: 'should-know',
            summary: 'A red-black tree, O(log n) instead of O(1) — bought deliberately, for range queries a hash map cannot answer at all.',
            interviewAngle: 'The good question is not "what is a TreeMap" but "when would you accept O(log n) over O(1)". The answer is that the hash map cannot answer the question at any cost, which reframes the comparison entirely.',
            buildsOn: ['bucket-array-and-hash-spreading'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>A hash map can answer "what is at key K". It cannot answer "what is the largest key below K", "give me every key between A and B", or "what is the first key" — not slowly, but <em>at all</em>, because the hash destroyed the ordering. <code>TreeMap</code> keeps the keys in a red-black tree, so every one of those is O(log n), and that is what the slower point lookup is buying.</p>'
                },
                {
                    type: 'types',
                    title: 'The NavigableMap operations worth knowing by name',
                    items: [
                        { name: 'floorKey / ceilingKey', html: '<p>The greatest key ≤ the argument, and the smallest key ≥ it. This is the whole implementation of a rate table, a tier lookup or a time-bucketed index.</p>' },
                        { name: 'lowerKey / higherKey', html: '<p>The same, strictly. Off-by-one errors here are common enough that it is worth saying which you mean out loud.</p>' },
                        { name: 'headMap / tailMap / subMap', html: '<p>Range <em>views</em>, not copies — writes go through to the backing map, and they are O(1) to obtain.</p>' },
                        { name: 'firstEntry / lastEntry / pollFirstEntry', html: '<p>The <code>poll</code> variants remove as they return, which makes a <code>TreeMap</code> a usable priority structure when you also need lookup by key.</p>' },
                        { name: 'descendingMap', html: '<p>A reversed view, O(1). Since Java 21 <code>SortedMap</code> also has <code>reversed()</code> from <code>SequencedMap</code>.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A <code>TreeMap</code> decides key equality with <code>compareTo</code> or its <code>Comparator</code>, and never with <code>equals</code>.</strong> Two keys comparing 0 are the same key, so a comparator that examines fewer fields than <code>equals</code> silently merges entries. And a comparator that is inconsistent — not transitive, or not antisymmetric — corrupts the tree rather than throwing: entries become unfindable in a structure that still reports the right size. This is the same trap as <code>TreeSet</code>, and it is worth stating once as a rule: <em>a comparator used for ordering a map or set must be consistent with equals.</em></p>'
                },
                {
                    type: 'tip',
                    html: '<p>Reframe the complexity comparison: <em>"I would use TreeMap when I need range queries — floorKey, subMap, the first or last entry. It is O(log n) rather than O(1) for a point lookup, but that is not really the trade: a HashMap cannot answer those questions at all, at any cost, because hashing threw the order away."</em></p>'
                }
            ],
            docs: [
                { title: 'NavigableMap', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/NavigableMap.html', kind: 'api' },
                { title: 'TreeMap', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/TreeMap.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'collections', questionId: 'treemap-and-navigable' },
                { topicId: 'java-language', questionId: 'compareto-consistent-with-equals' }
            ]
        }
    ]
};
