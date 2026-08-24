package com.largata.common.security;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.time.Instant;
import java.util.Date;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.client.RestTestClient;
import org.testcontainers.postgresql.PostgreSQLContainer;


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class JwksOutageToleranceIT {

    private static final String ISSUER = "https://securetoken.google.com/largata-jwks-it";
    private static final String KEY_ID = "jwks-it-signing-key";

    private static final PostgreSQLContainer POSTGRES =
            new PostgreSQLContainer("postgres:18-alpine");

    static {
        POSTGRES.start();
    }

    private static final KeyPair KEY_PAIR = generateKeyPair();
    private static final HttpServer JWKS_SERVER = startJwksServer();
    private static volatile boolean keyServerDown = false;

    @LocalServerPort private int port;

    private RestTestClient rest;

    @DynamicPropertySource
    static void jwks(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.datasource.hikari.maximum-pool-size", () -> 4);
        registry.add(
                "largata.auth.jwks.uri",
                () -> "http://localhost:" + JWKS_SERVER.getAddress().getPort() + "/jwks");
        registry.add("largata.auth.jwks.cache-ttl", () -> "PT1S");
        registry.add("largata.auth.jwks.refresh-ahead", () -> "PT0.5S");
        registry.add("largata.auth.jwks.outage-tolerance", () -> "PT1H");
        registry.add("spring.security.oauth2.resourceserver.jwt.issuer-uri", () -> ISSUER);
    }

    @BeforeEach
    void setUp() {
        keyServerDown = false;
        rest = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
    }

    @Test
    void tokensStillVerifyWhileTheKeyServerIsDown() throws Exception {
        expectStatus(token(KEY_PAIR), 200);

        keyServerDown = true;
        Thread.sleep(1_500);

        expectStatus(token(KEY_PAIR), 200);
    }

    @Test
    void staleKeysStillRejectAForeignSignature() throws Exception {
        expectStatus(token(KEY_PAIR), 200);

        keyServerDown = true;
        Thread.sleep(1_500);

        expectStatus(token(generateKeyPair()), 401);
    }

    private void expectStatus(String token, int status) {
        rest.get()
                .uri("/v1/itineraries")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .exchange()
                .expectStatus()
                .isEqualTo(status);
    }

    private static String token(KeyPair signedWith) throws Exception {
        Instant now = Instant.now();
        SignedJWT jwt =
                new SignedJWT(
                        new JWSHeader.Builder(JWSAlgorithm.RS256).keyID(KEY_ID).build(),
                        new JWTClaimsSet.Builder()
                                .subject("uid-jwks-outage")
                                .issuer(ISSUER)
                                .audience("largata-jwks-it")
                                .claim("email", "jwks-outage@example.com")
                                .issueTime(Date.from(now))
                                .expirationTime(Date.from(now.plusSeconds(3600)))
                                .build());
        jwt.sign(new RSASSASigner((RSAPrivateKey) signedWith.getPrivate()));
        return jwt.serialize();
    }

    private static HttpServer startJwksServer() {
        try {
            RSAKey key =
                    new RSAKey.Builder((RSAPublicKey) KEY_PAIR.getPublic()).keyID(KEY_ID).build();
            byte[] body = new JWKSet(key).toString().getBytes(StandardCharsets.UTF_8);

            HttpServer server = HttpServer.create(new InetSocketAddress(0), 0);
            server.createContext(
                    "/jwks",
                    exchange -> {
                        if (keyServerDown) {
                            exchange.sendResponseHeaders(503, -1);
                        } else {
                            exchange.getResponseHeaders().add("Content-Type", "application/json");
                            exchange.sendResponseHeaders(200, body.length);
                            exchange.getResponseBody().write(body);
                        }
                        exchange.close();
                    });
            server.start();
            return server;
        } catch (Exception e) {
            throw new IllegalStateException("could not start the stub JWKS server", e);
        }
    }

    private static KeyPair generateKeyPair() {
        try {
            KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
            generator.initialize(2048);
            return generator.generateKeyPair();
        } catch (Exception e) {
            throw new IllegalStateException("could not generate a test keypair", e);
        }
    }
}
