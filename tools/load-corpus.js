#!/usr/bin/env node
/* ==========================================================================
   load-corpus.js — read the data layer the way the browser does

   The data layer has no module system. Every file declares one global with a
   bare `const`, and the browser makes them see each other by loading them in
   order into one shared scope. Node cannot `require` any of it.

   So this reads the files in index.html order, concatenates them, and
   evaluates the whole thing as ONE script inside a vm context — which is
   exactly what the browser does, minus the DOM. The globals then see each
   other the same way, index.js can reference placeholderData, and modes.js
   can reference both corpora.

   Every other tool builds on this. It is the reason a corpus with no module
   system can be validated at all.
   ========================================================================== */

'use strict';

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const ROOT = path.resolve(__dirname, '..');

/* The load order is read out of index.html rather than duplicated here.
   A second list would drift from the first, and the drift would be silent:
   the browser would load a file the validator never saw, which is the one
   failure mode a validator must not have. */
function scriptOrder() {
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const order = [];
    const tag = /<script\s+src="([^"]+)"><\/script>/g;
    let match;
    while ((match = tag.exec(html)) !== null) {
        const src = match[1];
        if (src.startsWith('http')) continue;            // the optional CDNs
        if (src.startsWith('data/')) order.push(src);
    }
    return order;
}

function loadCorpus(options) {
    const opts = options || {};
    const files = scriptOrder();
    const missing = files.filter(f => !fs.existsSync(path.join(ROOT, f)));

    if (missing.length) {
        throw new Error(
            'index.html references data files that do not exist:\n  ' +
            missing.join('\n  ')
        );
    }

    const source = files
        .map(f => '/* ==== ' + f + ' ==== */\n' + fs.readFileSync(path.join(ROOT, f), 'utf8'))
        .join('\n;\n');

    const context = vm.createContext({ console });

    try {
        new vm.Script(source, { filename: 'corpus.js' }).runInContext(context);
    } catch (error) {
        // A syntax error here is almost always a stray comma or an unclosed
        // template in a data file. Say which files were in the bundle so the
        // search space is the concatenation rather than the whole repo.
        throw new Error(
            'The data layer failed to evaluate: ' + error.message +
            '\nFiles in load order:\n  ' + files.join('\n  ')
        );
    }

    if (!opts.quiet) {
        const count = (context.topics || []).reduce((n, t) => n + t.questions.length, 0);
        process.stderr.write(
            `load-corpus: ${files.length} file(s), ` +
            `${(context.topics || []).length} topic(s), ${count} question(s)\n`
        );
    }

    return context;
}

module.exports = { loadCorpus, scriptOrder, ROOT };

/* Run directly to see what the browser would see. */
if (require.main === module) {
    const corpus = loadCorpus();
    console.log(JSON.stringify({
        topics: (corpus.topics || []).map(t => ({
            id: t.id,
            title: t.title,
            questions: t.questions.length,
            track: (corpus.topicTracks || {})[t.id]
        })),
        languages: corpus.languages,
        runnable: corpus.runnableLanguages
    }, null, 2));
}
