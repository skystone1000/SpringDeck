/* ==========================================================================
   data/theory/sets/predict-jpa.js — Predict, set 7 of 11

   Eight puzzles, split between artefact: 'query-count' and
   artefact: 'behaviour'. Neither is stdout and neither could be: every answer
   depends on a persistence context existing, a transaction boundary being
   somewhere specific, and a flush happening at a moment the code does not
   name. There is no single file that shows any of it.

   THE QUERY-COUNT ONES ARE THE POINT OF THE SET. "How many queries does this
   fire" is the question that separates somebody who has read about JPA from
   somebody who has watched a log. The answer is almost never the number the
   code appears to ask for, and the gap is always the same three mechanisms:
   the persistence context is a cache, dirty checking writes without being
   asked, and a lazy association loads when it is touched rather than when it
   is fetched.

   Every trace is written as the SQL log a reader would actually see, with
   the Hibernate 6 statement shapes, because recognising the shape in a log
   at 3 a.m. is the skill this set exists to build.
   ========================================================================== */

const predictJpaModule = {
    id: 'predict-jpa',
    trackId: 'output',
    order: 957,
    title: 'JPA and Hibernate',
    tagline: 'How many queries did that actually fire, and when did the flush happen.',
    estimatedMinutes: 30,
    prerequisites: [],
    docHub: {
        title: 'Hibernate 6 — User guide',
        url: 'https://docs.jboss.org/hibernate/orm/6.4/userguide/html_single/Hibernate_User_Guide.html'
    },

    chapters: [
        {
            id: 'counting-the-queries',
            title: 'Counting the Queries',
            importance: 'must-know',
            summary: 'Three methods whose query count is not the number of statements in them.',
            interviewAngle: 'Interviewers ask this instead of asking whether you know what N+1 means, because the count is checkable and the definition is recitable.',
            buildsOn: [],
            blocks: [
                {
                    type: 'predict',
                    id: 'predict-jpa-how-many-queries-does-this-fire',
                    importance: 'must-know',
                    artefact: 'query-count',
                    language: 'java',
                    title: 'Ten orders, each with lines',
                    prompt: '<p><code>Order.lines</code> is <code>@OneToMany(fetch = LAZY)</code> with no batch size configured. The repository returns exactly ten orders. How many SQL statements reach the database?</p>',
                    code: '@Transactional(readOnly = true)\nBigDecimal totalOfRecent() {\n    List<Order> orders = repository.findTop10ByOrderByPlacedAtDesc();\n\n    return orders.stream()\n        .flatMap(o -> o.getLines().stream())    // touches the lazy collection\n        .map(OrderLine::amount)\n        .reduce(BigDecimal.ZERO, BigDecimal::add);\n}',
                    options: ['11', '1', '10', '2'],
                    answer: 0,
                    verification: 'Read from the Hibernate 6 user guide, "Fetching" chapter, and confirmed against the documented default of one SELECT per uninitialised collection when hibernate.default_batch_fetch_size is unset. Not executed here: there is no database on the build machine.',
                    output: {
                        kind: 'trace',
                        lines: [
                            'One select fetches the ten order rows, with a row limit applied in SQL.',
                            'The stream touches getLines() on the first order, which is an uninitialised proxy, so Hibernate issues a select against order_line for that order id.',
                            'The same happens for the second order, and the third, and so on.',
                            'Ten collection selects are issued in total, one per order, because no batch fetch size is configured.',
                            'Eleven statements reach the database. Against a page of 200 it would be 201.'
                        ],
                        explain: '<p>One query for the roots, then one per collection the moment it is touched. That is N+1, and the page size is the multiplier — the same method against a page of 200 fires 201. <strong>The fix that does not restructure anything is <code>@BatchSize(size = 20)</code> on the collection</strong>, or <code>hibernate.default_batch_fetch_size</code> globally, which turns the ten into one <code>where order_id in (?, ?, ...)</code> and the total into 2. A fetch join gives 1 but cannot be paginated; see the last puzzle in this set.</p>'
                    }
                },
                {
                    type: 'predict',
                    id: 'predict-jpa-dirty-checking-writes-without-save',
                    importance: 'must-know',
                    artefact: 'query-count',
                    language: 'java',
                    title: 'No save() anywhere',
                    prompt: '<p>Nothing in this method calls <code>save</code>. What does the database see?</p>',
                    code: '@Transactional\nvoid applyDiscount(Long orderId) {\n    Order order = repository.findById(orderId).orElseThrow();\n    order.setTotal(order.getTotal().multiply(new BigDecimal("0.9")));\n    // no save, no flush, no merge\n}',
                    options: [
                        'One select and one update — the change is flushed at commit',
                        'One select only. Without save() nothing is written',
                        'One select and one update, but only if save() is added',
                        'It throws: a detached entity cannot be modified'
                    ],
                    answer: 0,
                    verification: 'Read from the Jakarta Persistence 3.1 specification, section 3.2 (entity lifecycle, automatic dirty detection) and the Hibernate 6 user guide on flushing. Not executed here: there is no database on the build machine.',
                    output: {
                        kind: 'trace',
                        lines: [
                            'findById issues one select and the returned entity is managed by the persistence context.',
                            'Hibernate keeps a snapshot of the loaded state.',
                            'setTotal changes the object. No SQL is issued yet.',
                            'The method returns and the transaction commits, which triggers a flush.',
                            'The flush compares the entity against its snapshot, finds the difference, and issues an update.',
                            'Two statements, and neither of them was asked for by name.'
                        ],
                        explain: '<p>An entity loaded inside a transaction is <em>managed</em>. Hibernate keeps a snapshot of it and compares at flush time, so a setter is a write. <code>save</code> exists for entities that are new or detached; calling it on a managed entity is a no-op that people add because it looks like it must be needed. <strong>The dangerous half of this is the same mechanism</strong>: a setter called by accident inside a transaction — in a mapper, in a lazy getter with a side effect — is also a write, and there is no line of code that says so.</p>'
                    }
                },
                {
                    type: 'predict',
                    id: 'predict-jpa-cascade-remove-orphan-difference',
                    importance: 'should-know',
                    artefact: 'query-count',
                    language: 'java',
                    title: 'Cascade remove and orphan removal are not the same setting',
                    prompt: '<p>The mapping is <code>@OneToMany(cascade = CascadeType.ALL)</code> with <strong>no</strong> <code>orphanRemoval</code>. The order has three lines and one is removed from the collection. What happens?</p>',
                    code: '@Entity\nclass Order {\n    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL)   // no orphanRemoval\n    private List<OrderLine> lines = new ArrayList<>();\n}\n\n@Transactional\nvoid dropFirstLine(Long id) {\n    Order order = repository.findById(id).orElseThrow();\n    order.getLines().remove(0);\n}',
                    options: [
                        'One update setting order_id to null on the removed row. The row survives, orphaned',
                        'One delete. The row is removed',
                        'Nothing. Removing from the collection has no effect',
                        'A constraint violation, because order_id is not null'
                    ],
                    answer: 0,
                    verification: 'Read from the Jakarta Persistence 3.1 specification, section 2.9 (orphan removal) and the Hibernate 6 user guide on association cascading. The constraint-violation outcome is noted in the explanation as the common real-world variant. Not executed here: there is no database on the build machine.',
                    output: {
                        kind: 'trace',
                        lines: [
                            'findById selects the order, and touching the collection selects its three lines.',
                            'remove(0) takes one OrderLine out of the in-memory collection.',
                            'At commit Hibernate flushes and sees that the association no longer holds that line.',
                            'Without orphanRemoval it has no instruction to delete the row, so it breaks the link instead: update order_line set order_id = null.',
                            'The row survives, orphaned, and nothing reports it.',
                            'In a schema where order_id is NOT NULL the same code fails at commit with a constraint violation, which is the louder and better outcome.'
                        ],
                        explain: '<p><code>CascadeType.REMOVE</code> answers "what happens to the children when the <em>parent</em> is removed". <code>orphanRemoval = true</code> answers "what happens to a child that is taken out of the collection", and they are genuinely different questions. Without it, Hibernate simply breaks the link. <strong>In most real schemas <code>order_id</code> is <code>NOT NULL</code>, so this same code fails at commit with a constraint violation instead</strong> — which is a better outcome, because the silent orphan is data nobody will notice for a year.</p>'
                    }
                }
            ],
            docs: [
                { title: 'Hibernate 6 — Fetching', url: 'https://docs.jboss.org/hibernate/orm/6.4/userguide/html_single/Hibernate_User_Guide.html#fetching', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'the-persistence-context',
            title: 'Where the Context Ends',
            importance: 'must-know',
            summary: 'A cache you did not ask for, and a boundary that is invisible until something is read on the wrong side of it.',
            interviewAngle: 'LazyInitializationException is the most-seen JPA stack trace in the world, and the interesting answer names the boundary rather than the annotation that suppresses it.',
            buildsOn: ['counting-the-queries'],
            blocks: [
                {
                    type: 'predict',
                    id: 'predict-jpa-first-level-cache-returns-same-instance',
                    importance: 'must-know',
                    artefact: 'behaviour',
                    language: 'java',
                    title: 'Two finds, one row',
                    prompt: '<p>Two lookups of the same id in one transaction. How many queries, and are the two objects the same object?</p>',
                    code: '@Transactional\nvoid twice(Long id) {\n    Order a = repository.findById(id).orElseThrow();\n    Order b = repository.findById(id).orElseThrow();\n\n    System.out.println(a == b);\n    System.out.println(a.equals(b));\n}',
                    options: [
                        'One query; true and true — the second find is served from the persistence context',
                        'Two queries; false and true',
                        'Two queries; false and false',
                        'One query; false and true'
                    ],
                    answer: 0,
                    verification: 'Read from the Jakarta Persistence 3.1 specification, section 3.1.1, which requires that a persistence context contain at most one instance per entity identity. Not executed here: there is no database on the build machine.',
                    output: {
                        kind: 'trace',
                        lines: [
                            'The first findById misses the persistence context and issues one select.',
                            'The loaded entity is registered in the context under its identity.',
                            'The second findById finds that identity already managed and returns the same instance without any SQL.',
                            'a == b is true, because a persistence context holds at most one instance per identity.',
                            'a.equals(b) is true for the same reason, whatever equals happens to compare.'
                        ],
                        explain: '<p>The persistence context guarantees <strong>one instance per identity per context</strong>, which is why <code>==</code> holds. That guarantee is doing more work than it looks: it is what makes dirty checking coherent, and it is why an entity whose <code>equals</code> is based on a mutable field appears to work in every test — inside one transaction, identity comparison never gets exercised. The next puzzle is what happens when it does.</p>'
                    }
                },
                {
                    type: 'predict',
                    id: 'predict-jpa-entity-equals-breaks-in-a-hashset',
                    importance: 'must-know',
                    artefact: 'behaviour',
                    language: 'java',
                    title: 'An entity in a HashSet, before and after the insert',
                    prompt: '<p><code>equals</code> and <code>hashCode</code> are generated from the <code>@Id</code> field, which is database-generated. What does the last line print?</p>',
                    code: '@Entity\nclass Tag {\n    @Id @GeneratedValue Long id;\n    String name;\n\n    public boolean equals(Object o) { ... }   // by id\n    public int hashCode()          { ... }    // by id\n}\n\n@Transactional\nvoid add() {\n    Set<Tag> set = new HashSet<>();\n    Tag tag = new Tag("java");                // id is null\n    set.add(tag);\n\n    repository.save(tag);                     // id assigned here\n    System.out.println(set.contains(tag));\n}',
                    options: [
                        'false — the hash changed after insertion, so the element is in the wrong bucket',
                        'true — it is the same object reference',
                        'It throws NullPointerException from hashCode',
                        'true, because HashSet rehashes on contains'
                    ],
                    answer: 0,
                    verification: 'Read from the java.util.HashSet javadoc (behaviour undefined if a key is mutated while in the set) combined with the Jakarta Persistence identifier-generation rules. Not executed here: it requires an id generated by a real database.',
                    output: {
                        kind: 'trace',
                        lines: [
                            'new Tag("java") has a null id, so the generated hashCode returns the value it computes for null.',
                            'set.add(tag) files the object in the bucket for that hash.',
                            'repository.save(tag) assigns an id from the database.',
                            'The object\'s hashCode is now a different number, but it is still filed in the old bucket.',
                            'set.contains(tag) computes the new hash, looks in the new bucket, and does not find it.',
                            'It returns false. Nothing throws, and the set is silently wrong from here on.'
                        ],
                        explain: '<p>The object is in the set and cannot be found, because the hash it was filed under is no longer the hash it reports. Nothing throws; the set is simply wrong from here on. <strong>The rule that avoids it: an entity\'s <code>hashCode</code> must be stable from construction to removal</strong>, which a database-generated id can never be. The workable answers are a business key, or a UUID assigned in the constructor, or — the one Hibernate itself documents — a constant <code>hashCode</code> with <code>equals</code> on the id, which is correct and degrades a <code>HashSet</code> to a list.</p>'
                    }
                },
                {
                    type: 'predict',
                    id: 'predict-jpa-lazyinitializationexception-boundary',
                    importance: 'must-know',
                    artefact: 'behaviour',
                    language: 'java',
                    title: 'The most-seen JPA stack trace',
                    prompt: '<p>The service is transactional, the controller is not, and <code>lines</code> is lazy. Where does this fail?</p>',
                    code: '@Service\nclass OrderService {\n    @Transactional(readOnly = true)\n    Order find(Long id) {\n        return repository.findById(id).orElseThrow();   // lines NOT touched\n    }\n}\n\n@RestController\nclass OrderController {\n    @GetMapping("/orders/{id}")\n    OrderDto get(@PathVariable Long id) {\n        Order order = service.find(id);\n        return new OrderDto(order.getLines());          // touched here\n    }\n}',
                    options: [
                        'In the controller, with LazyInitializationException — the context closed when find() returned',
                        'In the service, because readOnly forbids lazy loading',
                        'Nowhere; Spring keeps the session open for the request',
                        'In the controller, with a second query and no exception'
                    ],
                    answer: 0,
                    verification: 'Read from the Hibernate 6 user guide on lazy loading outside a session, and the Spring Boot reference note that spring.jpa.open-in-view defaults to true with a startup warning. Not executed here: it requires a live persistence context and a web request.',
                    output: {
                        kind: 'trace',
                        lines: [
                            'find() runs inside a transaction and selects the order. The lines collection is a proxy and is never touched.',
                            'find() returns and the transaction commits. The persistence context closes with it.',
                            'The controller calls order.getLines() on the now-detached entity.',
                            'The proxy has no session to load from and throws LazyInitializationException.',
                            'With spring.jpa.open-in-view left at its default of true this appears to work, because the session is held open for the whole request — and it then issues queries from the view layer and holds a connection through serialization.'
                        ],
                        explain: '<p>The transaction — and with it the persistence context — ended when <code>find</code> returned. Touching a lazy association afterwards has no session to load it from. <strong>The default in Spring Boot hides this</strong>: <code>open-in-view</code> is <code>true</code>, which holds the session open for the whole web request and makes the code above work — while firing queries from the view layer, holding a connection for the duration of serialization, and moving the failure to production the day somebody sets it to false. The real fixes are to fetch what you need inside the transaction, or to map to a DTO there.</p>'
                    }
                },
                {
                    type: 'predict',
                    id: 'predict-jpa-readonly-transaction-still-flushes',
                    importance: 'should-know',
                    artefact: 'behaviour',
                    language: 'java',
                    title: 'readOnly, and what it does not do',
                    prompt: '<p>The transaction is <code>readOnly = true</code> and the code mutates a managed entity. What reaches the database?</p>',
                    code: '@Transactional(readOnly = true)\nOrderDto report(Long id) {\n    Order order = repository.findById(id).orElseThrow();\n    order.setTotal(BigDecimal.ZERO);        // a mutation, in a readOnly tx\n    return new OrderDto(order);\n}',
                    options: [
                        'Nothing. Hibernate sets FlushMode.MANUAL, so dirty checking does not run',
                        'An update, because dirty checking is unaffected by readOnly',
                        'An exception, because writes are forbidden',
                        'Nothing, and the JDBC connection rejects the write'
                    ],
                    answer: 0,
                    verification: 'Read from the Spring Framework reference on @Transactional(readOnly) and the HibernateJpaDialect behaviour of setting FlushMode.MANUAL on a read-only transaction. Not executed here: it requires a real transaction manager and session.',
                    output: {
                        kind: 'trace',
                        lines: [
                            'The transaction begins and Spring marks the connection read-only.',
                            'The Hibernate dialect sets the session\'s flush mode to MANUAL.',
                            'findById issues one select and the entity is managed.',
                            'setTotal changes the in-memory object.',
                            'The transaction commits. With flush mode MANUAL there is no automatic flush, so dirty checking never runs.',
                            'No update is issued. The object changed; the row did not.'
                        ],
                        explain: '<p><code>readOnly</code> is a hint with two real effects: Spring passes it to the JDBC connection, where some drivers and some replicas act on it, and the Hibernate dialect sets the flush mode to manual, which is what actually suppresses the write here. <strong>It is not enforcement.</strong> An explicit <code>flush()</code> or a native query still writes, and against a physical read replica the same code fails with a driver error instead. Treating it as a performance hint that also documents intent is right; treating it as a guarantee that nothing can be written is not.</p>'
                    }
                },
                {
                    type: 'predict',
                    id: 'predict-jpa-join-fetch-with-pagination-warning',
                    importance: 'must-know',
                    artefact: 'behaviour',
                    language: 'java',
                    title: 'A fetch join with a Pageable',
                    prompt: '<p>Two million orders, twenty per page, and a fetch join. The results are correct. What did Hibernate do to produce them?</p>',
                    code: '@Query("select distinct o from Order o join fetch o.lines")\nPage<Order> findAllWithLines(Pageable pageable);   // page 3, size 20',
                    options: [
                        'It ran the query with no limit, read every row into memory and applied the paging there',
                        'It applied LIMIT and OFFSET in SQL as usual',
                        'It threw an exception: fetch joins cannot be paginated',
                        'It silently dropped the fetch join and lazy-loaded instead'
                    ],
                    answer: 0,
                    verification: 'Read from the Hibernate 6 user guide on fetch joins with row limits, and from the text of the HHH90003004 warning emitted by Hibernate in this case. Not executed here: it requires a real query against a database.',
                    output: {
                        kind: 'trace',
                        lines: [
                            'Hibernate parses the query and sees a collection fetch join together with a row limit.',
                            'A SQL limit would cut the result mid-collection, so it refuses to apply one.',
                            'It logs HHH90003004: firstResult/maxResults specified with collection fetch; applying in memory.',
                            'It executes the join with no limit and no offset, reading every matching row.',
                            'It de-duplicates and pages the result in the JVM.',
                            'The correct twenty orders are returned. The heap held two million.'
                        ],
                        explain: '<p>A fetch join multiplies rows — one order with three lines is three rows — so a SQL <code>LIMIT</code> would cut a collection in half rather than cut the result at an order boundary. Hibernate refuses to be wrong and is catastrophic instead: it reads everything and pages in memory, warning as it goes. <strong>The warning says "applying in memory" in plain words, and the query returns the right answer</strong>, which is why this survives code review and dies under load. The fix is two queries — page the ids, then fetch the collections for those ids — or leave the association lazy with a <code>@BatchSize</code>.</p>'
                    }
                }
            ],
            docs: [
                { title: 'Jakarta Persistence 3.1 specification', url: 'https://jakarta.ee/specifications/persistence/3.1/', kind: 'spec' }
            ],
            relatedQuestions: []
        }
    ]
};
