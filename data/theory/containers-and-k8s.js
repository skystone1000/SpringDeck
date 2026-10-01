/* ==========================================================================
   data/theory/containers-and-k8s.js — module 80 in the reading path

   The plan's tagline sets the scope precisely: enough to answer the
   deployment questions honestly. This is not a Kubernetes course — it is the
   subset a Java backend engineer is asked about, which is nine chapters and
   is mostly about the interaction between the JVM and a container's memory
   limit.

   Two chapters are the reason the module exists. Requests, limits and
   OOMKilled, because a JVM that is killed by the kernel produces no heap
   dump, no OutOfMemoryError and no clue; and graceful shutdown, because the
   ordering of SIGTERM against endpoint removal is the difference between a
   clean rolling update and dropped requests on every deploy.
   ========================================================================== */

const containersAndK8sModule = {
    id: 'containers-and-k8s',
    trackId: 'production',
    order: 80,
    title: 'Containers and Kubernetes',
    tagline: 'Enough to answer the deployment questions honestly.',
    estimatedMinutes: 45,
    prerequisites: ['actuator-and-health', 'jvm-diagnostics'],
    docHub: { title: 'Spring Boot — Container Images', url: 'https://docs.spring.io/spring-boot/reference/packaging/container-images/index.html' },

    chapters: [
        {
            id: 'dockerfile-for-a-spring-boot-app',
            title: 'A Dockerfile Worth Shipping',
            importance: 'must-know',
            summary: 'A multi-stage build, a JRE rather than a JDK, a non-root user, and the fat jar unpacked into layers. Four decisions, each with a reason.',
            interviewAngle: 'The naive version — copy the jar into an openjdk image and run it — works, and naming the four things wrong with it is the answer.',
            buildsOn: [],
            blocks: [
                {
                    type: 'syntax',
                    language: 'dockerfile',
                    title: 'The build, with each decision annotated',
                    code: '# ---- build stage: the JDK and the sources never reach the runtime ----\nFROM eclipse-temurin:21-jdk-alpine AS build\nWORKDIR /build\n\n# Dependencies first, as their own layer. This layer is cached and only\n# rebuilt when the pom changes -- not on every source edit.\nCOPY .mvn/ .mvn\nCOPY mvnw pom.xml ./\nRUN ./mvnw -B dependency:go-offline\n\nCOPY src ./src\nRUN ./mvnw -B -DskipTests package\nRUN java -Djarmode=tools -jar target/app.jar extract --layers --destination extracted\n\n# ---- runtime stage ----\nFROM eclipse-temurin:21-jre-alpine\n\n# NON-ROOT. A container escape from a root process is a root process\n# on the node. This is one line and it is not optional.\nRUN addgroup -S app && adduser -S app -G app\nUSER app\nWORKDIR /app\n\n# Layers in order of how often they change, so the big ones cache.\nCOPY --from=build --chown=app:app /build/extracted/dependencies/ ./\nCOPY --from=build --chown=app:app /build/extracted/spring-boot-loader/ ./\nCOPY --from=build --chown=app:app /build/extracted/snapshot-dependencies/ ./\nCOPY --from=build --chown=app:app /build/extracted/application/ ./\n\n# exec form, so the JVM is PID 1 and receives SIGTERM directly.\nENTRYPOINT ["java", "-jar", "app.jar"]',
                    notes: '<p>The <code>ENTRYPOINT</code> form matters more than it looks. The shell form — <code>ENTRYPOINT java -jar app.jar</code> — runs the JVM under <code>/bin/sh</code>, which does not forward signals, so <code>SIGTERM</code> never reaches Java and the container is killed after the grace period every single time. The graceful-shutdown chapter depends on getting this right.</p>'
                },
                {
                    type: 'types',
                    title: 'What each decision buys',
                    items: [
                        { name: 'Multi-stage', html: '<p>The JDK, Maven, the source and the build cache stay in the build stage. The shipped image is smaller and has a far smaller vulnerability surface.</p>' },
                        { name: 'JRE, not JDK', html: '<p>Several hundred megabytes smaller, and no compiler in production. <code>jlink</code> goes further if you want a minimal runtime.</p>' },
                        { name: 'Non-root', html: '<p>Defence in depth, and many clusters enforce it with a policy that will simply refuse the pod otherwise.</p>' },
                        { name: 'Layered extraction', html: '<p>The next chapter. It is what makes a redeploy push a few hundred kilobytes rather than a hundred megabytes.</p>' }
                    ]
                }
            ],
            docs: [
                { title: 'Spring Boot — Dockerfiles', url: 'https://docs.spring.io/spring-boot/reference/packaging/container-images/dockerfiles.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'observability-ops', questionId: 'containerising-a-spring-boot-app' }
            ]
        },

        {
            id: 'layered-jars-and-build-cache',
            title: 'Layered Jars',
            importance: 'should-know',
            summary: 'A fat jar copied as one file is one image layer, so a one-line code change pushes the whole hundred megabytes. Extracting it into four layers means pushing the few hundred kilobytes that changed.',
            interviewAngle: 'A concrete, quantified improvement, and knowing that Boot supports the extraction natively is the current-practice half.',
            buildsOn: ['dockerfile-for-a-spring-boot-app'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>A container image is a stack of layers, each identified by its content. A layer whose content is unchanged is not rebuilt, not pushed and not pulled — so the unit of change matters. A fat jar copied with one <code>COPY</code> is a single layer of roughly 60 MB, of which about 58 MB is dependencies that did not change; edit one line of Java and all 60 MB is a new layer.</p><p>Spring Boot\'s layered mode splits the jar into four layers ordered by volatility: <strong>dependencies</strong>, <strong>spring-boot-loader</strong>, <strong>snapshot-dependencies</strong>, and <strong>application</strong>. Only the last one changes on a normal build, and it is a few hundred kilobytes.</p>'
                },
                {
                    type: 'syntax',
                    language: 'bash',
                    title: 'Extracting, and the alternative that needs no Dockerfile',
                    code:  '# Boot 3.3+: the tools jarmode, which replaced -Djarmode=layertools\njava -Djarmode=tools -jar app.jar extract --layers --destination extracted\n\n# Or: build the image with no Dockerfile at all. Cloud Native\n# Buildpacks produce a layered, non-root, JRE-based image with the\n# memory calculator already configured.\n./mvnw spring-boot:build-image\n\n# Effect on a redeploy:\n#   single layer   ~60 MB pushed and pulled, every time\n#   layered        ~300 KB pushed and pulled, when only code changed',
                    notes: '<p>Buildpacks are worth knowing as an answer even in a team that writes its own Dockerfile: they encode the JRE choice, the non-root user, the layering and the container-aware memory settings, which is most of this module. The trade is less control and an image whose contents you did not choose line by line.</p>'
                }
            ],
            docs: [
                { title: 'Efficient Container Images', url: 'https://docs.spring.io/spring-boot/reference/packaging/container-images/efficient-images.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-boot', questionId: 'fat-jar-and-layers' }
            ]
        },

        {
            id: 'jvm-flags-in-a-container',
            title: 'The JVM Inside a Container',
            importance: 'must-know',
            summary: 'Modern JVMs read the cgroup limit rather than the host\'s memory, and size the heap as a percentage of it. The percentage default leaves room for everything that is not the heap — which is more than people expect.',
            interviewAngle: 'MaxRAMPercentage against a fixed -Xmx is the question, and the reason to prefer the percentage is that the limit can change without the image.',
            buildsOn: ['layered-jars-and-build-cache'],
            blocks: [
                {
                    type: 'version',
                    title: 'Container awareness, which is not as old as people assume',
                    items: [
                        { version: 'Java 8u131 and earlier', state: 'was', html: '<p>The JVM saw the <strong>host\'s</strong> memory and CPU. A 512 MB container on a 64 GB node sized its heap for 64 GB and was killed immediately.</p>' },
                        { version: 'Java 8u191, Java 10', state: 'changed', html: '<p><code>UseContainerSupport</code>, on by default: the JVM reads the cgroup memory limit and the CPU quota.</p>' },
                        { version: 'Java 11+', state: 'is', html: '<p><code>MaxRAMPercentage</code> defaults to <strong>25%</strong> of the container limit, which is conservative and often too low for a service where nothing else runs in the container.</p>' },
                        { version: 'Java 17+', state: 'is', html: '<p>cgroup v2 supported. <code>availableProcessors()</code> reflects the CPU quota, so thread pools sized from it are container-aware — which matters because a pool sized for 64 host cores inside a 1-core quota is a thrashing disaster.</p>' }
                    ]
                },
                {
                    type: 'syntax',
                    language: 'yaml',
                    title: 'Sizing, and the memory that is not the heap',
                    code: 'env:\n  - name: JAVA_TOOL_OPTIONS\n    value: >-\n      -XX:MaxRAMPercentage=70.0\n      -XX:InitialRAMPercentage=70.0\n      -XX:+HeapDumpOnOutOfMemoryError\n      -XX:HeapDumpPath=/dumps\n      -XX:+ExitOnOutOfMemoryError\n\nresources:\n  requests: { memory: "1Gi", cpu: "500m" }\n  limits:   { memory: "1Gi", cpu: "2000m" }\n\n# Why 70% and not 90%. A 1Gi container running a JVM holds:\n#   heap                       ~700 MB at 70%\n#   metaspace                  ~80-150 MB for a Spring application\n#   code cache (JIT)           ~50-250 MB\n#   thread stacks              1 MB x threads\n#   direct byte buffers        NIO, Netty, the JDBC driver\n#   GC structures, the JVM itself\n# Everything after the first line is OUTSIDE -Xmx and inside the limit.',
                    notes: '<p><code>MaxRAMPercentage</code> rather than a fixed <code>-Xmx</code> means the same image is correct at 512 Mi and at 4 Gi — the limit can be changed in the deployment without rebuilding. That is the practical argument, and it also stops the common mismatch where somebody raises the container limit and the heap stays where it was.</p>'
                },
                {
                    type: 'tip',
                    html: '<p><code>-XX:+ExitOnOutOfMemoryError</code> is worth adding deliberately. A JVM that has thrown <code>OutOfMemoryError</code> is usually in an unrecoverable state, and one that limps along serving errors is worse than one that dies and is replaced — a dead pod fails readiness and leaves the load balancer, and a limping one keeps receiving traffic.</p>'
                }
            ],
            docs: [
                { title: 'Java in a container', url: 'https://docs.oracle.com/en/java/javase/21/troubleshoot/troubleshooting-memory-leaks.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'jvm-memory', questionId: 'jvm-in-a-container' },
                { topicId: 'jvm-memory', questionId: 'memory-outside-the-heap' }
            ]
        },

        {
            id: 'requests-limits-and-oomkilled',
            title: 'Requests, Limits and OOMKilled',
            importance: 'must-know',
            summary: 'A request is what the scheduler reserves; a limit is where the kernel intervenes. Exceeding a memory limit is a kill with no warning, no heap dump and no Java-level error.',
            interviewAngle: 'OOMKilled against OutOfMemoryError is the discriminating question, and the difference is which layer noticed — one leaves evidence and the other does not.',
            buildsOn: ['jvm-flags-in-a-container'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'Two very different failures with similar names',
                    left: 'OutOfMemoryError (the JVM)',
                    right: 'OOMKilled (the kernel)',
                    rows: [
                        { aspect: 'Who noticed', left: 'The JVM: the heap cannot satisfy an allocation', right: 'The kernel: the cgroup exceeded its memory limit' },
                        { aspect: 'Evidence', left: 'A stack trace, and a heap dump if configured', right: '<strong>None. SIGKILL. Nothing runs.</strong>' },
                        { aspect: 'Exit code', left: 'Whatever the handler does', left_note: '', right: '<strong>137</strong>, and <code>reason: OOMKilled</code> in the pod status' },
                        { aspect: 'Usual cause', left: 'A heap leak, or a heap too small', right: '<strong>Non-heap memory</strong>: metaspace, direct buffers, thread stacks' },
                        { aspect: 'Diagnosis', left: 'Read the heap dump', right: 'Native Memory Tracking, and reduce <code>MaxRAMPercentage</code>' }
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>The second column is the one that wastes days. A pod restarting with exit code 137 and no application log about memory sends people looking for a heap leak — and the heap was fine, which is why there is no dump and no error. The memory was consumed <em>outside</em> the heap, and <code>-Xmx</code> does not bound any of it.</p><p>The other asymmetry worth knowing: <strong>exceeding a CPU limit throttles, exceeding a memory limit kills.</strong> CPU is compressible and memory is not, which is why a CPU limit set too low produces mysterious latency rather than a crash.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Set <strong>memory request equal to memory limit</strong> for a JVM service. That gives the pod the Guaranteed QoS class, so it is not evicted when the node is under pressure — and since the JVM sizes its heap from the limit and then keeps it, a request lower than the limit is claiming headroom the process will use anyway. For CPU, request what it needs at steady state and either leave the limit generous or omit it, so a garbage collection or a startup burst is not throttled.</p>'
                }
            ],
            docs: [
                { title: 'Kubernetes — Resource Management', url: 'https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'jvm-memory', questionId: 'jvm-in-a-container' },
                { topicId: 'jvm-memory', questionId: 'outofmemoryerror-flavours' }
            ]
        },

        {
            id: 'deployments-and-rolling-updates',
            title: 'Rolling Updates',
            importance: 'should-know',
            summary: 'Replace pods gradually, with a bound on how many may be unavailable and how many extra may exist. It requires that the old and new versions can run at the same time.',
            interviewAngle: 'The backward-compatibility requirement is the real content: a rolling update means two versions serve traffic simultaneously, including against one database.',
            buildsOn: ['requests-limits-and-oomkilled'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'yaml',
                    title: 'The strategy, and what each number controls',
                    code: 'spec:\n  replicas: 4\n  strategy:\n    type: RollingUpdate\n    rollingUpdate:\n      maxUnavailable: 0     # never go below 4 serving pods\n      maxSurge: 1           # at most 5 exist at once -- one at a time\n  minReadySeconds: 10       # a new pod must stay ready for 10s before\n                            # the next one is replaced\n\n# maxUnavailable: 0 + maxSurge: 1 is the safe default: capacity is\n# never reduced, and one bad pod does not take a quarter of the fleet.\n# It is also the slowest, which is the trade.\n\n# The requirement this imposes on the APPLICATION:\n#   during the rollout, v1 and v2 are BOTH serving traffic, against\n#   the SAME database and the SAME message topics. Every schema change\n#   and every message format change has to work for both.',
                    notes: '<p>The comment at the bottom is the part that is an engineering constraint rather than a configuration choice, and it is what makes expand-and-contract migrations mandatory rather than merely good practice: adding a non-nullable column in the same release that starts writing it breaks every v1 pod still running.</p>'
                },
                {
                    type: 'tip',
                    html: '<p><code>minReadySeconds</code> is a small setting with a large effect. Without it, a pod that passes readiness and then crashes ten seconds later is replaced by the next one immediately, and the rollout completes successfully while every pod is crash-looping. A ten-second dwell turns that into a stalled rollout, which is the outcome you want.</p>'
                }
            ],
            docs: [
                { title: 'Kubernetes — Deployments', url: 'https://kubernetes.io/docs/concepts/workloads/controllers/deployment/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'observability-ops', questionId: 'deployment-strategies' },
                { topicId: 'sql-databases', questionId: 'migrations-and-zero-downtime' }
            ]
        },

        {
            id: 'probes-wired-to-actuator',
            title: 'Wiring the Probes',
            importance: 'should-know',
            summary: 'The probe endpoints from the actuator module, connected to the platform, on the management port. Getting the port wrong exposes the whole actuator surface through the ingress.',
            interviewAngle: 'Mostly a recap, and the one new fact is that probes must target the management port, which must not be the one the Service exposes.',
            buildsOn: ['deployments-and-rolling-updates'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'yaml',
                    title: 'Two ports, and only one of them is routed',
                    code: 'ports:\n  - name: http\n    containerPort: 8080      # the Service targets this one\n  - name: management\n    containerPort: 9090      # probes and scraping only\n\nstartupProbe:\n  httpGet: { path: /actuator/health/liveness, port: management }\n  failureThreshold: 30\n  periodSeconds: 5\n\nlivenessProbe:\n  httpGet: { path: /actuator/health/liveness, port: management }\n  periodSeconds: 10\n  failureThreshold: 3\n\nreadinessProbe:\n  httpGet: { path: /actuator/health/readiness, port: management }\n  periodSeconds: 5\n  failureThreshold: 2\n\n# The Service exposes `http` only. Nothing outside the cluster can\n# reach port 9090, so an actuator misconfiguration cannot become a\n# disclosure -- which is the defence in depth the actuator module\n# argued for, implemented here.',
                    notes: '<p>The Prometheus scrape target is the management port too, annotated on the pod. Keeping metrics off the public port means a scrape configuration mistake is a monitoring gap rather than an exposed endpoint.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>An HTTP probe that follows a redirect is not doing what you think.</strong> If security is misconfigured such that <code>/actuator/health</code> redirects to a login page, the probe receives a 302 — which Kubernetes counts as a <em>success</em>, because any 2xx or 3xx passes. The pod is reported healthy while the health endpoint is unreachable. Assert the probe returns 200 by hand once, after any security change.</p>'
                }
            ],
            docs: [
                { title: 'Kubernetes Probes', url: 'https://docs.spring.io/spring-boot/reference/actuator/endpoints.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'observability-ops', questionId: 'liveness-versus-readiness' }
            ]
        },

        {
            id: 'configmaps-and-secrets',
            title: 'ConfigMaps and Secrets',
            importance: 'should-know',
            summary: 'Configuration and credentials injected as environment variables or mounted files. A Kubernetes Secret is base64, not encrypted, unless the cluster was configured for it.',
            interviewAngle: 'The base64 point is the one to get right, and the file-mount-versus-env-var difference decides whether a rotation needs a restart.',
            buildsOn: ['probes-wired-to-actuator'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'Two ways to inject, with different rotation behaviour',
                    left: 'Environment variables',
                    right: 'Mounted files'
                    , rows: [
                        { aspect: 'Spring binding', left: '<code>SPRING_DATASOURCE_URL</code> relaxed-binds', right: '<code>spring.config.import</code>, or a config tree' },
                        { aspect: 'Updated when the source changes', left: '<strong>No — fixed at pod start</strong>', right: 'Yes, the kubelet refreshes the file' },
                        { aspect: 'Visible in <code>/proc</code> and <code>kubectl describe</code>', left: '<strong>Yes</strong>', right: 'No' },
                        { aspect: 'Leaks into crash dumps and child processes', left: 'Yes', right: 'No' },
                        { aspect: 'Rotation', left: 'Requires a pod restart', right: 'The file changes; <strong>the application must re-read it</strong>' },
                        { aspect: 'Preferred for secrets', left: 'No', right: '<strong>Yes</strong>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A Kubernetes Secret is base64-encoded, not encrypted.</strong> Anyone with read access to Secrets in the namespace can decode it in one command, and by default it is stored in etcd in the clear unless encryption at rest was enabled. It is a <em>separation</em> mechanism — a distinct resource type with its own RBAC — rather than a protection mechanism. For anything genuinely sensitive, use an external secret store with a CSI driver or an operator, which is the secrets chapter from the security track arriving as infrastructure.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>A mounted file that updates without a restart only helps if the application re-reads it, and most do not — a <code>@Value</code> captured at construction holds the old value forever. Either accept that rotation means a rolling restart, which is honest and simple, or use a mechanism designed for it: a store client that fetches on demand, or a config source that supports refresh. What does not work is assuming the file mount alone made rotation live.</p>'
                }
            ],
            docs: [
                { title: 'Kubernetes — Secrets', url: 'https://kubernetes.io/docs/concepts/configuration/secret/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'cloud', questionId: 'managed-secrets' },
                { topicId: 'spring-boot', questionId: 'config-files-and-secrets' }
            ]
        },

        {
            id: 'graceful-shutdown-and-sigterm',
            title: 'Graceful Shutdown',
            importance: 'must-know',
            summary: 'SIGTERM and endpoint removal happen concurrently, not in order. A pod must keep serving for a few seconds after it is told to stop, or every rolling update drops requests.',
            interviewAngle: 'The race is the whole answer, and the preStop sleep that fixes it looks like a hack until you know why it is there.',
            buildsOn: ['configmaps-and-secrets'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>When a pod is deleted, two things happen <strong>in parallel</strong>: the kubelet sends <code>SIGTERM</code> to the container, and the endpoints controller removes the pod from the Service so that kube-proxy on every node stops routing to it.</p><p>The second one is <em>eventually</em> consistent — it propagates to every node — and it is frequently slower than the first. So there is a window in which the application has begun shutting down and traffic is still arriving, and those requests are refused. On every pod, on every deployment.</p>'
                },
                {
                    type: 'syntax',
                    language: 'yaml',
                    title: 'The sleep that is not a hack',
                    code: 'lifecycle:\n  preStop:\n    exec:\n      # Runs BEFORE SIGTERM is sent. It does nothing except delay --\n      # which is exactly the point: it gives the endpoints removal time\n      # to propagate to every node before the application starts\n      # shutting down.\n      command: ["sh", "-c", "sleep 10"]\n\nterminationGracePeriodSeconds: 45   # preStop + shutdown, with headroom\n\n---\n# And the application side:\nserver:\n  shutdown: graceful                # stop accepting; finish in-flight\nspring:\n  lifecycle:\n    timeout-per-shutdown-phase: 30s\n\n# The resulting sequence:\n#   1. Pod marked Terminating; endpoints removal begins\n#   2. preStop sleeps 10s -- traffic drains as routes are withdrawn\n#   3. SIGTERM -> Spring closes the context\n#   4. Tomcat stops accepting, finishes in-flight requests\n#   5. @PreDestroy, connection pools closed, consumers unsubscribed\n#   6. Process exits well inside the 45s grace period',
                    notes: '<p><code>server.shutdown=graceful</code> is the Spring half and it is not the default. Without it, the context closes immediately on <code>SIGTERM</code> and in-flight requests are terminated mid-response — so the <code>preStop</code> sleep alone is not sufficient, and neither is the graceful setting alone.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>If <code>SIGTERM</code> never reaches the JVM, none of this happens.</strong> The two ways that occurs are a shell-form <code>ENTRYPOINT</code>, where <code>/bin/sh</code> is PID 1 and does not forward signals, and a wrapper script that runs Java without <code>exec</code>. In both cases the container is <code>SIGKILL</code>ed at the end of the grace period every time, in-flight requests are lost on every deploy, and the only symptom is a small number of errors that correlate with deployments and are assumed to be unavoidable.</p>'
                }
            ],
            docs: [
                { title: 'Kubernetes — Pod Lifecycle', url: 'https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/', kind: 'guide' },
                { title: 'Spring Boot — Graceful Shutdown', url: 'https://docs.spring.io/spring-boot/reference/web/graceful-shutdown.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'observability-ops', questionId: 'graceful-shutdown-in-kubernetes' },
                { topicId: 'spring-core', questionId: 'graceful-shutdown' }
            ]
        },

        {
            id: 'horizontal-pod-autoscaling',
            title: 'Autoscaling',
            importance: 'should-know',
            summary: 'Add pods when a metric exceeds a target. CPU is the default signal and is a poor one for a JVM service, whose bottleneck is usually a pool rather than the processor.',
            interviewAngle: 'The JVM-specific caveats are the substance: startup time, JIT warm-up, and scaling on a metric that does not reflect the constraint.',
            buildsOn: ['graceful-shutdown-and-sigterm'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'yaml',
                    title: 'Scaling on a signal that means something',
                    code: 'apiVersion: autoscaling/v2\nkind: HorizontalPodAutoscaler\nspec:\n  minReplicas: 3\n  maxReplicas: 20\n  metrics:\n    # CPU is the default and for a JVM service it is usually the wrong\n    # signal: the bottleneck is normally the connection pool or a\n    # downstream, not the processor.\n    - type: Resource\n      resource: { name: cpu, target: { type: Utilization, averageUtilization: 70 } }\n\n    # Much better: a metric that reflects the actual constraint.\n    - type: Pods\n      pods:\n        metric: { name: http_server_requests_seconds_count }\n        target: { type: AverageValue, averageValue: "50" }\n\n  behavior:\n    scaleUp:\n      stabilizationWindowSeconds: 60\n    scaleDown:\n      # Slow. Scaling down fast and back up costs a full JVM start and\n      # a cold JIT on every cycle.\n      stabilizationWindowSeconds: 300',
                    notes: '<p>The asymmetric stabilisation is deliberate. Scaling up quickly is cheap insurance; scaling down quickly is expensive, because the pod you remove took thirty seconds to start and several minutes to reach steady-state performance, and you may need it again in ninety seconds.</p>'
                },
                {
                    type: 'types',
                    title: 'What makes autoscaling a JVM service different',
                    items: [
                        { name: 'Startup is slow', html: '<p>Thirty to sixty seconds before a new pod serves anything. Autoscaling reacts to load that has already arrived, so <code>minReplicas</code> has to cover the burst you cannot scale into.</p>' },
                        { name: 'A new pod is slow at first', html: '<p>Interpreted bytecode until the JIT warms up. A pod added under load is initially several times slower than its peers, which can make the situation briefly worse.</p>' },
                        { name: 'CPU is often not the constraint', html: '<p>A service waiting on a database is not CPU-busy. Scaling on CPU adds pods that all wait on the same saturated pool.</p>' },
                        { name: 'Adding pods can hurt the downstream', html: '<p>Twenty pods times a ten-connection pool is two hundred database connections. <strong>Autoscaling the front can take out the back.</strong></p>' },
                        { name: 'Consumers cannot exceed the partitions', html: '<p>Scaling a Kafka consumer group beyond the partition count adds idle pods.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>The fourth item is the one that causes incidents and it is worth stating as a rule: <strong>the total connection pool across all replicas must fit inside what the database can serve.</strong> Set <code>maxReplicas × pool size</code> against the database\'s connection limit before enabling autoscaling, or use a connection proxy such as PgBouncer between them. Otherwise the autoscaler responds to load by adding the pods that exhaust the database.</p>'
                }
            ],
            docs: [
                { title: 'Kubernetes — Horizontal Pod Autoscaling', url: 'https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'sql-databases', questionId: 'connection-pool-sizing' },
                { topicId: 'caching-scale', questionId: 'scaling-reads-and-writes' }
            ]
        }
    ]
};
