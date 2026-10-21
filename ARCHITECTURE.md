# Architecture

SpringDeck is a single-page interview-preparation deck for Java and Spring
Boot backend engineering. **There is no build step, no package manager, no
framework and no `node_modules` in the application path.** One `index.html`
loads 142 local scripts in a fixed order, and every file declares one global.

This document explains why it is built that way and what the shape costs. For
what each file does, see [`CODEBASE.md`](CODEBASE.md); for what the deck does
for a reader, see [`FEATURES.md`](FEATURES.md).

---

## The constraint that decided everything

**The page must work when opened from a disk, with every CDN blocked.**

That is not a nostalgia exercise. A deck that someone reads on a train, or
from a memory stick the night before an interview, or inside a corporate
network that blocks unpkg, is a deck that works when it is needed. Every
significant decision below is downstream of it.

It rules out a bundler, because a bundler implies a build and a build implies
a step between the source and the thing that runs. It rules out ES modules,
because `file://` refuses them under the same-origin policy. It rules out npm
dependencies, because a dependency is either vendored — and then it is code
this project maintains without having written — or fetched, and then the page
has a network dependency the reader cannot see until it fails.

What is left is the oldest possible arrangement: ordered `<script>` tags in
one HTML file, sharing one global scope.

## Load order is the dependency graph

There are no imports. **The `<script>` order in `index.html` *is* the
dependency declaration**, and it runs in three bands:

```
  3 optional CDN scripts      three.js, GSAP, ScrollTrigger — decoration only
127 data/*.js                 the two corpora and the three registries
 15 js/*.js                   the application, app.js last
```

Forward references are pervasive and safe. `sidebar.js` calls
`modulesInTrack()`, which `data/theory/index.js` declared long before it;
`theory.js` calls `progressStore`, declared two files earlier; `app.js` calls
into all of them. **Every one of those calls runs from an event handler or
from `initApp()`**, which fires on `DOMContentLoaded` — long after the last
script has been parsed. Nothing executes at load time except a `const`
assignment.

The consequence to keep in mind: **reordering scripts to "fix" a reference
does nothing and can break the data layer**, where order genuinely matters
because `data/index.js` reads the topic globals and `data/modes.js` reads
both corpora.

## Two corpora, deliberately not views of each other

| | Question bank | Theory |
|---|---|---|
| Files | 26 topic files | 83 module files + 15 mode-scope set files |
| Unit | a question | a chapter, made of typed blocks |
| Shape | a lookup — you arrive knowing what you want | a path — you read it in order |
| Size | 486 questions | 687 chapters, 2,045 blocks |

They are not generated from one another and neither is the source of the
other. A question is a thing you can be asked; a chapter is a thing you can
learn. Collapsing them would force one of the two to be a bad version of the
other.

They meet in exactly two places, and both are one-directional:

- **`relatedQuestions`** on a chapter names `{ topicId, questionId }` pairs.
  `validate-theory` refuses one that does not resolve.
- **The search index** flattens both into one list of navigable entries.

## Five modes, one registry

`data/modes.js` is the only file that knows what a mode is. It holds five
entries, each carrying its route, rail order, keyboard digit, group, icon,
accent token, sidebar shape, progress noun, unit and storage key.

| # | Route | Group | Sidebar | Counts |
|---|---|---|---|---|
| 1 | `#questions` | study | topics | KNOWN |
| 2 | `#theory` | study | tracks | READ |
| 3 | `#synthesis` | drill | sets | REHEARSED |
| 4 | `#predict` | drill | sets | SOLVED |
| 5 | `#glossary` | drill | alphabet | SEEN |

`rail.js` contains no list of modes, no icon and no digit — it renders the
registry. `sidebar.js` dispatches on the `sidebar` field rather than on the
mode id. Adding a sixth mode is one entry plus a renderer.

### The five counts are never added together

**No function anywhere in this application sums the five progress counts, and
none ever will.** The five modes count five incompatible units: a question is
*answered*, a chapter is *read*, a drill is *rehearsed*, a puzzle is
*solved*, a term is *seen*. An average over them is a sixth number that is
true of nothing, and a reader who sees "62% complete" will believe it.

`progress.js` therefore exposes five independent stores and no aggregate.
This is checked by reading, not by a validator, and it is listed as an
invariant in `CLAUDE.md`.

## Colour lives in exactly one file

`css/themes.css` holds **every** colour, radius, duration and type step in the
application, as custom properties. The other six stylesheets consume tokens
and contain no colour literal at all:

```bash
grep -nE '#[0-9a-fA-F]{3,8}\b|rgba?\(' css/*.css | grep -v themes.css
```

That grep must return nothing. It found eighteen literals in `print.css` on
the day it was written, which became `--print-*` primitives. **A comment
containing a hex value breaks it too** — the grep does not know what a comment
is, and a comment is not an exemption.

Nine hues plus slate, and **no tenth**. Colour derives from a track: eight
subject tracks each own a hue, mode-scope tracks own none because
`data/modes.js` decides what a mode looks like, and everything without a track
renders slate.

Light and dark are both first-class. The theme is stamped on the root element
by an inline script in `<head>`, before the body parses, so there is no flash.

## No third-party runtime code

Three CDN scripts are loaded and all three are decoration:

- **three.js** — a particle background. `three-bg.js` bails silently on four
  conditions and the page is unaffected in all four.
- **GSAP + ScrollTrigger** — scroll animation. Absent, things simply appear.

Everything else is written here, and the two that would normally be
dependencies are the interesting ones:

- **`code-highlight.js`** — nine grammars, seven token classes, no Prism.
  Vendoring 60 kB of highlighter to survive `file://` was the alternative.
- **`diagrams.js`** — flowchart, sequence and animation renderers emitting
  SVG. No Mermaid, no D3, no canvas. A diagram is `diagramConfig` data, so it
  inherits the theme, reflows, prints, and **can be validated** — which is why
  `checkDiagram()` in `tools/schema.js` can catch a sequence diagram authored
  with `steps` instead of `messages`.

## Routing

Every route is a hash fragment, because a fragment is the only kind of URL a
static page can own without a server rewriting anything. `file://` and a web
host behave identically.

```
#questions/collections            #theory/hashmap-internals
#predict/predict-sql              #glossary/i
#questions/collections?tier=must-know&cram
```

Three rules that are load-bearing:

- **Legacy bare segments normalise rather than 404.** `#collections` becomes
  `#questions/collections`. An unknown segment gives the empty state.
- **`?cram` and `?tier=` survive navigation and are shareable.**
- **Scroll-driven hash updates use `replaceState`; only clicks use
  `location.hash`.** Otherwise reading a page fills the back button with
  history nobody asked for.

## Validators stand in for tests

There is no test framework. Seven zero-dependency Node scripts in `tools/`
are the entire safety net.

The trick that makes them possible is `tools/load-corpus.js`: the data layer
has no module system, so it reads the files **in `index.html` order**,
concatenates them, and evaluates the whole thing as one script inside a `vm`
context — exactly what the browser does, minus the DOM. The load order is read
out of `index.html` rather than duplicated, because a second list would drift
and the drift would be silent.

| Tool | Checks |
|---|---|
| `validate-questions.js` | 7 — tiers, ids, references, images, `stdout` claims, languages, allowed tags |
| `validate-theory.js` | 12 — prerequisite ordering, `relatedQuestions` resolution, escaped-vs-markup fields, trace shape |
| `validate-nav.js` | 6 — track and mode registries, reserved segments, **and the five totals as hard numbers** |
| `validate-search.js` | 6 — route resolution, ranking, glossary slugs, SQL identifiers |
| `check-offline.js` | local references case-exact, remote ones optional, `localStorage` guarded |
| `run-snippets.js` | the 58 `stdout` claims, compiled and executed twice each |
| `check-doc-links.js` | 1,365 URLs — status, redirects, meta-refresh stubs, fragments |

**`validate-nav.js` holds the five mode totals as hand-written numbers.**
Changing the corpus means changing `EXPECTED_TOTALS` in the same commit. If
that feels like friction, that is the check working — a refactor that quietly
halves the Predict total is what it exists to catch, and *"a number appeared"
is not a check.*

## What this architecture costs

Stated plainly, because every one of these is a real price:

- **142 script tags.** On a cold `file://` load that is 142 file reads. It is
  fast enough, and it is the cost of having no build step.
- **One global scope.** Nothing enforces that a file declares only what it
  means to. The discipline is convention plus `check-offline.js`.
- **No type checking, anywhere.** A misspelled field in a data file produces a
  soft failure in a renderer, which is why `checkDiagram()` and the
  escaped-versus-markup check exist — **anything that fails soft in the
  renderer needs a hard check in the toolchain, because the page will not tell
  you.**
- **A CSS custom-property typo is silent.** `var(--typo)` is an unset
  property, not an error. The colour grep cannot see it and no validator reads
  CSS. One shipped in Phase 2 and was found by looking at the page.
- **The validators cannot read prose.** They check structure. Phase 10 read
  all 486 questions by hand and found one answer wrong that every tool had
  passed; see [`docs/triage/SUMMARY.md`](docs/triage/SUMMARY.md).
