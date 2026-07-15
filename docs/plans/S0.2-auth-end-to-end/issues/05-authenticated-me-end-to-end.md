# 05 — End-to-end: authenticated /v1/me on device

**What to build:** The full slice joined up: the signed-in traveler's ID token rides every API call through the typed apiClient (ADR-001 — token attach lives in the one client, never in UI code), the me-screen renders what `GET /v1/me` returned, and an `UNAUTHENTICATED` response routes to sign-in. This is where the story's device ACs close, and the **one** exercise of the real-Firebase seam (a human signing in and hitting the real backend) happens.

**Blocked by:** 02 — Traveler provisioning · 04 — Firebase sign-in.

**Status:** done — every AC met on-device, both providers

- [x] **(device AC)** Sign in on the AVD (**Google and email**) → me-screen shows the Traveler from `GET /v1/me` against the composed stack
- [x] **(device AC)** First-ever sign-in provisions the Traveler exactly once — row observed in Postgres; signing out and back in creates nothing new (verified for **both** providers)
- [x] Signed out → protected call returns 401 envelope → app routes to sign-in (observed on-device)
- [x] Display name on the me-screen: **Google account shows the profile name** (`Largata`); **email account shows the local-part** (`ana.silva`) — both branches of the rule proven
- [x] `userId` appears in backend request-scoped logs for the on-device session's calls
- [x] Jest: token attach on requests, 401-to-sign-in routing, signed-out state — SDK mocked at the boundary

## Comments

**2026-07-15 — the slice is proven end to end on the emulator, with one honest gap.**

Full email path, against the real `largata-dev` project and the composed stack:
- **Sign-up on the AVD → Traveler provisioned.** One row from an empty table: `id=019f658b-ddb3-7eba-bb53-e8f0b0b4bb24`, `firebase_uid=UDQTXmMyOuN9hFBY6nmszRxW8LI3` (a real Firebase UID), `email=ana.silva@example.com`, `display_name=ana.silva`. Three separate confirmations in one row: the resource server really validated a Google-signed token offline; the id is a **UUIDv7** (the `019f658b` prefix is the millisecond timestamp — app-side, as specified); and `ana.silva` is the **email local-part fallback**, since an email sign-up carries no `name` claim.
- **Idempotency, twice over.** Two extra `/v1/me` calls (Reload) → still one row, same id. Then a full **sign-out → sign-in cycle** → still one row, same id. The AC asked for the second; the first came free.
- **Sign-out → routed to sign-in**, driven by the auth listener, not by the screen.
- **One backend log line proves four things at once:** structured JSON, `traceId`, `userId=UDQTXmMyOuN9hFBY6nmszRxW8LI3` (the real UID, injected by `UserContextFilter`), `endpoint`, and the Traveler named **by id only**. `grep` for the email across the whole backend log: **zero hits** — P3 verified by evidence, not assertion.

**The gap at the time of writing: Google sign-in was untested, and the AC was not ticked for it.** The AVD had Play Services but zero Google accounts, so the picker would open onto nothing. Everything around it was proven — config plugin, SHA-1, web client id, `configure()` — but not the one thing only a device can show: that the picker returns an idToken our exchange accepts.

**2026-07-16 — closed, and the refusal to claim it paid off immediately.**

Owner added a Google account. The very first device attempt failed with **`accessToken cannot be empty`**: `GoogleAuthProvider.credential(idToken)` passes RNFirebase's JS layer and is rejected by its native layer — the two disagree, so the TypeScript signature lies (full write-up in ticket 04's comments; fix is `getTokens()` and passing both tokens). Thirteen green unit tests could not see it, because the mock had copied the permissive JS signature. That is exactly the failure this AC was held open for.

**After the fix, the full smoke sequence on-device, both providers:**
- Google sign-in → second Traveler provisioned: `vK34CvzpphPeDnPjnAPAcZCnaXc2`, `display_name: **Largata**` — the **`name`-claim** branch of the display-name rule, which an email sign-up can never reach. Two rows now, two distinct Firebase UIDs, two distinct UUIDv7 ids.
- Idempotency for Google: two reloads + a full sign-out/sign-in cycle → still 2 rows, same ids.
- Session survived a force-stop and relaunch (restored to the health screen, not sign-in).
- **Account switch** Google → email landed on `ana.silva`'s own row — proving the Google-session sign-out (`GoogleSignin.signOut()` alongside Firebase's) does real work.
- The Google traveler's provisioning log line carries its `userId`, names the traveler by id, and leaks no PII.

**Two mechanical notes for the next session.** Metro must be running (`npx expo start --dev-client`) or the dev-build shows a blank screen with only *"Tried to access onWindowFocusChange while context is not ready"* in logcat — no JS error, because there is no JS. And a killed Expo task can leave a zombie node holding port 8081 that does not answer `/status`; kill it by PID rather than trusting the port to be free.
