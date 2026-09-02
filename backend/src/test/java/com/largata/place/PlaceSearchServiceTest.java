package com.largata.place;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.largata.place.api.PlaceCandidate;
import com.largata.place.api.PlaceSearchUnavailableException;
import com.largata.place.api.PlaceSuggester;
import com.largata.place.api.TooManySearchesException;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;


class PlaceSearchServiceTest {

    private static final UUID ANA = UUID.randomUUID();

    private static final BigDecimal EL_NIDO_LAT = new BigDecimal("11.1949");

    private static final BigDecimal EL_NIDO_LNG = new BigDecimal("119.4013");

    private final MovableClock clock = new MovableClock(Instant.parse("2026-09-02T10:00:00Z"));

    @Test
    void aSearchReachesTheSuggesterAndComesBackRanked() {
        CountingSuggester upstream = new CountingSuggester();
        PlaceSearchService service = serviceWith(upstream);

        List<PlaceCandidate> found = service.search(ANA, "Big Lagoon", EL_NIDO_LAT, EL_NIDO_LNG);

        assertThat(found).extracting(PlaceCandidate::name).contains("Big Lagoon");
        assertThat(upstream.calls).isEqualTo(1);
    }


    @Test
    void aRepeatedSearchIsAnsweredFromTheCacheWithoutASecondUpstreamCall() {
        CountingSuggester upstream = new CountingSuggester();
        PlaceSearchService service = serviceWith(upstream);

        service.search(ANA, "Big Lagoon", EL_NIDO_LAT, EL_NIDO_LNG);
        List<PlaceCandidate> again = service.search(ANA, "big lagoon  ", EL_NIDO_LAT, EL_NIDO_LNG);

        assertThat(again).isNotEmpty();
        assertThat(upstream.calls)
                .as("the cache is what keeps a typeahead box inside what \"please be fair\" can mean")
                .isEqualTo(1);
    }


    @Test
    void aCachedAnswerExpires_soAProvidersCorrectionEventuallyLands() {
        CountingSuggester upstream = new CountingSuggester();
        PlaceSearchService service = serviceWith(upstream);

        service.search(ANA, "Big Lagoon", EL_NIDO_LAT, EL_NIDO_LNG);
        clock.advance(SuggestionCache.LIFETIME.plusMinutes(1));
        service.search(ANA, "Big Lagoon", EL_NIDO_LAT, EL_NIDO_LNG);

        assertThat(upstream.calls).isEqualTo(2);
    }


    @Test
    void aQueryTooShortToMeanAnythingNeverLeavesTheBuilding() {
        CountingSuggester upstream = new CountingSuggester();
        PlaceSearchService service = serviceWith(upstream);

        assertThat(service.search(ANA, "B", EL_NIDO_LAT, EL_NIDO_LNG)).isEmpty();
        assertThat(service.search(ANA, "  ", EL_NIDO_LAT, EL_NIDO_LNG)).isEmpty();
        assertThat(service.search(ANA, null, EL_NIDO_LAT, EL_NIDO_LNG)).isEmpty();
        assertThat(upstream.calls).isZero();
    }


    @Test
    void aTravelerSearchingFasterThanWeCanAskIsRefusedPolitely() {
        PlaceSearchService service = serviceWith(new CountingSuggester());

        for (int i = 0; i < SearchRateLimiter.PER_TRAVELER_PER_MINUTE; i++) {
            service.search(ANA, "Lagoon " + i, null, null);
        }

        assertThatThrownBy(() -> service.search(ANA, "One too many", null, null))
                .isInstanceOf(TooManySearchesException.class)
                .hasMessageContaining("Try again");
    }


    @Test
    void oneTravelersSpentAllowanceDoesNotRefuseAnother() {
        PlaceSearchService service = serviceWith(new CountingSuggester());
        UUID ben = UUID.randomUUID();

        for (int i = 0; i < SearchRateLimiter.PER_TRAVELER_PER_MINUTE; i++) {
            service.search(ANA, "Lagoon " + i, null, null);
        }

        assertThat(service.search(ben, "Big Lagoon", null, null)).isNotNull();
    }


    @Test
    void theAllowanceRefillsAsItsWindowPasses() {
        PlaceSearchService service = serviceWith(new CountingSuggester());

        for (int i = 0; i < SearchRateLimiter.PER_TRAVELER_PER_MINUTE; i++) {
            service.search(ANA, "Lagoon " + i, null, null);
        }
        clock.advance(Duration.ofMinutes(2));

        assertThat(service.search(ANA, "Big Lagoon", null, null)).isNotNull();
    }


    @Test
    void aCacheHitCostsNoAllowance_becauseItNeverReachesTheProvider() {
        PlaceSearchService service = serviceWith(new CountingSuggester());

        for (int i = 0; i < SearchRateLimiter.PER_TRAVELER_PER_MINUTE * 2; i++) {
            service.search(ANA, "Big Lagoon", EL_NIDO_LAT, EL_NIDO_LNG);
        }

        assertThat(service.search(ANA, "Big Lagoon", EL_NIDO_LAT, EL_NIDO_LNG)).isNotEmpty();
    }


    @Test
    void anUpstreamFailureSurfacesAsADefinedOutcomeTheClientCanRender() {
        PlaceSearchService service =
                serviceWith(
                        (query, lat, lng) -> {
                            throw new PlaceSearchUnavailableException("down", new RuntimeException());
                        });

        assertThatThrownBy(() -> service.search(ANA, "Big Lagoon", null, null))
                .as("search is an accelerator, never a dependency — the client renders this and keeps the map")
                .isInstanceOf(PlaceSearchUnavailableException.class);
    }


    @Test
    void theBiasReordersResultsTowardTheTripRatherThanFilteringThem() {
        PlaceSearchService service = serviceWith(new FixturePlaceSuggester());

        List<PlaceCandidate> nearElNido = service.search(ANA, "Beach", EL_NIDO_LAT, EL_NIDO_LNG);
        List<PlaceCandidate> nearHelsinki =
                service.search(ANA, "Beach", new BigDecimal("60.1689"), new BigDecimal("24.9317"));

        assertThat(nearElNido).extracting(PlaceCandidate::name).first().isEqualTo("Las Cabanas Beach");
        assertThat(nearHelsinki)
                .as("a bias reorders; it never removes a candidate the traveler asked for")
                .hasSameSizeAs(nearElNido);
        assertThat(nearHelsinki.get(0).name()).isNotEqualTo(nearElNido.get(0).name());
    }


    @Test
    void theFixtureSuggesterAnswersWithoutTouchingTheNetwork() {
        PlaceSearchService service = serviceWith(new FixturePlaceSuggester());

        assertThat(service.search(ANA, "Lagoon", null, null))
                .extracting(PlaceCandidate::name)
                .containsExactlyInAnyOrder("Big Lagoon", "Small Lagoon");
    }


    private PlaceSearchService serviceWith(PlaceSuggester suggester) {
        return new PlaceSearchService(suggester, new SuggestionCache(clock), new SearchRateLimiter(clock));
    }


    private static final class CountingSuggester implements PlaceSuggester {

        private int calls;

        @Override
        public List<PlaceCandidate> suggest(String query, BigDecimal lat, BigDecimal lng) {
            calls++;
            return List.of(
                    new PlaceCandidate("Big Lagoon", "El Nido, Palawan", EL_NIDO_LAT, EL_NIDO_LNG, "water"));
        }
    }


    private static final class MovableClock extends Clock {

        private Instant now;

        private MovableClock(Instant start) {
            this.now = start;
        }

        private void advance(Duration by) {
            now = now.plus(by);
        }

        @Override
        public Instant instant() {
            return now;
        }

        @Override
        public java.time.ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(java.time.ZoneId zone) {
            return this;
        }
    }
}
