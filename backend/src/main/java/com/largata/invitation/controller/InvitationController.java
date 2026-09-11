package com.largata.invitation.controller;

import com.largata.common.api.Page;
import com.largata.common.security.AuthEmail;
import com.largata.common.security.CurrentTraveler;
import com.largata.common.security.VerifiedContact;
import com.largata.identity.Traveler;
import com.largata.invitation.dto.AcceptResponse;
import com.largata.invitation.dto.InboxInvitationResponse;
import com.largata.invitation.service.InvitationService;
import com.largata.media.web.PhotoBytes;
import java.util.UUID;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/invitations")
class InvitationController {

    private final InvitationService invitations;
    private final PhotoBytes covers;

    InvitationController(InvitationService invitations, PhotoBytes covers) {
        this.invitations = invitations;
        this.covers = covers;
    }


    @GetMapping
    Page<InboxInvitationResponse> inbox(@CurrentTraveler Traveler traveler, @AuthEmail VerifiedContact contact) {
        return Page.exhausted(
                invitations.inbox(contact, traveler.id()).stream().map(InboxInvitationResponse::of).toList());
    }


    @GetMapping("/{invitationId}/cover")
    ResponseEntity<InputStreamResource> cover(
            @CurrentTraveler Traveler traveler,
            @AuthEmail VerifiedContact contact,
            @PathVariable UUID invitationId) {
        return covers.thumbnailOfItinerary(
                invitations.itineraryOfInvitationTo(invitationId, contact, traveler.id()));
    }

    @PostMapping("/{invitationId}/accept")
    AcceptResponse accept(
            @CurrentTraveler Traveler traveler, @AuthEmail VerifiedContact contact, @PathVariable UUID invitationId) {
        return new AcceptResponse(invitations.accept(invitationId, contact, traveler.id()));
    }

    @PostMapping("/{invitationId}/decline")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void decline(
            @CurrentTraveler Traveler traveler,
            @AuthEmail VerifiedContact contact,
            @PathVariable UUID invitationId) {
        invitations.decline(invitationId, contact, traveler.id());
    }

    @PostMapping("/{invitationId}/revoke")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void revoke(@CurrentTraveler Traveler traveler, @PathVariable UUID invitationId) {
        invitations.revoke(invitationId, traveler.id());
    }
}
