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
 *
 * <p>S0.4 added the configured-origin case: the founders' preview reaches the dev environment from
 * a deployed origin this file cannot know, so the list comes from an env-var. The test that matters
 * is not that a configured origin is allowed — it is that an <em>un</em>configured one still is not
 * ({@link #devRejectsAnOriginThatIsNotConfigured}). Making the list configurable is only safe while
 * "configurable" does not quietly become "permissive".
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

    @Test
    void devRejectsAnOriginThatIsNotConfigured() {
        // The default list has no wildcard, and this is what "no wildcard" has to mean in practice.
        // Without this assertion, a future `allowedOrigins("*")` — the classic "just make the
        // preview work" edit — would leave every test above green while the dev API answered to any
        // site on the internet with a traveler's credentials attached.
        RestTestClient.bindToServer()
                .baseUrl("http://localhost:" + port)
                .build()
                .get()
                .uri("/v1/health")
                .header("Origin", "https://evil.example.com")
                .exchange()
                .expectHeader()
                .doesNotExist("Access-Control-Allow-Origin");
    }
}
