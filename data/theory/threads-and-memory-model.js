/* ==========================================================================
   data/theory/threads-and-memory-model.js — module 19 in the reading path

   Eight chapters. The memory model is the hard part and it comes third,
   because every practical rule after it — volatile, synchronized, atomics,
   immutability — is a way of establishing the same relation.
   ========================================================================== */

const threadsAndMemoryModelModule = {
    id: 'threads-and-memory-model',
    trackId: 'java-platform',
    order: 19,
    title: 'Threads and the Java Memory Model',
    tagline: 'happens-before, and why your field was stale.',
    estimatedMinutes: 50,
    prerequisites: ['objects-and-contracts'],
    docHub: { title: 'JLS 17 — Threads and Locks', url: 'https://docs.oracle.com/javase/specs/jls/se21/html/jls-17.html' },

    chapters: [
        {
            id: 'thread-lifecycle',
            title: 'The Six Thread States',
            importance: 'should-know',
            summary: 'RUNNABLE does not mean running, and it also covers a thread blocked on a socket read — which is why a thread dump needs reading rather than counting.',
            interviewAngle: 'A warm-up until the follow-up, which is worth preparing: what is the difference between BLOCKED and WAITING. The answer distinguishes contention for a lock from waiting for a condition, and those need completely different fixes.',
            buildsOn: [],
            blocks: [
                {
                    type: 'types',
                    title: 'Thread.State, and what each one means in a thread dump',
                    items: [
                        { name: 'NEW', html: '<p>Constructed, <code>start()</code> not yet called. You will not see this in a dump.</p>' },
                        { name: 'RUNNABLE', html: '<p>Eligible to run — running, or waiting for a CPU. <strong>Also the state of a thread blocked in a native socket read</strong>, because the JVM cannot see the difference. A dump full of RUNNABLE threads sitting in <code>SocketInputStream.read</code> is an IO-bound service, not a busy one.</p>' },
                        { name: 'BLOCKED', html: '<p>Waiting to acquire a <strong>monitor</strong> — a <code>synchronized</code> block someone else holds. Nothing else produces this state, which makes it a precise signal: BLOCKED threads mean lock contention, full stop.</p>' },
                        { name: 'WAITING', html: '<p>Waiting indefinitely for another thread: <code>Object.wait()</code>, <code>Thread.join()</code>, <code>LockSupport.park()</code>. Someone must act to release it.</p>' },
                        { name: 'TIMED_WAITING', html: '<p>The same with a deadline: <code>sleep</code>, <code>wait(ms)</code>, <code>await(timeout)</code>, <code>parkNanos</code>.</p>' },
                        { name: 'TERMINATED', html: '<p>Finished, normally or by an uncaught exception. A thread cannot be restarted.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>The distinction that matters in an incident: BLOCKED is a lock problem, WAITING is usually a pool or dependency problem.</strong> Fifty threads BLOCKED on one monitor means a synchronised section is the bottleneck. Fifty threads WAITING on a connection pool means the pool is exhausted or the database is slow. They look similar in a dashboard and have nothing in common as fixes, and confusing them sends an investigation in the wrong direction for an hour.</p>'
                }
            ],
            docs: [
                { title: 'Thread.State', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Thread.State.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'concurrency', questionId: 'thread-interruption' }
            ]
        },

        {
            id: 'visibility-and-reordering',
            title: 'Two Problems, Not One',
            importance: 'must-know',
            summary: 'A race condition is about interleaving. A visibility failure is about one thread never seeing the other\'s write at all. Fixing the first does not fix the second.',
            interviewAngle: 'The question is usually "what is a race condition", and the discriminating answer separates it from a visibility failure. Most candidates describe only interleaving, which means they will reach for a lock in situations where a lock is not what is missing.',
            buildsOn: ['thread-lifecycle'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'The two failure modes',
                    left: 'Race condition',
                    right: 'Visibility failure',
                    rows: [
                        { aspect: 'The problem', left: 'Two threads interleave inside a compound operation', right: 'One thread never observes the other\'s write' },
                        { aspect: 'Classic example', left: '<code>if (!map.containsKey(k)) map.put(k, v)</code>', right: 'A <code>boolean running</code> flag that never turns false' },
                        { aspect: 'Caused by', left: 'Non-atomic read-modify-write', right: 'Caches, registers, and compiler reordering' },
                        { aspect: 'Reproducible?', left: 'Sometimes, under load', right: '<strong>Often only in production</strong>, and only when the JIT compiles the loop' },
                        { aspect: 'Fixed by', left: 'Atomicity — a lock, or an atomic operation', right: 'A happens-before edge — <code>volatile</code>, a lock, or immutability' },
                        { aspect: 'A lock fixes it?', left: 'Yes', right: 'Yes, incidentally — a lock provides both' }
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The flag that never flips',
                    code: 'class Worker implements Runnable {\n    private boolean running = true;      // not volatile\n\n    public void run() {\n        while (running) {\n            // ... do work\n        }\n    }\n\n    public void stop() { running = false; }\n}\n\n// Another thread calls stop(). The loop may never exit.',
                    output: {
                        kind: 'trace',
                        lines: [
                            'Nothing in the loop body reads or writes running, and nothing establishes a happens-before edge with the writing thread.',
                            'The JIT is therefore entitled to hoist the read out of the loop: it becomes `if (running) while (true) { ... }`.',
                            'That is a legal transformation for a single thread, and the memory model says a data race gets no stronger guarantee.',
                            'It typically runs correctly for the first few thousand iterations — interpreted — and hangs once C2 compiles the method. Which is to say, in production, after warmup, never in a unit test.'
                        ],
                        explain: '<p>There is no lock missing here: the write is a single assignment and there is no compound operation to make atomic. What is missing is the <em>ordering edge</em>. Marking <code>running</code> as <code>volatile</code> fixes it, and so would reading it through a <code>synchronized</code> accessor — for the same underlying reason, which is the subject of the next chapter.</p>'
                    }
                },
                {
                    type: 'tip',
                    html: '<p>Separate them out loud: <em>"Two different problems. A race condition is an interleaving problem — a compound operation that is not atomic. A visibility problem is that a thread never sees another thread\'s write at all, because of caching and reordering. A lock fixes both, which is why people think there is only one; volatile fixes only the second."</em></p>'
                }
            ],
            docs: [
                { title: 'JLS 17.4 — Memory Model', url: 'https://docs.oracle.com/javase/specs/jls/se21/html/jls-17.html#jls-17.4', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'concurrency', questionId: 'race-condition-vs-visibility' }
            ]
        },

        {
            id: 'happens-before',
            title: 'happens-before',
            importance: 'must-know',
            summary: 'The one relation the memory model defines. Every concurrency primitive in Java is a way of creating an edge in it, and every visibility bug is a missing edge.',
            interviewAngle: 'The hardest question in the concurrency round and the one that most separates candidates. A definition is worth something; being able to say "the fix is to establish an edge, and here are three ways" is worth much more, because it turns a list of primitives into one idea.',
            buildsOn: ['visibility-and-reordering'],
            blocks: [
                {
                    type: 'definition',
                    term: 'happens-before',
                    important: true,
                    html: '<p>A partial order over actions. If action A <em>happens-before</em> action B, then everything A wrote is guaranteed visible to B, and the compiler and CPU may not reorder them in any way an observer could detect. If there is <strong>no</strong> happens-before edge between a write and a read of the same non-final field, that is a <em>data race</em> and the read may return any value the field has ever held.</p>'
                },
                {
                    type: 'types',
                    title: 'Where the edges come from',
                    items: [
                        { name: 'Program order', html: '<p>Within a single thread, each action happens-before the next in source order. This is why single-threaded code appears sequential no matter what the CPU actually does.</p>' },
                        { name: 'Monitor lock', html: '<p>An <code>unlock</code> happens-before every subsequent <code>lock</code> of the <strong>same</strong> monitor. Different monitors give you nothing — synchronising on two different objects establishes no edge at all.</p>' },
                        { name: 'volatile', html: '<p>A write to a <code>volatile</code> field happens-before every subsequent read of that field. This is the cheapest edge available and the one <code>volatile</code> exists for.</p>' },
                        { name: 'Thread start', html: '<p>Everything a thread did before calling <code>t.start()</code> happens-before anything inside <code>t</code>. Which is why passing data to a thread through its constructor is safe.</p>' },
                        { name: 'Thread termination', html: '<p>Everything a thread did happens-before another thread returning from <code>t.join()</code>, or from <code>isAlive()</code> observing it as finished.</p>' },
                        { name: 'Final fields', html: '<p>A correctly constructed object\'s <code>final</code> fields are visible to any thread that sees the reference, with no synchronisation. This is the guarantee that makes immutable objects safe to share.</p>' },
                        { name: 'Transitivity', html: '<p>If A happens-before B and B happens-before C, then A happens-before C. This is what lets a single <code>volatile</code> write publish a whole object graph written before it.</p>' }
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>Transitivity is the part worth understanding rather than memorising, because it is how the <strong>safe publication</strong> idiom works. Write the fields of a new object, then write its reference to a <code>volatile</code> field. Another thread reads the <code>volatile</code> reference and — by the volatile edge plus program order on both sides — is guaranteed to see every one of those field writes. One cheap edge publishes an arbitrarily large graph, and this is exactly what <code>ConcurrentHashMap</code>, the concurrent collections and every double-checked-locking implementation rely on.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>"It worked when I tested it" is not evidence about a data race.</strong> A racy program is not guaranteed to fail — it is guaranteed to have no guarantee. It will typically behave correctly while interpreted, correctly under a debugger (which suppresses many optimisations), and incorrectly once the JIT compiles the hot path on a machine with more cores than your laptop. The memory model is a contract about what you are <em>entitled</em> to, and testing cannot establish entitlement.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Reduce all of it to one sentence and then expand on request: <em>"happens-before is the only ordering guarantee the memory model gives you. Every concurrency tool in Java — volatile, synchronized, the atomics, the concurrent collections, final fields — exists to create an edge in it, and every visibility bug is a place where no edge exists."</em></p>'
                }
            ],
            docs: [
                { title: 'JLS 17.4.5 — Happens-before Order', url: 'https://docs.oracle.com/javase/specs/jls/se21/html/jls-17.html#jls-17.4.5', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'concurrency', questionId: 'happens-before' },
                { topicId: 'concurrency', questionId: 'safe-publication' }
            ]
        },

        {
            id: 'volatile',
            title: 'What volatile Does, and What It Does Not',
            importance: 'must-know',
            summary: 'Visibility and ordering. Not atomicity — which is why a volatile counter is still wrong.',
            interviewAngle: 'Asked constantly, and the discriminating half is the negative. Anyone can say "it makes the variable visible to other threads". The candidate who adds "but i++ is still broken because it is three operations" has understood what it is not.',
            buildsOn: ['happens-before'],
            blocks: [
                {
                    type: 'types',
                    title: 'The three things it gives you',
                    items: [
                        { name: 'Visibility', html: '<p>A write is published to every thread; a read comes from memory rather than from a register or a stale cache line. This is the happens-before edge from the previous chapter.</p>' },
                        { name: 'Ordering', html: '<p>Reads and writes of other variables are not reordered across the volatile access. This is what makes the safe-publication idiom work, and it is the half people forget.</p>' },
                        { name: 'Atomicity of the access itself', html: '<p>A <code>volatile long</code> or <code>double</code> is read and written atomically. Without <code>volatile</code>, a 64-bit write is permitted to be split into two 32-bit writes, so a reader can observe half of one value and half of another — <em>word tearing</em>. Rare on modern 64-bit hardware, and still permitted by the specification.</p>' }
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The thing it does not give you',
                    code: 'volatile int count = 0;\n\nvoid increment() {\n    count++;         // STILL BROKEN with 1000 threads\n}\n\n// count++ is three operations:\n//   1. read count\n//   2. add one\n//   3. write count\n// volatile makes each of them visible. It does not make the three\n// of them one, so two threads can both read 7 and both write 8.\n\n// The fixes, in order of preference:\nAtomicInteger atomic = new AtomicInteger();\natomic.incrementAndGet();          // one CAS, lock-free\n\nLongAdder adder = new LongAdder();\nadder.increment();                 // striped; far better under contention\n\nsynchronized void increment2() { count++; }   // correct, and coarser',
                    output: {
                        kind: 'trace',
                        lines: [
                            'Thread A reads count as 7. Thread B reads count as 7 before A has written.',
                            'Both compute 8. Both write 8.',
                            'Two increments produced one. volatile guaranteed both threads saw a fresh value, which was never the problem.',
                            'The missing property is atomicity of the read-modify-write, and only a lock or a CAS provides it.'
                        ]
                    }
                },
                {
                    type: 'prose',
                    html: '<p>The place <code>volatile</code> is exactly right is a <strong>single write that other threads must observe</strong>, with no read-modify-write: a shutdown flag, a configuration reference swapped wholesale, the <code>instance</code> field in double-checked locking. If the update depends on the current value, <code>volatile</code> is the wrong tool and an atomic or a lock is the right one.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Give both halves and the boundary: <em>"Visibility and ordering — a write is seen by other threads, and nothing is reordered across it. It does not give atomicity, so <code>count++</code> is still a race because it is a read, an add and a write. I use it for a flag or a reference that is replaced wholesale, and an AtomicInteger or a lock when the new value depends on the old one."</em></p>'
                }
            ],
            docs: [
                { title: 'JLS 8.3.1.4 — volatile Fields', url: 'https://docs.oracle.com/javase/specs/jls/se21/html/jls-8.html#jls-8.3.1.4', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'concurrency', questionId: 'volatile-what-it-does' }
            ]
        },

        {
            id: 'synchronized-and-monitors',
            title: 'synchronized, Monitors and wait/notify',
            importance: 'must-know',
            summary: 'Mutual exclusion and a memory barrier in one keyword, plus a condition-signalling mechanism that must always be used inside a loop.',
            interviewAngle: 'The wait/notify half is where candidates come apart. Why the loop, why notifyAll rather than notify, and why you must hold the monitor to call either — three precise questions with three precise answers.',
            buildsOn: ['happens-before'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>Every Java object has a <strong>monitor</strong>. <code>synchronized</code> acquires it on entry and releases it on exit, including when an exception unwinds. It is <em>reentrant</em> — a thread already holding a monitor can acquire it again, which is what allows one synchronised method to call another on the same object without deadlocking itself.</p><p>Acquiring gives mutual exclusion; releasing gives the happens-before edge. Those are two separate benefits from one keyword, and it is the second that people forget when they replace a lock with something they believe is atomic.</p>'
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'wait and notify, with all three rules',
                    code: 'private final Object lock = new Object();\nprivate final Queue<Task> queue = new ArrayDeque<>();\n\nvoid submit(Task task) {\n    synchronized (lock) {              // 1. must hold the monitor\n        queue.add(task);\n        lock.notifyAll();              // 3. notifyAll, not notify\n    }\n}\n\nTask take() throws InterruptedException {\n    synchronized (lock) {\n        while (queue.isEmpty()) {      // 2. WHILE, never if\n            lock.wait();\n        }\n        return queue.remove();\n    }\n}',
                    notes: '<p><strong>1.</strong> <code>wait</code> and <code>notify</code> throw <code>IllegalMonitorStateException</code> unless you hold that object\'s monitor — <code>wait</code> has to release it atomically, and it cannot release what you do not hold. <strong>2.</strong> The loop is mandatory: the specification permits <em>spurious wakeups</em>, and even without them another thread may have taken the item between the notify and your reacquisition of the lock. The condition must be rechecked, so it must be a <code>while</code>. <strong>3.</strong> <code>notify</code> wakes one arbitrary waiter, and if that waiter is not the one whose condition is now true, the signal is lost and the others sleep forever. <code>notifyAll</code> is correct by default; <code>notify</code> is an optimisation valid only when every waiter is waiting for exactly the same condition.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Never synchronise on a <code>String</code> literal, a boxed primitive, or <code>this</code> in a public class.</strong> String literals are interned and boxed integers in the small-value cache are shared process-wide, so an unrelated library synchronising on the same literal contends with you — or deadlocks with you. Locking on <code>this</code> in a public class lets any caller participate in your locking. Use a <code>private final Object lock = new Object();</code>, which nobody else can reach.</p>'
                },
                {
                    type: 'version',
                    title: 'Two changes to how monitors are implemented',
                    items: [
                        { version: 'Java 8 → 14', state: 'was', html: '<p>Biased locking was on by default: a monitor could be biased toward one thread so that uncontended reacquisition cost almost nothing. It mattered a great deal for older code full of <code>Vector</code> and <code>Hashtable</code>.</p>' },
                        { version: 'Java 15', state: 'changed', html: '<p>JEP 374 disabled and deprecated it — the maintenance cost in the runtime had outgrown its benefit for modern code, which uses <code>java.util.concurrent</code> instead. Removed outright in Java 18.</p>' },
                        { version: 'Java 24', state: 'is', html: '<p>JEP 491: a virtual thread blocking inside a <code>synchronized</code> block no longer pins its carrier thread. Before this, <code>synchronized</code> was the main reason to prefer <code>ReentrantLock</code> in virtual-thread code, and a great deal of published advice still assumes it.</p>' }
                    ]
                }
            ],
            docs: [
                { title: 'Object.wait', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Object.html#wait()', kind: 'api' },
                { title: 'JEP 374: Deprecate and Disable Biased Locking', url: 'https://openjdk.org/jeps/374', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'concurrency', questionId: 'synchronized-vs-lock' },
                { topicId: 'concurrency', questionId: 'wait-notify-and-spurious-wakeups' }
            ]
        },

        {
            id: 'atomics-and-cas',
            title: 'Atomics and Compare-and-Swap',
            importance: 'must-know',
            summary: 'A hardware instruction that makes read-modify-write one operation, a retry loop on top of it, and two places that model breaks down.',
            interviewAngle: 'The natural follow-up to the volatile counter. Being able to describe the CAS retry loop, and then name the ABA problem and the contention cliff, is a complete answer to "how do the atomic classes work".',
            buildsOn: ['volatile'],
            blocks: [
                {
                    type: 'definition',
                    term: 'Compare-and-swap',
                    important: true,
                    html: '<p>A single hardware instruction that atomically checks whether a memory location still holds an expected value and, if so, replaces it — reporting whether it succeeded. Everything in <code>java.util.concurrent.atomic</code> is a retry loop around it: read the current value, compute the new one, attempt the swap, and start again if another thread got there first.</p>'
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The loop inside incrementAndGet',
                    code: '// What an atomic increment amounts to\nint current;\ndo {\n    current = get();                       // volatile read\n} while (!compareAndSet(current, current + 1));\n\n// The general form, exposed for anything more complex than\n// increment. The function may run more than once, so it must be\n// pure — no side effects, no logging, no IO.\nAtomicReference<Config> ref = new AtomicReference<>(initial);\nref.updateAndGet(config -> config.withTimeout(Duration.ofSeconds(5)));\n\n// Under heavy contention, prefer the striped counters.\nLongAdder hits = new LongAdder();\nhits.increment();\nlong total = hits.sum();',
                    notes: '<p>Because it is a retry loop, an atomic operation is <em>lock-free</em> rather than <em>wait-free</em>: no thread can block another, but an unlucky thread can retry many times. That is the whole trade against a lock — no context switch and no blocked thread, at the cost of wasted work under contention.</p>'
                },
                {
                    type: 'types',
                    title: 'Where the model breaks down',
                    items: [
                        { name: 'The contention cliff', html: '<p>With many threads on one <code>AtomicLong</code>, most CAS attempts fail and are retried, and the cache line ping-pongs between cores. Past a certain contention level a lock is <em>faster</em>. <code>LongAdder</code> solves this by striping across cells and summing on read — the right choice for a metrics counter, and the wrong one when you need an exact value at every instant.</p>' },
                        { name: 'The ABA problem', html: '<p>CAS checks the <em>value</em>, not the history. If another thread changes A to B and back to A, your CAS succeeds although the world moved underneath it. Harmless for a counter, wrong for a lock-free stack where the node was popped, reused and pushed again. <code>AtomicStampedReference</code> adds a version counter, which is exactly optimistic locking with <code>@Version</code>, one abstraction level down.</p>' },
                        { name: 'Multiple variables', html: '<p>CAS is atomic over one memory location. Two fields that must change together need a lock, or an immutable object holding both swapped through a single <code>AtomicReference</code> — which is usually the cleaner answer.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>The ABA-to-optimistic-locking connection is worth making explicitly, because it shows the idea rather than the API: <em>"AtomicStampedReference attaches a version to the value so a CAS can tell that it changed and changed back. That is the same mechanism as a @Version column in JPA — check that nothing moved since I read it, and retry if it did."</em></p>'
                }
            ],
            docs: [
                { title: 'java.util.concurrent.atomic', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/atomic/package-summary.html', kind: 'api' },
                { title: 'LongAdder', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/atomic/LongAdder.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'concurrency', questionId: 'atomic-classes-and-cas' },
                { topicId: 'transactions', questionId: 'optimistic-locking-details' }
            ]
        },

        {
            id: 'deadlock-livelock-starvation',
            title: 'Deadlock, Livelock and Starvation',
            importance: 'must-know',
            summary: 'Four conditions must all hold for a deadlock, so preventing any one of them prevents it — and consistent lock ordering is the one you can actually enforce.',
            interviewAngle: 'The four conditions are recitable and the mark is for what you do about them. Naming consistent lock ordering, and then saying how you would find the deadlock in production, is the answer that sounds like experience rather than coursework.',
            buildsOn: ['synchronized-and-monitors'],
            blocks: [
                {
                    type: 'types',
                    title: 'The four necessary conditions',
                    items: [
                        { name: 'Mutual exclusion', html: '<p>A resource can be held by only one thread. Rarely negotiable — it is why you had a lock.</p>' },
                        { name: 'Hold and wait', html: '<p>A thread holding one lock requests another. Breakable: acquire everything at once, or nothing.</p>' },
                        { name: 'No preemption', html: '<p>A lock cannot be taken away. Breakable with <code>tryLock(timeout)</code> — back off and retry rather than waiting forever.</p>' },
                        { name: 'Circular wait', html: '<p>A cycle of threads each waiting on the next. <strong>Breakable by imposing a global order on lock acquisition</strong>, and this is the one to reach for in practice.</p>' }
                    ]
                },
                {
                    type: 'diagram',
                    diagramType: 'sequence',
                    diagramConfig: {
                        title: 'The classic two-account transfer',
                        actors: [
                            { id: 't1', label: 'Thread 1: A → B' },
                            { id: 't2', label: 'Thread 2: B → A' }
                        ],
                        messages: [
                            { from: 't1', to: 't1', label: 'lock A — acquired' },
                            { from: 't2', to: 't2', label: 'lock B — acquired' },
                            { from: 't1', to: 't2', label: 'wants B, blocks' },
                            { from: 't2', to: 't1', label: 'wants A, blocks' }
                        ]
                    },
                    caption: 'Neither thread can proceed and neither will ever give up. Ordering the locks by account id makes this sequence impossible.'
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Consistent ordering, by a stable key',
                    code: '// Deadlocks: the order depends on which way the money is going.\nvoid transfer(Account from, Account to, BigDecimal amount) {\n    synchronized (from) {\n        synchronized (to) { ... }\n    }\n}\n\n// Cannot deadlock: both threads take the lower id first, whichever\n// direction the transfer runs.\nvoid transfer(Account from, Account to, BigDecimal amount) {\n    Account first  = from.id() < to.id() ? from : to;\n    Account second = from.id() < to.id() ? to   : from;\n    synchronized (first) {\n        synchronized (second) { ... }\n    }\n}',
                    notes: '<p>The ordering key has to be <strong>stable and total</strong>. An account id works. <code>System.identityHashCode</code> is the usual fallback when there is no natural key, and it needs a tie-break for the rare collision — the version in <em>Java Concurrency in Practice</em> uses a third "tie lock" for exactly that case.</p>'
                },
                {
                    type: 'types',
                    title: 'The two that are not deadlock',
                    items: [
                        { name: 'Livelock', html: '<p>Threads are running and making no progress — each politely backs off and retries in step with the other. Common with naive retry-on-conflict logic, and the fix is randomised backoff, which is the same jitter you add to an HTTP retry.</p>' },
                        { name: 'Starvation', html: '<p>A thread never gets the resource because others keep taking it. Unfair locks permit it by design, since barging is faster in aggregate; <code>new ReentrantLock(true)</code> buys fairness at a real throughput cost.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>Finish with how you would find it, which is what separates the coursework answer: <em>"In production I would take a thread dump — <code>jcmd &lt;pid&gt; Thread.print</code> — and the JVM detects monitor deadlocks itself and prints a &quot;Found one Java-level deadlock&quot; section naming both threads and both locks. It does not detect deadlocks on ReentrantLock as reliably, which is one argument for keeping to synchronized where either would do."</em></p>'
                }
            ],
            docs: [
                { title: 'ReentrantLock', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/locks/ReentrantLock.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'concurrency', questionId: 'deadlock-four-conditions' },
                { topicId: 'transactions', questionId: 'deadlocks-in-the-database' }
            ]
        },

        {
            id: 'immutability-as-a-concurrency-strategy',
            title: 'Immutability as the Default Strategy',
            importance: 'should-know',
            summary: 'The only approach with no race conditions, no visibility problems, no deadlocks and no lock contention — because there is nothing to synchronise.',
            interviewAngle: 'The answer to "how do you make this thread-safe" that most candidates never give. Reaching for a design change before reaching for a lock is a senior signal, and it is usually also the correct engineering answer.',
            buildsOn: ['happens-before'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>Every problem in this module is a problem about <strong>shared mutable state</strong>. Remove either word and it disappears. An immutable object cannot be observed in an inconsistent state, cannot be seen stale after safe publication, and needs no lock — so it cannot contend and cannot deadlock. The final-field guarantee from the happens-before chapter is what makes this hold without any synchronisation at all.</p>'
                },
                {
                    type: 'types',
                    title: 'The three strategies, in the order to try them',
                    items: [
                        { name: '1 — Do not share it', html: '<p>Confine the state to one thread. A local variable, or a <code>ThreadLocal</code> where a framework forces your hand. Costs nothing and cannot be got wrong.</p>' },
                        { name: '2 — Share it immutably', html: '<p>Records, <code>List.copyOf</code>, a whole configuration object replaced through one <code>AtomicReference</code> rather than mutated field by field. Cheap, and correct by construction.</p>' },
                        { name: '3 — Share it mutably and synchronise', html: '<p>Locks, atomics, concurrent collections. Correct, and the only one where you can be subtly wrong — so it is the last resort rather than the first tool.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong><code>ThreadLocal</code> confines state and leaks memory on a pooled thread.</strong> A servlet container reuses its threads, so a value set during one request is still there for the next one unless it is explicitly removed — which is a correctness bug and a slow leak, since the entry is held until the thread dies. Always <code>remove()</code> in a <code>finally</code>, and be aware that <code>ThreadLocal</code> interacts badly with virtual threads for a different reason: with millions of threads, a per-thread copy is a per-thread copy. <code>ScopedValue</code> is the replacement, and the virtual-threads module covers it.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>When asked to make something thread-safe, question the sharing first: <em>"Before adding a lock I would ask whether this needs to be shared and mutable at all. Usually the object can be immutable and replaced wholesale through an AtomicReference, and then there is no lock to get wrong. If it genuinely has to be mutable and shared, then a concurrent collection or a lock — but that is the third answer, not the first."</em></p>'
                }
            ],
            docs: [
                { title: 'ThreadLocal', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/ThreadLocal.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'concurrency', questionId: 'threadlocal-leaks' },
                { topicId: 'concurrency', questionId: 'safe-publication' },
                { topicId: 'java-language', questionId: 'immutability-recipe' }
            ]
        }
    ]
};
