package com.largata.join;


public final class JoinTokens {

    private static final int LOG_PREFIX = 4;

    private JoinTokens() {}


    public static String logPrefixOf(String token) {
        return token == null ? "" : token.substring(0, Math.min(LOG_PREFIX, token.length()));
    }
}
