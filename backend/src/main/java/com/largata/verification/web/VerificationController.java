package com.largata.verification.web;

import com.largata.identity.Traveler;
import com.largata.identity.web.AuthEmail;
import com.largata.identity.web.CurrentTraveler;
import com.largata.identity.web.VerifiedContact;
import com.largata.verification.VerificationService;
import com.largata.verification.api.ConfirmCodeRequest;
import com.largata.verification.api.VerificationCodeResponse;
import com.largata.verification.api.VerificationResultResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;


@RestController
@RequestMapping("/v1/verification-codes")
class VerificationController {

    private final VerificationService verification;

    VerificationController(VerificationService verification) {
        this.verification = verification;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    VerificationCodeResponse issue(@CurrentTraveler Traveler traveler, @AuthEmail VerifiedContact contact) {
        return VerificationCodeResponse.of(verification.issue(traveler.id(), contact));
    }

    @PostMapping("/confirm")
    VerificationResultResponse confirm(
            @CurrentTraveler Traveler traveler, @Valid @RequestBody ConfirmCodeRequest request) {
        verification.confirm(traveler.id(), traveler.firebaseUid(), request.code().strip());
        return VerificationResultResponse.confirmed();
    }
}
