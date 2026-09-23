/* ==========================================================================
   data/theory/service-boundaries.js — module 62 in the reading path

   The distributed track opens with the question everything else in it
   assumes an answer to, and the plan's tagline is that answer: usually "not
   yet", and you should be able to say why.

   Seven chapters, and the first one is the cost side. That ordering is the
   argument. A candidate who opens with the benefits of microservices is
   quoting a conference talk; one who opens with what a network call does to
   a method invocation has run some.

   The modular monolith gets a full chapter rather than a mention because it
   is the answer most systems should give and the one least often prepared.
   ========================================================================== */

const serviceBoundariesModule = {
    id: 'service-boundaries',
    trackId: 'distributed',
    order: 62,
    title: 'Monolith, Modular Monolith, Microservice',
    tagline: 'The answer is usually "not yet", and you should be able to say why.',
    estimatedMinutes: 35,
    prerequisites: ['rest-api-design'],
    docHub: { title: 'Martin Fowler — Microservices', url: 'https://martinfowler.com/articles/microservices.html' },

    chapters: [
        {
            id: 'what-microservices-cost',
            title: 'What a Network Call Costs',
            importance: 'must-know',
            summary: 'Splitting a method call across a network converts a fast, reliable, transactional, debuggable operation into a slow, unreliable, non-transactional one that no stack trace spans.',
            interviewAngle: 'Leading with the cost is the strongest opening available on this topic, because it is what distinguishes experience from reading.',
            buildsOn: [],
            blocks: [
                {
                    type: 'table',
                    title: 'The same operation, before and after the split',
                    headers: ['Property', 'In-process call', 'Across a network'],
                    rows: [
                        ['Latency', 'Nanoseconds', 'Milliseconds — four to six orders of magnitude'],
                        ['Can it fail on its own', 'Only if the code throws', '<strong>Yes — timeout, connection reset, DNS, a deploy</strong>'],
                        ['Did it happen?', 'Always knowable', '<strong>A timeout tells you nothing</strong> — it may have succeeded'],
                        ['Transactions', 'One, spanning everything', 'None. Sagas and compensation instead.'],
                        ['Refactoring across it', 'The IDE does it', 'A coordinated deployment of two services'],
                        ['Debugging', 'One stack trace', 'Correlated logs across services, if you built that'],
                        ['Type safety', 'The compiler', 'A schema, checked at run time, if you have one'],
                        ['Testing it', 'A unit test', 'Contract tests, or a full environment']
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>Every row is a permanent tax paid by everyone who works on the system afterwards. In exchange you get independent deployment, independent scaling, technology choice per service, and team autonomy — which are real, and which only become worth the tax at a certain size.</p><p>The observation that makes this concrete: <strong>the benefits are mostly organisational and the costs are entirely technical.</strong> Three teams that block each other on one deployment pipeline have a problem microservices solve. One team of five with the same pipeline does not, and pays the whole bill anyway.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>The most expensive consequence is the one that is hardest to see: a timeout does not tell you whether the operation happened.</strong> An in-process call either returned or threw. A call that times out may have completed on the far side, may be completing now, or may never have arrived — and the caller must behave correctly in all three cases. That single fact is why idempotency has a module of its own two positions later, and it is the change with the widest blast radius in the whole transition.</p>'
                }
            ],
            docs: [
                { title: 'Microservice Trade-Offs', url: 'https://martinfowler.com/articles/microservice-trade-offs.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'microservices', questionId: 'when-to-split-a-monolith' }
            ]
        },

        {
            id: 'modular-monolith',
            title: 'The Modular Monolith',
            importance: 'must-know',
            summary: 'One deployable, several modules with enforced boundaries. It gets most of the organisational benefit of a split with almost none of the distributed cost, and it is the right default.',
            interviewAngle: 'Naming it unprompted is a strong signal, because it is the answer most systems should give and the one least often prepared for.',
            buildsOn: ['what-microservices-cost'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'What you keep and what you give up',
                    left: 'Modular monolith',
                    right: 'Microservices',
                    rows: [
                        { aspect: 'Module boundaries', left: 'Yes — enforced by packages, modules or ArchUnit', right: 'Yes — enforced by the network' },
                        { aspect: 'Independent deployment', left: '<strong>No</strong>', right: 'Yes' },
                        { aspect: 'Independent scaling', left: 'No — scale the whole thing', right: 'Yes' },
                        { aspect: 'Transactions across modules', left: '<strong>Yes, ordinary ones</strong>', right: 'No. Sagas.' },
                        { aspect: 'Refactoring a boundary', left: 'An afternoon with the IDE', right: 'A project' },
                        { aspect: 'Debugging', left: 'One stack trace', right: 'Distributed tracing' },
                        { aspect: 'Operational surface', left: 'One service, one pipeline, one dashboard', right: 'N of each' },
                        { aspect: 'Right when', left: '<strong>Almost always, to start</strong>', right: 'Scaling or team pressure that this cannot relieve' }
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>The strategic point is that a modular monolith is <strong>the cheapest way to find out where the boundaries actually are.</strong> Module boundaries drawn in packages can be moved in an afternoon; the same boundary drawn between two deployables is a project. Since the first attempt at a decomposition is usually wrong in at least one place, doing it where mistakes are cheap is straightforwardly better.</p><p>And a well-modularised monolith can be split later, module by module, when a specific pressure justifies it — which is the migration path a distributed monolith does not have.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The formulation that answers the interview question well: <em>"I would start with a modular monolith — one deployable, clear module boundaries, package-private internals and a published interface per module. That gives me the boundary discipline without the distributed cost, and when a specific module needs its own scaling or its own release cadence, it is already isolated enough to extract. Splitting first means guessing the boundaries at the point where I know least about the domain."</em></p>'
                }
            ],
            docs: [
                { title: 'MonolithFirst', url: 'https://martinfowler.com/bliki/MonolithFirst.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'microservices', questionId: 'when-to-split-a-monolith' },
                { topicId: 'architecture-ddd', questionId: 'package-by-layer-or-feature' }
            ]
        },

        {
            id: 'decomposition-by-capability',
            title: 'Where the Seams Are',
            importance: 'must-know',
            summary: 'Split by business capability, not by technical layer and not by entity. The test is whether a typical change touches one service.',
            interviewAngle: 'The wrong answers are instructive: a "database service", a "user service" that everything calls, an "orchestration service". Each is a layer masquerading as a capability.',
            buildsOn: ['modular-monolith'],
            blocks: [
                {
                    type: 'types',
                    title: 'Four decompositions that do not work, and why',
                    items: [
                        { name: 'By technical layer', html: '<p>An "API service", a "business logic service", a "data service". Every feature touches all three, so nothing deploys independently. This is a layered monolith with network calls between the layers — strictly worse than the monolith.</p>' },
                        { name: 'By entity', html: '<p>A <code>UserService</code>, an <code>OrderService</code>, a <code>ProductService</code>, each owning a table. Every use case spans several, so every feature is a distributed transaction and every service calls every other.</p>' },
                        { name: 'By team structure alone', html: '<p>Conway\'s law taken as an instruction. It produces boundaries that match the current org chart and become wrong at the next reorganisation.</p>' },
                        { name: 'One service per developer', html: '<p>Real, and it happens by accretion. Every service is a single point of knowledge and nothing has a second maintainer.</p>' }
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>What works is <strong>business capability</strong>: ordering, payments, inventory, shipping, identity. A capability owns a coherent piece of the business, its own data, and a set of use cases that mostly complete inside it. The test is empirical rather than aesthetic — <strong>take the last twenty changes and count how many services each one touched.</strong> If most touched one, the boundaries are good. If most touched three, they are not, and no amount of tooling will fix that.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The DDD vocabulary from the next module is what makes this precise: a service boundary should be a <em>bounded context</em> — a region within which one model and one language hold. "Customer" means something different to billing than to support, and a boundary drawn where the meaning changes is a boundary that stays put. That is the connection worth making, and it is why <code>ddd-tactical</code> is ordered immediately after this module.</p>'
                }
            ],
            docs: [
                { title: 'BoundedContext', url: 'https://martinfowler.com/bliki/BoundedContext.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'microservices', questionId: 'when-to-split-a-monolith' },
                { topicId: 'architecture-ddd', questionId: 'bounded-context' }
            ]
        },

        {
            id: 'database-per-service',
            title: 'Database Per Service',
            importance: 'must-know',
            summary: 'The defining constraint. Without it there is no independence at all, and with it you lose joins, foreign keys and transactions across the boundary.',
            interviewAngle: 'The rule everyone knows and few can price. Naming what you lose — and that a shared database makes the split cosmetic — is the substance.',
            buildsOn: ['decomposition-by-capability'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>If two services share a database, neither can change its schema without coordinating with the other, neither can be deployed independently, and neither can choose its own storage. The split is then cosmetic: the deployment units are separate and the coupling is unchanged — and it is <em>worse</em> than a monolith, because the coupling is now invisible in the code.</p><p>So database-per-service is not a preference; it is the constraint that makes the rest true. And it takes away three things that a relational database was providing for free.</p>'
                },
                {
                    type: 'types',
                    title: 'What you lose, and what replaces each',
                    items: [
                        { name: 'Joins across the boundary', html: '<p>An order and its customer are now in two databases. Replace with: an API call per read, denormalised data kept locally, or a read model built from events — each with its own staleness story.</p>' },
                        { name: 'Foreign keys', html: '<p>Nothing enforces that <code>customer_id</code> exists. Replace with: validation at write time, plus periodic reconciliation, plus code that tolerates a dangling reference — because eventually there will be one.</p>' },
                        { name: 'Transactions', html: '<p>"Reserve stock and take payment" is now two writes in two systems. Replace with: a saga and compensating actions, which is a module of its own later in this track.</p>' },
                        { name: 'One place to query', html: '<p>Reporting across services needs a data warehouse or a read model. This is a real project, and it is routinely left out of the estimate.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>The shared-database compromise is the most common way a microservices migration fails quietly.</strong> Splitting the code and keeping one schema produces something with all of the distributed costs — network calls, no stack trace, partial failure — and none of the independence, because every schema change is still a coordinated release. If the databases cannot be split, the services should not be either; a modular monolith is the honest version of that situation.</p>'
                }
            ],
            docs: [
                { title: 'Database per service', url: 'https://microservices.io/patterns/data/database-per-service.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'microservices', questionId: 'database-per-service' }
            ]
        },

        {
            id: 'the-distributed-monolith',
            title: 'The Distributed Monolith',
            importance: 'must-know',
            summary: 'Services that must be deployed together, called in a chain, and cannot be released independently. Every cost of distribution, none of the benefits, and it is the usual outcome of splitting too early.',
            interviewAngle: 'Being able to describe the symptoms concretely is a strong signal, because it means having been in one.',
            buildsOn: ['database-per-service'],
            blocks: [
                {
                    type: 'types',
                    title: 'The symptoms, any two of which are diagnostic',
                    items: [
                        { name: 'A release train', html: '<p>Services are deployed together, in a fixed order, because a change to one requires a change to another. Independent deployment was the point, and it is gone.</p>' },
                        { name: 'A shared library holding the domain model', html: '<p>Every service depends on <code>common-model</code>, so changing a DTO forces a coordinated upgrade everywhere. The type system has re-coupled what the network separated.</p>' },
                        { name: 'A synchronous chain', html: '<p>A request traverses five services. Availability is the product of five availabilities, latency is the sum, and any one of them being slow is an outage for the whole flow.</p>' },
                        { name: 'One service that everything calls', html: '<p>Usually a "user service" or a "config service". It is a single point of failure with a network in front of it.</p>' },
                        { name: 'No service can be tested alone', html: '<p>Every test needs the others running, so the test suite is an environment rather than a build step.</p>' },
                        { name: 'A shared database', html: '<p>The previous chapter. Sufficient on its own.</p>' }
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>The synchronous chain deserves the arithmetic, because it is the one people underestimate. Five services at 99.9% availability, called in series, give <strong>99.5%</strong> — about three and a half hours of downtime a month against forty-three minutes. Nothing was less reliable; the dependency structure did that.</p><p>The same arithmetic applies to latency: five hops of 20ms is 100ms of network before any work happens, and a p99 that is the <em>sum</em> of five p99s rather than the maximum.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The two escapes are worth naming together. <strong>Asynchronous messaging</strong> removes the availability multiplication — a consumer that is down is a queue that grows rather than a request that fails. <strong>Local data</strong> removes the call entirely: keep the two customer fields you need, updated by events, instead of calling the customer service on every order read. Both trade immediate consistency for availability, which is the trade this whole track is about.</p>'
                }
            ],
            docs: [
                { title: 'Microservice Trade-Offs', url: 'https://martinfowler.com/articles/microservice-trade-offs.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'microservices', questionId: 'distributed-monolith' }
            ]
        },

        {
            id: 'spring-modulith',
            title: 'Spring Modulith',
            importance: 'good-to-know',
            summary: 'Module boundaries inside one Spring application, verified by a test, documented automatically, with an event mechanism that survives a restart.',
            interviewAngle: 'A current-practice signal. It makes the modular monolith a supported architecture rather than a discipline, which is the thing that usually decays.',
            buildsOn: ['the-distributed-monolith'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Boundaries as a failing test, and events that outlive a crash',
                    code: '// Each top-level package under the application package is a module.\n// Types in a module root are public API; types in sub-packages are\n// internal, and the verification refuses a reference to them.\n\n@Test\nvoid modules_are_well_formed() {\n    ApplicationModules.of(ShopApplication.class).verify();\n}\n\n@Test\nvoid write_the_documentation() {\n    new Documenter(ApplicationModules.of(ShopApplication.class))\n            .writeDocumentation();      // module canvas + PlantUML diagrams\n}\n\n// The event mechanism is the part that matters most. @ApplicationModule\n// events are persisted in an event_publication table in the SAME\n// transaction as the business write -- so a listener that fails, or a\n// crash before it ran, leaves an incomplete publication that is retried\n// on startup.\n@Service\nclass OrderService {\n    @Transactional\n    void place(Cart cart) {\n        Order order = repository.save(Order.from(cart));\n        events.publishEvent(new OrderPlaced(order.id()));   // durable\n    }\n}',
                    notes: '<p>That last point is the interesting one architecturally: it is the transactional outbox pattern, applied inside a single application, which gives module-to-module communication the same reliability guarantee that cross-service messaging needs. A monolith built this way has already solved the hardest part of a future split.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The documentation generation is worth more than it sounds. A module canvas and a dependency diagram produced from the code cannot drift from it, which is the failure mode of every architecture diagram drawn in a tool. It is also the artefact that makes a boundary argument in code review concrete rather than aesthetic.</p>'
                }
            ],
            docs: [
                { title: 'Spring Modulith Reference', url: 'https://docs.spring.io/spring-modulith/reference/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'architecture-ddd', questionId: 'package-by-layer-or-feature' }
            ]
        },

        {
            id: 'when-to-split',
            title: 'When to Split',
            importance: 'must-know',
            summary: 'When a specific, named pressure cannot be relieved inside one deployable. Not by team size alone, not by fashion, and not before the boundaries have been tested in packages.',
            interviewAngle: 'The closing answer for the module. A candidate with a test for when to split — and a list of bad reasons — is describing a decision rather than a preference.',
            buildsOn: ['spring-modulith'],
            blocks: [
                {
                    type: 'table',
                    title: 'Reasons, good and bad',
                    headers: ['Reason', 'Verdict', 'Note'],
                    rows: [
                        ['One component needs to scale differently — 100× the traffic, or a GPU', '<strong>Good</strong>', 'This one cannot be solved in a monolith'],
                        ['Teams block each other on releases, repeatedly and measurably', '<strong>Good</strong>', 'The main real reason. Measure it first.'],
                        ['A component genuinely needs another language or runtime', '<strong>Good</strong>', 'Rare, and legitimate when true'],
                        ['One component has a different availability or compliance requirement', '<strong>Good</strong>', 'Isolating payments or PII is a real driver'],
                        ['The codebase is large', 'Bad', 'Modules fix this. Splitting adds distribution to a structure problem.'],
                        ['The build is slow', 'Bad', 'Fix the build. A slow build is not an architecture.'],
                        ['We want to use microservices', 'Bad', 'Not a pressure'],
                        ['We might need to scale later', 'Bad', 'Split when the pressure arrives, from modules you already drew'],
                        ['Everyone else does it', 'Bad', 'They have different team sizes and different traffic']
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>The complete answer, which holds up under follow-ups: <em>"I start with a modular monolith and enforce the boundaries in the build. I split when a specific pressure cannot be relieved inside it — one module needing to scale independently, teams measurably blocking each other, or a compliance boundary. When I split, I take one module out, the one with the clearest boundary and the fewest inbound calls, and I keep the rest. Splitting everything at once means guessing every boundary at the point where I know the least."</em></p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>The costs of a split are paid continuously and the benefits arrive once.</strong> Independent deployment is a step change you get on the day of the split; distributed debugging, saga complexity, contract management and N pipelines are paid by every engineer on every ticket forever. That asymmetry is why "we can always split later" is much safer advice than "we can always merge later" — and merging back is a project almost nobody undertakes.</p>'
                }
            ],
            docs: [
                { title: 'MonolithFirst', url: 'https://martinfowler.com/bliki/MonolithFirst.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'microservices', questionId: 'when-to-split-a-monolith' },
                { topicId: 'behavioural-project', questionId: 'a-tradeoff-you-made' }
            ]
        }
    ]
};
