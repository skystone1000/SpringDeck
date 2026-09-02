/* ==========================================================================
   sidebar.js — five shapes, dispatched once

   The contextual sidebar is not five sidebars. It is one panel whose shape is
   named by the mode: `topics`, `tracks`, `sets`, `alphabet`. The mode says
   which, in data/modes.js, and this file dispatches on that field exactly
   once. No mode renderer asks "which mode am I" to decide what its sidebar
   looks like, and none of them touches #sidebarNav directly.

   THE TWO SHAPES THAT WERE ALREADY WRITTEN MOVED HERE UNCHANGED IN BEHAVIOUR.
   `topics` came out of app.js and `tracks` out of theory.js, where each had
   grown its own copy of the same four things: build the markup, close the
   drawer on a click, refresh the counts in place, and never re-render just to
   change two digits. Two copies of a rule is one copy too many to keep in
   step; four would have been unmanageable.

   WHY COUNTS ARE REFRESHED IN PLACE. Re-rendering the sidebar to change a
   number would rebuild every link, rebind every handler, and throw away the
   drawer's scroll position on a phone — a great deal of work to move one
   digit. refreshCounts walks the existing nodes instead.
   ========================================================================== */

const sidebar = (function () {
    'use strict';

    function esc(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function nav() {
        return document.getElementById('sidebarNav');
    }

    /* One drawer, one close. Both mode files used to carry their own. */
    function closeDrawer() {
        document.body.classList.remove('drawer-open');
        var hamburger = document.getElementById('hamburger');
        if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
    }

    function bindLinks(root) {
        root.querySelectorAll('.sidebar-link, .sidebar-sublink, .glossary-letter')
            .forEach(function (link) {
                link.addEventListener('click', function () { closeDrawer(); });
            });
    }

    function section(track, body) {
        return '<div class="sidebar-section"' +
               (track && track.hue ? ' data-hue="' + esc(track.hue) + '"' : '') + '>' +
               (track && track.title
                   ? '<div class="sidebar-section-label">' + esc(track.title) + '</div>'
                   : '') +
               body + '</div>';
    }

    function link(href, title, count, isActive, dataAttr) {
        return '<a class="sidebar-link' + (isActive ? ' is-active' : '') + '"' +
               ' href="' + href + '"' + (dataAttr || '') + '>' +
               '<span class="sidebar-link-title">' + esc(title) + '</span>' +
               (count === null ? '' : '<span class="sidebar-count">' + esc(count) + '</span>') +
               '</a>';
    }

    /* ======================================================================
       Shape 1 — `topics`. Questions.
       ====================================================================== */
    function shapeTopics(activeTopicId) {
        var groups = (typeof subjectTracks === 'function' ? subjectTracks() : [])
            .map(function (track) {
                return { track: track, topics: topicsInTrack(track.id) };
            })
            .filter(function (group) { return group.topics.length > 0; });

        /* `null` is a spelled-out answer meaning "belongs to no subject", and
           it renders in its own group rather than vanishing. A topic nobody
           has decided about is `undefined`, and validate-nav.js catches that
           — two different problems, and only one of them is legal. */
        var orphans = topicsInTrack(null);
        if (orphans.length) {
            groups.push({
                track: { id: null, title: 'Everything else', hue: 'slate' },
                topics: orphans
            });
        }

        return groups.map(function (group) {
            return section(group.track, group.topics.map(function (topic) {
                return link(
                    router.href('questions', [topic.id]),
                    topic.title,
                    progressStore.answeredInTopic(topic) + '/' + topic.questions.length,
                    topic.id === activeTopicId,
                    ' data-topic-id="' + esc(topic.id) + '"'
                );
            }).join(''));
        }).join('');
    }

    /* ======================================================================
       Shape 2 — `tracks`. Theory.
       ====================================================================== */
    function readInModule(module) {
        var n = 0;
        module.chapters.forEach(function (chapter) {
            if (progressStore.isDone('theory', module.id + ':' + chapter.id)) n++;
        });
        return n;
    }

    function shapeTracks(activeModuleId) {
        var groups = (typeof subjectTracks === 'function' ? subjectTracks() : [])
            .map(function (track) {
                return { track: track, modules: modulesInTrack(track.id) };
            })
            .filter(function (group) { return group.modules.length > 0; });

        return section(null, link('#theory', 'The reading path', null, !activeModuleId)) +
            groups.map(function (group) {
                return section(group.track, group.modules.map(function (module) {
                    return link(
                        router.href('theory', [module.id]),
                        module.title,
                        readInModule(module) + '/' + module.chapters.length,
                        module.id === activeModuleId,
                        ' data-module-id="' + esc(module.id) + '"'
                    );
                }).join(''));
            }).join('');
    }

    /* ======================================================================
       Shape 3 — `sets`. Synthesis and Predict.

       DELIBERATELY NO TRACK LIST. Tracks are the organising axis of the
       material these two modes draw ON, not of the material itself: a drill
       about connection pools is not "a persistence drill", it is a drill, and
       filing it under a subject would suggest you should work through the
       subjects rather than through the rounds. Where the provenance matters
       it appears as a chip inside the card that says so.
       ====================================================================== */
    function unitsInModule(mode, module) {
        var total = 0;
        var done  = 0;
        var type  = mode.id === 'predict' ? 'predict' : 'drill';

        module.chapters.forEach(function (chapter) {
            chapter.blocks.forEach(function (block) {
                if (block.type !== type) return;
                total++;
                if (mode.id === 'predict') {
                    if (progressStore.verdictFor(block.id) === 'right') done++;
                } else if (progressStore.isDone('synthesis', block.id)) {
                    done++;
                }
            });
        });
        return { done: done, total: total };
    }

    function shapeSets(mode, activeSetId) {
        var sets = mode.trackId && typeof modulesInTrack === 'function'
            ? modulesInTrack(mode.trackId)
            : [];

        if (!sets.length) {
            return section(null,
                '<div class="sidebar-empty">No sets authored yet.</div>');
        }

        return section(null, link('#' + mode.route, 'All sets', null, !activeSetId)) +
            section({ title: mode.title }, sets.map(function (module) {
                var count = unitsInModule(mode, module);
                return link(
                    router.href(mode.route, [module.id]),
                    module.title,
                    count.done + '/' + count.total,
                    module.id === activeSetId,
                    ' data-set-id="' + esc(module.id) + '"'
                );
            }).join(''));
    }

    /* ======================================================================
       Shape 4 — `alphabet`. Glossary.

       A jump grid rather than a list, because 47 terms is already too many to
       scan in a 240px column and the number only goes up. A letter with no
       term under it is rendered disabled rather than omitted: a grid that
       changes shape as the corpus grows is harder to use than one where D is
       always in the same place.
       ====================================================================== */
    var LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

    function shapeAlphabet(activeLetter) {
        var have = {};
        if (typeof collectGlossaryEntries === 'function') {
            collectGlossaryEntries().forEach(function (entry) {
                have[String(entry.term).charAt(0).toUpperCase()] = true;
            });
        }

        var grid = LETTERS.map(function (letter) {
            var enabled = !!have[letter];
            var active  = activeLetter && activeLetter.toUpperCase() === letter;
            if (!enabled) {
                return '<span class="glossary-letter is-empty" aria-hidden="true">' +
                       letter + '</span>';
            }
            return '<a class="glossary-letter' + (active ? ' is-active' : '') +
                   '" href="' + router.href('glossary', [letter.toLowerCase()]) + '">' +
                   letter + '</a>';
        }).join('');

        return section(null, link('#glossary', 'Every term', null, !activeLetter)) +
               section({ title: 'Jump to' }, '<div class="glossary-jump">' + grid + '</div>');
    }

    /* ======================================================================
       Dispatch
       ====================================================================== */
    function render(modeId, activeId) {
        var host = nav();
        var mode = modeById[modeId];
        if (!host || !mode) return;

        var html;
        switch (mode.sidebar) {
            case 'topics':   html = shapeTopics(activeId);   break;
            case 'tracks':   html = shapeTracks(activeId);   break;
            case 'sets':     html = shapeSets(mode, activeId); break;
            case 'alphabet': html = shapeAlphabet(activeId); break;
            default:
                /* A shape name nobody implemented is an authoring error in
                   modes.js, and it says so rather than rendering an empty
                   panel that looks like a corpus with nothing in it. */
                html = section(null, '<div class="sidebar-empty">No sidebar shape "' +
                                     esc(mode.sidebar) + '".</div>');
        }

        host.innerHTML = html;
        bindLinks(host);
    }

    /* In place, per shape. The selector is the shape's own data attribute, so
       a sidebar rendered for another mode is simply not matched and nothing
       happens — which is the right outcome for a store notification that
       arrives while the reader is elsewhere. */
    function refreshCounts(modeId) {
        var host = nav();
        if (!host) return;

        if (modeId === 'questions') {
            host.querySelectorAll('[data-topic-id]').forEach(function (el) {
                var topic = topicById(el.getAttribute('data-topic-id'));
                var count = el.querySelector('.sidebar-count');
                if (topic && count) {
                    count.textContent = progressStore.answeredInTopic(topic) + '/' +
                                        topic.questions.length;
                }
            });
            return;
        }

        if (modeId === 'theory') {
            host.querySelectorAll('[data-module-id]').forEach(function (el) {
                var module = theoryByModuleId[el.getAttribute('data-module-id')];
                var count  = el.querySelector('.sidebar-count');
                if (module && count) {
                    count.textContent = readInModule(module) + '/' + module.chapters.length;
                }
            });
            return;
        }

        var mode = modeById[modeId];
        if (mode && mode.sidebar === 'sets') {
            host.querySelectorAll('[data-set-id]').forEach(function (el) {
                var module = theoryByModuleId[el.getAttribute('data-set-id')];
                var count  = el.querySelector('.sidebar-count');
                if (module && count) {
                    var n = unitsInModule(mode, module);
                    count.textContent = n.done + '/' + n.total;
                }
            });
        }
    }

    return {
        render:        render,
        refreshCounts: refreshCounts,
        closeDrawer:   closeDrawer,
        readInModule:  readInModule
    };
})();
