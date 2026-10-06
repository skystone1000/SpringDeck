/* ==========================================================================
   data/theory/sets/drills-system-design.js — Synthesis, tier 2

   Twelve forty-five-minute design exercises, the round-4 material. Part 6.2
   grades them on four things and only four: did you clarify the scope, did
   you estimate, did you name the bottleneck, did you choose and defend a
   trade-off. Everything else an interviewer says about a design round is a
   restatement of one of those.

   SO THE FIRST FOUR watchFor LINES ARE THE SAME IN ALL TWELVE, deliberately,
   the way the five tier-1 lines are the same in all eight. The validator does
   not enforce it here — Part 6.2 does not require the wording verbatim the
   way 6.1 does — but a reader who meets the same four failures twelve times
   learns that they are the shape of the round rather than a quirk of the
   question. The drill-specific lines come after them.

   NO SKETCH ON A TIER-2 DRILL. A design answer is a conversation, and a
   forty-line Java sketch would be answering a different question than the one
   the round asks. Where a shape has to be shown it is shown in the prompt as
   a constraint to design against, not as an outline to fill in.
   ========================================================================== */

const TIER2_WATCH = [
    'Started designing before asking what the scale actually is',
    'No numbers — a design with no estimate cannot have a bottleneck',
    'Named no bottleneck, so every component got equal attention',
    'Listed options without choosing one, or chose without saying what it costs'
];

const drillsSystemDesignModule = {
    id: 'drills-system-design',
    trackId: 'synthesis',
    order: 902,
    title: 'System Design Exercises',
    tagline: 'Round 4. Forty-five minutes, a whiteboard, and a number you have to defend.',
    estimatedMinutes: 45,
    prerequisites: [],
    docHub: {
        title: 'Patterns of Distributed Systems',
        url: 'https://martinfowler.com/articles/patterns-of-distributed-systems/'
    },

    chapters: [
        {
            id: 'design-url-shortener-at-scale',
            title: 'Shorten a URL',
            importance: 'must-know',
            summary: 'The warm-up everybody has seen, which is exactly why the read path and the ID scheme are what get probed.',
            interviewAngle: 'Nobody is impressed by the happy path here. The two questions worth answering well are how the short code is generated without a coordination round trip, and what the cache hit rate has to be for the database to survive.',
            buildsOn: [],
            blocks: [
                {
                    type: 'drill',
                    id: 'drill-design-url-shortener-at-scale',
                    tier: 2,
                    title: 'A shortener at 10k redirects/sec',
                    minutes: 45,
                    prompt: 'Design a URL shortener serving 10,000 redirects per second and 100 writes per second, with a five-year retention. Cover: how a short code is allocated, what the storage footprint is after five years, what the read path looks like, and what happens when the cache is cold after a deploy. Say what you would do differently if custom aliases were required.',
                    watchFor: TIER2_WATCH.concat([
                        'A short code from a hash of the URL with no answer for the collision — a truncated hash collides, and "it probably will not" is not a design',
                        'A database sequence per write, which is a coordination round trip on the one operation you have 100 of per second and can afford, but the reasoning has to be stated rather than assumed',
                        'No estimate of the row size, so the five-year storage figure is a shrug — roughly 100 bytes a row times 100/sec times five years is about 1.5 TB, and that number changes the storage answer',
                        'A 301 for the redirect, which browsers cache forever and takes your analytics with it — 302 keeps the request coming back, and the choice is a trade-off worth naming',
                        'Nothing said about a cold cache after a deploy, which is when a 99% hit rate becomes 0% and the database sees a hundred times its normal read load'
                    ])
                }
            ],
            docs: [
                { title: 'HTTP redirect status codes — MDN', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Status#redirection_messages', kind: 'spec' }
            ],
            relatedQuestions: []
        },

        {
            id: 'design-rate-limiter-distributed',
            title: 'Limit the Rate',
            importance: 'must-know',
            summary: 'Easy on one node and interesting on twenty, because the counter has to live somewhere and that somewhere is now on the request path.',
            interviewAngle: 'The algorithm is the small half. The large half is where the state lives, what happens when that store is unreachable, and whether the limiter fails open or closed.',
            buildsOn: [],
            blocks: [
                {
                    type: 'drill',
                    id: 'drill-design-rate-limiter-distributed',
                    tier: 2,
                    title: 'Per-tenant limits across twenty instances',
                    minutes: 45,
                    prompt: 'Design a rate limiter for a public API with per-tenant limits (1000 requests/minute on the paid tier, 60 on the free one), running across twenty application instances behind a load balancer. Choose an algorithm and say why. Say where the counter lives, what the added latency is per request, and what the limiter does when that store is unreachable. Then say what a client should see when it is limited.',
                    watchFor: TIER2_WATCH.concat([
                        'A fixed window, with no mention that it allows twice the limit across a window boundary — the classic 2x burst',
                        'Per-instance counters described as a distributed limiter: twenty instances each allowing 1000/min is a limit of 20,000/min',
                        'A Redis round trip per request with no latency budget attached — one millisecond added to a five-millisecond endpoint is a 20% regression, and it needs saying',
                        'No answer for Redis being down. Fail open and the limiter is decorative under exactly the load it exists for; fail closed and a cache outage becomes a full outage. Both are defensible; silence is not',
                        'A 500 or a 403 for the limited client instead of 429 with Retry-After, which is the one thing that lets a well-behaved client behave well'
                    ])
                }
            ],
            docs: [
                { title: 'RFC 6585 §4 — 429 Too Many Requests', url: 'https://www.rfc-editor.org/rfc/rfc6585#section-4', kind: 'spec' }
            ],
            relatedQuestions: []
        },

        {
            id: 'design-notification-service',
            title: 'Notify Somebody',
            importance: 'should-know',
            summary: 'Three channels, four providers, and a delivery guarantee that has to survive a provider being down for an hour.',
            interviewAngle: 'This is a fan-out and retry question wearing a product costume. The interesting parts are deduplication, per-user preferences, and what "delivered" means when the provider is the only one who knows.',
            buildsOn: [],
            blocks: [
                {
                    type: 'drill',
                    id: 'drill-design-notification-service',
                    tier: 2,
                    title: 'Email, SMS and push, with preferences and retries',
                    minutes: 45,
                    prompt: 'Design a service that other services call to notify a user. Three channels — email, SMS, push — each with a third-party provider. Users have per-category preferences and a quiet-hours window. Cover: the API the calling service uses, how a notification survives a provider outage, how you avoid sending the same thing twice, and how you would add a fourth channel without touching the callers.',
                    watchFor: TIER2_WATCH.concat([
                        'A synchronous call to the provider inside the caller\'s request, so a slow SMS gateway becomes a slow checkout',
                        'Retries with no idempotency at the provider, which turns one outage into six identical emails',
                        'No dead-letter destination, so a notification that fails five times is simply gone and nobody knows',
                        'Preferences checked by the caller rather than by the service, which means every caller has to remember and one of them will not',
                        'Treating "the provider accepted it" as "the user got it" without saying that is what you are doing — it is usually the right call and it is still an assumption'
                    ])
                }
            ],
            docs: [
                { title: 'Microservices.io — Transactional outbox', url: 'https://microservices.io/patterns/data/transactional-outbox.html', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'design-payment-ledger',
            title: 'Keep the Money Straight',
            importance: 'must-know',
            summary: 'The one design question where "eventually consistent" is the wrong answer and being able to say why is the whole point.',
            interviewAngle: 'Interviewers use this to find out whether you have thought about correctness under concurrency rather than throughput. A candidate who reaches for double-entry and an append-only ledger has done this before.',
            buildsOn: [],
            blocks: [
                {
                    type: 'drill',
                    id: 'drill-design-payment-ledger',
                    tier: 2,
                    title: 'A ledger that always balances',
                    minutes: 45,
                    prompt: 'Design the ledger behind a wallet: users top up, spend, refund and transfer to each other. Requirements: a balance is never wrong, a transfer is never half-applied, and every balance can be explained by the entries that produced it. Say how you store it, how you prevent a double-spend under concurrent requests, and how a reconciliation job would detect drift. Then say what you would do about a top-up whose payment-gateway callback never arrives.',
                    watchFor: TIER2_WATCH.concat([
                        'A mutable balance column as the source of truth, with no entry history — a balance you cannot explain is a balance you cannot defend to finance',
                        'Money as a floating-point type. Minor units in a bigint, or a fixed-scale decimal, and say which',
                        'Read-then-write on the balance with no locking, which is a lost update the first time two requests land together — SELECT FOR UPDATE, a conditional UPDATE with a version, or a serializable transaction, and name which',
                        'Single-entry rows, so there is no structural check that the money came from somewhere. Double entry makes "the sum of all entries is zero" a query you can run',
                        'No idempotency on the gateway callback, so a retried webhook credits the wallet twice',
                        'Nothing said about the callback that never arrives — a reconciliation pull against the gateway is the answer, and it has to exist before the incident, not after'
                    ])
                }
            ],
            docs: [
                { title: 'PostgreSQL 16 — Transaction isolation', url: 'https://www.postgresql.org/docs/16/transaction-iso.html', kind: 'spec' }
            ],
            relatedQuestions: []
        },

        {
            id: 'design-job-scheduler',
            title: 'Run It Later',
            importance: 'should-know',
            summary: 'Cron is easy until there are twelve instances of the application and each of them has one.',
            interviewAngle: 'The leader-election answer is what people reach for; the "make the job idempotent and stop caring" answer is usually better and almost nobody gives it first.',
            buildsOn: [],
            blocks: [
                {
                    type: 'drill',
                    id: 'drill-design-job-scheduler',
                    tier: 2,
                    title: 'Scheduled and delayed jobs across a cluster',
                    minutes: 45,
                    prompt: 'Design job scheduling for a service running twelve instances. Two kinds of work: recurring jobs on a cron expression, and one-off jobs scheduled for a specific future time by application code (send this reminder in 48 hours). Cover: how a recurring job runs once rather than twelve times, how a delayed job survives a redeploy, what happens to a job whose scheduled time passed while the cluster was down, and how you would run a job that takes longer than its own interval.',
                    watchFor: TIER2_WATCH.concat([
                        'In-memory scheduling for the delayed jobs, so a rolling deploy silently drops every reminder in flight',
                        'Leader election proposed without saying what happens during the election — a fifteen-second gap is fine for a nightly report and not for a payment retry',
                        'A row lock held for the duration of a long job, which blocks the scheduler rather than the job',
                        'No answer for the missed window. Catch up and a day of downtime fires a day of jobs at once; skip and the work is lost. The right answer differs per job, so the design needs a per-job policy',
                        'Overrun handled by hoping — a job that takes ninety seconds on a sixty-second schedule needs an explicit rule about whether the next run is skipped or queued'
                    ])
                }
            ],
            docs: [
                { title: 'Spring Framework — Task execution and scheduling', url: 'https://docs.spring.io/spring-framework/reference/integration/scheduling.html', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'design-order-fulfilment-saga',
            title: 'Fulfil an Order',
            importance: 'must-know',
            summary: 'Four services, one order, and no distributed transaction available to make them agree.',
            interviewAngle: 'The question is really "what do you do when step three fails after steps one and two succeeded". A candidate who says "roll back" without noticing there is nothing to roll back has not run this.',
            buildsOn: [],
            blocks: [
                {
                    type: 'drill',
                    id: 'drill-design-order-fulfilment-saga',
                    tier: 2,
                    title: 'Payment, inventory, shipping — and step three failing',
                    minutes: 45,
                    prompt: 'An order needs payment captured, inventory reserved and a shipment created, in three separate services with three separate databases. Design the flow. Cover: what the customer sees while it is in progress, what happens when shipping fails after payment succeeded, whether you orchestrate or choreograph and why, and how the system behaves if the same order message is delivered twice. Then say how you would find an order that is stuck.',
                    watchFor: TIER2_WATCH.concat([
                        'Two-phase commit across three services, offered without noticing that none of them supports it and the coordinator becomes the single point of failure',
                        'Compensation described as "undo", when a captured payment is refunded rather than un-captured — the compensating action is a new business fact with its own failure modes',
                        'No idempotency on the steps, so a redelivered message charges the card again',
                        'Choreography chosen for a flow with four steps and a business rule spanning them, with nothing said about how anyone will ever debug it',
                        'The order state machine left implicit, so "stuck" has no definition and no query can find one',
                        'Nothing about what the customer sees. An order that is neither confirmed nor failed for eight seconds is a UX decision, not just an engineering one'
                    ])
                }
            ],
            docs: [
                { title: 'Microservices.io — Saga', url: 'https://microservices.io/patterns/data/saga.html', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'design-audit-log',
            title: 'Write It Down',
            importance: 'should-know',
            summary: 'Easy to build and hard to build so that it is still admissible two years later.',
            interviewAngle: 'The probe is whether you notice that an audit log people can edit is not an audit log, and that a log written in the same transaction as the change has a different failure mode from one written after it.',
            buildsOn: [],
            blocks: [
                {
                    type: 'drill',
                    id: 'drill-design-audit-log',
                    tier: 2,
                    title: 'Who changed what, and can you prove it',
                    minutes: 45,
                    prompt: 'Design an audit log for a system where compliance requires knowing who changed what, when, and from where, retained for seven years. Cover: where the write happens relative to the change it records, how you keep it append-only, how it is queried (by actor, by entity, by time window) without the query load hurting the application, and what you do about the personal data in it when a user exercises a deletion right.',
                    watchFor: TIER2_WATCH.concat([
                        'The audit row written in application code at each call site, so the one path somebody forgets is the one that matters',
                        'The same table, the same credentials and the same permissions as application data, so the application can rewrite its own history',
                        'Written outside the transaction with no reconciliation, so a crash between the change and the log leaves an unrecorded change',
                        'Written inside the transaction with nothing said about the write amplification — every business write is now two, and on a hot table that is the bottleneck',
                        'Seven years of rows in the operational database with no partitioning or archival, so the query the compliance team runs once a quarter competes with checkout',
                        'No answer for erasure. Crypto-shredding — per-subject keys, discard the key — keeps the log intact while the personal data becomes unreadable, and the alternative of deleting rows destroys the property the log exists for'
                    ])
                }
            ],
            docs: [
                { title: 'Hibernate Envers — auditing', url: 'https://docs.jboss.org/hibernate/orm/6.4/userguide/html_single/Hibernate_User_Guide.html#envers', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'design-multi-tenant-saas-api',
            title: 'Many Customers, One Deployment',
            importance: 'should-know',
            summary: 'The isolation decision is the design, and everything else follows from it.',
            interviewAngle: 'Interviewers want to hear the three isolation models named and one of them chosen for a stated reason. The follow-up is always the noisy neighbour, and after that it is always the migration.',
            buildsOn: [],
            blocks: [
                {
                    type: 'drill',
                    id: 'drill-design-multi-tenant-saas-api',
                    tier: 2,
                    title: 'Isolation, noisy neighbours and a schema migration',
                    minutes: 45,
                    prompt: 'Design the data layer for a B2B SaaS API with 500 tenants, the largest of which is 200 times the size of the median. Cover: which isolation model you choose (shared schema with a tenant column, schema per tenant, database per tenant) and what it costs, how a tenant id is carried from the request to the query without every developer remembering, how one tenant\'s traffic is prevented from starving the rest, and how you run a schema migration across whichever model you picked.',
                    watchFor: TIER2_WATCH.concat([
                        'One model asserted as correct with no acknowledgement of what it gives up — shared schema is cheap and one missing WHERE clause is a data breach; database per tenant is safe and 500 migrations is a Tuesday',
                        'The tenant id passed as a method parameter through every layer, which works until somebody forgets, and the forgetting is silent',
                        'No enforcement below the application — row-level security or a mandatory filter is what makes the forgetting loud',
                        'Nothing said about the 200x tenant, which is the noisy neighbour the question was built around',
                        'A connection pool per tenant, without noticing that 500 pools of 10 is 5000 connections and the database will not have them',
                        'Migration described as "run Flyway" with no answer for a tenant whose migration fails halfway through a batch of 500'
                    ])
                }
            ],
            docs: [
                { title: 'PostgreSQL 16 — Row security policies', url: 'https://www.postgresql.org/docs/16/ddl-rowsecurity.html', kind: 'spec' }
            ],
            relatedQuestions: []
        },

        {
            id: 'design-file-upload-and-processing',
            title: 'Take a Large File',
            importance: 'should-know',
            summary: 'The design is mostly about keeping the bytes away from the application, and the rest is about telling the user what is happening.',
            interviewAngle: 'A candidate who routes 2 GB through the JVM has not thought about heap or about the load balancer timeout. The presigned-upload answer is the expected one, and the interesting follow-up is what happens after the bytes land.',
            buildsOn: [],
            blocks: [
                {
                    type: 'drill',
                    id: 'drill-design-file-upload-and-processing',
                    tier: 2,
                    title: 'A 2 GB upload, then work that takes four minutes',
                    minutes: 45,
                    prompt: 'Users upload files up to 2 GB. Each upload is then processed — virus scan, transcode, thumbnail — which takes up to four minutes. Design the flow from the browser to a finished, downloadable result. Cover: how the bytes get to storage, how the processing is triggered and tracked, what the client polls or subscribes to, and what happens when processing fails on the third of four steps. Then say how you would stop a user uploading a file they are not allowed to.',
                    watchFor: TIER2_WATCH.concat([
                        'The file streamed through the application, which puts 2 GB somewhere — heap, disk or both — and holds a request open past every proxy timeout in the path',
                        'A presigned URL issued with no size limit, no content-type constraint and no expiry, which is an open write endpoint on your bucket',
                        'Processing started synchronously in the upload request, so a four-minute job lives inside an HTTP call',
                        'No job record, so the client has nothing to poll and a failure has nothing to report against',
                        'Retrying a partially-completed pipeline from the start, redoing the transcode that already succeeded, with no per-step state',
                        'Authorisation checked when the URL is issued but nothing said about the window between issuing and uploading'
                    ])
                }
            ],
            docs: [
                { title: 'Amazon S3 — Uploading with presigned URLs', url: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'design-search-and-autocomplete',
            title: 'Search and Suggest',
            importance: 'should-know',
            summary: 'Two different problems that look like one, and putting both on the primary database is how you find out.',
            interviewAngle: 'The question tests whether you know that a LIKE \'%term%\' cannot use a B-tree index, and whether you can talk about keeping a search index in sync without hand-waving the staleness.',
            buildsOn: [],
            blocks: [
                {
                    type: 'drill',
                    id: 'drill-design-search-and-autocomplete',
                    tier: 2,
                    title: 'Full-text search plus type-ahead over 10M products',
                    minutes: 45,
                    prompt: 'Ten million products. Two features: full-text search with filters and relevance ranking, and an autocomplete that must answer in under 50 ms as the user types. Cover: where each one is served from, how the index is kept in step with the product database, how stale a result is allowed to be and who decided that, and what the search page shows when the search cluster is unavailable.',
                    watchFor: TIER2_WATCH.concat([
                        'LIKE \'%term%\' against the products table, which cannot use a B-tree index and scans ten million rows per keystroke',
                        'Autocomplete and full search treated as one problem — one is a prefix lookup with a tiny latency budget, the other is a ranked query with filters, and they justify different stores',
                        'The search index updated by the application after the database write, with no answer for the write that succeeds and the index update that does not',
                        'Staleness never quantified. "Near real time" is not a number, and the merchandising team has an opinion about whether a price change takes one second or five minutes',
                        'A full reindex proposed as the recovery path with no estimate of how long ten million documents take',
                        'No degraded mode. When the cluster is down, a category listing from the primary database is a worse search page and a better outage'
                    ])
                }
            ],
            docs: [
                { title: 'PostgreSQL 16 — Full text search', url: 'https://www.postgresql.org/docs/16/textsearch.html', kind: 'spec' }
            ],
            relatedQuestions: []
        },

        {
            id: 'design-cqrs-read-model',
            title: 'Build a Read Model',
            importance: 'good-to-know',
            summary: 'A dashboard whose query joins nine tables, and the decision to stop joining them at read time.',
            interviewAngle: 'This separates people who have read about CQRS from people who have run it. The tell is whether they talk about rebuilding the projection, and about what the UI does in the window where it is behind.',
            buildsOn: ['design-order-fulfilment-saga'],
            blocks: [
                {
                    type: 'drill',
                    id: 'drill-design-cqrs-read-model',
                    tier: 2,
                    title: 'A projection, its lag, and rebuilding it',
                    minutes: 45,
                    prompt: 'An operations dashboard runs a query joining nine tables and takes eleven seconds. Design a read model that serves it in under 200 ms. Cover: how the projection is populated and kept current, what happens to a user who makes a change and immediately looks at the dashboard, how you rebuild the projection after finding a bug in it, and how anyone would know the projection had silently stopped updating.',
                    watchFor: TIER2_WATCH.concat([
                        'CQRS adopted for the whole system when one query is slow — the answer might be an index, and saying so first is a point in your favour',
                        'No answer for read-your-writes. The user who just clicked save and sees the old number is the first bug report, and the fixes — read from the write side for that one view, or hold the UI until the projection catches up — are cheap only if they were designed in',
                        'The projection treated as a cache that can be dropped, when rebuilding it takes forty minutes',
                        'Rebuild handled by truncate-and-replay with no plan for serving reads during it',
                        'No lag metric, so a consumer that died at 3 a.m. shows a dashboard that looks fine and is eight hours old',
                        'Nothing said about the projection being wrong rather than late, which is the failure that a lag metric cannot see'
                    ])
                }
            ],
            docs: [
                { title: 'Martin Fowler — CQRS', url: 'https://martinfowler.com/bliki/CQRS.html', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'design-a-service-decomposition',
            title: 'Split the Monolith',
            importance: 'must-know',
            summary: 'The design question where the best answer often begins with a reason not to.',
            interviewAngle: 'Interviewers are listening for a boundary drawn on a business capability rather than on a database table, and for the candidate to name what the split takes away. Anyone can list benefits.',
            buildsOn: [],
            blocks: [
                {
                    type: 'drill',
                    id: 'drill-design-a-service-decomposition',
                    tier: 2,
                    title: 'Three teams, one deployable, and where the seams are',
                    minutes: 45,
                    prompt: 'A four-year-old Spring Boot monolith, 300k lines, one PostgreSQL database, three teams that keep blocking each other at release time. Propose a decomposition. Cover: how you decide where the boundaries are, which service you extract first and why that one, what happens to the foreign keys that cross the new boundary, how the two halves talk during the transition, and what you will lose that you have today. Then say under what circumstances you would recommend not doing this at all.',
                    watchFor: TIER2_WATCH.concat([
                        'Boundaries drawn on database tables or on technical layers, which produces services that cannot change independently — the only property the split was for',
                        'The hardest, most-coupled module chosen first, so the first attempt is the one that fails and the effort is abandoned',
                        'Foreign keys across the new boundary left unmentioned. They cannot survive database-per-service, and replacing one with an id plus an eventual-consistency window is the actual work',
                        'A shared database retained between the two services, which is a distributed monolith with extra network calls',
                        'No transition strategy — a strangler facade routing by endpoint is the standard answer and the question is really about the route table',
                        'Only benefits listed. Losing a foreign key, losing a transaction, losing a stack trace that crosses the boundary and losing the ability to run the whole thing on a laptop are the costs, and an interviewer is waiting to hear at least two',
                        'No circumstances offered under which the answer is no, when "three teams and one deployable" can also be fixed with module boundaries and a release train'
                    ])
                }
            ],
            docs: [
                { title: 'Martin Fowler — Strangler fig application', url: 'https://martinfowler.com/bliki/StranglerFigApplication.html', kind: 'guide' }
            ],
            relatedQuestions: []
        }
    ]
};
