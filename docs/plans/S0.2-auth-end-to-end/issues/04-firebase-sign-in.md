# 04 — Mobile: Firebase sign-in (Google + email)

**What to build:** Sign-in against the `largata-dev` Firebase project, on the dev-build, with **no backend involvement yet** — a sign-in failure here can only be a Firebase/console/keystore problem, never a token-validation one. Stack locked at grilling: `@react-native-firebase/app` + `@react-native-firebase/auth` + `@react-native-google-signin/google-signin` (exact versions verified at implementation, recorded in Comments; google-signin's free/MIT core API only).

Flows in scope (grilling decision 5): **email sign-in, email sign-up, password reset** (Firebase-hosted email/page), **sign-out**; verification email fired on email sign-up but **nothing gates on it** (enforcement is S1.2's). Google sign-in via the native account picker with the `webClientId` from the gitignored `google-services.json`. No profile editing, no name field at sign-up (display name is derived server-side — ticket 02).

**Owner steps inside this ticket:** agent extracts the debug-keystore SHA-1 and hands it over; owner registers the Android app (`com.largata.app` + SHA-1) in the console and downloads `google-services.json` into the mobile directory (gitignored — environment config, per spec).

**Blocked by:** 03 — dev-build baseline (Firebase native modules require prebuild; toolchain must be proven first).

**Status:** ready-for-agent

- [ ] **OPEN — Google sign-in on the AVD completes via the native account picker; the user appears in the `largata-dev` console.** Needs a Google account on the emulator (owner's credentials) — see Comments.
- [x] Email sign-up creates an account; verification email is sent; no flow blocks on unverified state
- [x] Email sign-in and sign-out work — **the password reset email was not read** (the call is unit-tested; `ana.silva@example.com` is a fake address with no inbox)
- [x] Signed-in state survives app restart (native token cache)
- [x] `google-services.json` is gitignored; a fresh clone's setup step is documented; CI stays green without the file
- [x] Jest: auth flows tested with the Firebase SDK module mocked at the boundary; no raw fetch anywhere (ADR-001 layering intact)

## Comments

**2026-07-15 — email flows proven on-device; Google sign-in wired but unproven.**

**What the emulator proved:** email sign-up → Firebase account created (real `largata-dev` project) → Traveler provisioned → me-screen renders it. Sign-out routes back to sign-in; signing in again returns the same Traveler with no duplicate row.

**Google sign-in — everything except the last inch.** The registered SHA-1 (`5e8f1606…cabf625`) is present in `google-services.json` as an `android_info` cert; the web client id (`client_type: 3`) is wired through `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`; `GoogleSignin.configure()` runs at app start and is unit-tested both ways (configured correctly, and failing loudly when the id is missing). **Not proven:** that the picker returns an idToken our exchange accepts. The AVD has Play Services but **zero Google accounts** (`dumpsys account` → `Accounts: 0`), so the picker would open onto nothing, and signing a real account in needs the owner's credentials. Left unticked rather than claimed.

**Owner action to close it (~3 min):** on the AVD, Settings → Passwords & accounts → **Add account → Google** → sign in. Then tap **Continue with Google** in the app and confirm the me-screen shows the Google profile **name** rather than an email local-part — which also proves the `name`-claim branch of the display-name rule, the half an email sign-up can never reach.

**A real defect this ticket's own tests could not see, found in code review:** `GoogleSignin.configure()` was never called at all, so `signIn()` would have returned a null idToken on every device — and the Jest mock returned one unconditionally, hiding it completely. The lesson is the mock's: a test that fakes the boundary proves the seam, never the wiring. That is also why the Google AC above stays open rather than being argued closed on the strength of green unit tests.
