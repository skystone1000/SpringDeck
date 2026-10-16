/* ==========================================================================
   data/theory/jvm-diagnostics.js — module 24 in the reading path

   Nine chapters, and this one is a reference as much as a curriculum: the
   commands are here because the question "what would you actually run"
   has a wrong answer, which is naming a GUI you cannot install on a
   production host.
   ========================================================================== */

const jvmDiagnosticsModule = {
    id: 'jvm-diagnostics',
    trackId: 'java-platform',
    order: 24,
    title: 'Reading a Production JVM',
    tagline: 'Class loading, Metaspace, leaks, and the commands you run at 2 a.m.',
    estimatedMinutes: 45,
    prerequisites: ['heap-and-gc'],
    docHub: { title: 'Java Platform, Standard Edition Troubleshooting Guide', url: 'https://docs.oracle.com/en/java/javase/21/troubleshoot/index.html' },

    chapters: [
        {
            id: 'classloader-hierarchy',
            title: 'The Class Loader Hierarchy',
            importance: 'should-know',
            summary: 'Three built-in loaders, parent-first delegation, and a rule that explains both why you cannot override java.lang.String and why two identical classes can be incompatible.',
            interviewAngle: 'Asked directly in Java-platform rounds, and it underlies three other answers: NoClassDefFoundError against ClassNotFoundException, ClassCastException between identical classes, and how an application server isolates deployments.',
            buildsOn: [],
            blocks: [
                {
                    type: 'types',
                    title: 'The three loaders, from Java 9 onward',
                    items: [
                        { name: 'Bootstrap', html: '<p>Loads <code>java.base</code> and the core platform classes. Written in native code, so <code>String.class.getClassLoader()</code> returns <code>null</code> — that null is the bootstrap loader, not an error.</p>' },
                        { name: 'Platform', html: '<p>Loads the rest of the JDK modules. Called the <em>extension</em> loader before Java 9, when it read a directory that no longer exists.</p>' },
                        { name: 'Application (system)', html: '<p>Loads your classes from the class path or module path. This is what <code>getClass().getClassLoader()</code> returns in application code.</p>' }
                    ]
                },
                {
                    type: 'definition',
                    term: 'Parent delegation',
                    important: true,
                    html: '<p>Before loading a class itself, a loader asks its parent. Only if every ancestor fails does it try. The consequence is that a class defined closest to the bootstrap loader wins, which is why a <code>java.lang.String</code> on your class path is silently ignored rather than loaded — the security property the model exists for.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Class identity is the pair (fully-qualified name, defining loader), not the name.</strong> The same <code>com.acme.Order</code> loaded by two different loaders produces two classes that are not assignable to each other, and the resulting message reads <code>ClassCastException: com.acme.Order cannot be cast to com.acme.Order</code> — which looks like a JVM bug and is not. Anywhere with plugin loaders, hot reload, or a servlet container hosting two applications, this is the explanation.</p>'
                },
                {
                    type: 'comparison',
                    title: 'The two errors people conflate',
                    left: 'ClassNotFoundException',
                    right: 'NoClassDefFoundError',
                    rows: [
                        { aspect: 'Kind', left: 'A checked <code>Exception</code>', right: 'An <code>Error</code>' },
                        { aspect: 'Raised when', left: 'An explicit lookup — <code>Class.forName</code>, <code>loadClass</code> — finds nothing', right: 'A class referenced by compiled code is absent at link time' },
                        { aspect: 'Usually means', left: 'A driver or plugin name is wrong, or the jar is missing', right: 'The class path differs between compile and run' },
                        { aspect: 'The subtle case', left: '—', right: '<strong>The class was found, but its static initialiser threw.</strong> The first failure is <code>ExceptionInInitializerError</code>; every attempt after that is <code>NoClassDefFoundError</code>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>That last row is the one worth remembering, because it inverts the debugging: a <code>NoClassDefFoundError</code> for a class you can see in the jar means you are looking at the <em>second</em> failure. Find the <code>ExceptionInInitializerError</code> earlier in the log — that one has the real cause.</p>'
                }
            ],
            docs: [
                { title: 'ClassLoader', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/ClassLoader.html', kind: 'api' }
            ],
            relatedQuestions: []
        },

        {
            id: 'metaspace-and-its-oom',
            title: 'Metaspace',
            importance: 'should-know',
            summary: 'Class metadata moved out of the heap in Java 8. The fixed-size failure became an unbounded one, which is better in development and worse in a container.',
            interviewAngle: 'A reliable question for anyone claiming Java 8 experience: what replaced PermGen and what changed. The answer that goes further notes that "unlimited by default" turns a Java error into a container kill.',
            buildsOn: ['classloader-hierarchy'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'PermGen against Metaspace',
                    left: 'PermGen (to Java 7)',
                    right: 'Metaspace (Java 8 onward)',
                    rows: [
                        { aspect: 'Lives in', left: 'The heap, as a fixed region', right: '<strong>Native memory</strong>' },
                        { aspect: 'Default size', left: '64MB or so, fixed', right: '<strong>Unbounded</strong>' },
                        { aspect: 'Sized by', left: '<code>-XX:MaxPermSize</code>', right: '<code>-XX:MaxMetaspaceSize</code>, unset by default' },
                        { aspect: 'When it fills', left: '<code>OutOfMemoryError: PermGen space</code>', right: '<code>OutOfMemoryError: Metaspace</code> — <em>if</em> a limit was set' },
                        { aspect: 'With no limit set', left: 'n/a', right: 'Grows until the OS or cgroup kills the process' },
                        { aspect: 'Also holds', left: 'Interned strings, static fields', right: 'Neither — both moved to the heap in Java 7 and 8' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Set <code>-XX:MaxMetaspaceSize</code> in a container even though you do not want to hit it.</strong> Without it, a class-loading leak consumes native memory until the cgroup kills the process — exit code 137, no <code>OutOfMemoryError</code>, no heap dump, nothing in the application log. With it, you get a Java error naming Metaspace, which is a diagnosis rather than a mystery. Somewhere around 256–512MB is generous for a typical Spring service; the point is having a ceiling, not the number.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Metaspace grows with the number of <em>loaded classes</em>, and a Spring Boot application loads a great many — proxies, generated configuration classes, Hibernate entity enhancements. Growth during startup is expected. Growth in steady state is a leak, and the next chapter is about the only kind there is.</p>'
                }
            ],
            docs: [
                { title: 'JEP 122: Remove the Permanent Generation', url: 'https://openjdk.org/jeps/122', kind: 'spec' }
            ],
            relatedQuestions: []
        },

        {
            id: 'classloader-leaks',
            title: 'The Class Loader Leak',
            importance: 'good-to-know',
            summary: 'A loader is kept alive by any one of its classes, and a class is kept alive by anything holding it. One stray reference retains an entire application.',
            interviewAngle: 'Comes up with hot redeploy, plugin architectures and application servers. The mechanism is worth being able to state, because the fix is never "add a null" — it is unregistering something at shutdown.',
            buildsOn: ['metaspace-and-its-oom'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>A class loader is reachable from every class it defined, and every class is reachable from every instance of it. So a single object created by the application, referenced from anywhere outside it, retains: that object, its class, the loader, <em>every other class the loader defined</em>, and all their static fields. Redeploy ten times and there are ten copies of the application in Metaspace, none of them reachable by any code that is running.</p>'
                },
                {
                    type: 'types',
                    title: 'The four references that cause nearly all of them',
                    items: [
                        { name: 'A ThreadLocal on a container thread', html: '<p>The thread belongs to the container and outlives the application; the value belongs to the application. Nothing collects it because the thread is a GC root. This is the most common one by a wide margin.</p>' },
                        { name: 'A JDBC driver registered with DriverManager', html: '<p><code>DriverManager</code> is loaded by the bootstrap loader and holds a static list. A driver registered from a web application and never deregistered pins the whole application.</p>' },
                        { name: 'A shutdown hook, or a running thread', html: '<p>Both are roots. A thread the application started and never stopped keeps everything alive by definition.</p>' },
                        { name: 'A logging or JMX registration', html: '<p>Anything registering a listener or an MBean into a container-level registry. The registry is longer-lived than the registrant, and nobody unregisters.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>Every one of the four has the same shape and the same fix: something long-lived is holding something short-lived, and the short-lived side has to remove itself. In Spring, that is <code>@PreDestroy</code> or a <code>DisposableBean</code>. If you only remember one instance, remember the <code>ThreadLocal</code> — and that <code>remove()</code> belongs in a <code>finally</code>.</p>'
                }
            ],
            docs: [
                { title: 'Tomcat — Memory Leak Protection', url: 'https://tomcat.apache.org/tomcat-10.1-doc/config/listeners.html', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'outofmemoryerror-varieties',
            title: 'The OutOfMemoryError Messages',
            importance: 'must-know',
            summary: 'Six different messages, six different causes, and only two of them are about the heap. The text after the colon is the entire diagnosis.',
            interviewAngle: 'Asked as "you get an OutOfMemoryError in production, what do you do". The answer that immediately separates candidates is asking which one — because "unable to create native thread" and "Java heap space" have nothing in common except the class name.',
            buildsOn: ['metaspace-and-its-oom'],
            blocks: [
                {
                    type: 'table',
                    title: 'The message, and what it actually means',
                    headers: ['Message after the colon', 'Cause', 'First thing to do'],
                    rows: [
                        ['<code>Java heap space</code>', 'The live set exceeds <code>-Xmx</code>', 'Heap dump, dominator tree. Assume a leak until shown otherwise'],
                        ['<code>GC overhead limit exceeded</code>', 'Over 98% of time in GC, under 2% reclaimed', 'The same. This is the heap failing slowly rather than at once'],
                        ['<code>Metaspace</code>', 'Too many loaded classes', 'Count loaded classes over time; look for a loader leak'],
                        ['<code>unable to create native thread</code>', '<strong>Not a heap problem.</strong> The OS refused a thread', 'Count threads. Check <code>ulimit -u</code> and the pod pids limit'],
                        ['<code>Direct buffer memory</code>', 'Off-heap NIO buffers exhausted', 'Look at Netty, the HTTP client, the driver. Not <code>-Xmx</code>'],
                        ['<code>Requested array size exceeds VM limit</code>', 'An array longer than roughly <code>Integer.MAX_VALUE</code>', 'A bug, essentially always. Find the size calculation']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Raising <code>-Xmx</code> in response to "unable to create native thread" makes it strictly worse.</strong> That error means the process could not get another thread stack from the operating system, and thread stacks come out of the memory the heap does not occupy. A larger heap leaves less room for stacks. The same inversion applies to <code>Direct buffer memory</code>. Read the message before reaching for the flag.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Worth saying explicitly in an interview: <em>"An <code>OutOfMemoryError</code> is an <code>Error</code>, not an <code>Exception</code>, and catching it is almost always wrong — the JVM is in an undefined state and any allocation afterwards can fail. I would rather the process exit and be restarted, which is what <code>-XX:+ExitOnOutOfMemoryError</code> is for, than have it stay up serving errors and passing its health check."</em></p>'
                }
            ],
            docs: [
                { title: 'Troubleshooting Guide — Understand the OutOfMemoryError Exception', url: 'https://docs.oracle.com/en/java/javase/21/troubleshoot/troubleshooting-memory-leaks.html', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'heap-dumps-and-histograms',
            title: 'Heap Dumps',
            importance: 'should-know',
            summary: 'A histogram tells you what there is a lot of. A dominator tree tells you what is keeping it alive, which is the question you actually have.',
            interviewAngle: 'The follow-up to the OutOfMemoryError question. Knowing the difference between shallow size, retained size and dominance is what makes the answer sound like experience rather than reading.',
            buildsOn: ['outofmemoryerror-varieties'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'bash',
                    title: 'Getting one, from cheapest to most disruptive',
                    code: '# A histogram. No dump file, near-instant, safe on a live process.\njcmd <pid> GC.class_histogram | head -30\n\n# The full dump. STOPS THE WORLD for the duration, and the file is\n# roughly the size of the live heap. Do this on one instance, not all.\njcmd <pid> GC.heap_dump /var/log/heap.hprof\n\n# live=true forces a full GC first, so the dump excludes garbage --\n# smaller file, and a much clearer dominator tree.\njmap -dump:live,format=b,file=/var/log/heap.hprof <pid>',
                    notes: '<p>Take the histogram first. It is free, and if one class has thirty million instances you often have the answer without ever loading a dump into a tool. Note also that a dump of a 4GB heap needs 4GB of disk on the host and considerably more memory in whatever opens it.</p>'
                },
                {
                    type: 'types',
                    title: 'The three sizes, and which one to sort by',
                    items: [
                        { name: 'Shallow size', html: '<p>The object itself — its header and fields, not what they point to. An <code>ArrayList</code> holding a million entries has a shallow size of about 24 bytes.</p>' },
                        { name: 'Retained size', html: '<p>Everything that would be freed if this object were collected. <strong>This is the number you sort by.</strong> The same list retains the array and often the million objects too.</p>' },
                        { name: 'Dominator', html: '<p>X dominates Y if every path from a root to Y goes through X. The dominator tree is the tool\'s answer to "what single thing is responsible for this", and it is where an investigation should start.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>Eclipse MAT is the standard tool and its <em>Leak Suspects</em> report is genuinely good at this — it will usually name the retaining object in one screen. VisualVM opens dumps too and is easier to get hold of. Neither runs on the production host: take the dump there, copy it, open it somewhere else.</p>'
                }
            ],
            docs: [
                { title: 'Eclipse Memory Analyzer', url: 'https://eclipse.dev/mat/', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'thread-dumps',
            title: 'Thread Dumps',
            importance: 'must-know',
            summary: 'Three dumps ten seconds apart, then read the states rather than counting them. A thread in the same frame across all three is stuck; a thread in a different frame is working.',
            interviewAngle: 'Asked as "the service is hung, what do you do", and the answer is a procedure. Taking three is the detail that shows you have done it — one dump cannot distinguish a busy thread from a stuck one.',
            buildsOn: ['outofmemoryerror-varieties'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'bash',
                    title: 'The procedure',
                    code: '# Three, spaced. One dump is a photograph; three are a diagnosis.\nfor i in 1 2 3; do\n  jcmd <pid> Thread.print > /tmp/threads-$i.txt\n  sleep 10\ndone\n\n# jstack still works and is equivalent. jcmd is the maintained entry point.\njstack -l <pid> > /tmp/threads.txt\n\n# What to count before reading anything.\ngrep -c "java.lang.Thread.State: BLOCKED" /tmp/threads-1.txt\ngrep -A3 "waiting to lock" /tmp/threads-1.txt | head -40',
                    output: {
                        kind: 'trace',
                        lines: [
                            'The JVM finds deadlocks for you: Thread.print ends with a "Found one Java-level deadlock" section naming both threads and both monitors, when there is one to find.',
                            'That section only covers monitor and Lock deadlocks. A logical deadlock -- two threads each waiting on the other via a connection pool or a latch -- is invisible to it.',
                            'Many threads BLOCKED on the same lock address means contention on one synchronized section: the address is in the "waiting to lock <0x...>" line, and one thread holds it.',
                            'Many threads in TIMED_WAITING inside getConnection means the connection pool is exhausted, which is a downstream problem wearing a threading costume.'
                        ],
                        explain: '<p>Read the states in this order: any deadlock section first, then BLOCKED counts grouped by lock address, then WAITING threads grouped by what they are waiting in. The frame that repeats across all three dumps is the one to investigate; a thread that has moved between dumps is doing its job.</p>'
                    }
                },
                {
                    type: 'tip',
                    html: '<p>This is the payoff for naming your thread factories. <code>pool-2-thread-7</code> in a dump of four hundred threads tells you nothing; <code>invoice-export-7</code> tells you which subsystem is stuck before you have read a single frame. Thirty seconds of work when the pool is created, and it is the difference between a five-minute diagnosis and an hour.</p>'
                }
            ],
            docs: [
                { title: 'jcmd', url: 'https://docs.oracle.com/en/java/javase/21/docs/specs/man/jcmd.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'concurrency', questionId: 'deadlock-four-conditions' }
            ]
        },

        {
            id: 'jcmd-jstat-jmap',
            title: 'The Commands, in One Place',
            importance: 'should-know',
            summary: 'jcmd does nearly everything and is the one to learn. The others are older entry points to the same machinery.',
            interviewAngle: 'A recall question with a practical edge — "what tools would you use" is much better answered with three commands you can type than with a list of GUIs.',
            buildsOn: ['thread-dumps'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'bash',
                    title: 'The set worth memorising',
                    code: 'jcmd -l                              # every JVM on this host, with its pid\njcmd <pid> help                      # every command THIS jvm accepts\n\njcmd <pid> Thread.print              # thread dump\njcmd <pid> GC.class_histogram        # live histogram, no dump file\njcmd <pid> GC.heap_info              # heap sizes and current occupancy\njcmd <pid> VM.flags                  # every flag in effect, defaults included\njcmd <pid> VM.system_properties      # what the process actually thinks\njcmd <pid> VM.native_memory summary  # needs -XX:NativeMemoryTracking\n\n# One line per second: GC counts and generation occupancy over time.\njstat -gcutil <pid> 1000\n\n# JFR, from a running process. Low enough overhead to leave recording.\njcmd <pid> JFR.start duration=60s filename=/tmp/rec.jfr',
                    notes: '<p><code>VM.flags</code> deserves special mention: it prints the flags actually in effect, including every ergonomic default the JVM chose for itself. It is how you find out that a container is running Serial GC because it was given one CPU, which nobody configured and nobody expected.</p>'
                },
                {
                    type: 'table',
                    title: 'What each older tool was for',
                    headers: ['Tool', 'Does', 'Status'],
                    rows: [
                        ['<code>jcmd</code>', 'Everything below, and more', '<strong>The recommended entry point</strong>'],
                        ['<code>jstack</code>', 'Thread dumps', 'Works; <code>jcmd Thread.print</code> is equivalent'],
                        ['<code>jmap</code>', 'Heap dumps and histograms', 'Works; <code>jcmd GC.heap_dump</code> is equivalent'],
                        ['<code>jstat</code>', 'GC statistics, sampled over time', 'Still the easiest way to watch GC live'],
                        ['<code>jinfo</code>', 'Flags and properties', 'Mostly superseded by <code>jcmd VM.flags</code>'],
                        ['<code>jhsdb</code>', 'Post-mortem, on a core file', 'For when the process is already gone']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>These tools are missing from most production images.</strong> A JRE-only base image, or a <code>jlink</code> runtime built without <code>jdk.jcmd</code>, has none of them — and you find out during the incident. Either include the tooling module in the runtime image, or make sure the debug sidecar you would attach actually exists and has been tried once. A command you have never run on that image is not a plan.</p>'
                }
            ],
            docs: [
                { title: 'JDK Tool Specifications', url: 'https://docs.oracle.com/en/java/javase/21/docs/specs/man/index.html', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'profiling-in-production',
            title: 'Profiling Something You Cannot Restart',
            importance: 'good-to-know',
            summary: 'JFR is built in, costs a few percent, and can be started on a process that is already running. That combination is why it is the answer.',
            interviewAngle: 'Comes up in senior rounds as "how would you find a CPU hotspot in production". Naming JFR and its overhead — and knowing it is free since Java 11 — is the whole answer.',
            buildsOn: ['jcmd-jstat-jmap'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>Java Flight Recorder samples execution, allocation, locks, IO and GC into a ring buffer inside the JVM, at an overhead usually quoted around 1–2% for the default profile. It needs no agent, no restart and no port: <code>jcmd &lt;pid&gt; JFR.start</code> on a process that has been up for three weeks works. JDK Mission Control opens the recording afterwards, somewhere else.</p>'
                },
                {
                    type: 'version',
                    title: 'JFR licensing, which used to be the objection',
                    items: [
                        { version: 'Java 8', state: 'was', html: '<p>A commercial feature of Oracle JDK, requiring <code>-XX:+UnlockCommercialFeatures</code>. This is why a generation of engineers learned other tools.</p>' },
                        { version: 'Java 11', state: 'changed', html: '<p>JEP 328 open-sourced it into OpenJDK. Free, in every build, no flag.</p>' },
                        { version: 'Java 14', state: 'changed', html: '<p>JEP 349 added event streaming — a recording can be consumed continuously rather than only as a file.</p>' }
                    ]
                },
                {
                    type: 'types',
                    title: 'What to reach for, and when',
                    items: [
                        { name: 'JFR', html: '<p>The default answer. Built in, low overhead, safe to start on a live process, and it records allocation and lock events alongside CPU.</p>' },
                        { name: 'async-profiler', html: '<p>When you need an accurate CPU flame graph. It samples via <code>perf</code> and does not suffer from safepoint bias, which sampling profilers that use <code>getStackTrace</code> do.</p>' },
                        { name: 'A heap dump', html: '<p>For memory, not for CPU. Different question, different tool.</p>' },
                        { name: 'Metrics you already have', html: '<p>Micrometer timers and the existing dashboards. Try these first — a profiler answers "where is the time going in this process", and often the real question is "which endpoint got slow", which the dashboard already knows.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Safepoint bias makes some profilers confidently wrong.</strong> A profiler that collects stacks through the JVM\'s own API can only sample at safepoints, and safepoints are not uniformly distributed through the code — tight counted loops famously have none. The result is a flame graph that attributes time to the method after the hotspot rather than the hotspot. If a profile disagrees with a measurement you trust, this is the first thing to suspect.</p>'
                }
            ],
            docs: [
                { title: 'JEP 328: Flight Recorder', url: 'https://openjdk.org/jeps/328', kind: 'spec' },
                { title: 'JDK Flight Recorder Runtime Guide', url: 'https://docs.oracle.com/en/java/javase/21/jfapi/index.html', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'jvm-in-a-container',
            title: 'The JVM in a Container',
            importance: 'must-know',
            summary: 'Modern JVMs read cgroup limits. Everything that goes wrong here comes from a JVM that does not, or from a limit that bounds more than the heap.',
            interviewAngle: 'Asked in almost every backend interview now, usually as "how do you size a JVM in Kubernetes". The complete answer covers memory headroom, CPU limits and the ergonomic decisions the JVM makes from them.',
            buildsOn: ['jcmd-jstat-jmap'],
            blocks: [
                {
                    type: 'version',
                    title: 'Container awareness, which is a real dividing line',
                    items: [
                        { version: 'Java 8u131', state: 'was', html: '<p>Opt-in, behind <code>-XX:+UseCGroupMemoryLimitForHeap</code> and <code>-XX:+UnlockExperimentalVMOptions</code>. Before this, the JVM read the <em>host</em>: a 64-core machine gave a 100MB container 64 GC threads and a heap sized for the host.</p>' },
                        { version: 'Java 10', state: 'changed', html: '<p>Container support on by default (JDK-8146115), via <code>-XX:+UseContainerSupport</code>. <code>availableProcessors()</code> and the default heap both follow the cgroup.</p>' },
                        { version: 'Java 15', state: 'is', html: '<p>cgroup v2 supported, which is what current Kubernetes uses.</p>' }
                    ]
                },
                {
                    type: 'table',
                    title: 'The three settings, and how they interact',
                    headers: ['Set in the pod', 'What the JVM does with it', 'The mistake'],
                    rows: [
                        ['<code>memory.limit</code>', 'Derives the default heap from it — a quarter of it, unless told otherwise', 'Setting <code>-Xmx</code> equal to the limit; everything non-heap then overruns it'],
                        ['<code>cpu.limit</code>', 'Sets <code>availableProcessors()</code>, and with it GC threads, the common pool and the carrier pool', 'A limit below 2 selects Serial GC silently'],
                        ['<code>cpu.request</code>', '<strong>Nothing.</strong> The JVM does not see requests, only limits', 'Assuming a generous request protects a service with a tight limit']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A CPU limit throttles rather than slows.</strong> The kernel gives the cgroup a quota per 100ms period and stops it dead when it is spent — so a process that briefly needs more CPU is frozen for the rest of the period, and the symptom is p99 latency spikes with average CPU well under the limit. GC pauses and JIT compilation both look like this. Check the throttling counter before concluding the JVM is slow; and note that a service with a <code>0.5</code> CPU limit is running Serial GC and a common ForkJoinPool of one.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The compact answer to the sizing question: <em>"Use <code>-XX:MaxRAMPercentage</code> around 75 rather than a fixed <code>-Xmx</code>, so the heap follows the limit. Leave the rest for Metaspace, thread stacks and direct buffers — a container limit equal to the heap is an OOM kill waiting for load. Give it at least two CPUs so it does not silently pick Serial GC. And enable native memory tracking, because when the RSS does exceed the heap that is the only thing that will tell you why."</em></p>'
                }
            ],
            docs: [
                { title: 'Container Awareness — Java in Containers', url: 'https://docs.oracle.com/en/java/javase/21/gctuning/ergonomics1.html', kind: 'guide' }
            ],
            relatedQuestions: []
        }
    ]
};
