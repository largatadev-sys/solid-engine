package com.largata.identity.web;

import static org.assertj.core.api.Assertions.assertThat;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.largata.support.PostgresTestBase;
import com.largata.support.TestJwtSupport;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.client.RestTestClient;

/** Ticket 02's ACs over HTTP: the /v1/me contract, and provisioning as a consequence of calling it. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class MeContractIT extends PostgresTestBase {

    private RestTestClient rest;
    private ListAppender<ILoggingEvent> logCapture;

    @LocalServerPort private int port;
    @Autowired private JdbcTemplate jdbc;

    @BeforeEach
    void setUp() {
        rest = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
        logCapture = new ListAppender<>();
        logCapture.start();
        rootLogger().addAppender(logCapture);
    }

    @AfterEach
    void tearDown() {
        rootLogger().detachAppender(logCapture);
    }

    @Test
    void firstCallProvisionsAndReturnsExactlyTheThreeContractFields() {
        String uid = freshUid();

        rest.get()
                .uri("/v1/me")
                .header(HttpHeaders.AUTHORIZATION, bearer(TestJwtSupport.tokenWithName(uid, "ana@example.com", "Ana Silva")))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.id")
                .exists()
                .jsonPath("$.displayName")
                .isEqualTo("Ana Silva")
                .jsonPath("$.email")
                .isEqualTo("ana@example.com")
                // Three fields, no more: no firebaseUid (the auth boundary's key, not a domain
                // fact), no createdAt (nothing consumes it). Additive-only makes shipping a field
                // permanent, so this assertion guards the decision, not the formatting.
                .jsonPath("$.length()")
                .isEqualTo(3);

        assertThat(rowCountFor(uid)).isEqualTo(1);
    }

    @Test
    void repeatedCallsReturnTheSameTravelerAndCreateNothing() {
        String uid = freshUid();
        String token = TestJwtSupport.tokenFor(uid, "repeat@example.com");

        String firstId = idFrom(token);
        String secondId = idFrom(token);

        assertThat(secondId).isEqualTo(firstId);
        assertThat(rowCountFor(uid)).isEqualTo(1);
    }

    @Test
    void aTokenWithoutANameClaimGetsTheEmailLocalPart() {
        rest.get()
                .uri("/v1/me")
                .header(HttpHeaders.AUTHORIZATION, bearer(TestJwtSupport.tokenFor(freshUid(), "ana.silva@example.com")))
                .exchange()
                .expectBody()
                .jsonPath("$.displayName")
                .isEqualTo("ana.silva");
    }

    @Test
    void theRequestScopedLogsCarryTheFirebaseUidAsUserId() {
        // The AC: userId reaches the logs via the filter. Asserted on a real request through the
        // real chain — the only way to prove the filter sits where the principal exists.
        String uid = freshUid();

        rest.get()
                .uri("/v1/me")
                .header(HttpHeaders.AUTHORIZATION, bearer(TestJwtSupport.tokenFor(uid, "logged@example.com")))
                .exchange()
                .expectStatus()
                .isOk();

        assertThat(logCapture.list)
                .as("some line from this request carries userId, and nothing set it but the filter")
                .anySatisfy(event -> assertThat(event.getMDCPropertyMap()).containsEntry("userId", uid));
    }

    @Test
    void theProvisioningLogLineNamesTheTravelerByIdAndLeaksNoPii() {
        // P3: reference entities by id. The email and display name are PII and must not appear in
        // a log line just because they were convenient at the call site.
        String uid = freshUid();

        rest.get()
                .uri("/v1/me")
                .header(
                        HttpHeaders.AUTHORIZATION,
                        bearer(TestJwtSupport.tokenWithName(uid, "private@example.com", "Private Person")))
                .exchange()
                .expectStatus()
                .isOk();

        assertThat(logCapture.list)
                .filteredOn(event -> event.getFormattedMessage().contains("Traveler provisioned"))
                .singleElement()
                .satisfies(
                        event ->
                                assertThat(event.getFormattedMessage())
                                        .doesNotContain("private@example.com", "Private Person"));
    }

    private String idFrom(String token) {
        byte[] body =
                rest.get()
                        .uri("/v1/me")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .exchange()
                        .expectStatus()
                        .isOk()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent();
        String json = new String(body);
        int start = json.indexOf("\"id\":\"") + "\"id\":\"".length();
        return json.substring(start, json.indexOf('"', start));
    }

    private static String bearer(String token) {
        return "Bearer " + token;
    }

    private String freshUid() {
        return "uid-" + UUID.randomUUID();
    }

    private int rowCountFor(String firebaseUid) {
        return jdbc.queryForObject(
                "SELECT count(*) FROM traveler WHERE firebase_uid = ?", Integer.class, firebaseUid);
    }

    private static Logger rootLogger() {
        return (Logger) LoggerFactory.getLogger(org.slf4j.Logger.ROOT_LOGGER_NAME);
    }
}
