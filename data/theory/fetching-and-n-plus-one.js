/* ==========================================================================
   data/theory/fetching-and-n-plus-one.js — module 50 in the reading path

   Nine chapters on the most common JPA performance bug. The detection
   chapter comes before the fixes deliberately: N+1 is invisible in code
   review and invisible in a small test dataset, so a reader who cannot
   detect it will not know which of the fixes to reach for.
   ========================================================================== */

const fetchingAndNPlusOneModule = {
    id: 'fetching-and-n-plus-one',
    trackId: 'persistence',
    order: 50,
    title: 'Fetching and the N+1 Problem',
    tagline: 'The most common JPA performance bug, and its three fixes.',
    estimatedMinutes: 45,
    prerequisites: ['persistence-context'],
    docHub: { title: 'Hibernate — Fetching', url: 'https://docs.hibernate.org/orm/current/userguide/html_single/' },

    chapters: [
        {
            id: 'lazy-vs-eager',
            title: 'Lazy and Eager',
            importance: 'must-know',
            summary: 'Lazy defers the query until the association is touched. Eager issues it with the parent, every time, whether the caller wanted it or not.',
            interviewAngle: 'The defaults are asked verbatim: to-one is EAGER, to-many is LAZY. The reason that matters is that the eager default is the one nobody chose and the one that causes the problem.',
            buildsOn: [],
            blocks: [
                {
                    type: 'table',
                    title: 'The specification defaults',
                    headers: ['Annotation', 'Default', 'Should be'],
                    rows: [
                        ['<code>@ManyToOne</code>', '<strong><code>EAGER</code></strong>', '<code>LAZY</code>, explicitly'],
                        ['<code>@OneToOne</code>', '<strong><code>EAGER</code></strong>', '<code>LAZY</code> — with a caveat below'],
                        ['<code>@OneToMany</code>', '<code>LAZY</code>', 'Leave it'],
                        ['<code>@ManyToMany</code>', '<code>LAZY</code>', 'Leave it'],
                        ['<code>@Basic</code> / <code>@Lob</code>', '<code>EAGER</code>', '<code>LAZY</code> for a large blob, which needs bytecode enhancement']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A lazy <code>@OneToOne</code> on the non-owning side cannot be lazy.</strong> Hibernate must know whether the association is null in order to decide between a proxy and a null, and on the side without the foreign key the only way to find out is to query. So it queries, eagerly, whatever the annotation says. The workaround is to make the association owning where possible, or to use <code>@MapsId</code> so the child shares the parent\'s id — at which point nullability is known.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Set <code>fetch = FetchType.LAZY</code> on every to-one association as a rule, and treat it as unfinished if it is missing. The eager default is a specification decision from a different era of application shapes, and it is the single most consequential default in JPA.</p>'
                }
            ],
            docs: [
                { title: 'Hibernate — Fetching Strategies', url: 'https://docs.hibernate.org/orm/current/userguide/html_single/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'jpa-hibernate', questionId: 'lazy-vs-eager-defaults' }
            ]
        },

        {
            id: 'why-eager-is-almost-always-wrong',
            title: 'Why EAGER Is Almost Always Wrong',
            importance: 'must-know',
            summary: 'It is a global decision made at the mapping, applied to every query, to satisfy the needs of one of them.',
            interviewAngle: 'The reasoning is what is being tested rather than the position. The strongest form is that eager fetching removes the caller\'s ability to decide, and different callers legitimately need different graphs.',
            buildsOn: ['lazy-vs-eager'],
            blocks: [
                {
                    type: 'types',
                    title: 'What eager costs',
                    items: [
                        { name: 'It applies everywhere', html: '<p>The mapping cannot know which query is running. A list endpoint that needs no associations pays for them on every row.</p>' },
                        { name: 'It is transitive', html: '<p>An eager association whose target has eager associations loads those too. Three levels of this loads a substantial part of the schema for one <code>findById</code>.</p>' },
                        { name: 'It defeats its own purpose', html: '<p>Eager is often added to fix a <code>LazyInitializationException</code> — and eager on a to-one still produces one query per parent row in a list, which is N+1 with extra loading.</p>' },
                        { name: 'It cannot be turned off', html: '<p>A lazy association can be fetched eagerly for one query with <code>JOIN FETCH</code>. An eager one cannot be made lazy for one query. <strong>Lazy is the flexible choice; eager is the irreversible one.</strong></p>' },
                        { name: 'It makes the cost invisible', html: '<p>The query in the code says <code>findAll()</code>. The eight joins are in an annotation on another file.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>The last bullet is the argument to lead with: <em>"Fetching is a property of the use case, not of the entity. Lazy plus an explicit fetch per query means each caller says what it needs; eager means the mapping decides for all of them, and you cannot opt out for the queries that do not want it."</em></p>'
                }
            ],
            docs: [
                { title: 'Hibernate — Fetching', url: 'https://docs.hibernate.org/orm/current/userguide/html_single/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'jpa-hibernate', questionId: 'lazy-vs-eager-defaults' }
            ]
        },

        {
            id: 'detecting-n-plus-one',
            title: 'Detecting It',
            importance: 'must-know',
            summary: 'It is invisible in code review and invisible in a test with three rows. Counting queries per request is the only thing that finds it reliably.',
            interviewAngle: 'Placed before the fixes on purpose, and the answer that impresses is a test that asserts a query count — because it means the problem cannot come back once fixed.',
            buildsOn: ['why-eager-is-almost-always-wrong'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The bug, and the query count it produces',
                    code: '@Transactional(readOnly = true)\nList<OrderView> list() {\n    return orderRepository.findAll().stream()      // 1 query\n            .map(o -> new OrderView(\n                    o.getId(),\n                    o.getCustomer().getName(),        // 1 query PER ORDER\n                    o.getLines().size()))             // 1 query PER ORDER\n            .toList();\n}\n// 100 orders -> 201 queries. Every one fast; the total is not.',
                    output: {
                        kind: 'trace',
                        lines: [
                            'The first query returns the orders. Each getCustomer() then triggers a load for a customer not yet in the context, and each getLines() triggers a load for that order\'s lines.',
                            'None of the extra queries appears in the source. The only clue is that a stream is dereferencing associations.',
                            'A test fixture with three orders issues seven queries and passes in nine milliseconds, so nothing fails.',
                            'Production has ten thousand orders on the page nobody paginated, and the endpoint takes eleven seconds.'
                        ],
                        explain: '<p>This is why detection comes before the fixes. The code is correct, readable and reviewed; the defect is a property of the runtime behaviour and the data volume, and neither is visible in the diff.</p>'
                    }
                },
                {
                    type: 'types',
                    title: 'Four ways to find it, weakest first',
                    items: [
                        { name: 'Look at the SQL log', html: '<p><code>spring.jpa.show-sql</code> or, better, <code>logging.level.org.hibernate.SQL=DEBUG</code>. Works, is noisy, and only finds what you go looking for.</p>' },
                        { name: 'Hibernate statistics', html: '<p>Query counts per session, exposed as metrics. Good for a dashboard and for spotting a regression across a release.</p>' },
                        { name: 'datasource-proxy or p6spy', html: '<p>Counts and logs queries per request. Puts a number on it in an environment you can reproduce.</p>' },
                        { name: 'A test that asserts a count', html: '<p><strong>The only one that stops it recurring.</strong> Assert that this endpoint issues at most three queries; the assertion fails the day somebody adds an innocent-looking <code>getCustomer()</code>.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>Seed the test data properly. An N+1 with three rows is seven queries and eleven milliseconds, which passes every performance expectation anybody has. A fixture with a few hundred rows, plus an assertion on the query count, is what turns this from a recurring production surprise into a build failure.</p>'
                }
            ],
            docs: [
                { title: 'Hibernate — Statistics', url: 'https://docs.hibernate.org/orm/current/userguide/html_single/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'jpa-hibernate', questionId: 'n-plus-one' }
            ]
        },

        {
            id: 'join-fetch',
            title: 'JOIN FETCH',
            importance: 'must-know',
            summary: 'One query, one join, associations loaded. The first fix to reach for, and it has two limitations that both matter.',
            interviewAngle: 'The expected answer to "how do you fix N+1". Knowing that DISTINCT was needed and no longer is, and that two collection fetches produce a cartesian product, is what takes it beyond the headline.',
            buildsOn: ['detecting-n-plus-one'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The fix, and the two things it cannot do',
                    code: '@Query("""\n        select o from Order o\n        join fetch o.customer\n        join fetch o.lines\n        where o.status = :status\n        """)\nList<Order> findWithEverything(@Param("status") String status);\n\n// LIMITATION 1: two collection fetches is a cartesian product.\n//   join fetch o.lines  join fetch o.tags\n//   -> MultipleBagFetchException, or 10 lines x 5 tags = 50 rows\n//      per order. Fetch ONE collection per query.\n\n// LIMITATION 2: pagination. See the chapter after next.',
                    output: {
                        kind: 'trace',
                        lines: [
                            'One SQL statement with two joins replaces 201 statements.',
                            'The result set has one row per line item, so an order with ten lines appears ten times -- and Hibernate de-duplicates the entities, because the persistence context guarantees one instance per row.',
                            'Before Hibernate 6, the LIST still contained the duplicates and select distinct was required to collapse them. Since Hibernate 6 that is automatic, and the old distinct is now redundant.',
                            'Two collection fetches multiply: ten lines and five tags is fifty result rows per order, and Hibernate refuses two bag fetches outright with MultipleBagFetchException.'
                        ],
                        explain: '<p>Mapping the collections as <code>Set</code> rather than <code>List</code> avoids <code>MultipleBagFetchException</code> — and it does not avoid the cartesian product, which is still fifty rows of transfer for fifteen objects. One collection per query is the rule; the batch-fetch chapter is how to handle the second one.</p>'
                    }
                },
                {
                    type: 'version',
                    title: 'The distinct requirement went away',
                    items: [
                        { version: 'Hibernate 5', state: 'was', html: '<p><code>select distinct o</code> was required with a collection <code>join fetch</code>, or the list contained one entry per joined row. It also emitted <code>DISTINCT</code> into the SQL, where it did nothing but cost a sort.</p>' },
                        { version: 'Hibernate 6', state: 'changed', html: '<p>De-duplication is automatic. <code>distinct</code> is unnecessary, and where it is still written it now only affects the SQL — which is almost never what was wanted.</p>' }
                    ]
                }
            ],
            docs: [
                { title: 'Hibernate — Fetch Joins', url: 'https://docs.hibernate.org/orm/current/userguide/html_single/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'jpa-hibernate', questionId: 'n-plus-one' }
            ]
        },

        {
            id: 'entitygraph',
            title: 'Entity Graphs',
            importance: 'should-know',
            summary: 'The same effect as JOIN FETCH, declared separately from the query — so one repository method can be reused with different fetch plans.',
            interviewAngle: 'A depth answer to the same question. The advantage worth naming is that a derived query method can carry a graph, so you do not have to write JPQL just to change what is fetched.',
            buildsOn: ['join-fetch'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'A graph on a derived method',
                    code: '@Entity\n@NamedEntityGraph(\n        name = "Order.withCustomerAndLines",\n        attributeNodes = {\n                @NamedAttributeNode("customer"),\n                @NamedAttributeNode("lines")\n        })\nclass Order { ... }\n\ninterface OrderRepository extends JpaRepository<Order, Long> {\n\n    // No JPQL. The graph decides what is fetched.\n    @EntityGraph("Order.withCustomerAndLines")\n    List<Order> findByStatus(String status);\n\n    // Or ad hoc, without a named graph on the entity:\n    @EntityGraph(attributePaths = { "customer", "lines.product" })\n    Optional<Order> findWithLinesById(Long id);\n}',
                    notes: '<p>Two types exist. <code>FETCH</code> — the default here — makes the listed attributes eager and leaves the rest at their mapped fetch type. <code>LOAD</code> makes the listed ones eager and everything else lazy, which is stricter and rarely what people mean.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The rule that decides between them: <strong><code>JOIN FETCH</code> when the query is already custom JPQL; an entity graph when it is a derived method.</strong> Writing JPQL purely to add a fetch join, when the query itself is <code>findByStatus</code>, is trading a readable method name for a string — the graph keeps both.</p>'
                }
            ],
            docs: [
                { title: 'Spring Data JPA — Entity Graphs', url: 'https://docs.spring.io/spring-data/jpa/reference/jpa/entity-persistence.html', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'batch-fetch-size',
            title: 'Batch Fetching',
            importance: 'should-know',
            summary: 'Turn N queries into N/size queries by loading lazy associations in groups. It does not eliminate the extra queries; it collapses them.',
            interviewAngle: 'The third fix, and the one that scales to a graph too wide to fetch in one join. It is also a single property, which makes it the cheapest thing to try.',
            buildsOn: ['join-fetch'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'properties',
                    title: 'One property, applied globally',
                    code: '# When Hibernate must initialise a lazy association, it initialises\n# up to this many pending proxies of the same type in one statement.\nspring.jpa.properties.hibernate.default_batch_fetch_size=25\n\n# Per association, if a global default is too blunt:\n#   @BatchSize(size = 25)\n#   private List<LineItem> lines;',
                    output: {
                        kind: 'trace',
                        lines: [
                            'Without it, 100 orders each touching getCustomer() issue 100 single-row selects.',
                            'With it, the first touch pulls 25 pending customer proxies into one statement: WHERE id IN (?, ?, ... 25 values).',
                            'So 100 queries become 4, and the code that dereferences the association is unchanged.',
                            'This is the fix for the second collection in a graph -- fetch one with JOIN FETCH, and let batch fetching collapse the other from N queries to N/25.'
                        ],
                        explain: '<p>It does not produce a cartesian product, so it composes where a second <code>JOIN FETCH</code> would not. Twenty-five is a reasonable default; the ceiling is what your driver and database will accept in an <code>IN</code> list, and very large values can defeat plan caching because each distinct list length is a different statement.</p>'
                    }
                },
                {
                    type: 'tip',
                    html: '<p>Setting <code>default_batch_fetch_size</code> is one of the highest value-to-effort changes available on an existing JPA codebase: one property, no code change, and it turns every remaining N+1 in the application into N/25+1. It is a mitigation rather than a fix — the queries are still happening — and it buys time to fix the specific hot paths properly.</p>'
                }
            ],
            docs: [
                { title: 'Hibernate — Batch Fetching', url: 'https://docs.hibernate.org/orm/current/userguide/html_single/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'jpa-hibernate', questionId: 'n-plus-one' }
            ]
        },

        {
            id: 'pagination-with-join-fetch',
            title: 'Pagination With a Collection Fetch',
            importance: 'must-know',
            summary: 'Hibernate cannot apply LIMIT to a query that joins a collection, so it fetches every row and paginates in memory. It warns, and the warning is usually not read.',
            interviewAngle: 'A specific, checkable failure with a memorable log line. Recognising HHH000104 and knowing why it happens is a strong signal of real JPA experience.',
            buildsOn: ['entitygraph'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>A collection <code>join fetch</code> produces one SQL row per child, so <code>LIMIT 20</code> would cut off mid-order — twenty <em>rows</em> is not twenty orders. Hibernate cannot express the intent in SQL, so it does the only correct thing available: it runs the query without a limit, materialises <strong>every matching row</strong>, and applies the pagination in Java.</p><p>It says so, at <code>WARN</code>: <code>HHH000104: firstResult/maxResults specified with collection fetch; applying in memory</code>. On a table of ten million orders that line is the difference between a fast endpoint and an <code>OutOfMemoryError</code>.</p>'
                },
                {
                    type: 'types',
                    title: 'The three ways out',
                    items: [
                        { name: 'Two queries', html: '<p>Page the ids first — <code>select o.id ... limit 20</code>, which paginates correctly because there is no join. Then fetch the full graph with <code>where o.id in :ids</code>. <strong>The standard answer</strong>, and Hibernate\'s own recommendation.</p>' },
                        { name: 'Batch fetching', html: '<p>Do not fetch the collection at all. Page the parents, and let <code>default_batch_fetch_size</code> collapse the child loads. One extra query per twenty-five parents, and pagination works normally.</p>' },
                        { name: 'A DTO projection', html: '<p>If the page is being rendered rather than mutated, select the columns directly. No entities, no collection fetch, and the database does the pagination.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>Search the logs for <code>HHH000104</code> on any JPA codebase you inherit. It is a one-line grep, it is almost always present somewhere, and every occurrence is an endpoint that will fall over at a data volume nobody has reached yet.</p>'
                }
            ],
            docs: [
                { title: 'Hibernate — Pagination', url: 'https://docs.hibernate.org/orm/current/userguide/html_single/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'jpa-hibernate', questionId: 'join-fetch-and-pagination' }
            ]
        },

        {
            id: 'dto-projections',
            title: 'Not Loading Entities At All',
            importance: 'must-know',
            summary: 'For a read that is rendered rather than modified, select the columns you need. No persistence context, no dirty-check snapshots, no lazy proxies.',
            interviewAngle: 'The answer that shows the problem was understood rather than the fix memorised: much of what N+1 costs is paid for managing entities nobody intends to change.',
            buildsOn: ['pagination-with-join-fetch'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Three projection styles',
                    code: '// 1. A constructor expression. Explicit, and it selects only these\n//    columns -- one query, no entities, no snapshots.\n@Query("""\n        select new com.acme.OrderSummary(o.id, c.name, count(l))\n        from Order o join o.customer c join o.lines l\n        where o.status = :status\n        group by o.id, c.name\n        """)\nList<OrderSummary> summaries(@Param("status") String status);\n\n// 2. An interface projection. Spring Data implements it; the property\n//    names drive the select list.\ninterface OrderSummary {\n    Long   getId();\n    String getCustomerName();\n}\nList<OrderSummary> findByStatus(String status);\n\n// 3. A record, from Spring Data 3. Same idea, less ceremony.\nrecord OrderSummary(Long id, String customerName) { }',
                    notes: '<p>All three avoid the persistence context entirely for that query. The saving is not only the joins: a managed entity carries a dirty-checking snapshot and participates in every flush, and a read-only projection does none of that.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The decision rule worth stating: <strong>if the transaction will not modify it, do not load an entity.</strong> Entities are for the write path, where dirty checking and the identity guarantee earn their cost. A list endpoint, a report, an export and a search result are all reads, and a projection is both faster and — because it cannot lazily load anything — incapable of producing an N+1 at all.</p>'
                }
            ],
            docs: [
                { title: 'Spring Data JPA — Projections', url: 'https://docs.spring.io/spring-data/jpa/reference/repositories/projections.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'jpa-hibernate', questionId: 'projections-and-dto-queries' }
            ]
        },

        {
            id: 'hibernate-statistics',
            title: 'Putting a Number on It',
            importance: 'good-to-know',
            summary: 'Hibernate counts queries, entity loads, flushes and cache hits. Exposed as metrics, they turn "it feels slow" into a graph.',
            interviewAngle: 'The operational close to the module. Being able to say you would put queries-per-request on a dashboard is a more convincing answer than any individual fix.',
            buildsOn: ['detecting-n-plus-one'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'properties',
                    title: 'Turning it on',
                    code: '# Off by default -- it has a cost, so it is a diagnostic rather than\n# a permanent setting on a hot path.\nspring.jpa.properties.hibernate.generate_statistics=true\n\n# With Actuator and Micrometer present, these become metrics:\n#   hibernate.query.executions\n#   hibernate.entities.loads\n#   hibernate.sessions.open\n#   hibernate.cache.query.requests\n#\n# The one to graph is executions divided by request count. A stable\n# ratio is healthy; a ratio that grows with data volume is an N+1.',
                    notes: '<p>The ratio is the useful signal rather than the absolute count. Total queries rise with traffic and mean nothing on their own; queries per request rising while traffic is flat means a query count that depends on how much data exists, which is the definition of the problem.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The closing answer for the whole module: <em>"I would find it by counting queries per request rather than by reading code, because N+1 is invisible in a diff and invisible in a small fixture. Then <code>JOIN FETCH</code> or an entity graph for the hot path, batch fetching as a global mitigation for the rest, and a projection wherever the read does not need entities at all."</em></p>'
                }
            ],
            docs: [
                { title: 'Spring Boot — Metrics', url: 'https://docs.spring.io/spring-boot/reference/actuator/metrics.html', kind: 'guide' }
            ],
            relatedQuestions: []
        }
    ]
};
