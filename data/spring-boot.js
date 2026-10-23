/* ==========================================================================
   data/spring-boot.js — Spring Boot & Auto-Configuration

   Twenty-six questions in three subsections. The `versions` subsection is the
   one most decks skip and most interviews ask about: "we are on Boot 2.7 and
   need to get to 3.x, what breaks" is a real project someone is running right
   now, and the answer is specific rather than general.

   ONE GLOBAL PER FILE.
   ========================================================================== */

const springBootData = {
    id: 'spring-boot',
    title: 'Spring Boot & Auto-Configuration',
    subsections: [
        { id: 'autoconfig', title: 'Auto-Configuration' },
        { id: 'config',     title: 'External Configuration & Profiles' },
        { id: 'versions',   title: 'Boot 2 → 3 → 4' }
    ],
    keyTopics: [
        '@SpringBootApplication', '@EnableAutoConfiguration',
        'AutoConfiguration.imports', '@Conditional', 'starters',
        'custom starter', 'property precedence', '@ConfigurationProperties',
        'profiles', 'javax to jakarta', 'SpringApplication.run lifecycle'
    ],
    questions: [

/* ==== Auto-Configuration ============================================== */

{
    id: 'what-springbootapplication-is',
    importance: 'must-know',
    subsection: 'autoconfig',
    question: 'What does @SpringBootApplication actually do?',
    answer:
        '<p>It is three annotations in one, and knowing which three explains most of Boot\'s ' +
        'behaviour:</p>' +
        '<ul>' +
        '<li><strong><code>@SpringBootConfiguration</code></strong> — a ' +
        '<code>@Configuration</code> with a distinct name so the test framework can find the ' +
        'application class by searching upward from a test package. That search is why ' +
        '<code>@SpringBootTest</code> needs no configuration argument.</li>' +
        '<li><strong><code>@ComponentScan</code></strong> with no base package, so it scans the ' +
        'package of the annotated class and everything below it. This is why the application ' +
        'class belongs in the root package.</li>' +
        '<li><strong><code>@EnableAutoConfiguration</code></strong> — the interesting one. It ' +
        'imports every auto-configuration class registered on the classpath and lets each decide ' +
        'for itself whether to apply.</li>' +
        '</ul>' +
        '<p>Writing the three separately is legal and occasionally useful — to give the scan an ' +
        'explicit base package, or to leave auto-configuration off entirely.</p>' +
        '<p>The framing worth offering: Boot adds no runtime magic to Spring. Auto-configuration ' +
        'is ordinary <code>@Configuration</code> classes with ordinary ' +
        '<code>@Conditional</code> annotations, discovered from a text file. Everything it does ' +
        'you could have written by hand, and the condition evaluation report will show you ' +
        'exactly what it decided and why.</p>',
    referenceLinks: [
        { title: 'Auto-configuration — Spring Boot Reference', url: 'https://docs.spring.io/spring-boot/reference/using/using-the-springbootapplication-annotation.html' }
    ],
    tags: ['spring-boot', 'auto-configuration', 'annotations'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'how-auto-configuration-is-discovered',
    importance: 'must-know',
    subsection: 'autoconfig',
    question: 'How does Spring Boot find the auto-configuration classes to apply?',
    answer:
        '<p>From a plain text file on the classpath: ' +
        '<code>META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports</code>, ' +
        'one fully-qualified class name per line. Boot reads every copy of that file from every ' +
        'jar and imports the union.</p>' +
        '<p><strong>This changed in Boot 2.7 and the old mechanism was removed in 3.0.</strong> ' +
        'Before that, the list lived under an <code>EnableAutoConfiguration</code> key in ' +
        '<code>META-INF/spring.factories</code>. A library still using only the old file ' +
        'contributes nothing on Boot 3, and the failure is silent — the beans simply are not ' +
        'there. That is worth naming, because it is a real migration symptom that looks like a ' +
        'scanning problem.</p>' +
        '<p>Each listed class is a <code>@AutoConfiguration</code> class guarded by conditions, ' +
        'and it is the conditions rather than the list that decide anything:</p>' +
        '<ul>' +
        '<li><code>@ConditionalOnClass</code> — is the library present at all?</li>' +
        '<li><code>@ConditionalOnMissingBean</code> — has the application already defined one? ' +
        'This is the back-off rule that makes Boot overridable: your bean wins because Boot\'s ' +
        'declines when yours exists.</li>' +
        '<li><code>@ConditionalOnProperty</code>, ' +
        '<code>@ConditionalOnWebApplication</code> and the rest.</li>' +
        '</ul>' +
        '<p>Ordering is controlled by <code>@AutoConfigureAfter</code>, ' +
        '<code>@AutoConfigureBefore</code> and <code>@AutoConfigureOrder</code>, and it matters ' +
        'because <code>@ConditionalOnBean</code> is evaluated against what has been registered ' +
        'so far. User configuration is always processed before auto-configuration, which is why ' +
        'the back-off works at all.</p>',
    referenceLinks: [
        { title: 'Creating Your Own Auto-configuration — Spring Boot Reference', url: 'https://docs.spring.io/spring-boot/reference/features/developing-auto-configuration.html' }
    ],
    tags: ['spring-boot', 'auto-configuration', 'classpath', 'migration'],
    images: [],
    hasDiagram: true,
    diagramType: 'flowchart',
    diagramConfig: {
        title: 'How one auto-configuration class decides',
        nodes: [
            { id: 'imports', label: 'AutoConfiguration.imports read from every jar', kind: 'start' },
            { id: 'onclass', label: '@ConditionalOnClass: library present?',          kind: 'step' },
            { id: 'skip',    label: 'skipped entirely',                               kind: 'trap' },
            { id: 'onbean',  label: '@ConditionalOnMissingBean: yours exists?',       kind: 'step' },
            { id: 'backoff', label: 'backs off, your bean is used',                   kind: 'fix' },
            { id: 'apply',   label: 'registers the default bean',                     kind: 'step' }
        ],
        edges: [
            { from: 'imports', to: 'onclass' },
            { from: 'onclass', to: 'skip',    label: 'no' },
            { from: 'onclass', to: 'onbean',  label: 'yes' },
            { from: 'onbean',  to: 'backoff', label: 'yes' },
            { from: 'onbean',  to: 'apply',   label: 'no' }
        ]
    },
    codeSnippets: []
},

{
    id: 'overriding-auto-configuration',
    importance: 'must-know',
    subsection: 'autoconfig',
    question: 'How do you override or disable something Spring Boot configured for you?',
    answer:
        '<p>Four levers, from the lightest to the heaviest.</p>' +
        '<ul>' +
        '<li><strong>Set a property.</strong> Most auto-configuration is parameterised, so ' +
        'changing the pool size or the serialisation setting needs no code at all. Always check ' +
        'this first — a <code>@Bean</code> that reimplements something a property controls also ' +
        'throws away every other default Boot applied to it.</li>' +
        '<li><strong>Define your own bean of the same type.</strong> The auto-configuration ' +
        'backs off through <code>@ConditionalOnMissingBean</code>. This is the intended ' +
        'mechanism and needs no annotation on your side.</li>' +
        '<li><strong>Use a customiser.</strong> Boot exposes ' +
        '<code>Jackson2ObjectMapperBuilderCustomizer</code>, ' +
        '<code>RestClientCustomizer</code>, <code>WebServerFactoryCustomizer</code> and many ' +
        'more. A customiser <em>adjusts</em> the auto-configured bean instead of replacing it, ' +
        'so you keep all the other defaults. This is usually the right answer and the most ' +
        'commonly missed one.</li>' +
        '<li><strong>Exclude the auto-configuration</strong> — ' +
        '<code>@SpringBootApplication(exclude = DataSourceAutoConfiguration.class)</code> or ' +
        '<code>spring.autoconfigure.exclude</code>. The blunt instrument: it removes everything ' +
        'that class would have configured, which is often more than you meant.</li>' +
        '</ul>' +
        '<p>The diagnostic to reach for is the <strong>condition evaluation report</strong>. Run ' +
        'with <code>--debug</code>, or hit <code>/actuator/conditions</code>, and Boot prints ' +
        'every auto-configuration with a positive or negative match and the reason. "Did not ' +
        'match: @ConditionalOnMissingBean found bean objectMapper" answers the question directly ' +
        'instead of by inference.</p>',
    referenceLinks: [
        { title: 'Disabling Specific Auto-configuration Classes — Spring Boot Reference', url: 'https://docs.spring.io/spring-boot/reference/using/auto-configuration.html' }
    ],
    tags: ['spring-boot', 'auto-configuration', 'customisation'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'what-a-starter-is',
    importance: 'should-know',
    subsection: 'autoconfig',
    question: 'What is a starter, and how would you write one?',
    answer:
        '<p>A starter is a dependency with <strong>no code in it</strong>. It is a POM that ' +
        'names a coherent set of libraries at versions known to work together, so that adding ' +
        'one line to a build brings in a whole capability.</p>' +
        '<p>The convention is that the starter is separate from the auto-configuration. ' +
        '<code>spring-boot-starter-web</code> is a dependency list; ' +
        '<code>spring-boot-autoconfigure</code> holds the classes. For your own, the naming ' +
        'convention matters: third-party starters are ' +
        '<code>something-spring-boot-starter</code>, with the Spring prefix reserved for ' +
        'official ones.</p>' +
        '<p>To write one, in the auto-configuration module:</p>' +
        '<ul>' +
        '<li>A <code>@AutoConfiguration</code> class with <code>@ConditionalOnClass</code> so it ' +
        'is inert when the library is absent, and <code>@ConditionalOnMissingBean</code> on ' +
        'every bean so an application can replace any of them.</li>' +
        '<li>A <code>@ConfigurationProperties</code> record for the settings, so they get ' +
        'relaxed binding, validation and IDE completion.</li>' +
        '<li>A line in ' +
        '<code>META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports</code>. ' +
        'Not <code>spring.factories</code>, which Boot 3 no longer reads for this.</li>' +
        '<li><code>spring-boot-configuration-processor</code> as an optional dependency, which ' +
        'generates the metadata that makes the properties discoverable.</li>' +
        '</ul>' +
        '<p>Two rules that separate a good starter from an annoying one: <strong>a starter must ' +
        'be able to do nothing.</strong> If a consumer has not configured it, it should register ' +
        'nothing rather than fail at startup. And it should never force a version of a common ' +
        'library — depend on what you need and let the consumer\'s dependency management ' +
        'decide.</p>',
    referenceLinks: [
        { title: 'Creating Your Own Starter — Spring Boot Reference', url: 'https://docs.spring.io/spring-boot/reference/features/developing-auto-configuration.html' }
    ],
    tags: ['spring-boot', 'starters', 'auto-configuration', 'libraries'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'springapplication-run-lifecycle',
    importance: 'should-know',
    subsection: 'autoconfig',
    question: 'What happens between main() and the first request being served?',
    answer:
        '<p><code>SpringApplication.run()</code> does a fixed sequence, and knowing it is what ' +
        'lets you hook the right point.</p>' +
        '<ul>' +
        '<li><strong>Deduce the application type</strong> — servlet, reactive or none — by ' +
        'looking for classes on the classpath. This is why adding both the web and the WebFlux ' +
        'starter produces a servlet application rather than a reactive one.</li>' +
        '<li><strong>Load <code>ApplicationContextInitializer</code>s and ' +
        '<code>ApplicationListener</code>s</strong> from <code>spring.factories</code>.</li>' +
        '<li><strong>Prepare the <code>Environment</code></strong>: read the command line, the ' +
        'system properties, the environment variables and the configuration files, and activate ' +
        'the profiles. Publish <code>ApplicationEnvironmentPreparedEvent</code> — the hook for ' +
        'anything that must run before any bean exists.</li>' +
        '<li><strong>Print the banner, create the context, refresh it.</strong> The refresh is ' +
        'the whole container startup, and it is where the embedded server is created and ' +
        'started.</li>' +
        '<li><strong>Run the runners.</strong> <code>ApplicationRunner</code> and ' +
        '<code>CommandLineRunner</code> execute after the context is refreshed, in ' +
        '<code>@Order</code> order.</li>' +
        '<li><strong>Publish <code>ApplicationReadyEvent</code>.</strong></li>' +
        '</ul>' +
        '<p>Two practical consequences. Work that needs the full context should go in a runner ' +
        'or an <code>ApplicationReadyEvent</code> listener, not in <code>@PostConstruct</code> — ' +
        'which runs while other beans may still be unbuilt and before the bean is proxied. And ' +
        '<strong>an exception in a runner fails the startup</strong>, taking the whole ' +
        'application down after the server has already begun listening, which is a confusing ' +
        'failure to read in a deployment log.</p>' +
        '<p>For a readiness signal that reflects all of this, use ' +
        '<code>/actuator/health/readiness</code> rather than a custom flag: Boot moves it to ' +
        'ready only after <code>ApplicationReadyEvent</code>.</p>',
    referenceLinks: [
        { title: 'Application Events and Listeners — Spring Boot Reference', url: 'https://docs.spring.io/spring-boot/reference/features/spring-application.html' }
    ],
    tags: ['spring-boot', 'startup', 'lifecycle', 'events'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'embedded-server',
    importance: 'should-know',
    subsection: 'autoconfig',
    question: 'How does the embedded server work, and how do you swap Tomcat for something else?',
    answer:
        '<p>The server is a bean. <code>spring-boot-starter-web</code> brings in ' +
        '<code>spring-boot-starter-tomcat</code>, an auto-configuration sees Tomcat on the ' +
        'classpath and creates a <code>ServletWebServerFactory</code>, and the context refresh ' +
        'starts it. There is no deployment step and no external container — the application is ' +
        'an ordinary Java process that happens to listen on a port.</p>' +
        '<p>Swapping is a build change: exclude <code>spring-boot-starter-tomcat</code> and add ' +
        '<code>spring-boot-starter-jetty</code> or ' +
        '<code>spring-boot-starter-undertow</code>. No code changes, because everything above ' +
        'talks to the servlet API rather than to Tomcat.</p>' +
        '<p>What this bought, and it is worth saying plainly: the application owns its own ' +
        'server, so the version is in the build file and is upgraded like any other dependency. ' +
        'The alternative — a shared servlet container with several applications deployed into ' +
        'it — meant a shared classpath, a shared JVM, a shared restart and a shared security ' +
        'patch cycle. It is also what makes a container image trivial, since there is one ' +
        'process to start.</p>' +
        '<p>Configuration goes through <code>server.*</code> properties for the common cases, ' +
        'and a <code>WebServerFactoryCustomizer</code> for anything that needs the underlying ' +
        'API. Note that <code>server.port=0</code> binds a random free port, which is how ' +
        '<code>@SpringBootTest(webEnvironment = RANDOM_PORT)</code> avoids collisions in ' +
        'parallel test runs.</p>',
    referenceLinks: [
        { title: 'Embedded Web Servers — Spring Boot Reference', url: 'https://docs.spring.io/spring-boot/reference/web/servlet.html' }
    ],
    tags: ['spring-boot', 'embedded-server', 'tomcat', 'deployment'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'actuator-basics',
    importance: 'should-know',
    subsection: 'autoconfig',
    question: 'What does Actuator give you, and what must you not expose?',
    answer:
        '<p>Actuator adds operational endpoints over HTTP or JMX. The ones that earn their ' +
        'place:</p>' +
        '<ul>' +
        '<li><strong><code>/health</code></strong>, and specifically its two groups. ' +
        '<code>/health/liveness</code> answers "is this process broken beyond recovery" and ' +
        '<code>/health/readiness</code> answers "should traffic be sent here". Wiring a ' +
        'Kubernetes liveness probe to a readiness-style check is a classic and damaging mistake: ' +
        'a database blip restarts every pod instead of taking them out of rotation.</li>' +
        '<li><strong><code>/metrics</code> and <code>/prometheus</code></strong>, backed by ' +
        'Micrometer.</li>' +
        '<li><strong><code>/info</code></strong>, useful when the build plugin is configured to ' +
        'put the git commit in it — "which version is actually running" during an incident.</li>' +
        '<li><strong><code>/conditions</code></strong> for the auto-configuration report, ' +
        '<strong><code>/env</code></strong> and <strong><code>/configprops</code></strong> for ' +
        'what configuration actually resolved to.</li>' +
        '<li><strong><code>/loggers</code></strong>, which can change a log level at runtime ' +
        'without a restart. During an incident this is the most valuable endpoint there is.</li>' +
        '</ul>' +
        '<p><strong>What must not be exposed publicly:</strong> ' +
        '<code>/env</code> and <code>/configprops</code> leak configuration including, in ' +
        'practice, credentials — sanitisation is best-effort and keyed on name patterns. ' +
        '<code>/heapdump</code> and <code>/threaddump</code> hand over the entire memory ' +
        'contents. <code>/loggers</code> and <code>/shutdown</code> are write operations.</p>' +
        '<p>Only <code>/health</code> is exposed over HTTP by default, which is the right ' +
        'default. Widening it with <code>management.endpoints.web.exposure.include=*</code> ' +
        'without also securing it is a genuine and common vulnerability. Put Actuator on a ' +
        'separate port with <code>management.server.port</code>, keep that port off the ' +
        'ingress, and require authentication for anything beyond health.</p>',
    referenceLinks: [
        { title: 'Production-ready Endpoints — Spring Boot Reference', url: 'https://docs.spring.io/spring-boot/reference/actuator/endpoints.html' }
    ],
    tags: ['spring-boot', 'actuator', 'observability', 'security'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'fat-jar-and-layers',
    importance: 'good-to-know',
    subsection: 'autoconfig',
    question: 'How does an executable Spring Boot jar work, and what are layered jars for?',
    answer:
        '<p>A Boot jar is a jar containing other jars, which the JAR specification does not ' +
        'support. Boot solves it with a custom launcher: the manifest\'s ' +
        '<code>Main-Class</code> is Boot\'s <code>JarLauncher</code>, which installs a ' +
        'classloader able to read nested archives, then calls the ' +
        '<code>Start-Class</code> — your <code>main</code>. Your code sits under ' +
        '<code>BOOT-INF/classes</code> and the dependencies under ' +
        '<code>BOOT-INF/lib</code>.</p>' +
        '<p>The alternative, shading everything into one flat classpath, loses which jar a class ' +
        'came from and breaks signed jars and duplicate resource files. Nesting keeps the ' +
        'dependencies intact.</p>' +
        '<p><strong>Layered jars</strong> exist for Docker. A naive image copies the whole jar ' +
        'into one layer, so changing one line of code invalidates a sixty-megabyte layer of ' +
        'unchanged dependencies on every build and every pull. Layering splits the jar into ' +
        'four — dependencies, snapshot dependencies, spring-boot-loader, application — ordered ' +
        'by how often they change. A code-only change then produces a layer measured in ' +
        'kilobytes.</p>' +
        '<p>Two related notes: <code>spring-boot-maven-plugin</code> can also build an image ' +
        'directly with buildpacks and no Dockerfile, and for a container it is worth extracting ' +
        'the jar rather than running it nested, since class loading from a nested archive is ' +
        'measurably slower at startup.</p>',
    referenceLinks: [
        { title: 'Container Images — Spring Boot Reference', url: 'https://docs.spring.io/spring-boot/reference/packaging/container-images/index.html' }
    ],
    tags: ['spring-boot', 'packaging', 'docker', 'deployment'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: [
        {
            language: 'dockerfile',
            title: 'A layered build, so a code change is a small layer',
            code:
                '# Stage 1: unpack the layers out of the jar\n' +
                'FROM eclipse-temurin:25-jre AS builder\n' +
                'WORKDIR /build\n' +
                'COPY target/*.jar app.jar\n' +
                'RUN java -Djarmode=tools -jar app.jar extract --layers --launcher\n' +
                '\n' +
                '# Stage 2: copy them oldest-changing first, so Docker caches them\n' +
                'FROM eclipse-temurin:25-jre\n' +
                'WORKDIR /app\n' +
                'COPY --from=builder /build/app/dependencies/ ./\n' +
                'COPY --from=builder /build/app/spring-boot-loader/ ./\n' +
                'COPY --from=builder /build/app/snapshot-dependencies/ ./\n' +
                'COPY --from=builder /build/app/application/ ./\n' +
                '\n' +
                '# Exec form, so the JVM is PID 1 and receives SIGTERM directly.\n' +
                '# The shell form makes /bin/sh PID 1, the signal never reaches Java,\n' +
                '# and graceful shutdown never runs.\n' +
                'ENTRYPOINT ["java", "-jar", "app.jar"]',
            output: {
                kind: 'trace',
                lines: [
                    'The jarmode tools extract splits the jar into four directories by change frequency.',
                    'Dependencies are copied first and are identical between builds, so Docker reuses the layer.',
                    'Only the application layer changes when code changes, and it is measured in kilobytes.',
                    'A registry push after a code-only change therefore transfers almost nothing.',
                    'The exec-form entrypoint makes the JVM PID 1, so SIGTERM reaches it and shutdown is graceful.'
                ],
                explain:
                    '<p>The entrypoint form is not a packaging detail. With the shell form the ' +
                    'JVM never sees <code>SIGTERM</code>, the graceful shutdown configured in ' +
                    'the application never runs, and Kubernetes eventually sends ' +
                    '<code>SIGKILL</code> — dropping every in-flight request on every ' +
                    'deploy.</p>'
            }
        }
    ]
},

{
    id: 'devtools-and-restart',
    importance: 'good-to-know',
    subsection: 'autoconfig',
    question: 'What does spring-boot-devtools do, and why must it never reach production?',
    answer:
        '<p>Three things, for development only:</p>' +
        '<ul>' +
        '<li><strong>Automatic restart.</strong> Two classloaders — one for unchanging ' +
        'dependencies, one for your classes — so a change reloads only the second. Much faster ' +
        'than a full restart, and it is a restart, not hot-swapping, so state is lost.</li>' +
        '<li><strong>Development-friendly property defaults</strong>, mostly turning off caches ' +
        'that would otherwise hide a template or a static file change.</li>' +
        '<li><strong>LiveReload</strong>, and a remote-debug tunnel.</li>' +
        '</ul>' +
        '<p>It is designed to disable itself: it is excluded from a repackaged jar by the build ' +
        'plugin, and it switches off when it detects it was started from a jar rather than from ' +
        'an exploded classpath. So in the normal case it cannot reach production.</p>' +
        '<p>Where it goes wrong is the remote support. ' +
        '<code>spring.devtools.remote.secret</code> enables an endpoint that accepts uploaded ' +
        'class files and a debug tunnel — which is remote code execution by design. It is ' +
        'intended for a private development deployment and has been found exposed on the public ' +
        'internet. Never enable it outside development, and always mark the dependency ' +
        '<code>optional</code> in Maven or <code>developmentOnly</code> in Gradle so it cannot ' +
        'be inherited transitively by anything.</p>' +
        '<p>The two-classloader design also produces a confusing failure worth recognising: a ' +
        '<code>ClassCastException</code> saying that a class cannot be cast to itself, which ' +
        'means two classloaders have loaded the same class.</p>',
    referenceLinks: [
        { title: 'Developer Tools — Spring Boot Reference', url: 'https://docs.spring.io/spring-boot/reference/using/devtools.html' }
    ],
    tags: ['spring-boot', 'devtools', 'security', 'development'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

/* ==== External Configuration & Profiles =============================== */

{
    id: 'property-precedence',
    importance: 'must-know',
    subsection: 'config',
    question: 'A property is set in three places and the application uses the wrong one. How do you reason about precedence?',
    answer:
        '<p>Boot builds an <strong>ordered list of property sources</strong> and takes the first ' +
        'answer. Nothing overwrites anything; a lower source is simply never consulted for a key ' +
        'a higher one supplies.</p>' +
        '<p>The order, strongest first, in the form worth remembering:</p>' +
        '<ul>' +
        '<li>Command-line arguments — <code>--server.port=9000</code>.</li>' +
        '<li><code>SPRING_APPLICATION_JSON</code>, inline JSON in an environment variable.</li>' +
        '<li>Java system properties — <code>-Dserver.port=9000</code>.</li>' +
        '<li>OS environment variables.</li>' +
        '<li>Profile-specific files — <code>application-prod.yml</code> — outside the jar, then ' +
        'inside.</li>' +
        '<li>Plain <code>application.yml</code> — outside the jar, then inside.</li>' +
        '<li><code>@PropertySource</code> on a configuration class.</li>' +
        '<li>Defaults set on <code>SpringApplication</code>.</li>' +
        '</ul>' +
        '<p>Two rules inside that order matter more than the order itself. ' +
        '<strong>A profile-specific file always beats the plain one</strong>, and files outside ' +
        'the jar always beat files inside it — which together are what make a packaged ' +
        'application configurable at deployment. And <strong>relaxed binding</strong> means ' +
        '<code>spring.datasource.maximum-pool-size</code> and ' +
        '<code>SPRING_DATASOURCE_MAXIMUMPOOLSIZE</code> are the same property, which is what ' +
        'makes environment-variable overrides work at all in a container.</p>' +
        '<p><strong>Do not reason about it — look.</strong> ' +
        '<code>/actuator/env/some.property</code> reports every source that has a value for the ' +
        'key and which one won. That takes ten seconds and is always right, where reasoning ' +
        'about the order is neither.</p>',
    referenceLinks: [
        { title: 'Externalized Configuration — Spring Boot Reference', url: 'https://docs.spring.io/spring-boot/reference/features/external-config.html' }
    ],
    tags: ['spring-boot', 'configuration', 'properties', 'precedence'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'profiles-and-their-limits',
    importance: 'must-know',
    subsection: 'config',
    question: 'How do profiles work, and when do they become a problem?',
    answer:
        '<p>A profile is a named set of configuration and beans. Activate one with ' +
        '<code>spring.profiles.active</code>, and Boot loads ' +
        '<code>application-{profile}.yml</code> on top of the base file and includes any bean ' +
        'marked <code>@Profile("that-name")</code>.</p>' +
        '<p>Several can be active at once, and later ones win for overlapping keys. ' +
        '<code>spring.profiles.group</code> lets one name activate several, and ' +
        '<code>spring.profiles.include</code> adds to whatever is active rather than replacing ' +
        'it. <code>@Profile</code> takes expressions — <code>!prod</code>, ' +
        '<code>prod &amp; aws</code>.</p>' +
        '<p><strong>Where they go wrong:</strong></p>' +
        '<ul>' +
        '<li><strong>Profile-specific beans mean production runs code the tests never ' +
        'ran.</strong> If <code>@Profile("prod")</code> selects a different implementation, the ' +
        'test suite exercised the other one. That is the opposite of what a test is for. Prefer ' +
        'differing <em>configuration</em> over differing <em>beans</em>.</li>' +
        '<li><strong>They multiply.</strong> <code>dev</code>, <code>qa</code>, ' +
        '<code>staging</code>, <code>prod</code>, <code>prod-eu</code>, ' +
        '<code>prod-eu-canary</code> — and now no one can say what any deployment actually ' +
        'runs.</li>' +
        '<li><strong>Secrets end up in profile files</strong>, which are in the repository. ' +
        'Credentials belong in environment variables or a secret store, never in ' +
        '<code>application-prod.yml</code>.</li>' +
        '<li><strong>A missing profile fails silently.</strong> A typo in ' +
        '<code>spring.profiles.active</code> starts the application with base configuration and ' +
        'no warning.</li>' +
        '</ul>' +
        '<p>The healthy pattern is one artefact, configured entirely from the environment, with ' +
        'profiles used for genuine structural differences — an embedded database locally, a ' +
        'stubbed payment provider in tests — and not as a substitute for externalised ' +
        'configuration.</p>',
    referenceLinks: [
        { title: 'Profiles — Spring Boot Reference', url: 'https://docs.spring.io/spring-boot/reference/features/profiles.html' }
    ],
    tags: ['spring-boot', 'profiles', 'configuration', 'testing'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'configuration-properties-binding',
    importance: 'should-know',
    subsection: 'config',
    question: 'How does @ConfigurationProperties binding actually work, and how do you validate it?',
    answer:
        '<p>Boot takes the declared prefix, finds every property under it, and binds by name onto ' +
        'the target — a constructor for an immutable class or record, setters otherwise. It ' +
        'converts types along the way, and the conversions are worth knowing because they save ' +
        'a lot of parsing code:</p>' +
        '<ul>' +
        '<li><code>Duration</code> from <code>30s</code>, <code>5m</code>, ' +
        '<code>PT1H30M</code>, or a bare number with <code>@DurationUnit</code>.</li>' +
        '<li><code>DataSize</code> from <code>10MB</code>.</li>' +
        '<li>Enums, case-insensitively and with dashes — <code>read-committed</code> binds to ' +
        '<code>READ_COMMITTED</code>.</li>' +
        '<li>Lists from indexed keys or a comma-separated string, maps from ' +
        '<code>prefix.map.key=value</code>, and nested objects to any depth.</li>' +
        '</ul>' +
        '<p><strong>Relaxed binding</strong> is what makes the same property writable as ' +
        'kebab-case in YAML, camelCase in code and ' +
        '<code>SCREAMING_SNAKE_CASE</code> in an environment variable. Canonical form in files ' +
        'is kebab-case.</p>' +
        '<p><strong>Validation:</strong> add <code>@Validated</code> to the properties class and ' +
        'ordinary Bean Validation annotations to its members. The constraints are checked during ' +
        'binding, so a misconfigured deployment fails at startup with a message naming the ' +
        'property and the violated rule — rather than failing on the first request that happens ' +
        'to use it, which may be hours later.</p>' +
        '<p>Two things people expect and do not get. Binding does <em>not</em> evaluate SpEL, ' +
        'unlike <code>@Value</code>. And an unknown property under the prefix is ignored by ' +
        'default — <code>ignoreUnknownFields = false</code> turns a typo into a startup failure, ' +
        'which is usually what you want for your own configuration and not for a shared one.</p>',
    referenceLinks: [
        { title: 'Type-safe Configuration Properties — Spring Boot Reference', url: 'https://docs.spring.io/spring-boot/reference/features/external-config.html' }
    ],
    tags: ['spring-boot', 'configuration', 'binding', 'validation'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: [
        {
            language: 'yaml',
            title: 'One prefix, several conversions',
            code:
                'payments:\n' +
                '  provider:\n' +
                '    base-url: https://api.example.com   # kebab-case is canonical\n' +
                '    connect-timeout: 5s                 # binds to a Duration\n' +
                '    read-timeout: 30s\n' +
                '    max-upload: 10MB                    # binds to a DataSize\n' +
                '    isolation: read-committed           # binds to an enum constant\n' +
                '    retry-on:                           # binds to a List<Integer>\n' +
                '      - 502\n' +
                '      - 503\n' +
                '      - 504\n' +
                '    headers:                            # binds to a Map<String, String>\n' +
                '      x-tenant: acme\n' +
                '      x-region: eu-west-1\n' +
                '\n' +
                '# The same values from the environment, via relaxed binding:\n' +
                '#   PAYMENTS_PROVIDER_BASEURL=https://api.example.com\n' +
                '#   PAYMENTS_PROVIDER_CONNECTTIMEOUT=5s\n' +
                '# which is what makes one image configurable per deployment.',
            output: {
                kind: 'trace',
                lines: [
                    'Boot collects every key under the payments.provider prefix.',
                    'Each is converted to the declared member type before the object is constructed.',
                    '5s becomes a Duration, 10MB a DataSize, read-committed an enum constant.',
                    'Bean Validation constraints run during binding, so a bad value fails the startup.',
                    'The environment-variable spellings resolve to the same keys through relaxed binding.'
                ],
                explain:
                    '<p>Every one of these conversions is code that would otherwise be written ' +
                    'by hand, usually as a <code>parseLong</code> on a millisecond value that ' +
                    'nobody can read six months later.</p>'
            }
        }
    ]
},

{
    id: 'config-files-and-secrets',
    importance: 'should-know',
    subsection: 'config',
    question: 'Where should secrets live in a Spring Boot application?',
    answer:
        '<p>Not in the repository, which rules out <code>application.yml</code> and every ' +
        'profile variant of it. Once a credential is committed it is in the history forever, ' +
        'and rotating it is the only real remedy.</p>' +
        '<p>The options, roughly in order of strength:</p>' +
        '<ul>' +
        '<li><strong>A secret manager</strong> — Vault, AWS Secrets Manager, GCP Secret ' +
        'Manager, Azure Key Vault — read at startup or on refresh. Gives rotation, an audit ' +
        'trail and access control. Spring Cloud has integrations that expose them as ordinary ' +
        'property sources, so nothing in the application changes.</li>' +
        '<li><strong>Kubernetes secrets mounted as files</strong>, with Boot\'s ' +
        '<code>spring.config.import=configtree:/etc/secrets/</code>, which maps a directory of ' +
        'files to property keys. Better than environment variables because a file can be ' +
        'rotated without restarting and does not appear in the process environment.</li>' +
        '<li><strong>Environment variables.</strong> Adequate and near-universal. The caveats: ' +
        'they are visible to anything that can read <code>/proc</code>, they are inherited by ' +
        'child processes, and they turn up in crash dumps and in some logging ' +
        'configurations.</li>' +
        '<li><strong>An encrypted file with the key supplied externally</strong> — Jasypt and ' +
        'similar. Better than plaintext, and the key management problem is now yours.</li>' +
        '</ul>' +
        '<p>Regardless of the mechanism, two hygiene rules. Do not expose ' +
        '<code>/actuator/env</code> or <code>/configprops</code> publicly — the sanitisation is ' +
        'a name-pattern heuristic and a key called <code>provider.token</code> may well be ' +
        'shown. And keep secrets out of <code>toString()</code>, which is how they reach logs ' +
        'and then log aggregators, where they are searchable by everyone in the company.</p>',
    referenceLinks: [
        { title: 'External Application Properties — Spring Boot Reference', url: 'https://docs.spring.io/spring-boot/reference/features/external-config.html' }
    ],
    tags: ['spring-boot', 'configuration', 'secrets', 'security'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'yaml-vs-properties',
    importance: 'good-to-know',
    subsection: 'config',
    question: 'YAML or properties — does it matter?',
    answer:
        '<p>Mostly a matter of taste, with three real differences.</p>' +
        '<p><strong>YAML is better for nesting and lists.</strong> A deep structure in a ' +
        'properties file repeats the prefix on every line; in YAML it is indentation. Lists of ' +
        'objects are genuinely awkward as properties and natural as YAML.</p>' +
        '<p><strong>Properties files have no ambiguity.</strong> Everything is a string until ' +
        'binding converts it. YAML has types, and its type inference has sharp edges: an ' +
        'unquoted <code>no</code> is a boolean in YAML 1.1 parsers, a version like ' +
        '<code>1.10</code> is a float that loses its trailing zero, and a leading-zero value ' +
        'such as <code>0755</code> may be read as octal. Quote anything that is meant to be a ' +
        'string.</p>' +
        '<p><strong>YAML cannot be loaded by <code>@PropertySource</code></strong> without a ' +
        'custom factory, which occasionally matters in older or non-Boot code.</p>' +
        '<p>Two practical notes. If both files exist, the properties file wins for overlapping ' +
        'keys — having both is a reliable source of confusion, so pick one. And YAML supports ' +
        'several profile documents in one file separated by <code>---</code> with ' +
        '<code>spring.config.activate.on-profile</code>, which keeps small variations together ' +
        'instead of scattering them across files.</p>' +
        '<p>The largest practical difference is not in the format at all: YAML is ' +
        'whitespace-significant, and a misindented key binds nothing and reports nothing.</p>',
    referenceLinks: [
        { title: 'Externalized Configuration', url: 'https://docs.spring.io/spring-boot/reference/features/external-config.html' }
    ],
    tags: ['spring-boot', 'configuration', 'yaml', 'properties'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'config-import-and-cloud-config',
    importance: 'good-to-know',
    subsection: 'config',
    question: 'What is spring.config.import for?',
    answer:
        '<p>It pulls additional configuration into the <code>Environment</code> from somewhere ' +
        'else, and it was introduced in Boot 2.4 to replace the Spring Cloud bootstrap context ' +
        'with something simpler.</p>' +
        '<p>The forms that matter:</p>' +
        '<ul>' +
        '<li><code>spring.config.import=optional:file:./local.yml</code> — another file. The ' +
        '<code>optional:</code> prefix means a missing source is not a startup failure, which is ' +
        'what you want for a developer override.</li>' +
        '<li><code>configtree:/etc/secrets/</code> — a directory where each file is a property, ' +
        'the filename being the key. This is the Kubernetes secret and ConfigMap mount ' +
        'shape.</li>' +
        '<li><code>configserver:http://config:8888</code> — Spring Cloud Config, now an ordinary ' +
        'import rather than a separate bootstrap phase.</li>' +
        '</ul>' +
        '<p>The reason it replaced the bootstrap context is worth stating: bootstrap was a whole ' +
        'second <code>ApplicationContext</code> that started before the real one, with its own ' +
        'property sources and its own confusing precedence rules. <code>config.import</code> is ' +
        'one ordered list, processed in one place, and the resulting precedence is the ordinary ' +
        'one.</p>' +
        '<p>Imports are resolved in declaration order, after the file that declares them, and ' +
        'they can nest. In a Kubernetes deployment the common shape is a base ' +
        '<code>application.yml</code> in the jar plus a <code>configtree</code> import for ' +
        'mounted secrets, which keeps credentials entirely out of both the image and the ' +
        'environment.</p>',
    referenceLinks: [
        { title: 'Importing Additional Data — Spring Boot Reference', url: 'https://docs.spring.io/spring-boot/reference/features/external-config.html' }
    ],
    tags: ['spring-boot', 'configuration', 'config-import', 'kubernetes'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'refreshing-configuration',
    importance: 'good-to-know',
    subsection: 'config',
    question: 'Can you change configuration without restarting?',
    answer:
        '<p>Not with plain Spring Boot. Properties are bound at startup and the resulting objects ' +
        'do not watch anything.</p>' +
        '<p>Spring Cloud adds it. <code>@RefreshScope</code> puts a proxy in front of a bean, ' +
        'and a call to the <code>/actuator/refresh</code> endpoint discards the target so the ' +
        'next method call rebuilds it with re-read configuration. Spring Cloud Bus broadcasts ' +
        'that refresh across every instance over a message broker rather than requiring a call ' +
        'to each.</p>' +
        '<p>What it does not solve:</p>' +
        '<ul>' +
        '<li><strong>Anything already constructed from the old value.</strong> A connection pool ' +
        'sized at startup does not resize; a thread pool does not change its core size. The bean ' +
        'is rebuilt, the resources it created are not.</li>' +
        '<li><strong>A window of inconsistency.</strong> During a refresh some requests see the ' +
        'old value and some the new, which for a feature flag is fine and for a security ' +
        'setting is not.</li>' +
        '<li><strong>The refresh endpoint is a write operation</strong> and must be ' +
        'secured.</li>' +
        '</ul>' +
        '<p>The pragmatic alternatives are usually better. A <strong>rolling restart</strong> is ' +
        'the honest way to change configuration, and in a containerised deployment it is cheap ' +
        'and already automated. For things that genuinely must change live — feature flags, ' +
        'sampling rates, rate limits — a purpose-built flag service read at use time is clearer ' +
        'than making the whole configuration mutable. And <code>/actuator/loggers</code> already ' +
        'changes log levels at runtime with no refresh mechanism at all.</p>',
    referenceLinks: [
        { title: 'Spring Cloud Config', url: 'https://docs.spring.io/spring-cloud-config/reference/' }
    ],
    tags: ['spring-boot', 'configuration', 'refresh', 'operations'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'testing-configuration',
    importance: 'good-to-know',
    subsection: 'config',
    question: 'How do you set a property for one test without a separate profile?',
    answer:
        '<p>Several ways, and picking the narrowest one keeps the test context cache ' +
        'useful.</p>' +
        '<ul>' +
        '<li><strong><code>@SpringBootTest(properties = "payments.provider.base-url=http://localhost:1234")</code></strong> ' +
        '— inline, visible in the test class, and the usual answer.</li>' +
        '<li><strong><code>@TestPropertySource(properties = ...)</code></strong> — the same for ' +
        'tests that are not <code>@SpringBootTest</code>, and it can also name a file.</li>' +
        '<li><strong><code>@DynamicPropertySource</code></strong> — a static method that ' +
        'registers <em>lazily evaluated</em> values. This is the Testcontainers idiom: the ' +
        'container starts, and the JDBC URL it was assigned is registered before the context ' +
        'is created. Nothing else can express a value that is not known until run time.</li>' +
        '<li><strong><code>ApplicationContextRunner</code></strong> for testing ' +
        'auto-configuration itself. It runs a context in-process with a chosen classpath and ' +
        'properties, and asserts which beans exist. It is the right tool for a starter, and much ' +
        'faster than a full application context.</li>' +
        '</ul>' +
        '<p>The thing to be aware of underneath all of these: <strong>the test framework caches ' +
        'contexts keyed by their configuration</strong>, and every distinct combination of ' +
        'properties, profiles and mock beans is a different key. A suite where each class sets a ' +
        'slightly different property builds a new context per class, and context creation ' +
        'dominates the run time. Sharing one configuration across as many test classes as ' +
        'possible is the single biggest lever on test suite speed.</p>',
    referenceLinks: [
        { title: 'Testing — Spring Boot Reference', url: 'https://docs.spring.io/spring-boot/reference/testing/index.html' }
    ],
    tags: ['spring-boot', 'testing', 'configuration', 'testcontainers'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

/* ==== Boot 2 → 3 → 4 ================================================== */

{
    id: 'javax-to-jakarta',
    importance: 'must-know',
    subsection: 'versions',
    question: 'What is the single biggest breaking change between Spring Boot 2 and 3?',
    answer:
        '<p>The <strong><code>javax.*</code> to <code>jakarta.*</code> namespace ' +
        'migration</strong>. It is not a Spring decision: Oracle transferred Java EE to the ' +
        'Eclipse Foundation without the rights to the <code>javax</code> package name, so Jakarta ' +
        'EE 9 renamed every package. Spring Boot 3 is built on Jakarta EE 9+ and therefore ' +
        'requires the change.</p>' +
        '<p>What it touches in an ordinary application: ' +
        '<code>javax.persistence</code> becomes <code>jakarta.persistence</code> — every ' +
        '<code>@Entity</code>, <code>@Id</code>, <code>@Column</code>. ' +
        '<code>javax.servlet</code> becomes <code>jakarta.servlet</code> — every filter and ' +
        'servlet. <code>javax.validation</code> becomes <code>jakarta.validation</code> — every ' +
        '<code>@NotNull</code> and <code>@Valid</code>. ' +
        '<code>javax.annotation</code> becomes <code>jakarta.annotation</code> — every ' +
        '<code>@PostConstruct</code>.</p>' +
        '<p>The mechanical part is a find-and-replace across imports, and the Eclipse ' +
        'Transformer or OpenRewrite can do it. <strong>The hard part is the dependencies.</strong> ' +
        'Every library in the tree that touches these APIs needs a Jakarta-compatible release, ' +
        'and an unmaintained one is a blocker with no workaround short of replacing it. That is ' +
        'what actually stalls these migrations, and it is the answer an interviewer is listening ' +
        'for.</p>' +
        '<p>The other headline requirements of Boot 3.0: <strong>Java 17 is the minimum</strong>, ' +
        'and Hibernate moves from 5 to 6 — which brings its own behaviour changes in naming ' +
        'strategy, type handling and generated SQL.</p>' +
        '<p>The recommended route is to go to Boot 2.7 first, resolve every deprecation warning ' +
        'there, then move to 3.0. Boot 2.7 was made a deliberate stepping stone with warnings ' +
        'for most of what 3.0 removes.</p>',
    referenceLinks: [
        { title: 'Spring Boot 3.0 Migration Guide', url: 'https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-3.0-Migration-Guide' }
    ],
    tags: ['spring-boot', 'migration', 'jakarta', 'versions'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'boot-3-other-changes',
    importance: 'must-know',
    subsection: 'versions',
    question: 'Beyond jakarta, what else changed in Spring Boot 3 that catches people out?',
    answer:
        '<p>Five, and they are the ones that produce a working build and a broken ' +
        'application.</p>' +
        '<ul>' +
        '<li><strong>Trailing slash matching is off.</strong> ' +
        '<code>/api/orders/</code> no longer matches a mapping for <code>/api/orders</code>; it ' +
        'returns 404. Silent for anyone using a client that sends the canonical form, and ' +
        'immediately fatal for anyone who has a caller that does not. There is a configuration ' +
        'switch, deprecated on arrival — the intended fix is to correct the callers.</li>' +
        '<li><strong>Actuator endpoint paths changed.</strong> The health group paths and some ' +
        'others moved, which breaks probes and dashboards rather than code.</li>' +
        '<li><strong><code>spring.factories</code> no longer registers ' +
        'auto-configuration.</strong> A library that has not migrated to ' +
        '<code>AutoConfiguration.imports</code> contributes nothing, silently.</li>' +
        '<li><strong>Hibernate 6 changes the default naming and some generated SQL.</strong> The ' +
        'commonly reported one is identifier generation: Hibernate 6 honours ' +
        '<code>GenerationType.AUTO</code> differently and may pick a sequence where Hibernate 5 ' +
        'used identity, which fails against an existing schema.</li>' +
        '<li><strong>Micrometer replaces Spring Cloud Sleuth</strong> for tracing. Observation ' +
        'API and Micrometer Tracing; Sleuth is not compatible with Boot 3.</li>' +
        '</ul>' +
        '<p>The general shape of the answer: the compile errors are the easy half. The ' +
        'expensive half is the behaviour that changed while still compiling, which is why the ' +
        'migration needs an integration test suite rather than a successful build.</p>',
    referenceLinks: [
        { title: 'Spring Boot 3.0 Migration Guide', url: 'https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-3.0-Migration-Guide' }
    ],
    tags: ['spring-boot', 'migration', 'versions', 'hibernate'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'what-boot-3-added',
    importance: 'should-know',
    subsection: 'versions',
    question: 'What did Spring Boot 3.x add that is worth adopting?',
    answer:
        '<p>Four things, in rough order of how often they change a design.</p>' +
        '<ul>' +
        '<li><strong>Virtual threads</strong>, from 3.2 on Java 21: ' +
        '<code>spring.threads.virtual.enabled=true</code> switches the servlet container, ' +
        '<code>@Async</code>, <code>@Scheduled</code> and the messaging listeners over. This is ' +
        'the change that makes blocking code scale, and it removes most of the reason to reach ' +
        'for WebFlux.</li>' +
        '<li><strong>Observability built in.</strong> Micrometer Observation unifies metrics and ' +
        'tracing behind one API, so a single instrumentation point produces both. It replaces ' +
        'Sleuth and is considerably less code.</li>' +
        '<li><strong>HTTP interfaces.</strong> Declare a client as an annotated Java interface ' +
        'and let Spring generate the implementation — the Feign idea, in the framework, with no ' +
        'extra dependency.</li>' +
        '<li><strong>GraalVM native image support</strong>, first class from 3.0. Startup in ' +
        'tens of milliseconds and a much smaller memory footprint, at the cost of long build ' +
        'times, no dynamic class loading and reflection that must be registered. Worth it for ' +
        'functions and CLI tools, rarely worth it for a long-running service where the JIT ' +
        'eventually wins on throughput.</li>' +
        '</ul>' +
        '<p>Also worth knowing: <strong><code>RestClient</code></strong>, from 3.2, is the ' +
        'modern synchronous HTTP client — the fluent API of <code>WebClient</code> without the ' +
        'reactive stack. <code>RestTemplate</code> is in maintenance mode and not deprecated, so ' +
        'existing use is fine and new code should not add more of it.</p>',
    referenceLinks: [
        { title: 'Spring Boot Reference Documentation', url: 'https://docs.spring.io/spring-boot/reference/index.html' }
    ],
    tags: ['spring-boot', 'versions', 'virtual-threads', 'observability'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'version-support-windows',
    importance: 'should-know',
    subsection: 'versions',
    question: 'How do you decide which Spring Boot version to be on?',
    answer:
        '<p>By reading the support policy rather than by preference, because the deciding ' +
        'factor is usually security patches rather than features.</p>' +
        '<p>Spring Boot minor releases get roughly a year of open-source support and then move ' +
        'to commercial support. Once a line is out of open-source support, security fixes are no ' +
        'longer published publicly — so an unsupported version is not merely old, it is ' +
        'accumulating unpatched vulnerabilities that the CVE feed will eventually report.</p> ' +
        '<p>That gives a rule that is easy to defend in a planning meeting: <strong>stay on a ' +
        'version that still receives open-source security patches, and treat falling off that ' +
        'window as an incident waiting to happen rather than as technical debt to be scheduled ' +
        'later.</strong></p>' +
        '<p>The practical mechanics:</p>' +
        '<ul>' +
        '<li><strong>Patch releases are safe and frequent.</strong> Take them continuously; they ' +
        'are bug and security fixes within a minor line.</li>' +
        '<li><strong>Minor upgrades need a read of the release notes and a test run</strong>, ' +
        'and they are where behaviour changes appear.</li>' +
        '<li><strong>Major upgrades are projects.</strong> Boot 2 to 3 was, and Boot 3 to 4 ' +
        'similarly follows the framework major.</li>' +
        '<li>The Boot version dictates the Spring Framework, Java and Hibernate versions ' +
        'through its dependency management, so the decision is rarely just about Boot.</li>' +
        '</ul>' +
        '<p><strong>Check the current dates rather than quoting remembered ones.</strong> The ' +
        'support calendar moves, and a confidently stated wrong date is worse than saying you ' +
        'would look it up — which is also the honest answer in an interview.</p>',
    referenceLinks: [
        { title: 'Spring Boot Support Policy', url: 'https://spring.io/projects/spring-boot/#support' }
    ],
    tags: ['spring-boot', 'versions', 'security', 'maintenance'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'planning-a-major-upgrade',
    importance: 'should-know',
    subsection: 'versions',
    question: 'How would you plan a Boot 2.7 to 3.x upgrade for a real service?',
    answer:
        '<p>The order matters, because each step reduces the number of variables in the next.</p>' +
        '<ul>' +
        '<li><strong>Get the safety net first.</strong> If the integration tests do not cover ' +
        'the main flows, write those before changing anything. The migration breaks things that ' +
        'still compile, so a green build proves very little.</li>' +
        '<li><strong>Go to the latest 2.7 patch and fix every deprecation warning.</strong> 2.7 ' +
        'was built as a stepping stone and warns about most of what 3.0 removes.</li>' +
        '<li><strong>Move to Java 17 separately</strong>, still on Boot 2.7. Two variables ' +
        'become one, and the JDK change alone can surface reflection and library problems.</li>' +
        '<li><strong>Audit the dependency tree for Jakarta readiness.</strong> This is the step ' +
        'that determines whether the project is a week or a quarter. An unmaintained library ' +
        'with no Jakarta release has to be replaced, and finding that out early is the whole ' +
        'point of doing it now.</li>' +
        '<li><strong>Then Boot 3.0</strong>, with OpenRewrite or the Eclipse Transformer for the ' +
        'namespace rewrite.</li>' +
        '<li><strong>Then walk the minors</strong> — 3.1, 3.2 — one at a time, reading the ' +
        'release notes for each.</li>' +
        '</ul>' +
        '<p>Two things to say about deployment, because they are what make it survivable: roll ' +
        'it out behind a flag or to a canary rather than all at once, and keep the previous ' +
        'artefact deployable — which means database migrations must stay backward compatible for ' +
        'the duration, so a rollback does not need a schema rollback.</p>' +
        '<p>The specific things to test rather than assume: JSON serialisation of every API ' +
        'response, generated SQL for every non-trivial query, security configuration, and the ' +
        'Actuator paths the probes and dashboards depend on.</p>',
    referenceLinks: [
        { title: 'Spring Boot 3.0 Migration Guide', url: 'https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-3.0-Migration-Guide' }
    ],
    tags: ['spring-boot', 'migration', 'planning', 'operations'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'deprecations-and-replacements',
    importance: 'good-to-know',
    subsection: 'versions',
    question: 'Which Spring APIs have quietly been replaced, and what replaced them?',
    answer:
        '<p>Knowing the current spelling is a cheap signal that someone has kept up. The ones ' +
        'that come up:</p>' +
        '<ul>' +
        '<li><strong><code>RestTemplate</code> → <code>RestClient</code></strong> (Boot 3.2). ' +
        '<code>RestTemplate</code> is in maintenance, not deprecated — existing use is fine, new ' +
        'code should not add more.</li>' +
        '<li><strong><code>WebClient</code> for blocking calls → <code>RestClient</code>.</strong> ' +
        'Pulling in the reactive stack to make one synchronous call and then calling ' +
        '<code>block()</code> was always a workaround.</li>' +
        '<li><strong><code>@MockBean</code> → <code>@MockitoBean</code></strong> (Boot 3.4 / ' +
        'Framework 6.2). The test-scoped mock moved into the framework itself.</li>' +
        '<li><strong>Sleuth → Micrometer Tracing.</strong> Sleuth does not work on Boot 3.</li>' +
        '<li><strong><code>WebSecurityConfigurerAdapter</code> → a ' +
        '<code>SecurityFilterChain</code> bean</strong> (Security 5.7). The adapter is gone in ' +
        'Security 6, and the component-based style is the only one now.</li>' +
        '<li><strong><code>antMatchers</code> → <code>requestMatchers</code></strong> in ' +
        'Security 6, with the matching strategy inferred rather than chosen.</li>' +
        '<li><strong>Hibernate 5 → 6</strong>, which is a dependency of Boot 3 rather than a ' +
        'choice.</li>' +
        '</ul>' +
        '<p>The habit worth having behind all of this: when a Spring API is replaced, the old ' +
        'one usually keeps working for at least one major version and the documentation says ' +
        'what to use instead. Reading the "what\'s new" page for each minor takes twenty minutes ' +
        'and is the difference between an upgrade and an archaeology project.</p>',
    referenceLinks: [
        { title: 'Spring — REST Clients', url: 'https://docs.spring.io/spring-framework/reference/integration/rest-clients.html' }
    ],
    tags: ['spring-boot', 'versions', 'deprecations', 'api'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'native-image-tradeoffs',
    importance: 'good-to-know',
    subsection: 'versions',
    question: 'When is a GraalVM native image worth it for a Spring application?',
    answer:
        '<p>Ahead-of-time compilation to a native executable: startup in tens of milliseconds ' +
        'instead of seconds, and memory measured in tens of megabytes instead of hundreds. Boot ' +
        '3 supports it first-class through the AOT engine, which runs much of the container ' +
        'setup at build time and generates the reflection metadata.</p>' +
        '<p><strong>Worth it</strong> for serverless functions, where cold start is the dominant ' +
        'cost; for CLI tools; for very high pod density where memory is the constraint; and for ' +
        'anything that scales to zero.</p>' +
        '<p><strong>Usually not worth it</strong> for a long-running service. The JIT is a ' +
        'profile-guided optimiser with the whole run to work with, so peak throughput on the JVM ' +
        'is typically better than a native image. If a process lives for days, the startup ' +
        'saving is irrelevant and the throughput difference is not.</p>' +
        '<p>The costs are real and worth naming:</p>' +
        '<ul>' +
        '<li><strong>Closed-world assumption.</strong> Everything reachable must be known at ' +
        'build time. Reflection, dynamic proxies and resource loading need registration hints, ' +
        'and a library that does not supply them fails at run time rather than at build ' +
        'time.</li>' +
        '<li><strong>Build times of minutes, and high build memory.</strong> That changes what a ' +
        'CI pipeline costs.</li>' +
        '<li><strong>A different runtime to debug.</strong> Familiar JVM tooling — JFR, most ' +
        'profilers, agent-based APM — either does not attach or works differently.</li>' +
        '<li><strong>Configuration is fixed at build time</strong> for anything the AOT engine ' +
        'evaluated, so profiles that change which beans exist do not work the way they do on the ' +
        'JVM.</li>' +
        '</ul>' +
        '<p>Project Leyden and CRaC are worth mentioning as the alternatives aiming at the same ' +
        'startup problem while keeping the JVM.</p>',
    referenceLinks: [
        { title: 'GraalVM Native Image Support — Spring Boot Reference', url: 'https://docs.spring.io/spring-boot/reference/packaging/native-image/index.html' }
    ],
    tags: ['spring-boot', 'graalvm', 'native-image', 'performance'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
}

    ]
};
