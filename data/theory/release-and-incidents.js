/* ==========================================================================
   data/theory/release-and-incidents.js — module 83, the last in the reading
   path.

   The plan's tagline names the two halves: CI/CD, rollback, and how to talk
   about an outage. Eight chapters, and the last of them is deliberately
   about a conversation rather than a system — the postmortem question is
   asked in almost every senior loop and is answered badly, and the deck ends
   on it because it is the point where the technical track meets the
   behavioural one.

   Backward-compatible releases is the chapter that ties the track together:
   a rolling update means two versions run at once, which makes
   expand-and-contract a requirement rather than a good practice, and which
   is why the schema chapter in persistence, the event-evolution chapter in
   messaging and this one are all the same rule.
   ========================================================================== */

const releaseAndIncidentsModule = {
    id: 'release-and-incidents',
    trackId: 'production',
    order: 83,
    title: 'Releasing and Recovering',
    tagline: 'CI/CD, rollback, and how to talk about an outage.',
    estimatedMinutes: 35,
    prerequisites: ['performance-tuning'],
    docHub: { title: 'Continuous Delivery', url: 'https://martinfowler.com/bliki/ContinuousDelivery.html' },

    chapters: [
        {
            id: 'pipeline-stages',
            title: 'The Pipeline',
            importance: 'should-know',
            summary: 'Build once, test in stages, promote the same artefact. The ordering principle is to fail fast — run the cheap checks first so a compile error is not found after ten minutes of integration tests.',
            interviewAngle: 'The build-once rule is the substance: recompiling per environment means the thing you tested is not the thing you deployed.',
            buildsOn: [],
            blocks: [
                {
                    type: 'table',
                    title: 'Stages, ordered by cost',
                    headers: ['Stage', 'Takes', 'Fails on'],
                    rows: [
                        ['Compile', 'Seconds', 'Syntax, missing types'],
                        ['Unit tests', 'Under a minute', 'Logic'],
                        ['Static analysis, lint, format', 'Seconds', 'Style, obvious defects'],
                        ['Dependency and secret scan', 'Under a minute', 'A critical CVE, a committed credential'],
                        ['Integration tests with Testcontainers', 'A few minutes', 'SQL, mapping, wiring'],
                        ['Build and scan the image', 'A few minutes', 'Base-image vulnerabilities'],
                        ['Deploy to staging, smoke test', 'Minutes', 'Configuration, connectivity'],
                        ['Contract or end-to-end tests', 'Minutes', 'Cross-service assumptions'],
                        ['<strong>Promote the same artefact</strong>', '—', '—']
                    ]
                },
                {
                    type: 'prose',
                    html: '<p><strong>Build once.</strong> The artefact produced by the build stage is the artefact that reaches production, unchanged, with only its configuration differing per environment. Rebuilding per environment means a different dependency snapshot, a different base image and a different compiler invocation — so the thing you tested is provably not the thing you shipped, and the difference is exactly where a "works in staging" bug lives.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Order the stages by <strong>cost of running</strong> rather than by importance. A secret scan takes two seconds and a full integration suite takes six minutes, so scanning first means a committed credential fails the build immediately rather than after somebody has gone for coffee. The feedback loop is the product here, and a pipeline that takes twenty minutes to report a typo is one people work around.</p>'
                }
            ],
            docs: [
                { title: 'ContinuousDelivery', url: 'https://martinfowler.com/bliki/ContinuousDelivery.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'build-tools', questionId: 'branching-and-merge-strategy' }
            ]
        },

        {
            id: 'artifact-and-image-promotion',
            title: 'Promotion',
            importance: 'should-know',
            summary: 'One immutable artefact moves through the environments, identified by a digest. A mutable tag is not an identity, and "latest" is not a version.',
            interviewAngle: 'Immutability by digest is the concrete practice, and the reason is that a tag can be repointed after it was tested.',
            buildsOn: ['pipeline-stages'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'bash',
                    title: 'Promoting by digest, not by tag',
                    code: '# Build once, tagged with the commit -- not with an environment.\ndocker build -t registry/orders:git-4bf92f3 .\ndocker push registry/orders:git-4bf92f3\n\n# Capture the DIGEST. This is the identity; the tag is a label that\n# somebody can move afterwards.\nDIGEST=$(docker inspect --format=\'{{index .RepoDigests 0}}\' \\\n         registry/orders:git-4bf92f3)\n# registry/orders@sha256:9f2c1e7a...\n\n# Every environment deploys THE DIGEST. Staging and production are then\n# provably running identical bytes.\nkubectl set image deploy/orders orders="$DIGEST" -n staging\nkubectl set image deploy/orders orders="$DIGEST" -n production\n\n# Do NOT do this: environment tags are mutable, so what production\n# pulls today may not be what staging tested yesterday.\n#   docker tag ... registry/orders:staging\n#   docker tag ... registry/orders:production',
                    notes: '<p>Deploying by digest also makes rollback exact: the previous digest is a fact recorded in the deployment history, not a tag somebody may have moved. That is the property the rollback chapter depends on.</p>'
                },
                {
                    type: 'tip'
                    , html: '<p>Tag with the <strong>commit sha</strong> as well as any semantic version. During an incident the question is always "which code is running", and a commit sha answers it precisely — including whether a hotfix actually made it out, which a version number does not.</p>'
                }
            ],
            docs: [
                { title: 'OCI Image Specification', url: 'https://github.com/opencontainers/image-spec/blob/main/spec.md', kind: 'spec' }
            ],
            relatedQuestions: [
                { topicId: 'observability-ops', questionId: 'deployment-strategies' },
                { topicId: 'build-tools', questionId: 'reproducible-builds' }
            ]
        },

        {
            id: 'blue-green-and-canary',
            title: 'Blue-Green and Canary',
            importance: 'must-know',
            summary: 'Two full environments switched at once, or a small share of traffic to the new version first. Canary catches problems that only appear under real traffic; blue-green switches back instantly.',
            interviewAngle: 'The comparison including plain rolling updates is the answer, and the database constraint applies to all three equally.',
            buildsOn: ['artifact-and-image-promotion'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'Three strategies',
                    left: 'Blue-green',
                    right: 'Canary',
                    rows: [
                        { aspect: 'Mechanism', left: 'Two full environments; switch the router', right: 'A few pods on the new version; shift traffic gradually' },
                        { aspect: 'Blast radius of a bad release', left: '<strong>Everyone, instantly</strong> — then switch back', right: '<strong>A few percent</strong>' },
                        { aspect: 'Rollback', left: 'Instant — flip the router', right: 'Shift traffic back' },
                        { aspect: 'Resource cost', left: '<strong>Double, during the switch</strong>', right: 'Marginal' },
                        { aspect: 'Detects load-dependent problems', left: 'Only after the full switch', right: '<strong>Yes, on real traffic, at low risk</strong>' },
                        { aspect: 'Needs metrics per version', left: 'No', right: '<strong>Yes — otherwise you cannot tell it is bad</strong>' },
                        { aspect: 'Plain rolling update', left: '', right: 'Neither: gradual, cheap, and no traffic control — the default, and adequate for most releases' }
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>Canary is the stronger technique because it catches the class of defect that only appears under real traffic — a slow query on production data volumes, a memory leak that needs hours, a downstream that behaves differently at scale. It requires metrics <strong>tagged by version</strong>, which is why the actuator module recommended a version tag: without it, the canary\'s error rate is averaged into the fleet\'s and is invisible.</p><p>The constraint all three share is the database. There is one, both versions use it, and no traffic-routing strategy changes that — which is the next chapter.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Automate the canary decision rather than watching a dashboard. Argo Rollouts and Flagger both compare the canary\'s error rate and latency against the baseline over a window and roll back automatically if it regresses. A human watching a graph at 2am is a slower and less reliable version of the same comparison — and the automation also makes the criteria explicit, which is worth having written down.</p>'
                }
            ],
            docs: [
                { title: 'BlueGreenDeployment', url: 'https://martinfowler.com/bliki/BlueGreenDeployment.html', kind: 'guide' },
                { title: 'CanaryRelease', url: 'https://martinfowler.com/bliki/CanaryRelease.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'observability-ops', questionId: 'deployment-strategies' }
            ]
        },

        {
            id: 'feature-flags',
            title: 'Feature Flags',
            importance: 'must-know',
            summary: 'Separate deploying code from releasing behaviour. It makes trunk-based development workable and it is the fastest rollback available — a config change rather than a deployment.',
            interviewAngle: 'The deploy/release separation is the idea. The follow-up worth pre-empting is flag debt, because flags left in place become permanent untested branches.',
            buildsOn: ['blue-green-and-canary'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>A feature flag decouples two things that are normally welded together: <strong>deploying</strong> code, which is a technical event, and <strong>releasing</strong> behaviour, which is a product decision. Once separated, incomplete work can be merged and deployed behind an off flag, so a long-lived branch is unnecessary and trunk-based development becomes practical.</p><p>It is also the fastest rollback in existence. Turning a flag off is a configuration change that takes effect in seconds, with no deployment, no image pull and no rolling update.</p>'
                },
                {
                    type: 'types',
                    title: 'Four kinds of flag, with different lifetimes',
                    items: [
                        { name: 'Release toggle', html: '<p>Hides incomplete work. <strong>Short-lived</strong> — removed as soon as the feature is fully on.</p>' },
                        { name: 'Experiment flag', html: '<p>A/B test. Lives as long as the experiment, then one branch is deleted.</p>' },
                        { name: 'Ops toggle / kill switch', html: '<p>Turn off an expensive feature under load. <strong>Long-lived by design</strong>, and genuinely valuable during an incident.</p>' },
                        { name: 'Permission toggle', html: '<p>Per-plan or per-tenant behaviour. Permanent, and it is really configuration rather than a flag.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>Flag debt is real and it compounds.</strong> Ten boolean flags is 1,024 possible states, of which you test perhaps two. Every stale flag is a code path that still compiles, is still reachable, and has not been executed in a year — so when a configuration change flips it, it runs untested code in production. Give every release toggle an owner and an expiry date, and treat removing it as part of finishing the feature rather than as a follow-up ticket.</p>'
                }
            ],
            docs: [
                { title: 'FeatureToggle', url: 'https://martinfowler.com/articles/feature-toggles.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'observability-ops', questionId: 'deployment-strategies' }
            ]
        },

        {
            id: 'backward-compatible-releases',
            title: 'Two Versions at Once',
            importance: 'must-know',
            summary: 'Every deployment strategy runs the old and new versions simultaneously against one database. Expand and contract is therefore a requirement, not a refinement.',
            interviewAngle: 'The chapter that ties the whole track together, and the one rule — never do the expand and the contract in the same release — is what makes it actionable.',
            buildsOn: ['feature-flags'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>Rolling update, blue-green, canary: all three have a period in which <strong>version N and version N+1 are both serving traffic, against the same database and the same topics.</strong> That is not a corner case to handle; it is the normal condition of every deployment.</p><p>So every change to shared state has to be compatible in both directions — the old code must tolerate what the new code writes, and the new code must tolerate what the old code left behind. <strong>Expand and contract</strong> is the procedure that guarantees it.</p>'
                },
                {
                    type: 'table',
                    title: 'Renaming a column, safely, across three releases',
                    headers: ['Release', 'Schema', 'Code', 'Why it is safe'],
                    rows: [
                        ['<strong>1 — expand</strong>', 'Add <code>email_address</code>, nullable. Backfill.', 'Write both columns; read the old one', 'Old pods still work: their column is present and maintained'],
                        ['<strong>2 — migrate</strong>', 'Unchanged', 'Write both; <strong>read the new one</strong>', 'Both versions read a column both versions write'],
                        ['<strong>3 — contract</strong>', 'Drop <code>email</code>', 'Write and read the new one only', 'No running version references the dropped column']
                    ]
                },
                {
                    type: 'types',
                    title: 'The same rule, in the four places it applies',
                    items: [
                        { name: 'Database schema', html: '<p>Never drop or rename in the release that stops using it. Add nullable, backfill, switch reads, drop later.</p>' },
                        { name: 'API contract', html: '<p>Add optional fields; never remove one until telemetry says nobody requests it. The versioning chapter from the API-styles module.</p>' },
                        { name: 'Event and message formats', html: '<p>Additive only, with tolerant readers. A consumer on the old version must not fail on a new field.</p>' },
                        { name: 'Cache entries', html: '<p>Two versions share a Redis. A changed serialised shape means one of them cannot read the other\'s entries — version the cache key.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>The single rule that prevents almost all of this: never do the expand and the contract in the same release.</strong> Adding a non-nullable column with a default and starting to write it in one deployment breaks every old pod the instant the migration runs — before a single new pod is ready. The three-release dance feels slow and it is the only version that is safe on a rolling update, which is every update.</p>'
                }
            ],
            docs: [
                { title: 'ParallelChange', url: 'https://martinfowler.com/bliki/ParallelChange.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'sql-databases', questionId: 'migrations-and-zero-downtime' },
                { topicId: 'rest-api', questionId: 'api-versioning' }
            ]
        },

        {
            id: 'rollback-vs-roll-forward',
            title: 'Rollback or Roll Forward',
            importance: 'must-know',
            summary: 'Rollback is fast and is not always possible — a migration that ran cannot be un-run. Decide which one this change supports before you deploy it, not during the incident.',
            interviewAngle: 'Knowing that rollback is unavailable once a destructive migration has run is the substance, and it is why the previous chapter matters operationally.',
            buildsOn: ['backward-compatible-releases'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'Two ways out',
                    left: 'Rollback',
                    right: 'Roll forward',
                    rows: [
                        { aspect: 'Speed', left: '<strong>Seconds to a minute</strong>', right: 'A full build and pipeline run' },
                        { aspect: 'Risk', left: 'Low — a known-good version', right: 'A change written under pressure' },
                        { aspect: 'Available when a migration ran', left: '<strong>Only if it was expand-only</strong>', right: 'Always' },
                        { aspect: 'Available for a data-corrupting bug', left: 'It stops the bleeding; it does not repair', right: 'Needed for the repair' },
                        { aspect: 'Default choice', left: '<strong>Yes — stop the harm first</strong>', right: 'When rollback is impossible or insufficient' }
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>The default during an incident is <strong>roll back first, diagnose afterwards</strong>. A known-good version is a lower-risk change than a fix written by a tired person at two in the morning, and it converts an outage into a bug ticket.</p><p>What makes rollback unavailable is almost always the database. A migration that dropped a column, changed a type or rewrote data cannot be reversed by deploying older code — the old code expects a schema that no longer exists. That is the operational consequence of the previous chapter: <strong>expand-and-contract is what keeps rollback possible</strong>, and skipping it removes your fastest recovery option at the moment you most need it.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>Decide before deploying, and write it down. "This release is expand-only, so rollback is safe" or "this release drops a column, so we are committed after the migration runs — the recovery path is roll forward". Ten seconds at review time, and it removes the worst conversation in an incident, which is discovering the constraint while the service is down.</p>'
                }
            ],
            docs: [
                { title: 'ParallelChange', url: 'https://martinfowler.com/bliki/ParallelChange.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'sql-databases', questionId: 'migrations-and-zero-downtime' },
                { topicId: 'observability-ops', questionId: 'deployment-strategies' }
            ]
        },

        {
            id: 'on-call-and-runbooks',
            title: 'On Call',
            importance: 'should-know',
            summary: 'An alert should be actionable, urgent and rare. A runbook turns an alert into a procedure, and the best measure of an on-call rotation is how few pages it produces.',
            interviewAngle: 'Alert fatigue is the failure to name: a rotation with twenty pages a night has trained everyone to ignore them, including the real one.',
            buildsOn: ['rollback-vs-roll-forward'],
            blocks: [
                {
                    type: 'types',
                    title: 'What makes an alert worth waking somebody for',
                    items: [
                        { name: 'Actionable', html: '<p>There is something the person can do at 3am. "CPU is 80%" is not actionable; "the checkout error rate is 12%" is.</p>' },
                        { name: 'Urgent', html: '<p>It cannot wait until morning. Anything that can is a ticket, not a page — and routing it to a page anyway is how the rotation is destroyed.</p>' },
                        { name: 'Symptom-based, not cause-based', html: '<p>Alert on "orders are failing", not on every possible cause of it. Symptom alerts are fewer, and they catch causes nobody predicted.</p>' },
                        { name: 'Documented', html: '<p>A runbook link in the alert itself: what it means, what to check, what to do, who to escalate to.</p>' },
                        { name: 'Rare', html: '<p><strong>The property everything else serves.</strong> An alert that fires nightly is noise, and noise is worse than silence because it trains people to dismiss the page.</p>' }
                    ]
                },
                {
                    type: 'prose',
                    html: '<p>The strongest single practice is <strong>alerting on SLO burn rate</strong> rather than on raw thresholds. An error budget — say 99.9% availability, so 43 minutes a month — turns "is this bad enough to wake somebody" into arithmetic: a burn rate that would exhaust the month\'s budget in an hour is a page, and one that would exhaust it in a week is a ticket. It removes the argument and it produces far fewer pages.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>A runbook should be written by the person who was last paged for that alert, immediately afterwards, while they still remember what they checked. A runbook written in advance describes what somebody imagined; one written after an incident describes what actually worked — including the dashboard they went to first and the query that gave the answer.</p>'
                }
            ],
            docs: [
                { title: 'Google SRE — Alerting on SLOs', url: 'https://sre.google/workbook/alerting-on-slos/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'observability-ops', questionId: 'what-to-alert-on' }
            ]
        },

        {
            id: 'postmortems-and-the-interview-answer',
            title: 'The Postmortem, and the Interview Answer',
            importance: 'must-know',
            summary: 'Blameless, specific, and honest about what was not known at the time. The structure that makes a good postmortem is the structure that makes a good answer to "tell me about an outage".',
            interviewAngle: 'Asked in almost every senior loop and answered badly. The failure is either blaming somebody or being vague; the fix is a timeline with decisions and their reasons.',
            buildsOn: ['on-call-and-runbooks'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p><strong>Blameless</strong> does not mean nobody made a mistake. It means the interesting question is why the mistake was <em>possible</em> and why it was not caught — because a person who has been blamed reports less next time, and the same gap remains for the next person. "Why was it possible to deploy a migration that dropped a column?" is a question with a fixable answer; "who approved it?" is not.</p><p>The same structure produces the interview answer, and the reason it works is that it demonstrates judgement under uncertainty rather than knowledge in hindsight.</p>'
                },
                {
                    type: 'types',
                    title: 'The structure, for the document and for the answer',
                    items: [
                        { name: 'Impact, quantified', html: '<p>"Checkout was unavailable for 22 minutes; approximately 1,400 orders failed." Not "there was an outage." The number is what makes the rest matter.</p>' },
                        { name: 'Timeline, with what was known then', html: '<p>Detected at 14:02, first hypothesis at 14:05, ruled out at 14:11, cause found at 14:19. <strong>Include the wrong hypotheses</strong> — they are the evidence that you were reasoning rather than remembering.</p>' },
                        { name: 'The cause, specifically', html: '<p>"A composite index was missing, so a query for one large customer scanned 340,000 rows and held a connection for three seconds." Not "a performance issue."</p>' },
                        { name: 'What you did, and why', html: '<p>The decision and its reasoning at the time. "We rolled back rather than fixing forward because the migration was expand-only, so rollback was safe and faster."</p>' },
                        { name: 'What made it possible', html: '<p>The systemic gap. No alert on pool saturation; no statement timeout; no test at production data volumes.</p>' },
                        { name: 'What changed', html: '<p>Concrete follow-ups with owners. <strong>And say which ones actually shipped</strong> — most postmortem actions do not, and being honest about that is more credible than a tidy list.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>The two ways this answer fails in an interview are opposite and equally common. <strong>Blaming</strong> — "the DBA pushed a migration without telling us" — reads as somebody who will do the same to their next team. <strong>Vagueness</strong> — "we had a database issue and fixed it" — reads as somebody who was in the room rather than in the investigation. A specific cause, a decision with a reason, and one systemic fix is the whole shape, and it takes ninety seconds.</p>'
                },
                {
                    type: 'prose',
                    html: '<p>This is the last chapter of the reading path, and it is a conversation rather than a system on purpose. Everything in the eight tracks before it is the material an interview tests; this is the register in which it gets discussed — specific, honest about uncertainty, and more interested in what made a failure possible than in who was holding it when it broke.</p>'
                }
            ],
            docs: [
                { title: 'Google SRE — Postmortem Culture', url: 'https://sre.google/sre-book/postmortem-culture/', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'behavioural-project', questionId: 'describing-an-incident' },
                { topicId: 'behavioural-project', questionId: 'a-decision-you-got-wrong' }
            ]
        }
    ]
};
