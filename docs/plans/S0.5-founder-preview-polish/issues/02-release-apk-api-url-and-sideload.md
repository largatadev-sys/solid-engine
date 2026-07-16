# 02 — Release APK: bake the deployed API URL, register the release SHA-1, sideload

**What to build/do:** The deferred S0.4 sub-AC — the signed release APK on the owner's physical phone, running the S0.3 flow (with Google sign-in) against the deployed dev backend. Two prep steps discovered at S0.4 close, then the install.

1. **`build-release.ps1` gains `-ApiBaseUrl`** (default `https://api-dev.largata.com`), exported as `$env:EXPO_PUBLIC_API_BASE_URL` before prebuild — a real process env var beats `mobile/.env`'s dotenv load, so the local-dev file (emulator alias `10.0.2.2`) stays untouched. **Echo the baked URL in the final build summary next to the signing cert** — every release build must state what it points at. Add a comment: the dev default is correct while dev is the only backend; **revisit when the prod rung exists** (backlog story).
2. **Owner step (console, prerequisite of the Google AC):** Firebase console → `largata-dev` → Project settings → Android app `com.largata.app` → add SHA certificate fingerprint **`ff05c732d03f69d00612d95fcf5c33be05dfdf39`** (the release keystore's SHA-1; debug was registered at S0.2, release was not — the recorded landmine).
3. **Build + install:** run `build-release.ps1` (keystore password prompted), confirm cert `CN=Largata` and the echoed URL, then `adb install -r <apk>` over USB (or transfer + tap — owner's choice).
4. **Device AC (owner, on the physical phone):** sign in **with Google** → create an itinerary → see it listed → open it — all against `api-dev.largata.com`. Google is the AC because it is the one debug-vs-release-signed difference; email would mask an unverified SHA-1 registration.

**Blocked by:** — (independent of 01; the APK may include 01's change — native declares `'full'`, so it is behavior-invisible on device).

**Status:** done (2026-07-17)

- [x] `-ApiBaseUrl` param works; baked URL echoed in the build summary; `mobile/.env` untouched
- [x] Release SHA-1 registered in Firebase `largata-dev` (owner, 2026-07-17) — **added alongside the debug SHA-1, not replacing it**
- [x] Release APK built and signed: `CN=Largata`, SHA-1 `ff05c732…df39`, `API BASE URL (baked in): https://api-dev.largata.com`
- [x] Google sign-in succeeds on the release-signed build (**the landmine defused, verified on the emulator** — same APK, same key)
- [x] S0.3 flow end-to-end against the deployed dev backend (emulator)
- [x] Signed APK installed on the owner's **physical phone**, flow re-run there — **owner-reported 2026-07-17: "everything is working"** (owner-observed, not agent-witnessed; the AC is the owner's to close)
- [x] No secrets committed (script's password handling unchanged: prompted, scrubbed, never persisted)

## Comments

**2026-07-17 — step 1 done, and the precedence claim is proven rather than assumed.**

The design rests on "a real process env var beats `mobile/.env`" — an assumption worth one experiment, since the failure it prevents (a release APK silently pointed at `10.0.2.2`) is precisely what deferred this AC. Verified by exporting a bundle with the override set and grepping the output: **`api-dev.largata.com` present (1 hit), `10.0.2.2` absent (0 hits)** — Expo's dotenv load does not override an existing process variable, so `.env` keeps the emulator alias for local dev and needs no flipping. Checked on the *web* export because it bakes values as readable text; the release APK's Hermes bytecode cannot be grepped the same way, which is why the device flow is that build's verification (spec).

The URL echo prints next to the signing cert (both are facts you cannot read off the APK afterwards without tooling), and the `REVISIT WHEN THE PROD RUNG EXISTS` note sits on the param block itself, where whoever adds a prod environment will be standing.

**Owner steps remaining** — nothing here is agent-executable:

1. Firebase console → `largata-dev` → Project settings → Android app `com.largata.app` → SHA certificate fingerprints → add `ff05c732d03f69d00612d95fcf5c33be05dfdf39`.
2. `mobile\scripts\build-release.ps1` (prompts for the keystore password; defaults to `https://api-dev.largata.com` — no argument needed). Confirm the summary prints `CN=Largata` **and** `API BASE URL (baked in): https://api-dev.largata.com`.
3. `adb install -r <apk>` over USB, or transfer + tap.
4. On the phone: **Google sign-in**, then create → list → view. Google is the AC because it is the one debug-vs-release-signed difference; email would pass without the SHA-1 and mask an unverified registration.

Order note: the SHA-1 registration and the build are independent — the registration is server-side and takes effect for any release-signed build, so it can be done before or after the APK exists. Both must be done before step 4 means anything.

**2026-07-17 — emulator dress rehearsal before the phone (owner's call, and the right one).** Rather than debug over USB, the release APK was installed to the emulator first: build/install/wiring failures surface where the loop costs seconds, leaving the phone as confirmation. **Both unknowns are now proven, on the same APK signed by the same release key:**

- **The SHA-1 registration works.** Google's picker opened ("Choose an account **to continue to Largata**" — Google resolved the app by name, i.e. it recognised the release key), account selected, signed straight through to My Trips. **No `DEVELOPER_ERROR`** (the wrong-fingerprint signature) and **no `accessToken cannot be empty`** (the S0.2 native-layer landmine).
- **The URL fix works.** The app listed a trip created earlier against the deployed backend, then created "S05 / Kyoto" and saw it come back in the list — on a build with **no Metro** and no local backend. `adb shell ping api-dev.largata.com` from inside the emulator resolves to `8tvoa12r.up.railway.app` (69.46.46.24), the same IP the host's curl hits. A `10.0.2.2` build could not have done any of this.
- Detail view showed `draft` + `private` badges — S0.3's invariants intact on the release build.
- Deployed backend independently checked: `/v1/health` → `{"status":"ok"}`; anonymous `GET /v1/itineraries` → **401** (the guard).

**A useful signal along the way:** installing over the existing dev build failed with `INSTALL_FAILED_UPDATE_INCOMPATIBLE` — Android confirming the two builds carry genuinely different signatures. The dev build had to be uninstalled first. Worth knowing before the phone install, and it is *evidence* the APK is not debug-signed.

**What the emulator cannot close:** the AC says the owner's physical phone, and hardware differences (real Play Services, the phone's Google account, install-from-unknown-sources) are exactly the class of thing this repo has been bitten by. The remaining box is that test — now a confirmation rather than a discovery.

**Also verified:** `expo prebuild` did **not** regenerate `android/app/debug.keystore` (md5 `4d3dbe54…` before and after), so the debug SHA-1 registered at S0.2 still matches and dev-build Google sign-in is unaffected. That file living in the generated, gitignored `android/` tree is a latent hazard — raised to the backlog, not fixed here.

**2026-07-17 — code review finding: the fix had reintroduced the trap one layer up.** The first version of this change set `$env:EXPO_PUBLIC_API_BASE_URL` and never unset it. The script is run interactively (it prompts for the keystore password), so the variable outlived it in that terminal — where the precedence this whole design relies on turns against you: the next `npm run android` in the same window would silently bake `https://api-dev.largata.com` into a local emulator build, no error naming the cause. Exactly the invisible-state failure the param was added to remove, displaced from `mobile/.env` to the shell session. **Now scrubbed in the `finally` block** beside the password (different reasons: the password is a secret, this is a footgun). Worth recording because 198 green tests could not have caught it — the defect only exists *after* the process exits.
