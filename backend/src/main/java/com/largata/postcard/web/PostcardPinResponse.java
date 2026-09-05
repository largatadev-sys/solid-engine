package com.largata.postcard.web;

import java.math.BigDecimal;


public record PostcardPinResponse(BigDecimal lat, BigDecimal lng, int zoom) {


    static PostcardPinResponse of(BigDecimal latitude, BigDecimal longitude, Short zoom) {
        if (latitude == null || longitude == null || zoom == null) {
            return null;
        }
        return new PostcardPinResponse(latitude, longitude, zoom);
    }
}
