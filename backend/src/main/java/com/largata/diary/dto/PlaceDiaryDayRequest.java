package com.largata.diary.dto;

import com.largata.common.geo.PinPayload;
import jakarta.validation.Valid;

public record PlaceDiaryDayRequest(String place, @Valid PinPayload pin) {}
