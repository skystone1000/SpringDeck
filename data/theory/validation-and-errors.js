/* ==========================================================================
   data/theory/validation-and-errors.js — module 38 in the reading path

   Seven chapters, and the title of the plan's entry is the whole argument:
   one error shape, everywhere. An API that returns four different error
   bodies depending on which layer failed is an API whose clients each write
   their own parser and get it wrong.
   ========================================================================== */

const validationAndErrorsModule = {
    id: 'validation-and-errors',
    trackId: 'web-api',
    order: 38,
    title: 'Validation and Error Handling',
    tagline: 'One error shape, everywhere.',
    estimatedMinutes: 35,
    prerequisites: ['dispatcher-lifecycle'],
    docHub: { title: 'Jakarta Bean Validation', url: 'https://beanvalidation.org/' },

    chapters: [
        {
            id: 'bean-validation-basics',
            title: '@Valid, and Where It Actually Runs',
            importance: 'must-know',
            summary: 'Constraint annotations on a DTO, @Valid on the parameter, and a MethodArgumentNotValidException when it fails. Without the @Valid the annotations do nothing.',
            interviewAngle: 'Asked constantly, and the discriminating detail is that the constraints are inert on their own — the same trap as @Validated on a properties class, and worth recognising as one pattern rather than two facts.',
            buildsOn: [],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The three pieces, and what each contributes',
                    code: 'record CreateInvoice(\n        @NotBlank String customerId,\n        @NotNull @Positive BigDecimal amount,\n        @Pattern(regexp = "[A-Z]{3}") String currency,\n        @Valid @NotEmpty List<LineItem> lines) {   // @Valid CASCADES\n}\n\n@PostMapping("/invoices")\nInvoice create(@Valid @RequestBody CreateInvoice request) {\n    ...   // never reached if a constraint fails\n}\n\n// Without @Valid on the parameter, the annotations above are decoration.\n// Nothing validates them, and a blank customerId reaches the service.',
                    notes: '<p>The nested <code>@Valid</code> on <code>lines</code> is the cascade: without it, the constraints inside each <code>LineItem</code> are not checked at all. Bean Validation does not recurse by default, and a partially validated request object is the usual result of forgetting it.</p>'
                },
                {
                    type: 'table',
                    title: 'Where validation can be attached',
                    headers: ['Placement', 'Annotation', 'Failure'],
                    rows: [
                        ['A controller parameter', '<code>@Valid</code> or <code>@Validated</code>', '<code>MethodArgumentNotValidException</code> → 400'],
                        ['A path variable or request param', '<code>@Validated</code> on the class', '<code>ConstraintViolationException</code> → 500 unless handled'],
                        ['A service method', '<code>@Validated</code> on the class', '<code>ConstraintViolationException</code>'],
                        ['A <code>@ConfigurationProperties</code> class', '<code>@Validated</code>', 'Startup failure — see the configuration module'],
                        ['A JPA entity', 'Automatic on flush', '<code>ConstraintViolationException</code>, at flush time']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>The two exception types are different and only one is handled for you.</strong> A failing <code>@RequestBody</code> gives <code>MethodArgumentNotValidException</code>, which Spring maps to 400 with a useful body. A failing <code>@RequestParam</code> or <code>@PathVariable</code> gives <code>ConstraintViolationException</code>, which is <strong>a 500 unless you handle it</strong> — the API reports an internal error for what is plainly a client mistake. Handling both in one advice is a two-line fix that most codebases are missing.</p>'
                }
            ],
            docs: [
                { title: 'Validation', url: 'https://docs.spring.io/spring-framework/reference/core/validation/beanvalidation.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'rest-api', questionId: 'bean-validation' }
            ]
        },

        {
            id: 'validation-groups',
            title: 'Groups: The Same Object, Two Rules',
            importance: 'good-to-know',
            summary: 'A create has no id and an update requires one. Groups let one class carry both rule sets instead of splitting into two nearly identical DTOs.',
            interviewAngle: 'A depth question rather than a common one. The judgement worth showing is that groups are often a worse answer than two DTOs, because a shared class with conditional rules is harder to read than two obvious ones.',
            buildsOn: ['bean-validation-basics'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Groups, and the alternative to weigh them against',
                    code: 'interface OnCreate { }\ninterface OnUpdate { }\n\nrecord InvoiceRequest(\n        @Null(groups = OnCreate.class)\n        @NotNull(groups = OnUpdate.class) String id,\n        @NotBlank(groups = { OnCreate.class, OnUpdate.class }) String customerId) {\n}\n\n// @Validated, not @Valid -- only @Validated takes groups.\n@PostMapping\nInvoice create(@Validated(OnCreate.class) @RequestBody InvoiceRequest r) { }\n\n@PutMapping("/{id}")\nInvoice update(@Validated(OnUpdate.class) @RequestBody InvoiceRequest r) { }',
                    notes: '<p>Note the annotation: <code>@Valid</code> is from Jakarta and takes no arguments; <code>@Validated</code> is Spring\'s and is the only one that accepts groups. Reaching for <code>@Valid(OnCreate.class)</code> does not compile, and it is a common first attempt.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Say the trade-off rather than just the mechanism: <em>"Groups work, and I would usually prefer two record types — <code>CreateInvoice</code> and <code>UpdateInvoice</code>. They are a few more lines and each one is readable on its own, whereas a shared class annotated with group conditions has to be mentally evaluated against a group before you know what it requires."</em></p>'
                }
            ],
            docs: [
                { title: 'Validation Groups', url: 'https://jakarta.ee/specifications/bean-validation/3.0/', kind: 'spec' }
            ],
            relatedQuestions: []
        },

        {
            id: 'custom-constraints',
            title: 'Writing a Constraint',
            importance: 'good-to-know',
            summary: 'An annotation plus a validator class. Worth it when the rule is reused, and worth resisting when the rule needs a database.',
            interviewAngle: 'Comes up as "how would you validate that an email is not already registered". The good answer notes that a constraint doing a database lookup has a race condition and belongs in the service with a unique constraint behind it.',
            buildsOn: ['bean-validation-basics'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The two halves',
                    code: '@Documented\n@Constraint(validatedBy = CurrencyValidator.class)\n@Target({ FIELD, PARAMETER })\n@Retention(RUNTIME)\npublic @interface SupportedCurrency {\n    String message() default "unsupported currency";\n    Class<?>[] groups() default { };            // required by the spec\n    Class<? extends Payload>[] payload() default { };\n}\n\nclass CurrencyValidator\n        implements ConstraintValidator<SupportedCurrency, String> {\n\n    public boolean isValid(String value, ConstraintValidatorContext ctx) {\n        return value == null || SUPPORTED.contains(value);   // null is @NotNull\'s job\n    }\n}',
                    notes: '<p>The <code>groups()</code> and <code>payload()</code> members are required by the specification even when unused, and omitting them produces an initialisation error at startup rather than a compile error. Treating <code>null</code> as valid is the convention: composing with <code>@NotNull</code> is how absence is expressed, and a constraint that rejects null cannot be used on an optional field.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A constraint that queries the database is a check-then-act race.</strong> "Is this email already registered" is true when the validator asks and false a millisecond later, so two concurrent registrations both pass validation and one fails at the unique index — as a 500, from a layer that has no idea what happened. Validators are for rules that are decidable from the value itself. Uniqueness belongs to the database, and the service catches the constraint violation and converts it into a 409.</p>'
                }
            ],
            docs: [
                { title: 'Configuring a Custom Constraint', url: 'https://docs.spring.io/spring-framework/reference/core/validation/beanvalidation.html', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'controlleradvice',
            title: '@ControllerAdvice',
            importance: 'must-know',
            summary: 'One class holding the exception-to-status mapping for the whole application, so no controller contains a try/catch that produces a response.',
            interviewAngle: 'Always asked alongside validation. The answer that shows structure is that it centralises the mapping — the point is not that it catches exceptions but that there is exactly one place that decides what a given exception means to a client.',
            buildsOn: ['bean-validation-basics'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The shape, including the two validation exceptions',
                    code: '@RestControllerAdvice\nclass ApiExceptionHandler extends ResponseEntityExceptionHandler {\n\n    // Domain exceptions -> the status THEY mean.\n    @ExceptionHandler(InvoiceNotFound.class)\n    ProblemDetail notFound(InvoiceNotFound e) {\n        return ProblemDetail.forStatusAndDetail(NOT_FOUND, e.getMessage());\n    }\n\n    @ExceptionHandler(VersionConflict.class)\n    ProblemDetail conflict(VersionConflict e) {\n        return ProblemDetail.forStatusAndDetail(CONFLICT, e.getMessage());\n    }\n\n    // The one most codebases are missing: @RequestParam validation.\n    @ExceptionHandler(ConstraintViolationException.class)\n    ProblemDetail constraint(ConstraintViolationException e) {\n        return ProblemDetail.forStatusAndDetail(BAD_REQUEST, e.getMessage());\n    }\n\n    // The catch-all. LOG the cause; do not return it.\n    @ExceptionHandler(Exception.class)\n    ProblemDetail unexpected(Exception e) {\n        log.error("unhandled", e);\n        return ProblemDetail.forStatusAndDetail(\n                INTERNAL_SERVER_ERROR, "Something went wrong");\n    }\n}',
                    notes: '<p>Extending <code>ResponseEntityExceptionHandler</code> gives sensible handling of Spring\'s own web exceptions — unreadable body, missing parameter, wrong media type — each already mapped to the right status. Overriding one method is how you customise a single case without re-implementing the rest.</p>'
                },
                {
                    type: 'types',
                    title: 'The mechanisms, and how they resolve',
                    items: [
                        { name: '@ExceptionHandler on the advice', html: '<p>Application-wide. Selection prefers the <strong>most specific</strong> exception type, so a handler for <code>Exception</code> and one for <code>InvoiceNotFound</code> coexist correctly.</p>' },
                        { name: '@ExceptionHandler on a controller', html: '<p>That controller only, and it wins over the advice. Useful, and a place where a mapping can hide.</p>' },
                        { name: '@ResponseStatus on the exception', html: '<p>Simplest, and it couples a domain exception to HTTP. Reasonable for an exception that only ever means one thing.</p>' },
                        { name: 'Scoping the advice', html: '<p><code>@RestControllerAdvice(basePackages = ...)</code> or <code>assignableTypes</code>, for an application with two APIs that need different error shapes.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A <code>@ControllerAdvice</code> does not catch what happens outside the dispatcher.</strong> An exception thrown in a servlet filter — Spring Security\'s authentication failures, most obviously — never reaches it, because the advice lives inside <code>DispatcherServlet</code> and the filter chain is outside. That is why a 401 from Spring Security has a different body shape from every other error in the application unless an <code>AuthenticationEntryPoint</code> is configured to match. It is the filters-and-interceptors distinction showing up as an inconsistent API.</p>'
                }
            ],
            docs: [
                { title: 'Exception Handling', url: 'https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-exceptionhandler.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'rest-api', questionId: 'controlleradvice-and-problemdetail' },
                { topicId: 'rest-api', questionId: 'exception-to-status-mapping' }
            ]
        },

        {
            id: 'problemdetail-rfc9457',
            title: 'ProblemDetail and RFC 9457',
            importance: 'must-know',
            summary: 'A standard error body: type, title, status, detail, instance, plus whatever else you add. Built into Spring since 6.0, so there is no reason to invent a shape.',
            interviewAngle: 'A current-practice question. Knowing the standard exists and is in the framework — rather than describing a bespoke error DTO — is the signal, and the RFC number changed recently which is a small bonus detail.',
            buildsOn: ['controlleradvice'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'http',
                    title: 'What a problem response looks like',
                    code: 'HTTP/1.1 422 Unprocessable Entity\nContent-Type: application/problem+json\n\n{\n  "type": "https://api.acme.com/problems/insufficient-funds",\n  "title": "Insufficient funds",\n  "status": 422,\n  "detail": "Balance 40.00 EUR is below the requested 42.50 EUR",\n  "instance": "/api/accounts/a-771/withdrawals",\n  "traceId": "3f7a1c",\n  "errors": [\n    { "field": "amount", "message": "must not exceed the balance" }\n  ]\n}',
                    notes: '<p><code>type</code> is a URI identifying the <em>kind</em> of problem and is the field a client should branch on — it is stable, whereas <code>detail</code> is prose meant for a human and may be reworded at any time. <code>traceId</code> and <code>errors</code> are extensions; the specification explicitly allows extra members, which is what makes the standard usable rather than restrictive.</p>'
                },
                {
                    type: 'version',
                    title: 'The standard and its framework support',
                    items: [
                        { version: 'RFC 7807', state: 'was', html: '<p>The original "Problem Details for HTTP APIs", 2016. Most existing implementations and blog posts cite this number.</p>' },
                        { version: 'RFC 9457', state: 'is', html: '<p><strong>Obsoletes 7807</strong>, 2023. The format is unchanged in substance; the media type is still <code>application/problem+json</code>.</p>' },
                        { version: 'Spring Framework 6.0', state: 'changed', html: '<p><code>ProblemDetail</code> built in, and <code>ErrorResponseException</code> for throwing one directly. Before this, every codebase wrote its own error DTO.</p>' },
                        { version: 'Spring Boot 3.0', state: 'is', html: '<p><code>spring.mvc.problemdetails.enabled=true</code> makes Spring\'s own built-in exceptions return problem responses too, so the shape is consistent without writing a handler for each.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>Turning on <code>spring.mvc.problemdetails.enabled</code> is the cheapest way to make an API consistent, and it is off by default. Without it a validation failure returns Boot\'s legacy error body and your own handlers return problem details, which is precisely the two-shapes problem the module is about.</p>'
                }
            ],
            docs: [
                { title: 'RFC 9457 — Problem Details for HTTP APIs', url: 'https://www.rfc-editor.org/rfc/rfc9457.html', kind: 'spec' },
                { title: 'ProblemDetail', url: 'https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/http/ProblemDetail.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'rest-api', questionId: 'controlleradvice-and-problemdetail' }
            ]
        },

        {
            id: 'error-shape-design',
            title: 'Designing the Error Body',
            importance: 'should-know',
            summary: 'Something for the machine to branch on, something for a person to read, something to correlate with a log, and per-field detail when the fault is per field.',
            interviewAngle: 'A design question with a checkable answer. The requirement most often missed is a correlation id, and it is the one that matters most when a customer reports an error two days later.',
            buildsOn: ['problemdetail-rfc9457'],
            blocks: [
                {
                    type: 'types',
                    title: 'What an error body has to carry',
                    items: [
                        { name: 'A stable machine-readable code', html: '<p>The <code>type</code> URI, or a code string. It must not change when someone improves the wording, because clients branch on it.</p>' },
                        { name: 'A human-readable message', html: '<p>Prose, in <code>detail</code>. Free to change, and never parsed.</p>' },
                        { name: 'A correlation id', html: '<p><strong>The most valuable field and the most often absent.</strong> It turns "I got an error on Tuesday" into one log query. Return the trace id you already have.</p>' },
                        { name: 'Per-field errors, when relevant', html: '<p>A list of field and message pairs, so a form can highlight the right inputs. Only meaningful for validation failures — do not force other errors into the shape.</p>' },
                        { name: 'Nothing else', html: '<p>Specifically: no stack trace, no SQL, no internal identifiers. The next chapter is about why.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Localised error messages belong in the client, not the API.</strong> An API that returns Portuguese because a header said so cannot be cached per response, has to carry a message catalogue, and still gets it wrong when the same response is shown to two users. Return a stable code and let the client render it. The exception is a message with no client — an email, a webhook payload — where the API is the last stop.</p>'
                }
            ],
            docs: [
                { title: 'RFC 9457 §3 — The Problem Details Object', url: 'https://www.rfc-editor.org/rfc/rfc9457.html#name-the-problem-details-json-ob', kind: 'spec' }
            ],
            relatedQuestions: [
                { topicId: 'rest-api', questionId: 'validation-error-messages' }
            ]
        },

        {
            id: 'what-not-to-leak-in-an-error',
            title: 'What Never Goes in an Error Response',
            importance: 'must-know',
            summary: 'A stack trace tells an attacker your framework versions, your package layout and often your file paths. Everything useful for debugging belongs in the log.',
            interviewAngle: 'A security-flavoured question with a definite answer, and a place where a specific Spring setting can be named. Knowing that server.error.include-stacktrace defaults to never — and that developers routinely set it to always and forget — is the practical half.',
            buildsOn: ['error-shape-design'],
            blocks: [
                {
                    type: 'types',
                    title: 'What a leaked error hands over',
                    items: [
                        { name: 'A stack trace', html: '<p>Framework and library versions, which map directly to published CVEs; your package structure; sometimes absolute file paths and the username the process runs as.</p>' },
                        { name: 'A SQL exception message', html: '<p>Table and column names, and the shape of a query. <code>DataIntegrityViolationException</code> messages frequently contain the constraint name and the offending value.</p>' },
                        { name: 'A distinguishing authentication error', html: '<p>"No such user" against "wrong password" is a username enumeration oracle. One message for both.</p>' },
                        { name: 'Internal identifiers or hostnames', html: '<p>An upstream service name, an internal URL, a queue name. All of it is reconnaissance.</p>' },
                        { name: 'The raw upstream error', html: '<p>Passing a downstream failure through unmodified leaks that service\'s implementation as well as your own.</p>' }
                    ]
                },
                {
                    type: 'syntax',
                    language: 'properties',
                    title: 'The settings, and their defaults',
                    code: '# The defaults are already right. The risk is somebody changing them\n# for local debugging and the change reaching production.\nserver.error.include-stacktrace=never\nserver.error.include-message=never\nserver.error.include-binding-errors=never\nserver.error.include-exception=false\n\n# Actuator too: this one exposes far more than most people expect.\nmanagement.endpoints.web.exposure.include=health,info,prometheus\nmanagement.endpoint.health.show-details=when-authorized',
                    notes: '<p><code>include-message=never</code> is worth understanding rather than just setting: it suppresses the exception message, which is why a carefully written <code>ProblemDetail</code> is the right way to say something useful. The setting removes the accidental disclosure and your handler supplies the deliberate one.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The formulation that answers the whole question: <em>"The client gets a stable code, a human-readable message somebody wrote on purpose, and a correlation id. Everything else — the stack trace, the SQL, the upstream response — goes to the log, keyed by that same id. Debuggability does not require disclosure; it requires being able to find the log line."</em></p>'
                }
            ],
            docs: [
                { title: 'Spring Boot — Error Handling Properties', url: 'https://docs.spring.io/spring-boot/reference/web/servlet.html', kind: 'guide' }
            ],
            relatedQuestions: []
        }
    ]
};
