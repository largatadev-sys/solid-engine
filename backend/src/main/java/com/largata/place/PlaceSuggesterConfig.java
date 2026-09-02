package com.largata.place;

import com.largata.place.api.PlaceSuggester;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;


@Configuration
class PlaceSuggesterConfig {

    @Bean
    @ConditionalOnExpression(PhotonPlaceSuggester.ENDPOINT_CONFIGURED)
    PlaceSuggester photonPlaceSuggester(
            @Value("${largata.place.photon-url}") String photonUrl,
            @Value("${largata.place.photon-reverse-url}") String photonReverseUrl,
            @Value("${largata.place.user-agent}") String userAgent) {
        return new PhotonPlaceSuggester(
                PhotonPlaceSuggester.statedTransport(), photonUrl, photonReverseUrl, userAgent);
    }


    @Bean
    @ConditionalOnExpression(PhotonPlaceSuggester.ENDPOINT_UNCONFIGURED)
    PlaceSuggester fixturePlaceSuggester() {
        return new FixturePlaceSuggester();
    }
}
