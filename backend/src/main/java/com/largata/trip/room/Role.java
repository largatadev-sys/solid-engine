package com.largata.trip.room;


public enum Role {
    OWNER,
    MEMBER;


    public String wireName() {
        return name().toLowerCase(java.util.Locale.ROOT);
    }
}
