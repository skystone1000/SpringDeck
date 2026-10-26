# Triage — `build-tools` · Build, Dependencies & Ways of Working

**10 questions · 4 must-know / 5 should-know / 1 good-to-know**
Read 2026-10-20, against the four judgements.

| # | id | tier | T | A | R | L |
|---|---|---|---|---|---|---|
| 1 | `maven-lifecycle-and-goals` | must | ✓ | ✓ | ✓ | ✓ |
| 2 | `dependency-scopes` | must | ✓ | ✓ | ✓ | ✓ |
| 3 | `nearest-wins-mediation` | must | ✓ | ✓ | ✓ | ✓ |
| 4 | `bom-and-dependency-management` | should | ✓ | ✓ | ✓ | ✓ |
| 5 | `multi-module-projects` | should | ✓ | ✓ | ✓ | ✓ |
| 6 | `maven-versus-gradle` | should | ✓ | ✓ | ✓ | ✓ |
| 7 | `dependency-vulnerabilities` | must | ✓ | ✓ | ✓ | ✓ |
| 8 | `reproducible-builds` | good | ✓ | ✓ | ✓ | ✓ |
| 9 | `branching-and-merge-strategy` | should | ✓ | ✓ | ✓ | ✓ |
| 10 | `code-review-that-works` | should | ✓ | ✓ | ✓ | ✓ |

---

## Findings

**True — no failures.** #3 `nearest-wins-mediation` states Maven's rule
correctly and, more importantly, states what it is **not**: nearest to the POM,
shortest path, **not the highest version**. That is the half people get wrong,
and it is also where Maven and Gradle differ, which #6 picks up.

**#10 `code-review-that-works` opens by saying what a review is for and that
it is not catching bugs** — the compiler, the tests and the linter are better
at that. That reframing is the answer; the rest is detail.

**Asked — no failures.** Thirteen `keyTopics`, all covered.

**Tier — no changes.**

**Reference — 10 of 10 have one**, and the two "ways of working" questions
cite the right kind of source rather than a vendor: `git-scm.com` for
branching and Google's engineering practices for review.

**Structural — this topic is deliberately flat, and that was checked.** It
declares `subsections: null` and its file header gives the reason. The first
triage pass recorded the flatness as a gap; **re-reading the ten flat topics'
headers showed every one of them carries an argued reason**, so the finding
was withdrawn. See [`SUMMARY.md`](SUMMARY.md).

**Cross-links.** Theory cites this topic **16 times** from
`build-and-dependencies`. One uncited.

**Note on the two `keyTopics` warnings.** `validate-theory` reports 117
`keyTopics` phrases that appear nowhere in the theory corpus, and **two of
them are this topic's**: `rebase vs merge` and (in `behavioural-project`)
`code review disagreement`. Both are covered here, by #9 and #10, and neither
is covered by a theory chapter. That is correct rather than a gap — they are
legitimately question-bank-only subjects, and no reading path needs a chapter
on them. Recorded because a future reader chasing those warnings will land
here.
