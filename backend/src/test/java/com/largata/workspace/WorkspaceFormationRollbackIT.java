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

/**
 * AC 2 — <strong>the test that proves S1.1's invariant</strong>: if the workspace cannot be formed,
 * the itinerary does not exist (S1.1 spec §Formation).
 *
 * <p>Only the failure case can prove this. A happy path cannot distinguish "one transaction" from
 * "two that both happened to work" — and the difference is not academic: from S1.1 the guard reads
 * standing from membership rows, so an itinerary that committed without its workspace would be
 * permanently invisible to its own creator, with no error naming why. That is the state this test
 * exists to prove unreachable.
 *
 * <p><strong>Why this class lives in the workspace package, and why that is not test-placement
 * trivia.</strong> The failure is injected at {@link WorkspaceRepository}, which is package-private
 * — everything outside this module goes through {@link WorkspaceService} (ADR-002). The natural home
 * for the test looked like the itinerary module (that is where {@code create} lives), and it cannot
 * go there: the boundary that stops production code reaching in stops the test too. The rule held,
 * so the test moved. It is placed beside the thing it stubs, which is where it belonged anyway.
 *
 * <p><strong>The layer is also deliberate.</strong> Spying on {@code WorkspaceService} itself does
 * not work: a Spring spy wraps the {@code @Transactional} proxy, so {@code when(spy).formAround(…)}
 * runs the transaction interceptor during <em>stub setup</em>, where MANDATORY throws before the
 * test body starts (tried at S1.1; it surfaces as a Mockito matcher error, which names nothing about
 * the real cause). The repository has no such proxy in front of it, and injecting the failure at the
 * write is where a real one would happen.
 */
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
