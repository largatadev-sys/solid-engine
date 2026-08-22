package com.largata.join.web;

import com.largata.join.JoinUrls;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;


@Component
class CardUrls {

    private final String apiBaseUrl;
    private final String webBaseUrl;

    CardUrls(
            @Value("${largata.api.base-url:http://localhost:8080}") String apiBaseUrl,
            @Value("${largata.web.base-url:http://localhost:8081}") String webBaseUrl) {
        this.apiBaseUrl = apiBaseUrl;
        this.webBaseUrl = webBaseUrl;
    }


    String cardUrlFor(String token, long shareCardVersion) {
        return JoinUrls.cardUrl(apiBaseUrl, token, shareCardVersion);
    }


    String landingUrlFor(String token, long shareCardVersion) {
        return JoinUrls.landingUrl(webBaseUrl, token, shareCardVersion);
    }
}
