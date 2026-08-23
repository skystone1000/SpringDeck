/* ==========================================================================
   diagrams.js — three diagram types, drawn as SVG, coloured by the token layer

   NO MERMAID, NO D3, NO CANVAS. A diagram in this deck is a `hasDiagram` flag
   plus a `diagramConfig` object in the corpus, and this file turns that into
   SVG. Three consequences follow, and all three are the reason:

   1. A diagram is DATA. It can be validated — validate-questions.js already
      checks diagramType against the three allowed values — and a validator can
      say "this edge names a node that does not exist". Nothing can be said
      about a Mermaid string beyond whether it parses.
   2. A diagram is THEME-AWARE for free, because every stroke and fill is a
      var(--diagram-*) reference resolved by the browser at paint time. There
      is no light copy and no dark copy, and nothing here inverts an image.
   3. A diagram costs no request. It survives file:// and a blocked CDN, which
      the CDN-loaded alternatives do not.

   TEXT MEASUREMENT. There is no getComputedTextLength here: the SVG is built
   as a string before it is in the document, so nothing can be measured. Widths
   are estimated from character counts, and every box is sized generously
   rather than tightly. A box 12px wider than it needs to be is invisible; a
   label overflowing its box is the first thing anyone sees.
   ========================================================================== */

const diagrams = (function () {
    'use strict';

    /* Geometry, in one place. These are the numbers that make the three types
       look like they belong to one deck rather than to three authors. */
    var GEO = {
        charWidth:  6.4,      // Inter at 12px, measured once and hard-coded
        lineHeight: 15,
        padX:       14,
        padY:       11,
        minNodeW:   96,
        gapX:       28,
        gapY:       44,
        wrapChars:  26,
        margin:     14
    };

    function esc(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    /* Greedy word wrap. Long single words are left long rather than broken:
       'LazyInitializationException' split across two lines is harder to read
       than the same word overflowing slightly, and the box sizes to it. */
    function wrap(text, limit) {
        var words = String(text || '').split(/\s+/).filter(Boolean);
        var lines = [];
        var line = '';

        words.forEach(function (word) {
            if (!line) { line = word; return; }
            if ((line + ' ' + word).length <= limit) { line += ' ' + word; }
            else { lines.push(line); line = word; }
        });
        if (line) lines.push(line);
        return lines.length ? lines : [''];
    }

    function boxSize(lines) {
        var longest = lines.reduce(function (max, l) { return Math.max(max, l.length); }, 0);
        return {
            w: Math.max(GEO.minNodeW, Math.round(longest * GEO.charWidth) + GEO.padX * 2),
            h: lines.length * GEO.lineHeight + GEO.padY * 2
        };
    }

    function textBlock(lines, cx, cy, cls) {
        var top = cy - ((lines.length - 1) * GEO.lineHeight) / 2;
        return lines.map(function (line, i) {
            return '<text class="' + cls + '" x="' + cx + '" y="' + (top + i * GEO.lineHeight) +
                   '" text-anchor="middle" dominant-baseline="central">' + esc(line) + '</text>';
        }).join('');
    }

    /* Every stroked path carries its own --draw-length so the draw-on
       animation in animations.css finishes rather than stopping halfway. An
       over-estimate is safe (the tail of the animation is a no-op); an
       under-estimate leaves a permanent gap in the line. */
    function drawPath(d, length, extra, cls) {
        return '<path class="draw' + (cls ? ' ' + cls : '') + '" d="' + d +
               '" style="--draw-length:' + Math.ceil(length) + '"' + (extra || '') + '/>';
    }

    /* ======================================================================
       FLOWCHART — ranked layout

       Ranks come from the longest path to a node, so a node sits below every
       node that can reach it. Nodes sharing a rank sit side by side. This is
       not a general graph layout and does not try to be: it handles the
       shapes this corpus actually draws — a pipeline, a fork, a fork that
       rejoins — and a back edge is drawn as a labelled side loop rather than
       being allowed to invert the ranking.
       ====================================================================== */
    function flowchart(config) {
        var nodes = (config.nodes || []).map(function (n) {
            var lines = wrap(n.label, GEO.wrapChars);
            var size  = boxSize(lines);
            return { id: n.id, kind: n.kind || 'step', lines: lines, w: size.w, h: size.h };
        });
        if (!nodes.length) return '';

        var byId = {};
        nodes.forEach(function (n) { byId[n.id] = n; });

        /* Edges naming a node that does not exist are DROPPED, not drawn to
           the origin. A line to (0,0) looks like a diagram feature; a missing
           line looks like a mistake, which is what it is. */
        var edges = (config.edges || []).filter(function (e) {
            return byId[e.from] && byId[e.to];
        });

        // Longest-path ranking. The visited guard makes a cycle terminate
        // rather than recurse forever — a cycle in a corpus diagram is an
        // authoring error, but it must not hang the page.
        var rank = {};
        nodes.forEach(function (n) { rank[n.id] = 0; });
        for (var pass = 0; pass < nodes.length; pass++) {
            var changed = false;
            edges.forEach(function (e) {
                if (rank[e.to] < rank[e.from] + 1) { rank[e.to] = rank[e.from] + 1; changed = true; }
            });
            if (!changed) break;
        }

        var rows = [];
        nodes.forEach(function (n) {
            (rows[rank[n.id]] = rows[rank[n.id]] || []).push(n);
        });

        // Position. Rows are centred against the widest row.
        var rowWidths = rows.map(function (row) {
            return row.reduce(function (sum, n) { return sum + n.w; }, 0) + (row.length - 1) * GEO.gapX;
        });
        var widest = Math.max.apply(null, rowWidths);
        var y = GEO.margin;

        rows.forEach(function (row, r) {
            var x = GEO.margin + (widest - rowWidths[r]) / 2;
            var tallest = 0;
            row.forEach(function (n) {
                n.x = x; n.y = y;
                n.cx = x + n.w / 2; n.cy = y + n.h / 2;
                x += n.w + GEO.gapX;
                tallest = Math.max(tallest, n.h);
            });
            row.forEach(function (n) { n.rowH = tallest; });
            y += tallest + GEO.gapY;
        });

        var width  = widest + GEO.margin * 2;
        var height = y - GEO.gapY + GEO.margin;

        var svg = [];
        svg.push(arrowMarkers());

        edges.forEach(function (e) {
            var a = byId[e.from], b = byId[e.to];
            var forward = rank[b.id] > rank[a.id];
            var d, length;

            if (forward) {
                var y1 = a.y + a.h, y2 = b.y;
                var mid = (y1 + y2) / 2;
                d = 'M' + a.cx + ' ' + y1 + ' L' + a.cx + ' ' + mid +
                    ' L' + b.cx + ' ' + mid + ' L' + b.cx + ' ' + y2;
                length = Math.abs(y2 - y1) + Math.abs(b.cx - a.cx) + 20;
            } else {
                // Back edge, or a sideways edge inside one rank: out of the
                // right face, down or up the margin, back into the right face.
                var lane = Math.max(a.x + a.w, b.x + b.w) + GEO.gapX / 2;
                d = 'M' + (a.x + a.w) + ' ' + a.cy + ' L' + lane + ' ' + a.cy +
                    ' L' + lane + ' ' + b.cy + ' L' + (b.x + b.w) + ' ' + b.cy;
                length = Math.abs(a.cy - b.cy) + 120;
                width = Math.max(width, lane + GEO.margin);
            }

            svg.push('<g class="edge">' + drawPath(d, length, ' marker-end="url(#dg-arrow)"') +
                (e.label
                    ? '<text class="dg-edge-label" x="' +
                      (forward ? (a.cx + b.cx) / 2 : Math.max(a.x + a.w, b.x + b.w) + GEO.gapX / 2 + 6) +
                      '" y="' +
                      (forward ? (a.y + a.h + b.y) / 2 - 5 : (a.cy + b.cy) / 2) +
                      '" text-anchor="' + (forward ? 'middle' : 'start') + '">' + esc(e.label) + '</text>'
                    : '') +
            '</g>');
        });

        nodes.forEach(function (n) {
            svg.push('<g class="dg-node fade" data-kind="' + esc(n.kind) + '">' +
                '<rect x="' + n.x + '" y="' + n.y + '" width="' + n.w + '" height="' + n.h +
                '" rx="8"/>' +
                textBlock(n.lines, n.cx, n.cy, 'dg-node-label') +
            '</g>');
        });

        return frame(width, height, svg.join(''), config.title);
    }

    /* ======================================================================
       SEQUENCE — actors across the top, time downward

       The one diagram type where the corpus needs ordering to be visible:
       "the proxy is called, the proxy opens a transaction, the proxy calls
       the target" is a claim about order, and a flowchart states it badly.
       ====================================================================== */
    function sequence(config) {
        var actors = (config.actors || []).map(function (a) {
            var lines = wrap(a.label, 18);
            var size  = boxSize(lines);
            return { id: a.id, lines: lines, w: size.w, h: size.h };
        });
        if (!actors.length) return '';

        var byId = {};
        var x = GEO.margin;
        actors.forEach(function (a) {
            a.x = x; a.cx = x + a.w / 2; a.y = GEO.margin;
            byId[a.id] = a;
            x += a.w + GEO.gapX * 2;
        });

        var headH = Math.max.apply(null, actors.map(function (a) { return a.h; }));
        var messages = (config.messages || []).filter(function (m) {
            return byId[m.from] && byId[m.to];
        });

        var step  = 38;
        var top   = GEO.margin + headH + 26;
        var height = top + messages.length * step + GEO.margin + 10;
        var width  = x - GEO.gapX * 2 + GEO.margin;

        /* A self-call draws a loop to the RIGHT of its lifeline and hangs its
           label off that, so it can extend past the rightmost actor. The
           width has to account for it before anything is drawn — the svg now
           carries an intrinsic size, so anything past the edge is clipped
           rather than merely overflowing. This was clipping the label on the
           self-invocation diagram, which is the one where the label is the
           whole point. */
        messages.forEach(function (m) {
            if (m.from !== m.to || !byId[m.from]) return;
            var reach = byId[m.from].cx + 22 + 8 +
                        Math.round(String(m.label || '').length * GEO.charWidth);
            width = Math.max(width, reach + GEO.margin);
        });

        var svg = [arrowMarkers()];

        // Lifelines first, so every arrow sits on top of them.
        actors.forEach(function (a) {
            svg.push('<line class="dg-lifeline" x1="' + a.cx + '" y1="' + (a.y + a.h) +
                     '" x2="' + a.cx + '" y2="' + (height - GEO.margin) + '"/>');
        });

        actors.forEach(function (a) {
            svg.push('<g class="dg-node fade" data-kind="actor">' +
                '<rect x="' + a.x + '" y="' + a.y + '" width="' + a.w + '" height="' + a.h + '" rx="8"/>' +
                textBlock(a.lines, a.cx, a.y + a.h / 2, 'dg-node-label') +
            '</g>');
        });

        messages.forEach(function (m, i) {
            var a = byId[m.from], b = byId[m.to];
            var y = top + i * step;
            var kind = m.kind || 'call';
            var d, length, labelX, anchor;

            if (a.id === b.id) {
                // A self-call. This is the shape that renders the
                // self-invocation trap, so it has to be drawn honestly rather
                // than as a straight arrow to nowhere.
                var loop = 22;
                d = 'M' + a.cx + ' ' + (y - 8) + ' L' + (a.cx + loop) + ' ' + (y - 8) +
                    ' L' + (a.cx + loop) + ' ' + (y + 8) + ' L' + a.cx + ' ' + (y + 8);
                length = loop * 2 + 16;
                labelX = a.cx + loop + 8;
                anchor = 'start';
            } else {
                d = 'M' + a.cx + ' ' + y + ' L' + b.cx + ' ' + y;
                length = Math.abs(b.cx - a.cx);
                labelX = (a.cx + b.cx) / 2;
                anchor = 'middle';
            }

            svg.push('<g class="dg-message" data-kind="' + esc(kind) + '">' +
                drawPath(d, length, ' marker-end="url(#dg-arrow)"') +
                '<text class="dg-edge-label" x="' + labelX + '" y="' + (y - 6) +
                '" text-anchor="' + anchor + '">' + esc(m.label || '') + '</text>' +
            '</g>');
        });

        return frame(width, height, svg.join(''), config.title);
    }

    /* ======================================================================
       ANIMATION — a numbered timeline that draws itself once

       Deliberately the least clever of the three. An animation here is a
       sequence of labelled stops along a track, revealed left to right: the
       phases of a GC cycle, a request crossing the filter chain, the states
       of an entity. It animates because order is the content; it is a
       timeline rather than a simulation because a simulation would need a
       loop, a frame budget and a reduced-motion story of its own.
       ====================================================================== */
    function animation(config) {
        var steps = (config.steps || []).map(function (s, i) {
            var lines = wrap(s.label, 16);
            return { n: i + 1, lines: lines, caption: s.caption || '', w: Math.max(110, boxSize(lines).w) };
        });
        if (!steps.length) return '';

        var trackY = GEO.margin + 20;
        var x = GEO.margin;
        steps.forEach(function (s) { s.cx = x + s.w / 2; x += s.w + GEO.gapX; });

        var width  = x - GEO.gapX + GEO.margin;
        var capLines = steps.reduce(function (max, s) {
            return Math.max(max, wrap(s.caption, 20).length);
        }, 0);
        var height = trackY + 34 + 22 + capLines * GEO.lineHeight + GEO.margin;

        var svg = [arrowMarkers()];

        svg.push(drawPath(
            'M' + GEO.margin + ' ' + trackY + ' L' + (width - GEO.margin) + ' ' + trackY,
            width, '', 'dg-track'
        ));

        steps.forEach(function (s) {
            svg.push('<g class="dg-step fade">' +
                '<circle class="dg-step-dot" cx="' + s.cx + '" cy="' + trackY + '" r="11"/>' +
                '<text class="dg-step-n" x="' + s.cx + '" y="' + trackY +
                    '" text-anchor="middle" dominant-baseline="central">' + s.n + '</text>' +
                textBlock(s.lines, s.cx, trackY + 30 + ((s.lines.length - 1) * GEO.lineHeight) / 2, 'dg-node-label') +
                wrap(s.caption, 20).map(function (line, i) {
                    return '<text class="dg-caption" x="' + s.cx + '" y="' +
                           (trackY + 30 + s.lines.length * GEO.lineHeight + 8 + i * GEO.lineHeight) +
                           '" text-anchor="middle">' + esc(line) + '</text>';
                }).join('') +
            '</g>');
        });

        return frame(width, height, svg.join(''), config.title);
    }

    /* One arrowhead definition, referenced by both types that need one.
       It inherits currentColor so it is the same colour as the line it caps
       without either of them naming a colour. */
    function arrowMarkers() {
        return '<defs>' +
            '<marker id="dg-arrow" viewBox="0 0 10 10" refX="9" refY="5" ' +
                'markerWidth="6" markerHeight="6" orient="auto-start-reverse">' +
                '<path d="M0 0 L10 5 L0 10 z" fill="context-stroke"/>' +
            '</marker>' +
        '</defs>';
    }

    /* width and height are emitted ALONGSIDE the viewBox, which is what gives
       the svg an intrinsic size. With only a viewBox the element has no
       natural width, so a stylesheet asking for 100% stretches a 380-unit
       diagram across an 800px column and scales 12px labels to 25px — the
       diagram ends up shouting at the paragraph next to it.

       With both, components.css can say max-width:100% and height:auto: the
       diagram draws at the size it was laid out for, and only shrinks, never
       grows. preserveAspectRatio is left at its default, which is the
       behaviour that keeps it undistorted while it shrinks. */
    function frame(width, height, body, title) {
        var w = Math.ceil(width), h = Math.ceil(height);
        return '<svg viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" ' +
               'role="img"' + (title ? ' aria-label="' + esc(title) + '"' : '') + '>' +
               body + '</svg>';
    }

    var RENDERERS = { flowchart: flowchart, sequence: sequence, animation: animation };

    function render(type, config) {
        var fn = RENDERERS[type];
        if (!fn || !config) return '';
        try {
            return fn(config);
        } catch (e) {
            // A malformed config must not take the page down with it. The
            // validator is the place that catches this; here it costs one
            // diagram and nothing else.
            return '';
        }
    }

    /* Mounted AFTER the card is in the document, which is why renderQuestionCard
       leaves an empty sized container behind. Building the SVG up front would
       animate diagrams inside collapsed cards, where nobody sees them and the
       draw-on has already finished by the time the card opens. */
    function mount(container, type, config) {
        if (!container) return;
        var markup = render(type, config);
        if (!markup) { container.remove(); return; }
        container.innerHTML = markup;
    }

    function knows(type) {
        return Object.prototype.hasOwnProperty.call(RENDERERS, type);
    }

    return { render: render, mount: mount, knows: knows, GEO: GEO };
})();
