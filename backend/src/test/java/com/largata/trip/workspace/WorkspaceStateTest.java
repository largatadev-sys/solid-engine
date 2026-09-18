package com.largata.trip.workspace;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.trip.workspace.entity.WorkspaceState;
import org.junit.jupiter.api.Test;


class WorkspaceStateTest {

    @Test
    void theWorkspaceOwnsExactlyOneFact_isTheRoomOpen() {
        assertThat(WorkspaceState.values())
                .as("TW-2: COMPLETED was a stored copy of the ITINERARY's lifecycle. A workspace"
                        + " answers one question, and a third value here means it answered two")
                .containsExactly(WorkspaceState.ACTIVE, WorkspaceState.ARCHIVED);
    }


    @Test
    void openAndArchivedAreTheTwoSidesOfThatOneFact() {
        assertThat(WorkspaceState.ACTIVE.isOpen()).isTrue();
        assertThat(WorkspaceState.ACTIVE.isArchived()).isFalse();

        assertThat(WorkspaceState.ARCHIVED.isOpen()).isFalse();
        assertThat(WorkspaceState.ARCHIVED.isArchived()).isTrue();
    }


    @Test
    void theStoredSpellingIsTheEnumName_becauseSqlDependsOnIt() {
        assertThat(WorkspaceState.ACTIVE.name())
                .as("V58's CHECK and V13's backfill both name these literally — the V4 lesson is that"
                        + " a lower-case predicate matches nothing and enforces nothing, silently")
                .isEqualTo("ACTIVE");
        assertThat(WorkspaceState.ARCHIVED.name()).isEqualTo("ARCHIVED");
    }
}
