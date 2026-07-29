package com.largata.health;

import static org.assertj.core.api.Assertions.assertThat;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import java.util.List;
import org.junit.jupiter.api.MethodOrderer;
import org.slf4j.LoggerFactory;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.web.servlet.client.RestTestClient;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class HealthUnavailableIT {

    @Container
    @org.springframework.boot.testcontainers.service.connection.ServiceConnection
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:17-alpine");

    @LocalServerPort private int port;

    private RestTestClient rest() {
        return RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
    }

    @Test
    @Order(1)
    void healthIsOkWhileTheDatabaseAnswers() {
        rest().get().uri("/v1/health").exchange().expectStatus().isOk();
    }

    @Test
    @Order(2)
    void databaseOutageSurfacesAs503InTheEnvelope() {
        POSTGRES.stop();

        rest().get()
                .uri("/v1/health")
                .exchange()
                .expectStatus()
                .isEqualTo(503)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("DEPENDENCY_UNAVAILABLE")
                .jsonPath("$.traceId")
                .exists()
                .jsonPath("$.length()")
                .isEqualTo(4);
    }

    @Test
    @Order(3)
    void theOutageIsLoggedExactlyOnce() {
        ListAppender<ILoggingEvent> capture = new ListAppender<>();
        capture.start();
        Logger root = (Logger) LoggerFactory.getLogger(org.slf4j.Logger.ROOT_LOGGER_NAME);
        root.addAppender(capture);
        try {
            rest().get().uri("/v1/health").exchange().expectStatus().isEqualTo(503);

            List<ILoggingEvent> failureLines =
                    capture.list.stream()
                            .filter(e -> e.getLevel().isGreaterOrEqual(Level.WARN))
                            .filter(e -> e.getFormattedMessage().contains("DEPENDENCY_UNAVAILABLE"))
                            .toList();

            assertThat(failureLines).hasSize(1);
            assertThat(failureLines.getFirst().getThrowableProxy())
                    .as("the operator still gets the cause — it rides the exception, not a second log line")
                    .isNotNull();
        } finally {
            root.detachAppender(capture);
        }
    }

    @Test
    @Order(4)
    void outageResponseNamesNoInternalDetail() {
        String body =
                new String(
                        rest().get()
                                .uri("/v1/health")
                                .exchange()
                                .expectBody()
                                .returnResult()
                                .getResponseBodyContent());

        org.assertj.core.api.Assertions.assertThat(body)
                .doesNotContainIgnoringCase("postgres", "jdbc", "hikari", "sqlstate", "exception", "connection");
    }
}
