-- V14 — the email verification code (S4.0 ticket 02, spec decision 2).
--
-- Sign-up verification stops being a Firebase-sent LINK and becomes a backend-issued 6-digit CODE:
-- the client asks for one, we mail it (Resend, or the logging sink on a keyless rung), the client
-- submits it back, and on a match we flip `email_verified` on the Firebase user through the Admin
-- SDK seam. ADR-006 is unchanged — Firebase still owns credentials and the claim is still the gate;
-- only who *causes* the claim to flip moves.
--
-- PURELY ADDITIVE: a new table, born empty. No backfill exists, so no stepping-IT (the V5 lesson
-- applies only where rows pre-exist).
--
-- EPHEMERAL BY DESIGN. Every row here is a short-lived credential in flight. A fresh-DB redeploy
-- wiping the table is correct behaviour, not data loss: the traveler asks for another code.

CREATE TABLE verification_code (
    -- The traveler is the PRIMARY KEY, deliberately, and this is the whole point of the table's
    -- shape. "One active code per traveler" (ticket 02) is thereby structurally impossible to
    -- violate — a second issue must overwrite the first, and a stale code cannot linger beside a
    -- fresh one. Expressed as a rule in the service it would have no failure mode; expressed here
    -- it fails loudly. Same family as V6's one-pending-invitation partial index.
    --
    -- Cross-module id reference (traveler lives in the identity module), so no FK — the V3/V4
    -- convention, ADR-002: modules reference each other by ID, never by each other's tables.
    traveler_id  UUID         PRIMARY KEY,

    -- SHA-256 of the 6 digits, hex. NEVER the code itself: a code is a short-lived credential and
    -- P3 says credentials do not enter durable artifacts. A stolen database therefore yields no
    -- usable codes, and the confirm path compares hashes rather than secrets.
    --
    -- No salt, and that is a considered choice rather than an omission: the search space is 10^6,
    -- so a per-row salt buys nothing against an offline attacker who can enumerate it in
    -- milliseconds. What actually defends the code is the attempt cap and the 10-minute expiry
    -- below — both enforced online, where the enumeration has to happen.
    code_hash    TEXT         NOT NULL,

    -- When this code was minted. The resend cooldown is measured from here, so the column is the
    -- rate limit's memory as well as the audit trail.
    issued_at    TIMESTAMPTZ  NOT NULL,

    -- issued_at + 10 minutes. Checked at confirm time against the injected Clock — no scheduler,
    -- no sweeper: a row past this instant behaves expired whether or not anything deleted it.
    expires_at   TIMESTAMPTZ  NOT NULL,

    -- Wrong guesses against THIS code. At the cap the code is dead and only a resend revives the
    -- flow — which is what stops 10^6 from being enumerable at all.
    attempts     INT          NOT NULL DEFAULT 0
);
