package com.largata.verification.service;

import com.largata.verification.entity.VerificationCode;
import com.largata.verification.repository.VerificationCodeRepository;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Component
class VerificationAttempts {

    private final VerificationCodeRepository codes;

    VerificationAttempts(VerificationCodeRepository codes) {
        this.codes = codes;
    }


    @Transactional(propagation = Propagation.REQUIRES_NEW)
    void recordFailure(UUID travelerId) {
        codes.findById(travelerId).ifPresent(VerificationCode::recordFailedAttempt);
    }
}
