/* ==========================================================================
   data/theory/sets/predict-build-and-config.js — Predict, set 11 of 11

   Five puzzles, all artefact: 'behaviour'. The last set in the catalogue and
   the one whose subject is least often revised, which is exactly why it is
   asked: everybody has lost an afternoon to a transitive version they did not
   choose, and almost nobody can state the rule that chose it.

   THE MAVEN ONES ARE MAVEN 3, and the mediation rule they turn on — nearest
   definition wins, first declaration breaks a tie at equal depth — is a Maven
   rule and not a universal one. GRADLE PICKS THE HIGHEST VERSION INSTEAD,
   which is a genuinely different answer to the same question, and each entry
   says so rather than leaving a reader to carry the wrong rule to a Gradle
   codebase. Same discipline as the SQL set naming PostgreSQL 16.

   Nothing here was executed: there is no Maven repository resolution and no
   application context on the build machine. Each entry names the reference
   its answer came from.
   ========================================================================== */

const predictBuildAndConfigModule = {
    id: 'predict-build-and-config',
    trackId: 'output',
    order: 961,
    title: 'Build and Configuration',
    tagline: 'The version you did not choose, the scope that leaked, and the profile that was not active.',
    estimatedMinutes: 25,
    prerequisites: [],
    docHub: {
        title: 'Maven — Introduction to the dependency mechanism',
        url: 'https://maven.apache.org/guides/introduction/introduction-to-dependency-mechanism.html'
    },

    chapters: [
        {
            id: 'which-version-is-on-the-classpath',
            title: 'Which Version Is on the Classpath',
            importance: 'must-know',
            summary: 'Three ways a version gets decided, only one of which is the one you wrote down.',
            interviewAngle: 'Asked because it is the most common source of a NoSuchMethodError, and because the answer is a rule rather than an opinion.',
            buildsOn: [],
            blocks: [
                {
                    type: 'predict',
                    id: 'predict-build-and-config-which-transitive-version-wins',
                    importance: 'must-know',
                    artefact: 'behaviour',
                    language: 'xml',
                    title: 'The same library, two depths',
                    prompt: '<p>Maven 3. <code>commons-lang3</code> arrives twice: at depth 2 as 3.12.0 and at depth 3 as 3.14.0. Which is on the classpath?</p>',
                    code: '<!-- your pom -->\n<dependency> service-a  1.0 </dependency>   <!-- depth 1 -->\n<dependency> service-b  1.0 </dependency>   <!-- depth 1 -->\n\n<!-- service-a  -> commons-lang3 3.12.0            (depth 2) -->\n<!-- service-b  -> util-core 2.0 -> commons-lang3 3.14.0  (depth 3) -->',
                    options: [
                        '3.12.0 — Maven takes the nearest definition to the root, not the highest version',
                        '3.14.0 — the highest version wins',
                        'Both, in classpath order',
                        'The build fails with a version conflict'
                    ],
                    answer: 0,
                    verification: 'Read from the Maven documentation, "Introduction to the Dependency Mechanism", dependency-mediation section: nearest definition wins, and at equal depth the first declaration wins. Gradle resolves the same graph to 3.14.0 by its highest-version rule, which is noted in the explanation. Not executed here.',
                    output: {
                        kind: 'trace',
                        lines: [
                            '$ mvn dependency:tree',
                            '[INFO] com.example:app:jar:1.0',
                            '[INFO] +- com.example:service-a:jar:1.0:compile',
                            '[INFO] |  \\- org.apache.commons:commons-lang3:jar:3.12.0:compile',
                            '[INFO] \\- com.example:service-b:jar:1.0:compile',
                            '[INFO]    \\- com.example:util-core:jar:2.0:compile',
                            '[INFO]       \\- (org.apache.commons:commons-lang3:jar:3.14.0:compile',
                            '[INFO]           - omitted for conflict with 3.12.0)',
                            '',
                            'classpath: commons-lang3 3.12.0'
                        ],
                        explain: '<p>Maven mediates by <strong>distance from the root</strong>, and a tie at equal depth goes to whichever was declared first in the pom — so reordering two <code>&lt;dependency&gt;</code> elements can change what you ship. If <code>util-core</code> calls a method added in 3.14.0, you get a <code>NoSuchMethodError</code> at run time and a green build. <strong>Gradle answers the same question differently and picks 3.14.0</strong>, by highest version; neither is more correct, and carrying the Maven rule into a Gradle codebase is how people get this wrong twice. The fix in both is to state the version explicitly — in <code>dependencyManagement</code>, which is the next puzzle.</p>'
                    }
                },
                {
                    type: 'predict',
                    id: 'predict-build-and-config-bom-vs-explicit-version',
                    importance: 'should-know',
                    artefact: 'behaviour',
                    language: 'xml',
                    title: 'A BOM and a version tag disagreeing',
                    prompt: '<p>The Spring Boot parent manages <code>jackson-databind</code> at 2.17.1. The pom declares the dependency with an explicit <code>&lt;version&gt;2.15.0&lt;/version&gt;</code>. Which is used, and what has quietly changed?</p>',
                    code: '<parent>\n  <groupId>org.springframework.boot</groupId>\n  <artifactId>spring-boot-starter-parent</artifactId>\n  <version>3.3.0</version>          <!-- manages jackson-databind 2.17.1 -->\n</parent>\n\n<dependency>\n  <groupId>com.fasterxml.jackson.core</groupId>\n  <artifactId>jackson-databind</artifactId>\n  <version>2.15.0</version>          <!-- explicit -->\n</dependency>',
                    options: [
                        '2.15.0. An explicit version overrides dependencyManagement, and only this one artefact moves — the rest of the Jackson modules stay at 2.17.1',
                        '2.17.1. A managed version cannot be overridden',
                        '2.15.0, and all Jackson modules move with it',
                        'The build fails with a conflict'
                    ],
                    answer: 0,
                    verification: 'Read from the Maven documentation on dependencyManagement (a version declared on the dependency itself takes precedence) and the Spring Boot reference on overriding managed dependency versions. Not executed here.',
                    output: {
                        kind: 'trace',
                        lines: [
                            'jackson-databind        2.15.0   <-- explicit, wins',
                            'jackson-core            2.17.1   <-- still managed by the parent',
                            'jackson-annotations     2.17.1   <-- still managed by the parent',
                            'jackson-datatype-jsr310 2.17.1   <-- still managed by the parent',
                            '',
                            'A mixed Jackson: databind 2.15 against core 2.17.'
                        ],
                        explain: '<p>The explicit version wins, and that is the useful half. The dangerous half is that it wins <strong>for one artefact only</strong>, leaving a set of modules that were released and tested together now mismatched — which surfaces as a <code>NoClassDefFoundError</code> from an internal class, weeks later, on one code path. The right way to move a managed version is the property the BOM exposes: <code>&lt;jackson-bom.version&gt;2.15.0&lt;/jackson-bom.version&gt;</code> moves the whole family together. Overriding one artefact of a BOM is almost always a mistake, and the build will not tell you.</p>'
                    }
                },
                {
                    type: 'predict',
                    id: 'predict-build-and-config-test-scope-leaks-into-runtime',
                    importance: 'should-know',
                    artefact: 'behaviour',
                    language: 'xml',
                    title: 'A test-scoped dependency that is not test-scoped',
                    prompt: '<p><code>library-x</code> declares <code>assertj</code> at <code>compile</code> scope. Your pom depends on <code>library-x</code> and separately declares <code>assertj</code> as <code>test</code>. What is in the packaged jar?</p>',
                    code: '<!-- library-x pom -->\n<dependency>\n  <groupId>org.assertj</groupId>\n  <artifactId>assertj-core</artifactId>\n  <!-- no scope: defaults to compile -->\n</dependency>\n\n<!-- your pom -->\n<dependency> library-x        (compile) </dependency>\n<dependency> assertj-core    (test)    </dependency>',
                    options: [
                        'assertj is on the runtime classpath. Your test scope applies to your direct declaration; the transitive one from library-x stays compile',
                        'assertj is test-scoped, because your declaration wins everywhere',
                        'The build fails with a scope conflict',
                        'assertj is excluded automatically as a known test library'
                    ],
                    answer: 0,
                    verification: 'Read from the Maven documentation, "Introduction to the Dependency Mechanism", dependency-scope table: a compile-scoped transitive dependency remains compile in the consumer. Not executed here.',
                    output: {
                        kind: 'trace',
                        lines: [
                            '$ mvn dependency:tree -Dscope=runtime',
                            '[INFO] com.example:app:jar:1.0',
                            '[INFO] \\- com.example:library-x:jar:1.0:compile',
                            '[INFO]    \\- org.assertj:assertj-core:jar:3.25.3:compile   <-- shipped',
                            '',
                            'app.jar now contains a test assertion library.'
                        ],
                        explain: '<p>Scope is declared by the dependency that pulls something in, and your <code>test</code> declaration governs your direct edge, not <code>library-x</code>\'s. So a library with a mis-scoped dependency ships that dependency into every consumer — extra megabytes, extra classes on the classpath, and an extra thing for a vulnerability scanner to find. <strong>The fix is an <code>&lt;exclusion&gt;</code> on <code>library-x</code></strong>, and the prevention is to run <code>mvn dependency:tree</code> against the runtime scope before a release rather than trusting the pom to describe what ships.</p>'
                    }
                }
            ],
            docs: [
                { title: 'Maven — Dependency mechanism and scopes', url: 'https://maven.apache.org/guides/introduction/introduction-to-dependency-mechanism.html', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'configuration-that-did-not-apply',
            title: 'Configuration That Did Not Apply',
            importance: 'must-know',
            summary: 'A profile that was set and ignored, and an annotation that generates code nobody read.',
            interviewAngle: 'Both are cases where the source looks right and the running system disagrees, which is the shape of most real configuration incidents.',
            buildsOn: ['which-version-is-on-the-classpath'],
            blocks: [
                {
                    type: 'predict',
                    id: 'predict-build-and-config-profile-not-active-why',
                    importance: 'must-know',
                    artefact: 'behaviour',
                    language: 'bash',
                    title: 'The profile was set. Twice.',
                    prompt: '<p>Both of these are in place at once. Which profile or profiles are active?</p>',
                    code: '# in src/main/resources/application.yaml\n#   spring.profiles.active: dev\n\n# in the container environment\nexport SPRING_PROFILES_ACTIVE=prod\n\n# and the pom has a Maven profile with the same name\n#   <profiles><profile><id>prod</id> ... </profile></profiles>\n#   activated with: mvn -Pprod package',
                    options: [
                        'prod only. spring.profiles.active is a property like any other, so the environment variable replaces the YAML value — it does not add to it. The Maven profile is unrelated and affects only the build',
                        'dev and prod, because both were set',
                        'dev, because the file is more specific',
                        'prod, and the Maven profile is what activated it'
                    ],
                    answer: 0,
                    verification: 'Read from the Spring Boot reference, "Profiles" and "Externalized Configuration" — spring.profiles.active follows normal property precedence and is replaced, not merged — and the Maven documentation on build profiles, which have no relationship to Spring profiles. Not executed here.',
                    output: {
                        kind: 'trace',
                        lines: [
                            'The following 1 profile is active: "prod"',
                            '',
                            '-- SPRING_PROFILES_ACTIVE replaced the YAML value outright.',
                            '-- application-dev.yaml is NOT loaded.',
                            '-- The Maven profile named prod decided what went into the jar',
                            '   at build time and has no runtime effect whatsoever.'
                        ],
                        explain: '<p>Two independent traps in one answer. The first is that <code>spring.profiles.active</code> obeys ordinary property precedence — a later source <em>replaces</em> it rather than adding to it, which is why setting it in a file and in the environment gives you one profile and not two. Use <code>spring.profiles.include</code> when you want additive behaviour. <strong>The second is that a Maven profile and a Spring profile share nothing but a word.</strong> <code>-Pprod</code> changes what is compiled and packaged; it does not activate anything at run time, and the two having the same name is how an afternoon disappears.</p>'
                    }
                },
                {
                    type: 'predict',
                    id: 'predict-build-and-config-lombok-data-on-an-entity-breaks-a-hashset',
                    importance: 'must-know',
                    artefact: 'behaviour',
                    language: 'java',
                    title: 'What @Data generated',
                    prompt: '<p><code>@Data</code> on a JPA entity with a lazy association. Two things go wrong. What are they?</p>',
                    code: '@Data                      // generates equals, hashCode, toString\n@Entity\nclass Order {\n    @Id @GeneratedValue Long id;\n    String reference;\n\n    @OneToMany(mappedBy = "order", fetch = FetchType.LAZY)\n    private List<OrderLine> lines;\n}',
                    options: [
                        'equals and hashCode use every field including the lazy collection, so both an unsaved entity in a HashSet and any toString trigger loading or misbehave',
                        'Nothing; @Data is the recommended annotation for entities',
                        'Only toString is a problem',
                        'It fails to compile, because @Data conflicts with @Entity'
                    ],
                    answer: 0,
                    verification: 'Read from the Project Lombok documentation for @Data (equals, hashCode and toString include all non-static fields by default) combined with the Hibernate 6 user guide on lazy loading outside a session. Not executed here: it requires a persistence context.',
                    output: {
                        kind: 'trace',
                        lines: [
                            '-- generated hashCode() reads id, reference AND lines',
                            '',
                            'new Order() added to a HashSet: hashCode with id == null',
                            'repository.save(order): id assigned',
                            'set.contains(order) -> false        (the Phase-8 JPA puzzle again)',
                            '',
                            'log.debug("saved {}", order):',
                            '  org.hibernate.LazyInitializationException: failed to lazily',
                            '  initialize a collection of role: Order.lines',
                            '',
                            '-- or, inside a transaction, a silent extra SELECT per log line.'
                        ],
                        explain: '<p><code>@Data</code> includes every non-static field in all three generated methods, which is right for a DTO and wrong for an entity. The <code>hashCode</code> half is the mutable-identity bug from the JPA set arriving through a different door. The <code>toString</code> half is worse in one respect — it is triggered by <em>logging</em>, so it fails in a code path nobody tested and it can fire an extra query per log statement in the paths where it does not fail. <strong>Use <code>@Getter</code> and <code>@Setter</code> on entities and write <code>equals</code>, <code>hashCode</code> and <code>toString</code> by hand</strong>, or exclude the associations explicitly. Generated code you did not read is still code you shipped.</p>'
                    }
                }
            ],
            docs: [
                { title: 'Spring Boot — Profiles', url: 'https://docs.spring.io/spring-boot/reference/features/profiles.html', kind: 'guide' }
            ],
            relatedQuestions: []
        }
    ]
};
