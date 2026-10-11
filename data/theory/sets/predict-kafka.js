/* ==========================================================================
   data/theory/sets/predict-kafka.js — Predict, set 10 of 11

   Four puzzles, all artefact: 'behaviour'. Every answer is about a guarantee
   Kafka does or does not give, and none of them can be demonstrated by a
   program whose stdout a runner could diff: three of the four need a broker,
   a consumer group and a rebalance, and the fourth needs two consumers.

   THE FOUR ARE ONE ARGUMENT IN SEQUENCE, and the order is deliberate. Kafka
   orders within a partition and nowhere else; a rebalance can move a
   partition mid-batch; committing before processing turns at-least-once into
   at-most-once; and therefore a duplicate is not a failure mode to be
   prevented but the normal case to be absorbed. A reader who takes only the
   last sentence away has the one that matters, because "make the consumer
   idempotent" is the answer to most Kafka interview questions and the one
   candidates reach for last.

   Every claim below is the DOCUMENTED behaviour of the Apache Kafka consumer
   and of Spring for Apache Kafka's listener container, named in each entry's
   verification string. Nothing here was measured — there is no broker on the
   build machine.
   ========================================================================== */

const predictKafkaModule = {
    id: 'predict-kafka',
    trackId: 'output',
    order: 960,
    title: 'Kafka',
    tagline: 'What is guaranteed, what is merely usual, and why the consumer has to be idempotent.',
    estimatedMinutes: 20,
    prerequisites: [],
    docHub: {
        title: 'Apache Kafka — Documentation',
        url: 'https://kafka.apache.org/documentation/'
    },

    chapters: [
        {
            id: 'what-kafka-guarantees',
            title: 'What Kafka Actually Guarantees',
            importance: 'must-know',
            summary: 'One ordering guarantee, narrower than most people assume, and a rebalance that can interrupt anything.',
            interviewAngle: 'Almost every candidate says "Kafka guarantees ordering". The follow-up is "ordering of what", and that is the question.',
            buildsOn: [],
            blocks: [
                {
                    type: 'predict',
                    id: 'predict-kafka-ordering-across-partitions',
                    importance: 'must-know',
                    artefact: 'behaviour',
                    language: 'java',
                    title: 'Three events for one order',
                    prompt: '<p>The topic has 6 partitions. Three events for order 42 are produced in sequence with no key. In what order does a single consumer see them?</p>',
                    code: 'template.send("order-events", null, new Created(42));\ntemplate.send("order-events", null, new Paid(42));\ntemplate.send("order-events", null, new Shipped(42));\n// null key -> the default partitioner distributes across partitions',
                    options: [
                        'Any order. Ordering holds within a partition, and these went to different partitions',
                        'Created, Paid, Shipped — the producer sends them in order',
                        'Any order, but only if there are multiple consumers',
                        'Created, Paid, Shipped, because they share a topic'
                    ],
                    answer: 0,
                    verification: 'Read from the Apache Kafka documentation, "Guarantees" section of the design chapter, which states that messages sent by a producer to a particular topic partition are appended in the order sent, and the default partitioner behaviour for a null key. Not executed here: no broker on the build machine.',
                    output: {
                        kind: 'trace',
                        lines: [
                            'Created(42) -> partition 3, offset 118',
                            'Paid(42)    -> partition 0, offset 991',
                            'Shipped(42) -> partition 5, offset 42',
                            '',
                            'One consumer polls all six partitions. The batch it receives',
                            'is grouped by partition, in no cross-partition order:',
                            '',
                            '  Shipped(42)   <-- arrives first',
                            '  Created(42)',
                            '  Paid(42)',
                            '',
                            'A state machine that rejects SHIPPED before CREATED now fails.'
                        ],
                        explain: '<p>Kafka guarantees order <strong>within a partition</strong> and makes no statement across partitions. A null key means the partitioner spreads records, so three events about the same entity land in three places and their relative order is gone. <strong>The fix is one line: key by the entity id.</strong> All three then hash to the same partition and arrive in order. The cost is worth naming — a hot key concentrates load on one partition, and the maximum useful parallelism becomes the partition count rather than the consumer count.</p>'
                    }
                },
                {
                    type: 'predict',
                    id: 'predict-kafka-rebalance-during-processing',
                    importance: 'must-know',
                    artefact: 'behaviour',
                    language: 'java',
                    title: 'A slow handler and max.poll.interval.ms',
                    prompt: '<p><code>max.poll.interval.ms</code> is the default 300000 (5 minutes) and <code>max.poll.records</code> is 500. Each record takes 2 seconds. What happens?</p>',
                    code: '@KafkaListener(topics = "order-events", groupId = "fulfilment")\nvoid onEvent(OrderEvent event) {\n    slowExternalCall(event);   // ~2 seconds each\n}',
                    options: [
                        'The batch takes ~1000 seconds, the consumer misses its poll deadline, the group rebalances and the partition is reassigned — and the work already done is redelivered',
                        'Nothing. The consumer heartbeats on a background thread, so it stays in the group',
                        'The consumer is fine; only a crash triggers a rebalance',
                        'Kafka throttles the producer until the consumer catches up'
                    ],
                    answer: 0,
                    verification: 'Read from the Apache Kafka consumer configuration documentation for max.poll.interval.ms and max.poll.records, and the KIP-62 separation of the heartbeat thread from the poll deadline. Not executed here: no broker on the build machine.',
                    output: {
                        kind: 'trace',
                        lines: [
                            'poll() returns 500 records',
                            '  ... 300 seconds elapse, 150 records processed ...',
                            '',
                            'WARN o.a.k.c.c.i.ConsumerCoordinator : consumer poll timeout has',
                            'expired. This means the time between subsequent calls to poll() was',
                            'longer than the configured max.poll.interval.ms',
                            '',
                            'consumer leaves the group -> rebalance -> partition reassigned',
                            'commit of the 150 processed records is REJECTED (generation changed)',
                            'the new owner starts from the last committed offset: all 500 again'
                        ],
                        explain: '<p>Since KIP-62 the heartbeat runs on its own thread, so the consumer looks alive while the poll loop is stuck — which is exactly why <code>max.poll.interval.ms</code> exists as a separate deadline. Missing it is treated as failure, the partition moves, and the 150 records already processed are redelivered to somebody else. <strong>The fixes are all about making the batch fit the deadline</strong>: lower <code>max.poll.records</code>, raise <code>max.poll.interval.ms</code> if the work genuinely is slow, or take the slow call out of the listener entirely. And this is the second reason the handler must be idempotent — the first was a crash, and this one needs no crash at all.</p>'
                    }
                }
            ],
            docs: [
                { title: 'Apache Kafka — Consumer configuration', url: 'https://kafka.apache.org/documentation/#consumerconfigs', kind: 'spec' }
            ],
            relatedQuestions: []
        },

        {
            id: 'offsets-and-duplicates',
            title: 'Offsets, and Why Duplicates Are Normal',
            importance: 'must-know',
            summary: 'One line moved two places up, and a delivery guarantee that becomes its opposite.',
            interviewAngle: 'This is the question that finds out whether somebody has operated a consumer or only configured one.',
            buildsOn: ['what-kafka-guarantees'],
            blocks: [
                {
                    type: 'predict',
                    id: 'predict-kafka-manual-commit-before-processing',
                    importance: 'must-know',
                    artefact: 'behaviour',
                    language: 'java',
                    title: 'Committing first',
                    prompt: '<p>The commit was moved above the processing "to keep consumer lag down". The pod is killed between the two lines. What is the delivery guarantee now?</p>',
                    code: '@KafkaListener(topics = "payments", groupId = "ledger")\nvoid onPayment(PaymentEvent event, Acknowledgment ack) {\n    ack.acknowledge();      // moved up from the bottom\n    ledger.apply(event);    // pod killed here\n}',
                    options: [
                        'At-most-once. The offset is committed, the work is not done, and the event is never redelivered — it is lost',
                        'Still at-least-once; the commit is only a hint',
                        'Exactly-once, because the commit and the work are in one method',
                        'The consumer will replay from the beginning of the partition'
                    ],
                    answer: 0,
                    verification: 'Read from the Apache Kafka documentation, "Message Delivery Semantics", which describes exactly this ordering choice as the difference between at-most-once and at-least-once. Not executed here: no broker on the build machine.',
                    output: {
                        kind: 'trace',
                        lines: [
                            'poll -> PaymentEvent(id=9931, amount=249900)',
                            'ack.acknowledge()   -> offset 4471 committed to __consumer_offsets',
                            'SIGKILL',
                            '',
                            '-- new consumer joins, resumes from committed offset 4472',
                            '-- event 9931 is never delivered again',
                            '-- the ledger is short by 2499.00 and nothing anywhere says so'
                        ],
                        explain: '<p>Where the commit sits relative to the work <em>is</em> the delivery guarantee — there is no third mechanism. Commit after and a crash redelivers: at-least-once, duplicates possible. Commit before and a crash skips: at-most-once, loss possible. <strong>The lag argument is not even true</strong>: lag is a function of throughput, and committing early does not make the handler faster, it only makes the metric lie. For anything with money in it, commit after, and make the handler tolerate the redelivery.</p>'
                    }
                },
                {
                    type: 'predict',
                    id: 'predict-kafka-duplicate-after-retry',
                    importance: 'must-know',
                    artefact: 'behaviour',
                    language: 'java',
                    title: 'The broker wrote it, the ack was lost',
                    prompt: '<p>The producer has <code>acks=all</code>, <code>retries</code> at the default and <code>enable.idempotence=false</code>. A network blip drops the acknowledgement after the broker has already written the record. What is in the topic?</p>',
                    code: 'var props = Map.of(\n    ACKS_CONFIG, "all",\n    ENABLE_IDEMPOTENCE_CONFIG, false,   // explicitly off\n    RETRIES_CONFIG, Integer.MAX_VALUE\n);\ntemplate.send("payments", "acct-88", new Debit(2499_00));',
                    options: [
                        'Two records. The producer retried a write the broker had already committed',
                        'One record. acks=all prevents duplicates',
                        'No record. The failed ack rolls the write back',
                        'One record, marked as a retry'
                    ],
                    answer: 0,
                    verification: 'Read from the Apache Kafka producer configuration documentation for enable.idempotence and acks, and from the "Message Delivery Semantics" design section on producer retries. Note that enable.idempotence defaults to true since Kafka 3.0 — this puzzle turns it off deliberately. Not executed here: no broker on the build machine.',
                    output: {
                        kind: 'trace',
                        lines: [
                            'send -> broker appends at offset 5501, replicates to ISR',
                            'ack  -> lost in the network',
                            'producer: no ack within request.timeout.ms -> retry',
                            'send -> broker appends AGAIN at offset 5502',
                            '',
                            'partition contents:',
                            '  5501  acct-88  Debit(2499.00)',
                            '  5502  acct-88  Debit(2499.00)     <-- the same debit, twice',
                            '',
                            '(with enable.idempotence=true, the default since Kafka 3.0, the',
                            ' broker recognises the producer id and sequence number and drops',
                            ' the second write.)'
                        ],
                        explain: '<p><code>acks=all</code> is a durability setting, not a deduplication one: it says the record reached the in-sync replicas, and says nothing about whether the producer found out. A lost ack is indistinguishable from a lost write, so the producer retries, and the retry is a second record. <strong>The idempotent producer fixes this half</strong> — a producer id and a per-partition sequence number let the broker drop a repeat — and it has been the default since Kafka 3.0, which is why this puzzle has to disable it explicitly to show the problem. <strong>It does not fix the consumer half.</strong> Redelivery after a rebalance or a crash still happens, so the four puzzles in this set all end in the same place: the consumer must be idempotent, and that is a property of your handler, not of any broker setting.</p>'
                    }
                }
            ],
            docs: [
                { title: 'Apache Kafka — Message delivery semantics', url: 'https://kafka.apache.org/documentation/#semantics', kind: 'spec' }
            ],
            relatedQuestions: []
        }
    ]
};
