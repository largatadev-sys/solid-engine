package com.largata.trip.trip.controller;

import com.largata.common.authz.AuthorizationGuard;
import com.largata.common.authz.Membership;
import com.largata.identity.Traveler;
import com.largata.identity.web.CurrentTraveler;
import com.largata.trip.fork.ForkService;
import com.largata.trip.trip.dto.TripResponse;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import com.largata.trip.trip.service.TripService;
import com.largata.trip.trip.dto.PublishRequest;


@RestController
@RequestMapping("/v1/itineraries")
class TripLifecycleController {

    private final TripService itineraries;
    private final ForkService forks;
    private final AuthorizationGuard guard;

    TripLifecycleController(
            TripService itineraries, ForkService forks, AuthorizationGuard guard) {
        this.itineraries = itineraries;
        this.forks = forks;
        this.guard = guard;
    }


    @PostMapping("/{id}/fork")
    @ResponseStatus(HttpStatus.CREATED)
    TripResponse fork(@CurrentTraveler Traveler traveler, @PathVariable UUID id) {
        var forked = forks.fork(id, traveler.id(), guard.membershipOf(traveler.id(), id));
        UUID forkedId = forked.itinerary().id();
        return TripResponse.of(forked, forks.provenanceOf(forkedId, traveler.id()).orElse(null));
    }


    @PostMapping("/{id}/finish-planning")
    void finishPlanningIsRetired(@CurrentTraveler Traveler traveler, @PathVariable UUID id) {
        itineraries.refuseFinishPlanning(guard.requireMember(traveler.id(), id));
    }


    @PostMapping("/{id}/publish")
    TripResponse publish(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID id,
            @RequestBody(required = false) PublishRequest request) {
        Membership membership = guard.requireMember(traveler.id(), id);
        PublishRequest.requirePublicAudience(request);
        itineraries.publish(membership);
        return TripResponse.of(itineraries.viewPlan(membership));
    }


    @PostMapping("/{id}/audience")
    TripResponse audience(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID id,
            @RequestBody(required = false) PublishRequest request) {
        Membership membership = guard.requireMember(traveler.id(), id);
        PublishRequest.requirePublicAudience(request);
        return TripResponse.of(itineraries.viewPlan(membership));
    }


    @PostMapping("/{id}/unpublish")
    TripResponse unpublish(@CurrentTraveler Traveler traveler, @PathVariable UUID id) {
        Membership membership = guard.requireMember(traveler.id(), id);
        itineraries.unpublish(membership);
        return TripResponse.of(itineraries.viewPlan(membership));
    }
}
