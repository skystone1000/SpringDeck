/* ==========================================================================
   data/theory/indexes-and-plans.js — module 44 in the reading path

   Ten chapters. The plan's tagline is the framing: why the index you added
   is not being used. Every chapter after the first is an answer to that
   question, and the EXPLAIN chapter is the one that turns the rest from
   trivia into a procedure.
   ========================================================================== */

const indexesAndPlansModule = {
    id: 'indexes-and-plans',
    trackId: 'persistence',
    order: 44,
    title: 'Indexes and Execution Plans',
    tagline: 'Why the index you added is not being used.',
    estimatedMinutes: 45,
    prerequisites: ['sql-you-are-asked'],
    docHub: { title: 'PostgreSQL — Indexes', url: 'https://www.postgresql.org/docs/current/indexes.html' },

    chapters: [
        {
            id: 'b-tree-index',
            title: 'What a B-Tree Index Is',
            importance: 'must-know',
            summary: 'A balanced tree of sorted keys, three or four levels deep for almost any table size, with the row locations at the leaves.',
            interviewAngle: 'The mechanism question. The number worth having is the depth: a billion-row table is three or four levels, so a lookup is a handful of page reads rather than a scan — which is why the structure matters more than the size.',
            buildsOn: [],
            blocks: [
                {
                    type: 'definition',
                    term: 'B-tree index',
                    important: true,
                    html: '<p>A balanced search tree whose nodes are disk pages. Internal nodes hold key ranges and pointers; leaves hold keys in sorted order, each with a pointer to the row. Every leaf is at the same depth, which is what makes the lookup cost uniform — no key is slower to find than any other.</p>'
                },
                {
                    type: 'prose',
                    html: '<p>The fan-out is what makes it fast. An 8KB page holds hundreds of keys, so each level multiplies the reachable rows by that factor: three levels reach tens of millions, four reach billions. A point lookup is therefore three or four page reads, and the upper levels are almost always already in memory — so in practice it is one physical read.</p><p>The leaves are also <strong>linked in order</strong>, which is why a B-tree serves more than equality. A range scan walks the leaves; an <code>ORDER BY</code> matching the index order needs no sort at all; and <code>MIN</code> or <code>MAX</code> is one end of the structure.</p>'
                },
                {
                    type: 'types',
                    title: 'What a B-tree can answer without a sort',
                    items: [
                        { name: 'Equality', html: '<p><code>WHERE id = 42</code>. The obvious one.</p>' },
                        { name: 'Range', html: '<p><code>BETWEEN</code>, <code>&lt;</code>, <code>&gt;</code> — descend once, then walk the linked leaves.</p>' },
                        { name: 'Prefix match', html: '<p><code>LIKE \'abc%\'</code> is a range. <code>LIKE \'%abc\'</code> is not, and no B-tree can help with it.</p>' },
                        { name: 'ORDER BY', html: '<p>If the sort matches the index order and direction, the sort is free.</p>' },
                        { name: 'MIN and MAX', html: '<p>One end of the index. No scan.</p>' },
                        { name: 'IS NULL', html: '<p>In PostgreSQL, yes — nulls are stored in the index. Not true of every engine.</p>' }
                    ]
                }
            ],
            docs: [
                { title: 'PostgreSQL — Index Types', url: 'https://www.postgresql.org/docs/current/indexes-types.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'sql-databases', questionId: 'how-btree-indexes-work' }
            ]
        },

        {
            id: 'composite-index-column-order',
            title: 'Column Order in a Composite Index',
            importance: 'must-know',
            summary: 'An index on (a, b, c) serves queries filtering on a, on a and b, and on all three. It does nothing for a query filtering only on b.',
            interviewAngle: 'The highest-value index question, because it explains a real and frequent failure: an index exists, covers the column in the WHERE clause, and is not used. The leftmost-prefix rule is the answer.',
            buildsOn: ['b-tree-index'],
            blocks: [
                {
                    type: 'definition',
                    term: 'Leftmost prefix rule',
                    important: true,
                    html: '<p>A composite index is sorted by its first column, then by its second within each value of the first, and so on. So it can be used for any <strong>leading prefix</strong> of its column list, and not for a suffix — the second column\'s values are only ordered <em>within</em> a value of the first, so they are scattered through the index as a whole.</p>'
                },
                {
                    type: 'table',
                    title: 'An index on (tenant_id, status, created_at)',
                    headers: ['Query filters on', 'Index used', 'Why'],
                    rows: [
                        ['<code>tenant_id</code>', '<strong>Yes</strong>', 'The leading column'],
                        ['<code>tenant_id, status</code>', '<strong>Yes</strong>', 'A leading prefix'],
                        ['<code>tenant_id, status, created_at</code>', '<strong>Yes</strong>, fully', 'The whole key'],
                        ['<code>status</code>', '<strong>No</strong>', 'Not a prefix. Status values are scattered'],
                        ['<code>status, created_at</code>', '<strong>No</strong>', 'Same'],
                        ['<code>tenant_id, created_at</code>', 'Partly', 'Seeks on tenant, then filters — <code>created_at</code> is not ordered without <code>status</code>'],
                        ['<code>tenant_id</code> range, <code>status</code>', 'Partly', 'A range on a column stops the ones after it being used for seeking']
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>The rule for ordering the columns, in order of priority: <strong>equality predicates first, then the column you sort by, then range predicates last.</strong> A range on a column ends the useful part of the index — everything after it can only be filtered, not sought — so putting a range column early wastes the columns behind it.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>An index on <code>(a, b)</code> makes a separate index on <code>(a)</code> redundant, and people add both.</strong> The redundant one costs write time on every insert and update, and space in the buffer cache that a useful index could have had. The reverse is not true: <code>(a)</code> does not cover <code>(a, b)</code>. Before adding an index, check whether an existing one already begins with the same column.</p>'
                }
            ],
            docs: [
                { title: 'PostgreSQL — Multicolumn Indexes', url: 'https://www.postgresql.org/docs/current/indexes-multicolumn.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'sql-databases', questionId: 'composite-index-column-order' }
            ]
        },

        {
            id: 'covering-index',
            title: 'Covering Indexes',
            importance: 'should-know',
            summary: 'If every column a query needs is in the index, the table is never touched. That turns two reads into one and is often the largest single win available.',
            interviewAngle: 'A depth question that shows the candidate understands what an index lookup actually costs — the index seek finds a row location, and fetching the row is a second read that the plan calls a heap fetch.',
            buildsOn: ['composite-index-column-order'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'sql',
                    title: 'Two ways to cover the same query',
                    code: '-- The query. It needs status and created_at to filter and sort,\n-- and total to return.\nSELECT total FROM orders\nWHERE  tenant_id = 7 AND status = \'PAID\'\nORDER BY created_at DESC\nLIMIT 20;\n\n-- 1. Everything in the key. total participates in ordering it,\n--    which is wasted work and a wider key.\nCREATE INDEX ON orders (tenant_id, status, created_at DESC, total);\n\n-- 2. INCLUDE: total is stored at the leaves and NOT part of the key.\nCREATE INDEX ON orders (tenant_id, status, created_at DESC) INCLUDE (total);',
                    output: {
                        kind: 'trace',
                        lines: [
                            'Checked against PostgreSQL 16.',
                            'Without either index, the plan seeks the index and then fetches each matching row from the table -- twenty extra random reads for twenty rows.',
                            'With either index, EXPLAIN reports Index Only Scan and the heap fetches disappear.',
                            'INCLUDE, added in PostgreSQL 11, is the better form: the included column is not sorted, so the key stays narrow and more entries fit per page.',
                            'PostgreSQL qualifies this with visibility: an index-only scan still consults the visibility map, so a table with many recent updates can report Heap Fetches above zero until it is vacuumed.'
                        ],
                        explain: '<p>The visibility caveat is specific to PostgreSQL\'s MVCC and worth knowing, because it explains an index-only scan that is unexpectedly slow: the index does not record whether a row version is visible to this transaction, so the heap must be consulted for any page not marked all-visible. <code>VACUUM</code> is what marks them.</p>'
                    }
                },
                {
                    type: 'tip',
                    html: '<p>Covering is a targeted optimisation rather than a default. Every included column widens the index, which costs write throughput and cache space. Reach for it when one specific query is hot and its heap fetches dominate the plan — not as a habit.</p>'
                }
            ],
            docs: [
                { title: 'PostgreSQL — Index-Only Scans', url: 'https://www.postgresql.org/docs/current/indexes-index-only-scans.html', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'index-selectivity',
            title: 'Selectivity',
            importance: 'must-know',
            summary: 'An index is worth using when it eliminates most of the table. On a column with three distinct values it eliminates two thirds, and a sequential scan is cheaper.',
            interviewAngle: 'The answer to "I added an index and the plan ignores it" in the case where nothing is wrong with the index. The planner is right: reading 30% of a table through an index is slower than reading all of it in order.',
            buildsOn: ['b-tree-index'],
            blocks: [
                {
                    type: 'definition',
                    term: 'Selectivity',
                    html: '<p>The fraction of rows a predicate keeps. High selectivity means few rows survive — an id lookup is the extreme — and low selectivity means most do. An index pays for itself only when selectivity is high, because each matching row costs a random read and a sequential scan reads pages in order.</p>'
                },
                {
                    type: 'prose',
                    html: '<p>The crossover is lower than intuition suggests. Random reads are much more expensive than sequential ones, so once a query matches somewhere around 5–20% of a table, reading the whole thing in physical order wins. A boolean column, a status with four values, a soft-delete flag — none of them is worth an index on its own, and the planner declining to use one is the planner being correct.</p><p>The same column can still be useful <em>inside</em> a composite index, where it narrows a set that a selective leading column has already reduced. Selectivity is a property of the predicate against the data, not of the column in isolation.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Skewed data makes one value selective and another not, and the planner needs statistics to tell them apart.</strong> If 95% of orders are <code>ARCHIVED</code>, then <code>status = \'PENDING\'</code> is highly selective and <code>status = \'ARCHIVED\'</code> is not — and PostgreSQL will use the index for one and not the other, correctly, from the same query text. If the plan looks wrong, run <code>ANALYZE</code>: stale statistics are the most common cause of a genuinely bad plan choice.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>A <strong>partial index</strong> is the right tool for a skewed column: <code>CREATE INDEX ON orders (created_at) WHERE status = \'PENDING\'</code> indexes 5% of the table, so it is small, cache-resident, and cheap to maintain — while the 95% that nobody queries this way costs nothing. This is the single most underused index feature.</p>'
                }
            ],
            docs: [
                { title: 'PostgreSQL — Partial Indexes', url: 'https://www.postgresql.org/docs/current/indexes-partial.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'sql-databases', questionId: 'why-is-my-index-not-used' }
            ]
        },

        {
            id: 'when-an-index-hurts',
            title: 'The Cost Side',
            importance: 'should-know',
            summary: 'Every index is maintained on every insert, update and delete of the columns it covers. A table with twelve indexes has a twelve-times write amplification on those columns.',
            interviewAngle: 'The half of the index conversation most candidates never mention. Being able to say what an index costs, and to name a way to find unused ones, turns a recall answer into an operational one.',
            buildsOn: ['index-selectivity'],
            blocks: [
                {
                    type: 'types',
                    title: 'What an index costs',
                    items: [
                        { name: 'Write amplification', html: '<p>An insert writes the row and every index. An update writes every index whose columns changed — and in PostgreSQL, sometimes all of them, since a non-HOT update rewrites the row version.</p>' },
                        { name: 'Space', html: '<p>Indexes routinely exceed the table. That is buffer cache the data itself is not using.</p>' },
                        { name: 'Planning time', html: '<p>More candidate paths to cost. Small per query, and measurable on a table with thirty indexes.</p>' },
                        { name: 'Lock contention on the hot end', html: '<p>A sequential key means every insert touches the same rightmost page — the reason the UUID discussion in the modelling module went the way it did, seen from the other side.</p>' },
                        { name: 'Bloat', html: '<p>Deleted entries leave dead space until vacuum reclaims it. A high-churn index grows and needs periodic rebuilding.</p>' }
                    ]
                },
                {
                    type: 'syntax',
                    language: 'sql',
                    title: 'Finding the ones nobody uses',
                    code: '-- Indexes never used since statistics were last reset.\nSELECT   relname AS table, indexrelname AS index,\n         idx_scan, pg_size_pretty(pg_relation_size(indexrelid)) AS size\nFROM     pg_stat_user_indexes\nWHERE    idx_scan = 0\n  AND    indexrelid NOT IN (SELECT conindid FROM pg_constraint)\nORDER BY pg_relation_size(indexrelid) DESC;',
                    notes: '<p>Read the counter over a full business cycle before dropping anything — an index used only by a month-end report will show zero scans for four weeks. Excluding constraint-backing indexes matters too: dropping the index behind a unique constraint drops the constraint.</p>'
                },
                {
                    type: 'tip',
                    html: '<p><code>CREATE INDEX CONCURRENTLY</code> builds without taking a write lock, which is the difference between adding an index at 3am and adding one during business hours. It is slower, it can fail and leave an invalid index behind that must be dropped, and it cannot run inside a transaction — so a migration tool has to be told to run it outside one. All three of those facts are worth knowing before the first attempt.</p>'
                }
            ],
            docs: [
                { title: 'PostgreSQL — Building Indexes Concurrently', url: 'https://www.postgresql.org/docs/current/sql-createindex.html', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'function-on-column-kills-the-index',
            title: 'A Function on the Column',
            importance: 'must-know',
            summary: 'An index stores the column values. Wrap the column in a function and the stored values no longer match what is being compared.',
            interviewAngle: 'The other main answer to "why is my index not used", and a satisfying one because the fix is mechanical. Knowing that an expression index exists — and that a range rewrite is usually better — is the complete answer.',
            buildsOn: ['index-selectivity'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'sql',
                    title: 'Four ways to defeat an index, and their fixes',
                    code: '-- The index:  CREATE INDEX ON orders (created_at);\n\n-- 1. A function on the column. Sequential scan.\nWHERE DATE(created_at) = \'2026-09-01\'\n-- Fix: express it as a range on the raw column.\nWHERE created_at >= \'2026-09-01\' AND created_at < \'2026-09-02\'\n\n-- 2. Arithmetic on the column.\nWHERE amount * 100 > 5000        ->   WHERE amount > 50\n\n-- 3. An implicit cast. The index is on a varchar; the parameter is\n--    a number, so the COLUMN gets cast, not the parameter.\nWHERE account_no = 12345         ->   WHERE account_no = \'12345\'\n\n-- 4. A leading wildcard. No B-tree can help.\nWHERE name LIKE \'%smith%\'\n-- Fix: a trigram index, or full-text search.\nCREATE INDEX ON customer USING gin (name gin_trgm_ops);\n\n-- When the expression is genuinely needed, index the expression:\nCREATE INDEX ON users (lower(email));\n-- and the query must then use exactly lower(email) = lower(?).',
                    output: {
                        kind: 'trace',
                        lines: [
                            'Checked against PostgreSQL 16.',
                            'The reason is the same in all four cases: the index holds the column values in sorted order, and the predicate is comparing something else -- a derived value the index knows nothing about.',
                            'Case 3 is the sneakiest, because nothing in the SQL looks like a function call. The cast is inserted by the parser, on the column side, and the plan shows a sequential scan with no explanation.',
                            'Case 1 also has a correctness dimension: DATE(created_at) on a timestamptz column applies the session time zone, so the same query returns different rows for two clients.'
                        ],
                        explain: '<p>The range rewrite in case 1 is better than an expression index for a second reason beyond performance: the half-open range <code>&gt;= day AND &lt; next day</code> is time-zone explicit and boundary-correct, whereas <code>DATE(...)</code> silently depends on session state.</p>'
                    }
                },
                {
                    type: 'tip',
                    html: '<p>Keep the column bare on the left-hand side. It is a short rule that covers all four cases: if the indexed column appears wrapped in anything — a function, arithmetic, a cast — the index is not going to be used, and the fix is to move the transformation to the other side of the comparison.</p>'
                }
            ],
            docs: [
                { title: 'PostgreSQL — Indexes on Expressions', url: 'https://www.postgresql.org/docs/current/indexes-expressional.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'sql-databases', questionId: 'why-is-my-index-not-used' }
            ]
        },

        {
            id: 'reading-explain-analyze',
            title: 'Reading EXPLAIN ANALYZE',
            importance: 'must-know',
            summary: 'Read it inside out and bottom up. The two numbers that matter are the ratio of estimated to actual rows, and where the time is actually spent.',
            interviewAngle: 'The most useful practical skill in this module. "I would look at the plan" is a weak answer; "I would compare estimated against actual rows to find where the planner is wrong" is a procedure.',
            buildsOn: ['function-on-column-kills-the-index'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'sql',
                    title: 'The invocation, and the plan it produces',
                    code: 'EXPLAIN (ANALYZE, BUFFERS, VERBOSE)\nSELECT c.name, COUNT(*)\nFROM   customer c JOIN orders o ON o.customer_id = c.id\nWHERE  o.created_at >= DATE \'2026-01-01\'\nGROUP BY c.id, c.name;',
                    output: {
                        kind: 'trace',
                        lines: [
                            'Checked against PostgreSQL 16. EXPLAIN alone estimates; ANALYZE actually runs the query -- including any INSERT or UPDATE, so wrap those in a transaction you roll back.',
                            'Read inside out: the most indented node runs first, and each node feeds its parent.',
                            'rows=1000 vs actual rows=2500000 is the line to look for. A large estimate error means every decision above that node was made on a wrong number, and the fix is statistics, not a hint.',
                            'actual time=... is cumulative and includes the children, so a node\'s own cost is its time minus its children\'s. A node whose own share is small is not the problem however large its total looks.',
                            'loops=N multiplies: a node showing 0.8ms with loops=5000 spent four seconds.',
                            'BUFFERS distinguishes cache hits from disk reads, which is what separates "this query is slow" from "this query was slow once, cold".'
                        ],
                        explain: '<p>The procedure, in order: find the node with the largest estimate-to-actual ratio, because that is where the planner was misled; then find the node with the largest own-time share; then check <code>loops</code> before believing either. Everything else is detail.</p>'
                    }
                },
                {
                    type: 'types',
                    title: 'The node types worth recognising immediately',
                    items: [
                        { name: 'Seq Scan', html: '<p>Reads the whole table. Correct for a small table or a low-selectivity predicate; a finding on a large one with a selective filter.</p>' },
                        { name: 'Index Scan', html: '<p>Seeks the index, then fetches rows from the table.</p>' },
                        { name: 'Index Only Scan', html: '<p>The index answered everything. Check <code>Heap Fetches</code> — a high number means it did not, quite.</p>' },
                        { name: 'Bitmap Heap Scan', html: '<p>Collect row locations from an index, sort them, then read the table in physical order. The middle ground when a predicate matches too many rows for an index scan and too few for a sequential one.</p>' },
                        { name: 'Nested Loop', html: '<p>For each outer row, probe the inner side. Excellent with few outer rows; catastrophic when the estimate said ten and the truth is a million.</p>' },
                        { name: 'Hash Join', html: '<p>Build a hash of one side, probe with the other. The usual choice for large equijoins.</p>' },
                        { name: 'Merge Join', html: '<p>Both sides sorted, walked together. Cheap when the sorts are free because indexes provide the order.</p>' },
                        { name: 'Sort, with Disk', html: '<p>The sort spilled. <code>work_mem</code> is too small for this query, and raising it is per-connection.</p>' }
                    ]
                }
            ],
            docs: [
                { title: 'PostgreSQL — Using EXPLAIN', url: 'https://www.postgresql.org/docs/current/using-explain.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'sql-databases', questionId: 'reading-an-explain-plan' }
            ]
        },

        {
            id: 'seq-scan-vs-index-scan',
            title: 'When a Sequential Scan Is Right',
            importance: 'should-know',
            summary: 'A sequential scan on a large table is not automatically a problem. It is the correct plan whenever the query needs a large fraction of the rows.',
            interviewAngle: 'A judgement question that catches people who treat Seq Scan as a defect. The interviewer is checking whether you can say when the planner is right rather than only when it is wrong.',
            buildsOn: ['reading-explain-analyze'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'Which one the planner should choose',
                    left: 'Sequential scan wins',
                    right: 'Index scan wins',
                    rows: [
                        { aspect: 'Rows matched', left: 'A large fraction — roughly 5–20% upward', right: 'A small fraction' },
                        { aspect: 'IO pattern', left: '<strong>Sequential</strong>, prefetchable', right: 'Random, one seek per row' },
                        { aspect: 'Table size', left: 'Small tables, always — an index is not worth a level', right: 'Large tables with selective predicates' },
                        { aspect: 'The query', left: 'Aggregating everything, exporting, a full report', right: 'Point lookup, small range, top-N' },
                        { aspect: 'Parallelism', left: '<strong>Parallelises well</strong>', right: 'Less so' },
                        { aspect: 'If it looks wrong', left: 'Check statistics with <code>ANALYZE</code>', right: 'Check for a function on the column' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Disabling a scan type to "fix" a plan is a diagnostic, not a solution.</strong> <code>SET enable_seqscan = off</code> tells you what the alternative plan would have cost, which is genuinely useful information — if the index plan is slower, the planner was right and the investigation moves elsewhere. Leaving it off in production means every query in that session is planned under a lie. PostgreSQL deliberately has no query hints for exactly this reason.</p>'
                }
            ],
            docs: [
                { title: 'PostgreSQL — Planner Method Configuration', url: 'https://www.postgresql.org/docs/current/runtime-config-query.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'sql-databases', questionId: 'why-is-my-index-not-used' }
            ]
        },

        {
            id: 'join-algorithms',
            title: 'The Three Join Algorithms',
            importance: 'should-know',
            summary: 'Nested loop, hash join and merge join. Which one appears tells you what the planner believed about the row counts.',
            interviewAngle: 'A depth question, and the useful version connects it to the previous chapter: a nested loop where a hash join belonged is almost always a bad estimate rather than a bad algorithm.',
            buildsOn: ['reading-explain-analyze'],
            blocks: [
                {
                    type: 'table',
                    title: 'The three',
                    headers: ['Algorithm', 'How', 'Good when', 'Fails when'],
                    rows: [
                        ['<strong>Nested loop</strong>', 'For each outer row, probe the inner', 'Few outer rows, indexed inner side', '<strong>The outer estimate was wrong</strong> — the cost is multiplied'],
                        ['<strong>Hash join</strong>', 'Hash the smaller side, probe with the larger', 'Large equijoins, no useful index', 'The hash does not fit <code>work_mem</code> and spills to disk'],
                        ['<strong>Merge join</strong>', 'Sort both sides, walk together', 'Both sides already ordered by an index', 'A sort is needed and the inputs are large'],
                        ['—', 'Only hash and merge handle equality in bulk', 'Non-equality joins force a nested loop', 'A <code>&lt;</code> or <code>BETWEEN</code> join condition on two large tables']
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>The failure worth recognising in a plan is the nested loop with a bad outer estimate. The planner sees <code>rows=12</code>, decides twelve index probes are cheap, and picks a nested loop; the actual count is two million, so it performs two million probes. The plan is not wrong for the numbers it had — it is wrong because the numbers were wrong, which is why the fix is <code>ANALYZE</code>, better statistics targets, or an extended statistics object for correlated columns.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>PostgreSQL has no join hints, and the reasoning is worth agreeing with in an interview: a hint pins a decision made against today\'s data volumes, and the plan that is right at ten thousand rows is wrong at ten million. Fixing the estimate fixes every plan that depended on it, including the ones nobody has written yet.</p>'
                }
            ],
            docs: [
                { title: 'PostgreSQL — Planner Statistics', url: 'https://www.postgresql.org/docs/current/planner-stats.html', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'other-index-types',
            title: 'Beyond the B-Tree',
            importance: 'good-to-know',
            summary: 'GIN for containment, GiST for geometry and ranges, BRIN for enormous naturally-ordered tables, hash for equality only.',
            interviewAngle: 'A breadth question. Naming GIN for JSONB and full-text, and BRIN for a huge append-only table, covers what is realistically asked.',
            buildsOn: ['b-tree-index'],
            blocks: [
                {
                    type: 'types',
                    title: 'The others, and what each is for',
                    items: [
                        { name: 'GIN', html: '<p>Generalised inverted index: one entry per <em>element</em>, pointing at the rows containing it. For arrays, <code>JSONB</code> containment, and full-text search. Slow to update, very fast to search — the trade a search index always makes.</p>' },
                        { name: 'GiST', html: '<p>A framework for tree indexes over types with no total order: geometry, ranges, nearest-neighbour. PostGIS is built on it.</p>' },
                        { name: 'BRIN', html: '<p>Block range index: stores min and max per block range rather than per row. <strong>Tiny</strong> — kilobytes for a table of hundreds of gigabytes — and it only works when physical order correlates with the value, which is true of an append-only time series and false of almost everything else.</p>' },
                        { name: 'Hash', html: '<p>Equality only, no ranges, no ordering. Crash-safe and WAL-logged since PostgreSQL 10, and a B-tree is still usually the better choice because it does everything a hash index does and more.</p>' },
                        { name: 'Trigram (pg_trgm)', html: '<p>A GIN or GiST index over three-character sequences, which is what makes <code>LIKE \'%smith%\'</code> and fuzzy matching indexable.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>BRIN is the one worth raising unprompted on a large-table question, because the size difference is startling: an events table indexed on <code>created_at</code> might carry a multi-gigabyte B-tree, and the BRIN equivalent is a few dozen kilobytes. It answers a range query by skipping block ranges whose min-max cannot contain the value — which is only useful because rows arrived in time order, and that condition is the whole of when to use it.</p>'
                }
            ],
            docs: [
                { title: 'PostgreSQL — Index Types', url: 'https://www.postgresql.org/docs/current/indexes-types.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'sql-databases', questionId: 'index-types-beyond-btree' }
            ]
        }
    ]
};
