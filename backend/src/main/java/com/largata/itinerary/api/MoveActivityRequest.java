package com.largata.itinerary.api;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

/**
 * The move-an-activity-to-another-day body (S1.3, ticket 03): the target day's id. The activity lands
 * at that day's end. The source day is in the path; the service checks both belong to the caller's
 * itinerary before the move.
 */
public record MoveActivityRequest(
        @NotNull(message = "The target day id is required.") UUID targetDayId) {}
