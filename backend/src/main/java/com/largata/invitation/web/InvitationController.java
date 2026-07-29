package com.largata.invitation.web;

import com.largata.common.api.Page;
import com.largata.identity.Traveler;
import com.largata.identity.web.AuthEmail;
import com.largata.identity.web.CurrentTraveler;
import com.largata.identity.web.VerifiedContact;
import com.largata.invitation.InvitationService;
import java.util.UUID;
import org.springframework.http.HttpStatus;
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

    InvitationController(InvitationService invitations) {
        this.invitations = invitations;
    }


    @GetMapping
    Page<InboxInvitationResponse> inbox(@AuthEmail VerifiedContact contact) {
        return Page.exhausted(invitations.inbox(contact).stream().map(InboxInvitationResponse::of).toList());
    }

    @PostMapping("/{invitationId}/accept")
    AcceptResponse accept(
            @CurrentTraveler Traveler traveler, @AuthEmail VerifiedContact contact, @PathVariable UUID invitationId) {
        return new AcceptResponse(invitations.accept(invitationId, contact, traveler.id()));
    }

    @PostMapping("/{invitationId}/decline")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void decline(@AuthEmail VerifiedContact contact, @PathVariable UUID invitationId) {
        invitations.decline(invitationId, contact);
    }

    @PostMapping("/{invitationId}/revoke")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void revoke(@CurrentTraveler Traveler traveler, @PathVariable UUID invitationId) {
        invitations.revoke(invitationId, traveler.id());
    }
}
