/* ==========================================================================
   data/design-patterns.js — Design Patterns, SOLID & OOD

   Three subsections, and the first topic on the `craft` track.

   The trap in this topic is reciting. Anyone can list five principles and
   twenty-three patterns; almost nobody can say what a Liskov violation looks
   like in code they have written, or why Spring's singleton is not the
   Gang of Four singleton. So every question here is written to need an
   example or a judgement, and two of them exist specifically to be answered
   in the negative — when a pattern is overkill, and which ones are
   anti-patterns.

   This is also the vocabulary the tier-1 machine coding drills are graded
   in, which is why the topic exists at all rather than being folded into
   architecture-ddd.

   ONE GLOBAL PER FILE.
   ========================================================================== */

const designPatternsData = {
    id: 'design-patterns',
    title: 'Design Patterns, SOLID & OOD',
    subsections: [
        { id: 'solid',     title: 'SOLID & OO Design' },
        { id: 'gof',       title: 'Patterns That Get Asked' },
        { id: 'in-spring', title: 'Patterns Spring Uses' }
    ],
    keyTopics: [
        'single responsibility', 'open-closed', 'liskov substitution',
        'interface segregation', 'dependency inversion', 'singleton',
        'factory and abstract factory', 'builder', 'strategy', 'template method',
        'observer', 'decorator', 'adapter', 'proxy', 'chain of responsibility',
        'patterns in Spring', 'when a pattern is overkill', 'anti-patterns'
    ],
    questions: [

/* ==== SOLID & OO Design =============================================== */

{
    id: 'solid-principles',
    importance: 'must-know',
    subsection: 'solid',
    question: 'What are the SOLID principles, and which one is most often misunderstood?',
    answer:
        '<p>One sentence each, and then the one that gets misquoted.</p>' +
        '<ul>' +
        '<li><strong>Single responsibility</strong> — a class should have one reason to ' +
        'change.</li>' +
        '<li><strong>Open-closed</strong> — open for extension, closed for modification: adding ' +
        'behaviour should not mean editing existing code.</li>' +
        '<li><strong>Liskov substitution</strong> — anywhere a base type is expected, any subtype ' +
        'must work without the caller knowing.</li>' +
        '<li><strong>Interface segregation</strong> — a client should not be forced to depend on ' +
        'methods it does not use.</li>' +
        '<li><strong>Dependency inversion</strong> — depend on abstractions, and the abstraction ' +
        'belongs to the caller.</li>' +
        '</ul>' +
        '<p><strong>Single responsibility is the one that is misunderstood</strong>, because ' +
        '"one responsibility" gets read as "one method" or "one thing", which produces a codebase ' +
        'of two hundred classes that each do a quarter of something and cannot be read in any ' +
        'order.</p>' +
        '<p>The precise version is <em>one reason to change</em>, and the sharpest formulation is ' +
        '<strong>one <em>actor</em></strong>: a class should answer to a single stakeholder. A ' +
        '<code>Payslip</code> class with <code>calculatePay</code>, <code>saveToDatabase</code> ' +
        'and <code>printReport</code> violates it not because that is three things but because ' +
        'finance, the DBA and operations each have the power to force a change to it, and their ' +
        'requests will collide.</p>' +
        '<p>Conversely, two methods that always change together <strong>belong in the same ' +
        'class</strong>, and splitting them is a violation of the same principle read properly. ' +
        'The principle is as much about cohesion as about separation.</p>' +
        '<p>The framing worth offering: <strong>SOLID is a set of heuristics for managing change, ' +
        'not a checklist for correctness.</strong> Code that will never change gains nothing from ' +
        'them, and applying all five to a three-line utility is how a codebase becomes hard to ' +
        'read in the name of being easy to change.</p>',
    referenceLinks: [
        { title: 'Java Tutorials — Interfaces and Inheritance', url: 'https://docs.oracle.com/javase/tutorial/java/IandI/index.html' }
    ],
    tags: ['solid', 'design', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'liskov-violations-in-real-code',
    importance: 'should-know',
    subsection: 'solid',
    question: 'What does a Liskov substitution violation actually look like?',
    answer:
        '<p>The textbook example is <code>Square extends Rectangle</code>: setting the width of a ' +
        'square also changes its height, so code that sets both and asserts the area breaks. It ' +
        'is a real violation and it is not what you meet in practice.</p>' +
        '<p><strong>The violation you actually meet is the one that throws.</strong> A subclass ' +
        'that implements a method by raising <code>UnsupportedOperationException</code> is saying ' +
        '"I am not really one of these", and it is <em>in the JDK</em>: ' +
        '<code>List.of(...)</code> returns a <code>List</code> whose <code>add</code> throws. Any ' +
        'method taking a <code>List</code> and adding to it — which the type says is fine — fails ' +
        'at run time depending on which implementation it was handed.</p>' +
        '<p>The other three shapes, all detectable by reading:</p>' +
        '<ul>' +
        '<li><strong>Strengthening a precondition.</strong> The base accepts any string; the ' +
        'subclass rejects empty ones. Existing callers now fail.</li>' +
        '<li><strong>Weakening a postcondition.</strong> The base guarantees a sorted result; the ' +
        'subclass does not.</li>' +
        '<li><strong>Throwing a new checked exception</strong>, or changing what a null return ' +
        'means.</li>' +
        '</ul>' +
        '<p>The practical test — and the one worth naming as the answer — is: ' +
        '<strong><code>instanceof</code> or a cast in the caller is the symptom.</strong> If ' +
        'client code has to ask what kind of subtype it is holding, substitutability has already ' +
        'failed, and the polymorphism is doing nothing.</p>' +
        '<p>The usual fix is <strong>composition instead of inheritance</strong>. ' +
        '<code>Square</code> has a side length; it is not a rectangle you can set the width of. ' +
        'And "is-a" in English is not "is-a" in a type system — the type relationship is about ' +
        '<em>behavioural</em> substitutability, which is a much stronger claim.</p>',
    referenceLinks: [
        { title: 'List.of — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/List.html' }
    ],
    tags: ['solid', 'inheritance', 'design'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'dependency-inversion-versus-injection',
    importance: 'must-know',
    subsection: 'solid',
    question: 'Is dependency injection the same as dependency inversion?',
    answer:
        '<p>No, and the difference is worth being precise about because the words are close ' +
        'enough that most people use them interchangeably.</p>' +
        '<p><strong>Dependency injection is a technique</strong>: an object is handed its ' +
        'collaborators rather than constructing them. <strong>Dependency inversion is a principle ' +
        'about the direction of source dependencies</strong>: high-level policy should not depend ' +
        'on low-level detail; both should depend on an abstraction.</p>' +
        '<p>You can have either without the other. Injecting a concrete ' +
        '<code>PostgresOrderRepository</code> through a constructor is dependency injection with ' +
        'no inversion at all — the service still depends on Postgres, it just did not type ' +
        '<code>new</code>. And a factory method returning an interface inverts the dependency ' +
        'with no injection anywhere.</p>' +
        '<p><strong>The part that makes inversion real, and the part almost everyone misses: the ' +
        'interface belongs to the high-level module.</strong> <code>OrderService</code> defines ' +
        '<code>OrderRepository</code> in <em>its own</em> package, expressed in <em>its</em> ' +
        'vocabulary; the JDBC implementation lives in the infrastructure package and depends ' +
        'inwards on it. That is what inverts the arrow.</p>' +
        '<p>Putting the interface next to the implementation — an ' +
        '<code>OrderRepository</code> in the persistence package, shaped like the database — ' +
        'leaves the arrow pointing outward and buys nothing except a file. It is the most common ' +
        'way a codebase has interfaces everywhere and no inversion anywhere.</p>' +
        '<p>The test: <strong>could you delete the infrastructure package and still compile the ' +
        'domain?</strong> If yes, the dependency is inverted. If the domain imports anything from ' +
        'it, it is not — and that is the same question hexagonal architecture asks, which is why ' +
        'this principle is the one that scales up into an architecture.</p>',
    referenceLinks: [
        { title: 'Spring Framework — IoC Container', url: 'https://docs.spring.io/spring-framework/reference/core/beans/introduction.html' }
    ],
    tags: ['solid', 'architecture', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'open-closed-in-practice',
    importance: 'should-know',
    subsection: 'solid',
    question: 'How do you apply open-closed without predicting the future?',
    answer:
        '<p>You mostly do not, and that is the honest answer. Designing an extension point ' +
        'before you know what will extend it produces an abstraction shaped by a guess — and a ' +
        'wrong guess is worse than no abstraction, because now the shape has to be worked around ' +
        'as well as changed.</p>' +
        '<p><strong>The workable version is: write it concretely, and abstract on the second ' +
        'case.</strong> The first payment provider is a class. The second one is when you learn ' +
        'what actually varies, and the interface you extract is shaped by two real ' +
        'implementations rather than one imagined pair. The third costs nothing.</p>' +
        '<p>Where it does pay to apply up front is the place variation is <em>certain</em>: a ' +
        'notification channel, a report format, a tax rule per country. If the requirement ' +
        'already says "and more later", the extension point is a requirement, not a guess.</p>' +
        '<p>What it looks like in code, mostly one of three shapes:</p>' +
        '<ul>' +
        '<li><strong>Strategy</strong> — an interface with an implementation per case, selected ' +
        'at run time. In Spring, injecting <code>List&lt;PaymentProcessor&gt;</code> or a ' +
        '<code>Map&lt;String, PaymentProcessor&gt;</code> means adding a case is adding a ' +
        '<code>@Component</code>, with no existing file touched.</li>' +
        '<li><strong>A sealed interface with pattern matching</strong>, which is the modern Java ' +
        'answer and inverts the trade deliberately: adding a case <em>does</em> require editing ' +
        'the switch, and the compiler tells you every place that needs it. For a closed set of ' +
        'variants that is better than an open one.</li>' +
        '<li><strong>Configuration over code</strong> — a rules table beats a class hierarchy ' +
        'when the variation is data.</li>' +
        '</ul>' +
        '<p>The sentence worth carrying: <strong>open-closed is a description of code that has ' +
        'already changed a few times, more than an instruction for code that has not.</strong></p>',
    referenceLinks: [
        { title: 'JEP 409: Sealed Classes', url: 'https://openjdk.org/jeps/409' }
    ],
    tags: ['solid', 'design', 'judgement'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

/* ==== Patterns That Get Asked ========================================= */

{
    id: 'strategy-pattern',
    importance: 'must-know',
    subsection: 'gof',
    question: 'Explain the strategy pattern with an example you would actually write.',
    answer:
        '<p>A family of interchangeable algorithms behind one interface, chosen at run time. It ' +
        'is the pattern that replaces a growing <code>if/else</code> or <code>switch</code> over ' +
        'a type code — and that switch is the tell that you want it.</p>' +
        '<p>The example worth using is one with real variation: shipping cost by carrier, ' +
        'discount by customer tier, export by format, retry policy by failure kind. Each becomes ' +
        'an implementation, and adding one means adding a class rather than editing a method ' +
        'other cases depend on.</p>' +
        '<p><strong>In Spring it is barely a pattern, because the container does the ' +
        'assembly.</strong> Declare the interface, annotate each implementation, and inject ' +
        '<code>List&lt;PaymentProcessor&gt;</code> or ' +
        '<code>Map&lt;String, PaymentProcessor&gt;</code> — Spring supplies every implementation, ' +
        'keyed by bean name for the map. Selecting one is a lookup. This is the answer that ' +
        'shows you have used it rather than read about it.</p>' +
        '<p>Three things worth adding:</p>' +
        '<ul>' +
        '<li><strong>In Java a strategy is often a lambda.</strong> If the interface has one ' +
        'method, a full class per case may be more ceremony than the variation deserves — ' +
        '<code>Comparator</code> is the canonical strategy and nobody writes classes for it.</li>' +
        '<li><strong>The selection logic has to live somewhere</strong>, and it is easy to ' +
        'replace one switch with another one that picks the strategy. Keying a map by an enum ' +
        'from the domain, or letting each strategy declare what it <code>supports</code>, keeps ' +
        'that from happening.</li>' +
        '<li><strong>Strategy versus state</strong> — the same structure. Strategy is chosen by ' +
        'the caller and does not change; state changes itself as the object transitions.</li>' +
        '</ul>',
    referenceLinks: [
        { title: 'Spring Framework — Autowiring Collections', url: 'https://docs.spring.io/spring-framework/reference/core/beans/annotation-config/autowired.html' }
    ],
    tags: ['patterns', 'strategy', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: [
        {
            language: 'java',
            title: 'Strategy, assembled by the container',
            code:
                'public interface PaymentProcessor {\n' +
                '    PaymentMethod method();\n' +
                '    Receipt charge(Money amount, PaymentDetails details);\n' +
                '}\n' +
                '\n' +
                '@Component class CardProcessor implements PaymentProcessor { /* ... */ }\n' +
                '@Component class UpiProcessor  implements PaymentProcessor { /* ... */ }\n' +
                '\n' +
                '@Service\n' +
                'class PaymentService {\n' +
                '    private final Map<PaymentMethod, PaymentProcessor> processors;\n' +
                '\n' +
                '    // Spring injects every implementation; we index them by their own key,\n' +
                '    // so adding a processor touches no file that already exists.\n' +
                '    PaymentService(List<PaymentProcessor> all) {\n' +
                '        this.processors = all.stream()\n' +
                '                .collect(toMap(PaymentProcessor::method, identity()));\n' +
                '    }\n' +
                '\n' +
                '    Receipt pay(PaymentMethod method, Money amount, PaymentDetails d) {\n' +
                '        var processor = processors.get(method);\n' +
                '        if (processor == null) throw new UnsupportedPaymentMethod(method);\n' +
                '        return processor.charge(amount, d);\n' +
                '    }\n' +
                '}',
            output: {
                kind: 'trace',
                lines: ['adding a third processor is one new @Component and no edits'],
                explain:
                    '<p>Indexing by a key the strategy declares, rather than by bean name, is ' +
                    'what keeps the selection out of the service. Note that toMap throws on a ' +
                    'duplicate key — which here is exactly right: two processors claiming the ' +
                    'same method is a configuration error worth failing at start-up.</p>'
            }
        }
    ]
},

{
    id: 'factory-versus-builder',
    importance: 'must-know',
    subsection: 'gof',
    question: 'When would you use a factory, and when a builder?',
    answer:
        '<p>They answer different questions. <strong>A factory decides <em>which</em> object to ' +
        'create. A builder assembles <em>one complicated</em> object.</strong></p>' +
        '<p><strong>Factory</strong> when the concrete type depends on input, and the caller ' +
        'should not know the options: parse a file by extension, create a notifier by channel, ' +
        'pick a parser by content type. The caller gets an interface.</p>' +
        '<p>The variants, since they get asked as one question:</p>' +
        '<ul>' +
        '<li><strong>Static factory method</strong> — <code>List.of</code>, ' +
        '<code>Optional.empty</code>, <code>Instant.now</code>. Not a Gang of Four pattern and by ' +
        'far the most useful of the three: it can have a meaningful name, can return a subtype, ' +
        'and can return a cached instance instead of a new one.</li>' +
        '<li><strong>Factory method</strong> — a subclass decides the type.</li>' +
        '<li><strong>Abstract factory</strong> — a family of related objects that must be ' +
        'consistent with each other. Genuinely rare in application code.</li>' +
        '</ul>' +
        '<p><strong>Builder</strong> when construction has many parameters, several optional, and ' +
        'a telescoping set of constructors would be unreadable. It gives named arguments in a ' +
        'language that lacks them, allows validation in <code>build()</code>, and produces an ' +
        'immutable result.</p>' +
        '<p>Two judgements that separate a considered answer:</p>' +
        '<ul>' +
        '<li><strong>Four or five parameters is not a builder.</strong> It is a constructor, or a ' +
        'record. A builder on a small object is ceremony, and Lombok\'s <code>@Builder</code> ' +
        'makes it cheap enough to add where it is not wanted — including the real hazard, that a ' +
        'builder <strong>removes the compiler\'s check that you set the required fields</strong>. ' +
        'A missing constructor argument does not compile; a missing builder call fails at run ' +
        'time.</li>' +
        '<li><strong>Several parameters of the same type</strong> is the strongest signal for a ' +
        'builder, because that is the case where positional arguments get silently swapped.</li>' +
        '</ul>',
    referenceLinks: [
        { title: 'Java Tutorials — Creating Objects', url: 'https://docs.oracle.com/javase/tutorial/java/javaOO/objectcreation.html' }
    ],
    tags: ['patterns', 'creational', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'singleton-and-spring',
    importance: 'should-know',
    subsection: 'gof',
    question: 'Is a Spring singleton the same as the singleton pattern?',
    answer:
        '<p>No, and the difference is the reason one of them is a well-known anti-pattern and the ' +
        'other is the default.</p>' +
        '<p><strong>The Gang of Four singleton</strong> enforces one instance <em>itself</em>: a ' +
        'private constructor and a static <code>getInstance()</code>. That is what makes it a ' +
        'problem — the class has taken a decision away from its callers. Consequences: you cannot ' +
        'substitute it in a test, the dependency is invisible because callers reach for it ' +
        'statically rather than declaring it, and its lifetime is the JVM\'s, so any state it ' +
        'holds is global mutable state.</p>' +
        '<p><strong>A Spring singleton</strong> is one instance <em>per container</em>, and the ' +
        'class knows nothing about it. It has an ordinary public constructor, it can be ' +
        'instantiated directly in a test with mocks, and a second context has its own. The scope ' +
        'is a configuration decision rather than a property of the type — which is exactly the ' +
        'inversion that removes every objection above.</p>' +
        '<p>The follow-up worth pre-empting: <strong>a singleton bean must be stateless, or ' +
        'thread-safe.</strong> One instance serves every concurrent request, so a mutable field ' +
        'on a <code>@Service</code> is shared mutable state across threads. This is a real and ' +
        'common bug, and it is invisible until there is load.</p>' +
        '<p>And the classic trap: <strong>injecting a prototype-scoped bean into a singleton ' +
        'gives you one instance, not one per use.</strong> Injection happens once, at ' +
        'construction. The fixes are <code>ObjectProvider</code>, a lookup method, or scoped ' +
        'proxies.</p>' +
        '<p>If you do need a genuine JVM singleton, an <strong>enum</strong> is the right ' +
        'implementation — thread-safe initialisation guaranteed by the language, and immune to ' +
        'the reflection and serialization attacks that defeat the double-checked-locking ' +
        'version.</p>',
    referenceLinks: [
        { title: 'Spring Framework — Bean Scopes', url: 'https://docs.spring.io/spring-framework/reference/core/beans/factory-scopes.html' }
    ],
    tags: ['patterns', 'spring', 'singleton'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'decorator-proxy-adapter',
    importance: 'should-know',
    subsection: 'gof',
    question: 'Decorator, proxy and adapter have the same structure. What distinguishes them?',
    answer:
        '<p><strong>Intent.</strong> All three wrap an object and delegate to it; the structure is ' +
        'nearly identical and the purpose is not — which is exactly the point the Gang of Four ' +
        'book makes and the reason patterns are catalogued by intent rather than by shape.</p>' +
        '<ul>' +
        '<li><strong>Decorator — add behaviour, same interface.</strong> The wrapper does ' +
        'something extra and passes through. <code>BufferedInputStream</code> wrapping a ' +
        '<code>FileInputStream</code> is the canonical example, and stackability is the tell: ' +
        'decorators compose, and you can apply several in any order.</li>' +
        '<li><strong>Proxy — control access, same interface.</strong> The wrapper decides ' +
        '<em>whether</em> and <em>when</em> to delegate: lazy loading, access checks, remoting, ' +
        'caching. Spring AOP is a proxy, and so is a Hibernate lazy association.</li>' +
        '<li><strong>Adapter — change the interface.</strong> The wrapper exists because the ' +
        'caller wants one shape and the callee offers another. This is the one that is genuinely ' +
        'different: the others preserve the interface, the adapter is the interface change.</li>' +
        '</ul>' +
        '<p>The related pair, since it usually follows: <strong>facade</strong> simplifies a ' +
        'subsystem behind a smaller interface — an adapter for convenience rather than for ' +
        'compatibility. And a <strong>bridge</strong> separates an abstraction from its ' +
        'implementation so both can vary, which is a design-time decision rather than a wrapper ' +
        'applied afterwards.</p>' +
        '<p>What makes this more than trivia: <strong>the adapter is the pattern that keeps a ' +
        'third-party library out of your domain.</strong> Wrapping a payment SDK in an interface ' +
        'you defined is an adapter, and it is what makes the SDK replaceable and the domain ' +
        'testable — the same argument as dependency inversion, arriving from the pattern ' +
        'catalogue instead of from the principles.</p>',
    referenceLinks: [
        { title: 'Spring Framework — AOP Proxies', url: 'https://docs.spring.io/spring-framework/reference/core/aop/proxying.html' }
    ],
    tags: ['patterns', 'structural'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'template-method-versus-strategy',
    importance: 'should-know',
    subsection: 'gof',
    question: 'Template method or strategy — how do you choose?',
    answer:
        '<p>They solve the same problem — some of an algorithm varies and some does not — through ' +
        'opposite mechanisms.</p>' +
        '<ul>' +
        '<li><strong>Template method uses inheritance.</strong> A base class holds the skeleton ' +
        'in a <code>final</code> method and calls abstract hooks that subclasses fill in. The ' +
        'order is fixed by the parent.</li>' +
        '<li><strong>Strategy uses composition.</strong> The varying part is an object passed ' +
        'in.</li>' +
        '</ul>' +
        '<p><strong>Prefer strategy</strong>, for the same reasons composition generally beats ' +
        'inheritance: the varying part can be swapped at run time and tested alone, you are not ' +
        'spending your one superclass, and there is no fragile base class whose change breaks ' +
        'every subclass silently.</p>' +
        '<p>The specific failure of template method worth naming: <strong>the protected hooks ' +
        'become an API you did not intend to publish.</strong> Every subclass depends on when ' +
        'they are called and on what state is set by the time they run, so a change to the ' +
        'skeleton breaks subclasses in ways the compiler cannot see.</p>' +
        '<p>Where template method still earns its place: when the skeleton genuinely must not be ' +
        'overridable and the steps are meaningless outside it. <strong>Spring uses it ' +
        'extensively</strong> and well — <code>JdbcTemplate</code> owns acquiring the connection, ' +
        'executing, translating exceptions and closing everything, and you supply only the ' +
        'callback that maps a row. The resource-handling skeleton is exactly the code nobody ' +
        'should be able to get wrong.</p>' +
        '<p>Which suggests the rule: <strong>template method when the invariant part is the ' +
        'valuable part; strategy when the varying part is.</strong></p>',
    referenceLinks: [
        { title: 'Spring Framework — JdbcTemplate', url: 'https://docs.spring.io/spring-framework/reference/data-access/jdbc/core.html' }
    ],
    tags: ['patterns', 'behavioural', 'design'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

/* ==== Patterns Spring Uses ============================================ */

{
    id: 'patterns-spring-uses',
    importance: 'must-know',
    subsection: 'in-spring',
    question: 'Which design patterns does Spring itself use?',
    answer:
        '<p>Naming them with the class that implements each is what makes this answer land, ' +
        'rather than listing patterns.</p>' +
        '<ul>' +
        '<li><strong>Front controller</strong> — <code>DispatcherServlet</code>. One entry point ' +
        'that routes everything.</li>' +
        '<li><strong>Chain of responsibility</strong> — the servlet filter chain, and Spring ' +
        'Security\'s <code>FilterChainProxy</code>. Each link handles the request or passes it ' +
        'on.</li>' +
        '<li><strong>Proxy</strong> — all of AOP. <code>@Transactional</code>, ' +
        '<code>@Cacheable</code>, <code>@Async</code> and method security are proxies, which is ' +
        'why self-invocation defeats every one of them.</li>' +
        '<li><strong>Template method</strong> — <code>JdbcTemplate</code>, ' +
        '<code>RestTemplate</code>, <code>TransactionTemplate</code>. The name is not a ' +
        'coincidence.</li>' +
        '<li><strong>Factory</strong> — <code>BeanFactory</code> is the container itself, and ' +
        '<code>FactoryBean</code> is a bean whose job is producing another one.</li>' +
        '<li><strong>Singleton</strong> — the default bean scope, per container rather than per ' +
        'JVM.</li>' +
        '<li><strong>Observer</strong> — <code>ApplicationEvent</code> and ' +
        '<code>@EventListener</code>, including the transaction-bound variant.</li>' +
        '<li><strong>Adapter</strong> — <code>HandlerAdapter</code>, which is what lets several ' +
        'unrelated handler types be invoked uniformly.</li>' +
        '<li><strong>Strategy</strong> — everywhere. <code>PlatformTransactionManager</code>, ' +
        '<code>ViewResolver</code>, <code>PasswordEncoder</code>, ' +
        '<code>HandlerMethodArgumentResolver</code>.</li>' +
        '<li><strong>Decorator</strong> — <code>BeanPostProcessor</code> wrapping beans on the ' +
        'way out, and <code>TransactionAwareDataSourceProxy</code>.</li>' +
        '</ul>' +
        '<p>The observation worth adding, because it turns a list into an argument: <strong>the ' +
        'patterns are why the extension points exist.</strong> Auto-configuration works because ' +
        'nearly everything is a strategy behind an interface with a ' +
        '<code>@ConditionalOnMissingBean</code> default — so defining your own ' +
        '<code>PasswordEncoder</code> replaces Spring\'s without editing anything. That is ' +
        'open-closed at framework scale, and it is what makes Boot configurable without being ' +
        'forkable.</p>',
    referenceLinks: [
        { title: 'Spring Framework — Reference Overview', url: 'https://docs.spring.io/spring-framework/reference/overview.html' }
    ],
    tags: ['patterns', 'spring', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'when-a-pattern-is-overkill',
    importance: 'must-know',
    subsection: 'in-spring',
    question: 'When is applying a design pattern the wrong decision?',
    answer:
        '<p>Whenever it costs more to read than the flexibility is worth — which is more often ' +
        'than pattern enthusiasm admits, and being able to say so is usually what this question ' +
        'is checking.</p>' +
        '<p>The signals that a pattern is being over-applied:</p>' +
        '<ul>' +
        '<li><strong>One implementation.</strong> An interface with a single implementor named ' +
        '<code>ThingImpl</code> is not an abstraction; it is a second file to keep in step, and ' +
        'the IDE now takes two jumps to reach the code.</li>' +
        '<li><strong>The extension point is a guess.</strong> Abstracting before the second case ' +
        'exists produces a shape drawn from imagination, and a wrong shape is harder to fix than ' +
        'no shape.</li>' +
        '<li><strong>Following the flow needs four files.</strong> A factory producing a strategy ' +
        'wrapped in a decorator, for one behaviour with no variation, is worse code than the ' +
        'method it replaced.</li>' +
        '<li><strong>The pattern name is in the class name</strong> and nothing else explains why ' +
        'it is there.</li>' +
        '<li><strong>The variation is data.</strong> A rules table beats a class hierarchy ' +
        'whenever the cases differ by values rather than by behaviour.</li>' +
        '</ul>' +
        '<p>Two ideas that resolve this more reliably than judgement alone. <strong>The rule of ' +
        'three</strong>: write it concretely, write it again, and abstract on the third — by then ' +
        'you know what actually varies. And <strong>the cost is asymmetric</strong>: adding an ' +
        'abstraction later is a mechanical refactor the IDE can do, while removing a wrong one ' +
        'means unpicking everything built on top of it. That asymmetry argues for waiting.</p>' +
        '<p>The sentence worth having: <strong>patterns are a vocabulary for describing designs, ' +
        'not a catalogue of designs to apply.</strong> Recognising "that is a strategy" in ' +
        'existing code is what the vocabulary is for; deciding in advance to use one is usually ' +
        'the tail wagging the dog.</p>',
    referenceLinks: [
        { title: 'Google Engineering Practices — Code Review Standard', url: 'https://google.github.io/eng-practices/review/reviewer/standard.html' }
    ],
    tags: ['patterns', 'judgement', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'anti-patterns',
    importance: 'should-know',
    subsection: 'in-spring',
    question: 'What anti-patterns do you see most often in Spring codebases?',
    answer:
        '<p>Six, and each has a specific reason it is a problem rather than a matter of taste.</p>' +
        '<ul>' +
        '<li><strong>Field injection.</strong> <code>@Autowired</code> on a private field means ' +
        'the class cannot be constructed without a container, so a plain unit test is impossible ' +
        'without reflection. It also hides how many dependencies there are — nobody notices the ' +
        'ninth <code>@Autowired</code> field, and a nine-argument constructor is impossible to ' +
        'ignore. That visibility is a feature.</li>' +
        '<li><strong>The god service.</strong> <code>OrderService</code> with two thousand lines ' +
        'and every collaborator in the application. Usually the result of "one service per ' +
        'entity" as a rule rather than a starting point.</li>' +
        '<li><strong>Anaemic domain model.</strong> Entities with only getters and setters and ' +
        'every rule in a service. Common enough to be the default in Spring codebases, which is ' +
        'why the architecture topic spends a question on when it is acceptable — sometimes it ' +
        'genuinely is.</li>' +
        '<li><strong>Exposing entities as API responses.</strong> Couples the wire contract to the ' +
        'schema, leaks fields the caller should not see, invites mass assignment on the way in, ' +
        'and triggers lazy loading during serialisation. This is a security issue as much as a ' +
        'design one.</li>' +
        '<li><strong>Catching and logging without handling.</strong> ' +
        '<code>catch (Exception e) { log.error(...); }</code> and then continuing, so the ' +
        'operation half-happened and the caller was told it succeeded.</li>' +
        '<li><strong><code>@Transactional</code> everywhere</strong>, including on read-only ' +
        'methods and on controllers, which stretches transaction boundaries across calls that ' +
        'should not be in one — and then somebody adds an HTTP call inside it and the connection ' +
        'is held for the duration.</li>' +
        '</ul>' +
        '<p>The one that underlies several: <strong>service locator</strong> — reaching for ' +
        '<code>ApplicationContext.getBean()</code> in application code. It turns an explicit ' +
        'dependency into a hidden one, moves a wiring error from start-up to run time, and is ' +
        'exactly the inversion Spring exists to provide, given back.</p>',
    referenceLinks: [
        { title: 'Spring Framework — Dependency Injection', url: 'https://docs.spring.io/spring-framework/reference/core/beans/dependencies/factory-collaborators.html' }
    ],
    tags: ['patterns', 'anti-patterns', 'spring'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
}

    ]
};
