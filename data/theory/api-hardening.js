/* ==========================================================================
   data/theory/api-hardening.js — module 61 in the reading path

   The security track closes on the list interviewers quote. Ten chapters,
   and the selection is the plan's: CORS, CSRF, rate limits, input handling,
   injection, mass assignment, secrets, headers, the OWASP API top ten, and
   dependency risk.

   Two of these are corrections rather than instructions. CORS is a browser
   restriction that people describe as a server security feature, and saying
   so plainly is worth more than any configuration snippet. And CSRF on a
   stateless API is usually unnecessary — but for a reason that stops being
   true the moment the token moves into a cookie, which is exactly what the
   JWT module recommended.

   dependency-vulnerabilities appears here and in build-and-dependencies,
   from two directions: there it is a build concern, here it is an attack
   surface. The chapters are deliberately different and each says the thing
   its own module makes visible.
   ========================================================================== */

const apiHardeningModule = {
    id: 'api-hardening',
    trackId: 'security',
    order: 61,
    title: 'Hardening an API',
    tagline: 'CORS, CSRF, rate limits, secrets, and the OWASP list interviewers quote.',
    estimatedMinutes: 40,
    prerequisites: ['method-security'],
    docHub: { title: 'OWASP API Security Top 10', url: 'https://owasp.org/API-Security/editions/2023/en/0x00-header/' },

    chapters: [
        {
            id: 'cors-and-preflight',
            title: 'CORS Is a Browser Restriction',
            importance: 'must-know',
            summary: 'It relaxes the same-origin policy for browsers. It is not a server security control, and it stops nothing that is not a browser.',
            interviewAngle: 'The correction is the answer. A candidate who says "we use CORS to secure the API" has it backwards, and saying why is a clear signal.',
            buildsOn: [],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>Browsers enforce the <strong>same-origin policy</strong>: a page from <code>app.acme.com</code> may not read a response from <code>api.acme.com</code> unless that server says it may. CORS is the mechanism by which the server says so — a set of response headers the <em>browser</em> reads and acts on.</p><p>Two consequences follow, and both are commonly stated backwards. CORS <strong>grants</strong> access rather than restricting it: a wide-open configuration is permissive, not secure. And it protects nothing from a non-browser client — curl, a script, a mobile app and an attacker\'s server all ignore it entirely, because there is no browser to enforce it.</p>'
                },
                {
                    type: 'syntax',
                    language: 'http',
                    title: 'A preflight, which is the part that surprises people',
                    code: '# A "non-simple" request -- anything with a custom header, or a\n# content type other than form/text/plain -- is preceded by this:\nOPTIONS /api/orders HTTP/1.1\nOrigin: https://app.acme.com\nAccess-Control-Request-Method: POST\nAccess-Control-Request-Headers: authorization, content-type\n\n# Note: no credentials, no Authorization header, no CSRF token.\n# The server must answer it WITHOUT requiring authentication.\n\nHTTP/1.1 204 No Content\nAccess-Control-Allow-Origin: https://app.acme.com\nAccess-Control-Allow-Methods: GET, POST, PUT, DELETE\nAccess-Control-Allow-Headers: authorization, content-type\nAccess-Control-Allow-Credentials: true\nAccess-Control-Max-Age: 3600        # cache the preflight for an hour\n\n# Only then does the browser send the real POST.',
                    notes: '<p>The preflight carrying no credentials is why the filter ordering chapter insisted CORS must run before authentication. Get it wrong and the <code>OPTIONS</code> request is answered with a 401, the browser reports a CORS failure, and everybody inspects CORS configuration that is entirely correct.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong><code>Access-Control-Allow-Origin: *</code> together with <code>Allow-Credentials: true</code> is rejected by every browser</strong>, and the workaround people reach for is worse: reflecting the request\'s <code>Origin</code> header back. That turns any origin into an allowed origin while satisfying the credentials rule — so a malicious page can read authenticated responses from your API. Configure an explicit allow-list. If it must be dynamic, match against a pattern and validate, never echo.</p>'
                }
            ],
            docs: [
                { title: 'Spring — CORS', url: 'https://docs.spring.io/spring-framework/reference/web/webmvc-cors.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-security', questionId: 'cors-and-preflight' }
            ]
        },

        {
            id: 'csrf-and-stateless-apis',
            title: 'CSRF, and When to Turn It Off',
            importance: 'must-know',
            summary: 'CSRF exists because browsers attach cookies automatically. A bearer token in a header is not attached automatically, so a token API does not need it — until the token goes in a cookie.',
            interviewAngle: 'Everybody disables CSRF for an API and few can justify it. The justification is one sentence, and it has a condition attached that is easy to violate later.',
            buildsOn: ['cors-and-preflight'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>A cross-site request forgery works because a browser attaches cookies for <code>bank.com</code> to <em>any</em> request to <code>bank.com</code>, including one triggered by a form on <code>evil.com</code>. The victim\'s browser supplies the credential; the attacker only has to cause the request. The defence is a token the attacker cannot read because of the same-origin policy, echoed back in a header or a field.</p><p>A bearer token in an <code>Authorization</code> header is different: the browser never attaches it, so the attacker\'s page would have to read it and add it, which the same-origin policy prevents. <strong>That, and only that, is why <code>csrf.disable()</code> is correct for a token API.</strong></p>'
                },
                {
                    type: 'table',
                    title: 'When it is needed',
                    headers: ['Credential', 'Sent automatically?', 'CSRF protection'],
                    rows: [
                        ['Session cookie', 'Yes', '<strong>Required</strong>'],
                        ['JWT in an <code>Authorization</code> header', 'No', 'Not required'],
                        ['<strong>JWT in a cookie</strong>', '<strong>Yes</strong>', '<strong>Required — and this is the case people miss</strong>'],
                        ['HTTP Basic', 'Yes, by the browser after the first prompt', 'Required'],
                        ['mTLS', 'Yes', 'Required if a browser is involved']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>The JWT storage advice and the CSRF advice interact, and the interaction is easy to miss.</strong> The token module recommends an <code>HttpOnly</code> cookie over <code>localStorage</code>, because XSS cannot read it. The moment that is done, the token is sent automatically — and the <code>csrf.disable()</code> copied from the stateless-API template is now a hole. <code>SameSite=Lax</code> closes most of it; a CSRF token closes the rest. A configuration that was correct when written can be made wrong by a change somewhere else entirely.</p>'
                },
                {
                    type: 'tip',
                    html: '<p><code>SameSite</code> is worth knowing precisely. <code>Strict</code> means the cookie is never sent on any cross-site request, including a link from an email — which logs people out of the thing they clicked into. <code>Lax</code>, the modern browser default, sends it on top-level <code>GET</code> navigations and not on cross-site <code>POST</code>s, which blocks the classic forged form. <code>None</code> requires <code>Secure</code> and reopens the exposure, so it is for cookies that genuinely must cross sites.</p>'
                }
            ],
            docs: [
                { title: 'Spring Security — CSRF', url: 'https://docs.spring.io/spring-security/reference/servlet/exploits/csrf.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-security', questionId: 'csrf-on-a-stateless-api' }
            ]
        },

        {
            id: 'rate-limiting-at-the-edge',
            title: 'Rate Limiting',
            importance: 'should-know',
            summary: 'Bound how much any one caller can consume. Four algorithms, and the decision that matters more than the algorithm is what you key it on.',
            interviewAngle: 'The algorithm comparison is standard; the sharper question is the key, because keying on IP alone breaks behind a NAT and is trivially evaded with a proxy pool.',
            buildsOn: ['csrf-and-stateless-apis'],
            blocks: [
                {
                    type: 'table',
                    title: 'The four algorithms',
                    headers: ['Algorithm', 'How', 'Trade-off'],
                    rows: [
                        ['Fixed window', 'Count per calendar minute', 'Simplest. <strong>Allows 2× the limit across a boundary</strong> — full quota at 10:00:59 and again at 10:01:00'],
                        ['Sliding window log', 'Keep a timestamp per request', 'Exact, and memory grows with the limit'],
                        ['Sliding window counter', 'Weighted blend of this window and the last', 'Nearly exact, constant memory. <strong>The usual choice.</strong>'],
                        ['Token bucket', 'Tokens refill at a fixed rate; each request takes one', 'Allows a controlled burst, which is often what you want'],
                        ['Leaky bucket', 'A queue drained at a fixed rate', 'Smooths output; adds latency instead of rejecting']
                    ]
                },
                {
                    type: 'types',
                    title: 'What to key on, which matters more than the algorithm',
                    items: [
                        { name: 'API key or client id', html: '<p>The best key for a partner API: stable, attributable, and the limit is part of the contract.</p>' },
                        { name: 'Authenticated user id', html: '<p>The right key for a user-facing API. Fair, and unaffected by shared networks.</p>' },
                        { name: 'IP address', html: '<p>The only option before authentication, and weak: an office or a mobile carrier NAT shares one address, and an attacker rents a thousand. Use it for the login endpoint, with a generous limit.</p>' },
                        { name: 'A composite', html: '<p>User <em>and</em> endpoint, so an expensive report cannot be hammered while ordinary reads stay generous.</p>' },
                        { name: 'Account or tenant', html: '<p>The commercial unit. Stops one tenant\'s runaway loop degrading everyone else — this is the bulkhead argument, applied at the edge.</p>' }
                    ]
                },
                {
                    type: 'syntax',
                    language: 'http',
                    title: 'What a rejected request should say',
                    code: 'HTTP/1.1 429 Too Many Requests\nRetry-After: 30\nRateLimit-Limit: 100\nRateLimit-Remaining: 0\nRateLimit-Reset: 30\nContent-Type: application/problem+json\n\n{\n  "type": "https://api.acme.com/problems/rate-limited",\n  "title": "Rate limit exceeded",\n  "status": 429,\n  "detail": "100 requests per minute. Try again in 30 seconds."\n}\n\n# Retry-After is the important one: without it a well-behaved client\n# has to guess, and the usual guess is "immediately", which turns a\n# rate limit into a retry storm.',
                    notes: '<p>Enforce at the edge — a gateway or an ingress — so rejected traffic never reaches the application, and keep an in-application limiter as a second line for anything the edge cannot see. A limiter that runs after authentication, database lookups and business logic has already spent the resources it was supposed to protect.</p>'
                }
            ],
            docs: [
                { title: 'RFC 6585 §4 — 429 Too Many Requests', url: 'https://www.rfc-editor.org/rfc/rfc6585.html', kind: 'spec' }
            ],
            relatedQuestions: [
                { topicId: 'caching-scale', questionId: 'rate-limiting-algorithms' }
            ]
        },

        {
            id: 'input-validation-as-defence',
            title: 'Validation as a Security Control',
            importance: 'should-know',
            summary: 'Validation is usually framed as a correctness concern. It is also the cheapest denial-of-service defence there is: bounds on size, length and cardinality.',
            interviewAngle: 'The unbounded-collection case is the one worth naming — a request with a hundred thousand array elements costs nothing to send and a great deal to process.',
            buildsOn: ['rate-limiting-at-the-edge'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Bounds, not just formats',
                    code: 'record BulkImport(\n        @NotEmpty\n        @Size(max = 500)                       // <-- the DoS defence\n        List<@Valid LineItem> items,\n\n        @NotBlank @Size(max = 100) String reference,\n        @Pattern(regexp = "[A-Z]{3}") String currency) { }\n\nrecord LineItem(\n        @NotBlank @Size(max = 64) String sku,\n        @Positive @Max(10_000) int quantity) { }\n\n// And the bounds that are not annotations, because the request never\n// reaches a controller:\n//   server.tomcat.max-http-form-post-size=256KB\n//   server.max-http-request-header-size=16KB\n//   spring.servlet.multipart.max-file-size=10MB\n//   spring.servlet.multipart.max-request-size=20MB\n\n// Pagination is the same rule wearing different clothes:\nint size = Math.min(requested, MAX_PAGE_SIZE);   // never trust ?size=100000',
                    notes: '<p><code>@Size(max = 500)</code> on the list is the line that matters most and it is the one most often absent. Without it, a single well-formed request containing a hundred thousand items is accepted, deserialised, validated element by element and processed — and it costs the attacker one HTTP call.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A regular expression can itself be the vulnerability.</strong> Catastrophic backtracking — a pattern like nested quantifiers over an alternation — turns a forty-character input into seconds of CPU on one thread. A validation annotation containing such a pattern is a denial-of-service vector with an <code>@Pattern</code> on it. Prefer simple anchored patterns, bound the input length <em>before</em> matching, and treat any regex that came from a search result as unreviewed.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Allow-list rather than deny-list. "Letters, digits, hyphen, up to sixty-four characters" is a rule you can reason about completely; "must not contain <code>&lt;script&gt;</code>" is a game against an attacker with more encodings than you have exclusions. This is the same argument as the deserialisation filter in the I/O module — enumerate what is permitted, not what is forbidden.</p>'
                }
            ],
            docs: [
                { title: 'OWASP Input Validation Cheat Sheet', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'rest-api', questionId: 'bean-validation' },
                { topicId: 'rest-api', questionId: 'large-payloads-and-streaming' }
            ]
        },

        {
            id: 'sql-injection-and-parameterisation',
            title: 'Injection',
            importance: 'must-know',
            summary: 'A parameter is data and is never parsed as SQL. String concatenation makes it code. The rule is absolute, and the two places it cannot help are worth knowing.',
            interviewAngle: 'Everybody knows to parameterise. The depth is in the cases parameters cannot cover — identifiers and sort direction — and what to do there instead.',
            buildsOn: ['input-validation-as-defence'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The rule, and the two gaps',
                    code: '// VULNERABLE. The input becomes part of the statement.\njdbc.query("select * from orders where status = \'" + status + "\'", mapper);\n\n// SAFE. The driver sends the statement and the value separately; the\n// value is never parsed as SQL, whatever it contains.\njdbc.query("select * from orders where status = ?", mapper, status);\n\n// JPQL is parameterised too -- and can be concatenated just as badly.\nem.createQuery("select o from Order o where o.status = :status")\n  .setParameter("status", status);\n\n// GAP 1: an IDENTIFIER cannot be a parameter. Neither a column name\n// nor a table name nor a direction is bindable.\n//   "order by ?" -- not valid SQL\n// The only safe answer is an ALLOW-LIST, mapping an input token to a\n// literal you wrote:\nprivate static final Map<String, String> SORTABLE = Map.of(\n        "date",   "placed_at",\n        "total",  "total_minor",\n        "status", "status");\n\nString column = SORTABLE.get(requestedSort);\nif (column == null) throw new BadRequest("sort");\nString direction = "desc".equalsIgnoreCase(requestedDir) ? "DESC" : "ASC";\nString sql = "select * from orders order by " + column + " " + direction;\n\n// GAP 2: LIKE. The value binds safely, and % and _ inside it are still\n// wildcards -- so a search for "100%" matches far more than intended.\n// Escape them before binding.',
                    notes: '<p>The allow-list in gap 1 is doing something subtle and worth stating: the string that reaches the SQL is a literal from your own source, selected by the user\'s input rather than built from it. That distinction — <em>selected by</em> rather than <em>built from</em> — is the general form of the defence, and it applies equally to a dynamic table name, a chosen index hint, or a column list.</p>'
                },
                {
                    type: 'types',
                    title: 'The same shape, elsewhere',
                    items: [
                        { name: 'JPQL and HQL', html: '<p>Concatenating into a query string is injectable exactly as SQL is, and it is common because JPQL "feels" safer.</p>' },
                        { name: 'MongoDB', html: '<p>Operator injection: a JSON body containing <code>{"$ne": null}</code> where a scalar was expected turns an equality into "not null". Bind types, do not pass maps straight through.</p>' },
                        { name: 'LDAP and XPath', html: '<p>Same principle, different metacharacters. Both have escaping APIs; use them.</p>' },
                        { name: 'Shell commands', html: '<p>Never build a command string. <code>ProcessBuilder</code> with a list of arguments passes them without a shell parsing them.</p>' },
                        { name: 'Log entries', html: '<p>Log injection: a newline in user input forges a log line. Encode or strip control characters before logging user data.</p>' }
                    ]
                }
            ],
            docs: [
                { title: 'OWASP SQL Injection Prevention Cheat Sheet', url: 'https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'sql-databases', questionId: 'sql-injection' }
            ]
        },

        {
            id: 'mass-assignment',
            title: 'Mass Assignment',
            importance: 'must-know',
            summary: 'Binding a request body onto an entity lets a client set every field on it — including role, balance and status. The fix is a DTO that does not have those fields.',
            interviewAngle: 'The concrete security reason for the DTO-versus-entity decision from the architecture module, and it is the one that makes the argument unarguable.',
            buildsOn: ['sql-injection-and-parameterisation'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The vulnerability, and why the fix is structural',
                    code: '@Entity\nclass User {\n    @Id Long id;\n    String email;\n    String name;\n    boolean admin;          // <-- privilege\n    BigDecimal credit;      // <-- money\n}\n\n// VULNERABLE. Jackson sets every field it finds a match for.\n@PostMapping("/users")\nUser create(@RequestBody User user) {\n    return repository.save(user);\n}\n\n// The request that exploits it -- no tooling required:\n//   POST /users\n//   { "email": "a@b.com", "name": "A", "admin": true, "credit": 999999 }\n\n// SAFE, and safe by CONSTRUCTION rather than by a check. A field that\n// is not on the record cannot be set by any request, now or after\n// somebody adds a new column to the entity.\nrecord CreateUserRequest(@Email String email,\n                         @NotBlank @Size(max = 100) String name) { }\n\n@PostMapping("/users")\nUserResponse create(@RequestBody @Valid CreateUserRequest request) {\n    User user = new User(request.email(), request.name());   // admin = false\n    return UserResponse.from(repository.save(user));\n}',
                    notes: '<p>The word doing the work is <em>construction</em>. <code>@JsonIgnore</code> on <code>admin</code> also fixes today\'s bug and is opt-out: the next field added to the entity is exposed and writable by default, and nobody will remember. An inbound record is an allow-list that cannot silently grow.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>PATCH is where this comes back even with DTOs.</strong> A partial update needs to distinguish "field absent" from "field set to null", which usually means a map or an <code>Optional</code>-shaped DTO — and both reintroduce the question of which keys are permitted. Enumerate the patchable fields explicitly, or use JSON Merge Patch with a DTO whose shape is still an allow-list. A <code>Map&lt;String, Object&gt;</code> applied reflectively to an entity is mass assignment with extra steps.</p>'
                }
            ],
            docs: [
                { title: 'OWASP API3:2023 Broken Object Property Level Authorization', url: 'https://owasp.org/API-Security/editions/2023/en/0xa3-broken-object-property-level-authorization/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'rest-api', questionId: 'dto-vs-entity' },
                { topicId: 'rest-api', questionId: 'partial-update-patch' }
            ]
        },

        {
            id: 'secrets-management',
            title: 'Secrets',
            importance: 'must-know',
            summary: 'Not in the repository, not in the image, not in an environment variable if you can avoid it. Injected at run time, rotatable, and audited when read.',
            interviewAngle: 'The hierarchy is the answer, and the detail that shows experience is that a secret committed once is compromised permanently — rotation, not deletion, is the response.',
            buildsOn: ['mass-assignment'],
            blocks: [
                {
                    type: 'table',
                    title: 'Where a secret can live, worst to best',
                    headers: ['Location', 'Verdict', 'Why'],
                    rows: [
                        ['In <code>application.yml</code>, committed', '<strong>Never</strong>', 'In git history forever, and on every laptop that cloned it'],
                        ['Baked into the container image', 'Never', 'Anyone who can pull the image has it'],
                        ['An environment variable', 'Common; acceptable with care', 'Visible in <code>/proc</code>, in crash dumps, in <code>docker inspect</code>, and often in CI logs'],
                        ['A mounted file, from a Kubernetes Secret', 'Better', 'Not in the process environment; can be re-read on rotation'],
                        ['A secret manager — Vault, AWS Secrets Manager', '<strong>Best</strong>', 'Rotatable, audited, per-workload access, no static value to leak'],
                        ['A short-lived credential from workload identity', 'Best where available', 'There is no long-lived secret at all']
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>A secret that has been committed is compromised, and the response is <strong>rotation</strong> rather than deletion. Removing it in a later commit leaves it in the history; rewriting the history does not recall the clones, the forks, the CI caches or the mirrors. The only action that restores the property you wanted is issuing a new secret and invalidating the old one — and the second half of that is the part people forget.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Three cheap habits that prevent nearly all of it: a pre-commit secret scanner so a credential never reaches a commit; <code>${DB_PASSWORD}</code> placeholders in configuration so a real value has nowhere natural to sit; and a redacting log layout, because the most common way a secret escapes a well-configured system is being printed by a <code>toString()</code> somebody wrote for debugging.</p>'
                }
            ],
            docs: [
                { title: 'OWASP Secrets Management Cheat Sheet', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'cloud', questionId: 'managed-secrets' },
                { topicId: 'spring-boot', questionId: 'config-files-and-secrets' }
            ]
        },

        {
            id: 'security-headers',
            title: 'Response Headers',
            importance: 'should-know',
            summary: 'A handful of headers that instruct the browser to be stricter. Free to add, and mostly irrelevant to a pure JSON API — which is worth saying rather than reciting the list.',
            interviewAngle: 'The honest framing is the differentiator: these defend a browser rendering a document, so most of them do nothing for an API that only ever returns JSON.',
            buildsOn: ['secrets-management'],
            blocks: [
                {
                    type: 'table',
                    title: 'The headers, and whether they matter for an API',
                    headers: ['Header', 'What it does', 'For a JSON API'],
                    rows: [
                        ['<code>Strict-Transport-Security</code>', 'Forces HTTPS for the domain, for a stated period', '<strong>Yes.</strong> Prevents a downgrade on the first request after the first visit'],
                        ['<code>X-Content-Type-Options: nosniff</code>', 'Stops the browser guessing a content type', '<strong>Yes.</strong> Cheap, and blocks a JSON response being treated as script'],
                        ['<code>Content-Security-Policy</code>', 'Restricts what a page may load and execute', 'Only if you serve HTML. The strongest XSS defence there is.'],
                        ['<code>X-Frame-Options</code> / <code>frame-ancestors</code>', 'Blocks framing — clickjacking', 'Only for HTML'],
                        ['<code>Referrer-Policy</code>', 'Limits what is leaked in <code>Referer</code>', 'Only for HTML'],
                        ['<code>Cache-Control: no-store</code>', 'Keeps a response out of caches', '<strong>Yes</strong>, on anything containing personal data'],
                        ['<code>X-XSS-Protection</code>', 'A legacy browser filter', '<strong>No — obsolete and removed.</strong> Setting it is cargo cult']
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>Spring Security adds several of these by default — <code>nosniff</code>, <code>X-Frame-Options: DENY</code>, and cache-control headers — which is a good reason not to disable header writing wholesale when someone finds one of them inconvenient. The two worth adding deliberately for an API are HSTS with a long max-age, and <code>no-store</code> on responses carrying personal data.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>If the answer to "how do you prevent XSS" is a header, it is incomplete. CSP is a strong second line; the first line is <strong>contextual output encoding</strong> — and for an API returning JSON, the relevant fact is that the API is not where XSS happens. It happens where the value is rendered, so the defence lives in the front end, and an API can help by not being a store of unescaped markup.</p>'
                }
            ],
            docs: [
                { title: 'Spring Security — Security HTTP Response Headers', url: 'https://docs.spring.io/spring-security/reference/servlet/exploits/headers.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-security', questionId: 'security-headers' }
            ]
        },

        {
            id: 'owasp-api-top-10',
            title: 'The OWASP API Top Ten',
            importance: 'must-know',
            summary: 'The list interviewers quote. Three of the ten are authorization failures, which is the finding worth carrying away from it.',
            interviewAngle: 'Reciting ten items is weak. Naming the pattern — the top of the list is dominated by authorization, not by injection — and giving the defence for those, is strong.',
            buildsOn: ['security-headers'],
            blocks: [
                {
                    type: 'table',
                    title: 'The 2023 edition, and where each is addressed',
                    headers: ['#', 'Risk', 'Defence'],
                    rows: [
                        ['API1', 'Broken object level authorization (IDOR)', '<strong>Scope the query by the caller</strong> — the domain-object chapter'],
                        ['API2', 'Broken authentication', 'The whole of the auth-foundations and JWT modules'],
                        ['API3', 'Broken object property level authorization', 'Inbound and outbound DTOs — the mass-assignment chapter'],
                        ['API4', 'Unrestricted resource consumption', 'Rate limits, size bounds, pagination caps'],
                        ['API5', 'Broken function level authorization', 'Deny by default at the URL layer; method rules on the operation'],
                        ['API6', 'Unrestricted access to sensitive business flows', 'Bot detection, step-up authentication, per-flow limits'],
                        ['API7', 'Server-side request forgery', 'Allow-list outbound URLs; never fetch a user-supplied one'],
                        ['API8', 'Security misconfiguration', 'Deny-by-default, no debug endpoints, actuator secured'],
                        ['API9', 'Improper inventory management', 'Know your endpoints and your environments; retire old versions'],
                        ['API10', 'Unsafe consumption of third-party APIs', 'Validate what comes back; timeouts; do not trust an upstream body']
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>The observation worth making about this list is its shape. API1, API3 and API5 are all <strong>authorization</strong> failures, and they occupy first, third and fifth place. Injection — the risk that dominated the older application-level list — does not appear in the API top ten at all, because frameworks and parameterised queries largely solved it.</p><p>So the honest summary is that <em>API security is mostly authorization</em>, and authorization is mostly the question "is this row this caller\'s". That is not something a library fixes for you; it is a decision at every query.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>API7, server-side request forgery, is the one most often absent from a mental checklist and it is easy to introduce.</strong> A feature that fetches a user-supplied URL — a webhook registration, an avatar import, a link preview — lets a caller point your server at <code>169.254.169.254</code>, the cloud metadata endpoint, and read the instance credentials. The defences are an allow-list of destinations, resolving the hostname and rejecting private ranges <em>after</em> resolution, and an egress proxy. "We validate that it starts with https" is not one of them.</p>'
                }
            ],
            docs: [
                { title: 'OWASP API Security Top 10 — 2023', url: 'https://owasp.org/API-Security/editions/2023/en/0x00-header/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-security', questionId: 'owasp-api-top-ten' }
            ]
        },

        {
            id: 'dependency-vulnerabilities',
            title: 'The Code You Did Not Write',
            importance: 'should-know',
            summary: 'Most of what you deploy came from somewhere else. Two of the largest incidents in recent memory were a logging library and a serialisation gadget, and neither required a bug in application code.',
            interviewAngle: 'The build module covers the tooling. Here the point is the attack surface, and the practice that matters is upgrading regularly rather than scanning harder.',
            buildsOn: ['owasp-api-top-10'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>A Spring Boot service resolves well over a hundred artefacts, and a vulnerability in any of them is a vulnerability in the service. Two well-known examples make the point without needing details: a remote code execution reachable through a <em>logging</em> call, and the deserialisation gadget chains from the I/O module. In both, the exploited code was a dependency and the application code was correct.</p><p>That is why this chapter sits in the security track as well as in the build track. There, it is a build hygiene question. Here, it is the observation that <strong>your attack surface is not the code you wrote.</strong></p>'
                },
                {
                    type: 'types',
                    title: 'What actually reduces the risk, in order of effect',
                    items: [
                        { name: 'Upgrade on a schedule', html: '<p><strong>The highest-value habit.</strong> A project on the current Boot release picks up most fixes as ordinary maintenance. Three minors behind, they all arrive at once, under time pressure, in an upgrade that also changes behaviour.</p>' },
                        { name: 'Fewer dependencies', html: '<p>Every one is permanent attack surface. A utility library pulled in for one method is a poor trade.</p>' },
                        { name: 'Scan, and act on critical and high', html: '<p>Failing the build on everything gets the scanner muted. Suppressions carry a reason and an expiry.</p>' },
                        { name: 'Produce an SBOM', html: '<p>So "are we affected by this" is a query rather than an investigation — which is what decides how long the exposure window lasts.</p>' },
                        { name: 'Scan the image too', html: '<p>A vulnerable base-image library is invisible to a Maven plugin and just as exploitable.</p>' },
                        { name: 'Reduce what is reachable', html: '<p>A distroless or minimal base image with no shell removes the tools an attacker uses after getting in.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>The argument to make to a product owner, because this is usually a prioritisation problem rather than a technical one: <em>"A small upgrade every month is a day of work we schedule. A three-version upgrade under a CVE deadline is a week of work we do not, at a time we do not choose, with a behavioural change in it we have not tested. The cost is the same; only the control over when we pay it differs."</em></p>'
                }
            ],
            docs: [
                { title: 'OWASP A06:2021 Vulnerable and Outdated Components', url: 'https://owasp.org/Top10/A06_2021-Vulnerable_and_Outdated_Components/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'build-tools', questionId: 'dependency-vulnerabilities' },
                { topicId: 'java-io-time', questionId: 'why-java-serialization-is-a-hazard' }
            ]
        }
    ]
};
