package com.largata.trip.web;

import com.largata.common.authz.Role;
import com.largata.trip.TripFacts;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Locale;
import java.util.UUID;


public record TripResponse(
        UUID id,
        String title,
        String destination,
        LocalDate startDate,
        LocalDate endDate,
        String state,
        boolean published,
        boolean archived,
        String viewerRole,
        Instant createdAt) {


    public static TripResponse of(TripFacts facts, Role viewerRole) {
        return new TripResponse(
                facts.id(),
                facts.title(),
                facts.destination(),
                facts.startDate(),
                facts.endDate(),
                facts.lifecycle().wireName(),
                facts.published(),
                facts.archived(),
                viewerRole.name().toLowerCase(Locale.ROOT),
                facts.createdAt());
    }
}
