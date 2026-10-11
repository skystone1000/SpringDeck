/* ==========================================================================
   data/theory/sets/predict-spring.js — Predict, set 6 of 11

   Nine puzzles, every one of them artefact: 'behaviour'. Not one is a program
   whose stdout a runner could diff, and that is inherent rather than
   incidental: every answer here depends on a proxy existing, a context being
   refreshed, or a property source ordering that only exists inside a running
   application. There is no single file that demonstrates any of it.

   So each one declares a verification string naming the reference section the
   answer was read from, and shows a trace rather than an output pane. Part 9
   requires it and it is worth restating why: an "Output" frame over code the
   toolchain has not run is a claim wearing a console's clothes, and a reader
   cannot tell the difference from the outside.

   THE DISTRACTORS HERE ARE ALL THE SAME SHAPE — what would happen if the
   proxy were not there. That is not laziness. It is the actual mental model
   most people carry into a Spring interview, and a puzzle whose wrong answer
   is nobody's belief teaches nothing.
   ========================================================================== */

const predictSpringModule = {
    id: 'predict-spring',
    trackId: 'output',
    order: 956,
    title: 'Spring and Boot',
    tagline: 'Nine places where the proxy, or the absence of one, decides the answer.',
    estimatedMinutes: 30,
    prerequisites: [],
    docHub: {
        title: 'Spring Framework — Core technologies',
        url: 'https://docs.spring.io/spring-framework/reference/core.html'
    },

    chapters: [
        {
            id: 'the-proxy-decides',
            title: 'The Proxy Decides',
            importance: 'must-know',
            summary: 'Four behaviours that are all the same fact: the annotation is on the proxy, and an internal call never reaches it.',
            interviewAngle: 'Self-invocation is the single most-asked Spring question, and the good answer names the mechanism rather than the symptom.',
            buildsOn: [],
            blocks: [
                {
                    type: 'predict',
                    id: 'predict-spring-transactional-self-invocation-no-rollback',
                    importance: 'must-know',
                    artefact: 'behaviour',
                    language: 'java',
                    title: 'A rollback that does not happen',
                    prompt: '<p>The outer method is not transactional, the inner one is, and the save has already run when the exception is thrown. What is in the database afterwards?</p>',
                    code: '@Service\nclass OrderService {\n\n    void process(Order order) {          // no annotation\n        save(order);                     // internal call\n    }\n\n    @Transactional\n    void save(Order order) {\n        repository.save(order);\n        throw new IllegalStateException("boom");\n    }\n}',
                    options: [
                        'The order is committed — the transaction never started',
                        'The order is rolled back',
                        'A TransactionRequiredException is thrown',
                        'The order is rolled back and the exception is swallowed'
                    ],
                    answer: 0,
                    verification: 'Read from the Spring Framework reference, Data Access, "Using @Transactional" — the section headed with the self-invocation caveat. Not executed here: the behaviour requires a refreshed application context and a proxied bean.',
                    output: {
                        kind: 'trace',
                        lines: [
                            'process() is called through the proxy, which finds no advice on it and passes straight through.',
                            'process() calls save() on `this`, so the proxy is not involved and no advice runs.',
                            'No transaction is started.',
                            'repository.save() runs in its own auto-committed transaction and the row is written.',
                            'IllegalStateException is thrown and propagates to the caller.',
                            'There is no transaction to roll back. The row stays.'
                        ],
                        explain: '<p><code>@Transactional</code> is implemented by a proxy that wraps the bean. A call from one method of the bean to another goes through <code>this</code>, not through the proxy, so no advice runs and no transaction is started. The row is written by the repository in its own auto-committed transaction and stays. <strong>The fix is not another annotation</strong> — it is to move <code>save</code> to a different bean, or to inject the proxy into itself, or to use <code>TransactionTemplate</code>. Adding <code>@Transactional</code> to <code>process</code> would also work, and for the reason worth stating: it makes the outer call the one that goes through the proxy.</p>'
                    }
                },
                {
                    type: 'predict',
                    id: 'predict-spring-checked-exception-does-not-roll-back',
                    importance: 'must-know',
                    artefact: 'behaviour',
                    language: 'java',
                    title: 'A checked exception inside a transaction',
                    prompt: '<p>This method is properly proxied and the exception really is thrown. What happens to the write?</p>',
                    code: '@Service\nclass InvoiceService {\n\n    @Transactional\n    void issue(Invoice invoice) throws IOException {\n        repository.save(invoice);\n        throw new IOException("pdf service unreachable");\n    }\n}',
                    options: [
                        'Committed — a checked exception does not trigger rollback by default',
                        'Rolled back — any exception rolls the transaction back',
                        'Rolled back, and the IOException is wrapped in a RuntimeException',
                        'A compile error: @Transactional methods cannot declare checked exceptions'
                    ],
                    answer: 0,
                    verification: 'Read from the Spring Framework reference, "Rolling Back a Declarative Transaction", and the javadoc of @Transactional#rollbackFor. Not executed here: it needs a proxied bean and a real transaction manager.',
                    output: {
                        kind: 'trace',
                        lines: [
                            'The proxy begins a transaction, because issue() really is proxied this time.',
                            'repository.save(invoice) runs inside it.',
                            'IOException is thrown, and it is a checked exception.',
                            'The proxy asks its rollback rule: the default is RuntimeException or Error only, so the answer is no.',
                            'The proxy commits.',
                            'The caller sees the IOException and the invoice is in the database.'
                        ],
                        explain: '<p>The default rule is <code>RuntimeException</code> or <code>Error</code> only. A checked exception commits, which surprises almost everyone the first time and is a deliberate inheritance from EJB semantics — checked exceptions were meant to model expected, recoverable business outcomes. <strong>If a checked exception in your code means "this did not work", say so:</strong> <code>@Transactional(rollbackFor = IOException.class)</code>. The alternative and usually better answer is to not throw checked exceptions out of a service at all.</p>'
                    }
                },
                {
                    type: 'predict',
                    id: 'predict-spring-async-self-invocation-runs-inline',
                    importance: 'must-know',
                    artefact: 'behaviour',
                    language: 'java',
                    title: 'An @Async that is not async',
                    prompt: '<p><code>@EnableAsync</code> is present and the executor is configured. Which thread prints second?</p>',
                    code: '@Service\nclass ReportService {\n\n    void run() {\n        System.out.println(Thread.currentThread().getName());\n        generate();                      // internal call\n    }\n\n    @Async\n    void generate() {\n        System.out.println(Thread.currentThread().getName());\n    }\n}',
                    options: [
                        'The same thread both times — the call never reached the proxy',
                        'http-nio-8080-exec-1 then task-1',
                        'task-1 then task-1',
                        'It throws, because @Async on a void method is not allowed'
                    ],
                    answer: 0,
                    verification: 'Read from the Spring Framework reference, "Using the @Async Annotation", which states the self-invocation limitation explicitly. Not executed here: it needs a context with @EnableAsync and a task executor.',
                    output: {
                        kind: 'trace',
                        lines: [
                            'run() prints the name of the request thread, http-nio-8080-exec-1.',
                            'run() calls generate() on `this`, so the async proxy never sees the call.',
                            'generate() executes inline, synchronously, on the same thread.',
                            'It prints http-nio-8080-exec-1 again.',
                            'No task was ever submitted to the executor, and nothing failed to say so.'
                        ],
                        explain: '<p>Identical mechanism to the transactional case, and worth recognising as the same fact rather than as a second rule: <strong><code>@Async</code>, <code>@Transactional</code>, <code>@Cacheable</code> and <code>@PreAuthorize</code> are all proxy advice, and none of them survives a call through <code>this</code>.</strong> This one is nastier than the transaction case because nothing fails — the work is done, correctly, just not where you thought. The symptom appears as a latency mystery weeks later.</p>'
                    }
                },
                {
                    type: 'predict',
                    id: 'predict-spring-prototype-injected-into-singleton',
                    importance: 'should-know',
                    artefact: 'behaviour',
                    language: 'java',
                    title: 'A prototype that is only created once',
                    prompt: '<p><code>Basket</code> is <code>@Scope("prototype")</code>. How many baskets exist after three calls to <code>handle()</code>?</p>',
                    code: '@Component @Scope("prototype")\nclass Basket { }\n\n@Service                              // singleton\nclass CheckoutService {\n\n    @Autowired\n    private Basket basket;            // injected once, at creation\n\n    void handle() {\n        System.out.println(System.identityHashCode(basket));\n    }\n}',
                    options: [
                        'One. The same instance prints three times',
                        'Three. A new Basket per call',
                        'Three, but the singleton keeps a reference to the first',
                        'It fails at startup: a singleton may not depend on a prototype'
                    ],
                    answer: 0,
                    verification: 'Read from the Spring Framework reference, "Singleton Beans with Prototype-bean Dependencies". Not executed here: the answer is a container lifecycle behaviour, not a language one.',
                    output: {
                        kind: 'trace',
                        lines: [
                            'The context refreshes and creates CheckoutService once, because it is a singleton.',
                            'Creating it asks the container for a Basket. That is one lookup, so one Basket is created and injected.',
                            'handle() is called three times and prints the same identity hash each time.',
                            'Prototype means a new instance per lookup, and there was exactly one lookup.'
                        ],
                        explain: '<p>Dependency injection happens once, when the singleton is created. Prototype scope promises a new instance per <em>request to the container</em>, and the singleton made exactly one such request. The fixes are all ways of asking again at call time: inject an <code>ObjectProvider&lt;Basket&gt;</code> and call <code>getObject()</code>, use <code>@Lookup</code>, or declare the prototype with a scoped proxy. <strong>The general form is worth keeping</strong>: a shorter-lived scope injected into a longer-lived one is always this bug, and it is why a request-scoped bean in a singleton needs a proxy too.</p>'
                    }
                }
            ],
            docs: [
                { title: 'Spring Framework — Declarative transaction management', url: 'https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative.html', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'configuration-that-wins',
            title: 'Which Configuration Wins',
            importance: 'must-know',
            summary: 'A precedence order most people can half-recite, and a binding rule that accepts four spellings of the same key.',
            interviewAngle: 'Asked because every candidate has debugged a property that "was not being picked up", and the ones who have read the order can say why in ten seconds.',
            buildsOn: [],
            blocks: [
                {
                    type: 'predict',
                    id: 'predict-spring-property-precedence-which-wins',
                    importance: 'must-know',
                    artefact: 'behaviour',
                    language: 'bash',
                    title: 'Four sources, one property',
                    prompt: '<p>The same property is set four ways. Which value does the application see?</p>',
                    code: '# 1. src/main/resources/application.yaml\n#      app.timeout: 1000\n\n# 2. src/main/resources/application-prod.yaml   (profile prod is active)\n#      app.timeout: 2000\n\n# 3. the environment\nexport APP_TIMEOUT=3000\n\n# 4. the command line\njava -jar app.jar --app.timeout=4000',
                    options: ['4000', '3000', '2000', '1000'],
                    answer: 0,
                    verification: 'Read from the Spring Boot reference, "Externalized Configuration", which lists the property sources in precedence order. Not executed here: it is a property-source ordering inside a running application.',
                    output: {
                        kind: 'trace',
                        lines: [
                            'application.yaml contributes app.timeout = 1000.',
                            'application-prod.yaml is added above it, because a profile-specific file beats a plain one: 2000.',
                            'The OS environment variable APP_HTTP style key APP_TIMEOUT is added above that: 3000.',
                            'The command-line argument is added above everything: 4000.',
                            'Environment.getProperty("app.timeout") returns 4000.'
                        ],
                        explain: '<p>Command-line arguments sit above the environment, which sits above profile-specific files, which sit above the plain ones. The list is longer than this — the top of it is a <code>@TestPropertySource</code> and devtools, and the bottom is <code>@PropertySource</code> and defaults — but these four are the ones that appear in real incidents. <strong>The practical form: something outside the jar can always override something inside it</strong>, which is exactly what makes the same artefact deployable to four environments and also what makes "it works on my machine" possible.</p>'
                    }
                },
                {
                    type: 'predict',
                    id: 'predict-spring-relaxed-binding-which-key-matches',
                    importance: 'should-know',
                    artefact: 'behaviour',
                    language: 'properties',
                    title: 'Four spellings, one field',
                    prompt: '<p>Which of these bind to <code>maxRetryCount</code> on <code>@ConfigurationProperties(prefix = "app.http")</code>?</p>',
                    code: 'app.http.max-retry-count=1\napp.http.maxRetryCount=2\napp.http.max_retry_count=3\nAPP_HTTP_MAXRETRYCOUNT=4',
                    options: [
                        'All four bind; the last one read wins and the environment variable form is the documented one for env vars',
                        'Only the kebab-case form binds',
                        'Only the camelCase form binds, because it matches the field name',
                        'None of them; @ConfigurationProperties requires an exact match'
                    ],
                    answer: 0,
                    verification: 'Read from the Spring Boot reference, "Relaxed Binding", including the table of environment-variable equivalents. Not executed here: relaxed binding happens during context refresh.',
                    output: {
                        kind: 'trace',
                        lines: [
                            'The binder canonicalises every key by lowercasing it and dropping the separators.',
                            'app.http.max-retry-count canonicalises to app.http.maxretrycount and matches.',
                            'app.http.maxRetryCount canonicalises to the same thing and matches.',
                            'app.http.max_retry_count canonicalises to the same thing and matches.',
                            'APP_HTTP_MAXRETRYCOUNT canonicalises to the same thing and matches.',
                            'All four are one property, so precedence decides the value, not spelling.'
                        ],
                        explain: '<p>Relaxed binding lowercases the key and removes the separators before matching, so four spellings are one property. This is the mechanism that lets a Kubernetes environment variable override a YAML key without the two looking alike. <strong>It applies to <code>@ConfigurationProperties</code> and not to <code>@Value</code></strong>, which is the trap: <code>@Value("${app.http.maxRetryCount}")</code> will not find a key written in kebab-case, and the failure is a startup error rather than a wrong value. Write kebab-case in files and let the environment do what it does.</p>'
                    }
                }
            ],
            docs: [
                { title: 'Spring Boot — Externalized configuration', url: 'https://docs.spring.io/spring-boot/reference/features/external-config.html', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'startup-order-and-failure',
            title: 'Startup Order and Startup Failure',
            importance: 'should-know',
            summary: 'A cycle that used to work, two callbacks whose order is fixed, and a conditional that depends on when it is asked.',
            interviewAngle: 'The circular-dependency question is really a question about which injection style you use and why. The @ConditionalOnMissingBean one separates people who have written a starter from people who have used one.',
            buildsOn: ['the-proxy-decides'],
            blocks: [
                {
                    type: 'predict',
                    id: 'predict-spring-constructor-injection-circular-fails',
                    importance: 'must-know',
                    artefact: 'behaviour',
                    language: 'java',
                    title: 'A cycle, two ways',
                    prompt: '<p>Two beans depend on each other. On Spring Boot 3.x, what happens at startup?</p>',
                    code: '@Service\nclass A {\n    A(B b) { }                    // constructor injection\n}\n\n@Service\nclass B {\n    B(A a) { }                    // constructor injection\n}\n\n// ...and the same pair written with field injection:\n@Service class C { @Autowired D d; }\n@Service class D { @Autowired C c; }',
                    options: [
                        'The constructor pair fails at startup; the field pair also fails, because circular references are disabled by default since Boot 2.6',
                        'The constructor pair fails; the field pair starts fine',
                        'Both start fine',
                        'Both fail, and the error names a NullPointerException'
                    ],
                    answer: 0,
                    verification: 'Read from the Spring Boot 2.6 release notes (circular references prohibited by default) and the Spring Framework reference on circular dependencies. Not executed here: it is a context-refresh failure.',
                    output: {
                        kind: 'trace',
                        lines: [
                            'The container tries to create A, which needs B in its constructor.',
                            'It tries to create B, which needs A in its constructor.',
                            'Neither can be constructed first, so the cycle cannot be resolved.',
                            'Startup fails with APPLICATION FAILED TO START and a diagram of the cycle.',
                            'The action line offers spring.main.allow-circular-references=true, which is a flag rather than a fix.',
                            'The field-injected pair fails the same way, because circular references are prohibited by default since Boot 2.6.'
                        ],
                        explain: '<p>Constructor injection cannot resolve a cycle at all — neither object can be constructed first. Field injection <em>could</em>, because the container can construct both and then set the fields, and that is exactly why it used to hide this. Since Boot 2.6 it is refused by default for both, with a flag to turn it back on. <strong>The flag is not the answer.</strong> A cycle is a design statement: these two things are one thing, or a third thing should sit between them. The startup failure is the container telling you something true about the code.</p>'
                    }
                },
                {
                    type: 'predict',
                    id: 'predict-spring-postconstruct-vs-afterpropertiesset-order',
                    importance: 'should-know',
                    artefact: 'behaviour',
                    language: 'java',
                    title: 'Three initialisation callbacks',
                    prompt: '<p>One bean declares all three. In what order do they run?</p>',
                    code: '@Component\nclass Widget implements InitializingBean {\n\n    Widget() { System.out.println("constructor"); }\n\n    @PostConstruct\n    void postConstruct() { System.out.println("postConstruct"); }\n\n    @Override\n    public void afterPropertiesSet() { System.out.println("afterPropertiesSet"); }\n\n    @Bean(initMethod = "custom")   // declared on the @Bean method elsewhere\n    void custom() { System.out.println("custom"); }\n}',
                    options: [
                        'constructor, postConstruct, afterPropertiesSet, custom',
                        'constructor, afterPropertiesSet, postConstruct, custom',
                        'constructor, custom, postConstruct, afterPropertiesSet',
                        'postConstruct, constructor, afterPropertiesSet, custom'
                    ],
                    answer: 0,
                    verification: 'Read from the Spring Framework reference, "Combining Lifecycle Mechanisms", which states this order explicitly. Not executed here: it is a container lifecycle sequence.',
                    output: {
                        kind: 'trace',
                        lines: [
                            'The constructor runs, with constructor-injected dependencies available and injected fields still null.',
                            'Fields and setters are injected.',
                            '@PostConstruct runs, applied by a BeanPostProcessor.',
                            'afterPropertiesSet() runs, the InitializingBean callback.',
                            'The initMethod named on the @Bean declaration runs last.'
                        ],
                        explain: '<p>Annotation first, interface second, XML-era attribute last. The order is fixed and documented, and the reason to know it is smaller than the reason to know the first line: <strong>the constructor runs before any injected field is set</strong>, so anything that reads an <code>@Autowired</code> field or an <code>@Value</code> in a constructor body sees null — unless it came in through the constructor, which is the argument for constructor injection in one sentence. In new code, use <code>@PostConstruct</code> and never implement <code>InitializingBean</code>: it couples the bean to Spring for no gain.</p>'
                    }
                },
                {
                    type: 'predict',
                    id: 'predict-spring-conditionalonmissingbean-ordering',
                    importance: 'should-know',
                    artefact: 'behaviour',
                    language: 'java',
                    title: 'Which bean is missing, and when',
                    prompt: '<p>A starter declares a default. The application declares its own. Which one is in the context?</p>',
                    code: '// in the auto-configuration, inside spring.factories / AutoConfiguration.imports\n@AutoConfiguration\nclass HttpAutoConfiguration {\n    @Bean\n    @ConditionalOnMissingBean\n    RestClient restClient() { return RestClient.create(); }\n}\n\n// in the application\n@Configuration\nclass MyConfig {\n    @Bean\n    RestClient restClient() { return RestClient.builder()...build(); }\n}',
                    options: [
                        'The application\'s, because auto-configuration is evaluated after user configuration',
                        'The starter\'s, because it was registered first',
                        'Both, and injection fails with NoUniqueBeanDefinitionException',
                        'It depends on the class names alphabetically'
                    ],
                    answer: 0,
                    verification: 'Read from the Spring Boot reference, "Creating Your Own Auto-configuration", which states that auto-configuration classes are always applied after user-defined beans are registered. Not executed here: it is a condition evaluated during context refresh.',
                    output: {
                        kind: 'trace',
                        lines: [
                            'User @Configuration classes are processed first and register their bean definitions, including MyConfig\'s restClient.',
                            'Auto-configuration classes are evaluated afterwards.',
                            'HttpAutoConfiguration#restClient asks @ConditionalOnMissingBean whether a RestClient is already present.',
                            'One is, so the condition is false and the auto-configured bean is never registered.',
                            'The context ends up with exactly one RestClient: the application\'s.'
                        ],
                        explain: '<p>The ordering is the whole mechanism behind "sensible defaults you can always override". Auto-configuration runs last on purpose, so <code>@ConditionalOnMissingBean</code> is asked at a moment when every user bean is already known. <strong>The trap is using <code>@ConditionalOnMissingBean</code> in your own <code>@Configuration</code></strong>, where it is evaluated in registration order against a half-built context and the answer depends on which class was processed first — which is a genuinely unpredictable result and the reason the annotation is documented as being for auto-configuration only. Use <code>--debug</code> and read the condition-evaluation report rather than guessing.</p>'
                    }
                }
            ],
            docs: [
                { title: 'Spring Boot — Creating your own auto-configuration', url: 'https://docs.spring.io/spring-boot/reference/features/developing-auto-configuration.html', kind: 'guide' }
            ],
            relatedQuestions: []
        }
    ]
};
