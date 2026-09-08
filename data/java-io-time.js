/* ==========================================================================
   data/java-io-time.js — I/O, Serialization & Date/Time

   Three subsections that share a theme rather than an API: all three are
   places where Java's oldest design decisions are still visible, and where
   the modern answer and the one a candidate learnt first are different.
   Charsets defaulted to the platform until Java 18. Serialization is a
   feature the JDK's own architects have said should never have shipped.
   java.util.Date has been the wrong answer since 2014 and is still in
   production code everywhere.

   Interviewers use this topic to find out whether someone has kept up, and
   whether they can say "we still use it, and here is what we do about it"
   rather than either defending it or pretending it is gone.

   ONE GLOBAL PER FILE.
   ========================================================================== */

const javaIoTimeData = {
    id: 'java-io-time',
    title: 'I/O, Serialization & Date/Time',
    subsections: [
        { id: 'io',            title: 'I/O, NIO & Files' },
        { id: 'serialization', title: 'Serialization' },
        { id: 'time',          title: 'Date & Time' }
    ],
    keyTopics: [
        'byte vs character streams', 'try-with-resources', 'Files and Path',
        'NIO channels and buffers', 'streaming a large file', 'Serializable',
        'serialVersionUID', 'transient', 'Externalizable',
        'why Java serialization is a hazard', 'LocalDate vs Instant vs ZonedDateTime',
        'time zones and DST', 'Duration vs Period', 'storing time in a database'
    ],
    questions: [

/* ==== I/O, NIO & Files ================================================ */

{
    id: 'byte-versus-character-streams',
    importance: 'must-know',
    subsection: 'io',
    question: 'What is the difference between a byte stream and a character stream?',
    answer:
        '<p>An <code>InputStream</code> or <code>OutputStream</code> moves <strong>bytes</strong>. ' +
        'A <code>Reader</code> or <code>Writer</code> moves <strong>characters</strong>, and the ' +
        'thing that converts between them is a <strong>charset</strong>.</p>' +
        '<p>That conversion is the whole point of the distinction, and getting it wrong is the ' +
        'origin of every mojibake bug you have ever seen. A byte stream is correct for anything ' +
        'that is not text — an image, a PDF, a protobuf payload — and treating one of those as ' +
        'text corrupts it, because a decode-then-encode round trip through a lossy charset does ' +
        'not return the bytes you started with.</p>' +
        '<p>The bridges are <code>InputStreamReader</code> and <code>OutputStreamWriter</code>, ' +
        'and <strong>both take a charset argument that you should always pass</strong>.</p>' +
        '<p>Which brings up the version answer worth knowing: until <strong>Java 18</strong> the ' +
        'no-argument forms used the <em>platform default</em> charset, so the same code produced ' +
        'different bytes on a developer\'s Mac and on a Linux server, and the bug only appeared ' +
        'for non-ASCII input. <strong>JEP 400 made UTF-8 the default</strong> everywhere in Java ' +
        '18. That fixes new code and does not fix the habit — being explicit is still the right ' +
        'answer, because it also documents the intent and works on older runtimes.</p>',
    referenceLinks: [
        { title: 'JEP 400: UTF-8 by Default', url: 'https://openjdk.org/jeps/400' }
    ],
    tags: ['io', 'charsets', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'try-with-resources-details',
    importance: 'must-know',
    subsection: 'io',
    question: 'What does try-with-resources do that a finally block does not?',
    answer:
        '<p>Three things, and the third is the one people do not know.</p>' +
        '<p><strong>1. It closes in reverse order</strong>, which is what you want when one ' +
        'resource wraps another — the writer before the stream it writes to.</p>' +
        '<p><strong>2. It handles the null and the throwing-close cases correctly</strong>, which ' +
        'a hand-written <code>finally</code> almost never does. The nested try-catch-inside-finally ' +
        'that does this properly is about fifteen lines, and nobody writes it.</p>' +
        '<p><strong>3. It suppresses rather than swallows.</strong> This is the real argument. If ' +
        'the body throws and then <code>close()</code> also throws, a <code>finally</code> block ' +
        'lets the close exception replace the original — so you lose the actual failure and are ' +
        'left with a confusing secondary one. Try-with-resources propagates the ' +
        '<em>original</em> and attaches the close exception, retrievable through ' +
        '<code>getSuppressed()</code> and printed in the stack trace under "Suppressed:".</p>' +
        '<p>Two details worth knowing. The resource must implement <code>AutoCloseable</code>; ' +
        '<code>Closeable</code> extends it and narrows the exception to <code>IOException</code>. ' +
        'And since <strong>Java 9</strong> you can name an already-existing effectively-final ' +
        'variable in the resource list, so you no longer have to redeclare it.</p>',
    referenceLinks: [
        { title: 'The try-with-resources Statement', url: 'https://docs.oracle.com/javase/tutorial/essential/exceptions/tryResourceClose.html' }
    ],
    tags: ['io', 'exceptions', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'streaming-a-large-file',
    importance: 'must-know',
    subsection: 'io',
    question: 'How would you process a 20GB file line by line?',
    answer:
        '<p>The whole question is whether the answer keeps memory constant. Anything ending in ' +
        '<code>readAllLines</code>, <code>readAllBytes</code> or <code>readString</code> loads ' +
        'the file into the heap and fails.</p>' +
        '<p>The two correct shapes:</p>' +
        '<ul>' +
        '<li><strong><code>Files.lines(path, UTF_8)</code> in a try-with-resources.</strong> A ' +
        'lazily populated stream — one line in memory at a time. <strong>It must be closed</strong>, ' +
        'and this is the trap: it holds an open file handle, unlike almost every other stream in ' +
        'the JDK, so forgetting the try-with-resources leaks descriptors until the process runs ' +
        'out. The Javadoc says so and it is very widely ignored.</li>' +
        '<li><strong>A <code>BufferedReader</code> and a <code>while</code> loop.</strong> Older, ' +
        'still fine, and better when you need to break early with state or throw a checked ' +
        'exception.</li>' +
        '</ul>' +
        '<p>Two things that come up as follow-ups. <strong>Buffering matters enormously</strong> ' +
        '— an unbuffered <code>FileInputStream</code> read one byte at a time is a system call ' +
        'per byte, and wrapping it in a <code>BufferedInputStream</code> is a hundredfold ' +
        'difference. And <strong>memory-mapping is not the answer here</strong>: ' +
        '<code>FileChannel.map</code> is excellent for random access to a large file and is a ' +
        'poor fit for a single sequential pass, where it buys nothing over buffered reading and ' +
        'costs address space.</p>' +
        '<p>The other half of a good answer is the output side. Writing results back must ' +
        'stream too, and anything that accumulates into a <code>List</code> before writing has ' +
        'simply moved the problem.</p>',
    referenceLinks: [
        { title: 'Files.lines — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/nio/file/Files.html' }
    ],
    tags: ['io', 'files', 'memory'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: [
        {
            language: 'java',
            title: 'Constant memory, and a file handle that actually gets closed',
            code:
                'Path path = Path.of("/data/events-20gb.log");\n' +
                '\n' +
                'try (Stream<String> lines = Files.lines(path, StandardCharsets.UTF_8)) {\n' +
                '    long errors = lines.filter(l -> l.contains("ERROR")).count();\n' +
                '    System.out.println(errors);\n' +
                '}\n' +
                '\n' +
                '// Without the try-with-resources this compiles, runs, produces the right\n' +
                '// answer, and leaks a file descriptor every time it is called.',
            output: {
                kind: 'trace',
                lines: ['heap stays flat; one line resident at a time'],
                explain:
                    '<p><code>Files.lines</code> is the only commonly used stream in the JDK that ' +
                    'owns an OS resource. Every other stream is safe to abandon, which is exactly ' +
                    'why the habit of not closing them is so easy to carry into this one.</p>'
            }
        }
    ]
},

{
    id: 'files-and-path-over-file',
    importance: 'should-know',
    subsection: 'io',
    question: 'Why use Path and Files instead of java.io.File?',
    answer:
        '<p>Because <code>File</code> fails silently. Its API is a set of boolean-returning ' +
        'methods — <code>delete()</code>, <code>mkdir()</code>, <code>renameTo()</code> — that ' +
        'return <code>false</code> when they fail and tell you nothing about why. Permission ' +
        'denied, no such directory and disk full are all <code>false</code>.</p>' +
        '<p><code>java.nio.file</code>, added in Java 7, throws instead: ' +
        '<code>NoSuchFileException</code>, <code>AccessDeniedException</code>, ' +
        '<code>DirectoryNotEmptyException</code>. The exception says what went wrong, which turns ' +
        'a class of production mysteries into a stack trace.</p>' +
        '<p>What else it brings:</p>' +
        '<ul>' +
        '<li><strong>Symbolic links as a first-class concept</strong>, with a ' +
        '<code>LinkOption</code> on the operations where following one is a decision.</li>' +
        '<li><strong>Atomic moves</strong> — <code>Files.move(tmp, target, ATOMIC_MOVE, ' +
        'REPLACE_EXISTING)</code>, which is the standard way to publish a file without a reader ' +
        'ever seeing a partial one.</li>' +
        '<li><strong>Directory walking that streams</strong> — <code>Files.walk</code> and ' +
        '<code>Files.find</code>, which also hold a handle and also need closing.</li>' +
        '<li><strong>A <code>WatchService</code></strong> for change notification.</li>' +
        '<li><strong>File attributes as typed views</strong> — POSIX permissions, owner, creation ' +
        'time.</li>' +
        '</ul>' +
        '<p><code>File</code> is not deprecated and the two interoperate through ' +
        '<code>toPath()</code> and <code>toFile()</code>, so migrating is incremental. New code ' +
        'should use <code>Path</code>.</p>',
    referenceLinks: [
        { title: 'java.nio.file — package summary', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/nio/file/package-summary.html' }
    ],
    tags: ['io', 'files'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'nio-channels-and-buffers',
    importance: 'good-to-know',
    subsection: 'io',
    question: 'What are channels and buffers, and how is NIO different from classic I/O?',
    answer:
        '<p>Classic I/O is <strong>stream-oriented and blocking</strong>: you read bytes one ' +
        'direction at a time, and the thread waits. NIO is <strong>buffer-oriented and can be ' +
        'non-blocking</strong>: a <code>Channel</code> reads into or writes from a ' +
        '<code>ByteBuffer</code>, in either direction, and can be configured not to wait.</p>' +
        '<p>The buffer has three positions and understanding them is the whole API: ' +
        '<strong>position</strong>, <strong>limit</strong> and <strong>capacity</strong>. You ' +
        'write into it, call <code>flip()</code> to set limit to position and position to zero, ' +
        'then read out. Forgetting the <code>flip</code> is the classic NIO bug, and it produces ' +
        'zero bytes rather than an error.</p>' +
        '<p>The part that actually mattered historically is <code>Selector</code>: one thread ' +
        'watching thousands of sockets, waking only for the ones that are ready. That is how ' +
        'Netty, and therefore most of the Java networking world, avoided a thread per connection ' +
        '— and it is the reason reactive frameworks look the way they do.</p>' +
        '<p>The modern framing worth offering: <strong>virtual threads make most of that ' +
        'machinery unnecessary for application code.</strong> A blocking read on a virtual thread ' +
        'parks the virtual thread and releases the carrier, so you get the scalability of the ' +
        'selector model with the readability of the blocking one. NIO remains the right tool ' +
        'inside frameworks and for file work; it is no longer the price of concurrency.</p>',
    referenceLinks: [
        { title: 'java.nio.channels — package summary', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/nio/channels/package-summary.html' }
    ],
    tags: ['io', 'nio', 'concurrency'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'writing-a-file-safely',
    importance: 'good-to-know',
    subsection: 'io',
    question: 'How do you write a file so a reader never sees it half-written?',
    answer:
        '<p><strong>Write to a temporary file in the same directory, then move it into place ' +
        'atomically.</strong> Same directory matters: an atomic move is only guaranteed within a ' +
        'filesystem, and <code>/tmp</code> is frequently a different one.</p>' +
        '<p>The sequence is write, flush, <code>force</code> if the durability actually matters, ' +
        'close, then <code>Files.move(tmp, target, ATOMIC_MOVE, REPLACE_EXISTING)</code>. A ' +
        'reader either sees the old file or the new one, never a truncated one, because rename ' +
        'within a filesystem is a single directory operation.</p>' +
        '<p>Two refinements that separate a considered answer:</p>' +
        '<ul>' +
        '<li><strong>Durability is separate from atomicity.</strong> The move being atomic does ' +
        'not mean the data is on the disk — it may be in the page cache. ' +
        '<code>FileChannel.force(true)</code> before the move, and <code>fsync</code> on the ' +
        'directory afterwards, is what survives a power cut. Most applications do not need this ' +
        'and should know they are not doing it.</li>' +
        '<li><strong>Clean up the temporary file on failure</strong>, in a finally block, or the ' +
        'directory fills with orphans over months.</li>' +
        '</ul>' +
        '<p>The same pattern answers the related question about configuration reloads, log ' +
        'rotation, and anything where a watcher is looking at a directory.</p>',
    referenceLinks: [
        { title: 'StandardCopyOption.ATOMIC_MOVE — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/nio/file/StandardCopyOption.html' }
    ],
    tags: ['io', 'files', 'durability'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

/* ==== Serialization =================================================== */

{
    id: 'why-java-serialization-is-a-hazard',
    importance: 'must-know',
    subsection: 'serialization',
    question: 'Why is Java serialization considered a mistake?',
    answer:
        '<p>Because <strong>deserialization is an object constructor that you do not ' +
        'control</strong>. Reading a byte stream can instantiate any serializable class on the ' +
        'classpath, populate its fields directly without running its constructor, and invoke ' +
        'code through <code>readObject</code>, <code>readResolve</code> and — historically — ' +
        'finalizers. The attacker chooses the classes.</p>' +
        '<p>That is what a <strong>gadget chain</strong> is: a sequence of ordinary library ' +
        'classes whose deserialization side effects, composed, reach something that executes a ' +
        'command. The application never wrote any of it. Commons Collections was the famous one, ' +
        'and the point is that the vulnerability was in the <em>mechanism</em>, not in the ' +
        'library.</p>' +
        '<p>The other problems, which matter even with no attacker:</p>' +
        '<ul>' +
        '<li><strong>It bypasses invariants.</strong> Constructors and validation do not run, so ' +
        'a class that cannot be constructed in an invalid state can be deserialized into ' +
        'one.</li>' +
        '<li><strong>The serialized form is part of your public API</strong>, forever. Renaming a ' +
        'private field is a compatibility break.</li>' +
        '<li><strong>It is Java-only, verbose and slow</strong> compared with any modern ' +
        'format.</li>' +
        '</ul>' +
        '<p>The official position is not subtle: JEP 154 disabled it for records\' benefit, the ' +
        'JDK ships deserialization filters as a mitigation, and Project Amber has an open ' +
        'proposal to replace the mechanism entirely. The practical answer: <strong>never ' +
        'deserialize untrusted input.</strong> Use JSON, protobuf or Avro at every boundary, and ' +
        'if you must accept Java serialization, set an allow-list filter.</p>',
    referenceLinks: [
        { title: 'JEP 290: Filter Incoming Serialization Data', url: 'https://openjdk.org/jeps/290' },
        { title: 'Serialization Filtering — Secure Coding Guidelines', url: 'https://docs.oracle.com/en/java/javase/21/core/serialization-filtering1.html' }
    ],
    tags: ['serialization', 'security', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'serialversionuid',
    importance: 'must-know',
    subsection: 'serialization',
    question: 'What is serialVersionUID, and what happens if you leave it out?',
    answer:
        '<p>It is the version stamp on a serializable class. Deserialization compares the value ' +
        'in the stream with the value on the loaded class, and refuses with ' +
        '<code>InvalidClassException</code> when they differ.</p>' +
        '<p><strong>If you leave it out, the JVM computes one</strong> from a hash of the class ' +
        'name, its interfaces, and every field and method signature. That sounds convenient and ' +
        'is the trap: <strong>almost any change to the class changes the value</strong> — adding ' +
        'a method, changing a field\'s modifier, even something a compiler emits differently ' +
        'between versions. Old data becomes unreadable for a change that had nothing to do with ' +
        'the data.</p>' +
        '<p>So the rule is to <strong>declare it explicitly</strong>, as ' +
        '<code>private static final long serialVersionUID = 1L;</code>, and then own the ' +
        'decision: keep the value when a change is compatible, change it when the new form ' +
        'genuinely cannot read the old one.</p>' +
        '<p>What counts as compatible, roughly: adding a field is fine — it arrives as the ' +
        'default value in old streams. Removing one is fine — it is ignored. Changing a field\'s ' +
        '<em>type</em>, or changing the class hierarchy, is not.</p>' +
        '<p>The observation that makes this a good interview answer: the fact that an ordinary ' +
        'refactor can break data at rest <em>is</em> the argument against using Java ' +
        'serialization for persistence. A format with an explicit schema does not have this ' +
        'problem, because the schema is not a hash of your source code.</p>',
    referenceLinks: [
        { title: 'Java Object Serialization Specification', url: 'https://docs.oracle.com/en/java/javase/21/docs/specs/serialization/index.html' }
    ],
    tags: ['serialization', 'compatibility'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'transient-and-what-is-skipped',
    importance: 'should-know',
    subsection: 'serialization',
    question: 'What is not written when an object is serialized?',
    answer:
        '<p>Four things:</p>' +
        '<ul>' +
        '<li><strong><code>transient</code> fields.</strong> The explicit "do not persist this" ' +
        'marker. On deserialization the field gets the type\'s default — null, zero, false — ' +
        '<em>not</em> whatever the constructor would have set, because the constructor does not ' +
        'run. This is the single most common serialization bug: a transient cache or logger comes ' +
        'back null and the object throws on first use.</li>' +
        '<li><strong><code>static</code> fields</strong>, because they belong to the class rather ' +
        'than the instance.</li>' +
        '<li><strong>Anything in a non-serializable superclass.</strong> Its state is skipped and ' +
        'its <strong>no-argument constructor is called</strong> instead — so if it has not got ' +
        'one, deserialization fails.</li>' +
        '<li>Nothing else. Every other field is written, including private ones and including ' +
        'the whole object graph they reference, transitively.</li>' +
        '</ul>' +
        '<p>That last clause is a real hazard rather than a detail. Serializing one entity can ' +
        'drag its entire object graph into the stream — which in a JPA context has been known to ' +
        'serialise most of a database through a lazy association, and in a Spring context to try ' +
        'to serialise the application context because a bean held a reference to it.</p>' +
        '<p>The fix when a field must be restored rather than defaulted: implement ' +
        '<code>readObject</code>, call <code>defaultReadObject()</code> first, then rebuild the ' +
        'transient state.</p>',
    referenceLinks: [
        { title: 'Serializable — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/io/Serializable.html' }
    ],
    tags: ['serialization', 'pitfalls'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'records-and-serialization',
    importance: 'good-to-know',
    subsection: 'serialization',
    question: 'How is serialization different for a record?',
    answer:
        '<p>It is the one place the mechanism was fixed rather than patched, and it makes a ' +
        'clean contrast worth drawing in an interview.</p>' +
        '<p>A record is serialized from its <strong>components</strong>, and deserialized ' +
        '<strong>through its canonical constructor</strong>. Not by writing fields directly and ' +
        'not by bypassing construction.</p>' +
        '<p>Three consequences, all of them improvements:</p>' +
        '<ul>' +
        '<li><strong>Invariants hold.</strong> A compact constructor that rejects a negative ' +
        'amount rejects it on deserialization too. For an ordinary class it would not — which is ' +
        'the root of the security problem.</li>' +
        '<li><strong><code>readObject</code>, <code>writeObject</code> and ' +
        '<code>readResolve</code> are ignored.</strong> There is no hook to subvert, so a record ' +
        'cannot be a gadget.</li>' +
        '<li><strong>The serialized form follows the component list</strong>, which is public API ' +
        'anyway, so what is compatible is visible rather than hidden.</li>' +
        '</ul>' +
        '<p>The general lesson is the interesting part: the hazard in Java serialization was ' +
        'never the format, it was <strong>constructing objects without running their ' +
        'constructors</strong>. Records fix it by not doing that.</p>',
    referenceLinks: [
        { title: 'JEP 395: Records', url: 'https://openjdk.org/jeps/395' }
    ],
    tags: ['serialization', 'records', 'modern-java'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'serialization-alternatives',
    importance: 'must-know',
    subsection: 'serialization',
    question: 'What would you use instead of Java serialization, and how would you choose?',
    answer:
        '<p>By whether the boundary is public, whether the schema needs to evolve independently ' +
        'of the code, and whether a human ever has to read the bytes.</p>' +
        '<ul>' +
        '<li><strong>JSON</strong> — the default for HTTP APIs. Human-readable, universally ' +
        'supported, tolerant of unknown fields, which is what makes independent deployment ' +
        'possible. Verbose and slow relative to the binary options, and that rarely matters at ' +
        'API scale.</li>' +
        '<li><strong>Protocol Buffers</strong> — a declared schema, generated code, compact ' +
        'binary, and explicit rules for compatible change (add optional fields, never reuse a ' +
        'field number). The right answer for internal service-to-service traffic at volume, and ' +
        'what gRPC carries.</li>' +
        '<li><strong>Avro</strong> — schema travels with the data or lives in a registry, which ' +
        'is why it dominates in Kafka. Strong schema evolution story with reader and writer ' +
        'schemas resolved at read time.</li>' +
        '<li><strong>CBOR or MessagePack</strong> — JSON\'s data model in a binary encoding. ' +
        'Useful when you want JSON\'s flexibility and less of its size.</li>' +
        '</ul>' +
        '<p>The point that makes this more than a list: <strong>the schema should be a separate ' +
        'artefact from the class.</strong> Java serialization\'s central mistake was making the ' +
        'wire format a function of the source code, so a private refactor became a breaking ' +
        'change. Every option above separates them, and that is the property you are actually ' +
        'choosing.</p>' +
        '<p>Java serialization survives legitimately in a few places — an ' +
        '<code>HttpSession</code> replicated between nodes, some caching layers — and there the ' +
        'answer is a <strong>deserialization filter</strong> with an allow-list, configured with ' +
        '<code>jdk.serialFilter</code>.</p>',
    referenceLinks: [
        { title: 'Serialization Filtering', url: 'https://docs.oracle.com/en/java/javase/21/core/serialization-filtering1.html' }
    ],
    tags: ['serialization', 'api-design'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

/* ==== Date & Time ===================================================== */

{
    id: 'localdate-instant-zoneddatetime',
    importance: 'must-know',
    subsection: 'time',
    question: 'LocalDateTime, Instant, OffsetDateTime, ZonedDateTime — which do you use when?',
    answer:
        '<p>The question behind all four is <strong>does this moment exist on the machine ' +
        'timeline, or is it a description humans agreed on?</strong></p>' +
        '<ul>' +
        '<li><strong><code>Instant</code></strong> — a point on the timeline, in UTC, with no ' +
        'human context. Use it for <em>when something happened</em>: created-at, logged-at, ' +
        'measured-at. This is the default for anything a machine recorded.</li>' +
        '<li><strong><code>LocalDate</code> / <code>LocalTime</code> / ' +
        '<code>LocalDateTime</code></strong> — no zone, therefore <strong>not a moment</strong>. ' +
        'A birthday is a <code>LocalDate</code>: it does not happen at a different time in Tokyo. ' +
        '"The shop opens at 09:00" is a <code>LocalTime</code>. Using these for events is the ' +
        'classic mistake, because two <code>LocalDateTime</code>s cannot be ordered across ' +
        'zones.</li>' +
        '<li><strong><code>OffsetDateTime</code></strong> — a local date-time plus a fixed offset ' +
        'like <code>+05:30</code>. Unambiguous as a moment, and the right type for a timestamp ' +
        'crossing a wire, because it needs no tz database to interpret.</li>' +
        '<li><strong><code>ZonedDateTime</code></strong> — a local date-time plus a ' +
        '<em>region</em>, <code>Europe/London</code>. The only one that knows about DST rules, ' +
        'and therefore the only one that can correctly add "one day" across a transition.</li>' +
        '</ul>' +
        '<p>The distinction between the last two is the one candidates most often miss. An ' +
        'offset is a number; a zone is a <em>set of rules</em> that says which offset applies ' +
        'when. For a future appointment you need the zone, because governments change the rules ' +
        'and an offset recorded today may be wrong by then.</p>',
    referenceLinks: [
        { title: 'java.time — package summary', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/time/package-summary.html' }
    ],
    tags: ['time', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'storing-time-in-a-database',
    importance: 'must-know',
    subsection: 'time',
    question: 'How should a timestamp be stored in a database?',
    answer:
        '<p>Split it by the same question as the type choice: <strong>is this a moment, or a ' +
        'human description?</strong></p>' +
        '<p><strong>A moment — use <code>timestamptz</code>.</strong> In PostgreSQL 16, ' +
        '<code>timestamp with time zone</code> does not store a zone: it converts the input to ' +
        'UTC, stores that, and converts back on read using the session\'s zone. That is exactly ' +
        'what you want, and it is why <code>timestamp without time zone</code> is almost always ' +
        'the wrong column type for an event — it stores a wall-clock reading with no way to know ' +
        'which clock.</p>' +
        '<p>Map it to <code>Instant</code> or <code>OffsetDateTime</code>, and ' +
        '<strong>set the JVM and the connection to UTC</strong> so no layer applies a surprise ' +
        'conversion.</p>' +
        '<p><strong>A future scheduled event — store the local date-time and the zone id ' +
        'separately.</strong> "The meeting is at 09:00 on 4 March in Europe/London" cannot be ' +
        'stored as an instant, because if the UK changes its DST rules between now and then, the ' +
        'instant you computed is no longer 09:00. Two columns, and the instant is derived at read ' +
        'time.</p>' +
        '<p><strong>A date with no time — use <code>date</code></strong> and ' +
        '<code>LocalDate</code>. A birthday stored as a timestamp is how people end up a day ' +
        'younger in Sydney.</p>' +
        '<p>Two operational notes worth adding: the IANA tz database is updated several times a ' +
        'year and your runtime image needs those updates; and storing an offset instead of a zone ' +
        'id throws away the information needed to do any of this correctly.</p>',
    referenceLinks: [
        { title: 'PostgreSQL 16 — Date/Time Types', url: 'https://www.postgresql.org/docs/16/datatype-datetime.html' }
    ],
    tags: ['time', 'persistence', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'duration-versus-period',
    importance: 'should-know',
    subsection: 'time',
    question: 'What is the difference between Duration and Period?',
    answer:
        '<p><code>Duration</code> is <strong>time-based</strong> — seconds and nanoseconds. ' +
        '<code>Period</code> is <strong>date-based</strong> — years, months and days. They are ' +
        'not two spellings of the same thing, and the difference shows up exactly twice a year.</p>' +
        '<p><strong>Adding <code>Duration.ofDays(1)</code> is not adding one calendar day.</strong> ' +
        'It adds exactly 86,400 seconds. On the night the clocks go forward, one calendar day ' +
        'later is 23 hours away, so the two land an hour apart. On a <code>ZonedDateTime</code>, ' +
        '<code>plus(Period.ofDays(1))</code> gives you the same wall-clock time tomorrow; ' +
        '<code>plus(Duration.ofDays(1))</code> gives you a different one.</p>' +
        '<p>Months make the point even more clearly: a <code>Period</code> of one month is 28, ' +
        '29, 30 or 31 days depending on where you start, so it cannot be a <code>Duration</code> ' +
        'at all. And <code>plusMonths(1)</code> from 31 January lands on 28 or 29 February — the ' +
        'result is clamped to the last valid day, not overflowed into March. Which also means the ' +
        'operation is not reversible: adding a month and subtracting one does not always return ' +
        'you to where you started.</p>' +
        '<p>The rule that keeps it straight: <strong>use <code>Duration</code> for elapsed time ' +
        'and timeouts, <code>Period</code> for calendar arithmetic.</strong> Anything a human ' +
        'would describe in days, months or years is a <code>Period</code>.</p>',
    referenceLinks: [
        { title: 'Period — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/time/Period.html' }
    ],
    tags: ['time', 'arithmetic'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'dst-and-ambiguous-times',
    importance: 'must-know',
    subsection: 'time',
    question: 'What happens to a local time that does not exist, or exists twice?',
    answer:
        '<p>Both cases occur every year at a DST transition, and <code>java.time</code> resolves ' +
        'them by documented rules rather than throwing — which is worth knowing precisely, ' +
        'because "it throws" is the common wrong answer.</p>' +
        '<p><strong>The gap.</strong> When clocks go forward, 02:30 may not exist. ' +
        '<code>ZonedDateTime.of(...)</code> moves the result forward by the length of the gap, so ' +
        'you get 03:30. No exception.</p>' +
        '<p><strong>The overlap.</strong> When clocks go back, 01:30 happens twice. ' +
        '<code>ZonedDateTime.of(...)</code> picks the <strong>earlier</strong> offset — the ' +
        'summer one. <code>withEarlierOffsetAtOverlap()</code> and ' +
        '<code>withLaterOffsetAtOverlap()</code> let you say which you meant.</p>' +
        '<p>Why this matters in practice: a job scheduled at 01:30 local runs twice on one night ' +
        'a year and not at all on another, and a duration computed between two local times across ' +
        'a transition is wrong by an hour. Both are real incidents, both are invisible in ' +
        'testing, and both are avoided the same way — <strong>schedule and compute in UTC, ' +
        'convert to local only for display.</strong></p>' +
        '<p>The follow-up worth pre-empting: a zone\'s rules are data, not code. They are ' +
        'updated several times a year in the IANA database, so a container image pinned two years ' +
        'ago has wrong rules for any country that has changed them since.</p>',
    referenceLinks: [
        { title: 'ZonedDateTime — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/time/ZonedDateTime.html' }
    ],
    tags: ['time', 'timezones', 'pitfalls'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'why-java-time-replaced-date',
    importance: 'should-know',
    subsection: 'time',
    question: 'What was wrong with java.util.Date and Calendar?',
    answer:
        '<p>Enough that the replacement was a whole new package rather than a fix.</p>' +
        '<ul>' +
        '<li><strong>Mutable.</strong> <code>Date</code> has setters, so passing one to a method ' +
        'means the method can change it, and holding one as a field means callers can change ' +
        'yours. Every defensive copy in old code exists because of this.</li>' +
        '<li><strong>Not thread-safe, and the formatter is worse.</strong> ' +
        '<code>SimpleDateFormat</code> keeps parsing state in a field, so sharing one across ' +
        'threads produces wrong dates rather than an exception. It is one of the most common ' +
        'concurrency bugs in Java, precisely because a static formatter looks like a sensible ' +
        'optimisation. <code>DateTimeFormatter</code> is immutable and thread-safe.</li>' +
        '<li><strong>Confused abstractions.</strong> <code>Date</code> is an instant that pretends ' +
        'to have a date; it has <code>getYear()</code>, deprecated, returning the year minus ' +
        '1900. There is no type for "a date with no time" at all.</li>' +
        '<li><strong>Zero-based months.</strong> January is 0 in <code>Calendar</code>, and this ' +
        'has produced bugs continuously since 1996.</li>' +
        '<li><strong>No arithmetic worth the name</strong> — <code>Calendar.add</code> mutates, ' +
        'and nothing distinguishes a day from 24 hours.</li>' +
        '</ul>' +
        '<p><code>java.time</code>, added in Java 8 and derived from Joda-Time, is immutable, ' +
        'thread-safe, fluent, and separates the concepts. Converting at the edges is ' +
        '<code>Date.toInstant()</code> and <code>Date.from(instant)</code>.</p>' +
        '<p>The formatter trap has a modern echo worth mentioning: <code>DateTimeFormatter</code> ' +
        'pattern letters are not the same as <code>SimpleDateFormat</code>\'s. ' +
        '<code>YYYY</code> is week-based year and <code>yyyy</code> is the ordinary one, and ' +
        'using the wrong one produces a date that is right for 51 weeks and wrong over new ' +
        'year — a bug that reliably ships in December and appears in January.</p>',
    referenceLinks: [
        { title: 'DateTimeFormatter — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/time/format/DateTimeFormatter.html' }
    ],
    tags: ['time', 'legacy', 'concurrency'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'clock-for-testable-time',
    importance: 'should-know',
    subsection: 'time',
    question: 'How do you write testable code that depends on the current time?',
    answer:
        '<p>Inject a <code>java.time.Clock</code> and never call <code>Instant.now()</code>, ' +
        '<code>LocalDate.now()</code> or <code>System.currentTimeMillis()</code> directly in ' +
        'business logic.</p>' +
        '<p><code>Clock</code> is the abstraction the whole package is built on — every ' +
        '<code>now()</code> has an overload taking one. So the change is small: hold a ' +
        '<code>Clock</code>, call <code>Instant.now(clock)</code>, and in production supply ' +
        '<code>Clock.systemUTC()</code> as a bean.</p>' +
        '<p>In tests you then get exactly what you need:</p>' +
        '<ul>' +
        '<li><code>Clock.fixed(instant, zone)</code> — time stands still, so an assertion on a ' +
        'timestamp is deterministic.</li>' +
        '<li><code>Clock.offset(base, duration)</code> — jump forward to test an expiry without ' +
        'sleeping.</li>' +
        '<li><code>Clock.tick(base, duration)</code> — coarse granularity, for testing ' +
        'code that must not depend on nanoseconds.</li>' +
        '</ul>' +
        '<p>The alternative people reach for is mocking a static method, which works and is worse: ' +
        'it needs a bytecode-manipulating mock library, it applies globally within the test, and ' +
        'it hides a dependency the type signature should have shown. <strong>A class that needs ' +
        'to know the time has a dependency on the time</strong>, and the constructor is where ' +
        'dependencies belong.</p>' +
        '<p>One more reason it pays: a <code>Clock</code> makes it possible to run the same logic ' +
        'against historical data by supplying a clock positioned in the past.</p>',
    referenceLinks: [
        { title: 'Clock — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/time/Clock.html' }
    ],
    tags: ['time', 'testing', 'design'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'monotonic-versus-wall-clock',
    importance: 'good-to-know',
    subsection: 'time',
    question: 'Why should you not measure elapsed time with System.currentTimeMillis()?',
    answer:
        '<p>Because it reports the <strong>wall clock</strong>, and the wall clock can move ' +
        'backwards. NTP corrections, a manual change, a VM resuming from suspension, or a leap ' +
        'second smear all shift it — so a measured duration can come out negative, or wrong by ' +
        'seconds, at random and rarely.</p>' +
        '<p><code>System.nanoTime()</code> is a <strong>monotonic</strong> counter. Its absolute ' +
        'value is meaningless — it is not time since any epoch, and comparing values from two ' +
        'JVMs or two machines is nonsense — but the difference between two readings on the same ' +
        'machine is a genuine elapsed interval.</p>' +
        '<p>So the rule is a clean split:</p>' +
        '<ul>' +
        '<li><strong>"What time is it?"</strong> — <code>Instant.now()</code> or a ' +
        '<code>Clock</code>. Suitable for timestamps, expiry, anything a human or another system ' +
        'will read.</li>' +
        '<li><strong>"How long did that take?"</strong> — <code>System.nanoTime()</code>, and ' +
        'store the result in a <code>Duration</code>.</li>' +
        '</ul>' +
        '<p>This is why every timeout in <code>java.util.concurrent</code> is specified in terms ' +
        'of a relative duration rather than an absolute deadline, and why a distributed lock ' +
        'lease that trusts wall-clock comparison across machines is unsound — clock skew is not ' +
        'a rare event, it is the normal state of affairs.</p>',
    referenceLinks: [
        { title: 'System.nanoTime — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/System.html' }
    ],
    tags: ['time', 'measurement', 'distributed'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'buffering-and-why-it-matters',
    importance: 'should-know',
    subsection: 'io',
    question: 'What does BufferedInputStream actually buy you?',
    answer:
        '<p>Fewer system calls. An unbuffered <code>FileInputStream.read()</code> asks the kernel ' +
        'for one byte; a <code>BufferedInputStream</code> asks for 8KB and serves the next 8,191 ' +
        'calls from an array in the heap. The difference on a large file is one or two orders of ' +
        'magnitude, and it is the single cheapest I/O improvement available.</p>' +
        '<p>Two things about it are worth getting right.</p>' +
        '<p><strong>The wrapping order matters.</strong> ' +
        '<code>new BufferedReader(new InputStreamReader(in, UTF_8))</code> — buffer outermost, so ' +
        'the decoding happens on bulk reads rather than per byte. Wrapping the other way round ' +
        'buffers bytes you then decode one at a time and buys much less.</p>' +
        '<p><strong>Flushing is not automatic on the write side.</strong> A ' +
        '<code>BufferedWriter</code> holds data until the buffer fills or you ' +
        '<code>flush()</code>. Closing flushes, which is why try-with-resources quietly prevents ' +
        'the classic bug of a file that is missing its last few hundred bytes — and why a program ' +
        'that exits without closing loses them. <code>System.out</code> is a ' +
        '<code>PrintStream</code> with autoflush on newline, which is why this never bites people ' +
        'on console output and always bites them on files.</p>' +
        '<p>The modern shortcut: <code>Files.newBufferedReader(path)</code> and ' +
        '<code>Files.newBufferedWriter(path)</code> give you the whole stack correctly assembled, ' +
        'UTF-8 by default, in one call.</p>',
    referenceLinks: [
        { title: 'BufferedInputStream — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/io/BufferedInputStream.html' }
    ],
    tags: ['io', 'performance'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'externalizable-versus-serializable',
    importance: 'good-to-know',
    subsection: 'serialization',
    question: 'What is Externalizable, and is it worth using?',
    answer:
        '<p><code>Serializable</code> is a marker: the JVM works out the format from the fields. ' +
        '<code>Externalizable</code> extends it with two methods you must implement, ' +
        '<code>writeExternal</code> and <code>readExternal</code>, and hands you complete control ' +
        'of the bytes.</p>' +
        '<p>Three differences that follow:</p>' +
        '<ul>' +
        '<li><strong>A public no-argument constructor is required</strong>, and it ' +
        '<em>is</em> called on deserialization — unlike <code>Serializable</code>, where no ' +
        'constructor runs at all. Then <code>readExternal</code> fills the object in.</li>' +
        '<li><strong>Nothing is written automatically</strong>, including superclass state. ' +
        'Forgetting a field is a silent data-loss bug rather than a compile error.</li>' +
        '<li><strong>It can be considerably faster and smaller</strong>, because it skips the ' +
        'reflective field discovery and the type metadata.</li>' +
        '</ul>' +
        '<p>Is it worth using? Almost never. It buys performance within a mechanism you should ' +
        'not be using for anything performance-sensitive in the first place, and it keeps the ' +
        'security problem — the class is still instantiated from an untrusted stream, and ' +
        '<code>readExternal</code> is still attacker-triggered code. If serialization speed is ' +
        'the constraint, the answer is a different format, not a hand-written one.</p>' +
        '<p>Worth knowing because it comes up as a "do you know the difference" question, and ' +
        'the complete answer includes "and I would not reach for it".</p>',
    referenceLinks: [
        { title: 'Externalizable — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/io/Externalizable.html' }
    ],
    tags: ['serialization'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'time-on-the-wire',
    importance: 'should-know',
    subsection: 'time',
    question: 'How should a timestamp be represented in a JSON API?',
    answer:
        '<p><strong>An ISO-8601 string in UTC</strong>, which is what ' +
        '<code>Instant.toString()</code> produces: <code>2026-03-04T09:15:30Z</code>. Jackson ' +
        'serialises <code>Instant</code> and <code>OffsetDateTime</code> to exactly that when ' +
        '<code>JavaTimeModule</code> is registered — which Spring Boot does for you — and ' +
        '<code>WRITE_DATES_AS_TIMESTAMPS</code> is disabled, which Boot also does.</p>' +
        '<p>Why not an epoch number, which is smaller and unambiguous? Because it is ' +
        '<strong>unreadable in a log or a bug report</strong>, its unit is not self-describing — ' +
        'seconds and milliseconds look identical until someone is a thousand times off — and it ' +
        'silently loses precision in JavaScript, where a number is a double and microsecond ' +
        'timestamps stop being exact. The string costs twenty bytes and removes all three ' +
        'problems.</p>' +
        '<p>Three more decisions worth stating explicitly in an API contract:</p>' +
        '<ul>' +
        '<li><strong>Always include the offset</strong>, even when it is <code>Z</code>. A ' +
        'timestamp with no offset is a <code>LocalDateTime</code> and cannot be ordered against ' +
        'anything.</li>' +
        '<li><strong>Say what the precision is.</strong> <code>Instant</code> carries ' +
        'nanoseconds, PostgreSQL <code>timestamptz</code> stores microseconds, and a round trip ' +
        'through the database therefore changes the value — which breaks an equality assertion in ' +
        'a test and is a genuinely confusing bug the first time.</li>' +
        '<li><strong>A date is not a timestamp.</strong> Send <code>LocalDate</code> as ' +
        '<code>2026-03-04</code> and resist the temptation to send midnight-in-some-zone.</li>' +
        '</ul>',
    referenceLinks: [
        { title: 'DateTimeFormatter.ISO_INSTANT — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/time/format/DateTimeFormatter.html' }
    ],
    tags: ['time', 'api-design', 'json'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'date-arithmetic-and-adjusters',
    importance: 'good-to-know',
    subsection: 'time',
    question: 'How do you express "the last working day of the month" in java.time?',
    answer:
        '<p>With a <code>TemporalAdjuster</code> — the extension point for calendar rules that ' +
        'are not simple arithmetic.</p>' +
        '<p><code>TemporalAdjusters</code> ships the common ones: ' +
        '<code>lastDayOfMonth()</code>, <code>firstDayOfNextMonth()</code>, ' +
        '<code>next(DayOfWeek.MONDAY)</code>, <code>previousOrSame(...)</code>, ' +
        '<code>lastInMonth(DayOfWeek.FRIDAY)</code>. They compose with <code>with()</code>:</p>' +
        '<p><code>date.with(TemporalAdjusters.lastDayOfMonth())</code>, then step backwards while ' +
        'the day is a weekend — or write your own adjuster, which is a single lambda, and give ' +
        'the business rule a name.</p>' +
        '<p>Three related pieces of the API worth knowing exist:</p>' +
        '<ul>' +
        '<li><strong><code>ChronoUnit.between(a, b)</code></strong> for "how many whole days / ' +
        'months / years", which is what people reach for <code>Period</code> for and get ' +
        'subtly wrong. Note it truncates rather than rounds.</li>' +
        '<li><strong>Everything is immutable</strong>, so <code>date.plusDays(1)</code> returns a ' +
        'new date and ignoring the result is a no-op — the <code>java.time</code> version of the ' +
        'classic <code>string.trim()</code> mistake.</li>' +
        '<li><strong><code>YearMonth</code> and <code>MonthDay</code></strong> exist, and are the ' +
        'right types for a card expiry and a recurring anniversary respectively. Reaching for ' +
        '<code>LocalDate</code> with a dummy day is how 29 February becomes a bug.</li>' +
        '</ul>',
    referenceLinks: [
        { title: 'TemporalAdjusters — Java SE 25 API', url: 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/time/temporal/TemporalAdjusters.html' }
    ],
    tags: ['time', 'arithmetic'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
}

    ]
};
