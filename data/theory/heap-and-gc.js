/* ==========================================================================
   data/theory/heap-and-gc.js — module 23 in the reading path

   Nine chapters. The order runs from where objects live, through how they
   are collected, to what you type when someone asks you to tune it — which
   is the order the interview follows too, and it ends on reading a log
   rather than on a flag, because the flag is only ever the second half of
   an answer.
   ========================================================================== */

const heapAndGcModule = {
    id: 'heap-and-gc',
    trackId: 'java-platform',
    order: 23,
    title: 'The Heap and the Collector',
    tagline: 'Generations, G1, ZGC, and answering "how would you tune this".',
    estimatedMinutes: 50,
    prerequisites: ['how-java-runs'],
    docHub: { title: 'HotSpot Virtual Machine Garbage Collection Tuning Guide', url: 'https://docs.oracle.com/en/java/javase/21/gctuning/index.html' },

    chapters: [
        {
            id: 'memory-areas',
            title: 'Where Memory Actually Goes',
            importance: 'must-know',
            summary: 'The heap is one of six or seven places a JVM keeps memory, and several of the others are what actually caused the container to be killed.',
            interviewAngle: 'Asked as "explain JVM memory areas". The listing answer is fine; the answer that stands out adds that -Xmx bounds only the heap, so a container limit set equal to -Xmx is a container that will be OOM-killed.',
            buildsOn: [],
            blocks: [
                {
                    type: 'types',
                    title: 'The areas, and who bounds each one',
                    items: [
                        { name: 'Heap', html: '<p>Every object and every array. Shared by all threads, collected by the GC, bounded by <code>-Xmx</code>. This is the only area most people can name and it is usually 60–80% of the total.</p>' },
                        { name: 'Metaspace', html: '<p>Class metadata — the runtime representation of every loaded class. <strong>Native memory, not heap</strong>, and unbounded by default. Replaced PermGen in Java 8, which changed the failure from "runs out at a fixed size" to "grows until the container dies".</p>' },
                        { name: 'Thread stacks', html: '<p>One per platform thread, <code>-Xss</code> each, typically 512KB to 1MB. Native memory. A thousand threads is a gigabyte that <code>-Xmx</code> knows nothing about.</p>' },
                        { name: 'Code cache', html: '<p>JIT-compiled native code. Bounded by <code>-XX:ReservedCodeCacheSize</code>, 240MB by default. When it fills, the JIT switches off and the application quietly reverts to interpreted speed.</p>' },
                        { name: 'Direct byte buffers', html: '<p>Off-heap buffers allocated by NIO, Netty and most drivers. Bounded by <code>-XX:MaxDirectMemorySize</code>, which defaults to the same value as <code>-Xmx</code> — so the default budget is <em>twice</em> the heap.</p>' },
                        { name: 'GC and JVM overhead', html: '<p>Card tables, remembered sets, the compressed class space, symbol tables. Small individually, several hundred megabytes together on a large heap.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Setting a container limit equal to <code>-Xmx</code> guarantees an eventual OOM kill</strong>, and it will not look like a Java problem: there is no <code>OutOfMemoryError</code>, no heap dump and no stack trace, just exit code 137 and a restart. Everything in the list above except the heap lives outside <code>-Xmx</code>. Either leave headroom of roughly 25%, or stop setting <code>-Xmx</code> at all and let <code>-XX:MaxRAMPercentage=75</code> derive it from the cgroup limit — which then follows the limit when someone changes it.</p>'
                },
                {
                    type: 'tip',
                    html: '<p><code>-XX:NativeMemoryTracking=summary</code> plus <code>jcmd &lt;pid&gt; VM.native_memory summary</code> prints the actual split across every one of these areas. It is the only way to answer "the heap is 2GB, why is the RSS 4GB", and being able to name the command is worth more than being able to name the areas.</p>'
                }
            ],
            docs: [
                { title: 'JVMS 2.5 — Run-Time Data Areas', url: 'https://docs.oracle.com/javase/specs/jvms/se21/html/jvms-2.html#jvms-2.5', kind: 'spec' },
                { title: 'Native Memory Tracking', url: 'https://docs.oracle.com/en/java/javase/21/vm/native-memory-tracking.html', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'young-and-old-generations',
            title: 'Why the Heap Has Generations',
            importance: 'must-know',
            summary: 'Almost every object dies young. Generational collection is the whole design consequence of that one measured fact.',
            interviewAngle: 'The question is "explain young and old generation", and the answer that shows understanding starts from the hypothesis rather than the diagram: the generations exist because collecting a region where 95% of objects are already dead is nearly free.',
            buildsOn: ['memory-areas'],
            blocks: [
                {
                    type: 'definition',
                    term: 'Weak generational hypothesis',
                    important: true,
                    html: '<p>The observation, true of nearly every measured program, that <strong>most objects die very young</strong> and that few references point from old objects to young ones. Both halves matter: the first makes a young collection cheap, and the second makes it possible to collect the young generation <em>without</em> scanning the old one.</p>'
                },
                {
                    type: 'prose',
                    html: '<p>A tracing collector costs time proportional to the <em>surviving</em> objects, not the dead ones — it copies what is live and abandons the rest wholesale. So if a region is 95% garbage, collecting it costs about 5% of what its size suggests. The generational layout is a way of arranging for that to be true on purpose: put new objects where the death rate is highest, and collect that region often.</p>'
                },
                {
                    type: 'diagram',
                    diagramType: 'flowchart',
                    caption: 'The path of one object that survives long enough to be promoted.',
                    diagramConfig: {
                        title: 'Eden to Old',
                        nodes: [
                            { id: 'eden', label: 'Allocated in Eden', kind: 'start' },
                            { id: 'minor', label: 'Eden fills: minor GC', kind: 'decision' },
                            { id: 'dead', label: 'Unreachable — cost nothing to collect', kind: 'step' },
                            { id: 'surv', label: 'Copied to a survivor space', kind: 'step' },
                            { id: 'age', label: 'Age past the tenuring threshold?', kind: 'decision' },
                            { id: 'old', label: 'Promoted to the old generation', kind: 'fix' }
                        ],
                        edges: [
                            { from: 'eden', to: 'minor' },
                            { from: 'minor', to: 'dead', label: 'dead' },
                            { from: 'minor', to: 'surv', label: 'live' },
                            { from: 'surv', to: 'age' },
                            { from: 'age', to: 'surv', label: 'no — copied again' },
                            { from: 'age', to: 'old', label: 'yes' }
                        ]
                    }
                },
                {
                    type: 'table',
                    title: 'The two collection kinds, and what each one costs',
                    headers: ['', 'Minor (young) GC', 'Full GC'],
                    rows: [
                        ['Collects', 'Eden and one survivor space', 'The entire heap, old generation included'],
                        ['Typical pause', 'A few milliseconds', '<strong>Hundreds of milliseconds to seconds</strong>'],
                        ['Frequency', 'Constantly, and that is healthy', 'Should be rare — daily, or never'],
                        ['Triggered by', 'Eden filling up', 'Promotion failure, Metaspace pressure, <code>System.gc()</code>'],
                        ['What it means', 'The application is allocating. Normal', 'Usually that something is retained that should not be']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>"Full GC" and "old-generation GC" are not synonyms, and conflating them misreads every G1 log.</strong> G1 does most old-generation work concurrently, in <em>mixed</em> collections that clean up a few old regions alongside the young ones. A line saying <code>Pause Young (Mixed)</code> is the healthy path. <code>Pause Full</code> is the fallback G1 uses when it could not keep up, and seeing one repeatedly is the signal — not old-generation activity as such.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The counter-intuitive consequence worth stating: <em>"A high allocation rate is not necessarily a problem. Objects that die in Eden cost almost nothing. What costs is the <strong>promotion</strong> rate — objects that survive long enough to be copied into the old generation — so the number I would look at is promotion per second, not allocation per second."</em></p>'
                }
            ],
            docs: [
                { title: 'GC Tuning Guide — Generations', url: 'https://docs.oracle.com/en/java/javase/21/gctuning/garbage-collector-implementation.html', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'allocation-and-tlab',
            title: 'Allocation Is a Pointer Bump',
            importance: 'good-to-know',
            summary: 'Allocating an object in Java is usually cheaper than malloc: each thread owns a slab of Eden and allocation increments a pointer inside it.',
            interviewAngle: 'Comes up when someone claims object creation is expensive and you want to say precisely why it is not. Naming the TLAB, and the fact that a large object bypasses it, is a level of detail few candidates reach.',
            buildsOn: ['young-and-old-generations'],
            blocks: [
                {
                    type: 'definition',
                    term: 'TLAB',
                    html: '<p>Thread-Local Allocation Buffer. A private slab of Eden handed to one thread, inside which allocation is a pointer increment with <strong>no synchronisation at all</strong>. When the slab is exhausted the thread takes another, and only that hand-out is contended.</p>'
                },
                {
                    type: 'prose',
                    html: '<p>This is why "creating objects is expensive, reuse them" is usually wrong advice for modern Java. The common path is a bounds check and an add. Object pooling adds a data structure, adds contention, and — worst of all — keeps objects alive long enough to be promoted, converting cheap young-generation garbage into expensive old-generation garbage. The pool makes the collector\'s job harder in exchange for saving a pointer bump.</p>'
                },
                {
                    type: 'types',
                    title: 'Three ways an allocation gets more expensive',
                    items: [
                        { name: 'Too big for the TLAB', html: '<p>A large array is allocated directly in Eden, under a lock. Still fast; not free.</p>' },
                        { name: 'Humongous, under G1', html: '<p>An object larger than half a G1 region goes straight to the old generation in contiguous regions. Frequent humongous allocation is a real and commonly missed cause of G1 full collections.</p>' },
                        { name: 'Eden is full', html: '<p>The allocation triggers a minor GC and waits for it. This is the only allocation that pauses, and it is the one the pause-time metric is measuring.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>Escape analysis can remove the allocation altogether: an object the JIT can prove never escapes its method may be scalar-replaced into local variables and never exist on the heap. It is unreliable — inlining depth, a lock, a call the JIT cannot see through all defeat it — so treat it as a bonus rather than a design assumption. Mentioning it as "when it applies" rather than "it happens" is the accurate framing.</p>'
                }
            ],
            docs: [
                { title: 'JEP 341: Default CDS Archives', url: 'https://openjdk.org/jeps/341', kind: 'spec' }
            ],
            relatedQuestions: []
        },

        {
            id: 'gc-roots-and-reachability',
            title: 'What Keeps an Object Alive',
            importance: 'must-know',
            summary: 'Nothing is collected because it is unused. It is collected because no chain of references reaches it from a root — and a memory leak in Java is always a chain you forgot about.',
            interviewAngle: 'Two questions in one: "how does the GC know what to collect" and "how can Java have a memory leak if it has a GC". The second only has an answer if you can state the first precisely.',
            buildsOn: ['young-and-old-generations'],
            blocks: [
                {
                    type: 'definition',
                    term: 'GC root',
                    important: true,
                    html: '<p>A reference the collector treats as live by definition, without asking who points to it. An object is <em>reachable</em> — and therefore uncollectable — if any chain of references leads to it from any root.</p>'
                },
                {
                    type: 'types',
                    title: 'The roots',
                    items: [
                        { name: 'Local variables and parameters', html: '<p>Every frame on every live thread stack. The largest and most transient set.</p>' },
                        { name: 'Static fields', html: '<p>Held by the class, which is held by its loader. <strong>A static collection that only ever grows is the archetypal Java memory leak</strong>, because the root never goes away.</p>' },
                        { name: 'Active threads', html: '<p>A running thread is a root, and so is everything it can reach — including its <code>ThreadLocal</code> map.</p>' },
                        { name: 'JNI references', html: '<p>Objects handed to native code. Invisible to a heap analysis that only looks at Java frames.</p>' },
                        { name: 'Monitors and synchronisation', html: '<p>Anything currently used as a lock.</p>' }
                    ]
                },
                {
                    type: 'comparison',
                    title: 'The four reference strengths',
                    left: 'Strength',
                    right: 'When it is cleared, and what for',
                    rows: [
                        { aspect: 'Strong', left: 'An ordinary field or variable', right: 'Never, while reachable. The default and 99% of code' },
                        { aspect: 'Soft', left: '<code>SoftReference</code>', right: 'Cleared when the heap is under pressure. Intended for caches; unpredictable enough that a real cache library is usually better' },
                        { aspect: 'Weak', left: '<code>WeakReference</code>', right: 'Cleared at the next collection. The basis of <code>WeakHashMap</code> and of canonicalising caches' },
                        { aspect: 'Phantom', left: '<code>PhantomReference</code>', right: 'Enqueued after finalisation, for cleanup that must not resurrect the object. What <code>Cleaner</code> is built on' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A <code>WeakHashMap</code> whose values reference their own keys never collects anything.</strong> The key is weakly held, but the strongly-held value holds the key, so the entry keeps itself alive — the exact failure the map was chosen to prevent, and it looks correct in review. The other classic of the same shape: a listener registered on a long-lived publisher and never unregistered, which keeps the entire listener — and its enclosing object — reachable for the life of the publisher.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Define a Java memory leak precisely, because the definition <em>is</em> the answer: <em>"An object that is still reachable from a GC root but will never be used again. The collector is working exactly as specified — it cannot know about intent, only about reachability. So finding a leak means finding the retention path, and the tool for that is a heap dump with a dominator tree."</em></p>'
                }
            ],
            docs: [
                { title: 'java.lang.ref — package summary', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/ref/package-summary.html', kind: 'api' }
            ],
            relatedQuestions: []
        },

        {
            id: 'g1-in-outline',
            title: 'G1, in Enough Detail to Discuss',
            importance: 'must-know',
            summary: 'A region-based collector with a pause-time target. It gets its name from collecting the regions with the most garbage first — garbage first.',
            interviewAngle: 'The default collector since Java 9, so "which collector are you using" almost always means G1. Knowing that regions replaced contiguous generations, and that MaxGCPauseMillis is a goal rather than a guarantee, covers most of what is asked.',
            buildsOn: ['young-and-old-generations'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>G1 divides the heap into equal regions — typically between 1MB and 32MB, chosen so there are roughly 2,048 of them — and assigns each region a role: Eden, Survivor, Old, or Humongous. The generations still exist, but they are <strong>sets of regions rather than contiguous areas</strong>, so the young generation can grow and shrink without moving anything.</p><p>Each collection is a choice of which regions to evacuate. G1 estimates the cost of collecting each candidate and picks as many as it believes fit inside the pause target, preferring the ones with the least live data. That is the name, and it is also the answer to "how does it hit a pause target": it collects less when it needs to be faster.</p>'
                },
                {
                    type: 'types',
                    title: 'The G1 vocabulary that appears in log lines',
                    items: [
                        { name: 'Region', html: '<p>The unit of everything. Allocation, collection and accounting are all per region.</p>' },
                        { name: 'Humongous region', html: '<p>Holds an object larger than half a region. Allocated in the old generation, needs contiguous regions, and until recently was only reclaimed at certain points — <strong>a frequent cause of unexplained full GCs in services that allocate large byte arrays.</strong></p>' },
                        { name: 'Remembered set', html: '<p>Per region, records references pointing <em>into</em> it from elsewhere. This is what lets G1 collect one region without scanning the whole heap, and it is why write barriers exist.</p>' },
                        { name: 'Concurrent marking', html: '<p>Runs alongside the application to find out which old regions are worth collecting. Triggered at <code>InitiatingHeapOccupancyPercent</code>, 45% by default.</p>' },
                        { name: 'Mixed collection', html: '<p>A young collection that also evacuates some old regions. This is G1\'s normal way of reclaiming the old generation — not a full GC.</p>' },
                        { name: 'Evacuation failure', html: '<p>No free region to copy survivors into. Expensive, and the step immediately before a full GC. In a log this is the line that explains the pause.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong><code>-XX:MaxGCPauseMillis</code> is a target, not a contract, and setting it too low makes things worse.</strong> G1 meets an aggressive target by shrinking the young generation, which means collecting more often, which means more objects surviving each collection because they had less time to die — so promotion goes up, the old generation fills faster, and the mixed collections you were trying to avoid arrive sooner. The default of 200ms is a reasonable starting point and 50ms is usually a mistake.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Do not set <code>-Xmn</code> or <code>NewRatio</code> with G1. Fixing the young generation size disables the adaptive sizing that G1 uses to meet its pause target, and it is the single most common way a tuning attempt regresses. Carrying flags over from a Parallel or CMS configuration is how it usually happens.</p>'
                }
            ],
            docs: [
                { title: 'Garbage-First Garbage Collector', url: 'https://docs.oracle.com/en/java/javase/21/gctuning/garbage-first-g1-garbage-collector1.html', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'zgc-and-low-latency',
            title: 'ZGC and the Low-Latency Collectors',
            importance: 'should-know',
            summary: 'Sub-millisecond pauses that do not grow with the heap, paid for with throughput and footprint. Generational ZGC in Java 21 removed most of the reason not to use it.',
            interviewAngle: 'A differentiator. The claim to be able to state precisely is that ZGC pause times are independent of heap size — a 16GB heap and a 16TB heap pause the same — because the work that scales with the heap is done concurrently.',
            buildsOn: ['g1-in-outline'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>G1 evacuates regions during a stop-the-world pause, so its pause length grows with how much it moved. ZGC moves objects <em>while the application runs</em>, using coloured pointers and load barriers: metadata bits in the reference itself record whether the object has been relocated, and a barrier on every reference load fixes up any stale pointer it encounters. The pause covers only root scanning, which is proportional to the number of threads rather than to the size of the heap.</p>'
                },
                {
                    type: 'table',
                    title: 'The four collectors worth being able to compare',
                    headers: ['Collector', 'Pause', 'Throughput', 'Footprint', 'Where it fits'],
                    rows: [
                        ['<strong>Serial</strong>', 'Long', 'Fine at small sizes', 'Smallest', 'Containers under ~2 CPUs; short-lived batch jobs'],
                        ['<strong>Parallel</strong>', 'Long', '<strong>Highest</strong>', 'Small', 'Batch work where total time matters and pauses do not'],
                        ['<strong>G1</strong>', 'Tens to hundreds of ms', 'High', 'Moderate', '<strong>The default.</strong> Right for the large majority of services'],
                        ['<strong>ZGC</strong>', '<strong>Under 1ms</strong>', '~10–15% lower', 'Highest', 'Large heaps, or a hard p99 latency requirement']
                    ]
                },
                {
                    type: 'version',
                    title: 'The low-latency collectors have moved recently',
                    items: [
                        { version: 'Java 15', state: 'is', html: '<p>ZGC production-ready (JEP 377). Non-generational: every cycle traced the whole heap, which cost throughput on allocation-heavy services.</p>' },
                        { version: 'Java 21', state: 'changed', html: '<p><strong>Generational ZGC</strong> (JEP 439), opt-in with <code>-XX:+ZGenerational</code>. The young-generation win, at ZGC pause times.</p>' },
                        { version: 'Java 23', state: 'changed', html: '<p>Generational becomes the <em>default</em> mode for ZGC (JEP 474). The non-generational mode is deprecated.</p>' },
                        { version: 'Java 24', state: 'removed', html: '<p>Non-generational ZGC removed entirely (JEP 490). <code>-XX:-ZGenerational</code> no longer does anything.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>Shenandoah is worth one sentence: same goal as ZGC, concurrent evacuation with a different barrier design, originally from Red Hat, and the default choice on some OpenJDK builds. If asked to compare, the honest answer is that they solve the same problem and the choice is usually made by which JDK build you are on rather than by benchmark.</p>'
                }
            ],
            docs: [
                { title: 'JEP 439: Generational ZGC', url: 'https://openjdk.org/jeps/439', kind: 'spec' },
                { title: 'Z Garbage Collector', url: 'https://docs.oracle.com/en/java/javase/21/gctuning/z-garbage-collector.html', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'choosing-a-collector',
            title: 'Choosing One',
            importance: 'should-know',
            summary: 'The honest default is to change nothing. The JVM picks ergonomically, and the picked answer is right more often than a tuning session is.',
            interviewAngle: 'A judgement question wearing a knowledge question\'s clothes. Saying "I would measure first and probably leave it on G1" is a stronger answer than any flag list, provided you can then say what you would measure.',
            buildsOn: ['zgc-and-low-latency'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>The JVM chooses at startup based on what it sees. On a machine — or a cgroup — with <strong>at least two CPUs and at least 1792MB of memory</strong>, it selects G1 and calls the machine "server class". Below either threshold it selects Serial. This is worth knowing because it is a common surprise in a small container: a 1-CPU pod is running Serial GC, and nobody configured that.</p>'
                },
                {
                    type: 'diagram',
                    diagramType: 'flowchart',
                    caption: 'The decision, in the order worth making it.',
                    diagramConfig: {
                        title: 'Which collector',
                        nodes: [
                            { id: 'start', label: 'Is GC actually your problem?', kind: 'decision' },
                            { id: 'leave', label: 'Leave it on the default. Measure something else', kind: 'fix' },
                            { id: 'lat', label: 'Is the problem pause time?', kind: 'decision' },
                            { id: 'par', label: 'Throughput job: consider Parallel', kind: 'step' },
                            { id: 'size', label: 'Heap above ~8GB, or a hard p99?', kind: 'decision' },
                            { id: 'g1', label: 'Stay on G1; tune the pause target', kind: 'step' },
                            { id: 'zgc', label: 'Try ZGC, and measure the throughput cost', kind: 'fix' }
                        ],
                        edges: [
                            { from: 'start', to: 'leave', label: 'no' },
                            { from: 'start', to: 'lat', label: 'yes' },
                            { from: 'lat', to: 'par', label: 'no' },
                            { from: 'lat', to: 'size', label: 'yes' },
                            { from: 'size', to: 'g1', label: 'no' },
                            { from: 'size', to: 'zgc', label: 'yes' }
                        ]
                    }
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Most GC problems are not collector problems.</strong> A service doing a full GC every two minutes has a retention bug, and switching collectors changes which log line reports it. Before touching a flag: look at the promotion rate, look for humongous allocations, and take a heap dump. Changing the collector first is the tuning equivalent of restarting the server — occasionally it helps, and you learn nothing either way.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Have one concrete number ready for the follow-up: <em>"I would look at GC overhead as a percentage of wall time. Under about 5% I would leave it alone. Above 10% something is wrong, and the first thing I would check is whether the old generation is growing between full collections — because that is a leak, not a tuning problem."</em></p>'
                }
            ],
            docs: [
                { title: 'Ergonomics', url: 'https://docs.oracle.com/en/java/javase/21/gctuning/ergonomics.html', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'gc-flags-worth-knowing',
            title: 'The Flags Worth Knowing',
            importance: 'should-know',
            summary: 'Six that earn their place, and the reasoning for each. Everything else needs a measurement behind it.',
            interviewAngle: 'Frequently asked as a straight recall question. Answer with the small list and the reason for each rather than a long list, because the follow-up is always "why that one".',
            buildsOn: ['choosing-a-collector'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'bash',
                    title: 'A defensible baseline for a containerised service',
                    code: '# Size from the container limit, not from a number someone typed in 2019.\n-XX:MaxRAMPercentage=75.0\n\n# Equal min and max: no resize pauses, and the footprint is honest from\n# the first second rather than growing into its limit under load.\n-Xms2g -Xmx2g\n\n# Unified logging. Cheap enough to leave on permanently, and the only\n# evidence that exists after a pause you did not see happen.\n-Xlog:gc*:file=/var/log/gc.log:time,uptime,level,tags:filecount=5,filesize=20M\n\n# When the heap does run out, capture it. A dump you did not take is an\n# incident you get to have twice.\n-XX:+HeapDumpOnOutOfMemoryError\n-XX:HeapDumpPath=/var/log/heapdump.hprof\n\n# Kill the process rather than limp on. A JVM that has thrown an\n# OutOfMemoryError is in an undefined state, and a health check will\n# usually keep reporting it healthy.\n-XX:+ExitOnOutOfMemoryError',
                    notes: '<p><code>MaxRAMPercentage</code> and an explicit <code>-Xmx</code> are alternatives, not a pair — the last one to apply wins. Both are shown here because the second is what most existing deployments have, and the argument for moving to the first is that it follows the limit when the limit changes.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong><code>-XX:+UseGCOverheadLimit</code> does not save you and <code>System.gc()</code> does not help.</strong> An explicit <code>System.gc()</code> requests a full stop-the-world collection, which is exactly the pause you are trying to avoid, and it usually appears in code written to "fix" a memory problem that was a retention bug. If a library you depend on calls it — some old NIO and RMI code does — <code>-XX:+DisableExplicitGC</code> is the flag, and it belongs in the same conversation as finding out why.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Equal <code>-Xms</code> and <code>-Xmx</code> is worth defending explicitly, because it looks wasteful: the heap starts at its maximum and the container reserves it all immediately. That is the point. A heap that grows into its limit does so through a series of resize pauses during exactly the traffic spike that caused the growth, and the memory was never going to be given back to the container in any useful way.</p>'
                }
            ],
            docs: [
                { title: 'java command — Extra Options', url: 'https://docs.oracle.com/en/java/javase/21/docs/specs/man/java.html', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'gc-logs-and-what-to-look-for',
            title: 'Reading a GC Log',
            importance: 'should-know',
            summary: 'Four numbers answer nearly every question: pause length, pause frequency, live set after a full collection, and whether that live set is growing.',
            interviewAngle: 'The strongest possible answer to "how would you diagnose a GC problem" is a procedure rather than a flag. This chapter is that procedure, and it is short enough to say out loud.',
            buildsOn: ['gc-flags-worth-knowing'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'bash',
                    title: 'What the unified log actually looks like, and what to read out of it',
                    code: '[12.482s][info][gc] GC(31) Pause Young (Normal) (G1 Evacuation Pause) 1843M->412M(4096M) 14.221ms\n[45.109s][info][gc] GC(88) Pause Young (Mixed) (G1 Evacuation Pause) 3201M->1105M(4096M) 41.880ms\n[61.773s][info][gc] GC(94) Pause Full (G1 Compaction Pause) 3944M->3901M(4096M) 2841.006ms',
                    output: {
                        kind: 'trace',
                        lines: [
                            'Line 1 is health: 1843M before, 412M after, so 1.4GB of garbage was reclaimed in 14ms. Objects died in Eden exactly as intended.',
                            'Line 2 is a mixed collection reclaiming old regions concurrently-marked earlier. Still normal G1 behaviour, still a young pause.',
                            'Line 3 is the problem: a full compaction that took 2.8 seconds and freed 43MB out of a 4GB heap.',
                            'The number that matters in line 3 is 3901M after. The heap is 95% live AFTER a full collection, which means the memory is genuinely reachable -- this is a retention bug, and no collector setting will fix it.'
                        ],
                        explain: '<p>The general rule: read the <strong>occupancy after a full collection</strong>, and read it over time. If it is flat, the live set is stable and any pause problem is a tuning problem. If it climbs across successive full collections, something is being retained and the next step is a heap dump, not a flag.</p>'
                    }
                },
                {
                    type: 'types',
                    title: 'The four questions, in the order to ask them',
                    items: [
                        { name: 'Is the live set growing?', html: '<p>Occupancy after each full GC, plotted. Growing means a leak. Everything else on this list is a waste of time until this one is answered.</p>' },
                        { name: 'How much time is spent in GC?', html: '<p>Total pause time over wall time. Under 5% is fine, over 10% is a problem worth work.</p>' },
                        { name: 'What is the promotion rate?', html: '<p>Occupancy after a young collection, minus occupancy after the previous one. High promotion means objects are surviving Eden — either the young generation is too small, or something is holding request-scoped data too long.</p>' },
                        { name: 'Are there humongous allocations?', html: '<p><code>-Xlog:gc+humongous=debug</code> under G1. Large byte arrays, a big JSON payload, a preallocated buffer. Fixing the allocation is usually easier than tuning around it.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>Say the sequence as a procedure and it answers the whole question: <em>"Turn on GC logging — it should already be on. Look at heap occupancy after full collections over time; if it is climbing, take a heap dump and look at the dominator tree, because it is a leak. If it is flat, then it is a tuning question, and I would look at pause frequency and promotion rate before touching the collector."</em></p>'
                }
            ],
            docs: [
                { title: 'JEP 158: Unified JVM Logging', url: 'https://openjdk.org/jeps/158', kind: 'spec' }
            ],
            relatedQuestions: []
        }
    ]
};
