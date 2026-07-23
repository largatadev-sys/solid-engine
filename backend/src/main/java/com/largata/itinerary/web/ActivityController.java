package com.largata.itinerary.web;

import com.largata.common.authz.AuthorizationGuard;
import com.largata.common.authz.Membership;
import com.largata.identity.Traveler;
import com.largata.identity.web.CurrentTraveler;
import com.largata.itinerary.ActivityService;
import com.largata.itinerary.api.ActivityRequest;
import com.largata.itinerary.api.ActivityResponse;
import com.largata.itinerary.api.DayResponse;
import com.largata.itinerary.api.MoveActivityRequest;
import com.largata.itinerary.api.ReorderActivitiesRequest;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * The activity endpoints (S1.3, ticket 02) — creating, editing and deleting the elements of a day's
 * plan.
 *
 * <p>Transport only, like {@code DayController}: the guard resolves a {@link Membership} from the
 * itinerary id and the service does the rest — the day-belongs and activity-belongs masking, the
 * end-of-day sort, the attribution, last-write-wins. <strong>No owner check</strong> (spec Q8: any
 * member shapes the plan). Itinerary- and day-addressed, workspace id off the wire (the S1.2/S1.3
 * convention).
 *
 * <p>Create and edit share one body ({@link ActivityRequest}): last-write-wins means an edit sends
 * the whole activity, exactly as create does — so two DTOs would be one contract written twice.
 */
@RestController
@RequestMapping("/v1/itineraries/{itineraryId}/days/{dayId}/activities")
class ActivityController {

    private final ActivityService activities;
    private final AuthorizationGuard guard;

    ActivityController(ActivityService activities, AuthorizationGuard guard) {
        this.activities = activities;
        this.guard = guard;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    ActivityResponse create(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID itineraryId,
            @PathVariable UUID dayId,
            @Valid @RequestBody ActivityRequest request) {
        Membership member = guard.requireMember(traveler.id(), itineraryId);
        return ActivityResponse.of(activities.create(member, dayId, request.toFields()));
    }

    @PatchMapping("/{activityId}")
    ActivityResponse edit(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID itineraryId,
            @PathVariable UUID dayId,
            @PathVariable UUID activityId,
            @Valid @RequestBody ActivityRequest request) {
        Membership member = guard.requireMember(traveler.id(), itineraryId);
        return ActivityResponse.of(activities.edit(member, dayId, activityId, request.toFields()));
    }

    @DeleteMapping("/{activityId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID itineraryId,
            @PathVariable UUID dayId,
            @PathVariable UUID activityId) {
        Membership member = guard.requireMember(traveler.id(), itineraryId);
        activities.delete(member, dayId, activityId);
    }

    /**
     * Reorders the whole day (S1.3, ticket 03): the body is the complete ordered list of the day's
     * activity ids. PUT, because it replaces the day's ordering wholesale — idempotent, and the verb
     * that matches "here is the new arrangement" rather than "nudge one item".
     *
     * <p>Returns the reordered day (200 + resource, per 05-api-conventions' PUT convention), so the
     * client holds the server-confirmed order without a follow-up read.
     */
    @PutMapping("/order")
    DayResponse reorder(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID itineraryId,
            @PathVariable UUID dayId,
            @Valid @RequestBody ReorderActivitiesRequest request) {
        Membership member = guard.requireMember(traveler.id(), itineraryId);
        return DayResponse.of(activities.reorder(member, dayId, request.activityIds()));
    }

    /**
     * Moves an activity to another day (S1.3, ticket 03), landing it at that day's end. POST, not
     * PATCH: this is a positional move, kept distinct from the content edit (PATCH) so last-write-wins
     * stays about content. The source day is in the path; the target is in the body.
     */
    @PostMapping("/{activityId}/move")
    ActivityResponse move(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID itineraryId,
            @PathVariable UUID dayId,
            @PathVariable UUID activityId,
            @Valid @RequestBody MoveActivityRequest request) {
        Membership member = guard.requireMember(traveler.id(), itineraryId);
        return ActivityResponse.of(activities.move(member, dayId, activityId, request.targetDayId()));
    }
}
