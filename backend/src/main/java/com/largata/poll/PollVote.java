package com.largata.poll;

import com.largata.common.id.UuidV7;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;


@Entity
@Table(name = "poll_vote")
class PollVote {

    @Id private UUID id;

    @Column(name = "poll_id", nullable = false, updatable = false)
    private UUID pollId;

    @Column(name = "option_id", nullable = false)
    private UUID optionId;

    @Column(name = "workspace_id", nullable = false, updatable = false)
    private UUID workspaceId;

    @Column(name = "traveler_id", nullable = false, updatable = false)
    private UUID travelerId;

    @Column(name = "cast_at", nullable = false)
    private Instant castAt;


    protected PollVote() {}


    private PollVote(UUID id, UUID pollId, UUID optionId, UUID workspaceId, UUID travelerId, Instant at) {
        this.id = id;
        this.pollId = pollId;
        this.optionId = optionId;
        this.workspaceId = workspaceId;
        this.travelerId = travelerId;
        this.castAt = at;
    }


    static PollVote cast(UUID pollId, UUID optionId, UUID workspaceId, UUID travelerId, Instant at) {
        if (pollId == null || optionId == null || workspaceId == null || travelerId == null || at == null) {
            throw new IllegalArgumentException("A vote names a poll, an option, and the membership that cast it");
        }
        return new PollVote(UuidV7.generate(), pollId, optionId, workspaceId, travelerId, at);
    }


    void moveTo(UUID newOptionId, Instant at) {
        this.optionId = newOptionId;
        this.castAt = at;
    }


    UUID pollId() {
        return pollId;
    }

    UUID optionId() {
        return optionId;
    }

    UUID travelerId() {
        return travelerId;
    }

    Instant castAt() {
        return castAt;
    }
}
