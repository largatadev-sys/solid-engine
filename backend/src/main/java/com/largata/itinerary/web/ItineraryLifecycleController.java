package com.largata.itinerary.web;

import com.largata.common.authz.AuthorizationGuard;
import com.largata.common.authz.Membership;
import com.largata.identity.Traveler;
import com.largata.identity.web.CurrentTraveler;
import com.largata.itinerary.ForkService;
import com.largata.itinerary.ItineraryService;
import com.largata.itinerary.api.ItineraryResponse;
import com.largata.itinerary.api.PublishRequest;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;


@RestController
@RequestMapping("/v1/itineraries")
class ItineraryLifecycleController {

    private final ItineraryService itineraries;
    private final ForkService forks;
    private final AuthorizationGuard guard;

    ItineraryLifecycleController(
            ItineraryService itineraries, ForkService forks, AuthorizationGuard guard) {
        this.itineraries = itineraries;
        this.forks = forks;
        this.guard = guard;
    }


    @PostMapping("/{id}/fork")
    @ResponseStatus(HttpStatus.CREATED)
    ItineraryResponse fork(@CurrentTraveler Traveler traveler, @PathVariable UUID id) {
        var forked = forks.fork(id, traveler.id(), guard.membershipOf(traveler.id(), id));
        UUID forkedId = forked.itinerary().id();
        return ItineraryResponse.of(forked, forks.provenanceOf(forkedId, traveler.id()).orElse(null));
    }


    @PostMapping("/{id}/finish-planning")
    void finishPlanningIsRetired(@CurrentTraveler Traveler traveler, @PathVariable UUID id) {
        itineraries.refuseFinishPlanning(guard.requireMember(traveler.id(), id));
    }


    @PostMapping("/{id}/publish")
    ItineraryResponse publish(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID id,
            @RequestBody(required = false) PublishRequest request) {
        Membership membership = guard.requireMember(traveler.id(), id);
        PublishRequest.requirePublicAudience(request);
        itineraries.publish(membership);
        return ItineraryResponse.of(itineraries.viewPlan(membership));
    }


    @PostMapping("/{id}/audience")
    ItineraryResponse audience(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID id,
            @RequestBody(required = false) PublishRequest request) {
        Membership membership = guard.requireMember(traveler.id(), id);
        PublishRequest.requirePublicAudience(request);
        return ItineraryResponse.of(itineraries.viewPlan(membership));
    }


    @PostMapping("/{id}/unpublish")
    ItineraryResponse unpublish(@CurrentTraveler Traveler traveler, @PathVariable UUID id) {
        Membership membership = guard.requireMember(traveler.id(), id);
        itineraries.unpublish(membership);
        return ItineraryResponse.of(itineraries.viewPlan(membership));
    }
}
