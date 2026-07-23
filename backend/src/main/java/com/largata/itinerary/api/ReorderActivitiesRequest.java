package com.largata.itinerary.api;

import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;

/**
 * The reorder-a-day's-activities body (S1.3, ticket 03): the complete ordered list of the day's
 * activity ids, top to bottom.
 *
 * <p>Whole-list, not per-item: manual order is authoritative (ADR-013), so the client owns the whole
 * arrangement and sends it — the server rewrites {@code sort_order} to match. The service checks the
 * list is exactly the day's activities (the set-equality guard), so a stale list that predates a
 * concurrent add or delete is a 400, not a silent drop.
 */
public record ReorderActivitiesRequest(
        @NotNull(message = "The ordered list of activity ids is required.") List<UUID> activityIds) {}
