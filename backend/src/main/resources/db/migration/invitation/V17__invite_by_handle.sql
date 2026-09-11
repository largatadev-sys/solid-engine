-- V17 — Invitation gains a second addressing mode: the invitee's traveler id (S4.9 ticket 02,
-- ADR-015's first real consumer).
--
-- S1.2's invitation names an email address, and that stays exactly as it was: the doorbell mail, the
-- 14-day expiry, the single-pending rule, the four terminal states, the verified-email gate at
-- accept. What is new is that the owner can also address an invitation to a traveler the app already
-- knows, found by exact handle — and then there is no address to send to and no email to match on:
-- the id IS the match, and it is exact.
--
-- WHY email STOPS BEING NOT NULL. An id-addressed invitation has no email, and storing one anyway
-- would be both a PII copy we do not need (P3) and a lie — it would make the accept path email-
-- matchable when the whole point is that it is not. So exactly one of the two columns is set, and
-- the CHECK below says so rather than leaving it to the application to remember. Dropping the NOT
-- NULL cannot invalidate an existing row (every one of them has an email); it only widens what the
-- column will accept, which is why this is additive in effect even though it relaxes a constraint.

ALTER TABLE invitation ALTER COLUMN email DROP NOT NULL;

-- The invited traveler, when the invitation was addressed by handle. Cross-module (identity owns
-- Traveler) so no FK, per the V3/V4/V6 convention. NULL for every email-addressed invitation,
-- including every row that existed before this migration.
ALTER TABLE invitation ADD COLUMN invitee_traveler_id UUID;

-- Exactly one addressing mode, enforced here rather than trusted to the service. Without it, a bug
-- that set neither would produce an invitation nobody could ever match, and one that set both would
-- produce an invitation matchable two ways — reachable twice, revocable once.
ALTER TABLE invitation
    ADD CONSTRAINT invitation_one_addressing_mode
    CHECK ((email IS NULL) <> (invitee_traveler_id IS NULL));

-- The single-pending rule, for the new mode. V6's index is on (workspace_id, email) and CANNOT cover
-- this: in SQL two NULLs are distinct, so every id-addressed row has a NULL email and none of them
-- collide there. Without this second index the rule would appear to hold (the old index is still
-- present and still green) while silently enforcing nothing for half the rows — the V4 trap in a new
-- costume. InvitationStorageIT pins both.
CREATE UNIQUE INDEX invitation_one_pending_by_traveler_idx
    ON invitation (workspace_id, invitee_traveler_id)
    WHERE status = 'PENDING';

-- The inbox reads by traveler id now as well as by email; this is V6's inbox index for the new mode.
CREATE INDEX invitation_inbox_by_traveler_idx
    ON invitation (invitee_traveler_id)
    WHERE status = 'PENDING';
