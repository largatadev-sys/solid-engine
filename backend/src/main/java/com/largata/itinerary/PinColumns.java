package com.largata.itinerary;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.math.BigDecimal;


@Embeddable
class PinColumns {

    @Column private BigDecimal latitude;

    @Column private BigDecimal longitude;

    @Column private Short zoom;

    protected PinColumns() {}

    private PinColumns(Pin pin) {
        this.latitude = pin == null ? null : pin.latitude();
        this.longitude = pin == null ? null : pin.longitude();
        this.zoom = pin == null ? null : (short) pin.zoom();
    }


    static PinColumns holding(Pin pin) {
        return new PinColumns(pin);
    }


    static Pin readFrom(PinColumns columns) {
        return columns == null ? null : Pin.readFrom(columns.latitude, columns.longitude, columns.zoom);
    }
}
