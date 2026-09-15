/* ==========================================================================
   data/behavioural-project.js — Behavioural, Projects & Résumé Defence

   The only topic with `track: null`. It belongs to no subject track because
   it is not about a technology, and data/index.js renders it in an
   "Everything else" group — which is the first time that null branch is
   exercised by real content rather than only by validate-nav's check.

   THE RULE THIS TOPIC IS WRITTEN UNDER: no generic advice. "Be confident"
   and "show passion" help nobody. Every answer here is either a structure
   you can apply to your own material, or a specific thing interviewers are
   listening for and why. The questions are the ones a backend engineer
   actually gets, and the answers assume the reader has a real project to
   talk about rather than supplying an invented one.

   ONE GLOBAL PER FILE.
   ========================================================================== */

const behaviouralProjectData = {
    id: 'behavioural-project',
    title: 'Behavioural, Projects & Résumé Defence',
    subsections: null,
    keyTopics: [
        'STAR structure', 'describing an incident', 'trade-offs you made',
        'a decision you got wrong', 'estimating and missing',
        'code review disagreement', 'explaining your architecture',
        'questions to ask the interviewer'
    ],
    questions: [

{
    id: 'star-structure',
    importance: 'must-know',
    subsection: null,
    question: 'How should you structure an answer to "tell me about a time when..."?',
    answer:
        '<p><strong>STAR</strong> — Situation, Task, Action, Result — and the value is not the ' +
        'acronym, it is that it forces the two things people leave out.</p>' +
        '<ul>' +
        '<li><strong>Situation</strong> — two sentences of context. Enough that the difficulty is ' +
        'legible; not the org chart.</li>' +
        '<li><strong>Task</strong> — what <em>you</em> were responsible for. This is where "we" ' +
        'must become "I", because an interviewer genuinely cannot tell what you did if every ' +
        'sentence says we.</li>' +
        '<li><strong>Action</strong> — the bulk of it, and it should be specific enough to be ' +
        'checkable. What you tried, what you rejected and why, what you actually changed.</li>' +
        '<li><strong>Result</strong> — <strong>with a number</strong>. "It got faster" is not a ' +
        'result; "p99 went from 4s to 300ms and the on-call pages stopped" is.</li>' +
        '</ul>' +
        '<p>The two omissions STAR catches: <strong>no result</strong>, which leaves the story ' +
        'without a point, and <strong>no "I"</strong>, which leaves it without a protagonist.</p>' +
        '<p>What separates a strong answer from a merely structured one: <strong>say what you ' +
        'considered and rejected.</strong> "I looked at adding a cache first, but the hit rate ' +
        'would have been low because the queries were mostly unique, so I fixed the index ' +
        'instead" demonstrates judgement in a way that describing only the chosen path cannot. ' +
        'Interviewers are assessing decision-making, and a decision with no alternatives is not ' +
        'visible as one.</p>' +
        '<p>Two practical notes. <strong>Prepare five or six stories, not one per question</strong> ' +
        '— a good story about a difficult migration answers conflict, ownership, ambiguity and ' +
        'failure depending on which part you emphasise. And <strong>aim for two to three ' +
        'minutes</strong>: long enough to be specific, short enough that they can ask a follow-up, ' +
        'which is where the real conversation happens.</p>',
    referenceLinks: [
        { title: 'Amazon — Interviewing at Amazon', url: 'https://www.amazon.jobs/content/en/how-we-hire/interviewing-at-amazon' }
    ],
    tags: ['behavioural', 'interview-technique', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'explaining-your-architecture',
    importance: 'must-know',
    subsection: null,
    question: 'Walk me through the architecture of something you have built.',
    answer:
        '<p>Almost every backend interview contains this, and it is scored on ' +
        '<strong>whether you understand the system or only your part of it</strong>.</p>' +
        '<p>A structure that works, roughly five minutes:</p>' +
        '<ul>' +
        '<li><strong>What it does, in one sentence, in business terms.</strong> Not "a Spring ' +
        'Boot microservice with Kafka" — "it takes payments for a marketplace and pays sellers ' +
        'out weekly". Leading with technology signals that you think of the system as its ' +
        'stack.</li>' +
        '<li><strong>Scale, with numbers.</strong> Requests per second, data volume, users, ' +
        'growth. This calibrates everything after it: the same design is over-engineered at one ' +
        'scale and negligent at another, and without a number the interviewer cannot tell ' +
        'which.</li>' +
        '<li><strong>The main components and how a request flows through them.</strong> One ' +
        'concrete path end to end, not a component list.</li>' +
        '<li><strong>Two or three decisions and why</strong> — the parts that were not ' +
        'obvious.</li>' +
        '<li><strong>What you would change.</strong> Nearly always the strongest part of the ' +
        'answer, and the part most people skip.</li>' +
        '</ul>' +
        '<p>What they are listening for underneath: do you know why it is that way and not ' +
        'another way; do you know where the bottleneck is; do you know what happens when a ' +
        'dependency fails; and can you talk about the parts you did not write. "I do not know how ' +
        'that team\'s service works internally, but the contract is X and it fails like Y" is a ' +
        'strong answer, not a gap.</p>' +
        '<p>Two things to avoid. <strong>Do not oversell your role</strong> — you will be asked a ' +
        'detail, and being caught is much worse than having had a small part in something large. ' +
        'And <strong>do not present it as flawless.</strong> Every real system has known ' +
        'problems, and naming yours is the clearest evidence available that you have operated ' +
        'it.</p>' +
        '<p>Practise drawing it. A diagram with five boxes that you can produce in ninety ' +
        'seconds is worth several minutes of talking, and it gives the interviewer something to ' +
        'point at.</p>',
    referenceLinks: [
        { title: 'The C4 Model for Software Architecture', url: 'https://c4model.com/' }
    ],
    tags: ['behavioural', 'architecture', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'resume-defence',
    importance: 'must-know',
    subsection: null,
    question: 'How do you prepare for questions about what is on your CV?',
    answer:
        '<p>By assuming that <strong>every line is a question you have agreed to answer</strong>. ' +
        'Listing Kafka means being asked about consumer groups and rebalancing; listing "improved ' +
        'performance by 40%" means being asked how it was measured and what the baseline was.</p>' +
        '<p>The preparation is mechanical:</p>' +
        '<ul>' +
        '<li><strong>Read your own CV line by line and ask "what is the obvious follow-up".</strong> ' +
        'Anything you cannot answer for two minutes is either something to revise or something to ' +
        'remove.</li>' +
        '<li><strong>Have a number for every claim.</strong> If you wrote "reduced latency", know ' +
        'from what to what, over what period, measured how. A claim you cannot substantiate is ' +
        'worse than no claim, because it becomes a credibility question rather than a knowledge ' +
        'one.</li>' +
        '<li><strong>Know your own numbers generally</strong> — traffic, data size, team size, ' +
        'deploy frequency, incident rate. Not knowing the request rate of a system you say you ' +
        'own is a bad moment.</li>' +
        '<li><strong>Be precise about your part.</strong> "I built the payment service" and "I ' +
        'wrote the reconciliation job in a team of six that built the payment service" are ' +
        'different claims, and the second is perfectly good.</li>' +
        '</ul>' +
        '<p><strong>Remove what you cannot defend.</strong> A skills list including a technology ' +
        'you used once three years ago is a trap you set for yourself. Nobody is impressed by a ' +
        'long list; everybody notices a shallow answer about something you put there.</p>' +
        '<p>When you do not know, <strong>say so and then say what you do know</strong>. "I have ' +
        'not tuned G1 directly — I know the pause target is the main lever and I would start from ' +
        'the GC log" is an entirely acceptable answer. Bluffing is the one thing that reliably ' +
        'ends an interview badly, because the follow-up always comes and now the problem is ' +
        'trust.</p>',
    referenceLinks: [
        { title: 'Google — How We Hire', url: 'https://www.google.com/about/careers/applications/how-we-hire/' }
    ],
    tags: ['behavioural', 'interview-technique', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'a-decision-you-got-wrong',
    importance: 'must-know',
    subsection: null,
    question: 'Tell me about a technical decision you got wrong.',
    answer:
        '<p>This question has one failure mode and it is not the mistake. It is ' +
        '<strong>choosing something that is not really a failure</strong> — "I was too ' +
        'thorough", "we over-tested" — which reads as either no self-awareness or an unwillingness ' +
        'to be honest, and both are worse than the mistake would have been.</p>' +
        '<p>What makes a good answer:</p>' +
        '<ul>' +
        '<li><strong>A real decision with real consequences.</strong> You chose a datastore that ' +
        'did not fit, built an abstraction nobody needed, sharded too early, wrote a cache with ' +
        'no invalidation story.</li>' +
        '<li><strong>Why it was reasonable at the time.</strong> This is important — a decision ' +
        'that was obviously wrong when made is a judgement problem; one that was defensible on ' +
        'the information available is a learning story. Say what you knew and what you ' +
        'assumed.</li>' +
        '<li><strong>How you found out</strong>, and how long it took. "Six months later, when ' +
        'the third team needed a query the model could not answer."</li>' +
        '<li><strong>What you did about it.</strong> Did you migrate, live with it, or advocate ' +
        'for a change? Owning the recovery matters more than owning the mistake.</li>' +
        '<li><strong>What you do differently now</strong> — and this must be specific enough to ' +
        'be a real change in behaviour, not "I think harder".</li>' +
        '</ul>' +
        '<p>The strongest version names the <em>class</em> of error rather than the instance: ' +
        '"I optimised for a flexibility requirement that had been asserted but never validated, ' +
        'so now I ask what would have to be true for this to be needed, and whether anyone can ' +
        'point at it." That generalises, which is what makes it evidence about your future work ' +
        'rather than a story about your past.</p>' +
        '<p>Do not blame anyone. A story where the mistake was really someone else\'s is not an ' +
        'answer to this question, and interviewers notice the substitution immediately.</p>',
    referenceLinks: [
        { title: 'Architecture Decision Records', url: 'https://adr.github.io/' }
    ],
    tags: ['behavioural', 'judgement', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'describing-an-incident',
    importance: 'must-know',
    subsection: null,
    question: 'Tell me about a production incident you handled.',
    answer:
        '<p>The best structure is a <strong>postmortem</strong>, because that is the shape the ' +
        'information naturally has and it puts everything in the order the interviewer wants ' +
        'it.</p>' +
        '<ul>' +
        '<li><strong>Impact first.</strong> What broke, for whom, for how long. "Checkout failed ' +
        'for about 15% of users for 40 minutes." Starting with the cause instead makes the ' +
        'listener hold detail with nowhere to put it.</li>' +
        '<li><strong>Detection.</strong> How you found out — and be honest if it was a customer, ' +
        'because "the alert we did not have" is one of the most useful things in the ' +
        'story.</li>' +
        '<li><strong>Diagnosis</strong>, including the wrong turns. What you first thought, why, ' +
        'and what changed your mind. This is the part that shows how you actually reason under ' +
        'pressure, and a clean linear narrative is usually a reconstructed one.</li>' +
        '<li><strong>Mitigation, then fix.</strong> Say plainly that you stopped the bleeding ' +
        'first — rolled back, failed over, turned off a flag — and found the cause afterwards. ' +
        'Diagnosing while users are affected is a common and revealing mistake.</li>' +
        '<li><strong>Root cause</strong>, honestly, and usually more than one.</li> ' +
        '<li><strong>What changed afterwards</strong>, and whether it actually shipped.</li>' +
        '</ul>' +
        '<p>Two things that mark out someone who has done this for real. <strong>Preserving ' +
        'evidence before restarting</strong> — a heap dump or a thread dump taken before the ' +
        'restart that would have destroyed it. And <strong>blameless framing</strong>: "the ' +
        'deployment process allowed a config change with no review" rather than "someone pushed ' +
        'a bad config". The second version predicts a team nobody wants to be on call with.</p>' +
        '<p>The follow-up is nearly always "how would you prevent it", and the answer that lands ' +
        'is about the <strong>system</strong> rather than the person: a check in the pipeline, a ' +
        'test, an alert, a limit. "We told everyone to be careful" is not a prevention.</p>',
    referenceLinks: [
        { title: 'Google SRE Book — Postmortem Culture', url: 'https://sre.google/sre-book/postmortem-culture/' }
    ],
    tags: ['behavioural', 'incidents', 'must-know'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'a-tradeoff-you-made',
    importance: 'should-know',
    subsection: null,
    question: 'Tell me about a trade-off you made.',
    answer:
        '<p>The question is testing whether you experience engineering as a series of choices ' +
        'with costs, or as a series of correct answers. So the answer has to contain a ' +
        '<strong>real cost you accepted</strong>, not a benefit dressed as one.</p>' +
        '<p>A trade-off that is not one: "we chose the scalable option". A trade-off that is: ' +
        '"we chose eventual consistency for the notification path, which means a user can see ' +
        'their order confirmed before the email arrives — we decided that was acceptable and ' +
        'added a status to the UI to make it honest".</p>' +
        '<p>The shape:</p>' +
        '<ul>' +
        '<li><strong>The constraint that forced a choice.</strong> A deadline, a team size, an ' +
        'existing system, a cost ceiling. Without a constraint there was no trade.</li>' +
        '<li><strong>The options, with what each one cost.</strong> Two is enough.</li>' +
        '<li><strong>The decision and the reasoning</strong>, in terms of what mattered ' +
        '<em>then</em> — time to market, correctness, operability, reversibility.</li>' +
        '<li><strong>What you gave up, said plainly</strong>, and how you mitigated or monitored ' +
        'it.</li>' +
        '<li><strong>How it turned out</strong>, including "we later had to change it", which is ' +
        'a fine ending.</li>' +
        '</ul>' +
        '<p>Two framings worth having ready because they generalise. <strong>Reversibility</strong> ' +
        '— a decision you can undo cheaply deserves less deliberation than one you cannot, and ' +
        'saying "this was a one-way door so we spent two weeks on it, and that was a two-way door ' +
        'so we picked one and moved" is a strong signal. And <strong>deliberate technical ' +
        'debt</strong>: taking a shortcut knowingly, writing down why and what would trigger ' +
        'paying it back, is engineering. Taking it accidentally is not, and the difference is the ' +
        'written-down part.</p>',
    referenceLinks: [
        { title: 'Architecture Decision Records', url: 'https://adr.github.io/' }
    ],
    tags: ['behavioural', 'judgement'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'estimating-and-missing',
    importance: 'should-know',
    subsection: null,
    question: 'Tell me about a time you missed a deadline.',
    answer:
        '<p>Everyone has. The question is about <strong>what you did when you knew</strong>, and ' +
        'in particular <em>when</em> you told anyone.</p>' +
        '<p>The answer that works has a specific shape:</p>' +
        '<ul>' +
        '<li><strong>The estimate and what it was based on.</strong> Honesty about the method is ' +
        'fine — most estimates are informed guesses and pretending otherwise fools nobody.</li>' +
        '<li><strong>What went wrong</strong>, and the useful version is usually an unknown ' +
        'rather than slowness: an integration that behaved differently from its documentation, a ' +
        'dependency that was not ready, a requirement that changed shape.</li>' +
        '<li><strong>When you raised it, and to whom.</strong> This is the whole question. Early ' +
        'is the right answer and it should be as soon as you believed it, not once it was ' +
        'certain.</li>' +
        '<li><strong>What you proposed.</strong> Not just the bad news — cut scope, phase the ' +
        'delivery, add help, move the date. Bringing options is the difference between escalating ' +
        'and reporting.</li>' +
        '<li><strong>What you changed about estimating afterwards.</strong></li>' +
        '</ul>' +
        '<p>The failure this question is looking for is the one everyone has seen: an engineer ' +
        'who believes they can still make it up, says nothing for three weeks, and delivers the ' +
        'bad news when nothing can be done about it. <strong>Late information is worth far less ' +
        'than early information</strong>, and stakeholders can absorb a slip they hear about in ' +
        'week one in a way they cannot in week six.</p>' +
        '<p>Two specifics worth adding if they are true: <strong>estimating in ranges</strong> ' +
        '— "three to five days, and I will know which by Tuesday" — communicates uncertainty ' +
        'that a single number hides; and <strong>breaking work down until the pieces are ' +
        'small</strong>, since anything estimated at more than a few days is really an estimate ' +
        'of something not yet understood.</p>',
    referenceLinks: [
        { title: 'Google — How We Hire', url: 'https://www.google.com/about/careers/applications/how-we-hire/' }
    ],
    tags: ['behavioural', 'communication'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'technical-disagreement',
    importance: 'should-know',
    subsection: null,
    question: 'Tell me about a disagreement with a colleague.',
    answer:
        '<p>Two failure modes here, and they are opposite. One is a story where you were right ' +
        'and eventually everyone agreed, which reads as an inability to be wrong. The other is a ' +
        'story where you had no view, which reads as an inability to have one.</p>' +
        '<p>What a good answer contains:</p>' +
        '<ul>' +
        '<li><strong>A genuine technical disagreement</strong> where reasonable people could ' +
        'differ — a data model, a boundary, a library choice, an approach to migration.</li>' +
        '<li><strong>Their argument, stated fairly.</strong> The clearest possible evidence that ' +
        'you understood it. An answer that cannot articulate the other position has not engaged ' +
        'with it.</li>' +
        '<li><strong>How you tried to resolve it with evidence</strong> — a spike, a benchmark, a ' +
        'prototype, a small experiment. Turning an opinion contest into a question with an answer ' +
        'is the most valuable move available.</li>' +
        '<li><strong>The outcome, including if you were wrong</strong>, or if you deferred and it ' +
        'worked out fine.</li>' +
        '</ul>' +
        '<p>The principle worth naming is <strong>disagree and commit</strong>: once the decision ' +
        'is made, you support it fully rather than relitigating it in every stand-up or ' +
        'undermining it quietly. Being able to say that — and give an example of doing it — is ' +
        'often what the question is really after.</p>' +
        '<p>Two boundaries to state, because they show the limit is understood: ' +
        '<strong>correctness and security are not preferences</strong>, and those are escalated ' +
        'rather than deferred on. And <strong>a reversible decision does not deserve a long ' +
        'argument</strong> — the cost of being wrong is small and the cost of a stalled team is ' +
        'not, so try it and find out.</p>',
    referenceLinks: [
        { title: 'Google Engineering Practices — Code Review', url: 'https://google.github.io/eng-practices/review/' }
    ],
    tags: ['behavioural', 'collaboration'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'hardest-bug',
    importance: 'should-know',
    subsection: null,
    question: 'What is the hardest bug you have debugged?',
    answer:
        '<p>The best answers are almost never about clever code. They are about a bug that was ' +
        'hard <strong>because the assumption was wrong somewhere nobody was looking</strong> — ' +
        'and that is what makes them interesting to an interviewer.</p>' +
        '<p>The shapes that make a good story: something that only happened in production, or ' +
        'only under load, or only for one customer; a race that appeared once a week; a failure ' +
        'inside a dependency; something where the symptom and the cause were in different ' +
        'systems.</p>' +
        '<p>What to emphasise, in order:</p>' +
        '<ul>' +
        '<li><strong>Why it was hard to reproduce</strong>, which is usually the actual ' +
        'difficulty.</li>' +
        '<li><strong>How you narrowed it.</strong> The method is the content of the answer: ' +
        'bisecting, adding instrumentation, eliminating layers, comparing a working and a failing ' +
        'case, reading the code that you had assumed was correct.</li>' +
        '<li><strong>The wrong hypotheses</strong>, and what ruled each out. A story with no dead ' +
        'ends is a story that has been tidied.</li>' +
        '<li><strong>The moment it made sense</strong>, and what the incorrect assumption ' +
        'was.</li>' +
        '<li><strong>What you added so it would be caught faster next time</strong> — a metric, a ' +
        'log line, a test, an assertion.</li>' +
        '</ul>' +
        '<p>The generalisable point worth ending on, because it says something about how you ' +
        'work: <strong>the hard part of debugging is almost always finding which assumption is ' +
        'false</strong>, not fixing it. Everything in the method above is a way of testing ' +
        'assumptions one at a time rather than reasoning about the whole system at once.</p>' +
        '<p>Avoid a story where the answer was "the library had a bug" with no more detail. It ' +
        'happens, and as a story it has no method in it.</p>',
    referenceLinks: [
        { title: 'Troubleshooting Guide — Java SE', url: 'https://docs.oracle.com/en/java/javase/21/troubleshoot/index.html' }
    ],
    tags: ['behavioural', 'debugging'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
},

{
    id: 'questions-to-ask-the-interviewer',
    importance: 'should-know',
    subsection: null,
    question: 'What should you ask at the end of an interview?',
    answer:
        '<p>Something you actually want to know. The question is partly a courtesy and partly a ' +
        'signal — what you are curious about says what you care about, and "no questions" is read ' +
        'as disengagement whether or not it is meant that way.</p>' +
        '<p><strong>Questions that tell you something useful about the job:</strong></p>' +
        '<ul>' +
        '<li><strong>"How does a change get from a laptop to production, and how long does that ' +
        'take?"</strong> The single most informative question available. The answer reveals the ' +
        'test culture, the deployment maturity, the review process and the feedback loop in one ' +
        'go.</li>' +
        '<li><strong>"What does on-call look like?"</strong> How often paged, how often at night, ' +
        'who fixes what. A team that cannot answer this specifically either does not do it or ' +
        'does not track it.</li>' +
        '<li><strong>"What is the most annoying thing about working on this codebase?"</strong> ' +
        'You will get an honest answer, and it is the one you most need.</li>' +
        '<li><strong>"What would you want the person in this role to have achieved in six ' +
        'months?"</strong> Reveals whether the role is well defined.</li>' +
        '<li><strong>"How are technical decisions made when people disagree?"</strong></li>' +
        '<li><strong>"What proportion of time goes to features, maintenance and incidents?"</strong> ' +
        'A number, or the absence of one, is informative either way.</li>' +
        '</ul>' +
        '<p><strong>Questions to avoid:</strong> anything answered on the careers page, anything ' +
        'about compensation at a technical round — that belongs with the recruiter — and the ' +
        'flattering non-question ("what do you love most about working here?"), which produces a ' +
        'rehearsed answer and no information.</p>' +
        '<p>Tailor by who is in the room: engineers can answer about the code and the on-call ' +
        'rota, a manager about the roadmap and the team, and a director about why the role ' +
        'exists. Asking a director about the CI pipeline wastes the one person who could tell you ' +
        'where the team is going.</p>' +
        '<p>And remember it goes both ways. <strong>You are deciding too</strong>, and the ' +
        'answers to these questions are how you find out what the job is actually like rather ' +
        'than what it says it is.</p>',
    referenceLinks: [
        { title: 'Google — How We Hire', url: 'https://www.google.com/about/careers/applications/how-we-hire/' }
    ],
    tags: ['behavioural', 'interview-technique'],
    images: [],
    hasDiagram: false,
    diagramType: null,
    diagramConfig: null,
    codeSnippets: []
}

    ]
};
