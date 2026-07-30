# 02 — OTP verification end-to-end

**Status:** done

**What to build:** a traveler signing up with email verifies by typing a 6-digit code from their inbox, on the code-boxes screen the wireframe shows — replacing the Firebase link mechanism at sign-up. The backend issues, mails (Resend), and confirms the code, flipping `email_verified` through the Admin SDK seam; the client refreshes its token and proceeds. Google sign-ups never see the screen. The console work (Resend account, sending-domain DNS, per-rung keys, Admin SDK service account) is part of this ticket — do the DNS first, propagation is not instant.

**Blocked by:** 01 — palette + front-door restructure (the screen shell and the flow insertion point).

- [x] Email sign-up: code issued and mailed; correct code → `email_verified` true after token refresh → flow proceeds (spec AC 1)
- [x] Wrong code, attempt cap, expiry, and resend-inside-cooldown each refuse with a typed error (spec AC 2)
- [x] Codes stored hashed; absent from logs when the real mailer runs; the keyless logging sink stands in locally and prints the mail to the backend log (spec decision 2)
- [x] Single active code per traveler; a fresh send invalidates the prior code
- [x] The Admin SDK dependency lives behind a one-class seam ("flip `email_verified` for uid"); its credential is env-var only — never committed (spec, backend scope)
- [x] The old verify-email screen is replaced; no inbox-reachable verification path remains (the unreachable-screen discharge, spec decision 2)
- [~] Google sign-in skips verification entirely, on device and web (spec decision 3)
- [x] Invite-accept gate untouched: the existing verified-email ITs stay green without modification

## Comments

**2026-07-30 — implemented.** Backend 78 unit + 360 IT · mobile 1005 tests · typecheck clean · local stack · preview container · Android dev build on the AVD.

1. **The Admin SDK's default transport returns 503 for a call that SUCCEEDED, and only a real round-trip could show it.** With `getDefaultTransport()` left to choose, `updateUser` flipped `email_verified` on Google's side and then died decoding the response (`FirebaseAuthException: … Not in GZIP format`), so confirm answered **503 while the traveler was verified** — on the OTP screen that reads as "the code never works", forever, for an account that is already fine. Fixed by naming the transport: `FirebaseOptions.builder().setHttpTransport(new NetHttpTransport())`. Every IT stubs `EmailVerificationFlag` — which is what the seam is for, and exactly why the seam is not a substitute for the walk.
2. **Adding `firebase-admin` silently re-pointed the HTTP transport under the whole application.** It drags in Apache HttpClient 5, Spring picks its request factory by *classpath detection*, and HttpClient 5 **retries 503** — so an untouched test (`HealthUnavailableIT`) started logging one outage twice and ran 3× longer. **Excluding httpclient5 is the wrong fix and looks right**: it compiles, every unit test stays green, and the app then dies at startup with a `NoClassDefFoundError` naming a class nobody here wrote. `FirebaseAdminSdkBootTest` now reproduces that in under a second (sabotage-verified). Both traps are in CLAUDE.md's Gotchas.
3. **The keyless sink is dev-profile-gated, narrowing decision 2's concession.** The spec granted "the mail (code included) goes to the backend log" on a keyless rung. As written that also meant a *deployed* rung which lost its Resend key would quietly start printing live credentials. The sink now prints the code only under the `dev` profile (which prod/preprod never run) and otherwise logs a WARN naming the traveler by id — the concession kept where it was argued for, and nowhere else. It also never logs the recipient address: travelerId answers "which traveler" without widening the PII exception the spec did not grant.
4. **On native, `onAuthStateChanged` does not fire when a claim flips — so the device sat on the code screen after a successful confirm.** The backend logged `Email verification confirmed`; the client never learned. Web worked because its REST layer notifies listeners explicitly. Fixed by subscribing through `onIdTokenChanged`, which fires on token refresh, and pinned by a test that fails if it moves back. Green on web, broken on the device: the S0.2 `getTokens()` shape again.
5. **`autoFocus` on the code field does not raise focus on the device** — the traveler lands on the OTP screen with no keyboard and must tap the boxes once. Not a defect (the tap works, and the boxes are the obvious target) but it is a rough edge on a first impression. Left as-is rather than churned late; **owner call whether to spend a fix**.
