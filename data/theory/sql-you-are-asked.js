/* ==========================================================================
   data/theory/sql-you-are-asked.js — module 43 in the reading path

   Nine chapters of the SQL that actually gets asked on a whiteboard. Every
   result claim in this module is checked against PostgreSQL 16 and says so,
   because "what does this return" has a different answer in MySQL for at
   least three of these chapters.
   ========================================================================== */

const sqlYouAreAskedModule = {
    id: 'sql-you-are-asked',
    trackId: 'persistence',
    order: 43,
    title: 'The SQL You Are Asked to Write',
    tagline: 'Joins, aggregation, window functions — on a whiteboard.',
    estimatedMinutes: 50,
    prerequisites: ['relational-foundations'],
    docHub: { title: 'PostgreSQL — Queries', url: 'https://www.postgresql.org/docs/current/queries.html' },

    chapters: [
        {
            id: 'join-types',
            title: 'The Joins',
            importance: 'must-know',
            summary: 'Inner, left, right, full and cross. The one that separates candidates is knowing that a condition in WHERE turns a LEFT JOIN back into an inner one.',
            interviewAngle: 'A near-certain question. Recall of the five is the warm-up; the follow-up is a filter on the right-hand table, and getting that right is what the question is for.',
            buildsOn: [],
            blocks: [
                {
                    type: 'types',
                    title: 'The five, and what each returns',
                    items: [
                        { name: 'INNER JOIN', html: '<p>Rows where the condition holds on both sides. The default when you write <code>JOIN</code>.</p>' },
                        { name: 'LEFT OUTER JOIN', html: '<p>Every left row; right columns are <code>NULL</code> where there is no match. <strong>The workhorse</strong>, and the one with the trap below.</p>' },
                        { name: 'RIGHT OUTER JOIN', html: '<p>The mirror image. Rare in practice, because reordering the tables reads better.</p>' },
                        { name: 'FULL OUTER JOIN', html: '<p>Everything from both sides, nulls where unmatched. Useful for reconciliation — finding rows present in one system and not the other.</p>' },
                        { name: 'CROSS JOIN', html: '<p>Every combination. Deliberate for generating a grid — every day crossed with every product — and an accident the rest of the time, when a join condition was forgotten.</p>' }
                    ]
                },
                {
                    type: 'syntax',
                    language: 'sql',
                    title: 'The trap: WHERE against ON for the outer side',
                    code: '-- WRONG: this is an INNER JOIN wearing a LEFT JOIN\'s clothes.\nSELECT c.name, o.total\nFROM   customer c\nLEFT   JOIN orders o ON o.customer_id = c.id\nWHERE  o.status = \'PAID\';        -- discards the NULL rows LEFT JOIN made\n\n-- RIGHT: the filter belongs in the join condition.\nSELECT c.name, o.total\nFROM   customer c\nLEFT   JOIN orders o ON o.customer_id = c.id\n                    AND o.status = \'PAID\';\n\n-- And "customers with no paid orders" is the anti-join:\nSELECT c.name\nFROM   customer c\nLEFT   JOIN orders o ON o.customer_id = c.id AND o.status = \'PAID\'\nWHERE  o.id IS NULL;',
                    output: {
                        kind: 'trace',
                        lines: [
                            'Checked against PostgreSQL 16.',
                            'A LEFT JOIN produces a row for every left row, filling the right columns with NULL where nothing matched.',
                            'WHERE runs after the join, and o.status = \'PAID\' is NULL -- not true -- for every one of those filled rows, so they are all discarded.',
                            'The result is exactly the inner join, and nothing warns. The third query is the deliberate use of the same mechanism: filter for the NULLs to get "left rows with no match".'
                        ],
                        explain: '<p>The rule to carry: for an outer join, <strong>conditions on the outer table go in <code>ON</code>, conditions on the preserved table go in <code>WHERE</code></strong>. This is the single most common SQL mistake in production code, and it is invisible in test data where every customer happens to have a paid order.</p>'
                    }
                }
            ],
            docs: [
                { title: 'PostgreSQL — Joined Tables', url: 'https://www.postgresql.org/docs/current/queries-table-expressions.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'sql-databases', questionId: 'join-types' }
            ]
        },

        {
            id: 'null-semantics',
            title: 'NULL Is Not a Value',
            importance: 'must-know',
            summary: 'NULL means unknown, so any comparison with it is unknown rather than false. Three-valued logic is where most surprising query results come from.',
            interviewAngle: 'Asked as "what does NULL = NULL return", and the good answer goes further: NOT IN with a NULL in the list returns nothing at all, which is the version that has actually broken production queries.',
            buildsOn: ['join-types'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'sql',
                    title: 'The four results worth knowing by heart',
                    code: 'SELECT NULL = NULL;                    -- NULL, not true\nSELECT NULL <> NULL;                   -- NULL, not true either\nSELECT NULL IS NULL;                   -- true. IS is the only test\n\n-- The one that bites. If ANY value in the list is NULL:\nSELECT * FROM employee\nWHERE  id NOT IN (SELECT manager_id FROM employee);   -- ZERO ROWS\n\n-- Because: id NOT IN (1, 2, NULL)\n--       is id <> 1 AND id <> 2 AND id <> NULL\n--       is true    AND true    AND UNKNOWN  ->  UNKNOWN  ->  no row\n\n-- NOT EXISTS does not have this problem.\nSELECT * FROM employee e\nWHERE  NOT EXISTS (SELECT 1 FROM employee m WHERE m.manager_id = e.id);',
                    output: {
                        kind: 'trace',
                        lines: [
                            'Checked against PostgreSQL 16.',
                            'NOT IN with a NULL anywhere in the subquery result returns no rows at all -- never an error, never a warning.',
                            'The query is correct in development, where manager_id happens to be populated on every row, and returns nothing in production the first time a top-level employee exists.',
                            'NOT EXISTS uses row existence rather than value comparison, so a NULL in the inner query is irrelevant. It is also usually the faster plan.'
                        ],
                        explain: '<p>Two more consequences worth carrying: <code>COUNT(column)</code> skips nulls while <code>COUNT(*)</code> counts rows, so the two differ on any nullable column; and every aggregate except <code>COUNT(*)</code> ignores nulls, so <code>AVG</code> over a column with missing values divides by the non-null count rather than the row count.</p>'
                    }
                },
                {
                    type: 'tip',
                    html: '<p>Prefer <code>NOT EXISTS</code> to <code>NOT IN</code> as a habit, and say why if asked: it is null-safe and it usually produces a better plan, because the optimiser can turn it into an anti-join. There is no case where <code>NOT IN</code> over a subquery is clearly better.</p>'
                }
            ],
            docs: [
                { title: 'PostgreSQL — Comparison Functions and Operators', url: 'https://www.postgresql.org/docs/current/functions-comparison.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'sql-databases', questionId: 'null-semantics' }
            ]
        },

        {
            id: 'group-by-and-having',
            title: 'GROUP BY and HAVING',
            importance: 'must-know',
            summary: 'WHERE filters rows before grouping, HAVING filters groups after. Knowing the clause evaluation order answers most questions about both.',
            interviewAngle: 'The evaluation order is the answer to several questions at once — why you cannot use a column alias in WHERE, why HAVING can use an aggregate and WHERE cannot, and why ORDER BY can use the alias.',
            buildsOn: ['null-semantics'],
            blocks: [
                {
                    type: 'types',
                    title: 'The logical evaluation order',
                    items: [
                        { name: '1. FROM and JOIN', html: '<p>Build the working set.</p>' },
                        { name: '2. WHERE', html: '<p>Filter <strong>rows</strong>. No aggregates here — none have been computed yet.</p>' },
                        { name: '3. GROUP BY', html: '<p>Collapse rows into groups.</p>' },
                        { name: '4. HAVING', html: '<p>Filter <strong>groups</strong>. Aggregates are available; this is the whole difference from <code>WHERE</code>.</p>' },
                        { name: '5. SELECT', html: '<p>Where column aliases come into existence — which is why <code>WHERE</code> cannot use one.</p>' },
                        { name: '6. ORDER BY', html: '<p>After <code>SELECT</code>, so it <em>can</em> use an alias.</p>' },
                        { name: '7. LIMIT / OFFSET', html: '<p>Last. This is why <code>LIMIT</code> without <code>ORDER BY</code> is non-deterministic.</p>' }
                    ]
                },
                {
                    type: 'syntax',
                    language: 'sql',
                    title: 'Both filters in one query, doing different jobs',
                    code: 'SELECT   c.id,\n         c.name,\n         COUNT(*)      AS order_count,\n         SUM(o.total)  AS lifetime_value\nFROM     customer c\nJOIN     orders o ON o.customer_id = c.id\nWHERE    o.created_at >= DATE \'2026-01-01\'   -- rows, before grouping\nGROUP BY c.id, c.name\nHAVING   COUNT(*) >= 5                       -- groups, after\nORDER BY lifetime_value DESC                 -- the alias works here\nLIMIT    20;',
                    output: {
                        kind: 'trace',
                        lines: [
                            'Checked against PostgreSQL 16.',
                            'Grouping by c.id alone is legal here because id is the primary key -- PostgreSQL knows name is functionally dependent on it, so it need not be listed.',
                            'That is not portable: most engines require every non-aggregated select column in the GROUP BY, and MySQL accepts it only with ONLY_FULL_GROUP_BY disabled, where it returns an arbitrary row\'s value.',
                            'Listing both columns, as above, is correct everywhere and costs nothing.'
                        ],
                        explain: '<p>The functional-dependency rule is a good thing to know and a bad thing to rely on. Writing the full <code>GROUP BY</code> is portable, and it makes the query readable without knowing which columns happen to be keys.</p>'
                    }
                }
            ],
            docs: [
                { title: 'PostgreSQL — GROUP BY and HAVING', url: 'https://www.postgresql.org/docs/current/queries-table-expressions.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'sql-databases', questionId: 'group-by-and-having' }
            ]
        },

        {
            id: 'subqueries-vs-joins',
            title: 'EXISTS, IN and JOIN',
            importance: 'should-know',
            summary: 'Three ways to express "rows that have a related row", with different null behaviour and different duplicate behaviour.',
            interviewAngle: 'Asked as "which is faster", and the honest answer is that a modern optimiser usually rewrites all three into the same plan — so the real criteria are null-safety and whether the join can duplicate rows.',
            buildsOn: ['null-semantics'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'The three, on the criteria that actually differ',
                    left: 'EXISTS',
                    right: 'IN, and JOIN',
                    rows: [
                        { aspect: 'Null-safe', left: '<strong>Yes</strong>', right: '<code>IN</code> yes; <code>NOT IN</code> <strong>no</strong>' },
                        { aspect: 'Can duplicate rows', left: 'No — it is a test', right: '<code>JOIN</code> <strong>yes</strong>, one per match' },
                        { aspect: 'Can select from the other table', left: 'No', right: '<code>JOIN</code> yes — the reason to use it' },
                        { aspect: 'Correlated', left: 'Yes, by nature', right: 'Usually not' },
                        { aspect: 'Typical plan', left: 'Semi-join', right: 'Semi-join, or a real join for <code>JOIN</code>' },
                        { aspect: 'Reach for it when', left: 'You only need "does one exist"', right: 'You need columns from the other table' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A <code>JOIN</code> used as an existence test duplicates rows.</strong> "Customers who have placed an order" written as a join returns one row per order, so a customer with nine orders appears nine times — and the usual repair is to add <code>DISTINCT</code>, which forces a sort or a hash over the whole result to undo work that should not have been done. <code>EXISTS</code> stops at the first match and cannot duplicate. If you are reaching for <code>DISTINCT</code> after a join, the join was probably the wrong construct.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The answer to "which is faster" that actually sounds experienced: <em>"Usually the same — PostgreSQL rewrites <code>IN</code> and <code>EXISTS</code> into a semi-join and picks a plan on cost. I choose on semantics: <code>EXISTS</code> when I only need the test, a join when I need columns from the other side, and never <code>NOT IN</code> over a nullable subquery."</em></p>'
                }
            ],
            docs: [
                { title: 'PostgreSQL — Subquery Expressions', url: 'https://www.postgresql.org/docs/current/functions-subquery.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'sql-databases', questionId: 'exists-vs-in-vs-join' }
            ]
        },

        {
            id: 'cte-and-recursion',
            title: 'CTEs and Recursion',
            importance: 'should-know',
            summary: 'WITH names a subquery so a complex statement reads top to bottom. RECURSIVE walks a hierarchy, which is the interview use.',
            interviewAngle: 'The recursive form is asked for org charts, category trees and bill-of-materials. Knowing the two-part shape — anchor, then a UNION ALL that references the CTE — is the whole answer.',
            buildsOn: ['group-by-and-having'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'sql',
                    title: 'Walking a hierarchy, with a depth column and a cycle guard',
                    code: 'WITH RECURSIVE subordinates AS (\n    -- Anchor: where the walk starts.\n    SELECT id, name, manager_id, 1 AS depth\n    FROM   employee\n    WHERE  id = 42\n\n    UNION ALL\n\n    -- Recursive term: references the CTE by name.\n    SELECT e.id, e.name, e.manager_id, s.depth + 1\n    FROM   employee e\n    JOIN   subordinates s ON e.manager_id = s.id\n    WHERE  s.depth < 10             -- a guard. Real data has cycles.\n)\nSELECT * FROM subordinates ORDER BY depth, name;',
                    output: {
                        kind: 'trace',
                        lines: [
                            'Checked against PostgreSQL 16.',
                            'The anchor runs once. The recursive term then runs repeatedly against the rows the previous iteration produced, until it produces none.',
                            'UNION ALL keeps duplicates and is the normal choice; plain UNION deduplicates on every iteration, which is slower and occasionally what you want as a cycle guard.',
                            'Without the depth guard, a data cycle -- an employee who is transitively their own manager -- loops until the query is cancelled or the server runs out of memory. Referential integrity does not prevent a cycle.'
                        ],
                        explain: '<p>PostgreSQL 14 added <code>CYCLE</code> and <code>SEARCH</code> clauses that handle both concerns declaratively, and the depth guard remains the portable version. Note also that <code>WITH RECURSIVE</code> is required even when only one CTE in the list is recursive.</p>'
                    }
                },
                {
                    type: 'version',
                    title: 'CTEs used to be an optimiser fence',
                    items: [
                        { version: 'PostgreSQL 11', state: 'was', html: '<p>Every CTE was materialised — computed in full, then used. That made a CTE a way to <em>force</em> a plan, and also a performance trap when the outer query would have filtered it.</p>' },
                        { version: 'PostgreSQL 12', state: 'changed', html: '<p>CTEs are inlined when referenced once and not recursive, so predicates push down. <code>MATERIALIZED</code> and <code>NOT MATERIALIZED</code> force either behaviour explicitly.</p>' }
                    ]
                }
            ],
            docs: [
                { title: 'PostgreSQL — WITH Queries', url: 'https://www.postgresql.org/docs/current/queries-with.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'sql-databases', questionId: 'ctes-and-recursion' }
            ]
        },

        {
            id: 'window-functions',
            title: 'Window Functions',
            importance: 'must-know',
            summary: 'An aggregate that does not collapse rows. Every row keeps its identity and gains a value computed over a window of its neighbours.',
            interviewAngle: 'The strongest single SQL skill to demonstrate, because the problems it solves — running totals, rank per group, comparing to the previous row — are otherwise self-joins that most candidates write incorrectly.',
            buildsOn: ['group-by-and-having'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'sql',
                    title: 'The three families, in one query',
                    code: 'SELECT\n    department,\n    name,\n    salary,\n\n    -- Ranking\n    ROW_NUMBER() OVER w        AS rn,     -- 1,2,3,4 -- always distinct\n    RANK()       OVER w        AS rnk,    -- 1,2,2,4 -- gaps after a tie\n    DENSE_RANK() OVER w        AS drnk,   -- 1,2,2,3 -- no gaps\n\n    -- Aggregate over the window\n    SUM(salary)  OVER (PARTITION BY department) AS dept_total,\n    AVG(salary)  OVER (PARTITION BY department) AS dept_avg,\n\n    -- Offset. The window is ORDER BY salary DESC, so LAG looks back\n    -- along that order -- towards the HIGHER salaries -- and LEAD\n    -- looks forward, towards the lower ones. Getting these the wrong\n    -- way round is the classic mistake with a descending window.\n    LAG(salary)  OVER w        AS next_higher,\n    LEAD(salary) OVER w        AS next_lower\n\nFROM   employee\nWINDOW w AS (PARTITION BY department ORDER BY salary DESC);',
                    output: {
                        kind: 'trace',
                        lines: [
                            'Checked against PostgreSQL 16.',
                            'PARTITION BY resets the window per group; ORDER BY defines the order within it. Neither collapses rows -- every input row is still in the output.',
                            'The WINDOW clause names a window so it is written once rather than repeated on every function, which is the readable form and is portable.',
                            'The three ranking functions differ only on ties, and that difference is what the question is usually testing: ROW_NUMBER breaks ties arbitrarily, RANK leaves gaps, DENSE_RANK does not.'
                        ],
                        explain: '<p>The other detail worth knowing is the default frame. With an <code>ORDER BY</code> and no explicit frame, the window is <code>RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW</code> — which is what makes <code>SUM(x) OVER (ORDER BY d)</code> a running total. Without an <code>ORDER BY</code>, the frame is the whole partition, which is what makes the <code>dept_total</code> column above a group total.</p>'
                    }
                },
                {
                    type: 'tip',
                    html: '<p>The mental model that makes these click: a window function runs <strong>after</strong> <code>GROUP BY</code> and <code>HAVING</code>, over the rows that survived, and produces one value per row rather than one per group. That also explains why a window function cannot appear in <code>WHERE</code> — it has not been computed yet — and why filtering on one requires wrapping the query in a subquery or a CTE.</p>'
                }
            ],
            docs: [
                { title: 'PostgreSQL — Window Functions', url: 'https://www.postgresql.org/docs/current/tutorial-window.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'sql-databases', questionId: 'window-functions' }
            ]
        },

        {
            id: 'second-highest-salary-and-friends',
            title: 'The Classic Whiteboard Questions',
            importance: 'must-know',
            summary: 'Second-highest salary, top N per group, duplicates, gaps. Four shapes that cover most of what gets asked, and the follow-up is always about ties.',
            interviewAngle: 'These are asked verbatim. Having the window-function form ready is good; having the answer to "what if two people earn the same" ready is what actually separates candidates.',
            buildsOn: ['window-functions'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'sql',
                    title: 'Second-highest, three ways, with the tie behaviour spelled out',
                    code: '-- 1. DENSE_RANK. "Second-highest SALARY", ties share a rank.\nSELECT DISTINCT salary\nFROM  (SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) r\n       FROM employee) t\nWHERE r = 2;\n\n-- 2. OFFSET. "The second row", which is NOT the same question.\nSELECT DISTINCT salary FROM employee\nORDER BY salary DESC\nLIMIT 1 OFFSET 1;\n\n-- 3. The correlated form, for an interviewer who bans window functions.\nSELECT MAX(salary) FROM employee\nWHERE salary < (SELECT MAX(salary) FROM employee);',
                    output: {
                        kind: 'trace',
                        lines: [
                            'Checked against PostgreSQL 16.',
                            'With salaries 100, 100, 90: DENSE_RANK gives 90 -- the second distinct salary. RANK would give nothing at r = 2, because it produces 1, 1, 3.',
                            'The OFFSET form without DISTINCT returns 100, the second ROW, which answers a different question -- and that ambiguity is exactly what the interviewer is probing.',
                            'The third form returns 90 and needs no window functions. It is also the one to reach for when the question is explicitly about pre-window SQL.'
                        ],
                        explain: '<p>Ask which is meant before writing: "second-highest salary" and "the salary of the second-highest-paid employee" differ whenever there is a tie. Asking is not a stall — it is the part of the answer the interviewer is looking for.</p>'
                    }
                },
                {
                    type: 'syntax',
                    language: 'sql',
                    title: 'Top N per group, and finding duplicates',
                    code: '-- Top 3 earners per department. The canonical window-function answer.\nSELECT * FROM (\n    SELECT e.*,\n           ROW_NUMBER() OVER (PARTITION BY department\n                              ORDER BY salary DESC, id) AS rn\n    FROM   employee e\n) t\nWHERE rn <= 3;\n\n-- Rows duplicated on a business key.\nSELECT email, COUNT(*)\nFROM   users\nGROUP BY email\nHAVING COUNT(*) > 1;\n\n-- Delete all but the oldest of each duplicate group.\nDELETE FROM users u\nUSING  users keep\nWHERE  u.email = keep.email\n  AND  u.id    > keep.id;',
                    notes: '<p>The tie-breaker on <code>id</code> in the first query is not decoration. Without it, two employees on the same salary are ordered arbitrarily, so the query returns a different set of three between runs — which is the same non-determinism as pagination without a unique sort.</p>'
                }
            ],
            docs: [
                { title: 'PostgreSQL — Window Function Calls', url: 'https://www.postgresql.org/docs/current/sql-expressions.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'sql-databases', questionId: 'window-functions' }
            ]
        },

        {
            id: 'set-operations',
            title: 'UNION, INTERSECT, EXCEPT',
            importance: 'good-to-know',
            summary: 'Set operations over two result sets. UNION deduplicates and UNION ALL does not, which is the only part that gets asked.',
            interviewAngle: 'A small question. The point worth making is that UNION does a sort or hash to deduplicate, so UNION ALL is the default unless duplicates are actually a problem.',
            buildsOn: ['group-by-and-having'],
            blocks: [
                {
                    type: 'table',
                    title: 'The four',
                    headers: ['Operation', 'Returns', 'Deduplicates'],
                    rows: [
                        ['<code>UNION</code>', 'Rows in either', '<strong>Yes</strong> — pays for a sort or hash'],
                        ['<code>UNION ALL</code>', 'Rows in either, duplicates kept', 'No — <strong>the default choice</strong>'],
                        ['<code>INTERSECT</code>', 'Rows in both', 'Yes'],
                        ['<code>EXCEPT</code>', 'Rows in the first and not the second', 'Yes']
                    ]
                },
                {
                    type: 'tip',
                    html: '<p><code>EXCEPT</code> is the quickest way to compare two result sets during a migration or a rewrite: run the old query and the new one, <code>EXCEPT</code> in both directions, and both results being empty means the rewrite is equivalent on that data. It is a cheap regression test for a query change and nobody thinks of it.</p>'
                }
            ],
            docs: [
                { title: 'PostgreSQL — Combining Queries', url: 'https://www.postgresql.org/docs/current/queries-union.html', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'upsert',
            title: 'Insert or Update',
            importance: 'should-know',
            summary: 'ON CONFLICT does it atomically. Doing it as a select then an insert is a race that will produce duplicates under concurrency.',
            interviewAngle: 'Comes up in any discussion of idempotency or import jobs. The point that matters is atomicity — the naive version is check-then-act, the same shape as the uniqueness check in the previous module.',
            buildsOn: ['set-operations'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'sql',
                    title: 'The atomic form, and its two variants',
                    code: '-- Insert, or update if the unique key already exists.\nINSERT INTO product (sku, name, price)\nVALUES (\'A-1\', \'Widget\', 9.99)\nON CONFLICT (sku) DO UPDATE\n    SET name  = EXCLUDED.name,        -- EXCLUDED is the row you tried\n        price = EXCLUDED.price\nRETURNING id;\n\n-- Insert if absent, do nothing if present. The idempotent-import form.\nINSERT INTO processed_event (event_id)\nVALUES (\'evt-8827\')\nON CONFLICT (event_id) DO NOTHING;\n\n-- The naive version, which is a race:\n--   SELECT ... ; if none: INSERT ...\n-- Two concurrent callers both find none, both insert, one gets a\n-- constraint violation -- or, without the constraint, you get duplicates.',
                    output: {
                        kind: 'trace',
                        lines: [
                            'Checked against PostgreSQL 16.',
                            'ON CONFLICT requires a unique index or constraint on the named columns -- it is the index that detects the conflict, so there is no way to do this without one.',
                            'EXCLUDED refers to the row that was proposed for insertion, which is how the update clause reaches values that were never stored.',
                            'DO NOTHING still consumes a sequence value for a serial or identity column, so ids have gaps after a run of conflicts. That is normal and not a bug.'
                        ],
                        explain: '<p>The <code>DO NOTHING</code> form is the standard implementation of exactly-once event processing: insert the event id, and if the insert did nothing, the event was already handled. It is atomic, needs no lock, and it is the same idea as the idempotency key from the HTTP module with the database doing the work.</p>'
                    }
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>MySQL\'s equivalents are not equivalent.</strong> <code>INSERT ... ON DUPLICATE KEY UPDATE</code> fires on <em>any</em> unique key rather than a named one, so a table with two unique constraints behaves in a way the statement does not express. <code>REPLACE INTO</code> is worse: it deletes the existing row and inserts a new one, which fires delete triggers and cascades foreign keys. If a codebase runs on both engines, this is one of the places the SQL cannot be shared.</p>'
                }
            ],
            docs: [
                { title: 'PostgreSQL — INSERT ... ON CONFLICT', url: 'https://www.postgresql.org/docs/current/sql-insert.html', kind: 'guide' }
            ],
            relatedQuestions: []
        }
    ]
};
