-- V35 — the Poll: a free-standing voting board on the Trip Workspace (S2.1, Artifact 02 as amended).
--
-- Canon's *Decision* renamed to **Poll** this session, which is the name every founder sentence and
-- every mock already used. INV-10 — one vote per member per poll, members only — arrives here as a
-- unique index rather than as service courtesy, because a double-submit race is the exact thing a
-- service check cannot see.
--
-- FREE-STANDING, BY RULING (S2.1 decision 2). There is no day_id, no activity_id, and no outcome
-- column pointing anywhere: a poll is not attached to the plan and its result writes nothing. The
-- mock's "Added to Itinerary" winner label was cut for the same reason. Attachment stays additive if
-- the founder ever pulls it — a nullable column and a reader — so nothing here forecloses it.
--
-- NO STATE COLUMN, AND THAT IS THE WHOLE DESIGN. Closed-ness is DERIVED at read time:
-- `closed_at IS NOT NULL OR now >= closes_at`. This codebase deliberately has no scheduler (the
-- S4.16 finding), so a stored `status` would need something to flip it and there is nothing — the
-- rows would sit at OPEN forever while every screen correctly showed them closed, and the two
-- sources of truth would diverge on day one. The same lazy shape V6's `expires_at` already uses for
-- invitations. Early close stamps `closed_at`; a deadline close stores nothing, ever.
--
-- THE WINNER IS COMPUTED, NEVER STORED (decision 8). Highest count wins; ties star every leader; a
-- zero-vote close stars nothing. A stored winner would be a denormalisation of a COUNT over rows
-- this same transaction can read, and it would have to be recomputed on every cascade below — which
-- is precisely the class of drift a departed member's vanishing vote would cause.

CREATE TABLE poll (
    -- UUIDv7, app-side, as every id in this tree is (S0.1). Also the ordering key: newest-first on
    -- the active board is `ORDER BY id DESC`, which a v7 id makes a time order for free.
    id            UUID         PRIMARY KEY,

    -- The workspace this board belongs to. FK to workspace(id) for V6's reason: the poll module owns
    -- this table, but the Trip Workspace is the aggregate a poll lives inside (Artifact 02), and a
    -- poll in a workspace that does not exist is meaningless. That makes the reference a genuine
    -- intra-schema one, unlike the cross-module id references V3/V4 leave deliberately unconstrained.
    workspace_id  UUID         NOT NULL REFERENCES workspace (id),

    -- Who asked. A traveler id, and the authority half of decision 3 — creator OR trip owner may
    -- close early and delete. Cross-module → no FK, per V3/V4. It deliberately does NOT reference
    -- membership: the creator can leave the trip, and their poll must survive them (only their VOTE
    -- dies with the membership, below). A poll is the group's question once asked.
    created_by    UUID         NOT NULL,

    -- The question. Capped at 120 in the application (the title-cap precedent), not here: a CHECK
    -- would duplicate a limit the domain owns and would answer with a constraint-violation 500
    -- instead of the named 4xx the spec requires.
    question      TEXT         NOT NULL,

    -- The required deadline (decision 7), a UTC instant, strictly future at creation. Rendered
    -- device-local ("Poll closes in 3 hours · Oct 24, 6:00 PM") — the storage stays zoneless-of-place
    -- and absolute, per the standing UTC rule.
    closes_at     TIMESTAMPTZ  NOT NULL,

    -- Stamped ONLY by an early close (decision 3). NULL on a poll that simply ran out of time — the
    -- derivation above already reads that as closed, so writing a row at the deadline would need the
    -- scheduler this design exists to avoid.
    closed_at     TIMESTAMPTZ,

    -- Who closed it early, for the record, NULL alongside closed_at. Not rendered today; it is the
    -- honest half of a stored fact, the same way V6 records `accepted_by` on a bearer-less accept.
    closed_by     UUID,

    created_at    TIMESTAMPTZ  NOT NULL
);

-- The board's one read: "every poll of this workspace, newest first" (GET .../polls), which then
-- splits into ACTIVE and COMPLETED in the application because the split is a function of the clock,
-- not of a column, and SQL has no stable way to ask it that an index could serve.
CREATE INDEX poll_board_idx ON poll (workspace_id, id DESC);

CREATE TABLE poll_option (
    id         UUID    PRIMARY KEY,

    -- CASCADE because an option has no meaning without its poll, and delete is hard here (decision 3
    -- — planning ephemera, the S1.5 posture, not the ledger). Structural rather than choreographed:
    -- no service path can leave an orphaned option behind, and none can forget to.
    poll_id    UUID    NOT NULL REFERENCES poll (id) ON DELETE CASCADE,

    -- Presentation order — the order the creator typed them, held for the life of the poll. Not a
    -- ranking: single-choice voting (decision 5) has no preference order, and decision 9 forbids
    -- editing, so this never moves after creation.
    ordinal    INT     NOT NULL,

    -- Capped at 80 in the application, for `question`'s reason above.
    label      TEXT    NOT NULL,

    -- 2..10 options per poll (decision 5's caps) is an application limit, not a schema one: SQL
    -- cannot express a per-parent row count without a trigger, and a trigger would answer with a
    -- 500 rather than the named refusal the spec requires.
    UNIQUE (poll_id, ordinal)
);

CREATE INDEX poll_option_of_poll_idx ON poll_option (poll_id, ordinal);

CREATE TABLE poll_vote (
    id            UUID         PRIMARY KEY,

    poll_id       UUID         NOT NULL REFERENCES poll (id) ON DELETE CASCADE,

    -- The chosen option. CASCADE is unreachable in practice — decision 9 forbids editing a poll, so
    -- no option is ever deleted except with its poll, which takes the vote by the line above anyway.
    -- It is here so that the pair of paths agree rather than depending on which FK fires first.
    option_id     UUID         NOT NULL REFERENCES poll_option (id) ON DELETE CASCADE,

    -- THE VOTE BELONGS TO A MEMBERSHIP, NOT TO A TRAVELER — this is the story's load-bearing choice.
    --
    -- INV-10 says members only, and S1.5 hard-deletes the membership row on leave or removal. Keying
    -- the vote on (workspace_id, traveler_id) with ON DELETE CASCADE therefore makes "a departed
    -- member's votes vanish with them" a property of the schema: counts drop, the avatar cluster
    -- loses its initial, and the "N of M" denominator shrinks on the same read — with no service code
    -- anywhere, and no path that can forget. A traveler_id alone would have let a vote outlive its
    -- voter's membership, which is the departed-postcards strand this story refuses structurally.
    --
    -- The composite FK is what membership's identity actually is (V4: no surrogate id, the pair IS
    -- the row), so the vote carries both columns. `workspace_id` is consequently duplicated between
    -- here and the vote's poll — deliberately, because the FK cannot be composed otherwise, and
    -- because a vote whose workspace disagreed with its poll's would be a bug this makes impossible
    -- to write (see the CHECK-by-construction note in PollService: the service reads the poll's
    -- workspace and never takes one from the caller).
    workspace_id  UUID         NOT NULL,
    traveler_id   UUID         NOT NULL,

    cast_at       TIMESTAMPTZ  NOT NULL,

    FOREIGN KEY (workspace_id, traveler_id)
        REFERENCES membership (workspace_id, traveler_id) ON DELETE CASCADE
);

-- INV-10 AS SCHEMA: one vote per member per poll. This is the constraint the concurrent-submission
-- IT proves, and it is why the service does not "check then insert" — two simultaneous PUTs both
-- pass such a check and one loses here instead, where losing is correct. Re-voting is an UPDATE of
-- the row this index makes unique, never a second INSERT, so changing your mind moves a vote rather
-- than adding one (decision 5).
--
-- NOTE the S1.1 enum-spelling lesson does not bite here: the predicate is total (no WHERE clause) and
-- names no enum value, so there is no Hibernate-vs-SQL spelling contract to get wrong.
CREATE UNIQUE INDEX poll_vote_one_per_member_idx ON poll_vote (poll_id, workspace_id, traveler_id);

-- The tally's access path: every vote of a poll, grouped by option, read once per board render.
CREATE INDEX poll_vote_tally_idx ON poll_vote (poll_id, option_id);
