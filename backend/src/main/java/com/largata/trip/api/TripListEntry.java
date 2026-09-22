package com.largata.trip.api;

import com.largata.common.geo.Pin;
import com.largata.trip.room.Role;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;


public record TripListEntry(
        UUID id,
        String title,
        String destination,
        Pin pin,
        String currency,
        String description,
        List<String> standouts,
        String bestTimeOfYear,
        String coverImageUrl,
        LocalDate startDate,
        LocalDate endDate,
        TripLifecycle lifecycle,
        String visibility,
        boolean archived,
        String workspaceState,
        UUID lastEditedBy,
        Instant lastEditedAt,
        Instant createdAt,
        long planVersion,
        boolean beingEdited,
        int dayCount,
        Role viewerRole,
        int memberCount) {}
