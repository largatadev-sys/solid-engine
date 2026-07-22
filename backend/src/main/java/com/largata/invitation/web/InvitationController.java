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

/**
 * The invitation-addressed half of the S1.2 surface: the invitee's inbox, and the accept / decline /
 * revoke transitions (S1.2).
 *
 * <p><strong>Not guarded by the itinerary guard</strong> — these paths carry an invitation id, not an
 * itinerary id, so there is no itinerary for the guard to resolve standing against. Authority is the
 * verified-email match ({@link AuthEmail} → {@link VerifiedContact}) for inbox/accept/decline, and —
 * for revoke — the guard run one layer deeper inside the service, off the invitation's own itinerary.
 *
 * <p>Transitions are POST verbs, not DELETE: the rows survive terminal (grilling Q3), and keeping
 * accept/decline/revoke one grammatical family beats REST purity for a client branching on codes.
 */
@RestController
@RequestMapping("/v1/invitations")
class InvitationController {

    private final InvitationService invitations;

    InvitationController(InvitationService invitations) {
        this.invitations = invitations;
    }

    /** The inbox: pending, unexpired invitations addressed to the caller's verified email. */
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
