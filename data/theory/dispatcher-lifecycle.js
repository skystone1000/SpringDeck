/* ==========================================================================
   data/theory/dispatcher-lifecycle.js — module 35 in the reading path

   Seven chapters that follow one request from the socket to the response
   body. The order is the order the request travels, because that is the
   thing being learned: "where would you put this" is answered by knowing
   what runs before what.
   ========================================================================== */

const dispatcherLifecycleModule = {
    id: 'dispatcher-lifecycle',
    trackId: 'web-api',
    order: 35,
    title: 'The Request Lifecycle',
    tagline: 'DispatcherServlet, front to back.',
    estimatedMinutes: 40,
    prerequisites: ['http-foundations', 'ioc-and-the-container'],
    docHub: { title: 'Spring Web MVC', url: 'https://docs.spring.io/spring-framework/reference/web/webmvc.html' },

    chapters: [
        {
            id: 'servlet-container-and-dispatcher',
            title: 'From Socket to DispatcherServlet',
            importance: 'must-know',
            summary: 'The container accepts the connection and parses HTTP. DispatcherServlet is one servlet mapped at "/" that front-controls everything after that.',
            interviewAngle: 'Asked as "explain the DispatcherServlet" or "walk me through a request". The full sequence is the answer, and the part most often missed is that filters run before the dispatcher is reached at all.',
            buildsOn: [],
            blocks: [
                {
                    type: 'definition',
                    term: 'Front controller',
                    important: true,
                    html: '<p>A single entry point that receives every request and delegates to whatever should handle it. <code>DispatcherServlet</code> is Spring MVC\'s: one servlet, mapped to <code>/</code>, which owns the whole dispatch pipeline rather than one URL.</p>'
                },
                {
                    type: 'diagram',
                    diagramType: 'flowchart',
                    caption: 'One request. The filter chain is outside the dispatcher, which is why it sees requests the dispatcher rejects.',
                    diagramConfig: {
                        title: 'From the socket to the response',
                        nodes: [
                            { id: 'conn', label: 'Container accepts and parses HTTP', kind: 'start' },
                            { id: 'filter', label: 'Filter chain — servlet level', kind: 'step' },
                            { id: 'disp', label: 'DispatcherServlet', kind: 'decision' },
                            { id: 'map', label: 'HandlerMapping: which method?', kind: 'step' },
                            { id: 'inter', label: 'Interceptor preHandle', kind: 'step' },
                            { id: 'adapt', label: 'HandlerAdapter: resolve arguments, invoke', kind: 'step' },
                            { id: 'conv', label: 'Message converter writes the body', kind: 'step' },
                            { id: 'after', label: 'Interceptor postHandle and afterCompletion', kind: 'fix' }
                        ],
                        edges: [
                            { from: 'conn', to: 'filter' },
                            { from: 'filter', to: 'disp' },
                            { from: 'disp', to: 'map' },
                            { from: 'map', to: 'inter' },
                            { from: 'inter', to: 'adapt' },
                            { from: 'adapt', to: 'conv' },
                            { from: 'conv', to: 'after' }
                        ]
                    }
                },
                {
                    type: 'prose',
                    html: '<p>Two details in that chain repay attention. The <strong>filter chain is servlet-level</strong> and sits outside Spring entirely — it sees every request including ones the dispatcher will answer with a 404, and it is where Spring Security does its work. And the dispatcher owns its own <code>ApplicationContext</code>, a child of the root context, though in a Spring Boot application there is only one context and that distinction is historical.</p>'
                },
                {
                    type: 'tip',
                    html: '<p><code>logging.level.org.springframework.web=DEBUG</code> prints the mapping decision for each request — which handler was selected and why. When a request 404s and the controller obviously exists, that log line is the fastest route to the answer, and it is usually a path or a media type that does not match what you think.</p>'
                }
            ],
            docs: [
                { title: 'DispatcherServlet', url: 'https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-servlet.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'rest-api', questionId: 'dispatcherservlet-lifecycle' }
            ]
        },

        {
            id: 'handler-mapping-and-adapter',
            title: 'Finding the Method',
            importance: 'should-know',
            summary: 'HandlerMapping decides which method handles this request. HandlerAdapter knows how to invoke whatever kind of handler that turned out to be.',
            interviewAngle: 'The two-interface split looks like ceremony until you can say what it buys: the dispatcher does not know that @RequestMapping exists, so a completely different handler style plugs in without changing it.',
            buildsOn: ['servlet-container-and-dispatcher'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p><code>RequestMappingHandlerMapping</code> builds a table at startup from every <code>@RequestMapping</code> it can find, keyed by path, method, headers, and produced and consumed media types. At request time it scores the candidates and picks the most specific match. <code>RequestMappingHandlerAdapter</code> then invokes it — resolving arguments, calling the method, and handling the return value.</p><p>The separation is what makes the dispatcher generic. It holds a list of mappings and a list of adapters and asks each in turn; it contains no knowledge of annotations, of functional routes, or of any other handler style. Adding one is adding a pair to those lists.</p>'
                },
                {
                    type: 'types',
                    title: 'What a mapping matches on, most specific first',
                    items: [
                        { name: 'Path', html: '<p>An exact path beats a single wildcard beats a double wildcard. Since Spring 5.3 the default matcher is <code>PathPattern</code> rather than <code>AntPathMatcher</code> — faster, and stricter about trailing slashes.</p>' },
                        { name: 'HTTP method', html: '<p>No match on method with a path that exists gives <strong>405</strong>, not 404 — a useful distinction when debugging.</p>' },
                        { name: 'consumes', html: '<p>Matched against <code>Content-Type</code>. No match is <strong>415 Unsupported Media Type</strong>.</p>' },
                        { name: 'produces', html: '<p>Matched against <code>Accept</code>. No match is <strong>406 Not Acceptable</strong>.</p>' },
                        { name: 'params and headers', html: '<p>Presence, absence or a specific value. Useful for header-based API versioning.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Trailing-slash matching was removed in Spring 6.</strong> <code>/invoices</code> and <code>/invoices/</code> used to match the same handler; now they do not, and the second one 404s. It is a deliberate change — the old behaviour made two URLs for every resource, which is bad for caching and for SEO — but it will break clients that had been getting away with it, and it is worth knowing when a Boot 3 upgrade produces mysterious 404s.</p>'
                }
            ],
            docs: [
                { title: 'Annotated Controllers — Request Mapping', url: 'https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-requestmapping.html', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'argument-resolvers',
            title: 'How the Parameters Get Filled',
            importance: 'should-know',
            summary: 'Every controller method parameter is produced by a HandlerMethodArgumentResolver. That is why the signature can be almost anything and still work.',
            interviewAngle: 'Comes up as "how would you inject the current user into every controller method". The good answer is a custom argument resolver rather than a ThreadLocal or a call to SecurityContextHolder in each method.',
            buildsOn: ['handler-mapping-and-adapter'],
            blocks: [
                {
                    type: 'types',
                    title: 'The resolvers you use constantly',
                    items: [
                        { name: '@PathVariable', html: '<p>From the URI template. Since Spring 6.0 the parameter name must be available — compile with <code>-parameters</code>, or name it explicitly. The Boot build plugins set the flag.</p>' },
                        { name: '@RequestParam', html: '<p>Query string or form field. <code>required = false</code>, a default, or <code>Optional&lt;T&gt;</code>.</p>' },
                        { name: '@RequestBody', html: '<p>Deserialised by a message converter. One per method, since the body is a stream that can be read once.</p>' },
                        { name: '@RequestHeader, @CookieValue', html: '<p>Exactly what they say.</p>' },
                        { name: 'A plain object', html: '<p>Bound from request parameters by name, with no annotation at all — <code>ModelAttributeMethodProcessor</code>. Convenient, and it means adding a field to a DTO silently adds a bindable parameter.</p>' },
                        { name: 'Infrastructure types', html: '<p><code>HttpServletRequest</code>, <code>Principal</code>, <code>Locale</code>, <code>UriComponentsBuilder</code>. Each has its own resolver.</p>' }
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'A custom resolver, which is the answer to the current-user question',
                    code: '@Retention(RUNTIME) @Target(PARAMETER)\npublic @interface CurrentUser { }\n\n@Component\nclass CurrentUserResolver implements HandlerMethodArgumentResolver {\n\n    public boolean supportsParameter(MethodParameter p) {\n        return p.hasParameterAnnotation(CurrentUser.class)\n                && p.getParameterType().equals(AppUser.class);\n    }\n\n    public Object resolveArgument(MethodParameter p, ModelAndViewContainer m,\n                                  NativeWebRequest request, WebDataBinderFactory b) {\n        return users.byName(request.getUserPrincipal().getName());\n    }\n}\n\n// The controller now says what it needs, and can be tested by passing it.\n@GetMapping("/me")\nProfile me(@CurrentUser AppUser user) { ... }',
                    notes: '<p>The gain is not brevity. It is that the dependency is in the signature: a unit test calls the method with a user, and no <code>SecurityContextHolder</code> has to be populated on the calling thread first.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Binding a JPA entity directly from request parameters is a mass-assignment vulnerability.</strong> A plain object parameter is bound by field name, so a request carrying <code>role=ADMIN</code> or <code>id=1</code> sets those fields if they exist. Bind to a DTO that contains only the fields a client is allowed to send. This is the strongest of several reasons not to use entities as request bodies, and the only one that is a security issue.</p>'
                }
            ],
            docs: [
                { title: 'Method Arguments', url: 'https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-methods/arguments.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'rest-api', questionId: 'request-parameter-binding' },
                { topicId: 'rest-api', questionId: 'dto-vs-entity' }
            ]
        },

        {
            id: 'message-converters',
            title: 'Message Converters',
            importance: 'must-know',
            summary: 'The two-way bridge between an HTTP body and a Java object. @RequestBody reads through one and @ResponseBody writes through one.',
            interviewAngle: 'The mechanism behind "Spring returns JSON automatically". Knowing that the converter is chosen by media type and by return type, and that a missing one produces 406 or 415 rather than an exception, is the level expected.',
            buildsOn: ['argument-resolvers'],
            blocks: [
                {
                    type: 'table',
                    title: 'The converters present by default',
                    headers: ['Converter', 'Handles', 'Present when'],
                    rows: [
                        ['<code>MappingJackson2HttpMessageConverter</code>', '<code>application/json</code>', 'Jackson is on the class path — always, with web'],
                        ['<code>StringHttpMessageConverter</code>', '<code>text/plain</code>', 'Always'],
                        ['<code>ByteArrayHttpMessageConverter</code>', '<code>application/octet-stream</code>', 'Always'],
                        ['<code>ResourceHttpMessageConverter</code>', 'File downloads, with range support', 'Always'],
                        ['<code>FormHttpMessageConverter</code>', 'Form posts and multipart', 'Always'],
                        ['<code>MappingJackson2XmlHttpMessageConverter</code>', '<code>application/xml</code>', 'The Jackson XML module is present']
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>Selection runs both ways. On the way in, Spring takes <code>Content-Type</code> and the target parameter type and asks each converter whether it <code>canRead</code> that combination; no taker means <strong>415</strong>. On the way out it takes <code>Accept</code> and the return type and asks <code>canWrite</code>; no taker means <strong>406</strong>. Neither is an exception in your code, which is why a media-type mismatch produces a bare status with no useful message unless you add one.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>To customise Jackson, configure the auto-configured <code>ObjectMapper</code> through <code>Jackson2ObjectMapperBuilderCustomizer</code> rather than defining your own <code>ObjectMapper</code> bean. Defining the bean replaces Boot\'s, and Boot\'s carries a good deal of configuration — Java time support, sensible defaults, module discovery — that is silently lost. This is the container module\'s back-off rule producing a bug rather than a convenience.</p>'
                }
            ],
            docs: [
                { title: 'HttpMessageConverter', url: 'https://docs.spring.io/spring-framework/reference/integration/rest-clients.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'rest-api', questionId: 'jackson-basics' }
            ]
        },

        {
            id: 'view-resolution-and-restcontroller',
            title: '@Controller and @RestController',
            importance: 'must-know',
            summary: 'Without @ResponseBody a returned String is a view name. With it, the String is the response body. That one difference is the whole annotation.',
            interviewAngle: 'A short question with a memorable failure: a @Controller returning "ok" tries to resolve a view called ok and 404s or throws. Being able to name that failure shows the mechanism is understood rather than the annotation memorised.',
            buildsOn: ['message-converters'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'The two stereotypes',
                    left: '@Controller',
                    right: '@RestController',
                    rows: [
                        { aspect: 'Is', left: 'A stereotype for a web handler', right: '<code>@Controller</code> + <code>@ResponseBody</code>' },
                        { aspect: 'A returned String means', left: '<strong>A view name</strong>', right: '<strong>The response body</strong>' },
                        { aspect: 'A returned object', left: 'Goes into the model', right: 'Serialised by a message converter' },
                        { aspect: 'For', left: 'Server-rendered pages — Thymeleaf, JSP', right: 'JSON and XML APIs' },
                        { aspect: 'Mixing', left: 'Add <code>@ResponseBody</code> per method', right: 'Return a <code>ModelAndView</code> for the exception' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A <code>@Controller</code> method returning <code>"ok"</code> asks the view resolver for a template called <code>ok</code>.</strong> With Thymeleaf present that is a <code>TemplateInputException</code>; without a view resolver it is a 404. The error mentions templates and not JSON, so it reads as a configuration problem rather than a missing annotation — which is why this one costs more time than its difficulty deserves.</p>'
                },
                {
                    type: 'tip',
                    html: '<p><code>ResponseEntity&lt;T&gt;</code> is worth preferring on any method that needs a status other than 200 or a header. It carries the status, the headers and the body together, which is both clearer than <code>@ResponseStatus</code> on the method and possible to vary per call — a 201 with a <code>Location</code> header cannot be expressed any other way.</p>'
                }
            ],
            docs: [
                { title: 'Annotated Controllers', url: 'https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'rest-api', questionId: 'controller-vs-restcontroller' }
            ]
        },

        {
            id: 'filters-vs-interceptors',
            title: 'Filters, Interceptors and Aspects',
            importance: 'must-know',
            summary: 'Three places to put cross-cutting behaviour, at three different depths. What each one can see is what decides between them.',
            interviewAngle: 'Reliably asked, and the answer is about visibility rather than preference. A filter sees bytes and no handler; an interceptor sees the handler and no method arguments; an aspect sees the arguments and no HTTP.',
            buildsOn: ['servlet-container-and-dispatcher'],
            blocks: [
                {
                    type: 'table',
                    title: 'What each layer can see',
                    headers: ['', 'Filter', 'Interceptor', 'Aspect'],
                    rows: [
                        ['Defined by', 'Servlet API', 'Spring MVC', 'Spring AOP'],
                        ['Runs', 'Outside <code>DispatcherServlet</code>', 'Inside it, around the handler', 'Around the bean method'],
                        ['Sees the raw request and response', '<strong>Yes</strong>', 'Yes', 'No'],
                        ['Can wrap or replace the stream', '<strong>Yes</strong>', 'No', 'No'],
                        ['Knows which handler was chosen', 'No', '<strong>Yes</strong>', 'Implicitly — it is the method'],
                        ['Sees resolved method arguments', 'No', 'No', '<strong>Yes</strong>'],
                        ['Runs for a 404', '<strong>Yes</strong>', 'No', 'No'],
                        ['Typical use', 'Security, CORS, correlation id, gzip', 'Auth per handler, timing, MDC', 'Transactions, retry, caching']
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>The rows that decide it are the last three. If the behaviour must apply to requests that never reach a handler — a correlation id on a 404, a security check on an unmapped path — it has to be a filter, because nothing else runs. If it needs the resolved arguments it has to be an aspect. Interceptors occupy the middle: they know the handler and have not yet paid for argument resolution.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A filter that reads the request body consumes it, and the controller then receives nothing.</strong> The body is a one-shot <code>InputStream</code>. Logging or inspecting it requires wrapping the request in a <code>ContentCachingRequestWrapper</code> and passing the wrapper down the chain — and caching a body means holding it in memory, which is a decision to make deliberately on an endpoint that accepts file uploads.</p>'
                }
            ],
            docs: [
                { title: 'Interceptors', url: 'https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-config/interceptors.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'rest-api', questionId: 'filters-vs-interceptors' },
                { topicId: 'aop-proxies', questionId: 'filters-interceptors-aspects' }
            ]
        },

        {
            id: 'servlet-async-and-deferredresult',
            title: 'Releasing the Request Thread',
            importance: 'should-know',
            summary: 'Returning a Callable, a DeferredResult or a CompletableFuture lets the container thread go while the work continues elsewhere.',
            interviewAngle: 'The bridge between this module and the concurrency track. The distinction that matters is who completes the result: the container does for a Callable, and you do for a DeferredResult.',
            buildsOn: ['view-resolution-and-restcontroller'],
            blocks: [
                {
                    type: 'types',
                    title: 'The async return types',
                    items: [
                        { name: 'Callable<T>', html: '<p>Spring submits it to a task executor and completes the response when it returns. Simple, and the executor is Spring\'s — which is <code>SimpleAsyncTaskExecutor</code> by default and worth replacing.</p>' },
                        { name: 'DeferredResult<T>', html: '<p><strong>You</strong> complete it, from whatever thread you like, whenever the answer arrives. This is the one for long polling and for a response that depends on an external callback.</p>' },
                        { name: 'CompletableFuture<T>', html: '<p>The modern form of the same idea, and it composes — see the executors module.</p>' },
                        { name: 'StreamingResponseBody', html: '<p>Write to the output stream directly, for a large download that must not be assembled in memory.</p>' },
                        { name: 'SseEmitter', html: '<p>Server-sent events: many messages on one long-lived response.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Async releases the container thread and does not release the database connection.</strong> If the work still holds a JDBC connection — or an open persistence context, or a transaction — then the scarce resource was never the servlet thread and nothing has been gained. Servlet async helps when the wait is on something that does not hold a pooled resource, and the honest answer is often that virtual threads solve the same problem without restructuring the controller.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Worth saying if this comes up in 2025 or later: <em>"On Java 21 with virtual threads enabled, most of the reason to write an async controller is gone. The blocking version already releases the carrier during IO, and it keeps the stack trace and the try/finally. I would reach for <code>DeferredResult</code> now only when the completion genuinely comes from somewhere else — a callback, a message, a long poll."</em></p>'
                }
            ],
            docs: [
                { title: 'Asynchronous Requests', url: 'https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-ann-async.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'rest-api', questionId: 'async-controller-methods' }
            ]
        }
    ]
};
