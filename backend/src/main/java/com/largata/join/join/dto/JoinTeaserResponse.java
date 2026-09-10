package com.largata.join.join.dto;

import com.largata.join.join.service.JoinTeaser;
import com.largata.join.join.service.ViewerJoinState;
import java.time.LocalDate;
import java.util.UUID;


public record JoinTeaserResponse(
        String title,
        String destination,
        LocalDate startDate,
        LocalDate endDate,
        int travelerCount,
        boolean hasCover,
        String viewerState,
        UUID itineraryId) {

    public static JoinTeaserResponse of(JoinTeaser teaser) {
        return new JoinTeaserResponse(
                teaser.title(),
                teaser.destination(),
                teaser.startDate(),
                teaser.endDate(),
                teaser.travelerCount(),
                teaser.coverUrl() != null,
                teaser.viewerState().wireName(),
                teaser.viewerState() == ViewerJoinState.MEMBER ? teaser.itineraryId() : null);
    }
}
