package com.largata.invitation;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;


public record InboxInvitation(
        UUID id,
        UUID itineraryId,
        String tripTitle,
        String inviterName,
        String inviterHandle,
        String destination,
        LocalDate startDate,
        LocalDate endDate,
        boolean hasCover,
        List<GoingTraveler> going,
        int travelerCount,
        Instant createdAt,
        Instant expiresAt) {


    public record GoingTraveler(UUID travelerId, String displayName, String avatarUrl) {}
}
