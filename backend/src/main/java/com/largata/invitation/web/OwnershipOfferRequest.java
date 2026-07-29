package com.largata.invitation.web;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;


public record OwnershipOfferRequest(@NotNull(message = "travelerId is required") UUID travelerId) {}
