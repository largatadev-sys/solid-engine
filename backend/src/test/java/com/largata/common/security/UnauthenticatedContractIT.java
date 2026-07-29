package com.largata.common.security;

import static org.assertj.core.api.Assertions.assertThat;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.largata.support.PostgresTestBase;
import com.largata.support.TestJwtSupport;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.slf4j.LoggerFactory;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.client.RestTestClient;


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import({TestJwtSupport.Config.class, ForbiddenTestController.Config.class})
class UnauthenticatedContractIT extends PostgresTestBase {

    private RestTestClient rest;
    private ListAppender<ILoggingEvent> logCapture;

    @LocalServerPort private int port;

    @BeforeEach
    void setUp() {
        rest = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
        logCapture = new ListAppender<>();
        logCapture.start();
        rootLogger().addAppender(logCapture);
    }

    @AfterEach
    void tearDown() {
        rootLogger().detachAppender(logCapture);
    }


    static List<org.junit.jupiter.params.provider.Arguments> rejectedTokens() {
        return List.of(
                org.junit.jupiter.params.provider.Arguments.of("no token at all", (String) null),
                org.junit.jupiter.params.provider.Arguments.of("expired", TestJwtSupport.expiredToken("uid-expired")),
                org.junit.jupiter.params.provider.Arguments.of(
                        "signed by an untrusted key", TestJwtSupport.foreignlySignedToken("uid-forged")),
                org.junit.jupiter.params.provider.Arguments.of("not a JWT at all", "utter-garbage"));
    }

    @ParameterizedTest(name = "{0} -> 401 UNAUTHENTICATED")
    @MethodSource("rejectedTokens")
    void everyRejectionRendersTheStandardEnvelope(String flavor, String token) {
        var request = rest.get().uri("/v1/me");
        if (token != null) {
            request = request.header(HttpHeaders.AUTHORIZATION, "Bearer " + token);
        }

        request.exchange()
                .expectStatus()
                .isUnauthorized()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("UNAUTHENTICATED")
                .jsonPath("$.message")
                .exists()
                .jsonPath("$.traceId")
                .exists()
                .jsonPath("$.timestamp")
                .exists()
                .jsonPath("$.length()")
                .isEqualTo(4);
    }

    @Test
    void theEnvelopeCarriesATraceIdThatIsNotBlank() {
        String traceId = traceIdOf();

        assertThat(traceId).as("traceId in the 401 envelope (LogContextFilter runs first)").isNotBlank();
    }

    @Test
    void theRejectionIsLoggedOnceAndWithoutAUserId() {
        String traceId = traceIdOf();

        List<ILoggingEvent> matching =
                logCapture.list.stream()
                        .filter(e -> traceId.equals(e.getMDCPropertyMap().get("traceId")))
                        .filter(e -> e.getLevel().isGreaterOrEqual(Level.WARN))
                        .toList();

        assertThat(matching).as("log-once (P3): exactly one warn line for this rejection").hasSize(1);
        assertThat(matching.getFirst().getMDCPropertyMap()).doesNotContainKey("userId");
    }

    @Test
    void authenticatedButNotPermittedIs403Forbidden_not401() {
        rest.get()
                .uri(ForbiddenTestController.PATH)
                .header(
                        HttpHeaders.AUTHORIZATION,
                        "Bearer " + TestJwtSupport.tokenFor("uid-forbidden", "forbidden@example.com"))
                .exchange()
                .expectStatus()
                .isForbidden()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("FORBIDDEN")
                .jsonPath("$.traceId")
                .exists()
                .jsonPath("$.length()")
                .isEqualTo(4);
    }

    @Test
    void anUnknownRouteIs401ToAnAnonymousCaller_not404() {
        rest.get()
                .uri("/v1/definitely-not-a-route")
                .exchange()
                .expectStatus()
                .isUnauthorized()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("UNAUTHENTICATED");
    }

    @Test
    void healthStaysPublic() {
        rest.get().uri("/v1/health").exchange().expectStatus().isOk();
    }

    @Test
    void aValidTokenReachesTheControllerLayer() {
        rest.get()
                .uri("/v1/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + TestJwtSupport.tokenFor("uid-valid", "valid@example.com"))
                .exchange()
                .expectStatus()
                .isOk();
    }

    private String traceIdOf() {
        byte[] body = rest.get().uri("/v1/me").exchange().expectBody().returnResult().getResponseBodyContent();
        String json = new String(body);
        int start = json.indexOf("\"traceId\":\"") + "\"traceId\":\"".length();
        return json.substring(start, json.indexOf('"', start));
    }

    private static Logger rootLogger() {
        return (Logger) LoggerFactory.getLogger(org.slf4j.Logger.ROOT_LOGGER_NAME);
    }
}
