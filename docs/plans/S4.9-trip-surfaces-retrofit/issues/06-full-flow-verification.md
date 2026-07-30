# 06 — Full-flow verification on the rigs

**Status:** ready-for-agent

**What to build:** nothing — close the spec's ACs on the rungs they belong to, per the standing rule (verify at the layer that ships) and the smoke discipline (API + emulator + web preview, all three). The concurrent-edit walks use the verified pool — **state which tag played which role** (e.g. `t1` = owner, `t2`/`t3` = members). `drive-preview.js` gains lookups for the new screens; every greyed affordance is *driven* on web (a grey that dead-clicks in the browser is the S1.3 bug reborn — intercept `window.alert` in CDP as the harness already does).

**Blocked by:** 01, 02, 03, 04, 05.

- [ ] Backend ITs + mobile tests + typecheck green; the full suite runs on the fresh local stack (`docker compose up`)
- [ ] Spec ACs 1–9 closed by ITs and the two-account device walk (t1 owner, t2/t3 members): concurrent activity edits · lease refusals · delete guards · owner-only day CRUD · header lease · version-checked reorder · advisory indicator · history rows
- [ ] Spec ACs 10–12 walked on the device and in the preview container: workspace screen (owner and member, live and archived) · every grey fires `comingSoon` + analytics on both platforms · tab bar + create flow land on Day 1
- [ ] Spec AC 13 round-tripped with pool accounts: handle-addressed invite reaches `t2`'s inbox and accepts; email invite unchanged
- [ ] Spec AC 14: attribution chips show "@handle · relative time" on device and web
- [ ] Deep links still resolve into the new structure; `pm clear` + relaunch walk follows the recorded pref-push order (CLAUDE.md rig recipe)
- [ ] BUILD_STATUS row updated in the last commit on the feature branch (the standing rule)

## Comments
