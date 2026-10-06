#!/usr/bin/env node
/* ==========================================================================
   validate-nav.js — the structure, not the content

   The other two validators read the corpora. This one reads the SHAPE the
   corpora are navigated through: the track registry, the mode registry, and
   the reserved route segments that keep the two id spaces from colliding.

   ITS MOST VALUABLE CHECKS ARE THE LEAST CLEVER ONES. It holds the five mode
   totals as HARD NUMBERS, written by hand, and fails when reality disagrees.
   A refactor that quietly halves the Predict total is exactly what this file
   exists to catch, and "a number appeared" is not a check. Updating a total
   is a deliberate edit in the same commit that changed the corpus — if that
   ever feels like friction, that is the check working.

     1  every track declares a scope, and it is one of two
     2  every question topic names a subject track or an EXPLICIT null
     3  the five mode routes are reserved against BOTH id spaces
     4  the mode registry is complete and internally consistent
     5  the two study modes stay contiguous above the three drill modes
     6  THE FIVE TOTALS, as hard numbers
   ========================================================================== */

'use strict';

const { loadCorpus } = require('./load-corpus');
const { RESERVED_SEGMENTS, KEBAB, makeReport } = require('./schema');

/* --------------------------------------------------------------------------
   CHECK 6. Update these BY HAND, in the commit that changes the corpus.

   questions  every question in every topic
   theory     chapters in the SUBJECT tracks only — a drill set is not a
              chapter of anything and counting it here would make the reading
              path look longer than it is
   synthesis  drill blocks
   predict    predict blocks
   glossary   definition blocks, which are harvested rather than authored
   -------------------------------------------------------------------------- */
const EXPECTED_TOTALS = {
    questions: 486,
    theory:    687,
    synthesis:  31,
    predict:    34,
    glossary:   61
};

/* The four sidebar shapes sidebar.js implements. A mode naming a fifth would
   render an explanatory empty panel at run time, which is the right run-time
   behaviour and the wrong thing to ship. */
const SIDEBAR_SHAPES = ['topics', 'tracks', 'sets', 'alphabet'];
const MODE_GROUPS    = ['study', 'drill'];

/* Every field a mode must carry. Listed rather than checked ad hoc so that
   adding a field to the registry means adding it here, once. */
const MODE_FIELDS = [
    'id', 'route', 'railOrder', 'key', 'group', 'title', 'shortLabel',
    'icon', 'accentVar', 'sidebar', 'progressNoun', 'unit', 'storageKey'
];

function run() {
    const report = makeReport('validate-nav');
    const corpus = loadCorpus({ quiet: true });

    const tracks = corpus.tracks || [];
    const topics = corpus.topics || [];
    const modes  = corpus.appModes || [];
    const theory = corpus.theoryModules || [];

    if (!tracks.length || !modes.length) {
        console.log('validate-nav: no track or mode registry loaded — check index.html');
        process.exit(1);
    }

    /* ---- 1. tracks ---------------------------------------------------- */
    const trackIds = new Set();
    tracks.forEach(track => {
        const t = `track "${track.id}"`;
        if (!KEBAB.test(track.id || '')) report.error(`${t}: id is missing or not kebab-case`);
        if (trackIds.has(track.id))      report.error(`${t}: duplicate track id`);
        trackIds.add(track.id);

        if (track.scope !== 'subject' && track.scope !== 'mode') {
            report.error(
                `${t}: scope "${track.scope}" is neither subject nor mode. ` +
                `Every track has to say which it is — the distinction decides ` +
                `whether it appears in the reading path.`
            );
        }
        /* A subject track without a hue would render slate and look like a
           decision nobody made. A mode-scope track with one would compete
           with the accent data/modes.js already assigned. */
        if (track.scope === 'subject' && !track.hue) {
            report.error(`${t}: a subject track needs a hue — colour derives from the track`);
        }
        if (track.scope === 'mode' && track.hue) {
            report.error(`${t}: a mode-scope track must not carry a hue — data/modes.js decides what a mode looks like`);
        }
    });

    /* ---- 2. topic -> track ------------------------------------------- */
    const topicTracks = corpus.topicTracks || {};
    topics.forEach(topic => {
        const q = `topic "${topic.id}"`;

        /* undefined and null are DIFFERENT PROBLEMS and only one is legal.
           `null` is a spelled-out answer meaning "belongs to no subject" and
           renders in an Everything else group; `undefined` is a topic nobody
           has decided about, and it renders there too — silently, looking
           exactly like a decision. */
        if (!Object.prototype.hasOwnProperty.call(topicTracks, topic.id)) {
            report.error(
                `${q}: not in topicTracks at all. Write an explicit null if it ` +
                `genuinely belongs to no subject track.`
            );
            return;
        }
        const trackId = topicTracks[topic.id];
        if (trackId === null) return;

        const track = tracks.filter(t => t.id === trackId)[0];
        if (!track) {
            report.error(`${q}: names track "${trackId}", which is not in the registry`);
        } else if (track.scope !== 'subject') {
            report.error(
                `${q}: names "${trackId}", which is a mode-scope track. ` +
                `A question topic belongs to a subject or to nothing.`
            );
        }
    });

    /* ---- 3. reserved segments, against BOTH id spaces ----------------- */
    const routes = modes.map(m => m.route);
    RESERVED_SEGMENTS.forEach(segment => {
        if (routes.indexOf(segment) === -1) {
            report.error(
                `schema.js reserves "${segment}" but no mode routes to it — ` +
                `a reservation nobody uses blocks an id for nothing`
            );
        }
    });
    routes.forEach(route => {
        if (RESERVED_SEGMENTS.indexOf(route) === -1) {
            report.error(
                `mode route "${route}" is not in schema.js RESERVED_SEGMENTS, so a ` +
                `topic or module could take that id and make the route ambiguous`
            );
        }
    });
    topics.forEach(topic => {
        if (RESERVED_SEGMENTS.indexOf(topic.id) !== -1) {
            report.error(`topic "${topic.id}" collides with a reserved route segment`);
        }
    });
    theory.forEach(module => {
        if (RESERVED_SEGMENTS.indexOf(module.id) !== -1) {
            report.error(`theory module "${module.id}" collides with a reserved route segment`);
        }
    });

    /* ---- 4. the mode registry ----------------------------------------- */
    const seen = { id: {}, route: {}, key: {}, railOrder: {}, storageKey: {} };

    modes.forEach(mode => {
        const m = `mode "${mode.id}"`;

        MODE_FIELDS.forEach(field => {
            if (mode[field] === undefined || mode[field] === null || mode[field] === '') {
                report.error(`${m}: no ${field}`);
            }
        });

        ['id', 'route', 'key', 'railOrder', 'storageKey'].forEach(field => {
            const value = String(mode[field]);
            if (seen[field][value]) {
                report.error(`${m}: ${field} "${value}" is already used by "${seen[field][value]}"`);
            }
            seen[field][value] = mode.id;
        });

        if (SIDEBAR_SHAPES.indexOf(mode.sidebar) === -1) {
            report.error(
                `${m}: sidebar shape "${mode.sidebar}" is not one sidebar.js implements ` +
                `(${SIDEBAR_SHAPES.join(', ')})`
            );
        }
        if (MODE_GROUPS.indexOf(mode.group) === -1) {
            report.error(`${m}: group "${mode.group}" is neither study nor drill`);
        }

        /* accentVar holds a TOKEN NAME, never a colour. A literal here would
           break the rule that themes.css holds every colour in the app, and
           the colour grep over css/*.css cannot see a data file. */
        if (typeof mode.accentVar !== 'string' || mode.accentVar.indexOf('--') !== 0) {
            report.error(
                `${m}: accentVar "${mode.accentVar}" is not a custom-property name. ` +
                `It must be a token; a colour literal here escapes the themes.css rule.`
            );
        }
        if (!/^[1-9]$/.test(String(mode.key))) {
            report.error(`${m}: key "${mode.key}" is not a single digit 1-9`);
        }
        if (mode.unit && (!mode.unit.one || !mode.unit.many)) {
            report.error(`${m}: unit needs both a singular and a plural`);
        }

        /* A mode that names a track must name one that exists and is
           mode-scope. Synthesis pointing at `persistence` would list the
           persistence chapters as drill sets. */
        if (mode.trackId) {
            const track = tracks.filter(t => t.id === mode.trackId)[0];
            if (!track) {
                report.error(`${m}: trackId "${mode.trackId}" is not in the registry`);
            } else if (track.scope !== 'mode') {
                report.error(
                    `${m}: trackId "${mode.trackId}" is a subject track. A mode owns a ` +
                    `mode-scope track or none.`
                );
            }
        }
    });

    /* ---- 5. the divider still separates something --------------------- */
    const byRail = modes.slice().sort((a, b) => a.railOrder - b.railOrder);
    const groupRuns = [];
    byRail.forEach(mode => {
        if (!groupRuns.length || groupRuns[groupRuns.length - 1] !== mode.group) {
            groupRuns.push(mode.group);
        }
    });
    if (groupRuns.length !== 2 || groupRuns[0] !== 'study' || groupRuns[1] !== 'drill') {
        report.error(
            `the rail groups are [${groupRuns.join(', ')}] in rail order. The two study ` +
            `modes must stay contiguous above the drill modes, or the one divider ` +
            `rail.js draws separates nothing.`
        );
    }

    /* ---- 6. the five totals ------------------------------------------- */
    const subjectTrackIds = new Set(
        tracks.filter(t => t.scope === 'subject').map(t => t.id)
    );

    const actual = {
        questions: topics.reduce((n, t) => n + (t.questions || []).length, 0),
        theory:    0,
        synthesis: 0,
        predict:   0,
        glossary:  0
    };

    theory.forEach(module => {
        const onPath = subjectTrackIds.has(module.trackId);
        (module.chapters || []).forEach(chapter => {
            if (onPath) actual.theory++;
            (chapter.blocks || []).forEach(block => {
                if (block.type === 'drill')      actual.synthesis++;
                if (block.type === 'predict')    actual.predict++;
                if (block.type === 'definition') actual.glossary++;
            });
        });
    });

    Object.keys(EXPECTED_TOTALS).forEach(mode => {
        if (actual[mode] !== EXPECTED_TOTALS[mode]) {
            report.error(
                `${mode}: ${actual[mode]} in the corpus against ${EXPECTED_TOTALS[mode]} ` +
                `in EXPECTED_TOTALS. If the corpus is right, change the number here ` +
                `BY HAND in the same commit.`
            );
        }
    });

    report.finish(
        `${tracks.length} track(s), ${modes.length} mode(s), ` +
        `totals ${Object.keys(EXPECTED_TOTALS).map(k => k + '=' + actual[k]).join(' ')}`
    );
}

run();
