/* ==========================================================================
   data/theory/streams-and-lambdas.js — module 14 in the reading path

   Nine chapters. The API is not hard and is not what fails in interviews;
   laziness, toMap's three separate traps and the shared common pool are.
   ========================================================================== */

const streamsAndLambdasModule = {
    id: 'streams-and-lambdas',
    trackId: 'java-platform',
    order: 14,
    title: 'Lambdas, Streams and Optional',
    tagline: 'Lazy pipelines, and the three ways people misuse them.',
    estimatedMinutes: 45,
    prerequisites: ['collections-choosing'],
    docHub: { title: 'java.util.stream', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/stream/package-summary.html' },

    chapters: [
        {
            id: 'functional-interfaces',
            title: 'Functional Interfaces',
            importance: 'should-know',
            summary: 'One abstract method is the entire requirement. The rest of java.util.function is naming, plus a set of primitive specialisations that exist purely to avoid boxing.',
            interviewAngle: 'A definition question with one good follow-up: what does @FunctionalInterface actually do. The answer — nothing at run time, it makes adding a second abstract method a compile error — is a small, precise thing that not everyone has.',
            buildsOn: [],
            blocks: [
                {
                    type: 'definition',
                    term: 'Functional interface',
                    important: true,
                    html: '<p>An interface with exactly one abstract method, so a lambda or method reference can implement it. <code>default</code>, <code>static</code> and <code>private</code> methods do not count, and neither do redeclared <code>public</code> methods of <code>Object</code> — which is why <code>Comparator</code> is functional despite declaring <code>equals</code>.</p>'
                },
                {
                    type: 'table',
                    title: 'The shapes worth knowing by name',
                    headers: ['Interface', 'Signature', 'Where you meet it'],
                    rows: [
                        ['<code>Function&lt;T,R&gt;</code>', '<code>R apply(T)</code>', '<code>map</code>, <code>computeIfAbsent</code>'],
                        ['<code>Predicate&lt;T&gt;</code>', '<code>boolean test(T)</code>', '<code>filter</code>, <code>removeIf</code>'],
                        ['<code>Consumer&lt;T&gt;</code>', '<code>void accept(T)</code>', '<code>forEach</code>, <code>ifPresent</code>'],
                        ['<code>Supplier&lt;T&gt;</code>', '<code>T get()</code>', '<code>orElseGet</code>, lazy defaults'],
                        ['<code>UnaryOperator&lt;T&gt;</code>', '<code>T apply(T)</code>', '<code>List.replaceAll</code>'],
                        ['<code>BinaryOperator&lt;T&gt;</code>', '<code>T apply(T,T)</code>', '<code>reduce</code>, <code>toMap</code> merge functions'],
                        ['<code>BiFunction&lt;T,U,R&gt;</code>', '<code>R apply(T,U)</code>', '<code>Map.compute</code>, <code>merge</code>']
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>The primitive specialisations — <code>IntPredicate</code>, <code>ToLongFunction</code>, <code>IntUnaryOperator</code> and the rest — exist for one reason: <code>Function&lt;Integer, Integer&gt;</code> boxes on the way in and on the way out, once per element. Over a stream of a million ints that is two million allocations doing nothing. <code>IntStream</code>, <code>mapToInt</code> and <code>ToIntFunction</code> are how you avoid it, and it is worth knowing that this is <em>all</em> they are for.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A lambda cannot throw a checked exception unless the interface declares it, and none of the standard ones do.</strong> So <code>list.forEach(f -&gt; Files.delete(f))</code> does not compile, and the usual workarounds are all ugly: wrap in an unchecked exception inside the lambda, declare your own throwing interface, or use a plain <code>for</code> loop. This is the strongest practical argument in the checked-exception debate, and it is worth reaching for as evidence rather than opinion.</p>'
                }
            ],
            docs: [
                { title: 'java.util.function', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/function/package-summary.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'java-language', questionId: 'checked-vs-unchecked' }
            ]
        },

        {
            id: 'lambda-vs-anonymous-class',
            title: 'A Lambda Is Not an Anonymous Class',
            importance: 'must-know',
            summary: 'Different this, different bytecode, different number of class files — and only the first of those ever causes a bug.',
            interviewAngle: 'A precise question with a precise answer, and the invokedynamic half is genuine deep-dive material. The this difference is the part with a production consequence, so lead with it.',
            buildsOn: ['functional-interfaces'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'Three real differences',
                    left: 'Lambda',
                    right: 'Anonymous class',
                    rows: [
                        { aspect: '<code>this</code> refers to', left: '<strong>The enclosing instance</strong>', right: '<strong>The anonymous instance itself</strong>' },
                        { aspect: 'Compiled to', left: 'An <code>invokedynamic</code> call site, linked by <code>LambdaMetafactory</code> at first execution', right: 'A separate class file, <code>Outer$1.class</code>' },
                        { aspect: 'Instances created', left: 'One, cached, if it captures nothing', right: 'A new one every evaluation' },
                        { aspect: 'Can hold state', left: 'No', right: 'Yes — fields' },
                        { aspect: 'Can implement', left: 'One abstract method only', right: 'Any interface or class' },
                        { aspect: 'Shadowing a local name', left: 'Not allowed — same scope as the enclosing method', right: 'Allowed — its own scope' }
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The difference that causes a bug',
                    code: 'class Registrar {\n    private final String name = "registrar";\n\n    void run() {\n        Runnable lambda = () -> System.out.println(this.name);\n        // prints "registrar" — this is the Registrar\n\n        Runnable anon = new Runnable() {\n            private final String name = "anonymous";\n            @Override public void run() { System.out.println(this.name); }\n            // prints "anonymous" — this is the Runnable\n        };\n    }\n}',
                    notes: '<p>A lambda is <strong>not</strong> a new scope. It shares the enclosing method\'s scope, which is why <code>this</code> is the enclosing instance and why you cannot declare a lambda parameter with the same name as a local variable in scope. This bites most often when refactoring an anonymous class into a lambda inside a class that has a field the anonymous class was shadowing.</p>'
                },
                {
                    type: 'prose',
                    html: '<p>The bytecode difference is worth one sentence in a deep-dive round. A lambda does not become a class at compile time: <code>javac</code> emits an <code>invokedynamic</code> instruction and a private synthetic method holding the body, and the first time that call site executes, <code>LambdaMetafactory</code> spins up an implementation. The practical consequences are that a jar does not gain a class file per lambda, that a non-capturing lambda is instantiated once and reused, and that the strategy can change without recompiling anything — which is the real reason the design was chosen.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A lambda captures only <em>effectively final</em> locals, and that restriction is about the memory model rather than about style.</strong> The value is copied into the lambda at creation, so a mutable local would give the lambda a stale copy with no synchronisation and no way to see later writes. The workaround people reach for — an <code>int[1]</code> or an <code>AtomicInteger</code> — compiles, and in a parallel stream it is a data race. If you are accumulating, you want <code>reduce</code> or a <code>Collector</code>.</p>'
                }
            ],
            docs: [
                { title: 'LambdaMetafactory', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/invoke/LambdaMetafactory.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'java-language', questionId: 'static-nested-vs-inner' }
            ]
        },

        {
            id: 'stream-laziness',
            title: 'Nothing Happens Until the Terminal Operation',
            importance: 'must-know',
            summary: 'Intermediate operations build a pipeline and run nothing. The terminal operation pulls elements through it one at a time — not stage by stage.',
            interviewAngle: 'The most valuable single fact about streams, and the one that a predict-the-output question is almost always testing. Element-at-a-time rather than stage-at-a-time is the part people get wrong even when they know the word "lazy".',
            buildsOn: ['functional-interfaces'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'What order do the print statements come out in?',
                    code: 'List<String> names = List.of("Ada", "Grace", "Alan", "Barbara");\n\nOptional<String> first = names.stream()\n    .peek(n  -> System.out.println("peek:   " + n))\n    .filter(n -> { System.out.println("filter: " + n); return n.length() > 3; })\n    .map(n   -> { System.out.println("map:    " + n); return n.toUpperCase(); })\n    .findFirst();',
                    output: {
                        kind: 'trace',
                        lines: [
                            'peek:   Ada        — the first element enters the pipeline',
                            'filter: Ada        — length 3, rejected; map is never reached for it',
                            'peek:   Grace',
                            'filter: Grace      — accepted',
                            'map:    Grace      — findFirst is satisfied and the pipeline stops',
                            'Alan and Barbara are never touched at all.'
                        ],
                        explain: '<p>Two things to take from this. Each element is pushed all the way through before the next one starts — <strong>not</strong> filter-everything-then-map-everything. And <code>findFirst</code> <strong>short-circuits</strong>: once it has an answer the source is not consulted again, which is what makes a stream over an infinite source such as <code>Stream.iterate</code> a sensible thing to write.</p>'
                    }
                },
                {
                    type: 'types',
                    title: 'Consequences worth knowing',
                    items: [
                        { name: 'No terminal operation, no work', html: '<p>A pipeline ending at <code>map</code> does nothing at all. Static analysis flags the unused result; nothing at run time will.</p>' },
                        { name: 'Short-circuiting operations', html: '<p><code>findFirst</code>, <code>findAny</code>, <code>anyMatch</code>, <code>allMatch</code>, <code>noneMatch</code>, <code>limit</code>, <code>takeWhile</code>. These are what make an infinite stream terminate.</p>' },
                        { name: 'Stateful operations cannot short-circuit', html: '<p><code>sorted</code> and <code>distinct</code> must see every element before they can emit the first one, so putting <code>sorted</code> before <code>limit(10)</code> still sorts everything. That is the pipeline order to think about when performance matters.</p>' },
                        { name: 'A stream is single-use', html: '<p>Reusing one throws <code>IllegalStateException: stream has already been operated upon or closed</code>. Store the collection, not the stream, and build a new stream per traversal.</p>' },
                        { name: '<code>peek</code> is for debugging only', html: '<p>Its Javadoc says so. Under some conditions the implementation may skip elements entirely — with <code>count()</code> on a sized stream it can elide the whole pipeline — so never put a side effect you depend on in a <code>peek</code>.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>Say the second half, which is the half that distinguishes: <em>"Intermediate operations are lazy and build a pipeline; the terminal operation drives it. And it drives it element by element, not stage by stage — one element goes all the way through before the next starts, which is why findFirst can stop early and why an infinite stream works."</em></p>'
                }
            ],
            docs: [
                { title: 'Stream — package documentation on laziness', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/stream/package-summary.html', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'intermediate-and-terminal',
            title: 'The Operation Vocabulary',
            importance: 'should-know',
            summary: 'Which operations are lazy, which are stateful, and which end the pipeline — the classification that makes the previous chapter usable.',
            interviewAngle: 'Rarely asked as a list. Constantly assumed: any question about stream performance or ordering is really a question about which of these categories an operation falls into.',
            buildsOn: ['stream-laziness'],
            blocks: [
                {
                    type: 'table',
                    title: 'The operations, classified',
                    headers: ['Operation', 'Kind', 'Note'],
                    rows: [
                        ['<code>filter</code>, <code>map</code>, <code>flatMap</code>, <code>peek</code>, <code>mapMulti</code>', 'Intermediate, stateless', 'One element in, zero or more out. Parallelises freely'],
                        ['<code>sorted</code>, <code>distinct</code>', 'Intermediate, <strong>stateful</strong>', 'Must buffer; cannot short-circuit; expensive in parallel'],
                        ['<code>limit</code>, <code>skip</code>', 'Intermediate, stateful', 'Short-circuiting, but costly on an ordered parallel stream'],
                        ['<code>takeWhile</code>, <code>dropWhile</code>', 'Intermediate, stateful', 'Java 9. Stop at the first element that fails the predicate'],
                        ['<code>forEach</code>, <code>forEachOrdered</code>', 'Terminal', '<code>forEach</code> gives no order guarantee in parallel'],
                        ['<code>collect</code>, <code>toList</code>, <code>toArray</code>', 'Terminal', '<code>Stream.toList()</code>, Java 16, returns an <strong>unmodifiable</strong> list'],
                        ['<code>reduce</code>, <code>count</code>, <code>min</code>, <code>max</code>', 'Terminal', 'The accumulator must be associative to parallelise correctly'],
                        ['<code>findFirst</code>, <code>anyMatch</code>, <code>allMatch</code>', 'Terminal, short-circuiting', 'Stop as soon as the answer is known']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong><code>Stream.toList()</code> and <code>collect(Collectors.toList())</code> are not the same.</strong> The Java 16 method returns an <em>unmodifiable</em> list and permits nulls; the collector returns a mutable <code>ArrayList</code> by convention, though it does not promise to. Switching to the shorter form and then calling <code>add</code> on the result gives an <code>UnsupportedOperationException</code> at run time, and it is a common surprise during a Java upgrade.</p>'
                }
            ],
            docs: [
                { title: 'Stream.toList', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/stream/Stream.html#toList()', kind: 'api' }
            ],
            relatedQuestions: []
        },

        {
            id: 'collectors',
            title: 'Collectors, and the Three Traps in toMap',
            importance: 'must-know',
            summary: 'toMap throws on a duplicate key, throws on a null value, and gives you no control over the map implementation — unless you use the overloads nobody remembers.',
            interviewAngle: 'toMap is one of the most reliable sources of a production NullPointerException in modern Java, and being able to name all three of its traps unprompted is a strong signal.',
            buildsOn: ['intermediate-and-terminal'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The two-argument form and what it does not tell you',
                    code: '// Throws IllegalStateException: "Duplicate key" the moment two\n// users share an email. The message names the VALUE, not the key,\n// which makes it unexpectedly hard to debug.\nMap<String, User> byEmail = users.stream()\n    .collect(Collectors.toMap(User::email, u -> u));\n\n// Throws NullPointerException if any email is null — and unlike\n// HashMap.put, which happily accepts one null key.\n\n// The three-argument form takes a merge function and is what you\n// almost always want.\nMap<String, User> byEmail2 = users.stream()\n    .collect(Collectors.toMap(User::email, u -> u, (a, b) -> a));\n\n// The four-argument form also picks the map implementation.\nMap<String, User> sorted = users.stream()\n    .collect(Collectors.toMap(User::email, u -> u, (a, b) -> a, TreeMap::new));',
                    output: {
                        kind: 'trace',
                        lines: [
                            'The two-argument toMap uses a merge function that always throws, so any duplicate key fails the whole collection.',
                            'It also calls Map.merge internally, which rejects null values with a NullPointerException regardless of the map implementation.',
                            'The three-argument form replaces the throwing merger with yours: (a, b) -> a keeps the first, (a, b) -> b keeps the last.',
                            'The four-argument form supplies the map factory, which is the only way to get a TreeMap, LinkedHashMap or EnumMap out of toMap.'
                        ],
                        explain: '<p>The null-value behaviour is the one that surprises: it is a <em>documented</em> consequence of <code>toMap</code> being built on <code>Map.merge</code>, and it means a collector over data with optional fields fails on the first absent one. <code>groupingBy</code> does not have this problem, which is one reason it is often the better tool.</p>'
                    }
                },
                {
                    type: 'table',
                    title: 'The collectors worth knowing without looking them up',
                    headers: ['Collector', 'Produces', 'Use'],
                    rows: [
                        ['<code>toList</code> / <code>toSet</code>', 'A mutable collection', 'The default'],
                        ['<code>toUnmodifiableList</code>', 'An immutable list', 'Returning from a method'],
                        ['<code>toMap(k, v, merge)</code>', 'A map', '<strong>Always pass the merge function</strong>'],
                        ['<code>groupingBy(fn)</code>', '<code>Map&lt;K, List&lt;T&gt;&gt;</code>', 'The workhorse'],
                        ['<code>groupingBy(fn, downstream)</code>', '<code>Map&lt;K, R&gt;</code>', 'Counting, summing, mapping per group'],
                        ['<code>partitioningBy(pred)</code>', '<code>Map&lt;Boolean, List&lt;T&gt;&gt;</code>', 'Exactly two keys, both always present'],
                        ['<code>joining(", ", "[", "]")</code>', 'A <code>String</code>', 'Faster and clearer than reducing with <code>+</code>'],
                        ['<code>counting</code>, <code>summingInt</code>, <code>averagingDouble</code>', 'A number', 'As a downstream collector'],
                        ['<code>collectingAndThen(c, fn)</code>', 'Whatever <code>fn</code> returns', 'Wrapping a result — usually to make it unmodifiable'],
                        ['<code>teeing(c1, c2, merge)</code>', 'A merged result', 'Java 12. Two collectors over one pass']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Do not collect into a shared mutable collection with <code>forEach</code>.</strong> <code>stream().forEach(list::add)</code> works sequentially and is a data race the moment anyone adds <code>.parallel()</code>. <code>collect</code> exists precisely because it knows how to combine partial results safely; <code>forEach</code> plus a side effect does not, and the failure is silent element loss rather than an exception.</p>'
                }
            ],
            docs: [
                { title: 'Collectors', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/stream/Collectors.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'collections', questionId: 'compute-and-merge' }
            ]
        },

        {
            id: 'groupingby-and-partitioningby',
            title: 'groupingBy, and the Downstream Collector',
            importance: 'should-know',
            summary: 'The second argument is where the power is — group and count, group and sum, group and map, in one pass.',
            interviewAngle: 'A live-coding staple: "group these orders by customer and give me the total per customer". Reaching for the downstream form rather than grouping and then streaming the values again is the difference between two passes and one.',
            buildsOn: ['collectors'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Four shapes of the same idea',
                    code: '// Group\nMap<String, List<Order>> byCustomer = orders.stream()\n    .collect(groupingBy(Order::customerId));\n\n// Group and count\nMap<String, Long> countByCustomer = orders.stream()\n    .collect(groupingBy(Order::customerId, counting()));\n\n// Group and sum — one pass, no intermediate lists allocated\nMap<String, BigDecimal> totalByCustomer = orders.stream()\n    .collect(groupingBy(Order::customerId,\n             reducing(BigDecimal.ZERO, Order::amount, BigDecimal::add)));\n\n// Group, extract a field, and keep the order stable\nMap<String, List<String>> refsByCustomer = orders.stream()\n    .collect(groupingBy(Order::customerId, TreeMap::new,\n             mapping(Order::reference, toList())));\n\n// Two buckets, both guaranteed present even when one is empty\nMap<Boolean, List<Order>> split = orders.stream()\n    .collect(partitioningBy(o -> o.amount().compareTo(LIMIT) > 0));',
                    notes: '<p><code>partitioningBy</code> is not just <code>groupingBy</code> with a boolean function: it <strong>always</strong> returns both keys, so <code>get(true)</code> is an empty list rather than <code>null</code> when nothing matched. That guarantee is the reason to use it, and it removes a null check the <code>groupingBy</code> version needs.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong><code>groupingBy</code> throws a <code>NullPointerException</code> if the classifier returns null.</strong> Grouping orders by an optional <code>region</code> field fails on the first order without one — and unlike <code>toMap</code> this is not obvious from the signature. Map the classifier to a sentinel first: <code>groupingBy(o -&gt; o.region() == null ? "UNKNOWN" : o.region())</code>.</p>'
                }
            ],
            docs: [
                { title: 'Collectors.groupingBy', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/stream/Collectors.html#groupingBy(java.util.function.Function,java.util.stream.Collector)', kind: 'api' }
            ],
            relatedQuestions: []
        },

        {
            id: 'flatmap',
            title: 'flatMap',
            importance: 'should-know',
            summary: 'map turns one element into one element; flatMap turns one element into a stream of elements and flattens the result.',
            interviewAngle: 'The operation people know the name of and reach for last. The tell is a Stream<List<T>> that then gets iterated — a shape that means flatMap was the right tool two lines earlier.',
            buildsOn: ['intermediate-and-terminal'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The shape that tells you it was needed',
                    code: '// map gives you a stream of lists, which is almost never what you want\nStream<List<Item>> nested = orders.stream().map(Order::items);\n\n// flatMap gives you a stream of items\nList<Item> all = orders.stream()\n    .flatMap(order -> order.items().stream())\n    .toList();\n\n// It is also how you drop empties without an isPresent check.\n// Optional.stream() is empty or one element, so this is a filter\n// and a map at once.\nList<Address> addresses = users.stream()\n    .flatMap(user -> user.address().stream())\n    .toList();\n\n// And it flattens two levels of Optional without nesting.\nOptional<String> postcode = user.address()\n    .flatMap(Address::postcode);',
                    notes: '<p><code>Optional.stream()</code>, added in Java 9, is the neatest use of <code>flatMap</code> in everyday code: it turns "filter out the absent ones and unwrap the rest" into one operation with no <code>isPresent</code> anywhere. <code>mapMulti</code>, added in Java 16, does the same job by pushing to a consumer instead of allocating a stream per element, and is worth reaching for only when a profiler has pointed at that allocation.</p>'
                }
            ],
            docs: [
                { title: 'Optional.stream', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Optional.html#stream()', kind: 'api' }
            ],
            relatedQuestions: []
        },

        {
            id: 'parallel-streams-and-when-not',
            title: 'Parallel Streams, and Why the Answer Is Usually No',
            importance: 'must-know',
            summary: 'One shared pool for the whole JVM, no back pressure, and a cost model that only pays off for CPU-bound work over a large, cheaply splittable source.',
            interviewAngle: 'Asked as "when would you use a parallel stream", and the strong answer is mostly a list of when not to. The detail that lands hardest is that the common ForkJoinPool is shared process-wide, so one blocking parallel stream can stall unrelated code.',
            buildsOn: ['stream-laziness'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p><code>parallelStream()</code> submits to the <strong>common <code>ForkJoinPool</code></strong>, which by default has one fewer worker than you have cores and is shared by everything in the JVM — including <code>CompletableFuture</code>\'s default executor and any library that reaches for it. There is no queue you control, no rejection policy, and no isolation. That single fact rules out most of the cases people want to use it for.</p>'
                },
                {
                    type: 'types',
                    title: 'When it is the wrong tool',
                    items: [
                        { name: 'Anything blocking', html: '<p>An HTTP call or a database query inside a parallel stream occupies a common-pool worker for the whole latency. A handful of concurrent requests doing this can exhaust the pool for the entire process, and the symptom appears in code that never used a parallel stream at all.</p>' },
                        { name: 'Inside a request thread', html: '<p>Same reason, and worse: the failure scales with traffic, so it appears under load and not in testing.</p>' },
                        { name: 'Small streams', html: '<p>Splitting, scheduling and joining cost more than the work. The rule of thumb is tens of thousands of elements <em>and</em> real per-element cost.</p>' },
                        { name: 'Sources that split badly', html: '<p><code>ArrayList</code> and arrays split in O(1) by index. <code>LinkedList</code>, <code>Stream.iterate</code> and most <code>BufferedReader</code> lines must be traversed to be split, which serialises the split itself.</p>' },
                        { name: 'Order-sensitive pipelines', html: '<p><code>findFirst</code>, <code>limit</code> and <code>forEachOrdered</code> all force coordination that erases much of the gain.</p>' },
                        { name: 'Non-associative reduction', html: '<p><code>reduce</code> assumes the operator is associative, since partial results are combined in an unspecified grouping. Subtraction is not associative and produces a wrong answer rather than an error.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Do not "fix" a blocking parallel stream by submitting it to your own <code>ForkJoinPool</code>.</strong> The trick of wrapping <code>parallelStream</code> in <code>customPool.submit(...)</code> does work — the pipeline runs in the submitting pool — but it is undocumented behaviour that the stream API does not promise, and it does not change the fact that blocking work does not belong in a fork-join pool at all. If the work is IO-bound, use an executor sized for IO, or virtual threads, which is what the next two modules are about.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Answer with the pool: <em>"Almost never, and the reason is that parallelStream uses the common ForkJoinPool, which is shared by the whole JVM. If anything in that pipeline blocks, I have taken a worker away from every other user of it, and the outage shows up somewhere unrelated. It is worth it for CPU-bound work over a large array with no ordering constraints — and I would measure it rather than assume."</em></p>'
                }
            ],
            docs: [
                { title: 'ForkJoinPool.commonPool', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/ForkJoinPool.html#commonPool()', kind: 'api' },
                { title: 'Parallelism — the stream package documentation', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/stream/package-summary.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'collections', questionId: 'collections-and-parallel-streams' },
                { topicId: 'concurrency', questionId: 'forkjoin-common-pool' }
            ]
        },

        {
            id: 'optional-done-right',
            title: 'Optional, Used as Intended',
            importance: 'must-know',
            summary: 'A return type expressing "there may be no answer". Not a field, not a parameter, and not a null check with extra steps.',
            interviewAngle: 'Asked as "when do you use Optional", and the discriminating half is where you do not. A candidate who says "as a field to avoid nulls" has not read the design rationale, and there is a good one.',
            buildsOn: ['flatmap'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p><code>Optional</code> was introduced for one job: <strong>a return type that makes "no result" part of the signature</strong>, so a caller cannot forget the case. Brian Goetz has been explicit that it was not intended as a general-purpose Maybe type, and the API reflects that — it is not <code>Serializable</code>, which alone rules it out as a field on anything that gets serialised.</p>'
                },
                {
                    type: 'types',
                    title: 'Where it belongs and where it does not',
                    items: [
                        { name: 'Return type — yes', html: '<p><code>Optional&lt;User&gt; findByEmail(String)</code>. The caller is made to handle absence, which is the entire benefit.</p>' },
                        { name: 'Field — no', html: '<p>Not <code>Serializable</code>, costs an extra object per instance, and JPA and Jackson both need special handling. Use a nullable field and an <code>Optional</code>-returning accessor if you want the ergonomics.</p>' },
                        { name: 'Method parameter — no', html: '<p>The caller must now wrap, and you must handle <code>Optional</code> being itself null. Two overloads say the same thing better.</p>' },
                        { name: 'Collection element — no', html: '<p>An empty collection already expresses absence. <code>List&lt;Optional&lt;T&gt;&gt;</code> is two representations of nothing.</p>' },
                        { name: 'Constructor argument — no', html: '<p>Same as a parameter, with the added problem that the field will then be one too.</p>' }
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'orElse and orElseGet are not interchangeable',
                    code: '// The argument to orElse is evaluated ALWAYS, present or not.\nUser user = repository.findByEmail(email)\n    .orElse(createGuestUser());        // createGuestUser() runs every time\n\n// orElseGet takes a Supplier, called only when empty.\nUser user2 = repository.findByEmail(email)\n    .orElseGet(() -> createGuestUser());\n\n// Same distinction on the throwing form.\nUser user3 = repository.findByEmail(email)\n    .orElseThrow(() -> new UserNotFoundException(email));\n\n// And the chain that replaces every isPresent/get pair.\nString postcode = repository.findByEmail(email)\n    .flatMap(User::address)\n    .map(Address::postcode)\n    .filter(p -> !p.isBlank())\n    .orElse("unknown");',
                    output: {
                        kind: 'trace',
                        lines: [
                            'orElse takes a VALUE, so the expression producing it is evaluated before orElse is called — Java is strict, and this is not an Optional quirk.',
                            'If createGuestUser() writes to a database, that write happens on every lookup including the successful ones.',
                            'orElseGet takes a Supplier, so the body runs only on the empty path.',
                            'The difference is invisible when the default is a constant, and is a defect when it is a call.'
                        ],
                        explain: '<p>Use <code>orElse</code> only for constants and already-computed values. Anything with a cost or a side effect goes in <code>orElseGet</code>, and this is a review comment worth making every time.</p>'
                    }
                },
                {
                    type: 'pitfall',
                    html: '<p><strong><code>opt.isPresent()</code> followed by <code>opt.get()</code> is a null check with more typing.</strong> It has the same shape, the same failure mode when someone reorders it, and none of the benefit. <code>map</code>, <code>flatMap</code>, <code>filter</code>, <code>ifPresent</code>, <code>ifPresentOrElse</code>, <code>or</code> and <code>orElseThrow</code> cover essentially every case — and since Java 10 the intent-revealing name is <code>orElseThrow()</code> with no argument rather than <code>get()</code>.</p>'
                }
            ],
            docs: [
                { title: 'Optional', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Optional.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'java-language', questionId: 'optional-in-a-field-or-parameter' },
                { topicId: 'jpa-hibernate', questionId: 'getreferencebyid-vs-findbyid' }
            ]
        }
    ]
};
