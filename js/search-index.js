/* ==========================================================================
   search-index.js — the corpus, flattened into things you can navigate to

   THIS FILE TOUCHES NO DOM, AND THAT IS THE POINT. Everything here is a pure
   function of the two corpora and the mode registry, which is what lets
   tools/validate-search.js load it into the same vm context load-corpus.js
   builds and assert against it in Node. js/search.js owns the panel, the
   keyboard and the routing; it is the half that cannot be checked outside a
   browser, so it is kept as small as the feature allows.

   That split exists because search fails soft in the two worst ways this
   project keeps rediscovering:

     - a result whose route does not resolve navigates to an empty state,
       which looks like "no such thing" rather than "the link was wrong";
     - a mode nobody wrote an indexer for simply returns nothing, forever,
       with no error anywhere.

   Neither shows up in a console. Both are caught in Node, before the commit.

   ---------------------------------------------------------------------------
   WHAT IS DELIBERATELY NOT INDEXED

   A predict block contributes its title, its prompt and its code. It does NOT
   contribute its options, its answer, its output pane, its distractor or its
   verification string. Searching for "ConcurrentModificationException" must
   not surface the puzzle whose answer is that it is never thrown, with the
   answer sitting in the excerpt underneath. The one block in this deck that
   withholds something has to withhold it here too, or the withholding is
   theatre.
   ========================================================================== */

/* ---- Text -----------------------------------------------------------------

   Tags first, entities second. Decoding first would turn an authored
   "&lt;div&gt;" into "<div>" and the strip would then eat it as markup,
   silently removing real text from the index. The corpus uses exactly four
   named entities today — &lt; &gt; &amp; &quot; — and &amp; is decoded last
   so that "&amp;lt;" survives as literal "&lt;" rather than becoming "<".
   -------------------------------------------------------------------------- */
function searchPlainText(html) {
    if (html == null) return '';
    return String(html)
        .replace(/<[^>]*>/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#0*39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/&#(\d+);/g, function (_, n) { return String.fromCharCode(parseInt(n, 10)); })
        .replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ')
        .trim();
}

/* Whitespace is collapsed HERE rather than only in searchPlainText, because
   the fields that skip that function are the code fields — and code arrives
   full of newlines and indentation. An excerpt drawn out of a raw snippet
   otherwise carries its line breaks into a two-line clamp and spends one of
   them on nothing. */
function searchJoin(parts) {
    return parts
        .filter(function (p) { return p != null && p !== ''; })
        .map(function (p) { return String(p).replace(/\s+/g, ' ').trim(); })
        .filter(function (p) { return p !== ''; })
        .join(' · ');
}

/* ---- One block, as text ---------------------------------------------------

   A switch over all twelve types rather than a generic walk of every string
   property, for the same reason theory.js renders with a switch: a new block
   type has to be added here consciously. A generic walk would silently index
   a thirteenth type's answer field the day someone writes one.

   A `diagram` contributes its caption and not its config. The config's shape
   differs per diagram type and harvesting strings out of it would couple this
   file to three renderers to buy a handful of node labels.
   -------------------------------------------------------------------------- */
function searchBlockText(block) {
    if (!block) return '';

    switch (block.type) {
        case 'prose':
        case 'pitfall':
        case 'tip':
            return searchPlainText(block.html);

        case 'definition':
            return searchJoin([block.term, searchPlainText(block.html)]);

        case 'types':
            return searchJoin([block.title].concat((block.items || []).map(function (item) {
                return item.name + ' ' + searchPlainText(item.html);
            })));

        case 'syntax':
            return searchJoin([
                block.title,
                block.code,
                searchPlainText(block.notes),
                block.output ? (block.output.lines || []).join(' ') : '',
                block.output ? searchPlainText(block.output.explain) : ''
            ]);

        case 'table':
            return searchJoin(
                [block.title]
                    .concat(block.headers || [])
                    .concat((block.rows || []).map(function (row) {
                        return row.map(searchPlainText).join(' ');
                    }))
            );

        case 'comparison':
            return searchJoin(
                [block.title, block.left, block.right]
                    .concat((block.rows || []).map(function (row) {
                        return row.aspect + ' ' +
                               searchPlainText(row.left) + ' ' +
                               searchPlainText(row.right);
                    }))
            );

        case 'diagram':
            return searchPlainText(block.caption);

        case 'drill':
            return searchJoin([
                block.title,
                searchPlainText(block.prompt),
                (block.watchFor || []).join(' '),
                block.sketch ? block.sketch.code : ''
            ]);

        /* See the header. Three fields, and no fourth. */
        case 'predict':
            return searchJoin([block.title, searchPlainText(block.prompt), block.code]);

        case 'version':
            return searchJoin([block.title].concat((block.items || []).map(function (item) {
                return item.version + ' ' + item.state + ' ' + searchPlainText(item.html);
            })));

        default:
            return '';
    }
}

/* ---- How a glossary term is addressed -------------------------------------

   Shared with glossary.js, which renders the element this slug has to match.
   It lives here rather than there because this is the file that loads first
   and the file Node can read; two copies of one expression is how a search
   result starts landing on a page and scrolling to nothing.

   A term beginning with '@' has no letter to file it under, so it addresses
   the whole list. glossary.js already treats any first segment that is not a
   single letter as "show everything", so 'all' needs no special case there.
   -------------------------------------------------------------------------- */
function glossaryTermSlug(term) {
    return String(term).toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function glossaryTermSegments(term) {
    var initial = String(term).charAt(0).toUpperCase();
    return [/^[A-Z]$/.test(initial) ? initial.toLowerCase() : 'all', glossaryTermSlug(term)];
}

/* ==========================================================================
   THE INDEX

   One entry per navigable thing. `segments` is what router.go() is called
   with, so an entry cannot describe a destination the router does not have —
   and validate-search.js resolves every one of them against the corpus.

       mode      which rail mode owns it, for the group heading
       title     what the reader is looking for
       context   where it lives, one line
       body      everything else, for matching and for the excerpt
   ========================================================================== */
function buildSearchIndex() {
    var entries = [];

    /* ---- Questions ------------------------------------------------------ */
    (typeof topics !== 'undefined' ? topics : []).forEach(function (topic) {
        topic.questions.forEach(function (question) {
            var snippets = (question.codeSnippets || []).map(function (snippet) {
                return searchJoin([
                    snippet.title,
                    snippet.code,
                    snippet.output ? (snippet.output.lines || []).join(' ') : '',
                    snippet.output ? searchPlainText(snippet.output.explain) : ''
                ]);
            });

            entries.push({
                mode:    'questions',
                key:     topic.id + ':' + question.id,
                title:   question.question,
                context: topic.title,
                segments: [topic.id, question.id],
                body: searchJoin(
                    [searchPlainText(question.answer), (question.tags || []).join(' ')]
                        .concat(snippets)
                        .concat((question.images || []).map(function (image) {
                            return searchJoin([image.alt, searchPlainText(image.caption)]);
                        }))
                )
            });
        });
    });

    /* ---- Theory, Synthesis and Predict ----------------------------------

       One traversal, three destinations, decided by the scope of the track
       the module sits on. A subject track's module is a run of chapters and
       the chapter is the thing you navigate to; a mode-scope track's module
       is a SET, and the thing you navigate to is one drill or one puzzle
       inside it. Reading the scope off the track registry rather than
       naming 'synthesis' and 'output' here is what stops a third mode-scope
       track from being silently unsearchable.
       -------------------------------------------------------------------- */
    var scopeOf = {};
    (typeof tracks !== 'undefined' ? tracks : []).forEach(function (track) {
        scopeOf[track.id] = track.scope;
    });

    var modeForTrack = {};
    (typeof appModes !== 'undefined' ? appModes : []).forEach(function (mode) {
        if (mode.trackId) modeForTrack[mode.trackId] = mode;
    });

    (typeof theoryModules !== 'undefined' ? theoryModules : []).forEach(function (module) {
        var scope = scopeOf[module.trackId];

        if (scope === 'mode') {
            var owner = modeForTrack[module.trackId];
            if (!owner) return;               // validate-nav.js refuses this case

            module.chapters.forEach(function (chapter) {
                chapter.blocks.forEach(function (block) {
                    if (block.type !== 'drill' && block.type !== 'predict') return;
                    entries.push({
                        mode:    owner.id,
                        key:     module.id + ':' + block.id,
                        title:   block.title,
                        context: searchJoin([module.title, chapter.title]),
                        segments: [module.id, block.id],
                        body:    searchBlockText(block)
                    });
                });
            });
            return;
        }

        module.chapters.forEach(function (chapter) {
            entries.push({
                mode:    'theory',
                key:     module.id + ':' + chapter.id,
                title:   chapter.title,
                context: module.title,
                segments: [module.id, chapter.id],
                body: searchJoin(
                    [searchPlainText(chapter.summary), searchPlainText(chapter.interviewAngle)]
                        .concat(chapter.blocks.map(searchBlockText))
                )
            });
        });
    });

    /* ---- Glossary --------------------------------------------------------

       A definition block is indexed TWICE on purpose: once inside the body of
       the chapter that teaches it, and once here as a term of its own. They
       are two different things to want — "which chapter covers erasure" and
       "what does erasure mean" — and the mode grouping is what tells the two
       results apart on screen.
       -------------------------------------------------------------------- */
    (typeof theoryModules !== 'undefined' ? theoryModules : []).forEach(function (module) {
        module.chapters.forEach(function (chapter) {
            chapter.blocks.forEach(function (block) {
                if (block.type !== 'definition' || !block.term) return;
                entries.push({
                    mode:    'glossary',
                    key:     'term:' + block.term,
                    title:   block.term,
                    context: searchJoin([module.title, chapter.title]),
                    segments: glossaryTermSegments(block.term),
                    body:    searchPlainText(block.html)
                });
            });
        });
    });

    /* Lowercased once, here, rather than on every keystroke over every
       entry. The index is built once per page load; a query runs against it
       on every character typed. */
    entries.forEach(function (entry) {
        entry.titleLower   = String(entry.title || '').toLowerCase();
        entry.contextLower = String(entry.context || '').toLowerCase();
        entry.bodyLower    = String(entry.body || '').toLowerCase();
    });

    return entries;
}

/* ==========================================================================
   THE QUERY

   Substring matching, ANDed across tokens, weighted by where the token was
   found. No stemming and no fuzziness, and that is a decision rather than a
   shortcut: this corpus is full of exact identifiers, and a reader who types
   "flatMap" wants flatMap. Fuzzy matching in a deck of API names produces
   confident wrong answers, which is the failure mode this whole project is
   written against.

   A token that matches NOTHING rejects the entry outright. Typing a second
   word must narrow the results, or the second word did nothing.
   ========================================================================== */
var SEARCH_WEIGHTS = {
    titleWord:   10,   // "hashmap" in "How HashMap resizes"
    titleAny:     6,   // "ashmap" in the same
    contextWord:  3,   // the topic or module name
    bodyWord:     2,
    bodyAny:      1
};

/* ONE-LETTER TOKENS ARE DROPPED, and it is the excerpt that decides it rather
   than the ranking. "a" matches practically every entry in the deck, which is
   only mildly useless — but it also marks every letter 'a' in every excerpt,
   and a panel of speckled text is worse than no panel. Nothing in this corpus
   is one character long and worth finding: 'T' as a type parameter appears in
   half the generics chapters and identifies none of them.

   A query that is ALL short tokens returns nothing, and search.js closes the
   panel rather than reporting no matches — because at one character the
   reader is still typing, not asking. */
var SEARCH_MIN_TOKEN = 2;

function searchTokens(query) {
    return String(query || '')
        .toLowerCase()
        .split(/\s+/)
        .map(function (t) { return t.trim(); })
        .filter(function (t) { return t.length >= SEARCH_MIN_TOKEN; });
}

/* True when the hit at `at` starts a word. \b is no use here: the identifiers
   this deck is full of are studded with '.', '@' and '<', and \b would call
   the 'map' inside 'flatMap' a word start about as often as it would not. */
function atWordStart(haystack, at) {
    if (at === 0) return true;
    return !/[a-z0-9]/.test(haystack.charAt(at - 1));
}

function searchFieldScore(haystack, token, wordWeight, anyWeight) {
    var at = haystack.indexOf(token);
    if (at === -1) return 0;
    while (at !== -1) {
        if (atWordStart(haystack, at)) return wordWeight;
        at = haystack.indexOf(token, at + 1);
    }
    return anyWeight;
}

function searchScoreEntry(entry, tokens) {
    var total = 0;

    for (var i = 0; i < tokens.length; i++) {
        var token = tokens[i];
        var score =
            searchFieldScore(entry.titleLower, token,
                             SEARCH_WEIGHTS.titleWord, SEARCH_WEIGHTS.titleAny) ||
            searchFieldScore(entry.contextLower, token,
                             SEARCH_WEIGHTS.contextWord, SEARCH_WEIGHTS.contextWord) ||
            searchFieldScore(entry.bodyLower, token,
                             SEARCH_WEIGHTS.bodyWord, SEARCH_WEIGHTS.bodyAny);

        if (!score) return 0;           // AND, not OR
        total += score;
    }

    /* The whole query as one phrase in the title beats the same words found
       apart. "persistence context" should not rank a chapter that says
       "persistence" in one paragraph and "context" in another above the
       chapter called Persistence Context. */
    var phrase = tokens.join(' ');
    if (tokens.length > 1 && entry.titleLower.indexOf(phrase) !== -1) total += 12;
    if (entry.titleLower === phrase) total += 20;

    /* A shorter title carrying the same score is the more specific answer.
       Small enough never to outrank a field weight, large enough to be a
       stable tiebreak. */
    return total + Math.max(0, 3 - entry.titleLower.length / 40);
}

/* Returns groups in RAIL ORDER, so the panel reads top to bottom the way the
   rail does. Per-group and overall caps both apply: one mode with two hundred
   matches must not push the other four off the panel entirely. */
function searchCorpus(index, query, options) {
    var opts      = options || {};
    var perGroup  = opts.perGroup || 5;
    var limit     = opts.limit || 12;
    var tokens    = searchTokens(query);

    if (!tokens.length) return { tokens: [], groups: [], shown: 0, total: 0 };

    var hits = [];
    for (var i = 0; i < index.length; i++) {
        var score = searchScoreEntry(index[i], tokens);
        if (score > 0) hits.push({ entry: index[i], score: score });
    }

    hits.sort(function (a, b) {
        if (b.score !== a.score) return b.score - a.score;
        // Deterministic. Two entries scoring the same must not swap places
        // between keystrokes that produced the same query.
        return a.entry.key < b.entry.key ? -1 : 1;
    });

    var order = (typeof railModes === 'function' ? railModes() : []).map(function (m) { return m.id; });
    var buckets = {};
    var taken = {};
    var shown = 0;

    /* PASS 1 — ONE SLOT PER MODE THAT MATCHED AT ALL.

       Filling purely by score sounds fairer and reads worse. "persistence
       context" scores five questions and five chapters above every glossary
       term, so a panel filled by score alone hides the fact that the deck
       DEFINES the phrase — and hiding it is the one thing a grouped panel is
       supposed to prevent. Reserving the top hit of each mode costs at most
       four slots and turns the grouping into information rather than
       decoration. */
    order.forEach(function (mode) {
        if (shown >= limit) return;
        for (var i = 0; i < hits.length; i++) {
            if (hits[i].entry.mode !== mode) continue;
            buckets[mode] = [hits[i]];
            taken[i] = true;
            shown++;
            return;
        }
    });

    /* PASS 2 — the rest by score. Within a bucket the order stays descending,
       because pass 1 took that mode's best and this appends in score order. */
    for (var h = 0; h < hits.length && shown < limit; h++) {
        if (taken[h]) continue;
        var mode = hits[h].entry.mode;
        if (!buckets[mode]) buckets[mode] = [];
        if (buckets[mode].length >= perGroup) continue;
        buckets[mode].push(hits[h]);
        shown++;
    }

    var groups = order.filter(function (id) { return buckets[id] && buckets[id].length; })
        .map(function (id) {
            return { mode: id, hits: buckets[id] };
        });

    return { tokens: tokens, groups: groups, shown: shown, total: hits.length };
}

/* ==========================================================================
   THE EXCERPT

   Returns SEGMENTS, never markup. The panel escapes each piece and wraps the
   hits in <mark> itself, so there is no path by which corpus text reaches
   innerHTML unescaped — which is the whole reason this returns an array of
   objects rather than a convenient string with tags already in it.
   ========================================================================== */
function searchExcerpt(entry, tokens, width) {
    var span = width || 130;
    var text = entry.body || '';
    var lower = entry.bodyLower || '';

    /* Anchor on the first token that is actually in the body. A title-only
       match still deserves a line of context, so fall back to the opening. */
    var at = -1;
    for (var i = 0; i < tokens.length && at === -1; i++) {
        at = lower.indexOf(tokens[i]);
    }
    if (at === -1) at = 0;

    var start = Math.max(0, at - Math.floor(span / 3));
    var end   = Math.min(text.length, start + span);
    if (start > 0) {
        var space = text.indexOf(' ', start);
        if (space !== -1 && space < start + 20) start = space + 1;
    }

    var slice = text.slice(start, end);
    var sliceLower = slice.toLowerCase();

    /* Every token's every occurrence inside the window, merged so that two
       overlapping hits do not produce nested marks. */
    var ranges = [];
    tokens.forEach(function (token) {
        var from = sliceLower.indexOf(token);
        while (from !== -1) {
            ranges.push([from, from + token.length]);
            from = sliceLower.indexOf(token, from + token.length);
        }
    });
    ranges.sort(function (a, b) { return a[0] - b[0]; });

    var merged = [];
    ranges.forEach(function (range) {
        var last = merged[merged.length - 1];
        if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
        else merged.push(range.slice());
    });

    var segments = [];
    var cursor = 0;
    merged.forEach(function (range) {
        if (range[0] > cursor) segments.push({ text: slice.slice(cursor, range[0]), hit: false });
        segments.push({ text: slice.slice(range[0], range[1]), hit: true });
        cursor = range[1];
    });
    if (cursor < slice.length) segments.push({ text: slice.slice(cursor), hit: false });

    if (start > 0 && segments.length) segments[0].text = '…' + segments[0].text;
    if (end < text.length && segments.length) {
        segments[segments.length - 1].text += '…';
    }

    return segments;
}
