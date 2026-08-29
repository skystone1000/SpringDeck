/* ==========================================================================
   data/theory/autoconfiguration.js — module 29 in the reading path

   Seven chapters, and the title of the plan's entry is the thesis: not
   magic, a list of classes, a set of conditions, and a report you can
   print. The report chapter exists so that the reader's answer to "how
   would you debug auto-configuration" is a command rather than a shrug.
   ========================================================================== */

const autoconfigurationModule = {
    id: 'autoconfiguration',
    trackId: 'spring-core',
    order: 29,
    title: 'Auto-Configuration and How to Debug It',
    tagline: 'Not magic: a list of classes, a set of conditions, and a report you can print.',
    estimatedMinutes: 40,
    prerequisites: ['configuration-and-profiles', 'aop-and-proxies'],
    docHub: { title: 'Auto-configuration', url: 'https://docs.spring.io/spring-boot/reference/using/auto-configuration.html' },

    chapters: [
        {
            id: 'springbootapplication-decomposed',
            title: '@SpringBootApplication Is Three Annotations',
            importance: 'must-know',
            summary: 'A configuration class, a component scan rooted at its own package, and a request to run auto-configuration. Nothing else.',
            interviewAngle: 'The opening question of almost every Spring Boot interview. Naming the three is table stakes; saying what each one does — and that the scan root is this class\'s package — is the answer.',
            buildsOn: [],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The same application, written out',
                    code: '@SpringBootApplication\npublic class BillingApplication {\n    public static void main(String[] args) {\n        SpringApplication.run(BillingApplication.class, args);\n    }\n}\n\n// Exactly equivalent to:\n\n@Configuration                 // this class may declare @Bean methods\n@ComponentScan                 // scan from THIS class\'s package downward\n@EnableAutoConfiguration       // apply everything the classpath implies\npublic class BillingApplication { ... }',
                    notes: '<p>Worth writing out once, because it makes the package rule concrete: the scan base is the package of the class carrying the annotation, so where you put this file is a configuration decision. It is also the reason the conventional layout puts it at the root of the tree rather than in a <code>config</code> package.</p>'
                },
                {
                    type: 'types',
                    title: 'What each of the three contributes',
                    items: [
                        { name: '@Configuration', html: '<p>Makes the class itself a source of bean definitions, and — being a full configuration class — CGLIB-proxied, so inter-<code>@Bean</code> calls return singletons.</p>' },
                        { name: '@ComponentScan', html: '<p>Registers every stereotype-annotated class under this package. Excludes are applied here too, via a <code>TypeExcludeFilter</code> that the test slices use.</p>' },
                        { name: '@EnableAutoConfiguration', html: '<p>Imports <code>AutoConfigurationImportSelector</code>, which reads the candidate list and evaluates the conditions. <strong>This is the whole of "Boot magic"</strong>, and it is one class doing a lookup.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>A small detail that reads as experience: auto-configuration is applied <em>last</em>, after every user-defined configuration class has been processed. That ordering is what makes <code>@ConditionalOnMissingBean</code> work at all, and it is the answer to "how does Boot know I defined my own <code>DataSource</code>" — it does not know, it simply asks afterwards.</p>'
                }
            ],
            docs: [
                { title: 'Using the @SpringBootApplication Annotation', url: 'https://docs.spring.io/spring-boot/reference/using/using-the-springbootapplication-annotation.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-boot', questionId: 'what-springbootapplication-is' }
            ]
        },

        {
            id: 'autoconfiguration-imports',
            title: 'Where the Candidate List Lives',
            importance: 'must-know',
            summary: 'A plain text file inside every starter jar, listing class names one per line. Boot reads them all, deduplicates, and evaluates each one.',
            interviewAngle: 'Asked as "how does Spring Boot know what to configure". A candidate who can name the file — and knows the location changed in Boot 2.7 — is describing a mechanism rather than repeating a slogan.',
            buildsOn: ['springbootapplication-decomposed'],
            blocks: [
                {
                    type: 'version',
                    title: 'The file moved, and the old one still works',
                    items: [
                        { version: 'Spring Boot 2.6', state: 'was', html: '<p><code>META-INF/spring.factories</code>, keyed by <code>EnableAutoConfiguration</code>. One file, many keys, and every entry parsed even when unrelated.</p>' },
                        { version: 'Spring Boot 2.7', state: 'changed', html: '<p><strong>New location:</strong> <code>META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports</code> — one class name per line, comments with <code>#</code>. The old file still works, with a deprecation warning.</p>' },
                        { version: 'Spring Boot 3.0', state: 'removed', html: '<p><code>spring.factories</code> is no longer read for auto-configuration. A third-party starter that was never updated <strong>silently contributes nothing</strong>, which is a genuinely nasty upgrade failure — no error, just missing beans.</p>' }
                    ]
                },
                {
                    type: 'syntax',
                    language: 'properties',
                    title: 'What is actually in the file',
                    code: '# META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports\n# One fully-qualified class name per line. That is the entire format.\n\norg.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration\norg.springframework.boot.autoconfigure.jackson.JacksonAutoConfiguration\norg.springframework.boot.autoconfigure.web.servlet.WebMvcAutoConfiguration',
                    notes: '<p><code>spring-boot-autoconfigure</code> ships with something over a hundred and fifty of these. Every one is read on every startup and evaluated against its conditions; the vast majority fail on <code>@ConditionalOnClass</code> immediately, which is why the cost is small.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The one-sentence answer: <em>"Every starter jar carries a text file listing auto-configuration classes. Boot reads all of them from the class path at startup, then evaluates each class\'s conditions and applies the ones that pass. It moved out of spring.factories in 2.7 and the old location stopped being read in 3.0."</em></p>'
                }
            ],
            docs: [
                { title: 'Creating Your Own Auto-configuration', url: 'https://docs.spring.io/spring-boot/reference/features/developing-auto-configuration.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-boot', questionId: 'how-auto-configuration-is-discovered' }
            ]
        },

        {
            id: 'conditional-annotations',
            title: 'The Conditions',
            importance: 'must-know',
            summary: 'Each auto-configuration class is guarded by conditions on the class path, on existing beans, on properties and on the kind of application. All of them must pass.',
            interviewAngle: 'The mechanism question. Being able to say that @ConditionalOnClass is checked by reading bytecode — not by loading the class, which would throw — is a detail that lands well.',
            buildsOn: ['autoconfiguration-imports'],
            blocks: [
                {
                    type: 'table',
                    title: 'The conditions that appear most',
                    headers: ['Condition', 'Passes when', 'Typical use'],
                    rows: [
                        ['<code>@ConditionalOnClass</code>', 'A type is on the class path', 'Configure Hibernate only if Hibernate is present'],
                        ['<code>@ConditionalOnMissingBean</code>', 'Nobody has defined one', '<strong>Back off if the user did it themselves</strong>'],
                        ['<code>@ConditionalOnBean</code>', 'Some other bean exists', 'Configure a <code>JdbcTemplate</code> only alongside a <code>DataSource</code>'],
                        ['<code>@ConditionalOnProperty</code>', 'A property has a value', 'Feature switches; note <code>matchIfMissing</code>'],
                        ['<code>@ConditionalOnWebApplication</code>', 'This is a servlet or reactive app', 'Web-only infrastructure'],
                        ['<code>@ConditionalOnResource</code>', 'A file exists on the class path', 'Legacy configuration files'],
                        ['<code>@ConditionalOnExpression</code>', 'A SpEL expression is true', 'The escape hatch. Prefer anything above it']
                    ]
                },
                {
                    type: 'prose',
                    html: '<p><code>@ConditionalOnClass</code> raises an obvious question: how can a class reference a type that might not be there without a <code>NoClassDefFoundError</code>? The answer is that Spring reads the annotation from the <strong>bytecode</strong> using ASM, as a string, without loading either the annotated class or the type it names. The class is only loaded once the condition has passed — which is also why the condition must be on the configuration class or method, and why a missing type mentioned in a method <em>signature</em> can still blow up.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong><code>matchIfMissing</code> decides what happens when nobody set the property, and the default is <code>false</code>.</strong> So <code>@ConditionalOnProperty("billing.audit.enabled")</code> with no <code>matchIfMissing = true</code> means the feature is off unless explicitly switched on — which is correct for an opt-in and wrong for anything meant to be on by default. It is a one-word difference between a feature that works out of the box and one that silently does nothing in every environment where nobody set the flag.</p>'
                }
            ],
            docs: [
                { title: 'Condition Annotations', url: 'https://docs.spring.io/spring-boot/reference/features/developing-auto-configuration.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-boot', questionId: 'how-auto-configuration-is-discovered' }
            ]
        },

        {
            id: 'ordering-and-backing-off',
            title: 'Backing Off',
            importance: 'must-know',
            summary: 'Define your own bean and Boot stops defining its. That works because auto-configuration runs last, and because these classes are explicitly ordered among themselves.',
            interviewAngle: 'Asked as "what happens if I define my own DataSource". The complete answer covers both halves: user configuration is processed first, and auto-configuration classes declare an order relative to each other.',
            buildsOn: ['conditional-annotations'],
            blocks: [
                {
                    type: 'diagram',
                    diagramType: 'flowchart',
                    caption: 'The reason "define your own and it backs off" is reliable rather than lucky.',
                    diagramConfig: {
                        title: 'What is registered, in what order',
                        nodes: [
                            { id: 'user', label: 'User @Configuration and scanned components', kind: 'start' },
                            { id: 'imports', label: 'Read every .imports file on the class path', kind: 'step' },
                            { id: 'order', label: 'Sort by @AutoConfiguration before / after', kind: 'step' },
                            { id: 'cond', label: 'Evaluate each class\'s conditions', kind: 'decision' },
                            { id: 'skip', label: 'Skipped — a bean already exists, or a class does not', kind: 'step' },
                            { id: 'apply', label: 'Applied — its @Bean methods register', kind: 'fix' }
                        ],
                        edges: [
                            { from: 'user', to: 'imports' },
                            { from: 'imports', to: 'order' },
                            { from: 'order', to: 'cond' },
                            { from: 'cond', to: 'skip', label: 'a condition fails' },
                            { from: 'cond', to: 'apply', label: 'all pass' }
                        ]
                    }
                },
                {
                    type: 'types',
                    title: 'The ordering annotations, and why they exist',
                    items: [
                        { name: '@AutoConfiguration(after = ...)', html: '<p>Since Boot 2.7, the replacement for <code>@AutoConfigureAfter</code>. <code>JdbcTemplateAutoConfiguration</code> runs after <code>DataSourceAutoConfiguration</code>, because <code>@ConditionalOnBean(DataSource.class)</code> is only meaningful once the <code>DataSource</code> has had its chance to register.</p>' },
                        { name: '@AutoConfiguration(before = ...)', html: '<p>The other direction, for a starter that must get in first.</p>' },
                        { name: '@AutoConfigureOrder', html: '<p>A numeric fallback where a relative order cannot be expressed. Rare, and rarely the right tool.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong><code>@ConditionalOnBean</code> is only safe inside auto-configuration, and only with the ordering declared.</strong> It asks "has one been registered so far", which is a question about a moment in time. Auto-configuration has a defined order, so the answer is deterministic there. On one of your own <code>@Configuration</code> classes, the answer depends on scan order and can change when a class is renamed. Boot\'s own reference documentation says so explicitly, and it is a real source of works-on-my-machine.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Say the two halves together: <em>"My configuration is processed first and auto-configuration runs last, so by the time <code>DataSourceAutoConfiguration</code> is evaluated my <code>DataSource</code> is already registered and its <code>@ConditionalOnMissingBean</code> fails. It backs off. Nothing is overridden — the second definition is never created."</em></p>'
                }
            ],
            docs: [
                { title: 'Auto-configuration Ordering', url: 'https://docs.spring.io/spring-boot/reference/features/developing-auto-configuration.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-boot', questionId: 'overriding-auto-configuration' }
            ]
        },

        {
            id: 'the-condition-evaluation-report',
            title: 'The Report You Can Print',
            importance: 'must-know',
            summary: 'Boot records every condition it evaluated and why each one passed or failed. One flag prints it, and it answers most auto-configuration questions outright.',
            interviewAngle: 'The best possible answer to "how would you debug auto-configuration" is a command. Very few candidates give one, and it converts a vague question into a demonstrated procedure.',
            buildsOn: ['ordering-and-backing-off'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'bash',
                    title: 'Three ways to see it',
                    code: '# 1. At startup, on the console.\njava -jar app.jar --debug\n\n# 2. The same, as a property.\n--spring.config.additional-location=... -Ddebug=true\n\n# 3. At runtime, as JSON, if Actuator is on the class path.\ncurl localhost:8080/actuator/conditions',
                    output: {
                        kind: 'trace',
                        lines: [
                            'The report has three sections. Positive matches list every auto-configuration that was applied, with the condition that let it in.',
                            'Negative matches list every one that was skipped, and -- the useful part -- the exact condition that failed.',
                            'Unconditional classes are applied always; exclusions list what was switched off by name.',
                            'So "why is there no DataSource" is answered by one line in the negative matches: OnClassCondition did not find com.zaxxer.hikari.HikariDataSource, or OnBeanCondition found an existing one.'
                        ],
                        explain: '<p>Note that <code>--debug</code> here does not mean debug-level logging for the whole application. It is a Boot-specific switch that enables the condition evaluation report and debug logging for a small set of core loggers. It is safe to run on a copy of a production configuration, and it is far faster than reasoning about which starter should have contributed what.</p>'
                    }
                },
                {
                    type: 'tip',
                    html: '<p>Have the procedure ready as a sentence: <em>"I would start the application with <code>--debug</code> and read the condition evaluation report. Negative matches tell you exactly which condition failed for the configuration you expected, and that is usually the whole answer — a missing class path entry, or a bean I defined myself that made Boot back off."</em></p>'
                }
            ],
            docs: [
                { title: 'Actuator — conditions endpoint', url: 'https://docs.spring.io/spring-boot/reference/actuator/endpoints.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-boot', questionId: 'overriding-auto-configuration' }
            ]
        },

        {
            id: 'excluding-autoconfiguration',
            title: 'Turning One Off',
            importance: 'should-know',
            summary: 'Two ways to exclude, one of which fails loudly if the class is absent. Needing to exclude anything is usually worth one question first.',
            interviewAngle: 'Comes up with the classic: excluding DataSourceAutoConfiguration because the application has no database. Knowing why the property form is more robust than the annotation form is the discriminating detail.',
            buildsOn: ['the-condition-evaluation-report'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'The two ways',
                    left: '@SpringBootApplication(exclude = ...)',
                    right: 'spring.autoconfigure.exclude',
                    rows: [
                        { aspect: 'Written in', left: 'Java, as a class literal', right: 'A property, as a string' },
                        { aspect: 'If the class is not on the class path', left: '<strong>Compile error</strong>, or a startup failure', right: 'Ignored quietly' },
                        { aspect: 'Per environment', left: 'No — it is compiled in', right: '<strong>Yes</strong>, per profile' },
                        { aspect: 'Refactoring-safe', left: 'Yes — it is a type', right: 'No — a rename breaks it silently' },
                        { aspect: 'Best for', left: 'A permanent, unconditional exclusion', right: 'An exclusion that varies by environment' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Excluding <code>DataSourceAutoConfiguration</code> to stop a startup failure usually treats the symptom.</strong> Boot only tries to build a <code>DataSource</code> because something put a JDBC driver and <code>spring-boot-starter-data-jpa</code> on the class path. If the application genuinely has no database, the dependency is the thing to remove; if it does have one, the missing URL is the thing to supply. An exclusion that hides a class path you did not intend will hide the next thing too.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>There is a third form worth knowing about for tests: <code>@TestConfiguration</code> and the sliced test annotations (<code>@WebMvcTest</code>, <code>@DataJpaTest</code>) do not exclude auto-configuration so much as start from a much smaller list of it. Reaching for an exclusion in a test is often a sign that a slice would have been the better tool.</p>'
                }
            ],
            docs: [
                { title: 'Disabling Specific Auto-configuration Classes', url: 'https://docs.spring.io/spring-boot/reference/using/auto-configuration.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-boot', questionId: 'overriding-auto-configuration' }
            ]
        },

        {
            id: 'writing-a-custom-starter',
            title: 'Writing One',
            importance: 'good-to-know',
            summary: 'Two modules by convention: an autoconfigure module with the code and the conditions, and a starter module that is nothing but dependencies.',
            interviewAngle: 'Comes up in platform and internal-library roles. The convention worth knowing is the naming rule — acme-spring-boot-starter, never spring-boot-starter-acme, which is reserved for the Boot team.',
            buildsOn: ['excluding-autoconfiguration'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The shape of an auto-configuration class',
                    code: '@AutoConfiguration                      // NOT @Configuration, since 2.7\n@ConditionalOnClass(AuditClient.class)  // do nothing without the library\n@EnableConfigurationProperties(AuditProperties.class)\npublic class AuditAutoConfiguration {\n\n    @Bean\n    @ConditionalOnMissingBean           // the user\'s own wins, always\n    @ConditionalOnProperty(\n            prefix = "acme.audit", name = "enabled", matchIfMissing = true)\n    AuditClient auditClient(AuditProperties properties) {\n        return new AuditClient(properties.endpoint(), properties.timeout());\n    }\n}',
                    notes: '<p>Every line except the <code>@Bean</code> is a condition, which is the honest summary of what an auto-configuration class is. Note <code>matchIfMissing = true</code>: this feature is on unless switched off, which is the usual intent for a starter and the opposite of the default.</p>'
                },
                {
                    type: 'types',
                    title: 'The conventions, and what each is for',
                    items: [
                        { name: 'Two modules', html: '<p><code>acme-spring-boot-autoconfigure</code> holds the code; <code>acme-spring-boot-starter</code> holds only a <code>pom.xml</code> depending on the first plus whatever it needs. A consumer who wants the classes without the opinions can depend on the first alone.</p>' },
                        { name: 'The naming rule', html: '<p><code>acme-spring-boot-starter</code>. <strong><code>spring-boot-starter-acme</code> is reserved</strong> for official starters, and using it is both a convention breach and a source of confusion about who maintains the thing.</p>' },
                        { name: 'The .imports file', html: '<p>Lists the auto-configuration classes. Forget it and the module is on the class path, is never read, and contributes nothing — with no error anywhere.</p>' },
                        { name: 'The metadata processor', html: '<p><code>spring-boot-configuration-processor</code> as an <code>optional</code> dependency generates the JSON that gives consumers IDE completion and documentation for your properties. Cheap, and it is what makes a starter feel finished.</p>' },
                        { name: 'Optional dependencies', html: '<p>Everything the conditions test for should be <code>optional</code> or <code>provided</code>, so that depending on the autoconfigure module does not drag in libraries the consumer did not ask for.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>The design rule that makes a starter good rather than merely working: <strong>every bean it contributes carries <code>@ConditionalOnMissingBean</code>.</strong> A starter that cannot be overridden is a starter that will be forked the first time somebody needs one thing done differently.</p>'
                }
            ],
            docs: [
                { title: 'Creating Your Own Starter', url: 'https://docs.spring.io/spring-boot/reference/features/developing-auto-configuration.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-boot', questionId: 'what-a-starter-is' }
            ]
        }
    ]
};
