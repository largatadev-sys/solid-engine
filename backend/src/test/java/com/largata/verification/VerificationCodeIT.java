package com.largata.verification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;
import static org.mockito.Mockito.verify;

import com.largata.identity.web.VerifiedContact;
import com.largata.support.MutableClock;
import com.largata.support.PostgresTestBase;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;


@SpringBootTest
@Import(VerificationCodeIT.Doubles.class)
class VerificationCodeIT extends PostgresTestBase {

    private static final VerifiedContact UNVERIFIED = new VerifiedContact("t1@example.com", false);

    @Autowired private VerificationService verification;
    @Autowired private MutableClock clock;
    @Autowired private RecordingVerificationMailer mailer;
    @Autowired private JdbcTemplate jdbc;

    @MockitoBean private EmailVerificationFlag flag;

    @Test
    void aCorrectCodeFlipsTheClaimThroughTheAdminSdkSeamAndConsumesTheCode() {
        UUID travelerId = UUID.randomUUID();

        verification.issue(travelerId, UNVERIFIED);
        verification.confirm(travelerId, "uid-" + travelerId, mailer.lastCode());

        verify(flag).markVerified("uid-" + travelerId);
        assertThat(storedRowsFor(travelerId)).isZero();
    }

    @Test
    void theStoredCodeIsAHashAndNotTheCodeItself() {
        UUID travelerId = UUID.randomUUID();

        verification.issue(travelerId, UNVERIFIED);

        assertThat(storedHashFor(travelerId)).isNotEqualTo(mailer.lastCode()).doesNotContain(mailer.lastCode());
    }

    @Test
    void aWrongCodeIsRefusedAndTheCodeSurvivesForAnotherTry() {
        UUID travelerId = UUID.randomUUID();
        verification.issue(travelerId, UNVERIFIED);
        String correct = mailer.lastCode();

        assertThatExceptionOfType(VerificationExceptions.CodeIncorrectException.class)
                .isThrownBy(() -> verification.confirm(travelerId, "uid", wrongCodeOtherThan(correct)));

        assertThatCode(() -> verification.confirm(travelerId, "uid", correct)).doesNotThrowAnyException();
    }

    @Test
    void aFailedAttemptSurvivesItsOwnRejectionSoTheCapCanEverBeReached() {
        UUID travelerId = UUID.randomUUID();
        verification.issue(travelerId, UNVERIFIED);

        guessWrong(travelerId, mailer.lastCode());

        assertThat(storedAttemptsFor(travelerId))
                .as("the increment commits in its own transaction; rolling back with the rejection "
                        + "would leave the cap unreachable and the code enumerable")
                .isEqualTo(1);
    }

    @Test
    void theAttemptCapKillsTheCodeEvenForTheRightAnswer() {
        UUID travelerId = UUID.randomUUID();
        verification.issue(travelerId, UNVERIFIED);
        String correct = mailer.lastCode();

        for (int attempt = 0; attempt < VerificationService.ATTEMPT_CAP; attempt++) {
            guessWrong(travelerId, correct);
        }

        assertThatExceptionOfType(VerificationExceptions.AttemptsExhaustedException.class)
                .isThrownBy(() -> verification.confirm(travelerId, "uid", correct));
    }

    @Test
    void anExpiredCodeIsRefused() {
        UUID travelerId = UUID.randomUUID();
        verification.issue(travelerId, UNVERIFIED);
        String correct = mailer.lastCode();

        clock.advance(VerificationService.CODE_TTL.plusSeconds(1));

        assertThatExceptionOfType(VerificationExceptions.CodeExpiredException.class)
                .isThrownBy(() -> verification.confirm(travelerId, "uid", correct));
    }

    @Test
    void aCodeOneSecondInsideItsLifetimeStillWorks() {
        UUID travelerId = UUID.randomUUID();
        verification.issue(travelerId, UNVERIFIED);
        String correct = mailer.lastCode();

        clock.advance(VerificationService.CODE_TTL.minusSeconds(1));

        assertThatCode(() -> verification.confirm(travelerId, "uid", correct)).doesNotThrowAnyException();
    }

    @Test
    void aResendInsideTheCooldownIsRefused() {
        UUID travelerId = UUID.randomUUID();
        verification.issue(travelerId, UNVERIFIED);

        clock.advance(VerificationService.RESEND_COOLDOWN.minusSeconds(1));

        assertThatExceptionOfType(VerificationExceptions.ResendCooldownException.class)
                .isThrownBy(() -> verification.issue(travelerId, UNVERIFIED));
    }

    @Test
    void aResendPastTheCooldownIssuesAFreshCodeAndKillsTheOldOne() {
        UUID travelerId = UUID.randomUUID();
        verification.issue(travelerId, UNVERIFIED);
        String superseded = mailer.lastCode();

        clock.advance(VerificationService.RESEND_COOLDOWN);
        verification.issue(travelerId, UNVERIFIED);

        assertThat(storedRowsFor(travelerId)).as("one active code per traveler, structurally").isEqualTo(1);
        assertThatExceptionOfType(VerificationExceptions.CodeIncorrectException.class)
                .isThrownBy(() -> verification.confirm(travelerId, "uid", superseded));
        assertThatCode(() -> verification.confirm(travelerId, "uid", mailer.lastCode()))
                .doesNotThrowAnyException();
    }

    @Test
    void aResendResetsTheAttemptCountSoAFreshCodeIsGenuinelyFresh() {
        UUID travelerId = UUID.randomUUID();
        verification.issue(travelerId, UNVERIFIED);
        guessWrong(travelerId, mailer.lastCode());

        clock.advance(VerificationService.RESEND_COOLDOWN);
        verification.issue(travelerId, UNVERIFIED);

        assertThat(storedAttemptsFor(travelerId)).isZero();
    }

    @Test
    void anAlreadyVerifiedTravelerIsRefusedACode() {
        assertThatExceptionOfType(VerificationExceptions.AlreadyVerifiedException.class)
                .isThrownBy(() ->
                        verification.issue(UUID.randomUUID(), new VerifiedContact("t1@example.com", true)));
    }

    @Test
    void confirmingWithNoCodeOutstandingIsRefused() {
        assertThatExceptionOfType(VerificationExceptions.CodeNotIssuedException.class)
                .isThrownBy(() -> verification.confirm(UUID.randomUUID(), "uid", "123456"));
    }

    private void guessWrong(UUID travelerId, String correct) {
        try {
            verification.confirm(travelerId, "uid", wrongCodeOtherThan(correct));
        } catch (VerificationExceptions.CodeIncorrectException expected) {
            return;
        }
        throw new AssertionError("a wrong code was accepted");
    }

    private static String wrongCodeOtherThan(String correct) {
        return correct.equals("000000") ? "111111" : "000000";
    }

    private int storedRowsFor(UUID travelerId) {
        return jdbc.queryForObject(
                "SELECT count(*) FROM verification_code WHERE traveler_id = ?", Integer.class, travelerId);
    }

    private String storedHashFor(UUID travelerId) {
        return jdbc.queryForObject(
                "SELECT code_hash FROM verification_code WHERE traveler_id = ?", String.class, travelerId);
    }

    private int storedAttemptsFor(UUID travelerId) {
        return jdbc.queryForObject(
                "SELECT attempts FROM verification_code WHERE traveler_id = ?", Integer.class, travelerId);
    }


    static final class RecordingVerificationMailer implements VerificationMailer {

        private final List<VerificationMail> sent = new ArrayList<>();

        @Override
        public void send(VerificationMail mail) {
            sent.add(mail);
        }

        String lastCode() {
            return sent.getLast().code();
        }
    }


    @TestConfiguration
    static class Doubles {

        @Bean
        @Primary
        MutableClock verificationTestClock() {
            return new MutableClock(Instant.parse("2026-07-30T10:00:00Z"));
        }

        @Bean
        @Primary
        RecordingVerificationMailer recordingVerificationMailer() {
            return new RecordingVerificationMailer();
        }
    }
}
