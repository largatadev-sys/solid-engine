package com.largata.trip.ownership.controller;

import com.largata.common.api.Page;
import com.largata.trip.api.Owner;
import com.largata.trip.api.TripFence;
import com.largata.trip.exception.NotTheTripOwnerException;
import com.largata.trip.api.AuthorizationGuard;
import com.largata.trip.api.Membership;
import com.largata.identity.Traveler;
import com.largata.common.security.CurrentTraveler;
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
    private final AuthorizationGuard guard;
    private final TripFence fence;

    TripMembershipController(
            MembershipService memberships,
            AuthorizationGuard guard,
            TripFence fence) {
        this.memberships = memberships;
        this.guard = guard;
        this.fence = fence;
    }


    @GetMapping("/members")
    Page<MemberResponse> members(@CurrentTraveler Traveler traveler, @PathVariable UUID itineraryId) {
        Membership membership = guard.requireMember(traveler.id(), itineraryId);
        fence.inAudience(membership);
        UUID offeredTo = memberships.pendingOfferTargetIn(membership).orElse(null);
        return Page.exhausted(
                memberships.members(membership).stream()
                        .map(m -> MemberResponse.of(m, m.travelerId().equals(offeredTo)))
                        .toList());
    }


    @PostMapping("/ownership-offer")
    @ResponseStatus(HttpStatus.CREATED)
    void offerOwnership(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID itineraryId,
            @Valid @RequestBody OwnershipOfferRequest request) {
        Membership membership = guard.requireMember(traveler.id(), itineraryId);
        memberships.offerOwnership(
                fence.membershipMutable(
                        fence.owner(membership, NotTheTripOwnerException::toOfferOwnership)),
                request.travelerId());
    }


    @DeleteMapping("/ownership-offer")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void revokeOwnershipOffer(@CurrentTraveler Traveler traveler, @PathVariable UUID itineraryId) {
        Membership membership = guard.requireMember(traveler.id(), itineraryId);
        memberships.revokeOwnershipOffer(
                fence.membershipMutable(
                        fence.owner(membership, NotTheTripOwnerException::toRevokeAnOffer)));
    }


    @PostMapping("/ownership-offer/accept")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void acceptOwnershipOffer(@CurrentTraveler Traveler traveler, @PathVariable UUID itineraryId) {
        Membership membership = guard.requireMember(traveler.id(), itineraryId);
        memberships.acceptOwnershipOffer(fence.membershipMutable(membership));
    }


    @PostMapping("/ownership-offer/decline")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void declineOwnershipOffer(@CurrentTraveler Traveler traveler, @PathVariable UUID itineraryId) {
        Membership membership = guard.requireMember(traveler.id(), itineraryId);
        memberships.declineOwnershipOffer(fence.membershipMutable(membership));
    }


    @DeleteMapping("/members/{travelerId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void endMembership(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID itineraryId,
            @PathVariable UUID travelerId) {
        Membership membership = guard.requireMember(traveler.id(), itineraryId);
        memberships.depart(membership, travelerId);
    }
}
