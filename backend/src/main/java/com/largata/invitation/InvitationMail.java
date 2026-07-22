package com.largata.invitation;

import java.util.UUID;

/**
 * One invitation email, in the domain's terms (S1.2) — the argument to {@link InvitationMailer}.
 *
 * <p><strong>The cross-module display strings are resolved before this exists</strong> (the trip
 * title from the itinerary module, the inviter's name from identity), so the mailer and the workspace
 * side of the module never reach across a boundary to render a message. The pure-notification content
 * (grilling Q6): "〈inviter〉 invited you to 〈trip〉 on Largata" — no token, no link carrying a secret.
 *
 * @param invitationId the row's id — the ONLY field any log line may name (P3); the address, title
 *     and inviter name are PII/user content and never reach a log
 * @param recipientEmail where it goes (used by the transport, never logged)
 * @param tripTitle the trip's human name, so the invitee recognises which one
 * @param inviterName who invited them
 */
public record InvitationMail(UUID invitationId, String recipientEmail, String tripTitle, String inviterName) {}
