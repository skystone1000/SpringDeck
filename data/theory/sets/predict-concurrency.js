/* ==========================================================================
   data/theory/sets/predict-concurrency.js — Predict, set 4 of 11

   TEN PUZZLES, AND NOT ONE OF THEM CLAIMS `stdout`. The plan lists this set
   as an artefact: 'stdout' set alongside java-core, collections and streams,
   and that is the one place the plan is wrong — a concurrency puzzle whose
   answer is a printed number is a puzzle whose answer is one observation on
   one machine on one run.

   CLAUDE.md states the rule this set obeys: never write an output pane for
   anything timing-dependent, machine-dependent or racy. A lost-update
   counter prints 9,731 here and 10,000 on a single-core container, and a
   deck that prints either is teaching that the number is the lesson. The
   number is not the lesson; the RACE is, and "the count is wrong, and which
   wrong number varies" is both the truthful answer and the more useful one.

   Every entry therefore declares artefact: 'behaviour' with a verification
   string saying what the answer was reasoned from — usually the Java Memory
   Model chapter of the JLS, which specifies these outcomes as permitted
   rather than as observed.
   ========================================================================== */

const predictConcurrencyModule = {
    id: 'predict-concurrency',
    trackId: 'output',
    order: 954,
    title: 'Concurrency',
    tagline: 'Visibility, atomicity, and the four ways a program silently never finishes.',
    estimatedMinutes: 30,
    prerequisites: [],
    docHub: {
        title: 'JLS 17 — Threads and Locks',
        url: 'https://docs.oracle.com/javase/specs/jls/se21/html/jls-17.html'
    },

    chapters: [
        {
            id: 'visibility-and-atomicity',
            title: 'Visibility and Atomicity',
            importance: 'must-know',
            summary: 'Two different bugs that look identical from the outside, and one keyword that fixes only one of them.',
            interviewAngle: 'The discriminating answer is that volatile fixes visibility and does nothing whatsoever for atomicity — a candidate who reaches for volatile on a counter has told you which one they do not understand.',
            buildsOn: [],
            blocks: [
                {
                    type: 'predict',
                    id: 'predict-concurrency-visibility-without-volatile',
                    importance: 'must-know',
                    artefact: 'behaviour',
                    verification: 'JLS 17.4 (Memory Model): with no happens-before edge between the write and the read, the read is not required to observe the write, and a JIT is permitted to hoist it out of the loop.',
                    language: 'java',
                    title: 'A loop that may never see the flag',
                    prompt: '<p>The main thread sets <code>running</code> to false after a second. What does the worker do?</p>',
                    code: 'public class Main {\n    static boolean running = true;          // NOT volatile\n\n    public static void main(String[] args) throws Exception {\n        Thread worker = new Thread(() -> {\n            long n = 0;\n            while (running) { n++; }\n            System.out.println("stopped after " + n);\n        });\n        worker.start();\n        Thread.sleep(1000);\n        running = false;\n        worker.join();\n        System.out.println("joined");\n    }\n}',
                    options: [
                        'It may never stop. Without volatile there is no guarantee the worker ever sees the write',
                        'It always stops within a few milliseconds of the write',
                        'It always hangs — a non-volatile field is never re-read',
                        'It throws IllegalMonitorStateException on join'
                    ],
                    answer: 0,
                    output: {
                        kind: 'trace',
                        lines: [
                            'There is no happens-before edge between the write in main and the read in the worker, so JLS 17.4 does not require the worker to observe it -- ever.',
                            'In practice a server JIT hoists the field read out of the loop and the program hangs; on a debug build or an interpreted run it usually stops. Both are legal.',
                            'That "both are legal" is why this is a behaviour puzzle and not an output puzzle: the observed answer depends on the JIT, the flags and the machine.',
                            'volatile on the field creates the edge and fixes it -- and fixes ONLY this. It does nothing for the next puzzle.',
                            'The same program with the loop body doing anything that synchronizes -- a println, a lock, a queue take -- usually stops, by accident, for reasons the author did not intend.'
                        ]
                    }
                },
                {
                    type: 'predict',
                    id: 'predict-concurrency-non-atomic-increment',
                    importance: 'must-know',
                    artefact: 'behaviour',
                    verification: 'JLS 17.4 and the java.util.concurrent.atomic package javadoc: ++ on a volatile int is a read, an add and a write, and volatile makes each of the three visible without making the sequence atomic.',
                    language: 'java',
                    title: 'volatile on a counter',
                    prompt: '<p>Four threads, 25,000 increments each, on a <code>volatile</code> field.</p>',
                    code: 'import java.util.concurrent.*;\n\npublic class Main {\n    static volatile int count = 0;\n\n    public static void main(String[] args) throws Exception {\n        ExecutorService pool = Executors.newFixedThreadPool(4);\n        CountDownLatch done = new CountDownLatch(4);\n        for (int t = 0; t < 4; t++) {\n            pool.submit(() -> {\n                for (int i = 0; i < 25_000; i++) count++;\n                done.countDown();\n            });\n        }\n        done.await();\n        pool.shutdown();\n        System.out.println(count);\n    }\n}',
                    options: [
                        'Some number at or below 100000, varying between runs',
                        'Exactly 100000 — volatile makes the increment atomic',
                        'Exactly 25000',
                        'It deadlocks on the latch'
                    ],
                    answer: 0,
                    output: {
                        kind: 'trace',
                        lines: [
                            'count++ is three operations: read, add one, write. volatile guarantees each is visible; it guarantees nothing about the three happening without interruption.',
                            'So two threads read the same value, both add one, both write -- and one increment is gone.',
                            'The result is at or below 100,000 and varies per run. It is occasionally exactly right on a lightly loaded machine, which is precisely why this bug reaches production.',
                            'AtomicInteger.incrementAndGet is a single compare-and-swap and is correct. LongAdder is faster under heavy contention because it spreads the write across cells.',
                            'The rule worth carrying: volatile is for a flag somebody else writes and you read. The moment your own value depends on the previous one, you need an atomic or a lock.'
                        ]
                    }
                },
                {
                    type: 'predict',
                    id: 'predict-concurrency-double-checked-locking-without-volatile',
                    importance: 'should-know',
                    artefact: 'behaviour',
                    verification: 'JLS 17.4 permits the constructor write and the reference write to be reordered, which is the documented reason the pre-Java-5 double-checked locking idiom is broken.',
                    language: 'java',
                    title: 'The idiom that was broken for years',
                    prompt: '<p>Double-checked locking, with the field not declared <code>volatile</code>.</p>',
                    code: 'public class Main {\n    static class Holder {\n        private final int value;\n        Holder() { this.value = 42; }\n        int value() { return value; }\n    }\n\n    private static Holder instance;      // NOT volatile\n\n    static Holder get() {\n        if (instance == null) {\n            synchronized (Main.class) {\n                if (instance == null) instance = new Holder();\n            }\n        }\n        return instance;\n    }\n\n    public static void main(String[] args) {\n        System.out.println(get().value());\n    }\n}',
                    options: [
                        'A second thread can see a non-null instance whose fields are not yet initialised',
                        'It is correct — the synchronized block publishes the object safely',
                        'It is correct because the field is final inside Holder',
                        'It can create two instances'
                    ],
                    answer: 0,
                    output: {
                        kind: 'trace',
                        lines: [
                            'The write that publishes the reference and the writes that initialise the object may be reordered, because nothing orders them for a thread that never enters the synchronized block.',
                            'So the first check can see a non-null reference to a half-built object. Not two objects -- one object, seen too early.',
                            'volatile on the field fixes it: since Java 5 a volatile write happens-before every subsequent volatile read of that field, which orders the constructor writes ahead of the publication.',
                            'The final field inside Holder is a real guarantee and is not enough here, because it protects the object only once the reference is safely published.',
                            'A static holder class -- initialisation-on-demand -- is simpler and correct by class-initialisation semantics, with no volatile and no synchronized at all.'
                        ]
                    }
                }
            ],
            docs: [
                { title: 'JLS 17.4 — Memory Model', url: 'https://docs.oracle.com/javase/specs/jls/se21/html/jls-17.html#jls-17.4', kind: 'spec' },
                { title: 'java.util.concurrent.atomic — package summary', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/atomic/package-summary.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'concurrency', questionId: 'volatile-what-it-does' },
                { topicId: 'concurrency', questionId: 'safe-publication' }
            ]
        },

        {
            id: 'executors-and-futures',
            title: 'Executors and Futures',
            importance: 'must-know',
            summary: 'Three ways a task or an exception disappears, and one way the JVM refuses to exit.',
            interviewAngle: 'That submit() swallows an exception into the Future is the single most common source of "the job just stopped running and nothing was logged".',
            buildsOn: ['visibility-and-atomicity'],
            blocks: [
                {
                    type: 'predict',
                    id: 'predict-concurrency-executor-not-shut-down-hangs-jvm',
                    importance: 'must-know',
                    artefact: 'behaviour',
                    verification: 'Executors.newFixedThreadPool javadoc and the JVM exit rule in the Thread javadoc: the JVM exits when the last non-daemon thread terminates, and pool threads are non-daemon.',
                    language: 'java',
                    title: 'main returns and the process does not',
                    prompt: '<p>The task finishes in a millisecond. What does the process do?</p>',
                    code: 'import java.util.concurrent.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        ExecutorService pool = Executors.newFixedThreadPool(2);\n        pool.submit(() -> System.out.println("work"));\n        System.out.println("main done");\n    }\n}',
                    options: [
                        'It prints both lines and then never exits',
                        'It prints both lines and exits normally',
                        'It exits before the task runs, so only "main done" is printed',
                        'It throws RejectedExecutionException'
                    ],
                    answer: 0,
                    output: {
                        kind: 'trace',
                        lines: [
                            'The JVM exits when the last non-daemon thread terminates, and the default thread factory makes non-daemon threads that park waiting for more work.',
                            'So both lines print, main returns, and the process sits there forever. In a container this is a deploy that never completes and a pod that never becomes ready.',
                            'shutdown() then awaitTermination() is the fix, and try-with-resources does it for you since Java 19 -- ExecutorService is now AutoCloseable.',
                            'A daemon thread factory also lets the JVM exit, and it does so by abandoning in-flight work, which is a different decision that should be made deliberately.',
                            'The ordering of the two printed lines is not fixed, which is another reason this is a behaviour puzzle: the pool thread and main run concurrently.'
                        ]
                    }
                },
                {
                    type: 'predict',
                    id: 'predict-concurrency-completablefuture-swallows-exception',
                    importance: 'must-know',
                    artefact: 'behaviour',
                    verification: 'CompletableFuture javadoc: a dependent stage is not run when the previous stage completes exceptionally, and an exceptional completion nobody joins on is never reported.',
                    language: 'java',
                    title: 'A stage that never runs and an exception nobody sees',
                    prompt: '<p>The supplier throws. What appears on the console?</p>',
                    code: 'import java.util.concurrent.*;\n\npublic class Main {\n    public static void main(String[] args) throws Exception {\n        CompletableFuture<String> f = CompletableFuture\n                .supplyAsync(() -> { throw new IllegalStateException("boom"); })\n                .thenApply(s -> { System.out.println("mapping"); return s + "!"; });\n\n        Thread.sleep(200);\n        System.out.println("done, isCompletedExceptionally=" + f.isCompletedExceptionally());\n    }\n}',
                    options: [
                        'Only the "done" line, with isCompletedExceptionally=true. Nothing prints the exception',
                        'A stack trace, then the "done" line',
                        '"mapping" then the "done" line',
                        'The program terminates with IllegalStateException'
                    ],
                    answer: 0,
                    output: {
                        kind: 'trace',
                        lines: [
                            'thenApply is skipped: a dependent stage does not run when the previous stage completed exceptionally, so "mapping" never prints.',
                            'The exception is stored in the future and goes nowhere else. Nobody calls join or get, so nothing throws and nothing logs.',
                            'This is the mechanism behind "the async job silently stopped working" -- there is no uncaught exception handler involved, because the exception was caught and boxed by design.',
                            'exceptionally(), handle() or whenComplete() are how you get it back. A .whenComplete((r, e) -> log(e)) at the end of every chain is worth making a habit.',
                            'Sleeping 200ms is what makes the observation possible at all; the exact interleaving is not guaranteed, which is why this is behaviour rather than output.'
                        ]
                    }
                },
                {
                    type: 'predict',
                    id: 'predict-concurrency-forkjoin-blocking-task-starves-the-pool',
                    importance: 'should-know',
                    artefact: 'behaviour',
                    verification: 'ForkJoinPool.commonPool javadoc and the parallel-stream section of the stream package summary: parallel streams execute on the common pool unless submitted to another one.',
                    language: 'java',
                    title: 'A parallel stream that blocks',
                    prompt: '<p>Two parallel streams, one of which does I/O.</p>',
                    code: 'import java.util.*;\nimport java.util.stream.*;\n\npublic class Main {\n    static String slowCall(int n) {\n        try { Thread.sleep(500); } catch (InterruptedException e) { }\n        return "r" + n;\n    }\n    public static void main(String[] args) {\n        new Thread(() -> IntStream.range(0, 100).parallel()\n                .forEach(n -> slowCall(n))).start();\n\n        long t = System.nanoTime();\n        long sum = IntStream.rangeClosed(1, 1_000_000).parallel().asLongStream().sum();\n        System.out.println(sum + " in " + (System.nanoTime() - t) / 1_000_000 + "ms");\n    }\n}',
                    options: [
                        'The sum is right, and it takes far longer than it should because both streams share the common pool',
                        'The sum is right and fast — each parallel stream gets its own pool',
                        'The sum is wrong, because the two streams interfere',
                        'It throws RejectedExecutionException'
                    ],
                    answer: 0,
                    output: {
                        kind: 'trace',
                        lines: [
                            'Every parallel stream in the JVM runs on ForkJoinPool.commonPool() unless it is submitted to a pool of its own.',
                            'The common pool has (cores - 1) workers. A hundred tasks sleeping half a second each occupy all of them, and the arithmetic stream waits.',
                            'The sum is still correct -- this is a throughput failure, not a correctness one, which is what makes it hard to attribute.',
                            'Two fixes: never do blocking work in a parallel stream, or submit the stream to your own ForkJoinPool, whose join then confines it.',
                            'The measured milliseconds vary by machine and by core count, so the number is deliberately not asserted here.'
                        ]
                    }
                }
            ],
            docs: [
                { title: 'ExecutorService — javadoc', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/ExecutorService.html', kind: 'api' },
                { title: 'CompletableFuture — javadoc', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/CompletableFuture.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'concurrency', questionId: 'submit-swallows-exceptions' },
                { topicId: 'concurrency', questionId: 'forkjoin-common-pool' }
            ]
        },

        {
            id: 'locks-latches-and-threadlocals',
            title: 'Locks, Latches and ThreadLocals',
            importance: 'must-know',
            summary: 'Three programs that stop making progress, and one that leaks a request into the next one.',
            interviewAngle: 'The ThreadLocal one is a real production incident in every pooled-thread application, and pinning is the virtual-thread version of the same idea.',
            buildsOn: ['executors-and-futures'],
            blocks: [
                {
                    type: 'predict',
                    id: 'predict-concurrency-threadlocal-leak-in-a-pool',
                    importance: 'must-know',
                    artefact: 'behaviour',
                    verification: 'ThreadLocal javadoc: the value is per THREAD, and a pooled thread outlives the task that set it. Reasoned, not observed.',
                    language: 'java',
                    title: 'The tenant id from the previous request',
                    prompt: '<p>A single-threaded pool, two tasks, one <code>ThreadLocal</code> that is set but never removed.</p>',
                    code: 'import java.util.concurrent.*;\n\npublic class Main {\n    static final ThreadLocal<String> TENANT = new ThreadLocal<>();\n\n    public static void main(String[] args) throws Exception {\n        ExecutorService pool = Executors.newSingleThreadExecutor();\n\n        pool.submit(() -> {\n            TENANT.set("acme");\n            System.out.println("task1 sees " + TENANT.get());\n        }).get();\n\n        pool.submit(() ->\n            System.out.println("task2 sees " + TENANT.get())\n        ).get();\n\n        pool.shutdown();\n    }\n}',
                    options: [
                        'task1 sees acme, then task2 sees acme — the value outlives the task',
                        'task1 sees acme, then task2 sees null',
                        'task2 throws IllegalStateException',
                        'Both see null, because the lambda is not the thread'
                    ],
                    answer: 0,
                    output: {
                        kind: 'trace',
                        lines: [
                            'A ThreadLocal is scoped to the THREAD, and a pool thread outlives every task that runs on it. Task 2 inherits task 1\'s value.',
                            'In a web application that is one tenant\'s identifier, one user\'s security context or one request\'s correlation id leaking into the next request on the same worker.',
                            'It is also a memory leak: the entry is held until the thread dies, and a pool thread does not die.',
                            'try { TENANT.set(x); ... } finally { TENANT.remove(); } is the only correct shape. Spring\'s own request-scoped machinery does exactly this in a filter.',
                            'Virtual threads change the leak half -- a virtual thread is per task and does die -- and change nothing about the correctness half if the value is inherited.'
                        ]
                    }
                },
                {
                    type: 'predict',
                    id: 'predict-concurrency-countdownlatch-await-never-returns',
                    importance: 'should-know',
                    artefact: 'behaviour',
                    verification: 'CountDownLatch javadoc: await returns when the count reaches zero, and a countDown skipped by an exceptional exit never happens.',
                    language: 'java',
                    title: 'The latch that is one short',
                    prompt: '<p>Three tasks, a latch of three, and one task that throws.</p>',
                    code: 'import java.util.concurrent.*;\n\npublic class Main {\n    public static void main(String[] args) throws Exception {\n        CountDownLatch latch = new CountDownLatch(3);\n        ExecutorService pool = Executors.newFixedThreadPool(3);\n\n        for (int i = 0; i < 3; i++) {\n            int n = i;\n            pool.submit(() -> {\n                if (n == 1) throw new IllegalStateException("boom");\n                latch.countDown();\n            });\n        }\n\n        latch.await();\n        System.out.println("all done");\n        pool.shutdown();\n    }\n}',
                    options: [
                        'It hangs forever on await, and the exception is never reported anywhere',
                        'It prints "all done" — the failed task still counts down',
                        'It prints a stack trace and then "all done"',
                        'await throws BrokenBarrierException'
                    ],
                    answer: 0,
                    output: {
                        kind: 'trace',
                        lines: [
                            'The throwing task exits before its countDown, so the latch stops at one and await never returns.',
                            'The exception is captured in the Future that submit returned and nobody looks at it, so there is no stack trace either. Two failures, one silence.',
                            'countDown belongs in a finally block -- that is the entire fix for the hang.',
                            'await(timeout, unit) is what stops a hang from being indefinite, and its false return is a signal to act on rather than to ignore.',
                            'execute() instead of submit() would at least route the exception to the thread\'s uncaught handler and log it.'
                        ]
                    }
                },
                {
                    type: 'predict',
                    id: 'predict-concurrency-reentrantlock-not-released-in-finally',
                    importance: 'must-know',
                    artefact: 'behaviour',
                    verification: 'ReentrantLock javadoc, which shows the lock/try/finally/unlock idiom precisely because the lock is not released by scope exit.',
                    language: 'java',
                    title: 'A lock released only on the happy path',
                    prompt: '<p>The first call throws. What happens to the second?</p>',
                    code: 'import java.util.concurrent.locks.*;\n\npublic class Main {\n    static final ReentrantLock LOCK = new ReentrantLock();\n\n    static void guarded(boolean fail) {\n        LOCK.lock();\n        if (fail) throw new IllegalStateException("boom");\n        LOCK.unlock();\n    }\n\n    public static void main(String[] args) throws Exception {\n        try { guarded(true); } catch (Exception e) { System.out.println("caught"); }\n\n        Thread other = new Thread(() -> { guarded(false); System.out.println("other got it"); });\n        other.start();\n        other.join();\n        System.out.println("end");\n    }\n}',
                    options: [
                        'It prints "caught" and then hangs — the lock was never released',
                        'It prints "caught", "other got it", "end"',
                        'It throws IllegalMonitorStateException on the second lock',
                        'It prints "caught" then "end", skipping the other thread'
                    ],
                    answer: 0,
                    output: {
                        kind: 'trace',
                        lines: [
                            'A ReentrantLock is not released by leaving the block. Unlike synchronized, there is no scope to exit -- unlock is a call, and a thrown exception skips it.',
                            'main holds the lock forever, the second thread blocks in lock(), join never returns, and the process hangs with no error.',
                            'lock(); try { ... } finally { LOCK.unlock(); } is the idiom the javadoc itself prints, for exactly this reason.',
                            'Note that main could take the lock again -- it is reentrant, and re-entering would raise the hold count rather than deadlocking against itself. It is the OTHER thread that is stuck.',
                            'This is the single strongest argument for synchronized where you do not need tryLock, a timeout, or an interruptible acquire: the release cannot be forgotten.'
                        ]
                    }
                },
                {
                    type: 'predict',
                    id: 'predict-concurrency-virtual-thread-pinned-by-synchronized',
                    importance: 'should-know',
                    artefact: 'behaviour',
                    verification: 'JEP 444 (Virtual Threads), the pinning section: a virtual thread cannot unmount while inside a synchronized block, so a blocking call there holds the carrier thread.',
                    language: 'java',
                    title: 'A million virtual threads, and none of them yielding',
                    prompt: '<p>The blocking call is inside a <code>synchronized</code> block.</p>',
                    code: 'import java.util.concurrent.*;\n\npublic class Main {\n    static final Object LOCK = new Object();\n\n    static void call() {\n        synchronized (LOCK) {                 // pins the carrier\n            try { Thread.sleep(100); } catch (InterruptedException e) { }\n        }\n    }\n\n    public static void main(String[] args) throws Exception {\n        try (var exec = Executors.newVirtualThreadPerTaskExecutor()) {\n            for (int i = 0; i < 10_000; i++) exec.submit(Main::call);\n        }\n        System.out.println("done");\n    }\n}',
                    options: [
                        'It completes, but takes roughly as long as a platform-thread pool would — the carriers are pinned and cannot be reused',
                        'It completes in about 100ms — virtual threads unmount while sleeping',
                        'It throws OutOfMemoryError creating ten thousand threads',
                        'It deadlocks'
                    ],
                    answer: 0,
                    output: {
                        kind: 'trace',
                        lines: [
                            'A virtual thread normally unmounts from its carrier when it blocks, which is the entire mechanism. Inside a synchronized block on JDK 21 it cannot, so the carrier is held for the whole sleep.',
                            'With the scheduler defaulting to one carrier per core, the ten thousand tasks are serialised across a handful of carriers -- the concurrency the virtual threads promised is gone and the code looks correct.',
                            'Every task also contends for the same monitor here, so this program would serialise anyway. Pinning is the failure that remains when the lock is uncontended.',
                            'Replacing synchronized with a ReentrantLock removes the pinning entirely: j.u.c locks are virtual-thread aware.',
                            'JDK 24 (JEP 491) removes the synchronized pinning limitation, so this is a version-scoped answer -- true of 21, and one of the reasons to name the version whenever you state it.'
                        ]
                    }
                }
            ],
            docs: [
                { title: 'JEP 444 — Virtual Threads', url: 'https://openjdk.org/jeps/444', kind: 'spec' },
                { title: 'ReentrantLock — javadoc', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/locks/ReentrantLock.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'concurrency', questionId: 'threadlocal-leaks' },
                { topicId: 'concurrency', questionId: 'virtual-thread-pinning' }
            ]
        }
    ]
};
