/* ==========================================================================
   data/theory/reflection-and-annotations.js — module 18 in the reading path

   Last of the six section 5.9 java-platform insertions. Its prerequisite is
   generics-and-erasure rather than the module before it, because half the
   surprises in reflection are erasure showing through — a Class object that
   cannot tell you what a List holds, and a getGenericType() that sometimes
   can.

   Nine chapters, and the through-line is the plan's tagline: how Spring does
   what it does, and what Lombok is really doing. Both are answered by the
   same fact — a lot of what looks like magic is either reflection at run
   time or code generation at compile time, and knowing which one you are
   looking at tells you where to go when it misbehaves.

   The two Lombok chapters are deliberate. Lombok is in most Java codebases,
   it is asked about, and the interaction between @Data and a JPA entity is a
   defect that ships regularly.
   ========================================================================== */

const reflectionAndAnnotationsModule = {
    id: 'reflection-and-annotations',
    trackId: 'java-platform',
    order: 18,
    title: 'Reflection, Annotations and Code Generation',
    tagline: 'How Spring does what it does, and what Lombok is really doing.',
    estimatedMinutes: 40,
    prerequisites: ['generics-and-erasure'],
    docHub: { title: 'java.lang.reflect', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/reflect/package-summary.html' },

    chapters: [
        {
            id: 'reflection-basics',
            title: 'What Reflection Can See',
            importance: 'should-know',
            summary: 'A Class object exposes constructors, methods, fields and annotations, and can invoke or read them. What it cannot see is the type argument of a variable, because that was erased.',
            interviewAngle: 'The useful depth is the boundary: getGenericSuperclass and getGenericParameterType survive erasure because they read the class file, while the runtime type of an object does not.',
            buildsOn: [],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The API, and the wall it hits',
                    code: 'Class<?> type = order.getClass();\n\ntype.getDeclaredFields();        // this class only, including private\ntype.getFields();                // public, including inherited\ntype.getDeclaredMethods();\ntype.getDeclaredConstructor(String.class).newInstance("x");\n\nField f = type.getDeclaredField("total");\nf.setAccessible(true);           // bypasses private -- see the module note\nObject value = f.get(order);\n\n// ERASURE. The object cannot tell you what it holds.\nList<String> names = new ArrayList<>();\nnames.getClass();                       // class java.util.ArrayList. Full stop.\n\n// But a DECLARATION keeps its type arguments in the class file, so\n// reflection over a FIELD or a METHOD SIGNATURE can read them:\nclass Holder { List<String> names; }\nField field = Holder.class.getDeclaredField("names");\nfield.getType();                        // interface java.util.List\nfield.getGenericType();                 // java.util.List<java.lang.String>',
                    output: {
                        kind: 'trace',
                        lines: [
                            'names.getClass()          -> class java.util.ArrayList        the instance has no type argument to report',
                            'field.getType()           -> interface java.util.List         the erased type',
                            'field.getGenericType()    -> java.util.List<java.lang.String> read from the Signature attribute in the class file',
                            'The rule: erasure removes types from OBJECTS, not from DECLARATIONS.'
                        ],
                        explain: '<p>That distinction is exactly how Jackson deserialises into <code>List&lt;Order&gt;</code> when you give it a <code>TypeReference</code>, and why it cannot when you give it <code>List.class</code>. The anonymous subclass in <code>new TypeReference&lt;List&lt;Order&gt;&gt;(){}</code> exists so that there is a <em>declaration</em> to read the type argument from.</p>'
                    }
                },
                {
                    type: 'pitfall',
                    html: '<p><strong><code>setAccessible(true)</code> is not free access any more.</strong> Since the module system (Java 9) and strong encapsulation by default (Java 16), reflecting into a package that is not open to you throws <code>InaccessibleObjectException</code>. A library that reflects into <code>java.util</code> internals needs <code>--add-opens</code> on the command line, which is why upgrading past 16 broke a generation of mocking and serialization libraries.</p>'
                }
            ],
            docs: [
                { title: 'java.lang.reflect', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/reflect/package-summary.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'java-language', questionId: 'type-erasure' },
                { topicId: 'java-language', questionId: 'reifiable-types-and-instanceof' }
            ]
        },

        {
            id: 'what-reflection-costs',
            title: 'What It Costs',
            importance: 'should-know',
            summary: 'Lookup is expensive and cacheable; invocation used to be much slower than a direct call and is now close to it. The real cost today is startup time and the optimisations it prevents.',
            interviewAngle: 'The honest answer has changed. Saying "reflection is slow" is a 2010 answer; saying "lookup is slow, invocation is nearly free once warm, and the cost that still matters is startup and AOT" is a current one.',
            buildsOn: ['reflection-basics'],
            blocks: [
                {
                    type: 'types',
                    title: 'Three separate costs, often conflated',
                    items: [
                        { name: 'Lookup', html: '<p><code>getDeclaredMethod</code> walks the class and allocates. Genuinely expensive, and completely avoidable — resolve once at startup and cache the <code>Method</code>. This is what frameworks do.</p>' },
                        { name: 'Invocation', html: '<p><code>Method.invoke</code> boxes arguments and passes through a security check. Historically an order of magnitude slower; the JIT now inlines through it well, and <code>MethodHandle</code> with a constant target is close to a direct call.</p>' },
                        { name: 'Startup and AOT', html: '<p><strong>The cost that still matters.</strong> Reflective access cannot be resolved ahead of time, so it defeats class-loading optimisation, and GraalVM native image requires every reflective target to be declared in configuration. This is why a Spring Boot application starts in seconds rather than milliseconds.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>The practical rule: <strong>reflect at startup, not per request.</strong> A framework that resolves annotations once when the context is built and then calls through cached handles pays the cost once; application code that calls <code>getDeclaredMethod</code> inside a request handler pays it on every request, and that one is measurable.</p>'
                }
            ],
            docs: [
                { title: 'MethodHandles', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/invoke/MethodHandles.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'cloud', questionId: 'java-cold-starts' }
            ]
        },

        {
            id: 'how-spring-uses-reflection',
            title: 'How Spring Uses It',
            importance: 'must-know',
            summary: 'Scan for annotated classes, read the constructor signature, resolve dependencies by type, instantiate, populate, and generate proxies. All of it reflection, all of it at startup.',
            interviewAngle: 'Turns "Spring is magic" into a mechanism. Being able to describe the startup sequence in reflective terms is a strong container answer.',
            buildsOn: ['what-reflection-costs'],
            blocks: [
                {
                    type: 'types',
                    title: 'The startup sequence, in reflective terms',
                    items: [
                        { name: 'Scan', html: '<p><code>ClassPathScanningCandidateComponentProvider</code> reads class files under the base package with ASM — <strong>without loading the classes</strong> — and keeps the ones carrying a stereotype annotation. Reading bytecode rather than loading is a deliberate startup optimisation.</p>' },
                        { name: 'Read the constructor', html: '<p>For each candidate, find the constructor and its parameter types. Parameter <em>names</em> need <code>-parameters</code> at compile time; Spring Boot\'s Maven and Gradle plugins set it, which is why <code>@Value("${x}")</code> on a constructor parameter works without <code>@Qualifier</code>.</p>' },
                        { name: 'Resolve by type', html: '<p>Match each parameter type against the bean definitions, using generic type information read from the signature — which is how <code>Repository&lt;Order&gt;</code> and <code>Repository&lt;Customer&gt;</code> are told apart despite erasure.</p>' },
                        { name: 'Instantiate and populate', html: '<p><code>Constructor.newInstance</code>, then <code>Field.set</code> for any field injection, then the <code>@PostConstruct</code> method by reflection.</p>' },
                        { name: 'Proxy', html: '<p>Generate a JDK proxy or a CGLIB subclass for anything with an interception annotation. This is bytecode generation rather than reflection, and it is the step the patterns module covers.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>GraalVM native image is where all of this becomes visible.</strong> Ahead-of-time compilation must know every reflectively reached class, and the closed-world assumption means anything not registered simply is not there. Spring Boot 3\'s AOT processing generates that configuration from the same bean definitions at build time — which is why native image support required a Spring generation rather than a flag, and why a library that reflects dynamically may still need hints written by hand.</p>'
                }
            ],
            docs: [
                { title: 'Classpath Scanning and Managed Components', url: 'https://docs.spring.io/spring-framework/reference/core/beans/classpath-scanning.html', kind: 'guide' },
                { title: 'Ahead of Time Optimizations', url: 'https://docs.spring.io/spring-boot/reference/packaging/aot.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-core', questionId: 'component-scanning' },
                { topicId: 'spring-boot', questionId: 'native-image-tradeoffs' }
            ]
        },

        {
            id: 'writing-a-custom-annotation',
            title: 'Writing One',
            importance: 'should-know',
            summary: 'An annotation is only a marker. Something has to look for it — an aspect, an argument resolver, a BeanPostProcessor or an annotation processor — and that something is the actual feature.',
            interviewAngle: 'The insight worth conveying is that the annotation is the cheap half. "How would you add @RateLimited" is really "where would you hook the behaviour in", and there are four defensible answers.',
            buildsOn: ['how-spring-uses-reflection'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The marker, and the half that does the work',
                    code: '@Target(ElementType.METHOD)\n@Retention(RetentionPolicy.RUNTIME)   // MUST be RUNTIME to be seen\npublic @interface RateLimited {\n    int permitsPerMinute() default 60;\n    String key() default "";\n}\n\n// Nothing above does anything. This does:\n@Aspect\n@Component\nclass RateLimitAspect {\n\n    @Around("@annotation(limit)")\n    Object apply(ProceedingJoinPoint pjp, RateLimited limit) throws Throwable {\n        String bucket = limit.key().isEmpty()\n                ? pjp.getSignature().toShortString()\n                : limit.key();\n        if (!limiter.tryAcquire(bucket, limit.permitsPerMinute())) {\n            throw new TooManyRequests(bucket);\n        }\n        return pjp.proceed();\n    }\n}',
                    notes: '<p>The aspect route inherits every proxy caveat from the patterns module: a self-invoked <code>@RateLimited</code> method is not rate limited, and a private one never was. That is worth saying when you propose this design, because it is the first thing that will go wrong with it.</p>'
                },
                {
                    type: 'types',
                    title: 'Four places to hook the behaviour, and when each is right',
                    items: [
                        { name: 'An aspect', html: '<p><code>@Around</code> advice on <code>@annotation(...)</code>. The default. Works on any bean method, subject to proxying.</p>' },
                        { name: 'A HandlerMethodArgumentResolver', html: '<p>For an annotation on a controller <em>parameter</em> — <code>@CurrentUser User user</code>. The right hook when the annotation supplies a value rather than wraps a call.</p>' },
                        { name: 'A BeanPostProcessor', html: '<p>For something that must happen once, at wiring time, per bean — registering a listener, validating configuration. Runs at startup rather than per call.</p>' },
                        { name: 'An annotation processor', html: '<p>Compile time. Generates code or fails the build. The only option that costs nothing at run time, and the only one that can reject bad usage before it ships.</p>' }
                    ]
                }
            ],
            docs: [
                { title: 'Declaring Advice', url: 'https://docs.spring.io/spring-framework/reference/core/aop/ataspectj/advice.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'aop-proxies', questionId: 'writing-a-custom-annotation' }
            ]
        },

        {
            id: 'retention-and-target',
            title: 'Retention and Target',
            importance: 'must-know',
            summary: 'Retention decides whether the annotation survives to run time. Target decides where it may be written. Getting retention wrong produces an annotation that silently does nothing.',
            interviewAngle: 'A short, precise question. SOURCE, CLASS and RUNTIME, and knowing that CLASS is the default is the detail most people miss.',
            buildsOn: ['writing-a-custom-annotation'],
            blocks: [
                {
                    type: 'table',
                    title: 'The three retentions',
                    headers: ['Policy', 'Survives to', 'Used by'],
                    rows: [
                        ['<code>SOURCE</code>', 'The compiler only. Discarded before the class file.', '<code>@Override</code>, <code>@SuppressWarnings</code>, Lombok'],
                        ['<code>CLASS</code>', 'The class file, but not loaded into the JVM', 'Bytecode tools; nullability annotations. <strong>The default.</strong>'],
                        ['<code>RUNTIME</code>', 'Readable by reflection', 'Everything Spring, JPA, Jackson and JUnit look for']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>The default is <code>CLASS</code>, so an annotation with no <code>@Retention</code> is invisible to reflection.</strong> It compiles, it can be written on methods, and every framework looking for it finds nothing — no warning, no error, just a feature that never fires. It is the single most common mistake in a first custom annotation, and the symptom is identical to the aspect not being registered, which sends people looking in the wrong place.</p>'
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Target, and the meta-annotation trick Spring uses everywhere',
                    code: '@Target({ ElementType.METHOD, ElementType.TYPE })\n@Retention(RetentionPolicy.RUNTIME)\npublic @interface Audited { }\n\n// ElementType also has: FIELD, PARAMETER, CONSTRUCTOR, ANNOTATION_TYPE,\n// PACKAGE, TYPE_PARAMETER, TYPE_USE, RECORD_COMPONENT, MODULE.\n// Omitting @Target permits every declaration context, which is rarely\n// what you mean.\n\n// COMPOSED ANNOTATIONS: Spring treats a meta-annotated annotation as\n// carrying the meta-annotation. This is how @RestController works --\n// it is @Controller plus @ResponseBody, and nothing special.\n@Target(ElementType.TYPE)\n@Retention(RetentionPolicy.RUNTIME)\n@Transactional(readOnly = true)\n@Service\npublic @interface ReadOnlyService { }\n\n// One annotation on the class now means both.\n@ReadOnlyService\nclass ReportingService { }',
                    notes: '<p>Composition is worth knowing because it is how most of Spring\'s vocabulary is built — <code>@SpringBootApplication</code> is three annotations, <code>@RestController</code> is two — and because it is a genuinely useful tool for removing a repeated annotation triple from forty classes. Spring\'s <code>AnnotatedElementUtils</code> does the meta-annotation search; plain <code>getAnnotation</code> does not, and that difference catches people writing their own scanner.</p>'
                }
            ],
            docs: [
                { title: 'Retention', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/annotation/Retention.html', kind: 'api' },
                { title: 'Annotation Programming Model', url: 'https://docs.spring.io/spring-framework/reference/core/beans/classpath-scanning.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'aop-proxies', questionId: 'writing-a-custom-annotation' }
            ]
        },

        {
            id: 'annotation-processors',
            title: 'Annotation Processors',
            importance: 'good-to-know',
            summary: 'Code that runs inside javac, sees the syntax tree, and can generate new sources or report errors. Everything MapStruct, Immutables and the Spring configuration metadata generator do.',
            interviewAngle: 'The differentiator is knowing that this is compile-time and therefore free at run time, and that it can fail the build — which run-time reflection can never do.',
            buildsOn: ['retention-and-target'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'Compile time against run time, as strategies',
                    left: 'Annotation processor',
                    right: 'Reflection at run time',
                    rows: [
                        { aspect: 'When it runs', left: 'Inside <code>javac</code>', right: 'On startup, or per call' },
                        { aspect: 'Run-time cost', left: 'None — the output is ordinary code', right: 'Lookup, and sometimes invocation' },
                        { aspect: 'Can reject bad usage', left: '<strong>Yes — fails the build with a message</strong>', right: 'No. It throws at run time, in production.' },
                        { aspect: 'Debuggable', left: 'Step into the generated source', right: 'Step into a framework' },
                        { aspect: 'Native image', left: 'Works with no configuration', right: 'Needs reflection hints' },
                        { aspect: 'Can it see run-time state', left: 'No', right: 'Yes — configuration, profiles, the actual object' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>The Spring Boot configuration processor is the one every project already has and few people notice: it reads <code>@ConfigurationProperties</code> classes and emits <code>META-INF/spring-configuration-metadata.json</code>, which is what gives an IDE autocompletion and documentation for your own properties in <code>application.yml</code>. Adding the processor dependency is a two-line change with an immediate payoff.</p>'
                }
            ],
            docs: [
                { title: 'Configuration Metadata', url: 'https://docs.spring.io/spring-boot/specification/configuration-metadata/index.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-boot', questionId: 'configuration-properties-binding' }
            ]
        },

        {
            id: 'lombok-what-it-generates',
            title: 'What Lombok Actually Does',
            importance: 'should-know',
            summary: 'It is an annotation processor that modifies the syntax tree during compilation, using internal compiler APIs. The generated members are in the class file and nowhere in your source.',
            interviewAngle: 'The mechanism is the interesting part: Lombok is not code generation into a file you can read, it is mutation of the AST, which is why it needs IDE support and why it has broken on JDK upgrades.',
            buildsOn: ['annotation-processors'],
            blocks: [
                {
                    type: 'table',
                    title: 'The annotations worth knowing precisely',
                    headers: ['Annotation', 'Generates', 'Watch for'],
                    rows: [
                        ['<code>@Getter</code> / <code>@Setter</code>', 'Accessors per field', 'A setter on a field that should be immutable'],
                        ['<code>@Data</code>', 'Getters, setters, <code>equals</code>, <code>hashCode</code>, <code>toString</code>, required-args constructor', '<strong>All five, including on a JPA entity. Next chapter.</strong>'],
                        ['<code>@Value</code>', 'Immutable: <code>final</code> fields, getters, no setters', 'A record is usually better now'],
                        ['<code>@Builder</code>', 'A builder class', 'Field initialisers are dropped without <code>@Builder.Default</code>'],
                        ['<code>@Slf4j</code>', '<code>private static final Logger log</code>', 'Nothing. This one is uncontroversial.'],
                        ['<code>@SneakyThrows</code>', 'Throws a checked exception without declaring it', 'Defeats the compiler\'s only record of what a method can throw'],
                        ['<code>@EqualsAndHashCode</code>', 'Both, over all non-static fields by default', 'The default set is almost never the right one']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Records replace <code>@Value</code> and much of <code>@Data</code>, in the language, with no processor.</strong> For an immutable data carrier a record gives you the constructor, accessors, <code>equals</code>, <code>hashCode</code> and <code>toString</code>, plus deconstruction patterns and safe serialisation. If a project is on Java 17 or later, the honest position is that Lombok\'s remaining strong cases are <code>@Slf4j</code>, <code>@Builder</code>, and mutable JPA entities — which is a much smaller footprint than most codebases give it.</p>'
                }
            ],
            docs: [
                { title: 'Project Lombok — Features', url: 'https://projectlombok.org/features/all', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'java-language', questionId: 'records-what-they-give-you' }
            ]
        },

        {
            id: 'lombok-data-on-a-jpa-entity',
            title: '@Data on a JPA Entity',
            importance: 'must-know',
            summary: 'Three separate defects at once: an equals over every field including the id, a hashCode that changes when the entity is persisted, and a toString that triggers lazy loading.',
            interviewAngle: 'A specific, checkable defect that ships regularly. Naming all three problems, and the fix, is a strong practical signal in a JPA discussion.',
            buildsOn: ['lombok-what-it-generates'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The combination, and what each generated method does wrong',
                    code: '@Entity\n@Data                       // <-- three defects in one annotation\nclass Order {\n    @Id @GeneratedValue Long id;\n    String reference;\n    @ManyToOne(fetch = LAZY) Customer customer;\n    @OneToMany(mappedBy = "order", fetch = LAZY) List<Line> lines;\n}\n\n// 1. hashCode() includes id, which is null before persist and a number\n//    after. An entity put in a HashSet before saving is lost inside it\n//    afterwards -- contains() returns false for the object you added.\n//\n// 2. equals() compares every field, so a detached copy and a managed\n//    copy of the same row can be unequal, and two unsaved entities\n//    with the same data are equal.\n//\n// 3. toString() touches customer and lines. One log line initialises\n//    the whole graph, or throws LazyInitializationException outside a\n//    session. This is a real and common source of N+1.\n\n// The fix:\n@Entity\n@Getter @Setter\n@ToString(onlyExplicitlyIncluded = true)\n@EqualsAndHashCode(onlyExplicitlyIncluded = true)\nclass Order {\n    @Id @GeneratedValue\n    @EqualsAndHashCode.Include @ToString.Include Long id;\n    ...\n}',
                    notes: '<p>Even the fixed version is only correct if <code>equals</code> is understood as "same row", which is what the id gives you, and if you accept that two unsaved entities are never equal. The alternative that avoids the whole argument is a business key — an order reference, an email — assigned before persist and never changed, which makes equality meaningful at every lifecycle stage. Hibernate\'s own documentation recommends that.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The <code>toString</code> problem generalises past Lombok: <strong>any automatically generated <code>toString</code> on an entity is a lazy-loading trigger</strong>, whether Lombok wrote it, the IDE did, or a record component holds an association. If entities are logged at all, the log line should name the id and nothing else.</p>'
                }
            ],
            docs: [
                { title: 'Hibernate — Equality and identity', url: 'https://docs.jboss.org/hibernate/orm/6.4/userguide/html_single/Hibernate_User_Guide.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'jpa-hibernate', questionId: 'entity-equals-hashcode' },
                { topicId: 'jpa-hibernate', questionId: 'lazy-initialization-exception' }
            ]
        },

        {
            id: 'mapstruct-vs-runtime-mappers',
            title: 'Generated Mappers Against Reflective Ones',
            importance: 'good-to-know',
            summary: 'The same choice as the whole module, applied to one job: a compile-time mapper fails the build on a renamed field, and a reflective one returns null at run time.',
            interviewAngle: 'A small decision that illustrates the module\'s theme. It also connects back to the architecture module, where the mapping layer is the cost of separating DTO from entity.',
            buildsOn: ['lombok-data-on-a-jpa-entity'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'An interface in, ordinary code out',
                    code: '@Mapper(componentModel = "spring",\n        unmappedTargetPolicy = ReportingPolicy.ERROR)   // <-- the point\ninterface OrderMapper {\n\n    @Mapping(target = "customerName", source = "customer.name")\n    @Mapping(target = "total",        source = "totals.gross")\n    OrderResponse toResponse(Order order);\n}\n\n// javac generates OrderMapperImpl with plain assignments. It is a\n// normal class: readable, steppable, and free at run time.\n//\n// unmappedTargetPolicy = ERROR is what turns this from a convenience\n// into a safety net. Add a field to OrderResponse and forget to map\n// it, and the BUILD fails naming the field -- instead of the API\n// quietly returning null for it.',
                    notes: '<p>The processor-ordering hazard from the architecture module applies here and is worth repeating because the symptom is so confusing: MapStruct and Lombok are both annotation processors, and if MapStruct runs first it sees a class with no getters and generates a mapper that maps nothing. <code>lombok-mapstruct-binding</code> on the processor path fixes it.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>For two or three fields, a static factory on the DTO — <code>OrderResponse.from(order)</code> — beats both options: it is next to the type it produces, it takes no dependency, and it fails to compile on a rename for free. Reach for a generator when the mappings are numerous or nested, which is the point at which hand-writing them stops being cheaper than configuring one.</p>'
                }
            ],
            docs: [
                { title: 'MapStruct Reference Guide', url: 'https://mapstruct.org/documentation/stable/reference/html/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'rest-api', questionId: 'dto-vs-entity' }
            ]
        }
    ]
};
