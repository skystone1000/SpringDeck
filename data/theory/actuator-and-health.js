/* ==========================================================================
   data/theory/actuator-and-health.js — module 77 in the reading path

   The plan's tagline is the whole module in one clause: what to expose, and
   what liveness must never check. Seven chapters, and the liveness/readiness
   distinction is the one with real operational consequences — a liveness
   probe that checks the database restarts every pod when the database has a
   bad minute, which converts a recoverable dependency blip into an outage.

   Its prerequisite is application-lifecycle rather than anything in this
   track, because readiness, graceful shutdown and the startup sequence are
   the same subject seen from outside the process.
   ========================================================================== */

const actuatorAndHealthModule = {
    id: 'actuator-and-health',
    trackId: 'production',
    order: 77,
    title: 'Actuator and Health',
    tagline: 'What to expose, and what liveness must never check.',
    estimatedMinutes: 30,
    prerequisites: ['application-lifecycle'],
    docHub: { title: 'Spring Boot Actuator', url: 'https://docs.spring.io/spring-boot/reference/actuator/index.html' },

    chapters: [
        {
            id: 'actuator-endpoints',
            title: 'The Endpoints',
            importance: 'must-know',
            summary: 'Health, info, metrics, env, loggers, mappings, threaddump, heapdump. Two are exposed by default over HTTP, and the reason the rest are not is that several of them are dangerous.',
            interviewAngle: 'Naming the ones you would expose in production, and specifically why heapdump and env are not among them, is the answer.',
            buildsOn: [],
            blocks: [
                {
                    type: 'table',
                    title: 'The endpoints worth knowing',
                    headers: ['Endpoint', 'Gives', 'Expose over HTTP?'],
                    rows: [
                        ['<code>/health</code>', 'Up or down, with component detail', '<strong>Yes</strong> — details only when authorised'],
                        ['<code>/info</code>', 'Build version, git commit', 'Yes — and keep it free of anything internal'],
                        ['<code>/metrics</code>, <code>/prometheus</code>', 'Micrometer meters', 'Yes, on an internal port or scrape network'],
                        ['<code>/loggers</code>', 'Read <strong>and change</strong> log levels at run time', 'Authenticated only — it is a write endpoint'],
                        ['<code>/env</code>', 'Every property, values masked by pattern', '<strong>Rarely</strong> — masking is best-effort'],
                        ['<code>/configprops</code>', 'Bound configuration properties', 'Rarely, same reason'],
                        ['<code>/mappings</code>', 'Every route', 'No — it is a map of your API for an attacker'],
                        ['<code>/threaddump</code>', 'A full thread dump', 'Authenticated only; genuinely useful in an incident'],
                        ['<code>/heapdump</code>', '<strong>The entire heap, as a download</strong>', '<strong>Never.</strong> It contains every secret in memory.']
                    ]
                },
                {
                    type: 'syntax',
                    language: 'yaml',
                    title: 'A defensible production configuration',
                    code: 'management:\n  endpoints:\n    web:\n      exposure:\n        # An ALLOW-LIST. The default is health and info; anything more\n        # is a deliberate decision, named here.\n        include: health,info,prometheus,loggers,threaddump\n  endpoint:\n    health:\n      show-details: when-authorized       # never `always` on a public port\n      probes:\n        enabled: true                     # /health/liveness and /readiness\n  server:\n    # A SEPARATE PORT, not routed by the ingress. This is the single\n    # most effective control -- the endpoints are unreachable from\n    # outside the cluster whatever else is misconfigured.\n    port: 9090\n  info:\n    env:\n      enabled: false                      # do not publish arbitrary properties',
                    notes: '<p>The separate management port is worth more than every other setting here combined: it moves the whole surface off the port the ingress exposes, so an authorisation mistake in the application\'s security configuration cannot make <code>/actuator/env</code> reachable from the internet.</p>'
                }
            ],
            docs: [
                { title: 'Actuator Endpoints', url: 'https://docs.spring.io/spring-boot/reference/actuator/endpoints.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'observability-ops', questionId: 'actuator-endpoints' },
                { topicId: 'spring-boot', questionId: 'actuator-basics' }
            ]
        },

        {
            id: 'securing-actuator',
            title: 'Securing It',
            importance: 'must-know',
            summary: 'A separate port, an allow-list of endpoints, authentication on anything that reveals or changes state, and health details only for authorised callers.',
            interviewAngle: 'Actuator is a recurring source of real disclosures, and knowing that /env masks by pattern — so a secret in a property named something unexpected is published — is the specific detail.',
            buildsOn: ['actuator-endpoints'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'A chain for the management port',
                    code: '@Bean\n@Order(1)\nSecurityFilterChain actuator(HttpSecurity http) throws Exception {\n    return http\n            .securityMatcher(EndpointRequest.toAnyEndpoint())\n            .authorizeHttpRequests(auth -> auth\n                    // Liveness and readiness must be reachable by the\n                    // kubelet, which presents no credentials.\n                    .requestMatchers(EndpointRequest.to(HealthEndpoint.class))\n                            .permitAll()\n                    .requestMatchers(EndpointRequest.to("prometheus"))\n                            .permitAll()          // scraped from inside the mesh\n                    .anyRequest().hasRole("OPS"))\n            .httpBasic(withDefaults())\n            .csrf(csrf -> csrf.disable())\n            .build();\n}',
                    notes: '<p>The liveness and readiness exemption is not optional: the kubelet does not authenticate, so a probe endpoint behind authentication returns 401, the platform reads that as unhealthy, and the pod is restarted in a loop. It is a security configuration that presents as an application crash.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong><code>/env</code> masks values by property-name pattern, and a secret whose property name does not match the pattern is published in full.</strong> The defaults cover <code>password</code>, <code>secret</code>, <code>key</code>, <code>token</code> and a few more — so <code>acme.partner.credentials</code> or <code>stripe.api-identifier</code> comes through untouched. This has been a real disclosure route in real systems, and it is the reason the endpoint is best left unexposed rather than carefully configured.</p>'
                }
            ],
            docs: [
                { title: 'Actuator Security', url: 'https://docs.spring.io/spring-boot/reference/actuator/endpoints.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'observability-ops', questionId: 'actuator-endpoints' },
                { topicId: 'spring-security', questionId: 'owasp-api-top-ten' }
            ]
        },

        {
            id: 'health-indicators',
            title: 'How Health Is Composed',
            importance: 'should-know',
            summary: 'Every HealthIndicator bean contributes a component, and the overall status is the worst of them. Auto-configuration adds one per detected dependency, which is not always what you want.',
            interviewAngle: 'The aggregation rule is the useful fact: one DOWN component makes the whole endpoint DOWN, which decides what should be allowed to contribute.',
            buildsOn: ['securing-actuator'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>Each <code>HealthIndicator</code> bean is asked for a status and the results are aggregated. The default ordering treats <code>DOWN</code> and <code>OUT_OF_SERVICE</code> as worse than <code>UP</code>, and the overall status is the worst any component reported — so <strong>one struggling dependency makes the application report unhealthy</strong>.</p><p>Spring Boot auto-configures indicators for what it finds: the data source, Redis, RabbitMQ, Kafka, disk space, Mongo. That is convenient and it means a component you did not choose to depend on for health is deciding your reported status.</p>'
                },
                {
                    type: 'table',
                    title: 'Which dependencies should contribute to which check',
                    headers: ['Dependency', 'Liveness', 'Readiness', 'The overall /health'],
                    rows: [
                        ['<strong>The database</strong>', '<strong>No</strong>', 'Arguably yes — the service cannot serve without it', 'Yes'],
                        ['A cache', 'No', 'No — degrade instead', 'As a detail only'],
                        ['A downstream service', '<strong>No</strong>', '<strong>No</strong> — this is how outages cascade', 'No'],
                        ['A message broker', 'No', 'Only if the service exists to consume', 'Yes, as a detail'],
                        ['Disk space', 'No', 'Rarely', 'Yes'],
                        ['The application itself', '<strong>Yes</strong>', 'Yes', 'Yes']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>An indicator that checks a downstream service turns their outage into yours.</strong> If A\'s health depends on B\'s health, then B going down makes A report unhealthy, its instances are removed from the load balancer, and A is unavailable for every request — including the ones that never touch B. It is the cascading-failure chapter arriving through a health check, and it is why the whole "No" column above is the important one.</p>'
                }
            ],
            docs: [
                { title: 'Health Information', url: 'https://docs.spring.io/spring-boot/reference/actuator/endpoints.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'observability-ops', questionId: 'liveness-versus-readiness' }
            ]
        },

        {
            id: 'liveness-vs-readiness',
            title: 'Liveness Against Readiness',
            importance: 'must-know',
            summary: 'Liveness asks "should this process be killed". Readiness asks "should it receive traffic". Confusing them turns a dependency blip into a restart loop.',
            interviewAngle: 'The single most consequential distinction in the module. A liveness probe that checks the database is a widely repeated and genuinely harmful mistake.',
            buildsOn: ['health-indicators'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'Two questions with two different answers',
                    left: 'Liveness',
                    right: 'Readiness',
                    rows: [
                        { aspect: 'Asks', left: 'Is this process broken beyond recovery?', right: 'Can it serve a request right now?' },
                        { aspect: 'On failure', left: '<strong>The pod is killed and restarted</strong>', right: 'Removed from the Service; <strong>not restarted</strong>' },
                        { aspect: 'Should check', left: 'Only that the JVM is responsive', right: 'Dependencies the service cannot serve without' },
                        { aspect: 'Must never check', left: '<strong>Any external dependency</strong>', right: 'A downstream service' },
                        { aspect: 'Recoverable by restarting?', left: 'That is the assumption', right: 'No — the restart would not help' },
                        { aspect: 'Spring Boot endpoint', left: '<code>/actuator/health/liveness</code>', right: '<code>/actuator/health/readiness</code>' }
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>The test for whether something belongs in liveness is one question: <strong>would restarting the process fix it?</strong> A deadlocked thread pool, yes. An unrecoverable internal state, yes. The database being slow, no — restarting produces a new process that also cannot reach the database, and now with a cold cache and a cold JIT.</p><p>The failure that follows is well known and severe: a database blip makes every pod fail liveness, every pod restarts, all of them reconnect at once, the database is hit by a connection storm, and the blip becomes an outage that outlives its cause.</p>'
                },
                {
                    type: 'syntax',
                    language: 'yaml',
                    title: 'Probes wired to the right endpoints',
                    code: 'livenessProbe:\n  httpGet:\n    path: /actuator/health/liveness    # NOT /actuator/health\n    port: 9090\n  initialDelaySeconds: 30\n  periodSeconds: 10\n  failureThreshold: 3                  # 30s of failure before a restart\n\nreadinessProbe:\n  httpGet:\n    path: /actuator/health/readiness\n    port: 9090\n  periodSeconds: 5\n  failureThreshold: 2                  # remove from traffic quickly\n\n# Spring Boot manages both groups automatically once\n# management.endpoint.health.probes.enabled=true:\n#   liveness  -> LivenessState, which reflects the application context\n#   readiness -> ReadinessState, which goes REFUSING_TRAFFIC during\n#                graceful shutdown so the pod stops receiving requests\n#                BEFORE it starts refusing them.',
                    notes: '<p>The readiness behaviour during shutdown is the part that makes graceful shutdown actually graceful. Spring flips <code>ReadinessState</code> to <code>REFUSING_TRAFFIC</code> on <code>ContextClosedEvent</code>, so the endpoint fails, the pod leaves the Service, and in-flight requests drain — rather than the pod refusing connections while the load balancer is still sending them.</p>'
                }
            ],
            docs: [
                { title: 'Kubernetes Probes', url: 'https://docs.spring.io/spring-boot/reference/actuator/endpoints.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'observability-ops', questionId: 'liveness-versus-readiness' },
                { topicId: 'observability-ops', questionId: 'graceful-shutdown-in-kubernetes' }
            ]
        },

        {
            id: 'custom-health-indicator',
            title: 'Writing One',
            importance: 'should-know',
            summary: 'Implement HealthIndicator and decide which group it belongs to. The judgement is whether a failure should remove the instance from traffic — and usually it should not.',
            interviewAngle: 'The bar for adding an indicator is the interesting part: most things people want to report are metrics, not health.',
            buildsOn: ['liveness-vs-readiness'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'A contributor, and where to register it',
                    code: '@Component\nclass LicenceHealthIndicator implements HealthIndicator {\n\n    @Override\n    public Health health() {\n        Licence licence = licences.current();\n        if (licence.expired()) {\n            return Health.down()\n                    .withDetail("expiredAt", licence.expiresAt())\n                    .build();\n        }\n        if (licence.expiresWithin(Duration.ofDays(7))) {\n            // OUT_OF_SERVICE and UP are the two useful states here.\n            // A warning is a METRIC, not a health status.\n            return Health.up().withDetail("expiresAt", licence.expiresAt()).build();\n        }\n        return Health.up().build();\n    }\n}\n\n# Which group it contributes to is configuration, not code:\n# management.endpoint.health.group.readiness.include=readinessState,db,licence\n# management.endpoint.health.group.liveness.include=livenessState',
                    notes: '<p>Keeping the group membership in configuration rather than in the class is deliberate: whether a licence failure should remove an instance from traffic is an operational decision that may differ between environments, and it should not require a code change to revise.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The bar is high, and the question to apply is: <em>would I want this instance removed from the load balancer when this check fails?</em> "Certificate expires in 20 days" — no, that is an alert on a metric. "Cannot decrypt the data key" — yes, the instance cannot serve. Most proposed indicators fail that test and belong in <code>/metrics</code>, where they can be alerted on without affecting routing.</p>'
                }
            ],
            docs: [
                { title: 'Writing Custom HealthIndicators', url: 'https://docs.spring.io/spring-boot/reference/actuator/endpoints.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'observability-ops', questionId: 'actuator-endpoints' }
            ]
        },

        {
            id: 'info-and-build-metadata',
            title: 'Knowing What Is Running',
            importance: 'should-know',
            summary: 'The build version and the git commit, exposed by /info and attached to every metric. It converts "which version is in production" from a question into a lookup.',
            interviewAngle: 'A small thing that matters disproportionately during an incident, and it is two build-plugin lines.',
            buildsOn: ['custom-health-indicator'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'xml',
                    title: 'Two plugins, and the version appears everywhere',
                    code: '<!-- Writes META-INF/build-info.properties: version, artifact, time -->\n<plugin>\n    <groupId>org.springframework.boot</groupId>\n    <artifactId>spring-boot-maven-plugin</artifactId>\n    <executions>\n        <execution><goals><goal>build-info</goal></goals></execution>\n    </executions>\n</plugin>\n\n<!-- Writes git.properties: commit, branch, build time -->\n<plugin>\n    <groupId>io.github.git-commit-id</groupId>\n    <artifactId>git-commit-id-maven-plugin</artifactId>\n</plugin>\n\n<!-- Both are then picked up automatically by /actuator/info. -->',
                    notes: '<p>The commit id is the field that matters most during an incident. A version number tells you which release; the commit tells you exactly which code, including whether a hotfix actually shipped — and "is the fix deployed" is a question that gets asked in every incident and answered slowly without it.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Tag your metrics with the version as a common tag, so a dashboard can be filtered by it. During a canary or a rolling deploy that turns "is the new version worse" from an argument into a comparison on one graph — and it is the single most useful thing a release dashboard can show.</p>'
                }
            ],
            docs: [
                { title: 'Application Information', url: 'https://docs.spring.io/spring-boot/reference/actuator/endpoints.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'observability-ops', questionId: 'deployment-strategies' }
            ]
        },

        {
            id: 'startup-probe-and-slow-boot',
            title: 'Startup, and the Probe That Waits',
            importance: 'should-know',
            summary: 'A JVM that takes forty seconds to start will be killed by a liveness probe configured for a fast one. A startup probe exists precisely to hold liveness off until boot completes.',
            interviewAngle: 'The restart loop caused by a too-short initialDelaySeconds is a common and confusing failure — the application works and never finishes starting.',
            buildsOn: ['info-and-build-metadata'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>Spring Boot on a cold JVM can take tens of seconds: class loading, component scanning, connection pools, Flyway migrations, JIT warm-up. A liveness probe with a thirty-second initial delay against a forty-second startup kills the pod at thirty seconds, restarts it, and does the same again — <strong>a crash loop in an application that has no fault at all.</strong></p><p>Raising <code>initialDelaySeconds</code> works and has a cost: it also delays detection of a genuinely wedged process by the same amount, forever. A <strong>startup probe</strong> separates the two concerns.</p>'
                },
                {
                    type: 'syntax',
                    language: 'yaml',
                    title: 'A startup probe, so liveness can stay aggressive',
                    code: 'startupProbe:\n  httpGet:\n    path: /actuator/health/liveness\n    port: 9090\n  failureThreshold: 30\n  periodSeconds: 5              # up to 150 seconds to start, and no more\n\n# While the startup probe is failing, the liveness and readiness probes\n# are NOT run at all. Once it succeeds, it never runs again and these\n# take over -- so liveness can be tight without punishing a slow boot.\nlivenessProbe:\n  httpGet: { path: /actuator/health/liveness, port: 9090 }\n  periodSeconds: 10\n  failureThreshold: 3           # ~30s to detect a wedged process',
                    notes: '<p>The two settings are now independent, which is the point: a generous startup budget and a tight liveness check, instead of one number that has to be large enough for the slowest boot and is therefore too large for prompt failure detection.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The other direction is to make startup faster, and the biggest wins are usually not in Java: lazy initialisation for beans not needed at boot, running Flyway as an init container rather than in every replica, and Class Data Sharing. GraalVM native image takes it to milliseconds and costs the reflection configuration and build complexity the AOT chapter described — worth it for a function, rarely for a long-running service.</p>'
                }
            ],
            docs: [
                { title: 'Kubernetes — Configure Probes', url: 'https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'cloud', questionId: 'java-cold-starts' },
                { topicId: 'observability-ops', questionId: 'containerising-a-spring-boot-app' }
            ]
        }
    ]
};
