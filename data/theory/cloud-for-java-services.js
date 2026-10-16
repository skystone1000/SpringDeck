/* ==========================================================================
   data/theory/cloud-for-java-services.js — module 81 in the reading path

   The second section 5.9 insertion into `production`, and the plan attaches
   an explicit instruction to it: written cloud-agnostic first, with AWS
   named as the worked example, because AWS is what most Java job
   descriptions name and a candidate is asked "how would you do this on AWS"
   rather than "describe IaaS". Every chapter states the concept, then the
   AWS service, then the Azure and GCP equivalents in one line.

   No chapter is an AWS tutorial. Eleven chapters, and three of them —
   cold starts, native image, and cost as a design input — are the ones a
   Java engineer is actually asked about rather than a platform engineer.
   ========================================================================== */

const cloudForJavaServicesModule = {
    id: 'cloud-for-java-services',
    trackId: 'production',
    order: 81,
    title: 'Running on a Cloud',
    tagline: 'The managed services a Java service actually touches.',
    estimatedMinutes: 40,
    prerequisites: ['containers-and-k8s'],
    docHub: { title: 'AWS Well-Architected Framework', url: 'https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html' },

    chapters: [
        {
            id: 'managed-vs-self-hosted',
            title: 'Managed or Self-Hosted',
            importance: 'must-know',
            summary: 'You are buying operations, not software. The question is whether the work you stop doing is worth the price and the constraints that come with it.',
            interviewAngle: 'The framing beats a feature comparison. Naming what you give up — version choice, extensions, tuning knobs — is what makes the answer balanced.',
            buildsOn: [],
            blocks: [
                {
                    type: 'table',
                    title: 'What you stop doing, and what you give up',
                    headers: ['', 'Self-hosted', 'Managed'],
                    rows: [
                        ['Patching and upgrades', 'Yours, on your schedule', 'Theirs, in a maintenance window you influence'],
                        ['Backups and restore testing', 'Yours to build and to test', 'Provided — <strong>and still test the restore</strong>'],
                        ['Failover', 'You design and rehearse it', 'A configuration option'],
                        ['Version choice', 'Anything', '<strong>What they support</strong>, and forced upgrades at end of life'],
                        ['Extensions and plugins', 'Anything', 'An approved list'],
                        ['Deep tuning', 'Every setting', 'A parameter group; some settings are simply unavailable'],
                        ['Cost', 'Lower list price, higher staff cost', 'Higher list price, lower staff cost'],
                        ['3am', '<strong>You</strong>', 'Them, mostly']
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>The default that is right for most teams: <strong>managed for anything stateful</strong> — databases, brokers, caches — and self-hosted for stateless services, which are easy to run and where the platform buys you least. The failure mode in the other direction is a team of six operating a Kafka cluster and a PostgreSQL primary-replica pair, spending most of its capacity on work that is not the product.</p>'
                }
            ],
            docs: [
                { title: 'AWS Well-Architected — Operational Excellence', url: 'https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'cloud', questionId: 'managed-relational-databases' }
            ]
        },

        {
            id: 'object-storage-and-presigned-urls',
            title: 'Object Storage and Presigned URLs',
            importance: 'must-know',
            summary: 'Files do not belong in a database or on a pod\'s disk. And uploads should not pass through your service at all — a presigned URL lets the client talk to the store directly.',
            interviewAngle: 'The presigned-URL pattern is the answer to "how would you handle file uploads", and the reason is that it keeps a hundred-megabyte stream out of your heap and your threads.',
            buildsOn: ['managed-vs-self-hosted'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p><strong>The concept.</strong> Object storage is a flat, HTTP-addressable, effectively unlimited store for opaque blobs, with per-object access control and lifecycle rules. It is not a filesystem — there are no real directories and no partial writes.</p><p><strong>AWS:</strong> S3. <strong>Azure:</strong> Blob Storage. <strong>GCP:</strong> Cloud Storage.</p><p>A <strong>presigned URL</strong> is a time-limited, signed URL that grants one specific operation on one specific object. Your service generates it using its own credentials and hands it to the client, who then uploads or downloads directly — so the bytes never traverse your application.</p>'
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Issuing an upload URL rather than accepting the upload',
                    code: '@PostMapping("/documents/upload-url")\nUploadTarget requestUpload(@AuthenticationPrincipal Jwt caller,\n                           @RequestBody @Valid UploadRequest request) {\n\n    // The KEY is chosen by the server, never by the client -- otherwise\n    // a client can write over another tenant is object.\n    String key = "tenants/%s/documents/%s".formatted(\n            caller.getClaimAsString("tenant"), UUID.randomUUID());\n\n    PutObjectRequest put = PutObjectRequest.builder()\n            .bucket(bucket)\n            .key(key)\n            .contentType(request.contentType())\n            .contentLength(request.sizeBytes())      // bind the size too\n            .build();\n\n    PresignedPutObjectRequest presigned = presigner.presignPutObject(\n            b -> b.signatureDuration(Duration.ofMinutes(10)).putObjectRequest(put));\n\n    documents.recordPending(key, caller.getSubject());\n    return new UploadTarget(presigned.url().toString(), key);\n}\n\n// The client PUTs the bytes straight to S3. Our service handled one\n// small JSON request instead of streaming 200 MB through a thread.',
                    notes: '<p>Server-chosen keys and a bound content length are the two controls that make this safe. A presigned URL for a client-supplied key is a write primitive pointed wherever the client likes; without a length constraint it is an unbounded upload against your bill.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Confirm the upload with an event rather than trusting the client to tell you. Object storage can emit a notification on object creation — to a queue or a function — which is what moves the document from "pending" to "available". A client that uploads successfully and then closes the tab never sends your confirmation call, and without the event those objects are orphaned.</p>'
                }
            ],
            docs: [
                { title: 'Amazon S3 — Presigned URLs', url: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'cloud', questionId: 'presigned-urls' },
                { topicId: 'rest-api', questionId: 'large-payloads-and-streaming' }
            ]
        },

        {
            id: 'managed-queues-and-topics',
            title: 'Managed Queues and Topics',
            importance: 'should-know',
            summary: 'A queue with no cluster to operate. It gives up ordering guarantees, replay and throughput ceilings that a log has, and gives back not running a broker.',
            interviewAngle: 'The comparison to Kafka from the messaging module is the substance, and the FIFO-versus-standard trade is the concrete detail.',
            buildsOn: ['object-storage-and-presigned-urls'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p><strong>The concept.</strong> A hosted queue or pub-sub topic with no brokers to run, priced per message, scaling without capacity planning.</p><p><strong>AWS:</strong> SQS for queues, SNS for fan-out, MSK or Kinesis when a log is required. <strong>Azure:</strong> Service Bus, Event Hubs. <strong>GCP:</strong> Pub/Sub.</p>'
                },
                {
                    type: 'table',
                    title: 'A managed queue against a log',
                    headers: ['', 'SQS standard', 'SQS FIFO', 'Kafka / MSK'],
                    rows: [
                        ['Ordering', '<strong>None</strong>', 'Per message group', 'Per partition'],
                        ['Delivery', 'At least once', 'Exactly once <em>within a 5-minute window</em>', 'At least once'],
                        ['Throughput', 'Effectively unlimited', 'Bounded, and much lower', 'Very high'],
                        ['Replay', '<strong>No</strong> — consumed is gone', 'No', '<strong>Yes</strong>, within retention'],
                        ['Multiple independent consumers', 'Fan out with SNS first', 'Same', 'A second consumer group'],
                        ['Operational cost', '<strong>Nearly none</strong>', 'Nearly none', 'A cluster, managed or not']
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>SQS plus SNS covers a large fraction of what teams reach for Kafka to do, at a fraction of the operational cost — and the two properties it cannot give you are the ones to check for before choosing it: <strong>replay</strong> and <strong>ordered high-throughput streams</strong>. If the design needs a new consumer to read history, or needs strict per-entity ordering at volume, a log is the answer and the cluster is the price.</p>'
                }
            ],
            docs: [
                { title: 'Amazon SQS — FIFO queues', url: 'https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues-understanding-logic.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'cloud', questionId: 'managed-queues' },
                { topicId: 'kafka-messaging', questionId: 'kafka-versus-rabbitmq' }
            ]
        },

        {
            id: 'managed-relational-databases',
            title: 'Managed Relational Databases',
            importance: 'must-know',
            summary: 'The same PostgreSQL, with backups, failover and patching handled. The Java-relevant details are the failover behaviour and what it does to a connection pool.',
            interviewAngle: 'The failover question is the practical one: a pool full of connections to a promoted-away primary produces a burst of errors unless the driver and the pool are configured for it.',
            buildsOn: ['managed-queues-and-topics'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p><strong>The concept.</strong> A managed engine — usually the real PostgreSQL or MySQL — with automated backups, point-in-time recovery, a standby in another availability zone, and patching in a maintenance window.</p><p><strong>AWS:</strong> RDS, or Aurora for a cloud-native storage layer. <strong>Azure:</strong> Database for PostgreSQL. <strong>GCP:</strong> Cloud SQL, or AlloyDB.</p><p>The part that concerns application code is failover. Promotion takes tens of seconds, and during it the DNS name repoints — which the JDBC driver and the connection pool must be prepared for, because every pooled connection to the old primary is now dead.</p>'
                },
                {
                    type: 'syntax',
                    language: 'yaml',
                    title: 'Pool settings that survive a failover',
                    code: 'spring:\n  datasource:\n    hikari:\n      # Detect a dead connection before handing it to a caller.\n      validation-timeout: 3000\n      connection-timeout: 3000       # fail fast; do not queue for 30s\n\n      # Do not keep a connection forever. Recycling means the pool\n      # naturally migrates to the new primary after a failover instead\n      # of holding dead sockets.\n      max-lifetime: 600000           # 10 minutes\n      idle-timeout: 300000\n      keepalive-time: 120000\n\n      maximum-pool-size: 10          # see the autoscaling chapter:\n                                     # replicas x this must fit the\n                                     # database is connection limit\n\n# And on the JDBC URL, so a failed socket is not a 30-second hang:\n#   ?connectTimeout=3&socketTimeout=30&tcpKeepAlive=true',
                    notes: '<p><code>max-lifetime</code> shorter than any proxy or database idle timeout is the setting that prevents the other common symptom: a connection the pool believes is good, closed at the far end minutes ago, producing an intermittent "connection reset" that correlates with nothing.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Two things worth checking that managed does not do for you: <strong>test the restore</strong>, because an untested backup is a hope rather than a plan; and know your <strong>connection limit</strong>, which on smaller instance classes is much lower than people assume — a few hundred — and is shared by every replica, every migration job and every analyst with a client open.</p>'
                }
            ],
            docs: [
                { title: 'Amazon RDS — Multi-AZ', url: 'https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZ.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'cloud', questionId: 'managed-relational-databases' },
                { topicId: 'sql-databases', questionId: 'connection-pool-sizing' }
            ]
        },

        {
            id: 'containers-vs-serverless-for-java',
            title: 'Containers or Functions',
            importance: 'must-know',
            summary: 'A long-running JVM amortises its startup and warm-up over millions of requests. A function pays both on a cold start, which is what makes serverless Java awkward.',
            interviewAngle: 'The JVM-specific argument is the answer. Serverless suits languages that start in milliseconds, and Java is not one of them without work.',
            buildsOn: ['managed-relational-databases'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'The trade, for a JVM specifically',
                    left: 'A container (ECS, EKS, Cloud Run)',
                    right: 'A function (Lambda, Functions)',
                    rows: [
                        { aspect: 'Startup', left: 'Once, at deploy', right: '<strong>On every cold start</strong>' },
                        { aspect: 'JIT warm-up', left: 'Amortised over the process lifetime', right: 'Paid again on each new execution environment' },
                        { aspect: 'Connection pools', left: 'Natural', right: '<strong>Awkward</strong> — one pool per environment, times N environments' },
                        { aspect: 'Idle cost', left: 'You pay for the pods', right: 'Nearly zero' },
                        { aspect: 'Spiky traffic', left: 'Scale up slowly, or over-provision', right: '<strong>Scales instantly</strong>' },
                        { aspect: 'Execution limit', left: 'None', right: 'Fifteen minutes on Lambda' },
                        { aspect: 'Good fit for Java', left: '<strong>Yes</strong>', right: 'With effort — the next two chapters' }
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>The connection-pool row is the one that catches teams and it is not obvious. Each concurrent function execution runs in its own environment with its own JVM and its own pool, so a hundred concurrent invocations is a hundred pools — which exhausts a database that would have been comfortable serving ten containers. A connection proxy such as RDS Proxy exists specifically for this shape.</p><p>Where Java on functions genuinely fits: infrequent event handling, scheduled work, glue between managed services, and traffic so spiky that provisioning for the peak is the larger cost.</p>'
                }
            ],
            docs: [
                { title: 'AWS Lambda — Java', url: 'https://docs.aws.amazon.com/lambda/latest/dg/lambda-java.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'cloud', questionId: 'containers-versus-serverless' }
            ]
        },

        {
            id: 'java-cold-starts-and-mitigations',
            title: 'Cold Starts',
            importance: 'must-know',
            summary: 'JVM start, class loading, framework initialisation and interpreted execution — seconds before the first response. Four mitigations, and only one of them removes the problem.',
            interviewAngle: 'Breaking the cold start into its parts is what makes the answer specific rather than "Java is slow to start".',
            buildsOn: ['containers-vs-serverless-for-java'],
            blocks: [
                {
                    type: 'types',
                    title: 'What a cold start is actually made of',
                    items: [
                        { name: 'JVM startup', html: '<p>Perhaps 100 ms. The smallest part, and the one people blame.</p>' },
                        { name: 'Class loading', html: '<p>Thousands of classes read, verified and linked. Substantial for a Spring application.</p>' },
                        { name: 'Framework initialisation', html: '<p>Component scanning, auto-configuration, bean creation, proxy generation. <strong>Usually the largest part.</strong></p>' },
                        { name: 'Interpreted execution', html: '<p>The first thousand invocations run interpreted. The function is <em>correct</em> and several times slower than it will be.</p>' },
                        { name: 'Connections', html: '<p>The database handshake, TLS, and any secret fetched at startup.</p>' }
                    ]
                },
                {
                    type: 'table',
                    title: 'The mitigations, and what each one costs',
                    headers: ['Mitigation', 'Effect', 'Cost'],
                    rows: [
                        ['Provisioned concurrency', 'Environments kept warm — <strong>no cold start</strong>', 'You pay for idle, which is what serverless was avoiding'],
                        ['Lambda SnapStart', 'Snapshot after initialisation, restore on invoke', 'Java only; anything cached at init — a connection, a random seed — must be re-created'],
                        ['AOT processing (Spring Boot 3)', 'Bean definitions computed at build time', 'A build step; some dynamic configuration is unavailable'],
                        ['<strong>GraalVM native image</strong>', '<strong>Tens of milliseconds; the problem is removed</strong>', 'The next chapter'],
                        ['Class Data Sharing', 'Faster class loading from an archive', 'Modest gain, low effort'],
                        ['Fewer dependencies, lazy beans', 'Less to initialise', 'Real, and usually the cheapest first move']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>SnapStart restores a snapshot, so anything captured during initialisation is restored too.</strong> A database connection opened at init is restored as a dead socket; a <code>SecureRandom</code> seeded at init is restored with the same seed in every environment, which is a genuine security defect. The runtime hooks exist to re-initialise those — and using them is not optional, which is why SnapStart is a mitigation with homework rather than a flag.</p>'
                }
            ],
            docs: [
                { title: 'AWS Lambda SnapStart', url: 'https://docs.aws.amazon.com/lambda/latest/dg/snapstart.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'cloud', questionId: 'java-cold-starts' },
                { topicId: 'jvm-memory', questionId: 'jit-compilation-and-warmup' }
            ]
        },

        {
            id: 'graalvm-native-image',
            title: 'GraalVM Native Image',
            importance: 'should-know',
            summary: 'Ahead-of-time compilation to a native executable. Milliseconds to start, a fraction of the memory, and it gives up the JIT, dynamic class loading and unregistered reflection.',
            interviewAngle: 'The closed-world assumption is the concept, and it explains every limitation in one sentence rather than as a list.',
            buildsOn: ['java-cold-starts-and-mitigations'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'What it changes',
                    left: 'JVM',
                    right: 'Native image',
                    rows: [
                        { aspect: 'Startup', left: '2–30 seconds for a Spring service', right: '<strong>20–100 ms</strong>' },
                        { aspect: 'Memory', left: 'Hundreds of MB', right: 'Tens of MB' },
                        { aspect: 'Peak throughput', left: '<strong>Higher</strong> — the JIT optimises with profile data', right: 'Lower; no JIT, no deoptimisation' },
                        { aspect: 'Build time', left: 'Seconds', right: '<strong>Minutes</strong>' },
                        { aspect: 'Reflection, proxies, resources', left: 'Anything, at run time', left_note: '', right: '<strong>Must be known at build time</strong>' },
                        { aspect: 'Observability tooling', left: 'JFR, agents, jcmd, heap dumps', right: 'Partial; the ecosystem assumes a JVM' },
                        { aspect: 'Right for', left: 'Long-running services', right: 'Functions, CLIs, and very spiky workloads' }
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>The single idea that explains every row is the <strong>closed-world assumption</strong>: the compiler must see the whole reachable program at build time to compile and shrink it. Anything discovered at run time — a class loaded by name, a JDK proxy, a resource read from the classpath — does not exist unless it was registered.</p><p>Spring Boot 3\'s AOT processing generates most of that configuration from the same bean definitions the container would have built, which is why native image support required a Spring generation rather than a flag. A library that reflects dynamically may still need hints written by hand.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The honest position for a long-running service: <strong>native image is usually the wrong trade.</strong> A service that starts once and runs for weeks does not care about a thirty-second start, and it does care about peak throughput, which the JIT wins — because it optimises with real profile data that an ahead-of-time compiler does not have. Reach for it where startup dominates: a function, a CLI, a job that runs for two seconds, or a workload whose scaling is bounded by how fast a new instance can serve.</p>'
                }
            ],
            docs: [
                { title: 'Spring Boot — GraalVM Native Images', url: 'https://docs.spring.io/spring-boot/reference/packaging/native-image/index.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'cloud', questionId: 'java-cold-starts' },
                { topicId: 'spring-boot', questionId: 'native-image-tradeoffs' }
            ]
        },

        {
            id: 'secrets-and-parameter-stores',
            title: 'Secrets and Parameter Stores',
            importance: 'should-know',
            summary: 'A managed store with per-workload access, audit logging and rotation. The application fetches at startup or on demand, and never holds a long-lived credential of its own.',
            interviewAngle: 'The rotation story is the practical detail — a database credential that rotates while the pool holds connections needs a plan, and most designs do not have one.',
            buildsOn: ['graalvm-native-image'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p><strong>The concept.</strong> A service that stores secrets encrypted, controls access per identity, logs every read, and can rotate a value on a schedule.</p><p><strong>AWS:</strong> Secrets Manager for rotating secrets, Parameter Store for configuration and simple secrets. <strong>Azure:</strong> Key Vault. <strong>GCP:</strong> Secret Manager. <strong>Cloud-neutral:</strong> HashiCorp Vault.</p><p>The security track argued for this; here the question is how a running Java service consumes one, and there are three shapes with different rotation behaviour.</p>'
                },
                {
                    type: 'types',
                    title: 'Three ways to consume a secret',
                    items: [
                        { name: 'Fetched at startup into configuration', html: '<p>Simplest, and rotation requires a restart. Spring Cloud AWS and the Kubernetes external-secrets operator both do this.</p>' },
                        { name: 'Mounted as a file by a CSI driver', html: '<p>The file updates on rotation; the application must re-read it. Better, and the re-reading is still yours to arrange.</p>' },
                        { name: 'Fetched on demand by the SDK', html: '<p>Always current, with a short cache. The right answer for a credential that rotates frequently, and it puts the secret store on the request path.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Rotating a database password under a live connection pool is the case that needs designing.</strong> Existing connections keep working — they authenticated already — and the next new connection uses the old password and fails. The result is a service that works until the pool needs to grow, then fails intermittently, hours after the rotation nobody connected it to. The answers are a two-password window during rotation, a pool that fetches credentials per connection, or a proxy that handles authentication — and doing nothing is a scheduled outage.</p>'
                }
            ],
            docs: [
                { title: 'AWS Secrets Manager — Rotation', url: 'https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotating-secrets.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'cloud', questionId: 'managed-secrets' }
            ]
        },

        {
            id: 'iam-and-least-privilege',
            title: 'Identity and Least Privilege',
            importance: 'must-know',
            summary: 'A workload gets an identity, and that identity gets exactly the permissions it needs. No long-lived access keys in configuration, ever.',
            interviewAngle: 'Workload identity — IRSA, workload identity federation — is the current answer, and it removes the static credential rather than protecting it.',
            buildsOn: ['secrets-and-parameter-stores'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p><strong>The concept.</strong> Every workload has an identity; policies grant that identity specific actions on specific resources; credentials are short-lived and issued automatically.</p><p><strong>AWS:</strong> IAM roles, with IRSA or EKS Pod Identity for Kubernetes. <strong>Azure:</strong> Managed Identity. <strong>GCP:</strong> Workload Identity.</p><p>The important property is that <strong>there is no static credential to leak</strong>. The pod assumes a role via a projected service-account token, receives credentials valid for an hour, and the SDK refreshes them. Nothing is in an environment variable, an image or a repository.</p>'
                },
                {
                    type: 'syntax',
                    language: 'yaml',
                    title: 'A policy scoped to what the service actually does',
                    code: '# WRONG. It works, it is what gets written under time pressure, and it\n# means a compromise of this service is a compromise of every bucket.\n# Action: s3:*   Resource: *\n\n# RIGHT: the actions, on the prefix, for this service only.\nStatement:\n  - Effect: Allow\n    Action:\n      - s3:PutObject\n      - s3:GetObject\n    Resource: "arn:aws:s3:::acme-documents/tenants/*"\n  - Effect: Allow\n    Action:\n      - secretsmanager:GetSecretValue\n    Resource: "arn:aws:secretsmanager:eu-west-1:*:secret:orders/*"\n\n# Note what is ABSENT: no s3:DeleteObject, because this service never\n# deletes; no ListAllMyBuckets, because it knows its bucket. Every\n# action not granted is an action a compromise cannot perform.',
                    notes: '<p>The absence of <code>DeleteObject</code> is the whole principle in one line. Least privilege is not about tightening a wildcard afterwards; it is about the list of things an attacker with your service\'s identity <em>cannot</em> do, and each omitted action makes that list longer.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Derive the policy from usage rather than from imagination. Run in a permissive environment, collect what the service actually called — access analyzers do this from CloudTrail — and generate the policy from that. It is faster than reasoning about it and it finds the calls an SDK makes that nobody knew about, which is the usual reason a hand-written least-privilege policy fails in production.</p>'
                }
            ],
            docs: [
                { title: 'IAM roles for service accounts', url: 'https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'cloud', questionId: 'iam-and-least-privilege' }
            ]
        },

        {
            id: 'cost-as-a-design-input',
            title: 'Cost as a Design Input',
            importance: 'should-know',
            summary: 'On a cloud, an architectural choice is a line item. Data transfer, log ingestion and idle capacity are the three that surprise teams, and all three are design decisions.',
            interviewAngle: 'Engineers who can reason about cost are unusual, and naming cross-AZ transfer and log ingestion specifically is what makes it concrete rather than a platitude.',
            buildsOn: ['iam-and-least-privilege'],
            blocks: [
                {
                    type: 'types',
                    title: 'The costs a Java service controls',
                    items: [
                        { name: 'Data transfer', html: '<p>Cross-availability-zone traffic is billed in both directions. Chatty microservices spread across three zones can spend more on transfer than on compute — which is an <em>architecture</em> cost, produced by the decomposition.</p>' },
                        { name: 'Log ingestion', html: '<p>The volume arithmetic from the logging module, priced. A per-request INFO line is a recurring bill.</p>' },
                        { name: 'Idle capacity', html: '<p>Provisioned for peak, running at 15% at night. Autoscaling and right-sizing address it, and both need the metrics to be trustworthy first.</p>' },
                        { name: 'Over-provisioned managed services', html: '<p>A database instance sized for a load test two years ago. Nobody is incentivised to notice.</p>' },
                        { name: 'Storage that is never deleted', html: '<p>Objects with no lifecycle rule, snapshots with no expiry, logs retained indefinitely. It accrues silently and forever.</p>' },
                        { name: 'NAT gateway traffic', html: '<p>Every outbound call from a private subnet, per gigabyte. A chatty integration is a line item.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>The design decisions with the largest cost consequences are made early and are expensive to revisit: <strong>how many services</strong> — each with its own baseline compute and its own cross-zone chatter; <strong>how much you log</strong>; and <strong>how much you retain</strong>. A team that treats these as engineering choices rather than as a finance problem discovered later usually spends a fraction of what an equivalent team spends.</p>'
                }
            ],
            docs: [
                { title: 'AWS Well-Architected — Cost Optimization', url: 'https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'cloud', questionId: 'cloud-cost-awareness' }
            ]
        },

        {
            id: 'portability-vs-managed-convenience',
            title: 'Portability Against Convenience',
            importance: 'should-know',
            summary: 'Every managed service you adopt is leverage and lock-in at once. The useful question is not whether you are locked in but how expensive leaving would be, per service.',
            interviewAngle: 'Cloud-agnostic architecture is usually a bad trade, and being able to argue that — while identifying the two or three places to stay portable — is the mature answer.',
            buildsOn: ['cost-as-a-design-input'],
            blocks: [
                {
                    type: 'table',
                    title: 'Lock-in, priced per service',
                    headers: ['Service', 'Cost of leaving', 'Note'],
                    rows: [
                        ['Managed PostgreSQL', '<strong>Low</strong>', 'It is PostgreSQL. Dump and restore.'],
                        ['Object storage', 'Low', 'The S3 API is a de facto standard'],
                        ['Managed Kubernetes', 'Low', 'The manifests are the same'],
                        ['A managed queue', 'Medium', 'Different semantics, and an adapter contains it'],
                        ['A proprietary database', 'High', 'Data model and query language both'],
                        ['Serverless functions plus event glue', '<strong>High</strong>', 'The architecture <em>is</em> the platform'],
                        ['Managed identity and IAM', 'High', 'And it is not worth avoiding — the alternative is worse']
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>The argument against cloud-agnostic architecture is that it is paid for continuously and redeemed almost never. Abstracting every managed service behind your own interface means reimplementing the parts each provider does differently, using the intersection of their features rather than the union, and operating an abstraction layer — and the migration it was built for happens to very few organisations.</p><p>The proportionate position is to stay portable where it is nearly free — a relational database, object storage, containers — and to use the proprietary services where they earn it, behind an adapter, which is the anti-corruption layer from the DDD module doing an infrastructure job.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The answer that holds up: <em>"I would not build cloud-agnostic. I would keep the database, the container platform and object storage on portable choices because that costs nothing, and I would use the managed queue, the secret store and the identity system directly, behind a thin port in my own vocabulary. That way a migration is rewriting a handful of adapters rather than a project — and I have not paid an abstraction tax on every feature for a migration that will probably never happen."</em></p>'
                }
            ],
            docs: [
                { title: 'AWS Well-Architected Framework', url: 'https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'cloud', questionId: 'cloud-agnostic-or-not' },
                { topicId: 'architecture-ddd', questionId: 'hexagonal-architecture' }
            ]
        }
    ]
};
