package com.largata.itinerary.web;

import com.largata.common.api.Page;
import com.largata.common.authz.AuthorizationGuard;
import com.largata.common.authz.Membership;
import com.largata.common.authz.AudienceFence;
import com.largata.identity.Traveler;
import com.largata.identity.web.CurrentTraveler;
import com.largata.itinerary.ItineraryService;
import com.largata.itinerary.PublishedItineraryService;
import com.largata.itinerary.TripCategory;
import com.largata.itinerary.api.CreateItineraryRequest;
import com.largata.itinerary.api.ItineraryResponse;
import com.largata.itinerary.api.PublishRequest;
import com.largata.itinerary.api.PublishedItineraryResponse;
import com.largata.itinerary.api.UpdateItineraryRequest;
import com.largata.membership.MembershipService;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;


@RestController
@RequestMapping("/v1/itineraries")
class ItineraryController {

    private final ItineraryService itineraries;
    private final PublishedItineraryService published;
    private final MembershipService memberships;
    private final AuthorizationGuard guard;
    private final AudienceFence audience;

    ItineraryController(
            ItineraryService itineraries,
            PublishedItineraryService published,
            MembershipService memberships,
            AuthorizationGuard guard,
            AudienceFence audience) {
        this.itineraries = itineraries;
        this.published = published;
        this.memberships = memberships;
        this.guard = guard;
        this.audience = audience;
    }


    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    ItineraryResponse create(@CurrentTraveler Traveler traveler, @Valid @RequestBody CreateItineraryRequest request) {
        var created =
                itineraries.createWithPlan(
                        traveler.id(),
                        request.title(),
                        request.destinations(),
                        request.description(),
                        request.startDate(),
                        request.endDate(),
                        request.durationDaysOrZero());
        return ItineraryResponse.of(created);
    }


    @GetMapping("/{id}")
    ItineraryResponse view(@CurrentTraveler Traveler traveler, @PathVariable UUID id) {
        Membership membership = guard.requireMember(traveler.id(), id);
        audience.requireInAudience(membership);
        var plan = itineraries.viewPlan(membership);
        return ItineraryResponse.of(plan);
    }


    @PatchMapping("/{id}")
    ItineraryResponse update(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateItineraryRequest request) {
        Membership membership = guard.requireMember(traveler.id(), id);
        itineraries.editFields(membership, request.toFields());
        var plan = itineraries.viewPlan(membership);
        return ItineraryResponse.of(plan);
    }


    @PostMapping("/{id}/start")
    ItineraryResponse start(@CurrentTraveler Traveler traveler, @PathVariable UUID id) {
        Membership membership = guard.requireMember(traveler.id(), id);
        itineraries.start(membership);
        var plan = itineraries.viewPlan(membership);
        return ItineraryResponse.of(plan);
    }


    @PostMapping("/{id}/complete")
    ItineraryResponse complete(@CurrentTraveler Traveler traveler, @PathVariable UUID id) {
        Membership membership = guard.requireMember(traveler.id(), id);
        itineraries.complete(membership);
        var plan = itineraries.viewPlan(membership);
        return ItineraryResponse.of(plan);
    }


    @GetMapping("/{id}/preview")
    PublishedItineraryResponse preview(@CurrentTraveler Traveler traveler, @PathVariable UUID id) {
        Membership membership = guard.requireMember(traveler.id(), id);
        return PublishedItineraryResponse.of(published.preview(membership));
    }


    @PostMapping("/{id}/publish")
    ItineraryResponse publish(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID id,
            @RequestBody(required = false) PublishRequest request) {
        Membership membership = guard.requireMember(traveler.id(), id);
        itineraries.publish(membership, PublishRequest.audienceOf(request));
        return ItineraryResponse.of(itineraries.viewPlan(membership));
    }


    @PostMapping("/{id}/unpublish")
    ItineraryResponse unpublish(@CurrentTraveler Traveler traveler, @PathVariable UUID id) {
        Membership membership = guard.requireMember(traveler.id(), id);
        itineraries.unpublish(membership);
        return ItineraryResponse.of(itineraries.viewPlan(membership));
    }


    @GetMapping
    Page<ItineraryResponse> listMine(
            @CurrentTraveler Traveler traveler,
            @RequestParam(required = false) String cursor,
            @RequestParam(required = false) Integer limit,
            @RequestParam(defaultValue = "false") boolean archived,
            @RequestParam(required = false) String category) {
        return itineraries
                .listMine(traveler.id(), cursor, limit, archived, TripCategory.parse(category).orElse(null))
                .map(itinerary -> ItineraryResponse.summaryOf(itinerary, itineraries.stateOf(itinerary.id())));
    }


    @PostMapping("/{id}/archive")
    ItineraryResponse archive(@CurrentTraveler Traveler traveler, @PathVariable UUID id) {
        Membership membership = guard.requireMember(traveler.id(), id);
        memberships.archive(membership);
        var plan = itineraries.viewPlan(membership);
        return ItineraryResponse.of(plan);
    }


    @PostMapping("/{id}/unarchive")
    ItineraryResponse unarchive(@CurrentTraveler Traveler traveler, @PathVariable UUID id) {
        Membership membership = guard.requireMember(traveler.id(), id);
        memberships.unarchive(membership);
        var plan = itineraries.viewPlan(membership);
        return ItineraryResponse.of(plan);
    }
}
