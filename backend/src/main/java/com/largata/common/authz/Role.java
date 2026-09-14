package com.largata.common.authz;


public enum Role {
    OWNER,
    MEMBER;


    public String wireName() {
        return name().toLowerCase(java.util.Locale.ROOT);
    }
}
