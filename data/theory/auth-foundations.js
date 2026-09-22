/* ==========================================================================
   data/theory/auth-foundations.js — module 56 in the reading path

   The security track opens here, and it opens with vocabulary because the
   vocabulary is where the marks are. "Authentication and authorization" is
   the plan's title and its tagline is the whole reason the chapter exists:
   two words people use interchangeably in interviews and should not.

   Six chapters, and only one of them is about a mechanism. The rest are
   distinctions — authn against authz, session against token, principal
   against authority against role — plus one chapter that costs the reader
   something, which is what statelessness actually gives up. A security
   answer that lists benefits and no costs is the same failure as a
   microservices answer that does.

   Its prerequisite is http-foundations rather than anything in this track:
   every mechanism here is a header, a cookie or a status code, and those
   were established there.
   ========================================================================== */

const authFoundationsModule = {
    id: 'auth-foundations',
    trackId: 'security',
    order: 56,
    title: 'Authentication and Authorization',
    tagline: 'Two words people use interchangeably in interviews and should not.',
    estimatedMinutes: 35,
    prerequisites: ['http-foundations'],
    docHub: { title: 'Spring Security Reference', url: 'https://docs.spring.io/spring-security/reference/index.html' },

    chapters: [
        {
            id: 'authn-vs-authz',
            title: 'Authentication Against Authorization',
            importance: 'must-know',
            summary: 'Authentication establishes who you are. Authorization decides what you may do. They fail with different status codes and they belong in different parts of the request.',
            interviewAngle: 'Asked in nearly every security conversation, and the discriminating detail is the status codes: 401 means the identity is missing or invalid, 403 means the identity is fine and the answer is still no.',
            buildsOn: [],
            blocks: [
                {
                    type: 'definition',
                    term: 'Authentication',
                    html: '<p>Establishing that a request comes from a particular principal. It answers <em>who</em>. It happens once per request, early, and its output is an identity the rest of the request can rely on.</p>'
                },
                {
                    type: 'definition',
                    term: 'Authorization',
                    html: '<p>Deciding whether an established principal may perform a particular operation on a particular thing. It answers <em>may they</em>. It happens repeatedly, wherever a decision is needed, and it depends on both the identity and the resource.</p>'
                },
                {
                    type: 'table',
                    title: 'The differences that show up in code',
                    headers: ['', 'Authentication', 'Authorization'],
                    rows: [
                        ['Question', 'Who are you?', 'May you do this?'],
                        ['HTTP status on failure', '<strong>401 Unauthorized</strong> — a misnomer; it means unauthenticated', '<strong>403 Forbidden</strong>'],
                        ['Does a retry with better credentials help', 'Yes — that is what <code>WWW-Authenticate</code> invites', 'No. Retrying changes nothing.'],
                        ['How often per request', 'Once', 'As many times as there are decisions'],
                        ['Depends on the resource', 'No', '<strong>Yes</strong> — user 7 may edit order 7 and not order 8'],
                        ['Where it lives', 'A filter, at the edge', 'The filter chain <em>and</em> the service layer']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Returning 403 where 404 is safer is a judgement call worth being able to make.</strong> "You may not view order 8812" tells an attacker that order 8812 exists, which is an enumeration oracle. For resources whose <em>existence</em> is sensitive — another tenant\'s data, a private document — return 404 for both "does not exist" and "not yours". For resources where existence is public knowledge, 403 is clearer and more honest. Choose deliberately; the default of always-403 leaks, and the default of always-404 makes legitimate permission errors baffling.</p>'
                }
            ],
            docs: [
                { title: 'RFC 9110 §15.5.2 — 401 Unauthorized', url: 'https://www.rfc-editor.org/rfc/rfc9110.html', kind: 'spec' }
            ],
            relatedQuestions: [
                { topicId: 'spring-security', questionId: 'authentication-versus-authorization' },
                { topicId: 'rest-api', questionId: 'status-codes-that-matter' }
            ]
        },

        {
            id: 'sessions-vs-tokens',
            title: 'Sessions Against Tokens',
            importance: 'must-know',
            summary: 'A session id is a reference to server-side state. A token carries the state itself, signed. One can be revoked instantly and one cannot, and everything else follows from that.',
            interviewAngle: 'The most-asked design question in this track. Candidates almost always argue for tokens; the stronger answer names what sessions are better at and says when it would choose them.',
            buildsOn: ['authn-vs-authz'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'A reference against a self-contained claim',
                    left: 'Session (cookie + server state)',
                    right: 'Token (JWT or similar)',
                    rows: [
                        { aspect: 'What the client holds', left: 'An opaque id — meaningless on its own', right: 'The claims themselves, signed' },
                        { aspect: 'Server state', left: 'A store: memory, Redis, database', right: 'None required' },
                        { aspect: 'Revocation', left: '<strong>Delete the row. Instant.</strong>', right: '<strong>Not possible without adding state back</strong>' },
                        { aspect: 'Scaling out', left: 'Needs a shared store or sticky sessions', right: 'Any instance can validate it' },
                        { aspect: 'Size on the wire', left: 'A few dozen bytes', right: 'Several hundred to a few thousand, on every request' },
                        { aspect: 'Changing a role', left: 'Effective on the next request', right: 'Effective when the token expires' },
                        { aspect: 'Cross-domain and mobile', left: 'Cookie rules make it awkward', right: 'A header works everywhere' },
                        { aspect: 'CSRF exposure', left: 'Yes — cookies are sent automatically', right: 'No, if the token is sent in a header and not stored in a cookie' }
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>The trade is a single one, stated in one sentence: <strong>a session keeps state so that it can be revoked; a token discards state so that it can be validated anywhere.</strong> Every row in the table is a consequence.</p><p>Which is why the third option is the one most large systems land on: <strong>opaque tokens with introspection</strong>. The client holds a random string, the resource server asks the authorization server what it means, and you get token-style ergonomics with session-style revocation — at the cost of a network call, usually mitigated with a short-lived cache.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>An answer that shows judgement rather than fashion: <em>"For a single web application with a browser front end, a session cookie is simpler and revocation is free — Spring Session with Redis scales it out. I reach for JWTs when there are several services that must validate independently, or a mobile client where cookies are awkward. And I would say up front that the JWT choice means accepting that a logout is not immediate unless I add a denylist, which puts state back."</em></p>'
                }
            ],
            docs: [
                { title: 'Spring Security — Session Management', url: 'https://docs.spring.io/spring-security/reference/servlet/authentication/session-management.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-security', questionId: 'session-versus-jwt' }
            ]
        },

        {
            id: 'password-storage-and-bcrypt',
            title: 'Storing a Password',
            importance: 'must-know',
            summary: 'A slow, salted, adaptive hash. Never encryption, never a fast hash, never your own scheme. bcrypt is the safe default and Argon2id is the current recommendation.',
            interviewAngle: 'Almost guaranteed, and it has a precisely right answer. The two facts that separate a good answer are why the hash must be slow, and that bcrypt embeds its own salt.',
            buildsOn: ['sessions-vs-tokens'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>Passwords are <strong>hashed</strong>, not encrypted, because encryption is reversible and nobody — including you — should be able to recover a password. The hash must be <strong>salted</strong>, so that two users with the same password have different stored values and a precomputed rainbow table is useless. And it must be <strong>slow and adaptive</strong>, because the whole attack is offline guessing at scale.</p><p>That last property is the one people miss. SHA-256 is a good hash and a terrible password hash: it is designed to be fast, so a GPU computes billions per second and a leaked table of SHA-256 password hashes is cracked at a rate limited only by hardware. bcrypt, scrypt and Argon2 are deliberately expensive, with a tunable cost, so the same hardware manages tens of thousands — and the cost can be raised as hardware improves.</p>'
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The encoder, and the format that carries its own parameters',
                    code: '@Bean\nPasswordEncoder passwordEncoder() {\n    // The delegating encoder reads a {id} prefix from the stored value\n    // and dispatches. It is what lets you migrate algorithms without a\n    // flag day: old hashes keep verifying, new ones use the new default.\n    return PasswordEncoderFactories.createDelegatingPasswordEncoder();\n}\n\n// A stored bcrypt value:\n//   {bcrypt}$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy\n//            |   |  |                       |\n//            |   |  +-- 22-char salt        +-- the hash\n//            |   +-- cost factor: 2^10 iterations\n//            +-- algorithm version\n//\n// The salt is IN the value. There is no salt column, and there does not\n// need to be -- which is why "where do you store the salt" has the\n// slightly surprising answer "next to the hash, in the same string".\n\n// Verification re-derives everything it needs from the stored value:\nencoder.matches(rawPassword, storedValue);   // constant-time comparison',
                    notes: '<p>The cost factor being embedded is what makes upgrading possible: raise the default to 12, and existing hashes still verify at 10 while new and re-entered passwords use 12. Spring Security\'s <code>upgradeEncoding</code> hook lets you re-hash on successful login, so the population migrates as people sign in.</p>'
                },
                {
                    type: 'table',
                    title: 'The algorithms, and what each resists',
                    headers: ['Algorithm', 'Status', 'Resists'],
                    rows: [
                        ['<code>Argon2id</code>', 'Current OWASP recommendation', 'GPU <em>and</em> ASIC attacks — memory-hard as well as slow'],
                        ['<code>scrypt</code>', 'Good', 'Memory-hard'],
                        ['<code>bcrypt</code>', 'Still fine; the safe default', 'GPU attacks. Note the 72-byte input limit.'],
                        ['<code>PBKDF2</code>', 'Acceptable, and required in some regulated contexts', 'Slow, but not memory-hard'],
                        ['<code>SHA-256</code>, <code>MD5</code>, <code>SHA-1</code>', '<strong>Wrong for passwords</strong>', 'Nothing. Fast is the defect.']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>bcrypt silently truncates input beyond 72 bytes.</strong> A long passphrase is cut, so the last characters contribute nothing — and a user who believes a 100-character passphrase is stronger is mistaken. Argon2id has no such limit. The usual mitigation for staying on bcrypt is to pre-hash with SHA-256 and base64 the result before encoding, which must be done consistently or every existing password breaks.</p>'
                }
            ],
            docs: [
                { title: 'Spring Security — Password Storage', url: 'https://docs.spring.io/spring-security/reference/features/authentication/password-storage.html', kind: 'guide' },
                { title: 'OWASP Password Storage Cheat Sheet', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-security', questionId: 'storing-passwords' }
            ]
        },

        {
            id: 'mfa-in-outline',
            title: 'Multi-Factor, in Outline',
            importance: 'good-to-know',
            summary: 'Something you know, something you have, something you are. The factors must be genuinely different, which is why SMS is a weak second factor rather than a second factor in the wrong category.',
            interviewAngle: 'Rarely deep. Knowing the three categories, and that TOTP is a shared secret plus a clock, is enough — plus why SIM swapping makes SMS the weakest option still in common use.',
            buildsOn: ['password-storage-and-bcrypt'],
            blocks: [
                {
                    type: 'types',
                    title: 'The three categories, and what is actually used',
                    items: [
                        { name: 'Something you know', html: '<p>A password, a PIN. Cheap, and the factor every attack targets first.</p>' },
                        { name: 'Something you have', html: '<p>A TOTP authenticator, a hardware key, a registered device. <strong>TOTP</strong> is a shared secret plus the current 30-second window, hashed — which is why it needs no network and why clock skew breaks it.</p>' },
                        { name: 'Something you are', html: '<p>A fingerprint or face. In practice this unlocks a key on the device rather than travelling to your server; the biometric never leaves the phone.</p>' },
                        { name: 'SMS — a weak "have"', html: '<p>Still the most common second factor and the weakest one in wide use. SIM swapping and SS7 interception both defeat it. Better than nothing; worse than an authenticator app; and worth naming as a known weakness rather than presenting as equivalent.</p>' },
                        { name: 'WebAuthn / passkeys', html: '<p>Public-key authentication bound to the origin, so a phished credential is useless on an attacker\'s domain. The strongest widely available option and the direction things are moving.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>The property that makes WebAuthn different in kind rather than degree is <strong>origin binding</strong>: the browser will only sign a challenge for the site that registered the credential, so a user tricked into entering it on a look-alike domain cannot produce a valid signature. Every other factor on this list — including TOTP — can be relayed by a phishing proxy in real time.</p>'
                }
            ],
            docs: [
                { title: 'OWASP Multifactor Authentication Cheat Sheet', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'principal-authority-role',
            title: 'Principal, Authority, Role',
            importance: 'must-know',
            summary: 'Three words Spring Security uses precisely. A principal is who; an authority is a granted permission string; a role is an authority with a ROLE_ prefix, and the prefix is load-bearing.',
            interviewAngle: 'The ROLE_ prefix is a small trap that catches people constantly: hasRole("ADMIN") and hasAuthority("ADMIN") are different checks, and one of them silently never matches.',
            buildsOn: ['mfa-in-outline'],
            blocks: [
                {
                    type: 'types',
                    title: 'The vocabulary, precisely',
                    items: [
                        { name: 'Principal', html: '<p>The authenticated entity. In Spring Security it is whatever <code>Authentication.getPrincipal()</code> returns — usually a <code>UserDetails</code>, or a <code>Jwt</code> for a resource server.</p>' },
                        { name: 'Authentication', html: '<p>The object holding the principal, the credentials, the granted authorities, and an <code>authenticated</code> flag. It lives in the <code>SecurityContext</code> for the duration of the request.</p>' },
                        { name: 'GrantedAuthority', html: '<p>A string representing a permission. <code>ORDER_READ</code>, <code>ROLE_ADMIN</code>. That is the whole abstraction — a string with a <code>getAuthority()</code> on it.</p>' },
                        { name: 'Role', html: '<p>An authority whose string starts with <code>ROLE_</code>. There is no separate type. The prefix is a convention that <code>hasRole</code> adds for you.</p>' }
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The prefix, and the check that silently never matches',
                    code: '// hasRole("ADMIN") tests for the authority "ROLE_ADMIN".\n// hasAuthority("ADMIN") tests for the authority "ADMIN".\n// If your authorities are stored WITHOUT the prefix, the first one\n// never matches -- and there is no error, only a 403.\n\nList<GrantedAuthority> authorities = List.of(\n        new SimpleGrantedAuthority("ROLE_ADMIN"),      // a role\n        new SimpleGrantedAuthority("ORDER_APPROVE"));  // a permission\n\n.authorizeHttpRequests(auth -> auth\n        .requestMatchers("/admin/**").hasRole("ADMIN")            // ROLE_ADMIN\n        .requestMatchers(POST, "/orders/*/approve")\n                .hasAuthority("ORDER_APPROVE")                   // no prefix\n        .anyRequest().authenticated())\n\n// Roles from a JWT need mapping, because the claim will not have the\n// prefix and Spring will not add it:\nJwtAuthenticationConverter converter = new JwtAuthenticationConverter();\nJwtGrantedAuthoritiesConverter authz = new JwtGrantedAuthoritiesConverter();\nauthz.setAuthorityPrefix("ROLE_");\nauthz.setAuthoritiesClaimName("roles");\nconverter.setJwtGrantedAuthoritiesConverter(authz);',
                    notes: '<p>The JWT case is where this bites most often: the token says <code>"roles": ["ADMIN"]</code>, Spring maps it to the authority <code>SCOPE_ADMIN</code> or <code>ADMIN</code> depending on configuration, and <code>hasRole("ADMIN")</code> looks for <code>ROLE_ADMIN</code> and finds nothing. Three plausible strings, one of which works.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Design permissions, not roles. <code>ORDER_APPROVE</code> is a fact about what the code does; <code>ROLE_MANAGER</code> is a fact about the organisation, and organisations reorganise. Grant permissions to roles in configuration or data, and check permissions in code — then a new job title is a configuration change rather than a search through every <code>@PreAuthorize</code> in the codebase.</p>'
                }
            ],
            docs: [
                { title: 'Spring Security — Authorization Architecture', url: 'https://docs.spring.io/spring-security/reference/servlet/authorization/architecture.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-security', questionId: 'method-security-and-preauthorize' }
            ]
        },

        {
            id: 'stateless-and-what-it-costs',
            title: 'What Stateless Costs',
            importance: 'must-know',
            summary: 'No server-side session means no logout, no immediate permission change, no "log out all devices", and no way to tell who is currently signed in. Those are real requirements.',
            interviewAngle: 'The chapter that makes the token answer credible. Anybody can say "JWTs are stateless and scale"; naming the four features that disappear is what shows the trade-off was understood rather than repeated.',
            buildsOn: ['principal-authority-role'],
            blocks: [
                {
                    type: 'types',
                    title: 'The four things you give up',
                    items: [
                        { name: 'Immediate logout', html: '<p>The token is valid until it expires. "Log out" deletes it from the client and the server would still accept it if presented. For a fifteen-minute token that is a fifteen-minute window; whether that is acceptable is a product decision, not a technical one.</p>' },
                        { name: 'Immediate permission change', html: '<p>Revoking someone\'s admin rights takes effect when their current token expires. For an employee being dismissed, that window matters.</p>' },
                        { name: 'Log out everywhere', html: '<p>There is no list of active sessions to invalidate, because there is no list.</p>' },
                        { name: 'Knowing who is online', html: '<p>No session store means no answer to "how many users are signed in", which is often a product requirement and occasionally a compliance one.</p>' }
                    ]
                },
                {
                    type: 'table',
                    title: 'Getting some of it back, and what each mitigation costs',
                    headers: ['Mitigation', 'Restores', 'Costs'],
                    rows: [
                        ['Short access-token lifetime (5–15 min) plus a refresh token', 'Bounds every window above', 'A refresh endpoint, and refresh tokens that <em>do</em> need storing'],
                        ['A denylist of revoked token ids', 'Immediate revocation', '<strong>State on every request — the thing you removed</strong>'],
                        ['A per-user "not valid before" timestamp', 'Log out everywhere, cheaply', 'One lookup or cache hit per request'],
                        ['Opaque tokens with introspection', 'Everything a session gave you', 'A call to the authorization server per request, usually cached'],
                        ['A token version claim compared against the user record', 'Permission changes take effect at once', 'A user lookup per request']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Every row in that table puts state back.</strong> That is not an argument against them — a five-minute cached denylist is a reasonable engineering position — but it does mean the phrase "stateless authentication" describes a design that most production systems do not actually have. The honest formulation is: <em>"short-lived tokens validated without a lookup, plus a small amount of shared state for revocation, sized so that a lookup is cheap."</em></p>'
                },
                {
                    type: 'tip',
                    html: '<p>The question to ask before choosing is what the business needs a logout to <em>mean</em>. For a news site, deleting the token client-side is fine. For a banking application, "log out" must mean the token stops working, which decides the architecture — and it is much cheaper to know that at design time than to retrofit a denylist onto a live system.</p>'
                }
            ],
            docs: [
                { title: 'Spring Security — Stateless Authentication', url: 'https://docs.spring.io/spring-security/reference/servlet/authentication/session-management.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-security', questionId: 'revoking-a-jwt' },
                { topicId: 'spring-security', questionId: 'session-versus-jwt' }
            ]
        }
    ]
};
