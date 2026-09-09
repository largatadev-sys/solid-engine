package com.largata.itinerary.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.largata.common.geo.PinPayload;
import com.largata.identity.api.TravelerCardResponse;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import tools.jackson.databind.JsonNode;


public record ItineraryPageResponse(
        UUID id,
        UUID tripId,
        String publishedAt,
        String title,
        String destination,
        PinPayload pin,
        String description,
        List<String> standouts,
        String bestTimeOfYear,
        String coverImageUrl,
        int durationDays,
        TravelerCardResponse creator,
        EstimatedCostResponse estimatedCost,
        List<PageDayResponse> days,
        long forkCount,
        ForkedFromResponse forkedFrom,
        JsonNode plan) {


    public record ForkedFromResponse(UUID sourceTripId, String ownerHandle, boolean sourceVisible) {}


    public record EstimatedCostResponse(
            @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal amount,
            String currency,
            boolean partial) {}


    public record PageDayResponse(int ordinal, String title, List<PageActivityResponse> activities) {}


    public record PageActivityResponse(
            int sortOrder,
            String title,
            String timeOfDay,
            @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal costAmount,
            String costCurrency,
            String place,
            PinPayload pin,
            String description,
            String notes,
            String externalUrl,
            String bookingPurpose,
            String bookingProvider,
            @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal bookingPriceAmount,
            String bookingPriceCurrency,
            List<PagePhotoResponse> photos) {}


    public record PagePhotoResponse(UUID id, String url, String thumbUrl) {}
}
