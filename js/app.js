/* ==========================================================================
   app.js — initApp + renderTopic. THIS FILE MUST BE LAST.

   Everything above it in index.html has defined a global and done nothing.
   This is the file that starts the application, which is why it loads after
   every other one and why the forward references in those files are safe.

   PHASE 0 SCOPE. Right now this renders the placeholder topic and nothing
   else: there is no routing, no sidebar, no rail, no progress and no search,
   because none of those files exist yet. Phase 2 replaces the body of
   renderTopic() with the real one and hands routing to navigation.js.

   What is here now is deliberately the smallest thing that makes the Phase 0
   gate — "the page renders in both themes" — a check worth running.
   ========================================================================== */

(function () {
    'use strict';

    /* ---- HTML escaping ---------------------------------------------------
       Authored content is injected with innerHTML, and that is safe only
       because the data files are part of the repository and the validators
       restrict authored HTML to a fixed tag subset. Anything NOT authored —
       a title, a code snippet, a tag — goes through textContent or through
       this function instead. The distinction is the whole security posture.
       -------------------------------------------------------------------- */
    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    var TIER_LABEL = {
        'must-know':    'Must know',
        'should-know':  'Should know',
        'good-to-know': 'Good to know'
    };

    /* ---- Code block ------------------------------------------------------
       A plain, unhighlighted rendering. code-highlight.js arrives in Phase 2
       and replaces the <code> contents with tokenised spans; the frame, the
       gutter and the output pane are already their final shape so that the
       stylesheet is exercised now rather than in three weeks.
       -------------------------------------------------------------------- */
    function renderCodeBlock(snippet, options) {
        var withOutput = !options || options.withOutput !== false;
        var lines = snippet.code.split('\n');

        var gutter = lines.map(function (_, i) { return i + 1; }).join('\n');

        var html =
            '<div class="code-block">' +
                '<div class="code-head">' +
                    '<span class="code-title">' + escapeHtml(snippet.title) + '</span>' +
                    '<span class="code-lang">' + escapeHtml(snippet.language) + '</span>' +
                '</div>' +
                '<div class="code-body">' +
                    '<pre class="code-gutter" aria-hidden="true">' + gutter + '</pre>' +
                    '<pre class="code-source"><code>' + escapeHtml(snippet.code) + '</code></pre>' +
                '</div>';

        /* The `predict` block type calls this with withOutput:false, because
           painting an output pane under the code is the one thing that block
           exists to prevent. */
        if (withOutput && snippet.output) {
            html += renderOutputPane(snippet.output);
        }

        return html + '</div>';
    }

    /* stdout is literal console text and is re-executed by run-snippets.js.
       trace is prose about behaviour and is rendered as a numbered list and
       labelled as such. They never share a presentation, because printing a
       fabricated "Output" over code that cannot be run teaches something
       false — which is worse than showing nothing. */
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

    /* ---- Question card ---------------------------------------------------
       Rendered COLLAPSED. The answer, the code blocks and the diagram
       containers are all built up front — only a diagram's SVG is deferred,
       so its container has been laid out before anything measures it.
       -------------------------------------------------------------------- */
    function renderQuestionCard(question, number, topicId) {
        var domId = 'q-' + topicId + '-' + question.id;

        var snippets = (question.codeSnippets || []).map(function (snippet) {
            return renderCodeBlock(snippet);
        }).join('');

        var tags = (question.tags || []).length
            ? '<div class="question-tags">' + question.tags.map(function (tag) {
                  return '<span class="question-tag">' + escapeHtml(tag) + '</span>';
              }).join('') + '</div>'
            : '';

        var links = (question.referenceLinks || []).length
            ? '<ul>' + question.referenceLinks.map(function (link) {
                  return '<li><a href="' + escapeHtml(link.url) + '" target="_blank" rel="noopener noreferrer">' +
                         escapeHtml(link.title) + '</a></li>';
              }).join('') + '</ul>'
            : '';

        return '' +
        '<article class="question-card" data-question-id="' + escapeHtml(question.id) + '" data-tier="' + escapeHtml(question.importance) + '">' +
            '<button class="question-head" type="button" aria-expanded="false" aria-controls="' + domId + '">' +
                // The number is stable under filtering. Card 3 is card 3 whether
                // or not cards 1 and 2 are hidden: the number is an identifier
                // people cite, and renumbering per-filter makes every such
                // reference ambiguous.
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
                snippets +
                (links ? '<div class="answer"><p><strong>Reference</strong></p>' + links + '</div>' : '') +
                tags +
            '</div>' +
        '</article>';
    }

    /* aria-expanded and hidden are kept in step on every card, so a screen
       reader announces the state rather than reading collapsed answers aloud. */
    function bindCards(container) {
        container.querySelectorAll('.question-head').forEach(function (head) {
            head.addEventListener('click', function () {
                var card = head.closest('.question-card');
                var body = document.getElementById(head.getAttribute('aria-controls'));
                var open = card.classList.toggle('is-open');
                head.setAttribute('aria-expanded', String(open));
                if (body) body.hidden = !open;
            });
        });
    }

    function renderTopic(topic) {
        var container = document.getElementById('topicContainer');
        if (!container || !topic) return;

        var cards = topic.questions.map(function (question, index) {
            return renderQuestionCard(question, index + 1, topic.id);
        }).join('');

        container.innerHTML =
            '<header class="topic-header">' +
                '<div class="topic-eyebrow">Questions</div>' +
                '<h1 class="topic-title">' + escapeHtml(topic.title) + '</h1>' +
                '<p class="topic-meta">' + topic.questions.length + ' questions</p>' +
                ((topic.keyTopics || []).length
                    ? '<div class="key-topics">' + topic.keyTopics.map(function (key) {
                          return '<span class="key-topic">' + escapeHtml(key) + '</span>';
                      }).join('') + '</div>'
                    : '') +
            '</header>' +
            cards;

        bindCards(container);
    }

    function initApp() {
        if (typeof initTheme === 'function') initTheme();
        if (typeof initBackground === 'function') initBackground();

        // Back to top. Cheap, and it works before there is any routing.
        var backToTop = document.getElementById('backToTop');
        if (backToTop) {
            backToTop.addEventListener('click', function () {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
            window.addEventListener('scroll', function () {
                backToTop.classList.toggle('is-visible', window.scrollY > 400);
            }, { passive: true });
        }

        renderTopic(topics[0]);
    }

    /* Exported for the files that arrive in later phases. */
    window.escapeHtml      = escapeHtml;
    window.renderCodeBlock = renderCodeBlock;
    window.renderTopic     = renderTopic;
    window.initApp         = initApp;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp();
    }
})();
