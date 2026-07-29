package com.largata.common.config;

import com.largata.support.PostgresTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.client.RestTestClient;


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
        client()
                .get()
                .uri("/v1/health")
                .header("Origin", "https://evil.example.com")
                .exchange()
                .expectHeader()
                .doesNotExist("Access-Control-Allow-Origin");
    }
}
