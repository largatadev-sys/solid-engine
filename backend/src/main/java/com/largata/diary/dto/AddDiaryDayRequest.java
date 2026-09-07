package com.largata.diary.dto;

import com.largata.common.geo.PinPayload;
import jakarta.validation.Valid;
import java.time.LocalDate;

public record AddDiaryDayRequest(LocalDate date, String place, @Valid PinPayload pin) {}
