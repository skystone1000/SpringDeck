# SpringDeck

An interview-preparation deck for **Java and Spring Boot backend engineering**.

Five modes, two corpora, one page:

| Mode | What it holds |
|---|---|
| **Questions** | A bank to test yourself against, filed by topic |
| **Theory** | A curriculum to learn from, in dependency order |
| **Interview Synthesis** | Timed drills — machine coding, design, debug, review |
| **Predict the Output** | Commit-then-reveal puzzles with a determinate answer |
| **Glossary** | Every term the curriculum defines, harvested rather than authored |

---

## New here? Read in this order

1. **This section** — what the repo is and how to run it.
2. **[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)** — why there is no build
   step, how the pieces fit, and what the shape costs. Read this before any
   source file.
3. **[`docs/CODEBASE.md`](docs/CODEBASE.md)** — where everything lives, the
   entry points, the commands, the conventions.
4. **[`docs/FEATURES.md`](docs/FEATURES.md)** — what the deck does for a
   reader, and which modules implement each feature.
5. **[`CLAUDE.md`](CLAUDE.md)** — the standing protocol for changing this
   repository, including the invariants and the plan/audit naming convention.

## Set it up and run it

There is **nothing to install**. No build step, no package manager, no
`node_modules` in the application path.

```bash
git clone <this repo>
cd SpringDeck

open index.html            # that is the whole application
```

Opening it from disk is not a fallback — it is a supported mode and a checked
invariant. A local server is available if you want one:

```bash
node tools/dev-server.js   # http://localhost:4173, zero dependencies
```

**Node is needed only for the checkers in `tools/`**, never to run the deck.
Any recent Node works; there is no `package.json` because there are no
dependencies. `tools/run-snippets.js` additionally needs a JDK, which it finds
itself and names in its output.

## Contributing

Every change to `data/` or the navigation has to pass the validators, and they
are the entire test suite:

```bash
node tools/validate-theory.js && node tools/validate-questions.js \
  && node tools/validate-nav.js && node tools/validate-search.js
```

Three things worth knowing before your first change:

- **The `<script>` order in `index.html` is the dependency graph.** There are
  no imports. Adding a data file means adding a tag; a file only on disk is not
  loaded and not validated.
- **`tools/validate-nav.js` holds the five mode totals as hand-written
  numbers.** Changing the corpus means stepping `EXPECTED_TOTALS` by hand in
  the same commit. That friction is the check working.
- **`css/themes.css` is the only file allowed a colour literal.** This grep
  must return nothing:

  ```bash
  grep -nE '#[0-9a-fA-F]{3,8}\b|rgba?\(' css/*.css | grep -v themes.css
  ```

Then see [`docs/CODEBASE.md`](docs/CODEBASE.md) for where to look to do a
common task, and [`CLAUDE.md`](CLAUDE.md) for the full invariant list and the
commit conventions.


## What is built

**All eleven phases are complete.** Five modes, both corpora, and the two
passes that check them: every `stdout` pane compiled and executed against a
real JDK, all 1,446 documentation links followed, all 486 questions read once
against four judgements, and all 687 theory chapters read chapter by chapter.
What each pass found — and what it could **not** check — is in
[`docs/audits/`](docs/audits/) — the verification log, the question-bank
triage and the chapter-by-chapter theory read.

**Questions mode** — all 26 topics, 486 questions, 63 code
snippets and 19 diagrams, across every one of the eight subject tracks plus
one topic that belongs to none of them.

| Track | Topics | Questions |
|---|--:|--:|
| Java & the JVM | 6 | 177 |
| The Spring Container & Boot | 3 | 65 |
| HTTP, REST & the Web Layer | 2 | 40 |
| Data, SQL & Transactions | 4 | 68 |
| Security & API Hardening | 1 | 19 |
| Microservices, Messaging & Scale | 3 | 40 |
| Testing, Observability & Operations | 4 | 43 |
| Design, Patterns & Architecture | 2 | 24 |
| Everything else | 1 | 10 |

216 are must-know, 192 should-know and 78 good-to-know. The distribution is
deliberate rather than uniform: `java-language` has 44 questions and `cloud`
has 9, because one of them is asked in every interview and the other is asked
when it is relevant.

The later topics are weighted towards judgement rather than recall, because
that is what they are asked for. When a parallel stream helps — rarely, and
here are the five conditions. Whether to split a monolith — usually not, and
here is the test. Whether hexagonal architecture is worth it — only if there
is a domain to protect. A candidate who can only list benefits has read about
microservices; one who can say what database-per-service takes away has run
them.

**Theory mode is complete** — 83 modules and 687 chapters across all eight
tracks, in one global dependency order rather than one order per track. The
cross-track prerequisites are the whole reason that order exists: transactional
propagation cannot be taught before transactions, transactions cannot be taught
before the container that manages them, and the outbox pattern cannot be taught
before either. Twenty-three of the 98 prerequisites cross a track boundary.

| Track | Modules | Chapters |
|---|--:|--:|
| Java & the JVM | 20 | 163 |
| The Spring Container & Boot | 7 | 51 |
| HTTP, REST & the Web Layer | 8 | 64 |
| Data, SQL & Transactions | 14 | 121 |
| Security & API Hardening | 6 | 48 |
| Microservices, Messaging & Scale | 11 | 86 |
| Testing, Observability & Operations | 10 | 86 |
| Design, Patterns & Architecture | 7 | 68 |

390 chapters are must-know, 245 should-know and 52 good-to-know, and the path
carries 761 documentation links and 825 references back into the question bank,
every one of which resolves.

The persistence track ends where a schema meets production: expand and
contract, backfilling a large table without holding a lock, replication lag,
partitioning, and the argument for not sharding yet. Every claim about engine
behaviour names its engine and its version, because most of them are only true
of one — adding a column with a constant default stopped rewriting the table in
PostgreSQL 11, and still rewrites it for a volatile one.

The later tracks are threaded rather than stacked. The dual-write problem is
named three times before it is solved — once where a document store makes it
tempting, once where idempotency makes it survivable, and once in the outbox
chapter that actually fixes it. Read-your-writes appears as a saga's UI
problem, a CQRS projection's lag and a read replica's replication lag, which
are the same problem at three scales. The `ThreadLocal` that carries a security
principal, a trace context and a logging MDC is one mechanism with three
symptoms, and the deck says so in all three places.

A chapter is built from twelve block types — prose, definition, types, syntax,
table, comparison, pitfall, tip, diagram, drill, predict and version. The last
one exists because half of what an interview asks about Java and Spring changed
in a specific release, and prose cannot hold "this was true until Java 24"
without reading as a hedge.

Filter by importance with the chips, or share a filtered view directly —
`?tier=must-know#questions/jpa-hibernate` opens exactly what you were looking
at. `?cram` is the same thing in one flag. Progress is stored per question in
`localStorage`, and each mode counts its own noun; nothing adds them together.

**The other three modes are complete too.** Synthesis holds 46 drills across
four sets, one per interview round: eight ninety-to-hundred-and-twenty-minute
machine coding builds, twelve forty-five-minute design exercises, fifteen
focused implementation tasks, and eleven debug-and-review exercises — the
round-5 material almost nobody rehearses.

| Tier | Round | Drills | Minutes |
|---|---|--:|--:|
| 1 — Machine coding | 2 | 8 | 90–120 |
| 2 — System design | 4 | 12 | 45 |
| 3 — Focused implementation | 3 | 15 | 20–45 |
| 4 — Debug, review, extend | 5 | 11 | 20–40 |

The tier-2 drills carry no code sketch and every other tier does, which is a
decision rather than an inconsistency: a design round is a conversation, and
an outline would be answering the machine-coding question instead.

Predict holds 81 puzzles across eleven sets. Thirty of them are complete
deterministic Java programs whose output a runner re-executes and diffs; the
other 51 declare `behaviour`, `query-count`, `sql-result` or `http-response`
instead, each with a `verification` string naming the specification section
its answer was read from. That split is not squeamishness. A lost-update
counter prints a different number on every machine, a `serialVersionUID`
mismatch needs two compilations of one class, and a `@Transactional` rollback
needs a proxy — a deck that shows a console frame over any of them is
teaching that the number is the lesson.

Every SQL answer names PostgreSQL 16, and says what MySQL would answer where
the two differ. Every Maven answer names Maven 3, and says that Gradle
resolves the same dependency graph to a different version.

The Glossary is harvested from the `definition` blocks in the chapters that
teach them, never authored, so a term arrives with its chapter already
attached.

**Search covers both corpora and groups by mode.** One box, five groups, and
the entry it finds is the thing you navigate to: a question opens expanded, a
chapter is scrolled to, a term lands under its own letter. It indexes code, so
an identifier out of a `sql` snippet finds the chapter that explains it — and
it indexes a predict puzzle's prompt and code but never its options, its answer
or its output pane, because a search box that prints the answers makes the one
block type that withholds something pointless.

The rail switches modes with digits 1–5 and remembers where you left each one.
**Each mode counts its own noun** — known, read, rehearsed, solved, seen — and
nothing anywhere adds them together. Five incompatible units averaged into one
number would be a sixth number true of nothing, and it would mislead in the
direction that hurts: somebody who has read every chapter and sat no drill is
not half ready for anything.

## Checking it

The validators are the test suite. Run them before any commit that touches
`data/` or the navigation:

```bash
node tools/validate-theory.js && node tools/validate-questions.js && node tools/validate-nav.js && node tools/validate-search.js
```

`validate-questions.js` runs seven checks: every question carries an importance
tier, ids are unique within a topic and cross-topic collisions are asserted as a
complete list, every must-know question carries a reference link, image paths
resolve and are attributed, `stdout` is refused for any language the runner
cannot execute, snippet languages are ones the highlighter knows, and authored
HTML stays inside a fixed tag subset.

`validate-theory.js` runs twelve, and two of them are the reason it exists: every
module prerequisite must resolve to a **strictly lower** position in the reading
order, which is what makes the path a path; and every `relatedQuestions`
reference must resolve against the question bank, so a question id invented
while writing a chapter fails the build instead of dangling. The eleventh is
newer and duller: a block's strings are either markup or words, the renderer
escapes the second kind, and a `<code>` tag written into one of them renders
as literal angle brackets on the page without failing anything at all. The
twelfth is its sibling: an output pane declared `trace` renders as a numbered
list of steps, so a console transcript pasted into one becomes "1. count
2. ------- 3. 0" and nothing anywhere objects.

`validate-search.js` runs six, and it exists because search fails soft in the
worst way: a result whose route does not resolve navigates to an empty state,
and a mode nobody indexed simply returns nothing. Neither prints anything to a
console. It is able to check the real ranking functions rather than a
reimplementation of them because `js/search-index.js` touches no DOM.

And, for the invariant that the page works from disk:

```bash
node tools/check-offline.js
```

Two more take longer, because one needs a JDK and the other needs the network.
They are not part of the pre-commit chain:

```bash
node tools/run-snippets.js --selftest
node tools/check-doc-links.js
```

`run-snippets.js` compiles and runs every snippet that claims a literal
`stdout` pane — 58 of them — and diffs the real output against the authored
lines. Each runs **twice**, and the two runs must agree with each other before
either is compared to the corpus, because a snippet whose output depends on
hash order or thread interleaving can match once by luck. The other 86 output
panes are `trace`, which is prose about behaviour that no runner can confirm,
and the summary counts them out loud rather than passing over them.

`check-doc-links.js` checks all 1,446 documentation URLs — 793 distinct. Not
just the status: it reads the body, because a page can answer 200 and bounce
the reader elsewhere from a `<meta http-equiv="refresh">`, and four of this
deck's links were doing exactly that. It also checks that a cited `#fragment`
still exists, counting the page's own navigation as evidence for the many
documentation sites that build their sections in script.

**Both take `--selftest`, and both should be given it.** A runner that always
returns "matched" and a corpus that is entirely correct print the same thing.
The first time `run-snippets --selftest` ran, one of its four probes found a
real defect in the runner.

What Phase 9 found by running these — and, more usefully, what it could not
check — is in [`docs/audits/audit_1_verification-log.md`](docs/audits/audit_1_verification-log.md).

To see the data layer the way the browser assembles it:

```bash
node tools/load-corpus.js
```

## Scope

Java is the only backend language in this deck. That is a decision, not an
omission — see [`docs/plans/plan_2_springdeck.md`](docs/plans/plan_2_springdeck.md) §2.4.

DSA practice is deliberately outside it: that needs a judge that runs your code
against hidden tests, which a static site cannot be.

## Documentation

Everything lives in [`docs/`](docs/). Current-state documents describe the deck
as it is now; plans and audits are a sequential, numbered record of how it got
here.

**Current state — start here:**

| Document | What it answers |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | why the shape is the shape, how the pieces interact, what it costs |
| [`docs/CODEBASE.md`](docs/CODEBASE.md) | where everything is, entry points, commands, conventions |
| [`docs/FEATURES.md`](docs/FEATURES.md) | what the deck does, and which modules implement each feature |

**Plans** — [`docs/plans/`](docs/plans/), named `plan_<N>_<feature-slug>.md`:

| Plan | Status |
|---|---|
| [`plan_1_deck-blueprint.md`](docs/plans/plan_1_deck-blueprint.md) — the fixed architecture, generalised to any interview subject | active |
| [`plan_2_springdeck.md`](docs/plans/plan_2_springdeck.md) — the Java content manifest and the eleven build phases | completed |

**Audits** — [`docs/audits/`](docs/audits/), named `audit_<N>_<feature-slug>.md`:

| Audit | Status |
|---|---|
| [`audit_1_verification-log.md`](docs/audits/audit_1_verification-log.md) — the `stdout` claims executed, every URL followed | completed |
| [`audit_2_triage-summary.md`](docs/audits/audit_2_triage-summary.md) — all 486 questions read against four judgements | completed |
| [`audit_3_other-modes.md`](docs/audits/audit_3_other-modes.md) — the mechanical pass over the other four modes | superseded by `audit_4` |
| [`audit_4_theory.md`](docs/audits/audit_4_theory.md) — all 687 chapters, 46 drills and 81 predicts read; fifteen defects | completed |

Per-question evidence for `audit_2` is 26 files under
[`docs/audits/evidence/triage/`](docs/audits/evidence/triage/), one per topic,
one table row per question.

**Adding a plan or an audit?** Continue the numbering — never restart it — and
reuse the feature's existing slug if it has one. The convention is stated in
full in [`CLAUDE.md`](CLAUDE.md).
