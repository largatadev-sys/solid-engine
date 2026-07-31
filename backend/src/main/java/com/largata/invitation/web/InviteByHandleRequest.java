package com.largata.invitation.web;

import com.largata.identity.Handle;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;


public record InviteByHandleRequest(
        @NotBlank(message = "A handle is required.")
                @Size(max = Handle.MAX_LENGTH, message = "That handle is too long.")
                String handle) {}
