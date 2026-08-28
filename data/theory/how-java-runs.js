/* ==========================================================================
   data/theory/how-java-runs.js — module 1 in the reading path

   The first module, and deliberately the smallest. It exists to install four
   words the rest of the corpus uses without explaining: JDK, JVM, bytecode,
   JIT. Everything after this assumes them.
   ========================================================================== */

const howJavaRunsModule = {
    id: 'how-java-runs',
    trackId: 'java-platform',
    order: 1,
    title: 'How Java Runs',
    tagline: 'JDK, JVM, bytecode, JIT, and why any of it matters in an interview.',
    estimatedMinutes: 25,
    prerequisites: [],
    docHub: { title: 'The Java Virtual Machine Specification', url: 'https://docs.oracle.com/javase/specs/jvms/se21/html/index.html' },

    chapters: [
        {
            id: 'jdk-jre-jvm',
            title: 'JDK, JRE and JVM',
            importance: 'must-know',
            summary: 'Three names for three different things, asked in almost every screening round and answered vaguely in most of them.',
            interviewAngle: 'This is a filter question, not a knowledge question. The interviewer already knows the answer and is checking whether you can define a term precisely under no pressure at all. A vague answer here colours everything after it, and a crisp one takes eleven seconds.',
            buildsOn: [],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>Java separates <strong>the thing you build with</strong>, <strong>the thing you ship to</strong>, and <strong>the thing that executes</strong>. Most people can name all three and describe none of them, which is exactly what the question is testing.</p>'
                },
                {
                    type: 'types',
                    title: 'The three, in one line each',
                    items: [
                        { name: 'JVM', html: '<p>A <em>specification</em> for an abstract machine, and any implementation of it. It loads class files, verifies them, and executes bytecode. HotSpot is the implementation you almost certainly use; OpenJ9 and GraalVM are others.</p>' },
                        { name: 'JRE', html: '<p>A JVM plus the standard class library — enough to <em>run</em> a program but not to compile one. No <code>javac</code>.</p>' },
                        { name: 'JDK', html: '<p>A JRE plus the development tools: <code>javac</code>, <code>javap</code>, <code>jar</code>, <code>jshell</code>, <code>jlink</code>, <code>jcmd</code> and the rest. This is what you install.</p>' }
                    ]
                },
                {
                    type: 'definition',
                    term: 'Bytecode',
                    important: true,
                    html: '<p>The instruction set the JVM executes: a stack-based, platform-independent encoding produced by <code>javac</code> and stored in a <code>.class</code> file. It is <strong>not</strong> machine code and it is <strong>not</strong> interpreted forever — see the JIT chapter.</p>'
                },
                {
                    type: 'diagram',
                    diagramType: 'flowchart',
                    caption: 'Compile once, on your machine. Choose a target once, on theirs.',
                    diagramConfig: {
                        title: 'From source to machine code',
                        nodes: [
                            { id: 'src', label: 'Hello.java', kind: 'start' },
                            { id: 'javac', label: 'javac', kind: 'actor' },
                            { id: 'cls', label: 'Hello.class (bytecode)', kind: 'step' },
                            { id: 'jvm', label: 'JVM loads and verifies', kind: 'actor' },
                            { id: 'interp', label: 'Interpreter runs it', kind: 'step' },
                            { id: 'jit', label: 'JIT compiles the hot parts', kind: 'step' },
                            { id: 'native', label: 'Machine code for THIS CPU', kind: 'fix' }
                        ],
                        edges: [
                            { from: 'src', to: 'javac' },
                            { from: 'javac', to: 'cls' },
                            { from: 'cls', to: 'jvm' },
                            { from: 'jvm', to: 'interp' },
                            { from: 'interp', to: 'jit', label: 'gets hot' },
                            { from: 'jit', to: 'native' }
                        ]
                    }
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>"You download a JRE for production."</strong> You have not been able to do that from Oracle since Java 8. From Java 9 the platform is modular, and the supported way to produce a runtime-only image is <code>jlink</code> — which builds a JRE containing only the modules your application actually uses. In practice most teams ship a full JDK in a container and never think about it. Saying "download the JRE" in 2026 dates your answer by a decade.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Answer it as a containment relationship and stop: <em>"The JVM executes bytecode. The JRE is the JVM plus the standard library — enough to run. The JDK is the JRE plus the compiler and tools — what you develop with. JDK contains JRE contains JVM."</em> Then wait. If they want depth they will ask for it, and the next question is usually about the JIT.</p>'
                }
            ],
            docs: [
                { title: 'The Java Virtual Machine Specification, Java SE 21', url: 'https://docs.oracle.com/javase/specs/jvms/se21/html/index.html', kind: 'spec' },
                { title: 'JEP 220: Modular Run-Time Images', url: 'https://openjdk.org/jeps/220', kind: 'spec' }
            ],
            relatedQuestions: []
        },

        {
            id: 'compile-and-classfile',
            title: 'What javac Actually Produces',
            importance: 'should-know',
            summary: 'A class file is a described, versioned, verifiable format — which is why "write once, run anywhere" is a property of the format rather than a slogan.',
            interviewAngle: 'Rarely asked directly. Asked constantly by implication: every question about erasure, about reflection, about why a Lombok annotation works, and about UnsupportedClassVersionError is a question about what is and is not in the class file.',
            buildsOn: ['jdk-jre-jvm'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p><code>javac</code> does far less than people assume. It type-checks, it desugars a handful of language features, and it writes a class file. It does <strong>no</strong> optimisation worth the name — no inlining, no loop unrolling, no dead-code elimination beyond the trivial. Every optimisation that matters happens later, at runtime, in the JIT, where the actual execution profile is known.</p><p>This is the single most useful thing to understand about the pipeline, because it explains why a Java microbenchmark that does not warm up measures nothing.</p>'
                },
                {
                    type: 'types',
                    title: 'What is inside a class file',
                    items: [
                        { name: 'Magic and version', html: '<p><code>0xCAFEBABE</code>, then a major and minor version. The major version is the thing behind <code>UnsupportedClassVersionError</code>.</p>' },
                        { name: 'Constant pool', html: '<p>Every string literal, class name, method name and descriptor the class refers to, by index. Bytecode instructions reference the pool rather than embedding values.</p>' },
                        { name: 'Fields and methods', html: '<p>Names, descriptors, access flags, and for each method a <code>Code</code> attribute holding the bytecode, the maximum stack depth and the local-variable count.</p>' },
                        { name: 'Attributes', html: '<p>Where the optional information lives: <code>Signature</code> (which is how generic type information survives erasure for reflection), <code>RuntimeVisibleAnnotations</code>, <code>LineNumberTable</code>, <code>BootstrapMethods</code> for <code>invokedynamic</code>.</p>' }
                    ]
                },
                {
                    type: 'table',
                    title: 'Class file major version by release',
                    headers: ['Java release', 'Major version', 'Note'],
                    rows: [
                        ['Java 8', '52', 'Still the floor for a great deal of production code'],
                        ['Java 11', '55', 'First LTS with the module system in general use'],
                        ['Java 17', '61', 'Spring Boot 3 baseline'],
                        ['Java 21', '65', 'Virtual threads; the common target today'],
                        ['Java 25', '69', 'Current LTS']
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Three lines of source',
                    code: 'public class Hello {\n    public static void main(String[] args) {\n        System.out.println("Hello");\n    }\n}',
                    notes: '<p>Compiled and disassembled with <code>javap -c Hello</code>, the body of <code>main</code> is four instructions: <code>getstatic</code> to push <code>System.out</code>, <code>ldc</code> to push the string constant, <code>invokevirtual</code> to call <code>println</code>, <code>return</code>. The constant-pool indices printed beside them differ between compiler versions, which is exactly why they are described here rather than reproduced.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong><code>UnsupportedClassVersionError</code> is not a dependency problem.</strong> It means a class file was compiled for a newer JVM than the one loading it — a 61 on a 55. Newer JVMs read older class files happily; the reverse never works. When it appears in CI and not locally, the two are running different JDKs, and <code>--release</code> rather than <code>-source</code>/<code>-target</code> is the flag that prevents it: <code>--release 17</code> also restricts you to the Java 17 API, whereas <code>-target 17</code> will happily compile a call to a method that does not exist there.</p>'
                }
            ],
            docs: [
                { title: 'The class File Format (JVMS chapter 4)', url: 'https://docs.oracle.com/javase/specs/jvms/se21/html/jvms-4.html', kind: 'spec' },
                { title: 'javac reference', url: 'https://docs.oracle.com/en/java/javase/21/docs/specs/man/javac.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'java-language', questionId: 'type-erasure' }
            ]
        },

        {
            id: 'jit-and-tiered-compilation',
            title: 'The JIT, and Why Warmup Is Real',
            importance: 'must-know',
            summary: 'Java starts slow and gets fast. The mechanism explains benchmarks, first-request latency, and half of what people call "JVM tuning".',
            interviewAngle: 'The follow-up to the JDK/JRE/JVM question, and the one that separates a candidate who has read about Java from one who has watched it run. If you can say why the first thousand requests are slower than the next thousand, and what you would actually do about it, you are answering a production question rather than a trivia one.',
            buildsOn: ['jdk-jre-jvm', 'compile-and-classfile'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>The JVM begins by <strong>interpreting</strong> bytecode, which is slow but starts instantly and requires no analysis. While interpreting, it counts: how often each method is called, how often each loop goes round, which concrete type actually turns up at each call site. When a method crosses a threshold, it is handed to a compiler that turns it into machine code for the CPU it is running on right now — using the profile it just gathered.</p><p>That last clause is why a JIT can beat an ahead-of-time compiler. An AOT compiler must be correct for every possible execution; a JIT only has to be correct for <em>this</em> one, and it can undo the assumption later if it turns out to be wrong.</p>'
                },
                {
                    type: 'definition',
                    term: 'Tiered compilation',
                    important: true,
                    html: '<p>HotSpot\'s default strategy of using two compilers rather than one. <strong>C1</strong> compiles quickly and produces mediocre code with profiling counters in it; <strong>C2</strong> compiles slowly and produces excellent code using those counters. Code moves from the interpreter, through C1, to C2 as it proves itself worth the compilation cost.</p>'
                },
                {
                    type: 'diagram',
                    diagramType: 'animation',
                    diagramConfig: {
                        title: 'The life of a hot method',
                        steps: [
                            { label: 'Interpreted', caption: 'Runs immediately, counts invocations' },
                            { label: 'C1 compiled', caption: 'Fast to compile, still profiling' },
                            { label: 'C2 compiled', caption: 'Slow to compile, optimised on the profile' },
                            { label: 'Deoptimised', caption: 'An assumption broke; back to the interpreter' }
                        ]
                    }
                },
                {
                    type: 'types',
                    title: 'What the JIT does that javac cannot',
                    items: [
                        { name: 'Inlining', html: '<p>The enabling optimisation. Once a small method is inlined into its caller, everything else — constant folding, escape analysis, dead-code removal — becomes possible across what used to be a call boundary. This is why "getters are free" is true at runtime and false in the class file.</p>' },
                        { name: 'Monomorphic dispatch', html: '<p>An interface call whose receiver has only ever been one concrete class is compiled to a direct call with a type guard, not a virtual dispatch. Most Spring calls through an interface cost nothing at all for this reason.</p>' },
                        { name: 'Escape analysis', html: '<p>An object that provably never leaves the method may have its fields kept in registers and never be allocated on the heap at all.</p>' },
                        { name: 'On-stack replacement', html: '<p>A long-running loop can be swapped for compiled code <em>while it is still executing</em>, without waiting for the method to be re-entered.</p>' },
                        { name: 'Deoptimisation', html: '<p>The counterpart to all of the above. When a speculative assumption breaks — a second implementation of that interface finally appears — the compiled code is discarded and execution falls back to the interpreter. Correctness is never traded for speed.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>The benchmark that measures nothing.</strong> A loop timed with <code>System.nanoTime()</code> on the first ten thousand iterations measures the interpreter, the C1 compiler and possibly the garbage collector, in unknown proportions. Worse, a JIT that can prove a result is never used may remove the work entirely. Use JMH, which handles warmup, dead-code elimination and fork isolation, and treat any hand-rolled Java microbenchmark — including one in an interview answer — as a number with no meaning.</p>'
                },
                {
                    type: 'prose',
                    html: '<p>The production consequence is <strong>first-request latency</strong>. A freshly started service is running interpreted code down every path no request has taken yet, so the p99 of the first minute after a deploy is not the p99 of the service. Rolling deploys interact badly with this: if the load balancer sends full traffic to a pod the moment its readiness probe passes, that pod is slow at exactly the moment it is measured. The usual mitigations are a warmup request in the readiness path, a slower rollout, or accepting it and excluding the window from the alert.</p>'
                },
                {
                    type: 'version',
                    title: 'Startup: what has changed, and what is coming',
                    items: [
                        { version: 'Java 8 → 21', state: 'was', html: '<p>Interpret, then C1, then C2, every time the process starts. Class-Data Sharing (CDS) could pre-parse the JDK\'s own classes, and application CDS extended that to yours, but the profile was thrown away on every exit.</p>' },
                        { version: 'Java 24', state: 'changed', html: '<p>JEP 483 added ahead-of-time class loading and linking: a training run records the loaded and linked classes into an AOT cache that later runs start from. Loading and linking, not compiling — the JIT still does its work.</p>' },
                        { version: 'Java 25', state: 'is', html: '<p>JEP 514 simplified the command line for that cache to a single step, and JEP 515 added AOT <em>method profiling</em>, so a new JVM can begin with the profile a previous run gathered rather than an empty one.</p>' },
                        { version: 'GraalVM Native Image', state: 'preview', html: '<p>A different bargain entirely: compile everything ahead of time, ship a native executable, start in milliseconds — and give up the JIT, so peak throughput on a long-running service is usually lower. Worth it for functions and CLIs, rarely for a service that runs for weeks.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>The sentence that lands: <em>"The JVM interprets first and compiles what proves hot, using the profile it gathered while interpreting — so it can specialise on types that an ahead-of-time compiler would have to be conservative about. The cost is warmup, which shows up as first-request latency after a deploy."</em> That answers the question and names the production symptom, which is what the question was really about.</p>'
                }
            ],
            docs: [
                { title: 'JEP 483: Ahead-of-Time Class Loading & Linking', url: 'https://openjdk.org/jeps/483', kind: 'spec' },
                { title: 'JEP 515: Ahead-of-Time Method Profiling', url: 'https://openjdk.org/jeps/515', kind: 'spec' },
                { title: 'JMH — the Java Microbenchmark Harness', url: 'https://github.com/openjdk/jmh', kind: 'sample' }
            ],
            relatedQuestions: [
                { topicId: 'spring-boot', questionId: 'native-image-tradeoffs' }
            ]
        },

        {
            id: 'jvm-vs-jre-question',
            title: 'Answering the Platform Question Well',
            importance: 'should-know',
            summary: 'The same four facts, arranged for a screening call, a round-three deep dive and a follow-up you did not expect.',
            interviewAngle: 'Every candidate at this level knows these words. The differentiator is shape: a two-sentence answer that invites the right follow-up, rather than a four-minute recitation that answers a question nobody asked.',
            buildsOn: ['jdk-jre-jvm', 'jit-and-tiered-compilation'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>The failure mode at three to seven years of experience is almost never ignorance. It is <strong>shape</strong>: answering at the wrong length, in the wrong order, or answering the question you prepared instead of the one you were asked. This chapter is about shape, and the pattern generalises to every stock question in this deck.</p>'
                },
                {
                    type: 'comparison',
                    title: 'The same question, two rooms',
                    left: 'Screening call',
                    right: 'Round-three deep dive',
                    rows: [
                        { aspect: 'What is being checked', left: 'Can you define a term precisely and briefly', right: 'Do you know what happens at runtime, and have you seen it' },
                        { aspect: 'Right length', left: 'Two sentences', right: 'Two sentences, then follow where they lead' },
                        { aspect: 'Open with', left: 'The containment relationship', right: 'The containment relationship — still' },
                        { aspect: 'Then', left: 'Stop', right: 'Interpretation, profiling, tiered compilation, deoptimisation' },
                        { aspect: 'Where it goes next', left: 'Usually nowhere; it was a filter', right: 'Warmup, first-request latency, and what you did about it' },
                        { aspect: 'The losing move', left: 'Rambling about GraalVM unprompted', right: 'Stopping at "the JIT makes it faster"' }
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>Two habits carry most of the benefit. <strong>Answer the literal question first</strong>, then offer the depth — "JDK contains JRE contains JVM. Happy to go into what the JVM does at runtime if that is useful?" hands the interviewer control and costs you nothing. And <strong>name the production consequence</strong> whenever one exists: an answer that ends at a mechanism is a textbook, and an answer that ends at a symptom you have debugged is experience.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>The rehearsed monologue.</strong> An interviewer who asks a thirty-second question and receives four minutes learns two things, and only one of them is about Java. It also costs you the follow-ups, which are where the marks actually are — you cannot be asked a good question if you are still answering the previous one.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>When you genuinely do not know: say so, then say what you would do. <em>"I have not tuned the compiler thresholds directly — I have only ever dealt with warmup by shaping the rollout. If I had to, I would start with <code>-XX:+PrintCompilation</code> to see what is actually being compiled."</em> This scores well. Guessing scores badly, and every experienced interviewer can tell the difference immediately.</p>'
                }
            ],
            docs: [
                { title: 'HotSpot Virtual Machine Garbage Collection Tuning Guide', url: 'https://docs.oracle.com/en/java/javase/21/gctuning/index.html', kind: 'guide' }
            ],
            relatedQuestions: []
        }
    ]
};
