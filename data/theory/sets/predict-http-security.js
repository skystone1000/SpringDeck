/* ==========================================================================
   data/theory/sets/predict-http-security.js — Predict, set 9 of 11

   Six puzzles, every one artefact: 'http-response'. What is being predicted
   is a status code and a set of headers, not a printed line, so none of them
   is stdout and each carries a verification string naming the specification
   or the reference section its answer came from.

   THE STATUS CODE IS THE ANSWER, AND IT IS ALSO THE CONTRACT. Every one of
   these is a case where a service commonly returns the wrong one and nothing
   complains: 403 where 401 belongs, 500 where 400 belongs, 200 for a
   preflight that should have been refused. A wrong status is not cosmetic —
   it is the difference between a client that can retry with credentials and
   a client that gives up.

   FOUR OF THE SIX ARE FILTER-CHAIN QUESTIONS WEARING DIFFERENT CLOTHES. CORS,
   CSRF, authentication and the shape of a validation failure all depend on
   where in the chain the decision was made, and the set is ordered so that
   the chain is established before the puzzles that need it.
   ========================================================================== */

const predictHttpSecurityModule = {
    id: 'predict-http-security',
    trackId: 'output',
    order: 959,
    title: 'HTTP and Security',
    tagline: 'Six responses a service gets wrong without anything failing.',
    estimatedMinutes: 25,
    prerequisites: [],
    docHub: {
        title: 'Spring Security — Architecture',
        url: 'https://docs.spring.io/spring-security/reference/servlet/architecture.html'
    },

    chapters: [
        {
            id: 'before-the-controller',
            title: 'Decided Before the Controller',
            importance: 'must-know',
            summary: 'Three responses produced by a filter, which is why no breakpoint in the controller ever hits.',
            interviewAngle: 'The tell is whether the candidate reaches for the filter chain or for the controller. Everything in this chapter is decided before any handler method runs.',
            buildsOn: [],
            blocks: [
                {
                    type: 'predict',
                    id: 'predict-http-security-cors-preflight-rejected',
                    importance: 'must-know',
                    artefact: 'http-response',
                    language: 'http',
                    title: 'A preflight that never reaches your code',
                    prompt: '<p>The controller has <code>@CrossOrigin(origins = "https://app.example.com")</code>. The browser is on <code>https://other.example.com</code>. What does the browser get, and what does the server log?</p>',
                    code: 'OPTIONS /api/orders HTTP/1.1\nHost: api.example.com\nOrigin: https://other.example.com\nAccess-Control-Request-Method: POST\nAccess-Control-Request-Headers: content-type, authorization',
                    options: [
                        '403 Forbidden with no Access-Control-Allow-Origin, and the controller is never entered',
                        '200 OK with Access-Control-Allow-Origin: https://other.example.com',
                        '401 Unauthorized, because no credentials were sent',
                        '405 Method Not Allowed, because the controller has no OPTIONS mapping'
                    ],
                    answer: 0,
                    verification: 'Read from the Fetch Living Standard (CORS protocol, preflight) and the Spring Framework reference on CORS, which states that preflight requests are handled before the handler is invoked. Header set below is the documented shape, not a captured response.',
                    output: {
                        kind: 'trace',
                        lines: [
                            'HTTP/1.1 403 Forbidden',
                            'Vary: Origin, Access-Control-Request-Method, Access-Control-Request-Headers',
                            'Content-Length: 0',
                            '',
                            '-- no Access-Control-Allow-Origin header, which is what actually',
                            '-- fails the browser check. In the console:',
                            '   Access to fetch at \'https://api.example.com/api/orders\' from origin',
                            '   \'https://other.example.com\' has been blocked by CORS policy.'
                        ],
                        explain: '<p>A preflight is answered before dispatch, so no controller code runs and no breakpoint in it will ever be hit — which is why this is usually debugged in the wrong place. <strong>CORS is enforced by the browser, not by the server</strong>: the server simply declines to say the origin is allowed, and the browser refuses to hand the response to the script. <code>curl</code> from the same machine works perfectly, which is the observation that confuses people most. Note also that a CORS misconfiguration cannot be fixed by adding an <code>OPTIONS</code> mapping; the answer is the CORS configuration.</p>'
                    }
                },
                {
                    type: 'predict',
                    id: 'predict-http-security-csrf-blocks-a-stateless-post',
                    importance: 'must-know',
                    artefact: 'http-response',
                    language: 'http',
                    title: 'A POST with a valid bearer token and no CSRF token',
                    prompt: '<p>A fresh Spring Boot service with Spring Security on the classpath and no explicit <code>SecurityFilterChain</code> customisation. The client sends a valid JWT. What comes back?</p>',
                    code: 'POST /api/orders HTTP/1.1\nHost: api.example.com\nAuthorization: Bearer eyJhbGciOiJSUzI1NiIs...\nContent-Type: application/json\n\n{"sku":"TS-01","qty":2}',
                    options: [
                        '403 Forbidden — CSRF protection is on by default and no token was sent',
                        '201 Created — a bearer token is not a cookie, so CSRF does not apply',
                        '401 Unauthorized',
                        '415 Unsupported Media Type'
                    ],
                    answer: 0,
                    verification: 'Read from the Spring Security reference, "Cross Site Request Forgery (CSRF)", which states that CSRF protection is enabled by default and applies to POST, PUT, PATCH and DELETE. Not executed here: it requires a running filter chain.',
                    output: {
                        kind: 'trace',
                        lines: [
                            'HTTP/1.1 403 Forbidden',
                            'Content-Type: application/json',
                            '',
                            '{"status":403,"error":"Forbidden","path":"/api/orders"}',
                            '',
                            '-- CsrfFilter rejected it. The token was never validated,',
                            '-- and no controller method ran.'
                        ],
                        explain: '<p>CSRF protection is on by default and does not know or care that you authenticated with a header rather than a cookie. The 403 is confusing precisely because the credentials were fine. <strong>The correct fix is to disable CSRF for a genuinely stateless API and to understand why that is safe:</strong> the attack depends on the browser attaching a credential automatically, which is what a cookie does and what an <code>Authorization</code> header never does. Disabling it on a session-cookie API is not the same decision and is not safe.</p>'
                    }
                },
                {
                    type: 'predict',
                    id: 'predict-http-security-filter-order-changes-the-status',
                    importance: 'should-know',
                    artefact: 'http-response',
                    language: 'java',
                    title: 'The same filter, two positions',
                    prompt: '<p>A tenant-resolving filter throws when the header is missing. It is registered in two different positions. What does an unauthenticated request with no tenant header get in each case?</p>',
                    code: '// A: before authentication\nhttp.addFilterBefore(new TenantFilter(), BearerTokenAuthenticationFilter.class);\n\n// B: after authentication\nhttp.addFilterAfter(new TenantFilter(), BearerTokenAuthenticationFilter.class);\n\nclass TenantFilter extends OncePerRequestFilter {\n    protected void doFilterInternal(...) {\n        String tenant = request.getHeader("X-Tenant");\n        if (tenant == null) throw new MissingTenantException();\n        ...\n    }\n}',
                    options: [
                        'A gives 500 from the tenant filter; B gives 401, because authentication ran first and rejected the request',
                        'Both give 401',
                        'Both give 500',
                        'A gives 401 and B gives 500'
                    ],
                    answer: 0,
                    verification: 'Read from the Spring Security reference on the filter chain and on adding custom filters at a position. The exception-to-500 mapping is the servlet container default for an exception escaping a filter outside Spring Security\'s own exception translation. Not executed here.',
                    output: {
                        kind: 'trace',
                        lines: [
                            '-- A: TenantFilter runs first',
                            'HTTP/1.1 500 Internal Server Error',
                            '   MissingTenantException escaped the chain. An unauthenticated',
                            '   caller can make your service throw, which is a monitoring',
                            '   problem and an information-disclosure risk.',
                            '',
                            '-- B: BearerTokenAuthenticationFilter runs first',
                            'HTTP/1.1 401 Unauthorized',
                            'WWW-Authenticate: Bearer',
                            '   The request never reached TenantFilter.'
                        ],
                        explain: '<p>Filter order is not a detail — it decides which check gets to answer, and therefore which status the client sees. <strong>The general rule is to reject before you interpret</strong>: anything that can be refused on identity alone should run before anything that parses the request, so an anonymous caller cannot drive your custom code at all. Position A also means every scanner on the internet can fill your error dashboard with 500s, which is how this usually gets discovered.</p>'
                    }
                }
            ],
            docs: [
                { title: 'Spring Security — CSRF', url: 'https://docs.spring.io/spring-security/reference/servlet/exploits/csrf.html', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'the-right-status-code',
            title: 'The Right Status Code',
            importance: 'must-know',
            summary: 'Three responses whose status is routinely wrong, and each wrong one tells the client to do the wrong thing.',
            interviewAngle: '401-versus-403 is asked in almost every API design conversation, and the correct answer is one sentence that most candidates take three attempts to reach.',
            buildsOn: ['before-the-controller'],
            blocks: [
                {
                    type: 'predict',
                    id: 'predict-http-security-401-vs-403-which-one',
                    importance: 'must-know',
                    artefact: 'http-response',
                    language: 'http',
                    title: 'Three requests, three statuses',
                    prompt: '<p>The endpoint requires <code>SCOPE_orders:write</code>. Three requests arrive: no token; an expired token; a valid token whose scopes are <code>orders:read</code> only.</p>',
                    code: '# 1\nPOST /api/orders HTTP/1.1\n\n# 2\nPOST /api/orders HTTP/1.1\nAuthorization: Bearer <expired>\n\n# 3\nPOST /api/orders HTTP/1.1\nAuthorization: Bearer <valid, scope=orders:read>',
                    options: ['401, 401, 403', '401, 403, 403', '403, 403, 403', '401, 401, 401'],
                    answer: 0,
                    verification: 'Read from RFC 9110 sections 15.5.2 (401 Unauthorized) and 15.5.4 (403 Forbidden), and from RFC 6750 section 3 for the bearer-token error codes. Not executed here.',
                    output: {
                        kind: 'trace',
                        lines: [
                            '1 -> HTTP/1.1 401 Unauthorized',
                            '     WWW-Authenticate: Bearer',
                            '',
                            '2 -> HTTP/1.1 401 Unauthorized',
                            '     WWW-Authenticate: Bearer error="invalid_token",',
                            '       error_description="Jwt expired at 2026-10-08T09:00:00Z"',
                            '',
                            '3 -> HTTP/1.1 403 Forbidden',
                            '     WWW-Authenticate: Bearer error="insufficient_scope",',
                            '       scope="orders:write"'
                        ],
                        explain: '<p>One sentence: <strong>401 means "I do not know who you are — try again with credentials", 403 means "I know exactly who you are and the answer is no".</strong> That is why 401 is required to carry <code>WWW-Authenticate</code> and 403 is not: only the first is an invitation to retry. An expired token is 401 because refreshing it might work; a valid token missing a scope is 403 because retrying with the same token never will. Returning 403 for case 2 sends a client into a loop of not refreshing; returning 401 for case 3 sends it into a loop of refreshing a token that was never the problem.</p>'
                    }
                },
                {
                    type: 'predict',
                    id: 'predict-http-security-validation-failure-response-shape',
                    importance: 'must-know',
                    artefact: 'http-response',
                    language: 'http',
                    title: 'A bad field and a bad body',
                    prompt: '<p>The request record is <code>record CreateOrder(@NotBlank String sku, @Min(1) int qty)</code>. Two requests arrive: one with <code>qty: 0</code>, one with <code>qty: "abc"</code>. What is the status of each, on a Spring Boot 3 service with no <code>@RestControllerAdvice</code>?</p>',
                    code: '# 1\nPOST /api/orders  {"sku":"TS-01","qty":0}\n\n# 2\nPOST /api/orders  {"sku":"TS-01","qty":"abc"}',
                    options: [
                        'Both 400, but by two different mechanisms — one is bean validation after binding, the other is Jackson failing during binding',
                        '1 is 400 and 2 is 500',
                        '1 is 422 and 2 is 400',
                        'Both 500'
                    ],
                    answer: 0,
                    verification: 'Read from the Spring Framework reference, "Error Responses" (RFC 9457 problem details) and the default handling of MethodArgumentNotValidException and HttpMessageNotReadableException in ResponseEntityExceptionHandler. Not executed here.',
                    output: {
                        kind: 'trace',
                        lines: [
                            '1 -> 400  MethodArgumentNotValidException',
                            '     the body bound successfully, THEN @Min(1) failed',
                            '     {"type":"about:blank","title":"Bad Request","status":400,',
                            '      "detail":"Invalid request content."}',
                            '',
                            '2 -> 400  HttpMessageNotReadableException',
                            '     Jackson could not build the record at all; the controller',
                            '     method was never entered and no constraint ever ran',
                            '     {"type":"about:blank","title":"Bad Request","status":400,',
                            '      "detail":"Failed to read request"}'
                        ],
                        explain: '<p>Both are 400, which is right, and both default bodies are useless to a client — neither names the field. <strong>The two arrive through different paths and a handler that covers only the first leaves a hole</strong>: <code>@Valid</code> failures happen after binding and carry a <code>BindingResult</code> full of field errors; a type mismatch happens during binding and carries a Jackson exception instead. That is why the tier-3 error-shape drill insists on handling <code>HttpMessageNotReadableException</code> explicitly. Adding field detail to case 2 is deliberate work, because the exception knows the path but not your API\'s field naming.</p>'
                    }
                },
                {
                    type: 'predict',
                    id: 'predict-http-security-content-type-mismatch-415',
                    importance: 'should-know',
                    artefact: 'http-response',
                    language: 'http',
                    title: 'Two headers, two different failures',
                    prompt: '<p>The handler is <code>@PostMapping(consumes = "application/json", produces = "application/json")</code>. What does each of these return?</p>',
                    code: '# 1\nPOST /api/orders HTTP/1.1\nContent-Type: text/plain\nAccept: application/json\n\n# 2\nPOST /api/orders HTTP/1.1\nContent-Type: application/json\nAccept: application/xml',
                    options: [
                        '1 is 415 Unsupported Media Type; 2 is 406 Not Acceptable',
                        '1 is 406; 2 is 415',
                        'Both are 400 Bad Request',
                        '1 is 415; 2 is 200 with JSON anyway'
                    ],
                    answer: 0,
                    verification: 'Read from RFC 9110 sections 15.5.16 (415 Unsupported Media Type) and 15.5.7 (406 Not Acceptable), and the Spring Framework reference on consumes/produces conditions. Not executed here.',
                    output: {
                        kind: 'trace',
                        lines: [
                            '1 -> HTTP/1.1 415 Unsupported Media Type',
                            '     Accept-Post: application/json',
                            '     "I cannot read what you SENT."',
                            '',
                            '2 -> HTTP/1.1 406 Not Acceptable',
                            '     "I cannot produce what you ASKED FOR."'
                        ],
                        explain: '<p>The two are mirror images and the direction is the whole distinction: 415 is about the request body, 406 is about the response body. Both are decided by the handler-mapping conditions before your method runs, so neither is something a try/catch inside the controller can influence. <strong>The practical consequence is in the client library:</strong> a 415 means the caller is sending the wrong thing and will keep doing it, while a 406 often means a stale <code>Accept</code> header from a proxy or an SDK default — different bug, different owner, and a service that returns 400 for both has told the caller neither.</p>'
                    }
                }
            ],
            docs: [
                { title: 'RFC 9110 — HTTP semantics, status codes', url: 'https://www.rfc-editor.org/rfc/rfc9110#name-status-codes', kind: 'spec' }
            ],
            relatedQuestions: []
        }
    ]
};
