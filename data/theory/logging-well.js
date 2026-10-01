/* ==========================================================================
   data/theory/logging-well.js — module 79 in the reading path

   Six chapters, and the plan's tagline names the three properties:
   structured, levelled, and free of the things that get you fined.

   Logging is the signal teams get least deliberate about, and it is the most
   expensive one at volume — so two of the six chapters are about restraint
   rather than technique. What never to log is a compliance chapter as much
   as a security one, and log volume and cost exists because a logging bill
   larger than the compute bill is a common and avoidable outcome.
   ========================================================================== */

const loggingWellModule = {
    id: 'logging-well',
    trackId: 'production',
    order: 79,
    title: 'Logging Well',
    tagline: 'Structured, levelled, and free of the things that get you fined.',
    estimatedMinutes: 25,
    prerequisites: ['metrics-and-tracing'],
    docHub: { title: 'Spring Boot — Logging', url: 'https://docs.spring.io/spring-boot/reference/features/logging.html' },

    chapters: [
        {
            id: 'levels-and-when-to-use-them',
            title: 'The Levels, and What Each One Means',
            importance: 'must-know',
            summary: 'A level is a statement about who should react and how urgently. ERROR means somebody must act; if nobody acts on your ERRORs, they are WARNs.',
            interviewAngle: 'The definition by audience rather than by severity is the useful framing, and it produces a rule that can actually be applied in review.',
            buildsOn: [],
            blocks: [
                {
                    type: 'table',
                    title: 'The levels, defined by what should happen',
                    headers: ['Level', 'Means', 'Example', 'Volume'],
                    rows: [
                        ['<code>ERROR</code>', '<strong>Somebody must act.</strong> Usually alerting.', 'Cannot reach the database; an unhandled exception', 'Should be near zero'],
                        ['<code>WARN</code>', 'Unexpected, handled, worth knowing about', 'Retry succeeded on the third attempt; a deprecated endpoint was called', 'Low'],
                        ['<code>INFO</code>', 'A significant business or lifecycle event', 'Application started; order placed; consumer rebalanced', 'Moderate'],
                        ['<code>DEBUG</code>', 'Detail for diagnosing a specific problem', 'The request payload; the chosen strategy', 'High — off in production'],
                        ['<code>TRACE</code>', 'Very fine detail', 'Every loop iteration', 'Very high — off everywhere']
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>The definition by audience is what makes the levels usable. <strong>ERROR means somebody must act</strong>, so a validation failure — the client sent a bad request and got a 400 — is not an ERROR, however much it looks like one to the code. Nobody is going to be paged because a user typed an invalid email address.</p><p>The test to apply in review: if this line fires a thousand times a day and nobody investigates any of them, it is not an ERROR. Levels that are inflated stop being a signal, and the first genuine ERROR is then invisible among them.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Log levels are changeable at run time through the <code>loggers</code> actuator endpoint, which is the reason to expose it. During an incident you can raise one package to DEBUG for two minutes on one instance and put it back, without a deployment and without turning on debug logging for the whole application — which would produce a volume nobody can read and a bill nobody expected.</p>'
                }
            ],
            docs: [
                { title: 'Spring Boot — Log Levels', url: 'https://docs.spring.io/spring-boot/reference/features/logging.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'observability-ops', questionId: 'what-to-log' }
            ]
        },

        {
            id: 'structured-logging',
            title: 'Structured Logging',
            importance: 'must-know',
            summary: 'JSON with named fields rather than a prose sentence. It is the difference between grepping and querying, and it is a configuration change rather than a code one.',
            interviewAngle: 'Boot 3.4 added first-class structured logging, so the answer changed recently — it is a property now rather than a Logback encoder dependency.',
            buildsOn: ['levels-and-when-to-use-them'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'yaml',
                    title: 'Turning it on, and what it produces',
                    code: '# Spring Boot 3.4+: built in. Before that, logstash-logback-encoder.\nlogging:\n  structured:\n    format:\n      console: ecs        # or gelf, logstash\n  include-application-name: true\n\n# A line then looks like this rather than a sentence:\n# {\n#   "@timestamp": "2026-09-28T14:02:11.417Z",\n#   "log.level": "INFO",\n#   "service.name": "orders",\n#   "trace.id": "4bf92f3577b34da6a3ce929d0e0e4736",\n#   "span.id": "00f067aa0ba902b7",\n#   "message": "Order placed",\n#   "orderId": "ord_8812",\n#   "customerId": "cus_419",\n#   "totalMinor": 429900\n# }\n#\n# Which makes this a QUERY rather than a grep:\n#   log.level:ERROR AND service.name:orders AND totalMinor > 100000',
                    notes: '<p>The practical difference is aggregation. "How many orders over ₹1000 failed yesterday, by customer" is a query against structured fields and is impossible against prose, however good the grep — because the number is embedded in a sentence and the sentence format changes when somebody rewords the message.</p>'
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Getting fields into the line, not into the sentence',
                    code: '// Prose. The order id is inside a string; nothing can index it.\nlog.info("Order {} placed by {} for {}", orderId, customerId, total);\n\n// Structured, per event, with SLF4J 2\'s fluent API.\nlog.atInfo()\n   .setMessage("Order placed")\n   .addKeyValue("orderId", orderId)\n   .addKeyValue("customerId", customerId)\n   .addKeyValue("totalMinor", total.minorUnits())\n   .log();\n\n// Structured, for everything within a scope, via the MDC.\ntry (var ignored = MDC.putCloseable("orderId", orderId)) {\n    log.info("Reserving stock");     // carries orderId\n    log.info("Taking payment");      // carries orderId\n}                                    // removed automatically',
                    notes: '<p><code>MDC.putCloseable</code> in a try-with-resources is the pattern to prefer over <code>put</code> and <code>remove</code>: it cannot be forgotten on an exception path, which is exactly how a stale MDC value ends up attributed to the next request on a pooled thread.</p>'
                }
            ],
            docs: [
                { title: 'Structured Logging', url: 'https://docs.spring.io/spring-boot/reference/features/logging.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'observability-ops', questionId: 'correlation-ids-and-structured-logs' }
            ]
        },

        {
            id: 'mdc-and-request-context',
            title: 'MDC and Request Context',
            importance: 'should-know',
            summary: 'A thread-local map of key-values attached to every log line from that thread. Powerful, and it is a ThreadLocal with all of the consequences that implies.',
            interviewAngle: 'Third appearance of the ThreadLocal propagation problem in this deck — security context, trace context, MDC. Naming it as one problem is the depth.',
            buildsOn: ['structured-logging'],
            blocks: [
                {
                    type: 'table',
                    title: 'What belongs in the MDC',
                    headers: ['Key', 'Set by', 'Why'],
                    rows: [
                        ['<code>traceId</code>, <code>spanId</code>', 'The tracing instrumentation', 'Correlation across services'],
                        ['<code>userId</code>', 'A filter, from the token', '<strong>The id, never the email or the name</strong>'],
                        ['<code>tenantId</code>', 'A filter', 'Multi-tenant filtering of logs'],
                        ['<code>requestId</code>', 'A filter, if the client sent one', 'Matching a client-reported problem'],
                        ['<code>orderId</code> and similar', 'The code, in a scope', 'Following one business operation'],
                        ['A token or a password', '<strong>Never</strong>', 'It would appear on every subsequent line']
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>The MDC does not follow a thread change, and it must be cleared on the way out.</strong> Both halves bite. A value set in a request filter is absent inside an <code>@Async</code> method or a parallel stream, so those lines lose their correlation; and a value that is not removed stays on the pooled thread and is attributed to the next request. That is the same <code>ThreadLocal</code> problem as <code>SecurityContextHolder</code> and the trace context — <strong>one problem, three symptoms</strong> — and the fix is the same family: a context-propagating executor, and <code>putCloseable</code> rather than <code>put</code>.</p>'
                }
            ],
            docs: [
                { title: 'SLF4J MDC', url: 'https://www.slf4j.org/manual.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'observability-ops', questionId: 'correlation-ids-and-structured-logs' },
                { topicId: 'concurrency', questionId: 'threadlocal-leaks' }
            ]
        },

        {
            id: 'what-never-to-log',
            title: 'What Never Goes in a Log',
            importance: 'must-know',
            summary: 'Credentials, personal data, card numbers, tokens, and whole request bodies that may contain any of them. Logs are copied, shipped, retained and searchable by many people.',
            interviewAngle: 'A compliance answer as much as a security one, and the argument that lands is that a log is a data store with the widest access of any in the system.',
            buildsOn: ['mdc-and-request-context'],
            blocks: [
                {
                    type: 'types',
                    title: 'The categories, and why each one matters',
                    items: [
                        { name: 'Credentials and secrets', html: '<p>Passwords, API keys, tokens, connection strings. A token in a log is a valid credential in a system with far broader access than the one it authenticates to.</p>' },
                        { name: 'Personal data', html: '<p>Names, emails, addresses, phone numbers, dates of birth. Under GDPR a log is processing, it is subject to retention limits, and it must be included in an erasure request — which is a problem if it is in an append-only archive.</p>' },
                        { name: 'Payment data', html: '<p>Card numbers, CVV. PCI DSS prohibits it outright, and the fines are the plan\'s "things that get you fined".</p>' },
                        { name: 'Health and special-category data', html: '<p>Higher protection, and the same rules with sharper consequences.</p>' },
                        { name: 'Whole request or response bodies', html: '<p>The most common route by which all of the above ends up in a log, and it is added for debugging by somebody who meant well.</p>' },
                        { name: 'Session identifiers', html: '<p>A session id in a log is a session somebody can hijack.</p>' }
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>The argument that makes this concrete: <strong>a log is a data store with the widest access of any in the system.</strong> The database is behind credentials and a network boundary; the logs are in a search tool that engineering, support, operations and often analytics can all query, retained for months, replicated to a backup, and exported to a vendor. Anything written there is effectively published to the whole organisation.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Two defences that work in practice. <strong>Log the identifier, not the object</strong> — <code>customerId=cus_419</code> rather than the customer record — which is more useful anyway because the id is what you would search by. And put a <strong>redacting layer in the log pipeline</strong> as a backstop, matching card-number and token patterns, because the failure mode is somebody adding a well-meaning <code>toString()</code> and nobody noticing for a year.</p>'
                }
            ],
            docs: [
                { title: 'OWASP Logging Cheat Sheet', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'observability-ops', questionId: 'what-to-log' }
            ]
        },

        {
            id: 'log-volume-and-cost',
            title: 'Volume and Cost',
            importance: 'should-know',
            summary: 'Logs are ingested, indexed, stored and queried, and every one of those is billed. A logging bill larger than the compute bill is common and is a design outcome.',
            interviewAngle: 'The arithmetic is the answer. A per-request INFO line at moderate traffic is hundreds of gigabytes a month, and that number makes the argument by itself.',
            buildsOn: ['what-never-to-log'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>The arithmetic is worth doing once. One thousand requests per second, three log lines each at 500 bytes, is 1.5 MB per second — about <strong>130 GB per day</strong>, or four terabytes a month, indexed and retained. At any commercial per-gigabyte rate that is a substantial line item, and it is produced by a logging policy nobody deliberately chose.</p><p>The largest single contributor is almost always a per-request INFO line that was useful during development and never removed.</p>'
                },
                {
                    type: 'types',
                    title: 'Reducing it without losing the signal',
                    items: [
                        { name: 'Do not log a line per request', html: '<p>The access log already exists at the ingress, and <code>http.server.requests</code> already counts them. An application INFO per request duplicates both.</p>' },
                        { name: 'Log the exceptional, count the routine', html: '<p>"Order placed" a million times a day is a <strong>counter</strong>. "Order rejected for an unexpected reason" is a log line.</p>' },
                        { name: 'Sample the noisy ones', html: '<p>One in a hundred for a high-volume DEBUG path, when it is on at all.</p>' },
                        { name: 'Tier the retention', html: '<p>Seven days hot and searchable, ninety days in cheap object storage. Most queries are about the last two days.</p>' },
                        { name: 'Turn down third-party loggers', html: '<p>A chatty library at DEBUG can dominate the volume, and the setting is one line.</p>' },
                        { name: 'Use async appenders', html: '<p>Synchronous logging to a slow destination adds its latency to <em>every request</em>. Async decouples it, at the cost of losing the buffer on a hard kill.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>String concatenation in a log call happens whether or not the line is emitted.</strong> <code>log.debug("state: " + expensiveToString())</code> builds the string and calls the method even at INFO level, because the argument is evaluated before <code>debug</code> is entered. Parameterised placeholders — <code>log.debug("state: {}", value)</code> — defer it, and the fluent <code>atDebug()</code> API or a lambda defers it entirely. At high volume this is measurable CPU spent producing strings that are discarded.</p>'
                }
            ],
            docs: [
                { title: 'Logback — Appenders', url: 'https://logback.qos.ch/manual/appenders.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'observability-ops', questionId: 'what-to-log' },
                { topicId: 'cloud', questionId: 'cloud-cost-awareness' }
            ]
        },

        {
            id: 'logging-exceptions-once',
            title: 'Logging an Exception Once',
            importance: 'must-know',
            summary: 'Log it, or rethrow it — not both. Catching, logging and rethrowing at every layer produces the same failure five times with five stack traces.',
            interviewAngle: 'A code-review-level answer with a clear rule, and the duplicate-stack-trace symptom is instantly recognisable to anyone who has read production logs.',
            buildsOn: ['log-volume-and-cost'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The anti-pattern, and the rule that replaces it',
                    code: '// WRONG: log and rethrow. Each layer does it, so one failure appears\n// five times with five stack traces, and the ERROR count is 5x the\n// number of actual errors.\ntry {\n    gateway.authorise(payment);\n} catch (GatewayException e) {\n    log.error("Payment failed", e);     // logged here...\n    throw e;                            // ...and again by every caller\n}\n\n// RIGHT: rethrow with context, and log ONCE at the boundary that\n// decides what to do about it.\ntry {\n    gateway.authorise(payment);\n} catch (GatewayException e) {\n    throw new PaymentFailed(payment.id(), e);   // cause preserved\n}\n\n@ExceptionHandler(PaymentFailed.class)\nProblemDetail onPaymentFailed(PaymentFailed e) {\n    log.error("Payment failed for {}", e.paymentId(), e);   // ONCE\n    return ProblemDetail.forStatusAndDetail(BAD_GATEWAY, "Payment failed");\n}\n\n// And the two ways to log an exception WRONG:\nlog.error("Failed: " + e.getMessage());     // no stack trace at all\nlog.error("Failed: {}", e);                 // toString(), not the trace\nlog.error("Failed for {}", id, e);          // correct -- e is LAST',
                    notes: '<p>The last three lines are a real and frequent defect. SLF4J treats a trailing <code>Throwable</code> specially and prints the stack trace; used as a placeholder argument it prints <code>toString()</code> and the trace is lost — leaving an ERROR line that says something failed and gives no way to find out where.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The rule to state in a review: <strong>a method either handles an exception or propagates it, and only the one that handles it logs.</strong> Everything in between may add context by wrapping — which preserves the cause and the original stack trace — but must not log. That gives one ERROR per failure, with a full chain of causes, at the layer that actually decided what to do.</p>'
                }
            ],
            docs: [
                { title: 'SLF4J — Parameterized logging', url: 'https://www.slf4j.org/faq.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'java-language', questionId: 'exception-translation-and-wrapping' },
                { topicId: 'rest-api', questionId: 'exception-to-status-mapping' }
            ]
        }
    ]
};
