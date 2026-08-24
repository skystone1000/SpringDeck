/* ==========================================================================
   data/index.js — the topic registry

   Assembles the per-topic globals into the four things the rest of the
   application asks for: the ordered topic list, the track registry, the
   topic-to-track map, and lookups over both.

   Loaded AFTER every data/<topic>.js and BEFORE data/modes.js.
   ========================================================================== */

/* Sidebar order, and the reading order a person would follow if they started
   at the top and worked down. topics[0] is the default route — the topic a
   reader lands on with no hash at all — so it is the language itself rather
   than a framework, because everything else assumes it. */
const topics = [
    javaLanguageData,
    collectionsData,
    concurrencyData,
    springCoreData,
    springBootData,
    aopProxiesData,
    restApiData,
    jpaHibernateData,
    transactionsData,
    sqlDatabasesData
];

/* The languages the highlighter knows, and the only ones a snippet may
   declare. Java is the only backend language in this deck: that is a decision,
   not an omission, and this array is where it is enforced.
   validate-questions.js rejects a tenth entry. */
const languages = ['java', 'sql', 'yaml', 'properties', 'xml', 'bash', 'json', 'http', 'dockerfile'];

/* Only the languages a compiler exists for locally. run-snippets.js executes
   every snippet recorded as kind:'stdout', and validate-questions.js REFUSES a
   stdout claim on anything outside this list — which is what stops an "Output"
   pane from being a guess. */
const runnableLanguages = ['java'];

/* --------------------------------------------------------------------------
   The tracks.

   ONE registry, shared by both corpora. The question bank groups its sidebar
   by track and takes its header hue from one; the theory corpus, from Phase 3,
   uses the same ids for its reading order. Two registries would mean the
   Persistence questions and the Persistence chapters could end up different
   colours, and the reader would have no way to tell that was an accident.

   `order` is the sidebar order. `hue` is one of the nine plus slate, and it is
   the ONLY place a topic's colour is decided — HUE DERIVES FROM THE TRACK, so
   colour and kinship cannot drift apart.

   `scope: 'mode'` marks the two tracks that are not subjects: Synthesis and
   Predict own a rail mode each rather than a group of topics. They are listed
   here so that Phase 4 has one list to read rather than two, and they carry no
   hue because data/modes.js decides what a mode looks like.
   -------------------------------------------------------------------------- */
const tracks = [
    { id: 'java-platform', title: 'Java & the JVM',                      order: 1,  hue: 'violet', scope: 'subject' },
    { id: 'spring-core',   title: 'The Spring Container & Boot',         order: 2,  hue: 'sky',    scope: 'subject' },
    { id: 'web-api',       title: 'HTTP, REST & the Web Layer',          order: 3,  hue: 'lime',   scope: 'subject' },
    { id: 'persistence',   title: 'Data, SQL & Transactions',            order: 4,  hue: 'amber',  scope: 'subject' },
    { id: 'security',      title: 'Security & API Hardening',            order: 5,  hue: 'rose',   scope: 'subject' },
    { id: 'distributed',   title: 'Microservices, Messaging & Scale',    order: 6,  hue: 'pink',   scope: 'subject' },
    { id: 'production',    title: 'Testing, Observability & Operations', order: 7,  hue: 'indigo', scope: 'subject' },
    { id: 'craft',         title: 'Design, Patterns & Architecture',     order: 8,  hue: 'teal',   scope: 'subject' },
    { id: 'synthesis',     title: 'Interview Synthesis',                 order: 9,  hue: null,     scope: 'mode' },
    { id: 'output',        title: 'Predict the Output',                  order: 10, hue: null,     scope: 'mode' }
];

/* Which subject track a question topic belongs to.

   Written as a track id rather than as a colour, so the sidebar can group by
   it, the glossary can filter by it, and a synthesis prompt can link back
   through it.

   `null` is a deliberate, spelled-out answer meaning "belongs to no subject" —
   it renders in an "Everything else" group. `undefined` is a topic nobody has
   decided about, and validate-nav.js catches that. The two are different
   problems and only one of them is legal. */
const topicTracks = {
    'java-language': 'java-platform',
    'collections':   'java-platform',
    'concurrency':   'java-platform',
    'spring-core':   'spring-core',
    'spring-boot':   'spring-core',
    'aop-proxies':   'spring-core',
    'rest-api':      'web-api',
    'jpa-hibernate': 'persistence',
    'transactions':  'persistence',
    'sql-databases': 'persistence'
};

function trackById(id) {
    for (var i = 0; i < tracks.length; i++) {
        if (tracks[i].id === id) return tracks[i];
    }
    return null;
}

/* The eight that group topics and chapters, in order. The two mode-scope
   tracks are filtered out here rather than at every call site, because a
   caller that forgot would put "Predict the Output" in the topic sidebar. */
function subjectTracks() {
    return tracks
        .filter(function (track) { return track.scope === 'subject'; })
        .sort(function (a, b) { return a.order - b.order; });
}

function topicsInTrack(trackId) {
    return topics.filter(function (topic) {
        var track = topicTracks[topic.id];
        return trackId === null ? (track === null) : (track === trackId);
    });
}

function topicById(id) {
    for (var i = 0; i < topics.length; i++) {
        if (topics[i].id === id) return topics[i];
    }
    return null;
}
