/* ==========================================================================
   data/theory/application-lifecycle.js — module 32 in the reading path

   Seven chapters on what run() does and what shutdown does not. The
   graceful-shutdown chapter is the one that earns the module: almost every
   Kubernetes deployment drops requests during a rollout, and the reason is
   in the gap between "the pod was told to stop" and "the load balancer
   stopped sending it traffic".
   ========================================================================== */

const applicationLifecycleModule = {
    id: 'application-lifecycle',
    trackId: 'spring-core',
    order: 32,
    title: 'SpringApplication, Start to Stop',
    tagline: 'What run() does, and what shutdown does not.',
    estimatedMinutes: 30,
    prerequisites: ['autoconfiguration'],
    docHub: { title: 'Spring Boot Features — SpringApplication', url: 'https://docs.spring.io/spring-boot/reference/features/spring-application.html' },

    chapters: [
        {
            id: 'run-step-by-step',
            title: 'What run() Actually Does',
            importance: 'should-know',
            summary: 'Deduce the application type, build an Environment, create the right context, refresh it, then call the runners. Eight steps, and the interesting ones are the first and the last.',
            interviewAngle: 'Asked as "walk me through what happens when a Spring Boot application starts". A rough ordered list is fine; the details worth having are that the application type is deduced from the class path and that refresh() is where the beans get built.',
            buildsOn: [],
            blocks: [
                {
                    type: 'types',
                    title: 'The sequence',
                    items: [
                        { name: '1. Deduce the application type', html: '<p>Servlet, reactive, or none — decided by what is on the class path. <code>DispatcherServlet</code> present means servlet; only <code>WebFlux</code> means reactive; neither means a plain application that exits when <code>run()</code> returns.</p>' },
                        { name: '2. Load initialisers and listeners', html: '<p><code>ApplicationContextInitializer</code> and <code>ApplicationListener</code> implementations, read from <code>spring.factories</code>. Note that this one file <em>is</em> still used for these — only auto-configuration moved.</p>' },
                        { name: '3. Prepare the Environment', html: '<p>Property sources are assembled and profiles resolved. This happens <strong>before any bean exists</strong>, which is the subject of the next chapter.</p>' },
                        { name: '4. Print the banner', html: '<p>The one step nobody asks about.</p>' },
                        { name: '5. Create the ApplicationContext', html: '<p>The type chosen in step one, still empty.</p>' },
                        { name: '6. Prepare the context', html: '<p>Apply the initialisers, register the primary sources, fire <code>ApplicationContextInitializedEvent</code> and then <code>ApplicationPreparedEvent</code>.</p>' },
                        { name: '7. refresh()', html: '<p><strong>The big one.</strong> Bean definitions are registered, post-processors run, every singleton is instantiated and wired, and the embedded server starts. Everything in the container module happens inside this call.</p>' },
                        { name: '8. Call the runners', html: '<p><code>ApplicationRunner</code> and <code>CommandLineRunner</code>, then <code>ApplicationReadyEvent</code>. The application is now serving.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>If you only keep one thing: <code>refresh()</code> is where the container does its work, and it is a single method call inside <code>run()</code>. Everything about bean lifecycle, post-processors and proxying happens in step seven, and everything before it is setup for that step.</p>'
                }
            ],
            docs: [
                { title: 'SpringApplication', url: 'https://docs.spring.io/spring-boot/reference/features/spring-application.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-boot', questionId: 'springapplication-run-lifecycle' }
            ]
        },

        {
            id: 'environment-preparation',
            title: 'Before Any Bean Exists',
            importance: 'good-to-know',
            summary: 'The Environment is fully assembled in step three, which is why an EnvironmentPostProcessor can add a property source and a BeanFactoryPostProcessor cannot do it in time.',
            interviewAngle: 'Comes up when someone needs to inject configuration from somewhere unusual — a secret manager, a remote service, a decrypted file. Knowing the right extension point, and that it is registered in spring.factories rather than as a bean, is the answer.',
            buildsOn: ['run-step-by-step'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>Configuration has to be complete before the container starts building beans, because bean definitions themselves contain <code>${...}</code> placeholders and conditions read properties. So the <code>Environment</code> is assembled early, by machinery that cannot be a bean — a bean would need a container, and the container needs the configuration.</p><p>The extension point is <code>EnvironmentPostProcessor</code>, registered in <code>META-INF/spring.factories</code> and instantiated by reflection. It receives the <code>Environment</code> and the <code>SpringApplication</code> and can add, remove or reorder property sources before anything else sees them.</p>'
                },
                {
                    type: 'types',
                    title: 'The three early extension points, in order',
                    items: [
                        { name: 'EnvironmentPostProcessor', html: '<p>Earliest. Add a property source — decrypted secrets, a remote config fetch, a computed default. Cannot use injection; it is not a bean.</p>' },
                        { name: 'ApplicationContextInitializer', html: '<p>After the context is created and before <code>refresh()</code>. Can register bean definitions programmatically or set an active profile.</p>' },
                        { name: 'BeanFactoryPostProcessor', html: '<p>Inside <code>refresh()</code>, on definitions that already exist. Too late to influence which property sources there are.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>An <code>EnvironmentPostProcessor</code> registered as a <code>@Bean</code> never runs.</strong> It has to be listed in <code>spring.factories</code>, because it is needed before the container that would create beans exists. The failure is silent — the class compiles, the application starts, and the property source is simply absent — which makes it worth stating as a fact rather than discovering.</p>'
                }
            ],
            docs: [
                { title: 'Customizing the Environment', url: 'https://docs.spring.io/spring-boot/reference/features/spring-application.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-core', questionId: 'context-startup-sequence' }
            ]
        },

        {
            id: 'application-events',
            title: 'The Events, and When Each Fires',
            importance: 'should-know',
            summary: 'Seven events across startup. ApplicationReadyEvent is the one to use for work that needs a fully built application, and ApplicationStartedEvent is not it.',
            interviewAngle: 'The practical question is "where do I put startup work". The answer is ApplicationReadyEvent or an ApplicationRunner, and being able to say why the earlier events are the wrong place shows the ordering is understood.',
            buildsOn: ['run-step-by-step'],
            blocks: [
                {
                    type: 'table',
                    title: 'The startup events',
                    headers: ['Event', 'Fires when', 'Useful for'],
                    rows: [
                        ['<code>ApplicationStartingEvent</code>', 'Before anything, even the Environment', 'Almost nothing. Logging system setup'],
                        ['<code>ApplicationEnvironmentPreparedEvent</code>', 'Environment ready, no context', 'Inspecting or modifying configuration'],
                        ['<code>ApplicationContextInitializedEvent</code>', 'Context created, no bean definitions', 'Registering definitions programmatically'],
                        ['<code>ApplicationPreparedEvent</code>', 'Definitions loaded, beans not created', 'The last point before instantiation'],
                        ['<code>ApplicationStartedEvent</code>', 'Context refreshed, <strong>runners not yet called</strong>', 'Rarely the right hook'],
                        ['<code>ApplicationReadyEvent</code>', 'Runners done. <strong>Fully ready</strong>', '<strong>Startup work, warm-up, registration</strong>'],
                        ['<code>ApplicationFailedEvent</code>', 'Startup threw', 'Alerting, and cleaning up external state']
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Publishing and listening, both ordinary',
                    code: '@Component\nclass CacheWarmer {\n\n    @EventListener(ApplicationReadyEvent.class)\n    void warm() { ... }               // everything exists, proxies included\n}\n\n// Application events are not just Boot\'s. Any object will do.\nrecord OrderPlaced(String orderId) { }\n\n@Service\nclass Orders {\n    private final ApplicationEventPublisher events;\n\n    void place(Order order) {\n        repository.save(order);\n        events.publishEvent(new OrderPlaced(order.id()));\n    }\n}\n\n@Component\nclass Notifier {\n    @EventListener                              // SYNCHRONOUS by default\n    void on(OrderPlaced event) { ... }          // add @Async to change that\n}',
                    notes: '<p><code>@EventListener</code> is synchronous and runs on the publishing thread, inside the publisher\'s transaction. That is frequently a surprise: a listener that throws will roll the publisher back, and a slow listener makes the publishing request slow. <code>@TransactionalEventListener(phase = AFTER_COMMIT)</code> is the fix when the work should only happen once the data is durable.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong><code>ApplicationStartedEvent</code> fires before the runners, and <code>ApplicationReadyEvent</code> after.</strong> Work placed on the first can run before an <code>ApplicationRunner</code> that was meant to prepare something for it — a schema migration, a cache load, a feature-flag fetch. The names do not suggest the difference and the ordering is the whole distinction between them.</p>'
                }
            ],
            docs: [
                { title: 'Application Events and Listeners', url: 'https://docs.spring.io/spring-boot/reference/features/spring-application.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-core', questionId: 'context-events' }
            ]
        },

        {
            id: 'listeners-and-runners',
            title: 'Runners',
            importance: 'good-to-know',
            summary: 'Two interfaces that run once after startup, differing only in whether the arguments arrive parsed.',
            interviewAngle: 'A small question. The one thing worth knowing is that a runner throwing will fail the application, which is usually what you want and occasionally very much not.',
            buildsOn: ['application-events'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'The two runner interfaces',
                    left: 'CommandLineRunner',
                    right: 'ApplicationRunner',
                    rows: [
                        { aspect: 'Receives', left: '<code>String... args</code>, raw', right: '<code>ApplicationArguments</code>, parsed' },
                        { aspect: 'Option arguments', left: 'You parse <code>--name=value</code> yourself', right: '<code>getOptionValues("name")</code>' },
                        { aspect: 'Runs', left: 'After refresh, before <code>ApplicationReadyEvent</code>', right: 'The same' },
                        { aspect: 'Ordering between several', left: '<code>@Order</code>', right: '<code>@Order</code>' },
                        { aspect: 'Prefer', left: 'Only for a genuinely raw argv', right: '<strong>Yes</strong>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>An exception from a runner fails the application startup</strong> — the context closes and the process exits non-zero. For a data migration or a required warm-up that is exactly right: the deployment does not roll forward. For an optional cache warm-up it means an unavailable cache takes the whole service down at boot. Decide which one you have, and catch accordingly.</p>'
                }
            ],
            docs: [
                { title: 'Using the ApplicationRunner or CommandLineRunner', url: 'https://docs.spring.io/spring-boot/reference/features/spring-application.html', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'embedded-server-startup',
            title: 'The Embedded Server',
            importance: 'should-know',
            summary: 'Tomcat by default, started inside refresh() as an ordinary bean. The jar is the deployable, and there is no container to install.',
            interviewAngle: 'Asked as "how does an embedded server work" or "how do I switch to Undertow". Both have short answers, and the second is a dependency exclusion rather than a configuration setting.',
            buildsOn: ['run-step-by-step'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>The servlet container is a bean like any other. <code>ServletWebServerFactoryAutoConfiguration</code> contributes a factory — for Tomcat, Jetty or Undertow, whichever is on the class path — and the web-aware <code>ApplicationContext</code> asks it for a <code>WebServer</code> during <code>refresh()</code>. The port opens near the end of that call, after every singleton has been created, which is what makes "the application is listening" a meaningful signal.</p>'
                },
                {
                    type: 'types',
                    title: 'The three, and when to change',
                    items: [
                        { name: 'Tomcat', html: '<p>The default. Best-understood, best-documented, and the right answer unless there is a specific reason.</p>' },
                        { name: 'Jetty', html: '<p>Comparable. Occasionally chosen for its WebSocket handling or for licensing reasons.</p>' },
                        { name: 'Undertow', html: '<p>Lower memory footprint under high connection counts. The gap has narrowed considerably and is rarely the deciding factor now.</p>' },
                        { name: 'Netty', html: '<p>Not a servlet container. It is what <code>spring-boot-starter-webflux</code> uses, and choosing it means choosing the reactive stack.</p>' }
                    ]
                },
                {
                    type: 'syntax',
                    language: 'xml',
                    title: 'Switching is an exclusion, not a property',
                    code: '<dependency>\n    <groupId>org.springframework.boot</groupId>\n    <artifactId>spring-boot-starter-web</artifactId>\n    <exclusions>\n        <exclusion>\n            <groupId>org.springframework.boot</groupId>\n            <artifactId>spring-boot-starter-tomcat</artifactId>\n        </exclusion>\n    </exclusions>\n</dependency>\n<dependency>\n    <groupId>org.springframework.boot</groupId>\n    <artifactId>spring-boot-starter-undertow</artifactId>\n</dependency>',
                    notes: '<p>This is <code>@ConditionalOnClass</code> working as designed: remove Tomcat from the class path, add Undertow, and the auto-configuration that was skipped now applies. No property changes, and the application code is untouched.</p>'
                },
                {
                    type: 'tip',
                    html: '<p><code>server.port=0</code> binds an arbitrary free port, which is the right setting for an integration test that starts a real server — <code>@LocalServerPort</code> then injects the actual number. Hard-coding a test port is a source of flaky builds on a machine running two of them at once.</p>'
                }
            ],
            docs: [
                { title: 'Embedded Web Servers', url: 'https://docs.spring.io/spring-boot/reference/web/servlet.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-boot', questionId: 'embedded-server' }
            ]
        },

        {
            id: 'graceful-shutdown',
            title: 'Shutting Down Without Dropping Requests',
            importance: 'must-know',
            summary: 'One property stops new requests and drains the in-flight ones. It does not solve the harder half, which is that the load balancer is still sending traffic.',
            interviewAngle: 'A strong question in any round that touches deployment. Naming the property is half; explaining why a preStop sleep is still needed is what shows the request path was thought about end to end.',
            buildsOn: ['embedded-server-startup'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'properties',
                    title: 'The property, and its deadline',
                    code: '# Stop accepting new requests; let in-flight ones finish.\nserver.shutdown=graceful\n\n# How long to wait before killing them anyway. Default 30s.\nspring.lifecycle.timeout-per-shutdown-phase=20s',
                    notes: '<p>Available since Boot 2.3, and off by default — the default is <code>immediate</code>, which closes the connector at once and drops whatever was in flight. This is a one-line change that most services should make and many have not.</p>'
                },
                {
                    type: 'diagram',
                    diagramType: 'flowchart',
                    caption: 'The gap that drops requests is between the first two boxes, and no Spring property closes it.',
                    diagramConfig: {
                        title: 'What happens when a pod is told to stop',
                        nodes: [
                            { id: 'term', label: 'SIGTERM sent to the process', kind: 'start' },
                            { id: 'lb', label: 'Load balancer still routing here', kind: 'decision' },
                            { id: 'drop', label: 'New requests arrive at a closing connector — DROPPED', kind: 'step' },
                            { id: 'pre', label: 'preStop sleep: keep serving while the LB catches up', kind: 'fix' },
                            { id: 'drain', label: 'Graceful shutdown drains in-flight requests', kind: 'step' },
                            { id: 'exit', label: 'Context closes, process exits', kind: 'fix' }
                        ],
                        edges: [
                            { from: 'term', to: 'lb' },
                            { from: 'lb', to: 'drop', label: 'no preStop' },
                            { from: 'lb', to: 'pre', label: 'with preStop' },
                            { from: 'pre', to: 'drain' },
                            { from: 'drain', to: 'exit' }
                        ]
                    }
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Kubernetes sends SIGTERM and removes the pod from the endpoints list at the same moment, and those two propagate at different speeds.</strong> The endpoint removal has to reach every kube-proxy and every ingress before traffic stops arriving, and that takes seconds. Meanwhile the application has already begun shutting down. The standard remedy is a <code>preStop</code> hook that sleeps five to ten seconds — the process keeps serving normally during it, the load balancer catches up, and only then does the shutdown sequence start. <code>terminationGracePeriodSeconds</code> must exceed the sleep plus the drain timeout, or the pod is SIGKILLed mid-drain and you are back where you started.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The complete answer, in the order that shows the whole path: <em>"<code>server.shutdown=graceful</code> so in-flight requests finish, a <code>preStop</code> sleep so the load balancer stops routing before the shutdown starts, and a termination grace period longer than both. Without the middle one the graceful shutdown is still dropping requests — it is just dropping the ones that arrived after SIGTERM."</em></p>'
                }
            ],
            docs: [
                { title: 'Graceful Shutdown', url: 'https://docs.spring.io/spring-boot/reference/web/graceful-shutdown.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-core', questionId: 'graceful-shutdown' }
            ]
        },

        {
            id: 'startup-time-and-lazy-init',
            title: 'Startup Time',
            importance: 'should-know',
            summary: 'Four levers, in increasing order of what they cost you: measure it, trim the class path, lazy initialisation, and ahead-of-time compilation.',
            interviewAngle: 'Comes up with serverless and with large monoliths. The best answer starts with measurement — Boot has a startup tracker built in — rather than with a list of flags.',
            buildsOn: ['run-step-by-step'],
            blocks: [
                {
                    type: 'types',
                    title: 'The levers, cheapest first',
                    items: [
                        { name: 'Measure it', html: '<p><code>ApplicationStartup</code> with <code>BufferingApplicationStartup</code>, exposed at <code>/actuator/startup</code>, records how long each step took. Guessing which bean is slow is how an afternoon disappears.</p>' },
                        { name: 'Remove what you do not use', html: '<p>Every starter contributes auto-configuration classes that are evaluated on every boot. An unused starter is startup time and attack surface with no benefit.</p>' },
                        { name: 'Lazy initialisation', html: '<p><code>spring.main.lazy-initialization=true</code>. Real gains, and it trades a startup failure for a runtime one — see the container module. Reasonable for local development, a poor trade in production.</p>' },
                        { name: 'CDS, and AOT', html: '<p>Class Data Sharing shares a pre-parsed class archive across runs. Spring AOT plus GraalVM native image goes further — sub-100ms startup — at the cost of build time, reflection configuration, and no dynamic proxies.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A native image is not a faster JVM, it is a different execution model.</strong> Everything is decided at build time: the class path is fixed, reflection must be declared, and dynamic proxy generation does not exist — which is why Spring generates proxies ahead of time during the AOT build. Conditional configuration is evaluated once, at build time, so <code>@Profile</code> and <code>@ConditionalOnProperty</code> no longer switch anything at run time. This is a substantial constraint and it is the part usually left out of the pitch.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Ask what the startup time is <em>for</em> before optimising it. Ten seconds is irrelevant for a service deployed twice a week and fatal for a scale-to-zero function. That framing is a better answer than any lever, and it is the one an interviewer asking about serverless is listening for.</p>'
                }
            ],
            docs: [
                { title: 'Application Startup Tracking', url: 'https://docs.spring.io/spring-boot/reference/features/spring-application.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-core', questionId: 'lazy-initialisation' }
            ]
        }
    ]
};
