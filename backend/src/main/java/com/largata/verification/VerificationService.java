package com.largata.verification;

import com.largata.common.analytics.Analytics;
import com.largata.common.analytics.AnalyticsEvent;
import com.largata.common.tx.AfterCommit;
import com.largata.identity.web.VerifiedContact;
import com.largata.verification.VerificationExceptions.AlreadyVerifiedException;
import com.largata.verification.VerificationExceptions.AttemptsExhaustedException;
import com.largata.verification.VerificationExceptions.CodeExpiredException;
import com.largata.verification.VerificationExceptions.CodeIncorrectException;
import com.largata.verification.VerificationExceptions.CodeNotIssuedException;
import com.largata.verification.VerificationExceptions.NoAddressOnTokenException;
import com.largata.verification.VerificationExceptions.ResendCooldownException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


@Service
public class VerificationService {

    static final Duration CODE_TTL = Duration.ofMinutes(10);
    static final Duration RESEND_COOLDOWN = Duration.ofSeconds(60);
    static final int ATTEMPT_CAP = 5;

    private static final Logger log = LoggerFactory.getLogger(VerificationService.class);

    private final VerificationCodeRepository codes;
    private final VerificationCodes mint;
    private final VerificationAttempts attempts;
    private final VerificationMailer mailer;
    private final EmailVerificationFlag flag;
    private final Analytics analytics;
    private final Clock clock;

    VerificationService(
            VerificationCodeRepository codes,
            VerificationCodes mint,
            VerificationAttempts attempts,
            VerificationMailer mailer,
            EmailVerificationFlag flag,
            Analytics analytics,
            Clock clock) {
        this.codes = codes;
        this.mint = mint;
        this.attempts = attempts;
        this.mailer = mailer;
        this.flag = flag;
        this.analytics = analytics;
        this.clock = clock;
    }


    @Transactional
    public IssuedCode issue(UUID travelerId, VerifiedContact contact) {
        if (contact.verified()) {
            throw new AlreadyVerifiedException();
        }
        if (contact.email() == null || contact.email().isBlank()) {
            throw new NoAddressOnTokenException();
        }

        Instant now = Instant.now(clock);
        VerificationCode existing = codes.findById(travelerId).orElse(null);
        if (existing != null && now.isBefore(existing.issuedAt().plus(RESEND_COOLDOWN))) {
            throw new ResendCooldownException();
        }

        String code = mint.mint();
        Instant expiresAt = now.plus(CODE_TTL);
        if (existing == null) {
            codes.saveAndFlush(VerificationCode.issue(travelerId, mint.hash(code), now, expiresAt));
        } else {
            existing.reissue(mint.hash(code), now, expiresAt);
            codes.saveAndFlush(existing);
        }
        log.info("Verification code issued: travelerId={}", travelerId);

        VerificationMail mail = new VerificationMail(travelerId, contact.email(), code);
        AfterCommit.run(
                () -> {
                    dispatch(mail);
                    analytics.emit(
                            AnalyticsEvent.named("verification_code_sent").with("travelerId", travelerId).build());
                });
        return new IssuedCode(expiresAt, now.plus(RESEND_COOLDOWN));
    }


    public void confirm(UUID travelerId, String firebaseUid, String submitted) {
        VerificationCode code = liveCodeFor(travelerId);

        if (!VerificationCodes.isWellFormed(submitted) || !mint.matches(submitted, code.codeHash())) {
            attempts.recordFailure(travelerId);
            throw new CodeIncorrectException();
        }

        flag.markVerified(firebaseUid);
        codes.deleteById(travelerId);
        log.info("Email verification confirmed: travelerId={}", travelerId);
        analytics.emit(AnalyticsEvent.named("verification_confirmed").with("travelerId", travelerId).build());
    }


    private VerificationCode liveCodeFor(UUID travelerId) {
        VerificationCode code = codes.findById(travelerId).orElseThrow(CodeNotIssuedException::new);
        if (code.isExpired(Instant.now(clock))) {
            throw new CodeExpiredException();
        }
        if (code.attempts() >= ATTEMPT_CAP) {
            throw new AttemptsExhaustedException();
        }
        return code;
    }

    private void dispatch(VerificationMail mail) {
        try {
            mailer.send(mail);
        } catch (RuntimeException sendFailedButTheCodeIsStillLive) {
            log.warn(
                    "Verification code email failed to send: travelerId={}",
                    mail.travelerId(),
                    sendFailedButTheCodeIsStillLive);
        }
    }
}
