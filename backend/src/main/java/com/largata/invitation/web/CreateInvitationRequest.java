package com.largata.invitation.web;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;


public record CreateInvitationRequest(@NotBlank @Email String email) {}
