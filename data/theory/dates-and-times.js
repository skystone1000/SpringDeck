/* ==========================================================================
   data/theory/dates-and-times.js — module 16 in the reading path

   Third of the six section 5.9 java-platform insertions, placed after
   modern-java because java.time is itself the modern API and the reader has
   just seen what the language looks like after Java 8.

   The plan's tagline is the thesis: the API is fine, and the reasoning about
   zones is what fails. Nine chapters, of which only two are about the types.
   The rest are about decisions — which type models the fact you have, what a
   database column can and cannot store, what happens on the night an hour
   occurs twice, and how to test any of it without sleeping.

   No stdout in this module. Every output pane is a trace, and the reason is
   in CLAUDE.md: there is no JDK on the machine this is being written on, and
   time-dependent output would be the worst possible thing to claim without
   running it.
   ========================================================================== */

const datesAndTimesModule = {
    id: 'dates-and-times',
    trackId: 'java-platform',
    order: 16,
    title: 'Dates, Times and Zones',
    tagline: 'The API is fine. The reasoning about zones is what fails.',
    estimatedMinutes: 35,
    prerequisites: ['modern-java'],
    docHub: { title: 'java.time', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/time/package-summary.html' },

    chapters: [
        {
            id: 'why-date-and-calendar-were-replaced',
            title: 'What Was Wrong With Date and Calendar',
            importance: 'should-know',
            summary: 'Mutable, not thread-safe, zero-based months, a year offset by 1900, and no separation between an instant and a local date. Every one of those is a defect that produced real bugs.',
            interviewAngle: 'Asked as "why java.time". Listing the specific defects rather than saying "the old API was bad" is what makes it an answer.',
            buildsOn: [],
            blocks: [
                {
                    type: 'types',
                    title: 'The defects, each of which caused a real class of bug',
                    items: [
                        { name: 'Mutable', html: '<p><code>Date</code> and <code>Calendar</code> can be changed after being handed out, so every getter had to defensively copy and most did not. A date stored in a field and then mutated by a caller is a classic.</p>' },
                        { name: '<code>SimpleDateFormat</code> is not thread-safe', html: '<p>It keeps parse state in a field. A static shared instance under load produces wrong dates — not exceptions, <em>wrong dates</em> — which is why this is the most damaging item on the list.</p>' },
                        { name: 'Zero-based months', html: '<p><code>Calendar.set(2024, 0, 1)</code> is January. Off-by-one-month bugs, forever.</p>' },
                        { name: '<code>Date.getYear()</code> returns year minus 1900', html: '<p>An API decision from 1996 that could never be fixed compatibly.</p>' },
                        { name: 'No distinction between kinds of time', html: '<p><code>Date</code> is a millisecond instant that prints in the default zone, so it pretends to be a wall-clock date and is not one. Almost every zone bug in old code starts here.</p>' },
                        { name: 'No date-only or time-only type', html: '<p>A birthday had to be an instant at midnight in some zone, which is not what a birthday is.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p><code>java.time</code> fixed all of it by being immutable, thread-safe, one-based for months, and — the important one — by having <strong>a separate type for each kind of temporal fact</strong>. The next two chapters are entirely about that separation, because it is the part that has to be understood rather than looked up.</p>'
                }
            ],
            docs: [
                { title: 'JSR 310: Date and Time API', url: 'https://docs.oracle.com/javase/tutorial/datetime/index.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'java-io-time', questionId: 'why-java-time-replaced-date' }
            ]
        },

        {
            id: 'localdate-localdatetime-instant',
            title: 'Three Types, Three Different Facts',
            importance: 'must-know',
            summary: 'Instant is a point on the timeline. LocalDateTime is a reading on a wall clock with no zone. LocalDate is a day in a calendar. They are not convertible without extra information.',
            interviewAngle: 'The single most useful thing in the module. A candidate who can say "LocalDateTime is not a point in time" has understood the API; one who converts between them with the system default has not.',
            buildsOn: ['why-date-and-calendar-were-replaced'],
            blocks: [
                {
                    type: 'types',
                    title: 'What each type actually models',
                    items: [
                        { name: '<code>Instant</code>', html: '<p>A point on the global timeline, nanoseconds since the epoch. Unambiguous everywhere. <em>"When did this happen."</em></p>' },
                        { name: '<code>LocalDateTime</code>', html: '<p>A date and a time with <strong>no zone</strong>, so it does not identify a moment. 2026-03-29T02:30 may never have happened, or may have happened twice. <em>"What the wall clock said."</em></p>' },
                        { name: '<code>LocalDate</code>', html: '<p>A day in a calendar. A birthday, an invoice date, a public holiday. Has no time and needs none.</p>' },
                        { name: '<code>LocalTime</code>', html: '<p>A time of day with no date. "The shop opens at 09:00" — true every day.</p>' },
                        { name: '<code>ZonedDateTime</code>', html: '<p>A <code>LocalDateTime</code> plus a zone id, which together resolve to an instant. <em>"A moment, described the way a person in Mumbai would describe it."</em></p>' },
                        { name: '<code>OffsetDateTime</code>', html: '<p>A local date-time plus a fixed offset such as <code>+05:30</code>. Identifies an instant, and knows nothing about future rule changes.</p>' }
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Every conversion between them needs information from outside',
                    code: 'Instant now = Instant.now();\n\n// Instant -> local requires a ZONE. There is no default answer, which\n// is why the method takes one.\nLocalDateTime local = LocalDateTime.ofInstant(now, ZoneId.of("Asia/Kolkata"));\n\n// Local -> Instant requires a zone too, AND may be ambiguous or\n// impossible -- see the DST chapter.\nInstant back = local.atZone(ZoneId.of("Asia/Kolkata")).toInstant();\n\n// The convenience methods that silently use the SYSTEM DEFAULT are\n// where the bugs live. The zone is a property of the machine.\nLocalDateTime.now();            // system default zone\nLocalDate.now();                // system default zone -- and near\n                                // midnight, a different day per server\ninstant.atZone(ZoneId.systemDefault());\n\n// Prefer an explicit zone, or better, an injected Clock:\nLocalDate.now(clock);           // testable AND explicit',
                    notes: '<p>Every one of these conversions takes a zone because the information genuinely is not present in the source type. That is not API awkwardness; it is the API refusing to guess, which is exactly what <code>java.util.Date</code> did wrong. Treat a method that does not ask for a zone as a method that used your server\'s.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong><code>LocalDate.now()</code> can return different days on two servers at the same moment.</strong> If one runs in UTC and one in <code>Asia/Kolkata</code>, then between 18:30 and 00:00 UTC they disagree about what day it is. Daily aggregation jobs, "today\'s orders" endpoints and report boundaries all break on this, intermittently, in a way that looks like a data problem.</p>'
                }
            ],
            docs: [
                { title: 'Instant', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/time/Instant.html', kind: 'api' },
                { title: 'LocalDateTime', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/time/LocalDateTime.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'java-io-time', questionId: 'localdate-instant-zoneddatetime' }
            ]
        },

        {
            id: 'zoneddatetime-and-offsetdatetime',
            title: 'ZonedDateTime Against OffsetDateTime',
            importance: 'must-know',
            summary: 'An offset is a number. A zone is a rulebook that says which offset applies on a given date, and that rulebook changes. For anything in the future, you need the rulebook.',
            interviewAngle: 'The discriminating question is which to use for a meeting six months out. The answer is the zone, because a government can move the DST boundary between now and then.',
            buildsOn: ['localdate-localdatetime-instant'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'A fixed number against a set of rules',
                    left: 'OffsetDateTime',
                    right: 'ZonedDateTime',
                    rows: [
                        { aspect: 'Carries', left: 'A fixed offset — <code>+05:30</code>', right: 'A zone id — <code>Asia/Kolkata</code>' },
                        { aspect: 'Identifies an instant', left: 'Yes', right: 'Yes' },
                        { aspect: 'Knows about DST', left: 'No', right: 'Yes, and about historical rule changes' },
                        { aspect: 'Adding a day across a DST boundary', left: 'Adds 24 hours', right: 'Adds a <em>day</em> — 23 or 25 hours as required' },
                        { aspect: 'Survives a rule change', left: 'It was correct when written; it may not describe the intent any more', right: 'Recomputed against the current rules' },
                        { aspect: 'Use for', left: 'A recorded past event; a wire format', right: 'A future appointment; any arithmetic in a person\'s local terms' }
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The arithmetic difference, which is the whole point',
                    code: 'ZoneId london = ZoneId.of("Europe/London");\nZonedDateTime before = ZonedDateTime.of(2026, 3, 28, 12, 0, 0, 0, london);\n\nbefore.plusDays(1);       // 2026-03-29T12:00 BST -- still noon\nbefore.plusHours(24);     // 2026-03-29T13:00 BST -- 24 hours later\n\n// Both are correct answers to different questions, and the API makes\n// you choose. plusDays keeps the wall-clock time; plusHours keeps the\n// elapsed duration. On a DST night they differ by an hour.\n\n// The tzdb is data, and it is updated. A zone id is a promise to look\n// the answer up later; an offset is an answer computed now.\nZoneId.getAvailableZoneIds().size();   // ~600, and it changes',
                    output: {
                        kind: 'trace',
                        lines: [
                            'before          2026-03-28T12:00 GMT   (London is on GMT in winter)',
                            'plusDays(1)     2026-03-29T12:00 BST   same wall-clock time, 23 hours of elapsed time',
                            'plusHours(24)   2026-03-29T13:00 BST   24 hours of elapsed time, one hour later on the clock',
                            'A billing period wants plusDays. A timeout wants plusHours. Choosing wrongly is a one-hour error twice a year.'
                        ],
                        explain: '<p>The dates here are illustrative of the last-Sunday-in-March rule that the United Kingdom currently follows; the exact date is looked up in the tzdb rather than computed, which is the point of using a zone id at all.</p>'
                    }
                },
                {
                    type: 'tip',
                    html: '<p>Rule of thumb: <strong>store an <code>Instant</code>, plus the user\'s <code>ZoneId</code> when you will need to render or recompute in their terms.</strong> Storing an <code>OffsetDateTime</code> preserves what the offset was, which is genuinely useful for an audit record of a past event, and is the wrong thing for anything you will do arithmetic on later.</p>'
                }
            ],
            docs: [
                { title: 'ZonedDateTime', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/time/ZonedDateTime.html', kind: 'api' },
                { title: 'ZoneRules', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/time/zone/ZoneRules.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'java-io-time', questionId: 'localdate-instant-zoneddatetime' }
            ]
        },

        {
            id: 'choosing-the-right-type',
            title: 'Choosing the Type From the Fact',
            importance: 'must-know',
            summary: 'Ask what the fact is, not what is convenient. A birthday is a LocalDate; a login is an Instant; a shop opening time is a LocalTime and a rule, not a timestamp.',
            interviewAngle: 'Give this as a decision procedure rather than a type list. It is also the answer to "how would you model X" for half the temporal fields in any schema.',
            buildsOn: ['zoneddatetime-and-offsetdatetime'],
            blocks: [
                {
                    type: 'table',
                    title: 'The fact, and the type that models it',
                    headers: ['The fact', 'Type', 'Why not the obvious alternative'],
                    rows: [
                        ['A user logged in', '<code>Instant</code>', 'A moment, universal. Render per user; store once.'],
                        ['Date of birth', '<code>LocalDate</code>', 'A timestamp shifts across midnight in another zone and changes somebody\'s birthday'],
                        ['Invoice date', '<code>LocalDate</code>', 'Legally a calendar day, not a moment'],
                        ['A meeting next March', '<code>LocalDateTime</code> + <code>ZoneId</code>', 'An instant fixes it against rules that may change before it happens'],
                        ['Shop opens at 09:00', '<code>LocalTime</code>', 'True every day; a timestamp would be one specific day'],
                        ['A token expires in 15 minutes', '<code>Instant</code>', 'Elapsed time from now — and see the monotonic-clock caveat below'],
                        ['A subscription runs one month', '<code>Period</code>', '<code>Duration.ofDays(30)</code> is not a month, and February proves it'],
                        ['An HTTP timeout', '<code>Duration</code>', 'Exact elapsed time is what is wanted'],
                        ['An audit record of a past event', '<code>OffsetDateTime</code>', 'Preserves the offset that actually applied at the time']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Neither <code>Instant.now()</code> nor <code>System.currentTimeMillis()</code> is monotonic.</strong> Both read the wall clock, which NTP can step backwards. Measuring how long something took with them can produce a negative duration. Use <code>System.nanoTime()</code> for elapsed measurement — it has no meaningful absolute value and is only comparable within one JVM, which is exactly the trade-off you want for a stopwatch.</p>'
                }
            ],
            docs: [
                { title: 'java.time package summary', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/time/package-summary.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'java-io-time', questionId: 'monotonic-versus-wall-clock' }
            ]
        },

        {
            id: 'duration-vs-period',
            title: 'Duration Against Period',
            importance: 'should-know',
            summary: 'Duration is exact elapsed time — seconds and nanoseconds. Period is calendar amounts — years, months, days. One month is not thirty days and adding either can land on a different answer.',
            interviewAngle: 'A short question with a sharp example: adding one month to 31 January. Knowing what java.time does, and that it is a documented choice, is the answer.',
            buildsOn: ['choosing-the-right-type'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Where the two disagree',
                    code: 'LocalDate jan31 = LocalDate.of(2026, 1, 31);\n\njan31.plus(Period.ofMonths(1));    // 2026-02-28 -- clamped to a valid date\njan31.plus(Duration.ofDays(30));   // does not compile on a LocalDate:\n                                   // a LocalDate has no time, so an exact\n                                   // duration is not applicable\n\nLocalDate feb28 = LocalDate.of(2026, 2, 28);\nfeb28.plusMonths(1);               // 2026-03-28, NOT the end of March\n\n// Adding a month then subtracting one is not the identity:\njan31.plusMonths(1).minusMonths(1);  // 2026-01-28\n\n// Duration is exact and has no calendar opinions:\nDuration.ofDays(1).toHours();      // 24, always, by definition\n// -- which is why adding Duration.ofDays(1) to a ZonedDateTime across\n//    a DST boundary lands an hour off the same wall-clock time.',
                    output: {
                        kind: 'trace',
                        lines: [
                            '2026-01-31 plus one month  -> 2026-02-28   February has no 31st, so the result is clamped to the last valid day.',
                            '2026-02-28 plus one month  -> 2026-03-28   Clamping is not remembered; this is a plain day-of-month match.',
                            'plusMonths(1).minusMonths(1) on 2026-01-31 -> 2026-01-28   The operation is not reversible.',
                            'Duration.ofDays(1) is exactly 24 hours by specification, whatever the calendar says.'
                        ],
                        explain: '<p>The non-reversibility is the trap worth carrying: a subscription renewal that computes "one month from the anniversary" by repeatedly adding a month will drift the anniversary earlier every time it passes a short month. Store the original anniversary day and recompute from it rather than accumulating.</p>'
                    }
                },
                {
                    type: 'tip',
                    html: '<p><code>ChronoUnit</code> is the third piece and it is what you want for "how far apart": <code>ChronoUnit.DAYS.between(a, b)</code>. It returns a <code>long</code> in the unit you named rather than a compound <code>Period</code>, which is nearly always what a calculation needs.</p>'
                }
            ],
            docs: [
                { title: 'Period', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/time/Period.html', kind: 'api' },
                { title: 'Duration', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/time/Duration.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'java-io-time', questionId: 'duration-versus-period' },
                { topicId: 'java-io-time', questionId: 'date-arithmetic-and-adjusters' }
            ]
        },

        {
            id: 'formatting-and-parsing',
            title: 'Formatting and Parsing',
            importance: 'should-know',
            summary: 'DateTimeFormatter is immutable and thread-safe, which is the headline difference from SimpleDateFormat. ISO-8601 for machines, a localised formatter for people.',
            interviewAngle: 'The thread-safety point is the one asked about. The practical point is that a formatter with a pattern but no locale is the string-formatting bug again in temporal clothing.',
            buildsOn: ['duration-vs-period'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'One shared instance, safely — and the pattern letters that catch people',
                    code: '// Immutable and thread-safe: a static field is correct here, which it\n// never was for SimpleDateFormat.\nprivate static final DateTimeFormatter WIRE = DateTimeFormatter.ISO_INSTANT;\n\nprivate static final DateTimeFormatter HUMAN =\n        DateTimeFormatter.ofPattern("d MMMM yyyy", Locale.UK);\n\n// The classic pattern bug: uppercase YYYY is WEEK-BASED year.\nDateTimeFormatter.ofPattern("YYYY-MM-dd");   // 2027-12-28 for 28 Dec 2026\nDateTimeFormatter.ofPattern("yyyy-MM-dd");   // 2026-12-28  <-- what you meant\n\n// And the other pair:\n//   MM = month, mm = minute\n//   DD = day OF YEAR, dd = day of month\n//   HH = 0-23, hh = 1-12 (needs an am/pm marker to be unambiguous)\n\n// Parsing is strict by default and throws, which is right:\nLocalDate.parse("2026-02-30");      // DateTimeParseException',
                    notes: '<p>The <code>YYYY</code> bug is worth knowing by name because it fires for about three days a year — the last days of December that belong to the first ISO week of the following year — so it passes every test written in June and produces dates a year out over the new-year holiday, which is the worst possible time to be paged.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Same rule as the strings module: <strong>ISO for machines, the user\'s locale for people, the JVM default for neither.</strong> <code>DateTimeFormatter.ISO_INSTANT</code> or <code>ISO_OFFSET_DATE_TIME</code> on the wire; <code>ofLocalizedDateTime(...).withLocale(userLocale).withZone(userZone)</code> for display. A hand-written pattern shown to a user is a decision to format German dates the English way.</p>'
                }
            ],
            docs: [
                { title: 'DateTimeFormatter', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/time/format/DateTimeFormatter.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'java-io-time', questionId: 'time-on-the-wire' },
                { topicId: 'rest-api', questionId: 'jackson-dates-and-time' }
            ]
        },

        {
            id: 'dst-and-the-hour-that-happens-twice',
            title: 'The Hour That Happens Twice',
            importance: 'must-know',
            summary: 'On a DST forward transition some local times do not exist; on a backward transition some occur twice. java.time resolves both silently by documented rules, and the defaults are not always what you want.',
            interviewAngle: 'The zone question that separates people who have shipped a scheduler from people who have read the API. Knowing that atZone never throws — it picks — is the key fact.',
            buildsOn: ['formatting-and-parsing'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Both transitions, and the API that hides them',
                    code: 'ZoneId london = ZoneId.of("Europe/London");\n\n// SPRING FORWARD: 01:00 -> 02:00, so 01:30 never happens.\nLocalDateTime gap = LocalDateTime.of(2026, 3, 29, 1, 30);\ngap.atZone(london);\n// Does NOT throw. Shifts forward by the gap: 02:30 BST.\n\n// AUTUMN BACK: 02:00 -> 01:00, so 01:30 happens twice.\nLocalDateTime overlap = LocalDateTime.of(2026, 10, 25, 1, 30);\noverlap.atZone(london);\n// Does NOT throw. Picks the EARLIER offset -- the first 01:30, BST.\noverlap.atZone(london).withLaterOffsetAtOverlap();   // the second one\n\n// To see what actually happened rather than accept a default:\nZoneRules rules = london.getRules();\nrules.getValidOffsets(overlap);   // a list: 0, 1 or 2 entries\n// 0 -> the local time does not exist\n// 1 -> ordinary\n// 2 -> ambiguous; you must decide which one you meant',
                    output: {
                        kind: 'trace',
                        lines: [
                            'getValidOffsets on a gap      -> []            the local time never occurred',
                            'getValidOffsets normally      -> [+01:00]      one answer',
                            'getValidOffsets on an overlap -> [+01:00, +00:00]   two answers, and the API silently takes the first',
                            'atZone() never throws. It applies a documented resolution, which is convenient and is a decision made for you.'
                        ],
                        explain: '<p>Transition dates follow the tzdb rules current at the time of writing; the point being illustrated is the resolution behaviour, which is specified independently of any particular year\'s dates.</p>'
                    }
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A job scheduled at 01:30 local runs twice on one night a year and not at all on another.</strong> If it charges cards or sends emails, that is a duplicate charge and a missed batch. Two defences, and use both: schedule in <strong>UTC</strong> so the transition does not apply, and make the job <strong>idempotent</strong> so running it twice is harmless. Idempotency has an entire module later, and this is the cheapest example of why.</p>'
                }
            ],
            docs: [
                { title: 'ZoneRules.getValidOffsets', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/time/zone/ZoneRules.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'java-io-time', questionId: 'dst-and-ambiguous-times' }
            ]
        },

        {
            id: 'storing-time-in-a-database',
            title: 'Storing Time',
            importance: 'must-know',
            summary: 'timestamptz stores an instant; timestamp stores a wall-clock reading with no zone and is almost never what you want. The column type decides what you can recover later.',
            interviewAngle: 'A schema question that reveals whether someone has run a service across regions. Naming PostgreSQL\'s two timestamp types and what each actually stores is the answer.',
            buildsOn: ['dst-and-the-hour-that-happens-twice'],
            blocks: [
                {
                    type: 'table',
                    title: 'PostgreSQL 16 — the two timestamp types',
                    headers: ['Column type', 'What is stored', 'Use for'],
                    rows: [
                        ['<code>timestamptz</code>', 'A UTC instant. The input is converted using the session <code>TimeZone</code> and the zone is <strong>not</strong> retained.', '<strong>The default choice.</strong> Anything that happened.'],
                        ['<code>timestamp</code>', 'Literal fields, no zone, no conversion', 'A wall-clock reading genuinely without a zone. Rare.'],
                        ['<code>date</code>', 'A calendar day', 'Birthdays, invoice dates'],
                        ['<code>time</code>', 'A time of day', 'Opening hours'],
                        ['<code>interval</code>', 'A calendar-aware amount', 'Maps to <code>Period</code>-shaped data; often better in the application']
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The mapping, and the two settings that decide it',
                    code: '@Entity\nclass AuditEvent {\n\n    // Instant -> timestamptz. The pairing to reach for.\n    @Column(columnDefinition = "timestamptz")\n    private Instant occurredAt;\n\n    // LocalDate -> date. No zone involved anywhere.\n    private LocalDate businessDate;\n\n    // LocalDateTime -> timestamp. Only if you truly mean a zoneless\n    // wall-clock reading -- and you usually do not.\n    private LocalDateTime scheduledLocal;\n}\n\n// Two settings that decide what the JDBC driver does. Pin them, and\n// pin them in the container image too.\n// spring.jpa.properties.hibernate.jdbc.time_zone=UTC\n// JVM: -Duser.timezone=UTC\n//\n// Without these, the conversion depends on the machine, which means a\n// row written by one pod can read back differently on another.',
                    notes: '<p>The single most reliable configuration for a service is <strong>UTC everywhere below the presentation layer</strong>: the JVM in UTC, the database session in UTC, instants on the wire in ISO-8601, and conversion to a user\'s zone done at render time only. It removes every conversion that depends on where a process happens to be running.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Storing a local time and the zone name in two columns is defensible; storing a local time alone is not.</strong> The second one loses information irrecoverably — the same string can mean two different instants on a DST night, and there is nothing left in the row to disambiguate it. If a future appointment must survive a rule change, store the <code>LocalDateTime</code> <em>and</em> the <code>ZoneId</code>, and resolve to an instant at the last moment.</p>'
                }
            ],
            docs: [
                { title: 'PostgreSQL — Date/Time Types', url: 'https://www.postgresql.org/docs/16/datatype-datetime.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'java-io-time', questionId: 'storing-time-in-a-database' }
            ]
        },

        {
            id: 'time-in-tests',
            title: 'Making Time Testable',
            importance: 'should-know',
            summary: 'Inject a Clock. Every java.time now() takes one, so a test can fix the current instant, jump forward a month, and never sleep.',
            interviewAngle: 'A small question that signals testing maturity. Sleeping in a test to wait for an expiry is the anti-pattern it replaces, and everybody has written one.',
            buildsOn: ['storing-time-in-a-database'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Clock as a dependency',
                    code: '@Service\nclass TokenService {\n\n    private final Clock clock;                 // injected\n\n    TokenService(Clock clock) { this.clock = clock; }\n\n    Token issue() {\n        Instant now = clock.instant();         // never Instant.now()\n        return new Token(randomId(), now, now.plus(Duration.ofMinutes(15)));\n    }\n\n    boolean isValid(Token t) { return clock.instant().isBefore(t.expiresAt()); }\n}\n\n@Configuration\nclass ClockConfig {\n    @Bean\n    Clock clock() { return Clock.systemUTC(); }   // UTC, not systemDefault\n}\n\n// The test needs no sleeping and no flakiness.\nvar start  = Instant.parse("2026-01-01T00:00:00Z");\nvar fixed  = Clock.fixed(start, ZoneOffset.UTC);\nvar token  = new TokenService(fixed).issue();\n\nvar later  = Clock.fixed(start.plus(Duration.ofMinutes(16)), ZoneOffset.UTC);\nassertFalse(new TokenService(later).isValid(token));\n\n// Clock.offset(baseClock, duration) shifts a running clock, which is\n// what you want when the code under test calls instant() more than once.',
                    notes: '<p>The rule that makes this work is mechanical and easy to enforce: <strong>no production code calls a no-argument <code>now()</code>.</strong> It is greppable, so it can be a review rule or an ArchUnit test, and it is the whole of the discipline — every <code>java.time</code> type has a <code>now(Clock)</code> overload precisely to support it.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Injecting <code>Clock.systemUTC()</code> rather than <code>Clock.systemDefaultZone()</code> also removes the <code>LocalDate.now()</code> hazard from earlier in the module: with a UTC clock, every server agrees on what day it is, and any zone-sensitive rendering has to ask for a zone explicitly — which is exactly the property you want.</p>'
                }
            ],
            docs: [
                { title: 'Clock', url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/time/Clock.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'java-io-time', questionId: 'clock-for-testable-time' },
                { topicId: 'testing', questionId: 'flaky-tests' }
            ]
        }
    ]
};
