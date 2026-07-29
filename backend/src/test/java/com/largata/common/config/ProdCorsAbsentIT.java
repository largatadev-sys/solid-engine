package com.largata.common.config;

import com.largata.support.PostgresTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.web.servlet.client.RestTestClient;


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
