# 01 — The roster fattens

**What to build:** The member roster starts carrying what the profile stub needs. The roster response gains three **additive nullable fields** — `handle`, `bio`, `vanityNumber` — projected from the traveler each membership names (spec decision 3). No new endpoint, no new authority rule: the roster is already member-gated through the guard, and that audience — co-travelers — is exactly who the stub serves. The mobile types and repository pick the fields up. Nothing else changes shape; existing clients are unaffected (ADR-008, additive, no waiver).

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] The roster response carries `handle`, `bio`, `vanityNumber` for every member, null where unset, formatted vanity number as the profile surface renders it (spec AC 5).
- [ ] Controller IT in the existing members-list family: the fields round-trip for a member; a non-member's request refuses exactly as today — the masking re-asserted on the same endpoint (spec testing decisions).
- [ ] The mobile roster type and repository expose the three fields; typecheck clean; no UI change in this ticket.
- [ ] No other field on the response is renamed, retyped, or removed (additivity pinned by the existing IT suite staying green).
