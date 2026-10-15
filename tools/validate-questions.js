#!/usr/bin/env node
/* ==========================================================================
   validate-questions.js — the question bank

   Seven checks. Each exists to stop one specific bad outcome, and each is
   scoped tightly enough to be believed: a validator that cries wolf gets
   switched off, at which point it catches nothing at all.

   Written in Phase 1 against three placeholder questions, deliberately, so
   that it is proven before it guards several hundred.

     1  every question carries an importance from TIERS
     2  ids are unique within a topic, and any cross-topic collision is
        ASSERTED as the complete list
     3  every must-know question carries at least one referenceLink
     4  images[] paths are repo-relative and on disk; alt is real; attribution
        is present
     5  output.kind is stdout or trace, and stdout is REFUSED for any language
        the runner cannot execute
     6  snippet languages are ones the highlighter knows
     7  authored HTML stays inside the allowed tag subset
   ========================================================================== */

'use strict';

const fs   = require('fs');
const path = require('path');
const { loadCorpus, ROOT } = require('./load-corpus');
const {
    TIERS, LANGUAGES, RUNNABLE_LANGUAGES, DIAGRAM_TYPES, OUTPUT_KINDS,
    ALLOWED_TAGS, KEBAB, RESERVED_SEGMENTS, htmlIssues, checkDiagram, makeReport,
    existsCaseExact
} = require('./schema');

/* -----------------------------------------------------------------------
   CHECK 2's second half.

   A bare "ids must be unique across all topics" check would have to be
   switched off the moment a real collision appeared — and a switched-off
   check catches nothing. So known collisions are ASSERTED here as the
   complete list. A new collision fails. A listed collision that no longer
   exists ALSO fails, because a stale exemption is an exemption nobody is
   watching.
   ----------------------------------------------------------------------- */
const KNOWN_CROSS_TOPIC_COLLISIONS = [];

function run() {
    const report = makeReport('validate-questions');
    const corpus = loadCorpus({ quiet: true });
    const topics = corpus.topics || [];

    if (!topics.length) {
        console.log('validate-questions: no topics loaded — check index.html');
        process.exit(1);
    }

    /* The language list itself. Java is the only backend language in this
       deck, and this is where that is enforced rather than merely intended. */
    const declared = corpus.languages || [];
    declared.forEach(lang => {
        if (!LANGUAGES.includes(lang)) {
            report.error(`data/index.js declares language "${lang}", which schema.js does not know`);
        }
    });
    LANGUAGES.forEach(lang => {
        if (!declared.includes(lang)) {
            report.error(`schema.js knows language "${lang}" but data/index.js does not declare it`);
        }
    });

    const seenIds = new Map();     // questionId -> [topicId, ...]
    let questionCount = 0;
    let mustCount = 0;

    topics.forEach(topic => {
        const where = `topic "${topic.id}"`;

        if (!KEBAB.test(topic.id)) {
            report.error(`${where}: id is not kebab-case`);
        }
        if (RESERVED_SEGMENTS.includes(topic.id)) {
            report.error(`${where}: id collides with a reserved route segment`);
        }
        if (!Array.isArray(topic.keyTopics) || !topic.keyTopics.length) {
            report.error(`${where}: keyTopics is empty — the topic claims to cover nothing`);
        }
        if (topic.subsections !== null && !Array.isArray(topic.subsections)) {
            report.error(`${where}: subsections must be an array or an explicit null`);
        }

        const subsectionIds = (topic.subsections || []).map(s => s.id);
        const localIds = new Set();

        topic.questions.forEach((question, index) => {
            questionCount++;
            const q = `${topic.id}#${question.id || '(index ' + index + ')'}`;

            /* ---- 1. importance ------------------------------------------
               Stored, never derived. A tier computed from the theory chapters
               that link a question could not be overridden, and a question
               with no theory link at all would silently get none. */
            if (!TIERS.includes(question.importance)) {
                report.error(`${q}: importance "${question.importance}" is not one of ${TIERS.join(', ')}`);
            }
            if (question.importance === 'must-know') mustCount++;

            /* ---- 2. ids ------------------------------------------------- */
            if (!question.id || !KEBAB.test(question.id)) {
                report.error(`${q}: id is missing or not kebab-case`);
            }
            if (localIds.has(question.id)) {
                report.error(`${q}: duplicate id within its own topic`);
            }
            localIds.add(question.id);

            /* Record the TOPIC, not the occurrence. Without the guard an
               id duplicated twice inside one topic is also reported as a
               cross-topic collision against itself, which sends the reader
               looking for a second topic that does not exist. */
            if (!seenIds.has(question.id)) seenIds.set(question.id, new Set());
            seenIds.get(question.id).add(topic.id);

            if (typeof question.question !== 'string' || !question.question.trim()) {
                report.error(`${q}: question text is empty`);
            }
            /* Question text is rendered through escapeHtml, so markup in it
               shows up literally instead of as formatting. This catches an
               author who wrote <code> in a question the way they would in an
               answer.

               It does NOT reject every angle bracket, which is what it did
               until the Java topic was authored against it. "List<String>",
               "Map<K, V>" and "List<?>" are ordinary prose in a Java deck,
               and a check that forbade them would be a check authors route
               around by rephrasing questions worse — which is how a validator
               ends up making the corpus worse than no validator would.

               So it looks for an ALLOWED TAG NAME specifically. Those are the
               tags an author writes by habit; a generic type argument is
               never one of them. Note this is a presentation check and not a
               security one: escapeHtml already makes anything in this field
               inert. */
            const strayTag = new RegExp(
                '<\\/?(' + ALLOWED_TAGS.join('|') + ')(\\s[^<>]*)?\\/?>', 'i'
            );
            if (strayTag.test(question.question || '')) {
                report.error(`${q}: question text must be plain, with no markup`);
            }

            /* ---- 3. reference links -------------------------------------
               Mirrors the rule theory applies to must-know chapters. A
               question worth revising the night before is worth being able to
               check. */
            const links = question.referenceLinks || [];
            if (question.importance === 'must-know' && !links.length) {
                report.error(`${q}: must-know with no referenceLinks`);
            }
            links.forEach(link => {
                if (!link.title || !link.url) {
                    report.error(`${q}: a referenceLink is missing a title or a url`);
                } else if (!/^https:\/\//.test(link.url)) {
                    report.error(`${q}: referenceLink "${link.title}" is not https`);
                }
            });

            /* ---- 4. images ----------------------------------------------
               Structured data rather than <img> in the answer string, which is
               the ONLY reason a validator can check the path and the
               attribution at all. Attribution is a licence condition, so its
               absence is an error and never a warning. */
            (question.images || []).forEach(image => {
                if (!image.src || path.isAbsolute(image.src) || image.src.startsWith('http')) {
                    report.error(`${q}: image src "${image.src}" is not repo-relative`);
                } else {
                    /* Case-exact, not existsSync. See existsCaseExact in
                       schema.js — a case-only mismatch passes on the machine
                       this deck is built on and 404s on the one it is served
                       from. */
                    const found = existsCaseExact(ROOT, image.src);
                    if (found === 'missing') {
                        report.error(`${q}: image "${image.src}" is not on disk`);
                    } else if (found === 'case') {
                        report.error(
                            `${q}: image "${image.src}" differs in case from the file on ` +
                            `disk. This works on macOS and 404s on Linux.`
                        );
                    }
                }
                if (!image.alt || image.alt.length <= 20) {
                    report.error(`${q}: image alt text is missing or under 21 characters`);
                }
                if (!image.sourceTitle || !image.sourceUrl) {
                    report.error(`${q}: image is missing sourceTitle or sourceUrl — attribution is a licence condition`);
                }
                if (image.caption) {
                    htmlIssues(image.caption, `${q} image caption`).forEach(i => report.error(i));
                }
            });

            /* ---- 5 & 6. code snippets ----------------------------------- */
            (question.codeSnippets || []).forEach(snippet => {
                if (!LANGUAGES.includes(snippet.language)) {
                    report.error(`${q}: snippet language "${snippet.language}" is not one the highlighter knows`);
                }
                if (!snippet.title || !snippet.code) {
                    report.error(`${q}: snippet is missing a title or its code`);
                }

                if (snippet.output) {
                    const kind = snippet.output.kind;
                    if (!OUTPUT_KINDS.includes(kind)) {
                        report.error(`${q}: output.kind "${kind}" is not stdout or trace`);
                    }
                    /* THE CHECK THAT MATTERS MOST IN THIS FILE.
                       Printing a fabricated "Output:" over code that cannot be
                       run teaches something false, which is worse than showing
                       nothing. A language the runner cannot execute may not
                       claim stdout. */
                    if (kind === 'stdout' && !RUNNABLE_LANGUAGES.includes(snippet.language)) {
                        report.error(
                            `${q}: snippet claims stdout for "${snippet.language}", which ` +
                            `run-snippets.js cannot execute — use kind:'trace'`
                        );
                    }
                    if (!Array.isArray(snippet.output.lines) || !snippet.output.lines.length) {
                        report.error(`${q}: output.lines is empty`);
                    }
                    if (snippet.output.explain) {
                        htmlIssues(snippet.output.explain, `${q} output.explain`).forEach(i => report.error(i));
                    }
                }
            });

            /* ---- diagrams ------------------------------------------------ */
            if (question.hasDiagram) {
                if (!DIAGRAM_TYPES.includes(question.diagramType)) {
                    report.error(`${q}: hasDiagram is true but diagramType "${question.diagramType}" is unknown`);
                } else {
                    checkDiagram(report, q, question.diagramType, question.diagramConfig);
                }
            }

            /* ---- 7. authored HTML ---------------------------------------- */
            htmlIssues(question.answer, `${q} answer`).forEach(i => report.error(i));

            /* ---- subsection resolution ----------------------------------- */
            if (question.subsection && !subsectionIds.includes(question.subsection)) {
                report.warn(`${q}: subsection "${question.subsection}" is not declared — it will fall into the More bucket`);
            }
            if (!question.subsection && subsectionIds.length) {
                report.warn(`${q}: topic has subsections but this question declares none`);
            }
        });
    });

    /* ---- 2, second half: the collision assertion ---------------------- */
    const actual = [];
    seenIds.forEach((topicSet, id) => {
        if (topicSet.size > 1) actual.push(id);
    });

    actual.forEach(id => {
        if (!KNOWN_CROSS_TOPIC_COLLISIONS.includes(id)) {
            report.error(
                `question id "${id}" appears in ${[...seenIds.get(id)].join(', ')} — ` +
                `either rename it or add it to KNOWN_CROSS_TOPIC_COLLISIONS`
            );
        }
    });
    KNOWN_CROSS_TOPIC_COLLISIONS.forEach(id => {
        if (!actual.includes(id)) {
            report.error(
                `"${id}" is listed as a known cross-topic collision but no longer collides — ` +
                `remove it. A stale exemption is an exemption nobody is watching.`
            );
        }
    });

    report.finish(
        `${topics.length} topic(s), ${questionCount} question(s), ${mustCount} must-know`
    );
}

run();
