# 02 — The write mask

**What to build:** Spec decision 1. The write fence answers a **non-owner member** on an archived trip with the read mask's not-found instead of 409 `TRIP_ARCHIVED`; the **owner** keeps the honest 409 on every fenced act. Where a finer permission refusal currently answers before the fence (the recorded ordering pins: member-without-permission 403, member-deleting-another's-photo 403), the fence answers first, so on an archived trip a non-owner member gets the mask and never a 403 — while the same acts on a live trip still 403 exactly as today. The three pins that state the old posture rename to state the new one (a pin's name is a sentence; the sentence changed). Self-leave and the voided offer/invite acceptance paths are untouched and their pins stay green. ADR-017's amendment and the ADR-008 waiver are already on the record at the spec — reference them, don't re-argue them.

**Blocked by:** 01 — The audience proof (same service seams; series avoids re-signing freshly-changed methods).

**Status:** done

- [x] Every fenced write family answers a non-owner member on an archived trip with the not-found mask — day/activity writes, plan save, editing-session acquire, diary post/recaption/photo-remove/delete, dump add/remove, invite issuance and revoke, member removal, ownership offer and revoke (spec AC 1).
- [x] The mask answers before permission on an archived trip (both ordering pins' member arms flip); live-trip 403s unchanged (spec AC 2).
- [x] The owner's 409 `TRIP_ARCHIVED` holds across the seventeen-endpoint pin, unmodified (spec AC 3).
- [x] Self-leave still 204 while the trip stays masked from the leaver; voided-acceptance answers unchanged (spec AC 4).
- [x] Sabotage before trusting: re-inline the old member 409 and confirm the renamed pin fails naming the mask, not an incidental assertion.
