/* ==========================================================================
   theory.js — the Theory mode, and the twelve block renderers

   The second of the five modes, and the second of the two corpora. It is a
   separate file from app.js for the reason the blueprint gives: the two
   corpora are NOT views of each other. The question bank is a lookup — you
   arrive knowing what you want. This is a curriculum — you arrive not knowing
   what you do not know, and the order is the product.

   REGISTERED AT PARSE TIME, NOT FROM initApp(). router.register() is called
   at the bottom of this file rather than from app.js, so adding a mode is
   adding a file and one script tag. app.js calls router.start() afterwards,
   and start() is what dispatches — so by the time any route resolves, every
   mode that exists has registered itself. That is the whole extension point.

   THE BLOCK SWITCH IS THE EXTENSION POINT BELOW IT. A thirteenth block type
   is one case in renderBlock() plus one rule in theory.css, and nothing else
   in the application learns about it — not the router, not the sidebar, not
   progress, not search. That is the entire reason the block list is a switch
   over a tagged union rather than a family of components.
   ========================================================================== */

(function () {
    'use strict';

    /* app.js owns these and assigns them at parse time, which is long before
       any handler here runs. renderCodeBlock in particular is deliberately
       THE SAME FUNCTION the question bank uses: a snippet has to look and
       behave identically in both corpora, and the only way to guarantee that
       is for one function to draw both. */
    function esc(value) {
        return (typeof window.escapeHtml === 'function')
            ? window.escapeHtml(value)
            : String(value == null ? '' : value);
    }

    function code(snippet, options) {
        return (typeof window.renderCodeBlock === 'function')
            ? window.renderCodeBlock(snippet, options)
            : '<pre>' + esc(snippet.code) + '</pre>';
    }

    var TIERS = ['must-know', 'should-know', 'good-to-know'];

    var TIER_LABEL = {
        'must-know':    'Must know',
        'should-know':  'Should know',
        'good-to-know': 'Good to know'
    };

    /* The reveal pane's heading, derived from what is actually being
       predicted. A reader is never shown a console frame around something
       that never touched a console — which is the same honesty rule the
       stdout/trace split enforces one level down. */
    var ARTEFACT_LABEL = {
        'stdout':        'Console output',
        'sql-result':    'Result set',
        'http-response': 'HTTP response',
        'query-count':   'Queries issued',
        'behaviour':     'What happens'
    };

    var pendingDiagrams = [];

    /* ======================================================================
       THE TWELVE BLOCK RENDERERS

       One switch. Every case returns a string; nothing here touches the DOM
       except the diagram case, which cannot — an SVG config will not fit in
       an attribute, so it parks the config and mounts after insertion, the
       same way the question bank does.
       ====================================================================== */

    function renderBlock(block) {
        switch (block.type) {
            case 'prose':      return '<div class="block block-prose">' + block.html + '</div>';
            case 'definition': return renderDefinition(block);
            case 'types':      return renderTypes(block);
            case 'syntax':     return renderSyntax(block);
            case 'table':      return renderTable(block);
            case 'comparison': return renderComparison(block);
            case 'pitfall':    return renderCallout(block, 'pitfall', 'Pitfall');
            case 'tip':        return renderCallout(block, 'tip', 'Saying it well');
            case 'diagram':    return renderDiagramBlock(block);
            case 'drill':      return renderDrill(block);
            case 'predict':    return renderPredict(block);
            case 'version':    return renderVersion(block);
            default:           return '';
        }
    }

    /* 2 — definition. The glossary is HARVESTED from these, never authored,
       so the term arrives there with the chapter that owns it attached and
       the backlink is a property of the data rather than a link somebody has
       to remember to write. data-term and data-chapter are the harvest. */
    function renderDefinition(block) {
        return '<div class="block block-definition" data-term="' + esc(block.term) + '"' +
               (block.important ? ' data-important="true"' : '') + '>' +
            '<span class="definition-term">' + esc(block.term) + '</span>' +
            block.html +
        '</div>';
    }

    function renderTypes(block) {
        return '<div class="block block-types">' +
            '<div class="types-title">' + esc(block.title) + '</div>' +
            block.items.map(function (item) {
                return '<div class="types-item">' +
                    '<div class="types-name">' + esc(item.name) + '</div>' +
                    '<div class="types-desc">' + item.html + '</div>' +
                '</div>';
            }).join('') +
        '</div>';
    }

    /* 4 — syntax. Delegates, and may carry an output pane and notes
       (blueprint 18.3). The delegation is the point: validate-theory.js
       applies the same output.kind rule to this block that the question bank
       applies to a question snippet, so a stdout claim cannot enter the deck
       through the corpus that was not being checked. */
    function renderSyntax(block) {
        return '<div class="block block-syntax">' +
            code(block) +
            (block.notes ? '<div class="syntax-notes">' + block.notes + '</div>' : '') +
        '</div>';
    }

    function renderTable(block) {
        return '<div class="block block-table">' +
            (block.title ? '<div class="types-title">' + esc(block.title) + '</div>' : '') +
            /* The scroller wraps the table only, not the title: a heading
               that slid out of view while you scrolled the rows would be
               worse than the overflow it is fixing. */
            '<div class="table-scroll"><table><thead><tr>' +
                block.headers.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') +
            '</tr></thead><tbody>' +
                block.rows.map(function (row) {
                    return '<tr>' + row.map(function (cell) {
                        return '<td>' + cell + '</td>';
                    }).join('') + '</tr>';
                }).join('') +
            '</tbody></table></div>' +
        '</div>';
    }

    function renderComparison(block) {
        return '<div class="block block-comparison">' +
            '<div class="comparison-title">' + esc(block.title) + '</div>' +
            '<div class="comparison-grid">' +
                '<div class="comparison-aspect"></div>' +
                '<div>' + esc(block.left) + '</div>' +
                '<div>' + esc(block.right) + '</div>' +
                block.rows.map(function (row) {
                    return '<div class="comparison-aspect">' + esc(row.aspect) + '</div>' +
                           '<div>' + row.left + '</div>' +
                           '<div>' + row.right + '</div>';
                }).join('') +
            '</div>' +
        '</div>';
    }

    function renderCallout(block, kind, label) {
        return '<div class="block block-' + kind + '">' +
            '<span class="callout-label">' + label + '</span>' +
            block.html +
        '</div>';
    }

    /* 9 — diagram. A config cannot travel in an attribute, so it is parked
       and mounted after the markup is in the document. Cleared on every
       render, so switching modules cannot mount the previous one's diagram. */
    function renderDiagramBlock(block) {
        var slot = 'dg-theory-' + pendingDiagrams.length;
        pendingDiagrams.push({ slot: slot, type: block.diagramType, config: block.diagramConfig });
        return '<div class="block block-diagram">' +
            '<div class="diagram" id="' + slot + '"></div>' +
            (block.caption ? '<div class="dg-caption">' + esc(block.caption) + '</div>' : '') +
        '</div>';
    }

    /* 10 — drill. THE SKETCH IS COLLAPSED ON CREATION, and that is not a
       style choice: reading the solution before attempting the drill is the
       one reliable way to get nothing at all out of it. <details> without
       [open] does this in markup, so it also survives a reader with
       JavaScript disabled and a printed page (print.css expands it, because
       paper cannot be clicked). */
    function renderDrill(block) {
        return '<div class="block block-drill" data-drill-id="' + esc(block.id) + '">' +
            '<div class="drill-head">' +
                '<span class="drill-title">' + esc(block.title) + '</span>' +
                '<span class="drill-tier" data-tier="' + esc(block.tier) + '">Tier ' + esc(block.tier) + '</span>' +
                '<span class="drill-minutes">' + esc(block.minutes) + ' min</span>' +
            '</div>' +
            '<div class="drill-prompt">' + block.prompt + '</div>' +
            '<div class="watch-for">' +
                '<span class="watch-for-label">What loses marks</span>' +
                '<ul>' + block.watchFor.map(function (line) {
                    return '<li>' + esc(line) + '</li>';
                }).join('') + '</ul>' +
            '</div>' +
            (block.sketch
                ? '<details class="drill-sketch"><summary>Show a solution sketch</summary>' +
                  code(block.sketch) + '</details>'
                : '') +
        '</div>';
    }

    /* 11 — predict. THE ONLY BLOCK THAT WITHHOLDS SOMETHING.

       renderCodeBlock is called with withOutput:false deliberately. That
       function paints an output pane directly under the code, which is the
       one thing this block exists to prevent. The answer is built alongside
       and hidden behind a class, so revealing is a class toggle rather than a
       re-render — which means a revealed block stays revealed through a
       filter change, and the reader does not lose their place. */
    function renderPredict(block) {
        var artefact = block.artefact || 'stdout';
        var verdict  = progressStore.verdictFor(block.id);

        var reveal =
            '<div class="predict-reveal">' +
                (typeof window.renderOutputPane === 'function'
                    ? window.renderOutputPane(block.output) : '') +
                (block.distractor
                    ? '<div class="predict-distractor">' + block.distractor + '</div>' : '') +
                (block.verification
                    ? '<div class="predict-verification">Checked against: ' +
                      esc(block.verification) + '</div>' : '') +
            '</div>';

        return '<div class="block block-predict' + (verdict !== 'unanswered' ? ' is-revealed' : '') +
               '" data-predict-id="' + esc(block.id) + '">' +
            '<div class="drill-head">' +
                '<span class="drill-title">Predict the output</span>' +
                '<span class="predict-artefact">' +
                    esc(ARTEFACT_LABEL[artefact] || artefact) + '</span>' +
            '</div>' +
            '<div class="predict-prompt">' + block.prompt + '</div>' +
            code({ language: block.language, title: block.title || 'Predict', code: block.code },
                 { withOutput: false }) +
            renderPredictOptions(block, verdict) +
            reveal +
        '</div>';
    }

    function renderPredictOptions(block, verdict) {
        if (!block.options || !block.options.length) return '';
        var done = verdict !== 'unanswered';
        return '<div class="predict-options">' +
            block.options.map(function (option, index) {
                /* On a re-render the chosen option is gone — the store
                   keeps the verdict, not the choice — so only the correct
                   one is marked. Live, bindPredict marks both. */
                var state = (done && index === block.answer) ? ' is-correct' : '';
                return '<button class="predict-option' + state + '" type="button" ' +
                       'data-index="' + index + '"' + (done ? ' disabled' : '') + '>' +
                    '<span class="predict-option-key">' +
                        String.fromCharCode(65 + index) + '</span>' +
                    '<span>' + esc(option) + '</span>' +
                '</button>';
            }).join('') +
        '</div>';
    }

    /* 12 — version. Backend truth is version-scoped, and a version claim
       written into prose is invisible to every validator and the most certain
       to become false. As a block it is greppable, countable, and
       validate-theory.js holds the list of modules that must carry one. */
    function renderVersion(block) {
        return '<div class="block block-version">' +
            '<div class="version-title">' + esc(block.title) + '</div>' +
            block.items.map(function (item) {
                return '<div class="version-item">' +
                    '<div class="version-label">' +
                        '<span class="version-name">' + esc(item.version) + '</span>' +
                        '<span class="version-state" data-state="' + esc(item.state) + '">' +
                            esc(item.state) + '</span>' +
                    '</div>' +
                    '<div>' + item.html + '</div>' +
                '</div>';
            }).join('') +
        '</div>';
    }

    /* ======================================================================
       Chapters and modules
       ====================================================================== */

    /* KEYED module:chapter, NEVER the bare chapter id.

       Chapter ids are unique WITHIN a module, which is what the validator
       enforces and all it can sensibly enforce — 'acid' belongs in
       transactions-and-isolation and nowhere else, but 'why-generics' and
       'records' are the kind of name two modules could reasonably both want.
       A bare key would silently mark one read when the reader read the other.
       This is the same reasoning that keys question progress topicId:questionId. */
    function chapterKey(moduleId, chapterId) {
        return String(moduleId) + ':' + String(chapterId);
    }

    function renderChapter(chapter, module) {
        var key  = chapterKey(module.id, chapter.id);
        var read = progressStore.isDone('theory', key);

        return '<article class="chapter" id="ch-' + esc(chapter.id) + '" ' +
                'data-chapter-id="' + esc(chapter.id) + '" ' +
                'data-tier="' + esc(chapter.importance) + '">' +
            '<div class="chapter-head">' +
                '<h2 class="chapter-title">' + esc(chapter.title) + '</h2>' +
                '<span class="tier-dot" data-tier="' + esc(chapter.importance) + '" ' +
                    'title="' + esc(TIER_LABEL[chapter.importance]) + '"></span>' +
            '</div>' +
            '<p class="chapter-summary">' + esc(chapter.summary) + '</p>' +
            '<div class="interview-angle">' +
                '<span class="interview-angle-label">Why this is asked</span>' +
                esc(chapter.interviewAngle) +
            '</div>' +
            chapter.blocks.map(renderBlock).join('') +
            renderDocs(chapter) +
            renderRelated(chapter) +
            '<div class="chapter-read">' +
                '<label class="progress-toggle">' +
                    '<input type="checkbox" data-chapter-key="' + esc(key) + '"' +
                        (read ? ' checked' : '') + '>' +
                    '<span>Read</span>' +
                '</label>' +
            '</div>' +
        '</article>';
    }

    function renderDocs(chapter) {
        var docs = chapter.docs || [];
        if (!docs.length) return '';
        return '<div class="block block-prose chapter-docs">' +
            '<span class="watch-for-label">Reference</span>' +
            '<ul>' + docs.map(function (doc) {
                return '<li><a href="' + esc(doc.url) + '" target="_blank" ' +
                       'rel="noopener noreferrer">' + esc(doc.title) + '</a>' +
                       (doc.kind ? ' <span class="doc-kind">' + esc(doc.kind) + '</span>' : '') +
                       '</li>';
            }).join('') + '</ul>' +
        '</div>';
    }

    /* The one link that crosses the two corpora. Built from resolved ids —
       validate-theory.js has already refused the build if any of them point
       at a question that is not there, so this renderer never has to consider
       the possibility of a dead link. */
    function renderRelated(chapter) {
        var related = chapter.relatedQuestions || [];
        if (!related.length) return '';
        return '<div class="block block-prose chapter-related">' +
            '<span class="watch-for-label">Asked as</span>' +
            '<ul>' + related.map(function (ref) {
                var topic = topicById(ref.topicId);
                var question = topic && topic.questions.filter(function (q) {
                    return q.id === ref.questionId;
                })[0];
                if (!question) return '';
                return '<li><a href="' +
                    router.href('questions', [ref.topicId, ref.questionId]) + '">' +
                    esc(question.question) + '</a></li>';
            }).join('') + '</ul>' +
        '</div>';
    }

    function renderModule(module) {
        var box = document.getElementById('topicContainer');
        if (!box) return;

        pendingDiagrams = [];

        var flags  = router.flags();
        var active = flags.tiers || TIERS.slice();
        var track  = (typeof trackById === 'function') ? trackById(module.trackId) : null;

        box.innerHTML =
            '<header class="topic-header"' +
                (track ? ' data-hue="' + esc(track.hue) + '"' : '') + '>' +
                '<div class="topic-eyebrow">' + esc(track ? track.title : 'Theory') + '</div>' +
                '<h1 class="topic-title">' + esc(module.title) + '</h1>' +
                '<p class="topic-meta">' + module.chapters.length + ' chapters &middot; ' +
                    'about ' + esc(module.estimatedMinutes) + ' minutes &middot; ' +
                    'number ' + esc(module.order) + ' in the reading path</p>' +
                '<p class="chapter-summary">' + esc(module.tagline) + '</p>' +
                renderPrereqs(module) +
            '</header>' +
            cramBanner(flags) +
            renderTierFilter(active) +
            module.chapters.map(function (chapter) {
                return renderChapter(chapter, module);
            }).join('');

        mountDiagrams();
        applyTierFilter(box, active);
        bindModule(box, module);
        updateModeHeader(module);
    }

    /* Prerequisites are rendered as links, not as decoration. They resolve to
       a lower order by validator rule, so every one of them is somewhere the
       reader could actually have been already. */
    function renderPrereqs(module) {
        var prereqs = (module.prerequisites || []).filter(function (id) {
            return typeof theoryByModuleId === 'object' && theoryByModuleId[id];
        });
        if (!prereqs.length) return '';
        return '<div class="module-prereqs"><span>Read first:</span>' +
            prereqs.map(function (id) {
                return '<a class="module-prereq" href="' + router.href('theory', [id]) + '">' +
                    esc(theoryByModuleId[id].title) + '</a>';
            }).join('') +
        '</div>';
    }

    /* The module index — what a reader sees at #theory with no module named.
       Grouped by track, in reading order, with each module's read count. This
       is the shape of the curriculum, and it is the thing the question bank
       cannot show you: what you do not yet know to look for. */
    function renderIndex() {
        var box = document.getElementById('topicContainer');
        if (!box) return;

        pendingDiagrams = [];

        var groups = (typeof subjectTracks === 'function' ? subjectTracks() : [])
            .map(function (track) {
                return { track: track, modules: modulesInTrack(track.id) };
            })
            .filter(function (group) { return group.modules.length > 0; });

        box.innerHTML =
            '<header class="topic-header">' +
                '<div class="topic-eyebrow">Theory</div>' +
                '<h1 class="topic-title">The reading path</h1>' +
                '<p class="topic-meta">' + theoryModules.length + ' modules &middot; ' +
                    countChapters() + ' chapters, in dependency order</p>' +
                '<p class="chapter-summary">One global order, not one per track. ' +
                    'The cross-track prerequisites are the whole reason the order exists: ' +
                    'you cannot teach transactional propagation before transactions, ' +
                    'and you cannot teach transactions before the container that manages them.</p>' +
            '</header>' +
            groups.map(renderTrackSection).join('');

        bindIndex(box);
        updateModeHeader(null);
    }

    function renderTrackSection(group) {
        return '<section class="track-section" data-hue="' + esc(group.track.hue) + '">' +
            '<div class="track-head">' +
                '<h2 class="track-title">' + esc(group.track.title) + '</h2>' +
                '<span class="track-meta">' + group.modules.length + ' modules</span>' +
            '</div>' +
            '<div class="module-grid">' +
                group.modules.map(renderModuleCard).join('') +
            '</div>' +
        '</section>';
    }

    function renderModuleCard(module) {
        var read  = readInModule(module);
        var total = module.chapters.length;
        var pct   = total ? Math.round((read / total) * 100) : 0;

        return '<a class="module-card" href="' + router.href('theory', [module.id]) + '">' +
            '<span class="module-order">' + esc(module.order) + '</span>' +
            '<span class="module-title">' + esc(module.title) + '</span>' +
            '<span class="module-tagline">' + esc(module.tagline) + '</span>' +
            '<span class="module-foot">' +
                '<span>' + read + '/' + total + '</span>' +
                '<span class="module-progress-bar">' +
                    '<span class="module-progress-fill" style="width:' + pct + '%"></span>' +
                '</span>' +
                '<span>' + esc(module.estimatedMinutes) + ' min</span>' +
            '</span>' +
        '</a>';
    }

    function countChapters() {
        return theoryModules.reduce(function (n, module) {
            return n + module.chapters.length;
        }, 0);
    }

    function readInModule(module) {
        var n = 0;
        module.chapters.forEach(function (chapter) {
            if (progressStore.isDone('theory', chapterKey(module.id, chapter.id))) n++;
        });
        return n;
    }

    /* ======================================================================
       The filter, shared in meaning with the question bank

       A chapter carries the same three tiers a question does and they mean
       the same thing, so ?tier= and ?cram filter both corpora with one
       vocabulary. A reader who cram-filters the questions and then switches
       to Theory should not have to learn a second filter.
       ====================================================================== */

    function renderTierFilter(active) {
        return '<div class="tier-filter" role="group" aria-label="Filter by importance">' +
            TIERS.map(function (tier) {
                return '<button class="tier-chip" type="button" data-tier="' + tier + '" ' +
                       'aria-pressed="' + (active.indexOf(tier) !== -1) + '">' +
                    '<span class="tier-dot" data-tier="' + tier + '"></span>' +
                    TIER_LABEL[tier] +
                '</button>';
            }).join('') +
        '</div>';
    }

    function cramBanner(flags) {
        return '<div class="cram-banner"' + (flags.cram ? '' : ' hidden') + '>' +
            '<span>Cram mode — must-know chapters only.</span>' +
            '<button type="button" data-action="exit-cram">Show everything</button>' +
        '</div>';
    }

    function applyTierFilter(box, active) {
        var shown = 0;
        box.querySelectorAll('.chapter').forEach(function (chapter) {
            var on = active.indexOf(chapter.getAttribute('data-tier')) !== -1;
            chapter.hidden = !on;
            if (on) shown++;
        });
        box.querySelectorAll('.tier-chip').forEach(function (chip) {
            chip.setAttribute('aria-pressed',
                String(active.indexOf(chip.getAttribute('data-tier')) !== -1));
        });

        var meta = document.getElementById('modeMeta');
        if (meta) {
            var total = box.querySelectorAll('.chapter').length;
            meta.textContent = shown === total
                ? total + ' chapters'
                : shown + ' of ' + total + ' shown';
        }
    }

    function mountDiagrams() {
        pendingDiagrams.forEach(function (item) {
            diagrams.mount(document.getElementById(item.slot), item.type, item.config);
        });
        pendingDiagrams = [];
    }

    /* ======================================================================
       Events
       ====================================================================== */

    function bindIndex(box) {
        box.querySelectorAll('.module-card').forEach(function (card) {
            card.addEventListener('click', function () { closeDrawer(); });
        });
    }

    function bindModule(box, module) {
        box.querySelectorAll('[data-chapter-key]').forEach(function (input) {
            input.addEventListener('change', function () {
                progressStore.toggleDone('theory', input.getAttribute('data-chapter-key'));
                updateModeHeader(module);
                refreshSidebarCounts();
            });
        });

        box.querySelectorAll('.tier-chip').forEach(function (chip) {
            chip.addEventListener('click', function () {
                var tier = chip.getAttribute('data-tier');
                var active = (router.flags().tiers || TIERS.slice()).slice();
                var at = active.indexOf(tier);
                if (at === -1) active.push(tier);
                else active.splice(at, 1);

                // Every chip off shows nothing at all, which is never what
                // anyone meant by clicking one. It reads as "all".
                if (!active.length) active = TIERS.slice();

                router.setTiers(active);
                applyTierFilter(box, active);
                syncCramBanner(box);
            });
        });

        var exit = box.querySelector('[data-action="exit-cram"]');
        if (exit) {
            exit.addEventListener('click', function () {
                router.setTiers(TIERS.slice());
                applyTierFilter(box, TIERS.slice());
                syncCramBanner(box);
            });
        }

        box.querySelectorAll('.block-predict').forEach(function (card) {
            bindPredict(card);
        });

        bindScrollSpy(box, module);
    }

    /* A verdict is EARNED, not self-reported: the reader commits to an option
       and the store records right or wrong. Three states, not two — a set of
       "seen" ids cannot distinguish "not attempted" from "attempted and got
       it wrong", and those are opposite signals about what to revise. */
    function bindPredict(card) {
        var id = card.getAttribute('data-predict-id');
        card.querySelectorAll('.predict-option').forEach(function (button) {
            button.addEventListener('click', function () {
                if (button.disabled) return;
                var chosen  = parseInt(button.getAttribute('data-index'), 10);
                var correct = chosen === currentAnswerIndex(id);

                progressStore.setVerdict(id, correct ? 'right' : 'wrong');
                card.classList.add('is-revealed');
                button.classList.add(correct ? 'is-correct' : 'is-wrong');

                card.querySelectorAll('.predict-option').forEach(function (other) {
                    other.disabled = true;
                    if (parseInt(other.getAttribute('data-index'), 10) === currentAnswerIndex(id)) {
                        other.classList.add('is-correct');
                    }
                });
                /* No header refresh here. A predict verdict changes the
                   PREDICT count, and the meter on screen in Theory mode
                   counts chapters read. The old call refreshed the theory
                   meter after answering a predict card, which repainted an
                   unrelated number. rail.js repaints the meter only when the
                   store that changed is the mode on screen. */
            });
        });
    }

    /* The answer index is read back out of the corpus rather than written
       into the markup, so a reader looking at the DOM does not find the
       answer sitting in an attribute next to the question. */
    function currentAnswerIndex(predictId) {
        var found = -1;
        theoryModules.forEach(function (module) {
            module.chapters.forEach(function (chapter) {
                chapter.blocks.forEach(function (block) {
                    if (block.type === 'predict' && block.id === predictId) found = block.answer;
                });
            });
        });
        return found;
    }

    function syncCramBanner(box) {
        var banner = box.querySelector('.cram-banner');
        if (banner) banner.hidden = !router.flags().cram;
    }

    /* RULE 2 OF navigation.js, APPLIED. Scrolling past a chapter updates the
       address bar so the link is always worth copying — but through
       replaceQuietly, which uses replaceState. Assigning location.hash here
       would turn one flick of the wheel into forty history entries and break
       the reader's Back button. Reading is not navigation. */
    var spy = null;

    function bindScrollSpy(box, module) {
        var chapters = [].slice.call(box.querySelectorAll('.chapter'));
        if (!chapters.length || !window.IntersectionObserver) return;

        if (spy) spy.disconnect();
        var current = null;

        spy = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                var id = entry.target.getAttribute('data-chapter-id');
                if (id === current) return;
                current = id;
                router.replaceQuietly('theory', [module.id, id]);
            });
        }, { rootMargin: '-30% 0px -60% 0px' });

        chapters.forEach(function (chapter) { spy.observe(chapter); });
    }

    function closeDrawer() {
        document.body.classList.remove('drawer-open');
        var hamburger = document.getElementById('hamburger');
        if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
    }

    /* ======================================================================
       The mode header and the sidebar

       ONE mode, ONE noun, ONE number. The bar is this module's read count
       over this module's chapters. Never a figure spanning modes, and never
       an average over the five — the five count five incompatible units and
       an average of them is a sixth number true of nothing.

       The rail meter used to be written here as well, in a copy of the one
       in app.js. rail.js owns it now.
       ====================================================================== */
    function updateModeHeader(module) {
        var title = document.getElementById('modeTitle');
        if (title) title.textContent = modeById.theory.title;

        var read  = module ? readInModule(module) : 0;
        var total = module ? module.chapters.length : 0;

        var fill = document.getElementById('modeProgressFill');
        if (fill) fill.style.width = (total ? Math.round((read / total) * 100) : 0) + '%';

        var text = document.getElementById('modeProgressText');
        if (text) text.textContent = total ? read + ' / ' + total : '';

        if (!module) {
            var meta = document.getElementById('modeMeta');
            if (meta) meta.textContent = theoryModules.length + ' modules';
        }
    }

    function renderSidebar(activeModuleId) {
        var nav = document.getElementById('sidebarNav');
        if (!nav) return;

        var groups = (typeof subjectTracks === 'function' ? subjectTracks() : [])
            .map(function (track) {
                return { track: track, modules: modulesInTrack(track.id) };
            })
            .filter(function (group) { return group.modules.length > 0; });

        nav.innerHTML =
            '<div class="sidebar-section">' +
                '<a class="sidebar-link' + (activeModuleId ? '' : ' is-active') + '" href="#theory">' +
                    '<span class="sidebar-link-title">The reading path</span>' +
                '</a>' +
            '</div>' +
            groups.map(function (group) {
                return '<div class="sidebar-section" data-hue="' + esc(group.track.hue) + '">' +
                    '<div class="sidebar-section-label">' + esc(group.track.title) + '</div>' +
                    group.modules.map(function (module) {
                        return '<a class="sidebar-link' +
                               (module.id === activeModuleId ? ' is-active' : '') +
                               '" href="' + router.href('theory', [module.id]) + '" ' +
                               'data-module-id="' + esc(module.id) + '">' +
                            '<span class="sidebar-link-title">' + esc(module.title) + '</span>' +
                            '<span class="sidebar-count">' + readInModule(module) + '/' +
                                module.chapters.length + '</span>' +
                        '</a>';
                    }).join('') +
                '</div>';
            }).join('');

        nav.querySelectorAll('.sidebar-link').forEach(function (link) {
            link.addEventListener('click', function () { closeDrawer(); });
        });
    }

    /* Counts updated in place rather than by re-rendering the sidebar.
       Re-rendering would rebuild every link and rebind every handler to
       change two digits, and would throw away the drawer's scroll position
       on a phone. */
    function refreshSidebarCounts() {
        var nav = document.getElementById('sidebarNav');
        if (!nav) return;
        nav.querySelectorAll('[data-module-id]').forEach(function (link) {
            var module = theoryByModuleId[link.getAttribute('data-module-id')];
            var count  = link.querySelector('.sidebar-count');
            if (module && count) {
                count.textContent = readInModule(module) + '/' + module.chapters.length;
            }
        });
    }

    /* ======================================================================
       Route handler

           #theory                        the reading path
           #theory/<module>               a module, every chapter
           #theory/<module>/<chapter>     the same, scrolled to one chapter
       ====================================================================== */
    function handleTheory(route) {
        var moduleId = route.segments[0];

        if (!theoryModules.length) {
            renderSidebar(null);
            document.getElementById('topicContainer').innerHTML =
                '<div class="empty-state"><h2>Nothing here yet</h2>' +
                '<p>The reading path arrives with the theory corpus.</p></div>';
            updateModeHeader(null);
            return;
        }

        if (!moduleId) {
            renderSidebar(null);
            renderIndex();
            window.scrollTo({ top: 0 });
            return;
        }

        var module = theoryByModuleId[moduleId];
        if (!module) {
            renderSidebar(null);
            document.getElementById('topicContainer').innerHTML =
                '<div class="empty-state"><h2>No such module</h2>' +
                '<p>That link points at a module this deck does not have. ' +
                'Pick one from the reading path.</p></div>';
            updateModeHeader(null);
            return;
        }

        renderSidebar(module.id);
        renderModule(module);

        var chapterId = route.segments[1];
        if (chapterId) {
            var target = document.querySelector('.chapter[data-chapter-id="' +
                                                cssEscape(chapterId) + '"]');
            if (target) {
                /* THE DEEP LINK WINS OVER THE FILTER, exactly as it does in
                   the question bank. Both halves of the address are
                   shareable and they can disagree: ?tier=must-know names a
                   filter and the fragment names one chapter, which may be a
                   should-know. A shared link that resolves to a blank screen
                   with nothing indicating anything was suppressed is the
                   worst of the available behaviours. */
                if (target.hidden) {
                    var active = (router.flags().tiers || TIERS.slice()).slice();
                    var tier = target.getAttribute('data-tier');
                    if (active.indexOf(tier) === -1) {
                        active.push(tier);
                        router.setTiers(active);
                        applyTierFilter(document.getElementById('topicContainer'), active);
                    }
                }
                target.scrollIntoView({ block: 'start', behavior: 'smooth' });
                return;
            }
        }

        window.scrollTo({ top: 0 });
    }

    function cssEscape(value) {
        if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(value);
        return String(value).replace(/["\\\]\[]/g, '\\$&');
    }

    /* Registered here, at parse time, rather than from initApp(). See the
       header: this is what makes a mode a file plus a script tag. */
    router.register('theory', handleTheory);

    progressStore.subscribe(function (mode) {
        if (mode === 'theory' && document.documentElement.dataset.mode === 'theory') {
            refreshSidebarCounts();
        }
    });

    /* Exported for Phase 4. glossary.js harvests every definition block and
       synthesis.js and predict.js reuse these two renderers verbatim, so a
       drill looks the same wherever it is read from. */
    window.renderBlock       = renderBlock;
    window.renderDrillBlock  = renderDrill;
    window.renderPredictBlock = renderPredict;
    window.theoryChapterKey  = chapterKey;
})();
