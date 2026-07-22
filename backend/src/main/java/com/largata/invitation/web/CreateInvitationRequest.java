package com.largata.invitation.web;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * The body of {@code POST /v1/itineraries/{id}/invitations} (S1.2): the address to invite.
 *
 * <p>Validated at the boundary so a blank or malformed address is a clean 400, not an exception
 * deeper in. The service still normalises (trim + lowercase) — validation says "this is an email",
 * normalisation says "in the one canonical form the index and the match agree on".
 */
public record CreateInvitationRequest(@NotBlank @Email String email) {}
