# 04 — Publish metadata: Standouts, best time, the cover shape

**Status:** ready-for-agent

**What to build:** the creator dresses the published page. The itinerary gains three additive fields, all edited on the trip-fields surface under the **header lease**: **Standouts** — an ordered list of short free-text selling points with add/remove per the 07/18 mock's rows ("Big Lagoon Kayaking"), rendered as the published Overview's check-circle list · **best time of year** — short free text ("Dec – Apr"), rendered in the header area the mock draws · the **cover reference** — nullable, entering the API and projection shape now with the editor tile greyed (`comingSoon` + analytics) until S3.3 activates upload. Standouts and best-time appear on the preview immediately and on the consumer Overview once ticket 03 lands; a private trip may enter them any time — publish order is free. Tags/trip type are deliberately absent (parked to S4.3 with their reader).

**Blocked by:** 02 — the projection and the preview *(runs in parallel with 03)*.

- [ ] Standouts: add, remove, and reorder persist and survive refresh; edits require the header lease — a concurrent header edit is rejected (spec AC 6)
- [ ] Best time: short free text persists and renders on the preview (and Overview, once 03 is present)
- [ ] The cover field exists in the itinerary and projection payloads as null; the editor tile greys with analytics; nothing renders broken when it is null
- [ ] All three fields are additive on the wire — no shipped field changes shape
- [ ] Empty metadata publishes cleanly: a trip with no Standouts and no best-time renders without empty-state artifacts
