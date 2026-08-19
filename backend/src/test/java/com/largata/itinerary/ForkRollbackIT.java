package com.largata.itinerary;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;

import com.largata.common.authz.Membership;
import com.largata.common.authz.Role;
import com.largata.support.PostgresTestBase;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;


@SpringBootTest
class ForkRollbackIT extends PostgresTestBase {

    @Autowired private ForkService forks;
    @Autowired private ItineraryService itineraries;
    @Autowired private JdbcTemplate jdbc;

    @MockitoSpyBean private ForkRelationshipRepository relationships;


    @Test
    void aFailureWritingTheRelationshipLeavesNoItineraryNoWorkspaceAndNoMembership() {
        UUID author = UUID.randomUUID();
        UUID forker = UUID.randomUUID();
        UUID sourceId = publishedSource(author);

        doThrow(new IllegalStateException("the provenance write failed")).when(relationships).save(any());

        assertThatThrownBy(() -> forks.fork(sourceId, forker, sightOf(forker, sourceId)))
                .isInstanceOf(IllegalStateException.class);

        assertThat(itinerariesOwnedBy(forker)).as("no half-existing copy survives").isZero();
        assertThat(workspacesOwnedBy(forker)).isZero();
        assertThat(membershipsOf(forker)).isZero();
        assertThat(relationshipsNaming(sourceId)).isZero();
    }


    @Test
    void aFailureRollsBackTheCopiedPlanToo_notJustTheItineraryRow() {
        UUID author = UUID.randomUUID();
        UUID forker = UUID.randomUUID();
        UUID sourceId = publishedSource(author);
        long daysBefore = allDays();
        long activitiesBefore = allActivities();

        doThrow(new IllegalStateException("the provenance write failed")).when(relationships).save(any());

        assertThatThrownBy(() -> forks.fork(sourceId, forker, sightOf(forker, sourceId)))
                .isInstanceOf(IllegalStateException.class);

        assertThat(allDays()).as("the copied days rolled back with everything else").isEqualTo(daysBefore);
        assertThat(allActivities()).isEqualTo(activitiesBefore);
    }


    private Optional<Membership> sightOf(UUID travelerId, UUID sourceId) {
        return Optional.of(new Membership(travelerId, sourceId, Role.MEMBER));
    }


    private UUID publishedSource(UUID author) {
        Itinerary source = itineraries.create(author, "Rollback fixture", "Palawan", null, null);
        jdbc.update(
                "UPDATE itinerary SET published = true, state = 'COMPLETED', visibility = 'PRIVATE', "
                        + "published_at = now() "
                        + "WHERE id = ?",
                source.id());
        return source.id();
    }


    private long itinerariesOwnedBy(UUID ownerId) {
        return jdbc.queryForObject(
                "SELECT count(*) FROM itinerary WHERE owner_id = ?", Long.class, ownerId);
    }


    private long workspacesOwnedBy(UUID ownerId) {
        return jdbc.queryForObject(
                "SELECT count(*) FROM workspace w JOIN membership m ON m.workspace_id = w.id "
                        + "WHERE m.traveler_id = ? AND m.role = 'OWNER'",
                Long.class,
                ownerId);
    }


    private long membershipsOf(UUID travelerId) {
        return jdbc.queryForObject(
                "SELECT count(*) FROM membership WHERE traveler_id = ?", Long.class, travelerId);
    }


    private long relationshipsNaming(UUID sourceId) {
        return jdbc.queryForObject(
                "SELECT count(*) FROM fork_relationship WHERE source_itinerary_id = ?", Long.class, sourceId);
    }


    private long allDays() {
        return jdbc.queryForObject("SELECT count(*) FROM day", Long.class);
    }


    private long allActivities() {
        return jdbc.queryForObject("SELECT count(*) FROM activity", Long.class);
    }
}
