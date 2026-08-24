/* ==========================================================================
   data/spring-core.js — Spring Core & Dependency Injection

   Twenty-eight questions in three subsections. Round 3 of a Spring interview
   almost always starts here, and it starts here because the answers reveal
   whether someone has debugged a container or only configured one.

   ONE GLOBAL PER FILE.
   ========================================================================== */

const springCoreData = {
    id: 'spring-core',
    title: 'Spring Core & Dependency Injection',
    subsections: [
        { id: 'container', title: 'Container & Context' },
        { id: 'beans',     title: 'Beans, Scopes & Lifecycle' },
        { id: 'wiring',    title: 'Wiring & Circular Dependencies' }
    ],
    keyTopics: [
        'IoC', 'constructor vs field injection', 'bean scopes',
        'bean lifecycle callbacks', 'BeanFactory vs ApplicationContext',
        '@Component vs @Bean', '@Primary and @Qualifier',
        'circular dependency', 'BeanPostProcessor'
    ],
    questions: [

/* ==== Container & Context ============================================= */

{
    id: 'what-inversion-of-control-buys',
    importance: 'must-know',
    subsection: 'container',
    question: 'What is inversion of control, and what does it actually buy you beyond avoiding the new keyword?',
    answer:
        '<p>Inversion of control means a class does not construct or locate its collaborators; ' +
        'something outside it supplies them. Dependency injection is the specific form Spring ' +
        'uses. The framework builds the object graph and hands each object what it needs.</p>' +
        '<p>The benefit people give first — "you can swap implementations" — is real but minor. ' +
        'The ones that matter day to day:</p>' +
        '<ul>' +
        '<li><strong>Testability without a framework.</strong> A class whose dependencies arrive ' +
        'through its constructor can be built in a unit test with three lines and no container ' +
        'at all. A class that calls <code>new PaymentClient()</code> internally can only be ' +
        'tested by starting whatever that client needs.</li>' +
        '<li><strong>Lifecycle management.</strong> Something has to decide that there is one ' +
        'connection pool and not one per caller, and shut it down in the right order. Doing that ' +
        'by hand is a static-holder-and-init-order problem that never ends well.</li>' +
        '<li><strong>Cross-cutting behaviour.</strong> Because the container creates the object, ' +
        'it can hand out a proxy instead — which is how <code>@Transactional</code>, ' +
        '<code>@Cacheable</code>, <code>@Async</code>, security and metrics all work. None of ' +
        'them is possible if the code constructs its own collaborators.</li>' +
        '<li><strong>Configuration is external.</strong> The wiring lives in one place and can ' +
        'differ per environment without any conditional logic in the classes.</li>' +
        '</ul>' +
        '<p>The honest counterpoint, which is worth offering: the cost is that the object graph ' +
        'is no longer visible in the source. A startup failure becomes a stack trace about bean ' +
        'creation rather than a compile error, and "who provides this interface" becomes a ' +
        'search rather than a click. Constructor injection reduces both, which is one of several ' +
        'reasons it is the recommended form.</p>',
    referenceLinks: [
        { title: 'The IoC Container — Spring Framework Reference', url: 'https://docs.spring.io/spring-framework/reference/core/beans/introduction.html' }
    ],
    tags: ['spring', 'ioc', 'dependency-injection'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'beanfactory-vs-applicationcontext',
    importance: 'should-know',
    subsection: 'container',
    question: 'What is the difference between BeanFactory and ApplicationContext?',
    answer:
        '<p><code>BeanFactory</code> is the basic container contract: get a bean by name or ' +
        'type, and manage its lifecycle. <code>ApplicationContext</code> extends it and adds ' +
        'everything that makes Spring a framework rather than a factory:</p>' +
        '<ul>' +
        '<li><strong>Annotation and post-processor support</strong> registered automatically, ' +
        'which is what makes <code>@Autowired</code>, <code>@Value</code> and ' +
        '<code>@Transactional</code> work without wiring anything by hand.</li>' +
        '<li><strong>Eager instantiation of singletons</strong> at startup. A ' +
        '<code>BeanFactory</code> creates lazily. This is why a misconfigured Spring ' +
        'application fails at boot rather than on the first request that touches the broken ' +
        'bean — the fail-fast is deliberate and valuable.</li>' +
        '<li><strong>Event publication</strong> — <code>ApplicationEventPublisher</code> and ' +
        'the lifecycle events.</li>' +
        '<li><strong>Environment and property resolution</strong>, message sources for ' +
        'internationalisation, and resource loading.</li>' +
        '<li><strong>Hierarchical contexts</strong>, used by Spring MVC and Spring Boot for ' +
        'parent-child arrangements.</li>' +
        '</ul>' +
        '<p>In practice you always use an <code>ApplicationContext</code>. The distinction is ' +
        'worth knowing because it explains <em>why</em> startup is eager and why the container ' +
        'can rewrite your beans — both come from the context layer rather than from the factory ' +
        'underneath.</p>',
    referenceLinks: [
        { title: 'BeanFactory and ApplicationContext — Spring Framework Reference', url: 'https://docs.spring.io/spring-framework/reference/core/beans/beanfactory.html' }
    ],
    tags: ['spring', 'container', 'applicationcontext'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'context-startup-sequence',
    importance: 'should-know',
    subsection: 'container',
    question: 'What happens, in order, when an ApplicationContext starts?',
    answer:
        '<p>Being able to name the phases is what lets you read a startup failure, because the ' +
        'stack trace tells you which one you are in.</p>' +
        '<ul>' +
        '<li><strong>Read bean definitions.</strong> Component scanning and ' +
        '<code>@Configuration</code> classes are parsed into <code>BeanDefinition</code> ' +
        'objects. Nothing is instantiated yet — a definition is a recipe.</li>' +
        '<li><strong>Run <code>BeanFactoryPostProcessor</code>s.</strong> These can modify the ' +
        '<em>definitions</em>. <code>PropertySourcesPlaceholderConfigurer</code> is one, which ' +
        'is why <code>${...}</code> placeholders are resolved before any bean exists. ' +
        '<code>ConfigurationClassPostProcessor</code> is another, and it is what actually ' +
        'processes <code>@Configuration</code>.</li>' +
        '<li><strong>Register <code>BeanPostProcessor</code>s.</strong> Registered before the ' +
        'ordinary beans, so they are available to process them.</li>' +
        '<li><strong>Instantiate singletons</strong>, in dependency order. For each: construct, ' +
        'populate properties, call the <code>Aware</code> setters, run ' +
        '<code>postProcessBeforeInitialization</code>, then <code>@PostConstruct</code>, then ' +
        '<code>afterPropertiesSet()</code>, then the custom init method, then ' +
        '<code>postProcessAfterInitialization</code> — which is where proxies are created.</li>' +
        '<li><strong>Publish <code>ContextRefreshedEvent</code>.</strong> Everything is ready.</li>' +
        '</ul>' +
        '<p>Two consequences worth stating. A <code>BeanPostProcessor</code> that depends on an ' +
        'ordinary bean forces that bean to be created early, before the post-processors are all ' +
        'in place, so it silently misses proxying — Spring logs a warning about a bean "not ' +
        'eligible for getting processed by all BeanPostProcessors" and it is easy to ignore. ' +
        'And because proxies are created in the last post-processing step, a reference captured ' +
        'in <code>@PostConstruct</code> is the raw object, not the proxy.</p>',
    referenceLinks: [
        { title: 'Container Extension Points — Spring Framework Reference', url: 'https://docs.spring.io/spring-framework/reference/core/beans/factory-extension.html' }
    ],
    tags: ['spring', 'container', 'lifecycle', 'startup'],
    images: [],
    hasDiagram: true,
    diagramType: 'animation',
    diagramConfig: {
        title: 'ApplicationContext startup, in order',
        steps: [
            { label: 'Read definitions',  caption: 'scan and parse' },
            { label: 'BeanFactoryPP',     caption: 'edit definitions' },
            { label: 'Register BeanPP',   caption: 'before the beans' },
            { label: 'Instantiate',       caption: 'singletons, in order' },
            { label: 'Initialise',        caption: 'PostConstruct, then proxy' },
            { label: 'Refreshed',         caption: 'event published' }
        ]
    },
    codeSnippets: []
},

{
    id: 'component-scanning',
    importance: 'should-know',
    subsection: 'container',
    question: 'How does component scanning decide what to pick up, and what goes wrong with package layout?',
    answer:
        '<p><code>@ComponentScan</code> walks a base package and its subpackages looking for ' +
        'classes annotated with <code>@Component</code> or anything meta-annotated with it — ' +
        '<code>@Service</code>, <code>@Repository</code>, <code>@Controller</code>, ' +
        '<code>@Configuration</code>. Each becomes a bean definition.</p>' +
        '<p>In Spring Boot, <code>@SpringBootApplication</code> includes ' +
        '<code>@ComponentScan</code> with <strong>no base package specified</strong>, which ' +
        'means it uses the package of the annotated class. That single default causes most of ' +
        'the problems:</p>' +
        '<ul>' +
        '<li><strong>The application class must be in the root package.</strong> Put it in ' +
        '<code>com.example.app.web</code> and nothing in <code>com.example.app.service</code> is ' +
        'ever scanned. The symptom is a <code>NoSuchBeanDefinitionException</code> for a class ' +
        'that plainly has <code>@Service</code> on it.</li>' +
        '<li><strong>Never scan from the default package.</strong> An application class with no ' +
        '<code>package</code> statement scans every class on the classpath, including every ' +
        'library, which is slow and unpredictable.</li>' +
        '<li><strong>Widening the scan to pull in a library is a smell.</strong> If a starter ' +
        'needs beans registered, it does it through auto-configuration; scanning someone ' +
        'else\'s package is a workaround that breaks on their next release.</li>' +
        '</ul>' +
        '<p>The stereotype annotations are not interchangeable, though the container treats them ' +
        'nearly identically. <code>@Repository</code> additionally enables exception ' +
        'translation, turning a driver-specific <code>SQLException</code> into Spring\'s ' +
        '<code>DataAccessException</code> hierarchy. <code>@Service</code> and ' +
        '<code>@Controller</code> are semantic markers that tools and aspects can target.</p>',
    referenceLinks: [
        { title: 'Classpath Scanning — Spring Framework Reference', url: 'https://docs.spring.io/spring-framework/reference/core/beans/classpath-scanning.html' }
    ],
    tags: ['spring', 'component-scan', 'stereotypes'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'beanpostprocessor-vs-beanfactorypostprocessor',
    importance: 'should-know',
    subsection: 'container',
    question: 'What is the difference between a BeanPostProcessor and a BeanFactoryPostProcessor?',
    answer:
        '<p>They operate on different things at different times, and the names are unhelpfully ' +
        'similar.</p>' +
        '<p><strong><code>BeanFactoryPostProcessor</code></strong> runs <em>before any bean is ' +
        'instantiated</em> and operates on <strong>bean definitions</strong> — the recipes. It ' +
        'can change a definition\'s scope, its property values, its class. ' +
        '<code>PropertySourcesPlaceholderConfigurer</code> is the one everybody uses without ' +
        'knowing it: it substitutes <code>${...}</code> placeholders in definitions, which is ' +
        'why properties can be injected at all.</p>' +
        '<p><strong><code>BeanPostProcessor</code></strong> runs <em>around the initialisation ' +
        'of every bean instance</em>, with a hook before and after. The "after" hook is where ' +
        'Spring returns a <strong>proxy in place of your object</strong>, and that is how ' +
        '<code>@Transactional</code>, <code>@Async</code>, <code>@Cacheable</code>, ' +
        '<code>@Validated</code> and method security are all implemented. ' +
        '<code>AutowiredAnnotationBeanPostProcessor</code> is another — it is what makes ' +
        '<code>@Autowired</code> work.</p>' +
        '<p>The practical reason to know this: it explains why the object you get from the ' +
        'container is often <em>not</em> an instance of your class, and therefore why ' +
        'self-invocation defeats these annotations, why <code>getClass()</code> returns ' +
        'something with <code>$$SpringCGLIB$$</code> in the name, and why a ' +
        '<code>final</code> method cannot be advised by a CGLIB proxy.</p>',
    referenceLinks: [
        { title: 'BeanPostProcessor — Spring Framework Reference', url: 'https://docs.spring.io/spring-framework/reference/core/beans/factory-extension.html' }
    ],
    tags: ['spring', 'container', 'post-processors', 'proxies'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'context-events',
    importance: 'good-to-know',
    subsection: 'container',
    question: 'What are ApplicationEvents for, and when should you use them instead of a direct call?',
    answer:
        '<p>They decouple a publisher from its listeners. The publisher says something happened; ' +
        'it does not know or care who reacts. <code>ApplicationEventPublisher.publishEvent()</code> ' +
        'and <code>@EventListener</code> are the whole API, and any object can be an event since ' +
        'Spring 4.2 — it need not extend <code>ApplicationEvent</code>.</p>' +
        '<p><strong>Listeners are synchronous by default</strong>, running on the publishing ' +
        'thread and inside the publisher\'s transaction. That surprises people who expect ' +
        '"event" to mean "async". Adding <code>@Async</code> makes a listener asynchronous, and ' +
        'that also takes it out of the transaction — which is usually what you wanted and ' +
        'sometimes exactly what you did not.</p>' +
        '<p><code>@TransactionalEventListener</code> is the one worth knowing about. It defers ' +
        'the listener until a chosen transaction phase, <code>AFTER_COMMIT</code> by default. ' +
        'That solves the very common bug where an event triggers an email or a message about an ' +
        'order that then fails to commit — the notification goes out and the order does not ' +
        'exist.</p>' +
        '<p><strong>When to use one:</strong> a genuinely optional side effect, one publisher and ' +
        'several unrelated reactions, or breaking a cycle between two beans. ' +
        '<strong>When not to:</strong> anything where the caller needs the result, anything ' +
        'where ordering matters, and anything crossing a process boundary — that is a message ' +
        'broker, and an in-process event will be silently lost on a crash.</p>' +
        '<p>The honest cost: events make the call graph invisible. "Find usages" stops working, ' +
        'and a reader cannot tell what happens when an order is placed without searching for ' +
        'listeners of the type.</p>',
    referenceLinks: [
        { title: 'Standard and Custom Events — Spring Framework Reference', url: 'https://docs.spring.io/spring-framework/reference/core/beans/context-introduction.html' }
    ],
    tags: ['spring', 'events', 'decoupling', 'transactions'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'aware-interfaces-and-context-access',
    importance: 'good-to-know',
    subsection: 'container',
    question: 'How do you get hold of the ApplicationContext from a bean, and why is that usually a mistake?',
    answer:
        '<p>You can implement <code>ApplicationContextAware</code>, or simply inject ' +
        '<code>ApplicationContext</code> like any other dependency. Both work. The question is ' +
        'why you want it.</p>' +
        '<p>Calling <code>context.getBean(...)</code> from inside a bean is the <strong>service ' +
        'locator</strong> pattern, and it undoes most of what dependency injection gives you: ' +
        'the dependency is no longer visible in the signature, it cannot be supplied in a unit ' +
        'test without a container, and a missing bean becomes a runtime failure at the moment ' +
        'of the call rather than a startup failure.</p>' +
        '<p>The legitimate cases are narrow:</p>' +
        '<ul>' +
        '<li><strong>A prototype-scoped bean needed repeatedly from a singleton</strong> — ' +
        'though <code>ObjectProvider</code> is the better tool for that.</li>' +
        '<li><strong>Choosing an implementation at run time by a key.</strong> Injecting a ' +
        '<code>Map&lt;String, Handler&gt;</code> is cleaner: Spring populates it with every ' +
        '<code>Handler</code> bean keyed by name, and the strategy lookup is a map get with no ' +
        'container involved.</li>' +
        '<li><strong>Framework and library code</strong> that genuinely must introspect the ' +
        'context.</li>' +
        '</ul>' +
        '<p>The <code>Aware</code> family more broadly — <code>BeanNameAware</code>, ' +
        '<code>EnvironmentAware</code>, <code>ResourceLoaderAware</code> — couples your class to ' +
        'Spring, which is exactly what the framework spent so much effort making unnecessary. ' +
        'Injecting the same thing through the constructor is equivalent and keeps the class ' +
        'plain.</p>',
    referenceLinks: [],
    tags: ['spring', 'container', 'service-locator', 'anti-patterns'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'environment-and-property-sources',
    importance: 'good-to-know',
    subsection: 'container',
    question: 'How does Spring resolve a property, and where does Environment fit?',
    answer:
        '<p><code>Environment</code> is the abstraction over two things: the active profiles, ' +
        'and an ordered list of <code>PropertySource</code>s. Resolving a key means asking each ' +
        'source in order and taking the first answer — so precedence is entirely a matter of ' +
        'the order of that list, and no source overwrites another.</p>' +
        '<p>The ordering matters more than the mechanism, because "the value is not what the ' +
        'file says" is a common and confusing failure. Broadly, from strongest: command-line ' +
        'arguments, then <code>SPRING_APPLICATION_JSON</code>, then servlet parameters, then JNDI, ' +
        'then Java system properties, then OS environment variables, then profile-specific ' +
        'application files, then the plain application file, then <code>@PropertySource</code>, ' +
        'then defaults set on <code>SpringApplication</code>. Boot documents the full list and ' +
        'it is worth reading rather than remembering.</p>' +
        '<p>Two practical notes. Relaxed binding means ' +
        '<code>spring.datasource.maximum-pool-size</code>, ' +
        '<code>SPRING_DATASOURCE_MAXIMUMPOOLSIZE</code> and the camel-case spelling are the same ' +
        'key — which is what makes environment-variable overrides usable in a container. And ' +
        '<code>@ConfigurationProperties</code> is generally better than a scatter of ' +
        '<code>@Value</code>: it binds a whole group at once, supports validation with ' +
        '<code>@Validated</code>, gives you a typed object to inject and to test, and appears in ' +
        'the generated metadata so an IDE can complete it.</p>' +
        '<p>To see what actually won, the <code>/actuator/env</code> endpoint shows every source ' +
        'and which one supplied each value. That is usually a faster answer than reasoning about ' +
        'the order.</p>',
    referenceLinks: [
        { title: 'Externalized Configuration — Spring Boot Reference', url: 'https://docs.spring.io/spring-boot/reference/features/external-config.html' }
    ],
    tags: ['spring', 'configuration', 'environment', 'properties'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'multiple-contexts',
    importance: 'good-to-know',
    subsection: 'container',
    question: 'Can an application have more than one ApplicationContext?',
    answer:
        '<p>Yes, and it usually does without anyone noticing.</p>' +
        '<p>Contexts can be <strong>hierarchical</strong>: a child sees its parent\'s beans, and ' +
        'the parent cannot see the child\'s. Classic Spring MVC used this — a root context with ' +
        'services and repositories, and a servlet context with controllers and view resolvers, ' +
        'as its child. A common failure in that arrangement was declaring ' +
        '<code>@Transactional</code> support in the wrong one, so the aspects existed in a ' +
        'context that could not see the beans they were meant to advise.</p>' +
        '<p>Spring Boot flattens this to <strong>one context</strong> by default, which removes ' +
        'that entire class of problem. The places multiple contexts still appear:</p>' +
        '<ul>' +
        '<li><strong>Spring Cloud\'s bootstrap context</strong>, a parent that loads external ' +
        'configuration before the main context starts.</li>' +
        '<li><strong>Tests.</strong> The test framework caches contexts by configuration, so a ' +
        'suite that varies its properties or its mocks builds several. This is the usual reason ' +
        'a test suite is slow — and why <code>@MockitoBean</code> declared inconsistently across ' +
        'test classes multiplies the cache rather than reusing it.</li>' +
        '<li><strong>Deliberate module isolation</strong> in a large application, which is rare ' +
        'and generally more trouble than it saves.</li>' +
        '</ul>',
    referenceLinks: [],
    tags: ['spring', 'container', 'context-hierarchy', 'testing'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

/* ==== Beans, Scopes & Lifecycle ======================================= */

{
    id: 'bean-scopes',
    importance: 'must-know',
    subsection: 'beans',
    question: 'What are the bean scopes, and what does singleton actually mean here?',
    answer:
        '<p>Six scopes. Two work anywhere, four need a web context.</p>' +
        '<ul>' +
        '<li><strong><code>singleton</code></strong> — the default. One instance ' +
        '<em>per container</em>, created eagerly at startup and cached by name.</li>' +
        '<li><strong><code>prototype</code></strong> — a new instance on every injection and ' +
        'every <code>getBean()</code>. Spring builds it, injects it and hands it over, and then ' +
        '<strong>forgets it</strong>: no destruction callback ever runs. If a prototype holds a ' +
        'resource, you are responsible for closing it.</li>' +
        '<li><strong><code>request</code></strong>, <strong><code>session</code></strong>, ' +
        '<strong><code>application</code></strong>, <strong><code>websocket</code></strong> — ' +
        'web scopes, tied to the corresponding lifetime.</li>' +
        '</ul>' +
        '<p><strong>Singleton here means one per <code>ApplicationContext</code>, not one per ' +
        'JVM.</strong> That distinction is the point of the question. Two contexts in one JVM — ' +
        'two tests with different configuration, a Spring Cloud bootstrap context, an ' +
        'application deployed twice in one servlet container — give you two instances. So a ' +
        'Spring singleton is not the singleton pattern and gives you none of its guarantees; ' +
        'anything relying on global uniqueness for correctness is relying on a coincidence.</p>' +
        '<p>The consequence that matters most in review: <strong>a singleton bean is shared by ' +
        'every request thread, so it must be stateless or thread-safe.</strong> A mutable field ' +
        'on a <code>@Service</code> is a data race, and in a web application it is a race ' +
        'between two users. This is the single most common concurrency bug in Spring codebases, ' +
        'and it is invisible in a single-user test.</p>',
    referenceLinks: [
        { title: 'Bean Scopes — Spring Framework Reference', url: 'https://docs.spring.io/spring-framework/reference/core/beans/factory-scopes.html' }
    ],
    tags: ['spring', 'scopes', 'thread-safety'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: [
        {
            language: 'java',
            title: 'The mutable field that two users share',
            code:
                '@Service\n' +
                'public class ReportService {\n' +
                '\n' +
                '    // One ReportService exists. Every request thread writes this field.\n' +
                '    private String currentUser;\n' +
                '\n' +
                '    public Report build(String user) {\n' +
                '        this.currentUser = user;\n' +
                '        // Any suspension point here - a database call, a REST call -\n' +
                '        // gives another thread the chance to overwrite currentUser\n' +
                '        // before this one reads it back.\n' +
                '        List<Row> rows = repository.findFor(this.currentUser);\n' +
                '        return new Report(this.currentUser, rows);\n' +
                '    }\n' +
                '}',
            output: {
                kind: 'trace',
                lines: [
                    'Thread A calls build("alice") and assigns currentUser = "alice".',
                    'Thread A blocks on the repository call.',
                    'Thread B calls build("bob") and assigns currentUser = "bob".',
                    'Thread A resumes and reads currentUser, which is now "bob".',
                    'Alice receives a report built for Bob, with no exception anywhere.'
                ],
                explain:
                    '<p>The fix is to hold nothing: pass <code>user</code> down as a parameter ' +
                    'and keep the service stateless. Making the field a ' +
                    '<code>ThreadLocal</code> also works and is worse — it trades a visible ' +
                    'race for a leak that has to be cleaned up on every path.</p>' +
                    '<p>This is a confidentiality bug rather than a correctness one, which is ' +
                    'why it is worth naming as such in an interview.</p>'
            }
        }
    ]
},

{
    id: 'prototype-in-a-singleton',
    importance: 'must-know',
    subsection: 'beans',
    question: 'You inject a prototype bean into a singleton. How many instances do you get?',
    answer:
        '<p><strong>One.</strong> Ever.</p>' +
        '<p>Injection happens once, when the singleton is created. The container resolves the ' +
        'prototype at that moment, produces a fresh instance, injects it, and the singleton ' +
        'holds that same reference for the rest of its life. The prototype scope was honoured ' +
        'exactly once, and the field is effectively a singleton from then on.</p>' +
        '<p>This surprises people because nothing warns them. The code says ' +
        '<code>@Scope("prototype")</code>, the intent is obvious, and the behaviour silently ' +
        'contradicts it.</p>' +
        '<p>Three ways to get what you meant:</p>' +
        '<ul>' +
        '<li><strong><code>ObjectProvider&lt;T&gt;</code></strong> — inject the provider and ' +
        'call <code>getObject()</code> each time you need one. This is the modern answer: it is ' +
        'a plain typed dependency, testable with a lambda, and it also handles the optional and ' +
        'multiple-candidate cases.</li>' +
        '<li><strong>A scoped proxy</strong> — ' +
        '<code>@Scope(value = "prototype", proxyMode = TARGET_CLASS)</code>. The singleton gets ' +
        'a proxy, and every method call on it resolves a fresh target. Transparent at the call ' +
        'site, and surprising when you inspect the object.</li>' +
        '<li><strong>Method injection</strong> with <code>@Lookup</code> — Spring overrides an ' +
        'abstract method to return a new instance per call. It works and it is rarely the ' +
        'clearest option.</li>' +
        '</ul>' +
        '<p>The same reasoning applies to request-scoped beans injected into singletons, where ' +
        'the consequence is worse: without a scoped proxy the singleton captures one request\'s ' +
        'bean and serves it to every later request.</p>',
    referenceLinks: [
        { title: 'Singleton Beans with Prototype-bean Dependencies — Spring Framework Reference', url: 'https://docs.spring.io/spring-framework/reference/core/beans/factory-scopes.html' }
    ],
    tags: ['spring', 'scopes', 'prototype', 'injection'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'bean-lifecycle-callbacks',
    importance: 'must-know',
    subsection: 'beans',
    question: 'What are the initialisation and destruction hooks, and in what order do they run?',
    answer:
        '<p>Three ways to hook each end, and they run in a fixed order.</p>' +
        '<p><strong>After the properties are set:</strong> ' +
        '<code>@PostConstruct</code>, then <code>InitializingBean.afterPropertiesSet()</code>, ' +
        'then the <code>initMethod</code> named on <code>@Bean</code>.</p>' +
        '<p><strong>On shutdown, in mirror order:</strong> <code>@PreDestroy</code>, then ' +
        '<code>DisposableBean.destroy()</code>, then the <code>destroyMethod</code>.</p>' +
        '<p>Prefer the annotations. They are JSR-250 rather than Spring types, so the class does ' +
        'not implement a framework interface, and it can be unit tested and reused without ' +
        'Spring. Note that since Spring 6 and Boot 3 they live in ' +
        '<code>jakarta.annotation</code>, not <code>javax.annotation</code> — that import is one ' +
        'of the things a Boot 2 to 3 migration breaks.</p>' +
        '<p>Three things worth knowing:</p>' +
        '<ul>' +
        '<li><strong>Destruction callbacks never run for prototypes.</strong> The container does ' +
        'not keep the instance, so it cannot destroy it.</li>' +
        '<li><strong><code>@Bean</code> infers a destroy method.</strong> If the type has a ' +
        'public <code>close()</code> or <code>shutdown()</code>, Spring calls it on shutdown ' +
        'without being asked. Usually helpful; set <code>destroyMethod = ""</code> to stop it ' +
        'when the object is not yours to close.</li>' +
        '<li><strong>The bean is not yet proxied during <code>@PostConstruct</code>.</strong> ' +
        'Proxies are applied in the last post-processing step, after initialisation, so calling ' +
        'a <code>@Transactional</code> or <code>@Async</code> method of the same bean from ' +
        '<code>@PostConstruct</code> gets no advice at all.</li>' +
        '</ul>' +
        '<p>For work that needs the whole context ready, use an ' +
        '<code>ApplicationRunner</code>, a <code>CommandLineRunner</code>, or a listener for ' +
        '<code>ApplicationReadyEvent</code> — all of which run after every bean exists, which ' +
        '<code>@PostConstruct</code> does not.</p>',
    referenceLinks: [
        { title: 'Lifecycle Callbacks — Spring Framework Reference', url: 'https://docs.spring.io/spring-framework/reference/core/beans/factory-nature.html' }
    ],
    tags: ['spring', 'lifecycle', 'beans'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'component-vs-bean',
    importance: 'must-know',
    subsection: 'beans',
    question: 'When do you use @Bean instead of @Component?',
    answer:
        '<p><code>@Component</code> is on the class and requires component scanning to find it. ' +
        '<code>@Bean</code> is on a factory method inside a <code>@Configuration</code> class ' +
        'and the method body constructs the object.</p>' +
        '<p><strong>Use <code>@Bean</code> when you do not own the class.</strong> That is the ' +
        'main answer. You cannot annotate <code>ObjectMapper</code>, <code>RestClient</code>, ' +
        '<code>DataSource</code> or anything else from a library, so a factory method is the ' +
        'only route.</p>' +
        '<p>Also use it when construction needs logic — reading configuration, choosing between ' +
        'implementations, building through a builder, registering more than one bean of the same ' +
        'type with different names. And use it when the wiring should be visible in one place ' +
        'rather than distributed across annotations on classes.</p>' +
        '<p><strong>Use <code>@Component</code></strong> for your own classes with no ' +
        'construction logic, which is most of them. The stereotype variants — ' +
        '<code>@Service</code>, <code>@Repository</code>, <code>@Controller</code> — say what ' +
        'the class is for, and <code>@Repository</code> additionally switches on persistence ' +
        'exception translation.</p>' +
        '<p>Two details. The bean name defaults to the method name for <code>@Bean</code> and to ' +
        'the decapitalised class name for <code>@Component</code>, so renaming either renames a ' +
        'bean — which matters if anything references it by name. And a <code>@Bean</code> ' +
        'method\'s parameters are injected, which is the cleanest way to depend on another bean ' +
        'from a factory method.</p>',
    referenceLinks: [
        { title: 'Using the @Bean Annotation — Spring Framework Reference', url: 'https://docs.spring.io/spring-framework/reference/core/beans/java/bean-annotation.html' }
    ],
    tags: ['spring', 'beans', 'configuration'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'configuration-proxybeanmethods',
    importance: 'should-know',
    subsection: 'beans',
    question: 'What does @Configuration do that @Component does not, and what is proxyBeanMethods?',
    answer:
        '<p>A <code>@Configuration</code> class is subclassed by CGLIB at startup, and the ' +
        'subclass intercepts every <code>@Bean</code> method. When one <code>@Bean</code> method ' +
        'calls another, the interception returns <strong>the bean from the container</strong> ' +
        'rather than executing the method again. This is called <em>full mode</em>, and it is ' +
        'what makes inter-bean references behave as singletons.</p>' +
        '<p>With <code>@Component</code>, or with ' +
        '<code>@Configuration(proxyBeanMethods = false)</code> — <em>lite mode</em> — there is ' +
        'no proxy, so a call from one <code>@Bean</code> method to another is an ordinary Java ' +
        'call that <strong>constructs a second instance</strong>. Now two beans hold different ' +
        'objects that were meant to be the same one, and nothing reports it.</p>' +
        '<p>Lite mode exists because the proxying costs startup time and forces the class to be ' +
        'non-final and CGLIB-proxyable. Spring Boot\'s own auto-configuration classes use it ' +
        'throughout, which is part of why Boot starts as fast as it does, and it matters more ' +
        'for a GraalVM native image.</p>' +
        '<p><strong>The rule:</strong> if you set <code>proxyBeanMethods = false</code>, never ' +
        'call one <code>@Bean</code> method from another. Take the dependency as a method ' +
        'parameter instead — Spring injects it, the container supplies the singleton, and the ' +
        'code is correct in both modes.</p>',
    referenceLinks: [
        { title: 'Basic Concepts: @Bean and @Configuration — Spring Framework Reference', url: 'https://docs.spring.io/spring-framework/reference/core/beans/java/basic-concepts.html' }
    ],
    tags: ['spring', 'configuration', 'proxies', 'startup'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: [
        {
            language: 'java',
            title: 'The same call, two different numbers of instances',
            code:
                '@Configuration                       // full mode: proxied\n' +
                'public class FullMode {\n' +
                '    @Bean ObjectMapper mapper() { return new ObjectMapper(); }\n' +
                '\n' +
                '    // The proxy intercepts mapper() and returns the container bean,\n' +
                '    // so both beans share one ObjectMapper.\n' +
                '    @Bean Serializer serializer() { return new Serializer(mapper()); }\n' +
                '}\n' +
                '\n' +
                '@Configuration(proxyBeanMethods = false)   // lite mode: not proxied\n' +
                'public class LiteMode {\n' +
                '    @Bean ObjectMapper mapper() { return new ObjectMapper(); }\n' +
                '\n' +
                '    // A plain Java call. This builds a SECOND ObjectMapper, which is\n' +
                '    // not a bean and never sees any customiser applied to the first.\n' +
                '    @Bean Serializer serializer() { return new Serializer(mapper()); }\n' +
                '}\n' +
                '\n' +
                '@Configuration(proxyBeanMethods = false)   // correct in both modes\n' +
                'public class Parameterised {\n' +
                '    @Bean ObjectMapper mapper() { return new ObjectMapper(); }\n' +
                '\n' +
                '    @Bean Serializer serializer(ObjectMapper mapper) {\n' +
                '        return new Serializer(mapper);\n' +
                '    }\n' +
                '}',
            output: {
                kind: 'trace',
                lines: [
                    'FullMode: the CGLIB subclass intercepts mapper() and returns the singleton.',
                    'One ObjectMapper exists, and Boot customisers have been applied to it.',
                    'LiteMode: mapper() is an ordinary method call and runs the constructor again.',
                    'Two ObjectMappers exist; the serializer holds the one nobody configured.',
                    'Parameterised: the dependency is injected, so there is one instance either way.'
                ],
                explain:
                    '<p>The lite-mode failure is quiet and specific: serialisation works, and it ' +
                    'just ignores whatever module or naming strategy was registered on the real ' +
                    'bean. Taking the dependency as a parameter removes the question entirely, ' +
                    'which is why it is the form to write by default.</p>'
            }
        }
    ]
},

{
    id: 'primary-qualifier-and-naming',
    importance: 'must-know',
    subsection: 'beans',
    question: 'Two beans implement the same interface. How does Spring decide, and how do you tell it?',
    answer:
        '<p>By default it does not decide — it throws ' +
        '<code>NoUniqueBeanDefinitionException</code> at startup and names the candidates. ' +
        'Failing loudly at boot is the right behaviour; picking one arbitrarily would be much ' +
        'worse.</p>' +
        '<p>The resolution order, once more than one candidate exists:</p>' +
        '<ul>' +
        '<li><strong><code>@Primary</code></strong> on one of them — "this is the default ' +
        'unless someone asks otherwise". Use it when there genuinely is a normal choice and the ' +
        'others are special cases.</li>' +
        '<li><strong><code>@Qualifier("name")</code></strong> at the injection point — "I want ' +
        'this one specifically". It wins over <code>@Primary</code>.</li>' +
        '<li><strong>Matching by parameter name.</strong> If the injection point is named the ' +
        'same as a bean, that bean is chosen. This works, and it is fragile: renaming a ' +
        'constructor parameter changes the wiring, and it depends on parameter names surviving ' +
        'compilation.</li>' +
        '<li><strong><code>@Fallback</code></strong>, from Spring 6.2, is the inverse of ' +
        '<code>@Primary</code> — mark a bean as the one to use only when nothing else ' +
        'matches.</li>' +
        '</ul>' +
        '<p>Better than a string qualifier is a <strong>custom qualifier annotation</strong>: ' +
        'define <code>@Fast</code> as an annotation meta-annotated with <code>@Qualifier</code> ' +
        'and use that. It is type-checked, refactorable and discoverable, where a string typo ' +
        'is a startup failure at best.</p>' +
        '<p>Also worth knowing: generics are qualifiers. ' +
        '<code>Repository&lt;Order&gt;</code> and <code>Repository&lt;Customer&gt;</code> are ' +
        'distinguished without any annotation, because Spring resolves generic type arguments ' +
        'when matching.</p>',
    referenceLinks: [
        { title: 'Fine-tuning Annotation-based Autowiring — Spring Framework Reference', url: 'https://docs.spring.io/spring-framework/reference/core/beans/annotation-config/autowired-qualifiers.html' }
    ],
    tags: ['spring', 'injection', 'qualifiers', 'primary'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'conditional-beans',
    importance: 'should-know',
    subsection: 'beans',
    question: 'How do you register a bean only in certain circumstances?',
    answer:
        '<p>Two mechanisms, and they are not the same thing.</p>' +
        '<p><strong><code>@Profile</code></strong> is for environments. ' +
        '<code>@Profile("!prod")</code> or <code>@Profile("test")</code> switches a bean on for ' +
        'a named set of profiles. It is coarse and readable, and it is the right tool for "an ' +
        'in-memory implementation locally and the real one in production".</p>' +
        '<p><strong><code>@Conditional</code></strong> and the Boot family built on it are for ' +
        'everything else, and they are what auto-configuration is made of:</p>' +
        '<ul>' +
        '<li><code>@ConditionalOnClass</code> and <code>@ConditionalOnMissingClass</code> — is ' +
        'this library on the classpath? This is how a starter configures a datasource only when ' +
        'a JDBC driver is present.</li>' +
        '<li><code>@ConditionalOnBean</code> and <code>@ConditionalOnMissingBean</code> — the ' +
        'important one. <code>@ConditionalOnMissingBean</code> is why defining your own ' +
        '<code>ObjectMapper</code> replaces Boot\'s instead of colliding with it: Boot\'s is ' +
        'declared to back off when one already exists.</li>' +
        '<li><code>@ConditionalOnProperty</code> — a feature flag in configuration.</li>' +
        '<li><code>@ConditionalOnWebApplication</code>, <code>@ConditionalOnCloudPlatform</code> ' +
        'and the rest for environment shape.</li>' +
        '</ul>' +
        '<p><strong>Ordering matters and is the usual source of confusion.</strong> ' +
        '<code>@ConditionalOnBean</code> is evaluated against the beans registered <em>so ' +
        'far</em>, so it is reliable only inside auto-configuration, where ' +
        '<code>@AutoConfigureAfter</code> and <code>@AutoConfigureOrder</code> control the ' +
        'sequence and user configuration is always processed first. Using it between two of your ' +
        'own <code>@Configuration</code> classes gives results that depend on scan order.</p>' +
        '<p>When a conditional does not do what you expected, run with ' +
        '<code>--debug</code> and read the condition evaluation report, which lists every ' +
        'positive and negative match with the reason.</p>',
    referenceLinks: [
        { title: 'Condition Annotations — Spring Boot Reference', url: 'https://docs.spring.io/spring-boot/reference/features/developing-auto-configuration.html' }
    ],
    tags: ['spring', 'conditionals', 'profiles', 'auto-configuration'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'lazy-initialisation',
    importance: 'should-know',
    subsection: 'beans',
    question: 'Should you turn on lazy initialisation to speed up startup?',
    answer:
        '<p>Usually not, and the reason is the one thing eager startup is for.</p>' +
        '<p>Spring creates singletons eagerly so that <strong>a broken configuration fails at ' +
        'boot</strong>. A missing bean, an ambiguous injection, an unresolvable placeholder, a ' +
        'datasource that cannot connect — all of these surface before the application accepts ' +
        'traffic, which is exactly when you want to know. Turning on ' +
        '<code>spring.main.lazy-initialization=true</code> defers those failures until the first ' +
        'request that touches the bean, so a deployment goes green and then fails for a user.</p>' +
        '<p>It also moves the cost rather than removing it: the first request that needs a lazy ' +
        'bean pays for constructing it, and in a container that first request may be the ' +
        'readiness probe or a real customer.</p>' +
        '<p><strong>Where it is genuinely useful:</strong> local development, where a fast ' +
        'restart matters more than early failure; and integration tests, where a context often ' +
        'needs only a fraction of the beans it declares. Both are cases where the fail-fast is ' +
        'worth less than the seconds.</p>' +
        '<p><code>@Lazy</code> on a single bean is a different and more defensible thing — for ' +
        'an expensive bean that is rarely used, or to break a circular dependency. Note ' +
        '<code>@Lazy</code> at an <em>injection point</em> injects a proxy that resolves on ' +
        'first use, which is the form that breaks cycles.</p>' +
        '<p>If startup time is the actual problem, the honest fixes are elsewhere: fewer ' +
        'auto-configurations, a narrower component scan, class data sharing, or a native image ' +
        '— all of which reduce the work rather than postponing it.</p>',
    referenceLinks: [],
    tags: ['spring', 'startup', 'lazy', 'fail-fast'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'graceful-shutdown',
    importance: 'good-to-know',
    subsection: 'beans',
    question: 'What happens to in-flight requests when a Spring Boot application shuts down?',
    answer:
        '<p>By default in older configurations, they are cut off. With ' +
        '<code>server.shutdown=graceful</code>, which Boot supports on every embedded ' +
        'container, the sequence becomes:</p>' +
        '<ul>' +
        '<li>The container stops accepting new connections.</li>' +
        '<li>In-flight requests are given a grace period to finish, bounded by ' +
        '<code>spring.lifecycle.timeout-per-shutdown-phase</code> — thirty seconds by ' +
        'default.</li>' +
        '<li>Then the context closes: <code>SmartLifecycle</code> beans stop in phase order, ' +
        'and destruction callbacks run in reverse dependency order, so a service is destroyed ' +
        'before the datasource it uses.</li>' +
        '</ul>' +
        '<p>This only works if the JVM gets a chance to run its shutdown hook, so ' +
        '<code>SIGTERM</code> must reach the Java process. The classic container failure is a ' +
        'shell-form <code>ENTRYPOINT</code>, which runs the JVM as a child of ' +
        '<code>/bin/sh</code> as PID 1: the signal goes to the shell, the JVM never sees it, and ' +
        'Kubernetes eventually sends <code>SIGKILL</code>. Use the exec form.</p>' +
        '<p>The other half is Kubernetes-side and is the part most often missed: an endpoint ' +
        'takes time to be removed from the service, so traffic keeps arriving <em>after</em> ' +
        '<code>SIGTERM</code>. The standard fix is a <code>preStop</code> sleep of a few seconds ' +
        'before the signal, plus a readiness probe on ' +
        '<code>/actuator/health/readiness</code> that starts failing first. Without that, ' +
        'graceful shutdown drains an application that is still being sent new requests.</p>',
    referenceLinks: [
        { title: 'Graceful Shutdown — Spring Boot Reference', url: 'https://docs.spring.io/spring-boot/reference/web/graceful-shutdown.html' }
    ],
    tags: ['spring', 'lifecycle', 'shutdown', 'kubernetes'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

/* ==== Wiring & Circular Dependencies ================================== */

{
    id: 'constructor-vs-field-injection',
    importance: 'must-know',
    subsection: 'wiring',
    question: 'Why is constructor injection preferred over field injection?',
    answer:
        '<p>Five reasons, and the first two are the ones that change how code behaves rather ' +
        'than how it reads.</p>' +
        '<ul>' +
        '<li><strong>The fields can be <code>final</code>.</strong> A field-injected dependency ' +
        'cannot be, because it is assigned by reflection after construction. Final fields mean ' +
        'the object is immutable once built and safely publishable to other threads without ' +
        'synchronisation — which matters, because every singleton bean is shared across request ' +
        'threads.</li>' +
        '<li><strong>The object is never half-built.</strong> With constructor injection an ' +
        'instance either exists fully wired or does not exist. Field injection has a window ' +
        'where the object exists with null dependencies, and anything running in that window — ' +
        'a constructor body, an <code>Aware</code> callback — sees nulls.</li>' +
        '<li><strong>It is testable without a framework.</strong> ' +
        '<code>new OrderService(repo, clock)</code> in a plain JUnit test, no runner, no ' +
        'reflection utility, no container. Field injection forces either a Spring test context ' +
        'or <code>ReflectionTestUtils</code>, and both are slower and less clear.</li>' +
        '<li><strong>Missing dependencies fail at startup</strong>, with a message naming the ' +
        'bean and the unsatisfied parameter.</li>' +
        '<li><strong>A long parameter list is visible pressure.</strong> Eight constructor ' +
        'arguments look wrong; eight <code>@Autowired</code> fields look tidy. The class is ' +
        'doing too much either way, and only one of the two tells you.</li>' +
        '</ul>' +
        '<p>Since Spring 4.3, <code>@Autowired</code> is not needed on a sole constructor — the ' +
        'container uses it automatically, so the class carries no Spring annotation at all on ' +
        'its wiring.</p>' +
        '<p>Setter injection still has a narrow use: a genuinely optional dependency that can be ' +
        'reconfigured after construction. That is rare, and it is not a reason to reach for ' +
        'field injection, which has none of setter injection\'s advantages and all of its ' +
        'drawbacks.</p>',
    referenceLinks: [
        { title: 'Constructor-based Dependency Injection — Spring Framework Reference', url: 'https://docs.spring.io/spring-framework/reference/core/beans/dependencies/factory-collaborators.html' }
    ],
    tags: ['spring', 'injection', 'constructor', 'testing'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'circular-dependency',
    importance: 'must-know',
    subsection: 'wiring',
    question: 'What happens on a circular dependency, and how do you fix it properly?',
    answer:
        '<p>With <strong>constructor injection on both sides, it cannot be resolved</strong>: A ' +
        'cannot be constructed without B and B cannot be constructed without A. Spring detects ' +
        'the cycle and fails at startup with a <code>BeanCurrentlyInCreationException</code> ' +
        'and a printed chain showing the loop.</p>' +
        '<p>With <strong>field or setter injection</strong> it historically resolved, via a ' +
        'three-level cache of early bean references: A is constructed, exposed while still ' +
        'incomplete, injected into B, and B is then injected back into A. Since <strong>Spring ' +
        'Boot 2.6 this is disabled by default</strong> and a cycle fails at startup unless ' +
        '<code>spring.main.allow-circular-references=true</code> is set. That change was ' +
        'deliberate: the mechanism worked and it hid a design problem, and it interacts badly ' +
        'with proxying — a bean injected early may be the raw instance rather than the proxy, so ' +
        '<code>@Transactional</code> silently does nothing.</p>' +
        '<p><strong>The workarounds, worst to best:</strong></p>' +
        '<ul>' +
        '<li>Setting the flag back to true. This restores the old behaviour and the old ' +
        'problems.</li>' +
        '<li><code>@Lazy</code> on one injection point. Spring injects a proxy that resolves on ' +
        'first use, which breaks the construction cycle. It works, and it leaves the cycle in ' +
        'place.</li>' +
        '<li>An <code>ApplicationEvent</code>, so one side no longer references the other.</li>' +
        '<li><strong>Extract the shared behaviour into a third bean</strong> that both depend ' +
        'on. This is nearly always the right answer.</li>' +
        '</ul>' +
        '<p>The point to make in an interview is that a circular dependency is a design signal, ' +
        'not a configuration problem. Two classes that each need the other usually have one ' +
        'responsibility spread across both, or a layering violation where a lower layer is ' +
        'calling back up into a higher one.</p>',
    referenceLinks: [
        { title: 'Circular Dependencies — Spring Framework Reference', url: 'https://docs.spring.io/spring-framework/reference/core/beans/dependencies/factory-collaborators.html' }
    ],
    tags: ['spring', 'injection', 'circular-dependency', 'design'],
    images: [],
    hasDiagram: true,
    diagramType: 'flowchart',
    diagramConfig: {
        title: 'A cycle, and the three ways out',
        nodes: [
            { id: 'a',     label: 'OrderService needs PricingService', kind: 'trap' },
            { id: 'b',     label: 'PricingService needs OrderService', kind: 'trap' },
            { id: 'lazy',  label: '@Lazy proxy on one side',           kind: 'step' },
            { id: 'event', label: 'publish an event instead',          kind: 'step' },
            { id: 'third', label: 'extract a third bean both use',     kind: 'fix' }
        ],
        edges: [
            { from: 'a', to: 'b',     label: 'constructor' },
            { from: 'b', to: 'a',     label: 'constructor' },
            { from: 'a', to: 'lazy' },
            { from: 'a', to: 'event' },
            { from: 'a', to: 'third' }
        ]
    },
    codeSnippets: []
},

{
    id: 'injecting-a-collection-of-beans',
    importance: 'should-know',
    subsection: 'wiring',
    question: 'What happens when you inject a List or a Map of an interface type?',
    answer:
        '<p>Spring injects <strong>every bean of that type</strong>. A ' +
        '<code>List&lt;Validator&gt;</code> parameter receives all the <code>Validator</code> ' +
        'beans; a <code>Map&lt;String, Validator&gt;</code> receives them keyed by bean name. ' +
        'No annotation is needed and no registry has to be maintained.</p>' +
        '<p>This is the cleanest strategy-pattern wiring Spring offers. Adding a new ' +
        'implementation means adding one class — nothing else changes, no switch statement is ' +
        'edited, no list is appended to. Combined with a <code>Map</code> keyed by name, a ' +
        'runtime lookup by key becomes a map access with no <code>getBean()</code> and no ' +
        'container coupling.</p>' +
        '<p>Details that matter:</p>' +
        '<ul>' +
        '<li><strong>Order is not guaranteed</strong> unless you ask for it. Implement ' +
        '<code>Ordered</code> or annotate with <code>@Order</code>, and Spring sorts the ' +
        'injected list. Relying on the default order works until a class is renamed.</li>' +
        '<li><strong>An empty list is a startup failure by default.</strong> If no bean of the ' +
        'type exists, injection fails as unsatisfied. Use ' +
        '<code>ObjectProvider&lt;Validator&gt;</code> and <code>stream()</code>, or mark the ' +
        'dependency <code>required = false</code>, when zero is legitimate.</li>' +
        '<li><strong>Generics are respected.</strong> <code>List&lt;Handler&lt;Order&gt;&gt;</code> ' +
        'collects only the handlers parameterised with <code>Order</code>.</li>' +
        '<li>The map key is the <em>bean name</em>, so it changes if a method or class is ' +
        'renamed. When the key is meaningful — a payment method, a document type — give each ' +
        'bean an explicit name, or have the interface expose a <code>key()</code> method and ' +
        'build the map yourself from the injected list.</li>' +
        '</ul>',
    referenceLinks: [],
    tags: ['spring', 'injection', 'strategy-pattern', 'collections'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: [
        {
            language: 'java',
            title: 'A strategy registry with no registry',
            code:
                '@Service\n' +
                'public class PaymentRouter {\n' +
                '\n' +
                '    private final Map<String, PaymentHandler> byMethod;\n' +
                '\n' +
                '    // Spring supplies every PaymentHandler bean, keyed by bean name.\n' +
                '    // Adding a handler means adding one class and nothing else.\n' +
                '    PaymentRouter(Map<String, PaymentHandler> byMethod) {\n' +
                '        this.byMethod = byMethod;\n' +
                '    }\n' +
                '\n' +
                '    public Receipt pay(String method, Money amount) {\n' +
                '        PaymentHandler handler = byMethod.get(method);\n' +
                '        if (handler == null) {\n' +
                '            throw new UnsupportedPaymentMethod(method, byMethod.keySet());\n' +
                '        }\n' +
                '        return handler.pay(amount);\n' +
                '    }\n' +
                '}\n' +
                '\n' +
                '@Component("card")     // explicit name: the key is domain vocabulary,\n' +
                'class CardHandler implements PaymentHandler { }\n' +
                '\n' +
                '@Component("transfer") // not an accident of the class name.\n' +
                'class TransferHandler implements PaymentHandler { }',
            output: {
                kind: 'trace',
                lines: [
                    'Spring finds every bean assignable to PaymentHandler.',
                    'It builds a Map keyed by bean name and injects it into the constructor.',
                    'The router does a map lookup; no getBean and no ApplicationContext involved.',
                    'The unknown-method error lists the keys that do exist, which is the useful message.',
                    'A new handler is one new class - the router never changes.'
                ],
                explain:
                    '<p>The bean names are given explicitly because the key is domain ' +
                    'vocabulary that a request body will contain. Leaving them to default ' +
                    'would make the wire format depend on a class name, and renaming the class ' +
                    'would break the API.</p>'
            }
        }
    ]
},

{
    id: 'objectprovider',
    importance: 'should-know',
    subsection: 'wiring',
    question: 'What is ObjectProvider for?',
    answer:
        '<p>It is a dependency you resolve yourself, later, with the awkward cases handled. ' +
        'Inject <code>ObjectProvider&lt;T&gt;</code> and it gives you:</p>' +
        '<ul>' +
        '<li><strong>Optional dependencies.</strong> <code>getIfAvailable()</code> returns null ' +
        'rather than failing startup, and <code>getIfAvailable(Supplier)</code> supplies a ' +
        'default. This is cleaner than <code>@Autowired(required = false)</code>, which leaves ' +
        'a field that may be null with nothing marking it as such.</li>' +
        '<li><strong>Prototype and request-scoped beans.</strong> <code>getObject()</code> ' +
        'resolves on each call, which is the fix for a prototype injected into a ' +
        'singleton.</li>' +
        '<li><strong>Zero-to-many candidates.</strong> <code>stream()</code> and ' +
        '<code>orderedStream()</code> give all matching beans without failing when there are ' +
        'none.</li>' +
        '<li><strong>Deferred resolution</strong>, which can break a construction cycle without ' +
        'a <code>@Lazy</code> proxy.</li>' +
        '<li><strong><code>getIfUnique()</code></strong> — a value only when exactly one ' +
        'candidate exists, instead of an exception.</li>' +
        '</ul>' +
        '<p>Its advantage over injecting the <code>ApplicationContext</code> is that it stays a ' +
        'typed dependency: the signature still says what the class needs, and a unit test can ' +
        'supply one in a line without a container.</p>' +
        '<p>The cost is that resolution moves from startup to first use, so a missing bean ' +
        'becomes a runtime condition. Use it where that is genuinely what you mean — an optional ' +
        'collaborator, a per-use instance — and not as a way to avoid thinking about the wiring.</p>',
    referenceLinks: [
        { title: 'ObjectProvider — Spring Framework API', url: 'https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/beans/factory/ObjectProvider.html' }
    ],
    tags: ['spring', 'injection', 'objectprovider', 'optional'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'value-vs-configuration-properties',
    importance: 'should-know',
    subsection: 'wiring',
    question: '@Value or @ConfigurationProperties — which do you reach for?',
    answer:
        '<p><code>@ConfigurationProperties</code> for anything that is a group, ' +
        '<code>@Value</code> for the occasional single value.</p>' +
        '<p><code>@ConfigurationProperties</code> binds a whole prefix onto a typed object, and ' +
        'that buys several things at once:</p>' +
        '<ul>' +
        '<li><strong>Relaxed binding</strong> — <code>max-pool-size</code>, ' +
        '<code>maxPoolSize</code> and <code>MAX_POOL_SIZE</code> all bind to the same property, ' +
        'which is what makes environment-variable overrides work in a container. ' +
        '<code>@Value</code> requires the exact key.</li>' +
        '<li><strong>Validation.</strong> Add <code>@Validated</code> and use ' +
        '<code>@NotBlank</code>, <code>@Min</code> and the rest, and a misconfigured deployment ' +
        'fails at startup with a message naming the property.</li>' +
        '<li><strong>Nested types, lists, maps and durations</strong> bind naturally. ' +
        '<code>Duration</code> accepts <code>30s</code> and <code>5m</code>; ' +
        '<code>DataSize</code> accepts <code>10MB</code>.</li>' +
        '<li><strong>IDE completion</strong>, from the metadata generated by the annotation ' +
        'processor.</li>' +
        '<li><strong>It is one object to inject and to construct in a test</strong>, rather than ' +
        'six fields to set by reflection.</li>' +
        '</ul>' +
        '<p>Prefer the constructor-bound form — a record or a class with a single constructor, ' +
        'registered with <code>@EnableConfigurationProperties</code> — so the properties object ' +
        'is immutable. The setter-based form leaves configuration mutable at runtime for no ' +
        'benefit.</p>' +
        '<p><code>@Value</code> remains fine for one-off values and for SpEL expressions, which ' +
        '<code>@ConfigurationProperties</code> does not evaluate. Its two sharp edges: it does ' +
        'not work in a <code>@PostConstruct</code> on a field that has not been injected yet, ' +
        'and a typo in the key produces a startup failure only when there is no default — ' +
        '<code>${missing.key:}</code> silently binds an empty string.</p>',
    referenceLinks: [
        { title: 'Type-safe Configuration Properties — Spring Boot Reference', url: 'https://docs.spring.io/spring-boot/reference/features/external-config.html' }
    ],
    tags: ['spring', 'configuration', 'properties', 'validation'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: [
        {
            language: 'java',
            title: 'A validated, immutable properties record',
            code:
                '@Validated\n' +
                '@ConfigurationProperties(prefix = "payments.provider")\n' +
                'public record ProviderProperties(\n' +
                '        @NotBlank String baseUrl,\n' +
                '        @NotBlank String apiKey,\n' +
                '        @DefaultValue("5s")  Duration connectTimeout,\n' +
                '        @DefaultValue("30s") Duration readTimeout,\n' +
                '        @Min(1) @Max(10)     int maxRetries) {\n' +
                '}\n' +
                '\n' +
                '// Registered once, then injected anywhere as an ordinary dependency.\n' +
                '@Configuration\n' +
                '@EnableConfigurationProperties(ProviderProperties.class)\n' +
                'class PaymentsConfig {\n' +
                '\n' +
                '    @Bean\n' +
                '    PaymentClient paymentClient(ProviderProperties props) {\n' +
                '        return PaymentClient.builder()\n' +
                '                .baseUrl(props.baseUrl())\n' +
                '                .timeout(props.connectTimeout(), props.readTimeout())\n' +
                '                .build();\n' +
                '    }\n' +
                '}',
            output: {
                kind: 'trace',
                lines: [
                    'Boot binds every payments.provider.* key onto the record at startup.',
                    'Relaxed binding accepts PAYMENTS_PROVIDER_BASEURL from the environment.',
                    'Durations accept 5s and 30s rather than a bare number of milliseconds.',
                    'Validation runs during binding, so a blank apiKey fails the boot, not a request.',
                    'A unit test constructs the record directly - no context, no property file.'
                ],
                explain:
                    '<p>The equivalent as five <code>@Value</code> fields has no validation, no ' +
                    'duration parsing, no environment-variable spelling, and cannot be ' +
                    'constructed in a test without reflection.</p>'
            }
        }
    ]
},

{
    id: 'self-injection-and-proxy',
    importance: 'good-to-know',
    subsection: 'wiring',
    question: 'Can a bean inject itself, and why would you want it to?',
    answer:
        '<p>It can, and Spring supports it explicitly — self-injection is resolved as a last ' +
        'resort, after every other candidate has been considered.</p>' +
        '<p>The reason to want it is the <strong>self-invocation problem</strong>. Because ' +
        'annotations like <code>@Transactional</code>, <code>@Async</code> and ' +
        '<code>@Cacheable</code> are implemented by a proxy that wraps the bean, a call from one ' +
        'method of a class to another method of the same class goes straight to the target ' +
        'instance and never crosses the proxy. The annotation is simply inert — nothing throws ' +
        'and nothing logs.</p>' +
        '<p>Injecting the bean into itself gives you a reference to the <em>proxy</em>, so ' +
        '<code>self.persist(order)</code> does cross the boundary and the advice runs. It needs ' +
        '<code>@Lazy</code> on the injection point in most cases, since the bean cannot be fully ' +
        'constructed while it is being constructed.</p>' +
        '<p><strong>It works and it is a workaround.</strong> A field called <code>self</code> ' +
        'is a puzzle for the next reader, and it is easy to use inconsistently. Better options, ' +
        'in order:</p>' +
        '<ul>' +
        '<li><strong>Move the annotated method to another bean.</strong> The call then crosses a ' +
        'proxy for the ordinary reason, and the transactional boundary is where a reader would ' +
        'look for it.</li>' +
        '<li><strong>Use <code>TransactionTemplate</code></strong> and open the transaction ' +
        'explicitly, which removes the proxy from the question entirely.</li>' +
        '<li><strong><code>AopContext.currentProxy()</code></strong> — works, requires ' +
        '<code>exposeProxy = true</code>, and couples the class to Spring AOP.</li>' +
        '</ul>' +
        '<p>The deeper point: if a method needs its own class\'s transactional behaviour, the ' +
        'transactional boundary probably belongs to a collaborator that does not exist yet.</p>',
    referenceLinks: [],
    tags: ['spring', 'proxies', 'self-invocation', 'transactions'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'optional-dependencies',
    importance: 'good-to-know',
    subsection: 'wiring',
    question: 'How do you declare a dependency that might not be there?',
    answer:
        '<p>Four ways, in rough order of preference.</p>' +
        '<ul>' +
        '<li><strong><code>ObjectProvider&lt;T&gt;</code></strong> with ' +
        '<code>getIfAvailable()</code> or <code>getIfAvailable(supplier)</code>. The intent is ' +
        'in the type, so a reader and a test both see it.</li>' +
        '<li><strong><code>Optional&lt;T&gt;</code></strong> as the parameter type. Spring ' +
        'understands it and injects an empty <code>Optional</code> when no bean matches. This is ' +
        'the one exception to the general rule against <code>Optional</code> parameters, because ' +
        'here the framework is the caller.</li>' +
        '<li><strong>A default bean with <code>@ConditionalOnMissingBean</code></strong>, so ' +
        'the dependency is never absent — the consumer takes an ordinary required dependency and ' +
        'the configuration decides which implementation it gets. Usually the cleanest design.</li>' +
        '<li><strong><code>@Autowired(required = false)</code></strong>. It works, and it leaves ' +
        'a field that is sometimes null with nothing in the type saying so. Every use site now ' +
        'needs a null check that nothing enforces.</li>' +
        '</ul>' +
        '<p>The commonest real case is a bean that only exists in some profiles — a metrics ' +
        'exporter, a feature-flag client, a tracing hook. For those the third option is usually ' +
        'better than the first two: supply a no-op implementation rather than making every ' +
        'caller handle absence. A <code>NoOpAuditLog</code> that does nothing is simpler than ' +
        'fifteen null checks, and it is the null object pattern earning its keep.</p>',
    referenceLinks: [],
    tags: ['spring', 'injection', 'optional', 'null-object'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'bean-definition-overriding',
    importance: 'good-to-know',
    subsection: 'wiring',
    question: 'What happens if two configurations define a bean with the same name?',
    answer:
        '<p>Since Spring Boot 2.1 it is a <strong>startup failure</strong>: ' +
        '<code>BeanDefinitionOverrideException</code>, naming both definitions. Before that the ' +
        'second silently won, which meant a library could replace one of your beans and nothing ' +
        'would say so.</p>' +
        '<p><code>spring.main.allow-bean-definition-overriding=true</code> restores the old ' +
        'behaviour. It is occasionally necessary during a migration and it is not a fix — it ' +
        'reintroduces a class of bug where the winning definition depends on scan and ' +
        'auto-configuration order, which is not something you control.</p>' +
        '<p>The right ways to replace a bean:</p>' +
        '<ul>' +
        '<li><strong>Rely on <code>@ConditionalOnMissingBean</code>.</strong> Almost every ' +
        'bean Boot auto-configures is declared this way, so simply defining your own of the ' +
        'same type makes Boot back off. No override and no flag.</li>' +
        '<li><strong><code>@Primary</code></strong> when both should exist and one is the ' +
        'default.</li>' +
        '<li><strong>Different names</strong> plus a <code>@Qualifier</code> at the injection ' +
        'point, when both are genuinely wanted.</li>' +
        '<li><strong>In tests, <code>@MockitoBean</code></strong>, which is designed to replace ' +
        'a bean in the test context and does not go through the overriding mechanism at all.</li>' +
        '</ul>' +
        '<p>Worth knowing that this only catches <em>name</em> collisions. Two beans of the same ' +
        '<em>type</em> under different names are legal, and the failure surfaces later and ' +
        'differently, as <code>NoUniqueBeanDefinitionException</code> at the injection point.</p>',
    referenceLinks: [],
    tags: ['spring', 'beans', 'overriding', 'startup'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'spel-in-value',
    importance: 'good-to-know',
    subsection: 'wiring',
    question: 'What is the difference between ${...} and #{...} in @Value?',
    answer:
        '<p><code>${...}</code> is a <strong>property placeholder</strong>, resolved by ' +
        '<code>PropertySourcesPlaceholderConfigurer</code> against the <code>Environment</code>. ' +
        '<code>#{...}</code> is a <strong>SpEL expression</strong>, evaluated by the expression ' +
        'parser against the bean factory as its root context. They are different mechanisms ' +
        'that happen to share a syntax family.</p>' +
        '<p>Placeholders are resolved <em>first</em>, which is why they can be nested inside an ' +
        'expression: <code>#{\'${app.name}\'.toUpperCase()}</code> works, and the reverse ' +
        'does not.</p>' +
        '<p>What SpEL adds: a default with fallback logic, arithmetic, calling a method on ' +
        'another bean (<code>#{clockConfig.zone()}</code>), collection projection, and reading ' +
        'system properties. What it costs is that the expression is a string — no compiler ' +
        'checks it, no IDE refactors it, and a mistake is a startup failure with a parse error ' +
        'that points at a character offset.</p>' +
        '<p><strong>Keep SpEL to a minimum.</strong> Logic in a <code>@Value</code> string is ' +
        'logic that cannot be tested, cannot be stepped through and does not appear in a call ' +
        'graph. A <code>@Bean</code> method that computes the same thing in Java is longer and ' +
        'better in every other respect.</p>' +
        '<p>The security note worth carrying: SpEL is a full expression language with access to ' +
        'the bean factory, so an expression built from user input is remote code execution. ' +
        'Several published Spring CVEs are exactly this. Never build a SpEL string from a ' +
        'request, and be careful with <code>@PreAuthorize</code> expressions that interpolate ' +
        'anything.</p>',
    referenceLinks: [
        { title: 'Spring Expression Language — Spring Framework Reference', url: 'https://docs.spring.io/spring-framework/reference/core/expressions.html' }
    ],
    tags: ['spring', 'spel', 'configuration', 'security'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
}

    ]
};
