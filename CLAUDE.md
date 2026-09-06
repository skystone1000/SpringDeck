# SpringDeck — working notes

A static, build-free single-page interview-preparation deck for Java and Spring
Boot backend engineering. No bundler, no package manager, no framework, no
`npm install`. One `index.html` loads a fixed list of scripts in a fixed order,
and every file declares one global.

**Read before touching anything:** [`docs/DECK-BLUEPRINT.md`](docs/DECK-BLUEPRINT.md)
(the architecture, fixed) and [`docs/SPRINGDECK-PLAN.md`](docs/SPRINGDECK-PLAN.md)
(the content manifest and build phases, for this subject).

---

## The three rules that govern everything

1. **Load order is the dependency graph.** There are no imports. The `<script>`
   order in `index.html` *is* the dependency declaration. Forward references are
   pervasive and safe — every one of them runs from an event handler or from
   `initApp()`, long after every script has been parsed. Do not reorder to "fix"
   this.
2. **Colour lives in exactly one file.** `css/themes.css` holds every colour,
   radius, duration and type step. A grep for a hex literal or `rgba(` across the
   other stylesheets must return nothing.
3. **Validators stand in for tests.** There is no test framework. The Node
   scripts in `tools/` are the entire safety net, and they must pass before every
   commit that touches the corpus or the navigation.

---

## Commands

Run what is on disk; `ls tools/` is the authority, not this section. Before
**any** commit touching `data/` or the navigation:

```bash
node tools/validate-theory.js && node tools/validate-questions.js && node tools/validate-nav.js && node tools/validate-search.js
```

`validate-search.js` also belongs in any commit touching `js/search-index.js`
or `js/glossary.js` — it is the only check that reads a file out of `js/`.

`check-offline.js` is fast too, and belongs in any commit touching `index.html`,
the stylesheets or the load order:

```bash
node tools/check-offline.js
```

Not yet written, each one a deliverable of the phase that needs it:

| Tool | Arrives in | What it will guard |
|---|---|---|
| `check-doc-links.js` | Phase 9 | every `docs[]` and `referenceLinks[]` URL |
| `run-snippets.js` | Phase 9 | every `stdout` claim, against a real JDK |

**`validate-nav.js` holds the five mode totals as hard numbers.** Changing the
corpus means changing `EXPECTED_TOTALS` by hand in the same commit. If that
ever feels like friction, that is the check working — a refactor that quietly
halves the Predict total is what it exists to catch, and *"a number appeared"
is not a check.*

Serve locally (zero dependencies):

```bash
node tools/dev-server.js
```

Opening `index.html` from disk must also work. Check it before every phase gate.

---

## Commit discipline

- **Work goes straight to `main`.** No feature branches, no pull requests.
- **Imperative subject line, no trailing period** — "Add the drill block type",
  never "Added" or "Adds". Describe what the commit does to the project.
- **Then a blank line and a prose body explaining *why*, in full sentences.**
  The body is where the reasoning lives; the diff already shows the what. A
  commit with a subject and no body is not finished.
- One commit does one thing. A stylesheet and the markup that uses it are two
  commits.

### Hand-set commit dates

This project hand-sets its commit dates, as DroidDeck does, so the history reads
as the incremental build it describes rather than as one bulk import.

- The build history **starts on 2026-08-22** and advances forward. The two
  planning documents that precede the code are dated 2026-08-21.
- **15–17 commits per active day.**
- After every two or three active days, **skip one or two days entirely.** A
  history with no gaps in it does not look like one a person produced.
- Times run roughly 09:30–23:30 IST, ascending within a day, in irregular
  increments. Do not space them evenly.
- Timezone is `+0530` throughout.

Set both dates on every commit — Git takes the author date from
`GIT_AUTHOR_DATE` and the committer date from `GIT_COMMITTER_DATE`, and a commit
that sets only the first still sorts by the second:

Feed the message on stdin with a quoted heredoc, never with `-m`. A body
containing backticks, `[...]` or `$` gets mangled by the shell otherwise —
this has already silently eaten a phrase out of one commit message here:

```bash
GIT_AUTHOR_DATE="2026-08-22T10:15:00+05:30" \
GIT_COMMITTER_DATE="2026-08-22T10:15:00+05:30" \
git commit -F - <<'MSG'
Subject line

Body paragraph explaining why.
MSG
```

Record the last date used at the bottom of this file so the next session
continues the sequence instead of restarting it.

---

## Invariants — do not break these

- No build step, no package manager, no `node_modules` in the app path.
- `file://` works. Open `index.html` from disk and read a question, a chapter,
  a drill, a snippet and a term.
- Blocking all three CDNs costs the reader nothing but decoration.
- `css/themes.css` is the only file containing a colour literal.
- Nine hues plus slate. **No tenth.**
- `data/modes.js` is the only place that knows what a mode is.
- **No function anywhere adds the five progress counts together.** The five modes
  count five incompatible units; an average over them is a sixth number that is
  true of nothing.
- Question progress is keyed `topicId:questionId`, never the bare id.
- Predict verdicts are a **map** (right / wrong / unanswered), not a set.
- `?cram` and `?tier=` survive navigation and are shareable.
- Question numbers do not renumber under a filter.
- Scroll-driven hash updates use `replaceState`; only clicks use `location.hash`.
- Every legacy bare-segment link normalises rather than 404s.
- The glossary is harvested, never authored.
- `<img>` is outside the allowed tag subset; figures are structured data.
- No `stdout` claim on a language the runner cannot execute.
- Every `localStorage` access is inside a `try/catch`.

## Java-only

`languages[]` in `data/index.js` holds nine entries and `validate-questions.js`
rejects a tenth. Kotlin, Go, Node and Python are outside this deck by decision.
Where a cross-language comparison earns its place it is **prose in a
`comparison` block**, never a code snippet.

---

## Build state

| | |
|---|---|
| **Phases complete** | 0 — Skeleton · 1 — The tool chain · 2 — The question bank, core half · 3 — Theory, tracks 1–4 · 4 — The rail and the five modes · 5 — Search |
| **Next phase** | 6 — The question bank, remaining topics |
| **Corpus** | Questions: 10 topics, 244 questions, 49 snippets, 14 diagrams |
| | Theory: 41 modules, 318 chapters on the reading path, 47 glossary terms, 24 diagrams |
| | Tracks: java-platform 14/104 · spring-core 7/51 · web-api 7/53 · persistence 13/110 |
| | Sets: synthesis 2 modules / 19 drills · output 4 modules / 34 predicts |
| **Phase 4 remaining** | none. Tiers 2 and 3 (27 drills) and the seven non-`stdout` predict sets are Phase 8 by plan |
| **Search index** | 662 entries — questions 244 · theory 318 · synthesis 19 · predict 34 · glossary 47 |
| **Last commit date used** | 2026-09-06 |
| **Commit cadence** | **Reduced by instruction on 2026-09-03.** Fewer, larger commits — one per unit of work rather than 15–17 a day. The hand-set dates and the ascending-within-a-day rule still hold. |

### Phase gates recorded

**Phase 5 — Search.** PASSED. **This is the first shippable state**, which is
what the plan says Phase 5 is for. Both halves of the gate were checked in the
running page, not argued:

- **A term from a `sql` code block finds its chapter.** `gin_trgm_ops` appears
  in exactly one place in the deck — inside a `CREATE INDEX` in
  `indexes-and-plans` — and it is the only result. Sixteen such identifiers
  exist and `validate-search.js` samples eight of them on every run.
- **A question result lands on an expanded card.** One card open, its body
  visible, the panel closed and the input blurred, and `?cram` still in the
  address bar afterwards.
- **All five validators green**, `validate-search.js` among them for the first
  time, and **all twelve of its failure modes were induced on purpose.** Ten
  fired. **Two did not, and both were the check being wrong rather than the
  code being right** — see the two new blind spots below. They fire now.
- **Eighty-eight routes swept at 390px, 768px and 1280px** — every mode index,
  every topic, every module, every set and all twenty-six glossary letters.
  264 combinations, no horizontal document overflow, no `NaN` in any diagram,
  no empty diagram slot. The sweep found one real defect at 768px; see below.
- **No console errors on a fresh tab across all 88 routes.** The first sweep
  reported a page of `NaN` geometry errors and every one was stale — see the
  blind spot about console buffers.
- **Escaping proved rather than assumed.** Searching `List<String>` matches the
  decoded corpus text and renders `<mark>List&lt;String&gt;</mark>`; the only
  element inside any excerpt is `mark`.
- **Both themes.** The highlight was invisible in dark until this phase; it is
  now checked in both, and the search panel is the only place `mark` appears.
- **`file://` was NOT opened by hand.** Fifth gate. Unchanged reason, and it
  remains the oldest open item in this file.

**Phase 0 — Skeleton.** PASSED. The page renders in both themes; the code
gutter and the code source agree on line count exactly. `grep -nE
'#[0-9a-fA-F]{3,8}\b|rgba?\(' css/*.css | grep -v themes.css` returns nothing
— it caught eighteen literals in `print.css` on the day it was written, which
were moved into the token layer as `--print-*` primitives.

**Phase 2 — The question bank, core half.** PASSED. Ten topics, 244 questions.
Every gate criterion was checked against the running page rather than argued:

- **Every topic renders.** All ten, with the right card count, the right track
  eyebrow and the right hue; card numbering is 1..n in every one.
- **The tier filter works and is shareable.** Toggling chips rewrites `?tier=`
  with `replaceState`, the filter survives navigation to another topic, and
  the card numbers do not move — card 27 is still card 27 with the first
  twenty-six hidden.
- **Progress works.** Keys are `topicId:questionId` in `localStorage`, the
  sidebar count, the header bar and the rail meter all follow a toggle, and
  `progressStore` still contains no function that adds the five modes together.
- **All 14 diagrams mount**, one per `hasDiagram` question.
- **Every legacy bare segment normalises** — all ten tested, `#collections`
  to `#questions/collections`; an unknown segment gives the empty state rather
  than a blank page.
- **The gutter and the source agree** on every code block in the corpus.
- `node tools/validate-questions.js` exits 0, and it fired on real content
  eleven times during the phase: nine must-know questions with no reference
  link, one camelCase id, and two questions whose text tripped an
  over-broad markup check that was then narrowed.
- **`file://`: the static half passed, the manual half did not run.**
  `check-offline.js` was written during this phase and passes — every local
  reference relative and present with exact case, every remote reference
  optional, no network APIs, all eleven `localStorage` accesses guarded. The
  page itself was **not** opened from disk, because the in-app browser
  declines to navigate to a `file://` URL. **Do this by hand before the Phase 3
  gate**, and read a question, a code block and a diagram while there.

**Phase 4 — The rail and the five modes.** PASSED, with the same item still
not run. Five modes render, and the deck stopped being a question bank with a
theory section attached.

- **All three validators green**, `validate-nav.js` among them for the first
  time. **Ten of its failures were induced on purpose and all ten fired** —
  including the one that matters most, a total off by one. That last probe
  then shipped: the `git checkout` that was meant to undo it did nothing,
  because the file was still untracked, and `validate-nav.js` went in with
  `predict: 35`. **The check caught its own author within the hour**, which
  is a better argument for it than the ten induced failures were. The lesson
  is the older one: run the validators immediately before the commit, not
  before the last edit.
- **Every legacy bare segment normalises.** All ten tested, `#collections` to
  `#questions/collections`; an unknown segment gives the empty state.
- **Digits 1–5 switch modes**, and the guard holds: a digit typed into the
  search box is a digit.
- **Each mode counts its own noun** — KNOWN, READ, REHEARSED, SOLVED, SEEN,
  read off the rail meter in all five. **`progressStore` still contains no
  function that adds them together**, and now neither does anything else:
  the meter is one subscription in `rail.js` rather than a copy per mode.
- **A predict verdict is one write.** The same binder serves the Predict mode
  and a chapter, so the two screens cannot disagree about what is solved.
- **No console errors across nine routes** covering all five modes, and no
  horizontal document overflow at 390px or 1280px on any of them.
- **`file://` was NOT opened by hand.** Fourth gate. Unchanged reason, and it
  is now the oldest open item in this file.

**Phase 3 — Theory, tracks 1–4.** PASSED, with one item explicitly not run.
41 modules, 318 chapters, 1,030 blocks, against a plan target of ~320 chapters.

- **Both validators green.** `validate-theory.js` and `validate-questions.js`
  exit 0, as does `check-offline.js`.
- **All ten of validate-theory's checks have now been broken on purpose and
  confirmed to fire**, which was the outstanding item from Phase 1. The ones
  proved during this phase: duplicate `order`, a `trackId` that is not a
  subject track, a prerequisite whose order is not strictly lower, `stdout`
  claimed for SQL, a `relatedQuestions` id that does not resolve, a module in
  `VERSION_BLOCK_MODULES` with no version block, a module in
  `VERSION_EVERY_CHAPTER` with a chapter missing one, and a non-`stdout`
  predict with no `verification` string.
- **Every one of the 317 `relatedQuestions` references resolves**, and all 361
  documentation links are full https URLs.
- **Every module in the version-block list carries one.**
- **All 24 diagrams mount with non-empty SVGs** — 17 flowchart, 6 sequence,
  1 animation — checked in the page, not in the data. **That check was not
  sufficient and three of them were broken.** See the NaN blind spot below;
  the corrected assertion is that no diagram's markup contains the string
  `NaN`, which is what is now checked.
- **All 56 routes were swept for horizontal document overflow at 390px, 768px
  and 1280px** and are clean. The sweep found two real defects at 390px; see
  the inline-code blind spot below.
- **Not one `stdout` claim in the theory corpus.** All 75 outputs are `trace`.
  That is the correct position while no JDK exists here, and it is recorded in
  the plan's §4.2 as well.
- **`file://` was NOT opened by hand.** Third phase gate in a row. The static
  half passes; the manual half is blocked by the harness, not by the deck, and
  it is now overdue rather than merely outstanding. **Do it in a real browser
  before the Phase 4 gate.**

**Phase 1 — The tool chain.** PASSED. `node tools/validate-questions.js` exits
0, and every one of its seven checks was broken on purpose and confirmed to
fire: bad tier, duplicate id, must-know with no reference, image with no
attribution and no file on disk, `stdout` claimed for a non-runnable language,
unknown language (a Kotlin snippet — the Java-only rule holds), disallowed tag,
inline event handler.

### Known blind spots — recorded now, not discovered in Phase 9

- `check-doc-links.js` will follow HTTP redirects but **cannot see an HTML
  meta-refresh**. Spring's documentation restructured its URL scheme between
  the 2.x and 3.x reference layouts, and a stub page that answers 200 and
  refreshes elsewhere will pass. Budget one manual link-reading pass per
  documentation source, per phase that adds links.
- SQL predict answers are dialect-dependent. Every `artefact: 'sql-result'`
  entry must name the engine and version it was checked against. Write
  "PostgreSQL 16", never "SQL".
- `validate-questions.js` check 4 (images) has been exercised against a
  synthetic failure but no real figure exists in the corpus yet. Re-confirm it
  against the first vendored figure rather than assuming.
- **There is no JDK on the machine this deck is being built on.** `java -version`
  fails. So `run-snippets.js` cannot actually execute anything yet, and every
  `kind: 'stdout'` authored so far is a claim the toolchain has not verified —
  the validator only checks that the *language* is runnable, which is a
  different assertion. Phase 9 does not start until a JDK is installed and
  `run-snippets.js --selftest` has been run against the whole corpus. Until
  then, prefer `trace` whenever the output is not certain, and never write an
  output pane for anything timing-dependent, machine-dependent or racy.
- CSS custom properties fail *silently* when the name is wrong: `var(--typo)`
  is an unset property, not an error. The colour grep cannot catch it and
  neither validator looks at CSS. One such typo shipped in Phase 2 and was
  found only by looking at the rendered page. Look at the page.
- **Nothing bounds code-snippet line length, and print depends on it.** At
  8.5pt an A4 column fits about 92 characters; the longest line in the corpus
  is 92. The gutter is now hidden when printing so a wrapped line cannot
  misnumber the rest, but wide snippets still read badly on paper. If a
  validator check is ever added for this, ~78 characters is the comfortable
  bound.
- **A same-URL navigation can serve a cached script even with `no-store`.**
  A change appeared not to take effect for half an hour during Phase 2 and the
  code was fine. Reload with a changed query string before believing a fix
  failed.
- **`file://` still has not been opened by hand, and the reason changed.** The
  in-app preview pane rewrites a local file into a `data:` URL — `protocol`
  reads `data:`, `typeof topics` is `undefined`, nothing renders — so no
  relative `<script src="js/…">` can resolve. That is a limitation of the
  harness, not a finding about the deck, and it must be recorded as neither a
  pass nor a failure. `check-offline.js` still covers the mechanical half.
  **Open `index.html` from a real browser's File → Open before the Phase 3
  gate**, and read a question, a chapter, a code block and a diagram there.
- **Every diagram renderer fails soft, and so does anything else that returns
  a string.** `flowchart`, `sequence` and `animation` each `return ''` when
  their config is empty, which is right at run time — a half-drawn diagram must
  not take a page down — and it means a config with the wrong key names mounts
  as an empty box with nothing in the console. `checkDiagram` in `schema.js`
  now catches it for both corpora. The general lesson is the one to keep:
  **anything that fails soft in the renderer needs a hard check in the
  toolchain**, because the page will not tell you.
- **A long unbreakable token overflows a narrow grid track silently.** The
  `types` and `comparison` blocks both put a name in a `minmax()` column that
  shrinks on a narrow viewport, and Java identifiers do not shrink with it —
  `postProcessBeforeInitialization` needed 242px in a 167px track and ran
  underneath the next column. Fixed with `overflow-wrap: break-word` on both,
  and a `.table-scroll` container for wide tables. Watch for the same shape in
  any new block type that has a fixed-width column.
- **A CSS selector that matches nothing is invisible.** The reveal pane under
  every predict card was styled `.predict-card.is-revealed` while the renderer
  emitted `.block-predict`, so the pane had been permanently hidden since
  Phase 3 — no error, no warning, and a feature that simply never appeared.
  The colour grep cannot see it, no validator looks at CSS, and reading the
  stylesheet does not reveal it either. **Only exercising the feature does.**
  Same family as the `var(--typo)` blind spot below and worth stating
  separately, because that one is a wrong value and this one is a rule that
  never applies.

- **A diagram can mount with the right node count, the right edge count and
  the right labels, and still be geometrically NaN.** Three flowcharts —
  every one that contains a loop — ranked their nodes over more ranks than
  they had, left holes in a sparse array, and turned `Math.max` into `NaN`,
  which propagated to the viewBox and every coordinate. Nothing rendered.
  The count-and-shape check that has caught every other diagram defect here
  passed on all three, `checkDiagram` passed because the *config* was fine,
  and the only signal was a browser console message naming no chapter. **The
  gate check is `svg.outerHTML.includes('NaN')` over every route**, four
  lines in the console, and it belongs next to the overflow sweep below.

- **`overflow-wrap: break-word` does not shrink a grid track; `anywhere` does.**
  The two wrap identically, but only `anywhere` reduces an element's
  *min-content* width — and a grid track sized `auto` takes its width from
  min-content. So a `types` item holding one 47-character property key in
  inline code claimed 378px inside a 310px block and pushed the whole document
  sideways, with `break-word` already applied and doing nothing. The first fix
  looked like it worked because it happened to correct one of the two affected
  pages. `:not(pre) > code` in `styles.css` now uses `anywhere`. **Sweep every
  route for `documentElement.scrollWidth > clientWidth` at 390px after any
  content phase** — it is four lines in the console and it found both.

- **A check that agrees with itself is not a check.** `validate-search.js`
  compared each glossary entry's slug to `glossaryTermSlug(entry.title)` — but
  the entry was BUILT by that function, so the comparison held by
  construction. The probe that should have broken it (changing the separator)
  did not fire, and that silence is the only reason it was found. What can
  actually drift is `glossary.js`, which renders the element the slug has to
  match. The general form: **a validator must read a DIFFERENT source of truth
  from the one that produced the value**, or it is asserting `x === x` in a
  costume. Route resolution in that file was already written this way; the
  slug check was not, and nothing distinguished them from the outside.

- **A gate check can pass for the wrong reason and look identical to one that
  passed for the right one.** The sql-identifier check asked for tokens
  appearing in a `sql` snippet and unique to one entry. Deleting `block.code`
  from the indexer entirely — so that not one line of SQL was searchable —
  still left seven such tokens, because they also appear in the prose around
  the snippet, and the check went green. Same family as the diagrams that
  mounted with the right node count, the right edge count, the right labels
  and `NaN` for every coordinate. **Ask what would have to be true for the
  check to fail, then make that true and watch it.** The fixed version also
  requires the candidate to be absent from its own chapter with the code
  blanked out, and taking `block.code` away now takes the sample to zero.

- **A long-lived browser tab's console buffer is not evidence.** The first
  error sweep of Phase 5 reported a screenful of `<path> attribute d:
  Expected number, "MNaN..."` — the exact signature of the Phase 3 diagram
  bug, apparently back. It was not. The dev-server tab had been open since
  Phase 3 and the buffer survives navigation, so those errors were emitted
  weeks of commits earlier. **Open a new tab before reading the console, and
  re-derive the finding in it.** Eighty-eight routes in a fresh tab produced
  none.

- **An overflow sweep at 390 and 1280 does not cover 768.** The Phase 4 sweep
  ran at the two ends and `#predict/predict-collections` overflows at neither:
  a phone wraps the option text and a desktop column is wide enough for it.
  At 768 the sidebar is still on screen and the content column is at its
  narrowest relative to its content, which is where a fixed-width flex or grid
  item breaks out. **Three widths, and the middle one is the one that finds
  things.**

- **A comment containing a hex value breaks the colour grep.** The grep in the
  Phase 0 gate is `grep -nE '#[0-9a-fA-F]{3,8}\b|rgba?\(' css/*.css | grep -v
  themes.css`, and it does not know what a comment is. A note explaining why a
  highlight was invisible, written with the two colours in it, made
  `components.css` report as a violation. **A comment is not an exemption** —
  the grep is the invariant, so the comment says the colours in words.

- **This file has told at least one lie about its own tool chain.** The
  Commands section listed `validate-nav.js`, `check-doc-links.js` and
  `run-snippets.js` as things to run before a commit, for three phases, and
  none of the three exists — they are Phase 4 and Phase 9 deliverables. A
  command that fails with MODULE_NOT_FOUND in the middle of an `&&` chain also
  masks whether the checks before it passed. `ls tools/` is the authority.

- **`element.hidden` does nothing to a component whose class sets `display`.**
  The UA stylesheet's `[hidden]` loses to any author rule, and every component
  here sets `display` on a class. `styles.css` now carries
  `[hidden] { display: none !important; }`. The Phase 2 symptom: leaving cram
  mode widened the filter and cleared the query string but left the banner on
  screen claiming cram mode was still on.
