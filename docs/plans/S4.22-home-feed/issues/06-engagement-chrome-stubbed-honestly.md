# 06 — Engagement chrome, stubbed honestly

**What to build:** The mock's engagement surface, alive where it can be and honest where it can't (spec decision 8, the founder's Q1/Q2 ruling). Double-tap anywhere on the photo likes with the white heart burst and a light haptic — idempotent, never unlikes, and never delaying a carousel swipe (taps that move are swipes); single tap on the photo stays a deliberate no-op. The heart button toggles optimistically with the scale pop, count animating ±1 and compacting past 999 — local state over random base counts behind the same kill-switch as the profile's stub metrics. Every backendless control — comment, the share icon, save, the long-press sheet (Save to trip ideas / Share / Report), avatar and author name, header search, the notifications bell — refuses through the platform-forked alert helper (web `Alert` is a silent no-op, the S1.3 trap), with register-#2 events on the taps. Hit areas padded to ≥44px throughout.

**Blocked by:** 05 — The carousel *(one gesture system: double-tap detection and the swipe lock share the photo's pixels)*.

**Status:** ready-for-agent

- [ ] Double-tap bursts and likes on both a liked and an unliked card — the second never unlikes; a swipe never triggers it and it never delays a swipe (spec AC 9).
- [ ] The heart toggles instantly with the pop; counts animate and compact ("1.2k") past 999 (spec AC 9).
- [ ] Every stubbed control refuses visibly on **web and device** — the web walk intercepts `window.alert` and prints each wording (spec AC 10).
- [ ] Kill-switch off: the engagement numbers vanish cleanly with the layout intact (spec AC 14).
- [ ] Register-#2 events emit for the stubbed taps (spec AC 15).
