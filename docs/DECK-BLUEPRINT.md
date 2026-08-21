# The Deck Blueprint — a generalised prompt for building a topic interview-prep site

> **What this is.** A complete, self-contained build prompt. Handed to an agent
> together with a *topic research prompt*, it reproduces the DroidDeck
> architecture — every file, every schema, every invariant, the whole navigation
> and progress model — for any interview subject: backend, ML, cyber security,
> data engineering, SRE, product, anything with a body of knowledge and an
> interview loop around it.
>
> **What it deliberately does not contain.** Content. Not one question, chapter,
> drill or definition. This prompt builds the *vessel* and specifies the *shape*
> the content must take. The companion topic prompt fills it.
>
> **How the two fit together.** The topic prompt must end by emitting a **Topic
> Manifest** (§13). This prompt consumes that manifest and nothing else about
> the subject. If the manifest is missing or incomplete, produce it first by
> research — do not start writing files against guesses.

---

## 0. Read this before you touch anything

You are building a **static, build-free single-page application**. No bundler,
no transpiler, no package manager, no server, no framework, no npm install. One
`index.html` loads a fixed list of scripts in a fixed order, and every file
declares one global. Opening the file from disk works. A static file server
works. That is the entire deployment story.

This is a deliberate constraint, not an oversight, and it is the single most
important thing to preserve. The content is the product. Content that outlives
its toolchain is worth more than content locked behind a dependency tree that
needs re-resolving every year. Every temptation you will feel — "this would be
cleaner as a module", "let me just add a small build step", "React would make
this easier" — is a temptation to trade a decade of durability for an afternoon
of convenience. Refuse all of them.

Three further rules govern everything below:

1. **Load order is the dependency graph.** There are no imports. The `<script>`
   order in `index.html` *is* the dependency declaration.
2. **Colour lives in exactly one file.** `css/themes.css` holds every colour,
   radius, duration and type step. A grep for `#rrggbb` or `rgba(` across the
   other stylesheets must return nothing.
3. **Validators stand in for tests.** There is no test framework. Node scripts
   in `tools/` are the entire safety net, and they must pass before every
   commit that touches the corpus or the navigation.

---

## 1. The product, in one paragraph

A single-page interview-preparation deck for one subject. Five modes sit side
by side in a persistent left icon rail: **Questions** (a bank to test yourself
against), **Theory** (a curriculum to learn from, in dependency order),
**Interview Synthesis** (timed drills that pull several subjects at once),
**Predict the Output** (committed-answer puzzles), and **Glossary** (every term
the curriculum defines, harvested rather than authored). Two corpora underlie
those five modes. Progress is per-mode and local. The URL hash is the source of
truth for every view, so deep links, the back button and shared URLs work for
free.

---

## 2. What the topic prompt supplies, and what this prompt fixes

| Fixed by this prompt — identical in every build | Supplied by the topic manifest |
|---|---|
| The five rail modes, their order, digits, groups | The subject name, slug, brand mark |
| The two-corpus split (Questions / Theory) | The question topics and their subsections |
| Every schema field and its rules | The theory tracks and modules, in reading order |
| The eleven block types | The chapter content |
| Routing, hash shape, reserved segments | The drill catalogue (ids and tiers) |
| The progress model and storage-key shape | The predict catalogue (ids) |
| The design token layer and the nine-hue ramp | Which hue each track takes |
| All five validators and what they check | The code languages, if any |
| The documentation set | The documentation base URL and licence findings |

**The rail never changes.** Five modes, in this order, with these digits. They
are generic: every technical interview has facts to recall, a body of theory,
timed synthesis, a "what does this do" reflex, and vocabulary. Do not add a
sixth mode, do not drop one, do not reorder them.

> **One assumption worth stating.** *Predict the Output* is named for code, and
> a non-code subject has no stdout. It generalises without renaming: the mode is
> **commit-then-reveal**, and its unit is any artefact with a determinate answer
> the reader can be wrong about — a query plan, a `kubectl` result, a confusion
> matrix, a packet capture, a regex match, a model's output shape, a log line
> after a config change. The topic manifest names the artefact kind and supplies
> the catalogue. If a subject genuinely has no such artefact, the mode still
> exists and holds *scenario* puzzles ("what does this policy actually permit?")
> — it is never removed, because removing it breaks the fixed rail.

---

## 3. Repository layout

Reproduce this tree exactly. Counts are per-topic; the shape is not.

```
<repo>/
  index.html                     one file, fixed script order, one inline <head> script
  CNAME                          if hosting on a custom domain
  README.md
  CLAUDE.md                      working notes: commit discipline, validator commands
  .gitignore                     must ignore tools/.doc-link-cache.json
  .claude/launch.json            dev-server launch config

  css/
    themes.css                   TOKENS ONLY. Every colour in the app.
    styles.css                   reset, page skeleton, breakpoints
    components.css               everything inside the shell
    theory.css                   everything the theory/drill/glossary modes add
    rail.css                     the icon rail and the mode header
    animations.css               keyframes, reveal states, reduced-motion overrides
    print.css                    optional (§18.4) — the printable revision sheet

  js/
    code-highlight.js            highlightCode(code, language) -> HTML
    diagrams.js                  renderDiagram(container, config, type)
    theme.js                     initTheme, toggleTheme
    progress.js                  every localStorage read/write, one event
    three-bg.js                  optional particle canvas (self-contained IIFE)
    navigation.js                hash parse/generate, route dispatch, mobile drawer
    sidebar.js                   the five sidebar shapes, dispatched from the mode
    rail.js                      the rail and the mode header
    theory.js                    theory mode end to end + the block renderers
    synthesis.js                 the drill mode, one prompt per screen
    predict.js                   the commit-then-reveal mode
    glossary.js                  harvest, A-Z, "asked" chips
    search.js                    one index across both corpora
    app.js                       initApp + renderTopic. MUST BE LAST.

  data/
    <topic-id>.js                one per question topic, each declaring one global
    index.js                     assembles `topics`, `topicTracks`, `topicsInTrack()`
    modes.js                     THE MODE REGISTRY. After both corpora.
    theory/
      <module-id>.js             one per theory module, each declaring one global
      index.js                   assembles `theoryTracks`, `theoryModules`, lookups

  tools/
    load-corpus.js               reads the data layer the way the browser does
    schema.js                    vocabulary shared by both validators
    validate-questions.js        the question bank
    validate-theory.js           the theory corpus + cross-corpus integrity
    validate-nav.js              the navigation structure and the hard totals
    check-doc-links.js           HEAD-probes every documentation URL (per-phase)
    run-snippets.js              executes every stdout snippet (per-phase)
    dev-server.js                a 30-line static server, zero dependencies

  assets/img/
    README.md                    per-file: source page, retrieval date, licence
    *.png *.svg                  vendored figures, downloaded and committed

  docs/
    ARCHITECTURE.md              why the shape is the shape
    CODEBASE.md                  a map of every file and what it owns
    FEATURES.md                  what the fields drive, reader-facing
    verification-log.md          what was checked by hand and what it found
    plans/YYYY-MM-DD-*.md        one plan per phase of work
    triage/<topic-id>.md         one read of every question, four judgements
    design/                      the design-system and rail reference builds
```

---

## 4. `index.html` — the whole loading contract

One file. In this order, and the order is load-bearing:

```
<head>
  meta, title, inline SVG favicon (data: URI, no network)
  ONE inline <script> — theme + mode + last-location restore, before body parses
  Google Fonts preconnect + one stylesheet link
  css/themes.css, styles.css, components.css, rail.css, theory.css, animations.css
  css/print.css  <link media="print">   if §18.4 is adopted
<body>
  canvas#bgCanvas, skip-link
  nav.rail            brand, div#railItems (built from modes.js), meter, theme switch
  header.mode-header  hamburger, title, meta, progress, search
  aside.sidebar       nav#sidebarNav (built per mode)
  main.main-content   div#topicContainer
  button.back-to-top

  CDN: three.js, gsap, ScrollTrigger        (ALL OPTIONAL — see §11)
  data/<topic>.js  x N                      each declares one global
  data/index.js                             assembles them
  data/theory/<module>.js  x M              each declares one global
  data/theory/index.js                      assembles them
  data/modes.js                             after BOTH corpora
  js/code-highlight.js, diagrams.js, theme.js, progress.js, three-bg.js
  js/navigation.js, sidebar.js, rail.js
  js/theory.js, synthesis.js, predict.js, glossary.js
  js/search.js
  js/app.js                                 LAST
```

**Forward references are pervasive and safe.** `navigation.js` calls renderers
defined four files below it; `rail.js` calls `renderSidebar` from `sidebar.js`;
`progress.js` reads `collectGlossaryEntries` from `glossary.js`, which loads six
files later. All of them run from event handlers or from `initApp()`, long after
every script has been parsed. Do not reorder to "fix" this.

**The one exception, and why it is in `index.html` rather than in `js/`:**

```js
(function () {
    try {
        var theme = localStorage.getItem('theme');
        if (theme === 'dark' || theme === 'light') {
            document.documentElement.setAttribute('data-theme', theme);
        }
        var mode = localStorage.getItem('<slug>:mode');
        if (mode) document.documentElement.dataset.mode = mode;

        // Only when there is no hash to honour. A shared link always wins over
        // where this browser happened to be last.
        if (!location.hash && mode) {
            var last = JSON.parse(localStorage.getItem('<slug>:mode:last') || '{}');
            location.replace(last[mode] || ('#' + mode));
        }
    } catch (e) { /* private mode, file://, hand-edited value: defaults are fine */ }
})();
```

A deferred script, or anything at the foot of the body, is by definition too
late to prevent a flash of the wrong theme or the wrong mode. These few lines
are not worth a blocking request of their own.

---

## 5. The data hierarchy

This is the heart of the blueprint. Reproduce it exactly; only the values change.

### 5.1 Two corpora, and why they are not views of each other

The app holds two bodies of content with **different shapes and different
purposes**, and conflating them is the failure this design exists to prevent.

- **Questions** are organised for **lookup**. N topics, each a place to file a
  question. Flat, browsable, searchable, testable-against.
- **Theory** is organised for **comprehension**. M modules of C chapters across
  T tracks, in **one reading order** where each idea arrives after the ideas it
  depends on.

They are cross-linked — a chapter lists questions to test yourself against, and
search covers both — but they are **separately structured on purpose**, and the
module ids are independent of the topic ids. Some modules split a topic, some
merge two, some exist only in theory because nothing in the question bank
teaches a foundation that three of its topics assume.

### 5.2 The question schema

`data/<topic-id>.js` declares exactly one global:

```js
const <camelCase>Data = {
    id: 'topic-id',                    // kebab-case, unique, never a reserved segment
    title: 'Human Title',
    subsections: null,                 // or [{ id, title }] — a topic's second level
    keyTopics: ['...'],                // the subjects this topic claims to cover
    questions: [ /* see below */ ]
};
```

```js
{
    id: 'topic-scoped-id',
    importance: 'must-know',           // REQUIRED: must-know | should-know | good-to-know
    question: 'Plain text, no markup.',
    answer: '<p>...</p>',              // allowed tag subset ONLY, never <img>
    referenceLinks: [{ title, url }],  // at least one when importance is must-know
    tags: ['...'],
    images: [{                         // optional — vendored figures only
        src: 'assets/img/x.png',       // repo-relative, must exist on disk
        alt: '...',                    // over 20 characters
        caption: '<p>...</p>',         // optional, allowed tags
        sourceTitle: '...',            // REQUIRED — attribution, a licence condition
        sourceUrl: 'https://...'       // REQUIRED
    }],
    hasDiagram: false,
    diagramType: null,                 // flowchart | animation | sequence
    diagramConfig: null,
    codeSnippets: [{
        language: '...',               // from the topic's declared language set
        title: '...',
        code: '...',
        output: {                      // optional, but see the rule below
            kind: 'stdout',            // stdout | trace — NEVER interchangeable
            lines: ['...'],            // non-empty
            explain: '<p>...</p>'      // optional, allowed tags
        }
    }],
    subsection: 'subsection-id'        // or null
}
```

Three fields carry rules worth restating, because each exists to stop a specific
bad outcome:

- **`importance` is stored, not derived.** A tier computed from the theory
  chapters that link a question could not be overridden, and questions with no
  theory link at all would silently get none.
- **`images[]` is structured data, not `<img>` in the answer string.** That is
  the *only* reason a validator can check the path and the attribution. It also
  lets one file serve two questions.
- **`output.kind` separates a re-runnable claim from a description.** `stdout`
  is literal console text and is re-executed by `run-snippets.js`. `trace` is
  prose about behaviour, rendered as a numbered "What happens, in order" list
  and labelled as such. **Printing a fabricated "Output:" over code that cannot
  be run teaches something false, which is worse than showing nothing.** The
  validator enforces the split: a language the runner cannot execute may not
  claim `stdout`.

### 5.3 `data/index.js` — the topic registry

```js
const topics = [ /* the globals, in sidebar order. topics[0] is the default route. */ ];

/* Which subject track a question topic belongs to. Written as an id rather than
   as a colour, so the sidebar can group by it, the glossary filter by it, and a
   synthesis prompt link back through it. Hue DERIVES from the track, so the
   colour and the kinship cannot drift apart. `null` is a deliberate, spelled-out
   answer meaning "belongs to no subject" — it renders in an "Everything else"
   group. `undefined` is a topic nobody has decided about, and the validator
   catches that. */
const topicTracks = { 'topic-id': 'track-id', 'other-topics': null, /* ... */ };

function topicsInTrack(trackId) { /* registry order, null gives the strays */ }
```

### 5.4 The theory schema

`data/theory/<module-id>.js` declares exactly one global:

```js
const <camelCase>Module = {
    id: 'module-id',                   // kebab-case, unique, never reserved
    trackId: 'track-id',
    order: 32,                         // position in the ONE global reading path
    title: '...',
    tagline: 'One sentence, the module in a line.',
    estimatedMinutes: 35,
    prerequisites: ['earlier-module-id'],  // MUST resolve to a LOWER order
    docHub: { title: '...', path: '/topic/architecture' },  // path against one base
    chapters: [ /* see below */ ]
};
```

```js
{
    id: 'chapter-id',                  // unique within the module
    title: '...',
    importance: 'must-know',           // same three tiers as questions. Same meaning.
    summary: 'One sentence.',
    interviewAngle: 'Why this gets asked, and what a good answer contains.',
    buildsOn: ['earlier-chapter-id'],  // within the module
    blocks: [ /* the eleven types, §5.5 */ ],
    docs: [{ title, path, kind }],     // kind: guide|api|codelab|sample|course
                                       // at least one when importance is must-know
    relatedQuestions: [{ topicId, questionId }]   // MUST resolve against the bank
}
```

### 5.5 The eleven block types

One `switch` in `renderBlock()`. A new block type is a case there plus a CSS
rule, and **nothing else in the app learns about it**.

| Type | Required fields | Purpose |
|---|---|---|
| `prose` | `html` | Explanation. The default. |
| `definition` | `term`, `html` (+ `important`) | **Harvested into the Glossary.** |
| `types` | `title`, `items: [{ name, html }]` | An enumeration with a name per item. |
| `syntax` | `language`, `title`, `code` (+ `notes`) | Delegates to the question bank's `renderCodeBlock()`. |
| `table` | `headers`, `rows` | A matrix. |
| `comparison` | `title`, `left`, `right`, `rows: [{ aspect, left, right }]` | Two things, aspect by aspect. |
| `pitfall` | `html` | A callout. "Pitfall". |
| `tip` | `html` | A callout. "Saying it well". |
| `diagram` | `diagramType`, `diagramConfig` | Delegates to `renderDiagram()`. |
| `drill` | `id`, `tier`, `title`, `minutes`, `prompt`, `watchFor[]` (+ `sketch`) | **The Synthesis mode's unit.** |
| `predict` | `id`, `importance`, `language`, `prompt`, `code`, `output` (+ `distractor`, `options`, `answer`) | **The Predict mode's unit.** |

Two of the eleven are not prose in a costume, and both need care:

**`drill`** carries a task, a timebox, the things that lose marks, and a
solution sketch. `renderDrillBlock()` **collapses the sketch on creation** —
that is not a style choice: reading the answer before attempting the drill is
the one way to get nothing out of it. Drills are countable and filterable
because the mode needs both.

```js
{
    type: 'drill',
    id: 'unique-corpus-wide',
    tier: 1,                           // 1 = the tasks that carry the round
    title: '...',
    minutes: 45,
    prompt: '<p>...</p>',
    watchFor: ['What loses marks', '...'],
    sketch: { language, title, code }  // collapsed until attempted
}
```

**`predict`** is the only block type that **withholds** something. It hands its
snippet to `renderCodeBlock()` deliberately **without** the `output` field,
because that function paints an output pane directly under the code — the one
thing this block exists to prevent. The answer is built alongside and hidden
behind a class, so revealing is a class toggle rather than a render, and a
revealed block survives a filter change.

```js
{
    type: 'predict',
    id: 'unique-corpus-wide',          // progress keys on the BARE id
    importance: 'must-know',
    language: '...',
    prompt: '<p>The question the reader must commit to.</p>',
    code: '...',
    output: { kind: 'stdout', lines: [...], explain: '<p>...</p>' },
    distractor: '<p>The wrong answer people actually give, and why.</p>',

    // RECOMMENDED from day one: four options, so a verdict is earned rather
    // than self-reported. The right answer already exists as output.lines; the
    // work is three PLAUSIBLE wrong ones. A wrong answer that is obviously
    // wrong makes the exercise worthless — the reader picks by elimination and
    // learns nothing. Author these one set at a time.
    options: ['...', '...', '...', '...'],
    answer: 0                          // index into options
}
```

Where a `predict` block's answer cannot be machine-verified, it must **say so in
the data** rather than quietly choosing a less checkable kind. The validator
refuses a `predict` that declines verification without a stated reason.

> **Eleven is the floor, not the ceiling.** §18 ratifies three optional
> extensions — a `version` block, an `artefact` field on `predict`, and `output`
> on `syntax` — that a subject may adopt when its material needs them. A subject
> that does not need them stays at eleven.

### 5.6 `data/theory/index.js` — the theory registry

```js
/* `scope` separates a track the sidebar lists from a track that has become a
   mode of its own. It describes where a track is SHOWN, not what it contains —
   which is why promoting one re-tracks no module and leaves the prerequisite
   ordering untouched. */
const theoryTracks = [
    { id: '...', title: '...', order: 1, scope: 'subject' },   // 6–9 of these
    { id: 'synthesis', title: 'Interview Synthesis', order: T+1, scope: 'mode' },
    { id: 'output',    title: 'Predict the Output',  order: T+2, scope: 'mode' }
];

function subjectTracks() { /* scope === 'subject', by order */ }

const theoryModules = [ /* the globals, ORDERED BY THE READING PATH */ ];
const theoryByModuleId = /* reduce to a lookup */;
function modulesInTrack(trackId) { /* by order */ }
```

**Constraint:** the subject-track count should land between **6 and 9**. The
design system carries a nine-hue ramp and forbids a tenth (§9.3). Fewer than six
and the sidebar stops earning its grouping; more than nine and you are inventing
colour.

---

## 6. `data/modes.js` — the mode registry

**This file is fixed. Copy it, change only `<slug>` and the two `trackId`s if
your track ids differ.** It is the single most valuable structure in the
codebase: before it existed, four of the five answers about a mode lived in a
different file, and a sixth mode meant editing all four.

```js
const appModes = [
    { id: 'questions', route: 'questions', railOrder: 1, key: '1', group: 'study',
      title: 'Questions', shortLabel: 'Questions', icon: '?',
      accentVar: '--accent-500', sidebar: 'topics',
      progressNoun: 'KNOWN',     storageKey: '<slug>:questions:done' },

    { id: 'theory', route: 'theory', railOrder: 2, key: '2', group: 'study',
      title: 'Theory', shortLabel: 'Theory', icon: '¶',
      accentVar: '--accent-500', sidebar: 'tracks',
      progressNoun: 'READ',      storageKey: '<slug>:theory:chapters' },

    { id: 'synthesis', route: 'synthesis', railOrder: 3, key: '3', group: 'drill',
      title: 'Interview Synthesis', shortLabel: 'Synthesis', icon: '◎',
      accentVar: '--hue-fuchsia-ink', sidebar: 'sets', trackId: 'synthesis',
      progressNoun: 'REHEARSED', storageKey: '<slug>:synthesis:rehearsed' },

    { id: 'predict', route: 'predict', railOrder: 4, key: '4', group: 'drill',
      title: 'Predict the Output', shortLabel: 'Predict', icon: '>_',
      accentVar: '--hue-teal-ink', sidebar: 'sets', trackId: 'output',
      progressNoun: 'SOLVED',    storageKey: '<slug>:predict:verdicts' },

    { id: 'glossary', route: 'glossary', railOrder: 5, key: '5', group: 'drill',
      title: 'Glossary', shortLabel: 'Glossary', icon: 'Aa',
      accentVar: '--hue-slate-ink', sidebar: 'alphabet',
      progressNoun: 'SEEN',      storageKey: '<slug>:glossary:seen' }
];

const modeById = /* reduce */;
function modeForRoute(segment) { /* find by route, or null */ }
function modeForKey(key)       { /* find by key, or null */ }
```

Everything downstream — the rail, the contextual sidebar, the mode header, the
keyboard map, search grouping and the persistence keys — reads this array and
nothing else. **Four fields carry more weight than they look:**

- **`progressNoun`** exists because the five modes do not share a unit.
  Questions are known, chapters read, prompts rehearsed, snippets solved, terms
  seen. There is deliberately **no function anywhere that adds them together**,
  and there must never be one. An average over five incompatible units is a
  sixth number true of nothing, printed somewhere a reader cannot check it.
- **`accentVar`** holds a *token name*, not a colour. The rail is the only place
  accent appears outside body content, and a literal there would break the rule
  that `themes.css` holds every colour in the app.
- **`group`** drives the one divider in the rail: two study modes above it,
  three drill modes below. It is load-bearing rather than decoration — the
  divider is what tells a reader that Questions and Theory are places to learn
  and the other three are places to be tested. The validator asserts the two
  study modes stay contiguous above the three drill modes, so the divider still
  separates something.
- **`sidebar`** names one of five shapes, dispatched once in `sidebar.js` and
  never asked about again:

| Value | Mode | Shape |
|---|---|---|
| `topics` | Questions | The flat topic list, subsections beneath the ones that have them |
| `tracks` | Theory | The subject tracks, each opening to its modules |
| `sets` | Synthesis, Predict | The track's modules as sets; Predict adds a verdict strip for the active one |
| `alphabet` | Glossary | An A–Z jump grid, then track as a filter |

The two drill modes deliberately show **no track list**. Tracks are the
organising axis of the material they draw on, not of the material itself; where
a prompt's provenance matters it appears as a chip that says so.

---

## 7. Routing and state

### 7.1 The hash is the source of truth

| Route | Meaning |
|---|---|
| `#questions/<topic-id>[/<subsection-id>]` | A question topic |
| `#theory[/<module-id>[/<chapter-id>]]` | The curriculum, a module, a chapter |
| `#synthesis[/<drill-id>]` | The drill mode |
| `#predict[/<snippet-id>]` | The commit-then-reveal mode |
| `#glossary` | The harvested term list |
| `?cram` | Filter everything to must-know |
| `?tier=must,should` | The independent tier filter |

Five **reserved first segments** — the five mode routes — checked against both
the topic id space and the module id space by the validator. A bare first
segment is still treated as a question topic and normalised, so **every link
ever shared keeps working**: `#android` becomes `#questions/android` rather than
breaking.

Redirects from promoted sections are **derived from the module's `trackId`**,
never listed. A module added to a promoted track redirects without anybody
remembering a table, and `generateTheoryHash()` performs the same derivation in
the other direction — which is how every link in the app follows a promotion
without a single call site learning that anything changed.

The reading mode is **derived from the hash, not stored**, so arriving on a deep
link puts the sidebar in the right mode with nothing to synchronise.

### 7.2 The filters live in the hash, and that is the point

**Cram mode** (`?cram`) filters module cards, chapters and glossary entries to
must-know. It lives in the hash rather than in a variable because its whole
purpose spans modules: a filter that resets on navigation is useless for
revision. `generateTheoryHash()` carries the flag by default, so the state
propagates without being threaded through call sites.

**The tier filter** (`?tier=...`) is **independent, not a floor**: must-know
alone to drill the short list, should-know alone to find the gaps you have been
skipping, must and good together if that is what an evening calls for. Selecting
all three normalises back to no filter, so the URL stays clean. A tier with
nothing in it is still shown, **disabled**, so the reader learns the topic has
none rather than wondering where the control went.

**Question numbers stay stable under filtering.** Card 3 is card 3 whether or
not cards 1 and 2 are hidden. Gappy numbering is the right trade: the number is
an identifier people cite, and renumbering per-filter makes every such reference
ambiguous.

### 7.3 Everything that persists

| State | Home |
|---|---|
| Current view, cram flag, tier filter | `window.location.hash` |
| Theme | `localStorage.theme`, falling back to `prefers-color-scheme` |
| Active mode | `localStorage['<slug>:mode']` — read by the inline `<head>` script |
| Where you were, per mode | `localStorage['<slug>:mode:last']` — one slot each |
| Questions known | `localStorage['<slug>:questions:done']` — keyed `topicId:questionId` |
| Review later | `localStorage['<slug>:questions:later']` — a **map** with dates |
| Chapters read | `localStorage['<slug>:theory:chapters']` |
| Prompts rehearsed | `localStorage['<slug>:synthesis:rehearsed']` — a set; a drill has nothing to grade |
| Snippet verdicts | `localStorage['<slug>:predict:verdicts']` — a **map**, not a set: right, wrong and unanswered are three states |
| Terms seen | `localStorage['<slug>:glossary:seen']` — set by an IntersectionObserver |

Question keys are `topicId:questionId`, **never the id alone** — question ids
are unique *within* a topic only, so a store keyed on the bare id silently marks
two questions done at once.

Every `localStorage` access is wrapped in `try/catch`: it throws on `file://` in
some browsers and in private mode, and progress is a convenience that is not
worth breaking the page over.

Everything else is derived. **No store, no observable, no cache of rendered
output.** `renderTopic()` clears its container and rebuilds from the data array,
which is fast enough that memoising it would be premature.

### 7.4 The scroll/hash feedback loop

Two things want to write the hash: navigation (the user clicked) and scrolling
(the user has read their way into a new section). Letting both write it naively
produces a loop — scrolling updates the hash, `hashchange` fires, the renderer
runs, the page jumps, which changes the scroll position.

**Break it by writing scroll-driven updates with `history.replaceState`**, which
changes the URL without firing `hashchange`. Only genuine navigation goes
through `window.location.hash`.

### 7.5 Progress announces itself

Every mutation dispatches one event (`'<slug>:progress'`). The checkbox, the
sidebar counts and the header bar all read the same store and all three must
move together when one row is ticked — re-rendering the topic to achieve that
would throw away every expanded row on the page.

---

## 8. Rendering

`handleRouteChange()` dispatches on the parsed mode to one of eight renderers:
`renderTopic`, `renderTheoryOverview`, `renderTheoryModule`,
`renderSynthesisOverview`, `renderSynthesisPrompt`, `renderPredictOverview`,
`renderPredictSnippet`, `renderGlossary`.

**Each owns its container completely** — clear, rebuild, sync the sidebar,
`replaceState` — so no two of them can leave state behind for the next. A shared
`resetContainer()` is that clearing step.

`renderTopic()` is the single entry point for the question bank:

1. Fade the container out (`.topic-transitioning`, 150ms).
2. Clear and rebuild: header, key-topic pills, tier filter, then either a flat
   numbered list of cards or cards grouped under subsection headings.
3. Fade back in, sync the sidebar's active state, `replaceState` the hash.
4. Scroll to the target subsection, or to the top.

Cards render **collapsed**. Answer HTML, code blocks and diagram containers are
built up front — only the diagram *SVG* is deferred, by 100ms, so the container
has been laid out before it is measured.

**Reveal animation is driven by a `MutationObserver`** on the topic container
rather than by the render function calling into GSAP directly. That keeps the
animation concern out of the rendering path: anything that appends a
`.question-card`, from any code path, animates correctly. On completion, clear
GSAP's inline styles and hand control back to the stylesheet, or its leftover
`transform` fights the card's hover transition.

`renderGroupedQuestions()` keeps a trailing **"More" bucket** for questions whose
`subsection` matches no declared subsection, so a data typo degrades to a
misfiled question rather than a silently missing one.

**The theory renderers reuse the question bank's `renderCodeBlock()` and
`renderDiagram()` wholesale**, so a snippet looks and behaves identically in
both modes. Do not reimplement them.

**The glossary is harvested at render time** from every `definition` block
rather than authored. A hand-maintained list would drift from the chapters
within a month; a derived one cannot — and every term arrives with the chapter
that owns it already attached, which makes its backlink a property of the data
rather than a link somebody has to remember to write. Sort on the first
*alphanumeric* character, so `@Decorator` files under D rather than ahead of the
alphabet. An **ASKED chip** on a term means exactly what it says: this word
appears by name in a question somebody is asked, and it links there.

**The drills and predict blocks are reached through `blocksOfTypeInTrack()`.** A
track never had to produce a flat list before — the theory renderer walks
modules and chapters, and a block was only ever reached from inside its chapter.
A mode showing one prompt per screen needs the whole track as an **ordered
sequence**, so "next" crosses a module boundary instead of stopping at the end
of a file.

---

## 9. The design system

### 9.1 Two layers in `themes.css`, and the distinction matters

- **Primitives** are the design system verbatim: surfaces, the accent ramp, the
  three priority tiers, the nine category hues, the 4pt scale, four semantic
  radii, two durations. **The only place a literal colour may be written.**
- **The semantic layer** names the meanings this codebase needs that a palette
  does not — shadows, syntax colours, diagram parts, success and warning — and
  **every one resolves to a primitive** rather than to a new colour. That is how
  the rule survives the fact that a code editor needs seven of them.

### 9.2 The token set

```
Type      --font-display / --font-sans / --font-mono   (three families, three jobs)
          --text-display 44 / --text-h1 28 / --text-h2 20 / --text-body 15
          --text-small 13 / --text-micro 11            (small is a FLOOR, not a suggestion)
          --leading-body 1.65 / --leading-answer 1.7 / --measure 72ch
Code      --code-size / --code-leading / --code-pad-y  (tokens because the source and
                                                        the line gutter must agree exactly)
Space     --space-1..7 = 4 8 12 16 24 32 48            (4pt; 12 in a card, 16 between
                                                        cards, 48 between page blocks)
Radius    --radius-input 6 / --radius-row 10 / --radius-card 14 / --radius-pill 999
          (semantic, not sized: the name says WHERE it goes, so a row and a card
           cannot drift apart as they did under sm/md/lg/xl)
Motion    --transition-hover 120ms / --transition-panel 200ms   (there is no third)
Accent    --accent-100/300/500/600/700/-wash, --focus-ring      (one ring, both themes,
                                                                 every focusable thing)
Surfaces  --ds-canvas/surface/raised/sunken/border/border-subtle/text/muted/faint/
          veil/veil-strong/hover/glass/scrim                    (per theme)
Tiers     --tier-{must,should,good}-{bg,dot,ink}
Hues      --hue-{violet,sky,teal,lime,pink,amber,indigo,rose,fuchsia,slate}-{bg,ink}
```

### 9.3 Rules that must not bend

- **Nine hues plus slate. No tenth.** If a spec asks for a colour outside the
  ramp, take the nearest member and say so in a comment where the substitution
  is made.
- **Category hue travels on a `data-hue` attribute**, never as a passed-down
  colour. One attribute on a sidebar row, a track section or a page header tints
  the tile, the heading, the progress bar and the count beneath it *together*.
- **Priority tiers are soft fills with a rank dot**, not outlined red and yellow
  badges — those read as errors and warnings. The third tier is **neutral**,
  because optional content should recede, not compete.
- **Drill tiers reuse the `--importance-*` tokens.** A tier-1 drill and a
  must-know chapter carry the same weight, and two colour languages would say
  otherwise.
- **Declare every exception in the file** rather than hiding it in a rule. Two
  are expected: `--figure-plate` is white in both themes, because vendored
  figures are often transparent PNGs drawn for a white page and would otherwise
  become an outline of nothing on dark; and the accent has two working steps
  (500 on dark, 600 on light) because 500 fails contrast against white at small
  sizes.

### 9.4 Responsive

| Width | Behaviour |
|---|---|
| > 1024px | Full 280px sidebar, 320px expanded search |
| ≤ 1024px | Sidebar narrows to 260px, search narrows |
| ≤ 768px | Hamburger appears; sidebar becomes a drawer over a dimmed overlay |
| ≤ 480px | Header title hides, padding tightens, search compresses |

The header height is repeated as the sidebar's `top` and in
`scroll-padding-top`/`scroll-margin-top` — **change all of them together**.

---

## 10. Search

`buildSearchIndex()` flattens **both corpora once at startup**. Every entry
carries `kind`, `title` and `context`, so the scorer and the renderer branch
only on the badge and the destination.

Chapter text comes from `blockText()`, which flattens **all eleven block types
including code** — an API name is often the query.

`search(query)` requires **every term to match**, so adding a word narrows
rather than widens. Scoring: title hit `+10`, prefix `+5`, word-boundary `+3`,
tag hit `+4`, body hit `+1`. There is deliberately **no per-kind weighting** —
chapters place well on score alone, and a constant boost only promotes weak
body-only matches.

Results are **grouped by mode**, because opening a question and opening a
chapter are not the same action and the reader should know which before the
click.

Choosing a question navigates to its topic, waits for the 150ms transition,
scrolls the card into the centre of the viewport and **expands it** — so a
search lands on the answer, not near it. A chapter needs no wait; its route
scrolls itself.

`/` focuses the field anywhere; Escape dismisses; results appear after a 200ms
pause in typing.

---

## 11. Graceful degradation, accessibility, security

### 11.1 Every third-party dependency is optional and decorative

| Missing | Consequence |
|---|---|
| Three.js | No background canvas |
| GSAP | Cards reveal with a CSS transition instead of a stagger |
| Google Fonts | System stack via the `--font-sans` fallback chain |
| `localStorage` | Theme still toggles and modules still open; neither persists |

**No failure among them prevents reading a single question or chapter.** Assert
this by testing with the CDN blocked.

### 11.2 Accessibility

- A skip link to main content, revealed on focus.
- Full keyboard operation: digits `1`–`5` for the modes, `/` for search, Escape
  to dismiss, Enter/Space to expand cards and code blocks, visible
  `:focus-visible` outlines throughout. **One place decides when a mode digit is
  off** (e.g. while a text field has focus) — never five.
- Landmark roles (`banner`, `navigation`, `main`, `search`), `role="tablist"` on
  the rail, and an `aria-live` main region.
- `aria-expanded` and `aria-hidden` kept in step on every card, so a screen
  reader announces the state rather than reading collapsed answers aloud.
- `prefers-reduced-motion` disables the particle background entirely and
  collapses every animation to a no-op — **including the diagram draw-on, which
  must resolve to its finished state rather than never appearing**.

### 11.3 Security posture

Authored content is injected with `innerHTML`, which is safe **because the data
files are part of the repository and both validators restrict authored HTML to a
fixed tag subset**, rejecting inline event handlers and `javascript:` URLs. The
assumption is enforced rather than trusted.

The allowed subset is exactly:
`p, ul, ol, li, strong, em, code, a, br, table, thead, tbody, tr, th, td`

**`<img>` is deliberately outside it.** Figures arrive as a structured `images[]`
field and are built by a renderer that sets `src` and `alt` as *properties*
rather than interpolating them into markup. That is what makes validation
possible at all: a validator can assert a path is repo-relative and exists on
disk; it can assert nothing about an `<img>` buried in an HTML blob.

Attribute checks look **inside tags only**. Scanning a whole string for `on…=`
flags named arguments in prose — a validator that cries wolf gets switched off.

Anything derived from user input is treated as hostile: search result text is
HTML-escaped before `<mark>` wrapping, query terms are regex-escaped before
compilation, and all titles and code go through `textContent` or the escaping
path in `highlightCode()`.

### 11.4 Vendored figures

`assets/img/` holds documentation figures **downloaded and committed, never
hotlinked**. Hotlinking breaks the `file://` deployment this architecture
promises, and makes a page depend on a URL its owner has already moved once.

Vendoring redistributes someone else's work, so the directory carries a
`README.md` that is **part of the mechanism rather than a courtesy**: per file,
the source page, the retrieval date and the licence, plus the licence check for
every source the corpus draws on. **The topic prompt must report which of its
documentation sources are vendorable.** Where a licence forbids it (NC or ND
terms), no figure from that source exists in the repo — full stop.

Figures render **unmodified**, on a white plate under the dark theme rather than
being inverted, because editing a diagram while keeping its attribution
misrepresents its author.

A figure has to **earn its place**: the subject must be a state machine, a
layered stack or a timeline — shapes where spatial layout does real work. It
must be materially better than what the app can draw itself, not merely
different. And it must be legible at card width on a phone, which is judged by
looking at one rather than by measuring. Expect to reject a third of candidates.

---

## 12. The validators — build these before the corpus, not after

There is no test framework. A hand-authored corpus of hundreds of chapters with
hundreds of outbound links **will rot silently**. Five Node scripts, zero
dependencies, are the whole safety net.

Three run before **every** commit that touches the corpus or the navigation:

```bash
node tools/validate-theory.js && node tools/validate-questions.js && node tools/validate-nav.js
```

Two are slower and run **per phase** rather than per commit:

```bash
node tools/check-doc-links.js --all
node tools/run-snippets.js
```

### 12.1 `tools/load-corpus.js`

Reads the data layer **the way the browser does**: concatenates the data files in
`index.html` order and evaluates them as one script in a `vm` context, so the
globals see each other. Everything else builds on it. This is what lets Node
validate a corpus that has no module system.

### 12.2 `tools/schema.js` — the shared vocabulary

`TIERS`, `LANGUAGES`, `DIAGRAM_TYPES`, `OUTPUT_KINDS`, `RUNNABLE_LANGUAGES`,
`ALLOWED_TAGS`, `KEBAB`, `htmlIssues()`. It exists so the two content validators
**cannot drift**: a must-know question and a must-know chapter have to mean the
same thing.

### 12.3 `tools/validate-questions.js` — seven checks

1. Every question carries an `importance` from `TIERS`.
2. Ids are unique **within** a topic, and any known cross-topic collision is
   **asserted as the only one**. (A bare uniqueness check would have to be
   switched off to tolerate a real collision, and would then catch nothing.)
3. Every must-know question carries at least one `referenceLink` — mirroring the
   rule theory applies to must-know chapters. A question worth revising the
   night before is worth being able to check.
4. `images[]`: `src` repo-relative and present on disk, `alt` over 20
   characters, `sourceTitle`/`sourceUrl` present. Attribution is a **licence
   condition**, so its absence is an error, never a warning.
5. `codeSnippets[].output` is `stdout` or `trace`, and **`stdout` is refused for
   any language the runner cannot execute**.
6. Snippet `language` is one the highlighter knows.
7. Authored HTML stays inside the allowed tag subset.

### 12.4 `tools/validate-theory.js` — the schema and cross-corpus integrity

Enforces tiers, block shapes, unique ids, and the HTML subset. Its highest-value
checks:

- **`relatedQuestions` resolution.** Every `{ topicId, questionId }` is resolved
  against the question corpus. Renaming a question breaks the build rather than
  a link. *This catches invented ids during authoring more than any other check.*
- **Prerequisites must have a lower `order`**, so the reading path can never ask
  for knowledge it has not taught.
- **`keyTopics` coverage.** Every question topic's `keyTopics` are matched
  against the theory prose and misses are **warned** — the only signal that a
  reorganisation dropped a subject.
- **The drill catalogue and the predict catalogue are held IN THE VALIDATOR**,
  not derived from the corpus. An id outside the list is an error, a duplicate
  is an error, and anything unwritten is a warning. **A dropped item must be an
  error rather than a smaller number nobody notices.** Adding a drill means
  adding its id here first.
- A `predict` block that declines verification without saying why is refused.
- Warnings never fail a run, but they are meant to be read.

### 12.5 `tools/validate-nav.js` — the structure, not the content

Checks that every track declares a `scope`; that every question topic names a
subject track or an **explicit `null`**; that the five mode routes are reserved
against **both** id spaces; and that the two study modes stay contiguous above
the three drill modes.

**Its most valuable checks are the least clever ones.** It holds the five mode
totals and Theory's post-promotion shape as **hard numbers**. A refactor that
quietly halves the Predict total is precisely what it exists to catch, and *"a
number appeared" is not a check.*

```js
const EXPECTED_TOTALS = {
    questions: <N>,   // across all topics
    theory:    <N>,   // chapters in the SUBJECT tracks only
    synthesis: <N>,   // drill blocks
    predict:   <N>,   // predict blocks
    glossary:  <N>    // definition blocks
};
```

Update these deliberately, in the same commit that changes the corpus, with the
new number written by hand.

### 12.6 `tools/check-doc-links.js`

HEAD-probes every `docHub`, every `docs[]` entry and (with `--all`) every
question `referenceLinks` entry, caching results in a gitignored file.

**A redirect counts as a failure, by design** — a redirect today is a 404 next
year. Ignore only differences that mean nothing, such as a locale parameter.

**Record the known blind spot in the code and in `docs/verification-log.md`:**
it follows HTTP redirects and **cannot see an HTML meta-refresh**. A stub page
that answers 200 and refreshes elsewhere passes. In DroidDeck, sixteen dead
anchors survived every automated run until someone read them by hand. Plan one
manual link-reading pass per documentation source, and log what it finds rather
than papering over it.

### 12.7 `tools/run-snippets.js`

Compiles and runs every snippet recorded as `kind: 'stdout'` — **in both
corpora** — and diffs the real output against what the corpus claims, so an
"Output" pane is a **re-checkable assertion rather than a guess**.

`--selftest` runs a handful of fixtures **including a deliberate negative**, to
prove the runner still detects a mismatch. Without that, a silently broken
runner reports success forever.

If the topic has no executable language, the runner still exists and still
exits 0 — and `RUNNABLE_LANGUAGES` is empty, which makes check 5 of the question
validator forbid `stdout` corpus-wide. That is the correct outcome, not a
degradation: every output pane becomes an honest `trace`.

---

## 13. The Topic Manifest — what the companion prompt must produce

The topic research prompt must end by emitting exactly this. Do not begin
writing files until every field is filled.

```yaml
subject:            "Backend Engineering"          # human name
slug:               "servedeck"                    # localStorage prefix, lowercase
brand:
  wordmark:         "ServeDeck"
  title:            "ServeDeck — Backend Interview Questions & Answers"
  favicon:          "<inline SVG, data: URI, legible at 16px>"
  domain:           "servedeck.example.com"        # or null

languages:          ["sql", "go", "yaml", "bash"]  # for the highlighter
runnable:           ["go"]                         # a compiler exists locally; may be []
diagram_types:      ["flowchart", "animation", "sequence"]   # keep all three

doc_sources:
  - base:           "https://docs.example.com"
    licence:        "CC BY 4.0"
    vendorable:     true                            # false => no figures from here
predict_artefact:   "the console output of a program"   # what Predict shows

theory_tracks:                                      # 6–9 subject tracks, in READING order
  - { id: "foundations", title: "...", order: 1, hue: "violet" }
  - { id: "...",         title: "...", order: 2, hue: "sky"    }
  # ... then, always:
  - { id: "synthesis", title: "Interview Synthesis", order: T+1, scope: "mode" }
  - { id: "output",    title: "Predict the Output",  order: T+2, scope: "mode" }

question_topics:                                    # sidebar order; [0] is the default route
  - id: "topic-id"
    title: "..."
    track: "foundations"                            # or null => "Everything else"
    subsections: [{ id, title }]                    # or null
    keyTopics: ["...", "..."]
    estimated_questions: 40

theory_modules:                                     # THE reading path. order is global.
  - { id: "module-id", track: "foundations", order: 1, title: "...",
      tagline: "...", estimatedMinutes: 30, prerequisites: [],
      docHub: { title: "...", path: "/..." }, chapters: ["chapter-id", "..."] }

drill_catalogue:                                    # tiered; tier 1 carries the round
  tier1: ["...", "..."]                             # 5–6 ids
  tier2: ["..."]                                    # feature-flavoured
  tier3: ["..."]                                    # utilities
  tier4: ["..."]                                    # extend, debug, review

predict_catalogue:                                  # grouped by the set that owns them
  "predict-set-id": ["snippet-id", "..."]

totals:                                             # the hard numbers for validate-nav.js
  questions: 0
  theory: 0
  synthesis: 0
  predict: 0
  glossary: 0
```

**Manifest rules the topic prompt must honour:**

- Every id is kebab-case and unique in its space.
- No id collides with a reserved segment: `questions`, `theory`, `synthesis`,
  `predict`, `glossary`.
- `prerequisites` reference only modules with a **lower** `order`.
- The reading path is **one global order**, not per-track. Cross-track
  prerequisites are the reason it exists.
- Drill and predict ids are unique **corpus-wide**, because progress keys on the
  bare id.
- The theory modules are **not** the question topics. Some split, some merge,
  some exist only in theory. If the two lists are identical, the split has not
  been thought about.

---

## 14. Build order

Each phase ends with a green validator run and a commit. Do not start a phase
until the previous one's gate passes.

**Phase 0 — Skeleton.** `index.html`, the six stylesheets with the full token
layer, `theme.js`, `three-bg.js`, `dev-server.js`, `.claude/launch.json`. One
placeholder topic with three questions.
*Gate:* the page renders in both themes; a grep for `#rrggbb` and `rgba(` across
`styles.css`, `components.css`, `rail.css`, `theory.css`, `animations.css`
returns nothing.

**Phase 1 — The tool chain, before the corpus.** `load-corpus.js`, `schema.js`,
`validate-questions.js`. Write the validator against three questions so it is
proven before it guards four hundred.
*Gate:* `node tools/validate-questions.js` passes, and fails correctly when you
break a question on purpose.

**Phase 2 — The question bank.** All topics, `data/index.js`, `topicTracks`,
`app.js`, `navigation.js`, `components.css`, `code-highlight.js`, `diagrams.js`,
`progress.js`.
*Gate:* every topic renders; tier filter and progress work; validator green.

**Phase 3 — Theory.** The module files, `data/theory/index.js`, `theory.js`, all
eleven block renderers, `theory.css`, `validate-theory.js` including
`relatedQuestions` resolution.
*Gate:* both validators green; every `relatedQuestions` reference resolves.

**Phase 4 — The rail and the five modes.** `data/modes.js`, `rail.js`,
`sidebar.js`, `synthesis.js`, `predict.js`, `glossary.js`, `rail.css`,
`validate-nav.js` with the hard totals.
*Gate:* all three validators green; every legacy-shaped link normalises; the
five digits switch modes; each mode's progress counts its own noun.

**Phase 5 — Search.** `search.js`, indexing both corpora, grouped by mode.
*Gate:* a term from a code block finds its chapter; a question result lands on
an expanded card.

**Phase 6 — Verification.** `check-doc-links.js`, `run-snippets.js` with
`--selftest`, the vendored figures and their `assets/img/README.md`, and one
**manual** link-reading pass per documentation source.
*Gate:* zero redirects; every `stdout` pane matches real output; every figure
carries attribution; findings logged in `docs/verification-log.md`.

**Phase 7 — Documentation.** `ARCHITECTURE.md`, `CODEBASE.md`, `FEATURES.md`,
`CLAUDE.md`, `README.md`, and a `docs/triage/<topic-id>.md` per topic recording
one read of every question.

---

## 15. Commit discipline

Write `CLAUDE.md` first, in the repository root, and follow it from the first
commit.

- **Imperative subject line, no trailing period**, describing what the commit
  does to the project — "Add the drill block type", not "Added" or "Adds".
- **Then a blank line and a prose body explaining *why*, in full sentences.**
  The body is where the reasoning lives; the diff already shows the what. A
  commit with a subject and no body is not finished.
- Work goes straight to `main`. No feature branches, no PRs.
- Run the three fast validators before any commit touching `data/` or the
  navigation.

If the project hand-sets commit dates (as DroidDeck does), carry that section of
`CLAUDE.md` across verbatim.

---

## 16. The invariants — a checklist to run before calling it done

Every one of these is a property DroidDeck paid for and would lose silently.

- [ ] No build step, no package manager, no `node_modules` in the app path.
- [ ] `file://` works: open `index.html` from disk and read a question, a
      chapter, a drill, a snippet and a term.
- [ ] Blocking all three CDNs costs the reader nothing but decoration.
- [ ] `css/themes.css` is the only file containing a colour literal.
- [ ] No tenth hue.
- [ ] `data/modes.js` is the only place that knows what a mode is. Grep for a
      mode id in `js/` — the only hits should be defaults and storage keys.
- [ ] **No function anywhere adds the five progress counts together.**
- [ ] Question progress is keyed `topicId:questionId`.
- [ ] Predict verdicts are a **map** (right / wrong / unanswered), not a set.
- [ ] The `?cram` and `?tier=` filters survive navigation and are shareable.
- [ ] Question numbers do not renumber under a filter.
- [ ] Scroll-driven hash updates use `replaceState`; only clicks use
      `location.hash`.
- [ ] Every legacy bare-segment link normalises rather than 404s.
- [ ] Promoted-track redirects are **derived from `trackId`**, not listed.
- [ ] The glossary is harvested, never authored.
- [ ] `<img>` is outside the allowed tag subset, and figures are structured data.
- [ ] Every vendored figure has `sourceTitle` and `sourceUrl`, and
      `assets/img/README.md` records source, date and licence for each.
- [ ] No `stdout` claim on a language the runner cannot execute.
- [ ] `run-snippets.js --selftest` includes a deliberate negative.
- [ ] The drill and predict catalogues live in the validator, not in the corpus.
- [ ] `validate-nav.js` holds the five totals as hard numbers.
- [ ] A redirect fails `check-doc-links.js`.
- [ ] `prefers-reduced-motion` resolves diagrams to their finished state.
- [ ] Every `localStorage` access is inside a `try/catch`.
- [ ] All three fast validators exit 0.

---

## 18. Ratified extensions

These are **opt-in**. A topic manifest either adopts an extension and says so,
or it does not exist for that build. They are listed here rather than left to
each subject to reinvent, so two decks do not solve the same problem two ways.

### 18.1 The `version` block — a twelfth block type

**Adopt when** the subject's truth is version-scoped and interviewers ask about
the drift directly ("what changed in version 3?"). Backend frameworks, language
runtimes and cloud APIs all qualify; a subject whose material is stable does not.

```js
{
    type: 'version',
    title: 'Short name for the thing that changed',
    items: [
        { version: 'X 2.x', state: 'was',     html: '<p>...</p>' },
        { version: 'X 3.0', state: 'changed', html: '<p>...</p>' },
        { version: 'X 4.0', state: 'is',      html: '<p>...</p>' }
    ]
}
```

`state` is one of `was | changed | is | removed | preview`, and drives a rank
chip so a reader can see at a glance what is current.

**Why it is a block type rather than prose.** A version claim written into
`prose` is invisible to every validator and every filter, and it is the claim
most certain to become false. As a block it is greppable, checkable, and
countable — `validate-theory.js` can hold the list of modules that **must**
carry one and warn when a refresh missed a module.

**Cost:** one `case` in `renderBlock()`, one CSS rule, one shape check. Nothing
else in the app learns about it.

### 18.2 `predict.artefact` — naming what is being predicted

**Adopt when** the subject has more than one kind of determinate artefact, with
different verification stories. Blueprint §5.5 already requires a `predict`
block that declines machine verification to say so; this makes the saying
structured rather than prose.

```js
artefact: 'stdout' | '<subject-specific kinds>'
```

`stdout` keeps its existing meaning exactly: a runnable language, `output.kind:
'stdout'`, re-executed by `run-snippets.js`. **Every other artefact requires
`output.kind: 'trace'` and a non-empty `verification` string** recording how the
answer was established — the engine and version it was run against, or the
reference section it was read from.

The reveal pane's heading derives from `artefact`, so a reader is never shown a
console frame around something that never touched a console.

### 18.3 `syntax` blocks may carry `output` and `notes`

A clarification of existing behaviour. `syntax` delegates to the question bank's
`renderCodeBlock()`, which already paints an output pane — so the field works
whether or not the schema mentions it. **Mention it**, so `validate-theory.js`
applies the same `output.kind` rule it applies to question snippets instead of
silently ignoring the field.

### 18.4 `css/print.css` — the night-before sheet

**Adopt always.** It is the one reading mode the five-mode rail cannot serve,
and it is not a sixth mode: no rail item, no route, no storage key, no entry in
`modes.js`. It is a stylesheet and a `<link media="print">`.

Under `@media print`: hide the rail, sidebar, search field, background canvas
and back-to-top; expand every collapsed card and code block; force the light
palette; print the active `?cram` / `?tier=` filter as a header line so the
sheet says what it is a filter of; `break-inside: avoid` on `.question-card`.

It consumes the existing token layer and introduces no colour literal, so
invariant §16's "themes.css is the only file containing a colour literal"
survives unchanged.

### 18.5 Glossary kind chips

The Glossary already derives an **ASKED** chip from the question bank. A subject
whose vocabulary has a distinct syntactic class — annotations, decorators,
directives, CLI flags — may derive a second chip the same way, from the term
string itself. **Derived only.** A chip that needs a new authored field is not
this extension.

### 18.6 Drill tier → importance token mapping

§9.3 says drill tiers reuse the `--importance-*` tokens; there are four tiers
and three tokens. Fix the mapping in `theory.css` and record it in the manifest:

| Drill tier | Token |
|---|---|
| 1 | `--tier-must-*` |
| 2 | `--tier-must-*` |
| 3 | `--tier-should-*` |
| 4 | `--tier-good-*` |

A subject that uses fewer than four tiers maps them in order and says so.

---

## 17. The five sentences worth carrying to any new subject

1. **The content is the product**, and content that outlives its toolchain is
   worth more than content locked behind a dependency tree.
2. **A number that has not been checked is not a fact** — which is why an
   "Output" pane is re-executed, a documentation link is HEAD-probed, and a
   catalogue lives in the validator rather than being counted from the corpus.
3. **Five modes count five different things**, and the honest answer to "what is
   my overall progress" is that there isn't one.
4. **Structure what you want to be able to check.** Figures became a field
   rather than markup, and tiers became data rather than a derivation, for
   exactly this reason.
5. **A validator that cries wolf gets switched off**, so every check is scoped
   tightly enough to be believed.
