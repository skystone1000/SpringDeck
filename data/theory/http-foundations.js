/* ==========================================================================
   data/theory/http-foundations.js — module 34 in the reading path

   Eight chapters, and no prerequisites: this is the layer under the
   framework, and it is deliberately the first module of the web track. An
   engineer who cannot say which methods are idempotent will design an API
   that cannot be retried, and no amount of Spring knowledge compensates.
   ========================================================================== */

const httpFoundationsModule = {
    id: 'http-foundations',
    trackId: 'web-api',
    order: 34,
    title: 'HTTP, Properly',
    tagline: 'Status codes, idempotency, caching headers — the layer under the framework.',
    estimatedMinutes: 35,
    prerequisites: [],
    docHub: { title: 'MDN — HTTP', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP' },

    chapters: [
        {
            id: 'request-response-anatomy',
            title: 'What Is Actually on the Wire',
            importance: 'should-know',
            summary: 'A start line, headers, a blank line, a body. Everything a framework does to a request is a transformation of those four parts.',
            interviewAngle: 'Rarely asked outright, and it underpins every question that is. Knowing that headers are metadata and the body is opaque to HTTP itself explains why content negotiation, caching and compression all work the way they do.',
            buildsOn: [],
            blocks: [
                {
                    type: 'syntax',
                    language: 'http',
                    title: 'One request and one response, in full',
                    code: 'POST /api/invoices HTTP/1.1\nHost: billing.example.com\nContent-Type: application/json\nAccept: application/json\nAuthorization: Bearer <token>\nIdempotency-Key: 8f14e45f-ea8c-4f2b-9b9f-2c0d1e2a3b4c\nContent-Length: 52\n\n{"customerId":"c-991","amount":"42.50","currency":"EUR"}\n\nHTTP/1.1 201 Created\nLocation: /api/invoices/inv-8827\nContent-Type: application/json\nCache-Control: no-store\n\n{"id":"inv-8827","status":"DRAFT"}',
                    notes: '<p>Three things worth noticing. <code>Content-Type</code> describes what is being sent; <code>Accept</code> describes what is wanted back — they are not a pair and confusing them is common. <code>Location</code> on a 201 tells the client where the new resource is, and omitting it is the most frequently skipped part of a correct creation response.</p>'
                },
                {
                    type: 'types',
                    title: 'The four parts',
                    items: [
                        { name: 'The start line', html: '<p>Method, path and version on a request; version, status code and reason phrase on a response.</p>' },
                        { name: 'Headers', html: '<p>Metadata: what the body is, what the client accepts, who is calling, how it may be cached. Case-insensitive, and in HTTP/2 lowercase on the wire.</p>' },
                        { name: 'A blank line', html: '<p>The delimiter. This is why a stray newline in a hand-built response corrupts everything after it.</p>' },
                        { name: 'The body', html: '<p>Bytes. HTTP does not interpret them at all — <code>Content-Type</code> is a claim about them, and everything else is the application\'s problem.</p>' }
                    ]
                }
            ],
            docs: [
                { title: 'RFC 9110 — HTTP Semantics', url: 'https://www.rfc-editor.org/rfc/rfc9110.html', kind: 'spec' }
            ],
            relatedQuestions: []
        },

        {
            id: 'methods-and-safety',
            title: 'Safe, Idempotent, Cacheable',
            importance: 'must-know',
            summary: 'Three independent properties, not a hierarchy. Safe means no side effects, idempotent means repeating is harmless, cacheable means a response may be stored.',
            interviewAngle: 'Asked constantly, and usually answered with a partial definition. The discriminator is knowing that safe implies idempotent but not the reverse — DELETE is idempotent and very much not safe.',
            buildsOn: ['request-response-anatomy'],
            blocks: [
                {
                    type: 'definition',
                    term: 'Idempotent',
                    important: true,
                    html: '<p>A method is idempotent if making the request <em>N</em> times has the same effect on the server as making it once. It says nothing about the response — two <code>DELETE</code>s may return 204 and then 404 — only about the state left behind. This is the property that makes automatic retry safe, which is why it matters more than any other in this module.</p>'
                },
                {
                    type: 'table',
                    title: 'The methods',
                    headers: ['Method', 'Safe', 'Idempotent', 'Cacheable', 'Body'],
                    rows: [
                        ['<code>GET</code>', 'Yes', 'Yes', '<strong>Yes</strong>', 'No'],
                        ['<code>HEAD</code>', 'Yes', 'Yes', 'Yes', 'No'],
                        ['<code>OPTIONS</code>', 'Yes', 'Yes', 'No', 'No'],
                        ['<code>PUT</code>', 'No', '<strong>Yes</strong>', 'No', 'Yes'],
                        ['<code>DELETE</code>', 'No', '<strong>Yes</strong>', 'No', 'Rarely'],
                        ['<code>POST</code>', 'No', '<strong>No</strong>', 'Rarely', 'Yes'],
                        ['<code>PATCH</code>', 'No', '<strong>No</strong>, in general', 'No', 'Yes']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A <code>GET</code> with side effects breaks things you do not control.</strong> Browsers prefetch links, proxies cache responses, crawlers follow URLs, and a retry after a timeout is automatic in most clients. <code>GET /orders/8827/cancel</code> will eventually be called by something that was merely looking around. Safety is a promise made to infrastructure that has already been written on the assumption that you keep it.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The relationship worth stating: <em>"Safe implies idempotent, not the other way round. <code>DELETE</code> changes state, so it is not safe — but deleting twice leaves the same state as deleting once, so it is idempotent. And <code>PATCH</code> is idempotent only if the patch document is absolute; <code>{\'op\':\'increment\'}</code> is not."</em></p>'
                }
            ],
            docs: [
                { title: 'RFC 9110 §9.2 — Common Method Properties', url: 'https://www.rfc-editor.org/rfc/rfc9110.html#name-common-method-properties', kind: 'spec' }
            ],
            relatedQuestions: [
                { topicId: 'rest-api', questionId: 'http-methods-and-idempotency' }
            ]
        },

        {
            id: 'idempotency-of-methods',
            title: 'Making POST Retriable',
            importance: 'must-know',
            summary: 'POST is not idempotent, and networks fail after the server has already acted. An idempotency key turns a duplicate into a replay of the first response.',
            interviewAngle: 'A design-round staple, especially anywhere near payments. The scenario to be able to narrate is the timeout: the client does not know whether the charge happened, and neither retrying nor not retrying is safe without a key.',
            buildsOn: ['methods-and-safety'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>The problem is not that <code>POST</code> is badly designed. It is that a client which sends a request and receives nothing back cannot distinguish "the request never arrived" from "the request succeeded and the response was lost". Those need opposite actions, and the information to tell them apart does not exist on the client.</p><p>An <strong>idempotency key</strong> moves the decision to the server. The client generates a unique key per logical operation and sends it as a header; the server records the key alongside the result of the first request, and any later request with the same key returns that stored result instead of acting again. The retry becomes a replay.</p>'
                },
                {
                    type: 'diagram',
                    diagramType: 'sequence',
                    caption: 'The second request never reaches the business logic.',
                    diagramConfig: {
                        title: 'A retry with an idempotency key',
                        actors: [
                            { id: 'client', label: 'Client' },
                            { id: 'api',    label: 'Payments API' },
                            { id: 'store',  label: 'Key store' }
                        ],
                        messages: [
                            { from: 'client', to: 'api',    label: 'POST /charges, Idempotency-Key: K' },
                            { from: 'api',    to: 'store',  label: 'insert K — first time' },
                            { from: 'api',    to: 'client', label: '201 Created (response lost)', kind: 'return' },
                            { from: 'client', to: 'api',    label: 'the same POST, the same K' },
                            { from: 'api',    to: 'store',  label: 'K exists — read the stored result' },
                            { from: 'api',    to: 'client', label: '201 Created, the same body', kind: 'return' }
                        ]
                    }
                },
                {
                    type: 'types',
                    title: 'What a correct implementation has to handle',
                    items: [
                        { name: 'The key is stored atomically with the work', html: '<p>Inserting the key and doing the work must be one transaction, or a crash between them leaves a key claiming work that never happened.</p>' },
                        { name: 'A concurrent duplicate', html: '<p>Two retries can arrive at once. A unique constraint on the key is what makes the second one lose; catching that violation and waiting for the first is the correct behaviour.</p>' },
                        { name: 'The same key, a different body', html: '<p>A client bug. Respond <code>422</code> rather than replaying — silently returning the first result for a different request is worse than failing.</p>' },
                        { name: 'Expiry', html: '<p>Keys cannot be kept forever. Twenty-four hours is a common window, and it must be longer than the client\'s maximum retry horizon.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>There is a second, simpler answer worth knowing for the same problem: let the <em>client</em> choose the identifier and use <code>PUT</code>. <code>PUT /invoices/{clientGeneratedId}</code> is idempotent by construction and needs no key table at all. It works when the client can generate an id, which is often, and it is a better answer than a key store when it applies.</p>'
                }
            ],
            docs: [
                { title: 'IETF — The Idempotency-Key HTTP Header Field', url: 'https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/', kind: 'spec' }
            ],
            relatedQuestions: [
                { topicId: 'rest-api', questionId: 'http-methods-and-idempotency' }
            ]
        },

        {
            id: 'status-codes-that-matter',
            title: 'The Status Codes Worth Arguing About',
            importance: 'must-know',
            summary: 'The classes are easy. The pairs that get confused — 401 against 403, 400 against 422, 409 against 422 — are what an interview probes.',
            interviewAngle: 'Reciting classes is a warm-up. Being asked "the request is well-formed JSON but the customer does not exist — what do you return" is the real question, and it has a defensible answer either way as long as it is consistent.',
            buildsOn: ['methods-and-safety'],
            blocks: [
                {
                    type: 'types',
                    title: 'The pairs people get wrong',
                    items: [
                        { name: '401 or 403', html: '<p><strong>401 means "I do not know who you are"</strong> — no credentials, or invalid ones — and must carry a <code>WWW-Authenticate</code> header. <strong>403 means "I know who you are and you may not"</strong>. Re-authenticating fixes a 401 and never fixes a 403.</p>' },
                        { name: '400 or 422', html: '<p>400 for malformed input the parser rejected: broken JSON, a string where a number was required. 422 for well-formed input that fails a business rule. The distinction is whether the request could be understood.</p>' },
                        { name: '409 or 422', html: '<p>409 for a conflict with current <em>state</em> — a version mismatch, a duplicate key, an order already shipped. 422 for a problem with the payload itself. 409 is about the world; 422 is about the request.</p>' },
                        { name: '404 or 403', html: '<p>A deliberate choice. Returning 404 for a resource that exists but is not yours hides its existence, which is right for anything where the id is sensitive. Returning 403 is more honest and leaks the id space.</p>' },
                        { name: '502, 503 or 504', html: '<p>502 an upstream returned garbage; 503 <em>this</em> service is unavailable, and should carry <code>Retry-After</code>; 504 an upstream timed out. Clients retry these differently, so getting them right is not pedantry.</p>' }
                    ]
                },
                {
                    type: 'table',
                    title: 'The success codes worth using deliberately',
                    headers: ['Code', 'Use it when', 'Carries'],
                    rows: [
                        ['<code>200 OK</code>', 'A successful GET, or an update returning the result', 'A body'],
                        ['<code>201 Created</code>', 'A resource was created', '<strong><code>Location</code></strong>, and usually the resource'],
                        ['<code>202 Accepted</code>', 'Work was queued, not done', 'A way to check on it — a status URL'],
                        ['<code>204 No Content</code>', 'Success with nothing to say — a DELETE', '<strong>No body.</strong> Ever'],
                        ['<code>206 Partial Content</code>', 'A range request', 'The range served']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Returning 200 with an error inside the body defeats every layer above your code.</strong> Load balancers, retry policies, circuit breakers, dashboards and alerting all read the status code — an API that answers <code>200 {"success": false}</code> is invisible to all of them, and its error rate is permanently zero on every graph. The status code is the machine-readable part; the body is for humans and for detail.</p>'
                }
            ],
            docs: [
                { title: 'RFC 9110 §15 — Status Codes', url: 'https://www.rfc-editor.org/rfc/rfc9110.html#name-status-codes', kind: 'spec' }
            ],
            relatedQuestions: [
                { topicId: 'rest-api', questionId: 'status-codes-that-matter' }
            ]
        },

        {
            id: 'caching-headers-and-etags',
            title: 'Caching and ETags',
            importance: 'should-know',
            summary: 'Cache-Control decides whether a response may be stored and for how long. ETag and If-None-Match let a client revalidate cheaply, and If-Match makes an update conditional.',
            interviewAngle: 'The second half is the interesting one: an ETag plus If-Match is optimistic concurrency control over HTTP, and it is the same idea as a version column in JPA. Making that connection is worth more than reciting header names.',
            buildsOn: ['status-codes-that-matter'],
            blocks: [
                {
                    type: 'types',
                    title: 'The directives worth knowing',
                    items: [
                        { name: 'no-store', html: '<p>Do not write this anywhere. For anything genuinely sensitive.</p>' },
                        { name: 'no-cache', html: '<p><strong>Not the same as no-store.</strong> It may be stored, but must be revalidated before reuse. This is the one people mean when they say no-cache and get no-store.</p>' },
                        { name: 'private / public', html: '<p><code>private</code> means a browser may cache it but a shared proxy may not. Getting this wrong on a per-user response is how one customer sees another\'s data.</p>' },
                        { name: 'max-age=n', html: '<p>Fresh for n seconds. After that, revalidate.</p>' },
                        { name: 'stale-while-revalidate=n', html: '<p>Serve the stale copy and refresh in the background. Good for latency, at the cost of a bounded window of staleness.</p>' }
                    ]
                },
                {
                    type: 'syntax',
                    language: 'http',
                    title: 'Revalidation, and then a conditional update',
                    code: 'GET /api/invoices/inv-8827\nIf-None-Match: "v7"\n\nHTTP/1.1 304 Not Modified          <- no body. Bandwidth saved.\nETag: "v7"\n\n\nPUT /api/invoices/inv-8827\nIf-Match: "v7"                     <- only if it is still v7\nContent-Type: application/json\n\nHTTP/1.1 412 Precondition Failed   <- somebody else changed it first',
                    output: {
                        kind: 'trace',
                        lines: [
                            'If-None-Match on a GET asks "has this changed?" -- a 304 costs headers only, with no body at all.',
                            'If-Match on a PUT asks "is this still what I read?" and the server refuses with 412 if not.',
                            'That second exchange is optimistic locking: read a version, send it back, and let the server reject a write based on a stale read.',
                            'It is the same mechanism as a JPA @Version column, moved up to the protocol -- and it works across clients that share no database.'
                        ],
                        explain: '<p>412 is the status the lost-update problem produces when it is prevented properly, and returning it is what allows a client to re-read and retry rather than silently overwriting a change it never saw. Spring supports this directly: returning a <code>ResponseEntity</code> with an <code>eTag</code>, or using <code>ShallowEtagHeaderFilter</code> for the read side.</p>'
                    }
                },
                {
                    type: 'pitfall',
                    html: '<p><strong><code>ShallowEtagHeaderFilter</code> saves bandwidth and not work.</strong> It buffers the fully rendered response, hashes it, and returns 304 if the hash matches — which means every database query and every serialisation still happened. That is a real saving on a slow network and no saving at all on a loaded server. A genuine saving needs the ETag derived from something cheap, such as a version column read before the expensive work.</p>'
                }
            ],
            docs: [
                { title: 'RFC 9111 — HTTP Caching', url: 'https://www.rfc-editor.org/rfc/rfc9111.html', kind: 'spec' }
            ],
            relatedQuestions: []
        },

        {
            id: 'content-negotiation',
            title: 'Content Negotiation',
            importance: 'should-know',
            summary: 'The client says what it can accept and the server picks. Spring implements it through message converters, which is why returning an object produces JSON without anyone asking.',
            interviewAngle: 'Usually asked as "how does Spring turn my object into JSON". The chain is Accept header, then a content negotiation strategy, then a message converter — and naming that chain is the answer.',
            buildsOn: ['request-response-anatomy'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>The client sends <code>Accept: application/json, text/xml;q=0.8</code> — a list with quality weights. The server compares it against what it can produce for that handler and picks the best match, then sets <code>Content-Type</code> on the response to say what it chose. If nothing matches, the correct answer is <strong>406 Not Acceptable</strong>.</p><p>Spring resolves this through <code>HttpMessageConverter</code>s. Whichever converter can write the return type in an acceptable media type does the work — <code>MappingJackson2HttpMessageConverter</code> for JSON, which is present whenever Jackson is on the class path. That is the whole of "Spring returns JSON automatically".</p>'
                },
                {
                    type: 'types',
                    title: 'The negotiation strategies, in Spring\'s order of preference',
                    items: [
                        { name: 'The Accept header', html: '<p>The default and the correct one. It is what the mechanism is for.</p>' },
                        { name: 'A path extension', html: '<p><code>/invoices/8827.json</code>. <strong>Disabled by default since Spring 5.3</strong>, and for good reason — it interacts badly with path variables containing dots and has been a source of security issues.</p>' },
                        { name: 'A request parameter', html: '<p><code>?format=json</code>. Off by default; occasionally useful for a browser-testable API where the header cannot be set.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>Vendor media types are the version-in-the-header approach: <code>Accept: application/vnd.acme.invoice.v2+json</code>. It keeps the URL stable across versions, which is theoretically the cleanest form of API versioning and practically the hardest to test from a browser or a curl command written from memory. Know it exists; the versioning chapter weighs it against the alternatives.</p>'
                }
            ],
            docs: [
                { title: 'Content Negotiation', url: 'https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-config/content-negotiation.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'rest-api', questionId: 'content-negotiation' }
            ]
        },

        {
            id: 'keep-alive-and-connection-reuse',
            title: 'Connections Are Expensive',
            importance: 'should-know',
            summary: 'A new HTTPS connection costs a TCP handshake and a TLS handshake before a byte of application data moves. Reusing one is the largest easy win in a client.',
            interviewAngle: 'Comes up as "why is our service-to-service latency high". Connection pooling on the HTTP client is a frequent real answer, and one that many candidates never consider because the framework hides it.',
            buildsOn: ['request-response-anatomy'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>Opening a connection costs a round trip for the TCP handshake and one or two more for TLS. On a link with 40ms of latency that is 80–120ms before the request is sent. HTTP/1.1 keeps connections alive by default so the cost is paid once per connection rather than once per request — but only if the client actually pools them.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A <code>RestTemplate</code> on the default <code>SimpleClientHttpRequestFactory</code> uses <code>HttpURLConnection</code> and does no pooling worth the name.</strong> Every call pays the full handshake, and the symptom is a service-to-service latency floor that no amount of application profiling explains. Configuring it with Apache HttpClient or the JDK <code>HttpClient</code> and a connection pool is frequently the single largest latency improvement available. <code>RestClient</code> and <code>WebClient</code> both pool by default, which is one more reason to prefer them.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Two numbers to have opinions about on any pooled client: the maximum connections per route, and the idle eviction time. The second matters more than it sounds — a connection the server closed but the client still believes is open produces an intermittent, unreproducible connection reset, and evicting idle connections a little sooner than the server\'s own timeout is what prevents it.</p>'
                }
            ],
            docs: [
                { title: 'RFC 9112 — HTTP/1.1', url: 'https://www.rfc-editor.org/rfc/rfc9112.html', kind: 'spec' }
            ],
            relatedQuestions: []
        },

        {
            id: 'http2-and-http3-in-outline',
            title: 'HTTP/2 and HTTP/3, in Outline',
            importance: 'good-to-know',
            summary: 'HTTP/2 multiplexes many streams over one TCP connection. HTTP/3 moves to QUIC over UDP to escape head-of-line blocking at the transport layer.',
            interviewAngle: 'A breadth question. Knowing that HTTP/2 solved head-of-line blocking at the HTTP layer but not at the TCP layer, and that HTTP/3 exists to solve the remainder, is the level of detail expected.',
            buildsOn: ['keep-alive-and-connection-reuse'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'The three versions',
                    left: 'HTTP/1.1',
                    right: 'HTTP/2 and HTTP/3',
                    rows: [
                        { aspect: 'Concurrency', left: 'One request at a time per connection', right: 'Many multiplexed streams on one connection' },
                        { aspect: 'The workaround it removes', left: 'Six connections per host, domain sharding', right: 'Neither is needed, and sharding now hurts' },
                        { aspect: 'Headers', left: 'Plain text, repeated on every request', right: 'Binary, compressed (HPACK / QPACK)' },
                        { aspect: 'Head-of-line blocking', left: 'At the HTTP layer', right: 'HTTP/2: at the TCP layer. <strong>HTTP/3: gone</strong>' },
                        { aspect: 'Transport', left: 'TCP', right: 'HTTP/2 TCP; <strong>HTTP/3 QUIC over UDP</strong>' },
                        { aspect: 'Connection migration', left: 'No — a new IP means a new connection', right: 'HTTP/3 yes; a phone changing network keeps its session' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>The point most worth being able to make: HTTP/2 removed head-of-line blocking <em>within</em> HTTP but left it in TCP, because one lost packet still stalls every multiplexed stream on that connection. HTTP/3 moves to QUIC specifically so a lost packet stalls only the stream it belonged to. That single sentence covers most of what this question is looking for.</p>'
                }
            ],
            docs: [
                { title: 'RFC 9114 — HTTP/3', url: 'https://www.rfc-editor.org/rfc/rfc9114.html', kind: 'spec' }
            ],
            relatedQuestions: []
        }
    ]
};
