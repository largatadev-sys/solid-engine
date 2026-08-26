package com.largata.identity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;


@Entity
@Table(name = "follow")
@IdClass(Follow.Key.class)
class Follow {

    @Id
    @Column(name = "follower_id")
    private UUID followerId;

    @Id
    @Column(name = "followee_id")
    private UUID followeeId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected Follow() {
    }


    UUID followerId() {
        return followerId;
    }

    UUID followeeId() {
        return followeeId;
    }

    Instant createdAt() {
        return createdAt;
    }


    static class Key implements Serializable {

        private UUID followerId;
        private UUID followeeId;

        protected Key() {
        }

        Key(UUID followerId, UUID followeeId) {
            this.followerId = followerId;
            this.followeeId = followeeId;
        }

        @Override
        public boolean equals(Object other) {
            return other instanceof Key key
                    && Objects.equals(key.followerId, followerId)
                    && Objects.equals(key.followeeId, followeeId);
        }

        @Override
        public int hashCode() {
            return Objects.hash(followerId, followeeId);
        }
    }
}
