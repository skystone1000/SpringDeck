/* ==========================================================================
   data/theory/messaging-foundations.js — module 67 in the reading path

   Seven chapters, and the plan's tagline is the thesis: RabbitMQ and Kafka
   are not the same shape, and the difference is the answer. Almost every
   "which broker" question is really a question about whether the messages
   are consumed-and-gone or retained-and-replayable, and everything else
   follows from that one distinction.

   Two chapters are correctives. When not to use a broker, because
   asynchronous messaging is adopted reflexively and it buys decoupling with
   traceability; and back-pressure, because an unbounded queue is a failure
   mode dressed as a buffer.
   ========================================================================== */

const messagingFoundationsModule = {
    id: 'messaging-foundations',
    trackId: 'distributed',
    order: 67,
    title: 'Queues and Logs',
    tagline: 'RabbitMQ and Kafka are not the same shape, and the difference is the answer.',
    estimatedMinutes: 35,
    prerequisites: ['service-boundaries'],
    docHub: { title: 'Apache Kafka — Design', url: 'https://kafka.apache.org/documentation/#design' },

    chapters: [
        {
            id: 'queue-vs-log',
            title: 'A Queue Against a Log',
            importance: 'must-know',
            summary: 'A queue holds messages until somebody takes them, and taking removes them. A log holds an ordered, immutable sequence that consumers read at their own position, and reading removes nothing.',
            interviewAngle: 'The single distinction that answers most broker questions. Replay, multiple independent consumers and retention are all consequences of it.',
            buildsOn: [],
            blocks: [
                {
                    type: 'comparison',
                    title: 'Two data structures, and everything else follows',
                    left: 'Queue (RabbitMQ, SQS)',
                    right: 'Log (Kafka, Pulsar)',
                    rows: [
                        { aspect: 'Consuming a message', left: '<strong>Removes it</strong>', right: '<strong>Advances your offset. Nothing is removed.</strong>' },
                        { aspect: 'Retention', left: 'Until acknowledged', right: 'A configured time or size — days, typically' },
                        { aspect: 'Replay', left: 'Not possible; it is gone', right: 'Reset the offset and read it again' },
                        { aspect: 'A second, unrelated consumer', left: 'Needs a second queue and a fan-out exchange', right: 'A new consumer group. The producer is unaffected.' },
                        { aspect: 'Ordering', left: 'Per queue, and lost with competing consumers', right: 'Per partition, strictly, always' },
                        { aspect: 'Per-message operations', left: 'Rich — TTL, priority, delay, individual redelivery', right: 'Minimal. The log is append-only.' },
                        { aspect: 'Throughput ceiling', left: 'High', right: 'Very high — sequential disk writes and the page cache' }
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>The consequence worth stating explicitly is what it does to <em>coupling</em>. With a queue, adding a consumer is a change to the broker topology that someone must make, and the producer\'s throughput is affected by how many queues its exchange fans out to. With a log, a new consumer group is a decision made entirely by the new consumer — the producer does not know, does not care, and is not slowed down.</p><p>That is why a log suits event-driven architecture and a queue suits work distribution. One is publishing facts for an unknown audience; the other is handing out tasks to a known set of workers.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The replay property is worth more than it first appears. It means a consumer with a bug can be fixed and re-run over the same data; a new read model can be built from history rather than from a migration; and an incident can be investigated by reading what actually arrived. A queue offers none of that, and its absence is usually discovered at the worst possible moment.</p>'
                }
            ],
            docs: [
                { title: 'Kafka — Design', url: 'https://kafka.apache.org/documentation/#design', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'kafka-messaging', questionId: 'kafka-versus-rabbitmq' }
            ]
        },

        {
            id: 'point-to-point-vs-pubsub',
            title: 'Point-to-Point and Publish-Subscribe',
            importance: 'must-know',
            summary: 'One message to exactly one consumer, or one message to every interested consumer. Both brokers can do both; they differ in which one is natural.',
            interviewAngle: 'The vocabulary question underneath "how do you scale consumers". Competing consumers scale a single logical consumer; a second group is a second audience.',
            buildsOn: ['queue-vs-log'],
            blocks: [
                {
                    type: 'types',
                    title: 'The two patterns, and how each broker expresses them',
                    items: [
                        { name: 'Point-to-point — competing consumers', html: '<p>Several instances read one queue and each message goes to exactly one of them. This is horizontal scaling of one logical consumer. In Kafka it is several instances in the <strong>same consumer group</strong>.</p>' },
                        { name: 'Publish-subscribe — fan-out', html: '<p>Each interested party receives its own copy. In RabbitMQ, a fanout or topic exchange bound to several queues. In Kafka, several <strong>consumer groups</strong> on the same topic.</p>' },
                        { name: 'The combination, which is what real systems use', html: '<p>Several groups, each with several instances: fan-out between groups, competing consumers within one. Kafka expresses this with one concept; RabbitMQ needs an exchange plus a queue per subscriber.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Adding instances to one consumer group does not process each message more than once, and adding a group does not share the load.</strong> That sounds obvious and it is the mistake behind most "why is this event handled twice" and "why did adding pods not help" reports. Scaling within a group divides the partitions; adding a group duplicates the delivery. Two different operations, and the configuration for them differs by one string.</p>'
                }
            ],
            docs: [
                { title: 'RabbitMQ — Exchanges', url: 'https://www.rabbitmq.com/tutorials/amqp-concepts', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'kafka-messaging', questionId: 'consumer-groups-and-parallelism' }
            ]
        },

        {
            id: 'rabbitmq-model',
            title: 'The RabbitMQ Model',
            importance: 'should-know',
            summary: 'Publishers send to an exchange, bindings route to queues, consumers read from queues. The routing lives in the broker, and that is both its strength and its coupling.',
            interviewAngle: 'Knowing that a publisher never names a queue is the structural insight, and it is what makes RabbitMQ routing flexible without the producer changing.',
            buildsOn: ['point-to-point-vs-pubsub'],
            blocks: [
                {
                    type: 'diagram',
                    diagramType: 'flowchart',
                    title: 'Exchange, binding, queue',
                    diagramConfig: {
                        nodes: [
                            { id: 'pub',  label: 'Publisher\nrouting key\norder.placed.uk', kind: 'start' },
                            { id: 'ex',   label: 'Topic exchange\norders',                  kind: 'decision' },
                            { id: 'q1',   label: 'Queue\nfulfilment',                       kind: 'process' },
                            { id: 'q2',   label: 'Queue\nanalytics',                        kind: 'process' },
                            { id: 'q3',   label: 'Queue\nuk-tax',                           kind: 'process' },
                            { id: 'c1',   label: 'Consumers',                               kind: 'end' }
                        ],
                        edges: [
                            { from: 'pub', to: 'ex' },
                            { from: 'ex',  to: 'q1', label: 'binding order.placed.*' },
                            { from: 'ex',  to: 'q2', label: 'binding order.#' },
                            { from: 'ex',  to: 'q3', label: 'binding *.*.uk' },
                            { from: 'q1',  to: 'c1' },
                            { from: 'q2',  to: 'c1' },
                            { from: 'q3',  to: 'c1' }
                        ]
                    }
                },
                {
                    type: 'table',
                    title: 'The exchange types',
                    headers: ['Type', 'Routes by', 'Use for'],
                    rows: [
                        ['<code>direct</code>', 'Exact routing-key match', 'Work queues; simple task routing'],
                        ['<code>topic</code>', 'Pattern with <code>*</code> and <code>#</code> wildcards', '<strong>The usual choice.</strong> Event routing by hierarchy'],
                        ['<code>fanout</code>', 'Everything, to every bound queue', 'Broadcast; routing key ignored'],
                        ['<code>headers</code>', 'Header values rather than the routing key', 'Rare; slower']
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>The publisher names an <strong>exchange</strong> and a routing key, never a queue. So a new subscriber declares a queue and a binding, and starts receiving — with no change to the publisher and no redeployment. That is genuinely good design, and it also means the routing topology is operational configuration living in the broker rather than in any repository, which is a real drawback: the answer to "who receives this event" is not in the code.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The features a log does not have are the reason to choose RabbitMQ, and they are worth naming: <strong>per-message TTL</strong>, <strong>priority queues</strong>, <strong>delayed delivery</strong>, and <strong>individual message redelivery or rejection</strong>. A job scheduler, a retry-with-delay pipeline or a work queue with priorities is a much better fit for a queue broker than for a log, and reaching for Kafka there means reimplementing all four.</p>'
                }
            ],
            docs: [
                { title: 'RabbitMQ — AMQP 0-9-1 Concepts', url: 'https://www.rabbitmq.com/tutorials/amqp-concepts', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'kafka-messaging', questionId: 'kafka-versus-rabbitmq' }
            ]
        },

        {
            id: 'kafka-model',
            title: 'The Kafka Model',
            importance: 'must-know',
            summary: 'A topic is split into partitions; each partition is an ordered, append-only log on disk. Producers choose a partition, consumers own partitions, and ordering exists only within one.',
            interviewAngle: 'Partitions are the unit of everything — ordering, parallelism, retention and rebalancing — and saying that once explains four separate behaviours.',
            buildsOn: ['rabbitmq-model'],
            blocks: [
                {
                    type: 'diagram',
                    diagramType: 'flowchart',
                    title: 'Topic, partitions, and two independent consumer groups',
                    diagramConfig: {
                        nodes: [
                            { id: 'prod', label: 'Producer\nkey = customerId', kind: 'start' },
                            { id: 'p0',   label: 'Partition 0\nordered log',   kind: 'process' },
                            { id: 'p1',   label: 'Partition 1\nordered log',   kind: 'process' },
                            { id: 'p2',   label: 'Partition 2\nordered log',   kind: 'process' },
                            { id: 'gA',   label: 'Group: fulfilment\n2 instances', kind: 'end' },
                            { id: 'gB',   label: 'Group: analytics\n1 instance',  kind: 'end' }
                        ],
                        edges: [
                            { from: 'prod', to: 'p0', label: 'hash(key) % 3' },
                            { from: 'prod', to: 'p1' },
                            { from: 'prod', to: 'p2' },
                            { from: 'p0',   to: 'gA', label: 'instance 1' },
                            { from: 'p1',   to: 'gA', label: 'instance 1' },
                            { from: 'p2',   to: 'gA', label: 'instance 2' },
                            { from: 'p0',   to: 'gB', label: 'all three' },
                            { from: 'p1',   to: 'gB' },
                            { from: 'p2',   to: 'gB' }
                        ]
                    }
                },
                {
                    type: 'types',
                    title: 'What a partition is the unit of',
                    items: [
                        { name: 'Ordering', html: '<p>Messages within a partition are strictly ordered. Across partitions there is <strong>no</strong> ordering guarantee at all, ever.</p>' },
                        { name: 'Parallelism', html: '<p>One partition is consumed by at most one instance in a group, so <strong>partition count is the maximum useful consumer count</strong>. Six pods on three partitions leaves three idle.</p>' },
                        { name: 'Replication', html: '<p>Each partition has one leader and N-1 followers. Durability is configured per topic as a replication factor.</p>' },
                        { name: 'Retention', html: '<p>Segments are deleted per partition when they age out or the size limit is reached.</p>' },
                        { name: 'Offsets', html: '<p>A consumer group\'s position is one offset per partition, committed back to Kafka.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>Partition count is the one Kafka decision that is genuinely hard to change: increasing it changes which partition a key hashes to, so ordering for existing keys is broken from that moment on. Over-provision modestly at the start — enough for the throughput you expect within a year or two — because adding partitions later is a data-migration conversation rather than a configuration change.</p>'
                }
            ],
            docs: [
                { title: 'Kafka — Topics and Partitions', url: 'https://kafka.apache.org/documentation/#intro_concepts_and_terms', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'kafka-messaging', questionId: 'partitions-and-ordering' }
            ]
        },

        {
            id: 'choosing-between-them',
            title: 'Choosing',
            importance: 'must-know',
            summary: 'Log for events that others may want to replay or that arrive at very high volume; queue for tasks that need per-message control. Neither is a general-purpose answer.',
            interviewAngle: 'The comparison is standard; picking a side with a reason and naming what you give up is what distinguishes the answer.',
            buildsOn: ['kafka-model'],
            blocks: [
                {
                    type: 'table',
                    title: 'From the requirement to the broker',
                    headers: ['If you need…', 'Choose', 'Because'],
                    rows: [
                        ['Replay, or a new consumer over history', '<strong>Kafka</strong>', 'The log is retained; a queue is consumed'],
                        ['Very high throughput — hundreds of thousands per second', 'Kafka', 'Sequential writes and the page cache'],
                        ['Strict ordering per entity', 'Kafka', 'Partition by the entity key'],
                        ['Event sourcing, or a stream to build read models from', 'Kafka', 'The log <em>is</em> the history'],
                        ['Per-message TTL, priority or delay', '<strong>RabbitMQ</strong>', 'Kafka has none of these'],
                        ['Complex routing decided by the broker', 'RabbitMQ', 'Topic exchanges and bindings'],
                        ['Reject or requeue one individual message', 'RabbitMQ', 'A log has no per-message state'],
                        ['A simple work queue, modest volume', 'RabbitMQ, or SQS', 'Kafka is a lot of operational surface for a task queue'],
                        ['Request/reply', '<strong>Neither</strong>', 'That is a synchronous call. Do not build RPC on a broker.']
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>The operational cost belongs in the comparison and is usually left out. A managed queue — SQS, or a hosted RabbitMQ — is close to zero effort. Self-hosted Kafka is a cluster with brokers, coordination, partition rebalancing, retention tuning and its own monitoring vocabulary. If the requirement is "send an email after an order is placed", the honest answer may be that the outbox table you were going to build anyway is sufficient.</p>'
                }
            ],
            docs: [
                { title: 'Kafka — Use Cases', url: 'https://kafka.apache.org/uses', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'kafka-messaging', questionId: 'kafka-versus-rabbitmq' }
            ]
        },

        {
            id: 'when-not-to-use-a-broker',
            title: 'When Not to Use One',
            importance: 'must-know',
            summary: 'Asynchronous messaging trades traceability, ordering and immediate consistency for decoupling and buffering. When the caller needs the answer, that trade is a loss.',
            interviewAngle: 'A judgement chapter that reads as senior. The strongest version names a case where you removed a broker rather than added one.',
            buildsOn: ['choosing-between-them'],
            blocks: [
                {
                    type: 'types',
                    title: 'Cases where a direct call is better',
                    items: [
                        { name: 'The caller needs the result', html: '<p>A price, a validation, an authorisation. Request/reply over a broker means correlation ids, a reply queue and a timeout — a worse HTTP call with more moving parts.</p>' },
                        { name: 'A user is waiting', html: '<p>Asynchronous means "eventually". A checkout that returns before the payment is confirmed has to explain that to the user, and usually should not.</p>' },
                        { name: 'Strict global ordering is required', html: '<p>Ordering exists per partition or per queue. Across the whole topic there is none, and building it back is a project.</p>' },
                        { name: 'Two services, low volume, one team', html: '<p>The broker is more operational surface than the coupling it removes.</p>' },
                        { name: 'The consumer is the only consumer, forever', html: '<p>Fan-out is the main benefit of a log. With one consumer and no replay requirement, a direct call is simpler and traceable.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>The cost that is never in the design document is debuggability.</strong> A synchronous call gives one stack trace and one correlated log line. An event-driven flow gives a producer log, a broker in between, a consumer log, and no single place that shows the whole path unless distributed tracing was built for it. "Where did this order go" becomes a research task rather than a search — and the team pays that on every incident, forever.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>A defensible position: <em>"I use messaging when the producer genuinely should not care who consumes, when I need to buffer a load spike, or when I want the event history. I use a direct call when the caller needs the answer or when a user is waiting. And I would not introduce a broker to decouple two services that one team owns and deploys together — that is buying a distributed-systems problem to solve an organisational one that does not exist."</em></p>'
                }
            ],
            docs: [
                { title: 'Microservice Trade-Offs', url: 'https://martinfowler.com/articles/microservice-trade-offs.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'kafka-messaging', questionId: 'when-not-to-use-a-broker' },
                { topicId: 'microservices', questionId: 'sync-versus-async-communication' }
            ]
        },

        {
            id: 'back-pressure',
            title: 'Back-Pressure',
            importance: 'should-know',
            summary: 'A queue is a buffer, not a solution. If the consumer is permanently slower than the producer, the queue grows until something breaks — and the growth hides the problem until it is large.',
            interviewAngle: 'The insight is that a broker converts a fast failure into a slow one. Lag is the metric that makes it visible, and it must be alerted on.',
            buildsOn: ['when-not-to-use-a-broker'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>A queue absorbs a <em>burst</em>: the producer exceeds the consumer for a while, the queue grows, and it drains when the burst passes. That is exactly what it is for.</p><p>A queue does not fix a <strong>sustained</strong> imbalance. If the consumer is permanently slower, the queue grows without bound and the system fails later and worse — disk fills, retention deletes unprocessed messages, or the consumer\'s lag reaches hours and the data it produces is meaningless. The broker converted an immediate, visible failure into a delayed, invisible one.</p>'
                },
                {
                    type: 'table',
                    title: 'The responses, and when each is right',
                    headers: ['Response', 'When'],
                    rows: [
                        ['Scale the consumer out', 'The work is parallelisable and partitions allow it — the first thing to try'],
                        ['Make the consumer faster', 'Batching, fewer round trips, a missing index. Often the largest single win.'],
                        ['Add partitions', 'The consumer is already at the partition limit'],
                        ['Shed load at the producer', 'Reject or sample at the source rather than accumulating work you cannot do'],
                        ['Bound the queue and reject', 'RabbitMQ <code>max-length</code>. Fail fast rather than grow forever.'],
                        ['<strong>Alert on lag</strong>', '<strong>Always.</strong> This is the metric that makes the imbalance visible while it is still small.']
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>Alert on the <strong>rate of change</strong> of lag as well as its absolute value. Lag of ten thousand that is falling is a burst draining normally; lag of five hundred that has been rising steadily for an hour is a sustained imbalance that will be a hundred thousand tomorrow. The absolute threshold catches it late and the derivative catches it early, which is the difference between a scheduled fix and an incident.</p>'
                }
            ],
            docs: [
                { title: 'Kafka — Monitoring', url: 'https://kafka.apache.org/documentation/#monitoring', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'kafka-messaging', questionId: 'consumer-lag' },
                { topicId: 'beyond-rest', questionId: 'backpressure' }
            ]
        }
    ]
};
