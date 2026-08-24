/* ==========================================================================
   data/jpa-hibernate.js — JPA & Hibernate

   Twenty-six questions in four subsections. This is the topic where the gap
   between "I have used Spring Data" and "I know what it did" is widest, and
   interviewers know it: the questions here are the ones where the annotation
   is easy and the generated SQL is the actual answer.

   ONE GLOBAL PER FILE.
   ========================================================================== */

const jpaHibernateData = {
    id: 'jpa-hibernate',
    title: 'JPA & Hibernate',
    subsections: [
        { id: 'mapping',  title: 'Mapping & Relationships' },
        { id: 'context',  title: 'Persistence Context' },
        { id: 'fetching', title: 'Fetching & N+1' },
        { id: 'caching',  title: 'Caching' }
    ],
    keyTopics: [
        'entity lifecycle states', 'cascade types', 'orphanRemoval',
        'LAZY vs EAGER', 'LazyInitializationException', 'N+1', 'join fetch',
        '@EntityGraph', 'batch fetch size', 'dirty checking', 'flush modes',
        'first-level cache', 'second-level cache',
        'entity equals and hashCode', 'Spring Data derived queries',
        'projections'
    ],
    questions: [

/* ==== Mapping & Relationships ========================================= */

{
    id: 'jpa-vs-hibernate',
    importance: 'must-know',
    subsection: 'mapping',
    question: 'What is the difference between JPA, Hibernate and Spring Data JPA?',
    answer:
        '<p>Three layers, and confusing them makes every later answer vague.</p>' +
        '<ul>' +
        '<li><strong>JPA</strong> is a <em>specification</em>. It defines ' +
        '<code>EntityManager</code>, the annotations, JPQL and the lifecycle rules. It is an ' +
        'API with no implementation.</li>' +
        '<li><strong>Hibernate</strong> is the <em>implementation</em> almost everyone uses, ' +
        'and it predates JPA. It implements the specification and adds a great deal beyond it — ' +
        '<code>@BatchSize</code>, <code>@Filter</code>, <code>@NaturalId</code>, its own ' +
        'criteria API, statistics.</li>' +
        '<li><strong>Spring Data JPA</strong> sits above both. It generates repository ' +
        'implementations from interfaces, derives queries from method names, and provides ' +
        'paging, sorting, auditing and projections. It is not an ORM; it delegates all of that ' +
        'to the JPA provider.</li>' +
        '</ul>' +
        '<p>Why it matters in an interview: performance problems live in the middle layer. A ' +
        'question about N+1 or about a flush is a Hibernate question that Spring Data merely ' +
        'passes through, and an answer phrased entirely in repository methods shows the person ' +
        'has not looked underneath.</p>' +
        '<p>The practical consequence of using Hibernate-specific features is portability: ' +
        '<code>@BatchSize</code> has no JPA equivalent, so using it means the application is a ' +
        'Hibernate application rather than a JPA one. That is usually a fine trade — provider ' +
        'switching is rare and the features are valuable — but it should be a decision.</p>',
    referenceLinks: [
        { title: 'Hibernate ORM User Guide', url: 'https://docs.jboss.org/hibernate/orm/current/userguide/html_single/Hibernate_User_Guide.html' }
    ],
    tags: ['jpa', 'hibernate', 'spring-data', 'orm'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'entity-lifecycle-states',
    importance: 'must-know',
    subsection: 'mapping',
    question: 'What are the entity lifecycle states, and what moves an entity between them?',
    answer:
        '<p>Four states, and nearly every JPA surprise is explained by knowing which one an ' +
        'object is in.</p>' +
        '<ul>' +
        '<li><strong>Transient (new).</strong> Created with <code>new</code>, never associated ' +
        'with a persistence context, no database row. Changes to it do nothing.</li>' +
        '<li><strong>Managed (persistent).</strong> Associated with an open persistence context. ' +
        '<strong>Changes to it are tracked and written automatically</strong> — you do not call ' +
        '<code>save()</code>, and calling it changes nothing. This is dirty checking, and it is ' +
        'the single most surprising thing about JPA for people arriving from JDBC.</li>' +
        '<li><strong>Detached.</strong> Was managed, but the context has closed or the entity ' +
        'was evicted. It has an identity and a row, and changes to it are ignored until it is ' +
        'reattached with <code>merge()</code>.</li>' +
        '<li><strong>Removed.</strong> Marked for deletion; the <code>DELETE</code> is issued at ' +
        'flush.</li>' +
        '</ul>' +
        '<p>The transitions: <code>persist()</code> makes transient managed; ' +
        '<code>find()</code> or a query returns managed; <code>remove()</code> makes managed ' +
        'removed; closing the context or <code>detach()</code> makes managed detached; ' +
        '<code>merge()</code> copies a detached instance\'s state onto a managed one.</p>' +
        '<p><strong><code>merge()</code> does not attach the object you passed it.</strong> It ' +
        'returns a <em>different</em>, managed instance and leaves yours detached. Continuing to ' +
        'use the argument after calling merge is a common bug: the changes go nowhere, silently. ' +
        'Always use the return value.</p>' +
        '<p>The reason this is worth memorising is that "why was my change not saved" and "why ' +
        'was my change saved when I did not call save" are the two most common JPA questions, ' +
        'and both are answered by the state.</p>',
    referenceLinks: [
        { title: 'Entity Lifecycle — Hibernate User Guide', url: 'https://docs.jboss.org/hibernate/orm/current/userguide/html_single/Hibernate_User_Guide.html#pc' }
    ],
    tags: ['jpa', 'hibernate', 'lifecycle', 'dirty-checking'],
    images: [],
    hasDiagram: true,
    diagramType: 'flowchart',
    diagramConfig: {
        title: 'Entity states and the calls that move between them',
        nodes: [
            { id: 'transient', label: 'Transient: new, untracked',      kind: 'start' },
            { id: 'managed',   label: 'Managed: changes are written',   kind: 'fix' },
            { id: 'detached',  label: 'Detached: changes are ignored',  kind: 'trap' },
            { id: 'removed',   label: 'Removed: DELETE at flush',       kind: 'step' }
        ],
        edges: [
            { from: 'transient', to: 'managed',  label: 'persist()' },
            { from: 'managed',   to: 'detached', label: 'context closes' },
            { from: 'detached',  to: 'managed',  label: 'merge() returns a NEW instance' },
            { from: 'managed',   to: 'removed',  label: 'remove()' }
        ]
    },
    codeSnippets: []
},

{
    id: 'entity-equals-hashcode',
    importance: 'must-know',
    subsection: 'mapping',
    question: 'How do you implement equals() and hashCode() on a JPA entity?',
    answer:
        '<p>This is genuinely hard, because an entity has to satisfy the <code>equals</code> ' +
        'contract across a state change that alters its identity.</p>' +
        '<p><strong>The trap:</strong> a new entity has a null id. Put it in a ' +
        '<code>HashSet</code>, persist it, and the database assigns an id — so the hash changes ' +
        'while the object sits in the set, and the set can no longer find it. Basing ' +
        '<code>hashCode</code> on a generated id is broken for exactly this reason.</p>' +
        '<p><strong>The other trap:</strong> using <code>getClass()</code> for the type check ' +
        'breaks against Hibernate proxies, which are subclasses. A lazily loaded reference is ' +
        'never equal to the entity it proxies. Use <code>instanceof</code>, or Hibernate\'s ' +
        '<code>Hibernate.getClass()</code> which unwraps the proxy.</p>' +
        '<p><strong>The three workable approaches:</strong></p>' +
        '<ul>' +
        '<li><strong>A business key.</strong> An immutable natural identifier — an ISBN, an ' +
        'email, an order number. Stable from construction, so everything works. This is the ' +
        'textbook answer and it requires the domain to have such a key.</li>' +
        '<li><strong>A UUID assigned in the constructor</strong> rather than by the database. ' +
        'The identity exists before persistence, so nothing changes on flush. Increasingly the ' +
        'default recommendation, and time-ordered UUIDv7 avoids the index-fragmentation ' +
        'objection to random UUIDs.</li>' +
        '<li><strong>Id-based equals with a constant hashCode.</strong> ' +
        '<code>equals</code> compares ids (unequal when either is null), and ' +
        '<code>hashCode</code> returns a fixed value such as <code>getClass().hashCode()</code>. ' +
        'This looks wrong and is contract-correct: equal objects share a hash, and unequal ' +
        'objects are permitted to. Every entity of a type lands in one bucket, which is fine ' +
        'because a set of entities is almost always small.</li>' +
        '</ul>' +
        '<p><strong>Do not use Lombok\'s <code>@Data</code> or <code>@EqualsAndHashCode</code> ' +
        'on an entity.</strong> They include every field, which triggers lazy loading during a ' +
        'comparison and recurses infinitely through bidirectional relationships.</p>',
    referenceLinks: [
        { title: 'Equals and HashCode — Hibernate User Guide', url: 'https://docs.jboss.org/hibernate/orm/current/userguide/html_single/Hibernate_User_Guide.html#entity-pojo-equalshashcode' }
    ],
    tags: ['jpa', 'hibernate', 'equals-hashcode', 'entities'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'cascade-types',
    importance: 'must-know',
    subsection: 'mapping',
    question: 'What do the cascade types do, and which should you avoid?',
    answer:
        '<p>Cascading propagates an <code>EntityManager</code> operation from a parent to its ' +
        'associated entities.</p>' +
        '<ul>' +
        '<li><strong><code>PERSIST</code></strong> — saving the parent saves new children. ' +
        'Usually wanted for a genuine composition.</li>' +
        '<li><strong><code>MERGE</code></strong> — merging propagates.</li>' +
        '<li><strong><code>REMOVE</code></strong> — deleting the parent deletes the children. ' +
        'Correct for composition, dangerous otherwise.</li>' +
        '<li><strong><code>REFRESH</code></strong>, <strong><code>DETACH</code></strong> — ' +
        'rarely used explicitly.</li>' +
        '<li><strong><code>ALL</code></strong> — all of the above, and the one to be careful ' +
        'with.</li>' +
        '</ul>' +
        '<p><strong><code>CascadeType.ALL</code> on a <code>@ManyToOne</code> is almost always ' +
        'wrong</strong>, and it is the mistake to be able to name. Deleting an ' +
        '<code>OrderItem</code> would delete the <code>Product</code> it points at — and then ' +
        'every other order referencing that product breaks. Cascade flows from the owning whole ' +
        'to its parts, so it belongs on the <em>one</em> side of a composition, never on the ' +
        'many side pointing at a shared reference.</p>' +
        '<p><strong><code>orphanRemoval = true</code> is not the same as ' +
        '<code>CascadeType.REMOVE</code>.</strong> Remove-cascade deletes children when the ' +
        'parent is deleted. Orphan removal additionally deletes a child when it is taken <em>out ' +
        'of the collection</em> — <code>order.getItems().remove(item)</code> issues a ' +
        '<code>DELETE</code>. That is what you want for a true composition and is a surprise if ' +
        'the collection is a set of references to shared things.</p>' +
        '<p>The test for whether cascade is right: <em>can the child exist meaningfully without ' +
        'this parent?</em> An order line cannot; a product can. Composition cascades, association ' +
        'does not.</p>',
    referenceLinks: [
        { title: 'Cascading — Hibernate User Guide', url: 'https://docs.jboss.org/hibernate/orm/current/userguide/html_single/Hibernate_User_Guide.html#pc-cascade' }
    ],
    tags: ['jpa', 'hibernate', 'cascade', 'relationships'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'bidirectional-relationships',
    importance: 'should-know',
    subsection: 'mapping',
    question: 'What does mappedBy mean, and what goes wrong if you only set one side?',
    answer:
        '<p><code>mappedBy</code> marks the <strong>inverse</strong> side of a bidirectional ' +
        'relationship. The other side — the one with the foreign key column — is the ' +
        '<strong>owning</strong> side, and <strong>only the owning side is written to the ' +
        'database.</strong></p>' +
        '<p>So adding a child to <code>parent.getChildren()</code> without also setting ' +
        '<code>child.setParent(parent)</code> updates nothing. The in-memory graph says one ' +
        'thing and the database says another, and the mismatch survives until the context is ' +
        'cleared — at which point the child appears to have vanished from the collection.</p>' +
        '<p>The fix is a <strong>helper method on the parent</strong> that sets both sides, and ' +
        'a matching one to remove. It is boilerplate, and writing it once per relationship is ' +
        'far cheaper than debugging the asymmetry.</p>' +
        '<p>Other consequences of bidirectionality worth knowing:</p>' +
        '<ul>' +
        '<li><strong>Infinite recursion</strong> in <code>toString</code>, ' +
        '<code>equals</code>, <code>hashCode</code> and JSON serialisation. Break it with ' +
        '<code>@JsonIgnore</code> on one side, or by not serialising entities at all.</li>' +
        '<li><strong>A unidirectional <code>@OneToMany</code> generates a join table</strong> by ' +
        'default, which is rarely what anyone wants. <code>@JoinColumn</code> on it avoids the ' +
        'join table, and produces extra <code>UPDATE</code> statements instead.</li>' +
        '<li><strong>Do you need both sides at all?</strong> A bidirectional relationship exists ' +
        'so you can navigate in both directions. If nothing navigates from the child to the ' +
        'parent, a unidirectional <code>@ManyToOne</code> on the child is simpler, and it ' +
        'removes the synchronisation problem entirely. That is the answer worth offering.</li>' +
        '</ul>',
    referenceLinks: [],
    tags: ['jpa', 'hibernate', 'relationships', 'mappedby'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: [
        {
            language: 'java',
            title: 'The helper that keeps both sides honest',
            code:
                '@Entity\n' +
                'public class Order {\n' +
                '\n' +
                '    @Id @GeneratedValue\n' +
                '    private Long id;\n' +
                '\n' +
                '    // Inverse side: mappedBy names the field on OrderItem that owns\n' +
                '    // the foreign key. Nothing here is written to the database.\n' +
                '    @OneToMany(mappedBy = "order",\n' +
                '               cascade = CascadeType.ALL,\n' +
                '               orphanRemoval = true)\n' +
                '    private final List<OrderItem> items = new ArrayList<>();\n' +
                '\n' +
                '    // Both sides, every time. Callers cannot get it half right.\n' +
                '    public void addItem(OrderItem item) {\n' +
                '        items.add(item);\n' +
                '        item.setOrder(this);\n' +
                '    }\n' +
                '\n' +
                '    public void removeItem(OrderItem item) {\n' +
                '        items.remove(item);\n' +
                '        item.setOrder(null);      // orphanRemoval issues the DELETE\n' +
                '    }\n' +
                '}\n' +
                '\n' +
                '@Entity\n' +
                'class OrderItem {\n' +
                '\n' +
                '    @Id @GeneratedValue\n' +
                '    private Long id;\n' +
                '\n' +
                '    // Owning side: this column is the relationship.\n' +
                '    @ManyToOne(fetch = FetchType.LAZY)   // never leave this EAGER\n' +
                '    @JoinColumn(name = "order_id")\n' +
                '    private Order order;\n' +
                '\n' +
                '    void setOrder(Order order) { this.order = order; }\n' +
                '}',
            output: {
                kind: 'trace',
                lines: [
                    'addItem sets the collection and the foreign-key field in one call.',
                    'Only order_id on order_item is written; the collection is derived from it.',
                    'Setting only the collection would persist nothing and leave the graph inconsistent.',
                    'removeItem detaches the child, and orphanRemoval turns that into a DELETE.',
                    'The @ManyToOne is explicitly LAZY because the JPA default for it is EAGER.'
                ],
                explain:
                    '<p>The explicit <code>LAZY</code> on the <code>@ManyToOne</code> is not ' +
                    'decoration. <code>@ManyToOne</code> and <code>@OneToOne</code> default to ' +
                    '<code>EAGER</code> in the specification, so leaving it out means every ' +
                    'load of an item also loads its order, and a list of items becomes a ' +
                    'cascade of joins nobody asked for.</p>'
            }
        }
    ]
},

{
    id: 'id-generation-strategies',
    importance: 'should-know',
    subsection: 'mapping',
    question: 'Which @GeneratedValue strategy should you use, and why does IDENTITY hurt batching?',
    answer:
        '<p>Four strategies, and the choice has a real performance consequence.</p>' +
        '<ul>' +
        '<li><strong><code>IDENTITY</code></strong> — an auto-increment column. The database ' +
        'assigns the id, which means <strong>Hibernate must execute the <code>INSERT</code> ' +
        'immediately</strong> on <code>persist()</code> to learn it. That defeats write ' +
        'batching entirely: a hundred inserts are a hundred round trips, and no ' +
        '<code>batch_size</code> setting can help.</li>' +
        '<li><strong><code>SEQUENCE</code></strong> — a database sequence. Hibernate can fetch ' +
        'ids ahead of time and defer the inserts to flush, so batching works. With an allocation ' +
        'size and a pooled optimiser it fetches a block at a time, so id generation costs almost ' +
        'nothing. <strong>This is the default recommendation on any database with sequences</strong>, ' +
        'which includes PostgreSQL and Oracle.</li>' +
        '<li><strong><code>TABLE</code></strong> — a table used as a counter. Portable, and slow ' +
        'and contended. Avoid.</li>' +
        '<li><strong><code>AUTO</code></strong> — the provider chooses. Convenient, and the ' +
        'choice differs between Hibernate 5 and 6, which is one of the changes that catches a ' +
        'Boot 3 migration against an existing schema.</li>' +
        '</ul>' +
        '<p><strong>Application-assigned UUIDs</strong> are the other option. They solve the ' +
        'entity-identity problem — the id exists before persistence, so ' +
        '<code>equals</code> and <code>hashCode</code> are stable — and they let a client ' +
        'generate an id for idempotent creation. The historical objection is index ' +
        'fragmentation from random values, which time-ordered UUIDv7 largely answers.</p>' +
        '<p>MySQL has no sequences, so <code>IDENTITY</code> is effectively forced there. That ' +
        'is worth saying explicitly, because "use SEQUENCE" is advice that does not travel.</p>',
    referenceLinks: [
        { title: 'Identifier Generators — Hibernate User Guide', url: 'https://docs.jboss.org/hibernate/orm/current/userguide/html_single/Hibernate_User_Guide.html#identifiers' }
    ],
    tags: ['jpa', 'hibernate', 'identifiers', 'performance'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'inheritance-strategies',
    importance: 'good-to-know',
    subsection: 'mapping',
    question: 'How does JPA map an inheritance hierarchy, and what are the trade-offs?',
    answer:
        '<p>Three strategies.</p>' +
        '<ul>' +
        '<li><strong><code>SINGLE_TABLE</code></strong> (the default) — one table for the whole ' +
        'hierarchy with a discriminator column. Fastest, because polymorphic queries need no ' +
        'joins. The cost is that <strong>every subclass column must be nullable</strong>, so the ' +
        'database cannot enforce a <code>NOT NULL</code> that is genuinely required by one ' +
        'subclass. Wide, sparse tables.</li>' +
        '<li><strong><code>JOINED</code></strong> — a table per class, joined on the primary ' +
        'key. Properly normalised and constraints work. Every read of a subclass is a join, and ' +
        'a polymorphic query joins every table in the hierarchy.</li>' +
        '<li><strong><code>TABLE_PER_CLASS</code></strong> — a table per concrete class with ' +
        'every column repeated. Fast for a single concrete type, and a polymorphic query becomes ' +
        'a <code>UNION</code> across every table. Identity generation is awkward because the ' +
        'ids must be unique across tables. Rarely the right choice.</li>' +
        '</ul>' +
        '<p><code>@MappedSuperclass</code> is the fourth option and is not inheritance mapping ' +
        'at all: it shares fields and mappings without making the parent an entity, so there is ' +
        'no polymorphic query and no discriminator. For a shared audit block — created and ' +
        'updated timestamps, a version column — it is exactly right and much simpler than any ' +
        'of the three.</p>' +
        '<p>The honest advice: <strong>most entity hierarchies should not exist.</strong> ' +
        'Inheritance in the domain model does not have to be inheritance in the schema, and ' +
        'composition plus a type column is usually easier to query, easier to index and easier ' +
        'to evolve. Reach for <code>SINGLE_TABLE</code> when the subclasses differ by a couple ' +
        'of fields and <code>JOINED</code> when they genuinely differ, and be suspicious of a ' +
        'hierarchy more than one level deep.</p>',
    referenceLinks: [],
    tags: ['jpa', 'hibernate', 'inheritance', 'schema-design'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

/* ==== Persistence Context ============================================= */

{
    id: 'persistence-context-and-dirty-checking',
    importance: 'must-know',
    subsection: 'context',
    question: 'What is the persistence context, and why do changes get saved without calling save()?',
    answer:
        '<p>The persistence context is a <strong>map from entity identity to entity ' +
        'instance</strong>, scoped to the transaction. It is the first-level cache, and it is ' +
        'not optional or configurable — it is how JPA works.</p>' +
        '<p>Two consequences follow, and both look like magic until you know about it.</p>' +
        '<p><strong>Repeated reads return the same object.</strong> Calling ' +
        '<code>find()</code> twice for the same id inside one transaction issues one query; the ' +
        'second returns the cached instance, and it is <code>==</code> to the first. That is ' +
        'the guarantee that makes an object graph coherent.</p>' +
        '<p><strong>Dirty checking writes your changes.</strong> On flush, Hibernate compares ' +
        'each managed entity against the snapshot it took when the entity was loaded, and issues ' +
        'an <code>UPDATE</code> for anything that differs. So <code>order.setStatus(SHIPPED)</code> ' +
        'inside a transaction is persisted whether or not you call <code>save()</code>.</p>' +
        '<p>This is powerful and it is a trap in three ways:</p>' +
        '<ul>' +
        '<li><strong>Accidental writes.</strong> A method that loads an entity and modifies it ' +
        'to compute something writes that modification to the database. Marking a read-only ' +
        'transaction <code>@Transactional(readOnly = true)</code> disables dirty checking, which ' +
        'both prevents this and is faster because no snapshots are kept.</li>' +
        '<li><strong>Memory.</strong> The context holds every entity it has loaded, plus a ' +
        'snapshot of each. A batch job reading a million rows in one transaction holds all of ' +
        'them; <code>clear()</code> or <code>detach()</code> periodically, or stream and ' +
        'detach.</li>' +
        '<li><strong>Flush cost.</strong> Dirty checking is proportional to the number of ' +
        'managed entities, so a large context makes every flush slow — and flushes happen before ' +
        'queries, not only at commit.</li>' +
        '</ul>',
    referenceLinks: [
        { title: 'Persistence Contexts — Hibernate User Guide', url: 'https://docs.jboss.org/hibernate/orm/current/userguide/html_single/Hibernate_User_Guide.html#pc' }
    ],
    tags: ['jpa', 'hibernate', 'persistence-context', 'dirty-checking'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'flush-modes-and-when-flush-happens',
    importance: 'must-know',
    subsection: 'context',
    question: 'When does Hibernate actually send SQL to the database?',
    answer:
        '<p>Not when you call <code>persist()</code> or change a field. Hibernate queues the ' +
        'work and <strong>flushes</strong> — writes the pending SQL — at three moments:</p>' +
        '<ul>' +
        '<li><strong>Before the transaction commits.</strong> Always.</li>' +
        '<li><strong>Before a query that might be affected by the pending changes.</strong> This ' +
        'is the important one and it is what makes read-your-own-writes work inside a ' +
        'transaction. With <code>FlushModeType.AUTO</code>, the default, Hibernate flushes ' +
        'before a JPQL or criteria query whose tables overlap the pending changes.</li>' +
        '<li><strong>When you call <code>flush()</code> explicitly.</strong></li>' +
        '</ul>' +
        '<p>Deferring is what makes batching and write-combining possible: several changes to ' +
        'one entity produce one <code>UPDATE</code>, and inserts can be batched into a single ' +
        'round trip if the id strategy allows it.</p>' +
        '<p>The behaviours that surprise people:</p>' +
        '<ul>' +
        '<li><strong>A native SQL query does not trigger an automatic flush</strong> reliably, ' +
        'because Hibernate cannot parse which tables it touches. So a native query can miss ' +
        'changes made earlier in the same transaction. Either flush manually or tell Hibernate ' +
        'the synchronised tables.</li>' +
        '<li><strong>A constraint violation surfaces at flush, not at the line that caused ' +
        'it.</strong> The stack trace points at a commit or an unrelated query, which is why ' +
        'these are hard to locate. Flushing explicitly while debugging narrows it down ' +
        'immediately.</li>' +
        '<li><strong><code>flush()</code> is not <code>commit()</code>.</strong> Flushed changes ' +
        'are in the transaction and are still rolled back if it fails.</li>' +
        '<li><strong><code>saveAndFlush()</code> in a loop destroys batching.</strong> It is ' +
        'occasionally necessary and usually a misunderstanding.</li>' +
        '</ul>' +
        '<p><code>FlushModeType.COMMIT</code> flushes only at commit, which is faster and means ' +
        'queries may not see your own pending changes. It is a deliberate optimisation for ' +
        'read-heavy code, not a default to reach for.</p>',
    referenceLinks: [
        { title: 'Flushing — Hibernate User Guide', url: 'https://docs.jboss.org/hibernate/orm/current/userguide/html_single/Hibernate_User_Guide.html#flushing' }
    ],
    tags: ['jpa', 'hibernate', 'flush', 'transactions'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'lazy-initialization-exception',
    importance: 'must-know',
    subsection: 'context',
    question: 'What causes LazyInitializationException, and what is the right fix?',
    answer:
        '<p>A lazy association is a proxy that fetches on first access, and it can only do that ' +
        'while its persistence context is open. Touching it after the transaction has ended ' +
        'throws <code>LazyInitializationException: could not initialize proxy — no ' +
        'Session</code>.</p>' +
        '<p>Classically this happens when a controller serialises an entity returned by a ' +
        'service: the transaction ended at the service boundary, and Jackson then walks into a ' +
        'lazy collection.</p>' +
        '<p><strong>The fixes, best first:</strong></p>' +
        '<ul>' +
        '<li><strong>Fetch what you need in the query.</strong> A <code>JOIN FETCH</code> or an ' +
        '<code>@EntityGraph</code> loads the association eagerly for that one query. Explicit, ' +
        'local, and it fixes the N+1 problem at the same time.</li>' +
        '<li><strong>Map to a DTO inside the transaction.</strong> Nothing lazy escapes, because ' +
        'nothing entity-shaped escapes. This also solves the leaked-fields and mass-assignment ' +
        'problems, which is why it is the structural answer rather than a workaround.</li>' +
        '<li><strong>Use a projection.</strong> Spring Data can select straight into an interface ' +
        'or a record, which never materialises an entity at all and reads fewer columns.</li>' +
        '</ul>' +
        '<p><strong>The fixes to argue against:</strong></p>' +
        '<ul>' +
        '<li><strong>Open Session in View.</strong> Boot enables it by default and logs a ' +
        'warning about it. It keeps the session open for the whole request so lazy loading ' +
        'always works — and that is the problem: queries are now issued from the view layer, ' +
        'where nobody sees them, N+1 becomes invisible, and a database connection is held for ' +
        'the duration of the response including the time spent writing bytes to a slow client. ' +
        'Set <code>spring.jpa.open-in-view=false</code> and fix what breaks.</li>' +
        '<li><strong>Making the association <code>EAGER</code>.</strong> This fixes one endpoint ' +
        'and slows every other query that touches the entity, forever.</li>' +
        '<li><strong><code>Hibernate.initialize()</code></strong> — works, and it is a manual ' +
        'fix applied per call site rather than a query that is right.</li>' +
        '</ul>',
    referenceLinks: [
        { title: 'Open Session in View — Spring Boot Reference', url: 'https://docs.spring.io/spring-boot/reference/data/sql.html' }
    ],
    tags: ['jpa', 'hibernate', 'lazy-loading', 'open-in-view'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'save-vs-persist-vs-merge',
    importance: 'should-know',
    subsection: 'context',
    question: 'What does Spring Data JPA save() actually do?',
    answer:
        '<p><code>SimpleJpaRepository.save()</code> is:</p>' +
        '<p><code>if (entityInformation.isNew(entity)) { em.persist(entity); return entity; } ' +
        'else { return em.merge(entity); }</code></p>' +
        '<p>That is the whole implementation, and both branches matter.</p>' +
        '<p><strong>The <code>isNew</code> check</strong> defaults to "the id is null" — or, with ' +
        'a <code>@Version</code> field, "the version is null". So an entity with a ' +
        'client-assigned id is <em>not</em> considered new, and <code>save()</code> takes the ' +
        'merge branch, which issues a <code>SELECT</code> before the <code>INSERT</code>. For a ' +
        'bulk load of UUID-keyed entities that is one wasted query per row. Implementing ' +
        '<code>Persistable</code> and controlling <code>isNew()</code> yourself is the fix.</p>' +
        '<p><strong>The merge branch returns a different instance.</strong> The object you passed ' +
        'in stays detached; the managed copy is the return value. Ignoring the return value and ' +
        'continuing to use the argument is a real and quiet bug.</p>' +
        '<p>The other thing worth saying: <strong>for an already-managed entity, ' +
        '<code>save()</code> is unnecessary.</strong> Dirty checking has already scheduled the ' +
        'update. Calling it is harmless and it misleads the next reader into thinking the write ' +
        'depends on it — and then someone moves the call inside an <code>if</code> and the ' +
        'change is still written.</p>' +
        '<p><code>saveAll()</code> is a loop over <code>save()</code>, not a batch operation. ' +
        'Real batching requires <code>hibernate.jdbc.batch_size</code>, ordered inserts, and an ' +
        'id strategy that is not <code>IDENTITY</code>.</p>',
    referenceLinks: [],
    tags: ['jpa', 'spring-data', 'save', 'merge'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'getreferencebyid-vs-findbyid',
    importance: 'good-to-know',
    subsection: 'context',
    question: 'When would you use getReferenceById instead of findById?',
    answer:
        '<p><code>findById()</code> issues a <code>SELECT</code> and returns the entity, or an ' +
        'empty <code>Optional</code>. <code>getReferenceById()</code> — formerly ' +
        '<code>getOne</code>, then <code>getById</code> — returns a <strong>lazy proxy without ' +
        'hitting the database</strong>, and only queries when a property is accessed.</p>' +
        '<p>The use is setting a foreign key without loading the target. To attach an existing ' +
        '<code>Customer</code> to a new <code>Order</code>, all the database needs is the id — ' +
        'so <code>order.setCustomer(customerRepository.getReferenceById(id))</code> writes the ' +
        'correct <code>customer_id</code> with no <code>SELECT</code> at all. In a loop over ' +
        'many rows that is a query per row saved.</p>' +
        '<p><strong>The catch:</strong> if the id does not exist, you do not find out until the ' +
        'proxy is touched — at which point it throws <code>EntityNotFoundException</code>, ' +
        'possibly at flush, possibly outside the transaction, with a stack trace far from the ' +
        'cause. And it throws rather than returning empty, so there is no gentle handling.</p>' +
        '<p>So: use it when you already know the id is valid, typically because it came from ' +
        'another row in the database rather than from a request. Use <code>findById()</code> ' +
        'when the id came from outside and its existence is part of what you are checking — the ' +
        '<code>Optional</code> is doing real work there.</p>' +
        '<p>Related: a <code>@ManyToOne(fetch = LAZY)</code> association is exactly this proxy, ' +
        'which is why <code>order.getCustomer().getId()</code> costs no query while ' +
        '<code>order.getCustomer().getName()</code> costs one.</p>',
    referenceLinks: [],
    tags: ['jpa', 'spring-data', 'proxies', 'performance'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

/* ==== Fetching & N+1 ================================================== */

{
    id: 'n-plus-one',
    importance: 'must-know',
    subsection: 'fetching',
    question: 'What is the N+1 problem, how do you detect it, and what are the fixes?',
    answer:
        '<p>One query loads N parents, and then accessing an association on each one issues ' +
        'another query — N+1 queries where one or two would do. A list of a hundred orders whose ' +
        'customer is touched in a loop is a hundred and one round trips, and each round trip ' +
        'costs network latency that dominates the query time.</p>' +
        '<p><strong>How to detect it,</strong> which is the half people leave out:</p>' +
        '<ul>' +
        '<li>Turn on SQL logging in development — <code>spring.jpa.show-sql</code>, or better ' +
        '<code>logging.level.org.hibernate.SQL=DEBUG</code> — and watch the count.</li>' +
        '<li>Enable Hibernate statistics and assert on the query count <em>in a test</em>. This ' +
        'is the one that stops it coming back: a test that fails when a query count changes ' +
        'catches the regression at the commit that caused it.</li>' +
        '<li>Use a datasource proxy such as datasource-proxy or p6spy to count and log queries ' +
        'per request.</li>' +
        '<li>In production, the distributed trace shows it immediately — a span with a hundred ' +
        'identical child spans is unmistakable.</li>' +
        '</ul>' +
        '<p><strong>The fixes:</strong></p>' +
        '<ul>' +
        '<li><strong><code>JOIN FETCH</code></strong> in JPQL. Explicit and per-query, which is ' +
        'the right granularity. Cannot be combined with pagination without Hibernate loading ' +
        'everything into memory and warning about it.</li>' +
        '<li><strong><code>@EntityGraph</code></strong> on the repository method. The same ' +
        'effect declaratively, and it composes with derived query methods.</li>' +
        '<li><strong><code>@BatchSize</code></strong>, or ' +
        '<code>hibernate.default_batch_fetch_size</code>. Turns N queries into N/size queries ' +
        'using an <code>IN</code> clause. This is the one that works <em>with</em> pagination, ' +
        'and setting the global default is close to free.</li>' +
        '<li><strong>A DTO projection.</strong> Select exactly the columns needed in one query ' +
        'and never build the entity graph at all.</li>' +
        '</ul>' +
        '<p><strong>What is not a fix:</strong> making the association <code>EAGER</code>. That ' +
        'does not remove the extra queries — it just moves them to every query that touches the ' +
        'entity, including the ones that never needed the association.</p>',
    referenceLinks: [
        { title: 'Fetching — Hibernate User Guide', url: 'https://docs.jboss.org/hibernate/orm/current/userguide/html_single/Hibernate_User_Guide.html#fetching' }
    ],
    tags: ['jpa', 'hibernate', 'n-plus-one', 'performance'],
    images: [],
    hasDiagram: true,
    diagramType: 'flowchart',
    diagramConfig: {
        title: 'N+1, and the four ways out',
        nodes: [
            { id: 'parents',  label: 'SELECT * FROM orders — 1 query',    kind: 'start' },
            { id: 'loop',     label: 'touch order.customer in a loop',    kind: 'trap' },
            { id: 'n',        label: 'N more queries, one per row',       kind: 'trap' },
            { id: 'fetch',    label: 'JOIN FETCH or @EntityGraph: 1 query', kind: 'fix' },
            { id: 'batch',    label: '@BatchSize: N/size queries, works with paging', kind: 'fix' },
            { id: 'dto',      label: 'DTO projection: 1 query, fewer columns', kind: 'fix' }
        ],
        edges: [
            { from: 'parents', to: 'loop' },
            { from: 'loop',    to: 'n' },
            { from: 'parents', to: 'fetch' },
            { from: 'parents', to: 'batch' },
            { from: 'parents', to: 'dto' }
        ]
    },
    codeSnippets: []
},

{
    id: 'lazy-vs-eager-defaults',
    importance: 'must-know',
    subsection: 'fetching',
    question: 'What are the default fetch types, and which should you change?',
    answer:
        '<p>The JPA defaults are inconsistent, and that inconsistency causes real problems:</p>' +
        '<ul>' +
        '<li><strong><code>@ManyToOne</code> — EAGER</strong></li>' +
        '<li><strong><code>@OneToOne</code> — EAGER</strong></li>' +
        '<li><strong><code>@OneToMany</code> — LAZY</strong></li>' +
        '<li><strong><code>@ManyToMany</code> — LAZY</strong></li>' +
        '</ul>' +
        '<p>The rule of thumb is "to-one is eager, to-many is lazy", and the to-one default is ' +
        'the one to override. <strong>Make everything <code>LAZY</code> and fetch explicitly per ' +
        'query.</strong></p>' +
        '<p>Why eager to-one is damaging: it is not local. Every query that returns the entity ' +
        'also loads the association, including queries that never touch it. Worse, it is ' +
        'transitive — if <code>OrderItem</code> eagerly loads <code>Order</code>, and ' +
        '<code>Order</code> eagerly loads <code>Customer</code>, then loading one item loads a ' +
        'chunk of the graph. And an eager association <strong>cannot be made lazy for one ' +
        'query</strong>: the mapping wins, so there is no local escape.</p>' +
        '<p>A lazy association, by contrast, can be made eager anywhere it is needed with a ' +
        '<code>JOIN FETCH</code> or an entity graph. <strong>Lazy is the reversible ' +
        'default</strong>, which is the whole argument.</p>' +
        '<p>Two implementation notes. A lazy <code>@OneToOne</code> on the <em>inverse</em> side ' +
        'cannot be proxied, because Hibernate must query to know whether the row exists at all — ' +
        'so it stays eager in practice unless you use bytecode enhancement or map the ' +
        'relationship from the owning side. And a lazy proxy is a subclass, which is why a ' +
        '<code>final</code> entity class cannot have lazy associations pointing at it.</p>',
    referenceLinks: [
        { title: 'Jakarta Persistence — FetchType', url: 'https://jakarta.ee/specifications/persistence/3.1/apidocs/jakarta.persistence/jakarta/persistence/fetchtype' }
    ],
    tags: ['jpa', 'hibernate', 'fetching', 'lazy-loading'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'join-fetch-and-pagination',
    importance: 'should-know',
    subsection: 'fetching',
    question: 'Why does JOIN FETCH with pagination produce a warning about in-memory paging?',
    answer:
        '<p>Because a <code>JOIN FETCH</code> to a collection <strong>multiplies the rows</strong>. ' +
        'An order with three items produces three result rows, so <code>LIMIT 20</code> would ' +
        'not return twenty orders — it would return however many orders happen to fit in twenty ' +
        'joined rows, cutting the last one\'s collection in half.</p>' +
        '<p>Hibernate refuses to produce wrong results, so it does the correct thing badly: it ' +
        'fetches <strong>the entire result set</strong> into memory and paginates there. It logs ' +
        '<code>HHH90003004: firstResult/maxResults specified with collection fetch; applying in ' +
        'memory</code>. On a large table that is an <code>OutOfMemoryError</code>, and it is a ' +
        'warning rather than an error, so it reaches production.</p>' +
        '<p><strong>The fixes:</strong></p>' +
        '<ul>' +
        '<li><strong>Use <code>@BatchSize</code> instead.</strong> Paginate the parents ' +
        'normally, and let Hibernate load the collections in batches with an ' +
        '<code>IN</code> clause. One extra query per batch, correct pagination, bounded ' +
        'memory. This is the answer.</li>' +
        '<li><strong>Two queries.</strong> First select the ids for the page, then select the ' +
        'entities with a <code>JOIN FETCH</code> where the id is <code>IN</code> that list. ' +
        'Precise, and it is what several ORMs do internally.</li>' +
        '<li><strong>A DTO projection with an aggregate</strong>, when the collection is only ' +
        'needed as a count or a summary.</li>' +
        '</ul>' +
        '<p>Note that fetching a <em>to-one</em> association does not multiply rows, so ' +
        '<code>JOIN FETCH</code> plus pagination is fine there. The restriction is specifically ' +
        'about collections — and fetching <strong>two</strong> collections in one query produces ' +
        'a cartesian product, which Hibernate 6 will let you do and which is almost never what ' +
        'you want.</p>',
    referenceLinks: [],
    tags: ['jpa', 'hibernate', 'pagination', 'join-fetch', 'performance'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'projections-and-dto-queries',
    importance: 'should-know',
    subsection: 'fetching',
    question: 'What is a projection, and when is it better than loading entities?',
    answer:
        '<p>A projection selects a subset of columns straight into a DTO, without building a ' +
        'managed entity at all. Spring Data supports three forms:</p>' +
        '<ul>' +
        '<li><strong>Interface projections.</strong> Declare an interface with getters matching ' +
        'property names and return it from a repository method. Spring generates a proxy. ' +
        'Closed projections — only direct properties — let Spring select just those columns; ' +
        'open ones with <code>@Value</code> expressions cannot, and select everything.</li>' +
        '<li><strong>Class or record projections.</strong> A constructor expression in JPQL, or ' +
        'just a record whose component names match. Immutable, typed, and testable.</li>' +
        '<li><strong>Dynamic projections.</strong> A generic repository method taking ' +
        '<code>Class&lt;T&gt;</code>, so the same query can return the entity or any projection ' +
        'depending on the caller.</li>' +
        '</ul>' +
        '<p><strong>Why they are frequently the right answer:</strong> fewer columns read, no ' +
        'entity in the persistence context so no dirty-check snapshot and no memory held, no ' +
        'lazy proxies to explode later, and the DTO is the API contract rather than the ' +
        'schema.</p>' +
        '<p>For a read-only endpoint — which is most endpoints — a projection is faster, uses ' +
        'less memory and is safer than loading an entity and mapping it afterwards. Loading an ' +
        'entity is what you do when you intend to <em>change</em> it.</p>' +
        '<p>The limitation worth knowing: a projection over a collection association still ' +
        'multiplies rows, so nested collection projections need care. And because nothing is ' +
        'managed, there is no dirty checking — which is the point, and occasionally a surprise ' +
        'for someone expecting to modify the result.</p>',
    referenceLinks: [
        { title: 'Projections — Spring Data JPA', url: 'https://docs.spring.io/spring-data/jpa/reference/repositories/projections.html' }
    ],
    tags: ['jpa', 'spring-data', 'projections', 'performance'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'derived-queries-and-their-limits',
    importance: 'should-know',
    subsection: 'fetching',
    question: 'When do Spring Data derived query methods stop being a good idea?',
    answer:
        '<p>Derived queries parse the method name into a query: ' +
        '<code>findByStatusAndCreatedAtAfterOrderByTotalDesc</code> becomes JPQL with no ' +
        'implementation written. For simple lookups this is excellent — no string to get wrong, ' +
        'refactoring-safe, and the parameters are typed.</p>' +
        '<p>They stop being a good idea at three points:</p>' +
        '<ul>' +
        '<li><strong>When the name gets long.</strong> ' +
        '<code>findByStatusInAndCustomerCountryAndTotalGreaterThanAndCreatedAtBetween</code> is ' +
        'not more readable than the query it generates. Past three or four conditions, write ' +
        '<code>@Query</code>.</li>' +
        '<li><strong>When the query needs anything the parser cannot express</strong> — a ' +
        'subquery, a window function, a <code>CASE</code>, a join to something not mapped, a ' +
        'database function.</li>' +
        '<li><strong>When the conditions are dynamic.</strong> A search screen with six optional ' +
        'filters cannot be a derived method. That is what the Criteria API, ' +
        '<code>Specification</code>, Querydsl or Query by Example are for — and of those, ' +
        'Specifications compose well and stay type-safe.</li>' +
        '</ul>' +
        '<p>Two failure modes to name. <strong>A typo in a property name is a startup ' +
        'failure</strong> — Spring Data validates every derived method against the metamodel ' +
        'when the repository is created, which is good, and it means renaming an entity field ' +
        'breaks the application rather than one query. And <strong>the generated query may not ' +
        'be the query you would have written</strong>: derived methods over associations produce ' +
        'joins whose shape you did not choose, so a slow one deserves a look at the SQL rather ' +
        'than a guess.</p>' +
        '<p><code>@Query</code> with JPQL keeps refactoring safety for entity and field names; ' +
        '<code>nativeQuery = true</code> gives up both that and portability, and is the right ' +
        'call when you need what the database can do and JPQL cannot express.</p>',
    referenceLinks: [
        { title: 'Query Methods — Spring Data JPA', url: 'https://docs.spring.io/spring-data/jpa/reference/jpa/query-methods.html' }
    ],
    tags: ['jpa', 'spring-data', 'queries', 'specifications'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

/* ==== Caching ========================================================= */

{
    id: 'first-and-second-level-cache',
    importance: 'must-know',
    subsection: 'caching',
    question: 'What is the difference between the first-level and second-level cache?',
    answer:
        '<p><strong>The first-level cache is the persistence context</strong>, scoped to one ' +
        'transaction. It is mandatory, it cannot be turned off, and it is what makes two ' +
        '<code>find()</code> calls for the same id return the same instance and issue one query. ' +
        'It disappears at the end of the transaction.</p>' +
        '<p><strong>The second-level cache is optional and shared across transactions</strong>, ' +
        'for the lifetime of the session factory. It caches entity state by id — not entity ' +
        'instances, and not query results unless the query cache is separately enabled. It ' +
        'requires a provider such as Ehcache, Infinispan or Hazelcast, and per-entity ' +
        '<code>@Cache</code> annotations.</p>' +
        '<p><strong>When the second-level cache is worth it:</strong> reference data that is read ' +
        'constantly and written rarely — countries, currencies, product categories, ' +
        'configuration. A high read-to-write ratio is the whole condition.</p>' +
        '<p><strong>Why it is often not worth it:</strong></p>' +
        '<ul>' +
        '<li><strong>Invalidation across instances.</strong> With three replicas there are three ' +
        'caches. A write on one leaves the other two stale unless the provider is distributed, ' +
        'and a distributed cache brings its own network calls and failure modes.</li>' +
        '<li><strong>Anything writing outside Hibernate invalidates nothing.</strong> A native ' +
        'query, a bulk update, a migration, another service touching the same table — the cache ' +
        'does not know and keeps serving old data.</li>' +
        '<li><strong>The query cache is separate and harder.</strong> It caches ids, then loads ' +
        'the entities, and it is invalidated by any write to the tables involved — so on a ' +
        'write-heavy table it is invalidated constantly and costs more than it saves.</li>' +
        '</ul>' +
        '<p>The honest ordering: fix the queries first, add indexes, use projections, and reach ' +
        'for an application-level cache with an explicit TTL — which has a comprehensible ' +
        'invalidation story — before the second-level cache.</p>',
    referenceLinks: [
        { title: 'Caching — Hibernate User Guide', url: 'https://docs.jboss.org/hibernate/orm/current/userguide/html_single/Hibernate_User_Guide.html#caching' }
    ],
    tags: ['jpa', 'hibernate', 'caching', 'performance'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'batch-inserts',
    importance: 'should-know',
    subsection: 'caching',
    question: 'You need to insert 100,000 rows. What does that take with JPA?',
    answer:
        '<p>Naively it takes a hundred thousand round trips and then an ' +
        '<code>OutOfMemoryError</code>. Making it work needs four things together, and missing ' +
        'any one of them silently disables the others.</p>' +
        '<ul>' +
        '<li><strong>An id strategy that is not <code>IDENTITY</code>.</strong> Identity forces ' +
        'an immediate insert per row to learn the id, which makes batching impossible. Use a ' +
        'sequence with a pooled allocator, or assign UUIDs.</li>' +
        '<li><strong><code>hibernate.jdbc.batch_size</code></strong>, typically 20 to 50. ' +
        'Without it every statement is sent alone.</li>' +
        '<li><strong><code>order_inserts</code> and <code>order_updates</code></strong>, so ' +
        'statements against the same table are adjacent and can actually be batched.</li>' +
        '<li><strong>Clear the persistence context periodically.</strong> ' +
        '<code>flush()</code> then <code>clear()</code> every batch. Without this the context ' +
        'holds all hundred thousand entities plus their snapshots, dirty checking gets slower ' +
        'with every flush, and the heap fills.</li>' +
        '</ul>' +
        '<p>Also add <code>rewriteBatchedStatements=true</code> to a MySQL JDBC URL, without ' +
        'which the driver un-batches everything and the setting appears to do nothing.</p>' +
        '<p><strong>The honest answer, though, is to consider not using JPA for this.</strong> ' +
        '<code>JdbcTemplate.batchUpdate</code> is simpler and faster because there is no ' +
        'persistence context at all, and for a genuine bulk load the database\'s own path — ' +
        'PostgreSQL <code>COPY</code>, a bulk loader — is an order of magnitude faster again. ' +
        'JPA is designed for a graph of objects in a transaction, not for bulk data movement, ' +
        'and saying so is a better answer than tuning it heroically.</p>',
    referenceLinks: [
        { title: 'Batching — Hibernate User Guide', url: 'https://docs.jboss.org/hibernate/orm/current/userguide/html_single/Hibernate_User_Guide.html#batch' }
    ],
    tags: ['jpa', 'hibernate', 'batching', 'performance', 'bulk'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: [
        {
            language: 'properties',
            title: 'The settings that have to be present together',
            code:
                '# Without a batch size every statement is sent on its own.\n' +
                'spring.jpa.properties.hibernate.jdbc.batch_size=50\n' +
                '\n' +
                '# Without ordering, statements for different tables interleave and\n' +
                '# each change of table ends the batch.\n' +
                'spring.jpa.properties.hibernate.order_inserts=true\n' +
                'spring.jpa.properties.hibernate.order_updates=true\n' +
                '\n' +
                '# Batches versioned entities too, rather than falling back per row.\n' +
                'spring.jpa.properties.hibernate.jdbc.batch_versioned_data=true\n' +
                '\n' +
                '# IDENTITY defeats all of the above, because Hibernate must insert\n' +
                '# immediately to learn each generated id. Use a sequence.\n' +
                '#   @GeneratedValue(strategy = SEQUENCE, generator = "order_seq")\n' +
                '\n' +
                '# MySQL only: without this the driver sends the batch one row at a\n' +
                '# time anyway, and the settings above appear to do nothing at all.\n' +
                '#   jdbc:mysql://host/db?rewriteBatchedStatements=true\n' +
                '\n' +
                '# And in the loop: em.flush(); em.clear(); every batch_size rows,\n' +
                '# or the context grows to hold every entity and every snapshot.',
            output: {
                kind: 'trace',
                lines: [
                    'Hibernate accumulates pending inserts instead of sending each one immediately.',
                    'At flush it groups them by table and sends them as JDBC batches of fifty.',
                    'A hundred thousand rows become two thousand round trips rather than a hundred thousand.',
                    'flush() then clear() releases the entities so the heap stays flat.',
                    'With IDENTITY none of this happens, and no warning is logged to say so.'
                ],
                explain:
                    '<p>The silence around <code>IDENTITY</code> is the trap. Every property ' +
                    'above can be set correctly and the batching simply does not occur, with ' +
                    'nothing in the logs explaining why. Checking the actual statement count is ' +
                    'the only way to know it worked.</p>'
            }
        }
    ]
},

{
    id: 'bulk-update-and-delete',
    importance: 'good-to-know',
    subsection: 'caching',
    question: 'What happens when you run a bulk UPDATE or DELETE through JPQL?',
    answer:
        '<p>It executes directly against the database in one statement, which is exactly what ' +
        'you want for updating a million rows. But it <strong>bypasses the persistence context ' +
        'entirely</strong>, and that has consequences that are easy to miss.</p>' +
        '<ul>' +
        '<li><strong>Managed entities become stale.</strong> The context still holds the old ' +
        'values, and a subsequent read returns them from the first-level cache rather than from ' +
        'the database. Worse, dirty checking may then write the stale values back over your bulk ' +
        'update.</li>' +
        '<li><strong>Cascades do not run.</strong> A bulk <code>DELETE</code> on parents does ' +
        'not delete children, so it either leaves orphans or fails on a foreign key.</li>' +
        '<li><strong>Lifecycle callbacks do not fire.</strong> No <code>@PreUpdate</code>, no ' +
        '<code>@PreRemove</code>, no auditing.</li>' +
        '<li><strong><code>@Version</code> is not incremented</strong> unless the query does it ' +
        'explicitly, so optimistic locking silently misses these changes.</li>' +
        '<li><strong>The second-level cache is not invalidated</strong> for the affected ' +
        'entities.</li>' +
        '</ul>' +
        '<p>In Spring Data, a bulk query needs <code>@Modifying</code> and a transaction. ' +
        '<code>@Modifying(clearAutomatically = true, flushAutomatically = true)</code> flushes ' +
        'pending changes before the statement and clears the context after it, which handles the ' +
        'staleness — at the cost of detaching everything, so anything held across that call is ' +
        'now detached.</p>' +
        '<p>The rule that follows: <strong>run bulk operations in their own transaction</strong>, ' +
        'or at the start of one, and do not mix them with entity manipulation of the same rows. ' +
        'A bulk update and dirty checking racing over the same row is a bug that depends on ' +
        'flush ordering.</p>',
    referenceLinks: [],
    tags: ['jpa', 'hibernate', 'bulk', 'modifying', 'caching'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'schema-generation-and-migrations',
    importance: 'must-know',
    subsection: 'caching',
    question: 'What should hibernate.ddl-auto be set to, and how do you manage schema changes?',
    answer:
        '<p><strong>In production: <code>validate</code> or <code>none</code>. Never ' +
        '<code>update</code>, and obviously never <code>create-drop</code>.</strong></p>' +
        '<p><code>update</code> looks convenient and is dangerous for specific reasons: it only ' +
        'ever adds, so it never drops a removed column or narrows a type; it cannot express a ' +
        'data migration, so a column split or a backfill is impossible; the DDL it generates is ' +
        'not reviewed by anyone; it can lock a large table at startup; and running it from ' +
        'several instances simultaneously during a rolling deploy is a race. There is also no ' +
        'record of what it did, so no way to reproduce an environment.</p>' +
        '<p><strong>Use a migration tool</strong> — Flyway or Liquibase. Versioned SQL files in ' +
        'the repository, applied in order, recorded in a table, reviewed like code, and the same ' +
        'sequence runs in every environment. Boot runs them before Hibernate initialises, and ' +
        '<code>ddl-auto=validate</code> then acts as a check that the entities and the migrated ' +
        'schema agree — which catches the mismatch at startup rather than at the first query.</p>' +
        '<p><strong>The discipline that matters for zero-downtime deploys:</strong> during a ' +
        'rolling deploy the old and new versions run at once, so every migration must be ' +
        'backward compatible with the previous release. That means the expand-and-contract ' +
        'pattern: add the new column, deploy code that writes both and reads the new, backfill, ' +
        'then remove the old column in a <em>later</em> release. A rename done in one step ' +
        'breaks every instance still running the old code.</p>' +
        '<p><code>create-drop</code> is right for tests, and Testcontainers with the real ' +
        'migrations is better still — it tests the migrations themselves, which are otherwise ' +
        'the least-tested code in the repository.</p>',
    referenceLinks: [
        { title: 'Database Initialization — Spring Boot Reference', url: 'https://docs.spring.io/spring-boot/how-to/data-initialization.html' }
    ],
    tags: ['jpa', 'hibernate', 'migrations', 'flyway', 'operations'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
}

    ]
};
