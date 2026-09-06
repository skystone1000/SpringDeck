/* ==========================================================================
   search.js — the panel, and nothing else

   The matching, the ranking and the excerpting all live in search-index.js,
   which touches no DOM and is checked in Node by tools/validate-search.js.
   What is left here is the half a validator genuinely cannot see: an input,
   a list, five keys and one call to router.go().

   THREE THINGS THIS FILE IS CAREFUL ABOUT

   1. IT ESCAPES, THE INDEX DOES NOT. searchExcerpt returns SEGMENTS — plain
      strings tagged hit or not — rather than markup with <mark> already in
      it. Every one of them goes through escapeHtml here before the <mark>
      wrapper is added, so there is no path by which authored corpus text
      reaches innerHTML unescaped. An index that returned a convenient
      pre-marked string would make that path exist and look harmless.

   2. THE INDEX IS BUILT ON THE FIRST KEYSTROKE, NOT AT PARSE TIME. It is a
      traversal of 662 entries over both corpora, and a reader who never
      searches should not pay for it before the first paint.

   3. AN EMPTY RESULT SAYS SO. A panel that opens blank is indistinguishable
      from a panel that is broken, and this project has already shipped two
      features that failed by rendering nothing at all.
   ========================================================================== */

(function () {
    'use strict';

    var DEBOUNCE = 90;

    var index    = null;      // built lazily, then kept
    var results  = null;      // the last searchCorpus() result
    var flat     = [];        // the same hits in panel order, for the arrows
    var active   = -1;
    var timer    = null;

    function esc(value) {
        return typeof window.escapeHtml === 'function'
            ? window.escapeHtml(value)
            : String(value == null ? '' : value);
    }

    function input()  { return document.getElementById('searchInput'); }
    function panel()  { return document.getElementById('searchResults'); }

    /* ---- Rendering ------------------------------------------------------ */

    function markup(segments) {
        return segments.map(function (segment) {
            var text = esc(segment.text);
            return segment.hit ? '<mark>' + text + '</mark>' : text;
        }).join('');
    }

    /* The title is marked the same way the excerpt is, by running the same
       segmenter over it — so a hit in the title looks like a hit in the body
       rather than like two different features. */
    function markTitle(entry, tokens) {
        return markup(window.searchExcerpt(
            { body: entry.title, bodyLower: entry.titleLower }, tokens, 200
        ));
    }

    function renderResults(query) {
        var box = panel();
        if (!box) return;

        flat = [];
        active = -1;

        if (!query.trim()) {
            close();
            return;
        }

        results = window.searchCorpus(index, query);

        /* No usable tokens at all — a single letter, or punctuation. The
           reader is still typing, so this closes rather than reporting that
           nothing matched. */
        if (!results.tokens.length) {
            close();
            return;
        }

        if (!results.shown) {
            box.innerHTML =
                '<div class="search-empty">' +
                    'Nothing matches <strong>' + esc(query.trim()) + '</strong>. ' +
                    'Every word has to appear somewhere in the same question, ' +
                    'chapter, drill or term.' +
                '</div>';
            open();
            return;
        }

        var html = '';
        results.groups.forEach(function (group) {
            var mode = modeById[group.mode];
            html += '<div class="search-group-label">' + esc(mode.title) + '</div>';

            group.hits.forEach(function (hit) {
                var i = flat.length;
                flat.push({ mode: mode, entry: hit.entry });

                html +=
                    '<button class="search-result" type="button" role="option" ' +
                        'id="search-result-' + i + '" data-result="' + i + '" ' +
                        'aria-selected="false">' +
                        '<div class="search-result-title">' +
                            markTitle(hit.entry, results.tokens) + '</div>' +
                        '<div class="search-result-excerpt">' +
                            markup(window.searchExcerpt(hit.entry, results.tokens)) + '</div>' +
                        '<div class="search-result-context">' + esc(hit.entry.context) + '</div>' +
                    '</button>';
            });
        });

        /* The count is the honest one. A panel showing twelve of forty-nine
           without saying so teaches the reader that the deck holds twelve. */
        if (results.total > results.shown) {
            html += '<div class="search-footer">' +
                results.shown + ' of ' + results.total +
                ' matches — add a word to narrow it</div>';
        }

        box.innerHTML = html;
        box.querySelectorAll('[data-result]').forEach(function (button) {
            button.addEventListener('click', function () {
                openResult(parseInt(button.getAttribute('data-result'), 10));
            });
        });

        open();
    }

    /* ---- Opening and closing -------------------------------------------- */

    function open() {
        var box = panel();
        if (box) box.classList.add('is-open');
    }

    function close() {
        var box = panel();
        if (!box) return;
        box.classList.remove('is-open');
        box.innerHTML = '';
        flat = [];
        active = -1;
        var field = input();
        if (field) field.removeAttribute('aria-activedescendant');
    }

    function highlight(next) {
        var box = panel();
        if (!box || !flat.length) return;

        var buttons = box.querySelectorAll('[data-result]');
        if (active >= 0 && buttons[active]) {
            buttons[active].classList.remove('is-active');
            buttons[active].setAttribute('aria-selected', 'false');
        }

        // Wraps in both directions: Up from the first result is the last one,
        // which is what every other list in a browser does.
        active = (next + flat.length) % flat.length;

        var button = buttons[active];
        if (button) {
            button.classList.add('is-active');
            button.setAttribute('aria-selected', 'true');
            button.scrollIntoView({ block: 'nearest' });
            var field = input();
            if (field) field.setAttribute('aria-activedescendant', button.id);
        }
    }

    /* ---- Going there ----------------------------------------------------

       router.go() and not location.hash: this is a click, so it earns a
       history entry, and Back has to return the reader to where they were
       searching from. The route lands on an EXPANDED card in Questions and a
       scrolled-to chapter in Theory because the mode handlers already do that
       for a deep link — this file does not reimplement either, which is why
       a search result and a shared URL behave identically.
       -------------------------------------------------------------------- */
    function openResult(i) {
        var hit = flat[i];
        if (!hit) return;

        close();

        // Blurred deliberately. On a phone this dismisses the keyboard before
        // the page scrolls, and it puts `/` back in service on the desktop.
        var field = input();
        if (field) field.blur();
        document.body.classList.remove('drawer-open');

        router.go(hit.mode.route, hit.entry.segments);
    }

    /* ---- Binding -------------------------------------------------------- */

    function bind() {
        var field = input();
        var box   = panel();
        if (!field || !box) return;

        field.addEventListener('input', function () {
            var query = field.value;
            if (timer) clearTimeout(timer);

            /* Built here rather than in initApp: a reader who never searches
               never pays for the traversal. Built once — the corpus is a set
               of consts and cannot change under us. */
            timer = setTimeout(function () {
                if (!index) index = window.buildSearchIndex();
                renderResults(query);
            }, DEBOUNCE);
        });

        field.addEventListener('keydown', function (event) {
            if (event.key === 'ArrowDown') {
                if (!flat.length) return;
                event.preventDefault();
                highlight(active + 1);
            } else if (event.key === 'ArrowUp') {
                if (!flat.length) return;
                event.preventDefault();
                highlight(active - 1);
            } else if (event.key === 'Enter') {
                if (!flat.length) return;
                event.preventDefault();
                // No selection yet means the first result, which is what the
                // ranking is for. Typing and pressing Enter should work.
                openResult(active === -1 ? 0 : active);
            } else if (event.key === 'Escape') {
                /* First Escape closes the panel, a second clears the box.
                   Closing and clearing together loses a query the reader was
                   about to refine. */
                if (box.classList.contains('is-open')) {
                    event.stopPropagation();
                    close();
                } else if (field.value) {
                    event.stopPropagation();
                    field.value = '';
                }
            }
        });

        field.addEventListener('focus', function () {
            if (field.value.trim() && flat.length) open();
        });

        /* Blur cannot close the panel directly: the click that dismisses it
           may BE the click on a result, and blur fires first. So the panel
           closes on a click landing outside the whole search element. */
        document.addEventListener('click', function (event) {
            var root = document.querySelector('.search');
            if (root && !root.contains(event.target)) close();
        });

        /* Any navigation closes it — including one the reader started from
           the rail or the sidebar while the panel was still open. */
        router.onAny(close);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bind);
    } else {
        bind();
    }
})();
