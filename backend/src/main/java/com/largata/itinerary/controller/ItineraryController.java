package com.largata.itinerary.controller;

import com.largata.common.authz.AuthorizationGuard;
import com.largata.common.authz.Membership;
import com.largata.identity.Traveler;
import com.largata.common.security.CurrentTraveler;
import com.largata.itinerary.dto.ItineraryObjectResponse;
import com.largata.itinerary.entity.ItineraryObject;
import com.largata.itinerary.dto.ItineraryPageResponse;
import com.largata.itinerary.service.ItineraryObjectService;
import com.largata.itinerary.service.ItineraryForkService;
import com.largata.itinerary.service.ItineraryPageService;
import com.largata.trip.exception.TripNotFoundException;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
class ItineraryController {

    private final ItineraryObjectService itineraries;
    private final AuthorizationGuard guard;
    private final ItineraryPageService pages;
    private final ItineraryForkService forks;

    ItineraryController(
            ItineraryObjectService itineraries,
            AuthorizationGuard guard,
            ItineraryPageService pages,
            ItineraryForkService forks) {
        this.itineraries = itineraries;
        this.guard = guard;
        this.pages = pages;
        this.forks = forks;
    }


    @PostMapping("/v1/trips/{tripId}/publish")
    ItineraryObjectResponse publish(@CurrentTraveler Traveler traveler, @PathVariable UUID tripId) {
        ItineraryObject published = itineraries.publish(requireMember(traveler, tripId));
        return ItineraryObjectResponse.of(published, itineraries.planTreeOf(published));
    }


    @PostMapping("/v1/trips/{tripId}/unpublish")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void unpublish(@CurrentTraveler Traveler traveler, @PathVariable UUID tripId) {
        itineraries.unpublish(requireMember(traveler, tripId));
    }


    @GetMapping("/v1/itineraries/{objectId}")
    ItineraryPageResponse read(@CurrentTraveler Traveler traveler, @PathVariable UUID objectId) {
        return pages.pageOf(itineraries.readFor(traveler.id(), objectId), traveler.id());
    }


    @GetMapping("/v1/trips/{tripId}/preview")
    ItineraryPageResponse preview(@CurrentTraveler Traveler traveler, @PathVariable UUID tripId) {
        Membership owner = requireMember(traveler, tripId);
        return pages.previewOf(
                tripId,
                traveler.id(),
                traveler.id(),
                itineraries.snapshotOfLivePlan(owner));
    }


    @GetMapping("/v1/trips/{tripId}/itinerary")
    ItineraryPageResponse readByTrip(@CurrentTraveler Traveler traveler, @PathVariable UUID tripId) {
        return pages.pageOf(itineraries.liveOfTripFor(traveler.id(), tripId), traveler.id());
    }


    @PostMapping("/v1/itineraries/{objectId}/fork")
    @ResponseStatus(HttpStatus.CREATED)
    ForkedTripResponse fork(@CurrentTraveler Traveler traveler, @PathVariable UUID objectId) {
        return new ForkedTripResponse(forks.fork(objectId, traveler.id()));
    }


    record ForkedTripResponse(UUID id) {}


    @DeleteMapping("/v1/itineraries/{objectId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void destroy(@CurrentTraveler Traveler traveler, @PathVariable UUID objectId) {
        itineraries.destroy(traveler.id(), objectId);
    }


    private Membership requireMember(Traveler traveler, UUID tripId) {
        return guard.membershipOf(traveler.id(), tripId).orElseThrow(TripNotFoundException::new);
    }
}
