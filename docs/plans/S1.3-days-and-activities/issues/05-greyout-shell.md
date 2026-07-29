# 05 — The grey-out shell

**What to build:** the app adopts the mock's chrome, honestly — every affordance whose story hasn't shipped renders disabled and answers a tap with a graceful message (the S0.5 cosmetic-button pattern: never a dead click), and nothing whose semantics are undecided renders at all. The spec's grey-out map is the contract; **grey-out changes pixels, never ownership.**

1. **Four-tab bottom nav:** Trips live; Home / Discover / Profile disabled-with-message. One component, existing tokens — the mock's palette is *not* adopted (pre-E4 visual-direction decision, epic map).
2. **Greyed media tiles:** cover-photo tile on the create/edit form · add-photo tile on the activity screen — disabled, tap → "photos arrive with a later update" (S3.3 activates them).
3. **Disabled "Preview Itinerary" CTA** on Daily Schedules — position-promise only; the flow behind it is S4.1's.
4. **Nothing else:** no Standouts/best-time fields, no booking panel, no preview/publish/success screens, no create-chooser — parked per spec, verified absent.
5. **Tests/evidence:** mobile Jest for the disabled states + message taps · `drive-preview.js` run — page text present, zero console/page errors.

**Blocked by:** 01, 02.

**Status:** done (2026-07-23) — mobile-only; 404 mobile tests green, typecheck + `layering.test.ts` clean; `/code-review` both axes run (Standards: clean, nothing to change; Spec: spec-conformant) — one trivial naming fix applied. Committed on `feature/S1.3-days-and-activities`. **AC 10's web-preview-parity `drive-preview.js` run is the story gate's (ticket 06)** — a running-container check, not something this ticket's code closes.

- [x] Every greyed element renders disabled and answers taps with its message — no dead clicks (spec AC 10) — four-tab `BottomNav` (Trips live/current with no action; Home/Discover/Profile → `comingSoon`), `GreyedMediaTile` (cover on create+edit, add-photo on activity), disabled Preview CTA on Daily Schedules. Each via the S0.5 pattern (`comingSoon`), `accessibilityState` disabled/selected set; the tested seam is `comingSoon` (jest-expo renders no components — repo convention).
- [x] Nothing from the parked list is rendered (spec AC 10) — verified absent: Standouts, best-time fields, booking panel, preview/publish/success screens, create-chooser. (Spec review grepped and confirmed; the only `externalUrl` field is the single-link one S1.3 ships, not the parked N-option panel.)
- [~] Web preview parity via `drive-preview.js` — deferred to ticket 06 (the running-container run). The components are plain RN (`Pressable`/`View`/`Text`/`Alert`), no platform fork, so no web-specific breakage to structure around.
- [x] All values from theme tokens — no mock-palette literals — `layering.test.ts` polices every new component; zero hex/`rgb`/mock-palette literals. The mock's *shape* is adopted, its palette is not (the pre-E4 visual-direction decision stays open).

## Comments

**2026-07-23 — implemented; the grey-out discipline, and one naming fix.**

1. **`comingSoon` is the one message, so the graceful-tap phrasing cannot drift** — BottomNav's future tabs, both media tiles, and the Preview CTA all route a tap through it (the S0.5 cosmetic-button pattern: a disabled control that says what is coming, never a dead tap, never a route to a screen that does not exist). Centralising it also pre-empts the Shotgun Surgery a future copy change would otherwise cause.

2. **Grey-out changes pixels, never ownership (the spec's rule, held).** Every greyed element's *semantics* stay with its owning story — Home = E4, Discover = S4.3, Profile = onboarding, photos = S3.3, Preview/publish = S4.1 — and the code's comments attribute them there. The controls promise a *position* the mock designed; they claim to build nothing.

3. **The nav ships on My Trips only, and the other tabs are dead chrome until E4 — accepted knowingly (the founder's grey-out ruling).** The app is `Stack`-routed, not tab-routed; adding a global tab bar would restructure navigation for three destinations that do not exist. Rendering the shell on the signed-in home, with Trips the one live tab, is the honest minimum.

4. **One review fix:** the Preview CTA's alert title said "Preview & publish" while its button read "Preview itinerary" — a Spec-review naming inconsistency; aligned both to "Preview itinerary". (Standards flagged one do-not-fix watch-item: the CTA's disabled-surface style re-derives `GreyedMediaTile`'s look — two instances, below the rule-of-three, so not extracted.)

5. **The AC was violated on the web and nothing caught it — fixed 2026-07-24 (`cc7d65f`).** `comingSoon` used React Native's `Alert.alert`, which is a **no-op on react-native-web** (its source is literally `static alert() {}`). So in the browser *every* greyed control — all three nav tabs, both media tiles, the Preview CTA — was a **dead click**: precisely the failure this ticket's headline AC forbids, working on the device and silently broken on the web. **Nothing in this project could have seen it:** the unit test asserted the `Alert` call (Jest resolves the `.native` fork), the ITs never touch the client, and my own preview driver only checked that screens *rendered*. The founder found it by eye. Fixed by platform-forking the helper the way this codebase already forks auth and the date picker — `comingSoon.native` (Alert), `comingSoon.web` (`window.alert`), with the shared wording in a tested `comingSoonMessage` — and verified in the rebuilt preview container: all three tabs now produce their message. **The lesson for the story gate: "renders on web" is not "works on web".**
