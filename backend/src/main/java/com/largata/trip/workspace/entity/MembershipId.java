package com.largata.trip.workspace.entity;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;


public class MembershipId implements Serializable {

    private UUID workspace;
    private UUID travelerId;

    MembershipId() {
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
