/* ==========================================================================
   data/theory/testing-spring.js — module 76 in the reading path

   The plan's tagline names the three things: slices, Testcontainers, and the
   transaction that hides your bug. Nine chapters, and the third of those is
   the one to read twice — @Transactional on a test is a convenience that
   changes the behaviour of the code under test, and it hides the two defects
   an integration test most needs to find.

   The context-caching chapter is the other one with disproportionate value.
   Test suite duration in a Spring application is very largely a function of
   how many distinct application contexts get built, and almost nobody knows
   that is what they are paying for.
   ========================================================================== */

const testingSpringModule = {
    id: 'testing-spring',
    trackId: 'production',
    order: 76,
    title: 'Testing a Spring Boot Application',
    tagline: 'Slices, Testcontainers, and the transaction that hides your bug.',
    estimatedMinutes: 45,
    prerequisites: ['testing-pyramid', 'spring-transactional'],
    docHub: { title: 'Spring Boot — Testing', url: 'https://docs.spring.io/spring-boot/reference/testing/index.html' },

    chapters: [
        {
            id: 'springboottest-vs-slices',
            title: '@SpringBootTest and the Slices',
            importance: 'must-know',
            summary: 'The full annotation starts the whole application. A slice starts one layer with the beans that layer needs, which is much faster and tests much less.',
            interviewAngle: 'The trade is scope against speed. Knowing which slice exists for which layer, and that a slice does not load your other beans, is the practical half.',
            buildsOn: [],
            blocks: [
                {
                    type: 'table',
                    title: 'The slices, and what each one loads',
                    headers: ['Annotation', 'Loads', 'Does not load', 'For'],
                    rows: [
                        ['<code>@SpringBootTest</code>', '<strong>Everything</strong>', '—', 'A full flow, or when a slice does not fit'],
                        ['<code>@WebMvcTest</code>', 'Controllers, filters, converters, advice', 'Services, repositories, the data source', 'The web layer: routing, binding, status codes'],
                        ['<code>@DataJpaTest</code>', 'Entities, repositories, an embedded or configured data source', 'Controllers, services', 'Queries and mappings'],
                        ['<code>@JdbcTest</code>', '<code>JdbcTemplate</code> and a data source', 'JPA', 'Plain SQL'],
                        ['<code>@JsonTest</code>', 'Jackson configuration only', 'Everything else', 'Serialisation shape'],
                        ['<code>@RestClientTest</code>', 'A client plus <code>MockRestServiceServer</code>', 'Everything else', 'An outbound HTTP client'],
                        ['<code>@DataRedisTest</code>, <code>@DataMongoTest</code>', 'That store\'s support', 'Everything else', 'That store']
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>The choice is not only speed. A slice is <em>narrower</em>, so a failure in a <code>@WebMvcTest</code> is a web-layer failure and cannot be anything else — the diagnostic precision argument from the pyramid module, applied inside the framework.</p><p>The cost is that a slice will not start unless every bean it does load can be satisfied, so a controller with a service dependency needs that service supplied as a test double. That is a feature rather than a nuisance: it is what keeps the test about the controller.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong><code>@SpringBootTest</code> everywhere is the most common cause of a slow Spring test suite.</strong> Each one starts the whole application — every auto-configuration, every connection pool, every scheduled task — and the tests that use it are usually testing one class. Reach for a slice first, and for a plain unit test before that; the full context is for the handful of tests that genuinely need the whole thing wired.</p>'
                }
            ],
            docs: [
                { title: 'Spring Boot — Test Auto-configuration', url: 'https://docs.spring.io/spring-boot/reference/testing/spring-boot-applications.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'testing', questionId: 'spring-test-slices' }
            ]
        },

        {
            id: 'webmvctest',
            title: '@WebMvcTest',
            importance: 'must-know',
            summary: 'The controller, the argument resolution, the validation, the serialisation and the exception handling — with everything below the controller supplied as a double.',
            interviewAngle: 'What it does and does not cover is the substance: it exercises the whole web layer including @ControllerAdvice, and it exercises no business logic at all.',
            buildsOn: ['springboottest-vs-slices'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Testing the layer, not the service',
                    code: '@WebMvcTest(OrderController.class)\nclass OrderControllerTest {\n\n    @Autowired MockMvc mockMvc;\n\n    @MockitoBean OrderService orders;      // Boot 3.4+; @MockBean before that\n\n    @Test\n    void returns_400_with_a_problem_body_for_an_invalid_request() throws Exception {\n        mockMvc.perform(post("/api/orders")\n                        .contentType(APPLICATION_JSON)\n                        .content("""\n                                { "customerRef": "", "lines": [] }\n                                """))\n                .andExpect(status().isBadRequest())\n                .andExpect(content().contentType("application/problem+json"))\n                .andExpect(jsonPath("$.title").value("Bad Request"));\n\n        verifyNoInteractions(orders);      // it never reached the service\n    }\n\n    @Test\n    void maps_a_domain_exception_to_404() throws Exception {\n        when(orders.byId("ord_1")).thenThrow(new OrderNotFound("ord_1"));\n\n        mockMvc.perform(get("/api/orders/ord_1"))\n                .andExpect(status().isNotFound());   // the @ControllerAdvice ran\n    }\n}',
                    notes: '<p>The second test is the one this slice is best at: it proves the exception-to-status mapping works, which is web-layer behaviour that a service unit test cannot reach and a full <code>@SpringBootTest</code> would take twenty times longer to verify.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Name the controller — <code>@WebMvcTest(OrderController.class)</code> — rather than leaving it bare. Without the argument the slice loads <em>every</em> controller in the application, which means every one of their dependencies must be mocked and the context is both slower and shared with tests for unrelated controllers.</p>'
                }
            ],
            docs: [
                { title: 'Testing the Web Layer', url: 'https://docs.spring.io/spring-boot/reference/testing/spring-boot-applications.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'testing', questionId: 'spring-test-slices' }
            ]
        },

        {
            id: 'datajpatest',
            title: '@DataJpaTest',
            importance: 'must-know',
            summary: 'Entities, repositories and a data source. It is transactional and rolls back by default, which is convenient and is the source of the next-but-one chapter\'s problem.',
            interviewAngle: 'The default of an embedded database is the trap. Pointing it at the real engine with Testcontainers is what makes the slice worth having.',
            buildsOn: ['webmvctest'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Against the real engine, not an embedded stand-in',
                    code: '@DataJpaTest\n@AutoConfigureTestDatabase(replace = NONE)   // <-- do NOT swap in H2\n@Testcontainers\nclass OrderRepositoryTest {\n\n    @Container\n    @ServiceConnection                       // Boot 3.1+: wires the URL for you\n    static PostgreSQLContainer<?> postgres =\n            new PostgreSQLContainer<>("postgres:16-alpine");\n\n    @Autowired OrderRepository orders;\n    @Autowired TestEntityManager em;\n\n    @Test\n    void finds_confirmed_orders_for_one_customer() {\n        em.persist(anOrder().forCustomer("c1").withStatus(CONFIRMED).build());\n        em.persist(anOrder().forCustomer("c1").withStatus(DRAFT).build());\n        em.persist(anOrder().forCustomer("c2").withStatus(CONFIRMED).build());\n        em.flush();                          // force the INSERTs to run\n        em.clear();                          // and read from the DATABASE\n\n        var found = orders.findByCustomerIdAndStatus("c1", CONFIRMED);\n\n        assertEquals(1, found.size());\n    }\n}',
                    notes: '<p><code>flush()</code> then <code>clear()</code> is the pair that makes this test mean something. Without them the persistence context still holds the entities and the repository call may be answered from the first-level cache — so the query is never executed and a broken one passes. This is the single most common way a repository test tests nothing.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong><code>@DataJpaTest</code> replaces your data source with an embedded database by default</strong>, which is the H2 problem from the previous module arriving as a framework default rather than a decision. <code>@AutoConfigureTestDatabase(replace = NONE)</code> plus a container is what makes the slice test your actual SQL — and <code>@ServiceConnection</code> since Boot 3.1 removes the property-source boilerplate that used to make this awkward.</p>'
                }
            ],
            docs: [
                { title: 'Testing with a real database', url: 'https://docs.spring.io/spring-boot/reference/testing/testcontainers.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'testing', questionId: 'testcontainers-over-h2' }
            ]
        },

        {
            id: 'mockitobean-vs-mock',
            title: '@MockitoBean Against @Mock',
            importance: 'must-know',
            summary: '@Mock creates an object. @MockitoBean replaces a bean in the application context — and doing so makes that context different, which has a cost the next chapter explains.',
            interviewAngle: 'Two facts: the annotation was renamed in Boot 3.4, and every distinct set of bean overrides creates a separate cached context.',
            buildsOn: ['datajpatest'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'Two annotations that look interchangeable',
                    left: '@Mock (Mockito)',
                    right: '@MockitoBean (Spring)',
                    rows: [
                        { aspect: 'Creates', left: 'A mock object', right: 'A mock object <strong>and puts it in the context</strong>' },
                        { aspect: 'Needs a Spring context', left: 'No', right: 'Yes' },
                        { aspect: 'Injected into', left: 'The test, via <code>@InjectMocks</code>', right: 'Every bean that depends on that type' },
                        { aspect: 'Effect on the context cache', left: 'None', right: '<strong>A new cache key — a separate context is built</strong>' },
                        { aspect: 'Speed', left: 'Instant', right: 'The cost of a context' },
                        { aspect: 'Use for', left: 'Plain unit tests', right: 'Replacing a collaborator inside an integration test' }
                    ]
                },
                {
                    type: 'version',
                    title: 'The rename, which is recent',
                    items: [
                        { version: 'Spring Boot 3.3 and earlier', state: 'was', html: '<p><code>@MockBean</code> and <code>@SpyBean</code>, from Spring Boot.</p>' },
                        { version: 'Spring Framework 6.2 / Boot 3.4', state: 'changed', html: '<p><strong><code>@MockitoBean</code> and <code>@MockitoSpyBean</code></strong>, moved into Spring Framework itself alongside a general <code>@TestBean</code>. The Boot annotations are deprecated.</p>' },
                        { version: 'Current', state: 'is', html: '<p>Use <code>@MockitoBean</code>. Knowing the rename happened, and why — the mechanism became framework-level rather than Boot-level — is a small currency signal.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>Prefer a plain <code>@Mock</code> and a constructor call wherever the class under test does not need the container. It is instant, it needs no context, and it does not fragment the context cache. <code>@MockitoBean</code> is for when the framework has to be involved — testing a controller through <code>MockMvc</code>, or a service whose transactional or cached behaviour is part of the test.</p>'
                }
            ],
            docs: [
                { title: 'Mocking and Spying Beans', url: 'https://docs.spring.io/spring-boot/reference/testing/spring-boot-applications.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'testing', questionId: 'mockitobean-versus-mock' }
            ]
        },

        {
            id: 'test-context-caching',
            title: 'The Context Cache',
            importance: 'must-know',
            summary: 'Spring caches an application context and reuses it across test classes with the same configuration. Suite duration is largely a function of how many distinct contexts get built.',
            interviewAngle: 'Almost nobody knows this is what they are paying for, and it is the single highest-leverage optimisation available on a slow Spring test suite.',
            buildsOn: ['mockitobean-vs-mock'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>Starting a Spring context takes seconds. Spring therefore caches contexts across test classes, keyed by the <em>configuration</em> — the classes, the active profiles, the properties, the bean overrides. Two test classes with identical configuration share one context and the second one starts instantly.</p><p>Change anything in that key and you get a second context. A suite with forty test classes and thirty distinct configurations spends most of its time starting Spring, and the tests themselves are almost free.</p>'
                },
                {
                    type: 'table',
                    title: 'What creates a new context',
                    headers: ['Difference', 'New context?'],
                    rows: [
                        ['A different set of <code>@MockitoBean</code> types', '<strong>Yes</strong>'],
                        ['A different <code>@ActiveProfiles</code>', 'Yes'],
                        ['<code>@TestPropertySource</code> with different properties', 'Yes'],
                        ['A different slice annotation', 'Yes'],
                        ['<code>@DirtiesContext</code>', '<strong>Yes — and it evicts the cached one</strong>'],
                        ['Different test classes, same configuration', 'No — shared, which is the point']
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>Two habits collapse a fragmented suite. Define a small number of <strong>shared base configurations</strong> — one full integration setup, one web slice, one data slice — and have test classes extend them rather than each declaring its own properties and overrides. And treat <code>@DirtiesContext</code> as a last resort: it does not merely build a new context, it <em>evicts</em> the cached one, so every subsequent test class that would have reused it pays to build it again.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Sharing a context means sharing mutable state.</strong> A cache populated by one test class, a scheduled task that ran, a bean whose field was modified — all of it persists into the next class that reuses the context, which is how a test passes alone and fails in the suite. The answer is to reset state in <code>@BeforeEach</code>, not to reach for <code>@DirtiesContext</code>, which trades a correctness problem for a duration problem.</p>'
                }
            ],
            docs: [
                { title: 'Context Caching', url: 'https://docs.spring.io/spring-framework/reference/testing/testcontext-framework/ctx-management/caching.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'testing', questionId: 'test-context-caching' }
            ]
        },

        {
            id: 'testcontainers',
            title: 'Testcontainers',
            importance: 'must-know',
            summary: 'Start the real dependency in a container for the test run. It removed the last argument for testing against a database you do not deploy.',
            interviewAngle: 'The reuse and singleton patterns are what make it fast enough to use everywhere, and knowing them separates having used it from having read about it.',
            buildsOn: ['test-context-caching'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'One container for the whole suite',
                    code: '// A shared abstract base: ONE container, ONE context configuration,\n// so every test class that extends it reuses both.\n@SpringBootTest\n@Testcontainers\npublic abstract class IntegrationTest {\n\n    // static: started once per JVM, not once per test class.\n    @Container\n    @ServiceConnection\n    static PostgreSQLContainer<?> postgres =\n            new PostgreSQLContainer<>("postgres:16-alpine");\n\n    @Container\n    @ServiceConnection\n    static KafkaContainer kafka =\n            new KafkaContainer(DockerImageName.parse("confluentinc/cp-kafka:7.6.0"));\n}\n\nclass OrderFlowTest extends IntegrationTest {\n    // no container setup, no property wiring, and the context is shared\n}\n\n// Locally, ~/.testcontainers.properties:\n//   testcontainers.reuse.enable=true\n// plus .withReuse(true) keeps the container ALIVE between runs, which\n// takes a repeated suite from ~15s of startup to nearly none. Off in\n// CI, where a fresh container per run is what you want.',
                    notes: '<p><code>@ServiceConnection</code>, from Boot 3.1, is the piece that removed most of the friction: it derives the JDBC URL, the bootstrap servers and the credentials from the container and feeds them to the context, replacing the <code>@DynamicPropertySource</code> block that everybody used to copy between projects.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Pin the image tag to the version you run in production — <code>postgres:16-alpine</code>, not <code>postgres:latest</code>. Testing against a different major version than you deploy reintroduces the H2 problem in a subtler form, and <code>latest</code> means the suite can start failing on a morning when nothing in the repository changed.</p>'
                }
            ],
            docs: [
                { title: 'Testcontainers for Java', url: 'https://java.testcontainers.org/', kind: 'guide' },
                { title: 'Spring Boot — Testcontainers', url: 'https://docs.spring.io/spring-boot/reference/testing/testcontainers.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'testing', questionId: 'testcontainers-over-h2' }
            ]
        },

        {
            id: 'transactional-tests-and-rollback',
            title: 'The Transaction That Hides Your Bug',
            importance: 'must-know',
            summary: '@Transactional on a test rolls back afterwards, which keeps the database clean and changes the behaviour of the code under test in two ways that matter.',
            interviewAngle: 'The most valuable chapter in the module. A test that passes because it never flushed is a test that hides the constraint violation production will hit.',
            buildsOn: ['testcontainers'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p><code>@Transactional</code> on a test method wraps it in a transaction that is rolled back at the end. That is genuinely convenient — no cleanup, no test pollution — and it changes two things about how the code under test behaves.</p><p><strong>Everything shares one persistence context.</strong> The entity the test saved is still managed, so a subsequent read is answered from the first-level cache and the query never runs. A broken query passes.</p><p><strong>Nothing is ever committed.</strong> Deferred constraints, commit-time triggers, and anything an <code>AFTER_COMMIT</code> listener does never happen — so the code path that fires in production is not exercised at all.</p>'
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'What the rollback hides, and what to do instead',
                    code: '@SpringBootTest\n@Transactional                       // convenient, and it hides things\nclass OrderServiceTest {\n\n    @Test\n    void saves_the_order() {\n        service.place(cart);\n        assertEquals(1, orders.count());   // passes -- from the SAME context\n    }                                      // rolled back; nothing committed\n}\n\n// What it hides:\n//   - a unique constraint that would fire on flush\n//   - a not-null column the entity does not set\n//   - @TransactionalEventListener(AFTER_COMMIT) never running\n//   - lazy loading working, because the session is still open\n\n// Fix 1: force the write and detach, so reads go to the database.\nentityManager.flush();\nentityManager.clear();\n\n// Fix 2: do not use a test transaction. Commit for real and clean up\n// explicitly -- slower, and it tests what production does.\n@SpringBootTest\nclass OrderServiceCommitTest {\n    @AfterEach void cleanUp() { jdbc.execute("truncate orders cascade"); }\n}',
                    output: {
                        kind: 'trace',
                        lines: [
                            'With @Transactional: the assertion reads through the persistence context. The SELECT may never be issued.',
                            'With @Transactional: no COMMIT, so deferred constraints and AFTER_COMMIT listeners never fire.',
                            'With @Transactional: the session stays open, so lazy associations initialise and a LazyInitializationException never appears.',
                            'Production has none of those properties. The test is green and the code path it covers is not the one that runs.'
                        ],
                        explain: '<p>The third line is the one that catches teams repeatedly: a transactional test proves nothing about lazy loading, because the exact condition that produces <code>LazyInitializationException</code> — the session being closed before serialisation — cannot occur inside it.</p>'
                    }
                },
                {
                    type: 'tip',
                    html: '<p>A reasonable policy: use <code>@Transactional</code> for repository-level tests, and <strong>always</strong> <code>flush()</code> and <code>clear()</code> before asserting. Do not use it for service-level or flow-level tests, where the commit is part of the behaviour — clean up with a truncate instead. The convenience is real; it just must not be applied to the tests whose whole purpose is to exercise what happens at commit.</p>'
                }
            ],
            docs: [
                { title: 'Transaction Management in Tests', url: 'https://docs.spring.io/spring-framework/reference/testing/testcontext-framework/tx.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'testing', questionId: 'transactional-tests-hide-bugs' },
                { topicId: 'transactions', questionId: 'testing-transactions' }
            ]
        },

        {
            id: 'testing-security',
            title: 'Testing Secured Endpoints',
            importance: 'should-know',
            summary: 'The security filter chain is not in a @WebMvcTest unless you ask for it, and the tests that matter are the ones asserting denial.',
            interviewAngle: 'The false-pass risk is the point: a test that only exercises the permitted case passes whether or not the rule exists.',
            buildsOn: ['transactional-tests-and-rollback'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'With the chain applied, and asserting the denial',
                    code: '@WebMvcTest(OrderController.class)\n@Import(SecurityConfig.class)          // the slice does NOT load it otherwise\nclass OrderControllerSecurityTest {\n\n    @Autowired MockMvc mockMvc;\n    @MockitoBean OrderService orders;\n\n    @Test\n    void an_anonymous_caller_is_refused() throws Exception {\n        mockMvc.perform(get("/api/orders/ord_1"))\n                .andExpect(status().isUnauthorized());\n    }\n\n    @Test\n    void a_reader_may_not_approve() throws Exception {\n        mockMvc.perform(post("/api/orders/ord_1/approve")\n                        .with(jwt().authorities(\n                                new SimpleGrantedAuthority("SCOPE_orders.read")))\n                        .with(csrf()))\n                .andExpect(status().isForbidden());\n    }\n\n    @Test\n    void an_approver_may() throws Exception {\n        mockMvc.perform(post("/api/orders/ord_1/approve")\n                        .with(jwt().authorities(\n                                new SimpleGrantedAuthority("SCOPE_orders.approve")))\n                        .with(csrf()))\n                .andExpect(status().isOk());\n    }\n}',
                    notes: '<p><code>.with(jwt())</code> builds a resource-server authentication without needing an authorization server, and <code>.with(csrf())</code> supplies a valid token for a state-changing request. Without the second, a CSRF-protected endpoint returns 403 and the test appears to prove an authorization rule that was never reached — a false pass that looks like a security test.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Only the denial tests actually test the rule.</strong> Delete the <code>@PreAuthorize</code> and the permitted-case test still passes; the denied-case test goes red immediately. A security test suite made only of happy paths is a suite that will not notice when the annotation is removed in a refactor — which is exactly when you need it to.</p>'
                }
            ],
            docs: [
                { title: 'Spring Security — Testing', url: 'https://docs.spring.io/spring-security/reference/servlet/test/index.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-security', questionId: 'method-security-and-preauthorize' }
            ]
        },

        {
            id: 'testing-kafka-consumers',
            title: 'Testing a Consumer',
            importance: 'should-know',
            summary: 'Asynchronous by nature, so the test must wait for a condition rather than sleep. And the consumer\'s idempotency is the property most worth asserting.',
            interviewAngle: 'The awaiting pattern is the practical detail, and testing the duplicate delivery is the one that shows the messaging modules were understood.',
            buildsOn: ['testing-security'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Publish, await, and then assert the duplicate is absorbed',
                    code: 'class OrderConsumerTest extends IntegrationTest {   // container base class\n\n    @Autowired KafkaTemplate<String, OrderPlaced> template;\n    @Autowired ReservationRepository reservations;\n\n    @Test\n    void reserves_stock_when_an_order_is_placed() {\n        template.send("orders.placed", "ord_1", new OrderPlaced("ord_1", LINES));\n\n        // Await a CONDITION. Never Thread.sleep -- it is either too\n        // short on a loaded machine or too slow on every other run.\n        await().atMost(Duration.ofSeconds(10))\n               .untilAsserted(() ->\n                       assertEquals(1, reservations.countByOrderId("ord_1")));\n    }\n\n    @Test\n    void absorbs_a_duplicate_delivery() {\n        var event = new OrderPlaced("ord_2", LINES);\n        template.send("orders.placed", "ord_2", event);\n        template.send("orders.placed", "ord_2", event);   // the SAME event\n\n        await().atMost(Duration.ofSeconds(10))\n               .untilAsserted(() ->\n                       assertEquals(1, reservations.countByOrderId("ord_2")));\n\n        // And it stays 1 -- the second delivery did not create a second.\n        await().during(Duration.ofSeconds(2))\n               .untilAsserted(() ->\n                       assertEquals(1, reservations.countByOrderId("ord_2")));\n    }\n}',
                    notes: '<p>The second test is the one worth writing. At-least-once delivery guarantees a duplicate will eventually arrive in production, and the idempotency that absorbs it is application code that can be broken by a refactor — so it needs a test, and <code>during</code> rather than <code>until</code> is what asserts that the count <em>stayed</em> at one rather than briefly being right.</p>'
                },
                {
                    type: 'tip',
                    html: '<p><code>@EmbeddedKafka</code> is faster to start than a container and is a different broker implementation from the one you deploy. It is a reasonable choice for testing listener wiring and serialisation; for anything involving consumer groups, rebalancing or offset behaviour, use a container — the same reasoning as H2 against PostgreSQL, one layer up.</p>'
                }
            ],
            docs: [
                { title: 'Spring for Apache Kafka — Testing', url: 'https://docs.spring.io/spring-kafka/reference/testing.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'kafka-messaging', questionId: 'idempotent-consumer-implementation' }
            ]
        }
    ]
};
