/* ==========================================================================
   data/spring-security.js — Spring Security, JWT & OAuth2

   The first topic on the `security` track, which means this file is what
   makes that group appear in the sidebar at all.

   Four subsections, and the split is by what the question is really about.
   The filter chain is mechanism. JWT and sessions is a design decision with
   a well-known wrong answer. OAuth2 is vocabulary — most candidates have
   used it and cannot name the four roles. Hardening is the part that is
   asked as "what would you check before this went public".

   THE VERSION LINE THAT MATTERS: WebSecurityConfigurerAdapter was deprecated
   in Spring Security 5.7 and REMOVED in 6.0. An answer built around
   extending it dates a candidate precisely, and it is still the first result
   for most searches.

   ONE GLOBAL PER FILE.
   ========================================================================== */

const springSecurityData = {
    id: 'spring-security',
    title: 'Spring Security, JWT & OAuth2',
    subsections: [
        { id: 'chain',     title: 'The Filter Chain' },
        { id: 'tokens',    title: 'JWT & Sessions' },
        { id: 'oauth',     title: 'OAuth2 & OIDC' },
        { id: 'hardening', title: 'CORS, CSRF & Hardening' }
    ],
    keyTopics: [
        'SecurityFilterChain', 'AuthenticationManager', 'UserDetailsService',
        'password encoding', 'JWT signing and validation', 'token revocation',
        'refresh tokens', 'authorization code flow with PKCE', '@PreAuthorize',
        'CORS preflight', 'CSRF on stateless APIs', 'OWASP API Top 10'
    ],
    questions: [

/* ==== The Filter Chain ================================================ */

{
    id: 'how-the-security-filter-chain-works',
    importance: 'must-know',
    subsection: 'chain',
    question: 'How does a request travel through Spring Security?',
    answer:
        '<p>Through a chain of <strong>servlet filters, before the DispatcherServlet ever sees ' +
        'it</strong>. That is the single most useful fact about Spring Security, because it ' +
        'explains why security decisions happen before your controller, before ' +
        '<code>@ControllerAdvice</code>, and before anything Spring MVC knows about.</p>' +
        '<p>The path:</p>' +
        '<ul>' +
        '<li>The servlet container calls <strong><code>DelegatingFilterProxy</code></strong>, a ' +
        'plain filter registered in the container that delegates to a Spring bean — the bridge ' +
        'between the container\'s lifecycle and the application context.</li>' +
        '<li>That bean is <strong><code>FilterChainProxy</code></strong>, which holds a list of ' +
        '<code>SecurityFilterChain</code>s and picks the <strong>first one whose matcher ' +
        'matches</strong>. First, not all — so chain ordering matters and a broad matcher early ' +
        'swallows everything after it.</li>' +
        '<li>The chosen chain runs its filters in a fixed order.</li>' +
        '</ul>' +
        '<p>The filters worth naming, roughly in order:</p>' +
        '<ul>' +
        '<li><strong><code>SecurityContextHolderFilter</code></strong> — loads any existing ' +
        'authentication into the <code>SecurityContextHolder</code> and clears it afterwards. The ' +
        'clearing is not optional bookkeeping: threads are pooled, and a context left behind ' +
        'leaks one user\'s identity into another user\'s request.</li>' +
        '<li><strong><code>CsrfFilter</code></strong>.</li>' +
        '<li>An <strong>authentication filter</strong> — ' +
        '<code>UsernamePasswordAuthenticationFilter</code> for form login, ' +
        '<code>BearerTokenAuthenticationFilter</code> for a resource server.</li>' +
        '<li><strong><code>ExceptionTranslationFilter</code></strong> — catches the two security ' +
        'exceptions thrown further down and turns them into a 401 via ' +
        '<code>AuthenticationEntryPoint</code> or a 403 via <code>AccessDeniedHandler</code>.</li>' +
        '<li><strong><code>AuthorizationFilter</code></strong> — the last one, which makes the ' +
        'actual decision. It replaced <code>FilterSecurityInterceptor</code> in Spring Security ' +
        '6.</li>' +
        '</ul>' +
        '<p>The consequence people meet in practice: an exception thrown by a filter cannot be ' +
        'handled by <code>@ControllerAdvice</code>, because that runs inside the servlet. A ' +
        'consistent error body for 401 and 403 therefore has to be produced by the entry point ' +
        'and the denied handler.</p>',
    referenceLinks: [
        { title: 'Spring Security — Architecture', url: 'https://docs.spring.io/spring-security/reference/servlet/architecture.html' }
    ],
    tags: ['spring-security', 'filters', 'must-know'],
    images: [],
    hasDiagram: true,
    diagramType: 'flowchart',
    diagramConfig: {
        title: 'A request through the security filter chain',
        nodes: [
            { id: 'container', label: 'servlet container', kind: 'start' },
            { id: 'proxy',     label: 'DelegatingFilterProxy', kind: 'step' },
            { id: 'chainproxy',label: 'FilterChainProxy: first matching SecurityFilterChain', kind: 'step' },
            { id: 'context',   label: 'SecurityContextHolderFilter', kind: 'step' },
            { id: 'authn',     label: 'authentication filter (form / bearer token)', kind: 'step' },
            { id: 'translate', label: 'ExceptionTranslationFilter', kind: 'step' },
            { id: 'authz',     label: 'AuthorizationFilter: permit or deny', kind: 'step' },
            { id: 'servlet',   label: 'DispatcherServlet, then your controller', kind: 'step' },
            { id: 'denied',    label: '401 entry point / 403 denied handler', kind: 'trap' }
        ],
        edges: [
            { from: 'container',  to: 'proxy' },
            { from: 'proxy',      to: 'chainproxy' },
            { from: 'chainproxy', to: 'context' },
            { from: 'context',    to: 'authn' },
            { from: 'authn',      to: 'translate' },
            { from: 'translate',  to: 'authz' },
            { from: 'authz',      to: 'servlet', label: 'permitted' },
            { from: 'authz',      to: 'denied',  label: 'denied' },
            { from: 'denied',     to: 'translate', label: 'handled here, not by @ControllerAdvice' }
        ]
    },
    codeSnippets: []
},

{
    id: 'configuring-security-in-spring-6',
    importance: 'must-know',
    subsection: 'chain',
    question: 'How do you configure Spring Security today, and what changed?',
    answer:
        '<p>With a <code>SecurityFilterChain</code> <strong>bean</strong>, using the lambda DSL. ' +
        'Not by extending anything.</p>' +
        '<p><code>WebSecurityConfigurerAdapter</code> was deprecated in Spring Security ' +
        '<strong>5.7</strong> and <strong>removed in 6.0</strong>. Any answer that starts with ' +
        '"extend <code>WebSecurityConfigurerAdapter</code> and override <code>configure</code>" ' +
        'dates a candidate to before 2022 — and it is still what most search results and a great ' +
        'deal of training material show.</p>' +
        '<p>What the component-based approach buys, beyond fashion:</p>' +
        '<ul>' +
        '<li><strong>Several chains, ordered, each with its own matcher.</strong> A stateless ' +
        'bearer-token chain for <code>/api/**</code> and a form-login chain for everything else ' +
        'is two beans with <code>@Order</code>, which was awkward with the adapter.</li>' +
        '<li><strong>Everything is a bean</strong>, so it can be injected, tested and replaced ' +
        'individually — <code>AuthenticationManager</code>, <code>UserDetailsService</code>, ' +
        '<code>PasswordEncoder</code>.</li>' +
        '<li><strong>No inheritance</strong>, so no ambiguity about which overridden method wins ' +
        'when two configurations exist.</li>' +
        '</ul>' +
        '<p>The other version detail: the <strong>non-lambda DSL is deprecated</strong> from ' +
        'Spring Security 6.1 and gone in 7. Chained calls like ' +
        '<code>.csrf().disable().and().authorizeHttpRequests()</code> are the old shape; the ' +
        'lambda form is required now. And <code>authorizeRequests</code> became ' +
        '<code>authorizeHttpRequests</code>, with <code>antMatchers</code> becoming ' +
        '<code>requestMatchers</code>.</p>',
    referenceLinks: [
        { title: 'Spring Security — Java Configuration', url: 'https://docs.spring.io/spring-security/reference/servlet/configuration/java.html' }
    ],
    tags: ['spring-security', 'configuration', 'versions'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: [
        {
            language: 'java',
            title: 'Two chains, ordered, in the modern shape',
            code:
                '@Configuration\n' +
                '@EnableWebSecurity\n' +
                '@EnableMethodSecurity\n' +
                'class SecurityConfig {\n' +
                '\n' +
                '    @Bean\n' +
                '    @Order(1)\n' +
                '    SecurityFilterChain api(HttpSecurity http) throws Exception {\n' +
                '        return http\n' +
                '            .securityMatcher("/api/**")\n' +
                '            .csrf(csrf -> csrf.disable())            // no cookies: see the CSRF question\n' +
                '            .sessionManagement(s -> s.sessionCreationPolicy(STATELESS))\n' +
                '            .authorizeHttpRequests(a -> a\n' +
                '                .requestMatchers("/api/public/**").permitAll()\n' +
                '                .anyRequest().authenticated())\n' +
                '            .oauth2ResourceServer(o -> o.jwt(Customizer.withDefaults()))\n' +
                '            .build();\n' +
                '    }\n' +
                '\n' +
                '    @Bean\n' +
                '    @Order(2)\n' +
                '    SecurityFilterChain web(HttpSecurity http) throws Exception {\n' +
                '        return http\n' +
                '            .authorizeHttpRequests(a -> a.anyRequest().authenticated())\n' +
                '            .formLogin(Customizer.withDefaults())\n' +
                '            .build();\n' +
                '    }\n' +
                '\n' +
                '    @Bean\n' +
                '    PasswordEncoder passwordEncoder() {\n' +
                '        return PasswordEncoderFactories.createDelegatingPasswordEncoder();\n' +
                '    }\n' +
                '}',
            output: {
                kind: 'trace',
                lines: ['/api/** is matched by chain 1 only; everything else falls through to chain 2'],
                explain:
                    '<p>FilterChainProxy picks the <em>first</em> matching chain and runs only ' +
                    'that one. Reversing the order here would send every request to the ' +
                    'form-login chain, because its matcher is everything — the most common ' +
                    'multi-chain mistake, and it presents as an API redirecting to a login ' +
                    'page.</p>'
            }
        }
    ]
},

{
    id: 'authentication-versus-authorization',
    importance: 'must-know',
    subsection: 'chain',
    question: 'What is the difference between authentication and authorization, and where does each happen?',
    answer:
        '<p><strong>Authentication is who you are. Authorization is what you may do.</strong> ' +
        'They map onto two different HTTP status codes and two different points in the ' +
        'chain.</p>' +
        '<ul>' +
        '<li><strong>401 Unauthorized</strong> — a misnomer that has survived thirty years. It ' +
        'means <em>unauthenticated</em>: we do not know who you are, or your credentials were ' +
        'rejected. The response should carry a <code>WWW-Authenticate</code> header saying how ' +
        'to authenticate.</li>' +
        '<li><strong>403 Forbidden</strong> — we know who you are and you may not do this. ' +
        'Retrying with the same credentials will not help.</li>' +
        '</ul>' +
        '<p>In Spring the objects follow the same split. Authentication produces an ' +
        '<code>Authentication</code> holding a principal and a collection of ' +
        '<code>GrantedAuthority</code>, stored in the <code>SecurityContextHolder</code>. ' +
        'Authorization is <code>AuthorizationFilter</code> consulting an ' +
        '<code>AuthorizationManager</code> against that object, plus method security at the ' +
        'service layer.</p>' +
        '<p>Two follow-ups worth pre-empting:</p>' +
        '<p><strong>Roles versus authorities.</strong> There is no such thing as a role in Spring ' +
        'Security — <code>hasRole("ADMIN")</code> is exactly <code>hasAuthority("ROLE_ADMIN")</code>. ' +
        'The prefix is the entire mechanism, and forgetting it while loading authorities from a ' +
        'database is why <code>hasRole</code> silently denies everyone.</p>' +
        '<p><strong>Sometimes 404 is the right answer to a 403.</strong> Returning 403 for a ' +
        'resource that exists but is not yours confirms it exists, which is an information leak. ' +
        'For anything sensitive, 404 for both cases is the more defensible choice.</p>',
    referenceLinks: [
        { title: 'Spring Security — Authorization', url: 'https://docs.spring.io/spring-security/reference/servlet/authorization/index.html' }
    ],
    tags: ['spring-security', 'fundamentals', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'authenticationmanager-and-providers',
    importance: 'should-know',
    subsection: 'chain',
    question: 'What is the relationship between AuthenticationManager, AuthenticationProvider and UserDetailsService?',
    answer:
        '<p>Three levels of a strategy chain, and knowing which to customise for a given ' +
        'requirement is the point of the question.</p>' +
        '<ul>' +
        '<li><strong><code>AuthenticationManager</code></strong> — the entry point. One method: ' +
        'take an unauthenticated <code>Authentication</code>, return an authenticated one or ' +
        'throw. The usual implementation is <code>ProviderManager</code>.</li>' +
        '<li><strong><code>AuthenticationProvider</code></strong> — one way of authenticating. ' +
        '<code>ProviderManager</code> holds a list and asks each whether it ' +
        '<code>supports</code> the token type, stopping at the first that succeeds. This is where ' +
        'you plug in a <strong>new kind of credential</strong> — an API key, an LDAP bind, a ' +
        'one-time code.</li>' +
        '<li><strong><code>UserDetailsService</code></strong> — a lookup, not an authenticator. ' +
        'One method, <code>loadUserByUsername</code>, returning a <code>UserDetails</code> with a ' +
        'password hash and authorities. <code>DaoAuthenticationProvider</code> calls it and does ' +
        'the password comparison itself, through the <code>PasswordEncoder</code>.</li>' +
        '</ul>' +
        '<p>So the decision rule: <strong>a different user store means a custom ' +
        '<code>UserDetailsService</code>; a different kind of credential means a custom ' +
        '<code>AuthenticationProvider</code>.</strong> Implementing a provider when you only ' +
        'needed a service is the usual over-reach, and it means re-implementing the password ' +
        'comparison — which is exactly the code you least want to write yourself.</p>' +
        '<p>Two details that catch people out. <code>loadUserByUsername</code> must throw ' +
        '<code>UsernameNotFoundException</code> and never return null. And it should ' +
        '<strong>not</strong> distinguish "no such user" from "wrong password" in what reaches ' +
        'the client — Spring hides this by default, and a helpful custom error message ' +
        'reintroduces user enumeration.</p>',
    referenceLinks: [
        { title: 'Spring Security — Authentication Architecture', url: 'https://docs.spring.io/spring-security/reference/servlet/authentication/architecture.html' }
    ],
    tags: ['spring-security', 'authentication'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

/* ==== JWT & Sessions ================================================== */

{
    id: 'session-versus-jwt',
    importance: 'must-know',
    subsection: 'tokens',
    question: 'Sessions or JWTs — which would you choose, and why?',
    answer:
        '<p>The trade is <strong>a lookup against a revocation problem</strong>, and the correct ' +
        'answer is "sessions" far more often than it is chosen.</p>' +
        '<p><strong>Server-side sessions.</strong> The cookie holds an opaque id; the state lives ' +
        'in the server, or in Redis via Spring Session. Every request costs a lookup. In return ' +
        'you get <strong>instant revocation</strong> — delete the row and the user is out — the ' +
        'ability to list and terminate a user\'s sessions, and no sensitive data on the client. ' +
        'The lookup people cite as the drawback is a sub-millisecond Redis GET, and the same ' +
        'application will happily make five database calls to render the page.</p>' +
        '<p><strong>JWTs.</strong> The token carries claims and a signature, so any service with ' +
        'the public key can validate it without a lookup or shared session store. That genuinely ' +
        'matters when many independent services must verify without calling a central ' +
        'authority.</p>' +
        '<p>What it costs, and this is the part the question exists to find out whether you ' +
        'know:</p>' +
        '<ul>' +
        '<li><strong>You cannot revoke one.</strong> A signed token is valid until it expires. ' +
        'Password changed, account disabled, token stolen — it still works.</li>' +
        '<li><strong>Claims go stale.</strong> Roles baked in at issue time are wrong the moment ' +
        'they change.</li>' +
        '<li><strong>The token is bigger</strong>, on every request.</li>' +
        '</ul>' +
        '<p>And the observation that lands: <strong>a JWT with a server-side denylist is a ' +
        'session with extra steps</strong>. Once you add the lookup back to get revocation, you ' +
        'have paid for statelessness and not received it.</p>' +
        '<p>So: sessions for a first-party web application; JWTs for service-to-service and for ' +
        'genuinely distributed verification, with short lifetimes.</p>',
    referenceLinks: [
        { title: 'Spring Session — Reference', url: 'https://docs.spring.io/spring-session/reference/' }
    ],
    tags: ['spring-security', 'jwt', 'sessions', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'jwt-structure-and-validation',
    importance: 'must-know',
    subsection: 'tokens',
    question: 'What is in a JWT, and what must a server check before trusting one?',
    answer:
        '<p>Three base64url segments separated by dots: <strong>header, payload, ' +
        'signature</strong>. The first two are <strong>encoded, not encrypted</strong> — anyone ' +
        'holding the token can read every claim, which is why a JWT must never carry anything ' +
        'secret.</p>' +
        '<p>The registered claims worth knowing by name: <code>iss</code> (issuer), ' +
        '<code>sub</code> (subject), <code>aud</code> (audience), <code>exp</code> (expiry), ' +
        '<code>nbf</code> (not before), <code>iat</code> (issued at), <code>jti</code> (a unique ' +
        'id, which is what a denylist keys on).</p>' +
        '<p>Validation is a list, and skipping any item is a real vulnerability:</p>' +
        '<ul>' +
        '<li><strong>Verify the signature</strong> with a key you already trust.</li>' +
        '<li><strong>Check <code>alg</code> against an expected algorithm</strong> that you ' +
        'chose, not one the token proposes. See the next question.</li>' +
        '<li><strong>Check <code>exp</code> and <code>nbf</code></strong>, with a small clock ' +
        'skew allowance.</li>' +
        '<li><strong>Check <code>iss</code></strong> — that this token came from your issuer and ' +
        'not another one whose key you also happen to trust.</li>' +
        '<li><strong>Check <code>aud</code></strong> — that it was issued <em>for this ' +
        'service</em>. Missing this is how a token minted for a low-value service is replayed ' +
        'against a high-value one.</li>' +
        '</ul>' +
        '<p>In Spring this is <code>oauth2ResourceServer().jwt()</code> plus an issuer URI, and ' +
        'the framework does all of it — including fetching and caching the signing keys from the ' +
        'issuer\'s JWKS endpoint, so key rotation needs no deployment. <strong>Hand-rolling JWT ' +
        'validation is a bad idea</strong> and being able to say that, and why, is worth more ' +
        'than being able to write it.</p>',
    referenceLinks: [
        { title: 'RFC 7519 — JSON Web Token', url: 'https://www.rfc-editor.org/rfc/rfc7519.html' },
        { title: 'Spring Security — OAuth2 Resource Server (JWT)', url: 'https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/jwt.html' }
    ],
    tags: ['jwt', 'validation', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'jwt-attacks',
    importance: 'should-know',
    subsection: 'tokens',
    question: 'What are the classic ways JWT validation is attacked?',
    answer:
        '<p>All of them come from the same root: <strong>the token tells the server how to ' +
        'validate it, and a naive implementation believes it.</strong></p>' +
        '<ul>' +
        '<li><strong><code>alg: none</code>.</strong> The specification permits an "unsecured" ' +
        'JWT with an empty signature. A library that reads <code>alg</code> from the header and ' +
        'dispatches on it accepts a forged token with no signature at all. The fix is to specify ' +
        'the expected algorithm at the call site rather than accepting the token\'s ' +
        'suggestion.</li>' +
        '<li><strong>HS256 / RS256 confusion.</strong> The server expects RS256 and verifies with ' +
        'a public key. An attacker re-signs the token with HS256 using <em>that public key as the ' +
        'HMAC secret</em> — which is public. A library that picks the algorithm from the header ' +
        'verifies it successfully. Same fix.</li>' +
        '<li><strong><code>kid</code> injection.</strong> The key id header selects which key to ' +
        'use; if it is used to build a file path or a SQL query, it becomes path traversal or SQL ' +
        'injection with an attacker-chosen key.</li>' +
        '<li><strong><code>jku</code> / <code>x5u</code> pointing at the attacker\'s server</strong>, ' +
        'which then supplies the "correct" key. Never fetch keys from a URL the token names.</li>' +
        '<li><strong>Missing <code>exp</code>, <code>aud</code> or <code>iss</code> checks</strong> ' +
        '— covered above, and the most common of all in practice because the token still ' +
        '"works".</li>' +
        '<li><strong>Weak HMAC secrets.</strong> An HS256 secret that is a dictionary word is ' +
        'brute-forceable offline from a single captured token.</li>' +
        '</ul>' +
        '<p>The defence that covers most of them in one sentence: <strong>use a maintained ' +
        'library, pin the algorithm and the key source in configuration, and never let anything ' +
        'in the token influence how it is verified.</strong></p>',
    referenceLinks: [
        { title: 'RFC 8725 — JSON Web Token Best Current Practices', url: 'https://www.rfc-editor.org/rfc/rfc8725.html' }
    ],
    tags: ['jwt', 'security', 'attacks'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'revoking-a-jwt',
    importance: 'must-know',
    subsection: 'tokens',
    question: 'A user logs out, or you disable an account. How do you invalidate their JWT?',
    answer:
        '<p>You cannot, and saying so plainly is the correct start. A signed token is valid ' +
        'until <code>exp</code>, and nothing the server does changes that. Every real answer is a ' +
        'way of <strong>reintroducing state</strong>, and the honest framing is which trade you ' +
        'are making.</p>' +
        '<ul>' +
        '<li><strong>Short access-token lifetime plus refresh tokens.</strong> The standard ' +
        'answer. Access tokens live five to fifteen minutes; the long-lived refresh token is ' +
        'opaque, stored server-side, and revocable. Revocation is therefore bounded by the access ' +
        'token\'s lifetime — the user is out within minutes, not instantly. Most applications ' +
        'can accept that.</li>' +
        '<li><strong>A denylist of <code>jti</code>s</strong> in Redis, with a TTL equal to the ' +
        'token\'s remaining life so it cleans itself up. Gives instant revocation and a lookup on ' +
        'every request — which is a session, and worth admitting.</li>' +
        '<li><strong>A per-user token version.</strong> The token carries a version claim; the ' +
        'user record holds the current one; bumping it invalidates every token for that user at ' +
        'once. Cheaper than a denylist for "log out everywhere" and "password changed", and still ' +
        'a lookup.</li>' +
        '<li><strong>Rotate the signing key</strong> — invalidates every token from every user. ' +
        'A break-glass measure, not a logout.</li>' +
        '</ul>' +
        '<p>The refresh-token detail worth adding: <strong>rotate on use, and detect reuse.</strong> ' +
        'Issue a new refresh token each time one is exchanged and invalidate the old one; if a ' +
        'previously used token appears again, it has been stolen, and the correct response is to ' +
        'revoke the entire chain for that user.</p>',
    referenceLinks: [
        { title: 'OAuth 2.0 Security Best Current Practice', url: 'https://www.rfc-editor.org/rfc/rfc9700.html' }
    ],
    tags: ['jwt', 'revocation', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'where-to-store-a-token',
    importance: 'must-know',
    subsection: 'tokens',
    question: 'Where should a browser store an access token?',
    answer:
        '<p>In an <strong><code>HttpOnly</code>, <code>Secure</code>, <code>SameSite</code> ' +
        'cookie</strong>, not in <code>localStorage</code>. The reasoning is short and the ' +
        'conclusion is frequently got wrong in both directions.</p>' +
        '<p><strong><code>localStorage</code> is readable by JavaScript</strong>, therefore ' +
        'readable by <em>any</em> script the page loads — including one that arrived through a ' +
        'compromised dependency. One XSS and the token is exfiltrated, and no amount of expiry ' +
        'tuning changes that. The often-repeated argument for it is "cookies are vulnerable to ' +
        'CSRF", which is true and is a solved problem; XSS token theft is not.</p>' +
        '<p>So: <code>HttpOnly</code> so script cannot read it, <code>Secure</code> so it is ' +
        'HTTPS-only, and <code>SameSite=Lax</code> or <code>Strict</code>, which removes most ' +
        'CSRF exposure by itself. Add a CSRF token for state-changing requests if the cookie is ' +
        'the sole credential.</p>' +
        '<p>Two refinements worth having:</p>' +
        '<ul>' +
        '<li><strong>An in-memory variable is acceptable for the access token</strong> in a ' +
        'single-page application, with the refresh token in an <code>HttpOnly</code> cookie. It ' +
        'is not readable from another tab, and it disappears on reload — which is the intended ' +
        'behaviour, not a bug.</li>' +
        '<li><strong>The backend-for-frontend pattern</strong> is the current recommendation for ' +
        'browser applications: the token never reaches the browser at all. The BFF holds it and ' +
        'the browser gets an ordinary session cookie.</li>' +
        '</ul>' +
        '<p>And the general rule under all of it: <strong>if XSS is possible, the token is ' +
        'compromised whatever you do</strong> — an attacker with script execution can simply use ' +
        'the cookie by making requests. Storage choice reduces the blast radius; content security ' +
        'policy and output encoding are what prevent it.</p>',
    referenceLinks: [
        { title: 'OWASP — HTML5 Security Cheat Sheet', url: 'https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html' }
    ],
    tags: ['jwt', 'browser', 'security', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

/* ==== OAuth2 & OIDC =================================================== */

{
    id: 'oauth2-roles-and-grants',
    importance: 'must-know',
    subsection: 'oauth',
    question: 'What are the four roles in OAuth2, and which grant types still matter?',
    answer:
        '<p>Most candidates have used OAuth2 and cannot name the roles, which is exactly why it ' +
        'gets asked. Four:</p>' +
        '<ul>' +
        '<li><strong>Resource owner</strong> — the user who owns the data.</li>' +
        '<li><strong>Client</strong> — the application wanting access on their behalf.</li>' +
        '<li><strong>Authorization server</strong> — issues tokens. Keycloak, Auth0, Cognito, ' +
        'Okta, or Spring Authorization Server.</li>' +
        '<li><strong>Resource server</strong> — the API that accepts a token and serves the ' +
        'data. This is usually what you are building.</li>' +
        '</ul>' +
        '<p>The grants worth knowing, and the two that are gone:</p>' +
        '<ul>' +
        '<li><strong>Authorization code with PKCE</strong> — the answer for every application ' +
        'with a user in front of it, confidential or public. OAuth 2.1 makes PKCE mandatory for ' +
        'all authorization code flows, not only public clients.</li>' +
        '<li><strong>Client credentials</strong> — machine to machine, no user. The service is ' +
        'the principal.</li>' +
        '<li><strong>Refresh token</strong> — exchange a long-lived credential for a new access ' +
        'token.</li>' +
        '<li><strong>Device authorization</strong> — for a TV or a CLI, where the user ' +
        'authenticates on a second device.</li>' +
        '<li><strong>Implicit — removed.</strong> It returned the token in the URL fragment, ' +
        'which put it in browser history and referrers.</li>' +
        '<li><strong>Resource owner password credentials — removed.</strong> The client collects ' +
        'the user\'s actual password, which defeats the entire point of the protocol.</li>' +
        '</ul>' +
        '<p>The framing that shows understanding rather than recall: <strong>OAuth2 exists so a ' +
        'user can grant an application limited access without giving it their password.</strong> ' +
        'Every design decision in it follows from that, and it is why the two removed grants were ' +
        'removed.</p>',
    referenceLinks: [
        { title: 'RFC 6749 — The OAuth 2.0 Authorization Framework', url: 'https://www.rfc-editor.org/rfc/rfc6749.html' },
        { title: 'OAuth 2.0 Security Best Current Practice', url: 'https://www.rfc-editor.org/rfc/rfc9700.html' }
    ],
    tags: ['oauth2', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'authorization-code-with-pkce',
    importance: 'must-know',
    subsection: 'oauth',
    question: 'Walk through the authorization code flow. What does PKCE add?',
    answer:
        '<p>The flow, in the order it happens:</p>' +
        '<ul>' +
        '<li>The client redirects the browser to the authorization server with its ' +
        '<code>client_id</code>, a <code>redirect_uri</code>, the requested <code>scope</code>, ' +
        'and a <code>state</code> value.</li>' +
        '<li>The user authenticates <strong>with the authorization server</strong> — the client ' +
        'never sees the password — and consents.</li>' +
        '<li>The browser is redirected back to <code>redirect_uri</code> with a short-lived ' +
        '<strong>authorization code</strong>.</li>' +
        '<li>The client exchanges that code <strong>on the back channel</strong>, server to ' +
        'server, for an access token and optionally a refresh token.</li>' +
        '</ul>' +
        '<p>The two-step shape is the whole design: the code travels through the browser where it ' +
        'can be observed, and it is useless without the second exchange.</p>' +
        '<p><strong>PKCE closes the gap in that argument.</strong> A public client — a mobile app ' +
        'or a single-page application — has no secret it can keep, so an attacker who intercepts ' +
        'the code can perform the exchange too. So the client generates a random ' +
        '<strong>verifier</strong>, sends its SHA-256 hash as the <code>code_challenge</code> ' +
        'with the initial request, and sends the verifier itself with the exchange. The ' +
        'authorization server hashes it and compares. An intercepted code is worthless because ' +
        'the attacker does not have the verifier — a secret invented per request rather than ' +
        'shipped in the application.</p>' +
        '<p>Two things to say alongside it. <strong><code>state</code> is not PKCE</strong> — it ' +
        'is CSRF protection for the redirect, and both are needed. And ' +
        '<strong><code>redirect_uri</code> must be exactly matched</strong> against a registered ' +
        'value, because open redirect on that parameter is how codes get sent to the wrong ' +
        'place.</p>',
    referenceLinks: [
        { title: 'RFC 7636 — Proof Key for Code Exchange', url: 'https://www.rfc-editor.org/rfc/rfc7636.html' }
    ],
    tags: ['oauth2', 'pkce', 'must-know'],
    images: [],
    hasDiagram: true,
    diagramType: 'sequence',
    diagramConfig: {
        title: 'Authorization code with PKCE',
        actors: [
            { id: 'user',   label: 'User agent' },
            { id: 'client', label: 'Client app' },
            { id: 'auth',   label: 'Authorization server' },
            { id: 'api',    label: 'Resource server' }
        ],
        messages: [
            { from: 'client', to: 'user',   label: 'redirect with code_challenge = SHA256(verifier)' },
            { from: 'user',   to: 'auth',   label: 'authenticate and consent' },
            { from: 'auth',   to: 'user',   label: 'redirect back with authorization code' },
            { from: 'user',   to: 'client', label: 'code' },
            { from: 'client', to: 'auth',   label: 'exchange code + code_verifier (back channel)' },
            { from: 'auth',   to: 'client', label: 'access token (+ refresh token)' },
            { from: 'client', to: 'api',    label: 'Authorization: Bearer ...' }
        ]
    },
    codeSnippets: []
},

{
    id: 'oauth2-versus-oidc',
    importance: 'must-know',
    subsection: 'oauth',
    question: 'What does OpenID Connect add to OAuth2?',
    answer:
        '<p><strong>Authentication.</strong> OAuth2 is an <em>authorization</em> framework — an ' +
        'access token says "the bearer may do these things", and says nothing reliable about who ' +
        'the user is. Using one to log people in is a category error that was common for years ' +
        'and produced real vulnerabilities.</p>' +
        '<p>OIDC is a thin layer on top that adds:</p>' +
        '<ul>' +
        '<li><strong>The <code>id_token</code></strong> — a JWT about the <em>user</em>, with ' +
        '<code>sub</code>, <code>iss</code>, <code>aud</code>, <code>exp</code> and an ' +
        '<code>at_hash</code> binding it to the access token. Intended for the client to consume, ' +
        'unlike the access token which is meant for the API.</li>' +
        '<li><strong>Standard scopes and claims</strong> — <code>openid</code>, ' +
        '<code>profile</code>, <code>email</code> — so identity means the same thing across ' +
        'providers.</li>' +
        '<li><strong>The <code>/userinfo</code> endpoint</strong>, for claims not in the ' +
        'token.</li>' +
        '<li><strong>Discovery</strong> — <code>/.well-known/openid-configuration</code>, which ' +
        'is why Spring needs only an issuer URI to configure everything including the JWKS ' +
        'location.</li>' +
        '<li><strong><code>nonce</code></strong>, binding the id token to the original ' +
        'request.</li>' +
        '</ul>' +
        '<p>The rule that summarises it: <strong>use the id token to establish who the user is; ' +
        'use the access token to call APIs; never send an id token to an API and never treat an ' +
        'access token as proof of identity.</strong></p>' +
        '<p>In Spring the split is visible in the starters — ' +
        '<code>oauth2Login()</code> makes your application an OIDC <em>client</em> that logs users ' +
        'in, and <code>oauth2ResourceServer()</code> makes it an API that validates incoming ' +
        'tokens. They are different roles and applications frequently need both.</p>',
    referenceLinks: [
        { title: 'OpenID Connect Core 1.0', url: 'https://openid.net/specs/openid-connect-core-1_0.html' }
    ],
    tags: ['oauth2', 'oidc', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'service-to-service-authentication',
    importance: 'should-know',
    subsection: 'oauth',
    question: 'How should two internal services authenticate to each other?',
    answer:
        '<p>Three options, in increasing order of rigour, and the honest answer names where you ' +
        'are on that ladder rather than claiming the top of it.</p>' +
        '<ul>' +
        '<li><strong>A shared API key or static secret.</strong> Simple, and it is a long-lived ' +
        'credential in configuration that nobody rotates. Acceptable for low-value internal ' +
        'traffic behind a boundary; not acceptable as the only control on anything sensitive.</li>' +
        '<li><strong>OAuth2 client credentials.</strong> Each service is a registered client with ' +
        'its own credentials, gets a short-lived access token from the authorization server, and ' +
        'presents it as a bearer token. Scopes make "the reporting service may read orders and ' +
        'not write them" expressible and enforceable. In Spring this is one ' +
        '<code>ClientRegistration</code> and an interceptor that fetches and caches the ' +
        'token.</li>' +
        '<li><strong>Mutual TLS.</strong> Each service holds a certificate; identity is ' +
        'established at the transport layer, before any application code runs. This is what a ' +
        'service mesh gives you with automatic short-lived certificate rotation, and it is the ' +
        'strongest option because there is no bearer credential to steal.</li>' +
        '</ul>' +
        '<p>The principle worth stating over all three: <strong>the network is not a security ' +
        'boundary.</strong> "It is inside the VPC" was the assumption behind a long list of ' +
        'breaches where one compromised service reached everything. Zero-trust means each service ' +
        'authenticates its callers whatever network they arrive from.</p>' +
        '<p>One design question that separates thought-through answers: <strong>should the ' +
        'downstream service see the end user\'s identity, or the calling service\'s?</strong> ' +
        'Usually both — the service identity for authentication, and the user identity propagated ' +
        'as a claim for authorization and audit. Losing the user identity at the first hop is why ' +
        'audit logs end up saying "the orders service did it".</p>',
    referenceLinks: [
        { title: 'Spring Security — OAuth2 Client Credentials', url: 'https://docs.spring.io/spring-security/reference/servlet/oauth2/client/authorization-grants.html' }
    ],
    tags: ['oauth2', 'microservices', 'security'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

/* ==== CORS, CSRF & Hardening ========================================== */

{
    id: 'cors-and-preflight',
    importance: 'must-know',
    subsection: 'hardening',
    question: 'What is CORS, and what is a preflight request?',
    answer:
        '<p>CORS is a <strong>browser</strong> mechanism. It relaxes the same-origin policy in a ' +
        'controlled way, and every part of it is enforced by the browser rather than by your ' +
        'server — which is the fact that makes the rest make sense.</p>' +
        '<p>Two consequences that catch people immediately: <strong>curl and Postman are never ' +
        'affected by CORS</strong>, so "it works in Postman" tells you nothing; and ' +
        '<strong>CORS is not a security control for your API</strong>. A non-browser client ' +
        'ignores it entirely. It protects <em>users</em> from other sites reading responses in ' +
        'their browser, not your API from anyone.</p>' +
        '<p><strong>The preflight.</strong> For anything beyond a "simple" request — any method ' +
        'other than GET, HEAD or POST, or a custom header such as <code>Authorization</code>, or ' +
        'a JSON content type — the browser first sends an <code>OPTIONS</code> request carrying ' +
        '<code>Access-Control-Request-Method</code> and ' +
        '<code>Access-Control-Request-Headers</code>. The server answers with what it permits, ' +
        'and only then does the real request go out. <code>Access-Control-Max-Age</code> lets the ' +
        'browser cache that answer.</p>' +
        '<p>Three rules that are the source of most CORS bugs:</p>' +
        '<ul>' +
        '<li><strong><code>Access-Control-Allow-Origin: *</code> is incompatible with ' +
        'credentials.</strong> With <code>allowCredentials(true)</code> you must echo a specific ' +
        'origin. Spring throws at startup if you configure both, which is a kindness.</li>' +
        '<li><strong>The preflight must not require authentication.</strong> It carries no ' +
        'credentials by design, so a security config that authenticates every request rejects it ' +
        'and the real request never happens. In Spring, <code>http.cors()</code> puts the ' +
        '<code>CorsFilter</code> before the authentication filters for exactly this reason — and ' +
        'a hand-written CORS filter placed after them reintroduces the bug.</li>' +
        '<li><strong>Reflecting the <code>Origin</code> header back is not a configuration, it is ' +
        'a vulnerability</strong> when combined with credentials.</li>' +
        '</ul>',
    referenceLinks: [
        { title: 'CORS — MDN', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS' },
        { title: 'Spring Security — CORS', url: 'https://docs.spring.io/spring-security/reference/servlet/integrations/cors.html' }
    ],
    tags: ['cors', 'browser', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'csrf-on-a-stateless-api',
    importance: 'must-know',
    subsection: 'hardening',
    question: 'Should you disable CSRF protection on a REST API?',
    answer:
        '<p>Yes — <strong>if and only if the API does not authenticate with cookies</strong>. ' +
        'That condition is the entire answer, and disabling CSRF without stating it is the answer ' +
        'that fails the question.</p>' +
        '<p>CSRF works because the browser <strong>attaches cookies automatically</strong> to any ' +
        'request to your domain, including one initiated by a form on someone else\'s site. The ' +
        'user is logged in, so the request is authenticated, and the attacker never needs to read ' +
        'the response.</p>' +
        '<p>An <code>Authorization: Bearer</code> header is not attached automatically. A ' +
        'malicious page cannot add it — that is what CORS prevents — so there is nothing for CSRF ' +
        'to exploit and the protection is genuinely unnecessary. Hence ' +
        '<code>csrf(csrf -&gt; csrf.disable())</code> on a token-authenticated chain.</p>' +
        '<p>The dangerous middle case is a <strong>JWT in a cookie</strong>. That is cookie ' +
        'authentication whatever the token format, so it is fully CSRF-exploitable — and it is ' +
        'exactly the configuration people arrive at when they combine "store the token in an ' +
        'HttpOnly cookie" with "it is a stateless API so CSRF is off".</p>' +
        '<p>When you do need it, the mechanisms are:</p>' +
        '<ul>' +
        '<li><strong>The synchronizer token</strong> — a per-session token in a form field or ' +
        'header. Spring\'s default.</li>' +
        '<li><strong>Cookie-to-header</strong> — <code>CookieCsrfTokenRepository</code> with ' +
        '<code>httpOnly=false</code>, for a single-page application whose JavaScript reads the ' +
        'cookie and echoes it in a header. Safe because another origin cannot read the ' +
        'cookie.</li>' +
        '<li><strong><code>SameSite=Lax</code> or <code>Strict</code></strong>, which stops the ' +
        'browser sending the cookie cross-site at all. Strong defence in depth and not quite ' +
        'sufficient alone, since <code>Lax</code> still permits top-level GET navigation.</li>' +
        '</ul>',
    referenceLinks: [
        { title: 'Spring Security — CSRF', url: 'https://docs.spring.io/spring-security/reference/servlet/exploits/csrf.html' }
    ],
    tags: ['csrf', 'security', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'storing-passwords',
    importance: 'must-know',
    subsection: 'hardening',
    question: 'How should passwords be stored?',
    answer:
        '<p>With a <strong>slow, salted, memory-hard hash</strong> designed for passwords. Never ' +
        'encrypted — encryption is reversible and there is no reason a server should be able to ' +
        'recover a password. Never a general-purpose hash like SHA-256, because it is fast, and ' +
        'fast is precisely the wrong property: a GPU does billions a second.</p>' +
        '<p>The current choices, in OWASP\'s order:</p>' +
        '<ul>' +
        '<li><strong>Argon2id</strong> — the first recommendation. Memory-hard, so custom ' +
        'hardware helps an attacker much less.</li>' +
        '<li><strong>scrypt</strong> — also memory-hard, older.</li>' +
        '<li><strong>bcrypt</strong> — still acceptable and still the most widely deployed. Note ' +
        'the <strong>72-byte input limit</strong>, which silently truncates longer ' +
        'passphrases.</li>' +
        '<li><strong>PBKDF2</strong> — when a certification requires a FIPS-approved algorithm. ' +
        'Weakest of the four against GPUs.</li>' +
        '</ul>' +
        '<p>The salt is per password and stored alongside the hash — every one of these formats ' +
        'embeds it in the output string, so "where do I store the salt" has an answer you do not ' +
        'have to implement.</p>' +
        '<p>In Spring, the answer is one bean: ' +
        '<code>PasswordEncoderFactories.createDelegatingPasswordEncoder()</code>. It prefixes ' +
        'each hash with the algorithm that produced it — <code>{bcrypt}$2a$10$...</code> — so a ' +
        'single store can hold hashes from several algorithms and <strong>you can migrate ' +
        'without asking anyone to reset their password</strong>: verify with the old algorithm, ' +
        'and re-hash with the new one on the next successful login. That upgrade path is the ' +
        'thing worth mentioning, because it is the question behind the question.</p>' +
        '<p>Two more: <strong>never log the password</strong>, including in a request body dump ' +
        'or a validation error; and <strong>check against a breached-password list</strong>, ' +
        'which OWASP now rates as more valuable than complexity rules.</p>',
    referenceLinks: [
        { title: 'OWASP — Password Storage Cheat Sheet', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html' },
        { title: 'Spring Security — Password Storage', url: 'https://docs.spring.io/spring-security/reference/features/authentication/password-storage.html' }
    ],
    tags: ['passwords', 'security', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'method-security-and-preauthorize',
    importance: 'should-know',
    subsection: 'hardening',
    question: 'When would you use @PreAuthorize instead of URL-based rules?',
    answer:
        '<p>When the decision depends on <strong>the data, not the path</strong>. URL rules can ' +
        'say "only an admin may call <code>/orders/**</code>". They cannot say "you may read this ' +
        'order if it is yours", because at filter time nobody has loaded the order.</p>' +
        '<p>That second kind — object-level authorization — is <strong>OWASP API Top 10 #1, ' +
        'Broken Object Level Authorization</strong>, and it is the single most common serious API ' +
        'vulnerability. A URL rule that permits any authenticated user to call ' +
        '<code>GET /orders/{id}</code> and a handler that does not check ownership is a ' +
        'complete data breach through a for-loop over ids.</p>' +
        '<p>Method security is where you express it. <code>@EnableMethodSecurity</code> — Spring ' +
        'Security 6\'s replacement for <code>@EnableGlobalMethodSecurity</code> — then:</p>' +
        '<ul>' +
        '<li><strong><code>@PreAuthorize</code></strong> — evaluated before the call. SpEL, with ' +
        'access to the arguments: ' +
        '<code>@PreAuthorize("hasRole(\'ADMIN\') or #userId == authentication.name")</code>.</li>' +
        '<li><strong><code>@PostAuthorize</code></strong> — evaluated after, with access to ' +
        '<code>returnObject</code>, for when ownership is only knowable once loaded. Note the ' +
        'method has already run, so it is unsuitable for anything with a side effect.</li>' +
        '<li><strong><code>@PreFilter</code> and <code>@PostFilter</code></strong> — remove ' +
        'elements from a collection. Convenient, and they filter <em>after</em> the query, so a ' +
        'page of twenty can come back with three. Filtering in the query is almost always ' +
        'better.</li>' +
        '</ul>' +
        '<p>Two caveats. Method security is <strong>proxy-based</strong>, so it does not apply to ' +
        'a self-invocation or a private method — the same rule as <code>@Transactional</code>. ' +
        'And SpEL in an annotation is not compiled or type-checked, so a typo in a role name ' +
        'fails silently open or closed depending on the expression. <strong>Test the negative ' +
        'case</strong>, not only that the right user gets in.</p>',
    referenceLinks: [
        { title: 'Spring Security — Method Security', url: 'https://docs.spring.io/spring-security/reference/servlet/authorization/method-security.html' }
    ],
    tags: ['spring-security', 'authorization'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'owasp-api-top-ten',
    importance: 'should-know',
    subsection: 'hardening',
    question: 'What would you check before putting a new API on the public internet?',
    answer:
        '<p>The OWASP API Security Top 10 is the checklist worth knowing by shape, because it ' +
        'is what an interviewer is testing against whether or not they name it. The ones that ' +
        'actually catch teams:</p>' +
        '<ul>' +
        '<li><strong>Broken object level authorization</strong> — the id in the URL is not ' +
        'checked against the caller. Number one for years running.</li>' +
        '<li><strong>Broken authentication</strong> — weak token validation, no rate limit on ' +
        'login, credential stuffing unaddressed.</li>' +
        '<li><strong>Broken object property level authorization</strong> — mass assignment ' +
        'binding a request body straight onto an entity so a caller can set ' +
        '<code>role: "ADMIN"</code>, and its mirror image, returning an entity with fields the ' +
        'caller should not see. Both are fixed by a DTO at the boundary, which is why "never ' +
        'expose entities" is a security rule and not only a design preference.</li>' +
        '<li><strong>Unrestricted resource consumption</strong> — no rate limit, no page size ' +
        'cap, no request body size limit, no query timeout.</li>' +
        '<li><strong>Broken function level authorization</strong> — an admin endpoint reachable ' +
        'by guessing the path.</li>' +
        '<li><strong>Server-side request forgery</strong> — the API fetches a URL the caller ' +
        'supplied, and the caller points it at the cloud metadata endpoint.</li>' +
        '<li><strong>Security misconfiguration</strong> — stack traces in responses, Actuator ' +
        'endpoints exposed, permissive CORS, missing headers.</li>' +
        '<li><strong>Improper inventory management</strong> — the forgotten ' +
        '<code>/v1</code> still running unpatched next to <code>/v3</code>, and the staging ' +
        'environment with production data.</li>' +
        '</ul>' +
        '<p>The Spring-specific items to add: check what <strong>Actuator</strong> exposes — only ' +
        '<code>health</code> and <code>info</code> should be public, and ' +
        '<code>health</code> should not show component details anonymously; make sure ' +
        '<code>server.error.include-stacktrace</code> is <code>never</code>; and confirm that ' +
        'validation failures return a <code>ProblemDetail</code> rather than a message naming ' +
        'internal field names.</p>',
    referenceLinks: [
        { title: 'OWASP API Security Top 10', url: 'https://owasp.org/API-Security/editions/2023/en/0x11-t10/' }
    ],
    tags: ['security', 'owasp', 'api-design'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'security-headers',
    importance: 'good-to-know',
    subsection: 'hardening',
    question: 'Which security headers matter, and which does Spring Security set for you?',
    answer:
        '<p>Spring Security sets a sensible default set the moment it is on the classpath, which ' +
        'is worth knowing because people add them again by hand: ' +
        '<code>X-Content-Type-Options: nosniff</code>, <code>X-Frame-Options: DENY</code>, ' +
        '<code>Cache-Control: no-store</code> on authenticated responses, and ' +
        '<code>Strict-Transport-Security</code> when the request is HTTPS.</p>' +
        '<p>What it does <strong>not</strong> set, and what you should add:</p>' +
        '<ul>' +
        '<li><strong><code>Content-Security-Policy</code></strong> — the single most valuable ' +
        'header, and the only real structural defence against XSS. Not enabled by default ' +
        'because a policy has to match the application. Start in ' +
        '<code>Content-Security-Policy-Report-Only</code> mode and tighten.</li>' +
        '<li><strong><code>Referrer-Policy</code></strong> — ' +
        '<code>strict-origin-when-cross-origin</code>, so URLs containing ids do not leak to ' +
        'third parties.</li>' +
        '<li><strong><code>Permissions-Policy</code></strong> — switch off camera, microphone and ' +
        'geolocation if you do not use them.</li>' +
        '</ul>' +
        '<p>Two notes. <code>X-XSS-Protection</code> is <strong>obsolete</strong> — the browser ' +
        'filter it enabled was itself exploitable and has been removed; setting it to ' +
        '<code>0</code> is the current advice, which is what Spring Security does. And headers ' +
        'are only meaningful for a browser client; for a pure machine API they cost nothing and ' +
        'buy nothing, so the effort belongs on the items in the previous question.</p>',
    referenceLinks: [
        { title: 'Spring Security — HTTP Headers', url: 'https://docs.spring.io/spring-security/reference/servlet/exploits/headers.html' }
    ],
    tags: ['security', 'headers', 'browser'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
}

    ]
};
