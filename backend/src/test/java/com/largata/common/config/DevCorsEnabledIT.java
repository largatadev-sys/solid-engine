package com.largata.common.config;

import com.largata.support.PostgresTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.client.RestTestClient;

/**
 * With the dev profile active, browser origins are allowed — the half of {@link DevCorsConfig} that
 * makes browser-based development and the founders' preview possible.
 *
 * <p>Paired with {@link ProdCorsAbsentIT}, which proves the other half: that this never reaches
 * production. Both are top-level {@code *IT} classes because Failsafe matches on the outer class
 * name — nested static classes are silently skipped, which looks exactly like passing.
 *
 * <p>The load-bearing case S0.4 added is {@link #preflightToASecuredEndpointIsAllowedBeforeAuth}: a
 * browser's preflight {@code OPTIONS} to a <em>secured</em> endpoint must be answered with CORS
 * headers <em>before</em> authentication rejects it. The earlier CORS setup handled this at the MVC
 * layer, behind Spring Security, so the preflight was 401'd with no CORS header and the browser
 * blocked the real request — invisible until a browser first hit a secured endpoint (the web
 * preview). The other tests here would all pass against that broken setup; this one would not.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("dev")
class DevCorsEnabledIT extends PostgresTestBase {

    @LocalServerPort private int port;

    private RestTestClient client() {
        return RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
    }

    @Test
    void devAllowsTheExpoWebOrigin() {
        client()
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
    void preflightToASecuredEndpointIsAllowedBeforeAuth() {
        // The exact request the browser sends before GET /v1/itineraries: an unauthenticated OPTIONS
        // carrying the CORS preflight headers. It must come back allowed (2xx) with the origin
        // echoed — NOT 401 — because Spring Security's CORS filter answers it ahead of the auth
        // check. This is the regression guard for the S0.4 preflight bug.
        client()
                .options()
                .uri("/v1/itineraries")
                .header("Origin", "http://localhost:3000")
                .header("Access-Control-Request-Method", "GET")
                .header("Access-Control-Request-Headers", "authorization")
                .exchange()
                .expectStatus()
                .is2xxSuccessful()
                .expectHeader()
                .valueEquals("Access-Control-Allow-Origin", "http://localhost:3000");
    }

    @Test
    void devRejectsAnOriginThatIsNotConfigured() {
        // The allow-list has no wildcard, and this is what "no wildcard" has to mean in practice.
        // Without this, a future `setAllowedOrigins(List.of("*"))` — the classic "just make the
        // preview work" edit — would leave every test above green while the dev API answered to any
        // site on the internet with a traveler's credentials attached.
        client()
                .get()
                .uri("/v1/health")
                .header("Origin", "https://evil.example.com")
                .exchange()
                .expectHeader()
                .doesNotExist("Access-Control-Allow-Origin");
    }
}
