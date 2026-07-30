# 02 — Invite by handle, exact match (backend)

**Status:** ready-for-agent

**What to build:** ADR-015's first real consumer. A handle-lookup endpoint that answers an **exact** handle (case-insensitive, per the stored-lowercase rule) with the traveler's display card (id, handle, display name, avatar) or nothing — never a fuzzy list, never enumeration (spec decision 10). Invitation gains an additive `invitee_traveler_id` addressing mode; the inbox matches on **traveler id or verified email**, and the rest of the invitation lifecycle (statuses, single-pending rule, owner-only issuance, doorbell mail) is untouched.

**Blocked by:** —

- [ ] Exact handle → found: the lookup returns the display card; a partial or unknown handle returns nothing (spec AC 13)
- [ ] An id-addressed invitation reaches the invitee's inbox on sign-in without any email match (spec AC 13)
- [ ] Email-addressed invitations behave exactly as before — existing S1.2 ITs stay green unmodified (spec AC 13)
- [ ] One pending invitation per workspace+target holds across both addressing modes (no duplicate pending via email *and* id for the same traveler)
- [ ] The verified-email gate still guards email-addressed accepts; id-addressed accepts need no email match (the id is exact)
- [ ] Lookup requires authentication; response carries no email or PII beyond the display card (P3)

## Comments
