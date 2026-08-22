package com.largata.join.web;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;


@Component
class CardUrls {

    private final String apiBaseUrl;
    private final String webBaseUrl;

    CardUrls(
            @Value("${largata.api.base-url:http://localhost:8080}") String apiBaseUrl,
            @Value("${largata.web.base-url:http://localhost:8081}") String webBaseUrl) {
        this.apiBaseUrl = trimTrailingSlash(apiBaseUrl);
        this.webBaseUrl = trimTrailingSlash(webBaseUrl);
    }


    String cardUrlFor(String token, long shareCardVersion) {
        return apiBaseUrl + "/v1/join/" + token + "/card.png?v=" + shareCardVersion;
    }


    String landingUrlFor(String token, long shareCardVersion) {
        return webBaseUrl + "/join/" + token + "?v=" + shareCardVersion;
    }


    private static String trimTrailingSlash(String url) {
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }
}
