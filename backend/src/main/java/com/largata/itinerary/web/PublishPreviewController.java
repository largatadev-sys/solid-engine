package com.largata.itinerary.web;

import com.largata.common.authz.AuthorizationGuard;
import com.largata.common.authz.Membership;
import com.largata.identity.Traveler;
import com.largata.identity.web.CurrentTraveler;
import com.largata.itinerary.PublishedItineraryService;
import com.largata.itinerary.api.PublishedItineraryResponse;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;


@RestController
@RequestMapping({"/v1/itineraries", "/v1/trips"})
class PublishPreviewController {

    private final PublishedItineraryService published;
    private final AuthorizationGuard guard;

    PublishPreviewController(PublishedItineraryService published, AuthorizationGuard guard) {
        this.published = published;
        this.guard = guard;
    }


    @GetMapping("/{id}/preview")
    PublishedItineraryResponse preview(@CurrentTraveler Traveler traveler, @PathVariable UUID id) {
        Membership membership = guard.requireMember(traveler.id(), id);
        return PublishedItineraryResponse.of(published.preview(membership));
    }
}
