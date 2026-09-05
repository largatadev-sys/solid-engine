package com.largata.identity;

import java.util.Locale;


public enum ViewerRelation {
    NONE,
    REQUESTED,
    FOLLOWING;


    public String wireName() {
        return name().toLowerCase(Locale.ROOT);
    }
}
