# 05 — The release build: fix the toolchain, create the real key, custody it

**What to build:** Everything between "debug builds work" and "a signed release APK exists" — the mobile release train minus the store.

1. **Fix `assembleRelease` on this machine (discovered at grilling, 2026-07-16).** Release-mode C++ codegen object paths exceed Windows' 260-char limit; the ninja bundled with SDK CMake 3.22.1 is not long-path-aware (OS long paths already enabled — `LongPathsEnabled=1`; the tool is the limiter; debug builds sit just under the line, which is why this never bit before). Fix = a long-path-capable CMake/ninja for the release variant — candidate mechanisms: newer SDK CMake (3.30+ bundles a long-path-aware ninja) selected for the build, or a newer standalone ninja handed to CMake; **implementer's call, recorded here in comments**. Whatever the mechanism, it must **survive `expo prebuild`** (CNG: `android/` is generated — config plugin / `withAndroidJdk`-class approach, never a hand-edit to generated files). **Earns a CLAUDE.md gotcha line once verified.**
2. **Real release keystore.** Generate the signing keystore; wire the release signing config so prebuild can't erase it (same survival rule). Custody, non-negotiable: the file lives **outside the repo** (and is pattern-gitignored anyway) · file + store password + key password go into the owner's password manager the day of creation · **restore-from-backup exercised once** (delete local copy, restore, build still signs). The parked Play story uploads with this same key — one signing identity across sideload and store.

**Blocked by:** — (independent of Railway; can run parallel to 01–03). Ticket 06's sideload AC consumes both halves.

**Status:** open

- [ ] `gradlew assembleRelease` green on this machine, twice: once, then again after a fresh `expo prebuild` (proves the fix and the signing config both survive regeneration)
- [ ] APK signed with the real keystore (not the debug placeholder — verified via `apksigner verify --print-certs` or keystore fingerprint match)
- [ ] Keystore not in git: pattern in `.gitignore`, staged-diff scan green, `git log --all` never saw it
- [ ] Keystore + both passwords in the password manager; restore-from-backup exercised once
- [ ] CLAUDE.md gotcha added: the 260-char/ninja failure, its misleading signature, and the pinned fix

## Comments
