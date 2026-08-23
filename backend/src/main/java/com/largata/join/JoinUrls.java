package com.largata.join;


public final class JoinUrls {

    private static final String VERSION_PARAM = "v";

    public static final String APP_HANDOFF_PARAM = "app";

    private static final String APP_HANDOFF_VALUE = "1";

    private JoinUrls() {}


    public static String landingUrl(String webBaseUrl, String token, long shareCardVersion) {
        return withoutTrailingSlash(webBaseUrl) + "/join/" + token + versionQuery(shareCardVersion);
    }


    public static String appHandoffUrl(String webBaseUrl, String token, long shareCardVersion) {
        return landingUrl(webBaseUrl, token, shareCardVersion)
                + "&"
                + APP_HANDOFF_PARAM
                + "="
                + APP_HANDOFF_VALUE;
    }


    public static String cardUrl(String apiBaseUrl, String token, long shareCardVersion) {
        return withoutTrailingSlash(apiBaseUrl)
                + "/v1/join/"
                + token
                + "/card.png"
                + versionQuery(shareCardVersion);
    }


    private static String versionQuery(long shareCardVersion) {
        return "?" + VERSION_PARAM + "=" + shareCardVersion;
    }


    private static String withoutTrailingSlash(String url) {
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }
}
