package com.largata.itinerary.controller;

import static com.largata.trip.room.Door.Rule.OPEN;

import com.largata.trip.room.CurrentMember;
import com.largata.trip.room.Door;
import com.largata.trip.room.Membership;
import com.largata.trip.room.PublicFace;
import com.largata.trip.room.Owner;
import com.largata.trip.exception.NotTheTripOwnerException;
import com.largata.identity.Traveler;
import com.largata.common.security.CurrentTraveler;
import com.largata.itinerary.dto.ItineraryObjectResponse;
import com.largata.itinerary.entity.ItineraryObject;
import com.largata.itinerary.dto.ItineraryPageResponse;
import com.largata.itinerary.service.ItineraryObjectService;
import com.largata.itinerary.service.ItineraryForkService;
import com.largata.itinerary.service.ItineraryPageService;
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
    private final ItineraryPageService pages;
    private final ItineraryForkService forks;

    ItineraryController(
            ItineraryObjectService itineraries, ItineraryPageService pages, ItineraryForkService forks) {
        this.itineraries = itineraries;
        this.pages = pages;
        this.forks = forks;
    }


    @PostMapping("/v1/trips/{tripId}/publish")
    @Door(OPEN)
    ItineraryObjectResponse publish(@CurrentMember Membership member) {
        ItineraryObject published =
                itineraries.publish(Owner.of(member, NotTheTripOwnerException::toPublishTheTrip));
        return ItineraryObjectResponse.of(published, itineraries.planTreeOf(published));
    }


    @PostMapping("/v1/trips/{tripId}/unpublish")
    @Door(OPEN)
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void unpublish(@CurrentMember Membership member) {
        itineraries.unpublish(Owner.of(member, NotTheTripOwnerException::toUnpublishTheTrip));
    }


    @GetMapping("/v1/itineraries/{objectId}")
    ItineraryPageResponse read(@CurrentTraveler Traveler traveler, @PathVariable UUID objectId) {
        return pages.pageOf(itineraries.readFor(traveler.id(), objectId), traveler.id());
    }


    @GetMapping("/v1/trips/{tripId}/preview")
    ItineraryPageResponse preview(@CurrentMember Membership member) {
        return pages.previewOf(
                member.itineraryId(),
                member.travelerId(),
                member.travelerId(),
                itineraries.snapshotOfLivePlan(
                        Owner.of(member, NotTheTripOwnerException::toPreviewThePublishedPage)));
    }


    @GetMapping("/v1/trips/{tripId}/itinerary")
    @PublicFace
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
}
