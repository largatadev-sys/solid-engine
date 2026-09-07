package com.largata.postcard.dto;

import com.largata.common.geo.PinPayload;
import jakarta.validation.Valid;

public record PlacePostcardRequest(String place, @Valid PinPayload pin) {}
