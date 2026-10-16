/* ==========================================================================
   data/jvm-memory.js — JVM, Memory & Garbage Collection

   Three subsections, because this topic genuinely is three conversations.
   Where memory lives is structural knowledge; which collector and why is a
   choice; and diagnosing a leak is a skill with its own tools. A candidate
   can be strong at one and blank at another, and filing them together would
   hide that.

   THE VERSION SURFACE HERE IS UNUSUALLY SHARP. PermGen went in Java 8, G1
   became the default in 9, container awareness arrived in 10, generational
   ZGC landed in 21 and became ZGC's only mode in 24. An answer that is
   version-free is usually an answer that is five releases out of date, so
   the version is stated wherever it changes the answer.

   ONE GLOBAL PER FILE.
   ========================================================================== */

const jvmMemoryData = {
    id: 'jvm-memory',
    title: 'JVM, Memory & Garbage Collection',
    subsections: [
        { id: 'structure',   title: 'Heap, Stack & Metaspace' },
        { id: 'gc',          title: 'Garbage Collectors' },
        { id: 'diagnostics', title: 'Diagnostics & Leaks' }
    ],
    keyTopics: [
        'heap generations', 'Eden and survivor spaces', 'Metaspace', 'G1', 'ZGC',
        'GC tuning flags', 'OutOfMemoryError causes', 'class loading',
        'classloader leaks', 'heap dumps', 'JIT'
    ],
    questions: [

/* ==== Heap, Stack & Metaspace ========================================= */

{
    id: 'stack-versus-heap',
    importance: 'must-know',
    subsection: 'structure',
    question: 'What lives on the stack and what lives on the heap?',
    answer:
        '<p><strong>The stack holds frames; the heap holds objects.</strong> Every thread gets ' +
        'its own stack, and a frame is pushed per method call containing that call\'s local ' +
        'variables, its operand stack and the return address. Every object, and every array, is ' +
        'allocated on the heap, which is shared by all threads.</p>' +
        '<p>The distinction people get wrong is what a local variable <em>is</em>. A local of a ' +
        'primitive type holds the value. A local of a reference type holds a ' +
        '<strong>reference</strong> — the object it points to is on the heap regardless. So in ' +
        '<code>void f() { int i = 1; String s = "x"; }</code>, <code>i</code> is on the stack and ' +
        'so is <code>s</code>; the <code>String</code> is not.</p>' +
        '<p>Two practical consequences:</p>' +
        '<ul>' +
        '<li><strong>Stack memory is reclaimed by returning.</strong> Popping the frame is the ' +
        'deallocation, which is why the stack has no garbage collector and no fragmentation.</li>' +
        '<li><strong>Stack size is per thread and small</strong> — commonly 512KB to 1MB, set ' +
        'with <code>-Xss</code>. Ten thousand platform threads is gigabytes of stack reserved ' +
        'before your application has allocated anything, and that is the constraint virtual ' +
        'threads exist to remove.</li>' +
        '</ul>' +
        '<p>The honest caveat: <strong>"objects are always on the heap" is a specification-level ' +
        'statement, not a runtime guarantee.</strong> See escape analysis.</p>',
    referenceLinks: [
        { title: 'JVM Specification — Run-Time Data Areas', url: 'https://docs.oracle.com/javase/specs/jvms/se21/html/jvms-2.html' }
    ],
    tags: ['jvm', 'memory', 'fundamentals'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'heap-generations-and-survivors',
    importance: 'must-know',
    subsection: 'structure',
    question: 'How is the heap divided, and what are Eden and the survivor spaces for?',
    answer:
        '<p>Into a <strong>young generation</strong> and an <strong>old generation</strong>. The ' +
        'young generation splits again into <strong>Eden</strong> and two ' +
        '<strong>survivor</strong> spaces, conventionally called S0 and S1.</p>' +
        '<p>The cycle:</p>' +
        '<ul>' +
        '<li>New objects are allocated in Eden.</li>' +
        '<li>When Eden fills, a <strong>young collection</strong> runs. Everything still ' +
        'reachable is copied into the empty survivor space; Eden and the other survivor are then ' +
        'wholesale empty and the two survivors swap roles.</li>' +
        '<li>An object that survives enough collections — its <strong>age</strong> crosses the ' +
        'tenuring threshold — is <strong>promoted</strong> to the old generation.</li>' +
        '</ul>' +
        '<p>Two survivors rather than one is what makes the copy work: you always need an empty ' +
        'space to copy into, and copying into the space you are copying out of does not.</p>' +
        '<p>The reason this shape pays is the <strong>weak generational hypothesis</strong> — ' +
        'most objects die young. If nearly everything in Eden is garbage, the collector copies a ' +
        'handful of survivors and reclaims the rest by resetting a pointer, so the cost is ' +
        'proportional to what <em>lived</em>, not to what was allocated. That is why allocating ' +
        'many short-lived objects is genuinely cheap in Java in a way it is not in a ' +
        'reference-counted language.</p>' +
        '<p>G1 keeps the generational idea but drops the fixed contiguous layout: the heap is ' +
        'divided into equal-sized regions and each region is <em>tagged</em> Eden, survivor or ' +
        'old, so the boundary moves as the workload changes.</p>',
    referenceLinks: [
        { title: 'HotSpot Garbage Collection Tuning Guide', url: 'https://docs.oracle.com/en/java/javase/21/gctuning/index.html' }
    ],
    tags: ['jvm', 'memory', 'gc'],
    images: [],
    hasDiagram: true,
    diagramType: 'flowchart',
    diagramConfig: {
        title: 'The life of an object that does not die immediately',
        nodes: [
            { id: 'alloc',  label: 'new Object() — allocated in Eden', kind: 'start' },
            { id: 'young',  label: 'Eden fills: young collection',     kind: 'step' },
            { id: 'surv',   label: 'still reachable: copied to a survivor space, age + 1', kind: 'step' },
            { id: 'old',    label: 'age past the tenuring threshold: promoted to old gen', kind: 'step' },
            { id: 'gone',   label: 'unreachable: space reclaimed by resetting a pointer', kind: 'trap' }
        ],
        edges: [
            { from: 'alloc', to: 'young' },
            { from: 'young', to: 'surv', label: 'reachable' },
            { from: 'young', to: 'gone', label: 'not reachable' },
            { from: 'surv',  to: 'young', label: 'next collection' },
            { from: 'surv',  to: 'old',  label: 'old enough' }
        ]
    },
    codeSnippets: []
},

{
    id: 'metaspace-and-permgen',
    importance: 'must-know',
    subsection: 'structure',
    question: 'What is Metaspace, and why did it replace PermGen?',
    answer:
        '<p>Metaspace holds <strong>class metadata</strong> — the runtime representation of ' +
        'loaded classes: field and method descriptors, the constant pool, bytecode, annotations. ' +
        'It replaced the permanent generation in <strong>Java 8</strong>.</p>' +
        '<p>The change that matters: <strong>Metaspace is native memory, not part of the ' +
        'heap.</strong> PermGen was a fixed-size heap region sized by ' +
        '<code>-XX:MaxPermSize</code>, and getting that number wrong was one of the most common ' +
        'production failures in the era of application servers and hot redeploys — every ' +
        'redeploy loaded another copy of the application\'s classes, PermGen filled, and the ' +
        'server died with <code>OutOfMemoryError: PermGen space</code>.</p>' +
        '<p>Metaspace grows on demand and is <strong>unbounded by default</strong>. That removes ' +
        'the usual failure and introduces a rarer, nastier one: a class-loading leak now consumes ' +
        'the machine\'s memory rather than hitting a ceiling, and the process is killed by the ' +
        'OS — or by the container runtime — with no Java-level error at all. Setting ' +
        '<code>-XX:MaxMetaspaceSize</code> deliberately is how you convert that back into an ' +
        '<code>OutOfMemoryError: Metaspace</code> you can see.</p>' +
        '<p>One more thing moved in Java 7, a release earlier: the <strong>string pool</strong> ' +
        'went from PermGen to the ordinary heap, which is why <code>intern()</code> stopped being ' +
        'a way to exhaust PermGen and started being a way to keep strings alive too long.</p>',
    referenceLinks: [
        { title: 'JEP 122: Remove the Permanent Generation', url: 'https://openjdk.org/jeps/122' }
    ],
    tags: ['jvm', 'metaspace', 'versions'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'stackoverflow-versus-outofmemory',
    importance: 'must-know',
    subsection: 'structure',
    question: 'What is the difference between StackOverflowError and OutOfMemoryError?',
    answer:
        '<p>Different memory, different cause, and only one of them is usually a bug in the ' +
        'shape people assume.</p>' +
        '<p><strong><code>StackOverflowError</code></strong> — one thread\'s stack ran out of ' +
        'frames. Nearly always unbounded recursion: a missing base case, or two methods calling ' +
        'each other. Occasionally it is legitimate deep recursion over a deep structure, and then ' +
        'the answer is either <code>-Xss</code> or rewriting it iteratively with an explicit ' +
        'stack. Java has no tail-call elimination, so a tail-recursive method still consumes a ' +
        'frame per call.</p>' +
        '<p><strong><code>OutOfMemoryError</code></strong> — some memory pool could not satisfy ' +
        'an allocation. Which pool is in the message, and that word is the whole diagnosis, so ' +
        'read it before doing anything else.</p>' +
        '<p>Both are <code>Error</code>, not <code>Exception</code>, and that is a statement of ' +
        'intent: they are not meant to be caught. Catching <code>OutOfMemoryError</code> and ' +
        'continuing is particularly dangerous — the failed allocation may have left another ' +
        'thread halfway through something, and the handler itself may need to allocate. The ' +
        'defensible responses are <code>-XX:+HeapDumpOnOutOfMemoryError</code> to capture ' +
        'evidence and <code>-XX:+ExitOnOutOfMemoryError</code> to die immediately and let the ' +
        'orchestrator restart you.</p>',
    referenceLinks: [
        { title: 'Troubleshooting Guide — OutOfMemoryError', url: 'https://docs.oracle.com/en/java/javase/21/troubleshoot/troubleshooting-memory-leaks.html' }
    ],
    tags: ['jvm', 'errors', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'memory-outside-the-heap',
    importance: 'should-know',
    subsection: 'structure',
    question: 'Your container is killed for using more memory than -Xmx. Where did the rest go?',
    answer:
        '<p><code>-Xmx</code> bounds the Java heap and nothing else. A JVM\'s resident set is the ' +
        'heap <em>plus</em> several other pools, and on a container with a hard memory limit the ' +
        'total is what gets you killed — usually with no Java error at all, just exit code 137 ' +
        'and an OOMKilled event.</p>' +
        '<p>What else is in there:</p>' +
        '<ul>' +
        '<li><strong>Metaspace</strong> — class metadata, native, unbounded by default.</li>' +
        '<li><strong>Thread stacks</strong> — <code>-Xss</code> per platform thread. Two hundred ' +
        'threads at 1MB is 200MB.</li>' +
        '<li><strong>Code cache</strong> — JIT-compiled machine code, up to 240MB by ' +
        'default.</li>' +
        '<li><strong>Direct byte buffers</strong> — anything Netty, NIO or a database driver ' +
        'allocates off-heap, bounded by <code>-XX:MaxDirectMemorySize</code>, which defaults to ' +
        'the heap size.</li>' +
        '<li><strong>GC bookkeeping</strong> — card tables, remembered sets, marking bitmaps. ' +
        'Roughly a tenth of the heap for G1.</li>' +
        '<li><strong>The allocator\'s own overhead</strong>, and the JVM binary itself.</li>' +
        '</ul>' +
        '<p>The rule of thumb: <strong>budget the heap at somewhere around 50–75% of the ' +
        'container limit</strong>, and use <code>-XX:MaxRAMPercentage</code> rather than a fixed ' +
        '<code>-Xmx</code> so the number follows the limit when it changes.</p>' +
        '<p>To find out rather than guess, turn on Native Memory Tracking: ' +
        '<code>-XX:NativeMemoryTracking=summary</code>, then <code>jcmd &lt;pid&gt; VM.native_memory ' +
        'summary</code>. It accounts for every pool by name and is the only tool that answers ' +
        'this question directly.</p>',
    referenceLinks: [
        { title: 'Native Memory Tracking', url: 'https://docs.oracle.com/en/java/javase/21/troubleshoot/diagnostic-tools.html' }
    ],
    tags: ['jvm', 'memory', 'containers'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: [
        {
            language: 'bash',
            title: 'Asking the JVM where its memory went',
            code:
                '# start with tracking on\n' +
                'java -XX:NativeMemoryTracking=summary -XX:MaxRAMPercentage=70 -jar app.jar\n' +
                '\n' +
                '# then, against the running process\n' +
                'jcmd $(pgrep -f app.jar) VM.native_memory summary',
            output: {
                kind: 'trace',
                lines: [
                    'Java Heap (reserved=1433600KB, committed=1433600KB)',
                    'Class     (reserved=1056882KB, committed=  23090KB)',
                    'Thread    (reserved=  206045KB, committed= 206045KB)',
                    'Code      (reserved=  249056KB, committed=  32104KB)'
                ],
                explain:
                    '<p>Committed is what the process has actually taken from the OS; reserved is ' +
                    'address space, which on a 64-bit machine is nearly free. Reading the reserved ' +
                    'column as usage is the standard misreading of this output — the class ' +
                    'reservation above is a gigabyte of address space holding 23MB.</p>'
            }
        }
    ]
},

{
    id: 'escape-analysis-and-scalar-replacement',
    importance: 'good-to-know',
    subsection: 'structure',
    question: 'Is every object allocated on the heap?',
    answer:
        '<p>Specified that way; not necessarily true at runtime. The JIT performs ' +
        '<strong>escape analysis</strong>: if it can prove an object never becomes visible ' +
        'outside the method that created it, it is free to not allocate it at all.</p>' +
        '<p>What it does instead is <strong>scalar replacement</strong> — the object\'s fields ' +
        'become local variables in registers or on the stack, and the object as such stops ' +
        'existing. The commonly repeated phrase "the object is allocated on the stack" is close ' +
        'enough for an interview but is not quite what HotSpot does.</p>' +
        '<p>Escape analysis also enables <strong>lock elision</strong>: a ' +
        '<code>synchronized</code> block on an object that provably cannot be shared is removed. ' +
        'That is why <code>StringBuffer</code> in a local variable costs roughly what ' +
        '<code>StringBuilder</code> costs, despite being synchronised.</p>' +
        '<p>Two caveats worth having. It only runs under C2, so it does not apply to cold code ' +
        'or to a short-lived process. And it is fragile — storing the object in a field, passing ' +
        'it to a method that is not inlined, or throwing it, all defeat it.</p>' +
        '<p>The practical takeaway is not to design around it. It is the reason "allocation is ' +
        'expensive, so reuse objects" is bad advice in Java: escape analysis plus a bump-pointer ' +
        'allocator plus a generational collector make short-lived garbage very close to free, and ' +
        'the object pool that avoids it usually makes things slower.</p>',
    referenceLinks: [
        { title: 'HotSpot Performance Techniques', url: 'https://docs.oracle.com/en/java/javase/21/vm/java-hotspot-virtual-machine-performance-enhancements.html' }
    ],
    tags: ['jvm', 'jit', 'performance'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'tlab-allocation',
    importance: 'good-to-know',
    subsection: 'structure',
    question: 'How expensive is allocating an object in Java?',
    answer:
        '<p>In the common case, <strong>a pointer increment and a bounds check</strong> — about ' +
        'as cheap as allocation gets in any language.</p>' +
        '<p>Two mechanisms make that true. Eden is a contiguous region collected by copying, so ' +
        'it never fragments and the free space is always one block; allocating is moving a ' +
        'pointer forward. And each thread gets its own <strong>thread-local allocation buffer</strong> ' +
        '— a private slice of Eden — so the pointer bump needs no synchronisation. A thread that ' +
        'fills its TLAB takes another slice, which is the only step that contends.</p>' +
        '<p>Two things fall out of it that come up in interviews:</p>' +
        '<ul>' +
        '<li><strong>Large objects skip the TLAB</strong> and are allocated directly, sometimes ' +
        'straight into the old generation. A big array is not a cheap allocation.</li>' +
        '<li><strong>The real cost of allocation is collection.</strong> Every byte allocated is ' +
        'a byte the young collector will eventually have to decide about. "Allocation is free" is ' +
        'only true because most of it dies before anyone has to look at it.</li>' +
        '</ul>' +
        '<p>Which is why the useful metric in a GC investigation is <strong>allocation rate</strong>, ' +
        'not allocation count: a service allocating a gigabyte a second will have frequent young ' +
        'collections no matter how cheap each individual <code>new</code> was.</p>',
    referenceLinks: [
        { title: 'HotSpot Garbage Collection Tuning Guide', url: 'https://docs.oracle.com/en/java/javase/21/gctuning/index.html' }
    ],
    tags: ['jvm', 'memory', 'performance'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'compressed-oops-and-the-32gb-cliff',
    importance: 'good-to-know',
    subsection: 'structure',
    question: 'Why can raising the heap from 31GB to 33GB give you less usable memory?',
    answer:
        '<p>Because of <strong>compressed ordinary object pointers</strong>. Below roughly 32GB, ' +
        'HotSpot stores every reference as a 32-bit offset rather than a 64-bit address, ' +
        'exploiting the fact that objects are 8-byte aligned so the low three bits are always ' +
        'zero. That halves the size of every reference field and every element of a reference ' +
        'array.</p>' +
        '<p>Cross the threshold and compressed oops switch off. Every reference doubles, object ' +
        'headers grow, and a heap of 33GB can hold <em>fewer</em> objects than one of 31GB. The ' +
        'cache pressure gets worse at the same time, so throughput drops as well.</p>' +
        '<p>The practical advice: <strong>if you need more than about 31GB, go well past it</strong> ' +
        '— 40GB or more — so the extra capacity outweighs the loss. Or, better for most services, ' +
        'run several smaller JVMs rather than one enormous one, which also keeps GC pauses ' +
        'smaller for collectors whose pauses scale with heap size.</p>' +
        '<p>Verifying it is one flag: <code>java -XX:+PrintFlagsFinal -version | grep ' +
        'UseCompressedOops</code>.</p>',
    referenceLinks: [
        { title: 'Compressed OOPs in HotSpot', url: 'https://docs.oracle.com/en/java/javase/21/vm/java-hotspot-virtual-machine-performance-enhancements.html' }
    ],
    tags: ['jvm', 'memory', 'tuning'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'direct-byte-buffers',
    importance: 'should-know',
    subsection: 'structure',
    question: 'What is a direct ByteBuffer, and when is it worth one?',
    answer:
        '<p>A buffer whose storage is <strong>outside the Java heap</strong>, allocated with ' +
        '<code>ByteBuffer.allocateDirect(n)</code>. The Java object is a small handle; the bytes ' +
        'are native memory.</p>' +
        '<p>The reason it exists is I/O. A write from a heap buffer has to be copied to native ' +
        'memory first, because the collector may move the heap array mid-write. A direct buffer ' +
        'is at a fixed address, so the kernel can read it in place — one copy fewer per ' +
        'operation. That is why Netty, NIO channels and most database drivers use them.</p>' +
        '<p>The costs are real:</p>' +
        '<ul>' +
        '<li><strong>Allocation is expensive</strong> — a system call rather than a pointer ' +
        'bump. Direct buffers are meant to be allocated once and reused, which is why every ' +
        'library that uses them has a pool.</li>' +
        '<li><strong>Freeing is not deterministic.</strong> The memory is released when the ' +
        'handle object is collected and its <code>Cleaner</code> runs, so a heap with plenty of ' +
        'room means no collection, which means no release, which means native memory grows while ' +
        'the heap looks healthy. <code>OutOfMemoryError: Direct buffer memory</code> with a ' +
        'nearly empty heap is the signature.</li>' +
        '<li><strong>It is invisible to <code>-Xmx</code></strong> and bounded separately by ' +
        '<code>-XX:MaxDirectMemorySize</code>.</li>' +
        '</ul>' +
        '<p>So: worth it for long-lived buffers in an I/O path, and a liability for anything ' +
        'small or short-lived.</p>',
    referenceLinks: [
        { title: 'ByteBuffer.allocateDirect — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/nio/ByteBuffer.html' }
    ],
    tags: ['jvm', 'memory', 'io'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

/* ==== Garbage Collectors ============================================== */

{
    id: 'what-makes-an-object-collectable',
    importance: 'must-know',
    subsection: 'gc',
    question: 'How does the collector decide an object is garbage?',
    answer:
        '<p><strong>Reachability from a set of GC roots</strong>, not reference counting. The ' +
        'collector starts from the roots and marks everything it can reach; what it did not ' +
        'reach is garbage, whatever else points at it.</p>' +
        '<p>The roots are, in the shape worth reciting:</p>' +
        '<ul>' +
        '<li>Local variables and parameters in every frame of every <strong>live thread</strong>\'s ' +
        'stack.</li>' +
        '<li><strong>Static fields</strong> of loaded classes.</li>' +
        '<li>Active <strong>threads</strong> themselves, and objects held by a running thread.</li>' +
        '<li><strong>JNI</strong> global references.</li>' +
        '<li>Objects held by the JVM itself — the class loaders, interned strings, exception ' +
        'objects in flight, monitor objects a thread is blocked on.</li>' +
        '</ul>' +
        '<p>Choosing reachability over reference counting is what makes <strong>cycles ' +
        'collectable</strong>: two objects pointing only at each other are unreachable from any ' +
        'root, so they go. This is the answer to "does Java leak on a circular reference" — no, ' +
        'and that is a design decision rather than an accident.</p>' +
        '<p>Which reframes what a Java memory leak actually is: not an object nobody freed, but ' +
        '<strong>an object still reachable from a root that nobody will ever use again</strong>. ' +
        'The static <code>Map</code> that grows forever is the archetype, and the reason ' +
        'diagnosing leaks means finding a <em>path</em> rather than a count.</p>',
    referenceLinks: [
        { title: 'HotSpot Garbage Collection Tuning Guide', url: 'https://docs.oracle.com/en/java/javase/21/gctuning/index.html' }
    ],
    tags: ['jvm', 'gc', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'minor-major-and-full-gc',
    importance: 'must-know',
    subsection: 'gc',
    question: 'What is the difference between a minor, a major and a full GC?',
    answer:
        '<p>The terms are used loosely, which is itself worth saying, but the useful ' +
        'distinctions are:</p>' +
        '<ul>' +
        '<li><strong>Minor / young collection</strong> — collects the young generation only. ' +
        'Frequent, short, and proportional to the number of <em>survivors</em>, not to heap ' +
        'size. These are healthy; a service with none is either idle or allocating nothing.</li>' +
        '<li><strong>Major / old collection</strong> — collects the old generation. In G1 the ' +
        'usual form is a <strong>mixed</strong> collection, which takes the young generation plus ' +
        'a selection of old regions chosen by how much garbage they contain, and is still ' +
        'concurrent for the marking part.</li>' +
        '<li><strong>Full GC</strong> — the whole heap, and in G1 a full GC is a ' +
        '<strong>failure mode</strong>, not a routine step. It falls back to a single-threaded ' +
        'or parallel compacting collection, stops the world for the duration, and on a large ' +
        'heap that is seconds.</li>' +
        '</ul>' +
        '<p>So the number to watch in a GC log is not "how many collections" but <strong>how many ' +
        'full ones</strong>. A rising full-GC count means one of a small set of causes: the live ' +
        'set genuinely does not fit, promotion is outrunning concurrent marking (an ' +
        '"evacuation failure" or "to-space exhausted"), humongous allocations are fragmenting ' +
        'the heap, or something is calling <code>System.gc()</code>.</p>' +
        '<p>On which: <code>System.gc()</code> is a request, not a command, and in almost every ' +
        'case where application code calls it the right fix is to delete the call. ' +
        '<code>-XX:+DisableExplicitGC</code> exists because libraries do it too.</p>',
    referenceLinks: [
        { title: 'Garbage-First (G1) Garbage Collector', url: 'https://docs.oracle.com/en/java/javase/21/gctuning/garbage-first-g1-garbage-collector1.html' }
    ],
    tags: ['jvm', 'gc'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'how-g1-works',
    importance: 'must-know',
    subsection: 'gc',
    question: 'How does G1 work, and why is it the default?',
    answer:
        '<p>G1 — "garbage first" — divides the heap into a few thousand <strong>equal-sized ' +
        'regions</strong>, typically 1 to 32MB each, and tags each region as Eden, survivor, old ' +
        'or humongous. The generations are therefore a labelling rather than a layout, and the ' +
        'boundary between them moves without anyone tuning it.</p>' +
        '<p>It marks concurrently, while the application runs, to find out how much garbage each ' +
        'old region holds. Then at collection time it <strong>picks the regions with the most ' +
        'garbage first</strong> — that is the name — and evacuates the survivors out of them into ' +
        'other regions, which compacts as a side effect of copying.</p>' +
        '<p>The design goal is a <strong>pause target</strong> rather than maximum throughput. ' +
        '<code>-XX:MaxGCPauseMillis</code> defaults to 200ms, and G1 chooses how many regions to ' +
        'include in each collection to try to meet it. It is a target and not a guarantee, and ' +
        'setting it very low does not make pauses short — it makes G1 collect less per pause, ' +
        'which means more pauses and eventually a full GC when it falls behind.</p>' +
        '<p>It became the default in <strong>Java 9</strong> because it is the reasonable ' +
        'compromise: better pause behaviour than Parallel on a large heap, without ZGC\'s ' +
        'throughput cost, and it needs almost no tuning. The honest summary for an interview is ' +
        '<em>G1 is what you should use unless you have measured a reason not to</em>.</p>',
    referenceLinks: [
        { title: 'Garbage-First (G1) Garbage Collector', url: 'https://docs.oracle.com/en/java/javase/21/gctuning/garbage-first-g1-garbage-collector1.html' },
        { title: 'JEP 248: Make G1 the Default Garbage Collector', url: 'https://openjdk.org/jeps/248' }
    ],
    tags: ['jvm', 'gc', 'g1'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'choosing-a-collector',
    importance: 'must-know',
    subsection: 'gc',
    question: 'G1, ZGC, Parallel or Serial — how would you choose?',
    answer:
        '<p>By which of throughput and latency you are actually being measured on, and by how ' +
        'big the heap is.</p>' +
        '<ul>' +
        '<li><strong>G1</strong> (<code>-XX:+UseG1GC</code>, the default) — the answer unless ' +
        'something specific says otherwise. Pause target of a couple of hundred milliseconds, ' +
        'good throughput, compacting, no tuning needed.</li>' +
        '<li><strong>ZGC</strong> (<code>-XX:+UseZGC</code>) — when a pause of tens of ' +
        'milliseconds is unacceptable, or the heap is very large. Pauses are sub-millisecond and ' +
        '<strong>do not grow with heap size</strong>, which is the property that matters: a ' +
        'terabyte heap pauses like a small one. The cost is throughput, usually a few per cent, ' +
        'and more memory for the collector\'s own structures.</li>' +
        '<li><strong>Parallel</strong> (<code>-XX:+UseParallelGC</code>) — batch work where ' +
        'total time matters and a multi-second pause does not. It still has the best raw ' +
        'throughput of the four.</li>' +
        '<li><strong>Serial</strong> (<code>-XX:+UseSerialGC</code>) — small heaps, one or two ' +
        'cores, short-lived processes. The default choice in a small container, and genuinely ' +
        'the right one for a CLI tool or a function that runs for two seconds.</li>' +
        '</ul>' +
        '<p>The version note that dates an answer: <strong>ZGC became generational in Java 21</strong> ' +
        '(<code>-XX:+ZGenerational</code>), generational mode became <strong>the default in Java ' +
        '23</strong>, and the non-generational mode was <strong>removed in Java 24</strong>. Before ' +
        'that, ZGC collected the whole heap every cycle and paid for it in CPU; "ZGC has no young ' +
        'generation" is an answer that was true and is not.</p>' +
        '<p>Shenandoah is the fourth low-pause option, similar in aim to ZGC, and available in ' +
        'OpenJDK builds from Red Hat and others.</p>',
    referenceLinks: [
        { title: 'JEP 439: Generational ZGC', url: 'https://openjdk.org/jeps/439' },
        { title: 'Available Collectors — HotSpot Tuning Guide', url: 'https://docs.oracle.com/en/java/javase/21/gctuning/available-collectors.html' }
    ],
    tags: ['jvm', 'gc', 'zgc', 'versions'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'is-gc-stop-the-world',
    importance: 'should-know',
    subsection: 'gc',
    question: 'Is garbage collection stop-the-world? Is any collector fully concurrent?',
    answer:
        '<p>Every production collector has stop-the-world phases. None is fully concurrent, and a ' +
        'candidate claiming ZGC is "pauseless" is repeating marketing.</p>' +
        '<p>What differs is <strong>what the pause is proportional to</strong>, and that is the ' +
        'whole story:</p>' +
        '<ul>' +
        '<li>Serial and Parallel pause for the <strong>entire collection</strong>. Pause time ' +
        'scales with the live set, so a bigger heap means a longer pause.</li>' +
        '<li>G1 does its marking concurrently but pauses to <strong>evacuate</strong>. Pause time ' +
        'scales with how much it chose to collect, which is why the pause target works at ' +
        'all.</li>' +
        '<li>ZGC and Shenandoah move objects concurrently, using <strong>load barriers</strong> — ' +
        'a check on every reference read that redirects to the moved object and fixes the ' +
        'reference in place. Their pauses are for root scanning only and are ' +
        '<strong>bounded</strong>, typically well under a millisecond, regardless of heap ' +
        'size.</li>' +
        '</ul>' +
        '<p>The mechanism to be able to name is the <strong>safepoint</strong>. The JVM cannot ' +
        'stop a thread anywhere; it sets a flag and waits for each thread to reach a point where ' +
        'its stack can be walked. A thread in a long counted loop with no safepoint poll, or in a ' +
        'long JNI call, delays everyone — which is why "time to safepoint" appears in GC logs ' +
        'separately from the collection itself, and why an occasional long pause with a tiny ' +
        'collection is usually a safepoint problem rather than a GC problem.</p>',
    referenceLinks: [
        { title: 'JEP 376: ZGC Concurrent Thread-Stack Processing', url: 'https://openjdk.org/jeps/376' }
    ],
    tags: ['jvm', 'gc', 'latency'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'reference-strengths',
    importance: 'should-know',
    subsection: 'gc',
    question: 'What are soft, weak and phantom references for?',
    answer:
        '<p>Four strengths, in decreasing order of how hard they hold on.</p>' +
        '<ul>' +
        '<li><strong>Strong</strong> — an ordinary reference. While one exists, the object ' +
        'lives.</li>' +
        '<li><strong>Soft</strong> — cleared at the collector\'s discretion, and in practice only ' +
        'when the heap is under pressure. The intended use is a memory-sensitive cache. In ' +
        'reality they are a poor cache: the JVM clears them all at once under pressure, they ' +
        'extend the life of everything they reference until then, and a real cache library with ' +
        'a size bound and an eviction policy is better in every dimension.</li>' +
        '<li><strong>Weak</strong> — cleared as soon as no strong reference remains, at the next ' +
        'collection. This is the useful one: it is what <code>WeakHashMap</code> is built on, and ' +
        'the standard way to associate metadata with an object without keeping the object ' +
        'alive.</li>' +
        '<li><strong>Phantom</strong> — never returns the object from <code>get()</code>, and is ' +
        'enqueued <em>after</em> the object is finalizable. Its only purpose is to know that ' +
        'something has been collected so you can release a native resource it owned. This is what ' +
        '<code>Cleaner</code> is built on.</li>' +
        '</ul>' +
        '<p>The trap with <code>WeakHashMap</code>: the <strong>keys</strong> are weak, the ' +
        'values are not. A value that references its own key keeps the entry alive forever, which ' +
        'turns the leak-proof structure into a leak.</p>' +
        '<p>All of these are specialist tools. Reaching for them in ordinary application code is ' +
        'usually a sign that something is holding a reference it should not, and the fix is to ' +
        'stop holding it.</p>',
    referenceLinks: [
        { title: 'java.lang.ref — package summary', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/ref/package-summary.html' }
    ],
    tags: ['jvm', 'gc', 'references'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'finalize-and-cleaner',
    importance: 'good-to-know',
    subsection: 'gc',
    question: 'Why should you never write a finalize method?',
    answer:
        '<p>Because it is unreliable in every way that matters, and it has been formally on the ' +
        'way out since <strong>Java 9</strong> — deprecated then, and deprecated for removal by ' +
        '<strong>JEP 421 in Java 18</strong>, which also made it possible to disable finalization ' +
        'entirely with <code>--finalization=disabled</code>.</p>' +
        '<p>The specific failures:</p>' +
        '<ul>' +
        '<li><strong>It may never run.</strong> Nothing guarantees a collection, and nothing ' +
        'guarantees finalizers run at shutdown.</li>' +
        '<li><strong>You cannot predict when.</strong> So it is useless for releasing anything ' +
        'scarce — a file handle, a socket, a lock.</li>' +
        '<li><strong>It delays collection.</strong> A finalizable object survives at least one ' +
        'extra cycle and goes on a queue served by one thread. A slow finalizer backs that queue ' +
        'up and the objects behind it are never freed.</li>' +
        '<li><strong>It can resurrect the object</strong> by storing <code>this</code> somewhere, ' +
        'which is a genuine hazard and a security one.</li>' +
        '<li><strong>An exception in it is swallowed</strong>, leaving the object half ' +
        'cleaned up.</li>' +
        '</ul>' +
        '<p>The replacements: <strong><code>try-with-resources</code> and ' +
        '<code>AutoCloseable</code></strong> for anything with a lifetime, which is the answer ' +
        'almost every time. <strong><code>java.lang.ref.Cleaner</code></strong> for a native ' +
        'resource that needs a safety net if a caller forgets to close — registered with a ' +
        'cleanup action that must not reference the object, or it can never become ' +
        'unreachable.</p>',
    referenceLinks: [
        { title: 'JEP 421: Deprecate Finalization for Removal', url: 'https://openjdk.org/jeps/421' }
    ],
    tags: ['jvm', 'gc', 'versions'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'humongous-allocations',
    importance: 'good-to-know',
    subsection: 'gc',
    question: 'What is a humongous object in G1, and why does it matter?',
    answer:
        '<p>Any allocation larger than <strong>half a region</strong>. With the default region ' +
        'size that can be as little as 512KB, so a moderately large byte array or a big ' +
        '<code>ArrayList</code> backing array qualifies.</p>' +
        '<p>G1 handles them specially and worse. A humongous object is allocated directly into ' +
        '<strong>contiguous old-generation regions</strong>, skipping Eden entirely, and the tail ' +
        'of the last region is wasted. It is not moved by ordinary evacuation, so it does not get ' +
        'the compaction everything else gets.</p>' +
        '<p>Two failure shapes follow:</p>' +
        '<ul>' +
        '<li><strong>Fragmentation.</strong> Allocating and freeing large arrays leaves holes ' +
        'that no single contiguous run can fill, and eventually an allocation fails despite ' +
        'plenty of free memory in total — which triggers a full GC to compact.</li>' +
        '<li><strong>Old generation pressure with no obvious cause.</strong> The old generation ' +
        'grows even though nothing is being promoted, because these objects were never young.</li>' +
        '</ul>' +
        '<p>The fixes, in order: allocate less large stuff — stream a file rather than reading it ' +
        'into a byte array, page a query rather than materialising every row. Failing that, raise ' +
        '<code>-XX:G1HeapRegionSize</code> so the objects stop being humongous. The GC log names ' +
        'them, so this is diagnosable rather than guessable.</p>',
    referenceLinks: [
        { title: 'Garbage-First (G1) Garbage Collector', url: 'https://docs.oracle.com/en/java/javase/21/gctuning/garbage-first-g1-garbage-collector1.html' }
    ],
    tags: ['jvm', 'gc', 'g1'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'does-the-jvm-return-memory',
    importance: 'should-know',
    subsection: 'gc',
    question: 'Does the JVM ever give memory back to the operating system?',
    answer:
        '<p>Yes, but historically it was reluctant, and whether it does depends on the collector ' +
        'and the flags — which matters a great deal when you are paying for a container by the ' +
        'gigabyte.</p>' +
        '<p>The heap has a <strong>committed</strong> size between <code>-Xms</code> and ' +
        '<code>-Xmx</code>. Traditionally it only shrank at a full GC, so a service that had one ' +
        'busy hour held its peak footprint until it was restarted. Setting ' +
        '<code>-Xms</code> equal to <code>-Xmx</code> — common advice, because it avoids resizing ' +
        'work — makes this explicit: the JVM takes the maximum immediately and never gives any ' +
        'of it back.</p>' +
        '<p>What changed:</p>' +
        '<ul>' +
        '<li><strong>G1 gained concurrent uncommit</strong> in Java 12 (JEP 346), returning ' +
        'memory during idle periods rather than only at a full GC.</li>' +
        '<li><strong>ZGC and Shenandoah uncommit by default</strong>, with a delay controlled by ' +
        '<code>-XX:ZUncommitDelay</code> or <code>-XX:ShenandoahUncommitDelay</code>.</li>' +
        '<li><code>-XX:MinHeapFreeRatio</code> and <code>-XX:MaxHeapFreeRatio</code> are the ' +
        'general levers; lowering the maximum makes the JVM shrink more aggressively at the cost ' +
        'of more resizing.</li>' +
        '</ul>' +
        '<p>The thing to say in an interview: <strong>resident set size is not the live set</strong>. ' +
        'A container using its full limit is not necessarily short of memory, and autoscaling on ' +
        'JVM RSS without understanding this is how teams end up scaling on a number that only ' +
        'ever goes up.</p>',
    referenceLinks: [
        { title: 'JEP 346: Promptly Return Unused Committed Memory from G1', url: 'https://openjdk.org/jeps/346' }
    ],
    tags: ['jvm', 'gc', 'containers'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

/* ==== Diagnostics & Leaks ============================================= */

{
    id: 'outofmemoryerror-flavours',
    importance: 'must-know',
    subsection: 'diagnostics',
    question: 'What are the different OutOfMemoryError messages, and what does each one mean?',
    answer:
        '<p>The words after the colon are the diagnosis. Six worth recognising on sight:</p>' +
        '<ul>' +
        '<li><strong>Java heap space</strong> — the heap is genuinely full of reachable objects. ' +
        'Either a leak, or a live set that does not fit, or one request materialising far too ' +
        'much at once.</li>' +
        '<li><strong>GC overhead limit exceeded</strong> — more than 98% of recent time spent in ' +
        'GC, recovering less than 2% of the heap. The same cause as the first, caught earlier: ' +
        'the JVM is thrashing rather than failing outright.</li>' +
        '<li><strong>Metaspace</strong> — too many classes. Usually a class-loading leak, or a ' +
        'framework generating proxies without bound.</li>' +
        '<li><strong>unable to create native thread</strong> — not a heap problem at all. The OS ' +
        'refused a thread, because of a per-process limit, a cgroup pids limit, or because ' +
        'stacks have exhausted native memory. Ironically, <em>raising</em> <code>-Xmx</code> ' +
        'makes it worse by leaving less room for stacks.</li>' +
        '<li><strong>Direct buffer memory</strong> — off-heap NIO buffers hit ' +
        '<code>MaxDirectMemorySize</code>. Look for unclosed Netty or driver resources.</li>' +
        '<li><strong>Requested array size exceeds VM limit</strong> — an attempt to allocate an ' +
        'array longer than roughly <code>Integer.MAX_VALUE</code>. Always a bug, usually an ' +
        'unbounded read of something.</li>' +
        '</ul>' +
        '<p>The first move for any of them is the same: <code>-XX:+HeapDumpOnOutOfMemoryError ' +
        '-XX:HeapDumpPath=/var/log/app</code>, set <em>before</em> the incident. A restarted pod ' +
        'with no dump means starting the investigation from nothing.</p>',
    referenceLinks: [
        { title: 'Troubleshooting Memory Leaks', url: 'https://docs.oracle.com/en/java/javase/21/troubleshoot/troubleshooting-memory-leaks.html' }
    ],
    tags: ['jvm', 'errors', 'diagnostics'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'diagnosing-a-memory-leak',
    importance: 'must-know',
    subsection: 'diagnostics',
    question: 'A service restarts every few hours with OutOfMemoryError. Walk through finding the cause.',
    answer:
        '<p>The structure of a good answer is <strong>confirm, capture, compare, find the ' +
        'path</strong> — and it should be recognisably the same method whatever the leak turns ' +
        'out to be.</p>' +
        '<p><strong>1. Confirm it is a leak.</strong> Plot heap used <em>after full GC</em> over ' +
        'hours. A sawtooth returning to the same floor is not a leak; the service just needs a ' +
        'bigger heap or allocates too much. A floor that rises monotonically is a leak. This step ' +
        'is skipped constantly and it changes the whole investigation.</p>' +
        '<p><strong>2. Capture a heap dump.</strong> ' +
        '<code>-XX:+HeapDumpOnOutOfMemoryError</code> for the automatic one, or ' +
        '<code>jcmd &lt;pid&gt; GC.heap_dump /tmp/heap.hprof</code> on demand. Take two, an hour ' +
        'apart, before the crash — the difference between them is far more informative than a ' +
        'single dump at the moment everything fell over.</p>' +
        '<p><strong>3. Open it in Eclipse MAT</strong> and go straight to the ' +
        '<strong>dominator tree</strong>, not the histogram. A histogram tells you there are nine ' +
        'million <code>String</code>s, which is true of every heap dump ever taken. The dominator ' +
        'tree tells you which single object is keeping them alive.</p>' +
        '<p><strong>4. Ask for the path to the GC root.</strong> That path <em>is</em> the bug. ' +
        'It will end at a static field, a cache with no bound, a <code>ThreadLocal</code> on a ' +
        'pooled thread, a listener that was registered and never removed, or a class loader ' +
        'that is still reachable.</p>' +
        '<p>What separates a strong answer: saying that the retained-size question ("what would ' +
        'be freed if this went away") is the one worth asking, and that the leak is a ' +
        '<em>reference</em> nobody dropped rather than memory nobody freed.</p>',
    referenceLinks: [
        { title: 'Troubleshooting Memory Leaks', url: 'https://docs.oracle.com/en/java/javase/21/troubleshoot/troubleshooting-memory-leaks.html' },
        { title: 'Eclipse Memory Analyzer', url: 'https://eclipse.dev/mat/' }
    ],
    tags: ['jvm', 'diagnostics', 'leaks', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'jvm-diagnostic-tools',
    importance: 'must-know',
    subsection: 'diagnostics',
    question: 'Which JVM tools do you reach for, and what does each one answer?',
    answer:
        '<p>Five, and knowing which question each answers matters more than knowing the ' +
        'flags.</p>' +
        '<ul>' +
        '<li><strong><code>jcmd</code></strong> — the one to learn. <code>jcmd &lt;pid&gt; ' +
        'help</code> lists everything the JVM will tell you: <code>Thread.print</code> for a ' +
        'thread dump, <code>GC.heap_info</code> and <code>GC.heap_dump</code>, ' +
        '<code>VM.native_memory</code>, <code>VM.flags</code>, <code>JFR.start</code>. It has ' +
        'absorbed most of what <code>jmap</code> and <code>jstack</code> used to do.</li>' +
        '<li><strong><code>jstat -gcutil &lt;pid&gt; 1s</code></strong> — GC behaviour as a live ' +
        'table: percentage used per space, collection counts, total GC time. The fastest way to ' +
        'tell "leaking" from "busy".</li>' +
        '<li><strong>Thread dumps</strong> — three of them, ten seconds apart. One tells you what ' +
        'threads exist; three tell you what is <em>stuck</em>. This is the tool for a hang, high ' +
        'CPU, or pool exhaustion, and it finds deadlocks automatically.</li>' +
        '<li><strong>Java Flight Recorder</strong> — always-on, low-overhead event recording: ' +
        'allocation profiles by call site, GC events, lock contention, I/O. ' +
        '<code>-XX:StartFlightRecording=duration=60s,filename=r.jfr</code>, then open it in ' +
        'JDK Mission Control. This is what to reach for when the question is "where is the time ' +
        'or the garbage coming from" rather than "what is holding memory".</li>' +
        '<li><strong>Eclipse MAT</strong> — offline heap dump analysis, for the leak itself.</li>' +
        '</ul>' +
        '<p>Worth adding: in a container, all of these need the JVM in the <em>same</em> ' +
        'container, which is an argument for a JDK base image rather than a JRE one, and for ' +
        '<code>kubectl debug</code> with an ephemeral container when it is not.</p>',
    referenceLinks: [
        { title: 'JDK Mission Control and Flight Recorder', url: 'https://docs.oracle.com/en/java/javase/21/jfapi/flight-recorder-configurations.html' },
        { title: 'Diagnostic Tools', url: 'https://docs.oracle.com/en/java/javase/21/troubleshoot/diagnostic-tools.html' }
    ],
    tags: ['jvm', 'diagnostics', 'tooling'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: [
        {
            language: 'bash',
            title: 'The first ninety seconds of a memory incident',
            code:
                'PID=$(pgrep -f app.jar)\n' +
                '\n' +
                '# Is it leaking, or just busy? Watch the O column across full GCs.\n' +
                'jstat -gcutil $PID 1s 30\n' +
                '\n' +
                '# What is stuck? Three dumps, ten seconds apart.\n' +
                'for i in 1 2 3; do jcmd $PID Thread.print > td-$i.txt; sleep 10; done\n' +
                '\n' +
                '# Capture evidence before anything restarts it.\n' +
                'jcmd $PID GC.heap_dump /tmp/heap.hprof',
            output: {
                kind: 'trace',
                lines: [
                    '  S0     S1     E      O      M     CCS    YGC   YGCT    FGC    FGCT',
                    '  0.00  31.25  62.40  74.11  95.02  92.18   482   6.201     3   1.884',
                    '  0.00  31.25  88.90  74.11  95.02  92.18   482   6.201     3   1.884',
                    ' 24.60   0.00   9.10  74.55  95.02  92.18   483   6.214     3   1.884'
                ],
                explain:
                    '<p>O is the old generation. Watching it across several full GCs is the whole ' +
                    'test: a value that returns to roughly the same figure each time is a healthy ' +
                    'service, and one that climbs after every FGC is a leak. Note that E filling ' +
                    'and emptying is normal and says nothing.</p>'
            }
        }
    ]
},

{
    id: 'classloader-leak',
    importance: 'should-know',
    subsection: 'diagnostics',
    question: 'What is a classloader leak, and what causes one?',
    answer:
        '<p>A class is only unloadable when its <strong>class loader</strong> is unreachable, ' +
        'and a class loader is reachable from every class it loaded and every instance of those ' +
        'classes. So one stray reference into an application\'s object graph pins the entire ' +
        'application — all its classes, all its static state — in Metaspace forever.</p>' +
        '<p>Classically this is the application-server redeploy leak: each redeploy creates a new ' +
        'loader, the old one cannot be collected, and Metaspace grows until the server dies. It ' +
        'is less common now that most deployments replace the whole process, but it still shows ' +
        'up in plugin systems, scripting engines, and anything doing hot reload.</p>' +
        '<p>The usual culprits, all of which are a reference from something with a longer ' +
        'lifetime than the application:</p>' +
        '<ul>' +
        '<li>A <strong><code>ThreadLocal</code> on a container-managed thread pool</strong>. The ' +
        'thread outlives the application, the value holds an application class, and the loader ' +
        'is pinned.</li>' +
        '<li>A <strong>JDBC driver</strong> registered in <code>DriverManager</code>, which is ' +
        'loaded by the system loader.</li>' +
        '<li>A <strong>shutdown hook</strong> or a JVM-wide singleton registered by the ' +
        'application and never removed.</li>' +
        '<li>A <strong>thread the application started</strong> and did not stop.</li>' +
        '<li>A <strong>logging or metrics framework</strong> holding an appender that references ' +
        'an application class.</li>' +
        '</ul>' +
        '<p>Diagnosis is the same as any leak with one extra step: in MAT, find the duplicate ' +
        '<code>ClassLoader</code> instances and ask for the path to the GC root from the ' +
        '<em>loader</em>. The answer is a single reference, and removing it is the fix.</p>',
    referenceLinks: [
        { title: 'Troubleshooting Memory Leaks', url: 'https://docs.oracle.com/en/java/javase/21/troubleshoot/troubleshooting-memory-leaks.html' }
    ],
    tags: ['jvm', 'leaks', 'classloading'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'jvm-in-a-container',
    importance: 'must-know',
    subsection: 'diagnostics',
    question: 'What does the JVM need to know that it is running in a container?',
    answer:
        '<p>Before Java 8u191 it needed to be told everything, because it read the host\'s CPU ' +
        'count and memory rather than the cgroup\'s. A JVM in a 512MB container on a 64GB host ' +
        'sized its heap for 64GB and was killed almost immediately, and a thread pool sized from ' +
        '<code>availableProcessors()</code> got 32 threads in a one-core container.</p>' +
        '<p><strong><code>UseContainerSupport</code> is on by default since Java 10</strong> ' +
        '(and backported to 8u191). The JVM reads cgroup limits, so ' +
        '<code>availableProcessors()</code> respects the CPU quota and the default heap is a ' +
        'fraction of the container memory limit rather than the host\'s.</p>' +
        '<p>What to still get right:</p>' +
        '<ul>' +
        '<li><strong>Use <code>-XX:MaxRAMPercentage</code>, not <code>-Xmx</code>.</strong> A ' +
        'fixed <code>-Xmx</code> in an image is wrong the moment someone changes the deployment ' +
        'limit. 60–75% is the usual band, lower for services with large off-heap use.</li>' +
        '<li><strong>Set a CPU <em>request</em> of at least one core.</strong> A fractional CPU ' +
        'limit means <code>availableProcessors()</code> reports 1, which changes the default ' +
        'collector to Serial and sizes every framework pool at 1.</li>' +
        '<li><strong>Remember memory limits are enforced by the kernel and heap limits by the ' +
        'JVM.</strong> Exceeding the first is a SIGKILL with no stack trace and exit code 137; ' +
        'exceeding the second is an <code>OutOfMemoryError</code> you can diagnose. Leaving ' +
        'headroom is what converts one into the other.</li>' +
        '</ul>',
    referenceLinks: [
        { title: 'JEP 343: Packaging Tool / container awareness notes', url: 'https://docs.oracle.com/en/java/javase/21/gctuning/ergonomics1.html' }
    ],
    tags: ['jvm', 'containers', 'operations'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'reading-a-gc-log',
    importance: 'should-know',
    subsection: 'diagnostics',
    question: 'What do you turn on to see GC behaviour, and what do you look for?',
    answer:
        '<p>One flag, in the unified logging format that replaced the old ' +
        '<code>-XX:+PrintGCDetails</code> family in Java 9:</p>' +
        '<p><code>-Xlog:gc*:file=/var/log/gc.log:time,uptime,level,tags:filecount=5,filesize=20M</code></p>' +
        '<p>It is cheap enough to leave on in production permanently, and a GC investigation ' +
        'without it is guesswork.</p>' +
        '<p>What to read, in order:</p>' +
        '<ul>' +
        '<li><strong>Heap used after each full GC.</strong> Flat is healthy, rising is a leak. ' +
        'This single series answers the first question in any memory incident.</li>' +
        '<li><strong>Full GC frequency.</strong> In G1, any full GC is a problem worth ' +
        'understanding.</li>' +
        '<li><strong>Pause durations, at the tail.</strong> The mean is uninformative; the p99 is ' +
        'what your users felt.</li>' +
        '<li><strong>Percentage of wall-clock time in GC.</strong> Above a few per cent is a real ' +
        'cost. Above ten is an emergency.</li>' +
        '<li><strong>Allocation rate</strong> — young-generation size divided by the interval ' +
        'between young collections. High rate with low promotion means garbage that could ' +
        'probably not be created at all.</li>' +
        '<li><strong>"to-space exhausted" and "Evacuation Failure"</strong> — G1 could not find ' +
        'room to copy survivors. Precedes a full GC and means the heap is too small or promotion ' +
        'is too fast.</li>' +
        '</ul>' +
        '<p>Also worth naming: <strong>time to safepoint</strong>, logged separately. A long ' +
        'pause with a short collection is a safepoint problem, not a GC one, and tuning the ' +
        'collector will not touch it.</p>',
    referenceLinks: [
        { title: 'JEP 158: Unified JVM Logging', url: 'https://openjdk.org/jeps/158' }
    ],
    tags: ['jvm', 'gc', 'diagnostics'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'leak-or-undersized-heap',
    importance: 'should-know',
    subsection: 'diagnostics',
    question: 'How do you tell a memory leak from a heap that is simply too small?',
    answer:
        '<p>One measurement, and it is the question worth asking before touching anything: ' +
        '<strong>what is the heap usage immediately after a full GC, plotted over hours?</strong></p>' +
        '<ul>' +
        '<li><strong>Returns to the same floor each time</strong> — not a leak. The live set is ' +
        'stable and the JVM is coping. If GC is taking too much time, the heap is undersized or ' +
        'the allocation rate is too high, and both are addressed differently from a leak.</li>' +
        '<li><strong>The floor climbs monotonically</strong> — a leak. More heap only buys ' +
        'time.</li>' +
        '<li><strong>The floor climbs and then plateaus</strong> — a cache filling up, or a lazily ' +
        'initialised structure. Not a leak, but worth knowing where the ceiling is and whether it ' +
        'is bounded on purpose.</li>' +
        '</ul>' +
        '<p>The reason this distinction matters practically: the remedies point in opposite ' +
        'directions. For an undersized heap you raise <code>-Xmx</code>, and the problem goes ' +
        'away. For a leak, raising <code>-Xmx</code> makes the next incident later, larger and ' +
        'harder to dump — and it is the single most common wrong response, because it appears to ' +
        'work for a week.</p>' +
        '<p>A third possibility worth ruling out: not a leak and not undersized, but ' +
        '<strong>one request that allocates enormously</strong> — an unpaged query, a full file ' +
        'read, an unbounded export. The signature is a heap that is fine until a specific ' +
        'endpoint is called, and a heap dump full of one type. That is a code fix, not a tuning ' +
        'one.</p>',
    referenceLinks: [
        { title: 'HotSpot Garbage Collection Tuning Guide', url: 'https://docs.oracle.com/en/java/javase/21/gctuning/index.html' }
    ],
    tags: ['jvm', 'diagnostics', 'judgement'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'jit-compilation-and-warmup',
    importance: 'should-know',
    subsection: 'diagnostics',
    question: 'What does the JIT do, and why is the first minute after a deploy slow?',
    answer:
        '<p>Java starts by <strong>interpreting</strong> bytecode. The JIT compiles methods to ' +
        'machine code once they have proved they matter, using counters on invocations and loop ' +
        'back-edges.</p>' +
        '<p><strong>Tiered compilation</strong> is the default and has two compilers. C1 compiles ' +
        'quickly and produces mediocre code, plus instrumentation. C2 compiles slowly and ' +
        'produces excellent code, guided by the profile C1 collected. A hot method therefore ' +
        'goes interpreted, then C1, then C2, and gets faster at each step.</p>' +
        '<p>That is why a freshly started JVM is slow, and why the effect is bigger than people ' +
        'expect — commonly an order of magnitude on the first requests. Consequences worth ' +
        'stating:</p>' +
        '<ul>' +
        '<li><strong>Benchmarks must warm up</strong>, or they measure the interpreter. This is ' +
        'the entire reason JMH exists, and why a hand-rolled <code>System.nanoTime()</code> loop ' +
        'produces confident nonsense.</li>' +
        '<li><strong>A readiness probe that passes before warmup sends real traffic into a cold ' +
        'JVM.</strong> The usual fix is a warmup request loop at startup, or a slow rollout with ' +
        'a small initial share of traffic.</li>' +
        '<li><strong>Optimisations are speculative and can be undone.</strong> C2 inlines on the ' +
        'assumption that only one implementation of an interface has been seen; loading a second ' +
        'triggers <strong>deoptimisation</strong> back to the interpreter and a recompile. That ' +
        'is why a method can get slower after running fine for an hour.</li>' +
        '</ul>' +
        '<p>The mitigations at the platform level: <strong>AppCDS</strong> to skip class-loading ' +
        'work, and <strong>GraalVM native image</strong> to remove warmup entirely by compiling ' +
        'ahead of time — at the cost of peak throughput, because there is no profile to optimise ' +
        'against.</p>',
    referenceLinks: [
        { title: 'HotSpot Virtual Machine Performance Enhancements', url: 'https://docs.oracle.com/en/java/javase/21/vm/java-hotspot-virtual-machine-performance-enhancements.html' }
    ],
    tags: ['jvm', 'jit', 'performance'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'static-collection-leak',
    importance: 'should-know',
    subsection: 'diagnostics',
    question: 'What are the most common ways application code leaks memory in Java?',
    answer:
        '<p>Every one of them is the same shape — <strong>something with a long life holding a ' +
        'reference to something with a short one</strong> — and recognising the shape is more ' +
        'useful than memorising the list.</p>' +
        '<ul>' +
        '<li><strong>A static collection used as a cache with no bound and no eviction.</strong> ' +
        'The archetype. A static field is a GC root, so nothing in that map is ever collected. If ' +
        'it is a cache, give it a maximum size and a TTL; a real cache library does this and a ' +
        '<code>HashMap</code> does not.</li>' +
        '<li><strong>A listener or callback registered and never removed.</strong> The publisher ' +
        'outlives the subscriber and holds it.</li>' +
        '<li><strong><code>ThreadLocal</code> on a pooled thread.</strong> The thread returns to ' +
        'the pool with the value still attached and is reused for thousands of subsequent ' +
        'requests. Always <code>remove()</code> in a <code>finally</code>. The weak <em>keys</em> ' +
        'in <code>ThreadLocalMap</code> do not save you, because the entry\'s value is held ' +
        'strongly until the map is next cleaned.</li>' +
        '<li><strong>An unclosed resource</strong> — a stream, a connection, a ' +
        '<code>Scanner</code>. <code>try-with-resources</code> exists for this and there is no ' +
        'reason not to use it.</li>' +
        '<li><strong>A mutable key in a <code>HashSet</code> or <code>HashMap</code>.</strong> ' +
        'Mutate a field used by <code>hashCode</code> and the entry is in a bucket nothing will ' +
        'ever look in — unreachable through the API, perfectly reachable by the collector.</li>' +
        '<li><strong><code>substring</code> in very old Java.</strong> Before Java 7u6 a ' +
        'substring shared the parent\'s character array, so one small substring held a large ' +
        'document. Worth knowing as history, and worth not claiming as current behaviour.</li>' +
        '</ul>',
    referenceLinks: [
        { title: 'ThreadLocal — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/ThreadLocal.html' }
    ],
    tags: ['jvm', 'leaks', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'high-cpu-with-low-throughput',
    importance: 'should-know',
    subsection: 'diagnostics',
    question: 'CPU is pinned at 100% and throughput has collapsed. How do you find out why?',
    answer:
        '<p>Two candidates dominate — <strong>GC thrash</strong> and <strong>a hot loop</strong> ' +
        '— and one command distinguishes them.</p>' +
        '<p><strong>Check GC first, because it is one glance.</strong> ' +
        '<code>jstat -gcutil &lt;pid&gt; 1s</code>: if GC time is climbing by most of a second ' +
        'every second and the old generation stays near 100%, the JVM is collecting continuously ' +
        'and recovering nothing. That is the memory problem above, presenting as a CPU problem, ' +
        'and no amount of thread analysis will find it.</p>' +
        '<p><strong>If GC is quiet, find the thread.</strong> On Linux, ' +
        '<code>top -H -p &lt;pid&gt;</code> gives per-thread CPU with native thread ids. Convert ' +
        'the busiest to hex and find that <code>nid</code> in a <code>jcmd Thread.print</code> ' +
        'dump — the stack at the top of it is the loop. Taking three dumps and looking for the ' +
        'thread whose stack does not change is the version of this that works when the ids are ' +
        'awkward.</p>' +
        '<p><strong>If neither is conclusive, profile.</strong> Java Flight Recorder for a minute ' +
        'gives a proper sampled profile with almost no overhead, and it is safe to run on a ' +
        'production instance — which is the property that makes it worth learning over the ' +
        'alternatives.</p>' +
        '<p>Two causes worth having in the back pocket because they are invisible to the above: a ' +
        'regex with catastrophic backtracking on user input, and a <code>HashMap</code> being ' +
        'mutated concurrently, which in old Java could spin forever in <code>get</code>.</p>',
    referenceLinks: [
        { title: 'Troubleshooting Guide — Hangs and Loops', url: 'https://docs.oracle.com/en/java/javase/21/troubleshoot/troubleshoot-process-hangs-loops.html' }
    ],
    tags: ['jvm', 'diagnostics', 'performance'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
}

    ]
};
