# Triage summary — all 26 topics, 486 questions

One read of every question in the deck against four judgements: **is it
true**, **is it asked**, **is it at the right tier**, **does it have a
reference**. Read 2026-10-20. Per-topic records are the 26 files beside this
one; each carries a table with one row per question, and the row counts add up
to 486.

| | |
|---|---|
| **Not true** | **1** — fixed |
| Asked, with a reservation | 2 |
| Tier, with a reservation | 16 |
| **No reference** | **81** — all fixed |
| Reference present but degraded or unsupporting | 12 |

---

## The one thing that is wrong

**`java-language` #8 `static-nested-vs-inner`** says an inner class "holds a
hidden reference to the instance of the enclosing class that created it".
javac emits that synthetic `this$0` field **only when the inner class actually
uses the enclosing instance**, so the memory hazard the answer goes on to
describe does not apply to an inner class that never touches its outer.

**Phase 9 already found this fact and already fixed it** — in
`predict-io-and-time-inner-class-holds-the-outer-instance`, whose claimed
output was wrong for exactly this reason. The prose form of the same error was
two files away and nothing connected them, because `run-snippets.js` reads
`output.lines` and **no tool reads an answer**. That is the gap this whole
phase exists to cover, demonstrated on its first day.

**Fixed.** The answer now carries the condition and states the elision, and
says the field is `this$0` — which is also what the predict block had wrong.

## Four structural findings — one of which was withdrawn

### 1. WITHDRAWN — ten topics are flat, and every one of them meant to be

The first pass recorded this as a gap: `app.js:341` emits an
`<h2 class="subsection-heading">` whenever a question's subsection changes,
sixteen topics get that grouping, and ten — 148 questions — do not.
`streams-functional` at 28 questions looked like the worst case.

**Re-reading the ten files withdrew it.** Every one declares `subsections:
null` — an explicit null, not an omission — and every one argues the case in
its header. `streams-functional`: "the topic reads as one argument … cutting
it into three headings would break the thread for no filing benefit."
`transactions`: "splitting them into headings would imply those are
separable. They are not." `aop-proxies`: "everything here is one mechanism
seen from several angles."

Those are decisions, and better ones than the finding that questioned them.
**The correction is recorded rather than quietly removed**, because the
original wording — "nothing distinguishes *this topic does not need grouping*
from *nobody wrote the groups*" — was itself the error: the file headers
distinguish them, and the pass had not read the file headers.

What survives is narrower and still true: **nothing machine-readable separates
a considered `null` from an unconsidered one.** `validate-questions` now
requires `subsections` to be either an explicit `null` or a non-empty array,
and requires a declared subsection to stay contiguous — the rule `app.js` has
always assumed and no tool checked.

### 2. Two theory modules do not link to the topics they teach

**80 of 486 questions are cited by no theory chapter, and 45 of those 80 are
in two topics:**

| Topic | Questions | `relatedQuestions` received | Why |
|---|---|---|---|
| `streams-functional` | 28 | **4** | `streams-and-lambdas` and `modern-java` link to six other topics and not to this one |
| `jvm-memory` | 28 | **9** | **`heap-and-gc` has nine chapters and zero `relatedQuestions`** — the only subject module in the deck with none. `jvm-diagnostics` has one, pointing elsewhere |

`validate-theory` checks that every `relatedQuestions` reference **resolves**.
It does not check that a module has any. **A module that links nowhere and a
module whose links are all correct produce the same green run.**

For contrast, **ten topics have zero uncited questions**: `rest-api`,
`spring-security`, `jpa-hibernate`, `sql-databases`, `microservices`,
`kafka-messaging`, `caching-scale`, `cloud`, `design-patterns` and
`architecture-ddd`.

### 3. FIXED — 81 questions carried no reference, and the distribution was not random

None is `must-know` — `validate-questions` check 3 makes that an error — so
all 81 are `should-know` (41) or `good-to-know` (40). But the *ratio* varies
far more than subject matter explains:

| Worst | | Best | |
|---|---|---|---|
| `aop-proxies` | 7/14 — **50%** | `streams-functional` | 0/28 |
| `transactions` | 7/16 — 44% | `jvm-memory` | 0/28 |
| `java-language` | 18/44 — 41% | `spring-security` | 0/19 |
| `collections` | 10/26 — 38% | `beyond-rest` | 0/18 |

**Sixteen topics have complete coverage**, so the 81 gaps live in ten topics. In `aop-proxies` the gap is **positional
rather than topical** — every question from #8 onward is uncited while the
first seven all cite the Spring reference, which usually means one sitting
where the habit lapsed.

Several gaps are cheap to close because **the deck already cites the right
source from its other corpus**: `java-language` #3, #6, #27, #29, #37 and #44
all describe JLS sections that theory chapters cite by number.

The individually worst-placed gaps, where the claim is strong and the reader
cannot check it:

- `collections` #16 `hash-collision-dos` — a named vulnerability class, a
  date, a specific mitigation, and an assertion about servlet-container
  defaults. Nothing cited.
- `rest-api` #20 `jackson-polymorphism` — a remote-code-execution vector and
  how to avoid it.
- `spring-boot` #23 `deprecations-and-replacements` — a list of current
  spellings, so the one question whose entire subject is *change* has no
  source to re-check against.
- `transactions` #10 and #11 — the two questions about the JPA locking API,
  neither citing it.

A hypothesis was **tested and refused**: that security-flavoured questions are
systematically under-cited. 56 questions make a security-shaped claim and 14%
are uncited, against a 17% corpus baseline. Two bad cases are not a pattern.

### 4. "Has a reference" and "is supported by a reference" are different properties

**Two of the four bad cases are fixed**; the rule that permitted them is
unchanged, because no validator can read a page.

`validate-questions` check 3 requires a `must-know` question to carry a link
and verifies the URL is `https`. It cannot check that the link is about the
question, and `behavioural-project` shows what that permits: **#9
`hardest-bug` cites Oracle's Java SE Troubleshooting Guide** for an answer
about how to *tell* a debugging story, and #3, #7 and #10 all cite the same
generic "How We Hire" page.

Twelve rows across the deck are marked `~` on the reference column. Nine are
the `kafka.apache.org/documentation/#anchor` links that Phase 9 kept
deliberately and that now land on a JavaScript redirect shim; three are the
`docs.junit.org/current/` aliases. Those are recorded trades. The
`behavioural-project` four are not — they are links that satisfy a rule.

## Five questions maintained twice — and a check that found three of them

**The triage found two pairs by reading. A set comparison found five.** That
is the argument for the check that now exists: on 486 questions a careful read
is worse at this than comparing token sets, and `validate-questions` check 8
does it in a second.

Identical wording is now an **error** and heavy overlap a **warning**. Two
pairs were errors and both are fixed by narrowing one question, never by
deleting content:

- `java-language#try-with-resources-and-suppressed` and
  `java-io-time#try-with-resources-details` asked the same question in the
  same words and gave near-identical answers — both "three things, and the
  third is the one nobody gets right", both covering reverse order, throwing
  close and suppression. That is duplication, not two angles. The
  `java-language` one now asks **"if the body throws and then `close()` also
  throws, which exception does the caller see?"**, which is what its id always
  said it was about, and defers the general question to `java-io-time`.
- `transactions#testing-transactions` and `testing#transactional-tests-hide-bugs`
  asked the same question **at different tiers** — `good-to-know` and
  `must-know` — so the deck said one thing was both. The `transactions` one now
  asks **"which transaction behaviours stop being exercised when a test rolls
  back?"**, which is what its answer is actually about: deferred constraints,
  `REQUIRES_NEW`, and propagation never being tested.

Four warnings stand, and standing is the point — a warning is a judgement a
validator should not make:

| Pair | Overlap | Judgement |
|---|---|---|
| `concurrency#virtual-threads-vs-reactive` / `beyond-rest#reactive-versus-virtual-threads` | 0.71 | two topics' angles on one question, same tier, consistent answers |
| `spring-core#spel-in-value` / `architecture-ddd#entity-versus-value-object` | 0.60 | false positive — the shared word is "value" |
| `java-io-time#time-on-the-wire` / `rest-api#jackson-dates-and-time` | 0.57 | the `java.time` side and the Jackson side |
| `rest-api#dto-vs-entity` / `architecture-ddd#dto-versus-entity` | 0.57 | API-contract argument and domain-boundary argument |

## The original wording of this finding

Neither is caught by anything, because `validate-questions` check 2 refuses a
duplicate **id** across topics and nothing compares content:

- `java-io-time` #2 `try-with-resources-details` ↔ `java-language` #42
  `try-with-resources-and-suppressed`
- `architecture-ddd` #3 `dto-versus-entity` ↔ `rest-api` #13 `dto-vs-entity`

In both cases the framings genuinely differ and a reader arriving from either
topic wants it there, so neither is marked a failure. But each is one answer's
worth of content in two places, and **if one is corrected the other will not
be** — which is exactly how #8 above survived Phase 9.

## What the tiering does well

**Every topic's `keyTopics` is fully covered by its questions** — 26 for 26,
with no manifest item unaddressed. Where a `keyTopic` lands at `should-know`
rather than `must-know` (sixteen cases across the deck) it is a defensible
call every time, and it exposes something nothing states: **`keyTopics` is a
coverage manifest, not a tier list.** It says the topic must *address* the
thing, not that the thing is top-tier. A future reader will re-derive that.

## Not judged anywhere in this pass

- **Completeness.** Only whether what an answer says is true, never whether it
  omits the thing an interviewer follows up with.
- **Whether the manifest is right** — whether these are the 26 topics, whether
  these are the right `keyTopics`, whether `cloud` should be AWS-flavoured.
  Those are questions about `SPRINGDECK-PLAN.md`.
- **The other four modes.** 687 theory chapters, 46 drills, 81 predicts and 61
  glossary terms were not read here. Phase 9 executed the 58 `stdout` claims
  among them; nothing has read the prose.
