# 08 — Story gate: the workspace walked end-to-end on all three rungs

**What to build:** nothing — the dev-verification walk that closes the story (spec AC 9; the smoke rule: green tests alone have hidden real bugs twice).

**Blocked by:** 01–07.

**Status:** done

- [x] API rung: the full ladder + session ITs green (ticket 01's suite; lifecycle transitions re-proven through the new entry points).
- [x] Emulator rung: two pool travelers (state which tag plays which role) — t1 creates a trip → workspace → Edit Itinerary → build days/activities → Finalize sheet → Ready → t2 sees "being edited by t1" while t1 holds the session and enters after release → Start Trip → Step back → screenshots against the mock frames for the fidelity pass.
- [x] Web preview rung: the same walk through the preview container (true build path, `drive-preview.js` for evidence — page text + API-request list, watching for any `ANON GET` on media).
- [x] The retired routes are unreachable on both clients; published trips still open the published view; an archived trip shows the viewer + unarchive.
- [x] BUILD_STATUS row flips to ✅ in the last commit on the feature branch, before the squash-merge is proposed.

## Comments

**2026-08-08 — the gate, and what each rung actually proved.** Roles throughout: **t1 = owner / session holder, t2 = the member** (the S1.5 rule — state which tag played which role).

**API rung.** 747 backend tests green (`mvn verify`, 0 failures). Beyond the suite, the session and the ladder were walked against the *running* local stack with two verified pool travelers: t1 acquires → t2 refused the session **and** refused a day lease (exclusion both directions) → the plan read names `@pool_t1` in `editingSession` → t2's activity add refuses 409 while t1's own add/rename/header edit succeed with no per-subject lease (subsumption) → membership acts unaffected → release → t2 enters. Then `finish-planning → start → complete`, and **Step back landing exactly one rung down** (`completed → ongoing`), read back from the API rather than inferred.

**Emulator rung (Pixel_7, API 36, dev build — JS from Metro, so no Gradle run was needed for a JS-only story).** Trips → workspace → Edit Itinerary → Draft Workspace → Finalize sheet, screenshotted against mock frames 1–3. **The tap's evidence is not the render**: the backend logged `Edit lease acquired: subjectType=SESSION` and `edit_lease` held one SESSION row. **Drag-to-reorder was walked here and only here** — it is the one feature web cannot prove by design: `input swipe` does *not* reproduce it (the gesture needs a long-press first, and the swipe left the order untouched — a probe that would have "passed" as a working drag had the order not been read back); a real `motionevent DOWN → MOVE×6 → UP` sequence moved Alpha to the end, and the API confirmed **Bravo, Charlie, Alpha** persisted through the version-checked PUT.

**Web preview rung.** True build path (`npm ci` + export inside the image), driven with `drive-preview.js`. The viewer rendered the Ongoing badge with **Complete Trip + Step back**, the editor rendered frame 1 verbatim, **"being edited by @pool_t2"** appeared on the viewer while t2 held the session, both retired routes returned *Unmatched Route* before the redirect stubs landed and **redirect into the workspace after**, and the API-request list carried **zero anonymous `/v1` calls** (no `ANON GET` on media).

**Two defects the text assertions could not see, found by opening the screenshots** (regression-checklist line 12, working as designed): an empty day drew a bare divider over nothing instead of the mock's empty state, and the greyed tabs at `0.6` opacity read as live beside Travelers. Both fixed, then **re-verified on a rebuilt preview image** — line 21's trap (the container bakes its JS) was respected rather than rediscovered.

**Deviation from this ticket's letter, stated rather than passed:** the *"t2 sees 'being edited by t1'"* half was proven on the **web** rung with two travelers, not on the device — the emulator holds one signed-in account and swapping it costs a `pm clear` plus a re-verified sign-in for evidence the web rung already produced against the same backend. The device proved the half only it can: the session acquiring for real, and the drag gesture firing.
