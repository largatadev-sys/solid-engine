package com.largata.verification.api;

import jakarta.validation.constraints.NotBlank;


public record ConfirmCodeRequest(@NotBlank(message = "Enter the 6-digit code.") String code) {}
