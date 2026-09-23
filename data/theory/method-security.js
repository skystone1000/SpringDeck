/* ==========================================================================
   data/theory/method-security.js — module 60 in the reading path

   The plan's tagline is an argument rather than a description: where
   authorization decisions actually belong. URL rules are a coarse first
   line and they cannot express the decision that matters most often, which
   is whether THIS principal may touch THIS row.

   Seven chapters. Two on the mechanism, one on the expression language, one
   on the vocabulary trap from the foundations module, and then the three
   that make the module worth having — domain object security, multi-tenant
   row scoping, and how to test any of it. The multi-tenancy chapter is the
   one to read twice: a missing tenant predicate is the highest-severity bug
   a multi-tenant service can ship, and it is invisible in every test written
   with one tenant's data.
   ========================================================================== */

const methodSecurityModule = {
    id: 'method-security',
    trackId: 'security',
    order: 60,
    title: 'Method Security and Access Rules',
    tagline: 'Where authorization decisions actually belong.',
    estimatedMinutes: 30,
    prerequisites: ['security-filter-chain'],
    docHub: { title: 'Method Security', url: 'https://docs.spring.io/spring-security/reference/servlet/authorization/method-security.html' },

    chapters: [
        {
            id: 'url-vs-method-security',
            title: 'URL Rules and Method Rules',
            importance: 'must-know',
            summary: 'URL rules run in the filter chain and know only the request. Method rules run inside the application and know the arguments and the return value. You need both, for different reasons.',
            interviewAngle: 'The distinction is about what information is available at each point. A URL rule cannot know whether order 8812 belongs to the caller, because the order has not been loaded yet.',
            buildsOn: [],
            blocks: [
                {
                    type: 'comparison',
                    title: 'Two layers, two kinds of decision',
                    left: 'URL rules (authorizeHttpRequests)',
                    right: 'Method rules (@PreAuthorize)',
                    rows: [
                        { aspect: 'Runs in', left: 'The filter chain, before the dispatcher', right: 'An AOP proxy, inside the application' },
                        { aspect: 'Knows', left: 'Path, method, headers, the identity', right: '<strong>The arguments, and after the call the return value</strong>' },
                        { aspect: 'Can express', left: '"Only admins may reach /admin/**"', right: '"Only the owner may read this order"' },
                        { aspect: 'Cost of a miss', left: 'A path someone forgot to list', right: 'A service method someone forgot to annotate' },
                        { aspect: 'Applies to non-HTTP entry points', left: 'No — a message consumer bypasses it entirely', right: '<strong>Yes</strong> — it is on the method' },
                        { aspect: 'Failure', left: '403 from the filter chain', right: '<code>AccessDeniedException</code>, translated to 403' }
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>The reason to have both is that they fail differently. URL rules are a <strong>deny-by-default perimeter</strong>: end the chain with <code>anyRequest().authenticated()</code> and a new endpoint is protected the moment it exists, before anybody remembers to annotate it. Method rules are where the <em>specific</em> decision lives, and they travel with the method — so a service called from a Kafka consumer or a scheduled job is still checked, which no URL rule can achieve.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A URL rule list that ends in <code>permitAll()</code> is a perimeter with the gate open.</strong> Every endpoint added afterwards is public until somebody notices. End with <code>anyRequest().authenticated()</code> or <code>anyRequest().denyAll()</code> and enumerate the public paths explicitly — the failure then is a legitimate endpoint returning 401 during development, which is loud and cheap, rather than a private endpoint returning data, which is neither.</p>'
                }
            ],
            docs: [
                { title: 'Authorize HttpServletRequests', url: 'https://docs.spring.io/spring-security/reference/servlet/authorization/authorize-http-requests.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-security', questionId: 'method-security-and-preauthorize' }
            ]
        },

        {
            id: 'preauthorize-and-postauthorize',
            title: '@PreAuthorize and @PostAuthorize',
            importance: 'must-know',
            summary: 'Pre runs before the method with access to the arguments. Post runs after with access to the return value — which means the work has already been done.',
            interviewAngle: 'The cost of @PostAuthorize is the discriminating point: the method executed, the transaction may have written, and only then was access denied.',
            buildsOn: ['url-vs-method-security'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The four annotations, and when each is right',
                    code: '@Configuration\n@EnableMethodSecurity            // prePostEnabled is true by default\nclass MethodSecurityConfig { }\n\n@Service\nclass OrderService {\n\n    // PRE: evaluated before the call. Arguments are available by name,\n    // which requires -parameters at compile time (Boot sets it).\n    @PreAuthorize("hasAuthority(\'ORDER_APPROVE\')")\n    void approve(String orderId) { ... }\n\n    @PreAuthorize("#customerId == authentication.name or hasRole(\'ADMIN\')")\n    List<Order> forCustomer(String customerId) { ... }\n\n    // POST: evaluated after. `returnObject` is the result -- so the\n    // method RAN, and any write it performed has happened.\n    @PostAuthorize("returnObject.customerId == authentication.name")\n    Order byId(String orderId) { ... }\n\n    // Filter a collection, in or out.\n    @PostFilter("filterObject.customerId == authentication.name")\n    List<Order> recent() { ... }\n\n    @PreFilter("filterObject.amount <= 10000")\n    void submitAll(List<Payment> payments) { ... }\n}',
                    notes: '<p><code>@PostAuthorize</code> on a read is defensible — a rejected read has done nothing but load a row. On anything that writes it is dangerous: with a transaction still open the <code>AccessDeniedException</code> does roll the write back, and outside a transaction, or after a call to another system, it does not. Prefer to express the rule in the query.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong><code>@PostFilter</code> loads everything and then discards most of it.</strong> A repository returning ten thousand orders, filtered down to the caller\'s four, has read ten thousand rows, mapped them and allocated them. Worse, it interacts badly with pagination: page one of twenty results can come back with three items, because seventeen were filtered after the page was cut. <strong>Filter in the query.</strong> <code>@PostFilter</code> is for small collections that are already in memory.</p>'
                }
            ],
            docs: [
                { title: 'Method Security', url: 'https://docs.spring.io/spring-security/reference/servlet/authorization/method-security.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-security', questionId: 'method-security-and-preauthorize' },
                { topicId: 'aop-proxies', questionId: 'advice-types-and-order' }
            ]
        },

        {
            id: 'spel-in-security-expressions',
            title: 'The Expression Language',
            importance: 'should-know',
            summary: 'SpEL, evaluated against a context that exposes authentication, the arguments and the return value. It is powerful, unchecked by the compiler, and best kept short by delegating to a bean.',
            interviewAngle: 'The mature answer is that a long expression in a string is untestable and unrefactorable, and that delegating to a named bean fixes both.',
            buildsOn: ['preauthorize-and-postauthorize'],
            blocks: [
                {
                    type: 'table',
                    title: 'What the expression can reach',
                    headers: ['Expression', 'Meaning'],
                    rows: [
                        ['<code>authentication</code>', 'The full <code>Authentication</code> object'],
                        ['<code>principal</code>', 'The principal — a <code>UserDetails</code>, or a <code>Jwt</code>'],
                        ['<code>hasRole(\'ADMIN\')</code>', 'Authority <code>ROLE_ADMIN</code> — the prefix is added for you'],
                        ['<code>hasAuthority(\'ORDER_APPROVE\')</code>', 'Exactly that authority, no prefix'],
                        ['<code>hasAnyRole(...)</code>, <code>hasAnyAuthority(...)</code>', 'Any of several'],
                        ['<code>#argName</code>', 'A method argument by name — needs <code>-parameters</code>'],
                        ['<code>returnObject</code>', 'The return value, in <code>@PostAuthorize</code>'],
                        ['<code>filterObject</code>', 'The current element, in <code>@PreFilter</code> and <code>@PostFilter</code>'],
                        ['<code>@beanName.method(...)</code>', '<strong>Call a Spring bean.</strong> The escape hatch that keeps expressions short.']
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Delegating, and then removing the string entirely',
                    code: '// Unreadable, untestable, and no compiler check on any of it:\n@PreAuthorize("hasRole(\'ADMIN\') or (hasAuthority(\'ORDER_READ\') and "\n            + "#order.customerId == authentication.name and "\n            + "#order.status.name() != \'ARCHIVED\')")\nOrder view(Order order) { ... }\n\n// Delegated: the rule is ordinary Java, unit-testable, refactorable.\n@Component("orderAccess")\nclass OrderAccess {\n    public boolean canView(Order order, Authentication auth) { ... }\n}\n\n@PreAuthorize("@orderAccess.canView(#order, authentication)")\nOrder view(Order order) { ... }\n\n// Better still: a composed annotation, so the expression is written\n// once and the call sites read as intent.\n@Target(METHOD)\n@Retention(RUNTIME)\n@PreAuthorize("@orderAccess.canView(#order, authentication)")\npublic @interface CanViewOrder { }\n\n@CanViewOrder\nOrder view(Order order) { ... }',
                    notes: '<p>The composed annotation is the meta-annotation mechanism from the reflection module, applied where it pays best: the expression exists in one place, every call site is self-describing, and changing the rule is one edit rather than a search for a string literal across the codebase.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A SpEL expression is a string, so nothing checks it until it runs.</strong> A renamed method argument, a renamed field on the return type, a typo in an authority — all compile, and all fail at run time. Worse, the direction of failure is not uniform: a misspelled authority in <code>hasAuthority</code> denies everybody, which is loud, while a mistake that makes an expression evaluate true grants everybody, which is silent. That asymmetry is the argument for keeping the strings short and the logic in Java.</p>'
                }
            ],
            docs: [
                { title: 'Expression-Based Access Control', url: 'https://docs.spring.io/spring-security/reference/servlet/authorization/expression-based.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-core', questionId: 'spel-in-value' }
            ]
        },

        {
            id: 'roles-vs-authorities',
            title: 'Designing the Permission Model',
            importance: 'should-know',
            summary: 'Roles describe people; permissions describe operations. Check permissions in code and grant them to roles in configuration, so a reorganisation is not a code change.',
            interviewAngle: 'A design question that shows whether someone has maintained an authorization model rather than written one. Role checks scattered through code are the thing that ages badly.',
            buildsOn: ['spel-in-security-expressions'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p><code>hasRole(\'MANAGER\')</code> in a service method encodes an organisational fact into application code. When the company introduces a Team Lead who may also approve orders, the change is a search through every annotation for every place a manager was assumed — and the ones that get missed are found by users, not by tests.</p><p><code>hasAuthority(\'ORDER_APPROVE\')</code> encodes what the method <em>does</em>, which does not change when the organisation does. The mapping from roles to permissions then lives in configuration or in a database table, where a new job title is a row.</p>'
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Expanding roles into permissions at authentication time',
                    code: '// The role-to-permission map: configuration, or a table.\nMap<String, Set<String>> ROLE_PERMISSIONS = Map.of(\n        "ROLE_VIEWER",  Set.of("ORDER_READ"),\n        "ROLE_AGENT",   Set.of("ORDER_READ", "ORDER_CREATE"),\n        "ROLE_MANAGER", Set.of("ORDER_READ", "ORDER_CREATE", "ORDER_APPROVE"),\n        "ROLE_ADMIN",   Set.of("ORDER_READ", "ORDER_CREATE", "ORDER_APPROVE",\n                               "USER_MANAGE"));\n\n// Expand once, when the Authentication is built. Every method check is\n// then a permission, and the role never appears in application code.\nCollection<GrantedAuthority> authoritiesFor(UserRecord user) {\n    Set<String> granted = new LinkedHashSet<>(user.roles());\n    user.roles().forEach(role ->\n            granted.addAll(ROLE_PERMISSIONS.getOrDefault(role, Set.of())));\n    return granted.stream()\n            .map(SimpleGrantedAuthority::new)\n            .collect(toList());\n}\n\n@PreAuthorize("hasAuthority(\'ORDER_APPROVE\')")   // survives reorganisation\nvoid approve(String orderId) { ... }',
                    notes: '<p>Keeping the roles in the authority list as well as the expanded permissions is worth doing: it costs a few strings and it means a rare, genuinely role-shaped rule — "only an admin may see the admin dashboard" — can still be expressed directly rather than by inventing a permission that exists only to stand in for a role.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Expanding at authentication time trades token size and staleness for check speed, which is the same trade as the JWT claims chapter. If the permission set is large, carry the roles in the token and expand server-side per request against a cached map — the map changes rarely and caches perfectly.</p>'
                }
            ],
            docs: [
                { title: 'Authorization Architecture', url: 'https://docs.spring.io/spring-security/reference/servlet/authorization/architecture.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-security', questionId: 'method-security-and-preauthorize' }
            ]
        },

        {
            id: 'domain-object-security',
            title: 'Whose Row Is It',
            importance: 'must-know',
            summary: 'The decision that matters most often is not "may this person approve orders" but "may this person approve THIS order". That answer is in the data, not in the token.',
            interviewAngle: 'This is IDOR — insecure direct object reference — which sits near the top of the OWASP API list. The mechanism to name is scoping the query rather than checking after loading.',
            buildsOn: ['roles-vs-authorities'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Three ways to answer it, in increasing order of safety',
                    code: '// 1. THE BUG. The role check passes and the id came from the URL.\n//    Any authenticated agent can read any customer is order.\n@PreAuthorize("hasAuthority(\'ORDER_READ\')")\nOrder byId(String orderId) {\n    return repository.findById(orderId).orElseThrow();\n}\n\n// 2. Load, then check. Correct, and it has already read the row --\n//    fine for a read, wrong for anything that has side effects.\n@PostAuthorize("returnObject.customerId == authentication.name")\nOrder byId(String orderId) { ... }\n\n// 3. SCOPE THE QUERY. The row is never loaded unless it belongs to the\n//    caller, and "not yours" and "does not exist" become the same\n//    answer -- which closes the enumeration oracle at the same time.\nOrder byId(String orderId, String callerId) {\n    return repository.findByIdAndCustomerId(orderId, callerId)\n            .orElseThrow(() -> new OrderNotFound(orderId));   // 404\n}',
                    notes: '<p>Option 3 is the one to reach for, and the reason is not only performance. It makes the ownership rule part of the query, so it cannot be forgotten by a caller, and it collapses "forbidden" and "not found" into one response — which is the deliberate choice the authentication-foundations chapter described for resources whose existence is sensitive.</p>'
                },
                {
                    type: 'types',
                    title: 'When the rule is more complicated than an owner column',
                    items: [
                        { name: 'A membership table', html: '<p>Projects with several members, documents shared with a group. Join to it in the query; the rule stays in the database where the data is.</p>' },
                        { name: 'A hierarchy', html: '<p>A manager may see their reports\' orders. A recursive CTE, or a materialised path column — and either way, still in the query.</p>' },
                        { name: 'Spring Security ACLs', html: '<p>A general per-object permission store. Powerful, and it adds four tables and a significant amount of machinery. Reach for it only when permissions are genuinely per object and user-assignable at run time.</p>' },
                        { name: 'A delegated bean', html: '<p><code>@PreAuthorize("@orderAccess.canView(#id, authentication)")</code>. The right shape when the rule needs several lookups and cannot be expressed as one predicate.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>An identifier that arrived in the request is attacker-controlled, always.</strong> A path variable, a query parameter, a field in a JSON body, a hidden form field — every one of them can be changed. The only identifiers that are safe to trust are the ones taken from the validated token. Any code path that uses a request-supplied id to select a row without also constraining it by something from the token is an IDOR, and it will be found.</p>'
                }
            ],
            docs: [
                { title: 'OWASP API1:2023 Broken Object Level Authorization', url: 'https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-security', questionId: 'owasp-api-top-ten' }
            ]
        },

        {
            id: 'multi-tenancy-and-row-level-scoping',
            title: 'Multi-Tenancy',
            importance: 'must-know',
            summary: 'One missing tenant predicate leaks one customer\'s data to another. The defence has to be structural, because a rule applied by discipline will eventually be forgotten.',
            interviewAngle: 'The highest-severity bug a multi-tenant service can ship, and it is invisible in every test written against a single tenant. Naming a structural defence is the answer.',
            buildsOn: ['domain-object-security'],
            blocks: [
                {
                    type: 'table',
                    title: 'The isolation models, and what each costs',
                    headers: ['Model', 'Isolation', 'Cost'],
                    rows: [
                        ['A database per tenant', 'Strongest — separate connections, separate backups', 'Migrations times N; expensive at a thousand tenants'],
                        ['A schema per tenant', 'Strong', 'Migrations times N; connection routing per request'],
                        ['<strong>A tenant column, shared tables</strong>', '<strong>Only as good as every query</strong>', 'Cheapest to operate, and the one that leaks'],
                        ['Postgres row-level security', 'Enforced by the database itself', 'A session variable per connection, set correctly on a pooled connection']
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Making the predicate structural instead of remembered',
                    code: '// The tenant comes from the TOKEN. Never from a header, a parameter\n// or a body field -- all three are attacker-controlled.\nString tenant = ((Jwt) authentication.getPrincipal()).getClaimAsString("tenant");\n\n// Hibernate filter: declared on the entity, enabled once per request,\n// and then applied to EVERY query against that entity. A developer who\n// forgets the predicate still gets it.\n@Entity\n@FilterDef(name = "tenantFilter",\n           parameters = @ParamDef(name = "tenantId", type = String.class))\n@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")\nclass Order { ... }\n\n@Component\nclass TenantFilterInterceptor implements HandlerInterceptor {\n    public boolean preHandle(HttpServletRequest req, HttpServletResponse res,\n                             Object handler) {\n        entityManager.unwrap(Session.class)\n                .enableFilter("tenantFilter")\n                .setParameter("tenantId", currentTenant());\n        return true;\n    }\n}\n\n// Note what the filter does NOT cover: native queries, and criteria\n// built outside the session. Those still need the predicate by hand,\n// so the filter narrows the surface rather than eliminating it.',
                    notes: '<p>PostgreSQL row-level security is the stronger version of the same idea because the enforcement moves below the application: a policy on the table plus a session variable means even a hand-written native query is filtered. The operational catch is connection pooling — the session variable must be set at the start of every borrowed connection and cleared when it is returned, or a request inherits the previous tenant.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Every test written with one tenant\'s data passes on a query with no tenant predicate.</strong> That is why this class of bug reaches production: the code is correct for the data the tests contain. The fix is a test-data convention rather than a test — <strong>always seed two tenants</strong>, and assert on both counts and identifiers, so a missing predicate fails immediately. It costs a fixture and it catches the most expensive bug in the system.</p>'
                }
            ],
            docs: [
                { title: 'PostgreSQL 16 — Row Security Policies', url: 'https://www.postgresql.org/docs/16/ddl-rowsecurity.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'spring-security', questionId: 'owasp-api-top-ten' },
                { topicId: 'jpa-hibernate', questionId: 'derived-queries-and-their-limits' }
            ]
        },

        {
            id: 'testing-secured-methods',
            title: 'Testing It',
            importance: 'should-know',
            summary: 'Authorization is code, and untested code is code that works by coincidence. The test annotations make a principal available; the discipline is testing the denial as well as the permission.',
            interviewAngle: 'The point worth making is that a test asserting the allowed case passes whether or not the rule exists. Only the denied case tests the rule.',
            buildsOn: ['multi-tenancy-and-row-level-scoping'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The annotations, and the assertion that actually tests the rule',
                    code: '@SpringBootTest\nclass OrderServiceSecurityTest {\n\n    @Test\n    @WithMockUser(authorities = "ORDER_APPROVE")\n    void an_approver_may_approve() {\n        assertDoesNotThrow(() -> orderService.approve("ord_1"));\n    }\n\n    // THE TEST THAT MATTERS. Without it, the one above passes even if\n    // the @PreAuthorize is deleted.\n    @Test\n    @WithMockUser(authorities = "ORDER_READ")\n    void a_reader_may_not_approve() {\n        assertThrows(AccessDeniedException.class,\n                () -> orderService.approve("ord_1"));\n    }\n\n    @Test\n    @WithAnonymousUser\n    void an_anonymous_caller_may_not_approve() {\n        assertThrows(AccessDeniedException.class,\n                () -> orderService.approve("ord_1"));\n    }\n}\n\n// At the web layer, with a real JWT-shaped principal:\nmockMvc.perform(post("/api/orders/ord_1/approve")\n                .with(jwt().authorities(new SimpleGrantedAuthority("ORDER_READ"))))\n        .andExpect(status().isForbidden());\n\n// And the multi-tenant version, which needs two tenants to mean anything:\nmockMvc.perform(get("/api/orders/{id}", orderOwnedByTenantB)\n                .with(jwt().jwt(j -> j.claim("tenant", "tenant-a"))))\n        .andExpect(status().isNotFound());',
                    notes: '<p><code>@WithMockUser</code> installs an <code>Authentication</code> in the <code>SecurityContext</code> before the test method and clears it after — which is the discipline the <code>SecurityContextHolder</code> chapter warned about, handled for you. Hand-rolled test setup that sets the context and does not clear it leaves it installed for the next test on that thread, which produces a test that passes alone and fails in a suite.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Method security is applied by a proxy, so a unit test that constructs the service with <code>new</code> bypasses it entirely and every authorization test silently passes. These tests need the container — <code>@SpringBootTest</code>, or a slice that enables method security. It is the same proxy caveat as everywhere else in the deck, arriving in the one place where a false pass is a security hole rather than an inconvenience.</p>'
                }
            ],
            docs: [
                { title: 'Testing Method Security', url: 'https://docs.spring.io/spring-security/reference/servlet/test/method.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'testing', questionId: 'spring-test-slices' }
            ]
        }
    ]
};
