/* ==========================================================================
   data/streams-functional.js — Streams, Lambdas & Optional

   No subsections. The topic reads as one argument that starts at "a stream is
   a pipeline, not a collection" and ends at "here is where a loop is the
   better answer", and cutting it into three headings would break the thread
   for no filing benefit. `transactions` was left flat for the same reason
   during Phase 2.

   The questions interviewers actually ask here are almost never "what does
   map do". They are the ones where the API's behaviour differs from the
   mental model: toMap throwing on a duplicate key, orElse evaluating eagerly,
   peek not running at all, and a parallel stream quietly borrowing the pool
   that everything else in the JVM is also using.

   ONE GLOBAL PER FILE.
   ========================================================================== */

const streamsFunctionalData = {
    id: 'streams-functional',
    title: 'Streams, Lambdas & Optional',
    subsections: null,
    keyTopics: [
        'lazy evaluation', 'intermediate vs terminal', 'Collectors', 'groupingBy',
        'flatMap', 'parallel streams', 'Optional misuse', 'functional interfaces',
        'method references'
    ],
    questions: [

{
    id: 'what-a-stream-is-not',
    importance: 'must-know',
    subsection: null,
    question: 'What is a stream, and why is it not a collection?',
    answer:
        '<p>A collection is a place where elements are. A stream is a <strong>description of a ' +
        'computation over elements</strong> that live somewhere else. Nothing in a stream stores ' +
        'anything, and that single difference explains almost every surprising thing about the ' +
        'API.</p>' +
        '<p>Four consequences fall straight out of it:</p>' +
        '<ul>' +
        '<li><strong>It is lazy.</strong> Building a pipeline does no work. Nothing runs until a ' +
        'terminal operation asks for a result.</li>' +
        '<li><strong>It is single-use.</strong> The pipeline is consumed when it runs, and ' +
        'touching it again throws <code>IllegalStateException</code>.</li>' +
        '<li><strong>It has no index and no size you can rely on.</strong> A stream over a ' +
        'generator has no size at all.</li>' +
        '<li><strong>It does not modify the source.</strong> <code>map</code> does not change the ' +
        'list you started from; it describes a new sequence.</li>' +
        '</ul>' +
        '<p>The useful way to say it in an interview: <em>a stream is a query you have written ' +
        'down but not yet run</em>. That framing also predicts the right answer to "is a stream ' +
        'faster than a loop" — it is not, inherently; it is a different way of expressing the ' +
        'same traversal, and the reason to reach for it is that the expression is clearer.</p>',
    referenceLinks: [
        { title: 'java.util.stream — package summary', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/stream/package-summary.html' }
    ],
    tags: ['streams', 'fundamentals'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'intermediate-vs-terminal-operations',
    importance: 'must-know',
    subsection: null,
    question: 'What is the difference between an intermediate and a terminal operation?',
    answer:
        '<p>An <strong>intermediate</strong> operation returns another stream and does nothing ' +
        'else. A <strong>terminal</strong> operation returns something that is not a stream — a ' +
        'value, a collection, or nothing at all — and running it is what makes the whole pipeline ' +
        'execute.</p>' +
        '<p>The signature tells you which is which, and that is not a coincidence: returning a ' +
        'stream is exactly what makes an operation deferrable.</p>' +
        '<ul>' +
        '<li><strong>Intermediate:</strong> <code>filter</code>, <code>map</code>, ' +
        '<code>flatMap</code>, <code>peek</code>, <code>distinct</code>, <code>sorted</code>, ' +
        '<code>limit</code>, <code>skip</code>, <code>takeWhile</code>, <code>dropWhile</code>.</li>' +
        '<li><strong>Terminal:</strong> <code>forEach</code>, <code>collect</code>, ' +
        '<code>reduce</code>, <code>count</code>, <code>toList</code>, <code>anyMatch</code>, ' +
        '<code>findFirst</code>, <code>min</code>, <code>max</code>.</li>' +
        '</ul>' +
        '<p>Intermediates split again into <strong>stateless</strong> and <strong>stateful</strong>. ' +
        '<code>filter</code> and <code>map</code> decide each element on its own. ' +
        '<code>sorted</code> and <code>distinct</code> cannot — <code>sorted</code> has to see ' +
        'every element before it can emit the first one, which means it buffers the whole stream ' +
        'and destroys the memory advantage laziness gave you. That is the practical reason ' +
        '<code>sorted().limit(10)</code> on a huge source is not cheap and ' +
        '<code>limit(10).sorted()</code> is.</p>',
    referenceLinks: [
        { title: 'Stream operations and pipelines', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/stream/package-summary.html' }
    ],
    tags: ['streams', 'laziness'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'laziness-and-element-order',
    importance: 'must-know',
    subsection: null,
    question: 'In what order do the stages of a stream pipeline run over the elements?',
    answer:
        '<p>Not stage by stage. <strong>Element by element, depth first</strong> — the first ' +
        'element goes all the way down the pipeline before the second one is fetched.</p>' +
        '<p>Almost everyone assumes the opposite: that <code>filter</code> runs over the whole ' +
        'list, then <code>map</code> runs over what survived. It reads that way on the page, and ' +
        'it is wrong. The pipeline is fused into a single traversal.</p>' +
        '<p>This is the single most useful thing to know about streams, because three separate ' +
        'behaviours follow from it:</p>' +
        '<ul>' +
        '<li><strong>Short-circuiting works.</strong> <code>filter(...).findFirst()</code> stops ' +
        'at the first match instead of filtering a million elements first.</li>' +
        '<li><strong>Infinite sources are usable.</strong> <code>Stream.iterate(...)</code> with ' +
        'a <code>limit</code> terminates, because nothing is ever materialised.</li>' +
        '<li><strong>Interleaved side effects look scrambled.</strong> Printing from inside two ' +
        'stages produces alternating output, not one block then another — which is the standard ' +
        'way this gets asked.</li>' +
        '</ul>' +
        '<p>The exception is the stateful operations. <code>sorted</code> is a barrier: it must ' +
        'consume everything upstream before it emits anything downstream.</p>',
    referenceLinks: [
        { title: 'Stream — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/stream/Stream.html' }
    ],
    tags: ['streams', 'laziness', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: [
        {
            language: 'java',
            title: 'Two stages, one traversal',
            code:
                'List<String> names = List.of("ana", "bob", "cleo");\n' +
                '\n' +
                'names.stream()\n' +
                '     .filter(n -> { System.out.println("filter " + n); return n.length() > 3; })\n' +
                '     .map(n -> { System.out.println("  map " + n); return n.toUpperCase(); })\n' +
                '     .forEach(n -> System.out.println("    got " + n));',
            output: {
                kind: 'trace',
                lines: [
                    'filter ana',
                    'filter bob',
                    'filter cleo',
                    '  map cleo',
                    '    got CLEO'
                ],
                explain:
                    '<p>Each name is pushed through the whole pipeline before the next is fetched. ' +
                    '"ana" and "bob" fail the filter and never reach <code>map</code> at all, so ' +
                    'the map line appears once rather than three times. Stage-at-a-time execution ' +
                    'would have printed three filter lines, then three map lines.</p>'
            }
        }
    ]
},

{
    id: 'stream-is-single-use',
    importance: 'should-know',
    subsection: null,
    question: 'Can you reuse a stream? What happens if you try?',
    answer:
        '<p>No. A stream may be traversed <strong>once</strong>. A second terminal operation on ' +
        'the same pipeline throws <code>IllegalStateException: stream has already been operated ' +
        'upon or closed</code>.</p>' +
        '<p>That includes the case people trip over, which is holding an intermediate stage in a ' +
        'variable and branching off it twice. The stage is not a fresh stream; it is a link in ' +
        'the one pipeline.</p>' +
        '<p>What you reuse instead is the <strong>source</strong>. A <code>List</code> can produce ' +
        'as many streams as you like, and if you genuinely need the same pipeline twice, hold a ' +
        '<code>Supplier&lt;Stream&lt;T&gt;&gt;</code> and call <code>get()</code> each time.</p>' +
        '<p>The reason for the restriction is worth giving: a stream may be backed by something ' +
        'with no ability to replay — a file, a network socket, a generator. Making single-use the ' +
        'rule for all streams rather than only the unreplayable ones is what keeps the API ' +
        'honest across sources.</p>',
    referenceLinks: [
        { title: 'BaseStream — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/stream/BaseStream.html' }
    ],
    tags: ['streams', 'pitfalls'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'map-vs-flatmap',
    importance: 'must-know',
    subsection: null,
    question: 'What is the difference between map and flatMap?',
    answer:
        '<p><code>map</code> is one in, one out. <code>flatMap</code> is one in, <em>a stream</em> ' +
        'out, and the results are concatenated into a single flat stream.</p>' +
        '<p>The tell that you need <code>flatMap</code> is a type: if ' +
        '<code>map</code> leaves you holding <code>Stream&lt;List&lt;T&gt;&gt;</code> or ' +
        '<code>Stream&lt;Optional&lt;T&gt;&gt;</code>, you wanted one level fewer. Wherever a ' +
        'nested structure appears in the type, <code>flatMap</code> is the operation that ' +
        'removes it.</p>' +
        '<p>Two things about it are easy to get wrong. The function must return a ' +
        '<strong>stream</strong>, not a collection — <code>list.stream()</code>, not ' +
        '<code>list</code>. And each substream is consumed and closed as it is produced, so ' +
        'returning the same stream instance twice fails for the single-use reason above.</p>' +
        '<p><code>Optional</code> has its own <code>flatMap</code> for exactly the same purpose: ' +
        'chaining a lookup that itself returns an <code>Optional</code> without ending up with ' +
        '<code>Optional&lt;Optional&lt;T&gt;&gt;</code>.</p>',
    referenceLinks: [
        { title: 'Stream.flatMap — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/stream/Stream.html' }
    ],
    tags: ['streams', 'flatmap'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: [
        {
            language: 'java',
            title: 'The type tells you which one you needed',
            code:
                'record Order(String id, List<String> items) {}\n' +
                '\n' +
                'List<Order> orders = List.of(\n' +
                '        new Order("A", List.of("pen", "ink")),\n' +
                '        new Order("B", List.of("pad")));\n' +
                '\n' +
                '// Stream<List<String>> — one list per order. Almost never what you wanted.\n' +
                'var nested = orders.stream().map(Order::items);\n' +
                '\n' +
                '// Stream<String> — every item across every order.\n' +
                'List<String> all = orders.stream()\n' +
                '        .flatMap(o -> o.items().stream())\n' +
                '        .toList();                       // [pen, ink, pad]',
            output: {
                kind: 'trace',
                lines: ['all = [pen, ink, pad]'],
                explain:
                    '<p>Both traversals visit the same two orders. <code>map</code> preserves the ' +
                    'shape of the source — two elements in, two out — while <code>flatMap</code> ' +
                    'splices each inner stream into the outer one, so three items come out of two ' +
                    'orders.</p>'
            }
        }
    ]
},

{
    id: 'collectors-groupingby',
    importance: 'must-know',
    subsection: null,
    question: 'How does groupingBy work, and what can you do with its second argument?',
    answer:
        '<p><code>groupingBy(classifier)</code> runs the classifier on every element and returns ' +
        'a <code>Map</code> from each distinct key to the <code>List</code> of elements that ' +
        'produced it. The map is a <code>HashMap</code> and the lists are <code>ArrayList</code>s, ' +
        'unless you say otherwise.</p>' +
        '<p>The two- and three-argument forms are where the operation becomes genuinely powerful, ' +
        'because the last argument is a <strong>downstream collector</strong> — the thing to do ' +
        'with each group instead of listing it:</p>' +
        '<ul>' +
        '<li><code>counting()</code> — a histogram in one line.</li>' +
        '<li><code>summingInt(...)</code>, <code>averagingDouble(...)</code> — aggregate per key.</li>' +
        '<li><code>mapping(f, toList())</code> — transform the members before collecting.</li>' +
        '<li><code>filtering(p, toList())</code> — Java 9, and <strong>not</strong> the same as ' +
        'filtering before the grouping: filtering upstream drops empty groups entirely, while ' +
        '<code>filtering</code> keeps the key with an empty list. Which you want is a real ' +
        'decision and this is how you express it.</li>' +
        '<li><code>toMap(...)</code> or a nested <code>groupingBy(...)</code> for two levels.</li>' +
        '</ul>' +
        '<p>The three-argument form takes a map factory in the middle, which is how you get a ' +
        '<code>TreeMap</code> when the keys need to come out sorted.</p>' +
        '<p><strong>A classifier that returns null throws.</strong> <code>groupingBy</code> ' +
        'rejects a null key with a <code>NullPointerException</code>, which is a common surprise ' +
        'when grouping by a nullable field. Map the field to a sentinel first, or use ' +
        '<code>Optional.ofNullable(...).orElse("unknown")</code> in the classifier.</p>',
    referenceLinks: [
        { title: 'Collectors — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/stream/Collectors.html' }
    ],
    tags: ['streams', 'collectors', 'groupingby'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: [
        {
            language: 'java',
            title: 'Three shapes of the same grouping',
            code:
                'record Employee(String name, String dept, int salary) {}\n' +
                '\n' +
                '// dept -> the employees\n' +
                'Map<String, List<Employee>> byDept =\n' +
                '        staff.stream().collect(groupingBy(Employee::dept));\n' +
                '\n' +
                '// dept -> how many\n' +
                'Map<String, Long> headcount =\n' +
                '        staff.stream().collect(groupingBy(Employee::dept, counting()));\n' +
                '\n' +
                '// dept -> just the names, and the keys come out sorted\n' +
                'Map<String, List<String>> namesByDept = staff.stream().collect(\n' +
                '        groupingBy(Employee::dept, TreeMap::new,\n' +
                '                   mapping(Employee::name, toList())));',
            output: {
                kind: 'trace',
                lines: [
                    'byDept      = {eng=[...], sales=[...]}',
                    'headcount   = {eng=2, sales=1}',
                    'namesByDept = {eng=[ana, bob], sales=[cleo]}'
                ],
                explain:
                    '<p>One traversal in each case. The downstream collector is applied per group ' +
                    'as the group is built, so <code>counting()</code> never materialises the ' +
                    'lists it is counting.</p>'
            }
        }
    ]
},

{
    id: 'collectors-tomap-traps',
    importance: 'must-know',
    subsection: null,
    question: 'What are the two ways Collectors.toMap throws, and how do you avoid each?',
    answer:
        '<p>Both are thrown at runtime on data that looks perfectly ordinary, which is why this ' +
        'is such a common interview question and such a common production incident.</p>' +
        '<p><strong>1. A duplicate key throws <code>IllegalStateException</code>.</strong> The ' +
        'two-argument <code>toMap(keyFn, valueFn)</code> has no idea what you want when two ' +
        'elements produce the same key, so it refuses. The fix is the three-argument form, whose ' +
        'third argument is a merge function: <code>(a, b) -> b</code> to keep the last, ' +
        '<code>(a, b) -> a</code> to keep the first, or something that actually combines them. ' +
        'Choosing "last wins" silently is exactly the sort of decision worth making explicitly, ' +
        'and the API forces you to.</p>' +
        '<p><strong>2. A null value throws <code>NullPointerException</code>.</strong> This one ' +
        'surprises people who know about the first. <code>toMap</code> is implemented with ' +
        '<code>Map::merge</code>, and <code>merge</code> is specified to reject a null value — so ' +
        'a value function that can return null blows up even though <code>HashMap</code> itself ' +
        'happily stores nulls. <code>groupingBy</code> does not have this problem, and neither ' +
        'does collecting into a map you fill yourself with <code>forEach</code>.</p>' +
        '<p>The four-argument form takes a map supplier last, which is how you get a ' +
        '<code>LinkedHashMap</code> and keep encounter order.</p>',
    referenceLinks: [
        { title: 'Collectors.toMap — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/stream/Collectors.html' },
        { title: 'Map.merge — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/Map.html' }
    ],
    tags: ['streams', 'collectors', 'pitfalls'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: [
        {
            language: 'java',
            title: 'Both failures, and both fixes',
            code:
                'record User(String email, String nickname) {}\n' +
                '\n' +
                'List<User> users = List.of(\n' +
                '        new User("a@x.com", "ana"),\n' +
                '        new User("a@x.com", "annie"),   // duplicate key\n' +
                '        new User("b@x.com", null));     // null value\n' +
                '\n' +
                '// IllegalStateException: Duplicate key a@x.com\n' +
                'users.stream().collect(toMap(User::email, User::nickname));\n' +
                '\n' +
                '// Still throws — NullPointerException, from Map.merge on b@x.com\n' +
                'users.stream().collect(toMap(User::email, User::nickname, (a, b) -> b));\n' +
                '\n' +
                '// Works: a merge rule AND a value that is never null\n' +
                'Map<String, String> byEmail = users.stream().collect(toMap(\n' +
                '        User::email,\n' +
                '        u -> u.nickname() == null ? "" : u.nickname(),\n' +
                '        (first, second) -> second,\n' +
                '        LinkedHashMap::new));',
            output: {
                kind: 'trace',
                lines: ['byEmail = {a@x.com=annie, b@x.com=}'],
                explain:
                    '<p>The merge function fixes the duplicate and the null-safe value function ' +
                    'fixes the second throw. Note the order they fire in: the duplicate is ' +
                    'detected first, so fixing only that reveals the second problem rather than ' +
                    'solving it.</p>'
            }
        }
    ]
},

{
    id: 'reduce-vs-collect',
    importance: 'should-know',
    subsection: null,
    question: 'When would you use reduce and when collect?',
    answer:
        '<p><code>reduce</code> is for combining elements into a single <strong>immutable</strong> ' +
        'result. <code>collect</code> is for accumulating them into a <strong>mutable</strong> ' +
        'container. Using the wrong one is not a style question — it is a correctness question in ' +
        'parallel, and a performance question in serial.</p>' +
        '<p>The canonical bad example is string concatenation. ' +
        '<code>reduce("", (a, b) -> a + b)</code> allocates a new string at every step, so ' +
        'joining <em>n</em> strings is O(n&sup2;) in the total length. ' +
        '<code>Collectors.joining()</code> uses one <code>StringBuilder</code>.</p>' +
        '<p><code>reduce</code>\'s three forms matter:</p>' +
        '<ul>' +
        '<li><code>reduce(op)</code> returns an <code>Optional</code>, because an empty stream ' +
        'has no answer.</li>' +
        '<li><code>reduce(identity, op)</code> returns a value. The identity must genuinely be ' +
        'one — <code>op(identity, x)</code> has to equal <code>x</code> — or a parallel run gives ' +
        'a different answer from a serial one.</li>' +
        '<li><code>reduce(identity, accumulator, combiner)</code> is the parallel form, where the ' +
        'accumulator and the combiner have different types.</li>' +
        '</ul>' +
        '<p>The operator must also be <strong>associative</strong>. Subtraction is not, so ' +
        '<code>reduce(0, (a, b) -> a - b)</code> gives a different result depending on how the ' +
        'work was split — and it will look correct until the day someone adds ' +
        '<code>.parallel()</code>.</p>',
    referenceLinks: [
        { title: 'Reduction — java.util.stream package summary', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/stream/package-summary.html' }
    ],
    tags: ['streams', 'reduce', 'collectors'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'when-parallel-streams-help',
    importance: 'must-know',
    subsection: null,
    question: 'When does a parallel stream actually make things faster?',
    answer:
        '<p>Rarely, and the interviewer is usually checking whether you know that. The default ' +
        'answer is <strong>measure first, and expect the sequential version to win</strong>.</p>' +
        '<p>Parallelism pays only when all of these hold at once:</p>' +
        '<ul>' +
        '<li><strong>Enough elements.</strong> Splitting, scheduling and merging cost real time. ' +
        'A few thousand elements of cheap work is usually a loss.</li>' +
        '<li><strong>Enough work per element.</strong> Summing integers is memory-bandwidth ' +
        'bound; there is nothing to parallelise.</li>' +
        '<li><strong>A source that splits well.</strong> <code>ArrayList</code> and arrays split ' +
        'in O(1) by index. <code>LinkedList</code>, <code>Stream.iterate</code> and lines of a ' +
        'file have to be walked to be divided, which throws away most of the benefit.</li>' +
        '<li><strong>No blocking in the pipeline.</strong> See the common-pool question — a ' +
        'blocking call in a parallel stream starves everything else in the JVM using it.</li>' +
        '<li><strong>An associative, side-effect-free operation.</strong> Otherwise the result is ' +
        'not merely slow, it is wrong.</li>' +
        '</ul>' +
        '<p>Also worth saying: <code>forEach</code> on a parallel stream does not preserve ' +
        'encounter order, and <code>forEachOrdered</code> does — by serialising the very thing ' +
        'you parallelised. If the output has to be ordered, collect it and order it afterwards.</p>',
    referenceLinks: [
        { title: 'Parallelism — java.util.stream package summary', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/stream/package-summary.html' }
    ],
    tags: ['streams', 'parallel', 'performance'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'parallel-stream-common-pool',
    importance: 'should-know',
    subsection: null,
    question: 'Which threads run a parallel stream, and why is that a problem?',
    answer:
        '<p><code>ForkJoinPool.commonPool()</code> — a single JVM-wide pool, sized by default to ' +
        '<code>Runtime.availableProcessors() - 1</code>, plus the calling thread, which is ' +
        'donated to the work while it waits.</p>' +
        '<p>Two consequences, and the second is the one that causes incidents.</p>' +
        '<p><strong>The pool is shared with everything else.</strong> Every parallel stream in ' +
        'the process, plus any <code>CompletableFuture</code> that did not specify an executor, ' +
        'uses it. On an eight-core box that is seven threads for the entire application.</p>' +
        '<p><strong>Blocking in a parallel stream blocks the whole JVM\'s parallelism.</strong> ' +
        'A parallel stream that makes an HTTP call per element parks common-pool threads on a ' +
        'socket, and unrelated code elsewhere in the process stops making progress. It looks like ' +
        'a mystery slowdown in a component that was never touched.</p>' +
        '<p>The old workaround was to submit the stream to your own <code>ForkJoinPool</code>, ' +
        'which works because a fork-join task runs in the pool that submitted it — but it is a ' +
        'trick that reads as one, and it does not remove the blocking. The honest answers today: ' +
        'do not do blocking I/O in a parallel stream, and if you want concurrency over blocking ' +
        'calls, use an executor you own or virtual threads, which are designed for exactly that ' +
        'shape.</p>',
    referenceLinks: [
        { title: 'ForkJoinPool.commonPool — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/ForkJoinPool.html' }
    ],
    tags: ['streams', 'parallel', 'concurrency'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'side-effects-in-lambdas',
    importance: 'should-know',
    subsection: null,
    question: 'Why is adding to a list from inside forEach a bad idea?',
    answer:
        '<p>Because it is the mutable-accumulation pattern that <code>collect</code> exists to ' +
        'replace, and it fails in a way that only shows up under parallelism or under load.</p>' +
        '<p><code>list.stream().forEach(results::add)</code> works in serial. Add ' +
        '<code>.parallel()</code> and several threads call <code>add</code> on an unsynchronised ' +
        '<code>ArrayList</code> at once, which corrupts it — usually as a lost element or an ' +
        '<code>ArrayIndexOutOfBoundsException</code> from the growth path, occasionally as ' +
        'nothing visible at all until much later.</p>' +
        '<p>Wrapping the list in <code>Collections.synchronizedList</code> makes it safe and ' +
        'slow: every element now contends on one lock, which is the opposite of the point. ' +
        '<code>collect(toList())</code> accumulates into a per-thread container and merges at the ' +
        'end, with no shared mutable state at any point.</p>' +
        '<p>The general rule the API is built around: <strong>the functions you pass to stream ' +
        'operations should be non-interfering and stateless</strong>. Non-interfering means they ' +
        'do not modify the source; stateless means the result for one element does not depend on ' +
        'any other. <code>forEach</code> is the one place a side effect is legitimate, and even ' +
        'there it should be something like logging or writing to a sink, not building the ' +
        'result.</p>',
    referenceLinks: [
        { title: 'Side-effects — java.util.stream package summary', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/stream/package-summary.html' }
    ],
    tags: ['streams', 'parallel', 'pitfalls'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'peek-and-when-not-to-use-it',
    importance: 'should-know',
    subsection: null,
    question: 'What is peek for, and why can it fail to run?',
    answer:
        '<p><code>peek</code> exists for one purpose the Javadoc states outright: <strong>looking ' +
        'at elements as they flow past, to debug a pipeline</strong>. It is not a place to do ' +
        'work.</p>' +
        '<p>Two reasons it is unreliable for anything else.</p>' +
        '<p><strong>It only sees what reaches it.</strong> Being an intermediate operation, it ' +
        'runs per element as that element passes, so a short-circuiting terminal means it sees a ' +
        'prefix, not the whole source. That is correct behaviour and still surprises people.</p>' +
        '<p><strong>Since Java 9 it may not run at all.</strong> If the pipeline\'s result can be ' +
        'computed without executing it, the implementation is permitted to skip it — the ' +
        'documented example is <code>count()</code> over a sized source with no operation that ' +
        'could change the size, where the count comes from the source\'s spliterator and no ' +
        'element is ever traversed. Inserting a <code>filter</code> before the count brings the ' +
        '<code>peek</code> back, because now the size is unknown.</p>' +
        '<p>Which makes <code>peek</code> a genuinely bad place for anything with a consequence, ' +
        'and a genuinely good place for a log line you will delete.</p>',
    referenceLinks: [
        { title: 'Stream.peek — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/stream/Stream.html' }
    ],
    tags: ['streams', 'peek', 'pitfalls'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'stream-tolist-vs-collectors-tolist',
    importance: 'should-know',
    subsection: null,
    question: 'Is Stream.toList() the same as collect(Collectors.toList())?',
    answer:
        '<p>No, and the difference has bitten real code. Three things separate them.</p>' +
        '<ul>' +
        '<li><strong>Mutability.</strong> <code>Stream.toList()</code> (Java 16) returns an ' +
        '<strong>unmodifiable</strong> list. <code>Collectors.toList()</code> makes no guarantee ' +
        'about the list it returns, and in every current implementation returns a mutable ' +
        '<code>ArrayList</code> — which plenty of code has quietly relied on. Swapping one for ' +
        'the other as a tidy-up turns a working <code>result.add(x)</code> into ' +
        '<code>UnsupportedOperationException</code> at runtime.</li>' +
        '<li><strong>Nulls.</strong> <code>Stream.toList()</code> permits null elements. ' +
        '<code>Collectors.toUnmodifiableList()</code> — the other obvious candidate — does not, ' +
        'and throws <code>NullPointerException</code>. So the two "unmodifiable" options are not ' +
        'interchangeable either.</li>' +
        '<li><strong>Readability.</strong> <code>toList()</code> needs no static import and no ' +
        'collector, which is why it should be the default.</li>' +
        '</ul>' +
        '<p>Answering with the mutability difference alone is fine. Adding the null difference is ' +
        'what makes it clear you have actually read the release notes rather than a blog post ' +
        'about them.</p>',
    referenceLinks: [
        { title: 'Stream.toList — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/stream/Stream.html' }
    ],
    tags: ['streams', 'collectors', 'versions'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'primitive-streams-and-boxing',
    importance: 'should-know',
    subsection: null,
    question: 'Why do IntStream, LongStream and DoubleStream exist?',
    answer:
        '<p>To avoid boxing. A <code>Stream&lt;Integer&gt;</code> over a million elements ' +
        'allocates a million <code>Integer</code> objects and chases a pointer for each one; an ' +
        '<code>IntStream</code> carries primitives and allocates nothing.</p>' +
        '<p>They also carry operations that only make sense on numbers — <code>sum()</code>, ' +
        '<code>average()</code>, <code>max()</code>, and <code>summaryStatistics()</code>, which ' +
        'returns count, sum, min, average and max from a single pass and is the neatest answer to ' +
        '"give me the stats for this collection".</p>' +
        '<p>Moving between them:</p>' +
        '<ul>' +
        '<li><code>mapToInt</code>, <code>mapToLong</code>, <code>mapToDouble</code> to go down ' +
        'to a primitive stream.</li>' +
        '<li><code>boxed()</code> or <code>mapToObj(...)</code> to come back up.</li>' +
        '</ul>' +
        '<p>Two sharp edges. <code>average()</code> returns <code>OptionalDouble</code> because ' +
        'an empty stream has no average, and <code>IntStream.sum()</code> returns an ' +
        '<code>int</code> that overflows silently — summing large values needs ' +
        '<code>mapToLong</code> or <code>asLongStream()</code> first.</p>' +
        '<p>There is no <code>CharStream</code>. <code>String.chars()</code> gives you an ' +
        '<code>IntStream</code>, which is why printing it produces numbers unless you ' +
        '<code>mapToObj(c -&gt; (char) c)</code>.</p>',
    referenceLinks: [
        { title: 'IntStream — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/stream/IntStream.html' }
    ],
    tags: ['streams', 'primitives', 'performance'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'what-optional-is-for',
    importance: 'must-know',
    subsection: null,
    question: 'What is Optional for, and where should it not be used?',
    answer:
        '<p>It was introduced for exactly one job: <strong>a return type that says "there may be ' +
        'no answer", in a way the caller cannot ignore</strong>. That is the whole design intent, ' +
        'and the API\'s own designers have said so.</p>' +
        '<p>Where it does not belong:</p>' +
        '<ul>' +
        '<li><strong>Fields.</strong> It costs an extra object per instance, and it is not ' +
        '<code>Serializable</code>, so an entity with an <code>Optional</code> field cannot be ' +
        'serialised by anything that relies on that.</li>' +
        '<li><strong>Method parameters.</strong> The caller now has to build an ' +
        '<code>Optional</code> to call you, and can still pass null. Two overloads say the same ' +
        'thing more clearly.</li>' +
        '<li><strong>Collections.</strong> <code>List&lt;Optional&lt;T&gt;&gt;</code> and ' +
        '<code>Optional&lt;List&lt;T&gt;&gt;</code> are both smells. An empty list already means ' +
        '"nothing", so wrapping it adds a second way to say the same thing and forces every ' +
        'caller to handle both.</li>' +
        '<li><strong>As a null check on something that is never absent.</strong> ' +
        '<code>Optional.of(x).orElse(y)</code> is a longer <code>x</code>.</li>' +
        '</ul>' +
        '<p>The real benefit is not null safety — you can still get a ' +
        '<code>NoSuchElementException</code> out of it. It is that the <em>signature</em> tells ' +
        'the caller absence is possible, so the compiler makes them write the branch rather than ' +
        'discovering it at 3am.</p>',
    referenceLinks: [
        { title: 'Optional — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/Optional.html' }
    ],
    tags: ['optional', 'api-design'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'orelse-vs-orelseget',
    importance: 'must-know',
    subsection: null,
    question: 'What is the difference between orElse and orElseGet?',
    answer:
        '<p><code>orElse(value)</code> takes a value. <code>orElseGet(supplier)</code> takes a ' +
        'function that produces one. The difference is <strong>when the argument is ' +
        'evaluated</strong>, and it is not a micro-optimisation.</p>' +
        '<p>Java evaluates arguments before the call, so ' +
        '<code>optional.orElse(expensiveLookup())</code> runs <code>expensiveLookup()</code> ' +
        '<strong>every time</strong> — including when the Optional is present and the result is ' +
        'thrown away. <code>orElseGet(this::expensiveLookup)</code> runs it only when there is ' +
        'nothing there.</p>' +
        '<p>Three shapes where that matters:</p>' +
        '<ul>' +
        '<li><strong>A database or network call as the fallback.</strong> The extra query happens ' +
        'on the happy path, forever, and profiles as "the cache is not helping".</li>' +
        '<li><strong>A fallback with a side effect</strong> — inserting a default row, ' +
        'incrementing a counter. Now it fires when it should not have.</li>' +
        '<li><strong>A fallback that throws.</strong> It throws even when the value was ' +
        'present.</li>' +
        '</ul>' +
        '<p>Use <code>orElse</code> for a constant or an already-computed value; ' +
        '<code>orElseGet</code> for anything that has to be produced. And ' +
        '<code>orElseThrow(...)</code> when absence is genuinely an error — the no-argument ' +
        '<code>orElseThrow()</code> added in Java 10 is the better spelling of ' +
        '<code>get()</code>, because it says at the call site what it does.</p>',
    referenceLinks: [
        { title: 'Optional.orElseGet — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/Optional.html' }
    ],
    tags: ['optional', 'pitfalls'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: [
        {
            language: 'java',
            title: 'The fallback that always runs',
            code:
                'Optional<User> cached = Optional.of(new User("ana"));\n' +
                '\n' +
                'User a = cached.orElse(loadFromDatabase());     // query runs, result discarded\n' +
                'User b = cached.orElseGet(this::loadFromDatabase); // query does not run\n' +
                '\n' +
                'User loadFromDatabase() {\n' +
                '    System.out.println("SELECT ...");\n' +
                '    return new User("fallback");\n' +
                '}',
            output: {
                kind: 'trace',
                lines: ['SELECT ...'],
                explain:
                    '<p>Printed once, by the <code>orElse</code> line, even though the Optional ' +
                    'was present both times. In a request handler this is a duplicate query per ' +
                    'request that no profiler attributes to the line that caused it.</p>'
            }
        }
    ]
},

{
    id: 'optional-chaining-methods',
    importance: 'should-know',
    subsection: null,
    question: 'How do you use an Optional without calling isPresent and get?',
    answer:
        '<p><code>if (o.isPresent()) { o.get() }</code> is a null check with extra syntax — it ' +
        'gives you none of the benefit and all of the noise. The API has a method for each shape ' +
        'you actually want.</p>' +
        '<ul>' +
        '<li><code>map(f)</code> — transform the value if there is one.</li>' +
        '<li><code>flatMap(f)</code> — when <code>f</code> itself returns an ' +
        '<code>Optional</code>, so you do not end up nested.</li>' +
        '<li><code>filter(p)</code> — keep the value only if it satisfies a predicate; empty ' +
        'otherwise.</li>' +
        '<li><code>ifPresent(c)</code> and <code>ifPresentOrElse(c, r)</code> (Java 9) — for a ' +
        'side effect on one or both branches.</li>' +
        '<li><code>or(supplier)</code> (Java 9) — fall back to <em>another Optional</em> rather ' +
        'than to a value.</li>' +
        '<li><code>stream()</code> (Java 9) — zero or one element, which is what makes ' +
        '<code>.flatMap(Optional::stream)</code> the idiom for dropping the empties out of a ' +
        'stream of Optionals.</li>' +
        '<li><code>orElseThrow(Supplier)</code> — the terminal that turns absence into your own ' +
        'exception.</li>' +
        '</ul>' +
        '<p>The one legitimate <code>isPresent</code> is when the two branches do genuinely ' +
        'different things and neither is a value — and even then <code>ifPresentOrElse</code> ' +
        'usually reads better.</p>',
    referenceLinks: [
        { title: 'Optional — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/Optional.html' }
    ],
    tags: ['optional', 'idioms'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'lambda-vs-anonymous-class',
    importance: 'must-know',
    subsection: null,
    question: 'How is a lambda different from an anonymous inner class?',
    answer:
        '<p>They look interchangeable and are not. Four differences, and the first two get asked ' +
        'most.</p>' +
        '<p><strong>1. <code>this</code> means different things.</strong> Inside an anonymous ' +
        'class, <code>this</code> is the anonymous instance. Inside a lambda, <code>this</code> ' +
        'is the enclosing instance — a lambda introduces no new scope for ' +
        '<code>this</code>, <code>super</code> or local names. That is why you can call a private ' +
        'method of the enclosing class from a lambda without qualification, and why converting an ' +
        'anonymous class to a lambda can silently change what <code>this</code> refers to.</p>' +
        '<p><strong>2. They compile to different things.</strong> An anonymous class produces a ' +
        'real class file — <code>Outer$1.class</code> — and an object of it at every evaluation. ' +
        'A lambda compiles to an <code>invokedynamic</code> instruction whose bootstrap is ' +
        '<code>LambdaMetafactory</code>; the implementation lives in a private synthetic method ' +
        'and the JVM decides at first execution how to represent it. A non-capturing lambda is ' +
        'usually created once and reused, so the two are not equivalent in allocation either.</p>' +
        '<p><strong>3. A lambda cannot hold state.</strong> No fields, no instance initialiser, ' +
        'no constructor. An anonymous class can, which is occasionally the reason to keep one.</p>' +
        '<p><strong>4. Shadowing.</strong> An anonymous class may declare a variable with the ' +
        'same name as a local in the enclosing method. A lambda may not — it is a compile ' +
        'error, because the lambda body shares the enclosing scope.</p>' +
        '<p>And the obvious constraint: a lambda only works where a <strong>functional ' +
        'interface</strong> is expected. An abstract class with one abstract method still needs ' +
        'an anonymous class.</p>',
    referenceLinks: [
        { title: 'JLS §15.27 — Lambda Expressions', url: 'https://docs.oracle.com/javase/specs/jls/se21/html/jls-15.html' }
    ],
    tags: ['lambdas', 'jvm', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: [
        {
            language: 'java',
            title: 'The same code, two meanings of this',
            code:
                'public class Service {\n' +
                '    private final String name = "Service";\n' +
                '\n' +
                '    void run() {\n' +
                '        Runnable anon = new Runnable() {\n' +
                '            public void run() {\n' +
                '                System.out.println(this.getClass().getSimpleName());\n' +
                '            }\n' +
                '        };\n' +
                '        Runnable lambda = () ->\n' +
                '                System.out.println(this.getClass().getSimpleName());\n' +
                '\n' +
                '        anon.run();\n' +
                '        lambda.run();\n' +
                '    }\n' +
                '}',
            output: {
                kind: 'trace',
                lines: [
                    '(empty — the anonymous class has no simple name)',
                    'Service'
                ],
                explain:
                    '<p>The anonymous class\'s <code>this</code> is the anonymous instance, whose ' +
                    'simple name is the empty string. The lambda\'s <code>this</code> is the ' +
                    '<code>Service</code> instance. Converting one to the other is not always a ' +
                    'refactor with no behaviour change.</p>'
            }
        }
    ]
},

{
    id: 'effectively-final-capture',
    importance: 'must-know',
    subsection: null,
    question: 'Why must a variable used inside a lambda be final or effectively final?',
    answer:
        '<p>Because the lambda captures the <strong>value</strong>, not the variable. A local ' +
        'lives on the stack frame of the method that declared it, and the lambda can outlive that ' +
        'frame — it can be stored in a field, handed to an executor, or returned. So the value is ' +
        'copied in at creation.</p>' +
        '<p>If the original were then reassigned, the two would disagree, and there is no good ' +
        'answer to which one is correct. Java refuses the situation rather than pick. ' +
        '"Effectively final" means the compiler can see it is never reassigned, so no ' +
        '<code>final</code> keyword is required.</p>' +
        '<p>Two consequences people meet in practice:</p>' +
        '<ul>' +
        '<li><strong>A loop counter cannot be captured.</strong> The classic ' +
        '<code>for (int i = 0; ...)</code> variable is reassigned every iteration. Copy it to a ' +
        'local inside the loop body, or use the enhanced for loop, whose variable is fresh each ' +
        'time.</li>' +
        '<li><strong>Fields are not restricted at all.</strong> <code>this.counter++</code> ' +
        'inside a lambda compiles, because the capture is of <code>this</code>, which is not ' +
        'being reassigned. That is also why the restriction gives you no thread safety: it is a ' +
        'rule about variables, not about mutation.</li>' +
        '</ul>' +
        '<p>The one-element-array trick — <code>int[] count = {0}</code> and ' +
        '<code>count[0]++</code> — works because the array reference is effectively final while ' +
        'its contents are not. It compiles, it is not thread-safe, and it is usually a sign the ' +
        'code wanted <code>reduce</code> or a <code>Collector</code>.</p>',
    referenceLinks: [
        { title: 'JLS §4.12.4 — final Variables', url: 'https://docs.oracle.com/javase/specs/jls/se21/html/jls-4.html' }
    ],
    tags: ['lambdas', 'scoping', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'functional-interfaces-and-sam',
    importance: 'should-know',
    subsection: null,
    question: 'What makes an interface a functional interface, and what does @FunctionalInterface do?',
    answer:
        '<p>Exactly one <strong>abstract</strong> method. That is the whole rule, and the ' +
        'exceptions to what counts are what gets asked:</p>' +
        '<ul>' +
        '<li><code>default</code> and <code>static</code> methods do not count — they have ' +
        'bodies.</li>' +
        '<li><code>private</code> methods (Java 9) do not count.</li>' +
        '<li>Abstract methods that <strong>redeclare a public method of ' +
        '<code>Object</code></strong> do not count. This is why <code>Comparator</code> is a ' +
        'functional interface despite declaring both <code>compare</code> and ' +
        '<code>equals</code>.</li>' +
        '</ul>' +
        '<p><code>@FunctionalInterface</code> is optional and changes nothing at runtime. It ' +
        'makes the compiler check the rule, which turns "somebody added a second abstract method ' +
        'and broke every lambda that implemented this" from a cascade of errors at the call sites ' +
        'into one error at the declaration. Put it on interfaces you intend to be used as ' +
        'lambdas.</p>' +
        '<p>The <code>java.util.function</code> families worth knowing by shape rather than by ' +
        'name: <code>Function&lt;T,R&gt;</code> (one in, one out), <code>Supplier&lt;T&gt;</code> ' +
        '(none in, one out), <code>Consumer&lt;T&gt;</code> (one in, none out), ' +
        '<code>Predicate&lt;T&gt;</code> (one in, boolean out), <code>UnaryOperator&lt;T&gt;</code> ' +
        'and <code>BinaryOperator&lt;T&gt;</code> (same type in and out), and the ' +
        '<code>Bi-</code> and primitive specialisations of each.</p>',
    referenceLinks: [
        { title: 'java.util.function — package summary', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/function/package-summary.html' }
    ],
    tags: ['lambdas', 'functional-interfaces'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'method-reference-kinds',
    importance: 'should-know',
    subsection: null,
    question: 'What are the kinds of method reference, and when does String::length behave oddly?',
    answer:
        '<p>Four forms, and the confusion is always between the middle two.</p>' +
        '<ul>' +
        '<li><strong>Static</strong> — <code>Integer::parseInt</code>. Arguments map straight ' +
        'through.</li>' +
        '<li><strong>Bound instance</strong> — <code>System.out::println</code>, ' +
        '<code>this::handle</code>. The receiver is already chosen; the arguments are the ' +
        'method\'s arguments.</li>' +
        '<li><strong>Unbound instance</strong> — <code>String::length</code>. The receiver is not ' +
        'chosen. <strong>The first argument becomes the receiver</strong>, so this is a ' +
        '<code>Function&lt;String, Integer&gt;</code> even though <code>length()</code> takes no ' +
        'arguments. That shift is the odd part, and it is what makes ' +
        '<code>map(String::length)</code> work.</li>' +
        '<li><strong>Constructor</strong> — <code>ArrayList::new</code>, and ' +
        '<code>String[]::new</code> for arrays.</li>' +
        '</ul>' +
        '<p>The consequence of the second form worth knowing: a bound reference ' +
        '<strong>evaluates its receiver immediately</strong>, when the reference is created, not ' +
        'when it is called. <code>list::size</code> captures the current <code>list</code>; ' +
        'reassigning <code>list</code> afterwards does not change what the reference points at. ' +
        'And if the receiver is null, you get the <code>NullPointerException</code> at the point ' +
        'the reference is created, which is often nowhere near where it is used.</p>',
    referenceLinks: [
        { title: 'JLS §15.13 — Method Reference Expressions', url: 'https://docs.oracle.com/javase/specs/jls/se21/html/jls-15.html' }
    ],
    tags: ['lambdas', 'method-references'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'checked-exceptions-in-lambdas',
    importance: 'should-know',
    subsection: null,
    question: 'How do you call a method that throws a checked exception from inside a lambda?',
    answer:
        '<p>You cannot, directly, and the reason is structural: none of the interfaces in ' +
        '<code>java.util.function</code> declare <code>throws</code>, so a lambda implementing ' +
        'one may not throw a checked exception either.</p>' +
        '<p>Three honest options, in order of how often they are right.</p>' +
        '<p><strong>1. Catch inside the lambda</strong> and decide what the failure means there — ' +
        'skip the element, substitute a default, or wrap in an unchecked exception. Wrapping in ' +
        '<code>UncheckedIOException</code> is the standard move for I/O, and it is what the JDK ' +
        'itself does in <code>Files.lines</code>.</p>' +
        '<p><strong>2. Do not use a stream.</strong> A plain <code>for</code> loop can throw, and ' +
        'the enclosing method can declare it. If the failure genuinely has to propagate as a ' +
        'checked exception, the loop is the simpler code and pretending otherwise produces worse ' +
        'code, not better.</p>' +
        '<p><strong>3. Your own throwing interface.</strong> Declare ' +
        '<code>ThrowingFunction&lt;T, R, E extends Exception&gt;</code> and an adapter that wraps ' +
        'it. This is what the library helpers do. It works and it puts a layer of machinery ' +
        'between the reader and the code, so it earns its place only when the pattern repeats.</p>' +
        '<p>What to avoid: swallowing the exception in an empty catch block, and ' +
        '<code>sneakyThrows</code>. Both make a checked exception cross a boundary that says it ' +
        'cannot, and the second defeats the compiler rather than answering it.</p>',
    referenceLinks: [
        { title: 'UncheckedIOException — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/io/UncheckedIOException.html' }
    ],
    tags: ['lambdas', 'exceptions'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'comparator-chaining-and-reversed',
    importance: 'should-know',
    subsection: null,
    question: 'How do you sort by two fields, and what does reversed() actually reverse?',
    answer:
        '<p><code>Comparator.comparing(...).thenComparing(...)</code>, and the answer to the ' +
        'second half is the trap: <strong><code>reversed()</code> reverses the entire comparator ' +
        'built so far</strong>, not the last key you added.</p>' +
        '<p>So <code>comparing(Employee::dept).thenComparing(Employee::salary).reversed()</code> ' +
        'sorts by department descending <em>and</em> salary descending. If you wanted department ' +
        'ascending with salary descending, the reversal belongs on the one key:</p>' +
        '<p><code>comparing(Employee::dept).thenComparing(Employee::salary, ' +
        'Comparator.reverseOrder())</code></p>' +
        '<p>Three more things worth carrying into an interview:</p>' +
        '<ul>' +
        '<li><strong>Use <code>comparingInt</code>, <code>comparingLong</code>, ' +
        '<code>comparingDouble</code></strong> for primitive keys. The generic form boxes on ' +
        'every comparison.</li>' +
        '<li><strong>Nulls throw.</strong> <code>comparing</code> calls the key extractor and ' +
        'then <code>compareTo</code>; a null key is a <code>NullPointerException</code> in the ' +
        'middle of a sort. <code>Comparator.nullsFirst(...)</code> and <code>nullsLast(...)</code> ' +
        'wrap that.</li>' +
        '<li><strong><code>sorted()</code> is stable</strong>, so chaining two separate sorts ' +
        'works, but building one comparator is clearer and one pass instead of two.</li>' +
        '</ul>',
    referenceLinks: [
        { title: 'Comparator — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/Comparator.html' }
    ],
    tags: ['streams', 'comparators', 'pitfalls'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'partitioningby-vs-groupingby',
    importance: 'good-to-know',
    subsection: null,
    question: 'What does partitioningBy give you that groupingBy on a boolean does not?',
    answer:
        '<p><strong>Both keys, always.</strong> <code>partitioningBy</code> returns a ' +
        '<code>Map&lt;Boolean, List&lt;T&gt;&gt;</code> that is guaranteed to contain ' +
        '<code>true</code> and <code>false</code>, even when one side is empty. ' +
        '<code>groupingBy(x -&gt; predicate)</code> omits a key nothing matched, so ' +
        '<code>map.get(false)</code> returns null instead of an empty list — and the null shows ' +
        'up only on the input where nothing failed, which is exactly the input nobody tested ' +
        'with.</p>' +
        '<p>It is also faster: the implementation is a two-element structure rather than a hash ' +
        'map, and it takes a downstream collector like <code>groupingBy</code> does.</p>' +
        '<p>While on collectors, two others worth naming:</p>' +
        '<ul>' +
        '<li><code>joining(", ", "[", "]")</code> — separator, prefix and suffix in one call, ' +
        'over a single <code>StringBuilder</code>.</li>' +
        '<li><code>teeing(c1, c2, merger)</code> (Java 12) — runs two collectors over the same ' +
        'single pass and combines their results. The min and the max, or the count and the sum, ' +
        'without traversing twice.</li>' +
        '</ul>',
    referenceLinks: [
        { title: 'Collectors.partitioningBy — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/stream/Collectors.html' }
    ],
    tags: ['streams', 'collectors'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'infinite-streams-and-limit',
    importance: 'good-to-know',
    subsection: null,
    question: 'How do you build an infinite stream, and how do you stop it?',
    answer:
        '<p>Two generators, and they differ in whether order means anything.</p>' +
        '<ul>' +
        '<li><code>Stream.iterate(seed, f)</code> — ordered: each element is <code>f</code> of ' +
        'the last. Fibonacci, powers of two, a cursor walking a paginated API.</li>' +
        '<li><code>Stream.generate(supplier)</code> — unordered: the supplier is called with no ' +
        'input. Random values, constants, a queue poll.</li>' +
        '</ul>' +
        '<p>You stop them with a short-circuiting operation. <code>limit(n)</code> is the ' +
        'obvious one; <code>takeWhile(p)</code> (Java 9) stops at the first element that fails ' +
        'the predicate, which is what you want when the bound is a condition rather than a ' +
        'count. Note <code>takeWhile</code> is not <code>filter</code>: it stops, rather than ' +
        'skipping and continuing.</p>' +
        '<p>Java 9 also added the three-argument <code>Stream.iterate(seed, hasNext, next)</code>, ' +
        'which is a <code>for</code> loop written as a stream and is usually clearer than ' +
        '<code>iterate(...).takeWhile(...)</code>.</p>' +
        '<p>The trap: a stateful operation on an infinite stream never terminates. ' +
        '<code>Stream.iterate(1, i -&gt; i + 1).sorted()</code> hangs, because ' +
        '<code>sorted</code> has to see the end. So does <code>distinct()</code> on a stream ' +
        'that never repeats, and <code>count()</code>.</p>',
    referenceLinks: [
        { title: 'Stream.iterate — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/stream/Stream.html' }
    ],
    tags: ['streams', 'laziness'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'findfirst-vs-findany',
    importance: 'good-to-know',
    subsection: null,
    question: 'findFirst or findAny — does it matter?',
    answer:
        '<p>In a sequential stream, almost never: both return the first element that reaches ' +
        'them, and both return an <code>Optional</code> because the stream may be empty.</p>' +
        '<p>In a parallel stream it matters. <code>findFirst</code> on an ordered stream must ' +
        'return the element that is first in <em>encounter order</em>, which means waiting for ' +
        'the earlier partitions even if a later one found a match immediately. ' +
        '<code>findAny</code> is free to return whichever match appeared first in time, so it can ' +
        'short-circuit properly.</p>' +
        '<p>The same distinction runs through the API: <code>forEach</code> versus ' +
        '<code>forEachOrdered</code>, and <code>unordered()</code>, which tells the pipeline that ' +
        'encounter order is not meaningful and lets <code>distinct</code> and <code>limit</code> ' +
        'take cheaper paths.</p>' +
        '<p>The interview answer: <strong>say what you mean</strong>. Use <code>findAny</code> ' +
        'when any match will do, so a later reader knows the choice was deliberate and a later ' +
        '<code>parallel()</code> does not have to be reasoned about.</p>',
    referenceLinks: [
        { title: 'Stream.findAny — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/stream/Stream.html' }
    ],
    tags: ['streams', 'parallel'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'stream-gatherers',
    importance: 'good-to-know',
    subsection: null,
    question: 'What are stream gatherers, and what problem do they solve?',
    answer:
        '<p>An extension point for <strong>intermediate</strong> operations. ' +
        '<code>Collector</code> has always let you write your own terminal operation; there was ' +
        'no equivalent for the middle of a pipeline, so anything the JDK had not shipped — a ' +
        'sliding window, a running total, deduplicating on a key — meant leaving the stream and ' +
        'coming back.</p>' +
        '<p><code>Stream.gather(Gatherer)</code> fills that gap. It finished preview and became ' +
        'a permanent feature in <strong>Java 24</strong>, having previewed in 22 and 23.</p>' +
        '<p>The built-ins in <code>java.util.stream.Gatherers</code> cover the common shapes:</p>' +
        '<ul>' +
        '<li><code>windowFixed(n)</code> and <code>windowSliding(n)</code> — batch elements into ' +
        'lists, which is how you chunk a stream for a bulk insert.</li>' +
        '<li><code>fold</code> and <code>scan</code> — a reduction that emits its intermediate ' +
        'results, so a running total stays a stream.</li>' +
        '<li><code>mapConcurrent(n, fn)</code> — apply a function with bounded concurrency, on ' +
        '<strong>virtual threads</strong>, preserving order. This is the honest answer to "how do ' +
        'I make these calls in parallel" that a parallel stream was never the right tool ' +
        'for.</li>' +
        '</ul>' +
        '<p>Worth knowing rather than worth reaching for. In an interview it is a strong signal ' +
        'if it comes with the reason it exists — that the pipeline had an extension point at one ' +
        'end and not the other.</p>',
    referenceLinks: [
        { title: 'JEP 485: Stream Gatherers', url: 'https://openjdk.org/jeps/485' },
        { title: 'Gatherers — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/stream/Gatherers.html' }
    ],
    tags: ['streams', 'modern-java', 'versions'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'when-a-loop-beats-a-stream',
    importance: 'should-know',
    subsection: null,
    question: 'When is a plain for loop the better choice?',
    answer:
        '<p>More often than stream enthusiasm suggests, and being able to say so is usually what ' +
        'the question is testing. Four cases where the loop wins outright:</p>' +
        '<ul>' +
        '<li><strong>You need to break out early with state.</strong> A loop can ' +
        '<code>break</code>, <code>continue</code> and <code>return</code>. A stream can ' +
        'short-circuit, but not carry accumulated state out of the middle of one.</li>' +
        '<li><strong>A checked exception has to propagate.</strong> See above — the loop can ' +
        'throw and the enclosing method can declare it.</li>' +
        '<li><strong>The loop body is genuinely imperative.</strong> Reading two collections in ' +
        'step, mutating an existing structure, or doing something with an index. Forcing those ' +
        'into a stream produces a longer expression that says less.</li>' +
        '<li><strong>The hot path.</strong> A stream over a tiny collection allocates a pipeline ' +
        'per call; in a method invoked millions of times that is measurable. Measure rather than ' +
        'assume, but do not assume the other way either.</li>' +
        '</ul>' +
        '<p>Where the stream wins: a chain of transformations that reads as a description of the ' +
        'result rather than a recipe for producing it, and anything where a collector already ' +
        'expresses the aggregation you would otherwise hand-roll.</p>' +
        '<p>The answer that lands: <em>streams are for expressing what the result is; loops are ' +
        'for expressing what to do. Pick by which one the code is actually about.</em></p>',
    referenceLinks: [
        { title: 'java.util.stream — package summary', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/stream/package-summary.html' }
    ],
    tags: ['streams', 'judgement'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
}

    ]
};
