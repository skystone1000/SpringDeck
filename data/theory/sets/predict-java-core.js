/* ==========================================================================
   data/theory/sets/predict-java-core.js — Predict, set 1 of 11

   Ten puzzles, all artefact: 'stdout'. That is the strongest claim this deck
   makes about any code: the program is a real, complete, deterministic Java
   program, and tools/run-snippets.js re-executes it in Phase 9 and diffs the
   real output against what is written here. An "Output" pane that cannot be
   re-checked is a guess in a console frame, which teaches something false.

   So every program here is closed over its own behaviour: no clock, no
   threads, no hash iteration order, no file system, no locale-sensitive
   formatting. Where the interesting behaviour is an exception, the program
   catches it and prints its simple name rather than letting a stack trace go
   to stderr — the runner diffs stdout, and a puzzle whose answer is on the
   other stream is a puzzle the toolchain cannot verify.

   The work in a predict block is the three WRONG options. Each distractor
   here is a real belief somebody holds: what a developer who has read the
   happy path expects, or what was true in an earlier version.
   ========================================================================== */

const predictJavaCoreModule = {
    id: 'predict-java-core',
    trackId: 'output',
    order: 951,
    title: 'Java Core',
    tagline: 'Identity, initialisation order, arithmetic and dispatch.',
    estimatedMinutes: 25,
    prerequisites: [],
    docHub: {
        title: 'The Java Language Specification, Java SE 21',
        url: 'https://docs.oracle.com/javase/specs/jls/se21/html/index.html'
    },

    chapters: [
        {
            id: 'identity-and-boxing',
            title: 'Identity and Boxing',
            importance: 'must-know',
            summary: 'Four programs about ==, and every one of them has a rule in the JLS behind it rather than an implementation detail.',
            interviewAngle: 'The Integer cache boundary is asked verbatim. The valuable half is knowing it is specified rather than incidental — the JLS requires caching from -128 to 127.',
            buildsOn: [],
            blocks: [
                {
                    type: 'predict',
                    id: 'predict-java-core-string-literal-vs-new-identity',
                    importance: 'must-know',
                    artefact: 'stdout',
                    language: 'java',
                    title: 'Three strings, one pool',
                    prompt: '<p>Two literals and one <code>new String</code>. What does this print?</p>',
                    code: 'public class Main {\n    public static void main(String[] args) {\n        String a = "spring";\n        String b = "spring";\n        String c = new String("spring");\n        System.out.println((a == b) + " " + (a == c) + " " + a.equals(c));\n    }\n}',
                    options: ['true false true', 'true true true', 'false false true', 'true false false'],
                    answer: 0,
                    output: {
                        kind: 'stdout',
                        lines: ['true false true'],
                        explain: '<p>Identical literals are the same object because the compiler interns them into the constant pool — JLS 3.10.5 requires it, so this is portable and not a JVM quirk. <code>new String</code> is an explicit instruction to allocate, which is the entire reason it exists and the entire reason not to use it.</p>'
                    }
                },
                {
                    type: 'predict',
                    id: 'predict-java-core-integer-cache-boundary',
                    importance: 'must-know',
                    artefact: 'stdout',
                    language: 'java',
                    title: 'One either side of the line',
                    prompt: '<p>The same comparison at 127 and at 128.</p>',
                    code: 'public class Main {\n    public static void main(String[] args) {\n        Integer a = 127, b = 127;\n        Integer c = 128, d = 128;\n        System.out.println((a == b) + " " + (c == d));\n    }\n}',
                    options: ['true false', 'true true', 'false false', 'false true'],
                    answer: 0,
                    output: {
                        kind: 'stdout',
                        lines: ['true false'],
                        explain: '<p><code>Integer.valueOf</code> is required by JLS 5.1.7 to cache values from −128 to 127, so autoboxing in that range hands back the same object twice. Above it, two allocations. The upper bound is raisable with <code>-XX:AutoBoxCacheMax</code>, which is a fine piece of trivia and a terrible thing to depend on.</p>'
                    }
                },
                {
                    type: 'predict',
                    id: 'predict-java-core-autoboxing-npe-in-ternary',
                    importance: 'must-know',
                    artefact: 'stdout',
                    language: 'java',
                    title: 'A null that is never dereferenced',
                    prompt: '<p>Nothing here calls a method on <code>null</code>. What is printed?</p>',
                    code: 'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Map<String, Integer> hits = new HashMap<>();\n        hits.put("a", 1);\n        try {\n            int n = hits.containsKey("b") ? hits.get("b") : hits.get("z");\n            System.out.println("n = " + n);\n        } catch (Exception e) {\n            System.out.println(e.getClass().getSimpleName());\n        }\n    }\n}',
                    options: ['NullPointerException', 'n = 0', 'n = null', 'NoSuchElementException'],
                    answer: 0,
                    output: {
                        kind: 'stdout',
                        lines: ['NullPointerException'],
                        explain: '<p>Assigning to <code>int</code> forces an unboxing call — <code>hits.get("z").intValue()</code> — on a reference that is <code>null</code>. The dereference is inserted by the compiler and is invisible in the source, which is why this shape survives code review. Declaring <code>n</code> as <code>Integer</code> makes it print <code>n = null</code> instead.</p>'
                    }
                },
                {
                    type: 'predict',
                    id: 'predict-java-core-string-concat-in-a-loop-identity',
                    importance: 'should-know',
                    artefact: 'stdout',
                    language: 'java',
                    title: 'Folded at compile time, or built at run time',
                    prompt: '<p>Two concatenations that look the same and are not.</p>',
                    code: 'public class Main {\n    public static void main(String[] args) {\n        String a = "sp" + "ring";\n        String b = "sp";\n        String c = b + "ring";\n        System.out.println((a == "spring") + " " + (c == "spring")\n                           + " " + (c.intern() == "spring"));\n    }\n}',
                    options: ['true false true', 'true true true', 'false false true', 'true false false'],
                    answer: 0,
                    output: {
                        kind: 'stdout',
                        lines: ['true false true'],
                        explain: '<p><code>"sp" + "ring"</code> is a constant expression and is folded into the literal <code>"spring"</code> at compile time, so it is the pooled instance. <code>b + "ring"</code> is not constant — <code>b</code> is not <code>final</code> — so it is built at run time into a fresh object. <code>intern()</code> looks the value up in the pool and returns the shared one.</p>'
                    }
                }
            ],
            docs: [
                { title: 'JLS 5.1.7 — Boxing conversion', url: 'https://docs.oracle.com/javase/specs/jls/se21/html/jls-5.html#jls-5.1.7', kind: 'spec' },
                { title: 'JLS 3.10.5 — String literals', url: 'https://docs.oracle.com/javase/specs/jls/se21/html/jls-3.html#jls-3.10.5', kind: 'spec' }
            ],
            relatedQuestions: [{ topicId: 'java-language', questionId: 'string-pool-and-intern' }]
        },

        {
            id: 'control-flow-and-initialisation',
            title: 'Control Flow and Initialisation',
            importance: 'must-know',
            summary: 'What finally does to a return value, the order five initialisers run in, and the one method kind that is not polymorphic.',
            interviewAngle: 'Initialisation order is asked as a trace. Getting ADBCEF right, and being able to say why the static blocks run once, is the whole answer.',
            buildsOn: ['identity-and-boxing'],
            blocks: [
                {
                    type: 'predict',
                    id: 'predict-java-core-finally-overrides-return',
                    importance: 'must-know',
                    artefact: 'stdout',
                    language: 'java',
                    title: 'Two finallys, one of which wins',
                    prompt: '<p>One <code>finally</code> mutates the variable; the other returns.</p>',
                    code: 'public class Main {\n    static int f() {\n        int x = 1;\n        try { return x; }\n        finally { x = 2; }\n    }\n    static int g() {\n        try { return 1; }\n        finally { return 2; }\n    }\n    public static void main(String[] args) {\n        System.out.println(f() + " " + g());\n    }\n}',
                    options: ['1 2', '2 2', '1 1', '2 1'],
                    answer: 0,
                    output: {
                        kind: 'stdout',
                        lines: ['1 2'],
                        explain: '<p>The return VALUE is evaluated and held before <code>finally</code> runs, so mutating the variable afterwards changes nothing — <code>f()</code> returns 1. A <code>return</code> inside <code>finally</code> is different in kind: it abandons the pending return entirely, and it would abandon a pending exception the same way. That is why returning from <code>finally</code> is a compiler warning and, in most style guides, banned.</p>'
                    }
                },
                {
                    type: 'predict',
                    id: 'predict-java-core-static-and-instance-init-order',
                    importance: 'must-know',
                    artefact: 'stdout',
                    language: 'java',
                    title: 'Six initialisers, two instances',
                    prompt: '<p>Two objects constructed. Give the whole line.</p>',
                    code: 'public class Main {\n    static class Base {\n        static { System.out.print("A"); }\n        { System.out.print("B"); }\n        Base() { System.out.print("C"); }\n    }\n    static class Derived extends Base {\n        static { System.out.print("D"); }\n        { System.out.print("E"); }\n        Derived() { System.out.print("F"); }\n    }\n    public static void main(String[] args) {\n        new Derived();\n        new Derived();\n        System.out.println();\n    }\n}',
                    options: ['ADBCEFBCEF', 'ADBCEFADBCEF', 'ABCDEFBCEF', 'DABCEFBCEF'],
                    answer: 0,
                    output: {
                        kind: 'stdout',
                        lines: ['ADBCEFBCEF'],
                        explain: '<p>Static initialisers run once, at class initialisation, superclass first: <strong>A D</strong>. Then per instance: the superclass instance initialiser and constructor, then the subclass\'s — <strong>B C E F</strong>. The second construction repeats only the instance half, because the classes are already initialised. The rule to carry: <em>static once, superclass first; instance every time, superclass first.</em></p>'
                    }
                },
                {
                    type: 'predict',
                    id: 'predict-java-core-static-method-hiding',
                    importance: 'should-know',
                    artefact: 'stdout',
                    language: 'java',
                    title: 'One is overridden, one is hidden',
                    prompt: '<p>The same reference, two calls.</p>',
                    code: 'public class Main {\n    static class Parent {\n        static String who()  { return "parent-static"; }\n        String        name() { return "parent"; }\n    }\n    static class Child extends Parent {\n        static String who()  { return "child-static"; }\n        @Override String name() { return "child"; }\n    }\n    public static void main(String[] args) {\n        Parent p = new Child();\n        System.out.println(p.name());\n        System.out.println(p.who());\n    }\n}',
                    options: ['child\\nparent-static', 'child\\nchild-static', 'parent\\nparent-static', 'parent\\nchild-static'],
                    answer: 0,
                    output: {
                        kind: 'stdout',
                        lines: ['child', 'parent-static'],
                        explain: '<p>Instance methods are dispatched on the runtime type; static methods are not dispatched at all. <code>p.who()</code> is resolved at compile time from the DECLARED type of <code>p</code>, so it calls <code>Parent.who()</code> — the child\'s version hides it rather than overriding it. Calling a static through an instance reference is legal, produces a warning, and is exactly the confusion this puzzle is made of.</p>'
                    }
                }
            ],
            docs: [
                { title: 'JLS 12.4 — Initialization of classes and interfaces', url: 'https://docs.oracle.com/javase/specs/jls/se21/html/jls-12.html#jls-12.4', kind: 'spec' },
                { title: 'JLS 8.4.8.2 — Hiding by class methods', url: 'https://docs.oracle.com/javase/specs/jls/se21/html/jls-8.html#jls-8.4.8.2', kind: 'spec' }
            ],
            relatedQuestions: [{ topicId: 'java-language', questionId: 'initialisation-order' }]
        },

        {
            id: 'arithmetic-and-dispatch',
            title: 'Arithmetic and Overload Resolution',
            importance: 'should-know',
            summary: 'Silent overflow, a char that is a number, and the overload the compiler picks when two match.',
            interviewAngle: 'The varargs one comes up in code review more often than in interviews, and knowing that fixed arity wins is what stops an accidental behaviour change.',
            buildsOn: ['control-flow-and-initialisation'],
            blocks: [
                {
                    type: 'predict',
                    id: 'predict-java-core-integer-overflow-in-a-loop',
                    importance: 'must-know',
                    artefact: 'stdout',
                    language: 'java',
                    title: 'A loop condition that is never false',
                    prompt: '<p>The break is doing real work here. What is printed?</p>',
                    code: 'public class Main {\n    public static void main(String[] args) {\n        int count = 0;\n        for (int i = Integer.MAX_VALUE - 2; i <= Integer.MAX_VALUE; i++) {\n            count++;\n            if (count > 5) break;\n        }\n        System.out.println(count);\n    }\n}',
                    options: ['6', '3', '4', 'the program never terminates'],
                    answer: 0,
                    output: {
                        kind: 'stdout',
                        lines: ['6'],
                        explain: '<p><code>i &lt;= Integer.MAX_VALUE</code> is a tautology: no <code>int</code> is ever greater. Incrementing past <code>MAX_VALUE</code> wraps to <code>MIN_VALUE</code> silently — Java has no overflow check — and the loop runs forever. Without the break this program would not terminate; with it, the counter reaches 6. <code>Math.addExact</code> throws instead, and exists for exactly this.</p>'
                    }
                },
                {
                    type: 'predict',
                    id: 'predict-java-core-char-plus-int-arithmetic',
                    importance: 'should-know',
                    artefact: 'stdout',
                    language: 'java',
                    title: 'When a char stops being a character',
                    prompt: '<p>Four lines. Two of them are arithmetic and two are not.</p>',
                    code: 'public class Main {\n    public static void main(String[] args) {\n        char c = \'a\';\n        System.out.println(c + 1);\n        System.out.println((char) (c + 1));\n        System.out.println("" + c + 1);\n        System.out.println(\'a\' + \'b\');\n    }\n}',
                    options: ['98\\nb\\na1\\n195', 'a1\\nb\\na1\\nab', '98\\nb\\na1\\nab', 'b\\nb\\na1\\n195'],
                    answer: 0,
                    output: {
                        kind: 'stdout',
                        lines: ['98', 'b', 'a1', '195'],
                        explain: '<p><code>char</code> is an unsigned 16-bit integer with a printing convention. Binary numeric promotion turns <code>c + 1</code> into <code>int</code>, so it prints 98. The cast puts it back. The third line starts with a <code>String</code>, so <code>+</code> is concatenation all the way along. The fourth promotes both operands: 97 + 98.</p>'
                    }
                },
                {
                    type: 'predict',
                    id: 'predict-java-core-varargs-vs-array-overload',
                    importance: 'should-know',
                    artefact: 'stdout',
                    language: 'java',
                    title: 'Which overload wins',
                    prompt: '<p>Two applicable overloads and three calls.</p>',
                    code: 'public class Main {\n    static void f(Object a, Object b) { System.out.println("pair"); }\n    static void f(Object... args)     { System.out.println("varargs " + args.length); }\n\n    public static void main(String[] args) {\n        f("x", "y");\n        f("x", "y", "z");\n        f((Object[]) new String[] { "x", "y" });\n    }\n}',
                    options: ['pair\\nvarargs 3\\nvarargs 2', 'varargs 2\\nvarargs 3\\nvarargs 2', 'pair\\nvarargs 3\\npair', 'varargs 2\\nvarargs 3\\npair'],
                    answer: 0,
                    output: {
                        kind: 'stdout',
                        lines: ['pair', 'varargs 3', 'varargs 2'],
                        explain: '<p>Overload resolution runs in three phases and varargs are considered only in the third, after every fixed-arity candidate has failed. So the two-argument call binds to <code>f(Object, Object)</code>. The consequence that matters in real code: <strong>adding a fixed-arity overload silently steals calls from an existing varargs method</strong>, with no error and no warning at the call site.</p>'
                    }
                }
            ],
            docs: [
                { title: 'JLS 15.12.2 — Compile-time step 2: determine method signature', url: 'https://docs.oracle.com/javase/specs/jls/se21/html/jls-15.html#jls-15.12.2', kind: 'spec' },
                { title: 'Math.addExact — javadoc', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Math.html#addExact(int,int)', kind: 'api' }
            ],
            relatedQuestions: []
        }
    ]
};
