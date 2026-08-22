package com.largata.itinerary;

import java.time.LocalDate;
import java.util.UUID;


public record TripTeaser(
        UUID itineraryId,
        String title,
        String destination,
        LocalDate startDate,
        LocalDate endDate,
        String coverImageUrl,
        boolean published) {}
