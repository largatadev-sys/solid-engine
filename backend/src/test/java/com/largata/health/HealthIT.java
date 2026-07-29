package com.largata.health;

import static org.assertj.core.api.Assertions.assertThat;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.junit.jupiter.api.BeforeEach;
import org.slf4j.LoggerFactory;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import com.largata.support.PostgresTestBase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.client.RestTestClient;


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class HealthIT extends PostgresTestBase {

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
        rest.get().uri("/v1/health").exchange().expectStatus().isOk();
    }

    @Test
    void healthBodyLeaksNoReconnaissanceDetail() {
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
    void successLogsExactlyOneInfoLineFromTheServiceLayer() {
        ListAppender<ILoggingEvent> capture = new ListAppender<>();
        capture.start();
        Logger root = (Logger) LoggerFactory.getLogger(org.slf4j.Logger.ROOT_LOGGER_NAME);
        root.addAppender(capture);
        try {
            rest.get().uri("/v1/health").exchange().expectStatus().isOk();

            assertThat(capture.list)
                    .filteredOn(e -> e.getLevel() == Level.INFO)
                    .filteredOn(e -> e.getLoggerName().equals(HealthService.class.getName()))
                    .hasSize(1);
        } finally {
            root.detachAppender(capture);
        }
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
        assertThat(jdbcTemplate.queryForObject("SELECT 1", Integer.class)).isEqualTo(1);
        rest.get().uri("/v1/health").exchange().expectStatus().isOk();
    }
}
