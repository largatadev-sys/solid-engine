package com.largata.invitation.web;

import com.largata.common.api.Page;
import com.largata.common.authz.AudienceFence;
import com.largata.common.authz.AuthorizationGuard;
import com.largata.common.authz.Membership;
import com.largata.identity.Traveler;
import com.largata.common.security.CurrentTraveler;
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


@RestController
@RequestMapping({"/v1/itineraries/{itineraryId}", "/v1/trips/{itineraryId}"})
class TripInvitationController {

    private final InvitationService invitations;
    private final AuthorizationGuard guard;
    private final AudienceFence audience;

    TripInvitationController(
            InvitationService invitations, AuthorizationGuard guard, AudienceFence audience) {
        this.invitations = invitations;
        this.guard = guard;
        this.audience = audience;
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

    @PostMapping("/invitations/by-handle")
    @ResponseStatus(HttpStatus.CREATED)
    InvitationResponse inviteByHandle(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID itineraryId,
            @Valid @RequestBody InviteByHandleRequest request) {
        Membership membership = guard.requireMember(traveler.id(), itineraryId);
        return InvitationResponse.of(invitations.inviteByHandle(membership, request.handle()));
    }

    @GetMapping("/invitations")
    Page<InvitationResponse> pendingInvitations(@CurrentTraveler Traveler traveler, @PathVariable UUID itineraryId) {
        Membership membership = guard.requireMember(traveler.id(), itineraryId);
        audience.requireInAudience(membership);
        return Page.exhausted(invitations.pendingInvitations(membership).stream().map(InvitationResponse::of).toList());
    }
}
