/* ==========================================================================
   data/theory/sets/predict-io-and-time.js — Predict, set 5 of 11

   Eight puzzles about serialization, identity and time. Part 7 marks this set
   `artefact: stdout`, and seven of the eight are: complete single-file Java
   programs whose output run-snippets.js will re-execute and diff.

   THE EIGHTH IS NOT, AND THE EXCEPTION IS THE POINT. A serialVersionUID
   mismatch cannot happen inside one file — it needs bytes written by one
   version of a class and read by another, which is two compilations. Part 9
   says plainly that a snippet the toolchain cannot run does not get to claim
   stdout, so that puzzle declares `behaviour` with a verification string and
   a trace. Declaring the set stdout and then quietly writing an eighth that
   nothing re-runs is exactly the fabricated-console-frame failure the rule
   was written to prevent.

   EVERY TIME PUZZLE NAMES ITS ZONE EXPLICITLY and uses a date in the past.
   A program whose answer depends on the machine's default zone, or on next
   year's tzdata, is a program whose answer the runner cannot diff — the same
   rule that keeps hash iteration order out of the collections set.
   ========================================================================== */

const predictIoAndTimeModule = {
    id: 'predict-io-and-time',
    trackId: 'output',
    order: 955,
    title: 'I/O, Serialization and Time',
    tagline: 'Bytes that outlive the class that wrote them, and dates that are not durations.',
    estimatedMinutes: 25,
    prerequisites: [],
    docHub: {
        title: 'java.time — package summary',
        url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/time/package-summary.html'
    },

    chapters: [
        {
            id: 'serialization-hazards',
            title: 'What Survives the Round Trip',
            importance: 'must-know',
            summary: 'Three things Java serialization does that people do not expect, and one it refuses to do at all.',
            interviewAngle: 'Serialization is asked about because it is the classic remote-code-execution vector and because almost every long-lived system has been burned by a compatibility break.',
            buildsOn: [],
            blocks: [
                {
                    type: 'predict',
                    id: 'predict-io-and-time-transient-field-after-round-trip',
                    importance: 'must-know',
                    artefact: 'stdout',
                    language: 'java',
                    title: 'Transient, and what fills the hole',
                    prompt: '<p>Two fields go out and two come back. What are they?</p>',
                    code: 'import java.io.*;\n\npublic class Main {\n    static class Session implements Serializable {\n        int id = 7;\n        transient String token = "abc";\n        transient int attempts = 3;\n    }\n\n    public static void main(String[] args) throws Exception {\n        var out = new ByteArrayOutputStream();\n        try (var o = new ObjectOutputStream(out)) { o.writeObject(new Session()); }\n\n        try (var i = new ObjectInputStream(new ByteArrayInputStream(out.toByteArray()))) {\n            Session s = (Session) i.readObject();\n            System.out.println(s.id);\n            System.out.println(s.token);\n            System.out.println(s.attempts);\n        }\n    }\n}',
                    options: ['7\\nnull\\n0', '7\\nabc\\n3', '7\\nnull\\n3', '0\\nnull\\n0'],
                    answer: 0,
                    output: {
                        kind: 'stdout',
                        lines: ['7', 'null', '0'],
                        explain: '<p>A transient field is not written, and on the way back in it is not initialised either — <strong>the field initialisers and the constructor do not run</strong>. Deserialization allocates the object and fills the non-transient fields from the stream; everything else is left at the JVM default. That is why <code>token</code> is <code>null</code> rather than <code>"abc"</code> and <code>attempts</code> is <code>0</code> rather than <code>3</code>. Any invariant your constructor establishes is not established here, which is the root of most serialization security advice.</p>'
                    }
                },
                {
                    type: 'predict',
                    id: 'predict-io-and-time-serialversionuid-mismatch-throws',
                    importance: 'must-know',
                    artefact: 'behaviour',
                    language: 'java',
                    title: 'A field added between two deploys',
                    prompt: '<p>Version 1 of this class is serialised into a cache. Version 2 — one extra field, nothing else changed — is deployed and reads it back. What happens?</p>',
                    code: '// --- deployed on Monday, writes into the cache -----------------\nclass Customer implements Serializable {\n    private String name;\n    private String city;\n}\n\n// --- deployed on Tuesday, reads what Monday wrote --------------\nclass Customer implements Serializable {\n    private String name;\n    private String city;\n    private String country;      // the only change\n}',
                    options: [
                        'InvalidClassException: local class incompatible',
                        'It reads fine and country is null',
                        'It reads fine and country holds garbage',
                        'ClassNotFoundException'
                    ],
                    answer: 0,
                    verification: 'Read from the Java Object Serialization Specification, section 5.6 (Type Changes Affecting Serialization) and the javadoc of java.io.Serializable. Not executed here: reproducing it needs two compilations of the same class name, which a single-file runner cannot do.',
                    output: {
                        kind: 'trace',
                        lines: [
                            'java.io.InvalidClassException: Customer; local class incompatible:',
                            '    stream classdesc serialVersionUID = -4382415712341234567,',
                            '    local class serialVersionUID = 8123456712349876543'
                        ],
                        explain: '<p>Neither version declared <code>serialVersionUID</code>, so the JVM computed one from the class shape — name, modifiers, interfaces, fields, methods. Adding a field changes the shape and therefore changes the computed value, and the two no longer match. <strong>Declaring <code>private static final long serialVersionUID = 1L</code> makes the two versions compatible</strong>, and then adding a field is fine: the old bytes have nothing for <code>country</code>, so it deserialises as <code>null</code>. The lesson is not "add the field" — it is that the default is to break, and a class that goes into a cache, a session store or a queue must pin its UID on day one.</p>'
                    }
                },
                {
                    type: 'predict',
                    id: 'predict-io-and-time-enum-ordinal-after-a-reorder',
                    importance: 'should-know',
                    artefact: 'stdout',
                    language: 'java',
                    title: 'An ordinal written down',
                    prompt: '<p>A status was stored as its ordinal last year. This year somebody inserted a constant. What comes back?</p>',
                    code: 'public class Main {\n    // last year\n    enum StatusV1 { NEW, SHIPPED, DELIVERED }\n    // this year: CONFIRMED inserted in the middle\n    enum StatusV2 { NEW, CONFIRMED, SHIPPED, DELIVERED }\n\n    public static void main(String[] args) {\n        int stored = StatusV1.SHIPPED.ordinal();   // written to the database\n        System.out.println(stored);\n        System.out.println(StatusV2.values()[stored]);\n\n        int byName = StatusV2.valueOf(StatusV1.SHIPPED.name()).ordinal();\n        System.out.println(byName);\n    }\n}',
                    options: ['1\\nCONFIRMED\\n2', '1\\nSHIPPED\\n1', '2\\nSHIPPED\\n2', '1\\nCONFIRMED\\n1'],
                    answer: 0,
                    output: {
                        kind: 'stdout',
                        lines: ['1', 'CONFIRMED', '2'],
                        explain: '<p>The ordinal is a position, not an identity. <code>SHIPPED</code> was 1 and is now 2, so every stored 1 silently became <code>CONFIRMED</code> — no exception, no warning, just wrong data across the whole table. <strong>Persist the name, never the ordinal</strong>: <code>@Enumerated(EnumType.STRING)</code> in JPA, and <code>name()</code>/<code>valueOf</code> everywhere else. The third line shows the fix working — a lookup by name survives the reorder, and it fails loudly with <code>IllegalArgumentException</code> if the constant is genuinely gone, which is the failure you want.</p>'
                    }
                }
            ],
            docs: [
                { title: 'Java Object Serialization Specification', url: 'https://docs.oracle.com/en/java/javase/21/docs/specs/serialization/index.html', kind: 'spec' }
            ],
            relatedQuestions: []
        },

        {
            id: 'identity-and-references',
            title: 'Identity and Hidden References',
            importance: 'should-know',
            summary: 'Two strings that are the same string, and an object holding one you did not ask it to hold.',
            interviewAngle: 'The intern question is asked to see whether you know where the constant pool lives. The inner-class question is asked because it is a real memory leak in real code.',
            buildsOn: ['serialization-hazards'],
            blocks: [
                {
                    type: 'predict',
                    id: 'predict-io-and-time-string-intern-identity',
                    importance: 'should-know',
                    artefact: 'stdout',
                    language: 'java',
                    title: 'Four strings and three answers',
                    prompt: '<p>Which of these are the same object?</p>',
                    code: 'public class Main {\n    public static void main(String[] args) {\n        String a = "hello";\n        String b = "hel" + "lo";              // both halves are constants\n        String c = new String("hello");\n        String part = "hel";\n        String d = part + "lo";               // one half is a variable\n\n        System.out.println(a == b);\n        System.out.println(a == c);\n        System.out.println(a == d);\n        System.out.println(a == d.intern());\n    }\n}',
                    options: ['true\\nfalse\\nfalse\\ntrue', 'true\\ntrue\\ntrue\\ntrue', 'true\\nfalse\\ntrue\\ntrue', 'false\\nfalse\\nfalse\\ntrue'],
                    answer: 0,
                    output: {
                        kind: 'stdout',
                        lines: ['true', 'false', 'false', 'true'],
                        explain: '<p><code>b</code> is folded at compile time — both operands are compile-time constants, so the compiler emits the literal <code>"hello"</code> and it is the same pooled instance as <code>a</code>. <code>c</code> is an explicit <code>new</code>, which is a fresh object by definition; that is the entire reason <code>new String("x")</code> is a code smell. <code>d</code> is built at run time by a concatenation the compiler cannot fold, so it is a new instance too. <code>intern()</code> returns the pooled instance, which is <code>a</code>. <strong>None of this is a reason to use <code>==</code> on strings</strong> — it is a reason to understand why the one time it appeared to work was luck.</p>'
                    }
                },
                {
                    type: 'predict',
                    id: 'predict-io-and-time-inner-class-holds-the-outer-instance',
                    importance: 'must-know',
                    artefact: 'stdout',
                    language: 'java',
                    title: 'What the inner class is carrying',
                    prompt: '<p>Both classes have one declared field in the source. How many does each have at run time?</p>',
                    code: 'public class Main {\n    static class Outer {\n        byte[] big = new byte[1024];\n\n        class Inner       { int x = 1; }          // not static\n        static class Nested { int x = 1; }        // static\n    }\n\n    public static void main(String[] args) {\n        for (var f : Outer.Inner.class.getDeclaredFields()) {\n            System.out.println(f.getName() + " : " + f.getType().getSimpleName());\n        }\n        for (var f : Outer.Nested.class.getDeclaredFields()) {\n            System.out.println(f.getName() + " : " + f.getType().getSimpleName());\n        }\n    }\n}',
                    options: [
                        'x : int\\nthis$1 : Outer\\nx : int',
                        'x : int\\nx : int',
                        'x : int\\nouter : Outer\\nx : int\\nouter : Outer',
                        'this$1 : Outer\\nx : int\\nthis$1 : Outer\\nx : int'
                    ],
                    answer: 0,
                    output: {
                        kind: 'stdout',
                        lines: ['x : int', 'this$1 : Outer', 'x : int'],
                        explain: '<p>A non-static inner class carries a synthetic reference to the instance that created it — the compiler-generated <code>this$1</code>. So one <code>Inner</code>, however small, keeps its whole <code>Outer</code> alive, including the kilobyte array. Cache a million of them and you have cached a million <code>Outer</code>s. The static nested class has no such field, which is why <strong>the default should be <code>static</code> and the non-static form should be a decision you can defend</strong>. The same synthetic capture is what makes a non-static inner <code>Runnable</code> submitted to a long-lived executor a classic leak.</p>'
                    }
                }
            ],
            docs: [
                { title: 'String.intern() — javadoc', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/String.html#intern()', kind: 'api' }
            ],
            relatedQuestions: []
        },

        {
            id: 'time-that-is-not-a-number',
            title: 'Time That Is Not a Number',
            importance: 'must-know',
            summary: 'An instant, a local date and the two kinds of elapsed time that disagree once a year.',
            interviewAngle: 'The Duration-versus-Period question is the one that separates people who have handled a DST bug from people who have not. Both answers are right; they answer different questions.',
            buildsOn: [],
            blocks: [
                {
                    type: 'predict',
                    id: 'predict-io-and-time-localdate-vs-instant-across-a-zone',
                    importance: 'must-know',
                    artefact: 'stdout',
                    language: 'java',
                    title: 'One moment, two dates',
                    prompt: '<p>The same instant, read in two zones.</p>',
                    code: 'import java.time.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        // 2026-03-01T20:30:00Z -- a fixed moment, no default zone anywhere\n        Instant moment = Instant.parse("2026-03-01T20:30:00Z");\n\n        ZonedDateTime kolkata = moment.atZone(ZoneId.of("Asia/Kolkata"));\n        ZonedDateTime newYork = moment.atZone(ZoneId.of("America/New_York"));\n\n        System.out.println(kolkata.toLocalDate());\n        System.out.println(newYork.toLocalDate());\n        System.out.println(kolkata.toInstant().equals(newYork.toInstant()));\n    }\n}',
                    options: ['2026-03-02\\n2026-03-01\\ntrue', '2026-03-01\\n2026-03-01\\ntrue', '2026-03-02\\n2026-03-02\\ntrue', '2026-03-02\\n2026-03-01\\nfalse'],
                    answer: 0,
                    output: {
                        kind: 'stdout',
                        lines: ['2026-03-02', '2026-03-01', 'true'],
                        explain: '<p>20:30 UTC is 02:00 the next day in Kolkata (+05:30) and 15:30 the same day in New York (−05:00). One instant, two calendar dates, and both are correct. This is why <strong>a "daily report" has no meaning until somebody names the zone</strong>, and why storing a <code>LocalDate</code> for something that happened at a moment loses information you cannot get back. The third line is the invariant: the instant never moved, only the calendar you read it against.</p>'
                    }
                },
                {
                    type: 'predict',
                    id: 'predict-io-and-time-duration-vs-period-across-dst',
                    importance: 'must-know',
                    artefact: 'stdout',
                    language: 'java',
                    title: 'A day is not always 24 hours',
                    prompt: '<p>New York moved to daylight saving at 02:00 on 2021-03-14. Adding "one day" two ways:</p>',
                    code: 'import java.time.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        ZoneId ny = ZoneId.of("America/New_York");\n        ZonedDateTime before = ZonedDateTime.of(2021, 3, 13, 12, 0, 0, 0, ny);\n\n        ZonedDateTime plusDay   = before.plus(Period.ofDays(1));\n        ZonedDateTime plusHours = before.plus(Duration.ofHours(24));\n\n        System.out.println(plusDay.toLocalTime());\n        System.out.println(plusHours.toLocalTime());\n        System.out.println(Duration.between(before, plusDay).toHours());\n    }\n}',
                    options: ['12:00\\n13:00\\n23', '12:00\\n12:00\\n24', '13:00\\n12:00\\n24', '12:00\\n13:00\\n24'],
                    answer: 0,
                    output: {
                        kind: 'stdout',
                        lines: ['12:00', '13:00', '23'],
                        explain: '<p><code>Period.ofDays(1)</code> is <em>calendar</em> arithmetic: same wall-clock time, next day, so noon stays noon — and because that Sunday lost an hour, only 23 hours of real time passed. <code>Duration.ofHours(24)</code> is <em>elapsed</em> time on the timeline: exactly 24 hours later, which lands at 13:00 local. <strong>Neither is a bug and neither is a substitute for the other.</strong> "The reminder fires tomorrow at noon" is a Period; "the token expires 24 hours from now" is a Duration, and using one where the other belongs produces a defect that appears twice a year.</p>'
                    }
                },
                {
                    type: 'predict',
                    id: 'predict-io-and-time-try-with-resources-close-order',
                    importance: 'should-know',
                    artefact: 'stdout',
                    language: 'java',
                    title: 'Closing order, and the exception that nearly disappears',
                    prompt: '<p>Two resources, one of which fails on close, and a body that throws.</p>',
                    code: 'public class Main {\n    record Res(String name) implements AutoCloseable {\n        public void close() {\n            System.out.println("close " + name);\n            if (name.equals("A")) throw new IllegalStateException("close A failed");\n        }\n    }\n\n    public static void main(String[] args) {\n        try (var a = new Res("A"); var b = new Res("B")) {\n            throw new RuntimeException("body failed");\n        } catch (Exception e) {\n            System.out.println("caught " + e.getMessage());\n            for (Throwable s : e.getSuppressed()) {\n                System.out.println("suppressed " + s.getMessage());\n            }\n        }\n    }\n}',
                    options: [
                        'close B\\nclose A\\ncaught body failed\\nsuppressed close A failed',
                        'close A\\nclose B\\ncaught body failed\\nsuppressed close A failed',
                        'close B\\nclose A\\ncaught close A failed\\nsuppressed body failed',
                        'close B\\nclose A\\ncaught body failed'
                    ],
                    answer: 0,
                    output: {
                        kind: 'stdout',
                        lines: ['close B', 'close A', 'caught body failed', 'suppressed close A failed'],
                        explain: '<p>Resources close in <strong>reverse order of declaration</strong>, which is the only order that can be right when the second was built from the first. The exception from the body wins and the one from <code>close</code> is attached to it as suppressed — the opposite of the pre-Java-7 <code>finally</code> idiom, where the close exception replaced the real one and the actual cause was lost. Suppressed exceptions do print in a normal stack trace, but code that catches and logs <code>e.getMessage()</code> alone throws away the second half of the story.</p>'
                    }
                }
            ],
            docs: [
                { title: 'Duration and Period — javadoc', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/time/Period.html', kind: 'api' }
            ],
            relatedQuestions: []
        }
    ]
};
