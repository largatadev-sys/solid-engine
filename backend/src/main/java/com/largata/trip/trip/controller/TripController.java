package com.largata.trip.trip.controller;

import static com.largata.trip.room.Door.Rule.OPEN;

import com.largata.trip.room.AuthorizationGuard;
import com.largata.trip.room.Door;
import com.largata.trip.room.Membership;
import com.largata.trip.room.ReachesClosedRoom;
import com.largata.trip.room.Owner;
import com.largata.trip.room.TripFence;
import com.largata.trip.exception.NotTheTripOwnerException;
import com.largata.identity.Traveler;
import com.largata.common.security.CurrentTraveler;
import com.largata.trip.trip.dto.CreateTripRequest;
import com.largata.trip.trip.dto.TripResponse;
import com.largata.trip.trip.dto.UpdateTripRequest;
import com.largata.trip.ownership.service.MembershipService;
import com.largata.trip.fork.ForkService;
import com.largata.trip.cover.TripCoverService;
import jakarta.validation.Valid;
import java.io.IOException;
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
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import com.largata.trip.trip.service.TripService;


@RestController
@RequestMapping("/v1/trips")
class TripController {

    private final TripService itineraries;
    private final ForkService forks;
    private final TripCoverService covers;
    private final MembershipService memberships;
    private final AuthorizationGuard guard;
    private final TripFence fence;

    TripController(
            TripService itineraries,
            ForkService forks,
            TripCoverService covers,
            MembershipService memberships,
            AuthorizationGuard guard,
            TripFence fence) {
        this.itineraries = itineraries;
        this.forks = forks;
        this.covers = covers;
        this.memberships = memberships;
        this.guard = guard;
        this.fence = fence;
    }


    @PostMapping("/{id}/cover")
    TripResponse uploadCover(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID id,
            @RequestPart("photo") MultipartFile photo)
            throws IOException {
        Membership membership = guard.requireMember(traveler.id(), id);
        covers.replaceCover(fence.editable(membership), photo.getBytes());
        return TripResponse.of(itineraries.viewPlan(membership));
    }


    @DeleteMapping("/{id}/cover")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void removeCover(@CurrentTraveler Traveler traveler, @PathVariable UUID id) {
        covers.removeCover(fence.editable(guard.requireMember(traveler.id(), id)));
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
        fence.inAudience(membership);
        var plan = itineraries.viewPlan(membership);
        return TripResponse.of(plan, forks.provenanceOf(id, traveler.id()).orElse(null));
    }


    @PatchMapping("/{id}")
    TripResponse update(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateTripRequest request) {
        Membership membership = guard.requireMember(traveler.id(), id);
        itineraries.editFields(
                fence.editable(fence.owner(membership, NotTheTripOwnerException::toEditTheTripsDetails)),
                request::mergeOnto);
        var plan = itineraries.viewPlan(membership);
        return TripResponse.of(plan);
    }


    @PostMapping("/{id}/start")
    TripResponse start(@CurrentTraveler Traveler traveler, @PathVariable UUID id) {
        Membership membership = guard.requireMember(traveler.id(), id);
        itineraries.start(fence.editable(theOwner(membership)));
        var plan = itineraries.viewPlan(membership);
        return TripResponse.of(plan);
    }


    @PostMapping("/{id}/complete")
    TripResponse complete(@CurrentTraveler Traveler traveler, @PathVariable UUID id) {
        Membership membership = guard.requireMember(traveler.id(), id);
        itineraries.complete(fence.editable(theOwner(membership)));
        var plan = itineraries.viewPlan(membership);
        return TripResponse.of(plan);
    }


    @PostMapping("/{id}/reopen")
    TripResponse reopen(@CurrentTraveler Traveler traveler, @PathVariable UUID id) {
        Membership membership = guard.requireMember(traveler.id(), id);
        itineraries.reopen(fence.writable(theOwner(membership)));
        var plan = itineraries.viewPlan(membership);
        return TripResponse.of(plan);
    }


    @PostMapping("/{id}/archive")
    TripResponse archive(@CurrentTraveler Traveler traveler, @PathVariable UUID id) {
        Membership membership = guard.requireMember(traveler.id(), id);
        memberships.archive(theOwnerChangingTheArchiveState(membership));
        var plan = itineraries.viewPlan(membership);
        return TripResponse.of(plan);
    }


    @PostMapping("/{id}/unarchive")
    @Door(OPEN)
    @ReachesClosedRoom
    TripResponse unarchive(@CurrentTraveler Traveler traveler, @PathVariable UUID id) {
        Membership membership = guard.requireMember(traveler.id(), id);
        memberships.unarchive(theOwnerChangingTheArchiveState(membership));
        var plan = itineraries.viewPlan(membership);
        return TripResponse.of(plan);
    }


    private Owner theOwner(Membership membership) {
        return fence.owner(membership, NotTheTripOwnerException::toStartOrCompleteTheTrip);
    }


    private Owner theOwnerChangingTheArchiveState(Membership membership) {
        return Owner.of(membership, NotTheTripOwnerException::toChangeArchiveState);
    }
}
