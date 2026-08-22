/* ==========================================================================
   data/placeholder.js — ONE PLACEHOLDER TOPIC, THREE QUESTIONS

   This file exists to give Phase 0 something real to render against. Three
   questions is enough to exercise every part of the card: all three tiers,
   an answer with the full allowed tag subset, a code snippet with a verified
   stdout pane, a snippet with a trace pane, reference links and tags.

   IT IS DELETED IN PHASE 2, when data/java-language.js and the rest of the
   question bank replace it. The content is real rather than lorem ipsum so
   that the Phase 0 gate — "the page renders in both themes" — is a check
   worth passing.

   ONE GLOBAL PER FILE. That is the whole module system.
   ========================================================================== */

const placeholderData = {
    id: 'placeholder',
    title: 'Placeholder',
    subsections: null,
    keyTopics: ['equals and hashCode', 'the string pool', 'transaction proxies'],
    questions: [
        {
            id: 'equals-hashcode-contract',
            importance: 'must-know',
            question: 'What is the contract between equals() and hashCode(), and what breaks when you override only one?',
            answer:
                '<p>The contract has three parts, and only the second one is the ' +
                'source of interview questions:</p>' +
                '<ul>' +
                '<li><strong>Consistency.</strong> Calling <code>hashCode()</code> twice on an ' +
                'unmodified object returns the same value.</li>' +
                '<li><strong>Equal implies same hash.</strong> If <code>a.equals(b)</code> is ' +
                'true, <code>a.hashCode() == b.hashCode()</code> must be true.</li>' +
                '<li><strong>Unequal does not imply different hash.</strong> Two unequal objects ' +
                '<em>may</em> share a hash. That is a collision, and it is legal.</li>' +
                '</ul>' +
                '<p>Overriding <code>equals()</code> alone is the damaging direction. Two objects ' +
                'that are now equal still return the identity hashes they were born with, so a ' +
                '<code>HashMap</code> puts them in different buckets and never compares them. ' +
                'The map contains your key and cannot find it.</p>' +
                '<p>Overriding <code>hashCode()</code> alone is merely useless: equality still ' +
                'falls back to reference identity, so the map behaves as it did before.</p>',
            referenceLinks: [
                { title: 'Object.hashCode() — Java SE API', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Object.html' }
            ],
            tags: ['object-contract', 'collections', 'hashing'],
            images: [],
            hasDiagram: false,
            diagramType: null,
            diagramConfig: null,
            codeSnippets: [
                {
                    language: 'java',
                    title: 'The key the map cannot find',
                    code:
                        'import java.util.HashMap;\n' +
                        'import java.util.Map;\n' +
                        '\n' +
                        'public class Placeholder {\n' +
                        '    static final class Sku {\n' +
                        '        private final String code;\n' +
                        '        Sku(String code) { this.code = code; }\n' +
                        '\n' +
                        '        @Override public boolean equals(Object other) {\n' +
                        '            return other instanceof Sku s && s.code.equals(code);\n' +
                        '        }\n' +
                        '        // hashCode() is deliberately NOT overridden.\n' +
                        '    }\n' +
                        '\n' +
                        '    public static void main(String[] args) {\n' +
                        '        Map<Sku, Integer> stock = new HashMap<>();\n' +
                        '        stock.put(new Sku("A-1"), 7);\n' +
                        '\n' +
                        '        System.out.println(new Sku("A-1").equals(new Sku("A-1")));\n' +
                        '        System.out.println(stock.get(new Sku("A-1")));\n' +
                        '        System.out.println(stock.size());\n' +
                        '    }\n' +
                        '}',
                    output: {
                        kind: 'stdout',
                        lines: ['true', 'null', '1'],
                        explain:
                            '<p>The two <code>Sku</code> objects are equal and the map holds one ' +
                            'entry, yet the lookup returns <code>null</code>. The bucket was ' +
                            'chosen from the identity hash, so the map never reached the point ' +
                            'of calling <code>equals()</code> at all.</p>'
                    }
                }
            ],
            subsection: null
        },
        {
            id: 'string-pool-identity',
            importance: 'should-know',
            question: 'Why does == return true for two String literals but false for a literal and a new String?',
            answer:
                '<p>A string <em>literal</em> is interned at class-load time: the constant pool ' +
                'holds one instance and every literal with the same characters refers to it. ' +
                'Two literals are therefore the same object, and <code>==</code> — which ' +
                'compares references — is true.</p>' +
                '<p><code>new String("a")</code> is an explicit instruction to allocate. It ' +
                'produces a distinct object whose contents are equal and whose reference is ' +
                'not, so <code>==</code> is false and <code>equals()</code> is true.</p>' +
                '<p>This is why <code>==</code> on strings is a bug that passes its own tests: ' +
                'it works for every literal you write by hand and fails the first time a value ' +
                'arrives from a file, a socket or a database.</p>',
            referenceLinks: [
                { title: 'String.intern() — Java SE API', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/String.html' }
            ],
            tags: ['strings', 'memory'],
            images: [],
            hasDiagram: false,
            diagramType: null,
            diagramConfig: null,
            codeSnippets: [
                {
                    language: 'java',
                    title: 'Four comparisons',
                    code:
                        'public class Pool {\n' +
                        '    public static void main(String[] args) {\n' +
                        '        String a = "spring";\n' +
                        '        String b = "spring";\n' +
                        '        String c = new String("spring");\n' +
                        '        String d = c.intern();\n' +
                        '\n' +
                        '        System.out.println(a == b);\n' +
                        '        System.out.println(a == c);\n' +
                        '        System.out.println(a.equals(c));\n' +
                        '        System.out.println(a == d);\n' +
                        '    }\n' +
                        '}',
                    output: {
                        kind: 'stdout',
                        lines: ['true', 'false', 'true', 'true'],
                        explain:
                            '<p><code>intern()</code> returns the pooled instance, which is why ' +
                            'the fourth comparison is true — <code>d</code> and <code>a</code> ' +
                            'are the same object again.</p>'
                    }
                }
            ],
            subsection: null
        },
        {
            id: 'transactional-self-invocation',
            importance: 'must-know',
            question: 'Why does @Transactional have no effect when one method of a class calls another method of the same class?',
            answer:
                '<p>Because Spring implements <code>@Transactional</code> with a <em>proxy</em>. ' +
                'The bean the container hands to your callers is not your class; it is a ' +
                'generated object that wraps it, opens a transaction, delegates, and commits ' +
                'or rolls back.</p>' +
                '<p>An internal call — <code>this.other()</code> — goes straight to the target ' +
                'instance. It never crosses the proxy, so the advice never runs and there is no ' +
                'transaction. Nothing throws and nothing logs: the annotation is simply inert.</p>' +
                '<p>The same limitation applies to every proxy-based annotation, ' +
                '<code>@Async</code>, <code>@Cacheable</code> and <code>@Retryable</code> ' +
                'included. Being able to say that is what separates having read the annotation ' +
                'from having understood the mechanism.</p>' +
                '<p>The fix is to make the call cross a proxy boundary: move the method to ' +
                'another bean, inject the bean into itself, or use ' +
                '<code>TransactionTemplate</code> and open the transaction explicitly.</p>',
            referenceLinks: [
                { title: 'Transaction Management — Spring Framework Reference', url: 'https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/annotations.html' }
            ],
            tags: ['spring', 'transactions', 'aop', 'proxies'],
            images: [],
            hasDiagram: false,
            diagramType: null,
            diagramConfig: null,
            codeSnippets: [
                {
                    language: 'java',
                    title: 'The transaction that never starts',
                    code:
                        '@Service\n' +
                        'public class OrderService {\n' +
                        '\n' +
                        '    public void placeOrder(Order order) {\n' +
                        '        // Straight to the target instance. The proxy is not involved,\n' +
                        '        // so the annotation below has no effect whatsoever.\n' +
                        '        this.persist(order);\n' +
                        '    }\n' +
                        '\n' +
                        '    @Transactional\n' +
                        '    public void persist(Order order) {\n' +
                        '        repository.save(order);\n' +
                        '        auditLog.record(order);   // Not rolled back if this throws.\n' +
                        '    }\n' +
                        '}',
                    output: {
                        /* trace, NOT stdout. This snippet needs a container, a
                           datasource and two collaborators to run. Claiming a
                           console output over it would be fabricating one. */
                        kind: 'trace',
                        lines: [
                            'placeOrder() is called through the proxy, so the proxy is active for it.',
                            'placeOrder() is not annotated, so no transaction is opened.',
                            'this.persist(order) resolves on the target instance, bypassing the proxy.',
                            'The @Transactional advice never runs; persist() executes with no transaction.',
                            'repository.save() commits on its own; auditLog.record() throwing leaves it committed.'
                        ],
                        explain:
                            '<p>The damage is not that the transaction is missing. It is that ' +
                            'the first write has already been committed by the time the second ' +
                            'one fails, which is the exact outcome the annotation was added to ' +
                            'prevent.</p>'
                    }
                }
            ],
            subsection: null
        }
    ]
};
