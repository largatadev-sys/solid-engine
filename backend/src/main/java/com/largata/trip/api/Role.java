package com.largata.trip.api;


public enum Role {
    OWNER,
    MEMBER;


    public String wireName() {
        return name().toLowerCase(java.util.Locale.ROOT);
    }
}
