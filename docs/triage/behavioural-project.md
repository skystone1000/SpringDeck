# Triage — `behavioural-project` · Behavioural, Projects & Résumé Defence

**10 questions · 5 must-know / 5 should-know / 0 good-to-know**
Read 2026-10-20, against the four judgements.
**This is the deck's only topic with `track: null`** — it belongs to no subject
track and renders in the "Everything else" sidebar group.

| # | id | tier | T | A | R | L |
|---|---|---|---|---|---|---|
| 1 | `star-structure` | must | ✓ | ✓ | ✓ | ✓ |
| 2 | `explaining-your-architecture` | must | ✓ | ✓ | ✓ | ✓ |
| 3 | `resume-defence` | must | ✓ | ✓ | ✓ | ~ |
| 4 | `a-decision-you-got-wrong` | must | ✓ | ✓ | ✓ | ✓ |
| 5 | `describing-an-incident` | must | ✓ | ✓ | ✓ | ✓ |
| 6 | `a-tradeoff-you-made` | should | ✓ | ✓ | ✓ | ✓ |
| 7 | `estimating-and-missing` | should | ✓ | ✓ | ✓ | ~ |
| 8 | `technical-disagreement` | should | ✓ | ✓ | ✓ | ✓ |
| 9 | `hardest-bug` | should | ✓ | ✓ | ✓ | **~** |
| 10 | `questions-to-ask-the-interviewer` | should | ✓ | ✓ | ✓ | ~ |

---

## Findings

**True — no failures**, with the caveat that "true" means something different
here. These answers are advice about how to structure a story, not claims
about a system, so the judgement is whether the advice is sound. It is, and
several answers are sharper than the genre usually manages: #4 identifies the
real failure mode of "a decision you got wrong" as **choosing something that is
not a failure**; #8 names both opposite failure modes of the disagreement
question; #5 uses the postmortem as the structure because that is the shape the
information already has.

**Asked — no failures.** Eight `keyTopics`, all covered. These are, by
definition, the questions that get asked.

**Tier — no changes.**

**Reference — 10 of 10 have one, and four of them are marked `~` because the
link does not support the answer.**

This is the topic that exposes the limit of `validate-questions` check 3.
The check requires every `must-know` question to carry a reference and
verifies that the URL is `https`. **It cannot check that the reference is
about the question.**

- **#9 `hardest-bug` cites the Java SE Troubleshooting Guide.** The answer is
  about how to *tell* a debugging story — pick a bug where the wrong assumption
  was somewhere nobody was looking. Oracle's guide is a fine document and
  supports none of that.
- **#3, #7 and #10 all cite the same page**, Google's "How We Hire". It is
  topical for #3 and generic for the other two.

None of this is a defect a validator could have caught, and none of it makes
an answer wrong. It is recorded because **"has a reference" and "is supported
by a reference" are different properties, and this deck only measures the
first.** Six of the ten here are properly sourced — Amazon's hiring page, the
C4 model, ADRs twice, the SRE book's postmortem chapter, Google's code-review
practices — which is what makes the other four visible.

**Structural — this topic has no subsections.** See the summary.

**Cross-links.** Theory cites this topic **10 times** — one per question,
though not evenly — from `lld-method` and the craft modules. Three uncited.
