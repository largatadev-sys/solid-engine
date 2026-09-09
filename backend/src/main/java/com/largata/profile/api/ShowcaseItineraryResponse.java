package com.largata.profile.api;

import java.util.UUID;


public record ShowcaseItineraryResponse(
        UUID id, String title, String destination, int durationDays, String coverImageUrl) {}
