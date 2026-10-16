/* ==========================================================================
   data/theory/spring-generations.js — module 33 in the reading path

   Seven chapters, and EVERY ONE carries a version block. That is enforced
   by validate-theory.js rather than left to discipline, because this is the
   module whose entire subject is drift: a paragraph of prose here is a fact
   with no date attached, and a fact with no date attached is what makes an
   interview answer sound two releases old.
   ========================================================================== */

const springGenerationsModule = {
    id: 'spring-generations',
    trackId: 'spring-core',
    order: 33,
    title: 'Boot 2 → 3 → 4: What Changed',
    tagline: 'The version question, answered once and kept current.',
    estimatedMinutes: 30,
    prerequisites: ['application-lifecycle'],
    docHub: { title: 'Spring Boot — Release Notes and Migration Guides', url: 'https://github.com/spring-projects/spring-boot/wiki' },

    chapters: [
        {
            id: 'javax-to-jakarta',
            title: 'javax to jakarta',
            importance: 'must-know',
            summary: 'Oracle kept the javax namespace when Java EE moved to Eclipse, so every EE package had to be renamed. It is a find-and-replace across the whole ecosystem, and it is why Boot 3 was a hard boundary.',
            interviewAngle: 'The single most asked Spring Boot 3 question. The answer that shows understanding names the cause — a trademark, not a technical redesign — and the consequence, which is that every dependency must move at once.',
            buildsOn: [],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>When Java EE was donated to the Eclipse Foundation and became Jakarta EE, the <code>javax</code> trademark did not come with it. Existing packages could keep their names, but nothing new could be added to them — which for a living specification is the same as being frozen. Jakarta EE 9 therefore renamed every package: <code>javax.servlet</code> to <code>jakarta.servlet</code>, <code>javax.persistence</code> to <code>jakarta.persistence</code>, <code>javax.validation</code> to <code>jakarta.validation</code>.</p><p>Nothing about the APIs changed. The break is purely in the names, and that is what makes it both trivial per file and impossible to do gradually: a library compiled against <code>javax.persistence.Entity</code> and one compiled against <code>jakarta.persistence.Entity</code> are using two unrelated annotations that happen to look identical.</p>'
                },
                {
                    type: 'version',
                    title: 'Where the boundary falls',
                    items: [
                        { version: 'Spring Boot 2.7', state: 'was', html: '<p><code>javax.*</code> throughout. The last 2.x line, and the last one on Jakarta EE 8.</p>' },
                        { version: 'Spring Boot 3.0', state: 'changed', html: '<p><strong><code>jakarta.*</code> throughout.</strong> Jakarta EE 9/10 baseline. There is no mixed mode and no compatibility shim in the framework.</p>' },
                        { version: 'Spring Boot 3.0', state: 'is', html: '<p>Every dependency must move together — Hibernate 6, Tomcat 10, the servlet API, Bean Validation 3. A single library still on <code>javax</code> keeps the whole application there.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A stale <code>javax</code> import fails at run time, not at compile time, when the two annotations coexist.</strong> If both jars are somehow on the class path, <code>javax.persistence.@Entity</code> compiles perfectly and Hibernate 6 simply does not recognise it — the class is not a managed entity, and the error is about a missing mapping rather than about a wrong import. The Eclipse Transformer and OpenRewrite both automate the rename; do it mechanically rather than by hand.</p>'
                }
            ],
            docs: [
                { title: 'Spring Boot 3.0 Migration Guide', url: 'https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-3.0-Migration-Guide', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-boot', questionId: 'javax-to-jakarta' }
            ]
        },

        {
            id: 'boot-3-baseline-and-native',
            title: 'What Else Boot 3 Brought',
            importance: 'must-know',
            summary: 'A Java 17 baseline, first-class GraalVM native image support through Spring AOT, and a new observability stack. The namespace change got the attention; these are the parts that changed how things are built.',
            interviewAngle: 'The follow-up to the jakarta question. Being able to say what AOT actually does — generate configuration at build time so reflection is not needed at run time — separates a real answer from a feature list.',
            buildsOn: ['javax-to-jakarta'],
            blocks: [
                {
                    type: 'version',
                    title: 'The Boot 3 line',
                    items: [
                        { version: 'Spring Boot 3.0', state: 'changed', html: '<p>Java 17 baseline, Spring Framework 6.0, Jakarta EE 9/10, GraalVM native image support built in, Micrometer-based observability.</p>' },
                        { version: 'Spring Boot 3.1', state: 'changed', html: '<p>Docker Compose support at development time, and <code>@ServiceConnection</code> for Testcontainers — a genuine ergonomic improvement to integration testing.</p>' },
                        { version: 'Spring Boot 3.2', state: 'changed', html: '<p><strong>Virtual threads</strong> behind one property, <code>RestClient</code>, and JVM checkpoint restore (CRaC).</p>' },
                        { version: 'Spring Boot 3.4', state: 'changed', html: '<p>Structured logging to JSON built in, without a Logback encoder to configure by hand.</p>' }
                    ]
                },
                {
                    type: 'types',
                    title: 'What Spring AOT actually does',
                    items: [
                        { name: 'Runs the container at build time', html: '<p>Conditions are evaluated, bean definitions resolved, and the resulting configuration written out as generated Java source. The application starts by executing that instead of by scanning.</p>' },
                        { name: 'Generates proxies ahead of time', html: '<p>CGLIB cannot generate a subclass at run time in a native image, so the proxies are produced during the build.</p>' },
                        { name: 'Emits reflection hints', html: '<p>GraalVM needs to be told, at build time, every type that will be reflected on or serialised. Spring produces those hints from what it knows about the beans.</p>' },
                        { name: 'Fixes the configuration', html: '<p><strong>The consequence people miss.</strong> Conditions are evaluated once, at build time, so <code>@Profile</code> and <code>@ConditionalOnProperty</code> no longer decide anything at run time. One image per configuration.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Native image is a trade, and the losing side is rarely stated.</strong> Startup goes from seconds to tens of milliseconds and resident memory drops substantially. In exchange: build times measured in minutes, no dynamic class loading, reflection that must be declared, a different profiler story, and peak throughput that is typically lower than a warmed-up JIT would reach. It is a clear win for scale-to-zero functions and a poor one for a long-running service that starts twice a week.</p>'
                }
            ],
            docs: [
                { title: 'GraalVM Native Image Support', url: 'https://docs.spring.io/spring-boot/reference/packaging/native-image/index.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-boot', questionId: 'what-boot-3-added' },
                { topicId: 'spring-boot', questionId: 'native-image-tradeoffs' }
            ]
        },

        {
            id: 'observability-replaces-sleuth',
            title: 'Observability: Micrometer Replaced Sleuth',
            importance: 'should-know',
            summary: 'Spring Cloud Sleuth did not move to Boot 3. Tracing became part of Micrometer, and one Observation now produces a metric and a span together.',
            interviewAngle: 'A concrete migration question that a lot of candidates get wrong by naming Sleuth. Knowing it was replaced rather than upgraded, and that the replacement unifies metrics with traces, is the answer.',
            buildsOn: ['boot-3-baseline-and-native'],
            blocks: [
                {
                    type: 'version',
                    title: 'The tracing stack changed hands',
                    items: [
                        { version: 'Spring Boot 2.x', state: 'was', html: '<p>Spring Cloud Sleuth for tracing, Micrometer for metrics. Two separate instrumentation stacks with separate configuration.</p>' },
                        { version: 'Spring Boot 3.0', state: 'changed', html: '<p><strong>Sleuth is not part of Boot 3.</strong> Its instrumentation moved into Micrometer Tracing, and the Observation API in Spring Framework 6 became the single instrumentation point.</p>' },
                        { version: 'Spring Boot 3.0', state: 'is', html: '<p>One <code>Observation</code> produces a timer and a span. Bridges to Brave/Zipkin and to OpenTelemetry are separate dependencies, so the wire format is a choice.</p>' }
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'One instrumentation, two outputs',
                    code: '@Service\nclass Pricing {\n    private final ObservationRegistry registry;\n\n    Price quote(String sku) {\n        return Observation.createNotStarted("pricing.quote", registry)\n                .lowCardinalityKeyValue("region", region)   // a metric TAG\n                .highCardinalityKeyValue("sku", sku)        // a span ATTRIBUTE\n                .observe(() -> compute(sku));\n    }\n}',
                    notes: '<p>The low- and high-cardinality split is the useful idea. A metric tag with unbounded values creates one time series per value and will take down a metrics backend; a span attribute is per-request by nature and unbounded is fine. Making the distinction part of the API means the mistake is harder to make by accident.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>If asked how you would add tracing to a Boot 3 service: <em>"<code>micrometer-tracing-bridge-otel</code> plus an OTLP exporter, and set <code>management.tracing.sampling.probability</code>. Spring instruments the web layer, the client and the scheduler for you; anything custom goes through the Observation API so it produces a metric and a span from one call."</em></p>'
                }
            ],
            docs: [
                { title: 'Spring Boot — Tracing', url: 'https://docs.spring.io/spring-boot/reference/actuator/tracing.html', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'restclient-and-http-interfaces',
            title: 'RestTemplate, WebClient, RestClient',
            importance: 'must-know',
            summary: 'Three HTTP clients and a fourth way to declare one. RestClient is the answer for new blocking code, and RestTemplate was never actually deprecated.',
            interviewAngle: 'Frequently asked, and frequently answered with the outdated claim that RestTemplate is deprecated. It is in maintenance mode — no new features, still supported — and knowing the difference is a small but reliable credibility marker.',
            buildsOn: ['boot-3-baseline-and-native'],
            blocks: [
                {
                    type: 'version',
                    title: 'When each one arrived',
                    items: [
                        { version: 'Spring 3.0', state: 'was', html: '<p><code>RestTemplate</code>. Blocking, template-style, and everywhere.</p>' },
                        { version: 'Spring 5.0', state: 'changed', html: '<p><code>WebClient</code>. Reactive and non-blocking, with a fluent API — usable in a blocking application via <code>.block()</code>, which most people did.</p>' },
                        { version: 'Spring 5.0', state: 'is', html: '<p><code>RestTemplate</code> enters <strong>maintenance mode</strong>: no new features, no deprecation, still fully supported. It has never been marked <code>@Deprecated</code>.</p>' },
                        { version: 'Spring 6.1', state: 'changed', html: '<p><strong><code>RestClient</code>.</strong> WebClient\'s fluent API over blocking IO. The answer for new synchronous code, and the natural pairing with virtual threads.</p>' },
                        { version: 'Spring 6.0', state: 'changed', html: '<p>HTTP interfaces: declare a Java interface and let Spring generate the client, the way Spring Data generates a repository.</p>' }
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The declarative form, which is the one worth showing',
                    code: '@HttpExchange("/api/invoices")\ninterface InvoiceClient {\n\n    @GetExchange("/{id}")\n    Invoice byId(@PathVariable String id);\n\n    @PostExchange\n    Invoice create(@RequestBody NewInvoice invoice);\n}\n\n// Backed by RestClient (blocking) or WebClient (reactive) -- the\n// interface does not know or care which.\nRestClient client = RestClient.create("https://billing.internal");\nInvoiceClient invoices = HttpServiceProxyFactory\n        .builderFor(RestClientAdapter.create(client))\n        .build()\n        .createClient(InvoiceClient.class);',
                    notes: '<p>The same annotations describe the client that <code>@RestController</code> annotations describe the server, which makes an interface shared between the two services a genuinely appealing option — and a coupling decision worth making deliberately rather than by convenience.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The one-line recommendation: <em>"New blocking code, <code>RestClient</code>. Reactive code, <code>WebClient</code>. Existing <code>RestTemplate</code> can stay — it is in maintenance mode, not deprecated, and rewriting working HTTP calls buys nothing."</em></p>'
                }
            ],
            docs: [
                { title: 'REST Clients', url: 'https://docs.spring.io/spring-framework/reference/integration/rest-clients.html', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'framework-7-and-boot-4',
            title: 'Framework 7 and Boot 4',
            importance: 'should-know',
            summary: 'The current generation. A modularised spring-boot, API versioning in the web layer, null-safety declared with JSpecify, and resilience annotations promoted into the framework.',
            interviewAngle: 'Being current is itself the signal here. Nobody expects production experience with the newest line, and knowing roughly what it contains — and that it is not another jakarta-scale break — reads as someone who follows the platform.',
            buildsOn: ['restclient-and-http-interfaces'],
            blocks: [
                {
                    type: 'version',
                    title: 'The 4.0 line',
                    items: [
                        { version: 'Spring Framework 7.0', state: 'is', html: '<p>Released November 2025 alongside Boot 4.0. Java 17 baseline retained — <strong>this is not a second jakarta-scale migration</strong>.</p>' },
                        { version: 'Spring Framework 7.0', state: 'changed', html: '<p>Null-safety declared with <strong>JSpecify</strong> annotations rather than Spring\'s own, so a Kotlin or a static-analysis toolchain reads the same contracts.</p>' },
                        { version: 'Spring Framework 7.0', state: 'changed', html: '<p>Resilience promoted into the core framework: <code>@Retryable</code> and <code>@ConcurrencyLimit</code> without a separate Spring Retry dependency.</p>' },
                        { version: 'Spring Framework 7.0', state: 'changed', html: '<p><strong>API versioning</strong> in the web layer — a version can be mapped from a header, a path segment or a parameter, rather than hand-rolled per project.</p>' },
                        { version: 'Spring Boot 4.0', state: 'changed', html: '<p><code>spring-boot</code> split into finer modules, so an application pulls in less it does not use. Jackson 3 as the JSON baseline.</p>' }
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>The shape of this generation is worth noting as much as its contents: it is a consolidation rather than a rupture. Boot 3 forced every dependency in the ecosystem to move on one day. Boot 4 keeps the Java and Jakarta baselines and spends its budget on modularity and on absorbing things — retry, API versioning, structured logging — that every team had previously assembled from libraries or written themselves.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>An honest framing beats a rehearsed one: <em>"I have not run 4.0 in production. What I know is that it keeps the Java 17 and Jakarta baselines, so it is not another Boot 3 — the work is in the modularisation, Jackson 3, and features that used to be add-ons: retry, concurrency limiting, API versioning."</em> Saying what you have not used is part of being trusted about what you have.</p>'
                }
            ],
            docs: [
                { title: 'Spring Framework 7.0 — What\'s New', url: 'https://docs.spring.io/spring-framework/reference/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-boot', questionId: 'boot-3-other-changes' }
            ]
        },

        {
            id: 'java-baselines-per-line',
            title: 'Which Java Each Line Needs',
            importance: 'must-know',
            summary: 'Boot 2 runs on Java 8. Boot 3 requires 17. Boot 4 keeps 17. Knowing the table is the difference between a plausible migration plan and a guess.',
            interviewAngle: 'A pure recall question and a fast credibility check. It also sets up the migration chapter, because a Boot 2 to 3 move is usually a Java 8 to 17 move at the same time.',
            buildsOn: ['framework-7-and-boot-4'],
            blocks: [
                {
                    type: 'table',
                    title: 'Baselines and support',
                    headers: ['Line', 'Spring Framework', 'Java', 'Jakarta / EE', 'Status'],
                    rows: [
                        ['Boot 2.7', '5.3', 'Java 8+', '<code>javax</code>, EE 8', '<strong>Out of OSS support.</strong> Commercial only'],
                        ['Boot 3.0–3.1', '6.0–6.1', 'Java 17+', '<code>jakarta</code>, EE 9/10', 'Superseded'],
                        ['Boot 3.2', '6.1', 'Java 17+', '<code>jakarta</code>', 'Virtual threads, RestClient'],
                        ['Boot 3.3–3.5', '6.1–6.2', 'Java 17+', '<code>jakarta</code>', 'The widely deployed line'],
                        ['Boot 4.0', '7.0', 'Java 17+', '<code>jakarta</code>', 'Current']
                    ]
                },
                {
                    type: 'version',
                    title: 'The support windows that matter to a plan',
                    items: [
                        { version: 'Spring Boot 2.7', state: 'removed', html: '<p>Open-source support ended in November 2023. Anything still on 2.x is receiving no free security patches, which is the argument that actually gets a migration scheduled.</p>' },
                        { version: 'Java 17', state: 'is', html: '<p>The floor for everything current. An LTS with support well into the 2030s.</p>' },
                        { version: 'Java 21', state: 'is', html: '<p>The LTS worth targeting rather than merely clearing — virtual threads, pattern matching, sequenced collections, generational ZGC.</p>' },
                        { version: 'Java 25', state: 'is', html: '<p>The current LTS. Runs everything above; adopting it is a runtime decision rather than a code one.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>The number that makes the case in a planning meeting is not a feature, it is the end of free security patches for Boot 2.7 in November 2023. Lead with that and the feature list becomes a bonus rather than the argument.</p>'
                }
            ],
            docs: [
                { title: 'Spring Boot Support Policy', url: 'https://spring.io/projects/spring-boot/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-boot', questionId: 'version-support-windows' }
            ]
        },

        {
            id: 'planning-a-migration',
            title: 'Planning the Migration',
            importance: 'must-know',
            summary: 'Java first, then Boot 2.7, then the namespace, then the third-party libraries. Doing them together is what turns a two-week job into a quarter.',
            interviewAngle: 'A design-round question in disguise. What is being assessed is whether you sequence work to keep the build green, and the answer is a series of small independently shippable steps rather than one branch.',
            buildsOn: ['java-baselines-per-line'],
            blocks: [
                {
                    type: 'types',
                    title: 'The order, and why each step is separate',
                    items: [
                        { name: '1. Move to Java 17, still on Boot 2.7', html: '<p>Boot 2.7 runs on 17 perfectly well. Doing this alone means any JDK-related breakage is isolated from framework breakage, and it ships on its own.</p>' },
                        { name: '2. Get onto the latest 2.7, with no deprecation warnings', html: '<p>Every deprecation cleared here is a compile error avoided later. This is the cheapest step and the one most often skipped.</p>' },
                        { name: '3. Inventory the dependencies', html: '<p>For each one: is there a jakarta-compatible version. <strong>This is where a migration actually stalls</strong> — an unmaintained library with no jakarta release has to be replaced, forked or removed, and that is a project of its own.</p>' },
                        { name: '4. Run the namespace rewrite mechanically', html: '<p>OpenRewrite\'s Boot 3 recipe, or the Eclipse Transformer. Machine-applied and reviewed, not hand-edited across two thousand files.</p>' },
                        { name: '5. Boot 3, then the property changes', html: '<p>The bulk of the remaining work is renamed configuration properties. <code>spring-boot-properties-migrator</code> on the class path logs every one it finds at startup — add it, read the log, remove it.</p>' },
                        { name: '6. Then the optional things', html: '<p>Virtual threads, observability, native image. Each is its own decision with its own test plan, and none belongs in the migration branch.</p>' }
                    ]
                },
                {
                    type: 'version',
                    title: 'The tools that do the mechanical parts',
                    items: [
                        { version: 'Spring Boot 2.7', state: 'is', html: '<p><code>spring-boot-properties-migrator</code>. Add it as a runtime dependency, start the application, and it logs every renamed or removed property with its replacement. Remove it afterwards — it is a migration aid, not a dependency.</p>' },
                        { version: 'Spring Boot 3.0', state: 'is', html: '<p>OpenRewrite\'s <code>UpgradeSpringBoot_3_0</code> recipe performs the namespace rewrite and most of the mechanical API changes as a reviewable commit.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>The blocker is almost never Spring.</strong> It is a dependency: an ancient PDF library, an internal shared jar nobody owns, a vendor SDK compiled against <code>javax.servlet</code>. Do the inventory in step three <em>before</em> committing to a date, because that step is the only one whose size cannot be estimated from the codebase itself.</p>'
                }
            ],
            docs: [
                { title: 'Spring Boot 3.0 Migration Guide', url: 'https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-3.0-Migration-Guide', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-boot', questionId: 'planning-a-major-upgrade' }
            ]
        }
    ]
};
