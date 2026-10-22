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

The two Phase 9 tools touch the network or a JDK, so they are **not** in the
pre-commit chain. Run them when the thing they guard changes, and read the
output rather than the exit code — both end with a paragraph naming what they
did *not* check.

```bash
node tools/run-snippets.js --selftest
node tools/check-doc-links.js
```

| Tool | Guards | Run it when |
|---|---|---|
| `run-snippets.js` | the **58** `stdout` claims — 28 question snippets, 30 predicts — compiled and executed twice each. The other 35 snippets and 51 predicts are `trace` and are not its business | any snippet or its `output.lines` changes |
| `check-doc-links.js` | the **1,365** `docs[]`, `docHub` and `referenceLinks[]` URLs, 762 distinct: https, no redirect, no meta-refresh stub, `#fragment` present | any link is added or edited; and once a phase regardless, because rot is not caused by a commit |

**Always pass `--selftest` to `run-snippets`.** A runner that always returns
"matched" and a corpus that is entirely correct print the same thing. Four
probes with known answers cost two seconds, and the first time they ran, one
of them found a real defect in the runner. `check-doc-links --selftest` is
the same idea for the two checks that read a page body, and needs no network.

`run-snippets` finds a JDK by searching a broad candidate list — Android
Studio's bundled JBR among them — and prints the one it chose. Override with
`SPRINGDECK_JAVA_HOME` or `--jdk`.

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
| **Phases complete** | **All eleven.** 0 — Skeleton · 1 — The tool chain · 2 — The question bank, core half · 3 — Theory, tracks 1–4 · 4 — The rail and the five modes · 5 — Search · 6 — The question bank, all 26 topics · 7 — Theory, tracks 5–8 and the §5.9 insertions · 8 — The drill and predict catalogues · 9 — Verification · 10 — Documentation and triage |
| **Next** | Nothing is planned. The open items are the seven Phase 10 findings below and the four unverified things in `docs/verification-log.md` §6 |
| **Corpus** | Questions: **26 topics, 486 questions**, 63 snippets, 19 diagrams |
| | Theory: **83 modules, 687 chapters** on the reading path, 2,045 blocks, 61 glossary terms, 35 diagrams, 346 syntax blocks |
| | Tracks: java-platform 20/163 · spring-core 7/51 · web-api 8/64 · persistence 14/121 · security 6/48 · distributed 11/86 · production 10/86 · craft 7/68 |
| | Sets: synthesis **4 modules / 46 drills** (tiers 8·12·15·11) · output **11 modules / 81 predicts** (30 `stdout`, 51 not) |
| **Catalogues** | Both complete and both still held as hard lists in `validate-theory.js`. An invented id is an error; an unwritten one is a warning. There are now none of either |
| **Search index** | 1,361 entries — questions 486 · theory 687 · synthesis 46 · predict 81 · glossary 61 |
| **Verified** | 58/58 `stdout` claims executed against OpenJDK 25 · 762 distinct doc URLs, zero errors · findings in [`docs/verification-log.md`](docs/verification-log.md) |
| **Last commit date used** | 2026-10-21 |
| **Commit cadence** | **Reduced by instruction on 2026-09-03.** Fewer, larger commits — one per unit of work rather than 15–17 a day. The hand-set dates and the ascending-within-a-day rule still hold. |

### Phase gates recorded

**Phase 10 — Documentation and triage.** PASSED. `ARCHITECTURE.md`,
`CODEBASE.md`, `FEATURES.md` and **26 triage files carrying 486 table rows**,
one per question, marked against the four judgements the plan names.

- **All 486 questions read once.** The row counts add up to 486 and the 81
  rows marked as having no reference agree exactly with what the corpus
  reports — which is the only mechanical proof available that the read
  covered everything and was recorded honestly.
- **One answer was wrong, and the way it survived is the finding.**
  `static-nested-vs-inner` asserted that an inner class holds a reference to
  its enclosing instance, full stop. javac elides that field when the class
  never uses the outer. **Phase 9 found and fixed the identical fact in a
  predict block two files away**, because `run-snippets` reads `output.lines`
  — and nothing reads an answer. Fixed.
- **Ten topics have no subsections**, so 148 questions render as one flat list
  while sixteen topics get headings. `streams-functional` is the worst at 28.
- **`heap-and-gc` has nine chapters and zero `relatedQuestions`** — the only
  subject module in the deck with none — and `jvm-memory` has 28 questions it
  should be pointing at. With `streams-and-lambdas` missing
  `streams-functional`, those two gaps are **45 of the 80 uncited questions**.
- **81 questions carry no reference and the distribution is not random**:
  `aop-proxies` is at 50% and the gap is positional, every question from the
  eighth onward, while sixteen topics have complete coverage.
- **A hypothesis was tested and refused rather than repeated.** Security-
  flavoured questions are not under-cited — 14% against a 17% baseline. Two
  bad cases are not a pattern, and the refusal is recorded so the next reader
  does not form the same impression from the same two examples.
- **Every topic's `keyTopics` is fully covered**, 26 for 26.
- **All five validators green** throughout; no corpus totals changed, and
  `run-snippets` and `check-doc-links` re-run clean after the one content fix.
- **The corrected answer renders**, with the condition and `this$0` present and
  `this$1` gone, and no console errors with the reader proved by a deliberate
  one.
- **The overflow sweep was NOT completed and the reason is the harness, not
  the deck.** The browser pane reported `clientWidth: 0` on 17 of 24
  measurements, which makes `scrollWidth > clientWidth` trivially true and
  produced a "531 elements overflow" reading that was entirely an artefact.
  The seven measurements taken at a real width (1121px) were clean. **Recorded
  as neither a pass nor a failure**, exactly like the `file://` item, and worth
  re-running when the pane is stable — this phase changed one answer's prose
  and nothing structural, so the risk is low.

**Phase 9 — Verification.** PASSED. Both tools written, both self-tested, and
between them they found **eight defects that had been in the corpus for
phases** — three wrong `stdout` claims, five link titles describing the wrong
page — plus 57 rotted URLs.

- **The phase was never actually blocked.** It had been deferred since Phase 3
  on the belief that this machine had no JDK. Android Studio bundles a
  complete OpenJDK 25, javac included, at
  `Contents/jbr/Contents/Home`. `java -version` failing on the PATH is not
  the same question as "is there a JDK here", and **eight consecutive gates
  deferred an item on evidence nobody re-examined.** Recorded as a blind spot
  below because the shape of it will recur.
- **58/58 `stdout` claims execute and match**, twice each. The double run is
  the check that keeps a racy snippet from being blessed by luck.
- **`run-snippets --selftest` found a defect in `run-snippets` on its first
  run.** The timeout probe reported "the JVM exited non-zero", because
  `execFileSync` leaves `error.killed` undefined and signals a timeout through
  an undocumented `code` field. `spawnSync` returns the two as distinguishable
  fields. That is the entire argument for a selftest, made on day one.
- **The three snippet defects were all mechanism, not lesson.** A `final`
  field that was a compile-time constant and so never demonstrated the hazard
  it was written for; a `Set.of` that throws on a duplicate rather than
  collapsing it; and an inner class whose synthetic `this$0` javac elides
  because the class never used its outer. Each taught a true thing with a
  broken demonstration.
- **1,365 doc links, 762 distinct, zero errors.** 57 were broken: 49
  redirects, 4 dead, **4 meta-refresh stubs** — the exact blind spot this file
  had recorded as "budget a manual pass for", now caught mechanically.
- **Oracle answers a missing page with a 200 redirect to the current JDK
  landing page rather than a 404**, which made five wrong filenames look like
  withdrawn documentation for three phases. The JDK 21 tree is intact.
- **12 of 15 dead-anchor reports were the check**, again. Both `kafka.apache.org`
  and `spring.io` build their sections in script. Fixed by counting a fragment
  as live when the page's own navigation links to it — a second source of
  truth, not a softening — and then fixed again when the first version of that
  rule required quoted attributes and Kafka writes `href=/documentation#design`.
- **`validate-questions` check 4 was exercised against a real figure at last**,
  through all six branches, and the existence check was wrong: a bare
  `existsSync` is case-insensitive on macOS. Now `existsCaseExact()` in
  `schema.js`, shared with `check-offline.js`.
- **`docs/verification-log.md` exists**, four phases after the plan asked for
  it, and its last section is what was *not* checked.
- **20 routes swept in a fresh tab after 46 data files changed.** 224 external
  links render, none malformed, no horizontal overflow, no `NaN`, no literal
  `&lt;code&gt;`. All three of those assertions were then broken on purpose
  and all three fired, because a check that passes everywhere may be vacuous.
  **No console errors**, with the reader proved by a deliberate one.
- **The cached-script blind spot recurred and the note in this file paid for
  itself.** The first read of the rewritten predict block showed `this$1`,
  the value the fix had removed. The fix was fine; the tab was serving the
  previous `predict-io-and-time.js`. A reload with a changed query string
  showed `this$0` and the new wording. **Reload with a cache-buster before
  believing a fix failed** — this is the second time.
- **`file://` was NOT opened by hand.** Ninth gate. Unchanged reason, and it
  is now the only item that has survived every gate this project has held.

**Phase 8 — The drill and predict catalogues, completed.** PASSED. 27 drills
and 47 puzzles, taking Synthesis to **46 across four tiers** and Predict to
**81 across eleven sets**. Every mode in the deck now holds its full corpus.

- **Both totals were met exactly, and that is the catalogues working rather
  than an achievement.** `DRILL_CATALOGUE` and `PREDICT_SETS` are hard lists
  in `validate-theory.js`: an id outside the list is an error and an id in the
  list with nothing written is a warning. The corpus could not drift from the
  plan in either direction, and the run now emits neither kind.
- **All five validators green**, with `EXPECTED_TOTALS` stepped by hand in
  each of the six content commits.
- **45 route/width combinations swept** — all 15 set routes at 390px, 768px
  and 1280px, **with every one of the 81 answer panes open**, because the
  widest state a predict route ever has is the revealed one and sweeping it
  closed would have measured the wrong page.
- **The reveal loop was exercised end to end.** 0 panes visible on a clean
  load, one click stores a verdict keyed by predict id, the pane opens, the
  rail counter moves, and nothing is written to any other mode's key.
- **Looking at the page found a defect again, for the second phase running.**
  Clicking an option on the SQL set showed the trace pane rendering a psql
  result table as "1. count 2. ------- 3. 0". Ninety such lines across six
  sets. Rewritten as steps, and `validate-theory` grew a twelfth check.
- **Two gate assertions failed on every route and both were the check.** See
  the blind spot; the pattern is now three-for-three across Phases 6, 7 and 8.
- **Search reaches the new corpus.** 1,361 entries. `strangler` returns
  exactly one result and it is the new tier-2 decomposition drill.
- **No console errors across 103 routes in a fresh tab**, with the reader
  proved alive by a deliberate error afterwards.
- **`file://` was NOT opened by hand.** Eighth gate. Unchanged reason, and it
  is still the oldest open item in this file.

**Phase 7 — Theory, tracks 5–8 and the §5.9 insertions.** PASSED. 42 modules
authored, taking the reading path to **83 modules and 687 chapters** across all
eight subject tracks. The deck now has a curriculum with no gaps in it.

- **687 is the number §5.11 computed before any of these chapters existed.**
  The manifest added up chapter counts from the module plans; the corpus
  reached the same figure by being written module by module over eighteen
  commits, without consulting it. Two counts derived from opposite ends
  agreeing exactly is the only check available on a manifest no validator can
  read.
- **All five validators green**, with `EXPECTED_TOTALS` stepped by hand in
  every one of the eighteen content commits rather than once at the end.
- **`validate-search` caught its own author, and did it AFTER the commit
  landed.** `idempotency` defined a term `http-foundations` already defines,
  and the glossary slug collided. The run that would have caught it was
  chained behind `&&` on the same line as the commit, so the commit ran
  regardless. Fixed by amend, and the working rule is now: **run the
  validators as a separate call and read the output before staging anything.**
- **249 route/width combinations swept** — all 83 theory routes at 390px,
  768px and 1280px. No horizontal overflow, no `NaN` in any diagram, no empty
  diagram slot, and the chapter count on every route matched the corpus.
- **The diagram check was rewritten mid-gate because the old one was
  vacuous.** See the new blind spot; the count is now asserted per module
  against the corpus, and all three of its branches were broken on purpose.
- **The four new sidebar groups render**, and the DOM agrees with the
  registry: eight groups, eight distinct hues, and module counts of
  20/7/8/14/6/11/10/7 matching `modulesInTrack()` exactly. All 83 module
  headers carry a `data-hue` that equals their track's — the check that the
  null-track defect in Phase 6 taught us to write.
- **98 prerequisites in the data, 98 rendered as links.** 23 of them cross a
  track boundary, which is what the global reading order exists for.
- **Search reaches the new corpus.** 1,287 entries. `code_verifier` returns
  exactly one result, the PKCE chapter; `CooperativeStickyAssignor`,
  `crypto-shredding`, `PACELC`, `OOMKilled` and `SKIP LOCKED` each land in the
  new material.
- **The glossary is 61 terms across 18 initials**, and the sidebar renders
  exactly those 18. One `Idempotent`, one `Idempotency key`.
- **No console errors across 88 routes in a fresh tab** — and the console
  reader was proved to work by emitting an error into it deliberately, because
  a silent console and a broken reader look identical.
- **Looking at the page found a defect nothing else could.** A screenshot of
  the OAuth parameter table showed `<code>state</code>` rendered as literal
  angle brackets. 46 such literals across 22 modules, the oldest shipped in
  Phase 3. Fixed, and `validate-theory` grew an eleventh check.
- **`file://` was NOT opened by hand.** Seventh gate. Unchanged reason, and it
  is still the oldest open item in this file.

**Phase 6 — The question bank, remaining topics.** PASSED. All sixteen
remaining topics authored: 26 topics, **486 questions**, against a plan
estimate of ~853. Every track now has at least one topic, so all nine sidebar
groups render for the first time.

- **All five validators green**, and the totals were updated by hand in each
  of the sixteen commits rather than once at the end, per the plan's
  instruction. `validate-nav` refused a wrong figure once — 361 against an
  actual 359 — which is the third time it has caught its own author.
- **`validate-questions` check 2 fired on real content for the first time.**
  `graceful-shutdown` existed in both `spring-core` and `observability-ops`.
  Renamed rather than exempted: the two are the framework-level and the
  platform-level question and they are genuinely different. Until now that
  check had only ever been exercised against a synthetic duplicate.
- **Seventy-eight topic/width combinations swept** — all 26 topics at 390px,
  768px and 1280px. No horizontal overflow, no `NaN` in any diagram, no empty
  diagram slot, no topic rendering zero cards, and card numbering 1..n
  everywhere.
- **The null track renders.** `behavioural-project` is the first topic with
  `track: null`, so the "Everything else" group and `topicsInTrack(null)` are
  exercised by real content rather than only by a validator. The sweep found
  one defect doing it; see the new blind spot.
- **Deep links, legacy segments and the tier filter all work on the new
  topics.** `#design-patterns` normalises, a card deep link opens expanded,
  and card numbers do not move under a filter.
- **Search reaches the new corpus.** 904 entries, and terms that exist in
  exactly one new topic — `cardinality explosion`, `preStop`, `ESR rule`,
  `presigned` — each return it.
- **No console errors on a fresh tab** across the whole sweep.
- **`file://` was NOT opened by hand.** Sixth gate.

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

- **A viewport of zero makes every overflow check pass and every element an
  offender.** The Phase 10 render check reported 531 elements wider than the
  viewport and `scrollWidth > clientWidth` on every route; `clientWidth` was
  **0**, because the browser pane had collapsed. `237 > 0` is true and means
  nothing. **Assert the viewport is non-zero before believing an overflow
  result** — the sweeps in Phases 5, 7 and 8 never did, and would have
  reported clean or dirty for the same reason without saying which.

- **NOTHING IN THIS REPOSITORY READS AN ANSWER.** `run-snippets` reads
  `output.lines`. `validate-questions` reads tiers, ids, links, languages and
  tags. `validate-theory` reads block structure. `check-doc-links` reads a
  URL. **Not one of them reads the prose a reader actually reads**, and Phase
  10 proved what that permits: `static-nested-vs-inner` stated an inner class
  holds its enclosing instance unconditionally, which is false, and it
  survived every check — including Phase 9, which found and fixed *the
  identical fact* in a predict block two files away, because that one lived in
  a field a tool reads. The only instrument for this class of defect is
  reading, and the record of the one reading that has happened is
  `docs/triage/`.
- **A validator that checks a reference RESOLVES has not checked that a module
  HAS one.** `heap-and-gc` has nine chapters and zero `relatedQuestions`, and
  `validate-theory` is green: it verifies every reference that exists, and a
  module with none produces no reference to verify. **A check over a
  collection needs to assert something about the empty collection**, or an
  absence is indistinguishable from correctness. Same shape as the diagram
  renderers that `return ''`.
- **"Has a reference" and "is supported by a reference" are different
  properties, and only the first is checked.** Check 3 requires a `must-know`
  question to carry a link and verifies it is https. `behavioural-project`
  cites Oracle's Java SE Troubleshooting Guide for a question about how to
  *tell* a debugging story, and three of its questions share one generic
  hiring page. Nothing is wrong by the rule and four references help nobody.
- **Two questions can say the same thing under different ids and nothing
  notices.** Check 2 refuses a duplicate *id* across topics — that is what
  fired on `graceful-shutdown` in Phase 6 — and compares no content.
  `try-with-resources` is answered in both `java-language` and `java-io-time`;
  `dto-vs-entity` in both `rest-api` and `architecture-ddd`. Both pairs are
  defensible, and both are one answer maintained in two places, **so if one is
  corrected the other will not be** — which is exactly how the inner-class
  error above survived.
- **`subsections` is optional and its absence is silent.** `app.js` emits a
  heading whenever a question's subsection changes; a topic with an empty
  `subsections[]` simply gets none, and ten topics — 148 questions — render as
  a flat list. Nothing distinguishes "this topic does not need grouping" from
  "nobody wrote the groups".
- **`keyTopics` is a coverage manifest, not a tier list, and nothing says so.**
  It asserts the topic must *address* a thing, not that the thing is
  `must-know`. Sixteen `keyTopics` across the deck land at `should-know` or
  lower and every one is a defensible call, but a reader will read the
  mismatch as an oversight and re-derive the distinction. Worth stating
  wherever `keyTopics` is next touched.

- **The renderer has two output kinds and the data cannot tell you which one
  a line was written for.** `stdout` draws a `<pre>` of literal console text;
  `trace` draws an `<ol>` headed "What happens, in order". A psql result table
  pasted into a trace therefore renders as "1. count · 2. ------- · 3. 0 ·
  4. (1 row)", and nothing objects: the pane draws, the validators pass, the
  search index finds the text. Ninety such lines went in across six predict
  sets in one phase, because when the answer genuinely IS what a console
  printed, pasting the console is the obvious thing to write.
  `validate-theory` check 12 now holds the four shapes a transcript has and a
  step list never does. **The rewrite improved the content, which is the part
  worth remembering** — six numbered steps explaining why `NOT IN` returns
  zero rows is the answer; a copied result table was never the answer, it was
  a picture of one.
- **Two gate assertions failed on every route in Phase 8 and both were the
  check.** The set routes emit no `.chapter[data-chapter-id]` at all, because
  `predict.js` and `synthesis.js` flatten a set into a list of blocks; and
  "eight revealed panes" was one real `.is-revealed` plus seven
  `.predict-reveal` elements hidden by CLASS rather than by the `hidden`
  attribute. That is now three phases running — the tier-badge double-count in
  6, the glossary double-count in 7, these two in 8. **The rule has earned its
  place: look at one case by hand before believing any aggregate**, and a
  count that is an exact multiple of the truth is the selector, every time.
- **A sweep that measures a collapsed component measures the wrong page.** The
  first Phase 8 overflow sweep ran with every predict answer pane closed,
  which is the narrowest state a predict route ever has and therefore the one
  least likely to overflow. Re-run with all 81 revealed — where the long
  prose steps actually live — it was still clean, but the first result had not
  established that. **Sweep the widest state a route can reach**, not its
  initial one.
- **A helper that dedupes on a field nothing sets silently does one item.**
  The reveal-everything helper keyed on `card.id || card.dataset.id`, both
  undefined on a predict card, so it clicked one option per route and reported
  11 instead of 81 — a plausible-looking number that would have passed
  unexamined if the expected value had not been written down first.

- **A field that is escaped and a field that is markup look identical in the
  data.** A `types` item is `{ name, html }`: the name goes through `esc()`
  and the description does not. Writing `name: '<code>state</code>'` produces
  literal angle brackets in the column a reader looks at first, and nothing
  anywhere says so — the tag check only ever ran over the fields listed as
  carrying HTML, which is correct and says nothing about the rest. 46 of them
  accumulated across 22 modules over five phases. **The only signal was a
  screenshot.** `validate-theory` check 11 now holds the mirror table,
  `PLAIN_FIELDS`, beside `HTML_FIELDS`; the general rule is that **a pair of
  tables that partition a space is safer than one table and a default**,
  because a new block type that lands in neither is then visible as a gap.
- **The first fix for that was wrong, and the reason generalises.** A
  `comparison` block has `left`/`right` on the block, where they are column
  headings and escaped, and `left`/`right` on every row, where they are cell
  bodies and are HTML. A rewrite keyed on the field name took out 423 literals
  instead of 46 and deleted legitimate markup from three hundred rows. **The
  same word one level apart can mean the opposite thing** — key a bulk edit on
  the position, not on the name, and count what it changed before believing
  it.
- **Counting `svg` on a page counts the chrome.** The Phase 7 sweep first
  reported 270 diagrams across 60 routes and `bad: 0`, which looked like a
  clean pass and was arithmetic on icons: the corpus holds 35 theory diagrams
  in total. A count with no expected value to compare against is not a check,
  it is a number. The sweep now carries the per-module diagram count computed
  from the corpus in Node and asserts route by route, which is a different
  source of truth from the page — the same rule `validate-search` had to learn
  about its own glossary slugs.
- **A silent console and a broken console reader are the same observation.**
  Eighty-eight routes produced no errors, which is either a clean deck or a
  reader returning nothing. One deliberate `console.error` separates the two
  cases and costs one call. Do it every time the answer is zero.
- **A selector that matches two nodes per item double-counts, again.** The
  glossary check reported 122 terms against 61, because `[id^="term-"]`,
  `.glossary-term` and `.glossary-entry` were ORed and two of them match the
  same entries. Exactly the shape of the Phase 6 `[class*=tier]` result. Both
  times the aggregate was a clean multiple of the truth, which is the tell:
  **when a count is exactly 2× or 3× what it should be, suspect the selector
  before the corpus.**

- **`check-doc-links.js` DOES see a meta-refresh now, and the blind spot this
  entry used to describe was real: four stubs were found on the first run.**
  What it still cannot see is a page that was emptied, rewritten for a later
  version, or replaced by a "this content has moved" sentence with no refresh
  tag — that answers 200 and titles itself plausibly. Phase 9 proxied it by
  comparing every page's `<title>` against the title the deck gives the link;
  113 of 762 disagreed and **five were real**, the rest being links that name
  a section of a page the publisher names by its chapter. The proxy is worth
  re-running per phase that adds links; it is not a reading.
- **A publisher's 404 handler can be a 200.** Oracle answers a missing page
  under `docs.oracle.com/en/java/javase/NN/` with a redirect to the current
  JDK landing page, so five filenames that had been wrong since Phase 3 looked
  like withdrawn documentation rather than typos. **A redirect to a
  suspiciously generic destination is a missing page, not a moved one** —
  check whether the sibling pages still resolve before bumping a version.
- **Some redirects are the stable interface and pinning past them is the
  fragile choice.** `docs.junit.org/current/` 302s to the release of the day;
  `kafka.apache.org/documentation/#design` is kept alive by a JS alias map
  whose destinations carry a version number. The zero-redirect rule is about
  the corpus holding a URL the publisher has *replaced*, and an alias has not
  been replaced. Both are allow-listed in `check-doc-links.js` **with their
  reasons written down**, which is the only form of exemption that stays
  honest. An allow-list that grows is a check being switched off.
- **A 403 is a refusal to talk to your program, not a dead link.** Two pages
  in this corpus answer 403 to any User-Agent that admits to being a script
  and render perfectly in a browser. Open them by hand before recording them
  as broken, and put the date and the rendered title in the allow-list entry.
- SQL predict answers are dialect-dependent. Every `artefact: 'sql-result'`
  entry must name the engine and version it was checked against. Write
  "PostgreSQL 16", never "SQL".
- **`validate-questions.js` check 4 has now been exercised against a real file
  and one branch of it was wrong.** `fs.existsSync` is case-insensitive on
  macOS, so a figure vendored as `probe-figure.png` and cited as
  `Probe-Figure.png` passed here and would have 404ed off Linux. It uses
  `existsCaseExact()` from `schema.js` now, which `check-offline.js` had been
  applying to `index.html` since Phase 2 and this check had never got. **The
  general form: when the same question is asked in two validators, ask whether
  they are asking it the same way** — "is this file on disk" had quietly
  become two different questions depending on which one you asked.
- **"There is no JDK on this machine" was written once and believed for eight
  gates, and it was false.** `java -version` fails on the PATH and
  `/usr/libexec/java_home` reports nothing, which is what the note was based
  on — and neither is the question. Android Studio bundles a complete
  OpenJDK 25 with javac at `Contents/jbr/Contents/Home`, and had done since
  before Phase 3. A whole phase was deferred nine times over a fact nobody
  re-derived. **The general form: a blocker recorded as a property of the
  environment ages exactly as badly as a blocker recorded as a TODO, and
  neither re-checks itself.** Re-derive a blocker before deferring on it for
  the second time, and note what evidence it rests on so the next reader can
  see what to re-run — "`java -version` fails" would have been re-testable in
  one line; "there is no JDK" was not.
- **Prefer `trace` whenever the output is not certain**, and never write an
  output pane for anything timing-dependent, machine-dependent or racy. This
  survives the JDK arriving: `run-snippets` executes each claim twice and
  requires the two runs to agree with each other before comparing either to
  the corpus, which catches hash-order and interleaving dependence — but only
  probabilistically, and a `trace` never needed catching.
- **`getDeclaredFields()` and its family promise no order, and a transcript of
  names is a claim about one compiler on one day.** A predict puzzle listed
  the fields of an inner class in order and was wrong twice over: the
  synthetic field is `this$0` and not `this$1`, and javac does not emit it at
  all unless the inner class actually uses its enclosing instance. Rewritten
  to *count* the fields and the synthetic ones among them, which says the same
  thing about every compiler. **When the JDK is the thing under test, ask
  which part of the answer the specification actually guarantees.**
- **A snippet can teach a true thing with a broken demonstration, and only
  running it tells you.** `private final String name = "literal"` is a
  compile-time constant that javac inlines at every use site, so the snippet
  written to show a `final` field observed as `null` during `super()` printed
  the text instead. `Set.of(a, b)` rejects a duplicate rather than collapsing
  it, so the line meant to prove two equal records are one instance threw.
  Both had passed every validator since the phase that wrote them. **The
  lesson was right in all three cases; the mechanism chosen to show it was
  not.**
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

- **A hue that is merely absent looks fine.** `sidebar.js` gave the orphan
  group `hue: 'slate'`; the topic header emitted `data-hue` only when a track
  existed, so a topic with an explicit `null` track got no attribute at all.
  The two disagreed about one topic for four phases and nothing said so,
  because a header with no `data-hue` inherits the default text colours and
  looks entirely reasonable. It surfaced only when the first real null-track
  topic arrived and the gate sweep **compared every header's hue against its
  track's** rather than checking that each one rendered. The general form:
  **when two places derive the same fact, assert that they agree**, not that
  each produces something.

- **A gate check of my own fired on all 26 topics and was wrong.** The sweep
  asserted one tier element per card via `[class*=tier]`, and `.tier-badge`
  contains a `.tier-dot`, so the count was always double. Twenty-six red
  results, zero defects. Worth recording next to the two checks in Phase 5
  that were wrong in the other direction: **a check that fails everywhere is
  usually the check**, and a check that passes everywhere may be vacuous —
  both need the same treatment, which is to look at one case by hand before
  believing the aggregate.

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
