/* ==========================================================================
   data/java-language.js — Java Language & OOP

   Forty-five questions in five subsections. The four from the manifest, plus
   `errors`: the exception hierarchy is in this topic's keyTopics and it does
   not belong under "OOP & Design" or under "equals, hashCode & Immutability".
   Filing it in either would have made the heading a lie in order to keep the
   count of subsections at four.

   ORDERING RULE. Questions appear in the order a reader would want them, and
   a subsection is CONTIGUOUS: the renderer emits a heading where the value
   changes rather than grouping, so that the card numbers stay ascending down
   the page. A subsection that appears twice would print its heading twice.

   ONE GLOBAL PER FILE. That is the whole module system.
   ========================================================================== */

const javaLanguageData = {
    id: 'java-language',
    title: 'Java Language & OOP',
    subsections: [
        { id: 'oop',             title: 'OOP & Design' },
        { id: 'object-contract', title: 'equals, hashCode & Immutability' },
        { id: 'generics',        title: 'Generics & Erasure' },
        { id: 'modern',          title: 'Records, Sealed Types & Pattern Matching' },
        { id: 'errors',          title: 'Exceptions & Errors' }
    ],
    keyTopics: [
        'inheritance vs composition', 'abstract class vs interface',
        'equals/hashCode contract', 'immutability', 'generics erasure',
        'variance', 'records', 'sealed interfaces',
        'pattern matching for switch', 'exception hierarchy'
    ],
    questions: [

/* ==== OOP & Design ==================================================== */

{
    id: 'inheritance-vs-composition',
    importance: 'must-know',
    subsection: 'oop',
    question: 'When would you choose composition over inheritance, and what actually goes wrong if you get it backwards?',
    answer:
        '<p>The short rule is that inheritance expresses <strong>is-a</strong> and composition ' +
        'expresses <strong>has-a</strong>, but that rule is too weak to decide real cases. The ' +
        'useful test is: <em>would every future change to the superclass be a change you want ' +
        'in the subclass?</em> If the answer is anything but yes, you want composition.</p>' +
        '<p>What goes wrong with inheritance is that it is the strongest coupling the language ' +
        'has. A subclass depends on the superclass implementation, not merely its signature:</p>' +
        '<ul>' +
        '<li><strong>Self-use is invisible.</strong> If a superclass method calls another of its ' +
        'own public methods, overriding the second one changes the first. Nothing in the ' +
        'signature says so, and the superclass author is free to stop doing it in the next ' +
        'release.</li>' +
        '<li><strong>The API is inherited whole.</strong> Extending <code>HashMap</code> means ' +
        'every caller can reach every map method, including the ones that break your invariant.</li>' +
        '<li><strong>You get one parent.</strong> A class that already extends something cannot ' +
        'extend another, so the first inheritance decision spends the budget.</li>' +
        '<li><strong>It is fixed at compile time.</strong> Composition can be reconfigured, ' +
        'decorated, and swapped in a test.</li>' +
        '</ul>' +
        '<p>The counter-case is real: inheritance inside one codebase, where you control both ' +
        'sides and the superclass is designed and documented for extension, is fine and often ' +
        'clearer. The rule is about inheriting across a boundary you do not own.</p>',
    referenceLinks: [
        { title: 'Inheritance — The Java Tutorials', url: 'https://docs.oracle.com/javase/tutorial/java/IandI/subclasses.html' }
    ],
    tags: ['oop', 'design', 'coupling'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: [
        {
            language: 'java',
            title: 'The counting set that counts twice',
            code:
                'import java.util.*;\n' +
                '\n' +
                'public class Counting {\n' +
                '    // The classic broken version: it extends HashSet, and HashSet.addAll()\n' +
                '    // is implemented by calling add() on itself.\n' +
                '    static class CountingSet<E> extends HashSet<E> {\n' +
                '        int added = 0;\n' +
                '\n' +
                '        @Override public boolean add(E e) {\n' +
                '            added++;\n' +
                '            return super.add(e);\n' +
                '        }\n' +
                '\n' +
                '        @Override public boolean addAll(Collection<? extends E> c) {\n' +
                '            added += c.size();\n' +
                '            return super.addAll(c);\n' +
                '        }\n' +
                '    }\n' +
                '\n' +
                '    public static void main(String[] args) {\n' +
                '        CountingSet<String> set = new CountingSet<>();\n' +
                '        set.addAll(List.of("a", "b", "c"));\n' +
                '        System.out.println(set.added);\n' +
                '        System.out.println(set.size());\n' +
                '    }\n' +
                '}',
            output: {
                kind: 'stdout',
                lines: ['6', '3'],
                explain:
                    '<p>Three elements went in and the counter says six. <code>addAll()</code> ' +
                    'added three, then delegated to <code>super.addAll()</code>, which is ' +
                    'implemented by calling <code>add()</code> once per element — and ' +
                    '<code>add()</code> is overridden, so it counted them again.</p>' +
                    '<p>Nothing in the <code>HashSet</code> signature said <code>addAll()</code> ' +
                    'calls <code>add()</code>. A composed version that holds a set in a field ' +
                    'and forwards to it cannot have this bug, because there is no self-use to ' +
                    'be surprised by.</p>'
            }
        }
    ]
},

{
    id: 'abstract-class-vs-interface',
    importance: 'must-know',
    subsection: 'oop',
    question: 'Abstract class or interface — what is the decision, now that interfaces have default methods?',
    answer:
        '<p>Default methods removed the old answer, which was "an interface cannot have code". ' +
        'Three real differences remain:</p>' +
        '<ul>' +
        '<li><strong>State.</strong> An abstract class can hold instance fields. An interface ' +
        'cannot — only <code>public static final</code> constants. This is the big one, and ' +
        'everything else follows from it.</li>' +
        '<li><strong>Constructors.</strong> An abstract class has one and can enforce an ' +
        'invariant at construction. An interface has none.</li>' +
        '<li><strong>Number.</strong> A class extends one abstract class and implements as many ' +
        'interfaces as it likes.</li>' +
        '</ul>' +
        '<p>Access modifiers are now a smaller difference than people remember: since Java 9 an ' +
        'interface may have <code>private</code> methods, so a default method can factor out a ' +
        'helper without exposing it. What an interface still cannot have is a ' +
        '<code>protected</code> member.</p>' +
        '<p>The decision in practice: <strong>interface for a capability, abstract class for a ' +
        'partial implementation with state.</strong> "Can be compared", "can be closed", "can ' +
        'handle a request" are interfaces. "Is a request handler that already owns a thread ' +
        'pool and a retry counter" is an abstract class. If in doubt, publish the interface and ' +
        'keep the abstract class package-private as an implementation convenience — that way ' +
        'callers depend on the capability and not on your fields.</p>',
    referenceLinks: [
        { title: 'Default Methods — The Java Tutorials', url: 'https://docs.oracle.com/javase/tutorial/java/IandI/defaultmethods.html' }
    ],
    tags: ['oop', 'interfaces', 'design'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'default-methods-and-the-diamond',
    importance: 'should-know',
    subsection: 'oop',
    question: 'If two interfaces provide the same default method, which one wins?',
    answer:
        '<p>Neither. <strong>It does not compile</strong>, and that is the whole design: Java ' +
        'refuses to pick for you, so the ambiguity is a compile error rather than a runtime ' +
        'surprise. This is what "multiple inheritance of behaviour without multiple inheritance ' +
        'of state" costs, and it is a cheap price.</p>' +
        '<p>Three resolution rules apply, in order:</p>' +
        '<ul>' +
        '<li><strong>Classes win over interfaces.</strong> A method inherited from a superclass ' +
        'beats any default method. This is why adding a default method to an interface cannot ' +
        'change the behaviour of a class that already had a concrete method with that ' +
        'signature.</li>' +
        '<li><strong>The most specific interface wins.</strong> If one of the two interfaces ' +
        'extends the other, the sub-interface\'s default is used.</li>' +
        '<li><strong>Otherwise you must override.</strong> The class declares the method itself, ' +
        'and can delegate explicitly with <code>Interface.super.method()</code>.</li>' +
        '</ul>',
    referenceLinks: [],
    tags: ['oop', 'interfaces', 'default-methods'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: [
        {
            language: 'java',
            title: 'Disambiguating with Interface.super',
            code:
                'interface Audited {\n' +
                '    default String describe() { return "audited"; }\n' +
                '}\n' +
                '\n' +
                'interface Cached {\n' +
                '    default String describe() { return "cached"; }\n' +
                '}\n' +
                '\n' +
                '// Without the override this is:\n' +
                '//   error: class Repo inherits unrelated defaults for describe()\n' +
                '//   from types Audited and Cached\n' +
                'class Repo implements Audited, Cached {\n' +
                '    @Override public String describe() {\n' +
                '        return Audited.super.describe() + " + " + Cached.super.describe();\n' +
                '    }\n' +
                '}',
            output: {
                kind: 'trace',
                lines: [
                    'Both interfaces contribute a default describe() with the same signature.',
                    'Neither extends the other, so the most-specific rule cannot break the tie.',
                    'No superclass supplies a concrete describe(), so the class-wins rule does not apply.',
                    'The compiler therefore refuses the class until it declares describe() itself.',
                    'Interface.super.describe() names one implementation explicitly, which resolves it.'
                ],
                explain:
                    '<p>The error names both interfaces, which makes it one of the more helpful ' +
                    'messages in the language. The point to make in an interview is that the ' +
                    'ambiguity is caught at compile time rather than resolved by an arbitrary ' +
                    'rule such as declaration order.</p>'
            }
        }
    ]
},

{
    id: 'overloading-vs-overriding',
    importance: 'must-know',
    subsection: 'oop',
    question: 'What is the difference between overloading and overriding, and which one is resolved at runtime?',
    answer:
        '<p><strong>Overriding</strong> is one method, two implementations, chosen by the ' +
        '<em>runtime</em> type of the receiver. This is dynamic dispatch, and it is the ' +
        'mechanism behind polymorphism.</p>' +
        '<p><strong>Overloading</strong> is several different methods that happen to share a ' +
        'name, chosen by the <em>compile-time</em> types of the arguments. The decision is baked ' +
        'into the bytecode; nothing about it is dynamic.</p>' +
        '<p>That asymmetry is the whole question, and it is where the bugs live. A variable ' +
        'declared as <code>Object</code> that holds a <code>String</code> will call ' +
        '<code>doThing(Object)</code>, not <code>doThing(String)</code> — the compiler only knew ' +
        'about the declared type.</p>' +
        '<p>Two related rules worth having ready:</p>' +
        '<ul>' +
        '<li>An override may not narrow visibility, and may not add checked exceptions the ' +
        'overridden method did not declare.</li>' +
        '<li>Overloads are resolved by a three-phase search: exact and widening first, then ' +
        'boxing, then varargs. That order is why <code>f(int)</code> beats ' +
        '<code>f(Integer)</code> and both beat <code>f(int...)</code>.</li>' +
        '</ul>',
    referenceLinks: [
        { title: 'Overriding and Hiding Methods — The Java Tutorials', url: 'https://docs.oracle.com/javase/tutorial/java/IandI/override.html' }
    ],
    tags: ['oop', 'polymorphism', 'dispatch'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: [
        {
            language: 'java',
            title: 'The declared type decides',
            code:
                'public class Dispatch {\n' +
                '    static String describe(Object o) { return "Object"; }\n' +
                '    static String describe(String s) { return "String"; }\n' +
                '\n' +
                '    static class Base   { String name() { return "Base"; } }\n' +
                '    static class Sub extends Base { @Override String name() { return "Sub"; } }\n' +
                '\n' +
                '    public static void main(String[] args) {\n' +
                '        Object o = "hello";        // runtime type String, declared type Object\n' +
                '        System.out.println(describe(o));\n' +
                '        System.out.println(describe("hello"));\n' +
                '\n' +
                '        Base b = new Sub();        // runtime type Sub, declared type Base\n' +
                '        System.out.println(b.name());\n' +
                '    }\n' +
                '}',
            output: {
                kind: 'stdout',
                lines: ['Object', 'String', 'Sub'],
                explain:
                    '<p>The same object produces two different overloads depending only on how ' +
                    'the variable was declared, while the override ignores the declared type ' +
                    'entirely. One decision was made by the compiler and the other by the JVM.</p>'
            }
        }
    ]
},

{
    id: 'static-binding-vs-dynamic-dispatch',
    importance: 'should-know',
    subsection: 'oop',
    question: 'Can you override a static method? What about a field?',
    answer:
        '<p>No to both, and the words for what happens instead are worth knowing because ' +
        'interviewers use them.</p>' +
        '<p>A static method with the same signature in a subclass <strong>hides</strong> the ' +
        'superclass method. Which one runs is decided by the compile-time type, so ' +
        '<code>Base b = new Sub(); b.staticMethod();</code> calls <code>Base</code>\'s — and ' +
        'most compilers warn that you are calling a static method through an instance ' +
        'reference at all.</p>' +
        '<p>A field with the same name <strong>shadows</strong> the superclass field. Both ' +
        'fields exist in the object; which one you read depends on the type of the expression ' +
        'you read it through. Two variables pointing at the same object can disagree about the ' +
        'value of the same field name, which is why this is a thing to recognise in a puzzle ' +
        'and never to write.</p>' +
        '<p>Only instance methods are virtual. <code>private</code>, <code>static</code> and ' +
        '<code>final</code> methods are all statically bound, which is also why they are the ' +
        'ones a JIT can inline most aggressively.</p>',
    referenceLinks: [],
    tags: ['oop', 'dispatch', 'static'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: [
        {
            language: 'java',
            title: 'Hiding and shadowing',
            code:
                'public class Hiding {\n' +
                '    static class Base {\n' +
                '        static String who() { return "Base.who"; }\n' +
                '        String label = "Base.label";\n' +
                '    }\n' +
                '\n' +
                '    static class Sub extends Base {\n' +
                '        static String who() { return "Sub.who"; }\n' +
                '        String label = "Sub.label";\n' +
                '    }\n' +
                '\n' +
                '    public static void main(String[] args) {\n' +
                '        Sub sub = new Sub();\n' +
                '        Base asBase = sub;         // same object, different declared type\n' +
                '\n' +
                '        System.out.println(asBase.label);\n' +
                '        System.out.println(sub.label);\n' +
                '        System.out.println(Base.who());\n' +
                '        System.out.println(Sub.who());\n' +
                '    }\n' +
                '}',
            output: {
                kind: 'stdout',
                lines: ['Base.label', 'Sub.label', 'Base.who', 'Sub.who'],
                explain:
                    '<p>One object, two answers for <code>label</code>. Both fields are present ' +
                    'in the instance and the declared type of the reference picks which one is ' +
                    'read. Nothing here is polymorphic.</p>'
            }
        }
    ]
},

{
    id: 'initialisation-order',
    importance: 'should-know',
    subsection: 'oop',
    question: 'In what order do static blocks, instance initialisers, field initialisers and constructors run?',
    answer:
        '<p>Two separate sequences. The static one runs once, when the class is initialised; the ' +
        'instance one runs on every construction.</p>' +
        '<p><strong>Class initialisation, once:</strong> superclass static initialisation, then ' +
        'this class\'s static field initialisers and <code>static { }</code> blocks in source ' +
        'order.</p>' +
        '<p><strong>Every <code>new</code>:</strong> the constructor first delegates — ' +
        '<code>this(...)</code> or an explicit or implicit <code>super(...)</code> — so the ' +
        'superclass is fully built before anything of yours runs. Then this class\'s instance ' +
        'field initialisers and <code>{ }</code> blocks run in source order, and only then does ' +
        'the constructor body execute.</p>' +
        '<p>The trap this creates is the one worth remembering: <strong>a superclass ' +
        'constructor that calls an overridable method sees the subclass override running ' +
        'against uninitialised fields.</strong> The subclass field initialisers have not run ' +
        'yet, so a <code>final</code> field can be observed as <code>null</code> or ' +
        '<code>0</code> — a state that is impossible anywhere else in the object\'s life. Never ' +
        'call an overridable method from a constructor.</p>',
    referenceLinks: [],
    tags: ['oop', 'initialisation', 'constructors'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: [
        {
            language: 'java',
            title: 'The override that runs too early',
            code:
                'public class TooEarly {\n' +
                '    static class Base {\n' +
                '        Base() {\n' +
                '            System.out.println("Base constructor");\n' +
                '            report();                 // overridable, and that is the bug\n' +
                '        }\n' +
                '        void report() { System.out.println("Base.report"); }\n' +
                '    }\n' +
                '\n' +
                '    static class Sub extends Base {\n' +
                '        // NOT a literal. A `private final String` initialised from a\n' +
                '        // constant expression is a compile-time constant, and javac\n' +
                '        // inlines those at every use site — the override below would\n' +
                '        // then print the text and the hazard would be invisible.\n' +
                '        private final String name = label();\n' +
                '\n' +
                '        Sub() {\n' +
                '            super();\n' +
                '            System.out.println("Sub constructor, name = " + name);\n' +
                '        }\n' +
                '\n' +
                '        @Override void report() {\n' +
                '            System.out.println("Sub.report, name = " + name);\n' +
                '        }\n' +
                '\n' +
                '        private static String label() { return "set by the field initialiser"; }\n' +
                '    }\n' +
                '\n' +
                '    public static void main(String[] args) {\n' +
                '        new Sub();\n' +
                '    }\n' +
                '}',
            output: {
                kind: 'stdout',
                lines: [
                    'Base constructor',
                    'Sub.report, name = null',
                    'Sub constructor, name = set by the field initialiser'
                ],
                explain:
                    '<p>A <code>final</code> field observed as <code>null</code>. The override ' +
                    'ran during <code>super()</code>, before the subclass field initialisers ' +
                    'had executed, so the object was in a state it can never be in again.</p>'
            }
        }
    ]
},

{
    id: 'final-three-meanings',
    importance: 'should-know',
    subsection: 'oop',
    question: 'What does final mean on a variable, a method and a class — and what does it not mean?',
    answer:
        '<ul>' +
        '<li><strong>On a variable:</strong> the binding is assigned once. For a reference, ' +
        'that means the reference cannot be repointed. It says nothing about the object.</li>' +
        '<li><strong>On a method:</strong> it cannot be overridden. This is how a class ' +
        'protects an invariant that depends on a method behaving a particular way.</li>' +
        '<li><strong>On a class:</strong> it cannot be extended. <code>String</code> is final, ' +
        'and that is load-bearing — an overridable <code>String</code> could return different ' +
        'characters on the second read, which would break every security check written as ' +
        '"validate, then use".</li>' +
        '</ul>' +
        '<p>What it does not mean is immutability. <code>final List&lt;String&gt; names = new ' +
        'ArrayList&lt;&gt;();</code> is a constant reference to a mutable object, and ' +
        '<code>names.add("x")</code> compiles. Immutability is a property of the object; ' +
        '<code>final</code> is a property of the variable.</p>' +
        '<p>One thing it does mean that people miss: a <code>final</code> field assigned in the ' +
        'constructor gets a <strong>freeze action</strong> at the end of that constructor. Any ' +
        'thread that sees the object through a properly published reference is guaranteed to ' +
        'see the fully initialised final fields, without synchronisation. Non-final fields carry ' +
        'no such guarantee. This is the reason immutable objects are safe to share.</p>',
    referenceLinks: [
        { title: 'JLS 17.5 — final Field Semantics', url: 'https://docs.oracle.com/javase/specs/jls/se25/html/jls-17.html#jls-17.5' }
    ],
    tags: ['oop', 'final', 'immutability', 'memory-model'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'static-nested-vs-inner',
    importance: 'should-know',
    subsection: 'oop',
    question: 'What is the difference between a static nested class and an inner class, and why does it matter for memory?',
    answer:
        '<p>An <strong>inner class</strong> — a nested class without <code>static</code> — holds ' +
        'a hidden reference to the instance of the enclosing class that created it — <em>if it ' +
        'uses that instance</em>. That is how ' +
        'it can read the outer object\'s fields. A <strong>static nested class</strong> does not ' +
        'and cannot; it is simply a class that happens to be namespaced inside another.</p>' +
        '<p>The memory consequence is the practical one. If an inner-class instance outlives its ' +
        'enclosing object — parked in a static registry, handed to an executor, kept as a ' +
        'listener — it keeps the entire enclosing object reachable, along with everything the ' +
        'enclosing object references. This is one of the more common causes of a leak that ' +
        'looks inexplicable in a heap dump: the retained set is enormous and the obvious owner ' +
        'is long gone.</p>' +
        '<p>Anonymous classes and non-static lambdas that capture <code>this</code> have exactly ' +
        'the same property. A lambda that captures nothing from the enclosing instance does ' +
        'not, which is one reason a lambda is usually the lighter choice.</p>' +
        '<p>That condition is where the popular answer is wrong. <strong>javac emits the ' +
        'synthetic field only when the inner class actually reads something from its ' +
        'enclosing instance.</strong> An inner class that never touches its outer has no ' +
        'such field and retains nothing — which is also the sign that it should have been ' +
        '<code>static</code> all along. The field is named <code>this$0</code>, and ' +
        'reflecting over <code>getDeclaredFields()</code> is how you confirm whether a given ' +
        'class carries one.</p>' +
        '<p><strong>Default to <code>static</code>.</strong> Make it an inner class only when it ' +
        'genuinely needs the outer instance.</p>',
    referenceLinks: [
        { title: 'Nested Classes — The Java Tutorials', url: 'https://docs.oracle.com/javase/tutorial/java/javaOO/nested.html' }
    ],
    tags: ['oop', 'nested-classes', 'memory-leak'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'access-modifiers',
    importance: 'good-to-know',
    subsection: 'oop',
    question: 'What are the four access levels, and when is package-private the right answer?',
    answer:
        '<p>From most to least visible: <code>public</code>, <code>protected</code>, ' +
        '<em>package-private</em> (the default, written by writing nothing), and ' +
        '<code>private</code>.</p>' +
        '<p>The one people misremember is <code>protected</code>: it means "this package, plus ' +
        'subclasses anywhere". It is therefore <em>wider</em> than package-private, not ' +
        'narrower. A <code>protected</code> member is part of your published API for anyone ' +
        'willing to subclass, and you have to keep it working forever.</p>' +
        '<p>Package-private is the underused one. It is exactly right for a class that several ' +
        'classes in one package share but that nobody outside should see — a package-private ' +
        'abstract base, a package-private helper, a package-private constructor with a public ' +
        'static factory. Combined with package-by-feature, it gives you real module boundaries ' +
        'without any module system at all, and it is the cheapest way to keep a refactor local.</p>',
    referenceLinks: [],
    tags: ['oop', 'encapsulation', 'api-design'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'covariant-return-types',
    importance: 'good-to-know',
    subsection: 'oop',
    question: 'Can an overriding method change its return type?',
    answer:
        '<p>It can narrow it. An override may return a subtype of what the overridden method ' +
        'returned — a <strong>covariant return type</strong> — and this has been legal since ' +
        'Java 5. It cannot widen it, because a caller holding the supertype reference is ' +
        'entitled to the declared return type.</p>' +
        '<p>The everyday use is in builders and factories, where each subclass wants to return ' +
        'its own type so that a caller does not have to cast. <code>Object.clone()</code> ' +
        'returning <code>Object</code> is the historical reason the feature was added.</p>' +
        '<p>Parameters do <em>not</em> work this way. Changing a parameter type produces an ' +
        'overload, not an override — which is why <code>@Override</code> is worth writing on ' +
        'every override you intend: it turns a silent accidental overload into a compile error. ' +
        'The classic instance is <code>equals(MyType other)</code>, which compiles perfectly, ' +
        'is never called by any collection, and is caught immediately by the annotation.</p>',
    referenceLinks: [],
    tags: ['oop', 'overriding', 'variance'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'why-no-multiple-inheritance-of-state',
    importance: 'good-to-know',
    subsection: 'oop',
    question: 'Why does Java allow multiple inheritance of interfaces but not of classes?',
    answer:
        '<p>Because the problem is <strong>state</strong>, not behaviour. If a class could ' +
        'inherit from two classes that both extend a common ancestor, the object would contain ' +
        'two copies of that ancestor\'s fields — the diamond problem. Every language that ' +
        'allows it needs a rule for which copy you get, and those rules are famously difficult ' +
        'to reason about.</p>' +
        '<p>Interfaces have no instance fields, so there is nothing to duplicate. Inheriting ' +
        'two interfaces gives you at worst two candidate implementations of one method, and ' +
        'Java resolves that by refusing to compile until you say which you meant — an ' +
        'ambiguity the programmer settles at build time rather than one the language settles ' +
        'silently at run time.</p>' +
        '<p>The honest summary for an interview: default methods gave Java multiple inheritance ' +
        'of <em>behaviour</em> in Java 8, deliberately and carefully, while continuing to refuse ' +
        'multiple inheritance of <em>state</em>. The whole design of default methods — including ' +
        'the rule that a class method always wins — exists so that adding one to an existing ' +
        'interface cannot break an implementation that already compiled.</p>',
    referenceLinks: [],
    tags: ['oop', 'inheritance', 'language-design'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

/* ==== equals, hashCode & Immutability ================================= */

{
    id: 'equals-hashcode-contract',
    importance: 'must-know',
    subsection: 'object-contract',
    question: 'What is the contract between equals() and hashCode(), and what breaks when you override only one?',
    answer:
        '<p>The contract has three parts, and only the second one is the source of interview ' +
        'questions:</p>' +
        '<ul>' +
        '<li><strong>Consistency.</strong> Calling <code>hashCode()</code> twice on an ' +
        'unmodified object returns the same value.</li>' +
        '<li><strong>Equal implies same hash.</strong> If <code>a.equals(b)</code> is true then ' +
        '<code>a.hashCode() == b.hashCode()</code> must be true.</li>' +
        '<li><strong>Unequal does not imply different hash.</strong> Two unequal objects ' +
        '<em>may</em> share a hash. That is a collision, and it is legal.</li>' +
        '</ul>' +
        '<p>Overriding <code>equals()</code> alone is the damaging direction. Two objects that ' +
        'are now equal still return the identity hashes they were born with, so a ' +
        '<code>HashMap</code> puts them in different buckets and never compares them. The map ' +
        'contains your key and cannot find it — and it reports the wrong answer rather than ' +
        'throwing, which is why this survives into production.</p>' +
        '<p>Overriding <code>hashCode()</code> alone is merely useless: equality still falls ' +
        'back to reference identity, so the map behaves exactly as it did before.</p>' +
        '<p><code>equals()</code> itself must also be reflexive, symmetric, transitive and ' +
        'consistent, and <code>x.equals(null)</code> must be false. Symmetry and transitivity ' +
        'are the two that inheritance breaks.</p>',
    referenceLinks: [
        { title: 'Object.hashCode() — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/Object.html#hashCode()' },
        { title: 'Object.equals() — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/Object.html#equals(java.lang.Object)' }
    ],
    tags: ['object-contract', 'collections', 'hashing'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: [
        {
            language: 'java',
            title: 'The key the map cannot find',
            code:
                'import java.util.HashMap;\n' +
                'import java.util.Map;\n' +
                '\n' +
                'public class Contract {\n' +
                '    static final class Sku {\n' +
                '        private final String code;\n' +
                '        Sku(String code) { this.code = code; }\n' +
                '\n' +
                '        @Override public boolean equals(Object other) {\n' +
                '            return other instanceof Sku s && s.code.equals(code);\n' +
                '        }\n' +
                '        // hashCode() is deliberately NOT overridden.\n' +
                '    }\n' +
                '\n' +
                '    public static void main(String[] args) {\n' +
                '        Map<Sku, Integer> stock = new HashMap<>();\n' +
                '        stock.put(new Sku("A-1"), 7);\n' +
                '\n' +
                '        System.out.println(new Sku("A-1").equals(new Sku("A-1")));\n' +
                '        System.out.println(stock.get(new Sku("A-1")));\n' +
                '        System.out.println(stock.size());\n' +
                '    }\n' +
                '}',
            output: {
                kind: 'stdout',
                lines: ['true', 'null', '1'],
                explain:
                    '<p>The two <code>Sku</code> objects are equal and the map holds one entry, ' +
                    'yet the lookup returns <code>null</code>. The bucket was chosen from the ' +
                    'identity hash, so the map never reached the point of calling ' +
                    '<code>equals()</code> at all.</p>'
            }
        }
    ]
},

{
    id: 'equals-and-inheritance-symmetry',
    importance: 'should-know',
    subsection: 'object-contract',
    question: 'Why is it hard to write a correct equals() when a subclass adds a field?',
    answer:
        '<p>Because you have to choose between symmetry and the Liskov substitution principle, ' +
        'and you cannot have both.</p>' +
        '<p>Suppose <code>Point</code> has <code>x</code> and <code>y</code>, and ' +
        '<code>ColourPoint</code> adds a colour. If <code>ColourPoint.equals()</code> compares ' +
        'colour too, then <code>point.equals(colourPoint)</code> is true while ' +
        '<code>colourPoint.equals(point)</code> is false — <strong>symmetry broken</strong>. If ' +
        'it instead ignores colour when compared against a plain <code>Point</code>, symmetry ' +
        'holds but <strong>transitivity breaks</strong>: two differently coloured points are ' +
        'each equal to the same uncoloured point and not to each other.</p>' +
        '<p>The two honest ways out:</p>' +
        '<ul>' +
        '<li><strong><code>getClass() != o.getClass()</code> instead of ' +
        '<code>instanceof</code>.</strong> Symmetric and transitive, but it violates Liskov — a ' +
        'subclass instance is never equal to a superclass instance, so a Hibernate proxy or a ' +
        'CGLIB subclass is never equal to the entity it proxies. That failure mode is real and ' +
        'is worth naming.</li>' +
        '<li><strong>Composition instead of inheritance.</strong> <code>ColourPoint</code> holds ' +
        'a <code>Point</code> rather than extending it, and exposes <code>asPoint()</code>. The ' +
        'problem disappears because the two types are no longer comparable.</li>' +
        '</ul>' +
        '<p>The general rule: <strong>there is no way to extend an instantiable class with a ' +
        'value component and preserve the equals contract.</strong> This is also why records ' +
        'are final.</p>',
    referenceLinks: [],
    tags: ['object-contract', 'inheritance', 'liskov'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'mutable-key-in-a-hashmap',
    importance: 'must-know',
    subsection: 'object-contract',
    question: 'What happens if you mutate an object after using it as a HashMap key?',
    answer:
        '<p>The entry is lost. Not deleted — <em>lost</em>, which is worse.</p>' +
        '<p><code>HashMap</code> computes the bucket from the hash at <code>put()</code> time ' +
        'and stores the entry there. Mutating a field that <code>hashCode()</code> reads changes ' +
        'the hash, but the entry does not move; nothing tells the map anything happened. Now a ' +
        'lookup with the same object computes the <em>new</em> hash, goes to the wrong bucket, ' +
        'and finds nothing. Meanwhile <code>size()</code> still counts it, iteration still ' +
        'yields it, and <code>containsKey()</code> on the very object you are holding returns ' +
        'false.</p>' +
        '<p>This is the concrete reason the usual advice is <strong>keys must be ' +
        'immutable</strong>, or at least immutable in the fields that participate in ' +
        '<code>equals</code> and <code>hashCode</code>. <code>String</code>, the boxed ' +
        'primitives, <code>UUID</code>, enums and records over immutable components are all ' +
        'safe. A JPA entity whose id is assigned by the database on flush is the classic unsafe ' +
        'one: it goes into a <code>HashSet</code> with a null id and changes hash the moment it ' +
        'is persisted.</p>',
    referenceLinks: [
        { title: 'HashMap — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/HashMap.html' }
    ],
    tags: ['object-contract', 'collections', 'hashing', 'jpa'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: [
        {
            language: 'java',
            title: 'A key in a map that the map cannot see',
            code:
                'import java.util.*;\n' +
                '\n' +
                'public class MutableKey {\n' +
                '    static final class Tag {\n' +
                '        String name;\n' +
                '        Tag(String name) { this.name = name; }\n' +
                '\n' +
                '        @Override public boolean equals(Object o) {\n' +
                '            return o instanceof Tag t && Objects.equals(t.name, name);\n' +
                '        }\n' +
                '        @Override public int hashCode() { return Objects.hash(name); }\n' +
                '    }\n' +
                '\n' +
                '    public static void main(String[] args) {\n' +
                '        Tag tag = new Tag("draft");\n' +
                '        Map<Tag, String> map = new HashMap<>();\n' +
                '        map.put(tag, "value");\n' +
                '\n' +
                '        tag.name = "published";      // the hash changes; the bucket does not\n' +
                '\n' +
                '        System.out.println(map.containsKey(tag));\n' +
                '        System.out.println(map.get(tag));\n' +
                '        System.out.println(map.size());\n' +
                '        System.out.println(map.keySet().iterator().next().name);\n' +
                '    }\n' +
                '}',
            output: {
                kind: 'stdout',
                lines: ['false', 'null', '1', 'published'],
                explain:
                    '<p>The map does not contain the key, cannot return its value, still counts ' +
                    'it in <code>size()</code>, and will happily iterate to it. Four answers, ' +
                    'three of which contradict the first.</p>'
            }
        }
    ]
},

{
    id: 'comparable-vs-comparator',
    importance: 'must-know',
    subsection: 'object-contract',
    question: 'Comparable or Comparator — which do you implement, and when?',
    answer:
        '<p><code>Comparable</code> defines the type\'s <strong>natural ordering</strong>, and ' +
        'there is exactly one. Implement it when the type has an ordering nobody would argue ' +
        'with: <code>String</code> alphabetically, <code>BigDecimal</code> numerically, a date ' +
        'chronologically. It lives on the class.</p>' +
        '<p><code>Comparator</code> is an ordering supplied from outside, and there can be any ' +
        'number of them. Use it for every ordering that is a policy rather than a property — by ' +
        'price, by name then id, by status with a custom rank. It lives with the caller, which ' +
        'means it can be different in two places without either being wrong.</p>' +
        '<p>Modern <code>Comparator</code> is built by composition and reads well: ' +
        '<code>comparing(Order::total).thenComparing(Order::id).reversed()</code>. Two details ' +
        'worth having ready:</p>' +
        '<ul>' +
        '<li><code>reversed()</code> applies to the whole chain built so far, not to the last ' +
        'link — a common source of surprise.</li>' +
        '<li><code>nullsFirst()</code> and <code>nullsLast()</code> exist because a comparator ' +
        'that dereferences a null throws from inside the sort, where the stack trace tells you ' +
        'nothing about which element was at fault.</li>' +
        '</ul>' +
        '<p>Both must be transitive and antisymmetric. <code>Arrays.sort</code> uses TimSort, ' +
        'which detects an inconsistent comparator and throws <code>IllegalArgumentException: ' +
        'Comparison method violates its general contract!</code> — an error that appears only ' +
        'on large inputs, because on small ones TimSort takes a path that does not check.</p>',
    referenceLinks: [
        { title: 'Comparator — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/Comparator.html' }
    ],
    tags: ['object-contract', 'ordering', 'collections'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: [
        {
            language: 'java',
            title: 'reversed() applies to the whole chain',
            code:
                'import java.util.*;\n' +
                '\n' +
                'public class Ordering {\n' +
                '    record Order(String id, int total) { }\n' +
                '\n' +
                '    public static void main(String[] args) {\n' +
                '        List<Order> orders = new ArrayList<>(List.of(\n' +
                '                new Order("a", 50), new Order("b", 20), new Order("c", 50)));\n' +
                '\n' +
                '        orders.sort(Comparator.comparingInt(Order::total)\n' +
                '                              .thenComparing(Order::id)\n' +
                '                              .reversed());\n' +
                '\n' +
                '        orders.forEach(o -> System.out.println(o.id() + " " + o.total()));\n' +
                '    }\n' +
                '}',
            output: {
                kind: 'stdout',
                lines: ['c 50', 'a 50', 'b 20'],
                explain:
                    '<p>Both the total and the id are reversed. If the intent was "highest ' +
                    'total first, then id ascending", this is wrong, and it is wrong quietly. ' +
                    'The fix is to reverse the part you meant: ' +
                    '<code>comparingInt(Order::total).reversed().thenComparing(Order::id)</code>.</p>'
            }
        }
    ]
},

{
    id: 'compareto-consistent-with-equals',
    importance: 'should-know',
    subsection: 'object-contract',
    question: 'What does "consistent with equals" mean for compareTo(), and what breaks when it is not?',
    answer:
        '<p>It means <code>a.compareTo(b) == 0</code> exactly when <code>a.equals(b)</code>. The ' +
        '<code>Comparable</code> documentation <em>strongly recommends</em> it rather than ' +
        'requiring it, and then tells you precisely what you lose.</p>' +
        '<p>The sorted collections — <code>TreeSet</code>, <code>TreeMap</code> — use ' +
        '<code>compareTo</code> and never call <code>equals</code>. So when the two disagree, ' +
        'those collections stop obeying the <code>Set</code> and <code>Map</code> contracts, ' +
        'which are written in terms of <code>equals</code>. Two objects that are not equal but ' +
        'compare as zero: the set silently keeps only one of them.</p>' +
        '<p>The canonical example is <code>BigDecimal</code>. <code>new BigDecimal("1.0")</code> ' +
        'and <code>new BigDecimal("1.00")</code> compare as zero because they are numerically ' +
        'equal, but they are not <code>equals</code> because <code>equals</code> also compares ' +
        'the scale. Put both in a <code>HashSet</code> and you get two elements; put both in a ' +
        '<code>TreeSet</code> and you get one.</p>',
    referenceLinks: [
        { title: 'Comparable — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/Comparable.html' }
    ],
    tags: ['object-contract', 'ordering', 'collections'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: [
        {
            language: 'java',
            title: 'The same two values, two different set sizes',
            code:
                'import java.math.BigDecimal;\n' +
                'import java.util.*;\n' +
                '\n' +
                'public class Consistency {\n' +
                '    public static void main(String[] args) {\n' +
                '        BigDecimal a = new BigDecimal("1.0");\n' +
                '        BigDecimal b = new BigDecimal("1.00");\n' +
                '\n' +
                '        System.out.println(a.equals(b));\n' +
                '        System.out.println(a.compareTo(b));\n' +
                '        System.out.println(new HashSet<>(List.of(a, b)).size());\n' +
                '        System.out.println(new TreeSet<>(List.of(a, b)).size());\n' +
                '    }\n' +
                '}',
            output: {
                kind: 'stdout',
                lines: ['false', '0', '2', '1'],
                explain:
                    '<p>Two sets built from the same two values, holding different numbers of ' +
                    'elements. Neither is buggy — <code>BigDecimal</code> documents exactly ' +
                    'this — but code that assumes a <code>Set</code> is a <code>Set</code> ' +
                    'regardless of implementation is.</p>'
            }
        }
    ]
},

{
    id: 'immutability-recipe',
    importance: 'must-know',
    subsection: 'object-contract',
    question: 'How do you make a class properly immutable, and why is it worth the effort?',
    answer:
        '<p>Five steps, and the fourth is the one that gets skipped:</p>' +
        '<ul>' +
        '<li>Make the class <code>final</code>, or make every constructor private and use static ' +
        'factories. Otherwise a subclass can add mutable state.</li>' +
        '<li>Make every field <code>private final</code>.</li>' +
        '<li>Provide no setter and no method that changes state. Methods that would mutate ' +
        'return a new instance instead — <code>withDiscount()</code>, not ' +
        '<code>setDiscount()</code>.</li>' +
        '<li><strong>Defensively copy every mutable component, on the way in and on the way ' +
        'out.</strong> A <code>final</code> field pointing at an <code>ArrayList</code> is a ' +
        'constant reference to a mutable object, and the caller who passed it in still has a ' +
        'reference.</li>' +
        '<li>Do not let <code>this</code> escape during construction — no registering listeners, ' +
        'no starting threads, no calling overridable methods.</li>' +
        '</ul>' +
        '<p>The payoff is not tidiness. An immutable object is <strong>thread-safe with no ' +
        'synchronisation at all</strong>: there is no write to race with, and the ' +
        '<code>final</code> field freeze guarantees any thread that obtains the reference sees ' +
        'the fields fully initialised. It is safe as a map key, safe to cache, safe to share ' +
        'freely, and it needs no copy constructor because there is never a reason to copy it.</p>' +
        '<p>The cost is allocation, and it is usually much smaller than expected — short-lived ' +
        'objects die in the young generation, which is the cheapest thing a modern collector ' +
        'does.</p>',
    referenceLinks: [
        { title: 'A Strategy for Defining Immutable Objects — The Java Tutorials', url: 'https://docs.oracle.com/javase/tutorial/essential/concurrency/imstrat.html' }
    ],
    tags: ['object-contract', 'immutability', 'thread-safety'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'defensive-copying',
    importance: 'should-know',
    subsection: 'object-contract',
    question: 'Where exactly do you need a defensive copy, and why is a getter returning List.copyOf() not always enough?',
    answer:
        '<p>Two places, and both are needed: <strong>the constructor</strong>, so the caller ' +
        'cannot mutate your state through the reference they still hold, and <strong>the ' +
        'getter</strong>, so a caller cannot mutate it through the reference you just handed ' +
        'out. Copying in only one of the two leaves the door open on the other side.</p>' +
        '<p><code>List.copyOf()</code> handles both cheaply and returns an unmodifiable list, ' +
        'and it skips the copy when the argument is already an unmodifiable list of the same ' +
        'kind. What it does not do is deep-copy: the list is unmodifiable but the ' +
        '<em>elements</em> are whatever they were. A list of <code>Date</code> objects is still ' +
        'a list of mutable dates.</p>' +
        '<p>The usual resolution is not deep copying — that is expensive and hard to get right ' +
        '— but <strong>making the elements immutable too</strong>. This is one of the strongest ' +
        'arguments for <code>java.time</code>: every type in it is immutable, so a list of ' +
        '<code>Instant</code> is genuinely safe to hand out where a list of <code>Date</code> ' +
        'never was.</p>' +
        '<p>One more trap: copy <em>before</em> validating, not after. If you validate the ' +
        'caller\'s object and then copy it, a caller on another thread can change it in between ' +
        '— a time-of-check-to-time-of-use bug that has produced real CVEs.</p>',
    referenceLinks: [
        { title: 'List.copyOf — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/List.html#copyOf(java.util.Collection)' }
    ],
    tags: ['object-contract', 'immutability', 'defensive-copy'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: [
        {
            language: 'java',
            title: 'Immutable, except for the part that is not',
            code:
                'import java.util.*;\n' +
                '\n' +
                'public class NotQuiteImmutable {\n' +
                '    static final class Basket {\n' +
                '        private final List<String> items;\n' +
                '\n' +
                '        Basket(List<String> items) {\n' +
                '            this.items = items;              // no copy: the bug\n' +
                '        }\n' +
                '        List<String> items() { return items; }\n' +
                '    }\n' +
                '\n' +
                '    public static void main(String[] args) {\n' +
                '        List<String> caller = new ArrayList<>(List.of("apple"));\n' +
                '        Basket basket = new Basket(caller);\n' +
                '\n' +
                '        caller.add("stolen goods");          // mutating from outside\n' +
                '        System.out.println(basket.items());\n' +
                '\n' +
                '        basket.items().add("also this");     // mutating through the getter\n' +
                '        System.out.println(basket.items());\n' +
                '    }\n' +
                '}',
            output: {
                kind: 'stdout',
                lines: ['[apple, stolen goods]', '[apple, stolen goods, also this]'],
                explain:
                    '<p>Both fields are <code>final</code> and the class is <code>final</code>, ' +
                    'and it is still fully mutable from two directions. ' +
                    '<code>this.items = List.copyOf(items)</code> in the constructor closes both ' +
                    'of them at once, because the copy is unmodifiable.</p>'
            }
        }
    ]
},

{
    id: 'why-string-is-immutable',
    importance: 'must-know',
    subsection: 'object-contract',
    question: 'Why is String immutable, and what would break if it were not?',
    answer:
        '<p>Four reasons, and the security one is the one that makes it non-negotiable:</p>' +
        '<ul>' +
        '<li><strong>Security.</strong> Filenames, URLs, class names and connection strings all ' +
        'travel as strings. Every security check in the platform is "validate the string, then ' +
        'use it". If the string could change in between, a caller could pass a harmless path, ' +
        'wait for the check to pass, and mutate it to <code>/etc/passwd</code> before the open. ' +
        'This is why <code>String</code> is also <code>final</code>: a mutable subclass would ' +
        'reintroduce the same hole.</li>' +
        '<li><strong>The string pool.</strong> Sharing one instance between every equal literal ' +
        'is only possible if nobody can change it.</li>' +
        '<li><strong>Hash caching.</strong> <code>String</code> caches its hash in a field after ' +
        'the first computation, which is why string-keyed maps are fast. A mutable string could ' +
        'not.</li>' +
        '<li><strong>Thread safety.</strong> Strings are shared everywhere with no ' +
        'synchronisation anywhere.</li>' +
        '</ul>' +
        '<p>The practical consequence to state: <strong>every "modification" allocates.</strong> ' +
        '<code>replace</code>, <code>trim</code>, <code>substring</code>, <code>toUpperCase</code> ' +
        'and <code>+</code> all return new strings, and the original is untouched. Code that ' +
        'calls <code>s.trim()</code> and ignores the result is a real and common bug.</p>' +
        '<p>The related security note: this is exactly why passwords are handled as ' +
        '<code>char[]</code> rather than <code>String</code>. An array can be zeroed after use; ' +
        'an immutable string sits in the heap until it is collected, and shows up in any heap ' +
        'dump taken in between.</p>',
    referenceLinks: [
        { title: 'String — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/String.html' }
    ],
    tags: ['object-contract', 'strings', 'immutability', 'security'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'string-pool-and-intern',
    importance: 'should-know',
    subsection: 'object-contract',
    question: 'Why does == return true for two String literals but false for a literal and a new String?',
    answer:
        '<p>A string <em>literal</em> is interned: the pool holds one instance and every literal ' +
        'with the same characters refers to it. Two literals are therefore the same object, and ' +
        '<code>==</code> — which compares references — is true.</p>' +
        '<p><code>new String("a")</code> is an explicit instruction to allocate. It produces a ' +
        'distinct object whose contents are equal and whose reference is not, so <code>==</code> ' +
        'is false and <code>equals()</code> is true.</p>' +
        '<p>Compile-time constant expressions are folded and interned too, so ' +
        '<code>"spr" + "ing"</code> is the same object as <code>"spring"</code>. A concatenation ' +
        'involving a non-final variable is computed at runtime and is not.</p>' +
        '<p>This is why <code>==</code> on strings is a bug that passes its own tests: it works ' +
        'for every literal you write by hand and fails the first time a value arrives from a ' +
        'file, a socket or a database.</p>' +
        '<p>Since Java 7 the pool lives in the heap rather than in PermGen, so ' +
        '<code>intern()</code> on unbounded user input is a heap problem rather than a PermGen ' +
        'one — better, but still not something to do on untrusted input.</p>',
    referenceLinks: [
        { title: 'String.intern() — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/String.html#intern()' }
    ],
    tags: ['object-contract', 'strings', 'memory'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: [
        {
            language: 'java',
            title: 'Five comparisons',
            code:
                'public class Pool {\n' +
                '    public static void main(String[] args) {\n' +
                '        String a = "spring";\n' +
                '        String b = "spring";\n' +
                '        String c = new String("spring");\n' +
                '        String d = c.intern();\n' +
                '        String e = "spr" + "ing";      // folded at compile time\n' +
                '\n' +
                '        System.out.println(a == b);\n' +
                '        System.out.println(a == c);\n' +
                '        System.out.println(a.equals(c));\n' +
                '        System.out.println(a == d);\n' +
                '        System.out.println(a == e);\n' +
                '    }\n' +
                '}',
            output: {
                kind: 'stdout',
                lines: ['true', 'false', 'true', 'true', 'true'],
                explain:
                    '<p><code>intern()</code> returns the pooled instance, which is why the ' +
                    'fourth comparison is true. The fifth is true because the compiler folded ' +
                    'the concatenation of two literals into a single literal before the class ' +
                    'file was written.</p>'
            }
        }
    ]
},

{
    id: 'string-concat-in-a-loop',
    importance: 'should-know',
    subsection: 'object-contract',
    question: 'Is string concatenation with + slow? When does it actually matter?',
    answer:
        '<p>Not usually, and then suddenly very much.</p>' +
        '<p>A single expression such as <code>"a" + b + "c"</code> is compiled to one efficient ' +
        'operation. Since Java 9 it is an <code>invokedynamic</code> call to ' +
        '<code>StringConcatFactory</code>, which builds the result in one pass with a ' +
        'right-sized buffer — usually faster than a hand-written <code>StringBuilder</code>.</p>' +
        '<p><strong>In a loop it is quadratic.</strong> Each iteration is its own concatenation ' +
        'expression: it allocates a new string, copies everything accumulated so far, and ' +
        'discards the previous one. Ten thousand iterations means ten thousand allocations and ' +
        'roughly fifty million character copies. This is one of the few micro-optimisations that ' +
        'is worth doing on sight, because the difference is asymptotic rather than constant.</p>' +
        '<p>The fix is a <code>StringBuilder</code> outside the loop, or ' +
        '<code>String.join</code>, or a <code>Collectors.joining()</code> on a stream. Use ' +
        '<code>StringBuffer</code> only if the builder is genuinely shared between threads, ' +
        'which it almost never is — it is the synchronised version and every ' +
        '<code>append</code> pays for a lock nobody needs.</p>',
    referenceLinks: [],
    tags: ['strings', 'performance'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: [
        {
            language: 'java',
            title: 'The same output, a different order of growth',
            code:
                'public class Concat {\n' +
                '    static String quadratic(int n) {\n' +
                '        String out = "";\n' +
                '        for (int i = 0; i < n; i++) {\n' +
                '            out = out + i + ",";      // a fresh String every iteration\n' +
                '        }\n' +
                '        return out;\n' +
                '    }\n' +
                '\n' +
                '    static String linear(int n) {\n' +
                '        StringBuilder out = new StringBuilder();\n' +
                '        for (int i = 0; i < n; i++) {\n' +
                '            out.append(i).append(",");\n' +
                '        }\n' +
                '        return out.toString();\n' +
                '    }\n' +
                '}',
            output: {
                kind: 'trace',
                lines: [
                    'Each + in the loop compiles to its own concatenation of the whole accumulated string.',
                    'Iteration i copies roughly i characters, so the total work grows with n squared.',
                    'Every iteration also allocates one garbage String, so the collector is doing n allocations.',
                    'The builder version appends into one buffer that doubles when it fills.',
                    'Total work is linear in n, with a handful of array copies for the growth steps.'
                ],
                explain:
                    '<p>No timing numbers are claimed here: they depend on the machine, the JIT ' +
                    'and the heap, and a number measured once and quoted forever is worse than ' +
                    'no number. What is machine-independent is the order of growth, and that is ' +
                    'the part worth saying in an interview.</p>'
            }
        }
    ]
},

{
    id: 'clone-and-copy-constructors',
    importance: 'good-to-know',
    subsection: 'object-contract',
    question: 'Why is clone() considered broken, and what do you use instead?',
    answer:
        '<p><code>Cloneable</code> is an interface with no methods. It does not declare ' +
        '<code>clone()</code> — that is a <code>protected</code> method on <code>Object</code> ' +
        '— so implementing the interface does not give you the method or even make it public. ' +
        'What it does is change the behaviour of <code>Object.clone()</code> from "throw ' +
        '<code>CloneNotSupportedException</code>" to "copy the fields". An interface that ' +
        'modifies the behaviour of a protected method in its superclass is not how interfaces ' +
        'are supposed to work, and everything downstream is awkward for that reason.</p>' +
        '<p>The concrete problems: the copy is shallow, so mutable fields are shared with the ' +
        'original; the method is declared to throw a checked exception it will never throw; ' +
        '<code>final</code> fields cannot be assigned in a clone, so a correctly immutable ' +
        'class cannot implement it properly; and every subclass must remember to cooperate.</p>' +
        '<p>Use instead, in order of preference: <strong>do not copy at all</strong> — make the ' +
        'type immutable and share it; a <strong>static factory</strong> ' +
        '(<code>Order.copyOf(order)</code>); or a <strong>copy constructor</strong>. All three ' +
        'are ordinary methods with ordinary types, they can be overloaded to convert between ' +
        'implementations, and none of them requires the caller to cast.</p>',
    referenceLinks: [],
    tags: ['object-contract', 'cloning', 'api-design'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'tostring-and-logging',
    importance: 'good-to-know',
    subsection: 'object-contract',
    question: 'What belongs in toString(), and what must never go in it?',
    answer:
        '<p><code>toString()</code> exists for humans reading logs and debuggers, and that is ' +
        'the entire specification of what belongs in it: enough to identify the instance, ' +
        'concisely, without a database round trip.</p>' +
        '<p>What must never go in it:</p>' +
        '<ul>' +
        '<li><strong>Secrets.</strong> Passwords, tokens, card numbers, full email addresses. A ' +
        '<code>toString()</code> that includes a token puts that token into every log line that ' +
        'mentions the object — including the exception logs that get pasted into tickets. This ' +
        'is a leading cause of credentials in log aggregators.</li>' +
        '<li><strong>Lazy associations.</strong> A JPA entity whose <code>toString()</code> ' +
        'includes a lazy collection triggers a query when a logger renders it, or throws ' +
        '<code>LazyInitializationException</code> if the session has closed. The behaviour of ' +
        'the system then depends on the log level.</li>' +
        '<li><strong>Anything that can throw.</strong> A <code>toString()</code> that throws ' +
        'usually does so while something else is already failing, and it replaces a real stack ' +
        'trace with its own.</li>' +
        '</ul>' +
        '<p>Do not parse it either. The moment code parses <code>toString()</code> output, the ' +
        'format is a public API and can never be improved.</p>',
    referenceLinks: [],
    tags: ['object-contract', 'logging', 'security'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

/* ==== Generics & Erasure ============================================== */

{
    id: 'type-erasure',
    importance: 'must-know',
    subsection: 'generics',
    question: 'What is type erasure, and what can you no longer do because of it?',
    answer:
        '<p>Generics are a compile-time feature. The compiler checks types, inserts casts where ' +
        'needed, and then <strong>erases</strong> the type arguments: ' +
        '<code>List&lt;String&gt;</code> becomes <code>List</code>, and a type parameter ' +
        '<code>T</code> becomes its leftmost bound — <code>Object</code> if it has none. At run ' +
        'time there is exactly one <code>ArrayList</code> class, and it does not know what it ' +
        'holds.</p>' +
        '<p>The reason is migration compatibility. Generics arrived in Java 5, and the ' +
        'requirement was that existing pre-generic code keep working and keep interoperating — ' +
        'a <code>List</code> compiled in 2003 had to remain assignable to and from a ' +
        '<code>List&lt;String&gt;</code>. Erasure achieves that; reification would not have.</p>' +
        '<p>What it costs you:</p>' +
        '<ul>' +
        '<li>No <code>new T()</code> and no <code>new T[n]</code> — there is no ' +
        '<code>T</code> at run time to construct.</li>' +
        '<li>No <code>instanceof List&lt;String&gt;</code>. Only the unbounded ' +
        '<code>List&lt;?&gt;</code> is testable.</li>' +
        '<li>No overloading on <code>List&lt;String&gt;</code> versus ' +
        '<code>List&lt;Integer&gt;</code>: after erasure both are <code>List</code>, so the two ' +
        'methods have the same signature and the class will not compile.</li>' +
        '<li>No generic type in a <code>catch</code> clause, and no generic subclass of ' +
        '<code>Throwable</code>.</li>' +
        '<li>Unchecked casts, which are exactly the places where the compiler is telling you it ' +
        'has stopped being able to help.</li>' +
        '</ul>' +
        '<p>The escape hatch when you genuinely need the type is to pass it: ' +
        '<code>Class&lt;T&gt;</code> as a parameter, or a subclassed type token that captures ' +
        'the argument in a supertype — which is how Jackson\'s <code>TypeReference</code> and ' +
        'Spring\'s <code>ParameterizedTypeReference</code> work, since a type argument recorded ' +
        'in a class signature survives erasure.</p>',
    referenceLinks: [
        { title: 'Type Erasure — The Java Tutorials', url: 'https://docs.oracle.com/javase/tutorial/java/generics/erasure.html' }
    ],
    tags: ['generics', 'erasure', 'compiler'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: [
        {
            language: 'java',
            title: 'One class, whatever the type argument said',
            code:
                'import java.util.*;\n' +
                '\n' +
                'public class Erasure {\n' +
                '    public static void main(String[] args) {\n' +
                '        List<String>  strings = new ArrayList<>();\n' +
                '        List<Integer> numbers = new ArrayList<>();\n' +
                '\n' +
                '        System.out.println(strings.getClass() == numbers.getClass());\n' +
                '        System.out.println(strings.getClass().getName());\n' +
                '\n' +
                '        // The type argument is gone, so a raw reference can put\n' +
                '        // anything in and the compiler only warns.\n' +
                '        List raw = strings;\n' +
                '        raw.add(42);\n' +
                '        System.out.println(strings.size());\n' +
                '    }\n' +
                '}',
            output: {
                kind: 'stdout',
                lines: ['true', 'java.util.ArrayList', '1'],
                explain:
                    '<p>The two lists are the same class, and an <code>Integer</code> is now ' +
                    'sitting in a <code>List&lt;String&gt;</code>. Nothing fails here. The ' +
                    '<code>ClassCastException</code> arrives later, at whatever line finally ' +
                    'reads that element as a <code>String</code> — which is why it is called ' +
                    'heap pollution.</p>'
            }
        }
    ]
},

{
    id: 'arrays-covariant-generics-invariant',
    importance: 'must-know',
    subsection: 'generics',
    question: 'Why is String[] a subtype of Object[] while List<String> is not a subtype of List<Object>?',
    answer:
        '<p>Arrays are <strong>covariant</strong> and generics are <strong>invariant</strong>, ' +
        'and the difference is that arrays got it wrong.</p>' +
        '<p>Array covariance was a Java 1.0 decision made because there were no generics yet: ' +
        'without it you could not write a method that sorted any array. The cost is that array ' +
        'stores cannot be checked at compile time, so the JVM checks every single one at run ' +
        'time and throws <code>ArrayStoreException</code>. A whole category of type error was ' +
        'moved from compile time to run time, and every array write pays a small tax for it.</p>' +
        '<p>Generics chose invariance instead, and the error appears where it belongs. If ' +
        '<code>List&lt;String&gt;</code> were assignable to <code>List&lt;Object&gt;</code>, you ' +
        'could add an <code>Integer</code> through the second reference and read it back as a ' +
        '<code>String</code> through the first — and because of erasure there would be no ' +
        'run-time check to catch it. Erasure and covariance cannot coexist safely, so generics ' +
        'have the other one.</p>' +
        '<p>Wildcards are how you get the flexibility back where it is safe: ' +
        '<code>List&lt;? extends Object&gt;</code> accepts a <code>List&lt;String&gt;</code>, ' +
        'and in exchange the compiler refuses to let you add anything to it.</p>',
    referenceLinks: [
        { title: 'JLS 4.10.3 — Subtyping among Array Types', url: 'https://docs.oracle.com/javase/specs/jls/se25/html/jls-4.html#jls-4.10.3' }
    ],
    tags: ['generics', 'variance', 'arrays'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: [
        {
            language: 'java',
            title: 'The store that compiles and then throws',
            code:
                'public class Variance {\n' +
                '    public static void main(String[] args) {\n' +
                '        Object[] objects = new String[2];    // legal: arrays are covariant\n' +
                '        System.out.println(objects.getClass().getSimpleName());\n' +
                '\n' +
                '        try {\n' +
                '            objects[0] = 42;                 // compiles; the JVM checks it\n' +
                '        } catch (ArrayStoreException e) {\n' +
                '            System.out.println("ArrayStoreException: " + e.getMessage());\n' +
                '        }\n' +
                '\n' +
                '        // The generic equivalent does not compile at all:\n' +
                '        //   List<Object> list = new ArrayList<String>();\n' +
                '        //   error: incompatible types\n' +
                '    }\n' +
                '}',
            output: {
                kind: 'stdout',
                lines: ['String[]', 'ArrayStoreException: java.lang.Integer'],
                explain:
                    '<p>The array knows its real component type and refuses the store at run ' +
                    'time. The generic version is rejected by the compiler instead, which is ' +
                    'the same error caught several hours earlier.</p>'
            }
        }
    ]
},

{
    id: 'pecs-wildcards',
    importance: 'must-know',
    subsection: 'generics',
    question: 'What does PECS mean, and how do you decide between ? extends and ? super?',
    answer:
        '<p><strong>Producer Extends, Consumer Super.</strong> If the parameter <em>produces</em> ' +
        'values for you to read, use <code>? extends T</code>. If it <em>consumes</em> values ' +
        'you hand to it, use <code>? super T</code>. If it does both, use a plain ' +
        '<code>T</code> — no wildcard will help.</p>' +
        '<p>The reasoning, rather than the mnemonic:</p>' +
        '<ul>' +
        '<li><code>List&lt;? extends Number&gt;</code> is "a list of some specific unknown ' +
        'subtype of Number". You can <em>read</em> a <code>Number</code> from it safely, ' +
        'whatever that subtype is. You cannot <em>write</em>, because you do not know whether ' +
        'the list is a <code>List&lt;Integer&gt;</code> or a <code>List&lt;Double&gt;</code> — ' +
        'the only thing you may add is <code>null</code>.</li>' +
        '<li><code>List&lt;? super Integer&gt;</code> is "a list of some unknown supertype of ' +
        'Integer". You can <em>write</em> an <code>Integer</code> safely, since it fits ' +
        'whatever that supertype is. Reading gives you only <code>Object</code>, because the ' +
        'supertype might be <code>Object</code>.</li>' +
        '</ul>' +
        '<p>The canonical signature is <code>Collections.copy(List&lt;? super T&gt; dest, ' +
        'List&lt;? extends T&gt; src)</code> — the destination consumes, the source produces, ' +
        'and both wildcards earn their place.</p>' +
        '<p>Two rules that come with it: <strong>never use a wildcard in a return type</strong>, ' +
        'because it forces every caller to deal with the wildcard too; and use ' +
        '<code>Consumer&lt;? super T&gt;</code> / <code>Supplier&lt;? extends T&gt;</code> when ' +
        'taking functional parameters, which is exactly what the JDK does.</p>',
    referenceLinks: [
        { title: 'Wildcards and Subtyping — The Java Tutorials', url: 'https://docs.oracle.com/javase/tutorial/java/generics/subtyping.html' }
    ],
    tags: ['generics', 'variance', 'wildcards', 'api-design'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: [
        {
            language: 'java',
            title: 'What each wildcard lets you do',
            code:
                'import java.util.*;\n' +
                '\n' +
                'public class Pecs {\n' +
                '    // Producer: we only read Numbers out of it.\n' +
                '    static double sum(List<? extends Number> source) {\n' +
                '        double total = 0;\n' +
                '        for (Number n : source) total += n.doubleValue();\n' +
                '        // source.add(1);  <- would not compile: the element type is unknown\n' +
                '        return total;\n' +
                '    }\n' +
                '\n' +
                '    // Consumer: we only write Integers into it.\n' +
                '    static void fill(List<? super Integer> sink, int count) {\n' +
                '        for (int i = 0; i < count; i++) sink.add(i);\n' +
                '        // Integer first = sink.get(0);  <- would not compile: reads as Object\n' +
                '    }\n' +
                '\n' +
                '    public static void main(String[] args) {\n' +
                '        System.out.println(sum(List.of(1, 2, 3)));\n' +
                '        System.out.println(sum(List.of(1.5, 2.5)));\n' +
                '\n' +
                '        List<Number> sink = new ArrayList<>();\n' +
                '        fill(sink, 3);\n' +
                '        System.out.println(sink);\n' +
                '    }\n' +
                '}',
            output: {
                kind: 'stdout',
                lines: ['6.0', '4.0', '[0, 1, 2]'],
                explain:
                    '<p><code>sum</code> accepts both a list of integers and a list of doubles, ' +
                    'which it could not do with a bare <code>List&lt;Number&gt;</code>. ' +
                    '<code>fill</code> accepts a <code>List&lt;Number&gt;</code> even though it ' +
                    'writes integers, which it also could not do without the wildcard.</p>'
            }
        }
    ]
},

{
    id: 'unbounded-wildcard-vs-raw-type',
    importance: 'should-know',
    subsection: 'generics',
    question: 'What is the difference between List, List<?> and List<Object>?',
    answer:
        '<p>Three different things that look similar and behave nothing alike.</p>' +
        '<ul>' +
        '<li><strong><code>List</code></strong> is the <em>raw type</em>. It opts out of ' +
        'generic checking entirely: you can add anything, and the compiler downgrades to a ' +
        'warning. Worse, using a raw type erases the generics of <em>every</em> member you ' +
        'reach through it, not just the one you thought you were relaxing. It exists only for ' +
        'compatibility with pre-Java-5 code.</li>' +
        '<li><strong><code>List&lt;?&gt;</code></strong> is a list of some specific unknown ' +
        'type. It is fully type-safe: you can read elements as <code>Object</code>, call ' +
        '<code>size()</code> and <code>clear()</code>, and you cannot add anything except ' +
        '<code>null</code> — because the compiler does not know what would be legal.</li>' +
        '<li><strong><code>List&lt;Object&gt;</code></strong> is a list that specifically holds ' +
        '<code>Object</code>. You can add anything to it. But a <code>List&lt;String&gt;</code> ' +
        'is <em>not</em> assignable to it, so as a parameter type it is far less useful than it ' +
        'looks.</li>' +
        '</ul>' +
        '<p>The short version for a parameter you only read from: use ' +
        '<code>List&lt;?&gt;</code>. It accepts every list, and the compiler still stops you ' +
        'writing to it. Never use the raw type in new code — and <code>@SuppressWarnings</code> ' +
        'on a raw type is a decision to switch the type system off in that scope, which is worth ' +
        'a comment explaining why.</p>',
    referenceLinks: [],
    tags: ['generics', 'wildcards', 'raw-types'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'bounded-type-parameters',
    importance: 'should-know',
    subsection: 'generics',
    question: 'What is a bounded type parameter, and what is a recursive bound for?',
    answer:
        '<p>A bound constrains what <code>T</code> may be, and it does two things at once: it ' +
        'restricts callers, and it tells the compiler what methods it can let you call on a ' +
        '<code>T</code>. Without a bound, <code>T</code> erases to <code>Object</code> and you ' +
        'can only call <code>Object</code> methods on it.</p>' +
        '<p><code>&lt;T extends Number&gt;</code> is the simple form. Multiple bounds use ' +
        '<code>&amp;</code> — <code>&lt;T extends Comparable&lt;T&gt; &amp; Serializable&gt;</code> ' +
        '— and if one of them is a class it must come first. <code>extends</code> is used for ' +
        'interfaces too; there is no <code>implements</code> in a type bound.</p>' +
        '<p>A <strong>recursive bound</strong> — <code>&lt;T extends Comparable&lt;T&gt;&gt;</code> ' +
        '— says "T must be comparable to itself". This is what makes ' +
        '<code>Collections.max</code> type-safe: it can compare the elements to each other and ' +
        'not merely to some unrelated comparable type. The same shape appears in ' +
        '<code>Enum&lt;E extends Enum&lt;E&gt;&gt;</code>, and in every self-returning builder ' +
        'that wants a subclass method to return the subclass type rather than the base.</p>' +
        '<p>It looks circular and is not: it is a constraint on the type argument, checked once ' +
        'at the call site.</p>',
    referenceLinks: [
        { title: 'Bounded Type Parameters — The Java Tutorials', url: 'https://docs.oracle.com/javase/tutorial/java/generics/bounded.html' }
    ],
    tags: ['generics', 'bounds'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'why-no-generic-arrays',
    importance: 'should-know',
    subsection: 'generics',
    question: 'Why can you not create an array of a generic type?',
    answer:
        '<p>Because arrays are reified and generics are erased, and an array of a generic type ' +
        'would have to be both.</p>' +
        '<p>An array knows its component type at run time — that is what lets it throw ' +
        '<code>ArrayStoreException</code>. A <code>List&lt;String&gt;[]</code> would need to ' +
        'remember <code>List&lt;String&gt;</code>, but erasure has already thrown that away by ' +
        'the time the array exists. The array could only check <code>List</code>, so it would ' +
        'accept a <code>List&lt;Integer&gt;</code> and the type system would be unsound.</p>' +
        '<p>So <code>new T[n]</code> and <code>new List&lt;String&gt;[n]</code> are compile ' +
        'errors. The two standard workarounds:</p>' +
        '<ul>' +
        '<li><strong>Use a collection.</strong> <code>List&lt;List&lt;String&gt;&gt;</code> has ' +
        'none of the problem, and is the right answer almost every time.</li>' +
        '<li><strong>Create an <code>Object[]</code> and cast</strong>, keeping it private and ' +
        'annotating the cast. This is what <code>ArrayList</code> itself does internally — its ' +
        'backing store is an <code>Object[]</code>, and it casts on the way out. It is safe ' +
        'only because the array never escapes the class.</li>' +
        '</ul>' +
        '<p>The related idiom is <code>toArray(new String[0])</code>: the array argument carries ' +
        'the component type at run time, which is the information erasure removed. Passing a ' +
        'zero-length array is the current recommended form — the JIT handles it well and a ' +
        'presized array is not faster on modern JDKs.</p>',
    referenceLinks: [],
    tags: ['generics', 'arrays', 'erasure'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'generic-method-vs-generic-class',
    importance: 'good-to-know',
    subsection: 'generics',
    question: 'When should a type parameter go on the method rather than on the class?',
    answer:
        '<p>Put it on the <strong>method</strong> when the type varies per call and nothing about ' +
        'the object needs to remember it. Put it on the <strong>class</strong> when instances ' +
        'genuinely hold or produce that type over their lifetime.</p>' +
        '<p><code>static &lt;T&gt; List&lt;T&gt; singletonList(T item)</code> is a generic ' +
        'method: each call has its own <code>T</code>, inferred from the argument, and the ' +
        'utility class holding it has no state. <code>Box&lt;T&gt;</code> is a generic class: ' +
        'the instance holds a <code>T</code> and every method has to agree about which ' +
        '<code>T</code> that is.</p>' +
        '<p>A useful smell: if a class has a type parameter that appears in only one method, it ' +
        'wanted to be a generic method. The class parameter forces every caller to pick a type ' +
        'at construction even when they only care about it for one call — and static methods ' +
        'cannot use the class parameter at all, which is why the utility methods on ' +
        '<code>Collections</code> are all generic methods.</p>' +
        '<p>Explicit type arguments (<code>Collections.&lt;String&gt;emptyList()</code>) are ' +
        'legal but rarely needed. Inference handles almost everything, and the cases where it ' +
        'does not are usually a signal that the signature could be clearer.</p>',
    referenceLinks: [],
    tags: ['generics', 'api-design'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'heap-pollution-and-safevarargs',
    importance: 'good-to-know',
    subsection: 'generics',
    question: 'What is heap pollution, and what does @SafeVarargs actually promise?',
    answer:
        '<p><strong>Heap pollution</strong> is a variable of a parameterised type referring to an ' +
        'object that is not of that type — an <code>Integer</code> sitting in a ' +
        '<code>List&lt;String&gt;</code>. Erasure makes it possible, and the ' +
        '<code>ClassCastException</code> surfaces at whatever unrelated line finally reads the ' +
        'element, which is what makes it hard to debug.</p>' +
        '<p>Generic varargs are a standing invitation to it. <code>void ' +
        'ofAll(List&lt;String&gt;... lists)</code> creates a <code>List&lt;String&gt;[]</code> ' +
        'to hold the arguments — an array of a generic type, which the language otherwise ' +
        'forbids. The compiler allows it here and warns instead.</p>' +
        '<p><code>@SafeVarargs</code> suppresses that warning, and it is a <em>promise you are ' +
        'making</em>, not a check the compiler performs. The promise is that the method does ' +
        'not store anything into the varargs array and does not let the array escape. Reading ' +
        'from it is fine. Assigning to it, or returning it, or passing it to something that ' +
        'keeps it, is exactly the unsafety the annotation claims is absent.</p>' +
        '<p>It may only be applied where overriding cannot break the promise: on ' +
        '<code>static</code>, <code>final</code> and <code>private</code> methods, and on ' +
        'constructors.</p>',
    referenceLinks: [
        { title: 'SafeVarargs — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/SafeVarargs.html' }
    ],
    tags: ['generics', 'varargs', 'erasure'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'reifiable-types-and-instanceof',
    importance: 'good-to-know',
    subsection: 'generics',
    question: 'Which generic types can you test with instanceof, and how do you work around the rest?',
    answer:
        '<p>Only <strong>reifiable</strong> types — the ones whose full type information survives ' +
        'to run time. That is: non-generic types, raw types, unbounded wildcards ' +
        '(<code>List&lt;?&gt;</code>), primitives, and arrays of reifiable types.</p>' +
        '<p><code>o instanceof List&lt;String&gt;</code> does not compile, because at run time ' +
        'there is no way to answer it. <code>o instanceof List&lt;?&gt;</code> does, and answers ' +
        '"is this a list at all".</p>' +
        '<p>When the type genuinely matters, pass it as a value:</p>' +
        '<ul>' +
        '<li><code>Class&lt;T&gt;</code> as a parameter, with <code>type.isInstance(o)</code> ' +
        'and <code>type.cast(o)</code>. This is the <em>typesafe heterogeneous container</em> ' +
        'pattern, and it is how a map can hold several types with each key knowing its own.</li>' +
        '<li>A <strong>super type token</strong> — an anonymous subclass whose supertype records ' +
        'the type argument, which erasure does not remove because it is written in the class ' +
        'file. Jackson\'s <code>TypeReference</code> and Spring\'s ' +
        '<code>ParameterizedTypeReference</code> are both this, which is why deserialising a ' +
        '<code>List&lt;Order&gt;</code> needs one and deserialising an <code>Order</code> does ' +
        'not.</li>' +
        '</ul>',
    referenceLinks: [],
    tags: ['generics', 'erasure', 'reflection'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

/* ==== Records, Sealed Types & Pattern Matching ======================== */

{
    id: 'records-what-they-give-you',
    importance: 'must-know',
    subsection: 'modern',
    question: 'What does a record give you, and when should you not use one?',
    answer:
        '<p>A record is a <strong>transparent carrier for an immutable tuple of values</strong>. ' +
        'That sentence is the specification, and everything the compiler generates follows from ' +
        'it: a canonical constructor, a <code>private final</code> field and an accessor per ' +
        'component, and <code>equals</code>, <code>hashCode</code> and <code>toString</code> ' +
        'derived from all the components.</p>' +
        '<p>Three constraints come with it. A record is implicitly <code>final</code> — you ' +
        'cannot extend it, and it cannot extend anything, because that would reopen the ' +
        '<code>equals</code>-with-inheritance problem. Its fields cannot be added to, so no ' +
        'extra state. And the accessors are named <code>total()</code>, not ' +
        '<code>getTotal()</code>, which matters for anything relying on the JavaBean ' +
        'convention.</p>' +
        '<p><strong>Use one</strong> for DTOs, API request and response bodies, value objects, ' +
        'query results, map keys, event payloads, and the multiple-return-value case that would ' +
        'otherwise be an array or an out-parameter.</p>' +
        '<p><strong>Do not use one</strong> for a JPA entity — an entity needs a no-arg ' +
        'constructor, mutable fields for dirty checking, and a proxyable non-final class, and a ' +
        'record has none of the three. Do not use one where the identity is not the sum of the ' +
        'components, and do not use one where you need to add a field later without changing ' +
        'every construction site.</p>' +
        '<p>The compact constructor is the idiomatic place to validate and to normalise, and it ' +
        'runs before the fields are assigned.</p>',
    referenceLinks: [
        { title: 'JEP 395: Records', url: 'https://openjdk.org/jeps/395' },
        { title: 'Record Classes — dev.java', url: 'https://dev.java/learn/records/' }
    ],
    tags: ['records', 'modern-java', 'immutability'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: [
        {
            language: 'java',
            title: 'A compact constructor that validates and normalises',
            code:
                'import java.util.*;\n' +
                '\n' +
                'public class Records {\n' +
                '    record Money(String currency, long minorUnits) {\n' +
                '        // Compact constructor: no parameter list, no field assignment.\n' +
                '        // The parameters are assigned to the fields after this body runs.\n' +
                '        Money {\n' +
                '            Objects.requireNonNull(currency, "currency");\n' +
                '            if (minorUnits < 0) {\n' +
                '                throw new IllegalArgumentException("negative: " + minorUnits);\n' +
                '            }\n' +
                '            currency = currency.toUpperCase();      // normalising works\n' +
                '        }\n' +
                '\n' +
                '        Money plus(Money other) {\n' +
                '            return new Money(currency, minorUnits + other.minorUnits);\n' +
                '        }\n' +
                '    }\n' +
                '\n' +
                '    public static void main(String[] args) {\n' +
                '        Money a = new Money("gbp", 250);\n' +
                '        Money b = new Money("GBP", 250);\n' +
                '\n' +
                '        System.out.println(a);\n' +
                '        System.out.println(a.equals(b));\n' +
                '        System.out.println(a.plus(b).minorUnits());\n' +
                '        // Set.copyOf, not Set.of — the factory REJECTS a duplicate\n' +
                '        // rather than collapsing it, and two equal records are one.\n' +
                '        System.out.println(Set.copyOf(List.of(a, b)).size());\n' +
                '    }\n' +
                '}',
            output: {
                kind: 'stdout',
                lines: ['Money[currency=GBP, minorUnits=250]', 'true', '500', '1'],
                explain:
                    '<p>Assigning to the parameter inside a compact constructor changes what ' +
                    'gets stored, which is what makes it the right place to normalise. The two ' +
                    'instances are equal and share a hash, so the set holds one.</p>' +
                    '<p><code>Set.of(a, b)</code> would not have printed <code>1</code> — it ' +
                    'throws <code>IllegalArgumentException: duplicate element</code>. The ' +
                    'immutable factories treat a duplicate as a mistake in the call; ' +
                    '<code>Set.copyOf</code> treats it as a collection to deduplicate.</p>'
            }
        }
    ]
},

{
    id: 'record-equals-and-mutable-components',
    importance: 'should-know',
    subsection: 'modern',
    question: 'Is a record automatically immutable?',
    answer:
        '<p>No. A record is <strong>shallowly</strong> immutable: the fields are ' +
        '<code>final</code>, so nothing can repoint them, but if a component is a mutable object ' +
        'the record is a constant reference to something that changes.</p>' +
        '<p><code>record Basket(List&lt;String&gt; items)</code> hands out the very list it was ' +
        'given. The caller can still mutate it, and so can anyone who calls ' +
        '<code>items()</code>. Worse, the generated <code>hashCode</code> is computed from the ' +
        'components, so mutating the list changes the record\'s hash — and a record used as a ' +
        'map key is lost exactly as any other mutable key would be.</p>' +
        '<p>The fix is the compact constructor: copy on the way in with ' +
        '<code>List.copyOf()</code>, which also makes the list unmodifiable so the accessor is ' +
        'safe too. One line closes both directions.</p>' +
        '<p>The other detail worth knowing: an explicit accessor that returns a defensive copy ' +
        'does <em>not</em> change what <code>equals</code> and <code>hashCode</code> see — those ' +
        'read the fields directly. Copying in the constructor is the only version that ' +
        'works.</p>',
    referenceLinks: [],
    tags: ['records', 'immutability', 'defensive-copy'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: [
        {
            language: 'java',
            title: 'A record whose hash changes under it',
            code:
                'import java.util.*;\n' +
                '\n' +
                'public class MutableRecord {\n' +
                '    record Basket(List<String> items) { }\n' +
                '\n' +
                '    // The fixed version differs by one line.\n' +
                '    record SafeBasket(List<String> items) {\n' +
                '        SafeBasket { items = List.copyOf(items); }\n' +
                '    }\n' +
                '\n' +
                '    public static void main(String[] args) {\n' +
                '        List<String> caller = new ArrayList<>(List.of("apple"));\n' +
                '\n' +
                '        Basket basket = new Basket(caller);\n' +
                '        int before = basket.hashCode();\n' +
                '        caller.add("pear");\n' +
                '        System.out.println(basket.items());\n' +
                '        System.out.println(before == basket.hashCode());\n' +
                '\n' +
                '        SafeBasket safe = new SafeBasket(caller);\n' +
                '        caller.add("plum");\n' +
                '        System.out.println(safe.items());\n' +
                '    }\n' +
                '}',
            output: {
                kind: 'stdout',
                lines: ['[apple, pear]', 'false', '[apple, pear]'],
                explain:
                    '<p>The unprotected record saw the caller\'s addition and its hash changed ' +
                    'as a result. The copy-on-entry version kept the two elements it was ' +
                    'constructed with and ignored the third.</p>'
            }
        }
    ]
},

{
    id: 'sealed-interfaces',
    importance: 'must-know',
    subsection: 'modern',
    question: 'What problem do sealed types solve that a plain interface does not?',
    answer:
        '<p>A sealed type declares its permitted subtypes, so the <em>compiler</em> knows the ' +
        'complete list. That single fact buys two things a plain interface cannot give you.</p>' +
        '<ul>' +
        '<li><strong>Exhaustiveness.</strong> A <code>switch</code> over a sealed type needs no ' +
        '<code>default</code> branch, and adding a new permitted subtype turns every such switch ' +
        'into a compile error. That is the opposite of the usual outcome, where a new case ' +
        'silently falls into <code>default</code> and is discovered in production.</li>' +
        '<li><strong>A closed model.</strong> "A payment is a card payment, a bank transfer or a ' +
        'voucher, and nothing else" becomes a statement the type system enforces, rather than a ' +
        'comment. This is an algebraic data type, and it is what makes ' +
        '<code>sealed</code> plus <code>record</code> plus pattern matching a coherent set of ' +
        'features rather than three unrelated ones.</li>' +
        '</ul>' +
        '<p>The rules: every permitted subclass must be in the same module, or in the same ' +
        'package for an unnamed module, and each must declare itself <code>final</code>, ' +
        '<code>sealed</code>, or <code>non-sealed</code>. That third keyword is the deliberate ' +
        'escape hatch — it reopens one branch of the hierarchy for extension without reopening ' +
        'the rest.</p>' +
        '<p>The <code>permits</code> clause can be omitted when the subtypes are in the same ' +
        'source file, which is the common case.</p>',
    referenceLinks: [
        { title: 'JEP 409: Sealed Classes', url: 'https://openjdk.org/jeps/409' }
    ],
    tags: ['sealed', 'modern-java', 'type-design'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: [
        {
            language: 'java',
            title: 'A closed hierarchy and an exhaustive switch',
            code:
                'public class Sealed {\n' +
                '    sealed interface Payment permits Card, Transfer, Voucher { }\n' +
                '\n' +
                '    record Card(String last4, long amount)     implements Payment { }\n' +
                '    record Transfer(String iban, long amount)  implements Payment { }\n' +
                '    record Voucher(String code)                implements Payment { }\n' +
                '\n' +
                '    // No default branch. Adding a fourth permitted type breaks this\n' +
                '    // at compile time, which is the entire point.\n' +
                '    static String describe(Payment payment) {\n' +
                '        return switch (payment) {\n' +
                '            case Card c     -> "card ending " + c.last4();\n' +
                '            case Transfer t -> "transfer to " + t.iban();\n' +
                '            case Voucher v  -> "voucher " + v.code();\n' +
                '        };\n' +
                '    }\n' +
                '\n' +
                '    public static void main(String[] args) {\n' +
                '        System.out.println(describe(new Card("4242", 500)));\n' +
                '        System.out.println(describe(new Voucher("SPRING25")));\n' +
                '    }\n' +
                '}',
            output: {
                kind: 'stdout',
                lines: ['card ending 4242', 'voucher SPRING25'],
                explain:
                    '<p>The absence of a <code>default</code> branch is the feature. With a ' +
                    'plain interface the compiler would demand one, and a fourth payment type ' +
                    'added six months later would quietly take that branch everywhere in the ' +
                    'codebase instead of failing the build.</p>'
            }
        }
    ]
},

{
    id: 'pattern-matching-for-switch',
    importance: 'must-know',
    subsection: 'modern',
    question: 'What does pattern matching for switch let you write that instanceof chains could not?',
    answer:
        '<p>Three things, and the third is the one that changes how you design types.</p>' +
        '<ul>' +
        '<li><strong>Test and bind in one step.</strong> <code>case Card c</code> checks the type ' +
        'and introduces <code>c</code> already typed. The cast that used to follow every ' +
        '<code>instanceof</code> — and that could be written wrong — is gone.</li>' +
        '<li><strong>Guards.</strong> <code>case Card c when c.amount() &gt; 10_000</code> puts ' +
        'the condition in the pattern, so the branches stay flat instead of nesting an ' +
        '<code>if</code> inside each one.</li>' +
        '<li><strong>Record patterns.</strong> <code>case Card(String last4, long amount)</code> ' +
        'destructures, and nests: <code>case Order(Customer(String name, _), var total)</code> ' +
        'reaches two levels down in one line.</li>' +
        '</ul>' +
        '<p>Two rules the compiler enforces. <strong>Order matters</strong>: a more general ' +
        'pattern before a more specific one is dominance, and it is a compile error rather than ' +
        'a dead branch. And <code>null</code> no longer throws — a switch with patterns accepts ' +
        '<code>case null</code>, and without one it still throws ' +
        '<code>NullPointerException</code>, which keeps the old behaviour for old code.</p>' +
        '<p>Combined with sealed types this replaces the visitor pattern for closed hierarchies: ' +
        'the exhaustiveness the visitor bought with an interface method per type, you now get ' +
        'from the compiler.</p>',
    referenceLinks: [
        { title: 'JEP 441: Pattern Matching for switch', url: 'https://openjdk.org/jeps/441' },
        { title: 'JEP 440: Record Patterns', url: 'https://openjdk.org/jeps/440' }
    ],
    tags: ['pattern-matching', 'modern-java', 'switch'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: [
        {
            language: 'java',
            title: 'Guards, record patterns and case null',
            code:
                'public class Patterns {\n' +
                '    sealed interface Shape permits Circle, Rect { }\n' +
                '    record Circle(double radius)            implements Shape { }\n' +
                '    record Rect(double width, double height) implements Shape { }\n' +
                '\n' +
                '    static String classify(Object value) {\n' +
                '        return switch (value) {\n' +
                '            case null                            -> "nothing";\n' +
                '            case Integer i when i < 0            -> "negative int";\n' +
                '            case Integer i                       -> "int " + i;\n' +
                '            case Circle(double r) when r > 10    -> "big circle";\n' +
                '            case Circle(double r)                -> "circle r=" + r;\n' +
                '            case Rect(double w, double h)        -> "rect " + (w * h);\n' +
                '            case String s                        -> "string of " + s.length();\n' +
                '            default                              -> "something else";\n' +
                '        };\n' +
                '    }\n' +
                '\n' +
                '    public static void main(String[] args) {\n' +
                '        System.out.println(classify(null));\n' +
                '        System.out.println(classify(-3));\n' +
                '        System.out.println(classify(new Circle(2)));\n' +
                '        System.out.println(classify(new Circle(40)));\n' +
                '        System.out.println(classify(new Rect(2, 3)));\n' +
                '        System.out.println(classify("spring"));\n' +
                '    }\n' +
                '}',
            output: {
                kind: 'stdout',
                lines: ['nothing', 'negative int', 'circle r=2.0', 'big circle', 'rect 6.0', 'string of 6'],
                explain:
                    '<p>Swapping the two <code>Integer</code> cases would not produce a dead ' +
                    'branch — it would not compile, because the unguarded pattern dominates the ' +
                    'guarded one. The compiler enforces the ordering rather than leaving it to ' +
                    'a code review.</p>'
            }
        }
    ]
},

{
    id: 'switch-exhaustiveness',
    importance: 'should-know',
    subsection: 'modern',
    question: 'Why should you avoid a default branch when switching over an enum or a sealed type?',
    answer:
        '<p>Because <code>default</code> destroys exhaustiveness checking, which is the main ' +
        'thing the compiler could have done for you.</p>' +
        '<p>Without a <code>default</code>, a switch expression over an enum or a sealed type ' +
        'must cover every constant or permitted subtype, and the compiler verifies it. Add a ' +
        'new enum constant and every such switch fails the build, in the exact places that need ' +
        'a decision. Add a <code>default</code>, and the same change compiles cleanly and takes ' +
        'the default branch — which is almost never the right behaviour and is discovered in ' +
        'production.</p>' +
        '<p>Two details:</p>' +
        '<ul>' +
        '<li>This applies to switch <em>expressions</em> and to pattern switches. An old-style ' +
        'switch <em>statement</em> over an enum still compiles happily with cases missing, ' +
        'which is one good reason to prefer the arrow form.</li>' +
        '<li>The compiler inserts a hidden default that throws <code>MatchException</code> or ' +
        '<code>IncompatibleClassChangeError</code>, to cover the case where the enum or sealed ' +
        'hierarchy is changed and not recompiled. So an exhaustive switch is exhaustive at ' +
        'compile time and still safe at run time.</li>' +
        '</ul>' +
        '<p>When you genuinely want a catch-all, prefer a total type pattern such as ' +
        '<code>case Shape s</code> over <code>default</code>: it reads as a decision rather ' +
        'than as an omission, and it still binds a typed variable.</p>',
    referenceLinks: [],
    tags: ['switch', 'enums', 'sealed', 'modern-java'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'var-and-where-not-to-use-it',
    importance: 'should-know',
    subsection: 'modern',
    question: 'When does var improve code, and when does it make it worse?',
    answer:
        '<p><code>var</code> is local variable type inference, and it is inference rather than ' +
        'dynamic typing: the variable has a static type, chosen by the compiler from the ' +
        'initialiser, and it never changes. It is legal only for local variables, ' +
        '<code>for</code> loop indexes, and lambda parameters — never for fields, method ' +
        'parameters or return types, because those are API and inference would make them ' +
        'accidental.</p>' +
        '<p><strong>It helps</strong> when the type is already obvious from the right-hand side ' +
        'and stating it twice is noise: <code>var orders = new HashMap&lt;String, ' +
        'List&lt;Order&gt;&gt;();</code>. It helps most with long generic types, and with ' +
        'intermediate values in a chain.</p>' +
        '<p><strong>It hurts</strong> when the right-hand side is a method call whose return ' +
        'type the reader cannot guess — <code>var result = service.process(input);</code> tells ' +
        'a reviewer nothing, and a code review happens in a diff without an IDE. It also hides ' +
        'a genuine decision when you meant to program to an interface: ' +
        '<code>var list = new ArrayList&lt;String&gt;()</code> is an <code>ArrayList</code>, not ' +
        'a <code>List</code>.</p>' +
        '<p>Two sharp edges: <code>var x = null</code> does not compile, and ' +
        '<code>var</code> with a diamond infers <code>Object</code> — ' +
        '<code>var list = new ArrayList&lt;&gt;()</code> is an ' +
        '<code>ArrayList&lt;Object&gt;</code>, which is legal, useless, and silent.</p>',
    referenceLinks: [
        { title: 'JEP 286: Local-Variable Type Inference', url: 'https://openjdk.org/jeps/286' }
    ],
    tags: ['var', 'modern-java', 'readability'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'text-blocks',
    importance: 'good-to-know',
    subsection: 'modern',
    question: 'What do text blocks change beyond avoiding escaped quotes?',
    answer:
        '<p>The escaping is the visible part; the <strong>incidental whitespace algorithm</strong> ' +
        'is the part that matters. The compiler finds the minimum indentation across all ' +
        'non-blank lines <em>and the closing delimiter</em>, and strips that much from every ' +
        'line. So the block can be indented to match the surrounding code without that ' +
        'indentation ending up in the string.</p>' +
        '<p>The position of the closing <code>"""</code> is therefore significant: moving it left ' +
        'preserves leading whitespace on every line, and putting it on the same line as the last ' +
        'content removes the trailing newline. Trailing whitespace is always stripped, which is ' +
        'usually welcome and occasionally not — <code>\\s</code> escapes a space you want to ' +
        'keep.</p>' +
        '<p>Two escapes exist only inside text blocks: <code>\\s</code>, a space that survives ' +
        'stripping, and <code>\\</code> at end of line, which suppresses the newline so a long ' +
        'line can be wrapped in the source without being wrapped in the value.</p>' +
        '<p>The everyday use in a backend codebase is SQL, JSON fixtures in tests, and ' +
        'multi-line log or error templates. A text block is still a compile-time constant, so it ' +
        'is interned like any other literal — and it is still string concatenation, so it is ' +
        'still not a substitute for a parameterised query.</p>',
    referenceLinks: [
        { title: 'JEP 378: Text Blocks', url: 'https://openjdk.org/jeps/378' }
    ],
    tags: ['text-blocks', 'modern-java', 'strings'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: [
        {
            language: 'java',
            title: 'Where the closing delimiter sits changes the value',
            code:
                'public class Blocks {\n' +
                '    public static void main(String[] args) {\n' +
                '        String sql = """\n' +
                '                SELECT id, total\n' +
                '                FROM orders\n' +
                '                WHERE status = ?\n' +
                '                """;\n' +
                '\n' +
                '        // The closing delimiter is indented with the content, so the\n' +
                '        // common indentation is stripped and no line starts with spaces.\n' +
                '        System.out.println(sql.lines().count());\n' +
                '        System.out.println(sql.startsWith("SELECT"));\n' +
                '        System.out.println(sql.endsWith("\\n"));\n' +
                '    }\n' +
                '}',
            output: {
                kind: 'stdout',
                lines: ['3', 'true', 'true'],
                explain:
                    '<p>Three lines, no leading indentation, and a trailing newline because the ' +
                    'closing delimiter is on its own line. Pulling that delimiter to column ' +
                    'zero would keep sixteen spaces on the front of every line.</p>'
            }
        }
    ]
},

{
    id: 'optional-in-a-field-or-parameter',
    importance: 'good-to-know',
    subsection: 'modern',
    question: 'Where is Optional the right tool, and where is it the wrong one?',
    answer:
        '<p><code>Optional</code> was designed for <strong>return types</strong>, specifically ' +
        'for a method whose absent result is a normal outcome that a caller is likely to forget ' +
        'about. That is the whole of its intended scope, and its designers have said so.</p>' +
        '<p><strong>Wrong uses, and why:</strong></p>' +
        '<ul>' +
        '<li><strong>As a field.</strong> It is not <code>Serializable</code>, it adds an object ' +
        'per field, and a null <code>Optional</code> field is a state that makes no sense at all ' +
        'yet is perfectly possible.</li>' +
        '<li><strong>As a parameter.</strong> The caller now has three cases to pass — a value, ' +
        'an empty, or null — instead of two. An overload or a nullable parameter is clearer.</li>' +
        '<li><strong>In a collection.</strong> <code>List&lt;Optional&lt;T&gt;&gt;</code> almost ' +
        'always wants to be a filtered <code>List&lt;T&gt;</code>, or a map with absent ' +
        'keys.</li>' +
        '<li><strong><code>get()</code> without <code>isPresent()</code>.</strong> This is a ' +
        '<code>NullPointerException</code> with more ceremony. Its own documentation now ' +
        'recommends <code>orElseThrow()</code>, which at least says what you meant.</li>' +
        '</ul>' +
        '<p>The value is in the composition — <code>map</code>, <code>flatMap</code>, ' +
        '<code>filter</code>, <code>orElseGet</code>, <code>ifPresentOrElse</code> — which lets ' +
        'a chain of possibly-absent lookups read as one expression instead of four nested null ' +
        'checks. Note <code>orElse</code> evaluates its argument eagerly and ' +
        '<code>orElseGet</code> does not, which matters when the fallback is expensive.</p>',
    referenceLinks: [
        { title: 'Optional — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/Optional.html' }
    ],
    tags: ['optional', 'api-design', 'null-safety'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

/* ==== Exceptions & Errors ============================================= */

{
    id: 'checked-vs-unchecked',
    importance: 'must-know',
    subsection: 'errors',
    question: 'What is the difference between checked and unchecked exceptions, and which should your own code throw?',
    answer:
        '<p>The hierarchy first, because the answer follows from it. ' +
        '<code>Throwable</code> has two subclasses. <code>Error</code> is for conditions no ' +
        'application should catch — <code>OutOfMemoryError</code>, ' +
        '<code>StackOverflowError</code>. <code>Exception</code> is everything else, and ' +
        '<code>RuntimeException</code> is the subtree of it that is unchecked.</p>' +
        '<p><strong>Checked</strong> means the compiler forces you to catch it or declare it. ' +
        'The intent was: use it for a recoverable condition the caller can plausibly do ' +
        'something about. <strong>Unchecked</strong> means no such obligation, and the intent ' +
        'was: use it for a programming error, where the fix is to change the code rather than to ' +
        'handle the exception.</p>' +
        '<p>In practice modern Java code, and Spring in particular, leans heavily on unchecked. ' +
        'Three reasons, all real:</p>' +
        '<ul>' +
        '<li>A checked exception is part of the signature, so it propagates up through every ' +
        'intermediate method that cannot do anything about it. It couples layers that have no ' +
        'other relationship.</li>' +
        '<li>It cannot be thrown from a lambda that implements a standard functional interface, ' +
        'which makes streams awkward and produces a lot of wrap-and-rethrow noise.</li>' +
        '<li>The obligation to handle it produces the empty catch block, which is worse than no ' +
        'checking at all.</li>' +
        '</ul>' +
        '<p>Spring\'s <code>DataAccessException</code> hierarchy is the deliberate example: JDBC ' +
        '<code>SQLException</code> is checked and useless — one type for every possible database ' +
        'failure — so Spring translates it into an unchecked hierarchy where the <em>type</em> ' +
        'carries the meaning, such as <code>DuplicateKeyException</code>. The lesson is that ' +
        'catchability should come from the type, not from the compiler.</p>' +
        '<p>The practical rule: <strong>throw unchecked by default</strong>; use checked only ' +
        'when the caller genuinely has an alternative course of action and you want to force ' +
        'them to consider it.</p>',
    referenceLinks: [
        { title: 'Unchecked Exceptions — The Controversy', url: 'https://docs.oracle.com/javase/tutorial/essential/exceptions/runtime.html' }
    ],
    tags: ['exceptions', 'error-handling', 'api-design'],
    images: [],
    hasDiagram: true,
    diagramType: 'flowchart',
    diagramConfig: {
        title: 'The Throwable hierarchy, and which parts you catch',
        nodes: [
            { id: 'throwable', label: 'Throwable',                    kind: 'start' },
            { id: 'error',     label: 'Error — do not catch',         kind: 'trap' },
            { id: 'exception', label: 'Exception',                    kind: 'step' },
            { id: 'checked',   label: 'Checked: compiler enforces',   kind: 'step' },
            { id: 'runtime',   label: 'RuntimeException: unchecked',  kind: 'fix' }
        ],
        edges: [
            { from: 'throwable', to: 'error' },
            { from: 'throwable', to: 'exception' },
            { from: 'exception', to: 'checked',  label: 'everything else' },
            { from: 'exception', to: 'runtime',  label: 'subtree' }
        ]
    },
    codeSnippets: []
},

{
    id: 'try-with-resources-and-suppressed',
    importance: 'should-know',
    subsection: 'errors',
    question: 'What does try-with-resources do that a finally block does not?',
    answer:
        '<p>Three things, and the third is the one almost nobody gets right by hand.</p>' +
        '<ul>' +
        '<li><strong>It closes in reverse order</strong> of declaration, which is what you want ' +
        'when a statement depends on a connection.</li>' +
        '<li><strong>It closes even when the resource declaration itself throws</strong>, ' +
        'closing whatever was already opened. The hand-written equivalent needs a nested ' +
        '<code>try</code> per resource, which is why the hand-written equivalent is usually ' +
        'wrong.</li>' +
        '<li><strong>It suppresses rather than replaces.</strong> If the body throws and then ' +
        '<code>close()</code> also throws, the body\'s exception propagates and the close ' +
        'exception is attached to it via <code>addSuppressed()</code>. A <code>finally</code> ' +
        'block that closes will instead let the close exception replace the original — and the ' +
        'original was the one that said what actually went wrong.</li>' +
        '</ul>' +
        '<p>That last point is the whole reason to use it. Losing the real exception because the ' +
        'cleanup also failed is one of the more infuriating ways to lose a production ' +
        'afternoon, and the suppressed exceptions are printed by ' +
        '<code>printStackTrace()</code> under a "Suppressed:" heading.</p>' +
        '<p>Since Java 9 the resource may be an effectively-final variable declared before the ' +
        '<code>try</code>, so you no longer have to declare it inside the parentheses.</p>',
    referenceLinks: [
        { title: 'The try-with-resources Statement — The Java Tutorials', url: 'https://docs.oracle.com/javase/tutorial/essential/exceptions/tryResourceClose.html' }
    ],
    tags: ['exceptions', 'resources', 'try-with-resources'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: [
        {
            language: 'java',
            title: 'The original exception survives',
            code:
                'public class Suppressed {\n' +
                '    static class Noisy implements AutoCloseable {\n' +
                '        @Override public void close() {\n' +
                '            throw new IllegalStateException("close failed");\n' +
                '        }\n' +
                '    }\n' +
                '\n' +
                '    public static void main(String[] args) {\n' +
                '        try (Noisy noisy = new Noisy()) {\n' +
                '            throw new RuntimeException("the real problem");\n' +
                '        } catch (Exception e) {\n' +
                '            System.out.println(e.getMessage());\n' +
                '            for (Throwable s : e.getSuppressed()) {\n' +
                '                System.out.println("suppressed: " + s.getMessage());\n' +
                '            }\n' +
                '        }\n' +
                '    }\n' +
                '}',
            output: {
                kind: 'stdout',
                lines: ['the real problem', 'suppressed: close failed'],
                explain:
                    '<p>Both exceptions survive and the useful one is on top. Written with a ' +
                    '<code>finally</code> that calls <code>close()</code>, the output would ' +
                    'have been "close failed" and the real problem would be gone.</p>'
            }
        }
    ]
},

{
    id: 'exception-translation-and-wrapping',
    importance: 'should-know',
    subsection: 'errors',
    question: 'How should an exception cross a layer boundary?',
    answer:
        '<p>By being <strong>translated</strong>: caught, and rethrown as an exception that means ' +
        'something at the new layer, with the original passed as the cause.</p>' +
        '<p>Letting a low-level exception escape leaks the implementation into the contract. If ' +
        'a repository throws <code>SQLException</code>, every caller now knows there is a ' +
        'database, and swapping it for an HTTP client becomes a change to every signature above ' +
        'it. The service layer should see <code>OrderNotFoundException</code> and not care where ' +
        'orders live.</p>' +
        '<p>Three rules for doing it properly:</p>' +
        '<ul>' +
        '<li><strong>Always pass the cause.</strong> <code>throw new ' +
        'OrderLookupFailed("order " + id, e)</code>. Dropping it destroys the stack trace that ' +
        'says what actually happened, and no amount of logging at the catch site makes up for ' +
        'it.</li>' +
        '<li><strong>Do not log and rethrow.</strong> That produces the same failure twice in ' +
        'the log at two different levels of detail, and doubles the noise during an ' +
        'incident. Log where you handle, throw where you do not.</li>' +
        '<li><strong>Add the context the lower layer did not have.</strong> The order id, the ' +
        'tenant, the operation. <code>SQLException: unique constraint violated</code> becomes ' +
        'useful only when something above it says which order it was trying to write.</li>' +
        '</ul>' +
        '<p>Spring does exactly this with <code>@Repository</code> and its exception translation ' +
        'post-processor, which is worth naming as the framework example of the pattern.</p>',
    referenceLinks: [],
    tags: ['exceptions', 'layering', 'error-handling'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'finally-swallows-return',
    importance: 'good-to-know',
    subsection: 'errors',
    question: 'What happens when a finally block contains a return?',
    answer:
        '<p>It <strong>discards</strong> whatever the <code>try</code> or <code>catch</code> was ' +
        'about to do — including a pending exception. A <code>return</code>, <code>break</code>, ' +
        '<code>continue</code> or <code>throw</code> in a <code>finally</code> block abandons ' +
        'the original control transfer completely, and the exception vanishes without ever being ' +
        'logged.</p>' +
        '<p>This is why every static analyser flags it, and why the rule is simply: <strong>no ' +
        'control flow in a <code>finally</code> block</strong>. Use it for cleanup, and prefer ' +
        'try-with-resources so you rarely need one at all.</p>' +
        '<p>The related subtlety is that <code>finally</code> cannot change a value that has ' +
        'already been computed for return. The return expression is evaluated <em>before</em> ' +
        'the <code>finally</code> block runs, so mutating a local afterwards has no effect on ' +
        'what is returned — but mutating an <em>object</em> that was returned does, because the ' +
        'reference was what got captured.</p>',
    referenceLinks: [],
    tags: ['exceptions', 'control-flow', 'finally'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: [
        {
            language: 'java',
            title: 'Two ways finally lies to you',
            code:
                'public class Finally {\n' +
                '    // The exception is thrown and then thrown away.\n' +
                '    static int swallowed() {\n' +
                '        try {\n' +
                '            throw new IllegalStateException("never seen");\n' +
                '        } finally {\n' +
                '            return 1;\n' +
                '        }\n' +
                '    }\n' +
                '\n' +
                '    // The return value was already computed. Mutating the local\n' +
                '    // afterwards changes nothing.\n' +
                '    static int alreadyEvaluated() {\n' +
                '        int value = 1;\n' +
                '        try {\n' +
                '            return value;\n' +
                '        } finally {\n' +
                '            value = 2;\n' +
                '        }\n' +
                '    }\n' +
                '\n' +
                '    public static void main(String[] args) {\n' +
                '        System.out.println(swallowed());\n' +
                '        System.out.println(alreadyEvaluated());\n' +
                '    }\n' +
                '}',
            output: {
                kind: 'stdout',
                lines: ['1', '1'],
                explain:
                    '<p>The first method throws an exception that no caller will ever see. The ' +
                    'second returns 1 despite the assignment of 2, because the return value was ' +
                    'fixed at the moment the <code>return</code> statement executed.</p>'
            }
        }
    ]
}

    ]
};
