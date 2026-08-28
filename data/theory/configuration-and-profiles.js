/* ==========================================================================
   data/theory/configuration-and-profiles.js — module 27 in the reading path

   Seven chapters. The first one is the precedence order, because every
   other question in this module — why is my value not taking effect, which
   profile won, why does it work locally — is that order being asked
   indirectly.
   ========================================================================== */

const configurationAndProfilesModule = {
    id: 'configuration-and-profiles',
    trackId: 'spring-core',
    order: 27,
    title: 'External Configuration',
    tagline: 'Where a property comes from, and which one wins.',
    estimatedMinutes: 35,
    prerequisites: ['wiring-beans'],
    docHub: { title: 'Externalized Configuration', url: 'https://docs.spring.io/spring-boot/reference/features/external-config.html' },

    chapters: [
        {
            id: 'property-sources-and-precedence',
            title: 'Which Value Wins',
            importance: 'must-know',
            summary: 'Spring Boot layers about fifteen property sources in a fixed order and takes the first hit. Command line beats environment beats profile file beats application file.',
            interviewAngle: 'Asked directly, and asked indirectly every time someone says "the property is not taking effect". Knowing the top three and the bottom one, and that first hit wins, covers almost every real case.',
            buildsOn: [],
            blocks: [
                {
                    type: 'definition',
                    term: 'PropertySource',
                    important: true,
                    html: '<p>One named source of key–value pairs — a file, the environment, the command line, a config server. The <code>Environment</code> holds an <strong>ordered list</strong> of them and resolves a key by asking each in turn, <em>returning the first hit</em>. Nothing merges; a later source does not override an earlier one, it is simply never asked.</p>'
                },
                {
                    type: 'types',
                    title: 'The order that matters in practice, highest precedence first',
                    items: [
                        { name: 'Command line arguments', html: '<p><code>--server.port=9090</code>. Beats everything, which is what makes it the right tool for a one-off override.</p>' },
                        { name: 'SPRING_APPLICATION_JSON', html: '<p>A JSON blob in an environment variable or system property. Common in container platforms.</p>' },
                        { name: 'OS environment variables', html: '<p><code>SERVER_PORT=9090</code>. <strong>The normal way to configure a container</strong>, and the reason relaxed binding exists.</p>' },
                        { name: 'Java system properties', html: '<p><code>-Dserver.port=9090</code>.</p>' },
                        { name: 'Profile-specific files, outside the jar', html: '<p><code>application-prod.yml</code> next to the jar, or in <code>./config/</code>.</p>' },
                        { name: 'Profile-specific files, inside the jar', html: '<p>Packaged <code>application-prod.yml</code>. <strong>Always beats the non-profile file</strong>, whichever side of the jar boundary each is on.</p>' },
                        { name: 'application.yml, outside then inside', html: '<p>The base configuration.</p>' },
                        { name: '@PropertySource', html: '<p>Explicitly imported files.</p>' },
                        { name: 'Default properties', html: '<p><code>SpringApplication.setDefaultProperties</code>. The floor.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A profile-specific file does not replace the base file — it is layered above it.</strong> Keys present in <code>application-prod.yml</code> win; keys absent from it still come from <code>application.yml</code>. This is usually what you want and is occasionally a nasty surprise, because a setting you believed you had removed in production is still active, inherited from the base file where nobody thought to look.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The diagnostic is better than the recall. The <code>/actuator/env</code> endpoint lists every property source in order and shows which one supplied each key, including the values that were overridden. When someone says a property is not taking effect, that endpoint answers it in one request — and saying so is a better answer than reciting the list.</p>'
                }
            ],
            docs: [
                { title: 'Externalized Configuration', url: 'https://docs.spring.io/spring-boot/reference/features/external-config.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-core', questionId: 'environment-and-property-sources' }
            ]
        },

        {
            id: 'value-vs-configurationproperties',
            title: '@Value or @ConfigurationProperties',
            importance: 'must-know',
            summary: '@Value injects one string-ish value at one point. @ConfigurationProperties binds a whole tree onto a typed object, and can validate it.',
            interviewAngle: 'A reliable question with a clear answer: @Value for one-offs, @ConfigurationProperties for anything with more than about two related keys. The reason is validation and testability, not tidiness.',
            buildsOn: ['property-sources-and-precedence'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'The two binding mechanisms',
                    left: '@Value',
                    right: '@ConfigurationProperties',
                    rows: [
                        { aspect: 'Binds', left: 'One key to one field or parameter', right: 'A whole prefix to an object graph' },
                        { aspect: 'Relaxed binding', left: '<strong>No</strong> — the key must match exactly', right: '<strong>Yes</strong> — the next chapter' },
                        { aspect: 'Type safety', left: 'Converted, but per site', right: 'The object is the contract' },
                        { aspect: 'Validation', left: 'None', right: '<code>@Validated</code> with Bean Validation annotations' },
                        { aspect: 'SpEL', left: 'Yes — <code>#{...}</code>', right: 'No' },
                        { aspect: 'Metadata and IDE completion', left: 'No', right: 'Yes, via the annotation processor' },
                        { aspect: 'Testing', left: 'Needs a context, or reflection', right: 'A plain object you can construct' }
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The typed form, with validation and immutability',
                    code: '@ConfigurationProperties(prefix = "billing")\n@Validated\nrecord BillingProperties(\n        @NotBlank String endpoint,\n        @Positive int retries,\n        @DurationUnit(ChronoUnit.SECONDS) Duration timeout) {\n}\n\n// Registered by @EnableConfigurationProperties, or by a\n// @ConfigurationPropertiesScan on the application class.\n\n@Service\nclass BillingClient {\n    BillingClient(BillingProperties config) { ... }   // ordinary injection\n}',
                    notes: '<p>Constructor binding onto a <code>record</code> gives immutable configuration validated at startup. A missing <code>billing.endpoint</code> then fails the context with a message naming the property, rather than producing a null that surfaces on the first request.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong><code>@Value</code> on a field is resolved by a <code>BeanPostProcessor</code>, so it is null inside the constructor</strong> — the same window that field injection has, for the same reason. Anything computed from a <code>@Value</code> field belongs in <code>@PostConstruct</code>, or better, in a constructor parameter annotated with <code>@Value</code>, which is resolved in time.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>SpEL in <code>@Value</code> is worth knowing exists and worth using sparingly: <code>@Value("#{systemProperties[\'user.region\']}")</code> works, and a non-trivial expression in an annotation is a piece of logic with no test, no type check and no stack trace. <code>${...}</code> is a property placeholder; <code>#{...}</code> is an expression language. They are different mechanisms that look alike.</p>'
                }
            ],
            docs: [
                { title: 'Type-safe Configuration Properties', url: 'https://docs.spring.io/spring-boot/reference/features/external-config.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-core', questionId: 'value-vs-configuration-properties' },
                { topicId: 'spring-core', questionId: 'spel-in-value' }
            ]
        },

        {
            id: 'relaxed-binding',
            title: 'Relaxed Binding',
            importance: 'should-know',
            summary: 'One property can be written five ways, because an environment variable cannot contain a dot. The rules are mechanical and worth knowing exactly.',
            interviewAngle: 'Rarely asked head-on, and it is the answer to a very common practical question: what environment variable sets this property. Getting the conversion right — dots to underscores, uppercase, remove the dashes — is the whole thing.',
            buildsOn: ['value-vs-configurationproperties'],
            blocks: [
                {
                    type: 'table',
                    title: 'The same property, written five ways',
                    headers: ['Form', 'Example', 'Where it is used'],
                    rows: [
                        ['Kebab case', '<code>spring.datasource.max-pool-size</code>', '<strong>The canonical form.</strong> Use it in files'],
                        ['Camel case', '<code>spring.datasource.maxPoolSize</code>', 'Accepted; inconsistent with everything else'],
                        ['Underscore', '<code>spring.datasource.max_pool_size</code>', 'Accepted'],
                        ['Upper with underscores', '<code>SPRING_DATASOURCE_MAXPOOLSIZE</code>', '<strong>Environment variables.</strong> Dots and dashes both become underscores'],
                        ['Indexed', '<code>MYAPP_SERVERS_0_HOST</code>', 'A list element, from an environment variable']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Relaxed binding applies to <code>@ConfigurationProperties</code> and not to <code>@Value</code>.</strong> <code>@Value("${max-pool-size}")</code> will not be satisfied by <code>MAX_POOL_SIZE</code> in the environment, and the failure is a placeholder-resolution error at startup that names the key you wrote rather than the one that exists. This asymmetry is the most common reason a container-supplied variable appears to be ignored.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The conversion rule for an environment variable, stated once: uppercase everything, replace every dot and every dash with an underscore, and for a list use the index as its own segment. <code>spring.datasource.max-pool-size</code> becomes <code>SPRING_DATASOURCE_MAXPOOLSIZE</code>. Being able to do that in your head is a small thing that comes up constantly.</p>'
                }
            ],
            docs: [
                { title: 'Relaxed Binding', url: 'https://docs.spring.io/spring-boot/reference/features/external-config.html', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'profiles',
            title: 'Profiles',
            importance: 'must-know',
            summary: 'A named set of configuration and beans, activated at startup. Powerful, and the main way a codebase acquires an environment-shaped conditional it cannot test.',
            interviewAngle: 'The recall half is easy. The judgement half — when a profile is the wrong tool — is what a senior interview is looking for, and the answer is that a profile-conditional bean is a code path no test exercises.',
            buildsOn: ['property-sources-and-precedence'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'yaml',
                    title: 'Grouped documents in one file, and a profile group',
                    code: 'spring:\n  application:\n    name: billing\n  profiles:\n    # A group: activating "prod" activates all three.\n    group:\n      prod: [ "prod-db", "prod-cache", "metrics" ]\n\n---\nspring:\n  config:\n    activate:\n      on-profile: dev\nlogging:\n  level:\n    org.hibernate.SQL: DEBUG\n\n---\nspring:\n  config:\n    activate:\n      on-profile: prod\nlogging:\n  level:\n    root: WARN',
                    notes: '<p><code>spring.config.activate.on-profile</code> replaced the older <code>spring.profiles</code> key in Boot 2.4, when the whole document-ordering model was reworked. Configuration copied from an older answer will use the old key, which is silently ignored rather than rejected.</p>'
                },
                {
                    type: 'types',
                    title: 'Where a profile can be activated, and which to prefer',
                    items: [
                        { name: 'SPRING_PROFILES_ACTIVE', html: '<p>The environment variable. <strong>The right one for a deployed service</strong> — the platform decides, and the artefact is identical everywhere.</p>' },
                        { name: '--spring.profiles.active=prod', html: '<p>A command-line argument. Fine for a one-off run.</p>' },
                        { name: 'spring.profiles.active in a file', html: '<p>Works, and hard-codes an environment into the artefact. Reasonable only in a test resource.</p>' },
                        { name: '@ActiveProfiles', html: '<p>On a test class. This is the case the annotation exists for.</p>' },
                        { name: 'spring.profiles.include', html: '<p>Adds profiles on top of whatever is active, rather than replacing. Distinct from a group, which is defined once and expanded on activation.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A <code>@Profile("prod")</code> bean is a code path that no test runs.</strong> Tests execute the <code>test</code> profile, so the production implementation is compiled and never exercised, and the first execution of that branch is in production. Prefer a property that changes a <em>value</em> over a profile that changes a <em>bean</em>; where a different implementation is genuinely required, at least give the production one a test with the profile explicitly activated.</p>'
                },
                {
                    type: 'tip',
                    html: '<p><code>@Profile("!prod")</code> negation and expressions like <code>@Profile("cloud &amp; !test")</code> both work. They are also where profile logic starts becoming a boolean language embedded in annotations across a codebase, evaluated at startup, with no single place to read it. Two or three profiles is a configuration strategy; nine is a puzzle.</p>'
                }
            ],
            docs: [
                { title: 'Profiles', url: 'https://docs.spring.io/spring-boot/reference/features/profiles.html', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'config-validation',
            title: 'Failing at Startup Instead of at Midnight',
            importance: 'should-know',
            summary: 'Configuration that is validated when the context builds turns a 3am NumberFormatException into a deployment that refuses to start.',
            interviewAngle: 'A design-sense question. The principle — validate configuration as early as possible, and prefer a failed deploy to a broken runtime — generalises well beyond Spring and is worth stating as a principle.',
            buildsOn: ['value-vs-configurationproperties'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Constraints on the properties object',
                    code: '@ConfigurationProperties(prefix = "billing")\n@Validated\nclass BillingProperties {\n\n    @NotBlank\n    private String endpoint;\n\n    @Min(1) @Max(10)\n    private int retries = 3;              // a default, still validated\n\n    @NotNull\n    private Duration timeout;             // 30s, PT30S, 30000ms all bind\n\n    @Valid                                // cascade into the nested object\n    private Retry retry = new Retry();\n}',
                    output: {
                        kind: 'trace',
                        lines: [
                            'Binding happens while the context is being built, and @Validated runs the constraints immediately after.',
                            'A violation throws before the application is ready, so the health check never passes and the deployment does not roll forward.',
                            'The message names the property path and the constraint -- "billing.retries: must be less than or equal to 10" -- rather than the field.',
                            'Without @Validated the annotations are inert: they bind, they are ignored, and the bad value is discovered by whatever code first uses it.'
                        ],
                        explain: '<p>The <code>@Validated</code> annotation is the load-bearing one and it is easy to omit, because the constraint annotations look like they are doing something on their own. They are not. A properties class with <code>@NotBlank</code> and no <code>@Validated</code> validates nothing at all.</p>'
                    }
                },
                {
                    type: 'tip',
                    html: '<p>The general principle is worth stating in a design round: <em>"I want configuration errors to fail the deployment, not the request. Anything I can check at startup — a required URL, a range, a parseable duration — I check at startup, because at that point the failure is one clear message in a log nobody is under pressure to read."</em></p>'
                }
            ],
            docs: [
                { title: '@ConfigurationProperties Validation', url: 'https://docs.spring.io/spring-boot/reference/features/external-config.html', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'secrets',
            title: 'Secrets, and What Never Goes in the Repository',
            importance: 'should-know',
            summary: 'A password in application.yml is in the git history forever, and rotating it does not remove it. The mechanisms that avoid this are all boring, which is the point.',
            interviewAngle: 'Comes up in system-design and in security-flavoured rounds. Naming a concrete mechanism — a secret manager, a mounted file, an environment variable injected by the platform — and knowing why the last is not ideal either, is enough.',
            buildsOn: ['property-sources-and-precedence'],
            blocks: [
                {
                    type: 'types',
                    title: 'The options, roughly worst to best',
                    items: [
                        { name: 'In application.yml', html: '<p>Committed, permanent, visible to everyone with repository access and to every fork. Rotating the secret does not remove it from the history.</p>' },
                        { name: 'An environment variable', html: '<p>Much better, and still visible in <code>/proc</code>, in a process listing, in a crash dump, and often in the deployment manifest that set it.</p>' },
                        { name: 'A mounted file', html: '<p>A Kubernetes secret mounted as a volume, read via <code>spring.config.import=optional:file:/etc/secrets/</code>. Not in the environment, not in the image, and rotatable without a redeploy.</p>' },
                        { name: 'A secret manager', html: '<p>Vault, AWS Secrets Manager, GCP Secret Manager. Fetched at startup or on a lease, with an audit trail and rotation. Spring Cloud Vault and the AWS integrations both surface them as ordinary property sources.</p>' },
                        { name: 'No long-lived secret at all', html: '<p>An instance identity — an IAM role, a workload identity — exchanged for short-lived credentials. The best answer where the platform supports it, because there is nothing to leak.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Actuator will happily print your configuration.</strong> <code>/actuator/env</code> and <code>/actuator/configprops</code> expose property values, and Boot masks only keys whose names look sensitive — <code>password</code>, <code>secret</code>, <code>key</code>, <code>token</code>, <code>credentials</code>. A key called <code>billing.api-string</code> holding a bearer token is not masked and will be printed in full. Either name the key so the mask catches it, or set <code>management.endpoint.env.show-values=never</code>.</p>'
                }
            ],
            docs: [
                { title: 'Actuator — Sanitize Sensitive Values', url: 'https://docs.spring.io/spring-boot/reference/actuator/endpoints.html', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'config-in-kubernetes',
            title: 'Configuration in Kubernetes',
            importance: 'good-to-know',
            summary: 'ConfigMaps and Secrets arrive as environment variables or as mounted files. The choice between them decides whether a change needs a restart.',
            interviewAngle: 'Increasingly common in backend interviews. The distinction worth having ready is that an environment variable is fixed for the life of the process and a mounted file is not.',
            buildsOn: ['relaxed-binding'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'Two ways to deliver the same ConfigMap',
                    left: 'As environment variables',
                    right: 'As a mounted volume',
                    rows: [
                        { aspect: 'Reaches Spring via', left: 'Relaxed binding on the environment', right: '<code>spring.config.import=configtree:/config/</code>' },
                        { aspect: 'Updated without a restart', left: '<strong>No.</strong> Fixed at process start', right: 'The file changes; the process must re-read it' },
                        { aspect: 'Visible in a process listing', left: 'Yes', right: 'No' },
                        { aspect: 'Structure', left: 'Flat keys only', right: 'A directory tree, or whole YAML files' },
                        { aspect: 'Good for', left: 'A handful of simple settings', right: 'Secrets, and larger configuration' }
                    ]
                },
                {
                    type: 'syntax',
                    language: 'properties',
                    title: 'Importing a mounted directory as properties',
                    code: '# Every file in the directory becomes one property, named after the\n# file, with the file contents as its value. This is exactly the shape\n# a Kubernetes secret volume has.\nspring.config.import=optional:configtree:/etc/secrets/\n\n# optional: means the application still starts where the mount is\n# absent -- on a developer machine, or in a test.',
                    notes: '<p>The <code>optional:</code> prefix is worth using by default on anything environment-specific. Without it a missing mount is a startup failure, which is correct in production and merely annoying everywhere else.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Resist the pull towards live configuration reloading. <code>@RefreshScope</code> and a config server can change a value in a running process, and the cost is that two instances of the same service can now be running different configuration with nothing recording which. A rolling restart is slower, auditable, and rolls back. Say that trade-off out loud rather than treating refresh as a straightforward win.</p>'
                }
            ],
            docs: [
                { title: 'Importing Additional Data', url: 'https://docs.spring.io/spring-boot/reference/features/external-config.html', kind: 'guide' }
            ],
            relatedQuestions: []
        }
    ]
};
