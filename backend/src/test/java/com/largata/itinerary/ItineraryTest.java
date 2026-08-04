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
    void anItineraryIsBornADraft() {
        Itinerary itinerary = draft("Hokkaido", List.of("Sapporo"));

        assertThat(itinerary.state()).isEqualTo(ItineraryState.DRAFT);
        assertThat(itinerary.isPublished()).as("nothing is born in the feed").isFalse();
        assertThat(itinerary.visibility())
                .as("public is the default audience — it decides who reads it once it is published")
                .isEqualTo(Visibility.PUBLIC);
        assertThat(itinerary.id()).isNotNull();
        assertThat(itinerary.ownerId()).isEqualTo(owner);
    }


    @Test
    void finishingPlanningMovesADraftToUpcomingAndStampsNothing() {
        Itinerary itinerary = draft("Hokkaido", List.of("Sapporo"));

        itinerary.finishPlanning();

        assertThat(itinerary.state()).isEqualTo(ItineraryState.UPCOMING);
        assertThat(itinerary.startedAt())
                .as("planning finished is not travel started — only the acts that happen to the trip stamp")
                .isNull();
        assertThat(itinerary.completedAt()).isNull();
    }

    @Test
    void startingAnUpcomingTripMakesItOngoingAndStampsTheMoment() {
        Itinerary itinerary = draft("Hokkaido", List.of("Sapporo"));
        Instant at = Instant.parse("2027-01-10T09:00:00Z");

        itinerary.finishPlanning();
        itinerary.start(at);

        assertThat(itinerary.state()).isEqualTo(ItineraryState.ONGOING);
        assertThat(itinerary.startedAt()).isEqualTo(at);
        assertThat(itinerary.completedAt()).isNull();
    }

    @Test
    void aDraftCannotJumpStraightToTravelling() {
        Itinerary itinerary = draft("Hokkaido", List.of("Sapporo"));

        assertThatThrownBy(() -> itinerary.start(Instant.now()))
                .as("draft → ongoing skips the planning-finished rung; jumps are refused")
                .isInstanceOf(IllegalStateTransitionException.class);
    }

    @Test
    void completingAnOngoingTripStampsTheSecondMomentAndLeavesTheFirst() {
        Itinerary itinerary = draft("Hokkaido", List.of("Sapporo"));
        Instant started = Instant.parse("2027-01-10T09:00:00Z");
        Instant completed = Instant.parse("2027-01-20T18:00:00Z");

        itinerary.finishPlanning();
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

        itinerary.finishPlanning();
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

        Itinerary ongoingTrip = draft("Hokkaido", List.of("Sapporo"));
        ongoingTrip.finishPlanning();
        ongoingTrip.start(Instant.parse("2027-01-10T09:00:00Z"));
        assertThatThrownBy(() -> ongoingTrip.start(Instant.now()))
                .isInstanceOf(IllegalStateTransitionException.class);
        assertThat(ongoingTrip.startedAt()).isEqualTo(Instant.parse("2027-01-10T09:00:00Z"));

        Itinerary completedTrip = draft("Hokkaido", List.of("Sapporo"));
        completedTrip.finishPlanning();
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

        itinerary.finishPlanning();
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
                new ItineraryFields(
                        "El Nido 2027",
                        List.of("Palawan", "El Nido"),
                        "Island hopping.",
                        List.of("Big Lagoon Kayaking"),
                        "Dec – Apr",
                        LocalDate.of(2027, 1, 10),
                        LocalDate.of(2027, 1, 20)),
                editor,
                editedAt);

        assertThat(itinerary.title()).isEqualTo("El Nido 2027");
        assertThat(itinerary.destinations()).containsExactly("Palawan", "El Nido");
        assertThat(itinerary.description()).isEqualTo("Island hopping.");
        assertThat(itinerary.standouts()).containsExactly("Big Lagoon Kayaking");
        assertThat(itinerary.bestTimeOfYear()).isEqualTo("Dec – Apr");
        assertThat(itinerary.startDate()).isEqualTo(LocalDate.of(2027, 1, 10));
        assertThat(itinerary.lastEditedBy()).isEqualTo(editor);
        assertThat(itinerary.lastEditedAt()).isEqualTo(editedAt);
    }

    @Test
    void aDraftIsBornWithNoPublishMetadataAtAll() {
        Itinerary itinerary = draft("Draft", List.of("Cebu"));

        assertThat(itinerary.standouts()).isEmpty();
        assertThat(itinerary.bestTimeOfYear()).isNull();
        assertThat(itinerary.coverImageUrl()).as("no writer exists until S3.3 activates upload").isNull();
    }

    @Test
    void editingLeavesOwnershipAndStateUntouched() {
        Itinerary itinerary = draft("Draft", List.of("Cebu"));

        itinerary.editFields(renamedTo("Renamed"), UuidV7.generate(), Instant.now());

        assertThat(itinerary.ownerId()).isEqualTo(owner);
        assertThat(itinerary.state()).isEqualTo(ItineraryState.DRAFT);
        assertThat(itinerary.isPublished()).isFalse();
    }

    @Test
    void editingEnforcesTheSameFieldRulesAsCreation() {
        assertThatThrownBy(() -> renamedTo("   ")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
                        () ->
                                new ItineraryFields(
                                        "Trip", List.of(), null, List.of(), null, null, null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void anEditThatOmitsThePublishMetadataLeavesItAloneRatherThanErasingIt() {
        Itinerary itinerary = draft("Draft", List.of("Cebu"));
        itinerary.editFields(
                new ItineraryFields("Trip", List.of("Cebu"), null, List.of("Kayaking"), "Dec – Apr", null, null),
                UuidV7.generate(),
                Instant.now());

        itinerary.editFields(
                new ItineraryFields("Renamed by an older client", List.of("Cebu"), null, null, null, null, null),
                UuidV7.generate(),
                Instant.now());

        assertThat(itinerary.title()).isEqualTo("Renamed by an older client");
        assertThat(itinerary.standouts())
                .as("a client that cannot send standouts must not be able to destroy them — ADR-008")
                .containsExactly("Kayaking");
        assertThat(itinerary.bestTimeOfYear()).isEqualTo("Dec – Apr");
    }

    @Test
    void anEmptyValueClearsThePublishMetadataBecauseAbsenceAlreadyMeansSomethingElse() {
        Itinerary itinerary = draft("Draft", List.of("Cebu"));
        itinerary.editFields(
                new ItineraryFields("Trip", List.of("Cebu"), null, List.of("Kayaking"), "Dec – Apr", null, null),
                UuidV7.generate(),
                Instant.now());

        itinerary.editFields(
                new ItineraryFields("Trip", List.of("Cebu"), null, List.of(), "", null, null),
                UuidV7.generate(),
                Instant.now());

        assertThat(itinerary.standouts()).isEmpty();
        assertThat(itinerary.bestTimeOfYear()).isNull();
    }

    @Test
    void theShippedFieldsKeepTheirReplaceSemanticsBecauseChangingThoseWouldBeTheAdditivityBreak() {
        Itinerary itinerary = draft("Draft", List.of("Cebu"));
        itinerary.editFields(
                new ItineraryFields("Trip", List.of("Cebu"), "A description.", null, null, null, null),
                UuidV7.generate(),
                Instant.now());

        itinerary.editFields(renamedTo("Trip"), UuidV7.generate(), Instant.now());

        assertThat(itinerary.description())
                .as("description shipped as replace-or-null at S0.3; the new fields differ on purpose")
                .isNull();
    }

    @Test
    void aStandoutListIsBoundedInBothLengthAndCount() {
        assertThatThrownBy(() -> withStandouts(List.of("x".repeat(Itinerary.MAX_STANDOUT_LENGTH + 1))))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
                        () ->
                                withStandouts(
                                        java.util.stream.IntStream.rangeClosed(0, Itinerary.MAX_STANDOUTS)
                                                .mapToObj(String::valueOf)
                                                .toList()))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void aBlankStandoutRowIsDroppedRatherThanStoredAsAnEmptySellingPoint() {
        assertThat(withStandouts(java.util.Arrays.asList("  Kayaking  ", "", "   ", null)).standouts())
                .containsExactly("Kayaking");
    }

    private static ItineraryFields renamedTo(String title) {
        return new ItineraryFields(title, List.of("Cebu"), null, List.of(), null, null, null);
    }

    private static ItineraryFields withStandouts(List<String> standouts) {
        return new ItineraryFields("Trip", List.of("Cebu"), null, standouts, null, null, null);
    }

    @Test
    void publishingSetsTheAudienceAndUnpublishingLeavesTheLifecycleWhereItWas() {
        Itinerary itinerary = completed();

        itinerary.publishTo(Visibility.PUBLIC);
        assertThat(itinerary.isPublished()).isTrue();
        assertThat(itinerary.visibility()).isEqualTo(Visibility.PUBLIC);

        itinerary.unpublish();
        assertThat(itinerary.isPublished()).isFalse();
        assertThat(itinerary.visibility())
                .as("unpublishing withdraws from the feed; it says nothing about the audience")
                .isEqualTo(Visibility.PUBLIC);
        assertThat(itinerary.state())
                .as("…and it leaves the trip completed, because the trip still happened")
                .isEqualTo(ItineraryState.COMPLETED);
    }

    @Test
    void onlyACompletedTripCanBePublished() {
        Itinerary neverStarted = draft("Draft", List.of("Cebu"));
        assertThatThrownBy(() -> neverStarted.publishTo(Visibility.PUBLIC))
                .as("a plan nobody has travelled is not a record of anything")
                .isInstanceOf(NotCompleteException.class);

        Itinerary planned = draft("Draft", List.of("Cebu"));
        planned.finishPlanning();
        assertThatThrownBy(() -> planned.publishTo(Visibility.PUBLIC))
                .as("planning finished is not the trip happening — the gate is about travel, not readiness")
                .isInstanceOf(NotCompleteException.class);

        Itinerary travelling = draft("Draft", List.of("Cebu"));
        travelling.finishPlanning();
        travelling.start(Instant.now());
        assertThatThrownBy(() -> travelling.publishTo(Visibility.PUBLIC))
                .isInstanceOf(NotCompleteException.class);

        Itinerary travelled = completed();
        travelled.publishTo(Visibility.PUBLIC);
        assertThat(travelled.isPublished()).isTrue();
    }

    @Test
    void theAudienceMovesWhilePublishedWithoutLeavingTheFeed() {
        Itinerary itinerary = completed();
        itinerary.publishTo(Visibility.PUBLIC);

        itinerary.showTo(Visibility.PRIVATE);

        assertThat(itinerary.visibility()).isEqualTo(Visibility.PRIVATE);
        assertThat(itinerary.isPublished())
                .as("visibility and discovery are independent — narrowing the audience is not a withdrawal")
                .isTrue();
    }

    @Test
    void theAudienceIsSettableBeforePublishing_becauseItIsNotAPublicationFact() {
        Itinerary itinerary = draft("Draft", List.of("Cebu"));

        itinerary.showTo(Visibility.PRIVATE);

        assertThat(itinerary.visibility()).isEqualTo(Visibility.PRIVATE);
        assertThat(itinerary.isPublished()).isFalse();
    }

    @Test
    void aPublishedTripPinsItsLifecycle_soUnpublishIsTheOnlyWayToMoveIt() {
        Itinerary itinerary = completed();
        itinerary.publishTo(Visibility.PUBLIC);

        assertThatThrownBy(itinerary::reopen)
                .as("published means nothing about this trip changes — the lifecycle included")
                .isInstanceOf(IllegalStateTransitionException.class);

        itinerary.unpublish();
        itinerary.reopen();

        assertThat(itinerary.state()).isEqualTo(ItineraryState.ONGOING);
    }

    @Test
    void reopenStepsBackExactlyOneStateAndClearsTheStampItUndoes() {
        Itinerary itinerary = completed();

        itinerary.reopen();
        assertThat(itinerary.state()).isEqualTo(ItineraryState.ONGOING);
        assertThat(itinerary.completedAt()).as("the trip did not finish after all").isNull();
        assertThat(itinerary.startedAt()).as("…but it did start").isNotNull();

        itinerary.reopen();
        assertThat(itinerary.state()).isEqualTo(ItineraryState.UPCOMING);
        assertThat(itinerary.startedAt()).as("it never set off after all").isNull();

        itinerary.reopen();
        assertThat(itinerary.state())
                .as("the last rung down is reopening planning itself")
                .isEqualTo(ItineraryState.DRAFT);
    }

    @Test
    void aDraftHasNothingToStepBackTo() {
        Itinerary itinerary = draft("Draft", List.of("Cebu"));

        assertThatThrownBy(itinerary::reopen).isInstanceOf(IllegalStateTransitionException.class);
    }

    @Test
    void repeatingEitherActIsANoOpRatherThanATransition() {
        Itinerary itinerary = completed();

        itinerary.unpublish();
        assertThat(itinerary.isPublished()).isFalse();

        itinerary.publishTo(Visibility.PUBLIC);
        itinerary.publishTo(Visibility.PUBLIC);
        assertThat(itinerary.isPublished()).isTrue();
    }

    @Test
    void theWireNamesAreTheOnesCanonNames() {
        assertThat(Visibility.PUBLIC.wireName()).isEqualTo("public");
        assertThat(Visibility.PRIVATE.wireName()).isEqualTo("private");

        assertThat(ItineraryState.DRAFT.wireName()).isEqualTo("draft");
        assertThat(ItineraryState.UPCOMING.wireName()).isEqualTo("upcoming");
        assertThat(ItineraryState.ONGOING.wireName()).isEqualTo("ongoing");
        assertThat(ItineraryState.COMPLETED.wireName()).isEqualTo("completed");
    }

    @Test
    void onlyCompletedAdmitsPublishing() {
        assertThat(ItineraryState.DRAFT.admitsPublishing()).isFalse();
        assertThat(ItineraryState.UPCOMING.admitsPublishing()).isFalse();
        assertThat(ItineraryState.ONGOING.admitsPublishing()).isFalse();
        assertThat(ItineraryState.COMPLETED.admitsPublishing()).isTrue();
    }

    @Test
    void onlyPublicIsVisibleToEveryone() {
        assertThat(Visibility.PUBLIC.isVisibleToEveryone()).isTrue();
        assertThat(Visibility.PRIVATE.isVisibleToEveryone()).isFalse();
    }

    @Test
    void publishingDefaultsToPublicAndRefusesAnAudienceThatIsNotOne() {
        assertThat(Visibility.audience(null)).isEqualTo(Visibility.PUBLIC);
        assertThat(Visibility.audience("  ")).isEqualTo(Visibility.PUBLIC);
        assertThat(Visibility.audience("PRIVATE")).isEqualTo(Visibility.PRIVATE);

        assertThatThrownBy(() -> Visibility.audience("draft"))
                .as("draft is a lifecycle state, never an audience — the axes do not share a vocabulary")
                .isInstanceOf(UnknownAudienceException.class);
    }

    private Itinerary draft(String title, List<String> destinations) {
        return Itinerary.draft(owner, title, destinations, null, null, Instant.now());
    }

    private Itinerary completed() {
        Itinerary itinerary = draft("Draft", List.of("Cebu"));
        itinerary.finishPlanning();
        itinerary.start(Instant.now());
        itinerary.complete(Instant.now());
        return itinerary;
    }

    private Itinerary dated(LocalDate start, LocalDate end) {
        return Itinerary.draft(owner, "Trip", List.of("Sapporo"), start, end, Instant.now());
    }
}
