/* ==========================================================================
   data/theory/patterns-that-get-asked.js — module 8 in the reading path

   Nine of the twenty-three, and honest about the rest. The selection is not
   arbitrary and it is not the Gang of Four's ordering: it is the patterns
   that appear in a Spring codebase, that an interviewer asks by name, and
   that a machine-coding round rewards you for reaching for.

   Twelve chapters. Ten patterns, then two chapters that are worth more than
   any of them — how to CHOOSE one, and how to recognise the point at which a
   pattern has become the problem. Both of those are where the marks are; the
   catalogue half is table stakes.

   Flyweight, Memento, Visitor, Interpreter, Bridge, Composite, Prototype,
   Mediator, State, Command, Iterator and the rest are deliberately absent.
   They are real and a few of them are excellent; none of them is asked, and
   a module that covers everything covers nothing at interview depth.
   ========================================================================== */

const patternsThatGetAskedModule = {
    id: 'patterns-that-get-asked',
    trackId: 'craft',
    order: 8,
    title: 'The Patterns That Get Asked',
    tagline: 'Nine of the twenty-three, and honestly about the rest.',
    estimatedMinutes: 50,
    prerequisites: ['solid-and-ood'],
    docHub: { title: 'Refactoring Guru — Design Patterns', url: 'https://refactoring.guru/design-patterns' },

    chapters: [
        {
            id: 'singleton-and-its-problems',
            title: 'Singleton, and Why Spring Made It Irrelevant',
            importance: 'must-know',
            summary: 'One instance, globally reachable. The reachability is the problem, not the instance count — and a Spring singleton bean is a different thing that happens to share the word.',
            interviewAngle: 'Asked in almost every LLD round, usually as "how would you implement a thread-safe singleton". The better answer implements it, then says why you would not, and distinguishes it from the scope Spring means.',
            buildsOn: [],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The three implementations, and the one to actually use',
                    code: '// 1. Double-checked locking. Correct ONLY with volatile -- without it\n//    another thread can see a non-null reference to a half-built object,\n//    because the constructor and the assignment can be reordered.\nclass Config {\n    private static volatile Config instance;\n    static Config get() {\n        Config local = instance;\n        if (local == null) {\n            synchronized (Config.class) {\n                local = instance;\n                if (local == null) instance = local = new Config();\n            }\n        }\n        return local;\n    }\n}\n\n// 2. Initialisation-on-demand holder. Lazy, thread-safe, no synchronisation\n//    at all -- the JVM guarantees a class is initialised once.\nclass Config2 {\n    private static class Holder { static final Config2 INSTANCE = new Config2(); }\n    static Config2 get() { return Holder.INSTANCE; }\n}\n\n// 3. Enum. Serialization-safe and reflection-safe for free, which the\n//    other two are not. Effective Java item 3 recommends this one.\nenum Config3 {\n    INSTANCE;\n    void reload() { }\n}',
                    notes: '<p>The <code>volatile</code> in the first version is the entire interview question hidden inside a pattern question, and it connects straight back to the memory model: without it, publication of the new object is unsafe and another thread can observe default field values through a non-null reference. The enum version is the only one that survives both <code>ObjectInputStream</code> and <code>Constructor.setAccessible(true)</code>.</p>'
                },
                {
                    type: 'comparison',
                    title: 'The pattern against the Spring scope, which share a word and nothing else',
                    left: 'Singleton pattern',
                    right: 'Spring singleton scope',
                    rows: [
                        { aspect: 'How many instances', left: 'One per classloader, enforced by the class itself', right: 'One per <strong>ApplicationContext</strong>. Two contexts, two instances.' },
                        { aspect: 'Who controls creation', left: 'The class. The constructor is private.', right: 'The container. The constructor is usually public and takes dependencies.' },
                        { aspect: 'How you get one', left: 'A static call from anywhere — global state', right: 'It is injected. The consumer never asks for it.' },
                        { aspect: 'Testability', left: 'Poor. Static state leaks between tests and cannot be substituted.', right: 'Good. Pass a different implementation to the constructor.' },
                        { aspect: 'The interview trap', left: '', right: 'Being asked "is a Spring bean a singleton" and answering yes without the distinction. It is a lifecycle policy, not the pattern.' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>The damage a singleton does is the global access point, not the single instance.</strong> Any code anywhere can call <code>Config.get()</code>, so nothing declares that dependency, nothing can substitute it in a test, and the object\'s lifetime is the process. That is the definition of tight coupling to shared mutable state. Needing exactly one instance is a perfectly ordinary requirement — the container satisfies it without the global.</p>'
                }
            ],
            docs: [
                { title: 'Effective Java — Enforce the singleton property', url: 'https://docs.oracle.com/javase/tutorial/java/javaOO/enum.html', kind: 'guide' },
                { title: 'Bean Scopes', url: 'https://docs.spring.io/spring-framework/reference/core/beans/factory-scopes.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'design-patterns', questionId: 'singleton-and-spring' },
                { topicId: 'concurrency', questionId: 'safe-publication' }
            ]
        },

        {
            id: 'factory-and-abstract-factory',
            title: 'Factory Method and Abstract Factory',
            importance: 'must-know',
            summary: 'A method that decides which implementation to build, so callers do not. Abstract factory builds a whole family of related things consistently.',
            interviewAngle: 'The trap is conflating the two, and the second trap is calling any static helper a factory. Being able to say what the abstract version buys — family consistency — is what separates the two answers.',
            buildsOn: ['singleton-and-its-problems'],
            blocks: [
                {
                    type: 'types',
                    title: 'Three things people call "factory", which are not the same',
                    items: [
                        { name: 'Static factory method', html: '<p><code>List.of()</code>, <code>Optional.of()</code>, <code>Integer.valueOf()</code>. A named constructor. Not a Gang of Four pattern at all, and by far the most useful of the three.</p>' },
                        { name: 'Factory method (the pattern)', html: '<p>A method the subclass overrides to decide what gets created. The base class defines the algorithm and defers one construction step. Spring\'s <code>FactoryBean</code> is this shape.</p>' },
                        { name: 'Abstract factory', html: '<p>An object whose whole job is producing a <em>family</em> of related products, so you cannot mix a Postgres dialect with a MySQL connection. The consistency guarantee is the reason it exists.</p>' }
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Abstract factory, and the guarantee it buys',
                    code: 'interface StorageFactory {\n    BlobStore   blobs();\n    QueueClient queue();\n    SecretStore secrets();\n}\n\nclass AwsStorage implements StorageFactory {\n    public BlobStore   blobs()   { return new S3BlobStore(...); }\n    public QueueClient queue()   { return new SqsClient(...); }\n    public SecretStore secrets() { return new SecretsManagerStore(...); }\n}\n\nclass LocalStorage implements StorageFactory {\n    public BlobStore   blobs()   { return new FilesystemBlobStore(tmp); }\n    public QueueClient queue()   { return new InMemoryQueue(); }\n    public SecretStore secrets() { return new EnvVarStore(); }\n}\n\n// The point: you cannot end up with an S3 blob store and an in-memory\n// queue. One choice fixes the whole family, which is exactly the bug\n// class this pattern removes.',
                    notes: '<p>In Spring this is usually spelled as a profile or an auto-configuration class rather than an explicit factory interface — <code>@Profile("local")</code> on a <code>@Configuration</code> that defines all three beans is an abstract factory with the container doing the dispatch. Recognising that is worth more than the interface version, because it is what the code you work in actually looks like.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>If there is one product and one implementation, a factory is an indirection with no payload. The honest formulation is: <em>"I would use a static factory method for a named constructor, and I would only reach for an abstract factory when there is a family of products that must be chosen together — otherwise the container already does this."</em></p>'
                }
            ],
            docs: [
                { title: 'FactoryBean', url: 'https://docs.spring.io/spring-framework/reference/core/beans/factory-extension.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'design-patterns', questionId: 'factory-versus-builder' }
            ]
        },

        {
            id: 'builder',
            title: 'Builder',
            importance: 'must-know',
            summary: 'For an object with many optional parameters, or one that must be immutable and validated at the end. Not a substitute for a constructor with three arguments.',
            interviewAngle: 'The pattern most often reached for in machine coding, and the one most often applied where a record would do. Knowing when it earns its place — four-plus optional fields, or cross-field validation — is the discriminator.',
            buildsOn: ['factory-and-abstract-factory'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The shape, including the part people leave out',
                    code: 'public final class SearchQuery {\n\n    private final String  text;\n    private final int     page;\n    private final int     size;\n    private final Sort    sort;\n    private final Instant from;\n    private final Instant to;\n\n    private SearchQuery(Builder b) {\n        this.text = b.text; this.page = b.page; this.size = b.size;\n        this.sort = b.sort; this.from = b.from; this.to   = b.to;\n    }\n\n    public static Builder builder() { return new Builder(); }\n\n    public static final class Builder {\n        private String  text = "";\n        private int     page = 0;\n        private int     size = 20;\n        private Sort    sort = Sort.RELEVANCE;\n        private Instant from, to;\n\n        public Builder text(String t)   { this.text = t; return this; }\n        public Builder page(int p)      { this.page = p; return this; }\n        public Builder size(int s)      { this.size = s; return this; }\n        public Builder between(Instant f, Instant t) {\n            this.from = f; this.to = t; return this;\n        }\n\n        public SearchQuery build() {\n            // THE PART THAT JUSTIFIES THE PATTERN: cross-field validation\n            // in one place, at the end, when every value is known.\n            if (size < 1 || size > 200)  throw new IllegalArgumentException("size");\n            if (from != null && to != null && from.isAfter(to)) {\n                throw new IllegalArgumentException("from is after to");\n            }\n            return new SearchQuery(this);\n        }\n    }\n}',
                    notes: '<p>Without the validation in <code>build()</code>, this is thirty lines of ceremony that a record with a compact constructor does better. <strong>The reason to write a builder is that the object cannot be validated one parameter at a time</strong> — that, or a genuinely long optional-parameter list where positional arguments have become unreadable.</p>'
                },
                {
                    type: 'table',
                    title: 'What to reach for, by shape of the problem',
                    headers: ['Situation', 'Use', 'Why not the others'],
                    rows: [
                        ['2–3 required parameters', 'A record, or a constructor', 'A builder here is pure ceremony'],
                        ['Many parameters, all required', 'A record', 'Nothing is optional, so there is no combinatorial problem to solve'],
                        ['4+ optional parameters', 'Builder', 'Telescoping constructors, and callers passing <code>null, null, null</code>'],
                        ['Cross-field validation', 'Builder', 'A record\'s compact constructor can do it, and a builder reads better when the rule spans several optional fields'],
                        ['Mutable object assembled over time', 'Builder', 'This is the case a record cannot serve'],
                        ['Test fixtures', 'Builder', 'The one place the ceremony always pays: <code>anOrder().withStatus(SHIPPED).build()</code>']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Lombok\'s <code>@Builder</code> silently drops your field initialisers.</strong> A field declared <code>private int size = 20;</code> keeps that default when you call the constructor and gets <code>0</code> when you go through the generated builder, because the builder assigns every field. <code>@Builder.Default</code> fixes it, and the failure is quiet — a page size of zero, not an exception. This is the single most common Lombok defect in a Spring codebase.</p>'
                }
            ],
            docs: [
                { title: 'Record Classes', url: 'https://docs.oracle.com/en/java/javase/21/language/records.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'design-patterns', questionId: 'factory-versus-builder' },
                { topicId: 'java-language', questionId: 'immutability-recipe' }
            ]
        },

        {
            id: 'strategy',
            title: 'Strategy',
            importance: 'must-know',
            summary: 'One interface, several interchangeable algorithms, chosen at run time. The single most useful pattern in a Spring application, and the one open-closed is usually implemented with.',
            interviewAngle: 'Reach for this by name in a machine-coding round the moment a requirement says "depending on the type of". Naming it while you draw it is free marks.',
            buildsOn: ['builder'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>Strategy is a single interface with several implementations, where the choice between them is made at run time by something other than the code that uses them. That is the whole pattern — which is why it is worth knowing that its <em>value</em> is not the polymorphism but the <strong>registration</strong>: how a new strategy gets found without editing anything.</p><p>In plain Java that is a <code>Map</code> populated in a factory. In Spring it is an injected <code>List</code> or <code>Map</code> of the interface type, which the container fills with every implementing bean. The Spring version is strictly better, because there is no registry to forget to update.</p>'
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Two idioms Spring gives you for the dispatch',
                    code: '// (a) Map keyed by BEAN NAME. Convenient, and couples the key to the\n//     bean name -- rename the class and the lookup silently fails.\n@Service\nclass Shipping {\n    private final Map<String, ShippingRate> rates;   // key = bean name\n    Shipping(Map<String, ShippingRate> rates) { this.rates = rates; }\n}\n\n// (b) List, indexed by something the strategy DECLARES. Preferred: the\n//     key lives in the strategy, so nothing external has to agree with it.\ninterface ShippingRate {\n    Carrier carrier();\n    Money quote(Parcel p, Address to);\n}\n\n@Service\nclass Shipping {\n    private final Map<Carrier, ShippingRate> rates;\n\n    Shipping(List<ShippingRate> all) {\n        this.rates = all.stream().collect(toMap(ShippingRate::carrier, identity()));\n        // toMap throws on a duplicate key -- so two strategies claiming the\n        // same carrier fail at STARTUP rather than picking one silently.\n    }\n\n    Money quote(Carrier c, Parcel p, Address to) {\n        return Optional.ofNullable(rates.get(c))\n                .orElseThrow(() -> new NoRateFor(c))\n                .quote(p, to);\n    }\n}',
                    notes: '<p>The comment on <code>toMap</code> is a deliberate design choice rather than an accident of the API: two beans claiming the same carrier is a configuration error, and the difference between finding it at startup and finding it in production is entirely down to whether the collector throws or overwrites.</p>'
                },
                {
                    type: 'comparison',
                    title: 'Strategy against template method, which interviewers pair on purpose',
                    left: 'Strategy',
                    right: 'Template method',
                    rows: [
                        { aspect: 'Mechanism', left: 'Composition — hold a reference to an interface', right: 'Inheritance — override a hook in a base class' },
                        { aspect: 'When the choice is made', left: 'Run time, and it can change per call', right: 'Compile time, fixed by the subclass you instantiated' },
                        { aspect: 'What varies', left: 'The whole algorithm', left_note: '', right: 'One or more steps inside a fixed sequence' },
                        { aspect: 'Testability', left: 'Test each strategy standalone', right: 'Must instantiate a subclass to test a step' },
                        { aspect: 'Preferred when', left: 'Almost always — composition over inheritance', right: 'The <em>sequence</em> is the invariant worth enforcing' }
                    ]
                }
            ],
            docs: [
                { title: 'Autowiring collections of beans', url: 'https://docs.spring.io/spring-framework/reference/core/beans/annotation-config/autowired.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'design-patterns', questionId: 'strategy-pattern' },
                { topicId: 'spring-core', questionId: 'injecting-a-collection-of-beans' }
            ]
        },

        {
            id: 'template-method',
            title: 'Template Method',
            importance: 'should-know',
            summary: 'A base class fixes the sequence of steps and lets subclasses supply some of them. Powerful, inheritance-based, and the reason a Spring codebase is full of classes ending in Template.',
            interviewAngle: 'Best answered by naming where you have met it — JdbcTemplate, RestTemplate, AbstractAuthenticationProcessingFilter — rather than by describing it abstractly.',
            buildsOn: ['strategy'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The pattern, and its lambda-shaped descendant',
                    code: 'abstract class ImportJob {\n\n    // final: the SEQUENCE is the thing being protected.\n    public final Report run(Path file) {\n        validate(file);\n        List<Row> rows = parse(file);         // subclass supplies\n        rows.forEach(this::persist);          // subclass supplies\n        return summarise(rows);\n    }\n\n    private void validate(Path f) { ... }     // fixed\n    private Report summarise(List<Row> r) { ... }\n\n    protected abstract List<Row> parse(Path file);\n    protected abstract void persist(Row row);\n}\n\n// Spring inverted this once lambdas existed: instead of subclassing,\n// you hand the varying step in. Same fixed sequence -- acquire the\n// connection, run, translate the exception, close -- without inheritance.\nList<Order> orders = jdbcTemplate.query(\n        "select * from orders where customer_id = ?",\n        (rs, rowNum) -> new Order(rs.getLong("id"), rs.getString("status")),\n        customerId);',
                    notes: '<p><code>JdbcTemplate</code> is the more instructive half. Its fixed sequence includes the two steps nobody remembers — closing the resources on every path, and translating the vendor\'s <code>SQLException</code> into Spring\'s <code>DataAccessException</code> hierarchy. That is the invariant the template exists to guarantee, and it is why "template method" and "callback" end up being the same idea wearing different clothes.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A template method whose hooks number more than three or four has become a framework nobody understands.</strong> The subclass is now written by reading the base class top to bottom to find out when each of its methods will be called, which is exactly the inversion that makes deep inheritance hierarchies unmaintainable. When you reach that point, the fix is to pass the steps in as collaborators — which turns it back into strategy.</p>'
                }
            ],
            docs: [
                { title: 'JdbcTemplate', url: 'https://docs.spring.io/spring-framework/reference/data-access/jdbc/core.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'design-patterns', questionId: 'template-method-versus-strategy' },
                { topicId: 'design-patterns', questionId: 'patterns-spring-uses' }
            ]
        },

        {
            id: 'observer',
            title: 'Observer',
            importance: 'should-know',
            summary: 'Publish a fact; anybody interested reacts. Decouples the producer from every consumer, and buys that decoupling with a flow you can no longer read top to bottom.',
            interviewAngle: 'Comes up as "how would you notify other parts of the system when an order is placed". The answer that shows experience mentions what you lose — traceability, and transaction semantics that are easy to get wrong.',
            buildsOn: ['template-method'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Spring application events, and the annotation that fixes the usual bug',
                    code: 'record OrderPlaced(String orderId, Instant at) { }\n\n@Service\nclass OrderService {\n    private final ApplicationEventPublisher events;\n\n    @Transactional\n    public Order place(Cart cart) {\n        Order order = repository.save(Order.from(cart));\n        events.publishEvent(new OrderPlaced(order.id(), Instant.now()));\n        return order;\n    }\n}\n\n@Component\nclass SendConfirmation {\n\n    // @EventListener alone runs SYNCHRONOUSLY, inside the caller is\n    // transaction. A failure here rolls the order back, and a slow SMTP\n    // server holds a database connection open.\n    @TransactionalEventListener(phase = AFTER_COMMIT)\n    @Async\n    void on(OrderPlaced event) {\n        mailer.send(...);\n    }\n}',
                    notes: '<p>The two annotations on the listener are doing different jobs and both are needed. <code>@TransactionalEventListener(AFTER_COMMIT)</code> delays delivery until the transaction has actually committed, so a confirmation is never sent for an order that rolled back. <code>@Async</code> moves it off the caller\'s thread, so a slow mailer does not extend the request. Neither is the default, and the default — synchronous, inside the transaction — is what most codebases ship by accident.</p>'
                },
                {
                    type: 'types',
                    title: 'Three scales of the same pattern',
                    items: [
                        { name: 'In-process listeners', html: '<p>Spring events, or a plain listener list. Same JVM, same process. Decouples classes, and offers no durability at all — a crash between publish and handle loses the event.</p>' },
                        { name: 'A message broker', html: '<p>Kafka, RabbitMQ. Crosses processes and survives a restart. This is observer with durability bolted on, and it introduces every problem in the distributed track — delivery semantics, ordering, the dual-write problem.</p>' },
                        { name: 'Database triggers', html: '<p>Technically the same shape and almost always the wrong tool: invisible to the application, untestable from it, and executed inside somebody else\'s transaction.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>You cannot find the handlers by reading the publisher.</strong> That is the cost, and it is a real one — a new team member reading <code>place()</code> has no way to learn that four things happen after it without searching the codebase for the event type. Use events when the producer genuinely should not care who reacts; use a direct method call when it does care, because a call you can follow is worth more than decoupling you did not need.</p>'
                }
            ],
            docs: [
                { title: 'Application Events', url: 'https://docs.spring.io/spring-framework/reference/core/beans/context-introduction.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-core', questionId: 'context-events' },
                { topicId: 'design-patterns', questionId: 'patterns-spring-uses' }
            ]
        },

        {
            id: 'decorator',
            title: 'Decorator',
            importance: 'should-know',
            summary: 'Wrap an object in another object with the same interface, adding behaviour. Composable in a way subclassing is not, which is why java.io is built out of it.',
            interviewAngle: 'The pattern with the best available example — every candidate has written new BufferedReader(new InputStreamReader(...)) without noticing it was a pattern.',
            buildsOn: ['observer'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The example everybody has already used, and one worth writing',
                    code: '// java.io is decorators, all the way down. Each wrapper is an\n// InputStream and each adds one capability.\nInputStream raw        = Files.newInputStream(path);\nInputStream buffered   = new BufferedInputStream(raw);\nInputStream unzipped   = new GZIPInputStream(buffered);\nReader      characters = new InputStreamReader(unzipped, UTF_8);\n\n// The same shape, hand-written, over a domain interface.\ninterface RateQuoter { Money quote(Parcel p); }\n\nclass CachingQuoter implements RateQuoter {\n    private final RateQuoter delegate;\n    private final Cache<Parcel, Money> cache;\n\n    public Money quote(Parcel p) {\n        return cache.get(p, delegate::quote);\n    }\n}\n\nclass TimedQuoter implements RateQuoter {\n    private final RateQuoter delegate;\n    private final Timer timer;\n\n    public Money quote(Parcel p) { return timer.record(() -> delegate.quote(p)); }\n}\n\n// Composable in any order, which subclassing is not:\nRateQuoter quoter = new TimedQuoter(new CachingQuoter(new UpsQuoter()));',
                    notes: '<p>The last line is the argument for the pattern. To get timing and caching by inheritance you need <code>TimedCachingUpsQuoter</code>, and adding retry gives you eight classes for three behaviours. Decoration is linear where subclassing is combinatorial.</p>'
                },
                {
                    type: 'comparison',
                    title: 'Decorator against proxy — the same structure, different intent',
                    left: 'Decorator',
                    right: 'Proxy',
                    rows: [
                        { aspect: 'Structure', left: 'Implements the interface, holds a delegate', right: 'Implements the interface, holds a delegate — <strong>identical</strong>' },
                        { aspect: 'Intent', left: 'Add behaviour to what the delegate does', right: 'Control access to the delegate' },
                        { aspect: 'Typical use', left: 'Buffering, caching, timing, compression', right: 'Lazy loading, security checks, remoting, transactions' },
                        { aspect: 'Does it call the delegate', left: 'Always. Adding, not replacing.', right: 'Maybe not — a security proxy can refuse, a lazy proxy defers' },
                        { aspect: 'Who stacks them', left: 'The caller, explicitly, and order matters', right: 'Usually a framework, and you never see the construction' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>If asked to distinguish them, the honest answer is that <strong>they are structurally the same and the difference is intent</strong>, then give one example of each. Interviewers ask this specifically to see whether a candidate will invent a structural difference that does not exist.</p>'
                }
            ],
            docs: [
                { title: 'java.io — filtered streams', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/io/FilterInputStream.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'design-patterns', questionId: 'decorator-proxy-adapter' }
            ]
        },

        {
            id: 'adapter-and-facade',
            title: 'Adapter and Facade',
            importance: 'should-know',
            summary: 'Adapter makes one interface look like another. Facade puts a simple interface over a complicated subsystem. Both are boundary tools, and both are how a third-party library stops spreading.',
            interviewAngle: 'The practical question behind it is "how do you keep a vendor SDK from leaking through your codebase", and adapter is the answer with a name.',
            buildsOn: ['decorator'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'Two patterns often taught together',
                    left: 'Adapter',
                    right: 'Facade',
                    rows: [
                        { aspect: 'Problem', left: 'The interface you have is not the interface you need', right: 'The subsystem works but is unpleasant to use' },
                        { aspect: 'Number of things wrapped', left: 'Usually one', right: 'Usually several, coordinated' },
                        { aspect: 'Does it simplify', left: 'Not necessarily — it translates', right: 'Yes, that is the point' },
                        { aspect: 'Example', left: '<code>Arrays.asList</code>; a class wrapping Stripe\'s SDK behind your <code>PaymentGateway</code> port', right: 'A <code>CheckoutFacade</code> hiding pricing, tax, inventory and payment behind one method' },
                        { aspect: 'Relationship to DIP', left: 'It <strong>is</strong> the adapter half of ports and adapters', right: 'Orthogonal — a facade can sit anywhere' }
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The adapter that keeps an SDK out of your domain',
                    code: 'package com.acme.billing;                 // the port, in the domain\npublic interface PaymentGateway {\n    Authorisation authorise(Money amount, CardToken token);\n}\n\npackage com.acme.billing.stripe;          // the adapter, at the edge\n@Component\nclass StripeGateway implements PaymentGateway {\n\n    private final StripeClient stripe;\n\n    public Authorisation authorise(Money amount, CardToken token) {\n        try {\n            PaymentIntent intent = stripe.paymentIntents().create(\n                    PaymentIntentCreateParams.builder()\n                            .setAmount(amount.minorUnits())\n                            .setCurrency(amount.currency().toString().toLowerCase())\n                            .setPaymentMethod(token.value())\n                            .build());\n            return new Authorisation(intent.getId(), Status.of(intent.getStatus()));\n        } catch (StripeException e) {\n            // TRANSLATE. A StripeException must not reach the domain --\n            // that is the whole reason this class exists.\n            throw new PaymentFailed(e.getCode(), e);\n        }\n    }\n}',
                    notes: '<p>The <code>catch</code> block is the part that gets skipped and the part that matters. An adapter that translates the happy path and lets the vendor\'s exception type propagate has not isolated anything — every caller now has a <code>StripeException</code> on its conscience, and swapping providers means touching all of them.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The interview-ready formulation: <em>"Every third-party client sits behind an interface I own, expressed in my vocabulary, and the adapter translates both the call and the failure. It costs one class per integration, and it is what makes a provider swap a contained change rather than a project."</em></p>'
                }
            ],
            docs: [
                { title: 'Hexagonal Architecture', url: 'https://alistair.cockburn.us/hexagonal-architecture/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'design-patterns', questionId: 'decorator-proxy-adapter' },
                { topicId: 'architecture-ddd', questionId: 'hexagonal-architecture' }
            ]
        },

        {
            id: 'proxy',
            title: 'Proxy',
            importance: 'must-know',
            summary: 'A stand-in that controls access to the real object. In Spring it is not a pattern you write — it is the mechanism behind @Transactional, @Cacheable, @Async and every other annotation that seems to do magic.',
            interviewAngle: 'The highest-leverage pattern in this module, because it is the mechanical explanation for the self-invocation bug, the private-method bug and the @Async-returns-null bug all at once.',
            buildsOn: ['adapter-and-facade'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>Every Spring annotation that changes what a method <em>does</em> without changing what it <em>says</em> is implemented by handing you a different object. The bean injected into your class is not an instance of your class — it is a generated subclass or an interface implementation that wraps one, and it runs the extra behaviour before delegating.</p><p>Once that sentence is internalised, three separate bugs stop being separate:</p><ul><li><code>@Transactional</code> on a method called from another method of the same class does nothing, because <code>this.method()</code> does not go through the proxy.</li><li><code>@Transactional</code> on a private method does nothing, because a subclass cannot override a private method.</li><li><code>@Async</code> on a method returning a plain object returns <code>null</code>, because the proxy has to return immediately and has nothing to return.</li></ul><p>They are one fact with three symptoms.</p>'
                },
                {
                    type: 'table',
                    title: 'The two proxy mechanisms Spring uses',
                    headers: ['', 'JDK dynamic proxy', 'CGLIB subclass'],
                    rows: [
                        ['Requires', 'The bean implements an interface', 'A non-final class with a usable constructor'],
                        ['What you get', 'A new class implementing the same interfaces', 'A generated <em>subclass</em> of your class'],
                        ['Cannot proxy', 'Methods not on the interface', '<code>final</code> classes, <code>final</code> and <code>private</code> methods'],
                        ['Spring Boot default', 'No', 'Yes — <code>proxyTargetClass=true</code> since Boot 2.0'],
                        ['Field access', 'Fields on the target, not the proxy', 'The subclass has its own copy of the fields, <strong>uninitialised</strong>']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>The CGLIB row about fields is the subtle one.</strong> The generated subclass has its own set of fields that the constructor never populated, so any code reading a field directly through the proxy sees <code>null</code> where the target sees a value. Spring works around this by routing method calls to the target instance, which is why it works at all — but it is also why accessing another bean\'s field instead of calling its getter can behave differently under proxying than it did in a unit test.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>When something annotated "does not work", the first question is always <em>did the call go through the proxy</em>. Self-invocation, a private method, a <code>final</code> method, or calling it from the constructor or <code>@PostConstruct</code> — before the proxy exists — are the four ways the answer is no, and they account for nearly every report of a Spring annotation being ignored.</p>'
                }
            ],
            docs: [
                { title: 'Understanding AOP Proxies', url: 'https://docs.spring.io/spring-framework/reference/core/aop/proxying.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'aop-proxies', questionId: 'jdk-proxy-vs-cglib' },
                { topicId: 'aop-proxies', questionId: 'self-invocation' },
                { topicId: 'transactions', questionId: 'transactional-not-working' }
            ]
        },

        {
            id: 'chain-of-responsibility',
            title: 'Chain of Responsibility',
            importance: 'should-know',
            summary: 'A request travels along a chain of handlers, each free to handle it, transform it, or pass it on. The servlet filter chain and Spring Security are both exactly this.',
            interviewAngle: 'Worth naming because the security track leans on it entirely — "the filter chain is chain of responsibility" is a sentence that makes the whole of Spring Security legible.',
            buildsOn: ['proxy'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The shape you have already written',
                    code: '@Component\nclass CorrelationIdFilter extends OncePerRequestFilter {\n\n    protected void doFilterInternal(HttpServletRequest request,\n                                    HttpServletResponse response,\n                                    FilterChain chain) throws IOException, ServletException {\n        String id = Optional.ofNullable(request.getHeader("X-Correlation-Id"))\n                            .orElseGet(() -> UUID.randomUUID().toString());\n        MDC.put("correlationId", id);\n        try {\n            chain.doFilter(request, response);   // pass it on\n        } finally {\n            MDC.remove("correlationId");          // ALWAYS -- the thread is pooled\n        }\n    }\n}',
                    notes: '<p>Two properties of the pattern show up in these fifteen lines. A handler may act <em>before</em> the rest of the chain, <em>after</em> it, or both — which is why the chain is a stack rather than a queue. And a handler may decline to call <code>doFilter</code> at all, which is how an authentication filter rejects a request without any of the downstream handlers ever seeing it.</p>'
                },
                {
                    type: 'types',
                    title: 'Where it appears in a Spring application',
                    items: [
                        { name: 'Servlet filters', html: '<p>The outermost chain. Runs before <code>DispatcherServlet</code>, which is why an exception thrown in a filter never reaches <code>@ControllerAdvice</code>.</p>' },
                        { name: 'Spring Security\'s filter chain', html: '<p>A dozen filters in a fixed order inside one servlet filter. The whole architecture of Spring Security is this list, and the security track spends a module on the order.</p>' },
                        { name: 'HandlerInterceptor', html: '<p>Inside the dispatcher, so it knows which handler was selected. Three hooks rather than one wrapped call.</p>' },
                        { name: 'Jackson serializer chains, Micrometer meter filters', html: '<p>Same shape at a smaller scale — each element may transform, may pass through, may stop.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A handler that forgets to pass the request on stops the request, silently.</strong> Omit <code>chain.doFilter</code> in a filter that was meant to be pass-through and the client gets a 200 with an empty body — no exception, no log line, nothing to search for. It is the single most common filter bug, and it is a direct consequence of the pattern giving each handler the choice.</p>'
                }
            ],
            docs: [
                { title: 'Filters', url: 'https://docs.spring.io/spring-framework/reference/web/webmvc/filters.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'rest-api', questionId: 'filters-vs-interceptors' },
                { topicId: 'spring-security', questionId: 'how-the-security-filter-chain-works' }
            ]
        },

        {
            id: 'choosing-a-pattern',
            title: 'Choosing One',
            importance: 'must-know',
            summary: 'Start from the sentence in the requirement, not from the catalogue. "Depending on the type of" is strategy; "in a fixed order" is template method; "notify everyone" is observer.',
            interviewAngle: 'This chapter is the one that pays in a machine-coding round. Recognising the pattern from the wording of the requirement, and naming it as you draw, is what makes twenty minutes of design look deliberate.',
            buildsOn: ['chain-of-responsibility'],
            blocks: [
                {
                    type: 'table',
                    title: 'From the words in the requirement to the pattern',
                    headers: ['If the requirement says…', 'Reach for', 'And the giveaway is'],
                    rows: [
                        ['"depending on the type of X, do Y differently"', 'Strategy', 'A switch over a type that will grow'],
                        ['"the steps are always A, B, C but B varies"', 'Template method', 'The <em>order</em> is the invariant'],
                        ['"when X happens, also do Y and Z"', 'Observer', '"also" — the producer should not care'],
                        ['"X, but with logging / caching / retry"', 'Decorator', 'The interface is unchanged; behaviour is added'],
                        ['"only if the user is allowed / only when first needed"', 'Proxy', 'Access is being controlled, not extended'],
                        ['"each of these checks in turn, any may reject"', 'Chain of responsibility', 'A sequence where any element can stop it'],
                        ['"build it up piece by piece, then validate"', 'Builder', 'Many optional inputs, one validation point'],
                        ['"choose the implementation family at startup"', 'Abstract factory', 'Several products that must be consistent'],
                        ['"make this library look like our interface"', 'Adapter', 'A vendor type is leaking'],
                        ['"there must only ever be one"', 'A container-managed bean', 'Almost never the singleton pattern']
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>Say the name <em>while</em> you draw. <em>"Fare calculation varies by city and by time of day, so that is a strategy — an interface with a <code>quote</code> method, and the implementations register themselves by city."</em> Twelve seconds, and it tells the interviewer you chose rather than defaulted. The same design without the sentence reads as an interface you happened to write.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Do not go through the catalogue looking for a fit.</strong> The failure mode it produces is visible from across the room: a parking-lot design with a factory, a builder, an observer and a singleton in it, none of which the requirements asked for, and no working <code>park()</code> method because the time went on structure. One pattern, correctly chosen, in a design that runs, beats four in a design that does not.</p>'
                }
            ],
            docs: [
                { title: 'Refactoring Guru — Design Patterns catalogue', url: 'https://refactoring.guru/design-patterns/catalog', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'design-patterns', questionId: 'when-a-pattern-is-overkill' },
                { topicId: 'design-patterns', questionId: 'strategy-pattern' }
            ]
        },

        {
            id: 'pattern-as-an-anti-pattern',
            title: 'When the Pattern Is the Problem',
            importance: 'should-know',
            summary: 'Every pattern adds indirection, and indirection is a cost paid by every future reader. A pattern applied without the pressure it relieves is a pure loss.',
            interviewAngle: 'Being able to name a pattern you removed is a stronger signal than being able to name ten you know. It is also the honest answer to "what would you do differently on that project".',
            buildsOn: ['choosing-a-pattern'],
            blocks: [
                {
                    type: 'types',
                    title: 'The recognisable failures',
                    items: [
                        { name: 'The one-implementation interface', html: '<p><code>OrderServiceImpl</code>. Two files, one behaviour, every navigation an extra hop. Written "in case we swap it", and it is never swapped.</p>' },
                        { name: 'Strategy with one strategy', html: '<p>An interface, a registry, and a single implementation. All of the indirection, none of the extensibility.</p>' },
                        { name: 'Builder for a three-field record', html: '<p>Thirty lines to avoid a three-argument constructor that was already readable.</p>' },
                        { name: 'A facade over one class', html: '<p>A pass-through wrapper. Every method delegates and nothing is simplified.</p>' },
                        { name: 'Everything is an event', html: '<p>A codebase where no method calls another. Perfectly decoupled and impossible to debug — no stack trace crosses the boundary, and the order of effects is emergent.</p>' },
                        { name: 'Abstract base classes three deep', html: '<p><code>AbstractBaseServiceSupport</code>. Understanding one method means reading four files, and no single file is wrong.</p>' }
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>The common thread is that each of these was <strong>added before the pressure that justifies it existed</strong>. A pattern is a response to a force — a change that keeps recurring, a combinatorial explosion, a dependency you need to break. With the force present, the indirection is cheaper than the alternative. Without it, the indirection is the whole transaction.</p><p>This is also why "we might need it later" is such an unreliable justification: it is a prediction, and the record on such predictions is poor. The cost is certain and immediate; the benefit is speculative and deferred.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>A concrete answer to have ready: <em>"We had a strategy interface with one implementation that had been there for two years. I inlined it — deleted the interface, the registry and the factory, and the class got shorter and easier to follow. If a second implementation had ever shown up, extracting the interface again would have been a five-minute refactor the IDE does for you. Adding the abstraction was the expensive direction; removing it was cheap."</em> That demonstrates the judgement the whole module is about.</p>'
                }
            ],
            docs: [
                { title: 'Yagni', url: 'https://martinfowler.com/bliki/Yagni.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'design-patterns', questionId: 'anti-patterns' },
                { topicId: 'design-patterns', questionId: 'when-a-pattern-is-overkill' }
            ]
        }
    ]
};
