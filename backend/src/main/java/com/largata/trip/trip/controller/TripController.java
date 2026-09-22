package com.largata.trip.trip.controller;

import static com.largata.trip.room.Door.Rule.EDITABLE;
import static com.largata.trip.room.Door.Rule.OPEN;

import com.largata.trip.room.CurrentMember;
import com.largata.trip.room.Door;
import com.largata.trip.room.Membership;
import com.largata.trip.room.ReachesClosedRoom;
import com.largata.trip.room.Owner;
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
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.multipart.MultipartFile;
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

    TripController(
            TripService itineraries,
            ForkService forks,
            TripCoverService covers,
            MembershipService memberships) {
        this.itineraries = itineraries;
        this.forks = forks;
        this.covers = covers;
        this.memberships = memberships;
    }


    @PostMapping("/{id}/cover")
    @Door(EDITABLE)
    TripResponse uploadCover(@CurrentMember Membership member, @RequestPart("photo") MultipartFile photo)
            throws IOException {
        covers.replaceCover(member, photo.getBytes());
        return TripResponse.of(itineraries.viewPlan(member));
    }


    @DeleteMapping("/{id}/cover")
    @Door(EDITABLE)
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void removeCover(@CurrentMember Membership member) {
        covers.removeCover(member);
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
    TripResponse view(@CurrentMember Membership member) {
        var plan = itineraries.viewPlan(member);
        return TripResponse.of(
                plan, forks.provenanceOf(member.itineraryId(), member.travelerId()).orElse(null));
    }


    @PatchMapping("/{id}")
    @Door(EDITABLE)
    TripResponse update(@CurrentMember Membership member, @Valid @RequestBody UpdateTripRequest request) {
        itineraries.editFields(
                Owner.of(member, NotTheTripOwnerException::toEditTheTripsDetails), request::mergeOnto);
        return TripResponse.of(itineraries.viewPlan(member));
    }


    @PostMapping("/{id}/start")
    @Door(EDITABLE)
    TripResponse start(@CurrentMember Membership member) {
        itineraries.start(theOwner(member));
        return TripResponse.of(itineraries.viewPlan(member));
    }


    @PostMapping("/{id}/complete")
    @Door(EDITABLE)
    TripResponse complete(@CurrentMember Membership member) {
        itineraries.complete(theOwner(member));
        return TripResponse.of(itineraries.viewPlan(member));
    }


    @PostMapping("/{id}/reopen")
    @Door(OPEN)
    TripResponse reopen(@CurrentMember Membership member) {
        itineraries.reopen(theOwner(member));
        return TripResponse.of(itineraries.viewPlan(member));
    }


    @PostMapping("/{id}/archive")
    @Door(OPEN)
    TripResponse archive(@CurrentMember Membership member) {
        memberships.archive(theOwnerChangingTheArchiveState(member));
        return TripResponse.of(itineraries.viewPlan(member));
    }


    @PostMapping("/{id}/unarchive")
    @Door(OPEN)
    @ReachesClosedRoom
    TripResponse unarchive(@CurrentMember Membership member) {
        memberships.unarchive(theOwnerChangingTheArchiveState(member));
        return TripResponse.of(itineraries.viewPlan(member));
    }


    private static Owner theOwner(Membership member) {
        return Owner.of(member, NotTheTripOwnerException::toStartOrCompleteTheTrip);
    }


    private static Owner theOwnerChangingTheArchiveState(Membership member) {
        return Owner.of(member, NotTheTripOwnerException::toChangeArchiveState);
    }
}
