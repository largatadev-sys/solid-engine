package com.largata.trip.ownership.controller;

import static com.largata.trip.room.Door.Rule.MEMBERSHIP_MUTABLE;
import static com.largata.trip.room.Door.Rule.OPEN;

import com.largata.common.api.Page;
import com.largata.trip.room.CurrentMember;
import com.largata.trip.room.Door;
import com.largata.trip.room.Membership;
import com.largata.trip.room.Owner;
import com.largata.trip.room.ReachesClosedRoom;
import com.largata.trip.exception.NotTheTripOwnerException;
import com.largata.trip.ownership.service.MembershipService;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import com.largata.trip.ownership.dto.MemberResponse;
import com.largata.trip.ownership.dto.OwnershipOfferRequest;


@RestController
@RequestMapping("/v1/trips/{itineraryId}")
class TripMembershipController {

    private final MembershipService memberships;

    TripMembershipController(MembershipService memberships) {
        this.memberships = memberships;
    }


    @GetMapping("/members")
    Page<MemberResponse> members(@CurrentMember Membership member) {
        UUID offeredTo = memberships.pendingOfferTargetIn(member).orElse(null);
        return Page.exhausted(
                memberships.members(member).stream()
                        .map(m -> MemberResponse.of(m, m.travelerId().equals(offeredTo)))
                        .toList());
    }


    @PostMapping("/ownership-offer")
    @Door(MEMBERSHIP_MUTABLE)
    @ResponseStatus(HttpStatus.CREATED)
    void offerOwnership(@CurrentMember Membership member, @Valid @RequestBody OwnershipOfferRequest request) {
        memberships.offerOwnership(
                Owner.of(member, NotTheTripOwnerException::toOfferOwnership), request.travelerId());
    }


    @DeleteMapping("/ownership-offer")
    @Door(MEMBERSHIP_MUTABLE)
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void revokeOwnershipOffer(@CurrentMember Membership member) {
        memberships.revokeOwnershipOffer(Owner.of(member, NotTheTripOwnerException::toRevokeAnOffer));
    }


    @PostMapping("/ownership-offer/accept")
    @Door(MEMBERSHIP_MUTABLE)
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void acceptOwnershipOffer(@CurrentMember Membership member) {
        memberships.acceptOwnershipOffer(member);
    }


    @PostMapping("/ownership-offer/decline")
    @Door(MEMBERSHIP_MUTABLE)
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void declineOwnershipOffer(@CurrentMember Membership member) {
        memberships.declineOwnershipOffer(member);
    }


    @DeleteMapping("/members/{travelerId}")
    @Door(OPEN)
    @ReachesClosedRoom
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void endMembership(@CurrentMember Membership member, @PathVariable UUID travelerId) {
        memberships.depart(member, travelerId);
    }
}
