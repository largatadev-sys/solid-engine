package com.largata.common.authz;

import java.time.Instant;
import java.util.Collection;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;


public interface PublicationState {


    boolean isPublished(UUID itineraryId);


    Set<UUID> publishedAmong(Collection<UUID> itineraryIds);


    Optional<LivePublication> liveFor(UUID tripId);


    Map<UUID, LivePublication> liveAmong(Collection<UUID> tripIds);


    record LivePublication(UUID itineraryId, Instant publishedAt) {}
}
