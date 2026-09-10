package com.largata.invitation.service;

import java.util.UUID;


public record InvitationMail(UUID invitationId, String recipientEmail, String tripTitle, String inviterName) {}
