package com.largata.trip.api;

import com.largata.common.geo.Pin;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public interface TripCreationApi {

    UUID createFrom(PlanBlueprint blueprint, UUID ownerId);


    record PlanBlueprint(
            String title,
            String destination,
            String currency,
            String description,
            List<String> standouts,
            String bestTimeOfYear,
            Pin pin,
            List<BlueprintDay> days) {}


    record BlueprintDay(int ordinal, String title, List<BlueprintActivity> activities) {}


    record BlueprintActivity(
            int sortOrder,
            String title,
            String timeOfDay,
            BigDecimal costAmount,
            String costCurrency,
            String place,
            Pin pin,
            String description,
            String notes,
            String externalUrl,
            String bookingPurpose,
            String bookingProvider,
            BigDecimal bookingPriceAmount,
            String bookingPriceCurrency) {}
}
