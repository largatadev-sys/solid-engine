# 01 — Palette + front-door restructure

**Status:** done

**What to build:** the app re-skinned in the brand palette (ADR-016), and the new auth front door: a traveler opening the app lands on the welcome screen (hero, Create Account / Sign In), and each button leads to its own screen — sign-up and sign-in — both carrying the official Google button under the email fields. Verification stays the existing link mechanism for now (ticket 02 replaces it); the flow after authentication is unchanged. A cold visit no longer fires an unauthenticated trips request before auth resolves.

**Blocked by:** None — can start immediately.

- [x] Palette + Inter applied as a values-only token swap; no screen hardcodes a color; Inter loads on native and web (spec decision 10)
- [x] Before/after screenshots (device + preview) captured for founder review (spec AC 12)
- [~] Welcome screen: hero image treatment, wordmark, tagline, Create Account / Sign In per the wireframe — no ToS line (spec decision 9) — **hero photo deferred, no asset exists (comment 3)**
- [x] Sign-up and sign-in are separate screens, each with the Google button ("or continue with Google"); the cross-links ("Already have an account?" / "Create an account") work (spec decision 3)
- [x] Existing auth still green: email sign-in, email sign-up (old link verification), Google sign-in on device and web preview — no regression while the door is rebuilt
- [x] Cold visit fires no unauthenticated `GET /v1/itineraries` before auth resolves, asserted via the preview driver's network log (spec decision 13, AC 11)

## Comments

**2026-07-30 — implemented. Mobile 678 tests · typecheck clean · API smoke 46/46 · preview container · Android dev build on the AVD.**

1. **The code review caught a regression both axes found independently, and it was the S1.3 shape exactly.** Wiring the Google button as `onPress={() => void signInWithGoogle()}` looks right and works on web — but the *native* fork consumes only `onPress`/`disabled`/`busy` and never calls `onStart`/`onSettle`/`onError`, so on a device a failure became an unhandled rejection showing the traveler nothing, with no spinner. Fixed by giving both forks one owner: `GoogleDoorway` holds the try/catch *and* the web callbacks, so neither platform can be wired half-way again. Verified on the emulator: the tap opens the real GMS picker (`SignInActivity` → `AccountPickerActivity`).
2. **Two defects found by looking, not asserting.** The GIS button was hardcoded to 400px and overflowed a 393px phone — it now measures its container (`gisButtonWidth`, clamped and tested). Status-bar icons rendered white on the cream ground. Neither was visible to any test; both came from a phone-width screenshot, which is why the driver gained `--width`.
3. **The hero photo is not built — no asset exists.** The export names it (*"Aspirational travel photography of a group of friends exploring a misty coastline…"*) but a CSS export carries no image. The welcome screen ships a clean cream ground with the brand centred, which reads as intentional rather than broken. **Owner action: supply the asset**; dropping it in is a one-line change.
4. **The token swap moved type scale and radii, not only colour** — `title` 24→28, `heading` 20→24, `wordmark` 34→42 (plus line-heights), `radii.md` 16→12, `lg` 24→16. All are token *values* and all come from the design, but they re-proportion every shipped screen, which is more than "colour + font". Recorded because the spec's "zero structural change" clause is what this brushes against; screenshots are attached to the session for the founder's eye.
5. **Reading auth state used to drag the native Firebase SDK into the query layer.** Adding `useAuth` to `itineraryQueries` broke four unrelated test suites with *"Native module RNFBAppModule not found"* — a diagnosis naming nothing. The context split from the provider, and `layering.test` now fails with a sentence instead.
6. **Four tokens and three `FormField` props were written, then deleted before commit** (`typography.code`/`option`, `colors.accentSoft`, `radii.xl`, `prefix`/`hint`/`hintTone`). Each has a consumer in ticket 02/03/04 and none had one *now* — P9, and the S1.9 `canLeaveTrip` precedent. They come back with the ticket that uses them.
7. **The preview driver reused its Chrome profile across runs**, so a "cold visit" check silently inherited the previous run's session — a check whose two outcomes were becoming indistinguishable. `--fresh` wipes the profile; the cold-visit assertion was re-run under it.
8. **A trap worth knowing for every later device walk:** the RN dev-warning toast sits over the bottom of the screen and swallows taps. Two `input tap`s on Create Account did nothing and read as broken navigation; dismissing the toast first made the same tap work.
