/* ==========================================================================
   data/architecture-ddd.js — Application Architecture & DDD

   Three subsections on the `craft` track: how the code is arranged, the
   domain-driven vocabulary, and the read/write split.

   This topic is where the round-3 conversation turns into the round-4 one.
   The questions are chosen so that each has a cost as well as a benefit,
   because the failure mode in this area is not ignorance — it is a candidate
   who has read the books and will apply all of it to a CRUD service.

   ONE GLOBAL PER FILE.
   ========================================================================== */

const architectureDddData = {
    id: 'architecture-ddd',
    title: 'Application Architecture & DDD',
    subsections: [
        { id: 'structure', title: 'Structure & Layering' },
        { id: 'ddd',       title: 'Domain-Driven Design' },
        { id: 'cqrs',      title: 'CQRS & Event Sourcing' }
    ],
    keyTopics: [
        'package by layer vs package by feature', 'hexagonal architecture',
        'clean architecture', 'ports and adapters', 'DTO vs entity',
        'anemic domain model', 'bounded context', 'aggregate and aggregate root',
        'entity vs value object', 'ubiquitous language', 'CQRS', 'event sourcing',
        'read models and projections', 'when clean architecture is overkill'
    ],
    questions: [

/* ==== Structure & Layering ============================================ */

{
    id: 'package-by-layer-or-feature',
    importance: 'must-know',
    subsection: 'structure',
    question: 'Package by layer or package by feature?',
    answer:
        '<p><strong>By feature</strong>, and there is a concrete Java-specific reason that ' +
        'settles it beyond taste.</p>' +
        '<p>Package by layer — <code>controller</code>, <code>service</code>, ' +
        '<code>repository</code>, <code>model</code> — means every class in the application that ' +
        'anything else needs must be <code>public</code>, because its collaborators are in ' +
        'another package. <strong>You lose package-private entirely</strong>, so the language\'s ' +
        'main encapsulation tool is switched off across the whole codebase and every ' +
        'implementation detail is reachable from everywhere.</p>' +
        '<p>Package by feature — <code>orders</code>, <code>payments</code>, ' +
        '<code>inventory</code>, each containing its own controller, service and repository — ' +
        'puts collaborators together, so only the deliberate entry points need to be public. The ' +
        'compiler then enforces the boundary.</p>' +
        '<p>The other arguments, in order of how much they matter in practice:</p>' +
        '<ul>' +
        '<li><strong>Change is by feature, not by layer.</strong> A story touches one controller, ' +
        'one service and one repository. By layer that is three distant packages; by feature it ' +
        'is one directory, and the diff reads as one thing.</li>' +
        '<li><strong>The structure tells you what the application does.</strong> A top level ' +
        'reading orders, payments, shipping is more informative than one reading controller, ' +
        'service, repository — which is true of every application ever written.</li>' +
        '<li><strong>Deleting a feature becomes deleting a directory</strong>, which is how you ' +
        'find out whether the boundaries were real.</li>' +
        '<li><strong>It is the seam for extraction later.</strong> A feature package with a ' +
        'narrow public surface is a service you could pull out; a layer is not.</li>' +
        '</ul>' +
        '<p>The reasonable middle: <strong>feature at the top, layers inside</strong>. And ' +
        '<code>shared</code> or <code>common</code> is where this decays — a package everything ' +
        'depends on and nobody owns. Keep it small and boring, and be suspicious of anything ' +
        'domain-shaped ending up there.</p>',
    referenceLinks: [
        { title: 'Spring Modulith — Reference', url: 'https://docs.spring.io/spring-modulith/reference/' }
    ],
    tags: ['architecture', 'structure', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'hexagonal-architecture',
    importance: 'must-know',
    subsection: 'structure',
    question: 'Explain hexagonal architecture. What is a port and what is an adapter?',
    answer:
        '<p>One rule: <strong>dependencies point inward.</strong> The domain sits in the middle ' +
        'and knows nothing about the web, the database or the broker; everything else depends on ' +
        'it.</p>' +
        '<ul>' +
        '<li><strong>A port is an interface owned by the domain</strong>, expressed in domain ' +
        'vocabulary. <em>Driving</em> ports are what the outside calls — a use case. ' +
        '<em>Driven</em> ports are what the domain needs — <code>OrderRepository</code>, ' +
        '<code>PaymentGateway</code>, <code>NotificationSender</code>.</li>' +
        '<li><strong>An adapter is an implementation of a port living outside</strong>: a REST ' +
        'controller driving a use case, a JPA repository implementing the persistence port, an ' +
        'HTTP client implementing the payment port.</li>' +
        '</ul>' +
        '<p><strong>The port belongs to the domain package, not the adapter\'s.</strong> This is ' +
        'the whole mechanism and it is what people get wrong: an interface sitting next to its ' +
        'JPA implementation, shaped like the database, leaves the arrow pointing outward and buys ' +
        'nothing. The domain declares what it needs, in its own words, and infrastructure depends ' +
        'inward to satisfy it.</p>' +
        '<p>What you get, concretely rather than as principle:</p>' +
        '<ul>' +
        '<li><strong>The domain is testable with no framework at all</strong> — no context, no ' +
        'database, no mocking library. Plain objects and fakes, running in milliseconds.</li>' +
        '<li><strong>Infrastructure is replaceable</strong> — genuinely, since the domain has no ' +
        'reference to it.</li>' +
        '<li><strong>The business rules are readable in one place</strong>, undiluted by ' +
        'annotations and mapping.</li>' +
        '</ul>' +
        '<p>The cost is real and should be stated: <strong>more classes and a mapping layer</strong>. ' +
        'The JPA entity and the domain object are usually different types, which means a mapper ' +
        'and a whole extra shape to keep in step. Sharing them is the common shortcut and it ' +
        'quietly reintroduces the dependency — a domain object with <code>@Entity</code> on it is ' +
        'not independent of the database, whatever the diagram says.</p>' +
        '<p>The hexagon shape means nothing, incidentally. It is drawn with six sides so that ' +
        'nobody reads it as top-to-bottom layers.</p>',
    referenceLinks: [
        { title: 'Spring Framework — Dependency Injection', url: 'https://docs.spring.io/spring-framework/reference/core/beans/dependencies/factory-collaborators.html' }
    ],
    tags: ['architecture', 'hexagonal', 'must-know'],
    images: [],
    hasDiagram: true,
    diagramType: 'flowchart',
    diagramConfig: {
        title: 'Ports and adapters: every arrow points inward',
        nodes: [
            { id: 'rest',    label: 'REST controller (driving adapter)', kind: 'start' },
            { id: 'usecase', label: 'use case / driving port',           kind: 'step' },
            { id: 'domain',  label: 'domain model — no framework imports', kind: 'step' },
            { id: 'repoport',label: 'OrderRepository (driven port, owned by the domain)', kind: 'step' },
            { id: 'jpa',     label: 'JPA adapter (implements the port)',  kind: 'trap' }
        ],
        edges: [
            { from: 'rest',     to: 'usecase', label: 'depends on' },
            { from: 'usecase',  to: 'domain' },
            { from: 'domain',   to: 'repoport', label: 'declares' },
            { from: 'jpa',      to: 'repoport', label: 'implements — depends inward' }
        ]
    },
    codeSnippets: []
},

{
    id: 'dto-versus-entity',
    importance: 'must-know',
    subsection: 'structure',
    question: 'Why not return JPA entities directly from a controller?',
    answer:
        '<p>Four reasons, and two of them are security issues rather than design preferences.</p>' +
        '<ul>' +
        '<li><strong>It couples your API to your schema.</strong> Renaming a column becomes a ' +
        'breaking change for every client. The two shapes have completely different reasons to ' +
        'change and completely different rates of change, and tying them together means the ' +
        'slower one is governed by the faster.</li>' +
        '<li><strong>It leaks fields.</strong> A password hash, an internal status, another ' +
        'tenant\'s identifier — anything on the entity is in the response unless someone ' +
        'remembers <code>@JsonIgnore</code>, and the failure mode is silent and additive: a field ' +
        'added next year is exposed by default.</li>' +
        '<li><strong>Mass assignment on the way in.</strong> Binding a request body onto an ' +
        'entity lets a caller set <code>role</code> or <code>accountBalance</code> by including ' +
        'it. This is OWASP API #3, and a DTO with only the fields a caller may set is the ' +
        'fix.</li>' +
        '<li><strong>Serialisation triggers lazy loading.</strong> Jackson walks the object ' +
        'graph, touching lazy associations — so either you get ' +
        '<code>LazyInitializationException</code>, or, worse, open-in-view is on and you silently ' +
        'issue a query per association while writing the response, outside the transaction, with ' +
        'no way to see it in the service layer.</li>' +
        '</ul>' +
        '<p>The counter-argument deserves a fair hearing: <strong>for a small CRUD service the ' +
        'DTO is duplication</strong>, and a mapper for a five-field object earns nothing. That is ' +
        'true, and the honest position is that the boundary matters most where the API is public ' +
        'or the entity has fields the caller must not see — which is nearly every entity ' +
        'eventually.</p>' +
        '<p>Two practical notes. <strong>Java records are ideal DTOs</strong> — immutable, ' +
        'concise, and Jackson supports them, so the objection about boilerplate is much weaker ' +
        'than it was. And <strong>separate the inbound and outbound shapes</strong>: what a ' +
        'client may send and what you return are different sets of fields, and one class for both ' +
        'is how mass assignment gets reintroduced.</p>',
    referenceLinks: [
        { title: 'OWASP API Security Top 10', url: 'https://owasp.org/API-Security/editions/2023/en/0x11-t10/' }
    ],
    tags: ['architecture', 'api-design', 'security', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'when-clean-architecture-is-overkill',
    importance: 'must-know',
    subsection: 'structure',
    question: 'When is hexagonal or clean architecture the wrong choice?',
    answer:
        '<p>When there is no domain to protect — which is most services, and saying so is what ' +
        'separates someone who has applied this from someone who has read about it.</p>' +
        '<p>A service that accepts a request, validates it, writes a row and returns it has ' +
        'business logic amounting to a few validation rules. Wrapping that in ports, adapters, ' +
        'use case classes and a mapping layer produces four times the code and no additional ' +
        'protection, because there was nothing to isolate. The layers become a tax paid on every ' +
        'change forever.</p>' +
        '<p><strong>The signals it is worth it:</strong></p>' +
        '<ul>' +
        '<li>Complex business rules with real invariants — the domain has behaviour rather than ' +
        'fields.</li>' +
        '<li>Rules that outlive the technology, in a system expected to run for many years.</li>' +
        '<li>Several inbound channels — REST, a message consumer, a scheduled job, a CLI — all ' +
        'driving the same use cases. This is where a driving port genuinely pays.</li>' +
        '<li>A dependency you expect to replace, or one that is painful to test against.</li>' +
        '<li>A team large enough that the boundary is also an organisational one.</li>' +
        '</ul>' +
        '<p><strong>The signals it is not:</strong> a CRUD service, a short-lived one, a small ' +
        'team, or a domain where the database schema genuinely is the model.</p>' +
        '<p>The pragmatic middle is worth naming because it is what most good codebases actually ' +
        'do: <strong>keep the domain logic in domain objects and out of controllers, define ' +
        'repository interfaces in the domain package, and skip the rest</strong> — no separate ' +
        'JPA entity, no mapper, no use case class per operation. That gets most of the benefit ' +
        'for a fraction of the cost, and it leaves the door open.</p>' +
        '<p>And the meta-answer that lands: <strong>architecture is about which changes you are ' +
        'making cheap and which you are making expensive.</strong> Hexagonal makes swapping ' +
        'infrastructure cheap and adding a field expensive. If you swap infrastructure once a ' +
        'decade and add fields weekly, you have optimised the wrong direction.</p>',
    referenceLinks: [
        { title: 'Spring Modulith — Reference', url: 'https://docs.spring.io/spring-modulith/reference/' }
    ],
    tags: ['architecture', 'judgement', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

/* ==== Domain-Driven Design ============================================ */

{
    id: 'bounded-context',
    importance: 'must-know',
    subsection: 'ddd',
    question: 'What is a bounded context, and why does it matter?',
    answer:
        '<p>A boundary within which <strong>one model and one language are consistent</strong>. ' +
        'It is the most important idea in domain-driven design and the one most often reduced to ' +
        '"a microservice", which it is not — a bounded context is a modelling boundary and may ' +
        'live inside a monolith.</p>' +
        '<p>The insight underneath it: <strong>the same word means different things to different ' +
        'parts of a business, and trying to build one model for all of them fails.</strong> A ' +
        '"customer" in Sales is a prospect with a pipeline stage and a contact history. In ' +
        'Billing it is a payment method and an address. In Support it is a ticket history and an ' +
        'entitlement. A single <code>Customer</code> class serving all three ends up with forty ' +
        'fields, most of them null in any given use, and every team blocked on every other ' +
        'team\'s changes.</p>' +
        '<p>The right answer is <strong>three models, each complete for its own purpose</strong>, ' +
        'related by identifier. Duplication of concept is not duplication of code — they are ' +
        'genuinely different things that share a name.</p>' +
        '<p>Where contexts meet is a <strong>context map</strong>, and the relationships have ' +
        'names worth knowing:</p>' +
        '<ul>' +
        '<li><strong>Shared kernel</strong> — a small shared model, and continuous coordination. ' +
        'Expensive, so keep it tiny.</li>' +
        '<li><strong>Customer / supplier</strong> — the upstream accommodates the downstream\'s ' +
        'needs.</li>' +
        '<li><strong>Conformist</strong> — the downstream accepts the upstream\'s model as it ' +
        'is.</li>' +
        '<li><strong>Anticorruption layer</strong> — the downstream translates at its boundary, ' +
        'so a legacy or third-party model does not leak into a clean one. The most useful of the ' +
        'four in practice, and the one to reach for when integrating with something you do not ' +
        'control.</li>' +
        '</ul>' +
        '<p>The practical value for a service architecture: <strong>bounded contexts are the ' +
        'right seams to split on.</strong> Splitting anywhere else produces services that must be ' +
        'deployed together.</p>',
    referenceLinks: [
        { title: 'Spring Modulith — Reference', url: 'https://docs.spring.io/spring-modulith/reference/' }
    ],
    tags: ['ddd', 'architecture', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'aggregate-and-aggregate-root',
    importance: 'must-know',
    subsection: 'ddd',
    question: 'What is an aggregate, and what rules govern one?',
    answer:
        '<p>A cluster of objects treated as <strong>one unit for changes</strong>, with a single ' +
        'entry point — the <strong>aggregate root</strong> — that is responsible for the ' +
        'invariants across the whole cluster.</p>' +
        '<p>An <code>Order</code> with its <code>OrderLine</code>s is the standard example. The ' +
        'order is the root; lines have no independent existence; and the rule "the total may not ' +
        'exceed the credit limit" is enforced by the order, because it is the only thing that can ' +
        'see all the lines at once.</p>' +
        '<p>The rules that make it useful:</p>' +
        '<ul>' +
        '<li><strong>Outside code holds a reference to the root only.</strong> Never to an ' +
        'internal — otherwise the invariant can be broken behind the root\'s back. In Java this ' +
        'means returning an unmodifiable view of the lines and mutating through methods on the ' +
        'order.</li>' +
        '<li><strong>Reference other aggregates by identity, not by object.</strong> An order ' +
        'holds a <code>CustomerId</code>, not a <code>Customer</code>. This is the rule that ' +
        'keeps aggregates small, keeps loading bounded, and stops the whole domain being one ' +
        'object graph.</li>' +
        '<li><strong>One transaction, one aggregate.</strong> The strongest guidance in the whole ' +
        'topic. Changes spanning aggregates should be eventually consistent — a domain event, an ' +
        'outbox, a saga. It is also what makes aggregates the natural unit if the system is ever ' +
        'split.</li>' +
        '<li><strong>The root enforces invariants on every change.</strong> That is why the ' +
        'aggregate has behaviour and not only fields.</li>' +
        '</ul>' +
        '<p>The most common mistake is <strong>aggregates that are too big</strong> — a ' +
        '<code>Customer</code> owning every order, so placing an order loads and locks the whole ' +
        'history and two concurrent orders conflict on the same optimistic version. The heuristic ' +
        'that fixes it: <strong>an aggregate should be as small as the invariants allow.</strong> ' +
        'If two things do not need to be consistent within a single transaction, they are two ' +
        'aggregates.</p>',
    referenceLinks: [
        { title: 'microservices.io — Aggregate Pattern', url: 'https://microservices.io/patterns/data/aggregate.html' }
    ],
    tags: ['ddd', 'aggregates', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'entity-versus-value-object',
    importance: 'should-know',
    subsection: 'ddd',
    question: 'What is the difference between an entity and a value object?',
    answer:
        '<p><strong>An entity has identity that persists through change. A value object is ' +
        'defined entirely by its attributes.</strong></p>' +
        '<p>A person changes their name, their address and their email and remains the same ' +
        'person — that is an entity, and its equality is by id. A <code>Money</code> of £10 is ' +
        'interchangeable with any other £10; there is no meaningful question about which one it ' +
        'is. Change the amount and it is a different value, not a changed one.</p>' +
        '<p>The properties that follow for value objects:</p>' +
        '<ul>' +
        '<li><strong>Immutable.</strong> Operations return new instances.</li>' +
        '<li><strong>Equality by value</strong>, over every attribute.</li>' +
        '<li><strong>Freely shareable</strong>, with no defensive copying and no thread-safety ' +
        'concern.</li>' +
        '<li><strong>They can carry behaviour and validation.</strong> This is where most of the ' +
        'benefit is.</li>' +
        '</ul>' +
        '<p>Which is the practical argument, and it is stronger than it sounds: replacing ' +
        '<code>BigDecimal amount</code> and <code>String currency</code> with a ' +
        '<code>Money</code> type makes it <strong>impossible to add pounds to dollars</strong>, ' +
        'impossible to pass the two in the wrong order, and gives rounding one home instead of ' +
        'twelve. Replacing <code>String email</code> with an <code>EmailAddress</code> means it ' +
        'is validated once, at construction, and every function receiving one can stop checking. ' +
        '<strong>Primitive obsession is the smell; value objects are the fix.</strong></p>' +
        '<p>In Java, <strong>a record is the natural value object</strong> — immutable, equality ' +
        'by component, and a compact constructor for validation. In JPA the equivalent is ' +
        '<code>@Embeddable</code>, which maps the fields inline with no extra table.</p>' +
        '<p>One caution: value objects need <code>equals</code> and <code>hashCode</code> to be ' +
        'right, and an entity generally should not use a mutable field or a generated id in ' +
        'them — which is the entity-equality problem the JPA topic covers.</p>',
    referenceLinks: [
        { title: 'JEP 395: Records', url: 'https://openjdk.org/jeps/395' }
    ],
    tags: ['ddd', 'modelling', 'records'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'anaemic-domain-model',
    importance: 'must-know',
    subsection: 'ddd',
    question: 'What is an anaemic domain model, and is it always wrong?',
    answer:
        '<p>Objects with fields, getters and setters and no behaviour, with all the rules in ' +
        'service classes that manipulate them from outside. Fowler named it an anti-pattern ' +
        'because it has the shape of object orientation and none of the substance — the data and ' +
        'the operations on it are in different places, which is precisely what encapsulation ' +
        'exists to prevent.</p>' +
        '<p><strong>What it costs:</strong></p>' +
        '<ul>' +
        '<li><strong>Rules scatter.</strong> The same validation appears in three services, in ' +
        'two of them slightly differently, and nobody can answer "where is the rule about ' +
        'discounts" without a search.</li>' +
        '<li><strong>Invariants cannot be enforced.</strong> Anything with a setter can be put ' +
        'into an invalid state by any caller, so every service must defend against states the ' +
        'object should never have been able to reach.</li>' +
        '<li><strong>Services grow</strong> into procedural modules operating on data ' +
        'structures.</li>' +
        '</ul>' +
        '<p><strong>Is it always wrong? No</strong>, and this is the half worth saying because it ' +
        'is where the judgement shows.</p>' +
        '<p>For a service that is genuinely a CRUD layer over a table — read, validate a few ' +
        'fields, write — there is no domain logic to put anywhere. Insisting on rich objects ' +
        'produces classes whose only behaviour is what a validator would have done, plus a ' +
        'mapping layer. And a rich domain model is a real cost with JPA: entities managed by a ' +
        'persistence context, constructed by the framework, with a no-arg constructor and mutable ' +
        'fields, resist encapsulation at every turn.</p>' +
        '<p>So the position that holds: <strong>match the model to the complexity.</strong> ' +
        'Anaemic is fine where the logic is thin and honest about being thin. It becomes a ' +
        'problem when real rules exist and are living in services — and the signal to watch for ' +
        'is a service method reading several fields off an object, deciding something, and ' +
        'writing fields back. <strong>That method wanted to be on the object.</strong></p>',
    referenceLinks: [
        { title: 'Spring Data JPA — Reference', url: 'https://docs.spring.io/spring-data/jpa/reference/' }
    ],
    tags: ['ddd', 'design', 'judgement', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'ubiquitous-language',
    importance: 'should-know',
    subsection: 'ddd',
    question: 'What is the ubiquitous language, and what does it look like in code?',
    answer:
        '<p>One vocabulary shared by the engineers and the domain experts, used in conversation, ' +
        'in documentation and <strong>in the code itself</strong>. Not a glossary that gets ' +
        'written once — a working agreement that changes when the understanding does.</p>' +
        '<p>The problem it solves is translation. When the business says "an order is settled" ' +
        'and the code says <code>updateStatus(3)</code>, every conversation requires a mapping ' +
        'that lives only in the heads of whoever has been there longest. Misunderstandings do not ' +
        'surface as disagreements; they surface as bugs, months later.</p>' +
        '<p>What it looks like in code:</p>' +
        '<ul>' +
        '<li><strong>Class and method names are the business\'s words.</strong> ' +
        '<code>order.settle()</code>, not <code>orderService.updateStatus(SETTLED)</code>. ' +
        '<code>PolicyLapsed</code>, not <code>StatusChangeEvent</code>.</li>' +
        '<li><strong>The concepts the business names exist as types.</strong> If they talk about ' +
        'a "settlement window", there is a <code>SettlementWindow</code>, not a pair of dates ' +
        'passed around.</li>' +
        '<li><strong>No invented technical synonyms.</strong> If the business says "policy", the ' +
        'code does not say "contract" because it read better to a developer.</li>' +
        '<li><strong>The language is per bounded context.</strong> The same word deliberately ' +
        'means different things in Sales and Billing, and forcing one meaning across both is the ' +
        'mistake the boundary exists to prevent.</li>' +
        '</ul>' +
        '<p>The test that makes this concrete: <strong>could a domain expert read your class ' +
        'names and method signatures and recognise their business?</strong> If they would need a ' +
        'translation, the language is not shared, and the model probably is not either — because ' +
        'names that do not match the domain are usually a sign that the model does not ' +
        'either.</p>',
    referenceLinks: [
        { title: 'Spring Modulith — Reference', url: 'https://docs.spring.io/spring-modulith/reference/' }
    ],
    tags: ['ddd', 'naming', 'communication'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

/* ==== CQRS & Event Sourcing =========================================== */

{
    id: 'cqrs',
    importance: 'must-know',
    subsection: 'cqrs',
    question: 'What is CQRS, and does it require separate databases?',
    answer:
        '<p><strong>Separating the model you write through from the model you read through.</strong> ' +
        'That is all it is, and the answer to the second half is no — CQRS does not require ' +
        'separate databases, separate services, event sourcing, or a message bus. Those are ' +
        'options at the far end of a spectrum whose near end is very cheap.</p>' +
        '<p>The problem it addresses: a single model has to serve two incompatible jobs. Writes ' +
        'want invariants, aggregates and normalisation; reads want denormalised, ' +
        'screen-shaped data across several aggregates. A model that does both does neither well ' +
        '— which is where the DTO explosion, the twelve-way join, and the entity graph with ' +
        'fifteen fetch hints come from.</p>' +
        '<p><strong>The spectrum, and most systems should stop early:</strong></p>' +
        '<ul>' +
        '<li><strong>Separate objects.</strong> Commands go through the aggregate; queries return ' +
        'purpose-built read models. Same database, same transaction. Nearly free, and most of the ' +
        'benefit.</li>' +
        '<li><strong>Separate queries.</strong> Reads bypass the ORM entirely — a projection or ' +
        'plain SQL straight to the shape the screen needs. Still one database, and it removes a ' +
        'surprising amount of complexity from the entity model.</li>' +
        '<li><strong>Separate schema</strong> — materialised views or denormalised tables kept ' +
        'up to date on write.</li>' +
        '<li><strong>Separate store</strong> — a read database or search index updated ' +
        'asynchronously. Now you have eventual consistency, and everything from the ' +
        'read-your-writes question applies.</li>' +
        '</ul>' +
        '<p>The trap: <strong>going straight to the far end.</strong> Two databases and an ' +
        'asynchronous projection means a user who saves a form and does not see their change, ' +
        'which is a product problem you have to design around — and taking that on for a read ' +
        'model that a view could have provided is how CQRS gets its reputation.</p>' +
        '<p>The point worth making: <strong>CQRS is a modelling decision first and an ' +
        'infrastructure decision only if you need it to be.</strong></p>',
    referenceLinks: [
        { title: 'microservices.io — CQRS', url: 'https://microservices.io/patterns/data/cqrs.html' }
    ],
    tags: ['cqrs', 'architecture', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'event-sourcing',
    importance: 'should-know',
    subsection: 'cqrs',
    question: 'What is event sourcing, and what does it cost?',
    answer:
        '<p>Storing <strong>the sequence of events</strong> as the system of record rather than ' +
        'the current state. State is derived by replaying them. Instead of a row saying the ' +
        'balance is £100, there is an append-only log of deposits and withdrawals, and £100 is ' +
        'the fold over it.</p>' +
        '<p><strong>What it buys, and these are genuine:</strong></p>' +
        '<ul>' +
        '<li><strong>A complete audit trail, by construction.</strong> Not a log written ' +
        'alongside the truth — the log <em>is</em> the truth, so it cannot drift or be ' +
        'forgotten.</li>' +
        '<li><strong>Temporal queries.</strong> "What did this look like on 1 March" is a replay ' +
        'to that point, and answering it in a state-based system usually means it was not ' +
        'recorded.</li>' +
        '<li><strong>New read models from history.</strong> A question nobody anticipated can be ' +
        'answered by projecting the existing events, retroactively.</li>' +
        '<li><strong>Debugging by replay</strong> — reproduce exactly how a state was reached.</li>' +
        '</ul>' +
        '<p><strong>What it costs, and this is the half that decides it:</strong></p>' +
        '<ul>' +
        '<li><strong>Ad-hoc queries are impossible against the log.</strong> Every read needs a ' +
        'projection built in advance, so CQRS is not optional — it is a consequence.</li>' +
        '<li><strong>Events are immutable and forever</strong>, so schema evolution is a real ' +
        'discipline: upcasters, versioned event types, and no ability to fix an old event. A bug ' +
        'that wrote wrong events is corrected by writing compensating ones, not by an UPDATE.</li>' +
        '<li><strong>Replay gets slow</strong>, so you need snapshots, which is more machinery ' +
        'and another thing to invalidate.</li>' +
        '<li><strong>GDPR erasure conflicts with an immutable log.</strong> The usual answer is ' +
        'crypto-shredding — encrypt personal data per subject and destroy the key — and it has to ' +
        'be designed in from the start.</li>' +
        '<li><strong>Everyone on the team has to understand it.</strong> The learning curve is ' +
        'the most commonly underestimated cost.</li>' +
        '</ul>' +
        '<p>So: right for a genuinely event-shaped domain where history is part of the product — ' +
        'finance, insurance, logistics, anything audited. Wrong as a default. And it can be ' +
        'applied to <strong>one aggregate</strong> rather than the whole system, which is almost ' +
        'always the sensible way in.</p>',
    referenceLinks: [
        { title: 'microservices.io — Event Sourcing', url: 'https://microservices.io/patterns/data/event-sourcing.html' }
    ],
    tags: ['event-sourcing', 'architecture', 'judgement'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'read-models-and-projections',
    importance: 'should-know',
    subsection: 'cqrs',
    question: 'What is a projection, and what has to be true for one to be safe?',
    answer:
        '<p>A <strong>read model derived from a source of truth</strong> — a table, a search ' +
        'index or a cache built by processing events or changes, shaped for one screen or one ' +
        'query.</p>' +
        '<p>The defining property, and the one that makes projections tractable: ' +
        '<strong>a projection is disposable.</strong> It can be deleted and rebuilt from the ' +
        'source. That single fact removes most of the fear around them — a bug in a projection is ' +
        'fixed by correcting the code and replaying, not by a data migration.</p>' +
        '<p>What has to be true for that to hold:</p>' +
        '<ul>' +
        '<li><strong>The source is complete.</strong> If the projection holds anything not ' +
        'derivable from the source, it is not a projection, it is a second system of record — and ' +
        'rebuilding it destroys data. This is the line to be strict about.</li>' +
        '<li><strong>Building it is idempotent.</strong> Events arrive at least once, so applying ' +
        'one twice must not double a counter. Track the position processed, in the same ' +
        'transaction as the update.</li>' +
        '<li><strong>Order is handled</strong> — either guaranteed by the transport per key, or ' +
        'made irrelevant by a version check on each event.</li>' +
        '<li><strong>Rebuilding is a routine operation</strong>, not a heroic one. If it has ' +
        'never been done, it does not work, and it takes eight hours the first time somebody ' +
        'needs it urgently.</li>' +
        '</ul>' +
        '<p>The operational pattern worth naming: <strong>build the new version alongside the old ' +
        'one and switch.</strong> A schema change to a projection is a new projection, populated ' +
        'from the beginning, then a cutover — which is expand-and-contract applied to derived ' +
        'data, and it means the rebuild happens with the old one still serving.</p>' +
        '<p>And the thing to say last: <strong>a projection is eventually consistent with its ' +
        'source</strong>, so the lag needs monitoring and the user interface needs to be honest ' +
        'about it. An unmonitored projection that stopped updating three days ago looks exactly ' +
        'like one that is working.</p>',
    referenceLinks: [
        { title: 'microservices.io — CQRS', url: 'https://microservices.io/patterns/data/cqrs.html' }
    ],
    tags: ['cqrs', 'projections', 'consistency'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
}

    ]
};
