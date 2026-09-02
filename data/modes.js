/* ==========================================================================
   data/modes.js — THE MODE REGISTRY

   The single most valuable structure in this codebase, and the reason is
   subtraction rather than addition: before it existed the answers about a
   mode lived in four files — the rail knew its icon, the router knew its
   route, progress.js knew its storage key and its noun, and the keyboard
   map knew its digit — so a sixth mode meant editing four files and
   remembering all four.

   Everything downstream reads this array and nothing else. The invariant in
   CLAUDE.md is stated as a grep: `data/modes.js` is the only place that
   knows what a mode is.

   Loaded AFTER both corpora, because a mode's sidebar shape is a claim about
   the corpus it lists, and BEFORE every file in js/.

   ---------------------------------------------------------------------------
   FOUR FIELDS CARRY MORE WEIGHT THAN THEY LOOK

   progressNoun / unit — the five modes do not share a unit. Questions are
       known, chapters read, prompts rehearsed, snippets solved, terms seen.
       There are two of them because a 40px rail column fits "READ" and a
       sentence needs "12 chapters"; they are the same fact in two lengths,
       declared together so they cannot drift. THERE IS NO FUNCTION ANYWHERE
       THAT ADDS THE FIVE COUNTS TOGETHER, and there must never be one: an
       average over five incompatible units is a sixth number true of
       nothing, printed somewhere the reader cannot check it.

   accentVar — a TOKEN NAME, never a colour. The rail is the only place an
       accent appears outside body content, and a literal here would break the
       rule that themes.css holds every colour in the application. The two
       study modes use --accent-work rather than --accent-500 because
       --accent-work is defined as "the step that passes contrast in THIS
       theme" and the rail item sits on --ds-sunken in both.

   group — drives the one divider in the rail: two study modes above it,
       three drill modes below. Load-bearing rather than decorative. It is
       what tells a reader that Questions and Theory are places to learn and
       the other three are places to be tested. validate-nav.js asserts the
       two groups stay contiguous, so the divider still separates something.

   storageKey — read by progress.js, which builds its own key map from this
       array rather than repeating it. Changing a value here migrates nothing;
       it orphans a reader's history. Treat these as permanent.
   ========================================================================== */

const appModes = [
    {
        id: 'questions', route: 'questions', railOrder: 1, key: '1', group: 'study',
        title: 'Questions', shortLabel: 'Questions', icon: '?',
        accentVar: '--accent-work', sidebar: 'topics',
        progressNoun: 'KNOWN', unit: { one: 'answered', many: 'answered' },
        storageKey: 'springdeck:progress:questions'
    },
    {
        id: 'theory', route: 'theory', railOrder: 2, key: '2', group: 'study',
        title: 'Theory', shortLabel: 'Theory', icon: '¶',
        accentVar: '--accent-work', sidebar: 'tracks',
        progressNoun: 'READ', unit: { one: 'chapter', many: 'chapters' },
        storageKey: 'springdeck:progress:theory'
    },
    {
        id: 'synthesis', route: 'synthesis', railOrder: 3, key: '3', group: 'drill',
        title: 'Interview Synthesis', shortLabel: 'Synthesis', icon: '◎',
        accentVar: '--hue-fuchsia-ink', sidebar: 'sets', trackId: 'synthesis',
        progressNoun: 'REHEARSED', unit: { one: 'drill', many: 'drills' },
        storageKey: 'springdeck:progress:synthesis'
    },
    {
        id: 'predict', route: 'predict', railOrder: 4, key: '4', group: 'drill',
        title: 'Predict the Output', shortLabel: 'Predict', icon: '>_',
        accentVar: '--hue-teal-ink', sidebar: 'sets', trackId: 'output',
        progressNoun: 'SOLVED', unit: { one: 'correct', many: 'correct' },
        storageKey: 'springdeck:progress:predict'
    },
    {
        id: 'glossary', route: 'glossary', railOrder: 5, key: '5', group: 'drill',
        title: 'Glossary', shortLabel: 'Glossary', icon: 'Aa',
        accentVar: '--hue-slate-ink', sidebar: 'alphabet',
        progressNoun: 'SEEN', unit: { one: 'term', many: 'terms' },
        storageKey: 'springdeck:progress:glossary'
    }
];

/* Rail order is a field rather than array order so that the two cannot
   disagree, and so that reordering the rail is one number rather than a
   cut-and-paste that also moves the comments. */
function railModes() {
    return appModes.slice().sort(function (a, b) { return a.railOrder - b.railOrder; });
}

const modeById = appModes.reduce(function (map, mode) {
    map[mode.id] = mode;
    return map;
}, {});

/* Both return null rather than a default. A caller that wants the default
   mode should say router.DEFAULT_MODE and mean it; one that silently fell
   back to Questions would turn a typo in the address bar into a page that
   looks like it worked. */
function modeForRoute(segment) {
    for (var i = 0; i < appModes.length; i++) {
        if (appModes[i].route === segment) return appModes[i];
    }
    return null;
}

function modeForKey(key) {
    for (var i = 0; i < appModes.length; i++) {
        if (appModes[i].key === String(key)) return appModes[i];
    }
    return null;
}

/* The two mode-scope tracks, resolved through the ONE track registry in
   data/index.js. Synthesis and Predict own a rail mode each rather than a
   group of topics, and this is where a mode is joined to the track whose
   modules it lists — so sidebar.js asks a mode for its track and never
   hard-codes either id. */
function trackForMode(modeId) {
    var mode = modeById[modeId];
    return mode && mode.trackId ? trackById(mode.trackId) : null;
}
