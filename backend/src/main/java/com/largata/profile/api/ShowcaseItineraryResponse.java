package com.largata.profile.api;

import java.util.UUID;


public record ShowcaseItineraryResponse(
        UUID id,
        UUID tripId,
        String title,
        String destination,
        int durationDays,
        String coverImageUrl) {}
