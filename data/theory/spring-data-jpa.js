/* ==========================================================================
   data/theory/spring-data-jpa.js — module 52 in the reading path

   Nine chapters, and the last one is when to stop using it. That is not a
   criticism: a repository abstraction earns its place on the aggregate
   write path and stops earning it on a reporting query, and knowing where
   the line is the difference between using a tool and being used by one.
   ========================================================================== */

const springDataJpaModule = {
    id: 'spring-data-jpa',
    trackId: 'persistence',
    order: 52,
    title: 'Spring Data JPA',
    tagline: 'Derived queries, projections, specifications, and their limits.',
    estimatedMinutes: 40,
    prerequisites: ['spring-transactional'],
    docHub: { title: 'Spring Data JPA Reference', url: 'https://docs.spring.io/spring-data/jpa/reference/index.html' },

    chapters: [
        {
            id: 'repository-hierarchy',
            title: 'The Repository Interfaces',
            importance: 'should-know',
            summary: 'Four interfaces stacked, and choosing a lower one is a design statement about what callers may do.',
            interviewAngle: 'A recall question with a judgement follow-up: extending JpaRepository exposes deleteAll and flush to every caller, and picking a narrower interface is a deliberate act.',
            buildsOn: [],
            blocks: [
                {
                    type: 'types',
                    title: 'The stack, narrowest first',
                    items: [
                        { name: 'Repository<T, ID>', html: '<p>A marker. No methods at all — you declare exactly what you want, and callers can do nothing else.</p>' },
                        { name: 'CrudRepository', html: '<p><code>save</code>, <code>findById</code>, <code>findAll</code>, <code>delete</code>, <code>count</code>.</p>' },
                        { name: 'PagingAndSortingRepository', html: '<p>Adds <code>findAll(Pageable)</code> and <code>findAll(Sort)</code>. Since Spring Data 3 it no longer extends <code>CrudRepository</code>, so the two are composed rather than stacked.</p>' },
                        { name: 'JpaRepository', html: '<p>The JPA-specific one: <code>flush</code>, <code>saveAndFlush</code>, <code>getReferenceById</code>, <code>deleteAllInBatch</code>. <strong>The usual choice, and the widest surface.</strong></p>' },
                        { name: 'A fragment interface', html: '<p>Your own interface plus an <code>Impl</code> class, mixed in. How a custom implementation coexists with derived methods.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>Extending <code>Repository</code> and declaring only the five methods the application actually uses is worth considering on an aggregate that matters. It makes the persistence surface explicit, it stops a caller reaching for <code>deleteAll()</code>, and it means a change to the repository is a change somebody had to write down.</p>'
                }
            ],
            docs: [
                { title: 'Spring Data — Repositories', url: 'https://docs.spring.io/spring-data/jpa/reference/repositories/core-concepts.html', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'derived-query-methods',
            title: 'Queries From Method Names',
            importance: 'must-know',
            summary: 'The method name is parsed at startup into a query. Excellent for two or three predicates and unreadable past four.',
            interviewAngle: 'Asked as "how do derived queries work", and the valuable half is knowing they are validated at context startup — a name that does not parse fails the deployment rather than the request.',
            buildsOn: ['repository-hierarchy'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The good case, and the point where it stops',
                    code: 'interface OrderRepository extends JpaRepository<Order, Long> {\n\n    List<Order> findByStatus(String status);\n    List<Order> findByStatusAndCustomerId(String status, Long customerId);\n    Optional<Order> findFirstByCustomerIdOrderByCreatedAtDesc(Long id);\n    boolean existsByReference(String reference);\n    long countByStatus(String status);\n\n    // This is past the line. Nobody can read it, and adding a sixth\n    // predicate means a new method rather than a parameter.\n    List<Order> findByStatusAndCustomerIdAndCreatedAtBetweenAndTotalGreaterThanOrderByCreatedAtDesc(\n            String status, Long customerId, Instant from, Instant to, BigDecimal min);\n}',
                    output: {
                        kind: 'trace',
                        lines: [
                            'Spring Data parses each name at context startup: the subject (find, exists, count, delete), then the predicate, then the ordering.',
                            'A property name that does not exist on the entity fails the context with a message naming the method -- so a typo or a renamed field breaks the deployment rather than a request.',
                            'That startup validation is the real benefit, and it is why derived methods are safer than a JPQL string for the simple cases.',
                            'Property resolution is greedy and can be ambiguous: findByAddressZipCode may resolve to address.zipCode or to a property called addressZip with a code. An underscore -- findByAddress_ZipCode -- disambiguates it.'
                        ],
                        explain: '<p>The line to stop at is roughly three predicates. Past that the name is longer than the JPQL would be, it cannot express OR groupings clearly, and a query that needs optional predicates cannot be expressed at all — which is what specifications are for.</p>'
                    }
                },
                {
                    type: 'pitfall',
                    html: '<p><strong><code>deleteBy</code> derived methods load every matching entity and delete them one at a time.</strong> That is required — entity lifecycle callbacks and cascades have to run — and it means <code>deleteByStatus("ARCHIVED")</code> over a million rows is a million <code>SELECT</code>s and a million <code>DELETE</code>s. <code>@Modifying @Query("delete from ...")</code> is one statement, and it skips the callbacks. Neither is wrong; they are different operations with the same name.</p>'
                }
            ],
            docs: [
                { title: 'Spring Data JPA — Query Methods', url: 'https://docs.spring.io/spring-data/jpa/reference/jpa/query-methods.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'jpa-hibernate', questionId: 'derived-queries-and-their-limits' }
            ]
        },

        {
            id: 'jpql-and-native-queries',
            title: '@Query, JPQL and Native',
            importance: 'must-know',
            summary: 'JPQL is validated at startup and portable; native SQL is neither, and it is the only way to reach engine-specific features.',
            interviewAngle: 'The comparison is the question. The startup validation is the discriminating detail — a JPQL typo fails the context and a native SQL typo fails the first request that runs it.',
            buildsOn: ['derived-query-methods'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'The two',
                    left: 'JPQL',
                    right: 'Native SQL',
                    rows: [
                        { aspect: 'Operates on', left: 'Entities and their fields', right: 'Tables and columns' },
                        { aspect: 'Validated', left: '<strong>At context startup</strong>', right: 'Never — the database sees it first' },
                        { aspect: 'Portable', left: 'Yes', right: 'No' },
                        { aspect: 'Window functions, CTEs, engine features', left: 'Limited', right: '<strong>Everything the engine has</strong>' },
                        { aspect: 'Returns entities', left: 'Managed, by default', right: 'Managed if the result is mapped; a tuple otherwise' },
                        { aspect: 'Pagination', left: 'Handled', right: 'Needs a separate <code>countQuery</code>' }
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Both forms, with the details that get forgotten',
                    code: '// JPQL. Named parameters, and it is checked at startup.\n@Query("""\n        select o from Order o\n        join fetch o.customer\n        where o.status = :status and o.total > :min\n        """)\nList<Order> find(@Param("status") String status,\n                 @Param("min") BigDecimal min);\n\n// Native. Note countQuery -- without it, pagination cannot count.\n@Query(value = """\n        select * from orders o\n        where o.total > (select avg(total) from orders)\n        """,\n       countQuery = "select count(*) from orders o where o.total > (select avg(total) from orders)",\n       nativeQuery = true)\nPage<Order> aboveAverage(Pageable pageable);',
                    notes: '<p>The triple-quoted text block is worth using for anything longer than a line: the SQL is readable, and there is no string concatenation to accidentally omit a space between two clauses — which is the classic way a hand-built query becomes <code>...where statusandcustomer...</code>.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>A named query — <code>@NamedQuery</code> on the entity, or in <code>orm.xml</code> — is validated at startup even when it is native, because Hibernate parses it eagerly. That is one reason to prefer a named native query over an inline one for anything critical, and it is a detail almost nobody mentions.</p>'
                }
            ],
            docs: [
                { title: 'Spring Data JPA — @Query', url: 'https://docs.spring.io/spring-data/jpa/reference/jpa/query-methods.html', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'modifying-queries',
            title: '@Modifying, and What It Skips',
            importance: 'must-know',
            summary: 'A bulk update or delete in one statement. It bypasses the persistence context entirely, which is both the point and the hazard.',
            interviewAngle: 'A precise question with a precise answer: the statement runs in the database, the persistence context does not know, and entities already loaded are now stale. clearAutomatically is the flag that addresses it.',
            buildsOn: ['jpql-and-native-queries'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'One statement, and the two flags that matter',
                    code: '@Modifying(clearAutomatically = true, flushAutomatically = true)\n@Transactional\n@Query("update Order o set o.status = :to where o.status = :from")\nint reclassify(@Param("from") String from, @Param("to") String to);\n\n// flushAutomatically: flush pending changes BEFORE the bulk statement,\n//   or they are written afterwards and overwrite it.\n// clearAutomatically: clear the context AFTER, so stale managed\n//   entities are not reused with their old values.',
                    output: {
                        kind: 'trace',
                        lines: [
                            'The statement is sent to the database as written. No entity is loaded, no lifecycle callback runs, no @Version is checked or incremented.',
                            'Any entity already in the persistence context still holds its old field values, and dirty checking will happily write them back at flush -- undoing the bulk update for those rows.',
                            'clearAutomatically detaches everything so the next read goes to the database. It also discards unflushed changes, which is why flushAutomatically has to come first.',
                            'The return value is the affected row count, which is the only feedback available -- there is no way to know WHICH rows changed.'
                        ],
                        explain: '<p>The optimistic-locking interaction from the locking module is the sharpest edge here: a bulk update does not touch <code>@Version</code>, so concurrent writers are not detected and an entity read before the statement carries a version that no longer matches reality. If both matter, increment the version in the statement explicitly.</p>'
                    }
                },
                {
                    type: 'tip',
                    html: '<p>Use it when the operation genuinely is set-based — archive everything older than a year, reclassify a status — and not as a faster way to save one entity. For one entity, dirty checking is already one statement and it maintains the version and the context.</p>'
                }
            ],
            docs: [
                { title: 'Spring Data JPA — Modifying Queries', url: 'https://docs.spring.io/spring-data/jpa/reference/jpa/query-methods.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'jpa-hibernate', questionId: 'bulk-update-and-delete' }
            ]
        },

        {
            id: 'projections',
            title: 'Projections',
            importance: 'should-know',
            summary: 'Interface, class or dynamic. The one thing to check is whether the projection actually narrows the select list, because an open one does not.',
            interviewAngle: 'The fetching module made the case for projections; this is the mechanics. The trap worth knowing is that a projection with a SpEL expression becomes open and selects the whole entity.',
            buildsOn: ['derived-query-methods'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Closed, open, and dynamic',
                    code: '// CLOSED: accessor names map to properties, so Spring Data narrows\n// the select list to exactly these columns.\ninterface OrderSummary {\n    Long   getId();\n    String getReference();\n}\n\n// OPEN: the SpEL expression means Spring Data cannot know which\n// columns are needed, so it SELECTS THE WHOLE ENTITY and computes\n// in Java. It looks almost identical to the closed one.\ninterface OrderLabel {\n    @Value("#{target.reference + \' (\' + target.status + \')\'}")\n    String getLabel();\n}\n\n// DYNAMIC: one query method, several shapes.\n<T> List<T> findByStatus(String status, Class<T> type);\n// repository.findByStatus("PAID", OrderSummary.class);\n// repository.findByStatus("PAID", Order.class);',
                    notes: '<p>A record works as a class-based projection and is usually the clearest form: <code>record OrderSummary(Long id, String reference) { }</code>, with the constructor parameters matching the property names. Spring Data 3 resolves it without an explicit constructor expression.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>One <code>@Value</code> annotation turns a closed projection into an open one, and the query silently widens to the whole entity.</strong> The interface still looks like a narrow projection, the code still compiles, and the performance benefit is gone — including any lazy associations that are now loadable and might get touched. If a projection exists for performance, keep it free of SpEL and compute derived values in the caller.</p>'
                }
            ],
            docs: [
                { title: 'Spring Data — Projections', url: 'https://docs.spring.io/spring-data/jpa/reference/repositories/projections.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'jpa-hibernate', questionId: 'projections-and-dto-queries' }
            ]
        },

        {
            id: 'specifications-and-criteria',
            title: 'Specifications',
            importance: 'should-know',
            summary: 'Composable predicates for a query whose shape is not known until runtime. The right answer to a search form with eight optional filters.',
            interviewAngle: 'Comes up as "how would you build a dynamic search". Specifications are the idiomatic answer, and knowing that they are a thin layer over the Criteria API — and that Criteria alone is unreadable — explains why.',
            buildsOn: ['jpql-and-native-queries'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Eight optional filters, without eight method names',
                    code: 'interface OrderRepository extends JpaRepository<Order, Long>,\n                                 JpaSpecificationExecutor<Order> { }\n\nclass OrderSpecs {\n    static Specification<Order> hasStatus(String s) {\n        return s == null ? null\n                : (root, q, cb) -> cb.equal(root.get("status"), s);\n    }\n    static Specification<Order> totalAbove(BigDecimal min) {\n        return min == null ? null\n                : (root, q, cb) -> cb.greaterThan(root.get("total"), min);\n    }\n}\n\n// Composed at runtime. A null specification is ignored by and().\nSpecification<Order> spec = Specification\n        .where(OrderSpecs.hasStatus(criteria.status()))\n        .and(OrderSpecs.totalAbove(criteria.minTotal()));\n\nPage<Order> page = repository.findAll(spec, pageable);',
                    notes: '<p>Returning <code>null</code> for an absent filter is the idiom that makes composition clean — <code>and(null)</code> is a no-op — so the calling code has no conditionals in it at all. The alternative, building a JPQL string with <code>if</code> statements, is where SQL injection and missing spaces both come from.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Two limits worth knowing. Specifications are compile-checked only on the entity type, not on the property names — <code>root.get("statuss")</code> fails at runtime — which the JPA metamodel (<code>Order_.status</code>) fixes if you generate it. And Query by Example is the lighter alternative for a simple "match these fields" search, with no support for ranges, OR, or anything but equality.</p>'
                }
            ],
            docs: [
                { title: 'Spring Data JPA — Specifications', url: 'https://docs.spring.io/spring-data/jpa/reference/jpa/specifications.html', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'pagination-and-sorting',
            title: 'Pageable, Page and Slice',
            importance: 'must-know',
            summary: 'Page issues a second count query and Slice does not. Choosing Slice halves the query count for any UI that only needs a next button.',
            interviewAngle: 'A small, concrete piece of knowledge that shows the API has been used rather than read. The security half — an unvalidated Sort is a denial-of-service vector — is the better half.',
            buildsOn: ['specifications-and-criteria'],
            blocks: [
                {
                    type: 'table',
                    title: 'The three return types',
                    headers: ['Type', 'Queries', 'Knows the total', 'Use for'],
                    rows: [
                        ['<code>List&lt;T&gt;</code>', '1', 'No', 'A fixed-size fetch'],
                        ['<code>Slice&lt;T&gt;</code>', '1', 'No — only "is there more"', '<strong>Infinite scroll</strong>'],
                        ['<code>Page&lt;T&gt;</code>', '<strong>2</strong>', 'Yes', 'A numbered pager that needs a page count']
                    ]
                },
                {
                    type: 'prose',
                    html: '<p><code>Slice</code> fetches one row more than the page size and reports whether it got it — which answers "is there a next page" without counting anything. <code>Page</code> issues a separate <code>COUNT(*)</code> over the same predicate, and on a large filtered table that count can cost more than the page itself.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Binding a client-supplied <code>Sort</code> straight into a repository call lets a stranger sort your table by any column.</strong> Spring Data will bind any property name the request contains, so <code>?sort=notes,desc</code> on an unindexed text column makes the database sort the whole table per request. Validate against an allow-list of sortable properties, and cap the page size — <code>spring.data.web.pageable.max-page-size</code> defaults to 2000, which is high.</p>'
                }
            ],
            docs: [
                { title: 'Spring Data — Paging and Sorting', url: 'https://docs.spring.io/spring-data/jpa/reference/repositories/query-methods-details.html', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'auditing',
            title: 'Auditing',
            importance: 'good-to-know',
            summary: 'Four annotations fill in who created a row and when, without a line in any service method.',
            interviewAngle: 'A small practical question. The part worth knowing is that it needs an AuditorAware bean to know who the current user is, and that it is not an audit trail — it records only the latest change.',
            buildsOn: ['repository-hierarchy'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The four fields, and the two pieces of wiring',
                    code: '@EntityListeners(AuditingEntityListener.class)\n@MappedSuperclass\nabstract class Auditable {\n    @CreatedDate     Instant createdAt;\n    @LastModifiedDate Instant updatedAt;\n    @CreatedBy       String  createdBy;\n    @LastModifiedBy  String  updatedBy;\n}\n\n@Configuration\n@EnableJpaAuditing                       // 1. switch it on\nclass AuditConfig {\n\n    @Bean                                // 2. tell it who is acting\n    AuditorAware<String> auditorAware() {\n        return () -> Optional.ofNullable(SecurityContextHolder.getContext())\n                .map(SecurityContext::getAuthentication)\n                .filter(Authentication::isAuthenticated)\n                .map(Authentication::getName);\n    }\n}',
                    notes: '<p><code>AuditorAware</code> returning <code>Optional.empty()</code> leaves the field null rather than failing, which is what happens for a scheduled job or a migration with no authenticated user. Deciding what those should record — a service account name, say — is worth doing on purpose rather than discovering nulls later.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>This is not an audit trail. It records who touched the row last, and the previous value is gone. If the requirement is "show me every change to this record", that is Hibernate Envers or an append-only history table — a different feature with a different cost, and confusing the two is how a compliance requirement gets signed off against the wrong implementation.</p>'
                }
            ],
            docs: [
                { title: 'Spring Data JPA — Auditing', url: 'https://docs.spring.io/spring-data/jpa/reference/auditing.html', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'when-to-drop-to-jdbc',
            title: 'When to Stop Using It',
            importance: 'must-know',
            summary: 'Bulk work, reporting queries, and anything where the SQL matters more than the object graph. Mixing the two in one transaction is fine and needs no apology.',
            interviewAngle: 'A maturity question. The answer that lands names concrete cases rather than expressing a preference, and points out that JdbcClient and JPA share a connection and a transaction, so the choice is per query.',
            buildsOn: ['modifying-queries'],
            blocks: [
                {
                    type: 'types',
                    title: 'The cases where JPA is the wrong tool',
                    items: [
                        { name: 'Bulk insert', html: '<p>Fifty thousand rows through <code>save()</code> is fifty thousand managed entities and their snapshots. <code>JdbcClient</code> with <code>batchUpdate</code> is one round trip per batch and no persistence context at all.</p>' },
                        { name: 'A reporting query', html: '<p>Aggregates, window functions, several joins, no entity in the result. JPQL cannot express half of it and the answer is a projection over native SQL.</p>' },
                        { name: 'Set-based updates', html: '<p>Archive everything older than a year. One statement, no entities. <code>@Modifying</code> or plain SQL.</p>' },
                        { name: 'Engine-specific features', html: '<p><code>SKIP LOCKED</code>, <code>ON CONFLICT</code>, <code>JSONB</code> operators, recursive CTEs. None of these has a JPA form.</p>' },
                        { name: 'A query whose plan you must control', html: '<p>When the SQL matters, write the SQL. An ORM generating something close to what you wanted is worse than writing it.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>The point that makes this a non-issue rather than a compromise: <strong>JPA and <code>JdbcClient</code> share the connection and the transaction.</strong> A service method can load an aggregate through a repository, mutate it, and issue a native bulk statement, all in one unit of work — with the one caveat from the modifying-queries chapter, which is to flush before the bulk statement and clear after it. The choice is per query, not per project.</p>'
                }
            ],
            docs: [
                { title: 'Spring — JdbcClient', url: 'https://docs.spring.io/spring-framework/reference/data-access/jdbc/core.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'jpa-hibernate', questionId: 'batch-inserts' }
            ]
        }
    ]
};
