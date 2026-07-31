package com.largata.itinerary.api;

import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;


public record ReorderActivitiesRequest(
        @NotNull(message = "The ordered list of activity ids is required.") List<UUID> activityIds,
        @NotNull(message = "The ordering this reorder is based on is required.") List<UUID> expectedActivityIds) {}
