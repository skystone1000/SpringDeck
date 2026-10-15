#!/usr/bin/env node
/* ==========================================================================
   schema.js — the vocabulary both content validators share

   This file exists so validate-questions.js and validate-theory.js CANNOT
   DRIFT. A must-know question and a must-know chapter have to mean the same
   thing, an allowed tag has to be allowed in both corpora, and a language the
   runner cannot execute has to be un-runnable everywhere.

   If either validator needs a term the other does not have, the term goes
   here anyway. Two definitions of "tier" is how a corpus ends up with four.
   ========================================================================== */

'use strict';

const fs   = require('fs');
const path = require('path');

/* The three importance tiers, in order of weight. Stored, never derived: a
   tier computed from the theory chapters that link a question could not be
   overridden, and a question with no theory link would silently get none. */
const TIERS = ['must-know', 'should-know', 'good-to-know'];

/* The nine languages the highlighter knows. Java is the only backend language
   in this deck; the rest are configuration, query and shell. A tenth entry is
   an error rather than a warning — it is how a second backend language would
   get in. */
const LANGUAGES = ['java', 'sql', 'yaml', 'properties', 'xml', 'bash', 'json', 'http', 'dockerfile'];

/* Only what a local toolchain can actually execute. run-snippets.js runs
   these; the validator refuses a stdout claim on anything else. */
const RUNNABLE_LANGUAGES = ['java'];

const DIAGRAM_TYPES = ['flowchart', 'animation', 'sequence'];

/* stdout is literal console text and is re-executed. trace is prose about
   behaviour. They are NEVER interchangeable — that is the entire point of
   the field. */
const OUTPUT_KINDS = ['stdout', 'trace'];

/* What a predict block is asking the reader to predict. Backend has more than
   one determinate artefact and they have different verification stories, so
   collapsing them would mean either claiming stdout for things never run or
   losing the ability to run the ones that can be. */
const PREDICT_ARTEFACTS = ['stdout', 'sql-result', 'http-response', 'query-count', 'behaviour'];

const VERSION_STATES = ['was', 'changed', 'is', 'removed', 'preview'];

const BLOCK_TYPES = [
    'prose', 'definition', 'types', 'syntax', 'table', 'comparison',
    'pitfall', 'tip', 'diagram', 'drill', 'predict', 'version'
];

/* The allowed tag subset for authored HTML.

   <img> IS DELIBERATELY OUTSIDE IT. Figures arrive as a structured images[]
   field and are built by a renderer that sets src and alt as PROPERTIES
   rather than interpolating them into markup. That is the only reason
   validation is possible at all: a validator can assert a path is
   repo-relative and present on disk; it can assert nothing whatsoever about
   an <img> buried in an HTML blob. */
const ALLOWED_TAGS = [
    'p', 'ul', 'ol', 'li', 'strong', 'em', 'code', 'a', 'br',
    'table', 'thead', 'tbody', 'tr', 'th', 'td'
];

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/* The five mode routes. No topic id and no module id may collide with one. */
const RESERVED_SEGMENTS = ['questions', 'theory', 'synthesis', 'predict', 'glossary'];

/* --------------------------------------------------------------------------
   htmlIssues(html, where) -> string[]

   Checks authored HTML against the allowed subset.

   Attribute checks look INSIDE TAGS ONLY. Scanning a whole string for `on...=`
   flags named arguments in prose — "the onEvent= parameter" — and a validator
   that cries wolf gets switched off, at which point it catches nothing at all.
   -------------------------------------------------------------------------- */
function htmlIssues(html, where) {
    const issues = [];
    if (typeof html !== 'string') {
        return [`${where}: expected an HTML string, got ${typeof html}`];
    }

    const tagPattern = /<\s*\/?\s*([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/g;
    let match;
    while ((match = tagPattern.exec(html)) !== null) {
        const name = match[1].toLowerCase();
        const attrs = match[2] || '';

        if (!ALLOWED_TAGS.includes(name)) {
            issues.push(`${where}: <${name}> is outside the allowed tag subset`);
            continue;
        }

        // Inline event handlers, inside the tag only.
        if (/\son[a-z]+\s*=/i.test(attrs)) {
            issues.push(`${where}: <${name}> carries an inline event handler`);
        }

        // javascript: and data: URLs on anything with an href or src.
        const url = /(?:href|src)\s*=\s*["']?\s*([a-z]+:)/i.exec(attrs);
        if (url && /^(javascript|data|vbscript):$/i.test(url[1])) {
            issues.push(`${where}: <${name}> has a ${url[1]} URL`);
        }

        if (name === 'a' && !/href\s*=/i.test(attrs)) {
            issues.push(`${where}: <a> without an href`);
        }
    }

    return issues;
}

/* --------------------------------------------------------------------------
   existsCaseExact(root, relative) -> 'ok' | 'missing' | 'case'

   fs.existsSync IS CASE-INSENSITIVE ON MACOS, and this deck is built on one.
   `assets/img/Foo.png` therefore finds `foo.png`, the validator goes green,
   and the reader gets a broken image the first time the deck is served off a
   Linux host or out of a container — which is the worst place to find out.

   check-offline.js has done this since Phase 2 for the references in
   index.html. It lived only there until Phase 9 noticed that the images[]
   check in validate-questions.js used a bare existsSync, so a figure could
   have been vendored under one case and cited under another with nothing to
   say so. One definition, in the file that exists to stop two validators
   meaning different things by the same word.
   -------------------------------------------------------------------------- */
function existsCaseExact(root, relative) {
    const full = path.join(root, relative);
    if (!fs.existsSync(full)) return 'missing';
    return fs.readdirSync(path.dirname(full)).includes(path.basename(full)) ? 'ok' : 'case';
}

/* A small shared reporter, so both validators print the same shape and a
   reader does not have to learn two output formats. */
function makeReport(name) {
    const errors = [];
    const warnings = [];
    return {
        error(message)   { errors.push(message); },
        warn(message)    { warnings.push(message); },
        get errorCount() { return errors.length; },

        /* Warnings never fail a run, but they are meant to be read. */
        finish(summary) {
            if (warnings.length) {
                console.log(`\n  ${warnings.length} warning(s):`);
                warnings.forEach(w => console.log('    ! ' + w));
            }
            if (errors.length) {
                console.log(`\n  ${errors.length} error(s):`);
                errors.forEach(e => console.log('    x ' + e));
                console.log(`\n${name}: FAILED\n`);
                process.exit(1);
            }
            console.log(`\n${name}: PASSED — ${summary}\n`);
        }
    };
}

/* ==========================================================================
   checkDiagram — the shape each renderer actually reads

   Both validators checked that diagramType was known and that diagramConfig
   existed, and neither looked inside it. That is not enough, because every
   renderer in diagrams.js FAILS SOFT by design: `if (!nodes.length) return
   ''` for a flowchart, the same for actors and for steps. A config with the
   wrong key names produces an empty string, which mounts as an empty box in
   a page that is otherwise correct — no console error, no failed validator,
   nothing to notice unless someone scrolls past that exact block.

   That happened: a sequence diagram authored with `steps` instead of
   `messages` passed both validators and rendered nothing.

   The soft failure in the renderer is right — a half-drawn diagram must not
   take a page down at run time. This is where it should be caught instead.
   ========================================================================== */
function checkDiagram(report, where, type, config) {
    if (!config) {
        report.error(`${where}: no diagramConfig`);
        return;
    }

    function idsOf(list, field) {
        const ids = new Set();
        (config[list] || []).forEach((item, i) => {
            if (!item || !item.id)    report.error(`${where}.${list}[${i}]: no id`);
            else if (ids.has(item.id)) report.error(`${where}.${list}[${i}]: duplicate id "${item.id}"`);
            else ids.add(item.id);
            if (!item || !item.label)  report.error(`${where}.${list}[${i}]: no label`);
        });
        if (!ids.size) report.error(`${where}: no ${list}[] — ${field} renders nothing without them`);
        return ids;
    }

    /* An edge or a message naming an unknown participant is DROPPED by the
       renderer rather than drawn, so the diagram is quietly missing a line.
       Same argument as above: silent is the problem. */
    function checkLinks(list, ids) {
        const links = config[list];
        if (!Array.isArray(links) || !links.length) {
            report.error(`${where}: no ${list}[]`);
            return;
        }
        links.forEach((link, i) => {
            ['from', 'to'].forEach(end => {
                if (!link[end]) {
                    report.error(`${where}.${list}[${i}]: no ${end}`);
                } else if (!ids.has(link[end])) {
                    report.error(
                        `${where}.${list}[${i}]: ${end} "${link[end]}" is not one of ` +
                        `the declared ids — this link is silently dropped`
                    );
                }
            });
        });
    }

    if (type === 'flowchart') {
        checkLinks('edges', idsOf('nodes', 'a flowchart'));
    } else if (type === 'sequence') {
        checkLinks('messages', idsOf('actors', 'a sequence diagram'));
    } else if (type === 'animation') {
        const steps = config.steps;
        if (!Array.isArray(steps) || !steps.length) {
            report.error(`${where}: an animation needs steps[]`);
        } else {
            steps.forEach((step, i) => {
                if (!step || !step.label) report.error(`${where}.steps[${i}]: no label`);
            });
        }
    }
}

module.exports = {
    TIERS, LANGUAGES, RUNNABLE_LANGUAGES, DIAGRAM_TYPES, OUTPUT_KINDS,
    PREDICT_ARTEFACTS, VERSION_STATES, BLOCK_TYPES, ALLOWED_TAGS, KEBAB,
    RESERVED_SEGMENTS, htmlIssues, checkDiagram, makeReport, existsCaseExact
};
