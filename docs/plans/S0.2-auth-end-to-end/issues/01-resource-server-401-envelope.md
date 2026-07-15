# 01 — Backend: resource server + the UNAUTHENTICATED envelope

**What to build:** The backend becomes an OAuth2 resource server validating Firebase JWTs offline (issuer `https://securetoken.google.com/<project-id>`, per-environment env-var). Any request to a secured path without a valid token is rejected with **401 in the Artifact 05 envelope** — code `UNAUTHENTICATED`, one code for all flavors (missing/expired/malformed/bad signature) — emitted by a custom `AuthenticationEntryPoint`, because the global exception handler cannot see rejections that happen in the security filter chain. The log-context filter runs **before** the security chain so the 401 envelope carries a real `traceId`. Health stays public. Artifact 05 gains its additive 401 row (*Added S0.2*), distinct from 403's "authenticated but not permitted".

Test scaffolding decided at grilling: integration tests mint JWTs with a **test RSA keypair**; the test-scope `JwtDecoder` lives **inside the single shared `PostgresTestBase`-anchored context** (CLAUDE.md gotcha — a second Spring context poisons the container cache). Production security config stays one code path — no profile-gated validation modes.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] No token on a secured path → 401, exact Artifact 05 envelope, code `UNAUTHENTICATED`, non-empty `traceId`
- [ ] Expired token and garbage-signature token → same 401 behavior (three flavors, one code)
- [ ] Test-keypair JWT → request reaches the controller layer with the Firebase UID as principal
- [ ] Filter-order test: the 401 envelope's `traceId` is present and appears in exactly one log line
- [ ] MDC carries `userId` (Firebase UID) on authenticated requests; the 401 path logs without `userId`
- [ ] `GET /v1/health` remains public (no token required)
- [ ] Artifact 05 amended with the 401 row, marked *Added S0.2*
- [ ] All tests share the one cached Spring context (no new `@ActiveProfiles`/context forks)
