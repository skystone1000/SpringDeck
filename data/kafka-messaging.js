/* ==========================================================================
   data/kafka-messaging.js — Kafka & Messaging

   Flat. The topic reads as one sequence — what a partition is, who consumes
   it, what happens when that goes wrong — and every attempt to split it puts
   a heading between two halves of the same explanation.

   The questions cluster around the three things that actually break in
   production: a rebalance triggered by slow processing, offsets committed
   before the work was done, and a consumer that cannot keep up. Those are
   what an interviewer is checking for, because everyone can recite "topics
   and partitions".

   ONE GLOBAL PER FILE.
   ========================================================================== */

const kafkaMessagingData = {
    id: 'kafka-messaging',
    title: 'Kafka & Messaging',
    subsections: null,
    keyTopics: [
        'topics and partitions', 'consumer groups', 'offset management', 'rebalancing',
        'ordering guarantees', 'at-least-once vs exactly-once', 'idempotent producer',
        'transactional producer', 'retry and DLQ', 'Kafka vs RabbitMQ', 'consumer lag',
        'poison messages'
    ],
    questions: [

{
    id: 'partitions-and-ordering',
    importance: 'must-know',
    subsection: null,
    question: 'What ordering guarantee does Kafka give you?',
    answer:
        '<p><strong>Order is guaranteed within a partition, and nowhere else.</strong> Messages ' +
        'in one partition are appended to an immutable log and read back in that order, forever. ' +
        'Across partitions there is no ordering at all, and there cannot be — they are on ' +
        'different brokers being read by different consumers.</p>' +
        '<p>Which makes the <strong>partition key</strong> the most consequential design decision ' +
        'in a Kafka system. The producer hashes the key to choose a partition, so all messages ' +
        'with the same key land in the same partition and are therefore ordered relative to each ' +
        'other. Choose the key by asking <em>what must be processed in order</em>: usually an ' +
        'entity id — the account, the order, the device.</p>' +
        '<p>Three things follow that people meet later:</p>' +
        '<ul>' +
        '<li><strong>A null key means round-robin</strong>, so those messages have no ordering ' +
        'relationship with anything. Fine for independent events, wrong for a change stream.</li>' +
        '<li><strong>Adding partitions breaks existing ordering.</strong> The hash is over the ' +
        'current partition count, so a key that mapped to partition 3 may now map to 7, and ' +
        'messages for one entity exist in both while the old ones drain. There is no clean way ' +
        'round this, which is why partition count is worth over-provisioning at creation.</li>' +
        '<li><strong>A hot key is a hot partition.</strong> One enormous customer keyed by ' +
        'customer id sends all their traffic to one partition, and that partition\'s consumer ' +
        'becomes the bottleneck while the others idle. The fix is a composite key, and it costs ' +
        'you the ordering you were trying to keep.</li>' +
        '</ul>' +
        '<p>The design instinct worth showing: <strong>ask whether you need global ordering at ' +
        'all.</strong> Usually you need ordering per entity, which partitions give you, and ' +
        'insisting on more forces a single partition and therefore a single consumer.</p>',
    referenceLinks: [
        { title: 'Kafka — Design: Message Delivery Semantics', url: 'https://kafka.apache.org/documentation/#design' }
    ],
    tags: ['kafka', 'partitions', 'ordering', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'consumer-groups-and-parallelism',
    importance: 'must-know',
    subsection: null,
    question: 'How does a consumer group work, and what limits how fast you can consume?',
    answer:
        '<p>A consumer group is a set of consumers that <strong>share</strong> a topic\'s ' +
        'partitions. Each partition is assigned to <strong>exactly one consumer in the ' +
        'group</strong>, so every message is processed once per group. Add a second group and it ' +
        'gets its own copy of everything, with its own offsets — which is how one topic feeds ' +
        'five unrelated consumers.</p>' +
        '<p>The consequence that answers the second half: <strong>the partition count is the ' +
        'maximum parallelism.</strong> Ten partitions and twenty consumers means ten consumers ' +
        'are idle. Scaling out past the partition count does nothing at all, and that surprises ' +
        'people during an incident when adding pods changes nothing.</p>' +
        '<p>So capacity planning starts at the topic: <strong>partitions must be provisioned for ' +
        'the peak consumer parallelism you will ever want</strong>, because adding them later ' +
        'breaks key ordering.</p>' +
        '<p>What partitions cost, so the answer is not "use a thousand": each one is files and ' +
        'memory on every replica, more open file handles, more work in a rebalance, and more ' +
        'end-to-end latency for a producer batching across them. Hundreds per topic is normal; ' +
        'tens of thousands per cluster is where operators start to feel it.</p>' +
        '<p>One more lever worth naming: <strong>concurrency within a consumer</strong>. Spring ' +
        'Kafka\'s <code>concurrency</code> property starts several listener threads in one ' +
        'application instance, each taking partitions — which raises throughput without more ' +
        'pods, and is bounded by the same partition count.</p>',
    referenceLinks: [
        { title: 'Spring for Apache Kafka — Reference', url: 'https://docs.spring.io/spring-kafka/reference/' }
    ],
    tags: ['kafka', 'consumers', 'scaling', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'offset-commit-strategies',
    importance: 'must-know',
    subsection: null,
    question: 'When should a consumer commit its offset, and what goes wrong if it gets it wrong?',
    answer:
        '<p>The offset is a bookmark saying "this group has processed up to here", stored in ' +
        'Kafka itself. <strong>When you commit decides whether you lose messages or duplicate ' +
        'them</strong>, and there is no option that does neither.</p>' +
        '<ul>' +
        '<li><strong>Commit after processing</strong> — at-least-once. A crash between processing ' +
        'and committing means the message is redelivered. <strong>This is the right default</strong>, ' +
        'paired with an idempotent consumer.</li>' +
        '<li><strong>Commit before processing</strong> — at-most-once. A crash means the message ' +
        'is never processed and nothing indicates it. Almost never what you want.</li>' +
        '</ul>' +
        '<p><strong>The auto-commit trap.</strong> <code>enable.auto.commit=true</code> commits ' +
        'periodically on a timer, during <code>poll()</code>, for everything the previous poll ' +
        'returned. So a batch can be committed while your code is still halfway through ' +
        'processing it — and a crash then loses the remainder silently. It looks like ' +
        'at-least-once and it is not. Spring Boot disables it and uses ' +
        '<code>AckMode.BATCH</code>, committing after the listener returns.</p>' +
        '<p>The Spring ack modes worth knowing: <code>BATCH</code> (default, after the whole ' +
        'poll), <code>RECORD</code> (after each message — safest, slowest), and ' +
        '<code>MANUAL_IMMEDIATE</code> with an <code>Acknowledgment</code> parameter, for when ' +
        'the commit point is a business decision.</p>' +
        '<p>The point that ties it together: <strong>the offset commit and the side effect are ' +
        'two writes to two systems</strong> — the dual-write problem again. Nothing makes them ' +
        'atomic, so the consumer must be idempotent, and every argument about commit strategy is ' +
        'really an argument about how many duplicates you are willing to handle.</p>',
    referenceLinks: [
        { title: 'Spring for Apache Kafka — Committing Offsets', url: 'https://docs.spring.io/spring-kafka/reference/kafka/receiving-messages/message-listener-container.html' }
    ],
    tags: ['kafka', 'offsets', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'rebalancing-and-slow-processing',
    importance: 'must-know',
    subsection: null,
    question: 'What triggers a rebalance, and why does slow processing cause an infinite loop of them?',
    answer:
        '<p>A rebalance is Kafka reassigning partitions across a group. It is triggered by a ' +
        'consumer joining, a consumer leaving, a consumer being <em>declared</em> dead, or the ' +
        'partition count changing.</p>' +
        '<p>The third one is where the trouble is, and the mechanism is worth knowing exactly ' +
        'because it is one of the most common Kafka incidents.</p>' +
        '<p>There are two independent liveness checks:</p>' +
        '<ul>' +
        '<li><strong><code>session.timeout.ms</code></strong> — a background heartbeat thread. ' +
        'Detects a process that has actually died.</li>' +
        '<li><strong><code>max.poll.interval.ms</code></strong> — the maximum time between calls ' +
        'to <code>poll()</code>. Default five minutes.</li>' +
        '</ul>' +
        '<p>So a consumer whose processing takes longer than <code>max.poll.interval.ms</code> ' +
        'is <strong>alive and heartbeating but declared dead anyway</strong>. Its partitions are ' +
        'reassigned; it finishes, tries to commit, and is told it no longer owns the partition. ' +
        'The work is redone by whoever got the partition — who is equally slow, and also gets ' +
        'evicted. <strong>The group makes no progress and reprocesses the same records ' +
        'forever</strong>, with duplicate side effects the whole time.</p>' +
        '<p>The fixes, in order of preference: <strong>make processing faster</strong>; reduce ' +
        '<code>max.poll.records</code> so each batch is smaller; raise ' +
        '<code>max.poll.interval.ms</code> deliberately; or hand long work to a separate executor ' +
        'and manage the offset yourself, which is the general answer for anything genuinely ' +
        'slow.</p>' +
        '<p>Two things that reduce rebalance pain generally: <strong>cooperative sticky ' +
        'assignment</strong>, which reassigns only the partitions that must move instead of ' +
        'stopping the world; and <strong>static membership</strong> via ' +
        '<code>group.instance.id</code>, so a rolling restart does not trigger a rebalance per ' +
        'pod.</p>',
    referenceLinks: [
        { title: 'Kafka — Consumer Configs', url: 'https://kafka.apache.org/documentation/#consumerconfigs' }
    ],
    tags: ['kafka', 'rebalancing', 'incidents', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'producer-acks-and-durability',
    importance: 'should-know',
    subsection: null,
    question: 'What does acks=all actually guarantee?',
    answer:
        '<p>Less than the name suggests on its own, and that is the point of the question.</p>' +
        '<p>The three settings:</p>' +
        '<ul>' +
        '<li><strong><code>acks=0</code></strong> — the producer does not wait. Fastest, and ' +
        'messages are lost silently.</li>' +
        '<li><strong><code>acks=1</code></strong> — the leader has written it. If the leader dies ' +
        'before a follower replicates, the message is gone.</li>' +
        '<li><strong><code>acks=all</code></strong> — every in-sync replica has it.</li>' +
        '</ul>' +
        '<p>The catch is what "in sync" means. If replicas fall behind they are removed from the ' +
        'in-sync replica set, and <code>acks=all</code> with <strong>one</strong> remaining ISR is ' +
        'exactly <code>acks=1</code> — a single failure loses data while the producer believes it ' +
        'is durable.</p>' +
        '<p>So the guarantee needs two settings together: <strong><code>acks=all</code> plus ' +
        '<code>min.insync.replicas=2</code> on a topic with replication factor 3.</strong> Now a ' +
        'write is refused outright unless two replicas have it, which converts silent data loss ' +
        'into a visible producer error — the right trade.</p>' +
        '<p>Two related settings worth knowing. <code>enable.idempotence=true</code> — the ' +
        'default since Kafka 3.0 — stops a producer retry from writing a duplicate, using a ' +
        'producer id and per-partition sequence numbers. And ' +
        '<code>unclean.leader.election.enable=false</code>, the default, prevents an out-of-date ' +
        'replica being promoted to leader and silently truncating committed messages.</p>' +
        '<p>The framing to offer: <strong>durability is a product of the producer setting and the ' +
        'topic configuration, and either alone is a false sense of security.</strong></p>',
    referenceLinks: [
        { title: 'Kafka — Producer Configs', url: 'https://kafka.apache.org/documentation/#producerconfigs' }
    ],
    tags: ['kafka', 'durability', 'producers'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'retry-and-dead-letter-topics',
    importance: 'must-know',
    subsection: null,
    question: 'A message fails to process. What should happen?',
    answer:
        '<p>First, decide what kind of failure it is, because the two need opposite treatment.</p>' +
        '<ul>' +
        '<li><strong>Transient</strong> — a downstream timeout, a deadlock, a rate limit. Retry ' +
        'is right and will eventually succeed.</li>' +
        '<li><strong>Permanent</strong> — a malformed payload, a validation failure, a missing ' +
        'reference. Retrying is guaranteed to fail again, forever.</li>' +
        '</ul>' +
        '<p>A consumer that retries everything indefinitely turns a permanent failure into a ' +
        '<strong>poison message</strong>: because offsets are sequential and this one never ' +
        'commits, the entire partition stops. One bad record blocks every message behind it, and ' +
        'the symptom is a partition whose lag rises forever while the others are fine.</p>' +
        '<p>The standard structure:</p>' +
        '<ul>' +
        '<li><strong>A bounded number of local retries with backoff</strong> for transient ' +
        'failures. Spring Kafka\'s <code>DefaultErrorHandler</code> with a ' +
        '<code>BackOff</code>.</li>' +
        '<li><strong>Classify exceptions</strong> — <code>addNotRetryableExceptions</code> sends ' +
        'a deserialisation or validation failure straight past the retries.</li>' +
        '<li><strong>A dead letter topic</strong> after that, via ' +
        '<code>DeadLetterPublishingRecoverer</code>. The message and its failure reason are ' +
        'published elsewhere, the offset is committed, and the partition moves on.</li>' +
        '<li><strong>Alert on the DLQ, and mean it.</strong> A dead letter topic nobody watches ' +
        'is a way of deleting messages slowly. Its depth belongs on a dashboard with a threshold ' +
        'of zero.</li>' +
        '</ul>' +
        '<p>The refinement worth mentioning: <strong>blocking retries hold up the partition ' +
        'too.</strong> Three retries with a thirty-second backoff is ninety seconds of nothing ' +
        'behind it. <code>@RetryableTopic</code> implements <em>non-blocking</em> retry by ' +
        'republishing to separate delay topics, so the main partition keeps flowing — at the cost ' +
        'of losing ordering for the retried message, which is a trade to make deliberately.</p>',
    referenceLinks: [
        { title: 'Spring for Apache Kafka — Error Handling', url: 'https://docs.spring.io/spring-kafka/reference/kafka/annotation-error-handling.html' }
    ],
    tags: ['kafka', 'error-handling', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'consumer-lag',
    importance: 'must-know',
    subsection: null,
    question: 'What is consumer lag, and what do you do when it rises?',
    answer:
        '<p>The difference between the last offset written to a partition and the last offset ' +
        'committed by a consumer group — <strong>how many messages behind you are</strong>. It is ' +
        'the single most important Kafka metric, and the one to name if asked what you would ' +
        'monitor.</p>' +
        '<p>Why it matters more than throughput: lag is the only number that tells you whether ' +
        'consumption is <em>keeping up with production</em>. Throughput can be high and rising ' +
        'while you fall further behind.</p>' +
        '<p>Read the shape, not the value:</p>' +
        '<ul>' +
        '<li><strong>Steady and small</strong> — healthy.</li>' +
        '<li><strong>Spiky, returning to zero</strong> — bursty producers, and consumers catching ' +
        'up. Fine.</li>' +
        '<li><strong>Rising steadily</strong> — consumers are permanently slower than producers. ' +
        'This never fixes itself.</li>' +
        '<li><strong>Rising on one partition only</strong> — a hot key, or a poison message ' +
        'blocking that partition. The per-partition view is what makes this diagnosable and the ' +
        'aggregate hides it.</li>' +
        '<li><strong>Sawtooth with a long period</strong> — repeated rebalances reprocessing the ' +
        'same records.</li>' +
        '</ul>' +
        '<p>What to do, in order: check whether it is <strong>one partition or all</strong>; if ' +
        'all, add consumers <strong>up to the partition count</strong> and no further; if you are ' +
        'already at the limit, the answer is faster processing or more partitions. Batching ' +
        'downstream writes and raising <code>max.poll.records</code> often buys more than another ' +
        'pod.</p>' +
        '<p>One more thing worth stating: <strong>alert on lag in time, not in messages.</strong> ' +
        '"Fifty thousand messages behind" means nothing without a rate; "four minutes behind" is ' +
        'a number a product owner can have an opinion about.</p>',
    referenceLinks: [
        { title: 'Kafka — Monitoring', url: 'https://kafka.apache.org/documentation/#monitoring' }
    ],
    tags: ['kafka', 'monitoring', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'kafka-versus-rabbitmq',
    importance: 'must-know',
    subsection: null,
    question: 'Kafka or RabbitMQ — what is the actual difference?',
    answer:
        '<p><strong>Kafka is a log; RabbitMQ is a queue.</strong> Nearly every practical ' +
        'difference falls out of that one sentence, and it is the right place to start.</p>' +
        '<p>In a <strong>log</strong>, messages are appended to a file and retained for a ' +
        'configured period. Consuming does not remove anything — a consumer holds a position. So ' +
        'you get <strong>replay</strong>: a new consumer can read from the beginning, and a ' +
        'consumer with a bug can be reset and re-run. That is the property that makes Kafka an ' +
        'event store as well as a transport, and it is what RabbitMQ fundamentally does not ' +
        'do.</p>' +
        '<p>In a <strong>queue</strong>, a message is delivered and acknowledged and then it is ' +
        'gone. In exchange you get things a log cannot express: <strong>per-message ' +
        'acknowledgement</strong> in any order, so one slow message does not block others; ' +
        '<strong>rich routing</strong> through exchanges and binding keys; priorities; per-message ' +
        'TTL; and delayed delivery.</p>' +
        '<p>The decision:</p>' +
        '<ul>' +
        '<li><strong>Kafka</strong> — event streaming, high throughput, several independent ' +
        'consumers of the same stream, replay, ordering per key, retaining history.</li>' +
        '<li><strong>RabbitMQ</strong> — task distribution to workers, complex routing, ' +
        'per-message control, request/reply, lower operational weight for modest volume.</li>' +
        '</ul>' +
        '<p>The operational asymmetry is worth stating too: <strong>a slow consumer is a Kafka ' +
        'monitoring problem and a RabbitMQ memory problem.</strong> Kafka messages are on disk ' +
        'either way, so lag rises and nothing breaks; RabbitMQ queues grow in memory and a broker ' +
        'under memory pressure blocks its producers.</p>' +
        '<p>One version note: Kafka no longer needs ZooKeeper. KRaft is the built-in consensus ' +
        'protocol, production-ready since 3.3, and ZooKeeper support was <strong>removed in Kafka ' +
        '4.0</strong> — so "Kafka needs a ZooKeeper ensemble" is now a dated answer.</p>',
    referenceLinks: [
        { title: 'Kafka — Introduction', url: 'https://kafka.apache.org/documentation/#introduction' },
        { title: 'RabbitMQ — Tutorials', url: 'https://www.rabbitmq.com/tutorials' }
    ],
    tags: ['kafka', 'rabbitmq', 'comparison', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'retention-and-log-compaction',
    importance: 'should-know',
    subsection: null,
    question: 'What is log compaction, and when would you use it instead of time-based retention?',
    answer:
        '<p>Two cleanup policies, answering two different questions about what a topic ' +
        '<em>is</em>.</p>' +
        '<ul>' +
        '<li><strong><code>cleanup.policy=delete</code></strong> — the default. Segments older ' +
        'than <code>retention.ms</code>, or beyond <code>retention.bytes</code>, are deleted. The ' +
        'topic is a stream of <strong>events</strong>, and old events stop mattering.</li>' +
        '<li><strong><code>cleanup.policy=compact</code></strong> — Kafka retains ' +
        '<strong>at least the latest value for every key</strong>, forever, and removes ' +
        'superseded ones in the background. The topic is a <strong>changelog</strong>, and ' +
        'replaying it from the beginning reconstructs current state.</li>' +
        '</ul>' +
        '<p>Compaction is what makes a topic usable as a table. A new consumer reads from offset ' +
        'zero and ends up with one entry per key — the current state of every customer, every ' +
        'price, every feature flag — without the history being unbounded. Kafka Streams state ' +
        'stores and Connect offsets are built on this.</p>' +
        '<p>Two details that matter in practice:</p>' +
        '<ul>' +
        '<li><strong>A null value is a tombstone.</strong> It marks the key deleted and is itself ' +
        'removed after <code>delete.retention.ms</code> — long enough for consumers to see it. ' +
        'Producing null by accident deletes a key, which is a genuinely surprising failure the ' +
        'first time.</li>' +
        '<li><strong>Compaction is not immediate and not exact.</strong> It runs in the ' +
        'background and never touches the active segment, so a consumer can still see several ' +
        'values for one key. Code must tolerate that.</li>' +
        '</ul>' +
        '<p>Also available: <code>compact,delete</code> together, for a changelog you also want ' +
        'aged out. And a key is mandatory — compaction on a topic with null keys does ' +
        'nothing.</p>',
    referenceLinks: [
        { title: 'Kafka — Log Compaction', url: 'https://kafka.apache.org/documentation/#compaction' }
    ],
    tags: ['kafka', 'retention', 'event-sourcing'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'schema-registry-and-message-contracts',
    importance: 'should-know',
    subsection: null,
    question: 'How do you evolve the shape of a message without breaking consumers?',
    answer:
        '<p>With a <strong>schema registry</strong> and an enforced compatibility mode. The ' +
        'problem is that a topic is a contract between one producer and consumers it has never ' +
        'met — some of which are running an old deployment, and one of which is reading messages ' +
        'from six months ago.</p>' +
        '<p>The registry holds versioned schemas — Avro, Protobuf or JSON Schema. The producer ' +
        'registers the schema and writes a small id into each message rather than the schema ' +
        'itself; the consumer reads the id and fetches the writer\'s schema to decode with. Two ' +
        'benefits: messages stay small, and <strong>the registry can refuse an incompatible ' +
        'schema at registration time</strong> — which turns a production incident into a failed ' +
        'deploy.</p>' +
        '<p>The compatibility modes, which is the part worth knowing:</p>' +
        '<ul>' +
        '<li><strong>BACKWARD</strong> (the default) — a new schema can read old data. So you may ' +
        'delete a field or add an optional one with a default. <strong>Consumers upgrade ' +
        'first.</strong></li>' +
        '<li><strong>FORWARD</strong> — old schema can read new data. Add a field, delete an ' +
        'optional one. <strong>Producers upgrade first.</strong></li>' +
        '<li><strong>FULL</strong> — both. Only optional fields with defaults, either way.</li>' +
        '<li><strong>NONE</strong> — no checking, which is the setting people choose during an ' +
        'incident and never change back.</li>' +
        '</ul>' +
        '<p>The thing to say that shows this is not theory: <strong>the compatibility mode ' +
        'dictates your deployment order</strong>, and getting that backwards is how a schema ' +
        'change that passed every check still breaks production. Under BACKWARD you must roll out ' +
        'consumers before producers; under FORWARD the reverse.</p>' +
        '<p>Without a registry the equivalent discipline is: only ever add optional fields, never ' +
        'reuse a name or a field number, and tolerate unknown fields on read — which is exactly ' +
        'what Jackson\'s <code>FAIL_ON_UNKNOWN_PROPERTIES=false</code> buys you and why it should ' +
        'be off for message consumers.</p>',
    referenceLinks: [
        { title: 'Confluent — Schema Evolution and Compatibility', url: 'https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html' }
    ],
    tags: ['kafka', 'schemas', 'compatibility'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'idempotent-consumer-implementation',
    importance: 'should-know',
    subsection: null,
    question: 'How do you actually make a Kafka consumer idempotent?',
    answer:
        '<p>Every discussion of delivery guarantees ends here, so it is worth having a concrete ' +
        'answer rather than the word.</p>' +
        '<p>Three approaches, in increasing order of generality:</p>' +
        '<p><strong>1. Make the operation naturally idempotent.</strong> The best answer when ' +
        'available. <code>UPDATE account SET balance = 100</code> can be applied twice; ' +
        '<code>balance = balance - 10</code> cannot. An upsert keyed on a business id is ' +
        'idempotent; an insert is not. A great deal of consumer logic can be rewritten this way ' +
        'and then nothing else is needed.</p>' +
        '<p><strong>2. Deduplicate on a message id.</strong> Keep a <code>processed_messages</code> ' +
        'table keyed on something stable — the event id from the payload, or ' +
        '<code>topic-partition-offset</code>. Insert it <strong>in the same database transaction ' +
        'as the effect</strong>, and let the unique constraint reject the duplicate. The ' +
        '"same transaction" is the whole trick: checking a cache first and then doing the work is ' +
        'a race that fires exactly when two copies arrive together.</p>' +
        '<p><strong>3. Version or sequence check.</strong> If the event carries a version, apply ' +
        'it only when it is newer than what you hold. This also handles <em>out-of-order</em> ' +
        'delivery, which deduplication does not — worth having when messages for one entity can ' +
        'arrive across partitions.</p>' +
        '<p>Two practical notes. <strong>Bound the dedup table\'s growth</strong> with a ' +
        'retention window matched to how long a redelivery could plausibly take. And ' +
        '<strong>idempotency has to cover side effects outside the database too</strong> — a ' +
        'consumer that sends an email is not made idempotent by a dedup row committed after the ' +
        'email went out.</p>',
    referenceLinks: [
        { title: 'microservices.io — Idempotent Consumer', url: 'https://microservices.io/patterns/communication-style/idempotent-consumer.html' }
    ],
    tags: ['kafka', 'idempotency', 'consumers'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'when-not-to-use-a-broker',
    importance: 'should-know',
    subsection: null,
    question: 'When is a message broker the wrong answer?',
    answer:
        '<p>More often than the enthusiasm for event-driven architecture suggests, and being able ' +
        'to say so is worth more than knowing another broker feature.</p>' +
        '<ul>' +
        '<li><strong>When the caller needs the answer.</strong> Request/reply over a broker is ' +
        'possible and it is a synchronous call with extra hops, extra failure modes and a ' +
        'correlation id you now maintain. Just make the HTTP call.</li>' +
        '<li><strong>When you have one producer and one consumer, owned by one team.</strong> The ' +
        'decoupling a broker provides has nobody to decouple.</li>' +
        '<li><strong>When the volume is small and a database table would do.</strong> A ' +
        '<code>jobs</code> table with a status column, polled every few seconds, is a legitimate ' +
        'queue for modest throughput — and it comes with transactions, ad-hoc queries, and no new ' +
        'infrastructure to run. Postgres <code>SELECT ... FOR UPDATE SKIP LOCKED</code> makes it ' +
        'genuinely concurrent.</li>' +
        '<li><strong>When you need a strict global ordering</strong> across everything. That ' +
        'means one partition, one consumer, and no scaling.</li>' +
        '<li><strong>When the team cannot operate it.</strong> A broker is a stateful ' +
        'distributed system: rebalances, disk, retention, upgrades, and a whole new class of ' +
        'incident. Managed services reduce this and do not remove it.</li>' +
        '</ul>' +
        '<p>And the cost that is easy to overlook: <strong>asynchronous processing makes the ' +
        'system harder to reason about for everybody, forever.</strong> There is no stack trace ' +
        'across a broker, an error surfaces somewhere else at some other time, and testing needs ' +
        'infrastructure. That is a fair price for real decoupling and a poor one for a message ' +
        'that goes to a single consumer that could have been called directly.</p>',
    referenceLinks: [
        { title: 'PostgreSQL 16 — SELECT FOR UPDATE SKIP LOCKED', url: 'https://www.postgresql.org/docs/16/sql-select.html' }
    ],
    tags: ['messaging', 'judgement', 'architecture'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
}

    ]
};
