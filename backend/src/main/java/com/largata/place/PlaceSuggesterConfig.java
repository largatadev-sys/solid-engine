package com.largata.place;

import com.largata.place.api.PlaceSuggester;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;


@Configuration
class PlaceSuggesterConfig {

    static final String NO_GEOCODER =
            "No place geocoder is configured. Set LARGATA_PHOTON_URL to a Photon endpoint, or set "
                    + "LARGATA_PLACE_FIXTURE_ALLOWED=true to accept the eight-place fixture — which is "
                    + "for tests and local runs, never for a rung a traveler can reach.";

    @Bean
    @ConditionalOnExpression(PhotonPlaceSuggester.ENDPOINT_CONFIGURED)
    PlaceSuggester photonPlaceSuggester(
            @Value("${largata.place.photon-url}") String photonUrl,
            @Value("${largata.place.photon-reverse-url}") String photonReverseUrl,
            @Value("${largata.place.user-agent}") String userAgent) {
        String reverseUrl =
                photonReverseUrl.isBlank()
                        ? PhotonPlaceSuggester.reverseBeside(photonUrl)
                        : photonReverseUrl;
        return new PhotonPlaceSuggester(
                PhotonPlaceSuggester.statedTransport(), photonUrl, reverseUrl, userAgent);
    }


    @Bean
    @ConditionalOnExpression(PhotonPlaceSuggester.ENDPOINT_UNCONFIGURED)
    PlaceSuggester fixturePlaceSuggester(
            @Value("${largata.place.fixture-allowed}") boolean fixtureAllowed) {
        if (!fixtureAllowed) {
            throw new IllegalStateException(NO_GEOCODER);
        }
        return new FixturePlaceSuggester();
    }
}
