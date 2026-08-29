# 02 — The device-context capture module, both forks

**What to build:** one platform-forked capture module (the auth/date-picker pattern) that
answers "what is this reporter running?" as up to three human-readable strings, and can
never throw, block, or exceed 200 chars. Pure logic with fixture user-agents — no wiring
into the report flow yet (that is ticket 03).

Native fork (spec decision 2): OS from the platform constants already in the installed
binary — "Android " + release; iOS gets system name + version for free — and `deviceModel`
as the Android model constant verbatim, omitted on iOS until the activation story picks a
source. No new native module, so the story stays walkable on the existing dev build despite
the workstation's Gradle fault. Never the user-assigned device name (P3).

Web fork (spec decisions 4–6): Client Hints first — one high-entropy call for
`platformVersion` (Windows 11 vs 10 at major ≥ 13; real macOS/Android versions) and `model`
(sent only when non-empty — Android Chrome in practice). Coarse user-agent fallback where
Client Hints is absent: real versions where the UA carries them ("iOS 17.5", "Android 14"),
honest bare names where it is frozen ("Windows", "macOS"). The iPad tell: Mac UA +
multi-touch → "iPadOS". Browser from the brands list, else UA tokens (Chrome/Edge/Opera/
Firefox/Safari). Anything unknowable is omitted — never a placeholder.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Fixture UAs pin every family: Chromium with Client Hints (Windows 11 vs 10 by
      platformVersion; Android model present), iPhone Safari (real iOS version, no model),
      iPad Safari (the masquerade → "iPadOS"), Firefox desktop (coarse) and Android (real
      version), Edge/Opera brand naming
- [ ] An absent, throwing, or rejecting Client-Hints API degrades to the UA fallback or to
      omission — asserted as "never throws, never hangs"
- [ ] Every returned value is clamped to 200 chars
- [ ] Native fork: the "Android " + release composition and verbatim model, with the same
      never-throws guarantee; no import of any module absent from the installed binary
- [ ] `tsc` clean; the new-src-file rule honoured (full Jest run before the push)
