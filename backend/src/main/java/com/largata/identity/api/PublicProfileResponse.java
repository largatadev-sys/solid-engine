package com.largata.identity.api;

public record PublicProfileResponse(
        TravelerCardResponse traveler,
        String bio,
        String vanityNumber,
        long publishedCount,
        long destinationCount) {}
