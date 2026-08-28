/* ==========================================================================
   data/theory/ioc-and-the-container.js — module 25 in the reading path

   Seven chapters, and the first module of the Spring track. It deliberately
   says nothing about Boot, starters or auto-configuration: all of that is a
   layer on top of the container, and a reader who learns them in the other
   order ends up believing Spring is a set of annotations rather than a
   lifecycle.
   ========================================================================== */

const iocAndTheContainerModule = {
    id: 'ioc-and-the-container',
    trackId: 'spring-core',
    order: 25,
    title: 'The Container: IoC, Beans, Scopes',
    tagline: 'What Spring is, before anything is auto-configured.',
    estimatedMinutes: 40,
    prerequisites: ['inheritance-and-interfaces'],
    docHub: { title: 'Spring Framework — Core Technologies', url: 'https://docs.spring.io/spring-framework/reference/core.html' },

    chapters: [
        {
            id: 'inversion-of-control',
            title: 'What Is Actually Inverted',
            importance: 'must-know',
            summary: 'The control that is inverted is the control over dependency construction. Dependency injection is one way of achieving it, and the two words are not synonyms.',
            interviewAngle: 'The opening question of nearly every Spring interview. Almost everyone can say "the framework creates the objects"; far fewer can say what that buys, and the answer worth giving is testability and substitutability rather than "loose coupling", which is a phrase rather than a benefit.',
            buildsOn: [],
            blocks: [
                {
                    type: 'definition',
                    term: 'Inversion of Control',
                    important: true,
                    html: '<p>A design principle in which a component does not construct or locate its collaborators — something outside it supplies them. The control being inverted is over <em>how dependencies are obtained</em>, not over program flow generally.</p>'
                },
                {
                    type: 'definition',
                    term: 'Dependency Injection',
                    important: true,
                    html: '<p>The specific technique of supplying those collaborators through a constructor, a setter, or a field. DI is an implementation of IoC; a service locator is a different implementation of the same principle, and a worse one, because the dependency on the locator is invisible from the outside.</p>'
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The same class, twice',
                    code: '// Without: the class decides what it talks to, permanently.\nclass OrderService {\n    private final PaymentGateway gateway = new StripeGateway();\n\n    // No test can substitute the gateway. No configuration can either.\n}\n\n// With: the class declares what it needs and is handed one.\nclass OrderService {\n    private final PaymentGateway gateway;\n\n    OrderService(PaymentGateway gateway) {      // Spring calls this\n        this.gateway = gateway;\n    }\n}',
                    notes: '<p>The second class has no dependency on Spring at all — no annotation, no import, nothing. That is the point worth making: a class designed for injection is a class that can be constructed by hand in a test, and the framework is an assembly mechanism rather than a runtime the object needs.</p>'
                },
                {
                    type: 'types',
                    title: 'What it actually buys, in the order worth listing them',
                    items: [
                        { name: 'Testability', html: '<p>The largest by far. A collaborator that is passed in can be a stub. A collaborator constructed inside cannot be replaced without a bytecode-level tool.</p>' },
                        { name: 'Substitutability by configuration', html: '<p>Different implementation in one profile than another, decided outside the code that uses it.</p>' },
                        { name: 'One place for lifecycle', html: '<p>Something must decide when objects are created and destroyed. The container does it uniformly, rather than each class doing it slightly differently.</p>' },
                        { name: 'Cross-cutting behaviour', html: '<p>Because the container hands out the reference, it can hand out a proxy instead — which is how transactions, caching and security work at all. This is covered in the AOP module and is the deepest consequence of the whole design.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>Avoid answering with "loose coupling". It is true and it is what everyone says. <em>"The class stops deciding which implementation it uses, which means a test can pass a stub and a profile can pass a different one. And because the container hands out the reference, it can hand out a proxy — that is how <code>@Transactional</code> works."</em> is the same answer with something in it.</p>'
                }
            ],
            docs: [
                { title: 'The IoC Container', url: 'https://docs.spring.io/spring-framework/reference/core/beans/introduction.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-core', questionId: 'what-inversion-of-control-buys' }
            ]
        },

        {
            id: 'beanfactory-vs-applicationcontext',
            title: 'BeanFactory and ApplicationContext',
            importance: 'should-know',
            summary: 'BeanFactory is the container. ApplicationContext is the container plus everything an application needs — events, resources, messages, and eager singletons.',
            interviewAngle: 'A straight recall question with one good discriminator: eager instantiation. ApplicationContext creates its singletons at startup, which is why a misconfiguration fails at boot rather than on the first request — and that is a feature, not an accident.',
            buildsOn: ['inversion-of-control'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'The two interfaces',
                    left: 'BeanFactory',
                    right: 'ApplicationContext',
                    rows: [
                        { aspect: 'Relationship', left: 'The base interface', right: '<strong>Extends it</strong>, and adds the rest' },
                        { aspect: 'Singleton creation', left: 'Lazy — on first request', right: '<strong>Eager, at startup</strong>' },
                        { aspect: 'BeanPostProcessor', left: 'Must be registered by hand', right: 'Detected and registered automatically' },
                        { aspect: 'Events', left: 'No', right: '<code>ApplicationEventPublisher</code>' },
                        { aspect: 'Resources, i18n', left: 'No', right: '<code>ResourceLoader</code>, <code>MessageSource</code>' },
                        { aspect: 'Environment', left: 'No', right: '<code>Environment</code>, profiles, property sources' },
                        { aspect: 'You use', left: 'Essentially never, directly', right: '<strong>Always.</strong> This is what Spring Boot creates' }
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>The eager instantiation is the row that matters. A context that builds every singleton during <code>run()</code> discovers a missing bean, an ambiguous injection point or a failing constructor <em>at startup</em>, where it is one clear failure in the log and the deployment does not proceed. A lazily built one discovers it on whichever request first needs that bean, which may be a Tuesday.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>This is also the argument against turning on <code>spring.main.lazy-initialization=true</code> globally to speed up startup. It works, and it trades a compile-time-shaped failure for a runtime one. Reasonable in a test context or during local development; a poor trade in production, where the seconds saved are once per deploy.</p>'
                }
            ],
            docs: [
                { title: 'Container Overview', url: 'https://docs.spring.io/spring-framework/reference/core/beans/basics.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-core', questionId: 'beanfactory-vs-applicationcontext' }
            ]
        },

        {
            id: 'bean-definition-and-instantiation',
            title: 'A Definition Is Not an Instance',
            importance: 'must-know',
            summary: 'The container reads bean definitions first, then instantiates from them. Two phases, two extension points, and most Spring behaviour lives in the gap between them.',
            interviewAngle: 'The distinction that makes BeanFactoryPostProcessor against BeanPostProcessor an easy question instead of a memorised pair. One edits the recipe, the other edits the cake.',
            buildsOn: ['beanfactory-vs-applicationcontext'],
            blocks: [
                {
                    type: 'definition',
                    term: 'Bean definition',
                    important: true,
                    html: '<p>The container\'s <em>recipe</em> for a bean: its class, scope, constructor arguments, property values, init and destroy method names, whether it is lazy or primary. Registered during startup from component scanning, <code>@Bean</code> methods, XML, or programmatically — and modifiable before anything is instantiated.</p>'
                },
                {
                    type: 'diagram',
                    diagramType: 'flowchart',
                    caption: 'Two phases. Everything that rewrites configuration happens in the first.',
                    diagramConfig: {
                        title: 'Definitions, then instances',
                        nodes: [
                            { id: 'scan', label: 'Register bean definitions', kind: 'start' },
                            { id: 'bfpp', label: 'BeanFactoryPostProcessor: edit the definitions', kind: 'step' },
                            { id: 'inst', label: 'Instantiate singletons', kind: 'step' },
                            { id: 'inject', label: 'Inject dependencies', kind: 'step' },
                            { id: 'bpp', label: 'BeanPostProcessor: wrap or modify instances', kind: 'step' },
                            { id: 'ready', label: 'Context refreshed', kind: 'fix' }
                        ],
                        edges: [
                            { from: 'scan', to: 'bfpp' },
                            { from: 'bfpp', to: 'inst' },
                            { from: 'inst', to: 'inject' },
                            { from: 'inject', to: 'bpp' },
                            { from: 'bpp', to: 'ready' }
                        ]
                    }
                },
                {
                    type: 'comparison',
                    title: 'The two post-processors',
                    left: 'BeanFactoryPostProcessor',
                    right: 'BeanPostProcessor',
                    rows: [
                        { aspect: 'Operates on', left: '<strong>Definitions</strong> — the recipes', right: '<strong>Instances</strong> — the objects' },
                        { aspect: 'Runs', left: 'Before any bean is instantiated', right: 'Around each bean\'s initialisation' },
                        { aspect: 'Can', left: 'Change a class, a scope, a property value; add definitions', right: 'Wrap the object in a proxy, or replace it entirely' },
                        { aspect: 'The one you have used', left: '<code>PropertySourcesPlaceholderConfigurer</code> — resolves <code>${...}</code>', right: '<code>AutowiredAnnotationBeanPostProcessor</code>; every AOP proxy' },
                        { aspect: 'Instantiated', left: 'Very early, before the beans it edits', right: 'Early, before the beans it processes' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A post-processor cannot be post-processed.</strong> Both kinds must be instantiated before the beans they act on, so they are created too early to receive normal treatment — inject a dependency into a <code>BeanPostProcessor</code> and you force that dependency to be created early too, silently excluding it from every proxy the container would otherwise have applied. A <code>@Transactional</code> bean injected into a <code>BeanPostProcessor</code> ends up not transactional. Use <code>ObjectProvider</code> to defer the lookup if you truly need one.</p>'
                }
            ],
            docs: [
                { title: 'Container Extension Points', url: 'https://docs.spring.io/spring-framework/reference/core/beans/factory-extension.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-core', questionId: 'beanpostprocessor-vs-beanfactorypostprocessor' }
            ]
        },

        {
            id: 'bean-scopes',
            title: 'Scopes',
            importance: 'must-know',
            summary: 'Singleton by default, and singleton means one per container rather than one per JVM. Everything surprising about scopes follows from what the default implies about shared state.',
            interviewAngle: 'The recall half is easy. The half that matters is the follow-up: is a singleton bean thread-safe? The answer — Spring guarantees nothing, because a singleton is just one object that many threads call — is the whole test.',
            buildsOn: ['bean-definition-and-instantiation'],
            blocks: [
                {
                    type: 'types',
                    title: 'The scopes',
                    items: [
                        { name: 'singleton', html: '<p>The default. <strong>One instance per container</strong>, created eagerly at startup. Not a singleton in the Gang of Four sense — two contexts in one JVM means two instances, which is exactly what happens in a test suite.</p>' },
                        { name: 'prototype', html: '<p>A new instance on every injection and every <code>getBean</code>. <strong>The container does not manage its destruction</strong> — no destroy callback is ever called, so a prototype holding a resource leaks it.</p>' },
                        { name: 'request', html: '<p>One per HTTP request. Web contexts only.</p>' },
                        { name: 'session', html: '<p>One per HTTP session. Note that anything stored here has to be serialisable if sessions are replicated, and it makes the instance sticky in a way that complicates scaling.</p>' },
                        { name: 'application', html: '<p>One per <code>ServletContext</code>. Distinct from singleton when there is more than one context in the same servlet container.</p>' },
                        { name: 'websocket', html: '<p>One per WebSocket session.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Spring makes no thread-safety guarantee about a singleton bean.</strong> One instance, every request thread calling it concurrently — so a mutable field on an <code>@Service</code> is shared mutable state with no synchronisation, and it will produce one user\'s data in another user\'s response under load. It also tests perfectly, because a single-threaded test never interleaves. Keep singletons stateless: dependencies in <code>final</code> fields, everything else in method parameters and locals.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>When asked "is a Spring singleton thread-safe", answer the question behind it: <em>"The container does not make it thread-safe — it is one object called by many threads. Whether it is safe depends entirely on whether it holds mutable state, which is why the convention is that a service has final dependencies and no other fields."</em></p>'
                }
            ],
            docs: [
                { title: 'Bean Scopes', url: 'https://docs.spring.io/spring-framework/reference/core/beans/factory-scopes.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-core', questionId: 'bean-scopes' }
            ]
        },

        {
            id: 'bean-lifecycle',
            title: 'The Lifecycle of One Bean',
            importance: 'must-know',
            summary: 'Instantiate, populate, aware callbacks, post-process, initialise, post-process again, use, destroy. The two post-processing steps are where the proxy appears.',
            interviewAngle: 'Asked as "explain the bean lifecycle", and it is one of the few Spring questions where an ordered list is genuinely the answer. Knowing that the proxy is created in the second post-processing step connects this module to the AOP one.',
            buildsOn: ['bean-definition-and-instantiation'],
            blocks: [
                {
                    type: 'types',
                    title: 'The steps, in order',
                    items: [
                        { name: '1. Instantiate', html: '<p>The constructor runs. Constructor injection happens here, which is why constructor-injected dependencies are guaranteed non-null from the first line of the object\'s life.</p>' },
                        { name: '2. Populate', html: '<p>Field and setter injection. Anything injected this way is null during the constructor.</p>' },
                        { name: '3. Aware callbacks', html: '<p><code>BeanNameAware</code>, <code>BeanFactoryAware</code>, <code>ApplicationContextAware</code>. Rarely needed in application code; common in infrastructure.</p>' },
                        { name: '4. postProcessBeforeInitialization', html: '<p>Every <code>BeanPostProcessor</code> gets a look. <code>@PostConstruct</code> is invoked here, by <code>CommonAnnotationBeanPostProcessor</code> — it is a post-processor, not a special case in the container.</p>' },
                        { name: '5. Initialise', html: '<p><code>afterPropertiesSet()</code> from <code>InitializingBean</code>, then the <code>initMethod</code> named on <code>@Bean</code>.</p>' },
                        { name: '6. postProcessAfterInitialization', html: '<p><strong>Where the AOP proxy is created.</strong> What goes into the container from here on is the proxy, not the object the constructor produced.</p>' },
                        { name: '7. In use', html: '<p>For the life of the context.</p>' },
                        { name: '8. Destroy', html: '<p><code>@PreDestroy</code>, then <code>DisposableBean.destroy()</code>, then the named <code>destroyMethod</code>. Singletons only — never prototypes.</p>' }
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Three ways to hook the same two points, and which to use',
                    code: '@Component\nclass Cache implements InitializingBean, DisposableBean {\n\n    @PostConstruct                       // 1. PREFER THIS\n    void warm() { ... }                  //    plain annotation, no Spring type\n\n    @Override\n    public void afterPropertiesSet() { } // 2. couples the class to Spring\n\n    @Override\n    public void destroy() { }            // 3. same objection\n}\n\n@Bean(initMethod = "warm", destroyMethod = "close")   // 4. for third-party\nCache cache() { return new Cache(); }                 //    types you cannot annotate',
                    notes: '<p><code>@PostConstruct</code> and <code>@PreDestroy</code> moved from <code>javax.annotation</code> to <code>jakarta.annotation</code> in Spring Boot 3. The <code>@Bean(initMethod=...)</code> form exists for classes you do not own, which is the case it is genuinely best for.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Do not do work in a constructor that depends on other beans being ready.</strong> During construction the object graph is half-built, and the object is not yet proxied — so a <code>@Transactional</code> or <code>@Cacheable</code> method called from a constructor or from <code>@PostConstruct</code> runs with none of that behaviour applied. Startup work belongs in an <code>ApplicationRunner</code> or in a listener for <code>ApplicationReadyEvent</code>, both of which run after the context is fully built.</p>'
                }
            ],
            docs: [
                { title: 'Lifecycle Callbacks', url: 'https://docs.spring.io/spring-framework/reference/core/beans/factory-nature.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-core', questionId: 'bean-lifecycle-callbacks' }
            ]
        },

        {
            id: 'aware-interfaces-and-postprocessors',
            title: 'Reaching the Container From Inside It',
            importance: 'good-to-know',
            summary: 'The Aware interfaces exist, they work, and needing one is usually a sign that something should have been injected instead.',
            interviewAngle: 'Occasionally asked directly; more often it appears as a judgement question about a codebase that uses ApplicationContextAware everywhere. Being able to say why that is a smell is the useful part.',
            buildsOn: ['bean-lifecycle'],
            blocks: [
                {
                    type: 'types',
                    title: 'The ones you will meet',
                    items: [
                        { name: 'ApplicationContextAware', html: '<p>Hands the bean the context. Genuine uses exist — publishing events, resolving a bean by name that is only known at runtime — but most occurrences are a service locator in disguise.</p>' },
                        { name: 'BeanNameAware', html: '<p>The bean\'s own id. Useful in infrastructure that logs or registers by name.</p>' },
                        { name: 'EnvironmentAware', html: '<p>Nearly always better served by injecting <code>Environment</code>, or by <code>@Value</code>.</p>' },
                        { name: 'ApplicationEventPublisherAware', html: '<p>Superseded: inject <code>ApplicationEventPublisher</code> directly. It is an ordinary bean.</p>' }
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>The objection to <code>ApplicationContextAware</code> is the one from the first chapter, returning: a class that asks the container for its collaborators has hidden its dependencies again. Nothing in its signature says what it needs, a test must build a context rather than pass two stubs, and the compiler cannot tell you when a required bean is gone. Every use is worth one question — what is being looked up, and could it have been injected?</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The honest exception is a lookup whose <em>key</em> is only known at runtime: a strategy chosen by a value in the request. Even then, injecting <code>Map&lt;String, Handler&gt;</code> — which Spring populates with every <code>Handler</code> bean keyed by name — usually does the same job with the dependency visible. Mentioning that alternative is what turns a criticism into an answer.</p>'
                }
            ],
            docs: [
                { title: 'Aware Interfaces', url: 'https://docs.spring.io/spring-framework/reference/core/beans/factory-nature.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-core', questionId: 'aware-interfaces-and-context-access' }
            ]
        },

        {
            id: 'prototype-in-a-singleton',
            title: 'A Prototype Inside a Singleton',
            importance: 'must-know',
            summary: 'Injecting a prototype into a singleton gives you exactly one instance, injected once, forever. The scopes do not compose the way the annotation suggests.',
            interviewAngle: 'A favourite, because it looks like a trick and is not: it follows directly from the singleton being wired once at startup. Three fixes exist and being able to rank them is the second half of the answer.',
            buildsOn: ['bean-scopes'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The bug',
                    code: '@Component\n@Scope("prototype")\nclass Task { }\n\n@Service\nclass Runner {\n    @Autowired\n    private Task task;          // injected ONCE, at startup\n\n    void run() {\n        task.execute();         // the SAME Task, every call, forever\n    }\n}',
                    output: {
                        kind: 'trace',
                        lines: [
                            'Runner is a singleton, so the container creates it once and injects its dependencies once.',
                            'At that moment it asks for a Task, and the prototype scope duly creates a fresh one -- exactly one.',
                            'The field then holds that instance for the life of the context. Nothing asks for another, because nothing injects Runner again.',
                            'The prototype scope was honoured exactly as specified. The mistake is expecting the injection point to be re-evaluated.'
                        ],
                        explain: '<p>Scope applies to <em>a request for a bean</em>, not to a field. A singleton makes one such request in its whole life, so a prototype injected into one behaves indistinguishably from a singleton.</p>'
                    }
                },
                {
                    type: 'types',
                    title: 'The three fixes, best first',
                    items: [
                        { name: 'ObjectProvider', html: '<p><code>ObjectProvider&lt;Task&gt;</code> injected once; <code>provider.getObject()</code> at each use returns a new instance. Type-safe, explicit at the call site, no proxying. <strong>Prefer this.</strong></p>' },
                        { name: 'A scoped proxy', html: '<p><code>@Scope(value = "prototype", proxyMode = ScopedProxyMode.TARGET_CLASS)</code>. A proxy is injected and resolves a fresh target per call. Invisible at the call site, which is convenient and also a little dishonest.</p>' },
                        { name: 'Method injection', html: '<p><code>@Lookup</code> on an abstract method the container overrides. Works, predates the others, and requires the class to be subclassable — no <code>final</code>, and a non-private constructor.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>The sentence that answers the whole question: <em>"Scope is evaluated when a bean is requested, and a singleton requests its dependencies exactly once. So the prototype is created once and then held. If I need a fresh one per call, I inject an <code>ObjectProvider</code> and ask it at the point of use."</em></p>'
                }
            ],
            docs: [
                { title: 'Method Injection', url: 'https://docs.spring.io/spring-framework/reference/core/beans/dependencies/factory-method-injection.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-core', questionId: 'prototype-in-a-singleton' },
                { topicId: 'spring-core', questionId: 'objectprovider' }
            ]
        }
    ]
};
