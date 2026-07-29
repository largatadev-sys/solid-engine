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


    @PutMapping("/order")
    DayResponse reorder(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID itineraryId,
            @PathVariable UUID dayId,
            @Valid @RequestBody ReorderActivitiesRequest request) {
        Membership member = guard.requireMember(traveler.id(), itineraryId);
        return DayResponse.of(activities.reorder(member, dayId, request.activityIds()));
    }


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
