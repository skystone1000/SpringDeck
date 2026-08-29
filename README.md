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

## What is built

**Questions mode is complete for the ten core topics** — 244 questions, 49 code
snippets and 14 diagrams.

| Topic | Questions | | Topic | Questions |
|---|--:|---|---|--:|
| Java Language & OOP | 44 | | REST APIs & Spring MVC | 22 |
| Collections Framework | 26 | | JPA & Hibernate | 21 |
| Concurrency & Multithreading | 29 | | Transactions & Concurrency Control | 16 |
| Spring Core & DI | 27 | | SQL & Database Design | 21 |
| Spring Boot & Auto-Configuration | 24 | | AOP, Proxies & Annotations | 14 |

**Theory mode is three tracks in** — 28 modules and 208 chapters, in one global
dependency order rather than one order per track. The cross-track prerequisites
are the whole reason that order exists: transactional propagation cannot be
taught before transactions, and transactions cannot be taught before the
container that manages them.

| Track | Modules | Chapters |
|---|--:|--:|
| Java & the JVM | 14 | 104 |
| The Spring Container & Boot | 7 | 51 |
| HTTP, REST & the Web Layer | 7 | 53 |
| Persistence & Data | — | in progress |

A chapter is built from twelve block types — prose, definition, types, syntax,
table, comparison, pitfall, tip, diagram, drill, predict and version. The last
one exists because half of what an interview asks about Java and Spring changed
in a specific release, and prose cannot hold "this was true until Java 24"
without reading as a hedge.

Filter by importance with the chips, or share a filtered view directly —
`?tier=must-know#questions/jpa-hibernate` opens exactly what you were looking
at. `?cram` is the same thing in one flag. Progress is stored per question in
`localStorage`, and each mode counts its own noun; nothing adds them together.

## Running it

There is no build step and no package manager. Open `index.html` from disk and
it works, including with every CDN blocked — the three script tags are a
particle background and an animation library, and blocking them costs nothing
but decoration.

For a local server:

```bash
node tools/dev-server.js
```

## Checking it

The validators are the test suite. Run them before any commit that touches
`data/` or the navigation:

```bash
node tools/validate-theory.js && node tools/validate-questions.js && node tools/validate-nav.js
```

`validate-questions.js` runs seven checks: every question carries an importance
tier, ids are unique within a topic and cross-topic collisions are asserted as a
complete list, every must-know question carries a reference link, image paths
resolve and are attributed, `stdout` is refused for any language the runner
cannot execute, snippet languages are ones the highlighter knows, and authored
HTML stays inside a fixed tag subset.

`validate-theory.js` runs ten, and two of them are the reason it exists: every
module prerequisite must resolve to a **strictly lower** position in the reading
order, which is what makes the path a path; and every `relatedQuestions`
reference must resolve against the question bank, so a question id invented
while writing a chapter fails the build instead of dangling.

And, for the invariant that the page works from disk:

```bash
node tools/check-offline.js
```

To see the data layer the way the browser assembles it:

```bash
node tools/load-corpus.js
```

## Scope

Java is the only backend language in this deck. That is a decision, not an
omission — see [`docs/SPRINGDECK-PLAN.md`](docs/SPRINGDECK-PLAN.md) §2.4.

DSA practice is deliberately outside it: that needs a judge that runs your code
against hidden tests, which a static site cannot be.

## Documentation

- [`docs/DECK-BLUEPRINT.md`](docs/DECK-BLUEPRINT.md) — the architecture, and why it is shaped the way it is
- [`docs/SPRINGDECK-PLAN.md`](docs/SPRINGDECK-PLAN.md) — what backend interviews ask, and the content manifest that answers it
- [`CLAUDE.md`](CLAUDE.md) — working notes, commands, invariants
