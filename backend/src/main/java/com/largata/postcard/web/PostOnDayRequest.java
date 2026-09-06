package com.largata.postcard.web;

import com.largata.common.geo.PinPayload;
import jakarta.validation.Valid;


public record PostOnDayRequest(String caption, String place, @Valid PinPayload pin) {}
