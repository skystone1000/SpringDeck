/* ==========================================================================
   data/observability-ops.js — Observability, Docker & Kubernetes

   Three subsections, on the `production` track. This is the topic that
   separates a candidate who has been on call from one who has not, and the
   questions are chosen so that the difference shows: liveness versus
   readiness, what a metric label costs, what happens to in-flight requests
   during a rolling deploy.

   Almost every answer here has a wrong version that sounds right. "Add a
   liveness probe" is one. "Log everything" is another. "Alert on CPU" is a
   third.

   ONE GLOBAL PER FILE.
   ========================================================================== */

const observabilityOpsData = {
    id: 'observability-ops',
    title: 'Observability, Docker & Kubernetes',
    subsections: [
        { id: 'observability', title: 'Metrics, Logs & Traces' },
        { id: 'deploy',        title: 'Containers & Kubernetes' },
        { id: 'incidents',     title: 'Debugging Production' }
    ],
    keyTopics: [
        'Actuator endpoints', 'liveness vs readiness', 'Micrometer', 'Prometheus',
        'OpenTelemetry', 'correlation IDs', 'structured logging', 'layered jars',
        'graceful shutdown', 'resource limits and the JVM', 'blue-green', 'rollback',
        'GraalVM native image'
    ],
    questions: [

/* ==== Metrics, Logs & Traces ========================================== */

{
    id: 'actuator-endpoints',
    importance: 'must-know',
    subsection: 'observability',
    question: 'What does Spring Boot Actuator give you, and what should be exposed?',
    answer:
        '<p>Operational endpoints, for free, on adding one dependency. The ones worth ' +
        'knowing:</p>' +
        '<ul>' +
        '<li><strong><code>/health</code></strong> — an aggregate of every registered health ' +
        'indicator: datasource, disk space, Redis, broker. Kubernetes probes point here.</li>' +
        '<li><strong><code>/metrics</code> and <code>/prometheus</code></strong> — Micrometer ' +
        'metrics, and the scrape endpoint.</li>' +
        '<li><strong><code>/info</code></strong> — build and git information, which is how you ' +
        'answer "which version is actually running" without guessing.</li>' +
        '<li><strong><code>/loggers</code></strong> — read <em>and change</em> log levels at ' +
        'runtime. Genuinely valuable during an incident: turn on DEBUG for one package for two ' +
        'minutes without a deploy.</li>' +
        '<li><strong><code>/threaddump</code> and <code>/heapdump</code></strong> — the ' +
        'diagnostics, over HTTP.</li>' +
        '<li><strong><code>/env</code>, <code>/configprops</code>, <code>/beans</code>, ' +
        '<code>/mappings</code></strong> — what the application actually resolved, which is ' +
        'usually not what you expected.</li>' +
        '</ul>' +
        '<p><strong>What should be exposed is a security question with a firm answer.</strong> ' +
        'Only <code>health</code> and <code>info</code> are exposed over HTTP by default and that ' +
        'default is correct. <code>/env</code> will print configuration including credentials; ' +
        '<code>/heapdump</code> hands over the entire contents of memory; <code>/loggers</code> ' +
        'is a write endpoint. An exposed Actuator is a standing item on the OWASP security ' +
        'misconfiguration list, and it happens because someone set ' +
        '<code>management.endpoints.web.exposure.include=*</code> while debugging.</p>' +
        '<p>The right shape: expose the full set on a <strong>separate management port</strong> ' +
        '(<code>management.server.port</code>) that is not routed from the internet, keep the ' +
        'public surface to <code>health</code>, and set ' +
        '<code>management.endpoint.health.show-details=when-authorized</code> so an anonymous ' +
        'caller cannot enumerate your dependencies.</p>',
    referenceLinks: [
        { title: 'Spring Boot — Actuator Endpoints', url: 'https://docs.spring.io/spring-boot/reference/actuator/endpoints.html' }
    ],
    tags: ['actuator', 'spring-boot', 'security', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'liveness-versus-readiness',
    importance: 'must-know',
    subsection: 'observability',
    question: 'What is the difference between a liveness and a readiness probe?',
    answer:
        '<p>They answer two different questions and have two different consequences, and ' +
        'conflating them causes one of the most damaging failure modes in Kubernetes.</p>' +
        '<ul>' +
        '<li><strong>Liveness — "am I broken beyond recovery?"</strong> Failing it means ' +
        '<strong>the container is killed and restarted</strong>. It should check almost nothing: ' +
        'is the process responsive, is it deadlocked. Nothing external.</li>' +
        '<li><strong>Readiness — "should I receive traffic right now?"</strong> Failing it means ' +
        '<strong>removal from the load balancer</strong>, and nothing else. It may check ' +
        'dependencies: is the connection pool healthy, have caches warmed.</li>' +
        '</ul>' +
        '<p><strong>The failure mode: putting a database check in the liveness probe.</strong> ' +
        'The database has a blip. Every pod fails liveness. Kubernetes restarts every pod ' +
        'simultaneously. They all start cold, all reconnect at once, and the database — already ' +
        'struggling — is now hit by a full reconnection storm. A recoverable dependency blip has ' +
        'become a total outage with a restart loop, and the restarts continue until the database ' +
        'recovers, which is harder now than it was.</p>' +
        '<p>The rule: <strong>liveness checks only things a restart could fix.</strong> If ' +
        'restarting will not help, failing liveness makes it worse.</p>' +
        '<p>Spring Boot supports this directly. Since 2.3 there are <strong>health groups</strong> ' +
        '— <code>/actuator/health/liveness</code> and <code>/actuator/health/readiness</code> — ' +
        'auto-configured when it detects Kubernetes, and wired to the ' +
        '<code>ApplicationAvailability</code> state so readiness goes false during graceful ' +
        'shutdown by itself.</p>' +
        '<p>The third probe worth naming is <strong>startup</strong>. A JVM that takes forty ' +
        'seconds to start will fail an aggressive liveness probe forever, and the usual ' +
        '"fix" of a long <code>initialDelaySeconds</code> makes real failures slow to detect. A ' +
        'startup probe holds liveness off until the application has started once, and then gets ' +
        'out of the way.</p>',
    referenceLinks: [
        { title: 'Spring Boot — Kubernetes Probes', url: 'https://docs.spring.io/spring-boot/reference/actuator/endpoints.html' }
    ],
    tags: ['kubernetes', 'probes', 'operations', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'micrometer-and-cardinality',
    importance: 'must-know',
    subsection: 'observability',
    question: 'What are the metric types, and what is a cardinality explosion?',
    answer:
        '<p>Micrometer is a facade over metrics backends — the SLF4J of metrics — with four ' +
        'instruments:</p>' +
        '<ul>' +
        '<li><strong>Counter</strong> — monotonically increasing. Requests, errors, messages ' +
        'consumed. You graph the <em>rate</em>, not the value.</li>' +
        '<li><strong>Gauge</strong> — a value that goes up and down, sampled when scraped. Queue ' +
        'depth, pool size, cache entries. It holds a weak reference to what it measures, so a ' +
        'gauge on a local variable silently reports NaN once it is collected.</li>' +
        '<li><strong>Timer</strong> — count plus total time plus a distribution. What you want ' +
        'for latency.</li>' +
        '<li><strong>DistributionSummary</strong> — the same for non-time values, such as payload ' +
        'size.</li>' +
        '</ul>' +
        '<p>Every metric carries <strong>tags</strong>, which is what makes it dimensional: ' +
        '<code>http.server.requests{uri="/orders", status="500"}</code> can be sliced by either.</p>' +
        '<p><strong>Cardinality is the number of distinct tag combinations, and it is the ' +
        'thing that takes monitoring systems down.</strong> Each combination is a separate time ' +
        'series with its own storage and index entry. A tag with ten values is ten series; adding ' +
        'a second with ten is a hundred. A tag holding a <strong>user id, an order id, a raw URL ' +
        'with path parameters, an email address or an exception message</strong> is effectively ' +
        'unbounded, and it will exhaust Prometheus\'s memory — taking out the monitoring for ' +
        'everything else at exactly the moment you need it.</p>' +
        '<p>Which is why Spring records the <strong>URI template</strong>, ' +
        '<code>/orders/{id}</code>, rather than the actual path — and why a request to an ' +
        'unmapped URL is tagged <code>NOT_FOUND</code> rather than by its path, since otherwise a ' +
        'scanner probing random URLs would be a denial of service against your metrics.</p>' +
        '<p>The rule: <strong>tags are for values from a small, bounded, known set.</strong> ' +
        'High-cardinality context belongs in logs and traces, which are built for it.</p>',
    referenceLinks: [
        { title: 'Micrometer — Concepts', url: 'https://docs.micrometer.io/micrometer/reference/concepts.html' }
    ],
    tags: ['metrics', 'micrometer', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'correlation-ids-and-structured-logs',
    importance: 'must-know',
    subsection: 'observability',
    question: 'How do you find every log line belonging to one request across several services?',
    answer:
        '<p>A <strong>correlation id</strong> generated at the edge, propagated on every ' +
        'downstream call, and present on every log line.</p>' +
        '<p>The mechanism in Java is the <strong>MDC</strong> — a thread-local map that the log ' +
        'pattern can reference, so no logging call has to mention the id. A filter puts the id ' +
        'in at the start of the request and, critically, <strong>clears it in a <code>finally</code> ' +
        'block</strong>: threads are pooled, and an id left behind attributes the next request\'s ' +
        'logs to the previous one.</p>' +
        '<p>You should not build this by hand any more. <strong>Micrometer Tracing</strong> — ' +
        'which replaced Spring Cloud Sleuth in Spring Boot 3 — generates a trace id and span id, ' +
        'propagates them as W3C <code>traceparent</code>, and puts them in the MDC. The same ids ' +
        'then join your logs to your traces, which is most of the value of having both.</p>' +
        '<p><strong>Log in JSON.</strong> A human-formatted line has to be parsed by a fragile ' +
        'regex before anything can be queried, and a stack trace breaks it by spanning lines. ' +
        'Structured logs make <code>traceId = X and level = ERROR</code> a query. Spring Boot ' +
        '<strong>3.4</strong> added this natively — <code>logging.structured.format.console=ecs</code> ' +
        '— so it no longer needs a Logstash encoder.</p>' +
        '<p>Three practices worth stating:</p>' +
        '<ul>' +
        '<li><strong>Accept an inbound correlation id</strong> if the caller supplied one, rather ' +
        'than always generating. That is what joins your trace to the client\'s.</li>' +
        '<li><strong>Return the trace id in error responses</strong>, so a support ticket carries ' +
        'the exact identifier.</li>' +
        '<li><strong>Propagate across the broker.</strong> A trace that stops at the producer and ' +
        'restarts at the consumer is two traces, and the asynchronous half of a system is where ' +
        'you most need it joined.</li>' +
        '</ul>',
    referenceLinks: [
        { title: 'Spring Boot — Structured Logging', url: 'https://docs.spring.io/spring-boot/reference/features/logging.html' },
        { title: 'W3C Trace Context', url: 'https://www.w3.org/TR/trace-context/' }
    ],
    tags: ['logging', 'tracing', 'observability', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'percentiles-not-averages',
    importance: 'should-know',
    subsection: 'observability',
    question: 'Why is average latency the wrong metric, and how do percentiles get computed?',
    answer:
        '<p>Because <strong>nobody experiences the average.</strong> A service with 10ms median ' +
        'and 4s p99 has a mean around 50ms, which looks excellent and describes no actual ' +
        'request. One user in a hundred is having a terrible time and the mean is designed not to ' +
        'show it.</p>' +
        '<p>It gets worse at scale, and this is the argument worth having ready: <strong>a page ' +
        'making twenty backend calls hits the p99 of at least one of them about eighteen per cent ' +
        'of the time.</strong> So a "one in a hundred" tail is a routine experience for a real ' +
        'user — which is why the tail is the number that matters and why it is the number ' +
        'averages hide.</p>' +
        '<p>How they are computed matters more than people expect, because there are two ' +
        'approaches with different properties:</p>' +
        '<ul>' +
        '<li><strong>Client-side percentiles</strong> — the application computes p99 and exports ' +
        'it as a number. Accurate for that instance, and <strong>not aggregatable</strong>: the ' +
        'p99 across ten pods is not the average of ten p99s, and there is no way to recover it. ' +
        'Micrometer\'s <code>publishPercentiles</code>.</li>' +
        '<li><strong>Histograms</strong> — the application exports bucket counts, and the ' +
        'percentile is computed at query time from the summed buckets. Aggregatable across ' +
        'instances and over time windows, which is what you want, at the cost of accuracy bounded ' +
        'by the bucket boundaries. Micrometer\'s ' +
        '<code>publishPercentileHistogram</code>, plus Prometheus\'s ' +
        '<code>histogram_quantile</code>.</li>' +
        '</ul>' +
        '<p><strong>Use histograms for anything you will aggregate</strong>, and set explicit ' +
        'SLO boundaries — <code>distribution.slo</code> in Spring Boot — so a bucket edge sits ' +
        'exactly at the number you promised.</p>' +
        '<p>The last thing worth naming is <strong>coordinated omission</strong>: a load ' +
        'generator that waits for each response before sending the next one does not send ' +
        'requests during a stall, so the stall is under-represented and the measured p99 is ' +
        'far better than reality. It is why some load-testing results are optimistic in a way ' +
        'that is invisible.</p>',
    referenceLinks: [
        { title: 'Micrometer — Timers and Histograms', url: 'https://docs.micrometer.io/micrometer/reference/concepts/histogram-quantiles.html' }
    ],
    tags: ['metrics', 'latency', 'performance'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'what-to-alert-on',
    importance: 'should-know',
    subsection: 'observability',
    question: 'What should page someone at three in the morning?',
    answer:
        '<p><strong>Symptoms, not causes.</strong> Alert on what users experience; leave ' +
        'everything else as a dashboard for whoever is investigating.</p>' +
        '<p>High CPU is not an alert. Nor is a full disk on one node, a pod restarting, or a ' +
        'garbage collection taking longer. Every one of them can be true while the service is ' +
        'perfectly healthy, and each one that pages without a user-visible problem trains people ' +
        'to ignore the pager — which is the actual failure mode of a bad alerting setup.</p>' +
        '<p>What does deserve a page:</p>' +
        '<ul>' +
        '<li><strong>Error rate above the SLO.</strong></li>' +
        '<li><strong>Latency at the tail above the SLO.</strong></li>' +
        '<li><strong>Throughput at zero</strong> when it should not be — the alert that catches ' +
        'everything the others miss, because a service returning nothing at all has no errors ' +
        'either.</li>' +
        '<li><strong>A queue or consumer lag growing without bound</strong>, expressed in time ' +
        'rather than in messages.</li>' +
        '<li><strong>Something that will fail soon and cannot be fixed quickly</strong> — a ' +
        'certificate expiring, a disk that will fill in two hours.</li>' +
        '</ul>' +
        '<p>The framework worth naming: <strong>RED</strong> for services — Rate, Errors, ' +
        'Duration — and <strong>USE</strong> for resources — Utilisation, Saturation, Errors. ' +
        'And an <strong>SLO with an error budget</strong>, which converts "is this bad" into ' +
        'arithmetic: 99.9% monthly is 43 minutes of budget, and the alert fires on the ' +
        '<em>burn rate</em>, so a fast burn pages immediately and a slow one becomes a ticket.</p>' +
        '<p>Two rules that make the difference in practice: <strong>every page must be ' +
        'actionable</strong> — if the responder can only look at it and wait, it should not have ' +
        'woken them; and <strong>every alert needs a runbook link</strong>, because the person ' +
        'on call at 3am is not the person who wrote the alert.</p>',
    referenceLinks: [
        { title: 'Google SRE Book — Alerting on SLOs', url: 'https://sre.google/workbook/alerting-on-slos/' }
    ],
    tags: ['alerting', 'sre', 'operations'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

/* ==== Containers & Kubernetes ========================================= */

{
    id: 'containerising-a-spring-boot-app',
    importance: 'must-know',
    subsection: 'deploy',
    question: 'How would you build a container image for a Spring Boot application?',
    answer:
        '<p>The naive Dockerfile — <code>COPY app.jar</code> then <code>ENTRYPOINT java -jar</code> ' +
        '— works and wastes most of what layer caching is for. A fat jar is one layer, so ' +
        'changing one line of code invalidates the whole thing and pushes sixty megabytes of ' +
        'unchanged dependencies.</p>' +
        '<p><strong>Layered jars</strong> fix that. The Spring Boot build plugin splits the jar ' +
        'into dependencies, spring-boot-loader, snapshot dependencies and application classes; ' +
        'copy each into its own layer, in that order, and a code change re-pushes only the last ' +
        'one. Dependencies change monthly and application classes change hourly, so the ordering ' +
        'is by rate of change.</p>' +
        '<p>Three other decisions:</p>' +
        '<ul>' +
        '<li><strong>Buildpacks</strong> — <code>mvn spring-boot:build-image</code> produces an ' +
        'optimised image with no Dockerfile at all, with layering, a tuned JVM and a memory ' +
        'calculator already applied. The right default unless you need control.</li>' +
        '<li><strong>A slim base.</strong> A JRE rather than a JDK, and <code>distroless</code> ' +
        'or Alpine over a full distribution — smaller and, more importantly, a much smaller ' +
        'attack surface with fewer CVEs to triage.</li>' +
        '<li><strong>Run as a non-root user.</strong> One line, and it is on every container ' +
        'hardening checklist.</li>' +
        '</ul>' +
        '<p>And two JVM settings that belong in the image rather than being forgotten: ' +
        '<strong><code>-XX:MaxRAMPercentage</code> rather than a fixed <code>-Xmx</code></strong>, ' +
        'so the heap follows the container limit; and <strong>a CPU request of at least one ' +
        'core</strong>, because a fractional CPU makes <code>availableProcessors()</code> report ' +
        '1, which switches the default collector to Serial and sizes every framework thread pool ' +
        'at one.</p>',
    referenceLinks: [
        { title: 'Spring Boot — Container Images', url: 'https://docs.spring.io/spring-boot/reference/packaging/container-images/index.html' }
    ],
    tags: ['docker', 'spring-boot', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: [
        {
            language: 'dockerfile',
            title: 'Layered by rate of change',
            code:
                '# --- extract the layers ------------------------------------------\n' +
                'FROM eclipse-temurin:21-jre AS builder\n' +
                'WORKDIR /build\n' +
                'COPY target/app.jar app.jar\n' +
                'RUN java -Djarmode=tools -jar app.jar extract --layers --launcher\n' +
                '\n' +
                '# --- assemble, slowest-changing layer first -----------------------\n' +
                'FROM eclipse-temurin:21-jre\n' +
                'WORKDIR /app\n' +
                'COPY --from=builder /build/app/dependencies/ ./\n' +
                'COPY --from=builder /build/app/spring-boot-loader/ ./\n' +
                'COPY --from=builder /build/app/snapshot-dependencies/ ./\n' +
                'COPY --from=builder /build/app/application/ ./\n' +
                '\n' +
                'USER 1001\n' +
                'ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=70"\n' +
                'ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]',
            output: {
                kind: 'trace',
                lines: [
                    'a code-only change re-pushes the application layer alone',
                    'dependency layers are reused from the registry cache'
                ],
                explain:
                    '<p>The ordering is the whole point: each <code>COPY</code> is a layer, and a ' +
                    'layer is invalidated by any change to itself or anything above it. Putting ' +
                    'application classes last means the dependency layers survive almost every ' +
                    'build.</p>'
            }
        }
    ]
},

{
    /* NOT 'graceful-shutdown': spring-core already owns that id for the
       framework-level question. This is the platform half — the endpoint
       propagation race, the preStop hook and the grace period — and the
       collision check in validate-questions.js caught the duplicate on real
       content for the first time. */
    id: 'graceful-shutdown-in-kubernetes',
    importance: 'must-know',
    subsection: 'deploy',
    question: 'What happens to in-flight requests when a pod is replaced during a deploy?',
    answer:
        '<p>By default, they are dropped — and users see 502s during every deploy. Getting this ' +
        'right is a small number of settings that work together, and missing any one of them ' +
        'leaves the problem.</p>' +
        '<p><strong>The race that causes it.</strong> Kubernetes does two things in parallel when ' +
        'a pod terminates: it sends SIGTERM, and it removes the pod from the Service endpoints. ' +
        'Endpoint removal has to propagate to every kube-proxy and ingress, which takes a moment ' +
        '— so for a second or two <strong>the load balancer is still sending traffic to a pod ' +
        'that has begun shutting down</strong>.</p>' +
        '<p>The settings, in order:</p>' +
        '<ul>' +
        '<li><strong><code>server.shutdown=graceful</code></strong> — Spring Boot 2.3+. On ' +
        'SIGTERM the connector stops accepting new requests and waits for in-flight ones, bounded ' +
        'by <code>spring.lifecycle.timeout-per-shutdown-phase</code> (default 30s).</li>' +
        '<li><strong>A <code>preStop</code> hook that sleeps</strong> for five to ten seconds ' +
        'before SIGTERM is delivered. This is the part everyone omits, and it is what covers the ' +
        'endpoint-propagation race: the pod stays fully able to serve while the load balancer ' +
        'learns to stop sending.</li>' +
        '<li><strong><code>terminationGracePeriodSeconds</code> longer than the application\'s ' +
        'shutdown timeout</strong>, or Kubernetes SIGKILLs mid-request and undoes the work.</li>' +
        '<li><strong>Readiness must go false first.</strong> Spring Boot ties this to the ' +
        'availability state automatically, which is what makes the readiness probe stop passing ' +
        'as soon as shutdown starts.</li>' +
        '</ul>' +
        '<p>Two things beyond HTTP that are missed more often: <strong>message consumers must ' +
        'stop polling and finish what they have</strong>, or a rebalance and a redelivery follow; ' +
        'and <strong>scheduled jobs and executors need bounded shutdown</strong>, since a ' +
        'non-daemon thread pool that is never shut down keeps the JVM alive until the grace ' +
        'period runs out and it is killed anyway.</p>',
    referenceLinks: [
        { title: 'Spring Boot — Graceful Shutdown', url: 'https://docs.spring.io/spring-boot/reference/web/graceful-shutdown.html' }
    ],
    tags: ['kubernetes', 'deployment', 'operations', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'deployment-strategies',
    importance: 'should-know',
    subsection: 'deploy',
    question: 'Rolling, blue-green or canary — and what makes a rollback safe?',
    answer:
        '<ul>' +
        '<li><strong>Rolling</strong> — replace instances a few at a time. The Kubernetes ' +
        'default, no extra capacity beyond the surge, and <strong>both versions run at once</strong>, ' +
        'which is the constraint everything below follows from.</li>' +
        '<li><strong>Blue-green</strong> — stand up the new version entirely, switch traffic, ' +
        'keep the old one warm. Instant rollback by switching back, at the cost of double ' +
        'capacity during the change.</li>' +
        '<li><strong>Canary</strong> — send a small share of traffic to the new version, watch ' +
        'the metrics, ramp up. The only strategy that catches problems that need <em>real ' +
        'traffic</em> to appear, which is most of the interesting ones.</li>' +
        '</ul>' +
        '<p><strong>The database is what makes rollback hard, and it is the real answer to this ' +
        'question.</strong> Code rolls back in seconds; a migration does not. So every schema ' +
        'change must be <strong>backward compatible with the previous version of the code</strong> ' +
        '— which is required by rolling deploys anyway, since both versions are live ' +
        'simultaneously.</p>' +
        '<p>That means <strong>expand and contract</strong>, over three releases:</p>' +
        '<ul>' +
        '<li><strong>Expand</strong> — add the new column, nullable, with a default. Deploy code ' +
        'that writes both and reads the old.</li>' +
        '<li><strong>Migrate</strong> — backfill; deploy code that reads the new.</li>' +
        '<li><strong>Contract</strong> — once no running version references it, drop the old ' +
        'column.</li>' +
        '</ul>' +
        '<p>Renaming a column in one release is the classic way to make a rollback impossible.</p>' +
        '<p>Two more things worth saying. <strong>Feature flags decouple deploy from ' +
        'release</strong>, so the risky change ships dark and is turned on separately — and ' +
        'turned off without a deploy, which is the fastest rollback available. And ' +
        '<strong>a rollback plan that has never been executed is not a plan</strong>; the ' +
        'practice of deliberately rolling back a release in a normal week is what turns it into ' +
        'one.</p>',
    referenceLinks: [
        { title: 'Kubernetes — Deployments', url: 'https://kubernetes.io/docs/concepts/workloads/controllers/deployment/' }
    ],
    tags: ['deployment', 'migrations', 'operations'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'graalvm-native-image',
    importance: 'good-to-know',
    subsection: 'deploy',
    question: 'What does a GraalVM native image buy, and what does it cost?',
    answer:
        '<p>It compiles the application ahead of time into a standalone executable with no JVM ' +
        'and no class loading at run time.</p>' +
        '<p><strong>What you get:</strong> startup in tens of milliseconds rather than seconds, ' +
        'and a resident footprint often a quarter of the JVM\'s. Which matters in exactly two ' +
        'places — <strong>serverless</strong>, where cold start is the whole problem and has been ' +
        'Java\'s main disadvantage, and <strong>scale-to-zero or very dense deployments</strong>, ' +
        'where memory per instance is the bill.</p>' +
        '<p><strong>What you give up:</strong></p>' +
        '<ul>' +
        '<li><strong>Peak throughput.</strong> There is no JIT, so no profile-guided ' +
        'optimisation. A long-running service is typically slower than the same code on HotSpot ' +
        'once warm — which makes native image the wrong choice for exactly the workload most ' +
        'backends have.</li>' +
        '<li><strong>Closed-world assumption.</strong> Everything reachable must be known at ' +
        'build time, so reflection, dynamic proxies, resource loading and JNI need explicit ' +
        'configuration. Spring generates most of it through AOT processing, and a library that ' +
        'has not been prepared will fail at run time rather than at build time.</li>' +
        '<li><strong>Slow builds</strong> — minutes, not seconds — and much more memory to ' +
        'build.</li>' +
        '<li><strong>Weaker tooling.</strong> No JFR in the same form, different profiling, no ' +
        'attaching a debugger the usual way.</li>' +
        '<li><strong>Testing burden.</strong> Behaviour can differ from the JVM build, so the ' +
        'native image needs its own test run.</li>' +
        '</ul>' +
        '<p>The comparison worth offering: <strong>Class Data Sharing plus a checkpointed ' +
        'start</strong> — AppCDS, and Project CRaC — reduce start-up substantially while keeping ' +
        'the JIT, and cost far less to adopt. Native image is the right answer when start-up time ' +
        'or memory is the binding constraint, and an expensive one when it is not.</p>',
    referenceLinks: [
        { title: 'Spring Boot — GraalVM Native Images', url: 'https://docs.spring.io/spring-boot/reference/packaging/native-image/index.html' }
    ],
    tags: ['graalvm', 'performance', 'deployment'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

/* ==== Debugging Production ============================================ */

{
    id: 'debugging-production',
    importance: 'must-know',
    subsection: 'incidents',
    question: 'Something is wrong in production and you cannot attach a debugger. What do you do?',
    answer:
        '<p>Work outside in, and <strong>capture evidence before doing anything that destroys ' +
        'it</strong> — a restart usually fixes the symptom and removes every trace of the cause, ' +
        'so the pressure to restart immediately is the main thing to resist for the first two ' +
        'minutes.</p>' +
        '<p>The order:</p>' +
        '<ul>' +
        '<li><strong>What changed?</strong> A deploy, a config change, a feature flag, a ' +
        'dependency, a traffic pattern. Most incidents have an answer here and it is much faster ' +
        'than debugging.</li>' +
        '<li><strong>Is it all instances or one?</strong> One instance points at state — a leak, ' +
        'a stuck thread, a bad node. All of them points at a dependency or the ' +
        'change above.</li>' +
        '<li><strong>Metrics: which of the four?</strong> Latency, errors, saturation, traffic. ' +
        'This narrows to a subsystem in a glance.</li>' +
        '<li><strong>Traces</strong> for a slow request — the span tree names the call that took ' +
        'the time, which is the question tracing exists to answer.</li>' +
        '<li><strong>Logs, filtered by trace id</strong> rather than read by timestamp.</li>' +
        '<li><strong>Thread dumps — three, ten seconds apart.</strong> One tells you what threads ' +
        'exist; three tell you which are <em>stuck</em>. This is the tool for a hang, a pool ' +
        'exhaustion or a deadlock.</li>' +
        '<li><strong>A heap dump</strong> if memory is implicated, before the restart.</li>' +
        '<li><strong>Java Flight Recorder</strong> for a minute if it is a performance question ' +
        'rather than a hang — low enough overhead to run on a live instance, which is what makes ' +
        'it the right tool rather than a profiler.</li>' +
        '</ul>' +
        '<p>Two levers that need no deploy and are worth naming: ' +
        '<strong><code>/actuator/loggers</code></strong> to raise a package to DEBUG for two ' +
        'minutes, and <strong>turning off a feature flag</strong>.</p>' +
        '<p>And the operational point: <strong>take one pod out of the load balancer instead of ' +
        'restarting it.</strong> Failing its readiness probe stops traffic while leaving the ' +
        'process intact — you get the evidence and the users get a working service, which is ' +
        'otherwise a genuine conflict.</p>',
    referenceLinks: [
        { title: 'Troubleshooting Guide — Java SE', url: 'https://docs.oracle.com/en/java/javase/21/troubleshoot/index.html' }
    ],
    tags: ['incidents', 'diagnostics', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'latency-investigation-order',
    importance: 'should-know',
    subsection: 'incidents',
    question: 'p99 latency has doubled but errors are flat. Where do you look?',
    answer:
        '<p>Flat errors with rising latency is a useful signal in itself: <strong>nothing is ' +
        'failing, something is waiting.</strong> That rules out a lot and points at a queue ' +
        'somewhere.</p>' +
        '<p>The candidates, roughly by frequency:</p>' +
        '<ul>' +
        '<li><strong>The database.</strong> A plan change after statistics moved, a missing index ' +
        'as a table grew past a threshold, lock contention, or connection-pool wait. ' +
        '<strong>Pool acquisition time is the metric to check first</strong> and it is the one ' +
        'nobody has on a dashboard: if threads are waiting for a connection, everything is slow ' +
        'and the database looks idle.</li>' +
        '<li><strong>A downstream service</strong> that is itself slower. The trace answers ' +
        'this immediately.</li>' +
        '<li><strong>GC.</strong> Time in GC, and pause distribution. A rising live set makes ' +
        'collections more frequent and longer well before anything runs out of memory.</li>' +
        '<li><strong>Thread pool saturation.</strong> Requests queueing before they start being ' +
        'served, which shows as latency with no single slow call inside the trace — a gap at the ' +
        'beginning rather than a long span.</li>' +
        '<li><strong>CPU throttling.</strong> In Kubernetes, a CPU <em>limit</em> throttles the ' +
        'container through the CFS quota, so it stalls for milliseconds at a time while showing ' +
        'CPU usage below the limit. <code>container_cpu_cfs_throttled_seconds</code> is the ' +
        'metric, and this one is genuinely counter-intuitive.</li>' +
        '<li><strong>A cache hit rate that fell</strong>, sending load to the origin.</li>' +
        '<li><strong>Data growth.</strong> An unpaginated query returning more rows every ' +
        'week, or an N+1 whose N grew.</li>' +
        '</ul>' +
        '<p>The method that matters more than the list: <strong>compare against the same time ' +
        'last week, not against now.</strong> Almost everything looks abnormal in isolation, and ' +
        'a week-over-week overlay separates "this is broken" from "this is Monday".</p>',
    referenceLinks: [
        { title: 'Spring Boot — Metrics', url: 'https://docs.spring.io/spring-boot/reference/actuator/metrics.html' }
    ],
    tags: ['incidents', 'performance', 'latency'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'what-to-log',
    importance: 'should-know',
    subsection: 'incidents',
    question: 'What should be logged, and at what level?',
    answer:
        '<p>The two failure modes are symmetrical and both are common: logging so little that an ' +
        'incident is unreadable, and logging so much that it is unreadable for a different ' +
        'reason — and expensive, since log ingestion is frequently a larger bill than the compute ' +
        'producing it.</p>' +
        '<p><strong>The levels, used properly:</strong></p>' +
        '<ul>' +
        '<li><strong>ERROR</strong> — something failed that needs a human. If nobody would act ' +
        'on it, it is not an error. A validation failure from a client is not an ERROR; it is ' +
        'the API working.</li>' +
        '<li><strong>WARN</strong> — degraded but handled. A retry succeeded, a circuit opened, a ' +
        'fallback was used.</li>' +
        '<li><strong>INFO</strong> — business events worth reconstructing later: an order placed, ' +
        'a payment taken, a job finished. Not "entering method".</li>' +
        '<li><strong>DEBUG</strong> — off in production, on for two minutes through ' +
        '<code>/actuator/loggers</code> when you need it.</li>' +
        '</ul>' +
        '<p><strong>What to include:</strong> the trace id (automatically), the identifiers ' +
        'needed to find the record, what was being attempted, and the outcome. Log the exception ' +
        '<em>object</em> rather than <code>e.getMessage()</code>, or you lose the stack trace and ' +
        'the cause chain — which is the single most common logging mistake and it is discovered ' +
        'during the incident.</p>' +
        '<p><strong>What never to log:</strong> passwords, tokens, card numbers, personal data. ' +
        'That includes the accidental routes — a full request body dump, a serialised entity ' +
        'whose <code>toString</code> includes everything, and an exception message that happens ' +
        'to contain the input.</p>' +
        '<p>Two habits worth stating: <strong>log once, at the boundary</strong> — catching, ' +
        'logging and rethrowing at every layer produces four copies of one failure; and ' +
        '<strong>do not log and throw</strong>, since the handler will log it and now it is in ' +
        'twice, at different levels, looking like two events.</p>',
    referenceLinks: [
        { title: 'Spring Boot — Logging', url: 'https://docs.spring.io/spring-boot/reference/features/logging.html' }
    ],
    tags: ['logging', 'operations'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
}

    ]
};
