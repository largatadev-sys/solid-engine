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
    void anItineraryIsBornUpcomingAndStampsNothing() {
        Itinerary itinerary = newTrip("Hokkaido", "Sapporo");

        assertThat(itinerary.state())
                .as("S4.26 — a trip is upcoming from the moment it is created; there is no rung before it")
                .isEqualTo(ItineraryState.UPCOMING);
        assertThat(itinerary.startedAt())
                .as("being planned is not travel started — only the acts that happen to the trip stamp")
                .isNull();
        assertThat(itinerary.completedAt()).isNull();
        assertThat(itinerary.isPublished()).as("nothing is born in the feed").isFalse();
        assertThat(itinerary.visibility())
                .as("public is the default audience — it decides who reads it once it is published")
                .isEqualTo(Visibility.PUBLIC);
        assertThat(itinerary.id()).isNotNull();
        assertThat(itinerary.ownerId()).isEqualTo(owner);
    }


    @Test
    void aForkIsBornUpcomingToo() {
        Itinerary source = completed();

        Itinerary fork = Itinerary.forkedFrom(source, UuidV7.generate(), Instant.now());

        assertThat(fork.state())
                .as("a fork copies the plan, never the travel — it starts where every new trip starts")
                .isEqualTo(ItineraryState.UPCOMING);
        assertThat(fork.startedAt()).isNull();
        assertThat(fork.completedAt()).isNull();
    }

    @Test
    void startingAnUpcomingTripMakesItOngoingAndStampsTheMoment() {
        Itinerary itinerary = newTrip("Hokkaido", "Sapporo");
        Instant at = Instant.parse("2027-01-10T09:00:00Z");

        itinerary.start(at);

        assertThat(itinerary.state()).isEqualTo(ItineraryState.ONGOING);
        assertThat(itinerary.startedAt()).isEqualTo(at);
        assertThat(itinerary.completedAt()).isNull();
    }

    @Test
    void anUpcomingTripCannotJumpStraightToTravelled() {
        Itinerary itinerary = newTrip("Hokkaido", "Sapporo");

        assertThatThrownBy(() -> itinerary.complete(Instant.now()))
                .as("upcoming → completed skips the travelling rung; jumps are refused")
                .isInstanceOf(IllegalStateTransitionException.class);
    }

    @Test
    void completingAnOngoingTripStampsTheSecondMomentAndLeavesTheFirst() {
        Itinerary itinerary = newTrip("Hokkaido", "Sapporo");
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
                Itinerary.newTrip(
                        owner,
                        "Hokkaido",
                        "Sapporo",
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
        Itinerary upcomingTrip = newTrip("Hokkaido", "Sapporo");
        assertThatThrownBy(() -> upcomingTrip.complete(Instant.now()))
                .isInstanceOf(IllegalStateTransitionException.class);
        assertThat(upcomingTrip.state()).isEqualTo(ItineraryState.UPCOMING);
        assertThat(upcomingTrip.completedAt()).isNull();

        Itinerary ongoingTrip = newTrip("Hokkaido", "Sapporo");

        ongoingTrip.start(Instant.parse("2027-01-10T09:00:00Z"));
        assertThatThrownBy(() -> ongoingTrip.start(Instant.now()))
                .isInstanceOf(IllegalStateTransitionException.class);
        assertThat(ongoingTrip.startedAt()).isEqualTo(Instant.parse("2027-01-10T09:00:00Z"));

        Itinerary completedTrip = newTrip("Hokkaido", "Sapporo");

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
        Itinerary itinerary = newTrip("Hokkaido", "Sapporo");

        assertThatThrownBy(() -> itinerary.complete(Instant.now()))
                .hasMessageContaining("upcoming")
                .hasMessageContaining("completed");
    }

    @Test
    void aTransitionDoesNotClaimAuthorshipOfAPlanEdit() {
        Itinerary itinerary = newTrip("Hokkaido", "Sapporo");

        itinerary.start(Instant.now());

        assertThat(itinerary.lastEditedBy()).isNull();
        assertThat(itinerary.lastEditedAt()).isNull();
    }

    @Test
    void titleAndDestinationAreStripped() {
        Itinerary itinerary = newTrip("  Hokkaido  ", "  Sapporo  ");

        assertThat(itinerary.title()).isEqualTo("Hokkaido");
        assertThat(itinerary.destination()).isEqualTo("Sapporo");
    }

    @Test
    void aTitleIsRequired() {
        assertThatThrownBy(() -> newTrip("   ", "Sapporo")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> newTrip(null, "Sapporo")).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void aTitleHasALimitTheTypeEnforcesItself() {
        assertThatThrownBy(() -> newTrip("x".repeat(Itinerary.MAX_TITLE_LENGTH + 1), "Sapporo"))
                .isInstanceOf(IllegalArgumentException.class);

        assertThat(newTrip("x".repeat(Itinerary.MAX_TITLE_LENGTH), "Sapporo").title())
                .hasSize(Itinerary.MAX_TITLE_LENGTH);
    }

    @Test
    void aDestinationIsRequired() {
        assertThatThrownBy(() -> newTrip("Nowhere", null)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void aBlankDestinationIsRejectedRatherThanQuietlyDropped() {
        assertThatThrownBy(() -> newTrip("Somewhere", "  ")).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void aDestinationHasALimitTheTypeEnforcesItself() {
        assertThatThrownBy(() -> newTrip("Somewhere", "x".repeat(Itinerary.MAX_DESTINATION_LENGTH + 1)))
                .isInstanceOf(IllegalArgumentException.class);

        assertThat(newTrip("Somewhere", "x".repeat(Itinerary.MAX_DESTINATION_LENGTH)).destination())
                .hasSize(Itinerary.MAX_DESTINATION_LENGTH);
    }

    @Test
    void everyCombinationOfDatesIsAPlan() {
        assertThat(newTrip("Someday", "Japan").startDate()).isNull();
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
        Itinerary itinerary = newTrip("Planned", "Cebu");
        UUID editor = UuidV7.generate();
        Instant editedAt = Instant.now();

        itinerary.editFields(
                new ItineraryFields(
                        "El Nido 2027",
                        "Palawan",
                        "PHP",
                        "Island hopping.",
                        List.of("Big Lagoon Kayaking"),
                        "Dec – Apr",
                        LocalDate.of(2027, 1, 10),
                        LocalDate.of(2027, 1, 20)),
                editor,
                editedAt);

        assertThat(itinerary.title()).isEqualTo("El Nido 2027");
        assertThat(itinerary.destination()).isEqualTo("Palawan");
        assertThat(itinerary.description()).isEqualTo("Island hopping.");
        assertThat(itinerary.standouts()).containsExactly("Big Lagoon Kayaking");
        assertThat(itinerary.bestTimeOfYear()).isEqualTo("Dec – Apr");
        assertThat(itinerary.startDate()).isEqualTo(LocalDate.of(2027, 1, 10));
        assertThat(itinerary.lastEditedBy()).isEqualTo(editor);
        assertThat(itinerary.lastEditedAt()).isEqualTo(editedAt);
    }

    @Test
    void aDraftIsBornWithNoPublishMetadataAtAll() {
        Itinerary itinerary = newTrip("Planned", "Cebu");

        assertThat(itinerary.standouts()).isEmpty();
        assertThat(itinerary.bestTimeOfYear()).isNull();
        assertThat(itinerary.coverImageUrl()).as("no writer exists until S3.3 activates upload").isNull();
    }

    @Test
    void editingLeavesOwnershipAndStateUntouched() {
        Itinerary itinerary = newTrip("Planned", "Cebu");

        itinerary.editFields(renamedTo("Renamed"), UuidV7.generate(), Instant.now());

        assertThat(itinerary.ownerId()).isEqualTo(owner);
        assertThat(itinerary.state()).isEqualTo(ItineraryState.UPCOMING);
        assertThat(itinerary.isPublished()).isFalse();
    }

    @Test
    void editingEnforcesTheSameFieldRulesAsCreation() {
        assertThatThrownBy(() -> renamedTo("   ")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
                        () ->
                                new ItineraryFields(
                                        "Trip", "  ", "PHP", null, List.of(), null, null, null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void anEditThatOmitsThePublishMetadataLeavesItAloneRatherThanErasingIt() {
        Itinerary itinerary = newTrip("Planned", "Cebu");
        itinerary.editFields(
                new ItineraryFields("Trip", "Cebu", "PHP", null, List.of("Kayaking"), "Dec – Apr", null, null),
                UuidV7.generate(),
                Instant.now());

        itinerary.editFields(
                new ItineraryFields("Renamed by an older client", "Cebu", "PHP", null, null, null, null, null),
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
        Itinerary itinerary = newTrip("Planned", "Cebu");
        itinerary.editFields(
                new ItineraryFields("Trip", "Cebu", "PHP", null, List.of("Kayaking"), "Dec – Apr", null, null),
                UuidV7.generate(),
                Instant.now());

        itinerary.editFields(
                new ItineraryFields("Trip", "Cebu", "PHP", null, List.of(), "", null, null),
                UuidV7.generate(),
                Instant.now());

        assertThat(itinerary.standouts()).isEmpty();
        assertThat(itinerary.bestTimeOfYear()).isNull();
    }

    @Test
    void theShippedFieldsKeepTheirReplaceSemanticsBecauseChangingThoseWouldBeTheAdditivityBreak() {
        Itinerary itinerary = newTrip("Planned", "Cebu");
        itinerary.editFields(
                new ItineraryFields("Trip", "Cebu", "PHP", "A description.", null, null, null, null),
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
        return new ItineraryFields(title, "Cebu", "PHP", null, List.of(), null, null, null);
    }

    private static ItineraryFields withStandouts(List<String> standouts) {
        return new ItineraryFields("Trip", "Cebu", "PHP", null, standouts, null, null, null);
    }

    @Test
    void publishingSetsTheAudienceAndUnpublishingLeavesTheLifecycleWhereItWas() {
        Itinerary itinerary = completed();

        itinerary.publishTo(Visibility.PUBLIC, Instant.now());
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
        Itinerary neverStarted = newTrip("Planned", "Cebu");
        assertThatThrownBy(() -> neverStarted.publishTo(Visibility.PUBLIC, Instant.now()))
                .as("a plan nobody has travelled is not a record of anything")
                .isInstanceOf(NotCompleteException.class);

        Itinerary travelling = newTrip("Planned", "Cebu");
        travelling.start(Instant.now());
        assertThatThrownBy(() -> travelling.publishTo(Visibility.PUBLIC, Instant.now()))
                .isInstanceOf(NotCompleteException.class);

        Itinerary travelled = completed();
        travelled.publishTo(Visibility.PUBLIC, Instant.now());
        assertThat(travelled.isPublished()).isTrue();
    }

    @Test
    void theAudienceMovesWhilePublishedWithoutLeavingTheFeed() {
        Itinerary itinerary = completed();
        itinerary.publishTo(Visibility.PUBLIC, Instant.now());

        itinerary.showTo(Visibility.PRIVATE);

        assertThat(itinerary.visibility()).isEqualTo(Visibility.PRIVATE);
        assertThat(itinerary.isPublished())
                .as("visibility and discovery are independent — narrowing the audience is not a withdrawal")
                .isTrue();
    }

    @Test
    void theAudienceIsSettableBeforePublishing_becauseItIsNotAPublicationFact() {
        Itinerary itinerary = newTrip("Planned", "Cebu");

        itinerary.showTo(Visibility.PRIVATE);

        assertThat(itinerary.visibility()).isEqualTo(Visibility.PRIVATE);
        assertThat(itinerary.isPublished()).isFalse();
    }

    @Test
    void aPublishedTripPinsItsLifecycle_soUnpublishIsTheOnlyWayToMoveIt() {
        Itinerary itinerary = completed();
        itinerary.publishTo(Visibility.PUBLIC, Instant.now());

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
    }

    @Test
    void anUpcomingTripHasNothingToStepBackTo_becauseItIsWhereEveryTripStarts() {
        Itinerary itinerary = newTrip("Planned", "Cebu");

        assertThatThrownBy(itinerary::reopen)
                .isInstanceOf(IllegalStateTransitionException.class)
                .hasMessageContaining("nothing before it");
    }

    @Test
    void repeatingEitherActIsANoOpRatherThanATransition() {
        Itinerary itinerary = completed();

        itinerary.unpublish();
        assertThat(itinerary.isPublished()).isFalse();

        itinerary.publishTo(Visibility.PUBLIC, Instant.now());
        itinerary.publishTo(Visibility.PUBLIC, Instant.now());
        assertThat(itinerary.isPublished()).isTrue();
    }

    @Test
    void theWireNamesAreTheOnesCanonNames() {
        assertThat(Visibility.PUBLIC.wireName()).isEqualTo("public");
        assertThat(Visibility.PRIVATE.wireName()).isEqualTo("private");

        assertThat(ItineraryState.UPCOMING.wireName()).isEqualTo("upcoming");
        assertThat(ItineraryState.ONGOING.wireName()).isEqualTo("ongoing");
        assertThat(ItineraryState.COMPLETED.wireName()).isEqualTo("completed");
    }

    @Test
    void onlyCompletedAdmitsPublishing() {
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

    private Itinerary newTrip(String title, String destination) {
        return Itinerary.newTrip(owner, title, destination, null, null, Instant.now());
    }

    private Itinerary completed() {
        Itinerary itinerary = newTrip("Planned", "Cebu");

        itinerary.start(Instant.now());
        itinerary.complete(Instant.now());
        return itinerary;
    }

    private Itinerary dated(LocalDate start, LocalDate end) {
        return Itinerary.newTrip(owner, "Trip", "Sapporo", start, end, Instant.now());
    }
}
