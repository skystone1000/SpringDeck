/* ==========================================================================
   data/theory/rest-api-design.js — module 36 in the reading path

   Nine chapters, and this is a judgement module rather than a mechanism
   one. Almost every chapter here ends in a decision with more than one
   defensible answer, so the chapters are written to give the trade-off
   rather than the ruling — an interview at this level is testing whether
   you can argue a position, not whether you picked the same one.
   ========================================================================== */

const restApiDesignModule = {
    id: 'rest-api-design',
    trackId: 'web-api',
    order: 36,
    title: 'Designing a REST API',
    tagline: 'Resources, pagination, versioning, idempotency keys.',
    estimatedMinutes: 45,
    prerequisites: ['dispatcher-lifecycle'],
    docHub: { title: 'Spring — REST Web Services', url: 'https://spring.io/guides/gs/rest-service' },

    chapters: [
        {
            id: 'resource-modelling',
            title: 'Nouns, Not Verbs',
            importance: 'must-know',
            summary: 'A resource is a thing the API exposes; the method says what is being done to it. Most API design mistakes are a verb that ended up in the path.',
            interviewAngle: 'The opening design question. Anyone can recite "use nouns"; what is being probed is what you do when the operation genuinely is not CRUD, and the good answer is to model the action itself as a resource.',
            buildsOn: [],
            blocks: [
                {
                    type: 'table',
                    title: 'The shape, and the usual mistakes',
                    headers: ['Instead of', 'Prefer', 'Why'],
                    rows: [
                        ['<code>GET /getInvoices</code>', '<code>GET /invoices</code>', 'The method already says "get"'],
                        ['<code>POST /createInvoice</code>', '<code>POST /invoices</code>', 'Same'],
                        ['<code>POST /invoices/8827/delete</code>', '<code>DELETE /invoices/8827</code>', 'And this one becomes idempotent'],
                        ['<code>GET /invoice</code>', '<code>GET /invoices</code>', 'Plural collections, consistently — pick one and never mix'],
                        ['<code>GET /invoices/8827/lineItems/3</code>', 'The same', 'Nesting is right when the child cannot exist alone'],
                        ['<code>GET /customers/9/invoices/8827</code>', '<code>GET /invoices/8827</code>', 'An invoice has one id. Two paths to it is two things to maintain']
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>The hard case is an operation that is not create, read, update or delete: cancelling an order, retrying a payment, publishing a draft. Forcing it into <code>PATCH /orders/8827</code> with <code>{"status": "CANCELLED"}</code> is the usual attempt, and it is worse than it looks — it invites a client to set any status, it makes the transition rules invisible, and it cannot carry a reason or a side effect.</p><p>The better model is to make the action a resource: <code>POST /orders/8827/cancellations</code>. It has a body, so it can carry a reason. It is a thing, so it can be listed, audited and given an id. And it is a <code>POST</code>, which is honest about not being idempotent — or can be made so with an idempotency key.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Consistency beats correctness here, and it is worth saying so. An API where half the collections are plural and half are singular is harder to use than one that is uniformly wrong, because a client can learn a rule and cannot learn an exception list. If you inherit a convention, keep it.</p>'
                }
            ],
            docs: [
                { title: 'Building REST services with Spring', url: 'https://spring.io/guides/tutorials/rest', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'rest-api', questionId: 'resource-naming' }
            ]
        },

        {
            id: 'richardson-maturity',
            title: 'The Maturity Model, and Where to Stop',
            importance: 'should-know',
            summary: 'Four levels, from one endpoint to hypermedia. Almost every production API sits at level two, and that is usually the right call.',
            interviewAngle: 'Worth knowing by name because interviewers ask for it. The answer that shows judgement adds that level three is rarely worth it for an API whose clients are written by people who read the documentation.',
            buildsOn: ['resource-modelling'],
            blocks: [
                {
                    type: 'types',
                    title: 'The four levels',
                    items: [
                        { name: 'Level 0 — one URI', html: '<p>Everything posts to a single endpoint and the body says what to do. HTTP as a transport for RPC. SOAP lives here.</p>' },
                        { name: 'Level 1 — resources', html: '<p>Many URIs, one per thing. Still <code>POST</code> for everything.</p>' },
                        { name: 'Level 2 — HTTP verbs and status codes', html: '<p>Methods mean what they mean, status codes are used properly. <strong>Where nearly every real API sits</strong>, and the level "REST API" usually denotes in conversation.</p>' },
                        { name: 'Level 3 — hypermedia (HATEOAS)', html: '<p>Responses carry links describing what can be done next, so a client discovers transitions rather than hard-coding URLs.</p>' }
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>Level three is genuinely the design Fielding described, and it is uncommon for a reason worth being able to state: it pays off when clients are numerous, unknown and long-lived — a public API whose consumers you cannot coordinate with. It costs when clients are two internal services written by the team down the corridor, because the links add payload and complexity to solve a coupling problem those clients do not have.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The position to take, with the reason attached: <em>"Level two, and level three where the clients are external and I cannot coordinate a change with them. Hypermedia buys the ability to move a URL without breaking anyone, and that is only worth paying for when I actually cannot ring the people who would break."</em></p>'
                }
            ],
            docs: [
                { title: 'Spring HATEOAS', url: 'https://docs.spring.io/spring-hateoas/docs/current/reference/html/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'rest-api', questionId: 'hateoas-and-richardson' }
            ]
        },

        {
            id: 'pagination-strategies',
            title: 'Pagination',
            importance: 'must-know',
            summary: 'Offset pagination is simple, drifts under concurrent writes, and gets slower the deeper you go. Keyset pagination fixes both and cannot jump to page 40.',
            interviewAngle: 'A reliable senior question, because the offset problems are not obvious until someone has seen them. Being able to explain both the duplicate-row drift and the OFFSET 100000 cost is what distinguishes the answer.',
            buildsOn: ['resource-modelling'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'The two strategies',
                    left: 'Offset / page number',
                    right: 'Keyset / cursor',
                    rows: [
                        { aspect: 'Request', left: '<code>?page=3&amp;size=20</code>', right: '<code>?after=inv-8827&amp;size=20</code>' },
                        { aspect: 'SQL', left: '<code>LIMIT 20 OFFSET 60</code>', right: '<code>WHERE (created, id) &lt; (?, ?) LIMIT 20</code>' },
                        { aspect: 'Deep pages', left: '<strong>Slow.</strong> The database counts and discards every skipped row', right: 'Constant — it is an index seek' },
                        { aspect: 'Under concurrent inserts', left: '<strong>Rows repeat or are skipped</strong> as the offset shifts', right: 'Stable — the cursor is a position in the data' },
                        { aspect: 'Jump to page 40', left: 'Yes', right: '<strong>No</strong>' },
                        { aspect: 'A total count', left: 'Available, at the cost of a second query', right: 'Awkward, and usually omitted' },
                        { aspect: 'Right for', left: 'A page-numbered admin table over a small set', right: '<strong>Infinite scroll, feeds, exports, anything large</strong>' }
                    ]
                },
                {
                    type: 'syntax',
                    language: 'sql',
                    title: 'Why the deep offset is slow, and what replaces it',
                    code: '-- OFFSET does not skip work. It does the work and throws it away.\nSELECT * FROM invoices\nORDER BY created_at DESC, id DESC\nLIMIT 20 OFFSET 100000;      -- reads 100,020 rows to return 20\n\n-- Keyset: the WHERE clause is a seek into the same index.\nSELECT * FROM invoices\nWHERE (created_at, id) < (\'2026-08-01 09:14:22\', \'inv-8827\')\nORDER BY created_at DESC, id DESC\nLIMIT 20;                    -- reads 20 rows\n\n-- The tie-breaker on id is REQUIRED. Without it, rows sharing a\n-- created_at can be returned twice or skipped entirely.\nCREATE INDEX ON invoices (created_at DESC, id DESC);',
                    output: {
                        kind: 'trace',
                        lines: [
                            'Checked against PostgreSQL 16.',
                            'The row-comparison form (a, b) < (?, ?) is the one that uses a composite index directly; the expanded OR form usually does not, which is the most common way a keyset implementation ends up no faster than the offset it replaced.',
                            'The index has to match the ORDER BY, direction included, or the sort happens anyway and the seek advantage is lost.',
                            'The cursor is normally base64-encoded before being handed out, so clients cannot construct one and the internal columns stay internal.'
                        ],
                        explain: '<p>The drift problem is separate from the speed problem and worse. If ten rows are inserted at the top of the list while a client is reading page three, the rows that were at positions 60–79 are now at 70–89 — so page four repeats ten of them. On a paginated export, that is duplicated records in the output with nothing in any log to indicate it happened.</p>'
                    }
                },
                {
                    type: 'tip',
                    html: '<p>Spring Data returns <code>Page&lt;T&gt;</code> by default, which issues a second <code>COUNT(*)</code> query for the total. Returning <code>Slice&lt;T&gt;</code> instead skips the count and answers only "is there a next page" — which is all an infinite-scroll UI needs, and it halves the query count. Knowing that <code>Page</code> costs two queries is a small, concrete detail worth having.</p>'
                }
            ],
            docs: [
                { title: 'Spring Data — Paging and Sorting', url: 'https://docs.spring.io/spring-data/jpa/reference/repositories/query-methods-details.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'rest-api', questionId: 'pagination' }
            ]
        },

        {
            id: 'filtering-and-sorting',
            title: 'Filtering and Sorting',
            importance: 'good-to-know',
            summary: 'Query parameters, an allow-list, and a bound on what a client can ask for. The failure mode here is a full table scan requested by a stranger.',
            interviewAngle: 'Comes up as a follow-up to pagination. The point worth making is that every filterable field is a promise of an index, and every sortable field even more so.',
            buildsOn: ['pagination-strategies'],
            blocks: [
                {
                    type: 'pitfall',
                    html: '<p><strong>An unrestricted sort parameter is a denial-of-service vector.</strong> <code>?sort=notes,desc</code> on an unindexed text column makes the database sort the whole table, per request, and a handful of concurrent calls will take it down. Spring Data will happily bind any property name a client sends. Validate against an explicit allow-list of sortable fields, and cap <code>size</code> — a client asking for 100,000 rows should get 100, not 100,000.</p>'
                },
                {
                    type: 'types',
                    title: 'The decisions to make once, at the start',
                    items: [
                        { name: 'Flat parameters or a query language', html: '<p><code>?status=OPEN&amp;minAmount=100</code> is readable, cacheable and limited. An expression language — RSQL, or OData-style filters — is powerful and turns every query into something you cannot index for in advance.</p>' },
                        { name: 'An allow-list, always', html: '<p>Both for filters and for sorts. A field becomes filterable when someone adds an index for it, not when a client asks.</p>' },
                        { name: 'A default sort', html: '<p>Unsorted pagination is undefined: the database may return rows in any order, and "page 2" then means nothing. A deterministic default with a unique tie-breaker is required, not optional.</p>' },
                        { name: 'A maximum page size', html: '<p><code>spring.data.web.pageable.max-page-size</code>, or your own check. The default cap is 2000, which is high.</p>' }
                    ]
                }
            ],
            docs: [
                { title: 'Spring Data Web Support', url: 'https://docs.spring.io/spring-data/jpa/reference/repositories/core-extensions.html', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'api-versioning-strategies',
            title: 'Versioning',
            importance: 'must-know',
            summary: 'URL path, a header, or a vendor media type. The path is the least elegant and the most used, and there are good reasons for both halves of that.',
            interviewAngle: 'Always asked. The answer that lands names the three, picks one, and — most importantly — says that the best strategy is to avoid needing a new version by making additive changes.',
            buildsOn: ['richardson-maturity'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'Three places to put a version',
                    left: 'In the URL path',
                    right: 'In a header',
                    rows: [
                        { aspect: 'Looks like', left: '<code>/api/v2/invoices</code>', right: '<code>X-API-Version: 2</code>, or a vendor media type' },
                        { aspect: 'Visible in a browser or a log', left: '<strong>Yes</strong>', right: 'No' },
                        { aspect: 'Testable with a plain URL', left: 'Yes', right: 'No — needs a header set' },
                        { aspect: 'Cacheable by URL', left: 'Yes, naturally', right: 'Needs <code>Vary</code>, and gets it wrong sometimes' },
                        { aspect: 'Purist objection', left: 'The resource did not change, so the URI should not', right: 'None' },
                        { aspect: 'Routing at a gateway', left: 'Trivial', right: 'Possible, and more work' },
                        { aspect: 'In practice', left: '<strong>The most common by a wide margin</strong>', right: 'Chosen where URL stability matters' }
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>The framing that improves this answer is that versioning is a cost you pay for a breaking change, so the first question is whether the change has to break. Adding a field does not break a client that ignores unknown fields. Adding an optional parameter does not break anyone. Widening an enum breaks a client that switches exhaustively on it — which is why documenting "clients must tolerate unknown enum values" up front is worth more than any versioning scheme.</p>'
                },
                {
                    type: 'version',
                    title: 'Framework support arrived recently',
                    items: [
                        { version: 'Spring Framework 6.x', state: 'was', html: '<p>No first-class versioning. Teams hand-rolled it: a path prefix, or <code>@RequestMapping(headers = "X-API-Version=2")</code>.</p>' },
                        { version: 'Spring Framework 7.0', state: 'changed', html: '<p><strong>API versioning built in.</strong> A version can be resolved from a path segment, a header, a parameter or a media type, and mapped per handler — so both strategies are declarative and the choice is configuration.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>Have a deprecation story, because the follow-up is always "how do you retire v1". The concrete answer: announce a date, add a <code>Deprecation</code> and a <code>Sunset</code> header to v1 responses, measure who is still calling it, and contact them. Versioning without a retirement plan means running every version you have ever shipped, forever.</p>'
                }
            ],
            docs: [
                { title: 'Spring Framework — API Versioning', url: 'https://docs.spring.io/spring-framework/reference/web/webmvc.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'rest-api', questionId: 'api-versioning' }
            ]
        },

        {
            id: 'idempotency-keys',
            title: 'Idempotency Keys in an API Contract',
            importance: 'should-know',
            summary: 'The mechanism is in the HTTP module. What belongs in a design conversation is who generates the key, how long it lives, and what the API promises about it.',
            interviewAngle: 'The design-round half of the HTTP-module chapter. What is being assessed is whether the contract is specified — an idempotency key that is not documented is not a feature a client can rely on.',
            buildsOn: ['api-versioning-strategies'],
            blocks: [
                {
                    type: 'types',
                    title: 'What the contract has to state',
                    items: [
                        { name: 'Which endpoints honour it', html: '<p>Not all of them. Say which, in the documentation, per endpoint.</p>' },
                        { name: 'Who generates the key', html: '<p>The client, always — a server-generated key cannot survive the failure it exists for. A UUID per logical operation, not per HTTP attempt.</p>' },
                        { name: 'How long it is honoured', html: '<p>A stated window. Twenty-four hours is common; the number matters less than it being written down and longer than any client\'s retry policy.</p>' },
                        { name: 'What a mismatched body does', html: '<p>Same key, different payload. Say that it is a 422, and that no work happens.</p>' },
                        { name: 'What a concurrent duplicate does', html: '<p>409 while the first is in flight, or block and return the same result. Either is defensible; silence is not.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>The neat reframing worth offering: <em>"Wherever the client can generate the identifier, I would rather use <code>PUT</code> with a client-supplied id than a key table. It is idempotent by construction, there is nothing to expire, and the retry semantics fall out of HTTP rather than out of my code."</em></p>'
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
            id: 'bulk-and-batch-endpoints',
            title: 'Bulk Operations',
            importance: 'good-to-know',
            summary: 'A batch endpoint has to answer one awkward question: what happens when item 47 of 100 fails. All-or-nothing and partial success are both valid and mean different things.',
            interviewAngle: 'A good design discussion because there is no right answer. What is being looked for is that you noticed the question and specified an answer rather than leaving it to whatever the code happens to do.',
            buildsOn: ['resource-modelling'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'Two contracts for the same endpoint',
                    left: 'All-or-nothing',
                    right: 'Partial success',
                    rows: [
                        { aspect: 'On one failure', left: 'Nothing is applied', right: 'The other 99 are applied' },
                        { aspect: 'Status', left: '<code>400</code> or <code>422</code>, with the offending item', right: '<strong><code>207 Multi-Status</code></strong>, or 200 with per-item results' },
                        { aspect: 'Client retry', left: 'Resend everything', right: 'Resend only the failures — needs per-item ids' },
                        { aspect: 'Implementation', left: 'One transaction', right: 'Per-item transactions, and no rollback across them' },
                        { aspect: 'Right for', left: 'A set of changes that only makes sense together', right: 'An import of independent records' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Partial success inside a single <code>@Transactional</code> method does not work.</strong> One failure marks the transaction rollback-only, so the ninety-nine successes are discarded at commit and the client is told they succeeded. Partial success requires a transaction per item — which means the method that loops cannot be the transactional one, and the self-invocation rule from the AOP module applies directly: the per-item call has to go through the proxy.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Cap the batch size and say so in the documentation. An uncapped bulk endpoint is an easy way for a well-meaning client to send a hundred thousand items in one request, and the failure — a request timeout after twenty minutes of work that is then rolled back — is the worst of every world.</p>'
                }
            ],
            docs: [
                { title: 'RFC 4918 §13 — 207 Multi-Status', url: 'https://www.rfc-editor.org/rfc/rfc4918.html#section-13', kind: 'spec' }
            ],
            relatedQuestions: []
        },

        {
            id: 'long-running-operations',
            title: 'Work That Outlives the Request',
            importance: 'should-know',
            summary: '202 Accepted, a status resource, and polling. Holding a connection open for four minutes is not an option any load balancer will respect.',
            interviewAngle: 'A system-design question. The pattern is standard and knowing it by shape — accept, return a handle, poll — is enough, along with why the synchronous version fails.',
            buildsOn: ['bulk-and-batch-endpoints'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'http',
                    title: 'Accept, hand back a handle, poll',
                    code: 'POST /api/reports\nContent-Type: application/json\n\nHTTP/1.1 202 Accepted\nLocation: /api/reports/jobs/j-4471\nRetry-After: 5\n\n{"jobId":"j-4471","status":"PENDING"}\n\n\nGET /api/reports/jobs/j-4471\n\nHTTP/1.1 200 OK\n{"jobId":"j-4471","status":"RUNNING","progress":0.42}\n\n\nGET /api/reports/jobs/j-4471\n\nHTTP/1.1 303 See Other\nLocation: /api/reports/r-9920          <- the finished thing',
                    notes: '<p><code>Retry-After</code> tells a well-behaved client how long to wait, which is the difference between polling every five seconds and polling in a tight loop. The <code>303</code> at the end is a nice touch rather than a requirement: it points at the result rather than describing it, so the job resource never has to embed the report.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A synchronous long request will be killed by something you do not control.</strong> Load balancers idle out at 60 seconds by default, ingress controllers have their own limits, and a mobile network will drop the connection when the screen locks. Even when it works, the client cannot retry safely because it does not know how far the work got. The 202 pattern exists because holding the connection is not an option, not because it is tidier.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Two refinements worth mentioning if the discussion goes deeper: a webhook or an SSE stream removes the polling entirely where the client can receive one, and the job resource should be created in the same transaction as the queued work — otherwise a crash between the two leaves a job id that no worker will ever pick up.</p>'
                }
            ],
            docs: [
                { title: 'RFC 9110 §15.3.3 — 202 Accepted', url: 'https://www.rfc-editor.org/rfc/rfc9110.html#name-202-accepted', kind: 'spec' }
            ],
            relatedQuestions: []
        },

        {
            id: 'documenting-with-openapi',
            title: 'Documentation That Cannot Drift',
            importance: 'should-know',
            summary: 'Generated from the code or written first and generating the code. Either is fine; a document maintained separately from both is not.',
            interviewAngle: 'A short question with a design opinion attached. Design-first against code-first is a real trade-off and having a position on it is better than naming a library.',
            buildsOn: ['api-versioning-strategies'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'Two directions',
                    left: 'Code-first',
                    right: 'Design-first',
                    rows: [
                        { aspect: 'Source of truth', left: 'The controllers', right: 'The OpenAPI document' },
                        { aspect: 'Produced by', left: 'springdoc-openapi, at runtime', right: 'A generator, into interfaces and DTOs' },
                        { aspect: 'Cannot drift', left: 'True — it is read from the code', right: 'True — the code is read from it' },
                        { aspect: 'Consumers can start before the code', left: 'No', right: '<strong>Yes</strong>, from the contract' },
                        { aspect: 'Encourages', left: 'Shipping quickly', right: 'Agreeing the contract first' },
                        { aspect: 'Suits', left: 'One team owning both ends', right: 'Several teams, or an external consumer' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>Whichever direction, the thing to argue for is that <strong>the specification is generated from, or generates, the code</strong> — never maintained beside it. A hand-written document is accurate on the day it is written and misleading within a month, and a misleading contract is worse than none because clients act on it.</p>'
                }
            ],
            docs: [
                { title: 'springdoc-openapi', url: 'https://springdoc.org/', kind: 'guide' },
                { title: 'OpenAPI Specification', url: 'https://spec.openapis.org/oas/latest.html', kind: 'spec' }
            ],
            relatedQuestions: []
        }
    ]
};
