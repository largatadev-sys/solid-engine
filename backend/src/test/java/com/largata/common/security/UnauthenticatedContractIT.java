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

/**
 * Ticket 01's ACs: rejection at the security filter chain still speaks the Artifact 05 envelope.
 *
 * <p>This is the half no {@code @RestControllerAdvice} can reach — the request never gets to a
 * controller, so {@code GlobalExceptionHandler} never sees it. Left at Spring Security's defaults
 * the response is an envelope-less 401, and the client's one branching rule ("branch on {@code
 * code}") has nothing to branch on.
 */
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

    /**
     * One code for every flavor of "not authenticated" (spec, decision 7). The client's reaction is
     * identical in each case — refresh the token or go to sign-in — so a finer taxonomy would only
     * tell a prober which of their guesses was closer.
     */
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
                // Artifact 05 defines exactly four fields — the entry point must not invent a fifth.
                .jsonPath("$.length()")
                .isEqualTo(4);
    }

    @Test
    void theEnvelopeCarriesATraceIdThatIsNotBlank() {
        // Proves ordering, not just presence: LogContextFilter must run BEFORE the security chain,
        // or the entry point renders with an empty MDC and the traceId is null. Ordering is the
        // whole reason this assertion exists.
        String traceId = traceIdOf();

        assertThat(traceId).as("traceId in the 401 envelope (LogContextFilter runs first)").isNotBlank();
    }

    @Test
    void theRejectionIsLoggedOnceAndWithoutAUserId() {
        // userId is unknowable here by definition — there is no authenticated principal. An entry
        // point that invented one (from an unverified token's claims) would be logging attacker-
        // supplied data as if it were identity.
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
        // The distinction Artifact 05 draws: 401 is "who are you?", 403 is "known, but not
        // permitted". Telling a traveler UNAUTHENTICATED when they are perfectly authenticated
        // sends them to sign in again — which fixes nothing and costs them their session.
        //
        // This test exists because the bug it catches was invisible: the deny handler was wired to
        // the 401 entry point, and no route could produce a 403 to reveal it. S0.3's guard — the
        // first real 403 — would have inherited the wrong status, frozen by ADR-008's
        // additive-only rule before it was ever reachable. Hence ForbiddenTestController.
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
    void healthStaysPublic() {
        // S0.1's contract, unchanged: the stack smoke job and any platform probe reach it without
        // a token. Securing it would break the CI smoke job silently.
        rest.get().uri("/v1/health").exchange().expectStatus().isOk();
    }

    @Test
    void aValidTokenReachesTheControllerLayer() {
        // The positive control: the same filter chain that rejects the four flavors above lets a
        // properly signed token through. Without this, every assertion here would still pass if
        // the app simply rejected everything.
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
