#!/usr/bin/env node
/* ==========================================================================
   validate-search.js — the search index, checked outside a browser

   Search is the feature in this deck with the worst failure signature. Every
   way it can break produces a page that looks fine:

     - a result whose route does not resolve navigates to an empty state,
       which reads as "the deck does not have that" rather than "the link
       was wrong";
     - a mode nobody wrote an indexer for returns no results, forever, and
       the panel showing the other four looks complete;
     - a predict puzzle whose answer leaks into the index gives the answer
       away in the excerpt, and the reader has no way to know it was not
       meant to be there.

   None of the three produces a console message. All three are caught here.

   This is only possible because js/search-index.js touches no DOM. It is
   evaluated into the same vm context load-corpus.js builds, so these checks
   run against the SAME functions the browser runs, not a reimplementation of
   them — which is the difference between a test and a second opinion.

     1  every mode has entries, and every entry has a title
     2  every route an entry can emit RESOLVES against the corpus
     3  glossary.js and the index agree on a slug, and a slug names one term
     4  a predict block contributes nothing that gives its answer away
     5  a token unique to one chapter finds that chapter FIRST
     6  a second word narrows, one letter matches nothing, order is stable
   ========================================================================== */

'use strict';

const fs   = require('fs');
const path = require('path');
const { loadCorpus, evalInCorpus, ROOT } = require('./load-corpus');
const { makeReport } = require('./schema');

function run() {
    const report = makeReport('validate-search');
    const corpus = evalInCorpus(loadCorpus({ quiet: true }), 'js/search-index.js');

    const index = corpus.buildSearchIndex();
    const modes = corpus.appModes || [];

    if (!index.length) {
        console.log('validate-search: the index is empty — check index.html');
        process.exit(1);
    }

    /* ---- 1. coverage --------------------------------------------------
       A mode with no entries is not a small gap. It is a whole rail mode
       whose content cannot be found by anyone who searches for it, and the
       panel gives no hint that it was skipped. */
    const perMode = {};
    index.forEach(entry => {
        perMode[entry.mode] = (perMode[entry.mode] || 0) + 1;
    });

    modes.forEach(mode => {
        if (!perMode[mode.id]) {
            report.error(
                `mode "${mode.id}" has no entries in the search index — its ` +
                `content is unreachable from the search box and nothing on ` +
                `screen would say so`
            );
        }
    });
    Object.keys(perMode).forEach(id => {
        if (!modes.some(m => m.id === id)) {
            report.error(`the index emits entries for "${id}", which is not a mode`);
        }
    });

    index.forEach(entry => {
        if (!entry.title || !String(entry.title).trim()) {
            report.error(`${entry.mode}/${entry.key}: an entry with no title is an unclickable result`);
        }
        if (!entry.body || !String(entry.body).trim()) {
            report.warn(`${entry.mode}/${entry.key}: empty body — it can only ever match on its title`);
        }
    });

    /* ---- 2. every route resolves --------------------------------------
       Resolved the way the mode handler resolves it, against the corpus,
       not against a list of ids collected from the same traversal that
       built the entry — that would only prove the builder agrees with
       itself. */
    const topicById = corpus.topicById;
    const byModuleId = corpus.theoryByModuleId || {};
    const scopeOf = {};
    (corpus.tracks || []).forEach(t => { scopeOf[t.id] = t.scope; });

    function blockIn(module, type, id) {
        return module.chapters.some(chapter =>
            chapter.blocks.some(block => block.type === type && block.id === id));
    }

    const glossarySlugs = new Map();     // slug -> [term, ...]

    index.forEach(entry => {
        const where = `${entry.mode}/${entry.key}`;
        const [first, second] = entry.segments || [];

        if (!first || !second) {
            report.error(`${where}: an entry needs two route segments, got ${JSON.stringify(entry.segments)}`);
            return;
        }

        if (entry.mode === 'questions') {
            const topic = topicById(first);
            if (!topic) {
                report.error(`${where}: route names topic "${first}", which does not exist`);
            } else if (!topic.questions.some(q => q.id === second)) {
                report.error(`${where}: topic "${first}" has no question "${second}"`);
            }
            return;
        }

        if (entry.mode === 'glossary') {
            /* The first segment is a letter, or the word this deck uses for
               "no letter to file it under". Anything else silently shows the
               whole list, which is a recovery and not a destination. */
            if (!/^[a-z]$/.test(first) && first !== 'all') {
                report.error(`${where}: glossary segment "${first}" is neither a letter nor 'all'`);
            }
            if (!/^[a-z0-9-]+$/.test(second)) {
                report.error(`${where}: slug "${second}" is not url-safe`);
            }
            if (!glossarySlugs.has(second)) glossarySlugs.set(second, []);
            glossarySlugs.get(second).push(entry.title);
            return;
        }

        const module = byModuleId[first];
        if (!module) {
            report.error(`${where}: route names module "${first}", which does not exist`);
            return;
        }

        if (entry.mode === 'theory') {
            if (scopeOf[module.trackId] !== 'subject') {
                report.error(
                    `${where}: "${first}" sits on a mode-scope track, so #theory/${first} ` +
                    `redirects — a search result must address the mode that owns it`
                );
            }
            if (!module.chapters.some(c => c.id === second)) {
                report.error(`${where}: module "${first}" has no chapter "${second}"`);
            }
            return;
        }

        /* Synthesis and Predict. The mode's own trackId decides which block
           type it lists, read off the registry rather than named here. */
        const mode = modes.filter(m => m.id === entry.mode)[0];
        const type = entry.mode === 'predict' ? 'predict' : 'drill';

        if (!mode || module.trackId !== mode.trackId) {
            report.error(
                `${where}: module "${first}" is on track "${module.trackId}", but the ` +
                `${entry.mode} mode lists "${mode ? mode.trackId : '(no mode)'}"`
            );
        }
        if (!blockIn(module, type, second)) {
            report.error(`${where}: module "${first}" has no ${type} block "${second}"`);
        }
    });

    /* ---- 3a. THE SLUG IS NOT CHECKED AGAINST ITSELF --------------------

       Comparing an entry's slug to glossaryTermSlug(entry.title) proves
       nothing: the entry was BUILT by that function, so it agrees with itself
       by construction. This probe was run and did not fire, which is the only
       reason the hole was found.

       The thing that can actually drift is glossary.js, which renders the
       element the slug has to match. So the check is on its source: it must
       call the shared function, and it must not carry a second copy of the
       expression. A grep is a blunt instrument and it is the right one here —
       glossary.js registers a route handler at parse time and cannot be
       evaluated outside a browser at all.
       -------------------------------------------------------------------- */
    const glossarySource = fs.readFileSync(path.join(ROOT, 'js/glossary.js'), 'utf8');

    if (glossarySource.indexOf('glossaryTermSlug(entry.term)') === -1) {
        report.error(
            'js/glossary.js does not build its entry ids with glossaryTermSlug(entry.term) — ' +
            'a search result would land on the right page and scroll to nothing'
        );
    }
    if (/\[\^a-z0-9\]\+/.test(glossarySource)) {
        report.error(
            'js/glossary.js carries its own copy of the slug expression. One of the two ' +
            'copies will be edited and the other will not.'
        );
    }

    /* ---- 3b. one slug, one term ----------------------------------------
       'GC root' and 'GC-root' slug identically, and getElementById returns
       the first. The reader would be scrolled to a definition that is not
       the one they searched for, which is worse than not scrolling at all
       because nothing indicates it happened. */
    glossarySlugs.forEach((terms, slug) => {
        if (terms.length > 1) {
            report.error(
                `glossary slug "${slug}" is shared by ${terms.length} terms ` +
                `(${terms.join(', ')}) — a link to one of them lands on another`
            );
        }
    });

    /* ---- 4. the predict blocks withhold what they withhold -------------
       VACUOUS TODAY, ON PURPOSE. searchBlockText builds a predict block's
       text from its title, prompt and code, so nothing withheld can be in
       there — which is exactly the property worth pinning. The day somebody
       adds block.output to that case for the sake of "better recall", this
       check is what says no, and the reader never finds out that the search
       box has been printing the answers. */
    let predictChecked = 0;
    (corpus.theoryModules || []).forEach(module => {
        module.chapters.forEach(chapter => {
            chapter.blocks.forEach(block => {
                if (block.type !== 'predict') return;
                predictChecked++;

                const text = corpus.searchBlockText(block).toLowerCase();
                const permitted = corpus.searchPlainText(
                    [block.title, block.prompt, block.code].join(' ')
                ).toLowerCase();

                const withheld = [...new Set([]
                    .concat(block.options || [])
                    .concat(block.output ? (block.output.lines || []) : [])
                    .concat(block.distractor ? [block.distractor] : [])
                    .concat(block.verification ? [block.verification] : []))];

                withheld.forEach(raw => {
                    const needle = corpus.searchPlainText(raw).toLowerCase();
                    // Short strings are noise: an option reading "0" matches
                    // any code that contains a zero and proves nothing.
                    if (needle.length < 8) return;
                    if (text.indexOf(needle) !== -1 && permitted.indexOf(needle) === -1) {
                        report.error(
                            `predict "${block.id}": the index contains "${raw}", which is part ` +
                            `of the answer. A predict block contributes its title, its prompt ` +
                            `and its code, and nothing else.`
                        );
                    }
                });
            });
        });
    });

    /* ---- 5. THE PHASE 5 GATE, AS AN ASSERTION --------------------------
       "A term from a sql code block finds its chapter." Rather than pinning
       one hand-picked token, every qualifying identifier is collected and a
       sample of them must each rank their own chapter first. Self-
       maintaining: rewrite the chapter and the sample changes with it.

       AN IDENTIFIER QUALIFIES ONLY IF THE CODE IS THE ONLY PLACE IT APPEARS.
       The first version of this check asked for "unique across the index",
       which is not the same thing and is not enough: deleting block.code from
       searchBlockText entirely still left seven tokens that also appear in
       the surrounding prose, so the check passed while no SQL was indexed at
       all. Same family as the diagrams that mounted with the right node count
       and NaN geometry — the check has to fail for the reason it claims.

       So each candidate is also required to be ABSENT from its own entry with
       the code removed, which is computed by running the real searchBlockText
       over a copy of each syntax block whose code is blank.
       -------------------------------------------------------------------- */
    const owners = new Map();            // token -> Set(chapter keys)
    const sqlTokens = new Set();

    index.forEach(entry => {
        const seen = new Set();
        (entry.bodyLower.match(/[a-z_][a-z0-9_]{5,}/g) || []).forEach(token => {
            if (seen.has(token)) return;
            seen.add(token);
            if (!owners.has(token)) owners.set(token, new Set());
            owners.get(token).add(entry.mode + '/' + entry.key);
        });
    });

    const codelessEntry = new Map();     // entry key -> text with no code in it

    (corpus.theoryModules || []).forEach(module => {
        module.chapters.forEach(chapter => {
            let hasSql = false;
            chapter.blocks.forEach(block => {
                if (block.type !== 'syntax' || block.language !== 'sql') return;
                hasSql = true;
                (String(block.code).toLowerCase().match(/[a-z_][a-z0-9_]{5,}/g) || [])
                    .forEach(token => {
                        if (token.indexOf('_') === -1) return;      // a keyword, not a name
                        sqlTokens.add(token);
                    });
            });
            if (!hasSql) return;

            const codeless = [chapter.summary, chapter.interviewAngle]
                .concat(chapter.blocks.map(block => corpus.searchBlockText(
                    block.type === 'syntax' ? Object.assign({}, block, { code: '' }) : block
                )))
                .join(' ')
                .toLowerCase();

            codelessEntry.set('theory/' + module.id + ':' + chapter.id, codeless);
        });
    });

    const unique = [...sqlTokens].filter(token => {
        const set = owners.get(token);
        if (!set || set.size !== 1) return false;
        const codeless = codelessEntry.get([...set][0]);
        // Absent with the code removed, so a match can only have come from it.
        return codeless !== undefined && codeless.indexOf(token) === -1;
    }).sort();

    if (unique.length < 5) {
        report.error(
            `only ${unique.length} identifier(s) appear in a sql snippet and NOWHERE ` +
            `else in their own chapter — either the snippets stopped being indexed or ` +
            `the gate check has nothing left to assert against`
        );
    }

    /* Spread across the list rather than the first five, so the sample is not
       all drawn from whichever chapter happens to sort first. */
    const step = Math.max(1, Math.floor(unique.length / 8));
    const sample = unique.filter((_, i) => i % step === 0).slice(0, 8);

    sample.forEach(token => {
        const expected = [...owners.get(token)][0];
        const result = corpus.searchCorpus(index, token);
        const first = result.groups.length && result.groups[0].hits[0];
        const got = first ? first.entry.mode + '/' + first.entry.key : '(nothing)';

        if (got !== expected) {
            report.error(
                `"${token}" appears in exactly one entry (${expected}) but the top ` +
                `result is ${got} — a term from a code block has to find its own chapter`
            );
        }
    });

    /* ---- 6. narrowing, and determinism ---------------------------------
       A second word that widens the result set means the tokens are ORed
       somewhere, which is the single most common way a search box becomes
       useless: every query returns everything and the ranking carries the
       whole load. */
    const NARROWING = [
        ['transaction', 'transaction propagation'],
        ['thread', 'thread virtual'],
        ['index', 'index postgresql'],
        ['bean', 'bean scope prototype']
    ];

    NARROWING.forEach(([broad, narrow]) => {
        const a = corpus.searchCorpus(index, broad).total;
        const b = corpus.searchCorpus(index, narrow).total;
        if (b > a) {
            report.error(
                `"${narrow}" matches ${b} entries but "${broad}" matches only ${a} — ` +
                `adding a word must narrow, so the tokens are not being ANDed`
            );
        }
        if (!a) {
            report.error(`"${broad}" matches nothing at all — the index is not being searched`);
        }
    });

    /* A one-letter query has to return nothing. It matches most of the deck
       and marks every occurrence of that letter in every excerpt, which is
       speckle rather than an answer. */
    ['a', 't', ' ', '  x '].forEach(query => {
        const short = corpus.searchCorpus(index, query);
        const usable = corpus.searchTokens(query).length;
        if (usable === 0 && short.total !== 0) {
            report.error(`"${query}" has no usable tokens but still matched ${short.total} entries`);
        }
        if (query.trim().length === 1 && usable !== 0) {
            report.error(`"${query}" is one character and was treated as a token`);
        }
    });

    const once  = corpus.searchCorpus(index, 'transaction isolation');
    const twice = corpus.searchCorpus(index, 'transaction isolation');
    const keys  = r => r.groups.map(g => g.mode + ':' + g.hits.map(h => h.entry.key).join(',')).join('|');
    if (keys(once) !== keys(twice)) {
        report.error(
            'the same query returned a different order twice — results must not ' +
            'move under the reader between keystrokes'
        );
    }

    report.finish(
        `${index.length} entries (` +
        modes.map(m => `${m.id}=${perMode[m.id] || 0}`).join(' ') + `), ` +
        `${predictChecked} predict block(s) withholding, ` +
        `${sample.length} of ${unique.length} sql identifier(s) sampled`
    );
}

run();
