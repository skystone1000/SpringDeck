/* ==========================================================================
   data/theory/locks-and-synchronizers.js — module 20 in the reading path

   The fifth section 5.9 java-platform insertion, and the largest: twelve
   chapters covering java.util.concurrent.locks and the coordination classes
   that live beside it.

   It sits between threads-and-memory-model and executors-and-futures for a
   reason. The memory model chapter established what a lock GUARANTEES —
   mutual exclusion and a happens-before edge. This one is about the
   catalogue of things that provide that guarantee with different trade-offs,
   and about the fact that most of them are the wrong answer most of the
   time. The last chapter is the one that matters in an interview: choosing.

   Phaser is deliberately one short chapter rather than a full treatment.
   It is powerful, it is almost never used, and a module that gave it equal
   weight with CountDownLatch would be misrepresenting what gets asked.
   ========================================================================== */

const locksAndSynchronizersModule = {
    id: 'locks-and-synchronizers',
    trackId: 'java-platform',
    order: 20,
    title: 'Locks and Synchronizers',
    tagline: 'Everything in java.util.concurrent.locks, and when each one is the answer.',
    estimatedMinutes: 45,
    prerequisites: ['threads-and-memory-model'],
    docHub: { title: 'java.util.concurrent.locks', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/locks/package-summary.html' },

    chapters: [
        {
            id: 'reentrantlock-vs-synchronized',
            title: 'ReentrantLock Against synchronized',
            importance: 'must-know',
            summary: 'Identical semantics — mutual exclusion, reentrancy, a happens-before edge. ReentrantLock adds four capabilities the keyword cannot express, and takes away the compiler releasing it for you.',
            interviewAngle: 'Asked constantly. The answer that scores names the four capabilities rather than saying "the lock is more flexible", and then says which one to reach for by default.',
            buildsOn: [],
            blocks: [
                {
                    type: 'comparison',
                    title: 'What each can do',
                    left: 'synchronized',
                    right: 'ReentrantLock',
                    rows: [
                        { aspect: 'Mutual exclusion and reentrancy', left: 'Yes', right: 'Yes — identical' },
                        { aspect: 'Happens-before on release/acquire', left: 'Yes', right: 'Yes — identical' },
                        { aspect: 'Released automatically', left: '<strong>Yes, on every exit path including an exception</strong>', right: 'No. <code>finally</code>, every time, or the lock is held forever.' },
                        { aspect: 'Timed acquisition', left: 'No', right: '<code>tryLock(500, MILLISECONDS)</code>' },
                        { aspect: 'Interruptible while waiting', left: 'No — a blocked thread cannot be interrupted', right: '<code>lockInterruptibly()</code>' },
                        { aspect: 'Fairness option', left: 'No', right: '<code>new ReentrantLock(true)</code>' },
                        { aspect: 'Multiple condition variables', left: 'One wait set per object', right: '<code>newCondition()</code>, as many as you need' },
                        { aspect: 'Lock across method boundaries', left: 'No — block scoped', right: 'Yes, and that is usually a design smell' }
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The obligation the keyword handles for you',
                    code: 'private final ReentrantLock lock = new ReentrantLock();\n\nvoid transfer(Account from, Account to, Money amount) {\n    lock.lock();\n    try {\n        from.debit(amount);\n        to.credit(amount);\n    } finally {\n        lock.unlock();          // MANDATORY. Without it, an exception in\n    }                           // debit() leaks the lock and every other\n}                               // thread blocks forever.\n\n// The same code with the keyword. There is no unlock to forget.\nvoid transfer(Account from, Account to, Money amount) {\n    synchronized (this) {\n        from.debit(amount);\n        to.credit(amount);\n    }\n}\n\n// And the acquisition idiom that must NOT be inside the try:\nif (!lock.tryLock(500, MILLISECONDS)) return false;   // acquire first\ntry { ... } finally { lock.unlock(); }                // then guard',
                    notes: '<p>Putting <code>lock()</code> inside the <code>try</code> is a real bug and it looks tidier: if acquisition throws, the <code>finally</code> runs <code>unlock()</code> on a lock this thread never held, and you get <code>IllegalMonitorStateException</code> masking the original failure. Acquire, then <code>try</code>.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Default to <code>synchronized</code>. It is shorter, it cannot leak, it is what a reader expects, and modern JVMs optimise it heavily. Reach for <code>ReentrantLock</code> when you need one of the four capabilities in the table — and when you do, say which one, because "it is more flexible" is the answer of somebody who has not needed the flexibility.</p>'
                }
            ],
            docs: [
                { title: 'ReentrantLock', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/locks/ReentrantLock.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'concurrency', questionId: 'synchronized-vs-lock' }
            ]
        },

        {
            id: 'fairness',
            title: 'Fairness, and Why It Is Off',
            importance: 'should-know',
            summary: 'A fair lock hands ownership to the longest waiter. It removes starvation and costs a great deal of throughput, because every handoff becomes a context switch.',
            interviewAngle: 'A trade-off question with a definite answer: fairness is expensive, the default is unfair, and unfair is right unless you have measured starvation.',
            buildsOn: ['reentrantlock-vs-synchronized'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>An unfair lock lets a thread that arrives at exactly the right moment <em>barge</em> — take the lock ahead of threads already queued. That sounds wrong and is usually right: the barging thread is already running on a CPU, so it proceeds immediately, whereas handing the lock to a queued thread requires waking it, which is a context switch of a microsecond or more.</p><p>Under contention the difference is large — barging can be an order of magnitude better on throughput — and the cost is that a queued thread can, in principle, wait a long time. In practice the queue drains because the barging window is narrow.</p>'
                },
                {
                    type: 'table',
                    title: 'Where each is right',
                    headers: ['', 'Unfair (default)', 'Fair'],
                    rows: [
                        ['Throughput under contention', 'Much higher', 'Much lower'],
                        ['Worst-case waiting time', 'Unbounded in theory', 'Bounded by the queue'],
                        ['<code>tryLock()</code> with no timeout', 'Barges even on a fair lock — documented and deliberate', 'Same'],
                        ['Use when', 'Almost always', 'A held-for-a-long-time lock where one waiter being starved is a visible failure']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Fairness does not make anything deterministic.</strong> It orders <em>acquisition</em>, not execution, so it does not fix a test that depends on threads interleaving in a particular way. Reaching for a fair lock to stabilise a flaky concurrent test slows the code down and leaves the test flaky, which is the worst of both.</p>'
                }
            ],
            docs: [
                { title: 'ReentrantLock — fairness', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/locks/ReentrantLock.html', kind: 'api' }
            ],
            relatedQuestions: []
        },

        {
            id: 'trylock-and-timeouts',
            title: 'tryLock and Timeouts',
            importance: 'must-know',
            summary: 'The capability that has no equivalent in the keyword: attempt to acquire, give up after a bound, and do something else. It is how you break a deadlock rather than diagnose one.',
            interviewAngle: 'The deadlock question has two answers — prevent it by lock ordering, or break it with timed acquisition. Having both, and knowing that ordering is preferable, is the full answer.',
            buildsOn: ['fairness'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Two locks, acquired without the possibility of deadlock',
                    code: '// The deadlock: two transfers in opposite directions, each holding one\n// lock and waiting for the other. Classic, and it is the four\n// conditions from the memory-model module in three lines.\n\n// Fix 1, PREFERRED: a global ordering. Nobody can hold A and want B\n// while somebody holds B and wants A, because both take them in the\n// same order.\nvoid transfer(Account a, Account b, Money amount) {\n    Account first  = a.id() < b.id() ? a : b;\n    Account second = a.id() < b.id() ? b : a;\n    synchronized (first) {\n        synchronized (second) { a.debit(amount); b.credit(amount); }\n    }\n}\n\n// Fix 2: timed acquisition. Works when no ordering exists -- locks\n// obtained from a third party, or a lock plus an external resource.\nboolean transfer(Account a, Account b, Money amount) throws InterruptedException {\n    if (!a.lock().tryLock(200, MILLISECONDS)) return false;\n    try {\n        if (!b.lock().tryLock(200, MILLISECONDS)) return false;\n        try { a.debit(amount); b.credit(amount); return true; }\n        finally { b.lock().unlock(); }\n    } finally { a.lock().unlock(); }\n}',
                    notes: '<p>The second version turns a deadlock into a failed attempt, which the caller must then handle — retry with backoff, or report. That is a real cost: the operation can now fail for a reason the domain does not recognise. Prefer the ordering when an ordering exists; it makes deadlock impossible rather than survivable.</p>'
                },
                {
                    type: 'tip',
                    html: '<p><code>tryLock()</code> with no arguments is the other useful form: it never blocks, so it is how you implement "do this if nobody else is doing it" — a housekeeping pass, a cache refresh, a metrics flush. If the lock is taken, somebody else is already doing the work and skipping is the correct behaviour, not a failure.</p>'
                }
            ],
            docs: [
                { title: 'Lock.tryLock', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/locks/Lock.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'concurrency', questionId: 'deadlock-four-conditions' }
            ]
        },

        {
            id: 'readwritelock',
            title: 'ReadWriteLock',
            importance: 'should-know',
            summary: 'Many readers or one writer. Pays off only when reads dominate heavily and each one is long enough to matter — otherwise the extra bookkeeping costs more than it saves.',
            interviewAngle: 'The trap is proposing it for a workload where a ConcurrentHashMap or a copy-on-write structure is simpler and faster. Knowing the conditions under which it wins is the real answer.',
            buildsOn: ['trylock-and-timeouts'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The shape, and the downgrade that is legal',
                    code: 'private final ReentrantReadWriteLock rw = new ReentrantReadWriteLock();\nprivate final Lock read  = rw.readLock();\nprivate final Lock write = rw.writeLock();\nprivate Map<String, Rate> rates = Map.of();\n\nRate lookup(String code) {\n    read.lock();\n    try { return rates.get(code); } finally { read.unlock(); }\n}\n\nvoid reload(Map<String, Rate> fresh) {\n    write.lock();\n    try { rates = fresh; } finally { write.unlock(); }\n}\n\n// DOWNGRADE (write -> read) is legal and useful:\nwrite.lock();\ntry {\n    rates = fresh;\n    read.lock();                 // acquire read while still holding write\n} finally { write.unlock(); }    // now holding read only\ntry { publish(rates); } finally { read.unlock(); }\n\n// UPGRADE (read -> write) DEADLOCKS. Two readers both waiting to\n// upgrade each hold a read lock the other must see released.',
                    notes: '<p>The upgrade deadlock is the classic mistake with this class and the API does not prevent it — <code>writeLock().lock()</code> while holding the read lock simply blocks forever. Release the read lock, take the write lock, and re-check the state, because it may have changed in between.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>For the example above, a <code>volatile</code> reference to an immutable map is better than the lock.</strong> Readers do a volatile read with no lock at all; the reload publishes a new map with one volatile write. No bookkeeping, no contention between readers, and no upgrade hazard. <code>ReadWriteLock</code> earns its keep when the protected state genuinely must be mutated in place and the read sections are long — a large structure that cannot be cheaply copied.</p>'
                }
            ],
            docs: [
                { title: 'ReentrantReadWriteLock', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/locks/ReentrantReadWriteLock.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'collections', questionId: 'copyonwritearraylist' }
            ]
        },

        {
            id: 'stampedlock',
            title: 'StampedLock',
            importance: 'good-to-know',
            summary: 'Adds an optimistic read mode that takes no lock at all and validates afterwards. Faster than ReadWriteLock for short reads, and not reentrant — which makes it easy to deadlock against yourself.',
            interviewAngle: 'A depth answer. The optimistic-read-then-validate pattern is the interesting part, and so is knowing that non-reentrancy makes it unsuitable for anything that calls back into itself.',
            buildsOn: ['readwritelock'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Optimistic read, validate, fall back',
                    code: 'private final StampedLock sl = new StampedLock();\nprivate double x, y;\n\ndouble distanceFromOrigin() {\n    long stamp = sl.tryOptimisticRead();      // NO lock is taken\n    double cx = x, cy = y;                    // read the fields\n    if (!sl.validate(stamp)) {                // did a writer intervene?\n        stamp = sl.readLock();                // yes -- pay for a real lock\n        try { cx = x; cy = y; } finally { sl.unlockRead(stamp); }\n    }\n    return Math.sqrt(cx * cx + cy * cy);\n}\n\n// Three warnings, all of them sharp:\n//   - NOT reentrant. Acquiring twice on one thread deadlocks.\n//   - The stamp is the token. Unlocking with the wrong one is a bug\n//     the compiler cannot see.\n//   - Values read optimistically may be INCONSISTENT with each other\n//     until validate() succeeds -- so do not act on them before then.',
                    notes: '<p>The third warning is the subtle one. Between reading <code>x</code> and reading <code>y</code> a writer may have changed both, so <code>cx</code> and <code>cy</code> can be from different states. That is fine here because nothing is done with them until <code>validate</code> passes — and it would be a serious bug if the method had, say, indexed an array with <code>cx</code> before validating.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Reach for this only with a measurement in hand. It is a specialist tool for short, read-dominated critical sections over a small amount of state, and the non-reentrancy plus stamp discipline makes it markedly easier to get wrong than anything else in this module.</p>'
                }
            ],
            docs: [
                { title: 'StampedLock', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/locks/StampedLock.html', kind: 'api' }
            ],
            relatedQuestions: []
        },

        {
            id: 'countdownlatch',
            title: 'CountDownLatch',
            importance: 'must-know',
            summary: 'A one-shot gate. Threads wait until a counter reaches zero, and once it does the latch stays open forever. It cannot be reset — that is CyclicBarrier.',
            interviewAngle: 'Half of the most-asked pairing in this area. The distinguishing facts are one-shot versus reusable, and who waits for whom.',
            buildsOn: ['stampedlock'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The two shapes it is used in',
                    code: '// (a) One thread waits for N workers to finish.\nCountDownLatch done = new CountDownLatch(tasks.size());\nfor (Task t : tasks) {\n    executor.submit(() -> {\n        try { t.run(); }\n        finally { done.countDown(); }    // FINALLY -- a thrown exception\n    });                                  // must not hang the waiter\n}\nif (!done.await(30, SECONDS)) {          // ALWAYS use the timed form\n    log.warn("{} task(s) did not finish", done.getCount());\n}\n\n// (b) N threads wait for one starting gun. Useful in tests that need\n//     real simultaneity.\nCountDownLatch start = new CountDownLatch(1);\nfor (int i = 0; i < 50; i++) {\n    executor.submit(() -> { start.await(); hammer(); });\n}\nstart.countDown();                       // all 50 released at once',
                    notes: '<p>Both idioms in this snippet contain a rule rather than a technique. <code>countDown()</code> in a <code>finally</code>, so a failing task still releases the waiter; and the timed <code>await</code>, so a bug becomes a logged warning after thirty seconds instead of a thread parked forever. An untimed <code>await()</code> in production code is nearly always a latent hang.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>On Java 21 and later, structured concurrency (<code>StructuredTaskScope</code>) replaces most uses of shape (a) — <strong>as a preview feature</strong>, still preview in Java 25, so say so if you offer it: it forks subtasks, joins them, propagates failure and cancels the rest, with the lifetime bounded by a try-with-resources block. If the target is 21 or later, say so — it is a better answer than a latch for fan-out and join.</p>'
                }
            ],
            docs: [
                { title: 'CountDownLatch', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/CountDownLatch.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'concurrency', questionId: 'countdownlatch-vs-cyclicbarrier' },
                { topicId: 'concurrency', questionId: 'structured-concurrency' }
            ]
        },

        {
            id: 'cyclicbarrier',
            title: 'CyclicBarrier',
            importance: 'should-know',
            summary: 'N threads wait for each other, then all proceed, then the barrier resets. Reusable, symmetric, and it can run an action when the last thread arrives.',
            interviewAngle: 'The other half of the pair. The strongest differentiator is that a latch is awaited by an outsider and a barrier is awaited by the participants themselves.',
            buildsOn: ['countdownlatch'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'The pair, side by side',
                    left: 'CountDownLatch',
                    right: 'CyclicBarrier',
                    rows: [
                        { aspect: 'Reusable', left: 'No — one shot', right: 'Yes, it resets automatically' },
                        { aspect: 'Who waits', left: 'Anyone; usually a thread that is not a worker', right: '<strong>The participants themselves</strong>' },
                        { aspect: 'Counting', left: 'Down, by explicit <code>countDown()</code>', right: 'Up, implicitly by arriving at <code>await()</code>' },
                        { aspect: 'Barrier action', left: 'None', right: 'A <code>Runnable</code> run by the last arriver, before any are released' },
                        { aspect: 'If one participant dies', left: 'The waiter blocks until the timeout', right: 'Everyone gets <code>BrokenBarrierException</code> — <strong>the whole barrier breaks</strong>' },
                        { aspect: 'Typical use', left: 'Wait for startup; fan out and join', right: 'Iterative parallel computation in phases' }
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Phased work, with an action between phases',
                    code: '// The barrier action runs ONCE, on the last thread to arrive, while\n// every other thread is still parked -- so it is a safe place to\n// aggregate without any additional locking.\nCyclicBarrier barrier = new CyclicBarrier(workers, () -> {\n    grid.publishGeneration();     // no other thread is running here\n    generation++;\n});\n\nfor (int w = 0; w < workers; w++) {\n    int slice = w;\n    executor.submit(() -> {\n        while (!converged) {\n            computeSlice(slice);\n            barrier.await();      // wait for the others; then all resume\n        }\n        return null;\n    });\n}',
                    notes: '<p>The "no other thread is running here" guarantee is the reason to prefer a barrier action over aggregating in one of the workers: it is a genuine exclusive window provided by the barrier, not a convention. It is also why an exception thrown by the action breaks the barrier for everybody, which is the right failure mode — a half-completed generation must not be published.</p>'
                }
            ],
            docs: [
                { title: 'CyclicBarrier', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/CyclicBarrier.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'concurrency', questionId: 'countdownlatch-vs-cyclicbarrier' }
            ]
        },

        {
            id: 'semaphore',
            title: 'Semaphore',
            importance: 'must-know',
            summary: 'A counter of permits. Acquire one to proceed, release it when done. It is how you bound concurrency against a resource that has a limit, which is most of them.',
            interviewAngle: 'The most practically useful class in this module, because "limit concurrent calls to a downstream service" is a real requirement and this is the two-line answer.',
            buildsOn: ['cyclicbarrier'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Bounding concurrency, and the release that must not be forgotten',
                    code: '// The vendor allows 10 concurrent calls. Not 10 per second -- 10 at\n// once. A semaphore is exactly this constraint.\nprivate final Semaphore permits = new Semaphore(10);\n\nQuote fetch(Request r) throws InterruptedException {\n    if (!permits.tryAcquire(2, SECONDS)) {\n        throw new Overloaded("no capacity for the pricing service");\n    }\n    try {\n        return client.call(r);\n    } finally {\n        permits.release();     // FINALLY -- a leaked permit is permanent,\n    }                          // and ten leaks close the service down\n}\n\n// A binary semaphore is a mutex that is NOT reentrant and NOT owned:\nSemaphore mutex = new Semaphore(1);\n// -- any thread may release it, including one that never acquired it.\n// That is occasionally exactly what you want (a handoff between two\n// threads) and is otherwise a footgun. Use a Lock for mutual exclusion.',
                    notes: '<p>The timed <code>tryAcquire</code> is doing load shedding: rather than queueing an unbounded number of threads against a saturated dependency, it fails fast with a domain error the caller can turn into a 503. That is the same instinct the resilience module builds on, arriving here first and much more cheaply.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The distinction to keep straight, because interviews probe it: a <strong>semaphore bounds concurrency</strong> — how many at once — and a <strong>rate limiter bounds throughput</strong> — how many per unit time. "Ten concurrent connections" is a semaphore; "a hundred requests per second" is a rate limiter. Using one for the other is a common design error, and neither substitutes for the other under bursty load.</p>'
                }
            ],
            docs: [
                { title: 'Semaphore', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/Semaphore.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'caching-scale', questionId: 'rate-limiting-algorithms' },
                { topicId: 'microservices', questionId: 'bulkhead-isolation' }
            ]
        },

        {
            id: 'phaser-in-outline',
            title: 'Phaser, in Outline',
            importance: 'good-to-know',
            summary: 'A reusable barrier where the number of participants can change between phases. More capable than CyclicBarrier, more complicated, and rarely the right tool.',
            interviewAngle: 'Worth one sentence: it exists, it generalises the barrier to a dynamic party count, and reaching for it is usually a sign the problem wants a different decomposition.',
            buildsOn: ['semaphore'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p><code>Phaser</code> is <code>CyclicBarrier</code> with two extra abilities: parties may <strong>register and deregister dynamically</strong> between phases, and a phaser can be hierarchical, so thousands of participants can be split into tiers to reduce contention. It also exposes the phase number, so a participant can tell which round it is in.</p><p>The cases that genuinely need it — a parallel computation where the number of workers changes as work is discovered — are rare, and the API is substantially harder to reason about. In an interview, naming it and saying why you would probably not use it is the correct depth.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>If a design seems to want a phaser, check whether the problem is really "fan out, wait, fan out again" — which is a <code>CompletableFuture</code> chain, or on Java 21 a <code>StructuredTaskScope</code> per round. Those express the same shape with a lifetime you can see, and neither requires anybody to reason about party registration.</p>'
                }
            ],
            docs: [
                { title: 'Phaser', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/Phaser.html', kind: 'api' }
            ],
            relatedQuestions: []
        },

        {
            id: 'abstractqueuedsynchronizer',
            title: 'What They Are All Built On',
            importance: 'good-to-know',
            summary: 'AbstractQueuedSynchronizer: an integer state, a CAS to change it, and a FIFO queue of parked threads. ReentrantLock, Semaphore, CountDownLatch and the read-write lock are all thin subclasses.',
            interviewAngle: 'A depth question that pays off because it unifies the module. One mechanism, four different meanings assigned to the same int.',
            buildsOn: ['phaser-in-outline'],
            blocks: [
                {
                    type: 'table',
                    title: 'One int, four meanings',
                    headers: ['Class', 'What the AQS state holds', 'Acquire succeeds when'],
                    rows: [
                        ['<code>ReentrantLock</code>', 'Hold count — 0 is free, n is held n times reentrantly', 'State is 0, or the owner is the current thread'],
                        ['<code>Semaphore</code>', 'Permits remaining', 'State &gt; 0, and the CAS to decrement wins'],
                        ['<code>CountDownLatch</code>', 'The remaining count', 'State is 0 — so it never blocks again once it reaches zero'],
                        ['<code>ReentrantReadWriteLock</code>', 'Read count in the high 16 bits, write count in the low 16', 'Depends which half you are asking for']
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>The machinery underneath is the same in every case: a <code>volatile int state</code>, compare-and-swap to change it, and a lock-free FIFO queue of waiting threads parked with <code>LockSupport.park</code>. A subclass supplies only <code>tryAcquire</code> and <code>tryRelease</code>, deciding what the integer means; AQS handles queueing, parking, unparking, cancellation and the timed and interruptible variants.</p><p>That is why <code>CountDownLatch</code> cannot be reset — its <code>tryAcquire</code> is "state == 0", and once the state reaches zero nothing in the class moves it back. The limitation is not an oversight; it falls directly out of the two lines the subclass implements.</p>'
                }
            ],
            docs: [
                { title: 'AbstractQueuedSynchronizer', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/locks/AbstractQueuedSynchronizer.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'concurrency', questionId: 'atomic-classes-and-cas' }
            ]
        },

        {
            id: 'forkjoinpool-and-work-stealing',
            title: 'ForkJoinPool and Work Stealing',
            importance: 'should-know',
            summary: 'A pool where each thread has its own deque and idle threads steal from the tail of others. Designed for divide-and-conquer, and it is what parallel streams and CompletableFuture use by default.',
            interviewAngle: 'The commonPool sharing question. Everything using the default pool competes for the same threads, and one blocking task in it stalls unrelated work across the whole JVM.',
            buildsOn: ['abstractqueuedsynchronizer'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>An ordinary <code>ThreadPoolExecutor</code> has one shared queue, which every worker contends on. A <code>ForkJoinPool</code> gives each worker its own double-ended queue: the worker pushes and pops at the head with no synchronisation at all, and an idle worker <em>steals</em> from the tail of somebody else\'s deque. Stealing from the opposite end means the thief takes the oldest, largest task while the owner keeps working on the newest, smallest — which is exactly right for recursive splitting.</p><p>The default parallelism of the common pool is <code>availableProcessors() - 1</code>, plus the submitting thread, so on an eight-core machine it is seven worker threads for the entire JVM.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>The common pool is shared by every parallel stream, every unconfigured <code>CompletableFuture.supplyAsync</code>, and every library in your dependency tree that uses either.</strong> A single blocking call inside one of those — an HTTP request, a JDBC query — occupies a worker for its whole duration, and with seven workers a handful of them stall parallel work everywhere in the process, including in code that has nothing to do with yours. That is the most consequential fact in this chapter.</p>'
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Do not put blocking work in the common pool',
                    code: '// WRONG: blocking I/O on the common pool.\nList<Quote> quotes = ids.parallelStream()\n        .map(id -> httpClient.fetch(id))     // blocks a shared worker\n        .toList();\n\n// Better: your own pool, sized for waiting rather than for CPUs.\nExecutorService io = Executors.newFixedThreadPool(32);\nList<CompletableFuture<Quote>> futures = ids.stream()\n        .map(id -> CompletableFuture.supplyAsync(() -> httpClient.fetch(id), io))\n        .toList();\n\n// Best on Java 21: a virtual thread per task. Blocking is cheap again,\n// because a blocked virtual thread releases its carrier.\ntry (var scope = Executors.newVirtualThreadPerTaskExecutor()) {\n    List<Future<Quote>> results = scope.invokeAll(\n            ids.stream().map(id -> (Callable<Quote>) () -> httpClient.fetch(id)).toList());\n}\n\n// Parallel streams are for CPU-bound work over a large collection.\n// That is the whole of their remit.',
                    notes: '<p>Virtual threads change the reasoning rather than the rule. Blocking a virtual thread is cheap because the carrier is released, so a thread-per-task executor handles thousands of concurrent blocking calls — but the common pool\'s carrier threads are still a bounded shared resource, and a <code>synchronized</code> block around a blocking call still pins the carrier. The advice not to block the common pool survives.</p>'
                }
            ],
            docs: [
                { title: 'ForkJoinPool', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/ForkJoinPool.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'concurrency', questionId: 'forkjoin-common-pool' },
                { topicId: 'streams-functional', questionId: 'parallel-stream-common-pool' }
            ]
        },

        {
            id: 'choosing-a-synchronizer',
            title: 'Choosing One',
            importance: 'must-know',
            summary: 'Start from the question "what am I coordinating", and most of the time the answer is a concurrent collection rather than anything in this module.',
            interviewAngle: 'The chapter that turns the catalogue into an answer. Reaching for the simplest thing that works, and saying why the more elaborate options are unnecessary here, is what gets marked.',
            buildsOn: ['forkjoinpool-and-work-stealing'],
            blocks: [
                {
                    type: 'table',
                    title: 'From the requirement to the tool',
                    headers: ['What you need', 'Use', 'Not'],
                    rows: [
                        ['Protect a few lines of state', '<code>synchronized</code>', 'A <code>ReentrantLock</code> whose extra features you do not use'],
                        ['A single counter', '<code>AtomicLong</code> or <code>LongAdder</code>', 'A lock around <code>count++</code>'],
                        ['A shared map', '<code>ConcurrentHashMap</code> with <code>compute</code>/<code>merge</code>', 'A lock around a <code>HashMap</code>'],
                        ['A producer/consumer handoff', '<code>BlockingQueue</code>', '<code>wait</code>/<code>notify</code>, ever'],
                        ['Bound concurrent access to a resource', '<code>Semaphore</code>', 'A lock, which bounds it to one'],
                        ['Wait for N things to finish once', '<code>CountDownLatch</code>, or <code>StructuredTaskScope</code> on 21+', '<code>Thread.join</code> in a loop'],
                        ['Repeatedly synchronise N workers in phases', '<code>CyclicBarrier</code>', '<code>CountDownLatch</code> — it does not reset'],
                        ['Give up if the lock is busy', '<code>tryLock</code>', '<code>synchronized</code>, which cannot'],
                        ['Read-mostly state that is replaced wholesale', 'A <code>volatile</code> reference to an immutable object', '<code>ReadWriteLock</code>'],
                        ['Read-mostly state mutated in place, long reads', '<code>ReentrantReadWriteLock</code>', '<code>StampedLock</code>, unless measured']
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>The framing that reads as experience: <em>"My first question is whether I need a lock at all — most shared state in a service is either a counter, which is an atomic, or a map, which is a <code>ConcurrentHashMap</code> with an atomic <code>compute</code>. If I do need one I start with <code>synchronized</code> and move to <code>ReentrantLock</code> only when I need a timeout or interruptibility, because those are the two things the keyword cannot do."</em></p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>The most expensive mistake in this whole area is holding a lock across I/O.</strong> A database call, an HTTP request or a log write inside a synchronised block converts a microsecond critical section into a hundred-millisecond one, and every other thread queues behind it. Under load it looks exactly like a deadlock in a thread dump — many threads blocked on one monitor — and the fix is not a better lock; it is doing the I/O outside the critical section.</p>'
                }
            ],
            docs: [
                { title: 'java.util.concurrent — package summary', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/package-summary.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'concurrency', questionId: 'synchronized-vs-lock' },
                { topicId: 'collections', questionId: 'atomic-compound-operations' }
            ]
        }
    ]
};
