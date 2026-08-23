/* ==========================================================================
   navigation.js — the hash is the address bar, and it is a contract

   Every route in this deck is a fragment, because a fragment is the only kind
   of URL a static page can own without a server rewriting anything. That
   makes file:// and a web host behave identically, which is the whole reason
   the deck has no build step.

   THE ROUTE SHAPE

       #questions/jpa-hibernate                 a topic
       #questions/jpa-hibernate/n-plus-one      a topic, one card expanded
       #theory/persistence-context              (Phase 3)
       #synthesis  #predict  #glossary          (Phase 4)

   THE THREE RULES THIS FILE ENFORCES

   1. A LEGACY BARE SEGMENT NORMALISES, IT DOES NOT 404. Links to '#collections'
      exist in notes, in chat history and in whatever someone bookmarked before
      the rail landed. A bare segment that names a real topic is rewritten to
      '#questions/collections' with replaceState — no entry added to history,
      no flash of an error page. A URL that has been shared once has been
      shared forever, and a deck that breaks its own old links teaches its
      readers not to share them.

   2. SCROLL UPDATES USE replaceState. ONLY CLICKS USE location.hash. This is
      not a stylistic preference. Assigning location.hash pushes a history
      entry; a scroll handler that assigns it turns one flick of the wheel
      into forty entries, and the reader's Back button stops working. Reading
      is not navigation.

   3. THE QUERY STRING SURVIVES. ?cram and ?tier= live in location.search, not
      in the fragment, and this file never writes to location.search. Changing
      only the hash therefore preserves both for free, which is what makes a
      filtered view shareable: send someone ?tier=must-know#questions/spring-boot
      and they see exactly what you saw.
   ========================================================================== */

const router = (function () {
    'use strict';

    /* The five mode segments. A topic id that collided with one of these
       would make '#questions/questions' ambiguous, so validate-nav.js refuses
       the collision at build time and this list is the same list it uses. */
    var MODES = ['questions', 'theory', 'synthesis', 'predict', 'glossary'];
    var DEFAULT_MODE = 'questions';

    var handlers = {};        // mode -> function(route)
    var lastRoute = null;
    var suppress  = false;    // set while WE are writing the hash

    /* ---- Parsing ---------------------------------------------------------
       Returns a route even for nonsense input. A router that can return
       undefined makes every caller check, and one of them eventually will
       not. The `legacy` flag says the caller should normalise the address
       bar; `unknown` says the segment matched nothing at all.
       -------------------------------------------------------------------- */
    function parse(raw) {
        var hash = String(raw || '').replace(/^#/, '');
        var parts = hash.split('/').filter(function (p) { return p.length > 0; });

        if (!parts.length) {
            return { mode: DEFAULT_MODE, segments: [], legacy: false, unknown: false };
        }

        if (MODES.indexOf(parts[0]) !== -1) {
            return {
                mode: parts[0],
                segments: parts.slice(1),
                legacy: false,
                unknown: false
            };
        }

        /* Rule 1. A bare segment that names a real topic is a pre-rail link.
           Anything else is genuinely unknown and the caller decides what to
           show — but it still arrives as a well-formed route object. */
        var known = typeof topicById === 'function' && topicById(parts[0]);
        return {
            mode: DEFAULT_MODE,
            segments: parts,
            legacy: !!known,
            unknown: !known
        };
    }

    function current() {
        return parse(location.hash);
    }

    function href(mode, segments) {
        var tail = (segments || []).filter(Boolean).join('/');
        return '#' + mode + (tail ? '/' + tail : '');
    }

    /* ---- Writing the address bar -----------------------------------------
       go()      a click. Pushes history. The reader chose this.
       replace() a scroll, or a normalisation. No history entry. The reader
                 did not choose it and should not have to Back out of it.
       -------------------------------------------------------------------- */
    function go(mode, segments) {
        var target = href(mode, segments);
        if (target === location.hash) {
            // Same address: re-dispatch rather than do nothing, so clicking
            // the topic you are already on still scrolls you to the top.
            dispatch(current());
            return;
        }
        location.hash = target;
    }

    function replace(mode, segments) {
        var target = href(mode, segments);
        if (target === location.hash) return;

        if (window.history && window.history.replaceState) {
            // The query string is deliberately re-attached from
            // location.search rather than assumed empty: replaceState takes a
            // whole URL, and passing just the fragment would drop ?cram.
            suppress = true;
            window.history.replaceState(null, '', location.pathname + location.search + target);
            suppress = false;
        } else {
            location.hash = target;
        }
    }

    /* Used by the scroll spy in app.js and, from Phase 3, by theory.js.
       Named for what it is allowed to do, so that a future caller reaching
       for it to handle a click has to notice it is the wrong function. */
    function replaceQuietly(mode, segments) {
        replace(mode, segments);
        lastRoute = current();
    }

    /* ---- Flags -----------------------------------------------------------
       ?cram        show must-know only, and collapse everything else out of
                    the way. A whole reading mode expressed as one flag.
       ?tier=a,b    an explicit tier subset. Wins over ?cram if both appear,
                    because it is the more specific instruction.
       -------------------------------------------------------------------- */
    function flags() {
        var params;
        try {
            params = new URLSearchParams(location.search);
        } catch (e) {
            // Very old browsers, and file:// in one or two of them.
            return { cram: false, tiers: null, raw: '' };
        }

        var cram = params.has('cram');
        var tierParam = params.get('tier');
        var tiers = null;

        if (tierParam) {
            tiers = tierParam.split(',')
                .map(function (t) { return t.trim(); })
                .filter(function (t) {
                    return ['must-know', 'should-know', 'good-to-know'].indexOf(t) !== -1;
                });
            // A tier= with nothing valid in it is a typo, not an instruction
            // to show an empty page.
            if (!tiers.length) tiers = null;
        } else if (cram) {
            tiers = ['must-know'];
        }

        return { cram: cram, tiers: tiers, raw: location.search };
    }

    /* Rewrites ?tier= while leaving the fragment alone, so the tier chips can
       make the current filter shareable. replaceState again: choosing a
       filter is not a place you should have to Back out of one step at a
       time after clicking four chips. */
    function setTiers(tiers) {
        if (!window.history || !window.history.replaceState) return;

        var params;
        try { params = new URLSearchParams(location.search); }
        catch (e) { return; }

        var all = !tiers || tiers.length === 0 || tiers.length === 3;
        if (all) { params.delete('tier'); params.delete('cram'); }
        else     { params.set('tier', tiers.join(',')); params.delete('cram'); }

        var query = params.toString();
        window.history.replaceState(
            null, '',
            location.pathname + (query ? '?' + query : '') + location.hash
        );
    }

    /* ---- Dispatch --------------------------------------------------------
       One handler per mode, registered by the file that owns that mode.
       navigation.js therefore knows the shape of a route and nothing at all
       about what any mode renders, which is what lets Phases 3 and 4 add
       modes without touching this file.
       -------------------------------------------------------------------- */
    function register(mode, handler) {
        handlers[mode] = handler;
    }

    function dispatch(route) {
        // Rule 1, applied. Normalise first so the handler always sees a
        // canonical route and never has to know legacy links exist.
        if (route.legacy) {
            replace(route.mode, route.segments);
            route = parse(location.hash);
        }

        lastRoute = route;

        try {
            localStorage.setItem('springdeck:mode', route.mode);
            var last = JSON.parse(localStorage.getItem('springdeck:mode:last') || '{}');
            last[route.mode] = href(route.mode, route.segments);
            localStorage.setItem('springdeck:mode:last', JSON.stringify(last));
        } catch (e) {
            /* The remembered-position feature is a convenience. A browser
               that will not store it still routes perfectly well. */
        }

        document.documentElement.dataset.mode = route.mode;

        var handler = handlers[route.mode];
        if (typeof handler === 'function') handler(route);
    }

    function start() {
        window.addEventListener('hashchange', function () {
            if (suppress) return;
            dispatch(current());
        });
        dispatch(current());
    }

    return {
        MODES:           MODES,
        DEFAULT_MODE:    DEFAULT_MODE,
        parse:           parse,
        current:         current,
        href:            href,
        go:              go,
        replaceQuietly:  replaceQuietly,
        flags:           flags,
        setTiers:        setTiers,
        register:        register,
        start:           start,
        get route()      { return lastRoute; }
    };
})();
