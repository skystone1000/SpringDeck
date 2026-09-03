/* ==========================================================================
   predict.js — predict the output

       #predict                      every set
       #predict/<set>                one set's puzzles
       #predict/<set>/<puzzle>       the same, scrolled to one

   The blocks are rendered by theory.js's renderer AND BOUND BY ITS BINDER,
   which matters more than the reuse suggests. A verdict recorded here and a
   verdict recorded on the same puzzle inside a chapter must be the same write
   to the same key; two binders would eventually disagree about what the
   reader has solved, and the disagreement would be invisible.

   THE VERDICT IS A MAP, NOT A SET. Right, wrong, unanswered. A set of "seen"
   ids cannot tell "not attempted" from "attempted and got it wrong", and
   those are opposite signals about what to revise tonight.
   ========================================================================== */

(function () {
    'use strict';

    var MODE = 'predict';

    function esc(value) {
        return typeof window.escapeHtml === 'function'
            ? window.escapeHtml(value)
            : String(value == null ? '' : value);
    }

    function container() {
        return document.getElementById('topicContainer');
    }

    function sets() {
        var mode = modeById[MODE];
        return mode && mode.trackId ? modulesInTrack(mode.trackId) : [];
    }

    function puzzlesIn(module) {
        var found = [];
        module.chapters.forEach(function (chapter) {
            chapter.blocks.forEach(function (block) {
                if (block.type === 'predict') found.push({ block: block, chapter: chapter });
            });
        });
        return found;
    }

    /* Three counts, reported as three. Collapsing wrong and unanswered into
       "not right" would throw away the only number that says what to revise. */
    function tally(module) {
        var t = { right: 0, wrong: 0, unanswered: 0, total: 0 };
        puzzlesIn(module).forEach(function (entry) {
            t.total++;
            t[progressStore.verdictFor(entry.block.id)]++;
        });
        return t;
    }

    /* ---- The index ------------------------------------------------------- */
    function renderIndex() {
        var all = sets();
        var totalPuzzles = all.reduce(function (n, m) { return n + puzzlesIn(m).length; }, 0);

        container().innerHTML =
            '<header class="topic-header" data-hue="teal">' +
                '<p class="topic-eyebrow">Predict the Output</p>' +
                '<h1 class="topic-title">Puzzles</h1>' +
                '<p class="topic-meta">' + all.length + ' sets &middot; ' + totalPuzzles +
                    ' puzzles</p>' +
                '<p class="topic-intro">Commit to an option before you reveal. A verdict ' +
                    'you earned is worth something; a verdict you gave yourself after ' +
                    'reading the answer is worth less than nothing, because it tells you ' +
                    'to stop revising something you do not know.</p>' +
            '</header>' +
            '<div class="module-grid">' +
                all.map(function (module) {
                    var t = tally(module);
                    return '<a class="module-card" data-hue="teal" href="' +
                           router.href(MODE, [module.id]) + '">' +
                        '<span class="module-card-order">' + esc(module.title) + '</span>' +
                        '<h2 class="module-card-title">' + esc(module.tagline) + '</h2>' +
                        '<p class="module-card-meta">' + t.total + ' puzzles &middot; ' +
                            t.right + ' right &middot; ' + t.wrong + ' wrong &middot; ' +
                            t.unanswered + ' not tried</p>' +
                    '</a>';
                }).join('') +
            '</div>';
    }

    /* ---- One set --------------------------------------------------------- */
    function renderSet(module) {
        var puzzles = puzzlesIn(module);

        container().innerHTML =
            '<header class="topic-header" data-hue="teal">' +
                '<p class="topic-eyebrow">' +
                    '<a href="' + router.href(MODE, []) + '">Predict the Output</a></p>' +
                '<h1 class="topic-title">' + esc(module.title) + '</h1>' +
                '<p class="topic-meta">' + puzzles.length + ' puzzles</p>' +
                '<p class="topic-intro">' + esc(module.tagline) + '</p>' +
            '</header>' +
            puzzles.map(function (entry) {
                return '<article class="predict-entry" data-predict-entry="' +
                       esc(entry.block.id) + '">' +
                    window.renderPredictBlock(entry.block) +
                '</article>';
            }).join('');

        /* The shared binder, so a verdict earned here is the same write a
           verdict earned inside a chapter makes. */
        container().querySelectorAll('.block-predict').forEach(function (card) {
            window.bindPredictCard(card);
        });
    }

    /* ---- Header ---------------------------------------------------------
       The bar is RIGHT over total, and it is the only mode where a wrong
       answer is not simply an absent one — so the text says all three.
       -------------------------------------------------------------------- */
    function updateHeader(module) {
        var title = document.getElementById('modeTitle');
        if (title) title.textContent = modeById[MODE].title;

        var t = module ? tally(module) : { right: 0, wrong: 0, unanswered: 0, total: 0 };

        var fill = document.getElementById('modeProgressFill');
        if (fill) fill.style.width = (t.total ? Math.round((t.right / t.total) * 100) : 0) + '%';

        var text = document.getElementById('modeProgressText');
        if (text) text.textContent = t.total ? t.right + ' / ' + t.total : '';

        var meta = document.getElementById('modeMeta');
        if (meta) {
            meta.textContent = module
                ? (t.wrong ? t.wrong + ' wrong' : '')
                : sets().length + ' sets';
        }
    }

    /* ---- Route ----------------------------------------------------------- */
    function handle(route) {
        var all = sets();

        if (!all.length) {
            container().innerHTML =
                '<div class="empty-state"><h2>No puzzles yet</h2>' +
                '<p>The predict sets arrive with the output corpus.</p></div>';
            updateHeader(null);
            return;
        }

        var setId = route.segments[0];
        if (!setId) {
            renderIndex();
            updateHeader(null);
            window.scrollTo({ top: 0 });
            return;
        }

        var module = theoryByModuleId[setId];
        if (!module || module.trackId !== modeById[MODE].trackId) {
            container().innerHTML =
                '<div class="empty-state"><h2>No such set</h2>' +
                '<p>That link points at a predict set this deck does not have.</p></div>';
            updateHeader(null);
            return;
        }

        renderSet(module);
        updateHeader(module);

        var puzzleId = route.segments[1];
        if (puzzleId) {
            var target = container().querySelector('[data-predict-entry="' + puzzleId + '"]');
            if (target) target.scrollIntoView({ block: 'start' });
            else window.scrollTo({ top: 0 });
        } else {
            window.scrollTo({ top: 0 });
        }
    }

    router.register(MODE, handle);

    progressStore.subscribe(function (mode) {
        if (mode !== MODE) return;
        sidebar.refreshCounts(MODE);
        if (document.documentElement.dataset.mode !== MODE) return;
        var setId = router.route && router.route.segments[0];
        updateHeader(setId ? theoryByModuleId[setId] : null);
    });
})();
