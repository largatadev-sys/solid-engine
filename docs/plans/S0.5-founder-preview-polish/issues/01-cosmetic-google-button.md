# 01 — Cosmetic Google button on the founder preview (tri-state capability)

**What to build:** The sign-in screen on the web preview shows the Google button the Android launch ships, with a graceful message on tap — by splitting the capability the requirement splits.

1. **`authContract.ts`:** `AuthCapabilities.google` becomes `'full' | 'cosmetic' | 'none'` (was `boolean`). `'full'` = working doorway (render + install SDK) · `'cosmetic'` = render the button, tap surfaces the repository's thrown message · `'none'` = no button. "Functional but hidden" is unrepresentable by construction.
2. **Declarations:** `authRepository.native.ts` → `'full'`. `authRepository.web.ts` → `'cosmetic'`, and its `signInWithGoogle()` message becomes **"Google sign-in works in the app — use email here in the preview."** (code stays `AUTH_GOOGLE_UNAVAILABLE_ON_WEB`; the copy is the change — a promise about the app, not a deficiency of the preview).
3. **Call sites:** `sign-in.tsx` renders the button + divider when `google !== 'none'` · `_layout.tsx` calls `installGoogleSignIn()` only when `google === 'full'`. Update both sites' capability comments — they currently explain boolean semantics and each carries the "capability, not `Platform.OS`" reasoning, which must survive the edit.
4. **Tests:** typecheck + Jest ripple (`authRepository.test.ts` if it asserts capabilities; `layering.test.ts` allowlist is untouched — no new files, no new SDK imports). Worth a cheap assertion: the web repository's `signInWithGoogle` rejects with an `AuthError` carrying the new copy (that thrown message *is* the tap UX now, not just a guard).

**No screen logic changes beyond the render condition** — the tap path (throw → catch → display) already exists end-to-end.

**Blocked by:** — (independent of 02).

**Status:** done (2026-07-17)

- [x] Typecheck + Jest green
- [x] Local web export, verified **at the bundle** — `{google:'cosmetic'}` declared, `"Continue with Google"` present, the `'none'` comparison present, the new message present, and **zero** Google/Firebase SDK references (the `'full'` gate held; no startup crash possible)
- [x] Local web export, **served and driven in a real browser** — page renders (no white screen), zero console errors, button visibly laid out, a real mouse click surfaces the message, no unhandled rejection; message fully in view at laptop/small-laptop/phone viewports
- [x] Emulator smoke: native sign-in renders the button; tapping it launched Google's real `SignInHubActivity` — native-layer proof that `installGoogleSignIn()` still runs on `'full'`; no `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` throw in logcat
- [x] Capability comments at both call sites updated, reasoning preserved

## Comments

**2026-07-17 — implementation notes.**

- **Tri-state landed as a named type**, `AuthDoorway = 'full' | 'cosmetic' | 'none'` in `authContract.ts`, rather than an inline union: the doc comment explaining *why* the flag split needs somewhere to live, and `AuthCapabilities.google: AuthDoorway` reads as the question it asks.
- **New test file `__tests__/authCapabilities.test.ts`**, not an addition to `authRepository.test.ts`. That suite mocks the native SDK and therefore only ever loads `.native.ts` — the web twin's declaration is unreachable from it, so it could not have tested the half this story is about. The new file imports **both** platform files by explicit path (possible only because S0.4's REST pivot left `.web.ts` free of `firebase/*` imports) and asserts the pairing the tri-state exists to express: web renders *and* has no doorway. It also pins the thrown message, which is now UX rather than a guard.
- **Typecheck caught the assignments, not the truthiness.** `boolean` → union makes `= true` a compile error, but a leftover `if (caps.google)` would still compile (non-empty strings are truthy) and would silently install the SDK on web. Both call sites were found by reading, not by the compiler — worth knowing if a third consumer ever appears.
- **Deliberately not done: a `.test.web.ts` under jest-expo's web preset.** That is the "proper" platform-resolution test, but it needs a multi-project Jest config — every existing suite assigned a platform, a second transform chain — which is a test-infrastructure decision far larger than the feature it would serve. Explicit-path imports buy the same assertion for one line. Revisit if the web surface stops being throwaway (backlog).

**2026-07-17 — browser smoke test (owner asked; the ticket had been closed on bundle greps alone).** The bundle greps proved the strings *shipped*; they could not prove React *mounted* them, that the layout holds, or that a click reaches the message instead of becoming an unhandled rejection — and S0.4's white screen is precisely the failure that is invisible to everything except loading the page. The gap was real and the ticket's own wording ("export + serve") had been half-satisfied.

Done properly: `expo export` re-run from the committed code (the earlier export predated the review fixes — same staleness trap as the APK), served on `:8099`, driven in real headless Chrome over the DevTools protocol (no new repo dependency; the `ws` module already present drives it).

- **Renders:** page text is the full sign-in screen, **zero console errors, zero page errors** — no white screen.
- **Button:** `"Continue with Google"` in the DOM with a non-zero bounding box, above the `or` divider, exactly as native lays it out.
- **The click works:** a real `Input.dispatchMouseEvent` at the button's centre → *"Google sign-in works in the app — use email here in the preview."* appears on screen. **No unhandled rejection** — the repository throws, `sign-in.tsx` catches, the traveler gets a sentence. That is the whole feature, and it is the one thing no grep or unit test could establish.
- **Layout checked, not assumed:** the first screenshot showed the message clipped at the viewport edge — an artifact of the 485px headless window. At 1440×900, 1280×720 and 390×844 the message is fully in view **without scrolling** and the page is not scrollable at all. Not a defect; worth the check.

This is local-export evidence, not the live preview: `founders.largata.com` still gets its browser check post-merge (ticket 03), since only the real deploy proves the Railway service picked the change up.

**2026-07-17 — code review finding: a comment that over-promised.** The contract's doc comment claimed the future web surface moves to `'full'` and "neither call site changes". False for `_layout.tsx`: its install path configures the *native* Google SDK, which a browser cannot use — a real web doorway needs a different one. The gate stays; what it gates forks. Corrected in `authContract.ts`, and the type's meaning stated explicitly: `'full'` means *a* doorway exists, never *the native SDK's* doorway. Left uncorrected it would have been a false promise sitting in the exact file the web-surface story reads first.
