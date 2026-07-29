package com.largata.workspace;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;

import com.largata.itinerary.ItineraryService;
import com.largata.support.PostgresTestBase;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;


@SpringBootTest
class WorkspaceFormationRollbackIT extends PostgresTestBase {

    @Autowired private ItineraryService itineraries;
    @Autowired private JdbcTemplate jdbc;

    @MockitoSpyBean private WorkspaceRepository workspaces;

    @Test
    void aFailureFormingTheWorkspaceRollsBackTheItinerary() {
        UUID owner = UUID.randomUUID();
        doThrow(new IllegalStateException("the workspace write failed")).when(workspaces).save(any());

        assertThatThrownBy(() -> itineraries.create(owner, "Nara", List.of("Nara"), null, null))
                .isInstanceOf(IllegalStateException.class);

        assertThat(itineraryCountFor(owner))
                .as("no itinerary survives a workspace that never formed")
                .isZero();
    }

    private int itineraryCountFor(UUID ownerId) {
        return jdbc.queryForObject("SELECT count(*) FROM itinerary WHERE owner_id = ?", Integer.class, ownerId);
    }
}
