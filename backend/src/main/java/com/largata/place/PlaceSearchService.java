package com.largata.place;

import com.largata.place.api.PlaceCandidate;
import com.largata.place.api.PlaceSuggester;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;


@Service
public class PlaceSearchService {

    static final int MIN_QUERY_LENGTH = 2;

    static final int REVERSE_SCALE = 4;

    private final PlaceSuggester suggester;

    private final SuggestionCache cache;

    private final SearchRateLimiter limiter;

    PlaceSearchService(PlaceSuggester suggester, SuggestionCache cache, SearchRateLimiter limiter) {
        this.suggester = suggester;
        this.cache = cache;
        this.limiter = limiter;
    }


    public List<PlaceCandidate> search(
            UUID travelerId, String query, BigDecimal biasLatitude, BigDecimal biasLongitude) {
        String asked = query == null ? "" : query.strip();
        if (asked.length() < MIN_QUERY_LENGTH) {
            return List.of();
        }

        List<PlaceCandidate> remembered = cache.get(asked, biasLatitude, biasLongitude);
        if (remembered != null) {
            return remembered;
        }

        limiter.admit(travelerId.toString());
        List<PlaceCandidate> found = suggester.suggest(asked, biasLatitude, biasLongitude);
        cache.put(asked, biasLatitude, biasLongitude, found);
        return found;
    }


    public PlaceCandidate nameFor(UUID travelerId, BigDecimal latitude, BigDecimal longitude) {
        if (latitude == null || longitude == null) {
            return null;
        }

        String at = latitude.setScale(REVERSE_SCALE, RoundingMode.HALF_UP)
                + ","
                + longitude.setScale(REVERSE_SCALE, RoundingMode.HALF_UP);

        List<PlaceCandidate> remembered = cache.get(at, null, null);
        if (remembered != null) {
            return remembered.isEmpty() ? null : remembered.get(0);
        }

        limiter.admit(travelerId.toString());
        PlaceCandidate found = suggester.nameFor(latitude, longitude);
        cache.put(at, null, null, found == null ? List.of() : List.of(found));
        return found;
    }
}
