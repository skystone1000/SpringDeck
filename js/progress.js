/* ==========================================================================
   progress.js — five stores, five nouns, and no sixth number

   THE RULE THIS FILE EXISTS TO ENFORCE: nothing here adds the five counts
   together, and nothing here ever will.

   The five modes count five incompatible units. A question is answered or it
   is not. A chapter is read. A drill is a 90-minute build you either did or
   did not sit down for. A predict snippet has a verdict — right, wrong, or
   not yet attempted — which is not a boolean at all. A glossary term is
   encountered rather than completed.

   "You are 61% through SpringDeck" would be an average over those five, and
   an average over incommensurable units is a sixth number that is true of
   nothing. It would also be actively misleading in the direction that hurts
   most: a reader who has read every chapter and sat no drill is not 50% ready
   for anything. So each mode reports its own count in its own noun, and the
   rail meter shows the count for the mode you are in — never a total.

   There is no totalProgress(). Do not add one.

   ---------------------------------------------------------------------------
   STORAGE. Five keys, one per mode, each an independent object. They are kept
   apart rather than nested under one root so that a corrupted or hand-edited
   value costs one mode's history instead of all five.

   EVERY read and EVERY write is inside a try/catch. localStorage throws on
   Safari in private mode, on file:// in some builds of Chrome, and on any
   browser at quota. Progress is a convenience; losing it must never take the
   page down with it.
   ========================================================================== */

const progressStore = (function () {
    'use strict';

    /* Both maps are DERIVED from data/modes.js rather than repeated here.
       They were written out in Phase 0 because modes.js did not exist yet,
       and two hand-maintained copies of "what are the five modes" is exactly
       the duplication the registry was introduced to remove: a sixth mode
       added there and forgotten here would store nothing and count nothing,
       silently.

       modes.js is parsed before this file — see the load order in
       index.html — so the reduction runs at parse time and the maps are
       complete before any caller exists. */
    var KEYS = appModes.reduce(function (map, mode) {
        map[mode.id] = mode.storageKey;
        return map;
    }, {});

    /* The noun each mode counts, in its sentence length. The rail's shorter
       label lives on the same mode object as progressNoun. */
    var NOUNS = appModes.reduce(function (map, mode) {
        map[mode.id] = mode.unit;
        return map;
    }, {});

    var VERDICTS = ['right', 'wrong', 'unanswered'];

    /* An in-memory mirror, so a page whose localStorage is unavailable still
       behaves correctly for the length of the session. The reader loses the
       history when they close the tab; they do not lose the checkbox while
       they are looking at it. */
    var cache = {};
    var listeners = [];

    function read(mode) {
        if (cache[mode]) return cache[mode];
        var value = {};
        try {
            var raw = localStorage.getItem(KEYS[mode]);
            if (raw) {
                var parsed = JSON.parse(raw);
                // A hand-edited array, or a null, would break every caller
                // downstream. Anything that is not a plain object is discarded.
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                    value = parsed;
                }
            }
        } catch (e) {
            /* Private mode, quota, or a value someone edited by hand.
               An empty store is a correct answer to "what have you done?" for
               a browser that cannot remember. */
        }
        cache[mode] = value;
        return value;
    }

    function write(mode) {
        try {
            localStorage.setItem(KEYS[mode], JSON.stringify(cache[mode] || {}));
        } catch (e) {
            /* Quota or a private window. The in-memory mirror is already
               updated, so the UI stays consistent for this session. */
        }
        notify(mode);
    }

    /* A listener that throws must not stop the others — but it must not
       vanish either. The original version had a bare catch, and a subscriber
       that failed left no evidence at all: the UI simply stopped updating and
       nothing appeared anywhere. That cost an afternoon of looking in the
       wrong place, so the swallow now reports.

       console.error rather than a rethrow: rethrowing here would let one
       broken subscriber break the write for every other one, which is the
       failure the catch exists to prevent. */
    function notify(mode) {
        listeners.forEach(function (fn) {
            try {
                fn(mode);
            } catch (e) {
                if (typeof console !== 'undefined' && console.error) {
                    console.error('progressStore: a listener threw for mode "' + mode + '"', e);
                }
            }
        });
    }

    /* ---- Keys ------------------------------------------------------------
       A question id is unique within its topic and NOT across the bank —
       'n-plus-one' is a reasonable id in both jpa-hibernate and sql-databases.
       Keying progress on the bare id would silently tick one off when the
       reader answered the other. The composite key is not an optimisation;
       it is the difference between right and wrong.
       -------------------------------------------------------------------- */
    function questionKey(topicId, questionId) {
        return String(topicId) + ':' + String(questionId);
    }

    /* ---- Questions -------------------------------------------------------
       Two independent states, deliberately not one tri-state: a question can
       be answered AND flagged for review. Those mean different things — "I
       got this" and "come back to this" — and collapsing them loses the case
       that matters most, the answer you got but do not trust.
       -------------------------------------------------------------------- */
    function isAnswered(topicId, questionId) {
        var entry = read('questions')[questionKey(topicId, questionId)];
        return !!(entry && entry.answered);
    }

    function toggleAnswered(topicId, questionId) {
        var store = read('questions');
        var key   = questionKey(topicId, questionId);
        var entry = store[key] || {};

        entry.answered = !entry.answered;
        if (entry.answered) {
            entry.answeredAt = new Date().toISOString();
        } else {
            delete entry.answeredAt;
        }

        if (entry.answered || entry.review) store[key] = entry;
        else delete store[key];               // do not keep empty husks around

        write('questions');
        return entry.answered;
    }

    function isFlagged(topicId, questionId) {
        var entry = read('questions')[questionKey(topicId, questionId)];
        return !!(entry && entry.review);
    }

    function toggleFlagged(topicId, questionId) {
        var store = read('questions');
        var key   = questionKey(topicId, questionId);
        var entry = store[key] || {};

        entry.review = !entry.review;
        if (entry.review) entry.reviewAt = new Date().toISOString();
        else delete entry.reviewAt;

        if (entry.answered || entry.review) store[key] = entry;
        else delete store[key];

        write('questions');
        return entry.review;
    }

    /* The date a card was flagged, so one deferred three weeks ago reads as
       older than one deferred yesterday. Returns null rather than a fake
       date when there is nothing to report. */
    function flaggedAt(topicId, questionId) {
        var entry = read('questions')[questionKey(topicId, questionId)];
        return (entry && entry.reviewAt) || null;
    }

    /* How many of THIS topic's questions are answered. Counting by iterating
       the topic rather than by filtering the store means a question deleted
       from the corpus stops being counted immediately, without a migration. */
    function answeredInTopic(topic) {
        if (!topic || !topic.questions) return 0;
        var store = read('questions');
        var n = 0;
        for (var i = 0; i < topic.questions.length; i++) {
            var entry = store[questionKey(topic.id, topic.questions[i].id)];
            if (entry && entry.answered) n++;
        }
        return n;
    }

    function flaggedInTopic(topic) {
        if (!topic || !topic.questions) return 0;
        var store = read('questions');
        var n = 0;
        for (var i = 0; i < topic.questions.length; i++) {
            var entry = store[questionKey(topic.id, topic.questions[i].id)];
            if (entry && entry.review) n++;
        }
        return n;
    }

    /* ---- Theory, synthesis, glossary -------------------------------------
       Three plain seen/done sets. They arrive in Phases 3 and 4; the store is
       written now so that those phases add content rather than plumbing.
       -------------------------------------------------------------------- */
    function isDone(mode, id) {
        return read(mode)[id] === true;
    }

    function toggleDone(mode, id) {
        var store = read(mode);
        if (store[id]) delete store[id];
        else store[id] = true;
        write(mode);
        return store[id] === true;
    }

    function markDone(mode, id) {
        var store = read(mode);
        if (store[id] === true) return false;
        store[id] = true;
        write(mode);
        return true;
    }

    /* ---- Predict ---------------------------------------------------------
       A MAP, not a set. Three states: right, wrong, and unanswered — and the
       third is the one a set cannot express. "Not attempted" and "attempted
       and got it wrong" are opposite signals about what to revise, and a set
       of ids you have seen conflates them into one.

       Unanswered is stored as an absent key rather than a literal, so the
       three states are still three when the store is empty.
       -------------------------------------------------------------------- */
    function verdictFor(predictId) {
        var value = read('predict')[predictId];
        return VERDICTS.indexOf(value) === -1 ? 'unanswered' : value;
    }

    function setVerdict(predictId, verdict) {
        if (VERDICTS.indexOf(verdict) === -1) return 'unanswered';
        var store = read('predict');
        if (verdict === 'unanswered') delete store[predictId];
        else store[predictId] = verdict;
        write('predict');
        return verdictFor(predictId);
    }

    /* ---- Per-mode counts -------------------------------------------------
       Each returns ONE number in ONE noun. countFor('predict') counts the
       right answers, not the attempts, because "31 correct" is the number a
       reader is actually asking for.
       -------------------------------------------------------------------- */
    function countFor(mode) {
        var store = read(mode);
        var keys  = Object.keys(store);

        if (mode === 'questions') {
            return keys.filter(function (k) { return store[k] && store[k].answered; }).length;
        }
        if (mode === 'predict') {
            return keys.filter(function (k) { return store[k] === 'right'; }).length;
        }
        return keys.filter(function (k) { return store[k] === true; }).length;
    }

    function nounFor(mode, count) {
        var noun = NOUNS[mode];
        if (!noun) return '';
        return count === 1 ? noun.one : noun.many;
    }

    /* ---- Housekeeping ---------------------------------------------------- */
    function reset(mode) {
        cache[mode] = {};
        try { localStorage.removeItem(KEYS[mode]); } catch (e) { /* nothing to do */ }
        notify(mode);
    }

    function subscribe(fn) {
        if (typeof fn === 'function') listeners.push(fn);
    }

    return {
        questionKey:      questionKey,
        isAnswered:       isAnswered,
        toggleAnswered:   toggleAnswered,
        isFlagged:        isFlagged,
        toggleFlagged:    toggleFlagged,
        flaggedAt:        flaggedAt,
        answeredInTopic:  answeredInTopic,
        flaggedInTopic:   flaggedInTopic,
        isDone:           isDone,
        toggleDone:       toggleDone,
        markDone:         markDone,
        verdictFor:       verdictFor,
        setVerdict:       setVerdict,
        countFor:         countFor,
        nounFor:          nounFor,
        reset:            reset,
        subscribe:        subscribe
    };
})();
