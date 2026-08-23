/* ==========================================================================
   code-highlight.js — nine grammars, seven token classes

   There is no Prism and no highlight.js here, and that is a decision rather
   than an omission: a highlighter is the one dependency that would have to be
   vendored to survive `file://` and a blocked CDN, and vendoring 60 kB of
   someone else's tokeniser to colour nine languages costs more than writing
   the nine.

   THE HARD CONSTRAINT: highlight() must emit every character it was given,
   newlines included. The code block's gutter is a separate <pre> whose line
   count comes from splitting the source. If a grammar ever swallows a
   character the two panes disagree, and the disagreement is silent until a
   reader counts lines. Every rule below therefore consumes text and re-emits
   it escaped — nothing is dropped, nothing is normalised.

   Seven classes, matching the seven --syntax-* tokens exactly:
       tok-keyword  tok-type  tok-string  tok-number
       tok-annotation  tok-comment  tok-meta
   An eighth class would need an eighth token, and the token layer is closed.
   ========================================================================== */

/* Ordered rule lists. The scanner tries them in order at each position and
   takes the first that matches, so ORDER IS PRECEDENCE: comments before
   operators, strings before identifiers, keywords before the bare-word rule
   that would otherwise eat them. */
const syntaxGrammars = (function () {
    'use strict';

    /* Sticky (`y`) so a match is anchored at the scanner's cursor rather than
       found anywhere ahead of it. Without it the scanner would happily jump
       over text and drop characters — the one failure this file cannot have. */
    function rule(cls, source, flags) {
        return { cls: cls, re: new RegExp(source, 'y' + (flags || '')) };
    }

    var JAVA_KEYWORDS =
        'abstract|assert|boolean|break|byte|case|catch|char|class|const|continue|' +
        'default|do|double|else|enum|extends|final|finally|float|for|goto|if|' +
        'implements|import|instanceof|int|interface|long|native|new|package|' +
        'private|protected|public|return|short|static|strictfp|super|switch|' +
        'synchronized|this|throw|throws|transient|try|void|volatile|while|' +
        'var|yield|record|sealed|permits|non-sealed|true|false|null';

    var SQL_KEYWORDS =
        'SELECT|FROM|WHERE|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|ALTER|' +
        'DROP|TABLE|INDEX|VIEW|PRIMARY|FOREIGN|KEY|REFERENCES|UNIQUE|NOT|NULL|' +
        'DEFAULT|CHECK|CONSTRAINT|JOIN|INNER|LEFT|RIGHT|FULL|OUTER|CROSS|' +
        'LATERAL|ON|USING|GROUP|BY|HAVING|ORDER|ASC|DESC|LIMIT|OFFSET|FETCH|' +
        'FIRST|NEXT|ROWS|ONLY|UNION|ALL|INTERSECT|EXCEPT|DISTINCT|AS|AND|OR|' +
        'IN|EXISTS|BETWEEN|LIKE|ILIKE|IS|CASE|WHEN|THEN|ELSE|END|WITH|' +
        'RECURSIVE|OVER|PARTITION|WINDOW|RANGE|UNBOUNDED|PRECEDING|FOLLOWING|' +
        'CURRENT|ROW|BEGIN|COMMIT|ROLLBACK|SAVEPOINT|TRANSACTION|ISOLATION|' +
        'LEVEL|READ|WRITE|COMMITTED|UNCOMMITTED|REPEATABLE|SERIALIZABLE|FOR|' +
        'UPDATE|SHARE|NOWAIT|SKIP|LOCKED|EXPLAIN|ANALYZE|VACUUM|RETURNING|' +
        'CONFLICT|DO|NOTHING|CASCADE|RESTRICT|GRANT|REVOKE|IF';

    var SQL_TYPES =
        'INT|INTEGER|BIGINT|SMALLINT|DECIMAL|NUMERIC|REAL|DOUBLE|PRECISION|' +
        'SERIAL|BIGSERIAL|VARCHAR|CHAR|TEXT|BOOLEAN|BOOL|DATE|TIME|TIMESTAMP|' +
        'TIMESTAMPTZ|INTERVAL|UUID|JSON|JSONB|BYTEA|ARRAY';

    var BASH_KEYWORDS =
        'if|then|else|elif|fi|for|while|until|do|done|case|esac|function|' +
        'return|in|select|time|coproc|local|export|source|set|unset|readonly';

    var DOCKER_INSTRUCTIONS =
        'FROM|RUN|CMD|LABEL|MAINTAINER|EXPOSE|ENV|ADD|COPY|ENTRYPOINT|VOLUME|' +
        'USER|WORKDIR|ARG|ONBUILD|STOPSIGNAL|HEALTHCHECK|SHELL|AS';

    var HTTP_METHODS = 'GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|TRACE|CONNECT';

    return {
        /* ---- java ----------------------------------------------------
           Text blocks come first: `"""` would otherwise match the plain
           string rule as an empty string followed by a stray quote. */
        java: [
            rule('comment',    '//[^\\n]*'),
            rule('comment',    '/\\*[\\s\\S]*?\\*/'),
            rule('string',     '"""[\\s\\S]*?"""'),
            rule('string',     '"(?:\\\\.|[^"\\\\\\n])*"'),
            rule('string',     "'(?:\\\\.|[^'\\\\\\n])*'"),
            rule('annotation', '@[A-Za-z_][A-Za-z0-9_.]*'),
            rule('number',     '\\b0[xX][0-9a-fA-F_]+[lLfFdD]?\\b'),
            rule('number',     '\\b0[bB][01_]+[lL]?\\b'),
            rule('number',     '\\b[0-9][0-9_]*(?:\\.[0-9_]+)?(?:[eE][-+]?[0-9]+)?[lLfFdD]?\\b'),
            rule('keyword',    '\\b(?:' + JAVA_KEYWORDS + ')\\b'),
            rule('type',       '\\b[A-Z][A-Za-z0-9_]*\\b'),
            rule(null,         '[A-Za-z_$][A-Za-z0-9_$]*'),
            rule('meta',       '[{}()\\[\\];,.<>=+\\-*/%!&|^~?:]+')
        ],

        /* ---- sql -----------------------------------------------------
           Keywords are matched case-insensitively but emitted verbatim.
           Rewriting `select` to `SELECT` would be the highlighter editing
           the author's snippet, which it has no business doing. */
        sql: [
            rule('comment',    '--[^\\n]*'),
            rule('comment',    '/\\*[\\s\\S]*?\\*/'),
            rule('string',     "'(?:''|[^'])*'"),
            rule('meta',       '"(?:[^"])*"'),
            rule('number',     '\\b[0-9]+(?:\\.[0-9]+)?\\b'),
            rule('keyword',    '\\b(?:' + SQL_KEYWORDS + ')\\b', 'i'),
            rule('type',       '\\b(?:' + SQL_TYPES + ')\\b', 'i'),
            rule('annotation', '\\b(?:COUNT|SUM|AVG|MIN|MAX|COALESCE|NULLIF|' +
                               'CAST|ROW_NUMBER|RANK|DENSE_RANK|LAG|LEAD|' +
                               'NTILE|GREATEST|LEAST|NOW|EXTRACT|DATE_TRUNC)\\b', 'i'),
            rule(null,         '[A-Za-z_][A-Za-z0-9_$]*'),
            rule('meta',       '[(),;.*=<>+\\-/|]+')
        ],

        /* ---- yaml ----------------------------------------------------
           A key is only a key at the head of a line (after indentation or a
           list dash). `url: https://x` must not paint `https` as a second
           key, which is exactly what a context-free `\w+:` rule does. */
        yaml: [
            rule('comment',    '#[^\\n]*'),
            rule('meta',       '^[ \\t]*-[ \\t]+', 'm'),
            rule('annotation', '^[ \\t]*[A-Za-z0-9_.$\\[\\]-]+(?=[ \\t]*:)', 'm'),
            rule('meta',       ':(?=\\s|$)'),
            rule('string',     '"(?:\\\\.|[^"\\\\])*"'),
            rule('string',     "'(?:''|[^'])*'"),
            rule('keyword',    '\\b(?:true|false|null|yes|no|on|off|~)\\b'),
            rule('number',     '\\b[0-9]+(?:\\.[0-9]+)?(?:[smhd]|[KMG]i?[Bb]?)?\\b'),
            rule('meta',       '\\$\\{[^}]*\\}'),
            rule(null,         '[^\\s#:"\'$]+')
        ],

        /* ---- properties ---------------------------------------------- */
        properties: [
            rule('comment',    '^[ \\t]*[#!][^\\n]*', 'm'),
            rule('annotation', '^[ \\t]*[A-Za-z0-9_.$\\[\\]*-]+(?=[ \\t]*[=:])', 'm'),
            rule('meta',       '[=:]'),
            rule('meta',       '\\$\\{[^}]*\\}'),
            rule('keyword',    '\\b(?:true|false)\\b'),
            rule('number',     '\\b[0-9]+(?:\\.[0-9]+)?(?:[smhd]|[KMG][Bb]?)?\\b'),
            rule(null,         '[^\\s=:$]+')
        ],

        /* ---- xml ----------------------------------------------------- */
        xml: [
            rule('comment',    '<!--[\\s\\S]*?-->'),
            rule('meta',       '<\\?[\\s\\S]*?\\?>'),
            rule('meta',       '<!\\[CDATA\\[[\\s\\S]*?\\]\\]>'),
            rule('keyword',    '</?[A-Za-z_][A-Za-z0-9_.:-]*'),
            rule('meta',       '/?>'),
            rule('string',     '"(?:[^"])*"'),
            rule('string',     "'(?:[^'])*'"),
            rule('annotation', '\\b[A-Za-z_][A-Za-z0-9_.:-]*(?=\\s*=)'),
            rule('meta',       '&[A-Za-z#0-9]+;'),
            rule('meta',       '='),
            rule(null,         '[^<>&"\'=]+')
        ],

        /* ---- bash ---------------------------------------------------- */
        bash: [
            rule('comment',    '#[^\\n]*'),
            rule('string',     '"(?:\\\\.|[^"\\\\])*"'),
            rule('string',     "'[^']*'"),
            rule('annotation', '\\$\\{[^}]*\\}'),
            rule('annotation', '\\$[A-Za-z_][A-Za-z0-9_]*'),
            rule('annotation', '\\$[0-9@*?#!$]'),
            rule('keyword',    '\\b(?:' + BASH_KEYWORDS + ')\\b'),
            rule('type',       '(?:^|(?<=[|&;(]\\s?))\\s*[a-z][a-z0-9._-]*', 'm'),
            rule('meta',       '--?[A-Za-z][A-Za-z0-9-]*'),
            rule('number',     '\\b[0-9]+\\b'),
            rule('meta',       '[|&;<>()$]+'),
            rule(null,         '[^\\s|&;<>()$#"\']+')
        ],

        /* ---- json ----------------------------------------------------
           A key is a string immediately followed by a colon. Painting keys
           and values alike makes a nested object unreadable at a glance,
           which is the only reason to highlight JSON at all. */
        json: [
            rule('annotation', '"(?:\\\\.|[^"\\\\])*"(?=\\s*:)'),
            rule('string',     '"(?:\\\\.|[^"\\\\])*"'),
            rule('keyword',    '\\b(?:true|false|null)\\b'),
            rule('number',     '-?\\b[0-9]+(?:\\.[0-9]+)?(?:[eE][-+]?[0-9]+)?\\b'),
            rule('meta',       '[{}\\[\\],:]')
        ],

        /* ---- http ----------------------------------------------------
           Request lines, status lines and headers. A JSON body underneath is
           left to the meta and string rules rather than switching grammars
           mid-file: a half-parsed body is worse than an unpainted one. */
        http: [
            rule('comment',    '#[^\\n]*'),
            rule('keyword',    '^(?:' + HTTP_METHODS + ')(?=\\s)', 'm'),
            rule('keyword',    '\\bHTTP/[0-9.]+\\b'),
            rule('number',     '(?<=HTTP/[0-9.]{3}\\s)[0-9]{3}\\b'),
            rule('annotation', '^[A-Za-z][A-Za-z0-9-]*(?=:)', 'm'),
            rule('string',     '"(?:\\\\.|[^"\\\\])*"'),
            rule('number',     '\\b[0-9]+\\b'),
            rule('meta',       '[{}\\[\\],:;=?&]'),
            rule(null,         '[^\\s{}\\[\\],:;=?&"]+')
        ],

        /* ---- dockerfile ---------------------------------------------- */
        dockerfile: [
            rule('comment',    '#[^\\n]*'),
            rule('keyword',    '^\\s*(?:' + DOCKER_INSTRUCTIONS + ')\\b', 'mi'),
            rule('string',     '"(?:\\\\.|[^"\\\\])*"'),
            rule('string',     "'[^']*'"),
            rule('annotation', '\\$\\{?[A-Za-z_][A-Za-z0-9_]*\\}?'),
            rule('meta',       '--[A-Za-z][A-Za-z0-9-]*(?:=[^\\s]+)?'),
            rule('number',     '\\b[0-9]+\\b'),
            rule('meta',       '[\\[\\],=\\\\]+'),
            rule(null,         '[^\\s\\[\\],=$"\'#\\\\]+')
        ]
    };
})();

/* --------------------------------------------------------------------------
   highlight(code, language) -> HTML string

   Returns escaped HTML with <span class="tok-*"> around what the grammar
   recognised. An unknown language returns the escaped source unchanged, which
   is a legitimate outcome and not an error: validate-questions.js already
   refuses a language outside languages[], so reaching this path at all means
   the highlighter is being used by something that has not been validated yet.
   -------------------------------------------------------------------------- */
function highlight(code, language) {
    var source = String(code == null ? '' : code);
    var rules  = syntaxGrammars[language];

    if (!rules) return highlightEscape(source);

    var out    = '';
    var cursor = 0;
    var plain  = '';                       // run of unrecognised characters

    function flushPlain() {
        if (plain) { out += highlightEscape(plain); plain = ''; }
    }

    while (cursor < source.length) {
        var matched = false;

        for (var i = 0; i < rules.length; i++) {
            var rule = rules[i];
            rule.re.lastIndex = cursor;
            var found = rule.re.exec(source);

            // A zero-length match would spin the loop forever. Treat it as
            // no match at all and let the next rule, or the fallback, move
            // the cursor.
            if (!found || found[0].length === 0) continue;

            if (rule.cls === null) {
                // Recognised as a word, deliberately left unpainted.
                plain += found[0];
            } else {
                flushPlain();
                out += '<span class="tok-' + rule.cls + '">' +
                       highlightEscape(found[0]) + '</span>';
            }

            cursor += found[0].length;
            matched = true;
            break;
        }

        // The guarantee: if nothing matched, emit exactly one character and
        // advance. The loop terminates and no input is ever dropped.
        if (!matched) {
            plain += source.charAt(cursor);
            cursor += 1;
        }
    }

    flushPlain();
    return out;
}

/* Its own escape rather than a call into app.js, because this file loads
   first and a leaf with no dependencies is one fewer thing to get wrong.
   The four replacements are the same four; if they ever diverge, that is a
   bug in whichever copy changed. */
function highlightEscape(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/* Used by the Phase 9 self-test and by anything that wants to know whether a
   language will actually be painted before it renders one. */
function highlightKnows(language) {
    return Object.prototype.hasOwnProperty.call(syntaxGrammars, language);
}
