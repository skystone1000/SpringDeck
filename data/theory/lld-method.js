/* ==========================================================================
   data/theory/lld-method.js — module 9 in the reading path

   Spec to classes in twenty minutes, repeatably. This module is a PROCEDURE
   rather than a body of knowledge, and it is deliberately the last of the
   three early craft modules: the vocabulary from 7 and 8 exists so that a
   step here can say "extract a strategy" in three words.

   Eight chapters. Six are steps of the method, in the order they are
   performed. The seventh is the one nobody prepares and everybody needs —
   what to abandon when the clock beats you — and the eighth runs the whole
   method end to end on the parking lot, which is the most-asked prompt in
   the format and therefore the honest place to demonstrate it.

   Section 6.1 catalogues eight tier-1 machine-coding drills. This module is
   what a reader should have read before attempting one.
   ========================================================================== */

const lldMethodModule = {
    id: 'lld-method',
    trackId: 'craft',
    order: 9,
    title: 'The LLD Method',
    tagline: 'Spec to classes in twenty minutes, repeatably.',
    estimatedMinutes: 40,
    prerequisites: ['patterns-that-get-asked'],
    docHub: { title: 'Refactoring Guru — Design Patterns', url: 'https://refactoring.guru/design-patterns' },

    chapters: [
        {
            id: 'clarify-before-you-design',
            title: 'Five Minutes of Questions',
            importance: 'must-know',
            summary: 'The prompt is deliberately underspecified. Asking what is in scope, what the scale is and what must be concurrent is not stalling — it is the first graded step.',
            interviewAngle: 'Candidates who start typing immediately lose marks they never see deducted. The interviewer is watching for whether you establish constraints before committing to a model.',
            buildsOn: [],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>"Design a parking lot" is four words describing a system that could take a week. The vagueness is the exercise: the interviewer wants to see you convert an ambiguous prompt into a bounded problem, because that is the part of the job that a whiteboard can test.</p><p>Budget <strong>four to six minutes</strong>. Longer and you are stalling; shorter and you will design the wrong thing. Write the answers down where the interviewer can see them, because a constraint you agreed and then violated is worse than one you never asked about.</p>'
                },
                {
                    type: 'types',
                    title: 'The five questions that change the design',
                    items: [
                        { name: 'What is explicitly out of scope?', html: '<p>Payment gateway integration, authentication, persistence, a UI. Get these excluded out loud. This is the single highest-value question, because it is the one that buys back time.</p>' },
                        { name: 'One process or many?', html: '<p>An in-memory design and a distributed one are different exercises. "In-memory, single JVM, thread-safe" is a normal and acceptable answer — but it should be <em>stated</em>, not assumed.</p>' },
                        { name: 'Where is the contention?', html: '<p>Usually exactly one operation: allocating a slot, reserving a seat, taking the last item. Naming it now means the concurrency question later has an answer ready.</p>' },
                        { name: 'What varies, and along which axis?', html: '<p>Vehicle types, pricing rules, floor layouts. Each answer either justifies an interface or rules one out, and you want that decided before you draw.</p>' },
                        { name: 'What does "done" look like?', html: '<p>A runnable <code>main</code>? A test? An interface listing? Ask, because building the wrong artefact is a whole-round failure.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>Close the clarification phase explicitly: <em>"So: in-memory, single process, thread-safe on slot allocation, three vehicle types, pricing pluggable, no persistence and no payment. I will build entities and services with a small driver in <code>main</code>. Anything I have got wrong?"</em> That one sentence gives the interviewer a chance to correct you while a correction is still free, and it is the last moment at which it is.</p>'
                }
            ],
            docs: [
                { title: 'Yagni', url: 'https://martinfowler.com/bliki/Yagni.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'behavioural-project', questionId: 'questions-to-ask-the-interviewer' }
            ]
        },

        {
            id: 'finding-the-entities',
            title: 'Finding the Entities',
            importance: 'must-know',
            summary: 'The nouns in the requirements are candidates, not answers. Keep the ones with identity and state; demote the rest to value objects, enums or nothing at all.',
            interviewAngle: 'The noun-extraction heuristic is well known and produces a class per noun, which is wrong. The judgement being tested is which nouns survive the filter.',
            buildsOn: ['clarify-before-you-design'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>List the nouns, then apply three filters in order. What is left is your class list, and it is usually about half of what you started with.</p><ol><li><strong>Does it have identity?</strong> Two of them with the same field values are still different things — a <code>Ticket</code>, a <code>ParkingSpot</code>. That is an entity.</li><li><strong>Is it defined entirely by its value?</strong> <code>Money</code>, <code>RegistrationNumber</code>, <code>TimeRange</code>. Value object: immutable, a record, equal by fields.</li><li><strong>Is it a fixed, closed set?</strong> <code>VehicleType</code>, <code>SpotSize</code>, <code>TicketStatus</code>. That is an enum, and making it one buys exhaustive switches for free.</li></ol><p>Anything that survives none of the three was a description, not a thing.</p>'
                },
                {
                    type: 'table',
                    title: 'The parking-lot nouns, filtered',
                    headers: ['Noun', 'Verdict', 'Why'],
                    rows: [
                        ['Vehicle', 'Entity', 'Identified by registration; the same registration is the same vehicle'],
                        ['ParkingSpot', 'Entity', 'Spot 3B is not spot 3C even if both are empty and medium'],
                        ['Ticket', 'Entity', 'Has a lifecycle: issued, then paid, then closed'],
                        ['VehicleType', 'Enum', 'Closed set. Motorcycle, car, van.'],
                        ['Money / Fee', 'Value object', 'Two amounts of ₹40 are interchangeable'],
                        ['Duration', 'Value object', 'Use <code>java.time.Duration</code>; do not write your own'],
                        ['Floor', 'Entity, maybe', 'Only if floors have behaviour. If it is just a number on a spot, drop it.'],
                        ['EntryGate', '<strong>Drop it</strong>', 'It has no state the design needs. It is where a request comes from, not a thing.'],
                        ['ParkingLot', 'Entity, and the aggregate root', 'Owns the spots and is where the allocation invariant lives']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A class per noun produces <code>EntryGate</code>, <code>ExitGate</code>, <code>DisplayBoard</code> and <code>Attendant</code>, none of which do anything.</strong> They cost minutes to draw and appear in the design as empty boxes, which reads as padding. If you cannot name one field and one method a class needs, it is not a class yet — and saying "I am deliberately not modelling gates, they carry no state I need" is a stronger move than drawing them.</p>'
                }
            ],
            docs: [
                { title: 'Value Object', url: 'https://martinfowler.com/bliki/ValueObject.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'architecture-ddd', questionId: 'entity-versus-value-object' }
            ]
        },

        {
            id: 'responsibilities-and-interfaces',
            title: 'Assigning Responsibilities',
            importance: 'must-know',
            summary: 'Behaviour goes with the data it needs. Then, and only then, an interface goes wherever the clarification phase said something varies.',
            interviewAngle: 'The two failure modes are opposite and both common: entities that are pure data with all logic in a service, and a service class for every entity whether or not it needed one.',
            buildsOn: ['finding-the-entities'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>For each behaviour the requirements ask for, ask which object already holds the data it needs. That object gets the method. <code>Ticket.isExpired(Instant now)</code> belongs on the ticket because the ticket has the issue time; putting it on a <code>TicketService</code> means passing the ticket in and reaching into it, which is the anaemic-domain shape.</p><p>What genuinely belongs in a service is behaviour that <em>spans</em> entities or touches the outside world: allocating a spot needs the whole lot, and charging a fee needs a pricing rule that is not the ticket\'s business.</p>'
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Behaviour where the data is, and an interface where variation was declared',
                    code: '// Entity: knows its own rules.\nfinal class Ticket {\n    private final String id;\n    private final RegistrationNumber vehicle;\n    private final SpotId spot;\n    private final Instant issuedAt;\n    private Instant paidAt;\n\n    Duration parkedFor(Instant now) { return Duration.between(issuedAt, now); }\n    boolean  isPaid()               { return paidAt != null; }\n\n    void markPaid(Instant when) {\n        if (paidAt != null) throw new AlreadyPaid(id);   // the invariant\n        this.paidAt = when;\n    }\n}\n\n// The ONE interface the clarification phase justified: "pricing varies".\ninterface PricingRule {\n    Money fee(VehicleType type, Duration parked);\n}\n\n// Service: spans entities, holds no state of its own.\nfinal class ParkingService {\n    private final ParkingLot lot;\n    private final PricingRule pricing;\n    private final Clock clock;\n\n    Money checkOut(String ticketId) {\n        Ticket t = lot.ticket(ticketId);\n        Money fee = pricing.fee(t.vehicleType(), t.parkedFor(clock.instant()));\n        t.markPaid(clock.instant());\n        lot.release(t.spot());\n        return fee;\n    }\n}',
                    notes: '<p><code>markPaid</code> throwing on a second call is small and it is the thing that distinguishes an entity from a struct: the object protects its own invariant, so no caller can violate it by forgetting a check. Every such rule you push into the entity is a rule that cannot be forgotten at one of five call sites.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>One interface per class is the most reliable way to look junior in this round.</strong> <code>IVehicle</code>, <code>ITicket</code>, <code>IParkingSpot</code> — none of those things vary, none has a second implementation, and each costs a file. Interfaces go exactly where the clarification phase identified an axis of change. If you added one you cannot point back at a question for, take it out.</p>'
                }
            ],
            docs: [
                { title: 'AnemicDomainModel', url: 'https://martinfowler.com/bliki/AnemicDomainModel.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'architecture-ddd', questionId: 'anaemic-domain-model' },
                { topicId: 'design-patterns', questionId: 'strategy-pattern' }
            ]
        },

        {
            id: 'modelling-state-machines',
            title: 'Anything With a Lifecycle Is a State Machine',
            importance: 'should-know',
            summary: 'An order, a ticket, a booking, a payment — each has a set of states and a set of legal transitions. Writing the transitions down turns a class of bugs into a compile-time or startup-time question.',
            interviewAngle: 'Drawing the state diagram unprompted is a strong move, because the interviewer usually has an illegal-transition question queued and you have answered it in advance.',
            buildsOn: ['responsibilities-and-interfaces'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Transitions declared by the enum, not scattered across services',
                    code: 'enum BookingState {\n    HELD, CONFIRMED, CANCELLED, EXPIRED;\n\n    private static final Map<BookingState, Set<BookingState>> LEGAL = Map.of(\n            HELD,      EnumSet.of(CONFIRMED, CANCELLED, EXPIRED),\n            CONFIRMED, EnumSet.of(CANCELLED),\n            CANCELLED, EnumSet.noneOf(BookingState.class),   // terminal\n            EXPIRED,   EnumSet.noneOf(BookingState.class));\n\n    boolean canMoveTo(BookingState next) { return LEGAL.get(this).contains(next); }\n}\n\nfinal class Booking {\n    private BookingState state = HELD;\n\n    void transitionTo(BookingState next) {\n        if (!state.canMoveTo(next)) {\n            throw new IllegalTransition(state, next);\n        }\n        this.state = next;\n    }\n}',
                    notes: '<p>The value is not the <code>EnumMap</code> — it is that there is now exactly one place that answers "can this move to that". Without it, the rule lives as an <code>if</code> in the confirm path, another in the cancel path, and a third that somebody forgot in the expiry job, which is where the bug is.</p>'
                },
                {
                    type: 'diagram',
                    diagramType: 'flowchart',
                    title: 'A booking, as the interviewer expects to see it drawn',
                    diagramConfig: {
                        nodes: [
                            { id: 'held',      label: 'HELD',      kind: 'start' },
                            { id: 'confirmed', label: 'CONFIRMED', kind: 'process' },
                            { id: 'cancelled', label: 'CANCELLED', kind: 'end' },
                            { id: 'expired',   label: 'EXPIRED',   kind: 'end' }
                        ],
                        edges: [
                            { from: 'held',      to: 'confirmed', label: 'pay' },
                            { from: 'held',      to: 'cancelled', label: 'user cancels' },
                            { from: 'held',      to: 'expired',   label: 'hold times out' },
                            { from: 'confirmed', to: 'cancelled', label: 'refund' }
                        ]
                    }
                },
                {
                    type: 'tip',
                    html: '<p>Three questions the diagram answers before they are asked: <strong>which states are terminal</strong>, <strong>which transition is driven by a clock rather than a user</strong>, and <strong>what happens if the same transition is requested twice</strong>. The last one is idempotency arriving early — a second <code>confirm</code> on a confirmed booking should be a no-op returning the same result, not an exception, and saying so is a distributed-systems instinct showing up in an LLD round.</p>'
                }
            ],
            docs: [
                { title: 'EnumMap', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/EnumMap.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'collections', questionId: 'enummap-and-enumset' }
            ]
        },

        {
            id: 'where-the-concurrency-is',
            title: 'Where the Concurrency Actually Is',
            importance: 'must-know',
            summary: 'In nearly every one of these prompts there is exactly one contended operation. Find it, protect it precisely, and say why the rest needs nothing.',
            interviewAngle: 'The most reliable follow-up in the format is "what happens if two cars arrive at once". Having identified the one contended operation in the clarification phase means answering in a sentence.',
            buildsOn: ['modelling-state-machines'],
            blocks: [
                {
                    type: 'table',
                    title: 'The one contended operation, by prompt',
                    headers: ['Prompt', 'The contended operation', 'Everything else'],
                    rows: [
                        ['Parking lot', 'Allocating a free spot', 'Reads of a ticket, fee calculation — no contention'],
                        ['Movie booking', 'Reserving specific seats', 'Browsing shows, listing seats'],
                        ['Inventory reservation', 'Decrementing available stock', 'Catalogue reads'],
                        ['URL shortener', 'Claiming a short code', 'Resolving a code — read-only and cacheable'],
                        ['Ride matching', 'Assigning a driver to a request', 'Location updates, which are last-write-wins'],
                        ['LRU cache', 'Every operation, because reads mutate recency', '<strong>The exception</strong> — say so; it is why it is a good question']
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Protecting the one operation, three ways, cheapest first',
                    code: '// 1. A concurrent collection and an atomic operation. No lock you wrote,\n//    no lock you can hold too long. Prefer this when it fits.\nprivate final Map<SpotId, String> occupied = new ConcurrentHashMap<>();\n\nOptional<SpotId> allocate(VehicleType type) {\n    for (SpotId id : freeSpotsFor(type)) {\n        if (occupied.putIfAbsent(id, ticketId) == null) return Optional.of(id);\n    }\n    return Optional.empty();\n}\n\n// 2. A lock scoped as narrowly as the invariant allows -- per floor,\n//    not per lot, so two floors do not serialise against each other.\nprivate final Map<FloorId, Lock> floorLocks = ...;\n\n// 3. Optimistic: try, detect the collision, retry. Right when contention\n//    is rare and the retry is cheap.\nwhile (true) {\n    int free = available.get();\n    if (free == 0) return false;\n    if (available.compareAndSet(free, free - 1)) return true;\n}',
                    notes: '<p>Reaching straight for <code>synchronized</code> on the whole service is the answer that costs marks — it is correct and it serialises the entire lot, which the interviewer will point out. Starting from "is there an atomic operation that already does this" is the instinct being looked for, and <code>putIfAbsent</code> usually is that operation.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Say the invariant, not the mechanism. <em>"The invariant is that a spot is assigned to at most one vehicle. That is a single map entry, so <code>putIfAbsent</code> gives it to me atomically without a lock. Nothing else in the design has a shared write, so nothing else needs protecting."</em> That is a complete answer to the concurrency follow-up and it takes fifteen seconds.</p>'
                }
            ],
            docs: [
                { title: 'ConcurrentHashMap', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/ConcurrentHashMap.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'collections', questionId: 'atomic-compound-operations' },
                { topicId: 'concurrency', questionId: 'race-condition-vs-visibility' }
            ]
        },

        {
            id: 'designing-for-the-clock',
            title: 'Designing Inside Twenty Minutes',
            importance: 'should-know',
            summary: 'Depth first on one path, breadth as a listing. A design where check-in runs end to end and check-out is a signature beats one where everything is half-drawn.',
            interviewAngle: 'How you allocate the time is itself observed. Announcing the plan — "I will build check-in fully, then stub the rest" — converts a partial design from a shortfall into a decision.',
            buildsOn: ['where-the-concurrency-is'],
            blocks: [
                {
                    type: 'table',
                    title: 'A workable split of ninety minutes',
                    headers: ['Minutes', 'What', 'What "done" means'],
                    rows: [
                        ['0–6', 'Clarify', 'Scope agreed out loud, contention named'],
                        ['6–15', 'Entities, enums, value objects', 'Fields only. No methods yet.'],
                        ['15–25', 'The interfaces the clarification justified', 'Signatures, no implementations'],
                        ['25–60', '<strong>One flow, end to end</strong>', 'It compiles and it runs'],
                        ['60–75', 'The second flow', 'Reusing what exists — this is where the design proves itself'],
                        ['75–85', 'A driver in <code>main</code>, or two tests', 'The interviewer <em>sees it work</em>'],
                        ['85–90', 'Say what you would do next', 'Persistence, the missing flows, the extension you designed for']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Leaving no time to run it is the most expensive mistake in the format</strong>, and it is a scheduling failure rather than a design one. A design that has never executed has an unknown number of defects in it; one that prints a ticket and a fee has been demonstrated. Section 6.1 lists "no test or driver — the interviewer cannot see it work" among the five things every tier-1 drill is graded against, and it is there because it is the one candidates sacrifice first.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Announce the plan at minute fifteen. <em>"I am going to build check-in completely — allocation, ticket, the concurrency — and leave check-out and pricing as interfaces with one implementation each. That way you can see something run, and I will talk through the rest."</em> Delivered up front, that is time management. Delivered at minute eighty-five, it is an excuse.</p>'
                }
            ],
            docs: [
                { title: 'Yagni', url: 'https://martinfowler.com/bliki/Yagni.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'behavioural-project', questionId: 'estimating-and-missing' }
            ]
        },

        {
            id: 'what-to-cut-when-time-runs-out',
            title: 'What to Cut',
            importance: 'should-know',
            summary: 'There is an order. Persistence goes first, then validation, then the second implementation of anything. The domain model and the one working flow are the last things to go.',
            interviewAngle: 'Cutting deliberately and saying so reads as engineering judgement. Cutting silently reads as not having got there.',
            buildsOn: ['designing-for-the-clock'],
            blocks: [
                {
                    type: 'types',
                    title: 'The cut list, in order',
                    items: [
                        { name: '1. Persistence', html: '<p>A <code>Map</code> behind a repository interface. Say "in-memory for now, this interface is where JPA would go" and move on. Almost never what is being tested.</p>' },
                        { name: '2. Exhaustive validation', html: '<p>Validate what the demo path touches. One <code>Objects.requireNonNull</code> shows you know; twenty argument checks show you spent the time on argument checks.</p>' },
                        { name: '3. The second implementation', html: '<p>Define <code>PricingRule</code>, implement <code>FlatRate</code>, describe <code>Surge</code> in a sentence. The interface is the design; the second class is repetition.</p>' },
                        { name: '4. Secondary flows', html: '<p>Cancellation, refunds, admin. Signature and a one-line comment.</p>' },
                        { name: '5. The concurrency', html: '<p><strong>Cut it last, and never silently.</strong> "Single-threaded for now — the contended point is <code>allocate</code>, and I would make that a <code>putIfAbsent</code> on a <code>ConcurrentHashMap</code>" scores nearly as well as writing it, and takes ten seconds.</p>' },
                        { name: 'Never cut', html: '<p>The domain model, the one flow that runs, and the driver that shows it running. Those three are the deliverable.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>Every cut is spoken. <em>"I am putting this behind a repository interface and backing it with a map — persistence is not what we are exploring."</em> The interviewer is assessing judgement, and a cut they heard you make is evidence of judgement, while the same cut in silence is indistinguishable from an omission.</p>'
                }
            ],
            docs: [
                { title: 'Yagni', url: 'https://martinfowler.com/bliki/Yagni.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'behavioural-project', questionId: 'a-tradeoff-you-made' }
            ]
        },

        {
            id: 'a-worked-example-parking-lot',
            title: 'The Method, End to End: Parking Lot',
            importance: 'must-know',
            summary: 'The most-asked prompt in the format, run through all six steps, with the class list that results and the two follow-ups it is designed to absorb.',
            interviewAngle: 'Having done this once, on paper, is worth more than reading about it three times. The class list below is defensible and small, and small is the harder half.',
            buildsOn: ['what-to-cut-when-time-runs-out'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p><strong>Step 1, clarify.</strong> In-memory, single process. Three vehicle types, three spot sizes. A motorcycle may take a car spot if none of its own is free; a car may never take a motorcycle spot. Pricing varies and is hourly, rounded up. Contention is on allocation only. No payment gateway, no persistence, no UI.</p><p><strong>Step 2, entities.</strong> Nine nouns became six types. <code>EntryGate</code>, <code>DisplayBoard</code> and <code>Attendant</code> were dropped for having no state the design needs.</p><p><strong>Step 3, responsibilities.</strong> <code>Ticket</code> knows its own duration and payment invariant. <code>ParkingLot</code> owns the spots and the allocation invariant. One interface — <code>PricingRule</code> — because step 1 said pricing varies. No others.</p>'
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The whole design, as it would be listed at minute twenty-five',
                    code: 'enum VehicleType { MOTORCYCLE, CAR, VAN }\nenum SpotSize    { SMALL, MEDIUM, LARGE;\n    // The step-1 rule, in one place: which sizes a type may occupy,\n    // in preference order.\n    static List<SpotSize> fitting(VehicleType t) { ... }\n}\n\nrecord RegistrationNumber(String value) { }\nrecord SpotId(int floor, int number)    { }\nrecord Money(BigDecimal amount, Currency currency) { }\n\nfinal class ParkingSpot { SpotId id(); SpotSize size(); }\n\nfinal class Ticket {\n    String id(); RegistrationNumber vehicle(); SpotId spot();\n    Instant issuedAt(); Duration parkedFor(Instant now);\n    boolean isPaid(); void markPaid(Instant when);\n}\n\ninterface PricingRule { Money fee(VehicleType type, Duration parked); }\nfinal class HourlyRate implements PricingRule { }\n\nfinal class ParkingLot {                 // the aggregate root\n    Optional<SpotId> allocate(VehicleType type);   // <-- the ONE contended op\n    void release(SpotId id);\n}\n\nfinal class ParkingService {\n    Ticket checkIn(RegistrationNumber reg, VehicleType type);\n    Money  checkOut(String ticketId);\n}',
                    notes: '<p>Six types, one interface, two services. The design deliberately contains no factory, no builder, no observer and no singleton — none of the requirements asked for one, and adding them would be the failure the previous module\'s last chapter describes. <code>SpotSize.fitting</code> is where the motorcycle-may-use-a-car-spot rule lives, so it is stated once rather than re-derived at every allocation.</p>'
                },
                {
                    type: 'types',
                    title: 'The two follow-ups this shape is built to absorb',
                    items: [
                        { name: '"Two cars arrive at the same time"', html: '<p><code>allocate</code> is the only shared write. Spots live in a <code>ConcurrentHashMap&lt;SpotId, String&gt;</code> and allocation is <code>putIfAbsent</code> in preference order — first writer wins, the loser tries the next spot. No lock, no serialisation of the whole lot.</p>' },
                        { name: '"Now add electric charging spots with a different rate"', html: '<p>A value in <code>SpotSize</code> or a flag on the spot, plus a second <code>PricingRule</code>. <code>ParkingService</code> and <code>ParkingLot</code> are untouched — which is the open-closed claim, made concrete on the axis step 1 predicted.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>Do this once with a timer before your first real round. Reading a worked example produces recognition; producing one produces the muscle memory the format actually tests, and the gap between the two is exactly the gap between candidates who have practised and candidates who have read.</p>'
                }
            ],
            docs: [
                { title: 'ConcurrentHashMap', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/ConcurrentHashMap.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'design-patterns', questionId: 'when-a-pattern-is-overkill' },
                { topicId: 'behavioural-project', questionId: 'explaining-your-architecture' }
            ]
        }
    ]
};
