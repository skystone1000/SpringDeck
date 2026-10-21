# Codebase

Where everything is and what it is responsible for. For *why* the shape is
what it is, see [`ARCHITECTURE.md`](ARCHITECTURE.md).

```
index.html          145 script tags — 3 optional CDN, 127 data, 15 application
css/       2,740 lines   7 stylesheets, loaded in order
data/                   127 files — two corpora and three registries
js/        5,049 lines  15 files, app.js last
tools/     3,495 lines   7 validators plus a corpus loader, a schema and a server
docs/                   the plan, the blueprint, the verification log, 27 triage files
assets/img/             empty on purpose — see its README
```

---

## `index.html`

The only HTML file. It carries the shell — rail, sidebar, header, content
region, search panel — and the ordered script tags that *are* the dependency
graph. An inline script in `<head>` stamps `data-theme` on the root element
before the body parses, so there is no flash of the wrong theme.

**Editing the load order is editing the dependency graph.** `tools/
load-corpus.js` reads that order out of this file rather than duplicating it,
so a data file added here is validated automatically and one added only to
disk is not loaded at all.

## `css/` — seven stylesheets, in order

| File | Lines | Holds |
|---|---|---|
| `themes.css` | 350 | **every colour, radius, duration and type step in the application.** Light and dark. Nine hues plus slate |
| `styles.css` | 270 | element defaults, layout primitives, the `[hidden]` override |
| `components.css` | 699 | cards, chips, badges, the code block and its gutter, the search panel |
| `rail.css` | 343 | the mode rail and the contextual sidebar |
| `theory.css` | 767 | the twelve block types and the diagram surface |
| `animations.css` | 131 | transitions and the reduced-motion opt-out |
| `print.css` | 180 | the printed page; hides the gutter so a wrapped line cannot misnumber the rest |

`themes.css` is first because everything after it consumes its tokens.
**No other stylesheet may contain a colour literal** — see the grep in
`ARCHITECTURE.md`.

Two failure modes to know about, because neither produces an error:

- **`var(--typo)` is an unset property, not a mistake.** The colour grep
  cannot see it and no validator reads CSS.
- **A selector that matches nothing is invisible.** The predict reveal pane
  was styled `.predict-card.is-revealed` while the renderer emitted
  `.block-predict`, so the feature never appeared from Phase 3 until someone
  exercised it.

## `data/` — the corpora

### The question bank — 26 files, 486 questions

One file per topic, `data/<topic-id>.js`, each declaring one global. A topic
carries `id`, `title`, `subsections[]`, `keyTopics[]` and `questions[]`.

A question carries `id`, `importance`, `subsection`, `question`, `answer`,
`referenceLinks[]`, `tags[]`, `images[]`, `hasDiagram`, `diagramType`,
`diagramConfig` and `codeSnippets[]`.

Two field names that cost time if you guess: it is **`codeSnippets`**, not
`snippets`; and `docHub` is **an object** `{ title, url }`, not a string.

### Theory — 98 module files

`data/theory/<module>.js` for the 83 reading-path modules,
`data/theory/sets/<set>.js` for the 15 mode-scope sets that back Synthesis and
Predict. A module carries `id`, `trackId`, `order`, `title`, `tagline`,
`estimatedMinutes`, `prerequisites[]`, `docHub` and `chapters[]`; a chapter
carries `blocks[]`, `docs[]` and `relatedQuestions[]`.

Twelve block types: `prose`, `definition`, `types`, `syntax`, `table`,
`comparison`, `pitfall`, `tip`, `diagram`, `drill`, `predict`, `version`.

**The set files are theory modules in every mechanical sense** — the same
validator, the same renderers, the same progress keys. They are kept off the
reading path by *scope* rather than by a second array, so
`modulesInTrack('synthesis')` finds them and `subjectTracks()` does not.

### The three registries

- **`data/index.js`** — the track registry shared by both corpora, plus
  `topicTracks`, `languages[]` (nine, and a tenth is an error) and the topic
  lookups. There is deliberately no second track list for theory; two
  registries would let the Persistence questions and the Persistence chapters
  end up different colours with nothing to say that was an accident.
- **`data/theory/index.js`** — assembles the module globals into reading
  order, sorted by `order`, plus `modulesInTrack()` and
  `blocksOfTypeInTrack()`. The latter is how the glossary, Synthesis and
  Predict all get their content without a corpus of their own.
- **`data/modes.js`** — the five modes. **The only file that knows what a mode
  is.**

## `js/` — fifteen files, `app.js` last

Each declares one global and does nothing at load time.

| File | Lines | Responsibility |
|---|---|---|
| `theme.js` | 82 | the switch and the persisted choice; the theme is already applied |
| `three-bg.js` | 131 | optional particle background; bails silently on four conditions |
| `code-highlight.js` | 292 | nine grammars, seven token classes, the line gutter. No Prism |
| `diagrams.js` | 447 | flowchart, sequence and animation, emitted as SVG. No Mermaid |
| `progress.js` | 316 | **five stores, five nouns, and no sixth number** |
| `search-index.js` | 531 | flattens both corpora into navigable entries. **Touches no DOM** |
| `rail.js` | 193 | the mode switcher, built entirely from the registry |
| `sidebar.js` | 297 | one panel, four shapes, dispatched on `mode.sidebar` |
| `navigation.js` | 277 | the router; hash routes, legacy normalisation, `?cram` and `?tier=` |
| `theory.js` | 864 | the Theory mode and the twelve block renderers |
| `synthesis.js` | 195 | the drill mode — renders `drill` blocks with theory's renderer |
| `predict.js` | 192 | the predict mode — theory's renderer **and its binder** |
| `glossary.js` | 254 | harvested from `definition` blocks; never authored |
| `search.js` | 275 | the panel only — input, keyboard, focus, escaping |
| `app.js` | 703 | `initApp()`, the Questions mode, and nothing else. **Loads last** |

Three of these deserve their reasoning stated:

**`search-index.js` touches no DOM on purpose.** That is what lets
`validate-search.js` load it into the same `vm` context as the corpus and
check the *real* ranking functions rather than a reimplementation of them. A
reference to `document` in this file throws in Node, loudly, which is the
right answer — it means the pure half stopped being pure.

**`predict.js` reuses theory's binder, not just its renderer.** A verdict
recorded in Predict mode and a verdict recorded on the same puzzle inside a
chapter are the same write. The two screens cannot disagree about what is
solved because there is only one place that decides.

**`glossary.js` harvests.** Every entry is a `definition` block that already
exists in the chapter that teaches it, so a term arrives with its chapter
attached and the backlink is a property of the data rather than a second
thing to maintain.

## `tools/` — the safety net

| File | What it is |
|---|---|
| `load-corpus.js` | reads the data layer the way the browser does — `index.html` order, one `vm` context. **Everything else builds on it** |
| `schema.js` | the vocabulary both content validators share, so they cannot drift. Tiers, languages, block types, allowed tags, `htmlIssues`, `checkDiagram`, `existsCaseExact` |
| `validate-questions.js` | 7 checks over the question bank |
| `validate-theory.js` | 12 checks over the theory corpus |
| `validate-nav.js` | 6 checks over the registries, including the five totals as hard numbers |
| `validate-search.js` | 6 checks over the search index — the only one that reads a file out of `js/` |
| `check-offline.js` | the `file://` invariant: local references case-exact, remote optional, `localStorage` guarded |
| `run-snippets.js` | compiles and runs the 58 `stdout` claims. `--selftest` first |
| `check-doc-links.js` | 1,365 documentation URLs. `--selftest` needs no network |
| `dev-server.js` | zero-dependency static server |

Before any commit touching `data/` or the navigation:

```bash
node tools/validate-theory.js && node tools/validate-questions.js && node tools/validate-nav.js && node tools/validate-search.js
```

**Run the validators as a separate call and read the output before staging
anything.** Chaining them behind `&&` on the same line as a `git commit` lets
the commit run regardless; that has happened here, and the check caught its
own author only afterwards.

`ls tools/` is the authority on what exists. This table has been wrong before.

## `docs/`

| File | What it is |
|---|---|
| `DECK-BLUEPRINT.md` | the architecture, fixed. Read before touching anything |
| `SPRINGDECK-PLAN.md` | the content manifest and the eleven build phases |
| `verification-log.md` | what Phase 9 checked, what it found, and what it could **not** check |
| `triage/SUMMARY.md` | the Phase 10 read of all 486 questions |
| `triage/<topic-id>.md` | 26 files, one per topic, one table row per question |

## Where to start reading

To understand the shape: `index.html`, then `data/modes.js`, then `js/app.js`
from `initApp()` downward.

To add a question: one file in `data/`, then
`node tools/validate-questions.js`, then step `EXPECTED_TOTALS` in
`tools/validate-nav.js` by hand in the same commit.

To add a block type: `tools/schema.js` (`BLOCK_TYPES` and the field tables),
`js/theory.js` (the renderer), `css/theory.css` (the styles), and a check in
`validate-theory.js` for whatever the renderer will fail soft on.
