package com.largata.itinerary;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;

import com.largata.itinerary.service.ItineraryForkService;
import com.largata.support.PostgresTestBase;
import com.largata.support.TestJwtSupport;
import com.largata.support.TripRig;
import com.largata.trip.fork.ForkRelationshipRepository;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.client.RestTestClient;


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class ItineraryForkRollbackIT extends PostgresTestBase {

    private RestTestClient rest;
    private TripRig rig;

    @LocalServerPort private int port;

    @Autowired private JdbcTemplate jdbc;

    @Autowired private ItineraryForkService forks;

    @MockitoSpyBean private ForkRelationshipRepository relationships;

    @BeforeEach
    void setUp() {
        rest = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
        rig = new TripRig(rest, jdbc);
    }


    @Test
    void aFailureWritingTheProvenanceLeavesNoTripNoWorkspaceNoMembershipAndNoPlan() {
        String author = rig.travelerWithHandle(handle());
        String trip = rig.createTrip(author, 2);
        rig.addActivity(author, trip, rig.dayAt(trip, 1), "As it was when published");
        walkToCompleted(author, trip);
        UUID itineraryId = UUID.fromString(publish(author, trip));
        UUID forker = UUID.randomUUID();

        long tripsBefore = countOf("itinerary");
        long workspacesBefore = countOf("workspace");
        long membershipsBefore = countOf("membership");
        long daysBefore = countOf("day");
        long activitiesBefore = countOf("activity");
        long provenanceBefore = countOf("fork_relationship");

        doThrow(new IllegalStateException("the provenance write failed"))
                .when(relationships)
                .save(any());

        assertThatThrownBy(() -> forks.fork(itineraryId, forker))
                .isInstanceOf(IllegalStateException.class);

        assertThat(countOf("itinerary"))
                .as("the fork writes a trip, its workspace, its membership and its whole plan through"
                        + " trip's api, then records provenance. Those are two modules inside one"
                        + " transaction (ADR-038 rule 5 does not list this one), so what makes the act"
                        + " safe is that a failure at the LAST write undoes every earlier one - no"
                        + " half-existing copy, and no provenance pointing at a trip that never was")
                .isEqualTo(tripsBefore);
        assertThat(countOf("workspace")).isEqualTo(workspacesBefore);
        assertThat(countOf("membership")).isEqualTo(membershipsBefore);
        assertThat(countOf("day")).isEqualTo(daysBefore);
        assertThat(countOf("activity")).isEqualTo(activitiesBefore);
        assertThat(countOf("fork_relationship"))
                .as("a delta, never an absolute - every IT in this run shares one Postgres, so a"
                        + " count of zero would be asserting a fact about the whole database"
                        + " (S4.39)")
                .isEqualTo(provenanceBefore);
    }


    private long countOf(String table) {
        Long rows = jdbc.queryForObject("SELECT count(*) FROM " + table, Long.class);
        return rows == null ? 0 : rows;
    }


    private String publish(String owner, String trip) {
        return TripRig.fieldIn(
                rest.post()
                        .uri("/v1/trips/" + trip + "/publish")
                        .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(owner))
                        .exchange()
                        .expectStatus()
                        .isOk()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent(),
                "id");
    }


    private void walkToCompleted(String owner, String trip) {
        for (String act : new String[] {"start", "complete"}) {
            rest.post()
                    .uri("/v1/trips/" + trip + "/" + act)
                    .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(owner))
                    .exchange()
                    .expectStatus()
                    .isOk();
        }
    }


    private static String handle() {
        return "t" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
    }
}
