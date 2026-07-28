package com.largata.membership;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Ownership-offer persistence. Package-private like every repository here (ADR-002) — the module's
 * one entry point is {@link MembershipService}.
 *
 * <p>Both finders filter on {@code PENDING} because a terminal offer is history: nothing in the
 * product reads a declined or voided row, and the two live questions are "does this workspace have an
 * outstretched hand?" (the owner's side, and the one-pending guard) and "is one held out to me?" (the
 * offeree's side, and the roster flag). V9's two partial indexes exist for exactly these.
 */
interface OwnershipOfferRepository extends JpaRepository<OwnershipOffer, UUID> {

    /**
     * The workspace's live offer, if it has one. At most one can exist — V9's partial unique index
     * makes that a database guarantee rather than a hope, so this returning {@code Optional} rather
     * than a list is a statement of the invariant, not an assumption about the data.
     */
    Optional<OwnershipOffer> findByWorkspaceIdAndStatus(UUID workspaceId, OwnershipOfferStatus status);

    /**
     * A live offer targeting one traveler in one workspace — the departure void's lookup (S1.6 §5).
     *
     * <p>Addressed by both ids rather than by target alone: a traveler can be a member of many trips
     * and leaving one must dissolve only that trip's offer. Scoping by workspace here is what keeps
     * the void surgical, the same way S1.5's {@code releaseHeldBy} releases one itinerary's lease
     * rather than every lease the departing traveler holds.
     */
    Optional<OwnershipOffer> findByWorkspaceIdAndTargetTravelerIdAndStatus(
            UUID workspaceId, UUID targetTravelerId, OwnershipOfferStatus status);
}
