# Triage — `spring-security` · Spring Security, JWT & OAuth2

**19 questions · 13 must-know / 5 should-know / 1 good-to-know**
Read 2026-10-20, against **is it true**, **is it asked**, **is it at the right
tier**, **does it have a reference**.

| # | id | tier | T | A | R | L |
|---|---|---|---|---|---|---|
| 1 | `how-the-security-filter-chain-works` | must | ✓ | ✓ | ✓ | ✓ |
| 2 | `configuring-security-in-spring-6` | must | ✓ | ✓ | ✓ | ✓ |
| 3 | `authentication-versus-authorization` | must | ✓ | ✓ | ✓ | ✓ |
| 4 | `authenticationmanager-and-providers` | should | ✓ | ✓ | ✓ | ✓ |
| 5 | `session-versus-jwt` | must | ✓ | ✓ | ✓ | ✓ |
| 6 | `jwt-structure-and-validation` | must | ✓ | ✓ | ✓ | ✓ |
| 7 | `jwt-attacks` | should | ✓ | ✓ | ~ | ✓ |
| 8 | `revoking-a-jwt` | must | ✓ | ✓ | ✓ | ✓ |
| 9 | `where-to-store-a-token` | must | ✓ | ✓ | ✓ | ✓ |
| 10 | `oauth2-roles-and-grants` | must | ✓ | ✓ | ✓ | ✓ |
| 11 | `authorization-code-with-pkce` | must | ✓ | ✓ | ✓ | ✓ |
| 12 | `oauth2-versus-oidc` | must | ✓ | ✓ | ✓ | ✓ |
| 13 | `service-to-service-authentication` | should | ✓ | ✓ | ✓ | ✓ |
| 14 | `cors-and-preflight` | must | ✓ | ✓ | ✓ | ✓ |
| 15 | `csrf-on-a-stateless-api` | must | ✓ | ✓ | ✓ | ✓ |
| 16 | `storing-passwords` | must | ✓ | ✓ | ✓ | ✓ |
| 17 | `method-security-and-preauthorize` | should | ✓ | ✓ | ✓ | ✓ |
| 18 | `owasp-api-top-ten` | should | ✓ | ✓ | ✓ | ✓ |
| 19 | `security-headers` | good | ✓ | ✓ | ✓ | ✓ |

---

## Findings

**This is the best-covered topic in the deck.** Complete reference coverage,
complete cross-link coverage, all twelve `keyTopics` addressed, and the
highest `must-know` ratio at 13 of 19.

**True — no failures.** The claims most likely to be got wrong are all right:
`WebSecurityConfigurerAdapter` was deprecated in 5.7 and removed in 6.0 (#2);
a JWT's first two segments are encoded and **not encrypted** (#6); a signed
token cannot be revoked and every real answer reintroduces state (#8);
`alg: none` is permitted by the specification and that is where the attack
starts (#7).

**#15 `csrf-on-a-stateless-api` is the strongest single answer in the topic**
— "yes, if and only if the API does not authenticate with cookies", and it
says outright that disabling CSRF without stating the condition is the answer
that fails the question. That is the difference between a memorised answer and
an understood one, and it is what the question is testing.

**Asked — no failures.** #10 opens by observing that most candidates have used
OAuth2 and cannot name the four roles, which is a fair statement of why it is
asked.

**Tier — one reservation.** **#7 `jwt-attacks` at `should-know`** sits below
#6 `jwt-structure-and-validation`, which is `must-know`. Defensible — the
attacks are the follow-up to the validation question rather than a separate
one — but `alg: none` and key-confusion are asked directly often enough that
the split is arguable.

**Reference — 19 of 19 have one**, and six carry two. The mix is right: RFCs
for the protocol facts, the OWASP cheat sheets for the storage and hardening
advice, MDN for the browser-enforced parts of CORS, and Spring's reference
only for the Spring-specific mechanics.

**Cross-links — 0 uncited, 44 citations** from `auth-foundations`,
`security-filter-chain`, `jwt-in-practice`, `oauth2-and-oidc`,
`method-security` and `api-hardening`. Six modules, nineteen questions, no
orphans.
