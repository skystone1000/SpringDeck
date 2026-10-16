/* ==========================================================================
   data/theory/platform-concerns.js — module 74 in the reading path

   The distributed track closes on the parts nobody owns until they break,
   which is the plan's tagline and is accurate. Seven chapters, and two of
   them are explicitly "in outline" because a Java backend interview asks
   whether you know what a service mesh is for, not how to configure Istio.

   The chapter that carries the most practical weight is distributed tracing
   context, because context propagation is where the Java-specific difficulty
   lives — a ThreadLocal that does not survive @Async, a reactive chain or a
   Kafka listener, which is the same problem the SecurityContextHolder
   chapter described in the security track.
   ========================================================================== */

const platformConcernsModule = {
    id: 'platform-concerns',
    trackId: 'distributed',
    order: 74,
    title: 'The Platform Around the Services',
    tagline: 'Gateway, discovery, config, tracing — the parts nobody owns until they break.',
    estimatedMinutes: 35,
    prerequisites: ['scaling-data'],
    docHub: { title: 'Spring Cloud Gateway', url: 'https://docs.spring.io/spring-cloud-gateway/reference/' },

    chapters: [
        {
            id: 'api-gateway-responsibilities',
            title: 'What a Gateway Is For',
            importance: 'must-know',
            summary: 'One entry point that does the things every service would otherwise repeat: TLS, authentication, rate limiting, routing. And it must not do business logic.',
            interviewAngle: 'The failure mode is the interesting half — a gateway that accumulates request transformation and routing rules becomes a shared component every team must change.',
            buildsOn: [],
            blocks: [
                {
                    type: 'types',
                    title: 'What belongs in it, and what does not',
                    items: [
                        { name: 'Belongs: TLS termination', html: '<p>One place holding certificates and one renewal process.</p>' },
                        { name: 'Belongs: authentication', html: '<p>Validate the token once at the edge. Services still authorise, but they need not each fetch a JWKS.</p>' },
                        { name: 'Belongs: rate limiting', html: '<p>Reject before the traffic reaches anything expensive — the security track\'s "shed early, shed cheaply".</p>' },
                        { name: 'Belongs: routing and versioning', html: '<p>Path or header to service. One place that knows the topology.</p>' },
                        { name: 'Belongs: cross-cutting observability', html: '<p>Correlation ids, request logs, edge latency metrics.</p>' },
                        { name: 'Does not belong: business logic', html: '<p>A gateway that decides whether an order may be placed is a service with a routing table attached, owned by nobody and changed by everybody.</p>' },
                        { name: 'Does not belong: response aggregation', html: '<p>Calling three services and merging the results is a backend-for-frontend. Build that as a service; it has a team and a test suite.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A gateway is a single point of failure and a single point of contention, in that order of severity.</strong> The availability problem is solved by running several instances. The contention problem is not: once every team must change the gateway to ship a feature, it becomes a queue, and the team that owns it becomes a bottleneck for everyone. Keep its configuration declarative and per-route, so a team can add a route without touching anyone else\'s.</p>'
                }
            ],
            docs: [
                { title: 'Spring Cloud Gateway', url: 'https://docs.spring.io/spring-cloud-gateway/reference/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'microservices', questionId: 'api-gateway-responsibilities' }
            ]
        },

        {
            id: 'service-discovery',
            title: 'Service Discovery',
            importance: 'should-know',
            summary: 'Instances come and go, so their addresses cannot be configuration. A registry maps a logical name to the current set of healthy addresses — and in Kubernetes, DNS already does it.',
            interviewAngle: 'The current answer is that most teams do not run a discovery server any more, because the platform provides one. Knowing that is a currency signal.',
            buildsOn: ['api-gateway-responsibilities'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'Two eras of the same problem',
                    left: 'A discovery server (Eureka, Consul)',
                    right: 'Kubernetes DNS',
                    rows: [
                        { aspect: 'Registration', left: 'The application registers itself and heartbeats', right: 'The platform does it; the application knows nothing' },
                        { aspect: 'Lookup', left: 'A client library queries the registry', right: '<code>http://pricing/</code> — ordinary DNS' },
                        { aspect: 'Health', left: 'Heartbeat plus the application\'s own health endpoint', right: 'Readiness probes remove a pod from the Service' },
                        { aspect: 'Load balancing', left: 'Client-side, from the fetched instance list', right: 'Server-side, by kube-proxy — or client-side if you ask for it' },
                        { aspect: 'Application dependency', left: 'A client library, and a registry to operate', right: '<strong>None</strong>' },
                        { aspect: 'Where it is right', left: 'VMs, or a platform with no service abstraction', right: '<strong>Anything on Kubernetes</strong>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>If asked how services find each other today, the honest answer is usually <em>"they do not — the platform tells them"</em>. A Kubernetes <code>Service</code> gives a stable name and a virtual IP, readiness probes take unhealthy pods out of rotation, and the application makes an ordinary HTTP call to a hostname. Eureka and Consul are the answer for a VM-based estate, and knowing which era a question is set in is part of answering it.</p>'
                }
            ],
            docs: [
                { title: 'Kubernetes — Service', url: 'https://kubernetes.io/docs/concepts/services-networking/service/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'microservices', questionId: 'service-discovery' }
            ]
        },

        {
            id: 'client-vs-server-side-load-balancing',
            title: 'Where the Balancing Happens',
            importance: 'should-know',
            summary: 'The caller picks an instance, or a proxy does. The distinction matters most for gRPC and HTTP/2, where long-lived connections defeat connection-level balancing.',
            interviewAngle: 'The gRPC case is the practical one: a layer-4 balancer distributes connections, and gRPC multiplexes everything over very few of them.',
            buildsOn: ['service-discovery'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'Two places to choose an instance',
                    left: 'Client-side',
                    right: 'Server-side (a proxy)',
                    rows: [
                        { aspect: 'Who chooses', left: 'The calling application, from an instance list', right: 'A load balancer or kube-proxy' },
                        { aspect: 'Extra hop', left: 'None', right: 'One' },
                        { aspect: 'Awareness of instance health', left: 'Can use its own latency observations', right: 'Uses the balancer\'s health checks' },
                        { aspect: 'Application dependency', left: 'A client library in every service', right: 'None' },
                        { aspect: 'Language support', left: 'Needed per language', right: 'Language-agnostic' },
                        { aspect: 'HTTP/2 and gRPC', left: '<strong>Balances requests correctly</strong>', right: 'A layer-4 balancer balances <em>connections</em>, which is nearly useless here' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>gRPC behind a connection-level load balancer sends almost all traffic to one instance.</strong> HTTP/2 multiplexes many concurrent calls over one long-lived connection, so a balancer that distributes <em>connections</em> makes one decision at startup and never revisits it. The fixes are a layer-7 proxy that understands HTTP/2 streams, client-side balancing with a headless Service so the client sees every pod address, or a service mesh sidecar — and the symptom without one is dramatic, sustained load imbalance that looks like a bug in the application.</p>'
                }
            ],
            docs: [
                { title: 'gRPC — Load Balancing', url: 'https://grpc.io/blog/grpc-load-balancing/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'microservices', questionId: 'service-discovery' },
                { topicId: 'beyond-rest', questionId: 'http2-and-what-it-changed' }
            ]
        },

        {
            id: 'centralised-configuration',
            title: 'Configuration Across Services',
            importance: 'should-know',
            summary: 'Environment-specific values belong outside the artefact. A config server, a ConfigMap or environment variables all achieve that, and refresh-without-restart is where it gets complicated.',
            interviewAngle: 'The practical point is that dynamic refresh is harder than it looks — a bean holding a value at construction does not see a change, whatever the config source does.',
            buildsOn: ['client-vs-server-side-load-balancing'],
            blocks: [
                {
                    type: 'table',
                    title: 'Where configuration can come from',
                    headers: ['Source', 'Refresh without restart', 'Note'],
                    rows: [
                        ['Baked into the jar', 'No', 'Only for values that are the same everywhere'],
                        ['Environment variables', 'No', 'The twelve-factor default; simple and sufficient for most'],
                        ['A Kubernetes ConfigMap as a file', 'The file updates; <strong>the application must re-read it</strong>', 'A restart is the usual answer'],
                        ['Spring Cloud Config Server', 'Yes, via <code>/actuator/refresh</code>', 'A component to operate, and to keep available at startup'],
                        ['Consul or etcd', 'Yes, by watching', 'Usually already present for other reasons'],
                        ['A feature-flag service', '<strong>Yes, by design</strong>', 'The right tool for anything that changes at run time']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Refresh does not reach a value that was read once.</strong> A field injected with <code>@Value</code> at construction holds whatever the property was then, and no refresh event changes it. <code>@RefreshScope</code> works by recreating the bean on refresh — which means anything holding a reference to the old instance keeps the old value, and any state on that bean is discarded. Reading through <code>@ConfigurationProperties</code> at the point of use, rather than capturing into a field, is the pattern that behaves predictably.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Separate the two kinds of setting and treat them differently. <strong>Deployment configuration</strong> — database URLs, pool sizes, timeouts — belongs in the environment and changes with a deploy; a restart is a perfectly good refresh mechanism. <strong>Run-time flags</strong> — a kill switch, a rollout percentage, a rate limit — need to change without a deploy, and that is a feature-flag system rather than a config server. Conflating them produces a config server nobody trusts and a restart nobody wants.</p>'
                }
            ],
            docs: [
                { title: 'Spring Boot — Externalized Configuration', url: 'https://docs.spring.io/spring-boot/reference/features/external-config.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'microservices', questionId: 'configuration-across-services' },
                { topicId: 'spring-boot', questionId: 'refreshing-configuration' }
            ]
        },

        {
            id: 'distributed-tracing-context',
            title: 'Propagating the Context',
            importance: 'must-know',
            summary: 'A trace id must travel with the request across every hop and every thread. The Java-specific difficulty is that it lives in a ThreadLocal, which does not follow @Async, a reactive chain or a Kafka listener.',
            interviewAngle: 'The propagation problem is the same one as SecurityContextHolder, and recognising that it is one problem with several symptoms is the depth.',
            buildsOn: ['centralised-configuration'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>A trace is a tree of spans sharing one trace id. Each service creates spans and passes the id onward in a header — <code>traceparent</code>, under W3C Trace Context, which has replaced the older vendor-specific formats. Without propagation you get a set of unconnected single-service traces, which is strictly less useful than no tracing at all because it looks like it is working.</p><p>Inside a JVM the id is held in a <code>ThreadLocal</code>, and that is where it goes wrong. Every boundary that changes thread loses it unless something carries it across.</p>'
                },
                {
                    type: 'table',
                    title: 'Where the context is lost, and what restores it',
                    headers: ['Boundary', 'Lost?', 'Fix'],
                    rows: [
                        ['An outbound HTTP call', 'No, if the client is instrumented', 'Use the auto-configured <code>RestClient.Builder</code> rather than <code>new</code>'],
                        ['<code>@Async</code> or an executor', '<strong>Yes</strong>', 'A context-propagating executor — the same shape as <code>DelegatingSecurityContextExecutor</code>'],
                        ['A parallel stream', '<strong>Yes</strong>', 'Do not use one for instrumented work'],
                        ['A reactive chain', '<strong>Yes</strong>', 'Reactor Context plus the context-propagation library'],
                        ['A Kafka producer and consumer', 'Not automatically', 'Inject and extract the header; Spring Kafka does it when observation is enabled'],
                        ['A scheduled job', 'N/A — it starts a new trace', 'Correct behaviour; give it its own root span']
                    ]
                },
                {
                    type: 'syntax',
                    language: 'yaml',
                    title: 'Turning it on, and the sampling decision',
                    code: 'management:\n  tracing:\n    sampling:\n      # 100% in development. In production this is a COST decision:\n      # every sampled trace is stored and queried. 1-10% is usual.\n      probability: 0.1\n    propagation:\n      type: w3c                  # traceparent, not the older b3 format\n  otlp:\n    tracing:\n      endpoint: http://collector:4318/v1/traces\n\nlogging:\n  pattern:\n    # Put the ids in every log line, so a log search and a trace search\n    # find the same request. This is the highest-value line here.\n    level: "%5p [${spring.application.name},%X{traceId:-},%X{spanId:-}]"',
                    notes: '<p>Sampling is head-based by default: the decision is made at the first service and propagated, so a trace is either complete or absent rather than half-recorded. The consequence is that a 10% sample means 90% of your requests have no trace at all — including, statistically, most of the slow ones. Tail-based sampling in a collector, which keeps traces that were slow or errored, is the answer when that matters.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Putting the trace id in every log line is the single highest-return item in this module. It makes a log search and a trace search find the same request, which turns "the customer says it failed at 14:32" from an investigation into two clicks — and it is one line of configuration.</p>'
                }
            ],
            docs: [
                { title: 'W3C Trace Context', url: 'https://www.w3.org/TR/trace-context/', kind: 'spec' },
                { title: 'Spring Boot — Tracing', url: 'https://docs.spring.io/spring-boot/reference/actuator/tracing.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'microservices', questionId: 'distributed-tracing' },
                { topicId: 'observability-ops', questionId: 'correlation-ids-and-structured-logs' }
            ]
        },

        {
            id: 'service-mesh-in-outline',
            title: 'Service Mesh, in Outline',
            importance: 'good-to-know',
            summary: 'A sidecar proxy beside every service handles mTLS, retries, timeouts, circuit breaking and traffic shifting — moving those concerns out of the application and into the platform.',
            interviewAngle: 'Knowing what it replaces is the answer: it is Resilience4j and the tracing library, implemented once in infrastructure rather than per language.',
            buildsOn: ['distributed-tracing-context'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'In the library, or in the sidecar',
                    left: 'In the application (Resilience4j, Micrometer)',
                    right: 'In the mesh (Istio, Linkerd)',
                    rows: [
                        { aspect: 'Retries, timeouts, circuit breaking', left: 'Configured per service, in code', right: 'Configured per route, in the platform' },
                        { aspect: 'mTLS between services', left: 'Substantial work', right: '<strong>Automatic, with certificate rotation</strong>' },
                        { aspect: 'Language support', left: 'A library per language', right: 'Language-agnostic' },
                        { aspect: 'Traffic shifting — canary, mirroring', left: 'Not really possible', right: 'A first-class feature' },
                        { aspect: 'Knows about business context', left: '<strong>Yes</strong> — can decide by user, tenant or operation', right: 'No — it sees HTTP, not meaning' },
                        { aspect: 'Cost', left: 'A dependency', right: 'A proxy per pod: latency, memory, and a control plane to operate' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>The dividing line worth stating: <strong>a mesh handles what can be decided from the request; the application handles what needs to know what the request means.</strong> A timeout and a retry on a 503 are transport decisions and belong in the mesh. "Fall back to a cached recommendation set, but never to a cached price" is a business decision and belongs in the code. Teams that move everything to the mesh find the second category coming back.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Retries configured in both places multiply.</strong> Three in Resilience4j inside three in the mesh is nine requests for one call, and neither configuration looks unreasonable on its own. Adopting a mesh means auditing what the applications already do and turning one of them off — which is the same "retry at exactly one layer" rule from the synchronous-communication module, arriving in a new place.</p>'
                }
            ],
            docs: [
                { title: 'Istio — What is a service mesh?', url: 'https://istio.io/latest/about/service-mesh/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'microservices', questionId: 'distributed-tracing' }
            ]
        },

        {
            id: 'multi-region-in-outline',
            title: 'Multi-Region, in Outline',
            importance: 'good-to-know',
            summary: 'Latency to users, or survival of a region failure, or data residency. Three different goals with three different architectures, and only one of them is cheap.',
            interviewAngle: 'The discriminator is knowing that active-active with a shared database is a physics problem — cross-region write latency is bounded by the speed of light.',
            buildsOn: ['service-mesh-in-outline'],
            blocks: [
                {
                    type: 'table',
                    title: 'Three goals, three architectures',
                    headers: ['Goal', 'Architecture', 'The hard part'],
                    rows: [
                        ['Lower latency for distant users', 'A CDN, plus read replicas per region', '<strong>Cheap.</strong> Writes still go to one region.'],
                        ['Survive a region failure', 'Active-passive with cross-region replication and a promotion runbook', 'Failover is rarely tested; RPO is whatever the replication lag was'],
                        ['Serve writes from several regions', 'Active-active', '<strong>Conflict resolution.</strong> Two regions can write the same row.'],
                        ['Data residency', 'Regional partitioning by tenant or user', 'Cross-region queries, and knowing which region owns each subject']
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>Active-active is where the difficulty concentrates and it is a physical constraint rather than an engineering one. A synchronous cross-region write costs a round trip — around 70ms between Europe and the eastern United States, and more across the Pacific — on <em>every</em> write. Making writes asynchronous removes the latency and admits the possibility that both regions accepted a conflicting change, which then has to be resolved: last-write-wins, CRDTs, or a per-record home region.</p><p>The cheapest correct answer is usually the last one: <strong>every record has an owning region</strong> that accepts its writes, and other regions read a replica. It avoids conflicts entirely by making them impossible, at the cost of cross-region write latency for the minority of users away from their home.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Ask what the requirement actually is, because the three rows differ by orders of magnitude in cost. "Our users in Australia find it slow" is a CDN and a read replica — a week of work. "We must survive losing a region" is a disaster-recovery programme with a tested failover. "We must accept writes in both regions" is a distributed-data project with a conflict-resolution design. They are asked for interchangeably and they are not interchangeable.</p>'
                }
            ],
            docs: [
                { title: 'AWS — Multi-Region Fundamentals', url: 'https://docs.aws.amazon.com/prescriptive-guidance/latest/aws-multi-region-fundamentals/aws-multi-region-fundamentals.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'cloud', questionId: 'cloud-agnostic-or-not' }
            ]
        }
    ]
};
