---
title: Triage — theory, synthesis, predict and glossary (mechanical pass)
status: superseded
superseded_by: audits/audit_4_theory.md
last_updated: 2026-10-26
scope: >
  The mechanical pass over the four modes the question-bank read did not
  cover, plus two findings raised and refused. Superseded for the read itself
  by audit_4_theory.md; kept for the refusals and the version-block
  correction.
---

# Triage — theory, synthesis, predict and glossary

The question bank was read question by question; the record is the 26 files
beside this one. This file records the **mechanical** pass over the other four
modes, made on 2026-10-24, and was careful at the time about the difference
between what had been checked and what had been read.

The read it said was outstanding happened on 2026-10-26. Its record is
[`THEORY.md`](THEORY.md).

Checked 2026-10-24, against the corpus at that date: 687 chapters across 83
modules, 46 drills, 81 predicts, 61 glossary terms.

| | Read in full | Checked mechanically |
|---|---|---|
| Theory — 687 chapters | **✓ — 2026-10-26, see [`THEORY.md`](THEORY.md)** | ✓ |
| Theory — **44 version blocks, 139 items** | ✓ — see the correction below | ✓ |
| Synthesis — 46 drills | **✓ — 2026-10-26** | ✓ |
| Predict — 81 puzzles | **✓ — 2026-10-26** | ✓ |
| Glossary — 61 terms | **✓ — harvested from the `definition` blocks, which were read** | ✓ |

> **This file is superseded by [`THEORY.md`](THEORY.md).** It is kept because the two refusals it
> records are still correct, and because its final section — the one that said the read had not
> happened — is the reason it did.


---

## What was read: every version block

The version blocks are the deck's explicit shelf-life claims — the places it
says "this became true in release N" — so they are the content most likely to
be wrong and the content whose wrongness matters most. There are 44 of them
carrying 139 items, which is a bounded set, so it was read in full rather
than sampled.

**No errors found — and that claim was too broad.** The chapter-by-chapter read of
2026-10-26 found one: `relational-foundations` stated that Hibernate 6.5's
`@UuidGenerator(style = TIME)` generates UUIDv7 values. It does not — `TIME` is an
RFC 4122 **version 1** strategy, and `VERSION_7` arrives in Hibernate 7.0. What was
actually verified below is the JDK and Spring releases, which are widely known; a
third-party library API was not, and it survived. Spot-checked against what is known of
each release: JEP
491 removing `synchronized` pinning in Java 24, JEP 486 disabling the Security
Manager in 24, JEP 490 removing non-generational ZGC in 24 after JEP 474 made
generational the default in 23, JEP 400 making UTF-8 the default charset in
18, JEP 374 disabling biased locking in 15, JEP 431 adding sequenced
collections in 21, records final in 16, sealed types in 17, text blocks in 15,
`var` in 10 and lambda parameters in 11, circular references prohibited in
Spring Boot 2.6, `AutoConfiguration.imports` replacing `spring.factories` in
2.7.

Two properties worth recording because they are what makes the blocks
trustworthy. **They say which release a thing became true in and which one
it stopped being true in**, using the `was`/`changed`/`is`/`removed`/`preview`
states rather than a bare date. And **`preview` is used honestly**:
`StructuredTaskScope` is marked a fifth preview at Java 25 with an explicit
"say so if you bring it up — knowing it is unfinished is part of the answer".

## What was checked mechanically, across all 687 chapters

| Check | Result |
|---|---|
| chapters with no `docs[]` | **0** |
| `must-know` chapters with no `docs[]` | 0 — `validate-theory` check 4 forbids it |
| chapters whose title+summary duplicate another module's | **0** |
| chapters with no `relatedQuestions` | 63 — see below |
| summaries under 40 characters | 0 |

**Theory is better referenced than the question bank was.** Zero chapters lack
a documentation link, where the question bank had 81 questions with none until
this session.

The 63 chapters with no `relatedQuestions` are not a gap of the kind
`heap-and-gc` had. `validate-theory` check 8 now requires a **module** to link
somewhere, which is the right granularity: not every chapter has a question
that drills it, and forcing one would produce links nobody chose.

## Two findings raised mechanically and refused on reading

Recording refusals matters as much as recording defects here, because both
looked like real gaps from the numbers alone.

### 87 chapters carry a version-shaped claim with no `version` block — refused

`SPRINGDECK-PLAN.md` Part 9 forbids "a version statement without a version
block". A regex over all 687 chapters flagged 87, narrowed to 60 for strong
assertions.

**Reading them withdrew it.** Most are historical facts that are already dated
in the prose — "Metaspace replaced PermGen in Java 8", "G1 has been the
default since Java 9", "`@SafeVarargs` on private methods since Java 9" — and
a fact stated with its release attached has no shelf life to put in a block.
The rule targets undated present-tense claims, and those are what the corpus
does not have. A good part of the 87 was pure regex noise: "the flow you can
**no longer** read top to bottom", "the cast you **no longer** write".

### 10 predicts reveal an answer with no `explain` — refused

All ten are in `predict-concurrency` and every one carries a substantive
`verification` string, so the flag looked like a real inconsistency: 71
puzzles explain themselves and 10 present their reasoning under a "Checked
against:" label meant for provenance.

**Reading them withdrew it too, and the shape is the point.** The two groups
have opposite and correct shapes:

- A **`stdout`** predict was executed by `run-snippets.js`, so it needs no
  `verification` — and carries `explain`.
- A **`behaviour`** predict cannot be executed, so it carries `verification`
  naming the spec section — and its reasoning is in `output.lines`, which is
  what a `trace` is for. "There is no happens-before edge between the write in
  main and the read in the worker, so JLS 17.4 does not require the worker to
  observe it — ever" is an explanation, and it is in the right field.

No reader of those ten is left without a reason. The `explain` field is
absent because the trace is doing its job.

## Drills, predicts and glossary — mechanical results

| | |
|---|---|
| drills with no tier, prompt or watch-list | **0** of 46 |
| drills with a duplicate title | 0 |
| predicts with no options, or an answer index out of range | **0** of 81 |
| predicts with a duplicate title | 0 |
| non-`stdout` predicts with no `verification` | **0** of 51 |
| glossary terms duplicated, empty, or under 60 characters | **0** of 61 |

## What HAD not been done — now done

This section used to read:

> **687 chapters, 46 drills, 81 predicts and 61 glossary terms have not been read for
> correctness.** ... **A chapter-by-chapter read is the outstanding work on this deck.**

It happened on 2026-10-26 and the record is [`THEORY.md`](THEORY.md). It found **fifteen defects**,
four of them proved by compiling or executing the claim.

The prediction this file made was: *"The question-bank read found exactly one wrong answer in 486.
If that rate holds, there is roughly one wrong claim somewhere in the 687 chapters and nothing here
would have found it."* The rate did not hold — it was about fifteen times higher — and the reason
is the one the prediction missed. The question bank is mostly prose about judgement, which does not
rot. The theory corpus is where the version numbers, the JEP references and the third-party APIs
live, and those do.
