/* ==========================================================================
   data/aop-proxies.js — AOP, Proxies & Annotations

   Fourteen questions, no subsections. This topic is small and it is the one
   that explains the behaviour of half the annotations in the framework: why
   @Transactional does nothing on an internal call, why @Async returns null,
   why a final method cannot be advised. Everything here is one mechanism seen
   from several angles, which is why it is not split up.

   ONE GLOBAL PER FILE.
   ========================================================================== */

const aopProxiesData = {
    id: 'aop-proxies',
    title: 'AOP, Proxies & Annotations',
    subsections: null,
    keyTopics: [
        'JDK dynamic proxy vs CGLIB', 'self-invocation', 'advice types',
        'pointcut expressions', 'proxy-target-class', '@Async', '@Cacheable',
        '@Retryable', 'custom annotations'
    ],
    questions: [

{
    id: 'how-spring-aop-works',
    importance: 'must-know',
    subsection: null,
    question: 'How does Spring AOP work, and how is it different from AspectJ?',
    answer:
        '<p>Spring AOP is <strong>proxy-based</strong>. During bean initialisation a ' +
        '<code>BeanPostProcessor</code> notices that a bean matches a pointcut and returns a ' +
        '<em>proxy</em> in its place. Every call that arrives through the container-injected ' +
        'reference goes to the proxy, which runs the advice and then delegates to the real ' +
        'object.</p>' +
        '<p>AspectJ is a different technology: it <strong>rewrites bytecode</strong>, either at ' +
        'compile time or by a load-time weaving agent. There is no proxy and no delegation — the ' +
        'advice is compiled into the method itself.</p>' +
        '<p>Everything that follows from that distinction is what interviews actually probe:</p>' +
        '<ul>' +
        '<li><strong>Spring AOP only intercepts calls that cross the proxy.</strong> An internal ' +
        'call, a call to a private method, a call on a field — none of them are advised. ' +
        'AspectJ advises all of them.</li>' +
        '<li><strong>Spring AOP only advises Spring beans.</strong> An object created with ' +
        '<code>new</code> is invisible to it. AspectJ does not care where the object came ' +
        'from.</li>' +
        '<li><strong>Spring AOP is method execution only.</strong> No field access, no ' +
        'constructor interception, no static methods.</li>' +
        '<li><strong>Spring AOP needs no build or JVM setup</strong>, which is why it is the ' +
        'default. AspectJ needs a compiler plugin or a <code>-javaagent</code>.</li>' +
        '</ul>' +
        '<p>Spring AOP uses the AspectJ <em>annotations and pointcut language</em> while keeping ' +
        'its own proxy runtime, which is why the syntax looks identical and the behaviour is ' +
        'not. Spring can also delegate to real AspectJ load-time weaving with ' +
        '<code>@EnableLoadTimeWeaving</code> when the proxy limitations genuinely block ' +
        'something.</p>',
    referenceLinks: [
        { title: 'Aspect Oriented Programming with Spring — Spring Framework Reference', url: 'https://docs.spring.io/spring-framework/reference/core/aop.html' }
    ],
    tags: ['spring', 'aop', 'proxies', 'aspectj'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'jdk-proxy-vs-cglib',
    importance: 'must-know',
    subsection: null,
    question: 'JDK dynamic proxy or CGLIB — how does Spring choose, and what does each require?',
    answer:
        '<p>A <strong>JDK dynamic proxy</strong> implements interfaces. It is created by the JDK ' +
        'itself, it can only be cast to the interfaces it implements, and the target class is ' +
        'irrelevant to it.</p>' +
        '<p><strong>CGLIB</strong> generates a <em>subclass</em> of the target and overrides its ' +
        'methods. It works on classes with no interface at all.</p>' +
        '<p><strong>Since Spring Boot 2.0, CGLIB is the default for everything</strong>, whether ' +
        'or not the bean implements an interface. <code>proxyTargetClass</code> defaults to ' +
        'true. That changed because the JDK proxy caused a specific and confusing failure: a ' +
        'class implementing one interface incidentally would be proxied to that interface only, ' +
        'and injecting it by its concrete type failed at startup with "expected single matching ' +
        'bean" or a <code>ClassCastException</code>.</p>' +
        '<p><strong>What CGLIB requires:</strong></p>' +
        '<ul>' +
        '<li><strong>The class must not be <code>final</code></strong>, and neither may the ' +
        'methods you want advised. A <code>final</code> method is silently not overridden, so ' +
        'the advice silently does not run — no error, no warning.</li>' +
        '<li><strong><code>private</code> methods are never advised</strong>, for the same ' +
        'reason.</li>' +
        '<li><strong>The class needs a usable constructor.</strong> Modern Spring uses Objenesis ' +
        'to instantiate the subclass without calling a constructor, which removed the old ' +
        'requirement for a no-arg one.</li>' +
        '</ul>' +
        '<p>This is also why Kotlin classes need the <code>all-open</code> compiler plugin for ' +
        'Spring: Kotlin classes are final by default, so nothing can be proxied. Worth knowing ' +
        'as context even though this deck is Java.</p>' +
        '<p>To tell which you have, print <code>bean.getClass().getName()</code>: a CGLIB proxy ' +
        'contains <code>$$SpringCGLIB$$</code>, and a JDK proxy is named <code>$Proxy</code> ' +
        'followed by a number.</p>',
    referenceLinks: [
        { title: 'Proxying Mechanisms — Spring Framework Reference', url: 'https://docs.spring.io/spring-framework/reference/core/aop/proxying.html' }
    ],
    tags: ['spring', 'aop', 'proxies', 'cglib'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'self-invocation',
    importance: 'must-know',
    subsection: null,
    question: 'Why does @Transactional have no effect when one method of a class calls another method of the same class?',
    answer:
        '<p>Because the annotation is implemented by a <em>proxy</em>. The bean the container ' +
        'hands to your callers is not your class; it is a generated object that wraps it, opens ' +
        'a transaction, delegates, and commits or rolls back.</p>' +
        '<p>An internal call — <code>this.other()</code> — goes straight to the target instance. ' +
        'It never crosses the proxy, so the advice never runs and there is no transaction. ' +
        '<strong>Nothing throws and nothing logs: the annotation is simply inert.</strong> That ' +
        'silence is what makes this the most expensive gap in Spring knowledge.</p>' +
        '<p>The same limitation applies to every proxy-based annotation — <code>@Async</code>, ' +
        '<code>@Cacheable</code>, <code>@Retryable</code>, <code>@PreAuthorize</code>, ' +
        '<code>@Validated</code>. Being able to say that is what separates having read the ' +
        'annotation from having understood the mechanism.</p>' +
        '<p><strong>The fixes, best first:</strong></p>' +
        '<ul>' +
        '<li><strong>Move the method to another bean.</strong> The call then crosses a proxy for ' +
        'the ordinary reason, and the boundary is where a reader would look for it.</li>' +
        '<li><strong>Use <code>TransactionTemplate</code></strong> and open the transaction ' +
        'explicitly. No proxy, no annotation, no ambiguity.</li>' +
        '<li><strong>Inject the bean into itself</strong> with <code>@Lazy</code> and call ' +
        '<code>self.method()</code>. Works, and leaves a puzzle for the next reader.</li>' +
        '<li><strong><code>AopContext.currentProxy()</code></strong> with ' +
        '<code>exposeProxy = true</code>. Works, and couples the class to Spring AOP.</li>' +
        '<li><strong>AspectJ load-time weaving</strong>, which advises the internal call too. A ' +
        'large hammer for this particular nail.</li>' +
        '</ul>',
    referenceLinks: [
        { title: 'Understanding the Spring Framework Transaction Abstraction', url: 'https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/annotations.html' }
    ],
    tags: ['spring', 'aop', 'proxies', 'transactions', 'self-invocation'],
    images: [],
    hasDiagram: true,
    diagramType: 'sequence',
    diagramConfig: {
        title: 'The transaction that never starts',
        actors: [
            { id: 'caller', label: 'Caller' },
            { id: 'proxy',  label: 'Proxy' },
            { id: 'target', label: 'OrderService' }
        ],
        messages: [
            { from: 'caller', to: 'proxy',  label: 'placeOrder()' },
            { from: 'proxy',  to: 'target', label: 'delegates, no @Transactional here' },
            { from: 'target', to: 'target', label: 'this.persist() bypasses the proxy' },
            { from: 'target', to: 'proxy',  label: 'returns, nothing committed', kind: 'return' }
        ]
    },
    codeSnippets: [
        {
            language: 'java',
            title: 'The annotation that does nothing',
            code:
                '@Service\n' +
                'public class OrderService {\n' +
                '\n' +
                '    public void placeOrder(Order order) {\n' +
                '        // Straight to the target instance. The proxy is not involved,\n' +
                '        // so the annotation below has no effect whatsoever.\n' +
                '        this.persist(order);\n' +
                '    }\n' +
                '\n' +
                '    @Transactional\n' +
                '    public void persist(Order order) {\n' +
                '        repository.save(order);\n' +
                '        auditLog.record(order);   // not rolled back if this throws\n' +
                '    }\n' +
                '}',
            output: {
                kind: 'trace',
                lines: [
                    'placeOrder() is called through the proxy, so the proxy is active for it.',
                    'placeOrder() is not annotated, so no transaction is opened.',
                    'this.persist(order) resolves on the target instance, bypassing the proxy.',
                    'The @Transactional advice never runs; persist() executes with no transaction.',
                    'repository.save() commits on its own; auditLog.record() throwing leaves it committed.'
                ],
                explain:
                    '<p>The damage is not that the transaction is missing. It is that the first ' +
                    'write has already been committed by the time the second one fails, which ' +
                    'is the exact outcome the annotation was added to prevent.</p>'
            }
        }
    ]
},

{
    id: 'advice-types-and-order',
    importance: 'should-know',
    subsection: null,
    question: 'What are the advice types, and in what order do they run?',
    answer:
        '<p>Five, and the order around a successful call is fixed:</p>' +
        '<ul>' +
        '<li><strong><code>@Around</code></strong> — before the join point.</li>' +
        '<li><strong><code>@Before</code></strong>.</li>' +
        '<li>the method itself.</li>' +
        '<li><strong><code>@AfterReturning</code></strong>, which receives the return value.</li>' +
        '<li><strong><code>@After</code></strong>, the finally-style advice that runs either ' +
        'way.</li>' +
        '<li><strong><code>@Around</code></strong> again, after the join point.</li>' +
        '</ul>' +
        '<p>On an exception, <code>@AfterThrowing</code> replaces <code>@AfterReturning</code> ' +
        'and <code>@After</code> still runs.</p>' +
        '<p><strong><code>@Around</code> is the only one that can change anything</strong> — ' +
        'suppress the call, alter the arguments, replace the return value, swallow or translate ' +
        'an exception. It receives a <code>ProceedingJoinPoint</code>, and if it forgets to call ' +
        '<code>proceed()</code> the target method never runs at all. That is a real bug and a ' +
        'quiet one.</p>' +
        '<p><strong>Between aspects</strong>, order is undefined unless you say so: implement ' +
        '<code>Ordered</code> or use <code>@Order</code>. A lower number runs earlier on the way ' +
        'in and later on the way out, like nested wrappers. This matters whenever two aspects ' +
        'interact — a security check must run before a caching aspect, or the cache will serve a ' +
        'result to someone who is not allowed to see it.</p>' +
        '<p>Spring\'s own advice has assigned orders too, which is why ' +
        '<code>@Transactional</code> and <code>@Cacheable</code> on the same method have a ' +
        'defined relationship worth checking rather than assuming.</p>',
    referenceLinks: [
        { title: 'Advice Ordering — Spring Framework Reference', url: 'https://docs.spring.io/spring-framework/reference/core/aop/ataspectj/advice.html' }
    ],
    tags: ['spring', 'aop', 'advice', 'ordering'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'pointcut-expressions',
    importance: 'should-know',
    subsection: null,
    question: 'How do you write a pointcut, and which designators actually get used?',
    answer:
        '<p>A pointcut selects join points. In Spring AOP a join point is always a method ' +
        'execution, so the vocabulary is smaller than AspectJ\'s.</p>' +
        '<p>The ones that come up:</p>' +
        '<ul>' +
        '<li><strong><code>execution(...)</code></strong> — the general one. ' +
        '<code>execution(* com.example.service.*.*(..))</code> means any return type, any class ' +
        'in that package, any method, any arguments.</li>' +
        '<li><strong><code>@annotation(com.example.Audited)</code></strong> — methods carrying ' +
        'an annotation. This is how you build your own <code>@Audited</code> or ' +
        '<code>@Timed</code>, and it is by far the most maintainable option because the ' +
        'selection is visible at the method rather than encoded in a string somewhere ' +
        'else.</li>' +
        '<li><strong><code>within(com.example.service..*)</code></strong> — everything inside a ' +
        'package tree.</li>' +
        '<li><strong><code>@within</code></strong> and <strong><code>@target</code></strong> — ' +
        'classes carrying an annotation, checked at declaration and at runtime ' +
        'respectively.</li>' +
        '<li><strong><code>bean(*Service)</code></strong> — a Spring-only designator matching ' +
        'bean names.</li>' +
        '<li><strong><code>args(..)</code></strong> — matching on argument types, and the form ' +
        'that binds arguments into the advice method.</li>' +
        '</ul>' +
        '<p>Two practices worth adopting. <strong>Name your pointcuts</strong> — an empty method ' +
        'annotated <code>@Pointcut</code> — and refer to them by name, so the expression is ' +
        'written once and can be combined with <code>&amp;&amp;</code>, <code>||</code> and ' +
        '<code>!</code>. And <strong>prefer <code>@annotation</code> to package patterns</strong>: ' +
        'a pointcut matching <code>com.example.service..*</code> silently stops matching when ' +
        'somebody moves a package, and nothing fails — the advice just quietly stops ' +
        'applying.</p>' +
        '<p>That silent-failure property is the main risk of AOP generally, and it is why ' +
        'aspects deserve a test that asserts the advice actually ran.</p>',
    referenceLinks: [
        { title: 'Declaring a Pointcut — Spring Framework Reference', url: 'https://docs.spring.io/spring-framework/reference/core/aop/ataspectj/pointcuts.html' }
    ],
    tags: ['spring', 'aop', 'pointcuts'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: [
        {
            language: 'java',
            title: 'A custom annotation and the aspect that implements it',
            code:
                '@Target(ElementType.METHOD)\n' +
                '@Retention(RetentionPolicy.RUNTIME)   // RUNTIME, or the proxy cannot see it\n' +
                'public @interface Timed {\n' +
                '    String value() default "";\n' +
                '}\n' +
                '\n' +
                '@Aspect\n' +
                '@Component\n' +
                'public class TimingAspect {\n' +
                '\n' +
                '    private final MeterRegistry registry;\n' +
                '\n' +
                '    TimingAspect(MeterRegistry registry) { this.registry = registry; }\n' +
                '\n' +
                '    // Binding the annotation as a parameter gives access to its members.\n' +
                '    @Around("@annotation(timed)")\n' +
                '    public Object time(ProceedingJoinPoint pjp, Timed timed) throws Throwable {\n' +
                '        String name = timed.value().isEmpty()\n' +
                '                ? pjp.getSignature().toShortString()\n' +
                '                : timed.value();\n' +
                '\n' +
                '        long start = System.nanoTime();\n' +
                '        try {\n' +
                '            return pjp.proceed();          // forget this and the method never runs\n' +
                '        } finally {\n' +
                '            registry.timer(name).record(System.nanoTime() - start, NANOSECONDS);\n' +
                '        }\n' +
                '    }\n' +
                '}',
            output: {
                kind: 'trace',
                lines: [
                    'RetentionPolicy.RUNTIME is required: the default CLASS is invisible to reflection.',
                    'The @annotation designator binds the annotation instance into the advice parameter.',
                    'Around advice wraps the call, so the timer covers exactly the method execution.',
                    'proceed() runs the target; omitting it silently skips the method entirely.',
                    'The finally block records even when the method throws, which is usually what you want.'
                ],
                explain:
                    '<p>The retention policy is the mistake that costs the most time here. The ' +
                    'default is <code>CLASS</code>, which means the annotation is in the class ' +
                    'file and not readable by reflection — so the pointcut matches nothing, and ' +
                    'nothing anywhere reports a problem.</p>'
            }
        }
    ]
},

{
    id: 'async-returns-null',
    importance: 'must-know',
    subsection: null,
    question: 'Why does an @Async method sometimes not run asynchronously, or return null?',
    answer:
        '<p>Four causes, all traceable to the proxy.</p>' +
        '<ul>' +
        '<li><strong><code>@EnableAsync</code> is missing.</strong> Without it there is no ' +
        'aspect, so the annotation is inert and the method runs synchronously. Spring Boot does ' +
        'not enable it for you.</li>' +
        '<li><strong>Self-invocation.</strong> Calling the async method from another method of ' +
        'the same class bypasses the proxy. It runs on the calling thread, silently.</li>' +
        '<li><strong>The method is <code>private</code>, <code>final</code>, or the class is ' +
        '<code>final</code>.</strong> CGLIB cannot override it.</li>' +
        '<li><strong>The return type is a plain object.</strong> An <code>@Async</code> method ' +
        'must return <code>void</code>, <code>Future</code>, <code>CompletableFuture</code> or ' +
        '<code>ListenableFuture</code>. Anything else cannot work — the proxy has to return ' +
        '<em>something</em> immediately, before the real method has produced a value, so it ' +
        'returns <code>null</code>.</li>' +
        '</ul>' +
        '<p>Two further traps once it does work. <strong>An exception from a <code>void</code> ' +
        '<code>@Async</code> method disappears</strong> — there is no future to carry it and ' +
        'nobody to catch it. Register an <code>AsyncUncaughtExceptionHandler</code>, or return a ' +
        '<code>CompletableFuture</code> so the failure has somewhere to go.</p>' +
        '<p>And <strong>the executor matters.</strong> Without one configured, older Spring used ' +
        'a <code>SimpleAsyncTaskExecutor</code>, which creates a new thread per call and pools ' +
        'nothing — fine in a demo and a way to exhaust a machine in production. Define a ' +
        '<code>ThreadPoolTaskExecutor</code> bean with a bounded queue and a rejection policy, ' +
        'or enable virtual threads.</p>' +
        '<p>Note also that <code>ThreadLocal</code>-based context — the security context, MDC ' +
        'correlation ids, the request scope — does not cross to the async thread unless it is ' +
        'propagated deliberately.</p>',
    referenceLinks: [
        { title: 'Using @Async — Spring Framework Reference', url: 'https://docs.spring.io/spring-framework/reference/integration/scheduling.html' }
    ],
    tags: ['spring', 'aop', 'async', 'proxies', 'threading'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'cacheable-behaviour',
    importance: 'should-know',
    subsection: null,
    question: 'What are the failure modes of @Cacheable?',
    answer:
        '<p>Beyond self-invocation and <code>final</code> methods, which it shares with every ' +
        'proxy-based annotation:</p>' +
        '<ul>' +
        '<li><strong>The key is derived from the parameters by default</strong>, using a ' +
        '<code>SimpleKeyGenerator</code>. A method whose result depends on anything else — the ' +
        'current user, the tenant, a request header — will serve one caller\'s data to another. ' +
        'This is a confidentiality bug, and it is the most damaging thing on this list.</li>' +
        '<li><strong>A null return is cached by default.</strong> Sometimes right, and sometimes ' +
        'it pins a miss in place; <code>unless = "#result == null"</code> is the switch.</li>' +
        '<li><strong><code>@CacheEvict</code> runs after the method by default</strong>, so a ' +
        'failure after a successful write leaves a stale entry. <code>beforeInvocation = ' +
        'true</code> evicts first, which trades a stale entry for an extra miss.</li>' +
        '<li><strong>No stampede protection unless you ask.</strong> Ten concurrent misses on ' +
        'the same key all call the method. <code>sync = true</code> serialises them, and it is ' +
        'not the default.</li>' +
        '<li><strong>Mutable cached values are shared.</strong> A local cache returns the same ' +
        'object to every caller, so one caller mutating it changes what everyone else sees. A ' +
        'distributed cache serialises and does not have this problem, which means the bug only ' +
        'appears in one of the two environments.</li>' +
        '</ul>' +
        '<p>The abstraction sits over a <code>CacheManager</code>, so the same annotations work ' +
        'against Caffeine, Redis, Hazelcast or a simple map. That portability is genuine, and it ' +
        'hides a real difference: a local cache is per-instance, so with three replicas there ' +
        'are three caches with independent contents and independent eviction.</p>',
    referenceLinks: [
        { title: 'Cache Abstraction — Spring Framework Reference', url: 'https://docs.spring.io/spring-framework/reference/integration/cache.html' }
    ],
    tags: ['spring', 'aop', 'caching', 'security'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'proxy-and-postconstruct',
    importance: 'should-know',
    subsection: null,
    question: 'Why does calling an annotated method from @PostConstruct not work?',
    answer:
        '<p>Because the proxy does not exist yet.</p>' +
        '<p>Proxies are created by a <code>BeanPostProcessor</code> in ' +
        '<code>postProcessAfterInitialization</code> — the step <em>after</em> initialisation. ' +
        '<code>@PostConstruct</code> runs during initialisation, so at that moment ' +
        '<code>this</code> is the raw object and no advice is attached to anything.</p>' +
        '<p>So a <code>@Transactional</code> method called from <code>@PostConstruct</code> runs ' +
        'without a transaction, an <code>@Async</code> one runs synchronously, and a ' +
        '<code>@Cacheable</code> one does not cache. Same silence as self-invocation, different ' +
        'cause.</p>' +
        '<p>It compounds with a second problem: at <code>@PostConstruct</code> time, other beans ' +
        'this one does not depend on may not exist yet. Startup work that touches the ' +
        'application as a whole is running against a half-built container.</p>' +
        '<p><strong>The fix is to move the work later.</strong> An ' +
        '<code>ApplicationRunner</code>, a <code>CommandLineRunner</code>, or a listener for ' +
        '<code>ApplicationReadyEvent</code> all run after the context is fully refreshed — every ' +
        'bean exists, and every proxy is in place. For work that must happen per bean rather ' +
        'than per application, <code>SmartInitializingSingleton</code> runs after all singletons ' +
        'are instantiated.</p>' +
        '<p>Related and worth knowing: injecting <code>this</code> anywhere during construction ' +
        '— registering a listener, starting a thread — publishes the raw object, so whatever ' +
        'holds it will never see the proxy either.</p>',
    referenceLinks: [
        { title: 'Customizing the Nature of a Bean', url: 'https://docs.spring.io/spring-framework/reference/core/beans/factory-nature.html' }
    ],
    tags: ['spring', 'aop', 'proxies', 'lifecycle'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'writing-a-custom-annotation',
    importance: 'should-know',
    subsection: null,
    question: 'How do you build your own annotation-driven behaviour?',
    answer:
        '<p>Three pieces, and one of them is where people lose an afternoon.</p>' +
        '<ul>' +
        '<li><strong>The annotation.</strong> <code>@Target</code> to say where it may be ' +
        'applied, and <strong><code>@Retention(RetentionPolicy.RUNTIME)</code></strong> — this ' +
        'is the one. The default is <code>CLASS</code>, which puts the annotation in the class ' +
        'file but not in the reflective view, so the pointcut matches nothing and nothing ' +
        'reports an error.</li>' +
        '<li><strong>The aspect.</strong> An <code>@Aspect</code> <code>@Component</code> with ' +
        '<code>@Around("@annotation(myAnnotation)")</code>, binding the annotation as a ' +
        'parameter so its members are readable.</li>' +
        '<li><strong>Registration.</strong> Spring Boot enables AspectJ auto-proxying when ' +
        '<code>spring-boot-starter-aop</code> is present. Outside Boot, ' +
        '<code>@EnableAspectJAutoProxy</code>.</li>' +
        '</ul>' +
        '<p><strong>Meta-annotations</strong> are the other technique worth knowing, and they ' +
        'need no aspect at all. Spring resolves annotations transitively, so an annotation ' +
        'annotated with <code>@Transactional</code> and <code>@Service</code> behaves as both. ' +
        'That is how <code>@RestController</code> works — it is <code>@Controller</code> plus ' +
        '<code>@ResponseBody</code> — and it lets a codebase define ' +
        '<code>@DomainService</code> once and use it everywhere.</p>' +
        '<p>Before writing an aspect, check whether something else already does it: a filter or ' +
        'an interceptor for web concerns, a <code>BeanPostProcessor</code> for construction-time ' +
        'behaviour, Micrometer\'s <code>@Timed</code> and <code>@Counted</code> for metrics, ' +
        'Spring Security\'s annotations for authorisation. An aspect is powerful and it makes ' +
        'behaviour invisible at the call site, which is a real cost to pay only when the ' +
        'crosscutting is genuine.</p>',
    referenceLinks: [
        { title: '@AspectJ Support', url: 'https://docs.spring.io/spring-framework/reference/core/aop/ataspectj.html' }
    ],
    tags: ['spring', 'aop', 'annotations', 'meta-annotations'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'filters-interceptors-aspects',
    importance: 'should-know',
    subsection: null,
    question: 'Filter, HandlerInterceptor or aspect — which do you use for a cross-cutting concern?',
    answer:
        '<p>They sit at different depths, and the right one is the shallowest that has the ' +
        'information you need.</p>' +
        '<ul>' +
        '<li><strong>A servlet <code>Filter</code></strong> wraps the whole request, outside ' +
        'Spring MVC entirely. It sees every request including static resources and errors, and ' +
        'it can replace the request and response objects. It knows nothing about which handler ' +
        'will run. Use it for correlation ids, request logging, CORS, compression, security ' +
        '— anything that must apply to everything.</li>' +
        '<li><strong>A <code>HandlerInterceptor</code></strong> runs inside ' +
        '<code>DispatcherServlet</code>, so it knows which controller method was selected and ' +
        'can act before and after it, and after the view renders. Use it when the decision ' +
        'depends on the handler.</li>' +
        '<li><strong>An aspect</strong> is not web-aware at all. It advises any bean method, ' +
        'including service and repository layers. Use it when the concern applies below the web ' +
        'layer or in a non-web application.</li>' +
        '</ul>' +
        '<p>Order of execution: filter, then interceptor, then any aspects on the controller ' +
        'method, then the method. Unwinding in reverse.</p>' +
        '<p>The practical selection rule: if the concern is about HTTP, use a filter or an ' +
        'interceptor — they have the request and response, and an aspect would have to fetch ' +
        'them from a thread local. If the concern is about domain operations, use an aspect, ' +
        'because those operations also happen from a message listener or a scheduled job where ' +
        'no request exists at all.</p>' +
        '<p>Also worth naming: <code>@ControllerAdvice</code> for exception handling across ' +
        'controllers, which is neither of the three and is the right tool for that specific ' +
        'job.</p>',
    referenceLinks: [
        { title: 'Spring Web MVC — Interceptors', url: 'https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-config/interceptors.html' }
    ],
    tags: ['spring', 'aop', 'filters', 'interceptors', 'web'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'retryable-and-resilience',
    importance: 'good-to-know',
    subsection: null,
    question: 'How does @Retryable work, and what must you check before adding it?',
    answer:
        '<p>Same mechanism: a proxy catches the configured exceptions and calls the method ' +
        'again, with a back-off policy. <code>@Recover</code> names a fallback invoked when the ' +
        'attempts are exhausted, and its signature must match the exception and the original ' +
        'return type or it is silently not used.</p>' +
        '<p><strong>Check three things before adding it:</strong></p>' +
        '<ul>' +
        '<li><strong>Is the operation idempotent?</strong> Retrying a payment or a non-idempotent ' +
        'POST charges twice. Retry is safe for reads and for writes carrying an idempotency ' +
        'key; it is dangerous for everything else.</li>' +
        '<li><strong>Is the exception retryable?</strong> Retrying a validation failure or a 400 ' +
        'just fails more slowly. Configure the specific transient exceptions rather than ' +
        '<code>Exception</code>.</li>' +
        '<li><strong>Is there a total time budget?</strong> Three retries with exponential ' +
        'back-off can turn a two-second call into thirty seconds, which may exceed the caller\'s ' +
        'own timeout — so the work is done and nobody is listening.</li>' +
        '</ul>' +
        '<p><strong>Always use exponential back-off with jitter.</strong> Fixed-delay retries ' +
        'from many instances synchronise into a thundering herd against a service that is ' +
        'already struggling, which is how a brief blip becomes an outage.</p>' +
        '<p><strong>Know where the library stands.</strong> The <code>spring-retry</code> ' +
        'repository was moved to <code>spring-attic</code> and marked archived, so ' +
        '<code>@Retryable</code> is a maintained-but-not-developed API. It still works, ' +
        'and Spring Boot still manages its version — but new code with a free choice ' +
        'should reach for Resilience4j, which is where the investment is.</p>' +
        '<p>Retry belongs with a <strong>circuit breaker</strong>, not instead of one. Retry ' +
        'handles a transient failure; a breaker stops hammering a dependency that is genuinely ' +
        'down. Resilience4j provides both plus a bulkhead and a rate limiter, and its ordering ' +
        'of the decorators is defined and worth reading rather than guessing.</p>',
    referenceLinks: [
        { title: 'Resilience4j — Getting Started', url: 'https://resilience4j.readme.io/docs/getting-started' }
    ],
    tags: ['spring', 'aop', 'retry', 'resilience', 'idempotency'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'transactional-on-private',
    importance: 'good-to-know',
    subsection: null,
    question: 'What happens if you put @Transactional on a private or final method?',
    answer:
        '<p>Nothing happens, and that is precisely the problem — there is no error at either ' +
        'compile time or run time.</p>' +
        '<ul>' +
        '<li><strong><code>private</code></strong> — CGLIB generates a subclass and can only ' +
        'override what is visible to a subclass. A private method is not, so it is never ' +
        'intercepted.</li>' +
        '<li><strong><code>final</code></strong> — cannot be overridden by definition.</li>' +
        '<li><strong><code>static</code></strong> — not an instance method, so there is nothing ' +
        'to proxy.</li>' +
        '<li><strong>A <code>final</code> class</strong> — no subclass can be generated at all, ' +
        'so nothing on it is advised.</li>' +
        '</ul>' +
        '<p>Spring can be made to complain about some of these. AspectJ-mode transaction ' +
        'management errors on a non-public <code>@Transactional</code> method, and some IDEs and ' +
        'static analysers flag it. In the default proxy mode the annotation is simply ignored.</p>' +
        '<p>The general defence is to <strong>treat "the annotation did nothing" as a first ' +
        'hypothesis</strong> whenever a proxy-based behaviour appears absent, and to check the ' +
        'four conditions: is it public, is it non-final, is the class non-final, and is the call ' +
        'arriving from outside the bean. Between them they explain almost every report of ' +
        '"<code>@Transactional</code> is not working".</p>' +
        '<p>A test that asserts the behaviour — that a rollback actually rolls back — is the ' +
        'only thing that catches this reliably, because reading the code shows an annotation ' +
        'that looks right.</p>',
    referenceLinks: [
        { title: 'Using @Transactional', url: 'https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/annotations.html' }
    ],
    tags: ['spring', 'aop', 'proxies', 'transactions'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'aop-performance',
    importance: 'good-to-know',
    subsection: null,
    question: 'What does AOP cost at runtime?',
    answer:
        '<p>Less than people fear, and in specific places more than they expect.</p>' +
        '<p><strong>Per call</strong>, a proxy adds an extra virtual call and an interceptor ' +
        'chain walk. For a method that touches a database or a network this is unmeasurable. For ' +
        'a getter called in a tight loop it is not — and it also blocks inlining, which is the ' +
        'optimisation the JIT would otherwise apply most aggressively to a tiny method.</p>' +
        '<p><strong>At startup</strong>, every bean is checked against every pointcut, and CGLIB ' +
        'generates a class for each match. In a large application with several aspects this is ' +
        'a measurable part of the boot time, and it is one reason ' +
        '<code>proxyBeanMethods = false</code> exists for configuration classes.</p>' +
        '<p><strong>In memory</strong>, each generated class occupies metaspace.</p>' +
        '<p>The costs that matter more than the CPU:</p>' +
        '<ul>' +
        '<li><strong>Stack traces get longer</strong> and acquire frames from the proxy and the ' +
        'interceptor chain, which makes reading a production trace slower.</li>' +
        '<li><strong>Behaviour becomes invisible at the call site.</strong> Nothing in the source ' +
        'of a caller says a transaction is opened, or that the result is cached, or that a retry ' +
        'may happen. That is the real price of AOP and the reason to use it for genuinely ' +
        'crosscutting concerns rather than for business logic.</li>' +
        '</ul>' +
        '<p>Narrow the pointcuts. An aspect matching <code>execution(* com.example..*(..))</code> ' +
        'proxies the entire application to advise a handful of methods; ' +
        '<code>@annotation</code> proxies only the beans that actually carry the annotation.</p>',
    referenceLinks: [
        { title: 'Understanding AOP Proxies', url: 'https://docs.spring.io/spring-framework/reference/core/aop/proxying.html' }
    ],
    tags: ['spring', 'aop', 'performance', 'startup'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'testing-aspects',
    importance: 'good-to-know',
    subsection: null,
    question: 'How do you test that an aspect is actually applied?',
    answer:
        '<p>This deserves a test precisely because the failure mode is silence. A pointcut that ' +
        'stops matching — because a package moved, a method became final, or a call became ' +
        'internal — produces no error at all, and the behaviour simply stops.</p>' +
        '<p>Options, from cheapest:</p>' +
        '<ul>' +
        '<li><strong>Unit-test the advice itself.</strong> An <code>@Around</code> method takes ' +
        'a <code>ProceedingJoinPoint</code>, which can be mocked. This tests the logic and ' +
        '<em>not</em> whether the pointcut matches, which is the part that breaks.</li>' +
        '<li><strong>A slice test with the aspect and one target bean.</strong> ' +
        '<code>@SpringBootTest</code> with a narrow configuration, or an ' +
        '<code>ApplicationContextRunner</code>, then call the method and assert the side effect ' +
        '— the counter incremented, the transaction rolled back, the second call was cached.</li>' +
        '<li><strong>Assert the bean is proxied.</strong> ' +
        '<code>AopUtils.isAopProxy(bean)</code> and <code>AopUtils.isCglibProxy(bean)</code> ' +
        'turn "is this advised at all" into an assertion. Blunt, and it catches the common ' +
        'regression.</li>' +
        '<li><strong>Test the behaviour, not the mechanism.</strong> For ' +
        '<code>@Transactional</code>, the real test is that a failure halfway through leaves ' +
        'nothing written — which is an integration test with a real database, and is worth ' +
        'having for the transactional paths that matter.</li>' +
        '</ul>' +
        '<p>The habit worth building: whenever you rely on a proxy-based annotation for ' +
        '<em>correctness</em> rather than for convenience, write the test that fails if the ' +
        'proxy stops applying. Caching quietly not caching is a performance regression; a ' +
        'transaction quietly not opening is data loss.</p>',
    referenceLinks: [
        { title: '@AspectJ Support', url: 'https://docs.spring.io/spring-framework/reference/core/aop/ataspectj.html' }
    ],
    tags: ['spring', 'aop', 'testing', 'proxies'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
}

    ]
};
