package com.largata.trip;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.support.PostgresTestBase;
import com.largata.support.TestJwtSupport;
import com.largata.support.TripRig;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.client.RestTestClient;


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class TripGrammarEquivalenceIT extends PostgresTestBase {

    private RestTestClient rest;
    private TripRig rig;

    @LocalServerPort private int port;

    @Autowired private JdbcTemplate jdbc;

    @BeforeEach
    void setUp() {
        rest = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
        rig = new TripRig(rest, jdbc);
    }


    @Test
    void everyWorkspaceReadAnswersByteForByteOnBothRoots() {
        String owner = rig.travelerWithHandle(handle());
        String trip = rig.createTrip(owner, 2);
        String member = rig.joinAsMember(owner, trip, handle());
        UUID day = rig.dayAt(trip, 1);
        rig.addActivity(owner, trip, day, "Snorkelling");
        rig.send(
                org.springframework.http.HttpMethod.POST,
                "/v1/itineraries/" + trip + "/polls",
                owner,
                "{\"question\":\"Where to?\",\"options\":[\"North\",\"South\"]}");
        rig.send(
                org.springframework.http.HttpMethod.POST,
                "/v1/itineraries/" + trip + "/chat/messages",
                owner,
                "{\"body\":\"Morning\"}");

        for (String suffix : READS) {
            assertThat(statusAndBodyOf(member, "/v1/trips/" + trip + suffix))
                    .as("the two grammars must answer the same bytes for %s", suffix)
                    .isEqualTo(statusAndBodyOf(member, "/v1/itineraries/" + trip + suffix));
        }
    }


    @Test
    void theOwnersReadsAlsoAnswerIdenticallyOnBothRoots() {
        String owner = rig.travelerWithHandle(handle());
        String trip = rig.createTrip(owner, 2);
        rig.joinAsMember(owner, trip, handle());

        for (String suffix : READS) {
            assertThat(statusAndBodyOf(owner, "/v1/trips/" + trip + suffix))
                    .as("the owner-only reads must not depend on the address either, for %s", suffix)
                    .isEqualTo(statusAndBodyOf(owner, "/v1/itineraries/" + trip + suffix));
        }
    }


    @Test
    void theTripListAnswersIdenticallyOnBothRoots() {
        String owner = rig.travelerWithHandle(handle());
        rig.createTrip(owner, 1);
        rig.createTrip(owner, 2);

        assertThat(statusAndBodyOf(owner, "/v1/trips"))
                .as("the list is the one read whose path is the root itself, not a trip under it")
                .isEqualTo(statusAndBodyOf(owner, "/v1/itineraries"));
    }


    @Test
    void oneWritePerResourceLeavesTheSameRecordWhicheverRootTookIt() {
        String owner = rig.travelerWithHandle(handle());
        String throughOld = rig.createTrip(owner, 1);
        String throughNew = rig.createTrip(owner, 1);
        UUID oldDay = rig.dayAt(throughOld, 1);
        UUID newDay = rig.dayAt(throughNew, 1);

        for (Write write : WRITES) {
            String old =
                    withoutIdentity(
                            send(write, "/v1/itineraries/" + throughOld, owner, oldDay));
            String recent =
                    withoutIdentity(send(write, "/v1/trips/" + throughNew, owner, newDay));

            assertThat(recent)
                    .as("a write to %s must leave the same record whichever root took it", write.suffix())
                    .isEqualTo(old);
        }
    }


    @Test
    void theDetailOfTwoTripsWrittenThroughEitherRootMatchesFieldForField() {
        String owner = rig.travelerWithHandle(handle());
        String throughOld = rig.createTrip(owner, 1);
        String throughNew = createTripThroughTheTripsRoot(owner);

        rig.send(
                org.springframework.http.HttpMethod.PATCH,
                "/v1/itineraries/" + throughOld,
                owner,
                "{\"title\":\"Renamed\"}");
        rig.send(
                org.springframework.http.HttpMethod.PATCH,
                "/v1/trips/" + throughNew,
                owner,
                "{\"title\":\"Renamed\"}");

        assertThat(withoutIdentity(statusAndBodyOf(owner, "/v1/trips/" + throughNew)))
                .as("a write through either root must leave the same record behind")
                .isEqualTo(withoutIdentity(statusAndBodyOf(owner, "/v1/itineraries/" + throughOld)));
    }


    @Test
    void aNonMemberIsMaskedIdenticallyOnBothRoots() {
        String owner = rig.travelerWithHandle(handle());
        String trip = rig.createTrip(owner, 1);
        String stranger = rig.travelerWithHandle(handle());

        for (String suffix : READS) {
            assertThat(statusAndBodyOf(stranger, "/v1/trips/" + trip + suffix))
                    .as("the masking of a non-member must not depend on the address used for %s", suffix)
                    .isEqualTo(statusAndBodyOf(stranger, "/v1/itineraries/" + trip + suffix));
        }
    }


    @Test
    void anAnonymousCallerIsRefusedIdenticallyOnBothRoots() {
        String id = UUID.randomUUID().toString();

        for (String suffix : READS) {
            assertThat(anonymousStatusAndBodyOf("/v1/trips/" + id + suffix))
                    .as("an unauthenticated call must be refused the same way on %s", suffix)
                    .isEqualTo(anonymousStatusAndBodyOf("/v1/itineraries/" + id + suffix));
        }
    }


    private String createTripThroughTheTripsRoot(String ownerToken) {
        byte[] created =
                rest.post()
                        .uri("/v1/trips")
                        .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(ownerToken))
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .body("{\"title\":\"Trip\",\"destination\":\"Palawan\",\"durationDays\":1}")
                        .exchange()
                        .expectStatus()
                        .isCreated()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent();
        return TripRig.fieldIn(created, "id");
    }


    private String statusAndBodyOf(String token, String uri) {
        var result =
                rest.get()
                        .uri(uri)
                        .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(token))
                        .exchange()
                        .expectBody()
                        .returnResult();
        return result.getStatus().value() + " " + withoutPerRequestNoise(result.getResponseBodyContent());
    }


    private String anonymousStatusAndBodyOf(String uri) {
        var result = rest.get().uri(uri).exchange().expectBody().returnResult();
        return result.getStatus().value() + " " + withoutPerRequestNoise(result.getResponseBodyContent());
    }


    private static String withoutPerRequestNoise(byte[] body) {
        return new String(body == null ? new byte[0] : body)
                .replaceAll("\"traceId\":\"[^\"]*\"", "\"traceId\":\"{}\"")
                .replaceAll("\"timestamp\":\"[^\"]*\"", "\"timestamp\":\"{}\"");
    }


    private static String withoutIdentity(String body) {
        return body.replaceAll("\"(id|itineraryId|dayId|tripId)\":\"[0-9a-f-]{36}\"", "\"$1\":\"{}\"")
                .replaceAll("\"(at|createdAt|updatedAt|lastEditedAt)\":\"[^\"]*\"", "\"$1\":\"{}\"");
    }


    private record Write(String suffix, String body) {}

    private static final List<Write> WRITES =
            List.of(
                    new Write("/days", "{\"title\":\"A day\"}"),
                    new Write("/polls", "{\"question\":\"Where?\",\"options\":[\"North\",\"South\"]}"),
                    new Write("/chat/messages", "{\"body\":\"Morning\"}"),
                    new Write("/days/{day}/activities", "{\"title\":\"Snorkelling\"}"));

    private String send(Write write, String tripRoot, String token, UUID dayId) {
        String uri = tripRoot + write.suffix().replace("{day}", dayId.toString());
        var result =
                rest.post()
                        .uri(uri)
                        .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(token))
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .body(write.body())
                        .exchange()
                        .expectBody()
                        .returnResult();
        return result.getStatus().value() + " " + withoutPerRequestNoise(result.getResponseBodyContent());
    }


    private static final List<String> READS =
            List.of(
                    "",
                    "/photo-dump",
                    "/members",
                    "/invitations",
                    "/polls",
                    "/chat/messages",
                    "/join-link",
                    "/preview");

    private static String handle() {
        return "t" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
    }
}
