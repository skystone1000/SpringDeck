/* ==========================================================================
   data/theory/async-and-scheduling.js — module 40 in the reading path

   Seven chapters on work that outlives, or runs beside, a request. The
   module leans on two earlier ones: everything here is proxy-based, so the
   AOP module's trap applies unchanged, and everything here runs on an
   executor, so the executors module's sizing argument applies too.
   ========================================================================== */

const asyncAndSchedulingModule = {
    id: 'async-and-scheduling',
    trackId: 'web-api',
    order: 40,
    title: 'Async, Scheduling and Background Work',
    tagline: '@Async, @Scheduled, and the jobs that outlive a request.',
    estimatedMinutes: 35,
    prerequisites: ['aop-and-proxies', 'executors-and-futures'],
    docHub: { title: 'Task Execution and Scheduling', url: 'https://docs.spring.io/spring-boot/reference/features/task-execution-and-scheduling.html' },

    chapters: [
        {
            id: 'async-and-its-executor',
            title: '@Async and the Pool It Runs On',
            importance: 'must-know',
            summary: 'One annotation, and the default executor behind it is unbounded. Naming your own is not tuning; it is stopping a traffic spike from creating threads until the JVM cannot.',
            interviewAngle: 'The question is "how does @Async work". The mechanism is a proxy submitting to an executor, and the follow-up that matters is which executor — because the historical default creates a new thread per task with no ceiling.',
            buildsOn: [],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'Enabling it, and giving it a pool worth having',
                    code: '@Configuration\n@EnableAsync\nclass AsyncConfig {\n\n    @Bean("emailExecutor")\n    Executor emailExecutor() {\n        var executor = new ThreadPoolTaskExecutor();\n        executor.setCorePoolSize(4);\n        executor.setMaxPoolSize(8);\n        executor.setQueueCapacity(200);           // BOUNDED\n        executor.setThreadNamePrefix("email-");   // for the thread dump\n        executor.setRejectedExecutionHandler(\n                new ThreadPoolExecutor.CallerRunsPolicy());\n        executor.setWaitForTasksToCompleteOnShutdown(true);\n        executor.setAwaitTerminationSeconds(30);\n        executor.initialize();\n        return executor;\n    }\n}\n\n@Service\nclass Mailer {\n    @Async("emailExecutor")            // NAME IT. The default is not a pool.\n    void send(Invoice invoice) { ... }\n}',
                    notes: '<p>Every setting here appeared in the executors module with the same argument. The queue is bounded so overload becomes rejection rather than an <code>OutOfMemoryError</code>; the rejection policy is <code>CallerRunsPolicy</code> so the producer slows itself; the name prefix is what makes a 3am thread dump readable.</p>'
                },
                {
                    type: 'version',
                    title: 'What runs @Async when you do not say',
                    items: [
                        { version: 'Spring Boot 2.x', state: 'was', html: '<p>A <code>SimpleAsyncTaskExecutor</code>, which is <strong>not a pool</strong> — it creates a new thread per task, without limit. Fine under test, and a thread-creation failure under a spike.</p>' },
                        { version: 'Spring Boot 3.2', state: 'changed', html: '<p>With <code>spring.threads.virtual.enabled=true</code> the auto-configured executor becomes virtual-thread based, so unbounded thread creation stops being expensive — and the downstream limit still needs expressing separately.</p>' },
                        { version: 'Spring Framework 6.1', state: 'changed', html: '<p><code>SimpleAsyncTaskExecutor</code> gained a concurrency limit and a virtual-thread mode, so the historical default is less dangerous than it was. Naming your own executor is still the right practice.</p>' }
                    ]
                },
                {
                    type: 'pitfall',
                    html: '<p><strong><code>@Async</code> is proxy-based, so an internal call runs synchronously.</strong> Same trap as <code>@Transactional</code>, same mechanism, and here the symptom is the absence of a symptom: the work happens, the result is correct, and the caller was blocked for the whole duration when it believed it was not. Nothing throws. See the AOP module — the four annotations fail identically because they fail for one reason.</p>'
                }
            ],
            docs: [
                { title: 'Using @Async', url: 'https://docs.spring.io/spring-framework/reference/integration/scheduling.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'aop-proxies', questionId: 'async-returns-null' }
            ]
        },

        {
            id: 'async-exception-handling',
            title: 'Where an @Async Exception Goes',
            importance: 'must-know',
            summary: 'A void @Async method that throws sends its exception to a handler that, by default, does very little. A CompletableFuture return type keeps it where you can find it.',
            interviewAngle: 'The trap question is what @Async can return. A plain object cannot work — the proxy must return before the value exists — so Spring returns null, and the caller gets an NPE from a method that visibly returns a value.',
            buildsOn: ['async-and-its-executor'],
            blocks: [
                {
                    type: 'table',
                    title: 'Return types, and where a failure ends up',
                    headers: ['Return type', 'Works', 'A thrown exception goes to'],
                    rows: [
                        ['<code>void</code>', 'Yes', '<code>AsyncUncaughtExceptionHandler</code> — <strong>configure one</strong>'],
                        ['<code>CompletableFuture&lt;T&gt;</code>', '<strong>Yes, prefer this</strong>', 'The future. Surfaces at <code>get()</code> or <code>join()</code>'],
                        ['<code>Future&lt;T&gt;</code>', 'Yes', 'The future. Same silent-failure risk as <code>submit()</code>'],
                        ['A plain object', '<strong>No</strong>', 'n/a — the caller gets <code>null</code>, then an NPE'],
                        ['<code>Mono</code> / <code>Flux</code>', 'Pointless', 'They are already deferred; <code>@Async</code> adds a thread hop']
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The handler that stops void failures vanishing',
                    code: '@Configuration\n@EnableAsync\nclass AsyncConfig implements AsyncConfigurer {\n\n    @Override\n    public AsyncUncaughtExceptionHandler getAsyncUncaughtExceptionHandler() {\n        return (throwable, method, params) -> {\n            log.error("async {} failed with args {}",\n                    method.getName(), Arrays.toString(params), throwable);\n            meter.counter("async.failed", "method", method.getName()).increment();\n        };\n    }\n}',
                    notes: '<p>Without this, a failure in a <code>void</code> <code>@Async</code> method reaches <code>SimpleAsyncUncaughtExceptionHandler</code>, which logs it — at a level and in a place nobody is watching, with no metric and no alert. The task looked like it succeeded because nothing asked whether it had.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The shape of the whole answer: <em>"Return <code>CompletableFuture</code> so the failure is in the value and the caller can compose or handle it. If it genuinely is fire-and-forget, return <code>void</code> and configure an <code>AsyncUncaughtExceptionHandler</code> that logs and increments a counter — otherwise the failure exists and nobody knows."</em> That is the same argument as <code>submit()</code> against <code>execute()</code> in the executors module.</p>'
                }
            ],
            docs: [
                { title: 'AsyncConfigurer', url: 'https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/scheduling/annotation/AsyncConfigurer.html', kind: 'api' }
            ],
            relatedQuestions: [
                { topicId: 'aop-proxies', questionId: 'async-returns-null' },
                { topicId: 'concurrency', questionId: 'submit-swallows-exceptions' }
            ]
        },

        {
            id: 'scheduled-and-cron',
            title: '@Scheduled',
            importance: 'must-know',
            summary: 'Three timing modes with genuinely different semantics, and a scheduler that is single-threaded by default.',
            interviewAngle: 'fixedRate against fixedDelay is the reliable question, and the discriminating half is what fixedRate does when a run overruns — the answer depends on the pool size, which is one by default.',
            buildsOn: ['async-and-its-executor'],
            blocks: [
                {
                    type: 'comparison',
                    title: 'fixedRate against fixedDelay',
                    left: 'fixedRate',
                    right: 'fixedDelay',
                    rows: [
                        { aspect: 'Measures from', left: 'The <strong>start</strong> of the previous run', right: 'The <strong>end</strong> of the previous run' },
                        { aspect: 'A run takes longer than the interval', left: 'The next is due immediately', right: 'The gap is always the full delay' },
                        { aspect: 'With a one-thread scheduler', left: '<strong>Runs pile up and execute back to back</strong>', right: 'No pile-up possible' },
                        { aspect: 'Guarantees', left: 'Frequency, on average', right: 'A gap between runs' },
                        { aspect: 'Right for', left: 'Sampling or polling at a known cadence', right: '<strong>Almost everything else</strong>' }
                    ]
                },
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'The three modes, and a scheduler with more than one thread',
                    code: '@Component\nclass Jobs {\n\n    @Scheduled(fixedDelay = 60_000)             // 60s AFTER the last finish\n    void poll() { }\n\n    @Scheduled(fixedRate = 60_000)              // every 60s from each start\n    void sample() { }\n\n    @Scheduled(cron = "0 15 3 * * *", zone = "Europe/Lisbon")\n    void nightly() { }     // 03:15 -- SIX fields: sec min hour dom mon dow\n}\n\n// The default TaskScheduler has ONE thread. Every @Scheduled method in\n// the application shares it, so a slow job delays unrelated ones.\n// spring.task.scheduling.pool.size=4',
                    output: {
                        kind: 'trace',
                        lines: [
                            'Spring cron expressions have six fields and start with seconds. Unix cron has five and starts with minutes.',
                            'So a five-field expression copied from a crontab is silently reinterpreted: "0 3 * * *" means second 0, minute 3, every hour -- not 03:00 daily.',
                            'It runs 24 times a day instead of once, and nothing reports an error because the expression is valid.',
                            'The zone attribute matters for the same reason LocalDateTime does: without it the schedule follows the server default and shifts twice a year.'
                        ],
                        explain: '<p>The single-threaded default is the other half of this. Every <code>@Scheduled</code> method in the application runs on one thread, so a nightly report that takes four minutes delays a health-check job that was meant to run every thirty seconds — and the delay appears as a monitoring gap rather than as a scheduling problem.</p>'
                    }
                },
                {
                    type: 'tip',
                    html: '<p>Prefer <code>fixedDelay</code> unless you specifically need a cadence. It cannot overlap, it cannot pile up, and it degrades gracefully when a run is slow — whereas <code>fixedRate</code> under a slow run either queues executions or, with a larger pool, runs the same job concurrently with itself.</p>'
                }
            ],
            docs: [
                { title: 'Task Scheduling', url: 'https://docs.spring.io/spring-framework/reference/integration/scheduling.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'concurrency', questionId: 'scheduled-executor-drift' }
            ]
        },

        {
            id: 'scheduling-in-a-multi-instance-deployment',
            title: 'Three Instances, Three Runs',
            importance: 'must-know',
            summary: '@Scheduled runs on every instance. Scale to three replicas and the nightly billing job runs three times, in parallel, on the same rows.',
            interviewAngle: 'A system-design question that catches people who have only run one instance. It is worth stating plainly, because the failure is silent duplication rather than an error.',
            buildsOn: ['scheduled-and-cron'],
            blocks: [
                {
                    type: 'prose',
                    html: '<p>There is nothing distributed about <code>@Scheduled</code>. It is a timer inside one JVM, so every replica has its own and every replica fires. With one instance that is invisible; with three it means three concurrent runs of the same job, racing on the same data, and the symptoms are duplicate emails, triple-counted aggregates, or a deadlock between two copies of the same query.</p><p>The failure is worse than an error because the job <em>appears</em> to work. Somebody notices the duplicates days later, in a customer complaint.</p>'
                },
                {
                    type: 'types',
                    title: 'The options, roughly in order of weight',
                    items: [
                        { name: 'Make the job idempotent', html: '<p>Claim work with a conditional update — <code>UPDATE ... SET claimed_by = ? WHERE id = ? AND claimed_by IS NULL</code> — and let three instances race safely. <strong>The best answer where the work has a natural claim,</strong> because it needs no coordination at all.</p>' },
                        { name: 'A distributed lock', html: '<p>ShedLock, or a row in the database taken with <code>SELECT ... FOR UPDATE</code>. One instance runs; the others see the lock and skip. Simple and widely used.</p>' },
                        { name: 'Leader election', html: '<p>One instance is elected and runs every job. More machinery, and it makes the leader a capacity bottleneck for all scheduled work.</p>' },
                        { name: 'Move it out of the application', html: '<p>A Kubernetes <code>CronJob</code> that invokes an endpoint or runs a separate process. The scheduler stops being the application\'s problem, and the trade is one more deployable to operate.</p>' },
                        { name: 'A job scheduler', html: '<p>Quartz in clustered mode, or a platform scheduler. Right when there are many jobs with dependencies, and heavy for three.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>Say the failure before the fix, because naming it is what shows you have hit it: <em>"<code>@Scheduled</code> fires on every instance, so at three replicas the job runs three times concurrently. I would either make the work claimable so racing is harmless, or take a distributed lock — ShedLock is the usual one — so only one instance proceeds."</em></p>'
                }
            ],
            docs: [
                { title: 'Spring Framework — Task Execution and Scheduling', url: 'https://docs.spring.io/spring-framework/reference/integration/scheduling.html', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'shedlock-and-leader-election',
            title: 'Locking a Scheduled Job',
            importance: 'should-know',
            summary: 'A row in a shared store, held for the duration of the run, with a maximum hold time so a crashed instance does not block the job forever.',
            interviewAngle: 'The follow-up to the previous chapter. The detail that shows real use is the maximum lock time: without it, an instance that dies mid-run leaves a lock nobody releases and the job never runs again.',
            buildsOn: ['scheduling-in-a-multi-instance-deployment'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'java',
                    title: 'ShedLock, and the two times that matter',
                    code: '@Scheduled(cron = "0 15 3 * * *", zone = "UTC")\n@SchedulerLock(\n        name = "nightlyBilling",          // the lock row\'s identity\n        lockAtMostFor = "PT30M",          // released after 30m even on a crash\n        lockAtLeastFor = "PT5M")          // held 5m even if the run is instant\nvoid nightlyBilling() { ... }',
                    output: {
                        kind: 'trace',
                        lines: [
                            'lockAtMostFor is the crash guard. If the instance holding the lock dies, nothing releases the row -- so the lock expires on its own, and the job runs on the next schedule.',
                            'It has to exceed the longest plausible run. Set it too low and a slow run releases the lock while still working, letting a second instance start alongside it.',
                            'lockAtLeastFor guards against clock skew. If a job finishes in 200ms and another instance is 30 seconds behind, the second one would find the lock free and run it again.',
                            'The lock lives in whatever store is shared -- the database, Redis, ZooKeeper. It must be the same one every instance sees, which rules out an in-memory implementation.'
                        ],
                        explain: '<p>The two bounds exist for two different failure modes and both are needed. <code>lockAtMostFor</code> handles a dead holder; <code>lockAtLeastFor</code> handles instances whose clocks disagree. Getting either wrong produces a job that either never runs or runs twice, which are the two outcomes the lock was for.</p>'
                    }
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A lock is not a transaction, and it does not make the work atomic.</strong> If the run fails halfway, the lock is released and the partial work stays. A locked job still needs to be restartable — which usually means the same idempotency the first option in the previous chapter was built on. The lock prevents concurrency; it does not give you exactly-once.</p>'
                }
            ],
            docs: [
                { title: 'ShedLock', url: 'https://github.com/lukas-krecan/ShedLock', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'spring-batch-when',
            title: 'When It Is Big Enough for Batch',
            importance: 'good-to-know',
            summary: 'Restartability, chunked commits and a record of what ran. A loop in a @Scheduled method has none of those, and for a small job it does not need them.',
            interviewAngle: 'A judgement question. The useful answer names what Batch provides rather than describing it, and says plainly that most scheduled jobs do not need it.',
            buildsOn: ['scheduling-in-a-multi-instance-deployment'],
            blocks: [
                {
                    type: 'types',
                    title: 'What Spring Batch gives that a loop does not',
                    items: [
                        { name: 'Restartability', html: '<p>Job state is persisted, so a failed run resumes from the last committed chunk instead of starting over. <strong>The main reason to adopt it</strong>, and the one a hand-rolled job never has.</p>' },
                        { name: 'Chunked transactions', html: '<p>Read <em>n</em>, process <em>n</em>, write <em>n</em>, commit. One transaction over a million rows holds locks for the duration and rolls back everything on the last failure.</p>' },
                        { name: 'A record of runs', html: '<p>Every execution, its parameters, its status and its counts, in tables you can query. "Did last night\'s job run and what did it do" has an answer.</p>' },
                        { name: 'Skip and retry policies', html: '<p>Declare that three malformed rows are tolerable and the fourth fails the job — rather than writing that logic into the loop.</p>' },
                        { name: 'Partitioning', html: '<p>Split the work across threads or instances, with the framework tracking each partition.</p>' }
                    ]
                },
                {
                    type: 'tip',
                    html: '<p>The line worth drawing: <em>"If the job is small enough that restarting it from the beginning is fine, a scheduled method is the right size. Once a failure halfway through means either duplicated work or a manual cleanup, I want chunked commits and restart-from-checkpoint, and that is what Batch is."</em></p>'
                }
            ],
            docs: [
                { title: 'Spring Batch', url: 'https://docs.spring.io/spring-batch/reference/index.html', kind: 'guide' }
            ],
            relatedQuestions: []
        },

        {
            id: 'graceful-shutdown-of-background-work',
            title: 'Stopping Background Work Cleanly',
            importance: 'should-know',
            summary: 'The web layer has a graceful shutdown story. Your own executors and schedulers need one too, and they do not get it for free.',
            interviewAngle: 'The connection between this module and the lifecycle one. What is being assessed is whether background work was considered at all when the deployment was designed.',
            buildsOn: ['async-and-its-executor'],
            blocks: [
                {
                    type: 'syntax',
                    language: 'properties',
                    title: 'The settings that cover the executors Boot owns',
                    code: '# The web layer.\nserver.shutdown=graceful\n\n# The auto-configured @Async executor.\nspring.task.execution.shutdown.await-termination=true\nspring.task.execution.shutdown.await-termination-period=30s\n\n# The auto-configured @Scheduled scheduler.\nspring.task.scheduling.shutdown.await-termination=true\nspring.task.scheduling.shutdown.await-termination-period=30s\n\n# All of it has to fit inside the platform\'s grace period, or the\n# process is killed mid-drain and none of it mattered.',
                    notes: '<p>These cover the executors Boot auto-configured. An executor you declared yourself needs <code>setWaitForTasksToCompleteOnShutdown(true)</code> and <code>setAwaitTerminationSeconds(...)</code> on the bean — Spring calls <code>shutdown()</code> on it by name at context close, which is the first phase only.</p>'
                },
                {
                    type: 'pitfall',
                    html: '<p><strong>A long-running task cannot be stopped by shutdown alone.</strong> <code>shutdownNow()</code> interrupts, and interruption is a request that only cooperating code observes — a batch loop that never checks <code>Thread.currentThread().isInterrupted()</code> runs to completion or is killed with the process. For work measured in minutes, poll the flag between units and stop at a clean point. This is the executors module\'s point arriving where it costs something: the unit killed mid-write is the one that leaves inconsistent data.</p>'
                },
                {
                    type: 'tip',
                    html: '<p>The design answer that avoids most of this: make background work resumable rather than uninterruptible. A job that records progress and can be restarted does not need a long grace period, because being killed is survivable. That is the same property Spring Batch sells, and it is worth having whether or not you use Batch to get it.</p>'
                }
            ],
            docs: [
                { title: 'Spring Boot — Task Execution and Scheduling', url: 'https://docs.spring.io/spring-boot/reference/features/task-execution-and-scheduling.html', kind: 'guide' }
            ],
            relatedQuestions: [
                { topicId: 'concurrency', questionId: 'shutdown-vs-shutdownnow' }
            ]
        }
    ]
};
