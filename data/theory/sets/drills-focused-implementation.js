/* ==========================================================================
   data/theory/sets/drills-focused-implementation.js — Synthesis, tier 3

   Fifteen twenty-to-forty-five-minute exercises. These are the ones an
   interviewer sets when they want to watch you write a specific, bounded
   thing that a real Spring service contains — an exception handler, a filter,
   a consumer with a dead-letter path — rather than design a system or build a
   product in ninety minutes.

   EVERY ONE OF THESE HAS A SKETCH, which is the opposite of the tier-2 rule
   and for the same reason. A design answer is a conversation and an outline
   would answer the wrong question; an implementation answer is code, and the
   shape of the right code is exactly what is being taught. The sketch is
   always the smallest thing that carries the decision — the annotation that
   makes the difference, the one method that has to be atomic — and never a
   working file. Ellipses are deliberate.

   No shared watchFor spine here. Tier 1 and tier 2 each have one because
   their rounds are graded on a fixed rubric; tier 3 is graded on whether the
   code is right, and what "right" means changes completely between a Flyway
   migration and a Kafka consumer.

   THE GRPC DRILL SHOWS JAVA, NOT PROTOBUF. Protobuf IDL is not one of the
   nine snippet languages and adding a tenth to make one sketch possible is
   the wrong trade — the .proto is described in the prompt, in prose, and the
   sketch is the generated-stub side, which is the half a Java interview asks
   about anyway.
   ========================================================================== */

const drillsFocusedImplementationModule = {
    id: 'drills-focused-implementation',
    trackId: 'synthesis',
    order: 903,
    title: 'Focused Implementation',
    tagline: 'Round 3. One bounded thing, written properly, in half an hour.',
    estimatedMinutes: 35,
    prerequisites: [],
    docHub: {
        title: 'Spring Boot reference documentation',
        url: 'https://docs.spring.io/spring-boot/index.html'
    },

    chapters: [
        {
            id: 'controlleradvice-error-shape',
            title: 'One Error Shape',
            importance: 'must-know',
            summary: 'Every failure in the API leaves through one handler and arrives in one format.',
            interviewAngle: 'Set constantly, because it is small and it exposes whether you know which exceptions Spring throws before your controller is ever reached.',
            buildsOn: [],
            blocks: [
                {
                    type: 'drill',
                    id: 'drill-controlleradvice-error-shape',
                    tier: 3,
                    title: 'A single error contract for the whole API',
                    minutes: 30,
                    prompt: 'Give an API one error shape. Handle: bean-validation failure on a request body, a malformed JSON body, a missing or wrong-typed path variable, your own NotFoundException, and anything unexpected. Each response carries a stable machine-readable code, a human message, the field errors where there are any, and a correlation id. Nothing leaks a stack trace or a class name. Say which of these Spring throws before your controller method runs.',
                    watchFor: [
                        'Only MethodArgumentNotValidException handled, so malformed JSON still returns Spring\'s default body and the contract has a hole in it',
                        'A catch-all handler that returns 500 for everything including the ones that are 400',
                        'The exception class name or message put in the response, which leaks internals and changes when you rename a class',
                        'Field errors flattened to one string, so the client cannot show the message next to the field',
                        'No correlation id, which makes every support ticket start with "can you send a screenshot"',
                        'Not knowing that HttpMessageNotReadableException and MethodArgumentTypeMismatchException happen before the controller is entered — which is why a try/catch inside the method cannot see them'
                    ],
                    sketch: {
                        language: 'java',
                        title: 'The handler that has to exist, and the one people forget',
                        code: '@RestControllerAdvice\nclass ApiErrors {\n\n    @ExceptionHandler(MethodArgumentNotValidException.class)\n    ResponseEntity<ApiError> onInvalid(MethodArgumentNotValidException e) {\n        var fields = e.getBindingResult().getFieldErrors().stream()\n            .map(f -> new FieldError(f.getField(), f.getDefaultMessage()))\n            .toList();\n        return status(BAD_REQUEST).body(ApiError.of("VALIDATION_FAILED", fields));\n    }\n\n    // The one that gets forgotten. A body of `{"amount": "abc"}` never\n    // reaches the controller at all -- Jackson fails during binding, and\n    // a try/catch inside the method cannot see it.\n    @ExceptionHandler(HttpMessageNotReadableException.class)\n    ResponseEntity<ApiError> onUnreadable(HttpMessageNotReadableException e) {\n        return status(BAD_REQUEST).body(ApiError.of("MALFORMED_BODY", List.of()));\n    }\n\n    @ExceptionHandler(Exception.class)\n    ResponseEntity<ApiError> onAnythingElse(Exception e) {\n        log.error("unhandled", e);          // the detail goes to the log\n        return status(INTERNAL_SERVER_ERROR)\n            .body(ApiError.of("INTERNAL", List.of()));   // never to the client\n    }\n}',
                        notes: '<p>The last handler is where the discipline lives: the stack trace goes to the log with the correlation id attached, and the client gets a code it can branch on. Returning <code>e.getMessage()</code> to the caller is how a JPA constraint name ends up in a mobile app.</p>'
                    }
                }
            ],
            docs: [
                { title: 'Spring Framework — Error responses', url: 'https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-ann-rest-exceptions.html', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'custom-bean-validator',
            title: 'A Constraint of Your Own',
            importance: 'should-know',
            summary: 'An annotation, a validator, and the cross-field case that makes people reach for the wrong one.',
            interviewAngle: 'The single-field version is a five-minute exercise. The class-level version — where two fields have to agree — is the one worth asking, because the annotation goes somewhere else.',
            buildsOn: ['controlleradvice-error-shape'],
            blocks: [
                {
                    type: 'drill',
                    id: 'drill-custom-bean-validator',
                    tier: 3,
                    title: 'A cross-field constraint that reports on the right field',
                    minutes: 30,
                    prompt: 'Write a constraint for a booking request where checkOut must be after checkIn, and the stay may not exceed 30 nights. The violation must be reported against checkOut rather than against the object, so the client can show it in the right place. Then say what your validator must do when either field is null, and how it would look up a value from the database if it needed one.',
                    watchFor: [
                        'A field-level annotation used for a rule that needs two fields, which cannot see the other one',
                        'The violation left on the class, so the error response has a message with no field to attach it to',
                        'Null not handled — a validator that throws NullPointerException on a missing field turns a 400 into a 500, and @NotNull is a separate concern that may not have run',
                        'The default message hard-coded in English rather than a message key',
                        'Not knowing that a ConstraintValidator is a Spring bean and can be injected, which is how a database-backed constraint works',
                        'A database call inside a validator with nothing said about it running on every request'
                    ],
                    sketch: {
                        language: 'java',
                        title: 'Class-level annotation, field-level violation',
                        code: '@Target(TYPE) @Retention(RUNTIME)\n@Constraint(validatedBy = StayLengthValidator.class)\npublic @interface ValidStay {\n    String message() default "{booking.stay.invalid}";\n    Class<?>[] groups() default {};\n    Class<? extends Payload>[] payload() default {};\n}\n\nclass StayLengthValidator implements ConstraintValidator<ValidStay, BookingRequest> {\n    @Override\n    public boolean isValid(BookingRequest r, ConstraintValidatorContext ctx) {\n        // @NotNull is a different constraint and may not have run yet.\n        if (r.checkIn() == null || r.checkOut() == null) return true;\n        if (r.checkOut().isAfter(r.checkIn())\n                && DAYS.between(r.checkIn(), r.checkOut()) <= 30) return true;\n\n        ctx.disableDefaultConstraintViolation();\n        ctx.buildConstraintViolationWithTemplate(ctx.getDefaultConstraintMessageTemplate())\n           .addPropertyNode("checkOut")      // <-- the point of the exercise\n           .addConstraintViolation();\n        return false;\n    }\n}',
                        notes: '<p>Returning <code>true</code> for null is not laziness, it is the specification: each constraint answers only its own question, and "is it present" belongs to <code>@NotNull</code>. A validator that fails on null makes the two constraints fight and produces two messages for one missing field.</p>'
                    }
                }
            ],
            docs: [
                { title: 'Jakarta Bean Validation 3.0 specification', url: 'https://jakarta.ee/specifications/bean-validation/3.0/', kind: 'spec' }
            ],
            relatedQuestions: []
        },

        {
            id: 'http-client-with-timeout-retry',
            title: 'Call Somebody Else',
            importance: 'must-know',
            summary: 'Two timeouts, a retry that knows what it is safe to retry, and a breaker in front of both.',
            interviewAngle: 'Almost every candidate can name the patterns. Far fewer set both timeouts, and almost nobody volunteers that retrying a POST is a correctness decision rather than a resilience one.',
            buildsOn: [],
            blocks: [
                {
                    type: 'drill',
                    id: 'drill-http-client-with-timeout-retry',
                    tier: 3,
                    title: 'An outbound client that fails fast and retries safely',
                    minutes: 35,
                    prompt: 'Write the client for an outbound HTTP dependency whose p99 is 200 ms and which fails for minutes at a time. Set the timeouts and justify the numbers. Add retries, and say which requests may be retried and which may not. Add a circuit breaker and state its thresholds. Then say what your endpoint returns while the breaker is open, and what your own caller\'s timeout has to be for any of this to help.',
                    watchFor: [
                        'One timeout set. Connect and read are different failures — a full connection pool and a slow response need different numbers',
                        'No timeout at all on a RestTemplate or WebClient built with defaults, which on some stacks means waiting forever',
                        'Retries on every method, including a POST that creates something, with no idempotency key in sight',
                        'Three retries against a 35-second timeout, which makes the worst case 140 seconds and blows the caller\'s budget',
                        'No jitter on the backoff, so every instance retries in lockstep and the recovering dependency is hit by a synchronised wave',
                        'The breaker\'s open state left undefined — falling through to the same failure is not a fallback',
                        'Nothing said about the caller\'s own timeout, which is what makes the retry budget a budget rather than a wish'
                    ],
                    sketch: {
                        language: 'java',
                        title: 'The numbers, and the reason each one is that number',
                        code: '@Bean\nRestClient pricingClient(RestClient.Builder builder) {\n    var factory = new SimpleClientHttpRequestFactory();\n    factory.setConnectTimeout(Duration.ofMillis(500));   // pool/DNS, not the work\n    factory.setReadTimeout(Duration.ofMillis(800));      // 4x the 200ms p99\n    return builder.requestFactory(factory)\n                  .baseUrl("https://pricing.internal")\n                  .build();\n}\n\n// 800ms x 3 attempts + backoff stays inside a 3s caller budget.\n@Retryable(retryFor = { ResourceAccessException.class, HttpServerErrorException.class },\n           maxAttempts = 3,\n           backoff = @Backoff(delay = 100, multiplier = 2, random = true))\n@CircuitBreaker(name = "pricing", fallbackMethod = "lastKnownPrice")\nPrice fetch(String sku) { ... }\n\n// Open-breaker behaviour is a product decision written as code.\nPrice lastKnownPrice(String sku, Throwable cause) { ... }',
                        notes: '<p><code>retryFor</code> is the line that matters. Retrying a 4xx repeats a request the server has already refused on its merits, and retrying a non-idempotent POST is a second order. The set of retryable exceptions is the design; <code>maxAttempts</code> is just a number.</p>'
                    }
                }
            ],
            docs: [
                { title: 'Resilience4j — circuit breaker', url: 'https://resilience4j.readme.io/docs/circuitbreaker', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'idempotency-key-filter',
            title: 'Exactly Once, From Outside',
            importance: 'must-know',
            summary: 'A header, a table, and the race between two identical requests arriving together.',
            interviewAngle: 'The naive version — check, then act — is a check-then-act race, and the interviewer is waiting to see whether you close it with a unique constraint or with a comment saying it is unlikely.',
            buildsOn: [],
            blocks: [
                {
                    type: 'drill',
                    id: 'drill-idempotency-key-filter',
                    tier: 3,
                    title: 'An Idempotency-Key that survives a concurrent duplicate',
                    minutes: 40,
                    prompt: 'Implement Idempotency-Key handling for a POST that creates a payment. A repeat with the same key returns the original response rather than creating a second payment. Cover: where the record is written relative to the business transaction, what happens when two identical requests arrive at the same instant on two instances, what happens when the first request crashed halfway, how long a key is retained, and what you return when the same key arrives with a different body.',
                    watchFor: [
                        'SELECT then INSERT, which is a check-then-act race that two concurrent requests will lose — the unique constraint on the key is what actually makes it safe',
                        'The key record committed in a separate transaction from the payment, so a crash between them leaves a key claiming work that never happened',
                        'The stored response never returned — replying 409 to a legitimate client retry makes the mechanism useless to the client it was built for',
                        'No handling of an in-flight duplicate. The second request has to wait or be told to retry; returning "not found" is wrong',
                        'Keys kept forever, so the table grows without bound, or expired after an hour when the client\'s retry policy runs for a day',
                        'The request body not fingerprinted, so the same key with a different amount silently returns the wrong response instead of 422'
                    ],
                    sketch: {
                        language: 'java',
                        title: 'The unique constraint is the algorithm',
                        code: '@Transactional\nPaymentResponse create(String key, PaymentRequest body) {\n    var fingerprint = sha256(body);\n    try {\n        // INSERT first. The unique index on idempotency_key is what makes\n        // this safe -- whichever of the two concurrent requests loses here\n        // is a duplicate BY DEFINITION, with no window in between.\n        keys.insertClaimed(key, fingerprint);\n    } catch (DuplicateKeyException e) {\n        var existing = keys.find(key);\n        if (!existing.fingerprint().equals(fingerprint)) {\n            throw new KeyReusedWithDifferentBody();      // 422, not 200\n        }\n        return existing.responseOrRetryLater();          // 409 while in flight\n    }\n\n    var response = payments.create(body);   // same transaction as the claim\n    keys.storeResponse(key, response);\n    return response;\n}',
                        notes: '<p>The claim and the payment share one transaction, so a crash rolls back both and the retry is genuinely fresh. Splitting them creates the state this whole mechanism exists to prevent: a key that says the work is done, and no work.</p>'
                    }
                }
            ],
            docs: [
                { title: 'Stripe API — Idempotent requests', url: 'https://docs.stripe.com/api/idempotent_requests', kind: 'api' }
            ],
            relatedQuestions: []
        },

        {
            id: 'testcontainers-integration-test',
            title: 'Test Against the Real Thing',
            importance: 'must-know',
            summary: 'A real PostgreSQL in a container, started once, with the data reset between tests rather than the container.',
            interviewAngle: 'The interviewer wants to hear why H2 was rejected, and then wants to hear how the suite stays fast once every test has a database.',
            buildsOn: [],
            blocks: [
                {
                    type: 'drill',
                    id: 'drill-testcontainers-integration-test',
                    tier: 3,
                    title: 'One container, many tests, no leakage between them',
                    minutes: 35,
                    prompt: 'Write the integration-test setup for a repository layer against a real PostgreSQL. Requirements: the container starts once for the whole suite rather than once per class, the schema is created by the same migrations production uses, each test starts from a known state, and the suite is not slower than it has to be. Say why H2 was not used, and what happens to the isolation of a test that spans two transactions.',
                    watchFor: [
                        'A container per test class, which turns a two-minute suite into twenty',
                        'The schema created by ddl-auto rather than by the migrations, so the tests validate a schema that will never exist in production',
                        'State reset by dropping and recreating the schema between tests, when a truncate or a rollback is orders of magnitude cheaper',
                        '@Transactional on the test used as a general cleanup mechanism, without noticing it also hides flush timing and makes a two-transaction scenario untestable',
                        'No answer for why not H2 — the real reasons are dialect differences, missing types and locking behaviour, and "it is more realistic" is not one of them',
                        'Hard-coded ports, which fail the moment two builds run on the same agent'
                    ],
                    sketch: {
                        language: 'java',
                        title: 'Singleton container, migrations, and a per-test reset',
                        code: '@Testcontainers\nabstract class DbTest {\n\n    // static: one container for the whole JVM, reused by every subclass.\n    // Testcontainers stops it at shutdown; a per-class container would\n    // pay the startup cost once per test class instead of once.\n    @Container\n    static final PostgreSQLContainer<?> DB =\n        new PostgreSQLContainer<>("postgres:16-alpine");\n\n    @DynamicPropertySource\n    static void props(DynamicPropertyRegistry r) {\n        r.add("spring.datasource.url", DB::getJdbcUrl);\n        r.add("spring.datasource.username", DB::getUsername);\n        r.add("spring.datasource.password", DB::getPassword);\n        r.add("spring.flyway.enabled", () -> true);   // the real migrations\n    }\n\n    @AfterEach\n    void reset(@Autowired JdbcTemplate jdbc) {\n        // Truncate, not drop -- the schema is expensive, the rows are not.\n        jdbc.execute("TRUNCATE payments, orders RESTART IDENTITY CASCADE");\n    }\n}',
                        notes: '<p>Running Flyway in the test is what makes the test worth having: a migration that fails on PostgreSQL fails here, in the build, rather than during the deploy. That is the property H2 cannot give you at any speed.</p>'
                    }
                }
            ],
            docs: [
                { title: 'Testcontainers for Java — PostgreSQL module', url: 'https://java.testcontainers.org/modules/databases/postgres/', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'flyway-non-null-column-live',
            title: 'Add a NOT NULL Column, Live',
            importance: 'must-know',
            summary: 'Four migrations and two deploys, because one migration and one deploy takes the site down.',
            interviewAngle: 'This is the expand-and-contract question in its most concrete form, and the tell is whether the candidate counts the deploys as well as the migrations.',
            buildsOn: [],
            blocks: [
                {
                    type: 'drill',
                    id: 'drill-flyway-non-null-column-live',
                    tier: 3,
                    title: 'A required column on a 50-million-row table, no downtime',
                    minutes: 40,
                    prompt: 'Add a NOT NULL column with a computed value to a 50-million-row PostgreSQL 16 table, with the application running and a rolling deploy in progress. Write the migrations in order and say which application version has to be live before each one. Cover: what lock each statement takes and for how long, how the existing rows are filled without holding a transaction open for an hour, and how you would roll back after step three.',
                    watchFor: [
                        'One migration: ALTER TABLE ... ADD COLUMN ... NOT NULL DEFAULT (expression). A volatile or row-dependent default still rewrites the table in PostgreSQL 16 and holds ACCESS EXCLUSIVE while it does',
                        'Not counting the deploys. The old code and the new code are both live during a rolling deploy, so the schema has to satisfy both at every step',
                        'A single UPDATE over 50 million rows, which holds one transaction, bloats the table and blocks vacuum for the duration',
                        'The NOT NULL added by rewriting rather than by validating a pre-existing CHECK, which is the trick that keeps the exclusive lock to milliseconds',
                        'No lock_timeout, so the ALTER queues behind a long read and every subsequent query queues behind the ALTER',
                        'No rollback story for the half-backfilled state, which is where a real deploy actually goes wrong'
                    ],
                    sketch: {
                        language: 'sql',
                        title: 'Four migrations, PostgreSQL 16',
                        code: '-- V5: nullable add. Metadata only in PG 11+, milliseconds.\nALTER TABLE orders ADD COLUMN currency text;\n\n-- deploy: new code WRITES currency, tolerates NULL on read.\n\n-- V6: backfill in batches, each its own transaction.\n--     Run outside Flyway, or as a repeatable job -- not one statement.\nUPDATE orders SET currency = \'INR\'\n WHERE currency IS NULL AND id IN (SELECT id FROM orders\n                                   WHERE currency IS NULL LIMIT 10000);\n\n-- V7: the trick. NOT VALID takes no table scan and no long lock;\n--     VALIDATE takes only SHARE UPDATE EXCLUSIVE and does not block reads.\nALTER TABLE orders ADD CONSTRAINT orders_currency_nn\n  CHECK (currency IS NOT NULL) NOT VALID;\nALTER TABLE orders VALIDATE CONSTRAINT orders_currency_nn;\n\n-- V8: with a validated CHECK already present, this is metadata only.\nALTER TABLE orders ALTER COLUMN currency SET NOT NULL;',
                        notes: '<p>Say the lock names out loud. <code>ADD COLUMN</code> and <code>SET NOT NULL</code> take ACCESS EXCLUSIVE and are only safe because with the constraint in place they touch metadata alone; <code>VALIDATE CONSTRAINT</code> takes SHARE UPDATE EXCLUSIVE and lets reads and writes through while it scans. Set <code>lock_timeout</code> before each one so a queued DDL fails instead of stopping the table.</p>'
                    }
                }
            ],
            docs: [
                { title: 'PostgreSQL 16 — ALTER TABLE', url: 'https://www.postgresql.org/docs/16/sql-altertable.html', kind: 'spec' }
            ],
            relatedQuestions: []
        },

        {
            id: 'custom-health-indicator',
            title: 'Say Whether You Are Healthy',
            importance: 'should-know',
            summary: 'Two probes that answer different questions, and a dependency that must not be allowed to restart you.',
            interviewAngle: 'Almost everyone writes one indicator and wires it into everything. The question is whether liveness and readiness are distinguished, and whether a downstream outage takes the pod down with it.',
            buildsOn: [],
            blocks: [
                {
                    type: 'drill',
                    id: 'drill-custom-health-indicator',
                    tier: 3,
                    title: 'Liveness, readiness, and a downstream that is down',
                    minutes: 25,
                    prompt: 'A service depends on PostgreSQL, Redis and a third-party pricing API. Write the health indicators and say which of the three belongs in liveness, which in readiness, and which in neither. Cover: what each probe must not do, what timeout the check itself gets, and what Kubernetes does in each case. Then say what happens to the fleet if the pricing API goes down and it is wired into liveness.',
                    watchFor: [
                        'Every dependency in one indicator wired to both probes, so a third-party outage restarts every pod in the fleet and turns a degraded service into no service',
                        'A health check with no timeout of its own — a probe that hangs is a probe that fails, and the kubelet\'s timeout is the wrong place to discover it',
                        'Liveness reporting anything other than "this process is broken and a restart would fix it"',
                        'An expensive query in the check, which multiplied by the probe interval and the replica count is real load',
                        'Details exposed on an unauthenticated endpoint, so the JDBC URL and the Redis host are public',
                        'Not knowing that Spring Boot has readiness and liveness groups already, and hand-rolling a second mechanism beside them'
                    ],
                    sketch: {
                        language: 'java',
                        title: 'Degraded, not dead',
                        code: '@Component("pricing")\nclass PricingHealth implements HealthIndicator {\n\n    @Override\n    public Health health() {\n        try {\n            var ok = client.ping(Duration.ofMillis(300));  // its own timeout\n            return ok ? Health.up().build()\n                      : Health.status("DEGRADED").build();\n        } catch (Exception e) {\n            // Not DOWN. This dependency being unreachable does not mean a\n            // restart helps, and readiness pulling this pod out of the load\n            // balancer would pull every pod out at the same moment.\n            return Health.status("DEGRADED").withDetail("cause", "unreachable").build();\n        }\n    }\n}',
                        notes: '<p>Liveness answers "would a restart fix this" and readiness answers "should traffic come here now". A third-party API is neither: restarting does not help and removing every replica from the load balancer converts a partial outage into a total one. In <code>application.yaml</code>, put the database in the readiness group and leave liveness with nothing but the JVM.</p>'
                    }
                }
            ],
            docs: [
                { title: 'Spring Boot — Kubernetes probes', url: 'https://docs.spring.io/spring-boot/reference/actuator/endpoints.html#actuator.endpoints.kubernetes-probes', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'correlation-id-interceptor',
            title: 'Follow One Request',
            importance: 'must-know',
            summary: 'An id from the edge, into the MDC, out on every outbound call, and — the part that breaks — across a thread boundary.',
            interviewAngle: 'The synchronous version is easy. The moment an @Async method or a thread pool appears, the ThreadLocal is empty, and that is the whole exercise.',
            buildsOn: [],
            blocks: [
                {
                    type: 'drill',
                    id: 'drill-correlation-id-interceptor',
                    tier: 3,
                    title: 'A correlation id that survives a thread pool',
                    minutes: 30,
                    prompt: 'Every log line for one request must carry the same correlation id, including lines written from an @Async method and from a task submitted to an executor. Take the id from an inbound header when present and generate one when not, put it on the response, and propagate it to outbound HTTP calls. Say what goes wrong without the last part, and why it goes wrong specifically in a thread pool rather than merely on a new thread.',
                    watchFor: [
                        'MDC set and never cleared, so a pooled thread keeps the previous request\'s id and logs it against the next one — a leak that misattributes rather than merely loses',
                        'The clear in a plain statement rather than a finally, so any exception leaves the value behind',
                        'Nothing propagated to outbound calls, so the id stops at the service boundary and the trace has a hole exactly where the interesting failure is',
                        'A filter that generates a new id even when the caller sent one, which breaks the correlation it exists to create',
                        'Not knowing why the pool is the problem: MDC is a ThreadLocal, a submitted task runs on a thread that never saw the filter, and a decorator that copies the context across at submit time is the fix',
                        'The header trusted blindly from the public internet, so a client can inject anything into your logs'
                    ],
                    sketch: {
                        language: 'java',
                        title: 'Set it, always clear it, and carry it across the submit',
                        code: '@Component\nclass CorrelationFilter extends OncePerRequestFilter {\n    @Override\n    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res,\n                                    FilterChain chain) throws Exception {\n        var id = Optional.ofNullable(req.getHeader("X-Correlation-Id"))\n                         .filter(CorrelationFilter::looksSafe)   // never trust it raw\n                         .orElseGet(() -> UUID.randomUUID().toString());\n        MDC.put("correlationId", id);\n        res.setHeader("X-Correlation-Id", id);\n        try {\n            chain.doFilter(req, res);\n        } finally {\n            MDC.clear();     // a pooled thread outlives the request\n        }\n    }\n}\n\n// The half that is always missing. MDC is a ThreadLocal; the pool thread\n// never ran the filter, so the context has to be copied at submit time.\n@Bean\nTaskDecorator mdcDecorator() {\n    return runnable -> {\n        var context = MDC.getCopyOfContextMap();\n        return () -> {\n            if (context != null) MDC.setContextMap(context);\n            try { runnable.run(); } finally { MDC.clear(); }\n        };\n    };\n}',
                        notes: '<p>This is the same problem as <code>SecurityContextHolder</code> being empty in an <code>@Async</code> method and as a trace context not crossing a pool: one mechanism, three symptoms. Recognising them as one problem is worth more in an interview than any of the three fixes.</p>'
                    }
                }
            ],
            docs: [
                { title: 'SLF4J — MDC', url: 'https://www.slf4j.org/manual.html#mdc', kind: 'api' }
            ],
            relatedQuestions: []
        },

        {
            id: 'kafka-consumer-with-dlq',
            title: 'A Consumer That Cannot Get Stuck',
            importance: 'must-know',
            summary: 'A poison message, a bounded retry and somewhere for it to go, without stopping the partition behind it.',
            interviewAngle: 'The failure everyone has seen is one bad message blocking a partition forever. The good answer bounds the retry, moves the message aside, and does not lose the offset ordering while doing it.',
            buildsOn: [],
            blocks: [
                {
                    type: 'drill',
                    id: 'drill-kafka-consumer-with-dlq',
                    tier: 3,
                    title: 'Retry, dead-letter, and the offset',
                    minutes: 40,
                    prompt: 'Write a Kafka consumer for an orders topic. Requirements: a transient failure is retried with backoff, a permanent failure goes to a dead-letter topic after a bounded number of attempts, and one bad message never blocks the partition indefinitely. Cover: when the offset is committed relative to the processing, how you distinguish transient from permanent, what metadata the dead-letter record carries, and what happens when the consumer is killed mid-batch.',
                    watchFor: [
                        'Auto-commit left on, so a message is marked consumed before it is processed and a crash loses it silently',
                        'Committing before processing "to keep the lag down", which is the same bug stated as a feature',
                        'Unbounded retry in the listener, which blocks the partition — every message behind the poison one waits forever and the lag graph is the only symptom',
                        'No distinction between a deserialisation failure, which will never succeed, and a timeout, which probably will',
                        'A dead-letter record with only the payload, so nobody can tell which topic, partition, offset or exception produced it',
                        'Blocking retries with long backoff inside the listener, which holds the poll loop and triggers a rebalance when max.poll.interval.ms is exceeded',
                        'No answer for the redelivery after a crash — at-least-once means the handler has to be idempotent, and saying so is part of the design'
                    ],
                    sketch: {
                        language: 'java',
                        title: 'Bounded, non-blocking, and committed after the work',
                        code: '@Bean\nDefaultErrorHandler errorHandler(KafkaTemplate<String, byte[]> template) {\n    var recoverer = new DeadLetterPublishingRecoverer(template);   // adds\n    // original topic/partition/offset/exception as headers, automatically\n\n    var handler = new DefaultErrorHandler(recoverer,\n        new ExponentialBackOffWithMaxRetries(3));\n\n    // A payload that will not deserialise will not deserialise on attempt\n    // four either. Straight to the DLT, no retries spent.\n    handler.addNotRetryableExceptions(DeserializationException.class,\n                                      IllegalArgumentException.class);\n    return handler;\n}\n\n@KafkaListener(topics = "orders", groupId = "fulfilment")\nvoid onOrder(OrderEvent event) {\n    fulfilment.handle(event);   // MUST be idempotent: this is at-least-once\n}',
                        notes: '<p>With <code>enable.auto.commit=false</code> and the container\'s default RECORD ack mode, the offset moves only after the listener returns normally — so a crash mid-batch redelivers rather than skips. That is the guarantee that makes the idempotency requirement on <code>handle</code> unavoidable rather than optional.</p>'
                    }
                }
            ],
            docs: [
                { title: 'Spring for Apache Kafka — Handling exceptions', url: 'https://docs.spring.io/spring-kafka/reference/kafka/annotation-error-handling.html', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'cache-aside-with-stampede-guard',
            title: 'Cache Without a Stampede',
            importance: 'must-know',
            summary: 'Cache-aside is four lines. The fifth line, for when a thousand requests miss the same key at once, is the exercise.',
            interviewAngle: 'A candidate who writes cache-aside and stops has answered the tutorial question. The follow-up is always "the key expires at peak", and the answer is a lock, a stale-while-revalidate, or a jittered TTL.',
            buildsOn: [],
            blocks: [
                {
                    type: 'drill',
                    id: 'drill-cache-aside-with-stampede-guard',
                    tier: 3,
                    title: 'One key, a thousand simultaneous misses',
                    minutes: 35,
                    prompt: 'A product page reads from a cache in front of a query that takes 400 ms. The key for the most popular product expires at peak and a thousand requests miss together. Implement cache-aside with a guard against that. Cover: which requests wait and which are served stale, what happens if the holder of the lock dies, why every key expiring at the same second is a separate bug, and how the cache is invalidated when the product is edited.',
                    watchFor: [
                        'Plain cache-aside with no guard, so every miss becomes a database query and the database sees a thousand identical ones',
                        'A lock with no expiry, so a process that dies holding it blocks the key permanently',
                        'A lock released without checking ownership, so a slow holder deletes the lock a second holder now owns',
                        'A fixed TTL for every key populated by the same warm-up, so they all expire in the same second and the stampede is scheduled rather than random — jitter is the one-line fix',
                        'Invalidation by writing the new value into the cache from the writer, which reintroduces a dual-write between the database and the cache',
                        'Nothing said about what the 999 waiting requests do — blocking all of them on a 400 ms query is a 400 ms latency spike, and serving them the previous value is usually better'
                    ],
                    sketch: {
                        language: 'java',
                        title: 'One loader, everyone else served stale',
                        code: 'Product byId(String id) {\n    var hit = redis.get(key(id));\n    if (hit != null && !hit.stale()) return hit.value();\n\n    // Exactly one caller wins the lock. SET NX with a TTL, so a crashed\n    // holder releases it by expiry rather than by never releasing it.\n    boolean loader = redis.setIfAbsent(lock(id), token, Duration.ofSeconds(10));\n\n    if (!loader) {\n        // The other 999. Stale beats a 400ms queue behind one query.\n        if (hit != null) return hit.value();\n        return awaitBriefly(id);\n    }\n    try {\n        var fresh = products.load(id);              // the one query\n        // Jitter: without it every key warmed together expires together.\n        redis.set(key(id), fresh, ttl().plusSeconds(random.nextInt(60)));\n        return fresh;\n    } finally {\n        redis.deleteIfValueMatches(lock(id), token); // only if still ours\n    }\n}',
                        notes: '<p><code>deleteIfValueMatches</code> is not decoration. A plain <code>DEL</code> from a holder whose lock already expired deletes the lock a different process is now holding, and the stampede comes back with two writers in it. The token check is the difference between a mutex and a suggestion.</p>'
                    }
                }
            ],
            docs: [
                { title: 'Redis — SET command and the NX option', url: 'https://redis.io/docs/latest/commands/set/', kind: 'api' }
            ],
            relatedQuestions: []
        },

        {
            id: 'jwt-resource-server-config',
            title: 'Validate a Token',
            importance: 'must-know',
            summary: 'Six lines of configuration and about six things that have to be true, most of which the defaults do not check.',
            interviewAngle: 'Everybody can decode a JWT. The interview is about what is verified — issuer, audience, expiry, algorithm, signature against a rotating key — and about how the claims become authorities.',
            buildsOn: [],
            blocks: [
                {
                    type: 'drill',
                    id: 'drill-jwt-resource-server-config',
                    tier: 3,
                    title: 'A resource server that checks everything it should',
                    minutes: 35,
                    prompt: 'Configure a Spring Boot service as an OAuth2 resource server validating RS256 JWTs from an external issuer. Cover: every claim that must be checked and why, how the signing key is obtained and what happens when it rotates, how a scope claim becomes a Spring authority, and what the service returns for a missing token versus a valid token with insufficient scope. Then say why you would refuse a token whose alg header is none, and how you would revoke one before it expires.',
                    watchFor: [
                        'Signature verified and nothing else — exp, iss and aud all matter, and a valid signature from the right issuer for a different audience is still not a token for you',
                        'The algorithm taken from the token header, which is the alg:none and the RS256-to-HS256 confusion attack in one',
                        'A hard-coded public key, so key rotation is an outage — the JWKS endpoint plus caching is the answer, and the cache needs a refresh path',
                        'JWKS fetched on every request, which puts the identity provider on the critical path of every call',
                        '401 and 403 confused. No credentials or bad credentials is 401; a good token without the scope is 403',
                        'Scopes not mapped to authorities, so @PreAuthorize sees nothing and every check silently passes or silently fails',
                        'No answer on revocation. A JWT is valid until it expires by design, so the honest answers are short lifetimes plus refresh, or a deny-list checked on the paths that justify the cost'
                    ],
                    sketch: {
                        language: 'java',
                        title: 'The validators the defaults do not add',
                        code: '@Bean\nJwtDecoder jwtDecoder(OAuth2ResourceServerProperties props) {\n    var issuer = props.getJwt().getIssuerUri();\n    // fromIssuerLocation pins the algorithm from the discovery document\n    // and caches the JWKS -- rotation is handled, alg:none cannot apply.\n    var decoder = (NimbusJwtDecoder) JwtDecoders.fromIssuerLocation(issuer);\n\n    decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(\n        JwtValidators.createDefaultWithIssuer(issuer),   // exp, nbf, iss\n        new JwtClaimValidator<List<String>>("aud",       // NOT default\n            aud -> aud != null && aud.contains("orders-api"))\n    ));\n    return decoder;\n}\n\n@Bean\nJwtAuthenticationConverter authorities() {\n    var scopes = new JwtGrantedAuthoritiesConverter();\n    scopes.setAuthorityPrefix("SCOPE_");\n    scopes.setAuthoritiesClaimName("scope");\n    var converter = new JwtAuthenticationConverter();\n    converter.setJwtGrantedAuthoritiesConverter(scopes);\n    return converter;\n}',
                        notes: '<p>The audience validator is the line worth remembering, because it is the one Spring does not add for you. Without it, any token your identity provider issued for any client will authenticate against this service — including one issued for a low-trust application that should never have reached the orders API.</p>'
                    }
                }
            ],
            docs: [
                { title: 'Spring Security — OAuth2 resource server, JWT', url: 'https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/jwt.html', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'pagination-with-join-fetch',
            title: 'Page a Collection',
            importance: 'must-know',
            summary: 'The query that logs HHH90003004, loads the whole table into memory, and returns the right answer anyway.',
            interviewAngle: 'One of the few interview problems where the naive code is correct and catastrophic at once. The warning in the log is the entire tell, and most candidates have never read it.',
            buildsOn: [],
            blocks: [
                {
                    type: 'drill',
                    id: 'drill-pagination-with-join-fetch',
                    tier: 3,
                    title: 'Twenty orders with their lines, without an in-memory page',
                    minutes: 35,
                    prompt: 'Return page 3 of orders, twenty per page, each with its order lines, from a table of two million orders. Write it so that it is neither an N+1 nor an in-memory pagination. Say what Hibernate does with JOIN FETCH plus Pageable and why the log warns about it, what the two-query solution is, and how a batch-size setting changes the answer. Then say what happens to the total count query on two million rows.',
                    watchFor: [
                        'Lazy lines accessed in a loop — twenty-one queries, and the page size is the multiplier',
                        'JOIN FETCH with a Pageable, which makes Hibernate fetch every matching row, apply the limit in memory, and log HHH90003004 while doing it',
                        'Not reading the warning. It says "applying in memory" in plain words, and the query still returns the right twenty rows, so it survives review and dies in production',
                        'DISTINCT added to fix the duplicate rows without noticing it also has to happen in the database on a fetch join',
                        'No mention of the two-query shape — page the ids, then fetch the collections for those ids — which is the answer that scales',
                        'A count query over two million rows on every page request, when an approximate count or a cursor removes the need for one entirely',
                        'Offset pagination at page 40,000 described as fine, when the database still walks every skipped row'
                    ],
                    sketch: {
                        language: 'java',
                        title: 'Two queries, both of them bounded',
                        code: '// 1. Page the ROOT ids only. No join, so LIMIT/OFFSET is real SQL\n//    and the database does the paging.\n@Query("select o.id from Order o where o.customerId = :c order by o.placedAt desc")\nPage<Long> pageIds(@Param("c") Long customerId, Pageable pageable);\n\n// 2. Fetch the collections for exactly those twenty ids. No pagination\n//    here, so the fetch join is safe and there is nothing to warn about.\n@Query("select distinct o from Order o join fetch o.lines where o.id in :ids")\nList<Order> withLines(@Param("ids") List<Long> ids);',
                        notes: '<p>The alternative is <code>@BatchSize</code> on the collection: leave it lazy, page normally, and Hibernate loads the lines for the whole page in one <code>IN</code> query instead of twenty. That turns 21 queries into 2 without restructuring the repository, and it is the right answer when the collection is not always needed.</p>'
                    }
                }
            ],
            docs: [
                { title: 'Hibernate 6 — Fetching', url: 'https://docs.hibernate.org/orm/6.4/userguide/html_single/#fetching', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'grpc-service-from-a-proto',
            title: 'Implement a gRPC Service',
            importance: 'good-to-know',
            summary: 'The generated base class, the observer, and the two mistakes that make a stream hang forever.',
            interviewAngle: 'Asked where gRPC is already in the stack. The interesting parts are the deadline, the status codes and remembering to complete the observer — not the IDL, which the tooling writes for you.',
            buildsOn: [],
            blocks: [
                {
                    type: 'drill',
                    id: 'drill-grpc-service-from-a-proto',
                    tier: 3,
                    title: 'A unary call and a server stream, with deadlines',
                    minutes: 40,
                    prompt: 'A .proto defines a PricingService with a unary GetPrice(sku) returning a Price, and a server-streaming WatchPrice(sku) that emits a Price on every change. Implement both against the generated base class. Cover: how a not-found is reported, how a client deadline reaches your code and what you should do when it has passed, what has to happen for a stream to terminate cleanly, and how you would evolve the Price message next quarter without breaking existing clients.',
                    watchFor: [
                        'A Java exception thrown out of the method, which reaches the client as UNKNOWN with no message — StatusRuntimeException with NOT_FOUND or INVALID_ARGUMENT is the contract',
                        'onCompleted never called on the unary path, so the client waits until its deadline for a response that was already sent',
                        'The deadline ignored. It arrives in the context, it is already expired sometimes, and doing the work anyway burns capacity for a client that has stopped listening',
                        'A server stream that never terminates and holds the thread, with no cancellation handling when the client disconnects',
                        'onNext called from multiple threads without synchronisation, which is not allowed on a StreamObserver',
                        'Field numbers reused or renumbered when evolving the message — the number is the wire identity, the name is not, and reusing a retired number silently misreads old data',
                        'Removing a field rather than reserving it, which lets somebody reuse the number next year'
                    ],
                    sketch: {
                        language: 'java',
                        title: 'Status codes, the deadline, and completing the call',
                        code: 'class PricingImpl extends PricingServiceGrpc.PricingServiceImplBase {\n\n    @Override\n    public void getPrice(PriceRequest req, StreamObserver<Price> observer) {\n        // The client\'s deadline arrives in the Context. If it has passed,\n        // the client has already given up -- doing the work is pure waste.\n        if (Context.current().getDeadline() != null\n                && Context.current().getDeadline().isExpired()) {\n            observer.onError(Status.DEADLINE_EXCEEDED.asRuntimeException());\n            return;\n        }\n        prices.find(req.getSku())\n            .ifPresentOrElse(\n                price -> { observer.onNext(price); observer.onCompleted(); },\n                ()    -> observer.onError(Status.NOT_FOUND\n                            .withDescription("unknown sku").asRuntimeException()));\n    }\n\n    @Override\n    public void watchPrice(PriceRequest req, StreamObserver<Price> observer) {\n        var sub = feed.subscribe(req.getSku(), observer::onNext);\n        // Without this the subscription outlives the client and leaks.\n        ((ServerCallStreamObserver<Price>) observer).setOnCancelHandler(sub::close);\n    }\n}',
                        notes: '<p>The <code>.proto</code> itself is not shown here on purpose: this deck holds Java, and the IDL is not one of its nine snippet languages. Nothing is lost — the interview questions are about the generated Java side and about wire compatibility, and the compatibility rule states in one sentence: <strong>the field number is the identity, so add new numbers, never reuse a retired one, and <code>reserved</code> the ones you remove.</strong></p>'
                    }
                }
            ],
            docs: [
                { title: 'gRPC — Basics tutorial for Java', url: 'https://grpc.io/docs/languages/java/basics/', kind: 'codelab' }
            ],
            relatedQuestions: []
        },

        {
            id: 'mongo-document-model',
            title: 'Model a Document',
            importance: 'good-to-know',
            summary: 'Embed or reference, and the 16 MB ceiling that turns the wrong choice into an outage two years later.',
            interviewAngle: 'A relational modeller writing MongoDB produces five collections and a join in application code. The question is whether the candidate models on the access pattern instead.',
            buildsOn: [],
            blocks: [
                {
                    type: 'drill',
                    id: 'drill-mongo-document-model',
                    tier: 3,
                    title: 'Orders and their lines, and where the unbounded array is',
                    minutes: 30,
                    prompt: 'Model orders, order lines, customers and product snapshots for a store, in MongoDB, given that the dominant read is "fetch one order with everything needed to render it" and the dominant write is "append a status event to an order". Say what you embed and what you reference, and why. Then find the field in your own model that grows without bound, say what happens when it reaches 16 MB, and say what your write pattern does to the document as it grows.',
                    watchFor: [
                        'The relational schema transcribed into four collections plus joins in application code, which gives up the one thing the document model offers',
                        'Everything embedded, so the unbounded array — status events, audit entries — eventually hits the 16 MB document limit and the collection has no path forward',
                        'The product referenced rather than snapshotted, so last year\'s invoice reprints with this year\'s price',
                        'No index named. A query on an embedded array field needs a multikey index, and "MongoDB is fast" is not a plan',
                        'Not knowing that growing a document past its allocation rewrites and moves it, so an append-heavy array is an expensive write pattern as well as a bounded one',
                        'Multi-document updates described as transactional without noticing that this is exactly the guarantee the model was chosen to avoid needing'
                    ],
                    sketch: {
                        language: 'json',
                        title: 'Embedded where it is read together, referenced where it grows',
                        code: '{\n  "_id": "ord_10231",\n  "customer": {                  // EMBEDDED snapshot: rendering the order\n    "id": "cus_88",              // needs it, and it must not change later\n    "name": "A. Mahajan",\n    "city": "Pune"\n  },\n  "lines": [                     // EMBEDDED: bounded, always read together\n    { "sku": "TS-01", "name": "T-shirt", "qty": 2, "unitPaise": 49900 }\n  ],\n  "total": { "paise": 99800, "currency": "INR" },\n  "status": "SHIPPED",           // current state only\n  "placedAt": "2026-10-06T09:12:00Z"\n}\n\n// SEPARATE collection. This is the unbounded one: an order that is\n// re-delivered fifty times has fifty events, and embedding them puts\n// the 16MB ceiling on the order document.\n{ "_id": "evt_5", "orderId": "ord_10231",\n  "type": "DELIVERY_ATTEMPTED", "at": "2026-10-08T04:00:00Z" }',
                        notes: '<p>The rule that decides every one of these: embed what is read together and bounded, reference what grows or is shared. The customer is embedded as a <em>snapshot</em> rather than referenced, because an invoice has to keep saying what it said when it was issued — the same reason the line carries the product name and price rather than a product id.</p>'
                    }
                }
            ],
            docs: [
                { title: 'MongoDB — Data modelling introduction', url: 'https://www.mongodb.com/docs/manual/data-modeling/', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'hexagonal-slice-of-a-feature',
            title: 'One Feature, Ports and Adapters',
            importance: 'should-know',
            summary: 'A domain that compiles without Spring on the classpath, and the two adapters that make it useful.',
            interviewAngle: 'Asked to see whether the candidate can draw the dependency arrows the right way round and, more importantly, whether they can say when the indirection is not worth it.',
            buildsOn: [],
            blocks: [
                {
                    type: 'drill',
                    id: 'drill-hexagonal-slice-of-a-feature',
                    tier: 3,
                    title: 'Cancel an order, in four files and no framework in the middle',
                    minutes: 45,
                    prompt: 'Implement "cancel an order, refunding the payment if one was captured" as a hexagonal slice: a domain service, the ports it needs, a REST adapter and a JPA adapter. The domain package must compile with no Spring and no Jakarta Persistence import in it. Write the domain unit test that this structure is supposed to make easy. Then argue the other side: say for which feature in this same application you would not do it, and why.',
                    watchFor: [
                        'The port defined in terms of the JPA entity, which drags the persistence model into the domain and defeats the whole arrangement',
                        'The domain service annotated @Service, which is a small leak and the one that grows',
                        'Ports named after their adapters — JpaOrderPort — instead of after what the domain needs, which tells you the arrow is pointing the wrong way',
                        'Mapping code missing entirely, then discovered to be half the work, which is the honest cost of the pattern and the reason not to apply it everywhere',
                        'A test that still boots Spring, which means the structure bought nothing',
                        'No answer to the other side. A CRUD screen over one table gains nothing from four files and two mappings, and a candidate who applies it uniformly has read about it rather than lived with it'
                    ],
                    sketch: {
                        language: 'java',
                        title: 'The arrows all point inward',
                        code: '// domain/ -- no Spring, no Jakarta, no Jackson. Just the rule.\npublic interface Orders {                       // a PORT, named for the need\n    Optional<Order> byId(OrderId id);\n    void save(Order order);\n}\npublic interface Refunds { RefundId refund(PaymentId payment, Money amount); }\n\npublic final class CancelOrder {                // the use case\n    private final Orders orders; private final Refunds refunds;\n\n    public void cancel(OrderId id, Reason reason) {\n        var order = orders.byId(id).orElseThrow(OrderNotFound::new);\n        order.cancel(reason);                   // the invariant lives here\n        order.capturedPayment()\n             .ifPresent(p -> refunds.refund(p, order.total()));\n        orders.save(order);\n    }\n}\n\n// adapter/persistence/ -- knows about both sides, so the domain knows\n// about neither. This class is where the mapping cost actually lands.\n@Repository\nclass JpaOrders implements Orders {\n    public Optional<Order> byId(OrderId id) {\n        return jpa.findById(id.value()).map(OrderMapper::toDomain);\n    }\n}',
                        notes: '<p>The test the structure exists for is a plain JUnit test with two hand-written fakes and no application context: it runs in milliseconds and it fails for exactly one reason. If that test would have been easy anyway — because the feature is a form over one table — then the four files and two mappings bought nothing, and saying so is the more senior answer.</p>'
                    }
                }
            ],
            docs: [
                { title: 'Alistair Cockburn — Hexagonal architecture', url: 'https://alistair.cockburn.us/hexagonal-architecture', kind: 'guide' }
            ],
            relatedQuestions: []
        }
    ]
};
