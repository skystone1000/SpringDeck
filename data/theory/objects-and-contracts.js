/* ==========================================================================
   data/theory/objects-and-contracts.js — module 3 in the reading path

   The contract every collection in the JDK silently assumes. HashMap depends
   on it, HashSet depends on it, distinct() depends on it, and Hibernate's
   handling of a Set of children depends on it — so this module has to come
   before all of them.
   ========================================================================== */

const objectsAndContractsModule = {
    id: 'objects-and-contracts',
    trackId: 'java-platform',
    order: 3,
    title: 'Objects, Types and the Object Contract',
    tagline: 'equals, hashCode, toString — the contract every collection assumes.',
    estimatedMinutes: 40,
    prerequisites: ['how-java-runs'],
    docHub: { title: 'java.lang.Object', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Object.html' },

    chapters: [
        {
            id: 'object-identity-vs-equality',
            title: 'Identity and Equality Are Different Questions',
            importance: 'must-know',
            summary: 'Two references to the same object, and two objects that represent the same thing, are unrelated facts — and Java gives you one operator for each.',
            interviewAngle: 'Almost never asked in these words, and underneath a third of the answers you will give. Every string-comparison trap, every "why did my HashSet contain a duplicate", and every entity-identity question in JPA reduces to whether you have kept these two ideas apart.',
            buildsOn: [],
            blocks: [
                {
                    type: 'prose',
                    html: '<p><code>==</code> on a reference asks <strong>are these the same object</strong>. <code>equals</code> asks <strong>do these two objects represent the same value</strong>. The default <code>equals</code> inherited from <code>Object</code> answers the first question, which is why a class that does not override it behaves as though every instance is unique — usually correctly, occasionally disastrously.</p>'
                },
                {
                    type: 'comparison',
                    title: 'The two questions',
                    left: 'Identity (==)',
                    right: 'Equality (.equals)',
                    rows: [
                        { aspect: 'Asks', left: 'Same object in memory?', right: 'Same value?' },
                        { aspect: 'Definable', left: 'Never — the language decides', right: 'By you, per class' },
                        { aspect: 'On primitives', left: 'Compares the value; the only option', right: 'Not applicable' },
                        { aspect: 'Default for a new class', left: '—', right: 'Falls back to identity' },
                        { aspect: 'Used by collections', left: 'Only by <code>IdentityHashMap</code>', right: 'By every other one' },
                        { aspect: 'Cheap?', left: 'One instruction', right: 'Whatever you wrote' }
                    ]
                },
                {
                    type: 'definition',
                    term: 'Reference equality',
                    html: '<p>What <code>==</code> asks of two references: whether they point at the same object. Distinct from <em>value equality</em>, which is whatever <code>equals</code> was written to mean. Java gives you one operator for the first and one method for the second, and confusing them is the root of most string- and boxing-comparison bugs.</p>'
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The same value, three ways',
                    code: 'String a = "spring";\nString b = "spring";\nString c = new String("spring");\nString d = "spr" + "ing";\n\nSystem.out.println(a == b);        // true  — both are the pooled literal\nSystem.out.println(a == c);        // false — new String allocates\nSystem.out.println(a == d);        // true  — folded to a constant at compile time\nSystem.out.println(a.equals(c));   // true  — same characters\n\nInteger x = 127, y = 127;\nInteger p = 128, q = 128;\nSystem.out.println(x == y);        // true  — the small-value cache\nSystem.out.println(p == q);        // false — outside it',
                    output: {
                        kind: 'trace',
                        lines: [
                            'a == b is true: both names refer to the one interned literal in the string pool.',
                            'a == c is false: new String() is a request for a distinct object, and the JVM honours it.',
                            'a == d is true: "spr" + "ing" is two compile-time constants, so javac folds it and interns the result.',
                            'x == y is true and p == q is false: Integer.valueOf caches -128..127, and autoboxing goes through it.'
                        ],
                        explain: '<p>The <code>Integer</code> pair is the classic trap, and the reason it is worth knowing is not the trivia — it is that <strong>every one of these lines returns <code>true</code> under <code>equals</code></strong>. Comparing boxed types or strings with <code>==</code> works often enough to survive testing and fails on the value that happens to be 128.</p>'
                    }
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Do not "fix" this by calling <code>intern()</code>.</strong> Interning to make <code>==</code> work is trading a correctness bug for a performance one: the string table is a fixed-size hash table, interning is not free, and the next reader has to know that this particular string is special. Use <code>equals</code>. If you need identity semantics deliberately — a cache keyed on object identity, a cycle detector — reach for <code>IdentityHashMap</code>, which says so in its name.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>When an interviewer writes <code>==</code> on a whiteboard and asks what it prints, they are not testing the string pool. They are testing whether you say <em>"depends whether those are the same object — and I would not write this, I would write <code>equals</code>"</em>. Get the answer right, then say what you would actually ship.</p>'
                }
            ],
            docs: [
                { title: 'Object.equals', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Object.html#equals(java.lang.Object)', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'java-language', questionId: 'string-pool-and-intern' },
                { topicId: 'collections', questionId: 'identityhashmap-and-weakhashmap' }
            ]
        },

        {
            id: 'equals-contract',
            title: 'The equals Contract',
            importance: 'must-know',
            summary: 'Five clauses, one of which is nearly impossible to satisfy while extending a class and adding a field — and that is the interesting one.',
            interviewAngle: 'Everyone can recite reflexive, symmetric, transitive. The question that separates candidates is "can a subclass that adds a field ever be equal to its parent?", because the honest answer is no, and knowing why tells the interviewer you have actually hit it.',
            buildsOn: ['object-identity-vs-equality'],
            blocks: [
                {
                    type: 'types',
                    title: 'The five clauses',
                    items: [
                        { name: 'Reflexive', html: '<p><code>x.equals(x)</code> is <code>true</code>. Hard to get wrong, easy to break with a <code>NaN</code> field — <code>Double.NaN != Double.NaN</code>, so a hand-written comparison on a <code>double</code> field breaks reflexivity. Use <code>Double.compare</code>.</p>' },
                        { name: 'Symmetric', html: '<p><code>x.equals(y)</code> implies <code>y.equals(x)</code>. This is the one that breaks, and the section below is about how.</p>' },
                        { name: 'Transitive', html: '<p><code>x.equals(y)</code> and <code>y.equals(z)</code> implies <code>x.equals(z)</code>. Breaks the same way symmetry does, one subclass further out.</p>' },
                        { name: 'Consistent', html: '<p>Repeated calls give the same answer as long as nothing used in the comparison changed. An <code>equals</code> that consults the network, the clock or a mutable field is not consistent.</p>' },
                        { name: 'Non-null', html: '<p><code>x.equals(null)</code> is <code>false</code>, never a <code>NullPointerException</code>. The <code>instanceof</code> check gives you this for free, since <code>null instanceof Anything</code> is <code>false</code>.</p>' }
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Symmetry broken by a subclass with one more field',
                    code: 'class Point {\n    final int x, y;\n    Point(int x, int y) { this.x = x; this.y = y; }\n\n    @Override public boolean equals(Object o) {\n        if (!(o instanceof Point p)) return false;\n        return x == p.x && y == p.y;\n    }\n}\n\nclass ColourPoint extends Point {\n    final String colour;\n    ColourPoint(int x, int y, String colour) { super(x, y); this.colour = colour; }\n\n    @Override public boolean equals(Object o) {\n        if (!(o instanceof ColourPoint c)) return false;\n        return super.equals(o) && colour.equals(c.colour);\n    }\n}\n\nPoint       p = new Point(1, 2);\nColourPoint c = new ColourPoint(1, 2, "red");\n\np.equals(c);   // true  — Point only looks at x and y\nc.equals(p);   // false — p is not a ColourPoint',
                    output: {
                        kind: 'trace',
                        lines: [
                            'p.equals(c) is true. Point.equals asks only whether o is a Point with the same x and y, and a ColourPoint is a Point.',
                            'c.equals(p) is false. ColourPoint.equals demands a ColourPoint, and p is not one.',
                            'The relation is now asymmetric, and a HashSet containing both will behave differently depending on insertion order.',
                            'Switching to getClass() != o.getClass() makes it symmetric — and makes a ColourPoint never equal to a Point, which breaks substitutability instead.'
                        ],
                        explain: '<p>There is no repair. Josh Bloch\'s formulation is the one to quote: <em>there is no way to extend an instantiable class and add a value component while preserving the <code>equals</code> contract</em>. You choose which half to break.</p>'
                    }
                },
                {
                    type: 'definition',
                    term: 'Value component',
                    html: '<p>A field that participates in <code>equals</code> — one whose value is part of what the object <em>is</em>, rather than incidental state such as a cache or a lock. Bloch\'s rule is stated in terms of it: you cannot extend an instantiable class, add a value component, and keep the contract.</p>'
                },
                {
                    type: 'comparison',
                    title: 'The two ways out, and what each costs',
                    left: 'instanceof',
                    right: 'getClass()',
                    rows: [
                        { aspect: 'Symmetric with a subclass?', left: 'No, if the subclass adds a field', right: 'Yes' },
                        { aspect: 'Liskov-substitutable?', left: 'Yes — a subclass can be equal to its parent', right: 'No — never equal across classes' },
                        { aspect: 'Works through a proxy', left: 'Yes', right: '<strong>No.</strong> Hibernate and Spring hand you a generated subclass, and <code>getClass()</code> sees that subclass' },
                        { aspect: 'What Bloch recommends', left: 'This, with the class made final', right: 'Only when the hierarchy is closed' },
                        { aspect: 'What records do', left: 'Equivalent — a record is implicitly final', right: '—' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong><code>getClass()</code> and a JPA entity do not mix.</strong> Hibernate hands you a proxy for a lazily loaded association — a runtime-generated subclass of your entity. <code>getClass()</code> on that proxy returns <code>Order$HibernateProxy$xY7</code>, not <code>Order</code>, so an entity whose <code>equals</code> uses <code>getClass()</code> reports that a lazily loaded order is not equal to the same order fetched eagerly. Use <code>instanceof</code>, and see the JPA track for why an entity\'s <code>equals</code> should key on a business identifier rather than the generated id.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The whole answer in three sentences: <em>"Reflexive, symmetric, transitive, consistent, and false for null. The clause that actually breaks is symmetry, when a subclass adds a value component — Bloch\'s rule is that you cannot preserve the contract and do that. So I make value classes final, or use a record, which is final for me."</em></p>'
                }
            ],
            docs: [
                { title: 'Object.equals — the contract, in the Javadoc', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Object.html#equals(java.lang.Object)', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'java-language', questionId: 'equals-hashcode-contract' },
                { topicId: 'java-language', questionId: 'equals-and-inheritance-symmetry' },
                { topicId: 'jpa-hibernate', questionId: 'entity-equals-hashcode' }
            ]
        },

        {
            id: 'hashcode-contract',
            title: 'The hashCode Contract',
            importance: 'must-know',
            summary: 'Two clauses, one of them one-directional — and the direction is what people get backwards.',
            interviewAngle: 'The follow-up to the equals question, every time. The specific thing being checked is whether you know that unequal objects are allowed to share a hash code, because a candidate who thinks they must differ does not understand what a hash table is.',
            buildsOn: ['equals-contract'],
            blocks: [
                {
                    type: 'types',
                    title: 'The contract',
                    items: [
                        { name: 'Consistent', html: '<p>Called twice on the same object during one execution, with nothing used in <code>equals</code> changed, it returns the same integer. It need not be the same across runs, and for most objects it is not.</p>' },
                        { name: 'Equal implies equal hash', html: '<p>If <code>x.equals(y)</code> then <code>x.hashCode() == y.hashCode()</code>. <strong>This is the clause that must never be violated.</strong> Breaking it puts two equal objects in different buckets, and the map contains a duplicate that <code>get</code> cannot find.</p>' },
                        { name: 'Unequal does NOT imply different hash', html: '<p>Two objects that are not equal <em>may</em> share a hash code. This is permitted, unavoidable — there are more possible objects than <code>int</code> values — and merely a performance concern. A <code>hashCode</code> returning a constant is <strong>correct</strong> and turns every map into a linked list.</p>' }
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>The asymmetry is the whole thing. <code>equals</code> is the source of truth and <code>hashCode</code> is an index into it: the hash tells the map <em>which bucket to look in</em>, and <code>equals</code> decides what is actually in there. Get the hash wrong in the permitted direction and the map is slow. Get it wrong in the forbidden direction and the map is wrong.</p>'
                },
                {
                    type: 'diagram',
                    diagramType: 'flowchart',
                    caption: 'Two lookups. The hash chooses the bucket; equals chooses the entry.',
                    diagramConfig: {
                        title: 'How a HashMap uses both methods',
                        nodes: [
                            { id: 'get', label: 'map.get(key)', kind: 'start' },
                            { id: 'hash', label: 'key.hashCode(), spread', kind: 'actor' },
                            { id: 'bucket', label: 'index = hash & (n - 1)', kind: 'step' },
                            { id: 'walk', label: 'Walk the bucket', kind: 'decision' },
                            { id: 'eq', label: 'equals on each candidate', kind: 'actor' },
                            { id: 'hit', label: 'Return the value', kind: 'fix' },
                            { id: 'miss', label: 'Return null', kind: 'trap' }
                        ],
                        edges: [
                            { from: 'get', to: 'hash' },
                            { from: 'hash', to: 'bucket' },
                            { from: 'bucket', to: 'walk' },
                            { from: 'walk', to: 'eq' },
                            { from: 'eq', to: 'hit', label: 'match' },
                            { from: 'eq', to: 'miss', label: 'no match' }
                        ]
                    }
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Two ways to write it, and when the second one costs',
                    code: '// Idiomatic. Reads well, allocates a varargs array and boxes\n// every primitive on every call.\n@Override public int hashCode() {\n    return Objects.hash(name, email, active);\n}\n\n// The same value, no allocation. Worth it only where a profiler\n// has told you this is hot — a key in a map read millions of times\n// per second, not a DTO.\n@Override public int hashCode() {\n    int result = name.hashCode();\n    result = 31 * result + email.hashCode();\n    result = 31 * result + Boolean.hashCode(active);\n    return result;\n}',
                    notes: '<p>31 is not magic and not arbitrary: it is odd, so multiplying loses no information to overflow the way an even factor would, and it is prime, which spreads patterned inputs. <code>31 * x</code> also compiles to a shift and a subtract. Any small odd prime works; 31 is the one every JDK class and every IDE generator uses, so use it and do not explain it.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Override one, override the other.</strong> Overriding <code>equals</code> alone leaves the identity-based <code>hashCode</code> in place, so two objects that are equal have different hash codes, and a <code>HashSet</code> cheerfully holds both. This is the single most common Java correctness bug that unit tests do not catch, because it only appears once the object is used as a key. Every IDE generates both together and every static analyser flags one without the other — let them.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>If you are asked "what if <code>hashCode</code> always returns 1", the answer is not "it breaks". It is: <em>"It is still correct — the contract only forbids equal objects having different hashes. Every entry lands in one bucket, so lookup degrades from O(1) to O(n), or O(log n) in a modern HashMap once the bucket treeifies."</em> That answer shows you know which clause is which.</p>'
                }
            ],
            docs: [
                { title: 'Object.hashCode', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Object.html#hashCode()', kind: 'api' },
                { title: 'Objects.hash', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Objects.html#hash(java.lang.Object...)', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'java-language', questionId: 'equals-hashcode-contract' },
                { topicId: 'collections', questionId: 'hashmap-internals' }
            ]
        },

        {
            id: 'why-both-together',
            title: 'What Breaks When They Disagree',
            importance: 'must-know',
            summary: 'A worked failure: the entry that is in the map, that the map cannot find, and that a second put will duplicate.',
            interviewAngle: 'The scenario question. "You put an object in a HashMap and later get null back for the same key — what happened?" There are exactly three good answers and they are all in this chapter.',
            buildsOn: ['equals-contract', 'hashcode-contract'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>Three distinct faults produce the same symptom — <code>containsKey</code> returns <code>false</code> for a key you are holding a reference to. Being able to name all three, and say which one you would check first, is a much stronger answer than getting one of them.</p>'
                },
                {
                    type: 'types',
                    title: 'The three causes, in the order worth checking',
                    items: [
                        { name: 'equals overridden, hashCode not', html: '<p>The two objects are equal and hash to different buckets. The map holds both; <code>get</code> looks in one bucket and finds nothing. Check this first — it is by far the most common.</p>' },
                        { name: 'A mutable field used in hashCode', html: '<p>The key was placed in the bucket its hash chose at insertion time. Mutating that field changes the hash but not the bucket, so the entry is now filed under an address nothing will ever look up. It is unreachable by <code>get</code>, unremovable by <code>remove</code>, and still counted by <code>size()</code>.</p>' },
                        { name: 'equals that is not symmetric', html: '<p>The subclass problem from two chapters back, arriving as a bug report. Whether the map finds the entry depends on which object is the argument and which is stored, which is to say on insertion order.</p>' }
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The entry that is in the map and cannot be found',
                    code: 'class Tag {\n    String name;                       // NOT final\n    Tag(String name) { this.name = name; }\n\n    @Override public boolean equals(Object o) {\n        return o instanceof Tag t && Objects.equals(name, t.name);\n    }\n    @Override public int hashCode() { return Objects.hashCode(name); }\n}\n\nMap<Tag, Integer> counts = new HashMap<>();\nTag tag = new Tag("java");\ncounts.put(tag, 1);\n\ntag.name = "spring";               // the key mutates while it is a key\n\ncounts.get(tag);                   // null\ncounts.containsKey(tag);           // false\ncounts.size();                     // 1\ncounts.keySet().iterator().next() == tag;   // true',
                    output: {
                        kind: 'trace',
                        lines: [
                            'put stores the entry in the bucket chosen by hashCode() of "java".',
                            'Assigning name = "spring" changes what hashCode() returns. Nothing moves the entry.',
                            'get computes the hash of "spring", looks in a different bucket, and finds nothing.',
                            'size() still reports 1, and iterating the key set yields the very object you just failed to look up.'
                        ],
                        explain: '<p>The last two lines are what makes this so confusing in production: the entry is demonstrably present and demonstrably unreachable at the same time. Nothing throws, nothing logs, and the map slowly fills with entries nobody can retrieve — a leak that looks like a logic error.</p>'
                    }
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A JPA entity with a generated id is a mutable key.</strong> A new entity has <code>id == null</code>; after <code>persist</code> and a flush it has an id. If <code>hashCode</code> reads the id, the object\'s hash changes while it is sitting in the <code>Set</code> of some parent\'s children — the exact failure above, with Hibernate rather than your code doing the mutation. This is why the standard advice for entity <code>hashCode</code> is a constant or a business key, never the generated id.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Say the rule as a property of the key rather than a rule about methods: <em>"Anything used in <code>equals</code> and <code>hashCode</code> has to be effectively immutable for as long as the object is a key in anything. That is really an argument for making value objects immutable outright, which is what I do."</em> That turns a trivia answer into a design position.</p>'
                }
            ],
            docs: [
                { title: 'HashMap — the class-level notes on mutable keys', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/HashMap.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'java-language', questionId: 'mutable-key-in-a-hashmap' },
                { topicId: 'collections', questionId: 'hashmap-internals' },
                { topicId: 'jpa-hibernate', questionId: 'entity-equals-hashcode' }
            ]
        },

        {
            id: 'immutability',
            title: 'Immutability, and What It Buys',
            importance: 'must-know',
            summary: 'Five rules that produce a class you can share between threads, use as a key, and cache without thinking.',
            interviewAngle: 'Asked directly as "how do you make a class immutable", and the recitation is worth little. What earns the mark is naming what it buys — thread safety without synchronisation, safe hash keys, safe caching — because that connects it to the concurrency round.',
            buildsOn: ['object-identity-vs-equality'],
            blocks: [
                {
                    type: 'types',
                    title: 'The recipe',
                    items: [
                        { name: 'No mutators', html: '<p>No setters, and no method that changes observable state. A method that returns a modified copy is fine and is the usual shape — <code>withX</code>, or a builder.</p>' },
                        { name: 'All fields private and final', html: '<p><code>final</code> is what gives the <em>safe-publication</em> guarantee: a thread that sees a reference to a correctly constructed object with final fields is guaranteed to see those fields initialised. Without <code>final</code> that is not guaranteed, even though it almost always appears to work.</p>' },
                        { name: 'The class cannot be extended', html: '<p><code>final</code> on the class, or a private constructor with a static factory. Otherwise a subclass adds mutable state and every guarantee above is void for anything holding the supertype.</p>' },
                        { name: 'Defensive copies in and out', html: '<p>A field that is itself mutable — an array, a <code>Date</code>, a <code>List</code> — must be copied on the way in and on the way out. See the next chapter; this is where most attempts fail.</p>' },
                        { name: 'Do not leak <code>this</code> during construction', html: '<p>Registering a listener, starting a thread or passing <code>this</code> to anything inside the constructor publishes a partially built object. Do it in a static factory after the constructor returns.</p>' }
                    ]
                },
                {
                    type: 'definition',
                    term: 'Safe publication',
                    important: true,
                    html: '<p>Making an object visible to another thread in a state that thread is guaranteed to see correctly. Writing a reference to a shared field is not enough on its own — the other thread may see the reference and stale field values. Final fields, <code>volatile</code>, a <code>synchronized</code> block and the concurrent collections all provide it; a plain assignment does not.</p>'
                },
                {
                    type: 'prose',
                    html: '<p>What it buys is the part worth saying out loud. An immutable object is <strong>thread-safe with no synchronisation at all</strong>, because there is no write for a read to race with. It is a <strong>safe hash key</strong> forever, which removes the entire failure mode of the previous chapter. It can be <strong>cached and shared freely</strong> — this is exactly why <code>String</code>, <code>Integer</code>, <code>LocalDate</code> and every value type in <code>java.time</code> are immutable, and why the string pool is possible at all.</p>'
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Records do most of this for you',
                    code: '// Immutable, final, with equals, hashCode and toString\n// generated component-wise. Roughly forty lines of boilerplate.\npublic record Money(BigDecimal amount, Currency currency) {\n\n    // A compact constructor is where validation and defensive\n    // copying go. It runs before the fields are assigned.\n    public Money {\n        Objects.requireNonNull(amount);\n        Objects.requireNonNull(currency);\n        if (amount.scale() > currency.getDefaultFractionDigits()) {\n            throw new IllegalArgumentException("too many decimal places");\n        }\n    }\n\n    public Money plus(Money other) {\n        if (!currency.equals(other.currency)) {\n            throw new IllegalArgumentException("currency mismatch");\n        }\n        return new Money(amount.add(other.amount), currency);\n    }\n}',
                    notes: '<p>A record is <strong>shallowly</strong> immutable, and that word does a lot of work. <code>record Order(List&lt;Item&gt; items)</code> hands out the caller\'s list and lets anyone mutate it. The compact constructor is where you fix that, with <code>items = List.copyOf(items)</code> — the next chapter is entirely about this.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>"Immutable" and "final" are not the same word.</strong> <code>final List&lt;String&gt; names</code> means the reference cannot be reassigned. It says nothing about the list, and <code>names.add("x")</code> compiles and works. Java has no deep-immutability keyword; you get there by construction, and by choosing <code>List.of</code> or <code>List.copyOf</code> over a mutable implementation.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Finish the recipe with the payoff and stop: <em>"...and what that buys is a class I can share across threads with no locking, use as a map key without worrying, and cache safely. Which is why every value type in <code>java.time</code> is built this way."</em> The recipe alone is a list; the recipe plus the payoff is a design argument.</p>'
                }
            ],
            docs: [
                { title: 'Record Classes', url: 'https://docs.oracle.com/en/java/javase/21/language/records.html', kind: 'guide' },
                { title: 'JLS 17.5 — final Field Semantics', url: 'https://docs.oracle.com/javase/specs/jls/se21/html/jls-17.html#jls-17.5', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'java-language', questionId: 'immutability-recipe' },
                { topicId: 'java-language', questionId: 'why-string-is-immutable' },
                { topicId: 'java-language', questionId: 'records-what-they-give-you' },
                { topicId: 'concurrency', questionId: 'safe-publication' }
            ]
        },

        {
            id: 'defensive-copies',
            title: 'Defensive Copies, In and Out',
            importance: 'should-know',
            summary: 'The step people skip, and the two halves of it — because copying on the way in and leaking on the way out is the same bug twice.',
            interviewAngle: 'Usually reached by follow-up rather than asked directly: "your record holds a List — is it immutable?" The correct answer is no, and the reason is worth two minutes.',
            buildsOn: ['immutability'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>An object is only as immutable as the things it holds. If a constructor stores the caller\'s list, the caller keeps a reference and can change your state afterwards. If a getter returns the internal list, every caller gets that power. Both halves have to be closed, and closing one is a common and completely ineffective half-measure.</p>'
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The leak, from both directions',
                    code: 'public final class Order {\n    private final List<Item> items;\n\n    // WRONG: stores the caller\'s list\n    public Order(List<Item> items) { this.items = items; }\n\n    // WRONG: hands the internal list to everyone\n    public List<Item> getItems() { return items; }\n}\n\nList<Item> mine = new ArrayList<>(List.of(a, b));\nOrder order = new Order(mine);\n\nmine.add(c);                 // mutates the order from outside\norder.getItems().clear();    // and so does this',
                    output: {
                        kind: 'trace',
                        lines: [
                            'The constructor copies the reference, not the list, so `mine` and `order.items` are the same object.',
                            'mine.add(c) changes what the order contains, with no method on Order involved.',
                            'getItems() hands the same object to any caller, so clear() empties the order.',
                            'The class is final and every field is final. Neither of those facts helps.'
                        ]
                    }
                },
                {
                    type: 'definition',
                    term: 'Defensive copy',
                    important: true,
                    html: '<p>A copy taken at a trust boundary so that neither side can change the other\'s state through a shared mutable object. Taken on the way <em>in</em> so a caller cannot alter your state after handing it over, and on the way <em>out</em> so a caller cannot alter it through what you returned. Both halves are needed; doing one is a common half-measure that protects nothing.</p>'
                },
                {
                    type: 'table',
                    title: 'What each option actually gives you',
                    headers: ['Expression', 'Copies?', 'Result is', 'Accepts null elements?'],
                    rows: [
                        ['<code>new ArrayList&lt;&gt;(src)</code>', 'Yes', 'A mutable copy', 'Yes'],
                        ['<code>List.copyOf(src)</code>', 'Yes', 'An unmodifiable copy', '<strong>No</strong> — throws'],
                        ['<code>Collections.unmodifiableList(src)</code>', '<strong>No</strong>', 'An unmodifiable <em>view</em>; changes to <code>src</code> show through', 'Yes'],
                        ['<code>List.of(a, b)</code>', '—', 'An unmodifiable list', '<strong>No</strong> — throws'],
                        ['<code>Arrays.asList(array)</code>', '<strong>No</strong>', 'A fixed-size view <em>backed by the array</em>', 'Yes'],
                        ['<code>src.stream().toList()</code>', 'Yes', 'An unmodifiable copy', 'Yes'],
                        ['<code>array.clone()</code>', 'Yes, shallowly', 'A new array of the same references', 'Yes']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong><code>Collections.unmodifiableList</code> is a view, not a copy.</strong> It refuses writes <em>through itself</em> and reflects every write to the underlying list. Returning one from a getter is genuinely useful — callers cannot modify it — but storing one in a constructor protects nothing at all, because the caller still holds the mutable original. In a constructor you want <code>List.copyOf</code>.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A copy is shallow.</strong> <code>List.copyOf(items)</code> gives you a new list holding the same <code>Item</code> objects. If <code>Item</code> is mutable, everything above was theatre. Immutability is a property of a whole object graph, which is the real argument for making the leaves immutable first — records all the way down, so no copy has to be deep.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Two lines that cover the whole subject: <em>"Copy on the way in with <code>List.copyOf</code> so the caller cannot change my state afterwards, and return something unmodifiable on the way out so callers cannot either. And it only works if the elements are immutable too — a copy is shallow."</em></p>'
                }
            ],
            docs: [
                { title: 'List.copyOf', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/List.html#copyOf(java.util.Collection)', kind: 'api' },
                { title: 'Unmodifiable Collections', url: 'https://docs.oracle.com/en/java/javase/21/core/creating-immutable-lists-sets-and-maps.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'java-language', questionId: 'defensive-copying' },
                { topicId: 'java-language', questionId: 'record-equals-and-mutable-components' },
                { topicId: 'collections', questionId: 'immutable-collections' }
            ]
        },

        {
            id: 'tostring-and-debugging',
            title: 'toString, and the Log Line You Will Read at 2 a.m.',
            importance: 'good-to-know',
            summary: 'The cheapest method on the class, the one most often left as the default, and one of the few places a Java class can leak personal data into a log aggregator.',
            interviewAngle: 'Rarely a question of its own. It appears inside better questions — "how do you debug this in production", "what do you never log" — and a candidate who mentions PII in a toString without being prompted is signalling real operational experience.',
            buildsOn: ['immutability'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>The inherited <code>toString</code> gives you <code>com.example.Order@4f023edb</code>: a class name and an identity hash, which tells you the type you already knew and a number you cannot correlate with anything. Every object that ever appears in a log line, an assertion failure or a debugger watch list deserves better, and it is four lines of work.</p>'
                },
                {
                    type: 'types',
                    title: 'What belongs in it',
                    items: [
                        { name: 'The identifying fields', html: '<p>Enough to find the object again: an id, an order number, a correlation id. This is the entire job.</p>' },
                        { name: 'The state that explains behaviour', html: '<p>Status, count, whether a flag is set. The fields you would ask about first when the log line surprises you.</p>' },
                        { name: 'Not everything', html: '<p>A <code>toString</code> that prints a lazily loaded JPA association triggers a query, or a <code>LazyInitializationException</code>, from inside a log statement. A <code>toString</code> that walks a bidirectional relationship recurses until the stack ends.</p>' },
                        { name: 'Never a secret', html: '<p>Passwords, tokens, card numbers, full names, email addresses, anything an auditor would call personal data. A log aggregator is a searchable, replicated, long-retention copy of whatever you put in it, and this is the most common way things arrive there.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Lombok\'s <code>@Data</code> on a JPA entity generates all three of these problems at once.</strong> Its <code>toString</code> includes every field, so it walks lazy associations; its <code>equals</code> and <code>hashCode</code> include the generated id, so the entity is a mutable key; and on a bidirectional relationship its <code>toString</code> recurses. Use <code>@Getter</code> and <code>@Setter</code>, or <code>@ToString(exclude = ...)</code>, and write <code>equals</code> by hand. This comes up in interviews as "what is wrong with <code>@Data</code> on an entity" and it is a genuinely good question.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The line that shows operational experience: <em>"I keep <code>toString</code> to the identifying fields and the state that explains behaviour — and deliberately out of it, anything personal, because logs are long-retention and searchable. On entities I also keep lazy associations out, or the log statement issues a query."</em></p>'
                }
            ],
            docs: [
                { title: 'Object.toString', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Object.html#toString()', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'java-language', questionId: 'tostring-and-logging' },
                { topicId: 'jpa-hibernate', questionId: 'lazy-initialization-exception' }
            ]
        }
    ]
};
