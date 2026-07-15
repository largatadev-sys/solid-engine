# 05 — End-to-end: authenticated /v1/me on device

**What to build:** The full slice joined up: the signed-in traveler's ID token rides every API call through the typed apiClient (ADR-001 — token attach lives in the one client, never in UI code), the me-screen renders what `GET /v1/me` returned, and an `UNAUTHENTICATED` response routes to sign-in. This is where the story's device ACs close, and the **one** exercise of the real-Firebase seam (a human signing in and hitting the real backend) happens.

**Blocked by:** 02 — Traveler provisioning · 04 — Firebase sign-in.

**Status:** done — except Google sign-in, which is **untested** (see Comments; not claimed)

- [x] **(device AC)** Sign in on the AVD (**email**) → me-screen shows the Traveler from `GET /v1/me` against the composed stack — **Google untested, see below**
- [x] **(device AC)** First-ever sign-in provisions the Traveler exactly once — row observed in Postgres; signing out and back in creates nothing new
- [x] Signed out → protected call returns 401 envelope → app routes to sign-in (observed on-device)
- [x] Display name on the me-screen: **email account shows local-part** (`ana.silva`) — **the Google half is untested**
- [x] `userId` appears in backend request-scoped logs for the on-device session's calls
- [x] Jest: token attach on requests, 401-to-sign-in routing, signed-out state — SDK mocked at the boundary

## Comments

**2026-07-15 — the slice is proven end to end on the emulator, with one honest gap.**

Full email path, against the real `largata-dev` project and the composed stack:
- **Sign-up on the AVD → Traveler provisioned.** One row from an empty table: `id=019f658b-ddb3-7eba-bb53-e8f0b0b4bb24`, `firebase_uid=UDQTXmMyOuN9hFBY6nmszRxW8LI3` (a real Firebase UID), `email=ana.silva@example.com`, `display_name=ana.silva`. Three separate confirmations in one row: the resource server really validated a Google-signed token offline; the id is a **UUIDv7** (the `019f658b` prefix is the millisecond timestamp — app-side, as specified); and `ana.silva` is the **email local-part fallback**, since an email sign-up carries no `name` claim.
- **Idempotency, twice over.** Two extra `/v1/me` calls (Reload) → still one row, same id. Then a full **sign-out → sign-in cycle** → still one row, same id. The AC asked for the second; the first came free.
- **Sign-out → routed to sign-in**, driven by the auth listener, not by the screen.
- **One backend log line proves four things at once:** structured JSON, `traceId`, `userId=UDQTXmMyOuN9hFBY6nmszRxW8LI3` (the real UID, injected by `UserContextFilter`), `endpoint`, and the Traveler named **by id only**. `grep` for the email across the whole backend log: **zero hits** — P3 verified by evidence, not assertion.

**The gap: Google sign-in is untested, and the AC is not ticked for it.** The AVD has Play Services but **zero Google accounts** (`dumpsys account` → `Accounts: 0`), so the picker would open onto nothing. Testing it needs a real Google account signed into the emulator — the owner's credentials, which the agent will not use. What *is* proven: the config plugin, the SHA-1 (`5e8f1606…cabf625`, registered and present in `google-services.json` as an `android_info` cert), the web client id wiring, and `GoogleSignin.configure()` at startup (unit-tested both ways). What is **not** proven is the one thing only a device can show: that the picker returns an idToken our exchange accepts. **Owner action to close it:** add a Google account to the AVD (Settings → Passwords & accounts → Add account), tap "Continue with Google", confirm the me-screen shows the Google profile *name* rather than a local-part.

**Two mechanical notes for the next session.** Metro must be running (`npx expo start --dev-client`) or the dev-build shows a blank screen with only *"Tried to access onWindowFocusChange while context is not ready"* in logcat — no JS error, because there is no JS. And a killed Expo task can leave a zombie node holding port 8081 that does not answer `/status`; kill it by PID rather than trusting the port to be free.
