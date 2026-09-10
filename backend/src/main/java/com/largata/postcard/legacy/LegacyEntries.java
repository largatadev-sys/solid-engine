package com.largata.postcard.legacy;

import java.time.Instant;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.largata.postcard.api.SharedEntries;

public interface LegacyEntries extends SharedEntries {

    Entry post(
            UUID authorId,
            UUID tripId,
            UUID activityId,
            String activityTitle,
            String dayLabel,
            LocalTime timeOfDay,
            String place,
            UUID tripDayId,
            int tripDayOrdinal,
            String tripDayTitle,
            String tripTitle,
            String tripDestination,
            java.time.LocalDate tripStart,
            java.time.LocalDate tripEnd,
            String caption);

    Optional<Entry> mine(UUID entryId, UUID authorId, UUID tripId);

    boolean alreadyPosted(UUID authorId, UUID activityId);

    Entry recaption(UUID entryId, String caption);

    void delete(UUID entryId);

    List<Entry> pageOfMine(UUID authorId, UUID tripId, UUID after, int limit);

    List<TripRoll> tripsOf(UUID authorId, List<UUID> onlyTrips, UUID before, int limit);

    Optional<Entry> byId(UUID entryId);

}
