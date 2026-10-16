/* ==========================================================================
   data/theory/kafka-mechanics.js — module 68 in the reading path

   Nine chapters. The plan's tagline lists four things — partitions, groups,
   offsets, rebalancing — and they are four views of one fact established in
   the previous module: the partition is the unit of everything.

   Two chapters carry more interview weight than the rest. Producer acks,
   because it is a durability decision with a precise answer and people give
   a vague one; and rebalancing, because a rebalance storm is a real
   production incident with a cause most teams have met without diagnosing.

   Every configuration value here names the setting it belongs to. A claim
   about Kafka behaviour that does not name a setting is a claim about a
   default somebody may have changed.
   ========================================================================== */

const kafkaMechanicsModule = {
    id: 'kafka-mechanics',
    trackId: 'distributed',
    order: 68,
    title: 'Kafka Mechanics',
    tagline: 'Partitions, groups, offsets, rebalancing.',
    estimatedMinutes: 50,
    prerequisites: ['messaging-foundations'],
    docHub: { title: 'Apache Kafka Documentation', url: 'https://kafka.apache.org/documentation/#design' },

    chapters: [
        {
            id: 'topics-partitions-replicas',
            title: 'Topics, Partitions, Replicas',
            importance: 'must-know',
            summary: 'A topic is a name; a partition is the actual ordered log on disk; a replica is a copy of a partition on another broker. Only the leader replica serves reads and writes.',
            interviewAngle: 'The ISR concept is the depth here — a follower that falls behind is removed from the in-sync set, which is what makes acks=all meaningful rather than absolute.',
            buildsOn: [],
            blocks: [
                {
                    type: 'types',
                    title: 'The structures, and what each one guarantees',
                    items: [
                        { name: 'Topic', html: '<p>A logical name. It holds no data itself and exists to group partitions.</p>' },
                        { name: 'Partition', html: '<p>An ordered, append-only sequence of records on disk, split into segment files. <strong>The unit of ordering, parallelism, replication and retention.</strong></p>' },
                        { name: 'Replica', html: '<p>A copy of a partition on another broker. <code>replication.factor=3</code> means three copies — one leader, two followers.</p>' },
                        { name: 'Leader', html: '<p>The one replica that serves produce and consume requests for that partition. Followers replicate from it and serve nothing.</p>' },
                        { name: 'ISR — in-sync replicas', html: '<p>The subset of replicas that are caught up within <code>replica.lag.time.max.ms</code>. A follower that falls behind is <strong>removed from the ISR</strong>, and the cluster keeps working with fewer copies.</p>' },
                        { name: 'Offset', html: '<p>A monotonically increasing position within one partition. It is meaningless across partitions.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong><code>acks=all</code> alone does not mean three copies.</strong> It means every replica <em>currently in the ISR</em> has acknowledged — and if two followers have fallen behind and been evicted, the ISR is one and the write is acknowledged by the leader alone. <code>min.insync.replicas=2</code> is the setting that closes it: with fewer than two in-sync replicas the broker <strong>rejects</strong> the write rather than accepting it with less durability than you asked for. The pairing to configure is <code>acks=all</code> with <code>min.insync.replicas=2</code> on a replication factor of 3.</p>'
                }
            ],
            docs: [
                { title: 'Kafka — Replication', url: 'https://kafka.apache.org/documentation/#replication', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'kafka-messaging', questionId: 'producer-acks-and-durability' }
            ]
        },

        {
            id: 'producer-acks-and-durability',
            title: 'Producer Acks',
            importance: 'must-know',
            summary: 'Three settings, and they are a durability-against-latency choice: no acknowledgement, the leader only, or every in-sync replica.',
            interviewAngle: 'A question with a precise answer. acks=1 losing data on a leader failure is the case worth being able to describe exactly.',
            buildsOn: ['topics-partitions-replicas'],
            blocks: [
                {
                    type: 'table',
                    title: 'The three values',
                    headers: ['acks', 'Waits for', 'Loses data when', 'Use for'],
                    rows: [
                        ['<code>0</code>', 'Nothing — fire and forget', 'Anything at all. The producer never finds out.', 'Metrics you can afford to lose'],
                        ['<code>1</code>', 'The leader writes it', '<strong>The leader fails before a follower replicates it</strong>', 'A default that is rarely the right answer'],
                        ['<code>all</code> (<code>-1</code>)', 'Every in-sync replica', 'Only if every in-sync replica is lost', '<strong>Anything that matters</strong>']
                    ]
                },
                {
                    type: 'syntax',
                    language: 'yaml',
                    title: 'A durable producer, with the settings that go together',
                    code: 'spring:\n  kafka:\n    producer:\n      acks: all                        # every in-sync replica\n      retries: 2147483647              # retry forever; delivery.timeout bounds it\n      properties:\n        enable.idempotence: true       # <-- see the note\n        max.in.flight.requests.per.connection: 5\n        delivery.timeout.ms: 120000    # the REAL bound on retrying\n        linger.ms: 10                  # batch for 10ms: much better throughput\n        compression.type: snappy\n\n# And on the topic, or the durability claim is incomplete:\n#   replication.factor = 3\n#   min.insync.replicas = 2',
                    notes: '<p><code>enable.idempotence=true</code> is the setting that makes retrying safe rather than duplicating: the producer tags each batch with a sequence number and the broker discards a repeat. Without it, a retry after a lost acknowledgement writes the record twice. It has been the default since Kafka 3.0, it implies <code>acks=all</code>, and setting it explicitly documents the intent for anyone reading the configuration.</p>'
                }
            ],
            docs: [
                { title: 'Kafka — Producer Configs', url: 'https://kafka.apache.org/documentation/#producerconfigs', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'kafka-messaging', questionId: 'producer-acks-and-durability' }
            ]
        },

        {
            id: 'keys-and-ordering',
            title: 'Keys and Ordering',
            importance: 'must-know',
            summary: 'The key decides the partition, the partition decides the ordering. Choosing the key is therefore choosing what is ordered and where the load concentrates.',
            interviewAngle: 'The design question. Partition by the entity whose events must be ordered — and know that a hot key is the cost of that choice.',
            buildsOn: ['producer-acks-and-durability'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>A record with a key goes to <code>hash(key) % partitionCount</code>, so every record with the same key lands in the same partition and is therefore strictly ordered relative to the others with that key. A record with a <code>null</code> key is distributed across partitions — currently by sticky batching — and has no ordering relationship with anything.</p><p>So the key is a design decision with two consequences: <strong>what is ordered</strong>, and <strong>where the load goes</strong>.</p>'
                },
                {
                    type: 'table',
                    title: 'Choosing a key',
                    headers: ['Key', 'Orders', 'Risk'],
                    rows: [
                        ['<code>orderId</code>', 'All events for one order', 'Good spread; usually the right choice'],
                        ['<code>customerId</code>', 'All events for one customer', 'A very large customer becomes a hot partition'],
                        ['<code>null</code>', 'Nothing', 'Perfect spread; no ordering at all'],
                        ['A country or region', 'Everything in that region', '<strong>Severe skew.</strong> One region dominates and one partition does all the work'],
                        ['A timestamp', 'Nothing useful', 'All current traffic lands on one partition at a time'],
                        ['<code>tenantId</code>', 'One tenant\'s events', 'Skew proportional to tenant size — often acceptable, sometimes not']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Ordering per partition is not ordering per topic, and designs quietly assume the second.</strong> If <code>OrderPlaced</code> is keyed by order id and <code>CustomerUpdated</code> is keyed by customer id, a consumer processing both has no guarantee about their relative order — even for the same customer, even for the same second. Any invariant that depends on "A happened before B" must have A and B on the <em>same partition</em>, which means the same key, which usually means the same topic.</p>'
                }
            ],
            docs: [
                { title: 'Kafka — Producer', url: 'https://kafka.apache.org/documentation/#theproducer', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'kafka-messaging', questionId: 'partitions-and-ordering' }
            ]
        },

        {
            id: 'consumer-groups-and-assignment',
            title: 'Consumer Groups and Assignment',
            importance: 'must-know',
            summary: 'A group divides the partitions among its instances. One partition goes to exactly one instance, so partition count caps useful parallelism.',
            interviewAngle: 'The "why did adding pods not help" question. Six instances on three partitions leaves three idle, and that is by design rather than a misconfiguration.',
            buildsOn: ['keys-and-ordering'],
            blocks: [
                {
                    type: 'table',
                    title: 'Assignment strategies, and why the last one exists',
                    headers: ['Strategy', 'Behaviour', 'On rebalance'],
                    rows: [
                        ['<code>RangeAssignor</code>', 'Contiguous ranges per topic', 'Can skew badly with several topics'],
                        ['<code>RoundRobinAssignor</code>', 'Even spread across all partitions', 'Everything is reassigned'],
                        ['<code>StickyAssignor</code>', 'Even, and preserves existing assignments where possible', 'Still stops the world'],
                        ['<code>CooperativeStickyAssignor</code>', 'Sticky, and revokes <strong>incrementally</strong>', '<strong>Only the moved partitions pause.</strong> The default to choose.']
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>The cooperative assignor is the one to configure and the reason is the next chapter but one. The older strategies use <em>eager</em> rebalancing: every consumer gives up every partition, the group re-forms, and consumption stops entirely for the duration — a stop-the-world pause proportional to the size of the group. Cooperative rebalancing revokes only the partitions that are actually moving, so a group of twenty consumers adding one instance pauses one or two partitions rather than all of them.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Static group membership — <code>group.instance.id</code>, set from the pod name — is the other setting worth knowing. It stops a rolling restart triggering a rebalance at all: a consumer that disappears and returns with the same id within <code>session.timeout.ms</code> reclaims its partitions rather than causing a reassignment. For a deployment that restarts every pod in sequence, that is the difference between one rebalance per pod and none.</p>'
                }
            ],
            docs: [
                { title: 'Kafka — Consumer Groups', url: 'https://kafka.apache.org/documentation/#theconsumer', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'kafka-messaging', questionId: 'consumer-groups-and-parallelism' }
            ]
        },

        {
            id: 'offset-management',
            title: 'Offsets',
            importance: 'must-know',
            summary: 'The group\'s position per partition, stored in an internal Kafka topic. When you commit decides whether a crash duplicates or loses.',
            interviewAngle: 'Auto-commit is the default and it can lose messages, which surprises people. The precise reason is that it commits on a timer rather than after processing.',
            buildsOn: ['consumer-groups-and-assignment'],
            blocks: [
                {
                    type: 'table',
                    title: 'Commit strategies',
                    headers: ['Strategy', 'Setting', 'On a crash'],
                    rows: [
                        ['Auto-commit', '<code>enable.auto.commit=true</code>, every 5s', '<strong>Can lose messages</strong> — an offset committed on the timer for records not yet processed'],
                        ['Manual, after processing', '<code>ack-mode: MANUAL</code> or <code>RECORD</code>', 'Duplicates. At-least-once, which is what you want.'],
                        ['Manual, batched', '<code>ack-mode: BATCH</code>', 'The whole batch is redelivered'],
                        ['Committed with the work', 'Kafka transactions, or an outbox', 'Neither — within the scope the transaction covers']
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Manual acknowledgement, and the ordering that makes it at-least-once',
                    code: '# spring.kafka.listener.ack-mode: MANUAL_IMMEDIATE\n# spring.kafka.consumer.enable-auto-commit: false',
                    output: {
                        kind: 'trace',
                        lines: [
                            'Auto-commit commits on a TIMER, not after processing. Poll returns 500 records; the timer fires after 100 are done; the process dies. The other 400 are never redelivered.',
                            'Manual acknowledgement after processing gives at-least-once: a crash before the ack means redelivery, which the idempotency module already handled.',
                            'There is no ordering of "process" and "commit" that gives exactly-once. Commit first loses; commit last duplicates.',
                            'So: commit last, and make the consumer idempotent. That is the whole of the design.'
                        ],
                        explain: '<p>The Spring properties above are the two that matter and they must both be set: turning off auto-commit without setting an ack mode leaves the container committing on its own schedule, which is the behaviour you were trying to replace.</p>'
                    }
                },
                {
                    type: 'tip',
                    html: '<p><code>auto.offset.reset</code> decides what a <em>new</em> group does, and it only applies when there is no committed offset. <code>latest</code> starts from now and skips history; <code>earliest</code> reads the whole retained log. The trap is a group id typo in production: with <code>earliest</code> the service silently reprocesses days of history, and with <code>latest</code> it silently skips everything that arrived while it was down.</p>'
                }
            ],
            docs: [
                { title: 'Kafka — Consumer Configs', url: 'https://kafka.apache.org/documentation/#consumerconfigs', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'kafka-messaging', questionId: 'offset-commit-strategies' }
            ]
        },

        {
            id: 'rebalancing-and-how-to-avoid-storms',
            title: 'Rebalancing, and the Storm',
            importance: 'must-know',
            summary: 'A rebalance reassigns partitions when membership changes. A consumer that takes too long between polls is presumed dead, triggers one, and the reassignment makes everyone else slower — which triggers another.',
            interviewAngle: 'A real production incident with a specific, fixable cause. max.poll.interval.ms against processing time is the arithmetic that explains it.',
            buildsOn: ['offset-management'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>Two independent timeouts decide whether a consumer is considered alive, and confusing them is why this is hard to diagnose.</p><ul><li><code>session.timeout.ms</code> — the heartbeat thread must contact the coordinator within this window. It runs in the background, so it keeps ticking even while processing is slow.</li><li><code>max.poll.interval.ms</code> — the application must call <code>poll()</code> again within this window. <strong>This is the one that fires when processing is slow</strong>, and it defaults to five minutes.</li></ul><p>Exceed <code>max.poll.interval.ms</code> and the consumer is removed from the group even though its heartbeats were perfectly healthy — which is why the logs show a consumer that "left the group" with no error and no network problem.</p>'
                },
                {
                    type: 'syntax',
                    language: 'yaml',
                    title: 'The arithmetic, and the settings that fix it',
                    code: '# THE STORM:\n#   max.poll.records   = 500     (the default)\n#   processing time    = 2s per record\n#   => one poll cycle  = 1000s\n#   max.poll.interval.ms = 300000 (5 minutes)\n#\n# The consumer is evicted mid-batch. A rebalance moves its partitions\n# to peers, which now have MORE work, so they exceed the interval too,\n# and the group never stabilises. Consumption stops entirely.\n\nspring:\n  kafka:\n    consumer:\n      max-poll-records: 50           # <-- 100s per cycle, well inside\n      properties:\n        max.poll.interval.ms: 300000\n        session.timeout.ms: 45000\n        heartbeat.interval.ms: 3000  # ~1/3 of the session timeout\n        partition.assignment.strategy: >\n          org.apache.kafka.clients.consumer.CooperativeStickyAssignor\n        group.instance.id: ${HOSTNAME}   # static membership',
                    output: {
                        kind: 'trace',
                        lines: [
                            'Symptom:  "Member consumer-1 sending LeaveGroup request" with no error, repeatedly, and lag climbing.',
                            'Cause:    processing time per poll batch exceeded max.poll.interval.ms.',
                            'Fix 1:    reduce max.poll.records so a batch finishes well inside the interval.',
                            'Fix 2:    make processing faster -- batch the database writes rather than one round trip per record.',
                            'Fix 3:    raise max.poll.interval.ms, which delays detection of a genuinely dead consumer. Last resort.',
                            'Fix 4:    CooperativeStickyAssignor plus static membership, so the rebalances that do happen cost far less.'
                        ],
                        explain: '<p>The order matters: the first two fix the cause and the third hides it. Raising the interval is the change people make first because it makes the symptom stop, and it leaves a group that takes five minutes to notice a genuinely crashed consumer.</p>'
                    }
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>The storm is self-sustaining, which is what makes it an incident rather than a blip.</strong> Each eviction redistributes work onto consumers that are already at their limit, pushing them over it too. Lag grows, which means larger batches to catch up, which means longer processing per poll. Recovering usually requires scaling the consumer out or reducing <code>max.poll.records</code> and restarting the group — it does not settle on its own.</p>'
                }
            ],
            docs: [
                { title: 'Kafka — Consumer Configs', url: 'https://kafka.apache.org/documentation/#consumerconfigs', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'kafka-messaging', questionId: 'rebalancing-and-slow-processing' }
            ]
        },

        {
            id: 'consumer-lag',
            title: 'Consumer Lag',
            importance: 'must-know',
            summary: 'The difference between the latest offset and the committed offset, per partition. It is the health metric for a consumer, and the per-partition view is the one that finds problems.',
            interviewAngle: 'The aggregate hides the case that matters — one partition lagging badly while the total looks fine, which means a hot key or one stuck consumer.',
            buildsOn: ['rebalancing-and-how-to-avoid-storms'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>Lag is <code>logEndOffset - committedOffset</code> for a partition. Summed across a topic it gives an overall picture; read per partition it tells you <em>which</em> consumer or <em>which</em> key is the problem — and that distinction is the whole diagnostic value.</p><p>Two consumers each lagging 500 is a group that is uniformly a little behind, which is usually fine. One consumer lagging 100,000 while five sit at zero is a stuck instance, a hot partition, or a poison message — three very different causes with the same aggregate.</p>'
                },
                {
                    type: 'table',
                    title: 'Reading the shape of the lag',
                    headers: ['Shape', 'Likely cause', 'Action'],
                    rows: [
                        ['Even across partitions, stable', 'Normal steady state', 'Nothing'],
                        ['Even, rising steadily', 'Sustained imbalance', 'Scale out, or make processing faster'],
                        ['Even, rising and falling', 'Bursty producer', 'Fine, if the peak drains'],
                        ['<strong>One partition high, others zero</strong>', 'Hot key, stuck consumer, or a poison message', 'Check that consumer\'s logs first'],
                        ['All partitions high, none moving', 'The whole group is down, or in a rebalance storm', 'Check group state before anything else'],
                        ['Lag drops to zero suddenly', '<strong>Retention deleted the backlog.</strong> Data loss, not recovery', 'Alert on this separately']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Lag falling to zero is not always good news.</strong> If retention deletes records the consumer never read, the committed offset is no longer valid, the consumer resets according to <code>auto.offset.reset</code>, and lag reads zero — with the backlog silently gone. That is data loss reported as a recovery, and it is why lag alerts should sit alongside an alert on the oldest available offset moving past the committed one.</p>'
                }
            ],
            docs: [
                { title: 'Kafka — Monitoring', url: 'https://kafka.apache.org/documentation/#monitoring', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'kafka-messaging', questionId: 'consumer-lag' }
            ]
        },

        {
            id: 'retention-and-compaction',
            title: 'Retention and Compaction',
            importance: 'should-know',
            summary: 'Delete removes old segments by age or size. Compact keeps the latest value per key forever, which turns a topic into a durable snapshot of current state.',
            interviewAngle: 'Compaction is the mechanism behind changelog topics and stateful stream processing, and knowing what it does and does not guarantee is the depth.',
            buildsOn: ['consumer-lag'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'The two cleanup policies',
                    left: 'cleanup.policy=delete',
                    right: 'cleanup.policy=compact',
                    rows: [
                        { aspect: 'Removes', left: 'Whole segments past <code>retention.ms</code> or <code>retention.bytes</code>', right: 'Superseded records for a key' },
                        { aspect: 'Keeps', left: 'Everything recent', right: '<strong>The latest record per key, indefinitely</strong>' },
                        { aspect: 'A full read gives', left: 'The recent window of events', right: 'The current state of every key' },
                        { aspect: 'Deleting a key', left: 'Wait for retention', right: 'A <strong>tombstone</strong> — a record with a null value' },
                        { aspect: 'Requires', left: 'Nothing', right: 'Every record must have a key' },
                        { aspect: 'Use for', left: 'Event streams', right: 'Changelogs, configuration, current-state topics' }
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>Compaction is what lets a topic act as a durable key-value snapshot: read it from the beginning and you have the latest value for every key that has ever existed, without needing the whole history. That is the mechanism behind Kafka Streams state stores, Connect offset topics and Kafka\'s own <code>__consumer_offsets</code>.</p><p>What it does <strong>not</strong> guarantee is immediacy or exclusivity. Compaction runs in the background on inactive segments, so duplicates for a key remain readable until it does — a consumer reading from the beginning may see three values for one key and must take the last. And <code>compact,delete</code> is a legal combination: compact within the retention window, then delete, which suits a changelog you do not want to keep forever.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>A tombstone is retained for <code>delete.retention.ms</code> — 24 hours by default — and then removed, so a consumer that is more than a day behind can miss the deletion entirely and keep a key its state store should have dropped. If deletions matter, that setting has to be longer than the worst lag you tolerate, and that relationship is not enforced anywhere.</p>'
                }
            ],
            docs: [
                { title: 'Kafka — Log Compaction', url: 'https://kafka.apache.org/documentation/#compaction', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'kafka-messaging', questionId: 'retention-and-log-compaction' }
            ]
        },

        {
            id: 'spring-kafka-listeners',
            title: 'Listeners in Spring',
            importance: 'should-know',
            summary: '@KafkaListener plus a container factory. The error handler is the part that matters, because the default retries in place and can block a partition indefinitely.',
            interviewAngle: 'The practical half, and the discriminating detail is that a failing record blocks its partition — the consumer cannot skip it without deciding to.',
            buildsOn: ['retention-and-compaction'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'A listener, and the error handler that keeps the partition moving',
                    code: '@KafkaListener(topics = "orders.placed", groupId = "fulfilment",\n               concurrency = "3")          // 3 threads, so 3 partitions max\nvoid on(OrderPlaced event, Acknowledgment ack) {\n    reservations.reserve(event);\n    ack.acknowledge();\n}\n\n@Bean\nDefaultErrorHandler errorHandler(KafkaTemplate<String, Object> template) {\n\n    // After the retries, publish to <topic>.DLT and MOVE ON. Without a\n    // recoverer the default retries in place forever, and the partition\n    // stops -- one bad record halts every record behind it.\n    DeadLetterPublishingRecoverer recoverer =\n            new DeadLetterPublishingRecoverer(template);\n\n    DefaultErrorHandler handler = new DefaultErrorHandler(\n            recoverer, new ExponentialBackOff(1000L, 2.0));\n\n    // A deserialization failure will NEVER succeed on retry. Send it\n    // straight to the DLT rather than backing off three times first.\n    handler.addNotRetryableExceptions(\n            DeserializationException.class,\n            MethodArgumentNotValidException.class);\n\n    return handler;\n}',
                    notes: '<p><code>concurrency</code> is threads within one application instance, and it is bounded by partitions exactly as instance count is: three threads on two partitions leaves one idle. The two multiply — three instances at concurrency 3 needs nine partitions to be fully used.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A poison message blocks its partition, and only its partition.</strong> A record that always fails is retried in place, so every record behind it on that partition waits — while the other partitions continue normally. The symptom is one partition\'s lag climbing while the rest are healthy, which is the diagnostic shape from the lag chapter. A dead-letter recoverer is what converts that from an outage into a record in a DLT topic somebody can inspect.</p>'
                }
            ],
            docs: [
                { title: 'Spring for Apache Kafka', url: 'https://docs.spring.io/spring-kafka/reference/kafka/receiving-messages/message-listeners.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'kafka-messaging', questionId: 'retry-and-dead-letter-topics' }
            ]
        }
    ]
};
