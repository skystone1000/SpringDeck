/* ==========================================================================
   app.js — initApp, the Questions mode, and nothing else. THIS FILE IS LAST.

   Everything above it in index.html defined a global and did nothing. This is
   the file that starts the application, which is why it loads after every
   other one and why the forward references in those files are safe: they all
   run from an event handler or from initApp(), long after the last script has
   been parsed.

   PHASE 2 SCOPE. This owns exactly one of the five modes. The router calls
   the handler registered below when the route names 'questions', and knows
   nothing about what happens next; Phases 3 and 4 register their own handlers
   for the other four and will not touch this file to do it.

   The sidebar renderer here is the Questions shape of the sidebar only. Phase
   4 moves it into sidebar.js alongside the other four shapes. It lives here
   now because a sidebar file with one shape in it would be a file pretending
   to be an abstraction.
   ========================================================================== */

(function () {
    'use strict';

    /* ---- HTML escaping ---------------------------------------------------
       Authored answers are injected with innerHTML, and that is safe only
       because the data files are in the repository and validate-questions.js
       restricts authored HTML to a fixed tag subset. Everything NOT authored
       — a title, a snippet, a tag, an id — goes through this function or
       through textContent. The distinction is the whole security posture, and
       it is why <img> is outside the allowed subset: figures arrive as
       structured data and get their src set as a property.
       -------------------------------------------------------------------- */
    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    var TIERS = ['must-know', 'should-know', 'good-to-know'];

    var TIER_LABEL = {
        'must-know':    'Must know',
        'should-know':  'Should know',
        'good-to-know': 'Good to know'
    };

    /* Diagram configs cannot travel in an attribute, so they are parked here
       between building the markup and mounting the SVG. Cleared on every
       render so a topic switch cannot mount the previous topic's diagram. */
    var pendingDiagrams = [];

    /* ======================================================================
       Code blocks
       ====================================================================== */

    function renderCodeBlock(snippet, options) {
        var withOutput = !options || options.withOutput !== false;
        var lines  = snippet.code.split('\n');
        var gutter = lines.map(function (_, i) { return i + 1; }).join('\n');

        /* The gutter is built from the same split that the highlighter is
           about to walk. code-highlight.js guarantees it re-emits every
           character it was given, so the two panes cannot disagree — and the
           Phase 0 gate counts them to prove it. */
        var body = (typeof highlight === 'function')
            ? highlight(snippet.code, snippet.language)
            : escapeHtml(snippet.code);

        var html =
            '<div class="code-block">' +
                '<div class="code-head">' +
                    '<span class="code-title">' + escapeHtml(snippet.title) + '</span>' +
                    '<span class="code-lang">' + escapeHtml(snippet.language) + '</span>' +
                '</div>' +
                '<div class="code-body">' +
                    '<pre class="code-gutter" aria-hidden="true">' + gutter + '</pre>' +
                    '<pre class="code-source"><code>' + body + '</code></pre>' +
                '</div>';

        /* The predict block calls this with withOutput:false. Painting an
           answer under the code is the one thing that block exists to
           prevent, so the option is here from the start rather than being
           retrofitted in Phase 4. */
        if (withOutput && snippet.output) html += renderOutputPane(snippet.output);

        return html + '</div>';
    }

    /* stdout is literal console text, re-executed by run-snippets.js. trace is
       prose about behaviour that no local toolchain can run. They never share
       a presentation, because printing a fabricated "Output" over code that
       cannot be executed teaches something false — worse than showing
       nothing. */
    function renderOutputPane(output) {
        if (output.kind === 'stdout') {
            return '<div class="code-output">' +
                '<div class="code-output-label">Output</div>' +
                '<pre class="code-output-lines">' + escapeHtml(output.lines.join('\n')) + '</pre>' +
                (output.explain ? '<div class="code-output-explain">' + output.explain + '</div>' : '') +
            '</div>';
        }
        return '<div class="code-output">' +
            '<div class="code-output-label">What happens, in order</div>' +
            '<ol class="code-output-trace">' +
                output.lines.map(function (line) {
                    return '<li>' + escapeHtml(line) + '</li>';
                }).join('') +
            '</ol>' +
            (output.explain ? '<div class="code-output-explain">' + output.explain + '</div>' : '') +
        '</div>';
    }

    /* ======================================================================
       Figures

       images[] is structured data, and this is why. src and alt are set as
       PROPERTIES on an element this function creates, never interpolated into
       a markup string, so a validator can assert that a path is repo-relative
       and present on disk. Nothing whatsoever can be asserted about an <img>
       buried in an authored HTML blob, which is why <img> is not in the
       allowed tag subset.
       ====================================================================== */
    function renderFigures(images) {
        if (!images || !images.length) return '';
        return images.map(function (image) {
            var img = document.createElement('img');
            img.src = image.src;
            img.alt = image.alt || '';
            if (image.width)  img.width  = image.width;
            if (image.height) img.height = image.height;

            return '<figure class="figure">' +
                '<div class="figure-plate">' + img.outerHTML + '</div>' +
                '<figcaption class="figure-caption">' + escapeHtml(image.caption || '') +
                    (image.attribution
                        ? '<span class="figure-source">' + escapeHtml(image.attribution) + '</span>'
                        : '') +
                '</figcaption>' +
            '</figure>';
        }).join('');
    }

    /* ======================================================================
       Question card

       Rendered COLLAPSED, with everything built up front except the diagram
       SVG. The diagram container is present and sized so that the layout has
       already settled before anything is drawn into it — and so a draw-on
       animation does not run to completion inside a closed card where nobody
       can see it.
       ====================================================================== */
    function renderQuestionCard(question, number, topicId) {
        var domId = 'q-' + topicId + '-' + question.id;

        var snippets = (question.codeSnippets || []).map(function (snippet) {
            return renderCodeBlock(snippet);
        }).join('');

        var diagram = '';
        if (question.hasDiagram && question.diagramConfig) {
            var slot = domId + '-diagram';
            pendingDiagrams.push({
                slot: slot,
                type: question.diagramType,
                config: question.diagramConfig
            });
            diagram = '<div class="diagram" id="' + slot + '"></div>';
        }

        var tags = (question.tags || []).length
            ? '<div class="question-tags">' + question.tags.map(function (tag) {
                  return '<span class="question-tag">' + escapeHtml(tag) + '</span>';
              }).join('') + '</div>'
            : '';

        var links = (question.referenceLinks || []).length
            ? '<div class="answer"><p><strong>Reference</strong></p><ul>' +
              question.referenceLinks.map(function (link) {
                  return '<li><a href="' + escapeHtml(link.url) +
                         '" target="_blank" rel="noopener noreferrer">' +
                         escapeHtml(link.title) + '</a></li>';
              }).join('') + '</ul></div>'
            : '';

        var answered = progressStore.isAnswered(topicId, question.id);
        var flagged  = progressStore.isFlagged(topicId, question.id);

        return '' +
        '<article class="question-card' + (answered ? ' is-answered' : '') +
                '" data-question-id="' + escapeHtml(question.id) +
                '" data-tier="' + escapeHtml(question.importance) + '">' +
            '<button class="question-head" type="button" aria-expanded="false" aria-controls="' + domId + '">' +
                /* THE NUMBER IS STABLE UNDER FILTERING. Card 27 is card 27
                   whether or not cards 1 to 26 are hidden. People cite these
                   numbers — in notes, to each other — and renumbering per
                   filter makes every such reference ambiguous. Filtering sets
                   `hidden`; it never renumbers. */
                '<span class="question-number">' + number + '</span>' +
                '<span class="question-text">' + escapeHtml(question.question) + '</span>' +
                '<span class="question-side">' +
                    '<span class="tier-badge" data-tier="' + escapeHtml(question.importance) + '">' +
                        '<span class="tier-dot"></span>' + TIER_LABEL[question.importance] +
                    '</span>' +
                    '<svg class="question-chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>' +
                '</span>' +
            '</button>' +
            '<div class="question-body" id="' + domId + '" hidden>' +
                '<div class="answer">' + question.answer + '</div>' +
                renderFigures(question.images) +
                diagram +
                snippets +
                links +
                tags +
                '<div class="question-actions">' +
                    '<button class="progress-toggle" type="button" data-action="answered" aria-pressed="' + answered + '">' +
                        '<span class="progress-toggle-label">' + (answered ? 'Answered' : 'Mark answered') + '</span>' +
                    '</button>' +
                    '<button class="progress-toggle" type="button" data-action="review" aria-pressed="' + flagged + '">' +
                        '<span class="progress-toggle-label">' + (flagged ? 'Flagged' : 'Review later') + '</span>' +
                    '</button>' +
                    '<span class="review-date">' + escapeHtml(flaggedLabel(topicId, question.id)) + '</span>' +
                '</div>' +
            '</div>' +
        '</article>';
    }

    /* "Flagged 3 days ago" rather than a raw date, because the useful question
       is how stale it is, not which Tuesday it was. Returns an empty string
       when there is nothing to say, rather than a placeholder. */
    function flaggedLabel(topicId, questionId) {
        var iso = progressStore.flaggedAt(topicId, questionId);
        if (!iso) return '';

        var then = Date.parse(iso);
        if (isNaN(then)) return '';

        var days = Math.floor((Date.now() - then) / 86400000);
        if (days <= 0) return 'Flagged today';
        if (days === 1) return 'Flagged yesterday';
        if (days < 30) return 'Flagged ' + days + ' days ago';
        var months = Math.round(days / 30);
        return 'Flagged ' + months + (months === 1 ? ' month ago' : ' months ago');
    }

    /* ======================================================================
       Tier filter

       The counts are of the WHOLE topic and do not move when a chip is
       toggled. A count that shrank as you filtered would be answering a
       question nobody asked — you can see how many are showing; what you
       cannot see is how many exist.
       ====================================================================== */
    function renderTierFilter(topic, active) {
        var counts = {};
        TIERS.forEach(function (tier) { counts[tier] = 0; });
        topic.questions.forEach(function (q) {
            if (counts[q.importance] !== undefined) counts[q.importance]++;
        });

        return '<div class="tier-filter" role="group" aria-label="Filter by importance">' +
            '<span class="tier-filter-label">Show</span>' +
            TIERS.map(function (tier) {
                var on = active.indexOf(tier) !== -1;
                return '<button class="tier-chip" type="button" data-tier="' + tier +
                       '" aria-pressed="' + on + '"' + (counts[tier] ? '' : ' disabled') + '>' +
                    '<span class="tier-dot"></span>' + TIER_LABEL[tier] +
                    '<span class="tier-count">' + counts[tier] + '</span>' +
                '</button>';
            }).join('') +
        '</div>';
    }

    function cramBanner(flags) {
        if (!flags.cram) return '';
        return '<div class="cram-banner">' +
            '<span>Cram mode — showing the must-know set only.</span>' +
            '<button type="button" data-action="exit-cram">Show everything</button>' +
        '</div>';
    }

    /* ======================================================================
       Topic
       ====================================================================== */

    function trackFor(topicId) {
        var id = (typeof topicTracks === 'object' && topicTracks) ? topicTracks[topicId] : null;
        if (!id || typeof trackById !== 'function') return null;
        return trackById(id);
    }

    function renderTopic(topic) {
        var container = document.getElementById('topicContainer');
        if (!container) return;

        if (!topic) {
            container.innerHTML = '<div class="empty-state">' +
                '<h2>No such topic</h2>' +
                '<p>That link points at a topic this deck does not have. ' +
                'Pick one from the list on the left.</p>' +
            '</div>';
            return;
        }

        pendingDiagrams = [];

        var flags  = router.flags();
        var active = flags.tiers || TIERS.slice();
        var track  = trackFor(topic.id);

        var lastSubsection = undefined;
        var cards = topic.questions.map(function (question, index) {
            var heading = '';

            /* Subsection headings are emitted WHERE THE VALUE CHANGES rather
               than by grouping, so the numbers stay in ascending order down
               the page. Grouping would reorder the cards, and a reordered
               card gets a different number — which is the one thing the
               numbering rule forbids. Authors keep a subsection contiguous;
               validate-questions.js is where that gets enforced. */
            if (question.subsection !== lastSubsection) {
                lastSubsection = question.subsection;
                var title = subsectionTitle(topic, question.subsection);
                if (title) heading = '<h2 class="subsection-heading">' + escapeHtml(title) + '</h2>';
            }

            return heading + renderQuestionCard(question, index + 1, topic.id);
        }).join('');

        container.innerHTML =
            '<header class="topic-header"' + (track ? ' data-hue="' + escapeHtml(track.hue) + '"' : '') + '>' +
                '<div class="topic-eyebrow">' + escapeHtml(track ? track.title : 'Questions') + '</div>' +
                '<h1 class="topic-title">' + escapeHtml(topic.title) + '</h1>' +
                '<p class="topic-meta">' + topic.questions.length + ' questions</p>' +
                ((topic.keyTopics || []).length
                    ? '<div class="key-topics">' + topic.keyTopics.map(function (key) {
                          return '<span class="key-topic">' + escapeHtml(key) + '</span>';
                      }).join('') + '</div>'
                    : '') +
            '</header>' +
            cramBanner(flags) +
            renderTierFilter(topic, active) +
            cards;

        mountDiagrams();
        applyTierFilter(container, active);
        bindTopic(container, topic);
        updateModeHeader(topic);
    }

    function subsectionTitle(topic, id) {
        if (!id || !topic.subsections) return '';
        for (var i = 0; i < topic.subsections.length; i++) {
            if (topic.subsections[i].id === id) return topic.subsections[i].title;
        }
        return '';
    }

    function mountDiagrams() {
        pendingDiagrams.forEach(function (item) {
            diagrams.mount(document.getElementById(item.slot), item.type, item.config);
        });
        pendingDiagrams = [];
    }

    /* Hiding, not removing. A hidden card keeps its number, keeps its place
       in the document, and comes back instantly — and a reader who filters to
       must-know and back has not lost which cards they had open. */
    function applyTierFilter(container, active) {
        var shown = 0;
        container.querySelectorAll('.question-card').forEach(function (card) {
            var on = active.indexOf(card.getAttribute('data-tier')) !== -1;
            card.hidden = !on;
            if (on) shown++;
        });

        container.querySelectorAll('.tier-chip').forEach(function (chip) {
            chip.setAttribute('aria-pressed',
                String(active.indexOf(chip.getAttribute('data-tier')) !== -1));
        });

        /* A subsection heading whose every card is filtered out is a heading
           over nothing. It hides with them. */
        container.querySelectorAll('.subsection-heading').forEach(function (heading) {
            var node = heading.nextElementSibling;
            var any = false;
            while (node && !node.classList.contains('subsection-heading')) {
                if (node.classList.contains('question-card') && !node.hidden) { any = true; break; }
                node = node.nextElementSibling;
            }
            heading.hidden = !any;
        });

        var meta = document.getElementById('modeMeta');
        if (meta) {
            var total = container.querySelectorAll('.question-card').length;
            meta.textContent = shown === total
                ? total + ' questions'
                : shown + ' of ' + total + ' shown';
        }
    }

    /* ======================================================================
       Events
       ====================================================================== */

    function bindTopic(container, topic) {
        container.querySelectorAll('.question-head').forEach(function (head) {
            head.addEventListener('click', function () {
                var card = head.closest('.question-card');
                var body = document.getElementById(head.getAttribute('aria-controls'));
                var open = card.classList.toggle('is-open');

                head.setAttribute('aria-expanded', String(open));
                if (body) body.hidden = !open;

                /* Opening a card is a CLICK, so it pushes a history entry and
                   the address bar becomes a link worth sending. Closing goes
                   back to the topic rather than leaving a dangling deep link
                   to a collapsed card. */
                if (open) router.go('questions', [topic.id, card.getAttribute('data-question-id')]);
                else      router.go('questions', [topic.id]);
            });
        });

        container.querySelectorAll('.progress-toggle').forEach(function (button) {
            button.addEventListener('click', function () {
                var card  = button.closest('.question-card');
                var qid   = card.getAttribute('data-question-id');
                var label = button.querySelector('.progress-toggle-label');

                if (button.getAttribute('data-action') === 'answered') {
                    var answered = progressStore.toggleAnswered(topic.id, qid);
                    button.setAttribute('aria-pressed', String(answered));
                    label.textContent = answered ? 'Answered' : 'Mark answered';
                    card.classList.toggle('is-answered', answered);
                } else {
                    var flagged = progressStore.toggleFlagged(topic.id, qid);
                    button.setAttribute('aria-pressed', String(flagged));
                    label.textContent = flagged ? 'Flagged' : 'Review later';
                    var date = card.querySelector('.review-date');
                    if (date) date.textContent = flaggedLabel(topic.id, qid);
                }
                updateModeHeader(topic);
            });
        });

        container.querySelectorAll('.tier-chip').forEach(function (chip) {
            chip.addEventListener('click', function () {
                var active = (router.flags().tiers || TIERS.slice()).slice();
                var tier   = chip.getAttribute('data-tier');
                var at     = active.indexOf(tier);

                if (at === -1) active.push(tier);
                else active.splice(at, 1);

                // Turning the last chip off shows everything again rather
                // than showing nothing. An empty page is never what anyone
                // meant by clicking a filter.
                if (!active.length) active = TIERS.slice();

                router.setTiers(active);
                applyTierFilter(container, active);
                syncCramBanner(container);
            });
        });

        var exit = container.querySelector('[data-action="exit-cram"]');
        if (exit) {
            exit.addEventListener('click', function () {
                router.setTiers(TIERS.slice());
                applyTierFilter(container, TIERS.slice());
                syncCramBanner(container);
            });
        }
    }

    function syncCramBanner(container) {
        var banner = container.querySelector('.cram-banner');
        if (banner) banner.hidden = !router.flags().cram;
    }

    /* ======================================================================
       Mode header and rail meter

       ONE mode, ONE noun, ONE number. The bar is this topic's answered count
       over this topic's total — never a figure spanning modes, and never an
       average of five things that are not the same kind of thing.
       ====================================================================== */
    function updateModeHeader(topic) {
        var title = document.getElementById('modeTitle');
        if (title) title.textContent = 'Questions';

        var answered = topic ? progressStore.answeredInTopic(topic) : 0;
        var total    = topic ? topic.questions.length : 0;

        var fill = document.getElementById('modeProgressFill');
        if (fill) fill.style.width = (total ? Math.round((answered / total) * 100) : 0) + '%';

        var text = document.getElementById('modeProgressText');
        if (text) text.textContent = total ? answered + ' / ' + total : '';

        var value = document.getElementById('railMeterValue');
        var noun  = document.getElementById('railMeterNoun');
        var deckWide = progressStore.countFor('questions');
        if (value) value.textContent = deckWide;
        if (noun)  noun.textContent  = progressStore.nounFor('questions', deckWide);
    }

    /* ======================================================================
       Sidebar — the Questions shape of it

       Topics grouped by track, in track order, with the answered count beside
       each. Phase 4 moves this into sidebar.js next to the other four shapes.
       ====================================================================== */
    function renderQuestionSidebar(activeTopicId) {
        var nav = document.getElementById('sidebarNav');
        if (!nav) return;

        var groups = (typeof subjectTracks === 'function' ? subjectTracks() : [])
            .map(function (track) {
                return { track: track, topics: topicsInTrack(track.id) };
            })
            .filter(function (group) { return group.topics.length > 0; });

        /* `null` is a spelled-out answer meaning "belongs to no subject", and
           it renders in its own group rather than vanishing. A topic nobody
           has decided about is `undefined`, and validate-nav.js catches that
           — the two are different problems and only one of them is legal. */
        var orphans = topicsInTrack(null);
        if (orphans.length) {
            groups.push({ track: { id: null, title: 'Everything else', hue: 'slate' }, topics: orphans });
        }

        nav.innerHTML = groups.map(function (group) {
            return '<div class="sidebar-section" data-hue="' + escapeHtml(group.track.hue) + '">' +
                '<div class="sidebar-section-label">' + escapeHtml(group.track.title) + '</div>' +
                group.topics.map(function (topic) {
                    var answered = progressStore.answeredInTopic(topic);
                    return '<a class="sidebar-link' + (topic.id === activeTopicId ? ' is-active' : '') +
                           '" href="' + router.href('questions', [topic.id]) + '">' +
                        '<span class="sidebar-link-title">' + escapeHtml(topic.title) + '</span>' +
                        '<span class="sidebar-count">' + answered + '/' + topic.questions.length + '</span>' +
                    '</a>';
                }).join('') +
            '</div>';
        }).join('');

        nav.querySelectorAll('.sidebar-link').forEach(function (link) {
            link.addEventListener('click', function () { closeDrawer(); });
        });
    }

    /* ======================================================================
       Route handler
       ====================================================================== */

    function handleQuestions(route) {
        var topicId = route.segments[0] || (topics[0] && topics[0].id);
        var topic   = topicById(topicId);

        renderQuestionSidebar(topic ? topic.id : null);
        renderTopic(topic);

        if (!topic) return;

        /* A deep link to a card opens it and scrolls to it. Done after render
           so the element exists, and with scrollIntoView rather than a
           computed offset so it stays correct at every breakpoint. */
        var questionId = route.segments[1];
        if (questionId) {
            var card = document.querySelector('.question-card[data-question-id="' +
                                              cssEscape(questionId) + '"]');
            if (card && !card.hidden) {
                var head = card.querySelector('.question-head');
                if (head && !card.classList.contains('is-open')) {
                    card.classList.add('is-open');
                    head.setAttribute('aria-expanded', 'true');
                    var body = document.getElementById(head.getAttribute('aria-controls'));
                    if (body) body.hidden = false;
                }
                card.scrollIntoView({ block: 'start', behavior: 'smooth' });
                return;
            }
        }

        window.scrollTo({ top: 0 });
    }

    /* CSS.escape is not in every browser this deck is expected to open in,
       and an id containing a dot would silently select nothing. Ids are kebab
       by validator rule, so quoting the four characters that could still
       appear is enough — and it degrades to the native one where it exists. */
    function cssEscape(value) {
        if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(value);
        return String(value).replace(/["\\\]\[]/g, '\\$&');
    }

    /* ======================================================================
       Shell
       ====================================================================== */

    function closeDrawer() {
        document.body.classList.remove('drawer-open');
        var hamburger = document.getElementById('hamburger');
        if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
    }

    function bindShell() {
        var hamburger = document.getElementById('hamburger');
        var overlay   = document.getElementById('drawerOverlay');

        if (hamburger) {
            hamburger.addEventListener('click', function () {
                var open = document.body.classList.toggle('drawer-open');
                hamburger.setAttribute('aria-expanded', String(open));
            });
        }
        if (overlay) overlay.addEventListener('click', closeDrawer);

        var backToTop = document.getElementById('backToTop');
        if (backToTop) {
            backToTop.addEventListener('click', function () {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
            window.addEventListener('scroll', function () {
                backToTop.classList.toggle('is-visible', window.scrollY > 400);
            }, { passive: true });
        }

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') closeDrawer();

            // `/` focuses the search box, unless the reader is already typing
            // into something — in which case a slash is a slash.
            var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
            if (event.key === '/' && !typing) {
                var input = document.getElementById('searchInput');
                if (input) { event.preventDefault(); input.focus(); }
            }
        });
    }

    function initApp() {
        if (typeof initTheme === 'function') initTheme();
        if (typeof initBackground === 'function') initBackground();

        bindShell();
        router.register('questions', handleQuestions);
        router.start();
    }

    /* Exported for the files that arrive in later phases. renderCodeBlock in
       particular is shared verbatim with the theory renderers, so a snippet
       looks and behaves identically in both corpora because it is the same
       function drawing it. */
    window.escapeHtml      = escapeHtml;
    window.renderCodeBlock = renderCodeBlock;
    window.renderOutputPane = renderOutputPane;
    window.renderFigures   = renderFigures;
    window.renderTopic     = renderTopic;
    window.initApp         = initApp;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp();
    }
})();
