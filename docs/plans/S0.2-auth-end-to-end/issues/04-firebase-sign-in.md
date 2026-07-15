# 04 — Mobile: Firebase sign-in (Google + email)

**What to build:** Sign-in against the `largata-dev` Firebase project, on the dev-build, with **no backend involvement yet** — a sign-in failure here can only be a Firebase/console/keystore problem, never a token-validation one. Stack locked at grilling: `@react-native-firebase/app` + `@react-native-firebase/auth` + `@react-native-google-signin/google-signin` (exact versions verified at implementation, recorded in Comments; google-signin's free/MIT core API only).

Flows in scope (grilling decision 5): **email sign-in, email sign-up, password reset** (Firebase-hosted email/page), **sign-out**; verification email fired on email sign-up but **nothing gates on it** (enforcement is S1.2's). Google sign-in via the native account picker with the `webClientId` from the gitignored `google-services.json`. No profile editing, no name field at sign-up (display name is derived server-side — ticket 02).

**Owner steps inside this ticket:** agent extracts the debug-keystore SHA-1 and hands it over; owner registers the Android app (`com.largata.app` + SHA-1) in the console and downloads `google-services.json` into the mobile directory (gitignored — environment config, per spec).

**Blocked by:** 03 — dev-build baseline (Firebase native modules require prebuild; toolchain must be proven first).

**Status:** ready-for-agent

- [ ] Google sign-in on the AVD completes via the native account picker; the user appears in the `largata-dev` console
- [ ] Email sign-up creates an account; verification email is sent; no flow blocks on unverified state
- [ ] Email sign-in and sign-out work; password reset email arrives and completes
- [ ] Signed-in state survives app restart (native token cache)
- [ ] `google-services.json` is gitignored; a fresh clone's setup step is documented; CI stays green without the file
- [ ] Jest: auth flows tested with the Firebase SDK module mocked at the boundary; no raw fetch anywhere (ADR-001 layering intact)
