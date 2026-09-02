package com.largata.itinerary.api;

import com.largata.itinerary.Pin;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;


public record PinPayload(
        @NotNull(message = "A pin needs a latitude.")
                @DecimalMin(value = "-90", message = "A latitude is between -90 and 90.")
                @DecimalMax(value = "90", message = "A latitude is between -90 and 90.")
                BigDecimal lat,
        @NotNull(message = "A pin needs a longitude.")
                @DecimalMin(value = "-180", message = "A longitude is between -180 and 180.")
                @DecimalMax(value = "180", message = "A longitude is between -180 and 180.")
                BigDecimal lng,
        @NotNull(message = "A pin needs the zoom it was dropped at.")
                @Min(value = Pin.MIN_ZOOM, message = "A zoom is between 2 and 19.")
                @Max(value = Pin.MAX_ZOOM, message = "A zoom is between 2 and 19.")
                Integer zoom) {


    public static Pin toPin(PinPayload payload) {
        return payload == null ? null : new Pin(payload.lat(), payload.lng(), payload.zoom());
    }


    public static PinPayload of(Pin pin) {
        return pin == null ? null : new PinPayload(pin.latitude(), pin.longitude(), pin.zoom());
    }
}
