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

## Running it

There is no build step. Open `index.html` from disk and it works.

For a local server with correct MIME types:

```bash
node tools/dev-server.js
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
