# 01 — Backend: resource server + the UNAUTHENTICATED envelope

**What to build:** The backend becomes an OAuth2 resource server validating Firebase JWTs offline (issuer `https://securetoken.google.com/<project-id>`, per-environment env-var). Any request to a secured path without a valid token is rejected with **401 in the Artifact 05 envelope** — code `UNAUTHENTICATED`, one code for all flavors (missing/expired/malformed/bad signature) — emitted by a custom `AuthenticationEntryPoint`, because the global exception handler cannot see rejections that happen in the security filter chain. The log-context filter runs **before** the security chain so the 401 envelope carries a real `traceId`. Health stays public. Artifact 05 gains its additive 401 row (*Added S0.2*), distinct from 403's "authenticated but not permitted".

Test scaffolding decided at grilling: integration tests mint JWTs with a **test RSA keypair**; the test-scope `JwtDecoder` lives **inside the single shared `PostgresTestBase`-anchored context** (CLAUDE.md gotcha — a second Spring context poisons the container cache). Production security config stays one code path — no profile-gated validation modes.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] No token on a secured path → 401, exact Artifact 05 envelope, code `UNAUTHENTICATED`, non-empty `traceId`
- [x] Expired token and garbage-signature token → same 401 behavior (four flavors tested: missing, expired, foreign-signed, non-JWT)
- [x] Test-keypair JWT → request reaches the controller layer with the Firebase UID as principal
- [x] Filter-order test: the 401 envelope's `traceId` is present and appears in exactly one log line
- [x] MDC carries `userId` (Firebase UID) on authenticated requests; the 401 path logs without `userId`
- [x] `GET /v1/health` remains public (no token required)
- [x] Artifact 05 amended with the 401 row, marked *Added S0.2*
- [x] All tests share the one cached Spring context (no new `@ActiveProfiles`/context forks) — 42 tests, one container start, sub-second per class after the first

## Comments

**2026-07-15 — implemented. Two real bugs, both caught by ACs that existed because the grilling session insisted on them.**

**The filter-order AC earned its place immediately.** `LogContextFilter` was an unordered `@Component`, which Boot gives `LOWEST_PRECEDENCE`; Spring Security's chain registers at **-100**, so security ran *first* and the log filter never ran for a rejected request. Every 401 rendered `traceId: null` — an error the client cannot correlate to any log line. Invisible on the happy path (a 200 gets its traceId either way), so only the "assert the traceId in a real 401 body" AC could catch it. Fixed with an explicit `@Order(HIGHEST_PRECEDENCE)`; the rationale is in the filter's javadoc.

**The entry point has to be registered twice, and that is not redundancy.** Setting it only on `exceptionHandling()` left *bad* tokens (expired/forged/garbage) answering through the resource-server DSL's own `BearerTokenAuthenticationEntryPoint` — empty body, `WWW-Authenticate` header. Only "no token at all" got our envelope. So one situation had two response shapes, and the four-flavor parameterized AC is what exposed it: with a single flavor tested, this ships. Now set on `oauth2ResourceServer(...)` as well.

**`ErrorContractIT` broke, and that was default-deny working.** Eight S0.1 tests went red the moment `anyRequest().authenticated()` landed — the test-scoped throwing controller was written a story before auth existed and got secured without anyone remembering it. Fixed on the *test* side (the tests now carry a token), not by permitting `/v1/test-errors/**` in `SecurityConfig`: a test-only hole in production security config is exactly the fork the spec refuses. The tests are more truthful for it — production error paths are raised behind auth too.

**Jackson 3 (`tools.jackson.databind`), not Jackson 2.** Boot 4.1 ships Jackson 3, which moved every databind class out of `com.fasterxml.jackson.databind`. Every Spring example on the internet uses the old path and fails to resolve. Recorded in CLAUDE.md gotchas.

**Boot's autoconfigured `JwtDecoder` is used as-is** — `issuer-uri` config is enough; a hand-built decoder bean would duplicate it. Tests override the bean with a test-keypair decoder (`TestJwtSupport`), which is the only fiction: production security config has no test-aware branch.

**`userId` needed a second filter, not two lines in `LogContextFilter`.** The two facts become knowable at opposite ends of the security chain: `traceId` must exist *before* it (so 401s correlate), `userId` only *after* it (a token must be verified before its `sub` is believed). `UserContextFilter` is therefore registered *inside* the chain via `addFilterAfter(...)` — as a `@Component` it would sit in front of it, find an empty security context, and silently log nothing forever.
