/* ==========================================================================
   data/rest-api.js — REST APIs & Spring MVC

   Thirty questions in four subsections. The web layer is where the largest
   number of decisions get made by default and then defended in a code review,
   so the answers here are written to give a reason rather than a convention.

   ONE GLOBAL PER FILE.
   ========================================================================== */

const restApiData = {
    id: 'rest-api',
    title: 'REST APIs & Spring MVC',
    subsections: [
        { id: 'mvc',    title: 'MVC & the Request Lifecycle' },
        { id: 'design', title: 'API Design' },
        { id: 'errors', title: 'Validation & Error Handling' },
        { id: 'json',   title: 'Jackson & Serialization' }
    ],
    keyTopics: [
        'DispatcherServlet', 'HandlerMapping', '@RestController',
        'filters vs interceptors', 'content negotiation', 'HTTP status codes',
        'idempotent methods', 'pagination', 'API versioning',
        '@ControllerAdvice', 'Bean Validation', 'ProblemDetail',
        'Jackson annotations'
    ],
    questions: [

/* ==== MVC & the Request Lifecycle ===================================== */

{
    id: 'dispatcherservlet-lifecycle',
    importance: 'must-know',
    subsection: 'mvc',
    question: 'Walk through what happens between an HTTP request arriving and a JSON response leaving.',
    answer:
        '<p>The request reaches the servlet container, passes through the filter chain, and ' +
        'arrives at <code>DispatcherServlet</code> — the front controller. From there:</p>' +
        '<ul>' +
        '<li><strong><code>HandlerMapping</code></strong> resolves the request to a handler. For ' +
        'annotated controllers this is <code>RequestMappingHandlerMapping</code>, which matches ' +
        'on path, method, headers, params, consumes and produces.</li>' +
        '<li><strong><code>HandlerInterceptor</code>s</strong> run their ' +
        '<code>preHandle</code>. Returning false here stops the request.</li>' +
        '<li><strong><code>HandlerAdapter</code></strong> invokes the method. Before it can, ' +
        '<code>HandlerMethodArgumentResolver</code>s build every parameter — ' +
        '<code>@PathVariable</code>, <code>@RequestParam</code>, ' +
        '<code>@RequestBody</code> (which runs an <code>HttpMessageConverter</code>), ' +
        '<code>Authentication</code>, <code>Pageable</code>. Validation runs here for anything ' +
        'annotated <code>@Valid</code>.</li>' +
        '<li><strong>The controller method runs.</strong></li>' +
        '<li><strong><code>HandlerMethodReturnValueHandler</code></strong> processes the result. ' +
        'For <code>@ResponseBody</code> — which <code>@RestController</code> implies — it ' +
        'selects an <code>HttpMessageConverter</code> by content negotiation and writes the ' +
        'body. Otherwise a <code>ViewResolver</code> renders a view.</li>' +
        '<li><strong><code>postHandle</code>, then the response commits, then ' +
        '<code>afterCompletion</code>.</strong></li>' +
        '</ul>' +
        '<p>An exception anywhere in the handler goes to a ' +
        '<code>HandlerExceptionResolver</code>, which is where ' +
        '<code>@ExceptionHandler</code> and <code>@ControllerAdvice</code> are consulted.</p>' +
        '<p>The two details that pay off in debugging: <strong>filters are outside all of ' +
        'this</strong>, so an exception thrown in a filter never reaches ' +
        '<code>@ControllerAdvice</code> and produces the container\'s default error page ' +
        'instead. And <strong>once the response is committed nothing can change the status</strong> ' +
        '— which is why an exception thrown while streaming a large body cannot be turned into a ' +
        '500.</p>',
    referenceLinks: [
        { title: 'DispatcherServlet — Spring Framework Reference', url: 'https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-servlet.html' }
    ],
    tags: ['spring-mvc', 'dispatcherservlet', 'request-lifecycle'],
    images: [],
    hasDiagram: true,
    diagramType: 'animation',
    diagramConfig: {
        title: 'A request through Spring MVC',
        steps: [
            { label: 'Filter chain',    caption: 'outside MVC' },
            { label: 'HandlerMapping',  caption: 'which method' },
            { label: 'preHandle',       caption: 'interceptors' },
            { label: 'Argument resolvers', caption: 'body, params, validation' },
            { label: 'Controller',      caption: 'your code' },
            { label: 'Message converter', caption: 'object to JSON' },
            { label: 'afterCompletion', caption: 'response committed' }
        ]
    },
    codeSnippets: []
},

{
    id: 'filters-vs-interceptors',
    importance: 'must-know',
    subsection: 'mvc',
    question: 'When do you use a Filter and when a HandlerInterceptor?',
    answer:
        '<p>A <strong><code>Filter</code></strong> is a servlet-specification component. It sits ' +
        'outside Spring MVC entirely, sees <em>every</em> request including static resources and ' +
        'forwarded error dispatches, and can wrap or replace the request and response objects. ' +
        'It has no idea which controller will handle the request.</p>' +
        '<p>A <strong><code>HandlerInterceptor</code></strong> runs inside ' +
        '<code>DispatcherServlet</code>, so it knows the resolved handler and can inspect its ' +
        'annotations. It has three hooks — before the handler, after the handler but before the ' +
        'view, and after everything including on exception.</p>' +
        '<p><strong>Use a filter</strong> for: correlation ids, request and response logging, ' +
        'authentication, CORS, compression, rate limiting, anything that must apply to every ' +
        'request, and anything that needs to wrap the response stream.</p>' +
        '<p><strong>Use an interceptor</strong> for: behaviour that depends on the handler — ' +
        'checking a custom annotation on the controller method, populating a model attribute, ' +
        'per-endpoint timing.</p>' +
        '<p>Two practical facts. <strong>Spring Security is filters</strong>, so anything that ' +
        'must run before or after security is a filter, ordered relative to the security chain. ' +
        'And <strong>an exception in a filter does not reach ' +
        '<code>@ControllerAdvice</code></strong>, because the advice lives inside the dispatcher ' +
        'that the filter has not called yet — so a filter that can fail needs its own error ' +
        'handling, or the client gets an HTML error page from the container where every other ' +
        'error is JSON.</p>' +
        '<p>Prefer <code>OncePerRequestFilter</code> over a bare <code>Filter</code>: it ' +
        'guarantees a single execution across forwards and async dispatches, which a plain ' +
        'filter does not.</p>',
    referenceLinks: [
        { title: 'Filters — Spring Framework Reference', url: 'https://docs.spring.io/spring-framework/reference/web/webmvc/filters.html' }
    ],
    tags: ['spring-mvc', 'filters', 'interceptors'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'controller-vs-restcontroller',
    importance: 'should-know',
    subsection: 'mvc',
    question: 'What is the difference between @Controller and @RestController?',
    answer:
        '<p><code>@RestController</code> is <code>@Controller</code> plus ' +
        '<code>@ResponseBody</code> applied to every method. That is the whole difference, and ' +
        'it is a good illustration of Spring\'s meta-annotation mechanism.</p>' +
        '<p><code>@ResponseBody</code> means the return value is written to the response body by ' +
        'an <code>HttpMessageConverter</code> rather than being treated as a view name. Without ' +
        'it, returning the string <code>"orders"</code> from a controller asks a ' +
        '<code>ViewResolver</code> for a template called <code>orders</code> — which is why a ' +
        'plain <code>@Controller</code> returning a string produces a 404 for a missing view ' +
        'rather than the text you expected.</p>' +
        '<p>Use <code>@Controller</code> when the application renders server-side templates, or ' +
        'when a single controller mixes views and JSON endpoints, in which case ' +
        '<code>@ResponseBody</code> goes on the individual methods.</p>' +
        '<p>Related return-type choices worth knowing:</p>' +
        '<ul>' +
        '<li><strong>A plain object</strong> — serialised, status 200.</li>' +
        '<li><strong><code>ResponseEntity&lt;T&gt;</code></strong> — full control over status, ' +
        'headers and body. Necessary for 201 with a <code>Location</code> header, for 204, and ' +
        'for conditional responses.</li>' +
        '<li><strong><code>void</code> with <code>@ResponseStatus</code></strong> — a clean 204 ' +
        'for a delete.</li>' +
        '<li><strong><code>Optional&lt;T&gt;</code></strong> — Spring turns an empty one into ' +
        'a 404, which removes a common if-statement.</li>' +
        '</ul>',
    referenceLinks: [
        { title: 'Spring Web MVC — @ResponseBody', url: 'https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-methods/responsebody.html' }
    ],
    tags: ['spring-mvc', 'controllers', 'annotations'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'content-negotiation',
    importance: 'should-know',
    subsection: 'mvc',
    question: 'How does Spring decide what format to return?',
    answer:
        '<p>Content negotiation. <code>ContentNegotiationManager</code> determines the requested ' +
        'media types, and Spring picks the first <code>HttpMessageConverter</code> that can ' +
        'write the return type in one of them.</p>' +
        '<p>The strategies, in the default order:</p>' +
        '<ul>' +
        '<li><strong>The <code>Accept</code> header</strong>, respecting its quality values. ' +
        'This is the correct HTTP mechanism and the default.</li>' +
        '<li><strong>A path extension</strong> — disabled by default in Spring 5.3 onwards and ' +
        'removed since, because it created a security problem: a request for ' +
        '<code>/orders/1.json</code> could bypass path-based security rules written for ' +
        '<code>/orders/1</code>.</li>' +
        '<li><strong>A request parameter</strong> such as <code>?format=json</code>, off by ' +
        'default and easy to enable. Useful for browser testing.</li>' +
        '</ul>' +
        '<p><code>produces</code> and <code>consumes</code> on a mapping narrow it: ' +
        '<code>produces = APPLICATION_JSON_VALUE</code> means the handler is only selected for ' +
        'requests that accept JSON, and a mismatch is a <strong>406 Not Acceptable</strong> ' +
        'rather than a 404. Similarly <code>consumes</code> mismatches give ' +
        '<strong>415 Unsupported Media Type</strong>. Those two status codes are a strong ' +
        'diagnostic — they mean routing worked and the media types did not.</p>' +
        '<p>A practical note that saves an afternoon: <strong>a missing or wrong ' +
        '<code>Content-Type</code> on a request with a body gives 415</strong>, and clients that ' +
        'omit it are common. And if Jackson is not on the classpath there is no JSON converter ' +
        'at all, so every response is a 406 — which looks like a routing problem and is a ' +
        'dependency problem.</p>',
    referenceLinks: [
        { title: 'Content Negotiation — Spring Framework Reference', url: 'https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-config/content-negotiation.html' }
    ],
    tags: ['spring-mvc', 'content-negotiation', 'http'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'request-parameter-binding',
    importance: 'should-know',
    subsection: 'mvc',
    question: 'What is the difference between @RequestParam, @PathVariable, @RequestBody and @ModelAttribute?',
    answer:
        '<ul>' +
        '<li><strong><code>@PathVariable</code></strong> — a segment of the URI path, bound by ' +
        'name from the mapping template. Use it for the identity of the resource.</li>' +
        '<li><strong><code>@RequestParam</code></strong> — a query-string parameter, or a form ' +
        'field in a <code>application/x-www-form-urlencoded</code> body. Use it for filtering, ' +
        'sorting and options.</li>' +
        '<li><strong><code>@RequestBody</code></strong> — the whole request body, deserialised ' +
        'by an <code>HttpMessageConverter</code>. One per method, because there is one body.</li>' +
        '<li><strong><code>@ModelAttribute</code></strong> — builds an object from request ' +
        'parameters rather than from the body. This is the form-submission binding, and it is ' +
        'also the way to bind several query parameters into one object in a REST API.</li>' +
        '</ul>' +
        '<p>Details that come up:</p>' +
        '<ul>' +
        '<li><code>@RequestParam</code> is <strong>required by default</strong>; a missing one ' +
        'is a 400. Use <code>required = false</code>, a <code>defaultValue</code>, or an ' +
        '<code>Optional</code> parameter type.</li>' +
        '<li>Any of these can be a record, and constructor binding works — which makes an ' +
        'immutable request DTO natural.</li>' +
        '<li><strong>Parameter names come from the class file</strong>, so a build without ' +
        '<code>-parameters</code> loses them and the binding fails at runtime with a message ' +
        'about needing the flag. Spring Boot\'s parent POM sets it; a hand-rolled build often ' +
        'does not.</li>' +
        '<li><strong><code>@ModelAttribute</code> binds every matching parameter</strong>, ' +
        'including ones you did not intend — mass assignment. If the bound object is an entity, ' +
        'a caller can set fields you never exposed. Bind to a purpose-built DTO, or use ' +
        '<code>setAllowedFields</code> on the binder.</li>' +
        '</ul>',
    referenceLinks: [
        { title: 'Handler Methods — Spring Framework Reference', url: 'https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-methods.html' }
    ],
    tags: ['spring-mvc', 'binding', 'controllers', 'security'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'async-controller-methods',
    importance: 'good-to-know',
    subsection: 'mvc',
    question: 'What do you get by returning a Callable, DeferredResult or SseEmitter from a controller?',
    answer:
        '<p>You release the servlet container thread while the work happens. The request enters ' +
        'async mode, the container thread returns to its pool, and the response is written later ' +
        'from another thread.</p>' +
        '<ul>' +
        '<li><strong><code>Callable&lt;T&gt;</code></strong> — Spring runs it on a configured ' +
        '<code>TaskExecutor</code> and writes the result. Simple, and it moves the blocking ' +
        'rather than removing it.</li>' +
        '<li><strong><code>DeferredResult&lt;T&gt;</code></strong> — you keep the object and ' +
        'complete it from anywhere, at any time. This is the long-polling and ' +
        'callback-completion shape: a message arrives on a queue and completes the pending ' +
        'request.</li>' +
        '<li><strong><code>CompletableFuture&lt;T&gt;</code></strong> — the same idea with the ' +
        'standard type, and the one to reach for.</li>' +
        '<li><strong><code>SseEmitter</code></strong> — server-sent events, a stream of ' +
        'messages over one long-lived response.</li>' +
        '<li><strong><code>StreamingResponseBody</code></strong> — write raw bytes progressively, ' +
        'for a large download without buffering it in memory.</li>' +
        '</ul>' +
        '<p><strong>Virtual threads change the calculus.</strong> The reason to do this was that ' +
        'container threads were scarce; with virtual threads enabled they are not, so plain ' +
        'blocking controller methods scale without any of this. The forms that remain genuinely ' +
        'useful are the ones that are not about thread economy at all: ' +
        '<code>SseEmitter</code> and <code>StreamingResponseBody</code> for streaming, and ' +
        '<code>DeferredResult</code> for a response completed by an external event.</p>' +
        '<p>Two things to configure if you use them: <code>spring.mvc.async.request-timeout</code>, ' +
        'because the default is the container\'s and may be forever; and the executor, since ' +
        'the default for <code>Callable</code> is a <code>SimpleAsyncTaskExecutor</code> that ' +
        'pools nothing.</p>',
    referenceLinks: [
        { title: 'Asynchronous Requests — Spring Framework Reference', url: 'https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-ann-async.html' }
    ],
    tags: ['spring-mvc', 'async', 'streaming', 'virtual-threads'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

/* ==== API Design ====================================================== */

{
    id: 'http-methods-and-idempotency',
    importance: 'must-know',
    subsection: 'design',
    question: 'Which HTTP methods are safe and which are idempotent, and why does it matter in practice?',
    answer:
        '<p><strong>Safe</strong> means no observable change on the server: GET, HEAD, OPTIONS. ' +
        '<strong>Idempotent</strong> means doing it twice has the same effect as doing it once: ' +
        'GET, HEAD, OPTIONS, PUT, DELETE. <strong>POST and PATCH are neither.</strong></p>' +
        '<p>Why it matters is not theory. Every layer between your client and your server ' +
        '<em>acts</em> on these properties:</p>' +
        '<ul>' +
        '<li><strong>Retries.</strong> HTTP clients, load balancers, service meshes and mobile ' +
        'networks retry idempotent requests automatically after a timeout. A POST that is not ' +
        'idempotent and gets retried charges the card twice — and the retry may come from ' +
        'infrastructure you do not control.</li>' +
        '<li><strong>Caching.</strong> Caches and browsers cache GET responses. A GET with side ' +
        'effects will have those effects skipped, or repeated by a prefetch.</li>' +
        '<li><strong>Prefetching and crawlers.</strong> Anything may issue a GET, at any time. ' +
        '"Delete via GET" endpoints have been emptied by search engine crawlers.</li>' +
        '</ul>' +
        '<p><strong>DELETE is idempotent even though the second call returns 404</strong> — ' +
        'idempotence is about the resulting state, not the response. Returning 204 for both is ' +
        'also defensible and is friendlier to retries.</p>' +
        '<p>To make a POST safely retryable, use an <strong>idempotency key</strong>: the client ' +
        'generates a unique key per logical operation and sends it as a header, and the server ' +
        'stores the result against that key and replays it on a repeat. This is what Stripe and ' +
        'every serious payments API do, and it is the expected answer to "how do you stop a ' +
        'double charge".</p>',
    referenceLinks: [
        { title: 'RFC 9110 — HTTP Semantics, Method Properties', url: 'https://www.rfc-editor.org/rfc/rfc9110.html#name-common-method-properties' }
    ],
    tags: ['rest', 'http', 'idempotency', 'api-design'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'status-codes-that-matter',
    importance: 'must-know',
    subsection: 'design',
    question: 'Which HTTP status codes should an API actually use, and which are commonly misused?',
    answer:
        '<p>A working set of about a dozen covers nearly everything:</p>' +
        '<ul>' +
        '<li><strong>200</strong> OK, <strong>201</strong> Created with a <code>Location</code> ' +
        'header, <strong>202</strong> Accepted for work that will happen later, ' +
        '<strong>204</strong> No Content for a successful delete or update with nothing to ' +
        'return.</li>' +
        '<li><strong>400</strong> malformed or invalid, <strong>401</strong> not authenticated, ' +
        '<strong>403</strong> authenticated but not allowed, <strong>404</strong> no such ' +
        'resource, <strong>409</strong> conflict with current state, <strong>422</strong> ' +
        'syntactically valid but semantically wrong, <strong>429</strong> rate limited.</li>' +
        '<li><strong>500</strong> we broke, <strong>503</strong> temporarily unavailable with ' +
        '<code>Retry-After</code>.</li>' +
        '</ul>' +
        '<p><strong>The misuses worth naming:</strong></p>' +
        '<ul>' +
        '<li><strong>200 with an error in the body.</strong> Every monitoring system, cache, ' +
        'retry policy and circuit breaker reads the status code. Hiding a failure behind a 200 ' +
        'makes the failure invisible to all of them.</li>' +
        '<li><strong>401 and 403 swapped.</strong> 401 means "I do not know who you are" and ' +
        'must carry a <code>WWW-Authenticate</code> header; 403 means "I know, and no".</li>' +
        '<li><strong>500 for a client mistake.</strong> Invalid input is 400. A 500 means the ' +
        'server has a bug, and it should page someone — so using it for bad input trains the ' +
        'team to ignore alerts.</li>' +
        '<li><strong>404 for an empty collection.</strong> A list endpoint with no matches is ' +
        '200 with an empty array; the collection resource exists.</li>' +
        '</ul>' +
        '<p>One deliberate exception: returning <strong>404 instead of 403</strong> to avoid ' +
        'confirming that a resource exists is a legitimate choice when the existence itself is ' +
        'sensitive. Make it consciously and consistently.</p>',
    referenceLinks: [
        { title: 'RFC 9110 — HTTP Status Codes', url: 'https://www.rfc-editor.org/rfc/rfc9110.html#name-status-codes' }
    ],
    tags: ['rest', 'http', 'status-codes', 'api-design'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'api-versioning',
    importance: 'must-know',
    subsection: 'design',
    question: 'How do you version a REST API, and which approach would you defend?',
    answer:
        '<p>Four options, each with a real trade-off.</p>' +
        '<ul>' +
        '<li><strong>URI path</strong> — <code>/v1/orders</code>. Obvious, greppable, trivially ' +
        'routable at a gateway, easy to test in a browser. Purists object that the URI should ' +
        'identify the resource rather than its representation. It is by far the most common ' +
        'choice in practice, and being able to say <em>why</em> despite the objection is the ' +
        'answer.</li>' +
        '<li><strong>Query parameter</strong> — <code>?version=1</code>. Easy, and easy to omit ' +
        'accidentally, which makes the default version load-bearing.</li>' +
        '<li><strong>Custom header</strong> — <code>X-API-Version: 1</code>. Keeps URIs clean ' +
        'and makes the version invisible in logs, bookmarks and curl commands.</li>' +
        '<li><strong>Content negotiation</strong> — ' +
        '<code>Accept: application/vnd.example.v1+json</code>. The most correct by the ' +
        'specification and the least convenient for everyone using the API.</li>' +
        '</ul>' +
        '<p>The more useful answer is <strong>how to avoid versioning at all</strong>, because a ' +
        'second version means maintaining two of everything. Additive changes do not need a new ' +
        'version: adding a field is safe if clients ignore unknown fields, which is what ' +
        '<code>FAIL_ON_UNKNOWN_PROPERTIES=false</code> guarantees on the Jackson side. Most ' +
        'breaking changes can be avoided by never removing or repurposing a field, never ' +
        'tightening validation, and never changing a type.</p>' +
        '<p>When a break is unavoidable: version the <em>endpoint</em> rather than the whole ' +
        'API, run both for a stated window, instrument the old one so you know who is still ' +
        'using it, and tell them. An API with no usage telemetry cannot be deprecated safely, ' +
        'because nobody can say whether removing it is safe.</p>' +
        '<p>Spring Framework 7 adds <code>@RequestMapping(version = ...)</code> and an ' +
        '<code>ApiVersionStrategy</code>, which makes several of these first-class rather than ' +
        'hand-rolled.</p>',
    referenceLinks: [
        { title: 'API Versioning — Spring Framework Reference', url: 'https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-requestmapping.html' }
    ],
    tags: ['rest', 'versioning', 'api-design', 'compatibility'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'pagination',
    importance: 'must-know',
    subsection: 'design',
    question: 'How do you paginate a collection endpoint, and what breaks with offset pagination?',
    answer:
        '<p><strong>Offset pagination</strong> — <code>?page=3&amp;size=20</code>, becoming ' +
        '<code>LIMIT 20 OFFSET 60</code> — is the default and has two real problems.</p>' +
        '<ul>' +
        '<li><strong>It is slow at depth.</strong> The database must produce and discard every ' +
        'skipped row. <code>OFFSET 100000</code> reads a hundred thousand rows to return ' +
        'twenty, and it gets worse as the table grows.</li>' +
        '<li><strong>It skips and duplicates rows under concurrent writes.</strong> If a row is ' +
        'inserted before your position between page 2 and page 3, everything shifts and one row ' +
        'is shown twice; a deletion hides one entirely. For a feed being actively written this ' +
        'is not an edge case.</li>' +
        '</ul>' +
        '<p><strong>Keyset (cursor) pagination</strong> fixes both: instead of an offset, carry ' +
        'the sort key of the last row — <code>WHERE (created_at, id) &lt; (:lastCreated, ' +
        ':lastId) ORDER BY created_at DESC, id DESC LIMIT 20</code>. The index seeks directly to ' +
        'the position, so page one thousand costs the same as page one, and concurrent inserts ' +
        'cannot shift the window.</p>' +
        '<p>Its costs: no random access to page N, and the sort key must be unique — hence the ' +
        'tiebreaker column, without which rows sharing a timestamp are silently dropped or ' +
        'repeated.</p>' +
        '<p>Two Spring-specific notes. <code>Pageable</code> gives offset pagination for free, ' +
        'and <code>Page&lt;T&gt;</code> runs a second <code>COUNT</code> query on every request ' +
        '— often the more expensive of the two. <code>Slice&lt;T&gt;</code> skips the count and ' +
        'just reports whether more exist, which is what an infinite-scroll UI actually needs. ' +
        'And <strong>always cap the page size</strong> server-side; an uncapped ' +
        '<code>size=1000000</code> is a denial of service anyone can trigger.</p>',
    referenceLinks: [
        { title: 'Paging and Sorting — Spring Data Commons', url: 'https://docs.spring.io/spring-data/commons/reference/repositories/query-methods-details.html' }
    ],
    tags: ['rest', 'pagination', 'api-design', 'performance'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: [
        {
            language: 'sql',
            title: 'The same page, two access patterns',
            code:
                '-- Offset: the database produces 100000 rows and throws them away.\n' +
                'SELECT id, created_at, total\n' +
                'FROM orders\n' +
                'WHERE customer_id = 42\n' +
                'ORDER BY created_at DESC, id DESC\n' +
                'LIMIT 20 OFFSET 100000;\n' +
                '\n' +
                '-- Keyset: the index seeks straight to the position and reads 20 rows.\n' +
                '-- (created_at, id) is compared as a tuple, which is what makes the\n' +
                '-- tiebreaker work and what a composite index can satisfy directly.\n' +
                'SELECT id, created_at, total\n' +
                'FROM orders\n' +
                'WHERE customer_id = 42\n' +
                '  AND (created_at, id) < (:last_created_at, :last_id)\n' +
                'ORDER BY created_at DESC, id DESC\n' +
                'LIMIT 20;\n' +
                '\n' +
                '-- Both want this index. Without it neither is fast.\n' +
                'CREATE INDEX idx_orders_customer_created\n' +
                '    ON orders (customer_id, created_at DESC, id DESC);',
            output: {
                /* No stdout: this is SQL, which the runner cannot execute, and
                   the row counts depend entirely on the data. Checked against
                   PostgreSQL 16 syntax; the tuple comparison is standard SQL
                   and is supported by PostgreSQL and MySQL 8, but not by every
                   engine. */
                kind: 'trace',
                lines: [
                    'The offset query matches the index but must walk past 100000 index entries.',
                    'Its cost grows linearly with the page number, so deep pages get slower over time.',
                    'The keyset query converts the position into a range predicate on the same index.',
                    'The engine seeks to the starting point and reads exactly twenty entries.',
                    'Its cost is constant regardless of how deep into the result set the page is.'
                ],
                explain:
                    '<p>Row-value comparison — comparing <code>(a, b)</code> as a tuple — is ' +
                    'standard SQL and is supported by PostgreSQL and MySQL 8. Where it is not ' +
                    'available the same predicate has to be written out as ' +
                    '<code>a &lt; :a OR (a = :a AND b &lt; :b)</code>, which is correct and ' +
                    'less likely to use the index as cleanly.</p>'
            }
        }
    ]
},

{
    id: 'resource-naming',
    importance: 'should-know',
    subsection: 'design',
    question: 'How should REST resources be named, and what do you do about actions that are not CRUD?',
    answer:
        '<p>The conventions are broadly settled: <strong>plural nouns</strong> for collections ' +
        '(<code>/orders</code>), the identifier for a member (<code>/orders/42</code>), nesting ' +
        'for genuine containment (<code>/orders/42/items</code>), lowercase with hyphens, and no ' +
        'verbs — the verb is the HTTP method.</p>' +
        '<p>Two rules that prevent later pain: <strong>do not nest more than one level ' +
        'deep</strong>, because <code>/customers/1/orders/42/items/7</code> forces every URL to ' +
        'know the whole hierarchy when <code>/items/7</code> would do; and <strong>use a ' +
        'sub-resource for a filtered view</strong> rather than inventing a path per query — ' +
        '<code>/orders?status=pending</code>, not <code>/orders/pending</code>.</p>' +
        '<p><strong>The interesting question is the non-CRUD action</strong>, because every real ' +
        'API has them: cancel an order, retry a payment, approve a request, send a reminder. ' +
        'Three defensible answers:</p>' +
        '<ul>' +
        '<li><strong>Model the action as a resource.</strong> ' +
        '<code>POST /orders/42/cancellation</code>. A cancellation is a thing that exists, has ' +
        'a time and a reason, and can be looked up. This is usually the best answer and it ' +
        'usually improves the domain model as a side effect.</li>' +
        '<li><strong>Model the state transition.</strong> ' +
        '<code>PATCH /orders/42</code> with <code>{"status": "cancelled"}</code>. Honest when ' +
        'the action really is just a field change, and misleading when it triggers refunds and ' +
        'emails.</li>' +
        '<li><strong>Use an action sub-path.</strong> <code>POST /orders/42/cancel</code>. Not ' +
        'strictly RESTful, entirely clear to every reader, and universally understood. Being ' +
        'able to say "this breaks the noun rule and here is why I did it anyway" is a better ' +
        'answer than either purity or ignorance.</li>' +
        '</ul>' +
        '<p>Consistency across the API matters more than which of the three you pick.</p>',
    referenceLinks: [
        { title: 'RFC 3986 — URI Generic Syntax', url: 'https://www.rfc-editor.org/rfc/rfc3986.html' }
    ],
    tags: ['rest', 'api-design', 'naming'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'hateoas-and-richardson',
    importance: 'good-to-know',
    subsection: 'design',
    question: 'What is HATEOAS, and does anyone actually use it?',
    answer:
        '<p>HATEOAS — hypermedia as the engine of application state — means responses carry ' +
        'links describing what can be done next, so a client discovers the API by following ' +
        'them rather than by hard-coding URLs. It is level 3 of the Richardson Maturity Model, ' +
        'and by Roy Fielding\'s definition an API without it is not REST at all.</p>' +
        '<p>The model is worth knowing as vocabulary: level 0 is a single endpoint tunnelling ' +
        'everything, level 1 introduces resources, level 2 uses HTTP methods and status codes ' +
        'properly, level 3 adds hypermedia. <strong>Most production APIs are level 2 and stay ' +
        'there</strong>, and the honest position is to say so and say why.</p>' +
        '<p><strong>The case against</strong> in practice: most clients are written against ' +
        'documentation and hard-code their URLs regardless, so the links are generated and ' +
        'ignored; the payloads get considerably larger; and it adds real complexity to both ' +
        'sides for a decoupling that few teams exercise.</p>' +
        '<p><strong>Where it genuinely pays</strong>: long-lived public APIs with clients you ' +
        'cannot coordinate with, and workflow-heavy APIs where the available transitions depend ' +
        'on state — an order that can be cancelled only while pending is well expressed by the ' +
        'cancel link being present or absent, which saves every client from reimplementing the ' +
        'state machine.</p>' +
        '<p>Spring HATEOAS provides <code>EntityModel</code>, <code>CollectionModel</code> and ' +
        'link builders if you want it. The answer that lands in an interview is knowing what it ' +
        'is, what it costs, and choosing deliberately — not claiming an API is RESTful when it ' +
        'is level 2.</p>',
    referenceLinks: [
        { title: 'Spring HATEOAS — Reference', url: 'https://docs.spring.io/spring-hateoas/docs/current/reference/html/' }
    ],
    tags: ['rest', 'hateoas', 'api-design'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'dto-vs-entity',
    importance: 'must-know',
    subsection: 'design',
    question: 'Should a controller return a JPA entity directly?',
    answer:
        '<p>No, and the reasons go well beyond tidiness.</p>' +
        '<ul>' +
        '<li><strong>It publishes your schema as your API.</strong> Renaming a column now breaks ' +
        'every client. The two things change for different reasons and at different rates, which ' +
        'is the whole argument for separating them.</li>' +
        '<li><strong>It leaks fields.</strong> Password hashes, internal flags, audit columns, ' +
        'soft-delete markers — everything on the entity is serialised unless someone remembers ' +
        'to annotate it. That is a security posture based on remembering.</li>' +
        '<li><strong>Lazy associations explode.</strong> Serialising an entity outside a ' +
        'transaction throws <code>LazyInitializationException</code>; inside one, Jackson walks ' +
        'the object graph and triggers a query per association — an N+1 caused by the ' +
        'serialiser. Bidirectional relationships additionally cause infinite recursion until ' +
        'someone adds <code>@JsonIgnore</code>.</li>' +
        '<li><strong>Accepting an entity as <code>@RequestBody</code> is worse.</strong> That is ' +
        'mass assignment: the client controls every field, including the id and any ' +
        'relationship.</li>' +
        '</ul>' +
        '<p><strong>Use DTOs, ideally records.</strong> They are immutable, they declare exactly ' +
        'the contract, they can be validated independently of persistence constraints, and they ' +
        'let the API and the schema evolve separately.</p>' +
        '<p>The standard objection is the mapping boilerplate. The answers: MapStruct generates ' +
        'it at compile time with no reflection; Spring Data can project directly into a DTO ' +
        'through an interface or a constructor expression, which also stops selecting columns ' +
        'you do not need; and for a genuinely trivial read-only endpoint on an internal service, ' +
        'skipping the DTO is a defensible shortcut — provided it is a decision rather than a ' +
        'default.</p>',
    referenceLinks: [
        { title: 'Projections — Spring Data JPA', url: 'https://docs.spring.io/spring-data/jpa/reference/repositories/projections.html' }
    ],
    tags: ['rest', 'dto', 'jpa', 'api-design', 'security'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

/* ==== Validation & Error Handling ===================================== */

{
    id: 'bean-validation',
    importance: 'must-know',
    subsection: 'errors',
    question: 'How does @Valid work, and what is the difference between @Valid and @Validated?',
    answer:
        '<p><code>@Valid</code> is the Jakarta Bean Validation annotation. On a ' +
        '<code>@RequestBody</code> or <code>@ModelAttribute</code> parameter, Spring runs the ' +
        'validator after binding and before the controller method body. A failure throws ' +
        '<code>MethodArgumentNotValidException</code>, which Spring maps to a ' +
        '<strong>400</strong>.</p>' +
        '<p><code>@Validated</code> is Spring\'s own and adds two things:</p>' +
        '<ul>' +
        '<li><strong>Validation groups</strong>, so the same class can be validated differently ' +
        'on create and on update — an id required in one case and forbidden in the other.</li>' +
        '<li><strong>Method-level validation.</strong> Put <code>@Validated</code> on the class ' +
        'and constraints go directly on method parameters and return values, including on ' +
        'service beans. This is proxy-based, so it obeys all the usual proxy rules.</li>' +
        '</ul>' +
        '<p>Details worth having:</p>' +
        '<ul>' +
        '<li><strong>Nested objects need <code>@Valid</code> on the field</strong>, or the ' +
        'validator stops at the top level. This is the single most common reason "my validation ' +
        'is not running".</li>' +
        '<li><strong>Collections need it on the element type</strong> — ' +
        '<code>List&lt;@Valid Item&gt;</code>.</li>' +
        '<li>Method-level validation on a service throws ' +
        '<code>ConstraintViolationException</code> rather than ' +
        '<code>MethodArgumentNotValidException</code>, and <strong>Spring does not map it to a ' +
        '400 by default</strong> — so it becomes a 500 unless you handle it. Two different ' +
        'exceptions for the same idea is a genuine wart.</li>' +
        '<li>Custom constraints are an annotation plus a <code>ConstraintValidator</code>, and ' +
        'the validator is a Spring bean, so it can inject a repository — which is how a ' +
        '"unique email" constraint is written.</li>' +
        '</ul>' +
        '<p>Keep <strong>syntactic</strong> validation in annotations and <strong>business ' +
        'rule</strong> validation in the domain. "Must be a valid email" is a constraint; "this ' +
        'customer has exceeded their credit limit" is a domain decision that needs context an ' +
        'annotation does not have.</p>',
    referenceLinks: [
        { title: 'Validation — Spring Framework Reference', url: 'https://docs.spring.io/spring-framework/reference/core/validation/beanvalidation.html' }
    ],
    tags: ['spring-mvc', 'validation', 'bean-validation'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'controlleradvice-and-problemdetail',
    importance: 'must-know',
    subsection: 'errors',
    question: 'How do you handle exceptions consistently across an API?',
    answer:
        '<p><code>@RestControllerAdvice</code> with <code>@ExceptionHandler</code> methods. It ' +
        'applies across every controller, so error responses have one shape defined in one ' +
        'place, and controllers stop carrying try/catch blocks.</p>' +
        '<p>Since Spring 6, extend ' +
        '<code>ResponseEntityExceptionHandler</code> and return ' +
        '<strong><code>ProblemDetail</code></strong> — the RFC 9457 format (formerly RFC 7807). ' +
        'It gives a standard body with <code>type</code>, <code>title</code>, ' +
        '<code>status</code>, <code>detail</code> and <code>instance</code>, plus arbitrary ' +
        'extensions. Using a standard means clients and tools can parse errors without ' +
        'per-API code, and it settles the "what shape should our error body be" argument by ' +
        'deferring to a specification.</p>' +
        '<p>Rules that make error handling actually useful:</p>' +
        '<ul>' +
        '<li><strong>Never leak a stack trace or an internal message.</strong> A database ' +
        'constraint name in an error body tells an attacker your schema. Log the detail with a ' +
        'correlation id, return the id.</li>' +
        '<li><strong>Include that correlation id in the response.</strong> "Something went ' +
        'wrong, reference 7f3a" turns a support conversation into a log query.</li>' +
        '<li><strong>Handle specific exceptions, not <code>Exception</code>.</strong> A ' +
        'catch-all that returns 500 hides the ones that should have been 400 or 409. Have a ' +
        'catch-all as the last resort and make it log at error level.</li>' +
        '<li><strong>Validation errors should list every failure</strong>, not just the first. ' +
        'A form that reports one problem per round trip is a bad experience, and the binding ' +
        'result already has them all.</li>' +
        '<li><strong>Match the status to the cause</strong>: 400 malformed, 404 missing, 409 ' +
        'conflict, 422 semantically invalid, 500 only when the server is at fault.</li>' +
        '</ul>' +
        '<p>Two gaps to close deliberately: exceptions from <strong>filters</strong> never reach ' +
        'the advice, and Spring Security returns its own 401 and 403 from within the filter ' +
        'chain — so matching those to your error format needs an ' +
        '<code>AuthenticationEntryPoint</code> and an <code>AccessDeniedHandler</code>.</p>',
    referenceLinks: [
        { title: 'Error Responses — Spring Framework Reference', url: 'https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-ann-rest-exceptions.html' }
    ],
    tags: ['spring-mvc', 'error-handling', 'problemdetail', 'security'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: [
        {
            language: 'java',
            title: 'One advice, one error shape, no leaked internals',
            code:
                '@RestControllerAdvice\n' +
                'public class ApiExceptionHandler extends ResponseEntityExceptionHandler {\n' +
                '\n' +
                '    private static final Logger log =\n' +
                '            LoggerFactory.getLogger(ApiExceptionHandler.class);\n' +
                '\n' +
                '    @ExceptionHandler(OrderNotFoundException.class)\n' +
                '    ProblemDetail notFound(OrderNotFoundException e) {\n' +
                '        ProblemDetail problem = ProblemDetail.forStatusAndDetail(\n' +
                '                HttpStatus.NOT_FOUND, "No order with id " + e.orderId());\n' +
                '        problem.setTitle("Order not found");\n' +
                '        problem.setType(URI.create("https://errors.example.com/order-not-found"));\n' +
                '        return problem;\n' +
                '    }\n' +
                '\n' +
                '    // Every field error, not just the first one.\n' +
                '    @Override\n' +
                '    protected ResponseEntity<Object> handleMethodArgumentNotValid(\n' +
                '            MethodArgumentNotValidException e, HttpHeaders headers,\n' +
                '            HttpStatusCode status, WebRequest request) {\n' +
                '\n' +
                '        ProblemDetail problem = ProblemDetail.forStatusAndDetail(\n' +
                '                HttpStatus.BAD_REQUEST, "Request validation failed");\n' +
                '        problem.setProperty("errors", e.getBindingResult().getFieldErrors().stream()\n' +
                '                .map(f -> Map.of("field", f.getField(),\n' +
                '                                 "message", f.getDefaultMessage()))\n' +
                '                .toList());\n' +
                '        return ResponseEntity.badRequest().body(problem);\n' +
                '    }\n' +
                '\n' +
                '    // Last resort. The client gets a reference; the log gets the cause.\n' +
                '    @ExceptionHandler(Exception.class)\n' +
                '    ProblemDetail unexpected(Exception e) {\n' +
                '        String reference = UUID.randomUUID().toString().substring(0, 8);\n' +
                '        log.error("Unhandled exception, reference {}", reference, e);\n' +
                '\n' +
                '        ProblemDetail problem = ProblemDetail.forStatusAndDetail(\n' +
                '                HttpStatus.INTERNAL_SERVER_ERROR,\n' +
                '                "Something went wrong. Reference " + reference);\n' +
                '        problem.setProperty("reference", reference);\n' +
                '        return problem;\n' +
                '    }\n' +
                '}',
            output: {
                kind: 'trace',
                lines: [
                    'The advice applies to every controller, so no controller needs a try/catch.',
                    'ProblemDetail produces an RFC 9457 body that generic clients can parse.',
                    'The validation handler reports every field error, so a form is fixed in one round trip.',
                    'The catch-all logs the exception with a short reference and returns only the reference.',
                    'No stack trace, message or constraint name reaches the client.'
                ],
                explain:
                    '<p>The catch-all is the security-relevant one. Returning ' +
                    '<code>e.getMessage()</code> from it is the usual shortcut, and it is how a ' +
                    'database constraint name, a file path or an internal hostname ends up in a ' +
                    'response body.</p>'
            }
        }
    ]
},

{
    id: 'validation-error-messages',
    importance: 'should-know',
    subsection: 'errors',
    question: 'What should an error response actually contain?',
    answer:
        '<p>Enough for a client to act, and nothing that helps an attacker.</p>' +
        '<p><strong>Include:</strong></p>' +
        '<ul>' +
        '<li>A <strong>stable machine-readable code</strong> — <code>ORDER_NOT_FOUND</code>, ' +
        'not a sentence. Clients branch on it, and a human-readable message is free to change ' +
        'wording or be translated.</li>' +
        '<li>A <strong>human-readable message</strong> for the developer reading the ' +
        'response.</li>' +
        '<li>For validation, <strong>which field and why</strong>, for every failure.</li>' +
        '<li>A <strong>correlation id</strong>, which is what makes support tractable.</li>' +
        '<li>For a 429 or 503, <strong><code>Retry-After</code></strong>.</li>' +
        '</ul>' +
        '<p><strong>Exclude:</strong> stack traces, SQL, constraint and table names, internal ' +
        'hostnames and file paths, and any hint about whether an account exists. That last one ' +
        'is a real vulnerability class: "no user with that email" versus "wrong password" turns ' +
        'a login form into an account enumeration oracle. The same reasoning applies to ' +
        'password reset and to any 404-versus-403 decision.</p>' +
        '<p>One detail that undoes all of this: <strong>Spring Boot\'s default error response ' +
        'includes the exception message and, if configured, the trace.</strong> The defaults are ' +
        'safe — <code>server.error.include-message=never</code> and ' +
        '<code>include-stacktrace=never</code> — and it is common to see them turned on during ' +
        'debugging and left on. Check them, and check that the same is true for the paths ' +
        'Spring Security handles.</p>' +
        '<p>Document the error codes alongside the endpoints. An error contract that is not ' +
        'written down is one that clients discover by guessing, and then depend on.</p>',
    referenceLinks: [
        { title: 'RFC 9457 — Problem Details for HTTP APIs', url: 'https://www.rfc-editor.org/rfc/rfc9457.html' }
    ],
    tags: ['rest', 'error-handling', 'api-design', 'security'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'exception-to-status-mapping',
    importance: 'should-know',
    subsection: 'errors',
    question: 'What are the ways to map an exception to a status code, and which should you prefer?',
    answer:
        '<p>Four mechanisms, and they are consulted in a defined order.</p>' +
        '<ul>' +
        '<li><strong><code>@ExceptionHandler</code> in the controller</strong> — applies to that ' +
        'controller only. Wins over everything else. Occasionally right for a genuinely local ' +
        'concern; usually a sign the handling belongs in the advice.</li>' +
        '<li><strong><code>@RestControllerAdvice</code></strong> — the default choice. One ' +
        'place, applies everywhere, and can be scoped to a package or an annotation when a ' +
        'large application needs different shapes for different areas.</li>' +
        '<li><strong><code>@ResponseStatus</code> on the exception class</strong> — declares its ' +
        'own status. Concise, and it couples a domain exception to HTTP, which is wrong the ' +
        'moment that exception is thrown from a message listener or a batch job. It also gives ' +
        'no control over the body.</li>' +
        '<li><strong><code>ErrorResponseException</code></strong> and Spring\'s own web ' +
        'exceptions such as <code>ResponseStatusException</code> — thrown directly from a ' +
        'controller. Fine for a small application, and it puts HTTP concerns in the ' +
        'controller, which is where they belong.</li>' +
        '</ul>' +
        '<p><strong>The design worth defending:</strong> the domain throws domain exceptions ' +
        'that know nothing about HTTP, and one advice translates them. That keeps the service ' +
        'layer reusable from a controller, a listener and a scheduled job, and it keeps every ' +
        'status-code decision in a file you can read top to bottom.</p>' +
        '<p>The failure to check for is the one that produces a 500 for a client mistake: an ' +
        'unmapped exception falls through to the catch-all. Reviewing the actual distribution of ' +
        'status codes in production — how many 500s, and for what — is the cheapest way to find ' +
        'the mappings that were never written.</p>',
    referenceLinks: [
        { title: 'Spring Web MVC — Error Responses', url: 'https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-ann-rest-exceptions.html' }
    ],
    tags: ['spring-mvc', 'error-handling', 'layering'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

/* ==== Jackson & Serialization ========================================= */

{
    id: 'jackson-basics',
    importance: 'must-know',
    subsection: 'json',
    question: 'How does Jackson decide what to serialise, and which annotations do you actually need?',
    answer:
        '<p>By default Jackson uses <strong>public getters</strong> for serialisation and ' +
        '<strong>setters or a constructor</strong> for deserialisation — it is bean-property ' +
        'based, not field based, which surprises people whose fields and getters disagree.</p>' +
        '<p>The annotations that earn their place:</p>' +
        '<ul>' +
        '<li><strong><code>@JsonProperty("name")</code></strong> — rename, and mark a ' +
        'constructor parameter for binding.</li>' +
        '<li><strong><code>@JsonIgnore</code></strong> — never serialise. The blunt way to keep ' +
        'a password hash out of a response, and a poor substitute for a DTO.</li>' +
        '<li><strong><code>@JsonInclude(NON_NULL)</code></strong> — omit nulls, which usually ' +
        'shrinks payloads considerably. Be careful: for a PATCH, omitting nulls makes "set this ' +
        'to null" indistinguishable from "do not change it".</li>' +
        '<li><strong><code>@JsonFormat</code></strong> — date and number formatting, which is ' +
        'how you stop a <code>LocalDate</code> serialising as an array of integers.</li>' +
        '<li><strong><code>@JsonCreator</code></strong> — the constructor or factory to use. ' +
        'Not needed for records or for a single-constructor class on a build with ' +
        '<code>-parameters</code>.</li>' +
        '<li><strong><code>@JsonAnyGetter</code> and <code>@JsonAnySetter</code></strong> — for ' +
        'genuinely dynamic keys.</li>' +
        '</ul>' +
        '<p>Two configuration settings that matter more than any annotation. ' +
        '<strong><code>FAIL_ON_UNKNOWN_PROPERTIES</code> should be false</strong> — Boot ' +
        'defaults it off — because it is what lets a server add a field without breaking every ' +
        'client. And <strong><code>WRITE_DATES_AS_TIMESTAMPS</code> should be off</strong>, so ' +
        'dates serialise as ISO-8601 strings rather than epoch numbers.</p>' +
        '<p>Configure the <code>ObjectMapper</code> through a ' +
        '<code>Jackson2ObjectMapperBuilderCustomizer</code> rather than by defining your own ' +
        'bean. Replacing the bean discards every default Boot applied — the JavaTimeModule ' +
        'registration among them — and the symptom is dates that suddenly serialise wrongly.</p>',
    referenceLinks: [
        { title: 'JSON — Spring Boot Reference', url: 'https://docs.spring.io/spring-boot/reference/features/json.html' }
    ],
    tags: ['jackson', 'json', 'serialization'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'jackson-dates-and-time',
    importance: 'should-know',
    subsection: 'json',
    question: 'How should dates and times be represented in a JSON API?',
    answer:
        '<p><strong>ISO-8601 strings, in UTC, for anything that is an instant.</strong> ' +
        '<code>2026-08-24T09:15:30Z</code> is unambiguous, sorts lexicographically, is readable ' +
        'in a log, and every language parses it.</p>' +
        '<p>The type on the Java side should say what the value means:</p>' +
        '<ul>' +
        '<li><strong><code>Instant</code></strong> — a moment in time. The default for "when did ' +
        'this happen".</li>' +
        '<li><strong><code>LocalDate</code></strong> — a date with no time and no zone. A ' +
        'birthday is the same date everywhere; storing it as an instant makes it shift by a day ' +
        'for some users.</li>' +
        '<li><strong><code>ZonedDateTime</code></strong> — an instant plus the zone it should be ' +
        'displayed in. Necessary for a future appointment, because the offset for a date months ' +
        'ahead is not knowable from the instant alone if the zone changes its rules.</li>' +
        '<li><strong><code>OffsetDateTime</code></strong> — an instant with a fixed offset, ' +
        'which is what an ISO string with <code>+05:30</code> actually carries.</li>' +
        '</ul>' +
        '<p><strong>Avoid epoch numbers</strong> in an API. They are unreadable in a log or a ' +
        'bug report, ambiguous about seconds versus milliseconds — a genuine and common bug — ' +
        'and they lose any zone information there was.</p>' +
        '<p>Practical requirements: <code>jackson-datatype-jsr310</code> must be registered, ' +
        'which Spring Boot does for you; <code>WRITE_DATES_AS_TIMESTAMPS</code> must be off or ' +
        'a <code>LocalDate</code> serialises as <code>[2026,8,24]</code>; and ' +
        '<code>java.util.Date</code> should not appear in new code at all — it is mutable, it ' +
        'has no zone, and its <code>toString()</code> silently applies the JVM default zone, ' +
        'which differs between a developer laptop and a UTC container.</p>' +
        '<p>Store instants in the database as <code>timestamptz</code> or the equivalent, and ' +
        'convert to a user\'s zone only at the point of display.</p>',
    referenceLinks: [
        { title: 'Jackson — Java 8 date/time module', url: 'https://github.com/FasterXML/jackson-modules-java8' }
    ],
    tags: ['jackson', 'json', 'date-time', 'api-design'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'jackson-polymorphism',
    importance: 'good-to-know',
    subsection: 'json',
    question: 'How do you serialise a polymorphic type, and why is @JsonTypeInfo dangerous?',
    answer:
        '<p><code>@JsonTypeInfo</code> writes a type discriminator into the JSON and reads it ' +
        'back to choose a class. The safe form names the permitted subtypes explicitly with ' +
        '<code>@JsonSubTypes</code>, and uses a logical name rather than a class name:</p>' +
        '<p><code>@JsonTypeInfo(use = Id.NAME, property = "type")</code> with ' +
        '<code>@JsonSubTypes({@Type(value = Card.class, name = "card"), ...})</code>. Sealed ' +
        'interfaces and records fit this well — the permitted set is already closed by the ' +
        'language.</p>' +
        '<p><strong>The dangerous form is <code>Id.CLASS</code> or enabling default ' +
        'typing.</strong> That lets the JSON name any class on the classpath, and Jackson will ' +
        'instantiate it. If any class reachable on the classpath does something harmful during ' +
        'construction or property setting — and in a large dependency tree there is usually one ' +
        '— an attacker who controls the JSON gets remote code execution. This is the family of ' +
        'Jackson deserialisation CVEs, and Jackson has shipped a blocklist of known gadget ' +
        'classes precisely because the design permits it.</p>' +
        '<p>The rules that follow: <strong>never enable default typing</strong>; ' +
        '<strong>never use <code>Id.CLASS</code> on data that crosses a trust boundary</strong>; ' +
        'name subtypes explicitly so the set is closed; and prefer an explicit ' +
        '<code>type</code> field you switch on yourself when the shape is simple, which is ' +
        'clearer and has no reflection in it at all.</p>' +
        '<p>The same reasoning is why Java\'s own serialisation is treated as a hazard, and why ' +
        '<code>ObjectInputFilter</code> exists.</p>',
    referenceLinks: [
        { title: 'Jackson — Polymorphic Deserialization', url: 'https://github.com/FasterXML/jackson-docs/wiki/JacksonPolymorphicDeserialization' }
    ],
    tags: ['jackson', 'json', 'polymorphism', 'security', 'deserialization'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'partial-update-patch',
    importance: 'should-know',
    subsection: 'json',
    question: 'How do you implement PATCH so that "set to null" and "leave alone" are different?',
    answer:
        '<p>This is the problem PATCH always runs into: with a plain DTO, an absent field and a ' +
        'field explicitly set to <code>null</code> both arrive as <code>null</code>, and the ' +
        'server cannot tell "do not change the phone number" from "remove the phone number".</p>' +
        '<p>Three workable answers:</p>' +
        '<ul>' +
        '<li><strong>JSON Merge Patch (RFC 7396)</strong> — parse the body as a ' +
        '<code>JsonNode</code> and apply only the keys that are present, treating an explicit ' +
        '<code>null</code> as a removal. This is what the specification says PATCH means with ' +
        'content type <code>application/merge-patch+json</code>, and it is the answer that ' +
        'matches the standard.</li>' +
        '<li><strong><code>JsonNullable</code></strong> from the OpenAPI Jackson module, or a ' +
        'hand-rolled equivalent wrapper. It distinguishes undefined, null and a value at the ' +
        'type level, which makes the mapping code explicit and a little verbose.</li>' +
        '<li><strong>Avoid PATCH.</strong> Use PUT with the full representation, or model the ' +
        'change as its own resource — <code>PUT /customers/42/phone-number</code>. Often the ' +
        'simplest correct thing, and it sidesteps the ambiguity entirely.</li>' +
        '</ul>' +
        '<p>What does not work is <code>Optional&lt;String&gt;</code> as a DTO field. Jackson ' +
        'will bind it, but an absent key and an explicit null both produce ' +
        '<code>Optional.empty()</code>, so the ambiguity survives with more ceremony.</p>' +
        '<p>Whichever you choose, PATCH needs a concurrency story: two overlapping partial ' +
        'updates can interleave and lose one. An <code>If-Match</code> header with an ETag, or a ' +
        'version field checked on write, turns a lost update into a 409 — and that is the ' +
        'follow-up question this one usually attracts.</p>',
    referenceLinks: [
        { title: 'RFC 7396 — JSON Merge Patch', url: 'https://www.rfc-editor.org/rfc/rfc7396.html' }
    ],
    tags: ['rest', 'patch', 'json', 'api-design', 'concurrency'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'large-payloads-and-streaming',
    importance: 'good-to-know',
    subsection: 'json',
    question: 'How do you return a very large result set without exhausting memory?',
    answer:
        '<p>The default path builds the whole response in memory: the repository materialises ' +
        'every row into objects, Jackson serialises them into a byte array, and the response is ' +
        'written. For a hundred thousand rows that is an <code>OutOfMemoryError</code> waiting ' +
        'for a big enough request.</p>' +
        '<p>Options, from the ones that avoid the problem to the ones that manage it:</p>' +
        '<ul>' +
        '<li><strong>Paginate.</strong> The usual right answer. If a client needs everything, ' +
        'they can page through it, and both sides keep bounded memory.</li>' +
        '<li><strong>Stream from the database and write as you go.</strong> A repository method ' +
        'returning <code>Stream&lt;T&gt;</code>, consumed inside a transaction and written to a ' +
        '<code>StreamingResponseBody</code>. This requires a forward-only cursor and a fetch ' +
        'size, and — importantly — that entities are detached as they go, or the persistence ' +
        'context accumulates every one of them and you have moved the leak rather than fixed ' +
        'it.</li>' +
        '<li><strong>Newline-delimited JSON</strong> rather than one enormous array. Each line ' +
        'is a complete object, so the client can process incrementally instead of waiting for ' +
        'the closing bracket.</li>' +
        '<li><strong>Generate a file asynchronously.</strong> 202 Accepted, do the work, and ' +
        'give the client a URL or a presigned link when it is ready. For a genuine bulk export ' +
        'this is the honest design — an HTTP request is a poor container for a five-minute ' +
        'job.</li>' +
        '</ul>' +
        '<p>The detail that catches people out with streaming: <strong>the status code is ' +
        'committed with the first byte.</strong> An error halfway through cannot become a 500 — ' +
        'the client has already been told 200 and now receives truncated JSON. Whatever consumes ' +
        'the stream has to be able to detect an incomplete response, which is another argument ' +
        'for newline-delimited records over one array.</p>',
    referenceLinks: [
        { title: 'Spring Web MVC — Asynchronous Requests', url: 'https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-ann-async.html' }
    ],
    tags: ['rest', 'streaming', 'performance', 'memory'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
}

    ]
};
