package com.largata.place;

import com.largata.place.api.PlaceCandidate;
import com.largata.place.api.PlaceSearchUnavailableException;
import com.largata.place.api.PlaceSuggester;
import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.util.UriComponentsBuilder;
import tools.jackson.databind.JsonNode;


class PhotonPlaceSuggester implements PlaceSuggester {

    static final String ENDPOINT_CONFIGURED = "'${largata.place.photon-url:}' != ''";

    static final String ENDPOINT_UNCONFIGURED = "'${largata.place.photon-url:}' == ''";

    static final int MAX_RESULTS = 8;

    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(3);

    private static final Duration READ_TIMEOUT = Duration.ofSeconds(5);

    private final RestClient http;

    private final String endpoint;

    private final String userAgent;

    PhotonPlaceSuggester(RestClient.Builder builder, String endpoint, String userAgent) {
        this.http = builder.build();
        this.endpoint = endpoint;
        this.userAgent = userAgent;
    }


    static RestClient.Builder statedTransport() {
        JdkClientHttpRequestFactory factory =
                new JdkClientHttpRequestFactory(HttpClient.newBuilder().connectTimeout(CONNECT_TIMEOUT).build());
        factory.setReadTimeout(READ_TIMEOUT);
        return RestClient.builder().requestFactory(factory);
    }


    @Override
    public List<PlaceCandidate> suggest(String query, BigDecimal biasLatitude, BigDecimal biasLongitude) {
        UriComponentsBuilder url =
                UriComponentsBuilder.fromUriString(endpoint)
                        .queryParam("q", query)
                        .queryParam("limit", MAX_RESULTS);
        if (biasLatitude != null && biasLongitude != null) {
            url.queryParam("lat", biasLatitude).queryParam("lon", biasLongitude);
        }

        try {
            JsonNode answer =
                    http.get()
                            .uri(url.build().toUri())
                            .header("User-Agent", userAgent)
                            .retrieve()
                            .body(JsonNode.class);
            return candidatesIn(answer);
        } catch (RestClientException unreachable) {
            throw new PlaceSearchUnavailableException("The place search service did not answer", unreachable);
        }
    }


    @Override
    public PlaceCandidate nameFor(BigDecimal latitude, BigDecimal longitude) {
        URI url =
                UriComponentsBuilder.fromUriString(endpoint.replace("/api", "/reverse"))
                        .queryParam("lat", latitude)
                        .queryParam("lon", longitude)
                        .queryParam("limit", 1)
                        .build()
                        .toUri();

        try {
            JsonNode answer =
                    http.get().uri(url).header("User-Agent", userAgent).retrieve().body(JsonNode.class);
            List<PlaceCandidate> found = candidatesIn(answer);
            return found.isEmpty() ? null : found.get(0);
        } catch (RestClientException unreachable) {
            throw new PlaceSearchUnavailableException("The place search service did not answer", unreachable);
        }
    }


    private static List<PlaceCandidate> candidatesIn(JsonNode answer) {
        List<PlaceCandidate> candidates = new ArrayList<>();
        if (answer == null) {
            return candidates;
        }

        for (JsonNode feature : answer.path("features")) {
            JsonNode coordinates = feature.path("geometry").path("coordinates");
            JsonNode properties = feature.path("properties");
            String name = properties.path("name").asString(null);

            if (name == null || coordinates.size() < 2) {
                continue;
            }
            candidates.add(
                    new PlaceCandidate(
                            name,
                            contextOf(properties),
                            BigDecimal.valueOf(coordinates.get(1).asDouble()),
                            BigDecimal.valueOf(coordinates.get(0).asDouble()),
                            properties.path("osm_value").asString(null)));
        }
        return candidates;
    }


    private static String contextOf(JsonNode properties) {
        List<String> parts = new ArrayList<>();
        for (String field : new String[] {"city", "state", "country"}) {
            String value = properties.path(field).asString(null);
            if (value != null && !value.isBlank() && !parts.contains(value)) {
                parts.add(value);
            }
        }
        return String.join(", ", parts);
    }
}
