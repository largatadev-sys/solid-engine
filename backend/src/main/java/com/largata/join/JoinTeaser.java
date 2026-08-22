package com.largata.join;

import java.time.LocalDate;
import java.util.UUID;


public record JoinTeaser(
        UUID itineraryId,
        String title,
        String destination,
        LocalDate startDate,
        LocalDate endDate,
        int travelerCount,
        String coverUrl,
        ViewerJoinState viewerState) {}
