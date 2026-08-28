package com.largata.report;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.support.PostgresTestBase;
import com.largata.support.TestJwtSupport;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.client.RestTestClient;


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import({TestJwtSupport.Config.class, ReportDeliveryIT.ScriptedRelayConfig.class})
class ReportDeliveryIT extends PostgresTestBase {

    private RestTestClient rest;

    @LocalServerPort private int port;

    @Autowired private JdbcTemplate jdbc;

    @Autowired private ScriptedRelay relay;

    @Autowired private ReportDeliveryService delivery;

    @BeforeEach
    void setUp() {
        rest = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
        relay.reset();
    }


    @Test
    void aDeliveredReportKeepsItsRowAndLosesItsScreenshotBytes() throws IOException {
        UUID reportId = accept(List.of(jpeg(400, 300)));
        relay.willAnswer(RelayOutcome.delivered());

        delivery.drainDueReports();

        Map<String, Object> row = rowOf(reportId);
        assertThat(row.get("status")).isEqualTo("DELIVERED");
        assertThat(row.get("delivered_at")).isNotNull();
        assertThat(screenshotCountOf(reportId)).isZero();
    }


    @Test
    void theRelayReceivesTheAcceptTimeStampUnchangedOnARetry() throws IOException {
        UUID reportId = accept(List.of());
        Instant acceptedAt = submittedAtOf(reportId);
        relay.willAnswer(RelayOutcome.unreachable("connection refused"));
        delivery.drainDueReports();

        makeDue(reportId);
        relay.willAnswer(RelayOutcome.delivered());
        delivery.drainDueReports();

        assertThat(relay.envelopes()).hasSize(2);
        assertThat(relay.envelopes().get(0).submittedAt()).isEqualTo(acceptedAt);
        assertThat(relay.envelopes().get(1).submittedAt()).isEqualTo(acceptedAt);
        assertThat(submittedAtOf(reportId)).isEqualTo(acceptedAt);
    }


    @Test
    void aRefusalDeadLettersTheRowAndStopsFurtherAttempts() throws IOException {
        UUID reportId = accept(List.of());
        relay.willAnswer(RelayOutcome.refused("worklog answered 400"));

        delivery.drainDueReports();
        delivery.drainDueReports();

        Map<String, Object> row = rowOf(reportId);
        assertThat(row.get("status")).isEqualTo("DEAD_LETTER");
        assertThat(row.get("attempts")).isEqualTo(1);
        assertThat(relay.envelopes()).hasSize(1);
    }


    @Test
    void aDeadLetteredRowKeepsItsScreenshotBytesBecauseTheyWereNeverDelivered() throws IOException {
        UUID reportId = accept(List.of(jpeg(400, 300)));
        relay.willAnswer(RelayOutcome.refused("worklog answered 400"));

        delivery.drainDueReports();

        assertThat(screenshotCountOf(reportId)).isEqualTo(1);
    }


    @Test
    void aRefusalRecordsOnlyTheFailureDetailNeverTheTravelersWords() throws IOException {
        UUID reportId = acceptDescribing("My hotel is at 14 Rua das Flores and the map broke.");
        relay.willAnswer(RelayOutcome.refused("worklog answered 400: context.platform"));

        delivery.drainDueReports();

        String lastError = (String) rowOf(reportId).get("last_error");
        assertThat(lastError).isEqualTo("worklog answered 400: context.platform");
        assertThat(lastError).doesNotContain("Rua das Flores");
    }


    @Test
    void anUnreachableWorklogBacksTheRowOffAndKeepsItPending() throws IOException {
        UUID reportId = accept(List.of());
        relay.willAnswer(RelayOutcome.unreachable("connection refused"));

        delivery.drainDueReports();

        Map<String, Object> row = rowOf(reportId);
        assertThat(row.get("status")).isEqualTo("PENDING");
        assertThat(row.get("attempts")).isEqualTo(1);
        assertThat((Instant) toInstant(row.get("next_attempt_at")))
                .isAfter(submittedAtOf(reportId));
    }


    @Test
    void aBackedOffRowIsNotRetriedUntilItsDeadlinePasses() throws IOException {
        accept(List.of());
        relay.willAnswer(RelayOutcome.unreachable("connection refused"));
        delivery.drainDueReports();

        delivery.drainDueReports();

        assertThat(relay.envelopes()).hasSize(1);
    }


    @Test
    void aBackedOffRowIsRetriedOnceItsDeadlinePasses() throws IOException {
        UUID reportId = accept(List.of());
        relay.willAnswer(RelayOutcome.unreachable("connection refused"));
        delivery.drainDueReports();

        makeDue(reportId);
        relay.willAnswer(RelayOutcome.delivered());
        delivery.drainDueReports();

        assertThat(rowOf(reportId).get("status")).isEqualTo("DELIVERED");
        assertThat(rowOf(reportId).get("attempts")).isEqualTo(2);
    }


    @Test
    void theRelayIsHandedTheScreenshotsInTheOrderTheyWereAttached() throws IOException {
        UUID reportId = accept(List.of(jpeg(400, 300), jpeg(500, 300), jpeg(600, 300)));
        relay.willAnswer(RelayOutcome.delivered());

        delivery.drainDueReports();

        List<ReportScreenshot> handed = relay.envelopes().getFirst().screenshots();
        assertThat(handed).hasSize(3);
        assertThat(handed.stream().map(ReportScreenshot::ordinal)).containsExactly(0, 1, 2);
        assertThat(reportId).isEqualTo(relay.envelopes().getFirst().reportId());
    }


    @Test
    void anAlreadyDeliveredRowIsNeverRelayedAgain() throws IOException {
        UUID reportId = accept(List.of());
        relay.willAnswer(RelayOutcome.delivered());
        delivery.drainDueReports();

        makeDue(reportId);
        delivery.drainDueReports();

        assertThat(relay.envelopes()).hasSize(1);
    }


    @Test
    void aSignedOutReportReachesTheRelayWithNoReporterAtAll() throws IOException {
        accept(List.of());
        relay.willAnswer(RelayOutcome.delivered());

        delivery.drainDueReports();

        assertThat(relay.envelopes().getFirst().reporter()).isNull();
    }


    private UUID accept(List<byte[]> screenshots) {
        return acceptWith("Something went wrong.", screenshots);
    }


    private UUID acceptDescribing(String description) {
        return acceptWith(description, List.of());
    }


    private UUID acceptWith(String description, List<byte[]> screenshots) {
        UUID reportId = UUID.randomUUID();
        MultipartBodyBuilder body = new MultipartBodyBuilder();
        body.part(
                "report",
                "{\"reportId\":\""
                        + reportId
                        + "\",\"type\":\"problem\",\"description\":\""
                        + description
                        + "\"}");
        int index = 0;
        for (byte[] screenshot : screenshots) {
            body.part("screenshot", named(screenshot, "shot" + index++ + ".jpg"))
                    .contentType(MediaType.IMAGE_JPEG);
        }
        rest.post()
                .uri(ReportPaths.ANONYMOUS)
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(body.build())
                .exchange()
                .expectStatus()
                .isCreated();
        return reportId;
    }


    private void makeDue(UUID reportId) {
        jdbc.update(
                "UPDATE report_outbox SET next_attempt_at = now() - interval '1 hour' WHERE id = ?",
                reportId);
    }


    private Map<String, Object> rowOf(UUID reportId) {
        return jdbc.queryForMap("SELECT * FROM report_outbox WHERE id = ?", reportId);
    }


    private Instant submittedAtOf(UUID reportId) {
        return toInstant(rowOf(reportId).get("submitted_at"));
    }


    private static Instant toInstant(Object timestamp) {
        return ((java.sql.Timestamp) timestamp).toInstant();
    }


    private int screenshotCountOf(UUID reportId) {
        return jdbc.queryForObject(
                "SELECT count(*) FROM report_screenshot WHERE report_id = ?", Integer.class, reportId);
    }


    private static ByteArrayResource named(byte[] bytes, String filename) {
        return new ByteArrayResource(bytes) {
            @Override
            public String getFilename() {
                return filename;
            }
        };
    }


    private static byte[] jpeg(int width, int height) throws IOException {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D pen = image.createGraphics();
        pen.setColor(Color.CYAN);
        pen.fillRect(0, 0, width, height);
        pen.dispose();
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        ImageIO.write(image, "jpeg", bytes);
        return bytes.toByteArray();
    }


    static class ScriptedRelay implements ReportRelay {

        private final Deque<RelayOutcome> scripted = new ArrayDeque<>();
        private final List<RelayEnvelope> seen = new ArrayList<>();

        void willAnswer(RelayOutcome outcome) {
            scripted.addLast(outcome);
        }

        void reset() {
            scripted.clear();
            seen.clear();
        }

        List<RelayEnvelope> envelopes() {
            return List.copyOf(seen);
        }

        @Override
        public RelayOutcome relay(RelayEnvelope envelope) {
            seen.add(envelope);
            RelayOutcome next = scripted.pollFirst();
            return next == null ? RelayOutcome.unreachable("nothing scripted") : next;
        }
    }


    @TestConfiguration
    static class ScriptedRelayConfig {

        @Bean
        @Primary
        ScriptedRelay scriptedRelay() {
            return new ScriptedRelay();
        }
    }
}
