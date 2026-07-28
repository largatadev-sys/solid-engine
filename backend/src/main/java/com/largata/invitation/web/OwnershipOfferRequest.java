package com.largata.invitation.web;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

/**
 * The body of an ownership offer (S1.6): who is being offered the crown.
 *
 * <p>A traveler id, not an email — the target is already a member of this trip (an offer re-ranks
 * somebody inside the walls; it never admits anyone), and the client holds their id from the roster it
 * just rendered. Contrast {@link CreateInvitationRequest}, which takes an email precisely because its
 * subject may not have an account yet.
 */
public record OwnershipOfferRequest(@NotNull(message = "travelerId is required") UUID travelerId) {}
