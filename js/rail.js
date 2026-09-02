/* ==========================================================================
   rail.js — the mode switcher, built entirely from data/modes.js

   This file contains no list of modes, no icon, no digit and no noun. It
   reads the registry and renders whatever is there, which is the whole point
   of the registry existing: adding a sixth mode is one entry in modes.js and
   one script tag, not an edit here.

   IT OWNS THE RAIL METER, and that is a deliberate consolidation. Before this
   file, app.js and theory.js each carried their own copy of "read the count,
   write it into #railMeterValue" — two copies of one behaviour, each of which
   ran only while its own mode was on screen. A third and fourth copy were
   about to be written for Synthesis and Predict. Now the meter is subscribed
   to progressStore once and follows the route once.

   THE METER SHOWS ONE MODE'S COUNT IN ONE MODE'S NOUN. It never shows a
   total. The five modes count five incompatible units — questions known,
   chapters read, drills rehearsed, snippets solved, terms seen — and an
   average over them is a sixth number that is true of nothing. There is no
   function here that adds them, and there must never be one.
   ========================================================================== */

const rail = (function () {
    'use strict';

    function esc(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    /* ---- Building it ------------------------------------------------------
       The divider is emitted where `group` changes, rather than after a fixed
       index. That way the markup follows the data: if the registry ever put
       three study modes above the line, the line would still land in the
       right place. validate-nav.js keeps the two groups contiguous so that
       exactly one divider can be emitted.
       --------------------------------------------------------------------- */
    function build() {
        var container = document.getElementById('railItems');
        if (!container) return;

        var previousGroup = null;

        container.innerHTML = railModes().map(function (mode) {
            var divider = (previousGroup !== null && mode.group !== previousGroup)
                ? '<div class="rail-divider" role="presentation"></div>'
                : '';
            previousGroup = mode.group;

            return divider +
                '<button class="rail-item" type="button" role="tab"' +
                    ' id="rail-' + esc(mode.id) + '"' +
                    ' data-mode="' + esc(mode.id) + '"' +
                    ' aria-selected="false"' +
                    ' title="' + esc(mode.title) + '  (' + esc(mode.key) + ')"' +
                    ' aria-label="' + esc(mode.title) + '">' +
                    esc(mode.icon) +
                    '<span class="rail-key" aria-hidden="true">' + esc(mode.key) + '</span>' +
                '</button>';
        }).join('');

        container.addEventListener('click', function (event) {
            var button = event.target.closest('.rail-item');
            if (!button) return;
            var mode = modeById[button.dataset.mode];
            if (mode) goToMode(mode);
        });
    }

    /* Going to a mode means going to where the reader LEFT that mode, not to
       its index. The router already records the last route per mode for the
       inline boot script; this reads the same store. Falling back to the bare
       mode route is correct for a mode never visited. */
    function goToMode(mode) {
        var target = '#' + mode.route;
        try {
            var last = JSON.parse(localStorage.getItem('springdeck:mode:last') || '{}');
            if (last[mode.id]) target = last[mode.id];
        } catch (e) {
            /* No stored history is not an error; the mode index is a fine
               place to arrive. */
        }
        if (location.hash === target) router.go(mode.route, []);
        else location.hash = target;
    }

    /* ---- Selection and accent -------------------------------------------
       --mode-accent is set from the mode's accentVar, which holds a TOKEN
       NAME rather than a colour — themes.css is the only file with colour in
       it, and the rail is the one place accent appears outside body content.
       It is set on the rail element so the selected item and the meter value
       both inherit it from one assignment.
       --------------------------------------------------------------------- */
    function select(modeId) {
        var mode = modeById[modeId];
        var railEl = document.querySelector('.rail');

        if (railEl && mode) {
            railEl.style.setProperty('--mode-accent', 'var(' + mode.accentVar + ')');
        }

        var items = document.querySelectorAll('.rail-item');
        for (var i = 0; i < items.length; i++) {
            items[i].setAttribute('aria-selected', String(items[i].dataset.mode === modeId));
        }
    }

    /* ---- The meter ------------------------------------------------------- */
    function updateMeter(modeId) {
        var mode = modeById[modeId];
        if (!mode) return;

        var value = document.getElementById('railMeterValue');
        var noun  = document.getElementById('railMeterNoun');
        var count = progressStore.countFor(mode.id);

        if (value) value.textContent = count;
        if (noun)  noun.textContent  = mode.progressNoun;

        var meter = document.getElementById('railMeter');
        if (meter) {
            meter.title = count + ' ' + progressStore.nounFor(mode.id, count) +
                          ' in ' + mode.title;
        }
    }

    /* ---- Keyboard -------------------------------------------------------
       Digits 1–5 switch modes, and the guard is the interesting half: typing
       "3" into the search box must type a 3. A shortcut that fires while the
       reader is typing is not a shortcut, it is a bug that only shows up for
       people who use the feature.
       --------------------------------------------------------------------- */
    function isTyping(target) {
        if (!target) return false;
        if (target.isContentEditable) return true;
        var tag = target.tagName;
        return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    }

    function onKeydown(event) {
        if (event.metaKey || event.ctrlKey || event.altKey) return;
        if (isTyping(event.target)) return;

        var mode = modeForKey(event.key);
        if (!mode) return;

        event.preventDefault();
        goToMode(mode);
    }

    /* ---- Wiring ---------------------------------------------------------
       start() is called from initApp() rather than at parse time, because the
       rail reads localStorage through goToMode and subscribes to a store that
       is a forward reference from here. Everything in this file runs after
       every script has been parsed.
       --------------------------------------------------------------------- */
    function start() {
        build();

        var brand = document.querySelector('.rail-brand');
        if (brand) {
            brand.addEventListener('click', function (event) {
                event.preventDefault();
                goToMode(modeById[router.DEFAULT_MODE]);
            });
        }

        document.addEventListener('keydown', onKeydown);

        /* One subscription for all five modes. It repaints only when the
           store that changed is the mode on screen, so answering a question
           does not repaint the Theory meter behind it. */
        progressStore.subscribe(function (changedMode) {
            var current = document.documentElement.dataset.mode;
            if (changedMode === current) updateMeter(current);
        });
    }

    /* Called by the router's dispatch, through app.js, on every route change
       — including the first. */
    function onRoute(modeId) {
        select(modeId);
        updateMeter(modeId);
    }

    return {
        start:       start,
        onRoute:     onRoute,
        goToMode:    goToMode,
        updateMeter: updateMeter
    };
})();
