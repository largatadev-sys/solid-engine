package com.largata.report;

import static org.assertj.core.api.Assertions.assertThat;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;


class WorklogReportRelayIT {

    private static final String SECRET = "a-long-random-value-for-the-test-only";

    private HttpServer worklog;
    private final AtomicReference<String> receivedBody = new AtomicReference<>();
    private final AtomicReference<String> receivedSecret = new AtomicReference<>();
    private final AtomicReference<String> receivedContentType = new AtomicReference<>();
    private final AtomicInteger answerWith = new AtomicInteger(201);

    @BeforeEach
    void startWorklog() throws IOException {
        worklog = HttpServer.create(new InetSocketAddress(0), 0);
        worklog.createContext("/api/intake/reports", this::record);
        worklog.start();
    }


    @AfterEach
    void stopWorklog() {
        worklog.stop(0);
    }


    @Test
    void theReportJsonTravelsAsAFilePartBecauseWorklogRejectsABareField() {
        relay().relay(envelope(List.of()));

        assertThat(partHeadersOf("report"))
                .contains("filename=")
                .contains("name=\"report\"");
    }


    @Test
    void theSharedSecretRidesItsOwnHeader() {
        relay().relay(envelope(List.of()));

        assertThat(receivedSecret.get()).isEqualTo(SECRET);
    }


    @Test
    void theRequestIsMultipartFormData() {
        relay().relay(envelope(List.of()));

        assertThat(receivedContentType.get()).startsWith("multipart/form-data");
    }


    @Test
    void theJsonCarriesWorklogsContractShape() {
        UUID reportId = UUID.randomUUID();
        Instant submittedAt = Instant.parse("2026-08-28T09:15:30Z");

        relay()
                .relay(
                        new RelayEnvelope(
                                reportId,
                                ReportType.PROBLEM,
                                "The map never loads.",
                                "Home feed · (tabs)/(home)",
                                "1.4.0",
                                "android",
                                new Reporter(UUID.randomUUID(), "Maya Ocampo"),
                                submittedAt,
                                List.of()));

        String json = receivedBody.get();
        assertThat(json).contains("\"reportId\":\"" + reportId + "\"");
        assertThat(json).contains("\"type\":\"problem\"");
        assertThat(json).contains("\"description\":\"The map never loads.\"");
        assertThat(json).contains("\"submittedAt\":\"" + submittedAt + "\"");
        assertThat(json).contains("\"context\":{");
        assertThat(json).contains("\"platform\":\"android\"");
        assertThat(json).contains("\"appVersion\":\"1.4.0\"");
        assertThat(json).contains("\"screen\":\"Home feed");
        assertThat(json).contains("\"reporter\":{");
    }


    @Test
    void theContextAlwaysCarriesPlatformAndAppVersionBecauseWorklogRequiresThem() {
        relay().relay(envelope(List.of()));

        String json = receivedBody.get();
        assertThat(json).contains("\"platform\":\"web\"");
        assertThat(json).contains("\"appVersion\":\"0.1.0\"");
        assertThat(json).doesNotContain("\"platform\":null");
        assertThat(json).doesNotContain("\"appVersion\":null");
    }


    @Test
    void anAbsentScreenIsSimplyOmittedBecauseWorklogTreatsItAsOptional() {
        relay().relay(envelope(List.of()));

        assertThat(receivedBody.get()).doesNotContain("\"screen\"");
    }


    @Test
    void aSignedOutReportSendsNoReporterObjectAtAll() {
        relay().relay(envelope(List.of()));

        assertThat(receivedBody.get()).doesNotContain("\"reporter\"");
    }


    @Test
    void screenshotsRideAsTheirOwnParts() {
        relay()
                .relay(
                        envelope(
                                List.of(
                                        ReportScreenshot.of(UUID.randomUUID(), 0, "image/jpeg", "first".getBytes(StandardCharsets.UTF_8)),
                                        ReportScreenshot.of(UUID.randomUUID(), 1, "image/jpeg", "second".getBytes(StandardCharsets.UTF_8)))));

        String body = receivedBody.get();
        assertThat(occurrencesOf(body, "name=\"screenshot\"")).isEqualTo(2);
        assertThat(body).contains("first").contains("second");
    }


    @Test
    void aCreatedAnswerIsDelivered() {
        answerWith.set(201);

        assertThat(relay().relay(envelope(List.of())).verdict())
                .isEqualTo(RelayOutcome.Verdict.DELIVERED);
    }


    @Test
    void aReplayAnswerIsAlsoDelivered() {
        answerWith.set(200);

        assertThat(relay().relay(envelope(List.of())).verdict())
                .isEqualTo(RelayOutcome.Verdict.DELIVERED);
    }


    @Test
    void aValidationRefusalIsPermanent() {
        answerWith.set(400);

        assertThat(relay().relay(envelope(List.of())).verdict())
                .isEqualTo(RelayOutcome.Verdict.REFUSED);
    }


    @Test
    void aWrongSecretIsPermanentRatherThanRetriedForever() {
        answerWith.set(401);

        assertThat(relay().relay(envelope(List.of())).verdict())
                .isEqualTo(RelayOutcome.Verdict.REFUSED);
    }


    @Test
    void aPlatformWakingFromSleepIsRetriedRatherThanDeadLettered() {
        answerWith.set(408);

        assertThat(relay().relay(envelope(List.of())).verdict())
                .isEqualTo(RelayOutcome.Verdict.UNREACHABLE);
    }


    @Test
    void anEdgeRateLimitIsRetriedRatherThanCostingTheReport() {
        answerWith.set(429);

        assertThat(relay().relay(envelope(List.of())).verdict())
                .isEqualTo(RelayOutcome.Verdict.UNREACHABLE);
    }


    @Test
    void aGatewayErrorFromASleepingPlatformIsRetryable() {
        answerWith.set(502);

        assertThat(relay().relay(envelope(List.of())).verdict())
                .isEqualTo(RelayOutcome.Verdict.UNREACHABLE);
    }


    @Test
    void anOutageIsRetryable() {
        answerWith.set(503);

        assertThat(relay().relay(envelope(List.of())).verdict())
                .isEqualTo(RelayOutcome.Verdict.UNREACHABLE);
    }


    @Test
    void anUnreachableHostIsRetryableRatherThanFatal() {
        WorklogReportRelay offline =
                new WorklogReportRelay(
                        WorklogReportRelay.statedTransport(),
                        "http://localhost:1/api/intake/reports",
                        SECRET,
                        new ObjectMapper());

        assertThat(offline.relay(envelope(List.of())).verdict())
                .isEqualTo(RelayOutcome.Verdict.UNREACHABLE);
    }


    @Test
    void theSecretNeverAppearsInTheFailureDetail() {
        answerWith.set(401);

        RelayOutcome outcome = relay().relay(envelope(List.of()));

        assertThat(outcome.detail()).doesNotContain(SECRET);
    }


    private WorklogReportRelay relay() {
        return new WorklogReportRelay(
                WorklogReportRelay.statedTransport(), intakeUrl(), SECRET, new ObjectMapper());
    }


    private String intakeUrl() {
        return "http://localhost:" + worklog.getAddress().getPort() + "/api/intake/reports";
    }


    private static RelayEnvelope envelope(List<ReportScreenshot> screenshots) {
        return new RelayEnvelope(
                UUID.randomUUID(),
                ReportType.PROBLEM,
                "Something went wrong.",
                null,
                "0.1.0",
                "web",
                null,
                Instant.parse("2026-08-28T09:15:30Z"),
                screenshots);
    }


    private void record(HttpExchange exchange) {
        try (exchange) {
            receivedSecret.set(exchange.getRequestHeaders().getFirst(WorklogReportRelay.SECRET_HEADER));
            receivedContentType.set(exchange.getRequestHeaders().getFirst("Content-Type"));
            receivedBody.set(
                    new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            byte[] answer = "{}".getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(answerWith.get(), answer.length);
            exchange.getResponseBody().write(answer);
        } catch (IOException unwritable) {
            throw new UncheckedIOException(unwritable);
        }
    }


    private String partHeadersOf(String partName) {
        String body = receivedBody.get();
        int at = body.indexOf("name=\"" + partName + "\"");
        assertThat(at).as("the %s part must be present", partName).isGreaterThanOrEqualTo(0);
        int lineStart = body.lastIndexOf("Content-Disposition", at);
        return body.substring(lineStart, body.indexOf("\r\n\r\n", at));
    }


    private static int occurrencesOf(String haystack, String needle) {
        int count = 0;
        int at = haystack.indexOf(needle);
        while (at >= 0) {
            count++;
            at = haystack.indexOf(needle, at + needle.length());
        }
        return count;
    }
}
