# Features

What the deck does for someone preparing for a Java or Spring Boot backend
interview. For how it is built, see [`ARCHITECTURE.md`](ARCHITECTURE.md) and
[`CODEBASE.md`](CODEBASE.md).

---

## Five modes, five different kinds of work

Switch with the rail, or with the digits **1**–**5**. A digit typed into the
search box is a digit.

### 1 · Questions — `#questions`

**486 questions across 26 topics**, each with a full written answer, an
importance tier, reference links and — where it helps — a runnable code
snippet or a diagram.

- **Three tiers.** `must-know` (216), `should-know` (192), `good-to-know`
  (78). Filter by tier with the chips; the filter is written into the URL as
  `?tier=` and **survives navigation to another topic**.
- **Question numbers do not renumber under a filter.** Card 27 is still card
  27 with the first twenty-six hidden, so a number you noted stays valid.
- **Cram mode** (`?cram`) collapses every answer to the question alone, for a
  pass where you are testing recall rather than reading.
- **Progress is per question**, keyed `topicId:questionId`, and the sidebar
  count, the header bar and the rail meter all follow a toggle.

### 2 · Theory — `#theory`

**687 chapters across 83 modules and 8 subject tracks**, in a global reading
order with 98 declared prerequisites, 23 of which cross a track boundary.

Each module has a tagline, an estimated reading time, a documentation hub and
chapters built from **twelve block types**: prose, definitions, type tables,
syntax blocks, comparison tables, pitfalls, tips, diagrams, drills, predict
puzzles and version blocks.

- **Every prerequisite resolves to a strictly lower position in the reading
  order.** That is what makes the path a path, and `validate-theory` enforces
  it.
- **Version blocks carry the release a claim became true in** — `Java 21 →
  was`, `Java 24 → changed` — so a fact with a shelf life says so.
- **Chapters link to the questions that drill them**, and the questions link
  back through search.

### 3 · Synthesis — `#synthesis`

**46 design and implementation drills across four tiers**, from machine-coding
exercises through system design, focused implementation, and debug-and-review.
A drill is a prompt, a set of things to watch for, and — in tier 3 — a sketch
of the shape a good answer takes.

### 4 · Predict — `#predict`

**81 puzzles across eleven sets.** Read the code, predict what it does, then
reveal. Answers are recorded as a **map** — right, wrong, or not yet answered
— because "not attempted" and "got it wrong" are different facts about your
preparation.

Five artefact kinds, because backend has more than one determinate output:
`stdout`, `sql-result`, `http-response`, `query-count` and `behaviour`.

**Thirty of them claim literal console output, and all thirty have been
compiled and run.** `tools/run-snippets.js` executes each twice against a real
JDK and requires the two runs to agree with each other before comparing either
to the corpus. The other 51 carry a `verification` string naming the engine
and version they were checked against.

### 5 · Glossary — `#glossary`

**61 terms across 18 initials.** Every one is **harvested, never authored** —
each entry is a definition block that already lives in the chapter that
teaches it, so every term carries a link back to where it is explained in
context.

## Search

**1,361 entries**, covering all five modes: 486 questions, 687 chapters, 46
drills, 81 predicts, 61 glossary terms.

- **It searches code, not just prose.** `gin_trgm_ops` appears in exactly one
  place in the deck — inside a `CREATE INDEX` in the indexes chapter — and
  finding it returns that chapter.
- **It does not spoil the puzzles.** Predict blocks are indexed with their
  answers withheld, so searching cannot hand you an answer you were about to
  work out.
- **Results land where you expect.** A question result opens the card
  expanded; a chapter result scrolls to the chapter.
- Searching `List<String>` matches the decoded text and highlights it
  correctly in both themes.

## Progress that means something

Five independent counters, one per mode, each counting its own noun:
**KNOWN**, **READ**, **REHEARSED**, **SOLVED**, **SEEN**.

**Nothing adds them together.** A question answered, a chapter read and a
puzzle solved are three incompatible units, and an average over them would be
a sixth number that is true of nothing. There is no "62% complete" here
because that number would be a lie.

Everything is stored in `localStorage`, every access is inside a `try/catch`,
and nothing leaves your machine.

## Reading it anywhere

- **Open `index.html` from a disk and it works.** No server, no build, no
  install.
- **Block all three CDNs and you lose a particle background and some scroll
  animation.** Nothing else.
- **Both themes are first-class**, and the theme is applied before the body
  parses, so there is no flash.
- **It prints.** `print.css` hides the line gutter so a wrapped code line
  cannot misnumber the rest of the block.
- **Every route is shareable.** `#questions/collections?tier=must-know&cram`
  is a link to exactly what you were looking at.
- **Old links keep working.** `#collections` normalises to
  `#questions/collections` rather than 404ing.
- **No horizontal scrolling** at 390px, 768px or 1280px, on any route. The
  deck has 155 addressable routes — 5 mode indexes, 26 topics, 83 theory
  modules, 15 sets and 26 glossary letters — and **all 465 route/width
  combinations were swept**, with the viewport asserted non-zero before and
  after every measurement.

## Accuracy, and what is still unverified

Nothing here is a claim the toolchain has not checked, except where this says
otherwise.

- **58 `stdout` claims execute and match**, twice each, against OpenJDK 25.
- **1,365 documentation links checked** — status, redirects, meta-refresh
  stubs and fragment anchors. Zero errors.
- **All 486 questions have been read once** against four judgements: is it
  true, is it asked, is it at the right tier, does it have a reference. One
  answer was wrong and is fixed. The record is
  [`docs/triage/SUMMARY.md`](docs/triage/SUMMARY.md).

**Still unverified, and stated because a features list that only lists
successes is a claim about the whole deck:**

- **86 output panes are `trace`** — prose about what happens, in order. No
  runner can confirm those, and none pretends to.
- **51 predict artefacts are not `stdout`** and nothing re-executes them.
- **Whether a cited page still says what it is cited for.** The links resolve;
  a machine compared every page title to the deck's own, which is a proxy and
  not a reading.
- **687 theory chapters, 46 drills and 61 glossary terms have not been read
  for correctness.** Phase 10 read the question bank. The other four modes are
  next.

## Deliberately not here

- **Any backend language but Java.** Nine snippet languages are supported —
  Java, SQL, YAML, properties, XML, bash, JSON, HTTP, Dockerfile — and a tenth
  entry is an error rather than a warning, because that is how a second
  backend language gets in. Where a cross-language comparison earns its place
  it is **prose in a comparison block, never a code snippet**.
- **DSA practice.** That needs a judge that runs your code against hidden
  tests, which a static page cannot be.
- **Accounts, sync, telemetry.** There is no server to sync to.
