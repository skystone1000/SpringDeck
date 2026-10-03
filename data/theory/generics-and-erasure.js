/* ==========================================================================
   data/theory/generics-and-erasure.js — module 11 in the reading path

   Seven chapters. Erasure is the fact that explains every restriction, so it
   comes second and everything after it is a consequence rather than a rule to
   memorise.
   ========================================================================== */

const genericsAndErasureModule = {
    id: 'generics-and-erasure',
    trackId: 'java-platform',
    order: 11,
    title: 'Generics, Erasure and Variance',
    tagline: 'Why List<String> and List<Integer> are the same class at runtime.',
    estimatedMinutes: 40,
    prerequisites: ['inheritance-and-interfaces'],
    docHub: { title: 'Generics — the Java Tutorials', url: 'https://docs.oracle.com/javase/tutorial/java/generics/index.html' },

    chapters: [
        {
            id: 'why-generics',
            title: 'What Generics Are Actually For',
            importance: 'should-know',
            summary: 'Moving a class of failure from run time to compile time — and the cast you no longer write is the smaller half of the benefit.',
            interviewAngle: 'A gentle opener that sets up everything after it. The answer worth giving names the failure that generics removed, because every restriction in the rest of this module is a consequence of how cheaply Java chose to remove it.',
            buildsOn: [],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The bug generics were introduced to delete',
                    code: '// Java 1.4. Compiles cleanly.\nList names = new ArrayList();\nnames.add("Ada");\nnames.add(42);                       // nobody stops you\n\nfor (Object o : names) {\n    String s = (String) o;           // ClassCastException, at run time,\n    System.out.println(s.length());  // in production, far from the add()\n}\n\n// Java 5 onward. The second add does not compile.\nList<String> names2 = new ArrayList<>();\nnames2.add("Ada");\nnames2.add(42);                      // compile error',
                    output: {
                        kind: 'trace',
                        lines: [
                            'The 1.4 version compiles and runs until it reaches the 42, then throws ClassCastException.',
                            'The stack trace points at the cast, which is a symptom. The defect is the add(), possibly in a different class written by a different person.',
                            'The Java 5 version rejects the add at compile time, at the line that is actually wrong.',
                            'The erased bytecode of the second version is nearly identical to the first — the compiler inserts the same cast.'
                        ],
                        explain: '<p>The point is the <strong>distance</strong> between the defect and the symptom. Generics do not make the cast disappear; they make the compiler prove it will succeed, and they do it at the line that would otherwise be wrong.</p>'
                    }
                },
                {
                    type: 'definition',
                    term: 'Type parameter',
                    html: '<p>A placeholder for a type, declared in angle brackets on a class, interface or method — the <code>E</code> in <code>List&lt;E&gt;</code>. Distinct from a <em>type argument</em>, which is the concrete type supplied at the use site: the <code>String</code> in <code>List&lt;String&gt;</code>.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Frame it as moving a failure, not as removing a cast: <em>"They move a whole class of failure from run time to compile time, and — this is the part people skip — they move it to the line that is actually wrong. The cast being implicit is a readability bonus, not the point."</em></p>'
                }
            ],
            docs: [
                { title: 'Why Use Generics?', url: 'https://docs.oracle.com/javase/tutorial/java/generics/why.html', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'type-erasure',
            title: 'Type Erasure',
            importance: 'must-know',
            summary: 'The compiler checks the types, then throws them away. Every restriction in this module follows from that one sentence.',
            interviewAngle: 'The single most-asked generics question, and the one where a memorised answer is obvious. What distinguishes a real answer is deriving a restriction live — "so you cannot do new T(), because at run time there is no T" — rather than listing restrictions from memory.',
            buildsOn: ['why-generics'],
            blocks: [
                {
                    type: 'definition',
                    term: 'Type erasure',
                    important: true,
                    html: '<p>The compilation strategy Java uses for generics: type parameters are checked at compile time and then <strong>replaced by their bound</strong> — <code>Object</code> if unbounded — with casts inserted wherever the erased code needs them. <code>List&lt;String&gt;</code> and <code>List&lt;Integer&gt;</code> compile to the same class file and are the same <code>Class</code> object at run time.</p>'
                },
                {
                    type: 'prose',
                    html: '<p>The reason is compatibility, and it is worth stating because it makes the design defensible rather than merely regrettable. Java 5 had to introduce generics into an ecosystem where <code>List</code> already existed, was already implemented by thousands of classes, and already appeared in millions of compiled call sites. Erasure let generic and non-generic code interoperate in both directions on the <em>same</em> class file format — a Java 5 <code>List&lt;String&gt;</code> could be passed to a Java 1.4 library, and vice versa. C# made the other choice two years later and could afford to, because it changed its runtime to do it.</p>'
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'What the compiler produces',
                    code: '// What you write\nclass Box<T> {\n    private T value;\n    T get()          { return value; }\n    void set(T v)    { value = v; }\n}\n\nBox<String> box = new Box<>();\nbox.set("hello");\nString s = box.get();\n\n// What the class file effectively contains\nclass Box {\n    private Object value;\n    Object get()          { return value; }\n    void set(Object v)    { value = v; }\n}\n\nBox box = new Box();\nbox.set("hello");\nString s = (String) box.get();       // the compiler inserted this cast',
                    notes: '<p>The generic types survive in one place: the <code>Signature</code> attribute of the class file, which is metadata rather than instruction. That is why reflection can still tell you a field is declared <code>List&lt;String&gt;</code>, and why the super-type-token trick — subclassing a generic type so its argument is recorded in the class file — works at all. Jackson\'s <code>TypeReference</code> and Spring\'s <code>ParameterizedTypeReference</code> are both built on it.</p>'
                },
                {
                    type: 'types',
                    title: 'What follows directly, each derivable in one step',
                    items: [
                        { name: 'No new T()', html: '<p>There is no <code>T</code> at run time to construct. Pass a <code>Supplier&lt;T&gt;</code> or a <code>Class&lt;T&gt;</code> if you need one.</p>' },
                        { name: 'No new T[]', html: '<p>Arrays check their element type at run time and there is nothing to check against. See the last chapter.</p>' },
                        { name: 'No instanceof List&lt;String&gt;', html: '<p>At run time it is just a <code>List</code>. <code>instanceof List&lt;?&gt;</code> is allowed, because it asks nothing erasure removed.</p>' },
                        { name: 'No static field of type T', html: '<p>Statics belong to the one erased class shared by every parameterisation, so there is no single <code>T</code> for it to be.</p>' },
                        { name: 'No overload on the type argument', html: '<p><code>f(List&lt;String&gt;)</code> and <code>f(List&lt;Integer&gt;)</code> erase to the same signature and will not compile in the same class.</p>' },
                        { name: 'No generic Throwable', html: '<p><code>catch</code> matches on the runtime class, which erasure has flattened, so a generic exception type could not be dispatched correctly.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Erasure is not the same as "the type is gone".</strong> The type argument is absent from the <em>instructions</em> and present in the <code>Signature</code> <em>attribute</em>. Saying "the type information is completely erased" gets you a follow-up you will not enjoy, because the interviewer is thinking of <code>ParameterizedTypeReference</code>, which they use every week. Say the type is not available <strong>on an instance</strong> at run time, which is the accurate and useful form.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Answer, reason, then derive: <em>"The compiler checks the type arguments and then replaces them with their bound, inserting casts — so <code>List&lt;String&gt;</code> and <code>List&lt;Integer&gt;</code> are one class at run time. It was done that way for binary compatibility with pre-generic code. And it is why you cannot write <code>new T()</code> or test <code>instanceof List&lt;String&gt;</code> — there is no <code>T</code> left to construct or compare."</em></p>'
                }
            ],
            docs: [
                { title: 'Type Erasure', url: 'https://docs.oracle.com/javase/tutorial/java/generics/erasure.html', kind: 'guide' },
                { title: 'ParameterizedTypeReference', url: 'https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/core/ParameterizedTypeReference.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'java-language', questionId: 'type-erasure' },
                { topicId: 'java-language', questionId: 'reifiable-types-and-instanceof' }
            ]
        },

        {
            id: 'bounded-types',
            title: 'Bounded Type Parameters',
            importance: 'should-know',
            summary: 'A bound is what lets you call a method on T — and it also changes what T erases to, which is the part nobody mentions.',
            interviewAngle: 'Usually reached from "how would you write a generic method that finds the maximum". The answer requires a bound, and the recursive bound it requires is genuinely awkward to write on a whiteboard, which is what makes it a good question.',
            buildsOn: ['type-erasure'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>An unbounded <code>T</code> erases to <code>Object</code>, so the only methods you can call on it are <code>Object</code>\'s. A bound — <code>&lt;T extends Comparable&lt;T&gt;&gt;</code> — is a promise to the compiler that lets you call more, and it changes the erasure: <code>T</code> now erases to <code>Comparable</code> rather than <code>Object</code>.</p>'
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The recursive bound, and why it has to be that shape',
                    code: '// Does not compile: T is Object, and Object has no compareTo.\nstatic <T> T max(List<T> items) {\n    T best = items.get(0);\n    for (T item : items) if (item.compareTo(best) > 0) best = item;\n    return best;\n}\n\n// Compiles, and is too loose: a Comparable<String> could be\n// compared against a Comparable<Integer>.\nstatic <T extends Comparable> T max2(List<T> items) { ... }\n\n// The idiomatic form. "T is comparable TO ITSELF."\nstatic <T extends Comparable<T>> T max3(List<T> items) { ... }\n\n// What the JDK actually writes, and why:\n// LocalDate implements Comparable<ChronoLocalDate>, not\n// Comparable<LocalDate> — so max3 would reject it.\nstatic <T extends Comparable<? super T>> T max4(List<T> items) { ... }',
                    notes: '<p><code>&lt;T extends Comparable&lt;? super T&gt;&gt;</code> looks like ceremony and is not. Several JDK types implement <code>Comparable</code> of a <em>supertype</em> of themselves — <code>LocalDate</code> against <code>ChronoLocalDate</code>, and every enum against <code>Enum&lt;E&gt;</code> — and the tighter bound silently excludes them. It is also PECS applied to the bound itself, which is the connection worth making out loud.</p>'
                },
                {
                    type: 'types',
                    title: 'Two things about bounds worth knowing',
                    items: [
                        { name: 'Multiple bounds are allowed', html: '<p><code>&lt;T extends Number &amp; Comparable&lt;T&gt;&gt;</code>. At most one may be a class and it must come first; the rest are interfaces. <code>T</code> erases to the <strong>first</strong> bound, which is why ordering is not merely stylistic.</p>' },
                        { name: 'There is no lower bound on a type parameter', html: '<p><code>&lt;T super Foo&gt;</code> does not exist. <code>super</code> is a wildcard-only construct, and the next chapter is about why that asymmetry is the right one.</p>' }
                    ]
                }
            ],
            docs: [
                { title: 'Bounded Type Parameters', url: 'https://docs.oracle.com/javase/tutorial/java/generics/bounded.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'java-language', questionId: 'bounded-type-parameters' },
                { topicId: 'java-language', questionId: 'comparable-vs-comparator' }
            ]
        },

        {
            id: 'wildcards-and-pecs',
            title: 'Wildcards, Variance and PECS',
            importance: 'must-know',
            summary: 'Generics are invariant, which is correct and inconvenient. Wildcards are the opt-out, and PECS is the three-word rule for choosing one.',
            interviewAngle: 'The generics question with the highest ceiling. Reciting "producer extends, consumer super" is table stakes; explaining why a List<String> is not a List<Object> is the answer, because it shows you understand what invariance is protecting.',
            buildsOn: ['bounded-types'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Why invariance is not a limitation but a repair',
                    code: '// Suppose List<String> were a List<Object>, as arrays are.\nList<String> strings = new ArrayList<>();\nList<Object> objects = strings;      // does not compile, and here is why\nobjects.add(42);                     // would be legal — it IS a List<Object>\nString s = strings.get(0);           // ClassCastException, out of nowhere\n\n// Arrays DID make that choice, and it is checked at run time instead.\nObject[] array = new String[1];      // compiles: arrays are covariant\narray[0] = 42;                       // throws ArrayStoreException',
                    output: {
                        kind: 'trace',
                        lines: [
                            'The generic version is rejected by the compiler at the assignment, before anything can go wrong.',
                            'The array version compiles, because arrays are covariant — String[] IS an Object[].',
                            'The array stores its element type at run time, so array[0] = 42 throws ArrayStoreException.',
                            'Same unsoundness, two different places to discover it. Generics chose the compiler; arrays, which predate them, chose the JVM.'
                        ],
                        explain: '<p>This is the real answer to "why is <code>List&lt;String&gt;</code> not a <code>List&lt;Object&gt;</code>". It is not a limitation of erasure — it is the language declining to repeat the mistake it made with arrays, where the check has to happen at run time on every single store.</p>'
                    }
                },
                {
                    type: 'definition',
                    term: 'PECS',
                    important: true,
                    html: '<p><em>Producer Extends, Consumer Super.</em> If a parameter <strong>produces</strong> values you read out, use <code>? extends T</code>. If it <strong>consumes</strong> values you write in, use <code>? super T</code>. If it does both, use a plain <code>T</code> and accept the loss of flexibility.</p>'
                },
                {
                    type: 'table',
                    title: 'What each wildcard lets you do',
                    headers: ['Declaration', 'Read out as', 'Write in', 'Use when'],
                    rows: [
                        ['<code>List&lt;T&gt;</code>', '<code>T</code>', '<code>T</code>', 'The parameter is both read and written'],
                        ['<code>List&lt;? extends T&gt;</code>', '<code>T</code>', '<strong>nothing but <code>null</code></strong>', 'You only read — it is a producer'],
                        ['<code>List&lt;? super T&gt;</code>', '<code>Object</code> only', '<code>T</code> and its subtypes', 'You only write — it is a consumer'],
                        ['<code>List&lt;?&gt;</code>', '<code>Object</code> only', '<strong>nothing but <code>null</code></strong>', 'You do not care about the element type at all'],
                        ['<code>List</code> (raw)', '<code>Object</code>', 'anything', '<strong>Never.</strong> See the pitfall below']
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'PECS in the JDK signature everyone has read',
                    code: 'public static <T> void copy(List<? super T> dest, List<? extends T> src)\n\n// src PRODUCES the elements       -> ? extends T\n// dest CONSUMES them              -> ? super T\n\nList<Object> destination = new ArrayList<>();\nList<String> source      = List.of("a", "b");\ncopy(destination, source);           // legal, and it should be\n\n// Without the wildcards the signature would be copy(List<T>, List<T>),\n// and that call would not compile at all — despite being obviously safe.',
                    notes: '<p>The rule of thumb that keeps you out of trouble: <strong>wildcards belong on parameters, not on return types.</strong> A method returning <code>List&lt;? extends Foo&gt;</code> forces every caller to deal with a wildcard they did not ask for, and the flexibility buys them nothing.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong><code>List&lt;?&gt;</code> and raw <code>List</code> are not the same thing, and the difference is not stylistic.</strong> <code>List&lt;?&gt;</code> is fully type-checked — you simply cannot add anything but <code>null</code>, because the compiler does not know what the element type is. A raw <code>List</code> <em>opts out of generic checking entirely</em>, and it does so for <strong>every</strong> generic member of that class, not just the one you touched: call a method on a raw <code>ArrayList</code> and its generic return type is erased too, silently. Use <code>&lt;?&gt;</code> when you do not care about the element type; use raw types only when interoperating with genuinely pre-generic code.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Two sentences, in this order: <em>"Generics are invariant because covariance is unsound — arrays are covariant and pay for it with ArrayStoreException at run time on every store. Wildcards are the controlled opt-out, and PECS is how you pick: extends where the parameter produces values for me, super where it consumes values from me."</em></p>'
                }
            ],
            docs: [
                { title: 'Wildcards', url: 'https://docs.oracle.com/javase/tutorial/java/generics/wildcards.html', kind: 'guide' },
                { title: 'Collections.copy', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Collections.html#copy(java.util.List,java.util.List)', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'java-language', questionId: 'pecs-wildcards' },
                { topicId: 'java-language', questionId: 'arrays-covariant-generics-invariant' },
                { topicId: 'java-language', questionId: 'unbounded-wildcard-vs-raw-type' }
            ]
        },

        {
            id: 'generic-methods',
            title: 'Generic Methods, and When the Class Should Not Be Generic',
            importance: 'should-know',
            summary: 'A type parameter on a method is scoped to that call. A type parameter on a class is a property of every instance — and confusing the two produces a class parameterised on something it does not hold.',
            interviewAngle: 'Asked as "when would you make the method generic rather than the class". The answer is a scope answer, and the follow-up — how does a caller ever specify the type explicitly — catches people who have only ever relied on inference.',
            buildsOn: ['wildcards-and-pecs'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'Where the parameter belongs',
                    left: 'Generic class',
                    right: 'Generic method',
                    rows: [
                        { aspect: 'Declared on', left: 'The type: <code>class Box&lt;T&gt;</code>', right: 'The method: <code>static &lt;T&gt; T first(List&lt;T&gt;)</code>' },
                        { aspect: 'Scope', left: 'Every member of every instance', right: 'One invocation' },
                        { aspect: 'Fixed when', left: 'The instance is created', right: 'The call is made' },
                        { aspect: 'Use when', left: 'The type is <em>state</em> the object holds', right: 'The type only relates the arguments to the return' },
                        { aspect: 'A static method', left: 'Cannot use the class parameter', right: 'This is the reason generic methods exist' }
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Inference, and the syntax for when it fails',
                    code: 'static <K, V> Map<K, V> pairOf(K key, V value) {\n    return Map.of(key, value);\n}\n\nvar m = pairOf("id", 42);            // inferred Map<String, Integer>\n\n// Inference works from arguments and from the target type. When there\n// is neither — an empty collection assigned to nothing in particular —\n// you supply the witness explicitly. Note the receiver is required.\nList<String> empty = Collections.<String>emptyList();\nvar none = Collections.<String>emptyList();\n\n// A common real case: the target type is a wildcard, so inference\n// picks Object and the call does not compile without the witness.',
                    notes: '<p>The explicit form is <code>Receiver.&lt;Type&gt;method(args)</code> and the receiver cannot be omitted, even for a static method in the same class — <code>&lt;String&gt;emptyList()</code> is a syntax error, <code>this.&lt;String&gt;helper()</code> is not. It is rarely needed since Java 8 improved target typing, which is exactly why nobody remembers it.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A class parameterised on something it does not hold is a design smell.</strong> <code>class OrderValidator&lt;T&gt;</code> where <code>T</code> appears only in one method signature should be a plain class with a generic method. The test is direct: <em>does an instance of this class hold, or promise, a <code>T</code>?</em> If not, the parameter belongs on the method, and putting it on the class forces every caller to commit to a type at construction time for no reason.</p>'
                }
            ],
            docs: [
                { title: 'Generic Methods', url: 'https://docs.oracle.com/javase/tutorial/java/generics/methods.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'java-language', questionId: 'generic-method-vs-generic-class' }
            ]
        },

        {
            id: 'erasure-consequences',
            title: 'Bridge Methods, Heap Pollution and @SafeVarargs',
            importance: 'good-to-know',
            summary: 'Three things erasure leaves behind: a synthetic method you never wrote, a warning you should not blanket-suppress, and an annotation with oddly specific rules.',
            interviewAngle: 'Deep-dive territory. Not required, and a strong differentiator when the conversation has already gone into erasure — particularly bridge methods, because they explain a stack frame people have seen in a debugger and never accounted for.',
            buildsOn: ['type-erasure'],
            blocks: [
                {
                    type: 'definition',
                    term: 'Bridge method',
                    html: '<p>A synthetic method the compiler generates so that erasure does not break polymorphism. <code>class StringBox implements Box&lt;String&gt;</code> overriding <code>void set(String)</code> does not, after erasure, override <code>void set(Object)</code> — different signatures. The compiler adds a <code>set(Object)</code> that casts and delegates, so dynamic dispatch through the interface still reaches your method.</p>'
                },
                {
                    type: 'prose',
                    html: '<p>Bridge methods are invisible in source and visible in three places you will eventually look: a stack trace with the same method name twice, <code>Class.getMethods()</code> returning more than you wrote, and a debugger stepping into a frame with no line number. <code>Method.isBridge()</code> exists to filter them, and Spring\'s <code>BridgeMethodResolver</code> exists because annotation processing has to see through them to find the annotations you actually wrote.</p>'
                },
                {
                    type: 'definition',
                    term: 'Heap pollution',
                    html: '<p>A variable of a parameterised type referring to an object that is not of that parameterisation — a <code>List&lt;String&gt;</code> reference actually pointing at a list containing an <code>Integer</code>. Erasure makes this representable, so the compiler warns where it becomes possible rather than preventing it.</p>'
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Generic varargs, and the annotation that quiets it',
                    code: '// The compiler warns: "possible heap pollution from parameterized\n// vararg type T". It is right to — the parameter is really a T[],\n// and arrays are covariant.\nstatic <T> List<T> listOf(T... items) {\n    return List.of(items);\n}\n\n// @SafeVarargs asserts that this method does not write to the array\n// and does not let it escape. Both are true here.\n@SafeVarargs\nstatic <T> List<T> listOf2(T... items) {\n    return List.of(items);\n}\n\n// NOT safe: the array escapes and a caller can store into it.\n@SafeVarargs\nstatic <T> T[] leak(T... items) { return items; }',
                    notes: '<p><code>@SafeVarargs</code> is allowed only on methods that cannot be overridden — <code>static</code>, <code>final</code>, <code>private</code> (since Java 9) and constructors. The rule follows from what the annotation is: a promise about an implementation, and a subclass could override the method and break it. Two conditions make it true: <strong>do not store into the varargs array, and do not let it escape the method.</strong></p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong><code>@SuppressWarnings("unchecked")</code> on a whole method or class is a mistake worth naming in a code review.</strong> Put it on the narrowest possible declaration — usually a single local variable — and write a comment saying why the cast is safe. A method-level suppression silences the next unchecked cast somebody adds, and that one will not be safe.</p>'
                }
            ],
            docs: [
                { title: 'Non-Reifiable Types and Varargs', url: 'https://docs.oracle.com/javase/tutorial/java/generics/nonReifiableVarargsType.html', kind: 'guide' },
                { title: 'Method.isBridge', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/reflect/Method.html#isBridge()', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'java-language', questionId: 'heap-pollution-and-safevarargs' }
            ]
        },

        {
            id: 'reifiable-types-and-arrays',
            title: 'Why You Cannot Create a Generic Array',
            importance: 'should-know',
            summary: 'Arrays know their element type at run time and generics do not, so combining them would produce an unsound check — the language forbids the combination rather than the check.',
            interviewAngle: 'A precise question with a precise answer, and it is the one place the whole module comes together. It also has a practical half: every generic collection in the JDK does create an array internally, and knowing how they get away with it is the good part.',
            buildsOn: ['erasure-consequences', 'wildcards-and-pecs'],
            blocks: [
                {
                    type: 'definition',
                    term: 'Reifiable type',
                    html: '<p>A type whose full information is available at run time. <code>String</code>, <code>int[]</code>, <code>List</code> and <code>List&lt;?&gt;</code> are reifiable; <code>List&lt;String&gt;</code> and <code>T</code> are not. Arrays require a reifiable element type, because every array store is checked against it.</p>'
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'What the check would have to do, and cannot',
                    code: '// Illegal: generic array creation\nList<String>[] arrays = new List<String>[10];\n\n// If it were legal:\nObject[] objects = arrays;               // arrays are covariant\nobjects[0] = List.of(42);                // the store check asks:\n                                         //   "is this a List<String>?"\n                                         // and at run time it can only\n                                         //   ask "is this a List?" — yes.\nString s = arrays[0].get(0);             // ClassCastException, later,\n                                         // with nothing to point at\n\n// Legal, and how every collection in the JDK does it:\n@SuppressWarnings("unchecked")\nList<String>[] safe = (List<String>[]) new List<?>[10];',
                    output: {
                        kind: 'trace',
                        lines: [
                            'The array store check is a runtime check against the array\'s recorded element type.',
                            'Erasure means the recorded type could only ever be List, never List<String>.',
                            'So the check passes for a List of anything, and the unsoundness surfaces at an unrelated get() later.',
                            'Forbidding the creation puts the diagnosis at the array declaration instead, which is where a human can act on it.'
                        ],
                        explain: '<p><code>ArrayList</code> holds an <code>Object[]</code> and casts on the way out, exactly as the last line does. The unchecked cast is genuinely safe there because the array never escapes the class, so nothing outside can store the wrong thing into it — which is the same pair of conditions <code>@SafeVarargs</code> asserts.</p>'
                    }
                },
                {
                    type: 'tip',
                    html: '<p>In practice the answer is usually "use a <code>List</code>", and saying so is a strength rather than a dodge: <em>"I would use a <code>List&lt;List&lt;String&gt;&gt;</code>. If it has to be an array — a library boundary, or a measured hot path — I allocate <code>new List&lt;?&gt;[n]</code>, cast once with a narrow suppression, and keep the array private so it cannot be polluted from outside."</em></p>'
                }
            ],
            docs: [
                { title: 'Restrictions on Generics', url: 'https://docs.oracle.com/javase/tutorial/java/generics/restrictions.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'java-language', questionId: 'why-no-generic-arrays' },
                { topicId: 'java-language', questionId: 'arrays-covariant-generics-invariant' }
            ]
        }
    ]
};
