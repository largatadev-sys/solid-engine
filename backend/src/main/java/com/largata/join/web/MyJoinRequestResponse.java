package com.largata.join.web;

import com.largata.join.MyJoinRequest;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;


public record MyJoinRequestResponse(
        UUID id,
        UUID itineraryId,
        String tripTitle,
        String destination,
        LocalDate startDate,
        LocalDate endDate,
        boolean hasCover,
        List<GoingTravelerResponse> going,
        int travelerCount,
        Instant requestedAt) {


    public record GoingTravelerResponse(UUID travelerId, String displayName, String avatarUrl) {

        static GoingTravelerResponse of(MyJoinRequest.GoingTraveler traveler) {
            return new GoingTravelerResponse(
                    traveler.travelerId(), traveler.displayName(), traveler.avatarUrl());
        }
    }


    public static MyJoinRequestResponse of(MyJoinRequest r) {
        return new MyJoinRequestResponse(
                r.id(),
                r.itineraryId(),
                r.tripTitle(),
                r.destination(),
                r.startDate(),
                r.endDate(),
                r.hasCover(),
                r.going().stream().map(GoingTravelerResponse::of).toList(),
                r.travelerCount(),
                r.requestedAt());
    }
}
