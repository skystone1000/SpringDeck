/* ==========================================================================
   data/cloud.js — Cloud & Managed Services

   Flat, on the `production` track.

   Deliberately not an AWS certification quiz. Nobody hiring a backend
   engineer wants the list of S3 storage classes; they want to know whether
   you would proxy a 2GB upload through your service, whether you know what a
   static access key in an environment variable costs, and whether "we will
   stay cloud-agnostic" is a position you can defend or repeat.

   AWS names are used where a name is needed, because a concrete example is
   clearer than a generic one, and the equivalent on another provider is
   noted where it differs in a way that matters.

   ONE GLOBAL PER FILE.
   ========================================================================== */

const cloudData = {
    id: 'cloud',
    title: 'Cloud & Managed Services',
    subsections: null,
    keyTopics: [
        'object storage and presigned URLs', 'managed queues', 'managed relational databases',
        'containers vs serverless', 'Java cold starts and mitigations', 'GraalVM native image',
        'secrets and parameter stores', 'IAM and least privilege', 'cost awareness',
        'cloud-agnostic vs managed trade-off'
    ],
    questions: [

{
    id: 'presigned-urls',
    importance: 'must-know',
    subsection: null,
    question: 'A user needs to upload a 2GB file. How does that work?',
    answer:
        '<p><strong>Not through your application.</strong> Proxying it means the request occupies ' +
        'a thread for minutes, the payload is buffered somewhere, your service now needs disk or ' +
        'a large heap, request timeouts have to be raised for everybody, and a deploy in the ' +
        'middle kills the upload. All of that to be a pipe.</p>' +
        '<p>The answer is a <strong>presigned URL</strong>. Your service authenticates and ' +
        'authorises the user, decides on an object key, and asks the object store for a ' +
        'time-limited signed URL. The client uploads <strong>directly to the store</strong>. Your ' +
        'service never sees a byte.</p>' +
        '<p>The flow is worth being able to describe end to end:</p>' +
        '<ul>' +
        '<li>Client asks your API to start an upload; you check permissions and return a ' +
        'presigned URL plus the key.</li>' +
        '<li>Client <code>PUT</code>s straight to the store.</li>' +
        '<li>The store emits an <strong>event</strong> on object creation, which triggers your ' +
        'processing — virus scan, thumbnailing, marking the record complete. That is how you find ' +
        'out it finished, rather than trusting the client to tell you.</li>' +
        '</ul>' +
        '<p>Four details that separate a considered answer:</p>' +
        '<ul>' +
        '<li><strong>Constrain the signature.</strong> A presigned POST policy can bound the ' +
        'content type and the maximum size; a bare presigned PUT cannot, so the client can upload ' +
        'anything of any size to that key.</li>' +
        '<li><strong>Keep the expiry short</strong> — minutes. The URL is a bearer credential and ' +
        'it will end up in a log.</li>' +
        '<li><strong>Multipart upload</strong> for anything above a few hundred megabytes, so a ' +
        'failure retries one part rather than the whole file.</li>' +
        '<li><strong>The same pattern for downloads</strong>, which also gets you CDN caching and ' +
        'range requests for free.</li>' +
        '</ul>' +
        '<p>The generalisation worth stating: <strong>your service should handle metadata and ' +
        'authorisation; bytes should travel between the client and the store that is built for ' +
        'them.</strong></p>',
    referenceLinks: [
        { title: 'AWS S3 — Presigned URLs', url: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html' }
    ],
    tags: ['cloud', 'object-storage', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'iam-and-least-privilege',
    importance: 'must-know',
    subsection: null,
    question: 'How should a service authenticate to cloud APIs?',
    answer:
        '<p><strong>With an identity attached to the workload, never with a static access ' +
        'key.</strong> A long-lived key in an environment variable is a credential that does not ' +
        'expire, gets copied into a developer\'s laptop, and ends up in a repository — and the ' +
        'commit history of every public code host is full of them.</p>' +
        '<p>What to use instead:</p>' +
        '<ul>' +
        '<li><strong>An instance or task role</strong> — the workload assumes a role and receives ' +
        'short-lived credentials that rotate automatically. On EKS this is IRSA or EKS Pod ' +
        'Identity; on GKE, Workload Identity; on Azure, a managed identity.</li>' +
        '<li><strong>OIDC federation for CI</strong> — a pipeline exchanges its own signed token ' +
        'for temporary cloud credentials, so there is no secret in the CI system at all. This is ' +
        'the single best change most teams can make to their deployment security.</li>' +
        '</ul>' +
        '<p><strong>Least privilege</strong>, concretely rather than as a slogan: a role per ' +
        'service rather than one shared role; actions listed explicitly rather than ' +
        '<code>s3:*</code>; resources scoped to specific buckets and prefixes rather than ' +
        '<code>*</code>; and separate roles for read and write where the service does both in ' +
        'different code paths.</p>' +
        '<p>Two things worth adding that show operational awareness. <strong>Start from the ' +
        'access logs</strong> — the practical way to write a tight policy is to run with a broad ' +
        'one in a non-production account, see what was actually called, and narrow to that. ' +
        'Writing it from first principles produces a policy that is both too wide and missing ' +
        'something.</p>' +
        '<p>And <strong>the metadata endpoint is why SSRF is a critical vulnerability in the ' +
        'cloud.</strong> A service that fetches a user-supplied URL can be pointed at the ' +
        'instance metadata service and asked for the role\'s credentials. IMDSv2 requires a token ' +
        'and a header, which defeats the naive version, and it has to be enforced rather than ' +
        'merely available.</p>',
    referenceLinks: [
        { title: 'AWS — IAM Security Best Practices', url: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html' }
    ],
    tags: ['cloud', 'iam', 'security', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'containers-versus-serverless',
    importance: 'must-know',
    subsection: null,
    question: 'Would you deploy this service as a container or as a function?',
    answer:
        '<p>By traffic shape and by what the workload does, and the honest answer for most ' +
        'backend services is a container.</p>' +
        '<p><strong>Functions fit</strong> spiky or infrequent traffic where paying for idle ' +
        'capacity is the main cost; genuinely event-driven work — an object landed, a message ' +
        'arrived, a schedule fired; and small, independent pieces of glue. Scale to zero is a ' +
        'real benefit that containers do not have without extra machinery.</p>' +
        '<p><strong>Containers fit</strong> steady traffic, where a function is more expensive ' +
        'per request; anything needing a warm connection pool, an in-process cache, or ' +
        'long-running work; and anything with a large dependency graph, where the cold start is ' +
        'punishing.</p>' +
        '<p>The constraints to name rather than hand-wave:</p>' +
        '<ul>' +
        '<li><strong>Cold starts</strong> — the Java-specific problem, below.</li>' +
        '<li><strong>Execution time limits</strong> — fifteen minutes on Lambda, so a long batch ' +
        'job is out.</li>' +
        '<li><strong>Connection pools do not work.</strong> A thousand concurrent function ' +
        'instances each opening database connections exhausts <code>max_connections</code> ' +
        'immediately. This is the constraint that most often rules functions out in front of a ' +
        'relational database, and the answer is a proxy — RDS Proxy or PgBouncer — which is more ' +
        'infrastructure than the function was supposed to save.</li>' +
        '<li><strong>Local state is a lie.</strong> An instance may be reused or may not, so ' +
        'anything cached in memory is a cache with no invalidation and no guarantee.</li>' +
        '<li><strong>Vendor coupling is higher</strong>, since the handler signature and the ' +
        'event shapes are the platform\'s.</li>' +
        '</ul>' +
        '<p>The middle ground worth knowing exists: <strong>a container that scales to zero</strong> ' +
        '— Cloud Run, Fargate with a scaler, Knative. Ordinary Spring Boot, no handler ' +
        'signature, and most of the idle-cost benefit.</p>',
    referenceLinks: [
        { title: 'AWS Lambda — Best Practices', url: 'https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html' }
    ],
    tags: ['cloud', 'serverless', 'architecture', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'java-cold-starts',
    importance: 'should-know',
    subsection: null,
    question: 'Why is Java bad at cold starts, and what can you do about it?',
    answer:
        '<p>Three costs stack up, and none of them exists in a language that compiles to a native ' +
        'binary:</p>' +
        '<ul>' +
        '<li><strong>JVM start-up</strong> itself.</li>' +
        '<li><strong>Class loading</strong> — a Spring Boot application loads thousands of ' +
        'classes, verifying and linking each one.</li>' +
        '<li><strong>Framework initialisation</strong> — component scanning, auto-configuration, ' +
        'bean creation, proxy generation.</li>' +
        '</ul>' +
        '<p>And then, because the JIT has not run, the first requests execute interpreted — so ' +
        '"started" is not "fast" for a while afterwards.</p>' +
        '<p>The mitigations, from cheapest to most involved:</p>' +
        '<ul>' +
        '<li><strong>Trim what starts.</strong> Fewer auto-configurations, no component scanning ' +
        'over a wide package, lazy initialisation where a bean is not needed on the first ' +
        'request. Often the largest easy win and nobody looks.</li>' +
        '<li><strong>AppCDS</strong> — a class data sharing archive maps pre-parsed class ' +
        'metadata instead of loading it. A meaningful cut for one flag and a build step, and ' +
        'Spring Boot 3.3 added first-class support for producing the archive.</li>' +
        '<li><strong>AWS SnapStart</strong> — takes a snapshot of the initialised JVM and ' +
        'restores from it, so initialisation happens once at publish time rather than per cold ' +
        'start. Very effective, and it needs care: anything captured in the snapshot is shared by ' +
        'every restored instance, so a random seed, a cached credential or an open connection is ' +
        'a bug. There are runtime hooks for exactly this.</li>' +
        '<li><strong>GraalVM native image</strong> — removes the problem rather than reducing it, ' +
        'at the cost of peak throughput, build time and reflection configuration. The right ' +
        'answer when start-up is the binding constraint.</li>' +
        '<li><strong>Provisioned concurrency</strong> — pay to keep instances warm, which is ' +
        'admitting the workload was not a good fit and buying your way out.</li>' +
        '</ul>' +
        '<p>Worth naming: <strong>Project CRaC</strong> is the general form of the snapshot idea, ' +
        'standardising checkpoint and restore for the JVM outside any one cloud, and Spring Boot ' +
        'supports it.</p>',
    referenceLinks: [
        { title: 'AWS Lambda — SnapStart', url: 'https://docs.aws.amazon.com/lambda/latest/dg/snapstart.html' }
    ],
    tags: ['cloud', 'serverless', 'jvm', 'performance'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'managed-secrets',
    importance: 'must-know',
    subsection: null,
    question: 'Where do database credentials come from at runtime?',
    answer:
        '<p>From a secrets manager, fetched at start-up by an identity the workload already ' +
        'has — never from a file in the repository, and not really from an environment variable ' +
        'either.</p>' +
        '<p>Why environment variables are weaker than they look: they are visible in a process ' +
        'listing and in <code>/proc</code>, they are inherited by every child process, they are ' +
        'frequently dumped by a crash reporter or an error page, and <code>/actuator/env</code> ' +
        'will happily print them. They are a step up from a config file and not the answer.</p>' +
        '<p>What a secrets manager adds beyond storage:</p>' +
        '<ul>' +
        '<li><strong>Encryption at rest with a managed key</strong>, and an access policy ' +
        'expressed in IAM.</li>' +
        '<li><strong>An audit trail</strong> — who read this secret, and when. Which is what ' +
        'makes a breach investigable.</li>' +
        '<li><strong>Rotation</strong>, ideally automated, with the application picking up the ' +
        'new value without a deploy.</li>' +
        '<li><strong>Versioning</strong>, so a bad rotation can be rolled back.</li>' +
        '</ul>' +
        '<p>The strongest form, worth naming because it changes the shape of the problem: ' +
        '<strong>dynamic credentials</strong>. Vault\'s database engine — and IAM database ' +
        'authentication on RDS — issue a credential valid for an hour, generated per instance. ' +
        'There is no long-lived secret to leak, and a leaked one expires by itself. That converts ' +
        'secret management from a storage problem into a lifetime problem, which is much ' +
        'easier.</p>' +
        '<p>Two practices to state: <strong>Kubernetes Secrets are base64, which is an encoding ' +
        'and not encryption</strong> — they need encryption at rest enabled and RBAC to be worth ' +
        'anything; and <strong>scan for committed secrets in CI</strong> with gitleaks or ' +
        'similar, because the recovery from a committed credential is rotation, and knowing ' +
        'within a minute rather than a year is the whole difference.</p>',
    referenceLinks: [
        { title: 'HashiCorp Vault — Database Secrets Engine', url: 'https://developer.hashicorp.com/vault/docs/secrets/databases' }
    ],
    tags: ['cloud', 'secrets', 'security', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'managed-queues',
    importance: 'should-know',
    subsection: null,
    question: 'SQS or Kafka?',
    answer:
        '<p>The same log-versus-queue distinction as Kafka against RabbitMQ, with a managed ' +
        'service on one side — and the operational asymmetry usually decides it.</p>' +
        '<p><strong>SQS</strong> is a queue with nothing to run. A message is delivered, becomes ' +
        'invisible for a <strong>visibility timeout</strong>, and is deleted by the consumer on ' +
        'success or reappears on failure. Redrive to a dead letter queue after a configured ' +
        'number of receives is built in. No brokers, no partitions, no rebalancing, effectively ' +
        'unlimited scale.</p>' +
        '<p>What it does not do:</p>' +
        '<ul>' +
        '<li><strong>No replay.</strong> A consumed message is gone. If a bug corrupted data for ' +
        'a day, there is nothing to re-run.</li>' +
        '<li><strong>No ordering</strong> in a standard queue, and no fan-out — one message goes ' +
        'to one consumer. SNS or EventBridge in front provides the fan-out.</li>' +
        '<li><strong>FIFO queues</strong> give ordering and deduplication within a message group ' +
        'at substantially lower throughput.</li>' +
        '</ul>' +
        '<p><strong>Kafka</strong> gives retention and replay, several independent consumer ' +
        'groups over the same stream, ordering per key, and much higher throughput per topic — ' +
        'at the cost of a stateful distributed system to operate, or a managed one to pay for.</p>' +
        '<p>The decision rule: <strong>if the messages are tasks, use a queue. If they are ' +
        'facts, use a log.</strong> A task is done once and forgotten; a fact may interest ' +
        'someone who has not been written yet, and replay is what makes that possible.</p>' +
        '<p>The visibility timeout is the detail worth knowing, because it is the SQS equivalent ' +
        'of <code>max.poll.interval.ms</code>: if processing takes longer than it, the message ' +
        'becomes visible again and is <strong>processed twice concurrently</strong>. Extend the ' +
        'timeout with a heartbeat, or keep processing short — and be idempotent, since SQS is ' +
        'at-least-once by design.</p>',
    referenceLinks: [
        { title: 'AWS SQS — Developer Guide', url: 'https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/welcome.html' }
    ],
    tags: ['cloud', 'messaging', 'architecture'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'managed-relational-databases',
    importance: 'should-know',
    subsection: null,
    question: 'What does a managed database take off your plate, and what does it not?',
    answer:
        '<p><strong>It takes the operations and leaves the engineering</strong>, and confusing ' +
        'the two is how a team ends up surprised.</p>' +
        '<p><strong>Taken care of:</strong> provisioning, automated backups with point-in-time ' +
        'recovery, minor version patching, replication and multi-AZ failover, encryption at rest, ' +
        'monitoring hooks, and read replicas as a configuration change rather than a project.</p>' +
        '<p><strong>Still yours, entirely:</strong></p>' +
        '<ul>' +
        '<li><strong>Schema design, indexes and query performance.</strong> A managed database ' +
        'runs your bad query faithfully and bills you for it.</li>' +
        '<li><strong>Connection limits.</strong> <code>max_connections</code> scales with ' +
        'instance size, and a fleet of pods each with a pool of twenty exhausts it quickly. This ' +
        'is the most common surprise, and the answer is a connection proxy plus honest pool ' +
        'sizing.</li>' +
        '<li><strong>Migrations.</strong> Flyway or Liquibase, and the expand-and-contract ' +
        'discipline, are unchanged.</li>' +
        '<li><strong>Major version upgrades</strong> — still a planned event with a test ' +
        'pass.</li>' +
        '<li><strong>Testing the restore.</strong> Backups you have never restored are not ' +
        'backups, and the fact that they are automatic makes it easier to never check.</li>' +
        '</ul>' +
        '<p>Two things worth knowing about failover, because they are asked as follow-ups: ' +
        '<strong>a multi-AZ failover takes a minute or two and drops every connection</strong>, ' +
        'so the application needs to reconnect cleanly and the pool needs a sensible validation ' +
        'query — an outage rather than a non-event. And <strong>a read replica is ' +
        'asynchronous</strong>, so read-your-writes problems arrive with it, exactly as described ' +
        'in the eventual-consistency question.</p>' +
        '<p>The serverless variants — Aurora Serverless, Neon — scale capacity with load and are ' +
        'genuinely useful for spiky or development workloads. The trade is cold-start latency ' +
        'when scaled down and a cost model that is excellent when idle and not when busy.</p>',
    referenceLinks: [
        { title: 'AWS RDS — Best Practices', url: 'https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_BestPractices.html' }
    ],
    tags: ['cloud', 'databases', 'operations'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'cloud-cost-awareness',
    importance: 'should-know',
    subsection: null,
    question: 'Where does cloud spend actually go?',
    answer:
        '<p>Rarely where people expect. The compute instance is visible and is often not the ' +
        'largest line. The ones that surprise teams:</p>' +
        '<ul>' +
        '<li><strong>Data transfer.</strong> Egress to the internet is charged, and so is ' +
        '<strong>cross-availability-zone</strong> traffic within a region. A chatty ' +
        'microservice architecture spread across three AZs pays for every internal call, and it ' +
        'is invisible in any application metric. Topology-aware routing helps and is off by ' +
        'default.</li>' +
        '<li><strong>NAT gateways.</strong> Charged per hour and per gigabyte processed. A ' +
        'private subnet pulling container images through NAT is a genuinely large bill for ' +
        'something nobody thinks of as a service. VPC endpoints remove most of it.</li>' +
        '<li><strong>Logs.</strong> Ingestion and retention frequently exceed the compute that ' +
        'produced them. DEBUG left on in production, or a per-request log line at high volume, ' +
        'is an expensive habit.</li>' +
        '<li><strong>Idle and over-provisioned capacity.</strong> Instances sized for a peak that ' +
        'happens twice a year, non-production environments running at night and at weekends, ' +
        'orphaned volumes and load balancers.</li>' +
        '<li><strong>Object storage requests</strong>, not just storage — a million small ' +
        'objects costs more in requests than in bytes.</li>' +
        '</ul>' +
        '<p>What an engineer can actually do, which is the point of the question: ' +
        '<strong>tag everything by team and service</strong>, so cost can be attributed rather ' +
        'than argued about; set a budget alert so a runaway is caught in hours; right-size from ' +
        'observed usage rather than from the original estimate; use committed-use discounts for ' +
        'the steady baseline and on-demand for the peak; and shut non-production environments ' +
        'outside working hours, which is usually the single largest easy saving.</p>' +
        '<p>The framing worth offering: <strong>cost is a non-functional requirement like ' +
        'latency.</strong> An architecture that works and costs four times what it should is not ' +
        'a good architecture, and the trade-offs — a cache versus a bigger database, an AZ-local ' +
        'read versus a cross-AZ one — are engineering decisions with a price attached.</p>',
    referenceLinks: [
        { title: 'AWS — Cost Optimization Pillar', url: 'https://docs.aws.amazon.com/wellarchitected/latest/cost-optimization-pillar/welcome.html' }
    ],
    tags: ['cloud', 'cost', 'architecture'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'cloud-agnostic-or-not',
    importance: 'should-know',
    subsection: null,
    question: '"We should stay cloud-agnostic." Do you agree?',
    answer:
        '<p>Usually not, and the useful answer separates two things that get bundled together.</p>' +
        '<p><strong>The case against</strong>: staying agnostic means using the lowest common ' +
        'denominator, so you self-host what the provider would have run for you — your own Kafka ' +
        'instead of a managed stream, your own Postgres instead of a managed one, your own ' +
        'abstraction layer over three storage APIs. That is a permanent tax paid every day, in ' +
        'exchange for optionality that is <strong>almost never exercised</strong>. Most companies ' +
        'never migrate provider, and the ones that do find the abstraction did not cover the ' +
        'parts that actually differed — IAM, networking, and operational tooling.</p>' +
        '<p><strong>The case for</strong>, where it is genuine: a regulatory requirement, a ' +
        'customer contract, a credible acquisition or negotiating position, or a workload that ' +
        'must run on-premises for some customers.</p>' +
        '<p>The position that holds up in both directions: <strong>be deliberate about which ' +
        'couplings you accept, and keep them at the edges.</strong> Concretely:</p>' +
        '<ul>' +
        '<li><strong>Use the managed service.</strong> A managed Postgres speaks Postgres, so the ' +
        'coupling is operational rather than in your code.</li>' +
        '<li><strong>Put an interface in front of the genuinely proprietary bits</strong> — ' +
        'object storage, queueing, secrets — because that is one small adapter per concept and it ' +
        'also makes testing easier, which pays for itself regardless of migration.</li>' +
        '<li><strong>Avoid building the application <em>shape</em> around one provider\'s ' +
        'model.</strong> A service composed of forty Lambdas wired by one vendor\'s event router ' +
        'is not portable in any meaningful sense, whatever the SDK is hidden behind.</li>' +
        '<li><strong>Keep infrastructure as code</strong>, so the thing you would have to rebuild ' +
        'is at least written down.</li>' +
        '</ul>' +
        '<p>And the honest summary: <strong>portability is a cost you pay now for an option you ' +
        'probably will not use.</strong> Sometimes that is the right insurance. It should be ' +
        'priced rather than assumed.</p>',
    referenceLinks: [
        { title: 'AWS Well-Architected Framework', url: 'https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html' }
    ],
    tags: ['cloud', 'architecture', 'judgement'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
}

    ]
};
