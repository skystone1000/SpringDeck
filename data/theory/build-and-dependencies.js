/* ==========================================================================
   data/theory/build-and-dependencies.js — module 2 in the reading path

   The first of the two section 5.9 insertions into `production`, and the
   first module of that track to exist at all — so this is the commit where
   the Testing, Observability & Operations group appears in the theory
   sidebar.

   Position 2 looks surprising for an operations module and is correct. It
   sits immediately after how-java-runs because it answers the question that
   module raises and does not settle: a class file has to come from
   somewhere, and a classpath has to be assembled by something. Everything
   after it can then say "add the dependency" without hand-waving.

   Twelve chapters. Six are Maven mechanics, and the three in the middle —
   transitive dependencies, nearest-wins mediation, reading the tree — are
   the ones that get asked, because they are what somebody debugging a
   NoSuchMethodError at four in the afternoon actually needs.
   ========================================================================== */

const buildAndDependenciesModule = {
    id: 'build-and-dependencies',
    trackId: 'production',
    order: 2,
    title: 'Building and Depending',
    tagline: "Maven's lifecycle, and the transitive dependency that broke production.",
    estimatedMinutes: 40,
    prerequisites: ['how-java-runs'],
    docHub: { title: 'Apache Maven', url: 'https://maven.apache.org/guides/index.html' },

    chapters: [
        {
            id: 'what-a-build-tool-does',
            title: 'What a Build Tool Is For',
            importance: 'should-know',
            summary: 'Resolve dependencies, assemble a classpath, compile, test, package. The first two are the hard ones, and they are the reason a build tool exists rather than a shell script.',
            interviewAngle: 'Rarely asked head-on and useful as framing. The insight is that compilation is easy and dependency resolution is a constraint-solving problem with no obviously right answer.',
            buildsOn: [],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>The previous module ended with a classpath: <code>java -cp ... Main</code>. Everything a build tool does exists to produce that string and the files it points at.</p><p>Compiling is the easy part — <code>javac</code> already does it, and a shell script could drive it. What cannot be done with a shell script is <strong>resolution</strong>: your project needs Jackson, Jackson needs three things, each of those needs more, two of them need different versions of the same library, and exactly one version can be on the classpath. That is a graph problem with conflicts in it, and resolving it consistently, offline, and identically on every machine is what the tool is actually for.</p>'
                },
                {
                    type: 'types',
                    title: 'The jobs, in order of how much they justify the tool',
                    items: [
                        { name: 'Dependency resolution', html: '<p>Walk the transitive graph, pick one version per artefact, download, cache. The whole reason this is not a script.</p>' },
                        { name: 'Classpath assembly', html: '<p>A different classpath for compiling, for testing, and for running — which is what dependency scopes exist to express.</p>' },
                        { name: 'A standard lifecycle', html: '<p>Every project builds with the same command. The value is uniformity: a stranger can build your project without reading anything.</p>' },
                        { name: 'Packaging', html: '<p>A jar, a fat jar, a container image. Mechanical once the classpath is known.</p>' },
                        { name: 'Reproducibility', html: '<p>The same inputs give the same outputs on a laptop and on CI. Harder than it sounds; there is a chapter on it.</p>' }
                    ]
                }
            ],
            docs: [
                { title: 'Maven — Introduction to the Build Lifecycle', url: 'https://maven.apache.org/guides/introduction/introduction-to-the-lifecycle.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'build-tools', questionId: 'maven-lifecycle-and-goals' }
            ]
        },

        {
            id: 'maven-lifecycle-phases-goals',
            title: 'Lifecycle, Phase, Goal',
            importance: 'must-know',
            summary: 'A lifecycle is an ordered list of phases. Running a phase runs every phase before it. A goal is a plugin task bound to a phase, and that binding is where all the configuration lives.',
            interviewAngle: 'Asked directly and often answered vaguely. The precise facts are that phases are cumulative, that there are three separate lifecycles, and that mvn clean install is two lifecycles in one command.',
            buildsOn: ['what-a-build-tool-does'],
            blocks: [
                {
                    type: 'table',
                    title: 'The default lifecycle, and what each phase adds',
                    headers: ['Phase', 'What runs', 'You reach for it when'],
                    rows: [
                        ['<code>validate</code>', 'Project structure checks', 'Rarely, directly'],
                        ['<code>compile</code>', '<code>compiler:compile</code> — main sources to <code>target/classes</code>', 'Checking that it compiles'],
                        ['<code>test-compile</code>', 'Test sources compiled', 'Automatically, before tests'],
                        ['<code>test</code>', '<code>surefire:test</code> — unit tests', '<code>mvn test</code>, the everyday command'],
                        ['<code>package</code>', '<code>jar:jar</code>, then Boot\'s repackage', 'Producing an artefact without installing it'],
                        ['<code>verify</code>', '<code>failsafe:verify</code> — integration tests', '<strong><code>mvn verify</code> is what CI should run</strong>'],
                        ['<code>install</code>', 'Copy to the local <code>~/.m2</code> repository', 'Another local project depends on this one'],
                        ['<code>deploy</code>', 'Upload to a remote repository', 'Releasing']
                    ]
                },
                {
                    type: 'syntax',
                    language: 'bash',
                    title: 'The commands, and what each one actually triggers',
                    code: '# Phases are CUMULATIVE. This runs validate, compile, test-compile,\n# test, package, verify -- every phase up to and including install.\nmvn install\n\n# `clean` is a DIFFERENT lifecycle. This is two lifecycles, in order.\nmvn clean install\n\n# Skip test EXECUTION but still compile them -- catches a test that no\n# longer compiles, which -Dmaven.test.skip=true does not.\nmvn install -DskipTests\n\n# Do not compile tests at all. Faster, and it hides a broken test.\nmvn install -Dmaven.test.skip=true\n\n# Run one goal directly, outside any lifecycle. plugin:goal syntax.\nmvn dependency:tree\nmvn versions:display-dependency-updates\n\n# Offline, using only what is already in ~/.m2.\nmvn -o verify',
                    notes: '<p>The two skip flags being different is a small thing that catches people: <code>-DskipTests</code> compiles the tests and does not run them, so a test referencing a method you just deleted still fails the build. <code>-Dmaven.test.skip=true</code> skips compilation too, and lets that breakage through to whoever runs the tests next.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Surefire runs unit tests at <code>test</code>; Failsafe runs integration tests at <code>verify</code>.</strong> The difference matters: Failsafe runs <em>after</em> packaging and does not fail the build immediately, so <code>post-integration-test</code> can still tear down whatever the tests started. A CI job that runs <code>mvn test</code> and believes it has run the integration tests is a common and quiet gap — <code>mvn verify</code> is the command that runs everything.</p>'
                }
            ],
            docs: [
                { title: 'Maven Lifecycle Reference', url: 'https://maven.apache.org/guides/introduction/introduction-to-the-lifecycle.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'build-tools', questionId: 'maven-lifecycle-and-goals' }
            ]
        },

        {
            id: 'dependency-scopes',
            title: 'Scopes',
            importance: 'must-know',
            summary: 'Which classpath a dependency lands on, and whether it is transitive. Six of them, and getting one wrong ships a test library to production or leaves a driver missing at run time.',
            interviewAngle: 'A precise, checkable question. provided and runtime are the two that are most often confused, and the difference is which side of compilation they are on.',
            buildsOn: ['maven-lifecycle-phases-goals'],
            blocks: [
                {
                    type: 'table',
                    title: 'The six scopes',
                    headers: ['Scope', 'Compile', 'Test', 'Runtime', 'Transitive', 'Use for'],
                    rows: [
                        ['<code>compile</code>', 'Yes', 'Yes', 'Yes', 'Yes', 'The default. Ordinary libraries.'],
                        ['<code>provided</code>', 'Yes', 'Yes', '<strong>No</strong>', 'No', 'Something the container supplies — the servlet API, Lombok'],
                        ['<code>runtime</code>', '<strong>No</strong>', 'Yes', 'Yes', 'Yes', 'A JDBC driver, an SLF4J binding — needed but never imported'],
                        ['<code>test</code>', 'No', 'Yes', 'No', 'No', 'JUnit, Mockito, Testcontainers'],
                        ['<code>system</code>', 'Yes', 'Yes', 'No', 'No', '<strong>Nothing.</strong> Deprecated; a path to a jar on disk'],
                        ['<code>import</code>', '—', '—', '—', '—', 'Only in <code>dependencyManagement</code>, for a BOM']
                    ]
                },
                {
                    type: 'prose',
                    html: '<p><code>runtime</code> is the one worth understanding rather than memorising, because it enforces a design rule. A JDBC driver at <code>runtime</code> scope <em>cannot be imported</em> — the compiler does not see it — so no code can accidentally reference a PostgreSQL-specific class. The dependency is present when the application runs and invisible when it compiles, which is exactly the relationship you want with a driver.</p><p><code>provided</code> is the mirror image: available while compiling, absent at run time because something else supplies it. Lombok is the canonical example, and it is why Lombok does not appear in a fat jar.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A test library at the default scope ships to production.</strong> Mockito or an in-memory database at <code>compile</code> scope goes into the fat jar, adds to the image, and — worse — becomes importable from main code, so somebody eventually writes production code against a test fixture. It also widens the vulnerability surface for no benefit. Check with <code>mvn dependency:tree -Dscope=compile</code> and look for anything whose name contains "test".</p>'
                }
            ],
            docs: [
                { title: 'Maven — Dependency Scope', url: 'https://maven.apache.org/guides/introduction/introduction-to-dependency-mechanism.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'build-tools', questionId: 'dependency-scopes' }
            ]
        },

        {
            id: 'transitive-dependencies',
            title: 'Transitive Dependencies',
            importance: 'must-know',
            summary: 'You declare five and get a hundred and forty. Every one of them is on your classpath, in your image, and in your vulnerability report.',
            interviewAngle: 'The setup for the two chapters that follow. The number is the point: most of what you ship, you never chose.',
            buildsOn: ['dependency-scopes'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>A dependency brings its own dependencies, and theirs. A Spring Boot web application typically declares four or five starters and resolves to well over a hundred artefacts — Spring, Tomcat, Jackson, SLF4J, Logback, SnakeYAML, Micrometer, and a long tail.</p><p>Three consequences follow, and they are the whole of dependency management as a practice. Two libraries will eventually want different versions of a third, and only one can win. A vulnerability in something you have never heard of is a vulnerability in your application. And your build is only as reproducible as the weakest version declaration anywhere in that graph.</p>'
                },
                {
                    type: 'syntax',
                    language: 'xml',
                    title: 'Excluding something, and the better alternative',
                    code: '<!-- Exclusion: remove one artefact that arrives transitively. Here,\n     dropping Logback so a different SLF4J binding can be used. -->\n<dependency>\n    <groupId>org.springframework.boot</groupId>\n    <artifactId>spring-boot-starter-web</artifactId>\n    <exclusions>\n        <exclusion>\n            <groupId>org.springframework.boot</groupId>\n            <artifactId>spring-boot-starter-logging</artifactId>\n        </exclusion>\n    </exclusions>\n</dependency>\n\n<!-- Usually better: pin the version centrally instead of excluding.\n     dependencyManagement wins over anything the graph resolves, so\n     one entry fixes the version everywhere it appears. -->\n<dependencyManagement>\n    <dependencies>\n        <dependency>\n            <groupId>org.yaml</groupId>\n            <artifactId>snakeyaml</artifactId>\n            <version>2.2</version>\n        </dependency>\n    </dependencies>\n</dependencyManagement>',
                    notes: '<p>An exclusion has to be repeated on every dependency that pulls the artefact in, so it is easy to exclude it from three places and miss the fourth. A <code>dependencyManagement</code> entry is one declaration that applies to the whole graph, which is why it is the better tool for the far more common problem — the version is wrong rather than the artefact being unwanted.</p>'
                }
            ],
            docs: [
                { title: 'Maven — Transitive Dependencies', url: 'https://maven.apache.org/guides/introduction/introduction-to-dependency-mechanism.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'build-tools', questionId: 'nearest-wins-mediation' }
            ]
        },

        {
            id: 'nearest-wins-mediation',
            title: 'Nearest Wins',
            importance: 'must-know',
            summary: 'When two paths in the graph want different versions, Maven takes the one at the shallower depth — not the newest. That is the rule behind most NoSuchMethodErrors.',
            interviewAngle: 'The single highest-value fact in this module. It surprises people, it explains a whole class of run-time failures, and Gradle does the opposite.',
            buildsOn: ['transitive-dependencies'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'bash',
                    title: 'Two paths, one winner, and it is not the newer one',
                    code: 'your-app\n├── library-a 1.0\n│   └── commons-text 1.9         # depth 2\n└── library-b 2.0\n    └── some-wrapper 3.1\n        └── commons-text 1.11    # depth 3\n\n# Maven picks commons-text 1.9 -- DEPTH 2 beats depth 3. The version\n# number is not consulted. If library-b calls a method added in 1.10,\n# it compiled fine and throws NoSuchMethodError at run time.\n#\n# Ties at equal depth are broken by DECLARATION ORDER in the pom,\n# which means reordering two dependencies can change what you ship.\n\n# Gradle does the opposite: HIGHEST version wins, regardless of depth.\n# Same graph, Gradle resolves commons-text 1.11.',
                    output: {
                        kind: 'trace',
                        lines: [
                            'Maven:  nearest declaration wins        -> commons-text 1.9   (depth 2 beats depth 3)',
                            'Gradle: highest version wins            -> commons-text 1.11',
                            'Neither is "correct". Maven is predictable from the pom; Gradle assumes newer is backward compatible.',
                            'The failure signature is the same in both: it compiles, it starts, and it throws NoSuchMethodError or NoClassDefFoundError on the code path that needs the newer class.'
                        ],
                        explain: '<p>The reason this produces a run-time failure rather than a build failure is that <code>library-b</code> was compiled against 1.11 by somebody else, on their machine, against their classpath. Your build never sees that compilation. The linkage error appears the first time the affected code path runs, which may be in production and may be months later.</p>'
                    }
                },
                {
                    type: 'tip',
                    html: '<p>The fix is always the same and it is not an exclusion: add a <code>dependencyManagement</code> entry pinning the version you want. It applies to the whole graph, it is one line, it survives someone adding a sixth path to the same artefact, and it is visible in one place when the next person asks why that version is there. Add a comment saying which library needed it.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>The Maven Enforcer plugin\'s <code>dependencyConvergence</code> rule fails the build when two paths disagree about a version.</strong> Turning it on in an established project produces a wall of failures and is still worth doing once: each one is a version conflict that Maven silently resolved and nobody reviewed. Fix them, pin them, and the class of run-time surprise this chapter describes stops happening.</p>'
                }
            ],
            docs: [
                { title: 'Maven — Dependency Mediation', url: 'https://maven.apache.org/guides/introduction/introduction-to-dependency-mechanism.html', kind: 'guide' },
                { title: 'Gradle — Dependency Resolution', url: 'https://docs.gradle.org/current/userguide/dependency_resolution.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'build-tools', questionId: 'nearest-wins-mediation' }
            ]
        },

        {
            id: 'reading-dependency-tree',
            title: 'Reading the Tree',
            importance: 'must-know',
            summary: 'dependency:tree with a filter answers "where did this come from" and "which version won" in one command. It is the debugging tool for everything above.',
            interviewAngle: 'Being able to name the exact command is a small, concrete signal of having done this rather than read about it.',
            buildsOn: ['nearest-wins-mediation'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'bash',
                    title: 'The four invocations worth remembering',
                    code: '# The whole tree. Large, and where you start when nothing is known.\nmvn dependency:tree\n\n# THE useful one: only the paths that reach a given artefact, and the\n# omitted-for-conflict lines showing what lost.\nmvn dependency:tree -Dincludes=org.apache.commons:commons-text -Dverbose\n\n# What is actually on the classpath after resolution, one per line.\nmvn dependency:list -DoutputFile=deps.txt\n\n# Declared but unused, and used but undeclared. The second list is the\n# dangerous one -- code compiling against a transitive dependency that\n# can vanish when an intermediate library upgrades.\nmvn dependency:analyze',
                    output: {
                        kind: 'trace',
                        lines: [
                            'With -Dverbose, a losing version is printed as: (version 1.9 omitted for conflict with 1.11)',
                            'Without -Dverbose, only the winner appears -- so the conflict is invisible and the tree looks consistent.',
                            'dependency:analyze "used undeclared" means: your code imports it, but nothing in your pom asks for it.',
                            'That works until an intermediate library drops it, at which point your code stops compiling for no reason you changed.'
                        ],
                        explain: '<p><code>-Dverbose</code> is the flag that turns the command from a listing into a diagnosis. Without it the tree shows the resolved graph, which is exactly the information that hides the conflict you are looking for.</p>'
                    }
                },
                {
                    type: 'tip',
                    html: '<p>Declare what you import. A dependency you use but do not declare works by accident, and the accident ends when an intermediate library changes its own dependencies — producing a compile failure in code nobody touched. <code>dependency:analyze</code> in CI, as a warning rather than a failure, keeps that list short.</p>'
                }
            ],
            docs: [
                { title: 'Maven Dependency Plugin', url: 'https://maven.apache.org/plugins/maven-dependency-plugin/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'build-tools', questionId: 'nearest-wins-mediation' }
            ]
        },

        {
            id: 'bom-and-dependencymanagement',
            title: 'BOMs and dependencyManagement',
            importance: 'must-know',
            summary: 'dependencyManagement declares versions without adding dependencies. A BOM is a pom that contains nothing but such declarations, imported so somebody else curates the versions.',
            interviewAngle: 'The mechanism behind "why does my Spring dependency have no version". Knowing that dependencyManagement wins over mediation is the useful half.',
            buildsOn: ['reading-dependency-tree'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'xml',
                    title: 'Importing a BOM, then declaring without versions',
                    code: '<dependencyManagement>\n    <dependencies>\n        <!-- scope=import + type=pom: merge that pom is\n             dependencyManagement into ours. -->\n        <dependency>\n            <groupId>org.springframework.boot</groupId>\n            <artifactId>spring-boot-dependencies</artifactId>\n            <version>3.4.1</version>\n            <type>pom</type>\n            <scope>import</scope>\n        </dependency>\n    </dependencies>\n</dependencyManagement>\n\n<dependencies>\n    <!-- No version. It comes from the BOM, which has tested this\n         combination of ~400 artefacts against each other. -->\n    <dependency>\n        <groupId>org.springframework.boot</groupId>\n        <artifactId>spring-boot-starter-web</artifactId>\n    </dependency>\n\n    <!-- An override. dependencyManagement beats mediation, so this\n         wins over whatever the BOM says AND over the transitive graph. -->\n    <dependency>\n        <groupId>com.fasterxml.jackson.core</groupId>\n        <artifactId>jackson-databind</artifactId>\n        <version>2.18.2</version>\n    </dependency>\n</dependencies>',
                    notes: '<p>The precedence order is worth stating plainly, because it is what makes <code>dependencyManagement</code> the right fix for a mediation problem: an explicit version on the dependency wins, then <code>dependencyManagement</code> in your own pom, then an imported BOM, and mediation only decides what nothing above has decided.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Overriding one version out of a BOM opts you out of the testing that BOM represents.</strong> Bumping <code>jackson-databind</code> past what Spring Boot 3.4 declares is sometimes necessary — a CVE, usually — and it puts you on a combination nobody has run the framework\'s integration tests against. Do it deliberately, leave a comment saying why, and remove the override at the next framework upgrade rather than letting it accumulate.</p>'
                }
            ],
            docs: [
                { title: 'Maven — Importing Dependencies', url: 'https://maven.apache.org/guides/introduction/introduction-to-dependency-mechanism.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'build-tools', questionId: 'bom-and-dependency-management' }
            ]
        },

        {
            id: 'spring-boot-parent-vs-bom',
            title: 'Boot Parent Against Boot BOM',
            importance: 'should-know',
            summary: 'The parent gives you dependency versions plus plugin configuration and sensible defaults. The BOM gives you only the versions, and leaves the parent slot free.',
            interviewAngle: 'A practical question in any multi-module or corporate-parent project, where the single parent slot is already taken.',
            buildsOn: ['bom-and-dependencymanagement'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'The two ways to consume Spring Boot',
                    left: 'spring-boot-starter-parent',
                    right: 'spring-boot-dependencies (BOM)',
                    rows: [
                        { aspect: 'Dependency versions', left: 'Yes', right: 'Yes — identical' },
                        { aspect: 'Plugin versions and configuration', left: '<strong>Yes</strong> — surefire, failsafe, the Boot plugin, resource filtering', right: 'No. You configure them yourself.' },
                        { aspect: 'Java version property', left: '<code>&lt;java.version&gt;</code> works', right: 'Set compiler source/target yourself' },
                        { aspect: 'Uses the parent slot', left: '<strong>Yes</strong> — and a pom has only one', right: 'No' },
                        { aspect: 'Reach for it when', left: 'A standalone project, or the root of your own multi-module build', right: 'A corporate parent already occupies the slot' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>In a multi-module build the usual arrangement is: your own root pom uses <code>spring-boot-starter-parent</code> as its parent, the modules use your root as theirs, and the versions flow down two levels. If a corporate parent has to be the root, import the BOM instead and copy across the two or three plugin configurations you actually rely on — usually the Boot repackage goal and the failsafe binding.</p>'
                }
            ],
            docs: [
                { title: 'Spring Boot — Using the BOM without the parent', url: 'https://docs.spring.io/spring-boot/maven-plugin/using.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'build-tools', questionId: 'bom-and-dependency-management' }
            ]
        },

        {
            id: 'multi-module-projects',
            title: 'Multi-Module Projects',
            importance: 'should-know',
            summary: 'An aggregator pom listing modules, built together in dependency order. It is the enforcement mechanism the architecture module wanted: a module boundary the compiler cannot cross.',
            interviewAngle: 'The connection worth drawing is to package-by-feature. Modules make the boundary physical, and the cost is build complexity and a slower feedback loop.',
            buildsOn: ['spring-boot-parent-vs-bom'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'xml',
                    title: 'The aggregator, and the dependency direction it enforces',
                    code: '<!-- root pom: packaging=pom, and it builds nothing itself -->\n<packaging>pom</packaging>\n<modules>\n    <module>ordering-domain</module>   <!-- depends on nothing -->\n    <module>ordering-adapters</module> <!-- depends on domain -->\n    <module>app</module>               <!-- depends on both, has main() -->\n</modules>\n\n<!-- Maven computes the build ORDER from the dependency graph, not from\n     the order of these elements. A cycle between modules is a BUILD\n     ERROR, which is the enforcement the architecture module wanted:\n     the domain module cannot import from adapters, because it does not\n     have them on its classpath. Not a convention -- a compile failure. -->',
                    notes: '<p>That last point is the strongest argument for modules over packages. An ArchUnit rule can be deleted by whoever it inconvenienced; a missing classpath entry cannot be argued with. The cost is real — more poms, a slower full build, and IDE navigation that crosses module boundaries less smoothly — so it is worth it when the boundary genuinely matters and overkill when it does not.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Two commands make a large multi-module build bearable, and both are worth knowing by name: <code>mvn -pl app -am install</code> builds one module and everything it needs, skipping the rest, and <code>mvn -T 1C verify</code> builds independent modules in parallel with one thread per core. On a ten-module project the second one routinely halves the wall-clock time.</p>'
                }
            ],
            docs: [
                { title: 'Maven — Guide to Working with Multiple Modules', url: 'https://maven.apache.org/guides/mini/guide-multiple-modules.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'build-tools', questionId: 'multi-module-projects' }
            ]
        },

        {
            id: 'maven-vs-gradle',
            title: 'Maven Against Gradle',
            importance: 'should-know',
            summary: 'Declarative XML with a fixed lifecycle against a programmable build with incremental compilation and a build cache. Gradle is faster; Maven is more predictable.',
            interviewAngle: 'A preference question that rewards a balanced answer. The version-conflict difference is the substantive one, and it is the same fact as the nearest-wins chapter.',
            buildsOn: ['multi-module-projects'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'Where they genuinely differ',
                    left: 'Maven',
                    right: 'Gradle',
                    rows: [
                        { aspect: 'Build definition', left: 'Declarative XML', right: 'A program — Groovy or Kotlin DSL' },
                        { aspect: 'Version conflict', left: '<strong>Nearest declaration wins</strong>', right: '<strong>Highest version wins</strong>' },
                        { aspect: 'Incremental builds', left: 'Limited', right: 'Yes, and a shared build cache' },
                        { aspect: 'Speed on a large project', left: 'Slower', right: 'Often much faster' },
                        { aspect: 'Predictability', left: 'High — the pom says what happens', right: 'Lower — the build is code and can do anything' },
                        { aspect: 'Custom build logic', left: 'Write a plugin', right: 'Write it inline' },
                        { aspect: 'Android', left: 'Not supported', right: 'The only option' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>A defensible answer: <em>"Maven for a service, because the build is boring and I want it to stay boring — anybody can read the pom and know what happens. Gradle when build times are a real cost or the build needs genuine logic. The difference I would actually flag to a team is version conflict resolution: Maven takes the nearest declaration and Gradle takes the highest version, so the same dependency graph can resolve differently."</em></p>'
                }
            ],
            docs: [
                { title: 'Gradle — Migrating from Maven', url: 'https://docs.gradle.org/current/userguide/migrating_from_maven.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'build-tools', questionId: 'maven-versus-gradle' }
            ]
        },

        {
            id: 'reproducible-builds',
            title: 'Reproducible Builds',
            importance: 'should-know',
            summary: 'The same source should produce the same artefact, on any machine, at any time. Version ranges, SNAPSHOTs and embedded timestamps each break it.',
            interviewAngle: 'A supply-chain question that has become much more prominent. The concrete answers — no ranges, no SNAPSHOTs in a release, pin plugin versions, set the timestamp — are checkable.',
            buildsOn: ['maven-vs-gradle'],
            blocks: [
                {
                    type: 'types',
                    title: 'What breaks reproducibility, in order of how often',
                    items: [
                        { name: 'Version ranges', html: '<p><code>[1.0,2.0)</code> resolves to whatever is newest today. The build is a function of the calendar. Never use them.</p>' },
                        { name: 'SNAPSHOT dependencies', html: '<p>Re-resolved from the remote repository periodically, so the same commit builds differently next week. Acceptable inside a development cycle, never in a release.</p>' },
                        { name: 'Unpinned plugin versions', html: '<p>Maven picks a default that changes with the Maven version, so CI and a laptop can run different compilers. Pin every plugin.</p>' },
                        { name: 'Timestamps in the archive', html: '<p>Jar entries carry a modification time, so two builds of identical bytes differ. <code>project.build.outputTimestamp</code> fixes it.</p>' },
                        { name: 'The environment', html: '<p>JDK vendor and version, locale, timezone, file ordering on disk. Pin the JDK in the build and in the image.</p>' }
                    ]
                },
                {
                    type: 'syntax',
                    language: 'xml',
                    title: 'Making the output byte-identical',
                    code: '<properties>\n    <!-- One property, and Maven passes it to every plugin that writes\n         an archive. Two builds of the same commit then produce\n         byte-identical jars. -->\n    <project.build.outputTimestamp>2026-01-15T00:00:00Z</project.build.outputTimestamp>\n</properties>\n\n<!-- And the enforcer rules that stop the two worst offenders getting in. -->\n<plugin>\n    <groupId>org.apache.maven.plugins</groupId>\n    <artifactId>maven-enforcer-plugin</artifactId>\n    <configuration>\n        <rules>\n            <requireReleaseDeps/>        <!-- no SNAPSHOTs -->\n            <banDynamicVersions/>        <!-- no ranges -->\n            <requireMavenVersion><version>[3.9,)</version></requireMavenVersion>\n        </rules>\n    </configuration>\n</plugin>',
                    notes: '<p>Reproducibility is not an aesthetic goal. It is what makes a build artefact <em>verifiable</em> — anybody can rebuild from the tagged source and confirm the bytes match what was deployed — which is the foundation of every supply-chain attestation scheme, and the reason this has moved from a curiosity to a compliance requirement in several industries.</p>'
                }
            ],
            docs: [
                { title: 'Maven — Reproducible Builds', url: 'https://maven.apache.org/guides/mini/guide-reproducible-builds.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'build-tools', questionId: 'reproducible-builds' }
            ]
        },

        {
            id: 'vulnerability-scanning',
            title: 'Knowing What You Ship',
            importance: 'must-know',
            summary: 'A hundred and forty artefacts, none of which you read. Scanning is how you find out that one of them has a published CVE, and an SBOM is how somebody else finds out.',
            interviewAngle: 'Increasingly asked, and the strong answer distinguishes the three layers — dependencies, base image, application code — because a dependency scanner sees only the first.',
            buildsOn: ['reproducible-builds'],
            blocks: [
                {
                    type: 'types',
                    title: 'Three layers, three tools',
                    items: [
                        { name: 'Your dependencies', html: '<p>OWASP Dependency-Check, or the Maven plugin for whichever scanner your organisation runs. Matches the resolved graph against the CVE database. This is the layer this module is about.</p>' },
                        { name: 'The base image', html: '<p>Trivy or Grype against the built image. A vulnerable <code>glibc</code> in the base layer is not visible to any Maven plugin, and it is just as exploitable.</p>' },
                        { name: 'Your own code', html: '<p>Static analysis — SpotBugs, Semgrep, the platform\'s own scanner. Neither of the above looks at code you wrote.</p>' },
                        { name: 'An SBOM', html: '<p>CycloneDX or SPDX: a machine-readable list of everything in the artefact, produced at build time. Increasingly a contractual requirement, and the thing that makes "are we affected by this new CVE" a query rather than an investigation.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A scanner that fails the build on every CVE gets switched off within a month.</strong> The graph has a hundred and forty artefacts and a steady stream of advisories, many of them in code paths you never execute — a deserialisation CVE in a library you use only for date formatting. Fail the build on <em>critical</em> and <em>high</em>, report the rest, and keep a reviewed suppression file with an expiry date and a reason on every entry. A scanner people act on beats a stricter one people mute.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The most valuable habit here is not the scanner, it is <strong>upgrading regularly</strong>. A project on the current Spring Boot release picks up most fixes as ordinary maintenance; a project three minor versions behind meets them all at once, under time pressure, in an upgrade that also changes behaviour. Scheduled small upgrades are cheaper than urgent large ones, and that is an argument you may have to make to a product owner.</p>'
                }
            ],
            docs: [
                { title: 'OWASP Dependency-Check', url: 'https://jeremylong.github.io/DependencyCheck/', kind: 'guide' },
                { title: 'CycloneDX Maven Plugin', url: 'https://github.com/CycloneDX/cyclonedx-maven-plugin', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'build-tools', questionId: 'dependency-vulnerabilities' },
                { topicId: 'spring-boot', questionId: 'version-support-windows' }
            ]
        }
    ]
};
