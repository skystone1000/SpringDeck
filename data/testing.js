/* ==========================================================================
   data/testing.js — Testing

   Flat, and the first topic on the `production` track.

   Testing is the topic where a candidate's answers say the most about how
   they actually work, because almost nobody is wrong about what a unit test
   is and almost everybody has an opinion about how many to write. So the
   questions are weighted towards the decisions — what to mock, where the
   boundary of a test is, why the build got slow — rather than towards API
   recall.

   TWO VERSION LINES THAT DATE AN ANSWER: @MockBean and @SpyBean were
   deprecated in Spring Boot 3.4 in favour of @MockitoBean and
   @MockitoSpyBean; and Testcontainers stopped needing @DynamicPropertySource
   boilerplate in Boot 3.1, when @ServiceConnection arrived.

   ONE GLOBAL PER FILE.
   ========================================================================== */

const testingData = {
    id: 'testing',
    title: 'Testing',
    subsections: null,
    keyTopics: [
        'test pyramid', 'JUnit 5', 'Mockito', '@MockitoBean vs @Mock', 'test slices',
        '@WebMvcTest', '@DataJpaTest', 'Testcontainers', '@Transactional in tests',
        'contract testing', 'flaky tests'
    ],
    questions: [

{
    id: 'the-test-pyramid-honestly',
    importance: 'must-know',
    subsection: null,
    question: 'What is the test pyramid, and do you actually follow it?',
    answer:
        '<p>The pyramid says: many fast unit tests at the bottom, fewer integration tests in the ' +
        'middle, very few end-to-end tests at the top. The reasoning is sound and worth stating ' +
        'as the reasoning rather than the shape — <strong>as you go up, tests get slower, flakier ' +
        'and vaguer about what broke, and better at telling you the system actually works.</strong></p>' +
        '<p>The honest version, and the one worth arguing for: <strong>for a Spring Boot ' +
        'application the middle layer deserves more weight than the classic pyramid gives ' +
        'it.</strong> A service whose job is to accept a request, validate it, run a query and ' +
        'map a response has very little logic that is interesting in isolation. Unit-testing it ' +
        'with every collaborator mocked tests that you wired the mocks up correctly. The bugs ' +
        'live in the wiring, the mapping, the SQL and the transaction boundary — and all four are ' +
        'invisible to a test that mocks them away.</p>' +
        '<p>What makes that affordable now, and it did not used to be: <strong>test slices</strong> ' +
        'start a fraction of the context, and <strong>Testcontainers</strong> gives a real ' +
        'Postgres in a few seconds. The historical argument for mocking everything was that ' +
        'integration tests were slow and needed a shared database; both halves of that have ' +
        'largely gone away.</p>' +
        '<p>Where unit tests are still exactly right: <strong>anything with real logic and ' +
        'branches</strong> — a pricing calculation, a state machine, a parser, a retry policy. ' +
        'Dense assertions, no infrastructure, instant feedback.</p>' +
        '<p>And end-to-end: a handful covering the critical paths, treated as smoke tests. They ' +
        'are the most expensive tests you own and the only ones that prove the deployment ' +
        'works.</p>',
    referenceLinks: [
        { title: 'Spring Boot — Testing', url: 'https://docs.spring.io/spring-boot/reference/testing/index.html' }
    ],
    tags: ['testing', 'strategy', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'what-to-mock',
    importance: 'must-know',
    subsection: null,
    question: 'What should you mock, and what should you not?',
    answer:
        '<p>Two rules cover most of it.</p>' +
        '<p><strong>1. Mock at the boundaries you own, not the ones you do not.</strong> Mocking ' +
        'a third-party client — <code>PaymentGatewayClient</code> — means your test asserts ' +
        'against your <em>belief</em> about how that library behaves. If the belief is wrong the ' +
        'test still passes, which is precisely the situation you were trying to detect. Wrap the ' +
        'third party in an interface you define and mock <strong>your</strong> interface; test the ' +
        'wrapper against the real thing, or against a fake server.</p>' +
        '<p><strong>2. Do not mock what is cheap and real.</strong> A database via Testcontainers ' +
        'and an HTTP call via WireMock are both fast enough now that a mock buys speed you do not ' +
        'need at the cost of fidelity you do. Mocking the repository means never testing the ' +
        'query, which is where a large share of real defects live.</p>' +
        '<p>The vocabulary, since interviewers ask for it:</p>' +
        '<ul>' +
        '<li><strong>Stub</strong> — returns canned answers. No assertions on it.</li>' +
        '<li><strong>Mock</strong> — a stub you also <em>verify</em> was called as expected.</li>' +
        '<li><strong>Spy</strong> — a real object with some methods overridden. Useful, and a ' +
        'frequent smell: needing one often means the class does two things.</li>' +
        '<li><strong>Fake</strong> — a working lightweight implementation, such as an in-memory ' +
        'repository. Underused, and often the best option for a collaborator used by many ' +
        'tests.</li>' +
        '</ul>' +
        '<p>The failure mode to name: <strong>over-verification</strong>. A test that asserts ' +
        'which methods were called in which order is asserting the implementation, so every ' +
        'refactor breaks it while the behaviour is unchanged. That is how a suite becomes a ' +
        'brake. Prefer asserting the outcome, and verify a call only when the call <em>is</em> ' +
        'the outcome — that the email was sent, that the event was published.</p>',
    referenceLinks: [
        { title: 'Mockito — Documentation', url: 'https://javadoc.io/doc/org.mockito/mockito-core/latest/org.mockito/org/mockito/Mockito.html' }
    ],
    tags: ['testing', 'mocking', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'spring-test-slices',
    importance: 'must-know',
    subsection: null,
    question: 'What are test slices, and when would you use @SpringBootTest instead?',
    answer:
        '<p>A slice starts <strong>part</strong> of the application context — the beans one layer ' +
        'needs and nothing else. Faster to start, and the failure points at the layer under ' +
        'test.</p>' +
        '<ul>' +
        '<li><strong><code>@WebMvcTest</code></strong> — controllers, the converters, the ' +
        'validation, the exception handlers and the security filter chain. No services, no ' +
        'repositories: you supply those as <code>@MockitoBean</code>. This is the right test for ' +
        'status codes, JSON shape, request mapping and error responses, driven through ' +
        '<code>MockMvc</code>.</li>' +
        '<li><strong><code>@DataJpaTest</code></strong> — entities, repositories and a ' +
        'transaction manager. Point it at Testcontainers rather than H2 (see below).</li>' +
        '<li><strong><code>@JsonTest</code></strong> — Jackson configuration only. Cheap, and ' +
        'the right place to pin a serialised contract.</li>' +
        '<li><strong><code>@RestClientTest</code></strong> — an outbound client with the server ' +
        'stubbed.</li>' +
        '</ul>' +
        '<p><strong><code>@SpringBootTest</code></strong> starts everything, and is right when ' +
        'the thing under test <em>is</em> the assembly: a request that must travel through the ' +
        'controller, the service, the transaction and the database. With ' +
        '<code>webEnvironment = RANDOM_PORT</code> and <code>TestRestTemplate</code> it goes over ' +
        'a real socket, which also exercises the servlet container and the filters.</p>' +
        '<p>The trap worth knowing: <strong><code>@WebMvcTest</code> loads your security ' +
        'configuration.</strong> A controller test that suddenly returns 401 is usually the ' +
        'filter chain doing its job, and the fix is <code>@WithMockUser</code> or an explicit ' +
        'test security configuration — not disabling security, which stops the test covering ' +
        'the thing most worth covering.</p>' +
        '<p>And the anti-pattern: <code>@SpringBootTest</code> on every test class because it ' +
        'always works. It does, and it makes the build slow enough that people stop running ' +
        'it.</p>',
    referenceLinks: [
        { title: 'Spring Boot — Auto-configured Tests', url: 'https://docs.spring.io/spring-boot/reference/testing/spring-boot-applications.html' }
    ],
    tags: ['testing', 'spring', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'test-context-caching',
    importance: 'must-know',
    subsection: null,
    question: 'The test suite takes twenty minutes and most of it is Spring starting up. Why?',
    answer:
        '<p>Because the <strong>application context cache</strong> is being fragmented, and this ' +
        'is the single highest-value piece of Spring testing knowledge.</p>' +
        '<p>Spring caches contexts across test classes, keyed by the <em>configuration</em> — the ' +
        'classes, the active profiles, the property sources, the mocked beans. Two test classes ' +
        'with identical configuration share one context and it starts once. Any difference is a ' +
        'different key, and a second context is built from scratch.</p>' +
        '<p>What fragments it, in rough order of how often:</p>' +
        '<ul>' +
        '<li><strong>A <code>@MockitoBean</code> that differs between classes.</strong> Each ' +
        'distinct set of mocked beans is a distinct context. One class mocking a different ' +
        'collaborator from its neighbour doubles the startups.</li>' +
        '<li><strong><code>@TestPropertySource</code> or <code>@ActiveProfiles</code> varying ' +
        'per class.</strong></li>' +
        '<li><strong><code>@DirtiesContext</code></strong>, which explicitly evicts the context ' +
        'so the next class rebuilds it. Almost always a workaround for state that should have ' +
        'been cleaned up properly.</li>' +
        '<li><strong>Different slice annotations</strong>, which are different configurations by ' +
        'definition — that part is expected.</li>' +
        '</ul>' +
        '<p>The fixes: <strong>standardise on a small number of test configurations</strong> and ' +
        'have classes inherit from a shared base; put mocks that most tests need into that one ' +
        'shared configuration rather than per class; delete <code>@DirtiesContext</code> and fix ' +
        'the leak instead; and reset mock state with ' +
        '<code>Mockito.reset()</code> in a <code>@BeforeEach</code> rather than by rebuilding ' +
        'the world.</p>' +
        '<p>How to see it rather than guess: turn on ' +
        '<code>logging.level.org.springframework.test.context.cache=DEBUG</code>, which logs the ' +
        'cache size, hits and misses. A suite with thirty misses is a suite that started Spring ' +
        'thirty times, and that number is usually a surprise.</p>',
    referenceLinks: [
        { title: 'Spring Framework — Context Caching', url: 'https://docs.spring.io/spring-framework/reference/testing/testcontext-framework/ctx-management/caching.html' }
    ],
    tags: ['testing', 'spring', 'performance', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'transactional-tests-hide-bugs',
    importance: 'must-know',
    subsection: null,
    question: 'Why does @Transactional on a test hide bugs?',
    answer:
        '<p>Because it makes the test run in <strong>one transaction with one persistence ' +
        'context</strong>, rolled back at the end — and production does not work that way. Four ' +
        'specific classes of bug become invisible.</p>' +
        '<ul>' +
        '<li><strong>Lazy loading always works.</strong> The session is open for the whole test, ' +
        'so a lazy association that would throw <code>LazyInitializationException</code> in a ' +
        'controller resolves happily. This is the classic one: green tests, exception in ' +
        'production on the first request.</li>' +
        '<li><strong>Nothing is ever flushed to the database</strong> unless a query forces it, ' +
        'so a constraint violation, a truncation, or a bad column mapping is never triggered. ' +
        '<code>flush()</code> in the test, or better, do not use the annotation.</li>' +
        '<li><strong>The first-level cache serves your reads.</strong> A repository call returns ' +
        'the same instance you just saved, from memory, so a broken mapping or a missing column ' +
        'passes. It looks like a round trip and is not.</li>' +
        '<li><strong>Propagation behaviour is wrong.</strong> A service method with ' +
        '<code>REQUIRES_NEW</code> joins nothing in production and joins the test transaction ' +
        'here, so exactly the code most worth testing is the code the test does not exercise. ' +
        'Anything asynchronous is worse — the other thread cannot see uncommitted data, so it ' +
        'either fails or silently does nothing.</li>' +
        '</ul>' +
        '<p>The alternative is <strong>let it commit, and clean up explicitly.</strong> ' +
        'Testcontainers makes that cheap: a fresh database per class, or truncation between ' +
        'tests. It is slightly slower and it tests the thing you are shipping.</p>' +
        '<p>The nuance worth adding: <strong>rollback is fine for repository tests</strong> — ' +
        '<code>@DataJpaTest</code> applies it by default and that is reasonable, because the ' +
        'scope really is one persistence context. It is service and controller tests where the ' +
        'annotation changes the meaning of the test.</p>',
    referenceLinks: [
        { title: 'Spring Framework — Transaction Management in Tests', url: 'https://docs.spring.io/spring-framework/reference/testing/testcontext-framework/tx.html' }
    ],
    tags: ['testing', 'transactions', 'jpa', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'testcontainers-over-h2',
    importance: 'must-know',
    subsection: null,
    question: 'Why not use H2 for integration tests?',
    answer:
        '<p>Because <strong>H2 is not the database you deploy on</strong>, and the differences ' +
        'are exactly in the places tests are supposed to be checking.</p>' +
        '<ul>' +
        '<li><strong>SQL dialect.</strong> Window functions, <code>ON CONFLICT</code>, ' +
        '<code>RETURNING</code>, JSONB operators, arrays, <code>SKIP LOCKED</code> — H2\'s ' +
        'compatibility modes approximate some and not others. A native query that works in ' +
        'production fails in the test, so people avoid native queries, which is a test suite ' +
        'shaping the production code.</li>' +
        '<li><strong>Types.</strong> <code>uuid</code>, <code>timestamptz</code>, ' +
        '<code>numeric</code> precision, enums, and text collation all behave differently.</li>' +
        '<li><strong>Locking and isolation.</strong> Deadlocks, lock ordering and serialisation ' +
        'failures are the bugs you most want a test for, and they are the ones that do not ' +
        'reproduce.</li>' +
        '<li><strong>The plan is meaningless.</strong> Nothing about performance transfers.</li>' +
        '<li><strong>Migrations diverge.</strong> Either Flyway scripts get H2-compatible ' +
        'variants — so the migration you tested is not the one that runs — or ' +
        '<code>ddl-auto</code> generates the schema, and then the migrations are never tested at ' +
        'all.</li>' +
        '</ul>' +
        '<p><strong>Testcontainers</strong> removes the reason to compromise: a real Postgres in ' +
        'Docker, started per suite in a few seconds, torn down after. Since <strong>Spring Boot ' +
        '3.1</strong>, <code>@ServiceConnection</code> wires the container to the datasource ' +
        'automatically, so the <code>@DynamicPropertySource</code> boilerplate is gone, and ' +
        '<code>@RestartScope</code> with <code>spring-boot-testcontainers</code> lets a container ' +
        'back local development too.</p>' +
        '<p>Keep it fast with a <strong>singleton container</strong> shared across the suite, and ' +
        'clean between tests by truncating rather than restarting. The honest caveat: it needs a ' +
        'Docker daemon, which is a real constraint in some CI environments and the one legitimate ' +
        'reason teams still reach for H2.</p>',
    referenceLinks: [
        { title: 'Spring Boot — Testcontainers', url: 'https://docs.spring.io/spring-boot/reference/testing/testcontainers.html' }
    ],
    tags: ['testing', 'testcontainers', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: [
        {
            language: 'java',
            title: 'A real Postgres, wired up by one annotation',
            code:
                '@SpringBootTest\n' +
                '@Testcontainers\n' +
                'class OrderIntegrationTest {\n' +
                '\n' +
                '    // static: one container for the whole class, started once\n' +
                '    @Container\n' +
                '    @ServiceConnection                       // Boot 3.1+, no @DynamicPropertySource\n' +
                '    static PostgreSQLContainer<?> postgres =\n' +
                '            new PostgreSQLContainer<>("postgres:16-alpine");\n' +
                '\n' +
                '    @Autowired OrderService orders;\n' +
                '\n' +
                '    @Test\n' +
                '    void placingAnOrderReservesStock() {\n' +
                '        // no @Transactional: this commits, exactly as production does\n' +
                '        var id = orders.place(new PlaceOrder("SKU-1", 2));\n' +
                '        assertThat(orders.find(id).status()).isEqualTo(RESERVED);\n' +
                '    }\n' +
                '}',
            output: {
                kind: 'trace',
                lines: [
                    'Creating container for image: postgres:16-alpine',
                    'Container started in PT2.914S',
                    'Flyway migrations applied: 14'
                ],
                explain:
                    '<p>The migrations run against the same engine and version as production, ' +
                    'which is the half H2 cannot give you: the schema under test is the schema ' +
                    'that will be deployed, not a translation of it.</p>'
            }
        }
    ]
},

{
    id: 'mockitobean-versus-mock',
    importance: 'should-know',
    subsection: null,
    question: 'What is the difference between @Mock and @MockitoBean?',
    answer:
        '<p><strong><code>@Mock</code> creates an object; <code>@MockitoBean</code> replaces a ' +
        'bean in the Spring context.</strong> They belong to different kinds of test and mixing ' +
        'them up produces a mock nothing uses.</p>' +
        '<ul>' +
        '<li><strong><code>@Mock</code></strong>, with <code>@ExtendWith(MockitoExtension.class)</code> ' +
        'and <code>@InjectMocks</code>, is for a plain unit test with no Spring at all. Fast, and ' +
        'the class under test is constructed by Mockito.</li>' +
        '<li><strong><code>@MockitoBean</code></strong> is for a test that has a context. It ' +
        'replaces the real bean everywhere it is injected, so the controller under test gets the ' +
        'mock. Using <code>@Mock</code> here creates an object the context has never heard of and ' +
        'the real bean is still wired in — a test that appears to stub something and does ' +
        'not.</li>' +
        '</ul>' +
        '<p><strong>The names changed:</strong> <code>@MockBean</code> and <code>@SpyBean</code> ' +
        'were deprecated in <strong>Spring Boot 3.4</strong> in favour of ' +
        '<code>@MockitoBean</code> and <code>@MockitoSpyBean</code>, which moved into Spring ' +
        'Framework 6.2 and gained a general <code>@TestBean</code> sibling for supplying a real ' +
        'replacement rather than a mock. The old names still work and will not forever.</p>' +
        '<p>Two things worth knowing beyond the naming. <strong>Prefer constructor injection ' +
        'over <code>@InjectMocks</code></strong> — construct the class under test yourself and ' +
        'pass the mocks in. It is one line, it fails at compile time when a dependency is added, ' +
        'and <code>@InjectMocks</code> silently leaves a field null when it cannot resolve it. ' +
        'And <strong>every <code>@MockitoBean</code> costs a context</strong>, per the caching ' +
        'question, so it is not a free convenience.</p>',
    referenceLinks: [
        { title: 'Spring Framework — Mock Beans in Tests', url: 'https://docs.spring.io/spring-framework/reference/testing/annotations/integration-spring/annotation-mockitobean.html' }
    ],
    tags: ['testing', 'mockito', 'spring', 'versions'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'junit5-features-worth-using',
    importance: 'should-know',
    subsection: null,
    question: 'What does JUnit 5 give you that JUnit 4 did not?',
    answer:
        '<p>The architectural change first, because it explains the rest: JUnit 4\'s ' +
        '<code>@RunWith</code> allowed <strong>one</strong> runner, so Spring and Mockito could ' +
        'not both be a runner and one of them had to be a <code>@Rule</code>. JUnit 5 replaced ' +
        'both with <strong>extensions</strong>, and you can have as many as you like.</p>' +
        '<p>What is worth using day to day:</p>' +
        '<ul>' +
        '<li><strong><code>@ParameterizedTest</code></strong> with ' +
        '<code>@CsvSource</code>, <code>@MethodSource</code> or <code>@EnumSource</code>. Most ' +
        'sets of near-identical test methods are one parameterised test, and each case reports ' +
        'separately.</li>' +
        '<li><strong><code>@Nested</code></strong> — inner classes grouping tests by the state ' +
        'they share, each with its own <code>@BeforeEach</code>. This is the feature that makes a ' +
        'large test class readable.</li>' +
        '<li><strong><code>@DisplayName</code></strong>, so the report reads as sentences rather ' +
        'than as method names.</li>' +
        '<li><strong><code>assertThrows</code> returning the exception</strong>, so you can ' +
        'assert on its message and cause — much better than JUnit 4\'s ' +
        '<code>@Test(expected = ...)</code>, which passed if the exception came from anywhere in ' +
        'the method, including the setup.</li>' +
        '<li><strong><code>assertAll</code></strong> — report every failed assertion in one run ' +
        'instead of stopping at the first.</li>' +
        '<li><strong><code>@TestFactory</code></strong> for dynamic tests, and ' +
        '<code>@Timeout</code>, <code>@Tag</code>, <code>@Disabled</code> with a reason.</li>' +
        '</ul>' +
        '<p>Two practical notes. Test classes and methods <strong>no longer need to be ' +
        'public</strong>, so package-private is the convention. And ' +
        '<code>@BeforeAll</code> must be static unless the class is ' +
        '<code>@TestInstance(PER_CLASS)</code> — which is also how you get one instance per class ' +
        'rather than per method, occasionally useful for expensive setup.</p>' +
        '<p>Worth naming AssertJ alongside: <code>assertThat(x).isEqualTo(y)</code> reads better, ' +
        'and its collection and exception assertions are far richer than the built-in ones. ' +
        'Spring Boot\'s test starter brings it in.</p>',
    referenceLinks: [
        { title: 'JUnit 5 — User Guide', url: 'https://junit.org/junit5/docs/current/user-guide/' }
    ],
    tags: ['testing', 'junit'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'contract-testing',
    importance: 'should-know',
    subsection: null,
    question: 'How do you test that two services still work together without deploying both?',
    answer:
        '<p><strong>Consumer-driven contract testing.</strong> The problem it solves is real and ' +
        'gets worse with every service: end-to-end tests across a fleet are slow, flaky, and ' +
        'require an environment where every service is running a compatible version — which ' +
        'becomes impossible somewhere around a dozen services.</p>' +
        '<p>How it works:</p>' +
        '<ul>' +
        '<li>The <strong>consumer</strong> writes a test against a stub, expressing what it ' +
        'actually uses: this request produces a response with these fields. That expectation is ' +
        'published as a <strong>contract</strong>.</li>' +
        '<li>The <strong>provider</strong>\'s build replays every published contract against the ' +
        'real implementation. If a response no longer satisfies one, <strong>the provider\'s ' +
        'build fails</strong>.</li>' +
        '</ul>' +
        '<p>The two properties that make it worth the machinery: <strong>neither side needs the ' +
        'other running</strong>, and <strong>the provider learns at build time which consumers a ' +
        'change would break</strong>, which is information nobody otherwise has.</p>' +
        '<p>It is also <em>consumer-driven</em> on purpose. The contract covers only what a ' +
        'consumer really uses, so the provider is free to change everything else — which is the ' +
        'opposite of a schema that freezes the whole response.</p>' +
        '<p>The tools: <strong>Pact</strong>, with a broker holding the contracts and the "can I ' +
        'deploy" check that makes it usable in a pipeline; and <strong>Spring Cloud Contract</strong>, ' +
        'which is provider-driven by default — the provider writes the contract and a consumer ' +
        'stub is generated from it.</p>' +
        '<p>The honest cost: it is real infrastructure and a workflow both teams must follow. For ' +
        'two services owned by one team it is more ceremony than value, and a shared integration ' +
        'test does the job.</p>',
    referenceLinks: [
        { title: 'Spring Cloud Contract — Reference', url: 'https://docs.spring.io/spring-cloud-contract/reference/' }
    ],
    tags: ['testing', 'contracts', 'microservices'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'flaky-tests',
    importance: 'must-know',
    subsection: null,
    question: 'A test fails about one run in twenty. What do you do?',
    answer:
        '<p>The wrong answer, and the common one, is to add a retry. A flaky test is ' +
        '<strong>information</strong> — often about a real race in the production code — and ' +
        'retrying deletes the information while leaving the bug.</p>' +
        '<p>The worse consequence is cultural: once a suite has flaky tests, every red build is ' +
        'assumed to be flake, and a genuine failure gets re-run until it goes green. The suite ' +
        'has then stopped working, and it takes a while for anyone to notice.</p>' +
        '<p><strong>The usual causes</strong>, and each has a real fix:</p>' +
        '<ul>' +
        '<li><strong>Shared mutable state between tests</strong> — a static field, a database row ' +
        'a previous test left, a cache. The tell is that it only fails in a particular ' +
        'order.</li>' +
        '<li><strong>Order dependence.</strong> Run the suite in random order deliberately and ' +
        'find these on purpose rather than by luck.</li>' +
        '<li><strong>Time.</strong> A test asserting on <code>now()</code>, or one that breaks at ' +
        'midnight, over a month boundary, or in another timezone. Inject a ' +
        '<code>Clock</code>.</li>' +
        '<li><strong><code>Thread.sleep</code> as synchronisation.</strong> The sleep is either ' +
        'too short on a loaded CI machine or too long everywhere else. Use Awaitility and poll ' +
        'for the condition.</li>' +
        '<li><strong>Real concurrency.</strong> Often a genuine race in the code under test, and ' +
        'this is the case worth being pleased about.</li>' +
        '<li><strong>The network</strong>, or a shared environment somebody else is also ' +
        'using.</li>' +
        '</ul>' +
        '<p>The process that works: <strong>quarantine, do not ignore.</strong> Move it out of ' +
        'the blocking suite so it stops training people to ignore red, file it with an owner and ' +
        'a date, and fix it. A quarantine with no exit is a delete with extra steps, and deleting ' +
        'it honestly is better than pretending it still covers something.</p>',
    referenceLinks: [
        { title: 'Awaitility', url: 'https://github.com/awaitility/awaitility/wiki/Usage' }
    ],
    tags: ['testing', 'ci', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'what-coverage-tells-you',
    importance: 'should-know',
    subsection: null,
    question: 'Is 80% code coverage a good target?',
    answer:
        '<p>It is a useful <em>signal</em> and a bad <em>target</em>, and the distinction is what ' +
        'the question is testing.</p>' +
        '<p>Coverage measures which lines executed. It does not measure whether anything was ' +
        '<strong>asserted</strong>. A test that calls every method and asserts nothing at all ' +
        'reports 100%, and the standard demonstration is deleting every assertion from a suite: ' +
        'coverage is unchanged.</p>' +
        '<p>What it is genuinely good for:</p>' +
        '<ul>' +
        '<li><strong>Finding what is not covered at all.</strong> A file at 0% is worth a ' +
        'conversation. That is the useful direction — low coverage is evidence, high coverage is ' +
        'not.</li>' +
        '<li><strong>Coverage on the diff.</strong> "New code must be covered" is a far better ' +
        'rule than a global percentage, because it improves things over time without a project ' +
        'to retrofit tests onto code nobody remembers.</li>' +
        '<li><strong>Branch coverage over line coverage.</strong> A ternary or a short-circuit is ' +
        'one line and two paths.</li>' +
        '</ul>' +
        '<p>What goes wrong when it is a target: people write tests for getters and generated ' +
        'code, add <code>@Generated</code> to exclude things, and test the easy 20% that was ' +
        'never going to break — while the hard, branchy, actually-risky code stays uncovered ' +
        'because covering it is work. <strong>Goodhart\'s law applied to a build.</strong></p>' +
        '<p>The better questions to answer instead: <strong>are the critical paths tested? Does a ' +
        'failing test tell you what broke? When a bug reaches production, is a regression test ' +
        'the first thing written?</strong> And if you want to know whether the assertions are ' +
        'real, <strong>mutation testing</strong> — PIT — is the tool that actually measures it, ' +
        'by changing the code and checking that a test notices.</p>',
    referenceLinks: [
        { title: 'PIT Mutation Testing', url: 'https://pitest.org/' }
    ],
    tags: ['testing', 'metrics', 'judgement'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
}

    ]
};
