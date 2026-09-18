package com.largata.trip.trip;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.common.api.Page;
import com.largata.trip.api.Role;
import com.largata.support.PostgresTestBase;
import com.largata.support.ThreadLocalStatementCounter;
import com.largata.support.TestJwtSupport;
import com.largata.support.TripRig;
import com.largata.trip.api.TripApi;
import com.largata.trip.api.TripListEntry;
import com.largata.trip.api.TripListQuery;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.client.RestTestClient;


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class TripListFacetsIT extends PostgresTestBase {

    private static final int PAGE = 30;

    private RestTestClient rest;
    private TripRig rig;

    @LocalServerPort private int port;

    @Autowired private JdbcTemplate jdbc;

    @Autowired private TripApi trips;


    @DynamicPropertySource
    static void countStatementsOnTheCallingThread(DynamicPropertyRegistry registry) {
        registry.add(
                "spring.jpa.properties.hibernate.session_factory.statement_inspector",
                ThreadLocalStatementCounter.class::getName);
    }

    @BeforeEach
    void setUp() {
        rest = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
        rig = new TripRig(rest, jdbc);
    }


    @Test
    void onePageAnswersEveryFacetTheListRendersForTripsThatDifferInAllOfThem() {
        String myHandle = handle();
        String traveler = rig.travelerWithHandle(myHandle);
        UUID travelerId = rig.travelerIdOf(traveler);

        String owned = rig.createTrip(traveler, 3);
        rig.hold(traveler, owned, "HEADER", UUID.fromString(owned));

        String quiet = rig.createTrip(traveler, 1);

        String someoneElses = someoneElsesTripJoinedBy(traveler, myHandle);

        Map<UUID, TripListEntry> byId = listFor(travelerId);

        assertThat(byId.keySet())
                .as("the traveler's own two trips and the one they were admitted to")
                .containsExactlyInAnyOrder(
                        UUID.fromString(owned), UUID.fromString(quiet), UUID.fromString(someoneElses));

        TripListEntry held = byId.get(UUID.fromString(owned));
        assertThat(held.beingEdited()).as("a lease is held on this one").isTrue();
        assertThat(held.dayCount()).isEqualTo(3);
        assertThat(held.viewerRole()).isEqualTo(Role.OWNER);
        assertThat(held.memberCount()).isEqualTo(1);
        assertThat(held.workspaceState()).isEqualTo("active");
        assertThat(held.archived()).isFalse();

        TripListEntry free = byId.get(UUID.fromString(quiet));
        assertThat(free.beingEdited()).as("no lease on this one").isFalse();
        assertThat(free.dayCount()).isEqualTo(1);
        assertThat(free.viewerRole()).isEqualTo(Role.OWNER);

        TripListEntry joined = byId.get(UUID.fromString(someoneElses));
        assertThat(joined.viewerRole()).as("admitted, not owning").isEqualTo(Role.MEMBER);
        assertThat(joined.memberCount()).isEqualTo(2);
        assertThat(joined.beingEdited()).isFalse();
    }


    @Test
    void theArchivedPageCarriesTheArchivedWorkspaceStateAndTheLivePageDoesNotShowIt() {
        String traveler = rig.travelerWithHandle(handle());
        UUID travelerId = rig.travelerIdOf(traveler);

        String live = rig.createTrip(traveler, 1);
        String shelved = rig.createTrip(traveler, 2);
        archive(traveler, shelved);

        assertThat(listFor(travelerId).keySet())
                .as("an archived trip leaves the live list")
                .containsExactly(UUID.fromString(live));

        Page<TripListEntry> archived =
                trips.listFor(new TripListQuery(travelerId, null, null, true, null));
        assertThat(archived.items()).hasSize(1);

        TripListEntry entry = archived.items().get(0);
        assertThat(entry.id()).isEqualTo(UUID.fromString(shelved));
        assertThat(entry.archived()).isTrue();
        assertThat(entry.workspaceState()).isEqualTo("archived");
        assertThat(entry.dayCount()).isEqualTo(2);
    }


    @Test
    void aPageOfThirtyTripsCostsTheSameNumberOfQueriesAsAPageOfOne() {
        String traveler = rig.travelerWithHandle(handle());
        UUID travelerId = rig.travelerIdOf(traveler);
        rig.createTrip(traveler, 1);

        long forOne = queriesToList(travelerId);

        for (int i = 0; i < 29; i++) {
            rig.createTrip(traveler, 1);
        }
        assertThat(trips.listFor(new TripListQuery(travelerId, null, PAGE, false, null)).items())
                .as("thirty trips on one page - the default page size is 20, so the limit is explicit")
                .hasSize(PAGE);

        long forThirty = queriesToList(travelerId);

        assertThat(forThirty)
                .as("the workspace state was looked up ONCE PER ROW before S4.41, so a page of"
                        + " thirty cost twenty-nine more queries than a page of one. A fixed count"
                        + " is the whole claim, and counting is the only way to see it - timing"
                        + " cannot tell thirty cheap queries from one")
                .isEqualTo(forOne);
    }


    private long queriesToList(UUID travelerId) {
        ThreadLocalStatementCounter.reset();

        trips.listFor(new TripListQuery(travelerId, null, PAGE, false, null));

        return ThreadLocalStatementCounter.onThisThread();
    }


    private Map<UUID, TripListEntry> listFor(UUID travelerId) {
        return trips.listFor(new TripListQuery(travelerId, null, null, false, null)).items().stream()
                .collect(Collectors.toMap(TripListEntry::id, Function.identity()));
    }


    private String someoneElsesTripJoinedBy(String travelerToken, String travelerHandle) {
        String owner = rig.travelerWithHandle(handle());
        String trip = rig.createTrip(owner, 1);
        byte[] invitation =
                rest.post()
                        .uri("/v1/trips/" + trip + "/invitations/by-handle")
                        .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"handle\":\"" + travelerHandle + "\"}")
                        .exchange()
                        .expectStatus()
                        .isCreated()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent();
        rest.post()
                .uri("/v1/invitations/" + TripRig.fieldIn(invitation, "id") + "/accept")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(travelerToken))
                .exchange()
                .expectStatus()
                .isOk();
        return trip;
    }


    private void archive(String token, String tripId) {
        rest.post()
                .uri("/v1/trips/" + tripId + "/archive")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(token))
                .exchange()
                .expectStatus()
                .isOk();
    }


    private static String handle() {
        return "t" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
    }
}
