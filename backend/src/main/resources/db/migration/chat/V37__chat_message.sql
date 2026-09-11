-- V37 — the in-trip chat message (S4.10, decisions 1-6).
--
-- One thread per trip, text only, append-only. No edit, no delete, no threading, no mentions
-- (decision 1) — so there is no edited_at, no parent_id, no deleted_at, and adding one later is
-- additive rather than a correction.
--
-- ITINERARY_ID, NOT WORKSPACE_ID — the deliberate divergence from V35's poll. Chat's wire is
-- /v1/itineraries/{id}/chat/messages and its topic is `itinerary:{id}:chat`, so an itinerary id is
-- what every read, every write and every broadcast already holds. Keying on workspace_id would make
-- each of those three paths resolve a workspace first to ask a question about a trip. The workspace
-- wall (INV-1) is enforced by the guard on the way in, exactly as it is for every other surface;
-- the column choice does not weaken it. Cross-module → no FK, per V3/V4.
--
-- AUTHOR_TRAVELER_ID, NOT THE MEMBERSHIP — decision 2, and the load-bearing divergence from the
-- poll vote directly above it in V35. A vote CASCADEs away with its membership because a departed
-- member's vote would corrupt a live count. A message must do the opposite: a conversation with
-- holes where a departed member's words were is worse than one that keeps them. Chat is a record,
-- like history. So there is deliberately NO composite FK to membership here and no ON DELETE
-- CASCADE anywhere — leaving a trip takes your vote and leaves your words. The author's handle is
-- joined from the traveler row at read time (traveler rows survive leaving), which is what makes
-- the departed-author render work with no denormalised copy to drift.
--
-- THE BODY IS CHECKED HERE AND IN THE APPLICATION, WHICH IS NOT DUPLICATION. The application cap
-- answers the named 4xx the spec requires; this CHECK is the backstop that makes an over-cap or
-- blank row unrepresentable no matter which path wrote it — including a future seeder or a repair
-- script that never passes through the service. The poll's `question` deliberately has no CHECK
-- because its cap is a presentation limit; a message body is bounded by decision 1 itself.
CREATE TABLE chat_message (
    -- UUIDv7, app-side (S0.1). Also the ordering key AND the cursor: a v7 id is a time order for
    -- free, so the thread's read needs no separate sort column and the cursor needs no composite.
    id                 UUID         PRIMARY KEY,

    itinerary_id       UUID         NOT NULL,

    author_traveler_id UUID         NOT NULL,

    body               TEXT         NOT NULL
                                    CONSTRAINT chat_message_body_within_cap
                                    CHECK (length(body) BETWEEN 1 AND 2000
                                           AND length(btrim(body)) > 0),

    at                 TIMESTAMPTZ  NOT NULL
);

-- The thread's one read: "this trip's messages, newest first", paged by the cursor. Matches the
-- activity_history read shape (V16) exactly, and the (itinerary_id, id DESC) order is what lets the
-- cursor page be a plain `id < :cursor` seek rather than an offset.
CREATE INDEX chat_message_thread_idx ON chat_message (itinerary_id, id DESC);
