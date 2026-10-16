/* ==========================================================================
   data/theory/testing-pyramid.js — module 75 in the reading path

   The plan's tagline is the register: the pyramid, and the honest version of
   it. Seven chapters, and the honest version is that the shape is an
   argument about FEEDBACK SPEED rather than a quota, and that the ratios
   quoted with it were never measured.

   Two chapters carry more weight than the others. What not to mock, because
   over-mocking produces a suite that passes while the application is broken
   — the most expensive testing failure there is. And flaky tests, because a
   suite people have learned to re-run has stopped being a signal, and the
   causes are a short and recognisable list.
   ========================================================================== */

const testingPyramidModule = {
    id: 'testing-pyramid',
    trackId: 'production',
    order: 75,
    title: 'What to Test, and Where',
    tagline: 'The pyramid, and the honest version of it.',
    estimatedMinutes: 35,
    prerequisites: ['rest-api-design'],
    docHub: { title: 'JUnit User Guide', url: 'https://docs.junit.org/current/overview.html' },

    chapters: [
        {
            id: 'unit-integration-e2e',
            title: 'The Pyramid, and What It Is Really Saying',
            importance: 'must-know',
            summary: 'More fast tests than slow ones. The shape is an argument about feedback speed and diagnostic precision, not a ratio anybody measured.',
            interviewAngle: 'Reciting the layers is table stakes. Saying what the shape is FOR — and that the layer names mean different things to different teams — is the answer.',
            buildsOn: [],
            blocks: [
                {
                    type: 'table',
                    title: 'The layers, by the properties that actually differ',
                    headers: ['Layer', 'Speed', 'When it fails you know', 'Confidence it gives'],
                    rows: [
                        ['Unit', 'Milliseconds', '<strong>Exactly which class is wrong</strong>', 'That one piece of logic is right'],
                        ['Integration', 'Hundreds of ms to seconds', 'Which component boundary broke', 'That the pieces fit — SQL, mapping, serialisation'],
                        ['End-to-end', 'Seconds to minutes', '<strong>Something, somewhere</strong>', 'That the whole thing works'],
                        ['Manual', 'Minutes to hours', 'It looked wrong', 'That a person can use it']
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>The third column is the argument. A unit test that fails names the defect; an end-to-end test that fails starts an investigation. Both are worth having and one of them is much cheaper to act on, which is why you want more of it.</p><p>The second reason is arithmetic: a thousand unit tests run in a few seconds and a thousand end-to-end tests run in hours. A suite that takes an hour is a suite developers stop running, which converts a fast feedback loop into a slow one and then into none.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>"Unit test" means different things and arguing about the word wastes the conversation.</strong> One school says a unit is a class and everything it touches is a mock; another says a unit is a behaviour and its collaborators are real as long as nothing crosses a process boundary. The second produces far fewer, far more useful tests. When asked, define the term you are using and move on — the interesting question is what you mock, which is two chapters away.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The honest version to offer: <em>"I aim for a lot of fast tests that tell me exactly what broke, a meaningful layer of integration tests that use a real database because that is where most of my bugs are, and a handful of end-to-end tests over the critical journeys. I do not have a target ratio — the shape falls out of keeping the suite fast enough that people run it."</em></p>'
                }
            ],
            docs: [
                { title: 'TestPyramid', url: 'https://martinfowler.com/bliki/TestPyramid.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'testing', questionId: 'the-test-pyramid-honestly' }
            ]
        },

        {
            id: 'junit5-essentials',
            title: 'The JUnit 5 Features Worth Using',
            importance: 'should-know',
            summary: 'Lifecycle annotations, assertThrows, assertAll, nested classes, display names and extensions. Six things, and most codebases use two of them.',
            interviewAngle: 'A currency check. Knowing that JUnit 5 is three modules and that @Test moved package is the small detail; the useful half is assertAll and @Nested.',
            buildsOn: ['unit-integration-e2e'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The features that change how a test reads',
                    code: '@DisplayName("Order pricing")\nclass OrderPricingTest {\n\n    @Nested\n    @DisplayName("when the customer has no discount")\n    class NoDiscount {\n\n        @Test\n        @DisplayName("charges the list price")\n        void charges_list_price() {\n            // assertAll reports EVERY failure, not just the first --\n            // so one run tells you all three numbers are wrong rather\n            // than making you fix them one test run at a time.\n            Quote quote = pricing.quote(order);\n            assertAll(\n                    () -> assertEquals(Money.of(4299), quote.net()),\n                    () -> assertEquals(Money.of(860),  quote.tax()),\n                    () -> assertEquals(Money.of(5159), quote.gross()));\n        }\n    }\n\n    @Test\n    void rejects_a_negative_quantity() {\n        // The exception object is returned, so the MESSAGE can be\n        // asserted too -- which is what stops this passing for the\n        // wrong reason when a different IllegalArgumentException fires.\n        var ex = assertThrows(IllegalArgumentException.class,\n                () -> new Line(SKU, -1));\n        assertTrue(ex.getMessage().contains("quantity"));\n    }\n}',
                    notes: '<p><code>assertThrows</code> returning the exception is the detail worth using: asserting only the type means the test passes when a completely unrelated <code>IllegalArgumentException</code> is thrown from somewhere else in the call, which is a false pass that looks like coverage.</p>'
                },
                {
                    type: 'tip',
                    html: '<p><code>@Nested</code> is under-used and it is what makes a class with twenty tests navigable: group by precondition — "when the cart is empty", "when the customer is blocked" — and the shared setup for each group lives in that group\'s <code>@BeforeEach</code>. The alternative is twenty flat methods with names that carry the whole context and setup repeated in each.</p>'
                }
            ],
            docs: [
                { title: 'JUnit User Guide', url: 'https://docs.junit.org/current/overview.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'testing', questionId: 'junit5-features-worth-using' }
            ]
        },

        {
            id: 'mockito-and-what-to-mock',
            title: 'Mockito, and What It Is For',
            importance: 'must-know',
            summary: 'Replace a collaborator you cannot control or cannot afford. Verify an interaction only when the interaction is the thing being tested.',
            interviewAngle: 'The over-verification failure is the one to name: asserting on how a method was implemented produces a test that breaks on every refactor and catches no bugs.',
            buildsOn: ['junit5-essentials'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Stubbing state, and verifying an interaction that matters',
                    code: '@ExtendWith(MockitoExtension.class)\nclass PaymentServiceTest {\n\n    @Mock  PaymentGateway gateway;      // outside our control: mock it\n    @Mock  PaymentRepository payments;\n    @InjectMocks PaymentService service;\n\n    @Test\n    void records_the_authorisation_reference() {\n        when(gateway.authorise(any(), any()))\n                .thenReturn(new Authorisation("auth_1", APPROVED));\n\n        service.pay(request);\n\n        // Verify the OUTCOME through a captor, not the sequence of calls.\n        var saved = ArgumentCaptor.forClass(Payment.class);\n        verify(payments).save(saved.capture());\n        assertEquals("auth_1", saved.getValue().authorisationReference());\n    }\n\n    @Test\n    void does_not_charge_twice_for_one_idempotency_key() {\n        // HERE the interaction IS the requirement: the gateway must not\n        // be called a second time. Verifying it is the point of the test.\n        service.pay(requestWithKey("k1"));\n        service.pay(requestWithKey("k1"));\n\n        verify(gateway, times(1)).authorise(any(), any());\n    }\n}',
                    notes: '<p>The two tests illustrate the distinction. The first verifies an <em>outcome</em> — what was saved — and would survive any refactor that produced the same result. The second verifies an <em>interaction</em>, and that is correct because "the gateway is called once" is literally the requirement rather than an implementation detail.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A test full of <code>verify</code> calls is a copy of the implementation, written twice.</strong> It fails whenever the method is refactored, it passes whenever the method is wrong in a way that preserves the call sequence, and it makes the code harder to change without making it more correct. Verify when the interaction is the requirement — a payment taken once, an email sent, an event published — and assert on results everywhere else.</p>'
                }
            ],
            docs: [
                { title: 'Mockito', url: 'https://javadoc.io/doc/org.mockito/mockito-core/latest/org.mockito/org/mockito/Mockito.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'testing', questionId: 'what-to-mock' }
            ]
        },

        {
            id: 'what-not-to-mock',
            title: 'What Not to Mock',
            importance: 'must-know',
            summary: 'Do not mock what you do not own, and do not mock the database. A mock encodes your belief about how something behaves, and the bugs are where the belief is wrong.',
            interviewAngle: 'The most valuable idea in the module. A mocked repository proves the SQL was called, not that it works — and the SQL is where the defect is.',
            buildsOn: ['mockito-and-what-to-mock'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>A mock is an assertion about behaviour you did not write. When you stub <code>repository.findByStatus(CONFIRMED)</code> to return two orders, you are asserting that the real query returns those two — and if the derived query name is wrong, the JPQL has a typo, or the mapping is broken, the mock is right and production is not.</p><p><strong>Bugs live exactly where your belief about a dependency is mistaken</strong>, and that is precisely the place a mock replaces with your belief.</p>'
                },
                {
                    type: 'table',
                    title: 'Mock it, or use the real thing',
                    headers: ['Collaborator', 'Verdict', 'Why'],
                    rows: [
                        ['A third-party HTTP API', '<strong>Mock, or use a fake server</strong>', 'Slow, rate-limited, and not yours to call from CI'],
                        ['A payment gateway', 'Mock', 'You cannot charge a real card in a test'],
                        ['<strong>Your repository</strong>', '<strong>Do not mock</strong>', 'The query <em>is</em> the logic being tested. Use Testcontainers.'],
                        ['The database', 'Do not mock', 'Constraints, transactions, SQL dialect — all of it matters'],
                        ['A value object or a domain entity', 'Never mock', 'Construct one. Mocking a record is a smell.'],
                        ['A class you own with real logic', 'Usually not', 'Use it. If that is painful, the design is the problem.'],
                        ['The clock', 'Inject a fixed one', 'Not a mock — <code>Clock.fixed</code>, from the time module'],
                        ['A message broker', 'A test double or an embedded one', 'Testcontainers if the behaviour matters']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>H2 in place of the real database is mocking with extra steps.</strong> It has a different SQL dialect, different index behaviour, different locking, no <code>jsonb</code>, and different constraint error messages. A test suite green on H2 says nothing about PostgreSQL, and the failures it misses — a dialect-specific query, an upsert, a partial index, a serialisation failure under load — are exactly the ones that reach production. Testcontainers removed the excuse for this years ago.</p>'
                }
            ],
            docs: [
                { title: 'Testcontainers for Java', url: 'https://java.testcontainers.org/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'testing', questionId: 'what-to-mock' },
                { topicId: 'testing', questionId: 'testcontainers-over-h2' }
            ]
        },

        {
            id: 'test-naming-and-arrangement',
            title: 'Naming and Arrangement',
            importance: 'should-know',
            summary: 'A test name should say what behaviour is expected, so a failure report is a sentence about the system. Arrange, act, assert — and one act per test.',
            interviewAngle: 'A small thing that says a lot. A failure list reading like a specification is the outcome, and it is achievable by convention alone.',
            buildsOn: ['what-not-to-mock'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Names that read as a failure report',
                    code: '// Says nothing when it fails.\n@Test void testOrder() { }\n@Test void test1() { }\n@Test void placeOrder() { }\n\n// Says what is broken, in the CI output, with no source to read.\n@Test void rejects_an_order_with_no_lines() { }\n@Test void applies_the_volume_discount_above_ten_units() { }\n@Test void keeps_the_price_that_applied_when_the_order_was_placed() { }\n\n// Arrange, act, assert -- with ONE act.\n@Test\nvoid releases_the_reservation_when_payment_is_declined() {\n    // arrange\n    var order = anOrder().withStatus(RESERVED).build();\n    when(gateway.authorise(any(), any())).thenThrow(new Declined("card"));\n\n    // act -- exactly one call to the thing under test\n    assertThrows(Declined.class, () -> service.pay(order.id()));\n\n    // assert\n    assertEquals(AVAILABLE, inventory.statusOf(order.sku()));\n}',
                    notes: '<p>One <em>act</em> per test is the rule that matters more than the naming. A test that performs three operations and asserts after each is three tests sharing a failure message, and when it fails you do not know which operation broke — which is the diagnostic precision the pyramid chapter said unit tests are for.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>A builder for test fixtures — <code>anOrder().withStatus(RESERVED).build()</code> — is the one place the builder pattern always pays, and it is what keeps the arrange section to one line. Without it, every test constructs an order with nine arguments, seven of which are irrelevant to it, and the one that matters is invisible among them.</p>'
                }
            ],
            docs: [
                { title: 'JUnit 5 — Display Names', url: 'https://docs.junit.org/current/writing-tests/display-names.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'testing', questionId: 'junit5-features-worth-using' }
            ]
        },

        {
            id: 'parameterised-tests',
            title: 'Parameterised Tests',
            importance: 'should-know',
            summary: 'One test, many inputs, one failure per case. It replaces the loop that stops at the first failure and the six near-identical methods that drift apart.',
            interviewAngle: 'A practical improvement with a clear before-and-after, and the reporting difference — a named failure per case — is the substance.',
            buildsOn: ['test-naming-and-arrangement'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The sources worth knowing',
                    code: '@ParameterizedTest(name = "{0} units costs {1}")\n@CsvSource({\n        "1,   4299",\n        "9,   38691",\n        "10,  38691",     // the boundary\n        "11,  42562"\n})\nvoid applies_the_volume_discount(int units, long expectedMinor) {\n    assertEquals(Money.ofMinor(expectedMinor), pricing.quote(SKU, units));\n}\n\n@ParameterizedTest\n@EnumSource(value = Status.class, names = { "CANCELLED", "SHIPPED" })\nvoid cannot_be_confirmed_from(Status status) {\n    assertThrows(IllegalTransition.class, () -> anOrder(status).confirm());\n}\n\n@ParameterizedTest\n@NullAndEmptySource\n@ValueSource(strings = { " ", "\\t" })\nvoid rejects_a_blank_reference(String reference) {\n    assertThrows(IllegalArgumentException.class, () -> new Order(reference));\n}\n\n@ParameterizedTest\n@MethodSource("dstBoundaries")            // for anything not a literal\nvoid handles_a_dst_transition(ZonedDateTime start, Duration expected) { }',
                    notes: '<p>The <code>name</code> attribute is what makes this better than a loop: each case is reported separately with its inputs in the title, so a CI failure says "10 units costs 38691" rather than "testDiscount failed". A loop over an array stops at the first failure and tells you nothing about the rest.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Parameterised tests are where <strong>boundary values</strong> belong, and listing them explicitly is the point: the value below the boundary, the boundary, and the value above it. Most off-by-one defects live in exactly those three rows, and a table makes it obvious when one of them was never written.</p>'
                }
            ],
            docs: [
                { title: 'JUnit 5 — Parameterized Tests', url: 'https://docs.junit.org/current/writing-tests/parameterized-classes-and-tests.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'testing', questionId: 'junit5-features-worth-using' }
            ]
        },

        {
            id: 'flaky-tests-and-their-causes',
            title: 'Flaky Tests',
            importance: 'must-know',
            summary: 'A test that passes and fails without the code changing. The causes are a short list, and every one of them is a real defect in the test or in the system.',
            interviewAngle: 'The position that matters is that a re-run is not a fix. A suite people have learned to re-run has stopped being a signal at all.',
            buildsOn: ['parameterised-tests'],
            blocks: [
                {
                    type: 'table',
                    title: 'The causes, and the fix for each',
                    headers: ['Cause', 'Symptom', 'Fix'],
                    rows: [
                        ['Shared state between tests', 'Passes alone, fails in the suite', 'Reset state; do not rely on execution order'],
                        ['<code>Thread.sleep</code> for async work', 'Fails on a loaded CI machine', '<strong>Await a condition with a timeout</strong>, never a fixed sleep'],
                        ['Real time', 'Fails at midnight, month end, or during DST', 'Inject a <code>Clock</code>'],
                        ['Test order dependence', 'Fails when the runner reorders', 'Each test arranges everything it needs'],
                        ['Unordered collections', 'Fails occasionally on assertion order', 'Assert on a set, or sort first'],
                        ['A real network call', 'Fails when something outside is slow', 'A fake server or a container'],
                        ['Concurrency in the code under test', '<strong>Rarely the test\'s fault</strong>', 'A genuine race. This one is a bug you found.'],
                        ['Random data', 'Fails on one seed in fifty', 'Fix the seed, and log it on failure']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A retry-on-failure setting in CI is the worst available response.</strong> It converts a flaky test into a slow green one and destroys the property the suite exists for: that a red build means something is wrong. Once a team has learned to press re-run, a genuine intermittent production race — the most expensive kind of bug — arrives as a test failure and is dismissed as flakiness. Quarantine a flaky test out of the gating suite and fix it; do not retry it.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Awaitility is the standard answer to the sleep problem and it is worth naming: <code>await().atMost(5, SECONDS).until(() -&gt; repository.count() == 1)</code> polls until the condition holds, so it finishes in milliseconds on a fast machine and still tolerates a slow one. A <code>Thread.sleep(500)</code> does the opposite — always slow, and still not long enough on the day CI is busy.</p>'
                }
            ],
            docs: [
                { title: 'Awaitility', url: 'https://github.com/awaitility/awaitility/wiki/Usage', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'testing', questionId: 'flaky-tests' }
            ]
        }
    ]
};
