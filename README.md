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
snippets and 14 diagrams. The other four modes are frames without content yet.

| Topic | Questions | | Topic | Questions |
|---|--:|---|---|--:|
| Java Language & OOP | 44 | | REST APIs & Spring MVC | 22 |
| Collections Framework | 26 | | JPA & Hibernate | 21 |
| Concurrency & Multithreading | 29 | | Transactions & Concurrency Control | 16 |
| Spring Core & DI | 27 | | SQL & Database Design | 21 |
| Spring Boot & Auto-Configuration | 24 | | AOP, Proxies & Annotations | 14 |

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
node tools/validate-questions.js
```

Seven checks: every question carries an importance tier, ids are unique within
a topic and cross-topic collisions are asserted as a complete list, every
must-know question carries a reference link, image paths resolve and are
attributed, `stdout` is refused for any language the runner cannot execute,
snippet languages are ones the highlighter knows, and authored HTML stays
inside a fixed tag subset.

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
