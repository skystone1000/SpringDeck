# Triage — `cloud` · Cloud & Managed Services

**9 questions · 4 must-know / 5 should-know / 0 good-to-know**
Read 2026-10-20, against the four judgements.

| # | id | tier | T | A | R | L |
|---|---|---|---|---|---|---|
| 1 | `presigned-urls` | must | ✓ | ✓ | ✓ | ✓ |
| 2 | `iam-and-least-privilege` | must | ✓ | ✓ | ✓ | ✓ |
| 3 | `containers-versus-serverless` | must | ✓ | ✓ | ✓ | ✓ |
| 4 | `java-cold-starts` | should | ✓ | ✓ | ✓ | ✓ |
| 5 | `managed-secrets` | must | ✓ | ✓ | ✓ | ✓ |
| 6 | `managed-queues` | should | ✓ | ✓ | ✓ | ✓ |
| 7 | `managed-relational-databases` | should | ✓ | ✓ | ✓ | ✓ |
| 8 | `cloud-cost-awareness` | should | ✓ | ✓ | ✓ | ✓ |
| 9 | `cloud-agnostic-or-not` | should | ✓ | ✓ | ✓ | ✓ |

---

## Findings

**True — no failures.** #1 `presigned-urls` answers the 2GB-upload question
the way it has to be answered — not through your application — and gives the
three reasons. #7 draws the distinction the topic exists for: a managed
database "takes the operations and leaves the engineering", and confusing the
two is how a team ends up surprised.

**#9 `cloud-agnostic-or-not` takes a position and defends it**, which is what
the question is testing. An answer that says "it depends" to this one has not
answered it.

**Asked — no failures.** Ten `keyTopics`, all covered by nine questions.

**Tier — no changes.** No `good-to-know` layer; correct at this size.

**Reference — 9 of 9 have one.** Eight cite AWS documentation and one cites
HashiCorp, which is honest for a topic whose examples are AWS-shaped — but see
below.

**Recorded, not a defect: this topic is AWS-flavoured and does not say so.**
Every reference bar one points at `docs.aws.amazon.com`, and the questions use
SQS and IAM as the worked examples. The *answers* are cloud-neutral — the
reasoning about presigned uploads, workload identity and cost drivers holds on
any provider — but a reader on Azure or GCP has to do the translation and
nothing tells them the translation is expected. `SPRINGDECK-PLAN.md` does not
name a target cloud either way. **This is a manifest question rather than a
question-level defect**, which is why every row above is `✓`.

**Structural — this topic has no subsections.** At nine questions this is the
least harmful instance; see the summary.

**Cross-links — 0 uncited, 17 citations** from `cloud-for-java-services` and
`platform-concerns`. Fully connected.
