/* ==========================================================================
   data/theory/executors-and-futures.js — module 21 in the reading path

   Eight chapters. The order is the order a service acquires these: first a
   pool instead of raw threads, then the pool's own configuration, then
   sizing it, then shutting it down — and only after all four the result
   types, because a Future you cannot shut down cleanly is worse than no
   Future at all.
   ========================================================================== */

const executorsAndFuturesModule = {
    id: 'executors-and-futures',
    trackId: 'java-platform',
    order: 21,
    title: 'Executors, Futures and CompletableFuture',
    tagline: 'The pool is the design decision. The Future is the consequence.',
    estimatedMinutes: 55,
    prerequisites: ['threads-and-memory-model'],
    docHub: { title: 'java.util.concurrent — package summary', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/package-summary.html' },

    chapters: [
        {
            id: 'why-a-pool',
            title: 'Why Not new Thread()',
            importance: 'must-know',
            summary: 'A platform thread costs about a megabyte of stack and a system call to create. The pool exists to bound that cost, and bounding it is the point — not reusing it.',
            interviewAngle: 'Asked as "why do we use thread pools". The weak answer is "creating threads is expensive", which is true and shallow. The answer that lands is that an unbounded thread count turns a traffic spike into an OutOfMemoryError, and the pool is where you decide what the system does when it runs out of capacity.',
            buildsOn: [],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>Every request that calls <code>new Thread(task).start()</code> is a promise that the machine can afford one more thread. Under normal load it can. Under a spike — a retry storm, a slow downstream, a cache that just went cold — it cannot, and the failure is not graceful: thread creation throws <code>OutOfMemoryError: unable to create native thread</code>, which is not an error any request handler is written to survive.</p><p>An <code>ExecutorService</code> replaces that promise with a policy. It has a fixed number of workers, a queue in front of them, and a documented behaviour for what happens when both are full. Those three things together are a capacity decision, made once, at construction, instead of implicitly at every call site.</p>'
                },
                {
                    type: 'definition',
                    term: 'Thread pool',
                    important: true,
                    html: '<p>A fixed set of worker threads that pull tasks from a shared queue. The pool decouples <em>task submission</em> from <em>task execution</em>: the caller hands over work and gets back a handle, and the pool decides when — and whether — that work runs.</p>'
                },
                {
                    type: 'types',
                    title: 'What the pool actually buys you, in order of importance',
                    items: [
                        { name: 'A bound on concurrency', html: '<p>The first and largest. Ten workers means at most ten concurrent database calls, ten concurrent outbound requests, ten threads competing for CPU. Without a pool that number is whatever the traffic happens to be.</p>' },
                        { name: 'A backpressure point', html: '<p>The queue is where load becomes visible. A queue depth metric is an early warning; an unbounded queue is a way of hiding the same information until the heap runs out.</p>' },
                        { name: 'A rejection policy', html: '<p>What to do when there is no capacity left. Shedding load deliberately beats discovering the answer during an incident.</p>' },
                        { name: 'Amortised creation cost', html: '<p>Real, and the one everybody names first. It matters least: on a modern JVM thread creation is on the order of tens of microseconds, which is invisible next to a network call.</p>' },
                        { name: 'A named thread factory', html: '<p>Not a performance property at all, but the one you will care about at 3am. <code>pool-1-thread-4</code> in a stack trace tells you nothing; <code>invoice-export-3</code> tells you which subsystem is stuck.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>Say the second sentence before anyone asks for it: <em>"Reuse is the small reason. The real reason is that a pool is where you decide how much concurrency the system is allowed to have, and what it does when it hits that limit. <code>new Thread()</code> per request has no answer to either question."</em></p>'
                }
            ],
            docs: [
                { title: 'ExecutorService', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/ExecutorService.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'concurrency', questionId: 'why-not-new-thread' }
            ]
        },

        {
            id: 'pool-types-and-queues',
            title: 'The Factory Methods, and What They Hide',
            importance: 'must-know',
            summary: 'Every Executors factory method is a ThreadPoolExecutor with one field set to infinity. Knowing which field is the whole subject.',
            interviewAngle: 'The question is often "what is the difference between a fixed and a cached thread pool", and the discriminating answer names the unbounded dimension in each: the queue in one, the thread count in the other. A candidate who can also state the core / queue / max decision order is showing they have configured a pool rather than called a factory.',
            buildsOn: ['why-a-pool'],
            blocks: [
                {
                    type: 'table',
                    title: 'The Executors factory methods, and the field each one leaves unbounded',
                    headers: ['Factory method', 'Threads', 'Queue', 'What is unbounded'],
                    rows: [
                        ['<code>newFixedThreadPool(n)</code>', 'exactly n', '<code>LinkedBlockingQueue</code>', '<strong>The queue.</strong> Tasks pile up in the heap until it is gone'],
                        ['<code>newCachedThreadPool()</code>', '0 to <code>Integer.MAX_VALUE</code>', '<code>SynchronousQueue</code> — no capacity', '<strong>The thread count.</strong> One thread per queued task, on demand'],
                        ['<code>newSingleThreadExecutor()</code>', 'exactly 1', '<code>LinkedBlockingQueue</code>', 'The queue, as above — plus every task is now serialised'],
                        ['<code>newScheduledThreadPool(n)</code>', 'n core, unbounded max', '<code>DelayedWorkQueue</code>', 'The queue, which is a priority queue by scheduled time'],
                        ['<code>newWorkStealingPool()</code>', 'one per core, by default', 'per-worker deques', 'Nothing, but it is a ForkJoinPool with different semantics'],
                        ['<code>newVirtualThreadPerTaskExecutor()</code>', 'one virtual thread per task', 'none', 'The task count — but a virtual thread is not a megabyte']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong><code>newFixedThreadPool</code> is not a bounded pool.</strong> The threads are bounded; the queue in front of them is a <code>LinkedBlockingQueue</code> with a capacity of <code>Integer.MAX_VALUE</code>. A fixed pool under sustained overload does not reject anything — it accepts every task, holds each one on the heap, and the service dies of an <code>OutOfMemoryError</code> minutes or hours after the actual overload started. The latency graph shows the queue draining slower and slower and then a heap dump. This is the single most common misconfiguration in a Spring service, and the fix is to construct a <code>ThreadPoolExecutor</code> by hand with an <code>ArrayBlockingQueue</code> of a size you chose.</p>'
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'A pool with all four decisions written down',
                    code: 'ThreadPoolExecutor pool = new ThreadPoolExecutor(\n        8,                                   // core: kept alive even when idle\n        16,                                  // max: only reached when the queue is FULL\n        60L, TimeUnit.SECONDS,               // idle timeout for the non-core threads\n        new ArrayBlockingQueue<>(200),       // BOUNDED. This is the whole point.\n        new ThreadFactoryBuilder()           // or a hand-written ThreadFactory\n                .setNameFormat("invoice-export-%d")\n                .build(),\n        new ThreadPoolExecutor.CallerRunsPolicy());',
                    notes: '<p>Four numbers and two objects, and every one of them is a decision somebody has to make. The factory methods make the same decisions silently, and one of them badly.</p>'
                },
                {
                    type: 'diagram',
                    diagramType: 'flowchart',
                    caption: 'The order surprises people: the queue is consulted before the pool grows.',
                    diagramConfig: {
                        title: 'What ThreadPoolExecutor does with a submitted task',
                        nodes: [
                            { id: 'submit', label: 'execute(task)', kind: 'start' },
                            { id: 'core', label: 'Fewer threads than core?', kind: 'decision' },
                            { id: 'newcore', label: 'Start a new core thread', kind: 'fix' },
                            { id: 'queue', label: 'Does the queue accept it?', kind: 'decision' },
                            { id: 'queued', label: 'Task waits in the queue', kind: 'step' },
                            { id: 'max', label: 'Fewer threads than max?', kind: 'decision' },
                            { id: 'newmax', label: 'Start an overflow thread', kind: 'fix' },
                            { id: 'reject', label: 'RejectedExecutionHandler', kind: 'step' }
                        ],
                        edges: [
                            { from: 'submit', to: 'core' },
                            { from: 'core', to: 'newcore', label: 'yes' },
                            { from: 'core', to: 'queue', label: 'no' },
                            { from: 'queue', to: 'queued', label: 'yes' },
                            { from: 'queue', to: 'max', label: 'full' },
                            { from: 'max', to: 'newmax', label: 'yes' },
                            { from: 'max', to: 'reject', label: 'no' }
                        ]
                    }
                },
                {
                    type: 'prose',
                    html: '<p>Read that order again, because it has a consequence people find counter-intuitive: <strong>with an unbounded queue, <code>maximumPoolSize</code> is dead configuration.</strong> The queue never reports itself full, so the branch that would start an overflow thread is never taken. A pool declared as <code>corePoolSize=8, maximumPoolSize=64</code> with a <code>LinkedBlockingQueue</code> runs eight threads forever, and the 64 is a comment.</p>'
                },
                {
                    type: 'types',
                    title: 'The four rejection policies',
                    items: [
                        { name: 'AbortPolicy', html: '<p>The default. Throws <code>RejectedExecutionException</code> at the caller. Loud, which is usually right — the caller can decide to retry, fall back, or return a 503.</p>' },
                        { name: 'CallerRunsPolicy', html: '<p>Runs the task on the submitting thread. This is <strong>backpressure by construction</strong>: the producer is busy executing and therefore cannot submit more. The best default for a producer you control.</p>' },
                        { name: 'DiscardPolicy', html: '<p>Silently drops the task. Acceptable only where the work is genuinely optional — a metric sample, a cache warm — and dangerous everywhere else, because nothing anywhere records that it happened.</p>' },
                        { name: 'DiscardOldestPolicy', html: '<p>Drops the head of the queue and retries. Sensible for a stream of stale-able snapshots, wrong for anything with side effects, since the discarded task is the one that has been waiting longest.</p>' }
                    ]
                }
            ],
            docs: [
                { title: 'ThreadPoolExecutor', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/ThreadPoolExecutor.html', kind: 'api' },
                { title: 'Executors', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/Executors.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'concurrency', questionId: 'threadpoolexecutor-queue-behaviour' }
            ]
        },

        {
            id: 'sizing-a-pool',
            title: 'Sizing It',
            importance: 'must-know',
            summary: 'CPU-bound work wants roughly one thread per core. IO-bound work wants a number derived from the wait-to-service ratio — and in practice from the smallest downstream limit you have.',
            interviewAngle: 'Nearly always asked, and there is a formula the interviewer is listening for. Quote it, then immediately qualify it: the real bound is usually the connection pool or the downstream rate limit, and a thread pool larger than that just moves the queue somewhere with worse visibility.',
            buildsOn: ['pool-types-and-queues'],
            blocks: [
                {
                    type: 'definition',
                    term: 'Wait-to-service ratio',
                    html: '<p>For one task, the time spent blocked divided by the time spent on CPU. A call that waits 90ms on a database and computes for 10ms has a ratio of 9. It is the input to the classic pool-sizing formula, and the number nobody measures.</p>'
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The formula, and what each term costs you to get wrong',
                    code: '// Brian Goetz, Java Concurrency in Practice, section 8.2\n//\n//     threads = cores x utilisation x (1 + wait / service)\n//\n// CPU-bound:  wait/service ~ 0     -> threads ~ cores\n// IO-bound:   wait/service = 9     -> threads ~ cores x 10\n\nint cores = Runtime.getRuntime().availableProcessors();\n\n// A parsing/encoding pool: add one so a page fault does not idle a core.\nExecutorService cpuBound = Executors.newFixedThreadPool(cores + 1);\n\n// An outbound-HTTP pool: bounded by the HTTP client, not by the formula.\nExecutorService ioBound = new ThreadPoolExecutor(\n        20, 20, 0L, TimeUnit.MILLISECONDS,\n        new ArrayBlockingQueue<>(100));',
                    output: {
                        kind: 'trace',
                        lines: [
                            'availableProcessors() reports the cores the JVM believes it has.',
                            'Inside a container that is CPU-limited, Java 10 and later read the cgroup quota, so a 0.5-CPU limit reports 1 rather than the host core count.',
                            'Before Java 10 it reported the host: a 64-core machine running 40 containers gave every one of them a 64-thread pool.',
                            'Which means a sizing formula copied from a pre-container codebase can be off by two orders of magnitude, in the direction that exhausts memory.'
                        ],
                        explain: '<p>The formula is the answer to give, but say the qualification with it. A pool of 200 threads in front of a HikariCP pool of 10 connections does not give you 200-way concurrency; it gives you 10-way concurrency and 190 threads blocked in <code>getConnection()</code>, which is the same throughput with more memory and worse thread dumps. <strong>Size the thread pool to the narrowest downstream resource, not to the formula.</strong></p>'
                    }
                },
                {
                    type: 'comparison',
                    title: 'Two pools that should never be one pool',
                    left: 'CPU-bound work',
                    right: 'IO-bound work',
                    rows: [
                        { aspect: 'Examples', left: 'JSON parsing, compression, hashing, image resize', right: 'Database calls, outbound HTTP, file and object storage' },
                        { aspect: 'Size', left: '<code>cores</code> or <code>cores + 1</code>', right: 'Derived from the wait ratio, capped by the downstream limit' },
                        { aspect: 'More threads gives you', left: 'Nothing — context switching, and worse cache locality', right: 'More in-flight requests, up to the downstream bound' },
                        { aspect: 'Symptom of oversizing', left: 'High CPU, falling throughput, high involuntary switches', right: 'Threads blocked in <code>getConnection()</code> and a large heap' },
                        { aspect: 'Virtual threads help?', left: '<strong>No.</strong> The work needs a core, not a cheaper stack', right: '<strong>Yes.</strong> This is exactly what they are for' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Sharing one pool between the two kinds is how a slow dependency takes down an unrelated feature.</strong> A single pool serving both the report renderer and the payment callback means a database outage fills the queue with report tasks and the callbacks never run. Separate pools are a bulkhead: the failure is contained to the feature that owns the pool. This is the same argument as separate connection pools, and it is worth making explicitly in a design round.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Finish the answer with the measurement, because it is what separates a memorised formula from experience: <em>"I would start from the formula, then look at the queue depth and the p99 wait time under load. If the queue is always empty the pool is too big; if it is always full the bound is downstream and a bigger pool will not help."</em></p>'
                }
            ],
            docs: [
                { title: 'Runtime.availableProcessors()', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Runtime.html#availableProcessors()', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'concurrency', questionId: 'thread-pool-sizing' }
            ]
        },

        {
            id: 'shutting-down',
            title: 'Shutdown, and the Two-Phase Idiom',
            importance: 'should-know',
            summary: 'shutdown() stops accepting and drains. shutdownNow() interrupts and returns what never ran. Neither one waits, which is the part that catches people.',
            interviewAngle: 'A precise, checkable question — the interviewer knows whether you have written the two-phase idiom or only read about it. The detail that shows the latter is forgetting that both methods return immediately and awaitTermination is what actually blocks.',
            buildsOn: ['why-a-pool'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'The two methods',
                    left: 'shutdown()',
                    right: 'shutdownNow()',
                    rows: [
                        { aspect: 'New submissions', left: 'Rejected from this moment', right: 'Rejected from this moment' },
                        { aspect: 'Queued tasks', left: 'All of them still run', right: 'Drained and <strong>returned to you</strong> as a <code>List&lt;Runnable&gt;</code>' },
                        { aspect: 'Running tasks', left: 'Allowed to finish', right: '<code>interrupt()</code> is called on every worker' },
                        { aspect: 'Blocks?', left: '<strong>No.</strong> Returns immediately', right: '<strong>No.</strong> Returns immediately' },
                        { aspect: 'Guaranteed to stop?', left: 'Only when every task terminates', right: 'No — a task that ignores interruption runs forever' }
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The idiom from the ExecutorService javadoc, and why it has two waits',
                    code: 'void shutdownGracefully(ExecutorService pool) {\n    pool.shutdown();                     // stop accepting; let the queue drain\n    try {\n        if (!pool.awaitTermination(30, TimeUnit.SECONDS)) {\n            List<Runnable> abandoned = pool.shutdownNow();\n            log.warn("{} tasks never started", abandoned.size());\n\n            // The SECOND wait: shutdownNow() only interrupts. Tasks in a\n            // blocking call need a moment to unwind after the interrupt.\n            if (!pool.awaitTermination(10, TimeUnit.SECONDS)) {\n                log.error("pool did not terminate");\n            }\n        }\n    } catch (InterruptedException e) {\n        pool.shutdownNow();\n        Thread.currentThread().interrupt();   // restore the flag. Always.\n    }\n}',
                    notes: '<p>The <code>catch</code> block is not boilerplate. <code>awaitTermination</code> throws if <em>this</em> thread is interrupted while waiting; swallowing that would leave the pool running and the interrupt lost, and this method is usually called from a shutdown hook that is itself on a deadline.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>An interrupt is a request, not a stop.</strong> <code>shutdownNow()</code> sets the interrupt flag and unblocks anything sitting in <code>sleep</code>, <code>wait</code>, <code>await</code> or a modern IO call. A task in a tight computational loop that never checks <code>Thread.currentThread().isInterrupted()</code> notices nothing at all, and the JVM will not exit while it runs on a non-daemon thread. If a task can run long, it has to poll the flag — nothing else can stop it.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>In Spring, a pool declared as an <code>@Bean</code> of type <code>ExecutorService</code> gets its <code>shutdown()</code> called automatically at context close, because the container treats <code>shutdown</code> as a destroy method by name. That is convenient and it is also only phase one — for a pool whose tasks matter, prefer <code>ThreadPoolTaskExecutor</code> with <code>setWaitForTasksToCompleteOnShutdown(true)</code> and an explicit <code>setAwaitTerminationSeconds(...)</code>.</p>'
                }
            ],
            docs: [
                { title: 'ExecutorService.shutdown()', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/ExecutorService.html#shutdown()', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'concurrency', questionId: 'shutdown-vs-shutdownnow' }
            ]
        },

        {
            id: 'callable-and-future',
            title: 'Future, and the Exception You Never Saw',
            importance: 'must-know',
            summary: 'submit() wraps the task in a Future and stores any exception inside it. If nobody calls get(), the failure is silent — and a silent failure is worse than a loud one.',
            interviewAngle: 'The trap question is "what is the difference between submit and execute". Almost everyone says "one returns a Future". The answer that matters is what happens to a thrown exception in each case, because that difference has hidden real production bugs.',
            buildsOn: ['why-a-pool'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'execute() against submit()',
                    left: 'execute(Runnable)',
                    right: 'submit(Callable or Runnable)',
                    rows: [
                        { aspect: 'Returns', left: '<code>void</code>', right: '<code>Future&lt;T&gt;</code>' },
                        { aspect: 'A thrown exception', left: 'Reaches the thread\'s <code>UncaughtExceptionHandler</code> — logged', right: '<strong>Captured into the Future.</strong> Nothing is logged' },
                        { aspect: 'You find out when', left: 'Immediately, in the log', right: 'When someone calls <code>get()</code>. If nobody does, never' },
                        { aspect: 'The worker thread', left: 'Dies and is replaced by the pool', right: 'Survives and takes the next task' },
                        { aspect: 'Use it for', left: 'Fire-and-forget work whose failure must be visible', right: 'Work whose result — or failure — you will actually collect' }
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The silent failure',
                    code: 'ExecutorService pool = Executors.newFixedThreadPool(4);\n\n// Nobody keeps the Future. The NPE inside process() vanishes.\nfor (Invoice invoice : invoices) {\n    pool.submit(() -> process(invoice));\n}\n\n// The fix is not "add a try/catch inside the lambda" -- it is to keep\n// the handle and look at it.\nList<Future<?>> futures = new ArrayList<>();\nfor (Invoice invoice : invoices) {\n    futures.add(pool.submit(() -> process(invoice)));\n}\nfor (Future<?> f : futures) {\n    try {\n        f.get();\n    } catch (ExecutionException e) {\n        log.error("invoice failed", e.getCause());   // the ORIGINAL exception\n    } catch (InterruptedException e) {\n        Thread.currentThread().interrupt();\n        break;\n    }\n}',
                    output: {
                        kind: 'trace',
                        lines: [
                            'In the first loop the task throws, ThreadPoolExecutor catches it inside FutureTask.run(), and stores it as the task\'s outcome.',
                            'No handler runs, nothing is logged, the worker takes the next invoice, and the batch reports success.',
                            'In the second loop get() rethrows it wrapped in an ExecutionException, and getCause() is the NullPointerException as originally thrown, with its original stack.',
                            'This is why "the nightly job says it processed 4,000 records but only 3,850 are in the database" is such a common bug report.'
                        ],
                        explain: '<p><code>ExecutionException</code> is a wrapper and always has a cause; logging the wrapper alone gives you a stack trace of <code>Future.get</code> and nothing about where the failure happened. Log <code>e.getCause()</code>, or rethrow it — never the wrapper on its own.</p>'
                    }
                },
                {
                    type: 'types',
                    title: 'What Future cannot do',
                    items: [
                        { name: 'Notify you', html: '<p>There is no callback. <code>get()</code> blocks and <code>isDone()</code> polls, and those are the only two ways to find out. This one limitation is the entire reason <code>CompletableFuture</code> exists.</p>' },
                        { name: 'Compose', html: '<p>Two dependent calls mean <code>get()</code>, then submit the second — and the thread is blocked in between, so a pool of 8 supports 8 in-flight chains, not 8 in-flight calls.</p>' },
                        { name: 'Complete from outside', html: '<p>Nothing can hand a <code>Future</code> its value; only the task that owns it can. This makes it useless as an adapter over a callback-based client.</p>' },
                        { name: 'Time out on its own', html: '<p><code>get(timeout)</code> times out <em>the wait</em>, not the task. The work carries on running in the pool afterwards, still holding whatever it holds.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong><code>invokeAll</code> blocks until every task finishes</strong>, including the slow one, and there is no partial result before then. It also returns <code>Future</code>s that are already done, so the <code>get()</code> calls do not block — meaning any exception is still sitting inside each one waiting to be looked at. The convenience of one call hides the same silent-failure problem.</p>'
                }
            ],
            docs: [
                { title: 'Future', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/Future.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'concurrency', questionId: 'submit-swallows-exceptions' },
                { topicId: 'concurrency', questionId: 'future-vs-completablefuture' }
            ]
        },

        {
            id: 'completablefuture-composition',
            title: 'CompletableFuture: Composing Without Blocking',
            importance: 'must-know',
            summary: 'thenApply for a plain function, thenCompose for one that returns another future, thenCombine for two independent results. Getting the first two confused is the classic mistake.',
            interviewAngle: 'The follow-up to "what is wrong with Future". Be ready to say which method you would use for a dependent call and why — thenApply on a future-returning function gives you a nested future, and that answer is the whole test.',
            buildsOn: ['callable-and-future'],
            blocks: [
                {
                    type: 'table',
                    title: 'The methods worth knowing by heart',
                    headers: ['Method', 'Takes', 'Gives', 'Use it when'],
                    rows: [
                        ['<code>thenApply</code>', '<code>Function&lt;T, U&gt;</code>', '<code>CF&lt;U&gt;</code>', 'The next step is a plain transformation'],
                        ['<code>thenCompose</code>', '<code>Function&lt;T, CF&lt;U&gt;&gt;</code>', '<code>CF&lt;U&gt;</code>', 'The next step is itself asynchronous — this is <code>flatMap</code>'],
                        ['<code>thenCombine</code>', 'another <code>CF</code> plus a <code>BiFunction</code>', '<code>CF&lt;V&gt;</code>', 'Two independent calls, then merge both results'],
                        ['<code>thenAccept</code>', '<code>Consumer&lt;T&gt;</code>', '<code>CF&lt;Void&gt;</code>', 'A side effect at the end of the chain'],
                        ['<code>allOf</code>', '<code>CF&lt;?&gt;...</code>', '<code>CF&lt;Void&gt;</code>', 'Fan out, then wait for all of them'],
                        ['<code>anyOf</code>', '<code>CF&lt;?&gt;...</code>', '<code>CF&lt;Object&gt;</code>', 'Race two sources; first answer wins']
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'thenApply against thenCompose, on the same dependent call',
                    code: 'CompletableFuture<User> user = findUser(id);\n\n// WRONG: getOrders returns a CompletableFuture, so this nests.\nCompletableFuture<CompletableFuture<List<Order>>> nested =\n        user.thenApply(u -> getOrders(u));\n\n// RIGHT: thenCompose flattens it.\nCompletableFuture<List<Order>> orders =\n        user.thenCompose(u -> getOrders(u));\n\n// Two calls with no dependency between them: start both, merge after.\nCompletableFuture<Profile> merged = findUser(id)\n        .thenCombine(findPreferences(id), Profile::new);',
                    notes: '<p>If you know <code>Optional</code> and <code>Stream</code>, you already know this: <code>thenApply</code> is <code>map</code> and <code>thenCompose</code> is <code>flatMap</code>. The names differ, the law does not. Note also that <code>thenCombine</code> only overlaps the two calls if both futures were already started — chaining the second one inside the first serialises them again.</p>'
                },
                {
                    type: 'prose',
                    html: '<p>The <code>*Async</code> variants of every method — <code>thenApplyAsync</code>, <code>thenComposeAsync</code> — change <em>which thread</em> runs the continuation, not whether it is asynchronous. Without <code>Async</code>, the continuation runs on whichever thread completed the previous stage, or on the calling thread if the stage was already complete by the time you attached it. With <code>Async</code> and no executor argument, it runs on the <strong>common ForkJoinPool</strong>.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>The common ForkJoinPool has <code>cores - 1</code> threads and is shared by the whole JVM.</strong> Parallel streams use it, and so does every <code>supplyAsync</code> that was not given an executor. Put a blocking database call on it and you have starved parallel streams everywhere in the process — including in libraries you did not write. Always pass your own executor: <code>supplyAsync(this::load, ioPool)</code>. On a single-core container the common pool has one thread, and a chain that waits on itself deadlocks outright.</p>'
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Fan out, then collect — allOf returns Void, which is the awkward part',
                    code: 'List<CompletableFuture<Quote>> calls = suppliers.stream()\n        .map(s -> CompletableFuture.supplyAsync(() -> quote(s), ioPool))\n        .toList();                    // materialise FIRST, or they run one by one\n\nCompletableFuture<List<Quote>> all =\n        CompletableFuture.allOf(calls.toArray(new CompletableFuture[0]))\n                .thenApply(ignored -> calls.stream()\n                        .map(CompletableFuture::join)   // all complete by now\n                        .toList());',
                    output: {
                        kind: 'trace',
                        lines: [
                            'toList() on the first stream is load-bearing: a lazy stream would start each call only as allOf consumed it, turning the fan-out back into a sequence.',
                            'allOf completes with null, so the results have to be read back out of the original futures.',
                            'join() is used rather than get() because inside a lambda a checked InterruptedException cannot be thrown — and by this point every future is already complete, so it cannot block.',
                            'One failure fails the whole allOf. To collect partial results, attach .exceptionally(...) to each individual call before the allOf.'
                        ],
                        explain: '<p><code>join()</code> and <code>get()</code> differ in exactly one way: <code>join</code> throws the unchecked <code>CompletionException</code>, <code>get</code> throws the checked <code>ExecutionException</code>. Both wrap the original, both need <code>getCause()</code>. Inside a stream, <code>join</code> is the one that compiles.</p>'
                    }
                }
            ],
            docs: [
                { title: 'CompletableFuture', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/CompletableFuture.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'concurrency', questionId: 'future-vs-completablefuture' },
                { topicId: 'concurrency', questionId: 'forkjoin-common-pool' }
            ]
        },

        {
            id: 'completablefuture-errors',
            title: 'Errors in a Chain',
            importance: 'should-know',
            summary: 'exceptionally recovers, handle sees both outcomes, whenComplete observes without changing anything. Choosing the wrong one silently swallows a failure.',
            interviewAngle: 'Asked as "how do you handle exceptions in a CompletableFuture". Naming all three and saying which one returns a value is the answer; the detail that impresses is that a failure skips every thenApply between the throw and the handler.',
            buildsOn: ['completablefuture-composition'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>An exception inside any stage completes that stage <em>exceptionally</em>. Every downstream <code>thenApply</code>, <code>thenCompose</code> and <code>thenAccept</code> is then skipped — not executed with a null, skipped entirely — and the failure propagates, wrapped in a <code>CompletionException</code>, until something handles it. That skipping behaviour is the useful part: a chain reads as the happy path, with the failure handling at the end.</p>'
                },
                {
                    type: 'types',
                    title: 'The three handlers',
                    items: [
                        { name: 'exceptionally(fn)', html: '<p>Runs <strong>only on failure</strong>. Takes the <code>Throwable</code>, returns a replacement value. This is the fallback: a cached price, an empty list, a default profile. The chain continues as if nothing went wrong.</p>' },
                        { name: 'handle(bifn)', html: '<p>Runs on <strong>both</strong> outcomes, taking <code>(value, throwable)</code> — exactly one of which is non-null — and returns a new value. Use it when success and failure map onto the same result type, such as a response DTO with a status field.</p>' },
                        { name: 'whenComplete(bicons)', html: '<p>Runs on both, returns <strong>nothing</strong>, and does not change the outcome. Logging, metrics, closing a resource. A failure passes straight through to the next stage, which is what makes it the right choice when you want to observe but not recover.</p>' }
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'A chain with a fallback, a timeout and a log line',
                    code: 'CompletableFuture<Price> price =\n        CompletableFuture.supplyAsync(() -> remotePrice(sku), ioPool)\n                .orTimeout(2, TimeUnit.SECONDS)          // Java 9+\n                .whenComplete((value, error) -> {\n                    if (error != null) meter.increment("price.failed");\n                })\n                .exceptionally(error -> cachedPrice(sku));\n\n// Ordering matters. Swap the last two and whenComplete sees the RECOVERED\n// value, never the error, and the metric never fires.',
                    notes: '<p><code>orTimeout</code> completes the future with a <code>TimeoutException</code> after the deadline; <code>completeOnTimeout(value, ...)</code> completes it with a fallback instead. Neither one cancels the work that is still running — the same limitation <code>Future.get(timeout)</code> has, and a reason to give the underlying HTTP client its own read timeout as well.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong><code>exceptionally</code> placed at the wrong point recovers too early.</strong> Attached mid-chain, it substitutes a default and the stages after it run on that default as though it were real data — a cached price silently becoming an invoice line. Put recovery where the fallback is genuinely equivalent to the real value, and nowhere else. And remember that a <code>CompletableFuture</code> nobody ever joins is a <code>Future</code> nobody ever gets: the same silent failure as the previous chapter, in newer clothes.</p>'
                }
            ],
            docs: [
                { title: 'CompletableFuture.exceptionally', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/CompletableFuture.html#exceptionally(java.util.function.Function)', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'concurrency', questionId: 'completablefuture-exceptions' }
            ]
        },

        {
            id: 'coordination-primitives',
            title: 'Latches, Barriers and Semaphores',
            importance: 'good-to-know',
            summary: 'Three coordination tools with one distinguishing property each: a latch is one-shot, a barrier is reusable, a semaphore counts permits.',
            interviewAngle: 'The reliable question here is CountDownLatch against CyclicBarrier, and one word answers it: reusable. A latch cannot be reset; a barrier resets itself once every party arrives.',
            buildsOn: ['shutting-down'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'CountDownLatch against CyclicBarrier',
                    left: 'CountDownLatch',
                    right: 'CyclicBarrier',
                    rows: [
                        { aspect: 'Reusable', left: '<strong>No.</strong> Once it reaches zero it stays there', right: '<strong>Yes.</strong> Resets automatically for the next round' },
                        { aspect: 'Who waits', left: 'Anyone; the counters need not be the waiters', right: 'The parties themselves, all of them' },
                        { aspect: 'Counts', left: 'Down, by any thread, any number of times', right: 'Arrivals, one per party per round' },
                        { aspect: 'Runs an action', left: 'No', right: 'Optionally, on the last thread to arrive' },
                        { aspect: 'Typical use', left: 'Wait for N services to report ready at startup', right: 'N workers iterating in lockstep over rounds' }
                    ]
                },
                {
                    type: 'definition',
                    term: 'Semaphore',
                    html: '<p>A counter of permits. <code>acquire()</code> takes one and blocks if none are left; <code>release()</code> returns one. It bounds <em>concurrent access to a resource</em> rather than the number of threads, which is why it is still useful in a virtual-thread world where the thread count is no longer the scarce thing.</p>'
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'A semaphore as a rate limit on a downstream that is not yours',
                    code: 'private final Semaphore permits = new Semaphore(10);\n\nReport render(Request request) throws InterruptedException {\n    permits.acquire();\n    try {\n        return renderer.render(request);      // at most 10 at a time\n    } finally {\n        permits.release();                    // ALWAYS in a finally\n    }\n}',
                    notes: '<p>A <code>release()</code> outside a <code>finally</code> leaks a permit on every exception, and a semaphore that has leaked all ten permits blocks forever with no error anywhere — the failure looks exactly like a hung downstream. Prefer <code>tryAcquire(timeout)</code> where shedding load is better than waiting.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>If you are on Java 21 or later, mention <code>StructuredTaskScope</code> as the modern answer to fan-out — noting that it is still a <strong>preview</strong> feature in Java 25: it makes the parent wait for its children by construction, propagates cancellation when one fails, and removes most of the reason to hand-roll a latch. It is covered in the virtual threads module.</p>'
                }
            ],
            docs: [
                { title: 'CountDownLatch', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/CountDownLatch.html', kind: 'api' },
                { title: 'Semaphore', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/Semaphore.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'concurrency', questionId: 'countdownlatch-vs-cyclicbarrier' }
            ]
        }
    ]
};
