package com.largata.health;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import com.largata.support.PostgresTestBase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.client.RestTestClient;

/**
 * Ticket 02's ACs, proven against real Postgres (Testcontainers — see {@link PostgresTestBase}).
 *
 * <p>Exercised over real HTTP against the running server, not MockMvc: the point of the walking
 * skeleton is that the whole path works, servlet container included.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class HealthIT extends PostgresTestBase {

    // Boot 4 removed TestRestTemplate; RestTestClient is Framework 7's servlet-side successor and
    // is not auto-configured as a bean, so it is built here against the random port.
    private RestTestClient rest;

    @Autowired private JdbcTemplate jdbcTemplate;
    @LocalServerPort private int port;

    @BeforeEach
    void bindClient() {
        rest = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
    }

    @Test
    void healthReturnsOkThroughTheWholeStack() {
        rest.get()
                .uri("/v1/health")
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.status")
                .isEqualTo("ok");
    }

    @Test
    void healthNeedsNoAuthentication() {
        // A bare request with no Authorization header must succeed: a health check that needs
        // auth cannot distinguish "auth is broken" from "everything is broken".
        rest.get().uri("/v1/health").exchange().expectStatus().isOk();
    }

    @Test
    void healthBodyLeaksNoReconnaissanceDetail() {
        // Minimal by design (spec Q7b): no version, commit, uptime, or component breakdown.
        rest.get()
                .uri("/v1/health")
                .exchange()
                .expectBody()
                .jsonPath("$.length()")
                .isEqualTo(1)
                .jsonPath("$.status")
                .exists();
    }

    @Test
    void flywayRanOnBootAndRecordedTheBaseline() {
        Integer applied =
                jdbcTemplate.queryForObject(
                        "SELECT COUNT(*) FROM flyway_schema_history WHERE version = '1' AND success = true",
                        Integer.class);

        assertThat(applied).isEqualTo(1);
    }

    @Test
    void healthPathReachesTheDatabase() {
        // Proves the round-trip is real rather than a constant: with the DB answering, health is
        // OK; HealthUnavailableIT covers the converse.
        assertThat(jdbcTemplate.queryForObject("SELECT 1", Integer.class)).isEqualTo(1);
        rest.get().uri("/v1/health").exchange().expectStatus().isOk();
    }
}
