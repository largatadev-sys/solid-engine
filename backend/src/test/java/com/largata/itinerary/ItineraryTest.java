package com.largata.itinerary;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.largata.common.id.UuidV7;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/**
 * The aggregate root's own rules (S0.3, ticket 01) — no Spring, no database.
 *
 * <p><strong>Why these duplicate the contract IT's validation cases.</strong> They do not, quite:
 * the IT proves the <em>API</em> answers 400: that is the DTO's Bean Validation doing its job. These
 * prove the <em>type</em> refuses, which is what protects callers that never touch a DTO — S4.7's
 * fork, a future import. Code review found `title ≤ 120` and blank-destination rejection stated in
 * the DTO and quietly missing here, with every IT still green: the API door was guarded and the
 * type was not. That is the gap this class exists to keep closed.
 */
class ItineraryTest {

    private final UUID owner = UuidV7.generate();

    @Test
    void aDraftIsBornPrivateAndUnpublished() {
        Itinerary itinerary = draft("Hokkaido", List.of("Sapporo"));

        assertThat(itinerary.state()).isEqualTo(ItineraryState.DRAFT);
        assertThat(itinerary.visibility()).isEqualTo(Visibility.PRIVATE);
        assertThat(itinerary.id()).isNotNull();
        assertThat(itinerary.ownerId()).isEqualTo(owner);
    }

    @Test
    void titleAndDestinationsAreStripped() {
        Itinerary itinerary = draft("  Hokkaido  ", List.of("  Sapporo  ", "Otaru"));

        assertThat(itinerary.title()).isEqualTo("Hokkaido");
        assertThat(itinerary.destinations()).containsExactly("Sapporo", "Otaru");
    }

    @Test
    void theDestinationsListIsNotAHandleIntoTheAggregate() {
        Itinerary itinerary = draft("Hokkaido", List.of("Sapporo"));

        assertThatThrownBy(() -> itinerary.destinations().add("Nagoya"))
                .isInstanceOf(UnsupportedOperationException.class);
    }

    @Test
    void aTitleIsRequired() {
        assertThatThrownBy(() -> draft("   ", List.of("Sapporo"))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> draft(null, List.of("Sapporo"))).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void aTitleHasALimitTheTypeEnforcesItself() {
        // The gap code review found: this rule lived only in the DTO, so any non-HTTP caller could
        // persist a 10 KB title into a bare TEXT column.
        assertThatThrownBy(() -> draft("x".repeat(Itinerary.MAX_TITLE_LENGTH + 1), List.of("Sapporo")))
                .isInstanceOf(IllegalArgumentException.class);

        assertThat(draft("x".repeat(Itinerary.MAX_TITLE_LENGTH), List.of("Sapporo")).title())
                .hasSize(Itinerary.MAX_TITLE_LENGTH);
    }

    @Test
    void atLeastOneDestinationIsRequired() {
        assertThatThrownBy(() -> draft("Nowhere", List.of())).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> draft("Nowhere", null)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void aBlankDestinationIsRejectedRatherThanQuietlyDropped() {
        // The other gap: the factory used to filter blanks out, so ["Sapporo", ""] was a 400 through
        // the API and silent data-loss through anything else. Two layers, one rule — or the rule is
        // whatever the weaker layer says.
        assertThatThrownBy(() -> draft("Somewhere", java.util.Arrays.asList("Sapporo", "  ")))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void everyCombinationOfDatesIsAPlan() {
        // Optional and independent (S0.3 spec): the dreamer's undated draft, "departing June 3,
        // open-ended", and "back by then" are all legitimate.
        assertThat(draft("Someday", List.of("Japan")).startDate()).isNull();
        assertThat(dated(LocalDate.of(2027, 6, 3), null).startDate()).isEqualTo(LocalDate.of(2027, 6, 3));
        assertThat(dated(null, LocalDate.of(2027, 6, 3)).endDate()).isEqualTo(LocalDate.of(2027, 6, 3));
        assertThat(dated(LocalDate.of(2027, 6, 3), LocalDate.of(2027, 6, 3))).isNotNull();
    }

    @Test
    void aTripCannotEndBeforeItStarts() {
        assertThatThrownBy(() -> dated(LocalDate.of(2027, 6, 10), LocalDate.of(2027, 6, 3)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    private Itinerary draft(String title, List<String> destinations) {
        return Itinerary.draft(owner, title, destinations, null, null, Instant.now());
    }

    private Itinerary dated(LocalDate start, LocalDate end) {
        return Itinerary.draft(owner, "Trip", List.of("Sapporo"), start, end, Instant.now());
    }
}
