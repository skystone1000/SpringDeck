/* ==========================================================================
   data/index.js — the topic registry

   Assembles the per-topic globals into the three things the rest of the
   application asks for: the ordered topic list, the topic-to-track map, and a
   lookup from a track to its topics.

   Loaded AFTER every data/<topic>.js and BEFORE data/modes.js.
   ========================================================================== */

/* Sidebar order. topics[0] is the default route — the topic a reader lands on
   with no hash at all. */
const topics = [
    placeholderData
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

/* Which subject track a question topic belongs to.
   Written as a track id rather than as a colour, so the sidebar can group by
   it, the glossary can filter by it, and a synthesis prompt can link back
   through it. HUE DERIVES FROM THE TRACK, so the colour and the kinship
   cannot drift apart.

   `null` is a deliberate, spelled-out answer meaning "belongs to no subject" —
   it renders in an "Everything else" group. `undefined` is a topic nobody has
   decided about, and validate-nav.js catches that. */
const topicTracks = {
    'placeholder': null
};

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
