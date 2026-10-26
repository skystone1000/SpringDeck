/* ==========================================================================
   data/theory/enums-and-nested-types.js — module 6 in the reading path

   The second of the six java-platform insertions from section 5.9, placed
   after inheritance-and-interfaces because both halves of it depend on
   understanding what a class is: an enum is a class with a fixed set of
   instances, and an inner class is a class with a hidden field.

   Two small features with disproportionate interview surface, and they are
   in one module because they share a shape. Both are compiler
   transformations — the enum into a final class with static instances, the
   inner class into a top-level class with a synthetic outer reference — and
   in both cases every question that gets asked is a consequence of the
   transformation rather than of the syntax.

   Nine chapters: five on enums, four on nested types, and the last two lead
   into the streams module by way of capture.
   ========================================================================== */

const enumsAndNestedTypesModule = {
    id: 'enums-and-nested-types',
    trackId: 'java-platform',
    order: 6,
    title: 'Enums and Nested Types',
    tagline: 'Two small features with disproportionate interview surface.',
    estimatedMinutes: 35,
    prerequisites: ['inheritance-and-interfaces'],
    docHub: { title: 'java.lang.Enum', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Enum.html' },

    chapters: [
        {
            id: 'enum-internals',
            title: 'What an Enum Compiles To',
            importance: 'must-know',
            summary: 'A final class extending java.lang.Enum, with one public static final instance per constant, created in a static initialiser. Everything else follows from that.',
            interviewAngle: 'Being able to describe the generated class answers five other questions at once — why == works, why the constructor is private, why an enum cannot extend anything, and why values() returns a fresh array.',
            buildsOn: [],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The source, and what the compiler makes of it',
                    code: 'enum Status { ACTIVE, SUSPENDED, CLOSED }\n\n// Approximately:\nfinal class Status extends java.lang.Enum<Status> {\n\n    public static final Status ACTIVE    = new Status("ACTIVE", 0);\n    public static final Status SUSPENDED = new Status("SUSPENDED", 1);\n    public static final Status CLOSED    = new Status("CLOSED", 2);\n\n    private static final Status[] VALUES = { ACTIVE, SUSPENDED, CLOSED };\n\n    private Status(String name, int ordinal) { super(name, ordinal); }\n\n    public static Status[] values() { return VALUES.clone(); }  // a COPY\n    public static Status valueOf(String n) { ... }              // throws if unknown\n}',
                    notes: '<p>Five consequences, all of which get asked. The instances are created once in a static initialiser, so <code>==</code> is correct and is the idiomatic comparison. The constructor is private, so no sixth instance can exist. The class is final and already extends <code>Enum</code>, so an enum can implement interfaces but never extend a class. <code>values()</code> clones the array on every call, so calling it in a loop allocates — use <code>EnumSet.allOf</code> or cache it. And <code>valueOf</code> throws <code>IllegalArgumentException</code> rather than returning null, which is the right default and a trap when parsing external input.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong><code>Enum.valueOf</code> on untrusted input throws, and the exception message contains the value.</strong> Parsing a request parameter with it gives a 500 rather than a 400, and echoes the client\'s input into your logs. Wrap it: a static <code>from(String)</code> returning <code>Optional</code>, built over a <code>Map</code> populated once in a static initialiser, is three lines and turns the whole class of failure into a validation error.</p>'
                }
            ],
            docs: [
                { title: 'java.lang.Enum', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Enum.html', kind: 'api' },
                { title: 'JLS §8.9 — Enum Classes', url: 'https://docs.oracle.com/javase/specs/jls/se21/html/jls-8.html', kind: 'spec' }
            ],
            relatedQuestions: []
        },

        {
            id: 'enums-with-behaviour',
            title: 'Enums With Behaviour',
            importance: 'must-know',
            summary: 'Constants can carry fields, implement interfaces, and override a method per constant. That last one turns a switch over an enum into methods on the enum.',
            interviewAngle: 'The strategy pattern in disguise, and reaching for it in an LLD round is a strong move: it makes the compiler enforce that every constant handles the case.',
            buildsOn: ['enum-internals'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'A switch that cannot forget a case',
                    code: 'enum Plan implements PricingRule {\n\n    FREE(0) {\n        public Money monthly(int seats)  { return Money.ZERO; }\n    },\n    TEAM(900) {\n        public Money monthly(int seats)  { return unit.times(seats); }\n    },\n    ENTERPRISE(700) {\n        public Money monthly(int seats)  {\n            return unit.times(seats).minus(volumeDiscount(seats));\n        }\n    };\n\n    protected final Money unit;\n\n    Plan(int cents) { this.unit = Money.ofCents(cents); }\n\n    public abstract Money monthly(int seats);   // every constant MUST implement\n}\n\n// The call site has no switch and cannot get it wrong:\nMoney due = subscription.plan().monthly(subscription.seats());',
                    notes: '<p>The abstract method is the mechanism that makes this better than a switch: adding a fourth constant <em>does not compile</em> until it supplies an implementation. A switch elsewhere in the codebase would compile fine and fall through to a default, which is the bug this shape removes. Each constant body is compiled as an anonymous subclass, which is why the enum class itself is not <code>final</code> when constant bodies are present.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The rule of thumb: <strong>if you find yourself writing a <code>switch</code> over an enum in more than one place, the behaviour belongs on the enum.</strong> One switch is fine and often clearer. Three switches over the same enum in three files is a fourth constant waiting to be half-implemented.</p>'
                }
            ],
            docs: [
                { title: 'Enum Types', url: 'https://docs.oracle.com/javase/tutorial/java/javaOO/enum.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'design-patterns', questionId: 'strategy-pattern' }
            ]
        },

        {
            id: 'enummap-and-enumset',
            title: 'EnumMap and EnumSet',
            importance: 'should-know',
            summary: 'Two specialised collections that exploit the fact that the key space is small, ordered and known at compile time. An array and a bit vector, with a Map and a Set interface on top.',
            interviewAngle: 'A collections question that rewards knowing the implementation: EnumSet is a long, which is why it is faster than any HashSet can be and why it has no thread-safety issues to discuss.',
            buildsOn: ['enums-with-behaviour'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'What the specialisation buys',
                    left: 'EnumMap / EnumSet',
                    right: 'HashMap / HashSet',
                    rows: [
                        { aspect: 'Backing store', left: 'An array indexed by ordinal; <code>EnumSet</code> is a bit vector in one or more <code>long</code>s', right: 'A hash table with buckets and nodes' },
                        { aspect: 'Hashing', left: 'None. The ordinal <em>is</em> the index.', right: 'Every get and put hashes the key' },
                        { aspect: 'Memory', left: 'One array slot per constant; a set of 64 constants is 8 bytes', right: 'A node object per entry' },
                        { aspect: 'Iteration order', left: 'Declaration order, always', right: 'Unspecified' },
                        { aspect: 'null keys', left: 'Rejected', right: '<code>HashMap</code> allows one' },
                        { aspect: 'Use when', left: 'The key is an enum. Always.', right: 'It is not' }
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The factory methods, which is most of the API',
                    code: 'EnumSet<Status> open   = EnumSet.of(ACTIVE, SUSPENDED);\nEnumSet<Status> closed = EnumSet.complementOf(open);   // { CLOSED }\nEnumSet<Status> all    = EnumSet.allOf(Status.class);  // no values() clone\nEnumSet<Status> none   = EnumSet.noneOf(Status.class); // the empty start\nEnumSet<Day> weekdays  = EnumSet.range(MONDAY, FRIDAY);// declaration order\n\nEnumMap<Status, Handler> handlers = new EnumMap<>(Status.class);\n// The Class object is REQUIRED -- the map needs to know how many slots\n// its array has, and generics are erased so it cannot find out.\n\n// The state-machine idiom from the LLD module, in its natural form:\nMap<Status, Set<Status>> legal = new EnumMap<>(Status.class);\nlegal.put(ACTIVE,    EnumSet.of(SUSPENDED, CLOSED));\nlegal.put(SUSPENDED, EnumSet.of(ACTIVE, CLOSED));\nlegal.put(CLOSED,    EnumSet.noneOf(Status.class));',
                    notes: '<p>The required <code>Class</code> argument is a small, memorable illustration of erasure: at run time the map has no idea what <code>Status</code> is unless you hand it the token, and it needs the constant count to size its array. It is the same reason <code>Array.newInstance</code> takes one.</p>'
                }
            ],
            docs: [
                { title: 'EnumSet', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/EnumSet.html', kind: 'api' },
                { title: 'EnumMap', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/EnumMap.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'collections', questionId: 'enummap-and-enumset' }
            ]
        },

        {
            id: 'ordinal-is-a-trap',
            title: 'ordinal() Is a Trap',
            importance: 'should-know',
            summary: 'It is a position, not an identity, and positions change when somebody inserts a constant. Persisting it, or sending it over the wire, converts a harmless refactor into silent data corruption.',
            interviewAngle: 'A data-integrity question. The JPA version of it — @Enumerated defaulting to ORDINAL — is one of the most consequential defaults in the whole framework.',
            buildsOn: ['enummap-and-enumset'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The JPA default that has corrupted real databases',
                    code: '@Entity\nclass Account {\n    @Enumerated                       // defaults to ORDINAL -- 0, 1, 2\n    private Status status;\n}\n\n// enum Status { ACTIVE, SUSPENDED, CLOSED }\n//   ACTIVE=0  SUSPENDED=1  CLOSED=2\n// Rows are written as integers. Now somebody adds a constant:\n// enum Status { ACTIVE, PENDING, SUSPENDED, CLOSED }\n//   ACTIVE=0  PENDING=1  SUSPENDED=2  CLOSED=3\n// Every row that said SUSPENDED now reads back as PENDING, and every\n// CLOSED row reads back as SUSPENDED. No error, no migration, no clue.\n\n@Entity\nclass Account {\n    @Enumerated(EnumType.STRING)      // writes "ACTIVE", "SUSPENDED"\n    private Status status;            // survives insertion; breaks LOUDLY\n}                                     // on a rename, which is what you want',
                    notes: '<p><code>STRING</code> is not merely safer, it fails in a better direction: renaming a constant makes existing rows fail to map with a clear error, whereas <code>ORDINAL</code> silently reinterprets them. A loud failure you can fix in a migration beats a quiet one you find in a report six months later. The cost is a few bytes per row and a slightly wider index.</p>'
                },
                {
                    type: 'types',
                    title: 'Everywhere else the same mistake appears',
                    items: [
                        { name: 'An API response', html: '<p>Sending the ordinal makes every client depend on declaration order. Send the name.</p>' },
                        { name: 'A Kafka message or cache entry', html: '<p>Same problem, worse blast radius — producers and consumers redeploy independently, so the two sides disagree for the duration of the rollout.</p>' },
                        { name: 'Deriving a value from the ordinal', html: '<p><code>ordinal() * 100</code> as a priority. Declare the field in the constructor instead; it costs one line and stops being positional.</p>' },
                        { name: 'Sorting by ordinal', html: '<p>This one is legitimate — the natural order of an enum <em>is</em> declaration order and is specified as such. Just be aware that reordering constants is then a behaviour change.</p>' }
                    ]
                }
            ],
            docs: [
                { title: 'Enumerated', url: 'https://jakarta.ee/specifications/persistence/3.1/apidocs/jakarta.persistence/jakarta/persistence/enumerated', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'jpa-hibernate', questionId: 'jpa-vs-hibernate' }
            ]
        },

        {
            id: 'enum-as-a-singleton',
            title: 'Enum as a Singleton',
            importance: 'good-to-know',
            summary: 'A single-constant enum is the only singleton implementation that survives serialisation and reflection without extra code. Recommended by Effective Java, and rarely what you want in Spring.',
            interviewAngle: 'Comes up as a follow-up to the singleton question. Naming the two attacks it defends against — readObject and setAccessible — is the whole answer.',
            buildsOn: ['ordinal-is-a-trap'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Two attacks that break a private-constructor singleton',
                    code: '// The conventional singleton.\nclass Registry {\n    static final Registry INSTANCE = new Registry();\n    private Registry() { }\n}\n\n// Attack 1: reflection.\nConstructor<Registry> c = Registry.class.getDeclaredConstructor();\nc.setAccessible(true);\nRegistry second = c.newInstance();      // a second instance exists\n\n// Attack 2: serialization. Every deserialisation produces a new object\n// unless readResolve() is implemented and remembered.\n\n// The enum version defends against both, for free:\nenum Registry {\n    INSTANCE;\n    void register(String name) { ... }\n}\n// newInstance() on an enum throws IllegalArgumentException by\n// specification, and the deserialisation path for enums resolves by\n// name to the existing constant rather than constructing anything.',
                    notes: '<p>Both defences are in the platform rather than in your code, which is the argument: a <code>readResolve</code> somebody has to remember to write is a defence that will eventually be missing. That said, the previous module\'s point still applies — the problem with a singleton was the global access point, and this makes the global access point tidier rather than absent.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>In a Spring application this is almost never the right tool, because the container already gives you one instance without a static accessor. Where it does earn its place is in a library, a utility with genuinely no state, or a strategy implementation that has no dependencies — <code>enum NoOpAuditor implements Auditor { INSTANCE; ... }</code> is a tidy stateless implementation with no allocation.</p>'
                }
            ],
            docs: [
                { title: 'Enum Types', url: 'https://docs.oracle.com/javase/tutorial/java/javaOO/enum.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'design-patterns', questionId: 'singleton-and-spring' }
            ]
        },

        {
            id: 'static-nested-vs-inner',
            title: 'Static Nested Against Inner',
            importance: 'must-know',
            summary: 'One keyword between them, and it decides whether an instance can carry a hidden reference to an enclosing object at all. Default to static.',
            interviewAngle: 'Asked constantly and answered vaguely. The precise answer is about the synthetic this$0 field, and it leads directly into the leak in the next chapter.',
            buildsOn: ['enum-as-a-singleton'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The hidden field, and what it costs',
                    code: 'class Outer {\n    private int count;\n\n    // INNER: has an implicit reference to the Outer instance.\n    class Inner {\n        int read() { return count; }        // reaches out to Outer.this\n    }\n\n    // STATIC NESTED: an ordinary top-level class that happens to live\n    // inside Outer for namespacing. No hidden field.\n    static class Nested {\n        // int read() { return count; }     // will not compile\n    }\n}\n\n// Creating them is different too, which is the tell:\nOuter outer = new Outer();\nOuter.Inner  inner  = outer.new Inner();    // needs an instance\nOuter.Nested nested = new Outer.Nested();   // does not\n\n// What javac actually generates for Inner:\n//   class Outer$Inner {\n//       final Outer this$0;                // <-- the hidden field\n//       Outer$Inner(Outer o) { this.this$0 = o; }\n//   }',
                    notes: '<p><code>this$0</code> is the whole difference, and it is a real field with real consequences: extra memory per instance, and a strong reference from every <code>Inner</code> to its <code>Outer</code> that keeps the outer object alive for exactly as long as the inner one lives. Everything in the next chapter follows from that sentence.</p>'
                },
                {
                    type: 'table',
                    title: 'The four nested forms',
                    headers: ['Form', 'Outer reference', 'Typical use'],
                    rows: [
                        ['<code>static class</code>', 'None', '<strong>The default.</strong> A helper type scoped to its owner — <code>Map.Entry</code>, a builder, a node'],
                        ['<code>class</code> (inner)', '<code>this$0</code>, <em>only if it uses the outer instance</em>', 'Genuinely needs the enclosing instance — an iterator over its owner\'s state'],
                        ['Local class', '<code>this$0</code> plus captured locals', 'Rare since lambdas'],
                        ['Anonymous class', '<code>this$0</code> plus captured locals', 'A one-off implementation; mostly replaced by lambdas']
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>Write <code>static</code> unless the class needs the enclosing instance, and let the compiler tell you when it does — removing <code>static</code> is a one-word change if you were wrong. Nested enums, records and interfaces are implicitly static and cannot be otherwise, which is a hint about what the default should have been.</p>'
                }
            ],
            docs: [
                { title: 'Nested Classes', url: 'https://docs.oracle.com/javase/tutorial/java/javaOO/nested.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'java-language', questionId: 'static-nested-vs-inner' }
            ]
        },

        {
            id: 'the-outer-reference-and-its-leak',
            title: 'The Leak the Outer Reference Causes',
            importance: 'should-know',
            summary: 'An inner-class instance that outlives its enclosing object keeps that object alive. Cached comparators, registered listeners and submitted tasks are the three usual shapes.',
            interviewAngle: 'A memory-leak question with a precise mechanism, which is much stronger than "objects were not garbage collected". It also connects the language feature to the heap-analysis material.',
            buildsOn: ['static-nested-vs-inner'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'A small object holding a large one alive',
                    code: 'class ReportGenerator {\n\n    private final byte[][] rawData;      // 200 MB, needed only while running\n    private final boolean  descending;   // read by the comparator below\n\n    // INNER, and it USES the enclosing instance -- which is what makes\n    // javac emit this$0. Every ByTotal then holds the generator, and\n    // therefore the 200 MB.\n    class ByTotal implements Comparator<Row> {\n        public int compare(Row a, Row b) {\n            int c = a.total().compareTo(b.total());\n            return descending ? -c : c;      // reaches out to ReportGenerator.this\n        }\n    }\n\n    Comparator<Row> comparator() { return new ByTotal(); }\n}\n\n// The comparator is tiny, so caching it looks free:\nstatic final Comparator<Row> BY_TOTAL = new ReportGenerator(...).comparator();\n// It is not free. That static field now pins 200 MB for the life of\n// the JVM, and a heap dump shows the generator as the retainer with\n// no obvious reason.\n\n// Fix: `static class ByTotal`, or a lambda that captures nothing.\nstatic final Comparator<Row> BY_TOTAL = comparing(Row::total);',
                    notes: '<p><strong>The <code>descending</code> field is load-bearing, and it is the part almost every telling of this leak leaves out.</strong> <code>javac</code> emits the synthetic <code>this$0</code> field <em>only when the inner class actually uses its enclosing instance</em>. A comparator that compares its two arguments and touches nothing outside itself gets no <code>this$0</code>, and retains nothing — even though it is still an inner class and still needs an enclosing instance to construct. Delete the <code>descending ? -c : c</code> and this example stops being a leak.</p><p>There is a sharper version of the same trap, and it was found by compiling this snippet: writing <code>private final boolean descending = true;</code> — with the initialiser inline — makes it a <em>compile-time constant</em>, which <code>javac</code> folds into the comparator at the use site. The inner class then never reads the outer instance after all, <code>this$0</code> is elided again, and the demonstration quietly stops demonstrating anything. The field has to be assigned in the constructor for this to be a leak.</p><p>The reason the real thing is hard to find is that the leaking object is not the one you would suspect: the heap dump names <code>ReportGenerator</code> as the retained object, and the reference chain runs through a field called <code>this$0</code> on a comparator nobody remembers writing. Recognising <code>this$0</code> in a dominator tree is a genuinely useful diagnostic skill.</p>'
                },
                {
                    type: 'types',
                    title: 'The three shapes this takes in practice',
                    items: [
                        { name: 'A listener registered somewhere long-lived', html: '<p>An anonymous <code>ApplicationListener</code> or event handler registered with a singleton keeps its enclosing object alive until it is deregistered — and deregistration is what gets forgotten.</p>' },
                        { name: 'A task submitted to an executor', html: '<p>An anonymous <code>Runnable</code> sitting in a queue behind a long backlog pins its enclosing object for as long as it waits.</p>' },
                        { name: 'A cached function or comparator', html: '<p>The case above. Small object, static field, enormous retention.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>A lambda captures only what it uses, so <code>comparing(Row::total)</code> holds nothing at all — but a lambda that references an instance field, or calls an instance method, captures <code>this</code> and has exactly the same retention as an inner class. "Lambdas do not leak" is false; "a lambda that captures nothing does not leak" is true.</p>'
                }
            ],
            docs: [
                { title: 'Nested Classes', url: 'https://docs.oracle.com/javase/tutorial/java/javaOO/nested.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'jvm-memory', questionId: 'diagnosing-a-memory-leak' },
                { topicId: 'jvm-memory', questionId: 'static-collection-leak' }
            ]
        },

        {
            id: 'anonymous-classes-vs-lambdas',
            title: 'Anonymous Classes Against Lambdas',
            importance: 'should-know',
            summary: 'They look interchangeable and differ in three ways that matter: what `this` means, whether a class file is generated, and whether state is possible.',
            interviewAngle: 'The `this` difference is the one that gets asked, and it is the one that produces a real bug when converting old code to lambdas.',
            buildsOn: ['the-outer-reference-and-its-leak'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'Three real differences',
                    left: 'Anonymous class',
                    right: 'Lambda',
                    rows: [
                        { aspect: 'this refers to', left: 'The anonymous instance itself', right: '<strong>The enclosing instance.</strong> A lambda introduces no new scope.' },
                        { aspect: 'Compiled to', left: 'A separate <code>Outer$1.class</code>, loaded at first use', right: '<code>invokedynamic</code>; the implementation is a synthetic method, and the object is created by <code>LambdaMetafactory</code>' },
                        { aspect: 'Can hold state', left: 'Yes — it can declare fields', right: 'No fields. Captured values only.' },
                        { aspect: 'Can implement', left: 'Any interface or abstract class, any number of methods', right: 'Exactly one functional interface' },
                        { aspect: 'Allocation', left: 'A new object every time', right: 'A non-capturing lambda may be a cached singleton' }
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The conversion bug',
                    code: 'class Worker {\n    private String name = "worker";\n\n    void oldStyle() {\n        Runnable r = new Runnable() {\n            private String name = "task";           // the anon class has state\n            public void run() {\n                System.out.println(this.name);      // "task"\n                System.out.println(Worker.this.name); // "worker"\n            }\n        };\n    }\n\n    void newStyle() {\n        Runnable r = () -> {\n            System.out.println(this.name);          // "worker" -- `this` is\n        };                                          // the Worker instance\n    }\n}',
                    output: {
                        kind: 'trace',
                        lines: [
                            'Anonymous class:  this.name          -> "task"     (the anonymous instance)',
                            'Anonymous class:  Worker.this.name   -> "worker"   (qualified, to reach out)',
                            'Lambda:           this.name          -> "worker"   (there is no new scope)',
                            'Converting the first to the second silently changes what this.name means, and both compile.'
                        ],
                        explain: '<p>This is the one conversion from anonymous class to lambda that is not mechanical. It compiles either way and it changes behaviour, which is the worst combination — and it is a direct consequence of a lambda not being an object with its own identity in the way an anonymous class instance is.</p>'
                    }
                }
            ],
            docs: [
                { title: 'Lambda Expressions', url: 'https://docs.oracle.com/javase/tutorial/java/javaOO/lambdaexpressions.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'streams-functional', questionId: 'lambda-vs-anonymous-class' }
            ]
        },

        {
            id: 'effectively-final-capture',
            title: 'Effectively Final, and Why',
            importance: 'must-know',
            summary: 'A lambda or inner class captures the value of a local variable, not the variable. The rule exists because there is no variable left to share once the method returns.',
            interviewAngle: 'Everybody knows the rule and few can say why. The answer — locals live on the stack, the captured copy lives in the object, and mutation would make them disagree — is the one worth having.',
            buildsOn: ['anonymous-classes-vs-lambdas'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>A local variable lives in the stack frame of the method that declared it, and that frame disappears when the method returns. A lambda can outlive the method — submitted to an executor, stored in a field, returned. So capture cannot be by reference; the value is <em>copied</em> into the object at the moment the lambda is created.</p><p>Given a copy, allowing the original to change would produce two values that disagree with no rule about which one wins. Rather than pick, the language forbids the mutation: the variable must be <code>final</code> or never reassigned after initialisation, which is what "effectively final" means. Instance fields are not affected because they live in an object the lambda holds a reference to — there is a variable to share, so sharing is possible.</p>'
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The rule, and the three ways round it',
                    code: 'int total = 0;\nlist.forEach(x -> total += x);        // will not compile\n\n// 1. Do not accumulate by side effect. This is nearly always the answer.\nint total = list.stream().mapToInt(Integer::intValue).sum();\n\n// 2. A mutable holder, when a side effect genuinely is required.\nAtomicInteger total = new AtomicInteger();\nlist.forEach(x -> total.addAndGet(x));   // the REFERENCE never changes\n\n// 3. An instance field, which was never subject to the rule.\nprivate int total;\nvoid run(List<Integer> list) { list.forEach(x -> total += x); }\n\n// The loop-variable version of the same rule:\nfor (int i = 0; i < 3; i++) {\n    tasks.add(() -> print(i));           // will not compile -- i is reassigned\n}\nfor (int i = 0; i < 3; i++) {\n    int captured = i;                    // a NEW variable each iteration\n    tasks.add(() -> print(captured));    // fine\n}\n// The enhanced for loop declares a fresh variable per iteration, which\n// is why `for (String s : list)` captures without complaint.',
                    notes: '<p>Option 2 works because the <em>reference</em> is effectively final even though the object it points at is mutable — the rule is about the variable, not about the value being immutable. It is also worth noticing that in a parallel context option 3 is a data race and option 2 is not, which is a real reason to prefer the accumulator over the field.</p>'
                }
            ],
            docs: [
                { title: 'JLS §4.12.4 — final Variables', url: 'https://docs.oracle.com/javase/specs/jls/se21/html/jls-4.html', kind: 'spec' }
            ],
            relatedQuestions: [
                { topicId: 'streams-functional', questionId: 'effectively-final-capture' },
                { topicId: 'streams-functional', questionId: 'side-effects-in-lambdas' }
            ]
        }
    ]
};
