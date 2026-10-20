# Triage — `beyond-rest` · Beyond REST: gRPC, GraphQL, WebSockets & Reactive

**18 questions · 10 must-know / 8 should-know / 0 good-to-know**
Read 2026-10-20, against **is it true**, **is it asked**, **is it at the right
tier**, **does it have a reference**.

| # | id | tier | T | A | R | L |
|---|---|---|---|---|---|---|
| 1 | `rest-grpc-graphql-choice` | must | ✓ | ✓ | ✓ | ✓ |
| 2 | `protobuf-contract-evolution` | must | ✓ | ✓ | ✓ | ✓ |
| 3 | `grpc-streaming-modes` | should | ✓ | ✓ | ✓ | ✓ |
| 4 | `graphql-over-and-under-fetching` | must | ✓ | ✓ | ✓ | ✓ |
| 5 | `graphql-n-plus-one-and-dataloader` | must | ✓ | ✓ | ✓ | ✓ |
| 6 | `graphql-schema-evolution` | should | ✓ | ✓ | ✓ | ✓ |
| 7 | `websockets-sse-or-polling` | must | ✓ | ✓ | ✓ | ✓ |
| 8 | `streaming-from-spring` | should | ✓ | ✓ | ✓ | ✓ |
| 9 | `scaling-websocket-connections` | should | ✓ | ✓ | ✓ | ✓ |
| 10 | `http2-and-what-it-changed` | should | ✓ | ✓ | ✓ | ✓ |
| 11 | `mono-and-flux-basics` | must | ✓ | ✓ | ✓ | ✓ |
| 12 | `backpressure` | must | ✓ | ✓ | ✓ | ✓ |
| 13 | `blocking-in-a-reactive-chain` | must | ✓ | ✓ | ✓ | ✓ |
| 14 | `reactive-versus-virtual-threads` | must | ✓ | ✓ | ✓ | ✓ |
| 15 | `webclient-restclient-resttemplate` | must | ✓ | ✓ | ✓ | ✓ |
| 16 | `reactive-context-and-threadlocal` | should | ✓ | ✓ | ✓ | ✓ |
| 17 | `reactive-whole-stack-problem` | should | ✓ | ✓ | ✓ | ✓ |
| 18 | `debugging-a-reactive-stack-trace` | should | ✓ | ✓ | ✓ | ✓ |

---

## Findings

**True — no failures, and one cross-corpus agreement worth recording.**
#15 says `RestClient` arrived in Spring Framework 6.1 and that `RestTemplate`
is "in maintenance mode since Spring 5, **not deprecated**". `spring-boot`
#23 says the same thing in the same words. Two topics written in different
phases agree on a distinction that is widely misstated, and nothing in the
toolchain checks that they do.

#2 `protobuf-contract-evolution` correctly identifies the field *number* as
the contract rather than the name, which is the fact the question exists for.

**Asked — no failures.**

**Tier — no changes. This topic has no `good-to-know` questions at all**, the
only one in the deck apart from four small later topics. That is defensible
rather than an oversight: everything here is either a technology choice a
senior candidate is expected to defend or a failure mode that takes a service
down. There is no trivia layer because the subject has not been around long
enough to grow one.

**Reference — 18 of 18 have one.** Complete coverage, and the citations are
to primary sources — `grpc.io`, `protobuf.dev`, `graphql.org`,
`reactive-streams.org`, `projectreactor.io`, MDN and the RFC editor — rather
than to Spring's summary of them.

**Cross-links.** Theory cites this topic **17 times**, from `api-styles` and
`reactive-and-webflux`. Five uncited, all in the `styles` and `streaming`
subsections. Slightly thin for 18 questions but the modules that teach the
material do link here, which is the property `jvm-memory` lacks.
