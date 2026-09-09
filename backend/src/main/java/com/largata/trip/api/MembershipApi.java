package com.largata.trip.api;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

public interface MembershipApi {

    void admit(UUID tripId, UUID travelerId, Instant joinedAt);

    boolean isMember(UUID tripId, UUID travelerId);

    List<MembershipView> membersOf(UUID tripId);

    Optional<UUID> workspaceIdOf(UUID tripId);

    Map<UUID, UUID> tripIdsByWorkspace(Collection<UUID> workspaceIds);

    boolean isArchived(UUID tripId);

    java.util.Set<UUID> allArchivedTripIds();

    List<UUID> tripIdsInSightOf(UUID travelerId);
}
