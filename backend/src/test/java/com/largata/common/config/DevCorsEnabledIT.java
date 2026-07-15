package com.largata.common.config;

import com.largata.support.PostgresTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.client.RestTestClient;

/**
 * With the dev profile active, the Expo web dev-server origin is allowed — the half of
 * {@link DevCorsConfig} that makes browser-based development possible.
 *
 * <p>Paired with {@link ProdCorsAbsentIT}, which proves the other half: that this never reaches
 * production. Both are top-level {@code *IT} classes because Failsafe matches on the outer class
 * name — nested static classes are silently skipped, which looks exactly like passing.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("dev")
class DevCorsEnabledIT extends PostgresTestBase {

    @LocalServerPort private int port;

    @Test
    void devAllowsTheExpoWebOrigin() {
        RestTestClient.bindToServer()
                .baseUrl("http://localhost:" + port)
                .build()
                .get()
                .uri("/v1/health")
                .header("Origin", "http://localhost:8081")
                .exchange()
                .expectStatus()
                .isOk()
                .expectHeader()
                .valueEquals("Access-Control-Allow-Origin", "http://localhost:8081");
    }
}
