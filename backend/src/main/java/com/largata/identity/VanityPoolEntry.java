package com.largata.identity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.time.Instant;
import java.util.Objects;


@Entity
@Table(name = "vanity_pool")
@IdClass(VanityPoolEntry.Key.class)
class VanityPoolEntry {

    @Id private short cohort;

    @Id
    @Column(name = "pool_number")
    private int poolNumber;

    @Column(name = "draw_order", nullable = false)
    private int drawOrder;

    @Column(name = "claimed_at")
    private Instant claimedAt;

    protected VanityPoolEntry() {
    }


    short cohort() {
        return cohort;
    }

    int poolNumber() {
        return poolNumber;
    }

    Instant claimedAt() {
        return claimedAt;
    }


    static class Key implements Serializable {

        private short cohort;
        private int poolNumber;

        protected Key() {
        }

        Key(short cohort, int poolNumber) {
            this.cohort = cohort;
            this.poolNumber = poolNumber;
        }

        @Override
        public boolean equals(Object other) {
            if (this == other) {
                return true;
            }
            return other instanceof Key key && key.cohort == cohort && key.poolNumber == poolNumber;
        }

        @Override
        public int hashCode() {
            return Objects.hash(cohort, poolNumber);
        }
    }
}
