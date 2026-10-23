/* ==========================================================================
   data/collections.js — Collections Framework

   Thirty-two questions in three subsections. This is the topic interviewers
   use to find out whether a candidate has ever opened the source, because the
   surface answers ("a HashMap is O(1)") and the real answers ("amortised, over
   a good hash, until the bucket treeifies") are so far apart.

   ONE GLOBAL PER FILE.
   ========================================================================== */

const collectionsData = {
    id: 'collections',
    title: 'Collections Framework',
    subsections: [
        { id: 'lists-sets',  title: 'Lists & Sets' },
        { id: 'maps',        title: 'Maps & Hashing' },
        { id: 'concurrent',  title: 'Concurrent Collections' }
    ],
    keyTopics: [
        'HashMap internals', 'treeify threshold', 'ArrayList vs LinkedList',
        'TreeMap ordering', 'fail-fast iterators', 'ConcurrentHashMap',
        'CopyOnWriteArrayList', 'immutable collections'
    ],
    questions: [

/* ==== Lists & Sets ==================================================== */

{
    id: 'arraylist-vs-linkedlist',
    importance: 'must-know',
    subsection: 'lists-sets',
    question: 'ArrayList or LinkedList — when is LinkedList actually the right choice?',
    answer:
        '<p>Almost never, and being able to say why is the point of the question.</p>' +
        '<p>The textbook answer is that <code>LinkedList</code> has O(1) insertion and removal ' +
        'while <code>ArrayList</code> has O(n). That is true and largely irrelevant, because it ' +
        'is O(1) <em>only once you are holding the node</em>. Getting there is O(n), and the ' +
        'traversal is a chain of pointer chases across objects scattered through the heap — ' +
        'every one a potential cache miss. <code>ArrayList</code>\'s O(n) removal is a single ' +
        '<code>System.arraycopy</code> over contiguous memory, which modern hardware does ' +
        'extremely fast.</p>' +
        '<p>The overhead is also lopsided. An <code>ArrayList</code> holds one reference per ' +
        'element in one array. A <code>LinkedList</code> allocates a node per element, each with ' +
        'a header, a value reference and two link references — several times the memory, and ' +
        'far more work for the collector.</p>' +
        '<p>The honest cases for <code>LinkedList</code>: you are iterating and removing through ' +
        'the iterator, or you want a <code>Deque</code> with no capacity limit. For the second, ' +
        '<code>ArrayDeque</code> is faster anyway. <strong>Default to ' +
        '<code>ArrayList</code></strong>, and know that <code>ArrayList</code> grows by roughly ' +
        'half each time it fills, so sizing it up front matters when you know the size.</p>',
    referenceLinks: [
        { title: 'ArrayList — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/ArrayList.html' }
    ],
    tags: ['collections', 'lists', 'performance'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'fail-fast-iterators',
    importance: 'must-know',
    subsection: 'lists-sets',
    question: 'What is a fail-fast iterator, and why does removing during a for-each throw?',
    answer:
        '<p>A <code>for-each</code> loop over a collection is an <code>Iterator</code>. The ' +
        'collection keeps a <code>modCount</code> that increments on every structural change, ' +
        'the iterator records that value when it is created, and every ' +
        '<code>next()</code> compares the two. If they differ, it throws ' +
        '<code>ConcurrentModificationException</code>.</p>' +
        '<p>Two things about that name mislead people. It is not about concurrency — a single ' +
        'thread modifying while iterating triggers it just as reliably. And it is ' +
        '<strong>best-effort</strong>: the check is unsynchronised, so it detects the common ' +
        'case and guarantees nothing. Code must never depend on the exception being thrown.</p>' +
        '<p>The whole point is to fail immediately and loudly instead of continuing over an ' +
        'inconsistent structure and returning wrong answers later, somewhere unrelated.</p>' +
        '<p>The four ways out, in order of preference: <code>removeIf()</code>, which is one ' +
        'line and usually what you meant; <code>iterator.remove()</code>, which updates the ' +
        'iterator\'s expectation; collecting into a new list; and a concurrent collection, whose ' +
        'iterators are weakly consistent rather than fail-fast.</p>',
    referenceLinks: [
        { title: 'ConcurrentModificationException — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/ConcurrentModificationException.html' }
    ],
    tags: ['collections', 'iterators', 'fail-fast'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: [
        {
            language: 'java',
            title: 'And the one case that does not throw',
            code:
                'import java.util.*;\n' +
                '\n' +
                'public class FailFast {\n' +
                '    public static void main(String[] args) {\n' +
                '        List<String> list = new ArrayList<>(List.of("a", "b", "c"));\n' +
                '        try {\n' +
                '            for (String s : list) {\n' +
                '                if (s.equals("a")) list.remove(s);\n' +
                '            }\n' +
                '        } catch (ConcurrentModificationException e) {\n' +
                '            System.out.println("threw as expected");\n' +
                '        }\n' +
                '\n' +
                '        // Removing the second-to-last element does NOT throw: hasNext()\n' +
                '        // compares cursor to size, both become 2, and the loop just ends\n' +
                '        // early without ever calling next() again.\n' +
                '        List<String> two = new ArrayList<>(List.of("x", "y", "z"));\n' +
                '        for (String s : two) {\n' +
                '            if (s.equals("y")) two.remove(s);\n' +
                '        }\n' +
                '        System.out.println(two);\n' +
                '    }\n' +
                '}',
            output: {
                kind: 'stdout',
                lines: ['threw as expected', '[x, z]'],
                explain:
                    '<p>The second loop silently skipped the last element and exited without ' +
                    'an exception. This is the precise meaning of "best-effort": the check ' +
                    'happens in <code>next()</code>, and <code>hasNext()</code> returned false ' +
                    'before it got there. A test written around the first case would pass, and ' +
                    'the second case is the one that quietly drops data.</p>'
            }
        }
    ]
},

{
    id: 'immutable-collections',
    importance: 'must-know',
    subsection: 'lists-sets',
    question: 'What is the difference between List.of(), Arrays.asList() and Collections.unmodifiableList()?',
    answer:
        '<p>Three different kinds of "you cannot change this", and they differ in ways that ' +
        'produce real bugs.</p>' +
        '<ul>' +
        '<li><strong><code>List.of()</code></strong> — genuinely immutable. Every mutator throws ' +
        '<code>UnsupportedOperationException</code>, including <code>set()</code>. It ' +
        '<strong>rejects null elements</strong> with a <code>NullPointerException</code>, which ' +
        'catches bugs and occasionally is one. It may return a specialised, more compact ' +
        'implementation for small sizes.</li>' +
        '<li><strong><code>Arrays.asList()</code></strong> — a fixed-size <em>view of the ' +
        'array</em>. <code>add()</code> and <code>remove()</code> throw, but <code>set()</code> ' +
        'works and writes through to the array. Changing the array changes the list and vice ' +
        'versa. It permits nulls.</li>' +
        '<li><strong><code>Collections.unmodifiableList()</code></strong> — an unmodifiable ' +
        '<em>wrapper</em>, not a copy. Nobody can change it through the wrapper, and anybody ' +
        'holding the original list can change it under you. This is the one that looks safe and ' +
        'is not.</li>' +
        '</ul>' +
        '<p>For handing a collection out of a class, <code>List.copyOf()</code> is the right ' +
        'default: it copies, so there is no back door, and it skips the copy when the input is ' +
        'already an immutable list of the same kind.</p>' +
        '<p>One more trap: <code>Arrays.asList()</code> on an <code>int[]</code> gives you a ' +
        '<code>List&lt;int[]&gt;</code> of size one, because varargs cannot destructure an array ' +
        'of primitives. Boxing it or using <code>IntStream.of(...).boxed()</code> is the fix.</p>',
    referenceLinks: [
        { title: 'Unmodifiable Collections — Collections Framework Guide', url: 'https://docs.oracle.com/en/java/javase/25/core/creating-immutable-lists-sets-and-maps.html' }
    ],
    tags: ['collections', 'immutability', 'lists'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: [
        {
            language: 'java',
            title: 'Three lists that say no in three different ways',
            code:
                'import java.util.*;\n' +
                '\n' +
                'public class Unmodifiable {\n' +
                '    static String tryIt(Runnable action) {\n' +
                '        try { action.run(); return "allowed"; }\n' +
                '        catch (UnsupportedOperationException e) { return "refused"; }\n' +
                '    }\n' +
                '\n' +
                '    public static void main(String[] args) {\n' +
                '        String[] array = { "a", "b" };\n' +
                '        List<String> view = Arrays.asList(array);\n' +
                '        System.out.println(tryIt(() -> view.set(0, "z")));\n' +
                '        System.out.println(array[0]);        // written through to the array\n' +
                '\n' +
                '        System.out.println(tryIt(() -> List.of("a", "b").set(0, "z")));\n' +
                '\n' +
                '        List<String> backing = new ArrayList<>(List.of("a"));\n' +
                '        List<String> wrapper = Collections.unmodifiableList(backing);\n' +
                '        backing.add("added behind the wrapper");\n' +
                '        System.out.println(wrapper);\n' +
                '    }\n' +
                '}',
            output: {
                kind: 'stdout',
                lines: ['allowed', 'z', 'refused', '[a, added behind the wrapper]'],
                explain:
                    '<p>The unmodifiable wrapper grew by one element without anyone calling a ' +
                    'method on it. That is the whole difference between an unmodifiable view ' +
                    'and an immutable copy, and it is why a getter returning ' +
                    '<code>unmodifiableList(this.field)</code> is not as safe as it looks.</p>'
            }
        }
    ]
},

{
    id: 'set-implementations',
    importance: 'should-know',
    subsection: 'lists-sets',
    question: 'HashSet, LinkedHashSet or TreeSet — how do you choose?',
    answer:
        '<p>All three are <code>Set</code>. They differ in <strong>iteration order</strong> and ' +
        'in what they demand of the element type.</p>' +
        '<ul>' +
        '<li><strong><code>HashSet</code></strong> — no order guarantee at all. O(1) ' +
        'operations. It is a <code>HashMap</code> with a constant dummy value, quite ' +
        'literally.</li>' +
        '<li><strong><code>LinkedHashSet</code></strong> — insertion order, maintained by a ' +
        'doubly-linked list threaded through the entries. Slightly more memory, essentially the ' +
        'same speed. This is the right default whenever the output is going to be read by a ' +
        'human or compared in a test, because a stable order makes a diff meaningful.</li>' +
        '<li><strong><code>TreeSet</code></strong> — sorted order, O(log n), backed by a ' +
        'red-black tree. It needs the elements to be <code>Comparable</code> or a ' +
        '<code>Comparator</code> at construction, and it uses <code>compareTo</code> rather than ' +
        '<code>equals</code> to decide membership — which is where the ' +
        '"consistent with equals" rule bites. It also gives you the ' +
        '<code>NavigableSet</code> operations: <code>first</code>, <code>headSet</code>, ' +
        '<code>ceiling</code>, <code>subSet</code>.</li>' +
        '</ul>' +
        '<p>Choose <code>TreeSet</code> when you need ordering or range queries, ' +
        '<code>LinkedHashSet</code> when you need reproducibility, and <code>HashSet</code> ' +
        'otherwise. And note that a <code>HashSet</code>\'s iteration order is not random — it ' +
        'is stable for a given set of elements, which is exactly why relying on it accidentally ' +
        'works until the day it does not.</p>',
    referenceLinks: [
        { title: 'java.util.Set — javadoc', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Set.html' }
    ],
    tags: ['collections', 'sets', 'ordering'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'arraydeque-vs-stack',
    importance: 'should-know',
    subsection: 'lists-sets',
    question: 'Why should you not use Stack or Vector, and what replaces them?',
    answer:
        '<p><code>Vector</code> and its subclass <code>Stack</code> are from Java 1.0 and are ' +
        'synchronised on every method. That is the wrong granularity for almost every use: it ' +
        'costs a lock on every operation for a collection that is usually thread-confined, and ' +
        'it still does not make compound operations safe — a check-then-act across two calls ' +
        'races regardless.</p>' +
        '<p><code>Stack</code> has a second problem: it extends <code>Vector</code>, so it ' +
        'inherits the entire list API. You can index into a stack, insert into the middle of it, ' +
        'and iterate it — <em>bottom-up</em>, which is the opposite of pop order and has ' +
        'surprised many people.</p>' +
        '<p>Use <code>ArrayDeque</code> for both a stack and a queue. It is faster than ' +
        '<code>LinkedList</code> as a queue and faster than <code>Stack</code> as a stack, and ' +
        'its <code>Iterator</code> goes in pop order. It rejects <code>null</code>, which is a ' +
        'feature — <code>null</code> is the sentinel <code>poll()</code> returns for "empty".</p>' +
        '<p>When you genuinely need a thread-safe collection, use ' +
        '<code>ConcurrentLinkedDeque</code>, <code>LinkedBlockingQueue</code> or ' +
        '<code>ConcurrentHashMap</code>, which are designed for it, rather than a 1.0 class ' +
        'that locks everything.</p>',
    referenceLinks: [
        { title: 'ArrayDeque — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/ArrayDeque.html' }
    ],
    tags: ['collections', 'deque', 'legacy'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'list-remove-int-vs-object',
    importance: 'should-know',
    subsection: 'lists-sets',
    question: 'Why does list.remove(1) do something different from list.remove(Integer.valueOf(1))?',
    answer:
        '<p>Because <code>List</code> has two <code>remove</code> methods and they mean opposite ' +
        'things: <code>remove(int index)</code> removes by position, and ' +
        '<code>remove(Object o)</code> removes by value. Overload resolution prefers the exact ' +
        'primitive match, so <code>remove(1)</code> on a <code>List&lt;Integer&gt;</code> ' +
        'removes the element at index 1, not the element equal to 1.</p>' +
        '<p>This is the sharpest edge autoboxing left in the language, and it is an API design ' +
        'mistake preserved for compatibility. Overload resolution searches for an applicable ' +
        'method <em>without</em> boxing before it will consider boxing, so the index version ' +
        'always wins for an <code>int</code> literal.</p>' +
        '<p>The fix is to say which you meant: <code>remove(Integer.valueOf(1))</code> or a cast ' +
        'to <code>Object</code>. The general lesson is broader than this one method: an API that ' +
        'overloads on <code>int</code> and <code>Object</code> where both are plausible is an ' +
        'API that will be called wrongly, and the compiler will not help.</p>',
    referenceLinks: [
        { title: 'java.util.List — remove(int)', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/List.html#remove(int)' }
    ],
    tags: ['collections', 'autoboxing', 'overloading'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: [
        {
            language: 'java',
            title: 'Same argument, different meaning',
            code:
                'import java.util.*;\n' +
                '\n' +
                'public class RemoveTrap {\n' +
                '    public static void main(String[] args) {\n' +
                '        List<Integer> byIndex = new ArrayList<>(List.of(10, 20, 30));\n' +
                '        byIndex.remove(1);                    // remove(int index)\n' +
                '        System.out.println(byIndex);\n' +
                '\n' +
                '        List<Integer> byValue = new ArrayList<>(List.of(10, 20, 30));\n' +
                '        byValue.remove(Integer.valueOf(10));   // remove(Object o)\n' +
                '        System.out.println(byValue);\n' +
                '\n' +
                '        // And the one that throws rather than doing the wrong thing:\n' +
                '        List<Integer> small = new ArrayList<>(List.of(10));\n' +
                '        try {\n' +
                '            small.remove(10);\n' +
                '        } catch (IndexOutOfBoundsException e) {\n' +
                '            System.out.println("IndexOutOfBoundsException");\n' +
                '        }\n' +
                '    }\n' +
                '}',
            output: {
                kind: 'stdout',
                lines: ['[10, 30]', '[20, 30]', 'IndexOutOfBoundsException'],
                explain:
                    '<p>The third case is the lucky one: it throws instead of silently ' +
                    'removing the wrong element. On a longer list it would not have thrown, and ' +
                    'that is the version that reaches production.</p>'
            }
        }
    ]
},

{
    id: 'sequenced-collections',
    importance: 'good-to-know',
    subsection: 'lists-sets',
    question: 'What did sequenced collections add in Java 21?',
    answer:
        '<p>Three interfaces — <code>SequencedCollection</code>, <code>SequencedSet</code> and ' +
        '<code>SequencedMap</code> — retrofitted onto the existing types that have an encounter ' +
        'order, and a uniform vocabulary for the ends of them.</p>' +
        '<p>Before this, getting the first element of a <code>List</code> was ' +
        '<code>get(0)</code>, of a <code>SortedSet</code> was <code>first()</code>, and of a ' +
        '<code>LinkedHashSet</code> was <code>iterator().next()</code> — three spellings of one ' +
        'idea, and the last element was worse. Now all of them have ' +
        '<code>getFirst()</code>, <code>getLast()</code>, <code>addFirst()</code>, ' +
        '<code>addLast()</code>, <code>removeFirst()</code>, <code>removeLast()</code> and ' +
        '<code>reversed()</code>.</p>' +
        '<p><code>reversed()</code> returns a <em>view</em>, not a copy, so it is cheap and it ' +
        'writes through. That makes iterating backwards over a <code>LinkedHashMap</code> a ' +
        'one-liner where it used to require building a list first.</p>' +
        '<p>The interesting part is the compatibility work: <code>getFirst()</code> on an empty ' +
        'collection throws <code>NoSuchElementException</code> rather than returning null, and ' +
        'the immutable collections throw <code>UnsupportedOperationException</code> from the ' +
        'mutators as you would expect.</p>',
    referenceLinks: [
        { title: 'JEP 431: Sequenced Collections', url: 'https://openjdk.org/jeps/431' }
    ],
    tags: ['collections', 'modern-java', 'sequenced'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'sublist-is-a-view',
    importance: 'good-to-know',
    subsection: 'lists-sets',
    question: 'What is returned by subList(), and why can it throw later?',
    answer:
        '<p>A <strong>view</strong>, not a copy. It is backed by the original list, so changes ' +
        'go both ways: writing through the sublist changes the parent, and ' +
        '<code>subList(a, b).clear()</code> is the idiomatic way to remove a range.</p>' +
        '<p>The trap is that the view holds the parent\'s <code>modCount</code> the same way an ' +
        'iterator does. <strong>Any structural change to the parent through anything other than ' +
        'the sublist invalidates it</strong>, and the next call on the sublist throws ' +
        '<code>ConcurrentModificationException</code> — often far away from the line that ' +
        'actually broke it.</p>' +
        '<p>Two practical consequences. Returning a <code>subList()</code> from a method leaks a ' +
        'live view of your internal list; wrap it in <code>List.copyOf()</code>. And holding a ' +
        'small <code>subList()</code> of a huge list keeps the whole list reachable, which is a ' +
        'quiet way to retain a hundred megabytes to hold ten elements. The same is true of ' +
        '<code>Map.keySet()</code>, <code>values()</code> and <code>entrySet()</code>, which ' +
        'are all views for exactly the same reasons.</p>',
    referenceLinks: [
        { title: 'java.util.List — subList', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/List.html#subList(int,int)' }
    ],
    tags: ['collections', 'views', 'memory'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'iterating-and-modifying-safely',
    importance: 'good-to-know',
    subsection: 'lists-sets',
    question: 'What is the cleanest way to remove elements from a collection while iterating it?',
    answer:
        '<p><code>removeIf()</code>, in one line: ' +
        '<code>orders.removeIf(o -&gt; o.status() == CANCELLED)</code>. It is on ' +
        '<code>Collection</code>, so it works for lists, sets and the collection views of a map, ' +
        'and implementations override it — <code>ArrayList</code>\'s does one pass with a bit ' +
        'set and a single compaction rather than n shifts, so it is asymptotically better than ' +
        'a loop of <code>remove()</code>.</p>' +
        '<p>The alternatives, and when each is right:</p>' +
        '<ul>' +
        '<li><strong><code>iterator.remove()</code></strong> — when the decision needs state ' +
        'carried between elements, which a predicate cannot express cleanly.</li>' +
        '<li><strong>Collect into a new collection</strong> — when you need both halves, or ' +
        'when the source should not change at all. A stream <code>filter</code> and ' +
        '<code>toList()</code> is the readable form.</li>' +
        '<li><strong>Iterate a copy, modify the original</strong> — the blunt instrument. It ' +
        'works, it allocates, and it is fine for small collections.</li>' +
        '</ul>' +
        '<p>What never works is <code>collection.remove()</code> inside a <code>for-each</code>. ' +
        'What works only by accident is the same thing on the second-to-last element.</p>',
    referenceLinks: [
        { title: 'Collection.removeIf — javadoc', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Collection.html#removeIf(java.util.function.Predicate)' }
    ],
    tags: ['collections', 'iterators', 'removeIf'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

/* ==== Maps & Hashing ================================================== */

{
    id: 'hashmap-internals',
    importance: 'must-know',
    subsection: 'maps',
    question: 'How does HashMap work internally, and what happens on a collision?',
    answer:
        '<p>A <code>HashMap</code> is an array of buckets. <code>put()</code> takes the key\'s ' +
        '<code>hashCode()</code>, <strong>spreads</strong> it, reduces it to an index, and ' +
        'stores an entry there.</p>' +
        '<p>The spreading step is worth knowing because it is where the cleverness is. The ' +
        'index is <code>hash &amp; (capacity - 1)</code> — a bitmask, which is why the capacity ' +
        'is always a power of two, and much faster than a modulo. But a mask keeps only the low ' +
        'bits, so two hashes differing only in their high bits would always collide. So ' +
        '<code>HashMap</code> XORs the hash with itself shifted right sixteen: ' +
        '<code>h ^ (h &gt;&gt;&gt; 16)</code>. One cheap operation mixes the high bits down ' +
        'into the low ones.</p>' +
        '<p><strong>On a collision</strong> the entries form a linked list in that bucket, and ' +
        'lookup walks it comparing first the cached hash and then <code>equals()</code>. Since ' +
        'Java 8, once a bucket reaches <strong>eight</strong> entries and the table is at least ' +
        '64 buckets, that list is converted into a red-black tree, which turns a degenerate ' +
        'bucket from O(n) into O(log n). It untreeifies back to a list at six — the gap between ' +
        '8 and 6 is hysteresis, so a map hovering at the boundary does not convert back and ' +
        'forth on every operation.</p>' +
        '<p><strong>Resizing</strong> happens when size exceeds capacity times the load factor, ' +
        'default 0.75. Capacity doubles and everything is rehashed. Because capacity is a power ' +
        'of two, an entry either stays at its current index or moves to index plus old capacity ' +
        '— decided by one bit — so the split is cheap and preserves relative order within a ' +
        'bucket.</p>' +
        '<p>The load factor of 0.75 is a deliberate space-time trade: higher wastes less memory ' +
        'and collides more, lower is the reverse. It is very rarely worth changing.</p>',
    referenceLinks: [
        { title: 'HashMap — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/HashMap.html' }
    ],
    tags: ['collections', 'maps', 'hashing', 'internals'],
    images: [],
    hasDiagram: true,
    diagramType: 'flowchart',
    diagramConfig: {
        title: 'What HashMap.put does with a key',
        nodes: [
            { id: 'hash',    label: 'key.hashCode()',                   kind: 'start' },
            { id: 'spread',  label: 'spread: h ^ (h >>> 16)',           kind: 'step' },
            { id: 'index',   label: 'index = hash & (capacity - 1)',    kind: 'step' },
            { id: 'empty',   label: 'bucket empty: store the entry',    kind: 'step' },
            { id: 'chain',   label: 'collision: append to the list',    kind: 'step' },
            { id: 'tree',    label: '8 entries and table >= 64: treeify', kind: 'fix' },
            { id: 'resize',  label: 'size > capacity * 0.75: double and rehash', kind: 'step' }
        ],
        edges: [
            { from: 'hash',   to: 'spread' },
            { from: 'spread', to: 'index' },
            { from: 'index',  to: 'empty',  label: 'free' },
            { from: 'index',  to: 'chain',  label: 'taken' },
            { from: 'chain',  to: 'tree' },
            { from: 'empty',  to: 'resize' }
        ]
    },
    codeSnippets: []
},

{
    id: 'hashmap-vs-hashtable-vs-concurrenthashmap',
    importance: 'must-know',
    subsection: 'maps',
    question: 'HashMap, Hashtable or ConcurrentHashMap — and why is Hashtable never the answer?',
    answer:
        '<ul>' +
        '<li><strong><code>HashMap</code></strong> — not thread-safe, permits one null key and ' +
        'any number of null values. The default for single-threaded use, which is most use.</li>' +
        '<li><strong><code>Hashtable</code></strong> — a Java 1.0 class that synchronises every ' +
        'method on the whole object. It permits no nulls, and it has a parallel legacy API ' +
        '(<code>elements()</code>, <code>keys()</code>) predating the Collections Framework. ' +
        'There is no situation where it is the best available option.</li>' +
        '<li><strong><code>ConcurrentHashMap</code></strong> — thread-safe with fine-grained ' +
        'locking, permits no nulls, and adds the atomic compound operations that are the actual ' +
        'reason to use it.</li>' +
        '</ul>' +
        '<p>The nulls question has a good answer: <code>ConcurrentHashMap</code> forbids them ' +
        'because in a concurrent map <code>get()</code> returning null is ambiguous — absent, or ' +
        'present with a null value? — and there is no way to disambiguate it without a race, ' +
        'since the mapping can change between the <code>get()</code> and the ' +
        '<code>containsKey()</code>. <code>HashMap</code> allows nulls because a single thread ' +
        'can safely call both.</p>' +
        '<p><code>Collections.synchronizedMap()</code> is not a substitute either. It locks the ' +
        'whole map like <code>Hashtable</code>, and it does not make compound operations atomic ' +
        '— <code>if (!map.containsKey(k)) map.put(k, v)</code> is still a race, which is exactly ' +
        'what <code>putIfAbsent</code> on a <code>ConcurrentHashMap</code> exists to fix.</p>',
    referenceLinks: [
        { title: 'ConcurrentHashMap — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/ConcurrentHashMap.html' }
    ],
    tags: ['collections', 'maps', 'concurrency'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'treemap-and-navigable',
    importance: 'should-know',
    subsection: 'maps',
    question: 'When is TreeMap worth its O(log n), and what does NavigableMap give you?',
    answer:
        '<p><code>TreeMap</code> is a red-black tree: every operation is O(log n) rather than ' +
        'O(1), and in exchange the keys are kept sorted. You pay that cost for one of two ' +
        'reasons.</p>' +
        '<p><strong>Ordered iteration.</strong> Iterating a <code>TreeMap</code> yields keys in ' +
        'order, with no sort step and no intermediate list.</p>' +
        '<p><strong>Range queries</strong>, which are the part people forget and which a ' +
        '<code>HashMap</code> cannot do at all:</p>' +
        '<ul>' +
        '<li><code>floorKey(k)</code> and <code>ceilingKey(k)</code> — the greatest key at most ' +
        'k, and the least key at least k. This is how you implement a rate card, a tax band or ' +
        'a version-to-behaviour lookup in two lines.</li>' +
        '<li><code>headMap</code>, <code>tailMap</code>, <code>subMap</code> — live views over a ' +
        'range, so <code>subMap(from, to).clear()</code> deletes a range.</li>' +
        '<li><code>firstEntry</code>, <code>lastEntry</code>, <code>pollFirstEntry</code> — the ' +
        'basis of a simple priority structure or an expiry queue.</li>' +
        '<li><code>descendingMap()</code> — a reversed view, not a copy.</li>' +
        '</ul>' +
        '<p>The catch is the same one <code>TreeSet</code> has: membership is decided by ' +
        '<code>compareTo</code> or the supplied <code>Comparator</code>, never by ' +
        '<code>equals</code>. A comparator that returns zero for two keys you consider different ' +
        'makes them one key, silently.</p>',
    referenceLinks: [
        { title: 'NavigableMap — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/NavigableMap.html' }
    ],
    tags: ['collections', 'maps', 'ordering'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: [
        {
            language: 'java',
            title: 'A tax band lookup in two lines',
            code:
                'import java.util.*;\n' +
                '\n' +
                'public class Bands {\n' +
                '    public static void main(String[] args) {\n' +
                '        // Lower bound of each band -> rate.\n' +
                '        NavigableMap<Integer, Integer> bands = new TreeMap<>(Map.of(\n' +
                '                0, 0, 12_571, 20, 50_271, 40, 125_141, 45));\n' +
                '\n' +
                '        for (int income : new int[] { 10_000, 30_000, 60_000, 200_000 }) {\n' +
                '            System.out.println(income + " -> " + bands.floorEntry(income).getValue() + "%");\n' +
                '        }\n' +
                '\n' +
                '        System.out.println(bands.headMap(50_271).keySet());\n' +
                '    }\n' +
                '}',
            output: {
                kind: 'stdout',
                lines: [
                    '10000 -> 0%',
                    '30000 -> 20%',
                    '60000 -> 40%',
                    '200000 -> 45%',
                    '[0, 12571]'
                ],
                explain:
                    '<p><code>floorEntry</code> finds the greatest key not exceeding the ' +
                    'income, which is exactly the definition of a band. The equivalent with a ' +
                    '<code>HashMap</code> is a loop over every entry, and with a sorted list it ' +
                    'is a hand-written binary search.</p>'
            }
        }
    ]
},

{
    id: 'linkedhashmap-lru',
    importance: 'should-know',
    subsection: 'maps',
    question: 'How would you build an LRU cache out of the standard library?',
    answer:
        '<p><code>LinkedHashMap</code> has a constructor taking <code>accessOrder</code>. Set it ' +
        'true and the map moves an entry to the end of its internal linked list on every ' +
        '<code>get()</code> as well as every <code>put()</code>, so the head of the list is ' +
        'always the least recently used entry.</p>' +
        '<p>Then override <code>removeEldestEntry()</code>, a protected hook the map calls after ' +
        'every insertion. Return true and it evicts the head. That is the whole LRU cache — ' +
        'about five lines, no dependency, and it is what a great many "we wrote our own cache" ' +
        'codebases actually have underneath.</p>' +
        '<p>What to say about its limits, because that is the follow-up question: it is not ' +
        'thread-safe, so it needs external synchronisation or a wrapper; it has no TTL, only a ' +
        'size bound; and it has no statistics. Once you want any of those, use Caffeine or the ' +
        'Spring cache abstraction rather than growing this into a cache library.</p>' +
        '<p>Note that access-order mode makes <code>get()</code> a <em>structural</em> ' +
        'modification, so iterating a map while calling <code>get()</code> on it throws ' +
        '<code>ConcurrentModificationException</code> — from a method that looks like a pure ' +
        'read.</p>',
    referenceLinks: [
        { title: 'LinkedHashMap.removeEldestEntry — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/LinkedHashMap.html#removeEldestEntry(java.util.Map.Entry)' }
    ],
    tags: ['collections', 'maps', 'caching', 'lru'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: [
        {
            language: 'java',
            title: 'An LRU cache in five lines',
            code:
                'import java.util.*;\n' +
                '\n' +
                'public class Lru {\n' +
                '    static class LruCache<K, V> extends LinkedHashMap<K, V> {\n' +
                '        private final int capacity;\n' +
                '\n' +
                '        LruCache(int capacity) {\n' +
                '            super(16, 0.75f, true);        // true = access order\n' +
                '            this.capacity = capacity;\n' +
                '        }\n' +
                '\n' +
                '        @Override protected boolean removeEldestEntry(Map.Entry<K, V> eldest) {\n' +
                '            return size() > capacity;\n' +
                '        }\n' +
                '    }\n' +
                '\n' +
                '    public static void main(String[] args) {\n' +
                '        LruCache<String, Integer> cache = new LruCache<>(3);\n' +
                '        cache.put("a", 1); cache.put("b", 2); cache.put("c", 3);\n' +
                '\n' +
                '        cache.get("a");                     // "a" is now the most recent\n' +
                '        cache.put("d", 4);                  // evicts the eldest, which is "b"\n' +
                '\n' +
                '        System.out.println(cache.keySet());\n' +
                '    }\n' +
                '}',
            output: {
                kind: 'stdout',
                lines: ['[c, a, d]'],
                explain:
                    '<p>"b" was evicted even though "a" was inserted first, because the ' +
                    '<code>get("a")</code> moved it to the back. The iteration order is ' +
                    'least-recently-used first, which is why the head is what gets ' +
                    'evicted.</p>'
            }
        }
    ]
},

{
    id: 'compute-and-merge',
    importance: 'should-know',
    subsection: 'maps',
    question: 'What do computeIfAbsent, merge and putIfAbsent do that a get-then-put does not?',
    answer:
        '<p>They collapse a read and a write into one call, which does two things: it removes ' +
        'the boilerplate, and on a <code>ConcurrentHashMap</code> it makes the pair ' +
        '<strong>atomic</strong>. That second point is the one that matters — ' +
        '<code>if (map.get(k) == null) map.put(k, v)</code> is a check-then-act race no matter ' +
        'how the map is synchronised, because the gap between the two calls is real.</p>' +
        '<ul>' +
        '<li><strong><code>computeIfAbsent(k, fn)</code></strong> — the multimap idiom. ' +
        '<code>map.computeIfAbsent(key, k -&gt; new ArrayList&lt;&gt;()).add(item)</code> ' +
        'replaces four lines and never allocates a list it does not use.</li>' +
        '<li><strong><code>merge(k, v, fn)</code></strong> — the counter idiom. ' +
        '<code>map.merge(word, 1, Integer::sum)</code> inserts 1 or adds 1, with no special case ' +
        'for the first occurrence.</li>' +
        '<li><strong><code>putIfAbsent(k, v)</code></strong> — when the value is already in hand ' +
        'and cheap. Unlike <code>computeIfAbsent</code> it evaluates the value eagerly.</li>' +
        '<li><strong><code>getOrDefault(k, d)</code></strong> — a read that does not write. ' +
        'Note it does not insert the default, which is usually what you want and occasionally ' +
        'is not.</li>' +
        '</ul>' +
        '<p>One rule with real consequences: <strong>do not modify the map from inside a ' +
        '<code>computeIfAbsent</code> mapping function.</strong> On a <code>HashMap</code> it ' +
        'can corrupt the table; on a <code>ConcurrentHashMap</code>, recursively updating the ' +
        'same key deadlocks, because the bin is already locked. Returning <code>null</code> from ' +
        'the function is legal and means "do not insert anything".</p>',
    referenceLinks: [
        { title: 'Map.merge — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/Map.html#merge(K,V,java.util.function.BiFunction)' }
    ],
    tags: ['collections', 'maps', 'atomicity'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: [
        {
            language: 'java',
            title: 'A word count and a multimap, one line each',
            code:
                'import java.util.*;\n' +
                '\n' +
                'public class Compute {\n' +
                '    public static void main(String[] args) {\n' +
                '        String[] words = { "spring", "boot", "spring", "jpa", "spring" };\n' +
                '\n' +
                '        Map<String, Integer> counts = new TreeMap<>();\n' +
                '        for (String w : words) counts.merge(w, 1, Integer::sum);\n' +
                '        System.out.println(counts);\n' +
                '\n' +
                '        Map<Integer, List<String>> byLength = new TreeMap<>();\n' +
                '        for (String w : words) {\n' +
                '            byLength.computeIfAbsent(w.length(), k -> new ArrayList<>()).add(w);\n' +
                '        }\n' +
                '        System.out.println(byLength);\n' +
                '\n' +
                '        System.out.println(counts.getOrDefault("kafka", 0));\n' +
                '        System.out.println(counts.containsKey("kafka"));\n' +
                '    }\n' +
                '}',
            output: {
                kind: 'stdout',
                lines: [
                    '{boot=1, jpa=1, spring=3}',
                    '{3=[jpa], 4=[boot], 6=[spring, spring, spring]}',
                    '0',
                    'false'
                ],
                explain:
                    '<p><code>getOrDefault</code> returned zero without inserting anything, ' +
                    'which the following <code>containsKey</code> confirms. That distinction ' +
                    'matters when the map is later iterated.</p>'
            }
        }
    ]
},

{
    id: 'map-entry-views',
    importance: 'good-to-know',
    subsection: 'maps',
    question: 'What is the most efficient way to iterate a map, and why?',
    answer:
        '<p><code>for (Map.Entry&lt;K, V&gt; e : map.entrySet())</code>, or ' +
        '<code>map.forEach((k, v) -&gt; ...)</code>. Both give you the key and the value from ' +
        'one traversal.</p>' +
        '<p>The version to avoid is iterating <code>keySet()</code> and calling ' +
        '<code>get(key)</code> inside the loop. That is a second full hash lookup per entry — ' +
        'twice the work, and considerably worse on a <code>TreeMap</code> where each lookup is ' +
        'O(log n), turning an O(n) iteration into O(n log n).</p>' +
        '<p>All three of <code>keySet()</code>, <code>values()</code> and ' +
        '<code>entrySet()</code> are <strong>views</strong>, not copies. Removing from ' +
        '<code>keySet()</code> removes from the map. They are also usually the same objects on ' +
        'every call, so there is nothing to cache.</p>' +
        '<p>One sharp edge in the older code you will meet: <code>HashMap</code> reuses a single ' +
        'mutable <code>Map.Entry</code> object during iteration in some implementations, so ' +
        'collecting the entries into a list gives you n references to one entry holding the last ' +
        'value. Copy the key and value out rather than keeping the entry.</p>',
    referenceLinks: [
        { title: 'java.util.Map — entrySet', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Map.html#entrySet()' }
    ],
    tags: ['collections', 'maps', 'iteration'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'hash-collision-dos',
    importance: 'good-to-know',
    subsection: 'maps',
    question: 'Can a HashMap be attacked, and what did Java do about it?',
    answer:
        '<p>Yes, and this was a real vulnerability affecting most web frameworks around 2011. If ' +
        'an attacker can choose the keys — HTTP parameter names, JSON field names, header names ' +
        '— and can compute strings whose hashes collide, every key lands in one bucket. Lookup ' +
        'degrades from O(1) to O(n), and inserting n colliding keys costs O(n²). A single ' +
        'request with a few thousand crafted parameters could saturate a CPU core.</p>' +
        '<p>Java\'s answer was the <strong>treeification</strong> in Java 8: once a bucket ' +
        'reaches eight entries it becomes a red-black tree, so the worst case is O(log n) rather ' +
        'than O(n). That does not prevent the collisions, it bounds the damage — which is the ' +
        'right trade for a general-purpose map. It requires the keys to be ' +
        '<code>Comparable</code> to order the tree, and falls back to comparing class names and ' +
        'identity hashes when they are not.</p>' +
        '<p>What has <em>not</em> changed is that <code>String.hashCode()</code> is a published, ' +
        'unsalted algorithm, so collisions remain trivially computable. The defence at the ' +
        'application layer is to bound the input: limit the number of request parameters, header ' +
        'count and JSON document depth. Spring Boot and the servlet containers ship with such ' +
        'limits already set, which is worth knowing before raising one.</p>',
    referenceLinks: [
        { title: 'OWASP — Denial of Service Cheat Sheet', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html' }
    ],
    tags: ['collections', 'maps', 'hashing', 'security'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'identityhashmap-and-weakhashmap',
    importance: 'good-to-know',
    subsection: 'maps',
    question: 'What are IdentityHashMap and WeakHashMap for?',
    answer:
        '<p>Both are special-purpose maps that change one of the assumptions ' +
        '<code>HashMap</code> makes, and both appear in framework code far more often than in ' +
        'application code.</p>' +
        '<p><strong><code>IdentityHashMap</code></strong> compares keys with <code>==</code> ' +
        'instead of <code>equals()</code>, and uses <code>System.identityHashCode()</code>. It ' +
        'deliberately violates the <code>Map</code> contract, which is documented. Its use is ' +
        'graph traversal where you must track "have I visited this exact object", regardless of ' +
        'whether some other object is equal to it — serialisation, deep copying, cycle ' +
        'detection.</p>' +
        '<p><strong><code>WeakHashMap</code></strong> holds its <em>keys</em> weakly, so an ' +
        'entry disappears once nothing else references the key. It is for associating metadata ' +
        'with objects you do not own without preventing their collection — a cache keyed by ' +
        '<code>Class</code>, for instance.</p>' +
        '<p>The trap in <code>WeakHashMap</code> is worth stating: <strong>the values are held ' +
        'strongly</strong>. If a value references its own key, directly or through a chain, the ' +
        'entry never becomes collectable and the map leaks exactly as a <code>HashMap</code> ' +
        'would. This surprises people who reach for it as a leak fix. Entries also vanish ' +
        'without warning, so <code>size()</code> can change between two calls with no ' +
        'modification in between.</p>',
    referenceLinks: [
        { title: 'java.util.WeakHashMap — javadoc', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/WeakHashMap.html' }
    ],
    tags: ['collections', 'maps', 'weak-references', 'memory'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'enummap-and-enumset',
    importance: 'good-to-know',
    subsection: 'maps',
    question: 'Why use EnumMap and EnumSet rather than HashMap and HashSet?',
    answer:
        '<p>Because when the keys are enum constants the implementation can be dramatically ' +
        'simpler and faster, and the API can guarantee ordering for free.</p>' +
        '<p><code>EnumMap</code> is backed by a plain array indexed by <code>ordinal()</code>. ' +
        'There is no hashing, no collision handling and no resizing: lookup is an array access. ' +
        'Iteration is in enum declaration order, which is stable and meaningful, unlike a ' +
        '<code>HashMap</code>\'s.</p>' +
        '<p><code>EnumSet</code> is a <strong>bit vector</strong>. For an enum with 64 or fewer ' +
        'constants — which is nearly all of them — the entire set is one <code>long</code>. ' +
        'Membership is a bit test, union and intersection are bitwise operations, and the whole ' +
        'set fits in a register. It is not merely faster than <code>HashSet</code>; it is a ' +
        'different order of thing.</p>' +
        '<p><code>EnumSet</code> has no public constructor. You build one with ' +
        '<code>of</code>, <code>noneOf</code>, <code>allOf</code>, <code>range</code> or ' +
        '<code>complementOf</code>, and <code>complementOf</code> in particular expresses "every ' +
        'status except these" in a way a <code>HashSet</code> cannot.</p>' +
        '<p>Neither permits null, and both are worth reaching for automatically whenever the key ' +
        'type is an enum.</p>',
    referenceLinks: [
        { title: 'EnumSet — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/EnumSet.html' }
    ],
    tags: ['collections', 'enums', 'performance'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'initial-capacity-sizing',
    importance: 'good-to-know',
    subsection: 'maps',
    question: 'If you know a HashMap will hold 1000 entries, what capacity should you give it?',
    answer:
        '<p>Not 1000. With the default load factor of 0.75, a map constructed with capacity 1000 ' +
        'gets a table of 1024 and resizes once it passes 768 entries — so it rehashes ' +
        'everything on the way to 1000, which is the cost you were trying to avoid.</p>' +
        '<p>The arithmetic is <code>capacity = expected / loadFactor + 1</code>, so 1334, which ' +
        '<code>HashMap</code> rounds up to 2048. Getting this wrong in the safe direction costs ' +
        'memory; getting it wrong in the other direction costs a full rehash.</p>' +
        '<p>Since Java 19 there is a factory that does the arithmetic for you: ' +
        '<code>HashMap.newHashMap(1000)</code>, with matching methods on ' +
        '<code>LinkedHashMap</code> and <code>HashSet</code>. Prefer it — it says what you mean ' +
        'rather than encoding the load factor at the call site.</p>' +
        '<p>How much this matters: for a thousand entries, very little. For a map built inside a ' +
        'request handler that runs ten thousand times a second, or one holding millions of ' +
        'entries, the resizes are real — each one allocates a new table and rehashes every ' +
        'entry, and the old table becomes garbage.</p>',
    referenceLinks: [
        { title: 'HashMap.newHashMap — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/HashMap.html#newHashMap(int)' }
    ],
    tags: ['collections', 'maps', 'performance', 'sizing'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

/* ==== Concurrent Collections ========================================== */

{
    id: 'concurrenthashmap-internals',
    importance: 'must-know',
    subsection: 'concurrent',
    question: 'How does ConcurrentHashMap achieve thread safety without locking the whole map?',
    answer:
        '<p>By locking <strong>one bucket at a time</strong>, and by not locking reads at all.</p>' +
        '<p>Reads are lock-free. The table and the node values are <code>volatile</code>, so a ' +
        '<code>get()</code> is an ordinary traversal that sees a consistent, if possibly ' +
        'slightly stale, view. There is no lock to contend for, which is why read-heavy ' +
        'workloads scale almost linearly.</p>' +
        '<p>Writes synchronise on the <strong>first node of the bucket</strong> being written. ' +
        'Two threads writing to different buckets never contend; two writing to the same one ' +
        'briefly do. An insertion into an empty bucket does not lock at all — it uses a ' +
        'compare-and-swap, and retries if it loses.</p>' +
        '<p>It is worth knowing this changed in Java 8. The older implementation used ' +
        '<strong>segments</strong>: the map was divided into a fixed number of independently ' +
        'locked sub-maps, defaulting to sixteen, which capped write concurrency at sixteen ' +
        'threads regardless of size. The current design has no such cap and uses much less ' +
        'memory. Candidates who describe segments are describing a version that has not shipped ' +
        'for over a decade.</p>' +
        '<p>The consequences to state: <code>size()</code> is an estimate maintained by striped ' +
        'counters rather than an exact count under a lock; iterators are ' +
        '<strong>weakly consistent</strong> — they never throw ' +
        '<code>ConcurrentModificationException</code>, they reflect the map at some point ' +
        'during the traversal, and they may or may not show a concurrent modification; and ' +
        'aggregate operations like <code>forEach</code> are not atomic across the whole map.</p>',
    referenceLinks: [
        { title: 'ConcurrentHashMap — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/ConcurrentHashMap.html' }
    ],
    tags: ['collections', 'concurrency', 'maps', 'internals'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'atomic-compound-operations',
    importance: 'must-know',
    subsection: 'concurrent',
    question: 'Why is a synchronizedMap not enough for "put if absent"?',
    answer:
        '<p>Because <code>Collections.synchronizedMap()</code> makes each <em>method</em> atomic ' +
        'and says nothing about a <em>sequence</em> of them. The classic broken idiom is:</p>' +
        '<p><code>if (!map.containsKey(k)) map.put(k, expensiveToBuild());</code></p>' +
        '<p>Two threads can both pass the <code>containsKey</code> before either reaches the ' +
        '<code>put</code>. Both build the value, both write, and one write is lost. If the value ' +
        'is a connection, a thread pool or a file handle, the lost one leaks.</p>' +
        '<p>The fix is an operation the map performs atomically on your behalf: ' +
        '<code>putIfAbsent</code>, <code>computeIfAbsent</code>, <code>merge</code>, ' +
        '<code>replace(k, old, new)</code> or <code>remove(k, v)</code>. Those last two are ' +
        'compare-and-swap in map form, and are how you implement optimistic update without a ' +
        'lock.</p>' +
        '<p>The general principle is worth stating in the abstract, because it applies far ' +
        'beyond maps: <strong>thread-safe components do not compose into thread-safe ' +
        'operations.</strong> Every individual call being safe tells you nothing about an ' +
        'invariant that spans two of them. That is also why an <code>AtomicInteger</code> field ' +
        'inside a class does not make the class thread-safe.</p>' +
        '<p>If you genuinely need a multi-step invariant across a concurrent map, you need your ' +
        'own lock — and at that point the concurrent map is buying you nothing that a plain ' +
        'map under the same lock would not.</p>',
    referenceLinks: [
        { title: 'Map.putIfAbsent — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/Map.html#putIfAbsent(K,V)' }
    ],
    tags: ['collections', 'concurrency', 'atomicity', 'race-conditions'],
    images: [],
    hasDiagram: true,
    diagramType: 'sequence',
    diagramConfig: {
        title: 'Two threads racing a check-then-act on a synchronized map',
        actors: [
            { id: 'a',   label: 'Thread A' },
            { id: 'map', label: 'synchronizedMap' },
            { id: 'b',   label: 'Thread B' }
        ],
        messages: [
            { from: 'a',   to: 'map', label: 'containsKey(k)' },
            { from: 'map', to: 'a',   label: 'false', kind: 'return' },
            { from: 'b',   to: 'map', label: 'containsKey(k)' },
            { from: 'map', to: 'b',   label: 'false, still', kind: 'return' },
            { from: 'a',   to: 'map', label: 'put(k, valueA)' },
            { from: 'b',   to: 'map', label: 'put(k, valueB) overwrites' }
        ]
    },
    codeSnippets: []
},

{
    id: 'copyonwritearraylist',
    importance: 'should-know',
    subsection: 'concurrent',
    question: 'When is CopyOnWriteArrayList the right choice, and when is it a disaster?',
    answer:
        '<p>Every mutation copies the whole backing array. That single sentence predicts ' +
        'everything about it.</p>' +
        '<p><strong>Right</strong> when reads vastly outnumber writes and the list is small. The ' +
        'canonical case is a listener or observer registry: registered once at startup, read on ' +
        'every event. Reads take no lock at all and iterate a snapshot, so they are as fast as ' +
        'an <code>ArrayList</code> and never need synchronisation.</p>' +
        '<p><strong>A disaster</strong> when writes are frequent or the list is large. Adding n ' +
        'elements one at a time is O(n²) in copying, and each copy allocates a whole new array ' +
        '— so it is also n allocations of increasing size, which is unkind to the collector. A ' +
        'ten-thousand-element list under a steady write load will show up as a garbage ' +
        'collection problem long before it shows up as a lock problem.</p>' +
        '<p>The snapshot iterator has a consequence people trip over: it reflects the list as it ' +
        'was when the iterator was created, so an element added during iteration is not seen. It ' +
        'also means <code>iterator.remove()</code> throws ' +
        '<code>UnsupportedOperationException</code> — you cannot modify a snapshot.</p>' +
        '<p><code>CopyOnWriteArraySet</code> is the same structure with a set interface, and ' +
        'has the same profile.</p>',
    referenceLinks: [
        { title: 'CopyOnWriteArrayList — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/CopyOnWriteArrayList.html' }
    ],
    tags: ['collections', 'concurrency', 'copy-on-write'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'blocking-queues',
    importance: 'should-know',
    subsection: 'concurrent',
    question: 'Which BlockingQueue would you choose for a producer-consumer, and why does the choice matter?',
    answer:
        '<p>The choice is really a choice about <strong>what happens when the consumer falls ' +
        'behind</strong>, and that is a system design decision rather than a data structure ' +
        'one.</p>' +
        '<ul>' +
        '<li><strong><code>ArrayBlockingQueue</code></strong> — bounded, one lock, backed by a ' +
        'fixed array. The bound is the point: producers block when it fills, which pushes ' +
        'back-pressure up the chain instead of accumulating work in memory.</li>' +
        '<li><strong><code>LinkedBlockingQueue</code></strong> — optionally bounded, separate ' +
        'locks for head and tail so producers and consumers contend less. ' +
        '<strong>Unbounded by default, which is a trap</strong>: an unbounded queue converts a ' +
        'throughput problem into an <code>OutOfMemoryError</code>, and it does so slowly enough ' +
        'that nothing alerts until the heap is gone.</li>' +
        '<li><strong><code>SynchronousQueue</code></strong> — zero capacity. Every handoff is ' +
        'direct: a producer blocks until a consumer takes the item. This is what ' +
        '<code>newCachedThreadPool</code> uses, which is why that pool creates a thread per ' +
        'task when all threads are busy.</li>' +
        '<li><strong><code>PriorityBlockingQueue</code></strong> — ordered by comparator, ' +
        'unbounded. Fine when order matters and the input rate is bounded elsewhere.</li>' +
        '<li><strong><code>DelayQueue</code></strong> — elements become available only when ' +
        'their delay expires. A scheduled-retry queue, essentially.</li>' +
        '</ul>' +
        '<p><strong>Bound the queue.</strong> That is the answer to give: an unbounded queue in ' +
        'front of a slow consumer is not a buffer, it is a memory leak with a schedule. What to ' +
        'do when it is full — block, drop, or reject — is then an explicit decision rather than ' +
        'one made for you by the heap.</p>',
    referenceLinks: [
        { title: 'BlockingQueue — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/BlockingQueue.html' }
    ],
    tags: ['collections', 'concurrency', 'queues', 'back-pressure'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'weakly-consistent-iterators',
    importance: 'should-know',
    subsection: 'concurrent',
    question: 'What does "weakly consistent" mean for an iterator?',
    answer:
        '<p>It is the guarantee the concurrent collections give in place of fail-fast, and it is ' +
        'deliberately weak in specific, documented ways:</p>' +
        '<ul>' +
        '<li>It <strong>never throws <code>ConcurrentModificationException</code></strong>.</li>' +
        '<li>It reflects the collection\'s state at some point <em>at or since</em> the creation ' +
        'of the iterator — not necessarily one single instant.</li>' +
        '<li>It traverses each element <strong>exactly once</strong>, which is the guarantee ' +
        'that makes it usable at all.</li>' +
        '<li>It <em>may</em> reflect modifications made after it was created. It may not. Both ' +
        'are correct.</li>' +
        '</ul>' +
        '<p>Contrast with the two neighbours. A <strong>fail-fast</strong> iterator (the ' +
        '<code>java.util</code> collections) tries to detect concurrent modification and throw. ' +
        'A <strong>snapshot</strong> iterator (<code>CopyOnWriteArrayList</code>) sees a frozen ' +
        'copy and never sees later changes at all.</p>' +
        '<p>The practical consequence: you can safely iterate a <code>ConcurrentHashMap</code> ' +
        'while other threads write to it, and you must not treat the result as a consistent ' +
        'snapshot. Summing values during concurrent updates gives a number that was never ' +
        'necessarily true of the map at any instant — which is fine for a metric and wrong for ' +
        'a balance.</p>',
    referenceLinks: [
        { title: 'java.util.concurrent — package summary', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/package-summary.html' }
    ],
    tags: ['collections', 'concurrency', 'iterators'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'concurrent-map-vs-cache',
    importance: 'good-to-know',
    subsection: 'concurrent',
    question: 'Why is a ConcurrentHashMap not a cache?',
    answer:
        '<p>Because a map has no eviction policy, and a cache is mostly eviction policy.</p>' +
        '<p>A <code>ConcurrentHashMap</code> used as a cache grows without limit. It has no size ' +
        'bound, no time-to-live, no refresh-after-write, no notion of which entries are worth ' +
        'keeping, and no statistics to tell you whether it is helping. In a long-running service ' +
        'that means it is a memory leak with a hit rate — and the failure arrives as an ' +
        '<code>OutOfMemoryError</code> at 3am rather than as a slow query.</p>' +
        '<p>It also has no protection against a <strong>cache stampede</strong>. Ten threads ' +
        'missing on the same cold key all compute the value. <code>computeIfAbsent</code> ' +
        'actually does prevent this for one key, because the bin is locked for the duration — ' +
        'which is a genuine reason to prefer it, and also a reason a slow mapping function is ' +
        'dangerous, since it holds that lock the whole time.</p>' +
        '<p>Use Caffeine, or the Spring <code>@Cacheable</code> abstraction over it, when you ' +
        'want a cache. The map is right for a <em>memoisation table with a bounded key space</em> ' +
        '— per-class reflection metadata, compiled patterns, parsed configuration — where every ' +
        'possible key is known and finite.</p>',
    referenceLinks: [
        { title: 'Spring Framework — Cache Abstraction', url: 'https://docs.spring.io/spring-framework/reference/integration/cache.html' }
    ],
    tags: ['collections', 'caching', 'memory'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'collections-and-parallel-streams',
    importance: 'good-to-know',
    subsection: 'concurrent',
    question: 'Is it safe to collect into a shared collection from a parallel stream?',
    answer:
        '<p>Not by hand, and the reason is instructive. <code>forEach</code> on a parallel stream ' +
        'runs on many threads, so <code>parallelStream().forEach(list::add)</code> against an ' +
        '<code>ArrayList</code> is an unsynchronised concurrent modification: lost elements, ' +
        'nulls in the middle, or an <code>ArrayIndexOutOfBoundsException</code> from inside the ' +
        'growth code. It usually works in a unit test and fails under load, which is the worst ' +
        'available behaviour.</p> ' +
        '<p><code>collect()</code> is safe, and not because it synchronises. The collector\'s ' +
        'supplier is called <em>once per thread</em>, each accumulating into its own container, ' +
        'and the combiner merges them at the end. There is no shared mutable state to protect, ' +
        'so there is no lock and no contention — which is also why a collector must supply a ' +
        'working combiner to be usable in parallel.</p>' +
        '<p><code>Collectors.toConcurrentMap()</code> and ' +
        '<code>groupingByConcurrent()</code> take the other route: one shared concurrent ' +
        'container, no merge step. They are faster for large parallel streams, and they abandon ' +
        'encounter order, which the ordinary collectors preserve.</p>' +
        '<p>The general rule: <strong>let the collector own the mutation.</strong> If you find ' +
        'yourself calling <code>forEach</code> with a side effect on a parallel stream, the ' +
        'operation wanted to be a <code>collect</code> or a <code>reduce</code>.</p>',
    referenceLinks: [
        { title: 'java.util.stream — package summary', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/stream/package-summary.html' }
    ],
    tags: ['collections', 'streams', 'concurrency'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
}

    ]
};
