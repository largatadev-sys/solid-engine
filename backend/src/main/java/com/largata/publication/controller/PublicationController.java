package com.largata.publication.controller;

import com.largata.common.authz.AuthorizationGuard;
import com.largata.common.authz.Membership;
import com.largata.identity.Traveler;
import com.largata.common.security.CurrentTraveler;
import com.largata.publication.dto.ItineraryObjectResponse;
import com.largata.publication.entity.ItineraryObject;
import com.largata.publication.dto.ItineraryPageResponse;
import com.largata.publication.service.ItineraryObjectService;
import com.largata.publication.service.ItineraryForkService;
import com.largata.publication.service.ItineraryPageService;
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
class PublicationController {

    private final ItineraryObjectService publications;
    private final AuthorizationGuard guard;
    private final ItineraryPageService pages;
    private final ItineraryForkService forks;

    PublicationController(
            ItineraryObjectService publications,
            AuthorizationGuard guard,
            ItineraryPageService pages,
            ItineraryForkService forks) {
        this.publications = publications;
        this.guard = guard;
        this.pages = pages;
        this.forks = forks;
    }


    @PostMapping("/v1/trips/{tripId}/publish")
    ItineraryObjectResponse publish(@CurrentTraveler Traveler traveler, @PathVariable UUID tripId) {
        ItineraryObject published = publications.publish(requireMember(traveler, tripId));
        return ItineraryObjectResponse.of(published, publications.planTreeOf(published));
    }


    @PostMapping("/v1/trips/{tripId}/unpublish")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void unpublish(@CurrentTraveler Traveler traveler, @PathVariable UUID tripId) {
        publications.unpublish(requireMember(traveler, tripId));
    }


    @GetMapping("/v1/publications/{objectId}")
    ItineraryPageResponse read(@CurrentTraveler Traveler traveler, @PathVariable UUID objectId) {
        return pages.pageOf(publications.readFor(traveler.id(), objectId), traveler.id());
    }


    @GetMapping("/v1/trips/{tripId}/itinerary")
    ItineraryPageResponse readByTrip(@CurrentTraveler Traveler traveler, @PathVariable UUID tripId) {
        return pages.pageOf(publications.liveOfTripFor(traveler.id(), tripId), traveler.id());
    }


    @PostMapping("/v1/publications/{objectId}/fork")
    @ResponseStatus(HttpStatus.CREATED)
    ForkedTripResponse fork(@CurrentTraveler Traveler traveler, @PathVariable UUID objectId) {
        return new ForkedTripResponse(forks.fork(objectId, traveler.id()));
    }


    record ForkedTripResponse(UUID id) {}


    @DeleteMapping("/v1/publications/{objectId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void destroy(@CurrentTraveler Traveler traveler, @PathVariable UUID objectId) {
        publications.destroy(traveler.id(), objectId);
    }


    private Membership requireMember(Traveler traveler, UUID tripId) {
        return guard.membershipOf(traveler.id(), tripId).orElseThrow(TripNotFoundException::new);
    }
}
