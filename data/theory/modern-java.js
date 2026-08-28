/* ==========================================================================
   data/theory/modern-java.js — module 15 in the reading path

   Seven chapters, and the module where the version blocks earn their keep.
   Every claim here has a release attached to it, because the honest answer to
   "can I use that" is always "on which Java".
   ========================================================================== */

const modernJavaModule = {
    id: 'modern-java',
    trackId: 'java-platform',
    order: 15,
    title: 'Modern Java: 17 → 25',
    tagline: 'Records, sealed types, pattern matching — and which LTS you are being asked about.',
    estimatedMinutes: 40,
    prerequisites: ['streams-and-lambdas'],
    docHub: { title: 'JDK Enhancement Proposals', url: 'https://openjdk.org/jeps/0' },

    chapters: [
        {
            id: 'records',
            title: 'Records',
            importance: 'must-know',
            summary: 'A transparent carrier for immutable data, with the constructor, accessors, equals, hashCode and toString derived from the component list.',
            interviewAngle: 'Asked everywhere since Boot 3 made Java 17 the baseline. The weak answer is "less boilerplate". The strong one names what a record actually promises — transparency — and knows the two places it does not do what people expect: shallow immutability, and JPA.',
            buildsOn: [],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>A record is a class whose <strong>state is its API</strong>. The component list in the header is the whole specification: the canonical constructor, the accessors, <code>equals</code>, <code>hashCode</code> and <code>toString</code> are all derived from it, and the language guarantees they stay consistent with it. That guarantee — not the saved typing — is the feature, and it is why a record cannot extend a class and cannot declare an extra instance field.</p>'
                },
                {
                    type: 'types',
                    title: 'What you get, and what you give up',
                    items: [
                        { name: 'Implicitly final', html: '<p>No subclassing, which is what makes the componentwise <code>equals</code> correct — the symmetry problem from the object-contract module cannot arise.</p>' },
                        { name: 'Componentwise equals and hashCode', html: '<p>Generated from every component, in order. You may override them; you almost never should.</p>' },
                        { name: 'A compact constructor', html: '<p><code>public Money { ... }</code> with no parameter list. It runs <em>before</em> the fields are assigned, so it is where validation and defensive copying go — assigning to the parameter name is what takes effect.</p>' },
                        { name: 'No extra instance fields', html: '<p>Static fields are fine. An instance field outside the component list would be state that <code>equals</code> ignores, which is exactly what transparency forbids.</p>' },
                        { name: 'Accessors named after components', html: '<p><code>amount()</code>, not <code>getAmount()</code>. Jackson handles this; some older reflective libraries do not.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A record is shallowly immutable, and a record holding a <code>List</code> is not immutable at all.</strong> The canonical constructor stores the caller\'s reference, and the accessor hands it straight back. Copy in the compact constructor — <code>items = List.copyOf(items)</code> — and remember that the copy is itself shallow. This is the same lesson as the defensive-copies chapter and it is the single most common misunderstanding about records.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A record cannot be a JPA entity.</strong> It is final, has no no-argument constructor, and has no setters, so Hibernate cannot proxy it or populate it. Records are excellent as <strong>DTOs and projections</strong> — Spring Data will map a constructor projection onto one directly — and that is where to use them in a persistence-backed service. An <code>@Embeddable</code> is the closest a record gets to living inside an entity, and only in recent Hibernate versions.</p>'
                },
                {
                    type: 'version',
                    title: 'Records',
                    items: [
                        { version: 'Java 14, 15', state: 'preview', html: '<p>Preview feature. Required <code>--enable-preview</code> and could change between releases.</p>' },
                        { version: 'Java 16', state: 'is', html: '<p>Final and permanent. This is the answer to "since when" and it matters because Java 11, still a supported LTS, does not have them.</p>' },
                        { version: 'Java 21', state: 'changed', html: '<p><strong>Record patterns</strong> arrived, which is what makes records a destructuring construct rather than only a declaration one. See the pattern-matching chapter.</p>' }
                    ]
                }
            ],
            docs: [
                { title: 'JEP 395: Records', url: 'https://openjdk.org/jeps/395', kind: 'guide' },
                { title: 'Record Classes', url: 'https://docs.oracle.com/en/java/javase/21/language/records.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'java-language', questionId: 'records-what-they-give-you' },
                { topicId: 'java-language', questionId: 'record-equals-and-mutable-components' },
                { topicId: 'rest-api', questionId: 'dto-vs-entity' }
            ]
        },

        {
            id: 'sealed-types',
            title: 'Sealed Types',
            importance: 'should-know',
            summary: 'A supertype that names its permitted subtypes, so the compiler knows the list is complete — which is what makes exhaustive switching possible.',
            interviewAngle: 'The good question pairs it with records and pattern matching, because the three were designed as one feature. Being able to say that sealed types exist to make exhaustiveness checkable is a much better answer than "it restricts inheritance".',
            buildsOn: ['records'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'A closed hierarchy, and what it buys',
                    code: 'public sealed interface PaymentResult\n        permits Approved, Declined, RequiresAction { }\n\npublic record Approved(String authCode)          implements PaymentResult { }\npublic record Declined(String reason)            implements PaymentResult { }\npublic record RequiresAction(URI challengeUrl)   implements PaymentResult { }\n\n// No default branch, and it compiles: the compiler knows the list\n// is complete. Add a fourth permitted type and THIS SWITCH STOPS\n// COMPILING, which is the entire point.\nString describe(PaymentResult result) {\n    return switch (result) {\n        case Approved a       -> "approved " + a.authCode();\n        case Declined d       -> "declined: " + d.reason();\n        case RequiresAction r -> "3DS at " + r.challengeUrl();\n    };\n}',
                    notes: '<p>Every permitted subtype must itself be <code>final</code>, <code>sealed</code> or explicitly <code>non-sealed</code> — the language forces you to say what happens at each leaf rather than letting the hierarchy quietly reopen. They must also be in the same module, or the same package for an unnamed module, so the list cannot be extended from outside.</p>'
                },
                {
                    type: 'prose',
                    html: '<p>The value is the <strong>failure mode when the model grows</strong>. With an open hierarchy and a <code>default</code> branch, adding a fourth result type compiles everywhere and silently takes the default in a dozen switches nobody remembered. Sealed plus exhaustive switching turns that into a compile error at every site that has to change — which is the same argument for an enum, extended to types that carry different data.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Adding a <code>default</code> branch to an exhaustive switch throws the benefit away.</strong> The compiler can no longer tell you about the missing case, because you have told it every case is handled. If you want a fallback for a future type, that is a real decision — but be aware you have chosen a runtime surprise over a compile error, and say so in a comment.</p>'
                },
                {
                    type: 'version',
                    title: 'Sealed classes and interfaces',
                    items: [
                        { version: 'Java 15, 16', state: 'preview', html: '<p>Preview.</p>' },
                        { version: 'Java 17', state: 'is', html: '<p>Final. Available on every Spring Boot 3 baseline, since Boot 3 requires Java 17.</p>' },
                        { version: 'Java 21', state: 'changed', html: '<p>Exhaustiveness over sealed types became genuinely useful when pattern matching for <code>switch</code> finalised. Before that, a sealed hierarchy could only be switched over via <code>instanceof</code> chains, which the compiler could not check.</p>' }
                    ]
                }
            ],
            docs: [
                { title: 'JEP 409: Sealed Classes', url: 'https://openjdk.org/jeps/409', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'java-language', questionId: 'sealed-interfaces' }
            ]
        },

        {
            id: 'pattern-matching-for-switch',
            title: 'Pattern Matching',
            importance: 'must-know',
            summary: 'Test, cast and bind in one construct — then destructure a record in the same breath, and let the compiler check you handled every case.',
            interviewAngle: 'The most visible change between Java 11 and Java 21, so it is a natural way for an interviewer to find out which one you actually work in. Knowing that record patterns and exhaustiveness landed in 21 specifically is worth having exact.',
            buildsOn: ['sealed-types'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Three generations of the same code',
                    code: '// Java 8: test, cast, use. The type is written twice and the cast\n// is unchecked by the reader.\nif (o instanceof String) {\n    String s = (String) o;\n    if (s.length() > 5) { ... }\n}\n\n// Java 16: pattern for instanceof. One mention of the type, and s\n// is in scope exactly where the test succeeded.\nif (o instanceof String s && s.length() > 5) { ... }\n\n// Java 21: pattern for switch, with a record pattern destructuring\n// in the case label, a guard with `when`, and no default branch\n// because the sealed hierarchy makes it exhaustive.\nString render(Shape shape) {\n    return switch (shape) {\n        case Circle(double r) when r > 100 -> "big circle";\n        case Circle(double r)              -> "circle of " + r;\n        case Rect(double w, double h)      -> w + " by " + h;\n        case null                          -> "nothing";\n    };\n}',
                    notes: '<p><code>case null</code> is new and deliberate. A traditional <code>switch</code> throws <code>NullPointerException</code> on a null selector; a pattern switch still does, <em>unless</em> you write a <code>case null</code>, which makes the null handling explicit and local rather than a separate guard clause above the switch.</p>'
                },
                {
                    type: 'types',
                    title: 'The pieces, and what each is for',
                    items: [
                        { name: 'Type patterns', html: '<p><code>case Circle c</code>. Tests and binds in one step; the binding is scoped to where the test is known to have succeeded, which is why flow scoping lets you use it in the same <code>&amp;&amp;</code> chain.</p>' },
                        { name: 'Record patterns', html: '<p><code>case Circle(double r)</code>. Destructures using the record\'s components, and nests — <code>case Line(Point(var x1, var y1), Point p2)</code>.</p>' },
                        { name: 'Guards', html: '<p><code>when</code> after the pattern. A boolean condition that is part of the case rather than an <code>if</code> inside it, so the compiler still reasons about ordering.</p>' },
                        { name: 'Exhaustiveness', html: '<p>Over a sealed hierarchy or an enum, the compiler verifies every case is covered and rejects the switch otherwise. This is what turns a model change into a compile error.</p>' },
                        { name: 'Unnamed patterns', html: '<p><code>case Point(var x, _)</code>. Java 22, for components you must destructure past and do not need.</p>' }
                    ]
                },
                {
                    type: 'version',
                    title: 'Pattern matching, by release',
                    items: [
                        { version: 'Java 16', state: 'changed', html: '<p>Pattern matching for <code>instanceof</code> finalised.</p>' },
                        { version: 'Java 14', state: 'was', html: '<p><code>switch</code> <em>expressions</em> finalised — arrow labels and <code>yield</code>. Distinct from pattern matching and often confused with it.</p>' },
                        { version: 'Java 21', state: 'is', html: '<p>Pattern matching for <code>switch</code> and record patterns both finalised, together. This is the release where the records / sealed / patterns triad became complete.</p>' },
                        { version: 'Java 22', state: 'changed', html: '<p>Unnamed variables and patterns — the <code>_</code> placeholder — finalised.</p>' },
                        { version: 'Java 25', state: 'preview', html: '<p>Primitive types in patterns and <code>instanceof</code> remain a preview feature. Do not rely on it in an answer without saying it is preview.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>If you are asked what you like about modern Java, this is the answer to give, and give it as a triad: <em>"Records, sealed types and pattern matching are one feature in three parts. A sealed interface of records models a closed set of alternatives, and an exhaustive switch over it means adding a case is a compile error at every site that has to change rather than a silent default branch."</em> That is a design argument, not a feature list.</p>'
                }
            ],
            docs: [
                { title: 'JEP 441: Pattern Matching for switch', url: 'https://openjdk.org/jeps/441', kind: 'guide' },
                { title: 'JEP 440: Record Patterns', url: 'https://openjdk.org/jeps/440', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'java-language', questionId: 'pattern-matching-for-switch' },
                { topicId: 'java-language', questionId: 'switch-exhaustiveness' }
            ]
        },

        {
            id: 'text-blocks',
            title: 'Text Blocks',
            importance: 'good-to-know',
            summary: 'Multi-line string literals with incidental indentation stripped by a rule you should know, because it decides what your JSON fixture actually contains.',
            interviewAngle: 'Never asked directly. Worth five minutes because the indentation rule is genuinely surprising and produces test fixtures that differ from what the author sees on screen.',
            buildsOn: [],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The indentation rule',
                    code: 'String json = """\n        {\n          "id": 1,\n          "name": "Ada"\n        }\n        """;\n\n// The common indentation is computed across every non-blank line\n// AND the closing delimiter line, then stripped. Moving the closing\n// """ to column 0 would keep eight spaces on every line.\n\nString query = """\n        SELECT id, name\n          FROM users\n         WHERE active = true\\\n        """;\n\n// A trailing backslash suppresses the newline, so `query` has no\n// terminating line break. \\s is an escape for a space that survives\n// trailing-whitespace stripping.',
                    notes: '<p>Two rules cause every surprise here. Incidental indentation is measured against the <strong>least-indented non-blank line, including the line holding the closing delimiter</strong> — so where you put the closing <code>"""</code> changes the content. And trailing whitespace is stripped from every line, which is why <code>\\s</code> exists.</p>'
                },
                {
                    type: 'version',
                    title: 'Text blocks',
                    items: [
                        { version: 'Java 13, 14', state: 'preview', html: '<p>Preview, with a different escape set in the first iteration.</p>' },
                        { version: 'Java 15', state: 'is', html: '<p>Final. Available on every LTS from 17 onward.</p>' }
                    ]
                }
            ],
            docs: [
                { title: 'JEP 378: Text Blocks', url: 'https://openjdk.org/jeps/378', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'java-language', questionId: 'text-blocks' }
            ]
        },

        {
            id: 'var-and-inference',
            title: 'var, and Where Not to Use It',
            importance: 'good-to-know',
            summary: 'Local variable type inference. Still statically typed, still final at the bytecode level — and a readability decision rather than a typing one.',
            interviewAngle: 'A style question, and style questions are judgement questions. "I use it when the right-hand side already names the type" is a position; "I use it everywhere" and "I never use it" are both weaker.',
            buildsOn: [],
            blocks: [
                {
                    type: 'prose',
                    html: '<p><code>var</code> infers the type of a <em>local variable</em> from its initialiser. Nothing becomes dynamic: the variable has a single static type, chosen at compile time, and the class file is identical to the one you would have got by writing the type out. It is not allowed on fields, method parameters, return types or a variable with no initialiser, because in all of those the declaration is the only place the type could come from.</p>'
                },
                {
                    type: 'comparison',
                    title: 'When it helps and when it hurts',
                    left: 'Use it',
                    right: 'Write the type',
                    rows: [
                        { aspect: 'The right side names the type', left: '<code>var users = new ArrayList&lt;User&gt;();</code>', right: '—' },
                        { aspect: 'The type is unspeakable', left: 'An anonymous class, or an intersection type from a ternary', right: '—' },
                        { aspect: 'The type is long and obvious', left: '<code>var entry : map.entrySet()</code>', right: '—' },
                        { aspect: 'A factory or builder result', left: '—', left_note: '', right: '<code>var result = process(input);</code> tells the reader nothing' },
                        { aspect: 'A numeric literal', left: '—', right: '<code>var x = 0</code> is an <code>int</code>; if you wanted <code>long</code> you now have a bug' },
                        { aspect: 'A diamond with no argument', left: '—', right: '<code>var list = new ArrayList&lt;&gt;()</code> infers <code>ArrayList&lt;Object&gt;</code>' }
                    ]
                },
                {
                    type: 'version',
                    title: 'var',
                    items: [
                        { version: 'Java 10', state: 'is', html: '<p>Local variable type inference.</p>' },
                        { version: 'Java 11', state: 'changed', html: '<p>Extended to lambda parameters — <code>(var a, var b) -&gt; ...</code> — which exists so an annotation can be applied to a lambda parameter.</p>' }
                    ]
                }
            ],
            docs: [
                { title: 'JEP 286: Local-Variable Type Inference', url: 'https://openjdk.org/jeps/286', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'java-language', questionId: 'var-and-where-not-to-use-it' }
            ]
        },

        {
            id: 'what-changed-per-lts',
            title: 'What Changed, LTS by LTS',
            importance: 'must-know',
            summary: 'The version question, answered as a table you can recall under pressure — because the real question is always which Java you have actually worked in.',
            interviewAngle: 'Asked directly, and asked indirectly by every question about a feature. The interviewer is calibrating whether your experience is current, and a candidate who knows what is in 21 but not that 25 is now the LTS is telling them something specific.',
            buildsOn: ['pattern-matching-for-switch'],
            blocks: [
                {
                    type: 'table',
                    title: 'The LTS releases, and what each one brought',
                    headers: ['Release', 'Shipped', 'What it is remembered for'],
                    rows: [
                        ['Java 8', 'March 2014', 'Lambdas, streams, <code>Optional</code>, <code>java.time</code>. Still the floor for a lot of production code'],
                        ['Java 11', 'September 2018', 'The module system in general use, <code>var</code>, <code>HttpClient</code>, single-file source launch. No standalone JRE'],
                        ['Java 17', 'September 2021', 'Records, sealed types, <code>instanceof</code> patterns, switch expressions, text blocks. <strong>The Spring Boot 3 baseline</strong>'],
                        ['Java 21', 'September 2023', '<strong>Virtual threads</strong>, pattern matching for switch, record patterns, sequenced collections'],
                        ['Java 25', 'September 2025', 'Current LTS. Structured concurrency and scoped values matured, AOT method profiling, flexible constructor bodies, module import declarations']
                    ]
                },
                {
                    type: 'version',
                    title: 'Two changes between 21 and 25 that are worth naming',
                    items: [
                        { version: 'Java 24', state: 'removed', html: '<p>The Security Manager was <strong>permanently disabled</strong> (JEP 486). It had been deprecated for removal since 17; from 24, enabling it fails. Anything relying on it needs a different answer.</p>' },
                        { version: 'Java 24', state: 'changed', html: '<p><strong>JEP 491</strong> removed the main cause of virtual-thread pinning: a virtual thread blocking inside a <code>synchronized</code> block no longer pins its carrier. This changes the standard advice about <code>synchronized</code> versus <code>ReentrantLock</code>, and the virtual-threads module covers it in detail.</p>' },
                        { version: 'Java 25', state: 'is', html: '<p>Flexible constructor bodies (JEP 513) finalised — statements are allowed before <code>super()</code>, so validation can happen before the superclass constructor runs. Module import declarations (JEP 511) and compact source files with instance <code>main</code> methods (JEP 512) also finalised.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>Do not claim more than you have used. <em>"The service I work on is on 21, so virtual threads and pattern matching are what I use daily. I have read about the 25 changes — the pinning fix in 24 is the one that would change how I write things — but I have not run it in production."</em> That is a strong answer. Listing features from a release you have never compiled against is a weak one, and the follow-up will find it.</p>'
                }
            ],
            docs: [
                { title: 'JDK Release Notes', url: 'https://www.oracle.com/java/technologies/javase/jdk-relnotes-index.html', kind: 'guide' },
                { title: 'JEP 491: Synchronize Virtual Threads without Pinning', url: 'https://openjdk.org/jeps/491', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-boot', questionId: 'version-support-windows' },
                { topicId: 'spring-boot', questionId: 'what-boot-3-added' }
            ]
        },

        {
            id: 'sequenced-collections',
            title: 'Sequenced Collections',
            importance: 'good-to-know',
            summary: 'The interface layer that had been missing since 1998: a common type for "has a defined encounter order", with first, last and reversed.',
            interviewAngle: 'A small, current thing to know. Mentioning it costs one sentence and places your experience in the Java 21 era more convincingly than naming virtual threads, which everyone names.',
            buildsOn: [],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'What it replaced',
                    code: '// Before Java 21 — three different ways to say "the first element"\nlist.get(0);\ndeque.peekFirst();\nlinkedHashSet.iterator().next();\n\n// ...and getting the LAST element of a LinkedHashSet meant\n// iterating the whole thing.\n\n// Java 21\nSequencedCollection<String> c = ...;\nc.getFirst();\nc.getLast();\nc.addFirst("x");\nc.removeLast();\nc.reversed();                      // a VIEW, O(1), not a copy\n\nSequencedMap<String, Integer> m = new LinkedHashMap<>();\nm.firstEntry();\nm.pollLastEntry();\nm.reversed();',
                    notes: '<p>Retrofitted onto <code>List</code>, <code>Deque</code>, <code>LinkedHashSet</code>, <code>LinkedHashMap</code>, <code>SortedSet</code> and <code>SortedMap</code>. <code>reversed()</code> returns a view backed by the original, so it is cheap and it reflects later changes — which is a property to be deliberate about rather than surprised by.</p>'
                },
                {
                    type: 'version',
                    title: 'Sequenced collections',
                    items: [
                        { version: 'Java 1.2 → 20', state: 'was', html: '<p>No common supertype for ordered collections. Every implementation exposed its own spelling of first and last, or none at all.</p>' },
                        { version: 'Java 21', state: 'is', html: '<p>JEP 431. <code>SequencedCollection</code>, <code>SequencedSet</code>, <code>SequencedMap</code>. A rare source-incompatible retrofit: a class implementing <code>List</code> that already had an unrelated <code>getFirst()</code> with a different return type no longer compiles.</p>' }
                    ]
                }
            ],
            docs: [
                { title: 'JEP 431: Sequenced Collections', url: 'https://openjdk.org/jeps/431', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'collections', questionId: 'sequenced-collections' }
            ]
        }
    ]
};
