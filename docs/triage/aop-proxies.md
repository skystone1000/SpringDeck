# Triage — `aop-proxies` · AOP, Proxies & Annotations

**14 questions · 4 must-know / 6 should-know / 4 good-to-know**
Read 2026-10-20, against **is it true**, **is it asked**, **is it at the right
tier**, **does it have a reference**.

| # | id | tier | T | A | R | L |
|---|---|---|---|---|---|---|
| 1 | `how-spring-aop-works` | must | ✓ | ✓ | ✓ | ✓ |
| 2 | `jdk-proxy-vs-cglib` | must | ✓ | ✓ | ✓ | ✓ |
| 3 | `self-invocation` | must | ✓ | ✓ | ✓ | ✓ |
| 4 | `advice-types-and-order` | should | ✓ | ✓ | ✓ | ✓ |
| 5 | `pointcut-expressions` | should | ✓ | ✓ | ✓ | ✓ |
| 6 | `async-returns-null` | must | ✓ | ✓ | ✓ | ✓ |
| 7 | `cacheable-behaviour` | should | ✓ | ✓ | ✓ | ✓ |
| 8 | `proxy-and-postconstruct` | should | ✓ | ✓ | ✓ | ✗ |
| 9 | `writing-a-custom-annotation` | should | ✓ | ✓ | ✓ | ✗ |
| 10 | `filters-interceptors-aspects` | should | ✓ | ✓ | ✓ | ✗ |
| 11 | `retryable-and-resilience` | good | ✓ | ✓ | ~ | ✗ |
| 12 | `transactional-on-private` | good | ✓ | ✓ | ~ | ✗ |
| 13 | `aop-performance` | good | ✓ | ✓ | ✓ | ✗ |
| 14 | `testing-aspects` | good | ✓ | ✓ | ✓ | ✗ |

---

## Findings

**True — no failures.** The topic is unusually coherent: every answer traces
its symptom back to the same cause, which is that the bean your caller holds
is a proxy and not your class. #8 `proxy-and-postconstruct` gives the precise
reason (`postProcessAfterInitialization` runs *after* `@PostConstruct`), which
is the level of detail that makes the answer usable rather than memorised.

**Asked — no failures.**

**Tier — two reservations.**

- **#12 `transactional-on-private` is `good-to-know` and is asked constantly.**
  Its answer says the right thing — nothing happens, at compile time or run
  time, and the silence is the problem. It sits one tier below
  #3 `self-invocation`, which is `must-know`, and the two are the same trap
  seen from different sides.
- **#11 `retryable-and-resilience` is a `keyTopic` that landed at
  `good-to-know`** — the only keyTopic in the deck to land at the bottom tier.
  Eight of the nine map to `must-know` or `should-know`; this one does not.

Neither is being changed here. Both are recorded because a reader who notices
the `self-invocation` / `transactional-on-private` split will otherwise assume
it was an oversight rather than a decision to keep one idea at one tier.

**Reference — 7 of 14 have none. At 50% this is the worst ratio in the deck**,
ahead of `java-language` at 41%, and it is the whole back half of the topic:
every question from #8 onward is uncited. The Spring Framework reference
documents `@Retryable`, `@Transactional` proxying limitations, the filter and
interceptor hierarchy and AOP proxying mechanics directly, and this topic
already cites that reference seven times for its front half. **The gap is
positional rather than topical, which usually means the second half was
written in one sitting and the habit lapsed.**

**Structural — this topic has no subsections.** Fourteen questions render as
one flat list. See the summary; ten topics share this.

**Cross-links.** Theory cites this topic **29 times** for 14 questions — the
highest ratio in the deck — from `aop-and-proxies` and `patterns-in-spring`.
Two uncited, both `good-to-know`.
