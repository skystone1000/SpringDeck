/* ==========================================================================
   data/theory/jwt-in-practice.js — module 58 in the reading path

   JWTs are the most confidently misexplained topic in a backend interview.
   The plan's tagline names the reason: signing, validating, expiring — and
   the revocation problem nobody mentions. Nine chapters, and three of them
   are about things a JWT cannot do.

   The last chapter is a deliberate inversion of the usual shape. Rather than
   summarising, it lists the specific wrong statements that end a security
   conversation — "JWTs are encrypted", "localStorage because cookies are
   insecure", "I can revoke it" — because recognising them is more useful
   than another pass over the correct version.
   ========================================================================== */

const jwtInPracticeModule = {
    id: 'jwt-in-practice',
    trackId: 'security',
    order: 58,
    title: 'JWT, End to End',
    tagline: 'Signing, validating, expiring — and the revocation problem nobody mentions.',
    estimatedMinutes: 45,
    prerequisites: ['security-filter-chain'],
    docHub: { title: 'RFC 7519 — JSON Web Token', url: 'https://www.rfc-editor.org/rfc/rfc7519.html' },

    chapters: [
        {
            id: 'jwt-structure',
            title: 'Three Base64 Segments',
            importance: 'must-know',
            summary: 'Header, payload, signature, joined by dots. The first two are base64url-encoded JSON — encoded, not encrypted, and anybody holding the token can read them.',
            interviewAngle: 'The encoding-versus-encryption point is the most common misconception in this area, and stating it correctly is a cheap, clear signal.',
            buildsOn: [],
            blocks: [
                {
                    type: 'syntax',
                    language: 'json',
                    title: 'What the first two segments decode to',
                    code: '// header  -- how to verify the signature\n{\n  "alg": "RS256",\n  "typ": "JWT",\n  "kid": "2026-01-key-a"\n}\n\n// payload -- the claims. READABLE BY ANYONE holding the token.\n{\n  "iss": "https://auth.acme.com",\n  "sub": "user_4193",\n  "aud": "orders-api",\n  "exp": 1774000900,\n  "iat": 1774000000,\n  "jti": "9f2c1e7a",\n  "roles": ["ORDER_APPROVE"]\n}\n\n// signature -- HMAC or a digital signature over\n//   base64url(header) + "." + base64url(payload)',
                    output: {
                        kind: 'trace',
                        lines: [
                            'A JWT is signed, not encrypted. Base64url is an encoding; it hides nothing.',
                            'Anyone holding the token can decode the payload with a one-line command or by pasting it into a web page.',
                            'The signature proves the token was issued by the holder of the key and has not been altered. It does not make it secret.',
                            'So: never put anything confidential in a claim. No password, no card number, no internal identifier you would not print in a log.'
                        ],
                        explain: '<p>If a payload genuinely must be secret there is a separate standard for it — JWE, JSON Web Encryption — and it is rarely what people mean when they say JWT. In practice the right answer is not to encrypt the token but to stop putting secrets in it.</p>'
                    }
                },
                {
                    type: 'table',
                    title: 'The registered claims, and what each one is checked against',
                    headers: ['Claim', 'Meaning', 'The check it enables'],
                    rows: [
                        ['<code>iss</code>', 'Issuer', 'Reject tokens from an issuer you do not trust'],
                        ['<code>sub</code>', 'Subject — the principal', 'Who the request is on behalf of'],
                        ['<code>aud</code>', 'Audience — who it is for', '<strong>Reject a token minted for another service.</strong> Skipped surprisingly often.'],
                        ['<code>exp</code>', 'Expiry, as a Unix second', 'Reject expired tokens'],
                        ['<code>nbf</code>', 'Not before', 'Reject tokens that are not yet valid'],
                        ['<code>iat</code>', 'Issued at', 'Age-based policies; useful for a "not valid before" revocation scheme'],
                        ['<code>jti</code>', 'A unique token id', '<strong>The handle a denylist needs.</strong> Include it, even if you have no denylist yet.']
                    ]
                }
            ],
            docs: [
                { title: 'RFC 7519 §4.1 — Registered Claim Names', url: 'https://www.rfc-editor.org/rfc/rfc7519.html', kind: 'spec' }
            ],
            relatedQuestions: [
                { topicId: 'spring-security', questionId: 'jwt-structure-and-validation' }
            ]
        },

        {
            id: 'signing-algorithms',
            title: 'HS256 Against RS256',
            importance: 'must-know',
            summary: 'HMAC uses one shared secret, so anyone who can verify can also issue. RSA and ECDSA use a key pair, so a resource server can verify with a public key it is safe to publish.',
            interviewAngle: 'The distinction decides an architecture. With HS256 every service that validates tokens can mint them, which makes a compromised service a token factory.',
            buildsOn: ['jwt-structure'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'Symmetric against asymmetric',
                    left: 'HS256 (HMAC-SHA256)',
                    right: 'RS256 / ES256',
                    rows: [
                        { aspect: 'Keys', left: 'One shared secret', right: 'A private key to sign, a public key to verify' },
                        { aspect: 'Who can issue', left: '<strong>Anyone who can verify</strong>', right: 'Only the holder of the private key' },
                        { aspect: 'Key distribution', left: 'Every verifier needs the secret, securely', right: 'The public key can be published — that is what JWKS is' },
                        { aspect: 'Key rotation', left: 'Coordinate a secret change across every service', right: 'Publish a new key in JWKS; the <code>kid</code> selects it' },
                        { aspect: 'Speed', left: 'Faster', right: 'Slower to sign; ES256 is compact and quick to verify' },
                        { aspect: 'Right for', left: 'One service that issues and consumes its own tokens', right: '<strong>Anything with more than one consumer</strong>' }
                    ]
                },
                {
                    type: 'syntax',
                    language: 'yaml',
                    title: 'A resource server, configured by URL',
                    code: 'spring:\n  security:\n    oauth2:\n      resourceserver:\n        jwt:\n          # The issuer publishes its keys. Spring fetches the JWKS,\n          # caches it, and re-fetches when it sees an unknown `kid` --\n          # which is what makes rotation a non-event.\n          issuer-uri: https://auth.acme.com/realms/acme\n\n          # Pin the algorithms you accept. Without this the token\'s own\n          # header chooses, which is the whole point of the alg attack.\n          jws-algorithms:\n            - RS256\n\n          # And the audience check, which is not on by default:\n          audiences:\n            - orders-api',
                    notes: '<p>The <code>kid</code> header is what makes rotation work without downtime: the issuer publishes both keys during the overlap, the resource server picks the one the token names, and old tokens keep verifying until they expire. That property is the practical reason to prefer asymmetric signing even in a system with one consumer today.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>The <code>alg: none</code> attack and the RS256-to-HS256 confusion attack both come from trusting the token\'s own header.</strong> The first sets the algorithm to <code>none</code> and omits the signature. The second changes <code>alg</code> to <code>HS256</code> and signs with the server\'s <em>public</em> RSA key as the HMAC secret — which works against any library that picks its verification method from the header. Every current library refuses both, and the defence is the same in all of them: <strong>the server decides which algorithms are acceptable, not the token.</strong></p>'
                }
            ],
            docs: [
                { title: 'RFC 7518 — JSON Web Algorithms', url: 'https://www.rfc-editor.org/rfc/rfc7518.html', kind: 'spec' }
            ],
            relatedQuestions: [
                { topicId: 'spring-security', questionId: 'jwt-attacks' }
            ]
        },

        {
            id: 'validating-a-token',
            title: 'Validating One',
            importance: 'must-know',
            summary: 'Signature, issuer, audience, expiry, not-before, and the algorithm. Six checks, and a library does five of them by default — the audience is usually the one left off.',
            interviewAngle: 'Listing the checks in order, and knowing which ones Spring does not enable by default, is a precise and verifiable answer.',
            buildsOn: ['signing-algorithms'],
            blocks: [
                {
                    type: 'types',
                    title: 'The checks, in the order they should run',
                    items: [
                        { name: '1. Algorithm is one you accept', html: '<p>From your configuration, never from the header. This must be first, because everything after it depends on verifying correctly.</p>' },
                        { name: '2. Signature verifies', html: '<p>Against the key selected by <code>kid</code> from the issuer\'s JWKS. If this fails, stop — nothing else in the token means anything.</p>' },
                        { name: '3. <code>iss</code> is the expected issuer', html: '<p>A validly signed token from a different issuer you also trust is still not for you.</p>' },
                        { name: '4. <code>aud</code> contains this service', html: '<p><strong>The one most often skipped.</strong> Without it, a token minted for the reporting API is accepted by the payments API.</p>' },
                        { name: '5. <code>exp</code> is in the future, <code>nbf</code> in the past', html: '<p>With a small clock skew allowance — see the next chapter but one.</p>' },
                        { name: '6. Your own rules', html: '<p>A required scope, a tenant claim matching the path, a token version. Application-specific, and this is where a custom validator goes.</p>' }
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Adding the checks Spring does not add for you',
                    code: '@Bean\nJwtDecoder jwtDecoder(OAuth2ResourceServerProperties props) {\n    NimbusJwtDecoder decoder = JwtDecoders.fromIssuerLocation(\n            props.getJwt().getIssuerUri());\n\n    OAuth2TokenValidator<Jwt> withDefaults =\n            JwtValidators.createDefaultWithIssuer(props.getJwt().getIssuerUri());\n\n    // Audience: NOT part of the defaults. Add it explicitly.\n    OAuth2TokenValidator<Jwt> audience = jwt ->\n            jwt.getAudience().contains("orders-api")\n                    ? OAuth2TokenValidatorResult.success()\n                    : OAuth2TokenValidatorResult.failure(new OAuth2Error(\n                            "invalid_token", "wrong audience", null));\n\n    // An application rule: reject tokens issued before the user is\n    // credentials changed. This is the cheap revocation from earlier.\n    OAuth2TokenValidator<Jwt> notBefore = jwt -> users\n            .credentialsChangedAt(jwt.getSubject())\n            .filter(changed -> jwt.getIssuedAt().isBefore(changed))\n            .map(changed -> OAuth2TokenValidatorResult.failure(new OAuth2Error(\n                    "invalid_token", "credentials changed", null)))\n            .orElseGet(OAuth2TokenValidatorResult::success);\n\n    decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(\n            withDefaults, audience, notBefore));\n    return decoder;\n}',
                    notes: '<p>The <code>notBefore</code> validator is worth noticing for what it costs: one lookup per request, cacheable per user, and in exchange it makes "log out everywhere" and "revoke this person\'s access now" work. It is the cheapest of the mitigations from the previous module, and it is nine lines.</p>'
                }
            ],
            docs: [
                { title: 'Spring Security — JWT Resource Server', url: 'https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/jwt.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-security', questionId: 'jwt-structure-and-validation' }
            ]
        },

        {
            id: 'claims-worth-carrying',
            title: 'What to Put in the Payload',
            importance: 'should-know',
            summary: 'Enough to authorize without a lookup, and no more. Every claim is public, every claim is stale the moment it is issued, and every claim is bytes on every request.',
            interviewAngle: 'A design question with three competing pressures — size, staleness and privacy — and naming all three is the answer.',
            buildsOn: ['validating-a-token'],
            blocks: [
                {
                    type: 'table',
                    title: 'What belongs, and what does not',
                    headers: ['Claim', 'Include?', 'Why'],
                    rows: [
                        ['User id (<code>sub</code>)', 'Yes', 'The whole point'],
                        ['Roles or scopes', 'Usually', 'Authorization without a lookup — and stale until expiry'],
                        ['Tenant id', 'Yes', 'Needed on every request, changes almost never'],
                        ['Display name, email', 'Only if the UI needs it', 'Personal data in a token stored on the client and logged by proxies'],
                        ['Permissions, enumerated', 'Rarely', 'Hundreds of strings; the token grows past header limits'],
                        ['Anything secret', '<strong>Never</strong>', 'The payload is readable by anyone holding the token'],
                        ['Data that changes often', 'No', 'It is a snapshot, and it will be wrong'],
                        ['<code>jti</code>', 'Yes', 'It costs 16 bytes and it is what a denylist needs later']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A large token is an outage waiting for a slow week.</strong> Tokens travel in the <code>Authorization</code> header, and proxies cap header size — nginx defaults to 8 KB across all headers and many gateways are tighter. A user in forty groups whose token enumerates every permission produces a <code>431</code> or a truncated request that only affects the users with the most permissions, which are usually administrators. Carry roles, resolve fine-grained permissions server-side.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The staleness question has a design answer rather than a technical one: put in the token what is <em>true for the session</em> and look up what is <em>true right now</em>. A tenant id will not change mid-session. An account balance will. Roles sit in between, which is why short expiry is the lever that makes carrying them acceptable.</p>'
                }
            ],
            docs: [
                { title: 'OAuth 2.0 Security Best Current Practice', url: 'https://www.rfc-editor.org/rfc/rfc9700.html', kind: 'spec' }
            ],
            relatedQuestions: [
                { topicId: 'spring-security', questionId: 'jwt-structure-and-validation' }
            ]
        },

        {
            id: 'expiry-and-clock-skew',
            title: 'Expiry and Clock Skew',
            importance: 'should-know',
            summary: 'exp is compared against the validating server\'s clock, and two servers never agree exactly. A small tolerance is correct; a large one extends the life of every token.',
            interviewAngle: 'A small operational detail that shows production experience. The number matters: sixty seconds is the usual default and is a reasonable answer.',
            buildsOn: ['claims-worth-carrying'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p><code>exp</code> and <code>nbf</code> are absolute times, and they are evaluated against the clock of whichever machine is validating. If the resource server is two seconds ahead of the issuer, a freshly minted token with a short lifetime can be rejected as expired — which presents as intermittent 401s that correlate with nothing and cannot be reproduced.</p><p>Every library therefore allows a skew tolerance, usually sixty seconds by default. That is a sensible number: it absorbs ordinary NTP drift, and it extends every token\'s effective life by a minute, which for a fifteen-minute token is under seven per cent.</p>'
                },
                {
                    type: 'table',
                    title: 'Lifetimes, and what each one is trading',
                    headers: ['Token', 'Typical lifetime', 'The trade'],
                    rows: [
                        ['Access token', '5–15 minutes', 'Bounds the damage of a leak, and the revocation delay'],
                        ['Refresh token', 'Days to weeks', 'Convenience. Must be stored, and must be revocable.'],
                        ['ID token (OIDC)', 'Minutes', 'Consumed once at sign-in; not a credential for API calls'],
                        ['Service-to-service token', 'Minutes, refreshed automatically', 'No human is inconvenienced, so keep it short'],
                        ['Clock skew allowance', '30–60 seconds', 'Absorbs drift; adds to every lifetime above']
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>Skew is a symptom worth fixing rather than tolerating. If tokens are failing validation and the skew allowance is being raised to compensate, the actual problem is NTP on one of the machines — and the same drift will produce wrong timestamps in logs, wrong ordering in traces and confusing durations in metrics. Raising the allowance hides a fault that is also breaking other things.</p>'
                }
            ],
            docs: [
                { title: 'RFC 7519 §4.1.4 — exp', url: 'https://www.rfc-editor.org/rfc/rfc7519.html', kind: 'spec' }
            ],
            relatedQuestions: [
                { topicId: 'java-io-time', questionId: 'monotonic-versus-wall-clock' }
            ]
        },

        {
            id: 'refresh-tokens',
            title: 'Refresh Tokens',
            importance: 'must-know',
            summary: 'A long-lived credential used only to obtain new short-lived access tokens. It exists so the access token can be short, and it is the thing that actually has to be stored and revocable.',
            interviewAngle: 'The full answer explains why the pair exists — one is checked everywhere and must be cheap, the other is presented rarely and can be verified against a database.',
            buildsOn: ['expiry-and-clock-skew'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>The two-token design resolves the tension from the previous module. An <strong>access token</strong> is presented on every request, so validating it must be cheap — signature only, no lookup. A <strong>refresh token</strong> is presented only when the access token expires, so validating it can be expensive: look it up in a database, check it has not been revoked, check the device and the user are still in good standing.</p><p>The result is that revocation is real — deleting the refresh token means no new access tokens — with a bounded window equal to the access token\'s remaining life.</p>'
                },
                {
                    type: 'types',
                    title: 'The rules that make it safe',
                    items: [
                        { name: 'Store it server-side, hashed', html: '<p>It is a credential. Treat it like a password: store a hash, compare on presentation.</p>' },
                        { name: 'Rotate on every use', html: '<p>Each refresh returns a new refresh token and invalidates the old one. A stolen token is then usable at most once.</p>' },
                        { name: 'Detect reuse', html: '<p><strong>The important one.</strong> If an already-rotated token is presented, both the legitimate client and the thief have it — revoke the whole family and force a re-login. This is what turns rotation from a delay into a detector.</p>' },
                        { name: 'Bind it to a client and a device', html: '<p>So a token exfiltrated from one device is not usable from another without also stealing the binding.</p>' },
                        { name: 'Never send it to a resource server', html: '<p>It goes to the authorization server, and nowhere else. A resource server has no reason to see one and every reason not to.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Refresh rotation without reuse detection buys much less than it appears to.</strong> An attacker who steals a refresh token and uses it first gets a fresh pair and the legitimate user is silently logged out — which looks like a glitch, not an incident. Reuse detection is what converts that into a signal: the legitimate client presents the old token, the server sees a rotated token being reused, and the whole family is revoked. Rotation without it is a speed bump.</p>'
                }
            ],
            docs: [
                { title: 'OAuth 2.0 Security BCP — Refresh Tokens', url: 'https://www.rfc-editor.org/rfc/rfc9700.html', kind: 'spec' }
            ],
            relatedQuestions: [
                { topicId: 'spring-security', questionId: 'revoking-a-jwt' }
            ]
        },

        {
            id: 'revocation-and-why-it-is-hard',
            title: 'Revocation',
            importance: 'must-know',
            summary: 'A self-validating token cannot be revoked, by construction. Every solution reintroduces a lookup; the engineering is in making that lookup cheap enough to be acceptable.',
            interviewAngle: 'The chapter the plan singles out. Saying plainly that you cannot revoke a JWT, then giving three mitigations with their costs, is a complete senior answer.',
            buildsOn: ['refresh-tokens'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>The property that makes a JWT useful is that any server holding the public key can validate it without asking anyone. Revocation requires exactly the opposite — asking someone whether this particular token is still acceptable. <strong>The two cannot both be true</strong>, which is why this is a structural limitation rather than a missing feature.</p><p>So every approach is a compromise on how expensive and how fresh the lookup is.</p>'
                },
                {
                    type: 'table',
                    title: 'The options, and what each actually costs',
                    headers: ['Approach', 'Revocation delay', 'Cost per request'],
                    rows: [
                        ['Short expiry alone', 'Up to the token lifetime', 'Nothing. <strong>Start here.</strong>'],
                        ['Denylist of <code>jti</code> in Redis', 'Immediate', 'One Redis read; entries expire with the token'],
                        ['Per-user "credentials changed at" timestamp', 'Immediate, for that user', 'One lookup, cacheable per user for a few seconds'],
                        ['Token version claim compared to the user record', 'Immediate, for that user', 'A user lookup — same as above with different bookkeeping'],
                        ['Opaque tokens with introspection', 'Immediate', 'A call to the authorization server, usually cached briefly'],
                        ['Rotate the signing key', 'Immediate, <strong>for everybody</strong>', 'Nothing, and it logs out every user at once']
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>The per-user timestamp is the best value in the table and it is under-used. One column on the user record, updated on password change, on logout-everywhere and on an administrative disable; one cached read per request; and it covers the three requirements people actually mean by revocation. A <code>jti</code> denylist is only needed to revoke <em>one particular token</em> while leaving the user\'s others working, which is a rarer requirement than it sounds.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Key rotation as a revocation mechanism is a real option and a blunt one.</strong> It invalidates every token in circulation, so every user is logged out and every service-to-service caller fails until it refreshes. It is the correct response to a suspected key compromise and the wrong response to one dismissed employee — and knowing which situation calls for it is worth more than knowing that it is possible.</p>'
                }
            ],
            docs: [
                { title: 'RFC 7009 — Token Revocation', url: 'https://www.rfc-editor.org/rfc/rfc7009.html', kind: 'spec' }
            ],
            relatedQuestions: [
                { topicId: 'spring-security', questionId: 'revoking-a-jwt' }
            ]
        },

        {
            id: 'storing-tokens-on-the-client',
            title: 'Where the Client Puts It',
            importance: 'must-know',
            summary: 'localStorage is readable by any script on the page. An HttpOnly cookie is not, and brings CSRF instead. Neither is simply "secure", and the choice is which attack you defend against.',
            interviewAngle: 'The trap is the confident wrong answer — "localStorage, because cookies are insecure". The right answer names both threats and picks deliberately.',
            buildsOn: ['revocation-and-why-it-is-hard'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'Two places, two different exposures',
                    left: 'localStorage / sessionStorage',
                    right: 'HttpOnly cookie',
                    rows: [
                        { aspect: 'Readable by JavaScript', left: '<strong>Yes — any XSS reads the token</strong>', right: 'No' },
                        { aspect: 'Sent automatically', left: 'No — the app adds the header', right: 'Yes — which is what creates CSRF' },
                        { aspect: 'CSRF exposure', left: 'None', right: 'Yes, mitigated by <code>SameSite</code> and a CSRF token' },
                        { aspect: 'XSS exposure', left: 'Total — the token is exfiltrated', right: 'Serious, but the token itself cannot be stolen' },
                        { aspect: 'Cross-origin API', left: 'Straightforward', right: 'Needs CORS with credentials and <code>SameSite=None; Secure</code>' },
                        { aspect: 'Mobile and native clients', left: 'Use the platform keychain, not either of these', right: '—' }
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>The asymmetry that decides it: with an XSS vulnerability and <code>localStorage</code>, the attacker <strong>takes the token</strong> and uses it from their own machine, for as long as it is valid, with no further access to the victim. With an XSS vulnerability and an <code>HttpOnly</code> cookie, the attacker can make requests <em>from the victim\'s browser</em> while the page is open — serious, and narrower.</p><p>So the current recommendation for a browser application is an <code>HttpOnly</code>, <code>Secure</code>, <code>SameSite=Lax</code> or <code>Strict</code> cookie, plus CSRF protection. The token never enters the JavaScript environment at all.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The pattern that gets both properties is the <strong>backend-for-frontend</strong>: the browser holds a session cookie to your own server, that server holds the OAuth tokens and attaches them to upstream calls, and no token ever reaches the browser. It costs a component and it removes the entire question — which is why it has become the standard recommendation for browser-based OAuth clients.</p>'
                }
            ],
            docs: [
                { title: 'OAuth 2.0 for Browser-Based Applications', url: 'https://datatracker.ietf.org/doc/html/draft-ietf-oauth-browser-based-apps', kind: 'spec' }
            ],
            relatedQuestions: [
                { topicId: 'spring-security', questionId: 'where-to-store-a-token' }
            ]
        },

        {
            id: 'jwt-mistakes-that-fail-an-interview',
            title: 'The Statements That End the Conversation',
            importance: 'must-know',
            summary: 'Eight confident claims that are wrong, with the correct version of each. Recognising them is more useful than another pass over the right answer.',
            interviewAngle: 'This is the chapter to reread before the interview. Each item is something candidates say routinely, and each one signals that the topic was learned from a tutorial rather than from a system.',
            buildsOn: ['storing-tokens-on-the-client'],
            blocks: [
                {
                    type: 'types',
                    title: 'Eight of them',
                    items: [
                        { name: '"JWTs are encrypted"', html: '<p>They are <strong>signed</strong>. The payload is base64url and readable by anyone. Encryption is JWE and is a different thing.</p>' },
                        { name: '"I can revoke a JWT"', html: '<p>Not without adding state. Say which mechanism — a denylist, a per-user timestamp, introspection — and what it costs.</p>' },
                        { name: '"JWTs are more secure than sessions"', html: '<p>They are more <em>scalable</em>. A session id in an HttpOnly cookie is arguably more secure, because it is opaque and revocable.</p>' },
                        { name: '"localStorage, because cookies are insecure"', html: '<p>Backwards. <code>localStorage</code> is readable by any script; <code>HttpOnly</code> is not.</p>' },
                        { name: '"The signature makes the payload tamper-proof"', html: '<p>It makes tampering <em>detectable</em>, and only if the server verifies. It does not make the payload unreadable or unmodifiable.</p>' },
                        { name: '"We use JWTs so we do not need a database"', html: '<p>You need one for refresh tokens, for revocation, and for anything that changes. The claim usually means "we have not built revocation yet".</p>' },
                        { name: '"Longer expiry is fine, the token is signed"', html: '<p>Expiry is the only thing bounding a leaked token\'s usefulness. It is the primary control, not a formality.</p>' },
                        { name: '"We validate the signature, so we are done"', html: '<p>Issuer, audience, expiry and the accepted algorithm list are all still required — and the audience check is the one usually missing.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>The answer that demonstrates the whole module in four sentences: <em>"A JWT is signed, not encrypted, so nothing secret goes in it. I validate the signature against the issuer\'s JWKS with the algorithm list pinned server-side, and I check issuer, audience and expiry. Access tokens are short — ten or fifteen minutes — with a rotating refresh token that is stored hashed and has reuse detection. Revocation is the honest weak point: I use a per-user credentials-changed timestamp, one cached lookup per request, because without something like that a logout is not immediate."</em></p>'
                }
            ],
            docs: [
                { title: 'OAuth 2.0 Security Best Current Practice', url: 'https://www.rfc-editor.org/rfc/rfc9700.html', kind: 'spec' }
            ],
            relatedQuestions: [
                { topicId: 'spring-security', questionId: 'jwt-attacks' },
                { topicId: 'spring-security', questionId: 'session-versus-jwt' }
            ]
        }
    ]
};
