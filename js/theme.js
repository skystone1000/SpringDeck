/* ==========================================================================
   theme.js — initTheme, toggleTheme

   The theme is already applied by the time this file runs: the inline script
   in <head> stamps data-theme on the root element before the body parses.
   This file exists to wire the switch and to persist a choice.

   Three states, not two. An explicit choice stamps data-theme; the absence of
   one means "follow the system", and that is a real answer rather than a
   missing value.
   ========================================================================== */

(function () {
    'use strict';

    var STORAGE_KEY = 'theme';

    /* Every localStorage access is wrapped. It throws on file:// in some
       browsers and in private mode, and progress is a convenience that is not
       worth breaking the page over. */
    function read(key) {
        try { return localStorage.getItem(key); } catch (e) { return null; }
    }
    function write(key, value) {
        try { localStorage.setItem(key, value); } catch (e) { /* nothing to do */ }
    }

    function systemPrefersDark() {
        return window.matchMedia &&
               window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    /* What the reader is looking at right now, whether or not they chose it. */
    function effectiveTheme() {
        var explicit = document.documentElement.getAttribute('data-theme');
        if (explicit === 'dark' || explicit === 'light') return explicit;
        return systemPrefersDark() ? 'dark' : 'light';
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        var button = document.getElementById('themeSwitch');
        if (button) {
            button.setAttribute('aria-label',
                theme === 'dark' ? 'Switch to the light theme' : 'Switch to the dark theme');
        }
    }

    function toggleTheme() {
        var next = effectiveTheme() === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        write(STORAGE_KEY, next);
    }

    function initTheme() {
        var stored = read(STORAGE_KEY);
        if (stored === 'dark' || stored === 'light') {
            applyTheme(stored);
        } else {
            /* No stored choice: leave the attribute off so the media query in
               themes.css keeps deciding, and follow the system if it changes
               under us mid-session. */
            var query = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
            if (query && query.addEventListener) {
                query.addEventListener('change', function () {
                    if (!read(STORAGE_KEY)) {
                        document.documentElement.removeAttribute('data-theme');
                    }
                });
            }
        }

        var button = document.getElementById('themeSwitch');
        if (button) button.addEventListener('click', toggleTheme);

        applyTheme(effectiveTheme());
    }

    window.initTheme = initTheme;
    window.toggleTheme = toggleTheme;
    window.effectiveTheme = effectiveTheme;
})();
