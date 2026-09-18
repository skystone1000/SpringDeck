/* ==========================================================================
   data/theory/io-and-serialization.js — module 17 in the reading path

   Fourth of the six section 5.9 java-platform insertions. Its prerequisite
   is exceptions-and-failure rather than the module immediately before it,
   because half of I/O is resource handling and try-with-resources is where
   that was established.

   Eleven chapters in two halves. The first six are streams, buffering, the
   Files API and the one question that gets asked in every senior loop —
   process a file larger than the heap. The last five are serialization,
   and they are written from a specific position that the plan's tagline
   states outright: this is the feature the JDK team wishes it could remove.
   The chapters explain it properly, because interviews ask about it and
   because legacy code uses it, and then say plainly what to use instead.
   ========================================================================== */

const ioAndSerializationModule = {
    id: 'io-and-serialization',
    trackId: 'java-platform',
    order: 17,
    title: 'I/O, NIO and Serialization',
    tagline: 'Including the feature the JDK team wishes it could remove.',
    estimatedMinutes: 45,
    prerequisites: ['exceptions-and-failure'],
    docHub: { title: 'java.nio.file', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/nio/file/package-summary.html' },

    chapters: [
        {
            id: 'byte-vs-character-streams',
            title: 'Bytes Against Characters',
            importance: 'must-know',
            summary: 'InputStream carries bytes; Reader carries characters. The bridge between them is a charset, and leaving it out means the platform default decides what your data means.',
            interviewAngle: 'The charset question is the one worth having a position on: a program that reads a UTF-8 file correctly on a developer laptop and corrupts it in a container is this bug, and it was silent until Java 18.',
            buildsOn: [],
            blocks: [
                {
                    type: 'comparison',
                    title: 'The two hierarchies',
                    left: 'InputStream / OutputStream',
                    right: 'Reader / Writer',
                    rows: [
                        { aspect: 'Unit', left: 'A byte (0–255)', right: 'A <code>char</code> — a UTF-16 code unit' },
                        { aspect: 'Knows about encoding', left: 'No', right: 'Yes. It is a decoded view.' },
                        { aspect: 'Use for', left: 'Images, archives, protocol frames, anything binary', right: 'Text: CSV, JSON, logs, source' },
                        { aspect: 'Bridge', left: '<code>new InputStreamReader(in, UTF_8)</code>', right: '<code>new OutputStreamWriter(out, UTF_8)</code>' },
                        { aspect: 'The mistake', left: 'Reading text as bytes and comparing them', right: '<strong>Constructing one without naming a charset</strong>' }
                    ]
                },
                {
                    type: 'version',
                    title: 'The default charset, which used to be a machine property',
                    items: [
                        { version: 'Java 17 and earlier', state: 'was', html: '<p>The default charset came from the operating system and locale. The same code read a UTF-8 file as UTF-8 on Linux and as windows-1252 on a Windows developer machine, silently producing mojibake.</p>' },
                        { version: 'Java 18', state: 'changed', html: '<p><strong>JEP 400.</strong> UTF-8 became the default charset for the standard APIs, everywhere. Most charset bugs in new code disappeared with it.</p>' },
                        { version: 'Java 18+', state: 'is', html: '<p><code>-Dfile.encoding=COMPAT</code> restores the old behaviour for legacy code. <code>System.console()</code> and <code>native.encoding</code> still reflect the platform, because a terminal genuinely has its own encoding.</p>' },
                        { version: 'Any version', state: 'is', html: '<p>Naming the charset explicitly is still correct. It documents intent, and it works identically on every version — which matters for a library that must run on 17 and 21.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong><code>new String(bytes)</code> and <code>string.getBytes()</code> are the same bug in miniature.</strong> Both use the default charset, both are one character shorter than the correct version, and both are extremely common. <code>new String(bytes, UTF_8)</code> and <code>getBytes(UTF_8)</code>. The failure is not an exception — it is a replacement character in a customer\'s name, discovered downstream.</p>'
                }
            ],
            docs: [
                { title: 'JEP 400: UTF-8 by Default', url: 'https://openjdk.org/jeps/400', kind: 'spec' }
            ],
            relatedQuestions: [
                { topicId: 'java-io-time', questionId: 'byte-versus-character-streams' }
            ]
        },

        {
            id: 'buffering-and-why-it-matters',
            title: 'Buffering',
            importance: 'must-know',
            summary: 'An unbuffered read asks the operating system for one byte at a time. Wrapping the stream in a buffer turns thousands of system calls into a handful, and it is the difference between seconds and minutes.',
            interviewAngle: 'A performance question with a mechanical answer: the cost is the system call, not the read. Being able to say that is better than "buffering is faster".',
            buildsOn: ['byte-vs-character-streams'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The same loop, with and without a buffer',
                    code: '// Unbuffered: each read() is a syscall for ONE byte.\ntry (InputStream in = Files.newInputStream(path)) {\n    int b;\n    while ((b = in.read()) != -1) { process(b); }\n}\n\n// Buffered: one syscall per 8 KB, and read() becomes an array index.\ntry (InputStream in = new BufferedInputStream(Files.newInputStream(path))) {\n    int b;\n    while ((b = in.read()) != -1) { process(b); }\n}\n\n// Or skip the wrapper by reading into your own array -- the buffer is\n// only ever a convenience for byte-at-a-time APIs.\ntry (InputStream in = Files.newInputStream(path)) {\n    byte[] chunk = new byte[8192];\n    int n;\n    while ((n = in.read(chunk)) != -1) { process(chunk, n); }\n}\n\n// Files.newBufferedReader is already buffered AND already UTF-8.\ntry (BufferedReader r = Files.newBufferedReader(path)) { ... }',
                    output: {
                        kind: 'trace',
                        lines: [
                            'Unbuffered, 10 MB file:  ~10,000,000 read() calls, each crossing into the kernel.',
                            'Buffered at 8 KB:        ~1,280 kernel reads; the other 10 million reads are array indexing.',
                            'The saving is the system call, not the byte copy. That is why wrapping helps and a bigger heap does not.',
                            'Buffering an OutputStream matters just as much, and adds one more obligation: flush, or close, or the tail is lost.'
                        ],
                        explain: '<p>The write side is the one that produces a bug rather than a slowdown. A buffered writer that is never flushed or closed loses whatever was still in the buffer — a truncated file with no exception anywhere. try-with-resources closes it, which is why the resource-handling module is this one\'s prerequisite.</p>'
                    }
                },
                {
                    type: 'tip',
                    html: '<p>Do not stack buffers. <code>new BufferedInputStream(new BufferedInputStream(in))</code> is a real thing people write, and the second one buys nothing but a copy. Check whether the source is already buffered — <code>Files.newBufferedReader</code>, <code>Files.lines</code> and most framework-supplied streams are.</p>'
                }
            ],
            docs: [
                { title: 'BufferedInputStream', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/io/BufferedInputStream.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'java-io-time', questionId: 'buffering-and-why-it-matters' }
            ]
        },

        {
            id: 'files-and-path',
            title: 'Files and Path',
            importance: 'must-know',
            summary: 'The NIO.2 API from Java 7. Everything java.io.File got wrong — silent boolean failures, no symlink handling, no atomic operations — is fixed here.',
            interviewAngle: 'Knowing that File.delete() returns false rather than telling you why, and that Files.delete() throws with a reason, is the concrete version of "use the newer API".',
            buildsOn: ['buffering-and-why-it-matters'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'Why the old API was replaced',
                    left: 'java.io.File',
                    right: 'java.nio.file',
                    rows: [
                        { aspect: 'Failure reporting', left: '<code>boolean</code>. <code>delete()</code> returns false and never says why.', right: 'Throws with the reason — <code>NoSuchFileException</code>, <code>AccessDeniedException</code>' },
                        { aspect: 'Atomic move', left: 'None', right: '<code>Files.move(a, b, ATOMIC_MOVE)</code>' },
                        { aspect: 'Symbolic links', left: 'Barely aware of them', right: 'First class, with <code>NOFOLLOW_LINKS</code> everywhere' },
                        { aspect: 'Directory walking', left: 'Recursive <code>listFiles()</code>, loads everything', right: '<code>Files.walk</code>, lazy, and <code>walkFileTree</code> with a visitor' },
                        { aspect: 'Watching for changes', left: 'Poll it yourself', right: '<code>WatchService</code>, backed by the OS' },
                        { aspect: 'Metadata', left: 'A few booleans', right: '<code>readAttributes</code>, including POSIX permissions and creation time' }
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The operations worth knowing by heart',
                    code: 'Path path = Path.of("data", "orders.csv");     // never string concatenation\n\nFiles.exists(path);\nFiles.size(path);\nFiles.createDirectories(path.getParent());     // mkdir -p, no-op if present\n\n// Small files: one line each. Both use UTF-8 since Java 18.\nString all       = Files.readString(path);\nList<String> ls  = Files.readAllLines(path);\nFiles.writeString(path, content, CREATE, TRUNCATE_EXISTING);\n\n// Large files: a lazy Stream. try-with-resources is REQUIRED here --\n// the stream holds an open file handle.\ntry (Stream<String> lines = Files.lines(path)) {\n    lines.filter(l -> l.startsWith("ERR")).forEach(this::report);\n}\n\n// Walking a tree, lazily, and closing the handle.\ntry (Stream<Path> tree = Files.walk(root, 3)) {\n    tree.filter(Files::isRegularFile).forEach(this::index);\n}',
                    notes: '<p><code>Files.lines</code> and <code>Files.walk</code> are the two stream-returning methods that must be closed, and they are the reason <code>Stream</code> implements <code>AutoCloseable</code> at all. Using one without try-with-resources leaks a file descriptor per call — which surfaces much later as "too many open files" in a component that looks unrelated.</p>'
                },
                {
                    type: 'tip',
                    html: '<p><code>Path.of("a", "b")</code> rather than <code>"a/" + "b"</code>: the separator is platform-correct, and — more usefully — <code>Path</code> has <code>normalize()</code> and <code>startsWith()</code>, which is how you check that a user-supplied filename has not escaped its directory with <code>../</code>. Path traversal is a real vulnerability class and string concatenation gives you no tools against it.</p>'
                }
            ],
            docs: [
                { title: 'Files', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/nio/file/Files.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'java-io-time', questionId: 'files-and-path-over-file' },
                { topicId: 'java-io-time', questionId: 'writing-a-file-safely' }
            ]
        },

        {
            id: 'nio-channels-and-buffers',
            title: 'Channels and Buffers',
            importance: 'should-know',
            summary: 'A channel is bidirectional and works in blocks; a ByteBuffer is a fixed array with a position, a limit and a capacity. flip() is the operation everybody gets wrong.',
            interviewAngle: 'Comes up in a networking or performance context. The buffer state machine is the part to be precise about — position, limit, capacity, and what flip and clear actually do.',
            buildsOn: ['files-and-path'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The three markers, and the two methods that move them',
                    code: 'ByteBuffer buf = ByteBuffer.allocate(1024);\n// After allocate:  position=0    limit=1024  capacity=1024\n\nchannel.read(buf);\n// Read 300 bytes:  position=300  limit=1024\n// The DATA is [0, 300). The buffer is in WRITE mode.\n\nbuf.flip();\n// flip():          limit=position(300); position=0\n// Now the buffer is in READ mode and reading stops at the data end.\n\nwhile (buf.hasRemaining()) { process(buf.get()); }\n// position advances to 300\n\nbuf.clear();     // position=0, limit=capacity. Does NOT erase anything.\nbuf.compact();   // moves unread bytes to the front, ready to write more\n\n// The idiomatic copy loop:\nwhile (in.read(buf) != -1) {\n    buf.flip();\n    while (buf.hasRemaining()) out.write(buf);\n    buf.clear();\n}',
                    output: {
                        kind: 'trace',
                        lines: [
                            'allocate(1024)   position=0    limit=1024  capacity=1024',
                            'read 300 bytes   position=300  limit=1024   -- data is [0,300), buffer is in write mode',
                            'flip()           position=0    limit=300    -- data is [0,300), buffer is in read mode',
                            'get() x300       position=300  limit=300    -- hasRemaining() is now false',
                            'clear()          position=0    limit=1024   -- the old bytes are still there; only the markers moved'
                        ],
                        explain: '<p><code>clear()</code> not erasing anything is the detail that matters for security as much as correctness: a buffer reused across requests still holds the previous request\'s bytes beyond the current position, and code that reads past the limit — or logs the whole backing array — leaks them.</p>'
                    }
                },
                {
                    type: 'types',
                    title: 'Heap buffers against direct buffers',
                    items: [
                        { name: '<code>allocate</code> — heap buffer', html: '<p>A <code>byte[]</code> inside the Java heap. Cheap to create, and I/O copies it to an off-heap staging area first because the kernel cannot be handed a movable array.</p>' },
                        { name: '<code>allocateDirect</code> — direct buffer', html: '<p>Off-heap memory the kernel can use without a copy. Expensive to allocate, freed only when the buffer is collected. Worth it for long-lived buffers in a hot path; a mistake for short-lived ones.</p>' },
                        { name: 'The operational hazard', html: '<p>Direct buffers are not in the heap, so they do not show in heap usage and are not bounded by <code>-Xmx</code>. A leak here shows up as the container being OOM-killed while the heap looks healthy — bound it with <code>-XX:MaxDirectMemorySize</code>.</p>' }
                    ]
                }
            ],
            docs: [
                { title: 'ByteBuffer', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/nio/ByteBuffer.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'java-io-time', questionId: 'nio-channels-and-buffers' },
                { topicId: 'jvm-memory', questionId: 'direct-byte-buffers' }
            ]
        },

        {
            id: 'memory-mapped-files',
            title: 'Memory-Mapped Files',
            importance: 'good-to-know',
            summary: 'Map a region of a file into the address space and read it as memory. The operating system pages it in on demand, which is how Kafka and most databases read their own storage.',
            interviewAngle: 'A good depth answer to "how would you read a 50 GB file". Knowing why Kafka is fast — the page cache and sendfile, not clever Java — is the payoff.',
            buildsOn: ['nio-channels-and-buffers'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Mapping a file, and the caveat that comes with it',
                    code: 'try (FileChannel channel = FileChannel.open(path, READ)) {\n    MappedByteBuffer map = channel.map(READ_ONLY, 0, channel.size());\n\n    // No read() calls. Touching a page the OS has not loaded causes a\n    // page fault, and the kernel brings it in.\n    byte first = map.get(0);\n    byte last  = map.get((int) channel.size() - 1);\n}\n\n// Caveats, all of them real:\n//  - The offset and length are int-addressable per mapping, so a file\n//    over 2 GB needs several mappings.\n//  - Unmapping is not under your control before Java 21; the region is\n//    released when the buffer is collected, which on Windows keeps the\n//    file locked for an unpredictable time.\n//  - Pages count against the OS, not the Java heap. A container memory\n//    limit sees them; -Xmx does not.',
                    notes: '<p>Java 21\'s foreign function and memory API (<code>Arena</code> and <code>MemorySegment</code>) gives deterministic unmapping and 64-bit addressing, which removes both of the first two caveats. It is the right answer for new code that genuinely needs this, and <code>MappedByteBuffer</code> remains what you will find in existing code.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The interview-useful version: <em>"Kafka\'s throughput comes from the operating system, not from Java. Writes go to the page cache and are flushed by the kernel; reads are served by <code>sendfile</code>, which copies from the page cache to the socket without the bytes ever entering the JVM. That is why Kafka brokers run with a small heap and a large amount of free memory — the memory is doing the work."</em> It is one of the few places where an OS-level fact explains a system\'s headline property.</p>'
                }
            ],
            docs: [
                { title: 'FileChannel.map', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/nio/channels/FileChannel.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'kafka-messaging', questionId: 'retention-and-log-compaction' }
            ]
        },

        {
            id: 'streaming-a-large-file-without-oom',
            title: 'Processing a File Larger Than the Heap',
            importance: 'must-know',
            summary: 'Never hold the whole thing. Read a record at a time, keep bounded state, and make sure nothing downstream accumulates — including the JPA persistence context.',
            interviewAngle: 'Asked constantly, and the answer that scores is not "use a stream" — it is naming everything that quietly accumulates, because the stream is usually not the thing that ran out of memory.',
            buildsOn: ['memory-mapped-files'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The shape, and the three accumulators that defeat it',
                    code: '// Streaming, batched, and bounded.\ntry (Stream<String> lines = Files.lines(path, UTF_8)) {\n    Iterator<String> it = lines.iterator();\n    List<Order> batch = new ArrayList<>(500);\n\n    while (it.hasNext()) {\n        batch.add(parse(it.next()));\n        if (batch.size() == 500) { flush(batch); batch.clear(); }\n    }\n    if (!batch.isEmpty()) flush(batch);\n}\n\n@Transactional\nvoid flush(List<Order> batch) {\n    for (Order o : batch) entityManager.persist(o);\n    entityManager.flush();\n    entityManager.clear();      // <-- WITHOUT THIS, the persistence\n}                               //     context holds every entity and\n                                //     the heap fills anyway',
                    output: {
                        kind: 'trace',
                        lines: [
                            'The stream itself is lazy and holds one line. That part is rarely the problem.',
                            'Accumulator 1: the JPA persistence context. Every persisted entity is retained until clear() or commit.',
                            'Accumulator 2: collect(toList()) anywhere in the pipeline. One call and the whole file is in memory.',
                            'Accumulator 3: a growing collection in the loop -- a dedupe Set, a per-key aggregate map, an error list.',
                            'A single transaction around the whole import is the same failure wearing a different hat: nothing can be cleared until it commits.'
                        ],
                        explain: '<p>The reason this question discriminates is that the naive answer — "read it line by line" — is correct and insufficient. Every real out-of-memory failure in a bulk import is one of the three accumulators, and naming them is what shows the candidate has debugged one rather than described one.</p>'
                    }
                },
                {
                    type: 'types',
                    title: 'The same discipline, by format',
                    items: [
                        { name: 'CSV', html: '<p><code>Files.lines</code>, or a streaming parser for quoted fields containing newlines — which hand-rolled splitting always gets wrong.</p>' },
                        { name: 'JSON', html: '<p>Jackson\'s <code>JsonParser</code> token stream, or <code>readValues()</code> for a top-level array. <code>readValue(File, List.class)</code> materialises everything.</p>' },
                        { name: 'XML', html: '<p>StAX or SAX, never DOM. DOM is a whole-document tree by definition.</p>' },
                        { name: 'A database result set', html: '<p>The same problem: the driver may buffer the entire result. PostgreSQL needs <code>setFetchSize</code> <em>and</em> autocommit off before it will use a cursor.</p>' },
                        { name: 'An HTTP response', html: '<p>Stream the body. <code>HttpResponse.BodyHandlers.ofInputStream()</code> rather than <code>ofString()</code>.</p>' }
                    ]
                }
            ],
            docs: [
                { title: 'Files.lines', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/nio/file/Files.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'java-io-time', questionId: 'streaming-a-large-file' },
                { topicId: 'jpa-hibernate', questionId: 'batch-inserts' }
            ]
        },

        {
            id: 'serializable-and-serialversionuid',
            title: 'Serializable and serialVersionUID',
            importance: 'should-know',
            summary: 'A marker interface that turns an object graph into bytes. The version id is computed from the class structure if you do not declare one, which makes almost any edit a breaking change.',
            interviewAngle: 'The serialVersionUID question is standard. The answer that matters is what happens when you do not declare one — the compiler-generated value changes when you add a method, not only a field.',
            buildsOn: ['streaming-a-large-file-without-oom'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p><code>Serializable</code> declares nothing. Implementing it opts the class into a JVM mechanism that walks its fields reflectively, writes them along with the class name and a version id, and reconstructs the graph on the other side <strong>without calling any constructor</strong>.</p><p><code>serialVersionUID</code> is the compatibility token. If the reader\'s class has a different value from the stream, deserialisation fails with <code>InvalidClassException</code>. If you do not declare one, the compiler derives it from the class\'s name, modifiers, interfaces, fields <em>and methods</em> — so adding a private helper method changes it and breaks every previously written stream.</p>'
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Declaring it, and what still breaks after you do',
                    code: 'class Order implements Serializable {\n    // Declare it. Once. Then never change it -- changing it is how you\n    // deliberately declare an incompatible version.\n    private static final long serialVersionUID = 1L;\n\n    private String id;\n    private BigDecimal total;\n}\n\n// COMPATIBLE changes, with the uid pinned:\n//   adding a field      -> reads back as the default (null / 0 / false)\n//   removing a field    -> the value in the stream is discarded\n//   adding a method     -> irrelevant once the uid is declared\n//\n// INCOMPATIBLE changes, whatever the uid says:\n//   changing a field is TYPE\n//   changing the class hierarchy\n//   turning a class into an interface, or the reverse\n//   renaming the class or moving it to another package',
                    notes: '<p>"Adding a field reads back as the default" is a quiet hazard rather than a convenience: a new non-null invariant arrives as <code>null</code> in every object read from an old stream, and nothing in the deserialisation path runs the code that would have enforced it. That is the same property as constructors being skipped, and it is the root of the security chapter four along.</p>'
                }
            ],
            docs: [
                { title: 'Serializable', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/io/Serializable.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'java-io-time', questionId: 'serialversionuid' }
            ]
        },

        {
            id: 'transient-and-what-is-not-written',
            title: 'transient, and What Is Left Out',
            importance: 'should-know',
            summary: 'transient excludes a field. static fields belong to the class and are never written. Both leave you with an object whose invariants nobody re-established.',
            interviewAngle: 'The follow-up to serialVersionUID, and the practical point is that a transient field comes back as its default — so a cache, a lock or a connection must be rebuilt somewhere.',
            buildsOn: ['serializable-and-serialversionuid'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'What is skipped, and how to put it back',
                    code: 'class Session implements Serializable {\n    private static final long serialVersionUID = 1L;\n\n    private String userId;\n    private transient String authToken;     // secret: not written\n    private transient Connection db;        // not meaningful elsewhere\n    private static int liveCount;           // belongs to the CLASS: never written\n\n    // The hook that runs after the fields have been restored. This is\n    // where a transient field gets a sensible value -- otherwise\n    // authToken is null and db is null, and the object is not usable.\n    private void readObject(ObjectInputStream in)\n            throws IOException, ClassNotFoundException {\n        in.defaultReadObject();\n        this.db = ConnectionPool.get();\n        // authToken stays null on purpose: it must be re-issued.\n    }\n}',
                    notes: '<p>Marking a secret <code>transient</code> is a genuinely good use of the keyword and it is easy to get half right: the field is excluded from <em>this</em> class\'s serialisation, and it is not excluded from a <code>toString()</code>, a log line, or a Jackson serialisation, each of which has its own opt-out. One exclusion mechanism per serialiser, and none of them knows about the others.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A record is serialised by its components and reconstructed through its canonical constructor</strong>, which is a meaningful improvement: the constructor runs, so validation and normalisation happen, and <code>transient</code> is not applicable because a record component cannot be transient. It is the one part of Java serialization that was designed after the security lessons had been learned.</p>'
                }
            ],
            docs: [
                { title: 'Serializable Objects', url: 'https://docs.oracle.com/javase/tutorial/jndi/objects/serial.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'java-io-time', questionId: 'transient-and-what-is-skipped' },
                { topicId: 'java-io-time', questionId: 'records-and-serialization' }
            ]
        },

        {
            id: 'externalizable-and-custom-readobject',
            title: 'Externalizable and the Custom Hooks',
            importance: 'good-to-know',
            summary: 'Externalizable hands you full control and requires a public no-arg constructor. writeObject and readObject customise the default mechanism without replacing it.',
            interviewAngle: 'A depth question. The discriminator is that Externalizable calls a public no-arg constructor and Serializable calls none at all, which is the security-relevant difference.',
            buildsOn: ['transient-and-what-is-not-written'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'Two ways to take control',
                    left: 'Serializable + writeObject/readObject',
                    right: 'Externalizable',
                    rows: [
                        { aspect: 'Interface', left: 'Marker only', right: 'Two methods you must implement' },
                        { aspect: 'Default field handling', left: 'Automatic; you can add to it with <code>defaultWriteObject</code>', right: 'None. You write every field.' },
                        { aspect: 'Constructor on read', left: '<strong>None runs at all</strong>', right: 'The <code>public</code> no-arg constructor runs, then <code>readExternal</code>' },
                        { aspect: 'Inheritance', left: 'Superclass fields handled if it is also Serializable', right: 'You handle everything, including the superclass' },
                        { aspect: 'Speed', left: 'Reflective', right: 'Faster — no reflection' },
                        { aspect: 'Worth it', left: 'For an extra invariant or a compatibility shim', right: 'Rarely. If performance matters this much, leave Java serialization entirely.' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>The <code>Externalizable</code> constructor requirement is a real vulnerability surface.</strong> A public no-arg constructor that anybody can call, on a class designed to be populated from a byte stream, is exactly the shape an attacker wants. It is a smaller hole than the one in the next chapter, and it is in the same wall.</p>'
                }
            ],
            docs: [
                { title: 'Externalizable', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/io/Externalizable.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'java-io-time', questionId: 'externalizable-versus-serializable' }
            ]
        },

        {
            id: 'why-java-serialization-is-a-security-hazard',
            title: 'Why It Is a Security Hazard',
            importance: 'must-know',
            summary: 'Deserialisation constructs arbitrary objects from attacker-controlled bytes without running a constructor, and runs their readObject methods. A gadget chain turns that into remote code execution.',
            interviewAngle: 'The most important thing in this half of the module. Naming the mechanism — gadget chains through library classes already on the classpath — is what makes it an informed answer rather than a repeated warning.',
            buildsOn: ['externalizable-and-custom-readobject'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>The vulnerability is structural, not a bug that was fixed. <code>ObjectInputStream.readObject()</code> reads a class name from the stream, loads that class, allocates an instance <em>without running a constructor</em>, populates its fields, and then calls its <code>readObject</code> method if it has one.</p><p>An attacker who controls the bytes therefore controls which classes get instantiated and which <code>readObject</code> methods run — chosen from every class on your classpath, including every transitive dependency. A <strong>gadget chain</strong> is a sequence of such classes whose combined side effects reach something dangerous, usually reflection into <code>Runtime.exec</code>. Apache Commons Collections had one; so have many others. Nothing in your own code has to be wrong.</p>'
                },
                {
                    type: 'types',
                    title: 'Why the usual defences do not apply',
                    items: [
                        { name: '"I only deserialise my own classes"', html: '<p>The stream names the class, not you. The check happens after loading unless you install a filter.</p>' },
                        { name: '"The endpoint is internal"', html: '<p>Serialized data reaches you through session replication, caches, message payloads and JMX. Several major incidents involved no public endpoint.</p>' },
                        { name: '"We patched the vulnerable library"', html: '<p>Gadget chains keep being found in new libraries. Patching is a treadmill; removing the mechanism is a fix.</p>' },
                        { name: '"We validate after deserialising"', html: '<p>The code has already run. Validation happens after the payload has executed.</p>' }
                    ]
                },
                {
                    type: 'version',
                    title: 'What the platform has done about it',
                    items: [
                        { version: 'Java 9', state: 'changed', html: '<p><strong>JEP 290.</strong> Deserialisation filters: <code>ObjectInputFilter</code>, plus the <code>jdk.serialFilter</code> property. Allow-list the classes you expect and reject everything else.</p>' },
                        { version: 'Java 17', state: 'changed', html: '<p>Context-specific filter factories (JEP 415), so a filter can be scoped per stream rather than per JVM.</p>' },
                        { version: 'Current', state: 'is', html: '<p>Serialization is described in the JDK\'s own documentation as a mistake that cannot be removed compatibly. Project Amber\'s serialization work is aimed at a replacement rather than a repair.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>If you inherit a system that deserialises untrusted input and cannot remove it today, set an allow-list filter as the immediate mitigation — <code>-Djdk.serialFilter=com.acme.*;java.base/*;!*</code> — and plan the move to a data format. The filter is a stopgap that turns "any class on the classpath" into "these classes", which is the difference between exploitable and hardened.</p>'
                }
            ],
            docs: [
                { title: 'JEP 290: Filter Incoming Serialization Data', url: 'https://openjdk.org/jeps/290', kind: 'spec' },
                { title: 'Serialization Filtering', url: 'https://docs.oracle.com/en/java/javase/21/core/serialization-filtering1.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'java-io-time', questionId: 'why-java-serialization-is-a-hazard' },
                { topicId: 'spring-security', questionId: 'owasp-api-top-ten' }
            ]
        },

        {
            id: 'what-to-use-instead',
            title: 'What to Use Instead',
            importance: 'must-know',
            summary: 'A data format rather than an object format. JSON for readability, Protobuf or Avro for schema and size, and in all three cases the deserialiser builds only the types you told it about.',
            interviewAngle: 'The constructive half. The property that matters is that these formats describe data, so nothing in the payload can name a class — which removes the entire gadget-chain category.',
            buildsOn: ['why-java-serialization-is-a-security-hazard'],
            blocks: [
                {
                    type: 'table',
                    title: 'The alternatives, and what each is for',
                    headers: ['Format', 'Strengths', 'Reach for it when'],
                    rows: [
                        ['JSON (Jackson)', 'Readable, universal, schema optional', 'HTTP APIs, config, anything a person may need to read'],
                        ['Protobuf', 'Compact, schema-first, generated types, explicit evolution rules', 'Service-to-service traffic and gRPC'],
                        ['Avro', 'Schema travels with the data or in a registry; strong evolution rules', 'Kafka topics and analytics pipelines'],
                        ['CBOR / MessagePack', 'Binary JSON, no schema needed', 'A compact payload without a schema pipeline'],
                        ['Java serialization', 'Nothing that outweighs the risk', '<strong>Never for anything crossing a trust boundary</strong>']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Jackson has its own version of this hole and it is off by default.</strong> Enabling <em>default typing</em> — <code>enableDefaultTyping()</code>, or a permissive <code>@JsonTypeInfo</code> — puts the class name back into the payload and re-creates polymorphic deserialisation gadget chains in JSON. If polymorphism is needed, use <code>@JsonSubTypes</code> with an explicit list of permitted subtypes, or a sealed interface, so the set of constructible types is closed and declared in your code.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Two places Java serialization is still lurking in ordinary Spring applications, both worth checking: <strong>HTTP session replication</strong> in a clustered container, and <strong>a Redis cache</strong> configured with <code>JdkSerializationRedisSerializer</code>, which is the default for <code>RedisTemplate</code>. Switching the Redis serializer to a JSON one is a small configuration change, and it also makes cached values readable in <code>redis-cli</code>, which is worth having independently.</p>'
                }
            ],
            docs: [
                { title: 'Protocol Buffers — Overview', url: 'https://protobuf.dev/overview/', kind: 'guide' },
                { title: 'Jackson — Polymorphic Type Handling', url: 'https://github.com/FasterXML/jackson-docs/wiki/JacksonPolymorphicDeserialization', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'java-io-time', questionId: 'serialization-alternatives' },
                { topicId: 'beyond-rest', questionId: 'protobuf-contract-evolution' }
            ]
        }
    ]
};
