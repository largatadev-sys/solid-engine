package com.largata.verification.web;

import static org.assertj.core.api.Assertions.assertThat;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.largata.support.PostgresTestBase;
import com.largata.support.TestJwtSupport;
import com.largata.verification.EmailVerificationFlag;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.slf4j.LoggerFactory;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.client.RestTestClient;


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("dev")
@Import(TestJwtSupport.Config.class)
class VerificationContractIT extends PostgresTestBase {

    private static final Pattern CODE_IN_SINK_LOG = Pattern.compile("code=(\\d{6})");

    private RestTestClient rest;
    private ListAppender<ILoggingEvent> logCapture;

    @LocalServerPort private int port;

    @MockitoBean private EmailVerificationFlag flag;

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

    @Test
    void issuingReturnsTheExpiryAndTheMomentAResendBecomesAvailable() {
        String token = unverified(freshUid());

        rest.post()
                .uri("/v1/verification-codes")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange()
                .expectStatus()
                .isCreated()
                .expectBody()
                .jsonPath("$.expiresAt")
                .exists()
                .jsonPath("$.resendAvailableAt")
                .exists()
                .jsonPath("$.length()")
                .isEqualTo(2);
    }

    @Test
    void theKeylessSinkPutsTheCodeInTheBackendLogWhichIsHowALocalRungReadsIt() {
        String token = unverified(freshUid());

        issue(token);

        assertThat(codeFromSinkLog()).matches("\\d{6}");
    }

    @Test
    void theRightCodeIsConfirmedAndTheClaimIsFlippedThroughTheSeam() {
        String uid = freshUid();
        String token = unverified(uid);
        issue(token);

        rest.post()
                .uri("/v1/verification-codes/confirm")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body(codeBody(codeFromSinkLog()))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.verified")
                .isEqualTo(true);

        Mockito.verify(flag).markVerified(uid);
    }

    @Test
    void aWrongCodeIsFourHundredWithATypedCode() {
        String token = unverified(freshUid());
        issue(token);

        confirm(token, wrongCodeOtherThan(codeFromSinkLog()))
                .expectStatus()
                .isBadRequest()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("VERIFICATION_CODE_INCORRECT");
    }

    @Test
    void confirmingWithNoCodeOutstandingIsFourHundredAndNineWithATypedCode() {
        confirm(unverified(freshUid()), "123456")
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("VERIFICATION_CODE_NOT_ISSUED");
    }

    @Test
    void aResendInsideTheCooldownIsFourHundredAndNineWithATypedCode() {
        String token = unverified(freshUid());
        issue(token);

        rest.post()
                .uri("/v1/verification-codes")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange()
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("VERIFICATION_RESEND_TOO_SOON");
    }

    @Test
    void anAlreadyVerifiedTravelerIsRefusedACodeRatherThanQuietlyMailingOne() {
        rest.post()
                .uri("/v1/verification-codes")
                .header(
                        HttpHeaders.AUTHORIZATION,
                        bearer(TestJwtSupport.verifiedToken(freshUid(), "already@example.com")))
                .exchange()
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("EMAIL_ALREADY_VERIFIED");
    }

    @Test
    void aBlankCodeIsRejectedByValidationBeforeItReachesTheDomain() {
        confirm(unverified(freshUid()), "   ")
                .expectStatus()
                .isBadRequest()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("VALIDATION_FAILED");
    }

    @Test
    void anUnauthenticatedCallerCannotAskForACode() {
        rest.post().uri("/v1/verification-codes").exchange().expectStatus().isUnauthorized();
    }

    private void issue(String token) {
        logCapture.list.clear();
        rest.post()
                .uri("/v1/verification-codes")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange()
                .expectStatus()
                .isCreated();
    }

    private RestTestClient.ResponseSpec confirm(String token, String code) {
        return rest.post()
                .uri("/v1/verification-codes/confirm")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body(codeBody(code))
                .exchange();
    }

    private static String codeBody(String code) {
        return "{\"code\":\"" + code + "\"}";
    }

    private String codeFromSinkLog() {
        return logCapture.list.stream()
                .map(ILoggingEvent::getFormattedMessage)
                .map(CODE_IN_SINK_LOG::matcher)
                .filter(Matcher::find)
                .map(matcher -> matcher.group(1))
                .findFirst()
                .orElseThrow(() -> new AssertionError("the logging sink printed no code"));
    }

    private static String wrongCodeOtherThan(String correct) {
        return correct.equals("000000") ? "111111" : "000000";
    }

    private static String unverified(String uid) {
        return TestJwtSupport.unverifiedToken(uid, "fresh-" + uid + "@example.com");
    }

    private static String bearer(String token) {
        return "Bearer " + token;
    }

    private static String freshUid() {
        return "uid-" + UUID.randomUUID();
    }

    private static Logger rootLogger() {
        return (Logger) LoggerFactory.getLogger(org.slf4j.Logger.ROOT_LOGGER_NAME);
    }
}
