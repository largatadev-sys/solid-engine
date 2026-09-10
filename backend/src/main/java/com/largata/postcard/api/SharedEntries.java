package com.largata.postcard.api;

import java.time.Instant;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

public interface SharedEntries {

    List<Entry> feedPage(List<UUID> hiddenAuthors, Instant at, UUID id, int limit);

    List<Entry> feedPageOf(List<UUID> authorIds, Instant at, UUID id, int limit);

    List<Entry> ofTrip(UUID tripId, UUID authorId);

    List<TripRoll> tripsOf(UUID authorId, UUID before, int limit);


    record Entry(
            UUID id,
            UUID authorId,
            UUID tripId,
            UUID activityId,
            String activityTitle,
            String dayLabel,
            LocalTime timeOfDay,
            String place,
            String caption,
            Instant sharedAt,
            Instant createdAt,
            Instant updatedAt) {}


    record TripRoll(UUID tripId, long entryCount, UUID latestEntryId) {}
}
