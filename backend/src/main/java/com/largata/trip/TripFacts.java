package com.largata.trip;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;


public record TripFacts(
        UUID id,
        UUID ownerId,
        String title,
        String destination,
        LocalDate startDate,
        LocalDate endDate,
        TripLifecycle lifecycle,
        boolean published,
        boolean archived,
        Instant createdAt) {}
