package com.largata.workspace;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

/**
 * {@link Membership}'s composite primary key — {@code (workspace, traveler)}, matching V4.
 *
 * <p>The {@code workspace} field is a {@code UUID} here while the entity's is a {@code Workspace}:
 * that is JPA's {@code @IdClass} contract — the id class names the same fields by name, in their
 * identifier form.
 */
class MembershipId implements Serializable {

    private UUID workspace;
    private UUID travelerId;

    MembershipId() {
        // JPA.
    }

    MembershipId(UUID workspace, UUID travelerId) {
        this.workspace = workspace;
        this.travelerId = travelerId;
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) {
            return true;
        }
        return other instanceof MembershipId that
                && Objects.equals(workspace, that.workspace)
                && Objects.equals(travelerId, that.travelerId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(workspace, travelerId);
    }
}
