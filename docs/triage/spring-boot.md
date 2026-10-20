# Triage — `spring-boot` · Spring Boot & Auto-Configuration

**24 questions · 7 must-know / 9 should-know / 8 good-to-know**
Read 2026-10-20, against **is it true**, **is it asked**, **is it at the right
tier**, **does it have a reference**.

| # | id | tier | T | A | R | L |
|---|---|---|---|---|---|---|
| 1 | `what-springbootapplication-is` | must | ✓ | ✓ | ✓ | ✓ |
| 2 | `how-auto-configuration-is-discovered` | must | ✓ | ✓ | ✓ | ✓ |
| 3 | `overriding-auto-configuration` | must | ✓ | ✓ | ✓ | ✓ |
| 4 | `what-a-starter-is` | should | ✓ | ✓ | ✓ | ✓ |
| 5 | `springapplication-run-lifecycle` | should | ✓ | ✓ | ✓ | ✓ |
| 6 | `embedded-server` | should | ✓ | ✓ | ✓ | ✓ |
| 7 | `actuator-basics` | should | ✓ | ✓ | ✓ | ✓ |
| 8 | `fat-jar-and-layers` | good | ✓ | ✓ | ✓ | ✓ |
| 9 | `devtools-and-restart` | good | ✓ | ✓ | ✓ | ✓ |
| 10 | `property-precedence` | must | ✓ | ✓ | ✓ | ✓ |
| 11 | `profiles-and-their-limits` | must | ✓ | ✓ | ✓ | ✓ |
| 12 | `configuration-properties-binding` | should | ✓ | ✓ | ✓ | ✓ |
| 13 | `config-files-and-secrets` | should | ✓ | ✓ | ✓ | ✓ |
| 14 | `yaml-vs-properties` | good | ✓ | ✓ | ✓ | ✗ |
| 15 | `config-import-and-cloud-config` | good | ✓ | ✓ | ✓ | ✓ |
| 16 | `refreshing-configuration` | good | ✓ | ✓ | ✓ | ✗ |
| 17 | `testing-configuration` | good | ✓ | ✓ | ✓ | ✓ |
| 18 | `javax-to-jakarta` | must | ✓ | ✓ | ✓ | ✓ |
| 19 | `boot-3-other-changes` | must | ✓ | ✓ | ✓ | ✓ |
| 20 | `what-boot-3-added` | should | ✓ | ✓ | ✓ | ✓ |
| 21 | `version-support-windows` | should | ✓ | ✓ | ✓ | ✓ |
| 22 | `planning-a-major-upgrade` | should | ✓ | ✓ | ✓ | ✗ |
| 23 | `deprecations-and-replacements` | good | ✓ | ✓ | ✓ | **✗** |
| 24 | `native-image-tradeoffs` | good | ✓ | ✓ | ✓ | ✓ |

---

## Findings

**True — no failures, in the topic where that mattered most.** This is the
most version-dense topic in the deck and every claim checked out: the
`javax`→`jakarta` move is attributed correctly to Oracle transferring Java EE
to Eclipse without the package name (#18); trailing-slash matching really did
change in Spring Framework 6 (#19); `spring.config.import` really did arrive
in Boot 2.4 to replace the bootstrap context (#15).

**#23 gets right the thing almost every list of this kind gets wrong**:
"`RestTemplate` → `RestClient` (Boot 3.2). RestTemplate is in maintenance,
**not deprecated**". The distinction is real and is repeatedly misstated
elsewhere.

**Asked — no failures.**

**Tier — no changes.** All eleven `keyTopics` are covered and the mapping is
clean.

**Reference — 4 of 24 have none, and one of the four is the worst-placed
reference gap in this topic.** **#23 `deprecations-and-replacements` is a
list of current spellings with no citation.** Every other perishable claim in
this topic carries a link to the Boot reference or the release-notes wiki;
this one, whose entire content is "what has quietly been replaced", carries
nothing — so when `RestClient` is itself superseded there is nothing to
re-check it against. **A question whose subject is change is the one that most
needs a source.**

#22 `planning-a-major-upgrade` is procedure rather than fact and survives
uncited; #14 and #16 are `good-to-know`.

**Cross-links.** Theory cites this topic **29 times**, from
`autoconfiguration`, `configuration-and-profiles`, `spring-generations` and
`application-lifecycle`. Seven uncited — high for a topic this well covered,
and all in the `config` and `versions` subsections rather than `autoconfig`.
