/* ==========================================================================
   data/theory/ddd-tactical.js — module 63 in the reading path

   The craft track's fourth module, and section 5.8 places it here rather
   than with the other craft modules for a stated reason: DDD only makes
   sense once you have felt the problem it solves. Immediately after
   service-boundaries is exactly that moment — the previous module ended by
   saying a service boundary should be a bounded context, and this one says
   what that means.

   Nine chapters, and the plan's tagline sets the register: bounded contexts
   and aggregates as DECOMPOSITION TOOLS rather than jargon. So the strategic
   half comes first and the tactical patterns are presented as consequences,
   and the module closes on doing it without the ceremony — because most
   teams that adopt DDD adopt the folder structure and not the thinking.
   ========================================================================== */

const ddaTacticalModule = {
    id: 'ddd-tactical',
    trackId: 'craft',
    order: 63,
    title: 'Domain-Driven Design, Tactically',
    tagline: 'Bounded contexts and aggregates, as decomposition tools rather than jargon.',
    estimatedMinutes: 45,
    prerequisites: ['application-architecture', 'service-boundaries'],
    docHub: { title: 'Domain Driven Design', url: 'https://martinfowler.com/tags/domain%20driven%20design.html' },

    chapters: [
        {
            id: 'ubiquitous-language',
            title: 'Ubiquitous Language',
            importance: 'must-know',
            summary: 'One vocabulary shared by the code and the people who understand the business. If the domain expert says "consignment" and the class is called OrderBatch, every conversation costs a translation.',
            interviewAngle: 'Sounds soft and is the most practically useful idea in DDD. The translation cost is real, and it is where requirements are misunderstood.',
            buildsOn: [],
            blocks: [
                {
                    type: 'definition',
                    term: 'Ubiquitous language',
                    html: '<p>A vocabulary agreed between engineers and domain experts, used <strong>unchanged</strong> in conversation, in documentation and in code. Not a glossary that maps business terms to technical ones — the same words, in both places, with the same meanings.</p>'
                },
                {
                    type: 'prose',
                    html: '<p>Every mismatch between the words a business uses and the words in the code is a translation somebody performs in their head, every time, and translation is where meaning is lost. When the domain expert says "a consignment can be short-shipped" and the engineer hears "an <code>OrderBatch</code> can have <code>partialFulfilment = true</code>", the two of them have had a conversation that neither can verify.</p><p>The practical consequence is a rule: <strong>if a term appears in a requirement and not in the code, one of them is wrong.</strong> Either the business word should be adopted, or the business is using a word for something that does not exist in the model — and finding out which is usually the most valuable half-hour in a design discussion.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The cheapest test in this module: read a method name aloud to a domain expert and see whether they recognise it. <code>order.applyPartialFulfilment(lines)</code> gets a blank look; <code>consignment.shortShip(lines)</code> gets a correction, and a correction is information you did not have. It costs one conversation and it is the mechanism by which the language stays shared rather than diverging quietly.</p>'
                }
            ],
            docs: [
                { title: 'UbiquitousLanguage', url: 'https://martinfowler.com/bliki/UbiquitousLanguage.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'architecture-ddd', questionId: 'ubiquitous-language' }
            ]
        },

        {
            id: 'bounded-context',
            title: 'Bounded Context',
            importance: 'must-know',
            summary: 'A boundary within which one model and one language apply. The same word means different things on either side, and trying to unify them produces a model that serves nobody.',
            interviewAngle: 'The most important strategic idea in DDD, and the direct answer to "how do you decide service boundaries". The customer-means-four-things example is the one that lands.',
            buildsOn: ['ubiquitous-language'],
            blocks: [
                {
                    type: 'table',
                    title: 'One word, four models',
                    headers: ['Context', 'What "customer" means', 'What it needs'],
                    rows: [
                        ['Sales', 'A prospect with a pipeline stage', 'Contact history, opportunity value, owner'],
                        ['Billing', 'A legal entity with a tax status', 'Registered address, VAT number, payment terms'],
                        ['Shipping', 'A delivery destination', 'Address, access instructions, time window'],
                        ['Support', 'A person with entitlements', 'Contact preference, plan, open tickets']
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>The instinct is to build one <code>Customer</code> class with the union of those fields. It produces a class with forty attributes of which each caller uses four, an <code>equals</code> that nobody can define, and a change requested by the shipping team that has to be reviewed by billing.</p><p>A <strong>bounded context</strong> says: stop. Each area has its own <code>Customer</code>, modelling exactly what it needs, and they are related by an identifier rather than by a shared class. The models are allowed to disagree, because they are answering different questions.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A shared "common model" library is a bounded context violation with a build system behind it.</strong> Once <code>common-model</code> holds <code>Customer</code>, every context depends on it, every change to it is a coordinated release, and the class grows to the union of everyone\'s needs — which is precisely the outcome the contexts existed to prevent. A shared library is fine for a <code>Money</code> or a correlation id; it is not a place for domain concepts.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The connection back to the previous module: <strong>a bounded context is the correct unit for a service boundary.</strong> It is defined by where the meaning of words changes, which is a property of the business rather than of the current org chart or the current traffic — so boundaries drawn there stay put through both a reorganisation and a rewrite.</p>'
                }
            ],
            docs: [
                { title: 'BoundedContext', url: 'https://martinfowler.com/bliki/BoundedContext.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'architecture-ddd', questionId: 'bounded-context' },
                { topicId: 'microservices', questionId: 'when-to-split-a-monolith' }
            ]
        },

        {
            id: 'context-mapping',
            title: 'How Contexts Relate',
            importance: 'should-know',
            summary: 'Named relationship patterns, and each one is a statement about power as much as about integration — who has to change when the other side does.',
            interviewAngle: 'A depth topic. Anti-corruption layer is the one to know by name, because it is the concrete technique for not letting a legacy or vendor model spread.',
            buildsOn: ['bounded-context'],
            blocks: [
                {
                    type: 'types',
                    title: 'The patterns worth knowing',
                    items: [
                        { name: 'Shared kernel', html: '<p>Two contexts share a small model, by agreement. Requires coordination on every change, so keep it tiny or not at all.</p>' },
                        { name: 'Customer / supplier', html: '<p>Downstream depends on upstream, and upstream <em>takes their needs into account</em>. A negotiated relationship, which requires the political capital to negotiate.</p>' },
                        { name: 'Conformist', html: '<p>Downstream simply adopts upstream\'s model. Cheap, and it lets a foreign model into your code. Reasonable when the upstream model is good and you have no leverage.</p>' },
                        { name: 'Anti-corruption layer', html: '<p><strong>A translation layer at the boundary</strong> converting the foreign model into yours. Costs a mapper; keeps a vendor\'s or a legacy system\'s vocabulary out of your domain entirely. The default when integrating with something you do not control.</p>' },
                        { name: 'Open host service', html: '<p>Upstream publishes a well-defined protocol for all comers rather than negotiating per consumer. What a public API is.</p>' },
                        { name: 'Published language', html: '<p>A documented interchange format — a schema, an event contract — that both sides commit to. Usually paired with an open host service.</p>' },
                        { name: 'Separate ways', html: '<p>No integration at all. Occasionally the right answer, and the one nobody proposes.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>The anti-corruption layer is the adapter pattern from the craft track, promoted to an architectural decision. The reason to name it separately is that it makes the cost explicit and defensible: yes, there is a mapper; the mapper is what stops the legacy system\'s idea of a "customer record" appearing in forty files of new code, and it is the thing that makes replacing the legacy system a bounded piece of work.</p>'
                }
            ],
            docs: [
                { title: 'Domain Driven Design', url: 'https://martinfowler.com/tags/domain%20driven%20design.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'design-patterns', questionId: 'decorator-proxy-adapter' }
            ]
        },

        {
            id: 'entity-vs-value-object',
            title: 'Entity Against Value Object',
            importance: 'must-know',
            summary: 'An entity has identity that persists through change. A value object is defined entirely by its attributes and should be immutable. Most codebases have far too few value objects.',
            interviewAngle: 'The rule is easy and the application is the signal: a codebase full of String and BigDecimal parameters is one where the value objects were never extracted.',
            buildsOn: ['context-mapping'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'The distinction',
                    left: 'Entity',
                    right: 'Value object',
                    rows: [
                        { aspect: 'Identity', left: 'An id, stable through every change', right: 'None — it <em>is</em> its attributes' },
                        { aspect: 'Equality', left: 'Same id, same entity', right: 'All attributes equal' },
                        { aspect: 'Mutability', left: 'Changes over its lifetime', right: '<strong>Immutable.</strong> A change produces a new one.' },
                        { aspect: 'Examples', left: 'Order, Customer, ParkingSpot', right: 'Money, Address, DateRange, EmailAddress' },
                        { aspect: 'In Java', left: 'A class with an id and behaviour', right: '<strong>A record</strong>' },
                        { aspect: 'Lifecycle', left: 'Created, changed, archived', right: 'Created and discarded freely' }
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'What extracting a value object buys',
                    code: '// Primitive obsession: nothing here is checked, and the arguments can\n// be swapped without the compiler noticing.\nvoid transfer(String from, String to, BigDecimal amount, String currency);\n\n// Value objects: the rules live in the type, once.\nrecord Money(BigDecimal amount, Currency currency) {\n    Money {\n        if (amount.scale() > currency.getDefaultFractionDigits())\n            throw new IllegalArgumentException("too many decimal places");\n    }\n    Money plus(Money other) {\n        if (!currency.equals(other.currency))\n            throw new CurrencyMismatch(currency, other.currency);   // <-- caught here\n        return new Money(amount.add(other.amount), currency);\n    }\n}\n\nrecord AccountNumber(String value) {\n    AccountNumber {\n        if (!value.matches("[0-9]{8}"))\n            throw new IllegalArgumentException("account number");\n    }\n}\n\nvoid transfer(AccountNumber from, AccountNumber to, Money amount);\n// Swapping `from` and `to` is still possible; passing an amount where\n// an account number belongs is not, and neither is adding rupees to\n// dollars anywhere in the codebase.',
                    notes: '<p>The currency-mismatch check is the argument in miniature. Written as a value object it exists once and every addition anywhere is protected. Written as <code>BigDecimal</code> plus a <code>String</code>, it has to be remembered at every call site — and the one place it is forgotten is a financial defect that nothing detects.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Records made value objects nearly free in Java: immutable, with <code>equals</code>, <code>hashCode</code> and <code>toString</code> generated, and a compact constructor that is the natural home for validation. The old objection — "that is a lot of boilerplate for a wrapper" — no longer applies, which is a good reason to revisit a codebase that decided against them before Java 16.</p>'
                }
            ],
            docs: [
                { title: 'ValueObject', url: 'https://martinfowler.com/bliki/ValueObject.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'architecture-ddd', questionId: 'entity-versus-value-object' },
                { topicId: 'java-language', questionId: 'records-what-they-give-you' }
            ]
        },

        {
            id: 'aggregate-and-aggregate-root',
            title: 'Aggregate and Aggregate Root',
            importance: 'must-know',
            summary: 'A cluster of objects treated as one unit for changes, with a single entry point. Everything outside references the root, and only the root enforces the invariants.',
            interviewAngle: 'The tactical pattern most often misunderstood as "a big object". The point is the consistency boundary, and the next chapter is what makes that concrete.',
            buildsOn: ['entity-vs-value-object'],
            blocks: [
                {
                    type: 'definition',
                    term: 'Aggregate',
                    html: '<p>A cluster of entities and value objects treated as a single unit for data changes, with one entity designated the <strong>aggregate root</strong>. External references point only at the root; the root is responsible for the invariants that span the cluster.</p>'
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The root as the only door',
                    code: 'class Order {                       // the AGGREGATE ROOT\n\n    private final OrderId id;\n    private final List<OrderLine> lines = new ArrayList<>();   // inside\n    private Status status;\n    private Money total;\n\n    // No setter for lines, and no getter returning the mutable list.\n    public List<OrderLine> lines() { return List.copyOf(lines); }\n\n    // Every change goes through a method on the ROOT, so the invariant\n    // -- total equals the sum of the lines, at most 100 lines, no\n    // changes after confirmation -- holds after every operation.\n    public void addLine(Sku sku, int quantity, Money unitPrice) {\n        if (status != DRAFT)      throw new OrderNotEditable(id, status);\n        if (lines.size() >= 100)  throw new TooManyLines(id);\n        lines.add(new OrderLine(sku, quantity, unitPrice));\n        this.total = recalculate();\n    }\n\n    public void confirm() {\n        if (lines.isEmpty()) throw new EmptyOrder(id);\n        this.status = CONFIRMED;\n    }\n}\n\n// OrderLine is INSIDE the aggregate. Nothing outside holds a reference\n// to one, nothing loads one on its own, and there is no LineRepository.',
                    notes: '<p>The absence of a <code>LineRepository</code> is not an omission; it is the pattern. One repository per aggregate, keyed by the root, because loading a line without its order means loading something whose invariants cannot be checked. A repository per entity is the commonest sign that aggregates were not identified at all.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Referencing another aggregate by object rather than by id is how aggregates merge by accident.</strong> An <code>Order</code> holding a <code>Customer</code> object rather than a <code>CustomerId</code> means loading an order loads a customer, changing either touches both, and the transaction now spans two consistency boundaries. Reference other aggregates <strong>by identity</strong>; the next chapter is why that rule is stronger than it looks.</p>'
                }
            ],
            docs: [
                { title: 'DDD_Aggregate', url: 'https://martinfowler.com/bliki/DDD_Aggregate.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'architecture-ddd', questionId: 'aggregate-and-aggregate-root' }
            ]
        },

        {
            id: 'aggregate-boundaries-and-transactions',
            title: 'One Aggregate, One Transaction',
            importance: 'must-know',
            summary: 'The rule that makes aggregates useful: a transaction modifies exactly one aggregate. Everything else is updated afterwards, eventually, by an event.',
            interviewAngle: 'This is the rule that makes DDD a distributed-systems tool rather than a modelling style, and it is the bridge to sagas later in the track.',
            buildsOn: ['aggregate-and-aggregate-root'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>An aggregate is a <strong>consistency boundary</strong>: inside it, invariants are enforced immediately and atomically. Between aggregates, consistency is <em>eventual</em>. From that follow two design rules that do most of the work in practice.</p><ul><li><strong>One transaction modifies one aggregate.</strong> If two must change, the second changes in a later transaction, triggered by an event.</li><li><strong>Reference other aggregates by id.</strong> Holding the object makes it far too easy to modify it in the same transaction and merge the boundaries without noticing.</li></ul><p>The payoff is that aggregate boundaries become the natural seams for a future service split, because a boundary that already tolerates eventual consistency is one a network can be inserted into.</p>'
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Two aggregates, two transactions',
                    code: '// WRONG: one transaction, two aggregates. It works in a monolith,\n// it makes the two inseparable, and it cannot survive a split.\n@Transactional\nvoid placeOrder(Cart cart) {\n    Order order = orders.save(Order.from(cart));\n    Inventory inv = inventories.byId(cart.warehouse());\n    inv.reserve(cart.lines());              // a SECOND aggregate\n    inventories.save(inv);\n}\n\n// RIGHT: this transaction changes the order. The reservation happens\n// in its own transaction, after commit, driven by an event.\n@Transactional\nvoid placeOrder(Cart cart) {\n    Order order = orders.save(Order.from(cart));\n    events.publishEvent(new OrderPlaced(order.id(), cart.lines()));\n}\n\n@TransactionalEventListener(phase = AFTER_COMMIT)\n@Transactional(propagation = REQUIRES_NEW)\nvoid reserve(OrderPlaced event) {\n    Inventory inv = inventories.byId(event.warehouse());\n    inv.reserve(event.lines());             // its own transaction\n    inventories.save(inv);\n}\n\n// And the consequence that must be designed for: reservation can FAIL\n// after the order is committed. That is a saga, and it needs a\n// compensating action -- cancel the order, or mark it unfulfillable.',
                    notes: '<p>The comment at the bottom is the honest part. Splitting the transaction does not remove the problem, it makes it visible: there is now a window in which an order exists with no reservation, and the design has to say what happens there. A single transaction hid that question rather than answering it, and hid it only for as long as both aggregates lived in one database.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The sizing rule that falls out: <strong>make aggregates as small as the invariants allow.</strong> A large aggregate means a large lock, more contention and more of the model loaded per operation; a small one means more eventual consistency to design. The question to ask is "what must be true at every instant" — only those things belong in one aggregate, and "the total matches the lines" usually does while "the customer\'s credit limit is respected" usually does not.</p>'
                }
            ],
            docs: [
                { title: 'DDD_Aggregate', url: 'https://martinfowler.com/bliki/DDD_Aggregate.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'architecture-ddd', questionId: 'aggregate-and-aggregate-root' },
                { topicId: 'transactions', questionId: 'transaction-boundaries' }
            ]
        },

        {
            id: 'repositories-and-factories',
            title: 'Repositories and Factories',
            importance: 'should-know',
            summary: 'A repository is a collection-like interface for aggregate roots, expressed in the domain language. One per aggregate, never one per table.',
            interviewAngle: 'The point that matters is the granularity rule and the fact that a Spring Data repository per entity quietly abandons it.',
            buildsOn: ['aggregate-boundaries-and-transactions'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'A domain repository, and the adapter behind it',
                    code: '// The PORT, in the domain, in the domain is language. Note that it\n// deals in whole aggregates and returns domain types.\npublic interface Orders {\n    Optional<Order> byId(OrderId id);\n    List<Order>     awaitingFulfilment(WarehouseId warehouse);\n    void            save(Order order);\n}\n\n// The ADAPTER, in the infrastructure package. Spring Data lives HERE,\n// not in the domain, and it maps entities to domain objects.\n@Repository\nclass JpaOrders implements Orders {\n\n    private final OrderJpaRepository jpa;      // Spring Data, over entities\n\n    public Optional<Order> byId(OrderId id) {\n        return jpa.findWithLinesById(id.value()).map(OrderMapper::toDomain);\n    }\n\n    public List<Order> awaitingFulfilment(WarehouseId warehouse) {\n        return jpa.findByStatusAndWarehouseId(CONFIRMED, warehouse.value())\n                .stream().map(OrderMapper::toDomain).toList();\n    }\n}\n\n// A FACTORY is for construction that is too complex for a constructor:\n// it enforces the invariants of a NEW aggregate. Often a static method\n// on the root -- Order.from(cart) -- rather than a separate class.',
                    notes: '<p>The method names are the tell. <code>awaitingFulfilment</code> is a domain concept; <code>findByStatusAndWarehouseId</code> is a query. The first belongs in the port because the domain thinks in those terms; the second is an implementation detail that happens to satisfy it, and keeping it on the far side of the interface is what makes the domain readable.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A Spring Data repository per JPA entity is one per <em>table</em>, not one per aggregate</strong> — which means <code>OrderLineRepository</code> exists, an order line can be loaded and saved without its order, and the aggregate\'s invariants can be bypassed by anyone who finds it. That is not an argument against Spring Data; it is an argument for keeping the generated repositories inside the infrastructure package and exposing one domain repository per root.</p>'
                }
            ],
            docs: [
                { title: 'Repository', url: 'https://martinfowler.com/eaaCatalog/repository.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'jpa-hibernate', questionId: 'derived-queries-and-their-limits' },
                { topicId: 'architecture-ddd', questionId: 'hexagonal-architecture' }
            ]
        },

        {
            id: 'domain-events',
            title: 'Domain Events',
            importance: 'must-know',
            summary: 'A record that something meaningful happened, named in the past tense and in the domain language. It is how one aggregate tells the rest of the system without depending on it.',
            interviewAngle: 'The mechanism that makes one-aggregate-per-transaction workable, and the bridge to the outbox and saga modules later in this track.',
            buildsOn: ['repositories-and-factories'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'What a good event looks like, and what a bad one looks like',
                    code: '// GOOD: past tense, domain language, immutable, carries what a\n// consumer needs, identifies the aggregate and the moment.\nrecord OrderConfirmed(OrderId orderId,\n                      CustomerId customerId,\n                      Money total,\n                      Instant occurredAt) { }\n\n// BAD: a command wearing an event is name. It tells one specific\n// consumer what to do, which re-couples the producer to it.\nrecord SendConfirmationEmail(String email, String orderId) { }\n\n// BAD: a state dump. Every consumer now depends on the whole entity,\n// and every field added to it is a contract change.\nrecord OrderChanged(Order order) { }\n\n// The two shapes, and the trade between them:\n//   THIN  -- OrderConfirmed(orderId, occurredAt)\n//            Small and stable; every consumer calls back for details,\n//            and may see a LATER state than the one that fired it.\n//   FAT   -- carries the fields consumers need\n//            No callback, no race; a wider contract to keep stable.\n// Carry what a consumer needs to ACT. Not the whole aggregate.',
                    notes: '<p>The thin-event race is worth understanding because it is subtle: a consumer that receives <code>OrderConfirmed(orderId)</code> and calls back to read the order may observe it already cancelled, and will then act on a state that is not the one the event described. A fat event carries the state as it was, which is often exactly what you want for something like a confirmation email.</p>'
                },
                {
                    type: 'types',
                    title: 'Where the event goes, and what each choice guarantees',
                    items: [
                        { name: 'In-process, after commit', html: '<p><code>@TransactionalEventListener(AFTER_COMMIT)</code>. Simple, and <strong>lost if the process dies between commit and handling</strong>.</p>' },
                        { name: 'Persisted in the same transaction', html: '<p>Spring Modulith\'s event publication table, or a hand-rolled outbox. Survives a crash, retried on startup.</p>' },
                        { name: 'Published to a broker', html: '<p>Crosses the process boundary — and introduces the dual-write problem, which the outbox module solves.</p>' },
                        { name: 'Stored as the source of truth', html: '<p>Event sourcing. A different architecture, and it has its own module.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>Name events for what happened in the business, not for what changed in the database. <code>OrderConfirmed</code> and <code>PaymentCaptured</code> are facts a domain expert recognises; <code>OrderStatusUpdated</code> is a row change with a domain word attached to it, and it forces every consumer to inspect the payload to find out whether it cares.</p>'
                }
            ],
            docs: [
                { title: 'DomainEvent', url: 'https://martinfowler.com/eaaDev/DomainEvent.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-core', questionId: 'context-events' },
                { topicId: 'microservices', questionId: 'transactional-outbox' }
            ]
        },

        {
            id: 'ddd-without-the-ceremony',
            title: 'Doing It Without the Ceremony',
            importance: 'should-know',
            summary: 'The strategic ideas are almost free and pay everywhere. The tactical patterns cost real structure and pay only where there are real invariants.',
            interviewAngle: 'The judgement chapter. Teams adopt the folder structure and not the thinking, and being able to say which parts you would take is worth more than knowing all of them.',
            buildsOn: ['domain-events'],
            blocks: [
                {
                    type: 'table',
                    title: 'What to take, and what to leave',
                    headers: ['Idea', 'Cost', 'Verdict'],
                    rows: [
                        ['Ubiquitous language', 'A conversation', '<strong>Always.</strong> The highest return in the module.'],
                        ['Bounded contexts', 'Some duplication between contexts', '<strong>Always</strong> once there is more than one team or one model'],
                        ['Value objects', 'A record each', '<strong>Almost always.</strong> Nearly free since records.'],
                        ['Aggregates with enforced invariants', 'Real structure; no setters', 'Where there are real invariants. A CRUD table has none.'],
                        ['One aggregate per transaction', 'Eventual consistency to design', 'Where a split is plausible, or contention is real'],
                        ['Domain repositories as ports', 'An interface and a mapper per aggregate', 'In a rich domain; overkill over a CRUD table'],
                        ['Domain events', 'An event contract to maintain', 'Where decoupling is wanted, or a boundary is coming'],
                        ['Full ports, adapters, use cases everywhere', 'Substantial, per change, forever', '<strong>Only in the complex context.</strong> Not uniformly.']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>The commonest failed adoption is the folder structure without the thinking.</strong> Packages named <code>domain</code>, <code>application</code> and <code>infrastructure</code>; entities that are still bags of setters; repositories per table; and services holding every rule. That is an anaemic model in a DDD costume — it has all of the layering cost and none of the invariant enforcement that was supposed to pay for it.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The position that survives follow-ups: <em>"I use the strategic parts everywhere — ubiquitous language and bounded contexts cost almost nothing and they decide where boundaries go. I use the tactical parts where there is a real domain: aggregates with enforced invariants, and one aggregate per transaction. For a context that stores feature flags I write a controller, a service and a repository, because there is no domain there to protect and the structure would be pure overhead."</em></p>'
                }
            ],
            docs: [
                { title: 'Domain Driven Design', url: 'https://martinfowler.com/tags/domain%20driven%20design.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'architecture-ddd', questionId: 'anaemic-domain-model' },
                { topicId: 'architecture-ddd', questionId: 'when-clean-architecture-is-overkill' }
            ]
        }
    ]
};
