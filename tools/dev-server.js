#!/usr/bin/env node
/* ==========================================================================
   dev-server.js — a static file server, zero dependencies

   The application works from file:// and this server is a convenience, not a
   requirement. It exists because a couple of browser behaviours differ under
   file:// — localStorage throws in some, and the history API is fussier — and
   it is easier to check those against http:// than to reason about them.

   Node's http and fs, nothing else. If this file ever grows a dependency,
   something has gone wrong with the project rather than with the file.
   ========================================================================== */

'use strict';

const http = require('http');
const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT) || 4173;

const TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css':  'text/css; charset=utf-8',
    '.js':   'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg':  'image/svg+xml',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.webp': 'image/webp',
    '.ico':  'image/x-icon',
    '.woff2':'font/woff2',
    '.md':   'text/markdown; charset=utf-8'
};

http.createServer((req, res) => {
    // Strip the query and the hash; neither addresses a file.
    const requested = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
    const relative  = requested === '/' ? '/index.html' : requested;
    const target    = path.join(ROOT, relative);

    // Refuse anything that escapes the repository root. A dev server is still
    // a server, and `..` is still `..`.
    if (!target.startsWith(ROOT)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        return res.end('Forbidden');
    }

    fs.readFile(target, (err, body) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            return res.end('Not found: ' + relative);
        }
        res.writeHead(200, {
            'Content-Type': TYPES[path.extname(target).toLowerCase()] || 'application/octet-stream',
            // No caching. Every reload should show the edit that was just made.
            'Cache-Control': 'no-store'
        });
        res.end(body);
    });
}).listen(PORT, () => {
    console.log(`SpringDeck  →  http://localhost:${PORT}`);
    console.log(`serving      ${ROOT}`);
    console.log('Ctrl-C to stop.');
});
