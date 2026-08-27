#!/usr/bin/env node
/* ==========================================================================
   validate-theory.js — the theory corpus, and its two edges

   Ten checks. The question bank's validator guards one corpus; this one
   guards a corpus AND the two places it touches something outside itself —
   the question bank, through relatedQuestions, and the reading path, through
   prerequisites. Those two are the checks worth having. The rest are shape.

   Written before the first module exists, deliberately, for the same reason
   validate-questions.js was: a validator authored after the content it
   guards is written to agree with that content.

     1  module shape: kebab id, unique, not reserved; trackId resolves to a
        SUBJECT track; order is a unique positive integer
     2  prerequisites resolve, AND to a STRICTLY LOWER order
     3  chapter shape: kebab id unique within the module; importance from
        TIERS; summary and interviewAngle present; buildsOn resolves to an
        EARLIER chapter of the same module
     4  every must-know chapter carries at least one docs[] entry, and a
        docs entry is a full https URL
     5  block shapes, all twelve of them
     6  snippet languages are ones the highlighter knows, and stdout is
        REFUSED for any language the runner cannot execute
     7  a predict block whose artefact is not stdout must be trace AND must
        say how its answer was established
     8  relatedQuestions resolve against the question bank
     9  the drill catalogue and the predict-set catalogue are HELD HERE
    10  the modules that must carry a version block do carry one

   Warnings never fail a run. They are meant to be READ, which is why the
   three families that are legitimately loud for most of the build are
   summarised to a count and listed only under --verbose.
   ========================================================================== */

'use strict';

const { loadCorpus } = require('./load-corpus');
const {
    TIERS, LANGUAGES, RUNNABLE_LANGUAGES, DIAGRAM_TYPES, OUTPUT_KINDS,
    PREDICT_ARTEFACTS, VERSION_STATES, BLOCK_TYPES, KEBAB, RESERVED_SEGMENTS,
    htmlIssues, makeReport
} = require('./schema');

/* --------------------------------------------------------------------------
   THREE FAMILIES OF WARNING ARE EXPECTED TO BE LOUD FOR MOST OF THE BUILD,
   AND THAT IS WHY THEY ARE COUNTED RATHER THAN LISTED.

   Forty-six catalogued drills, eleven predict sets and several hundred
   keyTopics are all legitimately unwritten until the phase that writes them.
   Enumerating every one of them prints a hundred and seventy lines over a
   corpus of four chapters, and a hundred and seventy warnings is not a
   warning — it is a wall, and the two lines in it that matter (a duplicate
   glossary term, a prerequisite that does not resolve) are invisible inside
   it. A validator nobody reads catches nothing, which is the same failure as
   a validator nobody runs.

   So an expected absence is summarised to one line with a count, and --verbose
   prints the list when someone actually wants to work through it.
   -------------------------------------------------------------------------- */
const VERBOSE = process.argv.includes('--verbose');

function warnMany(report, items, summary) {
    if (!items.length) return;
    if (VERBOSE) {
        items.forEach(item => report.warn(item));
        return;
    }
    report.warn(`${items.length} ${summary} — run with --verbose to list them`);
}

/* --------------------------------------------------------------------------
   CHECK 9. THE CATALOGUES LIVE HERE, NOT IN THE CORPUS.

   Derived totals are worthless as a check. If the drill count is whatever the
   corpus happens to contain, then deleting a drill makes the number smaller
   and nothing at all goes wrong — which is exactly the failure a validator is
   for. So the catalogue is written down, once, from the plan, and:

     an id outside this list          -> error   (invented while authoring)
     an id in this list twice         -> error   (copy-paste)
     an id in this list and unwritten -> warning (not authored yet)

   Adding a drill means adding it here FIRST. That friction is the feature.
   Transcribed from SPRINGDECK-PLAN.md Part 6; tier is carried so a drill
   cannot quietly change weight either.
   -------------------------------------------------------------------------- */
const DRILL_CATALOGUE = {
    // 6.1 Tier 1 — machine coding builds
    'drill-splitwise-expense-api': 1,
    'drill-parking-lot-service': 1,
    'drill-movie-ticket-booking': 1,
    'drill-inventory-reservation': 1,
    'drill-url-shortener-service': 1,
    'drill-in-memory-kv-with-ttl': 1,
    'drill-lru-cache-custom-eviction': 1,
    'drill-ride-matching-service': 1,
    // 6.2 Tier 2 — HLD design exercises
    'drill-design-url-shortener-at-scale': 2,
    'drill-design-rate-limiter-distributed': 2,
    'drill-design-notification-service': 2,
    'drill-design-payment-ledger': 2,
    'drill-design-job-scheduler': 2,
    'drill-design-order-fulfilment-saga': 2,
    'drill-design-audit-log': 2,
    'drill-design-multi-tenant-saas-api': 2,
    'drill-design-file-upload-and-processing': 2,
    'drill-design-search-and-autocomplete': 2,
    'drill-design-cqrs-read-model': 2,
    'drill-design-a-service-decomposition': 2,
    // 6.3 Tier 3 — focused implementation
    'drill-controlleradvice-error-shape': 3,
    'drill-custom-bean-validator': 3,
    'drill-http-client-with-timeout-retry': 3,
    'drill-idempotency-key-filter': 3,
    'drill-testcontainers-integration-test': 3,
    'drill-flyway-non-null-column-live': 3,
    'drill-custom-health-indicator': 3,
    'drill-correlation-id-interceptor': 3,
    'drill-kafka-consumer-with-dlq': 3,
    'drill-cache-aside-with-stampede-guard': 3,
    'drill-jwt-resource-server-config': 3,
    'drill-pagination-with-join-fetch': 3,
    'drill-grpc-service-from-a-proto': 3,
    'drill-mongo-document-model': 3,
    'drill-hexagonal-slice-of-a-feature': 3,
    // 6.4 Tier 4 — debug, review, extend
    'drill-debug-connection-pool-exhaustion': 4,
    'drill-find-the-n-plus-one': 4,
    'drill-review-a-controller': 4,
    'drill-diagnose-from-heap-histogram': 4,
    'drill-fix-broken-transactional': 4,
    'drill-read-an-explain-plan': 4,
    'drill-kafka-rebalance-storm': 4,
    'drill-explain-your-own-architecture': 4,
    'drill-resolve-a-dependency-conflict': 4,
    'drill-refactor-a-god-service': 4,
    'drill-fix-a-serialization-break': 4
};

/* The five things a tier-1 drill loses marks for are the same five every
   time, and Part 6.1 requires them verbatim. Verbatim matters: a reader who
   meets "Business rules in the controller" in one drill and "Logic in the
   controller layer" in the next reads two lessons where there is one. */
const TIER_1_WATCH_FOR = [
    'No interface for the thing that will vary',
    'Business rules inside the controller',
    'Concurrency ignored on the one operation that has contention',
    'No test or driver — the interviewer cannot see it work',
    'Ran out of time because the schema was designed for ten minutes'
];

/* The eleven predict sets from Part 7. A predict id must begin with one of
   these, so a stray puzzle cannot land outside every set and go uncounted.
   The set names are held rather than the individual ids because Part 7
   enumerates sets; the ids arrive with the puzzles in Phases 4 and 8. */
const PREDICT_SETS = [
    'predict-java-core', 'predict-collections', 'predict-streams',
    'predict-concurrency', 'predict-io-and-time', 'predict-spring',
    'predict-jpa', 'predict-sql', 'predict-http-security', 'predict-kafka',
    'predict-build-and-config'
];

/* --------------------------------------------------------------------------
   CHECK 10. Where a version claim is mandatory.

   Backend truth is version-scoped and the claim most certain to rot. Part 5.2
   names the places where the drift IS the subject, so the block is required
   rather than encouraged — a refresh that updates the prose and forgets the
   block leaves the deck confidently wrong.
   -------------------------------------------------------------------------- */
const VERSION_BLOCK_MODULES  = ['modern-java', 'virtual-threads', 'spring-generations'];
const VERSION_EVERY_CHAPTER  = ['spring-generations'];

/* The four block fields that carry authored HTML, by block type. Kept as one
   table so a new block type declares its HTML surface in the same place it
   declares its shape, rather than quietly bypassing the tag check. */
const HTML_FIELDS = {
    prose:      ['html'],
    definition: ['html'],
    pitfall:    ['html'],
    tip:        ['html'],
    drill:      ['prompt'],
    predict:    ['prompt', 'distractor']
};

function run() {
    const report  = makeReport('validate-theory');
    const corpus  = loadCorpus({ quiet: true });
    const modules = corpus.theoryModules || [];
    const topics  = corpus.topics || [];

    /* An empty corpus is legal exactly once — during the commit that adds
       this file, before the first module exists. It is reported rather than
       passed silently, because "validator green" over nothing is the most
       comfortable lie a build can tell. */
    if (!modules.length) {
        console.log('validate-theory: no theory modules loaded yet — nothing to check\n');
        return;
    }

    const trackIds = new Set(
        (typeof corpus.subjectTracks === 'function' ? corpus.subjectTracks() : [])
            .map(t => t.id)
    );

    /* The question bank, flattened once, for check 8. */
    const questionIds = new Set();
    topics.forEach(topic => {
        (topic.questions || []).forEach(q => questionIds.add(topic.id + ':' + q.id));
    });

    const seenModuleIds = new Set();
    const seenOrders    = new Map();
    const orderOf       = new Map();
    const drillsSeen    = new Map();   // id -> where
    const predictsSeen  = new Map();
    const termsSeen     = new Map();   // glossary terms, harvested
    let chapterCount = 0;
    let blockCount   = 0;

    modules.forEach(module => { orderOf.set(module.id, module.order); });

    modules.forEach(module => {
        const m = `theory/${module.id}`;

        /* ---- CHECK 1 — module shape ---------------------------------- */
        if (!KEBAB.test(module.id || '')) {
            report.error(`${m}: id is missing or not kebab-case`);
        }
        if (RESERVED_SEGMENTS.includes(module.id)) {
            report.error(`${m}: id collides with a reserved route segment`);
        }
        if (seenModuleIds.has(module.id)) {
            report.error(`${m}: duplicate module id`);
        }
        seenModuleIds.add(module.id);

        if (!trackIds.has(module.trackId)) {
            report.error(`${m}: trackId "${module.trackId}" is not a subject track`);
        }
        if (!Number.isInteger(module.order) || module.order < 1) {
            report.error(`${m}: order must be a positive integer, got ${module.order}`);
        } else if (seenOrders.has(module.order)) {
            report.error(`${m}: order ${module.order} is already taken by ${seenOrders.get(module.order)}`);
        } else {
            seenOrders.set(module.order, module.id);
        }
        if (!module.title || !module.tagline) {
            report.error(`${m}: a module needs a title and a tagline`);
        }
        if (!Number.isInteger(module.estimatedMinutes) || module.estimatedMinutes < 5) {
            report.error(`${m}: estimatedMinutes is missing or implausible`);
        }
        if (module.docHub && (!module.docHub.title || !module.docHub.url)) {
            report.error(`${m}: docHub needs both a title and a url`);
        }

        /* ---- CHECK 2 — prerequisites resolve, and DOWNWARDS -----------
           The reading path can then never ask for knowledge it has not
           taught. This is the check that makes `order` mean something. */
        if (!Array.isArray(module.prerequisites)) {
            report.error(`${m}: prerequisites must be an array, empty if there are none`);
        } else {
            module.prerequisites.forEach(prereq => {
                if (!orderOf.has(prereq)) {
                    /* Tracks 5-8 arrive in Phase 7. A prerequisite naming a
                       module that is planned but unwritten is a warning, not
                       an error — but only downwards-resolving ones can be
                       forgiven, and an unwritten module has no order to
                       compare, so it is called out either way. */
                    report.warn(`${m}: prerequisite "${prereq}" is not in the corpus yet`);
                    return;
                }
                if (orderOf.get(prereq) >= module.order) {
                    report.error(
                        `${m}: prerequisite "${prereq}" has order ${orderOf.get(prereq)}, ` +
                        `which is not below ${module.order} — the path teaches it too late`
                    );
                }
            });
        }

        /* ---- Chapters ------------------------------------------------- */
        const chapters = module.chapters || [];
        if (!chapters.length) {
            report.error(`${m}: a module with no chapters`);
        }

        const seenChapterIds = new Set();
        let moduleHasVersionBlock = false;

        chapters.forEach((chapter, index) => {
            const c = `${m}/${chapter.id}`;
            chapterCount++;

            /* ---- CHECK 3 — chapter shape ------------------------------ */
            if (!KEBAB.test(chapter.id || '')) {
                report.error(`${c}: id is missing or not kebab-case`);
            }
            if (seenChapterIds.has(chapter.id)) {
                report.error(`${c}: duplicate chapter id within its module`);
            }
            seenChapterIds.add(chapter.id);

            if (!chapter.title) report.error(`${c}: no title`);
            if (TIERS.indexOf(chapter.importance) === -1) {
                report.error(`${c}: importance "${chapter.importance}" is not one of ${TIERS.join(', ')}`);
            }
            if (!chapter.summary) {
                report.error(`${c}: no summary — the sidebar and the search result both read it`);
            }
            if (!chapter.interviewAngle) {
                report.error(`${c}: no interviewAngle — this corpus exists to answer "why is this asked"`);
            }

            /* buildsOn is within the module and points BACKWARDS, for the
               same reason prerequisites do one level up. */
            (chapter.buildsOn || []).forEach(prior => {
                const at = chapters.findIndex(other => other.id === prior);
                if (at === -1) {
                    report.error(`${c}: buildsOn "${prior}" is not a chapter of this module`);
                } else if (at >= index) {
                    report.error(`${c}: buildsOn "${prior}" comes later in the module`);
                }
            });

            /* ---- CHECK 4 — a must-know chapter carries documentation --- */
            const docs = chapter.docs || [];
            if (chapter.importance === 'must-know' && !docs.length) {
                report.error(`${c}: must-know with no docs[] — the same rule the question bank applies`);
            }
            docs.forEach(doc => {
                /* A FULL URL, not a path against docHub.

                   The blueprint's docs[] carries a path resolved against one
                   base, which is right for a subject with one documentation
                   site. This one has five that matter — Oracle, Spring,
                   Hibernate, PostgreSQL, the JEP index — and they do not
                   share a base, so a path would have to name its base anyway.
                   A full https URL is also what check-doc-links.js can
                   actually resolve in Phase 9, and what the question bank's
                   referenceLinks already are. */
                if (!doc.title || !doc.url) {
                    report.error(`${c}: a docs entry is missing a title or a url`);
                } else if (!/^https:\/\//.test(doc.url)) {
                    report.error(`${c}: docs url "${doc.url}" is not https`);
                }
                if (doc.kind && !['guide', 'api', 'codelab', 'sample', 'course'].includes(doc.kind)) {
                    report.error(`${c}: docs kind "${doc.kind}" is not one this deck knows`);
                }
            });

            /* ---- CHECK 8 — relatedQuestions resolve -------------------
               The highest-value check in this file. A question id invented
               while authoring, or one renamed months later, breaks the build
               here instead of becoming a link that goes nowhere. */
            (chapter.relatedQuestions || []).forEach(ref => {
                if (!ref || !ref.topicId || !ref.questionId) {
                    report.error(`${c}: a relatedQuestions entry is missing topicId or questionId`);
                    return;
                }
                const key = ref.topicId + ':' + ref.questionId;
                if (!questionIds.has(key)) {
                    report.error(`${c}: relatedQuestions "${key}" does not resolve against the question bank`);
                }
            });

            const blocks = chapter.blocks || [];
            if (!blocks.length) report.error(`${c}: a chapter with no blocks`);

            blocks.forEach((block, bi) => {
                const b = `${c}[${bi}] ${block.type}`;
                blockCount++;

                if (BLOCK_TYPES.indexOf(block.type) === -1) {
                    report.error(`${b}: unknown block type`);
                    return;
                }

                (HTML_FIELDS[block.type] || []).forEach(field => {
                    if (block[field] != null) {
                        htmlIssues(block[field], `${b}.${field}`).forEach(i => report.error(i));
                    }
                });

                /* ---- CHECK 5 — block shapes ---------------------------- */
                switch (block.type) {
                    case 'prose':
                    case 'pitfall':
                    case 'tip':
                        if (!block.html) report.error(`${b}: no html`);
                        break;

                    case 'definition':
                        if (!block.term) report.error(`${b}: no term — this is what the glossary harvests`);
                        if (!block.html) report.error(`${b}: no html`);
                        if (block.term) {
                            if (termsSeen.has(block.term)) {
                                report.warn(
                                    `${b}: term "${block.term}" is already defined at ` +
                                    `${termsSeen.get(block.term)} — the glossary will show both`
                                );
                            } else {
                                termsSeen.set(block.term, c);
                            }
                        }
                        break;

                    case 'types':
                        if (!block.title) report.error(`${b}: no title`);
                        if (!Array.isArray(block.items) || !block.items.length) {
                            report.error(`${b}: no items`);
                        } else {
                            block.items.forEach((item, ii) => {
                                if (!item.name) report.error(`${b}.items[${ii}]: no name`);
                                htmlIssues(item.html || '', `${b}.items[${ii}].html`)
                                    .forEach(i => report.error(i));
                            });
                        }
                        break;

                    case 'table':
                        if (!Array.isArray(block.headers) || !block.headers.length) {
                            report.error(`${b}: no headers`);
                        }
                        if (!Array.isArray(block.rows) || !block.rows.length) {
                            report.error(`${b}: no rows`);
                        } else {
                            block.rows.forEach((row, ri) => {
                                if (!Array.isArray(row) || row.length !== (block.headers || []).length) {
                                    report.error(
                                        `${b}.rows[${ri}]: ${Array.isArray(row) ? row.length : '?'} cells ` +
                                        `against ${(block.headers || []).length} headers`
                                    );
                                }
                            });
                        }
                        break;

                    case 'comparison':
                        if (!block.title || !block.left || !block.right) {
                            report.error(`${b}: needs a title and both column names`);
                        }
                        if (!Array.isArray(block.rows) || !block.rows.length) {
                            report.error(`${b}: no rows`);
                        } else {
                            block.rows.forEach((row, ri) => {
                                if (!row.aspect || row.left == null || row.right == null) {
                                    report.error(`${b}.rows[${ri}]: needs an aspect and both sides`);
                                }
                            });
                        }
                        break;

                    case 'diagram':
                        if (DIAGRAM_TYPES.indexOf(block.diagramType) === -1) {
                            report.error(`${b}: diagramType "${block.diagramType}" is unknown`);
                        }
                        if (!block.diagramConfig) report.error(`${b}: no diagramConfig`);
                        break;

                    case 'syntax':
                        checkSnippet(report, b, block);
                        break;

                    case 'drill':
                        checkDrill(report, b, block, drillsSeen);
                        break;

                    case 'predict':
                        checkPredict(report, b, block, predictsSeen);
                        break;

                    case 'version':
                        moduleHasVersionBlock = true;
                        if (!block.title) report.error(`${b}: no title`);
                        if (!Array.isArray(block.items) || !block.items.length) {
                            report.error(`${b}: no items`);
                        } else {
                            block.items.forEach((item, ii) => {
                                if (!item.version) {
                                    report.error(`${b}.items[${ii}]: no version — that is the whole point`);
                                }
                                if (VERSION_STATES.indexOf(item.state) === -1) {
                                    report.error(
                                        `${b}.items[${ii}]: state "${item.state}" is not one of ` +
                                        VERSION_STATES.join(', ')
                                    );
                                }
                                htmlIssues(item.html || '', `${b}.items[${ii}].html`)
                                    .forEach(i => report.error(i));
                            });
                        }
                        break;
                }
            });

            /* Part 5.2 requires a version block on EVERY chapter of the
               modules where the drift itself is the subject. */
            if (VERSION_EVERY_CHAPTER.includes(module.id)) {
                if (!blocks.some(block => block.type === 'version')) {
                    report.error(`${c}: every chapter of ${module.id} must carry a version block`);
                }
            }
        });

        /* ---- CHECK 10 — the module-level version requirement ---------- */
        if (VERSION_BLOCK_MODULES.includes(module.id) && !moduleHasVersionBlock) {
            report.error(`${m}: this module must carry at least one version block`);
        }
    });

    /* ---- CHECK 9 — the catalogues, reconciled ---------------------------
       The half that fails the build is above, per drill and per predict: an
       id outside the catalogue, a duplicate, a tier that disagrees. What is
       left here is the other direction — catalogued and unwritten — which is
       a fact about the phase rather than a defect. */
    warnMany(
        report,
        Object.keys(DRILL_CATALOGUE)
            .filter(id => !drillsSeen.has(id))
            .map(id => `drill "${id}" is in the catalogue but not authored yet`),
        `of ${Object.keys(DRILL_CATALOGUE).length} catalogued drills are not authored yet`
    );

    const setsWritten = new Set();
    predictsSeen.forEach((_, id) => {
        const set = PREDICT_SETS.find(prefix => id.indexOf(prefix) === 0);
        if (set) setsWritten.add(set);
    });
    warnMany(
        report,
        PREDICT_SETS.filter(set => !setsWritten.has(set))
            .map(set => `predict set "${set}" has no puzzles yet`),
        `of ${PREDICT_SETS.length} predict sets have no puzzles yet`
    );

    /* ---- keyTopics coverage, warned ------------------------------------
       Every question topic claims to cover a list of subjects. If a
       reorganisation drops one out of the theory prose entirely, nothing
       else in the build notices — this is the only signal. A warning rather
       than an error because a keyTopic may legitimately be a question-bank
       subject with no chapter of its own. */
    const haystack = JSON.stringify(modules).toLowerCase();
    const uncovered = [];
    topics.forEach(topic => {
        (topic.keyTopics || []).forEach(key => {
            if (haystack.indexOf(String(key).toLowerCase()) === -1) {
                uncovered.push(`keyTopic "${key}" (${topic.id}) appears nowhere in the theory corpus`);
            }
        });
    });
    warnMany(report, uncovered, 'keyTopics are not covered by the theory corpus yet');

    report.finish(
        `${modules.length} module(s), ${chapterCount} chapter(s), ${blockCount} block(s), ` +
        `${termsSeen.size} glossary term(s), ${drillsSeen.size} drill(s), ${predictsSeen.size} predict(s)`
    );
}

/* --------------------------------------------------------------------------
   CHECK 6 — snippets, held to the question bank's rule exactly.

   Blueprint 18.3 exists so that this function is reachable from a syntax
   block at all. A `syntax` block delegates to renderCodeBlock(), which paints
   an output pane whether or not the schema mentions the field — so a field
   the validator ignores is a stdout claim nobody checked.
   -------------------------------------------------------------------------- */
function checkSnippet(report, where, snippet) {
    if (LANGUAGES.indexOf(snippet.language) === -1) {
        report.error(`${where}: language "${snippet.language}" is not one the highlighter knows`);
    }
    if (!snippet.title) report.error(`${where}: no title`);
    if (!snippet.code)  report.error(`${where}: no code`);

    if (snippet.notes) {
        htmlIssues(snippet.notes, `${where}.notes`).forEach(i => report.error(i));
    }
    if (!snippet.output) return;

    checkOutput(report, where, snippet.output, snippet.language);
}

function checkOutput(report, where, output, language) {
    if (OUTPUT_KINDS.indexOf(output.kind) === -1) {
        report.error(`${where}: output.kind "${output.kind}" is not stdout or trace`);
    }

    /* THE CHECK THAT MATTERS MOST IN THIS FILE, and it is the same one the
       question bank applies. An "Output" pane over code no toolchain can run
       is a fabricated claim printed in a console frame, which teaches
       something false — strictly worse than showing nothing. */
    if (output.kind === 'stdout' && RUNNABLE_LANGUAGES.indexOf(language) === -1) {
        report.error(
            `${where}: claims stdout for "${language}", which run-snippets.js cannot execute — ` +
            `use kind: 'trace'`
        );
    }
    if (!Array.isArray(output.lines) || !output.lines.length) {
        report.error(`${where}: output.lines is empty`);
    }
    if (output.explain) {
        htmlIssues(output.explain, `${where}.output.explain`).forEach(i => report.error(i));
    }
}

function checkDrill(report, where, block, seen) {
    if (!block.id) { report.error(`${where}: no id`); return; }

    if (!Object.prototype.hasOwnProperty.call(DRILL_CATALOGUE, block.id)) {
        report.error(`${where}: drill "${block.id}" is not in the catalogue — add it there first`);
    } else if (block.tier !== DRILL_CATALOGUE[block.id]) {
        report.error(
            `${where}: drill "${block.id}" is tier ${block.tier} here and ` +
            `tier ${DRILL_CATALOGUE[block.id]} in the catalogue`
        );
    }
    if (seen.has(block.id)) {
        report.error(`${where}: drill "${block.id}" is already authored at ${seen.get(block.id)}`);
    }
    seen.set(block.id, where);

    if (!block.title)  report.error(`${where}: no title`);
    if (!block.prompt) report.error(`${where}: no prompt`);
    if (!Number.isInteger(block.minutes) || block.minutes < 5) {
        report.error(`${where}: minutes is missing or implausible — a drill without a timebox is reading`);
    }
    if (!Array.isArray(block.watchFor) || !block.watchFor.length) {
        report.error(`${where}: no watchFor — this is what the drill is actually graded on`);
    } else if (block.tier === 1) {
        TIER_1_WATCH_FOR.forEach(line => {
            if (block.watchFor.indexOf(line) === -1) {
                report.error(`${where}: tier-1 watchFor is missing the verbatim line "${line}"`);
            }
        });
    }
    if (block.sketch) checkSnippet(report, `${where}.sketch`, block.sketch);
}

/* --------------------------------------------------------------------------
   CHECK 7 — a predict block, and the honesty rule on it.

   Blueprint 5.5 requires a predict that declines machine verification to say
   so; 18.2 makes the saying structured. stdout keeps its exact meaning — a
   runnable language, re-executed. EVERY other artefact is trace, and carries
   a verification string naming the engine and version it was run against or
   the reference it was read from. "PostgreSQL 16", never "SQL".
   -------------------------------------------------------------------------- */
function checkPredict(report, where, block, seen) {
    if (!block.id) { report.error(`${where}: no id`); return; }

    if (!PREDICT_SETS.some(prefix => block.id.indexOf(prefix) === 0)) {
        report.error(
            `${where}: predict "${block.id}" begins with no known set prefix — ` +
            `it would be counted by nothing`
        );
    }
    if (seen.has(block.id)) {
        report.error(`${where}: predict "${block.id}" is already authored at ${seen.get(block.id)}`);
    }
    seen.set(block.id, where);

    if (TIERS.indexOf(block.importance) === -1) {
        report.error(`${where}: importance "${block.importance}" is not one of ${TIERS.join(', ')}`);
    }
    if (!block.prompt) report.error(`${where}: no prompt — the reader must know what to commit to`);
    if (!block.code)   report.error(`${where}: no code`);
    if (LANGUAGES.indexOf(block.language) === -1) {
        report.error(`${where}: language "${block.language}" is not one the highlighter knows`);
    }
    if (!block.output) { report.error(`${where}: no output — there is nothing to reveal`); return; }

    checkOutput(report, where, block.output, block.language);

    const artefact = block.artefact || 'stdout';
    if (PREDICT_ARTEFACTS.indexOf(artefact) === -1) {
        report.error(`${where}: artefact "${artefact}" is not one of ${PREDICT_ARTEFACTS.join(', ')}`);
    } else if (artefact !== 'stdout') {
        if (block.output.kind !== 'trace') {
            report.error(`${where}: artefact "${artefact}" cannot be stdout — nothing re-runs it`);
        }
        if (!block.verification || String(block.verification).trim().length < 10) {
            report.error(
                `${where}: artefact "${artefact}" needs a verification string saying how the ` +
                `answer was established`
            );
        }
    }

    /* Options are recommended rather than required, but a set that exists
       has to be well formed — an answer index pointing past the end turns a
       puzzle into a permanently wrong one. */
    if (block.options) {
        if (!Array.isArray(block.options) || block.options.length < 2) {
            report.error(`${where}: options must be an array of at least two`);
        } else if (!Number.isInteger(block.answer) ||
                   block.answer < 0 || block.answer >= block.options.length) {
            report.error(`${where}: answer ${block.answer} is not an index into options`);
        }
    }
}

run();
