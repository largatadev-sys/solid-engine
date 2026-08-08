# 08 — Story gate: the workspace walked end-to-end on all three rungs

**What to build:** nothing — the dev-verification walk that closes the story (spec AC 9; the smoke rule: green tests alone have hidden real bugs twice).

**Blocked by:** 01–07.

**Status:** needs-triage

- [ ] API rung: the full ladder + session ITs green (ticket 01's suite; lifecycle transitions re-proven through the new entry points).
- [ ] Emulator rung: two pool travelers (state which tag plays which role) — t1 creates a trip → workspace → Edit Itinerary → build days/activities → Finalize sheet → Ready → t2 sees "being edited by t1" while t1 holds the session and enters after release → Start Trip → Step back → screenshots against the mock frames for the fidelity pass.
- [ ] Web preview rung: the same walk through the preview container (true build path, `drive-preview.js` for evidence — page text + API-request list, watching for any `ANON GET` on media).
- [ ] The retired routes are unreachable on both clients; published trips still open the published view; an archived trip shows the viewer + unarchive.
- [ ] BUILD_STATUS row flips to ✅ in the last commit on the feature branch, before the squash-merge is proposed.
