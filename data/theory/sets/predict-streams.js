/* ==========================================================================
   data/theory/sets/predict-streams.js — Predict, set 3 of 11

   Seven puzzles, all artefact: 'stdout'. The two that would ordinarily be
   non-deterministic — anything involving a parallel stream — are constructed
   so that the ANSWER is deterministic even though the execution is not:
   findAny is asked about as a set of possible results, and the shared-mutable
   one prints whether the count was wrong rather than what the wrong count was.
   A puzzle whose printed answer varies between runs is a puzzle the runner
   cannot verify, and this deck does not print one.
   ========================================================================== */

const predictStreamsModule = {
    id: 'predict-streams',
    trackId: 'output',
    order: 953,
    title: 'Streams and Optional',
    tagline: 'Laziness, single use, and the collector that throws.',
    estimatedMinutes: 20,
    prerequisites: [],
    docHub: {
        title: 'java.util.stream — package summary',
        url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/stream/package-summary.html'
    },

    chapters: [
        {
            id: 'laziness-and-single-use',
            title: 'Laziness and Single Use',
            importance: 'must-know',
            summary: 'A pipeline with no terminal operation does nothing at all, and a pipeline that has run cannot run again.',
            interviewAngle: 'The peek puzzle is the cleanest possible demonstration of laziness, and it is why peek is a debugging tool rather than a side-effect hook.',
            buildsOn: [],
            blocks: [
                {
                    type: 'predict',
                    id: 'predict-streams-peek-without-terminal-operation',
                    importance: 'must-know',
                    artefact: 'stdout',
                    language: 'java',
                    title: 'A peek that never runs',
                    prompt: '<p>Two pipelines. One has a terminal operation.</p>',
                    code: 'import java.util.*;\nimport java.util.stream.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        List<String> in = List.of("a", "b", "c");\n\n        in.stream().peek(s -> System.out.print("A" + s));\n        System.out.println("|");\n\n        in.stream().peek(s -> System.out.print("B" + s)).forEach(s -> { });\n        System.out.println("|");\n\n        in.stream().filter(s -> !s.equals("z"))\n                   .peek(s -> System.out.print("C" + s))\n                   .findFirst();\n        System.out.println("|");\n    }\n}',
                    options: ['|\\nBaBbBc|\\nCa|', 'AaAbAc|\\nBaBbBc|\\nCaCbCc|', '|\\n|\\nCa|', '|\\nBaBbBc|\\nCaCbCc|'],
                    answer: 0,
                    output: {
                        kind: 'stdout',
                        lines: ['|', 'BaBbBc|', 'Ca|'],
                        explain: '<p>The first pipeline has no terminal operation, so nothing is ever pulled through it — a stream is entirely lazy and an intermediate operation is a description rather than a call. The second has one, so every element flows. The third short-circuits: <code>findFirst</code> pulls one element and stops. <strong><code>peek</code> is for looking, never for doing.</strong></p><p>A fourth case is deliberately not asserted here. Since Java 9 <code>count()</code> is permitted to skip the pipeline entirely when it can compute the size from the source, so <code>list.stream().peek(...).count()</code> may print nothing at all — the <code>count()</code> javadoc uses exactly that example. It is <em>permitted</em> rather than required, which makes it a fact about an implementation and not something this deck will claim as an output.</p>'
                    }
                },
                {
                    type: 'predict',
                    id: 'predict-streams-stream-reused-throws',
                    importance: 'must-know',
                    artefact: 'stdout',
                    language: 'java',
                    title: 'The second terminal operation',
                    prompt: '<p>One stream, two terminal operations.</p>',
                    code: 'import java.util.*;\nimport java.util.stream.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Stream<String> s = List.of("a", "b").stream();\n        System.out.println(s.count());\n        try {\n            System.out.println(s.count());\n        } catch (Exception e) {\n            System.out.println(e.getClass().getSimpleName());\n        }\n    }\n}',
                    options: ['2\\nIllegalStateException', '2\\n2', '2\\n0', '2\\nUnsupportedOperationException'],
                    answer: 0,
                    output: {
                        kind: 'stdout',
                        lines: ['2', 'IllegalStateException'],
                        explain: '<p>A stream is consumed by its terminal operation and cannot be reused — "stream has already been operated upon or closed". This is why a method should return a <code>List</code> rather than a <code>Stream</code> unless the caller is expected to own the traversal, and why storing a stream in a field is almost always a mistake. A <code>Supplier&lt;Stream&lt;T&gt;&gt;</code> is the way to hand out a re-runnable pipeline.</p>'
                    }
                }
            ],
            docs: [{ title: 'Stream — javadoc', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/stream/Stream.html', kind: 'api' }],
            relatedQuestions: []
        },

        {
            id: 'collectors-and-optional',
            title: 'Collectors and Optional',
            importance: 'must-know',
            summary: 'The collector that throws on a duplicate key, and the Optional method that evaluates its argument whether or not it needs it.',
            interviewAngle: 'orElse versus orElseGet is a two-line difference with a real cost behind it, and toMap throwing on duplicates surprises people in production rather than in interviews.',
            buildsOn: ['laziness-and-single-use'],
            blocks: [
                {
                    type: 'predict',
                    id: 'predict-streams-collectors-tomap-duplicate-key',
                    importance: 'must-know',
                    artefact: 'stdout',
                    language: 'java',
                    title: 'Two entries with the same key',
                    prompt: '<p>Two names of the same length, collected by length.</p>',
                    code: 'import java.util.*;\nimport java.util.stream.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        List<String> names = List.of("ann", "bob", "carol");\n        try {\n            Map<Integer, String> byLength = names.stream()\n                    .collect(Collectors.toMap(String::length, s -> s));\n            System.out.println(byLength.size());\n        } catch (Exception e) {\n            System.out.println(e.getClass().getSimpleName());\n        }\n\n        Map<Integer, String> merged = names.stream()\n                .collect(Collectors.toMap(String::length, s -> s, (a, b) -> a));\n        System.out.println(merged.get(3) + " " + merged.size());\n    }\n}',
                    options: ['IllegalStateException\\nann 2', '2\\nann 2', 'IllegalStateException\\nbob 2', '3\\nann 2'],
                    answer: 0,
                    output: {
                        kind: 'stdout',
                        lines: ['IllegalStateException', 'ann 2'],
                        explain: '<p><code>Collectors.toMap</code> without a merge function throws on the first duplicate key — "Duplicate key 3". This is a deliberate choice: silently keeping one of two values is a data loss nobody notices. The three-argument form makes the decision explicit, and <code>(a, b) -&gt; a</code> keeps the first. <code>groupingBy</code> is the other answer, when you wanted all of them.</p>'
                    }
                },
                {
                    type: 'predict',
                    id: 'predict-streams-optional-orelse-evaluates-eagerly',
                    importance: 'must-know',
                    artefact: 'stdout',
                    language: 'java',
                    title: 'orElse against orElseGet',
                    prompt: '<p>The Optional is present in both cases.</p>',
                    code: 'import java.util.*;\n\npublic class Main {\n    static String expensive() {\n        System.out.print("computed ");\n        return "fallback";\n    }\n    public static void main(String[] args) {\n        Optional<String> present = Optional.of("value");\n        System.out.println(present.orElse(expensive()));\n        System.out.println(present.orElseGet(Main::expensive));\n    }\n}',
                    options: ['computed value\\nvalue', 'value\\nvalue', 'computed value\\ncomputed value', 'value\\ncomputed value'],
                    answer: 0,
                    output: {
                        kind: 'stdout',
                        lines: ['computed value', 'value'],
                        explain: '<p><code>orElse</code> takes a VALUE, so its argument is evaluated before the call — always, present or not. <code>orElseGet</code> takes a supplier and calls it only on the empty path. When the fallback is a constant the two are identical; when it is a database read, a default object allocation or anything with a side effect, <code>orElse</code> does the work every time and throws it away.</p>'
                    }
                }
            ],
            docs: [
                { title: 'Collectors.toMap — javadoc', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/stream/Collectors.html#toMap(java.util.function.Function,java.util.function.Function)', kind: 'api' },
                { title: 'Optional — javadoc', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Optional.html', kind: 'api' }
            ],
            relatedQuestions: [{ topicId: 'java-language', questionId: 'optional-in-a-field-or-parameter' }]
        },

        {
            id: 'ordering-and-parallel',
            title: 'Ordering and Parallel',
            importance: 'should-know',
            summary: 'What a parallel stream preserves, what it does not, and the one thing it will not protect you from.',
            interviewAngle: 'The useful answer is that encounter order survives parallelism and that shared mutable state does not — and that the second failure is silent.',
            buildsOn: ['collectors-and-optional'],
            blocks: [
                {
                    type: 'predict',
                    id: 'predict-streams-flatmap-ordering',
                    importance: 'should-know',
                    artefact: 'stdout',
                    language: 'java',
                    title: 'flatMap in parallel',
                    prompt: '<p>A parallel stream, and a result that is nevertheless fixed.</p>',
                    code: 'import java.util.*;\nimport java.util.stream.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        List<List<Integer>> nested = List.of(\n                List.of(1, 2), List.of(3, 4), List.of(5, 6));\n\n        System.out.println(nested.parallelStream()\n                .flatMap(List::stream)\n                .map(n -> n * 10)\n                .collect(Collectors.toList()));\n\n        System.out.println(nested.parallelStream()\n                .flatMap(List::stream)\n                .reduce(0, Integer::sum));\n    }\n}',
                    options: ['[10, 20, 30, 40, 50, 60]\\n21', 'the order varies between runs\\n21', '[10, 20, 30, 40, 50, 60]\\nthe sum varies between runs', '[60, 50, 40, 30, 20, 10]\\n21'],
                    answer: 0,
                    output: {
                        kind: 'stdout',
                        lines: ['[10, 20, 30, 40, 50, 60]', '21'],
                        explain: '<p>An ordered source gives an ordered stream, and <code>collect</code> into a <code>List</code> preserves encounter order even in parallel — the work happens out of order and the results are reassembled in order. <strong>Parallel does not mean unordered.</strong> Calling <code>unordered()</code>, or collecting into a set, is what gives up the guarantee, and doing so is sometimes worth real speed.</p>'
                    }
                },
                {
                    type: 'predict',
                    id: 'predict-streams-findfirst-vs-findany-parallel',
                    importance: 'should-know',
                    artefact: 'stdout',
                    language: 'java',
                    title: 'findFirst and findAny on the same data',
                    prompt: '<p>One of these two is deterministic in parallel and one is not.</p>',
                    code: 'import java.util.*;\nimport java.util.stream.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        List<Integer> ns = IntStream.rangeClosed(1, 1000).boxed().toList();\n\n        int first = ns.parallelStream().filter(n -> n % 7 == 0).findFirst().orElseThrow();\n        int any   = ns.parallelStream().filter(n -> n % 7 == 0).findAny().orElseThrow();\n\n        System.out.println(first);\n        System.out.println(any % 7 == 0);\n    }\n}',
                    options: ['7\\ntrue', '7\\n7', 'the first line varies between runs\\ntrue', '1\\ntrue'],
                    answer: 0,
                    output: {
                        kind: 'stdout',
                        lines: ['7', 'true'],
                        explain: '<p><code>findFirst</code> respects encounter order and returns 7 whatever the parallelism costs to guarantee it. <code>findAny</code> is permitted to return any match — 7, 700, or anything else divisible by seven — which is why this puzzle prints a property of it rather than its value. Prefer <code>findAny</code> only when you genuinely do not care, and then say so in the code.</p>'
                    }
                },
                {
                    type: 'predict',
                    id: 'predict-streams-parallel-stream-shared-mutable-state',
                    importance: 'must-know',
                    artefact: 'behaviour',
                    verification: 'Reasoned from the java.util.stream package javadoc on side-effects; deliberately NOT run, because the outcome is a race and any single observed result would be a claim about one run on one machine.',
                    language: 'java',
                    title: 'Adding to an ArrayList from a parallel stream',
                    prompt: '<p>Two ways of collecting a million elements. What does this print?</p>',
                    code: 'import java.util.*;\nimport java.util.stream.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        List<Integer> unsafe = new ArrayList<>();\n        try {\n            IntStream.range(0, 1_000_000).parallel().forEach(unsafe::add);\n        } catch (Exception e) {\n            System.out.println("threw " + e.getClass().getSimpleName());\n        }\n        System.out.println("unsafe correct: " + (unsafe.size() == 1_000_000));\n\n        List<Integer> safe = IntStream.range(0, 1_000_000).parallel().boxed()\n                                      .collect(Collectors.toList());\n        System.out.println("safe correct: " + (safe.size() == 1_000_000));\n    }\n}',
                    options: ['usually false, and sometimes it throws instead', 'always false, deterministically', 'always true — ArrayList.add is atomic', 'it always throws ConcurrentModificationException'],
                    answer: 0,
                    output: {
                        kind: 'trace',
                        lines: [
                            'This is the one puzzle in the set with no fixed output, and that is the point of it.',
                            'ArrayList.add from several threads interleaves the size increment with the element write, so writes are lost and the list ends up short -- USUALLY.',
                            'It can also throw ArrayIndexOutOfBoundsException when a thread writes past a backing array another thread has not finished growing.',
                            'And on a lucky run with little contention it can be correct, which is what makes this the worst kind of bug: it passes in a test and loses rows in production.',
                            'collect() is not a tidier way of writing the same thing. It accumulates into a per-thread container and merges, so there is no shared mutable state to lose a write.'
                        ],
                        explain: '<p><code>ArrayList.add</code> from several threads loses writes and can throw <code>ArrayIndexOutOfBoundsException</code> — but not reliably, which is the danger. <strong>The usual outcome is simply a shorter list and no exception at all</strong>, so the bug is a wrong number rather than a crash. That is why this puzzle asserts a property: the count is wrong, and which wrong number it is varies per run. <code>collect</code> exists to make this impossible; it accumulates per thread and merges.</p>'
                    }
                }
            ],
            docs: [
                { title: 'Stream package — parallelism and side-effects', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/stream/package-summary.html#SideEffects', kind: 'api' }
            ],
            relatedQuestions: [{ topicId: 'collections', questionId: 'collections-and-parallel-streams' }]
        }
    ]
};
