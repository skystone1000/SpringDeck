/* ==========================================================================
   data/theory/sets/predict-collections.js — Predict, set 2 of 11

   Seven puzzles, all artefact: 'stdout', and every one of them avoids the
   trap that would make it unverifiable: NOTHING HERE DEPENDS ON HASH
   ITERATION ORDER. HashMap and HashSet make no ordering guarantee, so a
   program whose printed answer is an iteration order is a program whose
   answer the runner cannot diff against anything stable. Where a set has to
   be printed, it is printed sorted or its size is printed instead.
   ========================================================================== */

const predictCollectionsModule = {
    id: 'predict-collections',
    trackId: 'output',
    order: 952,
    title: 'Collections',
    tagline: 'Views, immutability, mutable keys and the fail-fast iterator.',
    estimatedMinutes: 20,
    prerequisites: [],
    docHub: {
        title: 'java.util — package summary',
        url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/package-summary.html'
    },

    chapters: [
        {
            id: 'views-and-wrappers',
            title: 'Views and Wrappers',
            importance: 'must-know',
            summary: 'Three collections that are not the collections they look like.',
            interviewAngle: 'The Arrays.asList one is asked constantly. The point is that it is a VIEW with fixed size, not a copy and not immutable.',
            buildsOn: [],
            blocks: [
                {
                    type: 'predict',
                    id: 'predict-collections-arrays-aslist-add-throws',
                    importance: 'must-know',
                    artefact: 'stdout',
                    language: 'java',
                    title: 'A list you can set but not add to',
                    prompt: '<p>One mutation succeeds and one does not.</p>',
                    code: 'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        String[] backing = { "a", "b", "c" };\n        List<String> view = Arrays.asList(backing);\n\n        view.set(0, "z");\n        System.out.println(backing[0]);\n        try {\n            view.add("d");\n        } catch (Exception e) {\n            System.out.println(e.getClass().getSimpleName());\n        }\n    }\n}',
                    options: ['z\\nUnsupportedOperationException', 'a\\nUnsupportedOperationException', 'z\\nIllegalStateException', 'z\\nno exception, the list has four elements'],
                    answer: 0,
                    output: {
                        kind: 'stdout',
                        lines: ['z', 'UnsupportedOperationException'],
                        explain: '<p><code>Arrays.asList</code> returns a fixed-size <em>view</em> over the array. <code>set</code> writes straight through to the backing array — which is why <code>backing[0]</code> changed — and <code>add</code> cannot work at all, because the array\'s length is fixed. It is neither a copy nor an immutable list, and confusing it with either is the usual bug.</p>'
                    }
                },
                {
                    type: 'predict',
                    id: 'predict-collections-sublist-is-a-view',
                    importance: 'must-know',
                    artefact: 'stdout',
                    language: 'java',
                    title: 'Clearing a sublist',
                    prompt: '<p>What is the parent list\'s size at the end?</p>',
                    code: 'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        List<Integer> all = new ArrayList<>(List.of(0, 1, 2, 3, 4, 5));\n        List<Integer> middle = all.subList(1, 4);\n        middle.clear();\n        System.out.println(all);\n        try {\n            System.out.println(middle.size());\n        } catch (Exception e) {\n            System.out.println(e.getClass().getSimpleName());\n        }\n    }\n}',
                    options: ['[0, 4, 5]\\n0', '[0, 1, 2, 3, 4, 5]\\n0', '[0, 4, 5]\\nConcurrentModificationException', '[0, 4, 5]\\n3'],
                    answer: 0,
                    output: {
                        kind: 'stdout',
                        lines: ['[0, 4, 5]', '0'],
                        explain: '<p><code>subList</code> is a view, so clearing it removes those elements from the parent — this is the documented idiom for removing a range. The view stays valid because the change went <em>through</em> it. Structurally modifying the PARENT instead invalidates the view, and the next call on it throws <code>ConcurrentModificationException</code>.</p>'
                    }
                },
                {
                    type: 'predict',
                    id: 'predict-collections-list-of-null-throws',
                    importance: 'should-know',
                    artefact: 'stdout',
                    language: 'java',
                    title: 'Three factories and a null',
                    prompt: '<p>Which of these accept a null element?</p>',
                    code: 'import java.util.*;\n\npublic class Main {\n    static String attempt(Runnable r) {\n        try { r.run(); return "ok"; }\n        catch (Exception e) { return e.getClass().getSimpleName(); }\n    }\n    public static void main(String[] args) {\n        System.out.println(attempt(() -> Arrays.asList("a", null)));\n        System.out.println(attempt(() -> List.of("a", null)));\n        System.out.println(attempt(() -> new ArrayList<>(Arrays.asList("a", null))));\n    }\n}',
                    options: ['ok\\nNullPointerException\\nok', 'ok\\nok\\nok', 'NullPointerException\\nNullPointerException\\nok', 'ok\\nIllegalArgumentException\\nok'],
                    answer: 0,
                    output: {
                        kind: 'stdout',
                        lines: ['ok', 'NullPointerException', 'ok'],
                        explain: '<p>The Java 9 <code>List.of</code> / <code>Set.of</code> / <code>Map.of</code> factories reject nulls by contract, and they also reject <code>contains(null)</code>. The older <code>Arrays.asList</code> and <code>ArrayList</code> accept them. So replacing <code>Arrays.asList</code> with <code>List.of</code> as a tidy-up is a behaviour change, and it is the kind that only fires on the data you did not test with.</p>'
                    }
                }
            ],
            docs: [
                { title: 'Arrays.asList — javadoc', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Arrays.html#asList(T...)', kind: 'api' },
                { title: 'List.of — immutable list static factory methods', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/List.html#immutable', kind: 'api' }
            ],
            relatedQuestions: [{ topicId: 'collections', questionId: 'sublist-is-a-view' }]
        },

        {
            id: 'keys-comparators-and-iteration',
            title: 'Keys, Comparators and Iteration',
            importance: 'must-know',
            summary: 'A key that changes, a comparator that disagrees with equals, and a loop that removes.',
            interviewAngle: 'The mutable-key puzzle is the strongest single demonstration that equals and hashCode are a contract with the collection rather than with you.',
            buildsOn: ['views-and-wrappers'],
            blocks: [
                {
                    type: 'predict',
                    id: 'predict-collections-mutable-key-lost-in-hashset',
                    importance: 'must-know',
                    artefact: 'stdout',
                    language: 'java',
                    title: 'The element that is in the set and cannot be found',
                    prompt: '<p>The object is mutated after it is added.</p>',
                    code: 'import java.util.*;\n\npublic class Main {\n    static final class Key {\n        int n;\n        Key(int n) { this.n = n; }\n        @Override public boolean equals(Object o) {\n            return o instanceof Key k && k.n == n;\n        }\n        @Override public int hashCode() { return Integer.hashCode(n); }\n    }\n\n    public static void main(String[] args) {\n        Set<Key> set = new HashSet<>();\n        Key k = new Key(1);\n        set.add(k);\n        k.n = 2;\n        System.out.println(set.contains(k) + " " + set.size()\n                           + " " + set.remove(k) + " " + set.size());\n    }\n}',
                    options: ['false 1 false 1', 'true 1 true 0', 'false 1 true 0', 'false 0 false 0'],
                    answer: 0,
                    output: {
                        kind: 'stdout',
                        lines: ['false 1 false 1'],
                        explain: '<p>The element was filed under the bucket for hash(1). Changing <code>n</code> changes the hash, so <code>contains</code> looks in the bucket for hash(2) and finds nothing — while the element is still there, still counted, and now unreachable through the set\'s own API. Iterating still yields it. This is the whole argument for immutable keys, and for records with immutable components.</p>'
                    }
                },
                {
                    type: 'predict',
                    id: 'predict-collections-treemap-with-inconsistent-comparator',
                    importance: 'should-know',
                    artefact: 'stdout',
                    language: 'java',
                    title: 'A map that loses an entry to its comparator',
                    prompt: '<p>Two distinct strings, one comparator that cannot tell them apart.</p>',
                    code: 'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Map<String, Integer> hash = new HashMap<>();\n        Map<String, Integer> tree = new TreeMap<>(Comparator.comparingInt(String::length));\n\n        for (Map<String, Integer> m : List.of(hash, tree)) {\n            m.put("aa", 1);\n            m.put("bb", 2);\n            System.out.println(m.size() + " " + m.get("aa"));\n        }\n    }\n}',
                    options: ['2 1\\n1 2', '2 1\\n2 1', '2 1\\n1 1', '1 1\\n1 2'],
                    answer: 0,
                    output: {
                        kind: 'stdout',
                        lines: ['2 1', '1 2'],
                        explain: '<p>A sorted map decides equality with its COMPARATOR, not with <code>equals</code>. This comparator says <code>"aa"</code> and <code>"bb"</code> are the same key, so the second <code>put</code> overwrites the first and <code>get("aa")</code> returns 2. <code>TreeMap</code> is documented as behaving inconsistently with <code>Map</code> when the comparator disagrees with equals — the javadoc says so in as many words, and this is what it means.</p>'
                    }
                },
                {
                    type: 'predict',
                    id: 'predict-collections-concurrentmodificationexception',
                    importance: 'must-know',
                    artefact: 'stdout',
                    language: 'java',
                    title: 'Two removals, one exception',
                    prompt: '<p>Removing while iterating, twice, in two different ways.</p>',
                    code: 'import java.util.*;\n\npublic class Main {\n    static String attempt(Runnable r) {\n        try { r.run(); return "ok"; }\n        catch (Exception e) { return e.getClass().getSimpleName(); }\n    }\n    public static void main(String[] args) {\n        System.out.println(attempt(() -> {\n            List<String> l = new ArrayList<>(List.of("a", "b", "c"));\n            for (String s : l) if (s.equals("a")) l.remove(s);\n        }));\n        System.out.println(attempt(() -> {\n            List<String> l = new ArrayList<>(List.of("a", "b", "c"));\n            l.removeIf(s -> s.equals("a"));\n        }));\n        System.out.println(attempt(() -> {\n            List<String> l = new ArrayList<>(List.of("a", "b", "c"));\n            for (String s : l) if (s.equals("b")) l.remove(s);\n        }));\n    }\n}',
                    options: ['ConcurrentModificationException\\nok\\nok', 'ConcurrentModificationException\\nok\\nConcurrentModificationException', 'ok\\nok\\nConcurrentModificationException', 'ConcurrentModificationException\\nConcurrentModificationException\\nok'],
                    answer: 0,
                    output: {
                        kind: 'stdout',
                        lines: ['ConcurrentModificationException', 'ok', 'ok'],
                        explain: '<p>The third one is the interesting case. Removing the SECOND-TO-LAST element leaves <code>cursor == size</code>, so <code>hasNext()</code> returns false and the loop exits before <code>next()</code> can check the modification count. The iterator is fail-<em>fast</em>, not fail-<em>safe</em>: it detects the problem on a best-effort basis and this shape slips through. Code that appears to work because of it is the reason <code>removeIf</code> exists.</p>'
                    }
                },
                {
                    type: 'predict',
                    id: 'predict-collections-hashset-of-records-vs-classes',
                    importance: 'should-know',
                    artefact: 'stdout',
                    language: 'java',
                    title: 'A record and a class in the same set',
                    prompt: '<p>Two value types, one with generated equals and one without.</p>',
                    code: 'import java.util.*;\n\npublic class Main {\n    record Point(int x, int y) { }\n\n    static final class Spot {\n        final int x, y;\n        Spot(int x, int y) { this.x = x; this.y = y; }\n    }\n\n    public static void main(String[] args) {\n        Set<Point> points = new HashSet<>();\n        points.add(new Point(1, 2));\n        points.add(new Point(1, 2));\n\n        Set<Spot> spots = new HashSet<>();\n        spots.add(new Spot(1, 2));\n        spots.add(new Spot(1, 2));\n\n        System.out.println(points.size() + " " + spots.size());\n    }\n}',
                    options: ['1 2', '1 1', '2 2', '2 1'],
                    answer: 0,
                    output: {
                        kind: 'stdout',
                        lines: ['1 2'],
                        explain: '<p>A record gets <code>equals</code> and <code>hashCode</code> derived from its components, so two records with the same values are the same key. <code>Spot</code> is <code>final</code>, immutable and carries the same two fields, and none of that matters — it inherits identity semantics from <code>Object</code>, so the set holds two. Immutability is not value semantics; the methods are.</p>'
                    }
                }
            ],
            docs: [
                { title: 'TreeMap — javadoc, on consistency with equals', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/TreeMap.html', kind: 'api' },
                { title: 'JLS 8.10 — Record classes', url: 'https://docs.oracle.com/javase/specs/jls/se21/html/jls-8.html#jls-8.10', kind: 'spec' }
            ],
            relatedQuestions: [
                { topicId: 'collections', questionId: 'fail-fast-iterators' },
                { topicId: 'java-language', questionId: 'mutable-key-in-a-hashmap' }
            ]
        }
    ]
};
