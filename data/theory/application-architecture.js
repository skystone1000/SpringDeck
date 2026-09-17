/* ==========================================================================
   data/theory/application-architecture.js — module 31 in the reading path

   "How do you structure a Spring Boot project?" is asked constantly and
   answered badly, usually as a list of package names. Eleven chapters, and
   the argument running through all of them is the one cohesion-and-coupling
   set up in module 7: a package is a unit of change, so the right question is
   never "what kind of thing is this" but "what changes together".

   Two of the eleven exist to keep the module honest. The anaemic domain
   model chapter presents the debate rather than the verdict, because the
   verdict depends on how much domain there is. And the overkill chapter is
   here for the same reason its counterpart is in module 7 — a five-layer
   path for a two-field read is what people mean when they say clean
   architecture is over-engineering, and they are describing something real.
   ========================================================================== */

const applicationArchitectureModule = {
    id: 'application-architecture',
    trackId: 'craft',
    order: 31,
    title: 'Structuring a Spring Boot Application',
    tagline: '"How do you structure a project?" — asked constantly, answered badly.',
    estimatedMinutes: 45,
    prerequisites: ['patterns-in-spring'],
    docHub: { title: 'Martin Fowler — Software Architecture Guide', url: 'https://martinfowler.com/architecture/' },

    chapters: [
        {
            id: 'package-by-layer',
            title: 'Package by Layer',
            importance: 'must-know',
            summary: 'controller, service, repository, model. Every tutorial uses it, every codebase starts with it, and it stops scaling at about the fifth feature.',
            interviewAngle: 'Naming it as the default and then saying precisely what breaks — every feature touches every package, and nothing can be extracted — is more useful than dismissing it.',
            buildsOn: [],
            blocks: [
                {
                    type: 'syntax',
                    language: 'bash',
                    title: 'The shape everyone has seen',
                    code: 'com.acme.shop\n├── controller\n│   ├── OrderController.java\n│   ├── ProductController.java\n│   └── CustomerController.java\n├── service\n│   ├── OrderService.java\n│   ├── ProductService.java\n│   └── CustomerService.java\n├── repository\n│   ├── OrderRepository.java\n│   ├── ProductRepository.java\n│   └── CustomerRepository.java\n├── model\n└── dto\n\n# Add "orders can be part-refunded" and you touch four packages.\n# Delete the ordering feature and you delete files from four packages\n# and hope you found them all.',
                    notes: '<p>The structure is not stupid — it is <em>discoverable</em>, which is exactly why tutorials use it. A newcomer can find every controller in one place. The cost only appears once there are enough features that "every controller" is no longer a useful set.</p>'
                },
                {
                    type: 'types',
                    title: 'What it gets right, and what it costs',
                    items: [
                        { name: 'Right: obvious and uniform', html: '<p>No arguments in code review about where a class goes. For a small service — under about five features — this is worth a lot and the costs below have not appeared yet.</p>' },
                        { name: 'Right: layer violations are visible', html: '<p>A repository importing from <code>controller</code> stands out immediately.</p>' },
                        { name: 'Cost: every change is a shotgun change', html: '<p>One feature, four packages, four files, and the diff spans the whole tree.</p>' },
                        { name: 'Cost: nothing can be extracted', html: '<p>Pulling "ordering" into its own service or module means picking classes out of four packages by hand. There is no seam.</p>' },
                        { name: 'Cost: no encapsulation between features', html: '<p><code>service</code> is one package, so <code>CustomerService</code> can call anything in it. There is no way to say "the ordering internals are private".</p>' }
                    ]
                }
            ],
            docs: [
                { title: 'PresentationDomainDataLayering', url: 'https://martinfowler.com/bliki/PresentationDomainDataLayering.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'architecture-ddd', questionId: 'package-by-layer-or-feature' }
            ]
        },

        {
            id: 'package-by-feature',
            title: 'Package by Feature',
            importance: 'must-know',
            summary: 'One package per capability, containing its controller, its service, its repository and its model. The layers still exist; they are just nested one level down.',
            interviewAngle: 'The follow-up is always "but where do the layers go" — they go inside the feature, and being able to show that immediately is what makes the answer land.',
            buildsOn: ['package-by-layer'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'bash',
                    title: 'The same application, reorganised',
                    code: 'com.acme.shop\n├── ordering\n│   ├── OrderController.java      // package-private where possible\n│   ├── OrderService.java\n│   ├── OrderRepository.java\n│   ├── Order.java\n│   └── api                      // the ONLY package other features import\n│       ├── OrderPlaced.java     //   an event\n│       └── OrderSummary.java    //   a read model\n├── catalogue\n│   └── ...\n├── customers\n│   └── ...\n└── shared\n    ├── Money.java\n    └── config\n\n# "Orders can be part-refunded" now touches one package.\n# Deleting the ordering feature is deleting one directory.',
                    notes: '<p>The <code>api</code> sub-package is what makes this more than a rename. Everything outside it can be package-private, so the compiler enforces that other features go through the published surface. Without that discipline, package-by-feature is package-by-layer with the directories shuffled.</p>'
                },
                {
                    type: 'prose',
                    html: '<p>The objection people raise first is that the layers have disappeared. They have not — <code>OrderController</code> still talks to <code>OrderService</code> which still talks to <code>OrderRepository</code>, and a repository still must not import a controller. What changed is the <em>outer</em> axis: the top-level division is now capability, and layer is the division inside it.</p><p>That matters because the top-level axis is the one that decides what is easy to extract, and capability is the axis along which a service is eventually split. A layer never is.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Java\'s default access is the tool that makes this real and it is almost never used deliberately. Make <code>OrderService</code> package-private and it becomes physically impossible for the catalogue feature to call it — no convention, no code review, no ArchUnit rule needed. Spring is entirely happy to inject package-private beans, which is what makes the technique available at all.</p>'
                }
            ],
            docs: [
                { title: 'Spring Modulith — Application Modules', url: 'https://docs.spring.io/spring-modulith/reference/fundamentals.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'architecture-ddd', questionId: 'package-by-layer-or-feature' }
            ]
        },

        {
            id: 'why-package-by-feature-usually-wins',
            title: 'Why Feature Usually Wins',
            importance: 'should-know',
            summary: 'Because a package should be a unit of change, and change arrives as features. That is the entire argument, and it is the cohesion rule from the SOLID module applied one level up.',
            interviewAngle: 'The one-sentence version — "things that change together should live together" — is worth more than the comparison table, because it generalises to modules, services and teams.',
            buildsOn: ['package-by-feature'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'Judged on the things that actually cost time',
                    left: 'By layer',
                    right: 'By feature',
                    rows: [
                        { aspect: 'A typical change touches', left: '4 packages', right: '1 package' },
                        { aspect: 'Deleting a capability', left: 'Hunt through four directories', right: '<code>rm -r</code> one directory' },
                        { aspect: 'Can internals be hidden', left: 'No — one flat <code>service</code> package', right: 'Yes — package-private plus a published <code>api</code>' },
                        { aspect: 'Extracting a microservice later', left: 'Manual archaeology', right: 'The boundary is already drawn' },
                        { aspect: 'Onboarding: "where is X"', left: 'Easier at first', right: 'Easier once there are more than a handful of features' },
                        { aspect: 'Merge conflicts across teams', left: 'Frequent — everyone edits <code>service</code>', right: 'Rare — teams own directories' },
                        { aspect: 'Best at', left: 'Small services, and tutorials', right: 'Anything that will grow' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>The <code>shared</code> or <code>common</code> package is where this design goes to die.</strong> It starts with <code>Money</code> and a base exception; within a year it holds a third of the codebase, every feature depends on it, and it is a layer package wearing a different name. Keep it tiny, keep it free of business rules, and treat anything landing in it as a question about whether a feature boundary is in the wrong place — usually the class belongs to one feature and should be published from its <code>api</code>.</p>'
                }
            ],
            docs: [
                { title: 'Beck Design Rules', url: 'https://martinfowler.com/bliki/BeckDesignRules.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'architecture-ddd', questionId: 'package-by-layer-or-feature' },
                { topicId: 'microservices', questionId: 'when-to-split-a-monolith' }
            ]
        },

        {
            id: 'hexagonal-architecture',
            title: 'Hexagonal Architecture',
            importance: 'must-know',
            summary: 'The domain sits in the middle and defines the interfaces it needs. Everything technical — web, database, broker, third-party API — implements those interfaces from outside.',
            interviewAngle: 'Asked by name at senior level. The discriminating detail is who owns the interface: if the port lives with the adapter, nothing has been inverted and it is layering with extra vocabulary.',
            buildsOn: ['why-package-by-feature-usually-wins'],
            blocks: [
                {
                    type: 'definition',
                    term: 'Port',
                    html: '<p>An interface <strong>owned by the domain</strong>, expressed in the domain\'s vocabulary, describing something the domain needs done or something it offers. A driving port is an entry point into the domain; a driven port is something the domain calls out to.</p>'
                },
                {
                    type: 'definition',
                    term: 'Adapter',
                    html: '<p>A class outside the domain that connects a port to a specific technology — a REST controller driving an inbound port, a JPA repository implementing an outbound one. Swapping technologies replaces an adapter and touches no domain code.</p>'
                },
                {
                    type: 'diagram',
                    diagramType: 'flowchart',
                    title: 'Which way the source-code dependencies point',
                    diagramConfig: {
                        nodes: [
                            { id: 'web',    label: 'REST controller\n(driving adapter)', kind: 'start' },
                            { id: 'inport', label: 'PlaceOrder\n(driving port)',      kind: 'process' },
                            { id: 'domain', label: 'Domain model\n+ use cases',       kind: 'decision' },
                            { id: 'outport',label: 'Orders, Payments\n(driven ports)', kind: 'process' },
                            { id: 'jpa',    label: 'JPA adapter',                     kind: 'end' },
                            { id: 'stripe', label: 'Stripe adapter',                  kind: 'end' }
                        ],
                        edges: [
                            { from: 'web',     to: 'inport',  label: 'calls' },
                            { from: 'inport',  to: 'domain',  label: 'implemented by' },
                            { from: 'domain',  to: 'outport', label: 'declares' },
                            { from: 'jpa',     to: 'outport', label: 'implements' },
                            { from: 'stripe',  to: 'outport', label: 'implements' }
                        ]
                    }
                },
                {
                    type: 'syntax',
                    language: 'bash',
                    title: 'One feature, laid out hexagonally',
                    code: 'com.acme.shop.ordering\n├── domain                       // depends on NOTHING outside itself\n│   ├── Order.java               //   no @Entity, no @JsonProperty\n│   ├── OrderId.java\n│   └── PricingPolicy.java\n├── application\n│   ├── PlaceOrder.java          // driving port (an interface)\n│   ├── PlaceOrderService.java   //   its implementation: the use case\n│   ├── Orders.java              // driven port -- owned HERE\n│   └── Payments.java            // driven port -- owned HERE\n└── adapter\n    ├── in\n    │   └── OrderController.java\n    └── out\n        ├── JpaOrders.java       // implements Orders\n        ├── OrderEntity.java     //   the @Entity lives out here\n        └── StripePayments.java  // implements Payments\n\n# The test: com.acme.shop.ordering.domain imports nothing from\n# adapter, nothing from Spring, nothing from Jakarta. If it does,\n# the hexagon is decorative.',
                    notes: '<p><code>Order</code> and <code>OrderEntity</code> being two classes is the part people resist, and it is the part that makes the rest true. The moment the domain object carries <code>@Entity</code>, the domain depends on Jakarta Persistence, lazy loading leaks into business logic, and the "no framework in the middle" claim is false. This duplication is the price of the pattern, and it is exactly why the last two chapters of this module exist.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Ports declared in the adapter package invert nothing.</strong> If <code>Orders</code> lives next to <code>JpaOrders</code>, the application package must import the adapter package to see its own interface, and the arrow points the wrong way. The <em>only</em> structural difference between hexagonal architecture and ordinary layering is which package declares the interface — so getting that wrong leaves you with layering, an extra directory level, and a vocabulary that suggests otherwise.</p>'
                }
            ],
            docs: [
                { title: 'Hexagonal Architecture', url: 'https://alistair.cockburn.us/hexagonal-architecture/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'architecture-ddd', questionId: 'hexagonal-architecture' },
                { topicId: 'design-patterns', questionId: 'dependency-inversion-versus-injection' }
            ]
        },

        {
            id: 'clean-architecture-layers',
            title: 'Clean Architecture, and Its Relatives',
            importance: 'should-know',
            summary: 'Onion, hexagonal and clean architecture are three drawings of one rule: source-code dependencies point inward, towards policy, never outward towards detail.',
            interviewAngle: 'Being able to say they are the same idea, and name the one rule they share, is better than being able to recite four concentric circles.',
            buildsOn: ['hexagonal-architecture'],
            blocks: [
                {
                    type: 'table',
                    title: 'Three names, one dependency rule',
                    headers: ['Name', 'Its picture', 'What it emphasises'],
                    rows: [
                        ['Hexagonal / ports and adapters', 'A hexagon with plugs around the edge', 'Symmetry — the UI and the database are both just adapters'],
                        ['Onion architecture', 'Concentric rings', 'The domain model at the centre, services around it'],
                        ['Clean architecture', 'Four rings: entities, use cases, adapters, frameworks', 'The explicit <em>dependency rule</em>, and use cases as first-class objects'],
                        ['<strong>All three</strong>', '', '<strong>Source dependencies point inward. The inside knows nothing about the outside.</strong>']
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>The one genuinely additional idea in the clean-architecture presentation is the <strong>use case</strong> as an object. Instead of an <code>OrderService</code> with eleven methods, you get <code>PlaceOrder</code>, <code>CancelOrder</code> and <code>RefundOrder</code>, each a class with one method. Each is independently testable, each names an operation the business recognises, and no class accumulates every dependency any of its methods needs — which is the practical thing that goes wrong with a large service class.</p><p>The cost is one class per operation and a lot of files. Whether that is worth it depends entirely on how much behaviour each operation carries, which is the subject of the next few chapters.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Asked to compare them, do not enumerate the rings. Say: <em>"They are the same rule drawn three ways — dependencies point inward, so the domain compiles without the framework. Clean architecture adds use cases as explicit classes; hexagonal emphasises that the web and the database are symmetric, both just adapters."</em> That is the whole comparison, and it is accurate.</p>'
                }
            ],
            docs: [
                { title: 'The Clean Architecture', url: 'https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'architecture-ddd', questionId: 'hexagonal-architecture' }
            ]
        },

        {
            id: 'ports-and-adapters-in-spring',
            title: 'Doing It in Spring Without Fighting Spring',
            importance: 'should-know',
            summary: 'The container is an adapter concern. Keep @Component out of the domain, wire the domain with @Bean methods in a configuration class, and the middle stays framework-free.',
            interviewAngle: 'The practical objection is "but then I lose Spring". You do not — the wiring moves to a configuration class, and being able to show that in five lines defuses the objection.',
            buildsOn: ['clean-architecture-layers'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'A domain with no Spring in it, wired by Spring',
                    code: '// application/PlaceOrderService.java -- a PLAIN class. No @Service.\npublic final class PlaceOrderService implements PlaceOrder {\n\n    private final Orders orders;        // port\n    private final Payments payments;    // port\n    private final PricingPolicy pricing;\n\n    public PlaceOrderService(Orders orders, Payments payments,\n                             PricingPolicy pricing) { ... }\n\n    @Override\n    public OrderId place(PlaceOrderCommand command) { ... }\n}\n\n// adapter/config/OrderingConfig.java -- the container lives OUT HERE.\n@Configuration\nclass OrderingConfig {\n\n    @Bean\n    PlaceOrder placeOrder(Orders orders, Payments payments, PricingPolicy pricing) {\n        return new PlaceOrderService(orders, payments, pricing);\n    }\n}\n\n// The payoff, and it is not theoretical:\nclass PlaceOrderServiceTest {\n    @Test void rejects_an_order_over_the_credit_limit() {\n        var service = new PlaceOrderService(new InMemoryOrders(),\n                                            new AlwaysDecline(), FLAT_RATE);\n        // no @SpringBootTest, no context to start, milliseconds not seconds\n    }\n}',
                    notes: '<p>The test is the argument. A use case with no framework annotations is constructed with <code>new</code> and runs in microseconds, so the expensive part of the test suite shrinks to the adapters — where a real context, and Testcontainers, are genuinely needed. Teams that adopt this and keep the domain framework-free usually cite the test suite rather than the swappability as the reason it paid.</p>'
                },
                {
                    type: 'types',
                    title: 'The pragmatic compromises, and what each concedes',
                    items: [
                        { name: 'Annotate the use case with @Service anyway', html: '<p>Domain now depends on <code>spring-context</code>. In practice that is one small, stable, framework-agnostic annotation and many teams accept it. Say so as a choice rather than not noticing.</p>' },
                        { name: 'Use the JPA entity as the domain object', html: '<p>The big one. Removes the mapping layer and couples the domain to persistence, lazy loading and the identity semantics of a database row. Reasonable for a CRUD service, expensive once there are real invariants.</p>' },
                        { name: 'Skip ports for things you will never swap', html: '<p>A clock, a UUID generator, a logger. A port per one of these is ceremony.</p>' },
                        { name: 'Hexagonal in one feature only', html: '<p>The best compromise available. Give the complex feature the full structure and let the CRUD features be three classes. Nothing requires uniformity.</p>' }
                    ]
                }
            ],
            docs: [
                { title: 'Java-based Container Configuration', url: 'https://docs.spring.io/spring-framework/reference/core/beans/java.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'architecture-ddd', questionId: 'hexagonal-architecture' },
                { topicId: 'testing', questionId: 'spring-test-slices' }
            ]
        },

        {
            id: 'dto-vs-entity',
            title: 'DTO or Entity',
            importance: 'must-know',
            summary: 'Returning an entity from a controller couples your HTTP contract to your database schema and to Hibernate\'s laziness. The mapping is tedious and it is not the expensive part.',
            interviewAngle: 'Nearly universal, and the strong answer names a specific failure rather than citing separation of concerns — a lazy proxy serialised outside the session, or a rename that silently broke every client.',
            buildsOn: ['ports-and-adapters-in-spring'],
            blocks: [
                {
                    type: 'types',
                    title: 'Four concrete failures, not one principle',
                    items: [
                        { name: 'A schema rename becomes an API break', html: '<p>Rename a column, rename the field, and every client that parsed that JSON key breaks. The entity <em>is</em> the contract, and nobody decided that.</p>' },
                        { name: 'Lazy loading meets the serialiser', html: '<p>Jackson touches an uninitialised proxy after the persistence context closed: <code>LazyInitializationException</code>, or an accidental N+1 that serialises the whole object graph.</p>' },
                        { name: 'Over-exposure', html: '<p><code>passwordHash</code>, <code>internalRiskScore</code>, <code>deletedAt</code>. Every new column is published by default, and <code>@JsonIgnore</code> is opt-out — the wrong default for a security boundary.</p>' },
                        { name: 'Mass assignment on the way in', html: '<p>Binding a request body straight onto an entity lets a client set <code>role</code> or <code>balance</code>. Every field is writable unless someone remembered otherwise.</p>' }
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Separate types for separate contracts',
                    code: '@Entity\nclass OrderEntity {\n    @Id Long id;\n    @ManyToOne(fetch = LAZY) CustomerEntity customer;\n    @OneToMany(mappedBy = "order", fetch = LAZY) List<LineEntity> lines;\n    BigDecimal internalMargin;          // never leaves the building\n    Instant deletedAt;\n}\n\n// Outbound: exactly what the client gets, and it changes when the API\n// changes rather than when the schema does.\nrecord OrderResponse(String reference, String status,\n                     MoneyView total, List<LineView> lines) { }\n\n// Inbound: exactly what the client may set. `status` is absent, so no\n// request can move an order to SHIPPED.\nrecord CreateOrderRequest(@NotBlank String customerRef,\n                          @NotEmpty List<LineRequest> lines) { }',
                    notes: '<p>Separate inbound and outbound types matter more than the entity split. The inbound record is a whitelist by construction — a field that is not on it cannot be set by any request, which closes mass assignment without a single annotation.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The nuanced answer, which is defensible under pressure: <em>"Always for the write side, because that is where mass assignment lives. On the read side I often skip the entity entirely and project straight into a DTO in the query — it avoids the mapping and avoids loading columns I am not returning."</em> That connects to the projection material in the persistence track and shows the decision is about cost, not doctrine.</p>'
                }
            ],
            docs: [
                { title: 'Interface-based and class-based projections', url: 'https://docs.spring.io/spring-data/jpa/reference/repositories/projections.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'rest-api', questionId: 'dto-vs-entity' },
                { topicId: 'jpa-hibernate', questionId: 'projections-and-dto-queries' },
                { topicId: 'architecture-ddd', questionId: 'dto-versus-entity' }
            ]
        },

        {
            id: 'mapping-and-mapstruct',
            title: 'The Mapping Layer',
            importance: 'good-to-know',
            summary: 'Three options: write it by hand, generate it at compile time with MapStruct, or reflect over it at run time. The middle one is the default for anything non-trivial.',
            interviewAngle: 'A small question with one good discriminator — a compile-time mapper fails the build on a renamed field, and a reflective one fails silently at run time.',
            buildsOn: ['dto-vs-entity'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'Compile-time generation against run-time reflection',
                    left: 'MapStruct',
                    right: 'ModelMapper / BeanUtils',
                    rows: [
                        { aspect: 'When mapping code exists', left: 'Compile time — generated source you can read and step through', right: 'Run time, by reflection' },
                        { aspect: 'A renamed source field', left: '<strong>Build fails</strong> with the unmapped property named', right: 'Silently null. Found in production.' },
                        { aspect: 'Performance', left: 'Plain field assignments', right: 'Reflection per call' },
                        { aspect: 'Debuggability', left: 'Step into the generated class', right: 'Step into a library' },
                        { aspect: 'Setup cost', left: 'An annotation processor, and it must be ordered after Lombok', right: 'One dependency' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>MapStruct and Lombok both run as annotation processors and the order matters.</strong> If MapStruct runs first it sees a class with no getters — Lombok has not generated them yet — and produces a mapper that silently maps nothing. The fix is <code>lombok-mapstruct-binding</code> on the processor path, and the symptom is a mapper returning an object with every field null, which is a confusing way to spend an afternoon.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>For two or three fields, write the mapping by hand — a static factory method on the DTO (<code>OrderResponse.from(order)</code>) keeps it next to the type it produces and costs nothing. Reach for a generator when the mappings are numerous or nested, and prefer a compile-time one, for the single reason in the table: a rename that fails the build is a rename you fix in thirty seconds.</p>'
                }
            ],
            docs: [
                { title: 'MapStruct Reference Guide', url: 'https://mapstruct.org/documentation/stable/reference/html/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'rest-api', questionId: 'dto-vs-entity' }
            ]
        },

        {
            id: 'the-anemic-domain-model-debate',
            title: 'The Anaemic Domain Model Debate',
            importance: 'should-know',
            summary: 'Entities with getters and setters and no behaviour, and services holding all the rules. Called an anti-pattern in 2003 and shipped by most Spring codebases since.',
            interviewAngle: 'A question with no single right answer, which is what makes it a good one. Arguing either side coherently — and naming what decides it — beats picking the fashionable position.',
            buildsOn: ['mapping-and-mapstruct'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'The two positions, each at its strongest',
                    left: 'It is an anti-pattern',
                    right: 'It is fine, and often right',
                    rows: [
                        { aspect: 'Core claim', left: 'Data without behaviour is not object orientation; it is procedural code with classes', right: 'Layering is a legitimate style, and most services have little domain logic to place' },
                        { aspect: 'Where rules end up', left: 'Duplicated across services, because nothing owns them', right: 'In one service, which is one place, which is fine' },
                        { aspect: 'Invariants', left: 'Cannot be enforced — any caller can call <code>setStatus</code>', right: 'Enforced at the service boundary, which is the only entry point anyway' },
                        { aspect: 'Testing', left: 'Rules need the service, its mocks and often a context', right: 'Service tests are the tests you were writing regardless' },
                        { aspect: 'Strongest when', left: 'Rich domain — pricing, eligibility, scheduling, a real state machine', right: 'CRUD with validation, or a service that is mostly integration' }
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The difference, on the one rule that matters',
                    code: '// Anaemic: the invariant is nowhere. Any caller can set any status,\n// so the rule "a cancelled order cannot ship" lives in whichever\n// services remembered it.\nclass Order {\n    private Status status;\n    public void setStatus(Status s) { this.status = s; }\n}\n\n// Rich: the invariant is in the object, so it cannot be bypassed.\nclass Order {\n    private Status status;\n\n    public void ship(TrackingNumber tracking) {\n        if (status != CONFIRMED) throw new CannotShip(id, status);\n        this.status   = SHIPPED;\n        this.tracking = tracking;\n    }\n\n    public void cancel(Reason reason) {\n        if (status == SHIPPED) throw new AlreadyShipped(id);\n        this.status = CANCELLED;\n    }\n}',
                    notes: '<p>Notice what disappeared: <code>setStatus</code>. Once the only ways to change status are <code>ship</code> and <code>cancel</code>, "a cancelled order cannot ship" is a property of the type rather than a convention, and no service can violate it by forgetting. That is the whole argument for a rich model, and it is worth exactly as much as the invariants you have.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The position that survives follow-ups: <em>"It depends on how much domain there is. A service that validates a request and writes a row has no behaviour to put on the entity, and a rich model there is ceremony. Where there are real invariants — a state machine, a pricing rule, an eligibility check — I put them on the entity, because an invariant enforced by convention across five services is an invariant that will be violated."</em></p>'
                }
            ],
            docs: [
                { title: 'AnemicDomainModel', url: 'https://martinfowler.com/bliki/AnemicDomainModel.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'architecture-ddd', questionId: 'anaemic-domain-model' }
            ]
        },

        {
            id: 'when-clean-architecture-is-overkill',
            title: 'When It Is Overkill',
            importance: 'must-know',
            summary: 'Ports, adapters, use cases and mappers cost a real amount per change. For a service that reads a table and returns it as JSON, the cost is the entire transaction.',
            interviewAngle: 'The chapter that shows judgement rather than knowledge. Being able to argue against the structure you just described is what distinguishes someone who has run it from someone who has read about it.',
            buildsOn: ['the-anemic-domain-model-debate'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>Count the artefacts for adding one field to one endpoint in a fully hexagonal service: the domain object, the entity, the outbound DTO, the inbound DTO, two mapper methods, the port signature if it changed, the adapter, and a test at each level. Eight or nine edits, most of them mechanical.</p><p>In a service where that field carries a real business rule, those edits are buying something — the rule is enforced in one place and the technology stays swappable. In a service that reads a table and returns it, they are buying nothing, and the team pays the toll on every ticket forever.</p>'
                },
                {
                    type: 'table',
                    title: 'What to reach for, by what the service actually is',
                    headers: ['The service is', 'Structure', 'Because'],
                    rows: [
                        ['CRUD over a few tables', 'Package by feature, controller → service → repository', 'There is no domain to protect'],
                        ['CRUD plus a handful of rules', 'The same, with the rules on the entities', 'Rich model without the port ceremony'],
                        ['One complex capability among simple ones', '<strong>Hexagonal for that one feature only</strong>', 'Nothing requires uniformity across features'],
                        ['A real domain — pricing, ledger, scheduling, matching', 'Full ports and adapters', 'The invariants and the test speed both justify it'],
                        ['Mostly integration — call three APIs, transform, forward', 'Adapters and a thin orchestration layer', 'There is no domain, only translation'],
                        ['A prototype', 'One package', 'It may not survive the month']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>The expensive mistake is uniformity by policy.</strong> "All our services are hexagonal" means the CRUD service that stores feature flags has a domain model, two ports, four adapters and a mapper, and every trivial change to it takes an afternoon. Architecture is chosen per service — and, inside a service, per feature. A codebase where one module is elaborate and five are three classes each is not inconsistent; it is proportionate.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>A good answer to "how do you structure a Spring Boot project" is not a directory tree. It is: <em>"Package by feature, always — one directory per capability with its internals package-private. Layers inside the feature. Then how much structure inside depends on the feature: the one with the pricing rules gets ports and a framework-free domain, and the one that stores feature flags gets a controller, a service and a repository. Uniformity across features is what makes this expensive."</em></p>'
                }
            ],
            docs: [
                { title: 'Yagni', url: 'https://martinfowler.com/bliki/Yagni.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'architecture-ddd', questionId: 'when-clean-architecture-is-overkill' },
                { topicId: 'design-patterns', questionId: 'when-a-pattern-is-overkill' }
            ]
        },

        {
            id: 'enforcing-structure-with-archunit',
            title: 'Enforcing It',
            importance: 'good-to-know',
            summary: 'A convention nobody checks decays in about six months. ArchUnit turns "the domain must not import Spring" into a failing test.',
            interviewAngle: 'Knowing that architecture can be tested is a differentiator, because most codebases enforce their structure with hope and code review.',
            buildsOn: ['when-clean-architecture-is-overkill'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Three rules worth having, and each is a real defect it prevents',
                    code: '@AnalyzeClasses(packages = "com.acme.shop",\n                importOptions = DoNotIncludeTests.class)\nclass ArchitectureTest {\n\n    // The hexagon claim, made checkable.\n    @ArchTest\n    static final ArchRule domain_is_framework_free =\n            noClasses().that().resideInAPackage("..domain..")\n                    .should().dependOnClassesThat()\n                    .resideInAnyPackage("org.springframework..",\n                                        "jakarta.persistence..",\n                                        "com.fasterxml.jackson..");\n\n    // Feature isolation: cross-feature calls go through the api package.\n    @ArchTest\n    static final ArchRule features_talk_through_their_api =\n            slices().matching("com.acme.shop.(*)..")\n                    .should().notDependOnEachOther()\n                    .ignoreDependency(alwaysTrue(),\n                                      resideInAPackage("..api.."));\n\n    // The one every codebase should have, hexagonal or not.\n    @ArchTest\n    static final ArchRule no_cycles =\n            slices().matching("com.acme.shop.(*)..")\n                    .should().beFreeOfCycles();\n}',
                    notes: '<p>The cycle rule is the one to add first, and it is worth having even in a codebase with no architectural ambitions at all: a package cycle is the thing that makes a module impossible to extract later, it forms gradually through single innocuous imports, and it is invisible in review because each import looked fine on its own.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Spring Modulith does the feature-isolation half without ArchUnit: declare modules, mark what is public, and <code>ApplicationModules.of(App.class).verify()</code> fails a test on a violation. It also generates documentation of the module graph, which is the part that survives the people who drew it. Worth naming as an alternative if the interviewer is a Spring specialist.</p>'
                }
            ],
            docs: [
                { title: 'ArchUnit User Guide', url: 'https://www.archunit.org/userguide/html/000_Index.html', kind: 'guide' },
                { title: 'Spring Modulith — Verifying Module Structure', url: 'https://docs.spring.io/spring-modulith/reference/verification.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'architecture-ddd', questionId: 'package-by-layer-or-feature' },
                { topicId: 'build-tools', questionId: 'multi-module-projects' }
            ]
        }
    ]
};
