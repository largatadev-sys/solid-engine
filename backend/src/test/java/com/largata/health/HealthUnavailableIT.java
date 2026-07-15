package com.largata.health;

import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.web.servlet.client.RestTestClient;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * The DB-down half of the health contract (ticket 03): an unreachable datastore must surface as
 * 503 in the Artifact 05 envelope — never a stack trace, a Spring error page, or a raw JDBC
 * message.
 *
 * <p>Uses its own container rather than {@link com.largata.support.PostgresTestBase}'s shared one,
 * because the test deliberately kills it — a stopped container would break every other class
 * sharing it.
 */
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
    void outageResponseNamesNoInternalDetail() {
        // Already stopped by the previous test. The client must learn nothing about our topology:
        // no driver name, no host, no SQLState, no exception class.
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
