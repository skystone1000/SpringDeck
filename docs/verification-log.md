# Verification log — Phase 9

What was checked, how, what it found, and — at the end, deliberately —
**what was not checked**. A verification report that lists only its successes
reads as a claim about the whole corpus.

Run on **2026-10-16**, against the corpus at that date: 26 topics / 486
questions, 83 theory modules / 687 chapters, 46 drills, 81 predicts, 61
glossary terms.

---

## 1. The JDK that unblocked this phase

Phase 9 was recorded as blocked from Phase 3 onward, on the belief that this
machine had no JDK. It had one all along.

```
/Applications/Android Studio.app/Contents/jbr/Contents/Home
openjdk version "25.0.2" 2026-01-20  —  javac 25.0.2 included
```

`java -version` on the PATH fails and `/usr/libexec/java_home` reports
nothing, which is what the note in `CLAUDE.md` was based on and is not the
same question as "is there a JDK on this machine". Android Studio bundles the
JetBrains Runtime, which is a complete JDK with a compiler, not a JRE.

**Eight phase gates deferred an item on evidence that was never re-examined.**
`run-snippets.js` now searches a broad list of candidate homes and prints the
one it chose on every run, so a green result can always be attributed to a
compiler and a version.

---

## 2. Executable output — `run-snippets.js`

**58 `stdout` claims, executed twice each. All 58 match.**

Every one is Java; the validators refuse a `stdout` claim on any other
language and this run asserts the same thing from the other side.

Each snippet runs **twice**, and the two runs must agree with each other
before either is compared to the corpus. A snippet whose output depends on
hash order, thread interleaving or wall-clock time can match the authored
lines once by luck; it very rarely does it twice. Nothing in the corpus
tripped this, which is a fact about the corpus rather than about the check —
the check was proved separately, below.

### `--selftest` — four cases with known answers

A runner that always returns "matched" and a corpus that is entirely correct
produce identical output. Four probes go through the same `verify()` path:
one that must pass, three that must fail, each for a different reason.

| Probe | Expected | Result |
|---|---|---|
| a claim that is true | matches | matches |
| a claim that is false | reports the differing line | `line 2: expected "5", got "4"` |
| code that does not compile | reports a non-zero exit | reports the javac error |
| code that never finishes | reports a timeout | reports the timeout |

**On the first run the fourth probe failed**, reporting "the JVM exited
non-zero" instead of a timeout: `execFileSync` leaves `error.killed`
undefined and signals a timeout through an undocumented `code` field.
`runOnce` uses `spawnSync` now, which returns the two cases as
distinguishable fields. The selftest caught a defect in the tool before the
tool made a single claim about the corpus.

### Three defects found, all shipped years of phases ago

None was a typo. Each was a snippet doing something other than what its
author believed, which is the class of defect no amount of re-reading finds.

**`java-language:initialisation-order` demonstrated nothing.** The snippet
exists to show a `final` field observed as `null` because an overridable
method ran during `super()`. It printed the field's value instead:
`private final String name = "literal"` is a compile-time constant and javac
inlines those at every use site, so the override never read a field at all.
The initialiser is now a method call, and the reason is a comment inside the
snippet — the constant-folding rule is exactly why a reader who tries this at
home concludes the hazard is folklore.

**`java-language:records-what-they-give-you` threw.** `Set.of(a, b)` does not
collapse a duplicate, it rejects one — `IllegalArgumentException: duplicate
element` — so the line meant to prove two equal records are one instance
killed the program four lines in. `Set.copyOf` over a `List` does what was
wanted.

**`predict-io-and-time-inner-class-holds-the-outer-instance` was wrong
twice.** It claimed a synthetic field named `this$1`, which is `this$0`; and
on JDK 25 there is no such field at all, because **javac only emits the outer
reference when the inner class actually uses the enclosing instance**, and
the `Inner` in the snippet did not. The class now reads a field of its outer.
The rewrite also stopped printing field names, because `getDeclaredFields()`
promises no order whatsoever — a transcript of names is a claim about one
compiler on one day, and counting the fields says the same thing about every
compiler.

**The general shape:** an unverified `stdout` pane tends to be wrong not about
the lesson but about the mechanism it picked to show it.

---

## 3. Documentation links — `check-doc-links.js`

**1,365 links, 762 distinct URLs. Zero errors after the fixes below.**

| | |
|---|---|
| answered 2xx, no redirect, no refresh stub | **757** |
| on an allow-list, each with its reason | 5 |
| live pages whose `#fragment` was not found | 9 — all Kafka, see below |

Four checks, in an order that matters because each catches pages the one
before it waves through: the URL parses and is https; it answers 2xx with no
redirect; the body is not a meta-refresh stub; a `#fragment`, if there is
one, exists in the document.

### The meta-refresh blind spot is closed, and it was real

`CLAUDE.md` carried a note from Phase 3 saying a link checker "cannot see an
HTML meta-refresh", that Spring's documentation restructuring left stubs that
answer 200 and bounce the reader from inside the markup, and that a manual
pass should therefore be budgeted. It can see one. Reading the first
megabytes of each HTML body costs seconds across the whole corpus.

**Four stubs were found, and every status-code-only checker on earth calls
them alive:**

| Cited URL | Refreshes to |
|---|---|
| `projectreactor.io/docs/core/release/reference/` | `aboutDoc.html` |
| `redis.io/…/develop/use/patterns/distributed-locks/` | `…/develop/clients/patterns/…` |
| `jeremylong.github.io/DependencyCheck/` | `dependency-check.github.io/…` |
| `owasp.org/Top10/A06_2021-…/` | `owasp.org/Top10/2021/A06_2021-…/index.html` |

### 57 broken links, resolved and fixed

49 redirects, 4 dead, 4 stubs. Every one was chased to its final destination
and the destination checked before the corpus was touched — a checker that
reports a 301 tells you where the publisher went, not whether what it points
at is the page the deck meant.

Two findings changed what the fix was.

**Oracle answers a missing page with a 200 redirect to the current JDK
landing page rather than a 404.** That made five wrong filenames look like
withdrawn documentation. The JDK 21 tree is intact; the deck had been citing
`ergonomics.html`, `garbage-collector-implementation.html`,
`z-garbage-collector.html`, `troubleshoot-memory-leaks.html` and
`troubleshoot-process-hangs-and-loops.html` since Phase 3, and Oracle calls
them `ergonomics1.html`, `garbage-collector-implementation1.html`,
`z-garbage-collector2.html`, `troubleshooting-memory-leaks.html` and
`troubleshoot-process-hangs-loops.html`. These were corrections, not version
bumps, and the deck stays pinned to the LTS it teaches.

**One URL served five different titles.** projectreactor's reference index
was cited as "Schedulers", "Debugging Reactive Applications" and three more,
all landing on the same page — which no reader would notice was wrong and
every reader would be failed by. The same was true of the JUnit user guide
across three links. Each title now has the page it was already claiming to be.

Also corrected: four `#fragment`s that exist nowhere in their page. Hibernate
renamed `entity-pojo-equalshashcode` to `mapping-model-pojo-equalshashcode`,
javadoc renamed the `List` immutability section to `unmodifiable`, and two
Kafka anchors are gone rather than relocated.

### Ten "dead" anchors that were the check

The id-only fragment rule reported **15 dead anchors on live pages. Five were
real. Ten were the check.** `kafka.apache.org/documentation/` is a 19KB shell
whose sections are fetched after load; a spring.io project page renders
`#support` as a client-side tab. Neither carries the id, and both work in a
browser.

A fragment now also counts as live when the page's own navigation links to
it — a different source of truth from the id rule rather than a softening of
it, and the reason this check reports warnings rather than errors. It is not
a free pass: the five real ones appeared **nowhere** in their page, including
its navigation, and all five are fixed above.

The first version of that rule required quoted attributes and still missed
nine, because Kafka writes `href=/documentation#design` with no quotes at
all. Same lesson `metaRefresh()` in the same file already carried.

### The nine warnings that remain

All nine are `kafka.apache.org/documentation/#…` — ten such URLs exist in
the corpus across 26 uses, and one of the ten now passes. Kafka has split its
documentation into per-section pages and keeps the old anchors working with a
JavaScript alias map. **The map's destinations are pinned to a version
number** — today `https://kafka.apache.org/43/design/design/` — so the anchor
form the deck uses is the version-independent one and hard-coding what the
shim resolves to would be the fragile choice.

The cost is real and is recorded rather than hidden: those URLs now land on a
page titled "Documentation Redirect" before the shim runs, so a reader with
JavaScript disabled sees a stub. **If Kafka ever removes the shim, these ten
URLs become the versioned paths.**

The same reasoning allow-lists `docs.junit.org/current/`, whose 302 is a
permanent alias doing its job. The zero-redirect rule is about the corpus
holding a URL the publisher has **replaced**; an alias has not been replaced.

### Two pages that are alive and refuse to say so

`www.toptal.com/big-data/consistent-hashing` and
`www.oreilly.com/library/view/effective-java/9780134686097/` answer 403 to
anything that admits to being a script. **Both were opened by hand in a
browser** and render "The Ultimate Guide to Consistent Hashing" and "Effective
Java, 3rd Edition [Book]". A 403 is a refusal to talk to this program, not a
dead link, and reporting it as dead would send someone to fix a page that is
fine.

---

## 4. The reading pass

The gate asks for **one manual link-reading pass per documentation source**,
because only a human finds a page that was emptied or rewritten for a later
version with no refresh tag. Eighty-odd hosts makes a literal page-by-page
read impractical, so the pass was done in two parts.

**Mechanically, over all 762 live pages:** each page's `<title>` was fetched
and compared with the title the deck gives the link. It is the closest a
machine gets to reading them, and it separates links that are merely cited
loosely from links that are simply wrong. 113 were flagged; **five were real**
and are fixed:

- `JEP 343: Packaging Tool / container awareness notes` pointed at the GC
  ergonomics chapter. JEP 343 is `jpackage`. The URL was right and the title
  had been wrong since Phase 2.
- `Available Collectors — HotSpot Tuning Guide` pointed at
  `available-collectors.html`, which in Oracle's JDK 21 tree serves the
  chapter titled **"Total Heap"**. Their filenames and their contents have
  drifted apart. The collectors are under Garbage Collector Implementation.
- Three smaller ones: a link named for a section of a page now named for the
  whole page, and two retitled by their publishers when the pages moved
  earlier in this phase.

The other 108 were the heuristic. A link to JLS 17.5 titled "final Field
Semantics" lands on "Chapter 17. Threads and Locks", which is correct — the
deck names the section and Oracle titles the chapter. The RFC Editor's
plain-text pages carry no `<title>` at all.

**By hand, in a browser:** the two 403s above, `martinfowler.com/bliki/
CharacterizationTest.html` (genuinely gone — replaced with `LegacySeam.html`,
which is the concept the drill needs), and the Amazon Builders' Library page
that serves "Making retries safe with idempotent APIs" under a `<title>` of
`references-details-empty` — a broken template on their side, not a broken
link on ours.

---

## 5. Figures

**There are none, and the directory is empty for the right reason.** 54
pictures in this deck are `diagramConfig` objects rendered to SVG at run
time. The contract for the day a figure is vendored is written down in
[`assets/img/README.md`](../assets/img/README.md).

`validate-questions.js` check 4 had been broken on purpose against a
*synthetic* entry in Phase 1 and had never seen a real file — a weaker claim
than it sounds, since an `existsSync` on a path that has never existed passes
whether or not the logic around it is right. It was exercised here against a
**genuine PNG written to `assets/img/`**, through all six branches, and one
of them was wrong.

`fs.existsSync` is **case-insensitive on macOS**. A figure vendored as
`probe-figure.png` and cited as `Probe-Figure.png` went green, and would have
404ed the first time the deck was served off Linux or out of a container. The
rule moved to `existsCaseExact()` in `tools/schema.js`, which
`check-offline.js` had been applying to `index.html` since Phase 2 and the
images check had never got. The probe figure was removed afterwards.

---

## 6. What was NOT checked

- **86 trace panes.** Prose about behaviour. No runner can confirm them and
  none pretends to. They are the correct form for anything timing-dependent,
  machine-dependent or racy, and the corpus should keep preferring them.
- **Whether any page still SAYS what the deck cites it for.** The title
  comparison in §4 is a proxy, not a reading. A page rewritten for a later
  version, or emptied and left with a "this content has moved" sentence and
  no refresh tag, answers 200 and titles itself plausibly. `check-doc-links`
  prints this caveat at the end of every run.
- **The SQL, HTTP and behaviour predict artefacts.** 51 of the 81 predicts
  are not `stdout`; each carries a `verification` string naming the engine
  and version it was checked against, and `validate-theory` enforces that the
  string exists. **Nothing re-executes them.** A PostgreSQL 16 container
  would close about half of that gap and is the obvious next tool.
- **`file://` opened by hand.** Ninth gate running. `check-offline.js` passes
  — every local reference relative, present and case-exact, every remote one
  optional, all 12 `localStorage` accesses guarded — but the page itself has
  never been opened from disk in a real browser, because the in-app preview
  rewrites a local file into a `data:` URL and no relative `<script src>` can
  resolve. **It is a limitation of the harness and neither a pass nor a
  failure.** It is the oldest open item in this project.
