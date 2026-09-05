package com.largata.place.api;

import com.largata.common.error.UnavailableException;


public class PlaceSearchUnavailableException extends UnavailableException {

    public PlaceSearchUnavailableException(String message, Throwable cause) {
        super("PLACE_SEARCH_UNAVAILABLE", message, cause);
    }
}
