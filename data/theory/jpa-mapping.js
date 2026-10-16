/* ==========================================================================
   data/theory/jpa-mapping.js — module 48 in the reading path

   Nine chapters. The equals/hashCode chapter is last and is the reason
   objects-and-contracts is a prerequisite of this module: an entity is the
   one case where the object contract and the persistence lifecycle actively
   disagree, and that disagreement has to be resolved deliberately.
   ========================================================================== */

const jpaMappingModule = {
    id: 'jpa-mapping',
    trackId: 'persistence',
    order: 48,
    title: 'JPA Mapping',
    tagline: 'Entities, relationships, cascades — and equals for an entity.',
    estimatedMinutes: 50,
    prerequisites: ['jdbc-and-pooling', 'objects-and-contracts'],
    docHub: { title: 'Hibernate ORM User Guide', url: 'https://docs.hibernate.org/orm/current/userguide/html_single/' },

    chapters: [
        {
            id: 'entity-basics-and-id-generation',
            title: 'An Entity, and Where Its Id Comes From',
            importance: 'must-know',
            summary: 'Four id strategies with genuinely different behaviour, and IDENTITY is the one that silently disables batch inserts.',
            interviewAngle: 'The strategies are asked directly. The answer that separates candidates is that IDENTITY requires the insert to happen immediately — so Hibernate cannot batch, and a bulk import is one round trip per row.',
            buildsOn: [],
            blocks: [
                {
                    type: 'types',
                    title: 'The four strategies',
                    items: [
                        { name: 'IDENTITY', html: '<p>An auto-increment column; the database assigns on insert. <strong>Forces an immediate insert</strong> at <code>persist()</code>, because Hibernate needs the id — which means no insert batching, ever.</p>' },
                        { name: 'SEQUENCE', html: '<p>A database sequence, read before the insert. <strong>The right default on PostgreSQL and Oracle.</strong> Batching works, and an allocation size above one amortises the sequence round trips.</p>' },
                        { name: 'TABLE', html: '<p>A row in a table used as a counter. Portable and slow — it needs its own locking. Avoid.</p>' },
                        { name: 'AUTO', html: '<p>Hibernate chooses. On modern versions that usually means SEQUENCE where available, which is fine — and being explicit documents the decision.</p>' },
                        { name: 'Assigned', html: '<p>No <code>@GeneratedValue</code>: the application supplies the id. Necessary for a UUID generated client-side, and it changes how Hibernate decides whether a row is new.</p>' }
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The sequence form, with allocation',
                    code: '@Entity\nclass Invoice {\n\n    @Id\n    @GeneratedValue(strategy = GenerationType.SEQUENCE,\n                    generator = "invoice_seq")\n    @SequenceGenerator(name = "invoice_seq",\n                       sequenceName = "invoice_seq",\n                       allocationSize = 50)     // must MATCH the sequence\n    private Long id;\n}\n\n// The database side has to agree:\n//   CREATE SEQUENCE invoice_seq INCREMENT BY 50;\n//\n// allocationSize = 50 with INCREMENT BY 1 hands out ids that another\n// session will also hand out. Duplicate key violations, intermittently.',
                    output: {
                        kind: 'trace',
                        lines: [
                            'With allocationSize = 50, Hibernate reads the sequence once and then issues 50 ids from memory before reading again.',
                            'That is one round trip per fifty inserts instead of fifty, which matters in a bulk import and is invisible otherwise.',
                            'The two numbers must agree. If the sequence increments by 1 and Hibernate believes it may use 50, two application instances will allocate overlapping ranges.',
                            'The resulting duplicate-key failures are intermittent and load-dependent, which makes them expensive to diagnose relative to the size of the mistake.'
                        ],
                        explain: '<p>Gaps in the id sequence are normal and not a bug — an allocation range is lost whenever an instance restarts, and a rolled-back transaction never returns its id. Any requirement for gapless numbering (an invoice number, for regulatory reasons) is a separate concern that must not use the primary key.</p>'
                    }
                },
                {
                    type: 'pitfall',
                    html: '<p><strong><code>IDENTITY</code> silently disables JDBC batching for inserts</strong>, and <code>spring.jpa.properties.hibernate.jdbc.batch_size</code> will appear to have no effect. Hibernate must know the id to put the entity in the persistence context, and only the insert can tell it — so each <code>persist()</code> is its own statement. On a batch job inserting fifty thousand rows this is the difference between seconds and minutes, and nothing reports it.</p>'
                }
            ],
            docs: [
                { title: 'Hibernate — Identifiers', url: 'https://docs.hibernate.org/orm/current/userguide/html_single/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'jpa-hibernate', questionId: 'id-generation-strategies' }
            ]
        },

        {
            id: 'onetomany-and-manytoone',
            title: '@OneToMany and @ManyToOne',
            importance: 'must-know',
            summary: 'The many side holds the foreign key, so it is the natural owner. Mapping the one side without mappedBy produces a join table nobody asked for.',
            interviewAngle: 'Asked constantly, and the checkable detail is what a unidirectional @OneToMany without mappedBy actually generates. It is a join table, and almost nobody expects it.',
            buildsOn: ['entity-basics-and-id-generation'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The correct bidirectional shape',
                    code: '@Entity\nclass Order {\n    @Id @GeneratedValue Long id;\n\n    // mappedBy names the FIELD on the other side that owns the FK.\n    // Without it, Hibernate creates a JOIN TABLE.\n    @OneToMany(mappedBy = "order",\n               cascade = CascadeType.ALL,\n               orphanRemoval = true)\n    private List<LineItem> lines = new ArrayList<>();\n\n    // Both sides, in one place, so a caller cannot set only one.\n    void addLine(LineItem line) {\n        lines.add(line);\n        line.setOrder(this);\n    }\n}\n\n@Entity\nclass LineItem {\n    @Id @GeneratedValue Long id;\n\n    @ManyToOne(fetch = FetchType.LAZY)   // ALWAYS. The default is EAGER.\n    @JoinColumn(name = "order_id")       // the owning side: it has the FK\n    private Order order;\n}',
                    notes: '<p>The helper method is not tidiness. Hibernate writes the database from the <strong>owning</strong> side, so adding to <code>lines</code> without setting <code>line.order</code> persists a line with a null foreign key — the in-memory graph looks right and the database disagrees.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong><code>@ManyToOne</code> and <code>@OneToOne</code> default to <code>EAGER</code>.</strong> That default is in the JPA specification, and it means loading one <code>LineItem</code> also loads its <code>Order</code>, which loads whatever that eagerly references. Loading a hundred line items issues a hundred extra queries — the N+1 problem arriving without anyone writing a loop. Put <code>fetch = FetchType.LAZY</code> on every one; the collection annotations already default to lazy.</p>'
                }
            ],
            docs: [
                { title: 'Hibernate — Associations', url: 'https://docs.hibernate.org/orm/current/userguide/html_single/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'jpa-hibernate', questionId: 'bidirectional-relationships' }
            ]
        },

        {
            id: 'owning-side',
            title: 'The Owning Side',
            importance: 'must-know',
            summary: 'One side of an association writes the foreign key and the other is a mirror. Changing only the mirror changes nothing in the database.',
            interviewAngle: 'The concept that explains a whole family of "my change did not save" bugs. Being able to say that mappedBy marks the non-owning side, and that Hibernate ignores it when writing, is the answer.',
            buildsOn: ['onetomany-and-manytoone'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>A foreign key exists once, in one column, on one table. Two Java fields point at each other across that one column, so JPA must decide which of them it believes when they disagree. The one <em>without</em> <code>mappedBy</code> is the <strong>owning side</strong>, and it is the only one consulted at flush.</p><p>Everything follows from that. On a <code>@OneToMany</code>/<code>@ManyToOne</code> pair the many side owns it, because that is where the column lives. On a <code>@OneToOne</code>, whichever side carries <code>@JoinColumn</code> owns it. And on a <code>@ManyToMany</code>, whichever side lacks <code>mappedBy</code> owns the join table.</p>'
                },
                {
                    type: 'types',
                    title: 'What goes wrong when only one side is set',
                    items: [
                        { name: 'Only the mirror set', html: '<p><code>order.getLines().add(line)</code> and nothing else. Without cascade, nothing persists; with cascade, the line is inserted with a <strong>null foreign key</strong>, or the insert fails on a not-null constraint.</p>' },
                        { name: 'Only the owner set', html: '<p><code>line.setOrder(order)</code> alone. The database is <em>correct</em> — and the in-memory <code>order.lines</code> does not contain the line, so any code reading it in this transaction sees the old collection.</p>' },
                        { name: 'Removed from the mirror only', html: '<p>The line vanishes from the collection and stays in the database. It reappears on the next load, which reads as a caching bug and is not.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>The rule that avoids all three: <strong>always set both sides, and do it in one helper method on the parent.</strong> A team convention to never touch the collection directly is what makes it hold. The second-order benefit is that the helper is the obvious place for the invariant — a line always has an order — which is the object-contract argument from the Java track applied here.</p>'
                }
            ],
            docs: [
                { title: 'Hibernate — Bidirectional Associations', url: 'https://docs.hibernate.org/orm/current/userguide/html_single/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'jpa-hibernate', questionId: 'bidirectional-relationships' }
            ]
        },

        {
            id: 'manytomany-and-why-to-avoid-it',
            title: '@ManyToMany, and Why to Map the Join Table',
            importance: 'should-know',
            summary: 'It works until the relationship needs an attribute of its own, and relationships almost always eventually do.',
            interviewAngle: 'A design question. The answer that shows experience is that the join table becomes an entity the first time someone asks when a user was assigned a role — which is a question that always gets asked.',
            buildsOn: ['owning-side'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'Two ways to model the same relationship',
                    left: '@ManyToMany',
                    right: 'An explicit join entity',
                    rows: [
                        { aspect: 'Java', left: 'Two collections and one annotation', right: 'A third entity with two <code>@ManyToOne</code>s' },
                        { aspect: 'Attributes on the relationship', left: '<strong>Impossible</strong>', right: 'Ordinary fields' },
                        { aspect: 'Adding one link', left: 'Hibernate may <strong>delete and reinsert every row</strong> for that owner', right: 'One insert' },
                        { aspect: 'Auditing when it was created', left: 'No', right: 'Yes' },
                        { aspect: 'Soft delete on the link', left: 'No', right: 'Yes' },
                        { aspect: 'Migration cost later', left: 'A schema and code change under load', right: 'Already done' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Adding one element to a <code>@ManyToMany</code> mapped as a <code>List</code> can delete and reinsert every row for that owner.</strong> Hibernate cannot identify a row in an unordered bag by position, so its recovery is to clear the owner\'s rows and write them all back. A user with two hundred roles gaining one becomes two hundred and one statements. Mapping the collection as a <code>Set</code> avoids it — and mapping the join table as an entity avoids the whole category.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Say the prediction rather than the rule: <em>"I would map the join table as an entity from the start. Every many-to-many I have seen eventually needed a column on the relationship — when it was granted, by whom, when it expires — and adding that later means changing the schema and the mapping under production load rather than before the first row exists."</em></p>'
                }
            ],
            docs: [
                { title: 'Hibernate — Collections', url: 'https://docs.hibernate.org/orm/current/userguide/html_single/', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'cascade-types',
            title: 'Cascades',
            importance: 'must-know',
            summary: 'Six operations that can propagate along an association. ALL and REMOVE are the two that delete data you did not mean to delete.',
            interviewAngle: 'Asked directly, and the judgement half is which associations should cascade at all — the answer is aggregate children only, never a reference to something with an independent lifecycle.',
            buildsOn: ['owning-side'],
            blocks: [
                {
                    type: 'table',
                    title: 'The cascade types',
                    headers: ['Type', 'Propagates', 'Safe on'],
                    rows: [
                        ['<code>PERSIST</code>', 'Saving the parent saves the children', 'Aggregate children'],
                        ['<code>MERGE</code>', 'Reattaching propagates', 'Aggregate children'],
                        ['<code>REMOVE</code>', '<strong>Deleting the parent deletes the children</strong>', '<strong>Only</strong> children that cannot exist alone'],
                        ['<code>REFRESH</code>', 'Reloading propagates', 'Usually harmless'],
                        ['<code>DETACH</code>', 'Detaching propagates', 'Usually harmless'],
                        ['<code>ALL</code>', 'All five, <code>REMOVE</code> included', 'A true composition, and nothing else']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong><code>CascadeType.ALL</code> on a <code>@ManyToOne</code> is a way to delete shared data.</strong> Putting it on <code>LineItem.product</code> means deleting a line item deletes the product — which other line items reference. It is written by accident, because <code>ALL</code> looks like a sensible default and the annotation reads the same on both sides of a relationship. Cascade flows from parent to child, so cascading from the many side to the one side is almost always backwards.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The test to apply: <strong>does the child have any meaning without this parent?</strong> A line item without its order does not, so cascade. A product without a line item plainly does, so do not. That is the aggregate-root idea from domain-driven design, and it decides every cascade question without needing to reason about the annotations.</p>'
                }
            ],
            docs: [
                { title: 'Hibernate — Cascading', url: 'https://docs.hibernate.org/orm/current/userguide/html_single/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'jpa-hibernate', questionId: 'cascade-types' }
            ]
        },

        {
            id: 'orphan-removal',
            title: 'orphanRemoval Against CascadeType.REMOVE',
            importance: 'should-know',
            summary: 'Both delete children. One triggers when the parent is deleted, the other when the child is removed from the collection.',
            interviewAngle: 'A precise question with a precise answer, and the distinction is genuinely useful: orphanRemoval is what makes a collection behave like a composition rather than a reference list.',
            buildsOn: ['cascade-types'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'The two, side by side',
                    left: 'CascadeType.REMOVE',
                    right: 'orphanRemoval = true',
                    rows: [
                        { aspect: 'Fires when', left: 'The <strong>parent</strong> is deleted', right: 'The child leaves the collection' },
                        { aspect: 'order.getLines().remove(line)', left: 'Nothing. The row stays', right: '<strong>The row is deleted</strong>' },
                        { aspect: 'em.remove(order)', left: 'Children deleted', right: 'Children deleted' },
                        { aspect: 'Says', left: '"Deleting me deletes them"', right: '"They cannot exist outside me"' },
                        { aspect: 'Use', left: 'A parent-child link', right: '<strong>A true composition</strong>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong><code>orphanRemoval</code> plus reassigning a child to a different parent deletes it.</strong> Removing a line from one order to add it to another looks like a move and is a delete followed by an insert — or, if the flush order goes the other way, a delete of a row the new parent now references. Reassignment and orphan removal express contradictory intents: if children can move, they are not orphans.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Neither of these is a database <code>ON DELETE CASCADE</code>, and the distinction matters operationally. JPA cascades are performed by Hibernate, one <code>DELETE</code> per child, in Java — so a parent with ten thousand children is ten thousand statements. A database-level cascade is one statement and the ORM knows nothing about it, which means entities in the persistence context can be stale afterwards. Choosing between them is a real decision.</p>'
                }
            ],
            docs: [
                { title: 'Hibernate — Orphan Removal', url: 'https://docs.hibernate.org/orm/current/userguide/html_single/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'jpa-hibernate', questionId: 'cascade-types' }
            ]
        },

        {
            id: 'embeddables-and-value-types',
            title: 'Embeddables',
            importance: 'good-to-know',
            summary: 'A group of columns with no identity of its own, mapped as an object. It is the schema-level expression of a value type.',
            interviewAngle: 'A modelling question. The point worth making is that an embeddable has no id and therefore no lifecycle — which is exactly what distinguishes a value from an entity, and connects to the object-contract module.',
            buildsOn: ['entity-basics-and-id-generation'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'A value type, in the schema and in Java',
                    code: '@Embeddable\nrecord Money(\n        @Column(name = "amount",   nullable = false) BigDecimal amount,\n        @Column(name = "currency", nullable = false) String currency) {\n}\n\n@Entity\nclass Invoice {\n    @Id @GeneratedValue Long id;\n\n    @Embedded\n    private Money total;               // two columns on the invoice table\n\n    @Embedded\n    @AttributeOverride(name = "amount",   column = @Column(name = "tax_amount"))\n    @AttributeOverride(name = "currency", column = @Column(name = "tax_currency"))\n    private Money tax;                 // the same type, different columns\n}',
                    notes: '<p>No table, no id, no lifecycle: the columns live on <code>invoice</code>, and the object exists only in Java. Records are supported as embeddables from Hibernate 6.2, which makes the immutability of a value type expressible rather than merely intended.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The connection worth naming: an embeddable is compared by <strong>value</strong> and an entity by <strong>identity</strong>, which is exactly the distinction the objects-and-contracts module drew. That is also why the equals question in the next chapter is hard for entities and trivial for embeddables — a value type\'s equals is the ordinary one.</p>'
                }
            ],
            docs: [
                { title: 'Hibernate — Embeddable Types', url: 'https://docs.hibernate.org/orm/current/userguide/html_single/', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'inheritance-strategies',
            title: 'Inheritance',
            importance: 'should-know',
            summary: 'Three strategies, and the trade is between nullable columns, join count and query cost. SINGLE_TABLE is the default and is usually right.',
            interviewAngle: 'Asked as a comparison. The detail that lands is that SINGLE_TABLE cannot enforce NOT NULL on any subclass column, which is a real correctness cost paid for query speed.',
            buildsOn: ['embeddables-and-value-types'],
            blocks: [
                {
                    type: 'table',
                    title: 'The three',
                    headers: ['Strategy', 'Schema', 'Query cost', 'The cost'],
                    rows: [
                        ['<code>SINGLE_TABLE</code>', 'One table, a discriminator column', '<strong>Fastest</strong> — no joins', '<strong>Every subclass column must be nullable</strong>'],
                        ['<code>JOINED</code>', 'A table per class, joined by id', 'A join per level', 'Normalised, and slower to read'],
                        ['<code>TABLE_PER_CLASS</code>', 'A table per concrete class, columns repeated', 'A polymorphic query is a <code>UNION</code>', 'No shared id sequence; queries across the hierarchy are expensive']
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>The trade is direct. <code>SINGLE_TABLE</code> answers a polymorphic query with one table scan and no join, which is why it is the default — and every column belonging to a subclass has to accept null, because rows of the other subclasses have nothing to put there. So a field that is mandatory in the domain cannot be mandatory in the schema, and the constraint has to be enforced by Bean Validation instead, which is enforcement against the application rather than against the data.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The question worth asking before choosing: <strong>is this inheritance or is it a state machine?</strong> Three subclasses that differ only by a status column are usually a status column. Real polymorphism — different fields, different behaviour, queried together — is what these strategies are for, and it is less common in a schema than in a class diagram.</p>'
                }
            ],
            docs: [
                { title: 'Hibernate — Inheritance', url: 'https://docs.hibernate.org/orm/current/userguide/html_single/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'jpa-hibernate', questionId: 'inheritance-strategies' }
            ]
        },

        {
            id: 'entity-equals-and-hashcode',
            title: 'equals and hashCode for an Entity',
            importance: 'must-know',
            summary: 'The generated id is null before the insert and set after it, so equality based on it changes while the object is in a HashSet. This is the one case where the object contract and the persistence lifecycle disagree.',
            interviewAngle: 'A genuinely hard question that separates people who have used JPA from people who have read about it. There is no answer without a trade-off, and knowing the recommended one — a business key, or an assigned UUID — is the point.',
            buildsOn: ['inheritance-strategies'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Why the obvious implementation breaks',
                    code: '@Entity\nclass Invoice {\n    @Id @GeneratedValue Long id;\n\n    @Override public boolean equals(Object o) { ... compares id ... }\n    @Override public int hashCode() { return Objects.hash(id); }\n}\n\nvar invoice = new Invoice();          // id is null\nSet<Invoice> set = new HashSet<>();\nset.add(invoice);                     // bucketed on hash(null)\n\nem.persist(invoice);                  // id becomes 8827\nem.flush();\n\nset.contains(invoice);                // FALSE. It is in the set.',
                    output: {
                        kind: 'trace',
                        lines: [
                            'HashSet places an element in a bucket derived from its hash code at the moment it is added.',
                            'Persisting assigns the id, which changes the hash code, which changes which bucket the object WOULD go in.',
                            'contains() looks in the new bucket and does not find it. The object is still in the set, in the old bucket, unreachable.',
                            'This is the objects-and-contracts rule -- a hash code must not change while the object is in a hash-based collection -- and JPA breaks it by design, because the id is assigned by the database.'
                        ],
                        explain: '<p>It is not a corner case: a bidirectional <code>@OneToMany</code> mapped as a <code>Set</code> puts every child in exactly this position — added to the collection before the flush that gives it an id.</p>'
                    }
                },
                {
                    type: 'types',
                    title: 'The options, and what each one costs',
                    items: [
                        { name: 'A business key', html: '<p>An immutable natural attribute — an invoice number, an ISBN. <strong>The specification\'s own recommendation</strong>, and it needs a genuinely immutable and always-present attribute, which many entities do not have.</p>' },
                        { name: 'An assigned UUID', html: '<p>Generate the id in the constructor rather than at insert. It never changes and never is null, so the whole problem disappears — at the cost of the UUID index behaviour from the modelling module, which UUIDv7 largely addresses.</p>' },
                        { name: 'A constant hashCode', html: '<p><code>return 31;</code>, with <code>equals</code> on the id. Stable, correct, and it degrades every <code>HashSet</code> to a linked list. Defensible when collections are small, and it looks like a mistake to every reviewer.</p>' },
                        { name: 'Do not override at all', html: '<p>Identity semantics. Correct within one persistence context, since it guarantees one instance per row — and wrong the moment two detached instances of the same row are compared.</p>' },
                        { name: 'The Lombok default', html: '<p><code>@EqualsAndHashCode</code> over all fields. <strong>Actively harmful:</strong> it touches lazy associations, triggering loads, and it changes as the entity is mutated.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>The answer that demonstrates the depth: <em>"There is no clean answer, because a generated id is null before the flush and set afterwards, and a hash code must not change while the object is in a set. I would assign a UUID in the constructor so the identity exists from birth. Failing that, a business key. And I would never generate equals over all fields, because on a lazy association that triggers a load."</em></p>'
                }
            ],
            docs: [
                { title: 'Hibernate — Equals and HashCode', url: 'https://docs.hibernate.org/orm/current/userguide/html_single/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'jpa-hibernate', questionId: 'entity-equals-hashcode' }
            ]
        }
    ]
};
