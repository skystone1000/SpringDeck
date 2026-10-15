#!/usr/bin/env node
/* ==========================================================================
   check-doc-links.js — every documentation URL the deck points at

   1,365 links: 843 on theory chapters, 98 module hubs, 424 on questions.
   829 of them distinct. A deck whose whole claim is "here is where to read
   the real thing" is worth less than nothing when the real thing has moved,
   because a dead link costs the reader the trip as well as the answer.

   FOUR THINGS ARE CHECKED AND THE ORDER MATTERS, because each one catches
   pages the one before it waved through:

     1  the URL is https and parses
     2  it answers 2xx without a redirect
     3  the body is not a meta-refresh stub
     4  a #fragment, if there is one, exists in the document

   Three is the one this project wrote itself a warning about before the file
   existed. Spring restructured its documentation between the 2.x and 3.x
   reference layouts and left stubs behind: a stub answers 200, carries no
   Location header, and bounces the reader elsewhere from inside the markup.
   A checker that reads only the status line calls that a pass. This one
   reads the first bytes of the body, so the blind spot is closed rather
   than budgeted for — but see the note at the end of the run, because a
   page that has been emptied WITHOUT a refresh tag still looks fine here
   and only a human reading it will know.

     --selftest   prove the two body checks can fail, then stop
     --fresh      ignore the response cache
     --filter S   only URLs containing S
     --host H     only URLs on host H
     --list       print the URLs and exit without touching the network
   ========================================================================== */

'use strict';

const fs   = require('fs');
const os   = require('os');
const path = require('path');
const { loadCorpus } = require('./load-corpus');
const { makeReport } = require('./schema');

const TIMEOUT_MS   = 20000;
const HOST_WORKERS = 6;      // distinct hosts in flight at once
const HOST_DELAY   = 250;    // ms between two requests to the SAME host
const BODY_CAP     = 4 * 1024 * 1024;
const CACHE        = path.join(os.tmpdir(), 'springdeck-doc-links.json');

/* The docs `kind` vocabulary, repeated from the validators only so that this
   file can group its report by it. The validators own the check. */
const UA = 'SpringDeck-link-check/1.0 (+static interview deck; validating its own references)';

/* --------------------------------------------------------------------------
   Collecting. Every link carries WHERE IT IS, because "404" is useless and
   "404, and it is the third doc on the persistence-context chapter" is a fix.
   -------------------------------------------------------------------------- */
function collect(corpus) {
    const links = [];

    (corpus.topics || []).forEach(topic => {
        (topic.questions || []).forEach(question => {
            (question.referenceLinks || []).forEach((link, i) => {
                links.push({
                    url:   link.url,
                    title: link.title,
                    from:  'question',
                    where: `#questions/${topic.id} — ${question.id} — referenceLinks[${i}]`
                });
            });
        });
    });

    (corpus.theoryModules || []).forEach(module => {
        /* docHub is an OBJECT, { title, url }, not a bare string. Worth
           saying out loud: the first pass over this corpus treated it as a
           string and produced 98 entries that stringified to [object Object]
           and were counted as distinct URLs. */
        if (module.docHub && module.docHub.url) {
            links.push({
                url:   module.docHub.url,
                title: module.docHub.title,
                from:  'docHub',
                where: `#theory/${module.id} — docHub`
            });
        }
        (module.chapters || []).forEach(chapter => {
            (chapter.docs || []).forEach((doc, i) => {
                links.push({
                    url:   doc.url,
                    title: doc.title,
                    from:  'chapter',
                    where: `#theory/${module.id} — ${chapter.id} — docs[${i}]`
                });
            });
        });
    });

    return links;
}

/* -------------------------------------------------------------------------- */
function loadCache(fresh) {
    if (fresh) return {};
    try { return JSON.parse(fs.readFileSync(CACHE, 'utf8')); } catch (_e) { return {}; }
}
function saveCache(cache) {
    try { fs.writeFileSync(CACHE, JSON.stringify(cache), 'utf8'); } catch (_e) { /* best effort */ }
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/* --------------------------------------------------------------------------
   A meta refresh, as it is actually written in the wild:

     <meta http-equiv="refresh" content="0; url=https://...">
     <meta HTTP-EQUIV=Refresh CONTENT="0;URL=/elsewhere">

   Attribute order varies, quoting varies, the separator around the URL
   varies, and the whole thing is case-insensitive. Match the tag first and
   pick the URL out of its content, rather than trying to write one pattern
   that spans both.
   -------------------------------------------------------------------------- */
function metaRefresh(html) {
    const tags = html.match(/<meta[^>]*http-equiv\s*=\s*["']?refresh["']?[^>]*>/gi) || [];
    for (const tag of tags) {
        const content = /content\s*=\s*["']([^"']*)["']/i.exec(tag) ||
                        /content\s*=\s*([^\s>]+)/i.exec(tag);
        if (!content) return '(a refresh tag with no content attribute)';
        const url = /url\s*=\s*(.+)$/i.exec(content[1]);
        return url ? url[1].trim().replace(/^["']|["']$/g, '') : content[1].trim();
    }
    return null;
}

/* A fragment is live if some element carries it as an id or a name. Both
   spellings, because the older specifications this deck links to — the JLS,
   the JVMS, several RFCs — predate id being the only answer. */
function hasFragment(html, fragment) {
    const raw = decodeURIComponent(fragment);
    const quoted = raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?:id|name)\\s*=\\s*["']${quoted}["']`, 'i').test(html) ||
           new RegExp(`(?:id|name)\\s*=\\s*${quoted}[\\s>]`, 'i').test(html);
}

/* --------------------------------------------------------------------------
   fetchOne — one URL, no redirects followed

   redirect: 'manual' rather than 'follow'. The gate asks for zero redirects,
   which is a statement about the DATA and not about the web: a 301 means the
   corpus holds a URL that the publisher has replaced, and following it
   silently would hide exactly the fact worth fixing. The Location is
   reported so the fix is a copy-paste.
   -------------------------------------------------------------------------- */
async function fetchOne(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        const response = await fetch(url, {
            redirect: 'manual',
            signal:   controller.signal,
            headers:  { 'User-Agent': UA, 'Accept': 'text/html,*/*' }
        });

        const result = {
            status:   response.status,
            location: response.headers.get('location') || null,
            type:     (response.headers.get('content-type') || '').split(';')[0].trim()
        };

        if (response.status >= 200 && response.status < 300 && /html|xml|^$/.test(result.type)) {
            const text = await response.text();
            result.body = text.length > BODY_CAP ? text.slice(0, BODY_CAP) : text;
        } else {
            /* Drain, so the socket is released rather than left to a timeout. */
            try { await response.arrayBuffer(); } catch (_e) { /* nothing to drain */ }
        }
        return result;
    } catch (error) {
        return { status: 0, error: error.name === 'AbortError'
            ? `no response in ${TIMEOUT_MS / 1000}s`
            : String(error.cause ? error.cause.code || error.cause.message : error.message) };
    } finally {
        clearTimeout(timer);
    }
}

/* --------------------------------------------------------------------------
   The queue. One worker per host at a time, HOST_WORKERS hosts in flight.

   236 of these URLs are on docs.oracle.com and 143 on docs.spring.io. Firing
   them all at once is how a link checker gets a 429 and then reports 236
   dead links that are all alive. Serialising per host with a small gap makes
   the run take about a minute and the result mean something.
   -------------------------------------------------------------------------- */
async function fetchAll(urls, cache, onProgress) {
    const byHost = new Map();
    urls.forEach(url => {
        let host;
        try { host = new URL(url).host; } catch (_e) { host = '(unparseable)'; }
        if (!byHost.has(host)) byHost.set(host, []);
        byHost.get(host).push(url);
    });

    const hosts   = [...byHost.keys()];
    const results = {};
    let done = 0;
    let next = 0;

    async function hostWorker() {
        while (next < hosts.length) {
            const host = hosts[next++];
            for (const url of byHost.get(host)) {
                if (cache[url]) {
                    results[url] = cache[url];
                } else {
                    const raw = await fetchOne(url);
                    /* The body is used here and NOT cached — it is megabytes
                       for the Hibernate single-page guide alone, and what the
                       next run needs is the verdict, not the document. */
                    results[url] = summarise(url, raw);
                    cache[url] = results[url];
                    await sleep(HOST_DELAY);
                }
                onProgress(++done);
            }
        }
    }

    await Promise.all(
        Array.from({ length: Math.min(HOST_WORKERS, hosts.length) }, hostWorker)
    );
    return results;
}

/* Turn a response into the verdict, discarding the body. Fragment presence
   has to be decided here for the same reason. */
function summarise(url, raw) {
    const verdict = { status: raw.status, location: raw.location || null, error: raw.error || null };
    const fragment = url.indexOf('#') !== -1 ? url.slice(url.indexOf('#') + 1) : '';

    if (raw.body) {
        const refresh = metaRefresh(raw.body);
        if (refresh) verdict.metaRefresh = refresh;
        if (fragment) verdict.fragment = hasFragment(raw.body, fragment) ? 'present' : 'absent';
        verdict.bytes = raw.body.length;
    } else if (fragment) {
        verdict.fragment = 'unread';   // no HTML body came back to look in
    }
    return verdict;
}

/* ==========================================================================
   --selftest

   Checks 1, 2 and 4 announce themselves: a malformed URL, a 404 and a
   missing anchor all leave a trace in the report. CHECK 3 DOES NOT. A
   corpus with no meta-refresh stubs in it and a metaRefresh() that never
   matches anything produce the same clean run, and this project has already
   shipped two checks that were green for exactly that reason.

   So the two functions that read a body are exercised against markup with
   known answers — including the near misses that a careless pattern would
   catch, because a refresh detector that also fires on <meta
   http-equiv="content-type"> gets switched off within a week.
   ========================================================================== */
const BODY_PROBES = [
    ['<meta http-equiv="refresh" content="0; url=https://new/place">', 'https://new/place'],
    ['<META HTTP-EQUIV=Refresh CONTENT="0;URL=/elsewhere">',           '/elsewhere'],
    ["<meta content='2; url=/x' http-equiv='refresh'>",                '/x'],
    ['<meta http-equiv="refresh" content="5">',                        '5'],
    ['<p>Use refresh to reload the page.</p>',                         null],
    ['<meta http-equiv="content-type" content="text/html">',           null]
];

const FRAGMENT_PROBES = [
    ['<h2 id="caching">Caching</h2>',   'caching',  true],
    ['<a name=jls-17.4>Threads</a>',    'jls-17.4', true],
    ['<h2 id="intern()">intern</h2>',   'intern()', true],
    ['<h2 id="other">Other</h2>',       'caching',  false],
    ['<p>caching is good</p>',          'caching',  false]
];

function selftest() {
    let bad = 0;
    console.log('  --selftest: the two checks no green run can vouch for\n');

    BODY_PROBES.forEach(([html, want]) => {
        const got = metaRefresh(html);
        const ok  = got === want;
        if (!ok) bad++;
        console.log(`    ${ok ? 'v' : 'x'} refresh ${JSON.stringify(html).slice(0, 54)} -> ${JSON.stringify(got)}`);
    });

    FRAGMENT_PROBES.forEach(([html, fragment, want]) => {
        const got = hasFragment(html, fragment);
        const ok  = got === want;
        if (!ok) bad++;
        console.log(`    ${ok ? 'v' : 'x'} #${fragment} in ${JSON.stringify(html).slice(0, 34)} -> ${got}`);
    });

    if (bad) {
        console.log(`\ncheck-doc-links: SELFTEST FAILED — ${bad} probe(s) did not behave as ` +
                    `written. A clean link run would mean nothing.\n`);
        process.exit(1);
    }
    console.log(`\n    all ${BODY_PROBES.length + FRAGMENT_PROBES.length} behaved as written, ` +
                `negatives included.\n`);
}

/* ========================================================================== */

async function run() {
    const argv   = process.argv.slice(2);
    const flag   = name => argv.indexOf(name) !== -1;
    const value  = name => (argv.indexOf(name) !== -1 ? argv[argv.indexOf(name) + 1] : null);

    if (flag('--selftest')) { selftest(); return; }

    const report = makeReport('check-doc-links');
    const corpus = loadCorpus({ quiet: true });
    let links    = collect(corpus);

    const filter = value('--filter');
    const host   = value('--host');
    if (filter) links = links.filter(l => String(l.url).indexOf(filter) !== -1);
    if (host)   links = links.filter(l => { try { return new URL(l.url).host === host; } catch (_e) { return false; } });

    /* ---- 1. shape, before a single request ---------------------------- */
    const usable = [];
    links.forEach(link => {
        if (typeof link.url !== 'string' || !link.url) {
            report.error(`${link.where}: no url`);
            return;
        }
        let parsed;
        try { parsed = new URL(link.url); } catch (_e) {
            report.error(`${link.where}: "${link.url}" is not a URL`);
            return;
        }
        if (parsed.protocol !== 'https:') {
            report.error(`${link.where}: ${link.url} is ${parsed.protocol} — every documentation link is https`);
            return;
        }
        if (!link.title || !String(link.title).trim()) {
            report.error(`${link.where}: ${link.url} has no title — the reader sees the title, not the URL`);
        }
        usable.push(link);
    });

    const unique = [...new Set(usable.map(l => l.url))];

    if (flag('--list')) {
        unique.forEach(u => console.log(u));
        console.log(`\n${links.length} link(s), ${unique.length} distinct. Network not touched.`);
        return;
    }

    console.log(`\ncheck-doc-links: ${links.length} link(s), ${unique.length} distinct URL(s)`);

    const cache  = loadCache(flag('--fresh'));
    const cached = unique.filter(u => cache[u]).length;
    if (cached) console.log(`                 ${cached} already in the cache at ${CACHE}`);
    console.log('');

    const results = await fetchAll(unique, cache, done => {
        if (process.stdout.isTTY) process.stdout.write(`\r  ${done}/${unique.length}   `);
    });
    saveCache(cache);
    if (process.stdout.isTTY) process.stdout.write('\r' + ' '.repeat(30) + '\r');

    /* ---- 2, 3, 4. the verdicts, reported at every USE of the URL ------- */
    const counts = { ok: 0, redirect: 0, dead: 0, stub: 0, unreachable: 0, fragmentGone: 0 };
    const seen   = new Set();

    usable.forEach(link => {
        const r = results[link.url];
        if (!r) return;

        /* One report line per distinct URL for the network verdict — 236
           identical Oracle failures would bury everything else — but the
           fragment verdict is per URL too, and `where` names the first use.
           The full list of uses is one grep away and the summary says so. */
        if (seen.has(link.url)) return;
        seen.add(link.url);

        if (r.status === 0) {
            counts.unreachable++;
            report.error(`${link.url}\n      at ${link.where}\n      unreachable: ${r.error}`);
        } else if (r.status >= 300 && r.status < 400) {
            counts.redirect++;
            report.error(
                `${link.url}\n      at ${link.where}\n      ${r.status} redirect to ${r.location}\n` +
                `      the corpus should hold the destination, not the stop on the way`
            );
        } else if (r.status >= 400) {
            counts.dead++;
            report.error(`${link.url}\n      at ${link.where}\n      HTTP ${r.status}`);
        } else if (r.metaRefresh) {
            counts.stub++;
            report.error(
                `${link.url}\n      at ${link.where}\n` +
                `      answers ${r.status} and is a META-REFRESH STUB to ${r.metaRefresh}\n` +
                `      a status-only checker calls this alive; the reader does not`
            );
        } else {
            counts.ok++;
            /* A fragment that has gone is a WARNING and not an error. The
               page still holds the material, the deck still sends the reader
               somewhere true, and some documentation generators build their
               anchors in script where no fetch can see them. Worth reading,
               not worth failing a build over. */
            if (r.fragment === 'absent') {
                counts.fragmentGone++;
                report.warn(`${link.url} — #${link.url.split('#')[1]} is not an id or name in the page (${link.where})`);
            }
        }
    });

    console.log(`  ${counts.ok}/${unique.length} answered 2xx with no redirect and no refresh stub`);
    if (counts.redirect)     console.log(`  ${counts.redirect} redirect(s)`);
    if (counts.dead)         console.log(`  ${counts.dead} dead`);
    if (counts.stub)         console.log(`  ${counts.stub} meta-refresh stub(s)`);
    if (counts.unreachable)  console.log(`  ${counts.unreachable} unreachable`);
    if (counts.fragmentGone) console.log(`  ${counts.fragmentGone} live page(s) whose #fragment was not found — warnings`);

    /* WHAT THIS CANNOT SEE. Said every run, in the report, because the
       temptation after a green link check is to believe the references have
       been verified, and they have not been READ. */
    console.log(
        `\n  NOT CHECKED: whether the page still says what the deck cites it for.\n` +
        `  A page that was emptied, rewritten for a later version, or replaced by a\n` +
        `  "this content has moved" sentence with no refresh tag answers 200 here.\n` +
        `  One human reading pass per documentation source, per phase that adds links.`
    );

    report.finish(
        `${unique.length} distinct URL(s) across ${links.length} use(s), ` +
        `${counts.ok} clean, ${counts.fragmentGone} fragment warning(s)`
    );
}

run().catch(error => {
    console.log('\ncheck-doc-links: the run itself failed — ' + error.message);
    process.exit(1);
});
