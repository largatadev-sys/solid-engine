package com.largata.itinerary;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.largata.common.id.UuidV7;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;


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
    void startingADraftMakesItActiveAndStampsTheMoment() {
        Itinerary itinerary = draft("Hokkaido", List.of("Sapporo"));
        Instant at = Instant.parse("2027-01-10T09:00:00Z");

        itinerary.start(at);

        assertThat(itinerary.state()).isEqualTo(ItineraryState.ACTIVE);
        assertThat(itinerary.startedAt()).isEqualTo(at);
        assertThat(itinerary.completedAt()).isNull();
    }

    @Test
    void completingAnActiveTripStampsTheSecondMomentAndLeavesTheFirst() {
        Itinerary itinerary = draft("Hokkaido", List.of("Sapporo"));
        Instant started = Instant.parse("2027-01-10T09:00:00Z");
        Instant completed = Instant.parse("2027-01-20T18:00:00Z");

        itinerary.start(started);
        itinerary.complete(completed);

        assertThat(itinerary.state()).isEqualTo(ItineraryState.COMPLETED);
        assertThat(itinerary.startedAt()).isEqualTo(started);
        assertThat(itinerary.completedAt()).isEqualTo(completed);
    }

    @Test
    void theStampsRecordTheActNotTheTravelSoTheyMayFallOutsideThePlansDates() {
        Itinerary itinerary =
                Itinerary.draft(
                        owner,
                        "Hokkaido",
                        List.of("Sapporo"),
                        LocalDate.of(2027, 1, 10),
                        LocalDate.of(2027, 1, 20),
                        Instant.parse("2026-12-01T00:00:00Z"));

        itinerary.start(Instant.parse("2027-01-12T09:00:00Z"));
        itinerary.complete(Instant.parse("2027-01-27T09:00:00Z"));

        assertThat(itinerary.completedAt()).isAfter(Instant.parse("2027-01-20T23:59:59Z"));
        assertThat(itinerary.state()).isEqualTo(ItineraryState.COMPLETED);
    }

    @Test
    void everyIllegalEdgeIsRefusedAndChangesNothing() {
        Itinerary draftTrip = draft("Hokkaido", List.of("Sapporo"));
        assertThatThrownBy(() -> draftTrip.complete(Instant.now()))
                .isInstanceOf(IllegalStateTransitionException.class);
        assertThat(draftTrip.state()).isEqualTo(ItineraryState.DRAFT);
        assertThat(draftTrip.completedAt()).isNull();

        Itinerary activeTrip = draft("Hokkaido", List.of("Sapporo"));
        activeTrip.start(Instant.parse("2027-01-10T09:00:00Z"));
        assertThatThrownBy(() -> activeTrip.start(Instant.now()))
                .isInstanceOf(IllegalStateTransitionException.class);
        assertThat(activeTrip.startedAt()).isEqualTo(Instant.parse("2027-01-10T09:00:00Z"));

        Itinerary completedTrip = draft("Hokkaido", List.of("Sapporo"));
        completedTrip.start(Instant.parse("2027-01-10T09:00:00Z"));
        completedTrip.complete(Instant.parse("2027-01-20T18:00:00Z"));
        assertThatThrownBy(() -> completedTrip.start(Instant.now()))
                .isInstanceOf(IllegalStateTransitionException.class);
        assertThatThrownBy(() -> completedTrip.complete(Instant.now()))
                .isInstanceOf(IllegalStateTransitionException.class);
        assertThat(completedTrip.completedAt()).isEqualTo(Instant.parse("2027-01-20T18:00:00Z"));
    }

    @Test
    void theRefusalNamesBothEndsOfTheEdgeItRefused() {
        Itinerary itinerary = draft("Hokkaido", List.of("Sapporo"));

        assertThatThrownBy(() -> itinerary.complete(Instant.now()))
                .hasMessageContaining("draft")
                .hasMessageContaining("completed");
    }

    @Test
    void aTransitionDoesNotClaimAuthorshipOfAPlanEdit() {
        Itinerary itinerary = draft("Hokkaido", List.of("Sapporo"));

        itinerary.start(Instant.now());

        assertThat(itinerary.lastEditedBy()).isNull();
        assertThat(itinerary.lastEditedAt()).isNull();
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
        assertThatThrownBy(() -> draft("Somewhere", java.util.Arrays.asList("Sapporo", "  ")))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void everyCombinationOfDatesIsAPlan() {
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


    @Test
    void editingFieldsReplacesThemAndStampsTheEditor() {
        Itinerary itinerary = draft("Draft", List.of("Cebu"));
        UUID editor = UuidV7.generate();
        Instant editedAt = Instant.now();

        itinerary.editFields(
                "El Nido 2027",
                List.of("Palawan", "El Nido"),
                "Island hopping.",
                LocalDate.of(2027, 1, 10),
                LocalDate.of(2027, 1, 20),
                editor,
                editedAt);

        assertThat(itinerary.title()).isEqualTo("El Nido 2027");
        assertThat(itinerary.destinations()).containsExactly("Palawan", "El Nido");
        assertThat(itinerary.description()).isEqualTo("Island hopping.");
        assertThat(itinerary.startDate()).isEqualTo(LocalDate.of(2027, 1, 10));
        assertThat(itinerary.lastEditedBy()).isEqualTo(editor);
        assertThat(itinerary.lastEditedAt()).isEqualTo(editedAt);
    }

    @Test
    void editingLeavesOwnershipAndStateUntouched() {
        Itinerary itinerary = draft("Draft", List.of("Cebu"));

        itinerary.editFields("Renamed", List.of("Cebu"), null, null, null, UuidV7.generate(), Instant.now());

        assertThat(itinerary.ownerId()).isEqualTo(owner);
        assertThat(itinerary.state()).isEqualTo(ItineraryState.DRAFT);
        assertThat(itinerary.visibility()).isEqualTo(Visibility.PRIVATE);
    }

    @Test
    void editingEnforcesTheSameFieldRulesAsCreation() {
        Itinerary itinerary = draft("Draft", List.of("Cebu"));

        assertThatThrownBy(
                        () ->
                                itinerary.editFields(
                                        "   ", List.of("Cebu"), null, null, null, UuidV7.generate(), Instant.now()))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
                        () ->
                                itinerary.editFields(
                                        "Trip", List.of(), null, null, null, UuidV7.generate(), Instant.now()))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void publishingFlipsTheVisibilityFactAndUnpublishingFlipsItBack() {
        Itinerary itinerary = draft("Draft", List.of("Cebu"));

        itinerary.publish();
        assertThat(itinerary.visibility()).isEqualTo(Visibility.PUBLISHED);

        itinerary.unpublish();
        assertThat(itinerary.visibility()).isEqualTo(Visibility.PRIVATE);
    }

    @Test
    void publishingIsOrthogonalToTheLifecycleAndCanHappenFromAnyState() {
        Itinerary neverStarted = draft("Draft", List.of("Cebu"));
        neverStarted.publish();
        assertThat(neverStarted.state()).isEqualTo(ItineraryState.DRAFT);
        assertThat(neverStarted.visibility()).isEqualTo(Visibility.PUBLISHED);

        Itinerary travelled = draft("Draft", List.of("Cebu"));
        travelled.start(Instant.now());
        travelled.complete(Instant.now());
        travelled.publish();
        assertThat(travelled.state()).isEqualTo(ItineraryState.COMPLETED);
        assertThat(travelled.visibility()).isEqualTo(Visibility.PUBLISHED);
    }

    @Test
    void repeatingEitherVisibilityActIsANoOpRatherThanATransition() {
        Itinerary itinerary = draft("Draft", List.of("Cebu"));

        itinerary.unpublish();
        assertThat(itinerary.visibility()).isEqualTo(Visibility.PRIVATE);

        itinerary.publish();
        itinerary.publish();
        assertThat(itinerary.visibility()).isEqualTo(Visibility.PUBLISHED);
    }

    @Test
    void theVisibilityWireNamesAreTheOnesCanonNames() {
        assertThat(Visibility.PRIVATE.wireName()).isEqualTo("private");
        assertThat(Visibility.PUBLISHED.wireName()).isEqualTo("published");
    }

    private Itinerary draft(String title, List<String> destinations) {
        return Itinerary.draft(owner, title, destinations, null, null, Instant.now());
    }

    private Itinerary dated(LocalDate start, LocalDate end) {
        return Itinerary.draft(owner, "Trip", List.of("Sapporo"), start, end, Instant.now());
    }
}
