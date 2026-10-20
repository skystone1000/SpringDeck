# Triage — `testing` · Testing

**11 questions · 7 must-know / 4 should-know / 0 good-to-know**
Read 2026-10-20, against the four judgements.

| # | id | tier | T | A | R | L |
|---|---|---|---|---|---|---|
| 1 | `the-test-pyramid-honestly` | must | ✓ | ✓ | ✓ | ✓ |
| 2 | `what-to-mock` | must | ✓ | ✓ | ✓ | ✓ |
| 3 | `spring-test-slices` | must | ✓ | ✓ | ✓ | ✓ |
| 4 | `test-context-caching` | must | ✓ | ✓ | ✓ | ✓ |
| 5 | `transactional-tests-hide-bugs` | must | ✓ | ✓ | ✓ | ✓ |
| 6 | `testcontainers-over-h2` | must | ✓ | ✓ | ✓ | ✓ |
| 7 | `mockitobean-versus-mock` | should | ✓ | ✓ | ✓ | ✓ |
| 8 | `junit5-features-worth-using` | should | ✓ | ✓ | ✓ | ~ |
| 9 | `contract-testing` | should | ✓ | ✓ | ✓ | ✓ |
| 10 | `flaky-tests` | must | ✓ | ✓ | ✓ | ✓ |
| 11 | `what-coverage-tells-you` | should | ✓ | ✓ | ✓ | ✓ |

---

## Findings

**True — no failures, and one answer is current in a way most are not.**
**#7 uses `@MockitoBean`, not `@MockBean`.** The replacement landed in Spring
Framework 6.2 / Boot 3.4 and a great deal of published material still uses the
old name; the topic's `keyTopics` names it as `@MockitoBean vs @Mock`, so the
manifest and the question agree.

**#4 `test-context-caching` is the strongest answer in the topic** and says so
— context-cache fragmentation is the highest-value piece of Spring testing
knowledge, and it is the actual reason suites take twenty minutes.

**#10 `flaky-tests` refuses the common answer** (add a retry) and reframes the
flake as information about a real race. **#11 does the same for coverage**: a
useful signal and a bad target.

**Asked — no failures.** Eleven `keyTopics`, all covered by eleven questions.

**Tier — no changes.**

**Reference — 11 of 11 have one.** #8 is marked `~` because it cites
`docs.junit.org/current/…`, one of the three deliberate `current/` aliases
Phase 9 allow-listed: it 302s to whatever release is current, which is the
stable choice, and pinning past it to `/6.1.3/` is what would rot.

**#11 cites `pitest.org`** rather than a coverage tool, which is the right
call for an answer whose point is that line coverage measures the wrong thing.

**Structural — this topic has no subsections.** See the summary.

**Cross-links.** Theory cites this topic **18 times** from `testing-pyramid`
and `testing-spring`. Two uncited.
