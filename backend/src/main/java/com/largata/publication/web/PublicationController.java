package com.largata.publication.web;

import com.largata.common.authz.AuthorizationGuard;
import com.largata.common.authz.Membership;
import com.largata.identity.AuthoredContentAudience;
import com.largata.identity.Traveler;
import com.largata.identity.web.CurrentTraveler;
import com.largata.publication.ItineraryObject;
import com.largata.publication.ItineraryObjectService;
import com.largata.trip.TripExceptions.TripNotFoundException;
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
    private final AuthoredContentAudience audience;

    PublicationController(
            ItineraryObjectService publications,
            AuthorizationGuard guard,
            AuthoredContentAudience audience) {
        this.publications = publications;
        this.guard = guard;
        this.audience = audience;
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
    ItineraryObjectResponse read(@CurrentTraveler Traveler traveler, @PathVariable UUID objectId) {
        ItineraryObject object = publications.read(objectId);
        audience.requireReadable(traveler.id(), object.ownerId());
        return ItineraryObjectResponse.of(object, publications.planTreeOf(object));
    }


    @DeleteMapping("/v1/publications/{objectId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void destroy(@CurrentTraveler Traveler traveler, @PathVariable UUID objectId) {
        publications.destroy(traveler.id(), objectId);
    }


    private Membership requireMember(Traveler traveler, UUID tripId) {
        return guard.membershipOf(traveler.id(), tripId).orElseThrow(TripNotFoundException::new);
    }
}
