# 03 — The booking card on the activity

**What to build:** a traveler records **what they used to book** an activity — purpose, provider, link, estimated price — on one card, one per activity; anyone reading the activity sees it. Provenance, not an offer menu (founder ruling; the repeatable list stays parked on the epic map).

**Blocked by:** None — can start immediately, in parallel with 01.

**Status:** done

- [x] Activity gains three additive nullable fields — booking purpose, booking provider, booking price (amount + currency) — beside the existing external URL, which becomes the card's link; nothing existing is renamed, retyped or removed (ADR-008-clean, no waiver needed).
- [x] The activity form renders the drawn card: the "Add Booking Link / Option" row opens it; fields Booking Purpose / Booking Provider / Target URL / Estimated Price per the mock's placeholders; a delete affordance clears the card; **exactly one card** — no add-another.
- [x] All four values round-trip through the API and appear in the activity read model; empty stays empty (no phantom card on activities without a booking).
- [x] The card's writes ride the activity lease like every other activity edit (ADR-014 unchanged).
- [x] The booking price is stored and rendered independently of the activity's estimated cost — the duplication is the founder's recorded call; neither field derives from the other.
- [x] The fields are nullable by design so E6's unfurler can later fill them server-side as a fallback path — nothing here precludes that.
- [x] Backend ITs cover the round-trip and lease enforcement; mobile unit tests cover the card's form logic; suites green, `tsc` clean.
