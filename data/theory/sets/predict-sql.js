/* ==========================================================================
   data/theory/sets/predict-sql.js — Predict, set 8 of 11

   Seven puzzles, every one artefact: 'sql-result'. Part 9 and the blind spot
   recorded in CLAUDE.md both say the same thing about this set and it is the
   rule that governs every line in it:

     SQL PREDICT ANSWERS ARE DIALECT-DEPENDENT. EVERY ENTRY NAMES THE ENGINE
     AND THE VERSION. Write "PostgreSQL 16", never "SQL".

   All seven are PostgreSQL 16. Where MySQL or Oracle would answer
   differently, the explanation says so rather than leaving the reader to
   discover it on a different job — the NULL puzzles and the GROUP BY one are
   the three where the difference is largest.

   Three-valued logic is the spine of this set. Four of the seven come down to
   the same fact — NULL is unknown, not a value — and a reader who leaves
   recognising that as one fact rather than four rules has got what the set is
   for.
   ========================================================================== */

const predictSqlModule = {
    id: 'predict-sql',
    trackId: 'output',
    order: 958,
    title: 'SQL',
    tagline: 'Three-valued logic, one join that is not a join, and an index that is not used.',
    estimatedMinutes: 25,
    prerequisites: [],
    docHub: {
        title: 'PostgreSQL 16 — SQL language reference',
        url: 'https://www.postgresql.org/docs/16/sql.html'
    },

    chapters: [
        {
            id: 'null-is-not-a-value',
            title: 'NULL Is Not a Value',
            importance: 'must-know',
            summary: 'Three queries whose answers all follow from one fact, and none of which look related.',
            interviewAngle: 'The NOT IN one is asked constantly because it is a real production defect that returns zero rows and no error.',
            buildsOn: [],
            blocks: [
                {
                    type: 'predict',
                    id: 'predict-sql-not-in-with-null',
                    importance: 'must-know',
                    artefact: 'sql-result',
                    language: 'sql',
                    title: 'NOT IN against a column that has a NULL in it',
                    prompt: '<p>PostgreSQL 16. <code>employees</code> has 5 rows. <code>managers.emp_id</code> holds 2, 3 and one NULL. How many rows come back?</p>',
                    code: '-- employees:  id = 1, 2, 3, 4, 5\n-- managers:   emp_id = 2, 3, NULL\n\nSELECT count(*) FROM employees\n WHERE id NOT IN (SELECT emp_id FROM managers);',
                    options: ['0', '3', '2', 'NULL'],
                    answer: 0,
                    verification: 'Read from the PostgreSQL 16 documentation, section 9.24 (Subquery Expressions, NOT IN) and section 9.2 on comparison operators with NULL. The same result holds in MySQL 8 and Oracle 19c — this is standard three-valued logic, not a PostgreSQL quirk.',
                    output: {
                        kind: 'trace',
                        lines: [
                            ' count ',
                            '-------',
                            '     0',
                            '(1 row)',
                            '',
                            '-- id NOT IN (2, 3, NULL)',
                            '--   expands to:  id <> 2 AND id <> 3 AND id <> NULL',
                            '--   id = 1  ->   true   AND true   AND UNKNOWN  ->  UNKNOWN',
                            '--   UNKNOWN is not TRUE, so no row qualifies.'
                        ],
                        explain: '<p><code>id &lt;&gt; NULL</code> is UNKNOWN, never true, so the whole conjunction can never be true and the query returns nothing — with no error and no warning. <strong>The fix is <code>NOT EXISTS</code></strong>, which asks a different question: it tests for the absence of a matching row rather than comparing values, and a NULL row simply does not match. <code>NOT IN</code> against a nullable column is a defect waiting for the first NULL; the version that returns 3 rows today returns 0 the day somebody inserts one.</p>'
                    }
                },
                {
                    type: 'predict',
                    id: 'predict-sql-count-star-vs-count-column',
                    importance: 'must-know',
                    artefact: 'sql-result',
                    language: 'sql',
                    title: 'Four ways to count',
                    prompt: '<p>PostgreSQL 16. The table has 5 rows; <code>bonus</code> is NULL in 2 of them and holds the value 100 in the other 3.</p>',
                    code: 'SELECT count(*)             AS a,\n       count(bonus)         AS b,\n       count(DISTINCT bonus) AS c,\n       sum(bonus)           AS d\n  FROM employees;',
                    options: ['5 | 3 | 1 | 300', '5 | 5 | 1 | 300', '5 | 3 | 2 | 300', '5 | 3 | 1 | NULL'],
                    answer: 0,
                    verification: 'Read from the PostgreSQL 16 documentation, section 9.21 (Aggregate Functions): count(*) counts rows, count(expression) counts non-null inputs, and sum returns NULL only when there are no non-null inputs at all.',
                    output: {
                        kind: 'trace',
                        lines: [
                            ' a | b | c |  d  ',
                            '---+---+---+-----',
                            ' 5 | 3 | 1 | 300',
                            '(1 row)'
                        ],
                        explain: '<p><code>count(*)</code> counts rows and never skips one. <code>count(bonus)</code> counts non-null inputs, so it is 3. <code>count(DISTINCT bonus)</code> is 1, because the three non-null values are all 100 — NULL is not counted as a distinct value here even though <code>SELECT DISTINCT bonus</code> would return two rows including one NULL, which is the inconsistency worth remembering. <code>sum</code> ignores NULLs and returns 300; it returns NULL rather than 0 only when there is nothing non-null to add, which is why <code>coalesce(sum(x), 0)</code> exists.</p>'
                    }
                },
                {
                    type: 'predict',
                    id: 'predict-sql-left-join-killed-by-where',
                    importance: 'must-know',
                    artefact: 'sql-result',
                    language: 'sql',
                    title: 'A LEFT JOIN turned back into an inner one',
                    prompt: '<p>PostgreSQL 16. Five customers, two of whom have never ordered. How many rows does each query return?</p>',
                    code: '-- A\nSELECT c.id FROM customers c\n  LEFT JOIN orders o ON o.customer_id = c.id\n WHERE o.status = \'SHIPPED\';\n\n-- B\nSELECT c.id FROM customers c\n  LEFT JOIN orders o ON o.customer_id = c.id\n                    AND o.status = \'SHIPPED\';',
                    options: [
                        'A returns only customers with a shipped order; B returns all five',
                        'Both return all five',
                        'Both return only customers with a shipped order',
                        'A returns all five; B returns only customers with a shipped order'
                    ],
                    answer: 0,
                    verification: 'Read from the PostgreSQL 16 documentation, section 7.2.1.1 (Joined Tables), on the difference between a join condition and a WHERE clause applied after the join. Behaviour is the same in MySQL 8 and Oracle 19c; this is standard SQL.',
                    output: {
                        kind: 'trace',
                        lines: [
                            '-- A: the outer rows are produced, THEN filtered.',
                            '--    A customer with no order gets o.status = NULL,',
                            '--    and NULL = \'SHIPPED\' is UNKNOWN, so the row is dropped.',
                            ' id ',
                            '----',
                            '  1',
                            '  3',
                            '(2 rows)',
                            '',
                            '-- B: the condition is part of the join, so non-matching',
                            '--    orders simply do not attach; the customer survives.',
                            '(5 rows)'
                        ],
                        explain: '<p>A predicate on the right-hand table in <code>WHERE</code> runs <em>after</em> the outer join has manufactured its NULL rows, and those NULL rows fail it — which silently converts the LEFT JOIN into an INNER JOIN. Putting the condition in <code>ON</code> makes it part of deciding what attaches. <strong>The one exception is <code>WHERE o.id IS NULL</code></strong>, which is the deliberate anti-join idiom for "customers with no shipped order" and works precisely because it tests the manufactured NULL rather than comparing to a value.</p>'
                    }
                },
                {
                    type: 'predict',
                    id: 'predict-sql-group-by-without-aggregate',
                    importance: 'should-know',
                    artefact: 'sql-result',
                    language: 'sql',
                    title: 'A column that is neither grouped nor aggregated',
                    prompt: '<p>PostgreSQL 16. What does this query do?</p>',
                    code: 'SELECT department, name, count(*)\n  FROM employees\n GROUP BY department;',
                    options: [
                        'It fails: column "employees.name" must appear in the GROUP BY clause or be used in an aggregate function',
                        'It runs and returns an arbitrary name per department',
                        'It runs and returns the alphabetically first name per department',
                        'It runs and returns NULL for name'
                    ],
                    answer: 0,
                    verification: 'Read from the PostgreSQL 16 documentation, section 7.2.3 (GROUP BY and HAVING). MySQL 8 with ONLY_FULL_GROUP_BY disabled returns an arbitrary row instead, which is the dialect difference this puzzle exists to name.',
                    output: {
                        kind: 'trace',
                        lines: [
                            'ERROR:  column "employees.name" must appear in the GROUP BY clause',
                            '        or be used in an aggregate function',
                            'LINE 1: SELECT department, name, count(*)',
                            '                           ^'
                        ],
                        explain: '<p>The group has many names and the query does not say which one it wants, so PostgreSQL refuses. <strong>MySQL historically did not</strong>: with <code>ONLY_FULL_GROUP_BY</code> off it picks an arbitrary row, which is where "it worked on the old database" comes from, and the value it picks can change between runs. The honest fixes are to add the column to the <code>GROUP BY</code>, wrap it in an aggregate such as <code>min(name)</code>, or — when you genuinely want one whole row per group — use <code>DISTINCT ON (department)</code> with an <code>ORDER BY</code> that says which one.</p>'
                    }
                }
            ],
            docs: [
                { title: 'PostgreSQL 16 — Comparison functions and operators', url: 'https://www.postgresql.org/docs/16/functions-comparison.html', kind: 'spec' }
            ],
            relatedQuestions: []
        },

        {
            id: 'plans-and-ordering',
            title: 'Plans, Ordering and a Statement You Cannot Take Back',
            importance: 'must-know',
            summary: 'An index that exists and is not used, an ORDER BY that does not determine the answer, and an UPDATE with no WHERE.',
            interviewAngle: 'The function-on-the-column question is the single most useful index fact in an interview, because it explains most "we have an index and it is still slow" reports.',
            buildsOn: ['null-is-not-a-value'],
            blocks: [
                {
                    type: 'predict',
                    id: 'predict-sql-index-unused-because-of-a-function',
                    importance: 'must-know',
                    artefact: 'sql-result',
                    language: 'sql',
                    title: 'The index is there and the plan ignores it',
                    prompt: '<p>PostgreSQL 16, 5 million rows, and <code>CREATE INDEX ON orders (placed_at)</code> exists. Which of these two uses it?</p>',
                    code: '-- A\nEXPLAIN SELECT * FROM orders\n WHERE date_trunc(\'day\', placed_at) = DATE \'2026-10-08\';\n\n-- B\nEXPLAIN SELECT * FROM orders\n WHERE placed_at >= DATE \'2026-10-08\'\n   AND placed_at <  DATE \'2026-10-09\';',
                    options: [
                        'Only B. A wraps the column in a function, so the B-tree on the raw column cannot be probed',
                        'Both — the planner rewrites A into B',
                        'Only A, because date_trunc is more selective',
                        'Neither, because 5 million rows always means a sequential scan'
                    ],
                    answer: 0,
                    verification: 'Read from the PostgreSQL 16 documentation, section 11.7 (Indexes on Expressions), which states that an ordinary index cannot serve a query whose predicate applies a function to the column. Plan node names and the row estimates below are illustrative of the shape, not a captured run.',
                    output: {
                        kind: 'trace',
                        lines: [
                            '-- A',
                            'Seq Scan on orders  (cost=0.00..96432.00 rows=25000 width=84)',
                            '  Filter: (date_trunc(\'day\', placed_at) = \'2026-10-08\'::date)',
                            '',
                            '-- B',
                            'Index Scan using orders_placed_at_idx on orders',
                            '  (cost=0.43..1204.11 rows=24800 width=84)',
                            '  Index Cond: ((placed_at >= \'2026-10-08\') AND (placed_at < \'2026-10-09\'))'
                        ],
                        explain: '<p>A B-tree is ordered by the stored value. Applying a function to the column produces something the index knows nothing about, so the only way to evaluate the predicate is to compute it for every row. <strong>Rewriting the predicate as a half-open range is the fix, and it is the general one</strong> — the same reasoning covers <code>lower(email) = ?</code>, <code>CAST(id AS text) = ?</code> and <code>col + 0 = ?</code>. When the function is genuinely needed, an expression index — <code>CREATE INDEX ON orders (date_trunc(\'day\', placed_at))</code> — makes A fast, at the cost of an index that serves only that shape of query.</p>'
                    }
                },
                {
                    type: 'predict',
                    id: 'predict-sql-order-by-with-limit-and-ties',
                    importance: 'should-know',
                    artefact: 'sql-result',
                    language: 'sql',
                    title: 'Page 2 of a non-deterministic order',
                    prompt: '<p>PostgreSQL 16. Every row in the table has <code>score = 10</code>. Pages 1 and 2 are fetched with these two queries. Can a row appear on both pages?</p>',
                    code: 'SELECT id FROM players ORDER BY score DESC LIMIT 10 OFFSET 0;\nSELECT id FROM players ORDER BY score DESC LIMIT 10 OFFSET 10;',
                    options: [
                        'Yes. The ORDER BY does not determine an order among ties, so the two queries may sort them differently',
                        'No. The same ORDER BY always produces the same order',
                        'No, because OFFSET guarantees disjoint pages',
                        'Yes, but only if a row is inserted between the two queries'
                    ],
                    answer: 0,
                    verification: 'Read from the PostgreSQL 16 documentation, section 7.5 (Sorting Rows), which states that rows not distinguished by the ORDER BY may be returned in any order, and that this can change between plans. Standard SQL, not a PostgreSQL-specific behaviour.',
                    output: {
                        kind: 'trace',
                        lines: [
                            '-- page 1',
                            ' id ',
                            '----',
                            ' 41',
                            ' 17',
                            ' ...',
                            '',
                            '-- page 2 (a different plan, or a parallel scan with a different',
                            '--         worker split, is enough to reorder the ties)',
                            ' id ',
                            '----',
                            ' 17     <-- seen again',
                            ' 93',
                            ' ...'
                        ],
                        explain: '<p><code>ORDER BY score</code> with every score equal imposes no order at all, and the engine is free to return ties however the plan happened to produce them. A row can be shown twice and another never shown — a real, reproducible bug in paginated lists sorted by a non-unique column. <strong>The fix is a total order: always append a unique tiebreaker</strong>, usually the primary key. It is also the precondition for keyset pagination, which fixes the other half of this problem — a large <code>OFFSET</code> still makes the database walk and discard every skipped row.</p>'
                    }
                },
                {
                    type: 'predict',
                    id: 'predict-sql-update-without-where-in-a-transaction',
                    importance: 'must-know',
                    artefact: 'sql-result',
                    language: 'sql',
                    title: 'The WHERE clause on the next line',
                    prompt: '<p>PostgreSQL 16, in an interactive session with autocommit on. The statement is pasted with the WHERE on a second line that never arrives. What is the state of the table?</p>',
                    code: 'UPDATE accounts SET frozen = true;\n-- WHERE id = 42;      <-- never ran\n\nSELECT count(*) FROM accounts WHERE frozen;',
                    options: [
                        'Every row is frozen and it is already committed — there is nothing to roll back',
                        'Nothing happened; the statement is incomplete without a WHERE',
                        'One row is frozen',
                        'PostgreSQL refuses an UPDATE with no WHERE clause'
                    ],
                    answer: 0,
                    verification: 'Read from the PostgreSQL 16 documentation on UPDATE (the WHERE clause is optional and its omission updates every row) and on autocommit behaviour in psql. The mitigation flags below are documented psql options.',
                    output: {
                        kind: 'trace',
                        lines: [
                            'UPDATE 4812093',
                            '',
                            '  count  ',
                            '---------',
                            ' 4812093',
                            '(1 row)',
                            '',
                            '-- autocommit: the transaction ended when the statement did.'
                        ],
                        explain: '<p>A missing <code>WHERE</code> is not a syntax error — "all rows" is a legitimate thing to mean — and with autocommit the transaction is over before you have read the row count. <strong>The three defences are all cheap and all have to be in place beforehand:</strong> run <code>BEGIN</code> first so there is something to <code>ROLLBACK</code>, start <code>psql</code> with <code>--single-transaction</code> for a session that touches production, and write the <code>WHERE</code> clause before the <code>SET</code> clause when composing the statement. <code>psql</code> also offers <code>ON_ERROR_ROLLBACK</code>, which does not help here because this is not an error.</p>'
                    }
                }
            ],
            docs: [
                { title: 'PostgreSQL 16 — Using EXPLAIN', url: 'https://www.postgresql.org/docs/16/using-explain.html', kind: 'spec' }
            ],
            relatedQuestions: []
        }
    ]
};
