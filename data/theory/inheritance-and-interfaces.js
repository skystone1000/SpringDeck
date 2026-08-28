/* ==========================================================================
   data/theory/inheritance-and-interfaces.js — module 5 in the reading path

   The module the Spring container assumes. Every bean injected by interface,
   every proxy, every @Override on a callback and every "why did my
   @Transactional private method do nothing" traces back to what is here.
   ========================================================================== */

const inheritanceAndInterfacesModule = {
    id: 'inheritance-and-interfaces',
    trackId: 'java-platform',
    order: 5,
    title: 'Inheritance, Interfaces and Polymorphism',
    tagline: 'Abstract class or interface, and the questions built on that choice.',
    estimatedMinutes: 35,
    prerequisites: ['objects-and-contracts'],
    docHub: { title: 'Interfaces and Inheritance', url: 'https://docs.oracle.com/javase/tutorial/java/IandI/index.html' },

    chapters: [
        {
            id: 'abstract-vs-interface',
            title: 'Abstract Class or Interface',
            importance: 'must-know',
            summary: 'The differences shrank in Java 8 and shrank again in Java 9. One of them did not, and it is the one that decides.',
            interviewAngle: 'Asked in every screening round and answered from a table most candidates memorised in 2014. Half that table is now wrong. What earns the mark is naming the single difference that still matters — state — and giving a rule you actually apply.',
            buildsOn: [],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>Before Java 8 the answer was easy: an interface was a list of method signatures and an abstract class could do everything else. Default methods, static methods and then private methods closed most of that gap. What is left is short enough to hold in your head, and one item on it does all the work.</p>'
                },
                {
                    type: 'comparison',
                    title: 'What is actually different, in Java 17 and later',
                    left: 'Abstract class',
                    right: 'Interface',
                    rows: [
                        { aspect: '<strong>Instance state</strong>', left: '<strong>Yes</strong> — fields of any kind', right: '<strong>No.</strong> Fields are implicitly <code>public static final</code>' },
                        { aspect: 'How many can you have', left: 'One', right: 'As many as you like' },
                        { aspect: 'Constructors', left: 'Yes', right: 'No' },
                        { aspect: 'Method bodies', left: 'Yes', right: 'Yes — <code>default</code>, <code>static</code>, <code>private</code>' },
                        { aspect: 'Member visibility', left: 'Any, including <code>protected</code>', right: '<code>public</code>, or <code>private</code> for helpers' },
                        { aspect: 'Adding a method later', left: 'Breaks every subclass unless concrete', right: 'Breaks nobody if it is <code>default</code>' },
                        { aspect: 'Can be a functional type', left: 'No', right: 'Yes, with exactly one abstract method' }
                    ]
                },
                {
                    type: 'prose',
                    html: '<p><strong>State is the difference that decides.</strong> An interface cannot hold a field, so it cannot express "every implementation has a name and a created timestamp". An abstract class can, and there is exactly one of it, so a class that already extends something cannot have it. Everything else on that table is a consequence or a detail.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The rule worth stating: <em>"Interface for a capability — what a thing can do, and a class can have many. Abstract class for shared implementation with state, and you only get one. In Spring I use interfaces for anything I want to inject or proxy, and reach for an abstract class only when there is real common state to hold."</em> Then, if it is a deep-dive round, add the compatibility point: default methods exist so an interface can grow without breaking every implementation, which is how <code>Collection</code> gained <code>stream()</code>.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>"Interfaces cannot have method bodies" is a Java 7 answer.</strong> So is "an abstract class can have static methods and an interface cannot". Reciting either dates you immediately, and worse, it invites the interviewer to spend the next five minutes correcting you rather than asking the question they wanted to ask.</p>'
                }
            ],
            docs: [
                { title: 'Default Methods', url: 'https://docs.oracle.com/javase/tutorial/java/IandI/defaultmethods.html', kind: 'guide' },
                { title: 'JEP 213: Milling Project Coin (private interface methods)', url: 'https://openjdk.org/jeps/213', kind: 'spec' }
            ],
            relatedQuestions: [
                { topicId: 'java-language', questionId: 'abstract-class-vs-interface' },
                { topicId: 'java-language', questionId: 'why-no-multiple-inheritance-of-state' }
            ]
        },

        {
            id: 'default-and-static-methods',
            title: 'Default, Static and Private Methods on an Interface',
            importance: 'should-know',
            summary: 'Added to let an interface evolve without breaking its implementations — which is the reason to reach for them, and the reason not to.',
            interviewAngle: 'The good version of this question is "why were default methods added", and the answer is a compatibility story, not a feature story. A candidate who says "so interfaces can have code" has memorised the what; one who says "so Collection could gain stream() in Java 8 without breaking every implementation ever written" has understood the why.',
            buildsOn: ['abstract-vs-interface'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>Java 8 needed to add <code>stream()</code> to <code>Collection</code>. Adding an abstract method to an interface breaks every class that implements it, and there were millions. A <code>default</code> method is an abstract method with a fallback body, so implementations that do not care are unaffected — <strong>interface evolution without a flag day</strong>. Everything else default methods are used for is a side effect of that design.</p>'
                },
                {
                    type: 'types',
                    title: 'The three kinds, and what each is for',
                    items: [
                        { name: 'default', html: '<p>Inherited by implementations, overridable by them. For evolving an existing interface, and for behaviour genuinely derivable from the other methods — <code>List.sort</code> from <code>get</code> and <code>set</code>.</p>' },
                        { name: 'static', html: '<p>Not inherited, called as <code>Interface.method()</code>. Where the factory and helper methods live that used to need a <code>Collections</code>-style companion class: <code>List.of</code>, <code>Comparator.comparing</code>, <code>Map.entry</code>.</p>' },
                        { name: 'private / private static', html: '<p>Java 9. Visible only inside the interface, so two default methods can share code without exposing a helper as public API. Purely a factoring tool.</p>' }
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'All three, doing their jobs',
                    code: 'public interface AuditTrail {\n\n    List<Event> events();\n\n    // default: derived from events(), and added later without\n    // breaking a single existing implementation.\n    default Optional<Event> latest() {\n        return events().stream().max(byTime());\n    }\n\n    default List<Event> since(Instant when) {\n        return events().stream()\n                       .filter(e -> e.at().isAfter(when))\n                       .sorted(byTime())\n                       .toList();\n    }\n\n    // private: shared by the two defaults, not part of the API.\n    private static Comparator<Event> byTime() {\n        return Comparator.comparing(Event::at);\n    }\n\n    // static: a factory, where a companion class used to go.\n    static AuditTrail of(List<Event> events) {\n        List<Event> copy = List.copyOf(events);\n        return () -> copy;\n    }\n}',
                    notes: '<p><code>AuditTrail</code> has exactly one abstract method, so the <code>static of</code> factory can return a lambda. That is the whole functional-interface mechanism, and it is why <code>@FunctionalInterface</code> is documentation rather than a requirement — the compiler counts abstract methods either way, and the annotation just makes it an error to accidentally add a second.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A default method cannot see state, so it cannot be a substitute for an abstract class.</strong> It can only call other methods on the interface. The moment a default method needs a field, you have discovered that this was an abstract class. The other limit is quieter: a default method cannot override anything from <code>Object</code> — no default <code>equals</code>, <code>hashCode</code> or <code>toString</code>, because a class always wins over an interface and <code>Object</code> is always in the hierarchy.</p>'
                }
            ],
            docs: [
                { title: 'Default Methods', url: 'https://docs.oracle.com/javase/tutorial/java/IandI/defaultmethods.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'java-language', questionId: 'default-methods-and-the-diamond' }
            ]
        },

        {
            id: 'diamond-resolution',
            title: 'The Diamond, and How Java Resolves It',
            importance: 'should-know',
            summary: 'Three rules, applied in order, and the third one is a compile error you are required to resolve by hand.',
            interviewAngle: 'The follow-up to "why does Java not have multiple inheritance". Since Java 8 it partly does — of behaviour, not state — so the answer has to explain what was avoided and how the remaining ambiguity is settled.',
            buildsOn: ['default-and-static-methods'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>Multiple inheritance of <em>state</em> is what Java refused, and the diamond problem is about state: if <code>D</code> inherits from <code>B</code> and <code>C</code> which both inherit from <code>A</code>, how many copies of <code>A</code>\'s fields does a <code>D</code> have? C++ answers with virtual inheritance and a lot of rules. Java answers by not having the question.</p><p>Default methods reopened it for <em>behaviour</em>, which is a much smaller problem: there is no state to duplicate, only a choice of which body runs. Three rules settle it.</p>'
                },
                {
                    type: 'types',
                    title: 'The resolution rules, applied in order',
                    items: [
                        { name: '1 — The class wins', html: '<p>A method inherited from a superclass beats any default method from any interface. Concrete beats default, always, and this is why an interface cannot supply a default <code>toString</code>.</p>' },
                        { name: '2 — The most specific interface wins', html: '<p>If <code>B extends A</code> and both declare a default, <code>B</code>\'s wins. A subinterface is assumed to know better than the interface it refines.</p>' },
                        { name: '3 — Otherwise, you decide', html: '<p>Two unrelated interfaces with the same default and no tie-break is a <strong>compile error</strong>. The implementing class must override the method, and may delegate with <code>Interface.super.method()</code>.</p>' }
                    ]
                },
                {
                    type: 'diagram',
                    diagramType: 'flowchart',
                    caption: 'Rule 3 is a compile error by design: an ambiguity the compiler could not resolve correctly is one it refuses to resolve at all.',
                    diagramConfig: {
                        title: 'Which body runs',
                        nodes: [
                            { id: 'call', label: 'obj.describe()', kind: 'start' },
                            { id: 'cls', label: 'Declared in a superclass?', kind: 'decision' },
                            { id: 'useCls', label: 'The class body runs', kind: 'fix' },
                            { id: 'spec', label: 'One interface more specific?', kind: 'decision' },
                            { id: 'useSpec', label: 'The subinterface default runs', kind: 'fix' },
                            { id: 'err', label: 'Compile error — override it', kind: 'trap' }
                        ],
                        edges: [
                            { from: 'call', to: 'cls' },
                            { from: 'cls', to: 'useCls', label: 'yes' },
                            { from: 'cls', to: 'spec', label: 'no' },
                            { from: 'spec', to: 'useSpec', label: 'yes' },
                            { from: 'spec', to: 'err', label: 'no' }
                        ]
                    }
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Rule 3, and the syntax that resolves it',
                    code: 'interface Timestamped { default String describe() { return "at " + Instant.now(); } }\ninterface Named       { default String describe() { return "named"; } }\n\n// Does not compile: "class Event inherits unrelated defaults\n// for describe() from types Timestamped and Named"\nclass Event implements Timestamped, Named { }\n\n// The fix. Overriding is mandatory; delegating is optional.\nclass Event2 implements Timestamped, Named {\n    @Override public String describe() {\n        return Named.super.describe() + " " + Timestamped.super.describe();\n    }\n}',
                    notes: '<p><code>Named.super.describe()</code> is legal only inside a class that directly implements <code>Named</code>, and only for a method that interface actually declares. It is not a general "call any ancestor" mechanism, which is exactly the restraint that keeps this from becoming C++.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Answer the "why no multiple inheritance" question in one move: <em>"It refused multiple inheritance of state — that is what the diamond problem is about, how many copies of the fields you get. Since Java 8 it does have multiple inheritance of behaviour through default methods, and the ambiguity there is settled by three rules: class beats interface, more specific interface beats less specific, and anything still ambiguous is a compile error you resolve by overriding."</em></p>'
                }
            ],
            docs: [
                { title: 'JLS 9.4.1 — Inheritance and Overriding', url: 'https://docs.oracle.com/javase/specs/jls/se21/html/jls-9.html#jls-9.4.1', kind: 'spec' }
            ],
            relatedQuestions: [
                { topicId: 'java-language', questionId: 'default-methods-and-the-diamond' },
                { topicId: 'java-language', questionId: 'why-no-multiple-inheritance-of-state' }
            ]
        },

        {
            id: 'overriding-vs-overloading',
            title: 'Overriding and Overloading Are Not Related',
            importance: 'must-know',
            summary: 'One is resolved at compile time from the static types of the arguments; the other at run time from the actual type of the receiver. They share four letters and nothing else.',
            interviewAngle: 'A staple, and the version worth preparing is the one where they show you code and ask what it prints. The trap is always the same: an overload chosen from a declared type, when the reader expected the runtime type to matter.',
            buildsOn: [],
            blocks: [
                {
                    type: 'definition',
                    term: 'Dynamic dispatch',
                    important: true,
                    html: '<p>Choosing which <em>overridden</em> method body to run based on the actual class of the receiver at run time. Java does this for every instance method that is not <code>private</code>, <code>static</code> or <code>final</code>. It is what makes polymorphism work, and what a Spring proxy exploits.</p>'
                },
                {
                    type: 'comparison',
                    title: 'Side by side',
                    left: 'Overriding',
                    right: 'Overloading',
                    rows: [
                        { aspect: 'Same method name', left: 'Yes', right: 'Yes' },
                        { aspect: 'Same parameter list', left: '<strong>Yes</strong> — it must match', right: '<strong>No</strong> — it must differ' },
                        { aspect: 'Where', left: 'A subclass, of a supertype method', right: 'The same class, or inherited' },
                        { aspect: 'Chosen', left: 'At run time, from the object', right: 'At compile time, from the declared argument types' },
                        { aspect: 'Return type', left: 'Same, or covariant', right: 'Irrelevant — cannot differ by return type alone' },
                        { aspect: 'Visibility', left: 'Cannot be reduced', right: 'Anything' },
                        { aspect: 'Checked exceptions', left: 'Cannot be broadened', right: 'Anything' },
                        { aspect: 'Really called', left: 'Polymorphism', right: 'Ad-hoc naming' }
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The one they show you on a whiteboard',
                    code: 'class Parent {\n    void greet()              { System.out.println("Parent.greet"); }\n    void accept(Object o)     { System.out.println("accept(Object)"); }\n}\n\nclass Child extends Parent {\n    @Override void greet()    { System.out.println("Child.greet"); }\n    void accept(String s)     { System.out.println("accept(String)"); }\n}\n\nParent p = new Child();\np.greet();                 // ?\n\nChild c = new Child();\nObject text = "hello";\nc.accept(text);            // ?',
                    output: {
                        kind: 'trace',
                        lines: [
                            'p.greet() prints "Child.greet". greet is OVERRIDDEN, so the body is chosen at run time from what p actually is.',
                            'c.accept(text) prints "accept(Object)". accept is OVERLOADED, and the compiler chose from the DECLARED type of text, which is Object.',
                            'Changing the declaration to String text = "hello" changes the second line to accept(String), with no change to any class.',
                            'That is the whole lesson: overriding follows the object, overloading follows the declaration.'
                        ],
                        explain: '<p>The second call is the one people get wrong, and it is worth being able to state why in one sentence: <strong>overload resolution happens entirely in the compiler</strong>, which knows only the declared types. It has no access to what the reference will point at.</p>'
                    }
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Overloading across an inheritance boundary with <code>null</code> is genuinely ambiguous.</strong> <code>accept(null)</code> where both <code>accept(String)</code> and <code>accept(Integer)</code> exist is a compile error — neither is more specific. With <code>accept(Object)</code> and <code>accept(String)</code> it compiles and picks <code>String</code>, because the most specific applicable overload wins. This is a real question and the answer is "cast it and stop making the reader guess".</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Always write <code>@Override</code>.</strong> It is not decoration: it turns "I meant to override and got the signature slightly wrong" from a silent overload into a compile error. The classic is <code>public boolean equals(MyType other)</code> — a perfectly legal overload that is never called by any collection, and that leaves the identity-based <code>equals</code> in place. With <code>@Override</code> it does not compile.</p>'
                }
            ],
            docs: [
                { title: 'JLS 15.12.2 — Compile-Time Step 2: Determine Method Signature', url: 'https://docs.oracle.com/javase/specs/jls/se21/html/jls-15.html#jls-15.12.2', kind: 'spec' }
            ],
            relatedQuestions: [
                { topicId: 'java-language', questionId: 'overloading-vs-overriding' },
                { topicId: 'java-language', questionId: 'static-binding-vs-dynamic-dispatch' },
                { topicId: 'java-language', questionId: 'covariant-return-types' }
            ]
        },

        {
            id: 'static-method-hiding',
            title: 'Static Methods Are Hidden, Fields Too',
            importance: 'good-to-know',
            summary: 'Neither participates in dynamic dispatch, so both are resolved from the declared type — and that is why a Spring proxy cannot intercept them.',
            interviewAngle: 'Trivia on its own. Load-bearing as soon as the conversation reaches proxies: the list of things Spring AOP cannot advise is exactly the list of things that are not virtual, and being able to derive that list rather than recall it is a much better answer.',
            buildsOn: ['overriding-vs-overloading'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Hiding, not overriding',
                    code: 'class Base {\n    static String kind() { return "base"; }\n    String name = "base";\n}\n\nclass Derived extends Base {\n    static String kind() { return "derived"; }   // hides, not overrides\n    String name = "derived";                     // hides, not overrides\n}\n\nBase b = new Derived();\n\nBase.kind();      // "base"\nDerived.kind();   // "derived"\nb.name;           // "base"    <- the DECLARED type decides\n((Derived) b).name;  // "derived"',
                    output: {
                        kind: 'trace',
                        lines: [
                            'A static method belongs to the class, not to an instance, so there is no receiver to dispatch on.',
                            'Derived.kind() does not override Base.kind(); it hides it. Both remain callable through their own class name.',
                            'Field access is never virtual either. b.name reads Base.name because b is declared Base.',
                            'The cast changes the declared type, and therefore the field that is read — with no object involved.'
                        ],
                        explain: '<p>Fields are not polymorphic and never have been. This is the strongest practical argument for keeping fields private and reaching them through methods, which <em>are</em> polymorphic.</p>'
                    }
                },
                {
                    type: 'prose',
                    html: '<p>The list of things Java does not dispatch dynamically is short: <code>static</code> methods, <code>private</code> methods, <code>final</code> methods, constructors, and field access. Spring AOP works by handing you a subclass or an interface implementation that overrides your methods and calls through — so <strong>anything on that list cannot be advised</strong>, and it fails by doing nothing rather than by throwing.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>This is why <code>@Transactional</code> on a private method is silently ignored.</strong> The proxy cannot override a private method, so there is nothing to intercept — no transaction, no error, no warning in the default configuration. The same applies to <code>final</code> methods and <code>final</code> classes under CGLIB. See the AOP module for the full list and the self-invocation case, which is the same mechanism seen from inside.</p>'
                }
            ],
            docs: [
                { title: 'JLS 8.4.8.2 — Hiding (by Class Methods)', url: 'https://docs.oracle.com/javase/specs/jls/se21/html/jls-8.html#jls-8.4.8.2', kind: 'spec' }
            ],
            relatedQuestions: [
                { topicId: 'java-language', questionId: 'static-binding-vs-dynamic-dispatch' },
                { topicId: 'aop-proxies', questionId: 'transactional-on-private' }
            ]
        },

        {
            id: 'composition-over-inheritance',
            title: 'Composition Over Inheritance',
            importance: 'must-know',
            summary: 'Not a slogan. Inheritance publishes a superclass\'s internal call structure as part of its contract, and the standard example shows a subclass counting everything twice.',
            interviewAngle: 'Asked as "when would you use inheritance", and a candidate who answers "for is-a relationships" has said nothing. The mark is for naming what inheritance costs: it is the tightest coupling the language offers, and it breaks when the superclass changes something it never documented.',
            buildsOn: ['abstract-vs-interface'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>The argument is not that inheritance is bad. It is that <strong>inheritance couples you to how the superclass is implemented</strong>, not just to what it does — and that dependency is invisible in the source and undocumented in the Javadoc. A superclass author who changes which of their own methods they call internally has broken your subclass without changing a single signature.</p>'
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The canonical failure',
                    code: '// Count everything ever added. Looks obviously correct.\nclass CountingSet<E> extends HashSet<E> {\n    private int added = 0;\n\n    @Override public boolean add(E e) {\n        added++;\n        return super.add(e);\n    }\n\n    @Override public boolean addAll(Collection<? extends E> c) {\n        added += c.size();\n        return super.addAll(c);\n    }\n\n    int added() { return added; }\n}\n\nCountingSet<String> set = new CountingSet<>();\nset.addAll(List.of("a", "b", "c"));\nset.added();     // 6, not 3',
                    output: {
                        kind: 'trace',
                        lines: [
                            'addAll adds 3 to the counter, then calls super.addAll.',
                            'HashSet.addAll is implemented by calling this.add once per element — an internal detail, not documented as part of the contract.',
                            'this.add is the overridden one, so the counter is incremented three more times.',
                            'The result is 6. Removing the addAll override fixes it — until a future JDK changes how addAll is implemented, and then it breaks the other way.'
                        ],
                        explain: '<p>Nothing here is a bug in <code>HashSet</code> and nothing is a bug in the subclass. The bug is that the subclass depends on a fact — <em>addAll calls add</em> — that was never part of the contract, and cannot be checked by any compiler or test the subclass author would think to write.</p>'
                    }
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Composition: the same feature, no coupling',
                    code: 'class CountingSet<E> implements Set<E> {\n    private final Set<E> delegate;\n    private int added = 0;\n\n    CountingSet(Set<E> delegate) { this.delegate = delegate; }\n\n    @Override public boolean add(E e) {\n        added++;\n        return delegate.add(e);\n    }\n\n    @Override public boolean addAll(Collection<? extends E> c) {\n        added += c.size();\n        return delegate.addAll(c);   // cannot re-enter this.add\n    }\n\n    // ...and the rest of Set, forwarded.\n\n    int added() { return added; }\n}',
                    notes: '<p>The counter is now correct however <code>delegate.addAll</code> is implemented, because the delegate has no way to call back into this object. The cost is the forwarding methods, which an IDE writes and which — being the whole point — cannot accidentally re-enter. This is also exactly the shape of the decorator pattern, and of every Spring proxy.</p>'
                },
                {
                    type: 'types',
                    title: 'When inheritance is still the right answer',
                    items: [
                        { name: 'You own both sides', html: '<p>Superclass and subclass in the same package or module, maintained together. Bloch\'s rule is about extending across a package boundary you do not control.</p>' },
                        { name: 'The superclass was designed for it', html: '<p>Documented self-use, protected hooks, a stated extension contract. <code>AbstractList</code>, <code>OncePerRequestFilter</code>, <code>WebSecurityConfigurerAdapter</code> in its day.</p>' },
                        { name: 'It is genuinely a subtype', html: '<p>Every method of the supertype is meaningful and correct on the subtype — which is Liskov, and is the next chapter.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>Say what it costs, not what it is: <em>"Inheritance is the tightest coupling the language has — I inherit the superclass\'s internal call structure, not just its API, and that is not in the Javadoc. So I use it when I own both sides or when the class was explicitly designed for extension, and composition otherwise. The <code>HashSet</code> counting example is the one that convinced me."</em></p>'
                }
            ],
            docs: [
                { title: 'AbstractSet — a class documented for extension', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/AbstractSet.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'java-language', questionId: 'inheritance-vs-composition' }
            ]
        },

        {
            id: 'liskov-in-practice',
            title: 'Liskov Substitution, Without the Notation',
            importance: 'should-know',
            summary: 'A subtype must be usable everywhere its supertype is, with no caller needing to know. Four concrete rules, and the square that is not a rectangle.',
            interviewAngle: 'Comes up twice: in the SOLID question, where a definition is enough, and inside design rounds, where violating it is how a class hierarchy quietly becomes a bug. Have the rectangle example ready — it is short, and it makes the abstract statement concrete in fifteen seconds.',
            buildsOn: ['composition-over-inheritance'],
            blocks: [
                {
                    type: 'definition',
                    term: 'Liskov Substitution Principle',
                    important: true,
                    html: '<p>Code written against a type must keep working when handed any subtype of it, without knowing which. The <em>L</em> in SOLID. Stated as a constraint on overriding: a subtype may not demand more of its callers, may not promise less to them, and may not break an invariant the supertype maintained.</p>'
                },
                {
                    type: 'types',
                    title: 'The four rules, as things you can check',
                    items: [
                        { name: 'Do not strengthen preconditions', html: '<p>If the supertype accepts any <code>int</code>, the subtype cannot reject negatives. The caller was written against the supertype and does not know to check.</p>' },
                        { name: 'Do not weaken postconditions', html: '<p>If the supertype guarantees a non-null result, the subtype must too. Java enforces a piece of this — you cannot broaden a checked exception or narrow visibility — and nothing enforces the rest.</p>' },
                        { name: 'Preserve invariants', html: '<p>Whatever was always true of the supertype must remain true. A subtype of an immutable class that adds a setter has broken every caller that cached it.</p>' },
                        { name: 'Do not throw new unchecked exceptions', html: '<p>An <code>UnsupportedOperationException</code> from an overridden method is the loudest violation there is — and the JDK does it, in <code>List.of(...).add()</code>, which is a deliberate and much-argued-about compromise.</p>' }
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The square that is not a rectangle',
                    code: 'class Rectangle {\n    protected int width, height;\n    void setWidth(int w)  { this.width = w; }\n    void setHeight(int h) { this.height = h; }\n    int area()            { return width * height; }\n}\n\n// A square IS-A rectangle, in geometry.\nclass Square extends Rectangle {\n    @Override void setWidth(int w)  { this.width = w; this.height = w; }\n    @Override void setHeight(int h) { this.width = h; this.height = h; }\n}\n\n// Written against Rectangle. Correct for every Rectangle.\nvoid resize(Rectangle r) {\n    r.setWidth(5);\n    r.setHeight(4);\n    assert r.area() == 20;\n}\n\nresize(new Square());   // area is 16',
                    output: {
                        kind: 'trace',
                        lines: [
                            'setWidth(5) sets both dimensions to 5.',
                            'setHeight(4) sets both dimensions to 4.',
                            'area() is 16, and the assertion written against Rectangle fails.',
                            'Nothing in Square is wrong on its own terms. What is wrong is the claim that it can stand in for a Rectangle.'
                        ],
                        explain: '<p>The lesson generalises past the toy: <strong>is-a in the domain does not imply is-a in the code</strong>. The relationship that matters is behavioural substitutability, and it depends on what the supertype promised — here, that width and height move independently. A mutable <code>Rectangle</code> promises that; an immutable one does not, and an immutable <code>Square</code> is a perfectly good subtype.</p>'
                    }
                },
                {
                    type: 'tip',
                    html: '<p>In a design round, use it as a test rather than a principle: <em>"Before I make B extend A, I ask whether every method on A still makes sense on B, and whether any caller of A would be surprised. If the answer is that B has to reject an argument A accepted, or throw where A returned, it is not a subtype and I compose instead."</em></p>'
                }
            ],
            docs: [
                { title: 'List.of — an intentional substitutability compromise', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/List.html#of()', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'java-language', questionId: 'inheritance-vs-composition' },
                { topicId: 'collections', questionId: 'immutable-collections' }
            ]
        }
    ]
};
