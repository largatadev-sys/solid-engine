package com.largata.invitation.web;

import com.largata.invitation.InboxInvitation;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;


public record InboxInvitationResponse(
        UUID id,
        UUID itineraryId,
        String tripTitle,
        String inviterName,
        String inviterHandle,
        String destination,
        LocalDate startDate,
        LocalDate endDate,
        boolean hasCover,
        List<GoingTravelerResponse> going,
        int travelerCount,
        Instant createdAt,
        Instant expiresAt) {


    public record GoingTravelerResponse(UUID travelerId, String displayName, String avatarUrl) {

        static GoingTravelerResponse of(InboxInvitation.GoingTraveler traveler) {
            return new GoingTravelerResponse(
                    traveler.travelerId(), traveler.displayName(), traveler.avatarUrl());
        }
    }


    public static InboxInvitationResponse of(InboxInvitation i) {
        return new InboxInvitationResponse(
                i.id(),
                i.itineraryId(),
                i.tripTitle(),
                i.inviterName(),
                i.inviterHandle(),
                i.destination(),
                i.startDate(),
                i.endDate(),
                i.hasCover(),
                i.going().stream().map(GoingTravelerResponse::of).toList(),
                i.travelerCount(),
                i.createdAt(),
                i.expiresAt());
    }
}
