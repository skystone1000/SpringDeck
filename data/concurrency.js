/* ==========================================================================
   data/concurrency.js — Concurrency & Multithreading

   Thirty questions in three subsections. The `virtual` subsection is the one
   that dates this deck: virtual threads went final in Java 21 and changed the
   default answer to "how do you handle ten thousand concurrent requests" for
   the first time in twenty years. A deck written before 2023 gives the old
   answer, and an interviewer who has read the release notes will notice.

   ONE GLOBAL PER FILE.
   ========================================================================== */

const concurrencyData = {
    id: 'concurrency',
    title: 'Concurrency & Multithreading',
    subsections: [
        { id: 'basics',    title: 'Threads & the Memory Model' },
        { id: 'executors', title: 'Executors & Futures' },
        { id: 'virtual',   title: 'Virtual Threads & Structured Concurrency' }
    ],
    keyTopics: [
        'happens-before', 'volatile', 'synchronized', 'ExecutorService',
        'pool sizing', 'CompletableFuture', 'deadlock', 'virtual threads',
        'pinning', 'StructuredTaskScope', 'scoped values', 'ThreadLocal leaks'
    ],
    questions: [

/* ==== Threads & the Memory Model ====================================== */

{
    id: 'race-condition-vs-visibility',
    importance: 'must-know',
    subsection: 'basics',
    question: 'What are the two distinct problems concurrency creates, and why does fixing one not fix the other?',
    answer:
        '<p>Almost every concurrency bug is one of two things, and conflating them is why people ' +
        'sprinkle <code>volatile</code> on fields and expect it to help.</p>' +
        '<ul>' +
        '<li><strong>Visibility.</strong> Thread A writes a field; thread B never sees the new ' +
        'value, or sees it much later. Each thread may hold values in a register or a core-local ' +
        'cache, and the compiler and the CPU are both permitted to reorder instructions that ' +
        'look independent. Without a happens-before relationship there is no guarantee the write ' +
        'is ever visible at all — a loop reading a non-volatile flag can be hoisted out of the ' +
        'loop entirely and spin forever.</li>' +
        '<li><strong>Atomicity.</strong> An operation that looks like one step is several. ' +
        '<code>count++</code> is a read, an add and a write, and two threads interleaving them ' +
        'lose an increment. Visibility is not the problem here; even with perfectly fresh values ' +
        'the interleaving loses the update.</li>' +
        '</ul>' +
        '<p>This is why the two fixes are different. <code>volatile</code> gives you visibility ' +
        'and ordering and <strong>no atomicity whatsoever</strong>: a volatile counter still ' +
        'loses increments. <code>synchronized</code> and the <code>Lock</code> types give you ' +
        'both, because mutual exclusion makes the compound operation indivisible and the ' +
        'lock release-acquire pair establishes happens-before. The atomic classes give you both ' +
        'for a single variable, without a lock.</p>' +
        '<p>The correct order to reason in: first make sure only one thread can be in the ' +
        'critical section, then make sure the result is visible. A design where no state is ' +
        'shared, or where all shared state is immutable, needs neither.</p>',
    referenceLinks: [
        { title: 'JLS 17.4 — Memory Model', url: 'https://docs.oracle.com/javase/specs/jls/se25/html/jls-17.html#jls-17.4' }
    ],
    tags: ['concurrency', 'memory-model', 'visibility', 'atomicity'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: [
        {
            language: 'java',
            title: 'Volatile fixes one problem and not the other',
            code:
                'public class TwoProblems {\n' +
                '    static volatile int volatileCount = 0;\n' +
                '    static int plainCount = 0;\n' +
                '\n' +
                '    public static void main(String[] args) throws InterruptedException {\n' +
                '        Runnable bump = () -> {\n' +
                '            for (int i = 0; i < 100_000; i++) {\n' +
                '                volatileCount++;      // volatile: visible, still not atomic\n' +
                '                plainCount++;\n' +
                '            }\n' +
                '        };\n' +
                '\n' +
                '        Thread a = new Thread(bump), b = new Thread(bump);\n' +
                '        a.start(); b.start();\n' +
                '        a.join();  b.join();\n' +
                '\n' +
                '        System.out.println(volatileCount == 200_000);\n' +
                '        System.out.println(plainCount == 200_000);\n' +
                '    }\n' +
                '}',
            output: {
                /* Not stdout. The result is a race: both values are USUALLY
                   short of 200000, but "usually" is not an output, and a
                   single-core or heavily loaded machine can produce either
                   answer. Claiming a console output here would be inventing
                   determinism the program does not have. */
                kind: 'trace',
                lines: [
                    'Both threads read the counter, add one, and write it back.',
                    'The two reads can happen before either write, so one increment is lost.',
                    'volatile guarantees each thread sees the latest value at the moment it reads.',
                    'It does not make the read-add-write sequence indivisible, so the loss still occurs.',
                    'Both printed values are therefore almost always false, and neither is guaranteed.'
                ],
                explain:
                    '<p>No console output is claimed for this snippet, deliberately. The result ' +
                    'is a race: it depends on the number of cores, the scheduler and the JIT, ' +
                    'and on a loaded single-core machine it may well print true twice. A ' +
                    'printed "false false" would be teaching that the failure is reliable, and ' +
                    'the thing that makes these bugs dangerous is that it is not.</p>' +
                    '<p><code>AtomicInteger.incrementAndGet()</code> is the fix, and it is ' +
                    'guaranteed.</p>'
            }
        }
    ]
},

{
    id: 'happens-before',
    importance: 'must-know',
    subsection: 'basics',
    question: 'What does happens-before mean, and which operations establish it?',
    answer:
        '<p>Happens-before is the ordering guarantee the Java Memory Model actually provides. If ' +
        'action A happens-before action B, then everything A wrote is visible to B. If there is ' +
        'no happens-before edge between two actions in different threads, <strong>no ordering is ' +
        'guaranteed at all</strong> and either may observe the other in any state.</p>' +
        '<p>Crucially, it is not about wall-clock time. A write that occurred earlier in real ' +
        'time but has no happens-before edge is simply not guaranteed to be visible, however ' +
        'long you wait.</p>' +
        '<p>The edges worth memorising:</p>' +
        '<ul>' +
        '<li><strong>Program order</strong> within a single thread.</li>' +
        '<li><strong>Monitor lock:</strong> unlocking a monitor happens-before every subsequent ' +
        'lock of the same monitor. This is why <code>synchronized</code> gives visibility as ' +
        'well as exclusion.</li>' +
        '<li><strong>Volatile:</strong> a write to a volatile field happens-before every ' +
        'subsequent read of it. And it is a barrier for everything else too — writes made ' +
        '<em>before</em> the volatile write are visible to a thread that reads it.</li>' +
        '<li><strong>Thread start:</strong> <code>Thread.start()</code> happens-before anything ' +
        'in the started thread.</li>' +
        '<li><strong>Thread join:</strong> everything in a thread happens-before another ' +
        'thread returning from <code>join()</code> on it.</li>' +
        '<li><strong>Final fields:</strong> the freeze at the end of a constructor, provided ' +
        '<code>this</code> did not escape during construction.</li>' +
        '<li><strong>The concurrency library:</strong> placing an item in a concurrent ' +
        'collection happens-before taking it out; submitting to an executor happens-before the ' +
        'task running; a task completing happens-before <code>Future.get()</code> returns. This ' +
        'is why passing data through a <code>BlockingQueue</code> needs no extra ' +
        'synchronisation.</li>' +
        '</ul>' +
        '<p>It is transitive, which is the property that makes it usable: if A happens-before B ' +
        'and B happens-before C, then A happens-before C.</p>',
    referenceLinks: [
        { title: 'java.util.concurrent — Memory Consistency Properties', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/package-summary.html' }
    ],
    tags: ['concurrency', 'memory-model', 'happens-before'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'volatile-what-it-does',
    importance: 'must-know',
    subsection: 'basics',
    question: 'What exactly does volatile guarantee, and when is it sufficient on its own?',
    answer:
        '<p>Three guarantees:</p>' +
        '<ul>' +
        '<li><strong>Visibility.</strong> A read always sees the most recent write by any ' +
        'thread. No caching in a register, no hoisting the read out of a loop.</li>' +
        '<li><strong>Ordering.</strong> It is a memory barrier. Writes that happened before the ' +
        'volatile write are visible to a thread that has read it — which is what makes the ' +
        'flag pattern work for more than just the flag.</li>' +
        '<li><strong>Atomicity of the read and of the write, including 64-bit.</strong> Without ' +
        '<code>volatile</code>, a <code>long</code> or <code>double</code> write is permitted to ' +
        'be split into two 32-bit halves, so another thread can observe a value that was never ' +
        'written. With it, that cannot happen.</li>' +
        '</ul>' +
        '<p><strong>It is sufficient</strong> when the new value does not depend on the old one, ' +
        'and only one thread writes — or when writers do not need to coordinate. The two ' +
        'canonical uses are a shutdown flag polled by a worker loop, and safe publication of an ' +
        'immutable object built by one thread and read by many.</p>' +
        '<p><strong>It is not sufficient</strong> for any read-modify-write: ' +
        '<code>count++</code>, <code>if (x == null) x = new Thing()</code>, ' +
        '<code>list.add()</code> where the field is volatile but the list is not. Those need an ' +
        'atomic class or a lock.</p>' +
        '<p>One thing to be clear about: <code>volatile</code> on a reference field makes the ' +
        '<em>reference</em> volatile, not the object. A volatile <code>List</code> field ' +
        'guarantees you see the latest list instance and guarantees nothing about its contents.</p>',
    referenceLinks: [
        { title: 'JLS 8.3.1.4 — volatile Fields', url: 'https://docs.oracle.com/javase/specs/jls/se25/html/jls-8.html#jls-8.3.1.4' }
    ],
    tags: ['concurrency', 'volatile', 'memory-model'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: [
        {
            language: 'java',
            title: 'The stop flag that never stops',
            code:
                'public class StopFlag {\n' +
                '    // Without volatile the JIT may hoist the read out of the loop:\n' +
                '    //     if (!running) { while (true) { work(); } }\n' +
                '    // which is a legal transformation for a field with no\n' +
                '    // happens-before edge, and the thread never exits.\n' +
                '    private static boolean running = true;\n' +
                '\n' +
                '    public static void main(String[] args) throws InterruptedException {\n' +
                '        Thread worker = new Thread(() -> {\n' +
                '            long spins = 0;\n' +
                '            while (running) { spins++; }\n' +
                '            System.out.println("stopped after " + spins + " spins");\n' +
                '        });\n' +
                '\n' +
                '        worker.start();\n' +
                '        Thread.sleep(100);\n' +
                '        running = false;          // may never be observed\n' +
                '        worker.join();\n' +
                '    }\n' +
                '}',
            output: {
                kind: 'trace',
                lines: [
                    'The worker reads a plain boolean field in a tight loop.',
                    'No happens-before edge connects the main thread write to that read.',
                    'The JIT is therefore free to hoist the read and compile the loop as while(true).',
                    'Whether it does depends on the JIT, the tier it compiled at, and timing.',
                    'Marking the field volatile creates the edge and makes termination guaranteed.'
                ],
                explain:
                    '<p>The behaviour is not deterministic, which is exactly why this is worth ' +
                    'knowing: it terminates in the interpreter and often hangs once C2 has ' +
                    'compiled the loop, so it passes in a debugger and hangs in production.</p>'
            }
        }
    ]
},

{
    id: 'synchronized-vs-lock',
    importance: 'must-know',
    subsection: 'basics',
    question: 'When would you use a ReentrantLock instead of synchronized?',
    answer:
        '<p>Default to <code>synchronized</code>. It is shorter, it cannot be leaked because the ' +
        'JVM releases it when the block exits by any route including an exception, and the JIT ' +
        'optimises it well. Reach for a <code>Lock</code> only when you need something it ' +
        'cannot do:</p>' +
        '<ul>' +
        '<li><strong>Timeout.</strong> <code>tryLock(2, SECONDS)</code> gives up instead of ' +
        'blocking forever. This is the main reason in production code — it converts a potential ' +
        'deadlock into a recoverable failure.</li>' +
        '<li><strong>Interruptibility.</strong> <code>lockInterruptibly()</code> lets a waiting ' +
        'thread be cancelled. A thread blocked on <code>synchronized</code> cannot be ' +
        'interrupted at all.</li>' +
        '<li><strong>Non-block-structured locking.</strong> Acquire in one method, release in ' +
        'another — hand-over-hand traversal of a linked structure, for example.</li>' +
        '<li><strong>Multiple condition variables.</strong> A monitor has one wait set; a ' +
        '<code>Lock</code> can have several <code>Condition</code>s, so a bounded buffer can ' +
        'signal "not full" and "not empty" separately instead of waking everyone.</li>' +
        '<li><strong>Fairness.</strong> An optional FIFO ordering that prevents starvation, at a ' +
        'significant throughput cost.</li>' +
        '<li><strong>Read/write separation.</strong> <code>ReentrantReadWriteLock</code>, or ' +
        'better <code>StampedLock</code>, for read-dominated structures.</li>' +
        '</ul>' +
        '<p>The price is that you must release it in a <code>finally</code> block, every time, ' +
        'with the <code>lock()</code> call immediately before the <code>try</code>. Anything ' +
        'else eventually leaks a lock, and a leaked lock hangs the process rather than throwing.</p>' +
        '<p>Both are reentrant: a thread already holding the lock can acquire it again, which is ' +
        'what makes one synchronized method calling another work at all.</p>',
    referenceLinks: [
        { title: 'ReentrantLock — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/locks/ReentrantLock.html' }
    ],
    tags: ['concurrency', 'locks', 'synchronized'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'deadlock-four-conditions',
    importance: 'must-know',
    subsection: 'basics',
    question: 'What causes a deadlock, how do you diagnose one, and how do you prevent it?',
    answer:
        '<p>Four conditions must all hold: <strong>mutual exclusion</strong>, <strong>hold and ' +
        'wait</strong>, <strong>no pre-emption</strong>, and <strong>circular wait</strong>. ' +
        'Break any one and deadlock is impossible; in practice you break the last.</p>' +
        '<p><strong>Prevention, in order of effectiveness:</strong></p>' +
        '<ul>' +
        '<li><strong>Global lock ordering.</strong> Every thread acquires locks in the same ' +
        'order, by some total order — account id, class name, ' +
        '<code>System.identityHashCode</code>. This is the standard fix for the two-account ' +
        'transfer, and it is why that exercise is asked.</li>' +
        '<li><strong>Do not hold a lock while calling out.</strong> No network call, no ' +
        'callback into unknown code, no acquiring a second lock, while holding the first. Most ' +
        'real deadlocks come from an alien method called with a lock held.</li>' +
        '<li><strong><code>tryLock</code> with a timeout</strong> and a back-off. Turns a hang ' +
        'into a retry or an error.</li>' +
        '<li><strong>Shrink the critical section</strong>, or remove the shared state so there ' +
        'is nothing to lock.</li>' +
        '</ul>' +
        '<p><strong>Diagnosis</strong> is straightforward and worth being able to describe: take ' +
        'a thread dump with <code>jstack &lt;pid&gt;</code> or <code>jcmd &lt;pid&gt; ' +
        'Thread.print</code>. The JVM detects monitor cycles itself and prints "Found one ' +
        'Java-level deadlock" with the two threads and the locks each holds and wants. For ' +
        '<code>ReentrantLock</code> it usually finds them too. In a container, be sure the ' +
        'dump goes somewhere it survives the pod restarting.</p>' +
        '<p>The related failure to name: <strong>livelock</strong>, where threads keep changing ' +
        'state in response to each other and make no progress, and <strong>starvation</strong>, ' +
        'where one thread never gets the lock. Neither shows up in a deadlock detector.</p>',
    referenceLinks: [
        { title: 'Deadlock — The Java Tutorials', url: 'https://docs.oracle.com/javase/tutorial/essential/concurrency/deadlock.html' }
    ],
    tags: ['concurrency', 'deadlock', 'locks', 'diagnostics'],
    images: [],
    hasDiagram: true,
    diagramType: 'sequence',
    diagramConfig: {
        title: 'The two-account transfer deadlock',
        actors: [
            { id: 't1', label: 'Transfer A to B' },
            { id: 'a',  label: 'Lock on A' },
            { id: 'b',  label: 'Lock on B' },
            { id: 't2', label: 'Transfer B to A' }
        ],
        messages: [
            { from: 't1', to: 'a', label: 'acquires' },
            { from: 't2', to: 'b', label: 'acquires' },
            { from: 't1', to: 'b', label: 'waits, held by T2' },
            { from: 't2', to: 'a', label: 'waits, held by T1' }
        ]
    },
    codeSnippets: []
},

{
    id: 'atomic-classes-and-cas',
    importance: 'should-know',
    subsection: 'basics',
    question: 'How do the atomic classes work without a lock, and what is the ABA problem?',
    answer:
        '<p>They use <strong>compare-and-swap</strong>, a single CPU instruction that atomically ' +
        'says "if this memory location still holds the value I expect, replace it; otherwise ' +
        'tell me it changed". <code>incrementAndGet()</code> is a loop: read the current value, ' +
        'compute the new one, attempt the CAS, and retry if another thread won.</p>' +
        '<p>This is <strong>optimistic</strong> rather than pessimistic. Nothing blocks, so ' +
        'there is no context switch and no lock to leak, and it is lock-free — some thread ' +
        'always makes progress. Under very high contention the retry loop can burn CPU, which is ' +
        'why <code>LongAdder</code> exists: it spreads increments across several cells and sums ' +
        'them on read, so a counter written by many threads and read rarely is much faster than ' +
        'an <code>AtomicLong</code>.</p>' +
        '<p><strong>The ABA problem:</strong> a thread reads A, another changes it to B and back ' +
        'to A, and the first thread\'s CAS succeeds because the value matches — even though the ' +
        'state it was reasoning about is gone. For a counter this is harmless. For a reference ' +
        'into a data structure it is not: the node you swapped in may have been removed and ' +
        'recycled in between.</p>' +
        '<p><code>AtomicStampedReference</code> is the answer: it pairs the reference with a ' +
        'counter that increments on every change, so A-B-A is visible as a stamp that moved. ' +
        '<code>AtomicMarkableReference</code> does the same with a single boolean.</p>' +
        '<p>The same optimistic pattern with a version column is exactly how JPA\'s ' +
        '<code>@Version</code> optimistic locking works, which is worth saying out loud in an ' +
        'interview because it connects two topics.</p>',
    referenceLinks: [
        { title: 'java.util.concurrent.atomic — package summary', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/atomic/package-summary.html' }
    ],
    tags: ['concurrency', 'atomics', 'cas', 'lock-free'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'wait-notify-and-spurious-wakeups',
    importance: 'should-know',
    subsection: 'basics',
    question: 'Why must wait() always be called in a loop?',
    answer:
        '<p>Two reasons, and both are about the same underlying fact: <strong>waking up is not ' +
        'the same as the condition being true</strong>.</p>' +
        '<ul>' +
        '<li><strong>Spurious wakeups.</strong> The specification permits <code>wait()</code> to ' +
        'return without any <code>notify()</code> at all. This is not theoretical — it follows ' +
        'from how the underlying OS primitives behave.</li>' +
        '<li><strong>Stolen conditions.</strong> Even with a real <code>notify()</code>, the ' +
        'woken thread must reacquire the monitor before it can continue, and another thread can ' +
        'get in first and consume whatever became available. By the time you run, the condition ' +
        'is false again.</li>' +
        '</ul>' +
        '<p>So the shape is always <code>while (!condition) wait();</code> and never ' +
        '<code>if</code>. Re-check after waking, every time.</p>' +
        '<p>Three related rules: <code>wait()</code>, <code>notify()</code> and ' +
        '<code>notifyAll()</code> may only be called while holding that object\'s monitor, and ' +
        'throw <code>IllegalMonitorStateException</code> otherwise. <code>wait()</code> releases ' +
        'the monitor while waiting, which <code>Thread.sleep()</code> does not — a sleeping ' +
        'thread holds every lock it has, which is a good way to build a deadlock. And prefer ' +
        '<code>notifyAll()</code> to <code>notify()</code> unless you can prove all waiters are ' +
        'interchangeable, because waking the wrong single waiter loses the notification ' +
        'permanently.</p>' +
        '<p>In modern code you rarely write any of this. <code>BlockingQueue</code>, ' +
        '<code>CountDownLatch</code>, <code>Semaphore</code>, <code>CyclicBarrier</code> and ' +
        '<code>CompletableFuture</code> cover almost every case, and they are correct.</p>',
    referenceLinks: [
        { title: 'Object.wait() — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/Object.html#wait()' }
    ],
    tags: ['concurrency', 'wait-notify', 'monitors'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'threadlocal-leaks',
    importance: 'should-know',
    subsection: 'basics',
    question: 'How does a ThreadLocal leak memory, and why is it worse in a web application?',
    answer:
        '<p>A <code>ThreadLocal</code> value is stored in a map <em>on the thread</em>, keyed by ' +
        'the <code>ThreadLocal</code> object. So the value lives exactly as long as the thread ' +
        'does — and in a server, threads live for the lifetime of the pool.</p>' +
        '<p>The leak: a request handler sets a <code>ThreadLocal</code> and does not remove it. ' +
        'The request finishes, the thread returns to the pool, and the value stays. Multiply by ' +
        'two hundred pool threads and whatever each value transitively retains — a security ' +
        'context, a Hibernate session, a request object holding an uploaded file — and it is a ' +
        'permanent, growing retention that no request is responsible for.</p>' +
        '<p>The <code>ThreadLocalMap</code> key is a weak reference, which people cite as the ' +
        'reason this is safe. It is not: <strong>the value is held strongly</strong>. Once the ' +
        '<code>ThreadLocal</code> object is collected the entry becomes a stale null-keyed slot ' +
        'whose value is still reachable, and it is only cleaned opportunistically during other ' +
        'map operations that may never happen.</p>' +
        '<p><strong>Always <code>remove()</code> in a <code>finally</code>.</strong> That is the ' +
        'whole discipline. In Spring, a filter or interceptor with the <code>remove()</code> in ' +
        'its <code>finally</code> is the standard shape, and it is why MDC-based correlation ids ' +
        'must be cleared rather than merely overwritten.</p>' +
        '<p>The second failure is subtler: a value <em>left over from a previous request</em> is ' +
        'read by the next one on the same thread. That is not a leak, it is a data breach — one ' +
        'user\'s tenant id serving another user\'s request.</p>',
    referenceLinks: [
        { title: 'ThreadLocal — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/ThreadLocal.html' }
    ],
    tags: ['concurrency', 'threadlocal', 'memory-leak', 'security'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'safe-publication',
    importance: 'should-know',
    subsection: 'basics',
    question: 'What is safe publication, and why can another thread see a partially constructed object?',
    answer:
        '<p>Publishing an object means making its reference visible to another thread. Doing it ' +
        '<em>safely</em> means guaranteeing that thread also sees the object\'s fields in their ' +
        'initialised state.</p>' +
        '<p>Without a happens-before edge it may not. <code>new Thing()</code> is: allocate, run ' +
        'the constructor, assign the reference. The JVM and the CPU may reorder the second and ' +
        'third, so another thread can read a non-null reference to an object whose fields are ' +
        'still zero. The reference arrived before the contents.</p>' +
        '<p>This is precisely the bug in the classic <strong>double-checked locking</strong> ' +
        'idiom without <code>volatile</code>: the second thread sees a non-null instance, skips ' +
        'the synchronized block, and uses a half-built object. Adding <code>volatile</code> to ' +
        'the field fixes it, and has done since Java 5 when the memory model was rewritten. ' +
        'Before that it could not be fixed at all, which is why so much old advice says the ' +
        'idiom is broken.</p>' +
        '<p><strong>The safe ways to publish:</strong> a static initialiser; a ' +
        '<code>volatile</code> or <code>final</code> field; an <code>AtomicReference</code>; ' +
        'storing it into a concurrent collection; or handing it over through a lock both threads ' +
        'take. For a lazily initialised static, the <strong>holder idiom</strong> — a private ' +
        'static nested class whose static field holds the instance — is simpler than ' +
        'double-checked locking, needs no <code>volatile</code>, and gets its guarantee from ' +
        'class initialisation.</p>' +
        '<p>An immutable object with all-final fields is safely published by any means at all, ' +
        'including a plain non-volatile field, provided <code>this</code> did not escape during ' +
        'construction. That last clause is why "do not start a thread in a constructor" is a ' +
        'rule.</p>',
    referenceLinks: [],
    tags: ['concurrency', 'publication', 'memory-model', 'singleton'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: [
        {
            language: 'java',
            title: 'Three lazy singletons, two of them correct',
            code:
                'public class Publication {\n' +
                '    // BROKEN without volatile: another thread can see a non-null\n' +
                '    // reference to an object whose constructor has not finished.\n' +
                '    static class Broken {\n' +
                '        private static Broken instance;\n' +
                '        static Broken get() {\n' +
                '            if (instance == null) {\n' +
                '                synchronized (Broken.class) {\n' +
                '                    if (instance == null) instance = new Broken();\n' +
                '                }\n' +
                '            }\n' +
                '            return instance;\n' +
                '        }\n' +
                '    }\n' +
                '\n' +
                '    // Correct: volatile creates the happens-before edge.\n' +
                '    static class Dcl {\n' +
                '        private static volatile Dcl instance;\n' +
                '        static Dcl get() {\n' +
                '            Dcl local = instance;\n' +
                '            if (local == null) {\n' +
                '                synchronized (Dcl.class) {\n' +
                '                    local = instance;\n' +
                '                    if (local == null) instance = local = new Dcl();\n' +
                '                }\n' +
                '            }\n' +
                '            return local;\n' +
                '        }\n' +
                '    }\n' +
                '\n' +
                '    // Simpler and also correct: the JVM guarantees a class is\n' +
                '    // initialised once, and not until it is first used.\n' +
                '    static class Holder {\n' +
                '        private static class Lazy { static final Holder INSTANCE = new Holder(); }\n' +
                '        static Holder get() { return Lazy.INSTANCE; }\n' +
                '    }\n' +
                '}',
            output: {
                kind: 'trace',
                lines: [
                    'Broken: the write to instance may be reordered ahead of the constructor completing.',
                    'A second thread reads a non-null instance and returns a half-initialised object.',
                    'Dcl: volatile forbids that reordering and gives the reader a happens-before edge.',
                    'Dcl also reads into a local, which removes one volatile read from the hot path.',
                    'Holder: the JVM initialises Lazy on first use, under a lock it manages itself.'
                ],
                explain:
                    '<p>The holder idiom is the one to reach for. It is lazy, thread-safe, needs ' +
                    'no <code>volatile</code> and no synchronisation in the source, and its ' +
                    'guarantee comes from the class initialisation rules rather than from ' +
                    'anything the author has to get right.</p>'
            }
        }
    ]
},

{
    id: 'thread-interruption',
    importance: 'good-to-know',
    subsection: 'basics',
    question: 'What does Thread.interrupt() actually do, and what is the correct way to handle InterruptedException?',
    answer:
        '<p><code>interrupt()</code> sets a flag. It does not stop the thread, and it cannot: ' +
        'stopping a thread at an arbitrary point would leave whatever it was doing half done, ' +
        'which is why <code>Thread.stop()</code> was deprecated and eventually removed.</p>' +
        '<p>Interruption is <strong>cooperative</strong>. A thread blocked in ' +
        '<code>sleep</code>, <code>wait</code>, <code>join</code> or a blocking queue operation ' +
        'throws <code>InterruptedException</code> and — importantly — ' +
        '<strong>clears the flag</strong> when it does. A thread doing computation must poll ' +
        '<code>Thread.currentThread().isInterrupted()</code> itself.</p>' +
        '<p>There are exactly two correct responses to catching <code>InterruptedException</code>:</p>' +
        '<ul>' +
        '<li><strong>Propagate it</strong>, by declaring it and letting it out. Correct whenever ' +
        'you can.</li>' +
        '<li><strong>Restore the flag</strong> — <code>Thread.currentThread().interrupt()</code> ' +
        '— and then return or exit the loop. Necessary when you cannot change the signature, ' +
        'such as inside a <code>Runnable</code>. Because the throw cleared the flag, code ' +
        'further up would otherwise never learn the thread was interrupted.</li>' +
        '</ul>' +
        '<p>What is always wrong is swallowing it into an empty catch, or logging it and ' +
        'continuing. That makes the thread uninterruptible, and a task that ignores ' +
        'cancellation is a task that keeps an executor from shutting down and keeps a container ' +
        'from stopping until it is killed.</p>',
    referenceLinks: [],
    tags: ['concurrency', 'interruption', 'cancellation'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

/* ==== Executors & Futures ============================================= */

{
    id: 'why-not-new-thread',
    importance: 'must-know',
    subsection: 'executors',
    question: 'What is wrong with new Thread(task).start() for each piece of work?',
    answer:
        '<p>Four things, and the last one is what actually takes a service down.</p>' +
        '<ul>' +
        '<li><strong>Cost.</strong> A platform thread is an OS thread with a stack — a megabyte ' +
        'of reserved address space by default. Creating and destroying one per task is ' +
        'expensive relative to most tasks.</li>' +
        '<li><strong>No limit.</strong> Nothing stops the code creating ten thousand threads. ' +
        'The machine will not run ten thousand runnable threads well; it will spend its time ' +
        'context switching.</li>' +
        '<li><strong>No lifecycle.</strong> No way to wait for completion, no way to get a ' +
        'result, no way to cancel, no way to shut down cleanly.</li>' +
        '<li><strong>No back-pressure.</strong> With unlimited threads, a spike in load turns ' +
        'into a spike in threads instead of into a queue you can observe and bound. The failure ' +
        'is an <code>OutOfMemoryError: unable to create native thread</code>, which is confusing ' +
        'because the heap is fine — the exhausted resource is native memory or the OS thread ' +
        'limit.</li>' +
        '</ul>' +
        '<p>An <code>ExecutorService</code> fixes all four: a bounded pool, a bounded queue, ' +
        '<code>Future</code>s for results and cancellation, and an orderly shutdown.</p>' +
        '<p><strong>Virtual threads change the first two points and not the last two.</strong> ' +
        'A virtual thread costs a few hundred bytes and starting a million is reasonable, so ' +
        '"one thread per task" is now a sound design. But an unbounded number of virtual threads ' +
        'all making database calls will exhaust the connection pool instead of the thread ' +
        'limit — the constraint moved rather than disappearing, and you still bound it, just ' +
        'with a semaphore rather than a thread pool.</p>',
    referenceLinks: [
        { title: 'ExecutorService — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/ExecutorService.html' }
    ],
    tags: ['concurrency', 'executors', 'thread-pools'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'thread-pool-sizing',
    importance: 'must-know',
    subsection: 'executors',
    question: 'How do you size a thread pool?',
    answer:
        '<p>Start from what the tasks do, because CPU-bound and IO-bound have opposite answers.</p>' +
        '<p><strong>CPU-bound:</strong> about <code>availableProcessors()</code>, or one more. ' +
        'More threads than cores cannot execute more work; they only add context switches and ' +
        'cache pressure.</p>' +
        '<p><strong>IO-bound:</strong> <code>cores × (1 + waitTime / serviceTime)</code>. A task ' +
        'that spends 90ms waiting and 10ms computing has a ratio of 9, so ten threads per core. ' +
        'The formula is a starting point, not an answer — measure and adjust.</p>' +
        '<p>What matters more than the formula:</p>' +
        '<ul>' +
        '<li><strong>The real limit is usually downstream.</strong> Two hundred threads in front ' +
        'of a ten-connection database pool means a hundred and ninety threads queueing on the ' +
        'pool. The pool size is the concurrency limit; the thread count above it is just a ' +
        'queue with expensive elements.</li>' +
        '<li><strong>Separate pools for separate dependencies.</strong> One pool shared between ' +
        'a fast local call and a slow third-party API means the slow one starves the fast one. ' +
        'This is the bulkhead pattern, and it is the fix.</li>' +
        '<li><strong><code>availableProcessors()</code> lies in a container</strong> unless the ' +
        'JVM is recent enough to read the cgroup CPU quota. Modern JDKs do; a pool sized from it ' +
        'on an older one gets the host\'s core count and is wildly too large.</li>' +
        '</ul>' +
        '<p>And bound the queue. An <code>ExecutorService</code> with an unbounded queue never ' +
        'grows past its core size no matter how much work arrives — it just accumulates, and ' +
        'the maximum pool size is never reached. That is the most commonly misunderstood part ' +
        'of <code>ThreadPoolExecutor</code>.</p>',
    referenceLinks: [
        { title: 'ThreadPoolExecutor — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/ThreadPoolExecutor.html' }
    ],
    tags: ['concurrency', 'thread-pools', 'sizing', 'performance'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'threadpoolexecutor-queue-behaviour',
    importance: 'must-know',
    subsection: 'executors',
    question: 'In what order does ThreadPoolExecutor use its core threads, its queue and its maximum threads?',
    answer:
        '<p>This order, and it surprises nearly everyone the first time:</p>' +
        '<ul>' +
        '<li>If fewer than <strong>corePoolSize</strong> threads exist, start a new thread — ' +
        'even if an existing one is idle.</li>' +
        '<li>Otherwise, <strong>put the task on the queue</strong>.</li>' +
        '<li>Only if the queue is <strong>full</strong>, start a new thread up to ' +
        '<strong>maximumPoolSize</strong>.</li>' +
        '<li>If the queue is full and the pool is at maximum, apply the ' +
        '<strong>RejectedExecutionHandler</strong>.</li>' +
        '</ul>' +
        '<p>The consequence: <strong>with an unbounded queue, <code>maximumPoolSize</code> is ' +
        'dead configuration.</strong> The queue never fills, so the pool never grows past ' +
        'core size. Someone who sets core 10, max 200 and a <code>LinkedBlockingQueue</code> has ' +
        'a fixed pool of 10 and a queue that grows until the heap runs out. This is why ' +
        '<code>newFixedThreadPool</code> and <code>newSingleThreadExecutor</code> are both ' +
        'risky by default, and why <code>newCachedThreadPool</code> is the opposite risk — it ' +
        'uses a <code>SynchronousQueue</code> with an effectively unbounded maximum, so it ' +
        'creates a thread per task under load.</p>' +
        '<p>The four standard rejection policies: <code>AbortPolicy</code> throws (the default), ' +
        '<code>CallerRunsPolicy</code> runs the task on the submitting thread — which is a ' +
        'genuinely elegant back-pressure mechanism, since the submitter stops submitting while ' +
        'it works — <code>DiscardPolicy</code> drops silently, and ' +
        '<code>DiscardOldestPolicy</code> drops the head of the queue.</p>' +
        '<p>Configure it explicitly with the <code>ThreadPoolExecutor</code> constructor, a ' +
        'bounded queue, a named <code>ThreadFactory</code> — unnamed pool threads make a thread ' +
        'dump much harder to read — and a rejection policy you chose.</p>',
    referenceLinks: [
        { title: 'ThreadPoolExecutor — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/ThreadPoolExecutor.html' }
    ],
    tags: ['concurrency', 'thread-pools', 'queues', 'back-pressure'],
    images: [],
    hasDiagram: true,
    diagramType: 'flowchart',
    diagramConfig: {
        title: 'Where a submitted task actually goes',
        nodes: [
            { id: 'submit', label: 'execute(task)',                        kind: 'start' },
            { id: 'core',   label: 'below corePoolSize: new thread',       kind: 'step' },
            { id: 'queue',  label: 'queue has room: enqueue',              kind: 'step' },
            { id: 'max',    label: 'queue full, below max: new thread',    kind: 'step' },
            { id: 'reject', label: 'full and at max: RejectedExecutionHandler', kind: 'trap' }
        ],
        edges: [
            { from: 'submit', to: 'core',  label: 'yes' },
            { from: 'submit', to: 'queue', label: 'no' },
            { from: 'queue',  to: 'max',   label: 'full' },
            { from: 'max',    to: 'reject' }
        ]
    },
    codeSnippets: []
},

{
    id: 'shutdown-vs-shutdownnow',
    importance: 'should-know',
    subsection: 'executors',
    question: 'What is the correct way to shut down an ExecutorService?',
    answer:
        '<p><code>shutdown()</code> stops accepting new tasks and lets queued and running ones ' +
        'finish. <code>shutdownNow()</code> additionally drains the queue, returns the ' +
        'unstarted tasks, and <em>interrupts</em> the running ones — which only stops them if ' +
        'they respond to interruption.</p>' +
        '<p>Neither blocks. That is the part people get wrong: <code>shutdown()</code> returns ' +
        'immediately, so a process that calls it and exits kills the tasks anyway. The correct ' +
        'shape is the two-phase one from the <code>ExecutorService</code> documentation:</p>' +
        '<ul>' +
        '<li><code>shutdown()</code>, then <code>awaitTermination(timeout)</code>.</li>' +
        '<li>If that times out, <code>shutdownNow()</code> and await again with a shorter ' +
        'timeout.</li>' +
        '<li>If it still has not stopped, log what did not finish. Something is ignoring ' +
        'interruption and that is worth knowing about.</li>' +
        '</ul>' +
        '<p>Since Java 19 <code>ExecutorService</code> extends <code>AutoCloseable</code>, and ' +
        '<code>close()</code> does exactly this — which makes try-with-resources the right ' +
        'idiom for a scoped executor.</p>' +
        '<p>In Spring, do not manage this by hand. A <code>ThreadPoolTaskExecutor</code> bean ' +
        'gets its shutdown from the container, and ' +
        '<code>setWaitForTasksToCompleteOnShutdown(true)</code> with an await period is how you ' +
        'get graceful drain. Combined with the server\'s own graceful shutdown, that is the ' +
        'difference between a rolling deploy that drops requests and one that does not.</p>',
    referenceLinks: [
        { title: 'ExecutorService — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/ExecutorService.html' }
    ],
    tags: ['concurrency', 'executors', 'shutdown', 'operations'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'future-vs-completablefuture',
    importance: 'must-know',
    subsection: 'executors',
    question: 'What does CompletableFuture give you that Future does not?',
    answer:
        '<p><code>Future</code> has one useful method and it blocks. <code>get()</code> parks the ' +
        'calling thread until the result arrives, so two independent calls run one after the ' +
        'other unless you carefully submit both first and only then call <code>get()</code> on ' +
        'each. There is no way to say "when this finishes, do that" — you can only wait.</p>' +
        '<p><code>CompletableFuture</code> adds:</p>' +
        '<ul>' +
        '<li><strong>Composition.</strong> <code>thenApply</code> transforms a result, ' +
        '<code>thenCompose</code> chains another asynchronous call (it is the flatMap), and ' +
        '<code>thenCombine</code> joins two independent results. The pipeline is declared, not ' +
        'blocked on.</li>' +
        '<li><strong>Callbacks.</strong> <code>thenAccept</code>, <code>whenComplete</code>, ' +
        '<code>handle</code> — code that runs on completion without a thread waiting.</li>' +
        '<li><strong>Combinators.</strong> <code>allOf</code> for fan-out/fan-in, ' +
        '<code>anyOf</code> for the first to answer, which is how you implement a hedged ' +
        'request.</li>' +
        '<li><strong>Error handling in the chain.</strong> <code>exceptionally</code> and ' +
        '<code>handle</code>, rather than a try/catch around a blocking call.</li>' +
        '<li><strong>Manual completion.</strong> <code>complete(value)</code> lets you bridge a ' +
        'callback-based API into a future, which is how most client libraries are adapted.</li>' +
        '</ul>' +
        '<p>The trap worth naming: <strong>the default executor is the ForkJoin common ' +
        'pool</strong>, which is sized for CPU-bound work at one thread per core and is shared ' +
        'with parallel streams across the whole JVM. Running blocking IO on it starves ' +
        'everything else in the process. Pass your own executor to the <code>*Async</code> ' +
        'variants for anything that blocks.</p>' +
        '<p>Also: the non-async methods run on whichever thread completed the previous stage, ' +
        'which may be the caller if the value was already available. That means ' +
        '<code>thenApply</code> can run inline, which is efficient and occasionally surprising.</p>',
    referenceLinks: [
        { title: 'CompletableFuture — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/CompletableFuture.html' }
    ],
    tags: ['concurrency', 'futures', 'async', 'completablefuture'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: [
        {
            language: 'java',
            title: 'Fan out, join, and handle the failure in the chain',
            code:
                'import java.util.concurrent.*;\n' +
                '\n' +
                'public class Fanout {\n' +
                '    public static void main(String[] args) {\n' +
                '        try (ExecutorService pool = Executors.newFixedThreadPool(4)) {\n' +
                '\n' +
                '            CompletableFuture<String> profile =\n' +
                '                    CompletableFuture.supplyAsync(() -> "profile", pool);\n' +
                '\n' +
                '            CompletableFuture<String> orders =\n' +
                '                    CompletableFuture.supplyAsync(() -> "orders", pool);\n' +
                '\n' +
                '            CompletableFuture<String> failing =\n' +
                '                    CompletableFuture.<String>supplyAsync(() -> {\n' +
                '                        throw new IllegalStateException("recommendations down");\n' +
                '                    }, pool).exceptionally(e -> "no recommendations");\n' +
                '\n' +
                '            String page = profile\n' +
                '                    .thenCombine(orders, (p, o) -> p + " + " + o)\n' +
                '                    .thenCombine(failing, (both, r) -> both + " + " + r)\n' +
                '                    .join();\n' +
                '\n' +
                '            System.out.println(page);\n' +
                '        }\n' +
                '    }\n' +
                '}',
            output: {
                kind: 'stdout',
                lines: ['profile + orders + no recommendations'],
                explain:
                    '<p>Three calls run concurrently and the page is assembled from all three. ' +
                    'The failing one degraded to a fallback inside the chain, so one dead ' +
                    'downstream service costs a section of the page rather than the whole ' +
                    'request — which is the shape almost every real aggregation endpoint ' +
                    'wants.</p>'
            }
        }
    ]
},

{
    id: 'completablefuture-exceptions',
    importance: 'should-know',
    subsection: 'executors',
    question: 'How do exceptions behave in a CompletableFuture chain?',
    answer:
        '<p>An exception in one stage <strong>short-circuits every downstream stage</strong> and ' +
        'travels to the end of the chain. <code>thenApply</code> and friends are simply not ' +
        'called; the failure passes through them untouched until something handles it.</p>' +
        '<p>The three handlers, and how they differ:</p>' +
        '<ul>' +
        '<li><strong><code>exceptionally(fn)</code></strong> — runs only on failure, and ' +
        'supplies a replacement value. The natural fallback.</li>' +
        '<li><strong><code>handle((value, error) -&gt; ...)</code></strong> — runs on both, and ' +
        'returns a value. Use it when the recovery needs to know which happened.</li>' +
        '<li><strong><code>whenComplete((value, error) -&gt; ...)</code></strong> — runs on ' +
        'both and <em>cannot change the result</em>. For logging and cleanup. If the stage ' +
        'failed, it still fails afterwards.</li>' +
        '</ul>' +
        '<p>Two things that bite. The exception you catch is wrapped in a ' +
        '<code>CompletionException</code> (or <code>ExecutionException</code> from ' +
        '<code>get()</code>), so the handler must unwrap with <code>getCause()</code> before ' +
        'testing its type. And a future whose exception is never handled and never joined ' +
        '<strong>fails completely silently</strong> — no stack trace, no log line, nothing. A ' +
        'fire-and-forget <code>supplyAsync</code> that throws is a bug that leaves no evidence, ' +
        'which is why every chain should end in a <code>whenComplete</code> that at least ' +
        'logs.</p>' +
        '<p>Note also that <code>join()</code> throws the unchecked ' +
        '<code>CompletionException</code> while <code>get()</code> throws the checked ' +
        '<code>ExecutionException</code>. That is the only real difference between them, and it ' +
        'is why <code>join()</code> is the one that works inside a lambda.</p>',
    referenceLinks: [],
    tags: ['concurrency', 'futures', 'error-handling'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'forkjoin-common-pool',
    importance: 'should-know',
    subsection: 'executors',
    question: 'What is the ForkJoin common pool, and why should you be careful with parallel streams?',
    answer:
        '<p>The common pool is a single, JVM-wide <code>ForkJoinPool</code> with ' +
        '<code>availableProcessors() - 1</code> worker threads. Every parallel stream uses it, ' +
        'and so does every <code>CompletableFuture</code> that does not name an executor.</p> ' +
        '<p>Two consequences follow, and both are the reason to be careful.</p>' +
        '<p><strong>It is shared.</strong> A slow parallel stream in one library delays parallel ' +
        'streams everywhere else in the process, including in framework code you did not write. ' +
        'There is no isolation and no per-caller fairness.</p>' +
        '<p><strong>It is sized for computation.</strong> One thread per core is right for ' +
        'CPU-bound work and badly wrong for blocking work: put a blocking HTTP call inside a ' +
        '<code>parallelStream().forEach()</code> and you have occupied every core\'s worth of ' +
        'workers waiting on a socket. The pool has a managed-blocker mechanism to compensate, ' +
        'but streams do not use it.</p>' +
        '<p>When a parallel stream <em>is</em> worth it: a large data set already in memory, a ' +
        'cheap and stateless per-element operation, a source that splits evenly (an array or an ' +
        '<code>ArrayList</code> — a <code>LinkedList</code> or an <code>Iterator</code>-based ' +
        'source splits terribly), and enough total work to pay for the split and merge. That is ' +
        'a narrow set of conditions, and the honest default in a web application is to leave ' +
        'streams sequential: the server is already running your requests in parallel, and the ' +
        'cores are already busy.</p>' +
        '<p>To run a parallel stream on your own pool, submit the terminal operation to a ' +
        '<code>ForkJoinPool</code> — the stream picks up the pool of the thread that runs it. ' +
        'It works, it is undocumented behaviour, and saying so is a better answer than ' +
        'pretending it is supported.</p>',
    referenceLinks: [
        { title: 'ForkJoinPool.commonPool — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/ForkJoinPool.html#commonPool()' }
    ],
    tags: ['concurrency', 'streams', 'forkjoin', 'thread-pools'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'countdownlatch-vs-cyclicbarrier',
    importance: 'good-to-know',
    subsection: 'executors',
    question: 'CountDownLatch, CyclicBarrier, Semaphore, Phaser — which does what?',
    answer:
        '<ul>' +
        '<li><strong><code>CountDownLatch</code></strong> — one-shot. Threads ' +
        '<code>await()</code> until a count reaches zero. It <strong>cannot be reset</strong>. ' +
        'Use it for "wait until the system has started" or "wait for these five calls to ' +
        'finish".</li>' +
        '<li><strong><code>CyclicBarrier</code></strong> — reusable, and it counts ' +
        '<em>arrivals</em> rather than events. N threads each call <code>await()</code> and all ' +
        'are released together; then it resets. It can run a barrier action on the last thread ' +
        'in. Use it for iterative parallel algorithms where every worker must finish round k ' +
        'before any starts k+1.</li>' +
        '<li><strong><code>Semaphore</code></strong> — a permit counter. ' +
        '<code>acquire()</code> and <code>release()</code> bound how many threads may be doing ' +
        'something at once. This is the tool for rate and concurrency limiting, and it is what ' +
        'you use to bound virtual threads against a scarce downstream resource.</li>' +
        '<li><strong><code>Phaser</code></strong> — a barrier where the number of participants ' +
        'can change between phases. More flexible and more complicated; rarely the right answer ' +
        'unless the party size genuinely varies.</li>' +
        '</ul>' +
        '<p>The distinction people miss is the first two. A latch counts <em>things that ' +
        'happened</em> and is done forever; a barrier counts <em>threads that arrived</em> and ' +
        'starts again. A latch cannot be reused, and reaching for one where you needed a ' +
        'barrier means creating a new latch per round.</p>' +
        '<p>In application code, <code>CompletableFuture.allOf()</code> has largely replaced ' +
        'the latch for fan-in, and a bounded executor has replaced the semaphore for limiting ' +
        'platform threads. The semaphore came back into fashion with virtual threads, where ' +
        'there is no pool to do the limiting.</p>',
    referenceLinks: [],
    tags: ['concurrency', 'synchronizers', 'latches'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'scheduled-executor-drift',
    importance: 'good-to-know',
    subsection: 'executors',
    question: 'What is the difference between scheduleAtFixedRate and scheduleWithFixedDelay, and what happens when a task throws?',
    answer:
        '<p><code>scheduleAtFixedRate</code> starts a run every period, measured from the ' +
        '<em>start</em> of the previous one. <code>scheduleWithFixedDelay</code> waits the delay ' +
        'after the previous run <em>finished</em>.</p>' +
        '<p>The difference matters when a run overruns its period. At fixed rate, executions do ' +
        'not overlap — the scheduler serialises them — but they bunch up, so a task that ' +
        'occasionally takes longer than its period will run back-to-back trying to catch up. ' +
        'With a fixed delay there is always a gap, so a slow run simply shifts the schedule ' +
        'later. <strong>Fixed delay is the safer default</strong> for anything that talks to a ' +
        'database or another service.</p>' +
        '<p>The part that causes real incidents: <strong>if a scheduled task throws an uncaught ' +
        'exception, it is never run again.</strong> Silently. The future holds the exception, ' +
        'and nobody is looking at the future. A nightly job stops running in March and is ' +
        'noticed in July.</p>' +
        '<p>So wrap the body in a try/catch that logs and swallows, and let the schedule ' +
        'survive. In Spring, <code>@Scheduled</code> has the same behaviour and the same fix; ' +
        'the framework logs the exception, which is better than the bare JDK, but the task is ' +
        'still cancelled.</p>' +
        '<p>And in a multi-instance deployment, remember a scheduler runs on every instance. ' +
        'Either make the task idempotent or take a lock — ShedLock and the like exist for ' +
        'exactly this, and "we scaled to three pods and started sending three emails" is a ' +
        'common incident.</p>',
    referenceLinks: [
        { title: 'ScheduledExecutorService — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/ScheduledExecutorService.html' }
    ],
    tags: ['concurrency', 'scheduling', 'executors', 'operations'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'submit-swallows-exceptions',
    importance: 'good-to-know',
    subsection: 'executors',
    question: 'Why does an exception thrown inside executor.submit() never appear in the logs?',
    answer:
        '<p>Because <code>submit()</code> captures it in the <code>Future</code> instead of ' +
        'letting it out. If nobody calls <code>get()</code>, nobody ever learns it happened — ' +
        'not the uncaught exception handler, not the logger, nothing.</p>' +
        '<p><code>execute()</code> behaves differently: a <code>Runnable</code> that throws ' +
        'propagates to the thread\'s <code>UncaughtExceptionHandler</code>, so it is at least ' +
        'visible. Two methods that look interchangeable and have opposite failure ' +
        'visibility.</p>' +
        '<p>Three fixes, any of which works:</p>' +
        '<ul>' +
        '<li><strong>Always consume the <code>Future</code>.</strong> If the result is not ' +
        'needed, at least <code>get()</code> it to surface the failure.</li>' +
        '<li><strong>Catch inside the task.</strong> A try/catch around the whole body that ' +
        'logs is the simplest thing that works, and it is what most production task code ' +
        'does.</li>' +
        '<li><strong>Override <code>afterExecute</code></strong> on your ' +
        '<code>ThreadPoolExecutor</code> — it receives the throwable for ' +
        '<code>execute()</code>, and for <code>submit()</code> it must unwrap the ' +
        '<code>Future</code>, which the JDK documentation shows how to do.</li>' +
        '</ul>' +
        '<p>Set a <code>ThreadFactory</code> with an <code>UncaughtExceptionHandler</code> ' +
        'anyway. It costs nothing and it is the only thing standing between a thread dying ' +
        'quietly and someone finding out.</p>',
    referenceLinks: [],
    tags: ['concurrency', 'executors', 'error-handling', 'observability'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

/* ==== Virtual Threads & Structured Concurrency ======================== */

{
    id: 'what-virtual-threads-change',
    importance: 'must-know',
    subsection: 'virtual',
    question: 'What are virtual threads, and what problem do they solve?',
    answer:
        '<p>A virtual thread is a <code>Thread</code> scheduled by the JVM rather than by the ' +
        'operating system. It runs on a small pool of platform threads — the carriers — and ' +
        'when it blocks, the JVM unmounts it from its carrier and parks its stack on the heap, ' +
        'freeing the carrier for another virtual thread. When the blocking call completes it is ' +
        'mounted again, possibly on a different carrier.</p>' +
        '<p>The problem they solve is the one that produced reactive programming. In the ' +
        'thread-per-request model a blocked thread is an idle OS thread costing a megabyte of ' +
        'stack, so serving ten thousand concurrent requests needs ten thousand threads, which ' +
        'does not work. The industry\'s answer was to stop blocking: callbacks, then futures, ' +
        'then reactive streams — all of which recover scalability by giving up the call stack, ' +
        'and with it readable code, usable stack traces, working debuggers and try/catch.</p>' +
        '<p>Virtual threads recover scalability <em>without</em> giving those up. Blocking code ' +
        'stays blocking code, and the runtime makes it cheap. A virtual thread costs a few ' +
        'hundred bytes and starting a million is reasonable.</p>' +
        '<p>What does <strong>not</strong> change, and is where the follow-up questions go:</p>' +
        '<ul>' +
        '<li>They are not faster. Latency per request is the same; what improves is how many ' +
        'you can have in flight.</li>' +
        '<li>They do not help CPU-bound work at all. You still have the cores you have.</li>' +
        '<li><strong>Do not pool them.</strong> Pooling exists to amortise an expensive ' +
        'resource, and these are cheap. Use ' +
        '<code>Executors.newVirtualThreadPerTaskExecutor()</code>, which creates one per task.</li>' +
        '<li>The bottleneck moves downstream. A million virtual threads hitting a ten-connection ' +
        'pool just queue on the pool, so you still bound concurrency — with a ' +
        '<code>Semaphore</code>, not with a thread pool.</li>' +
        '</ul>' +
        '<p>In Spring Boot 3.2 and later this is one property: ' +
        '<code>spring.threads.virtual.enabled=true</code>.</p>',
    referenceLinks: [
        { title: 'JEP 444: Virtual Threads', url: 'https://openjdk.org/jeps/444' }
    ],
    tags: ['concurrency', 'virtual-threads', 'modern-java', 'scalability'],
    images: [],
    hasDiagram: true,
    diagramType: 'animation',
    diagramConfig: {
        title: 'What happens when a virtual thread blocks',
        steps: [
            { label: 'Mounted',   caption: 'running on a carrier' },
            { label: 'Blocks',    caption: 'socket read, JDBC call' },
            { label: 'Unmounts',  caption: 'stack copied to heap' },
            { label: 'Carrier free', caption: 'runs another task' },
            { label: 'Remounts',  caption: 'possibly a different carrier' }
        ]
    },
    codeSnippets: [
        {
            language: 'java',
            title: 'Ten thousand concurrent tasks, no pool',
            code:
                'import java.time.Duration;\n' +
                'import java.util.concurrent.*;\n' +
                'import java.util.concurrent.atomic.AtomicInteger;\n' +
                '\n' +
                'public class Virtual {\n' +
                '    public static void main(String[] args) throws Exception {\n' +
                '        AtomicInteger done = new AtomicInteger();\n' +
                '\n' +
                '        // One virtual thread per task. No sizing decision, because\n' +
                '        // there is no pool and nothing to size.\n' +
                '        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {\n' +
                '            for (int i = 0; i < 10_000; i++) {\n' +
                '                executor.submit(() -> {\n' +
                '                    Thread.sleep(Duration.ofMillis(200));   // blocking, on purpose\n' +
                '                    done.incrementAndGet();\n' +
                '                    return null;\n' +
                '                });\n' +
                '            }\n' +
                '        }   // close() waits for every task\n' +
                '\n' +
                '        System.out.println(done.get());\n' +
                '        System.out.println(Thread.ofVirtual().unstarted(() -> {}).isVirtual());\n' +
                '    }\n' +
                '}',
            output: {
                kind: 'stdout',
                lines: ['10000', 'true'],
                explain:
                    '<p>Ten thousand blocking sleeps complete, on a machine that could not host ' +
                    'ten thousand platform threads. The same program with ' +
                    '<code>newFixedThreadPool(200)</code> produces the same number and takes ' +
                    'roughly fifty times as long, because the sleeps serialise through the ' +
                    'pool.</p>'
            }
        }
    ]
},

{
    id: 'virtual-thread-pinning',
    importance: 'must-know',
    subsection: 'virtual',
    question: 'What is pinning, and how do you find it?',
    answer:
        '<p>Pinning is a virtual thread that <strong>cannot unmount from its carrier while it ' +
        'blocks</strong>. The carrier — a real OS thread — is stuck too, so the whole point of ' +
        'the exercise is lost for the duration. With a default carrier pool of one per core, a ' +
        'handful of pinned threads can stall an entire application.</p>' +
        '<p>Two causes:</p>' +
        '<ul>' +
        '<li><strong>Blocking inside a <code>synchronized</code> block or method.</strong> The ' +
        'monitor is associated with the carrier, so the virtual thread cannot be moved off it. ' +
        'This was the big one.</li>' +
        '<li><strong>Blocking inside a native frame</strong> — a JNI call, or a foreign function ' +
        'call. This one remains.</li>' +
        '</ul>' +
        '<p><strong>The version detail matters here.</strong> JEP 491, delivered in Java 24, ' +
        'reimplemented <code>synchronized</code> so that a virtual thread blocking inside a ' +
        'monitor unmounts normally. On Java 21, 22 and 23 the advice was to replace ' +
        '<code>synchronized</code> with <code>ReentrantLock</code> in any code path that ' +
        'blocks; on 24 and later that is no longer necessary. Knowing which JDK you are on is ' +
        'therefore part of the answer, and a candidate who states the old advice as timeless ' +
        'is dating themselves.</p>' +
        '<p><strong>How to find it:</strong> run with ' +
        '<code>-Djdk.tracePinnedThreads=full</code>, which prints a stack trace whenever a ' +
        'pinned thread blocks, or watch the <code>jdk.VirtualThreadPinned</code> JFR event, ' +
        'which is the option that works in production. The usual culprits are older JDBC ' +
        'drivers, connection pools and logging frameworks that synchronise on an appender.</p>',
    referenceLinks: [
        { title: 'JEP 491: Synchronize Virtual Threads without Pinning', url: 'https://openjdk.org/jeps/491' }
    ],
    tags: ['concurrency', 'virtual-threads', 'pinning', 'diagnostics'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'virtual-threads-vs-reactive',
    importance: 'must-know',
    subsection: 'virtual',
    question: 'Do virtual threads make reactive programming obsolete?',
    answer:
        '<p>For most services, yes — but the honest answer distinguishes the two things reactive ' +
        'was doing.</p>' +
        '<p><strong>Reactive as a scalability workaround is obsolete.</strong> If the reason for ' +
        'WebFlux was "we cannot afford a thread per request", virtual threads solve that ' +
        'without the cost: readable stack traces, working debuggers, ordinary try/catch, ' +
        '<code>ThreadLocal</code> that behaves, and profilers that understand the call stack. ' +
        'Reactive code pays all of those away, and that price was always the point of ' +
        'contention.</p>' +
        '<p><strong>Reactive as a programming model is not obsolete.</strong> Two things it does ' +
        'that virtual threads do not:</p>' +
        '<ul>' +
        '<li><strong>Back-pressure.</strong> Reactive Streams has a protocol for a slow consumer ' +
        'to tell a fast producer to slow down. Virtual threads have no equivalent — you bound ' +
        'concurrency with a semaphore or a queue, which is coarser.</li>' +
        '<li><strong>Streaming and event composition.</strong> Operators over an unbounded ' +
        'stream of events — windowing, throttling, merging, retry with backoff — are genuinely ' +
        'well expressed as a pipeline, and awkward as blocking code.</li>' +
        '</ul>' +
        '<p>So: request/response services that call a database and two other services should be ' +
        'blocking code on virtual threads. Event stream processing and long-lived push ' +
        'connections still have a good case for reactive. And a hybrid is fine — a reactive ' +
        'client inside a blocking service is a normal thing to do.</p>' +
        '<p>The wrong answer is that virtual threads make everything faster. They make blocking ' +
        'cheap; they do not make anything fast.</p>',
    referenceLinks: [
        { title: 'JEP 444: Virtual Threads', url: 'https://openjdk.org/jeps/444' }
    ],
    tags: ['concurrency', 'virtual-threads', 'reactive', 'architecture'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'structured-concurrency',
    importance: 'should-know',
    subsection: 'virtual',
    question: 'What does structured concurrency add on top of virtual threads?',
    answer:
        '<p>It applies to concurrency the same rule that structured programming applied to ' +
        'control flow: <strong>a task split into concurrent subtasks must join them all before ' +
        'it returns.</strong> The concurrent work has a scope, and it cannot outlive it.</p>' +
        '<p>The problem it fixes is real. With a bare executor, submitting two subtasks and ' +
        'waiting on both by hand means writing the cancellation logic yourself: if the first ' +
        'fails, the second keeps running and nobody is waiting for it; if the caller is ' +
        'cancelled, neither subtask learns. Those leaks are easy to write and hard to see in a ' +
        'review.</p>' +
        '<p><code>StructuredTaskScope</code> gives you:</p>' +
        '<ul>' +
        '<li><strong>Automatic cancellation.</strong> A shutdown-on-failure scope interrupts the ' +
        'remaining subtasks the moment one fails. A shutdown-on-success scope cancels the losers ' +
        'as soon as one wins.</li>' +
        '<li><strong>Guaranteed join.</strong> The scope closes in a try-with-resources, and ' +
        'closing waits.</li>' +
        '<li><strong>A real stack.</strong> The subtask relationship is visible in a thread dump ' +
        'as a hierarchy, so you can see which parent spawned what — which is exactly what ' +
        'thread pools destroy.</li>' +
        '</ul>' +
        '<p><strong>Say the version out loud.</strong> This has been in preview across several ' +
        'JDK releases with an API that changed between them, so any answer should be scoped to ' +
        'a JDK version and checked against the release notes rather than recited from a ' +
        'tutorial. The concept has been stable; the method names have not.</p>',
    referenceLinks: [
        { title: 'JEP 453: Structured Concurrency (Preview)', url: 'https://openjdk.org/jeps/453' }
    ],
    tags: ['concurrency', 'structured-concurrency', 'virtual-threads', 'preview'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'scoped-values',
    importance: 'should-know',
    subsection: 'virtual',
    question: 'What are scoped values, and why not just use ThreadLocal with virtual threads?',
    answer:
        '<p><code>ThreadLocal</code> works with virtual threads, and that is the problem: with a ' +
        'million of them, a per-thread map per value is a lot of memory, and none of it is ' +
        'shared with the child tasks that need it.</p>' +
        '<p><code>ThreadLocal</code> has three properties that were always awkward and become ' +
        'expensive at that scale: it is <strong>mutable</strong> from anywhere in the call ' +
        'stack, so nothing tells you where a value came from; it is <strong>unbounded in ' +
        'lifetime</strong>, so it leaks unless someone remembers to remove it; and it is ' +
        '<strong>expensive to inherit</strong>, since an inheritable one copies the whole map ' +
        'into every child thread.</p>' +
        '<p>A <code>ScopedValue</code> is immutable and bounded. It is bound for the dynamic ' +
        'extent of one call — <code>ScopedValue.where(KEY, value).run(task)</code> — and ' +
        'automatically unbound when that returns. There is nothing to remove and nothing to ' +
        'leak. Child threads created by a structured task scope inherit it by sharing rather ' +
        'than by copying, so inheritance is effectively free.</p>' +
        '<p>The use is the same one <code>ThreadLocal</code> served: request context, ' +
        'correlation ids, the current principal, a tenant — things that a deep call stack needs ' +
        'and that nobody wants to thread through fifteen signatures. The difference is that the ' +
        'value is a fact about a scope rather than a mutable slot on a thread.</p>' +
        '<p>This too has been a preview feature across several releases. State the JDK version ' +
        'you are describing.</p>',
    referenceLinks: [
        { title: 'JEP 446: Scoped Values (Preview)', url: 'https://openjdk.org/jeps/446' }
    ],
    tags: ['concurrency', 'scoped-values', 'virtual-threads', 'threadlocal'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'bounding-virtual-threads',
    importance: 'should-know',
    subsection: 'virtual',
    question: 'If you do not pool virtual threads, how do you stop a million of them hitting your database?',
    answer:
        '<p>With a <code>Semaphore</code>, placed at the resource rather than at the thread.</p>' +
        '<p>This is the conceptual shift virtual threads require. A thread pool was doing two ' +
        'unrelated jobs at once: amortising expensive threads, and limiting concurrency against ' +
        'whatever the tasks touched. Virtual threads make the first job unnecessary, and the ' +
        'second job still has to be done — just explicitly, and at the right place.</p>' +
        '<p>The advantages of doing it explicitly are real. One semaphore per downstream ' +
        'dependency gives you a bulkhead for free: the slow third-party API cannot starve the ' +
        'fast local one, because they hold different permits. The limit is now stated where the ' +
        'constraint actually is, rather than inferred from a pool size three layers away. And ' +
        'the number is meaningful — "at most twenty concurrent calls to the payment provider" ' +
        'is a sentence someone can check against a contract.</p>' +
        '<p>Practical notes: acquire and release in a try/finally, or the permits leak and the ' +
        'application deadlocks; prefer <code>tryAcquire</code> with a timeout so a saturated ' +
        'dependency produces a fast failure rather than an unbounded queue of waiters; and ' +
        'remember the connection pool is itself a semaphore, so wrapping JDBC calls in another ' +
        'one is only worth it if you want to fail faster than the pool times out.</p>' +
        '<p>Resilience4j\'s bulkhead is this pattern with metrics and configuration attached, ' +
        'and is usually the better answer than a hand-rolled semaphore in a real service.</p>',
    referenceLinks: [],
    tags: ['concurrency', 'virtual-threads', 'semaphore', 'bulkhead'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'virtual-threads-in-spring-boot',
    importance: 'should-know',
    subsection: 'virtual',
    question: 'What actually changes in a Spring Boot application when you enable virtual threads?',
    answer:
        '<p>One property — <code>spring.threads.virtual.enabled=true</code>, from Boot 3.2 on a ' +
        'JDK 21 or later — and Boot switches several executors over: the servlet container\'s ' +
        'request handling (Tomcat or Jetty), the <code>@Async</code> executor, the ' +
        '<code>@Scheduled</code> task scheduler, and the Kafka and RabbitMQ listener ' +
        'containers.</p>' +
        '<p>What that means concretely:</p>' +
        '<ul>' +
        '<li>The request thread pool stops being the concurrency limit. Tomcat\'s ' +
        '<code>max-threads</code> no longer bounds in-flight requests, so the bound has to come ' +
        'from somewhere else — the connection pool, a semaphore, or a rate limit at the ' +
        'gateway.</li>' +
        '<li><strong>Every <code>ThreadLocal</code> assumption needs re-checking.</strong> A ' +
        'value cached per request thread is now cached per request, which is usually more ' +
        'correct. A value cached expecting to be reused across requests on a pooled thread is ' +
        'now recomputed every time, which may be a performance regression.</li>' +
        '<li>Thread names change and become unbounded in number, so log patterns and dashboards ' +
        'keyed on thread name stop being useful.</li>' +
        '<li>Pinning becomes a production concern. Audit the JDBC driver, the connection pool ' +
        'and the logging appenders, and turn on the JFR pinning event before rolling it out.</li>' +
        '</ul>' +
        '<p>The honest summary: it is a one-line change with a real testing burden, and the ' +
        'benefit shows up only under high concurrency with blocking IO. A service handling ' +
        'fifty concurrent requests will see no difference at all, and saying so is a better ' +
        'answer than enthusiasm.</p>',
    referenceLinks: [
        { title: 'Spring Boot Reference — Virtual Threads', url: 'https://docs.spring.io/spring-boot/reference/features/task-execution-and-scheduling.html' }
    ],
    tags: ['concurrency', 'virtual-threads', 'spring-boot', 'operations'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: [
        {
            language: 'properties',
            title: 'Enabling it, and the two things to check afterwards',
            code:
                '# Boot 3.2+, JDK 21+. Switches the servlet container, @Async,\n' +
                '# @Scheduled and the messaging listener containers to virtual threads.\n' +
                'spring.threads.virtual.enabled=true\n' +
                '\n' +
                '# max-threads is no longer the concurrency limit. The connection pool is.\n' +
                'spring.datasource.hikari.maximum-pool-size=20\n' +
                '\n' +
                '# Graceful shutdown matters more, not less: in-flight requests are no\n' +
                '# longer bounded by a small pool, so there can be many more of them.\n' +
                'server.shutdown=graceful\n' +
                'spring.lifecycle.timeout-per-shutdown-phase=30s',
            output: {
                kind: 'trace',
                lines: [
                    'Boot replaces the Tomcat executor with a virtual-thread-per-task executor.',
                    'Requests are no longer queued behind a fixed pool, so more run concurrently.',
                    'Each one that touches the database now competes for a Hikari connection.',
                    'The connection pool becomes the real concurrency limit for database work.',
                    'Anything pinning a carrier thread now stalls unrelated requests, so audit for it.'
                ],
                explain:
                    '<p>The property is the easy part. The work is re-establishing where the ' +
                    'concurrency limit lives, because it moved from a place that was tuned to ' +
                    'a place that probably was not.</p>'
            }
        }
    ]
},

{
    id: 'virtual-thread-observability',
    importance: 'good-to-know',
    subsection: 'virtual',
    question: 'How do you debug and monitor an application running a million virtual threads?',
    answer:
        '<p>Most of the existing tooling assumes threads are scarce, and a million of them ' +
        'breaks that assumption in a few specific ways.</p>' +
        '<ul>' +
        '<li><strong>Thread dumps.</strong> <code>jstack</code> does not show virtual threads. ' +
        'Use <code>jcmd &lt;pid&gt; Thread.dump_to_file -format=json &lt;file&gt;</code>, which ' +
        'was added for exactly this and emits a structured dump that a tool can read — a ' +
        'million stacks is not something to read by eye. Structured concurrency makes that dump ' +
        'far more useful, because the parent-child relationships are in it.</li>' +
        '<li><strong>JFR.</strong> The events to know are ' +
        '<code>jdk.VirtualThreadStart</code>, <code>jdk.VirtualThreadEnd</code>, ' +
        '<code>jdk.VirtualThreadPinned</code> and ' +
        '<code>jdk.VirtualThreadSubmitFailed</code>. The pinned one is the one to alert on.</li>' +
        '<li><strong>Metrics.</strong> A thread-count gauge is now meaningless — the useful ' +
        'numbers are in-flight requests, carrier pool utilisation, and saturation of whatever ' +
        'the semaphores and connection pools are guarding.</li>' +
        '<li><strong>Logging.</strong> Thread name is no longer a useful correlation key, ' +
        'because it is unique per request and carries no meaning. Use an explicit correlation ' +
        'id in the MDC, propagated deliberately.</li>' +
        '</ul>' +
        '<p>The good news is the part reactive gave up: a virtual thread has a real stack, so ' +
        'stack traces are complete and a debugger steps through the code as written. That is a ' +
        'large operational advantage and worth naming.</p>',
    referenceLinks: [],
    tags: ['concurrency', 'virtual-threads', 'observability', 'diagnostics'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'thread-per-task-executor-lifecycle',
    importance: 'good-to-know',
    subsection: 'virtual',
    question: 'Why is newVirtualThreadPerTaskExecutor() usually used in a try-with-resources?',
    answer:
        '<p>Because <code>ExecutorService</code> became <code>AutoCloseable</code> in Java 19, ' +
        'and <code>close()</code> does the right thing: it shuts the executor down and ' +
        '<strong>blocks until every submitted task has finished</strong>.</p>' +
        '<p>That turns a block of concurrent work into a lexical scope. Everything submitted ' +
        'inside the <code>try</code> is complete by the closing brace, with no ' +
        '<code>awaitTermination</code> call to forget and no chance of the method returning ' +
        'while its own tasks are still running. It is the same discipline structured ' +
        'concurrency formalises, available without a preview flag.</p>' +
        '<p>Two things to know about it. <code>close()</code> is uninterruptible in the sense ' +
        'that it keeps waiting — if a task hangs, the enclosing method hangs with it, which is ' +
        'usually better than silently proceeding but is worth designing for with timeouts inside ' +
        'the tasks. And it is not free to call on a long-lived shared executor: this idiom is ' +
        'for an executor scoped to one unit of work, which is exactly what a virtual-thread ' +
        'executor should be, since creating one costs almost nothing.</p>' +
        '<p>The same pattern works for a platform-thread executor, and is a strictly better ' +
        'shutdown than most hand-written ones.</p>',
    referenceLinks: [],
    tags: ['concurrency', 'virtual-threads', 'executors', 'lifecycle'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
}

    ]
};
