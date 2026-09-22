/* ==========================================================================
   data/theory/oauth2-and-oidc.js — module 59 in the reading path

   The plan's tagline is the study plan: four roles, one flow worth
   memorising. Eight chapters, and the shape is deliberate — the roles and
   the authorization code flow carry most of the weight, PKCE gets its own
   chapter because it is now mandatory rather than optional, and one chapter
   is entirely about the flows that have been removed, because a candidate
   who describes the implicit flow approvingly is describing 2016.

   OAuth2 is an AUTHORIZATION framework and OIDC is the authentication layer
   on top of it. That sentence is the single most valuable thing in the
   module and the last-but-one chapter is built around it.
   ========================================================================== */

const oauth2AndOidcModule = {
    id: 'oauth2-and-oidc',
    trackId: 'security',
    order: 59,
    title: 'OAuth2 and OpenID Connect',
    tagline: 'Four roles, one flow worth memorising.',
    estimatedMinutes: 45,
    prerequisites: ['jwt-in-practice'],
    docHub: { title: 'RFC 6749 — The OAuth 2.0 Authorization Framework', url: 'https://www.rfc-editor.org/rfc/rfc6749.html' },

    chapters: [
        {
            id: 'the-four-roles',
            title: 'The Four Roles',
            importance: 'must-know',
            summary: 'Resource owner, client, authorization server, resource server. Naming which is which in a concrete scenario is most of what the question is testing.',
            interviewAngle: 'The commonest confusion is thinking the "client" is the user. The client is the application asking for access; the user is the resource owner.',
            buildsOn: [],
            blocks: [
                {
                    type: 'types',
                    title: 'Who is who',
                    items: [
                        { name: 'Resource owner', html: '<p>The <strong>user</strong>. The person who owns the data and grants access to it.</p>' },
                        { name: 'Client', html: '<p>The <strong>application</strong> requesting access on the user\'s behalf — a web app, a mobile app, a service. Not the user, and not a browser.</p>' },
                        { name: 'Authorization server', html: '<p>Authenticates the user, obtains their consent, and issues tokens. Keycloak, Auth0, Okta, Entra ID, or your own.</p>' },
                        { name: 'Resource server', html: '<p>The <strong>API</strong> holding the data. It validates tokens and serves requests, and it never sees a password.</p>' }
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>The problem OAuth2 exists to solve is stated best as a thing it prevents: <strong>the client never sees the user\'s password.</strong> Before it, an application that needed access to your data on another service asked for your credentials for that service, and you gave them — which meant full access, forever, with no way to withdraw it selectively.</p><p>OAuth2 replaces that with a redirect to the authorization server, where you authenticate directly with the party that already holds your credentials, and the client receives a scoped, expiring token instead.</p>'
                },
                {
                    type: 'table',
                    title: 'The roles in three concrete systems',
                    headers: ['Scenario', 'Resource owner', 'Client', 'Authorization server', 'Resource server'],
                    rows: [
                        ['"Sign in with Google" on a startup\'s site', 'The user', 'The startup\'s web app', 'Google', 'Google\'s userinfo API'],
                        ['A company SPA calling its own API', 'The employee', 'The SPA', 'Keycloak', 'The orders API'],
                        ['A nightly batch job calling an internal API', '<strong>Nobody</strong>', 'The batch job', 'Keycloak', 'The orders API']
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>The third row is the one that clarifies the model: there is no resource owner because no user is involved. That is precisely why <code>client_credentials</code> exists as a separate grant — it is the flow for when the client is acting for itself rather than on somebody\'s behalf, and recognising that it is the odd one out is a good sign in an answer.</p>'
                }
            ],
            docs: [
                { title: 'RFC 6749 §1.1 — Roles', url: 'https://www.rfc-editor.org/rfc/rfc6749.html', kind: 'spec' }
            ],
            relatedQuestions: [
                { topicId: 'spring-security', questionId: 'oauth2-roles-and-grants' }
            ]
        },

        {
            id: 'authorization-code-flow',
            title: 'The Authorization Code Flow',
            importance: 'must-know',
            summary: 'Redirect to the authorization server, user authenticates, redirect back with a short-lived code, exchange the code for tokens over a back channel. Two round trips, and the reason for the second one is the whole design.',
            interviewAngle: 'The one flow to be able to draw. The question that separates answers is why the code exists at all rather than returning the token directly.',
            buildsOn: ['the-four-roles'],
            blocks: [
                {
                    type: 'diagram',
                    diagramType: 'sequence',
                    title: 'The flow, with the channel each step uses',
                    diagramConfig: {
                        title: 'Authorization code, front channel and back channel',
                        actors: [
                            { id: 'b',  label: 'Browser' },
                            { id: 'c',  label: 'Client' },
                            { id: 'as', label: 'Auth server' },
                            { id: 'rs', label: 'Resource server' }
                        ],
                        messages: [
                            { from: 'b',  to: 'c',  label: 'GET /protected', kind: 'call' },
                            { from: 'c',  to: 'b',  label: '302 to /authorize — front channel', kind: 'return' },
                            { from: 'b',  to: 'as', label: 'authenticate, then consent', kind: 'call' },
                            { from: 'as', to: 'b',  label: '302 back with ?code=… — front channel', kind: 'return' },
                            { from: 'b',  to: 'c',  label: 'GET /callback?code=…', kind: 'call' },
                            { from: 'c',  to: 'as', label: 'POST /token — code + secret, BACK channel', kind: 'call' },
                            { from: 'as', to: 'c',  label: 'access token + refresh token', kind: 'return' },
                            { from: 'c',  to: 'rs', label: 'GET /orders with the bearer token', kind: 'call' }
                        ]
                    }
                },
                {
                    type: 'prose',
                    html: '<p>The two channels are the point. The <strong>front channel</strong> is the browser: everything on it is visible in the address bar, in browser history, in the <code>Referer</code> header and in proxy logs. The <strong>back channel</strong> is a direct server-to-server HTTPS call that nothing in between can see.</p><p>So the code — which travels on the front channel — is deliberately useless on its own. It is single-use, expires in about a minute, is bound to the exact redirect URI, and can only be exchanged by a client that also presents its secret on the back channel. <strong>The token never touches the browser</strong>, which is what the whole shape exists to achieve.</p>'
                },
                {
                    type: 'types',
                    title: 'The parameters that carry the security properties',
                    items: [
                        { name: '<code>state</code>', html: '<p>An opaque random value the client generates, sent to the authorization server and returned unchanged. The client checks it matches. <strong>This is the CSRF defence for the callback</strong> — without it, an attacker can feed you their own code and log you into their account.</p>' },
                        { name: '<code>redirect_uri</code>', html: '<p>Must be registered exactly. Open redirect here means the code is delivered to the attacker.</p>' },
                        { name: '<code>scope</code>', html: '<p>What is being asked for. Presented to the user as consent, and encoded in the resulting token.</p>' },
                        { name: '<code>code_challenge</code>', html: '<p>PKCE. Next chapter, and now required for every client type.</p>' },
                        { name: '<code>nonce</code>', html: '<p>OIDC only: returned inside the ID token, so the client can prove the token belongs to this request.</p>' }
                    ]
                }
            ],
            docs: [
                { title: 'RFC 6749 §4.1 — Authorization Code Grant', url: 'https://www.rfc-editor.org/rfc/rfc6749.html', kind: 'spec' }
            ],
            relatedQuestions: [
                { topicId: 'spring-security', questionId: 'authorization-code-with-pkce' }
            ]
        },

        {
            id: 'pkce',
            title: 'PKCE',
            importance: 'must-know',
            summary: 'The client invents a random secret, sends its hash with the authorization request, and reveals the original when exchanging the code. A stolen code is then worthless.',
            interviewAngle: 'Now recommended for every client, not only public ones, and knowing that it is no longer a mobile-only measure is a currency signal.',
            buildsOn: ['authorization-code-flow'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>The code exchange is protected by the client secret — but a mobile app or a single-page application cannot keep a secret, because it is distributed to users who can read it. For those clients the code is the only thing standing between an attacker and a token, and a code can be intercepted: a malicious app registering the same custom URL scheme, a compromised browser extension, a logged redirect.</p><p><strong>PKCE</strong> (Proof Key for Code Exchange) replaces the fixed secret with a per-request one. The client generates a random <code>code_verifier</code>, sends <code>SHA256(verifier)</code> as the <code>code_challenge</code> with the authorization request, and sends the raw verifier when exchanging the code. The authorization server hashes it and compares. An attacker with the code does not have the verifier, so the exchange fails.</p>'
                },
                {
                    type: 'syntax',
                    language: 'bash',
                    title: 'The two extra parameters, and what they prove',
                    code: '# 1. The client generates a high-entropy verifier and hashes it.\n#    verifier  = 43-128 chars of unreserved characters\n#    challenge = base64url(SHA256(verifier))   -- method S256\n\n# 2. Authorization request carries the CHALLENGE (front channel):\nGET /authorize\n    ?response_type=code\n    &client_id=spa-client\n    &redirect_uri=https://app.acme.com/callback\n    &state=8f2c1e7a\n    &code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM\n    &code_challenge_method=S256\n\n# 3. Token request carries the VERIFIER (back channel):\nPOST /token\n    grant_type=authorization_code\n    &code=SplxlOBeZQQYbYS6WxSbIA\n    &redirect_uri=https://app.acme.com/callback\n    &code_verifier=dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk\n\n# The server recomputes SHA256(code_verifier) and compares it to the\n# challenge it stored. Only the client that STARTED the flow can finish it.',
                    notes: '<p>Always <code>S256</code>. The specification also permits <code>plain</code>, where the challenge is the verifier itself — which provides nothing at all if the authorization request is visible, and the authorization request is on the front channel. An authorization server that accepts <code>plain</code> should be configured not to.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The current guidance — RFC 9700, the OAuth 2.0 Security Best Current Practice — is <strong>PKCE for every client, confidential ones included</strong>. It costs two parameters and it defends against code injection independently of whether the client secret is safe. If asked whether PKCE is needed for a server-side web app with a secret, the answer is yes, and knowing that the recommendation changed is the interesting part.</p>'
                }
            ],
            docs: [
                { title: 'RFC 7636 — Proof Key for Code Exchange', url: 'https://www.rfc-editor.org/rfc/rfc7636.html', kind: 'spec' }
            ],
            relatedQuestions: [
                { topicId: 'spring-security', questionId: 'authorization-code-with-pkce' }
            ]
        },

        {
            id: 'client-credentials',
            title: 'Client Credentials',
            importance: 'must-know',
            summary: 'No user, no redirect, no consent. The client authenticates as itself and receives a token. This is the flow for service-to-service calls.',
            interviewAngle: 'The practical microservices answer. It is also where the honest comparison with a static API key belongs, because the API key is not obviously worse.',
            buildsOn: ['pkce'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'yaml',
                    title: 'A Spring client that manages its own token',
                    code: 'spring:\n  security:\n    oauth2:\n      client:\n        registration:\n          pricing-api:\n            client-id: orders-service\n            client-secret: ${PRICING_CLIENT_SECRET}\n            authorization-grant-type: client_credentials\n            scope: pricing.read\n        provider:\n          pricing-api:\n            token-uri: https://auth.acme.com/oauth2/token\n\n# Spring Security is OAuth2 client support fetches the token, caches it,\n# and refreshes it before expiry. Wire the filter into a RestClient or\n# WebClient and no application code touches a token at all -- which is\n# the entire benefit over passing an API key by hand.',
                    notes: '<p>The credential still has to reach the service somehow, so this does not remove secret management — it moves it. What it buys is that the <em>thing on the wire</em> is a short-lived scoped token rather than the long-lived secret itself, so an intercepted request is useful for minutes rather than forever.</p>'
                },
                {
                    type: 'comparison',
                    title: 'Against the static API key it replaces',
                    left: 'client_credentials',
                    right: 'A static API key',
                    rows: [
                        { aspect: 'On the wire', left: 'A short-lived token', right: '<strong>The long-lived secret itself, on every request</strong>' },
                        { aspect: 'Rotation', left: 'Change the secret at the authorization server', right: 'Coordinate across every caller and every config' },
                        { aspect: 'Scopes', left: 'Fine-grained and per-registration', right: 'Usually all or nothing' },
                        { aspect: 'Audit', left: 'Centralised at the authorization server', right: 'Wherever the key was checked' },
                        { aspect: 'Infrastructure', left: 'Needs an authorization server', right: 'None' },
                        { aspect: 'Honest verdict', left: 'Better once you already run an authorization server', right: 'Fine for two internal services; not worth standing up an IdP for' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>Inside a service mesh the whole question is often answered below the application: mTLS gives every workload an identity and rotates certificates automatically, so service-to-service authentication happens without either mechanism. Naming that as the third option — and noting that it authenticates the <em>workload</em> rather than the request — is a good senior answer to "how do your services authenticate to each other".</p>'
                }
            ],
            docs: [
                { title: 'RFC 6749 §4.4 — Client Credentials Grant', url: 'https://www.rfc-editor.org/rfc/rfc6749.html', kind: 'spec' }
            ],
            relatedQuestions: [
                { topicId: 'spring-security', questionId: 'service-to-service-authentication' }
            ]
        },

        {
            id: 'the-flows-that-are-deprecated',
            title: 'The Flows That Were Removed',
            importance: 'should-know',
            summary: 'Implicit and password grant are both out. Describing either approvingly places a candidate several years behind, and knowing why they went is more useful than knowing that they did.',
            interviewAngle: 'A currency check. The reasoning matters: implicit went because PKCE made it unnecessary, and password grant went because it defeats the purpose of the framework.',
            buildsOn: ['client-credentials'],
            blocks: [
                {
                    type: 'table',
                    title: 'What was removed, and what replaced it',
                    headers: ['Flow', 'What it did', 'Why it went', 'Use instead'],
                    rows: [
                        ['Implicit', 'Returned the access token directly in the URL fragment', 'The token appears in browser history, logs and <code>Referer</code>; no refresh tokens; it existed only because browsers could not do a cross-origin POST', 'Authorization code + PKCE'],
                        ['Resource owner password credentials', 'The client collected the username and password and posted them', '<strong>The client sees the password</strong>, which is the exact thing OAuth2 exists to prevent. No MFA, no federation, no consent.', 'Authorization code + PKCE'],
                        ['Implicit for SPAs specifically', 'The standard advice until about 2019', 'CORS made a back-channel POST from a SPA possible, and PKCE made it safe', 'Authorization code + PKCE, or a backend-for-frontend']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Password grant survives in real systems as a first-party login shortcut, and it is worth being able to argue against without being dogmatic.</strong> The pragmatic objection is not purity: it is that the flow has nowhere to put step-up MFA, nowhere to put a "your password has expired" interaction, and no way to add a federated identity provider later without changing every client. Teams that adopt it for one mobile app find those three limits within about a year.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The one legitimate remaining relative is the <strong>device authorization grant</strong> (RFC 8628), for input-constrained devices — a television, a CLI. It shows a code, the user enters it on a phone, and the device polls. If asked how a command-line tool signs in, that is the correct modern answer, and it is a better one than "it prompts for a password".</p>'
                }
            ],
            docs: [
                { title: 'OAuth 2.0 Security Best Current Practice', url: 'https://www.rfc-editor.org/rfc/rfc9700.html', kind: 'spec' },
                { title: 'RFC 8628 — Device Authorization Grant', url: 'https://www.rfc-editor.org/rfc/rfc8628.html', kind: 'spec' }
            ],
            relatedQuestions: [
                { topicId: 'spring-security', questionId: 'oauth2-roles-and-grants' }
            ]
        },

        {
            id: 'oidc-on-top-of-oauth2',
            title: 'OIDC Is the Authentication Layer',
            importance: 'must-know',
            summary: 'OAuth2 grants access to a resource and says nothing about who you are. OIDC adds an ID token, a userinfo endpoint and a discovery document, and that is what makes "sign in with X" possible.',
            interviewAngle: 'The single most valuable distinction in this module. Using an access token as proof of identity is a real and common vulnerability, and knowing why is the payoff.',
            buildsOn: ['the-flows-that-are-deprecated'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'Two tokens with different jobs',
                    left: 'Access token',
                    right: 'ID token (OIDC)',
                    rows: [
                        { aspect: 'Answers', left: 'What may the bearer do', right: 'Who signed in, and how' },
                        { aspect: 'Audience', left: 'The resource server', right: '<strong>The client</strong>' },
                        { aspect: 'Consumed by', left: 'The API', right: 'The application that started the flow' },
                        { aspect: 'Format', left: 'Opaque or JWT — the API need not care', right: 'Always a JWT, always verifiable' },
                        { aspect: 'Sent to an API', left: 'Yes, that is its purpose', right: '<strong>No.</strong> It is not a credential for API calls.' },
                        { aspect: 'Lifetime', left: 'Minutes', right: 'Consumed once, at sign-in' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Using an access token as proof of identity is a genuine vulnerability with a name — the confused deputy.</strong> An access token says only that the bearer may call this API; it does not say the bearer is the user it was issued for. A malicious application can collect an access token a user granted <em>to it</em> and present it to your backend, and if your backend infers identity from that token, it has just logged the attacker in as that user. The ID token exists to close exactly this hole: it carries an <code>aud</code> naming your client and a <code>nonce</code> tying it to your request.</p>'
                },
                {
                    type: 'types',
                    title: 'What OIDC adds on top',
                    items: [
                        { name: 'The ID token', html: '<p>A JWT with <code>sub</code>, <code>iss</code>, <code>aud</code>, <code>exp</code>, <code>nonce</code> and <code>auth_time</code>. Verified by the client.</p>' },
                        { name: 'The <code>openid</code> scope', html: '<p>Requesting it is what turns an OAuth2 flow into an OIDC one. Without it there is no ID token.</p>' },
                        { name: 'Standard claims and the userinfo endpoint', html: '<p><code>email</code>, <code>name</code>, <code>picture</code>, requested through the <code>profile</code> and <code>email</code> scopes.</p>' },
                        { name: 'Discovery', html: '<p><code>/.well-known/openid-configuration</code> lists every endpoint and the JWKS URI — which is why <code>issuer-uri</code> alone is enough to configure a Spring resource server.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>The one-line answer: <em>"OAuth2 is authorization — it gets you a token to call an API. OIDC is a thin authentication layer on top that adds an ID token telling the client who signed in. If somebody says they are using OAuth2 for login, they are using OIDC, or they have a confused-deputy problem."</em></p>'
                }
            ],
            docs: [
                { title: 'OpenID Connect Core 1.0', url: 'https://openid.net/specs/openid-connect-core-1_0.html', kind: 'spec' }
            ],
            relatedQuestions: [
                { topicId: 'spring-security', questionId: 'oauth2-versus-oidc' }
            ]
        },

        {
            id: 'resource-server-in-spring',
            title: 'A Resource Server, Configured',
            importance: 'must-know',
            summary: 'One property and one DSL line. The interesting parts are mapping claims to authorities and remembering that the audience check is not on by default.',
            interviewAngle: 'The practical question. It is short, which means the follow-ups are about what you added beyond the default.',
            buildsOn: ['oidc-on-top-of-oauth2'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The whole configuration, and the two additions worth making',
                    code: '@Bean\nSecurityFilterChain api(HttpSecurity http) throws Exception {\n    return http\n            .securityMatcher("/api/**")\n            .csrf(csrf -> csrf.disable())          // bearer token, not a cookie\n            .sessionManagement(s -> s.sessionCreationPolicy(STATELESS))\n            .authorizeHttpRequests(a -> a\n                    .requestMatchers("/api/public/**").permitAll()\n                    .requestMatchers(POST, "/api/orders/*/approve")\n                            .hasAuthority("SCOPE_orders.approve")\n                    .anyRequest().authenticated())\n            .oauth2ResourceServer(o -> o.jwt(jwt ->\n                    jwt.jwtAuthenticationConverter(converter())))\n            .build();\n}\n\n// Addition 1: map the claim your issuer actually uses. Spring maps the\n// `scope` claim to SCOPE_* by default and knows nothing about `roles`.\nJwtAuthenticationConverter converter() {\n    JwtGrantedAuthoritiesConverter authorities =\n            new JwtGrantedAuthoritiesConverter();\n    authorities.setAuthoritiesClaimName("roles");\n    authorities.setAuthorityPrefix("ROLE_");\n\n    JwtAuthenticationConverter converter = new JwtAuthenticationConverter();\n    converter.setJwtGrantedAuthoritiesConverter(authorities);\n    return converter;\n}\n\n// Addition 2: the audience validator from the JWT module. Not default.',
                    notes: '<p>Disabling CSRF here is correct and worth being able to justify rather than copying: CSRF exists because browsers attach cookies automatically, and a bearer token in an <code>Authorization</code> header is not attached automatically. The moment a token is stored in a cookie, that justification evaporates and CSRF protection is needed again.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Prefer <code>issuer-uri</code> to <code>jwk-set-uri</code>. With the issuer, Spring fetches the discovery document, learns the JWKS URI and the supported algorithms, and validates the <code>iss</code> claim against it. With only the JWKS URI you get signature validation and no issuer check — one line shorter and one check weaker.</p>'
                }
            ],
            docs: [
                { title: 'OAuth 2.0 Resource Server JWT', url: 'https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/jwt.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-security', questionId: 'configuring-security-in-spring-6' }
            ]
        },

        {
            id: 'token-introspection-vs-jwt',
            title: 'Introspection Against Local Validation',
            importance: 'should-know',
            summary: 'Validate the signature locally, or ask the authorization server what the token means. The second is a network call and it is the one that can revoke.',
            interviewAngle: 'This is the revocation trade-off from the JWT module, arriving as an architectural choice with a standard behind it.',
            buildsOn: ['resource-server-in-spring'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'Two ways for a resource server to decide',
                    left: 'Local JWT validation',
                    right: 'Introspection (RFC 7662)',
                    rows: [
                        { aspect: 'Network call per request', left: 'None', right: 'One, to the authorization server' },
                        { aspect: 'Revocation', left: '<strong>Not until expiry</strong>', right: '<strong>Immediate</strong>' },
                        { aspect: 'Token format', left: 'Must be a JWT', right: 'Anything — opaque random strings are ideal' },
                        { aspect: 'Leaks claims to the client', left: 'Yes — the payload is readable', right: 'No. The token means nothing to its holder.' },
                        { aspect: 'Authorization server load', left: 'JWKS fetches only', right: 'Proportional to request volume' },
                        { aspect: 'Failure mode', left: 'Resource server keeps working if the AS is down', right: '<strong>The AS is now on the critical path of every request</strong>' }
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>The hybrid is what large deployments settle on and it is worth naming: <strong>opaque tokens at the edge, JWTs inside</strong>. The public API issues opaque tokens, so clients learn nothing and revocation is immediate; the gateway introspects once, mints a short-lived internal JWT, and every internal service validates that locally with no further calls. One introspection per request at the boundary, none behind it.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Caching an introspection result for even thirty seconds removes most of the load and most of the availability risk, at the cost of a thirty-second revocation delay. That is usually an easy trade — and it is the same shape as every other decision in this track: revocation freshness bought with a lookup, priced in milliseconds.</p>'
                }
            ],
            docs: [
                { title: 'RFC 7662 — Token Introspection', url: 'https://www.rfc-editor.org/rfc/rfc7662.html', kind: 'spec' },
                { title: 'Opaque Token Resource Server', url: 'https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/opaque-token.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-security', questionId: 'revoking-a-jwt' }
            ]
        }
    ]
};
