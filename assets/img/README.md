# `assets/img/` — the figure contract

**This directory is empty on purpose, and Phase 9 checked that it is empty for
the right reason rather than by neglect.**

Nearly every picture in this deck is a **diagram**, not a figure: a
`diagramConfig` object that `js/diagrams.js` renders to SVG at run time. There
are 35 of them in the theory corpus and 19 in the question bank. They are data,
so a validator can read them — `checkDiagram()` in `tools/schema.js` knows what
each renderer actually looks at, and it caught a sequence diagram authored with
`steps` instead of `messages` that had passed everything else. They cost no
bytes on disk, they inherit the theme, and they reflow on a phone.

A **figure** is the other thing: a raster or vector file that somebody else
made, vendored into the repo because the point being made needs *that specific
picture* — a real flame graph, a real GC log visualisation, a screenshot of a
tool's output. Nothing in the corpus has needed one yet.

---

## If you vendor one

`<img>` is **outside the allowed tag subset**. It is not an oversight and it is
not negotiable: `htmlIssues()` in `tools/schema.js` rejects it in every
authored HTML field in both corpora. A figure buried in an HTML blob cannot be
checked — a validator can assert nothing at all about a `src` it has to find by
regex. So a figure arrives as **structured data**, on the question's `images[]`,
and `js/questions.js` builds the element setting `src` and `alt` as properties.

```js
images: [
    {
        src:         'assets/img/g1-pause-histogram.png',
        alt:         'A G1 pause-time histogram with a long tail past 200ms',
        sourceTitle: 'HotSpot Virtual Machine Garbage Collection Tuning Guide',
        sourceUrl:   'https://docs.oracle.com/en/java/javase/21/gctuning/',
        caption:     '<p>The tail is the number that matters, not the mean.</p>'
    }
]
```

`validate-questions.js` check 4 enforces all of it:

| Field | Rule | Why it is an error and not a warning |
|---|---|---|
| `src` | repo-relative, never absolute, never `http` | a remote figure breaks `file://` and the offline promise |
| `src` | on disk, **case-exact** | `Foo.png` finds `foo.png` on macOS and 404s on Linux |
| `alt` | present, over 20 characters | "diagram" is not alt text; a screen reader gets nothing |
| `sourceTitle` | present | attribution is a licence condition, not a courtesy |
| `sourceUrl` | present | same |
| `caption` | allowed-tag HTML if present | it is rendered, so it is checked like any other authored HTML |

Keep the file small enough that the deck still opens from a memory stick, name
it after what it shows rather than where it came from, and put the licence in
the commit message body along with the reason no diagram would have done.

## What Phase 9 could and could not confirm

Check 4 had been broken on purpose against a **synthetic** entry in Phase 1 and
had never seen a real file, which is a weaker claim than it sounds — a
`fs.existsSync` on a path that has never existed passes its test whether or not
the surrounding logic is right.

Phase 9 exercised it against a **real PNG written to this directory**, through
all five branches, and found one thing wrong: the existence check was a bare
`fs.existsSync`, which is case-insensitive on macOS. `assets/img/Foo.png` cited
against a `foo.png` on disk went green. It now uses `existsCaseExact()` from
`tools/schema.js`, the same rule `check-offline.js` has applied to `index.html`
since Phase 2.

The test figure was removed afterwards. **The directory is empty and the check
is now known to work.**
