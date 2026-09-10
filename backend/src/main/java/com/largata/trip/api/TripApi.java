package com.largata.trip.api;

import java.util.Collection;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

public interface TripApi {

    Optional<TripFacts> factsOf(UUID tripId);

    Optional<TripTeaser> teaserOf(UUID tripId);

    java.util.List<TripTeaser> teasersOf(java.util.Collection<UUID> tripIds);

    Map<UUID, String> titlesByIds(Collection<UUID> tripIds);

    long shareCardVersionOf(UUID tripId);

    boolean frozen(UUID tripId);
}
