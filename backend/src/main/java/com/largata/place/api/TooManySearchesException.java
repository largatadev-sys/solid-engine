package com.largata.place.api;

import com.largata.common.error.RateLimitedException;


public class TooManySearchesException extends RateLimitedException {

    public TooManySearchesException(String message) {
        super("TOO_MANY_SEARCHES", message);
    }
}
