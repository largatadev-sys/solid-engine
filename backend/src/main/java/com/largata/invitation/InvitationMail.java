package com.largata.invitation;

import java.util.UUID;


public record InvitationMail(UUID invitationId, String recipientEmail, String tripTitle, String inviterName) {}
