/* ==========================================================================
   data/theory/serialization.js — module 39 in the reading path

   Eight chapters, and the plan's tagline is exact: where a working API
   quietly starts returning the wrong thing. Nothing in this module makes an
   application fail to start. Every trap here produces a response that
   serialises successfully and says something untrue.
   ========================================================================== */

const serializationModule = {
    id: 'serialization',
    trackId: 'web-api',
    order: 39,
    title: 'Jackson and Its Traps',
    tagline: 'Where a working API quietly starts returning the wrong thing.',
    estimatedMinutes: 35,
    prerequisites: ['validation-and-errors'],
    docHub: { title: 'Jackson Databind', url: 'https://github.com/FasterXML/jackson-databind/wiki' },

    chapters: [
        {
            id: 'objectmapper-and-configuration',
            title: 'The ObjectMapper Boot Gave You',
            importance: 'must-know',
            summary: 'Spring Boot auto-configures one with a good deal of setup on it. Replacing it with your own is the most common way to lose Java time support silently.',
            interviewAngle: 'Comes up as "how do you configure Jackson in Spring Boot". The answer that shows understanding is the customizer rather than a new bean, and the reason is the back-off rule from the container module.',
            buildsOn: [],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The right way and the tempting way',
                    code: '// RIGHT: customise the one Boot built.\n@Bean\nJackson2ObjectMapperBuilderCustomizer json() {\n    return builder -> builder\n            .serializationInclusion(JsonInclude.Include.NON_NULL)\n            .featuresToDisable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);\n}\n\n// Or properties, for the common cases -- no code at all.\n// spring.jackson.default-property-inclusion=non_null\n// spring.jackson.serialization.write-dates-as-timestamps=false\n\n// TEMPTING AND WRONG: this REPLACES Boot\'s mapper.\n@Bean\nObjectMapper objectMapper() {\n    return new ObjectMapper();          // no modules, no configuration\n}',
                    output: {
                        kind: 'trace',
                        lines: [
                            'JacksonAutoConfiguration declares its ObjectMapper with @ConditionalOnMissingBean.',
                            'Defining your own means the auto-configured one is never created -- the back-off rule working exactly as designed.',
                            'What goes with it: JavaTimeModule, ParameterNamesModule, Jdk8Module, and every spring.jackson.* property.',
                            'The first symptom is usually a LocalDateTime serialising as {"year":2026,"month":"AUGUST",...} instead of an ISO string, in one endpoint that somebody noticed.'
                        ],
                        explain: '<p>Boot registers every Jackson <code>Module</code> it finds on the class path, which is how <code>LocalDate</code> support appears without anyone configuring it. A bare <code>new ObjectMapper()</code> has none of them, and the failure is per-type rather than global — so it is found one endpoint at a time.</p>'
                    }
                },
                {
                    type: 'types',
                    title: 'The features worth setting deliberately',
                    items: [
                        { name: 'FAIL_ON_UNKNOWN_PROPERTIES', html: '<p>Boot disables it. That makes clients forwards-compatible when a field is added, and it also means a <strong>typo in a request body is silently ignored</strong> rather than rejected. Reasonable either way; know which you have.</p>' },
                        { name: 'WRITE_DATES_AS_TIMESTAMPS', html: '<p>Boot disables it, so dates are ISO-8601 strings. Enabled, they are epoch numbers — smaller, unreadable, and ambiguous about precision.</p>' },
                        { name: 'default-property-inclusion', html: '<p><code>non_null</code> omits nulls entirely. Smaller payloads, and it destroys the distinction between "null" and "absent" — see the chapter on that.</p>' },
                        { name: 'ACCEPT_SINGLE_VALUE_AS_ARRAY', html: '<p>Lenient parsing of a scalar where a list was expected. Useful when consuming an API you do not control.</p>' },
                        { name: 'PropertyNamingStrategy', html: '<p><code>SNAKE_CASE</code> globally, if that is your API convention. Set it once rather than annotating every field.</p>' }
                    ]
                }
            ],
            docs: [
                { title: 'Spring Boot — JSON', url: 'https://docs.spring.io/spring-boot/reference/features/json.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'rest-api', questionId: 'jackson-basics' }
            ]
        },

        {
            id: 'annotations-worth-knowing',
            title: 'The Annotations That Earn Their Place',
            importance: 'should-know',
            summary: 'Ten or so cover nearly everything. The two worth understanding properly are @JsonIgnore, which is asymmetric, and @JsonView, which is not worth it.',
            interviewAngle: 'A recall question with one good trap in it: @JsonIgnore on a password field blocks it in both directions, so the field cannot be received either. Knowing @JsonProperty.Access is the fix is the discriminating detail.',
            buildsOn: ['objectmapper-and-configuration'],
            blocks: [
                {
                    type: 'table',
                    title: 'The set that covers most needs',
                    headers: ['Annotation', 'Does', 'Note'],
                    rows: [
                        ['<code>@JsonProperty("name")</code>', 'Renames a field', 'Also makes it required with <code>required = true</code> — for documentation only'],
                        ['<code>@JsonIgnore</code>', 'Excludes a field', '<strong>Both directions.</strong> See below'],
                        ['<code>@JsonIgnoreProperties</code>', 'Excludes several, or unknown ones', '<code>ignoreUnknown = true</code> per class'],
                        ['<code>@JsonFormat</code>', 'Pattern and time zone for a date', 'Per field, overriding the global setting'],
                        ['<code>@JsonInclude(NON_NULL)</code>', 'Omits nulls', 'Per class or per field'],
                        ['<code>@JsonAnyGetter</code> / <code>@JsonAnySetter</code>', 'A map of extra fields', 'For genuinely open schemas'],
                        ['<code>@JsonCreator</code>', 'Names the constructor to deserialise with', 'Rarely needed since parameter names became available'],
                        ['<code>@JsonSerialize</code> / <code>@JsonDeserialize</code>', 'A custom converter', 'The escape hatch']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong><code>@JsonIgnore</code> on a password field also stops it being read.</strong> It is symmetric, so a registration request carrying <code>password</code> arrives with the field null and the account is created with no password — silently, because nothing failed. The fix is <code>@JsonProperty(access = Access.WRITE_ONLY)</code>, which accepts the field and never emits it. <code>READ_ONLY</code> is the mirror image, for a server-computed field a client must not set.</p>'
                },
                {
                    type: 'tip',
                    html: '<p><code>@JsonView</code> exists to serialise one class differently per endpoint, and it is usually the wrong tool: the views are annotations scattered across the model, the compiler cannot check that an endpoint declares the right one, and the failure is a field quietly missing from a response. Two DTOs are more code and each one can be read on its own. Worth saying if an interviewer raises it, because "I know it and I would not use it" is a stronger answer than either half alone.</p>'
                }
            ],
            docs: [
                { title: 'Jackson Annotations', url: 'https://github.com/FasterXML/jackson-annotations/wiki/Jackson-Annotations', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'rest-api', questionId: 'jackson-basics' }
            ]
        },

        {
            id: 'polymorphic-deserialization',
            title: 'Polymorphic Types',
            importance: 'should-know',
            summary: 'A type discriminator in the JSON tells Jackson which subclass to build. Doing it with an allow-list is essential, and doing it with default typing is a remote code execution vulnerability.',
            interviewAngle: 'A security question wearing a serialisation hat. Being able to say why enableDefaultTyping was deprecated — it lets the payload choose the class to instantiate — is worth more than the mechanism.',
            buildsOn: ['annotations-worth-knowing'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The safe form: a sealed hierarchy and a closed list',
                    code: '@JsonTypeInfo(\n        use = JsonTypeInfo.Id.NAME,          // a name, never a class name\n        include = JsonTypeInfo.As.PROPERTY,\n        property = "type")\n@JsonSubTypes({                              // the ALLOW-LIST\n        @JsonSubTypes.Type(value = CardPayment.class,   name = "card"),\n        @JsonSubTypes.Type(value = SepaPayment.class,   name = "sepa")\n})\nsealed interface Payment permits CardPayment, SepaPayment { }\n\n// {"type":"card","pan":"...","cvv":"..."}  -> CardPayment\n// {"type":"paypal",...}                    -> InvalidTypeIdException',
                    notes: '<p><code>Id.NAME</code> with an explicit <code>@JsonSubTypes</code> list means the payload selects from types you enumerated. <code>Id.CLASS</code> puts a fully-qualified class name in the JSON instead, which both leaks your package structure and widens what a payload can ask for.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Default typing is the Jackson deserialisation vulnerability class.</strong> With <code>enableDefaultTyping()</code> — deprecated, and replaced by <code>activateDefaultTyping</code> with a required validator — the JSON names the class to instantiate, and Jackson instantiates it. An attacker picks a gadget class already on your class path whose construction has a side effect, and the result has been remote code execution more than once. If polymorphism is needed, enumerate the subtypes. If a library enables default typing, that is a finding.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>A <code>sealed interface</code> pairs well here, and the reason is worth stating: the permits clause and the <code>@JsonSubTypes</code> list are the same list written twice, so the compiler will not let a new subtype appear without the author seeing both. It is not enforcement, but it puts the two lists next to each other.</p>'
                }
            ],
            docs: [
                { title: 'Jackson Polymorphic Deserialization', url: 'https://github.com/FasterXML/jackson-docs/wiki/JacksonPolymorphicDeserialization', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'rest-api', questionId: 'jackson-polymorphism' }
            ]
        },

        {
            id: 'dates-and-time-zones',
            title: 'Dates',
            importance: 'must-know',
            summary: 'Instant for a moment, LocalDate for a calendar day, and never LocalDateTime for anything that happened. Most date bugs are a type chosen wrongly rather than a format.',
            interviewAngle: 'Asked in almost every API round. The answer that lands is about type selection rather than about patterns: LocalDateTime has no time zone, so it cannot identify a moment, and storing one for an event is a bug waiting for a server to move.',
            buildsOn: ['objectmapper-and-configuration'],
            blocks: [
                {
                    type: 'types',
                    title: 'Which type means what',
                    items: [
                        { name: 'Instant', html: '<p>A point on the timeline, in UTC. <strong>The right type for anything that happened</strong> — created, updated, logged, charged. Serialises as <code>2026-08-29T14:02:00Z</code>.</p>' },
                        { name: 'LocalDate', html: '<p>A calendar day with no time and no zone. Right for a birth date, an invoice date, a due date — things that are the same day everywhere.</p>' },
                        { name: 'LocalDateTime', html: '<p>A date and a time with <strong>no zone at all</strong>. It does not identify a moment. Correct for "the shop opens at 09:00", wrong for "the payment was taken at 09:00".</p>' },
                        { name: 'ZonedDateTime', html: '<p>A moment plus the zone it should be displayed in. Right for a future appointment, where the zone rules may change before it arrives.</p>' },
                        { name: 'OffsetDateTime', html: '<p>A moment plus a fixed offset. Unambiguous, and it loses the zone identity — so it cannot survive a daylight-saving rule change the way <code>ZonedDateTime</code> can.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A <code>LocalDateTime</code> stored for an event is a bug with a delayed fuse.</strong> It records what a clock said without recording which clock, so it is only interpretable if you also know the server\'s zone — which is not in the data, changes when the deployment moves, and shifts twice a year anyway. The classic symptom is an hour of duplicated or missing records at a daylight-saving boundary. Store <code>Instant</code>, convert to a zone only when rendering, and make the API contract UTC.</p>'
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Pinning the format where the contract requires one',
                    code: 'record Invoice(\n        String id,\n        @JsonFormat(shape = STRING, pattern = "yyyy-MM-dd")\n        LocalDate issued,\n        Instant createdAt) {                  // ISO-8601 by default, in UTC\n}\n\n// Global, and better than annotating every field:\n// spring.jackson.serialization.write-dates-as-timestamps=false\n// spring.jackson.time-zone=UTC',
                    notes: '<p><code>spring.jackson.time-zone</code> affects how a moment is <em>rendered</em>, not what it means. Setting it to UTC makes output stable regardless of where the process runs, which is one fewer thing that differs between a laptop and a container.</p>'
                }
            ],
            docs: [
                { title: 'JSR-310 Date and Time API', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/time/package-summary.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'rest-api', questionId: 'jackson-dates-and-time' }
            ]
        },

        {
            id: 'bigdecimal-and-money',
            title: 'Money',
            importance: 'must-know',
            summary: 'BigDecimal, as a string on the wire, with the currency beside it. A double cannot represent 0.1 and JavaScript cannot hold a large long.',
            interviewAngle: 'Asked directly in any interview near payments or billing. Two facts carry it: binary floating point cannot represent a decimal fraction exactly, and JSON numbers are parsed as doubles by most clients, so precision is lost after the API is correct.',
            buildsOn: ['dates-and-time-zones'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p><code>double</code> is binary floating point, and 0.1 has no exact binary representation — so <code>0.1 + 0.2</code> is <code>0.30000000000000004</code>, and a sum over a few thousand line items drifts by an amount somebody eventually reconciles by hand. <code>BigDecimal</code> is decimal and exact, which is the entire reason it exists.</p><p>The second half is about the wire. A JSON number is parsed by JavaScript into a double, so <code>42.50</code> survives and a sixteen-digit amount in minor units does not. Serialising money as a <strong>string</strong> keeps the exact digits regardless of what parses it.</p>'
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Amount and currency together, as a string',
                    code: '@JsonFormat(shape = JsonFormat.Shape.STRING)\nBigDecimal amount;              // "42.50", not 42.5\n\n// Better still, one type that cannot be used without its currency:\nrecord Money(\n        @JsonFormat(shape = STRING) BigDecimal amount,\n        String currency) {                       // "EUR"\n\n    Money {\n        amount = amount.setScale(2, RoundingMode.HALF_UP);\n    }\n}\n\n// And never this, anywhere near money:\n// new BigDecimal(0.1)   -> 0.1000000000000000055511151231257827\n// new BigDecimal("0.1")  -> 0.1',
                    output: {
                        kind: 'trace',
                        lines: [
                            'Shape.STRING keeps trailing zeros, so 42.50 stays 42.50 rather than becoming 42.5 -- which matters when the output is compared, hashed, or signed.',
                            'The BigDecimal(double) constructor takes the exact binary value of the double, which is why it produces those digits. The String constructor takes what was written.',
                            'equals() on BigDecimal compares scale as well as value, so 2.0 does not equal 2.00. compareTo() is the comparison that means what you expect.',
                            'A bare amount with no currency is the other half of the same bug: adding 10 EUR to 10 USD compiles perfectly.'
                        ],
                        explain: '<p>The <code>equals</code> point catches people in tests rather than in production: an assertion that a total equals <code>new BigDecimal("2.0")</code> fails against a computed <code>2.00</code>, and the message shows two numbers that look identical. Use <code>compareTo</code>, or set the scale consistently as the record above does.</p>'
                    }
                },
                {
                    type: 'tip',
                    html: '<p>The alternative worth naming is storing minor units as a <code>long</code> — 4250 rather than 42.50. It is exact, it is fast, it cannot be misrounded, and it needs the currency to know how many minor units there are, since not every currency has two. Both approaches are defensible; the indefensible one is <code>double</code>.</p>'
                }
            ],
            docs: [
                { title: 'BigDecimal', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/math/BigDecimal.html', kind: 'api' }
            ],
            relatedQuestions: []
        },

        {
            id: 'null-vs-absent',
            title: 'Null Is Not Absent',
            importance: 'should-know',
            summary: 'For a PATCH the two mean opposite things: a null clears the field and an absent key leaves it alone. Most implementations cannot tell them apart.',
            interviewAngle: 'The design question behind partial update. Almost everyone implements PATCH by ignoring nulls, which makes clearing a field impossible — and noticing that is the whole answer.',
            buildsOn: ['annotations-worth-knowing'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>A DTO field deserialised from JSON is null in two different situations: the client sent <code>"note": null</code>, and the client did not mention <code>note</code> at all. For a <code>PUT</code> that is fine, because a PUT replaces the whole resource and absence means "not set". For a <code>PATCH</code> it is a real ambiguity, and resolving it by ignoring nulls means <strong>no client can ever clear an optional field</strong>.</p>'
                },
                {
                    type: 'types',
                    title: 'The three ways out',
                    items: [
                        { name: 'JsonNullable', html: '<p>From the <code>jackson-databind-nullable</code> module. <code>JsonNullable&lt;String&gt;</code> distinguishes absent, present-and-null, and present-with-value in the type. Explicit, and it is what the OpenAPI generator emits.</p>' },
                        { name: 'A raw map or JsonNode', html: '<p>Deserialise to <code>Map&lt;String, Object&gt;</code> and use <code>containsKey</code>. Honest about what arrived, and it gives up every constraint annotation and all type safety.</p>' },
                        { name: 'JSON Merge Patch, or JSON Patch', html: '<p>RFC 7386 and RFC 6902. The standardised answers: merge patch gives null its clearing meaning by specification, and JSON Patch is an explicit list of operations. Correct, and heavier than most APIs want.</p>' },
                        { name: 'Do not offer it', html: '<p>Use <code>PUT</code> and require the whole resource. Loses nothing except bandwidth, and removes the ambiguity entirely — which for a small resource is the right trade.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong><code>@JsonInclude(NON_NULL)</code> on a response has the same ambiguity in the other direction.</strong> Omitting nulls makes payloads smaller and makes a client unable to distinguish "the server has no value for this" from "this version of the API does not have this field". For a response consumed by a client you control that is usually fine; for a public API it is worth deciding deliberately rather than inheriting from a global setting.</p>'
                }
            ],
            docs: [
                { title: 'RFC 7386 — JSON Merge Patch', url: 'https://www.rfc-editor.org/rfc/rfc7386.html', kind: 'spec' }
            ],
            relatedQuestions: [
                { topicId: 'rest-api', questionId: 'partial-update-patch' }
            ]
        },

        {
            id: 'records-and-jackson',
            title: 'Records',
            importance: 'should-know',
            summary: 'Jackson has supported records natively since 2.12, using the canonical constructor. Immutable DTOs need no annotations and no builder.',
            interviewAngle: 'A current-practice detail. Knowing that no @JsonCreator is needed, and that the compact constructor is the place to normalise or validate, shows the feature has actually been used.',
            buildsOn: ['annotations-worth-knowing'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The whole DTO',
                    code: 'record CreateInvoice(\n        @NotBlank String customerId,\n        @JsonProperty("amount_due") BigDecimal amountDue,\n        List<LineItem> lines) {\n\n    // The compact constructor: normalisation and invariants, once,\n    // for every way the record can be built -- Jackson included.\n    CreateInvoice {\n        lines = lines == null ? List.of() : List.copyOf(lines);\n    }\n}',
                    notes: '<p>No <code>@JsonCreator</code>, no builder, no setters, no <code>equals</code> to write. Jackson finds the canonical constructor and the component accessors. <code>@JsonProperty</code> still works for renaming, placed on the component.</p>'
                },
                {
                    type: 'version',
                    title: 'Record support',
                    items: [
                        { version: 'Jackson 2.12', state: 'changed', html: '<p>Native record support. Before it, records needed <code>@JsonCreator</code> and <code>@JsonProperty</code> on every component, which is why older examples look verbose.</p>' },
                        { version: 'Java 16', state: 'is', html: '<p>Records final. Boot 3 requires Java 17, so records are always available in a current codebase.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A record cannot be a JPA entity</strong>, and this catches people who have just started using them for DTOs. JPA needs a no-argument constructor and mutable fields for lazy loading and dirty checking; a record has neither. That constraint is a feature at the boundary — it makes it awkward to return an entity from a controller, which is the thing this deck argues against elsewhere. Records for DTOs, classes for entities.</p>'
                }
            ],
            docs: [
                { title: 'JEP 395: Records', url: 'https://openjdk.org/jeps/395', kind: 'spec' }
            ],
            relatedQuestions: []
        },

        {
            id: 'circular-references-in-jpa-entities',
            title: 'Serialising an Entity Graph',
            importance: 'must-know',
            summary: 'A bidirectional association serialises forever, a lazy one throws, and both problems disappear if the controller never sees an entity.',
            interviewAngle: 'One of the most common real bugs in a Spring codebase, and the interviewer usually wants the annotations. The better answer gives them and then says the annotations are treating a symptom.',
            buildsOn: ['records-and-jackson'],
            blocks: [
                {
                    type: 'types',
                    title: 'The three failures, all from the same cause',
                    items: [
                        { name: 'Infinite recursion', html: '<p><code>Order</code> has <code>List&lt;LineItem&gt;</code>, each <code>LineItem</code> has an <code>Order</code>. Jackson walks it until the stack ends — a <code>StackOverflowError</code>, or a response that grows until the connection dies.</p>' },
                        { name: 'LazyInitializationException', html: '<p>Serialisation happens in the controller, after the transaction closed, so touching a lazy association has no session to load it from. A 500 from the serialiser, on an endpoint whose logic succeeded.</p>' },
                        { name: 'Accidental N+1', html: '<p>Worse, because it works. If the session is still open — <code>spring.jpa.open-in-view</code>, which is <strong>on by default</strong> — each lazy association loads as Jackson reaches it: one query per row, issued by the serialiser, invisible in the service code.</p>' }
                    ]
                },
                {
                    type: 'table',
                    title: 'The workarounds, and what each costs',
                    headers: ['Approach', 'Fixes', 'Costs'],
                    rows: [
                        ['<code>@JsonIgnore</code> on the back-reference', 'Recursion', 'The field is gone in both directions'],
                        ['<code>@JsonManagedReference</code> / <code>@JsonBackReference</code>', 'Recursion', 'One side is not serialised; the pair must stay in sync'],
                        ['<code>@JsonIdentityInfo</code>', 'Recursion', 'The second occurrence becomes a bare id — an odd shape for a client'],
                        ['<code>jackson-datatype-hibernate</code>', 'Lazy proxies', 'Renders unloaded associations as null, silently'],
                        ['<strong>A DTO</strong>', '<strong>All three</strong>', 'A mapping step you have to write']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Every row but the last is a workaround for serialising an entity, which is the actual mistake.</strong> An entity is a persistence model: it has bidirectional links because the ORM needs them, lazy proxies because loading is deferred, and a shape driven by the schema. An API response is a contract with a client. Coupling them means a column rename is a breaking API change and a new association is a new field in every response. A DTO costs a mapping step and buys back the recursion, the lazy exception, the N+1 and the coupling all at once.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Turn <code>spring.jpa.open-in-view</code> off, and know why it is on. It keeps the persistence context open for the whole request so lazy loading in the view layer works — which is convenient, hides N+1 queries inside serialisation, and holds a database connection for the duration of the response. Boot logs a warning about it at startup that almost nobody reads.</p>'
                }
            ],
            docs: [
                { title: 'Spring Boot — Data Properties', url: 'https://docs.spring.io/spring-boot/appendix/application-properties/index.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'rest-api', questionId: 'dto-vs-entity' }
            ]
        }
    ]
};
