# Triage — `spring-core` · Spring Core & Dependency Injection

**27 questions · 8 must-know / 10 should-know / 9 good-to-know**
Read 2026-10-20, against **is it true**, **is it asked**, **is it at the right
tier**, **does it have a reference**.

| # | id | tier | T | A | R | L |
|---|---|---|---|---|---|---|
| 1 | `what-inversion-of-control-buys` | must | ✓ | ✓ | ✓ | ✓ |
| 2 | `beanfactory-vs-applicationcontext` | should | ✓ | ✓ | ~ | ✓ |
| 3 | `context-startup-sequence` | should | ✓ | ✓ | ✓ | ✓ |
| 4 | `component-scanning` | should | ✓ | ✓ | ✓ | ✓ |
| 5 | `beanpostprocessor-vs-beanfactorypostprocessor` | should | ✓ | ✓ | ~ | ✓ |
| 6 | `context-events` | good | ✓ | ✓ | ✓ | ✓ |
| 7 | `aware-interfaces-and-context-access` | good | ✓ | ✓ | ✓ | ✗ |
| 8 | `environment-and-property-sources` | good | ✓ | ✓ | ✓ | ✓ |
| 9 | `multiple-contexts` | good | ✓ | ✓ | ✓ | ✗ |
| 10 | `bean-scopes` | must | ✓ | ✓ | ✓ | ✓ |
| 11 | `prototype-in-a-singleton` | must | ✓ | ✓ | ✓ | ✓ |
| 12 | `bean-lifecycle-callbacks` | must | ✓ | ✓ | ✓ | ✓ |
| 13 | `component-vs-bean` | must | ✓ | ✓ | ✓ | ✓ |
| 14 | `configuration-proxybeanmethods` | should | ✓ | ✓ | ✓ | ✓ |
| 15 | `primary-qualifier-and-naming` | must | ✓ | ✓ | ✓ | ✓ |
| 16 | `conditional-beans` | should | ✓ | ✓ | ✓ | ✓ |
| 17 | `lazy-initialisation` | should | ✓ | ✓ | ✓ | **✗** |
| 18 | `graceful-shutdown` | good | ✓ | ✓ | ✓ | ✓ |
| 19 | `constructor-vs-field-injection` | must | ✓ | ✓ | ✓ | ✓ |
| 20 | `circular-dependency` | must | ✓ | ✓ | ✓ | ✓ |
| 21 | `injecting-a-collection-of-beans` | should | ✓ | ✓ | ✓ | ✗ |
| 22 | `objectprovider` | should | ✓ | ✓ | ✓ | ✓ |
| 23 | `value-vs-configuration-properties` | should | ✓ | ✓ | ✓ | ✓ |
| 24 | `self-injection-and-proxy` | good | ✓ | ✓ | ✓ | ✗ |
| 25 | `optional-dependencies` | good | ✓ | ✓ | ✓ | ✗ |
| 26 | `bean-definition-overriding` | good | ✓ | ✓ | ✓ | ✗ |
| 27 | `spel-in-value` | good | ✓ | ✓ | ✓ | ✓ |

---

## Findings

**True — no failures.** #26 dates bean-definition override failure to Spring
Boot 2.1, which is right, and says what the pre-2.1 behaviour was, which is
the part that makes it useful. #11 `prototype-in-a-singleton` gives the
correct answer ("one, ever") to the question people most often get wrong.

**Asked — no failures.**

**Tier — two of nine `keyTopics` land at `should-know`:**
`BeanFactory vs ApplicationContext` (#2) and `BeanPostProcessor` (#5). Both
correct where they are. #2 is a trivia question in 2026 — nobody uses a bare
`BeanFactory` — and #5 matters mainly to people writing framework code.

**Reference — 7 of 27 have none.** One stands out: **#17
`lazy-initialisation`** is a `should-know` question whose answer argues
against a specific documented property (`spring.main.lazy-initialization`) and
cites nothing. An answer that says "usually not, and here is why" is exactly
where a reader wants the official position to compare against.

The other six (#7, #9, #21, #24, #25, #26) are `good-to-know` bar #21, and
each has an obvious target in the Spring Framework reference.

**Cross-links.** Theory cites this topic **39 times**, from
`ioc-and-the-container`, `wiring-beans`, `configuration-and-profiles` and
`application-lifecycle`. Three uncited, all `good-to-know`: #9, #24, #26.
