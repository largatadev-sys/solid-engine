package com.largata.trip.trip.controller;

import com.largata.common.api.Page;
import com.largata.common.authz.AuthorizationGuard;
import com.largata.common.authz.Membership;
import com.largata.common.authz.AudienceFence;
import com.largata.identity.Traveler;
import com.largata.identity.web.CurrentTraveler;
import com.largata.trip.trip.entity.Trip;
import com.largata.trip.trip.entity.TripCategory;
import com.largata.trip.trip.dto.CreateTripRequest;
import com.largata.trip.trip.dto.TripResponse;
import com.largata.trip.trip.dto.UpdateTripRequest;
import com.largata.trip.ownership.service.MembershipService;
import com.largata.trip.fork.ForkService;
import com.largata.trip.cover.TripCoverService;
import jakarta.validation.Valid;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import com.largata.trip.trip.service.TripService;


@RestController
@RequestMapping({"/v1/itineraries", "/v1/trips"})
class TripController {

    private final TripService itineraries;
    private final ForkService forks;
    private final TripCoverService covers;
    private final MembershipService memberships;
    private final AuthorizationGuard guard;
    private final AudienceFence audience;

    TripController(
            TripService itineraries,
            ForkService forks,
            TripCoverService covers,
            MembershipService memberships,
            AuthorizationGuard guard,
            AudienceFence audience) {
        this.itineraries = itineraries;
        this.forks = forks;
        this.covers = covers;
        this.memberships = memberships;
        this.guard = guard;
        this.audience = audience;
    }


    @PostMapping("/{id}/cover")
    TripResponse uploadCover(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID id,
            @RequestPart("photo") MultipartFile photo)
            throws IOException {
        Membership membership = guard.requireMember(traveler.id(), id);
        covers.replaceCover(membership, photo.getBytes());
        return TripResponse.of(itineraries.viewPlan(membership));
    }


    @DeleteMapping("/{id}/cover")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void removeCover(@CurrentTraveler Traveler traveler, @PathVariable UUID id) {
        covers.removeCover(guard.requireMember(traveler.id(), id));
    }


    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    TripResponse create(@CurrentTraveler Traveler traveler, @Valid @RequestBody CreateTripRequest request) {
        var created =
                itineraries.createWithPlan(
                        traveler.id(), request.toFields(), request.durationDaysOrZero());
        return TripResponse.of(created);
    }


    @GetMapping("/{id}")
    TripResponse view(@CurrentTraveler Traveler traveler, @PathVariable UUID id) {
        Membership membership = guard.requireMember(traveler.id(), id);
        audience.requireInAudience(membership);
        var plan = itineraries.viewPlan(membership);
        return TripResponse.of(plan, forks.provenanceOf(id, traveler.id()).orElse(null));
    }


    @PatchMapping("/{id}")
    TripResponse update(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateTripRequest request) {
        Membership membership = guard.requireMember(traveler.id(), id);
        itineraries.editFields(membership, request::mergeOnto);
        var plan = itineraries.viewPlan(membership);
        return TripResponse.of(plan);
    }


    @PostMapping("/{id}/start")
    TripResponse start(@CurrentTraveler Traveler traveler, @PathVariable UUID id) {
        Membership membership = guard.requireMember(traveler.id(), id);
        itineraries.start(membership);
        var plan = itineraries.viewPlan(membership);
        return TripResponse.of(plan);
    }


    @PostMapping("/{id}/complete")
    TripResponse complete(@CurrentTraveler Traveler traveler, @PathVariable UUID id) {
        Membership membership = guard.requireMember(traveler.id(), id);
        itineraries.complete(membership);
        var plan = itineraries.viewPlan(membership);
        return TripResponse.of(plan);
    }


    @PostMapping("/{id}/reopen")
    TripResponse reopen(@CurrentTraveler Traveler traveler, @PathVariable UUID id) {
        Membership membership = guard.requireMember(traveler.id(), id);
        itineraries.reopen(membership);
        var plan = itineraries.viewPlan(membership);
        return TripResponse.of(plan);
    }


    @GetMapping
    Page<TripResponse> listMine(
            @CurrentTraveler Traveler traveler,
            @RequestParam(required = false) String cursor,
            @RequestParam(required = false) Integer limit,
            @RequestParam(defaultValue = "false") boolean archived,
            @RequestParam(required = false) String category) {
        Page<Trip> page =
                itineraries.listMine(
                        traveler.id(), cursor, limit, archived, TripCategory.parse(category).orElse(null));
        List<UUID> ids = page.items().stream().map(Trip::id).toList();
        Set<UUID> beingEdited = itineraries.beingEditedAmong(ids);
        Map<UUID, Long> dayCounts = itineraries.dayCountsAmong(ids);
        Set<UUID> owned = itineraries.ownedAmong(traveler.id(), ids);
        Map<UUID, Integer> memberCounts = itineraries.memberCountsAmong(ids);
        return page.map(itinerary ->
                TripResponse.summaryOf(
                        itinerary,
                        itineraries.stateOf(itinerary.id()),
                        beingEdited.contains(itinerary.id()),
                        dayCounts.getOrDefault(itinerary.id(), 0L).intValue(),
                        owned.contains(itinerary.id()) ? "owner" : "member",
                        memberCounts.getOrDefault(itinerary.id(), 1)));
    }


    @PostMapping("/{id}/archive")
    TripResponse archive(@CurrentTraveler Traveler traveler, @PathVariable UUID id) {
        Membership membership = guard.requireMember(traveler.id(), id);
        memberships.archive(membership);
        var plan = itineraries.viewPlan(membership);
        return TripResponse.of(plan);
    }


    @PostMapping("/{id}/unarchive")
    TripResponse unarchive(@CurrentTraveler Traveler traveler, @PathVariable UUID id) {
        Membership membership = guard.requireMember(traveler.id(), id);
        memberships.unarchive(membership);
        var plan = itineraries.viewPlan(membership);
        return TripResponse.of(plan);
    }
}
