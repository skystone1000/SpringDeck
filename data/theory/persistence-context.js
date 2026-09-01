/* ==========================================================================
   data/theory/persistence-context.js — module 49 in the reading path

   Eight chapters about the thing that makes JPA feel like magic and makes
   it surprising. Almost every "why did that happen" question in a Spring
   codebase — an update nobody wrote, a query returning stale data, a
   LazyInitializationException — is the persistence context behaving
   exactly as specified.
   ========================================================================== */

const persistenceContextModule = {
    id: 'persistence-context',
    trackId: 'persistence',
    order: 49,
    title: 'The Persistence Context',
    tagline: 'Dirty checking, flush order, and the first-level cache you did not know you had.',
    estimatedMinutes: 45,
    prerequisites: ['jpa-mapping'],
    docHub: { title: 'Hibernate — Persistence Contexts', url: 'https://docs.jboss.org/hibernate/orm/current/userguide/html_single/Hibernate_User_Guide.html' },

    chapters: [
        {
            id: 'entity-states',
            title: 'The Four States',
            importance: 'must-know',
            summary: 'Transient, managed, detached, removed. Only managed entities are watched, and everything else in this module follows from knowing which state an object is in.',
            interviewAngle: 'Asked directly, and it is the vocabulary the rest of the answers need. The transition worth being precise about is managed to detached, because that is where LazyInitializationException comes from.',
            buildsOn: [],
            blocks: [
                {
                    type: 'types',
                    title: 'The four',
                    items: [
                        { name: 'Transient (new)', html: '<p>Constructed with <code>new</code>, never associated with a context, no database row. Nothing is watching it.</p>' },
                        { name: 'Managed (persistent)', html: '<p>In the persistence context. <strong>Changes to it are written at flush without any save call</strong>, and the context guarantees one instance per row.</p>' },
                        { name: 'Detached', html: '<p>Was managed, and its context closed — which happens at the end of every transaction. It holds data and nobody is watching it. Lazy associations are unloadable from here.</p>' },
                        { name: 'Removed', html: '<p>Scheduled for deletion. Still in the context until the flush, so it is still visible in queries that read the context.</p>' }
                    ]
                },
                {
                    type: 'diagram',
                    diagramType: 'flowchart',
                    caption: 'Detached is the state most bugs live in, and every transaction produces it.',
                    diagramConfig: {
                        title: 'The transitions',
                        nodes: [
                            { id: 'new', label: 'Transient — new Invoice()', kind: 'start' },
                            { id: 'managed', label: 'Managed — watched, one per row', kind: 'decision' },
                            { id: 'detached', label: 'Detached — context closed', kind: 'step' },
                            { id: 'removed', label: 'Removed — delete pending', kind: 'step' },
                            { id: 'gone', label: 'Row deleted at flush', kind: 'fix' }
                        ],
                        edges: [
                            { from: 'new', to: 'managed', label: 'persist()' },
                            { from: 'managed', to: 'detached', label: 'commit, clear, evict' },
                            { from: 'detached', to: 'managed', label: 'merge()' },
                            { from: 'managed', to: 'removed', label: 'remove()' },
                            { from: 'removed', to: 'gone', label: 'flush' }
                        ]
                    }
                },
                {
                    type: 'tip',
                    html: '<p>The sentence that makes the rest of the module follow: <strong>an entity is detached the moment the transaction ends.</strong> A service method returning an entity to a controller is returning a detached object, and everything the controller then does to it — reading a lazy association, expecting a change to be saved — has to account for that.</p>'
                }
            ],
            docs: [
                { title: 'Jakarta Persistence — Entity Lifecycle', url: 'https://jakarta.ee/specifications/persistence/3.1/', kind: 'spec' }
            ],
            relatedQuestions: [
                { topicId: 'jpa-hibernate', questionId: 'entity-lifecycle-states' }
            ]
        },

        {
            id: 'first-level-cache',
            title: 'The Cache You Did Not Know You Had',
            importance: 'must-know',
            summary: 'The persistence context is a map from id to entity instance, and it is consulted before every findById. It is not optional and cannot be turned off.',
            interviewAngle: 'Asked as "what is the first-level cache". The two facts that matter are that it is per transaction rather than per application, and that it guarantees one instance per row — which is what makes == work inside a transaction.',
            buildsOn: ['entity-states'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'One query, and one instance',
                    code: '@Transactional\nvoid demo(Long id) {\n    Invoice a = repository.findById(id).orElseThrow();   // SELECT issued\n    Invoice b = repository.findById(id).orElseThrow();   // NO query\n\n    assert a == b;        // the SAME object. Not merely equal.\n\n    // But a JPQL query does NOT read the cache to decide what to fetch:\n    List<Invoice> all = repository.findByStatus("PAID");  // SELECT issued\n    // -- rows already in the context are returned as the EXISTING\n    //    instance, and their in-memory state is NOT overwritten.\n}',
                    output: {
                        kind: 'trace',
                        lines: [
                            'findById checks the persistence context first, so the second call is free and returns the identical object reference.',
                            'A JPQL or Criteria query always goes to the database -- the context cannot know which rows match a predicate.',
                            'When those rows come back, any row already in the context is returned as the existing managed instance, and the freshly-read column values are DISCARDED.',
                            'So an entity you modified in memory and have not flushed will still show your value after a query that read the old one, which reads as a caching bug and is the identity guarantee working.'
                        ],
                        explain: '<p>That third point is the one that surprises people, and it is required: two references to the same row inside one context would let one part of the code see a change and another not. The identity guarantee is more important than freshness, and the way to get the database\'s values is to <code>flush()</code> then <code>refresh()</code>.</p>'
                    }
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>The first-level cache never evicts, so a loop over a large result set accumulates every entity in memory.</strong> A batch job reading a million rows holds a million managed instances, each with a snapshot for dirty checking — so roughly twice the memory — and every flush then scans all of them. The fix is <code>entityManager.clear()</code> periodically, or a stateless session, or not using the ORM for bulk work at all.</p>'
                }
            ],
            docs: [
                { title: 'Hibernate — Persistence Context', url: 'https://docs.jboss.org/hibernate/orm/current/userguide/html_single/Hibernate_User_Guide.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'jpa-hibernate', questionId: 'first-and-second-level-cache' }
            ]
        },

        {
            id: 'dirty-checking',
            title: 'Dirty Checking',
            importance: 'must-know',
            summary: 'Hibernate keeps a snapshot of every managed entity as loaded, compares at flush, and writes what changed. No save call is involved.',
            interviewAngle: 'The mechanism behind "I changed a field and it saved without calling save". Knowing that the comparison is against a snapshot taken at load explains both the behaviour and its memory cost.',
            buildsOn: ['first-level-cache'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The update nobody wrote',
                    code: '@Transactional\nvoid applyDiscount(Long id) {\n    Invoice invoice = repository.findById(id).orElseThrow();\n    invoice.setTotal(invoice.getTotal().multiply(new BigDecimal("0.9")));\n\n    // No save(). No merge(). No flush().\n    // An UPDATE is issued at commit, because the entity is managed\n    // and its snapshot no longer matches.\n}',
                    output: {
                        kind: 'trace',
                        lines: [
                            'At load, Hibernate stores a copy of the loaded column values alongside the entity.',
                            'At flush it compares each managed entity against its snapshot, field by field, and generates an UPDATE for those that differ.',
                            'Calling repository.save() here changes nothing -- for an already-managed entity it is a no-op that returns the same instance.',
                            'The cost is the snapshot: roughly double the memory per managed entity, and a comparison over every one of them at every flush.'
                        ],
                        explain: '<p>The behaviour is a genuine convenience and it is also why an accidental mutation is persisted. A getter that normalises a value, a setter called in a mapper, a lazily initialised field — anything that changes a managed entity during a transaction will be written. There is no opt-out short of detaching it or marking the transaction <code>readOnly</code>.</p>'
                    }
                },
                {
                    type: 'tip',
                    html: '<p><code>@Transactional(readOnly = true)</code> is worth putting on every read path, and the reason is this chapter rather than the database. Hibernate sets the flush mode to <code>MANUAL</code>, so <strong>no snapshots are kept and no dirty checking runs</strong> — measurably less memory and less work on a large read — and an accidental mutation cannot be written. The hint passed to the JDBC driver and the routing to a read replica are secondary benefits.</p>'
                }
            ],
            docs: [
                { title: 'Hibernate — Flushing', url: 'https://docs.jboss.org/hibernate/orm/current/userguide/html_single/Hibernate_User_Guide.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'jpa-hibernate', questionId: 'persistence-context-and-dirty-checking' }
            ]
        },

        {
            id: 'flush-modes-and-flush-order',
            title: 'When a Flush Happens, and in What Order',
            importance: 'must-know',
            summary: 'Before a query that might be affected, and at commit. The order of the statements is Hibernate\'s, not yours, and that surprises people at constraint time.',
            interviewAngle: 'The flush-before-query behaviour explains a class of "why did that query issue an INSERT first" questions. The ordering rule explains a class of constraint violations that look impossible.',
            buildsOn: ['dirty-checking'],
            blocks: [
                {
                    type: 'types',
                    title: 'What triggers a flush',
                    items: [
                        { name: 'Transaction commit', html: '<p>Always.</p>' },
                        { name: 'Before a JPQL or Criteria query', html: '<p>Under the default <code>AUTO</code> mode, so the query sees your pending changes. <strong>This is why a query can issue an INSERT first.</strong></p>' },
                        { name: 'An explicit flush()', html: '<p>When you need the id, or need the database to see the row before a native query.</p>' },
                        { name: 'Never, under MANUAL', html: '<p>What <code>readOnly = true</code> sets. Changes are simply not written.</p>' },
                        { name: 'Not before a native query', html: '<p>Hibernate cannot parse arbitrary SQL to know which tables it touches, so an unflushed change is invisible to it. Flush by hand first.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Hibernate flushes in a fixed order regardless of the order you made the changes: inserts, updates, then deletes — deletes last.</strong> So deleting a row and inserting a replacement with the same unique key fails on the unique constraint, because the insert is executed before the delete. The code reads correctly and the database rejects it. The workaround is an explicit <code>flush()</code> between the two operations, and knowing that is the whole of the question.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The flush-before-query rule is worth stating precisely, because it also explains a performance surprise: a loop that alternates a save and a query issues a flush on every iteration, so JDBC batching never accumulates anything. Doing all the writes and then all the reads lets one flush cover them all.</p>'
                }
            ],
            docs: [
                { title: 'Hibernate — Flushing', url: 'https://docs.jboss.org/hibernate/orm/current/userguide/html_single/Hibernate_User_Guide.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'jpa-hibernate', questionId: 'flush-modes-and-when-flush-happens' }
            ]
        },

        {
            id: 'merge-vs-persist',
            title: 'persist, merge, and save',
            importance: 'must-know',
            summary: 'persist makes this instance managed. merge copies your state onto a managed instance and returns that one — which is not the object you passed in.',
            interviewAngle: 'A reliable question with a checkable answer: merge returns a different object, and ignoring the return value is the bug it produces. Spring Data\'s save() dispatching between the two is the second half.',
            buildsOn: ['entity-states'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'The two operations',
                    left: 'persist(entity)',
                    right: 'merge(entity)',
                    rows: [
                        { aspect: 'Argument must be', left: 'Transient', right: 'Anything — transient, detached, managed' },
                        { aspect: 'Returns', left: '<code>void</code>', right: '<strong>A different managed instance</strong>' },
                        { aspect: 'The argument becomes managed', left: '<strong>Yes</strong>', right: '<strong>No</strong> — it stays detached' },
                        { aspect: 'May issue a SELECT', left: 'No', right: 'Yes, to load the current row first' },
                        { aspect: 'On an id that no longer exists', left: 'n/a', right: 'Inserts a new row' },
                        { aspect: 'Use for', left: 'A genuinely new entity', right: 'Reattaching something detached' }
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The bug merge produces',
                    code: '@Transactional\nvoid update(Invoice detached) {\n\n    // WRONG: the return value is the managed one. `detached` is not.\n    em.merge(detached);\n    detached.setStatus("PAID");        // changes a detached object.\n                                       // Nothing is written.\n\n    // RIGHT:\n    Invoice managed = em.merge(detached);\n    managed.setStatus("PAID");         // dirty checking writes this.\n}\n\n// Spring Data\'s save() dispatches for you:\n//   isNew(entity) ? persist(entity) : merge(entity)\n// and isNew() is usually "the id is null" -- which is why calling\n// save() on a detached entity with an id issues a SELECT you did\n// not expect, and why save() on an ALREADY MANAGED entity does\n// nothing at all beyond returning it.',
                    notes: '<p>The last comment is the one worth carrying into a code review. <code>save()</code> inside a transaction on an entity that was loaded in that transaction is redundant — dirty checking has it — and it is written everywhere because it looks like it must be necessary.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong><code>merge</code> on an entity with an id that no longer exists in the database inserts a new row.</strong> It loads, finds nothing, and treats the argument as new. So merging a stale object whose row was deleted by someone else resurrects it, with a different id, silently. Where that matters, check existence first or use optimistic locking so the version mismatch fails instead.</p>'
                }
            ],
            docs: [
                { title: 'Hibernate — Persisting Data', url: 'https://docs.jboss.org/hibernate/orm/current/userguide/html_single/Hibernate_User_Guide.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'jpa-hibernate', questionId: 'save-vs-persist-vs-merge' }
            ]
        },

        {
            id: 'detached-entities',
            title: 'Working With Detached Objects',
            importance: 'should-know',
            summary: 'Every entity a service returns is detached. Deciding deliberately whether entities cross that boundary at all is the design question underneath.',
            interviewAngle: 'This is where the DTO argument from the serialisation module returns with a different justification. The web layer holds detached entities, and every problem with them is a symptom of that.',
            buildsOn: ['merge-vs-persist'],
            blocks: [
                {
                    type: 'types',
                    title: 'What a detached entity cannot do',
                    items: [
                        { name: 'Load a lazy association', html: '<p>No session, so no query. <code>LazyInitializationException</code> — the next chapter.</p>' },
                        { name: 'Be dirty-checked', html: '<p>Nothing is watching. A change is a change to a Java object and nothing more.</p>' },
                        { name: 'Guarantee freshness', html: '<p>It is a snapshot from whenever it was loaded. The row may have changed since.</p>' },
                        { name: 'Be compared reliably', html: '<p>Two detached instances of the same row are different objects, so <code>==</code> is false and <code>equals</code> depends on the choice from the mapping module.</p>' }
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>The clean resolution is to decide that entities do not leave the service layer. Map to a DTO inside the transaction, while everything is still managed and every association is still loadable, and return that. The controller then holds a plain object with no lifecycle, no lazy proxies and no coupling to the schema — which is the same conclusion the serialisation module reached from the Jackson side, arrived at independently.</p>'
                },
                {
                    type: 'tip',
                    html: '<p><code>getReferenceById</code> — <code>getOne</code> in older Spring Data — returns a <strong>proxy without issuing a query</strong>, which is exactly what you want when setting a foreign key: <code>order.setCustomer(repo.getReferenceById(id))</code> writes <code>customer_id</code> without loading the customer. Touch any other property and it loads; touch it after the transaction and it throws. That narrow use is what it is for.</p>'
                }
            ],
            docs: [
                { title: 'Hibernate — Detached Entities', url: 'https://docs.jboss.org/hibernate/orm/current/userguide/html_single/Hibernate_User_Guide.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'jpa-hibernate', questionId: 'getreferencebyid-vs-findbyid' }
            ]
        },

        {
            id: 'lazyinitializationexception',
            title: 'LazyInitializationException',
            importance: 'must-know',
            summary: 'Touching an unloaded association after the session closed. Four fixes, and two of them are worse than the problem.',
            interviewAngle: 'One of the most-asked JPA questions. The ranking is the answer: fetch what you need inside the transaction, and everything else is a workaround that moves the cost somewhere less visible.',
            buildsOn: ['detached-entities'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>A lazy association is a proxy holding a reference to its session. Touching it asks the session to load; if the session is closed — which it is, the moment the transaction ended — there is nothing to ask. The exception is thrown at the point of use, which is typically the controller or the serialiser, a long way from the query that decided what to fetch.</p>'
                },
                {
                    type: 'table',
                    title: 'The four responses, ranked',
                    headers: ['Approach', 'Verdict', 'Why'],
                    rows: [
                        ['<strong>Fetch it in the query</strong> — <code>JOIN FETCH</code> or an entity graph', '<strong>Correct</strong>', 'One query, explicit, and the fetch plan lives with the use case'],
                        ['<strong>Map to a DTO in the transaction</strong>', '<strong>Correct</strong>', 'Nothing lazy leaves the service layer at all'],
                        ['<code>open-in-view</code>', 'Avoid', 'Works by holding the session — and the connection — until the response is rendered, hiding N+1 inside serialisation'],
                        ['<code>FetchType.EAGER</code>', '<strong>Avoid</strong>', 'Loads the association for every query everywhere, including the ninety per cent that do not need it'],
                        ['<code>Hibernate.initialize()</code>', 'Situational', 'Explicit, and it is one extra query per call — a manual N+1 if it is in a loop']
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>The framing that makes the ranking obvious: <em>"The exception is telling me the query did not fetch what the code needs. The fix is to change the query, not to keep the session open longer — that just moves the loading somewhere I cannot see it."</em> The next module is about how to change the query.</p>'
                }
            ],
            docs: [
                { title: 'Hibernate — Fetching', url: 'https://docs.jboss.org/hibernate/orm/current/userguide/html_single/Hibernate_User_Guide.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'jpa-hibernate', questionId: 'lazy-initialization-exception' }
            ]
        },

        {
            id: 'open-session-in-view',
            title: 'open-in-view',
            importance: 'must-know',
            summary: 'On by default in Spring Boot. It keeps the persistence context open for the whole request, which makes lazy loading work in the view and holds a connection while it does.',
            interviewAngle: 'A strong question because the default is one most people have never examined, and Boot logs a warning about it that almost nobody reads. Knowing what it costs, and that it is on, is the answer.',
            buildsOn: ['lazyinitializationexception'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'On, and off',
                    left: 'open-in-view = true (the default)',
                    right: 'open-in-view = false',
                    rows: [
                        { aspect: 'Lazy loading in the controller', left: 'Works', right: '<code>LazyInitializationException</code>' },
                        { aspect: 'Connection held', left: '<strong>Until the response is rendered</strong>', right: 'Released at the end of the service method' },
                        { aspect: 'Queries during serialisation', left: '<strong>Possible, and invisible</strong>', right: 'Impossible' },
                        { aspect: 'N+1 discovered', left: 'In production, as latency', right: 'In development, as an exception' },
                        { aspect: 'Under load', left: 'The connection pool is the first thing to exhaust', right: 'Connections are held for the query only' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>It holds the connection for the entire request, including template rendering and JSON serialisation.</strong> So a request that spends 5ms querying and 50ms rendering occupies a connection for 55ms instead of 5, and the pool needs to be ten times larger for the same throughput — which is the pool-exhaustion chapter\'s "one slow thing holding connections" arriving as a framework default rather than as a bug in your code.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Turn it off, and expect to fix things. Setting <code>spring.jpa.open-in-view=false</code> in an existing codebase surfaces every place that was lazily loading outside a transaction — which is the point, since each one was an unplanned query. Doing it on a new project costs nothing; doing it on an old one is a piece of work worth scheduling rather than avoiding.</p>'
                }
            ],
            docs: [
                { title: 'Spring Boot — Data Properties', url: 'https://docs.spring.io/spring-boot/appendix/application-properties/index.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'jpa-hibernate', questionId: 'lazy-initialization-exception' }
            ]
        }
    ]
};
