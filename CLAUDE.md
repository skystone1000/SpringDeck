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

Run the three fast validators before **any** commit touching `data/` or the
navigation:

```bash
node tools/validate-theory.js && node tools/validate-questions.js && node tools/validate-nav.js
```

Two more are slower and run **per phase**, not per commit:

```bash
node tools/check-doc-links.js --all
node tools/run-snippets.js --selftest
```

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
| **Phases complete** | 0 — Skeleton · 1 — The tool chain |
| **Next phase** | 2 — The question bank, core half (~355 questions across 10 topics) |
| **Last commit date used** | 2026-08-22, 18 commits |
| **Next active day** | 2026-08-23 |

### Phase gates recorded

**Phase 0 — Skeleton.** PASSED. The page renders in both themes; the code
gutter and the code source agree on line count exactly. `grep -nE
'#[0-9a-fA-F]{3,8}\b|rgba?\(' css/*.css | grep -v themes.css` returns nothing
— it caught eighteen literals in `print.css` on the day it was written, which
were moved into the token layer as `--print-*` primitives.

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
