package com.largata.report;

import static com.largata.support.TripRig.bearer;
import static org.assertj.core.api.Assertions.assertThat;

import com.largata.support.PostgresTestBase;
import com.largata.support.TestJwtSupport;
import com.nimbusds.jwt.SignedJWT;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.client.RestTestClient;


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class ReportAcceptIT extends PostgresTestBase {

    private RestTestClient rest;

    @LocalServerPort private int port;

    @Autowired private JdbcTemplate jdbc;

    @BeforeEach
    void setUp() {
        rest = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
    }


    @Test
    void anAnonymousReportIsAcceptedAndStoredPending() {
        UUID reportId = UUID.randomUUID();

        submit(reportId, null, "problem", "The map never loads.").expectStatus().isCreated();

        Map<String, Object> row = rowOf(reportId);
        assertThat(row.get("type")).isEqualTo("PROBLEM");
        assertThat(row.get("description")).isEqualTo("The map never loads.");
        assertThat(row.get("status")).isEqualTo("PENDING");
        assertThat(row.get("reporter_traveler_id")).isNull();
        assertThat(row.get("reporter_name")).isNull();
        assertThat(row.get("submitted_at")).isNotNull();
    }


    @Test
    void theRouteIsReachableWithoutAnyToken() {
        submit(UUID.randomUUID(), null, "idea", "Add a dark mode.").expectStatus().isCreated();
    }


    @Test
    void anIdeaIsAcceptedTheSameWayAsAProblem() {
        UUID reportId = UUID.randomUUID();

        submit(reportId, null, "idea", "Let me pin a day.").expectStatus().isCreated();

        assertThat(rowOf(reportId).get("type")).isEqualTo("IDEA");
    }


    @Test
    void aReplayOfTheSameReportIdAnswersOkAndWritesNothingNew() {
        UUID reportId = UUID.randomUUID();
        submit(reportId, null, "problem", "First words.").expectStatus().isCreated();
        Object stampedAtFirstAccept = rowOf(reportId).get("submitted_at");

        submit(reportId, null, "problem", "Different words entirely.").expectStatus().isOk();

        assertThat(countOf(reportId)).isEqualTo(1);
        Map<String, Object> row = rowOf(reportId);
        assertThat(row.get("description")).isEqualTo("First words.");
        assertThat(row.get("submitted_at")).isEqualTo(stampedAtFirstAccept);
    }


    @Test
    void aSignedInReportCarriesTheTravelerUuidAndDisplayName() {
        UUID reportId = UUID.randomUUID();
        String uid = "uid-" + UUID.randomUUID();
        String token = TestJwtSupport.verifiedTokenWithName(uid, uid + "@example.com", "Maya Ocampo");

        submit(reportId, token, "problem", "Chat scrolls to the wrong message.").expectStatus().isCreated();

        Map<String, Object> row = rowOf(reportId);
        assertThat(row.get("reporter_traveler_id")).isEqualTo(travelerIdOf(token));
        assertThat(row.get("reporter_name")).isEqualTo("Maya Ocampo");
    }


    @Test
    void reporterFieldsInThePayloadAreIgnoredWhenSignedOut() {
        UUID reportId = UUID.randomUUID();
        MultipartBodyBuilder body = new MultipartBodyBuilder();
        body.part(
                "report",
                "{\"reportId\":\""
                        + reportId
                        + "\",\"type\":\"problem\",\"description\":\"Impersonation attempt.\",\"appVersion\":\"0.1.0\",\"platform\":\"web\","
                        + "\"reporter\":{\"uid\":\""
                        + UUID.randomUUID()
                        + "\",\"name\":\"Somebody Else\"},"
                        + "\"reporterName\":\"Somebody Else\"}");

        rest.post()
                .uri(ReportPaths.ANONYMOUS)
                .header("X-Forwarded-For", anIpAddress())
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(body.build())
                .exchange()
                .expectStatus()
                .isCreated();

        Map<String, Object> row = rowOf(reportId);
        assertThat(row.get("reporter_traveler_id")).isNull();
        assertThat(row.get("reporter_name")).isNull();
    }


    @Test
    void reporterFieldsInThePayloadCannotOverrideTheTokensIdentity() {
        UUID reportId = UUID.randomUUID();
        String uid = "uid-" + UUID.randomUUID();
        String token = TestJwtSupport.verifiedTokenWithName(uid, uid + "@example.com", "Real Traveler");
        MultipartBodyBuilder body = new MultipartBodyBuilder();
        body.part(
                "report",
                "{\"reportId\":\""
                        + reportId
                        + "\",\"type\":\"problem\",\"description\":\"Impersonation attempt.\",\"appVersion\":\"0.1.0\",\"platform\":\"web\","
                        + "\"reporterName\":\"Somebody Else\"}");

        rest.post()
                .uri(ReportPaths.ANONYMOUS)
                .header("X-Forwarded-For", anIpAddress())
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(body.build())
                .exchange()
                .expectStatus()
                .isCreated();

        assertThat(rowOf(reportId).get("reporter_name")).isEqualTo("Real Traveler");
    }


    @Test
    void anUnknownTypeIsRefusedAndPersistsNothing() {
        UUID reportId = UUID.randomUUID();

        submit(reportId, null, "complaint", "Neither a problem nor an idea.")
                .expectStatus()
                .isBadRequest();

        assertThat(countOf(reportId)).isZero();
    }


    @Test
    void anEmptyDescriptionIsRefusedAndPersistsNothing() {
        UUID reportId = UUID.randomUUID();

        submit(reportId, null, "problem", "   ").expectStatus().isBadRequest();

        assertThat(countOf(reportId)).isZero();
    }


    @Test
    void aDescriptionBeyondTheLimitIsRefusedAndPersistsNothing() {
        UUID reportId = UUID.randomUUID();

        submit(reportId, null, "problem", "x".repeat(ReportService.MAX_DESCRIPTION_CHARS + 1))
                .expectStatus()
                .isBadRequest();

        assertThat(countOf(reportId)).isZero();
    }


    @Test
    void aDescriptionExactlyAtTheLimitIsAccepted() {
        UUID reportId = UUID.randomUUID();

        submit(reportId, null, "problem", "x".repeat(ReportService.MAX_DESCRIPTION_CHARS))
                .expectStatus()
                .isCreated();

        assertThat(countOf(reportId)).isEqualTo(1);
    }


    @Test
    void aMissingPlatformIsRefusedRatherThanAcceptedAndLaterLostAtWorklog() {
        UUID reportId = UUID.randomUUID();

        submitRaw(reportId, "{\"reportId\":\"" + reportId
                + "\",\"type\":\"problem\",\"description\":\"No platform.\",\"appVersion\":\"0.1.0\"}")
                .expectStatus()
                .isBadRequest();

        assertThat(countOf(reportId)).isZero();
    }


    @Test
    void anUnknownPlatformIsRefused() {
        UUID reportId = UUID.randomUUID();

        submitRaw(reportId, "{\"reportId\":\"" + reportId
                + "\",\"type\":\"problem\",\"description\":\"Odd platform.\",\"appVersion\":\"0.1.0\","
                + "\"platform\":\"blackberry\"}")
                .expectStatus()
                .isBadRequest();

        assertThat(countOf(reportId)).isZero();
    }


    @Test
    void aMissingAppVersionIsRefusedRatherThanAcceptedAndLaterLostAtWorklog() {
        UUID reportId = UUID.randomUUID();

        submitRaw(reportId, "{\"reportId\":\"" + reportId
                + "\",\"type\":\"problem\",\"description\":\"No version.\",\"platform\":\"web\"}")
                .expectStatus()
                .isBadRequest();

        assertThat(countOf(reportId)).isZero();
    }


    @Test
    void aBlankAppVersionIsRefusedToo() {
        UUID reportId = UUID.randomUUID();

        submitRaw(reportId, "{\"reportId\":\"" + reportId
                + "\",\"type\":\"problem\",\"description\":\"Blank version.\",\"platform\":\"web\","
                + "\"appVersion\":\"   \"}")
                .expectStatus()
                .isBadRequest();

        assertThat(countOf(reportId)).isZero();
    }


    @Test
    void everyPlatformWorklogAcceptsIsStoredInItsWireSpelling() {
        for (String platform : new String[] {"android", "ios", "web"}) {
            UUID reportId = UUID.randomUUID();

            submitRaw(reportId, "{\"reportId\":\"" + reportId
                    + "\",\"type\":\"problem\",\"description\":\"Platform " + platform + ".\","
                    + "\"appVersion\":\"0.1.0\",\"platform\":\"" + platform + "\"}")
                    .expectStatus()
                    .isCreated();

            assertThat(rowOf(reportId).get("platform")).isEqualTo(platform);
        }
    }


    @Test
    void aScreenBeyondTheLimitIsRefusedAndPersistsNothing() {
        UUID reportId = UUID.randomUUID();
        MultipartBodyBuilder body = new MultipartBodyBuilder();
        body.part(
                "report",
                "{\"reportId\":\""
                        + reportId
                        + "\",\"type\":\"problem\",\"description\":\"Fine.\",\"appVersion\":\"0.1.0\",\"platform\":\"web\",\"screen\":\""
                        + "s".repeat(ReportService.MAX_SCREEN_CHARS + 1)
                        + "\"}");

        rest.post()
                .uri(ReportPaths.ANONYMOUS)
                .header("X-Forwarded-For", anIpAddress())
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(body.build())
                .exchange()
                .expectStatus()
                .isBadRequest();

        assertThat(countOf(reportId)).isZero();
    }


    @Test
    void aMalformedReportIdIsRefused() {
        MultipartBodyBuilder body = new MultipartBodyBuilder();
        body.part("report", "{\"reportId\":\"not-a-uuid\",\"type\":\"idea\",\"description\":\"Hello.\"}");

        rest.post()
                .uri(ReportPaths.ANONYMOUS)
                .header("X-Forwarded-For", anIpAddress())
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(body.build())
                .exchange()
                .expectStatus()
                .isBadRequest();
    }


    @Test
    void theScreenAndBuildFieldsAreStoredWhenGiven() {
        UUID reportId = UUID.randomUUID();
        MultipartBodyBuilder body = new MultipartBodyBuilder();
        body.part(
                "report",
                "{\"reportId\":\""
                        + reportId
                        + "\",\"type\":\"problem\",\"description\":\"Broken here.\","
                        + "\"screen\":\"Home feed · (tabs)/(home)\",\"appVersion\":\"1.4.0\","
                        + "\"platform\":\"android\"}");

        rest.post()
                .uri(ReportPaths.ANONYMOUS)
                .header("X-Forwarded-For", anIpAddress())
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(body.build())
                .exchange()
                .expectStatus()
                .isCreated();

        Map<String, Object> row = rowOf(reportId);
        assertThat(row.get("screen")).isEqualTo("Home feed · (tabs)/(home)");
        assertThat(row.get("app_version")).isEqualTo("1.4.0");
        assertThat(row.get("platform")).isEqualTo("android");
    }


    @Test
    void theAcceptedReportIdComesBackToTheClient() {
        UUID reportId = UUID.randomUUID();

        byte[] response =
                submit(reportId, null, "idea", "Tell me my own id.")
                        .expectStatus()
                        .isCreated()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent();

        assertThat(new String(response)).contains(reportId.toString());
    }


    @Test
    void anExpiredTokenIsTreatedAsSignedOutRatherThanRefused() {
        UUID reportId = UUID.randomUUID();

        rest.post()
                .uri(ReportPaths.ANONYMOUS)
                .header("X-Forwarded-For", anIpAddress())
                .header(HttpHeaders.AUTHORIZATION, bearer(TestJwtSupport.expiredToken("uid-expired")))
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(reportBody(reportId, "problem", "Sent with a stale session.").build())
                .exchange()
                .expectStatus()
                .isUnauthorized();

        assertThat(countOf(reportId)).isZero();
    }


    private RestTestClient.ResponseSpec submit(
            UUID reportId, String token, String type, String description) {
        var request = rest.post().uri(ReportPaths.ANONYMOUS).header("X-Forwarded-For", anIpAddress());
        if (token != null) {
            request = request.header(HttpHeaders.AUTHORIZATION, bearer(token));
        }
        return request
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(reportBody(reportId, type, description).build())
                .exchange();
    }


    private static String anIpAddress() {
        return "192.0.2." + (NEXT_ADDRESS.incrementAndGet() % 250);
    }


    private static final AtomicInteger NEXT_ADDRESS = new AtomicInteger();


    private RestTestClient.ResponseSpec submitRaw(UUID reportId, String reportJson) {
        MultipartBodyBuilder body = new MultipartBodyBuilder();
        body.part("report", reportJson);
        return rest.post()
                .uri(ReportPaths.ANONYMOUS)
                .header("X-Forwarded-For", anIpAddress())
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(body.build())
                .exchange();
    }


    private static MultipartBodyBuilder reportBody(UUID reportId, String type, String description) {
        MultipartBodyBuilder body = new MultipartBodyBuilder();
        body.part(
                "report",
                "{\"reportId\":\""
                        + reportId
                        + "\",\"type\":\""
                        + type
                        + "\",\"description\":\""
                        + description
                        + "\",\"appVersion\":\"0.1.0\",\"platform\":\"web\"}");
        return body;
    }


    private Map<String, Object> rowOf(UUID reportId) {
        return jdbc.queryForMap("SELECT * FROM report_outbox WHERE id = ?", reportId);
    }


    private int countOf(UUID reportId) {
        return jdbc.queryForObject(
                "SELECT count(*) FROM report_outbox WHERE id = ?", Integer.class, reportId);
    }


    private UUID travelerIdOf(String token) {
        return jdbc.queryForObject(
                "SELECT id FROM traveler WHERE firebase_uid = ?", UUID.class, subjectOf(token));
    }


    private static String subjectOf(String token) {
        try {
            return SignedJWT.parse(token).getJWTClaimsSet().getSubject();
        } catch (Exception unparseable) {
            throw new IllegalStateException("could not read the test token", unparseable);
        }
    }
}
