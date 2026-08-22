package com.largata.join.web;

import com.largata.join.JoinTeaser;
import java.time.LocalDate;


public record JoinTeaserResponse(
        String title,
        String destination,
        LocalDate startDate,
        LocalDate endDate,
        int travelerCount,
        boolean hasCover,
        String viewerState) {

    static JoinTeaserResponse of(JoinTeaser teaser) {
        return new JoinTeaserResponse(
                teaser.title(),
                teaser.destination(),
                teaser.startDate(),
                teaser.endDate(),
                teaser.travelerCount(),
                teaser.coverUrl() != null,
                teaser.viewerState().wireName());
    }
}
