/* ==========================================================================
   data/theory/exceptions-and-failure.js — module 10 in the reading path

   Six chapters. The hierarchy is ten minutes; the rest of the module is about
   the decisions — where a boundary goes, what a caller can do about it, and
   why the default rollback rule in Spring is the shape it is.
   ========================================================================== */

const exceptionsAndFailureModule = {
    id: 'exceptions-and-failure',
    trackId: 'java-platform',
    order: 10,
    title: 'Exceptions and Failure Design',
    tagline: 'Checked, unchecked, and what a good exception boundary looks like.',
    estimatedMinutes: 30,
    prerequisites: ['inheritance-and-interfaces'],
    docHub: { title: 'Exceptions — the Java Tutorials', url: 'https://docs.oracle.com/javase/tutorial/essential/exceptions/index.html' },

    chapters: [
        {
            id: 'exception-hierarchy',
            title: 'The Hierarchy, and the Line Through It',
            importance: 'must-know',
            summary: 'One line separates what the compiler forces you to handle from what it does not, and a second separates what you should catch from what you should not.',
            interviewAngle: 'A warm-up question with a sharp follow-up. Drawing the tree is worth nothing on its own; being able to say what belongs on each branch, and what you do when an Error reaches you, is what is actually being checked.',
            buildsOn: [],
            blocks: [
                {
                    type: 'diagram',
                    diagramType: 'flowchart',
                    caption: 'Two lines through one tree: what the compiler checks, and what you should try to handle.',
                    diagramConfig: {
                        title: 'Throwable and its branches',
                        nodes: [
                            { id: 't', label: 'Throwable', kind: 'start' },
                            { id: 'err', label: 'Error — do not catch', kind: 'trap' },
                            { id: 'ex', label: 'Exception', kind: 'step' },
                            { id: 'chk', label: 'Checked — compiler enforced', kind: 'actor' },
                            { id: 'rte', label: 'RuntimeException — unchecked', kind: 'actor' }
                        ],
                        edges: [
                            { from: 't', to: 'err' },
                            { from: 't', to: 'ex' },
                            { from: 'ex', to: 'chk' },
                            { from: 'ex', to: 'rte' }
                        ]
                    }
                },
                {
                    type: 'types',
                    title: 'What lives on each branch',
                    items: [
                        { name: 'Error', html: '<p><code>OutOfMemoryError</code>, <code>StackOverflowError</code>, <code>NoClassDefFoundError</code>, <code>LinkageError</code>. Conditions a normal application is not expected to recover from. Unchecked, and you do not catch them — with one exception, below.</p>' },
                        { name: 'Checked Exception', html: '<p><code>IOException</code>, <code>SQLException</code>, <code>InterruptedException</code>. The compiler requires every caller to catch or declare. Intended for conditions a well-written caller could reasonably recover from.</p>' },
                        { name: 'RuntimeException', html: '<p><code>NullPointerException</code>, <code>IllegalArgumentException</code>, <code>IllegalStateException</code>. Unchecked. Intended for programming errors and for conditions a caller could not sensibly have prevented.</p>' }
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>The one place catching <code>Throwable</code> is defensible is a <strong>top-level boundary</strong>: the run loop of a worker thread, a message-listener wrapper, the outermost handler of a request. There the choice is between logging the failure and losing the thread silently, and a thread that dies without a log line is the worst debugging experience this platform offers. Log it, and then rethrow or shut down deliberately — never swallow it and continue as though nothing happened, because after an <code>OutOfMemoryError</code> nothing that follows can be trusted.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong><code>catch (Exception e)</code> catches <code>InterruptedException</code> too, and swallowing that one has consequences.</strong> Catching it clears the thread\'s interrupt flag, so the cancellation signal is destroyed and every layer above yours believes the thread was never asked to stop. If you catch it and cannot propagate it, restore the flag with <code>Thread.currentThread().interrupt()</code> before moving on. This is one of the most reliable senior-level follow-up questions in the concurrency round.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Give the tree and then the line that shows judgement: <em>"Throwable splits into Error and Exception, and Exception splits into checked and RuntimeException. The useful distinction is not really checked versus unchecked — it is whether the caller can do anything about it. If they cannot, forcing them to write a catch block only produces empty catch blocks."</em></p>'
                }
            ],
            docs: [
                { title: 'Throwable', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Throwable.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'java-language', questionId: 'checked-vs-unchecked' },
                { topicId: 'concurrency', questionId: 'thread-interruption' }
            ]
        },

        {
            id: 'checked-vs-unchecked-debate',
            title: 'The Checked Exception Argument',
            importance: 'must-know',
            summary: 'A design experiment Java is alone in having run, that most of the ecosystem has quietly voted against — and there is a defensible position on both sides.',
            interviewAngle: 'A judgement question wearing a knowledge question\'s clothes. There is no right answer and the interviewer knows it; what is being assessed is whether you have a position, whether you can argue the other side, and whether you know what Spring actually does.',
            buildsOn: ['exception-hierarchy'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'The two positions, fairly',
                    left: 'Checked exceptions earn their place',
                    right: 'Checked exceptions were a mistake',
                    rows: [
                        { aspect: 'Core claim', left: 'Recoverable failure is part of a method\'s contract and belongs in the signature', right: 'It is a contract the compiler enforces at every layer, whether or not that layer can act' },
                        { aspect: 'On a boundary', left: 'A caller of <code>readFile</code> is <em>made</em> to think about the file not being there', right: 'And in practice writes <code>catch (IOException e) { }</code>' },
                        { aspect: 'Through layers', left: 'Declare it and let it travel', left_note: '', right: 'Every intermediate signature changes; adding one failure mode is an API break for the whole call chain' },
                        { aspect: 'With lambdas', left: 'Wrap at the call site', right: 'No functional interface in <code>java.util.function</code> declares one, so a checked exception cannot cross a stream pipeline at all' },
                        { aspect: 'Ecosystem verdict', left: 'The JDK still uses them heavily', right: 'Spring, Kotlin, Scala and most modern Java libraries use unchecked throughout' }
                    ]
                },
                {
                    type: 'prose',
                    html: '<p><strong>Spring made this choice explicitly and it is worth knowing as a fact rather than an opinion.</strong> <code>JdbcTemplate</code> catches the checked <code>SQLException</code> and rethrows it as an unchecked <code>DataAccessException</code>, translating vendor-specific error codes into a portable hierarchy on the way: a unique-constraint violation becomes <code>DuplicateKeyException</code> whichever database produced it. The argument is that a caller almost never recovers from a <code>SQLException</code>, and when it does, it wants to know <em>which kind</em>, which the checked type never told it.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Spring\'s default rollback rule follows this split, and it surprises people.</strong> <code>@Transactional</code> rolls back on <code>RuntimeException</code> and <code>Error</code>, and <strong>commits</strong> on a checked exception. A service that declares <code>throws InsufficientFundsException</code> and throws it after a partial write will commit that write. It is configurable — <code>@Transactional(rollbackFor = ...)</code> — but the default is the one that bites, and it is a favourite interview question. The transactions module covers it in full.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Have a position and concede the other side: <em>"I use unchecked by default, because in a layered service the checked exception ends up declared through five signatures that cannot do anything about it, and the honest failure mode is an empty catch block. I make an exception where the caller genuinely has a decision to make at that boundary. And I know Spring took the same view — <code>JdbcTemplate</code> translates <code>SQLException</code> into an unchecked hierarchy, and I have to remember that its rollback default follows from it."</em></p>'
                }
            ],
            docs: [
                { title: 'Spring — Consistent Exception Hierarchy', url: 'https://docs.spring.io/spring-framework/reference/data-access/dao.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'java-language', questionId: 'checked-vs-unchecked' },
                { topicId: 'transactions', questionId: 'rollback-rules' }
            ]
        },

        {
            id: 'try-with-resources',
            title: 'try-with-resources and Suppressed Exceptions',
            importance: 'must-know',
            summary: 'It closes in reverse order, it closes even when the body throws, and it keeps the exception you care about — which the hand-written version loses.',
            interviewAngle: 'The interesting question is not "what does it do", it is "what did the old finally block get wrong". The answer is that a throw from close() replaced the original failure, and the exception you needed to debug was gone.',
            buildsOn: ['exception-hierarchy'],
            blocks: [
                {
                    type: 'definition',
                    term: 'Suppressed exception',
                    important: true,
                    html: '<p>An exception thrown while cleaning up, that would otherwise have replaced the exception being propagated. <code>try</code>-with-resources attaches it to the primary exception instead, reachable through <code>getSuppressed()</code> and printed by the default stack trace under <em>Suppressed:</em>. The mechanism exists because losing the original failure is worse than losing the cleanup failure.</p>'
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'What the old form lost',
                    code: '// Pre-Java 7. Close throws, and the original exception vanishes.\nInputStream in = null;\ntry {\n    in = Files.newInputStream(path);\n    return parse(in);              // throws ParseException — the real problem\n} finally {\n    if (in != null) {\n        in.close();                // throws IOException — and REPLACES it\n    }\n}\n\n// Java 7 onward. Same closing guarantee, both exceptions kept.\ntry (InputStream in = Files.newInputStream(path)) {\n    return parse(in);\n}',
                    output: {
                        kind: 'trace',
                        lines: [
                            'In the first form the body throws ParseException, and the finally block runs on the way out.',
                            'close() throws IOException from inside finally. A throw from a finally block abandons the exception in flight.',
                            'The caller sees only the IOException. The ParseException that explains what actually went wrong never leaves the method.',
                            'In the second form the ParseException propagates and the IOException is attached to it as a suppressed exception.'
                        ],
                        explain: '<p>Both exceptions are real and only one of them is useful. <code>try</code>-with-resources makes the useful one the primary, every time, without the author having to think about it — which is the mark of a good language feature.</p>'
                    }
                },
                {
                    type: 'types',
                    title: 'The rules worth remembering',
                    items: [
                        { name: 'Reverse order', html: '<p>Multiple resources in one <code>try</code> are closed last-declared-first, which is what you want when the second was opened from the first.</p>' },
                        { name: 'Closed before catch and finally', html: '<p>Resources are closed before any <code>catch</code> or <code>finally</code> attached to the same <code>try</code> runs — so a <code>catch</code> block cannot use a resource, and does not have to worry about closing it.</p>' },
                        { name: 'AutoCloseable, not Closeable', html: '<p><code>AutoCloseable.close()</code> may throw any <code>Exception</code>; <code>Closeable</code> narrows it to <code>IOException</code>. Implement the narrower one where it fits.</p>' },
                        { name: 'Effectively final resources, Java 9', html: '<p><code>try (existingResource) { ... }</code> is legal if the variable is effectively final, so a resource created earlier does not have to be re-declared.</p>' },
                        { name: 'null is fine', html: '<p>A <code>null</code> resource is skipped rather than causing a <code>NullPointerException</code> at closing time.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A resource you did not open is not yours to close.</strong> Wrapping an injected <code>DataSource</code>\'s connection, or a servlet\'s response stream, in a <code>try</code>-with-resources closes something the container is still managing. The rule is ownership: the code that opened it closes it. In Spring this is usually neither — <code>JdbcTemplate</code>, the entity manager and the servlet container all own their own resources, which is most of what those abstractions are for.</p>'
                }
            ],
            docs: [
                { title: 'The try-with-resources Statement', url: 'https://docs.oracle.com/javase/tutorial/essential/exceptions/tryResourceClose.html', kind: 'guide' },
                { title: 'Throwable.getSuppressed', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Throwable.html#getSuppressed()', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'java-language', questionId: 'try-with-resources-and-suppressed' }
            ]
        },

        {
            id: 'finally-and-return',
            title: 'What finally Does to a return',
            importance: 'good-to-know',
            summary: 'A return in a finally block discards whatever the method was already returning, and any exception it was already throwing.',
            interviewAngle: 'A predict-the-output favourite, and the reason it is asked is not the trivia. It is that the answer tells you the rule — a finally block that completes abruptly abandons whatever was in flight — and that rule is what makes the swallowed-exception bug possible.',
            buildsOn: ['try-with-resources'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Three variations, three surprises',
                    code: 'int a() {\n    try { return 1; }\n    finally { return 2; }          // returns 2\n}\n\nint b() {\n    int x = 1;\n    try { return x; }\n    finally { x = 2; }             // returns 1\n}\n\nint c() {\n    try { throw new IllegalStateException(); }\n    finally { return 3; }          // returns 3, and the exception is GONE\n}',
                    output: {
                        kind: 'trace',
                        lines: [
                            'a(): the try block prepares to return 1, then finally completes abruptly with its own return. The pending return is discarded and the method returns 2.',
                            'b(): the return VALUE is computed before finally runs — x is read as 1 and that value is held. Assigning x = 2 afterwards changes the variable, not the value already captured. Returns 1.',
                            'c(): the method is propagating an IllegalStateException when finally returns 3. The abrupt completion abandons the exception entirely. The caller sees 3 and never learns anything failed.'
                        ],
                        explain: '<p>One rule explains all three: <strong>if a <code>finally</code> block completes abruptly — by <code>return</code>, <code>break</code>, <code>continue</code> or <code>throw</code> — that outcome replaces whatever the <code>try</code> was doing.</strong> Case <code>c</code> is the one that matters in production, and it is why every static analyser flags a <code>return</code> inside <code>finally</code>.</p>'
                    }
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Never put a <code>return</code> or a <code>throw</code> in a <code>finally</code> block.</strong> The failure mode is an exception that disappears between the place it was thrown and the place someone is trying to debug — no log line, no stack trace, a method that appears to have succeeded. Use <code>try</code>-with-resources for cleanup and keep <code>finally</code> for side effects that cannot complete abruptly.</p>'
                }
            ],
            docs: [
                { title: 'JLS 14.20.2 — Execution of try-finally', url: 'https://docs.oracle.com/javase/specs/jls/se21/html/jls-14.html#jls-14.20.2', kind: 'spec' }
            ],
            relatedQuestions: [
                { topicId: 'java-language', questionId: 'finally-swallows-return' }
            ]
        },

        {
            id: 'exception-translation',
            title: 'Translating at a Boundary',
            importance: 'must-know',
            summary: 'A layer should throw exceptions in its own vocabulary — and should never do so without carrying the cause.',
            interviewAngle: 'Reached through "how do you structure error handling in a service". The strong answer names the boundary, names the vocabulary on each side, and mentions preserving the cause without being asked, because losing the cause is the mistake this pattern is most often implemented with.',
            buildsOn: ['checked-vs-unchecked-debate'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>A repository that throws <code>SQLException</code> has leaked the fact that it uses SQL into every caller. A service that throws <code>FeignException</code> has leaked its HTTP client into its own API. <strong>Exception translation</strong> is catching a lower layer\'s failure and rethrowing it in terms the current layer\'s callers already understand — and it is the same idea as a DTO at an API boundary, applied to the failure path.</p>'
                },
                {
                    type: 'definition',
                    term: 'Exception translation',
                    important: true,
                    html: '<p>Catching an exception from a lower layer and rethrowing a higher-level one that describes the failure in the current layer\'s vocabulary, <strong>passing the original as the cause</strong>. Without the cause it is not translation, it is deletion: the stack trace that names the actual line stops at the boundary.</p>'
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The right shape, and two wrong ones',
                    code: '// WRONG — the cause is thrown away. The stack trace now stops\n// at this line and the real failure is unrecoverable.\ncatch (SQLException e) {\n    throw new OrderLookupException("could not load order " + id);\n}\n\n// WRONG — log and rethrow. The same failure is now logged twice,\n// once here and once wherever it is finally handled, and the two\n// entries look like two incidents.\ncatch (SQLException e) {\n    log.error("could not load order {}", id, e);\n    throw new OrderLookupException("could not load order " + id, e);\n}\n\n// RIGHT — translate, carry the cause, do not log. Whoever handles\n// it decides whether it is worth a log line.\ncatch (SQLException e) {\n    throw new OrderLookupException("could not load order " + id, e);\n}',
                    notes: '<p><em>Log or throw, never both.</em> An exception that is logged at every layer it passes through produces one incident and five stack traces, and the on-call engineer counting alerts cannot tell how many things actually broke. The layer that decides what to do about the failure is the layer that logs it.</p>'
                },
                {
                    type: 'prose',
                    html: '<p>Spring does this for you in two places worth naming in an interview. <code>@Repository</code> enables <code>PersistenceExceptionTranslationPostProcessor</code>, which converts persistence-provider exceptions into Spring\'s <code>DataAccessException</code> hierarchy; and <code>@ControllerAdvice</code> is where the last translation happens, from domain exception to HTTP status and a <code>ProblemDetail</code> body. Those two boundaries — persistence in, HTTP out — are where translation earns its keep, and the layers in between should mostly let exceptions travel.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Describe it as two boundaries and a rule: <em>"I translate at the edges — persistence exceptions into domain exceptions in the repository, domain exceptions into a ProblemDetail in a ControllerAdvice — and let them travel unchanged in between. Always with the cause attached, and I log at exactly one place, wherever the decision about the failure is made."</em></p>'
                }
            ],
            docs: [
                { title: 'Spring — Exception Translation', url: 'https://docs.spring.io/spring-framework/reference/data-access/orm.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'java-language', questionId: 'exception-translation-and-wrapping' },
                { topicId: 'rest-api', questionId: 'exception-to-status-mapping' }
            ]
        },

        {
            id: 'custom-exception-design',
            title: 'Designing an Exception Worth Throwing',
            importance: 'should-know',
            summary: 'Carry structured data rather than a formatted sentence, and create far fewer types than you first want to.',
            interviewAngle: 'Comes up inside machine-coding and review rounds rather than as a question. An error hierarchy with one class per failure and nothing but a message string is a common and visible weakness; a small hierarchy carrying fields that the API layer can map is a clear signal.',
            buildsOn: ['exception-translation'],
            blocks: [
                {
                    type: 'types',
                    title: 'What a good one has',
                    items: [
                        { name: 'Unchecked, by default', html: '<p>Extend <code>RuntimeException</code> unless the caller genuinely has a decision to make. See the debate chapter — this is the position, not a law.</p>' },
                        { name: 'Fields, not just a message', html: '<p><code>OrderNotFoundException(orderId)</code> with an accessible <code>orderId</code> lets the <code>@ControllerAdvice</code> build a structured error body. A pre-formatted sentence forces the API layer to parse English.</p>' },
                        { name: 'A cause parameter', html: '<p>Every constructor that could be used at a translation boundary takes a <code>Throwable</code> cause and passes it to <code>super</code>.</p>' },
                        { name: 'Few types', html: '<p>One per <em>caller decision</em>, not one per failure. If the API layer maps <code>OrderNotFound</code>, <code>CustomerNotFound</code> and <code>ProductNotFound</code> to the same 404 with the same body shape, they are one exception with a field.</p>' },
                        { name: 'A stable code, if the API exposes one', html: '<p>An enum or string the client can branch on, since clients cannot branch on a message and will regret branching on a status code alone.</p>' }
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'A small hierarchy that the web layer can map',
                    code: '// One root, so a ControllerAdvice has one thing to catch.\npublic abstract class DomainException extends RuntimeException {\n    private final ErrorCode code;\n\n    protected DomainException(ErrorCode code, String message, Throwable cause) {\n        super(message, cause);\n        this.code = code;\n    }\n\n    public ErrorCode code() { return code; }\n}\n\n// One per caller decision, carrying the data the client needs.\npublic class ResourceNotFoundException extends DomainException {\n    private final String resource;\n    private final Object id;\n\n    public ResourceNotFoundException(String resource, Object id) {\n        super(ErrorCode.NOT_FOUND, resource + " " + id + " not found", null);\n        this.resource = resource;\n        this.id = id;\n    }\n\n    public String resource() { return resource; }\n    public Object id()       { return id; }\n}',
                    notes: '<p>Three not-found exceptions collapsed into one with a <code>resource</code> field, because the web layer treats them identically. If a caller ever needs to distinguish them, the field is already there and no new type is required — which is the test for whether a separate class was ever warranted.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Do not use exceptions for control flow you expect.</strong> A cache miss, a validation failure over a list of inputs, an optional lookup — these are results, not failures, and belong in the return type as an <code>Optional</code> or a result object. Filling the stack trace is the expensive part of an exception, and a "not found" thrown on a hot path measurably costs. Overriding <code>fillInStackTrace</code> to make that cheap is a real technique and a strong signal that the exception should have been a return value.</p>'
                }
            ],
            docs: [
                { title: 'RuntimeException', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/RuntimeException.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'rest-api', questionId: 'controlleradvice-and-problemdetail' },
                { topicId: 'java-language', questionId: 'optional-in-a-field-or-parameter' }
            ]
        }
    ]
};
