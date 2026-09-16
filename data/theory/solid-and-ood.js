/* ==========================================================================
   data/theory/solid-and-ood.js — module 7 in the reading path

   The craft track opens here, and it opens EARLY on purpose. Section 5.8 puts
   patterns and architecture near the front because everything after them is
   easier to read once the vocabulary exists: a chapter can say "this is the
   strategy pattern" instead of describing it again.

   Nine chapters. Five of them are the five letters, and the other four are
   the ones that decide whether a candidate sounds like they have used the
   principles or memorised them — what the principles are FOR, one real class
   worked through, the failure mode of applying them everywhere, and the pair
   of words (cohesion, coupling) that the five letters are all approximations
   of.
   ========================================================================== */

const solidAndOodModule = {
    id: 'solid-and-ood',
    trackId: 'craft',
    order: 7,
    title: 'SOLID and Object-Oriented Design',
    tagline: 'The vocabulary your LLD round is graded in.',
    estimatedMinutes: 40,
    prerequisites: ['inheritance-and-interfaces'],
    docHub: { title: 'Martin Fowler — Software Architecture Guide', url: 'https://martinfowler.com/architecture/' },

    chapters: [
        {
            id: 'what-ood-is-for',
            title: 'What Object-Oriented Design Is For',
            importance: 'must-know',
            summary: 'Not reuse, and not modelling the real world. The purpose is to localise change: to make it so that a change to one decision touches one place.',
            interviewAngle: 'Rarely asked directly and always audible. A candidate who says "so it is reusable" is quoting a textbook; one who says "so that changing the pricing rule does not mean editing the checkout controller" is describing something they have lived through.',
            buildsOn: [],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>The standard justifications for object orientation — reuse, modelling the real world, encapsulation — are all downstream of one thing, and it is worth naming the one thing directly because the rest follow from it.</p><p><strong>Software design is the art of deciding what will change, and arranging the code so each change is local.</strong> Every principle in this module is a specific tactic for that. Single responsibility is "one reason to change, one place to change it". Open-closed is "add rather than edit". Dependency inversion is "the thing that changes often should not be the thing everything else names".</p><p>Reuse is a side effect. A class that is well isolated from change happens also to be easy to lift into another program, but designing <em>for</em> reuse — before a second caller exists — reliably produces the wrong abstraction, because you are guessing which axis will vary and you have exactly one data point.</p>'
                },
                {
                    type: 'definition',
                    term: 'Design',
                    html: '<p>The set of decisions about a program that are expensive to change later. Choosing a variable name is not design; choosing whether pricing lives behind an interface is. The test is not how important the decision feels but how much code has to move if it turns out to be wrong.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>"Model the real world" is advice that produces bad models.</strong> A real-world <code>Employee</code> has a height, a birthday and an opinion about the coffee. A useful <code>Employee</code> class has whatever the payroll run needs and nothing else. The model is a model <em>of the problem the software solves</em>, not of the domain in general — and the commonest symptom of forgetting that is a class with forty fields, of which each caller uses three.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>In an LLD round, saying <em>why</em> before <em>what</em> is worth more than any pattern. <em>"I am putting the fare calculation behind an interface because that is the rule most likely to change — surge pricing, promotions, a different city — and I would rather add a class than edit this one."</em> That single sentence demonstrates open-closed, dependency inversion and an awareness of the change axis, without naming any of them.</p>'
                }
            ],
            docs: [
                { title: 'Martin Fowler — Software Architecture Guide', url: 'https://martinfowler.com/architecture/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'design-patterns', questionId: 'solid-principles' }
            ]
        },

        {
            id: 'single-responsibility',
            title: 'Single Responsibility',
            importance: 'must-know',
            summary: 'One reason to change, where a reason is a person or a role that asks for the change. Not "one method" and not "does one thing" — those readings produce a hundred one-line classes.',
            interviewAngle: 'Everybody can recite it and most people recite the wrong version. The distinguishing detail is that a "responsibility" is defined by who asks for the change, not by how much the class does.',
            buildsOn: ['what-ood-is-for'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>The usual paraphrase — "a class should do one thing" — is unfalsifiable, because "one thing" can be stated at any grain you like. <code>OrderService</code> does one thing: orders. It also does eleven things: validation, pricing, tax, persistence, email, audit.</p><p>The formulation that actually decides cases is <strong>"a class should have one reason to change", where a reason is a stakeholder</strong>. If the finance team asks for a change to the tax rule and the marketing team asks for a change to the confirmation email, and both changes edit the same class, that class has two responsibilities — regardless of how coherent it looks.</p>'
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Two reasons to change, in one class',
                    code: 'class OrderService {\n\n    Order place(Cart cart, Customer customer) {\n        // reason to change #1: FINANCE owns this\n        BigDecimal net  = cart.lines().stream()\n                .map(Line::total).reduce(ZERO, BigDecimal::add);\n        BigDecimal vat  = net.multiply(new BigDecimal("0.20"));\n\n        Order order = repository.save(new Order(customer, net.add(vat)));\n\n        // reason to change #2: MARKETING owns this\n        String body = "Hi " + customer.firstName() + ", thanks for your order! "\n                    + "Here is 10% off your next one: WELCOME10";\n        mailer.send(customer.email(), "Your order", body);\n\n        return order;\n    }\n}',
                    notes: '<p>Nothing here is badly written and the method is short. It still fails the principle, and the way you find out is not by reading it — it is by watching two different tickets from two different teams both land in this file, then merge-conflict.</p>'
                },
                {
                    type: 'types',
                    title: 'What to do about it, in increasing order of ceremony',
                    items: [
                        { name: 'Extract a method', html: '<p>Costs nothing, buys almost nothing. The two reasons to change still live in one file and still conflict.</p>' },
                        { name: 'Extract a class', html: '<p><code>PriceCalculator</code> and <code>OrderNotifier</code>. Now finance edits one file and marketing edits another. This is the answer most of the time.</p>' },
                        { name: 'Extract and invert', html: '<p>Make <code>OrderService</code> depend on a <code>Notifier</code> interface. Worth it when there is more than one implementation, or when the notification is genuinely optional to the use case.</p>' },
                        { name: 'Publish an event', html: '<p><code>ApplicationEventPublisher</code> and a listener. Now <code>OrderService</code> does not know notification exists at all. Buys the most decoupling and costs the most traceability — the flow no longer reads top to bottom.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Taken as "one method per class" this principle destroys a codebase.</strong> A hundred classes named <code>OrderPriceNetCalculator</code>, each with one method and one caller, is worse than the class above: the logic is now spread over a hundred files, and understanding an order requires opening all of them. Cohesion is a real cost. If two pieces of code always change together, splitting them apart is not applying the principle — it is violating it, in the other direction.</p>'
                }
            ],
            docs: [
                { title: 'The Single Responsibility Principle', url: 'https://blog.cleancoder.com/uncle-bob/2014/05/08/SingleReponsibilityPrinciple.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'design-patterns', questionId: 'solid-principles' }
            ]
        },

        {
            id: 'open-closed',
            title: 'Open for Extension, Closed for Modification',
            importance: 'must-know',
            summary: 'Adding a case should mean adding a class, not editing a switch. True only along the axis you predicted, which is why it is applied after the second case appears rather than before the first.',
            interviewAngle: 'The trap is applying it prophetically. The strong answer names the axis: "open-closed with respect to payment methods, deliberately not with respect to anything else".',
            buildsOn: ['single-responsibility'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'The same requirement, two shapes',
                    left: 'A switch that grows',
                    right: 'A strategy that is added to',
                    rows: [
                        { aspect: 'Adding a payment method', left: 'Edit <code>PaymentProcessor</code>, add a case, retest the whole class', right: 'Add a class, register it. Nothing existing is touched.' },
                        { aspect: 'Reading the whole flow', left: 'One file, top to bottom. <strong>Easier.</strong>', right: 'Follow an interface to an unknown number of implementations. <strong>Harder.</strong>' },
                        { aspect: 'Risk of the change', left: 'Every existing method is recompiled and re-deployed', left_note: '', right: 'Existing classes are untouched, so they cannot regress' },
                        { aspect: 'Cost when there is one case', left: 'None', right: 'An interface, a factory or a map, and indirection for no benefit' },
                        { aspect: 'Cost when there are nine', left: 'A 400-line class nobody wants to open', right: 'Nine small classes, each obvious' }
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The closed version, using the container as the registry',
                    code: 'interface PaymentMethod {\n    String code();                       // "card", "upi", "wallet"\n    Receipt charge(Money amount, Account from);\n}\n\n@Component\nclass CardPayment implements PaymentMethod { ... }\n\n@Component\nclass UpiPayment  implements PaymentMethod { ... }\n\n@Service\nclass PaymentProcessor {\n\n    private final Map<String, PaymentMethod> methods;\n\n    // Spring injects EVERY PaymentMethod bean. Adding a payment method is\n    // adding a @Component -- this class is never edited again.\n    PaymentProcessor(List<PaymentMethod> all) {\n        this.methods = all.stream()\n                .collect(toMap(PaymentMethod::code, identity()));\n    }\n\n    Receipt charge(String code, Money amount, Account from) {\n        PaymentMethod method = methods.get(code);\n        if (method == null) throw new UnsupportedPayment(code);\n        return method.charge(amount, from);\n    }\n}',
                    notes: '<p>Injecting a <code>List&lt;T&gt;</code> of every implementation is the Spring-idiomatic form of this principle, and it is worth knowing because it removes the one piece of the pattern that people usually get wrong — the registration step. There is no factory to remember to update, and no <code>switch</code> to add a case to.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Nothing is open-closed against every axis, and pretending otherwise is how you get a framework nobody asked for.</strong> The design above absorbs a new payment method for free. Ask it to absorb a payment that needs two-factor confirmation — a different <em>shape</em> of interaction, not a different implementation of the same shape — and every implementation has to change. That is not a failure of the design; it is a demonstration that the principle is <em>relative to a predicted axis of change</em>. Say which axis, and be honest that the others will cost you.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The practical rule most teams settle on is <strong>the rule of three</strong>: write the <code>if</code>, write the second <code>if</code>, and when the third case arrives you now know the axis is real — extract the interface then. Applied before the first case exists, this principle is indistinguishable from speculative generality.</p>'
                }
            ],
            docs: [
                { title: 'The Open Closed Principle', url: 'https://blog.cleancoder.com/uncle-bob/2014/05/12/TheOpenClosedPrinciple.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'design-patterns', questionId: 'open-closed-in-practice' },
                { topicId: 'design-patterns', questionId: 'strategy-pattern' }
            ]
        },

        {
            id: 'liskov-substitution',
            title: 'Liskov Substitution',
            importance: 'must-know',
            summary: 'A subtype must be usable everywhere its supertype is, without the caller knowing. Violations are almost never a compile error — they are a method that throws, or a precondition that got stricter.',
            interviewAngle: 'The letter people find hardest to give a real example of. Naming a violation from the JDK itself — Arrays.asList, or the immutable collections — is a much stronger answer than the square/rectangle textbook case.',
            buildsOn: ['open-closed'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>Stated properly: if <code>S</code> is a subtype of <code>T</code>, then a program written against <code>T</code> must not be able to tell that it was handed an <code>S</code>. The compiler enforces the <em>signature</em> half of this and nothing enforces the <em>behaviour</em> half, which is where every real violation lives.</p><p>Three concrete rules fall out, and they are worth memorising because they are how you spot a violation in code review:</p><ul><li><strong>Preconditions may not be strengthened.</strong> If the supertype accepts null, the subtype may not reject it.</li><li><strong>Postconditions may not be weakened.</strong> If the supertype promises a sorted result, the subtype must deliver one.</li><li><strong>Invariants must be preserved.</strong> If the supertype guarantees the size never decreases, the subtype may not shrink.</li></ul>'
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The JDK breaks it, on purpose, and documents it',
                    code: 'List<String> fixed = Arrays.asList("a", "b", "c");\nfixed.set(0, "z");     // fine -- writes through to the array\nfixed.add("d");        // UnsupportedOperationException\n\nList<String> immutable = List.of("a", "b", "c");\nimmutable.set(0, "z"); // UnsupportedOperationException\n\n// Both ARE Lists. Neither can be substituted for one, because\n// List.add() is specified to add and these do not.\nvoid appendAudit(List<String> log) {\n    log.add("checked at " + Instant.now());   // works or throws,\n}                                             // depending on the caller\n\n// The escape hatch the JDK provides instead of subtyping:\nList<String> safe = new ArrayList<>(List.of("a", "b", "c"));',
                    notes: '<p>The <code>UnsupportedOperationException</code> family is an admitted Liskov violation baked into the collections framework, and the JDK\'s own answer to it is <em>documentation</em> — the optional-operation convention. It is the cleanest available example, and quoting it beats the square/rectangle case because it is real code a candidate has actually been bitten by.</p>'
                },
                {
                    type: 'types',
                    title: 'The shapes a violation takes in a Spring codebase',
                    items: [
                        { name: 'A method that throws', html: '<p><code>ReadOnlyOrderRepository.save()</code> throwing <code>UnsupportedOperationException</code>. The type says it can save; it cannot. The fix is a narrower interface — see interface segregation.</p>' },
                        { name: 'A stricter precondition', html: '<p>Base accepts any positive amount; the subclass rejects anything over a limit. Every caller written against the base is now conditionally broken.</p>' },
                        { name: 'A different exception type', html: '<p>Base throws <code>NotFound</code>; the override throws a runtime exception the caller does not catch. The signature compiles and the <code>catch</code> block silently stops matching.</p>' },
                        { name: 'A silent no-op', html: '<p>The worst one, because nothing fails. <code>NoOpAuditLog.record()</code> returning normally without recording means the caller\'s postcondition — "this event is now durable" — is false and nobody finds out for a year.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>The reliable smell is <strong><code>instanceof</code> in the caller</strong>. If code that consumes the supertype has to ask which subtype it got before it knows what it can do, substitutability is already broken and the type is lying. That is a much better detector than trying to remember whether a square is a rectangle.</p>'
                }
            ],
            docs: [
                { title: 'Collection — the optional-operation convention', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Collection.html', kind: 'api' },
                { title: 'List.of — unmodifiable lists', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/List.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'design-patterns', questionId: 'liskov-violations-in-real-code' },
                { topicId: 'collections', questionId: 'immutable-collections' }
            ]
        },

        {
            id: 'interface-segregation',
            title: 'Interface Segregation',
            importance: 'should-know',
            summary: 'No client should be forced to depend on methods it does not use. The symptom is an implementation full of methods that throw, or a mock in a test that stubs eleven methods to exercise one.',
            interviewAngle: 'The least-quoted letter and the easiest to demonstrate with something the interviewer has seen: a test that has to stub a fat interface. That example lands better than any abstract description.',
            buildsOn: ['liskov-substitution'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>A fat interface couples every one of its clients to every one of its methods. Add a method for one caller and every implementation — including the three test doubles — has to be updated. Nothing about that is a compile-time problem you can argue away; it is friction, applied to everyone, for the benefit of one.</p><p>The Java-specific version of this shows up in test code first. If a unit test has to write eleven stubbed methods to exercise one path, the interface is too wide, and the test is telling you so before production does.</p>'
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Segregating by client, not by implementation',
                    code: '// Fat: every consumer sees everything.\ninterface UserService {\n    User find(long id);\n    User register(Registration r);\n    void resetPassword(long id);\n    void deactivate(long id);\n    Page<User> search(Query q, Pageable p);\n    byte[] exportGdprBundle(long id);\n}\n\n// Segregated: three interfaces named after the CLIENT that needs them.\ninterface UserLookup   { User find(long id); }\ninterface UserAdmin    { void deactivate(long id); Page<User> search(Query q, Pageable p); }\ninterface UserPrivacy  { byte[] exportGdprBundle(long id); }\n\n// One class may still implement all three. That is fine and common --\n// the point is what the CALLER declares, not how many files exist.\n@Service\nclass DefaultUserService implements UserLookup, UserAdmin, UserPrivacy { ... }\n\n@RestController\nclass OrderController {\n    OrderController(UserLookup users) { }   // cannot deactivate anybody\n}',
                    notes: '<p>The last line is the payoff and it is easy to miss: <code>OrderController</code> now <em>cannot</em> call <code>deactivate</code>, because it does not have a reference that offers it. Segregation is a capability boundary as much as an organisational one, and that is a genuinely useful property in a codebase several people work on.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>One interface per method is the failure mode here, and it looks like rigour.</strong> Interfaces are named after the client role that needs them — <code>UserLookup</code>, <code>UserAdmin</code> — not after each operation. If you cannot name the role, you have not found a boundary, you have found a method.</p>'
                }
            ],
            docs: [
                { title: 'Role Interface', url: 'https://martinfowler.com/bliki/RoleInterface.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'design-patterns', questionId: 'solid-principles' }
            ]
        },

        {
            id: 'dependency-inversion',
            title: 'Dependency Inversion',
            importance: 'must-know',
            summary: 'High-level policy should not depend on low-level detail; both depend on an abstraction. And the abstraction belongs to the policy, which is the half everybody drops.',
            interviewAngle: 'Asked constantly, usually confused with dependency injection. The two-sentence distinction — inversion is a direction, injection is a mechanism — is the single highest-value thing to have ready in this module.',
            buildsOn: ['interface-segregation'],
            blocks: [
                {
                    type: 'definition',
                    term: 'Dependency inversion',
                    html: '<p>A design rule about the <strong>direction</strong> of source-code dependencies: the module holding business policy defines the interface it needs, and the module holding the technical detail implements it. The arrow points from the detail towards the policy, which is the opposite of the runtime call direction — hence "inverted".</p>'
                },
                {
                    type: 'comparison',
                    title: 'Inversion against injection, the distinction interviews probe',
                    left: 'Dependency inversion',
                    right: 'Dependency injection',
                    rows: [
                        { aspect: 'What it is', left: 'A design principle about which module owns the interface', right: 'A technique for supplying a collaborator from outside' },
                        { aspect: 'What it changes', left: 'Where the interface lives, and therefore what depends on what', right: 'Where the <code>new</code> happens' },
                        { aspect: 'Needs a framework', left: 'No. It is a decision about packages.', right: 'No — a constructor parameter is injection. Spring just automates it.' },
                        { aspect: 'Can you have one without the other', left: 'Yes: define the port in the domain and wire it by hand', right: 'Yes, and it is extremely common — <code>@Autowired JdbcOrderRepository</code> is injection with no inversion at all' },
                        { aspect: 'The interview answer', left: '"Which way the arrow points"', right: '"Who calls the constructor"' }
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Injection without inversion, and then with it',
                    code: '// INJECTION, NO INVERSION. The domain names a JPA type, so the domain\n// package depends on the persistence package. Swapping the store means\n// editing the service.\npackage com.acme.billing;\n@Service\nclass InvoiceService {\n    InvoiceService(JpaInvoiceRepository repo) { }   // concrete\n}\n\n// INVERSION. The interface lives WITH THE POLICY and is named in the\n// policy is vocabulary. The adapter package depends on billing; billing\n// depends on nothing.\npackage com.acme.billing;\npublic interface Invoices {                         // the port\n    Optional<Invoice> byNumber(InvoiceNumber n);\n    void store(Invoice invoice);\n}\n\n@Service\nclass InvoiceService {\n    InvoiceService(Invoices invoices) { }\n}\n\npackage com.acme.billing.jpa;                       // the adapter\n@Repository\nclass JpaInvoices implements Invoices { ... }',
                    notes: '<p>The tell is the package declaration, not the constructor. Both versions are injected; only the second one has an arrow that points inward. If <code>Invoices</code> had been declared in <code>com.acme.billing.jpa</code> alongside its implementation, nothing would have been inverted — the domain would still be reaching into the persistence package to find its own interface.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>An interface with exactly one implementation, named <code>FooServiceImpl</code>, has inverted nothing.</strong> It is a second file that must be edited in lockstep with the first, and every IDE "go to definition" now takes two hops. Inversion earns its keep when the interface is expressed in the <em>caller\'s</em> vocabulary and the implementation is genuinely swappable or genuinely on the other side of a boundary — a database, a queue, a third-party API. <code>UserServiceImpl</code> is none of those things.</p>'
                }
            ],
            docs: [
                { title: 'Inversion of Control Containers and the Dependency Injection Pattern', url: 'https://martinfowler.com/articles/injection.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'design-patterns', questionId: 'dependency-inversion-versus-injection' },
                { topicId: 'spring-core', questionId: 'what-inversion-of-control-buys' }
            ]
        },

        {
            id: 'solid-applied-to-a-real-class',
            title: 'One Class, Worked Through',
            importance: 'should-know',
            summary: 'A 90-line notification sender, read against all five letters, changed where the change pays and left alone where it does not.',
            interviewAngle: 'This is what a review round actually asks: here is some code, what would you change. The grade comes as much from what you decline to change as from what you fix.',
            buildsOn: ['dependency-inversion'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The starting point',
                    code: '@Service\nclass NotificationSender {\n\n    private final JavaMailSender mail;\n    private final TwilioClient   twilio;\n    private final UserRepository users;\n\n    void notify(long userId, String type, Map<String, Object> data) {\n        User u = users.findById(userId).orElseThrow();\n\n        String text;\n        if (type.equals("ORDER_PLACED")) {\n            text = "Order " + data.get("orderId") + " placed";\n        } else if (type.equals("ORDER_SHIPPED")) {\n            text = "Order " + data.get("orderId") + " shipped on "\n                 + LocalDate.now();\n        } else if (type.equals("PASSWORD_RESET")) {\n            text = "Your reset code is " + data.get("code");\n        } else {\n            throw new IllegalArgumentException(type);\n        }\n\n        if (u.prefersSms()) {\n            twilio.send(u.phone(), text);\n        } else {\n            SimpleMailMessage m = new SimpleMailMessage();\n            m.setTo(u.email());\n            m.setText(text);\n            mail.send(m);\n        }\n    }\n}'
                },
                {
                    type: 'types',
                    title: 'What each letter says about it',
                    items: [
                        { name: 'SRP — two reasons to change', html: '<p>Message <em>wording</em> changes when product asks; message <em>delivery</em> changes when the SMS vendor is replaced. Split: a <code>MessageTemplate</code> per type, and a <code>Channel</code> for delivery.</p>' },
                        { name: 'OCP — the if-chain is the axis', html: '<p>A fourth notification type edits this method. The types are the predicted axis, and there are already three, so the rule of three is satisfied — extract.</p>' },
                        { name: 'DIP — two vendors are named in the domain', html: '<p><code>JavaMailSender</code> and <code>TwilioClient</code> are infrastructure types sitting in a service. Define <code>Channel</code> here; let <code>SmtpChannel</code> and <code>SmsChannel</code> implement it in an adapter package.</p>' },
                        { name: 'LSP — nothing to fix', html: '<p>No inheritance, no violation. Worth saying out loud in a review rather than inventing a hierarchy so the letter has something to apply to.</p>' },
                        { name: 'ISP — leave it', html: '<p><code>UserRepository</code> is wide, but this class is one of many callers and narrowing it here buys nothing. <strong>Not every observation deserves a change.</strong></p>' }
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Where it lands',
                    code: 'interface MessageTemplate {\n    NotificationType type();\n    String render(User user, Map<String, Object> data);\n}\n\ninterface Channel {\n    boolean supports(User user);\n    void deliver(User user, String text);\n}\n\n@Service\nclass NotificationSender {\n\n    private final Map<NotificationType, MessageTemplate> templates;\n    private final List<Channel> channels;\n    private final UserRepository users;\n\n    void notify(long userId, NotificationType type, Map<String, Object> data) {\n        User u = users.findById(userId).orElseThrow();\n\n        MessageTemplate template = templates.get(type);\n        if (template == null) throw new UnknownNotification(type);\n\n        channels.stream()\n                .filter(c -> c.supports(u))\n                .findFirst()\n                .orElseThrow(() -> new NoChannelFor(u))\n                .deliver(u, template.render(u, data));\n    }\n}',
                    notes: '<p><code>String type</code> became a <code>NotificationType</code> enum on the way through, which was not any of the five letters — it was simply the largest available improvement, and it is worth noticing that the principles did not suggest it. They are a checklist for one kind of problem, not a complete theory of good code.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>In a review round, deliver the verdict in this order: <em>what would break first</em>, <em>what I would change now</em>, <em>what I would leave</em>. Leading with "I would leave the repository alone, it is wide but this is not the place to fix it" reads as judgement. Leading with a list of five violations reads as a checklist being executed.</p>'
                }
            ],
            docs: [
                { title: 'Replace Conditional with Polymorphism', url: 'https://refactoring.com/catalog/replaceConditionalWithPolymorphism.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'design-patterns', questionId: 'strategy-pattern' },
                { topicId: 'behavioural-project', questionId: 'explaining-your-architecture' }
            ]
        },

        {
            id: 'when-solid-becomes-cargo-cult',
            title: 'When SOLID Becomes Cargo Cult',
            importance: 'should-know',
            summary: 'Every principle has a cost, and applied to a codebase that does not need it, the cost is all you get. Being able to say where you would not apply them is a senior signal.',
            interviewAngle: 'A differentiator. Most candidates argue for the principles; a smaller number can argue against them in a specific case, which is what actually demonstrates understanding rather than recall.',
            buildsOn: ['solid-applied-to-a-real-class'],
            blocks: [
                {
                    type: 'table',
                    title: 'The cost side of each letter',
                    headers: ['Principle', 'What it costs', 'When the cost exceeds the benefit'],
                    rows: [
                        ['SRP', 'More files; a flow spread across them', 'A CRUD endpoint whose "logic" is a field mapping. One class is correct.'],
                        ['OCP', 'Indirection; the concrete path is no longer readable', 'One implementation, and no second one on any roadmap'],
                        ['LSP', 'Nothing — it has no cost', '<strong>Never.</strong> This is the one letter with no downside; a violation is always a defect.'],
                        ['ISP', 'More interfaces to name, navigate and keep coherent', 'One client. There is no segregation to do.'],
                        ['DIP', 'A port and an adapter where a class would do', 'Infrastructure you will never swap — a logging call, a UUID generator, the clock in code with no time-dependent test']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>The commonest real-world damage is a five-layer path for a two-field read.</strong> Controller to service to port to adapter to repository, with a DTO and a mapper at each hop, to return a name and an email. Every layer was defensible in isolation and the total is a change that takes an afternoon instead of ten minutes. When somebody says "clean architecture is over-engineering", this is almost always the specific thing they have been hurt by — and they are not wrong about that codebase.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>A defensible position to state in an interview: <em>"I apply LSP always, because a violation is a bug. I apply SRP and DIP at the boundaries of the system — anything crossing to a database, a queue or a third party. Inside a module I let code be direct until a second case shows up, because indirection I added speculatively is indirection I guessed the shape of."</em> That is a policy, and it can be defended under follow-up questions in a way that "I follow SOLID" cannot.</p>'
                }
            ],
            docs: [
                { title: 'Yagni', url: 'https://martinfowler.com/bliki/Yagni.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'design-patterns', questionId: 'when-a-pattern-is-overkill' },
                { topicId: 'architecture-ddd', questionId: 'when-clean-architecture-is-overkill' }
            ]
        },

        {
            id: 'cohesion-and-coupling',
            title: 'Cohesion and Coupling',
            importance: 'should-know',
            summary: 'The two properties the five letters are all approximations of. Things that change together belong together; things that do not should not be able to see each other.',
            interviewAngle: 'The vocabulary that lets you discuss a design without reciting acronyms. "This has low cohesion" is a more precise criticism than "this violates SRP" and is understood by people who have never read the acronym.',
            buildsOn: ['when-solid-becomes-cargo-cult'],
            blocks: [
                {
                    type: 'definition',
                    term: 'Cohesion',
                    html: '<p>How strongly the parts inside one module belong together. High cohesion means everything in the class serves the same purpose and tends to change for the same reason. The low-cohesion smell is a class where half the fields are unused by half the methods.</p>'
                },
                {
                    type: 'definition',
                    term: 'Coupling',
                    html: '<p>How much one module must know about another to work. It is not the number of dependencies but the amount of <em>detail</em> in each: depending on an interface with three methods is looser than depending on a class with thirty, even though both are one dependency.</p>'
                },
                {
                    type: 'types',
                    title: 'Coupling, from loosest to tightest',
                    items: [
                        { name: 'Message coupling', html: '<p>Communicating through an event or a message with no shared type. Loosest, and the reason event-driven designs decouple so effectively — and also why they are hard to trace.</p>' },
                        { name: 'Data coupling', html: '<p>Passing exactly the parameters needed. The healthy default.</p>' },
                        { name: 'Stamp coupling', html: '<p>Passing a whole object when the callee needs two fields. Very common, mostly harmless, occasionally the reason a module cannot be extracted.</p>' },
                        { name: 'Control coupling', html: '<p>Passing a flag that tells the callee which branch to take — <code>process(order, true)</code>. The caller now knows the callee\'s internal structure. Usually two methods pretending to be one.</p>' },
                        { name: 'Common coupling', html: '<p>Shared mutable global state. A static registry, a mutable singleton. Every user is coupled to every other user, invisibly.</p>' },
                        { name: 'Content coupling', html: '<p>Reaching into another module\'s internals — reflection onto a private field, or depending on a class from someone else\'s <code>internal</code> package. Tightest and most brittle.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>The one-sentence version worth carrying out of this module: <strong>put things that change together in the same place, and make sure things that do not change together cannot see each other.</strong> Every letter above is a special case of it, and unlike the letters it also tells you how to lay out packages, how to draw service boundaries and where to put a module wall — which is exactly what the rest of the craft track is about.</p>'
                }
            ],
            docs: [
                { title: 'Beck Design Rules', url: 'https://martinfowler.com/bliki/BeckDesignRules.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'architecture-ddd', questionId: 'package-by-layer-or-feature' },
                { topicId: 'microservices', questionId: 'when-to-split-a-monolith' }
            ]
        }
    ]
};
