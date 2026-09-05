/* ==========================================================================
   glossary.js — harvested, never authored

       #glossary            every term, A to Z
       #glossary/<letter>   one letter

   THE GLOSSARY IS A VIEW, NOT A CORPUS. Every entry is a `definition` block
   that already exists inside the chapter that teaches it, so a term arrives
   here with its chapter attached and the backlink is a property of the data
   rather than a link somebody has to remember to write. A separately authored
   glossary drifts from the chapters within one refactor, and nothing notices.

   TWO CHIPS, BOTH DERIVED. Blueprint 18.5 permits a second chip only if it
   can be computed:

     ASKED       the term appears in a question in the bank
     ANNOTATION  the term begins with '@'

   Neither needs a new field. A chip that needed one would be a different
   feature, and would belong in the schema and the validator rather than here.
   ========================================================================== */

/* Exported as a global rather than kept inside the IIFE because sidebar.js
   builds its A–Z jump grid from the same harvest — one traversal of the
   corpus, one definition of what a term is. */
function collectGlossaryEntries() {
    var entries = [];

    theoryModules.forEach(function (module) {
        module.chapters.forEach(function (chapter) {
            chapter.blocks.forEach(function (block) {
                if (block.type !== 'definition' || !block.term) return;
                entries.push({
                    term:      block.term,
                    html:      block.html,
                    important: !!block.important,
                    module:    module,
                    chapter:   chapter
                });
            });
        });
    });

    /* Case-insensitive, and NOT localeCompare with a locale: sorting must be
       the same on every machine, or two readers looking at the same letter
       see different lists. */
    return entries.sort(function (a, b) {
        var x = a.term.toLowerCase(), y = b.term.toLowerCase();
        return x < y ? -1 : x > y ? 1 : 0;
    });
}

(function () {
    'use strict';

    var MODE = 'glossary';

    function esc(value) {
        return typeof window.escapeHtml === 'function'
            ? window.escapeHtml(value)
            : String(value == null ? '' : value);
    }

    function container() {
        return document.getElementById('topicContainer');
    }

    function letterOf(term) {
        return String(term).charAt(0).toUpperCase();
    }

    /* ---- The ASKED chip -------------------------------------------------
       Derived by looking for the term in the question bank's own text. The
       match is deliberately conservative — whole word, case-insensitive —
       because a chip that fires on a substring would mark "Pinning" as asked
       on the strength of the word "mapping". Computed once per render rather
       than once per term: the bank is 244 questions and this is 47 terms.
       -------------------------------------------------------------------- */
    function buildAskedIndex(entries) {
        var haystack = '';
        topics.forEach(function (topic) {
            topic.questions.forEach(function (q) {
                haystack += ' ' + q.question + ' ' + (q.answer || '');
            });
        });
        haystack = haystack.toLowerCase();

        var asked = {};
        entries.forEach(function (entry) {
            var needle = entry.term.toLowerCase();
            var at = haystack.indexOf(needle);
            while (at !== -1) {
                var before = at === 0 ? ' ' : haystack.charAt(at - 1);
                var after  = haystack.charAt(at + needle.length) || ' ';
                if (!/[a-z0-9]/.test(before) && !/[a-z0-9]/.test(after)) {
                    asked[entry.term] = true;
                    break;
                }
                at = haystack.indexOf(needle, at + 1);
            }
        });
        return asked;
    }

    function renderEntry(entry, asked) {
        var seen = progressStore.isDone(MODE, entry.term);
        var chips =
            (entry.term.charAt(0) === '@'
                ? '<span class="glossary-chip" data-kind="annotation">ANNOTATION</span>' : '') +
            (asked[entry.term]
                ? '<span class="glossary-chip" data-kind="asked">ASKED</span>' : '') +
            (entry.important
                ? '<span class="glossary-chip" data-kind="key">KEY TERM</span>' : '');

        /* The slug comes from search-index.js rather than being spelled out
           here, because a search result addresses this element by it. Two
           copies of one expression is how a result starts landing on the
           right page and scrolling to nothing. */
        return '<article class="glossary-entry" id="term-' +
                   esc(glossaryTermSlug(entry.term)) + '">' +
            '<div class="glossary-entry-head">' +
                '<h3 class="glossary-term">' + esc(entry.term) + '</h3>' +
                '<div class="glossary-chips">' + chips + '</div>' +
                '<label class="glossary-seen">' +
                    '<input type="checkbox" data-term-seen="' + esc(entry.term) + '"' +
                        (seen ? ' checked' : '') + '>' +
                    '<span>Seen</span>' +
                '</label>' +
            '</div>' +
            '<div class="glossary-definition">' + entry.html + '</div>' +
            '<p class="glossary-source">' +
                '<a href="' + router.href('theory', [entry.module.id, entry.chapter.id]) + '">' +
                    esc(entry.module.title) + ' &middot; ' + esc(entry.chapter.title) +
                '</a>' +
            '</p>' +
        '</article>';
    }

    function render(letter) {
        var all   = collectGlossaryEntries();
        var asked = buildAskedIndex(all);

        var shown = letter
            ? all.filter(function (e) { return letterOf(e.term) === letter.toUpperCase(); })
            : all;

        if (!all.length) {
            container().innerHTML =
                '<div class="empty-state"><h2>Nothing to define yet</h2>' +
                '<p>The glossary is harvested from definition blocks in the ' +
                'chapters, so it fills up as they are written.</p></div>';
            return;
        }

        var groups = {};
        var order  = [];
        shown.forEach(function (entry) {
            var initial = letterOf(entry.term);
            if (!groups[initial]) { groups[initial] = []; order.push(initial); }
            groups[initial].push(entry);
        });

        container().innerHTML =
            '<header class="topic-header" data-hue="slate">' +
                '<p class="topic-eyebrow">' +
                    (letter
                        ? '<a href="' + router.href(MODE, []) + '">Glossary</a>'
                        : 'Glossary') + '</p>' +
                '<h1 class="topic-title">' +
                    (letter ? esc(letter.toUpperCase()) : 'Every term') + '</h1>' +
                '<p class="topic-meta">' + shown.length + ' of ' + all.length +
                    ' terms &middot; harvested from the chapters that teach them</p>' +
            '</header>' +
            (shown.length
                ? order.map(function (initial) {
                    return '<section class="glossary-group">' +
                        '<h2 class="glossary-group-letter">' + esc(initial) + '</h2>' +
                        groups[initial].map(function (entry) {
                            return renderEntry(entry, asked);
                        }).join('') +
                    '</section>';
                }).join('')
                : '<div class="empty-state"><h2>No terms under ' +
                  esc(String(letter).toUpperCase()) + '</h2>' +
                  '<p>Pick another letter, or read the whole list.</p></div>');

        container().querySelectorAll('[data-term-seen]').forEach(function (input) {
            input.addEventListener('change', function () {
                progressStore.toggleDone(MODE, input.getAttribute('data-term-seen'));
            });
        });

        updateHeader(shown.length, all.length);
    }

    /* Seen over total. The noun is "terms", and it is not comparable with any
       other mode's count — a term encountered is not a chapter read. */
    function updateHeader(shown, total) {
        var title = document.getElementById('modeTitle');
        if (title) title.textContent = modeById[MODE].title;

        var seen = progressStore.countFor(MODE);

        var fill = document.getElementById('modeProgressFill');
        if (fill) fill.style.width = (total ? Math.round((seen / total) * 100) : 0) + '%';

        var text = document.getElementById('modeProgressText');
        if (text) text.textContent = total ? seen + ' / ' + total : '';

        var meta = document.getElementById('modeMeta');
        if (meta) meta.textContent = shown === total ? '' : shown + ' shown';
    }

    function handle(route) {
        var letter = route.segments[0] || null;

        /* A segment that is not a single letter is a typo or a stale link,
           and showing the whole list is a better answer than an error page
           for something this cheap to recover from. It is also how a term
           beginning with '@' is addressed: '@Transactional' files under no
           letter, so a link to it says 'all' and lands on the full list. */
        if (letter && !/^[a-z]$/i.test(letter)) letter = null;

        render(letter);

        /* A SECOND SEGMENT IS A TERM, the same way it is a chapter in Theory
           and a card in Questions. Search results address one term, and a
           mode whose deep link stopped at the letter would drop the reader
           at the top of a page of forty and leave them to scroll. */
        var slug = route.segments[1];
        if (slug) {
            var target = document.getElementById('term-' + slug);
            if (target) {
                target.scrollIntoView({ block: 'start', behavior: 'smooth' });
                return;
            }
        }

        window.scrollTo({ top: 0 });
    }

    router.register(MODE, handle);

    progressStore.subscribe(function (mode) {
        if (mode !== MODE) return;
        if (document.documentElement.dataset.mode !== MODE) return;
        var all = collectGlossaryEntries();
        var letter = router.route && router.route.segments[0];
        var shown = letter && /^[a-z]$/i.test(letter)
            ? all.filter(function (e) { return letterOf(e.term) === letter.toUpperCase(); }).length
            : all.length;
        updateHeader(shown, all.length);
    });
})();
