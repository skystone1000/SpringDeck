/* ==========================================================================
   data/sql-databases.js — SQL & Database Design

   Twenty-two questions in four subsections.

   EVERY SQL SNIPPET IS A `trace`, NOT A `stdout`. The runner executes Java and
   nothing else, so a console output claimed over SQL would be a guess. Where a
   snippet describes engine behaviour, the engine and version are named in the
   text — "PostgreSQL 16", never "SQL" — because plans, locking and even the
   meaning of an isolation level differ between engines.

   ONE GLOBAL PER FILE.
   ========================================================================== */

const sqlDatabasesData = {
    id: 'sql-databases',
    title: 'SQL & Database Design',
    subsections: [
        { id: 'querying',    title: 'Querying' },
        { id: 'modelling',   title: 'Modelling & Normalisation' },
        { id: 'performance', title: 'Indexes & Plans' },
        { id: 'ops',         title: 'Pooling, Migration & Scale' }
    ],
    keyTopics: [
        'joins', 'GROUP BY and HAVING', 'window functions', 'NULL semantics',
        'B-tree indexes', 'composite index column order', 'covering index',
        'EXPLAIN ANALYZE', 'sequential vs index scan', 'join algorithms',
        'normalisation', 'HikariCP sizing', 'pool exhaustion', 'Flyway',
        'read replicas', 'sharding'
    ],
    questions: [

/* ==== Querying ======================================================== */

{
    id: 'join-types',
    importance: 'must-know',
    subsection: 'querying',
    question: 'What are the join types, and when does a LEFT JOIN silently become an INNER JOIN?',
    answer:
        '<ul>' +
        '<li><strong><code>INNER JOIN</code></strong> — rows with a match on both sides.</li>' +
        '<li><strong><code>LEFT JOIN</code></strong> — every row from the left, with nulls where ' +
        'the right has no match.</li>' +
        '<li><strong><code>RIGHT JOIN</code></strong> — the mirror image. Rarely written, ' +
        'because reordering the tables makes it a <code>LEFT JOIN</code> and reads better.</li>' +
        '<li><strong><code>FULL OUTER JOIN</code></strong> — every row from both sides. Not ' +
        'supported by MySQL, which needs a <code>UNION</code> of two outer joins.</li>' +
        '<li><strong><code>CROSS JOIN</code></strong> — the cartesian product. Deliberate here, ' +
        'and accidental when a join condition is forgotten.</li>' +
        '</ul>' +
        '<p><strong>The silent conversion is the interesting part.</strong> Putting a condition ' +
        'on the right-hand table in the <code>WHERE</code> clause rather than in the ' +
        '<code>ON</code> clause turns a <code>LEFT JOIN</code> into an <code>INNER JOIN</code>: ' +
        'the outer join produces nulls for unmatched rows, and then the <code>WHERE</code> ' +
        'filters those nulls out, because <code>NULL = anything</code> is not true.</p>' +
        '<p>The rule: <strong>conditions on the outer table go in <code>ON</code>; conditions ' +
        'that should filter the whole result go in <code>WHERE</code>.</strong> For an inner ' +
        'join the two are equivalent and it does not matter.</p>' +
        '<p>Two related notes. <code>WHERE right.col IS NULL</code> after a ' +
        '<code>LEFT JOIN</code> is the anti-join idiom — "rows on the left with no match" — and ' +
        'is often faster than <code>NOT IN</code>. And <code>NOT IN</code> with a subquery that ' +
        'can return a null returns <em>no rows at all</em>, which is the single most surprising ' +
        'behaviour in SQL and follows directly from three-valued logic.</p>',
    referenceLinks: [
        { title: 'Joins Between Tables — PostgreSQL Documentation', url: 'https://www.postgresql.org/docs/current/tutorial-join.html' }
    ],
    tags: ['sql', 'joins', 'querying'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: [
        {
            language: 'sql',
            title: 'The same query, two different meanings',
            code:
                '-- Intended: every customer, with their 2026 orders if any.\n' +
                '-- Actual: only customers who HAVE a 2026 order. The WHERE clause\n' +
                '-- discards the NULL rows the LEFT JOIN just produced.\n' +
                'SELECT c.id, c.name, o.id AS order_id\n' +
                'FROM customers c\n' +
                'LEFT JOIN orders o ON o.customer_id = c.id\n' +
                "WHERE o.created_at >= DATE '2026-01-01';\n" +
                '\n' +
                '-- Correct: the date is part of what counts as a match.\n' +
                'SELECT c.id, c.name, o.id AS order_id\n' +
                'FROM customers c\n' +
                'LEFT JOIN orders o\n' +
                '       ON o.customer_id = c.id\n' +
                "      AND o.created_at >= DATE '2026-01-01';\n" +
                '\n' +
                '-- Anti-join: customers with no orders at all.\n' +
                'SELECT c.id, c.name\n' +
                'FROM customers c\n' +
                'LEFT JOIN orders o ON o.customer_id = c.id\n' +
                'WHERE o.id IS NULL;',
            output: {
                kind: 'trace',
                lines: [
                    'The LEFT JOIN emits a row for every customer, with NULLs where there is no order.',
                    'The WHERE clause then evaluates NULL >= DATE, which is UNKNOWN, not TRUE.',
                    'Those rows are discarded, so customers without a 2026 order disappear.',
                    'Moving the condition into ON makes it part of the match rather than a filter.',
                    'The anti-join keeps exactly the rows the join failed to match, which IS NULL selects.'
                ],
                explain:
                    '<p>Checked against PostgreSQL 16 semantics; the behaviour follows from the ' +
                    'SQL standard and is the same in MySQL 8 and Oracle. No row counts are ' +
                    'claimed because they depend entirely on the data.</p>'
            }
        }
    ]
},

{
    id: 'null-semantics',
    importance: 'must-know',
    subsection: 'querying',
    question: 'What is three-valued logic, and which comparisons does it break?',
    answer:
        '<p>SQL has <code>TRUE</code>, <code>FALSE</code> and <code>UNKNOWN</code>. Any ' +
        'comparison involving <code>NULL</code> produces <code>UNKNOWN</code>, and a ' +
        '<code>WHERE</code> clause keeps only rows where the predicate is <code>TRUE</code>.</p>' +
        '<p>What follows, and each of these has bitten someone:</p>' +
        '<ul>' +
        '<li><strong><code>NULL = NULL</code> is UNKNOWN</strong>, not true. Use ' +
        '<code>IS NULL</code>, or <code>IS NOT DISTINCT FROM</code> where the engine has ' +
        'it.</li>' +
        '<li><strong><code>WHERE status &lt;&gt; \'cancelled\'</code> excludes rows where status ' +
        'is NULL.</strong> The negation does not include the unknowns, which is almost never ' +
        'what the author meant.</li>' +
        '<li><strong><code>NOT IN</code> with any NULL in the list returns nothing.</strong> ' +
        '<code>x NOT IN (1, 2, NULL)</code> is <code>x &lt;&gt; 1 AND x &lt;&gt; 2 AND x ' +
        '&lt;&gt; NULL</code>, and the last term is UNKNOWN, so the whole conjunction can never ' +
        'be TRUE. <code>NOT EXISTS</code> does not have this problem and is the safe ' +
        'form.</li>' +
        '<li><strong>Aggregates skip NULLs.</strong> <code>COUNT(column)</code> counts non-null ' +
        'values while <code>COUNT(*)</code> counts rows, and <code>AVG</code> divides by the ' +
        'non-null count — so a NULL is not a zero.</li>' +
        '<li><strong><code>GROUP BY</code> treats NULLs as one group</strong>, and ' +
        '<code>UNIQUE</code> constraints generally allow several NULLs, because they are not ' +
        'equal to each other. Both are the opposite of the comparison rule and both are ' +
        'standard.</li>' +
        '</ul>' +
        '<p>The design lesson: <strong>NULL means "unknown", not "empty" or "zero"</strong>. A ' +
        'column that can be NULL forces every query against it to decide what unknown means. ' +
        'Prefer <code>NOT NULL</code> with a sensible default wherever the domain allows it — it ' +
        'removes a whole class of query bug, and it lets the planner make better decisions.</p>',
    referenceLinks: [
        { title: 'Comparison Functions and Operators — PostgreSQL Documentation', url: 'https://www.postgresql.org/docs/current/functions-comparison.html' }
    ],
    tags: ['sql', 'null', 'querying', 'three-valued-logic'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'group-by-and-having',
    importance: 'must-know',
    subsection: 'querying',
    question: 'What is the difference between WHERE and HAVING, and in what order does a query actually execute?',
    answer:
        '<p><code>WHERE</code> filters rows <em>before</em> grouping. <code>HAVING</code> filters ' +
        'groups <em>after</em>. So an aggregate can appear in <code>HAVING</code> and not in ' +
        '<code>WHERE</code>.</p>' +
        '<p>That follows from the logical execution order, which is different from the order the ' +
        'clauses are written in and is worth knowing because it explains several errors:</p>' +
        '<ul>' +
        '<li><code>FROM</code> and <code>JOIN</code></li>' +
        '<li><code>WHERE</code></li>' +
        '<li><code>GROUP BY</code></li>' +
        '<li><code>HAVING</code></li>' +
        '<li><code>SELECT</code> — including column aliases</li>' +
        '<li><code>DISTINCT</code></li>' +
        '<li><code>ORDER BY</code></li>' +
        '<li><code>LIMIT</code> / <code>OFFSET</code></li>' +
        '</ul>' +
        '<p>Because <code>SELECT</code> comes after <code>WHERE</code> and ' +
        '<code>GROUP BY</code>, <strong>an alias defined in <code>SELECT</code> cannot be used ' +
        'in <code>WHERE</code></strong> — it does not exist yet. It <em>can</em> be used in ' +
        '<code>ORDER BY</code>, which comes later. PostgreSQL and MySQL both allow the alias in ' +
        '<code>GROUP BY</code> as an extension, which makes the rule look inconsistent.</p>' +
        '<p><strong>Prefer <code>WHERE</code> whenever the condition does not involve an ' +
        'aggregate</strong>, because filtering before grouping is less work: fewer rows enter ' +
        'the grouping operation. A condition that could be in either belongs in ' +
        '<code>WHERE</code>.</p>' +
        '<p>One standard rule that MySQL historically relaxed: <strong>every non-aggregated ' +
        'column in <code>SELECT</code> must appear in <code>GROUP BY</code></strong>. MySQL ' +
        'without <code>ONLY_FULL_GROUP_BY</code> picks an arbitrary value instead of erroring, ' +
        'which produces results that look right and are not reproducible.</p>',
    referenceLinks: [
        { title: 'SELECT — PostgreSQL Documentation', url: 'https://www.postgresql.org/docs/current/sql-select.html' }
    ],
    tags: ['sql', 'group-by', 'querying', 'aggregates'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'window-functions',
    importance: 'must-know',
    subsection: 'querying',
    question: 'What can a window function do that GROUP BY cannot?',
    answer:
        '<p>A window function computes across a set of rows <strong>without collapsing ' +
        'them</strong>. <code>GROUP BY</code> returns one row per group; a window function ' +
        'returns every row, each carrying a value computed over its window.</p>' +
        '<p>That difference makes several common requirements into one query instead of a ' +
        'self-join or a loop in application code:</p>' +
        '<ul>' +
        '<li><strong>Rank within a group</strong> — <code>ROW_NUMBER() OVER (PARTITION BY ' +
        'customer_id ORDER BY created_at DESC)</code>, then keep rows where it equals 1. This is ' +
        'the greatest-n-per-group problem, and it is the single most useful thing window ' +
        'functions do.</li>' +
        '<li><strong>Running totals</strong> — <code>SUM(amount) OVER (ORDER BY date ROWS ' +
        'UNBOUNDED PRECEDING)</code>.</li>' +
        '<li><strong>Compare a row to its neighbours</strong> — <code>LAG</code> and ' +
        '<code>LEAD</code>, for a period-over-period difference.</li>' +
        '<li><strong>Row against group aggregate</strong> — <code>amount / SUM(amount) OVER ' +
        '(PARTITION BY region)</code> gives each row\'s share without a subquery.</li>' +
        '<li><strong>Deduplication</strong> — number the duplicates and delete everything above ' +
        'row 1.</li>' +
        '</ul>' +
        '<p>Distinguish the three ranking functions, which is a common follow-up: ' +
        '<code>ROW_NUMBER</code> always increments; <code>RANK</code> gives ties the same number ' +
        'and then skips; <code>DENSE_RANK</code> gives ties the same number and does not skip.</p>' +
        '<p>Window functions are evaluated <em>after</em> <code>WHERE</code> and ' +
        '<code>GROUP BY</code> and before <code>ORDER BY</code>, so <strong>a window function ' +
        'cannot be used in <code>WHERE</code></strong>. Wrap the query in a subquery or a CTE ' +
        'and filter outside — which is exactly why the top-n-per-group pattern always has two ' +
        'levels.</p>',
    referenceLinks: [
        { title: 'Window Functions — PostgreSQL Documentation', url: 'https://www.postgresql.org/docs/current/tutorial-window.html' }
    ],
    tags: ['sql', 'window-functions', 'querying', 'analytics'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: [
        {
            language: 'sql',
            title: 'The latest order per customer, in one pass',
            code:
                '-- Greatest-n-per-group. The window function must be filtered from\n' +
                '-- outside, because it is evaluated after WHERE.\n' +
                'WITH ranked AS (\n' +
                '    SELECT o.*,\n' +
                '           ROW_NUMBER() OVER (PARTITION BY o.customer_id\n' +
                '                              ORDER BY o.created_at DESC, o.id DESC) AS rn\n' +
                '    FROM orders o\n' +
                "    WHERE o.status = 'completed'\n" +
                ')\n' +
                'SELECT id, customer_id, created_at, total\n' +
                'FROM ranked\n' +
                'WHERE rn = 1;\n' +
                '\n' +
                '-- Each order with its share of that customer total, no subquery.\n' +
                'SELECT id,\n' +
                '       customer_id,\n' +
                '       total,\n' +
                '       SUM(total) OVER (PARTITION BY customer_id)               AS customer_total,\n' +
                '       total / SUM(total) OVER (PARTITION BY customer_id)       AS share,\n' +
                '       LAG(total) OVER (PARTITION BY customer_id\n' +
                '                        ORDER BY created_at)                    AS previous_total\n' +
                'FROM orders;',
            output: {
                kind: 'trace',
                lines: [
                    'The CTE numbers each customer partition by recency, so the newest order is 1.',
                    'The id tiebreaker makes the numbering deterministic when timestamps collide.',
                    'Filtering rn = 1 outside the CTE is required: WHERE runs before window functions.',
                    'The second query keeps every row and attaches the partition total to each of them.',
                    'A GROUP BY equivalent would collapse the rows and lose the per-order detail.'
                ],
                explain:
                    '<p>Checked against PostgreSQL 16. Window functions are standard SQL and ' +
                    'behave the same in MySQL 8 and later; MySQL 5.7 does not have them at all, ' +
                    'which is worth checking before proposing one.</p>' +
                    '<p>The tiebreaker in the <code>ORDER BY</code> is not optional. Without it ' +
                    'two orders with identical timestamps get an arbitrary ordering, and the ' +
                    'query returns a different row on different runs.</p>'
            }
        }
    ]
},

{
    id: 'exists-vs-in-vs-join',
    importance: 'should-know',
    subsection: 'querying',
    question: 'EXISTS, IN or JOIN — does the choice matter?',
    answer:
        '<p>For <em>correctness</em>, sometimes. For <em>performance</em>, much less than it ' +
        'used to.</p>' +
        '<p><strong>Correctness first, because it is not a matter of taste:</strong></p>' +
        '<ul>' +
        '<li><strong><code>NOT IN</code> is unsafe when the subquery can return NULL</strong> — ' +
        'it returns no rows at all. <code>NOT EXISTS</code> is null-safe and should be the ' +
        'default for an anti-join.</li>' +
        '<li><strong>A <code>JOIN</code> can duplicate rows</strong> if the right side has ' +
        'several matches. <code>EXISTS</code> and <code>IN</code> cannot — they are semi-joins, ' +
        'and they answer "does at least one match exist" without multiplying anything. Reaching ' +
        'for <code>SELECT DISTINCT</code> after a join is usually a sign the query wanted a ' +
        'semi-join.</li>' +
        '</ul>' +
        '<p><strong>On performance:</strong> modern planners rewrite between these forms freely. ' +
        'PostgreSQL and recent MySQL will turn an <code>IN</code> subquery into a semi-join and ' +
        'vice versa, so the historical advice that "EXISTS is faster than IN" is largely obsolete ' +
        '— the plan is what matters, and the way to know is <code>EXPLAIN</code> rather than a ' +
        'rule of thumb.</p>' +
        '<p>Where a real difference remains: a correlated <code>EXISTS</code> can stop at the ' +
        'first match, which helps when the subquery is expensive and matches are common; and a ' +
        'very large <code>IN</code> list of literals is parsed and planned every time, so it is ' +
        'better as a temporary table or an array parameter.</p>' +
        '<p>Choose on <strong>readability</strong> first — <code>EXISTS</code> reads as "where ' +
        'there is a", <code>JOIN</code> reads as "combined with" — and reach for the plan when a ' +
        'query is actually slow.</p>',
    referenceLinks: [
        { title: 'PostgreSQL — Subquery Expressions', url: 'https://www.postgresql.org/docs/current/functions-subquery.html' }
    ],
    tags: ['sql', 'querying', 'subqueries', 'performance'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'ctes-and-recursion',
    importance: 'good-to-know',
    subsection: 'querying',
    question: 'What are CTEs for, and what is the optimisation-fence question?',
    answer:
        '<p>A common table expression is a named subquery declared with <code>WITH</code>. Its ' +
        'main value is <strong>readability</strong>: a long query can be written as a sequence ' +
        'of named steps instead of nested subqueries read inside out.</p>' +
        '<p><strong>Recursive CTEs</strong> are the capability nothing else replaces. ' +
        '<code>WITH RECURSIVE</code> walks a hierarchy — an organisational chart, a category ' +
        'tree, a bill of materials, a graph — in one query, where the alternative is a loop in ' +
        'application code issuing a query per level. Anyone who has written that loop knows why ' +
        'this matters.</p>' +
        '<p><strong>The optimisation fence</strong> is the detail worth knowing, and it is ' +
        'version-specific. In PostgreSQL <strong>before version 12</strong>, a CTE was always ' +
        'materialised: the planner evaluated it separately and could not push a filter from the ' +
        'outer query into it. That made CTEs an easy way to accidentally make a query much ' +
        'slower. From PostgreSQL 12 they are inlined when it is safe, with ' +
        '<code>MATERIALIZED</code> and <code>NOT MATERIALIZED</code> available to force either ' +
        'behaviour.</p>' +
        '<p>MySQL 8 supports CTEs and inlines them; MySQL 5.7 has no CTEs at all.</p>' +
        '<p>So the honest answer names the version. "CTEs are an optimisation fence" was true, ' +
        'is now false for PostgreSQL 12 and later, and is the kind of remembered rule that ' +
        'quietly becomes wrong.</p>',
    referenceLinks: [
        { title: 'WITH Queries — PostgreSQL Documentation', url: 'https://www.postgresql.org/docs/current/queries-with.html' }
    ],
    tags: ['sql', 'cte', 'recursion', 'querying'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

/* ==== Modelling & Normalisation ======================================= */

{
    id: 'normalisation',
    importance: 'must-know',
    subsection: 'modelling',
    question: 'What are the normal forms, and when should you deliberately denormalise?',
    answer:
        '<p>The three that matter in practice:</p>' +
        '<ul>' +
        '<li><strong>1NF</strong> — atomic values, no repeating groups. No comma-separated list ' +
        'in a column.</li>' +
        '<li><strong>2NF</strong> — 1NF plus every non-key column depends on the ' +
        '<em>whole</em> composite key, not part of it.</li>' +
        '<li><strong>3NF</strong> — 2NF plus no non-key column depends on another non-key ' +
        'column. Storing <code>customer_name</code> on the orders table breaks this.</li>' +
        '</ul>' +
        '<p>The informal summary is the useful one: <em>every non-key column depends on the key, ' +
        'the whole key, and nothing but the key.</em> Beyond 3NF — BCNF, 4NF, 5NF — the forms ' +
        'address anomalies that are rare in ordinary schemas.</p>' +
        '<p><strong>What normalisation buys</strong> is a single place to change each fact. If a ' +
        'customer\'s name is stored once, renaming them is one update; if it is copied onto every ' +
        'order, it is a migration and an inconsistency waiting to happen.</p>' +
        '<p><strong>When to denormalise deliberately:</strong></p>' +
        '<ul>' +
        '<li><strong>A historical snapshot is a different fact.</strong> The price on an order ' +
        'line is <em>not</em> the current product price — it is what was charged. Copying it is ' +
        'not denormalisation at all; it is modelling a different thing, and getting this wrong ' +
        'means old invoices change when prices do.</li>' +
        '<li><strong>A read path that is measurably too slow</strong> and cannot be fixed with ' +
        'an index. A counter column instead of a <code>COUNT(*)</code> over millions of rows.</li>' +
        '<li><strong>Reporting</strong>, where a separate denormalised model is standard.</li>' +
        '</ul>' +
        '<p><strong>Normalise first and denormalise with evidence.</strong> Every denormalisation ' +
        'is a consistency obligation you now own forever, and the usual mistake is paying that ' +
        'cost for a query that was never slow.</p>',
    referenceLinks: [
        { title: 'Data Definition — PostgreSQL Documentation', url: 'https://www.postgresql.org/docs/current/ddl.html' }
    ],
    tags: ['sql', 'normalisation', 'schema-design', 'modelling'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'primary-key-choice',
    importance: 'should-know',
    subsection: 'modelling',
    question: 'Natural key, sequence or UUID for a primary key?',
    answer:
        '<p><strong>A natural key</strong> — an email, an ISBN, a country code — has no extra ' +
        'column and is meaningful. Its problem is that natural keys change: people change email ' +
        'addresses, and a business rule that seemed immutable turns out not to be. Changing a ' +
        'primary key means updating every foreign key that references it.</p>' +
        '<p><strong>A sequence or auto-increment integer</strong> is small, ordered, and ideal ' +
        'for a B-tree index: inserts go to the right-hand edge, so the index stays compact. The ' +
        'costs are that it leaks information — sequential ids let anyone count your customers ' +
        'and enumerate your resources — and that it is only unique within one database, which ' +
        'makes merging or sharding awkward.</p>' +
        '<p><strong>A UUID</strong> can be generated anywhere without coordination, reveals ' +
        'nothing, and lets a client supply the id for an idempotent create. It is larger, and ' +
        'random UUIDv4 values scatter inserts across the whole index, causing page splits and ' +
        'fragmentation — the classic objection. <strong>UUIDv7 is time-ordered</strong> and ' +
        'largely removes that, which changes the recommendation from "avoid" to "reasonable ' +
        'default".</p>' +
        '<p><strong>The pattern worth knowing</strong> is having both: an internal sequence for ' +
        'the physical key and joins, and an external opaque identifier exposed in the API. You ' +
        'get compact indexes and no enumeration, at the cost of one extra unique column.</p>' +
        '<p>Two rules regardless of choice: <strong>a primary key should be immutable and ' +
        'meaningless</strong>, and store a UUID as a native <code>uuid</code> type rather than ' +
        'as a 36-character string — the string form is more than double the bytes in every index ' +
        'that touches it.</p>',
    referenceLinks: [
        { title: 'PostgreSQL — Constraints', url: 'https://www.postgresql.org/docs/current/ddl-constraints.html' }
    ],
    tags: ['sql', 'primary-keys', 'schema-design', 'uuid'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'constraints-in-the-database',
    importance: 'should-know',
    subsection: 'modelling',
    question: 'Should constraints live in the database or in the application?',
    answer:
        '<p><strong>Both, and the database is the one that is actually enforced.</strong></p>' +
        '<p>Application validation gives a good error message and fails fast. It does not survive ' +
        'a second application writing to the same database, a migration script, a manual fix ' +
        'during an incident, a race between two instances, or a bug. The database constraint is ' +
        'the only one that holds under all of those.</p>' +
        '<p>The ones worth declaring:</p>' +
        '<ul>' +
        '<li><strong><code>NOT NULL</code></strong> — the cheapest correctness guarantee there ' +
        'is, and it helps the planner.</li>' +
        '<li><strong>Foreign keys.</strong> Sometimes argued against on performance grounds; the ' +
        'cost is real and small, and orphaned rows are considerably more expensive. The genuine ' +
        'reason to omit them is sharding, where the referenced row may be in another database ' +
        'entirely.</li>' +
        '<li><strong><code>UNIQUE</code></strong> — and note this is the only way to win the ' +
        'check-then-insert race. Two instances can both check for an existing email and both ' +
        'insert; only the constraint stops it.</li>' +
        '<li><strong><code>CHECK</code></strong> — for invariants such as a non-negative ' +
        'quantity or a valid status value.</li>' +
        '</ul>' +
        '<p>The practical consequence for application code: <strong>catch the constraint ' +
        'violation and translate it</strong>. Spring maps a unique violation to ' +
        '<code>DuplicateKeyException</code>, which becomes a 409 with a decent message. That ' +
        'gives the fast happy path of an unguarded insert with the correctness of the ' +
        'constraint, and it is the standard way to implement "create if not exists" safely.</p>' +
        '<p>What must never happen is the error message containing the constraint name, which ' +
        'tells a caller your schema.</p>',
    referenceLinks: [
        { title: 'PostgreSQL — Constraints', url: 'https://www.postgresql.org/docs/current/ddl-constraints.html' }
    ],
    tags: ['sql', 'constraints', 'schema-design', 'race-conditions'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'soft-delete',
    importance: 'good-to-know',
    subsection: 'modelling',
    question: 'What are the costs of soft deletes?',
    answer:
        '<p>A <code>deleted_at</code> column instead of a <code>DELETE</code>. It preserves ' +
        'history and makes an accidental deletion recoverable, and it has costs that accumulate ' +
        'quietly.</p>' +
        '<ul>' +
        '<li><strong>Every query must remember the filter.</strong> One that forgets returns ' +
        'deleted rows, and it will be a report or a background job rather than the main path, ' +
        'so nobody notices for a while.</li>' +
        '<li><strong>Unique constraints stop working.</strong> A user deletes an account and ' +
        'signs up again with the same email — the constraint rejects it, because the old row is ' +
        'still there. The fix is a partial index (<code>WHERE deleted_at IS NULL</code>) where ' +
        'the engine supports it, or including the deletion marker in the key.</li>' +
        '<li><strong>Foreign keys still reference deleted rows</strong>, so "deleted" parents ' +
        'keep live children and the database cannot help you notice.</li>' +
        '<li><strong>The table grows forever</strong>, and indexes with it. Every scan pays for ' +
        'rows nobody wants.</li>' +
        '<li><strong>It conflicts with data deletion requirements.</strong> "Delete my data" ' +
        'under GDPR is not satisfied by setting a flag.</li>' +
        '</ul>' +
        '<p>Hibernate\'s <code>@SQLDelete</code> and <code>@SQLRestriction</code> automate the ' +
        'filter for entity queries, which helps and does not cover native SQL, reporting or ' +
        'anything outside the application.</p>' +
        '<p>The alternatives worth weighing: <strong>an archive table</strong>, so the live table ' +
        'stays small and the history is still there; or an <strong>event log</strong>, if the ' +
        'reason for keeping the row was auditing rather than recovery. Ask what the soft delete ' +
        'is actually for — undo, audit, or referential integrity — because each has a better ' +
        'specific answer than a flag on every table.</p>',
    referenceLinks: [
        { title: 'Hibernate ORM User Guide — Soft Delete', url: 'https://docs.hibernate.org/orm/current/userguide/html_single/#soft-delete' }
    ],
    tags: ['sql', 'soft-delete', 'schema-design', 'gdpr'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

/* ==== Indexes & Plans ================================================= */

{
    id: 'how-btree-indexes-work',
    importance: 'must-know',
    subsection: 'performance',
    question: 'How does a B-tree index work, and which queries can it not help?',
    answer:
        '<p>A B-tree is a balanced tree of sorted keys, with the row locations at the leaves. ' +
        'Lookup descends from the root, so finding a key costs O(log n) page reads, and the ' +
        'leaves are linked so a range scan reads sequentially once it has found the start.</p>' +
        '<p>That structure is why an index helps <strong>equality, ranges, prefix matches and ' +
        'ordering</strong> — all of which are questions about position in a sorted order.</p>' +
        '<p><strong>What it cannot help:</strong></p>' +
        '<ul>' +
        '<li><strong>A function applied to the column.</strong> ' +
        '<code>WHERE LOWER(email) = ?</code> cannot use an index on <code>email</code>, because ' +
        'the index stores the original values. An <em>expression index</em> on ' +
        '<code>LOWER(email)</code> fixes it.</li>' +
        '<li><strong>A leading wildcard.</strong> <code>LIKE \'%son\'</code> has no prefix to ' +
        'seek on. <code>LIKE \'John%\'</code> is fine. Trailing-wildcard-only is the rule, and ' +
        'full-text search is the answer for the rest.</li>' +
        '<li><strong>An implicit type cast.</strong> Comparing a <code>varchar</code> column to ' +
        'a number makes the engine cast the column, which is a function — same problem, and ' +
        'invisible in the query text.</li>' +
        '<li><strong>Low selectivity.</strong> An index on a boolean that is 90% true is not ' +
        'worth using for the true case: reading 90% of the rows through an index costs more ' +
        'random IO than scanning the table. The planner knows this and will correctly ignore ' +
        'the index, which surprises people who then assume it is broken.</li>' +
        '</ul>' +
        '<p>Indexes are not free: every <code>INSERT</code>, <code>UPDATE</code> and ' +
        '<code>DELETE</code> maintains every index on the table. A table with a dozen indexes ' +
        'has a dozen structures to update per write, so unused indexes are a pure cost — and ' +
        'both PostgreSQL and MySQL expose usage statistics that identify them.</p>',
    referenceLinks: [
        { title: 'Indexes — PostgreSQL Documentation', url: 'https://www.postgresql.org/docs/current/indexes.html' }
    ],
    tags: ['sql', 'indexes', 'b-tree', 'performance'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'composite-index-column-order',
    importance: 'must-know',
    subsection: 'performance',
    question: 'Does the column order in a composite index matter?',
    answer:
        '<p>Enormously. A composite index is sorted by the first column, then by the second ' +
        'within equal firsts, and so on — like a phone book sorted by surname then forename.</p>' +
        '<p><strong>The leftmost-prefix rule:</strong> an index on <code>(a, b, c)</code> can ' +
        'serve queries filtering on <code>a</code>, on <code>(a, b)</code>, and on ' +
        '<code>(a, b, c)</code>. It <strong>cannot</strong> serve a query filtering only on ' +
        '<code>b</code> or only on <code>c</code> — just as the phone book cannot find everyone ' +
        'named John without reading all of it.</p>' +
        '<p>So <code>(a, b, c)</code> makes a separate index on <code>a</code> redundant, and the ' +
        'order determines which queries it covers.</p>' +
        '<p><strong>How to choose the order:</strong></p>' +
        '<ul>' +
        '<li><strong>Equality columns first, then the range column.</strong> This is the rule ' +
        'that matters most. Once the index hits a range predicate it can no longer seek on ' +
        'anything to the right, so <code>WHERE status = ? AND created_at &gt; ?</code> wants ' +
        '<code>(status, created_at)</code> and gets much less from ' +
        '<code>(created_at, status)</code>.</li>' +
        '<li><strong>Then the <code>ORDER BY</code> columns</strong>, in matching direction, so ' +
        'the sort disappears entirely.</li>' +
        '<li><strong>Most selective first among equals</strong> — a weaker rule than it is ' +
        'usually stated as, and secondary to the two above.</li>' +
        '</ul>' +
        '<p><strong>A covering index</strong> is the extension worth knowing: if the index ' +
        'contains every column the query needs, the engine never touches the table at all. ' +
        'PostgreSQL calls it an index-only scan and supports <code>INCLUDE</code> for payload ' +
        'columns that are not part of the key. The gain is often larger than the gain from ' +
        'having the index in the first place.</p>',
    referenceLinks: [
        { title: 'Multicolumn Indexes — PostgreSQL Documentation', url: 'https://www.postgresql.org/docs/current/indexes-multicolumn.html' }
    ],
    tags: ['sql', 'indexes', 'composite-index', 'performance'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'reading-an-explain-plan',
    importance: 'must-know',
    subsection: 'performance',
    question: 'How do you read an EXPLAIN plan, and what do you look for first?',
    answer:
        '<p><strong>Use <code>EXPLAIN ANALYZE</code>, not <code>EXPLAIN</code>.</strong> Plain ' +
        '<code>EXPLAIN</code> shows the planner\'s estimates; <code>ANALYZE</code> actually runs ' +
        'the query and shows real timings and real row counts. The gap between estimated and ' +
        'actual is the most valuable thing on the page.</p>' +
        '<p><strong>What to look for, in order:</strong></p>' +
        '<ul>' +
        '<li><strong>A large mismatch between estimated and actual rows.</strong> If the planner ' +
        'expected 10 rows and got 100,000, every decision above that node is based on a wrong ' +
        'assumption — and the fix is usually statistics (<code>ANALYZE</code> the table) or a ' +
        'predicate the planner cannot estimate, not an index.</li>' +
        '<li><strong>The most expensive node.</strong> Plans are trees read from the innermost ' +
        'outward; find where the time actually goes rather than reading top to bottom.</li>' +
        '<li><strong>A sequential scan on a large table with a selective filter.</strong> Often ' +
        'a missing index. On a small table, or when most rows match, a sequential scan is ' +
        '<em>correct</em> and faster than an index — this is the most common false alarm.</li>' +
        '<li><strong>A nested loop with a high outer row count.</strong> Fine for a few rows, ' +
        'quadratic for many. Frequently a symptom of the bad estimate above.</li>' +
        '<li><strong>A sort or a hash spilling to disk.</strong> PostgreSQL reports "external ' +
        'merge Disk: nnnkB", which means <code>work_mem</code> was too small for this ' +
        'query.</li>' +
        '<li><strong>Rows removed by filter.</strong> A large number means the engine read rows ' +
        'only to discard them — the index is not selective enough or does not exist.</li>' +
        '</ul>' +
        '<p>Add <code>BUFFERS</code> in PostgreSQL to see how much came from cache versus disk, ' +
        'which distinguishes "slow query" from "cold cache".</p>' +
        '<p><strong>The join algorithms</strong> are worth naming: a <em>nested loop</em> is best ' +
        'when one side is tiny; a <em>hash join</em> builds a hash of the smaller side and is ' +
        'the usual choice for large unsorted inputs; a <em>merge join</em> needs both sides ' +
        'sorted and is cheap when an index already provides that order.</p>',
    referenceLinks: [
        { title: 'Using EXPLAIN — PostgreSQL Documentation', url: 'https://www.postgresql.org/docs/current/using-explain.html' }
    ],
    tags: ['sql', 'explain', 'query-plans', 'performance'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: [
        {
            language: 'sql',
            title: 'What to add to an EXPLAIN, and what to read in it',
            code:
                '-- ANALYZE runs the query. BUFFERS shows cache versus disk.\n' +
                '-- Wrap in a transaction and roll back if the statement writes.\n' +
                'EXPLAIN (ANALYZE, BUFFERS, VERBOSE)\n' +
                'SELECT o.id, o.total, c.name\n' +
                'FROM orders o\n' +
                'JOIN customers c ON c.id = o.customer_id\n' +
                "WHERE o.status = 'pending'\n" +
                "  AND o.created_at >= NOW() - INTERVAL '7 days'\n" +
                'ORDER BY o.created_at DESC\n' +
                'LIMIT 50;\n' +
                '\n' +
                '-- The index this query wants: equality first, then the range,\n' +
                '-- which is also the ORDER BY column and in the same direction.\n' +
                'CREATE INDEX CONCURRENTLY idx_orders_status_created\n' +
                '    ON orders (status, created_at DESC);\n' +
                '\n' +
                '-- Statistics drive every planner decision. Stale statistics are\n' +
                '-- a more common cause of a bad plan than a missing index.\n' +
                'ANALYZE orders;\n' +
                '\n' +
                '-- Indexes nobody uses cost writes and nothing else.\n' +
                'SELECT relname, indexrelname, idx_scan\n' +
                'FROM pg_stat_user_indexes\n' +
                'WHERE idx_scan = 0\n' +
                'ORDER BY relname;',
            output: {
                kind: 'trace',
                lines: [
                    'ANALYZE executes the statement, so timings and row counts are real, not estimates.',
                    'Compare estimated rows to actual rows at each node; a large gap explains a bad plan.',
                    'With the composite index the plan becomes an index scan with no separate sort step.',
                    'CONCURRENTLY builds the index without taking a write lock on the table.',
                    'pg_stat_user_indexes with idx_scan = 0 lists indexes that only cost write time.'
                ],
                explain:
                    '<p>PostgreSQL 16. The syntax and the catalog view are PostgreSQL-specific: ' +
                    'MySQL uses <code>EXPLAIN ANALYZE</code> with a different output format and ' +
                    '<code>sys.schema_unused_indexes</code> for the last query.</p>' +
                    '<p><code>CREATE INDEX CONCURRENTLY</code> cannot run inside a transaction ' +
                    'block, which matters because migration tools wrap statements in one by ' +
                    'default — Flyway needs the migration marked as not transactional.</p>'
            }
        }
    ]
},

{
    id: 'why-is-my-index-not-used',
    importance: 'should-know',
    subsection: 'performance',
    question: 'The index exists and the query still does a full scan. Why?',
    answer:
        '<p>Six reasons, roughly in order of how often they turn out to be the cause.</p>' +
        '<ul>' +
        '<li><strong>The scan is genuinely cheaper.</strong> If the query matches a large ' +
        'fraction of the table, reading it sequentially beats a large number of random index ' +
        'lookups. The planner is right and there is nothing to fix.</li>' +
        '<li><strong>A function or a cast on the column.</strong> ' +
        '<code>WHERE DATE(created_at) = ?</code> or comparing a text column to a number. The ' +
        'cast is often implicit and invisible in the query text — <code>VERBOSE</code> in the ' +
        'plan reveals it.</li>' +
        '<li><strong>The leftmost-prefix rule.</strong> The composite index starts with a ' +
        'different column than the one being filtered.</li>' +
        '<li><strong>Stale statistics.</strong> The planner believes the table is small or the ' +
        'value is common. <code>ANALYZE</code> the table and try again — this is the fix that ' +
        'gets forgotten most often.</li>' +
        '<li><strong>Type mismatch between joined columns</strong> — a <code>bigint</code> ' +
        'joined to a <code>varchar</code>, which forces a cast on every row.</li>' +
        '<li><strong>Low selectivity.</strong> An index on a column with three distinct values ' +
        'over a million rows is not useful for the common value. A partial index on the rare ' +
        'value can be, and is much smaller.</li>' +
        '</ul>' +
        '<p><strong>The right first move is <code>EXPLAIN ANALYZE</code>, not adding another ' +
        'index.</strong> Adding indexes speculatively is how a table ends up with fifteen of ' +
        'them, each slowing every write, and the original query still scanning.</p>' +
        '<p>PostgreSQL lets you test a hypothesis by disabling a plan type for one session — ' +
        '<code>SET enable_seqscan = off</code> — and comparing. That is a diagnostic, never a ' +
        'production setting: if the index plan turns out to be slower, the planner was right.</p>',
    referenceLinks: [
        { title: 'PostgreSQL — Examining Index Usage', url: 'https://www.postgresql.org/docs/current/indexes-examine.html' }
    ],
    tags: ['sql', 'indexes', 'query-plans', 'debugging'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'index-types-beyond-btree',
    importance: 'good-to-know',
    subsection: 'performance',
    question: 'When would you use something other than a B-tree index?',
    answer:
        '<p>B-tree is the default and is right for equality, ranges and ordering. The others ' +
        'exist for questions it cannot answer.</p>' +
        '<ul>' +
        '<li><strong>Hash</strong> — equality only, no ranges and no ordering. Rarely worth it; ' +
        'B-tree handles equality nearly as well and does more.</li>' +
        '<li><strong>GIN</strong> — for values that contain many items: full-text search, ' +
        '<code>jsonb</code> containment, array membership. This is the index that makes ' +
        '<code>WHERE data @&gt; \'{"status":"active"}\'</code> fast on a JSON column. Slower to ' +
        'update than a B-tree.</li>' +
        '<li><strong>GiST</strong> — geometric and range types, nearest-neighbour searches, and ' +
        'the basis of PostGIS.</li>' +
        '<li><strong>BRIN</strong> — tiny summary index for very large tables whose physical ' +
        'order correlates with the column, typically append-only time-series data. Orders of ' +
        'magnitude smaller than a B-tree, and only useful when that correlation holds.</li>' +
        '<li><strong>Partial index</strong> — not a type but a modifier: an index ' +
        '<code>WHERE deleted_at IS NULL</code> or <code>WHERE status = \'pending\'</code>. Much ' +
        'smaller and cheaper, and it is the fix for the soft-delete unique-constraint problem ' +
        'and for indexing a rare value in a low-selectivity column.</li>' +
        '<li><strong>Expression index</strong> — on <code>LOWER(email)</code>, so a ' +
        'case-insensitive lookup can use it.</li>' +
        '</ul>' +
        '<p>These names are PostgreSQL\'s. MySQL InnoDB has B-tree and full-text and spatial, and ' +
        'the hash index it exposes is internal and adaptive — so index-type advice does not ' +
        'travel between engines, and it is worth saying which one you mean.</p>',
    referenceLinks: [
        { title: 'Index Types — PostgreSQL Documentation', url: 'https://www.postgresql.org/docs/current/indexes-types.html' }
    ],
    tags: ['sql', 'indexes', 'postgresql', 'performance'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

/* ==== Pooling, Migration & Scale ====================================== */

{
    id: 'connection-pool-sizing',
    importance: 'must-know',
    subsection: 'ops',
    question: 'How do you size a connection pool, and why is bigger worse?',
    answer:
        '<p>The counter-intuitive fact first: <strong>a smaller pool is usually faster.</strong> ' +
        'HikariCP\'s own guidance recommends a pool in the region of ten for many workloads, ' +
        'and it is not a compromise — it is the faster setting.</p>' +
        '<p>The reason is that a database server has a fixed number of CPUs and disks. Beyond ' +
        'that, more concurrent queries do not execute in parallel; they context-switch, contend ' +
        'for locks and latches, and thrash the buffer cache. Total throughput falls while every ' +
        'individual query gets slower. A queue in the pool is cheaper than a queue inside the ' +
        'database, because the pool queue is visible and does not hold database resources.</p>' +
        '<p>The starting formula, from PostgreSQL\'s own analysis, is roughly ' +
        '<code>connections = ((core_count * 2) + effective_spindle_count)</code>. On a modern ' +
        'SSD-backed instance that lands in the low tens.</p>' +
        '<p><strong>What matters more than the number:</strong></p>' +
        '<ul>' +
        '<li><strong>Count every consumer.</strong> Ten instances with a pool of twenty each is ' +
        'two hundred connections at the database, and PostgreSQL\'s ' +
        '<code>max_connections</code> is often a hundred. Migrations, batch jobs and admin tools ' +
        'need headroom too.</li>' +
        '<li><strong>Shorten transactions instead of enlarging the pool.</strong> Exhaustion is ' +
        'almost always a symptom of connections being held too long — a remote call inside a ' +
        'transaction, Open Session in View, a nested <code>REQUIRES_NEW</code>.</li>' +
        '<li><strong>Set <code>leakDetectionThreshold</code></strong> so a connection held ' +
        'beyond it logs a stack trace. This finds the actual culprit rather than the ' +
        'symptom.</li>' +
        '<li><strong>Separate pools for separate workloads.</strong> A batch job on its own pool ' +
        'cannot starve request handling.</li>' +
        '<li><strong>Keep <code>maxLifetime</code> shorter than any idle timeout</strong> in the ' +
        'database or a firewall in between, or the pool hands out connections the network has ' +
        'already dropped.</li>' +
        '</ul>' +
        '<p>Watch the pending-connection count in Micrometer. A rising value is the earliest ' +
        'signal of this whole family of problems.</p>',
    referenceLinks: [
        { title: 'HikariCP — About Pool Sizing', url: 'https://github.com/brettwooldridge/HikariCP/wiki/About-Pool-Sizing' }
    ],
    tags: ['sql', 'connection-pool', 'hikaricp', 'performance', 'operations'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'migrations-and-zero-downtime',
    importance: 'must-know',
    subsection: 'ops',
    question: 'How do you change a schema without downtime?',
    answer:
        '<p>The constraint that dictates everything: <strong>during a rolling deploy the old and ' +
        'new versions of the application run at the same time against the same schema.</strong> ' +
        'So every migration must work with the previous release still running.</p>' +
        '<p><strong>Expand and contract</strong> is the pattern, spread across releases:</p>' +
        '<ul>' +
        '<li><strong>Expand.</strong> Add the new column, nullable, with no constraint. Deploy ' +
        'code that writes both the old and the new and reads the old.</li>' +
        '<li><strong>Migrate.</strong> Backfill in batches, not in one statement — a single ' +
        '<code>UPDATE</code> over ten million rows takes a long lock and generates enormous ' +
        'write-ahead log.</li>' +
        '<li><strong>Switch.</strong> Deploy code that reads the new column.</li>' +
        '<li><strong>Contract.</strong> In a <em>later</em> release, stop writing the old column, ' +
        'then drop it.</li>' +
        '</ul>' +
        '<p>Renaming a column in one step breaks every instance still running the old code, which ' +
        'is why a rename is never a single migration.</p>' +
        '<p><strong>Operations that lock, and their safe forms:</strong></p>' +
        '<ul>' +
        '<li><strong>Adding an index</strong> — <code>CREATE INDEX CONCURRENTLY</code> in ' +
        'PostgreSQL, which does not block writes and cannot run inside a transaction, so the ' +
        'migration must be marked non-transactional.</li>' +
        '<li><strong>Adding a <code>NOT NULL</code> column</strong> — in older PostgreSQL this ' +
        'rewrote the table; from version 11 a constant default does not. Check the version.</li>' +
        '<li><strong>Adding a foreign key or check constraint</strong> — add it ' +
        '<code>NOT VALID</code>, then <code>VALIDATE CONSTRAINT</code> separately, which takes a ' +
        'weaker lock.</li>' +
        '</ul>' +
        '<p><strong>Always set a lock timeout</strong> in migrations. A DDL statement waiting for ' +
        'a lock queues every subsequent query behind it, so a migration that would have taken ' +
        'milliseconds takes the site down instead. Failing fast and retrying is far better.</p>',
    referenceLinks: [
        { title: 'ALTER TABLE — PostgreSQL Documentation', url: 'https://www.postgresql.org/docs/current/sql-altertable.html' }
    ],
    tags: ['sql', 'migrations', 'zero-downtime', 'flyway', 'operations'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'flyway-vs-liquibase',
    importance: 'should-know',
    subsection: 'ops',
    question: 'How does a migration tool work, and what happens when a migration fails halfway?',
    answer:
        '<p>Both Flyway and Liquibase keep a table in the database recording which migrations ' +
        'have been applied, with a checksum. On startup they compare the files on the classpath ' +
        'to that table and apply what is missing, in order.</p>' +
        '<p>The checksum is the important part: <strong>editing an already-applied migration is ' +
        'a startup failure</strong>. That is deliberate — environments would otherwise diverge ' +
        'silently. The fix is a new migration, never an edit.</p>' +
        '<p>The difference between them: Flyway is SQL-first and simple; Liquibase uses a ' +
        'database-agnostic changelog in XML, YAML or JSON and can generate rollbacks and diff ' +
        'schemas. Flyway is the usual choice when you know your engine, which is nearly always.</p>' +
        '<p><strong>When a migration fails halfway:</strong></p>' +
        '<ul>' +
        '<li>On PostgreSQL, DDL is transactional, so a failed migration rolls back cleanly and ' +
        'the version table is not updated. Fix and redeploy.</li>' +
        '<li><strong>On MySQL and Oracle, DDL auto-commits.</strong> A migration with three ' +
        'statements that fails on the second leaves the first applied and the version table not ' +
        'updated. The database is now in a state no migration describes, and it must be repaired ' +
        'by hand. <strong>Keep migrations to one statement where the engine cannot roll back ' +
        'DDL.</strong></li>' +
        '<li>Flyway marks the failed migration in its table, and <code>flyway repair</code> ' +
        'clears the entry once the database has been fixed.</li>' +
        '</ul>' +
        '<p>Two practices worth adopting: <strong>test the migrations</strong>, with ' +
        'Testcontainers running them against a real engine, since they are otherwise the ' +
        'least-tested code in the repository. And <strong>do not rely on rollback ' +
        'scripts</strong> — forward-only, with a fix-forward migration, is how this is done in ' +
        'practice, because a rollback that has never been executed is a script nobody knows ' +
        'works.</p>',
    referenceLinks: [
        { title: 'Database Migration — Spring Boot Reference', url: 'https://docs.spring.io/spring-boot/how-to/data-initialization.html' }
    ],
    tags: ['sql', 'flyway', 'liquibase', 'migrations', 'operations'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'read-replicas',
    importance: 'should-know',
    subsection: 'ops',
    question: 'How do read replicas help, and what do they break?',
    answer:
        '<p>A replica streams changes from the primary and serves reads. Since most workloads ' +
        'are read-heavy, this is the cheapest way to scale read capacity, and it also gives you ' +
        'a warm standby for failover.</p>' +
        '<p><strong>What it breaks is replication lag.</strong> A replica is behind the primary ' +
        '— usually milliseconds, occasionally much more under load or during a long ' +
        'transaction. So:</p>' +
        '<ul>' +
        '<li><strong>Read-your-own-writes fails.</strong> A user updates their profile and the ' +
        'next page load reads from a replica that has not caught up, showing the old value. This ' +
        'looks exactly like a bug that does not reproduce.</li>' +
        '<li><strong>A read-modify-write across the split is wrong.</strong> Reading from a ' +
        'replica and writing to the primary based on that read can act on stale data.</li>' +
        '</ul>' +
        '<p><strong>Handling it:</strong> route by intent, with <code>readOnly = true</code> as ' +
        'the natural signal and an <code>AbstractRoutingDataSource</code> doing the routing. ' +
        'Then send anything that must be current to the primary — either always for particular ' +
        'operations, or for a short window after a user has written something, which is the ' +
        '"sticky primary" approach. Some engines can also wait for a replica to reach a known ' +
        'position, which is the most correct and least common option.</p>' +
        '<p><strong>The thing worth saying plainly:</strong> replicas scale reads and do nothing ' +
        'for writes. If the write path is the bottleneck, replicas make it slightly worse, ' +
        'because replication itself costs the primary something. Write scaling means sharding, ' +
        'or partitioning, or not writing so much — and each of those is a much larger change.</p>',
    referenceLinks: [
        { title: 'PostgreSQL 16 — High Availability', url: 'https://www.postgresql.org/docs/16/high-availability.html' }
    ],
    tags: ['sql', 'replication', 'scaling', 'consistency'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'partitioning-and-sharding',
    importance: 'should-know',
    subsection: 'ops',
    question: 'What is the difference between partitioning and sharding, and when do you need either?',
    answer:
        '<p><strong>Partitioning</strong> splits one table into several physical pieces inside ' +
        '<em>one</em> database. The application still sees one table; the engine routes to the ' +
        'right partition. <strong>Sharding</strong> splits data across <em>several</em> ' +
        'databases, and something above has to know which one holds a given row.</p>' +
        '<p><strong>Partitioning is much cheaper and often sufficient.</strong> Its biggest win ' +
        'is rarely the query speedup — it is that dropping a partition is instant where deleting ' +
        'a hundred million rows is an hours-long operation that bloats the table. For time-series ' +
        'data with a retention policy this alone justifies it. Partition pruning also lets the ' +
        'planner skip whole partitions when the key is in the predicate.</p>' +
        '<p>The costs: the partition key must be in the query or nothing is pruned; unique ' +
        'constraints must include the partition key; and cross-partition queries can be slower ' +
        'than the unpartitioned table was.</p>' +
        '<p><strong>Sharding is a last resort</strong>, and the honest answer says why:</p>' +
        '<ul>' +
        '<li><strong>Cross-shard joins and transactions stop existing.</strong> Anything ' +
        'spanning shards becomes application code.</li>' +
        '<li><strong>Resharding is very hard.</strong> Choosing the key wrongly is expensive to ' +
        'undo, and consistent hashing only reduces the pain.</li>' +
        '<li><strong>Hot shards.</strong> Sharding by customer means one enormous customer ' +
        'overloads one shard.</li>' +
        '<li><strong>Operations multiply.</strong> Backups, migrations, monitoring and failover, ' +
        'per shard.</li>' +
        '</ul>' +
        '<p>Before sharding: fix the queries, add the indexes, cache, archive cold data, add ' +
        'replicas for reads, partition, and buy a bigger instance. Vertical scaling goes ' +
        'remarkably far now, and it is a configuration change rather than a rearchitecture.</p>',
    referenceLinks: [
        { title: 'Table Partitioning — PostgreSQL Documentation', url: 'https://www.postgresql.org/docs/current/ddl-partitioning.html' }
    ],
    tags: ['sql', 'partitioning', 'sharding', 'scaling'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'sql-injection',
    importance: 'must-know',
    subsection: 'ops',
    question: 'How do you prevent SQL injection, and where does it still slip through in a Spring application?',
    answer:
        '<p><strong>Parameterised statements.</strong> The parameter is sent separately from the ' +
        'SQL text, so it can never be parsed as SQL. That is the whole defence, and it is ' +
        'complete for values.</p>' +
        '<p>In a Spring application most code is safe by construction — derived query methods, ' +
        '<code>@Query</code> with named or positional parameters, and ' +
        '<code>JdbcTemplate</code> with <code>?</code> placeholders all parameterise ' +
        'properly.</p>' +
        '<p><strong>Where it still slips through:</strong></p>' +
        '<ul>' +
        '<li><strong>String concatenation into a native query.</strong> Usually written under ' +
        'time pressure for a dynamic filter. This is the classic case and it is still ' +
        'found.</li>' +
        '<li><strong>Dynamic <code>ORDER BY</code> or a dynamic column or table name.</strong> ' +
        '<em>These cannot be parameterised</em> — a placeholder is a value, not an identifier. A ' +
        'sort column taken from a query parameter and concatenated is injectable. The fix is an ' +
        'allowlist: map the incoming string to a known column name and reject anything else. ' +
        'This is the case people miss, because they know about parameters and assume they cover ' +
        'everything.</li>' +
        '<li><strong><code>LIKE</code> patterns.</strong> Parameterising stops injection, and ' +
        'the user can still supply <code>%</code> to match everything, which is a performance ' +
        'and disclosure problem rather than an injection one.</li>' +
        '<li><strong>Spring Data Specifications and Criteria</strong> are safe, and a JPQL ' +
        'string built by concatenation inside one is not.</li>' +
        '</ul>' +
        '<p>The defences beyond parameterisation: <strong>least privilege</strong>, so the ' +
        'application user cannot <code>DROP</code> anything; <strong>no ' +
        'stack traces or constraint names in responses</strong>, which is what turns a blind ' +
        'injection into an easy one; and validation of the shape of input, as defence in depth ' +
        'rather than as the primary control.</p>',
    referenceLinks: [
        { title: 'OWASP — SQL Injection Prevention Cheat Sheet', url: 'https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html' }
    ],
    tags: ['sql', 'security', 'injection', 'owasp'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
}

    ]
};
