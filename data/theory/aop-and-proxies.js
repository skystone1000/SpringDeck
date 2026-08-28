/* ==========================================================================
   data/theory/aop-and-proxies.js — module 28 in the reading path

   Eight chapters, and the plan calls this the single most valuable
   mechanism to understand in Spring. That is not enthusiasm: @Transactional
   doing nothing, @Async returning null, @Cacheable being ignored and
   @Retryable never retrying are four separate bug reports with one cause,
   and the cause is in chapter one.
   ========================================================================== */

const aopAndProxiesModule = {
    id: 'aop-and-proxies',
    trackId: 'spring-core',
    order: 28,
    title: 'AOP, Proxies and the Self-Invocation Trap',
    tagline: 'The single most valuable mechanism to understand in Spring.',
    estimatedMinutes: 45,
    prerequisites: ['wiring-beans'],
    docHub: { title: 'Aspect Oriented Programming with Spring', url: 'https://docs.spring.io/spring-framework/reference/core/aop.html' },

    chapters: [
        {
            id: 'what-a-proxy-is',
            title: 'The Object You Injected Is Not the Object You Wrote',
            importance: 'must-know',
            summary: 'When a bean needs cross-cutting behaviour, the container puts a generated wrapper into the context instead of your instance. Everything else in this module follows from that.',
            interviewAngle: 'The foundation question. A candidate who can say "what gets injected is a proxy that delegates to my object" can then derive the self-invocation trap on the spot; one who cannot has to memorise it as a list of annotations that sometimes fail.',
            buildsOn: [],
            blocks: [
                {
                    type: 'definition',
                    term: 'Proxy',
                    important: true,
                    html: '<p>A generated object with the same type as your bean, created at startup by a <code>BeanPostProcessor</code>, which holds a reference to your instance — the <em>target</em> — and forwards every call to it. Because it sits in between, it can run code before and after each call: start a transaction, check a cache, submit to an executor, record a metric.</p>'
                },
                {
                    type: 'diagram',
                    diagramType: 'flowchart',
                    caption: 'Every call from outside goes through the proxy. That is the whole mechanism.',
                    diagramConfig: {
                        title: 'What a caller actually holds',
                        nodes: [
                            { id: 'caller', label: 'Another bean, holding the injected reference', kind: 'start' },
                            { id: 'proxy', label: 'PROXY — same type, generated', kind: 'decision' },
                            { id: 'before', label: 'Advice runs: begin transaction, check cache', kind: 'step' },
                            { id: 'target', label: 'TARGET — the object your constructor made', kind: 'step' },
                            { id: 'after', label: 'Advice runs: commit, or roll back', kind: 'fix' }
                        ],
                        edges: [
                            { from: 'caller', to: 'proxy' },
                            { from: 'proxy', to: 'before' },
                            { from: 'before', to: 'target' },
                            { from: 'target', to: 'after' }
                        ]
                    }
                },
                {
                    type: 'prose',
                    html: '<p>The proxy is created in <code>postProcessAfterInitialization</code> — step six of the bean lifecycle. What the container then stores, and what every injection point receives, is the proxy. Your instance still exists; nothing outside the proxy holds a reference to it.</p><p>That last sentence is the one to keep. Every trap in this module is a call that reached the target without going through the proxy, and there is exactly one way for that to happen: the call came from inside the target itself.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>You can see it in a debugger, and it is worth doing once: the injected reference\'s <code>getClass().getName()</code> reads something like <code>OrderService$$SpringCGLIB$$0</code>. <code>AopUtils.isAopProxy(bean)</code> answers the same question in code. Being able to say "I would check whether the injected object is actually a proxy" is a concrete first diagnostic step for half the bugs in this module.</p>'
                }
            ],
            docs: [
                { title: 'Proxying Mechanisms', url: 'https://docs.spring.io/spring-framework/reference/core/aop/proxying.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'aop-proxies', questionId: 'how-spring-aop-works' }
            ]
        },

        {
            id: 'jdk-proxy-vs-cglib',
            title: 'Two Ways to Generate One',
            importance: 'must-know',
            summary: 'A JDK dynamic proxy implements the interfaces. CGLIB subclasses the class. Spring Boot defaults to CGLIB, which is why interfaces stopped being required.',
            interviewAngle: 'Asked directly and often. The complete answer names both, says which Boot uses by default, and gives the consequence of each — a JDK proxy cannot be cast to the concrete class, and a CGLIB proxy cannot advise a final method.',
            buildsOn: ['what-a-proxy-is'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'The two mechanisms',
                    left: 'JDK dynamic proxy',
                    right: 'CGLIB',
                    rows: [
                        { aspect: 'Built from', left: '<code>java.lang.reflect.Proxy</code>, in the JDK', right: 'A generated subclass (Spring repackages it)' },
                        { aspect: 'Requires', left: '<strong>At least one interface</strong>', right: 'A non-final class with a usable constructor' },
                        { aspect: 'Proxy type', left: 'Implements the interfaces only', right: '<strong>Is a subclass</strong> of the target' },
                        { aspect: 'Injecting by concrete type', left: 'Fails — the proxy is not that class', right: 'Works' },
                        { aspect: 'Cannot advise', left: 'Anything not on an interface', right: '<code>final</code> classes, <code>final</code> and <code>private</code> methods' },
                        { aspect: 'Default in Spring Boot', left: 'No', right: '<strong>Yes</strong>, since 2.0' }
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>Spring Boot sets <code>spring.aop.proxy-target-class=true</code>, which forces CGLIB everywhere. The reason is practical: with a JDK proxy, a service that implements an interface can only be injected <em>as</em> that interface, and a codebase full of one-implementation interfaces created purely to satisfy the proxying mechanism was a real and widely disliked cost. CGLIB removed the requirement, which is why modern Spring code has far fewer <code>OrderServiceImpl</code> classes in it.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Under a JDK proxy, injecting by the concrete class fails at startup</strong> with a message about the bean not being assignable — the proxy implements <code>OrderService</code> and is not an <code>OrderServiceImpl</code>. This is the classic reason an application that worked on Spring 4 with XML fails when someone changes the proxy mode, and the fix is to inject the interface, which was the intent all along.</p>'
                },
                {
                    type: 'version',
                    title: 'CGLIB and the JDK have been drifting apart',
                    items: [
                        { version: 'Spring 3.2', state: 'changed', html: '<p>CGLIB repackaged into <code>org.springframework.cglib</code>, so it is no longer a separate dependency.</p>' },
                        { version: 'Spring Boot 2.0', state: 'is', html: '<p>CGLIB becomes the default proxy mechanism for everything.</p>' },
                        { version: 'Java 17', state: 'changed', html: '<p>Strong encapsulation means CGLIB can no longer reach into JDK internals freely. Spring works around it; a library pinned to an old CGLIB may not.</p>' }
                    ]
                }
            ],
            docs: [
                { title: 'Proxying Mechanisms', url: 'https://docs.spring.io/spring-framework/reference/core/aop/proxying.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'aop-proxies', questionId: 'jdk-proxy-vs-cglib' }
            ]
        },

        {
            id: 'advice-and-pointcuts',
            title: 'Advice, Pointcuts and Order',
            importance: 'should-know',
            summary: 'A pointcut selects join points; advice is the code that runs there. Five advice kinds, and only one of them can stop the call from happening.',
            interviewAngle: 'The vocabulary question. Being able to name the five advice types in execution order, and to say that @Around is the only one that controls whether the target runs, is what the question is looking for.',
            buildsOn: ['what-a-proxy-is'],
            blocks: [
                {
                    type: 'types',
                    title: 'The vocabulary, and the five advice kinds',
                    items: [
                        { name: 'Join point', html: '<p>A point in execution where advice could apply. <strong>In Spring AOP this is always a public method call on a bean</strong> — never a field access, never a constructor. Full AspectJ has more; Spring does not.</p>' },
                        { name: 'Pointcut', html: '<p>An expression selecting join points: <code>execution(* com.acme.service.*.*(..))</code>, or <code>@annotation(com.acme.Audited)</code>.</p>' },
                        { name: '@Before', html: '<p>Runs first. Cannot prevent the call, but can throw.</p>' },
                        { name: '@Around', html: '<p>Wraps everything. Receives a <code>ProceedingJoinPoint</code> and <strong>decides whether to call <code>proceed()</code></strong> — the only advice that can suppress, retry or replace the call. This is what <code>@Transactional</code>, <code>@Cacheable</code> and <code>@Retryable</code> all are.</p>' },
                        { name: '@AfterReturning', html: '<p>On success only. Sees the return value.</p>' },
                        { name: '@AfterThrowing', html: '<p>On failure only. Sees the exception; does not swallow it.</p>' },
                        { name: '@After', html: '<p>A finally. Runs either way.</p>' }
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'An aspect that times whatever carries an annotation',
                    code: '@Aspect\n@Component\n@Order(1)                                  // lower runs FURTHER OUT\nclass TimingAspect {\n\n    @Around("@annotation(com.acme.Timed)")\n    Object time(ProceedingJoinPoint pjp) throws Throwable {\n        long start = System.nanoTime();\n        try {\n            return pjp.proceed();          // omit this and the method never runs\n        } finally {\n            record(pjp.getSignature(), System.nanoTime() - start);\n        }\n    }\n}',
                    notes: '<p>An annotation-based pointcut is worth preferring over a package-based <code>execution(...)</code> one: it is refactoring-safe, it is visible at the site it applies to, and a package rename does not silently switch the aspect off. A pointcut that stops matching fails silently in both directions, which is the worst property a configuration can have.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong><code>@Order</code> on aspects is the reverse of what most people assume, and the mistake is invisible.</strong> A lower value means <em>higher</em> precedence, which means the aspect sits further out — its <code>@Before</code> runs earlier and its <code>@After</code> runs later. Get the order wrong between a transaction aspect and a retry aspect and you get either a retry inside one transaction or a transaction per attempt. Both compile, both run, and only one is what you meant.</p>'
                }
            ],
            docs: [
                { title: 'Declaring Advice', url: 'https://docs.spring.io/spring-framework/reference/core/aop/ataspectj/advice.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'aop-proxies', questionId: 'advice-types-and-order' },
                { topicId: 'aop-proxies', questionId: 'pointcut-expressions' }
            ]
        },

        {
            id: 'self-invocation',
            title: 'The Self-Invocation Trap',
            importance: 'must-know',
            summary: 'A method calling another method on this bypasses the proxy, so the annotation on the called method does nothing at all. Silently.',
            interviewAngle: 'The most valuable single fact in Spring, and one of the most reliably asked. What separates answers is being able to derive it rather than recall it: the proxy wraps the object, and a call on this never leaves the object.',
            buildsOn: ['what-a-proxy-is'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Two methods, one annotation, no transaction',
                    code: '@Service\nclass OrderService {\n\n    public void processAll(List<Order> orders) {\n        for (Order o : orders) {\n            save(o);            // a plain call on `this`\n        }\n    }\n\n    @Transactional          // does NOTHING when called from processAll\n    public void save(Order o) {\n        repository.save(o);\n    }\n}',
                    output: {
                        kind: 'trace',
                        lines: [
                            'Some other bean calls orderService.processAll(...). That call goes through the proxy, which finds no @Transactional on processAll and simply delegates.',
                            'Inside the target, save(o) compiles to invokevirtual on `this` -- and `this` is the target, not the proxy.',
                            'The proxy is never consulted, so no transaction is started. The repository call runs in whatever transaction context already existed, which is usually none.',
                            'Nothing warns. Each save autocommits, a failure halfway through leaves the first half committed, and the code reads as though it were transactional.'
                        ],
                        explain: '<p>The mechanism is entirely ordinary Java: the proxy holds a reference to the target, and the target holds no reference to the proxy. A call on <code>this</code> cannot reach a wrapper that <code>this</code> does not know about. Nothing about it is Spring-specific — which is exactly why deriving it beats memorising it.</p>'
                    }
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>It fails silently, and it fails in the direction that loses data.</strong> There is no warning at startup, no log line, no exception. The method runs, the code looks correct in review, the happy path works, and the atomicity you thought you had is simply absent — discovered when a partial failure leaves half a batch committed. This is the reason this module exists.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The complete answer in one breath: <em>"<code>@Transactional</code> works through a proxy. An internal call on <code>this</code> never goes through the proxy, so the annotation is not applied — and there is no warning. I would move the annotated method to another bean, or in a pinch inject the bean into itself and call through that reference."</em></p>'
                }
            ],
            docs: [
                { title: 'Understanding AOP Proxies', url: 'https://docs.spring.io/spring-framework/reference/core/aop/proxying.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'aop-proxies', questionId: 'self-invocation' }
            ]
        },

        {
            id: 'working-around-self-invocation',
            title: 'Four Ways Out, Ranked',
            importance: 'must-know',
            summary: 'Split the class, self-inject, use AopContext, or switch to load-time weaving. The first is the fix and the rest are workarounds.',
            interviewAngle: 'The follow-up, and the place to show judgement rather than knowledge. Ranking them — and saying why splitting the class is a fix and self-injection is not — is a stronger answer than listing all four.',
            buildsOn: ['self-invocation'],
            blocks: [
                {
                    type: 'types',
                    title: 'The four, best first',
                    items: [
                        { name: '1. Move it to another bean', html: '<p>The transactional unit becomes its own class, and the caller injects it. <strong>The only one of the four that is a fix rather than a workaround</strong>, and the self-invocation usually turns out to be marking a real boundary — the annotated method was a different responsibility all along.</p>' },
                        { name: '2. Inject the bean into itself', html: '<p><code>@Lazy OrderService self</code> in the constructor, then <code>self.save(o)</code>. Works, and needs <code>@Lazy</code> to avoid a self-referential cycle. Honest enough, and it leaves a class whose correctness depends on a reader noticing which reference is used.</p>' },
                        { name: '3. AopContext.currentProxy()', html: '<p>Requires <code>@EnableAspectJAutoProxy(exposeProxy = true)</code>. Puts the proxy in a <code>ThreadLocal</code>, so the call site casts and calls. Effective, obscure, and it couples the class to Spring AOP explicitly.</p>' },
                        { name: '4. AspectJ load-time weaving', html: '<p>No proxies at all — the advice is woven into the bytecode, so even a private self-call is advised. It genuinely solves the whole class of problem and it adds a weaving agent to the deployment, which is a large operational cost for one behaviour.</p>' }
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The fix, and the workaround, side by side',
                    code: '// 1 -- THE FIX. The boundary is a class, and it is visible.\n@Service\nclass OrderBatch {\n    private final OrderWriter writer;                 // separate bean\n\n    void processAll(List<Order> orders) {\n        orders.forEach(writer::save);                 // through the proxy\n    }\n}\n\n@Service\nclass OrderWriter {\n    @Transactional\n    public void save(Order o) { repository.save(o); }\n}\n\n// 2 -- THE WORKAROUND. Correct, and one reference away from wrong.\n@Service\nclass OrderService {\n    private final OrderService self;\n\n    OrderService(@Lazy OrderService self) { this.self = self; }\n\n    void processAll(List<Order> orders) {\n        orders.forEach(self::save);      // self, not this. That is the fix.\n    }\n\n    @Transactional\n    public void save(Order o) { repository.save(o); }\n}',
                    notes: '<p>Notice what the first version gained beyond correctness: the transactional boundary is now a type, and a test can exercise <code>OrderWriter</code> without going near the batch loop. The workaround keeps both concerns in one class and adds a rule that has to be remembered.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>When the interviewer asks which you would use, the useful answer commits: <em>"Splitting the class, in almost every case — the self-invocation is usually telling me there are two responsibilities in there. I would use self-injection if the split were genuinely artificial, and I would want a comment on the field saying why."</em></p>'
                }
            ],
            docs: [
                { title: 'Using AopContext', url: 'https://docs.spring.io/spring-framework/reference/core/aop/proxying.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'aop-proxies', questionId: 'self-invocation' }
            ]
        },

        {
            id: 'async-and-cacheable-share-the-trap',
            title: 'Four Bug Reports, One Cause',
            importance: 'must-know',
            summary: '@Async, @Cacheable, @Retryable and @PreAuthorize are all proxy-based, so all four fail in exactly the same way and for exactly the same reason.',
            interviewAngle: 'The generalisation question, and the one that shows the mechanism was understood rather than the special case memorised. If the interviewer asks about @Async returning null, the answer is the same paragraph as the transaction one.',
            buildsOn: ['self-invocation'],
            blocks: [
                {
                    type: 'table',
                    title: 'The same trap, four annotations',
                    headers: ['Annotation', 'What the proxy does', 'The symptom when it is bypassed'],
                    rows: [
                        ['<code>@Transactional</code>', 'Begins, commits, rolls back', 'No transaction. A partial batch commits'],
                        ['<code>@Async</code>', 'Submits to an executor and returns immediately', '<strong>Runs synchronously.</strong> Blocks the caller, and no error'],
                        ['<code>@Cacheable</code>', 'Checks the cache before calling', 'The method runs every time. Slower, still correct'],
                        ['<code>@Retryable</code>', 'Catches and calls again', 'One attempt. The first failure propagates'],
                        ['<code>@PreAuthorize</code>', 'Checks the authentication', '<strong>No check at all.</strong> This one is a security hole']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong><code>@Async</code> has a second trap of its own: the return type.</strong> An <code>@Async</code> method declared to return a plain object cannot work — the proxy must return immediately, before the value exists — so Spring returns <code>null</code> and the caller gets a <code>NullPointerException</code> from a method that clearly returns a value. Declare it <code>void</code> or <code>CompletableFuture&lt;T&gt;</code>. And exceptions from a <code>void</code> <code>@Async</code> method go to an <code>AsyncUncaughtExceptionHandler</code> that logs nothing useful by default, which is the same silent-failure shape as <code>submit()</code> in the executors module.</p>'
                },
                {
                    type: 'tip',
                    html: '<p><code>@PreAuthorize</code> deserves being called out separately when this comes up. The other three degrade into slower or less reliable behaviour; this one degrades into no authorisation check, on a method that visibly declares one. Security annotations on internally-called methods are worth an explicit look in review for that reason alone.</p>'
                }
            ],
            docs: [
                { title: 'Using @Async', url: 'https://docs.spring.io/spring-framework/reference/integration/scheduling.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'aop-proxies', questionId: 'async-returns-null' },
                { topicId: 'aop-proxies', questionId: 'cacheable-behaviour' }
            ]
        },

        {
            id: 'final-and-private-methods',
            title: 'What a Proxy Cannot Reach',
            importance: 'should-know',
            summary: 'CGLIB advises by overriding. A method that cannot be overridden cannot be advised, so final, private and static methods are all invisible to it.',
            interviewAngle: 'A precise question with a precise answer, and it follows directly from "CGLIB generates a subclass". @Transactional on a private method is the version usually asked.',
            buildsOn: ['jdk-proxy-vs-cglib'],
            blocks: [
                {
                    type: 'types',
                    title: 'What cannot be advised, and why',
                    items: [
                        { name: 'private methods', html: '<p>Not visible to a subclass, so not overridable. <code>@Transactional</code> on one is <strong>silently ignored</strong> — and it is also always a self-invocation, since nothing outside the class can call it.</p>' },
                        { name: 'final methods', html: '<p>Cannot be overridden, by definition. The proxy inherits the original and the advice never runs.</p>' },
                        { name: 'final classes', html: '<p>Cannot be subclassed at all, so CGLIB cannot build a proxy. This one at least fails loudly at startup.</p>' },
                        { name: 'static methods', html: '<p>Not dispatched on an instance, so there is nothing to intercept.</p>' },
                        { name: 'Anything called from a constructor', html: '<p>The proxy does not exist yet — it is created after initialisation. Same reason <code>@PostConstruct</code> cannot rely on advice either.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A Kotlin class is <code>final</code> by default</strong>, which means every Spring bean written in Kotlin is unproxyable unless the class and its methods are <code>open</code>. The <code>kotlin-spring</code> compiler plugin exists to open them automatically, and a project without it gets <code>@Transactional</code> methods that do nothing. Worth knowing as a fact about the mechanism even in a Java-only codebase, because it is the clearest demonstration that "final cannot be advised" is a real constraint and not a footnote.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The rule to state, which covers every row above: <em>"Spring AOP advises overridable instance methods called from outside the object. Anything else — private, final, static, self-invoked, or called during construction — is invisible to it, and the failure is silent in every case except a final class."</em></p>'
                }
            ],
            docs: [
                { title: 'Proxying Mechanisms — Limitations', url: 'https://docs.spring.io/spring-framework/reference/core/aop/proxying.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'aop-proxies', questionId: 'transactional-on-private' },
                { topicId: 'aop-proxies', questionId: 'proxy-and-postconstruct' }
            ]
        },

        {
            id: 'proxy-order-and-precedence',
            title: 'When Several Aspects Apply',
            importance: 'good-to-know',
            summary: 'Aspects nest, ordered by @Order, and the nesting determines behaviour rather than merely sequence. Retry outside a transaction is not the same as retry inside one.',
            interviewAngle: 'A senior question. The example worth having ready is @Retryable with @Transactional, because the two orderings produce genuinely different semantics and only one of them is usually intended.',
            buildsOn: ['advice-and-pointcuts'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'Retry outside the transaction, or inside it',
                    left: 'Retry outermost',
                    right: 'Transaction outermost',
                    rows: [
                        { aspect: 'Each attempt gets', left: '<strong>Its own transaction</strong>', right: 'The same transaction' },
                        { aspect: 'After a failed attempt', left: 'Rolled back cleanly, then retried', right: 'Marked rollback-only; the retry does nothing useful' },
                        { aspect: 'On a deadlock or a lock timeout', left: 'Works — the retry is the correct fix', right: 'Fails, and the final commit throws anyway' },
                        { aspect: 'Usually what you want', left: '<strong>Yes</strong>', right: 'Almost never' },
                        { aspect: 'Achieved by', left: 'A lower <code>@Order</code> on the retry aspect', right: 'The reverse, or by leaving both unordered and hoping' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Once a transaction is marked rollback-only, retrying inside it cannot succeed.</strong> The attempt runs, the work is discarded at commit, and the caller sees an <code>UnexpectedRollbackException</code> from a method that appeared to retry successfully. This is the concrete cost of getting the order wrong, and neither annotation says anything about the other.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Spring\'s own aspects carry orders you can look up — the transaction interceptor is <code>Ordered.LOWEST_PRECEDENCE</code> by default, and <code>@EnableTransactionManagement(order = ...)</code> changes it. When two behaviours must nest a particular way, set both orders explicitly. Relying on the defaults to happen to agree is the kind of thing that survives review and then changes under a version upgrade.</p>'
                }
            ],
            docs: [
                { title: 'Advice Ordering', url: 'https://docs.spring.io/spring-framework/reference/core/aop/ataspectj/advice.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'aop-proxies', questionId: 'retryable-and-resilience' },
                { topicId: 'aop-proxies', questionId: 'advice-types-and-order' }
            ]
        }
    ]
};
