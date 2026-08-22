package com.largata.join;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;


public record MyJoinRequest(
        UUID id,
        UUID itineraryId,
        String tripTitle,
        String destination,
        LocalDate startDate,
        LocalDate endDate,
        boolean hasCover,
        List<GoingTraveler> going,
        int travelerCount,
        Instant requestedAt) {


    public record GoingTraveler(UUID travelerId, String displayName, String avatarUrl) {}
}
