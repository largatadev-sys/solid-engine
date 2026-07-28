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

/**
 * The itinerary-addressed trip-membership surface: inviting into a trip, listing its pending
 * invitations, listing its members, and (S1.5) ending a membership. Workspace ids stay off the wire —
 * the app knows itinerary ids, the 1:1 makes one a handle for its workspace, and the guard already
 * resolves standing from an itinerary id (spec §API).
 *
 * <p>Transport only, like {@code ItineraryController}: the guard resolves a {@link Membership}, the
 * service does the rest (owner-role checks included — this class never inspects a role). The lists
 * wear Artifact 05's {@code {items, nextCursor}} envelope; they are bounded (a trip has a handful of
 * members and open invites), so they return whole with a null cursor rather than paginating — the
 * envelope is the contract, not the pagination.
 *
 * <p><strong>It fronts two modules, and that is deliberate</strong> (S1.5): joining is {@code
 * InvitationService}'s, ending is {@code MembershipService}'s (see that class for why departure earns
 * its own module). One controller because {@code /members} is one URL space, and splitting it would
 * leave a reader asking "what handles {@code /members}?" with two answers. A controller composing
 * services is transport doing its job; the module boundary that matters is below it.
 */
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

    /**
     * The trip's roster — and, since S1.6, whether anyone is holding an ownership offer.
     *
     * <p><strong>The offer flag is composed here rather than inside {@code InvitationService}</strong>,
     * and the reason is the module graph. {@code MemberSummary} is the invitation module's composition
     * (workspace row + identity name), but the offer lives in {@code membership}, which sits
     * <em>above</em> invitation's collaborators and depends on {@code itinerary}. Having invitation read
     * it would invert that. This class already fronts two modules by design (see the class javadoc); a
     * third read joined on traveler id is the same transport-layer composition, and it keeps both
     * modules unaware of each other. One extra query per roster read, on a bounded list.
     */
    @GetMapping("/members")
    Page<MemberResponse> members(@CurrentTraveler Traveler traveler, @PathVariable UUID itineraryId) {
        Membership membership = guard.requireMember(traveler.id(), itineraryId);
        UUID offeredTo = memberships.pendingOfferTargetIn(membership).orElse(null);
        return Page.exhausted(
                invitations.members(membership).stream()
                        .map(m -> MemberResponse.of(m, m.travelerId().equals(offeredTo)))
                        .toList());
    }

    /**
     * Offers ownership of this trip to a member (S1.6). Owner-only; the member accepts or declines.
     *
     * <p>201, because a pending offer is a created thing the client can now see on the roster — not 204:
     * the act has a result that outlives the request, unlike revoke/accept/decline which resolve one.
     */
    @PostMapping("/ownership-offer")
    @ResponseStatus(HttpStatus.CREATED)
    void offerOwnership(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID itineraryId,
            @Valid @RequestBody OwnershipOfferRequest request) {
        Membership membership = guard.requireMember(traveler.id(), itineraryId);
        memberships.offerOwnership(membership, request.travelerId());
    }

    /**
     * Retracts the trip's pending ownership offer (S1.6). Owner-only, idempotent: no pending offer is
     * still 204, because the asked-for end state already holds (Artifact 05).
     */
    @DeleteMapping("/ownership-offer")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void revokeOwnershipOffer(@CurrentTraveler Traveler traveler, @PathVariable UUID itineraryId) {
        Membership membership = guard.requireMember(traveler.id(), itineraryId);
        memberships.revokeOwnershipOffer(membership);
    }

    /**
     * Accepts the ownership offer made to the caller (S1.6) — the transfer executes in one transaction:
     * roles swap, the itinerary's owner syncs, the durable transfer record is written, the offer closes.
     *
     * <p>No request body, deliberately: the path names the trip and the guard names the caller, so
     * there is nothing left to send — and a body-less POST cannot trip the S1.5 trap where {@code @Valid}
     * validation answers 400 during argument resolution, before authorization is ever consulted.
     */
    @PostMapping("/ownership-offer/accept")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void acceptOwnershipOffer(@CurrentTraveler Traveler traveler, @PathVariable UUID itineraryId) {
        Membership membership = guard.requireMember(traveler.id(), itineraryId);
        memberships.acceptOwnershipOffer(membership);
    }

    /** Declines the ownership offer made to the caller (S1.6) — the crown stays where it is. */
    @PostMapping("/ownership-offer/decline")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void declineOwnershipOffer(@CurrentTraveler Traveler traveler, @PathVariable UUID itineraryId) {
        Membership membership = guard.requireMember(traveler.id(), itineraryId);
        memberships.declineOwnershipOffer(membership);
    }

    /**
     * Ends a membership — the owner removing a member, or a member leaving (S1.5). One endpoint, two
     * doors: which one is decided by whether {@code travelerId} is the caller's own, a fact the service
     * reads off the guard's {@link Membership} rather than a flag the client sends.
     *
     * <p><strong>204 always, on every path that is not a rejection</strong> (Artifact 05: deleting the
     * deleted is still 204) — including a target who was never a member. The rejections are the
     * service's to raise: 403 for a member reaching past their own row, 409 for the owner's own
     * (INV-4 — transfer first, S1.6), and the guard's 404 for anyone who is not on this trip at all.
     */
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
