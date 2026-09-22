package com.largata.invitation.controller;

import com.largata.common.api.Page;
import com.largata.trip.room.TripFence;
import com.largata.trip.room.AuthorizationGuard;
import com.largata.trip.room.Membership;
import com.largata.common.security.CurrentTraveler;
import com.largata.identity.Traveler;
import com.largata.invitation.dto.CreateInvitationRequest;
import com.largata.invitation.dto.InvitationResponse;
import com.largata.invitation.dto.InviteByHandleRequest;
import com.largata.invitation.service.InvitationService;
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

@RestController
@RequestMapping("/v1/trips/{itineraryId}")
class TripInvitationController {

    private final InvitationService invitations;
    private final AuthorizationGuard guard;
    private final TripFence fence;

    TripInvitationController(
            InvitationService invitations, AuthorizationGuard guard, TripFence fence) {
        this.invitations = invitations;
        this.guard = guard;
        this.fence = fence;
    }

    @PostMapping("/invitations")
    @ResponseStatus(HttpStatus.CREATED)
    InvitationResponse invite(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID itineraryId,
            @Valid @RequestBody CreateInvitationRequest request) {
        Membership membership = guard.requireMember(traveler.id(), itineraryId);
        return InvitationResponse.of(
                invitations.invite(fence.membershipMutable(membership), request.email()));
    }

    @PostMapping("/invitations/by-handle")
    @ResponseStatus(HttpStatus.CREATED)
    InvitationResponse inviteByHandle(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID itineraryId,
            @Valid @RequestBody InviteByHandleRequest request) {
        Membership membership = guard.requireMember(traveler.id(), itineraryId);
        return InvitationResponse.of(
                invitations.inviteByHandle(fence.membershipMutable(membership), request.handle()));
    }

    @GetMapping("/invitations")
    Page<InvitationResponse> pendingInvitations(@CurrentTraveler Traveler traveler, @PathVariable UUID itineraryId) {
        Membership membership = guard.requireMember(traveler.id(), itineraryId);
        fence.inAudience(membership);
        return Page.exhausted(invitations.pendingInvitations(membership).stream().map(InvitationResponse::of).toList());
    }
}
