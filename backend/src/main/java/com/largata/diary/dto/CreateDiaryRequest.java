package com.largata.diary.dto;

import com.largata.common.geo.PinPayload;
import jakarta.validation.Valid;
import java.time.LocalDate;

public record CreateDiaryRequest(
        String title,
        String destination,
        @Valid PinPayload pin,
        LocalDate startDate,
        LocalDate endDate) {}
