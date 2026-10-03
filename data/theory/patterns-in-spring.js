/* ==========================================================================
   data/theory/patterns-in-spring.js — module 30 in the reading path

   "Which design patterns does Spring use?" is one of the two or three most
   asked questions in a Spring interview, and the standard answer — singleton
   and factory — is both shallow and, in the singleton case, wrong.

   Nine chapters. Eight are one pattern each, tied to a class the reader has
   already met in the container and AOP modules, so the answer is grounded in
   something rather than recited. The ninth is how to actually deliver the
   answer, because the question rewards structure over enumeration and most
   candidates enumerate.

   The module sits at 30 rather than with the rest of the craft track for the
   reason section 5.8 gives: it cannot be read before the container and the
   proxies exist, and everything after it reads better once it has.
   ========================================================================== */

const patternsInSpringModule = {
    id: 'patterns-in-spring',
    trackId: 'craft',
    order: 30,
    title: 'The Patterns Spring Uses',
    tagline: 'A stock question with a better answer than "singleton and factory".',
    estimatedMinutes: 35,
    prerequisites: ['patterns-that-get-asked', 'aop-and-proxies'],
    docHub: { title: 'Spring Framework Reference — Core', url: 'https://docs.spring.io/spring-framework/reference/core.html' },

    chapters: [
        {
            id: 'dependency-injection-as-a-pattern',
            title: 'Dependency Injection Is the Whole Framework',
            importance: 'must-know',
            summary: 'Everything else Spring does is built on one move: something other than the class decides what the class gets. Naming that first frames every other pattern as a consequence.',
            interviewAngle: 'Opening with DI rather than with singleton signals that you understand the framework as a design rather than as a bag of annotations.',
            buildsOn: [],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>Spring is an inversion-of-control container, and every pattern in this module exists downstream of that. Because the container constructs your objects, it can hand you a proxy instead of the real thing — that is AOP, transactions, caching and security. Because it constructs them, it can decide there is one of them — that is scope. Because it knows every bean of a type, it can inject the whole set — that is strategy without a registry.</p><p>So the useful framing is not a list. It is: <strong>one pattern is load-bearing and the rest are what became possible once it was in place.</strong></p>'
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'What the container removes',
                    code: '// Without a container: the class chooses its own collaborators, so it\n// is coupled to all of them and none can be substituted.\nclass OrderService {\n    private final PaymentGateway gateway = new StripeGateway(API_KEY);\n    private final OrderRepository repo   = new JpaOrderRepository(emf);\n}\n\n// With one: the class DECLARES what it needs and receives it. It can\n// now be tested with fakes, proxied for transactions, and reconfigured\n// per environment -- none of which it knows about.\n@Service\nclass OrderService {\n    private final PaymentGateway gateway;\n    private final OrderRepository repo;\n\n    OrderService(PaymentGateway gateway, OrderRepository repo) {\n        this.gateway = gateway;\n        this.repo    = repo;\n    }\n}',
                    notes: '<p>Constructor injection is what makes the second version proxyable, testable and final-field-safe at once. Field injection with <code>@Autowired</code> gets you the container but gives up the ability to construct the object in a test without reflection — which is why it is discouraged in current Spring documentation rather than merely disliked.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The opening sentence to have ready: <em>"The one that matters is dependency injection — inversion of control. Everything else Spring does with patterns is possible because the container, not my class, decides what my class gets."</em> Then go to proxy, because proxy is where the interesting follow-ups are.</p>'
                }
            ],
            docs: [
                { title: 'The IoC Container', url: 'https://docs.spring.io/spring-framework/reference/core/beans/introduction.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-core', questionId: 'what-inversion-of-control-buys' },
                { topicId: 'spring-core', questionId: 'constructor-vs-field-injection' }
            ]
        },

        {
            id: 'factory-in-beanfactory',
            title: 'Factory: BeanFactory and FactoryBean',
            importance: 'should-know',
            summary: 'The container is a factory, and FactoryBean is the hook for a bean whose construction is too complicated to express as a constructor call.',
            interviewAngle: 'BeanFactory versus FactoryBean is a naming trap that gets asked on purpose. They are unrelated and the similarity is an accident of English.',
            buildsOn: ['dependency-injection-as-a-pattern'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'Two names one letter apart and nothing else',
                    left: 'BeanFactory',
                    right: 'FactoryBean',
                    rows: [
                        { aspect: 'What it is', left: 'The container itself — the root interface every context implements', right: 'A <strong>bean you write</strong> that produces another bean' },
                        { aspect: 'Who implements it', left: 'Spring', right: 'You' },
                        { aspect: 'What getBean("x") returns', left: 'The bean named x', right: 'For a FactoryBean named x, the <em>product</em>. Use <code>&amp;x</code> to get the factory itself.' },
                        { aspect: 'When you meet it', left: 'Constantly, indirectly', right: 'Rarely — <code>SqlSessionFactoryBean</code>, <code>LocalContainerEntityManagerFactoryBean</code>' },
                        { aspect: 'Modern alternative', left: '—', right: 'An <code>@Bean</code> method. Almost always simpler, and the reason FactoryBean is now unusual in application code.' }
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The same job, twice',
                    code: '// FactoryBean: the older hook. Still what several Spring integrations\n// use, because it can also report the product type before creating it.\nclass TenantAwareDataSourceFactory implements FactoryBean<DataSource> {\n    public DataSource getObject()   { return build(); }\n    public Class<?>   getObjectType() { return DataSource.class; }\n    public boolean    isSingleton()  { return true; }\n}\n\n// @Bean: the same result, four lines, and it is a normal method you can\n// read. This is what to write today.\n@Configuration\nclass DataSourceConfig {\n    @Bean\n    DataSource dataSource(TenantProperties props) {\n        return build(props);\n    }\n}',
                    notes: '<p>The one thing <code>@Bean</code> cannot easily do is report the product type <em>without</em> constructing the product, which matters when other beans need to be wired by type before this one is ready. That is the remaining reason integration libraries still ship <code>FactoryBean</code> implementations.</p>'
                }
            ],
            docs: [
                { title: 'Customizing instantiation logic with a FactoryBean', url: 'https://docs.spring.io/spring-framework/reference/core/beans/factory-extension.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-core', questionId: 'beanfactory-vs-applicationcontext' },
                { topicId: 'spring-core', questionId: 'component-vs-bean' }
            ]
        },

        {
            id: 'singleton-scope-is-not-the-singleton-pattern',
            title: 'Singleton Scope Is Not the Singleton Pattern',
            importance: 'must-know',
            summary: 'The pattern enforces one instance from inside the class and exposes it globally. The scope is a container policy, per context, with no global access point at all.',
            interviewAngle: 'The single most common wrong answer to "which patterns does Spring use". Correcting it precisely — and volunteering that a second context means a second instance — is a clear depth signal.',
            buildsOn: ['factory-in-beanfactory'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>The Gang of Four singleton has two properties: exactly one instance, and a static access point through which anybody can reach it. The second property is what makes it a design smell — it is global mutable state, undeclared by every consumer.</p><p>Spring\'s singleton scope has the first property, <em>scoped to one <code>ApplicationContext</code></em>, and deliberately not the second. Nothing calls <code>OrderService.getInstance()</code>; the bean arrives through a constructor. That is why the two things are not comparable even though they share a word — and why two contexts in one JVM produce two instances, which the pattern by definition cannot.</p>'
                },
                {
                    type: 'table',
                    title: 'What "singleton" costs you if you forget which one you meant',
                    headers: ['Situation', 'Consequence'],
                    rows: [
                        ['Two <code>ApplicationContext</code>s in one JVM', 'Two instances of every singleton bean. Common in tests, and the reason context caching exists.'],
                        ['Mutable instance field on a singleton bean', 'Shared across every request thread. This is the actual thread-safety bug the scope causes.'],
                        ['A prototype bean injected into a singleton', 'Injected <strong>once</strong>. The prototype scope does not survive the wiring — <code>ObjectProvider</code> is the fix.'],
                        ['A request-scoped bean injected into a singleton', 'A scoped proxy is created for you, which resolves per call. It works, and it surprises people.']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>The practical consequence of singleton scope is that a controller or service field is shared by every concurrent request.</strong> A <code>SimpleDateFormat</code> field, a <code>StringBuilder</code> accumulated across calls, a "current user" set at the top of a method — each is a data race that only appears under load. Beans are stateless by convention precisely because the scope makes any state shared, and that is a much more useful thing to say about singleton scope than reciting its definition.</p>'
                }
            ],
            docs: [
                { title: 'The Singleton Scope', url: 'https://docs.spring.io/spring-framework/reference/core/beans/factory-scopes.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'design-patterns', questionId: 'singleton-and-spring' },
                { topicId: 'spring-core', questionId: 'prototype-in-a-singleton' }
            ]
        },

        {
            id: 'template-method-in-the-templates',
            title: 'Template Method: Everything Called *Template',
            importance: 'should-know',
            summary: 'JdbcTemplate, RestTemplate, TransactionTemplate, KafkaTemplate, RedisTemplate. Each fixes a sequence — acquire, execute, translate, release — and lets you supply the middle.',
            interviewAngle: 'Easy marks, because the class names are literal. The depth is in naming the invariant each template protects rather than just listing them.',
            buildsOn: ['singleton-scope-is-not-the-singleton-pattern'],
            blocks: [
                {
                    type: 'table',
                    title: 'What each template guarantees, which is the part worth saying',
                    headers: ['Template', 'The fixed sequence', 'The invariant it protects'],
                    rows: [
                        ['<code>JdbcTemplate</code>', 'Get connection → execute → map → <strong>translate exception</strong> → close', 'Resources are released on every path, and <code>SQLException</code> becomes <code>DataAccessException</code>'],
                        ['<code>TransactionTemplate</code>', 'Begin → run → commit, or roll back on a runtime exception', 'A transaction is never left open; the rollback rules are applied identically'],
                        ['<code>RestTemplate</code>', 'Build request → send → check status → convert body', 'Message conversion and error handling happen the same way for every call'],
                        ['<code>KafkaTemplate</code>', 'Serialise → partition → send → callback', 'Producer configuration and serialisation are not repeated per call site'],
                        ['<code>RedisTemplate</code>', 'Obtain connection → serialise → command → release', 'Connections return to the pool even when a command throws']
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>Classical template method varies its steps by subclassing. Spring\'s templates vary them by <em>callback</em> — you pass a <code>RowMapper</code> or a <code>TransactionCallback</code> in — which is the same idea with composition instead of inheritance, and it is why you never subclass <code>JdbcTemplate</code>. Since lambdas, the callback form is barely distinguishable from an ordinary argument, which is a good illustration of a pattern dissolving into the language.</p>'
                },
                {
                    type: 'tip',
                    html: '<p><code>TransactionTemplate</code> is the one to name if you want to show range, because it is the answer to a different question too: <em>"how would you scope a transaction to less than a whole method?"</em> Programmatic transaction management is the escape hatch when <code>@Transactional</code>\'s method granularity is wrong — a long method with one short critical section, or a loop where each iteration must commit independently.</p>'
                }
            ],
            docs: [
                { title: 'Using JdbcTemplate', url: 'https://docs.spring.io/spring-framework/reference/data-access/jdbc/core.html', kind: 'guide' },
                { title: 'Programmatic Transaction Management', url: 'https://docs.spring.io/spring-framework/reference/data-access/transaction/programmatic.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'design-patterns', questionId: 'patterns-spring-uses' },
                { topicId: 'transactions', questionId: 'programmatic-transactions' }
            ]
        },

        {
            id: 'proxy-in-aop',
            title: 'Proxy: The One That Explains the Bugs',
            importance: 'must-know',
            summary: 'Every annotation that changes behaviour without changing the method body is a proxy. This is the pattern to spend your answer on, because it is the one with consequences.',
            interviewAngle: 'Going from "Spring uses the proxy pattern" straight to "which is why @Transactional on a self-invoked method does nothing" is the move that turns a recital into a demonstration.',
            buildsOn: ['template-method-in-the-templates'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The bug the pattern predicts',
                    code: '@Service\nclass ReportService {\n\n    public void runAll(List<Long> ids) {\n        for (Long id : ids) {\n            generate(id);      // <-- SELF-INVOCATION. Plain `this` call.\n        }                      //     The proxy is not involved, so there\n    }                          //     is no transaction and no retry.\n\n    @Transactional\n    @Retryable\n    public void generate(Long id) { ... }\n}\n\n// Three fixes, in order of preference.\n// 1. Move generate() to another bean. The call then crosses the proxy.\n// 2. Inject ObjectProvider<ReportService> and call through it.\n// 3. AopContext.currentProxy() -- works, requires exposeProxy=true, and\n//    is a smell that says the class has two responsibilities.',
                    notes: '<p>The reason "move it to another bean" is first is that it is usually the correct design change anyway: a method that needs its own transaction is doing a unit of work, and a unit of work is a collaborator. The other two fixes make the annotation work while leaving the structural problem in place.</p>'
                },
                {
                    type: 'types',
                    title: 'Everything in Spring that is a proxy',
                    items: [
                        { name: '@Transactional', html: '<p>Begin and commit around the call, with rollback rules on the way out.</p>' },
                        { name: '@Cacheable, @CacheEvict', html: '<p>Consult the cache before calling; store after. A self-invoked <code>@Cacheable</code> method silently never caches.</p>' },
                        { name: '@Async', html: '<p>Submit to an executor and return immediately — which is why the method must return <code>void</code>, <code>Future</code> or <code>CompletableFuture</code>, and why any other return type gives <code>null</code>.</p>' },
                        { name: '@PreAuthorize and method security', html: '<p>Evaluate the expression, then call or throw.</p>' },
                        { name: '@Retryable, @CircuitBreaker', html: '<p>Wrap the call in the resilience policy. Same self-invocation caveat.</p>' },
                        { name: 'Scoped proxies', html: '<p>A request- or session-scoped bean injected into a singleton is a proxy that resolves the real instance per call.</p>' },
                        { name: 'Spring Data repositories', html: '<p>The most complete example: there is no implementation class at all. The interface is proxied and the query is derived from the method name.</p>' },
                        { name: '@Configuration classes', html: '<p>Proxied by default so that calling one <code>@Bean</code> method from another returns the container-managed instance instead of a second object. <code>proxyBeanMethods=false</code> turns that off.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>Four ways a call fails to reach the proxy, and they cover essentially every "my annotation is being ignored" report: <strong>self-invocation</strong>, a <strong>private</strong> method, a <strong>final</strong> method or class, and a call made from a <strong>constructor or <code>@PostConstruct</code></strong>, before the proxy exists. Reciting that list is a better answer than any description of the pattern.</p>'
                }
            ],
            docs: [
                { title: 'Understanding AOP Proxies', url: 'https://docs.spring.io/spring-framework/reference/core/aop/proxying.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'aop-proxies', questionId: 'self-invocation' },
                { topicId: 'aop-proxies', questionId: 'async-returns-null' },
                { topicId: 'spring-boot', questionId: 'what-springbootapplication-is' }
            ]
        },

        {
            id: 'observer-in-application-events',
            title: 'Observer: Application Events',
            importance: 'should-know',
            summary: 'ApplicationEventPublisher and @EventListener, plus the lifecycle events the container publishes on the way up and down.',
            interviewAngle: 'Worth knowing that the container itself uses the pattern — ContextRefreshedEvent, ApplicationReadyEvent — not only that it offers it to you.',
            buildsOn: ['proxy-in-aop'],
            blocks: [
                {
                    type: 'table',
                    title: 'The lifecycle events, and the one to actually use',
                    headers: ['Event', 'When', 'Use it for'],
                    rows: [
                        ['<code>ApplicationStartingEvent</code>', 'Before almost anything exists', 'Nearly nothing — no context yet'],
                        ['<code>ApplicationEnvironmentPreparedEvent</code>', 'Environment ready, context not created', 'Programmatic property sources'],
                        ['<code>ContextRefreshedEvent</code>', 'All beans created and wired', 'Warm-up that needs the context; fires again on refresh'],
                        ['<code>ApplicationReadyEvent</code>', 'After the server is accepting traffic', '<strong>The one you want.</strong> Start a scheduler, register with discovery, preload a cache.'],
                        ['<code>ApplicationFailedEvent</code>', 'Startup threw', 'Alerting, structured failure logging'],
                        ['<code>ContextClosedEvent</code>', 'Shutdown beginning', 'Deregister before the shutdown hook drains connections']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong><code>ContextRefreshedEvent</code> can fire more than once</strong> — on an actuator refresh, and once per context in a parent/child arrangement — so a listener that starts a background thread on it starts several. <code>ApplicationReadyEvent</code> fires once per <code>SpringApplication.run</code> and is what almost every "do this at startup" requirement actually wants.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Pair this with the transactional listener point from the pattern catalogue: for domain events, <code>@TransactionalEventListener(phase = AFTER_COMMIT)</code> plus <code>@Async</code> is the combination that stops a confirmation email being sent for an order that rolled back, and stops a slow mailer holding a database connection. Neither behaviour is the default.</p>'
                }
            ],
            docs: [
                { title: 'Standard and Custom Events', url: 'https://docs.spring.io/spring-framework/reference/core/beans/context-introduction.html', kind: 'guide' },
                { title: 'Application Events and Listeners', url: 'https://docs.spring.io/spring-boot/reference/features/spring-application.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-core', questionId: 'context-events' },
                { topicId: 'spring-boot', questionId: 'springapplication-run-lifecycle' }
            ]
        },

        {
            id: 'adapter-in-handleradapter',
            title: 'Adapter: HandlerAdapter and the Converters',
            importance: 'good-to-know',
            summary: 'DispatcherServlet does not know what a @Controller is. It knows about handlers and adapters, which is why controllers, functional routes and WebSocket handlers can coexist.',
            interviewAngle: 'A depth question that pays off in the web-layer module. The insight is that HandlerAdapter is what makes the dispatcher extensible without knowing about annotations at all.',
            buildsOn: ['observer-in-application-events'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p><code>DispatcherServlet</code> resolves a request to a <em>handler</em> — an opaque <code>Object</code> — and then asks each registered <code>HandlerAdapter</code> whether it can invoke that kind of thing. <code>RequestMappingHandlerAdapter</code> says yes to an annotated controller method and knows how to bind its parameters; <code>HandlerFunctionAdapter</code> says yes to a functional route.</p><p>The consequence is worth stating: <strong>the dispatcher has no knowledge of <code>@RequestMapping</code> at all.</strong> Annotation support is one adapter among several, which is how three unrelated programming models run through one servlet.</p>'
                },
                {
                    type: 'types',
                    title: 'The other adapters in the same request',
                    items: [
                        { name: 'HttpMessageConverter', html: '<p>Adapts a request body to a Java type and back. <code>MappingJackson2HttpMessageConverter</code> is the one that turns your <code>@RequestBody</code> record into JSON and back.</p>' },
                        { name: 'HandlerMethodArgumentResolver', html: '<p>Adapts the request to one parameter. This is the extension point for a custom annotation like <code>@CurrentUser</code>.</p>' },
                        { name: 'ViewResolver', html: '<p>Adapts a logical view name to a renderable view. Vestigial in an API-only service, which is most of them.</p>' },
                        { name: 'HandlerExceptionResolver', html: '<p>Adapts a thrown exception to a response. <code>@ControllerAdvice</code> is implemented on top of one of these.</p>' }
                    ]
                }
            ],
            docs: [
                { title: 'DispatcherServlet', url: 'https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-servlet.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'rest-api', questionId: 'dispatcherservlet-lifecycle' },
                { topicId: 'design-patterns', questionId: 'decorator-proxy-adapter' }
            ]
        },

        {
            id: 'front-controller-in-dispatcherservlet',
            title: 'Front Controller, and Chain of Responsibility',
            importance: 'should-know',
            summary: 'One servlet receives every request and orchestrates. Around it, two chains: servlet filters outside, interceptors inside — which is exactly why some exceptions never reach @ControllerAdvice.',
            interviewAngle: 'The structural fact behind a very common practical question: why a Spring Security 401 has a different body shape from every other error in the application.',
            buildsOn: ['adapter-in-handleradapter'],
            blocks: [
                {
                    type: 'diagram',
                    diagramType: 'flowchart',
                    title: 'Where the two chains sit relative to the front controller',
                    diagramConfig: {
                        nodes: [
                            { id: 'req',    label: 'Request',              kind: 'start' },
                            { id: 'filter', label: 'Servlet filter chain', kind: 'process' },
                            { id: 'ds',     label: 'DispatcherServlet',    kind: 'decision' },
                            { id: 'inter',  label: 'HandlerInterceptors',  kind: 'process' },
                            { id: 'handler',label: 'Controller method',    kind: 'process' },
                            { id: 'advice', label: '@ControllerAdvice',    kind: 'process' },
                            { id: 'res',    label: 'Response',             kind: 'end' }
                        ],
                        edges: [
                            { from: 'req',     to: 'filter' },
                            { from: 'filter',  to: 'ds' },
                            { from: 'ds',      to: 'inter' },
                            { from: 'inter',   to: 'handler' },
                            { from: 'handler', to: 'advice',  label: 'throws' },
                            { from: 'handler', to: 'res' },
                            { from: 'advice',  to: 'res' },
                            { from: 'filter',  to: 'res',     label: 'rejects — advice never runs' }
                        ]
                    }
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>An exception thrown in a filter cannot be handled by <code>@ControllerAdvice</code>.</strong> The advice is a component <em>inside</em> the dispatcher and the filter chain is outside it, so a Spring Security authentication failure produces a response written by an <code>AuthenticationEntryPoint</code> rather than by your error handler. That is why a 401 from an otherwise consistent API arrives in a different shape, and the fix is to configure the entry point to emit the same <code>ProblemDetail</code> — not to add another <code>@ExceptionHandler</code>.</p>'
                },
                {
                    type: 'comparison',
                    title: 'Filter against interceptor, which the boundary decides',
                    left: 'Servlet Filter',
                    right: 'HandlerInterceptor',
                    rows: [
                        { aspect: 'Defined by', left: 'The Servlet specification', right: 'Spring MVC' },
                        { aspect: 'Runs', left: 'Outside <code>DispatcherServlet</code>', right: 'Inside it' },
                        { aspect: 'Knows the handler', left: 'No', right: 'Yes — it is given the <code>HandlerMethod</code>' },
                        { aspect: 'Can modify the request/response objects', left: 'Yes, by wrapping', right: 'No — it can act, not substitute' },
                        { aspect: 'Errors go to @ControllerAdvice', left: '<strong>No</strong>', right: 'Yes' },
                        { aspect: 'Use for', left: 'CORS, correlation ids, security, request logging', right: 'Anything needing to know which controller was chosen' }
                    ]
                }
            ],
            docs: [
                { title: 'Filters', url: 'https://docs.spring.io/spring-framework/reference/web/webmvc/filters.html', kind: 'guide' },
                { title: 'Interception', url: 'https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-config/interceptors.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'rest-api', questionId: 'filters-vs-interceptors' },
                { topicId: 'aop-proxies', questionId: 'filters-interceptors-aspects' }
            ]
        },

        {
            id: 'answering-this-question-well',
            title: 'Answering the Question',
            importance: 'must-know',
            summary: 'Structure beats enumeration. One load-bearing pattern, one you can go deep on, one correction, and stop.',
            interviewAngle: 'This is the chapter that converts the previous eight into marks. A list of eight patterns and a paragraph about one of them score differently, and the paragraph wins.',
            buildsOn: ['front-controller-in-dispatcherservlet'],
            blocks: [
                {
                    type: 'types',
                    title: 'A four-beat answer, about ninety seconds',
                    items: [
                        { name: '1. Name the load-bearing one', html: '<p><em>"The one that matters is dependency injection — inversion of control. Everything else follows from the container constructing my objects instead of my classes doing it."</em></p>' },
                        { name: '2. Go deep on proxy', html: '<p><em>"The most consequential is proxy. <code>@Transactional</code>, <code>@Cacheable</code>, <code>@Async</code>, method security and Spring Data repositories are all proxies — which is why calling an annotated method from another method of the same class does nothing at all."</em> This is where the follow-ups are, and you have already answered them.</p>' },
                        { name: '3. Make the correction', html: '<p><em>"People usually say singleton, and that is worth being careful about: Spring\'s singleton scope is one instance per <code>ApplicationContext</code> with no global access point, which is not the Gang of Four pattern. Two contexts, two instances."</em></p>' },
                        { name: '4. Breadth, briefly, then stop', html: '<p><em>"Beyond that — template method in <code>JdbcTemplate</code>, chain of responsibility in the filter chain, observer in application events, front controller in <code>DispatcherServlet</code>, adapter in <code>HandlerAdapter</code>."</em> One sentence. Do not expand unless asked.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>The failure mode is a two-minute list.</strong> Naming eleven patterns with a clause each demonstrates that you have read a blog post; it gives the interviewer nothing to probe and no evidence that you have debugged any of it. One pattern taken to a consequence — a bug it causes, a rule it enforces — is worth more than the other ten put together.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>If you get exactly one follow-up, it will almost certainly be <em>"why doesn\'t <code>@Transactional</code> work when I call the method from the same class"</em>. Answer it in terms of the proxy — the injected reference is a generated subclass, <code>this</code> is not it, so the interception never happens — and then give the fix you would actually make, which is moving the method to another bean rather than reaching for <code>AopContext</code>.</p>'
                }
            ],
            docs: [
                { title: 'Aspect Oriented Programming with Spring', url: 'https://docs.spring.io/spring-framework/reference/core/aop.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'design-patterns', questionId: 'patterns-spring-uses' },
                { topicId: 'transactions', questionId: 'transactional-not-working' }
            ]
        }
    ]
};
