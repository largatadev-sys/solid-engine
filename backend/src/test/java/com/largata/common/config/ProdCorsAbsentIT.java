package com.largata.common.config;

import com.largata.support.PostgresTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.web.servlet.client.RestTestClient;

/**
 * No profile — what production runs. There must be no CORS policy at all.
 *
 * <p>This is the invariant that matters. {@link DevCorsConfig}'s claim that it "cannot reach prod"
 * is worth exactly as much as this test: a permissive CORS policy on the production API would let
 * any website's script call it with a traveler's credentials. An accidental profile change should
 * fail a build, not ship.
 *
 * <p>Correct today precisely because the clients are native — Expo Go, dev-builds, and release
 * builds do not enforce CORS. When the read-only web surface arrives (backlog epic), it needs a
 * real origin-pinned policy for its own domain, decided as an ADR; this test will fail then, which
 * is the intended prompt to make that decision deliberately rather than by loosening a dev rule.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ProdCorsAbsentIT extends PostgresTestBase {

    @LocalServerPort private int port;

    @Test
    void prodSendsNoCorsHeaderAtAll() {
        RestTestClient.bindToServer()
                .baseUrl("http://localhost:" + port)
                .build()
                .get()
                .uri("/v1/health")
                .header("Origin", "http://evil.example.com")
                .exchange()
                .expectStatus()
                .isOk()
                .expectHeader()
                .doesNotExist("Access-Control-Allow-Origin");
    }
}
