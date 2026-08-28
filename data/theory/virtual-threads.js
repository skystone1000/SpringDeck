/* ==========================================================================
   data/theory/virtual-threads.js — module 22 in the reading path

   Eight chapters, and this is the module that dates fastest. Everything
   version-dependent is in a version block rather than in prose, so that
   correcting it later is an edit to one list and not a re-read of the
   whole chapter.
   ========================================================================== */

const virtualThreadsModule = {
    id: 'virtual-threads',
    trackId: 'java-platform',
    order: 22,
    title: 'Virtual Threads and Structured Concurrency',
    tagline: 'The change that made round-three concurrency questions different.',
    estimatedMinutes: 45,
    prerequisites: ['executors-and-futures'],
    docHub: { title: 'JEP 444: Virtual Threads', url: 'https://openjdk.org/jeps/444' },

    chapters: [
        {
            id: 'platform-vs-virtual',
            title: 'What a Virtual Thread Is',
            importance: 'must-know',
            summary: 'A platform thread is an OS thread with a fixed stack. A virtual thread is a stack the JVM parks on the heap and mounts on a carrier only while it is running.',
            interviewAngle: 'Asked in every 2025 concurrency round. The answer that separates candidates is the word "mount": a virtual thread is not a lighter OS thread, it is a task that borrows an OS thread for the stretches when it is not blocked.',
            buildsOn: [],
            blocks: [
                {
                    type: 'definition',
                    term: 'Virtual thread',
                    important: true,
                    html: '<p>A <code>Thread</code> scheduled by the JVM rather than by the operating system. Its stack lives on the heap as a <em>continuation</em> and grows as needed. When the thread blocks, the JVM <strong>unmounts</strong> it — copies the stack out, frees the carrier — and mounts something else. When the blocking call completes it is mounted again, possibly on a different carrier.</p>'
                },
                {
                    type: 'definition',
                    term: 'Carrier thread',
                    html: '<p>The platform thread a virtual thread runs on while it is mounted. Carriers come from a dedicated <code>ForkJoinPool</code> sized to <code>availableProcessors()</code> by default. A virtual thread has no carrier of its own — that is precisely what makes it cheap.</p>'
                },
                {
                    type: 'comparison',
                    title: 'The two kinds of thread',
                    left: 'Platform thread',
                    right: 'Virtual thread',
                    rows: [
                        { aspect: 'Backed by', left: 'One OS thread, one to one', right: 'A heap-allocated continuation' },
                        { aspect: 'Stack', left: 'Reserved up front, typically 1MB', right: 'Grows and shrinks; hundreds of bytes to start' },
                        { aspect: 'Scheduled by', left: 'The OS kernel, pre-emptively', right: 'The JVM, cooperatively at blocking points' },
                        { aspect: 'Practical ceiling', left: 'A few thousand', right: '<strong>Millions</strong>' },
                        { aspect: 'Creation cost', left: 'A system call', right: 'An object allocation' },
                        { aspect: 'Pooling it', left: 'Necessary', right: '<strong>An anti-pattern.</strong> Create one per task' },
                        { aspect: 'Blocking is', left: 'Expensive — the OS thread is idle', right: 'Cheap — the carrier is handed to someone else' }
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The three ways to get one',
                    code: '// 1. One per task, from an executor. The idiomatic form.\ntry (var executor = Executors.newVirtualThreadPerTaskExecutor()) {\n    for (Request r : requests) {\n        executor.submit(() -> handle(r));    // one virtual thread each\n    }\n}   // close() waits for every task -- ExecutorService is AutoCloseable since 19\n\n// 2. Directly, when you want the Thread handle.\nThread t = Thread.ofVirtual().name("import-", 0).start(() -> load());\nt.join();\n\n// 3. An unstarted one, for a builder you hand to something else.\nThreadFactory factory = Thread.ofVirtual().factory();',
                    notes: '<p><code>newVirtualThreadPerTaskExecutor()</code> is not a pool and holds no threads. It is an <code>ExecutorService</code> shaped adapter that creates a fresh virtual thread per submitted task, which is why there is no size argument to pass it.</p>'
                },
                {
                    type: 'version',
                    title: 'How virtual threads arrived',
                    items: [
                        { version: 'Java 19', state: 'preview', html: '<p>JEP 425, first preview. <code>--enable-preview</code> required.</p>' },
                        { version: 'Java 20', state: 'preview', html: '<p>JEP 436, second preview, unchanged in substance.</p>' },
                        { version: 'Java 21', state: 'is', html: '<p>JEP 444, <strong>final</strong>. This is the LTS the ecosystem moved on, and the version most interviews assume.</p>' },
                        { version: 'Java 24', state: 'changed', html: '<p>JEP 491 removed the <code>synchronized</code> pinning limitation. See the pinning chapter — this is the single most out-of-date fact in circulation.</p>' }
                    ]
                }
            ],
            docs: [
                { title: 'JEP 444: Virtual Threads', url: 'https://openjdk.org/jeps/444', kind: 'spec' },
                { title: 'Thread.ofVirtual()', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Thread.html#ofVirtual()', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'concurrency', questionId: 'what-virtual-threads-change' }
            ]
        },

        {
            id: 'when-they-help',
            title: 'When They Help, and When They Do Nothing',
            importance: 'must-know',
            summary: 'Virtual threads raise the ceiling on concurrent blocking calls. They do not make any single call faster, and they do nothing at all for CPU-bound work.',
            interviewAngle: 'The trap is a candidate who answers "virtual threads" to every performance question. Being able to say plainly that they will not help a CPU-bound service — and why — is worth more than any amount of enthusiasm.',
            buildsOn: ['platform-vs-virtual'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>The problem virtual threads solve is precisely stated: <strong>thread-per-request is a good programming model and platform threads made it too expensive.</strong> A service holding 10,000 concurrent connections cannot have 10,000 platform threads, so the industry adopted asynchronous and reactive styles — which work, and which cost you the debugger, the stack trace, the profiler and the try/finally. Virtual threads give the blocking model back at a cost that scales.</p>'
                },
                {
                    type: 'table',
                    title: 'What changes and what does not',
                    headers: ['Workload', 'Effect', 'Why'],
                    rows: [
                        ['Many concurrent blocking IO calls', '<strong>Large win</strong>', 'The carrier is released for the duration of every wait'],
                        ['One slow database query', 'None', 'The query takes what it takes; only waiting got cheaper'],
                        ['CPU-bound computation', '<strong>None</strong>', 'The work still needs a core, and there are still only n cores'],
                        ['A fan-out to twelve services', 'Large win', 'Twelve blocking calls in parallel, written as twelve blocking calls'],
                        ['A service already on WebFlux', 'Little', 'It already released the thread; the gain is readability, not throughput'],
                        ['Deep recursion or huge stacks', 'Mixed', 'The stack is on the heap now — cheaper to have, not free']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Removing the thread limit does not remove the downstream limit.</strong> Ten thousand virtual threads in front of a connection pool of ten gives you ten concurrent queries and 9,990 threads waiting — and unlike a bounded thread pool, nothing rejected anything, so the overload arrives at the database instead of at your rejection handler. The bound has to be re-established explicitly, with a <code>Semaphore</code> or the pool itself. This is the most important follow-up in the whole subject and it is asked directly.</p>'
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Unbounded threads, bounded concurrency',
                    code: 'private final Semaphore downstream = new Semaphore(20);\n\nQuote fetch(String sku) throws InterruptedException {\n    downstream.acquire();          // the bound is here now, not on the threads\n    try {\n        return client.get(sku);    // blocking, on a virtual thread, and fine\n    } finally {\n        downstream.release();\n    }\n}',
                    notes: '<p>The shape of the answer in an interview: <em>"You move the limit from the thread pool to the resource that actually has a limit. The thread count stops being the way you express capacity, and a semaphore or the connection pool becomes it."</em></p>'
                },
                {
                    type: 'tip',
                    html: '<p>Virtual threads are also worth mentioning as a <em>debuggability</em> argument, not only a throughput one. A stack trace from a virtual thread is the whole story of the request, and the profiler shows the call as blocked. Neither is true of a reactive chain, where the stack belongs to the event loop and the trace tells you nothing about which request it is serving.</p>'
                }
            ],
            docs: [
                { title: 'Virtual Threads — Oracle Core Libraries Guide', url: 'https://docs.oracle.com/en/java/javase/21/core/virtual-threads.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'concurrency', questionId: 'bounding-virtual-threads' }
            ]
        },

        {
            id: 'pinning-and-what-causes-it',
            title: 'Pinning',
            importance: 'must-know',
            summary: 'A pinned virtual thread cannot unmount, so it holds its carrier while it blocks. What causes pinning changed in Java 24, and most answers in circulation are the old one.',
            interviewAngle: 'The highest-value fact in this module, precisely because it moved. Saying "synchronized pins, so use ReentrantLock" is the Java 21 answer; saying that and then adding that JEP 491 fixed it in Java 24 is what distinguishes someone who is following the platform from someone who read a blog post in 2023.',
            buildsOn: ['platform-vs-virtual'],
            blocks: [
                {
                    type: 'definition',
                    term: 'Pinning',
                    important: true,
                    html: '<p>A state in which a virtual thread cannot be unmounted from its carrier. If it blocks while pinned, the carrier blocks with it — so a pool of <em>n</em> carriers can lose all <em>n</em> to pinned threads and the whole scheduler stalls, no matter how many virtual threads are runnable.</p>'
                },
                {
                    type: 'version',
                    title: 'What causes pinning, by version',
                    items: [
                        { version: 'Java 21', state: 'was', html: '<p>Two causes: a blocking call inside a <code>synchronized</code> block or method, and a blocking call inside a native frame (JNI). The first one mattered enormously — it is in every driver, every legacy library, and most codebases.</p>' },
                        { version: 'Java 21', state: 'was', html: '<p>The workaround was to replace <code>synchronized</code> with <code>ReentrantLock</code>, which parks the virtual thread properly. This is still sound advice; it is no longer a requirement.</p>' },
                        { version: 'Java 24', state: 'changed', html: '<p><strong>JEP 491.</strong> <code>synchronized</code> no longer pins. The object monitor implementation was reworked so a virtual thread blocking on, or inside, a monitor unmounts like any other blocking operation.</p>' },
                        { version: 'Java 24', state: 'is', html: '<p>What still pins: a blocking call inside a <strong>native frame</strong>, and a class initialiser that blocks. Both are rare, and neither has a workaround as convenient as swapping a lock type.</p>' }
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The classic pinning shape, and the fix that worked before Java 24',
                    code: 'class Cache {\n    // On Java 21 this pins for the whole duration of the fetch.\n    synchronized Value get(String key) {\n        Value v = map.get(key);\n        if (v == null) {\n            v = remote.fetch(key);      // BLOCKS while holding the monitor\n            map.put(key, v);\n        }\n        return v;\n    }\n}\n\nclass Cache {\n    private final ReentrantLock lock = new ReentrantLock();\n\n    Value get(String key) {\n        lock.lock();                    // parks properly; unmounts\n        try {\n            ...\n        } finally {\n            lock.unlock();\n        }\n    }\n}',
                    output: {
                        kind: 'trace',
                        lines: [
                            'On Java 21, with the default carrier pool sized to the core count, a four-core machine has four carriers.',
                            'Four virtual threads inside that synchronized method, all waiting on the remote fetch, occupy all four carriers.',
                            'Every other virtual thread in the process is now unschedulable, including ones doing unrelated work.',
                            'Throughput collapses to the platform-thread level while the thread dump shows thousands of healthy virtual threads waiting to run.'
                        ],
                        explain: '<p>The failure is confusing in exactly the way that makes it worth knowing: the metric that looks wrong is throughput, and the thing that is wrong is the carrier count. <code>-Djdk.tracePinnedThreads=full</code> printed a stack trace at every pinning event on Java 21; from Java 24 the diagnostic moved to the <code>jdk.VirtualThreadPinned</code> JFR event, which is cheap enough to leave on.</p>'
                    }
                },
                {
                    type: 'tip',
                    html: '<p>State the version boundary out loud, because it is the part being tested: <em>"On 21 a blocking call inside <code>synchronized</code> pins the carrier, and the standard fix was <code>ReentrantLock</code>. JEP 491 in Java 24 removed that — monitors now unmount. Native frames still pin. If I were adopting virtual threads on 21 I would audit synchronized blocks that make IO calls; on 24 I would not."</em></p>'
                }
            ],
            docs: [
                { title: 'JEP 491: Synchronize Virtual Threads without Pinning', url: 'https://openjdk.org/jeps/491', kind: 'spec' }
            ],
            relatedQuestions: [
                { topicId: 'concurrency', questionId: 'virtual-thread-pinning' }
            ]
        },

        {
            id: 'threadlocal-in-a-virtual-world',
            title: 'ThreadLocal When Threads Are Free',
            importance: 'should-know',
            summary: 'ThreadLocal still works, and that is the problem: a million threads means a million copies of whatever you put in one.',
            interviewAngle: 'A good follow-up to the pinning question and a chance to connect two things — the classic ThreadLocal leak in a pooled world, and the new memory problem in an unpooled one. They are opposite failure modes of the same API.',
            buildsOn: ['platform-vs-virtual'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'The same API, two different problems',
                    left: 'ThreadLocal on a pool',
                    right: 'ThreadLocal on virtual threads',
                    rows: [
                        { aspect: 'Lifetime', left: 'As long as the pooled thread — effectively forever', right: 'As long as the task; the thread dies with it' },
                        { aspect: 'The failure', left: '<strong>A leak.</strong> Values outlive the request and are seen by the next one', right: '<strong>Footprint.</strong> One copy per thread, and there are a great many threads' },
                        { aspect: 'Cross-request bleed', left: 'Yes, if <code>remove()</code> is not called in a finally', right: 'No — a fresh thread cannot inherit anything' },
                        { aspect: 'Inheritance', left: '<code>InheritableThreadLocal</code> copies to children', right: 'Copies to <strong>every</strong> child; a fan-out multiplies the map' },
                        { aspect: 'The Java 25 answer', left: '<code>ScopedValue</code>', right: '<code>ScopedValue</code>' }
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>Nothing about <code>ThreadLocal</code> is broken on a virtual thread. It is correctly scoped, and the leak that plagues pooled threads is gone by construction because the thread does not outlive the task. What replaces it is a sizing question: a <code>ThreadLocal</code> holding a request context of a few kilobytes is invisible across 200 platform threads and is a gigabyte across 200,000 virtual ones.</p><p>Frameworks that carry context this way — MDC in logging, the security context, the transaction synchronisation — are therefore the parts of an application most affected by the switch, and they are also the parts nobody looks at when adopting virtual threads.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Anything that caches a heavyweight object per thread turns into a memory problem.</strong> The classic is a <code>ThreadLocal&lt;SimpleDateFormat&gt;</code> or <code>ThreadLocal&lt;ObjectMapper&gt;</code> — a well-known workaround for a non-thread-safe object, correct and cheap when there are sixteen threads, and a per-request allocation of the same object when there are sixteen thousand. If a library does this internally, virtual threads will find it for you.</p>'
                }
            ],
            docs: [
                { title: 'ThreadLocal', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/ThreadLocal.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'concurrency', questionId: 'threadlocal-leaks' }
            ]
        },

        {
            id: 'structured-task-scope',
            title: 'Structured Concurrency',
            importance: 'should-know',
            summary: 'A scope in which every task started inside it is finished — or cancelled — before the block exits. Concurrency gets the same shape as a try-with-resources.',
            interviewAngle: 'A differentiator rather than a requirement. The argument to be able to make is that ExecutorService lets a task outlive the method that started it, which is why leaked tasks and orphaned work exist at all, and that a scope removes the possibility rather than the mistake.',
            buildsOn: ['when-they-help'],
            blocks: [
                {
                    type: 'definition',
                    term: 'Structured concurrency',
                    important: true,
                    html: '<p>The principle that a task split into concurrent subtasks must reunite in the same block of code that split it. Subtask lifetimes nest inside the parent, so cancellation propagates downward, failure propagates upward, and the stack trace of a subtask includes the code that started it.</p>'
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Fan-out with a deadline, and no way to leak a task',
                    code: '// Java 25 shape. See the version block below -- the API moved.\ntry (var scope = StructuredTaskScope.open(\n        Joiner.<Object>allSuccessfulOrThrow(),\n        cfg -> cfg.withTimeout(Duration.ofSeconds(2)))) {\n\n    Subtask<User>   user  = scope.fork(() -> findUser(id));\n    Subtask<List<Order>> orders = scope.fork(() -> findOrders(id));\n\n    scope.join();                       // waits, or throws on first failure\n\n    return new Profile(user.get(), orders.get());\n}   // close() guarantees BOTH subtasks are done or cancelled',
                    output: {
                        kind: 'trace',
                        lines: [
                            'Both forks start immediately and run on virtual threads.',
                            'If findUser throws, the scope cancels findOrders rather than letting it run to completion for a result nobody will read.',
                            'If the two-second timeout expires first, both are cancelled and join() throws.',
                            'When the try block exits by any path, no subtask is still running. That guarantee is the whole feature -- an ExecutorService cannot make it, because submit() returns a handle the caller is free to drop.'
                        ],
                        explain: '<p>Compare against the <code>allOf</code> fan-out in the executors module: there, a failure in one call leaves the other eleven running, and cancelling them is manual and easy to forget. Here it is the default and there is no way to opt out.</p>'
                    }
                },
                {
                    type: 'version',
                    title: 'StructuredTaskScope has changed shape more than once',
                    items: [
                        { version: 'Java 21', state: 'preview', html: '<p>JEP 453. Subclass-based: <code>new StructuredTaskScope.ShutdownOnFailure()</code>, then <code>join()</code> and <code>throwIfFailed()</code>. Most tutorials show this form.</p>' },
                        { version: 'Java 24', state: 'changed', html: '<p>JEP 499, fourth preview. Still the subclass API; the surrounding machinery settled.</p>' },
                        { version: 'Java 25', state: 'preview', html: '<p>JEP 505, fifth preview. <strong>Redesigned:</strong> the static <code>open()</code> factory plus a <code>Joiner</code> policy replaces the subclasses, and <code>join()</code> itself returns the result or throws.</p>' },
                        { version: 'Java 25', state: 'is', html: '<p>Still a preview feature, so it needs <code>--enable-preview</code> and is not for production. Say so if you bring it up — knowing it is unfinished is part of knowing it.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>If asked whether you have used it, the honest and useful answer names the guarantee rather than the API: <em>"Not in production, since it is still a preview. The idea is that subtask lifetimes nest inside the method that forked them, so a failure cancels the siblings and nothing outlives the block. It is try-with-resources for concurrency."</em></p>'
                }
            ],
            docs: [
                { title: 'JEP 505: Structured Concurrency (Fifth Preview)', url: 'https://openjdk.org/jeps/505', kind: 'spec' }
            ],
            relatedQuestions: [
                { topicId: 'concurrency', questionId: 'structured-concurrency' }
            ]
        },

        {
            id: 'scoped-values',
            title: 'ScopedValue',
            importance: 'good-to-know',
            summary: 'An immutable value bound for the duration of a call, inherited by structured subtasks. It is what ThreadLocal would be if it had been designed for a million threads.',
            interviewAngle: 'Rarely required, occasionally decisive. The comparison to draw is mutability and lifetime: a ThreadLocal can be set by anyone at any time and lives until removed, and a ScopedValue is bound for exactly one call and cannot be changed from inside it.',
            buildsOn: ['threadlocal-in-a-virtual-world'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Bound for one call, and unbound automatically',
                    code: 'private static final ScopedValue<Principal> CALLER =\n        ScopedValue.newInstance();\n\nvoid handle(Request request) {\n    ScopedValue.where(CALLER, request.principal())\n               .run(() -> service.process(request));\n}   // unbound here. There is no remove() to forget.\n\n// Anywhere down the call stack, without passing it as a parameter:\nvoid audit() {\n    Principal who = CALLER.get();     // throws if not bound. No silent null.\n}',
                    notes: '<p>The binding is one-way and immutable: code inside the scope reads the value and cannot rebind it for its caller. That is what makes it safe to share across threads — there is nothing to write, so there is nothing to copy.</p>'
                },
                {
                    type: 'comparison',
                    title: 'ScopedValue against ThreadLocal',
                    left: 'ThreadLocal',
                    right: 'ScopedValue',
                    rows: [
                        { aspect: 'Mutable', left: 'Yes — <code>set()</code> from anywhere', right: '<strong>No.</strong> Bound once, for one call' },
                        { aspect: 'Lifetime', left: 'Until <code>remove()</code>, or the thread dies', right: 'Exactly the dynamic extent of the <code>run()</code>' },
                        { aspect: 'Leaks', left: 'Yes, on pooled threads, routinely', right: 'Not possible — unbinding is structural' },
                        { aspect: 'Inheritance', left: '<code>InheritableThreadLocal</code> <em>copies</em> per child', right: 'Structured subtasks <em>share</em> the binding — no copy' },
                        { aspect: 'Cost at a million threads', left: 'A map per thread', right: 'One immutable binding, shared' },
                        { aspect: 'Missing value', left: 'Returns null, silently', right: 'Throws <code>NoSuchElementException</code>' }
                    ]
                },
                {
                    type: 'version',
                    title: 'ScopedValue reached final in Java 25',
                    items: [
                        { version: 'Java 20', state: 'preview', html: '<p>JEP 429, incubating as <code>jdk.incubator.concurrent</code>.</p>' },
                        { version: 'Java 21', state: 'preview', html: '<p>JEP 446, preview, moved into <code>java.lang</code>.</p>' },
                        { version: 'Java 25', state: 'is', html: '<p>JEP 506, <strong>final</strong>. No preview flag. Note the shape settled late — earlier previews used <code>ScopedValue.where(K, v, op)</code> and a <code>callWhere</code> variant that no longer exists.</p>' }
                    ]
                }
            ],
            docs: [
                { title: 'JEP 506: Scoped Values', url: 'https://openjdk.org/jeps/506', kind: 'spec' }
            ],
            relatedQuestions: [
                { topicId: 'concurrency', questionId: 'scoped-values' }
            ]
        },

        {
            id: 'in-spring-boot',
            title: 'Turning Them On in Spring Boot',
            importance: 'must-know',
            summary: 'One property, and then a list of things to check that the property does not check for you.',
            interviewAngle: 'A practical question with a one-line answer and a long follow-up. Knowing the property is table stakes; knowing what it does and does not switch over is the answer worth giving.',
            buildsOn: ['when-they-help'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'properties',
                    title: 'The property',
                    code: '# Spring Boot 3.2 and later, on Java 21 or later.\nspring.threads.virtual.enabled=true',
                    notes: '<p>On a JDK below 21 this property is ignored rather than failing, which is worth knowing: a service can be configured for virtual threads and not be running on them, with nothing in the log to say so. Check a thread name — a request thread will be unnamed and report <code>isVirtual() == true</code>.</p>'
                },
                {
                    type: 'types',
                    title: 'What that property actually switches',
                    items: [
                        { name: 'The servlet container', html: '<p>Tomcat and Jetty get a virtual-thread executor, so each request is handled on its own virtual thread. This is the change that matters.</p>' },
                        { name: '@Async and @Scheduled', html: '<p>The auto-configured <code>ApplicationTaskExecutor</code> and the scheduler both become virtual-thread based.</p>' },
                        { name: 'Kafka, RabbitMQ, WebSocket listeners', html: '<p>Their auto-configured task executors follow the same property.</p>' },
                        { name: 'Not your own @Bean executors', html: '<p>An <code>ExecutorService</code> you declared yourself is untouched. It is still a platform-thread pool and still sized however you sized it.</p>' },
                        { name: 'Not the connection pool', html: '<p>HikariCP still has whatever <code>maximum-pool-size</code> it had. Under virtual threads that number becomes your real concurrency limit, and it is usually ten.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>The checklist before turning it on.</strong> Audit for <code>ThreadLocal</code> holding anything large. Confirm your JDBC driver and HTTP client do not block in native frames. Re-look at every connection pool size, because it is now the bound. And on Java 21 specifically, audit <code>synchronized</code> blocks that make IO calls — that one stops mattering on Java 24 and is the single most common reason an early adopter saw no improvement at all.</p>'
                },
                {
                    type: 'version',
                    title: 'Spring support',
                    items: [
                        { version: 'Spring Boot 3.2', state: 'is', html: '<p>The property arrives, on Java 21. This is the release that made virtual threads a configuration change rather than a project.</p>' },
                        { version: 'Spring Framework 6.1', state: 'changed', html: '<p><code>SimpleAsyncTaskExecutor</code> gained a virtual-thread mode and concurrency limiting, which is what the property configures underneath.</p>' }
                    ]
                }
            ],
            docs: [
                { title: 'Spring Boot — Task Execution and Scheduling', url: 'https://docs.spring.io/spring-boot/reference/features/task-execution-and-scheduling.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'concurrency', questionId: 'virtual-threads-in-spring-boot' }
            ]
        },

        {
            id: 'against-reactive',
            title: 'Against Reactive',
            importance: 'should-know',
            summary: 'Both release the thread during IO. Only one of them keeps your stack trace, your debugger and your try/finally — and only the other one gives you backpressure.',
            interviewAngle: 'A design-round question as much as a concurrency one. The wrong answer is that virtual threads make reactive obsolete. The right one names the thing reactive still has that virtual threads do not: composable backpressure across a stream.',
            buildsOn: ['when-they-help'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'Two answers to the same problem',
                    left: 'Virtual threads',
                    right: 'Reactive (WebFlux, Reactor)',
                    rows: [
                        { aspect: 'Releases the thread on IO', left: 'Yes', right: 'Yes' },
                        { aspect: 'Programming model', left: 'Blocking, sequential, ordinary', right: 'Callbacks and operators over a stream' },
                        { aspect: 'Stack traces', left: '<strong>Complete and meaningful</strong>', right: 'The event loop, plus whatever the operator recorded' },
                        { aspect: 'Debugger step-through', left: 'Works', right: 'Effectively does not' },
                        { aspect: 'try/finally and try-with-resources', left: 'Work normally', right: 'Replaced by operator equivalents' },
                        { aspect: 'Backpressure', left: '<strong>None.</strong> Add a semaphore or a bounded pool', right: '<strong>Built in</strong>, and composes across the pipeline' },
                        { aspect: 'Streaming, and per-item flow control', left: 'Awkward', right: 'What it is for' },
                        { aspect: 'Team cost', left: 'Nearly none — it is ordinary Java', right: 'Real. The whole call chain must be non-blocking' }
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>The honest summary is that virtual threads take away most of the <em>reasons</em> people adopted reactive without taking away everything reactive does. If the motivation was "we cannot afford a thread per request", that motivation is gone. If the motivation was streaming with real backpressure — a pipeline where a slow consumer must slow the producer, across a network boundary — reactive still answers a question virtual threads do not ask.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>One blocking call anywhere in a reactive chain destroys the model</strong>, and this is the sharpest practical difference. A blocking JDBC call on an event-loop thread stalls every other request that loop is serving, and there are only a handful of loops. Under virtual threads a blocking call is simply a blocking call. Reactive demands discipline from every library in the stack; virtual threads demand it from none.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Have a position and qualify it: <em>"For a typical request-response service I would use virtual threads — same throughput, a fraction of the complexity, and I keep the debugger. I would still reach for reactive where I need backpressure over a stream, or where the team already has a fully non-blocking stack and there is no reason to rewrite it."</em></p>'
                }
            ],
            docs: [
                { title: 'JEP 444 — Motivation', url: 'https://openjdk.org/jeps/444', kind: 'spec' }
            ],
            relatedQuestions: [
                { topicId: 'concurrency', questionId: 'virtual-threads-vs-reactive' }
            ]
        }
    ]
};
