/* ==========================================================================
   data/theory/security-filter-chain.js — module 57 in the reading path

   The plan's tagline is the entire architecture and it is not a
   simplification: a list of filters. That is the whole thing. Everything
   Spring Security does is a filter in an ordered chain, and every question
   about "how does Spring Security do X" resolves to "which filter, and where
   in the order".

   Eight chapters. Two are about the chain itself, three are about the
   collaborators the authentication filters delegate to, and the last three
   are the ones people get wrong in practice: multiple chains and how they
   are selected, where a custom filter goes, and the filter that turns an
   exception into a 401 or a 403 — which is why a Spring Security error never
   looks like the rest of your API.

   Its prerequisites are auth-foundations and dispatcher-lifecycle, and the
   second matters: the whole chain runs OUTSIDE DispatcherServlet, which is
   the fact the last chapter is built on.
   ========================================================================== */

const securityFilterChainModule = {
    id: 'security-filter-chain',
    trackId: 'security',
    order: 57,
    title: 'The Spring Security Filter Chain',
    tagline: 'A list of filters. That is the whole architecture.',
    estimatedMinutes: 45,
    prerequisites: ['auth-foundations', 'dispatcher-lifecycle'],
    docHub: { title: 'Spring Security Architecture', url: 'https://docs.spring.io/spring-security/reference/servlet/architecture.html' },

    chapters: [
        {
            id: 'filter-chain-proxy',
            title: 'One Servlet Filter, Many Security Filters',
            importance: 'must-know',
            summary: 'Spring Security registers exactly one servlet filter. Inside it, FilterChainProxy picks a SecurityFilterChain for the request and runs that chain\'s filters in order.',
            interviewAngle: 'The structural fact everything else hangs on. Being able to name springSecurityFilterChain, FilterChainProxy and DelegatingFilterProxy in the right relationship is a clear signal.',
            buildsOn: [],
            blocks: [
                {
                    type: 'diagram',
                    diagramType: 'flowchart',
                    title: 'From the container to a controller',
                    diagramConfig: {
                        nodes: [
                            { id: 'req',   label: 'Request',                          kind: 'start' },
                            { id: 'dfp',   label: 'DelegatingFilterProxy\n(registered with the container)', kind: 'process' },
                            { id: 'fcp',   label: 'FilterChainProxy\n(a Spring bean)', kind: 'decision' },
                            { id: 'chain', label: 'The matched\nSecurityFilterChain',  kind: 'process' },
                            { id: 'ds',    label: 'DispatcherServlet',                 kind: 'process' },
                            { id: 'ctrl',  label: 'Controller',                        kind: 'end' },
                            { id: 'deny',  label: '401 or 403',                        kind: 'end' }
                        ],
                        edges: [
                            { from: 'req',   to: 'dfp' },
                            { from: 'dfp',   to: 'fcp',   label: 'delegates' },
                            { from: 'fcp',   to: 'chain', label: 'first matching chain' },
                            { from: 'chain', to: 'ds',    label: 'allowed' },
                            { from: 'chain', to: 'deny',  label: 'rejected — never reaches the dispatcher' },
                            { from: 'ds',    to: 'ctrl' }
                        ]
                    }
                },
                {
                    type: 'prose',
                    html: '<p>The servlet container knows nothing about Spring. So Spring Security registers a single container-level filter, <code>DelegatingFilterProxy</code>, whose only job is to look up a Spring bean named <code>springSecurityFilterChain</code> and hand the request to it. That bean is a <code>FilterChainProxy</code>.</p><p><code>FilterChainProxy</code> holds a <em>list of lists</em>: several <code>SecurityFilterChain</code> objects, each with a request matcher and its own ordered filters. It walks them in order, takes the <strong>first</strong> whose matcher accepts the request, and runs that chain — and only that chain. The others are not consulted.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The whole structure is inspectable at run time. Setting the logger <code>org.springframework.security.web.FilterChainProxy</code> to <code>DEBUG</code> prints the chain that matched and every filter as it runs, which turns "why is this request rejected" from a guess into a reading. It is the single most useful debugging step in this track.</p>'
                }
            ],
            docs: [
                { title: 'Architecture — FilterChainProxy', url: 'https://docs.spring.io/spring-security/reference/servlet/architecture.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-security', questionId: 'how-the-security-filter-chain-works' }
            ]
        },

        {
            id: 'the-filters-in-order',
            title: 'The Filters, in Order',
            importance: 'must-know',
            summary: 'Roughly fifteen filters in a fixed sequence. Knowing five of them and why the order is what it is beats memorising the list.',
            interviewAngle: 'The order is not arbitrary and being able to justify one adjacency — why the context filter is first, why authorization is last — is worth more than reciting names.',
            buildsOn: ['filter-chain-proxy'],
            blocks: [
                {
                    type: 'table',
                    title: 'The ones worth knowing, in the order they run',
                    headers: ['Filter', 'What it does', 'Why it is here'],
                    rows: [
                        ['<code>DisableEncodeUrlFilter</code>', 'Stops the session id being written into URLs', 'Must be before anything writes a response'],
                        ['<code>SecurityContextHolderFilter</code>', 'Loads any existing <code>SecurityContext</code>; clears it on the way out', '<strong>First, so everything downstream can see the identity</strong>'],
                        ['<code>HeaderWriterFilter</code>', 'Adds the security response headers', 'Early, so they are present even on an error response'],
                        ['<code>CorsFilter</code>', 'Handles preflight and adds CORS headers', '<strong>Before CSRF and authentication — a preflight carries no credentials</strong>'],
                        ['<code>CsrfFilter</code>', 'Validates the CSRF token on state-changing methods', 'Before authentication, so a forged request is rejected first'],
                        ['<code>LogoutFilter</code>', 'Handles the logout URL', 'Before the authentication filters, which would otherwise try to authenticate it'],
                        ['<code>UsernamePasswordAuthenticationFilter</code>', 'Processes a form login', 'The authentication step'],
                        ['<code>BearerTokenAuthenticationFilter</code>', 'Reads the <code>Authorization: Bearer</code> header', 'The resource-server authentication step'],
                        ['<code>AnonymousAuthenticationFilter</code>', 'Installs an anonymous token if nothing authenticated', 'So downstream code never sees a null <code>Authentication</code>'],
                        ['<code>ExceptionTranslationFilter</code>', 'Turns security exceptions into 401 or 403', '<strong>Immediately before authorization, so it can catch what it throws</strong>'],
                        ['<code>AuthorizationFilter</code>', 'Applies the URL rules', '<strong>Last — by now the identity is known</strong>']
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>Three adjacencies explain the design and are worth being able to justify. The context filter is <strong>first</strong> because every filter after it may need the identity. <code>ExceptionTranslationFilter</code> sits <strong>immediately before</strong> the authorization filter because its whole purpose is to catch what that filter throws — a filter can only catch exceptions from filters after it in the chain. And the authorization filter is <strong>last</strong> because it is the only one that needs a fully established identity to do its job.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>CORS must run before CSRF and before authentication, and getting that wrong produces a confusing failure.</strong> A browser preflight is an <code>OPTIONS</code> request with no credentials and no CSRF token, so if authentication runs first the preflight is rejected with a 401 — and the browser reports it as a CORS error, sending everybody to look at CORS configuration that is perfectly correct. Enabling CORS through Spring Security\'s DSL rather than as a standalone filter puts it in the right place automatically.</p>'
                }
            ],
            docs: [
                { title: 'Security Filters', url: 'https://docs.spring.io/spring-security/reference/servlet/architecture.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-security', questionId: 'how-the-security-filter-chain-works' },
                { topicId: 'spring-security', questionId: 'cors-and-preflight' }
            ]
        },

        {
            id: 'authenticationmanager-and-providers',
            title: 'AuthenticationManager and Providers',
            importance: 'must-know',
            summary: 'A filter extracts credentials and builds an unauthenticated token. The manager asks each provider whether it can handle that token type, and the first one that can, decides.',
            interviewAngle: 'The delegation model is the answer to "how would you add a second way to log in". A new provider, not a new filter.',
            buildsOn: ['the-filters-in-order'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The chain of responsibility, and where to plug in',
                    code: '// 1. The FILTER extracts credentials and builds an UNAUTHENTICATED token.\nUsernamePasswordAuthenticationToken request =\n        UsernamePasswordAuthenticationToken.unauthenticated(username, password);\n\n// 2. The MANAGER (ProviderManager) asks each provider: supports(class)?\n//    The first that says yes and does not throw, wins.\nAuthentication result = authenticationManager.authenticate(request);\n\n// 3. The FILTER stores the authenticated result.\nSecurityContextHolder.getContext().setAuthentication(result);\n\n// Adding a second way to log in is a PROVIDER, not a filter:\n@Component\nclass ApiKeyAuthenticationProvider implements AuthenticationProvider {\n\n    public boolean supports(Class<?> authentication) {\n        return ApiKeyAuthenticationToken.class.isAssignableFrom(authentication);\n    }\n\n    public Authentication authenticate(Authentication auth) {\n        ApiKey key = keys.find(((ApiKeyAuthenticationToken) auth).key())\n                .orElseThrow(() -> new BadCredentialsException("unknown key"));\n        if (key.revoked()) throw new DisabledException("key revoked");\n        return ApiKeyAuthenticationToken.authenticated(key.owner(), key.authorities());\n    }\n}',
                    notes: '<p>The distinction between throwing and returning <code>null</code> is load-bearing and easy to get wrong. Returning <code>null</code> means "I cannot judge this — ask the next provider". Throwing an <code>AuthenticationException</code> means "I judged it and it failed", and stops the chain. A provider that throws when it should have returned null blocks every provider after it.</p>'
                },
                {
                    type: 'table',
                    title: 'The exceptions, and what each one means',
                    headers: ['Exception', 'Meaning', 'What the user is told'],
                    rows: [
                        ['<code>BadCredentialsException</code>', 'Wrong password, or no such user', '<strong>The same message for both.</strong> Distinguishing them is a username oracle.'],
                        ['<code>UsernameNotFoundException</code>', 'No such user', 'Converted to <code>BadCredentialsException</code> by default — deliberately'],
                        ['<code>DisabledException</code>', 'The account is disabled', 'Safe to be specific; the credentials were correct'],
                        ['<code>LockedException</code>', 'Locked, usually after failed attempts', 'Safe to be specific, and useful'],
                        ['<code>CredentialsExpiredException</code>', 'Password expired', 'Prompt for a change'],
                        ['<code>AuthenticationServiceException</code>', 'The mechanism itself failed', 'A 500. This is not the user\'s fault.']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong><code>hideUserNotFoundExceptions</code> defaults to true and turning it off leaks user existence.</strong> With it on, "no such user" and "wrong password" both surface as <code>BadCredentialsException</code>, so an attacker cannot enumerate accounts through the login form. Someone will eventually ask for a friendlier "we do not have an account with that email" message; the answer is that the friendliness is an enumeration oracle, and the place to be helpful is the password-reset flow, which should say the same thing whether or not the address exists.</p>'
                }
            ],
            docs: [
                { title: 'Authentication Architecture', url: 'https://docs.spring.io/spring-security/reference/servlet/authentication/architecture.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-security', questionId: 'authenticationmanager-and-providers' }
            ]
        },

        {
            id: 'userdetailsservice',
            title: 'UserDetailsService',
            importance: 'should-know',
            summary: 'One method: username in, UserDetails out, or throw. It is where your user table meets Spring Security, and it is not involved at all in a resource server.',
            interviewAngle: 'A simple component with one subtlety worth knowing — it does not check the password. It loads the stored hash and the provider does the comparison.',
            buildsOn: ['authenticationmanager-and-providers'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The whole interface, and the four flags people forget',
                    code: '@Service\nclass DatabaseUserDetailsService implements UserDetailsService {\n\n    // Note: it does NOT take a password and does NOT verify anything.\n    // It returns the stored hash; DaoAuthenticationProvider compares.\n    public UserDetails loadUserByUsername(String username) {\n        UserRecord u = users.findByEmail(username)\n                .orElseThrow(() -> new UsernameNotFoundException(username));\n\n        return User.withUsername(u.email())\n                .password(u.passwordHash())          // the stored {bcrypt}$2a$...\n                .authorities(u.authorities())\n                .accountLocked(u.lockedUntil() != null\n                        && u.lockedUntil().isAfter(Instant.now()))\n                .disabled(!u.active())\n                .credentialsExpired(u.passwordExpiresAt() != null\n                        && u.passwordExpiresAt().isBefore(Instant.now()))\n                .accountExpired(false)\n                .build();\n    }\n}\n\n// The four boolean flags are checked by UserDetailsChecker BEFORE and\n// AFTER the password comparison. Returning a UserDetails that hardcodes\n// them all true -- which every tutorial does -- means a disabled account\n// can still log in.',
                    notes: '<p>The provider deliberately compares the password even when the user was not found, using a dummy hash, so that a request for a non-existent user takes the same time as one for an existing user with the wrong password. Without that, response timing is an enumeration oracle — and it is a nice illustration of a mitigation you would never think to add and would never notice missing.</p>'
                },
                {
                    type: 'tip',
                    html: '<p><code>UserDetailsService</code> has no role in a JWT resource server. There, the identity comes entirely from the validated token and nothing loads a user. That is exactly the statelessness the previous module described, and it is why a resource server that wants to check "is this account still active" has to add a lookup back in — at which point it is doing what <code>UserDetailsService</code> does, without the framework support.</p>'
                }
            ],
            docs: [
                { title: 'UserDetailsService', url: 'https://docs.spring.io/spring-security/reference/servlet/authentication/passwords/user-details-service.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-security', questionId: 'authenticationmanager-and-providers' }
            ]
        },

        {
            id: 'securitycontextholder',
            title: 'SecurityContextHolder',
            importance: 'must-know',
            summary: 'A ThreadLocal holding the current Authentication. Which means it does not follow you onto another thread — not into @Async, not into a parallel stream, not into a reactive chain.',
            interviewAngle: 'The @Async question is a genuine production bug and a good depth probe: the security context is thread-bound, so the work executed elsewhere runs as nobody.',
            buildsOn: ['userdetailsservice'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Reading it, and the propagation problem',
                    code: 'Authentication auth = SecurityContextHolder.getContext().getAuthentication();\nString who = auth.getName();\n\n// In a controller, prefer the injected forms -- they are testable and\n// they do not reach into a static.\n@GetMapping("/me")\nProfile me(@AuthenticationPrincipal UserDetails user) { ... }\n\n@GetMapping("/orders")\nList<Order> mine(Authentication authentication) { ... }\n\n// THE BUG. @Async runs on another thread, and the ThreadLocal does not\n// follow. getAuthentication() returns null and every @PreAuthorize in\n// the async path fails -- or worse, passes as anonymous.\n@Async\nvoid rebuildReport() {\n    SecurityContextHolder.getContext().getAuthentication();   // null\n}\n\n// The fix, once, at configuration time:\n@Bean\nInitializingBean securityContextStrategy() {\n    return () -> SecurityContextHolder.setStrategyName(\n            SecurityContextHolder.MODE_INHERITABLETHREADLOCAL);\n}\n// Or, better and more explicit: wrap the executor.\n@Bean\nExecutor taskExecutor(ThreadPoolTaskExecutor delegate) {\n    return new DelegatingSecurityContextExecutor(delegate);\n}',
                    notes: '<p><code>MODE_INHERITABLETHREADLOCAL</code> copies the context to a thread <em>at creation</em>, which works for a thread created per task and does <strong>not</strong> work for a pooled thread that was created before the request existed. Since almost every executor is pooled, <code>DelegatingSecurityContextExecutor</code> is the fix that actually holds — it captures the context at submit time and installs it around the task.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>The context must be cleared, and on a pooled thread that is a security issue rather than a leak.</strong> <code>SecurityContextHolderFilter</code> clears it in a <code>finally</code> on the way out, which is why it is the outermost filter. Code that sets the context by hand — a test, a scheduled job, a message consumer — and does not clear it leaves the previous principal installed on a thread the pool will hand to the next request. That is a privilege escalation, and it is silent.</p>'
                }
            ],
            docs: [
                { title: 'SecurityContextHolder', url: 'https://docs.spring.io/spring-security/reference/servlet/authentication/architecture.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'concurrency', questionId: 'threadlocal-leaks' },
                { topicId: 'beyond-rest', questionId: 'reactive-context-and-threadlocal' }
            ]
        },

        {
            id: 'multiple-filter-chains',
            title: 'More Than One Chain',
            importance: 'should-know',
            summary: 'Several SecurityFilterChain beans, each with a matcher, ordered. The first match wins and the rest are never consulted, which is the source of the most common misconfiguration in this track.',
            interviewAngle: 'The practical question — an API with JWT and an admin UI with form login in one application — and the ordering trap that comes with it.',
            buildsOn: ['securitycontextholder'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Two chains, ordered, with the trap made explicit',
                    code: '@Bean\n@Order(1)                                  // MUST be first: narrower matcher\nSecurityFilterChain api(HttpSecurity http) throws Exception {\n    return http\n            .securityMatcher("/api/**")        // only /api/**\n            .csrf(csrf -> csrf.disable())      // token in a header, not a cookie\n            .sessionManagement(s -> s.sessionCreationPolicy(STATELESS))\n            .authorizeHttpRequests(a -> a\n                    .requestMatchers("/api/public/**").permitAll()\n                    .anyRequest().authenticated())\n            .oauth2ResourceServer(o -> o.jwt(withDefaults()))\n            .build();\n}\n\n@Bean\n@Order(2)                                  // the catch-all, LAST\nSecurityFilterChain web(HttpSecurity http) throws Exception {\n    return http                                 // no securityMatcher = everything\n            .authorizeHttpRequests(a -> a\n                    .requestMatchers("/admin/**").hasRole("ADMIN")\n                    .anyRequest().authenticated())\n            .formLogin(withDefaults())\n            .build();\n}\n\n// Swap the @Order values and the catch-all matches /api/** first. The\n// API chain is then DEAD CODE: JWT authentication never runs, and API\n// clients are redirected to an HTML login page. No error anywhere.',
                    notes: '<p>The failure mode is worth picturing because it is so recognisable in a bug report: an API client posting JSON receives a <code>302</code> to <code>/login</code> and an HTML body. Everyone looks at the JWT configuration, which is correct, and nobody looks at the ordering, which is not.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Two rules that avoid all of it: <strong>every chain except the last has a <code>securityMatcher</code></strong>, and <strong>the chain with no matcher is ordered last.</strong> Then add the <code>FilterChainProxy</code> DEBUG logging from the first chapter to a startup smoke test — it prints which chain matched, which makes the misconfiguration visible in a log line rather than in a support ticket.</p>'
                }
            ],
            docs: [
                { title: 'Multiple SecurityFilterChains', url: 'https://docs.spring.io/spring-security/reference/servlet/configuration/java.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-security', questionId: 'configuring-security-in-spring-6' }
            ]
        },

        {
            id: 'custom-filter-placement',
            title: 'Adding a Filter',
            importance: 'should-know',
            summary: 'addFilterBefore, addFilterAfter or addFilterAt, always relative to an existing filter. Position is the entire decision, and getting it wrong gives a filter that runs as nobody or never runs at all.',
            interviewAngle: 'The concrete "how would you add API-key authentication" answer. Naming the reference filter, and saying why, is the substance.',
            buildsOn: ['multiple-filter-chains'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Where to put it, and why there',
                    code: 'class ApiKeyFilter extends OncePerRequestFilter {\n\n    protected void doFilterInternal(HttpServletRequest request,\n                                    HttpServletResponse response,\n                                    FilterChain chain)\n            throws ServletException, IOException {\n\n        String key = request.getHeader("X-Api-Key");\n        if (key != null &&\n            SecurityContextHolder.getContext().getAuthentication() == null) {\n            try {\n                Authentication auth = manager.authenticate(\n                        ApiKeyAuthenticationToken.unauthenticated(key));\n                SecurityContext ctx = SecurityContextHolder.createEmptyContext();\n                ctx.setAuthentication(auth);\n                SecurityContextHolder.setContext(ctx);\n            } catch (AuthenticationException e) {\n                SecurityContextHolder.clearContext();\n                // Do NOT write a response here. Let the chain decide --\n                // otherwise the entry point never runs and the error shape\n                // is inconsistent with every other 401 in the app.\n            }\n        }\n        chain.doFilter(request, response);   // ALWAYS continue\n    }\n}\n\nhttp.addFilterBefore(apiKeyFilter, UsernamePasswordAuthenticationFilter.class);',
                    notes: '<p>Two conventions in that method are worth copying. <code>OncePerRequestFilter</code> guarantees the filter runs once even when the request is forwarded internally, which a plain <code>Filter</code> does not. And the filter authenticates but never rejects: rejection is <code>AuthorizationFilter</code>\'s job, and letting it do that job is what keeps the 401 body identical to every other 401 the application produces.</p>'
                },
                {
                    type: 'table',
                    title: 'Choosing the reference point',
                    headers: ['Your filter', 'Position', 'Why'],
                    rows: [
                        ['Authenticates a request', 'Before <code>UsernamePasswordAuthenticationFilter</code>', 'The identity must exist before authorization runs'],
                        ['Reads the identity — audit, tenant resolution, MDC', 'After <code>AuthorizationFilter</code>', 'The identity is established and the request is permitted'],
                        ['Rate limiting or request size limits', 'Before everything — a container filter, or before the context filter', 'Reject cheap, before doing any work'],
                        ['Adds a correlation id', 'A plain container filter outside the whole chain', 'It must cover security failures too, or a 401 has no correlation id']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A <code>@Component</code> filter is registered twice.</strong> Spring Boot auto-registers any <code>Filter</code> bean with the servlet container, <em>and</em> your <code>addFilterBefore</code> puts it in the security chain — so it runs once outside the chain, before authentication exists, and once inside it. The symptom is a filter that sees a null <code>Authentication</code> on its first invocation and a valid one on its second. The fix is a <code>FilterRegistrationBean</code> with <code>setEnabled(false)</code>, or not making it a bean at all.</p>'
                }
            ],
            docs: [
                { title: 'Adding a Custom Filter', url: 'https://docs.spring.io/spring-security/reference/servlet/architecture.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-security', questionId: 'service-to-service-authentication' },
                { topicId: 'rest-api', questionId: 'filters-vs-interceptors' }
            ]
        },

        {
            id: 'exception-translation-filter',
            title: 'ExceptionTranslationFilter',
            importance: 'must-know',
            summary: 'It catches AuthenticationException and AccessDeniedException from further down the chain and turns them into a response. This is why a Spring Security 401 does not look like the rest of your API.',
            interviewAngle: 'The mechanical explanation for a very common complaint, and it ties the whole module back to the dispatcher lifecycle: the chain runs outside DispatcherServlet, so @ControllerAdvice is not reachable.',
            buildsOn: ['custom-filter-placement'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p><code>ExceptionTranslationFilter</code> wraps the rest of the chain in a <code>try</code>. It catches exactly two things and treats them differently, and the distinction is the useful part:</p><ul><li><code>AuthenticationException</code> — nobody is authenticated. It calls the <strong><code>AuthenticationEntryPoint</code></strong>, which asks for credentials: a 401 with <code>WWW-Authenticate</code>, or a redirect to a login page.</li><li><code>AccessDeniedException</code> — somebody <em>is</em> authenticated and is not permitted. If they are anonymous it treats it as the first case, because logging in might help. Otherwise it calls the <strong><code>AccessDeniedHandler</code></strong>: a 403.</li></ul><p>The anonymous special case is the neat bit: an unauthenticated user hitting a protected page is sent to log in rather than told 403, without either filter having to know about the other.</p>'
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Making a security error look like every other error',
                    code: '// The problem: @ControllerAdvice is a component INSIDE DispatcherServlet,\n// and this filter is outside it. A 401 therefore has whatever body\n// Spring Security writes -- not your ProblemDetail.\n\n@Bean\nSecurityFilterChain api(HttpSecurity http, ObjectMapper mapper) throws Exception {\n    return http\n            .exceptionHandling(e -> e\n                    .authenticationEntryPoint((request, response, ex) ->\n                            writeProblem(response, mapper, UNAUTHORIZED,\n                                    "Authentication required", request))\n                    .accessDeniedHandler((request, response, ex) ->\n                            writeProblem(response, mapper, FORBIDDEN,\n                                    "Not permitted", request)))\n            .build();\n}\n\nstatic void writeProblem(HttpServletResponse response, ObjectMapper mapper,\n                         HttpStatus status, String detail,\n                         HttpServletRequest request) throws IOException {\n    ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);\n    problem.setInstance(URI.create(request.getRequestURI()));\n    response.setStatus(status.value());\n    response.setContentType("application/problem+json");\n    mapper.writeValue(response.getOutputStream(), problem);\n}',
                    notes: '<p>Configuring these two handlers is what makes an API consistent, and it is skipped in most codebases — which is why a 401 from an otherwise well-behaved API arrives as an empty body or an HTML page while every other error is a well-formed problem document. It is twenty lines, once.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A filter that writes its own error response bypasses all of this.</strong> A JWT filter that catches an expired-token exception and writes a 401 itself produces a body that differs from the entry point\'s, so the same API returns two different 401 shapes depending on which failure occurred. The rule from the previous chapter is what avoids it: a filter authenticates or declines to, and the chain decides what a failure looks like.</p>'
                }
            ],
            docs: [
                { title: 'Handling Security Exceptions', url: 'https://docs.spring.io/spring-security/reference/servlet/architecture.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'rest-api', questionId: 'controlleradvice-and-problemdetail' },
                { topicId: 'spring-security', questionId: 'how-the-security-filter-chain-works' }
            ]
        }
    ]
};
