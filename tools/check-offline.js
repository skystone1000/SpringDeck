#!/usr/bin/env node
/* ==========================================================================
   check-offline.js — the mechanical half of "file:// works"

   `Open index.html from disk and it works` is an invariant, and CLAUDE.md says
   to check it before every phase gate. It has been checked by hand three times
   now, which is two times too many for something a script can do.

   WHAT THIS CANNOT DO, stated up front so nobody mistakes a pass for the whole
   check: it does not open the page. Only a browser can tell you whether the
   thing renders, and some browsers restrict localStorage, or treat every local
   file as a separate origin, in ways no static analysis will predict. A green
   run here means "nothing in the source will obviously break under file://",
   not "it works". THE MANUAL CHECK STILL HAPPENS AT THE GATE.

   What it does check is the set of things that HAVE broken file:// in other
   projects, each of which is invisible when served over http:

     1  no root-absolute local reference — `/css/x.css` resolves to the
        filesystem root under file:// and silently 404s
     2  every local reference in index.html exists on disk, with the exact
        case (a case-only mismatch works on macOS and fails on Linux)
     3  no network API in the app code — fetch and XHR against a file:// URL
        are blocked by every modern browser
     4  no url() in the stylesheets pointing anywhere unresolvable
     5  every localStorage access sits inside a try/catch, because it throws
        rather than returning null in several file:// configurations
     6  every remote script and stylesheet is optional — nothing the page
        needs to function may come from a network
   ========================================================================== */

'use strict';

const fs   = require('fs');
const path = require('path');
const { ROOT } = require('./load-corpus');
const { makeReport } = require('./schema');

/* Replace the contents of every string literal and comment with spaces,
   preserving length and line breaks so that offsets and line numbers computed
   against the result still line up with the original file.

   This exists because a corpus file is a JavaScript wrapper around content in
   other languages. Anything that greps this project's data files for a
   JavaScript idiom is really grepping Java, SQL, YAML and English prose at the
   same time, and will find them. */
function blankLiterals(src) {
    let out = '';
    let i = 0;

    while (i < src.length) {
        const ch = src[i];
        const next = src[i + 1];

        if (ch === '/' && next === '/') {
            while (i < src.length && src[i] !== '\n') { out += ' '; i++; }
            continue;
        }
        if (ch === '/' && next === '*') {
            out += '  '; i += 2;
            while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) {
                out += src[i] === '\n' ? '\n' : ' ';
                i++;
            }
            out += '  '; i += 2;
            continue;
        }
        if (ch === '\'' || ch === '"' || ch === '`') {
            const quote = ch;
            out += quote; i++;
            while (i < src.length && src[i] !== quote) {
                if (src[i] === '\\') { out += '  '; i += 2; continue; }
                out += src[i] === '\n' ? '\n' : ' ';
                i++;
            }
            out += quote; i++;
            continue;
        }
        out += ch;
        i++;
    }
    return out;
}

/* The remote resources the page is allowed to reference, each with the reason
   it is safe to lose. A new entry here is a decision that has to be argued:
   anything the page NEEDS from a network breaks the invariant outright. */
const OPTIONAL_REMOTES = {
    'fonts.googleapis.com': 'webfonts; the stacks fall back to system sans and mono',
    'fonts.gstatic.com':    'webfont files, same fallback',
    'cdnjs.cloudflare.com': 'three.js and gsap; three-bg.js and the stagger both bail without them'
};

function walk(dir, out) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === '.git' || entry.name === 'node_modules') continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full, out);
        else out.push(full);
    }
    return out;
}

/* Returns the character offsets covered by a try block, so a call site can be
   tested for being inside one. Brace counting rather than parsing: the data
   layer is plain ES5-ish source with no template literals in these files, and
   a parser dependency is exactly what this project does not have. */
function tryRanges(source) {
    const ranges = [];
    const pattern = /\btry\s*\{/g;
    let match;
    while ((match = pattern.exec(source)) !== null) {
        let depth = 0;
        let i = match.index + match[0].length - 1;
        for (; i < source.length; i++) {
            if (source[i] === '{') depth++;
            else if (source[i] === '}') {
                depth--;
                if (depth === 0) break;
            }
        }
        ranges.push([match.index, i]);
    }
    return ranges;
}

function inAnyRange(ranges, index) {
    return ranges.some(([from, to]) => index > from && index < to);
}

function run() {
    const report = makeReport('check-offline');
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

    /* ---- 1 and 6: references in index.html ---------------------------- */
    const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m => m[1]);
    let localRefs = 0;
    let remoteRefs = 0;

    for (const ref of refs) {
        if (ref.startsWith('data:') || ref.startsWith('#')) continue;

        if (/^https?:\/\//.test(ref)) {
            remoteRefs++;
            const host = new URL(ref).host;
            if (!OPTIONAL_REMOTES[host]) {
                report.error(
                    `index.html references ${host}, which is not in the optional list. ` +
                    `Anything the page NEEDS from a network breaks file://.`
                );
            }
            continue;
        }

        if (ref.startsWith('/')) {
            report.error(
                `index.html: "${ref}" is root-absolute. Under file:// that resolves ` +
                `to the filesystem root, not the project, and silently fails to load.`
            );
            continue;
        }

        localRefs++;

        /* Case-exact existence. fs.existsSync is case-insensitive on macOS, so
           it would pass here and fail on a Linux host or in a container —
           which is the worst place to discover it. */
        const full = path.join(ROOT, ref);
        if (!fs.existsSync(full)) {
            report.error(`index.html references ${ref}, which is not on disk`);
        } else {
            const dir = path.dirname(full);
            const base = path.basename(full);
            if (!fs.readdirSync(dir).includes(base)) {
                report.error(
                    `index.html references ${ref}, which differs in case from the file ` +
                    `on disk. This works on macOS and fails on Linux.`
                );
            }
        }
    }

    /* ---- 3 and 5: the application source ------------------------------ */
    const sources = walk(path.join(ROOT, 'js'), [])
        .concat(walk(path.join(ROOT, 'data'), []))
        .filter(f => f.endsWith('.js'));

    let storageCalls = 0;

    for (const file of sources) {
        const src = fs.readFileSync(file, 'utf8');
        const rel = path.relative(ROOT, file);
        const ranges = tryRanges(src);

        /* Network APIs. Checked on a call shape — `fetch(` — rather than on
           the bare word, because the corpus is full of prose about JPA
           fetching and a check that fires on that would be switched off
           within a day.

           And checked against the source with its STRING LITERALS BLANKED,
           because the call shape is not enough either. Every code snippet in
           this deck is another language stored inside a JavaScript string,
           and Java has methods called fetch() — `remote.fetch(key)` in a
           snippet about virtual threads is what found this. A real call is
           never inside a string literal, so blanking them removes the whole
           class of false positive without weakening the check. */
        const code = blankLiterals(src);
        for (const api of ['fetch(', 'new XMLHttpRequest(', 'new EventSource(', 'new WebSocket(']) {
            let at = code.indexOf(api);
            while (at !== -1) {
                const line = code.slice(0, at).split('\n').length;
                report.error(`${rel}:${line}: uses ${api.replace('(', '')} — blocked under file://`);
                at = code.indexOf(api, at + 1);
            }
        }

        /* localStorage, which throws rather than returning null in a private
           window and in several file:// configurations. */
        const storage = /localStorage\s*\./g;
        let match;
        while ((match = storage.exec(src)) !== null) {
            storageCalls++;
            if (!inAnyRange(ranges, match.index)) {
                const line = src.slice(0, match.index).split('\n').length;
                report.error(
                    `${rel}:${line}: localStorage access outside a try/catch. ` +
                    `It throws, and progress is a convenience that must not take the page down.`
                );
            }
        }
    }

    /* index.html's own inline script is subject to the same rule. */
    const inline = /<script>([\s\S]*?)<\/script>/.exec(html);
    if (inline) {
        const ranges = tryRanges(inline[1]);
        const storage = /localStorage\s*\./g;
        let match;
        while ((match = storage.exec(inline[1])) !== null) {
            storageCalls++;
            if (!inAnyRange(ranges, match.index)) {
                report.error('index.html inline script: localStorage access outside a try/catch');
            }
        }
    }

    /* ---- 4: stylesheets ----------------------------------------------- */
    let urlRefs = 0;
    for (const file of walk(path.join(ROOT, 'css'), []).filter(f => f.endsWith('.css'))) {
        const src = fs.readFileSync(file, 'utf8');
        const rel = path.relative(ROOT, file);
        for (const match of src.matchAll(/url\(\s*['"]?([^'")]+)/g)) {
            urlRefs++;
            const ref = match[1].trim();
            if (ref.startsWith('data:')) continue;
            if (/^https?:\/\//.test(ref)) {
                report.error(`${rel}: url(${ref}) is remote — it will not load offline`);
            } else if (ref.startsWith('/')) {
                report.error(`${rel}: url(${ref}) is root-absolute and breaks under file://`);
            } else if (!fs.existsSync(path.resolve(path.dirname(file), ref))) {
                report.error(`${rel}: url(${ref}) does not resolve to a file on disk`);
            }
        }
    }

    report.finish(
        `${localRefs} local reference(s) all present, ${remoteRefs} remote reference(s) ` +
        `all optional, ${storageCalls} localStorage access(es) all guarded, ` +
        `${urlRefs} css url() reference(s)\n` +
        `  NOTE: this does not open the page. Do that too.`
    );
}

run();
