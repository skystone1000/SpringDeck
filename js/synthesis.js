/* ==========================================================================
   synthesis.js — the drill mode

       #synthesis                     every set
       #synthesis/<set>               one set's drills
       #synthesis/<set>/<drill>       the same, scrolled to one

   A drill is a `drill` block in a module of the `synthesis` track, and this
   file renders those blocks with the same function theory.js uses. That is
   deliberate rather than convenient: a drill seen here and a drill seen in a
   chapter must be the same object drawn the same way, or the reader has to
   learn two presentations of one thing.

   THE UNIT IS "REHEARSED", NOT "READ". A drill is a ninety-minute build you
   either sat down for or did not, so the checkbox says so — and the count it
   feeds is never added to any other mode's count, because a drill and a
   chapter are not the same kind of thing and their sum is a number true of
   nothing.
   ========================================================================== */

(function () {
    'use strict';

    var MODE = 'synthesis';

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

    function drillsIn(module) {
        var found = [];
        module.chapters.forEach(function (chapter) {
            chapter.blocks.forEach(function (block) {
                if (block.type === 'drill') found.push({ block: block, chapter: chapter });
            });
        });
        return found;
    }

    function rehearsed(module) {
        return drillsIn(module).filter(function (entry) {
            return progressStore.isDone(MODE, entry.block.id);
        }).length;
    }

    /* ---- The index ------------------------------------------------------- */
    function renderIndex() {
        var all = sets();
        var totalDrills = all.reduce(function (n, m) { return n + drillsIn(m).length; }, 0);

        container().innerHTML =
            '<header class="topic-header" data-hue="fuchsia">' +
                '<p class="topic-eyebrow">Interview Synthesis</p>' +
                '<h1 class="topic-title">Drills</h1>' +
                '<p class="topic-meta">' + all.length + ' sets &middot; ' + totalDrills +
                    ' drills, by interview round</p>' +
                '<p class="topic-intro">Each one has a clock on it. The value is in ' +
                    'what you find out while failing at it inside the time, which is why ' +
                    'the solution sketch is folded away and should stay folded until you ' +
                    'have stopped.</p>' +
            '</header>' +
            '<div class="module-grid">' +
                all.map(function (module) {
                    var drills = drillsIn(module);
                    return '<a class="module-card" data-hue="fuchsia" href="' +
                           router.href(MODE, [module.id]) + '">' +
                        '<span class="module-card-order">' + esc(module.title) + '</span>' +
                        '<h2 class="module-card-title">' + esc(module.tagline) + '</h2>' +
                        '<p class="module-card-meta">' + drills.length + ' drills &middot; ' +
                            rehearsed(module) + ' rehearsed</p>' +
                    '</a>';
                }).join('') +
            '</div>';
    }

    /* ---- One set --------------------------------------------------------- */
    function renderSet(module) {
        var drills = drillsIn(module);

        container().innerHTML =
            '<header class="topic-header" data-hue="fuchsia">' +
                '<p class="topic-eyebrow">' +
                    '<a href="' + router.href(MODE, []) + '">Interview Synthesis</a></p>' +
                '<h1 class="topic-title">' + esc(module.title) + '</h1>' +
                '<p class="topic-meta">' + drills.length + ' drills &middot; about ' +
                    esc(module.estimatedMinutes) + ' minutes each</p>' +
                '<p class="topic-intro">' + esc(module.tagline) + '</p>' +
            '</header>' +
            drills.map(function (entry) {
                var done = progressStore.isDone(MODE, entry.block.id);
                return '<article class="drill-entry" data-drill-entry="' +
                       esc(entry.block.id) + '">' +
                    '<div class="drill-entry-head">' +
                        '<h2 class="drill-entry-title">' + esc(entry.chapter.title) + '</h2>' +
                        '<label class="drill-done">' +
                            '<input type="checkbox" data-drill-done="' + esc(entry.block.id) +
                                '"' + (done ? ' checked' : '') + '>' +
                            '<span>Rehearsed</span>' +
                        '</label>' +
                    '</div>' +
                    '<p class="drill-entry-summary">' + esc(entry.chapter.summary) + '</p>' +
                    window.renderDrillBlock(entry.block) +
                '</article>';
            }).join('');

        container().querySelectorAll('[data-drill-done]').forEach(function (input) {
            input.addEventListener('change', function () {
                progressStore.toggleDone(MODE, input.getAttribute('data-drill-done'));
                updateHeader(module);
            });
        });
    }

    /* ---- Header ---------------------------------------------------------
       ONE mode, ONE noun, ONE number: drills rehearsed in this set over the
       drills in it. The rail meter is rail.js's and shows the mode total.
       Nothing here adds this to anything.
       -------------------------------------------------------------------- */
    function updateHeader(module) {
        var title = document.getElementById('modeTitle');
        if (title) title.textContent = modeById[MODE].title;

        var done  = module ? rehearsed(module) : 0;
        var total = module ? drillsIn(module).length : 0;

        var fill = document.getElementById('modeProgressFill');
        if (fill) fill.style.width = (total ? Math.round((done / total) * 100) : 0) + '%';

        var text = document.getElementById('modeProgressText');
        if (text) text.textContent = total ? done + ' / ' + total : '';

        var meta = document.getElementById('modeMeta');
        if (meta) meta.textContent = module ? '' : sets().length + ' sets';
    }

    /* ---- Route ----------------------------------------------------------- */
    function handle(route) {
        var all = sets();

        if (!all.length) {
            container().innerHTML =
                '<div class="empty-state"><h2>No drills yet</h2>' +
                '<p>The drill sets arrive with the synthesis corpus.</p></div>';
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
                '<p>That link points at a drill set this deck does not have.</p></div>';
            updateHeader(null);
            return;
        }

        renderSet(module);
        updateHeader(module);

        var drillId = route.segments[1];
        if (drillId) {
            var target = container().querySelector('[data-drill-entry="' + drillId + '"]');
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
    });
})();
