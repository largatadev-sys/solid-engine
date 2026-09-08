package com.largata.trip.plan;

import com.largata.common.geo.Pin;
import java.math.BigDecimal;
import java.time.LocalTime;
import com.largata.trip.plan.ActivityFields;


public final class UnbookedActivity {

    public static ActivityFields fields(
            String title,
            LocalTime timeOfDay,
            BigDecimal costAmount,
            String costCurrency,
            String place,
            String description,
            String notes,
            String externalUrl) {
        return new ActivityFields(
                title, timeOfDay, costAmount, costCurrency, place, description, notes, externalUrl,
                null, null, null, null, null);
    }


    static ActivityFields pinned(String title, String place, Pin pin) {
        return new ActivityFields(
                title, null, null, null, place, null, null, null, null, null, null, null, pin);
    }

    private UnbookedActivity() {
    }
}
