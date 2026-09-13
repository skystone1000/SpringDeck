/* ==========================================================================
   data/build-tools.js — Build, Dependencies & Ways of Working

   Flat, on the `production` track.

   An unglamorous topic that is asked more than its reputation suggests,
   because it is a good proxy for whether someone has worked on a real
   codebase. Nearest-wins mediation, the difference between provided and
   runtime, and what a BOM is for are all things you learn by having a
   build break.

   The last two questions are about working practice rather than tooling.
   They belong here rather than in behavioural-project because they have
   technical answers — a rebase is a specific operation with a specific
   hazard, not a preference.

   ONE GLOBAL PER FILE.
   ========================================================================== */

const buildToolsData = {
    id: 'build-tools',
    title: 'Build, Dependencies & Ways of Working',
    subsections: null,
    keyTopics: [
        'Maven lifecycle phases and goals', 'dependency scopes', 'transitive dependencies',
        'nearest-wins mediation', 'dependency:tree', 'BOM and dependencyManagement',
        'multi-module projects', 'Maven vs Gradle', 'reproducible builds',
        'vulnerability scanning', 'branching strategy', 'rebase vs merge', 'code review'
    ],
    questions: [

{
    id: 'maven-lifecycle-and-goals',
    importance: 'must-know',
    subsection: null,
    question: 'What is the difference between a Maven phase and a goal?',
    answer:
        '<p>A <strong>phase</strong> is a step in a lifecycle. A <strong>goal</strong> is a task ' +
        'belonging to a plugin. Running a phase runs every goal <em>bound</em> to it — and every ' +
        'goal bound to every earlier phase in that lifecycle, which is the part people are ' +
        'surprised by.</p>' +
        '<p>So <code>mvn package</code> also validates, compiles, and runs the tests, because ' +
        'those phases come first. There is no way to run one phase in isolation.</p>' +
        '<p>The default lifecycle, abbreviated to what matters: <strong>validate → compile → test ' +
        '→ package → verify → install → deploy</strong>. Two others exist and are separate: ' +
        '<code>clean</code> and <code>site</code>. That is why <code>mvn clean package</code> ' +
        'names two lifecycles rather than two phases.</p>' +
        '<p>Three distinctions worth having ready:</p>' +
        '<ul>' +
        '<li><strong><code>install</code> versus <code>deploy</code>.</strong> ' +
        '<code>install</code> copies the artefact to your <em>local</em> repository, ' +
        '<code>~/.m2</code>. <code>deploy</code> uploads it to a remote one. Being unclear on ' +
        'this is a common tell.</li>' +
        '<li><strong><code>test</code> versus <code>verify</code>.</strong> Surefire runs unit ' +
        'tests at <code>test</code>; Failsafe runs integration tests at ' +
        '<code>integration-test</code> and checks their results at <code>verify</code> — which is ' +
        'why <code>mvn test</code> does not run your <code>*IT</code> classes and why an ' +
        'integration test failure does not stop the artefact being built until ' +
        '<code>verify</code>.</li>' +
        '<li><strong>A goal can be run directly</strong>, outside any lifecycle: ' +
        '<code>mvn dependency:tree</code> is plugin <code>dependency</code>, goal ' +
        '<code>tree</code>, and it runs nothing else.</li>' +
        '</ul>',
    referenceLinks: [
        { title: 'Maven — Build Lifecycle', url: 'https://maven.apache.org/guides/introduction/introduction-to-the-lifecycle.html' }
    ],
    tags: ['maven', 'build', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'dependency-scopes',
    importance: 'must-know',
    subsection: null,
    question: 'What are the Maven dependency scopes?',
    answer:
        '<p>A scope answers two questions at once: <strong>which classpaths does this appear on, ' +
        'and is it transitive?</strong></p>' +
        '<ul>' +
        '<li><strong><code>compile</code></strong> — the default. Everywhere, and transitive.</li>' +
        '<li><strong><code>provided</code></strong> — available at compile and test time, ' +
        '<strong>not packaged</strong>, because the runtime supplies it. The servlet API in a WAR ' +
        'is the classic case; Lombok is the modern one, since it is only needed by the compiler. ' +
        'Not transitive.</li>' +
        '<li><strong><code>runtime</code></strong> — <strong>not</strong> on the compile ' +
        'classpath, but packaged and present at run time. A JDBC driver: you code against ' +
        '<code>java.sql</code> and need the implementation only when it runs. Using this ' +
        'deliberately is a good signal, because it makes it impossible to accidentally import a ' +
        'driver class.</li>' +
        '<li><strong><code>test</code></strong> — test compile and test run only. Not ' +
        'transitive, which is why a library\'s test dependencies never reach you.</li>' +
        '<li><strong><code>import</code></strong> — only valid inside ' +
        '<code>&lt;dependencyManagement&gt;</code> on a POM. Pulls in another POM\'s managed ' +
        'versions. This is how a BOM works.</li>' +
        '<li><strong><code>system</code></strong> — a jar at a filesystem path. Deprecated, ' +
        'breaks reproducibility, do not use.</li>' +
        '</ul>' +
        '<p>The practical value: <strong>scope is how you keep things off the compile ' +
        'classpath</strong>, and keeping something off it is a real design constraint. A ' +
        'dependency on the compile classpath is one a developer can import by accident and a ' +
        'refactoring tool will suggest.</p>' +
        '<p>The Gradle mapping, since it is often the follow-up: <code>implementation</code> is ' +
        'compile-but-not-exposed-to-consumers, <code>api</code> is compile-and-exposed, ' +
        '<code>compileOnly</code> is <code>provided</code>, and <code>runtimeOnly</code> is ' +
        '<code>runtime</code>. The <code>api</code>/<code>implementation</code> split has no ' +
        'Maven equivalent and is genuinely useful — it stops a consumer compiling against your ' +
        'internal dependencies.</p>',
    referenceLinks: [
        { title: 'Maven — Dependency Scopes', url: 'https://maven.apache.org/guides/introduction/introduction-to-dependency-mechanism.html' }
    ],
    tags: ['maven', 'dependencies', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'nearest-wins-mediation',
    importance: 'must-know',
    subsection: null,
    question: 'Two dependencies pull in different versions of the same library. Which one wins?',
    answer:
        '<p>In Maven, <strong>the nearest one to your POM wins</strong> — shortest path in the ' +
        'dependency tree. Not the highest version. If two are at the same depth, the one declared ' +
        '<strong>first</strong> in the POM wins.</p>' +
        '<p>That is worth being emphatic about, because "Maven picks the newest" is a very common ' +
        'wrong answer, and it matters: nearest-wins can silently select an <em>older</em> version ' +
        'than a transitive dependency requires, which produces ' +
        '<code>NoSuchMethodError</code> or <code>NoClassDefFoundError</code> at run time — a ' +
        'compile-clean build that fails on a code path nobody exercised in testing.</p>' +
        '<p><strong>Gradle does the opposite</strong>: highest version wins by default. Neither ' +
        'is right in general — highest can break a caller relying on removed behaviour, nearest ' +
        'can be too old — and the real lesson is that <strong>letting it be resolved implicitly ' +
        'is the problem</strong>.</p>' +
        '<p>How to take control, in order:</p>' +
        '<ul>' +
        '<li><strong><code>&lt;dependencyManagement&gt;</code></strong> — pin the version ' +
        'explicitly. It overrides mediation for the whole tree and is the correct fix.</li>' +
        '<li><strong><code>&lt;exclusions&gt;</code></strong> — drop a transitive dependency ' +
        'entirely, when something brings in a library you supply another way.</li>' +
        '<li><strong>The enforcer plugin</strong> with <code>dependencyConvergence</code>, which ' +
        '<em>fails the build</em> when two paths disagree rather than resolving it quietly. This ' +
        'is the setting that converts a class of production incident into a build error.</li>' +
        '</ul>' +
        '<p>The diagnostic: <strong><code>mvn dependency:tree -Dverbose ' +
        '-Dincludes=com.example:thing</code></strong>, which shows every path to that artefact ' +
        'and marks the ones that were omitted for conflict, with the version that won.</p>',
    referenceLinks: [
        { title: 'Maven — Dependency Mediation', url: 'https://maven.apache.org/guides/introduction/introduction-to-dependency-mechanism.html' }
    ],
    tags: ['maven', 'dependencies', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: [
        {
            language: 'bash',
            title: 'Finding out which version actually won, and why',
            code:
                '# every path to one artefact, including the ones that lost\n' +
                'mvn dependency:tree -Dverbose -Dincludes=com.fasterxml.jackson.core:jackson-databind\n' +
                '\n' +
                '# what is on the classpath but never declared, and vice versa\n' +
                'mvn dependency:analyze',
            output: {
                kind: 'trace',
                lines: [
                    '[INFO] +- org.springframework.boot:spring-boot-starter-web:jar:3.4.1:compile',
                    '[INFO] |  \\- com.fasterxml.jackson.core:jackson-databind:jar:2.18.2:compile',
                    '[INFO] \\- com.example:legacy-client:jar:1.4.0:compile',
                    '[INFO]    \\- (com.fasterxml.jackson.core:jackson-databind:jar:2.9.0:compile',
                    '[INFO]       - omitted for conflict with 2.18.2)'
                ],
                explain:
                    '<p>Both paths are two deep, so the tie was broken by declaration order in ' +
                    'the POM. Reordering the two dependencies would silently change which ' +
                    'Jackson the application runs on — which is exactly the fragility ' +
                    'dependencyManagement removes.</p>'
            }
        }
    ]
},

{
    id: 'bom-and-dependency-management',
    importance: 'should-know',
    subsection: null,
    question: 'What is a BOM, and why does Spring Boot use one?',
    answer:
        '<p>A <strong>bill of materials</strong> is a POM that declares nothing but managed ' +
        'versions. Importing it means you can name a dependency without a version and get one ' +
        'that has been <strong>tested against everything else in the set</strong>.</p>' +
        '<p>That is the real value, and it is bigger than the convenience of shorter POMs. ' +
        '<code>spring-boot-dependencies</code> pins several hundred artefacts — Jackson, Hibernate, ' +
        'Tomcat, Micrometer, the Kafka client, SLF4J — to versions that were released together ' +
        'and integration tested together. Choosing them individually is a job nobody has time ' +
        'for, and the failure is not a compile error but a subtle runtime incompatibility.</p>' +
        '<p>Two ways to consume it:</p>' +
        '<ul>' +
        '<li><strong><code>spring-boot-starter-parent</code></strong> as the parent POM. Gets the ' +
        'versions plus sensible plugin configuration, resource filtering and a Java version ' +
        'property. Convenient, and it uses up your one parent slot.</li>' +
        '<li><strong>Importing the BOM</strong> — <code>spring-boot-dependencies</code> in ' +
        '<code>&lt;dependencyManagement&gt;</code> with <code>&lt;scope&gt;import&lt;/scope&gt;</code> ' +
        'and <code>&lt;type&gt;pom&lt;/type&gt;</code>. Versions only, and it leaves the parent ' +
        'free — which is what you need in a company with its own parent POM.</li>' +
        '</ul>' +
        '<p><strong>Overriding a managed version</strong> is a property with the parent — ' +
        '<code>&lt;jackson.version&gt;</code> — or a plain ' +
        '<code>&lt;dependencyManagement&gt;</code> entry with the import approach. Worth knowing ' +
        'and worth doing rarely: bumping one artefact out of a tested set is exactly the ' +
        'situation the BOM exists to prevent, and it is sometimes necessary for a CVE.</p>' +
        '<p>The general principle: <strong>a BOM turns "which versions work together" from ' +
        'per-project research into a single upgrade decision.</strong> That is why upgrading ' +
        'Spring Boot moves two hundred dependencies at once, and why doing it regularly in small ' +
        'steps is much cheaper than doing it every three years.</p>',
    referenceLinks: [
        { title: 'Spring Boot — Dependency Management', url: 'https://docs.spring.io/spring-boot/reference/using/build-systems.html' }
    ],
    tags: ['maven', 'spring-boot', 'dependencies'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'multi-module-projects',
    importance: 'should-know',
    subsection: null,
    question: 'When is a multi-module build worth it?',
    answer:
        '<p>When you want the <strong>dependency direction enforced by the compiler</strong>. ' +
        'That is the one benefit that a package structure cannot give you: if ' +
        '<code>domain</code> does not depend on <code>infrastructure</code>, then a domain class ' +
        'importing a JPA annotation <em>does not compile</em>. In a single module it compiles and ' +
        'nobody notices for a year.</p>' +
        '<p>The secondary benefits: independent versioning and publishing of a shared library, ' +
        'and faster incremental builds when only one module changed.</p>' +
        '<p>What it costs, and why it is not a default:</p>' +
        '<ul>' +
        '<li><strong>Navigation and refactoring get harder</strong> — moving a class between ' +
        'modules is a POM change as well as a package change.</li>' +
        '<li><strong>The build is slower for a full run</strong>, and IDE support for a large ' +
        'reactor is worse than for one module.</li>' +
        '<li><strong>Cyclic dependencies between modules are impossible</strong>, which is the ' +
        'point and is also occasionally very annoying.</li>' +
        '<li><strong>People create a module per layer</strong> — controller, service, repository ' +
        '— which enforces the boundary nobody was crossing and does nothing for the ones they ' +
        'were.</li>' +
        '</ul>' +
        '<p>The useful shape when it is justified is <strong>by feature or by hexagonal ' +
        'role</strong>, not by layer: an <code>application</code> module holding domain and use ' +
        'cases with no framework dependencies, and adapter modules for web and persistence that ' +
        'depend on it.</p>' +
        '<p>The alternative worth naming, because it gets most of the benefit for none of the ' +
        'cost: <strong>Spring Modulith</strong> or ArchUnit, which assert the same dependency ' +
        'rules <em>as a test</em> inside one module. A failing test is nearly as good as a ' +
        'failing compile, and it is far cheaper to change your mind about.</p>',
    referenceLinks: [
        { title: 'Maven — Introduction to the POM', url: 'https://maven.apache.org/guides/introduction/introduction-to-the-pom.html' }
    ],
    tags: ['maven', 'architecture', 'modularity'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'maven-versus-gradle',
    importance: 'should-know',
    subsection: null,
    question: 'Maven or Gradle?',
    answer:
        '<p>The genuine difference is <strong>declarative versus programmable</strong>, and every ' +
        'other comparison follows from it.</p>' +
        '<p><strong>Maven</strong> is a fixed lifecycle with plugins bound to phases, described in ' +
        'XML. You cannot express arbitrary logic, and that constraint is the feature: every Maven ' +
        'build in the world works the same way, so a new engineer can read one immediately and ' +
        '<code>mvn clean verify</code> does what it says in any project.</p>' +
        '<p><strong>Gradle</strong> is a build tool with a real language — Groovy or Kotlin — and ' +
        'a task graph. It can express anything, which means it can also express something ' +
        'nobody else can follow, and a Gradle build that has grown organically for five years is ' +
        'a codebase in its own right.</p>' +
        '<p>Where Gradle wins decisively: <strong>speed on a large project</strong>. Incremental ' +
        'compilation at task level, a build cache that can be shared across a team and CI, a ' +
        'daemon that stays warm, and configuration caching. On a big multi-module codebase the ' +
        'difference is minutes per build, every build, which compounds into real time.</p>' +
        '<p>Where Maven wins: <strong>predictability</strong>, better tooling for dependency ' +
        'analysis, and the fact that it is what most Java shops and most documentation assume.</p>' +
        '<p>The answer that shows judgement rather than allegiance: <strong>this is rarely a ' +
        'decision worth making twice.</strong> Migrating an existing build costs weeks and buys ' +
        'nothing a user sees. Choose Gradle for a large or polyglot codebase where build time is ' +
        'a real cost; choose Maven for a service where it is not, and either way put the effort ' +
        'into keeping the build boring rather than into which tool it uses.</p>',
    referenceLinks: [
        { title: 'Gradle — Build Cache', url: 'https://docs.gradle.org/current/userguide/build_cache.html' }
    ],
    tags: ['maven', 'gradle', 'build'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'dependency-vulnerabilities',
    importance: 'must-know',
    subsection: null,
    question: 'How do you know whether your dependencies have known vulnerabilities?',
    answer:
        '<p>By scanning continuously, in the pipeline, and by having a route to a fix that does ' +
        'not require a quarter\'s planning. Log4Shell is the reference case: the vulnerability ' +
        'was in a transitive dependency of a dependency, most affected teams did not know they ' +
        'had it, and the ones who recovered fastest were the ones who could already answer ' +
        '"where is this used" and could ship an upgrade the same day.</p>' +
        '<p>The tooling:</p>' +
        '<ul>' +
        '<li><strong>OWASP Dependency-Check</strong> — a Maven plugin that matches your ' +
        'dependencies against the National Vulnerability Database. Free, noisy with false ' +
        'positives, and it needs a suppression file that someone reviews.</li>' +
        '<li><strong>Dependabot or Renovate</strong> — automated pull requests for updates, ' +
        'security ones prioritised. The single highest-value thing to switch on, because it makes ' +
        'upgrading continuous rather than a project.</li>' +
        '<li><strong>Snyk, or a commercial scanner</strong> — better data and reachability ' +
        'analysis, which cuts the noise substantially.</li>' +
        '<li><strong>An SBOM</strong> — CycloneDX generates one at build time. That is what turns ' +
        '"are we affected by this morning\'s CVE" into a query rather than an investigation, and ' +
        'it is increasingly a procurement requirement.</li>' +
        '<li><strong>Container scanning</strong> — Trivy or Grype on the image, because the base ' +
        'image has an OS in it with its own CVEs.</li>' +
        '</ul>' +
        '<p>The practices that matter more than the tool:</p>' +
        '<ul>' +
        '<li><strong>Upgrade small and often.</strong> A project three years behind cannot apply ' +
        'a security patch quickly, because the patch is on a version four majors away. Currency ' +
        'is a security control.</li>' +
        '<li><strong>Fail the build on high severity</strong>, with an explicit, expiring ' +
        'suppression process for the ones you have assessed.</li>' +
        '<li><strong>Reduce the surface.</strong> The safest dependency is the one you did not ' +
        'add, and <code>mvn dependency:analyze</code> finds declared ones nothing uses.</li>' +
        '</ul>',
    referenceLinks: [
        { title: 'OWASP Dependency-Check', url: 'https://owasp.org/www-project-dependency-check/' }
    ],
    tags: ['security', 'dependencies', 'supply-chain', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'reproducible-builds',
    importance: 'good-to-know',
    subsection: null,
    question: 'What stops a build from being reproducible?',
    answer:
        '<p>Anything that lets the same source produce a different artefact on a different day. ' +
        'The offenders, in order of how often they are the cause:</p>' +
        '<ul>' +
        '<li><strong><code>-SNAPSHOT</code> dependencies.</strong> Resolved fresh from the ' +
        'remote repository, so today\'s build and yesterday\'s differ with no source change. Fine ' +
        'inside a team\'s own development loop; never in a release.</li>' +
        '<li><strong>Version ranges</strong> — <code>[1.0,2.0)</code>. Same problem, spelled ' +
        'differently, and worse because it can pick up a breaking change silently.</li>' +
        '<li><strong>Unpinned plugin versions.</strong> Maven will resolve the latest, so the ' +
        'build tooling itself drifts. Every plugin needs an explicit version, and the enforcer ' +
        'plugin can require it.</li>' +
        '<li><strong>Timestamps and ordering inside the jar.</strong> Even with identical inputs ' +
        'the bytes differ. <code>project.build.outputTimestamp</code> fixes the entry timestamps ' +
        'and is what makes a byte-identical jar possible.</li>' +
        '<li><strong>The environment</strong> — a different JDK, locale, or timezone. Pinned by ' +
        'the toolchain and by building in a container.</li>' +
        '</ul>' +
        '<p>Why it matters beyond tidiness: <strong>a reproducible build lets someone verify that ' +
        'a published artefact was produced from the published source.</strong> That is a supply ' +
        'chain control — the defence against a compromised build server inserting something ' +
        'nobody can see in the source. It is also what makes a build cache trustworthy, since ' +
        'caching depends on identical inputs producing identical outputs.</p>' +
        '<p>The everyday benefit is simpler: <strong>"it works on my machine" stops being a ' +
        'possible explanation.</strong> If the artefact is a function of the source, a difference ' +
        'in behaviour is a difference in input, and that is a much shorter investigation.</p>',
    referenceLinks: [
        { title: 'Maven — Reproducible Builds', url: 'https://maven.apache.org/guides/mini/guide-reproducible-builds.html' }
    ],
    tags: ['build', 'supply-chain'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'branching-and-merge-strategy',
    importance: 'should-know',
    subsection: null,
    question: 'What branching strategy would you use, and when do you rebase rather than merge?',
    answer:
        '<p><strong>Trunk-based development with short-lived branches</strong> for almost any ' +
        'team shipping continuously: branch from main, live for a day or two, merge back. The ' +
        'argument is not fashion — it is that <strong>merge pain grows superlinearly with branch ' +
        'age</strong>, and a branch open for three weeks is a guaranteed conflict resolution ' +
        'nobody can review properly.</p>' +
        '<p>GitFlow — long-lived develop, release and hotfix branches — makes sense when you ship ' +
        'versioned releases that customers install and must support several at once. Applying it ' +
        'to a service deployed twelve times a day adds ceremony and a permanent merge debt ' +
        'between develop and main.</p>' +
        '<p>The technique that makes short branches work when a change is genuinely large: ' +
        '<strong>feature flags</strong>. Merge the incomplete work behind a flag that is off. ' +
        'Deploy is decoupled from release, the branch never gets old, and turning the feature off ' +
        'is a faster rollback than any deploy.</p>' +
        '<p><strong>Rebase or merge.</strong> The rule that resolves the argument:</p>' +
        '<ul>' +
        '<li><strong>Rebase your own unpushed work</strong> to tidy it before review — squash the ' +
        '"fix typo" commits, reorder, and rebase onto the latest main so the branch applies ' +
        'cleanly. This makes history readable.</li>' +
        '<li><strong>Never rebase anything someone else has pulled.</strong> Rebasing rewrites ' +
        'commit ids, so everyone else\'s copy diverges and the next merge duplicates every ' +
        'commit. That is the actual hazard, and it is why the rule is about <em>shared</em> ' +
        'history rather than about which command is better.</li>' +
        '<li><strong>Merge to integrate.</strong> A merge commit records that these changes ' +
        'landed together, which is genuinely useful when reverting a feature.</li>' +
        '</ul>' +
        '<p>Squash-merging a pull request is the common compromise: a clean single commit on ' +
        'main, and the detail preserved in the pull request rather than in the history.</p>',
    referenceLinks: [
        { title: 'Git — Rebasing', url: 'https://git-scm.com/book/en/v2/Git-Branching-Rebasing' }
    ],
    tags: ['git', 'process', 'ways-of-working'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'code-review-that-works',
    importance: 'should-know',
    subsection: null,
    question: 'What makes a code review useful?',
    answer:
        '<p>Answering this well is mostly about knowing what a review is <em>for</em>, and it is ' +
        'not catching bugs — the compiler, the tests and the linter are better at that, and ' +
        'humans are known to be poor at spotting defects by reading. The value is elsewhere:</p>' +
        '<ul>' +
        '<li><strong>Is this the right change?</strong> Does it solve the problem, and is the ' +
        'approach one the team wants to live with?</li>' +
        '<li><strong>Will someone else be able to maintain it?</strong> The reviewer is the first ' +
        'person to read the code without the author\'s context, which is a test nothing else ' +
        'performs.</li>' +
        '<li><strong>Spreading knowledge.</strong> After review, two people know about this ' +
        'change.</li>' +
        '<li><strong>The things automation cannot see</strong> — a missing test for the ' +
        'interesting case, an error path that swallows a failure, an unbounded query, a ' +
        'missing authorisation check.</li>' +
        '</ul>' +
        '<p><strong>What makes reviews fail:</strong> pull requests too large to read — beyond ' +
        'about four hundred lines, review quality is known to fall off sharply, and beyond a ' +
        'thousand it becomes rubber-stamping; slow turnaround, which blocks the author and ages ' +
        'the branch; and bikeshedding about formatting, which a formatter should have settled ' +
        'before the review existed.</p>' +
        '<p><strong>As a reviewer:</strong> distinguish blocking from optional — prefixing ' +
        'comments with "nit:" is a small convention that removes a lot of friction; ask rather ' +
        'than assert, since "what happens if this is null" is better received and better ' +
        'reasoning than "this will NPE"; and approve with minor comments rather than holding a ' +
        'change hostage over preferences.</p>' +
        '<p><strong>As an author:</strong> keep it small, explain <em>why</em> in the description ' +
        'because the diff already shows what, and review your own diff first — most of what a ' +
        'reviewer would have said is visible to you if you look.</p>' +
        '<p>The disagreement question is a common follow-up, and the answer that lands is: ' +
        '<strong>argue once with reasons, then either convince or defer.</strong> If it is a ' +
        'correctness or security issue, escalate rather than defer. If it is a preference, the ' +
        'cost of being wrong is small and the cost of a stalled review is not.</p>',
    referenceLinks: [
        { title: 'Google Engineering Practices — Code Review', url: 'https://google.github.io/eng-practices/review/' }
    ],
    tags: ['process', 'ways-of-working', 'behavioural'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
}

    ]
};
