#!/usr/bin/env node
/* ==========================================================================
   run-snippets.js — execute every stdout claim against a real JDK

   THE DECK MAKES TWO KINDS OF CLAIM ABOUT WHAT CODE PRINTS AND ONLY ONE OF
   THEM IS CHECKABLE. `kind: 'trace'` is prose about behaviour: it says what
   happens, in order, and no machine can confirm it. `kind: 'stdout'` is a
   literal console transcript drawn in a <pre>, and a reader is entitled to
   assume that somebody ran it. Until this file existed, nobody had. The
   validators only ever checked that the LANGUAGE was runnable, which is a
   different assertion wearing the same clothes.

   So this compiles and runs all 58 of them and diffs the real output against
   the authored lines. Everything else in the corpus is deliberately out of
   scope and is COUNTED AND NAMED at the end rather than passed over in
   silence — a verification tool that reports only what it looked at invites
   the reader to believe it looked at everything.

     --selftest   prove the runner can fail before believing that it passed
     --jdk PATH   a JAVA_HOME to use instead of the discovered one
     --filter S   only claims whose id contains S
     --once       one run per snippet instead of two (see NONDETERMINISM)

   NONDETERMINISM. Every snippet runs TWICE by default and both runs must
   agree with each other as well as with the corpus. A snippet whose output
   depends on hash order, thread interleaving or wall-clock time can match
   the authored lines once by luck; it very rarely does it twice. This is
   the check that keeps a racy snippet from being blessed by a green run.
   ========================================================================== */

'use strict';

const fs        = require('fs');
const os        = require('os');
const path      = require('path');
const { spawnSync } = require('child_process');
const { loadCorpus, ROOT } = require('./load-corpus');
const { makeReport, RUNNABLE_LANGUAGES } = require('./schema');

let TIMEOUT_MS = 20000;

/* --------------------------------------------------------------------------
   Finding a JDK.

   This deck was written on a machine with no JDK on the PATH and no
   /usr/libexec/java_home entry, and Phase 9 was blocked for eight phases
   because of it. There WAS a JDK: Android Studio bundles a complete one,
   javac included, and nothing about `java -version` failing said so. The
   candidate list is therefore deliberately broad, and the chosen home is
   printed on every run so that a result can be attributed to a version.
   -------------------------------------------------------------------------- */
const CANDIDATES = [
    process.env.SPRINGDECK_JAVA_HOME,
    process.env.JAVA_HOME,
    '/Applications/Android Studio.app/Contents/jbr/Contents/Home',
    '/Applications/Android Studio Preview.app/Contents/jbr/Contents/Home',
    path.join(os.homedir(), 'Applications/Android Studio.app/Contents/jbr/Contents/Home'),
    '/Applications/IntelliJ IDEA.app/Contents/jbr/Contents/Home',
    '/Library/Java/JavaVirtualMachines/current/Contents/Home'
];

function findJdk(explicit) {
    const tried = [];
    const homes = (explicit ? [explicit] : []).concat(CANDIDATES).filter(Boolean);

    for (const home of homes) {
        const java  = path.join(home, 'bin', 'java');
        const javac = path.join(home, 'bin', 'javac');
        tried.push(home);
        /* javac as well as java. A JRE runs a class file and cannot compile a
           source file, and single-file source launch needs the compiler. */
        if (fs.existsSync(java) && fs.existsSync(javac)) return { home, java };
    }

    /* Last resort: whatever `java` is on the PATH, if it can compile. */
    try {
        const which = execFileSync('/usr/bin/which', ['javac'], { encoding: 'utf8' }).trim();
        if (which) return { home: path.dirname(path.dirname(which)), java: 'java' };
    } catch (_error) { /* nothing on the PATH; fall through to the message */ }

    console.log(
        'run-snippets: no JDK found. Looked in:\n  ' + tried.join('\n  ') +
        '\n\nSet SPRINGDECK_JAVA_HOME, or pass --jdk /path/to/home.\n' +
        'Android Studio bundles one at Contents/jbr/Contents/Home.'
    );
    process.exit(1);
}

function jdkVersion(java) {
    /* `java -version` writes to STDERR, not stdout — a forty-year-old wart
       that made the first run of this file print a blank version line. */
    const probe = spawnSync(java, ['-version'], { encoding: 'utf8' });
    const text  = String(probe.stderr || probe.stdout || '').trim();
    return text.split('\n')[0] || 'unknown';
}

/* --------------------------------------------------------------------------
   Collecting the claims.

   Both corpora, one shape. `where` is what a reader needs to find the thing
   on the page; `id` is what --filter matches.
   -------------------------------------------------------------------------- */
function collect(corpus) {
    const claims  = [];
    const skipped = { trace: 0, noOutput: 0 };

    (corpus.topics || []).forEach(topic => {
        (topic.questions || []).forEach(question => {
            (question.codeSnippets || []).forEach((snippet, i) => {
                if (!snippet.output)                   { skipped.noOutput++; return; }
                if (snippet.output.kind !== 'stdout')  { skipped.trace++;    return; }
                claims.push({
                    id:     topic.id + ':' + question.id + '#' + i,
                    where:  '#questions/' + topic.id + ' — ' + question.id,
                    lang:   snippet.language,
                    code:   snippet.code,
                    expect: snippet.output.lines || []
                });
            });
        });
    });

    (corpus.theoryModules || []).forEach(module => {
        (module.chapters || []).forEach(chapter => {
            (chapter.blocks || []).forEach(block => {
                if (block.type !== 'predict') return;
                if (!block.output)                   { skipped.noOutput++; return; }
                if (block.output.kind !== 'stdout')  { skipped.trace++;    return; }
                claims.push({
                    id:     block.id,
                    where:  '#predict/' + module.id + ' — ' + chapter.id,
                    lang:   block.language,
                    code:   block.code,
                    expect: block.output.lines || []
                });
            });
        });
    });

    return { claims, skipped };
}

/* The launcher runs the FIRST top-level class in the file, so the file is
   named after that one. Nested classes are indented and a leading-margin
   anchor is enough to tell them apart without parsing Java. */
function topLevelClassName(code) {
    const match = /^(?:public\s+|final\s+|abstract\s+)*(?:class|record|interface|enum)\s+([A-Za-z_]\w*)/m.exec(code);
    return match ? match[1] : null;
}

/* --------------------------------------------------------------------------
   Running one claim.

   Single-file source launch (`java Foo.java`) rather than javac-then-java:
   it is one process instead of two, it needs no output directory, and a
   compile error arrives on the same stderr as a runtime one. The cost is
   that it recompiles every run, which at 58 snippets is a few seconds.
   -------------------------------------------------------------------------- */
function runOnce(java, dir, claim) {
    const name = topLevelClassName(claim.code);
    if (!name) return { status: 'no-class' };

    const file = path.join(dir, name + '.java');
    fs.writeFileSync(file, claim.code, 'utf8');

    try {
        /* spawnSync rather than execFileSync, because a TIMEOUT AND A NON-ZERO
           EXIT ARE THE SAME EXCEPTION to the latter and have to be told apart
           by inspecting fields that are not documented to be there. The first
           version of this file tested `error.killed`, which is undefined on a
           timeout — the hang probe reported "the JVM exited non-zero" and the
           selftest caught it on its first run, which is the entire argument
           for having a selftest. spawnSync returns a record instead: `error`
           is set with code ETIMEDOUT when the clock ran out, and `status` is
           the exit code when the process finished on its own. */
        const proc = spawnSync(java, ['-XX:-UsePerfData', file], {
            encoding: 'utf8',
            timeout:  TIMEOUT_MS,
            cwd:      dir
        });

        if (proc.error && proc.error.code === 'ETIMEDOUT') return { status: 'timeout' };
        if (proc.error) return { status: 'threw', lines: [], stderr: String(proc.error.message) };

        if (proc.status !== 0) {
            return {
                status: 'threw',
                lines:  splitLines(proc.stdout || ''),
                stderr: String(proc.stderr || '').trim()
            };
        }
        return { status: 'ok', lines: splitLines(proc.stdout || '') };
    } finally {
        fs.unlinkSync(file);
    }
}

/* Trailing whitespace on a console line is invisible in the data file and
   invisible on the page, so it must not be the thing that fails a run. A
   trailing newline likewise: `println` always emits one and the authored
   lines[] never carries an empty last entry. */
function splitLines(text) {
    const lines = String(text).replace(/\r\n/g, '\n').split('\n').map(l => l.replace(/\s+$/, ''));
    while (lines.length && lines[lines.length - 1] === '') lines.pop();
    return lines;
}

function diff(expect, actual) {
    if (expect.length !== actual.length) {
        return `expected ${expect.length} line(s), got ${actual.length}`;
    }
    for (let i = 0; i < expect.length; i++) {
        const want = String(expect[i]).replace(/\s+$/, '');
        if (want !== actual[i]) {
            return `line ${i + 1}: expected ${JSON.stringify(want)}, got ${JSON.stringify(actual[i])}`;
        }
    }
    return null;
}

/* --------------------------------------------------------------------------
   verify — one claim, N runs, every disagreement reported
   -------------------------------------------------------------------------- */
function verify(java, dir, claim, runs) {
    const results = [];
    for (let i = 0; i < runs; i++) results.push(runOnce(java, dir, claim));

    const first = results[0];

    if (first.status === 'no-class') {
        return { ok: false, reason: 'no top-level class declaration — nothing to launch' };
    }
    if (first.status === 'timeout') {
        return { ok: false, reason: `did not finish inside ${TIMEOUT_MS / 1000}s` };
    }
    if (first.status === 'threw') {
        return {
            ok: false,
            reason: 'the JVM exited non-zero:\n        ' +
                    first.stderr.split('\n').slice(0, 4).join('\n        ')
        };
    }

    /* Both runs must agree with EACH OTHER before either is compared to the
       corpus. A snippet that disagrees with itself has no expected output to
       be right about, and saying "it matched" of one of two answers would be
       the most misleading thing this tool could print. */
    for (let i = 1; i < results.length; i++) {
        if (results[i].status !== 'ok') {
            return { ok: false, reason: `run ${i + 1} did not complete (${results[i].status}) though run 1 did` };
        }
        const drift = diff(results[0].lines, results[i].lines);
        if (drift) {
            return {
                ok: false,
                reason: 'NOT DETERMINISTIC — two runs disagreed, so no stdout pane can be ' +
                        'correct for it: ' + drift
            };
        }
    }

    const wrong = diff(claim.expect, first.lines);
    return wrong ? { ok: false, reason: wrong } : { ok: true };
}

/* ==========================================================================
   --selftest

   A runner that always returns "matched" and a corpus that is entirely
   correct produce the same output, and this project has already shipped two
   checks that passed for that reason. So before any real claim is run, four
   cases with known answers go through the SAME verify() path: one that must
   pass, and three that must fail, each for a different reason. If any of the
   four does not behave as written, the run stops and nothing else is
   believed.
   ========================================================================== */
const SELFTEST = [
    {
        name:   'a claim that is true',
        expect: true,
        claim:  {
            id: 'selftest-true', where: 'selftest', lang: 'java',
            code: 'public class SelfOk {\n    public static void main(String[] a) {\n        System.out.println("alpha");\n        System.out.println(2 + 2);\n    }\n}',
            output: ['alpha', '4']
        }
    },
    {
        name:   'a claim that is false',
        expect: false, match: /line 2: expected "5", got "4"/,
        claim:  {
            id: 'selftest-false', where: 'selftest', lang: 'java',
            code: 'public class SelfWrong {\n    public static void main(String[] a) {\n        System.out.println("alpha");\n        System.out.println(2 + 2);\n    }\n}',
            output: ['alpha', '5']
        }
    },
    {
        name:   'code that does not compile',
        expect: false, match: /exited non-zero/,
        claim:  {
            id: 'selftest-broken', where: 'selftest', lang: 'java',
            code: 'public class SelfBroken {\n    public static void main(String[] a) {\n        System.out.println(undefinedThing);\n    }\n}',
            output: ['anything']
        }
    },
    {
        name:   'code that never finishes',
        expect: false, match: /did not finish/,
        claim:  {
            id: 'selftest-hang', where: 'selftest', lang: 'java',
            code: 'public class SelfHang {\n    public static void main(String[] a) throws Exception {\n        Thread.sleep(600000);\n    }\n}',
            output: ['never']
        }
    }
];

function selftest(java, dir) {
    console.log('  --selftest: four cases with known answers, through the same verify()\n');
    let bad = 0;

    SELFTEST.forEach(probe => {
        const claim = Object.assign({}, probe.claim, { expect: probe.claim.output });

        /* The hang probe must not spend the full twenty seconds proving that
           twenty seconds is enforced. It is the only probe that waits, and
           the mechanism under test is the timeout, not its duration. */
        const saved = TIMEOUT_MS;
        if (probe.claim.id === 'selftest-hang') TIMEOUT_MS = 2000;
        const result = verify(java, dir, claim, 1);
        TIMEOUT_MS = saved;
        const passed = result.ok === probe.expect &&
                       (probe.expect || !probe.match || probe.match.test(result.reason || ''));

        console.log(
            `    ${passed ? 'v' : 'x'} ${probe.name} — ` +
            (result.ok ? 'matched' : 'reported: ' + String(result.reason).split('\n')[0])
        );
        if (!passed) bad++;
    });

    if (bad) {
        console.log(`\nrun-snippets: SELFTEST FAILED — ${bad} of ${SELFTEST.length} probes ` +
                    `did not behave as written. Nothing this run reports is evidence.\n`);
        process.exit(1);
    }
    console.log('\n    all four behaved as written; the runner can fail.\n');
}

/* ========================================================================== */

function run() {
    const argv    = process.argv.slice(2);
    const flag    = name => argv.indexOf(name) !== -1;
    const value   = name => (argv.indexOf(name) !== -1 ? argv[argv.indexOf(name) + 1] : null);

    const report  = makeReport('run-snippets');
    const jdk     = findJdk(value('--jdk'));
    const runs    = flag('--once') ? 1 : 2;
    const filter  = value('--filter');

    console.log(`\nrun-snippets: ${jdkVersion(jdk.java)}`);
    console.log(`              ${jdk.home}\n`);

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'springdeck-snippets-'));

    try {
        if (flag('--selftest')) selftest(jdk.java, dir);

        const corpus = loadCorpus({ quiet: true });
        const { claims, skipped } = collect(corpus);
        const subject = filter ? claims.filter(c => c.id.indexOf(filter) !== -1) : claims;

        /* A language check as well as a run. The validators refuse a stdout
           claim on a non-runnable language, so this should be unreachable —
           which is precisely why it is worth asserting from the other side. */
        subject.forEach(claim => {
            if (RUNNABLE_LANGUAGES.indexOf(claim.lang) === -1) {
                report.error(`${claim.id}: language "${claim.lang}" is not runnable, yet claims stdout`);
            }
        });

        let matched = 0;
        subject.forEach((claim, i) => {
            process.stdout.write(`\r  running ${i + 1}/${subject.length} ${claim.id.slice(0, 52).padEnd(52)}`);
            const result = verify(jdk.java, dir, claim, runs);
            if (result.ok) matched++;
            else report.error(`${claim.id}\n      at ${claim.where}\n      ${result.reason}`);
        });
        process.stdout.write('\r' + ' '.repeat(78) + '\r');

        /* WHAT WAS NOT CHECKED, said out loud. The gate asks for it and the
           habit is the point: a verification report that lists only its
           successes reads as a claim about the whole corpus. */
        console.log(`  ${matched}/${subject.length} stdout claim(s) matched, ${runs} run(s) each`);
        console.log(`  NOT CHECKED, and not checkable here: ${skipped.trace} trace pane(s) — ` +
                    `prose about behaviour, which no runner can confirm`);
        console.log(`  NOT CHECKED, no output pane at all: ${skipped.noOutput} snippet(s)`);

        report.finish(
            `${matched} stdout claim(s) executed against ${jdkVersion(jdk.java)}, ` +
            `${skipped.trace} trace pane(s) out of scope`
        );
    } finally {
        try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_error) { /* best effort */ }
    }
}

run();
