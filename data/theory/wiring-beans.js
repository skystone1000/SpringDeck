/* ==========================================================================
   data/theory/wiring-beans.js — module 26 in the reading path

   Eight chapters about how the container decides which bean goes where.
   The circular-dependency chapter is late on purpose: it only makes sense
   once you know that constructor injection happens during instantiation and
   field injection happens after it.
   ========================================================================== */

const wiringBeansModule = {
    id: 'wiring-beans',
    trackId: 'spring-core',
    order: 26,
    title: 'Wiring: Injection and Ambiguity',
    tagline: '@Component or @Bean, constructor or field, and what a circular dependency really means.',
    estimatedMinutes: 35,
    prerequisites: ['ioc-and-the-container'],
    docHub: { title: 'Dependency Injection', url: 'https://docs.spring.io/spring-framework/reference/core/beans/dependencies/factory-collaborators.html' },

    chapters: [
        {
            id: 'component-scanning',
            title: 'How Your Class Becomes a Bean',
            importance: 'must-know',
            summary: 'Scanning walks a package tree looking for stereotype annotations. The default root is the package of the class carrying @SpringBootApplication, which is why package layout is configuration.',
            interviewAngle: 'Usually asked as "why is my bean not being found", which is the same question. The answer is nearly always that the class sits outside the scanned tree, and knowing where the tree starts is the whole diagnosis.',
            buildsOn: [],
            blocks: [
                {
                    type: 'prose',
                    html: '<p><code>@ComponentScan</code> — which <code>@SpringBootApplication</code> includes — walks the class path under a base package, reads the bytecode of every class it finds, and registers a bean definition for each one annotated with <code>@Component</code> or anything meta-annotated with it. With no base package given, the base is <strong>the package of the annotated class itself</strong>. That single default is the reason the conventional layout puts the application class at the root of the tree.</p>'
                },
                {
                    type: 'types',
                    title: 'The stereotypes, and what each one adds',
                    items: [
                        { name: '@Component', html: '<p>The base. Everything else here is meta-annotated with it, so anything true of <code>@Component</code> is true of all of them.</p>' },
                        { name: '@Service', html: '<p><strong>Semantically identical</strong> to <code>@Component</code>. It carries no behaviour at all; it is documentation for the reader and a marker for tooling and pointcuts.</p>' },
                        { name: '@Repository', html: '<p>The one stereotype that does something: it enables exception translation, converting a vendor <code>SQLException</code> into Spring\'s <code>DataAccessException</code> hierarchy via a post-processor.</p>' },
                        { name: '@Controller / @RestController', html: '<p>Marks the class for handler-method scanning by the MVC infrastructure. <code>@RestController</code> is <code>@Controller</code> plus <code>@ResponseBody</code> on every method.</p>' },
                        { name: '@Configuration', html: '<p>A component whose <code>@Bean</code> methods are read as definitions — and which is itself proxied by default. That proxying is the subject of the next chapter.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A class in a package above or beside the application class is never scanned.</strong> An application class in <code>com.acme.app</code> does not see <code>com.acme.shared</code>, and the failure is a <code>NoSuchBeanDefinitionException</code> at startup that names the type but not the reason. The fix is to move the class, or to name the package explicitly — and the second is worth resisting, because a scan list that grows one entry at a time is a layout problem being managed rather than solved.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Being able to say why <code>@Service</code> exists if it does nothing is a small but reliable discriminator: <em>"It is a marker. It carries no behaviour beyond <code>@Component</code>, but it says what layer the class belongs to, and it gives a pointcut or an architecture test something to match on."</em></p>'
                }
            ],
            docs: [
                { title: 'Classpath Scanning and Managed Components', url: 'https://docs.spring.io/spring-framework/reference/core/beans/classpath-scanning.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-core', questionId: 'component-scanning' }
            ]
        },

        {
            id: 'component-vs-bean',
            title: '@Component or @Bean',
            importance: 'must-know',
            summary: 'Use @Component for a class you own and @Bean for one you do not. The interesting half is proxyBeanMethods, which is why calling one @Bean method from another still returns the singleton.',
            interviewAngle: 'The straightforward comparison is a warm-up. The follow-up — what happens when one @Bean method calls another — is the real question, and it tests whether you know that @Configuration classes are CGLIB-proxied.',
            buildsOn: ['component-scanning'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'The two ways to declare a bean',
                    left: '@Component',
                    right: '@Bean',
                    rows: [
                        { aspect: 'Goes on', left: 'The class', right: 'A method inside a <code>@Configuration</code> class' },
                        { aspect: 'Found by', left: 'Component scanning', right: 'Reading the configuration class' },
                        { aspect: 'Requires', left: 'That you can edit the class', right: 'Nothing — the type can come from a library' },
                        { aspect: 'Construction', left: 'The container calls the constructor', right: '<strong>Your code does</strong>, so it can be arbitrary' },
                        { aspect: 'One class, several beans', left: 'No', right: 'Yes — several methods returning the same type' },
                        { aspect: 'Use it for', left: 'Your own services, repositories, controllers', right: 'Third-party types, and anything needing conditional construction' }
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Why this returns one DataSource and not two',
                    code: '@Configuration                  // proxyBeanMethods = true by default\nclass Infrastructure {\n\n    @Bean\n    DataSource dataSource() { return new HikariDataSource(...); }\n\n    @Bean\n    JdbcTemplate jdbcTemplate() {\n        return new JdbcTemplate(dataSource());   // a PLAIN method call\n    }\n\n    @Bean\n    NamedParameterJdbcTemplate named() {\n        return new NamedParameterJdbcTemplate(dataSource());   // and again\n    }\n}',
                    output: {
                        kind: 'trace',
                        lines: [
                            'A @Configuration class is subclassed by CGLIB at startup, and every @Bean method is overridden.',
                            'The override checks the container first: if a singleton for this method already exists, it returns that one and never calls your code.',
                            'So dataSource() is invoked once. The second and third calls return the same instance -- one connection pool, as intended.',
                            'Annotate the class @Configuration(proxyBeanMethods = false) and the proxy is gone: each call runs the method body, and you get three separate connection pools.'
                        ],
                        explain: '<p>This is the "full" versus "lite" configuration mode. <code>proxyBeanMethods = false</code> is faster to start and is what Spring Boot\'s own auto-configuration classes use — but only because they never call one <code>@Bean</code> method from another; they take the dependency as a method parameter instead. Taking it as a parameter is the form that works under both modes, and is worth preferring for that reason alone.</p>'
                    }
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A <code>@Component</code> class with <code>@Bean</code> methods gets lite mode without saying so.</strong> The methods are still picked up, but the class is not proxied, so an inter-method call constructs a second instance. The bug is quiet: two caches, two pools, two schedulers, and everything appears to work until state diverges between them.</p>'
                }
            ],
            docs: [
                { title: 'Basic Concepts: @Bean and @Configuration', url: 'https://docs.spring.io/spring-framework/reference/core/beans/java/basic-concepts.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-core', questionId: 'component-vs-bean' },
                { topicId: 'spring-core', questionId: 'configuration-proxybeanmethods' }
            ]
        },

        {
            id: 'injection-styles',
            title: 'Constructor, Setter, Field',
            importance: 'must-know',
            summary: 'Three ways in, and they differ in when the dependency arrives — which decides whether the object can ever exist in an invalid state.',
            interviewAngle: 'Always asked, and the expected answer is "constructor". What earns the marks is the reason: an object whose dependencies arrive after construction has a window in which it is incompletely built, and final fields are impossible.',
            buildsOn: ['component-vs-bean'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The three, and what each one costs',
                    code: '@Service\nclass OrderService {\n\n    // 1. CONSTRUCTOR. @Autowired is optional on a single constructor\n    //    since Spring 4.3, so this is plain Java.\n    private final PaymentGateway gateway;\n\n    OrderService(PaymentGateway gateway) { this.gateway = gateway; }\n\n    // 2. SETTER. The field cannot be final, and there is a window in\n    //    which the object exists with a null gateway.\n    @Autowired\n    void setGateway(PaymentGateway gateway) { this.gateway = gateway; }\n\n    // 3. FIELD. Shortest, and the one to avoid.\n    @Autowired\n    private PaymentGateway gateway;\n}',
                    notes: '<p>Constructor injection on a single constructor needs no annotation at all, which is worth noticing: the resulting class has no Spring import in it. That is not a stylistic point — it is what makes the class constructible in a test with <code>new</code>.</p>'
                },
                {
                    type: 'table',
                    title: 'What actually differs',
                    headers: ['', 'Constructor', 'Setter', 'Field'],
                    rows: [
                        ['Dependency arrives', 'Before the object exists', 'After construction', 'After construction'],
                        ['<code>final</code> possible', '<strong>Yes</strong>', 'No', 'No'],
                        ['Can be null at any point', 'No', 'Yes', 'Yes'],
                        ['Constructible in a test with <code>new</code>', '<strong>Yes</strong>', 'Partly', '<strong>No</strong> — needs reflection or a context'],
                        ['Circular dependency', 'Fails at startup', 'Resolved silently', 'Resolved silently'],
                        ['Too many dependencies', '<strong>Visible</strong> — the constructor grows', 'Hidden', 'Hidden']
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>Setter injection has one honest use: a genuinely optional dependency that can be reconfigured after startup. That is rare enough that meeting it in a codebase is usually a sign of something else, but naming it stops the answer sounding like a slogan.</p>'
                }
            ],
            docs: [
                { title: 'Dependency Injection', url: 'https://docs.spring.io/spring-framework/reference/core/beans/dependencies/factory-collaborators.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-core', questionId: 'constructor-vs-field-injection' }
            ]
        },

        {
            id: 'why-constructor-injection-wins',
            title: 'Why Constructor Injection Wins',
            importance: 'must-know',
            summary: 'Not because it is idiomatic. Because it makes an invalid object unconstructible, and because it lets a design problem show up as an ugly constructor instead of hiding.',
            interviewAngle: 'The follow-up to the previous chapter, and the place to have an opinion. The strongest version of the argument is the one about visibility: field injection hides the fact that a class has eleven dependencies, and hiding it is the actual harm.',
            buildsOn: ['injection-styles'],
            blocks: [
                {
                    type: 'types',
                    title: 'The four arguments, strongest first',
                    items: [
                        { name: 'The object is never half-built', html: '<p>Dependencies are present before the first line of any method can run. There is no window in which a field is null, and no ordering rule anyone has to remember.</p>' },
                        { name: 'Fields can be final', html: '<p>Which makes them immutable, safely publishable across threads, and impossible to reassign by accident. This matters more than it sounds: a singleton service shared by every request thread is exactly the object you want immutable.</p>' },
                        { name: 'It tests without a framework', html: '<p><code>new OrderService(stubGateway, stubRepo)</code>. No context, no reflection, no <code>@SpringBootTest</code> — and therefore a test that runs in milliseconds.</p>' },
                        { name: 'Bad design becomes visible', html: '<p>A class with eleven dependencies has an eleven-parameter constructor, which is unpleasant to look at. With field injection it is eleven tidy annotated lines, and nothing ever prompts anyone to split the class.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Field injection also makes a circular dependency invisible.</strong> Spring resolves a field-injected cycle silently at startup, so the design flaw ships and is discovered years later by someone trying to test one of the two classes in isolation. Constructor injection fails the same cycle immediately, at boot, with both class names in the message — which is a feature being reported as a problem.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Lombok\'s <code>@RequiredArgsConstructor</code> removes the boilerplate objection entirely: <code>final</code> fields, a generated constructor, no annotations on the fields. It also removes the fourth argument above, because the constructor is no longer something anyone looks at — worth saying out loud if the interviewer raises Lombok, since it is the one real cost of using it here.</p>'
                }
            ],
            docs: [
                { title: 'Constructor-based Dependency Injection', url: 'https://docs.spring.io/spring-framework/reference/core/beans/dependencies/factory-collaborators.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-core', questionId: 'constructor-vs-field-injection' }
            ]
        },

        {
            id: 'primary-and-qualifier',
            title: 'Two Candidates for One Slot',
            importance: 'must-know',
            summary: 'By type first, then by qualifier, then by name. @Primary picks a default for everyone; @Qualifier picks one for this injection point.',
            interviewAngle: 'Asked as "you have two implementations of an interface, what happens". The complete answer is the resolution order, plus the observation that the parameter name is a tie-breaker — which is why a rename can break wiring.',
            buildsOn: ['injection-styles'],
            blocks: [
                {
                    type: 'diagram',
                    diagramType: 'flowchart',
                    caption: 'The order Spring resolves an injection point in.',
                    diagramConfig: {
                        title: 'Which bean gets injected',
                        nodes: [
                            { id: 'type', label: 'Find every bean of the required type', kind: 'start' },
                            { id: 'one', label: 'Exactly one?', kind: 'decision' },
                            { id: 'inject', label: 'Inject it', kind: 'fix' },
                            { id: 'qual', label: '@Qualifier on the injection point?', kind: 'decision' },
                            { id: 'prim', label: 'One candidate marked @Primary?', kind: 'decision' },
                            { id: 'name', label: 'A bean name matching the field or parameter name?', kind: 'decision' },
                            { id: 'fail', label: 'NoUniqueBeanDefinitionException', kind: 'step' }
                        ],
                        edges: [
                            { from: 'type', to: 'one' },
                            { from: 'one', to: 'inject', label: 'yes' },
                            { from: 'one', to: 'qual', label: 'no' },
                            { from: 'qual', to: 'inject', label: 'yes' },
                            { from: 'qual', to: 'prim', label: 'no' },
                            { from: 'prim', to: 'inject', label: 'yes' },
                            { from: 'prim', to: 'name', label: 'no' },
                            { from: 'name', to: 'inject', label: 'yes' },
                            { from: 'name', to: 'fail', label: 'no' }
                        ]
                    }
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>The name-matching step means renaming a constructor parameter can change which bean is injected</strong> — or break the wiring outright. It resolves silently and it is invisible in review, because the diff shows a parameter rename and nothing else. It also depends on parameter names surviving compilation, which needs <code>-parameters</code>; Spring Boot\'s Maven and Gradle plugins set it, and a hand-rolled build may not. Do not rely on this step: if there are two candidates, say which one you mean.</p>'
                },
                {
                    type: 'types',
                    title: 'The tools, and when each is right',
                    items: [
                        { name: '@Primary', html: '<p>On the bean. Marks the default for every unqualified injection point. Right when one implementation is genuinely the normal one and the other is a special case.</p>' },
                        { name: '@Qualifier("name")', html: '<p>On the injection point. Right when the choice belongs to the consumer. String-typed, so a typo is a startup failure rather than a compile error.</p>' },
                        { name: 'A custom qualifier annotation', html: '<p><code>@Retention(RUNTIME) @Qualifier @interface Fast { }</code>. Type-safe, refactorable, and self-documenting. Worth it wherever the same qualifier appears more than twice.</p>' },
                        { name: 'Inject the collection', html: '<p><code>List&lt;Validator&gt;</code> gets every implementation, ordered by <code>@Order</code>; <code>Map&lt;String, Validator&gt;</code> gets them keyed by bean name. When the answer is "all of them", this is better than choosing.</p>' }
                    ]
                }
            ],
            docs: [
                { title: 'Fine-tuning Annotation-based Autowiring', url: 'https://docs.spring.io/spring-framework/reference/core/beans/annotation-config/autowired-qualifiers.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-core', questionId: 'primary-qualifier-and-naming' },
                { topicId: 'spring-core', questionId: 'injecting-a-collection-of-beans' }
            ]
        },

        {
            id: 'conditional-beans',
            title: 'Beans That Might Not Exist',
            importance: 'should-know',
            summary: 'A family of @Conditional annotations decides whether a definition is registered at all. @ConditionalOnMissingBean is the one that makes auto-configuration back off.',
            interviewAngle: 'Worth knowing before the auto-configuration module, because that module is entirely built out of these. The detail that matters is ordering: a condition on a missing bean is only correct if it is evaluated after the bean that might exist.',
            buildsOn: ['component-vs-bean'],
            blocks: [
                {
                    type: 'types',
                    title: 'The conditions worth recognising',
                    items: [
                        { name: '@ConditionalOnMissingBean', html: '<p>Register this only if nobody else defined one. <strong>The whole basis of "define your own and Boot backs off"</strong>, and the single most important annotation in Spring Boot.</p>' },
                        { name: '@ConditionalOnClass', html: '<p>Only if a class is on the class path. How a starter configures a library it does not depend on directly.</p>' },
                        { name: '@ConditionalOnProperty', html: '<p>Only if a property has a given value. Note <code>matchIfMissing</code>, which decides the default and is the source of most surprises here.</p>' },
                        { name: '@ConditionalOnBean', html: '<p>Only if some other bean exists. Ordering-sensitive in exactly the same way as its opposite.</p>' },
                        { name: '@Profile', html: '<p>A condition on the active profiles, and the oldest member of the family. Predates <code>@Conditional</code> and is implemented with it.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong><code>@ConditionalOnMissingBean</code> is order-dependent, and it is reliable only inside auto-configuration.</strong> Conditions are evaluated as definitions are registered, so "is there already one?" means "has one been registered <em>so far</em>". Auto-configuration is ordered explicitly and runs last, after all user configuration, which is what makes the back-off work. The same annotation on one of your own <code>@Configuration</code> classes has no such guarantee and will behave differently depending on scan order.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Conditions apply to a whole <code>@Configuration</code> class as well as to a single <code>@Bean</code> method, and putting one on the class is both cheaper and clearer when every bean inside shares it — the class is never even read if the condition fails.</p>'
                }
            ],
            docs: [
                { title: 'Condition Annotations', url: 'https://docs.spring.io/spring-boot/reference/features/developing-auto-configuration.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-core', questionId: 'conditional-beans' }
            ]
        },

        {
            id: 'circular-dependencies',
            title: 'The Circular Dependency',
            importance: 'must-know',
            summary: 'Spring can resolve a cycle through setters and fields using an early reference, and cannot resolve one through constructors at all. Since Boot 2.6 it refuses by default either way.',
            interviewAngle: 'A favourite because it has a mechanism worth explaining and a judgement worth having. The mechanism is the three-level cache; the judgement is that the cycle is a design problem and the framework flag is not the fix.',
            buildsOn: ['why-constructor-injection-wins'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>Two beans that need each other cannot both be fully constructed first. Spring\'s escape hatch is to expose a <strong>partially initialised</strong> reference: while A is being created, and before its own dependencies are injected, a reference to the raw A is placed in an "early singleton" cache. B is then created, is handed that reference, and A finishes. It works because B stores the reference and does not call anything on it during its own construction.</p><p>That is also exactly why it cannot work through constructors. A cannot be passed to B\'s constructor before A\'s own constructor has returned, and A\'s constructor cannot return until it has a B. There is no partially built object to hand out yet, so the container fails.</p>'
                },
                {
                    type: 'comparison',
                    title: 'The same cycle, two injection styles',
                    left: 'Constructor injection',
                    right: 'Field or setter injection',
                    rows: [
                        { aspect: 'Outcome', left: '<strong>Startup fails</strong>', right: 'Resolved, silently' },
                        { aspect: 'Message', left: 'Names both beans and the cycle', right: 'None' },
                        { aspect: 'Why', left: 'No object exists to hand out yet', right: 'An early reference is cached before injection' },
                        { aspect: 'Found', left: 'On the first run, by everyone', right: 'Years later, by whoever tries to test one alone' },
                        { aspect: 'Since Boot 2.6', left: 'Fails', right: '<strong>Also fails</strong> — cycles are prohibited by default' }
                    ]
                },
                {
                    type: 'version',
                    title: 'When Spring stopped allowing this',
                    items: [
                        { version: 'Spring Boot 2.6', state: 'changed', html: '<p>Circular references are <strong>prohibited by default</strong>. <code>spring.main.allow-circular-references=true</code> restores the old behaviour, and exists for migration rather than for use.</p>' },
                        { version: 'Spring Boot 2.6', state: 'is', html: '<p>The failure message names the cycle and suggests <code>@Lazy</code>. Both are workarounds; the fix is to break the cycle.</p>' }
                    ]
                },
                {
                    type: 'types',
                    title: 'Fixing it, best first',
                    items: [
                        { name: 'Extract the shared part', html: '<p>The cycle nearly always means a third responsibility is living inside one of the two classes. Pull it into a C that both depend on, and the cycle is gone rather than tolerated.</p>' },
                        { name: 'Invert one direction with an event', html: '<p>If A only needs to tell B that something happened, publish an <code>ApplicationEvent</code>. The dependency disappears entirely.</p>' },
                        { name: '@Lazy on one side', html: '<p>Injects a proxy and defers the real lookup to first use. It compiles, it starts, and the design problem is still there — which is the reason to rank it third rather than to forbid it.</p>' },
                        { name: 'The property', html: '<p><code>allow-circular-references=true</code>. For getting an existing application onto Boot 2.6 while the real fix is scheduled, and for nothing else.</p>' }
                    ]
                }
            ],
            docs: [
                { title: 'Circular Dependencies', url: 'https://docs.spring.io/spring-framework/reference/core/beans/dependencies/factory-collaborators.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-core', questionId: 'circular-dependency' }
            ]
        },

        {
            id: 'lazy-and-objectprovider',
            title: '@Lazy, ObjectProvider and Optional Dependencies',
            importance: 'should-know',
            summary: 'Three ways to say "not yet" or "maybe not at all", and they are not interchangeable.',
            interviewAngle: 'Comes up as the follow-up to both the prototype question and the circular dependency question. Knowing that ObjectProvider is the type-safe one, and that Optional works too, is enough.',
            buildsOn: ['circular-dependencies'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The three, and what each one means',
                    code: '@Service\nclass Reports {\n\n    // 1. @Lazy: a proxy is injected now; the real bean is created on\n    //    first method call. Breaks a cycle; does not make it go away.\n    Reports(@Lazy Renderer renderer) { ... }\n\n    // 2. ObjectProvider: injected once, resolved per call. The answer to\n    //    a prototype in a singleton, and to "there might be none".\n    private final ObjectProvider<Exporter> exporters;\n\n    void export() {\n        exporters.ifAvailable(e -> e.run());       // no bean? no call.\n        exporters.orderedStream().forEach(...);    // all of them, ordered\n    }\n\n    // 3. Optional: the simplest form of "this one is optional".\n    //    @Autowired(required = false) is the older equivalent and\n    //    leaves the field null instead.\n    Reports(Optional<AuditSink> sink) { ... }\n}',
                    notes: '<p><code>ObjectProvider</code> is the one to reach for first. It covers absence, multiplicity and deferral in one type, it is checked by the compiler, and unlike <code>@Lazy</code> it does not put a proxy between you and the object.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong><code>@Autowired(required = false)</code> on a field leaves it null, and nothing reminds you.</strong> Every use site then needs a null check that the type system knows nothing about, and the first one anybody forgets is a <code>NullPointerException</code> in production. <code>Optional&lt;T&gt;</code> or <code>ObjectProvider&lt;T&gt;</code> both put the absence in the type, where the compiler can see it.</p>'
                },
                {
                    type: 'tip',
                    html: '<p><code>@Lazy</code> has a second, better-motivated use than breaking cycles: an expensive bean that most runs never touch — a report renderer, a migration tool, a client for a rarely used downstream. Deferring its creation genuinely shortens startup, and there is no design smell attached.</p>'
                }
            ],
            docs: [
                { title: 'ObjectProvider', url: 'https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/beans/factory/ObjectProvider.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'spring-core', questionId: 'optional-dependencies' },
                { topicId: 'spring-core', questionId: 'lazy-initialisation' }
            ]
        }
    ]
};
