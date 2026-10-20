# Triage — `java-language` · Java Language & OOP

**44 questions · 15 must-know / 18 should-know / 11 good-to-know**
Read 2026-10-20. Every question read once against four judgements: **is it
true**, **is it asked**, **is it at the right tier**, **does it have a
reference**.

Columns are `T` true · `A` asked · `R` right tier · `L` has a reference link.
`✓` passes, `✗` fails, `~` passes with a reservation recorded below.

| # | id | tier | T | A | R | L |
|---|---|---|---|---|---|---|
| 1 | `inheritance-vs-composition` | must | ✓ | ✓ | ✓ | ✓ |
| 2 | `abstract-class-vs-interface` | must | ✓ | ✓ | ✓ | ✓ |
| 3 | `default-methods-and-the-diamond` | should | ✓ | ✓ | ~ | ✗ |
| 4 | `overloading-vs-overriding` | must | ✓ | ✓ | ✓ | ✓ |
| 5 | `static-binding-vs-dynamic-dispatch` | should | ✓ | ✓ | ✓ | ✗ |
| 6 | `initialisation-order` | should | ✓ | ✓ | ✓ | ✗ |
| 7 | `final-three-meanings` | should | ✓ | ✓ | ✓ | ✓ |
| 8 | `static-nested-vs-inner` | should | **✗** | ✓ | ✓ | ✓ |
| 9 | `access-modifiers` | good | ✓ | ✓ | ✓ | ✗ |
| 10 | `covariant-return-types` | good | ✓ | ✓ | ✓ | ✗ |
| 11 | `why-no-multiple-inheritance-of-state` | good | ✓ | ✓ | ✓ | ✗ |
| 12 | `equals-hashcode-contract` | must | ✓ | ✓ | ✓ | ✓ |
| 13 | `equals-and-inheritance-symmetry` | should | ✓ | ✓ | ✓ | ✗ |
| 14 | `mutable-key-in-a-hashmap` | must | ✓ | ✓ | ✓ | ✓ |
| 15 | `comparable-vs-comparator` | must | ✓ | ✓ | ✓ | ✓ |
| 16 | `compareto-consistent-with-equals` | should | ✓ | ✓ | ✓ | ✓ |
| 17 | `immutability-recipe` | must | ✓ | ✓ | ✓ | ✓ |
| 18 | `defensive-copying` | should | ✓ | ✓ | ✓ | ✓ |
| 19 | `why-string-is-immutable` | must | ✓ | ✓ | ✓ | ✓ |
| 20 | `string-pool-and-intern` | should | ✓ | ✓ | ~ | ✓ |
| 21 | `string-concat-in-a-loop` | should | ✓ | ✓ | ✓ | ✗ |
| 22 | `clone-and-copy-constructors` | good | ✓ | ✓ | ✓ | ✗ |
| 23 | `tostring-and-logging` | good | ✓ | ~ | ✓ | ✗ |
| 24 | `type-erasure` | must | ✓ | ✓ | ✓ | ✓ |
| 25 | `arrays-covariant-generics-invariant` | must | ✓ | ✓ | ✓ | ✓ |
| 26 | `pecs-wildcards` | must | ✓ | ✓ | ✓ | ✓ |
| 27 | `unbounded-wildcard-vs-raw-type` | should | ✓ | ✓ | ✓ | ✗ |
| 28 | `bounded-type-parameters` | should | ✓ | ✓ | ✓ | ✓ |
| 29 | `why-no-generic-arrays` | should | ✓ | ✓ | ✓ | ✗ |
| 30 | `generic-method-vs-generic-class` | good | ✓ | ✓ | ✓ | ✗ |
| 31 | `heap-pollution-and-safevarargs` | good | ✓ | ✓ | ✓ | ✓ |
| 32 | `reifiable-types-and-instanceof` | good | ✓ | ✓ | ✓ | ✗ |
| 33 | `records-what-they-give-you` | must | ✓ | ✓ | ✓ | ✓ |
| 34 | `record-equals-and-mutable-components` | should | ✓ | ✓ | ✓ | ✗ |
| 35 | `sealed-interfaces` | must | ✓ | ✓ | ✓ | ✓ |
| 36 | `pattern-matching-for-switch` | must | ✓ | ✓ | ✓ | ✓ |
| 37 | `switch-exhaustiveness` | should | ✓ | ✓ | ✓ | ✗ |
| 38 | `var-and-where-not-to-use-it` | should | ✓ | ✓ | ✓ | ✓ |
| 39 | `text-blocks` | good | ✓ | ✓ | ✓ | ✓ |
| 40 | `optional-in-a-field-or-parameter` | good | ✓ | ✓ | ✓ | ✓ |
| 41 | `checked-vs-unchecked` | must | ✓ | ✓ | ✓ | ✓ |
| 42 | `try-with-resources-and-suppressed` | should | ✓ | ✓ | ✓ | ✓ |
| 43 | `exception-translation-and-wrapping` | should | ✓ | ✓ | ✓ | ✗ |
| 44 | `finally-swallows-return` | good | ✓ | ✓ | ✓ | ✗ |

---

## Is it true — one failure

**#8 `static-nested-vs-inner` states as unconditional a thing that is
conditional, and Phase 9 had already proved it.**

> "An inner class — a nested class without `static` — holds a hidden
> reference to the instance of the enclosing class that created it."

javac emits the synthetic `this$0` field **only when the inner class actually
uses the enclosing instance**. An inner class that never touches its outer
has no such field, and the memory hazard the answer goes on to describe does
not apply to it.

This is the *same fact* that Phase 9 found and fixed in
`predict-io-and-time-inner-class-holds-the-outer-instance`, where the claimed
output was wrong for exactly this reason. **The prose form of the same error
was two files away and nothing connected them**, because the runner reads
`output.lines` and no tool reads an answer.

The fix is one clause, and the elision is worth stating rather than hiding —
"an inner class that never touches its outer is one you should have made
`static`" is the practical advice the answer is already reaching for.

The other 43 answers are correct as read, including the two whose snippets
Phase 9 rewrote (#6, #33) — in both cases the prose was right and the
demonstration was not.

## Is it asked — one reservation

**#23 `tostring-and-logging`** is good practice rather than a question anybody
asks. It survives at `good-to-know` because what it teaches — never put
secrets or a lazy JPA association in `toString()` — is a real production
defect and the deck has nowhere better to put it. Recorded so the next reader
does not have to re-derive that it was considered.

## Is it at the right tier — two reservations, no changes

The topic's own `keyTopics` names ten things, and **all ten map to a
`must-know` question**: inheritance vs composition (#1), abstract class vs
interface (#2), equals/hashCode (#12), immutability (#17), erasure (#24),
variance (#25), records (#33), sealed interfaces (#35), pattern matching for
switch (#36), exception hierarchy (#41). The tiering agrees with the topic's
own statement of what matters, which is the check worth running here.

- **#3 `default-methods-and-the-diamond`** is asked more often than
  `should-know` suggests. Left alone: the fact it teaches is a corollary of
  #2, which is `must-know`, and promoting both would double-count one idea.
- **#20 `string-pool-and-intern`** is asked constantly. Left alone for the
  same reason — `predict-java-core` already drills it as a `must-know`
  puzzle, so a reader on the study path meets it at the top tier anyway.

## Does it have a reference — 18 of 44 do not

**The worst ratio in the deck (41%), and it is not random.** No `must-know`
question is affected — `validate-questions` check 3 makes that an error — so
every one of the 18 is `should-know` or `good-to-know`.

Seven of them have an obvious canonical reference that the *theory* corpus
already cites for the same fact:

| Question | Reference the theory corpus already uses |
|---|---|
| #3 `default-methods-and-the-diamond` | JLS 9.4.1 — Inheritance and Overriding |
| #6 `initialisation-order` | JLS 12.4/12.5 |
| #27 `unbounded-wildcard-vs-raw-type` | JLS 4.8 — Raw Types |
| #29 `why-no-generic-arrays` | JLS 15.10.1 |
| #37 `switch-exhaustiveness` | JEP 441 |
| #44 `finally-swallows-return` | JLS 14.20.2 — Execution of try-finally |
| #13 `equals-and-inheritance-symmetry` | `Object.equals` javadoc |

**That is the finding worth acting on**: the deck already knows where these
are documented, in a different corpus, and the question bank does not say so.

## Cross-links

Theory cites this topic **76 times**, the highest in the deck, from
`objects-and-contracts`, `inheritance-and-interfaces`, `generics-and-erasure`,
`modern-java`, `exceptions-and-failure`, `strings-and-text` and others. Three
questions are cited by no chapter: #7 `final-three-meanings`,
#9 `access-modifiers` and #22 `clone-and-copy-constructors`. The last two are
`good-to-know` and genuinely peripheral to the reading path. **#7 is not** —
`final` on a variable, a method and a class is `should-know`, and
`inheritance-and-interfaces` and `objects-and-contracts` both teach around it
without pointing at it. One link worth adding.

## Not judged here

Whether the **answers are complete** — only whether what they say is true. An
answer can be correct and still omit the thing an interviewer follows up
with, and this pass does not look for that.
