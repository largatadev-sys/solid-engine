# 01 — The visibility fact and its two acts

**Status:** ready-for-agent

**What to build:** an owner flips their trip public and back. The itinerary gains its binary visibility fact (`private | published`, default private — additive, existing rows read private), and the two owner-only acts land end-to-end: a Publish action on the workspace screen behind an **interim confirm dialog** (deliberately temporary — ticket 02's preview replaces it; a named tracer-bullet rework), and a quiet unpublish link in the Details tab whose confirm copy states the consequence (the public page disappears; anything attached hides rather than deletes; forks keep existing). The workspace eyebrow renders the fact: Private Workspace ↔ the published variant (final copy off the mock). Both verbs are acts on the trip, so the S1.9 archive fence rejects them while archived (spec decisions 2, 3, 5, 11, 12).

**Blocked by:** None — can start immediately.

- [ ] Additive `visibility` column lands by migration; every pre-existing itinerary reads `private`; no shipped field changes shape
- [ ] Owner publish → 200 and the eyebrow flips to the published variant; unpublish from Details flips it back — walked on the device and the web preview container
- [ ] Publish and unpublish by a member → 403; by the owner → 200 (spec AC 7)
- [ ] Both verbs on an archived trip are rejected by the fence; unarchive-then-publish succeeds (spec AC 9, fence half)
- [ ] An empty itinerary publishes — accepted knowingly, no content gate (spec AC 10)
- [ ] Unpublish confirm copy states the hidden-not-deleted consequence; publish confirm is visibly interim (no preview claim)
- [ ] Republish after unpublish serves the same itinerary id — no new identity anywhere (spec AC 3, identity half)
