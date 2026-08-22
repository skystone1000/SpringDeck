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

module.exports = {
    TIERS, LANGUAGES, RUNNABLE_LANGUAGES, DIAGRAM_TYPES, OUTPUT_KINDS,
    PREDICT_ARTEFACTS, VERSION_STATES, BLOCK_TYPES, ALLOWED_TAGS, KEBAB,
    RESERVED_SEGMENTS, htmlIssues, makeReport
};
