/* ==========================================================================
   data/theory/scaling-data.js — module 73 in the reading path

   Nine chapters, and the plan's tagline names the four things that get
   asked: replication, sharding, consistent hashing, CAP as a forced choice.
   The last of those gets two chapters, because CAP is the most misquoted
   result in the subject and PACELC is the version that describes the
   decision a real system actually makes.

   read-your-writes appears here for the third time in the deck — after the
   saga UI chapter and the CQRS lag chapter — and that is deliberate. It is
   the same user-visible failure arriving from three different causes, and
   the mitigation is the same each time.
   ========================================================================== */

const scalingDataModule = {
    id: 'scaling-data',
    trackId: 'distributed',
    order: 73,
    title: 'Scaling Data',
    tagline: 'Replication, sharding, consistent hashing, CAP as a forced choice.',
    estimatedMinutes: 45,
    prerequisites: ['schema-and-scale', 'caching-strategies'],
    docHub: { title: 'PostgreSQL 16 — High Availability', url: 'https://www.postgresql.org/docs/16/high-availability.html' },

    chapters: [
        {
            id: 'vertical-vs-horizontal',
            title: 'Bigger, or More',
            importance: 'must-know',
            summary: 'A larger machine is one change and no new failure modes. More machines is a distributed system. Take the larger machine for as long as it is available.',
            interviewAngle: 'The unfashionable answer is usually right, and arguing for it with the numbers — modern hardware is very large — is a strong opening.',
            buildsOn: [],
            blocks: [
                {
                    type: 'comparison',
                    title: 'The two directions',
                    left: 'Vertical — a bigger machine',
                    right: 'Horizontal — more machines'
                    , rows: [
                        { aspect: 'Effort', left: 'A restart, or a failover', right: 'A design change and an operational one' },
                        { aspect: 'Application changes', left: '<strong>None</strong>', right: 'Routing, and possibly a shard key everywhere' },
                        { aspect: 'Transactions and joins', left: 'Unaffected', right: '<strong>Gone across the boundary</strong>' },
                        { aspect: 'Ceiling', left: 'Real — the largest instance available', right: 'Effectively none' },
                        { aspect: 'Cost curve', left: 'Superlinear at the top end', right: 'Roughly linear' },
                        { aspect: 'New failure modes', left: 'None', right: 'Partitions, rebalancing, hot shards, split brain' }
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>The reason this is worth stating plainly is that the ceiling is much higher than most designs assume. A single managed PostgreSQL instance with a few hundred gigabytes of memory and dozens of cores handles a workload that most services will never reach — and it keeps joins, transactions, foreign keys and ad-hoc queries while doing so.</p><p>Read replicas come next, because they scale reads without giving up any of that. <strong>Sharding is last</strong>, because it is the only one of the three that changes what the application can express.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The order to work through, and it is worth giving as an ordered list in an interview: <strong>fix the queries, then add an index, then cache, then a bigger machine, then read replicas, and only then shard.</strong> Most systems that reach for sharding stopped at step one — and a missing index or an N+1 masquerading as a capacity problem is the single most common cause of a premature sharding project.</p>'
                }
            ],
            docs: [
                { title: 'PostgreSQL 16 — High Availability', url: 'https://www.postgresql.org/docs/16/high-availability.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'caching-scale', questionId: 'scaling-reads-and-writes' }
            ]
        },

        {
            id: 'replication-and-lag',
            title: 'Replication and Lag',
            importance: 'must-know',
            summary: 'A replica applies the primary\'s changes, slightly behind. Asynchronous replication scales reads and means a replica can serve data that is seconds old — or lose committed writes on failover.',
            interviewAngle: 'The synchronous-versus-asynchronous trade is the substance: async is fast and can lose data on failover, sync is durable and couples the primary to the replica.',
            buildsOn: ['vertical-vs-horizontal'],
            blocks: [
                {
                    type: 'table',
                    title: 'PostgreSQL 16 replication modes',
                    headers: ['<code>synchronous_commit</code>', 'The primary waits for', 'On failover'],
                    rows: [
                        ['<code>off</code>', 'Nothing — not even its own disk flush', 'Recent local writes can be lost'],
                        ['<code>local</code>', 'Its own WAL flush', 'Committed writes not yet replicated are lost'],
                        ['<code>remote_write</code>', 'The replica received it', 'Safe unless the replica also crashes'],
                        ['<code>on</code>', 'The replica flushed it to disk', '<strong>No committed write is lost</strong>'],
                        ['<code>remote_apply</code>', 'The replica applied it and can serve it', 'No loss, and reads from that replica are current — at the highest latency cost']
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>Asynchronous replication — <code>local</code>, the usual default — is fast because the primary never waits for anybody. The cost is a window: writes that committed on the primary but had not reached a replica are lost if the primary dies and a replica is promoted. That window is normally milliseconds and is not zero.</p><p>Synchronous replication closes it and couples the primary\'s write latency to the replica\'s. Worse, with a single synchronous replica, a replica that becomes unreachable <strong>blocks writes on the primary</strong> — an availability failure caused by the durability setting, which is exactly the CAP trade arriving in a configuration file.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Sending reads to a replica changes the correctness of code that was written against a primary.</strong> "Write, then read what you wrote" works on a primary and returns the old value on a lagging replica. Routing reads to replicas is a one-line infrastructure change with application-level consequences, and the next chapter is the specific one.</p>'
                }
            ],
            docs: [
                { title: 'PostgreSQL 16 — Synchronous Replication', url: 'https://www.postgresql.org/docs/16/warm-standby.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'sql-databases', questionId: 'read-replicas' }
            ]
        },

        {
            id: 'read-your-writes',
            title: 'Read Your Own Writes',
            importance: 'must-know',
            summary: 'A user must see the effect of their own action immediately, even when everybody else can wait. It is the one consistency guarantee that is not negotiable in a UI.',
            interviewAngle: 'Third appearance in this deck, from a third cause. The pattern worth naming is that the same mitigation works whatever produced the lag.',
            buildsOn: ['replication-and-lag'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>Other people seeing a change a second late is invisible. The person who <em>made</em> the change seeing the old value is not — they conclude it failed and do it again, which is how a lagging replica produces duplicate orders.</p><p>This deck has now met the same failure three times: waiting for a saga step, waiting for a CQRS projection, and waiting for replication. The causes are different and the mitigations are the same, which is the useful generalisation.</p>'
                },
                {
                    type: 'table',
                    title: 'The mitigations, and their costs',
                    headers: ['Technique', 'How', 'Cost'],
                    rows: [
                        ['Read from the primary after a write', 'Pin this session to the primary for N seconds', 'Load on the primary; a session flag to carry'],
                        ['Route by operation', 'Writes and anything read-your-writes to the primary; reports to replicas', 'A routing rule per query. Explicit and reliable.'],
                        ['Wait for the LSN', 'The write returns its log position; the read waits for a replica to reach it', 'Latency, and database-specific plumbing'],
                        ['Return the result from the write', 'The client uses what the write returned', '<strong>Nothing. Usually the whole answer.</strong>'],
                        ['Client-side merge', 'The client holds its pending change and overlays it', 'Client complexity; wrong if the write is later rejected'],
                        ['Monotonic reads', 'Pin the session to <em>one</em> replica', 'Stops time appearing to move backwards, which is a separate and equally confusing bug']
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>Spring\'s <code>@Transactional(readOnly = true)</code> plus a routing <code>DataSource</code> is the usual mechanism, and it is worth knowing that the routing is decided when the transaction starts. A read-only method that must see a just-committed write has to be marked as writable, or routed explicitly — the annotation is a routing hint as much as a Hibernate flush-mode optimisation, and treating it as only the latter is how the bug arrives.</p>'
                }
            ],
            docs: [
                { title: 'PostgreSQL 16 — Hot Standby', url: 'https://www.postgresql.org/docs/16/hot-standby.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'sql-databases', questionId: 'read-replicas' },
                { topicId: 'caching-scale', questionId: 'eventual-consistency-in-practice' }
            ]
        },

        {
            id: 'sharding-strategies',
            title: 'Sharding',
            importance: 'must-know',
            summary: 'Split the data across independent databases by a shard key. It scales writes, and it costs cross-shard joins, cross-shard transactions and a key that must be present in every query.',
            interviewAngle: 'The shard key is the whole decision. Choosing one that is absent from a common query means that query fans out to every shard.',
            buildsOn: ['read-your-writes'],
            blocks: [
                {
                    type: 'table',
                    title: 'The strategies',
                    headers: ['Strategy', 'How', 'Strength', 'Weakness'],
                    rows: [
                        ['Range', 'A–M on shard 1, N–Z on shard 2', 'Range scans stay on one shard', '<strong>Skew, and a hot shard for sequential keys</strong>'],
                        ['Hash', '<code>hash(key) % N</code>', 'Even distribution', 'No range scans; <strong>resharding moves nearly everything</strong>'],
                        ['Consistent hash', 'Keys and nodes on a ring', 'Adding a node moves ~1/N of the keys', 'More machinery; still needs virtual nodes for evenness'],
                        ['Directory', 'A lookup table from key to shard', 'Complete flexibility; move one tenant at a time', 'The directory is a dependency on every query'],
                        ['Geographic', 'By region', 'Data residency, and low local latency', 'Cross-region queries; uneven regions']
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>The shard key decides everything else. A query that includes it goes to one shard; a query that does not must be sent to <em>all</em> of them and the results merged — which is slower than the unsharded version was, and gets slower as you add shards.</p><p>So the choice is made from the access patterns rather than from the data model. <code>tenantId</code> is usually right for a B2B product because nearly every query is within one tenant. <code>userId</code> is usually right for consumer products. An <code>orderId</code> is usually wrong, because "all orders for this customer" is the common query and it would fan out.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Cross-shard transactions do not exist, and neither do cross-shard foreign keys or joins.</strong> Everything the database was doing for free becomes application code: a saga instead of a transaction, application-level validation instead of a foreign key, and a scatter-gather instead of a join. That is the same list as database-per-service from the boundaries module, which is worth noticing — sharding is a distributed data problem whether or not the services are distributed.</p>'
                }
            ],
            docs: [
                { title: 'PostgreSQL 16 — Partitioning', url: 'https://www.postgresql.org/docs/16/ddl-partitioning.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'sql-databases', questionId: 'partitioning-and-sharding' }
            ]
        },

        {
            id: 'consistent-hashing',
            title: 'Consistent Hashing',
            importance: 'should-know',
            summary: 'Place nodes and keys on a ring; a key belongs to the next node clockwise. Adding a node moves only the keys between it and its predecessor, rather than remapping everything.',
            interviewAngle: 'The problem it solves is the one to lead with: modulo hashing remaps almost every key when N changes, which is a total cache miss or a full data migration.',
            buildsOn: ['sharding-strategies'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>With <code>hash(key) % N</code>, changing <em>N</em> changes the destination of nearly every key. Going from four nodes to five remaps around 80% of them — for a cache that is a near-total miss and a stampede against the origin; for a data store it is a migration of most of the data.</p><p><strong>Consistent hashing</strong> maps both keys and nodes onto the same circular space. A key belongs to the first node clockwise from it. Adding a node captures only the keys between it and its predecessor: <strong>about 1/N of them move, and no other key changes owner.</strong></p>'
                },
                {
                    type: 'diagram',
                    diagramType: 'flowchart',
                    title: 'Adding a node moves one arc, not the whole ring',
                    diagramConfig: {
                        nodes: [
                            { id: 'a',   label: 'Node A\nat 0°',                 kind: 'process' },
                            { id: 'b',   label: 'Node B\nat 120°',               kind: 'process' },
                            { id: 'c',   label: 'Node C\nat 240°',               kind: 'process' },
                            { id: 'k',   label: 'key hashes to 90°',             kind: 'start' },
                            { id: 'd',   label: 'Node D added\nat 60°',          kind: 'decision' },
                            { id: 'move',label: 'Only keys in 0°–60°\nmove to D', kind: 'end' }
                        ],
                        edges: [
                            { from: 'k', to: 'b',    label: 'next node clockwise' },
                            { from: 'a', to: 'b',    label: 'arc 0°–120° owned by B' },
                            { from: 'b', to: 'c' },
                            { from: 'd', to: 'move', label: 'takes the arc 0°–60°' },
                            { from: 'c', to: 'a',    label: 'ring closes' }
                        ]
                    }
                },
                {
                    type: 'tip',
                    html: '<p><strong>Virtual nodes are what make it work in practice.</strong> Three physical nodes placed once each on the ring divide it very unevenly by chance, so one takes far more than its share. Placing each physical node at a hundred or more positions averages the arcs out, and it also means that when a node leaves, its keys are redistributed across <em>all</em> the survivors rather than dumped on one neighbour. Every real implementation — Cassandra, DynamoDB, Redis Cluster\'s hash slots — does some version of this.</p>'
                }
            ],
            docs: [
                { title: 'Consistent Hashing', url: 'https://www.toptal.com/big-data/consistent-hashing', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'caching-scale', questionId: 'consistent-hashing' }
            ]
        },

        {
            id: 'hot-partitions',
            title: 'Hot Partitions',
            importance: 'must-know',
            summary: 'An even hash does not mean even traffic. One celebrity user, one large tenant or one popular product concentrates load on a single shard, and the system is limited by that shard.',
            interviewAngle: 'The failure that survives a good sharding scheme. Naming the mitigations — key salting, a dedicated shard, a cache in front — shows the problem has been met.',
            buildsOn: ['consistent-hashing'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>Hashing distributes <em>keys</em> evenly. It says nothing about how much traffic each key attracts. One tenant with a million users, one product on the front page, one account being scraped — each concentrates a disproportionate share of the load on the single shard that owns it, and the system\'s capacity becomes that shard\'s capacity.</p><p>The same shape appears in Kafka, where a hot key means one partition and therefore one consumer does most of the work; the mechanism is identical and the module\'s key-choice chapter is the same advice.</p>'
                },
                {
                    type: 'types',
                    title: 'The mitigations',
                    items: [
                        { name: 'A cache in front', html: '<p>A hot key is by definition read repeatedly, so it caches extremely well. <strong>Try this first</strong> — it is the cheapest and it often ends the problem.</p>' },
                        { name: 'Key salting', html: '<p>Split the hot key into <code>key:0</code> … <code>key:9</code> across shards and fan out on read. Works for writes; makes reads more expensive for every key, so apply it only to the ones that need it.</p>' },
                        { name: 'A dedicated shard', html: '<p>Give the largest tenant its own database. Common in B2B, and it also isolates their load from everybody else\'s.</p>' },
                        { name: 'A read replica for that shard', html: '<p>If the heat is reads, replicate the hot shard specifically rather than everything.</p>' },
                        { name: 'Rate limit the key', html: '<p>Cap what any single key can consume, so one runaway tenant cannot degrade the rest — the bulkhead argument applied to data.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Monitoring the average across shards hides this completely.</strong> Nine shards at 20% and one at 95% is an average of 27%, which looks like plenty of headroom while the system is in fact saturated. Alert on the <strong>maximum</strong> per shard and on the spread between shards, not on the mean — the same lesson the Kafka lag chapter drew about per-partition figures.</p>'
                }
            ],
            docs: [
                { title: 'DynamoDB — Partition key design', url: 'https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-design.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'kafka-messaging', questionId: 'partitions-and-ordering' }
            ]
        },

        {
            id: 'cap-theorem-properly',
            title: 'CAP, Properly',
            importance: 'must-know',
            summary: 'During a network partition you must choose between consistency and availability. It says nothing about the other 99.9% of the time, and "pick two" is a misreading.',
            interviewAngle: 'Nearly always quoted wrongly. Stating that the choice only applies during a partition, and that P is not optional, is the correction that lands.',
            buildsOn: ['hot-partitions'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>The theorem says: in the presence of a network <strong>partition</strong>, a distributed system must choose between <strong>consistency</strong> — every read sees the latest write — and <strong>availability</strong> — every request receives a non-error response.</p><p>Two things follow, and both contradict the usual telling. <strong>Partition tolerance is not a choice.</strong> Networks partition; a system that cannot tolerate that is a system that breaks, so "CA" is not an option you get to pick — it describes a single machine. And the choice <strong>only applies during a partition</strong>. When the network is healthy, a system can be both consistent and available, and almost all of them are, almost all of the time.</p>'
                },
                {
                    type: 'table',
                    title: 'What a system does when the network splits',
                    headers: ['Behaviour', 'Choice', 'Examples'],
                    rows: [
                        ['Refuse writes on the minority side', '<strong>CP</strong>', 'PostgreSQL with synchronous replication; etcd; ZooKeeper; MongoDB by default'],
                        ['Accept writes on both sides, reconcile later', '<strong>AP</strong>', 'Cassandra and DynamoDB in their eventually-consistent modes'],
                        ['Configurable per operation', 'Both', 'Cassandra tunable consistency; DynamoDB\'s strongly-consistent read flag'],
                        ['"CA"', '<strong>Not a real option</strong>', 'A single node. There is no partition to survive.']
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>The answer that shows the theorem is understood rather than recited: <em>"CAP only tells you what happens during a partition, and partition tolerance is not optional. The real question is what the system does when the network splits — does it refuse writes on the minority side, or accept them and reconcile? And the more useful question for design is PACELC, because it also asks what the system trades when there is no partition at all."</em></p>'
                }
            ],
            docs: [
                { title: 'CAP Twelve Years Later', url: 'https://www.infoq.com/articles/cap-twelve-years-later-how-the-rules-have-changed/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'caching-scale', questionId: 'cap-and-what-it-actually-says' }
            ]
        },

        {
            id: 'pacelc',
            title: 'PACELC',
            importance: 'should-know',
            summary: 'If there is a Partition, choose Availability or Consistency; Else, choose Latency or Consistency. The second half describes the trade a system makes every day.',
            interviewAngle: 'A differentiator, because it describes the decision that is actually being made — synchronous replication costs latency on every write, partition or not.',
            buildsOn: ['cap-theorem-properly'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>CAP describes an exceptional condition. PACELC adds the ordinary one: <strong>even with no partition, a system trades latency against consistency.</strong> Waiting for a replica to acknowledge is slower and more consistent; not waiting is faster and allows a stale read.</p><p>That is the trade a system makes on every single write, which makes it far more relevant to a design conversation than the partition case — and it is exactly the <code>synchronous_commit</code> table from earlier in this module, expressed as a principle.</p>'
                },
                {
                    type: 'table',
                    title: 'Classifying real systems',
                    headers: ['System', 'If Partition', 'Else', 'Reading'],
                    rows: [
                        ['PostgreSQL, async replication', 'PA', 'EL', 'Fast writes; replicas lag; a failover can lose recent writes'],
                        ['PostgreSQL, sync replication', 'PC', 'EC', 'No lost writes; every write pays the replica round trip'],
                        ['Cassandra, default', 'PA', 'EL', 'Always writable, always fast, eventually consistent'],
                        ['Cassandra, <code>QUORUM</code>', 'PC', 'EC', 'Consistent, and slower on both reads and writes'],
                        ['DynamoDB', 'PA', 'EL', 'Strongly-consistent reads available per request, at double the cost'],
                        ['etcd, ZooKeeper', 'PC', 'EC', 'Consistency always; these hold configuration and leadership']
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>The practical reading of the table: <strong>the choice is usually per operation rather than per system.</strong> Cassandra and DynamoDB both let a single call ask for stronger consistency at higher cost, and PostgreSQL lets a session choose its <code>synchronous_commit</code> level. Designing at that granularity — strong for a balance transfer, eventual for a view counter — is what the modern databases are built for, and describing that is a better answer than classifying a whole system.</p>'
                }
            ],
            docs: [
                { title: 'Consistency Tradeoffs in Modern Distributed Database System Design', url: 'https://www.cs.umd.edu/~abadi/papers/abadi-pacelc.pdf', kind: 'spec' }
            ],
            relatedQuestions: [
                { topicId: 'caching-scale', questionId: 'cap-and-what-it-actually-says' }
            ]
        },

        {
            id: 'quorum-reads-and-writes',
            title: 'Quorums',
            importance: 'should-know',
            summary: 'With N replicas, requiring W acknowledgements to write and R to read gives strong consistency when R + W > N — because the read set and the write set must overlap.',
            interviewAngle: 'The R + W > N inequality is a compact, checkable piece of knowledge, and being able to say why it works is better than quoting it.',
            buildsOn: ['pacelc'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>With <em>N</em> replicas, a write is acknowledged once <em>W</em> of them have it and a read consults <em>R</em> of them and takes the newest value. If <code>R + W &gt; N</code>, the two sets cannot be disjoint — <strong>at least one replica in the read set participated in the write</strong> — so the read is guaranteed to see it.</p><p>The tuning is the useful part. Raising W makes writes slower and more durable; raising R makes reads slower and more current. Lowering either makes that operation faster and gives up the overlap guarantee.</p>'
                },
                {
                    type: 'table',
                    title: 'Common settings at N = 3',
                    headers: ['W', 'R', 'R+W>N?', 'Behaviour'],
                    rows: [
                        ['3', '1', 'Yes', 'Fast reads, slow writes, no write survives a single replica being down'],
                        ['<strong>2</strong>', '<strong>2</strong>', '<strong>Yes</strong>', '<strong>Balanced quorum. Tolerates one replica down for both.</strong>'],
                        ['1', '3', 'Yes', 'Fast writes, slow reads, a write is lost if that one replica dies'],
                        ['1', '1', '<strong>No</strong>', 'Fastest, eventually consistent, a read can miss a recent write'],
                        ['2', '1', 'No', 'A read may miss the newest value']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A quorum gives consistency, not isolation.</strong> Two clients that both read a value, both modify it and both write it back at quorum will still lose one of the updates — the classic lost update, unchanged. Quorums answer "will I see the latest committed value"; they do not answer "can two writers interleave". For that you need a conditional write, a compare-and-set or a transaction, which is the same conclusion the transactions module reached about read-committed isolation.</p>'
                }
            ],
            docs: [
                { title: 'DynamoDB — Read consistency', url: 'https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadConsistency.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'transactions', questionId: 'lost-update' },
                { topicId: 'caching-scale', questionId: 'eventual-consistency-in-practice' }
            ]
        }
    ]
};
