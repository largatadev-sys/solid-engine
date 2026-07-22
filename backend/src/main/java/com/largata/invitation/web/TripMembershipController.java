package com.largata.invitation.web;

import com.largata.common.api.Page;
import com.largata.common.authz.AuthorizationGuard;
import com.largata.common.authz.Membership;
import com.largata.identity.Traveler;
import com.largata.identity.web.CurrentTraveler;
import com.largata.invitation.InvitationService;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * The itinerary-addressed half of the S1.2 surface: inviting into a trip, listing its pending
 * invitations, and listing its members. Workspace ids stay off the wire — the app knows itinerary
 * ids, the 1:1 makes one a handle for its workspace, and the guard already resolves standing from an
 * itinerary id (spec §API).
 *
 * <p>Transport only, like {@code ItineraryController}: the guard resolves a {@link Membership}, the
 * service does the rest (owner-role checks included — this class never inspects a role). The lists
 * wear Artifact 05's {@code {items, nextCursor}} envelope; they are bounded (a trip has a handful of
 * members and open invites), so they return whole with a null cursor rather than paginating — the
 * envelope is the contract, not the pagination.
 */
@RestController
@RequestMapping("/v1/itineraries/{itineraryId}")
class TripMembershipController {

    private final InvitationService invitations;
    private final AuthorizationGuard guard;

    TripMembershipController(InvitationService invitations, AuthorizationGuard guard) {
        this.invitations = invitations;
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
        return Page.exhausted(invitations.members(membership).stream().map(MemberResponse::of).toList());
    }
}
