package com.largata.discovery.dto;

import com.largata.identity.api.TravelerCardResponse;
import java.time.Instant;
import java.util.UUID;


public record DiscoveryCardResponse(
        UUID id,
        String title,
        String destination,
        int durationDays,
        String coverImageUrl,
        TravelerCardResponse author,
        Instant publishedAt) {}
