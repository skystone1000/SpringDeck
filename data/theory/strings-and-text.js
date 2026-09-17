/* ==========================================================================
   data/theory/strings-and-text.js — module 4 in the reading path

   One of the six java-platform modules the section 2.5 gap audit found
   missing from the Phase 3 plan, inserted after objects-and-contracts by
   section 5.9 rather than given a number of its own.

   Nine chapters. Strings have a disproportionate interview surface for
   something everybody uses on their first day: immutability is the standard
   opener, the pool is the standard follow-up, and concatenation in a loop is
   the standard "have you ever profiled anything" question. The last three
   chapters are the ones that catch people who have only read about the first
   six — locale-sensitive formatting, the switch that predates pattern
   matching, and the comparison traps that turn into production defects in a
   Turkish locale.
   ========================================================================== */

const stringsAndTextModule = {
    id: 'strings-and-text',
    trackId: 'java-platform',
    order: 4,
    title: 'Strings',
    tagline: 'The pool, the builder, and the loop that allocates a thousand objects.',
    estimatedMinutes: 30,
    prerequisites: ['objects-and-contracts'],
    docHub: { title: 'java.lang.String', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/String.html' },

    chapters: [
        {
            id: 'string-immutability',
            title: 'Why String Is Immutable',
            importance: 'must-know',
            summary: 'Four reasons, and only one of them is "thread safety". The security one is the reason it could never be changed now.',
            interviewAngle: 'Asked in nearly every first round. Most candidates give one reason; giving the security argument — a mutable string would break every path and hostname check ever written — is what separates the answers.',
            buildsOn: [],
            blocks: [
                {
                    type: 'types',
                    title: 'The four reasons, in order of how load-bearing they are',
                    items: [
                        { name: 'Security', html: '<p>Every check of the form "validate this path, then open it" would be defeated by a mutable string: the caller could change the value between the check and the use. Class names, file paths, hostnames and JDBC URLs are all passed as strings across trust boundaries, and every one of those APIs assumes the value it validated is the value it will use.</p>' },
                        { name: 'The hash code can be cached', html: '<p><code>String</code> stores its hash in a field and computes it once. Because <code>HashMap</code> keys are overwhelmingly strings, this is a real and measurable win — and it is only sound because the value cannot change.</p>' },
                        { name: 'Pooling becomes possible', html: '<p>Sharing one instance for every occurrence of <code>"id"</code> in a program is only safe if nobody can modify it. The next chapter is about what that buys.</p>' },
                        { name: 'Thread safety', html: '<p>The one everybody says first, and the least interesting: it is a consequence of immutability rather than a reason for it. Any immutable object is safely shareable.</p>' }
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'What immutability does not mean',
                    code: 'String a = "hello";\na.toUpperCase();          // does NOTHING to a -- the result is discarded\nSystem.out.println(a);    // hello\n\na = a.toUpperCase();      // reassigns the REFERENCE; the object is new\nSystem.out.println(a);    // HELLO\n\n// The reference is not the object. `final` on a String variable stops\n// the first line below and has nothing to say about the second.\nfinal String b = "hi";\n// b = "bye";             // compile error -- the REFERENCE is final\nStringBuilder sb = new StringBuilder("hi");\nfinal StringBuilder c = sb;\nc.append(" there");       // fine -- final says nothing about the object',
                    notes: '<p>The <code>final</code> contrast is worth having ready, because "is a <code>final</code> field immutable" is a common follow-up and the answer is no: <code>final</code> constrains the reference, immutability is a property of the object. A <code>final List</code> can still have elements added to it.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A password in a <code>String</code> stays in memory until it is collected, and you cannot clear it.</strong> That is why <code>Console.readPassword()</code> returns <code>char[]</code> and why <code>javax.crypto</code> APIs take one: an array can be overwritten with zeroes the moment you are done with it. It is also the neatest demonstration that immutability is a trade-off rather than a free win.</p>'
                }
            ],
            docs: [
                { title: 'java.lang.String', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/String.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'java-language', questionId: 'why-string-is-immutable' },
                { topicId: 'java-language', questionId: 'immutability-recipe' }
            ]
        },

        {
            id: 'the-string-pool',
            title: 'The String Pool',
            importance: 'must-know',
            summary: 'A table of unique string instances. Literals go in it automatically at class load; anything built at run time does not, which is why == sometimes works and sometimes does not.',
            interviewAngle: 'The classic == versus equals question dressed up. The answer that lands explains why the two literals are the same object rather than just asserting that they are.',
            buildsOn: ['string-immutability'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The four cases, and the rule that explains all of them',
                    code: 'String a = "java";\nString b = "java";\nString c = new String("java");\nString d = "ja" + "va";               // both operands are constants\nString e = "ja".concat("va");         // a method call at run time\n\na == b;        // true  -- both refer to the pooled literal\na == c;        // false -- new String() always allocates\na == d;        // true  -- CONSTANT FOLDED by javac into the literal\na == e;        // false -- built at run time, not interned\n\na.equals(c);   // true  -- and this is the only thing you should write\n\nString f = c.intern();\na == f;        // true  -- intern() returns the pooled instance',
                    output: {
                        kind: 'trace',
                        lines: [
                            'a == b  true    Both are the same literal, so both are the same pooled object.',
                            'a == c  false   new String() is specified to create a fresh instance, always.',
                            'a == d  true    "ja" + "va" is a compile-time constant expression; javac folds it to "java" and it is the same literal.',
                            'a == e  false   concat() runs at run time and returns a new, unpooled instance.',
                            'a == f  true    intern() looks the value up in the pool and returns what is already there.'
                        ],
                        explain: '<p>The line worth being able to explain is <code>d</code>. Constant folding happens because both operands are compile-time constants — make either of them a non-final variable and the concatenation moves to run time, the result is no longer pooled, and <code>a == d</code> becomes false. That single change is the whole demonstration that this is a <em>compiler</em> behaviour, not a string behaviour.</p>'
                    }
                },
                {
                    type: 'table',
                    title: 'Where the pool lives, which changed and matters for tuning',
                    headers: ['Version', 'Location', 'Consequence'],
                    rows: [
                        ['Java 6 and earlier', 'PermGen', 'Interning many run-time strings caused <code>OutOfMemoryError: PermGen space</code>'],
                        ['Java 7+', 'The main heap', 'Interned strings are ordinary garbage and can be collected'],
                        ['Java 7+', 'Table size tunable', '<code>-XX:StringTableSize</code>; the default grew over time and matters only for very large pools'],
                        ['Java 8+', 'PermGen replaced by Metaspace', 'The pool was already out of it by then — the two changes are often confused']
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>Never compare strings with <code>==</code>, including when you are sure they are pooled. The reason is not that it is always wrong — it is that whether it works depends on how the value was produced, which is a property of code somewhere else that can change without warning. A string read from a request, a database or a file is never pooled, and that is where the bug appears.</p>'
                }
            ],
            docs: [
                { title: 'JLS §3.10.5 — String Literals', url: 'https://docs.oracle.com/javase/specs/jls/se21/html/jls-3.html', kind: 'spec' }
            ],
            relatedQuestions: [
                { topicId: 'java-language', questionId: 'string-pool-and-intern' }
            ]
        },

        {
            id: 'intern-and-when-not-to',
            title: 'intern(), and When Not To',
            importance: 'good-to-know',
            summary: 'Puts a run-time string into the pool and gives you back the shared instance. Occasionally a large memory win, frequently a way to make things slower.',
            interviewAngle: 'A depth question. The right answer is that it trades CPU and a global table for heap, and that the modern alternative is usually a bounded map you control.',
            buildsOn: ['the-string-pool'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p><code>intern()</code> is worth reaching for in exactly one shape of problem: you are holding a very large number of strings drawn from a small set of distinct values — a currency code per row, a status per event, a column name per record — and the duplicates are costing real heap.</p><p>It is a bad idea nearly everywhere else. The pool is a global, fixed-size hash table shared by the whole JVM; interning is a native call with a lookup, and interning millions of <em>distinct</em> values makes that table enormous and every future lookup slower, while making the strings uncollectable for as long as they are referenced.</p>'
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The alternative that is usually better',
                    code: '// Interning: global, unbounded, native, affects the whole JVM.\nString status = row.getString("status").intern();\n\n// A deduplication map you own: bounded, local, ordinary Java, and it\n// can be thrown away when the import finishes.\nMap<String, String> dedupe = new HashMap<>();\nString status = dedupe.computeIfAbsent(row.getString("status"), identity());\n\n// Or: do not deduplicate at all, and let the GC do it.\n//   -XX:+UseStringDeduplication\n// G1 (and later, other collectors) can share the backing byte[] of\n// equal strings during collection. No code change, no global table,\n// and it only pays for strings that actually survive.',
                    notes: '<p>String deduplication in the collector is the answer that most often removes the need for this question entirely. It works on the backing array rather than on the <code>String</code> object, it is applied only to strings that survive a collection or two, and it costs nothing at allocation time — which is precisely the opposite of interning\'s cost profile.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Do not use interned strings as lock objects.</strong> <code>synchronized (id.intern())</code> looks like an elegant way to lock per id, and it locks on an object shared with every other piece of code in the JVM that happens to intern the same value — including libraries. Unrelated code can then deadlock with yours on a string neither of you knew you shared. Use a dedicated lock striping map instead.</p>'
                }
            ],
            docs: [
                { title: 'String.intern()', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/String.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'java-language', questionId: 'string-pool-and-intern' }
            ]
        },

        {
            id: 'stringbuilder-vs-stringbuffer',
            title: 'StringBuilder and StringBuffer',
            importance: 'must-know',
            summary: 'Same API, one synchronised. Use StringBuilder; StringBuffer exists for compatibility and its synchronisation almost never helps, because a shared builder is a design problem rather than a locking one.',
            interviewAngle: 'A near-guaranteed question with a two-sentence answer. The extra credit is explaining why StringBuffer being thread-safe is not actually useful.',
            buildsOn: ['intern-and-when-not-to'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'The whole difference',
                    left: 'StringBuilder',
                    right: 'StringBuffer',
                    rows: [
                        { aspect: 'Synchronised', left: 'No', right: 'Yes, every method' },
                        { aspect: 'Speed', left: 'Faster; the JIT can also eliminate the allocation entirely', right: 'Slower, and locks resist some optimisations' },
                        { aspect: 'Since', left: 'Java 5', right: 'Java 1.0' },
                        { aspect: 'Use it when', left: 'Always', right: 'Legacy code that already uses it' },
                        { aspect: 'Is the thread safety useful', left: '—', right: '<strong>Rarely.</strong> Each call is atomic, but a sequence of appends is not, so two threads still interleave their output.' }
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>The last row is the one worth understanding. <code>StringBuffer</code> makes each individual <code>append</code> atomic; it does not make a <em>sequence</em> of appends atomic. Two threads building two log lines into one shared buffer will produce two interleaved half-lines, safely. The synchronisation prevents corruption of the internal array and does not prevent the bug you actually have — which is why the correct fix is a builder per thread, and why <code>StringBuilder</code> is the right default.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Sizing matters more than the choice between them. The default capacity is 16 characters and growth copies the array; <code>new StringBuilder(1024)</code> ahead of a known-large build avoids several copies. It is a small win, and it is the kind of detail that reads as having profiled something rather than read something.</p>'
                }
            ],
            docs: [
                { title: 'StringBuilder', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/StringBuilder.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'java-language', questionId: 'string-concat-in-a-loop' }
            ]
        },

        {
            id: 'concatenation-and-what-the-compiler-does',
            title: 'What + Actually Compiles To',
            importance: 'must-know',
            summary: 'A single expression is optimised for you. A loop is not — each iteration builds a fresh builder, copies everything so far, and throws it away.',
            interviewAngle: 'The question is usually "is + slow". The answer that demonstrates understanding is that it depends on whether the concatenation is one expression or one per iteration, and why the compiler cannot fix the second case.',
            buildsOn: ['stringbuilder-vs-stringbuffer'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The same-looking code, quadratic and linear',
                    code: '// ONE expression. javac (and, since 9, an invokedynamic bootstrap)\n// turns this into a single efficient build. Perfectly fine.\nString message = "user " + id + " placed order " + orderId;\n\n// A loop. Each ITERATION is its own concatenation expression, so each\n// one allocates a builder, copies the whole accumulated string into\n// it, appends, and produces a new String. n iterations copy roughly\n// n^2/2 characters.\nString csv = "";\nfor (Order o : orders) {\n    csv = csv + o.id() + ",";        // O(n^2)\n}\n\n// The fix: one builder, outside the loop.\nStringBuilder sb = new StringBuilder(orders.size() * 12);\nfor (Order o : orders) {\n    sb.append(o.id()).append(\',\');\n}\nString csv = sb.toString();          // O(n)\n\n// Or, for a join, say what you mean:\nString csv = orders.stream().map(Order::id).collect(joining(","));',
                    output: {
                        kind: 'trace',
                        lines: [
                            'One expression:  javac emits a single StringConcatFactory call. No loop, no repeated copying, nothing to fix.',
                            'In a loop:       the compiler cannot hoist the builder, because it cannot prove nothing else observes csv between iterations.',
                            'Cost:            10,000 rows of ~10 characters copies on the order of 500 million characters instead of 100,000.',
                            'The fix is not a faster concatenation; it is one accumulation instead of n.'
                        ],
                        explain: '<p>The reason the compiler does not rescue the loop is worth stating: each iteration is a complete, independent expression whose result is assigned to a variable, and hoisting a builder across iterations would change the observable identity of that variable. The optimisation is unavailable for a semantic reason rather than a missing one.</p>'
                    }
                },
                {
                    type: 'version',
                    title: 'How + has been compiled over time',
                    items: [
                        { version: 'Java 1.4 and earlier', state: 'was', html: '<p><code>StringBuffer.append</code> chains — synchronised, for no benefit.</p>' },
                        { version: 'Java 5', state: 'changed', html: '<p>Switched to <code>StringBuilder</code>. Same shape, no locking.</p>' },
                        { version: 'Java 9', state: 'is', html: '<p><strong>JEP 280.</strong> <code>invokedynamic</code> against <code>StringConcatFactory</code>: the shape of the concatenation is a bootstrap the JVM can compile into an optimal method handle, sizing the result exactly and copying once. Faster than a hand-written builder for a single expression.</p>' },
                        { version: 'Any version', state: 'is', html: '<p>None of this helps a loop, and no future version will, for the reason above.</p>' }
                    ]
                }
            ],
            docs: [
                { title: 'StringConcatFactory', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/invoke/StringConcatFactory.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'java-language', questionId: 'string-concat-in-a-loop' }
            ]
        },

        {
            id: 'compact-strings',
            title: 'Compact Strings',
            importance: 'good-to-know',
            summary: 'Since Java 9 a String holds a byte[] and a coder flag, not a char[]. Latin-1 content takes half the memory it used to.',
            interviewAngle: 'A memory question with a precise answer, and one of the few JVM changes with a measurable, easily stated effect on a typical heap.',
            buildsOn: ['concatenation-and-what-the-compiler-does'],
            blocks: [
                {
                    type: 'version',
                    title: 'The representation change',
                    items: [
                        { version: 'Java 8 and earlier', state: 'was', html: '<p><code>char[] value</code>. Two bytes per character, always, whether the content was ASCII or not.</p>' },
                        { version: 'Java 9', state: 'changed', html: '<p><strong>JEP 254.</strong> <code>byte[] value</code> plus a <code>byte coder</code>. If every character fits in Latin-1 the array is one byte per character; otherwise it is UTF-16 as before.</p>' },
                        { version: 'Java 9+', state: 'is', html: '<p>Effect on a typical server heap: strings are commonly 20–25% of live data and mostly ASCII, so this was a large, free win. It can be disabled with <code>-XX:-CompactStrings</code>, and there is essentially never a reason to.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>One non-Latin-1 character costs the whole string.</strong> The coder is per string, not per character, so appending a single emoji or a curly quote to a 10,000-character ASCII string doubles its footprint. It is rarely worth engineering around, and it does explain heap-histogram surprises in applications handling user-generated text — the same number of strings, twice the bytes, and nothing in the code changed.</p>'
                }
            ],
            docs: [
                { title: 'JEP 254: Compact Strings', url: 'https://openjdk.org/jeps/254', kind: 'spec' }
            ],
            relatedQuestions: [
                { topicId: 'jvm-memory', questionId: 'diagnosing-a-memory-leak' }
            ]
        },

        {
            id: 'switch-on-string',
            title: 'switch on a String',
            importance: 'good-to-know',
            summary: 'Legal since Java 7, and it compiles to a hashCode switch followed by an equals check — which is why it is fast and why it is null-hostile.',
            interviewAngle: 'A small question that rewards knowing the compilation strategy: the NullPointerException on a null selector surprises people, and the reason is that hashCode is called on it.',
            buildsOn: ['compact-strings'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'What the compiler generates, in effect',
                    code: 'switch (command) {\n    case "start" -> start();\n    case "stop"  -> stop();\n    default      -> unknown(command);\n}\n\n// Roughly equivalent to:\nswitch (command.hashCode()) {          // <-- NPE if command is null\n    case 109757538:                    // "start".hashCode()\n        if (command.equals("start")) { start(); break; }\n        unknown(command); break;\n    case 3540994:                      // "stop".hashCode()\n        if (command.equals("stop"))  { stop();  break; }\n        unknown(command); break;\n    default:\n        unknown(command);\n}',
                    notes: '<p>Two facts fall out of the generated form. The switch is O(1) rather than a chain of <code>equals</code> calls, which is why it is worth using for a long list of cases. And it dereferences the selector to call <code>hashCode</code>, which is why a <code>null</code> selector throws — the <code>default</code> branch does not catch it, which is the part that surprises people.</p>'
                },
                {
                    type: 'version',
                    title: 'And then pattern matching changed the rules',
                    items: [
                        { version: 'Java 7', state: 'changed', html: '<p><code>switch</code> on <code>String</code> becomes legal. <code>null</code> throws.</p>' },
                        { version: 'Java 14', state: 'changed', html: '<p>Arrow labels and <code>switch</code> as an expression. No fall-through, and an expression switch must be exhaustive.</p>' },
                        { version: 'Java 21', state: 'is', html: '<p><strong>Pattern matching for switch (JEP 441).</strong> A <code>case null</code> label is now permitted, so the null-hostility is opt-out — and a switch over a sealed hierarchy is checked for exhaustiveness by the compiler, which is a better tool than a string switch for most of the cases people used one for.</p>' }
                    ]
                }
            ],
            docs: [
                { title: 'JEP 441: Pattern Matching for switch', url: 'https://openjdk.org/jeps/441', kind: 'spec' }
            ],
            relatedQuestions: [
                { topicId: 'java-language', questionId: 'pattern-matching-for-switch' },
                { topicId: 'java-language', questionId: 'switch-exhaustiveness' }
            ]
        },

        {
            id: 'formatting-and-locale',
            title: 'Formatting, and the Locale You Forgot',
            importance: 'should-know',
            summary: 'String.format, text blocks and formatted() all take a locale, and the no-locale overloads use the JVM default — which is a property of the machine, not of your program.',
            interviewAngle: 'A production-defect question. "It worked on my laptop and produced 1,5 in Frankfurt" is a real class of bug and naming it shows operational experience.',
            buildsOn: ['switch-on-string'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The default locale is an environment variable in disguise',
                    code: 'double amount = 1234.5;\n\nString.format("%.2f", amount);\n// "1234.50" in en-US, "1234,50" in de-DE. Same code, same JVM version,\n// different machine. This is the bug.\n\n// For output a MACHINE will read -- a CSV, a JSON body, a log line,\n// an SQL literal -- always pin the locale.\nString.format(Locale.ROOT, "%.2f", amount);      // always "1234.50"\n\n// For output a PERSON will read, pass the USER is locale, not the\n// server is default.\nNumberFormat.getCurrencyInstance(userLocale).format(amount);\n\n// Same rule for time. The default zone is also a machine property.\nDateTimeFormatter.ISO_INSTANT.format(instant);   // machine-readable\nDateTimeFormatter.ofLocalizedDateTime(MEDIUM)\n        .withLocale(userLocale)\n        .withZone(userZone)\n        .format(instant);                        // human-readable',
                    notes: '<p>The rule that covers all of it: <strong><code>Locale.ROOT</code> for machines, the user\'s locale for people, and the JVM default for neither.</strong> The default is whatever the container image, the base OS or an environment variable happened to set, which means it is not a decision anybody made.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong><code>toUpperCase()</code> without a locale is the same bug with sharper teeth.</strong> In a Turkish locale, <code>"i".toUpperCase()</code> is <code>"İ"</code> — a dotted capital I — so <code>"file".toUpperCase().equals("FILE")</code> is false. Real systems have failed on this: protocol keyword matching, case-insensitive header comparison, and enum lookups by uppercased name. Use <code>toUpperCase(Locale.ROOT)</code> for anything that is not being shown to a person, and prefer <code>equalsIgnoreCase</code> for comparisons, which does not have the problem.</p>'
                }
            ],
            docs: [
                { title: 'Formatter — format string syntax', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Formatter.html', kind: 'api' },
                { title: 'Locale', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Locale.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'java-io-time', questionId: 'time-on-the-wire' },
                { topicId: 'java-language', questionId: 'text-blocks' }
            ]
        },

        {
            id: 'string-comparison-traps',
            title: 'The Comparison Traps',
            importance: 'should-know',
            summary: 'Ordering is by UTF-16 code unit, not alphabet. Equality is by code point, not by what the characters look like. Both bite in ways that look like data corruption.',
            interviewAngle: 'A depth question about a type everybody thinks they know. Knowing that compareTo is not a linguistic sort, and that Collator exists, is the practical half.',
            buildsOn: ['formatting-and-locale'],
            blocks: [
                {
                    type: 'types',
                    title: 'Four traps, and what to use instead',
                    items: [
                        { name: 'compareTo is not alphabetical', html: '<p>It compares UTF-16 code units, so every uppercase letter sorts before every lowercase one — <code>"Zebra"</code> before <code>"apple"</code> — and accented characters land after <code>z</code>. For a list shown to a person, use <code>Collator.getInstance(locale)</code>.</p>' },
                        { name: 'Equal-looking strings that are not equal', html: '<p>"é" can be one code point or "e" plus a combining accent. They render identically and <code>equals</code> is false. Normalise with <code>Normalizer.normalize(s, Form.NFC)</code> at the boundary — this is a real cause of duplicate user records.</p>' },
                        { name: 'length() is not the number of characters', html: '<p>It is the number of UTF-16 code units. An emoji is a surrogate pair, so <code>"👍".length()</code> is 2, and <code>charAt</code> gives you half of it. Use <code>codePointCount</code>, or <code>codePoints()</code> to iterate.</p>' },
                        { name: 'split takes a regex', html: '<p><code>split(".")</code> returns an empty array because <code>.</code> matches everything. <code>split("\\\\.")</code> is what was meant, and <code>split("\\\\|")</code> for a pipe. A silent empty result rather than an error.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>Two rules that avoid nearly all of it: <strong>normalise text at the point it enters the system</strong>, not at the point you compare it, and <strong>use <code>equalsIgnoreCase</code> rather than case-folding both sides</strong>, because it does not have the Turkish-I problem. Both are boundary decisions, which is where text problems are cheapest to fix.</p>'
                }
            ],
            docs: [
                { title: 'Collator', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/text/Collator.html', kind: 'api' },
                { title: 'Normalizer', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/text/Normalizer.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'java-language', questionId: 'comparable-vs-comparator' }
            ]
        }
    ]
};
