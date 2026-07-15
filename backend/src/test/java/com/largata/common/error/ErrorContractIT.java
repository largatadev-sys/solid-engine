package com.largata.common.error;

import static org.assertj.core.api.Assertions.assertThat;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.largata.support.PostgresTestBase;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.slf4j.LoggerFactory;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.client.RestTestClient;

/**
 * Ticket 03's ACs: the taxonomy maps to statuses, every failure renders the Artifact 05 envelope,
 * and the traceId in that envelope appears in exactly one log line.
 *
 * <p>Errors are raised by {@link ThrowingTestController}, which exists only in test sources.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(ThrowingTestController.Config.class)
class ErrorContractIT extends PostgresTestBase {

    private RestTestClient rest;
    private ListAppender<ILoggingEvent> logCapture;

    @LocalServerPort private int port;

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

    @ParameterizedTest(name = "{0} -> {1} {2}")
    @CsvSource({
        "not-found,    404, TEST_NOT_FOUND",
        "validation,   400, TEST_INVALID",
        "conflict,     409, TEST_CONFLICT",
        "forbidden,    403, TEST_FORBIDDEN",
        "unavailable,  503, DEPENDENCY_UNAVAILABLE",
    })
    void taxonomyCategoryMapsToStatusAndRendersTheEnvelope(String path, int status, String code) {
        rest.get()
                .uri(ThrowingTestController.BASE + "/" + path)
                .exchange()
                .expectStatus()
                .isEqualTo(status)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo(code)
                .jsonPath("$.message")
                .exists()
                .jsonPath("$.traceId")
                .exists()
                .jsonPath("$.timestamp")
                .exists();
    }

    @Test
    void envelopeCarriesExactlyTheFourContractFields() {
        // Artifact 05 defines {code, message, traceId, timestamp} — no more (no stack, no path).
        rest.get()
                .uri(ThrowingTestController.BASE + "/not-found")
                .exchange()
                .expectBody()
                .jsonPath("$.length()")
                .isEqualTo(4);
    }

    @Test
    void traceIdInTheEnvelopeAppearsInExactlyOneLogLine() {
        String traceId = traceIdOf(ThrowingTestController.BASE + "/not-found");

        List<ILoggingEvent> matching =
                logCapture.list.stream()
                        .filter(e -> traceId.equals(e.getMDCPropertyMap().get("traceId")))
                        .filter(e -> e.getLevel().isGreaterOrEqual(Level.WARN))
                        .toList();

        assertThat(matching)
                .as("exactly one warn/error line carries this traceId (log-once, P3)")
                .hasSize(1);
    }

    @Test
    void unknownRouteIs404InTheEnvelope() {
        // Regression guard. This shipped as a 500 INTERNAL_ERROR and no test noticed — every test
        // hit routes that exist. Found only by curling a nonexistent path against the composed
        // stack at the story gate, which is precisely why the gate is mandatory.
        //
        // Wrong three ways as a 500: Artifact 05's table says 404; it logs at ERROR for every
        // scanner and typo; and it leaks — a 500 for "no such route" vs a 404 for "hidden
        // resource" tells a caller which is which, when Artifact 03 wants 404 to mask that.
        rest.get()
                .uri("/v1/definitely-not-a-route")
                .exchange()
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("NOT_FOUND")
                .jsonPath("$.traceId")
                .exists()
                .jsonPath("$.length()")
                .isEqualTo(4);
    }

    @Test
    void unexpectedExceptionsAreOpaqueToTheClient() {
        // The client learns nothing: no exception type, no message, no stack (P2).
        rest.get()
                .uri(ThrowingTestController.BASE + "/unexpected")
                .exchange()
                .expectStatus()
                .isEqualTo(500)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("INTERNAL_ERROR")
                .jsonPath("$.message")
                .isEqualTo("Something went wrong.");
    }

    @Test
    void unexpectedExceptionDetailReachesTheOperatorLogButNotTheClient() {
        String body =
                new String(
                        rest.get()
                                .uri(ThrowingTestController.BASE + "/unexpected")
                                .exchange()
                                .expectBody()
                                .returnResult()
                                .getResponseBodyContent());

        assertThat(body).doesNotContain("boom", "IllegalStateException", "java.lang");
        assertThat(logCapture.list)
                .as("the operator still gets the detail, at error level")
                .anySatisfy(
                        e -> {
                            assertThat(e.getLevel()).isEqualTo(Level.ERROR);
                            assertThat(e.getThrowableProxy().getMessage()).contains("boom");
                        });
    }

    private String traceIdOf(String uri) {
        byte[] body = rest.get().uri(uri).exchange().expectBody().returnResult().getResponseBodyContent();
        String json = new String(body);
        int start = json.indexOf("\"traceId\":\"") + "\"traceId\":\"".length();
        return json.substring(start, json.indexOf('"', start));
    }

    private static Logger rootLogger() {
        return (Logger) LoggerFactory.getLogger(org.slf4j.Logger.ROOT_LOGGER_NAME);
    }
}
