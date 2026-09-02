package com.largata.place;

import com.largata.place.api.PlaceCandidate;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.stereotype.Component;


@Component
class SuggestionCache {

    static final int CAPACITY = 500;

    static final Duration LIFETIME = Duration.ofHours(24);

    private final Clock clock;

    private final Map<String, Remembered> entries;

    SuggestionCache(Clock clock) {
        this.clock = clock;
        this.entries = new LinkedHashMap<>(16, 0.75f, true) {
            @Override
            protected boolean removeEldestEntry(Map.Entry<String, Remembered> eldest) {
                return size() > CAPACITY;
            }
        };
    }


    synchronized List<PlaceCandidate> get(String query, BigDecimal biasLat, BigDecimal biasLng) {
        Remembered found = entries.get(keyFor(query, biasLat, biasLng));
        if (found == null || found.expiresAt().isBefore(Instant.now(clock))) {
            return null;
        }
        return found.candidates();
    }


    synchronized void put(String query, BigDecimal biasLat, BigDecimal biasLng, List<PlaceCandidate> candidates) {
        entries.put(
                keyFor(query, biasLat, biasLng),
                new Remembered(List.copyOf(candidates), Instant.now(clock).plus(LIFETIME)));
    }


    private static String keyFor(String query, BigDecimal biasLat, BigDecimal biasLng) {
        return query.strip().toLowerCase(Locale.ROOT) + "|" + rounded(biasLat) + "|" + rounded(biasLng);
    }


    private static String rounded(BigDecimal bias) {
        return bias == null ? "" : bias.setScale(1, java.math.RoundingMode.HALF_UP).toPlainString();
    }


    private record Remembered(List<PlaceCandidate> candidates, Instant expiresAt) {
    }
}
