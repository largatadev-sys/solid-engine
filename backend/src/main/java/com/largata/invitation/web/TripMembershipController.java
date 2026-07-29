package com.largata.invitation.web;

import com.largata.common.api.Page;
import com.largata.common.authz.AuthorizationGuard;
import com.largata.common.authz.Membership;
import com.largata.identity.Traveler;
import com.largata.identity.web.CurrentTraveler;
import com.largata.invitation.InvitationService;
import com.largata.membership.MembershipService;
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


@RestController
@RequestMapping("/v1/itineraries/{itineraryId}")
class TripMembershipController {

    private final InvitationService invitations;
    private final MembershipService memberships;
    private final AuthorizationGuard guard;

    TripMembershipController(
            InvitationService invitations, MembershipService memberships, AuthorizationGuard guard) {
        this.invitations = invitations;
        this.memberships = memberships;
        this.guard = guard;
    }

    @PostMapping("/invitations")
    @ResponseStatus(HttpStatus.CREATED)
    InvitationResponse invite(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID itineraryId,
            @Valid @RequestBody CreateInvitationRequest request) {
        Membership membership = guard.requireMember(traveler.id(), itineraryId);
        return InvitationResponse.of(invitations.invite(membership, request.email()));
    }

    @GetMapping("/invitations")
    Page<InvitationResponse> pendingInvitations(@CurrentTraveler Traveler traveler, @PathVariable UUID itineraryId) {
        Membership membership = guard.requireMember(traveler.id(), itineraryId);
        return Page.exhausted(invitations.pendingInvitations(membership).stream().map(InvitationResponse::of).toList());
    }


    @GetMapping("/members")
    Page<MemberResponse> members(@CurrentTraveler Traveler traveler, @PathVariable UUID itineraryId) {
        Membership membership = guard.requireMember(traveler.id(), itineraryId);
        UUID offeredTo = memberships.pendingOfferTargetIn(membership).orElse(null);
        return Page.exhausted(
                invitations.members(membership).stream()
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
        memberships.offerOwnership(membership, request.travelerId());
    }


    @DeleteMapping("/ownership-offer")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void revokeOwnershipOffer(@CurrentTraveler Traveler traveler, @PathVariable UUID itineraryId) {
        Membership membership = guard.requireMember(traveler.id(), itineraryId);
        memberships.revokeOwnershipOffer(membership);
    }


    @PostMapping("/ownership-offer/accept")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void acceptOwnershipOffer(@CurrentTraveler Traveler traveler, @PathVariable UUID itineraryId) {
        Membership membership = guard.requireMember(traveler.id(), itineraryId);
        memberships.acceptOwnershipOffer(membership);
    }


    @PostMapping("/ownership-offer/decline")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void declineOwnershipOffer(@CurrentTraveler Traveler traveler, @PathVariable UUID itineraryId) {
        Membership membership = guard.requireMember(traveler.id(), itineraryId);
        memberships.declineOwnershipOffer(membership);
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
